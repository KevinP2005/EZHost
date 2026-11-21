'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Baby,
  BedDouble,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Check,
  PawPrint,
  Plus,
  ReceiptText,
  ScanLine,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
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

/**
 * Client-side mirror of UnitCategoryAvailability (src/lib/services/availability.ts).
 * Declared locally so this client component never pulls in the server module.
 */
export interface BookingCategory {
  categoryId: string
  label: string
  /** unit_categories.description; null when the category has none. */
  description: string | null
  unitType: string
  maxAdults: number
  maxChildren: number
  maxOccupancy: number
  physicalUnits: number
  bookableLimit: number
  availableUnits: number
  /** min(bookableLimit, availableUnits) — the Rooms dropdown never exceeds this. */
  maxSelectable: number
  availableUnitIds: string[]
  unitNames: string[]
  /** Regular price per unit and night from unit_categories.base_rate; null when not set. */
  baseRate: number | null
}

interface RateOption {
  id: string
  label: string
  description: string
  modifier: number
}

interface ExtraOption {
  id: string
  label: string
  description: string
  price: number
  /** true: price is charged per night, false: once per booking. */
  perNight: boolean
  icon: React.ElementType
}

/** Per-category form state. Categories are independent — selecting one never deselects another. */
interface CategorySelection {
  selected: boolean
  quantity: number
  adults: number
  children: number
  rateId: string
}

/** One entry per selected category, handed to the creation payload. */
interface BookingPosition {
  category_id: string
  quantity: number
  adults: number
  children: number
  rate_code: string
  rate_label: string
  room_label: string
  nightly_rate: number
  price_details: Record<string, unknown>
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

/** Placeholder prices for categories without a stored base_rate. */
const defaultRoomBasePrices = [145, 190, 245, 285, 320, 360]

// Fixed offsets from the base price until rates become configurable per
// property. Non-cancellable has no known discount yet, so it starts at the
// regular price; staff can override it per booking.
const rateOptions: RateOption[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Regular rate',
    modifier: 0,
  },
  {
    id: 'breakfast',
    label: 'Breakfast',
    description: 'Breakfast included',
    modifier: 22,
  },
  {
    id: 'non-cancellable',
    label: 'Non-cancellable',
    description: 'No free cancellation',
    modifier: 0,
  },
  {
    id: 'special-rate',
    label: 'Special Rate',
    description: 'Limited offer',
    modifier: -18,
  },
]

const extraOptions: ExtraOption[] = [
  {
    id: 'baby-cot',
    label: 'Babybett',
    description: 'Baby cot set up in the room.',
    price: 15,
    perNight: true,
    icon: Baby,
  },
  {
    id: 'pet',
    label: 'Pet',
    description: 'Pet cleaning and accommodation fee.',
    price: 24,
    perNight: false,
    icon: PawPrint,
  },
]

/** What an extra costs for the whole stay. */
function extraAmount(extra: ExtraOption, nights: number) {
  return extra.perNight ? extra.price * nights : extra.price
}

const idTypeLabels: Record<MainGuestForm['idType'], string> = {
  passport: 'Passport',
  drivers_license: "Driver's License",
  identity_card: 'Identity Card',
}

const confirmationLabels: Record<MainGuestForm['confirmation'], string> = {
  send: 'Send',
  do_not_send: 'Do not send',
}

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

function getDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getTodayDateKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

function isDateInPast(date: Date) {
  return getDateKey(normalizeDate(date)) < getTodayDateKey()
}

function isDateBlocked(date: Date) {
  return isDateInPast(date)
}

function hasPastDateKeys(dateKeys: string[]) {
  const today = getTodayDateKey()

  return dateKeys.some((date) => date < today)
}

function getRangeDates(startDate: Date | null, endDate: Date | null) {
  if (!startDate) return []

  const start = normalizeDate(startDate)
  const end = normalizeDate(endDate ?? startDate)
  const first = start.getTime() <= end.getTime() ? start : end
  const last = start.getTime() <= end.getTime() ? end : start
  const dates: Date[] = []

  for (let day = first; day.getTime() <= last.getTime(); day = addDays(day, 1)) {
    if (!isDateBlocked(day)) {
      dates.push(day)
    }
  }

  return dates
}

function categoryBasePrice(category: BookingCategory, index: number) {
  if (category.baseRate != null) return category.baseRate
  return defaultRoomBasePrices[index] ?? 390 + index * 35
}

