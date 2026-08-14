import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/services/activity'
import type { Guest } from '@/lib/database.types'
import type { CreateGuestInput } from '@/lib/schemas/guests'

export { createGuestSchema } from '@/lib/schemas/guests'
export type { CreateGuestInput } from '@/lib/schemas/guests'

export async function createGuest(organizationId: string, profileId: string, input: CreateGuestInput): Promise<Guest> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guests')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  await createActivityLog(organizationId, profileId, 'guest_created', 'guest', data.id)
  return data
}

export async function updateGuest(
  guestId: string,
  organizationId: string,
  profileId: string,
  input: Partial<CreateGuestInput>
): Promise<Guest> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guests')
    .update(input)
    .eq('id', guestId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  await createActivityLog(organizationId, profileId, 'guest_updated', 'guest', guestId)
  return data
}

export async function getGuests(
  organizationId: string | null,
  search?: string,
  propertyId?: string,
  propertyIds?: string[]
): Promise<Guest[]> {
  const supabase = await createClient()
  let query = supabase
    .from('guests')
    .select('*')
    .order('last_name', { ascending: true })

  if (organizationId) query = query.eq('organization_id', organizationId)

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (propertyId || propertyIds?.length) {
    // primary_guest_id now lives on reservations, which already carry their
    // own property_id — no need to join through stays.
    let reservationsQuery = supabase
      .from('reservations')
      .select('primary_guest_id')

    if (organizationId) reservationsQuery = reservationsQuery.eq('organization_id', organizationId)
    if (propertyId) reservationsQuery = reservationsQuery.eq('property_id', propertyId)
    else if (propertyIds?.length) reservationsQuery = reservationsQuery.in('property_id', propertyIds)

    const { data: reservations, error: reservationsError } = await reservationsQuery

    if (reservationsError) throw new Error(reservationsError.message)

    const guestIds = Array.from(
      new Set((reservations ?? []).map((reservation) => reservation.primary_guest_id).filter(Boolean)),
    )

    if (guestIds.length === 0) {
      return []
    }

    query = query.in('id', guestIds)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
