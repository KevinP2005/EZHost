import { createClient } from '@/lib/supabase/server'
import type { BookingStatus, Stay } from '@/lib/database.types'
import {
  renderBookingEmailTemplate,
  type BookingEmailTemplateData,
  type BookingEmailType,
} from '@/lib/email/templates'

interface SendBookingEmailInput {
  organizationId: string
  stay: Stay
  guestName: string
  recipient: string
  hotelName: string
  roomName: string
  bookingStatus: BookingStatus
}

export interface SendBookingEmailResult {
  ok: boolean
  warning?: string
}

interface ResendSuccess {
  id?: string
}

function calculateNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`)
  const end = new Date(`${checkOut}T00:00:00`)
  const millisecondsPerDay = 1000 * 60 * 60 * 24

  return Math.max(Math.round((end.getTime() - start.getTime()) / millisecondsPerDay), 0)
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown email delivery error'
}

function resolveEmailType(bookingStatus: BookingStatus): BookingEmailType {
  return bookingStatus === 'OFFER' ? 'OFFER' : 'BOOKING_CONFIRMATION'
}

async function recordEmailDelivery(input: {
  organizationId: string
  bookingId: string
  recipient: string
  emailType: BookingEmailType
  resendEmailId?: string
  status: 'SENT' | 'FAILED'
  errorMessage?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('email_deliveries').insert({
    organization_id: input.organizationId,
    booking_id: input.bookingId,
    recipient: input.recipient,
    email_type: input.emailType,
    resend_email_id: input.resendEmailId ?? null,
    status: input.status,
    sent_at: input.status === 'SENT' ? new Date().toISOString() : null,
    error_message: input.errorMessage ?? null,
  })

  if (error) throw new Error(error.message)
}

async function sendResendEmail(input: {
  from: string
  to: string
  subject: string
  html: string
  text: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  const payload = await response.json().catch(() => null) as ResendSuccess | { message?: string } | null

  if (!response.ok) {
    const message = payload && 'message' in payload && payload.message
      ? payload.message
      : `Resend request failed with status ${response.status}.`
    throw new Error(message)
  }

  return payload && 'id' in payload ? payload.id : undefined
}

export async function sendBookingEmail(input: SendBookingEmailInput): Promise<SendBookingEmailResult> {
  const emailType = resolveEmailType(input.bookingStatus)
  const warning = input.bookingStatus === 'OFFER'
    ? 'Offer saved, but the email could not be sent.'
    : 'Booking saved, but the confirmation email could not be sent.'

  try {
    const from = process.env.RESEND_FROM_EMAIL
    if (!from) throw new Error('RESEND_FROM_EMAIL is not configured.')

    const templateData: BookingEmailTemplateData = {
      guestName: input.guestName,
      hotelName: input.hotelName,
      checkIn: input.stay.check_in_date,
      checkOut: input.stay.check_out_date,
      nights: calculateNights(input.stay.check_in_date, input.stay.check_out_date),
      guestCount: input.stay.adults + input.stay.children,
      roomName: input.roomName,
      totalPrice: Number(input.stay.total_amount ?? 0),
      currency: input.stay.currency,
      bookingReference: input.stay.external_reference ?? input.stay.id,
    }
    const template = renderBookingEmailTemplate(emailType, templateData)
    const resendEmailId = await sendResendEmail({
      from,
      to: input.recipient,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    try {
      await recordEmailDelivery({
        organizationId: input.organizationId,
        bookingId: input.stay.id,
        recipient: input.recipient,
        emailType,
        resendEmailId,
        status: 'SENT',
      })
    } catch (logError) {
      console.error('Failed to record email delivery status', logError)
    }

    return { ok: true }
  } catch (error) {
    const errorMessage = toErrorMessage(error)

    try {
      await recordEmailDelivery({
        organizationId: input.organizationId,
        bookingId: input.stay.id,
        recipient: input.recipient,
        emailType,
        status: 'FAILED',
        errorMessage,
      })
    } catch (logError) {
      console.error('Failed to record email delivery status', logError)
    }

    console.error('Failed to send booking email', error)
    return { ok: false, warning }
  }
}
