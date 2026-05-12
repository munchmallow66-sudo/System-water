import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createHouseSchema, paginationSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiPaginated
} from '@/lib/api-response';
import { getSession, isStaffOrAdmin, isAdmin } from '@/lib/auth';

// GET /api/houses - List all houses
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
      limit: searchParams.get('limit') || '1500',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'houseNumber',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    });

    if (!queryResult.success) {
      return apiValidationError(queryResult.error);
    }

    const { page, limit, search, sortBy, sortOrder } = queryResult.data;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { houseNumber: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by active status if specified
    const activeOnly = searchParams.get('activeOnly');
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    // Get total count
    const total = await db.house.count({ where });

    // Get houses
    const houses = await db.house.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
      include: {
        bills: {
          where: { isPaid: false },
          select: { totalAmount: true }
        },
        _count: {
          select: {
            meterReadings: true,
          },
        },
        meterReadings: {
          orderBy: { readingDate: 'desc' },
          take: 1,
        },
      },
    });

    // Format response
    const formattedHouses = houses.map((house) => {
      const outstandingBalance = house.bills.reduce((sum, b) => sum + Number(b.totalAmount), 0);

      return {
        id: house.id,
        houseNumber: house.houseNumber,
        ownerName: house.ownerName,
        imageUrl: house.imageUrl,
        initialReading: Number(house.initialReading),
        isActive: house.isActive,
        unpaidBills: house.bills.length,
        totalReadings: house._count.meterReadings,
        outstandingBalance,
        latestReading: house.meterReadings[0] ? {
          id: house.meterReadings[0].id,
          readingValue: Number(house.meterReadings[0].readingValue),
          usage: Number(house.meterReadings[0].usage),
          readingDate: house.meterReadings[0].readingDate,
        } : null,
        createdAt: house.createdAt,
        updatedAt: house.updatedAt,
      };
    });

    return apiPaginated(formattedHouses, page, limit, total);
  } catch (error) {
    console.error('List houses error:', error);
    return apiError('Failed to fetch houses');
  }
}

// POST /api/houses - Create new house
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin only)
    if (!isAdmin(session.user)) {
      return apiForbidden('Only administrators can create houses');
    }

    // Parse and validate request body
    const body = await request.json();
    const result = createHouseSchema.safeParse(body);

    if (!result.success) {
      return apiValidationError(result.error);
    }

    const { houseNumber, ownerName, imageUrl, initialReading } = result.data;

    // Check if house number already exists
    const existingHouse = await db.house.findUnique({
      where: { houseNumber },
    });

    if (existingHouse) {
      return apiError('House number already exists');
    }

    // Create house
    const house = await db.house.create({
      data: {
        houseNumber,
        ownerName,
        imageUrl: imageUrl || null,
        initialReading: initialReading || 0,
      },
    });



    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'House',
        entityId: house.id,
        details: JSON.stringify({ houseNumber, ownerName }),
      },
    });

    return apiSuccess(house, 201);
  } catch (error) {
    console.error('Create house error detail:', error);
    return apiError('Failed to create house', 400, error instanceof Error ? error.message : String(error));
  }
}
