import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'

export async function createActivityLog(
  organizationId: string | null,
  profileId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, Json>,
  propertyId?: string | null
): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('activity_logs').insert({
      organization_id: organizationId,
      profile_id: profileId,
      property_id: propertyId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata: metadata ?? null,
    })
  } catch {
    // Activity log failures must never break the main flow
  }
}

export async function getActivityLogs(
  organizationId: string | null,
  filters?: {
    action?: string
    entityType?: string
    propertyId?: string
    limit?: number
  }
) {
  const supabase = await createClient()
  let query = supabase
    .from('activity_logs')
    .select('*, profiles(name, email)')
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 100)

  if (organizationId) query = query.eq('organization_id', organizationId)
  if (filters?.propertyId) query = query.eq('property_id', filters.propertyId)
  if (filters?.action) query = query.eq('action', filters.action)
  if (filters?.entityType) query = query.eq('entity_type', filters.entityType)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
