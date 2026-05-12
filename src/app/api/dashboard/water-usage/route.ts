import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden
} from '@/lib/api-response';
import { getSession, isStaffOrAdmin } from '@/lib/auth';

// GET /api/dashboard/water-usage - Water usage chart data
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
    const months = parseInt(searchParams.get('months') || '12', 10);
    const houseId = searchParams.get('houseId') || undefined;

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Build where clause
    const where: {
      readingDate: { gte: Date };
      houseId?: string;
    } = {
      readingDate: { gte: startDate },
    };

    if (houseId) {
      where.houseId = houseId;
    }

    // Get all readings in the date range
    const readings = await db.meterReading.findMany({
      where,
      orderBy: { readingDate: 'asc' },
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

    // Group by month
    const monthlyData: Record<string, {
      month: string;
      totalUsage: number;
      readingCount: number;
      anomalyCount: number;
      houses: Set<string>;
    }> = {};

    for (const reading of readings) {
      const monthKey = `${reading.readingDate.getFullYear()}-${String(reading.readingDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = new Date(reading.readingDate.getFullYear(), reading.readingDate.getMonth()).toLocaleString('th-TH', { month: 'short' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          totalUsage: 0,
          readingCount: 0,
          anomalyCount: 0,
          houses: new Set(),
        };
      }

      const usage = Number(reading.usage);
      monthlyData[monthKey].totalUsage += usage;
      monthlyData[monthKey].readingCount += 1;
      if (reading.isAnomaly) {
        monthlyData[monthKey].anomalyCount += 1;
      }
      monthlyData[monthKey].houses.add(reading.houseId);
    }

    // Convert to array and sort by date
    const chartData = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        month: data.month,
        totalUsage: Math.round(data.totalUsage * 100) / 100,
        averageUsage: data.readingCount > 0
          ? Math.round((data.totalUsage / data.readingCount) * 100) / 100
          : 0,
        readingCount: data.readingCount,
        anomalyCount: data.anomalyCount,
        housesCount: data.houses.size,
      }));

    // Calculate trend
    const usageTrend = chartData.length >= 2
      ? chartData[chartData.length - 1].totalUsage - chartData[chartData.length - 2].totalUsage
      : 0;

    // Get top 5 usage days
    const dailyUsage: Record<string, { date: string; usage: number; count: number }> = {};
    for (const reading of readings) {
      const dateKey = reading.readingDate.toISOString().split('T')[0];
      if (!dailyUsage[dateKey]) {
        dailyUsage[dateKey] = {
          date: dateKey,
          usage: 0,
          count: 0,
        };
      }
      dailyUsage[dateKey].usage += Number(reading.usage);
      dailyUsage[dateKey].count += 1;
    }

    const topUsageDays = Object.values(dailyUsage)
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5)
      .map((d) => ({
        date: d.date,
        usage: Math.round(d.usage * 100) / 100,
        count: d.count,
      }));

    const response = {
      monthlyData: chartData,
      trend: {
        direction: usageTrend > 0 ? 'up' : usageTrend < 0 ? 'down' : 'stable',
        value: Math.abs(Math.round(usageTrend * 100) / 100),
      },
      topUsageDays,
      summary: {
        totalUsage: chartData.reduce((sum, d) => sum + d.totalUsage, 0),
        totalReadings: chartData.reduce((sum, d) => sum + d.readingCount, 0),
        totalAnomalies: chartData.reduce((sum, d) => sum + d.anomalyCount, 0),
        averageMonthlyUsage: chartData.length > 0
          ? Math.round((chartData.reduce((sum, d) => sum + d.totalUsage, 0) / chartData.length) * 100) / 100
          : 0,
      },
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Water usage chart error:', error);
    return apiError('Failed to fetch water usage data');
  }
}
