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

    if (associatedBill && associatedBill.isPaid) {
      return apiError('ไม่สามารถแก้ไขมิเตอร์ได้ เนื่องจากบิลถูกชำระเงินแล้ว');
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

    // If there is an associated unpaid bill, update it
    if (associatedBill && (updateData.readingValue !== undefined || updateData.usage !== undefined)) {
      const newUsage = updateData.usage ?? Number(existingReading.usage);
      const currentReadingValue = updateData.readingValue ?? Number(existingReading.readingValue);
      
      const activeRates = await db.waterRate.findMany({
        where: { isActive: true },
        orderBy: { minUnits: 'asc' },
      });
      const ratesForCalc = activeRates.map(r => ({
        minUnits: Number(r.minUnits),
        maxUnits: Number(r.maxUnits),
        ratePerUnit: Number(r.ratePerUnit),
      }));

      const { calculateWaterBillWithRates } = await import('@/lib/water-bill');
      const usageFee = calculateWaterBillWithRates(newUsage, ratesForCalc);
      
      const oldUsageFee = Number(associatedBill.usageFee);
      const oldTotal = Number(associatedBill.totalAmount);
      const diff = usageFee - oldUsageFee;
      const newTotalAmount = oldTotal + diff;

      await db.bill.update({
        where: { id: associatedBill.id },
        data: {
          currentReading: currentReadingValue,
          usage: newUsage,
          usageFee: usageFee,
          totalAmount: Math.max(0, newTotalAmount),
        }
      });
    }

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
      if (associatedBill.isPaid) {
        return apiError('ไม่สามารถลบมิเตอร์ได้ เนื่องจากบิลถูกชำระเงินแล้ว');
      }
      // Delete the unpaid bill first
      await db.bill.delete({
        where: { id: associatedBill.id }
      });
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

