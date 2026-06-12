import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminOrganizationsList } from '@/components/admin/organizations-list'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Organizations' }

interface AdminOrganizationsPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function AdminOrganizationsPage({
  searchParams,
}: AdminOrganizationsPageProps) {
  await requireSuperAdmin()
  const supabase = await createClient()
  const params = await searchParams
  const selectedPropertyId = params.property
  const { data: selectedProperty } = selectedPropertyId
    ? await supabase
        .from('properties')
        .select('id, organization_id')
        .eq('id', selectedPropertyId)
        .maybeSingle()
    : { data: null }

  let query = supabase
    .from('organizations')
    .select('*')
    .order('name')

  if (selectedPropertyId && selectedProperty) {
    query = query.eq('id', selectedProperty.organization_id)
  }

  const { data: orgs } = await query

  return <AdminOrganizationsList organizations={orgs ?? []} />
}
