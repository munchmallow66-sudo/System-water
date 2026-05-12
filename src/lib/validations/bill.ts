import { z } from 'zod'

export const createBillSchema = z.object({
  houseId: z.string().min(1, 'House is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  totalAmount: z.number().min(0, 'Total amount must be non-negative'),
  dueDate: z.date(),
})

export const updateBillSchema = z.object({
  totalAmount: z.number().min(0, 'Total amount must be non-negative').optional(),
  dueDate: z.date().optional(),
  status: z.enum(['PAID', 'UNPAID', 'PARTIAL']).optional(),
})

export const billFilterSchema = z.object({
  status: z.enum(['PAID', 'UNPAID', 'PARTIAL']).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  houseId: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['month', 'totalAmount', 'dueDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateBillInput = z.infer<typeof createBillSchema>
export type UpdateBillInput = z.infer<typeof updateBillSchema>
export type BillFilterInput = z.infer<typeof billFilterSchema>
