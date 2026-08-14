'use client'

import { useState, useTransition } from 'react'
import { Banknote, CreditCard, Eye, Info, LoaderCircle, MoreVertical, Printer } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatMoney } from '@/lib/utils'
import { StatusBadge, housekeepingTone } from './status-badge'

/**
 * Left-column "Status" tab: customers with their balance, the assigned units
 * of the currently selected stay(s), and the cancellation form. Everything
 * stay-specific here reacts to `selectedStays` — the same selection driving
 * the reservation column on the right — instead of a single fixed stay.
 */

const CANCELLATION_REASONS = [
  { value: 'NO_SHOW', label: 'No show' },
  { value: 'GUEST_REQUEST', label: 'Guest request' },
  { value: 'DUPLICATE', label: 'Duplicate reservation' },
  { value: 'OVERBOOKING', label: 'Overbooking' },
] as const

function housekeepingLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll('_', ' ')
}

function isTerminal(status: string) {
  return status === 'CANCELLED' || status === 'NO_SHOW'
}

interface Props {
  /** The reservation-level context (guest, currency, reservation_number, ...). */
  stay: any
  /** Currently selected stay(s) — drives Units, actions and cancellation scope. */
  selectedStays: any[]
  /** Every stay of the reservation — the denominator for the cancellation scope. */
  allStays: any[]
  canEdit: boolean
  onUpdated: () => void
}

