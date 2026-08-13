'use client'

import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

interface EditStayFormProps {
  stay: any
  onSaved: () => void
  onCancel: () => void
}

function nightsBetween(checkIn: string, checkOut: string) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

export function EditStayForm({ stay, onSaved, onCancel }: EditStayFormProps) {
  const [form, setForm] = useState({
    check_in_date: stay.check_in_date ?? '',
    check_out_date: stay.check_out_date ?? '',
    arrival_time: stay.arrival_time?.slice(0, 5) ?? '',
    departure_time: stay.departure_time?.slice(0, 5) ?? '',
    adults: String(stay.adults ?? 1),
    children: String(stay.children ?? 0),
    external_reference: stay.external_reference ?? '',
    room_label: stay.room_label ?? '',
    nightly_rate: stay.nightly_rate != null ? String(stay.nightly_rate) : '',
    extras_amount: stay.extras_amount != null ? String(stay.extras_amount) : '',
    total_amount: stay.total_amount != null ? String(stay.total_amount) : '',
    currency: stay.currency ?? 'EUR',
    breakfast_included: Boolean(stay.breakfast_included),
    breakfast_count_adults: String(stay.breakfast_count_adults ?? 0),
    breakfast_count_children: String(stay.breakfast_count_children ?? 0),
    local_tax_applicable: Boolean(stay.local_tax_applicable),
    local_tax_amount: stay.local_tax_amount != null ? String(stay.local_tax_amount) : '',
    notes: stay.notes ?? '',
    internal_notes: stay.internal_notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormError(null)
  }

  const nights = form.check_in_date && form.check_out_date
    ? nightsBetween(form.check_in_date, form.check_out_date)
    : 0

  async function handleSave() {
    if (!form.check_in_date || !form.check_out_date) {
      setFormError('An- und Abreisedatum sind erforderlich.')
      return
    }
    if (form.check_out_date <= form.check_in_date) {
      setFormError('Abreisedatum muss nach dem Anreisedatum liegen.')
      return
    }
    if (Number(form.adults) < 1) {
      setFormError('Mindestens 1 Erwachsener erforderlich.')
      return
    }

    setSaving(true)
    setFormError(null)

    const payload: Record<string, unknown> = {
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      arrival_time: form.arrival_time || null,
      departure_time: form.departure_time || null,
      adults: Number(form.adults),
      children: Number(form.children),
      external_reference: form.external_reference || null,
      room_label: form.room_label || null,
      breakfast_included: form.breakfast_included,
      breakfast_count_adults: form.breakfast_included ? Number(form.breakfast_count_adults) : 0,
      breakfast_count_children: form.breakfast_included ? Number(form.breakfast_count_children) : 0,
      local_tax_applicable: form.local_tax_applicable,
      local_tax_amount: form.local_tax_applicable && form.local_tax_amount !== ''
        ? Number(form.local_tax_amount) : null,
      notes: form.notes || null,
      internal_notes: form.internal_notes || null,
      nightly_rate: form.nightly_rate !== '' ? Number(form.nightly_rate) : null,
      extras_amount: form.extras_amount !== '' ? Number(form.extras_amount) : null,
      total_amount: form.total_amount !== '' ? Number(form.total_amount) : null,
      currency: form.currency,
    }

    try {
      const res = await fetch(`/api/stays/${stay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Speichern fehlgeschlagen.')
      toast.success('Buchung gespeichert.')
      onSaved()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Dates & Times */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Aufenthalt</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Anreise</Label>
            <Input
              type="date"
              value={form.check_in_date}
              onChange={(e) => set('check_in_date', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Abreise</Label>
            <Input
              type="date"
              value={form.check_out_date}
              onChange={(e) => set('check_out_date', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Ankunftszeit
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="time"
              value={form.arrival_time}
              onChange={(e) => set('arrival_time', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Abfahrtszeit
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="time"
              value={form.departure_time}
              onChange={(e) => set('departure_time', e.target.value)}
            />
          </div>
          {nights > 0 && (
            <p className="col-span-2 text-xs text-muted-foreground">
              {nights} {nights === 1 ? 'Nacht' : 'Nächte'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Guests & Room */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Gäste & Zimmer</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Erwachsene</Label>
            <Input
              type="number"
              min={1}
              value={form.adults}
              onChange={(e) => set('adults', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kinder</Label>
            <Input
              type="number"
              min={0}
              value={form.children}
              onChange={(e) => set('children', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Zimmerbezeichnung
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={form.room_label}
              onChange={(e) => set('room_label', e.target.value)}
              placeholder={stay.units?.name ?? 'z. B. Doppelzimmer Deluxe'}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Buchungsreferenz
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={form.external_reference}
              onChange={(e) => set('external_reference', e.target.value)}
              placeholder="z. B. BK-2026-001"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Preise</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Preis pro Nacht</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {form.currency}
              </span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.nightly_rate}
                onChange={(e) => set('nightly_rate', e.target.value)}
                className="pl-12"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Extras</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {form.currency}
              </span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.extras_amount}
                onChange={(e) => set('extras_amount', e.target.value)}
                className="pl-12"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Gesamtpreis</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {form.currency}
              </span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.total_amount}
                onChange={(e) => set('total_amount', e.target.value)}
                className="pl-12"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Währung</Label>
            <select
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {['EUR', 'CHF', 'USD', 'GBP'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Leistungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="breakfast"
                checked={form.breakfast_included}
                onCheckedChange={(v) => set('breakfast_included', Boolean(v))}
              />
              <Label htmlFor="breakfast">Frühstück inbegriffen</Label>
            </div>
            {form.breakfast_included && (
              <div className="ml-6 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Erwachsene</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.breakfast_count_adults}
                    onChange={(e) => set('breakfast_count_adults', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kinder</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.breakfast_count_children}
                    onChange={(e) => set('breakfast_count_children', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="local_tax"
                checked={form.local_tax_applicable}
                onCheckedChange={(v) => set('local_tax_applicable', Boolean(v))}
              />
              <Label htmlFor="local_tax">Kurtaxe / Ortssteuer</Label>
            </div>
            {form.local_tax_applicable && (
              <div className="ml-6 max-w-[160px] space-y-1.5">
                <Label className="text-xs">Betrag</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {form.currency}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.local_tax_amount}
                    onChange={(e) => set('local_tax_amount', e.target.value)}
                    className="pl-12"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Notizen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Gastnotiz
              <span className="ml-1 text-xs font-normal text-muted-foreground">(für Gast sichtbar)</span>
            </Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="z. B. Allergien, Sonderwünsche…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Interne Notiz
              <span className="ml-1 text-xs font-normal text-muted-foreground">(nur für Personal)</span>
            </Label>
            <Textarea
              value={form.internal_notes}
              onChange={(e) => set('internal_notes', e.target.value)}
              rows={3}
              placeholder="Nur intern sichtbar…"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error + Actions */}
      {formError && (
        <p className="text-sm text-destructive">{formError}</p>
      )}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Speichern…
            </>
          ) : (
            'Änderungen speichern'
          )}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
