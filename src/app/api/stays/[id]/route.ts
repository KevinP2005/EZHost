import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/auth'
import {
  updateStay,
  checkInStay,
  checkOutStay,
  updateRegistrationStatus,
  cancelStay,
  cancelStays,
  cancelReservation,
} from '@/lib/services/stays'
import { updateStaySchema } from '@/lib/schemas/stays'
import { assertCanAccessProperty } from '@/lib/services/properties'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const patchSchema = z.object({
  action: z.enum(['update', 'check_in', 'check_out', 'update_registration', 'cancel']).optional(),
  registration_status: z.enum(['MISSING', 'PARTIAL', 'COMPLETE', 'NOT_REQUIRED']).optional(),
  cancellation_reason: z.enum(['NO_SHOW', 'GUEST_REQUEST', 'DUPLICATE', 'OVERBOOKING']).optional(),
  cancellation_details: z.string().max(500).optional(),
  apply_fee: z.boolean().optional(),
  notify_guest: z.boolean().optional(),
  // Cancellation scope: 'stay' (default) cancels the URL's own id;
  // 'stays' cancels exactly stay_ids; 'reservation' cancels every active
  // stay of the URL stay's reservation. See StatusTab for how each maps to
  // the "Cancel Stay / Cancel Stays / Cancel Reservation" button.
  scope: z.enum(['stay', 'stays', 'reservation']).optional().default('stay'),
  stay_ids: z.array(z.string().uuid()).optional(),
}).passthrough()

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION']
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const {
      action,
      registration_status,
      cancellation_reason,
      cancellation_details,
      scope,
      stay_ids,
      // Accepted by the cancellation form but not yet persisted: there is no
      // cancellation-fee column, and guest emails are sent explicitly via the composer.
      apply_fee: _applyFee,
      notify_guest: _notifyGuest,
      ...rest
    } = parsed.data
    const supabase = await createClient()
    const { data: stay, error } = await supabase
      .from('stays')
      .select('property_id, reservation_id')
      .eq('id', id)
      .single()

    if (error || !stay) {
      return NextResponse.json({ error: 'Stay not found' }, { status: 404 })
    }

    const targetPropertyId = typeof rest.property_id === 'string' ? rest.property_id : stay.property_id
    const property = await assertCanAccessProperty(profile, targetPropertyId)
    const orgId = property.organization_id
    let result

    if (action === 'check_in') {
      result = await checkInStay(id, orgId, profile.id)
    } else if (action === 'check_out') {
      result = await checkOutStay(id, orgId, profile.id)
    } else if (action === 'update_registration' && registration_status) {
      await updateRegistrationStatus(id, orgId, profile.id, registration_status)
      return NextResponse.json({ ok: true })
    } else if (action === 'cancel') {
      if (!cancellation_reason) {
        return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
      }

      if (scope === 'reservation') {
        result = await cancelReservation(stay.reservation_id, orgId, profile.id, cancellation_reason, cancellation_details)
      } else if (scope === 'stays') {
        if (!stay_ids || stay_ids.length === 0) {
          return NextResponse.json({ error: 'stay_ids is required for scope "stays"' }, { status: 400 })
        }
        result = await cancelStays(stay_ids, orgId, profile.id, cancellation_reason, cancellation_details, stay.reservation_id)
      } else {
        result = await cancelStay(id, orgId, profile.id, cancellation_reason, cancellation_details)
      }
    } else {
      const parsed = updateStaySchema.safeParse(rest)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      }
      result = await updateStay(id, orgId, profile.id, parsed.data)
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
