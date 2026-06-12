'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { FileWarning, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  missing: any[]
  partial: any[]
  complete: any[]
  canEdit: boolean
}

export function RegistrationOverview({ missing, partial, complete, canEdit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function updateStatus(stayId: string, status: string) {
    const res = await fetch(`/api/stays/${stayId}`, {
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

  function StayCard({ stay, showActions }: { stay: any; showActions: boolean }) {
    const guest = (stay as any).guests
    const hasDoc = guest?.document_type && guest?.document_number
    const hasDOB = guest?.date_of_birth
    const hasNat = guest?.nationality
    const missing = !hasDoc || !hasDOB || !hasNat

    return (
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">
                {guest ? `${guest.first_name} ${guest.last_name}` : 'Guest not assigned'}
              </p>
              <p className="text-xs text-muted-foreground">
                {(stay as any).units?.name ?? '—'} ·{' '}
                {format(parseISO(stay.check_in_date), 'd MMM')} → {format(parseISO(stay.check_out_date), 'd MMM')}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                <Field label="Nationality" ok={!!hasNat} />
                <Field label="Document" ok={!!hasDoc} />
                <Field label="Date of birth" ok={!!hasDOB} />
                {stay.local_tax_applicable && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Local tax: {stay.local_tax_amount ? `€${stay.local_tax_amount}` : 'pending'}
                  </span>
                )}
              </div>
            </div>
            {canEdit && showActions && (
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => updateStatus(stay.id, 'PARTIAL')}
                  className="text-xs px-2 py-1 rounded border bg-yellow-50 text-yellow-700 border-yellow-200 hover:opacity-80"
                >
                  Mark Partial
                </button>
                <button
                  onClick={() => updateStatus(stay.id, 'COMPLETE')}
                  className="text-xs px-2 py-1 rounded border bg-green-50 text-green-700 border-green-200 hover:opacity-80"
                >
                  Mark Complete
                </button>
              </div>
            )}
            {canEdit && !showActions && stay.registration_status !== 'COMPLETE' && (
              <button
                onClick={() => updateStatus(stay.id, 'COMPLETE')}
                className="text-xs px-2 py-1 rounded border bg-green-50 text-green-700 border-green-200 hover:opacity-80 shrink-0"
              >
                Mark Complete
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Guest Registration</h1>
        <p className="text-sm text-muted-foreground">Track registration status and local tax for active stays.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-red-50 border-red-100">
          <CardContent className="pt-3 pb-3 text-center">
            <FileWarning className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700">{missing.length}</p>
            <p className="text-xs text-red-600">Missing</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="pt-3 pb-3 text-center">
            <AlertCircle className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-700">{partial.length}</p>
            <p className="text-xs text-yellow-600">Partial</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-3 pb-3 text-center">
            <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{complete.length}</p>
            <p className="text-xs text-green-600">Complete</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="missing">
        <TabsList>
          <TabsTrigger value="missing">Missing ({missing.length})</TabsTrigger>
          <TabsTrigger value="partial">Partial ({partial.length})</TabsTrigger>
          <TabsTrigger value="complete">Complete ({complete.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="missing" className="mt-4 space-y-2">
          {missing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stays with missing registration.</p>
          ) : (
            missing.map((s) => <StayCard key={s.id} stay={s} showActions={true} />)
          )}
        </TabsContent>

        <TabsContent value="partial" className="mt-4 space-y-2">
          {partial.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stays with partial registration.</p>
          ) : (
            partial.map((s) => <StayCard key={s.id} stay={s} showActions={false} />)
          )}
        </TabsContent>

        <TabsContent value="complete" className="mt-4 space-y-2">
          {complete.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed registrations.</p>
          ) : (
            complete.map((s) => <StayCard key={s.id} stay={s} showActions={false} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${ok ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}
