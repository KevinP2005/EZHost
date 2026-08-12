export type BookingEmailType = 'BOOKING_CONFIRMATION' | 'OFFER'

export interface BookingEmailTemplateData {
  guestName: string
  hotelName: string
  checkIn: string
  checkOut: string
  nights: number
  guestCount: number
  roomName: string
  subtotalAmount?: number
  extrasAmount?: number
  totalPrice: number
  currency: string
  bookingReference: string
  arrivalTime?: string
  hotelEmail?: string
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
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency }).format(amount)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-AT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function guestFirstName(fullName: string) {
  return escapeHtml(fullName.trim().split(/\s+/)[0] ?? fullName)
}

function renderPricingRows(data: BookingEmailTemplateData) {
  const currency = data.currency

  if (data.subtotalAmount != null) {
    const extrasRow =
      data.extrasAmount != null && data.extrasAmount > 0
        ? `<tr>
            <td style="padding:0 18px 14px;color:#6b7280;">Extras &amp; Zusatzleistungen</td>
            <td align="right" style="padding:0 18px 14px;font-weight:600;color:#111827;">${escapeHtml(formatMoney(data.extrasAmount, currency))}</td>
          </tr>`
        : ''

    return `
      <tr>
        <td style="padding:16px 18px 14px;color:#6b7280;">Unterkunftspreis</td>
        <td align="right" style="padding:16px 18px 14px;font-weight:600;color:#111827;">${escapeHtml(formatMoney(data.subtotalAmount, currency))}</td>
      </tr>
      ${extrasRow}
      <tr>
        <td colspan="2" style="padding:0 18px 16px;border-bottom:1px solid #e5e7eb;"></td>
      </tr>
      <tr>
        <td style="padding:16px 18px;font-size:17px;font-weight:700;color:#111827;">Gesamtpreis</td>
        <td align="right" style="padding:16px 18px;font-size:19px;font-weight:700;color:#4f46e5;">${escapeHtml(formatMoney(data.totalPrice, currency))}</td>
      </tr>
    `
  }

  return `
    <tr>
      <td style="padding:16px 18px;font-size:17px;font-weight:700;color:#111827;">Gesamtpreis</td>
      <td align="right" style="padding:16px 18px;font-size:19px;font-weight:700;color:#4f46e5;">${escapeHtml(formatMoney(data.totalPrice, currency))}</td>
    </tr>
  `
}

