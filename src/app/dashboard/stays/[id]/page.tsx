import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { assertCanAccessProperty } from '@/lib/services/properties'
import { StayDetailPageContent } from '@/components/stays/stay-detail-page'

export const metadata: Metadata = { title: 'Stay Details' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function StayPage({ params }: Props) {
  const { id } = await params
  const profile = await requireAuth()

  const supabase = await createClient()
  const { data: stay, error } = await supabase
    .from('stays')
    .select(`
      *,
      units(id, name, unit_type, housekeeping_status),
      properties(id, name),
      guests!primary_guest_id(id, first_name, last_name, email, phone, nationality, document_type, document_number, date_of_birth)
    `)
    .eq('id', id)
    .single()

  if (error || !stay) notFound()

  try {
    await assertCanAccessProperty(profile, stay.property_id)
  } catch {
    notFound()
  }

  const [{ data: stayGuests }, { data: notes }] = await Promise.all([
    supabase
      .from('stay_guests')
      .select('*, guests(id, first_name, last_name, email)')
      .eq('stay_id', id),
    supabase
      .from('operational_notes')
      .select('*, profiles!created_by_profile_id(name)')
      .eq('stay_id', id)
      .order('created_at', { ascending: false }),
  ])

  const canEdit = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'].includes(profile.role)

  return (
    <StayDetailPageContent
      stay={stay}
      stayGuests={stayGuests ?? []}
      notes={notes ?? []}
      canEdit={canEdit}
    />
  )
}
