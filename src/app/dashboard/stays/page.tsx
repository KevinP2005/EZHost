import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { StaysList } from '@/components/stays/stays-list'
import { getPropertyScope, getScopePropertyIds, hasPropertyScope } from '@/lib/services/properties'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Stays' }

interface Props {
  searchParams: Promise<{ status?: string; property?: string }>
}

export default async function StaysPage({ searchParams }: Props) {
  const profile = await requireAuth()
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasPropertyScope(scope)) {
    return <p className="text-muted-foreground text-sm">Select an accommodation to view stays.</p>
  }

  const supabase = await createClient()

  let query = supabase
    .from('stays')
    .select(`
      *,
      units(name, unit_type),
      properties(name),
      guests!primary_guest_id(first_name, last_name)
    `)
    .order('check_in_date', { ascending: false })
    .limit(100)

  if (scope.organizationId) query = query.eq('organization_id', scope.organizationId)
  if (params.status) query = query.eq('status', params.status)
  if (scope.propertyId) query = query.eq('property_id', scope.propertyId)
  else {
    const propertyIds = getScopePropertyIds(scope)
    if (propertyIds.length > 0) query = query.in('property_id', propertyIds)
  }

  const { data: stays } = await query

  return (
    <StaysList
      stays={stays ?? []}
      properties={scope.properties}
      currentFilters={params}
      canEdit={['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'].includes(profile.role)}
    />
  )
}
