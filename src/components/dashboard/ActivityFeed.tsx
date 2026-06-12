'use client'

import {
  CalendarPlus,
  LogIn,
  LogOut,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'

import type { ActivityItem } from './types'

const TYPE_ICON: Record<ActivityItem['type'], LucideIcon> = {
  booking: CalendarPlus,
  checkin: LogIn,
  checkout: LogOut,
  housekeeping: Sparkles,
  'guest-update': UserCheck,
  task: CalendarPlus,
}

const TYPE_TONE: Record<ActivityItem['type'], string> = {
  booking: 'bg-violet-500/15 text-violet-300',
  checkin: 'bg-emerald-500/15 text-emerald-400',
  checkout: 'bg-amber-500/15 text-amber-400',
  housekeeping: 'bg-indigo-500/15 text-indigo-300',
  'guest-update': 'bg-sky-500/15 text-sky-400',
  task: 'bg-rose-500/15 text-rose-400',
}

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Activity Feed</h2>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          No recent activity yet.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => {
            const ActivityIcon = TYPE_ICON[item.type]

            return (
              <article key={item.id} className="flex items-start gap-3 px-4 py-4">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TYPE_TONE[item.type]}`}>
                  <ActivityIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-foreground">{item.message}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.detail}</p>
                </div>

                <time className="mt-0.5 shrink-0 text-[11px] font-semibold text-muted-foreground/90">
                  {item.time}
                </time>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

