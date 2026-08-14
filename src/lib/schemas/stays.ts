import { z } from 'zod'

function getTodayDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// Stay-level fields only. Reservation-level fields (external_reference,
// source, booking_status, total_amount, currency, confirmation_preference)
// are not editable through this schema — external_reference in particular
// is system-set only (channel manager / import), never user-entered.
export const updateStaySchema = z.object({
  unit_id: z.string().uuid().optional(),
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  arrival_time: z.string().nullable().optional(),
  departure_time: z.string().nullable().optional(),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
  breakfast_included: z.boolean().optional(),
  breakfast_count_adults: z.number().int().min(0).optional(),
  breakfast_count_children: z.number().int().min(0).optional(),
  local_tax_applicable: z.boolean().optional(),
  local_tax_amount: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  room_label: z.string().nullable().optional(),
  nightly_rate: z.number().min(0).nullable().optional(),
  subtotal_amount: z.number().min(0).nullable().optional(),
  extras_amount: z.number().min(0).nullable().optional(),
})

export type UpdateStayInput = z.infer<typeof updateStaySchema>

const guestFlowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  birthDate: z.string().optional(),
})

/**
 * One selected unit category in the booking form. `quantity` is a creation
 * input only — it is never persisted; the number of booked units is derived
 * from how many stays the reservation ends up with.
 */
export const bookingPositionSchema = z.object({
  category_key: z.string().min(1),
  quantity: z.number().int().min(1),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  rate_code: z.string().min(1),
  rate_label: z.string().min(1),
  room_label: z.string().min(1),
  nightly_rate: z.number().min(0),
  price_details: z.record(z.string(), z.unknown()).default({}),
})

export type BookingPositionInput = z.infer<typeof bookingPositionSchema>

export const createReservationFlowSchema = z.object({
  property_id: z.string().uuid(),
  check_in_date: z.string(),
  check_out_date: z.string(),
  booking_status: z.enum(['OFFER', 'CONFIRMED']),
  currency: z.string().min(1).default('EUR'),
  confirmation_preference: z.enum(['send', 'do_not_send']),
  internal_notes: z.string().optional(),
  extras_amount: z.number().min(0).default(0),
  extras_details: z.array(z.record(z.string(), z.unknown())).default([]),
  positions: z.array(bookingPositionSchema).min(1, 'Select at least one room category.'),
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
}).superRefine((data, ctx) => {
  if (data.check_in_date < getTodayDateKey()) {
    ctx.addIssue({
      code: 'custom',
      path: ['check_in_date'],
      message: 'Past dates cannot be booked.',
    })
  }

  if (data.check_out_date <= data.check_in_date) {
    ctx.addIssue({
      code: 'custom',
      path: ['check_out_date'],
      message: 'Check-out must be after check-in.',
    })
  }

  // Each selected category must appear exactly once — quantity carries the count.
  const seen = new Set<string>()
  data.positions.forEach((position, index) => {
    if (seen.has(position.category_key)) {
      ctx.addIssue({
        code: 'custom',
        path: ['positions', index, 'category_key'],
        message: 'Each category may only appear once; use quantity instead.',
      })
    }
    seen.add(position.category_key)
  })
})

export type CreateReservationFlowInput = z.infer<typeof createReservationFlowSchema>
