import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPropertyScope, getScopePropertyIds, hasOperationalScope } from '@/lib/services/properties'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Guest Details' }

interface Props {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  BOOKED: 'bg-blue-50 text-blue-700',
  CHECKED_IN: 'bg-green-50 text-green-700',
  CHECKED_OUT: 'bg-gray-50 text-gray-500',
  CANCELLED: 'bg-red-50 text-red-600',
  NO_SHOW: 'bg-orange-50 text-orange-600',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 text-sm">
      <p className="text-muted-foreground w-32 shrink-0">{label}</p>
      <p>{value ?? <span className="text-muted-foreground/40">—</span>}</p>
    </div>
  )
}

export default async function GuestDetailPage({ params }: Props) {
  const profile = await requireAuth()
  const { id } = await params
  const supabase = await createClient()
  const scope = await getPropertyScope(profile)

  let guestQuery = supabase
    .from('guests')
    .select('*')
    .eq('id', id)

  if (profile.role !== 'SUPER_ADMIN') {
    if (!hasOperationalScope(scope)) notFound()
    guestQuery = guestQuery.eq('organization_id', scope.organizationId)
  }

  const { data: guest } = await guestQuery.single()

  if (!guest) notFound()

  let staysQuery = supabase
    .from('stays')
    .select('id, check_in_date, check_out_date, status, units(name), properties(name)')
    .eq('primary_guest_id', id)
    .order('check_in_date', { ascending: false })
    .limit(20)

  if (scope?.propertyId) {
    staysQuery = staysQuery.eq('property_id', scope.propertyId)
  } else if (scope && getScopePropertyIds(scope).length > 0) {
    staysQuery = staysQuery.in('property_id', getScopePropertyIds(scope))
  }

  const { data: stays } = await staysQuery

  if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(profile.role) && (!stays || stays.length === 0)) {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/guests">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Guests
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{guest.first_name} {guest.last_name}</h1>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <InfoRow label="Full Name" value={`${guest.first_name} ${guest.last_name}`} />
          <InfoRow label="Email" value={guest.email} />
          <InfoRow label="Phone" value={guest.phone} />
          <InfoRow label="Nationality" value={guest.nationality} />
          <InfoRow label="Date of Birth" value={guest.date_of_birth ? format(parseISO(guest.date_of_birth), 'd MMMM yyyy') : null} />
          <InfoRow label="Address" value={guest.address} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Identity Document</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <InfoRow label="Document Type" value={guest.document_type} />
          <InfoRow label="Document Number" value={guest.document_number} />
        </CardContent>
      </Card>

      {stays && stays.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stays</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">Unit</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Check-in</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Check-out</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(stays as any[]).map((stay) => (
                  <tr key={stay.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{stay.units?.name ?? '—'}</td>
                    <td className="py-2 text-muted-foreground">{format(parseISO(stay.check_in_date), 'd MMM yyyy')}</td>
                    <td className="py-2 text-muted-foreground">{format(parseISO(stay.check_out_date), 'd MMM yyyy')}</td>
                    <td className="py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[stay.status] ?? 'bg-gray-50'}`}>
                        {stay.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
