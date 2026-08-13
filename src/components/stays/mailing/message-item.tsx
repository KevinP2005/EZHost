import { CheckCircle2, XCircle, Mail, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

import type { EmailMessage } from '@/lib/email/mailing.types'

const TYPE_LABELS: Record<string, string> = {
  BOOKING_CONFIRMATION: 'Buchungsbestätigung',
  OFFER: 'Angebot',
  ONLINE_CHECK_IN: 'Online Check-in',
  PRE_ARRIVAL: 'Pre-Arrival',
  AFTER_CHECK_IN: 'Nach Check-in',
  AFTER_CHECK_OUT: 'Nach Check-out',
  CANCELLATION: 'Stornierung',
  MANUAL: 'Manuelle E-Mail',
}

interface MessageItemProps {
  message: EmailMessage
}

export function MessageItem({ message }: MessageItemProps) {
  const sentDate = message.sent_at
    ? format(parseISO(message.sent_at), 'dd. MMM yyyy, HH:mm', { locale: de })
    : format(parseISO(message.created_at), 'dd. MMM yyyy, HH:mm', { locale: de })

  const isSent = message.status === 'SENT'
  const typeLabel = TYPE_LABELS[message.email_type] ?? message.email_type

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className={`mt-0.5 shrink-0 rounded-full p-1 ${isSent ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
        {isSent
          ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          : <XCircle className="h-3.5 w-3.5" aria-hidden />
        }
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {message.subject ?? typeLabel}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{sentDate}</span>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3 shrink-0" aria-hidden />
            {message.recipient}
          </span>
          <span className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {typeLabel}
          </span>
          {message.sent_by && (
            <span className="text-muted-foreground/70">
              von {message.sent_by.name}
            </span>
          )}
        </div>

        {!isSent && message.error_message && (
          <p className="mt-1.5 text-xs text-rose-400">{message.error_message}</p>
        )}
      </div>
    </div>
  )
}
