'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-600 border-red-200',
  NORMAL: 'bg-blue-50 text-blue-600 border-blue-200',
  LOW: 'bg-gray-50 text-gray-500 border-gray-200',
}

const deptColors: Record<string, string> = {
  RECEPTION: 'bg-blue-50 text-blue-700',
  HOUSEKEEPING: 'bg-green-50 text-green-700',
  KITCHEN: 'bg-amber-50 text-amber-700',
  MANAGEMENT: 'bg-purple-50 text-purple-700',
  GENERAL: 'bg-gray-50 text-gray-700',
}

interface Props {
  tasks: any[]
  notes: any[]
  canEdit: boolean
}

export function TasksView({ tasks, notes, canEdit }: Props) {
  const router = useRouter()
  const [_isPending, startTransition] = useTransition()

  const openTasks = tasks.filter((t) => t.status === 'OPEN')
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS')
  const blocked = tasks.filter((t) => t.status === 'BLOCKED')

  async function completeTask(taskId: string) {
    const res = await fetch(`/api/housekeeping/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'task', status: 'DONE' }),
    })
    if (res.ok) {
      toast.success('Task marked as done')
      startTransition(() => router.refresh())
    } else {
      toast.error('Failed')
    }
  }

  function TaskCard({ task }: { task: any }) {
    return (
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.units?.name ?? '—'} · {task.task_type}
                {task.profiles ? ` · ${task.profiles.name}` : ''}
              </p>
              {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
              {task.due_date && <p className="text-xs text-muted-foreground">Due: {task.due_date}</p>}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-xs px-1.5 py-0.5 rounded border ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              {canEdit && task.status !== 'DONE' && (
                <button
                  onClick={() => completeTask(task.id)}
                  className="text-xs px-1.5 py-0.5 rounded border bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  function NoteCard({ note }: { note: any }) {
    return (
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm">{note.note}</p>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-xs px-1.5 py-0.5 rounded ${deptColors[note.department] ?? 'bg-gray-50 text-gray-600'}`}>
                {note.department}
              </span>
              <span className="text-xs text-muted-foreground">{note.profiles?.name ?? '—'}</span>
              {note.visibility === 'MANAGEMENT_ONLY' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">Mgmt only</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tasks & Notes</h1>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-600">Open ({openTasks.length})</p>
              {openTasks.length === 0
                ? <p className="text-xs text-muted-foreground">No open tasks.</p>
                : openTasks.map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-600">In Progress ({inProgress.length})</p>
              {inProgress.length === 0
                ? <p className="text-xs text-muted-foreground">Nothing in progress.</p>
                : inProgress.map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">Blocked ({blocked.length})</p>
              {blocked.length === 0
                ? <p className="text-xs text-muted-foreground">No blocked tasks.</p>
                : blocked.map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-2">
          {notes.length === 0
            ? <p className="text-sm text-muted-foreground">No operational notes.</p>
            : notes.map((n) => <NoteCard key={n.id} note={n} />)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
