import type { Metadata } from 'next'
import {
  Activity,
  Building2,
  Hotel,
  Users,
  UserCheck,
} from 'lucide-react'

import { getActivityLogs } from '@/lib/services/activity'
import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Platform Admin' }

const statIcons = {
  Organizations: Building2,
  Properties: Hotel,
  Users,
  'Active Stays': UserCheck,
}

interface AdminPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireSuperAdmin()
  const supabase = await createClient()
  const params = await searchParams
  const selectedPropertyId = params.property
  const { data: selectedProperty } = selectedPropertyId
    ? await supabase
        .from('properties')
        .select('id, organization_id, name')
        .eq('id', selectedPropertyId)
        .maybeSingle()
    : { data: null }
  const scopedOrganizationId = selectedProperty?.organization_id ?? null

  let orgsQuery = supabase
    .from('organizations')
    .select('id', { count: 'exact', head: true })
  let propertiesQuery = supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
  let usersQuery = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
  let activeStaysQuery = supabase
    .from('stays')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'CHECKED_IN')

  if (selectedPropertyId && selectedProperty) {
    orgsQuery = orgsQuery.eq('id', selectedProperty.organization_id)
    propertiesQuery = propertiesQuery.eq('id', selectedProperty.id)
    usersQuery = usersQuery.eq('organization_id', selectedProperty.organization_id)
    activeStaysQuery = activeStaysQuery.eq('property_id', selectedProperty.id)
  }

  const [
    { count: orgsCount },
    { count: propertiesCount },
    { count: usersCount },
    { count: activeStaysCount },
    recentActivity,
  ] = await Promise.all([
    orgsQuery,
    propertiesQuery,
    usersQuery,
    activeStaysQuery,
    getActivityLogs(selectedPropertyId ? scopedOrganizationId : null, {
      limit: 20,
      propertyId: selectedPropertyId && selectedProperty ? selectedProperty.id : undefined,
    }),
  ])

  const stats = [
    { label: 'Organizations', value: orgsCount ?? 0 },
    { label: 'Properties', value: propertiesCount ?? 0 },
    { label: 'Users', value: usersCount ?? 0 },
    { label: 'Active Stays', value: activeStaysCount ?? 0 },
  ]

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">
          Super Admin
        </p>
        <h1 className="mt-1 text-[22px] font-bold text-foreground">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedProperty
            ? `Monitor platform data for ${selectedProperty.name}.`
            : 'Monitor tenant health, users, properties, and recent platform activity.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const StatIcon = statIcons[stat.label as keyof typeof statIcons]

          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <StatIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Recent Activity
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedProperty
                ? `Latest events for ${selectedProperty.name}.`
                : 'Latest platform events across all organizations.'}
            </p>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            No activity yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {recentActivity.map((log: any) => (
              <div
                key={log.id}
                className="flex flex-col gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {log.action}
                    </span>
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {log.entity_type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.profiles?.name ? `by ${log.profiles.name}` : 'System event'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString('de-AT')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
