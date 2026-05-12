import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateBillsSchema } from '@/lib/validations';
import { 
  apiSuccess, 
  apiError, 
  apiValidationError, 
  apiUnauthorized, 
  apiForbidden 
} from '@/lib/api-response';
import { getSession, isAdmin } from '@/lib/auth';
import { calculateWaterBillWithRates, generateBillNumber } from '@/lib/water-bill';

// POST /api/bills/generate - Generate bills for all houses (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }
    
    // Check authorization (Admin only)
    if (!isAdmin(session.user)) {
      return apiForbidden('Only administrators can generate bills');
    }
    
    // Parse and validate request body
    const body = await request.json();
    const result = generateBillsSchema.safeParse(body);
    
    if (!result.success) {
      return apiValidationError(result.error);
    }
    
    const { periodStart, periodEnd, dueDate, baseFee = 0 } = result.data;
    
    const activeRates = await db.waterRate.findMany({
      where: { isActive: true },
      orderBy: { minUnits: 'asc' },
    });

    const ratesForCalc = activeRates.map((rate) => ({
      minUnits: Number(rate.minUnits),
      maxUnits: Number(rate.maxUnits),
      ratePerUnit: Number(rate.ratePerUnit),
    }));

    // Get all active houses with their latest meter readings
    const houses = await db.house.findMany({
      where: { isActive: true },
      include: {
        meterReadings: {
          orderBy: { readingDate: 'desc' },
          take: 2, // Get latest and previous reading
        },
        bills: {
          where: {
            OR: [
              // Check if there's already a bill for this period
              {
                periodStart: { lte: periodEnd },
                periodEnd: { gte: periodStart },
              },
            ],
          },
        },
      },
    });
    
    // Filter houses that have meter readings and no existing bill for this period
    const housesToBill = houses.filter(
      (house) => house.meterReadings.length > 0 && house.bills.length === 0
    );
    
    if (housesToBill.length === 0) {
      return apiSuccess({
        message: 'No houses to bill. Either no meter readings exist or bills already generated for this period.',
        generatedCount: 0,
        skippedCount: houses.length,
      });
    }
    
    // Generate bills in a transaction
    const result_bills = await db.$transaction(async (tx) => {
      const generatedBills: Array<{
        id: string;
        billNumber: string;
        houseNumber: string;
        ownerName: string;
        usage: number;
        carryOverAmount?: number;
        totalAmount: number;
      }> = [];
      
      for (const house of housesToBill) {
        const latestReading = house.meterReadings[0];
        const previousReading = house.meterReadings[1];
        
        if (!latestReading) continue;
        
        // Check if this reading already has a bill
        const existingBillForReading = await tx.bill.findUnique({
          where: { meterReadingId: latestReading.id },
        });
        
        if (existingBillForReading) continue;
        
        const previousReadingValue = Number(previousReading?.readingValue || 0);
        const latestReadingValue = Number(latestReading.readingValue);
        const usage = latestReadingValue - previousReadingValue;
        const usageFee = calculateWaterBillWithRates(usage, ratesForCalc);
        const unpaidBills = await tx.bill.findMany({
          where: {
            houseId: house.id,
            isPaid: false,
          },
          include: {
            payments: {
              select: { amount: true },
            },
          },
        })

        const carryOverAmount = unpaidBills.reduce((sum, unpaidBill) => {
          const alreadyPaid = unpaidBill.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0)
          const remaining = Number(unpaidBill.totalAmount) - alreadyPaid
          return sum + Math.max(remaining, 0)
        }, 0)

        const totalAmount = usageFee + baseFee + carryOverAmount;
        
        // Generate bill number
        const billNumber = generateBillNumber();
        
        // Create bill
        const bill = await tx.bill.create({
          data: {
            houseId: house.id,
            meterReadingId: latestReading.id,
            billNumber,
            periodStart,
            periodEnd,
            previousReading: previousReadingValue,
            currentReading: latestReadingValue,
            usage,
            baseFee,
            usageFee,
            totalAmount,
            dueDate,
          },
        });
        
        generatedBills.push({
          id: bill.id,
          billNumber: bill.billNumber,
          houseNumber: house.houseNumber,
          ownerName: house.ownerName,
          usage,
          carryOverAmount,
          totalAmount,
        });
      }
      
      return generatedBills;
    });
    
    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BULK_CREATE',
        entity: 'Bill',
        entityId: 'bulk-generate',
        details: JSON.stringify({
          periodStart,
          periodEnd,
          count: result_bills.length,
          baseFee,
        }),
      },
    });
    
    return apiSuccess({
      message: `Successfully generated ${result_bills.length} bills`,
      generatedCount: result_bills.length,
      skippedCount: houses.length - result_bills.length,
      bills: result_bills,
    }, 201);
  } catch (error) {
    console.error('Generate bills error:', error);
    return apiError('Failed to generate bills');
  }
}
