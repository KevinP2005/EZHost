import { z } from 'zod'

export const createUnitSchema = z.object({
  property_id: z.string().uuid(),
  unit_category_id: z.string().uuid(),
  name: z.string().min(1),
  floor: z.string().optional(),
})

export type CreateUnitInput = z.infer<typeof createUnitSchema>
