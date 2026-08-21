import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/auth'
import { createUnitCategory, createUnitCategorySchema, getUnitCategories } from '@/lib/services/unit-categories'
import { assertCanAccessProperty } from '@/lib/services/properties'

export async function GET(request: Request) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const propertyId = new URL(request.url).searchParams.get('property_id')
  if (!propertyId) return NextResponse.json({ error: 'property_id is required' }, { status: 400 })

  try {
    const property = await assertCanAccessProperty(profile, propertyId)
    const categories = await getUnitCategories(property.organization_id, propertyId)
    return NextResponse.json(categories)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: message === 'Property access denied' ? 403 : 500 })
  }
}

export async function POST(request: Request) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER']
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createUnitCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const property = await assertCanAccessProperty(profile, parsed.data.property_id)
    const category = await createUnitCategory(property.organization_id, profile.id, parsed.data)
    return NextResponse.json(category, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: message === 'Property access denied' ? 403 : 500 })
  }
}
