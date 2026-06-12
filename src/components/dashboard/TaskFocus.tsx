'use client'

import {
  Coffee,
  FileText,
  Sparkles,
  UserX,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import type { Task } from './types'

const TYPE_CONFIG: Record<Task['type'], { icon: LucideIcon; tone: string }> = {
  registration: { icon: FileText, tone: 'bg-violet-500/15 text-violet-300' },
  cleaning: { icon: Sparkles, tone: 'bg-amber-500/15 text-amber-400' },
  breakfast: { icon: Coffee, tone: 'bg-emerald-500/15 text-emerald-400' },
  'missing-details': { icon: UserX, tone: 'bg-rose-500/15 text-rose-400' },
  maintenance: { icon: Wrench, tone: 'bg-slate-500/15 text-slate-300' },
}

const PRIORITY_DOT: Record<Task['priority'], string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-400',
}

export default function TaskFocus({ tasks }: { tasks: Task[] }) {
  const urgentTasks = tasks.filter((task) => task.priority === 'high').length

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Task Focus</h2>
        <span className="rounded-md border border-rose-400/25 bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-400">
          {urgentTasks} urgent
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          No open tasks right now.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map((task) => {
            const config = TYPE_CONFIG[task.type]
            const TaskIcon = config.icon

            return (
              <button
                key={task.id}
                type="button"
                className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50"
              >
                <span className={`flex shrink-0 items-center justify-center rounded-md p-2 ${config.tone}`}>
                  <TaskIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-foreground">{task.label}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{task.unit}</span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  {task.dueTime && (
                    <span className="hidden text-[11px] text-muted-foreground sm:block">{task.dueTime}</span>
                  )}
                  <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

