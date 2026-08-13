import type { UserRole } from '@/lib/database.types'
import { EMAIL_PERMISSIONS, type EmailPermission, type EmailPermissionSet } from './mailing.types'

// Role → default permissions mapping.
// No plan/subscription names are hard-coded here.
// When a subscription system is introduced, replace or extend this map
// by loading overrides from the DB rather than changing this structure.
const ROLE_EMAIL_PERMISSIONS: Record<UserRole, EmailPermissionSet> = {
  SUPER_ADMIN: Object.values(EMAIL_PERMISSIONS),
  ORG_ADMIN: [
    EMAIL_PERMISSIONS.USE_TEMPLATES,
    EMAIL_PERMISSIONS.CUSTOMIZE_TEMPLATES,
    EMAIL_PERMISSIONS.CREATE_TEMPLATES,
  ],
  MANAGER: [EMAIL_PERMISSIONS.USE_TEMPLATES],
  RECEPTION: [EMAIL_PERMISSIONS.USE_TEMPLATES],
  HOUSEKEEPING: [],
  KITCHEN: [],
  READ_ONLY: [],
}

export function hasEmailPermission(role: UserRole, permission: EmailPermission): boolean {
  return ROLE_EMAIL_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getEmailPermissions(role: UserRole): EmailPermissionSet {
  return ROLE_EMAIL_PERMISSIONS[role] ?? []
}
