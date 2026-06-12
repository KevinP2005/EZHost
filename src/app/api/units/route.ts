import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/auth'
import { createUnit, createUnitSchema } from '@/lib/services/units'
import { assertCanAccessProperty } from '@/lib/services/properties'

export async function POST(request: Request) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER']
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createUnitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const property = await assertCanAccessProperty(profile, parsed.data.property_id)
    const unit = await createUnit(property.organization_id, profile.id, parsed.data)
    return NextResponse.json(unit, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: message === 'Property access denied' ? 403 : 500 })
  }
}