function createInitialSelections(categories: BookingCategory[]) {
  return categories.reduce<Record<string, CategorySelection>>((selections, category) => {
    selections[category.categoryId] = {
      selected: false,
      quantity: 1,
      adults: Math.min(2, category.maxAdults),
      children: 0,
      rateId: rateOptions[0]?.id ?? '',
    }

    return selections
  }, {})
}

function createInitialPriceInputs(categories: BookingCategory[]) {
  return categories.reduce<Record<string, string>>((prices, category, index) => {
    rateOptions.forEach((rate) => {
      prices[`${category.categoryId}:${rate.id}`] = String(categoryBasePrice(category, index) + rate.modifier)
    })

    return prices
  }, {})
}

/**
 * Turns the form state into the creation payload — exactly one entry per
 * selected category, with `quantity` carrying how many units of it to book.
 */
function buildPositions(
  categories: BookingCategory[],
  selections: Record<string, CategorySelection>,
  priceInputs: Record<string, string>,
  context: { serviceType: string; nights: number },
): BookingPosition[] {
  return categories
    .filter((category) => selections[category.categoryId]?.selected && category.maxSelectable > 0)
    .map((category) => {
      const selection = selections[category.categoryId]
      const rate = rateOptions.find((option) => option.id === selection.rateId) ?? rateOptions[0]
      const nightlyRate = Number(priceInputs[`${category.categoryId}:${rate.id}`]) || 0

      return {
        category_id: category.categoryId,
        quantity: Math.min(selection.quantity, category.maxSelectable),
        adults: selection.adults,
        children: selection.children,
        rate_code: rate.id,
        rate_label: rate.label,
        room_label: category.label,
        nightly_rate: nightlyRate,
        price_details: {
          service_type: context.serviceType,
          rate_description: rate.description,
          nights: context.nights,
          adults: selection.adults,
          children: selection.children,
          category_id: category.categoryId,
        },
      }
    })
}

function encodePositions(positions: BookingPosition[]) {
  return encodeURIComponent(JSON.stringify(positions))
}

function decodePositions(value?: string): BookingPosition[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(decodeURIComponent(value))
    return Array.isArray(parsed) ? (parsed as BookingPosition[]) : []
  } catch {
    return []
  }
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

interface BookingMatrixProps {
  serviceType: string
  propertyId: string
  propertyName?: string
  dates?: string
  categories: BookingCategory[]
}

interface GuestDetailsStepProps {
  propertyId: string
  serviceType: string
  propertyName?: string
  dates?: string
  positions?: string
  extras?: string
  categories: BookingCategory[]
}

interface MainGuestForm {
  name: string
  address: string
  birthDate: string
  phone: string
  email: string
  idType: 'passport' | 'drivers_license' | 'identity_card'
  idNumber: string
  company: string
  confirmation: 'send' | 'do_not_send'
  notes: string
}

interface AccompanyingGuestForm {
  id: string
  name: string
  birthDate: string
}

