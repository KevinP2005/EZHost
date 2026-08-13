'use client'

import { useState } from 'react'
import { SendHorizonal, LoaderCircle, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EmailTemplateDefinition, EmailComposerState } from '@/lib/email/mailing.types'
import { BLANK_TEMPLATE_ID, getSystemTemplates, resolveSubject } from '@/lib/email/template-service'
import { TemplateSelector } from './template-selector'

const SUPPORTED_LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
] as const

interface EmailComposerProps {
  stayId: string
  defaultRecipient: string
  hotelName: string
  canSend: boolean
  onSent: () => void
}

const INITIAL_STATE: EmailComposerState = {
  templateId: null,
  recipients: [''],
  subject: '',
  language: 'de',
  message: '',
}

export function EmailComposer({
  stayId,
  defaultRecipient,
  hotelName,
  canSend,
  onSent,
}: EmailComposerProps) {
  const systemTemplates = getSystemTemplates()
  const [state, setState] = useState<EmailComposerState>({
    ...INITIAL_STATE,
    recipients: [defaultRecipient],
  })
  const [sending, setSending] = useState(false)

  function update<K extends keyof EmailComposerState>(key: K, value: EmailComposerState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function handleTemplateChange(templateId: string) {
    const tmpl: EmailTemplateDefinition | undefined =
      templateId === BLANK_TEMPLATE_ID
        ? undefined
        : systemTemplates.find((t) => t.id === templateId)

    setState((prev) => ({
      ...prev,
      templateId,
      subject: tmpl ? resolveSubject(tmpl, hotelName) : '',
      message: '',
    }))
  }

  function setRecipient(index: number, value: string) {
    setState((prev) => {
      const next = [...prev.recipients]
      next[index] = value
      return { ...prev, recipients: next }
    })
  }

  function addRecipient() {
    setState((prev) => ({ ...prev, recipients: [...prev.recipients, ''] }))
  }

  function removeRecipient(index: number) {
    setState((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }))
  }

  const isBlank = state.templateId === BLANK_TEMPLATE_ID
  const selectedTemplate =
    state.templateId && !isBlank
      ? systemTemplates.find((t) => t.id === state.templateId)
      : null

  const validRecipients = state.recipients.filter((r) => r.trim().length > 0)

  async function handleSend() {
    if (!state.templateId || validRecipients.length === 0 || !state.subject) {
      toast.error('Bitte Template, Empfänger und Betreff ausfüllen.')
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/stays/${stayId}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: state.templateId,
          recipients: validRecipients,
          subject: state.subject,
          language: state.language,
          message: state.message || undefined,
        }),
      })

      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'E-Mail konnte nicht gesendet werden.')

      toast.success('E-Mail wurde gesendet.')
      setState({ ...INITIAL_STATE, recipients: [defaultRecipient] })
      onSent()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Senden.')
    } finally {
      setSending(false)
    }
  }

  if (!canSend) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Keine Berechtigung zum Versenden von E-Mails.
        </p>
      </div>
    )
  }

  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        E-Mail senden
      </h3>

      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        {/* Template */}
        <TemplateSelector
          templates={systemTemplates}
          value={state.templateId}
          onChange={handleTemplateChange}
          disabled={sending}
        />

        {/* Recipients */}
        <div className="space-y-1.5">
          <Label>Empfänger</Label>
          <div className="space-y-2">
            {state.recipients.map((email, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setRecipient(index, e.target.value)}
                  placeholder="gast@beispiel.at"
                  disabled={sending}
                  className="flex-1"
                />
                {index === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={addRecipient}
                    disabled={sending}
                    aria-label="Weiteren Empfänger hinzufügen"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRecipient(index)}
                    disabled={sending}
                    aria-label="Empfänger entfernen"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <Label>Betreff</Label>
          <Input
            value={state.subject}
            onChange={(e) => update('subject', e.target.value)}
            placeholder={state.templateId ? 'Betreff' : 'Zuerst ein Template wählen…'}
            disabled={sending || !state.templateId}
          />
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <Label>Sprache</Label>
          <Select
            value={state.language}
            onValueChange={(v) => { if (v) update('language', v) }}
            disabled={sending}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {SUPPORTED_LANGUAGES.find((l) => l.code === state.language)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message / Note */}
        <div className="space-y-1.5">
          <Label>
            {isBlank ? 'Nachricht' : 'Persönliche Notiz'}
            {!isBlank && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
            )}
          </Label>
          {selectedTemplate ? (
            <>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                Inhalt wird automatisch aus dem Template
                <span className="mx-1 font-medium text-foreground">{selectedTemplate.name}</span>
                generiert.
              </div>
              <Textarea
                value={state.message}
                onChange={(e) => update('message', e.target.value)}
                placeholder="Optionaler persönlicher Text, der an das Template angehängt wird…"
                rows={3}
                disabled={sending}
              />
            </>
          ) : (
            <Textarea
              value={state.message}
              onChange={(e) => update('message', e.target.value)}
              placeholder={isBlank ? 'E-Mail-Text…' : 'Zuerst ein Template wählen…'}
              rows={5}
              disabled={sending || !state.templateId}
            />
          )}
        </div>

        {/* Send */}
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || !state.templateId || validRecipients.length === 0 || !state.subject}
          >
            {sending ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Wird gesendet…
              </>
            ) : (
              <>
                <SendHorizonal className="mr-2 h-4 w-4" aria-hidden />
                E-Mail senden
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  )
}
