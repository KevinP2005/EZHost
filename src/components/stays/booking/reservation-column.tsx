'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Check,
  ChevronDown,
  CircleUserRound,
  CreditCard,
  FileText,
  Lock,
  Pencil,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'

import { StatusBadge } from './status-badge'
import { ReservationDetails } from './reservation-details'

/**
 * Persistent right-hand reservation column. EZHost models one stay per
 * reservation, so the list renders the current stay; the surrounding structure
 * (selection, lock, collapse) follows the booking overview template.
 */

interface Props {
  stay: any
  stayGuests: any[]
  canEdit: boolean
  onEdit: () => void
}

export function ReservationColumn({ stay, stayGuests, canEdit, onEdit }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [selected, setSelected] = useState(true)
  const [locked, setLocked] = useState(false)

  const guest = stay.guests
  const guestName = guest ? `${guest.first_name} ${guest.last_name}`.trim() : 'Unassigned guest'
  const roomLabel = stay.room_label ?? stay.units?.name ?? '—'
  const dateRange = `${format(parseISO(stay.check_in_date), 'dd/MM/yyyy')} - ${format(parseISO(stay.check_out_date), 'dd/MM/yyyy')}`
  const selectedCount = selected ? 1 : 0

  return (
    <div className="min-w-0 [--detail-label-width:210px]">
      <div className="flex h-12 items-start justify-between border-b border-border px-3 pb-2.5">
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="inline-flex h-3 w-3 items-center justify-center rounded-[2px] bg-primary text-[12px] font-bold leading-none text-primary-foreground"
              aria-label={collapsed ? 'Expand reservations' : 'Collapse reservations'}
            >
              {collapsed ? '+' : '−'}
            </button>
            <h2 className="text-[15px] leading-5 font-semibold text-foreground">Reservations</h2>
          </div>
          <small className="ml-6 mt-px block text-[9px] text-muted-foreground">
            {selectedCount} / 1 selected
          </small>
        </div>

        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-3 w-3" aria-hidden />
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => setLocked(!locked)}
            className="inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] text-foreground/80 hover:bg-muted hover:text-foreground"
          >
            <Lock className="h-3 w-3" aria-hidden />
            {locked ? 'Lock' : 'Unlock'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="grid h-[39px] grid-cols-[14px_auto_1fr_auto_15px] items-center gap-2.5 border-b border-border px-2.5 text-muted-foreground">
            <SelectBox checked={selected} onChange={() => setSelected(!selected)} />
            <StatusBadge status={stay.status} />
            <strong className="text-[11px] font-semibold text-muted-foreground">{dateRange}</strong>
            <span className="text-[10px]">{selectedCount}/1 selected</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </div>

          <div className="border-b border-border">
            <div className="grid min-h-[42px] grid-cols-[14px_auto_1fr_auto_29px_18px] items-center gap-x-2.5 px-2.5">
              <SelectBox checked={selected} onChange={() => setSelected(!selected)} />

              <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                <span className="text-[11px]">{stay.room_count ?? 1} ×</span>
                <UserRound className="h-4 w-4" aria-hidden />
                <FileText className="h-4 w-4" aria-hidden />
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                <CreditCard className="h-4 w-4" aria-hidden />
              </div>

              <div className="flex min-w-0 flex-col">
                <strong className="truncate text-xs font-medium text-foreground">{guestName}</strong>
                <small className="truncate text-[9px] text-muted-foreground">{roomLabel}</small>
              </div>

              <StatusBadge status={stay.status} />

              <button
                type="button"
                onClick={() => setLocked(!locked)}
                aria-label="Toggle lock"
                className={`flex h-[18px] w-[29px] items-center rounded-full p-0.5 transition-colors ${
                  locked ? 'justify-end bg-primary' : 'justify-start bg-muted-foreground/60'
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ${
                    locked ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {locked ? <Lock className="h-3 w-3" aria-hidden /> : <CircleUserRound className="h-3 w-3" aria-hidden />}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                aria-label="Expand reservation"
                className="flex h-[22px] w-[18px] items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
              </button>
            </div>

            {expanded && <ReservationDetails stay={stay} stayGuests={stayGuests} />}
          </div>
        </>
      )}
    </div>
  )
}

function SelectBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={checked ? 'Unselect' : 'Select'}
      className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border ${
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-transparent'
      }`}
    >
      {checked && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />}
    </button>
  )
}
