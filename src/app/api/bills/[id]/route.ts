import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { updateBillSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound
} from '@/lib/api-response';
import { getSession, isStaffOrAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/bills/[id] - Get bill details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    if (!isStaffOrAdmin(session.user)) {
      return apiForbidden();
    }

    const { id } = await params;

    const bill = await db.bill.findUnique({
      where: { id },
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
      },
    });

    if (!bill) {
      return apiNotFound('Bill not found');
    }

    const totalPaid = bill.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    return apiSuccess({
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
      totalAmount: Number(bill.totalAmount),
      dueDate: bill.dueDate,
      isPaid: bill.isPaid,
      paidAt: bill.paidAt,
      totalPaid,
      outstandingAmount: Number(bill.totalAmount) - totalPaid,
      paymentsCount: bill.payments.length,
      createdAt: bill.createdAt,
    });
  } catch (error) {
    console.error('Get bill error:', error);
    return apiError('Failed to fetch bill');
  }
}

// PUT /api/bills/[id] - Update bill
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Check if bill exists
    const existingBill = await db.bill.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!existingBill) {
      return apiNotFound('Bill not found');
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateBillSchema.safeParse(body);

    if (!result.success) {
      return apiValidationError(result.error);
    }

    const { dueDate, baseFee, isPaid } = result.data;

    // Build update data
    const updateData: {
      dueDate?: Date;
      baseFee?: number;
      usageFee?: number;
      totalAmount?: number;
      isPaid?: boolean;
      paidAt?: Date | null;
    } = {};

    // If base fee is changed, recalculate total
    if (baseFee !== undefined && baseFee !== Number(existingBill.baseFee)) {
      updateData.baseFee = baseFee;
      updateData.totalAmount = Number(existingBill.usageFee) + baseFee;
    }

    if (dueDate) updateData.dueDate = dueDate;

    // Handle payment status
    if (isPaid !== undefined && isPaid !== existingBill.isPaid) {
      updateData.isPaid = isPaid;
      updateData.paidAt = isPaid ? new Date() : null;
    }

    // Update bill
    const bill = await db.bill.update({
      where: { id },
      data: updateData,
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
      },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'Bill',
        entityId: bill.id,
        details: JSON.stringify({ dueDate, baseFee, isPaid }),
      },
    });

    const totalPaid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return apiSuccess({
      ...bill,
      totalPaid,
      outstandingAmount: Number(bill.totalAmount) - totalPaid,
    });
  } catch (error) {
    console.error('Update bill error:', error);
    return apiError('Failed to update bill');
  }
}

// DELETE /api/bills/[id] - Delete bill and its payments
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    if (!isStaffOrAdmin(session.user)) {
      return apiForbidden();
    }

    const { id } = await params;

    const existingBill = await db.bill.findUnique({
      where: { id },
      include: {
        payments: {
          select: { id: true },
        },
      },
    });

    if (!existingBill) {
      return apiNotFound('Bill not found');
    }

    await db.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: { billId: id },
      });

      await tx.bill.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          entity: 'Bill',
          entityId: id,
          details: JSON.stringify({
            billNumber: existingBill.billNumber,
            deletedPayments: existingBill.payments.length,
          }),
        },
      });
    });

    return apiSuccess({ id, deleted: true });
  } catch (error) {
    console.error('Delete bill error:', error);
    return apiError('Failed to delete bill');
  }
}
