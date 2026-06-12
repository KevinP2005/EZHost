import { z } from 'zod'

export const createGuestSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  document_type: z.string().optional(),
  document_number: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateGuestInput = z.infer<typeof createGuestSchema>
