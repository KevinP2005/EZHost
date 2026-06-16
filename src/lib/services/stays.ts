import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/services/activity'
import type { Stay, StayStatus, RegistrationStatus, BookingStatus } from '@/lib/database.types'
import type { CreateStayInput, CreateStayFlowInput } from '@/lib/schemas/stays'

// Re-export schema + type so existing imports from this module still work
export { createStaySchema, createStayFlowSchema } from '@/lib/schemas/stays'
export type { CreateStayInput, CreateStayFlowInput } from '@/lib/schemas/stays'

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

export async function createStay(organizationId: string, profileId: string, input: CreateStayInput): Promise<Stay> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stays')
    .insert({ ...input, organization_id: organizationId, status: 'BOOKED', registration_status: 'MISSING' })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await createActivityLog(organizationId, profileId, 'stay_created', 'stay', data.id, undefined, data.property_id)
  return data
}

export async function createStayFromFlow(
  organizationId: string,
  profileId: string,
  input: CreateStayFlowInput
): Promise<Stay> {
  const supabase = await createClient()

  const primaryGuestName = splitGuestName(input.primary_guest.name)
  const accompanyingGuests = input.accompanying_guests.map((guest) => ({
    ...splitGuestName(guest.name),
    date_of_birth: guest.birthDate || null,
  }))

  const { data, error } = await supabase.rpc('create_stay_booking_flow', {
    p_organization_id: organizationId,
    p_property_id: input.property_id,
    p_unit_id: input.unit_id,
    p_check_in_date: input.check_in_date,
    p_check_out_date: input.check_out_date,
    p_adults: input.adults,
    p_children: input.children,
    p_room_count: input.room_count,
    p_booking_status: input.booking_status as BookingStatus,
    p_rate_code: input.rate_code,
    p_rate_label: input.rate_label,
    p_room_label: input.room_label,
    p_nightly_rate: input.nightly_rate,
    p_subtotal_amount: input.subtotal_amount,
    p_extras_amount: input.extras_amount,
    p_total_amount: input.total_amount,
    p_currency: input.currency,
    p_confirmation_preference: input.confirmation_preference,
    p_internal_notes: input.internal_notes ?? null,
    p_price_details: input.price_details,
    p_extras_details: input.extras_details,
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

  await createActivityLog(
    organizationId,
    profileId,
    input.booking_status === 'OFFER' ? 'offer_created' : 'stay_confirmed',
    'stay',
    data.id,
    {
      booking_status: input.booking_status,
      room_label: input.room_label,
      total_amount: input.total_amount,
      currency: input.currency,
    },
    input.property_id
  )

  return data
}

export async function updateStay(
  stayId: string,
  organizationId: string,
  profileId: string,
  input: Partial<CreateStayInput>
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

export async function getStaysByDate(
  organizationId: string | null,
  date: string,
  propertyId?: string,
  propertyIds?: string[]
): Promise<{ arrivals: Stay[]; departures: Stay[]; inHouse: Stay[] }> {
  const supabase = await createClient()

  const arrivalsQuery = supabase
    .from('stays')
    .select('*, units(name), properties(name), guests!primary_guest_id(first_name, last_name)')
    .eq('check_in_date', date)
    .eq('booking_status', 'CONFIRMED')
    .not('status', 'in', '("CANCELLED","NO_SHOW")')
    .order('arrival_time', { ascending: true, nullsFirst: false })

  const departuresQuery = supabase
    .from('stays')
    .select('*, units(name), properties(name), guests!primary_guest_id(first_name, last_name)')
    .eq('check_out_date', date)
    .eq('booking_status', 'CONFIRMED')
    .not('status', 'in', '("CANCELLED","NO_SHOW","BOOKED")')
    .order('departure_time', { ascending: true, nullsFirst: false })

  const inHouseQuery = supabase
    .from('stays')
    .select('*, units(name), properties(name), guests!primary_guest_id(first_name, last_name)')
    .eq('booking_status', 'CONFIRMED')
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
    arrivals: arrivalsRes.data ?? [],
    departures: departuresRes.data ?? [],
    inHouse: inHouseRes.data ?? [],
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
    .select('id', { count: 'exact' })
    .eq('booking_status', 'CONFIRMED')
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
