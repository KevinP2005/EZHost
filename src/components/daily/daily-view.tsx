'use client'

import { useRouter } from 'next/navigation'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Props {
  date: string
  arrivals: any[]
  departures: any[]
  inHouse: any[]
  breakfastSummary: any
  housekeeping: any
  notes: any[]
}

export function DailyView({ date, arrivals, departures, inHouse, breakfastSummary, housekeeping, notes }: Props) {
  const router = useRouter()
  const parsed = parseISO(date)
  const isToday = date === format(new Date(), 'yyyy-MM-dd')

  function navigate(d: Date) {
    router.push(`/dashboard/daily?date=${format(d, 'yyyy-MM-dd')}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Daily Operations</h1>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(subDays(parsed, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{format(parsed, 'EEEE, d MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(addDays(parsed, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(new Date())}>
                Today
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-blue-700">{arrivals.length}</p>
            <p className="text-xs text-blue-600">Arrivals</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-orange-700">{departures.length}</p>
            <p className="text-xs text-orange-600">Departures</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-green-700">{inHouse.length}</p>
            <p className="text-xs text-green-600">In-house</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="arrivals">
        <TabsList>
          <TabsTrigger value="arrivals">Arrivals ({arrivals.length})</TabsTrigger>
          <TabsTrigger value="departures">Departures ({departures.length})</TabsTrigger>
          <TabsTrigger value="inhouse">In-house ({inHouse.length})</TabsTrigger>
          <TabsTrigger value="breakfast">Breakfast ({breakfastSummary.totalAdults + breakfastSummary.totalChildren})</TabsTrigger>
          <TabsTrigger value="housekeeping">Housekeeping</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals" className="mt-4">
          <StayList stays={arrivals} type="arrival" />
        </TabsContent>

        <TabsContent value="departures" className="mt-4">
          <StayList stays={departures} type="departure" />
        </TabsContent>

        <TabsContent value="inhouse" className="mt-4">
          <StayList stays={inHouse} type="inhouse" />
        </TabsContent>

        <TabsContent value="breakfast" className="mt-4">
          <BreakfastTab summary={breakfastSummary} />
        </TabsContent>

        <TabsContent value="housekeeping" className="mt-4">
          <HousekeepingTab data={housekeeping} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesTab notes={notes} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StayList({ stays, type }: { stays: any[]; type: string }) {
  if (!stays.length) {
    const labels = { arrival: 'arrivals', departure: 'departures', inhouse: 'in-house stays' }
    return <p className="text-sm text-muted-foreground">No {labels[type as keyof typeof labels]} for this date.</p>
  }

  return (
    <div className="space-y-2">
      {stays.map((stay) => (
        <Card key={stay.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">
                  {stay.guests ? `${stay.guests.first_name} ${stay.guests.last_name}` : 'Guest not assigned'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stay.units?.name ?? '—'} · {stay.adults} adults
                  {stay.children > 0 ? `, ${stay.children} children` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(stay.check_in_date), 'd MMM')} → {format(parseISO(stay.check_out_date), 'd MMM')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StayStatusBadge status={stay.status} />
                {type === 'arrival' && stay.arrival_time && (
                  <span className="text-xs text-muted-foreground">ETA {stay.arrival_time.slice(0, 5)}</span>
                )}
                {type === 'departure' && stay.departure_time && (
                  <span className="text-xs text-muted-foreground">ETD {stay.departure_time.slice(0, 5)}</span>
                )}
                <RegistrationBadge status={stay.registration_status} />
                {stay.breakfast_included && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Breakfast
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function BreakfastTab({ summary }: { summary: any }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-6">
        <div>
          <p className="text-2xl font-bold">{summary.totalAdults + summary.totalChildren}</p>
          <p className="text-sm text-muted-foreground">Total breakfasts</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{summary.totalAdults}</p>
          <p className="text-sm text-muted-foreground">Adults</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{summary.totalChildren}</p>
          <p className="text-sm text-muted-foreground">Children</p>
        </div>
      </div>
      {summary.withAllergies.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-red-600">Allergy notes ({summary.withAllergies.length})</p>
          {summary.withAllergies.map((item: any) => (
            <div key={item.id} className="text-sm text-muted-foreground">
              {item.units?.name ?? '—'}: {item.allergies}
            </div>
          ))}
        </div>
      )}
      {!summary.items.length && <p className="text-sm text-muted-foreground">No breakfast entries for this date.</p>}
    </div>
  )
}

function HousekeepingTab({ data }: { data: any }) {
  const dirty = data.units.filter((u: any) => u.housekeeping_status === 'DIRTY')
  const clean = data.units.filter((u: any) => u.housekeeping_status === 'CLEAN')
  const inspected = data.units.filter((u: any) => u.housekeeping_status === 'INSPECTED')

  return (
    <div className="space-y-4">
      <div className="flex gap-6">
        <div><p className="text-2xl font-bold text-red-600">{dirty.length}</p><p className="text-xs text-muted-foreground">Dirty</p></div>
        <div><p className="text-2xl font-bold text-green-600">{clean.length}</p><p className="text-xs text-muted-foreground">Clean</p></div>
        <div><p className="text-2xl font-bold text-blue-600">{inspected.length}</p><p className="text-xs text-muted-foreground">Inspected</p></div>
        <div><p className="text-2xl font-bold text-orange-600">{data.tasks.length}</p><p className="text-xs text-muted-foreground">Open tasks</p></div>
      </div>
      {dirty.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Units needing cleaning</p>
          <div className="flex flex-wrap gap-2">
            {dirty.map((u: any) => (
              <span key={u.id} className="text-xs px-2 py-1 rounded border bg-red-50 text-red-700 border-red-200">
                {u.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NotesTab({ notes }: { notes: any[] }) {
  if (!notes.length) return <p className="text-sm text-muted-foreground">No operational notes.</p>
  const deptColors: Record<string, string> = {
    RECEPTION: 'bg-blue-50 text-blue-700',
    HOUSEKEEPING: 'bg-green-50 text-green-700',
    KITCHEN: 'bg-amber-50 text-amber-700',
    MANAGEMENT: 'bg-purple-50 text-purple-700',
    GENERAL: 'bg-gray-50 text-gray-700',
  }
  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <Card key={note.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm">{note.note}</p>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs px-1.5 py-0.5 rounded ${deptColors[note.department] ?? 'bg-gray-50 text-gray-600'}`}>
                  {note.department}
                </span>
                <span className="text-xs text-muted-foreground">{note.profiles?.name ?? '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StayStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    BOOKED: { label: 'Booked', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    CHECKED_IN: { label: 'Checked In', cls: 'bg-green-50 text-green-700 border-green-200' },
    CHECKED_OUT: { label: 'Checked Out', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-600 border-red-200' },
    NO_SHOW: { label: 'No Show', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-50 text-gray-500' }
  return <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${cls}`}>{label}</span>
}

function RegistrationBadge({ status }: { status: string }) {
  if (status === 'COMPLETE' || status === 'NOT_REQUIRED') return null
  const map: Record<string, string> = {
    MISSING: 'bg-red-50 text-red-600 border-red-200',
    PARTIAL: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${map[status] ?? ''}`}>
      {status === 'MISSING' ? 'No registration' : 'Partial registration'}
    </span>
  )
}
