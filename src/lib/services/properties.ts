import type { Profile } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

export interface PropertyOption {
  id: string
  name: string
  organization_id: string
}

export interface PropertyScope {
  organizationId: string | null
  propertyId?: string
  properties: PropertyOption[]
  propertyIds: string[]
  requiresPropertyFilter: boolean
}

export function hasAllOrgProperties(profile: Profile) {
  return profile.role === 'SUPER_ADMIN' || profile.role === 'ORG_ADMIN'
}

export async function getAccessibleProperties(profile: Profile): Promise<PropertyOption[]> {
  const supabase = await createClient()
  let query = supabase
    .from('properties')
    .select('id, name, organization_id')
    .eq('active', true)
    .order('name')

  if (profile.role === 'ORG_ADMIN') {
    if (!profile.organization_id) return []
    query = query.eq('organization_id', profile.organization_id)
  } else if (profile.role !== 'SUPER_ADMIN') {
    const { data: accessRows, error } = await supabase
      .from('profile_property_access')
      .select('property_id')
      .eq('profile_id', profile.id)

    if (error) throw new Error(error.message)

    const propertyIds = (accessRows ?? []).map((row) => row.property_id)
    if (propertyIds.length === 0) return []

    query = query.in('id', propertyIds)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return data ?? []
}

export async function getTopBarProperties(profile: Profile) {
  return getAccessibleProperties(profile)
}

export async function resolvePropertyScope(
  profile: Profile,
  requestedPropertyId?: string,
): Promise<PropertyScope | null> {
  const properties = await getAccessibleProperties(profile)

  if (requestedPropertyId && properties.some((property) => property.id === requestedPropertyId)) {
    const selected = properties.find((property) => property.id === requestedPropertyId)!
    return {
      organizationId: selected.organization_id,
      propertyId: selected.id,
      properties,
      propertyIds: [selected.id],
      requiresPropertyFilter: true,
    }
  }

  if (profile.role === 'SUPER_ADMIN') {
    return {
      organizationId: null,
      properties,
      propertyIds: properties.map((property) => property.id),
      requiresPropertyFilter: true,
    }
  }

  if (profile.role === 'ORG_ADMIN' && profile.organization_id) {
    return {
      organizationId: profile.organization_id,
      properties,
      propertyIds: properties.map((property) => property.id),
      requiresPropertyFilter: false,
    }
  }

  if (profile.organization_id && properties.length > 0) {
    return {
      organizationId: profile.organization_id,
      propertyId: properties.length === 1 ? properties[0].id : undefined,
      properties,
      propertyIds: properties.map((property) => property.id),
      requiresPropertyFilter: true,
    }
  }

  return null
}

export async function getPropertyScope(profile: Profile, propertyId?: string) {
  return resolvePropertyScope(profile, propertyId)
}

export async function assertCanAccessProperty(profile: Profile, propertyId: string) {
  const properties = await getAccessibleProperties(profile)
  const property = properties.find((candidate) => candidate.id === propertyId)

  if (!property) {
    throw new Error('Property access denied')
  }

  return property
}

export function hasOperationalScope(scope: PropertyScope | null): scope is PropertyScope & { organizationId: string } {
  return Boolean(scope?.organizationId)
}

export function getScopePropertyIds(scope: PropertyScope) {
  if (scope.propertyId) return [scope.propertyId]
  if (scope.requiresPropertyFilter) return scope.propertyIds
  return []
}
