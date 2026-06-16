import { requireRole } from '@/lib/auth'
import { AvailabilityCalendar, BookingMatrix, CreateServiceStartForm, GuestDetailsStep } from '@/components/stays/create-stay-form'
import { getPropertyScope, hasPropertyScope } from '@/lib/services/properties'
import { createClient } from '@/lib/supabase/server'
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
    room?: string
    rate?: string
    rooms?: string
    adults?: string
    children?: string
    extras?: string
    nightlyPrice?: string
  }>
}

export default async function NewStayPage({ searchParams }: NewStayPageProps) {
  const profile = await requireRole(['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'])
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)
  const activePhase = getActivePhase(params.step)

  if (!hasPropertyScope(scope)) {
    return <p className="text-muted-foreground text-sm">Select an accommodation before creating a service.</p>
  }

  async function getBookingUnits(propertyId: string) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('units')
      .select('id, name, description, unit_type, capacity_adults, capacity_children')
      .eq('property_id', propertyId)
      .eq('status', 'ACTIVE')
      .order('name')

    return data ?? []
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
    const units = await getBookingUnits(params.property)

    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-6">
        <div className="w-full max-w-[1460px] space-y-6">
          <h1 className="text-xl font-semibold">New Service</h1>
          <BookingProgress activePhase={activePhase} />
          <BookingMatrix
            serviceType={params.service}
            propertyId={params.property}
            propertyName={selectedProperty?.name}
            dates={params.dates}
            units={units}
          />
        </div>
      </div>
    )
  }

  if (params.step === 'guest-details' && params.service && params.property) {
    const selectedProperty = scope.properties.find((property) => property.id === params.property)
    const units = await getBookingUnits(params.property)

    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-6">
        <div className="w-full max-w-[1460px] space-y-6">
          <h1 className="text-xl font-semibold">New Service</h1>
          <BookingProgress activePhase={activePhase} />
          <GuestDetailsStep
            propertyId={params.property}
            serviceType={params.service}
            propertyName={selectedProperty?.name}
            dates={params.dates}
            roomId={params.room}
            rateId={params.rate}
            rooms={params.rooms}
            adults={params.adults}
            children={params.children}
            extras={params.extras}
            nightlyPrice={params.nightlyPrice}
            units={units}
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
