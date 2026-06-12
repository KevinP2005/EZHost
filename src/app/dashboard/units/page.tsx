import { requireAuth } from '@/lib/auth'
import { getUnits } from '@/lib/services/units'
import { getPropertyScope, getScopePropertyIds, hasOperationalScope } from '@/lib/services/properties'
import { UnitsBoard } from '@/components/units/units-board'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Units' }

interface UnitsPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function UnitsPage({ searchParams }: UnitsPageProps) {
  const profile = await requireAuth()
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasOperationalScope(scope)) return <p className="text-muted-foreground text-sm">Select an accommodation to view units.</p>

  const propertyIds = getScopePropertyIds(scope)
  const units = await getUnits(scope.organizationId, scope.propertyId, propertyIds)

  return (
    <UnitsBoard
      units={units}
      properties={scope.properties}
      canEdit={['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'].includes(profile.role)}
    />
  )
}
