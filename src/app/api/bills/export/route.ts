import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { dateRangeSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden
} from '@/lib/api-response';
import { getSession, isAdmin } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/water-bill';

// GET /api/bills/export - Export bills to CSV (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin only)
    if (!isAdmin(session.user)) {
      return apiForbidden('Only administrators can export bills');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const dateResult = dateRangeSchema.safeParse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    // Build where clause
    const where: {
      dueDate?: { gte?: Date; lte?: Date };
      isPaid?: boolean;
    } = {};

    // Filter by date range
    if (dateResult.success) {
      const { startDate, endDate } = dateResult.data;
      if (startDate || endDate) {
        where.dueDate = {};
        if (startDate) where.dueDate.gte = startDate;
        if (endDate) where.dueDate.lte = endDate;
      }
    }

    // Filter by paid status
    const isPaid = searchParams.get('isPaid');
    if (isPaid === 'true') {
      where.isPaid = true;
    } else if (isPaid === 'false') {
      where.isPaid = false;
    }

    // Get bills
    const bills = await db.bill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        house: {
          select: {
            houseNumber: true,
            ownerName: true,
          },
        },
        payments: {
          select: {
            amount: true,
            paymentDate: true,
            paymentMethod: true,
          },
        },
      },
    });

    // Generate CSV
    const headers = [
      'Bill Number',
      'House Number',
      'Owner Name',
      'Period Start',
      'Period End',
      'Previous Reading',
      'Current Reading',
      'Usage (m³)',
      'Base Fee',
      'Usage Fee',
      'Total Amount',
      'Due Date',
      'Status',
      'Paid Amount',
      'Payment Date',
      'Payment Method',
      'Created At',
    ].join(',');

    const rows = bills.map((bill) => {
      const totalPaid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const lastPayment = bill.payments[bill.payments.length - 1];

      return [
        bill.billNumber,
        `"${bill.house.houseNumber}"`,
        `"${bill.house.ownerName}"`,
        formatDate(bill.periodStart),
        formatDate(bill.periodEnd),
        Number(bill.previousReading),
        Number(bill.currentReading),
        Number(bill.usage),
        Number(bill.baseFee),
        Number(bill.usageFee),
        Number(bill.totalAmount),
        formatDate(bill.dueDate),
        bill.isPaid ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid',
        totalPaid,
        lastPayment ? formatDate(lastPayment.paymentDate) : '',
        lastPayment?.paymentMethod || '',
        formatDate(bill.createdAt),
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');

    // Return CSV with appropriate headers
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bills-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export bills error:', error);
    return apiError('Failed to export bills');
  }
}
