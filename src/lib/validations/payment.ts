import { z } from 'zod'

export const createPaymentSchema = z.object({
  billId: z.string().min(1, 'Bill is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'PROMPTPAY'], {
    message: 'Invalid payment method'
  }),
  slipUrl: z.string().url('Invalid slip URL').optional().or(z.literal('')),
  notes: z.string().max(500, 'Notes too long').optional(),
})

export const paymentFilterSchema = z.object({
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'PROMPTPAY']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  houseId: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['paidAt', 'amount', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>
