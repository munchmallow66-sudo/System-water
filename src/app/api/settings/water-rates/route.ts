import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api-response';
import { getSession, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return apiUnauthorized();

        const rates = await db.waterRate.findMany({
            orderBy: { minUnits: 'asc' },
        });

        return apiSuccess(rates);
    } catch (error) {
        console.error('Fetch water rates error:', error);
        return apiError('Failed to fetch water rates');
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return apiUnauthorized();
        if (!isAdmin(session.user)) return apiForbidden('Admin only');

        const body = await request.json();
        const { name, minUnits, maxUnits, ratePerUnit, isActive } = body;

        const rate = await db.waterRate.create({
            data: {
                name,
                minUnits,
                maxUnits: maxUnits || 999999,
                ratePerUnit,
                isActive: isActive !== false,
            },
        });

        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: 'CREATE',
                entity: 'WaterRate',
                entityId: rate.id,
                details: JSON.stringify({ name, ratePerUnit }),
            },
        });

        return apiSuccess(rate, 201);
    } catch (error) {
        console.error('Create water rate error:', error);
        return apiError('Failed to create water rate');
    }
}
