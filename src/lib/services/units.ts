import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/services/activity'
import type { Unit } from '@/lib/database.types'
import type { CreateUnitInput } from '@/lib/schemas/units'

export { createUnitSchema } from '@/lib/schemas/units'
export type { CreateUnitInput } from '@/lib/schemas/units'

export async function createUnit(organizationId: string, profileId: string, input: CreateUnitInput): Promise<Unit> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('units')
    .insert({
      ...input,
      organization_id: organizationId,
      status: 'ACTIVE',
      housekeeping_status: 'CLEAN',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  await createActivityLog(organizationId, profileId, 'unit_created', 'unit', data.id, undefined, data.property_id)
  return data
}

export async function updateUnit(
  unitId: string,
  organizationId: string,
  profileId: string,
  input: Partial<CreateUnitInput & { status: string }>
): Promise<Unit> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('units')
    .update(input)
    .eq('id', unitId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  await createActivityLog(organizationId, profileId, 'unit_updated', 'unit', unitId, undefined, data.property_id)
  return data
}

export async function getUnits(organizationId: string | null, propertyId?: string, propertyIds?: string[]): Promise<Unit[]> {
  const supabase = await createClient()
  let query = supabase
    .from('units')
    .select('*, properties(name)')
    .order('name')

  if (organizationId) query = query.eq('organization_id', organizationId)
  if (propertyId) query = query.eq('property_id', propertyId)
  else if (propertyIds?.length) query = query.in('property_id', propertyIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
