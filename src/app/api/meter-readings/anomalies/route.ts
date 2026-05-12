import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { paginationSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiPaginated
} from '@/lib/api-response';
import { getSession, canCreateReadings } from '@/lib/auth';

// GET /api/meter-readings/anomalies - List anomalous readings
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
      sortBy: searchParams.get('sortBy') || 'readingDate',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!queryResult.success) {
      return apiValidationError(queryResult.error);
    }

    const { page, limit, sortBy, sortOrder } = queryResult.data;

    // Get total count of anomalies
    const total = await db.meterReading.count({
      where: { isAnomaly: true },
    });

    // Get anomalous readings
    const anomalies = await db.meterReading.findMany({
      where: { isAnomaly: true },
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

    // Calculate anomaly severity
    const formattedAnomalies = await Promise.all(
      anomalies.map(async (reading) => {
        // Get recent readings for average calculation
        const recentReadings = await db.meterReading.findMany({
          where: {
            houseId: reading.houseId,
            id: { not: reading.id },
          },
          orderBy: { readingDate: 'desc' },
          take: 3,
        });

        const avgUsage = recentReadings.length > 0
          ? recentReadings.reduce((sum, r) => sum + Number(r.usage), 0) / recentReadings.length
          : 0;

        // Determine severity
        let severity: 'high' | 'medium' | 'low' = 'low';
        const currentUsage = Number(reading.usage);
        if (currentUsage < 0) {
          severity = 'high';
        } else if (currentUsage > avgUsage * 3) {
          severity = 'high';
        } else if (currentUsage > avgUsage * 2.5) {
          severity = 'medium';
        }

        return {
          id: reading.id,
          houseId: reading.houseId,
          houseNumber: reading.house.houseNumber,
          ownerName: reading.house.ownerName,
          readingValue: reading.readingValue,
          previousValue: Number(reading.readingValue) - Number(reading.usage),
          usage: reading.usage,
          avgUsage: Math.round(avgUsage * 100) / 100,
          readingDate: reading.readingDate,
          severity,
          notes: reading.notes,
          recordedBy: reading.recordedBy,
          createdAt: reading.createdAt,
        };
      })
    );

    return apiPaginated(formattedAnomalies, page, limit, total);
  } catch (error) {
    console.error('List anomalies error:', error);
    return apiError('Failed to fetch anomalies');
  }
}
