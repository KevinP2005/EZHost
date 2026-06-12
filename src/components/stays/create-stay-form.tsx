'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createStaySchema, type CreateStayInput } from '@/lib/schemas/stays'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface Props {
  properties: any[]
  units: any[]
  guests: any[]
  organizationId: string
}

export function CreateStayForm({ properties, units, guests, organizationId }: Props) {
  const router = useRouter()
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateStayInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createStaySchema) as any,
    defaultValues: {
      adults: 1,
      children: 0,
      breakfast_included: false,
      breakfast_count_adults: 0,
      breakfast_count_children: 0,
      local_tax_applicable: false,
      source: 'MANUAL',
    },
  })

  const filteredUnits = selectedPropertyId ? units.filter((u) => u.property_id === selectedPropertyId) : units
  const breakfastIncluded = watch('breakfast_included')

  async function onSubmit(data: CreateStayInput) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/stays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, organization_id: organizationId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create stay')
      }
      const stay = await res.json()
      toast.success('Stay created successfully')
      router.push(`/dashboard/stays/${stay.id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Property</Label>
              <Select onValueChange={(v) => { const s = String(v ?? ''); setSelectedPropertyId(s); setValue('property_id', s) }}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.property_id && <p className="text-xs text-destructive">Required</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Unit / Room</Label>
              <Select onValueChange={(v) => setValue('unit_id', String(v ?? ''))} disabled={!filteredUnits.length}>
                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {filteredUnits.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.unit_id && <p className="text-xs text-destructive">Required</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Primary Guest</Label>
            <Select onValueChange={(v) => setValue('primary_guest_id', v ? String(v) : undefined)}>
              <SelectTrigger><SelectValue placeholder="Select guest (optional)" /></SelectTrigger>
              <SelectContent>
                {guests.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.first_name} {g.last_name}{g.email ? ` (${g.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="check_in_date">Check-in Date</Label>
              <Input id="check_in_date" type="date" {...register('check_in_date')} />
              {errors.check_in_date && <p className="text-xs text-destructive">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="check_out_date">Check-out Date</Label>
              <Input id="check_out_date" type="date" {...register('check_out_date')} />
              {errors.check_out_date && <p className="text-xs text-destructive">Required</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="adults">Adults</Label>
              <Input id="adults" type="number" min={1} {...register('adults', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="children">Children</Label>
              <Input id="children" type="number" min={0} {...register('children', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arrival_time">Arrival Time</Label>
              <Input id="arrival_time" type="time" {...register('arrival_time')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departure_time">Departure Time</Label>
              <Input id="departure_time" type="time" {...register('departure_time')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="breakfast_included"
              checked={breakfastIncluded}
              onCheckedChange={(v) => setValue('breakfast_included', !!v)}
            />
            <Label htmlFor="breakfast_included">Breakfast included</Label>
          </div>

          {breakfastIncluded && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div className="space-y-1.5">
                <Label htmlFor="breakfast_count_adults">Breakfast adults</Label>
                <Input id="breakfast_count_adults" type="number" min={0} {...register('breakfast_count_adults', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="breakfast_count_children">Breakfast children</Label>
                <Input id="breakfast_count_children" type="number" min={0} {...register('breakfast_count_children', { valueAsNumber: true })} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="local_tax_applicable"
              onCheckedChange={(v) => setValue('local_tax_applicable', !!v)}
            />
            <Label htmlFor="local_tax_applicable">Local tax applicable</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="external_reference">External Reference (booking number)</Label>
            <Input id="external_reference" {...register('external_reference')} placeholder="e.g. Booking.com #12345" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Guest Notes</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Notes visible to all staff..."
              {...register('notes')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="internal_notes">Internal Notes</Label>
            <textarea
              id="internal_notes"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Internal management notes..."
              {...register('internal_notes')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating…' : 'Create Stay'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
