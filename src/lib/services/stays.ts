import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/services/activity'
import type { Reservation, Stay, StayStatus, RegistrationStatus } from '@/lib/database.types'
import type { CreateReservationFlowInput, UpdateStayInput } from '@/lib/schemas/stays'

// Re-export schema + type so existing imports from this module still work
export { createReservationFlowSchema } from '@/lib/schemas/stays'
export type { CreateReservationFlowInput } from '@/lib/schemas/stays'

export type ReservationWithStays = Reservation & { stays: Stay[] }

function splitGuestName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return { first_name: '', last_name: '' }
  }

  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' }
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  }
}

/**
 * Creates Booker + Primary Guest + Reservation + N Stays + stay_guests in one
 * transaction via `create_reservation_booking_flow`.
 *
 * One stay is created per concrete unit: a position with quantity 2 produces
 * two stays on two distinct units. Availability is re-validated inside the
 * transaction, so an insufficient position aborts the entire reservation
 * rather than persisting a partial booking.
 *
 * The UI collects a single guest, so Booker and Primary Guest are the same
 * guest record.
 */
export async function createReservationFromFlow(
  organizationId: string,
  profileId: string,
  input: CreateReservationFlowInput
): Promise<ReservationWithStays> {
  const supabase = await createClient()

  const primaryGuestName = splitGuestName(input.primary_guest.name)
  const accompanyingGuests = input.accompanying_guests.map((guest) => ({
    ...splitGuestName(guest.name),
    date_of_birth: guest.birthDate || null,
  }))

  const { data: reservation, error } = await supabase.rpc('create_reservation_booking_flow', {
    p_organization_id: organizationId,
    p_property_id: input.property_id,
    p_check_in_date: input.check_in_date,
    p_check_out_date: input.check_out_date,
    p_booking_status: input.booking_status,
    p_currency: input.currency,
    p_confirmation_preference: input.confirmation_preference,
    p_internal_notes: input.internal_notes ?? null,
    p_extras_amount: input.extras_amount,
    p_extras_details: input.extras_details,
    p_positions: input.positions,
    p_primary_guest: {
      ...primaryGuestName,
      email: input.primary_guest.email,
      phone: input.primary_guest.phone,
      date_of_birth: input.primary_guest.birthDate,
      address: input.primary_guest.address,
      document_type: input.primary_guest.idType,
      document_number: input.primary_guest.idNumber,
      company: input.primary_guest.company ?? null,
    },
    p_accompanying_guests: accompanyingGuests,
  })

  if (error) throw new Error(error.message)

  const { data: stays, error: staysError } = await supabase
    .from('stays')
    .select('*')
    .eq('reservation_id', reservation.id)
    .order('stay_number')

  if (staysError) throw new Error(staysError.message)

  await createActivityLog(
    organizationId,
    profileId,
    input.booking_status === 'OFFER' ? 'offer_created' : 'stay_confirmed',
    'reservation',
    reservation.id,
    {
      booking_status: input.booking_status,
      stay_count: (stays ?? []).length,
      total_amount: reservation.total_amount,
      currency: reservation.currency,
    },
    input.property_id
  )

  return { ...reservation, stays: stays ?? [] }
}

export async function updateStay(
  stayId: string,
  organizationId: string,
  profileId: string,
  input: UpdateStayInput
): Promise<Stay> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stays')
    .update(input)
    .eq('id', stayId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  await createActivityLog(organizationId, profileId, 'stay_updated', 'stay', stayId, undefined, data.property_id)
  return data
}

export async function checkInStay(stayId: string, organizationId: string, profileId: string): Promise<Stay> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stays')
    .update({ status: 'CHECKED_IN' as StayStatus })
    .eq('id', stayId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  await createActivityLog(organizationId, profileId, 'stay_checked_in', 'stay', stayId, undefined, data.property_id)
  return data
}

export async function checkOutStay(stayId: string, organizationId: string, profileId: string): Promise<Stay> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stays')
    .update({ status: 'CHECKED_OUT' as StayStatus })
    .eq('id', stayId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  await createActivityLog(organizationId, profileId, 'stay_checked_out', 'stay', stayId, undefined, data.property_id)
  return data
}

/**
 * Cancels exactly the given stay ids in one atomic UPDATE (via the
 * `cancel_stays` RPC) and logs one activity entry per affected stay.
 * Used directly for the "Cancel Stays" (subset) scope, and by
 * `cancelStay`/`cancelReservation` below for the single-stay and
 * whole-reservation scopes respectively.
 *
 * When `reservationId` is given, every id is verified to belong to that
 * reservation first — defence in depth against a caller passing ids across
 * reservations (the UI never does this, but the API boundary shouldn't rely
 * on that alone).
 */
