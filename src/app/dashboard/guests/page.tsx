import { requireAuth } from '@/lib/auth'
import { getGuests } from '@/lib/services/guests'
import { getPropertyScope, getScopePropertyIds, hasOperationalScope } from '@/lib/services/properties'
import { GuestsList } from '@/components/guests/guests-list'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Guests' }

interface Props {
  searchParams: Promise<{ q?: string; property?: string }>
}

export default async function GuestsPage({ searchParams }: Props) {
  const profile = await requireAuth()
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasOperationalScope(scope)) return <p className="text-muted-foreground text-sm">Select an accommodation to view guests.</p>

  const guests = await getGuests(scope.organizationId, params.q, scope.propertyId, getScopePropertyIds(scope))

  return (
    <GuestsList
      guests={guests}
      search={params.q}
      canEdit={['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'].includes(profile.role)}
    />
  )
}
