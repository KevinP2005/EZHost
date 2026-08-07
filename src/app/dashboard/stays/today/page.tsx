import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'

import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getPropertyScope, getScopePropertyIds, hasPropertyScope } from '@/lib/services/properties'
import { TodayStaysGrid, type TodayStay } from '@/components/stays/today-stays-grid'

export const metadata: Metadata = { title: "Today's Stays" }

interface TodayStaysPageProps {
  searchParams: Promise<{ property?: string }>
}

interface StayRow {
  id: string
  check_in_date: string
  arrival_time: string | null
  adults: number | null
  children: number | null
  status: string
  units: {
    name: string | null
    housekeeping_status: TodayStay['unitStatus']
  } | null
  guests: {
    first_name: string | null
    last_name: string | null
  } | null
}

function getGuestName(stay: StayRow) {
  const name = [stay.guests?.first_name, stay.guests?.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')

  return name || 'Guest'
}

function getCheckInStatus(status: string): TodayStay['checkInStatus'] {
  if (status === 'CHECKED_IN') return 'CHECKED_IN'
  if (status === 'NO_SHOW') return 'NO_SHOW'
  return 'TO_BE_CHECKED_IN'
}

function toTodayStay(stay: StayRow): TodayStay {
  return {
    id: stay.id,
    guestName: getGuestName(stay),
    unitName: stay.units?.name || 'Unassigned unit',
    guestCount: (stay.adults ?? 0) + (stay.children ?? 0),
    arrivalTime: stay.arrival_time,
    checkInStatus: getCheckInStatus(stay.status),
    unitStatus: stay.units?.housekeeping_status ?? 'OUT_OF_SERVICE',
  }
}

export default async function TodayStaysPage({ searchParams }: TodayStaysPageProps) {
  const profile = await requireAuth()
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)
  const today = format(new Date(), 'yyyy-MM-dd')

  if (!hasPropertyScope(scope)) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Select an accommodation to view today&apos;s stays.
      </div>
    )
  }

  const supabase = await createClient()
  let query = supabase
    .from('stays')
    .select(`
      id,
      check_in_date,
      check_out_date,
      arrival_time,
      adults,
      children,
      status,
      units(name, housekeeping_status),
      guests!primary_guest_id(first_name, last_name)
    `)
    .eq('booking_status', 'CONFIRMED')
    .lte('check_in_date', today)
    .gt('check_out_date', today)
    .in('status', ['BOOKED', 'CHECKED_IN', 'NO_SHOW'])
    .order('arrival_time', { ascending: true, nullsFirst: false })

  if (scope.organizationId) query = query.eq('organization_id', scope.organizationId)
  if (scope.propertyId) {
    query = query.eq('property_id', scope.propertyId)
  } else {
    const propertyIds = getScopePropertyIds(scope)
    if (propertyIds.length > 0) query = query.in('property_id', propertyIds)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load today's stays: ${error.message}`)

  const stays = ((data ?? []) as unknown as StayRow[])
    .filter((stay) => stay.check_in_date === today || stay.status === 'CHECKED_IN')
    .map(toTodayStay)

  const selectedProperty = scope.properties.find((property) => property.id === scope.propertyId)
  const propertyLabel = selectedProperty?.name ?? 'All accommodations'

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={params.property ? `/dashboard/stays?property=${encodeURIComponent(params.property)}` : '/dashboard/stays'}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All stays
          </Link>
          <h1 className="text-xl font-semibold text-foreground">Today&apos;s Stays</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, d MMMM yyyy')} · {propertyLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          {stays.length} {stays.length === 1 ? 'stay' : 'stays'} today
        </div>
      </header>

      <TodayStaysGrid stays={stays} />
    </div>
  )
}
