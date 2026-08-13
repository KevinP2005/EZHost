'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, CircleHelp, LoaderCircle, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StayDetail } from '@/components/stays/stay-detail'
import { EditStayForm } from '@/components/stays/edit-stay-form'
import { MailingTab } from '@/components/stays/mailing/mailing-tab'
import { ReservationColumn } from '@/components/stays/booking/reservation-column'
import { StatusTab } from '@/components/stays/booking/status-tab'

interface StayDetailsPayload {
  stay: any
  stayGuests: any[]
  notes: any[]
  canEdit: boolean
}

const tabs = [
  { label: 'Status', value: 'status' },
  { label: 'Properties', value: 'properties' },
  { label: 'Group', value: 'group' },
  { label: 'Pricing', value: 'pricing' },
  { label: 'Items', value: 'items' },
  { label: 'Mailing', value: 'mailing' },
  { label: 'Action log', value: 'action-log' },
  { label: 'Summary', value: 'summary' },
  { label: 'Billing', value: 'billing' },
] as const

const STUB_TABS = [
  { value: 'properties', label: 'Properties' },
  { value: 'group', label: 'Group' },
  { value: 'items', label: 'Items' },
  { value: 'action-log', label: 'Action log' },
  { value: 'billing', label: 'Billing' },
] as const

function getGuestName(payload: StayDetailsPayload | null) {
  const guest = payload?.stay?.guests
  if (!guest) return 'Stay Details'
  return [guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'Stay Details'
}

export function StayDetailsPanel() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const stayId = searchParams.get('stay')
  const [payload, setPayload] = useState<StayDetailsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const loadStay = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/stays/${id}`, { signal })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error ?? 'Stay details could not be loaded.')
      }

      setPayload(body)
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return
      setError(loadError instanceof Error ? loadError.message : 'Stay details could not be loaded.')
      setPayload(null)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!stayId) {
      setPayload(null)
      setError(null)
      setIsEditing(false)
      return
    }

    const controller = new AbortController()
    loadStay(stayId, controller.signal)
    return () => controller.abort()
  }, [loadStay, stayId])

  function closePanel() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('stay')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function refresh() {
    if (stayId) loadStay(stayId)
    router.refresh()
  }

  const stay = payload?.stay
  const bookingTitle = stay?.external_reference ?? getGuestName(payload)

  return (
    <Dialog open={Boolean(stayId)} onOpenChange={(open) => !open && closePanel()}>
      <DialogContent
        showCloseButton={false}
        className="dark inset-y-0 right-0 left-auto top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-l border-border bg-popover p-0 text-popover-foreground shadow-2xl duration-300 sm:max-w-[min(97vw,1400px)] data-open:slide-in-from-right-full data-closed:slide-out-to-right-full data-open:fade-in-0 data-closed:fade-out-0 data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex h-[52px] shrink-0 items-center justify-between gap-4 border-b border-border pl-4 pr-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <button
                type="button"
                onClick={closePanel}
                aria-label="Back to stays"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </button>
              <DialogTitle className="truncate text-[15px] font-semibold tracking-[0.1px]">
                {loading ? 'Loading stay…' : bookingTitle}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {stay?.properties?.name ?? 'Booking details'}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Add"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Help"
              >
                <CircleHelp className="h-4 w-4" aria-hidden />
              </button>
              <Button type="button" variant="ghost" size="icon" onClick={closePanel} aria-label="Close stay details">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </header>

          {loading && (
            <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Buchungsdetails werden geladen…
            </div>
          )}

          {!loading && error && (
            <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-6">
              <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-10 text-center">
                <AlertCircle className="mx-auto h-7 w-7 text-destructive" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-foreground">{error}</p>
                {stayId && (
                  <Button type="button" variant="outline" className="mt-4" onClick={() => loadStay(stayId)}>
                    Erneut versuchen
                  </Button>
                )}
              </div>
            </div>
          )}

          {!loading && !error && payload && isEditing && (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="mx-auto max-w-3xl">
                <h2 className="mb-4 text-base font-semibold">Buchung bearbeiten</h2>
                <EditStayForm
                  stay={payload.stay}
                  onSaved={() => {
                    setIsEditing(false)
                    refresh()
                  }}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            </div>
          )}

          {!loading && !error && payload && !isEditing && (
            <Tabs defaultValue="status" className="min-h-0 flex-1 gap-0">
              <div className="shrink-0 border-b border-border px-4">
                <TabsList
                  variant="line"
                  className="flex h-auto w-full flex-wrap justify-start gap-x-6 gap-y-1 py-2 sm:h-10 sm:flex-nowrap sm:py-0"
                >
                  {tabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="min-w-0 flex-none px-1 text-[11px]">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-3.5 lg:grid-cols-[minmax(400px,46%)_minmax(480px,54%)]">
                <div className="min-w-0">
                  <TabsContent value="status">
                    <StatusTab
                      stay={payload.stay}
                      stayGuests={payload.stayGuests}
                      canEdit={payload.canEdit}
                      onUpdated={refresh}
                    />
                  </TabsContent>

                  <TabsContent value="pricing">
                    <PricingTab stay={payload.stay} />
                  </TabsContent>

                  <TabsContent value="mailing">
                    {stayId && (
                      <MailingTab stayId={stayId} hotelName={payload.stay?.properties?.name ?? ''} />
                    )}
                  </TabsContent>

                  <TabsContent value="summary">
                    <StayDetail
                      stay={payload.stay}
                      stayGuests={payload.stayGuests}
                      notes={payload.notes}
                      canEdit={payload.canEdit}
                      showHeader={false}
                      onUpdated={refresh}
                    />
                  </TabsContent>

                  {STUB_TABS.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value}>
                      <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
                        <h2 className="text-sm font-semibold text-foreground">{tab.label}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          This section is ready for future booking functionality.
                        </p>
                      </div>
                    </TabsContent>
                  ))}
                </div>

                {/* Persistent across every tab */}
                <ReservationColumn
                  stay={payload.stay}
                  stayGuests={payload.stayGuests}
                  canEdit={payload.canEdit}
                  onEdit={() => setIsEditing(true)}
                />
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PricingTab({ stay }: { stay: any }) {
  const currency: string = stay.currency ?? 'EUR'
  const money = (value: number | null | undefined) =>
    value == null ? '—' : new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(value)

  const rows: Array<[string, string]> = [
    ['Rate', stay.rate_label ?? stay.rate_code ?? '—'],
    ['Nightly rate', money(stay.nightly_rate)],
    ['Subtotal', money(stay.subtotal_amount)],
    ['Extras', money(stay.extras_amount)],
    ['Local tax', stay.local_tax_applicable ? money(stay.local_tax_amount) : 'Not applicable'],
    ['Total', money(stay.total_amount)],
  ]

  return (
    <section className="rounded-md border border-border bg-card p-2.5">
      <div className="flex min-h-7 items-start px-px">
        <h2 className="text-[15px] leading-5 font-semibold text-foreground">Pricing</h2>
      </div>
      {rows.map(([label, value], index) => (
        <div
          key={label}
          className={`grid min-h-[38px] grid-cols-[1fr_auto] items-center gap-2.5 px-2.5 text-xs ${
            index === 0 ? '' : 'border-t border-border'
          } ${label === 'Total' ? 'font-semibold' : ''}`}
        >
          <span className={label === 'Total' ? '' : 'text-muted-foreground'}>{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </section>
  )
}
