import { NextResponse } from 'next/server'

import { getProfile } from '@/lib/auth'
import { assertCanAccessProperty } from '@/lib/services/properties'
import { createReservationFlowSchema, createReservationFromFlow } from '@/lib/services/stays'
import { getCategoryAvailability } from '@/lib/services/availability'
import { sendBookingEmail } from '@/lib/services/email'

export async function POST(request: Request) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION']
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createReservationFlowSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const property = await assertCanAccessProperty(profile, parsed.data.property_id)

    // Pre-flight check against the same availability calculation the form used,
    // so an over-booked position fails with a readable message instead of a raw
    // Postgres exception. The RPC re-checks this inside the transaction — that
    // remains the authoritative guard against concurrent bookings.
    const availability = await getCategoryAvailability({
      propertyId: parsed.data.property_id,
      checkInDate: parsed.data.check_in_date,
      checkOutDate: parsed.data.check_out_date,
    })

    for (const position of parsed.data.positions) {
      const category = availability.find((entry) => entry.categoryKey === position.category_key)

      if (!category) {
        return NextResponse.json(
          { error: 'A selected room category is no longer available for this property.' },
          { status: 409 },
        )
      }

      if (position.quantity > category.maxSelectable) {
        return NextResponse.json(
          {
            error: `Only ${category.maxSelectable} × ${category.label} available for the selected period (requested ${position.quantity}).`,
          },
          { status: 409 },
        )
      }
    }

    const reservation = await createReservationFromFlow(
      property.organization_id,
      profile.id,
      parsed.data,
    )

    const firstStay = reservation.stays[0]

    // Only send when the guest opted in — "do_not_send" must not trigger a
    // confirmation/offer mail, and must not create an email_deliveries row
    // that would misleadingly claim one was sent.
    let emailResult: { ok: boolean; warning?: string } = { ok: true }
    if (parsed.data.confirmation_preference === 'send') {
      // The confirmation template is still single-stay shaped: it renders the
      // first stay's room/dates together with the reservation total. Good enough
      // while multi-room mails are not designed yet.
      emailResult = await sendBookingEmail({
        organizationId: property.organization_id,
        stay: firstStay,
        reservation,
        guestName: parsed.data.primary_guest.name,
        recipient: parsed.data.primary_guest.email,
        hotelName: property.name,
        roomName: firstStay?.room_label ?? 'Zimmer',
        bookingStatus: parsed.data.booking_status,
      })
    }

    return NextResponse.json(
      {
        reservation_id: reservation.id,
        reservation_number: reservation.reservation_number,
        stay_ids: reservation.stays.map((stay) => stay.id),
        // The booking detail page is opened by stay id and renders the whole
        // reservation from there.
        id: firstStay?.id,
        email_status: parsed.data.confirmation_preference === 'send' ? (emailResult.ok ? 'SENT' : 'FAILED') : 'SKIPPED',
        email_warning: emailResult.warning,
      },
      { status: 201 },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save booking flow'

    if (message === 'Property access denied') {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    // Raised by create_reservation_booking_flow when availability changed
    // between rendering the form and committing the reservation.
    if (message.includes('Not enough available units')) {
      return NextResponse.json(
        { error: 'Availability changed while booking. Nothing was saved — please review and try again.' },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
