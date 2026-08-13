import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { assertCanAccessProperty } from '@/lib/services/properties'
import { renderBookingEmailTemplate } from '@/lib/email/templates'
import { getEmailPermissions, hasEmailPermission } from '@/lib/email/permissions'
import { getSystemTemplates, BLANK_TEMPLATE_ID } from '@/lib/email/template-service'
import { EMAIL_PERMISSIONS, type EmailMessageType } from '@/lib/email/mailing.types'

// ─── GET: fetch email history for a stay ─────────────────────────────────────

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: stayId } = await params
  const supabase = await createClient()

  const { data: stay, error: stayError } = await supabase
    .from('stays')
    .select('property_id, guests!primary_guest_id(email)')
    .eq('id', stayId)
    .single()

  if (stayError || !stay) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await assertCanAccessProperty(profile, stay.property_id)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Try full query (requires migration 005). Fall back to base columns if not yet applied.
  let { data: messages, error: msgError } = await supabase
    .from('email_deliveries')
    .select('*, profiles!sent_by_profile_id(id, name)')
    .eq('booking_id', stayId)
    .order('created_at', { ascending: false })

  if (msgError) {
    const fallback = await supabase
      .from('email_deliveries')
      .select('id, organization_id, booking_id, recipient, email_type, resend_email_id, status, sent_at, error_message, created_at')
      .eq('booking_id', stayId)
      .order('created_at', { ascending: false })

    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 })
    messages = (fallback.data ?? []).map((m) => ({
      ...m,
      subject: null,
      template_type: null,
      language: 'de',
      sent_by_profile_id: null,
      profiles: null,
    }))
    msgError = null
  }

  const guest = stay.guests as unknown as { email: string | null } | null
  const normalized = (messages ?? []).map((m: Record<string, unknown>) => {
    const { profiles, ...rest } = m
    const sentBy = profiles as { id: string; name: string } | null
    return { ...rest, sent_by: sentBy ?? null }
  })
  return NextResponse.json({
    messages: normalized,
    permissions: getEmailPermissions(profile.role),
    guestEmail: guest?.email ?? null,
  })
}

// ─── POST: send an email for a stay ──────────────────────────────────────────

