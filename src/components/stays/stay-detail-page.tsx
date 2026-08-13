'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StayDetail } from './stay-detail'
import { MailingTab } from './mailing/mailing-tab'

const statusColors: Record<string, string> = {
  BOOKED: 'text-green-400',
  CHECKED_IN: 'text-emerald-400',
  CHECKED_OUT: 'text-slate-300',
  CANCELLED: 'text-rose-400',
  NO_SHOW: 'text-orange-400',
}

const statusLabels: Record<string, string> = {
  BOOKED: 'Booked',
  CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Checked Out',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
}

interface Props {
  stay: any
  stayGuests: any[]
  notes: any[]
  canEdit: boolean
}

export function StayDetailPageContent({ stay, stayGuests, notes, canEdit }: Props) {
  const router = useRouter()
  const guest = stay.guests
  const guestName = guest ? `${guest.first_name} ${guest.last_name}` : 'Stay Details'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/stays">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Stays
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{guestName}</h1>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[stay.status] ?? 'text-gray-400'}`}>
          {statusLabels[stay.status] ?? stay.status}
        </span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mailing">Mailing</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="group">Group</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <StayDetail
            stay={stay}
            stayGuests={stayGuests}
            notes={notes}
            canEdit={canEdit}
            showHeader={false}
            onUpdated={() => router.refresh()}
          />
        </TabsContent>

        <TabsContent value="mailing" className="pt-4">
          <MailingTab stayId={stay.id} hotelName={stay.properties?.name ?? ''} />
        </TabsContent>

        {['items', 'group', 'activity', 'billing'].map((tab) => (
          <TabsContent key={tab} value={tab} className="pt-4">
            <p className="py-8 text-center text-sm text-muted-foreground">Coming soon</p>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
