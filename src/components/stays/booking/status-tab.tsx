'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
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
import { StatusBadge, housekeepingTone } from './status-badge'

/**
 * Left-column "Status" tab: customers with their balance, the assigned units
 * with housekeeping state and check-in action, and the cancellation form.
 */

const CANCELLATION_REASONS = [
  { value: 'NO_SHOW', label: 'No show' },
  { value: 'GUEST_REQUEST', label: 'Guest request' },
  { value: 'DUPLICATE', label: 'Duplicate reservation' },
  { value: 'OVERBOOKING', label: 'Overbooking' },
] as const

function formatMoney(value: number | null | undefined, currency: string) {
  if (value == null) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(value)
}

function housekeepingLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll('_', ' ')
}

interface Props {
  stay: any
  stayGuests: any[]
  canEdit: boolean
  onUpdated: () => void
}

export function StatusTab({ stay, stayGuests, canEdit, onUpdated }: Props) {
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState<string>('NO_SHOW')
  const [details, setDetails] = useState('')
  const [applyFee, setApplyFee] = useState(true)
  const [notifyGuest, setNotifyGuest] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const currency: string = stay.currency ?? 'EUR'
  const guest = stay.guests
  const isCancelled = stay.status === 'CANCELLED' || stay.status === 'NO_SHOW'

  async function patch(body: Record<string, unknown>, successMessage: string, key: string) {
    setBusy(key)
    try {
      const res = await fetch(`/api/stays/${stay.id}`, {
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
      setBusy(null)
    }
  }

  const customers = [
    guest ? { id: guest.id, name: `${guest.first_name} ${guest.last_name}`.trim(), amount: stay.total_amount } : null,
  ].filter(Boolean) as Array<{ id: string; name: string; amount: number | null }>

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

      {/* Units */}
      <Section title="Units">
        <div className="w-full">
          <div className="grid min-h-[29px] grid-cols-[1.4fr_0.72fr_1fr_1.25fr] items-center gap-2.5 px-2.5 text-[10px] font-semibold text-muted-foreground">
            <span>
              {format(parseISO(stay.check_in_date), 'dd.MM.yyyy')} -{' '}
              {format(parseISO(stay.check_out_date), 'dd.MM.yyyy')}
            </span>
            <span>Unit</span>
            <span>Housekeeping status</span>
            <span />
          </div>

          <div className="grid min-h-[38px] grid-cols-[1.4fr_0.72fr_1fr_1.25fr] items-center gap-2.5 border-t border-border px-2.5 text-xs">
            <span className="truncate">
              {guest ? `${guest.first_name} ${guest.last_name}`.trim() : '—'}
            </span>
            <span>{stay.units?.name ?? '—'}</span>
            <span>
              {stay.units?.housekeeping_status ? (
                <StatusBadge
                  label={housekeepingLabel(stay.units.housekeeping_status)}
                  tone={housekeepingTone(stay.units.housekeeping_status)}
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
              {canEdit && stay.status === 'BOOKED' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  disabled={busy !== null || isPending}
                  onClick={() => patch({ action: 'check_in' }, 'Checked in', 'check_in')}
                >
                  {busy === 'check_in' ? <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden /> : 'Check in'}
                </Button>
              )}
              {canEdit && stay.status === 'CHECKED_IN' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  disabled={busy !== null || isPending}
                  onClick={() => patch({ action: 'check_out' }, 'Checked out', 'check_out')}
                >
                  {busy === 'check_out' ? <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden /> : 'Check out'}
                </Button>
              )}
            </span>
          </div>
        </div>
      </Section>

      {/* Cancellation */}
      <Section title="Cancellation">
        {isCancelled ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            This reservation is already {stay.status === 'NO_SHOW' ? 'marked as no show' : 'cancelled'}.
          </p>
        ) : (
          <div className="flex flex-col gap-3 px-1 pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground">Reason *</Label>
              <Select value={reason} onValueChange={(value) => value && setReason(value)}>
                <SelectTrigger className="h-7 w-full text-xs">
                  <SelectValue />
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
                disabled={!canEdit || busy !== null || isPending}
                onClick={() =>
                  patch(
                    {
                      action: 'cancel',
                      cancellation_reason: reason,
                      cancellation_details: details || undefined,
                      apply_fee: applyFee,
                      notify_guest: notifyGuest,
                    },
                    'Reservation cancelled',
                    'cancel',
                  )
                }
              >
                {busy === 'cancel' ? (
                  <LoaderCircle className="mr-1.5 h-3 w-3 animate-spin" aria-hidden />
                ) : null}
                Cancel reservation
              </Button>
            </div>
          </div>
        )}
      </Section>
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
