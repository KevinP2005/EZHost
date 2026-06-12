'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const hsColors: Record<string, string> = {
  CLEAN: 'bg-green-50 text-green-700 border-green-200',
  DIRTY: 'bg-red-50 text-red-700 border-red-200',
  INSPECTED: 'bg-blue-50 text-blue-700 border-blue-200',
  OUT_OF_SERVICE: 'bg-gray-50 text-gray-500 border-gray-200',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  INACTIVE: 'bg-gray-50 text-gray-500',
  MAINTENANCE: 'bg-orange-50 text-orange-600',
}

interface Props {
  units: any[]
  properties: any[]
  canEdit: boolean
}

export function UnitsBoard({ units, properties, canEdit }: Props) {
  const router = useRouter()
  const [filterProperty, setFilterProperty] = useState('')
  const [_isPending, startTransition] = useTransition()

  const filtered = filterProperty ? units.filter((u) => u.property_id === filterProperty) : units

  async function changeHSStatus(unitId: string, newStatus: string) {
    const res = await fetch(`/api/housekeeping/${unitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'unit_status', new_status: newStatus }),
    })
    if (res.ok) {
      toast.success('Status updated')
      startTransition(() => router.refresh())
    } else {
      toast.error('Failed to update')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Units</h1>
        {canEdit && (
          <Link href="/dashboard/units/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Unit
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={filterProperty} onValueChange={(v) => setFilterProperty(v ?? '')}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All properties</SelectItem>
            {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No units found.</p>
          {canEdit && <Link href="/dashboard/units/new"><Button variant="outline" size="sm" className="mt-4">Create first unit</Button></Link>}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Property</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Capacity</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Unit Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Housekeeping</th>
                {canEdit && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((unit) => (
                <tr key={unit.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{unit.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{(unit as any).properties?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{unit.unit_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{unit.capacity_adults} adults · {unit.capacity_children} children</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[unit.status]}`}>{unit.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${hsColors[unit.housekeeping_status]}`}>
                      {unit.housekeeping_status}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {['CLEAN', 'DIRTY', 'INSPECTED']
                          .filter((s) => s !== unit.housekeeping_status)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() => changeHSStatus(unit.id, s)}
                              className={`text-xs px-1.5 py-0.5 rounded border ${hsColors[s]} hover:opacity-80`}
                            >
                              {s === 'CLEAN' ? 'Clean' : s === 'DIRTY' ? 'Dirty' : 'Inspect'}
                            </button>
                          ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
