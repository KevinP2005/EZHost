import { requireAuth } from '@/lib/auth'
import { getHousekeepingOverview } from '@/lib/services/housekeeping'
import { getPropertyScope, getScopePropertyIds, hasOperationalScope } from '@/lib/services/properties'
import { HousekeepingBoard } from '@/components/housekeeping/housekeeping-board'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Housekeeping' }

interface HousekeepingPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function HousekeepingPage({ searchParams }: HousekeepingPageProps) {
  const profile = await requireAuth()
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasOperationalScope(scope)) return <p className="text-muted-foreground text-sm">Select an accommodation to view housekeeping.</p>

  const propertyIds = getScopePropertyIds(scope)
  const data = await getHousekeepingOverview(scope.organizationId, scope.propertyId, propertyIds)

  return (
    <HousekeepingBoard
      units={data.units}
      tasks={data.tasks}
      properties={scope.properties}
      canEdit={['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION'].includes(profile.role)}
    />
  )
}
