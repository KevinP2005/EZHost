import type { UserRole } from '@/lib/database.types'

// ─── Message types ────────────────────────────────────────────────────────────

export type EmailMessageType =
  | 'BOOKING_CONFIRMATION'
  | 'OFFER'
  | 'ONLINE_CHECK_IN'
  | 'PRE_ARRIVAL'
  | 'AFTER_CHECK_IN'
  | 'AFTER_CHECK_OUT'
  | 'CANCELLATION'
  | 'MANUAL'

export type EmailDeliveryStatus = 'SENT' | 'FAILED'

export interface EmailMessage {
  id: string
  booking_id: string
  recipient: string
  subject: string | null
  email_type: EmailMessageType
  template_type: string | null
  language: string
  status: EmailDeliveryStatus
  sent_at: string | null
  created_at: string
  sent_by: { id: string; name: string } | null
  resend_email_id: string | null
  error_message: string | null
}

// ─── Templates ────────────────────────────────────────────────────────────────

export type TemplateSource = 'SYSTEM' | 'CUSTOM'

export type TemplateType = EmailMessageType | 'BLANK'

export interface EmailTemplateDefinition {
  id: string
  name: string
  type: TemplateType
  defaultSubject: string
  description: string
  source: TemplateSource
  language: string
  /** null = available for all properties */
  property_id: string | null
  active: boolean
  /** Whether rendering this template requires a full Stay record */
  requires_booking_data: boolean
  /** For CUSTOM templates: the editable body content */
  content?: string | null
}

// ─── Composer ─────────────────────────────────────────────────────────────────

export interface RecipientConfig {
  to: string
  // cc and bcc are prepared for future multi-recipient support
  cc?: string[]
  bcc?: string[]
}

export interface EmailComposerState {
  templateId: string | null
  recipients: string[]
  subject: string
  language: string
  /** Personal note appended to system templates, or full body for BLANK */
  message: string
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export const EMAIL_PERMISSIONS = {
  USE_TEMPLATES: 'email_templates.use',
  CUSTOMIZE_TEMPLATES: 'email_templates.customize',
  CREATE_TEMPLATES: 'email_templates.create',
  ADVANCED_EDITOR: 'email_templates.advanced_editor',
} as const

export type EmailPermission = (typeof EMAIL_PERMISSIONS)[keyof typeof EMAIL_PERMISSIONS]

export type EmailPermissionSet = EmailPermission[]

// ─── API response shapes ──────────────────────────────────────────────────────

export interface MailingTabData {
  messages: EmailMessage[]
  permissions: EmailPermissionSet
  guestEmail: string | null
}
