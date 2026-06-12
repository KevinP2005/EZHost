import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/auth'
import { updateHousekeepingTask, updateUnitHousekeepingStatus } from '@/lib/services/housekeeping'
import { assertCanAccessProperty } from '@/lib/services/properties'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const patchSchema = z.object({
  type: z.enum(['task', 'unit_status']),
  status: z.string().optional(),
  new_status: z.string().optional(),
  note: z.string().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION']
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  try {
    const supabase = await createClient()

    if (parsed.data.type === 'task') {
      const { data: task, error } = await supabase
        .from('housekeeping_tasks')
        .select('property_id')
        .eq('id', id)
        .single()

      if (error || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const property = await assertCanAccessProperty(profile, task.property_id)
      const result = await updateHousekeepingTask(id, property.organization_id, profile.id, { status: parsed.data.status as any })
      return NextResponse.json(result)
    } else {
      const { data: unit, error } = await supabase
        .from('units')
        .select('property_id')
        .eq('id', id)
        .single()

      if (error || !unit) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
      }

      const property = await assertCanAccessProperty(profile, unit.property_id)
      await updateUnitHousekeepingStatus(id, property.organization_id, profile.id, parsed.data.new_status as any, parsed.data.note)
      return NextResponse.json({ ok: true })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