export async function cancelStays(
  stayIds: string[],
  organizationId: string,
  profileId: string,
  reason: string,
  details?: string,
  reservationId?: string
): Promise<Stay[]> {
  if (stayIds.length === 0) return []

  const supabase = await createClient()

  if (reservationId) {
    const { data: mismatched, error: checkError } = await supabase
      .from('stays')
      .select('id')
      .in('id', stayIds)
      .neq('reservation_id', reservationId)

    if (checkError) throw new Error(checkError.message)
    if (mismatched && mismatched.length > 0) {
      throw new Error('All selected stays must belong to the same reservation')
    }
  }

  const status: StayStatus = reason === 'NO_SHOW' ? 'NO_SHOW' : 'CANCELLED'
  const note = `Cancellation (${reason})${details ? `: ${details}` : ''}`

  const { data, error } = await supabase.rpc('cancel_stays', {
    p_stay_ids: stayIds,
    p_organization_id: organizationId,
    p_status: status,
    p_note: note,
  })

  if (error) throw new Error(error.message)

  const cancelled = (data ?? []) as Stay[]
  for (const row of cancelled) {
    await createActivityLog(organizationId, profileId, 'stay_cancelled', 'stay', row.id, { reason }, row.property_id)
  }

  return cancelled
}

/** Cancels a single stay. The other stays of its reservation are untouched. */
export async function cancelStay(
  stayId: string,
  organizationId: string,
  profileId: string,
  reason: string,
  details?: string
): Promise<Stay> {
  const [cancelled] = await cancelStays([stayId], organizationId, profileId, reason, details)
  if (!cancelled) throw new Error('Stay not found')
  return cancelled
}

/**
 * Reservation-level cancellation: cancels every currently-active stay of the
 * reservation (already-cancelled/no-show stays are left as-is) and stamps
 * reservations.cancelled_at. This is the "Cancel Reservation" action — a real
 * reservation-scoped operation, distinct from cancelling an individual stay.
 */
export async function cancelReservation(
  reservationId: string,
  organizationId: string,
  profileId: string,
  reason: string,
  details?: string
): Promise<{ reservation: Reservation; stays: Stay[] }> {
  const supabase = await createClient()

  const { data: activeStays, error: fetchError } = await supabase
    .from('stays')
    .select('id')
    .eq('reservation_id', reservationId)
    .eq('organization_id', organizationId)
    .not('status', 'in', '("CANCELLED","NO_SHOW")')

  if (fetchError) throw new Error(fetchError.message)

  const stayIds = (activeStays ?? []).map((row) => row.id)
  const cancelled = await cancelStays(stayIds, organizationId, profileId, reason, details, reservationId)

  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', reservationId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (reservationError) throw new Error(reservationError.message)

  await createActivityLog(
    organizationId,
    profileId,
    'reservation_cancelled',
    'reservation',
    reservationId,
    { reason, stay_count: cancelled.length },
    reservation.property_id
  )

  return { reservation, stays: cancelled }
}

export async function updateRegistrationStatus(
  stayId: string,
  organizationId: string,
  profileId: string,
  status: RegistrationStatus
): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stays')
    .update({ registration_status: status })
    .eq('id', stayId)
    .eq('organization_id', organizationId)
    .select('property_id')
    .single()

  if (error) throw new Error(error.message)
  await createActivityLog(organizationId, profileId, 'registration_status_updated', 'stay', stayId, { status }, data.property_id)
}

/** Flattens the embedded `reservations` row onto a stay row for display, keeping the stay's own id/timestamps. */
function flattenReservation<T extends { id: string; reservations: Record<string, unknown> | null }>(row: T) {
  const { reservations, ...rest } = row
  return { ...reservations, ...rest, guests: (reservations as Record<string, unknown> | null)?.guests ?? null }
}

export async function getStaysByDate(
  organizationId: string | null,
  date: string,
  propertyId?: string,
  propertyIds?: string[]
): Promise<{ arrivals: Stay[]; departures: Stay[]; inHouse: Stay[] }> {
  const supabase = await createClient()

  const arrivalsQuery = supabase
    .from('stays')
    .select('*, units(name), properties(name), reservations!inner(booking_status, guests!primary_guest_id(first_name, last_name))')
    .eq('check_in_date', date)
    .eq('reservations.booking_status', 'CONFIRMED')
    .not('status', 'in', '("CANCELLED","NO_SHOW")')
    .order('arrival_time', { ascending: true, nullsFirst: false })

  const departuresQuery = supabase
    .from('stays')
    .select('*, units(name), properties(name), reservations!inner(booking_status, guests!primary_guest_id(first_name, last_name))')
    .eq('check_out_date', date)
    .eq('reservations.booking_status', 'CONFIRMED')
    .not('status', 'in', '("CANCELLED","NO_SHOW","BOOKED")')
    .order('departure_time', { ascending: true, nullsFirst: false })

  const inHouseQuery = supabase
    .from('stays')
    .select('*, units(name), properties(name), reservations!inner(booking_status, guests!primary_guest_id(first_name, last_name))')
    .eq('reservations.booking_status', 'CONFIRMED')
    .eq('status', 'CHECKED_IN')
    .lt('check_in_date', date)
    .gt('check_out_date', date)

  if (organizationId) {
    arrivalsQuery.eq('organization_id', organizationId)
    departuresQuery.eq('organization_id', organizationId)
    inHouseQuery.eq('organization_id', organizationId)
  }

  if (propertyId) {
    arrivalsQuery.eq('property_id', propertyId)
    departuresQuery.eq('property_id', propertyId)
    inHouseQuery.eq('property_id', propertyId)
  } else if (propertyIds?.length) {
    arrivalsQuery.in('property_id', propertyIds)
    departuresQuery.in('property_id', propertyIds)
    inHouseQuery.in('property_id', propertyIds)
  }

  const [arrivalsRes, departuresRes, inHouseRes] = await Promise.all([
    arrivalsQuery,
    departuresQuery,
    inHouseQuery,
  ])

  return {
    arrivals: (arrivalsRes.data ?? []).map(flattenReservation) as unknown as Stay[],
    departures: (departuresRes.data ?? []).map(flattenReservation) as unknown as Stay[],
    inHouse: (inHouseRes.data ?? []).map(flattenReservation) as unknown as Stay[],
  }
}

