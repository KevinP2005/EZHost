import { NextResponse } from 'next/server'
import { createStay, createStaySchema } from '@/lib/services/stays'
import { getProfile } from '@/lib/auth'
import { assertCanAccessProperty } from '@/lib/services/properties'

export async function POST(request: Request) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION']
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createStaySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const property = await assertCanAccessProperty(profile, parsed.data.property_id)
    const stay = await createStay(property.organization_id, profile.id, parsed.data)
    return NextResponse.json(stay, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Property access denied' ? 403 : 500 })
  }
}
