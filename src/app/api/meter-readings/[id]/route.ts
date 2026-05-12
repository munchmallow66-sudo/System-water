import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { updateMeterReadingSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound
} from '@/lib/api-response';
import { getSession, canCreateReadings } from '@/lib/auth';
import { detectAnomaly } from '@/lib/water-bill';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/meter-readings/[id] - Update meter reading
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin/Staff only)
    if (!canCreateReadings(session.user)) {
      return apiForbidden('Only administrators and staff can update meter readings');
    }

    const { id } = await params;

    // Check if reading exists
    const existingReading = await db.meterReading.findUnique({
      where: { id },
      include: {
        house: true,
      },
    });

    if (!existingReading) {
      return apiNotFound('Meter reading not found');
    }

    // Check if reading has an associated bill
    const associatedBill = await db.bill.findUnique({
      where: { meterReadingId: id },
    });

    if (associatedBill) {
      return apiError('Cannot update meter reading that has an associated bill');
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateMeterReadingSchema.safeParse(body);

    if (!result.success) {
      return apiValidationError(result.error);
    }

    const { readingValue, readingDate, notes, imageUrl, isAnomaly } = result.data;

    // Build update data
    const updateData: {
      readingValue?: number;
      usage?: number;
      readingDate?: Date;
      notes?: string | null;
      imageUrl?: string | null;
      isAnomaly?: boolean;
    } = {};

    // If reading value is changed, recalculate usage
    if (readingValue !== undefined && readingValue !== Number(existingReading.readingValue)) {
      updateData.readingValue = readingValue;

      // Calculate past value since previousValue is not stored
      const pastValue = Number(existingReading.readingValue) - Number(existingReading.usage);
      updateData.usage = readingValue - pastValue;

      // Recalculate anomaly
      const recentReadings = await db.meterReading.findMany({
        where: {
          houseId: existingReading.houseId,
          id: { not: id },
        },
        orderBy: { readingDate: 'desc' },
        take: 3,
      });

      const avgUsage = recentReadings.length > 0
        ? recentReadings.reduce((sum, r) => sum + Number(r.usage), 0) / recentReadings.length
        : updateData.usage;

      updateData.isAnomaly = detectAnomaly(updateData.usage, avgUsage);
    }

    if (readingDate) updateData.readingDate = readingDate;
    if (notes !== undefined) updateData.notes = notes || null;
    if (isAnomaly !== undefined) updateData.isAnomaly = isAnomaly;

    // Update reading
    const meterReading = await db.meterReading.update({
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
      },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'MeterReading',
        entityId: meterReading.id,
        details: JSON.stringify({ readingValue, usage: updateData.usage }),
      },
    });

    return apiSuccess(meterReading);
  } catch (error) {
    console.error('Update meter reading error:', error);
    return apiError('Failed to update meter reading');
  }
}

// DELETE /api/meter-readings/[id] - Delete meter reading
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin/Staff only)
    if (!canCreateReadings(session.user)) {
      return apiForbidden('Only administrators and staff can delete meter readings');
    }

    const { id } = await params;

    // Check if reading exists
    const existingReading = await db.meterReading.findUnique({
      where: { id },
    });

    if (!existingReading) {
      return apiNotFound('Meter reading not found');
    }

    // Check if reading has an associated bill
    const associatedBill = await db.bill.findUnique({
      where: { meterReadingId: id },
    });

    if (associatedBill) {
      return apiError('Cannot delete meter reading that has an associated bill');
    }

    // Delete reading
    await db.meterReading.delete({
      where: { id },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'MeterReading',
        entityId: id,
        details: JSON.stringify({ deleted: true }),
      },
    });

    return apiSuccess({ success: true, message: 'Meter reading deleted successfully' });
  } catch (error) {
    console.error('Delete meter reading error:', error);
    return apiError('Failed to delete meter reading');
  }
}