export async function getDailyOverview(
  organizationId: string | null,
  date: string,
  propertyId?: string,
  propertyIds?: string[]
) {
  const supabase = await createClient()
  const tomorrow = new Date(date)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  let breakfastTodayQuery = supabase
    .from('breakfast_items')
    .select('adults_count, children_count')
    .eq('date', date)
    .not('status', 'eq', 'CANCELLED')

  let breakfastTomorrowQuery = supabase
    .from('breakfast_items')
    .select('adults_count, children_count')
    .eq('date', tomorrowStr)
    .not('status', 'eq', 'CANCELLED')

  let openTasksQuery = supabase
    .from('housekeeping_tasks')
    .select('id', { count: 'exact' })
    .in('status', ['OPEN', 'IN_PROGRESS'])

  let dirtyUnitsQuery = supabase
    .from('units')
    .select('id', { count: 'exact' })
    .eq('housekeeping_status', 'DIRTY')

  let missingRegQuery = supabase
    .from('stays')
    .select('id, reservations!inner(booking_status)', { count: 'exact' })
    .eq('reservations.booking_status', 'CONFIRMED')
    .in('registration_status', ['MISSING', 'PARTIAL'])
    .in('status', ['BOOKED', 'CHECKED_IN'])

  if (organizationId) {
    breakfastTodayQuery = breakfastTodayQuery.eq('organization_id', organizationId)
    breakfastTomorrowQuery = breakfastTomorrowQuery.eq('organization_id', organizationId)
    openTasksQuery = openTasksQuery.eq('organization_id', organizationId)
    dirtyUnitsQuery = dirtyUnitsQuery.eq('organization_id', organizationId)
    missingRegQuery = missingRegQuery.eq('organization_id', organizationId)
  }

  if (propertyId) {
    breakfastTodayQuery = breakfastTodayQuery.eq('property_id', propertyId)
    breakfastTomorrowQuery = breakfastTomorrowQuery.eq('property_id', propertyId)
    openTasksQuery = openTasksQuery.eq('property_id', propertyId)
    dirtyUnitsQuery = dirtyUnitsQuery.eq('property_id', propertyId)
    missingRegQuery = missingRegQuery.eq('property_id', propertyId)
  } else if (propertyIds?.length) {
    breakfastTodayQuery = breakfastTodayQuery.in('property_id', propertyIds)
    breakfastTomorrowQuery = breakfastTomorrowQuery.in('property_id', propertyIds)
    openTasksQuery = openTasksQuery.in('property_id', propertyIds)
    dirtyUnitsQuery = dirtyUnitsQuery.in('property_id', propertyIds)
    missingRegQuery = missingRegQuery.in('property_id', propertyIds)
  }

  const [stayData, breakfastToday, breakfastTomorrow, openTasks, dirtyUnits, missingReg] = await Promise.all([
    getStaysByDate(organizationId, date, propertyId, propertyIds),
    breakfastTodayQuery,
    breakfastTomorrowQuery,
    openTasksQuery,
    dirtyUnitsQuery,
    missingRegQuery,
  ])

  const todayAdults = (breakfastToday.data ?? []).reduce((sum, row) => sum + row.adults_count, 0)
  const todayChildren = (breakfastToday.data ?? []).reduce((sum, row) => sum + row.children_count, 0)
  const tomorrowAdults = (breakfastTomorrow.data ?? []).reduce((sum, row) => sum + row.adults_count, 0)
  const tomorrowChildren = (breakfastTomorrow.data ?? []).reduce((sum, row) => sum + row.children_count, 0)

  return {
    arrivals: stayData.arrivals,
    departures: stayData.departures,
    inHouse: stayData.inHouse,
    breakfastToday: { adults: todayAdults, children: todayChildren, total: todayAdults + todayChildren },
    breakfastTomorrow: { adults: tomorrowAdults, children: tomorrowChildren, total: tomorrowAdults + tomorrowChildren },
    openTasksCount: openTasks.count ?? 0,
    dirtyUnitsCount: dirtyUnits.count ?? 0,
    missingRegistrationCount: missingReg.count ?? 0,
  }
}
