import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StayDetail } from '@/components/stays/stay-detail'
import { assertCanAccessProperty } from '@/lib/services/properties'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Stay Details' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function StayDetailPage({ params }: Props) {
  const profile = await requireAuth()
  const { id } = await params
  const supabase = await createClient()

  const { data: stay } = await supabase
    .from('stays')
    .select(`
      *,
      units(id, name, unit_type, housekeeping_status),
      properties(id, name),
      guests!primary_guest_id(id, first_name, last_name, email, phone, nationality, document_type, document_number, date_of_birth)
    `)
    .eq('id', id)
    .single()

  if (!stay) notFound()

  try {
    await assertCanAccessProperty(profile, stay.property_id)
  } catch {
    notFound()
  }

  const { data: stayGuests } = await supabase
    .from('stay_guests')
    .select('*, guests(id, first_name, last_name, email)')
    .eq('stay_id', id)

  const { data: notes } = await supabase
    .from('operational_notes')
    .select('*, profiles!created_by_profile_id(name)')
    .eq('stay_id', id)
    .order('created_at', { ascending: false })

  const canEdit = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'].includes(profile.role)

  return <StayDetail stay={stay} stayGuests={stayGuests ?? []} notes={notes ?? []} canEdit={canEdit} />
}
