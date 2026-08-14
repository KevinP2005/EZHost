'use client'

import { format, parseISO } from 'date-fns'
import { Eye, FileText, RefreshCw } from 'lucide-react'

import { formatMoney as formatMoneyBase } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadge, housekeepingTone } from './status-badge'

/**
 * Right-column booking details. The row list and its order are taken from the
 * booking overview template unchanged; values are resolved from the stay record
 * where the data model provides them and fall back to an em dash otherwise.
 */

function formatMoney(value: number | null | undefined, currency: string) {
  return value == null ? null : formatMoneyBase(value, currency)
}

function formatDateTime(date: string | null, time: string | null) {
  if (!date) return null
  const parsed = parseISO(date)
  const clock = time ? ` ${time.slice(0, 5)}` : ''
  return `${format(parsed, 'dd.MM.yyyy')}${clock} ${format(parsed, 'EEEE')}`
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(
    0,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000),
  )
}

function unitTypeLabel(unitType: string | null | undefined) {
  if (!unitType) return null
  return unitType.charAt(0) + unitType.slice(1).toLowerCase().replaceAll('_', ' ')
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual entry',
  IMPORT: 'Import',
  PMS: 'PMS',
  OTA: 'Online travel agency',
  OTHER: 'Other',
}

interface Props {
  stay: any
  stayGuests: any[]
}

export function ReservationDetails({ stay, stayGuests }: Props) {
  const guest = stay.guests
  const booker = stay.booker
  const currency: string = stay.currency ?? 'EUR'
  const nights = nightsBetween(stay.check_in_date, stay.check_out_date)

  const bookerName = booker ? `${booker.first_name} ${booker.last_name}`.trim() : null
  const companions = (stayGuests ?? [])
    .filter((row) => !row.is_primary_guest && row.guests)
    .map((row) => `${row.guests.first_name} ${row.guests.last_name}`.trim())

  const avgWithProducts = stay.total_amount != null && nights > 0
    ? stay.total_amount / nights
    : null

  // Per-night breakdown: prefer stored price_details, otherwise derive from the nightly rate.
  const nightRows: Array<{ date: string; amount: number | null }> = Array.isArray(stay.price_details)
    ? stay.price_details
        .filter((entry: any) => entry && entry.date)
        .map((entry: any) => ({ date: entry.date, amount: entry.amount ?? entry.rate ?? null }))
    : Array.from({ length: nights }, (_, index) => {
        const date = new Date(stay.check_in_date)
        date.setDate(date.getDate() + index)
        return { date: date.toISOString().slice(0, 10), amount: stay.nightly_rate ?? null }
      })

  return (
    <div className="border-t border-border py-3 pl-8 pr-3">
      <Row label="Service">Stay</Row>
      <Row label="Booking Reference">{stay.reservation_number}</Row>
      <Row label="Status">
        <StatusBadge status={stay.status} />
      </Row>
      <Row label="Booker">
        {bookerName ? (
          <span className="inline-flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Registration"
                    className="text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Registration</TooltipContent>
            </Tooltip>

            <span className="underline underline-offset-2">{bookerName}</span>

            <Tooltip>
              <TooltipTrigger render={<span className="text-muted-foreground" />}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Returning</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Billing"
                    className="text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Billing</TooltipContent>
            </Tooltip>
          </span>
        ) : null}
      </Row>
      <Row label="Arrival">{formatDateTime(stay.check_in_date, stay.arrival_time)}</Row>
      <Row label="Departure">{formatDateTime(stay.check_out_date, stay.departure_time)}</Row>
      <Row label="Reservation purpose">{null}</Row>
      <Row label="Segment">{null}</Row>
      <Row label="Companions">
        {`${stay.adults} × Adults${stay.children > 0 ? `, ${stay.children} × Children` : ''}`}
      </Row>

      {companions.length > 0 && (
        <div className="mt-1 flex flex-col items-start gap-1.5 pl-[var(--detail-label-width)]">
          {companions.map((name) => (
            <span key={name} className="inline-flex items-center gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <span className="underline underline-offset-2">{name}</span>
            </span>
          ))}
        </div>
      )}

      <Spacer />
      <Row label="Avg. rate (nightly)">{formatMoney(stay.nightly_rate, currency)}</Row>
      <Row label="Avg. price with products (nightly)">{formatMoney(avgWithProducts, currency)}</Row>
      <Row label="Total amount">{formatMoney(stay.total_amount, currency)}</Row>
      <Row label="Requested category">{unitTypeLabel(stay.units?.unit_type)}</Row>
      <Row label="Space category">{unitTypeLabel(stay.units?.unit_type)}</Row>
      <Row label="Room Number">
        {stay.units?.name ? (
          <span className="inline-flex items-center gap-2">
            {stay.units.name}
            {stay.units.housekeeping_status && (
              <StatusBadge
                label={housekeepingLabel(stay.units.housekeeping_status)}
                tone={housekeepingTone(stay.units.housekeeping_status)}
              />
            )}
          </span>
        ) : null}
      </Row>
      <Row label="Rate">{stay.rate_label ?? stay.rate_code}</Row>

      <button
        type="button"
        className="mt-1 ml-[var(--detail-label-width)] flex items-center gap-1.5 text-[11px] text-foreground/80 underline underline-offset-2 hover:text-foreground"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden />
        View policies
      </button>

      <Spacer />
      <Row label="Company">{booker?.company ?? guest?.company}</Row>
      <Row label="Booking Portal">{stay.source === 'OTA' ? 'Online travel agency' : null}</Row>
      <Row label="Booking Portal Reference">
        {stay.source === 'OTA' ? stay.external_reference : null}
      </Row>
      <Row label="Nights">
        {nightRows.length > 0 ? (
          <span className="flex flex-col gap-1.5">
            {nightRows.map((night) => (
              <span key={night.date}>
                {format(parseISO(night.date), 'dd.MM.yyyy')}
                {night.amount != null ? `: ${formatMoney(night.amount, currency)}` : ''}
              </span>
            ))}
          </span>
        ) : null}
      </Row>
      <Row label="Source">{stay.properties?.name}</Row>
      <Row label="Reservation source">{SOURCE_LABELS[stay.source] ?? stay.source}</Row>
      <Row label="Created">
        {stay.created_at ? format(parseISO(stay.created_at), 'dd.MM.yyyy HH:mm:ss') : null}
      </Row>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const isEmpty = children == null || children === '' || children === false
  return (
    <div className="grid min-h-6 grid-cols-[var(--detail-label-width)_1fr] items-center gap-2">
      <strong className="text-xs font-semibold text-foreground/90">{label}</strong>
      <span className="text-xs text-muted-foreground">
        {isEmpty ? <span className="text-muted-foreground/40">—</span> : children}
      </span>
    </div>
  )
}

function Spacer() {
  return <div className="h-3.5" />
}

function housekeepingLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll('_', ' ')
}
