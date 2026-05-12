import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createUserSchema, paginationSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiPaginated
} from '@/lib/api-response';
import { getSession, isAdmin, hashPassword } from '@/lib/auth';

// GET /api/users - List all users (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin only)
    if (!isAdmin(session.user)) {
      return apiForbidden();
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = paginationSchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'name',
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
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by role if specified
    const role = searchParams.get('role');
    if (role && (role === 'ADMIN' || role === 'STAFF')) {
      where.role = { in: [role] };
    }

    // Get total count
    const total = await db.user.count({ where });

    // Get users
    const users = await db.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            meterReadings: true,
            payments: true,
          },
        },
      },
    });

    // Format response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      readingsCount: user._count.meterReadings,
      paymentsCount: user._count.payments,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return apiPaginated(formattedUsers, page, limit, total);
  } catch (error) {
    console.error('List users error:', error);
    return apiError('Failed to fetch users');
  }
}

// POST /api/users - Create new user (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin only)
    if (!isAdmin(session.user)) {
      return apiForbidden('Only administrators can create users');
    }

    // Parse and validate request body
    const body = await request.json();
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      console.error('Validation error:', result.error);
      return apiValidationError(result.error);
    }

    const { email, password, name, role } = result.data;
    const isActive = body.isActive !== undefined ? body.isActive : true;

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return apiError('Email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ email, name, role, isActive }),
      },
    });

    return apiSuccess(user, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return apiError('Failed to create user');
  }
}
