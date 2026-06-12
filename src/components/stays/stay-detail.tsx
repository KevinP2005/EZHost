'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const statusColors: Record<string, string> = {
  BOOKED: 'bg-blue-50 text-blue-700',
  CHECKED_IN: 'bg-green-50 text-green-700',
  CHECKED_OUT: 'bg-gray-50 text-gray-500',
  CANCELLED: 'bg-red-50 text-red-600',
  NO_SHOW: 'bg-orange-50 text-orange-600',
}

const regColors: Record<string, string> = {
  MISSING: 'bg-red-50 text-red-600',
  PARTIAL: 'bg-yellow-50 text-yellow-600',
  COMPLETE: 'bg-green-50 text-green-600',
  NOT_REQUIRED: 'bg-gray-50 text-gray-500',
}

interface Props {
  stay: any
  stayGuests: any[]
  notes: any[]
  canEdit: boolean
}

export function StayDetail({ stay, stayGuests, notes, canEdit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function updateStatus(action: 'check_in' | 'check_out') {
    const res = await fetch(`/api/stays/${stay.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast.success(action === 'check_in' ? 'Checked in' : 'Checked out')
      startTransition(() => router.refresh())
    } else {
      toast.error('Failed to update status')
    }
  }

  async function updateRegistration(status: string) {
    const res = await fetch(`/api/stays/${stay.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_registration', registration_status: status }),
    })
    if (res.ok) {
      toast.success('Registration status updated')
      startTransition(() => router.refresh())
    } else {
      toast.error('Failed to update')
    }
  }

  const guest = stay.guests
  const nights = Math.round(
    (new Date(stay.check_out_date).getTime() - new Date(stay.check_in_date).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/stays">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Stays
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">
          {guest ? `${guest.first_name} ${guest.last_name}` : 'Stay Details'}
        </h1>
        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[stay.status] ?? 'bg-gray-50'}`}>
          {stay.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stay Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="Unit" value={stay.units?.name} />
            <Row label="Property" value={stay.properties?.name} />
            <Row label="Check-in" value={format(parseISO(stay.check_in_date), 'd MMMM yyyy')} />
            <Row label="Check-out" value={format(parseISO(stay.check_out_date), 'd MMMM yyyy')} />
            <Row label="Nights" value={`${nights} night${nights !== 1 ? 's' : ''}`} />
            <Row label="Guests" value={`${stay.adults} adults${stay.children > 0 ? `, ${stay.children} children` : ''}`} />
            <Row label="Source" value={stay.source} />
            {stay.external_reference && <Row label="Reference" value={stay.external_reference} />}
            {stay.arrival_time && <Row label="ETA" value={stay.arrival_time.slice(0, 5)} />}
            {stay.departure_time && <Row label="ETD" value={stay.departure_time.slice(0, 5)} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Primary Guest</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {guest ? (
              <>
                <Row label="Name" value={`${guest.first_name} ${guest.last_name}`} />
                <Row label="Email" value={guest.email} />
                <Row label="Phone" value={guest.phone} />
                <Row label="Nationality" value={guest.nationality} />
                <Row label="Date of birth" value={guest.date_of_birth ? format(parseISO(guest.date_of_birth), 'd MMM yyyy') : null} />
                <Row label="Document" value={guest.document_type ? `${guest.document_type}: ${guest.document_number ?? '—'}` : null} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No primary guest assigned.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Services</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="Breakfast" value={stay.breakfast_included ? `Yes (${stay.breakfast_count_adults} adults, ${stay.breakfast_count_children} children)` : 'No'} />
            <Row label="Local tax" value={stay.local_tax_applicable ? (stay.local_tax_amount ? `€${stay.local_tax_amount}` : 'Applicable') : 'Not applicable'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Registration</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded ${regColors[stay.registration_status]}`}>
                {stay.registration_status.replace('_', ' ')}
              </span>
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                {['MISSING', 'PARTIAL', 'COMPLETE', 'NOT_REQUIRED']
                  .filter((s) => s !== stay.registration_status)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => updateRegistration(s)}
                      className={`text-xs px-2 py-1 rounded border ${regColors[s]} hover:opacity-80 border-current/20`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canEdit && (
        <div className="flex gap-2">
          {stay.status === 'BOOKED' && (
            <Button onClick={() => updateStatus('check_in')} disabled={isPending}>
              Check In
            </Button>
          )}
          {stay.status === 'CHECKED_IN' && (
            <Button variant="outline" onClick={() => updateStatus('check_out')} disabled={isPending}>
              Check Out
            </Button>
          )}
        </div>
      )}

      {stay.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Guest Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{stay.notes}</p>
          </CardContent>
        </Card>
      )}

      {notes.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Operational Notes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notes.map((note: any) => (
              <div key={note.id} className="flex items-start justify-between gap-2 text-sm border-b pb-2 last:border-0">
                <p>{note.note}</p>
                <span className="text-xs text-muted-foreground shrink-0">{note.profiles?.name ?? '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 text-sm">
      <p className="text-muted-foreground w-28 shrink-0">{label}</p>
      <p>{value ?? <span className="text-muted-foreground/40">—</span>}</p>
    </div>
  )
}
