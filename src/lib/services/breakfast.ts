import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/services/activity'
import type { BreakfastItem } from '@/lib/database.types'
import { z } from 'zod'

export const upsertBreakfastSchema = z.object({
  property_id: z.string().uuid(),
  stay_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
  date: z.string(),
  adults_count: z.number().int().min(0),
  children_count: z.number().int().min(0),
  breakfast_type: z.string().optional(),
  allergies: z.string().optional(),
  special_requests: z.string().optional(),
  notes: z.string().optional(),
})

export type UpsertBreakfastInput = z.infer<typeof upsertBreakfastSchema>

export async function upsertBreakfastItem(
  organizationId: string,
  profileId: string,
  input: UpsertBreakfastInput
): Promise<BreakfastItem> {
  const supabase = await createClient()

  let query = supabase.from('breakfast_items').select('id').eq('organization_id', organizationId).eq('date', input.date)
  if (input.stay_id) query = query.eq('stay_id', input.stay_id)

  const { data: existing } = await query.single()

  let result
  if (existing) {
    const { data, error } = await supabase
      .from('breakfast_items')
      .update({ ...input, status: 'PLANNED' })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  } else {
    const { data, error } = await supabase
      .from('breakfast_items')
      .insert({ ...input, organization_id: organizationId, status: 'PLANNED' })
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  }

  await createActivityLog(organizationId, profileId, 'breakfast_item_updated', 'breakfast_item', result.id, undefined, result.property_id)
  return result
}

export async function getBreakfastList(
  organizationId: string | null,
  date: string,
  propertyId?: string,
  propertyIds?: string[]
) {
  const supabase = await createClient()

  let query = supabase
    .from('breakfast_items')
    .select(`
      *,
      units(name),
      properties(name),
      stays(check_in_date, check_out_date, adults, children, guests!primary_guest_id(first_name, last_name))
    `)
    .eq('date', date)
    .not('status', 'eq', 'CANCELLED')
    .order('units(name)', { ascending: true })

  if (organizationId) query = query.eq('organization_id', organizationId)
  if (propertyId) query = query.eq('property_id', propertyId)
  else if (propertyIds?.length) query = query.in('property_id', propertyIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const items = data ?? []
  const totalAdults = items.reduce((s, i) => s + i.adults_count, 0)
  const totalChildren = items.reduce((s, i) => s + i.children_count, 0)
  const withAllergies = items.filter((i) => i.allergies)
  const withRequests = items.filter((i) => i.special_requests)

  return { items, totalAdults, totalChildren, withAllergies, withRequests }
}

export async function generateBreakfastListFromStays(
  organizationId: string,
  profileId: string,
  date: string,
  propertyId?: string
): Promise<number> {
  const supabase = await createClient()

  let query = supabase
    .from('stays')
    .select('*, units(id, name)')
    .eq('organization_id', organizationId)
    .eq('breakfast_included', true)
    .lte('check_in_date', date)
    .gt('check_out_date', date)
    .not('status', 'in', '("CANCELLED","NO_SHOW","CHECKED_OUT")')

  if (propertyId) query = query.eq('property_id', propertyId)

  const { data: stays } = await query

  if (!stays?.length) return 0

  let created = 0
  for (const stay of stays) {
    const existing = await supabase
      .from('breakfast_items')
      .select('id')
      .eq('stay_id', stay.id)
      .eq('date', date)
      .single()

    if (!existing.data) {
      await supabase.from('breakfast_items').insert({
        organization_id: organizationId,
        property_id: stay.property_id,
        stay_id: stay.id,
        unit_id: stay.unit_id,
        date,
        adults_count: stay.breakfast_count_adults || stay.adults,
        children_count: stay.breakfast_count_children || stay.children,
        status: 'PLANNED',
      })
      created++
    }
  }

  if (created > 0) {
    await createActivityLog(organizationId, profileId, 'breakfast_list_generated', 'breakfast', undefined, {
      date,
      count: created,
    }, propertyId ?? null)
  }

  return created
}