export function AvailabilityCalendar({ serviceType, propertyId }: AvailabilityCalendarProps) {
  const router = useRouter()
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const serviceLabel = getServiceLabel(serviceType)
  const visibleMonths = [visibleMonth, addMonths(visibleMonth, 1), addMonths(visibleMonth, 2)]
  const selectedDates = useMemo(() => getRangeDates(rangeStart, rangeEnd), [rangeStart, rangeEnd])

  const selectedPeriodLabel = useMemo(() => {
    const sortedDates = selectedDates.slice().sort((a, b) => a.getTime() - b.getTime())

    if (sortedDates.length === 0) {
      return 'No dates selected'
    }

    if (sortedDates.length === 1) {
      return format(sortedDates[0], 'MMM d')
    }

    return `${format(sortedDates[0], 'MMM d')} – ${format(sortedDates[sortedDates.length - 1], 'MMM d')}`
  }, [selectedDates])

  function clearRange() {
    setRangeStart(null)
    setRangeEnd(null)
    setIsDragging(false)
  }

  function startRangeSelection(day: Date) {
    if (isDateBlocked(day)) return

    if (rangeStart && isSameDay(day, rangeStart)) {
      clearRange()
      return
    }

    const normalizedDay = normalizeDate(day)
    setRangeStart(normalizedDay)
    setRangeEnd(normalizedDay)
    setIsDragging(true)
  }

  function updateRangeSelection(day: Date) {
    if (!isDragging || isDateBlocked(day)) return
    setRangeEnd(normalizeDate(day))
  }

  function handleCalendarPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return

    const hoveredElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-calendar-date]')
    const hoveredDate = hoveredElement?.dataset.calendarDate

    if (!hoveredDate) return

    updateRangeSelection(new Date(`${hoveredDate}T00:00:00`))
  }

  function finishRangeSelection() {
    setIsDragging(false)
  }

  function continueToBooking() {
    if (selectedDates.length === 0 || selectedDates.some(isDateInPast)) return

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

        <div
          className="grid grid-cols-1 divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0"
          onPointerMove={handleCalendarPointerMove}
          onPointerUp={finishRangeSelection}
          onPointerCancel={finishRangeSelection}
        >
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
                  const selected = selectedDates.some((date) => isSameDay(date, day))
                  const isRangeStart = Boolean(rangeStart && selected && isSameDay(day, rangeStart))
                  const isRangeEnd = Boolean(rangeEnd && selected && isSameDay(day, rangeEnd))
                  const isRangeEdge = isRangeStart || isRangeEnd
                  const isRangeMiddle = selected && !isRangeEdge
                  const blocked = isDateBlocked(day)

                  if (!inMonth) {
                    return (
                      <div
                        key={day.toISOString()}
                        className="aspect-square rounded-md"
                        aria-hidden="true"
                      />
                    )
                  }

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      data-calendar-date={getDateKey(day)}
                      disabled={blocked}
                      onPointerDown={(event) => {
                        event.preventDefault()
                        startRangeSelection(day)
                      }}
                      onPointerEnter={() => updateRangeSelection(day)}
                      onPointerUp={finishRangeSelection}
                      onPointerCancel={finishRangeSelection}
                      className={cn(
                        'flex aspect-square touch-none select-none items-center justify-center rounded-md text-sm transition-colors',
                        !selected && !blocked && 'text-foreground hover:bg-muted',
                        isRangeMiddle && 'bg-primary/20 text-primary ring-1 ring-inset ring-primary/15',
                        isRangeEdge && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
                        blocked && 'cursor-not-allowed bg-muted/50 text-muted-foreground line-through opacity-60',
                      )}
                      aria-label={blocked ? `${format(day, 'MMMM d, yyyy')} unavailable` : format(day, 'MMMM d, yyyy')}
                      aria-pressed={selected}
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
          <div className="min-h-8 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Selected period</p>
            <p className="mt-0.5 font-semibold text-foreground">{selectedPeriodLabel}</p>
          </div>

          <Button type="button" disabled={selectedDates.length === 0 || selectedDates.some(isDateInPast)} onClick={continueToBooking}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function parseDateKeys(dateKeys?: string) {
  return dateKeys
    ?.split(',')
    .map((date) => date.trim())
    .filter(Boolean) ?? []
}

function formatBookingPeriod(dateKeys: string[]) {
  if (dateKeys.length === 0) return 'No period selected'
  if (hasPastDateKeys(dateKeys)) return 'Past dates are not bookable'

  const sortedDates = dateKeys.slice().sort()
  const firstDate = new Date(`${sortedDates[0]}T00:00:00`)
  const lastDate = new Date(`${sortedDates[sortedDates.length - 1]}T00:00:00`)

  if (sortedDates.length === 1) {
    return format(firstDate, 'MMM d')
  }

  return `${format(firstDate, 'MMM d')} – ${format(lastDate, 'MMM d')}`
}

export function BookingMatrix({ serviceType, propertyId, propertyName, dates, categories }: BookingMatrixProps) {
  const router = useRouter()
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([])
  const [selections, setSelections] = useState<Record<string, CategorySelection>>(() => createInitialSelections(categories))
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>(() => createInitialPriceInputs(categories))
  const serviceLabel = getServiceLabel(serviceType)
  const dateKeys = useMemo(() => parseDateKeys(dates), [dates])
  const hasPastDates = hasPastDateKeys(dateKeys)
  const nights = Math.max(dateKeys.length, 1)

  const selectedExtras = extraOptions.filter((extra) => selectedExtraIds.includes(extra.id))
  const extrasTotal = selectedExtras.reduce((total, extra) => total + extraAmount(extra, nights), 0)

  // Every selected category contributes its own line; nothing is collapsed
  // into a single "selected room" any more.
  const positions = buildPositions(categories, selections, priceInputs, { serviceType, nights })
  const lines = positions.map((position) => {
    const category = categories.find((entry) => entry.categoryId === position.category_id)
    return {
      position,
      label: category?.label ?? position.room_label,
      subtotal: position.nightly_rate * nights * position.quantity,
    }
  })
  const roomTotal = lines.reduce((total, line) => total + line.subtotal, 0)
  const total = roomTotal + extrasTotal
  const totalRooms = positions.reduce((count, position) => count + position.quantity, 0)
  const totalGuests = positions.reduce(
    (count, position) => count + (position.adults + position.children) * position.quantity,
    0,
  )
  const taxPreview = Math.max(nights * 3 * totalGuests, 0)
  const canContinue = !hasPastDates && positions.length > 0

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No rooms are configured for this property yet.</p>
        </CardContent>
      </Card>
    )
  }

  function toggleExtra(extraId: string) {
    setSelectedExtraIds((current) => (
      current.includes(extraId)
        ? current.filter((id) => id !== extraId)
        : [...current, extraId]
    ))
  }

  function updateSelection(categoryId: string, patch: Partial<CategorySelection>) {
    setSelections((current) => ({
      ...current,
      [categoryId]: { ...current[categoryId], ...patch },
    }))
  }

  /** Toggling a category leaves every other category untouched. */
  function toggleCategory(category: BookingCategory) {
    if (category.maxSelectable === 0) return

    setSelections((current) => {
      const entry = current[category.categoryId]
      return {
        ...current,
        [category.categoryId]: {
          ...entry,
          selected: !entry.selected,
          quantity: Math.min(Math.max(entry.quantity, 1), category.maxSelectable),
        },
      }
    })
  }

  /** Picking a rate cell also selects that category, but never deselects others. */
  function chooseRate(category: BookingCategory, rateId: string) {
    if (category.maxSelectable === 0) return

    setSelections((current) => ({
      ...current,
      [category.categoryId]: {
        ...current[category.categoryId],
        selected: true,
        rateId,
        quantity: Math.min(Math.max(current[category.categoryId].quantity, 1), category.maxSelectable),
      },
    }))
  }

  function updatePrice(categoryId: string, rateId: string, value: string) {
    if (!/^\d*$/.test(value)) return

    setPriceInputs((current) => ({
      ...current,
      [`${categoryId}:${rateId}`]: value,
    }))
  }

  function continueToGuestDetails() {
    if (!canContinue) return

    const params = new URLSearchParams({
      property: propertyId,
      service: serviceType,
      step: 'guest-details',
    })

    if (dates) {
      params.set('dates', dates)
    }

    params.set('positions', encodePositions(positions))

    if (selectedExtraIds.length > 0) {
      params.set('extras', selectedExtraIds.join(','))
    }

    router.push(`/dashboard/stays/new?${params.toString()}`)
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-4">
            <p className="text-xs font-medium text-muted-foreground">Selected service</p>
            <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-base font-semibold text-foreground">{serviceLabel}</h2>
              <p className="text-xs text-muted-foreground">
                {propertyName ?? propertyId} · Prices excl. local tax and taxes
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[270px_repeat(4,minmax(160px,1fr))] border-b border-border bg-muted/30">
                <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Room category
                </div>
                {rateOptions.map((rate) => (
                  <div key={rate.id} className="border-l border-border px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{rate.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{rate.description}</p>
                  </div>
                ))}
              </div>

              {categories.map((category) => {
                const selection = selections[category.categoryId]
                const soldOut = category.maxSelectable === 0
                const isSelected = Boolean(selection?.selected)

                return (
                  <div
                    key={category.categoryId}
                    className="grid grid-cols-[270px_repeat(4,minmax(160px,1fr))] border-b border-border last:border-b-0"
                  >
                    <div
                      className={cn(
                        'px-4 py-4 transition-colors',
                        isSelected && 'bg-primary/10',
                        soldOut && 'opacity-60',
                      )}
                    >
                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => toggleCategory(category)}
                        aria-pressed={isSelected}
                        className={cn(
                          'block w-full rounded-md text-left transition-colors',
                          soldOut ? 'cursor-not-allowed' : 'hover:text-primary',
                        )}
                      >
                        <span className="block text-sm font-semibold text-foreground">{category.label}</span>
                        {category.description && (
                          // Clamped to two lines; the full text stays reachable on hover.
                          <span
                            title={category.description}
                            className="mt-1 line-clamp-2 text-xs text-muted-foreground"
                          >
                            {category.description}
                          </span>
                        )}
                        <span className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>
                            {soldOut ? 'Not available' : `${category.maxSelectable} available`}
                            {category.physicalUnits > 1 && ` of ${category.physicalUnits}`}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" aria-hidden="true" />
                            up to {category.maxOccupancy}
                          </span>
                        </span>
                      </button>

                      <div className="mt-3 grid grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Rooms</p>
                          <Select
                            value={String(selection?.quantity ?? 1)}
                            disabled={soldOut || !isSelected}
                            onValueChange={(value) =>
                              updateSelection(category.categoryId, { quantity: Number(value ?? '1') })
                            }
                          >
                            <SelectTrigger className="h-8 min-w-[64px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="min-w-(--anchor-width)">
                              {Array.from(
                                { length: Math.max(category.maxSelectable, 1) },
                                (_, index) => index + 1,
                              ).map((value) => (
                                <SelectItem key={value} value={String(value)}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Adults</p>
                          <Select
                            value={String(selection?.adults ?? 2)}
                            disabled={soldOut}
                            onValueChange={(value) =>
                              updateSelection(category.categoryId, { adults: Number(value ?? '1') })
                            }
                          >
                            <SelectTrigger className="h-8 min-w-[64px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="min-w-(--anchor-width)">
                              {Array.from({ length: category.maxAdults }, (_, index) => index + 1).map((value) => (
                                <SelectItem key={value} value={String(value)}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Children</p>
                          <Select
                            value={String(selection?.children ?? 0)}
                            disabled={soldOut}
                            onValueChange={(value) =>
                              updateSelection(category.categoryId, { children: Number(value ?? '0') })
                            }
                          >
                            <SelectTrigger className="h-8 min-w-[64px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="min-w-(--anchor-width)">
                              {Array.from({ length: category.maxChildren + 1 }, (_, index) => index).map((value) => (
                                <SelectItem key={value} value={String(value)}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {rateOptions.map((rate) => {
                      const active = isSelected && selection?.rateId === rate.id
                      const priceKey = `${category.categoryId}:${rate.id}`
                      const price = priceInputs[priceKey] ?? ''

                      return (
                        <div
                          key={`${category.categoryId}-${rate.id}`}
                          className={cn(
                            'flex min-h-[112px] items-center border-l border-border px-4 py-3 transition-colors',
                            !soldOut && 'hover:bg-muted/40',
                            active && 'bg-primary/10',
                            soldOut && 'opacity-60',
                          )}
                        >
                          <div className="w-full min-w-0">
                            <Label className="text-[11px] font-medium text-muted-foreground">EUR / night</Label>
                            <div className="mt-1 flex items-center gap-4">
                              <Input
                                inputMode="numeric"
                                value={price}
                                disabled={soldOut}
                                onChange={(event) => updatePrice(category.categoryId, rate.id, event.target.value)}
                                className="h-10 min-w-0 flex-1 text-sm font-semibold"
                                aria-label={`${category.label} ${rate.label} price per night`}
                              />
                              <button
                                type="button"
                                disabled={soldOut}
                                onClick={() => chooseRate(category, rate.id)}
                                aria-label={`Select ${rate.label} for ${category.label}`}
                                className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors',
                                  active
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-background text-muted-foreground',
                                  soldOut && 'cursor-not-allowed',
                                )}
                              >
                                {active ? <Check className="h-4 w-4" aria-hidden="true" /> : '+'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Extras</h3>
                <p className="text-xs text-muted-foreground">Optional add-ons for this booking.</p>
              </div>
              <p className="text-[11px] text-muted-foreground">Org admins can manage these later.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {extraOptions.map((extra) => {
                const ExtraIcon = extra.icon
                const active = selectedExtraIds.includes(extra.id)

                return (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => toggleExtra(extra.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-md border border-border bg-background p-3 text-left transition-colors hover:bg-muted/40',
                      active && 'border-primary bg-primary/10',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <ExtraIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{extra.label}</span>
                      <span className="block text-xs text-muted-foreground">{extra.description}</span>
                    </span>
                    <span className="text-right text-sm font-semibold text-foreground">
                      {formatCurrency(extra.price)}
                      {extra.perNight && <span className="block text-[11px] font-normal text-muted-foreground">per night</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden xl:sticky xl:top-5 xl:self-start">
        <CardContent className="p-0">
          <div className="border-b border-border bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-base font-semibold text-foreground">Booking summary</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{propertyName ?? 'Selected accommodation'}</p>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <p className="text-sm text-muted-foreground">{formatBookingPeriod(dateKeys)}</p>
              {lines.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Select at least one room category to continue.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {lines.map((line) => (
                    <div key={line.position.category_id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {line.position.quantity} × {line.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {line.position.rate_label} · {line.position.adults} adults
                          {line.position.children > 0 ? `, ${line.position.children} children` : ''} · each
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        {formatCurrency(line.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Rooms</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{totalRooms}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Nights</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{nights}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{positions.length}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Guests</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{totalGuests}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Rooms</span>
                <span className="font-semibold text-foreground">{formatCurrency(roomTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Extras</span>
                <span className="font-semibold text-foreground">{formatCurrency(extrasTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-semibold text-foreground">{formatCurrency(0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Local tax preview</span>
                <span className="text-muted-foreground">not included · approx. {formatCurrency(taxPreview)}</span>
              </div>
            </div>

            {selectedExtras.length > 0 && (
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs font-medium text-muted-foreground">Selected extras</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedExtras.map((extra) => (
                    <span
                      key={extra.id}
                      className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                    >
                      {extra.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <div className="flex items-end justify-between gap-4">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-3xl font-bold text-foreground">{formatCurrency(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Excl. local tax and applicable taxes.</p>
            </div>

            {hasPastDates && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                Past dates cannot be booked. Please choose a current or future stay period.
              </p>
            )}

            <Button type="button" className="w-full" disabled={!canContinue} onClick={continueToGuestDetails}>
              Continue to guest details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function GuestDetailsStep({
  propertyId,
  serviceType,
  propertyName,
  dates,
  positions: encodedPositions,
  extras,
  categories,
}: GuestDetailsStepProps) {
  const router = useRouter()
  const [mainGuest, setMainGuest] = useState<MainGuestForm>({
    name: '',
    address: '',
    birthDate: '',
    phone: '',
    email: '',
    idType: 'passport',
    idNumber: '',
    company: '',
    confirmation: 'send',
    notes: '',
  })
  const [accompanyingGuests, setAccompanyingGuests] = useState<AccompanyingGuestForm[]>([])
  const [isSubmittingAs, setIsSubmittingAs] = useState<'CONFIRMED' | 'OFFER' | null>(null)
  const serviceLabel = getServiceLabel(serviceType)
  const dateKeys = useMemo(() => parseDateKeys(dates), [dates])
  const hasPastDates = hasPastDateKeys(dateKeys)
  const nights = Math.max(dateKeys.length, 1)
  const positions = useMemo(() => decodePositions(encodedPositions), [encodedPositions])

  const checkInDate = dateKeys[0]
  const checkOutDate = useMemo(() => {
    if (dateKeys.length === 0) return undefined
    return format(addDays(new Date(`${dateKeys[dateKeys.length - 1]}T00:00:00`), 1), 'yyyy-MM-dd')
  }, [dateKeys])

  // Availability is re-read server-side on every render of this step, so a
  // category that filled up in the meantime surfaces before submitting.
  const lines = positions.map((position) => {
    const category = categories.find((entry) => entry.categoryId === position.category_id)
    return {
      position,
      label: category?.label ?? position.room_label,
      subtotal: position.nightly_rate * nights * position.quantity,
      shortfall: category ? Math.max(position.quantity - category.maxSelectable, 0) : position.quantity,
      available: category?.maxSelectable ?? 0,
    }
  })
  const unavailableLines = lines.filter((line) => line.shortfall > 0)

  const selectedExtraIds = parseDateKeys(extras)
  const selectedExtras = extraOptions.filter((extra) => selectedExtraIds.includes(extra.id))
  const roomTotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const extrasTotal = selectedExtras.reduce((total, extra) => total + extraAmount(extra, nights), 0)
  const totalRooms = positions.reduce((count, position) => count + position.quantity, 0)
  const totalGuests = positions.reduce(
    (count, position) => count + (position.adults + position.children) * position.quantity,
    0,
  )
  const taxPreview = Math.max(nights * 3 * totalGuests, 0)
  const total = roomTotal + extrasTotal

  if (positions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No room categories selected. Go back and pick at least one category.
          </p>
        </CardContent>
      </Card>
    )
  }

  function updateMainGuest<K extends keyof MainGuestForm>(field: K, value: MainGuestForm[K]) {
    setMainGuest((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function addAccompanyingGuest() {
    setAccompanyingGuests((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: '',
        birthDate: '',
      },
    ])
  }

  function updateAccompanyingGuest(id: string, field: keyof Omit<AccompanyingGuestForm, 'id'>, value: string) {
    setAccompanyingGuests((current) => (
      current.map((guest) => (
        guest.id === id
          ? { ...guest, [field]: value }
          : guest
      ))
    ))
  }

  function removeAccompanyingGuest(id: string) {
    setAccompanyingGuests((current) => current.filter((guest) => guest.id !== id))
  }

  async function submitFlow(bookingStatus: 'CONFIRMED' | 'OFFER') {
    if (isSubmittingAs) return

    if (!mainGuest.name.trim()) {
      toast.error('Primary guest name is required.')
      return
    }

    if (!mainGuest.address.trim()) {
      toast.error('Address is required.')
      return
    }

    if (!mainGuest.birthDate) {
      toast.error('Date of birth is required.')
      return
    }

    if (!mainGuest.phone.trim()) {
      toast.error('Phone number is required.')
      return
    }

    if (!mainGuest.email.trim()) {
      toast.error('Email address is required.')
      return
    }

    if (!mainGuest.idNumber.trim()) {
      toast.error('ID number is required.')
      return
    }

    if (accompanyingGuests.some((guest) => !guest.name.trim() || !guest.birthDate)) {
      toast.error('Each additional guest needs a name and date of birth.')
      return
    }

    if (dateKeys.length === 0) {
      toast.error('Please select a valid stay period first.')
      return
    }

    if (hasPastDates) {
      toast.error('Past dates cannot be booked. Please choose a current or future stay period.')
      return
    }

    if (unavailableLines.length > 0) {
      toast.error(
        `Not enough availability for ${unavailableLines.map((line) => line.label).join(', ')}. Please adjust the selection.`,
      )
      return
    }

    if (!checkOutDate) {
      toast.error('Please select a valid stay period first.')
      return
    }

    setIsSubmittingAs(bookingStatus)

    try {
      const res = await fetch('/api/stays/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          booking_status: bookingStatus,
          currency: 'EUR',
          confirmation_preference: mainGuest.confirmation,
          internal_notes: mainGuest.notes,
          extras_amount: extrasTotal,
          extras_details: selectedExtras.map((extra) => ({
            id: extra.id,
            label: extra.label,
            price: extra.price,
            per_night: extra.perNight,
            amount: extraAmount(extra, nights),
          })),
          positions,
          primary_guest: mainGuest,
          accompanying_guests: accompanyingGuests,
        }),
      })

      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to save booking')
      }

      if (payload.email_warning) {
        toast.warning(payload.email_warning)
      } else {
        toast.success(bookingStatus === 'CONFIRMED' ? 'Booking saved.' : 'Offer saved.')
      }
      router.push(`/dashboard/stays/${encodeURIComponent(payload.id)}`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong.')
    } finally {
      setIsSubmittingAs(null)
    }
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Selected service</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">{serviceLabel}</h2>
          </div>
          <Button type="button" variant="outline" className="gap-2 self-start sm:self-auto">
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Scan
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-5 pt-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Primary Guest</h3>
              <p className="mt-1 text-xs text-muted-foreground">Arrival details for the main guest.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Name</Label>
                <div data-guest-name-field="combobox-ready" className="relative">
                  <Input
                    value={mainGuest.name}
                    onChange={(event) => updateMainGuest('name', event.target.value)}
                    autoComplete="name"
                    placeholder="Primary guest name"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Address</Label>
                <Input
                  value={mainGuest.address}
                  onChange={(event) => updateMainGuest('address', event.target.value)}
                  autoComplete="street-address"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={mainGuest.birthDate}
                  onChange={(event) => updateMainGuest('birthDate', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  value={mainGuest.phone}
                  onChange={(event) => updateMainGuest('phone', event.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={mainGuest.email}
                  onChange={(event) => updateMainGuest('email', event.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input
                  value={mainGuest.company}
                  onChange={(event) => updateMainGuest('company', event.target.value)}
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Type of ID</Label>
                <Select
                  value={mainGuest.idType}
                  onValueChange={(value) => updateMainGuest('idType', String(value ?? 'passport') as MainGuestForm['idType'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{idTypeLabels[mainGuest.idType]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver&apos;s License</SelectItem>
                    <SelectItem value="identity_card">Identity Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>ID Number</Label>
                <Input
                  value={mainGuest.idNumber}
                  onChange={(event) => updateMainGuest('idNumber', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Confirmation</Label>
                <Select
                  value={mainGuest.confirmation}
                  onValueChange={(value) => updateMainGuest('confirmation', String(value ?? 'send') as MainGuestForm['confirmation'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{confirmationLabels[mainGuest.confirmation]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send">Send</SelectItem>
                    <SelectItem value="do_not_send">Do not send</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Internal Notes</Label>
                <Textarea
                  value={mainGuest.notes}
                  onChange={(event) => updateMainGuest('notes', event.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Additional Guests</h3>
                <p className="mt-1 text-xs text-muted-foreground">Name and date of birth are enough for accompanying guests.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addAccompanyingGuest}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Guest
              </Button>
            </div>

            {accompanyingGuests.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                No additional guests added yet.
              </div>
            ) : (
              <div className="space-y-3">
                {accompanyingGuests.map((guest, index) => (
                  <div key={guest.id} className="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[1fr_180px_auto] md:items-end">
                    <div className="space-y-1.5">
                      <Label>Additional Guest {index + 1}</Label>
                      <Input
                        value={guest.name}
                        onChange={(event) => updateAccompanyingGuest(guest.id, 'name', event.target.value)}
                        placeholder="Name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={guest.birthDate}
                        onChange={(event) => updateAccompanyingGuest(guest.id, 'birthDate', event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeAccompanyingGuest(guest.id)}
                      aria-label={`Remove additional guest ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            size="lg"
            disabled={isSubmittingAs !== null || unavailableLines.length > 0}
            onClick={() => submitFlow('CONFIRMED')}
          >
            {isSubmittingAs === 'CONFIRMED' ? 'Saving Booking...' : 'Confirm Booking'}
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={isSubmittingAs !== null || unavailableLines.length > 0}
            onClick={() => submitFlow('OFFER')}
            className="border border-primary/60 bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {isSubmittingAs === 'OFFER' ? 'Saving Offer...' : 'Create Offer'}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden 2xl:sticky 2xl:top-5 2xl:self-start">
        <CardContent className="p-0">
          <div className="border-b border-border bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-base font-semibold text-foreground">Booking summary</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{propertyName ?? 'Selected accommodation'}</p>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <p className="text-sm text-muted-foreground">{formatBookingPeriod(dateKeys)}</p>
              <div className="mt-2 space-y-2">
                {lines.map((line) => (
                  <div key={line.position.category_id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {line.position.quantity} × {line.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {line.position.rate_label} · {line.position.adults} adults
                        {line.position.children > 0 ? `, ${line.position.children} children` : ''} · each
                      </p>
                      {line.shortfall > 0 && (
                        <p className="mt-0.5 text-xs font-medium text-destructive">
                          Only {line.available} available now
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {formatCurrency(line.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Rooms</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{totalRooms}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Nights</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{nights}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{positions.length}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Guests</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{totalGuests}</p>
              </div>
            </div>

            {unavailableLines.length > 0 && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                Availability changed for {unavailableLines.map((line) => line.label).join(', ')}. Go back and adjust
                the selection — nothing has been saved.
              </p>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Rooms</span>
                <span className="font-semibold text-foreground">{formatCurrency(roomTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Extras</span>
                <span className="font-semibold text-foreground">{formatCurrency(extrasTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-semibold text-foreground">{formatCurrency(0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Local tax preview</span>
                <span className="text-muted-foreground">not included · approx. {formatCurrency(taxPreview)}</span>
              </div>
            </div>

            {selectedExtras.length > 0 && (
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs font-medium text-muted-foreground">Selected extras</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedExtras.map((extra) => (
                    <span
                      key={extra.id}
                      className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                    >
                      {extra.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <div className="flex items-end justify-between gap-4">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-3xl font-bold text-foreground">{formatCurrency(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Excl. local tax and applicable taxes.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
