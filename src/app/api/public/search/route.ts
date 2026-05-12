import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/public/search - Public search by house number
// This is a READ-ONLY endpoint with no sensitive data
// No authentication required
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const houseNumber = searchParams.get('houseNumber');
    
    if (!houseNumber || houseNumber.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเลขที่บ้าน' },
        { status: 400 }
      );
    }
    
    // Find house by house number
    const house = await db.house.findUnique({
      where: { houseNumber: houseNumber.trim() },
      include: {
        meterReadings: {
          take: 7,
          orderBy: { readingDate: 'desc' },
        },
        bills: {
          orderBy: { periodEnd: 'desc' },
          take: 6,
          include: {
            meterReading: true,
          },
        },
      },
    });
    
    if (!house) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลบ้านเลขที่นี้' },
        { status: 404 }
      );
    }
    
    // Calculate outstanding balance from all unpaid bills
    const unpaidBills = await db.bill.findMany({
      where: {
        houseId: house.id,
        isPaid: false,
      },
      select: {
        totalAmount: true,
      },
    });
    
    const outstandingBalance = unpaidBills.reduce(
      (sum, bill) => sum + Number(bill.totalAmount),
      0
    );
    
    // Build billing history from actual bills (accurate payment status)
    const billingHistory = house.bills.map((bill) => {
      const isOverdue = !bill.isPaid && new Date(bill.dueDate) < new Date();
      
      return {
        period: bill.periodEnd.toLocaleDateString('th-TH', { year: 'numeric', month: 'short' }),
        previousReading: Number(bill.previousReading),
        currentReading: Number(bill.currentReading),
        usage: Number(bill.usage),
        amount: Number(bill.totalAmount),
        status: bill.isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending'),
        dueDate: bill.dueDate.toLocaleDateString('th-TH'),
        paidAt: bill.paidAt ? bill.paidAt.toLocaleDateString('th-TH') : null,
      };
    });

    // Get latest meter reading
    const latestReading = house.meterReadings[0] || null;
    
    // Calculate average usage from bills
    const avgUsage = billingHistory.length > 0
      ? billingHistory.reduce((sum, r) => sum + r.usage, 0) / billingHistory.length
      : 0;
    
    // Count overdue bills
    const overdueBills = house.bills.filter(b => !b.isPaid && new Date(b.dueDate) < new Date());
    
    // Find next upcoming due date
    const nextDueBill = house.bills.find(b => !b.isPaid);
    
    // Format response - only public data
    const response = {
      success: true,
      data: {
        // Basic info
        ownerName: house.ownerName,
        houseNumber: house.houseNumber,
        
        // Latest meter info
        latestMeter: latestReading ? {
          readingDate: latestReading.readingDate.toLocaleDateString('th-TH'),
          readingValue: Number(latestReading.readingValue),
          usage: Number(latestReading.usage),
          isAnomaly: latestReading.isAnomaly,
        } : null,
        
        // Billing history with REAL payment status
        billingHistory,
        
        // Average usage
        averageUsage: Math.round(avgUsage * 100) / 100,
        
        // Outstanding balance
        outstandingBalance: {
          amount: outstandingBalance,
          formatted: new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
          }).format(outstandingBalance),
        },
        
        // Payment status
        paymentStatus: {
          hasOutstanding: outstandingBalance > 0,
          overdueBills: overdueBills.length,
          upcomingDueDate: nextDueBill?.dueDate
            ? nextDueBill.dueDate.toLocaleDateString('th-TH')
            : null,
        },
        
        // Last updated
        lastUpdated: house.updatedAt.toLocaleDateString('th-TH'),
      },
    };
    
    // No cache - always return fresh data
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Public search error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการค้นหา' },
      { status: 500 }
    );
  }
}
