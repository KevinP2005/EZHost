import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/auth'
import { generateBreakfastListFromStays } from '@/lib/services/breakfast'
import { assertCanAccessProperty } from '@/lib/services/properties'

export async function POST(request: Request) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION', 'KITCHEN']
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { date, property_id } = body
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })
  if (!property_id) return NextResponse.json({ error: 'property_id required' }, { status: 400 })

  try {
    const property = await assertCanAccessProperty(profile, property_id)
    const count = await generateBreakfastListFromStays(property.organization_id, profile.id, date, property_id)
    return NextResponse.json({ count })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: message === 'Property access denied' ? 403 : 500 })
  }
}
