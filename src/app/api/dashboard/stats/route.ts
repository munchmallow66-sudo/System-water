import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiError, 
  apiUnauthorized, 
  apiForbidden 
} from '@/lib/api-response';
import { getSession, isStaffOrAdmin } from '@/lib/auth';

// GET /api/dashboard/stats - Dashboard statistics
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
    
    // Get current date info
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Run all queries in parallel for better performance
    const [
      totalHouses,
      activeHouses,
      totalUsers,
      activeUsers,
      currentMonthReadings,
      lastMonthReadings,
      unpaidBills,
      currentMonthPayments,
      lastMonthPayments,
      currentMonthRevenue,
      lastMonthRevenue,
      anomalyCount,
      overdueBills,
    ] = await Promise.all([
      // Total houses
      db.house.count(),
      
      // Active houses
      db.house.count({ where: { isActive: true } }),
      
      // Total users
      db.user.count(),
      
      // Active users
      db.user.count({ where: { isActive: true } }),
      
      // Current month meter readings
      db.meterReading.count({
        where: {
          readingDate: { gte: startOfMonth },
        },
      }),
      
      // Last month meter readings
      db.meterReading.count({
        where: {
          readingDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      
      // Unpaid bills count
      db.bill.count({ where: { isPaid: false } }),
      
      // Current month payments count
      db.payment.count({
        where: {
          paymentDate: { gte: startOfMonth },
        },
      }),
      
      // Last month payments count
      db.payment.count({
        where: {
          paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      
      // Current month revenue
      db.payment.aggregate({
        where: {
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      
      // Last month revenue
      db.payment.aggregate({
        where: {
          paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
      
      // Anomaly count
      db.meterReading.count({ where: { isAnomaly: true } }),
      
      // Overdue bills (unpaid and past due date)
      db.bill.count({
        where: {
          isPaid: false,
          dueDate: { lt: now },
        },
      }),
    ]);
    
    // Calculate percentage changes
    const readingsChange = lastMonthReadings > 0
      ? ((currentMonthReadings - lastMonthReadings) / lastMonthReadings) * 100
      : 0;
    
    const paymentsChange = lastMonthPayments > 0
      ? ((currentMonthPayments - lastMonthPayments) / lastMonthPayments) * 100
      : 0;
    
    const currentMonthRevenueValue = Number(currentMonthRevenue._sum.amount || 0);
    const lastMonthRevenueValue = Number(lastMonthRevenue._sum.amount || 0);
    const revenueChange = lastMonthRevenueValue > 0
      ? ((currentMonthRevenueValue - lastMonthRevenueValue) / lastMonthRevenueValue) * 100
      : 0;
    
    // Get total outstanding balance
    const outstandingBills = await db.bill.aggregate({
      where: { isPaid: false },
      _sum: { totalAmount: true },
    });
    
    // Get total collected this month by payment method
    const paymentsByMethod = await db.payment.groupBy({
      by: ['paymentMethod'],
      where: {
        paymentDate: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });
    
    const response = {
      houses: {
        total: totalHouses,
        active: activeHouses,
        inactive: totalHouses - activeHouses,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      readings: {
        currentMonth: currentMonthReadings,
        lastMonth: lastMonthReadings,
        change: Math.round(readingsChange * 100) / 100,
      },
      bills: {
        unpaid: unpaidBills,
        overdue: overdueBills,
      },
      payments: {
        currentMonth: currentMonthPayments,
        lastMonth: lastMonthPayments,
        change: Math.round(paymentsChange * 100) / 100,
      },
      revenue: {
        currentMonth: currentMonthRevenueValue,
        lastMonth: lastMonthRevenueValue,
        change: Math.round(revenueChange * 100) / 100,
        byMethod: paymentsByMethod.map((p) => ({
          method: p.paymentMethod,
          amount: Number(p._sum.amount || 0),
        })),
      },
      outstanding: {
        amount: Number(outstandingBills._sum.totalAmount || 0),
        billsCount: unpaidBills,
      },
      anomalies: {
        total: anomalyCount,
      },
    };
    
    return apiSuccess(response);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return apiError('Failed to fetch dashboard statistics');
  }
}
