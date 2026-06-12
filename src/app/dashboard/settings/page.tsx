import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { SettingsView } from '@/components/settings/settings-view'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const profile = await requireRole(['SUPER_ADMIN', 'ORG_ADMIN'])
  const supabase = await createClient()

  if (!profile.organization_id) {
    return <p className="text-muted-foreground text-sm">Select an organization context to manage settings.</p>
  }

  const [{ data: org }, { data: properties }, { data: teamMembers }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single(),
    supabase.from('properties').select('*').eq('organization_id', profile.organization_id),
    supabase.from('profiles').select('id, name, email, role, status').eq('organization_id', profile.organization_id).order('name'),
  ])

  return (
    <SettingsView
      organization={org}
      properties={properties ?? []}
      teamMembers={teamMembers ?? []}
    />
  )
}
