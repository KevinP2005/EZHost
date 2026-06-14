import { requireRole } from '@/lib/auth'
import { CreateStayForm } from '@/components/stays/create-stay-form'
import { getGuests } from '@/lib/services/guests'
import { getUnits } from '@/lib/services/units'
import { getPropertyScope, getScopePropertyIds, hasOperationalScope } from '@/lib/services/properties'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Stay' }

interface NewStayPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function NewStayPage({ searchParams }: NewStayPageProps) {
  const profile = await requireRole(['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'])
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasOperationalScope(scope)) {
    return <p className="text-muted-foreground text-sm">Select an accommodation before creating a stay.</p>
  }

  const propertyIds = getScopePropertyIds(scope)
  const [units, guests] = await Promise.all([
    getUnits(scope.organizationId, scope.propertyId, propertyIds),
    getGuests(scope.organizationId, undefined, scope.propertyId, propertyIds),
  ])

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-6">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold">New Stay</h1>
        <CreateStayForm
          properties={scope.properties}
          units={units}
          guests={guests}
          organizationId={scope.organizationId}
        />
      </div>
    </div>
  )
}
