import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/auth'
import { createGuest, createGuestSchema } from '@/lib/services/guests'
import { hasOperationalScope, resolvePropertyScope } from '@/lib/services/properties'

export async function POST(request: Request) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION']
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createGuestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const scope = await resolvePropertyScope(profile)
    if (!hasOperationalScope(scope)) {
      return NextResponse.json({ error: 'Property access required' }, { status: 403 })
    }

    const guest = await createGuest(scope.organizationId, profile.id, parsed.data)
    return NextResponse.json(guest, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
