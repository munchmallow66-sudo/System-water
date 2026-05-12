import type { User, House, MeterReading, Bill, Payment, WaterRate, Role, PaymentMethod } from '@prisma/client'

// Re-export Prisma types
export type {
  User,
  House,
  MeterReading,
  Bill,
  Payment,
  WaterRate,
  Role,
  PaymentMethod,
}

// Extended user type for session
export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Dashboard statistics
export interface DashboardStats {
  totalHouses: number
  activeHouses: number
  totalBills: number
  unpaidBills: number
  totalRevenue: number
  monthlyRevenue: number
  anomalyCount: number
  pendingPayments: number
}

// House with latest reading
export interface HouseWithReading extends House {
  latestReading?: MeterReading | null
  unpaidBills?: Bill[]
}

// Bill with relations
export interface BillWithRelations extends Bill {
  house: House
  payments: Payment[]
}

// Meter reading with relations
export interface MeterReadingWithRelations extends MeterReading {
  house: House
  recordedBy: User
}

// Payment with relations
export interface PaymentWithRelations extends Payment {
  bill: BillWithRelations
  receivedBy: User
}

// Water rate tier
export interface WaterRateTier {
  id: string
  name: string
  minUnits: number
  maxUnits: number
  ratePerUnit: number
}

// Billing calculation
export interface BillingCalculation {
  usage: number
  breakdown: {
    tier: string
    units: number
    rate: number
    amount: number
  }[]
  totalAmount: number
}

// Monthly report
export interface MonthlyReport {
  month: string
  totalUsage: number
  totalBills: number
  totalPaid: number
  totalPending: number
  houseCount: number
  averageUsage: number
}

// Anomaly detection result
export interface AnomalyResult {
  houseId: string
  houseNumber: string
  ownerName: string
  currentUsage: number
  previousUsage: number
  percentageChange: number
  isAnomaly: boolean
}

// Form types for creating/updating records
export interface CreateHouseInput {
  houseNumber: string
  ownerName: string
  imageUrl?: string
}

export interface UpdateHouseInput extends Partial<CreateHouseInput> {
  isActive?: boolean
}

export interface CreateMeterReadingInput {
  houseId: string
  month: string
  previousUnit: number
  currentUnit: number
  notes?: string
}

export interface CreateBillInput {
  houseId: string
  month: string
  totalAmount: number
  dueDate: Date
}

export interface CreatePaymentInput {
  billId: string
  amount: number
  paymentMethod: PaymentMethod
  slipUrl?: string
  notes?: string
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role?: Role
}

export interface UpdateUserInput extends Partial<Omit<CreateUserInput, 'password'>> {
  isActive?: boolean
}

// Chart data types
export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface UsageTrendData {
  month: string
  usage: number
  revenue: number
  houseCount: number
}

// Pagination
export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Filter types
export interface HouseFilter {
  isActive?: boolean
  search?: string
}

export interface BillFilter {
  status?: 'all' | 'paid' | 'unpaid'
  month?: string
  houseId?: string
}

export interface PaymentFilter {
  paymentMethod?: PaymentMethod
  startDate?: Date
  endDate?: Date
  houseId?: string
}

export interface MeterReadingFilter {
  month?: string
  isAnomaly?: boolean
  houseId?: string
}
