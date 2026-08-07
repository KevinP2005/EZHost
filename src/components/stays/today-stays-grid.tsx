import { BedDouble, CalendarClock, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { StayPanelLink } from '@/components/stays/stay-panel-link'

export interface TodayStay {
  id: string
  guestName: string
  unitName: string
  guestCount: number
  arrivalTime: string | null
  checkInStatus: 'CHECKED_IN' | 'NO_SHOW' | 'TO_BE_CHECKED_IN'
  unitStatus: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_SERVICE'
}

const checkInStatusConfig: Record<TodayStay['checkInStatus'], { label: string; className: string }> = {
  CHECKED_IN: {
    label: 'Checked In',
    className: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-400',
  },
  NO_SHOW: {
    label: 'No Show',
    className: 'border-rose-400/25 bg-rose-500/15 text-rose-400',
  },
  TO_BE_CHECKED_IN: {
    label: 'To Be Checked In',
    className: 'border-amber-400/25 bg-amber-500/15 text-amber-400',
  },
}

const unitStatusConfig: Record<TodayStay['unitStatus'], { label: string; className: string }> = {
  CLEAN: {
    label: 'Clean',
    className: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-400',
  },
  DIRTY: {
    label: 'Dirty',
    className: 'border-amber-400/25 bg-amber-500/10 text-amber-400',
  },
  INSPECTED: {
    label: 'Inspected',
    className: 'border-sky-400/25 bg-sky-500/10 text-sky-400',
  },
  OUT_OF_SERVICE: {
    label: 'Out of Service',
    className: 'border-slate-400/25 bg-slate-500/15 text-slate-300',
  },
}

function formatArrivalTime(value: string | null) {
  if (!value) return 'Arrival time not set'
  return `Arrival at ${value.slice(0, 5)}`
}

export function TodayStaysGrid({ stays }: { stays: TodayStay[] }) {
  if (stays.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
        <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-sm font-semibold text-foreground">No stays scheduled for today.</h2>
        <p className="mt-1 text-xs text-muted-foreground">Today&apos;s arrivals and active stays will appear here.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {stays.map((stay) => {
        const checkInStatus = checkInStatusConfig[stay.checkInStatus]
        const unitStatus = unitStatusConfig[stay.unitStatus]

        return (
          <StayPanelLink
            key={stay.id}
            stayId={stay.id}
            className="group flex min-h-52 flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-foreground">{stay.guestName}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="truncate">{stay.unitName}</span>
                </p>
              </div>
              <span className={cn('shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold', checkInStatus.className)}>
                {checkInStatus.label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-background/50 p-3">
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  Arriving guests
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">{stay.guestCount}</p>
              </div>
              <div className="rounded-md border border-border bg-background/50 p-3">
                <p className="text-[11px] text-muted-foreground">Unit status</p>
                <span className={cn('mt-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold', unitStatus.className)}>
                  {unitStatus.label}
                </span>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatArrivalTime(stay.arrivalTime)}
              </span>
              <span className="font-semibold text-primary transition-colors group-hover:text-primary/80">View stay</span>
            </div>
          </StayPanelLink>
        )
      })}
    </div>
  )
}
