import type { Metadata } from 'next'
import { Users } from 'lucide-react'

import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'All Users' }

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  ORG_ADMIN: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  MANAGER: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  RECEPTION: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  HOUSEKEEPING: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  KITCHEN: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  READ_ONLY: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  INACTIVE: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  INVITED: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
}

interface AdminUsersPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
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
    .from('profiles')
    .select('*, organizations(name)')
    .order('name')
    .limit(500)

  if (selectedPropertyId && selectedProperty) {
    query = query.eq('organization_id', selectedProperty.organization_id)
  }

  const { data: users } = await query

  const rows = users ?? []

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">
            Super Admin
          </p>
          <h1 className="mt-1 text-[22px] font-bold text-foreground">
            Users
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspect platform users, tenant membership, roles, and status.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            No users yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            User accounts will appear here after signup or invitation.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Organization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((user: any) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/35">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {user.name || 'Unnamed user'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.organizations?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          roleColors[user.role] ?? roleColors.READ_ONLY
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          statusColors[user.status] ?? statusColors.INACTIVE
                        }`}
                      >
                        {user.status}
                      </span>
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
