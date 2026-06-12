import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Users, LogIn, LogOut, Coffee, Sparkles, FileWarning } from 'lucide-react'
import type { getDailyOverview } from '@/lib/services/stays'

type Overview = Awaited<ReturnType<typeof getDailyOverview>>

interface Props {
  overview: Overview
  today: string
}

export function DashboardOverview({ overview }: Props) {
  const statCards = [
    {
      label: 'Arrivals',
      value: overview.arrivals.length,
      icon: LogIn,
      href: '/dashboard/daily',
      color: 'text-blue-600',
    },
    {
      label: 'Departures',
      value: overview.departures.length,
      icon: LogOut,
      href: '/dashboard/daily',
      color: 'text-orange-600',
    },
    {
      label: 'In-house',
      value: overview.inHouse.length,
      icon: Users,
      href: '/dashboard/stays',
      color: 'text-green-600',
    },
    {
      label: 'Breakfast today',
      value: overview.breakfastToday.total,
      icon: Coffee,
      href: '/dashboard/breakfast',
      color: 'text-amber-600',
    },
    {
      label: 'Open tasks',
      value: overview.openTasksCount,
      icon: Sparkles,
      href: '/dashboard/housekeeping',
      color: overview.openTasksCount > 0 ? 'text-red-500' : 'text-muted-foreground',
    },
    {
      label: 'Missing registration',
      value: overview.missingRegistrationCount,
      icon: FileWarning,
      href: '/dashboard/registration',
      color: overview.missingRegistrationCount > 0 ? 'text-red-500' : 'text-muted-foreground',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.href}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-4 w-4 ${card.color}`} />
                    <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Arrivals Today</CardTitle>
            <Link href="/dashboard/daily" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {overview.arrivals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No arrivals today.</p>
            ) : (
              <div className="space-y-2">
                {overview.arrivals.slice(0, 5).map((stay: any) => (
                  <div key={stay.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">
                        {stay.guests ? `${stay.guests.first_name} ${stay.guests.last_name}` : '—'}
                      </span>
                      <span className="text-muted-foreground ml-2">· {stay.units?.name ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {stay.arrival_time && (
                        <span className="text-xs text-muted-foreground">{stay.arrival_time.slice(0, 5)}</span>
                      )}
                      <StatusBadge status={stay.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Departures Today</CardTitle>
            <Link href="/dashboard/daily" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {overview.departures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departures today.</p>
            ) : (
              <div className="space-y-2">
                {overview.departures.slice(0, 5).map((stay: any) => (
                  <div key={stay.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">
                        {stay.guests ? `${stay.guests.first_name} ${stay.guests.last_name}` : '—'}
                      </span>
                      <span className="text-muted-foreground ml-2">· {stay.units?.name ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {stay.departure_time && (
                        <span className="text-xs text-muted-foreground">{stay.departure_time.slice(0, 5)}</span>
                      )}
                      <StatusBadge status={stay.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Breakfast Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-lg font-semibold">{overview.breakfastToday.total}</p>
              <p className="text-xs text-muted-foreground">
                {overview.breakfastToday.adults} adults · {overview.breakfastToday.children} children
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tomorrow</p>
              <p className="text-lg font-semibold">{overview.breakfastTomorrow.total}</p>
              <p className="text-xs text-muted-foreground">
                {overview.breakfastTomorrow.adults} adults · {overview.breakfastTomorrow.children} children
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    BOOKED: 'bg-blue-50 text-blue-700 border-blue-200',
    CHECKED_IN: 'bg-green-50 text-green-700 border-green-200',
    CHECKED_OUT: 'bg-gray-50 text-gray-500 border-gray-200',
    CANCELLED: 'bg-red-50 text-red-600 border-red-200',
    NO_SHOW: 'bg-orange-50 text-orange-600 border-orange-200',
  }
  const labels: Record<string, string> = {
    BOOKED: 'Booked',
    CHECKED_IN: 'In',
    CHECKED_OUT: 'Out',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${variants[status] ?? 'bg-gray-50 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  )
}
