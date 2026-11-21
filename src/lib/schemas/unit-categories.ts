import { z } from 'zod'

export const createUnitCategorySchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().optional(),
  unit_type: z.enum(['ROOM', 'APARTMENT', 'CHALET', 'HOUSE', 'DORM', 'OTHER']).default('ROOM'),
  capacity_adults: z.number().int().min(1).default(2),
  capacity_children: z.number().int().min(0).default(0),
  description: z.string().optional(),
  // Nullable: no admin UI to set this yet, but the field already exists so a
  // future admin surface doesn't need a schema change.
  bookable_units_limit: z.number().int().min(0).nullable().optional(),
  /** Regular price per unit and night, excl. local tax. Prefills the booking flow. */
  base_rate: z.number().min(0).nullable().optional(),
})

export type CreateUnitCategoryInput = z.infer<typeof createUnitCategorySchema>