export function StatusTab({ stay, selectedStays, allStays, canEdit, onUpdated }: Props) {
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState<string>('NO_SHOW')
  const [details, setDetails] = useState('')
  const [applyFee, setApplyFee] = useState(true)
  const [notifyGuest, setNotifyGuest] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const currency: string = stay.currency ?? 'EUR'
  const guest = stay.guests

  async function patchStay(stayId: string, body: Record<string, unknown>, successMessage: string, busyKey: string) {
    setBusyId(busyKey)
    try {
      const res = await fetch(`/api/stays/${stayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error ?? 'Update failed.')
      toast.success(successMessage)
      onUpdated()
      startTransition(() => undefined)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed.')
    } finally {
      setBusyId(null)
    }
  }

  const customers = [
    guest ? { id: guest.id, name: `${guest.first_name} ${guest.last_name}`.trim(), amount: stay.total_amount } : null,
  ].filter(Boolean) as Array<{ id: string; name: string; amount: number | null }>

  // ── Cancellation scope: derived purely from the selection, per the spec ────
  const totalCount = allStays.length
  const selectedCount = selectedStays.length
  const scope: 'none' | 'stay' | 'stays' | 'reservation' =
    selectedCount === 0 ? 'none'
      : selectedCount === 1 ? 'stay'
      : selectedCount === totalCount ? 'reservation'
      : 'stays'

  const cancelLabel = scope === 'reservation' ? 'Cancel Reservation' : scope === 'stays' ? 'Cancel Stays' : 'Cancel Stay'
  const dialogTitle = cancelLabel

  // Stays that would actually change status — already-terminal ones are left alone.
  const activeSelectedStays = selectedStays.filter((row) => !isTerminal(row.status))
  const allSelectedAlreadyCancelled = selectedCount > 0 && activeSelectedStays.length === 0

  function stayLine(row: any) {
    const room = row.units?.name ?? row.room_label ?? '—'
    return `${row.stay_number ?? row.id} · ${room}`
  }

  async function confirmCancellation() {
    setConfirmOpen(false)

    if (scope === 'stay') {
      const target = activeSelectedStays[0]
      if (!target) return
      await patchStay(
        target.id,
        { action: 'cancel', cancellation_reason: reason, cancellation_details: details || undefined, apply_fee: applyFee, notify_guest: notifyGuest },
        'Stay cancelled',
        'cancel',
      )
      return
    }

    if (scope === 'stays') {
      await patchStay(
        stay.id,
        {
          action: 'cancel',
          scope: 'stays',
          stay_ids: activeSelectedStays.map((row) => row.id),
          cancellation_reason: reason,
          cancellation_details: details || undefined,
          apply_fee: applyFee,
          notify_guest: notifyGuest,
        },
        'Stays cancelled',
        'cancel',
      )
      return
    }

    // scope === 'reservation'
    await patchStay(
      stay.id,
      {
        action: 'cancel',
        scope: 'reservation',
        cancellation_reason: reason,
        cancellation_details: details || undefined,
        apply_fee: applyFee,
        notify_guest: notifyGuest,
      },
      'Reservation cancelled',
      'cancel',
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Customers */}
      <Section
        title="Customers"
        action={
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[11px]">
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Registration Forms
          </Button>
        }
      >
        <div className="w-full">
          <div className="grid min-h-[29px] grid-cols-[1.3fr_0.95fr_1.3fr] items-center gap-2.5 px-2.5 text-[10px] font-semibold text-muted-foreground">
            <span>Customer</span>
            <span>Balance</span>
            <span>Actions</span>
          </div>

          {customers.length === 0 && (
            <p className="border-t border-border px-2.5 py-3 text-xs text-muted-foreground">
              No primary guest assigned.
            </p>
          )}

          {customers.map((customer) => (
            <div
              key={customer.id}
              className="grid min-h-[38px] grid-cols-[1.3fr_0.95fr_1.3fr] items-center gap-2.5 border-t border-border px-2.5 text-xs"
            >
              <span className="truncate">{customer.name}</span>
              <span>{formatMoney(customer.amount, currency)}</span>
              <span className="flex items-center gap-1">
                <Button size="sm" className="h-6 gap-1.5 px-2 text-[11px]">
                  <Banknote className="h-3 w-3" aria-hidden />
                  Billing
                </Button>
                <Button variant="outline" size="sm" className="h-6 gap-1.5 px-2 text-[11px]">
                  <CreditCard className="h-3 w-3" aria-hidden />
                  Payment
                </Button>
              </span>
            </div>
          ))}

          <div className="grid min-h-10 grid-cols-[1.3fr_0.95fr_1.3fr] items-center gap-2.5 border-t border-border px-2.5 text-[11px] font-semibold">
            <span>Total</span>
            <span>{formatMoney(stay.total_amount, currency)}</span>
            <span />
          </div>
        </div>
      </Section>

      {/* Units — one row per currently selected stay */}
      <Section title="Units">
        <div className="w-full">
          <div className="grid min-h-[29px] grid-cols-[1.4fr_0.72fr_1fr_1.25fr] items-center gap-2.5 px-2.5 text-[10px] font-semibold text-muted-foreground">
            <span>Guest</span>
            <span>Unit</span>
            <span>Housekeeping status</span>
            <span />
          </div>

          {selectedStays.length === 0 && (
            <p className="border-t border-border px-2.5 py-3 text-xs text-muted-foreground">
              Select a stay in the reservation list to see its unit.
            </p>
          )}

          {selectedStays.map((row) => (
            <div
              key={row.id}
              className="grid min-h-[38px] grid-cols-[1.4fr_0.72fr_1fr_1.25fr] items-center gap-2.5 border-t border-border px-2.5 text-xs"
            >
              <span className="truncate">
                {guest ? `${guest.first_name} ${guest.last_name}`.trim() : '—'}
                {selectedStays.length > 1 && (
                  <span className="ml-1.5 text-muted-foreground">· {row.stay_number}</span>
                )}
              </span>
              <span>{row.units?.name ?? row.room_label ?? '—'}</span>
              <span>
                {row.units?.housekeeping_status ? (
                  <StatusBadge
                    label={housekeepingLabel(row.units.housekeeping_status)}
                    tone={housekeepingTone(row.units.housekeeping_status)}
                  />
                ) : (
                  '—'
                )}
              </span>
              <span className="flex items-center justify-end gap-1.5">
                <MoreVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                  aria-label="Unit info"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </button>
                {canEdit && row.status === 'BOOKED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    disabled={busyId !== null || isPending}
                    onClick={() => patchStay(row.id, { action: 'check_in' }, 'Checked in', `check_in:${row.id}`)}
                  >
                    {busyId === `check_in:${row.id}` ? (
                      <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden />
                    ) : (
                      'Check in'
                    )}
                  </Button>
                )}
                {canEdit && row.status === 'CHECKED_IN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    disabled={busyId !== null || isPending}
                    onClick={() => patchStay(row.id, { action: 'check_out' }, 'Checked out', `check_out:${row.id}`)}
                  >
                    {busyId === `check_out:${row.id}` ? (
                      <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden />
                    ) : (
                      'Check out'
                    )}
                  </Button>
                )}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Cancellation */}
      <Section title="Cancellation">
        {selectedCount === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            Select a stay in the reservation list to cancel it.
          </p>
        ) : allSelectedAlreadyCancelled ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            {selectedCount === 1
              ? `This stay is already ${selectedStays[0].status === 'NO_SHOW' ? 'marked as no show' : 'cancelled'}.`
              : 'The selected stays are already cancelled.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3 px-1 pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground">Reason *</Label>
              <Select value={reason} onValueChange={(value) => value && setReason(value)}>
                <SelectTrigger className="h-7 w-full text-xs">
                  <SelectValue>
                    {CANCELLATION_REASONS.find((option) => option.value === reason)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground">Details</Label>
              <Input
                className="h-7 text-xs"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Checkbox
                id="cancellation-fee"
                checked={applyFee}
                onCheckedChange={(value) => setApplyFee(Boolean(value))}
              />
              <Label htmlFor="cancellation-fee" className="text-[11px] font-normal">
                Apply cancellation fee
              </Label>
              <button
                type="button"
                className="ml-1 inline-flex items-center gap-1.5 text-[11px] underline underline-offset-2 hover:text-foreground"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden />
                View policies
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Checkbox
                id="cancellation-notify"
                checked={notifyGuest}
                onCheckedChange={(value) => setNotifyGuest(Boolean(value))}
              />
              <Label htmlFor="cancellation-notify" className="text-[11px] font-normal">
                Send email to customer and booker
              </Label>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] text-destructive hover:text-destructive"
                disabled={!canEdit || busyId !== null || isPending}
                onClick={() => setConfirmOpen(true)}
              >
                {busyId === 'cancel' ? (
                  <LoaderCircle className="mr-1.5 h-3 w-3 animate-spin" aria-hidden />
                ) : null}
                {cancelLabel}
              </Button>
            </div>
          </div>
        )}
      </Section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {scope === 'stay' &&
                'You are about to cancel this stay. The remaining stays in this reservation will not be affected.'}
              {scope === 'stays' &&
                `You are about to cancel ${activeSelectedStays.length} stays. Other stays in this reservation will remain active.`}
              {scope === 'reservation' &&
                'You are about to cancel the entire reservation. All stays associated with this reservation will be cancelled.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 px-4 text-left text-sm font-medium text-foreground">
            {scope === 'stay' && activeSelectedStays[0] && <p>{stayLine(activeSelectedStays[0])}</p>}
            {scope === 'stays' && (
              <ul className="list-inside list-disc space-y-0.5">
                {activeSelectedStays.map((row) => (
                  <li key={row.id}>{stayLine(row)}</li>
                ))}
              </ul>
            )}
            {scope === 'reservation' && (
              <p>
                {stay.reservation_number} · {activeSelectedStays.length}{' '}
                {activeSelectedStays.length === 1 ? 'stay' : 'stays'} affected
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmCancellation}
            >
              Confirm cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Section({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-border bg-card p-2.5">
      <div className="flex min-h-7 items-start justify-between px-px">
        <h2 className="text-[15px] leading-5 font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
