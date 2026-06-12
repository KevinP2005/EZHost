import type { Metadata } from 'next'
import {
  Building2,
  CalendarPlus,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react'
import { format } from 'date-fns'

import { requireAuth } from '@/lib/auth'
import { getOwnerDashboardData } from '@/lib/services/dashboard'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import TaskFocus from '@/components/dashboard/TaskFocus'
import TodaySummary from '@/components/dashboard/TodaySummary'
import UnitStatus from '@/components/dashboard/UnitStatus'
import UpcomingStays from '@/components/dashboard/UpcomingStays'

export const metadata: Metadata = { title: 'Overview' }

interface DashboardPageProps {
  searchParams: Promise<{ property?: string }>
}

const onboardingSteps: Array<{
  icon: LucideIcon
  label: string
  action: string
}> = [
  {
    icon: Building2,
    label: 'Add your first unit',
    action: 'Add Unit',
  },
  {
    icon: CalendarPlus,
    label: 'Create your first booking',
    action: 'Add Booking',
  },
  {
    icon: PlusCircle,
    label: 'Complete property details',
    action: 'Edit Details',
  },
]

function getFirstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || 'there'
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const profile = await requireAuth()
  const params = await searchParams
  const todayIso = format(new Date(), 'yyyy-MM-dd')
  const todayLabel = format(new Date(), 'EEEE, d MMMM yyyy')
  const dashboard = profile.organization_id
    ? await getOwnerDashboardData(profile.organization_id, todayIso, params.property)
    : null

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        <header>
          <h1 className="text-[17px] font-bold text-foreground">
            Good morning, {getFirstName(profile.name)}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{todayLabel}</p>
        </header>

        <section className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          No organization is assigned to your account yet.
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header>
        <h1 className="text-[17px] font-bold text-foreground">
          Good morning, {getFirstName(profile.name)}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{todayLabel}</p>
      </header>

      <TodaySummary summary={dashboard.todaySummary} />

      {!dashboard.hasPropertyData && (
        <section className="rounded-lg border border-violet-400/25 bg-violet-500/10 p-5">
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            Get started with EZHost
          </h2>
          <p className="mb-4 text-[12.5px] text-violet-200">
            Complete these steps to set up your property.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {onboardingSteps.map((step) => {
              const StepIcon = step.icon

              return (
                <article
                  key={step.label}
                  className="flex items-center gap-3 rounded-md border border-violet-400/20 bg-card p-3.5"
                >
                  <div className="flex shrink-0 items-center justify-center rounded-md bg-violet-500/15 p-2 text-violet-300">
                    <StepIcon className="h-4 w-4" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-foreground">
                      {step.label}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 rounded-md bg-violet-500/15 px-2.5 py-1 text-[11.5px] font-semibold text-violet-300 transition-colors hover:bg-violet-500/25"
                  >
                    {step.action}
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <UpcomingStays stays={dashboard.upcomingStays} />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TaskFocus tasks={dashboard.tasks} />
            <UnitStatus units={dashboard.units} />
          </div>
        </div>

        <div className="xl:col-span-1">
          <ActivityFeed items={dashboard.activityFeed} />
        </div>
      </div>
    </div>
  )
}
