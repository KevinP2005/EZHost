import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/auth'
import { updateStay, checkInStay, checkOutStay, updateRegistrationStatus } from '@/lib/services/stays'
import { assertCanAccessProperty } from '@/lib/services/properties'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const patchSchema = z.object({
  action: z.enum(['update', 'check_in', 'check_out', 'update_registration']).optional(),
  registration_status: z.enum(['MISSING', 'PARTIAL', 'COMPLETE', 'NOT_REQUIRED']).optional(),
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
    const { action, registration_status, ...rest } = parsed.data
    const supabase = await createClient()
    const { data: stay, error } = await supabase
      .from('stays')
      .select('property_id')
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
    } else {
      result = await updateStay(id, orgId, profile.id, rest)
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
