import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createMeterReadingSchema, paginationSchema, dateRangeSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiPaginated
} from '@/lib/api-response';
import { getSession, canCreateReadings } from '@/lib/auth';
import { detectAnomaly, calculateWaterBillWithRates, getBillBreakdown } from '@/lib/water-bill';

// GET /api/meter-readings - List meter readings
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin/Staff only)
    if (!canCreateReadings(session.user)) {
      return apiForbidden();
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = paginationSchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'readingDate',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!queryResult.success) {
      return apiValidationError(queryResult.error);
    }

    const { page, limit, sortBy, sortOrder, search } = queryResult.data;

    // Parse date range
    const dateResult = dateRangeSchema.safeParse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    // Build where clause
    const where: any = {};

    // Filter by house
    const houseId = searchParams.get('houseId');
    if (houseId) {
      where.houseId = houseId;
    }

    // Filter by anomaly
    const isAnomaly = searchParams.get('isAnomaly');
    if (isAnomaly === 'true') {
      where.isAnomaly = true;
    }

    // Filter by date range
    if (dateResult.success) {
      const { startDate, endDate } = dateResult.data;
      if (startDate || endDate) {
        where.readingDate = {};
        if (startDate) where.readingDate.gte = startDate;
        if (endDate) where.readingDate.lte = endDate;
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { house: { houseNumber: { contains: search, mode: 'insensitive' } } },
        { house: { ownerName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get total count
    const total = await db.meterReading.count({ where });

    // Get readings
    const readings = await db.meterReading.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
      include: {
        house: {
          select: {
            id: true,
            houseNumber: true,
            ownerName: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Format response
    const formattedReadings = readings.map((reading) => ({
      id: reading.id,
      houseId: reading.houseId,
      house: {
        id: reading.house.id,
        houseNumber: reading.house.houseNumber,
        ownerName: reading.house.ownerName,
      },
      readingValue: Number(reading.readingValue),
      usage: Number(reading.usage),
      readingDate: reading.readingDate,
      isAnomaly: reading.isAnomaly,
      notes: reading.notes,
      imageUrl: (reading as any).imageUrl,
      recordedBy: reading.recordedBy,
      createdAt: reading.createdAt,
    }));

    return apiPaginated(formattedReadings, page, limit, total);
  } catch (error) {
    console.error('List meter readings error:', error);
    return apiError('Failed to fetch meter readings');
  }
}

// POST /api/meter-readings - Create new meter reading
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin/Staff only)
    if (!canCreateReadings(session.user)) {
      return apiForbidden('Only administrators and staff can create meter readings');
    }

    // Parse and validate request body
    const body = await request.json();
    const result = createMeterReadingSchema.safeParse(body);

    if (!result.success) {
      console.error('Validation error:', result.error);
      return apiValidationError(result.error);
    }

    const { houseId, readingValue, readingDate, notes, imageUrl } = result.data;

    // Check if house exists
    const house = await db.house.findUnique({
      where: { id: houseId },
    });

    if (!house) {
      return apiError('House not found');
    }

    // Get previous reading for this house
    const previousReading = await db.meterReading.findFirst({
      where: { houseId },
      orderBy: { readingDate: 'desc' },
    });

    // Calculate usage
    const previousValue = previousReading ? Number(previousReading.readingValue) : Number(house.initialReading || 0);
    const usage = readingValue - previousValue;

    // Calculate average usage for anomaly detection (last 3 readings)
    const recentReadings = await db.meterReading.findMany({
      where: { houseId },
      orderBy: { readingDate: 'desc' },
      take: 3,
    });

    const avgUsage = recentReadings.length > 0
      ? recentReadings.reduce((sum, r) => sum + Number(r.usage), 0) / recentReadings.length
      : usage;

    // Detect anomaly
    const isAnomaly = detectAnomaly(usage, avgUsage);

    // Create meter reading
    // Note: We omit imageUrl here because the Prisma Client might not be updated yet
    const meterReading = await db.meterReading.create({
      data: {
        houseId,
        readingValue,
        usage,
        readingDate: readingDate || new Date(),
        isAnomaly,
        notes: notes || null,
        recordedById: session.user.id,
      },
      include: {
        house: {
          select: {
            id: true,
            houseNumber: true,
            ownerName: true,
          },
        },
      },
    }) as any;

    // Temporary workaround: Update imageUrl using raw SQL if the field exists in DB but not in Prisma Client
    if (imageUrl) {
      try {
        await db.$executeRawUnsafe(
          `UPDATE "MeterReading" SET "imageUrl" = $1 WHERE id = $2`,
          imageUrl,
          meterReading.id
        );
        meterReading.imageUrl = imageUrl;
      } catch (e) {
        console.error('Failed to update imageUrl via raw SQL:', e);
      }
    }

    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'MeterReading',
        entityId: meterReading.id,
        details: JSON.stringify({
          houseId,
          readingValue,
          usage,
          isAnomaly,
        }),
      },
    });

    // === Calculate bill preview ===
    // Fetch active water rates from DB
    const activeRates = await db.waterRate.findMany({
      where: { isActive: true },
      orderBy: { minUnits: 'asc' },
    });

    const ratesForCalc = activeRates.map(r => ({
      minUnits: Number(r.minUnits),
      maxUnits: Number(r.maxUnits),
      ratePerUnit: Number(r.ratePerUnit),
    }));

    // Calculate usage fee
    const usageFee = calculateWaterBillWithRates(usage, ratesForCalc);
    const breakdown = getBillBreakdown(usage, ratesForCalc);

    // Calculate carry-over from unpaid bills
    const unpaidBills = await db.bill.findMany({
      where: {
        houseId,
        isPaid: false,
      },
      include: {
        payments: {
          select: { amount: true },
        },
      },
    });

    const carryOverAmount = unpaidBills.reduce((sum, bill) => {
      const alreadyPaid = bill.payments.reduce((s, p) => s + Number(p.amount), 0);
      return sum + Math.max(Number(bill.totalAmount) - alreadyPaid, 0);
    }, 0);

    const totalAmount = usageFee + carryOverAmount;

    return apiSuccess({
      id: meterReading.id,
      houseId: meterReading.houseId,
      house: meterReading.house,
      readingValue: Number(meterReading.readingValue),
      usage: Number(meterReading.usage),
      readingDate: meterReading.readingDate,
      isAnomaly: meterReading.isAnomaly,
      notes: meterReading.notes,
      imageUrl: meterReading.imageUrl,
      previousReading: previousValue,
      // Bill preview data
      billPreview: {
        previousReading: previousValue,
        currentReading: readingValue,
        usage,
        usageFee,
        carryOverAmount,
        totalAmount,
        breakdown,
        unpaidBillsCount: unpaidBills.length,
      },
    }, 201);
  } catch (error) {
    console.error('Create meter reading error details:', error);
    return apiError('Failed to create meter reading');
  }
}
