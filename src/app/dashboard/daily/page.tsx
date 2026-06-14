import { requireAuth } from '@/lib/auth'
import { getStaysByDate } from '@/lib/services/stays'
import { getBreakfastList } from '@/lib/services/breakfast'
import { getHousekeepingOverview } from '@/lib/services/housekeeping'
import { getPropertyScope, getScopePropertyIds, hasPropertyScope } from '@/lib/services/properties'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { DailyView } from '@/components/daily/daily-view'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Daily Operations' }

interface Props {
  searchParams: Promise<{ date?: string; property?: string }>
}

export default async function DailyPage({ searchParams }: Props) {
  const profile = await requireAuth()
  const params = await searchParams
  const date = params.date ?? format(new Date(), 'yyyy-MM-dd')
  const scope = await getPropertyScope(profile, params.property)

  if (!hasPropertyScope(scope)) {
    return <p className="text-muted-foreground text-sm">Select an accommodation to view daily operations.</p>
  }

  const propertyIds = getScopePropertyIds(scope)
  const [stayData, breakfastData, housekeepingData] = await Promise.all([
    getStaysByDate(scope.organizationId, date, scope.propertyId, propertyIds),
    getBreakfastList(scope.organizationId, date, scope.propertyId, propertyIds),
    getHousekeepingOverview(scope.organizationId, scope.propertyId, propertyIds),
  ])

  const supabase = await createClient()
  let notesQuery = supabase
    .from('operational_notes')
    .select('*, profiles!created_by_profile_id(name)')
    .order('created_at', { ascending: false })
    .limit(10)

  if (scope.organizationId) {
    notesQuery = notesQuery.eq('organization_id', scope.organizationId)
  }

  if (scope.propertyId) {
    notesQuery = notesQuery.or(`property_id.eq.${scope.propertyId},property_id.is.null`)
  } else if (propertyIds.length > 0) {
    notesQuery = scope.organizationId
      ? notesQuery.or(`property_id.in.(${propertyIds.join(',')}),property_id.is.null`)
      : notesQuery.in('property_id', propertyIds)
  }

  const { data: notes } = await notesQuery

  return (
    <DailyView
      date={date}
      arrivals={stayData.arrivals}
      departures={stayData.departures}
      inHouse={stayData.inHouse}
      breakfastSummary={breakfastData}
      housekeeping={housekeepingData}
      notes={notes ?? []}
    />
  )
}
