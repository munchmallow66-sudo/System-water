import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound
} from '@/lib/api-response';
import { getSession, isStaffOrAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/payments/[id] - Get payment details
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Get payment with full details
    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            periodStart: true,
            periodEnd: true,
            previousReading: true,
            currentReading: true,
            usage: true,
            baseFee: true,
            usageFee: true,
            totalAmount: true,
            dueDate: true,
            isPaid: true,
            paidAt: true,
          },
        },
        house: {
          select: {
            id: true,
            houseNumber: true,
            ownerName: true,
            imageUrl: true,
          },
        },
        collector: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      return apiNotFound('Payment not found');
    }

    // Get all payments for this bill to calculate total paid
    const allPaymentsForBill = await db.payment.findMany({
      where: { billId: payment.billId },
      select: { amount: true },
    });

    const totalPaid = allPaymentsForBill.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAmount = Number(payment.bill.totalAmount) - totalPaid;

    // Format response
    const response = {
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      slipUrl: payment.slipUrl,
      notes: payment.notes,
      createdAt: payment.createdAt,
      bill: {
        ...payment.bill,
        totalPaid,
        remainingAmount,
      },
      house: payment.house,
      collector: payment.collector,
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Get payment error:', error);
    return apiError('Failed to fetch payment');
  }
}
