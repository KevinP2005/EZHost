import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-50 text-purple-700',
  ORG_ADMIN: 'bg-blue-50 text-blue-700',
  MANAGER: 'bg-green-50 text-green-700',
  RECEPTION: 'bg-cyan-50 text-cyan-700',
  HOUSEKEEPING: 'bg-orange-50 text-orange-700',
  KITCHEN: 'bg-amber-50 text-amber-700',
  READ_ONLY: 'bg-gray-50 text-gray-500',
}

interface Props {
  organization: any
  properties: any[]
  teamMembers: any[]
}

export function SettingsView({ organization, properties, teamMembers }: Props) {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-4">
          {organization ? (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Organization Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Row label="Name" value={organization.name} />
                <Row label="Email" value={organization.email} />
                <Row label="Phone" value={organization.phone} />
                <Row label="Address" value={organization.address} />
                <Row label="Country" value={organization.country} />
                <Row label="Status" value={
                  <span className={`text-xs px-1.5 py-0.5 rounded ${organization.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                    {organization.status}
                  </span>
                } />
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">Organization not found.</p>
          )}
        </TabsContent>

        <TabsContent value="properties" className="mt-4">
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No properties configured.</p>
          ) : (
            <div className="space-y-3">
              {properties.map((p) => (
                <Card key={p.id}>
                  <CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{p.name}</p>
                      <div className="flex gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-50 text-gray-600">{p.type}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{[p.address, p.city, p.country].filter(Boolean).join(', ')}</p>
                    <p className="text-xs text-muted-foreground">Timezone: {p.timezone}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[m.role] ?? 'bg-gray-50 text-gray-500'}`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${m.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="registration" className="mt-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">
                Guest registration and local tax settings will be configurable here. This allows you to define required fields for your region (Austria, Germany, Switzerland) and local tax rules.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Full configuration coming in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <p className="text-sm text-muted-foreground w-28 shrink-0">{label}</p>
      <p className="text-sm">{value ?? <span className="text-muted-foreground/50">-</span>}</p>
    </div>
  )
}
