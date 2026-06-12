import { requireRole } from '@/lib/auth'
import { CreateUnitForm } from '@/components/units/create-unit-form'
import { getPropertyScope, hasOperationalScope } from '@/lib/services/properties'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Unit' }

interface NewUnitPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function NewUnitPage({ searchParams }: NewUnitPageProps) {
  const profile = await requireRole(['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'])
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasOperationalScope(scope)) {
    return <p className="text-muted-foreground text-sm">Select an accommodation before creating a unit.</p>
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">New Unit</h1>
      <CreateUnitForm properties={scope.properties} />
    </div>
  )
}
