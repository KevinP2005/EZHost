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
  organizationId: string,
  search?: string,
  propertyId?: string,
  propertyIds?: string[]
): Promise<Guest[]> {
  const supabase = await createClient()
  let query = supabase
    .from('guests')
    .select('*')
    .eq('organization_id', organizationId)
    .order('last_name', { ascending: true })

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (propertyId || propertyIds?.length) {
    let staysQuery = supabase
      .from('stays')
      .select('primary_guest_id')
      .eq('organization_id', organizationId)
      .not('primary_guest_id', 'is', null)

    if (propertyId) staysQuery = staysQuery.eq('property_id', propertyId)
    else if (propertyIds?.length) staysQuery = staysQuery.in('property_id', propertyIds)

    const { data: stays, error: staysError } = await staysQuery

    if (staysError) throw new Error(staysError.message)

    const guestIds = Array.from(
      new Set((stays ?? []).map((stay) => stay.primary_guest_id).filter(Boolean)),
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
