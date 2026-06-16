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

const guestFlowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  birthDate: z.string().optional(),
})

export const createStayFlowSchema = z.object({
  property_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  check_in_date: z.string(),
  check_out_date: z.string(),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  room_count: z.number().int().min(1).default(1),
  booking_status: z.enum(['OFFER', 'CONFIRMED']),
  rate_code: z.string().min(1),
  rate_label: z.string().min(1),
  room_label: z.string().min(1),
  nightly_rate: z.number().min(0),
  subtotal_amount: z.number().min(0),
  extras_amount: z.number().min(0).default(0),
  total_amount: z.number().min(0),
  currency: z.string().min(1).default('EUR'),
  confirmation_preference: z.enum(['send', 'do_not_send']),
  internal_notes: z.string().optional(),
  price_details: z.record(z.string(), z.unknown()).default({}),
  extras_details: z.array(z.record(z.string(), z.unknown())).default([]),
  primary_guest: z.object({
    name: z.string().min(1, 'Primary guest name is required'),
    address: z.string().min(1, 'Address is required'),
    birthDate: z.string().min(1, 'Date of birth is required'),
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('A valid email address is required'),
    idType: z.enum(['passport', 'drivers_license', 'identity_card']),
    idNumber: z.string().min(1, 'ID number is required'),
    company: z.string().optional(),
  }),
  accompanying_guests: z.array(guestFlowSchema).default([]),
})

export type CreateStayFlowInput = z.infer<typeof createStayFlowSchema>
