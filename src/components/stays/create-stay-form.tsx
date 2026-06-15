'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BedDouble,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

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

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getServiceLabel(serviceType: string) {
  return serviceOptions.find((service) => service.id === serviceType)?.title
    ?? serviceType
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
}

function getCalendarDays(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const days: Date[] = []

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    days.push(day)
  }

  return days
}

function isUnavailable(day: Date) {
  const dayOfWeek = day.getDay()
  const dayOfMonth = day.getDate()

  return dayOfWeek === 0 || dayOfMonth === 8 || dayOfMonth === 16 || dayOfMonth === 24
}

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

interface AvailabilityCalendarProps {
  serviceType: string
  propertyId: string
}

export function AvailabilityCalendar({ serviceType, propertyId }: AvailabilityCalendarProps) {
  const router = useRouter()
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const serviceLabel = getServiceLabel(serviceType)
  const visibleMonths = [visibleMonth, addMonths(visibleMonth, 1), addMonths(visibleMonth, 2)]

  const selectedDatesLabel = selectedDates
    .slice()
    .sort((a, b) => a.getTime() - b.getTime())
    .map((date) => format(date, 'MMM d'))
    .join(', ')

  function toggleDate(day: Date) {
    if (isUnavailable(day)) return

    setSelectedDates((current) => {
      if (current.some((date) => isSameDay(date, day))) {
        return current.filter((date) => !isSameDay(date, day))
      }

      return [...current, day]
    })
  }

  function continueToBooking() {
    const params = new URLSearchParams({
      property: propertyId,
      service: serviceType,
      step: 'booking',
    })

    if (selectedDates.length > 0) {
      params.set(
        'dates',
        selectedDates
          .slice()
          .sort((a, b) => a.getTime() - b.getTime())
          .map((date) => format(date, 'yyyy-MM-dd'))
          .join(','),
      )
    }

    router.push(`/dashboard/stays/new?${params.toString()}`)
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Selected service</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">{serviceLabel}</h2>
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <p className="text-sm font-medium text-foreground">
            {format(visibleMonth, 'MMMM yyyy')} - {format(endOfMonth(addMonths(visibleMonth, 2)), 'MMMM yyyy')}
          </p>

          <button
            type="button"
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {visibleMonths.map((month) => (
            <section key={month.toISOString()} className="p-4">
              <div className="mb-4 text-center text-sm font-medium text-foreground">
                {format(month, 'MMMM yyyy')}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayLabels.map((weekday) => (
                  <div key={weekday} className="pb-2 text-[11px] font-medium text-muted-foreground">
                    {weekday}
                  </div>
                ))}

                {getCalendarDays(month).map((day) => {
                  const inMonth = isSameMonth(day, month)
                  const unavailable = inMonth && isUnavailable(day)
                  const selected = selectedDates.some((date) => isSameDay(date, day))

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={!inMonth || unavailable}
                      onClick={() => toggleDate(day)}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-md text-sm transition-colors',
                        !inMonth && 'text-transparent',
                        inMonth && !unavailable && !selected && 'text-foreground hover:bg-muted',
                        unavailable && 'cursor-not-allowed bg-muted/50 text-muted-foreground line-through opacity-60',
                        selected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                      )}
                      aria-label={format(day, 'MMMM d, yyyy')}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Available</span>
            <span>Unavailable</span>
            <span>Selected: {selectedDates.length}</span>
            <span>
              Days: {
                selectedDates.length > 1
                  ? differenceInCalendarDays(
                    new Date(Math.max(...selectedDates.map((date) => date.getTime()))),
                    new Date(Math.min(...selectedDates.map((date) => date.getTime()))),
                  ) + 1
                  : selectedDates.length
              }
            </span>
          </div>

          <Button type="button" disabled={selectedDates.length === 0} onClick={continueToBooking}>
            Continue
          </Button>
        </div>

        {selectedDates.length > 0 && (
          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {selectedDatesLabel}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
