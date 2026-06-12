'use client'

import { CalendarDays, Home, Users } from 'lucide-react'

import type { Stay } from './types'

const STATUS_CONFIG: Record<Stay['status'], { label: string; className: string }> = {
  confirmed: {
    label: 'Confirmed',
    className: 'border border-violet-400/25 bg-violet-500/15 text-violet-300',
  },
  pending: {
    label: 'Pending',
    className: 'border border-amber-400/25 bg-amber-500/15 text-amber-400',
  },
  'checked-in': {
    label: 'Checked In',
    className: 'border border-emerald-400/25 bg-emerald-500/15 text-emerald-400',
  },
  'checked-out': {
    label: 'Checked Out',
    className: 'border border-slate-400/20 bg-slate-500/15 text-slate-300',
  },
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date))
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function UpcomingStays({ stays }: { stays: Stay[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Upcoming Stays</h2>
        <span className="text-xs font-medium text-muted-foreground">{stays.length} stays</span>
      </div>

      {stays.length === 0 ? (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          No upcoming stays found.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {stays.map((stay) => {
            const status = STATUS_CONFIG[stay.status]

            return (
              <button
                key={stay.id}
                type="button"
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <span className="text-[11px] font-bold text-violet-300">{getInitials(stay.guestName)}</span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-foreground">{stay.guestName}</span>

                  <span className="mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Home className="h-3 w-3" aria-hidden="true" />
                      {stay.unit}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {stay.guests}
                    </span>
                  </span>
                </span>

                <span className="hidden w-44 shrink-0 items-center justify-end gap-1 text-[11px] text-muted-foreground sm:flex">
                  <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{formatDate(stay.checkIn)}</span>
                  <span>-</span>
                  <span>{formatDate(stay.checkOut)}</span>
                  <span className="text-muted-foreground/70">({stay.nights}n)</span>
                </span>

                <span className={`w-24 shrink-0 rounded-md px-2 py-0.5 text-center text-[10.5px] font-bold ${status.className}`}>
                  {status.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

