import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { updateHouseSchema } from '@/lib/validations';
import {
    apiSuccess,
    apiError,
    apiValidationError,
    apiUnauthorized,
    apiForbidden,
    apiNotFound
} from '@/lib/api-response';
import { getSession, isStaffOrAdmin, isAdmin } from '@/lib/auth';
import { calculateOutstandingBalance } from '@/lib/water-bill';


// GET /api/houses/[id] - Get house details
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

        const { id } = await context.params;

        // Get house with related data
        const house = await db.house.findUnique({
            where: { id },
            include: {
                meterReadings: {
                    take: 12,
                    orderBy: { readingDate: 'desc' },
                    include: {
                        recordedBy: {
                            select: { id: true, name: true },
                        },
                    },
                },
                bills: {
                    take: 12,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        payments: {
                            include: {
                                collector: {
                                    select: { id: true, name: true },
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        bills: true,
                        meterReadings: true,
                    },
                },
            },
        });

        if (!house) {
            return apiNotFound('House not found');
        }

        // Calculate outstanding balance
        const outstandingBalance = await calculateOutstandingBalance(id, db);

        // Calculate unpaid bills count separately since filtered count inside _count is problematic
        const unpaidBillsCount = await db.bill.count({
            where: {
                houseId: id,
                isPaid: false
            }
        });

        // Get latest meter reading
        const latestReading = house.meterReadings[0] || null;

        // Format response
        const response = {
            id: house.id,
            houseNumber: house.houseNumber,
            ownerName: house.ownerName,
            imageUrl: house.imageUrl,
            initialReading: Number(house.initialReading),
            isActive: house.isActive,
            createdAt: house.createdAt,
            updatedAt: house.updatedAt,
            latestReading: latestReading ? {
                id: latestReading.id,
                readingValue: Number(latestReading.readingValue),
                usage: Number(latestReading.usage),
                readingDate: latestReading.readingDate,
                isAnomaly: latestReading.isAnomaly,
                reader: latestReading.recordedBy,
            } : null,
            outstandingBalance,
            unpaidBillsCount,
            totalReadings: house._count.meterReadings,
            recentReadings: house.meterReadings.slice(0, 6).map((r) => ({
                id: r.id,
                readingValue: Number(r.readingValue),
                usage: Number(r.usage),
                readingDate: r.readingDate,
                isAnomaly: r.isAnomaly,
            })),
            recentBills: house.bills.slice(0, 6).map((b) => ({
                id: b.id,
                billNumber: b.billNumber,
                periodStart: b.periodStart,
                periodEnd: b.periodEnd,
                totalAmount: Number(b.totalAmount),
                dueDate: b.dueDate,
                isPaid: b.isPaid,
                paidAt: b.paidAt,
            })),
        };

        return apiSuccess(response);
    } catch (error) {
        console.error('Get house error:', error);
        return apiError('Failed to fetch house');
    }
}

// PUT /api/houses/[id] - Update house
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        // Check authentication
        const session = await getSession();
        if (!session) {
            return apiUnauthorized();
        }

        // Check authorization (Admin only)
        if (!isAdmin(session.user)) {
            return apiForbidden('Only administrators can update houses');
        }

        const { id } = await context.params;

        // Check if house exists
        const existingHouse = await db.house.findUnique({
            where: { id },
        });

        if (!existingHouse) {
            return apiNotFound('House not found');
        }

        // Parse and validate request body
        const body = await request.json();
        const result = updateHouseSchema.safeParse(body);

        if (!result.success) {
            return apiValidationError(result.error);
        }

        const { houseNumber, ownerName, imageUrl, initialReading, isActive } = result.data;

        // Check for duplicate house number if changing
        if (houseNumber && houseNumber !== existingHouse.houseNumber) {
            const duplicate = await db.house.findUnique({
                where: { houseNumber },
            });

            if (duplicate) {
                return apiError('House number already exists');
            }
        }

        // Update house
        const house = await db.house.update({
            where: { id },
            data: {
                ...(houseNumber && { houseNumber }),
                ...(ownerName && { ownerName }),
                imageUrl: imageUrl !== undefined ? imageUrl || null : undefined,
                initialReading: initialReading !== undefined ? initialReading : undefined,
                ...(isActive !== undefined && { isActive }),
            },
        });

        // Log audit
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: 'UPDATE',
                entity: 'House',
                entityId: house.id,
                details: JSON.stringify({ houseNumber, ownerName, isActive }),
            },
        });

        return apiSuccess(house);
    } catch (error) {
        console.error('Update house error detail:', error);
        return apiError('Failed to update house', 400, error instanceof Error ? error.message : String(error));
    }
}

// DELETE /api/houses/[id] - Delete house
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        // Check authentication
        const session = await getSession();
        if (!session) {
            return apiUnauthorized();
        }

        // Check authorization (Admin only)
        if (!isAdmin(session.user)) {
            return apiForbidden('Only administrators can delete houses');
        }

        const { id } = await context.params;

        // Check if house exists
        const existingHouse = await db.house.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { bills: true, meterReadings: true },
                },
            },
        });

        if (!existingHouse) {
            return apiNotFound('House not found');
        }

        await db.$transaction(async (tx) => {
            const houseBills = await tx.bill.findMany({
                where: { houseId: id },
                select: { id: true },
            });

            const houseBillIds = houseBills.map((bill) => bill.id);

            const houseReadings = await tx.meterReading.findMany({
                where: { houseId: id },
                select: { id: true },
            });

            const houseReadingIds = houseReadings.map((reading) => reading.id);

            if (houseBillIds.length > 0) {
                await tx.payment.deleteMany({
                    where: { billId: { in: houseBillIds } },
                });

                await tx.bill.deleteMany({
                    where: { id: { in: houseBillIds } },
                });
            }

            if (houseReadingIds.length > 0) {
                await tx.meterReading.deleteMany({
                    where: { id: { in: houseReadingIds } },
                });
            }

            await tx.house.delete({
                where: { id },
            });

            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: 'DELETE',
                    entity: 'House',
                    entityId: id,
                    details: JSON.stringify({
                        houseNumber: existingHouse.houseNumber,
                        deletedBills: houseBillIds.length,
                        deletedReadings: houseReadingIds.length,
                    }),
                },
            });
        });

        return apiSuccess({ message: 'House deleted successfully' });
    } catch (error) {
        console.error('Delete house error:', error);
        return apiError('Failed to delete house');
    }
}
