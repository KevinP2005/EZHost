import { z } from 'zod'

export const createUnitSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  unit_type: z.enum(['ROOM', 'APARTMENT', 'CHALET', 'HOUSE', 'DORM', 'OTHER']).default('ROOM'),
  capacity_adults: z.number().int().min(1).default(2),
  capacity_children: z.number().int().min(0).default(0),
  floor: z.string().optional(),
  description: z.string().optional(),
})

export type CreateUnitInput = z.infer<typeof createUnitSchema>
