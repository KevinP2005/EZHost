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
