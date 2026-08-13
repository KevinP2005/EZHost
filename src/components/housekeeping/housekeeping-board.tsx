'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, AlertCircle, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type HousekeepingStatus = 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_SERVICE'

const statusConfig: Record<HousekeepingStatus, { label: string; color: string; icon: React.ElementType }> = {
  CLEAN: { label: 'Clean', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
  DIRTY: { label: 'Dirty', color: 'text-red-600 bg-red-50 border-red-200', icon: Circle },
  INSPECTED: { label: 'Inspected', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CheckCircle },
  OUT_OF_SERVICE: { label: 'Out of Service', color: 'text-gray-500 bg-gray-50 border-gray-200', icon: XCircle },
}

const taskPriorityColors: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-600 border-red-200',
  NORMAL: 'bg-blue-50 text-blue-600 border-blue-200',
  LOW: 'bg-gray-50 text-gray-500 border-gray-200',
}

const taskStatusColors: Record<string, string> = {
  OPEN: 'bg-orange-50 text-orange-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  DONE: 'bg-green-50 text-green-600',
  BLOCKED: 'bg-red-50 text-red-600',
}

interface Props {
  units: any[]
  tasks: any[]
  properties: any[]
  canEdit: boolean
}

export function HousekeepingBoard({ units, tasks, properties, canEdit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function changeUnitStatus(unitId: string, newStatus: HousekeepingStatus) {
    const res = await fetch(`/api/housekeeping/${unitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'unit_status', new_status: newStatus }),
    })
    if (res.ok) {
      toast.success(`Unit marked as ${statusConfig[newStatus].label}`)
      startTransition(() => router.refresh())
    } else {
      toast.error('Failed to update status')
    }
  }

  async function completeTask(taskId: string) {
    const res = await fetch(`/api/housekeeping/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'task', status: 'DONE' }),
    })
    if (res.ok) {
      toast.success('Task completed')
      startTransition(() => router.refresh())
    } else {
      toast.error('Failed to complete task')
    }
  }

  const dirty = units.filter((u) => u.housekeeping_status === 'DIRTY')
  const clean = units.filter((u) => u.housekeeping_status === 'CLEAN')
  const inspected = units.filter((u) => u.housekeeping_status === 'INSPECTED')
  const outOfService = units.filter((u) => u.housekeeping_status === 'OUT_OF_SERVICE')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Housekeeping</h1>
        <Button variant="ghost" size="sm" onClick={() => router.refresh()} disabled={isPending}>
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Dirty', count: dirty.length, color: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'Clean', count: clean.length, color: 'text-green-600 bg-green-50 border-green-200' },
          { label: 'Inspected', count: inspected.length, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Out of Service', count: outOfService.length, color: 'text-gray-500 bg-gray-50 border-gray-200' },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Units</h2>
          {units.length === 0 ? (
            <p className="text-sm text-muted-foreground">No units found.</p>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Unit</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    {canEdit && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => {
                    const cfg = statusConfig[unit.housekeeping_status as HousekeepingStatus]
                    const Icon = cfg.icon
                    return (
                      <tr key={unit.id} className="border-b last:border-0">
                        <td className="px-3 py-2.5 font-medium">{unit.name}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${cfg.color}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1">
                              {(['CLEAN', 'DIRTY', 'INSPECTED'] as HousekeepingStatus[])
                                .filter((s) => s !== unit.housekeeping_status)
                                .map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => changeUnitStatus(unit.id, s)}
                                    className={`text-xs px-1.5 py-0.5 rounded border ${statusConfig[s].color} hover:opacity-80 transition-opacity`}
                                  >
                                    {statusConfig[s].label}
                                  </button>
                                ))}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">Open Tasks ({tasks.length})</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.units?.name ?? '—'} · {task.task_type}
                          {task.profiles ? ` · ${task.profiles.name}` : ''}
                        </p>
                        {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${taskPriorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${taskStatusColors[task.status]}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        {canEdit && task.status !== 'DONE' && (
                          <button
                            onClick={() => completeTask(task.id)}
                            className="text-xs px-1.5 py-0.5 rounded border bg-green-50 text-green-600 border-green-200 hover:bg-green-100 transition-colors"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
