import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createPaymentSchema, paginationSchema, dateRangeSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiPaginated
} from '@/lib/api-response';
import { getSession, canCreatePayments } from '@/lib/auth';
import { generateReceiptNumber } from '@/lib/water-bill';

// GET /api/payments - List payments
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin/Staff only)
    if (!canCreatePayments(session.user)) {
      return apiForbidden();
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = paginationSchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'paymentDate',
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

    // Filter by bill
    const billId = searchParams.get('billId');
    if (billId) {
      where.billId = billId;
    }

    // Filter by date range
    if (dateResult.success) {
      const { startDate, endDate } = dateResult.data;
      if (startDate || endDate) {
        where.paymentDate = {};
        if (startDate) where.paymentDate.gte = startDate;
        if (endDate) where.paymentDate.lte = endDate;
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { house: { houseNumber: { contains: search, mode: 'insensitive' } } },
        { house: { ownerName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get total count
    const total = await db.payment.count({ where });

    // Get summary stats (total paid for the filtered set)
    const stats = await db.payment.aggregate({
      where,
      _sum: {
        amount: true,
      }
    });

    // Get today's summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStats = await db.payment.aggregate({
      where: {
        paymentDate: { gte: today },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Get payments
    const payments = await db.payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            previousReading: true,
            currentReading: true,
            usage: true,
          },
        },
        house: {
          select: {
            id: true,
            houseNumber: true,
            ownerName: true,
          },
        },
        collector: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Format response
    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      billId: payment.billId,
      billNumber: payment.bill.billNumber,
      billTotal: Number(payment.bill.totalAmount),
      previousReading: Number(payment.bill.previousReading),
      currentReading: Number(payment.bill.currentReading),
      usage: Number(payment.bill.usage),
      houseId: payment.houseId,
      houseNumber: payment.house.houseNumber,
      ownerName: payment.house.ownerName,
      amount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      receiptNumber: payment.receiptNumber,
      slipUrl: payment.slipUrl,
      notes: payment.notes,
      collector: payment.collector,
      createdAt: payment.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: Number(stats._sum.amount || 0),
        todayAmount: Number(todayStats._sum.amount || 0),
        todayCount: todayStats._count,
      }
    });
  } catch (error) {
    console.error('List payments error:', error);
    return apiError('Failed to fetch payments');
  }
}

// POST /api/payments - Create new payment
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin/Staff only)
    if (!canCreatePayments(session.user)) {
      return apiForbidden('Only administrators and staff can create payments');
    }

    // Parse and validate request body
    const body = await request.json();
    const result = createPaymentSchema.safeParse(body);

    if (!result.success) {
      return apiValidationError(result.error);
    }

    const { billId, amount, paymentMethod, slipUrl, notes } = result.data;

    // Check if bill exists
    const bill = await db.bill.findUnique({
      where: { id: billId },
      include: {
        payments: true,
      },
    });

    if (!bill) {
      return apiError('Bill not found');
    }

    // Check if bill is already paid
    if (bill.isPaid) {
      return apiError('Bill is already fully paid');
    }

    // Calculate total paid so far
    const totalPaid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const billTotal = Number(bill.totalAmount);
    const remainingAmount = billTotal - totalPaid;

    // Validate amount
    if (amount > remainingAmount + 0.01) { // Allowing tiny decimal buffer
      return apiError(`Payment amount exceeds remaining balance of ${remainingAmount}`);
    }

    // Generate receipt number
    const receiptNumber = generateReceiptNumber();

    // Create payment in a transaction
    const payment = await db.$transaction(async (tx) => {
      // Create payment
      const newPayment = await tx.payment.create({
        data: {
          billId,
          houseId: bill.houseId,
          amount,
          paymentMethod,
          receiptNumber,
          slipUrl: slipUrl || null,
          notes: notes || null,
          collectorId: session.user.id,
        },
        include: {
          bill: {
            select: {
              id: true,
              billNumber: true,
              totalAmount: true,
              previousReading: true,
              currentReading: true,
              usage: true,
            },
          },
          house: {
            select: {
              id: true,
              houseNumber: true,
              ownerName: true,
            },
          },
        },
      });

      // Check if bill is now fully paid
      const newTotalPaid = totalPaid + amount;
      if (newTotalPaid >= billTotal - 0.01) {
        await tx.bill.update({
          where: { id: billId },
          data: {
            isPaid: true,
            paidAt: new Date(),
          },
        });
      }

      return newPayment;
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
        details: JSON.stringify({
          receiptNumber,
          billId,
          amount,
          paymentMethod,
        }),
      },
    });

    return apiSuccess({
      ...payment,
      billTotal: Number(payment.bill.totalAmount),
      previousReading: Number(payment.bill.previousReading),
      currentReading: Number(payment.bill.currentReading),
      usage: Number(payment.bill.usage),
      collector: {
        id: session.user.id,
        name: session.user.name,
      },
    }, 201);
  } catch (error) {
    console.error('Create payment error:', error);
    return apiError('Failed to create payment');
  }
}
