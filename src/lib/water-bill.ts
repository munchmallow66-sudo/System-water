// Water rates configuration (tiered pricing)
export const WATER_RATES = [
  { min: 0, max: 10, rate: 8.50 },   // First 10 cubic meters
  { min: 10, max: 20, rate: 10.00 }, // 10-20 cubic meters
  { min: 20, max: 30, rate: 12.00 }, // 20-30 cubic meters
  { min: 30, max: 0, rate: 15.00 },  // Above 30 cubic meters (0 = unlimited)
] as const;

/**
 * Calculate water bill based on tiered pricing
 * @param usage - Water usage in cubic meters
 * @returns Total amount in Baht
 */
export function calculateWaterBill(usage: number): number {
  return calculateWaterBillWithRates(usage);
}

/**
 * Calculate water bill based on provided tiered rates
 * @param usage - Water usage in cubic meters
 * @param customRates - Optional custom rates [ { minUnits, maxUnits, ratePerUnit } ]
 * @returns Total amount in Baht
 */
export function calculateWaterBillWithRates(
  usage: number,
  customRates?: Array<{ minUnits: number; maxUnits: number; ratePerUnit: number }>
): number {
  let total = 0;
  const ratesToUse = customRates?.length
    ? [...customRates].sort((a, b) => a.minUnits - b.minUnits)
    : WATER_RATES.map(r => ({ minUnits: r.min, maxUnits: r.max || 999999, ratePerUnit: r.rate }));

  for (const tier of ratesToUse) {
    if (usage <= tier.minUnits) continue;

    const tierMax = tier.maxUnits === 999999 ? Infinity : tier.maxUnits;
    const tierUsage = tierMax === Infinity
      ? usage - tier.minUnits
      : Math.min(usage - tier.minUnits, tierMax - tier.minUnits);

    if (tierUsage > 0) {
      total += tierUsage * tier.ratePerUnit;
    }

    if (tierMax !== Infinity && usage <= tierMax) break;
  }

  return Math.round(total * 100) / 100; // Round to 2 decimal places
}

/**
 * Get detailed breakdown of water bill by tier
 * @param usage - Water usage in cubic meters
 * @returns Array of tier breakdowns
 */
export function getBillBreakdown(
  usage: number,
  customRates?: Array<{ minUnits: number; maxUnits: number; ratePerUnit: number }>
): Array<{
  tier: string;
  min: number;
  max: number | null;
  rate: number;
  usage: number;
  amount: number;
}> {
  const breakdown: Array<{
    tier: string;
    min: number;
    max: number | null;
    rate: number;
    usage: number;
    amount: number;
  }> = [];

  const ratesToUse = customRates?.length
    ? [...customRates].sort((a, b) => a.minUnits - b.minUnits).map(r => ({ 
        min: r.minUnits, 
        max: r.maxUnits === 999999 ? 0 : r.maxUnits, 
        rate: r.ratePerUnit 
      }))
    : WATER_RATES;

  for (const tier of ratesToUse) {
    if (usage <= tier.min) continue;

    const tierUsage = tier.max === 0
      ? usage - tier.min
      : Math.min(usage - tier.min, tier.max - tier.min);

    if (tierUsage > 0) {
      breakdown.push({
        tier: tier.max === 0 ? `${tier.min}+ m³` : `${tier.min}-${tier.max} m³`,
        min: tier.min,
        max: tier.max === 0 ? null : tier.max,
        rate: tier.rate,
        usage: Math.round(tierUsage * 100) / 100,
        amount: Math.round(tierUsage * tier.rate * 100) / 100,
      });
    }

    if (tier.max === 0 || usage <= tier.max) break;
  }

  return breakdown;
}

/**
 * Detect anomaly in water usage
 * @param usage - Current usage
 * @param avgUsage - Average usage (typically last 3-6 months average)
 * @returns boolean indicating if usage is anomalous
 */
export function detectAnomaly(usage: number, avgUsage: number): boolean {
  // Anomaly if usage is more than double the average or negative
  return usage > avgUsage * 2 || usage < 0;
}

/**
 * Calculate anomaly severity
 * @param usage - Current usage
 * @param avgUsage - Average usage
 * @returns 'low', 'medium', 'high', or null
 */
export function getAnomalySeverity(usage: number, avgUsage: number): 'low' | 'medium' | 'high' | null {
  if (!detectAnomaly(usage, avgUsage)) return null;

  if (usage < 0) return 'high'; // Negative usage is always high severity

  const ratio = usage / avgUsage;

  if (ratio > 3) return 'high';
  if (ratio > 2.5) return 'medium';
  return 'low';
}

/**
 * Generate bill number
 * Format: BILL-YYYYMM-XXXX
 */
export function generateBillNumber(): string {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BILL-${yearMonth}-${random}`;
}

/**
 * Generate receipt number
 * Format: RCP-YYYYMMDD-XXXX
 */
export function generateReceiptNumber(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${dateStr}-${random}`;
}

/**
 * Format currency (Thai Baht)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Calculate outstanding balance for a house
 */
export async function calculateOutstandingBalance(houseId: string, prisma: any): Promise<number> {
  const unpaidBills = await prisma.bill.findMany({
    where: {
      houseId,
      isPaid: false,
    },
    select: {
      totalAmount: true,
    },
  });

  return unpaidBills.reduce((sum: number, bill: any) => sum + Number(bill.totalAmount), 0);
}
