import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getPropertyScope, getScopePropertyIds, hasPropertyScope } from '@/lib/services/properties'
import { RegistrationOverview } from '@/components/registration/registration-overview'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Guest Registration' }

interface RegistrationPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function RegistrationPage({ searchParams }: RegistrationPageProps) {
  const profile = await requireAuth()
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasPropertyScope(scope)) return <p className="text-muted-foreground text-sm">Select an accommodation to view registrations.</p>

  const supabase = await createClient()
  let query = supabase
    .from('stays')
    .select(`
      id, check_in_date, check_out_date, status, registration_status, adults, children,
      local_tax_applicable, local_tax_amount,
      units(name),
      properties(name),
      guests!primary_guest_id(first_name, last_name, email, nationality, document_type, document_number, date_of_birth)
    `)
    .eq('booking_status', 'CONFIRMED')
    .in('status', ['BOOKED', 'CHECKED_IN'])
    .order('check_in_date', { ascending: true })
    .limit(200)

  if (scope.organizationId) query = query.eq('organization_id', scope.organizationId)
  if (scope.propertyId) query = query.eq('property_id', scope.propertyId)
  else {
    const propertyIds = getScopePropertyIds(scope)
    if (propertyIds.length > 0) query = query.in('property_id', propertyIds)
  }

  const { data: stays } = await query

  const missing = stays?.filter((s) => s.registration_status === 'MISSING') ?? []
  const partial = stays?.filter((s) => s.registration_status === 'PARTIAL') ?? []
  const complete = stays?.filter((s) => s.registration_status === 'COMPLETE') ?? []

  return (
    <RegistrationOverview
      missing={missing}
      partial={partial}
      complete={complete}
      canEdit={['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'].includes(profile.role)}
    />
  )
}
