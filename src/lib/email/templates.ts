export type BookingEmailType = 'BOOKING_CONFIRMATION' | 'OFFER'

export interface BookingEmailTemplateData {
  guestName: string
  hotelName: string
  hotelAddress?: string
  hotelPhone?: string
  checkIn: string
  checkOut: string
  checkoutTime?: string
  nights: number
  adultsCount: number
  childrenCount: number
  roomName: string
  nightlyRate?: number
  subtotalAmount?: number
  extrasAmount?: number
  localTaxAmount?: number
  totalPrice: number
  currency: string
  bookingReference: string
  arrivalTime?: string
  hotelEmail?: string
  paid?: boolean
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

function formatGuestCount(adults: number, children: number): string {
  const parts: string[] = []
  parts.push(`${adults} ${adults === 1 ? 'Erwachsener' : 'Erwachsene'}`)
  if (children > 0) parts.push(`${children} ${children === 1 ? 'Kind' : 'Kinder'}`)
  return parts.join(', ')
}

function renderPricingRows(data: BookingEmailTemplateData) {
  const { currency, nights, nightlyRate, subtotalAmount, extrasAmount, localTaxAmount, totalPrice } = data

  const rows: string[] = []

  if (nightlyRate != null && nights > 0) {
    const nightLabel = nights === 1 ? 'Nacht' : 'Nächte'
    const rateLabel = `${nights} ${nightLabel} × ${escapeHtml(formatMoney(nightlyRate, currency))}`
    rows.push(`
      <tr>
        <td style="padding:14px 18px 10px;color:#6b7280;">${rateLabel}</td>
        <td align="right" style="padding:14px 18px 10px;font-weight:600;color:#111827;">
          ${escapeHtml(formatMoney(nightlyRate * nights, currency))}
        </td>
      </tr>`)
  } else if (subtotalAmount != null) {
    rows.push(`
      <tr>
        <td style="padding:14px 18px 10px;color:#6b7280;">Unterkunftspreis</td>
        <td align="right" style="padding:14px 18px 10px;font-weight:600;color:#111827;">
          ${escapeHtml(formatMoney(subtotalAmount, currency))}
        </td>
      </tr>`)
  }

  if (extrasAmount != null && extrasAmount > 0) {
    rows.push(`
      <tr>
        <td style="padding:0 18px 10px;color:#6b7280;">Extras &amp; Zusatzleistungen</td>
        <td align="right" style="padding:0 18px 10px;font-weight:600;color:#111827;">
          ${escapeHtml(formatMoney(extrasAmount, currency))}
        </td>
      </tr>`)
  }

  if (localTaxAmount != null && localTaxAmount > 0) {
    rows.push(`
      <tr>
        <td style="padding:0 18px 10px;color:#6b7280;">Steuern und Gebühren</td>
        <td align="right" style="padding:0 18px 10px;font-weight:600;color:#111827;">
          ${escapeHtml(formatMoney(localTaxAmount, currency))}
        </td>
      </tr>`)
  }

  // Placeholder row for future discounts — rendered when present
  // rows.push(renderDiscountRow(discount))

  rows.push(`
    <tr>
      <td colspan="2" style="padding:0 18px 2px;border-bottom:1px solid #e5e7eb;"></td>
    </tr>
    <tr>
      <td style="padding:14px 18px;font-size:17px;font-weight:700;color:#111827;">Gesamtpreis</td>
      <td align="right" style="padding:14px 18px;font-size:19px;font-weight:700;color:#4f46e5;">
        ${escapeHtml(formatMoney(totalPrice, currency))}
      </td>
    </tr>`)

  return rows.join('\n')
}

function renderHotelInfoSection(data: BookingEmailTemplateData) {
  if (!data.hotelAddress && !data.hotelPhone && !data.hotelEmail) return ''

  const addressLines = data.hotelAddress
    ? data.hotelAddress.split('\n').map((l) => `<div>${escapeHtml(l)}</div>`).join('')
    : ''

  const phoneEl = data.hotelPhone
    ? `<div style="margin-top:12px;">Telefon: <a href="tel:${escapeHtml(data.hotelPhone)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(data.hotelPhone)}</a></div>`
    : ''

  const emailEl = data.hotelEmail
    ? `<div style="margin-top:4px;">E-Mail: <a href="mailto:${escapeHtml(data.hotelEmail)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(data.hotelEmail)}</a></div>`
    : ''

  return `
    <tr>
      <td style="padding:0 28px 28px;">
        <h2 style="margin:0 0 14px;font-size:20px;color:#111827;">Hotelinformationen</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
               style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
          <tr>
            <td style="padding:20px;font-size:14px;line-height:1.7;color:#4b5563;">
              <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:6px;">${escapeHtml(data.hotelName)}</div>
              ${addressLines}
              ${phoneEl}
              ${emailEl}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function renderHtml(type: BookingEmailType, data: BookingEmailTemplateData) {
  const isOffer = type === 'OFFER'
  const firstName = guestFirstName(data.guestName)

  const checkInRow = data.arrivalTime
    ? `<div style="margin-top:6px;font-size:13px;color:#4b5563;">Check-in ab ${escapeHtml(data.arrivalTime.slice(0, 5))} Uhr</div>`
    : ''

  const checkOutRow = data.checkoutTime
    ? `<div style="margin-top:6px;font-size:13px;color:#4b5563;">Check-out bis ${escapeHtml(data.checkoutTime.slice(0, 5))} Uhr</div>`
    : ''

  const paymentStatusEl = !isOffer
    ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
        Zahlungsstatus:
        ${data.paid === true
          ? '<strong style="color:#16a34a;">Bezahlt</strong>'
          : '<strong style="color:#d97706;">Ausstehend</strong>'
        }
       </p>`
    : ''

  const guestLine = formatGuestCount(data.adultsCount, data.childrenCount)

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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
               style="max-width:680px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#312e81 55%,#0f0b24 100%);padding:20px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:24px;font-weight:700;color:#ffffff;">EZHost</td>
                  <td align="right" style="font-size:12px;line-height:1.6;color:#c7d2fe;">
                    ${isOffer ? 'Angebotsnummer' : 'Buchungsnummer'}<br>
                    <strong style="font-size:15px;color:#ffffff;letter-spacing:.02em;">${escapeHtml(data.bookingReference.slice(0, 8).toUpperCase())}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 28px 20px;">
              <h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#111827;">
                ${isOffer ? `Ihr Angebot, ${firstName}!` : `Vielen Dank, ${firstName}!`}
              </h1>
              ${isOffer
                ? `<p style="margin:0;font-size:16px;line-height:1.7;color:#4b5563;">
                    Wir haben Ihr Angebot bei <strong>${escapeHtml(data.hotelName)}</strong> vorbereitet.<br>
                    Das Angebot ist unverbindlich und gilt bis auf Widerruf.
                   </p>`
                : `<p style="margin:0;font-size:16px;line-height:1.7;color:#4b5563;">
                    Ihre Buchung bei <strong>${escapeHtml(data.hotelName)}</strong> wurde erfolgreich bestätigt.<br>
                    Wir freuen uns, Sie am <strong>${escapeHtml(formatDate(data.checkIn))}</strong> begrüßen zu dürfen.
                   </p>`
              }
            </td>
          </tr>

          <!-- Dates -->
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;">
                <tr>
                  <td width="50%" style="padding:20px;border-right:1px solid #c7d2fe;vertical-align:top;">
                    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#4f46e5;">Anreise</div>
                    <div style="margin-top:8px;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(formatDate(data.checkIn))}</div>
                    ${checkInRow}
                  </td>
                  <td width="50%" style="padding:20px;vertical-align:top;">
                    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#4f46e5;">Abreise</div>
                    <div style="margin-top:8px;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(formatDate(data.checkOut))}</div>
                    ${checkOutRow}
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
                  <td align="right" style="padding:10px 0;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(guestLine)}</td>
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;font-size:15px;">
                ${renderPricingRows(data)}
              </table>
              ${paymentStatusEl}
            </td>
          </tr>

          <!-- Hotel information -->
          ${renderHotelInfoSection(data)}

          <!-- Footer -->
          <!-- CTA -->
          <tr>
            <td style="padding:0 28px 32px;text-align:center;">
              <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:.01em;">
                Buchung ansehen oder verwalten
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111827;padding:28px 28px 24px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;margin-bottom:12px;">EZHost</div>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#9ca3af;">
                Diese ${isOffer ? 'Angebotsübersicht' : 'Buchungsbestätigung'} wurde über EZHost versendet.<br>
                Bei Fragen wenden Sie sich bitte direkt an <strong style="color:#e5e7eb;">${escapeHtml(data.hotelName)}</strong>${data.hotelEmail ? ` unter <a href="mailto:${escapeHtml(data.hotelEmail)}" style="color:#a5b4fc;text-decoration:none;">${escapeHtml(data.hotelEmail)}</a>` : ''}${data.hotelPhone ? ` oder ${escapeHtml(data.hotelPhone)}` : ''}.
                <br><br>
                <span style="font-size:11px;color:#6b7280;">EZHost - einfache Buchungs- und Gästeverwaltung für moderne Unterkünfte</span>
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
  const guestLine = formatGuestCount(data.adultsCount, data.childrenCount)

  const lines = [
    isOffer ? `Ihr Angebot – ${data.hotelName}` : `Buchungsbestätigung – ${data.hotelName}`,
    '',
    isOffer
      ? `Guten Tag ${data.guestName}, anbei Ihr unverbindliches Angebot.`
      : `Guten Tag ${data.guestName}, Ihre Buchung wurde erfolgreich bestätigt. Wir freuen uns, Sie am ${formatDate(data.checkIn)} begrüßen zu dürfen.`,
    '',
    `Unterkunft: ${data.roomName}`,
    `Anreise: ${formatDate(data.checkIn)}${data.arrivalTime ? ` (Check-in ab ${data.arrivalTime.slice(0, 5)} Uhr)` : ''}`,
    `Abreise: ${formatDate(data.checkOut)}${data.checkoutTime ? ` (Check-out bis ${data.checkoutTime.slice(0, 5)} Uhr)` : ''}`,
    `Aufenthaltsdauer: ${data.nights} ${data.nights === 1 ? 'Nacht' : 'Nächte'}`,
    `Gäste: ${guestLine}`,
    `Gesamtpreis: ${formatMoney(data.totalPrice, data.currency)}`,
    `${isOffer ? 'Angebotsnummer' : 'Buchungsnummer'}: ${data.bookingReference.slice(0, 8).toUpperCase()}`,
  ]

  if (!isOffer) {
    lines.push(`Zahlungsstatus: ${data.paid ? 'Bezahlt' : 'Ausstehend'}`)
  }

  if (data.hotelName || data.hotelAddress || data.hotelPhone || data.hotelEmail) {
    lines.push('', `Hotelinformationen: ${data.hotelName}`)
    if (data.hotelAddress) lines.push(data.hotelAddress)
    if (data.hotelPhone) lines.push(`Telefon: ${data.hotelPhone}`)
    if (data.hotelEmail) lines.push(`E-Mail: ${data.hotelEmail}`)
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
