import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api-response';
import { getSession, isAdmin } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getSession();
        if (!session) return apiUnauthorized();
        if (!isAdmin(session.user)) return apiForbidden('Admin only');

        const { id } = await params;
        const body = await request.json();
        const { name, minUnits, maxUnits, ratePerUnit, isActive } = body;

        const rate = await db.waterRate.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(minUnits !== undefined && { minUnits }),
                ...(maxUnits !== undefined && { maxUnits }),
                ...(ratePerUnit !== undefined && { ratePerUnit }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: 'UPDATE',
                entity: 'WaterRate',
                entityId: rate.id,
                details: JSON.stringify({ name, ratePerUnit, isActive }),
            },
        });

        return apiSuccess(rate);
    } catch (error) {
        console.error('Update water rate error:', error);
        return apiError('Failed to update water rate');
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getSession();
        if (!session) return apiUnauthorized();
        if (!isAdmin(session.user)) return apiForbidden('Admin only');

        const { id } = await params;

        await db.waterRate.delete({
            where: { id },
        });

        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: 'DELETE',
                entity: 'WaterRate',
                entityId: id,
            },
        });

        return apiSuccess({ message: 'Water rate deleted successfully' });
    } catch (error) {
        console.error('Delete water rate error:', error);
        return apiError('Failed to delete water rate');
    }
}
