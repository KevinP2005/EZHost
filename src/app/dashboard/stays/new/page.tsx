import { requireRole } from '@/lib/auth'
import { AvailabilityCalendar, BookingMatrix, CreateServiceStartForm, GuestDetailsStep } from '@/components/stays/create-stay-form'
import { getPropertyScope, hasPropertyScope } from '@/lib/services/properties'
import { getCategoryAvailability } from '@/lib/services/availability'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Service' }

type BookingPhase = 'overview' | 'availability' | 'booking' | 'guest-details'

const phases: Array<{ id: BookingPhase; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'availability', label: 'Availability' },
  { id: 'booking', label: 'Booking' },
  { id: 'guest-details', label: 'Guest Details' },
]

function getActivePhase(step?: string): BookingPhase {
  if (step === 'availability') return 'availability'
  if (step === 'booking') return 'booking'
  if (step === 'guest-details') return 'guest-details'
  return 'overview'
}

function BookingProgress({ activePhase }: { activePhase: BookingPhase }) {
  const activeIndex = phases.findIndex((phase) => phase.id === activePhase)

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="grid grid-cols-4 gap-2">
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
                className={`text-center text-xs font-medium ${
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
  searchParams: Promise<{
    property?: string
    service?: string
    step?: string
    dates?: string
    /** JSON-encoded booking positions, one per selected category. */
    positions?: string
    extras?: string
  }>
}

/** The `dates` param carries the selected nights; check-out is the day after the last one. */
function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  // Rejects impossible dates like 2026-02-31, which Date would roll over.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function derivePeriod(dates?: string) {
  // Malformed keys from a hand-edited URL are dropped instead of crashing the page.
  const dateKeys = dates
    ?.split(',')
    .map((date) => date.trim())
    .filter(isDateKey)
    .sort() ?? []

  // `dates` is the sanitized param handed on to the client steps, which would
  // otherwise trip over the same malformed keys when formatting them.
  if (dateKeys.length === 0) return { dates: undefined, checkInDate: null, checkOutDate: null }

  // UTC throughout, so the server's timezone can't shift check-out by a day.
  const lastNight = new Date(`${dateKeys[dateKeys.length - 1]}T00:00:00Z`)
  lastNight.setUTCDate(lastNight.getUTCDate() + 1)

  return {
    dates: dateKeys.join(','),
    checkInDate: dateKeys[0],
    checkOutDate: lastNight.toISOString().slice(0, 10),
  }
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
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-6">
        <div className="w-full max-w-5xl space-y-6">
          <h1 className="text-xl font-semibold">New Service</h1>
          <BookingProgress activePhase={activePhase} />
          <AvailabilityCalendar serviceType={params.service} propertyId={params.property} />
        </div>
      </div>
    )
  }

  if (params.step === 'booking' && params.service && params.property) {
    const selectedProperty = scope.properties.find((property) => property.id === params.property)
    const period = derivePeriod(params.dates)
    const categories = await getCategoryAvailability({
      propertyId: params.property,
      checkInDate: period.checkInDate,
      checkOutDate: period.checkOutDate,
    })

    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-6">
        <div className="w-full max-w-[1460px] space-y-6">
          <h1 className="text-xl font-semibold">New Service</h1>
          <BookingProgress activePhase={activePhase} />
          <BookingMatrix
            serviceType={params.service}
            propertyId={params.property}
            propertyName={selectedProperty?.name}
            dates={period.dates}
            categories={categories}
          />
        </div>
      </div>
    )
  }

  if (params.step === 'guest-details' && params.service && params.property) {
    const selectedProperty = scope.properties.find((property) => property.id === params.property)
    const period = derivePeriod(params.dates)
    // Re-read availability here too: the guest step shows the final summary and
    // must not present a category that filled up while the form was open.
    const categories = await getCategoryAvailability({
      propertyId: params.property,
      checkInDate: period.checkInDate,
      checkOutDate: period.checkOutDate,
    })

    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-6">
        <div className="w-full max-w-[1460px] space-y-6">
          <h1 className="text-xl font-semibold">New Service</h1>
          <BookingProgress activePhase={activePhase} />
          <GuestDetailsStep
            propertyId={params.property}
            serviceType={params.service}
            propertyName={selectedProperty?.name}
            dates={period.dates}
            positions={params.positions}
            extras={params.extras}
            categories={categories}
          />
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
