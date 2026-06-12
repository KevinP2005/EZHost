'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUnitSchema, type CreateUnitInput } from '@/lib/schemas/units'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface Props {
  properties: { id: string; name: string }[]
}

export function CreateUnitForm({ properties }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateUnitInput>({ resolver: zodResolver(createUnitSchema) as any })

  async function onSubmit(data: CreateUnitInput) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create unit')
      }
      toast.success('Unit created')
      router.push('/dashboard/units')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Property *</Label>
            <Select onValueChange={(v) => setValue('property_id', String(v ?? ''))}>
              <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.property_id && <p className="text-xs text-destructive">Required</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Unit Name *</Label>
            <Input id="name" placeholder="e.g. Room 101, Apartment A" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">Required</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Unit Type</Label>
            <Select defaultValue="ROOM" onValueChange={(v) => setValue('unit_type', (v ?? 'ROOM') as CreateUnitInput['unit_type'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['ROOM', 'APARTMENT', 'CHALET', 'HOUSE', 'DORM', 'OTHER'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="capacity_adults">Adults Capacity</Label>
              <Input id="capacity_adults" type="number" min={1} defaultValue={2} {...register('capacity_adults', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity_children">Children Capacity</Label>
              <Input id="capacity_children" type="number" min={0} defaultValue={0} {...register('capacity_children', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="floor">Floor</Label>
              <Input id="floor" placeholder="e.g. 1, 2, G" {...register('floor')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Creating…' : 'Create Unit'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
