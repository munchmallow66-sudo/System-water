import { z } from 'zod'

export const publicSearchSchema = z.object({
  houseNumber: z.string().min(1, 'House number is required'),
})

export const createHouseSchema = z.object({
  houseNumber: z.string().min(1, 'House number is required').max(20, 'House number too long'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters').max(100, 'Owner name too long'),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
})

export const updateHouseSchema = createHouseSchema.partial()

export const houseFilterSchema = z.object({
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['houseNumber', 'ownerName', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateHouseInput = z.infer<typeof createHouseSchema>
export type UpdateHouseInput = z.infer<typeof updateHouseSchema>
export type HouseFilterInput = z.infer<typeof houseFilterSchema>
