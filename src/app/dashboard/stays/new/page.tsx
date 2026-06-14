import { requireRole } from '@/lib/auth'
import { CreateServiceStartForm } from '@/components/stays/create-stay-form'
import { getPropertyScope, hasPropertyScope } from '@/lib/services/properties'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Service' }

interface NewStayPageProps {
  searchParams: Promise<{ property?: string; service?: string; step?: string }>
}

export default async function NewStayPage({ searchParams }: NewStayPageProps) {
  const profile = await requireRole(['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'])
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasPropertyScope(scope)) {
    return <p className="text-muted-foreground text-sm">Select an accommodation before creating a service.</p>
  }

  if (params.step === 'details' && params.service && params.property) {
    const selectedService = params.service
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-6">
        <div className="w-full max-w-2xl space-y-6">
          <h1 className="text-xl font-semibold">New Service</h1>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Next step</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Details for {selectedService} will be configured here later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-6">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold">New Service</h1>
        <CreateServiceStartForm
          properties={scope.properties}
          initialPropertyId={scope.propertyId}
        />
      </div>
    </div>
  )
}
