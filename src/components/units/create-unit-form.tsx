'use client'

import { useEffect, useState } from 'react'
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

interface UnitCategoryOption {
  id: string
  name: string
  unit_type: string
  capacity_adults: number
  capacity_children: number
}

const NEW_CATEGORY_VALUE = '__new__'

/**
 * Unit creation always needs a category (Property -> Unit Category -> Units).
 * There is no dedicated category management screen yet, so this form lets an
 * admin either pick an existing category for the property or create one
 * inline — just enough to keep unit creation working, not a category admin UI.
 */
export function CreateUnitForm({ properties }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<UnitCategoryOption[]>([])
  const [categorySelection, setCategorySelection] = useState<string>('')
  const [newCategory, setNewCategory] = useState({
    name: '',
    unit_type: 'ROOM',
    capacity_adults: '2',
    capacity_children: '0',
    description: '',
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateUnitInput>({ resolver: zodResolver(createUnitSchema) as any })

  const propertyId = watch('property_id')

  useEffect(() => {
    if (!propertyId) {
      setCategories([])
      setCategorySelection('')
      return
    }

    setCategorySelection('')
    fetch(`/api/unit-categories?property_id=${propertyId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: UnitCategoryOption[]) => setCategories(data))
      .catch(() => setCategories([]))
  }, [propertyId])

  const isNewCategory = categorySelection === NEW_CATEGORY_VALUE

  async function onSubmit(data: CreateUnitInput) {
    if (!categorySelection) {
      toast.error('Please select or create a unit category.')
      return
    }

    setIsLoading(true)
    try {
      let categoryId = categorySelection

      if (isNewCategory) {
        if (!newCategory.name.trim()) {
          toast.error('Category name is required.')
          setIsLoading(false)
          return
        }

        const categoryRes = await fetch('/api/unit-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_id: data.property_id,
            name: newCategory.name,
            unit_type: newCategory.unit_type,
            capacity_adults: Number(newCategory.capacity_adults) || 1,
            capacity_children: Number(newCategory.capacity_children) || 0,
            description: newCategory.description || undefined,
          }),
        })
        const categoryBody = await categoryRes.json()
        if (!categoryRes.ok) throw new Error(categoryBody.error ?? 'Failed to create category')
        categoryId = categoryBody.id
      }

      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, unit_category_id: categoryId }),
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
            <Label htmlFor="floor">
              Floor <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="floor" placeholder="e.g. 1, 2, G" {...register('floor')} />
          </div>

          <div className="space-y-1.5">
            <Label>Unit Category *</Label>
            <Select
              value={categorySelection}
              onValueChange={(v) => setCategorySelection(String(v ?? ''))}
              disabled={!propertyId}
            >
              <SelectTrigger>
                <SelectValue placeholder={propertyId ? 'Select category' : 'Select a property first'} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} ({category.capacity_adults}A / {category.capacity_children}C)
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY_VALUE}>+ New category…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isNewCategory && (
            <div className="space-y-4 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">New unit category</p>

              <div className="space-y-1.5">
                <Label htmlFor="category-name">Category Name *</Label>
                <Input
                  id="category-name"
                  placeholder="e.g. Double Room"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory((current) => ({ ...current, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Unit Type</Label>
                <Select
                  value={newCategory.unit_type}
                  onValueChange={(v) => setNewCategory((current) => ({ ...current, unit_type: String(v ?? 'ROOM') }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['ROOM', 'APARTMENT', 'CHALET', 'HOUSE', 'DORM', 'OTHER'].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category-adults">Adults Capacity</Label>
                  <Input
                    id="category-adults"
                    type="number"
                    min={1}
                    value={newCategory.capacity_adults}
                    onChange={(e) => setNewCategory((current) => ({ ...current, capacity_adults: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category-children">Children Capacity</Label>
                  <Input
                    id="category-children"
                    type="number"
                    min={0}
                    value={newCategory.capacity_children}
                    onChange={(e) => setNewCategory((current) => ({ ...current, capacity_children: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category-description">
                  Description <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="category-description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory((current) => ({ ...current, description: e.target.value }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Creating…' : 'Create Unit'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
