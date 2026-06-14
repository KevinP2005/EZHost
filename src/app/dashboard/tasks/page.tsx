import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getPropertyScope, getScopePropertyIds, hasPropertyScope } from '@/lib/services/properties'
import { TasksView } from '@/components/tasks/tasks-view'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tasks & Notes' }

interface TasksPageProps {
  searchParams: Promise<{ property?: string }>
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const profile = await requireAuth()
  const params = await searchParams
  const scope = await getPropertyScope(profile, params.property)

  if (!hasPropertyScope(scope)) return <p className="text-muted-foreground text-sm">Select an accommodation to view tasks.</p>

  const supabase = await createClient()

  let tasksQuery = supabase
    .from('housekeeping_tasks')
    .select('*, units(name), profiles!assigned_to_profile_id(name)')
    .in('status', ['OPEN', 'IN_PROGRESS', 'BLOCKED'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  let notesQuery = supabase
    .from('operational_notes')
    .select('*, profiles!created_by_profile_id(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (scope.organizationId) {
    tasksQuery = tasksQuery.eq('organization_id', scope.organizationId)
    notesQuery = notesQuery.eq('organization_id', scope.organizationId)
  }

  if (scope.propertyId) {
    tasksQuery = tasksQuery.eq('property_id', scope.propertyId)
    notesQuery = notesQuery.or(`property_id.eq.${scope.propertyId},property_id.is.null`)
  } else {
    const propertyIds = getScopePropertyIds(scope)
    if (propertyIds.length > 0) {
      tasksQuery = tasksQuery.in('property_id', propertyIds)
      notesQuery = scope.organizationId
        ? notesQuery.or(`property_id.in.(${propertyIds.join(',')}),property_id.is.null`)
        : notesQuery.in('property_id', propertyIds)
    }
  }

  const [{ data: tasks }, { data: notes }] = await Promise.all([tasksQuery, notesQuery])

  const isMgmt = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'].includes(profile.role)

  return (
    <TasksView
      tasks={tasks ?? []}
      notes={(notes ?? []).filter((n) => n.visibility === 'INTERNAL' || isMgmt)}
      canEdit={profile.role !== 'READ_ONLY'}
    />
  )
}
