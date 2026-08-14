import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats an amount as "€ 999,99" — symbol first, German decimal comma. */
export function formatMoney(value: number | null | undefined, currency: string) {
  if (value == null) return '—'
  const parts = new Intl.NumberFormat('de-DE', { style: 'currency', currency }).formatToParts(value)
  const symbol = parts.find((part) => part.type === 'currency')?.value ?? currency
  const number = parts
    .filter((part) => part.type !== 'currency' && part.type !== 'literal')
    .map((part) => part.value)
    .join('')
  return `${symbol} ${number}`
}

/**
 * This stay's own total (subtotal + its own extras) — distinct from
 * reservations.total_amount, which is the sum across every stay of the
 * reservation. Stays have no dedicated total_amount column; this is the
 * "existing correct stay sum" until one is introduced.
 */
export function stayTotalAmount(stay: { subtotal_amount?: number | null; extras_amount?: number | null }): number | null {
  if (stay.subtotal_amount == null && stay.extras_amount == null) return null
  return (stay.subtotal_amount ?? 0) + (stay.extras_amount ?? 0)
}
