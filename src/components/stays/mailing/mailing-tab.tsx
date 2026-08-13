'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { MailingTabData } from '@/lib/email/mailing.types'
import { EMAIL_PERMISSIONS } from '@/lib/email/mailing.types'
import { MessageHistory } from './message-history'
import { EmailComposer } from './email-composer'

interface MailingTabProps {
  stayId: string
  hotelName: string
}

export function MailingTab({ stayId, hotelName }: MailingTabProps) {
  const [data, setData] = useState<MailingTabData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/stays/${stayId}/emails`, { signal })
        if (!res.ok) throw new Error('Email history could not be loaded.')
        const body: MailingTabData = await res.json()
        setData(body)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Unknown error.')
        setData(null)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [stayId],
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        Wird geladen…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-10 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-destructive" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-foreground">{error}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => load()}>
          Erneut versuchen
        </Button>
      </div>
    )
  }

  if (!data) return null

  const canSend = data.permissions.includes(EMAIL_PERMISSIONS.USE_TEMPLATES)

  return (
    <div className="space-y-8">
      <EmailComposer
        stayId={stayId}
        defaultRecipient={data.guestEmail ?? ''}
        hotelName={hotelName}
        canSend={canSend}
        onSent={() => load()}
      />
      <MessageHistory messages={data.messages} />
    </div>
  )
}
