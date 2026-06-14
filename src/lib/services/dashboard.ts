import { differenceInCalendarDays, format, formatDistanceToNowStrict } from 'date-fns'

import { getDailyOverview } from '@/lib/services/stays'
import { createClient } from '@/lib/supabase/server'
import type { ActivityItem, Stay, Task, Unit } from '@/components/dashboard/types'

export interface OwnerDashboardData {
  todaySummary: {
    arrivals: number
    departures: number
    stayovers: number
    openTasks: number
  }
  upcomingStays: Stay[]
  tasks: Task[]
  units: Unit[]
  activityFeed: ActivityItem[]
  hasPropertyData: boolean
}

type StayRow = {
  id: string
  check_in_date: string
  check_out_date: string
  adults: number | null
  children: number | null
  status: string
  registration_status?: string | null
  created_at?: string | null
  units?: { name: string | null } | null
  guests?: { first_name: string | null; last_name: string | null } | null
}

type UnitRow = {
  id: string
  name: string | null
  unit_type: string | null
  status: string | null
  housekeeping_status: string | null
}

type TaskRow = {
  id: string
  task_type: string | null
  title: string | null
  due_date: string | null
  priority: string | null
  units?: { name: string | null } | null
}

type ActivityRow = {
  id: string
  action: string | null
  entity_type: string | null
  created_at: string
  profiles?: { name: string | null; email: string | null } | null
}

function getGuestName(stay: StayRow) {
  const firstName = stay.guests?.first_name?.trim()
  const lastName = stay.guests?.last_name?.trim()
  const name = [firstName, lastName].filter(Boolean).join(' ')

  return name || 'Guest'
}

function mapStayStatus(status: string): Stay['status'] {
  if (status === 'CHECKED_IN') return 'checked-in'
  if (status === 'CHECKED_OUT') return 'checked-out'
  if (status === 'BOOKED') return 'confirmed'
  return 'pending'
}

function mapTaskType(taskType: string | null): Task['type'] {
  if (taskType === 'CLEANING' || taskType === 'INSPECTION' || taskType === 'LAUNDRY') {
    return 'cleaning'
  }
  if (taskType === 'MAINTENANCE') return 'maintenance'
  return 'cleaning'
}

function mapTaskPriority(priority: string | null): Task['priority'] {
  if (priority === 'HIGH') return 'high'
  if (priority === 'LOW') return 'low'
  return 'medium'
}

