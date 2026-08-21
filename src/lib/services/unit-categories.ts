import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/services/activity'
import type { UnitCategory } from '@/lib/database.types'
import type { CreateUnitCategoryInput } from '@/lib/schemas/unit-categories'

export { createUnitCategorySchema } from '@/lib/schemas/unit-categories'
export type { CreateUnitCategoryInput } from '@/lib/schemas/unit-categories'

export async function createUnitCategory(
  organizationId: string,
  profileId: string,
  input: CreateUnitCategoryInput
): Promise<UnitCategory> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('unit_categories')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  await createActivityLog(organizationId, profileId, 'unit_category_created', 'unit_category', data.id, undefined, data.property_id)
  return data
}

export async function getUnitCategories(
  organizationId: string | null,
  propertyId?: string,
  propertyIds?: string[]
): Promise<UnitCategory[]> {
  const supabase = await createClient()
  let query = supabase
    .from('unit_categories')
    .select('*')
    .order('name')

  if (organizationId) query = query.eq('organization_id', organizationId)
  if (propertyId) query = query.eq('property_id', propertyId)
  else if (propertyIds?.length) query = query.in('property_id', propertyIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
