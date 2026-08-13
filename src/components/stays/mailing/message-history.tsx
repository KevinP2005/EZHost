import { Inbox } from 'lucide-react'
import type { EmailMessage } from '@/lib/email/mailing.types'
import { MessageItem } from './message-item'

interface MessageHistoryProps {
  messages: EmailMessage[]
}

export function MessageHistory({ messages }: MessageHistoryProps) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Verlauf
      </h3>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
          <Inbox className="mb-2 h-7 w-7 text-muted-foreground/50" aria-hidden />
          <p className="text-sm text-muted-foreground">Noch keine E-Mails gesendet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}
        </div>
      )}
    </section>
  )
}
