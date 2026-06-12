'use client'

import {
  BedDouble,
  ClipboardList,
  LogIn,
  LogOut,
  type LucideIcon,
} from 'lucide-react'

interface TodaySummaryData {
  arrivals: number
  departures: number
  stayovers: number
  openTasks: number
}

function getStats(summary: TodaySummaryData): Array<{
  label: string
  value: number
  icon: LucideIcon
  tone: string
  border: string
}> {
  return [
    {
      label: 'Arrivals',
      value: summary.arrivals,
      icon: LogIn,
      tone: 'bg-violet-500/15 text-violet-300',
      border: 'border-violet-400/25',
    },
    {
      label: 'Departures',
      value: summary.departures,
      icon: LogOut,
      tone: 'bg-amber-500/15 text-amber-400',
      border: 'border-amber-400/25',
    },
    {
      label: 'Stayovers',
      value: summary.stayovers,
      icon: BedDouble,
      tone: 'bg-emerald-500/15 text-emerald-400',
      border: 'border-emerald-400/25',
    },
    {
      label: 'Open Tasks',
      value: summary.openTasks,
      icon: ClipboardList,
      tone: 'bg-rose-500/15 text-rose-400',
      border: 'border-rose-400/25',
    },
  ]
}

export default function TodaySummary({ summary }: { summary: TodaySummaryData }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {getStats(summary).map((stat) => {
        const StatIcon = stat.icon

        return (
          <article
            key={stat.label}
            className={`flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm ${stat.border}`}
          >
            <div className={`flex shrink-0 items-center justify-center rounded-md p-2.5 ${stat.tone}`}>
              <StatIcon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
            </div>

            <div>
              <p className="text-2xl font-bold leading-none text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{stat.label}</p>
            </div>
          </article>
        )
      })}
    </section>
  )
}
