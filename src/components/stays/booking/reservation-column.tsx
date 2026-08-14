'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
 * Persistent right-hand reservation column.
 *
 * A reservation holds one stay per booked unit, so every stay of the
 * reservation gets its own row here. Rows stay individually actionable (each
 * one can be checked in separately); the reservation itself deliberately has
 * no combined check-in state.
 */

interface Props {
  /** The stay whose page is open — its row starts expanded. */
  stay: any
  reservationStays: any[]
  stayGuests: any[]
  canEdit: boolean
  onEdit: () => void
  /** Selection is owned by the parent (BookingDetail) so the left Status tab can react to it. */
  selectedStayIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function ReservationColumn({
  stay,
  reservationStays,
  stayGuests,
  canEdit,
  onEdit,
  selectedStayIds,
  onSelectionChange,
}: Props) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedIds, setExpandedIds] = useState<string[]>([stay.id])
  const [lockedIds, setLockedIds] = useState<string[]>([])

  const stays = reservationStays.length > 0 ? reservationStays : [stay]
  const totalCount = stays.length
  const selectedCount = stays.filter((row) => selectedStayIds.includes(row.id)).length

  // The reservation spans the widest range of its stays.
  const checkInDates = stays.map((row) => row.check_in_date).sort()
  const checkOutDates = stays.map((row) => row.check_out_date).sort()
  const dateRange = `${format(parseISO(checkInDates[0]), 'dd/MM/yyyy')} - ${format(
    parseISO(checkOutDates[checkOutDates.length - 1]),
    'dd/MM/yyyy',
  )}`

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]
  }

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
            {selectedCount} / {totalCount} selected
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
            onClick={() => setLockedIds(lockedIds.length > 0 ? [] : stays.map((row) => row.id))}
            className="inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] text-foreground/80 hover:bg-muted hover:text-foreground"
          >
            <Lock className="h-3 w-3" aria-hidden />
            {lockedIds.length > 0 ? 'Lock' : 'Unlock'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="grid h-[39px] grid-cols-[14px_auto_1fr_auto_15px] items-center gap-2.5 border-b border-border px-2.5 text-muted-foreground">
            <SelectBox
              checked={selectedCount === totalCount}
              onChange={() =>
                onSelectionChange(selectedCount === totalCount ? [] : stays.map((row) => row.id))
              }
            />
            <StatusBadge status={stay.status} />
            <strong className="text-[11px] font-semibold text-muted-foreground">{dateRange}</strong>
            <span className="text-[10px]">
              {selectedCount}/{totalCount} selected
            </span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </div>

          {stays.map((row) => {
            const isExpanded = expandedIds.includes(row.id)
            const isLocked = lockedIds.includes(row.id)
            const guest = row.guests
            const guestName = guest
              ? `${guest.first_name} ${guest.last_name}`.trim()
              : 'Unassigned guest'
            const roomLabel = row.units?.name ?? row.room_label ?? '—'

            return (
              <div key={row.id} className="border-b border-border">
                <div className="grid min-h-[42px] grid-cols-[14px_auto_1fr_auto_29px_18px] items-center gap-x-2.5 px-2.5">
                  <SelectBox
                    checked={selectedStayIds.includes(row.id)}
                    onChange={() => onSelectionChange(toggle(selectedStayIds, row.id))}
                  />

                  <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                    <UserRound className="h-4 w-4" aria-hidden />
                    <FileText className="h-4 w-4" aria-hidden />
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    <CreditCard className="h-4 w-4" aria-hidden />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (row.id !== stay.id) router.push(`/dashboard/stays/${row.id}`)
                    }}
                    className="flex min-w-0 flex-col text-left"
                  >
                    <strong
                      className={`truncate text-xs font-medium ${
                        row.isActive ? 'text-foreground' : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      {guestName}
                    </strong>
                    <small className="truncate text-[9px] text-muted-foreground">
                      {row.stay_number} · {roomLabel}
                    </small>
                  </button>

                  <StatusBadge status={row.status} />

                  <button
                    type="button"
                    onClick={() => setLockedIds((current) => toggle(current, row.id))}
                    aria-label="Toggle lock"
                    className={`flex h-[18px] w-[29px] items-center rounded-full p-0.5 transition-colors ${
                      isLocked ? 'justify-end bg-primary' : 'justify-start bg-muted-foreground/60'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ${
                        isLocked ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="h-3 w-3" aria-hidden />
                      ) : (
                        <CircleUserRound className="h-3 w-3" aria-hidden />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedIds((current) => toggle(current, row.id))}
                    aria-label="Expand reservation"
                    className="flex h-[22px] w-[18px] items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                </div>

                {isExpanded && (
                  <ReservationDetails
                    stay={row.id === stay.id ? stay : row}
                    stayGuests={row.id === stay.id ? stayGuests : []}
                  />
                )}
              </div>
            )
          })}
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
