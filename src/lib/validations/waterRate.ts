import { z } from 'zod'

export const createWaterRateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  minUnits: z.number().min(0, 'Minimum units must be non-negative'),
  maxUnits: z.number().min(0, 'Maximum units must be non-negative'),
  ratePerUnit: z.number().min(0, 'Rate per unit must be non-negative'),
}).refine((data) => data.maxUnits === 0 || data.maxUnits > data.minUnits, {
  message: 'Maximum units must be greater than minimum units (or 0 for unlimited)',
  path: ['maxUnits'],
})

export const updateWaterRateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long').optional(),
  minUnits: z.number().min(0, 'Minimum units must be non-negative').optional(),
  maxUnits: z.number().min(0, 'Maximum units must be non-negative').optional(),
  ratePerUnit: z.number().min(0, 'Rate per unit must be non-negative').optional(),
  isActive: z.boolean().optional(),
})

export type CreateWaterRateInput = z.infer<typeof createWaterRateSchema>
export type UpdateWaterRateInput = z.infer<typeof updateWaterRateSchema>
