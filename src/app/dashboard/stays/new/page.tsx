import { requireRole } from '@/lib/auth'
import { CreateServiceStartForm } from '@/components/stays/create-stay-form'
import { getPropertyScope, hasPropertyScope } from '@/lib/services/properties'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Service' }

type BookingPhase = 'overview' | 'availability' | 'booking'

const phases: Array<{ id: BookingPhase; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'availability', label: 'Availability' },
  { id: 'booking', label: 'Booking' },
]

function getActivePhase(step?: string): BookingPhase {
  if (step === 'availability') return 'availability'
  if (step === 'booking') return 'booking'
  return 'overview'
}

function BookingProgress({ activePhase }: { activePhase: BookingPhase }) {
  const activeIndex = phases.findIndex((phase) => phase.id === activePhase)

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="grid grid-cols-3 gap-2">
        {phases.map((phase, index) => {
          const active = phase.id === activePhase
          const complete = index < activeIndex

          return (
            <div key={phase.id} className="space-y-2">
              <div
                className={`h-1 rounded-full ${
                  active || complete ? 'bg-primary' : 'bg-muted'
                }`}
              />
              <p
                className={`text-xs font-medium ${
                  active ? 'text-primary' : complete ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {index + 1}. {phase.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface NewStayPageProps {
  searchParams: Promise<{ property?: string; service?: string; step?: string }>
}

export default async function NewStayPage({ searchParams }: NewStayPageProps) {
  const profile = await requireRole(['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'])
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)
  const activePhase = getActivePhase(params.step)

  if (!hasPropertyScope(scope)) {
    return <p className="text-muted-foreground text-sm">Select an accommodation before creating a service.</p>
  }

  if (params.step === 'availability' && params.service && params.property) {
    const selectedService = params.service
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-6">
        <div className="w-full max-w-2xl space-y-6">
          <h1 className="text-xl font-semibold">New Service</h1>
          <BookingProgress activePhase={activePhase} />
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Availability</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Availability for {selectedService} will be configured here later.
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
        <BookingProgress activePhase={activePhase} />
        <CreateServiceStartForm
          properties={scope.properties}
          initialPropertyId={scope.propertyId}
        />
      </div>
    </div>
  )
}
