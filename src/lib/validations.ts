import { z } from 'zod';

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'STAFF']),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

// House validation schemas
export const createHouseSchema = z.object({
  houseNumber: z.string().min(1, 'House number is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  initialReading: z.number().min(0).default(0),
});

export const updateHouseSchema = z.object({
  houseNumber: z.string().min(1, 'House number is required').optional(),
  ownerName: z.string().min(1, 'Owner name is required').optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  initialReading: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

// Meter Reading validation schemas
export const createMeterReadingSchema = z.object({
  houseId: z.string().min(1, 'House ID is required'),
  readingValue: z.number().min(0, 'Reading value must be non-negative'),
  readingDate: z.string().transform((val) => new Date(val)).optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
});

export const updateMeterReadingSchema = z.object({
  readingValue: z.number().min(0, 'Reading value must be non-negative').optional(),
  readingDate: z.string().transform((val) => new Date(val)).optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  isAnomaly: z.boolean().optional(),
});

// Bill validation schemas
export const createBillSchema = z.object({
  houseId: z.string().min(1, 'House ID is required'),
  meterReadingId: z.string().min(1, 'Meter reading ID is required'),
  periodStart: z.string().transform((val) => new Date(val)),
  periodEnd: z.string().transform((val) => new Date(val)),
  dueDate: z.string().transform((val) => new Date(val)),
  baseFee: z.number().min(0).optional(),
});

export const generateBillsSchema = z.object({
  periodStart: z.string().transform((val) => new Date(val)),
  periodEnd: z.string().transform((val) => new Date(val)),
  dueDate: z.string().transform((val) => new Date(val)),
  baseFee: z.number().min(0).default(0),
});

export const updateBillSchema = z.object({
  dueDate: z.string().transform((val) => new Date(val)).optional(),
  baseFee: z.number().min(0).optional(),
  isPaid: z.boolean().optional(),
});

// Payment validation schemas
export const createPaymentSchema = z.object({
  billId: z.string().min(1, 'Bill ID is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'PROMPTPAY']).default('CASH'),
  slipUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export const paymentMethodSchema = z.enum(['CASH', 'TRANSFER', 'PROMPTPAY']);

// Public search validation
export const publicSearchSchema = z.object({
  houseNumber: z.string().min(1, 'House number is required'),
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(2000).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().transform((val) => new Date(val)).optional(),
  endDate: z.string().transform((val) => new Date(val)).optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateHouseInput = z.infer<typeof createHouseSchema>;
export type UpdateHouseInput = z.infer<typeof updateHouseSchema>;
export type CreateMeterReadingInput = z.infer<typeof createMeterReadingSchema>;
export type UpdateMeterReadingInput = z.infer<typeof updateMeterReadingSchema>;
export type CreateBillInput = z.infer<typeof createBillSchema>;
export type GenerateBillsInput = z.infer<typeof generateBillsSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PublicSearchInput = z.infer<typeof publicSearchSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
