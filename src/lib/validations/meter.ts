import { z } from 'zod'

export const createMeterReadingSchema = z.object({
  houseId: z.string().min(1, 'House is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  previousUnit: z.number().min(0, 'Previous unit must be non-negative'),
  currentUnit: z.number().min(0, 'Current unit must be non-negative'),
  notes: z.string().max(500, 'Notes too long').optional(),
}).refine((data) => data.currentUnit >= data.previousUnit, {
  message: 'Current unit must be greater than or equal to previous unit',
  path: ['currentUnit'],
})

export const updateMeterReadingSchema = z.object({
  previousUnit: z.number().min(0, 'Previous unit must be non-negative').optional(),
  currentUnit: z.number().min(0, 'Current unit must be non-negative').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  isAnomaly: z.boolean().optional(),
})

export const meterReadingFilterSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  isAnomaly: z.boolean().optional(),
  houseId: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['month', 'usage', 'calculatedAmount', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateMeterReadingInput = z.infer<typeof createMeterReadingSchema>
export type UpdateMeterReadingInput = z.infer<typeof updateMeterReadingSchema>
export type MeterReadingFilterInput = z.infer<typeof meterReadingFilterSchema>
