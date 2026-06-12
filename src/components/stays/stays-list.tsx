'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'CHECKED_OUT', label: 'Checked Out' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
]

const regColors: Record<string, string> = {
  MISSING: 'bg-red-50 text-red-600 border-red-200',
  PARTIAL: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  COMPLETE: 'bg-green-50 text-green-600 border-green-200',
  NOT_REQUIRED: 'bg-gray-50 text-gray-500 border-gray-200',
}

const statusColors: Record<string, string> = {
  BOOKED: 'bg-blue-50 text-blue-700 border-blue-200',
  CHECKED_IN: 'bg-green-50 text-green-700 border-green-200',
  CHECKED_OUT: 'bg-gray-50 text-gray-500 border-gray-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  NO_SHOW: 'bg-orange-50 text-orange-600 border-orange-200',
}

interface Props {
  stays: any[]
  properties: any[]
  currentFilters: { status?: string; property?: string }
  canEdit: boolean
}

export function StaysList({ stays, properties, currentFilters, canEdit }: Props) {
  const router = useRouter()

  function applyFilter(key: string, value: string | null) {
    const v = value ?? ''
    const params = new URLSearchParams()
    if (key !== 'status' && currentFilters.status) params.set('status', currentFilters.status)
    if (key !== 'property' && currentFilters.property) params.set('property', currentFilters.property)
    if (v) params.set(key, v)
    router.push(`/dashboard/stays?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stays</h1>
        {canEdit && (
          <Link href="/dashboard/stays/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Stay
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={currentFilters.status ?? ''} onValueChange={(v) => applyFilter('status', v)}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentFilters.property ?? ''} onValueChange={(v) => applyFilter('property', v)}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {stays.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No stays found.</p>
          {canEdit && (
            <Link href="/dashboard/stays/new">
              <Button variant="outline" size="sm" className="mt-4">Create first stay</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Guest</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Unit</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Check-in</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Check-out</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Registration</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Breakfast</th>
              </tr>
            </thead>
            <tbody>
              {stays.map((stay) => (
                <tr
                  key={stay.id}
                  className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                  onClick={() => router.push(`/dashboard/stays/${stay.id}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    {stay.guests ? `${stay.guests.first_name} ${stay.guests.last_name}` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{stay.units?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(parseISO(stay.check_in_date), 'd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(parseISO(stay.check_out_date), 'd MMM yyyy')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${statusColors[stay.status] ?? ''}`}>
                      {stay.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${regColors[stay.registration_status] ?? ''}`}>
                      {stay.registration_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {stay.breakfast_included ? (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Yes</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
