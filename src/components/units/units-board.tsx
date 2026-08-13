'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const hsColors: Record<string, string> = {
  CLEAN: 'text-green-600 border-green-300',
  DIRTY: 'text-red-500 border-red-300',
  INSPECTED: 'text-blue-600 border-blue-300',
  OUT_OF_SERVICE: 'text-gray-400 border-gray-300',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'text-green-600 border-green-300',
  INACTIVE: 'text-gray-400 border-gray-300',
  MAINTENANCE: 'text-orange-500 border-orange-300',
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
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${statusColors[unit.status] ?? 'text-gray-400 border-gray-300'}`}>
                      {unit.status === 'ACTIVE' ? 'Active' : unit.status === 'INACTIVE' ? 'Inactive' : 'Maintenance'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${hsColors[unit.housekeeping_status] ?? 'text-gray-400 border-gray-300'}`}>
                      {unit.housekeeping_status === 'OUT_OF_SERVICE' ? 'Out of Service' : unit.housekeeping_status === 'INSPECTED' ? 'Inspected' : unit.housekeeping_status === 'CLEAN' ? 'Clean' : 'Dirty'}
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