function mapUnitType(unitType: string | null) {
  if (!unitType) return 'Unit'

  return unitType
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function mapUnitStatus(unit: UnitRow, currentStay?: StayRow): Unit['status'] {
  if (unit.status === 'MAINTENANCE' || unit.housekeeping_status === 'OUT_OF_SERVICE') {
    return 'maintenance'
  }
  if (currentStay) return 'occupied'
  if (unit.housekeeping_status === 'DIRTY') return 'cleaning'
  return 'available'
}

function mapActivity(action: string | null, entityType: string | null): Pick<ActivityItem, 'type' | 'message'> {
  const key = action ?? ''

  if (key.includes('checked_in')) return { type: 'checkin', message: 'Check-in completed' }
  if (key.includes('checked_out')) return { type: 'checkout', message: 'Check-out completed' }
  if (key.includes('housekeeping') || entityType === 'housekeeping_task') {
    return { type: 'housekeeping', message: 'Housekeeping updated' }
  }
  if (key.includes('registration') || entityType === 'guest') {
    return { type: 'guest-update', message: 'Guest details updated' }
  }
  if (entityType === 'stay' || key.includes('stay_created')) {
    return { type: 'booking', message: 'Booking updated' }
  }

  return { type: 'task', message: 'Activity recorded' }
}

function formatDueDate(date: string | null) {
  if (!date) return undefined

  const today = new Date()
  const due = new Date(date)
  const diff = differenceInCalendarDays(due, today)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return format(due, 'MMM d')
}

function toStay(row: StayRow): Stay {
  const nights = Math.max(
    differenceInCalendarDays(new Date(row.check_out_date), new Date(row.check_in_date)),
    1,
  )

  return {
    id: row.id,
    guestName: getGuestName(row),
    unit: row.units?.name || 'Unassigned unit',
    checkIn: row.check_in_date,
    checkOut: row.check_out_date,
    guests: (row.adults ?? 0) + (row.children ?? 0),
    status: mapStayStatus(row.status),
    nights,
  }
}

export async function getOwnerDashboardData(
  organizationId: string | null,
  date: string,
  propertyId?: string,
  propertyIds?: string[],
): Promise<OwnerDashboardData> {
  const supabase = await createClient()
  const overview = await getDailyOverview(organizationId, date, propertyId, propertyIds)

  const upcomingQuery = supabase
    .from('stays')
    .select('id, check_in_date, check_out_date, adults, children, status, registration_status, created_at, units(name), guests!primary_guest_id(first_name, last_name)')
    .gte('check_out_date', date)
    .not('status', 'in', '("CANCELLED","NO_SHOW")')
    .order('check_in_date', { ascending: true })
    .limit(5)

  const unitsQuery = supabase
    .from('units')
    .select('id, name, unit_type, status, housekeeping_status')
    .eq('status', 'ACTIVE')
    .order('name')
    .limit(8)

  const currentStaysQuery = supabase
    .from('stays')
    .select('id, unit_id, check_in_date, check_out_date, adults, children, status, units(name), guests!primary_guest_id(first_name, last_name)')
    .eq('status', 'CHECKED_IN')
    .lte('check_in_date', date)
    .gt('check_out_date', date)

  const tasksQuery = supabase
    .from('housekeeping_tasks')
    .select('id, task_type, title, due_date, priority, units(name)')
    .in('status', ['OPEN', 'IN_PROGRESS'])
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(4)

  const missingRegistrationQuery = supabase
    .from('stays')
    .select('id, check_in_date, check_out_date, adults, children, status, registration_status, units(name), guests!primary_guest_id(first_name, last_name)')
    .in('registration_status', ['MISSING', 'PARTIAL'])
    .in('status', ['BOOKED', 'CHECKED_IN'])
    .gte('check_out_date', date)
    .order('check_in_date', { ascending: true })
    .limit(3)

  const activityQuery = supabase
    .from('activity_logs')
    .select('id, action, entity_type, created_at, profiles(name, email)')
    .order('created_at', { ascending: false })
    .limit(5)

  if (organizationId) {
    upcomingQuery.eq('organization_id', organizationId)
    unitsQuery.eq('organization_id', organizationId)
    currentStaysQuery.eq('organization_id', organizationId)
    tasksQuery.eq('organization_id', organizationId)
    missingRegistrationQuery.eq('organization_id', organizationId)
    activityQuery.eq('organization_id', organizationId)
  }

  if (propertyId) {
    upcomingQuery.eq('property_id', propertyId)
    unitsQuery.eq('property_id', propertyId)
    currentStaysQuery.eq('property_id', propertyId)
    tasksQuery.eq('property_id', propertyId)
    missingRegistrationQuery.eq('property_id', propertyId)
    activityQuery.eq('property_id', propertyId)
  } else if (propertyIds?.length) {
    upcomingQuery.in('property_id', propertyIds)
    unitsQuery.in('property_id', propertyIds)
    currentStaysQuery.in('property_id', propertyIds)
    tasksQuery.in('property_id', propertyIds)
    missingRegistrationQuery.in('property_id', propertyIds)
    activityQuery.in('property_id', propertyIds)
  }

  const [upcomingRes, unitsRes, currentStaysRes, tasksRes, missingRegistrationRes, activityRes] =
    await Promise.all([
      upcomingQuery,
      unitsQuery,
      currentStaysQuery,
      tasksQuery,
      missingRegistrationQuery,
      activityQuery,
    ])

  const upcomingRows = (upcomingRes.data ?? []) as unknown as StayRow[]
  const unitRows = (unitsRes.data ?? []) as unknown as UnitRow[]
  const currentStayRows = (currentStaysRes.data ?? []) as unknown as Array<StayRow & { unit_id: string | null }>
  const taskRows = (tasksRes.data ?? []) as unknown as TaskRow[]
  const missingRegistrationRows = (missingRegistrationRes.data ?? []) as unknown as StayRow[]
  const activityRows = (activityRes.data ?? []) as unknown as ActivityRow[]

  const currentStayByUnit = new Map(
    currentStayRows
      .filter((stay) => stay.unit_id)
      .map((stay) => [stay.unit_id as string, stay]),
  )

  const housekeepingTasks: Task[] = taskRows.map((task) => ({
    id: task.id,
    type: mapTaskType(task.task_type),
    label: task.title || 'Housekeeping task',
    unit: task.units?.name || 'Unassigned unit',
    priority: mapTaskPriority(task.priority),
    dueTime: formatDueDate(task.due_date),
  }))

  const registrationTasks: Task[] = missingRegistrationRows.map((stay) => ({
    id: `registration-${stay.id}`,
    type: 'registration',
    label: stay.registration_status === 'PARTIAL' ? 'Registration incomplete' : 'Registration pending',
    unit: stay.units?.name || getGuestName(stay),
    priority: stay.check_in_date <= date ? 'high' : 'medium',
    dueTime: stay.check_in_date <= date ? 'Today' : formatDueDate(stay.check_in_date),
  }))

  const units: Unit[] = unitRows.map((unit) => {
    const currentStay = currentStayByUnit.get(unit.id)

    return {
      id: unit.id,
      name: unit.name || 'Unnamed unit',
      type: mapUnitType(unit.unit_type),
      status: mapUnitStatus(unit, currentStay),
      currentGuest: currentStay ? getGuestName(currentStay) : undefined,
      checkOut: currentStay ? format(new Date(currentStay.check_out_date), 'MMM d') : undefined,
    }
  })

  const activityFeed: ActivityItem[] = activityRows.map((activity) => {
    const mapped = mapActivity(activity.action, activity.entity_type)
    const actor = activity.profiles?.name || activity.profiles?.email || 'Team'

    return {
      id: activity.id,
      ...mapped,
      detail: `${actor} · ${activity.entity_type ?? 'record'}`,
      time: `${formatDistanceToNowStrict(new Date(activity.created_at), { addSuffix: false })} ago`,
    }
  })

  return {
    todaySummary: {
      arrivals: overview.arrivals.length,
      departures: overview.departures.length,
      stayovers: overview.inHouse.length,
      openTasks: overview.openTasksCount + overview.missingRegistrationCount,
    },
    upcomingStays: upcomingRows.map(toStay),
    tasks: [...registrationTasks, ...housekeepingTasks].slice(0, 4),
    units,
    activityFeed,
    hasPropertyData: Boolean(propertyId) || unitRows.length > 0 || upcomingRows.length > 0,
  }
}
