import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { assertCanAccessProperty } from '@/lib/services/properties'
import { BookingDetail } from '@/components/stays/booking/booking-detail'

export const metadata: Metadata = { title: 'Stay Details' }

interface Props {
  params: Promise<{ id: string }>
}

const GUEST_FIELDS = 'id, first_name, last_name, email, phone, nationality, document_type, document_number, date_of_birth, company'

export default async function StayDetailPage({ params }: Props) {
  const { id } = await params
  const profile = await requireAuth()

  const supabase = await createClient()
  const { data: stay, error } = await supabase
    .from('stays')
    .select(`
      *,
      units(id, name, housekeeping_status, unit_categories(name, unit_type, capacity_adults, capacity_children)),
      properties(id, name),
      reservations(
        *,
        primary_guest:guests!primary_guest_id(${GUEST_FIELDS}),
        booker:guests!booker_id(${GUEST_FIELDS})
      )
    `)
    .eq('id', id)
    .single()

  if (error || !stay) notFound()

  // Organisation/property scope is enforced server-side, not by the client.
  try {
    await assertCanAccessProperty(profile, stay.property_id)
  } catch {
    notFound()
  }

  const [{ data: stayGuests }, { data: notes }, { data: siblingStays }] = await Promise.all([
    supabase
      .from('stay_guests')
      .select('*, guests(id, first_name, last_name, email)')
      .eq('stay_id', id),
    supabase
      .from('operational_notes')
      .select('*, profiles!created_by_profile_id(name)')
      .eq('stay_id', id)
      .order('created_at', { ascending: false }),
    // A reservation can hold several stays (one per booked unit); the panel
    // lists all of them while keeping each one individually actionable.
    supabase
      .from('stays')
      .select('*, units(id, name, housekeeping_status, unit_categories(name, unit_type, capacity_adults, capacity_children))')
      .eq('reservation_id', stay.reservation_id)
      .order('stay_number'),
  ])

  // Flatten the reservation onto the stay for display: most of the booking
  // panel still reads a single flat object (`stay.total_amount`, `stay.guests`
  // for the primary guest, etc.) even though those fields now live on the
  // Reservation. The stay's own id/timestamps always win.
  const { reservations: reservation, ...stayRest } = stay as typeof stay & {
    reservations: {
      id: string
      reservation_number: string
      external_reference: string | null
      source: string
      booking_status: string
      total_amount: number | null
      currency: string
      confirmation_preference: string | null
      notes: string | null
      internal_notes: string | null
      primary_guest: Record<string, unknown> | null
      booker: Record<string, unknown> | null
    } | null
  }

  const stayView = {
    ...stayRest,
    reservation_id: reservation?.id ?? null,
    reservation_number: reservation?.reservation_number ?? null,
    external_reference: reservation?.external_reference ?? null,
    source: reservation?.source ?? null,
    booking_status: reservation?.booking_status ?? null,
    total_amount: reservation?.total_amount ?? null,
    currency: reservation?.currency ?? 'EUR',
    confirmation_preference: reservation?.confirmation_preference ?? null,
    reservation_notes: reservation?.notes ?? null,
    reservation_internal_notes: reservation?.internal_notes ?? null,
    guests: reservation?.primary_guest ?? null,
    booker: reservation?.booker ?? null,
  }

  // Each sibling stay gets the same reservation-level fields flattened on, so
  // the reservation column can render every row with one shared shape.
  const reservationStays = (siblingStays ?? []).map((sibling) => ({
    ...sibling,
    reservation_number: reservation?.reservation_number ?? null,
    currency: reservation?.currency ?? 'EUR',
    booking_status: reservation?.booking_status ?? null,
    source: reservation?.source ?? null,
    guests: reservation?.primary_guest ?? null,
    booker: reservation?.booker ?? null,
    isActive: sibling.id === stay.id,
  }))

  return (
    <BookingDetail
      stay={stayView}
      reservationStays={reservationStays}
      stayGuests={stayGuests ?? []}
      notes={notes ?? []}
      canEdit={['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'].includes(profile.role)}
    />
  )
}