function renderContactSection(data: BookingEmailTemplateData) {
  if (!data.hotelEmail) return ''

  const emailHref = `mailto:${escapeHtml(data.hotelEmail)}`
  return `
    <tr>
      <td style="padding:0 28px 28px;">
        <h2 style="margin:0 0 14px;font-size:20px;color:#111827;">Kontakt</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
          <tr>
            <td style="padding:20px;">
              <div style="font-size:17px;font-weight:700;color:#111827;">${escapeHtml(data.hotelName)}</div>
              <div style="margin-top:10px;font-size:14px;line-height:1.7;color:#4b5563;">
                E-Mail: <a href="${emailHref}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(data.hotelEmail)}</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

function renderHtml(type: BookingEmailType, data: BookingEmailTemplateData) {
  const isOffer = type === 'OFFER'
  const firstName = guestFirstName(data.guestName)
  const paymentStatus = isOffer ? 'Angebot (unverbindlich)' : 'Bestätigt'

  const checkInRow = data.arrivalTime
    ? `<div style="margin-top:4px;font-size:14px;color:#4b5563;">Check-in ab ${escapeHtml(data.arrivalTime.slice(0, 5))} Uhr</div>`
    : ''

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${isOffer ? 'Angebot' : 'Buchungsbestätigung'} – ${escapeHtml(data.hotelName)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:18px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:24px;font-weight:700;color:#ffffff;">EZHost</td>
                  <td align="right" style="font-size:13px;line-height:1.5;color:#e0e7ff;">
                    ${isOffer ? 'Angebotsnummer' : 'Buchungsnummer'}<br>
                    <strong style="font-size:16px;color:#ffffff;">${escapeHtml(data.bookingReference.slice(0, 8).toUpperCase())}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 28px 20px;">
              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.25;color:#111827;">
                ${isOffer ? `Ihr Angebot, ${firstName}!` : `Vielen Dank, ${firstName}!`}
              </h1>
              <p style="margin:0;font-size:16px;line-height:1.65;color:#4b5563;">
                ${isOffer
                  ? `Wir haben Ihr Angebot bei <strong>${escapeHtml(data.hotelName)}</strong> vorbereitet. Das Angebot ist unverbindlich und gilt bis auf Widerruf.`
                  : `Ihre Buchung bei <strong>${escapeHtml(data.hotelName)}</strong> wurde erfolgreich bestätigt. Wir freuen uns, Sie am <strong>${escapeHtml(formatDate(data.checkIn))}</strong> begrüßen zu dürfen.`
                }
              </p>
            </td>
          </tr>

          <!-- Dates -->
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;">
                <tr>
                  <td width="50%" style="padding:20px;border-right:1px solid #c7d2fe;">
                    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#4f46e5;">Anreise</div>
                    <div style="margin-top:8px;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(formatDate(data.checkIn))}</div>
                    ${checkInRow}
                  </td>
                  <td width="50%" style="padding:20px;">
                    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#4f46e5;">Abreise</div>
                    <div style="margin-top:8px;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(formatDate(data.checkOut))}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Booking details -->
          <tr>
            <td style="padding:0 28px 24px;">
              <h2 style="margin:0 0 14px;font-size:20px;color:#111827;">Buchungsinformationen</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:15px;">
                <tr>
                  <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #e5e7eb;">Unterkunft</td>
                  <td align="right" style="padding:10px 0;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(data.roomName)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #e5e7eb;">Aufenthaltsdauer</td>
                  <td align="right" style="padding:10px 0;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${data.nights} ${data.nights === 1 ? 'Nacht' : 'Nächte'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #e5e7eb;">Gäste</td>
                  <td align="right" style="padding:10px 0;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${data.guestCount}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#6b7280;">${isOffer ? 'Angebotsnummer' : 'Buchungsnummer'}</td>
                  <td align="right" style="padding:10px 0;font-weight:600;color:#111827;">${escapeHtml(data.bookingReference.slice(0, 8).toUpperCase())}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pricing -->
          <tr>
            <td style="padding:0 28px 24px;">
              <h2 style="margin:0 0 14px;font-size:20px;color:#111827;">Preisübersicht</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;font-size:15px;">
                ${renderPricingRows(data)}
              </table>
              <p style="margin:10px 0 0;font-size:13px;color:#6b7280;">
                Status: <strong style="color:#111827;">${escapeHtml(paymentStatus)}</strong>
              </p>
            </td>
          </tr>

          <!-- Hotel contact (optional) -->
          ${renderContactSection(data)}

          <!-- Footer -->
          <tr>
            <td style="background:#111827;padding:24px 28px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;">EZHost</div>
              <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                Diese ${isOffer ? 'Angebotsübersicht' : 'Buchungsbestätigung'} wurde über EZHost versendet.<br>
                Bei Fragen wenden Sie sich bitte direkt an <strong style="color:#e5e7eb;">${escapeHtml(data.hotelName)}</strong>.
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#6b7280;">
                EZHost – einfache Buchungs- und Gästeverwaltung für moderne Unterkünfte
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function renderPlainText(type: BookingEmailType, data: BookingEmailTemplateData) {
  const isOffer = type === 'OFFER'
  const lines = [
    isOffer ? `Ihr Angebot – ${data.hotelName}` : `Buchungsbestätigung – ${data.hotelName}`,
    '',
    isOffer
      ? `Guten Tag ${data.guestName}, anbei Ihr unverbindliches Angebot.`
      : `Guten Tag ${data.guestName}, Ihre Buchung wurde erfolgreich bestätigt.`,
    '',
    `Unterkunft: ${data.roomName}`,
    `Anreise: ${formatDate(data.checkIn)}${data.arrivalTime ? ` (ab ${data.arrivalTime.slice(0, 5)} Uhr)` : ''}`,
    `Abreise: ${formatDate(data.checkOut)}`,
    `Aufenthaltsdauer: ${data.nights} ${data.nights === 1 ? 'Nacht' : 'Nächte'}`,
    `Gäste: ${data.guestCount}`,
    `Gesamtpreis: ${formatMoney(data.totalPrice, data.currency)}`,
    `${isOffer ? 'Angebotsnummer' : 'Buchungsnummer'}: ${data.bookingReference.slice(0, 8).toUpperCase()}`,
  ]

  if (data.hotelEmail) {
    lines.push('', `Kontakt: ${data.hotelEmail}`)
  }

  return lines.join('\n')
}

export function renderBookingEmailTemplate(type: BookingEmailType, data: BookingEmailTemplateData) {
  const isOffer = type === 'OFFER'
  const subject = isOffer
    ? `Ihr Angebot von ${data.hotelName}`
    : `Buchungsbestätigung – ${data.hotelName}`

  return {
    subject,
    html: renderHtml(type, data),
    text: renderPlainText(type, data),
  }
}
