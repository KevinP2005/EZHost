import { createClient } from '@/lib/supabase/server'
import { createActivityLog } from '@/lib/services/activity'
import type { HousekeepingTask, HousekeepingStatus, TaskStatus } from '@/lib/database.types'
import { z } from 'zod'

export const createTaskSchema = z.object({
  property_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  stay_id: z.string().uuid().optional(),
  assigned_to_profile_id: z.string().uuid().optional(),
  task_type: z.enum(['CLEANING', 'INSPECTION', 'MAINTENANCE', 'LAUNDRY', 'OTHER']).default('CLEANING'),
  title: z.string().min(1),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

export async function createHousekeepingTask(
  organizationId: string,
  profileId: string,
  input: CreateTaskInput
): Promise<HousekeepingTask> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('housekeeping_tasks')
    .insert({ ...input, organization_id: organizationId, status: 'OPEN' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  await createActivityLog(organizationId, profileId, 'housekeeping_task_created', 'housekeeping_task', data.id, undefined, data.property_id)
  return data
}

export async function updateHousekeepingTask(
  taskId: string,
  organizationId: string,
  profileId: string,
  updates: Partial<{ status: TaskStatus; assigned_to_profile_id: string; description: string; priority: string }>
): Promise<HousekeepingTask> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('housekeeping_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  if (updates.status === 'DONE') {
    await createActivityLog(organizationId, profileId, 'housekeeping_task_completed', 'housekeeping_task', taskId, undefined, data.property_id)
  }
  return data
}

export async function updateUnitHousekeepingStatus(
  unitId: string,
  organizationId: string,
  profileId: string,
  newStatus: HousekeepingStatus,
  note?: string
): Promise<void> {
  const supabase = await createClient()

  const { data: unit } = await supabase
    .from('units')
    .select('housekeeping_status, property_id')
    .eq('id', unitId)
    .eq('organization_id', organizationId)
    .single()

  const { error } = await supabase
    .from('units')
    .update({ housekeeping_status: newStatus })
    .eq('id', unitId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)

  await supabase.from('unit_status_logs').insert({
    organization_id: organizationId,
    property_id: unit?.property_id,
    unit_id: unitId,
    changed_by_profile_id: profileId,
    previous_status: unit?.housekeeping_status,
    new_status: newStatus,
    note,
  })

  await createActivityLog(organizationId, profileId, 'unit_housekeeping_status_updated', 'unit', unitId, {
    new_status: newStatus,
  }, unit?.property_id)
}

export async function getHousekeepingOverview(
  organizationId: string,
  propertyId?: string,
  propertyIds?: string[]
) {
  const supabase = await createClient()

  let unitsQuery = supabase
    .from('units')
    .select('*, properties(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'ACTIVE')
    .order('name')

  if (propertyId) unitsQuery = unitsQuery.eq('property_id', propertyId)
  else if (propertyIds?.length) unitsQuery = unitsQuery.in('property_id', propertyIds)

  let tasksQuery = supabase
    .from('housekeeping_tasks')
    .select('*, units(name), profiles!assigned_to_profile_id(name)')
    .eq('organization_id', organizationId)
    .in('status', ['OPEN', 'IN_PROGRESS'])
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })

  if (propertyId) tasksQuery = tasksQuery.eq('property_id', propertyId)
  else if (propertyIds?.length) tasksQuery = tasksQuery.in('property_id', propertyIds)

  const [units, tasks] = await Promise.all([unitsQuery, tasksQuery])

  return {
    units: units.data ?? [],
    tasks: tasks.data ?? [],
  }
}
