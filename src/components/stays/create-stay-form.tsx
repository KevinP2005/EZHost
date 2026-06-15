'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BedDouble, BriefcaseBusiness, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ServiceType = 'overnight_stay' | 'meeting_room' | 'wellness_services'

interface PropertyOption {
  id: string
  name: string
}

interface ServiceOption {
  id: ServiceType
  title: string
  description: string
  available: boolean
  unavailableLabel?: string
  icon: React.ElementType
}

interface Props {
  properties: PropertyOption[]
  initialPropertyId?: string
}

const serviceOptions: ServiceOption[] = [
  {
    id: 'overnight_stay',
    title: 'Overnight Stay',
    description: 'Create a regular room or unit booking.',
    available: true,
    icon: BedDouble,
  },
  {
    id: 'meeting_room',
    title: 'Meeting Room',
    description: 'Book a meeting or event space.',
    available: true,
    icon: BriefcaseBusiness,
  },
  {
    id: 'wellness_services',
    title: 'Wellness Services',
    description: 'Prepare spa, wellness, and treatment bookings.',
    available: false,
    unavailableLabel: 'Higher plan',
    icon: Sparkles,
  },
]

export function CreateServiceStartForm({ properties, initialPropertyId }: Props) {
  const router = useRouter()
  const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropertyId ?? '')
  const [selectedService, setSelectedService] = useState<ServiceType | ''>('')

  const selectedProperty = properties.find((property) => property.id === selectedPropertyId)
  const canContinue = Boolean(selectedPropertyId && selectedService)

  const nextHref = useMemo(() => {
    if (!selectedPropertyId || !selectedService) return ''

    const params = new URLSearchParams({
      property: selectedPropertyId,
      service: selectedService,
      step: 'availability',
    })

    return `/dashboard/stays/new?${params.toString()}`
  }, [selectedPropertyId, selectedService])

  function continueToNextStep() {
    if (!canContinue || !nextHref) return
    router.push(nextHref)
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-1.5">
          <Label>Property</Label>
          <Select value={selectedPropertyId} onValueChange={(value) => setSelectedPropertyId(String(value ?? ''))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select property">
                {selectedProperty?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Service type</Label>
          <div className="grid gap-3">
            {serviceOptions.map((service) => {
              const ServiceIcon = service.icon
              const selected = selectedService === service.id

              return (
                <button
                  key={service.id}
                  type="button"
                  disabled={!service.available}
                  onClick={() => setSelectedService(service.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border border-border bg-card p-3 text-left transition-colors',
                    selected && 'border-primary bg-primary/10',
                    service.available
                      ? 'hover:bg-muted'
                      : 'cursor-not-allowed opacity-55',
                  )}
                >
                  <ServiceIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">{service.title}</span>
                      {service.unavailableLabel && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {service.unavailableLabel}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {service.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="button" disabled={!canContinue} onClick={continueToNextStep}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
