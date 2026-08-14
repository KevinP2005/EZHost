'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CircleHelp, Plus } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StayDetail } from '@/components/stays/stay-detail'
import { EditStayForm } from '@/components/stays/edit-stay-form'
import { MailingTab } from '@/components/stays/mailing/mailing-tab'
import { ReservationColumn } from './reservation-column'
import { StatusTab } from './status-tab'

/**
 * Full-page booking view: tab content on the left, persistent reservation
 * column on the right. Data is server-rendered and refreshed via router.refresh().
 */

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

interface Props {
  stay: any
  stayGuests: any[]
  notes: any[]
  canEdit: boolean
}

export function BookingDetail({ stay, stayGuests, notes, canEdit }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)

  const guest = stay.guests
  const guestName = guest ? [guest.first_name, guest.last_name].filter(Boolean).join(' ') : ''
  const bookingTitle = stay.reservation_number ?? guestName ?? 'Stay Details'

  function refresh() {
    router.refresh()
  }

  return (
    <div className="-mx-6 -my-6 flex min-h-full flex-col md:-mx-10 lg:-mx-14">
      <header className="flex h-[52px] shrink-0 items-center justify-between gap-4 border-b border-border pl-4 pr-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            href="/dashboard/stays"
            aria-label="Back to stays"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <h1 className="truncate text-[15px] font-semibold tracking-[0.1px]">{bookingTitle}</h1>
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
        </div>
      </header>

      {isEditing ? (
        <div className="flex-1 px-5 py-5 sm:px-7">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-4 text-base font-semibold">Buchung bearbeiten</h2>
            <EditStayForm
              stay={stay}
              onSaved={() => {
                setIsEditing(false)
                refresh()
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </div>
      ) : (
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

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-3.5 lg:grid-cols-[minmax(400px,46%)_minmax(480px,54%)]">
            <div className="min-w-0">
              <TabsContent value="status">
                <StatusTab stay={stay} stayGuests={stayGuests} canEdit={canEdit} onUpdated={refresh} />
              </TabsContent>

              <TabsContent value="pricing">
                <PricingTab stay={stay} />
              </TabsContent>

              <TabsContent value="mailing">
                <MailingTab stayId={stay.id} hotelName={stay.properties?.name ?? ''} />
              </TabsContent>

              <TabsContent value="summary">
                <StayDetail
                  stay={stay}
                  stayGuests={stayGuests}
                  notes={notes}
                  canEdit={canEdit}
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
              stay={stay}
              stayGuests={stayGuests}
              canEdit={canEdit}
              onEdit={() => setIsEditing(true)}
            />
          </div>
        </Tabs>
      )}
    </div>
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
