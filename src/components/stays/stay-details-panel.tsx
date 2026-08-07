'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, LoaderCircle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StayDetail } from '@/components/stays/stay-detail'

interface StayDetailsPayload {
  stay: any
  stayGuests: any[]
  notes: any[]
  canEdit: boolean
}

const statusClasses: Record<string, string> = {
  BOOKED: 'border-amber-400/25 bg-amber-500/15 text-amber-400',
  CHECKED_IN: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-400',
  CHECKED_OUT: 'border-slate-400/25 bg-slate-500/15 text-slate-300',
  CANCELLED: 'border-rose-400/25 bg-rose-500/15 text-rose-400',
  NO_SHOW: 'border-orange-400/25 bg-orange-500/15 text-orange-400',
}

const tabs = ['Overview', 'Mailing', 'Items', 'Group', 'Activity Log', 'Billing'] as const

function formatStatus(status: string) {
  return status
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

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

  const status = payload?.stay?.status as string | undefined

  return (
    <Dialog open={Boolean(stayId)} onOpenChange={(open) => !open && closePanel()}>
      <DialogContent
        showCloseButton={false}
        className="dark inset-y-0 right-0 left-auto top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-l border-border bg-popover p-0 text-popover-foreground shadow-2xl duration-300 sm:max-w-[min(94vw,1120px)] data-open:slide-in-from-right-full data-closed:slide-out-to-right-full data-open:fade-in-0 data-closed:fade-out-0 data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="truncate text-lg font-bold sm:text-xl">
                  {loading ? 'Loading stay...' : getGuestName(payload)}
                </DialogTitle>
                {status && (
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusClasses[status] ?? 'border-border bg-muted text-muted-foreground'}`}>
                    {formatStatus(status)}
                  </span>
                )}
              </div>
              <DialogDescription className="mt-1 text-xs">
                {payload?.stay?.properties?.name ?? 'Booking details'}
                {payload?.stay?.units?.name ? ` · ${payload.stay.units.name}` : ''}
              </DialogDescription>
            </div>

            <Button type="button" variant="ghost" size="icon" onClick={closePanel} aria-label="Close stay details">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>

          <Tabs defaultValue="overview" className="min-h-0 flex-1 gap-0">
            <div className="border-b border-border px-4 sm:px-6">
              <TabsList variant="line" className="grid h-auto w-full grid-cols-3 gap-1 py-2 sm:h-11 sm:grid-cols-6 sm:gap-3 sm:py-0">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab} value={tab.toLowerCase().replaceAll(' ', '-')} className="min-w-0 px-1 text-xs">
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <TabsContent value="overview">
                {loading && (
                  <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading booking details...
                  </div>
                )}

                {!loading && error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-10 text-center">
                    <AlertCircle className="mx-auto h-7 w-7 text-destructive" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-foreground">{error}</p>
                    {stayId && (
                      <Button type="button" variant="outline" className="mt-4" onClick={() => loadStay(stayId)}>
                        Try again
                      </Button>
                    )}
                  </div>
                )}

                {!loading && !error && payload && (
                  <StayDetail
                    stay={payload.stay}
                    stayGuests={payload.stayGuests}
                    notes={payload.notes}
                    canEdit={payload.canEdit}
                    showHeader={false}
                    onUpdated={() => stayId && loadStay(stayId)}
                  />
                )}
              </TabsContent>

              {tabs.slice(1).map((tab) => {
                const value = tab.toLowerCase().replaceAll(' ', '-')
                return (
                  <TabsContent key={tab} value={value}>
                    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
                      <h2 className="text-sm font-semibold text-foreground">{tab}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">This section is ready for future booking functionality.</p>
                    </div>
                  </TabsContent>
                )
              })}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
