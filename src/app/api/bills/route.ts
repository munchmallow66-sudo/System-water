import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createBillSchema, paginationSchema, dateRangeSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiPaginated
} from '@/lib/api-response';
import { getSession, isAdmin, isStaffOrAdmin } from '@/lib/auth';
import { calculateWaterBill, calculateWaterBillWithRates, generateBillNumber } from '@/lib/water-bill';

// GET /api/bills - List bills
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin/Staff only)
    if (!isStaffOrAdmin(session.user)) {
      return apiForbidden();
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = paginationSchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!queryResult.success) {
      return apiValidationError(queryResult.error);
    }

    const { page, limit, sortBy, sortOrder } = queryResult.data;

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

    // Filter by paid status
    const isPaid = searchParams.get('isPaid');
    if (isPaid === 'true') {
      where.isPaid = true;
    } else if (isPaid === 'false') {
      where.isPaid = false;
    }

    // Filter by date range
    if (dateResult.success) {
      const { startDate, endDate } = dateResult.data;
      if (startDate || endDate) {
        where.dueDate = {};
        if (startDate) where.dueDate.gte = startDate;
        if (endDate) where.dueDate.lte = endDate;
      }
    }

    // Search filter
    const search = searchParams.get('search');
    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { house: { houseNumber: { contains: search, mode: 'insensitive' } } },
        { house: { ownerName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get total count
    const total = await db.bill.count({ where });

    // Get aggregates (Total amount, total paid, etc. for the current filter)
    const stats = await db.bill.aggregate({
      where,
      _sum: {
        totalAmount: true,
      }
    });

    const paidStats = await db.bill.aggregate({
      where: { ...where, isPaid: true },
      _sum: {
        totalAmount: true,
      }
    });

    const unpaidStats = await db.bill.aggregate({
      where: { ...where, isPaid: false },
      _sum: {
        totalAmount: true,
      }
    });

    // Get bills
    const bills = await db.bill.findMany({
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
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            receiptNumber: true,
          },
        },
        meterReading: {
          select: {
            imageUrl: true,
          },
        },
      },
    });

    // Format response
    const formattedBills = bills.map((bill) => {
      const totalPaid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const carryOverAmount = Math.max(Number(bill.totalAmount) - Number(bill.usageFee) - Number(bill.baseFee), 0)

      return {
        id: bill.id,
        billNumber: bill.billNumber,
        houseId: bill.houseId,
        houseNumber: bill.house.houseNumber,
        ownerName: bill.house.ownerName,
        periodStart: bill.periodStart,
        periodEnd: bill.periodEnd,
        previousReading: Number(bill.previousReading),
        currentReading: Number(bill.currentReading),
        usage: Number(bill.usage),
        baseFee: Number(bill.baseFee),
        usageFee: Number(bill.usageFee),
        carryOverAmount,
        totalAmount: Number(bill.totalAmount),
        dueDate: bill.dueDate,
        isPaid: bill.isPaid,
        paidAt: bill.paidAt,
        totalPaid,
        outstandingAmount: Number(bill.totalAmount) - totalPaid,
        paymentsCount: bill.payments.length,
        createdAt: bill.createdAt,
        imageUrl: bill.meterReading?.imageUrl,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedBills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: Number(stats._sum.totalAmount || 0),
        totalPaid: Number(paidStats._sum.totalAmount || 0),
        totalUnpaid: Number(unpaidStats._sum.totalAmount || 0),
      }
    });
  } catch (error) {
    console.error('List bills error:', error);
    return apiError('Failed to fetch bills');
  }
}

// POST /api/bills - Create new bill (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin only)
    if (!isAdmin(session.user)) {
      return apiForbidden('Only administrators can create bills');
    }

    // Parse and validate request body
    const body = await request.json();
    const result = createBillSchema.safeParse(body);

    if (!result.success) {
      return apiValidationError(result.error);
    }

    const { houseId, meterReadingId, periodStart, periodEnd, dueDate, baseFee = 0 } = result.data;

    // Check if house exists
    const house = await db.house.findUnique({
      where: { id: houseId },
    });

    if (!house) {
      return apiError('House not found');
    }

    // Check if meter reading exists and belongs to the house
    const meterReading = await db.meterReading.findUnique({
      where: { id: meterReadingId },
    });

    if (!meterReading) {
      return apiError('Meter reading not found');
    }

    if (meterReading.houseId !== houseId) {
      return apiError('Meter reading does not belong to this house');
    }

    // Check if meter reading already has a bill
    const existingBill = await db.bill.findUnique({
      where: { meterReadingId },
    });

    if (existingBill) {
      return apiError('Meter reading already has an associated bill');
    }

    // Get previous reading
    const previousReading = await db.meterReading.findFirst({
      where: {
        houseId,
        readingDate: { lt: meterReading.readingDate },
      },
      orderBy: { readingDate: 'desc' },
    });

    const previousReadingValue = previousReading ? Number(previousReading.readingValue) : Number(house.initialReading || 0);
    const currentReadingValue = Number(meterReading.readingValue);
    const usage = currentReadingValue - previousReadingValue;

    // Generate bill number
    const billNumber = `BILL-${Date.now().toString().slice(-8)}`;

    // Fetch active water rates
    const activeRates = await db.waterRate.findMany({
      where: { isActive: true },
      orderBy: { minUnits: 'asc' },
    });

    const ratesForCalc = activeRates.map(r => ({
      minUnits: Number(r.minUnits),
      maxUnits: Number(r.maxUnits),
      ratePerUnit: Number(r.ratePerUnit),
    }));

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
    })

    const carryOverAmount = unpaidBills.reduce((sum, unpaidBill) => {
      const alreadyPaid = unpaidBill.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0)
      const remaining = Number(unpaidBill.totalAmount) - alreadyPaid
      return sum + Math.max(remaining, 0)
    }, 0)

    // Calculate usage and amount
    const usageFee = calculateWaterBillWithRates(usage, ratesForCalc);
    const totalAmount = usageFee + baseFee + carryOverAmount;

    // Create bill
    const bill = await db.bill.create({
      data: {
        houseId,
        meterReadingId,
        billNumber,
        periodStart,
        periodEnd,
        previousReading: previousReadingValue,
        currentReading: currentReadingValue,
        usage,
        baseFee,
        usageFee,
        totalAmount,
        dueDate,
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
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'Bill',
        entityId: bill.id,
        details: JSON.stringify({
          billNumber,
          houseId,
          carryOverAmount,
          totalAmount,
        }),
      },
    });

    return apiSuccess(bill, 201);
  } catch (error) {
    console.error('Create bill error:', error);
    return apiError('Failed to create bill');
  }
}
