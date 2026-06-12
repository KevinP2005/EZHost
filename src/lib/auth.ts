import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, UserRole } from '@/lib/database.types'

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  return data
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  return profile
}

export async function requireRole(allowedRoles: UserRole[]): Promise<Profile> {
  const profile = await requireAuth()
  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }
  return profile
}

export async function requireSuperAdmin(): Promise<Profile> {
  return requireRole(['SUPER_ADMIN'])
}

export async function requireOrgAccess(organizationId: string): Promise<Profile> {
  const profile = await requireAuth()
  if (profile.role !== 'SUPER_ADMIN' && profile.organization_id !== organizationId) {
    redirect('/dashboard')
  }
  return profile
}

export function canManageOrg(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'ORG_ADMIN'].includes(role)
}

export function canManageOperations(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER'].includes(role)
}

export function canManageStays(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'].includes(role)
}

export function canViewBreakfast(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION', 'KITCHEN'].includes(role)
}

export function canManageHousekeeping(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING'].includes(role)
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === 'SUPER_ADMIN'
}
