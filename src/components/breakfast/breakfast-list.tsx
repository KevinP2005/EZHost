'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Printer, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Props {
  date: string
  items: any[]
  totalAdults: number
  totalChildren: number
  withAllergies: any[]
  withRequests: any[]
  properties: any[]
  currentPropertyId?: string
  organizationId: string
}

export function BreakfastListView({
  date,
  items,
  totalAdults,
  totalChildren,
  withAllergies,
  withRequests,
  properties,
  currentPropertyId,
  organizationId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const parsed = parseISO(date)

  function navigate(d: Date, propertyId?: string) {
    const params = new URLSearchParams({ date: format(d, 'yyyy-MM-dd') })
    if (propertyId) params.set('property', propertyId)
    router.push(`/dashboard/breakfast?${params.toString()}`)
  }

  async function generateList() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/breakfast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, property_id: currentPropertyId, organization_id: organizationId }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Generated ${data.count} breakfast entries`)
        startTransition(() => router.refresh())
      } else {
        toast.error(data.error ?? 'Failed to generate')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-xl font-semibold">Breakfast</h1>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(subDays(parsed, 1), currentPropertyId)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{format(parsed, 'EEEE, d MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(addDays(parsed, 1), currentPropertyId)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={currentPropertyId ?? ''} onValueChange={(v) => navigate(parsed, v || undefined)}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All properties</SelectItem>
              {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={generateList} disabled={isGenerating}>
            {isGenerating ? 'Generating…' : 'Generate from Stays'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="print-only mb-4">
        <h1 className="text-xl font-bold">Breakfast List — {format(parsed, 'd MMMM yyyy')}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 no-print">
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{totalAdults + totalChildren}</p>
            <p className="text-xs text-amber-600">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{totalAdults}</p>
            <p className="text-xs text-amber-600">Adults</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{totalChildren}</p>
            <p className="text-xs text-amber-600">Children</p>
          </CardContent>
        </Card>
      </div>

      {withAllergies.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">Allergy Notes ({withAllergies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {withAllergies.map((item) => (
              <div key={item.id} className="text-sm mb-1">
                <span className="font-medium">{item.units?.name ?? '—'}:</span>{' '}
                <span className="text-red-700">{item.allergies}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No breakfast entries for this date.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={generateList} disabled={isGenerating}>
            Generate from active stays
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Unit</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Guest</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Adults</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Children</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Allergies / Notes</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground no-print">Stay</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{item.units?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.stays?.guests
                      ? `${item.stays.guests.first_name} ${item.stays.guests.last_name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{item.adults_count}</td>
                  <td className="px-4 py-3 text-center">{item.children_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.breakfast_type ?? '—'}</td>
                  <td className="px-4 py-3">
                    {item.allergies && (
                      <span className="text-red-600 font-medium">{item.allergies}</span>
                    )}
                    {item.allergies && item.special_requests && ' · '}
                    {item.special_requests && (
                      <span className="text-muted-foreground">{item.special_requests}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground no-print">
                    {item.stays
                      ? `${format(parseISO(item.stays.check_in_date), 'd MMM')} → ${format(parseISO(item.stays.check_out_date), 'd MMM')}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/20">
              <tr>
                <td className="px-4 py-2 font-medium" colSpan={2}>Total</td>
                <td className="px-4 py-2 text-center font-bold">{totalAdults}</td>
                <td className="px-4 py-2 text-center font-bold">{totalChildren}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
