export type BookingEmailType = 'BOOKING_CONFIRMATION' | 'OFFER'

export interface BookingEmailTemplateData {
  guestName: string
  hotelName: string
  checkIn: string
  checkOut: string
  nights: number
  guestCount: number
  roomName: string
  totalPrice: number
  currency: string
  bookingReference: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).format(amount)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function renderDetails(data: BookingEmailTemplateData) {
  const rows = [
    ['Hotel', data.hotelName],
    ['Check-in', formatDate(data.checkIn)],
    ['Check-out', formatDate(data.checkOut)],
    ['Nights', String(data.nights)],
    ['Guests', String(data.guestCount)],
    ['Room', data.roomName],
    ['Total', formatMoney(data.totalPrice, data.currency)],
    ['Booking reference', data.bookingReference],
  ]

  return rows
    .map(([label, value]) => {
      return `
        <tr>
          <td style="padding: 10px 0; color: #64748b;">${escapeHtml(label)}</td>
          <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${escapeHtml(value)}</td>
        </tr>
      `
    })
    .join('')
}

export function renderBookingEmailTemplate(type: BookingEmailType, data: BookingEmailTemplateData) {
  const isOffer = type === 'OFFER'
  const subject = isOffer
    ? `Your offer from ${data.hotelName}`
    : `Your booking confirmation for ${data.hotelName}`
  const headline = isOffer ? 'Your offer is ready' : 'Your booking is confirmed'
  const intro = isOffer
    ? `Dear ${data.guestName}, thank you for your interest. Here are the details of your offer.`
    : `Dear ${data.guestName}, thank you for your booking. We are happy to confirm your stay.`
  const plainText = [
    headline,
    '',
    intro,
    '',
    `Hotel: ${data.hotelName}`,
    `Check-in: ${formatDate(data.checkIn)}`,
    `Check-out: ${formatDate(data.checkOut)}`,
    `Nights: ${data.nights}`,
    `Guests: ${data.guestCount}`,
    `Room: ${data.roomName}`,
    `Total: ${formatMoney(data.totalPrice, data.currency)}`,
    `Booking reference: ${data.bookingReference}`,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 32px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="padding: 28px 32px; border-bottom: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: .08em;">${escapeHtml(data.hotelName)}</p>
          <h1 style="margin: 0; color: #0f172a; font-size: 24px; line-height: 1.25;">${escapeHtml(headline)}</h1>
        </div>
        <div style="padding: 28px 32px;">
          <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.6;">${escapeHtml(intro)}</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              ${renderDetails(data)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `

  return { subject, html, text: plainText }
}
