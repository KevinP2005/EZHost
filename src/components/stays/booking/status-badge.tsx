/**
 * Shared badge for the booking panel. Colours match the existing stay status
 * palette so the new two-column layout stays consistent with the rest of the app.
 */

export type BadgeTone = 'blue' | 'green' | 'warm' | 'red' | 'neutral'

const toneClasses: Record<BadgeTone, string> = {
  blue: 'border-sky-400/25 bg-sky-500/15 text-sky-400',
  green: 'border-green-600/30 bg-green-600/20 text-green-500',
  warm: 'border-amber-400/25 bg-amber-500/15 text-amber-400',
  red: 'border-rose-400/25 bg-rose-500/15 text-rose-400',
  neutral: 'border-border bg-muted text-muted-foreground',
}

const statusClasses: Record<string, string> = {
  BOOKED: 'border-green-600/30 bg-green-600/20 text-green-500',
  CHECKED_IN: 'border-orange-400/25 bg-orange-500/15 text-orange-400',
  CHECKED_OUT: 'border-amber-400/25 bg-amber-500/15 text-amber-400',
  CANCELLED: 'border-rose-400/25 bg-rose-500/15 text-rose-400',
  NO_SHOW: 'border-orange-400/25 bg-orange-500/15 text-orange-400',
}

export function formatStatus(status: string) {
  return status
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

export function housekeepingTone(status: string): BadgeTone {
  if (status === 'CLEAN') return 'blue'
  if (status === 'INSPECTED') return 'green'
  if (status === 'DIRTY') return 'warm'
  return 'red'
}

interface StatusBadgeProps {
  /** Stay status key — resolves both colour and label. */
  status?: string
  /** Explicit label, used when no stay status is given. */
  label?: string
  tone?: BadgeTone
}

export function StatusBadge({ status, label, tone = 'neutral' }: StatusBadgeProps) {
  const className = status ? statusClasses[status] ?? toneClasses.neutral : toneClasses[tone]
  const text = label ?? (status ? formatStatus(status) : '')

  return (
    <span
      className={`inline-flex w-fit items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${className}`}
    >
      {text}
    </span>
  )
}
