import { z } from 'zod'

export const createStaySchema = z.object({
  property_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  primary_guest_id: z.string().uuid().optional(),
  external_reference: z.string().optional(),
  source: z.enum(['MANUAL', 'IMPORT', 'PMS', 'OTA', 'OTHER']).default('MANUAL'),
  check_in_date: z.string(),
  check_out_date: z.string(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  breakfast_included: z.boolean().default(false),
  breakfast_count_adults: z.number().int().min(0).default(0),
  breakfast_count_children: z.number().int().min(0).default(0),
  local_tax_applicable: z.boolean().default(false),
  local_tax_amount: z.number().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
})

export type CreateStayInput = z.infer<typeof createStaySchema>
