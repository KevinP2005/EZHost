import type { EmailTemplateDefinition } from './mailing.types'

export const BLANK_TEMPLATE_ID = 'blank'

// System templates are defined here in code, not stored in the DB.
// When property-scoped custom templates are introduced, add a DB fetch
// in getAvailableTemplates() and merge the two lists.
const SYSTEM_TEMPLATES: EmailTemplateDefinition[] = [
  {
    id: 'system:booking_confirmation',
    name: 'Buchungsbestätigung',
    type: 'BOOKING_CONFIRMATION',
    defaultSubject: 'Buchungsbestätigung – {{hotelName}}',
    description: 'Offizielle Buchungsbestätigung mit allen Buchungsdaten.',
    source: 'SYSTEM',
    language: 'de',
    property_id: null,
    active: true,
    requires_booking_data: true,
  },
  {
    id: 'system:offer',
    name: 'Angebot',
    type: 'OFFER',
    defaultSubject: 'Ihr Angebot von {{hotelName}}',
    description: 'Unverbindliches Angebot mit allen Buchungsdaten.',
    source: 'SYSTEM',
    language: 'de',
    property_id: null,
    active: true,
    requires_booking_data: true,
  },
]

export const BLANK_TEMPLATE: EmailTemplateDefinition = {
  id: BLANK_TEMPLATE_ID,
  name: 'Leere E-Mail',
  type: 'BLANK',
  defaultSubject: '',
  description: 'Freie E-Mail — Betreff und Inhalt selbst verfassen.',
  source: 'SYSTEM',
  language: 'de',
  property_id: null,
  active: true,
  requires_booking_data: false,
}

export function getSystemTemplates(): EmailTemplateDefinition[] {
  return SYSTEM_TEMPLATES.filter((t) => t.active)
}

/**
 * Returns all templates available for a given property and language.
 * Currently returns system templates only.
 * Future: merge with custom templates from the DB.
 */
export async function getAvailableTemplates(
  _propertyId?: string | null,
  _language?: string,
): Promise<EmailTemplateDefinition[]> {
  return getSystemTemplates()
}

export function resolveSubject(template: EmailTemplateDefinition, hotelName: string): string {
  return template.defaultSubject.replace('{{hotelName}}', hotelName)
}
