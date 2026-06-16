import { NextResponse } from 'next/server'

import { getProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { assertCanAccessProperty } from '@/lib/services/properties'
import { createStayFlowSchema, createStayFromFlow } from '@/lib/services/stays'
import { sendBookingEmail } from '@/lib/services/email'

export async function POST(request: Request) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION']
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createStayFlowSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const property = await assertCanAccessProperty(profile, parsed.data.property_id)
    const supabase = await createClient()
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('id, name')
      .eq('id', parsed.data.unit_id)
      .eq('property_id', parsed.data.property_id)
      .single()

    if (unitError || !unit) {
      return NextResponse.json({ error: 'Selected room is not available for this property.' }, { status: 400 })
    }

    const stay = await createStayFromFlow(property.organization_id, profile.id, parsed.data)
    const emailResult = await sendBookingEmail({
      organizationId: property.organization_id,
      stay,
      guestName: parsed.data.primary_guest.name,
      recipient: parsed.data.primary_guest.email,
      hotelName: property.name,
      roomName: parsed.data.room_label || unit.name,
      bookingStatus: parsed.data.booking_status,
    })

    return NextResponse.json(
      {
        ...stay,
        email_status: emailResult.ok ? 'SENT' : 'FAILED',
        email_warning: emailResult.warning,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save booking flow'
    return NextResponse.json(
      { error: message },
      { status: message === 'Property access denied' ? 403 : 500 }
    )
  }
}
