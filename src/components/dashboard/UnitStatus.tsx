'use client'

import {
  BedDouble,
  CheckCircle2,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import type { Unit } from './types'

const STATUS_CONFIG: Record<
  Unit['status'],
  {
    label: string
    icon: LucideIcon
    tone: string
    labelColor: string
    border: string
    dot: string
  }
> = {
  available: {
    label: 'Available',
    icon: CheckCircle2,
    tone: 'bg-emerald-500/15 text-emerald-400',
    labelColor: 'text-emerald-400',
    border: 'border-emerald-400/25',
    dot: 'bg-emerald-400',
  },
  occupied: {
    label: 'Occupied',
    icon: BedDouble,
    tone: 'bg-violet-500/15 text-violet-300',
    labelColor: 'text-violet-300',
    border: 'border-violet-400/25',
    dot: 'bg-violet-400',
  },
  cleaning: {
    label: 'Cleaning',
    icon: Sparkles,
    tone: 'bg-amber-500/15 text-amber-400',
    labelColor: 'text-amber-400',
    border: 'border-amber-400/25',
    dot: 'bg-amber-400',
  },
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    tone: 'bg-slate-500/15 text-slate-300',
    labelColor: 'text-slate-300',
    border: 'border-slate-400/25',
    dot: 'bg-slate-400',
  },
}

const statusOrder: Unit['status'][] = ['occupied', 'cleaning', 'maintenance', 'available']
const visibleCounts: Unit['status'][] = ['occupied', 'cleaning', 'available']

export default function UnitStatus({ units }: { units: Unit[] }) {
  const sortedUnits = [...units].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
  )

  const counts = units.reduce<Record<Unit['status'], number>>(
    (acc, unit) => {
      acc[unit.status] += 1
      return acc
    },
    { available: 0, occupied: 0, cleaning: 0, maintenance: 0 },
  )

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Unit Status</h2>

        <div className="flex items-center gap-2">
          {visibleCounts.map((status) => (
            <span key={status} className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground" title={STATUS_CONFIG[status].label}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[status].dot}`} />
              {counts[status]}
            </span>
          ))}
        </div>
      </div>

      {sortedUnits.length === 0 ? (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          No units found yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-3">
          {sortedUnits.map((unit) => {
            const config = STATUS_CONFIG[unit.status]
            const StatusIcon = config.icon

            return (
              <button key={unit.id} type="button" className={`rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/50 ${config.border}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{unit.name}</p>
                    <p className="text-[11px] text-muted-foreground">{unit.type}</p>
                  </div>

                  <div className={`flex shrink-0 items-center justify-center rounded-md p-1.5 ${config.tone}`}>
                    <StatusIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-3">
                  <span className={`text-[10.5px] font-bold ${config.labelColor}`}>{config.label}</span>

                  {unit.currentGuest && (
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{unit.currentGuest}</p>
                  )}

                  {unit.checkOut && (
                    <p className="text-[10px] font-medium text-foreground">Until {unit.checkOut}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

