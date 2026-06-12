import { requireAuth } from '@/lib/auth'
import { canViewBreakfast } from '@/lib/auth'
import { getBreakfastList } from '@/lib/services/breakfast'
import { getPropertyScope, getScopePropertyIds, hasOperationalScope } from '@/lib/services/properties'
import { BreakfastListView } from '@/components/breakfast/breakfast-list'
import { format } from 'date-fns'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Breakfast' }

interface Props {
  searchParams: Promise<{ date?: string; property?: string }>
}

export default async function BreakfastPage({ searchParams }: Props) {
  const profile = await requireAuth()
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasOperationalScope(scope)) return <p className="text-muted-foreground text-sm">Select an accommodation to view breakfast.</p>
  if (!canViewBreakfast(profile.role)) return <p className="text-muted-foreground text-sm">Access restricted.</p>

  const date = params.date ?? format(new Date(), 'yyyy-MM-dd')
  const propertyIds = getScopePropertyIds(scope)
  const data = await getBreakfastList(scope.organizationId, date, scope.propertyId, propertyIds)

  return (
    <BreakfastListView
      date={date}
      items={data.items}
      totalAdults={data.totalAdults}
      totalChildren={data.totalChildren}
      withAllergies={data.withAllergies}
      withRequests={data.withRequests}
      properties={scope.properties}
      currentPropertyId={scope.propertyId}
      organizationId={scope.organizationId}
    />
  )
}