const sendEmailSchema = z.object({
  template_id: z.string().min(1),
  recipients: z.array(z.string().email('Ungültige E-Mail-Adresse.')).min(1, 'Mindestens ein Empfänger erforderlich.'),
  subject: z.string().min(1, 'Betreff ist erforderlich.'),
  language: z.string().min(2).default('de'),
  message: z.string().optional(),
})

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function appendNoteToHtml(html: string, note: string): string {
  const noteHtml = `
    <tr>
      <td style="padding:0 28px 28px;">
        <div style="border-top:1px solid #e5e7eb;padding-top:20px;font-size:14px;line-height:1.7;color:#4b5563;">
          ${escapeHtml(note).replace(/\n/g, '<br>')}
        </div>
      </td>
    </tr>`
  return html.replace('<!-- Footer -->', `${noteHtml}\n          <!-- Footer -->`)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasEmailPermission(profile.role, EMAIL_PERMISSIONS.USE_TEMPLATES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: stayId } = await params
  const body = await request.json()
  const parsed = sendEmailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { template_id, recipients, subject, language, message } = parsed.data
  const recipient = recipients[0]

  const supabase = await createClient()

  const { data: stay, error: stayError } = await supabase
    .from('stays')
    .select(`
      id, organization_id, property_id, check_in_date, check_out_date,
      arrival_time, departure_time, adults, children, room_label,
      nightly_rate, subtotal_amount, extras_amount, total_amount, currency,
      local_tax_applicable, local_tax_amount, external_reference,
      units(name),
      properties(id, name, organization_id, address, city, country),
      guests!primary_guest_id(first_name, last_name, email)
    `)
    .eq('id', stayId)
    .single()

  if (stayError || !stay) {
    return NextResponse.json({ error: 'Stay not found.' }, { status: 404 })
  }

  let property: Awaited<ReturnType<typeof assertCanAccessProperty>>
  try {
    property = await assertCanAccessProperty(profile, stay.property_id)
  } catch {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  }

  // Fetch organisation reply-to email + phone
  const { data: org } = await supabase
    .from('organizations')
    .select('email, phone')
    .eq('id', stay.organization_id)
    .single()
  const replyTo = org?.email?.trim() || undefined

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ error: 'E-Mail-Dienst nicht konfiguriert.' }, { status: 500 })
  }

  // ── Build email content ───────────────────────────────────────────────────

  let html: string
  let text: string
  let emailType: EmailMessageType = 'MANUAL'
  let templateType: string | null = null

  if (template_id === BLANK_TEMPLATE_ID) {
    const bodyText = message?.trim() ?? ''
    html = `<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1f2937;padding:24px;">${escapeHtml(bodyText).replace(/\n/g, '<br>')}</body></html>`
    text = bodyText
    emailType = 'MANUAL'
    templateType = null
  } else {
    const systemTemplates = getSystemTemplates()
    const tmpl = systemTemplates.find((t) => t.id === template_id)
    if (!tmpl) return NextResponse.json({ error: 'Template nicht gefunden.' }, { status: 400 })

    emailType = tmpl.type as EmailMessageType
    templateType = tmpl.id

    if (tmpl.type !== 'BOOKING_CONFIRMATION' && tmpl.type !== 'OFFER') {
      return NextResponse.json(
        { error: 'Dieses Template wird noch nicht unterstützt.' },
        { status: 400 },
      )
    }

    const guest = stay.guests as unknown as { first_name: string; last_name: string; email: string | null } | null
    const nights = Math.round(
      (new Date(stay.check_out_date).getTime() - new Date(stay.check_in_date).getTime()) / 86400000,
    )
    const stayProperties = stay.properties as unknown as {
      name: string; address: string | null; city: string | null; country: string | null
    } | null
    const stayUnit = stay.units as unknown as { name: string } | null

    const COUNTRY_NAMES: Record<string, string> = {
      AT: 'Österreich', DE: 'Deutschland', CH: 'Schweiz',
      IT: 'Italien', FR: 'Frankreich', LI: 'Liechtenstein',
      SI: 'Slowenien', SK: 'Slowakei', CZ: 'Tschechien',
      HU: 'Ungarn', PL: 'Polen', HR: 'Kroatien',
    }
    const rawCountry = stayProperties?.country?.trim() ?? null
    const countryDisplay = rawCountry
      ? (COUNTRY_NAMES[rawCountry.toUpperCase()] ?? rawCountry)
      : null

    const hotelAddressParts = [
      stayProperties?.address,
      stayProperties?.city,
      countryDisplay,
    ].filter(Boolean)

    const rendered = renderBookingEmailTemplate(
      tmpl.type === 'OFFER' ? 'OFFER' : 'BOOKING_CONFIRMATION',
      {
        guestName: guest ? `${guest.first_name} ${guest.last_name}`.trim() : 'Gast',
        hotelName: stayProperties?.name ?? property.name,
        hotelAddress: hotelAddressParts.length > 0 ? hotelAddressParts.join('\n') : undefined,
        hotelPhone: org?.phone?.trim() || undefined,
        checkIn: stay.check_in_date,
        checkOut: stay.check_out_date,
        checkoutTime: stay.departure_time ?? undefined,
        nights,
        adultsCount: stay.adults,
        childrenCount: stay.children,
        roomName: stay.room_label ?? stayUnit?.name ?? 'Zimmer',
        nightlyRate: stay.nightly_rate != null ? Number(stay.nightly_rate) : undefined,
        subtotalAmount: stay.subtotal_amount != null ? Number(stay.subtotal_amount) : undefined,
        extrasAmount: stay.extras_amount != null ? Number(stay.extras_amount) : undefined,
        localTaxAmount:
          stay.local_tax_applicable && stay.local_tax_amount != null
            ? Number(stay.local_tax_amount)
            : undefined,
        totalPrice: Number(stay.total_amount ?? 0),
        currency: stay.currency,
        bookingReference: stay.external_reference ?? stay.id,
        arrivalTime: stay.arrival_time ?? undefined,
        hotelEmail: replyTo,
        paid: false,
      },
    )

    html = rendered.html
    text = rendered.text

    if (message?.trim()) {
      html = appendNoteToHtml(html, message.trim())
      text += `\n\n---\n${message.trim()}`
    }
  }

  // ── Send via Resend ───────────────────────────────────────────────────────

  const fromName = `${property.name} via EZHost`.replace(/[\r\n<>]/g, ' ').trim()
  const from = `${fromName} <${fromEmail}>`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: recipients, reply_to: replyTo, subject, html, text }),
  })

  const resendBody = (await resendRes.json().catch(() => null)) as {
    id?: string
    message?: string
  } | null

  const resendEmailId = resendBody && 'id' in resendBody ? resendBody.id ?? null : null
  const status = resendRes.ok ? 'SENT' : 'FAILED'
  const errorMessage =
    !resendRes.ok
      ? (resendBody && 'message' in resendBody ? resendBody.message : null) ??
        `Resend status ${resendRes.status}`
      : null

  // ── Record delivery ───────────────────────────────────────────────────────

  await supabase.from('email_deliveries').insert({
    organization_id: stay.organization_id,
    booking_id: stayId,
    recipient,
    subject,
    email_type: emailType,
    template_type: templateType,
    language,
    sent_by_profile_id: profile.id,
    resend_email_id: resendEmailId,
    status,
    sent_at: status === 'SENT' ? new Date().toISOString() : null,
    error_message: errorMessage,
  })

  if (!resendRes.ok) {
    return NextResponse.json({ error: errorMessage ?? 'E-Mail konnte nicht gesendet werden.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
