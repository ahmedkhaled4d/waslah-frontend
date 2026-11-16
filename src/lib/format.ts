import { format, formatDistanceToNowStrict, isToday, isYesterday, isThisYear } from 'date-fns'

export function formatRelative(iso: string | undefined | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return formatDistanceToNowStrict(date, { addSuffix: true })
}

/** Compact timestamp for lists: time today, weekday this week, date otherwise. */
export function formatListTime(iso: string | undefined | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Yesterday'
  if (isThisYear(date)) return format(date, 'd MMM')
  return format(date, 'd MMM yyyy')
}

export function formatTime(iso: string | undefined | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, 'HH:mm')
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, 'd MMM yyyy, HH:mm')
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, 'd MMM yyyy')
}

/** Day separator label used in the message thread. */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (isThisYear(date)) return format(date, 'EEEE, d MMMM')
  return format(date, 'd MMMM yyyy')
}

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${value.toLocaleString()} ${currency.toUpperCase()}`
  }
}

/** Stable short display handle for a contact until the contacts API exists. */
export function contactHandle(contactId: string): string {
  return `Contact ${contactId.slice(-6).toUpperCase()}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/** Free-form replies are allowed for 24h after the last customer message. */
export const WINDOW_MS = 24 * 60 * 60 * 1000

export function windowState(lastInboundAt: string | undefined | null): {
  open: boolean
  closesAt: Date | null
} {
  if (!lastInboundAt) return { open: false, closesAt: null }
  const closesAt = new Date(new Date(lastInboundAt).getTime() + WINDOW_MS)
  return { open: closesAt.getTime() > Date.now(), closesAt }
}

/** Deterministic hue for an id, used for contact avatars. */
export function hueFromId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash % 360
}
