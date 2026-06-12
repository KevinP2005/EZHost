import type { Metadata } from 'next'
import { Activity } from 'lucide-react'

import { getActivityLogs } from '@/lib/services/activity'
import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Activity Logs' }

interface AdminActivityPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function AdminActivityPage({ searchParams }: AdminActivityPageProps) {
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
  const logs = await getActivityLogs(
    selectedPropertyId && selectedProperty ? selectedProperty.organization_id : null,
    {
      limit: 200,
      propertyId: selectedPropertyId && selectedProperty ? selectedProperty.id : undefined,
    },
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">
            Super Admin
          </p>
          <h1 className="mt-1 text-[22px] font-bold text-foreground">
            Activity
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit recent platform events across tenants, users, and records.
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
          <Activity className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            No activity yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform audit events will appear here as the system is used.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log: any) => (
                  <tr key={log.id} className="transition-colors hover:bg-muted/35">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.profiles?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('de-AT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
