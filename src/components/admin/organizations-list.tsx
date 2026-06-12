import { Building2 } from 'lucide-react'

const statusColors: Record<string, string> = {
  ACTIVE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  TRIAL: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  INACTIVE: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
}

export function AdminOrganizationsList({ organizations }: { organizations: any[] }) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">
            Super Admin
          </p>
          <h1 className="mt-1 text-[22px] font-bold text-foreground">
            Organizations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review tenant accounts, regions, and subscription status.
          </p>
        </div>
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            No organizations yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            New tenants will appear here once they are created.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Country
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((org) => (
                  <tr key={org.id} className="transition-colors hover:bg-muted/35">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {org.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {org.email ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {org.country ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          statusColors[org.status] ?? statusColors.INACTIVE
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(org.created_at).toLocaleDateString('de-AT')}
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
