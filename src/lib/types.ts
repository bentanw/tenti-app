// Shared, client-safe types and constants (no server imports here).

export const PROPERTY_TYPES = ['TEXT', 'NUMBER', 'SELECT', 'DATE', 'CHECKBOX', 'URL'] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  SELECT: 'Select',
  DATE: 'Date',
  CHECKBOX: 'Checkbox',
  URL: 'URL',
}

export const OPTION_COLORS = [
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
] as const
export type OptionColor = (typeof OPTION_COLORS)[number]

export const OPTION_COLOR_CLASSES: Record<OptionColor, string> = {
  gray: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  brown: 'bg-amber-100/70 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  blue: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  purple: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  pink: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
}

export type SelectOption = { id: string; name: string; color: OptionColor }

export type PropertyValue = string | number | boolean | null
export type PageValues = Record<string, PropertyValue>

export type TranscriptSegment = { start: number; end: number; text: string }

/** Link-in-bio themes. Each is a set of Tailwind classes applied to the public page. */
export const LINK_THEMES = {
  midnight: {
    label: 'Midnight',
    page: 'bg-zinc-950 text-white',
    button: 'bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/15',
    muted: 'text-zinc-400',
  },
  paper: {
    label: 'Paper',
    page: 'bg-stone-100 text-stone-900',
    button: 'bg-white hover:bg-stone-50 text-stone-900 ring-1 ring-stone-300 shadow-sm',
    muted: 'text-stone-500',
  },
  sunset: {
    label: 'Sunset',
    page: 'bg-gradient-to-b from-orange-400 via-rose-500 to-fuchsia-700 text-white',
    button: 'bg-white/20 hover:bg-white/30 text-white backdrop-blur ring-1 ring-white/30',
    muted: 'text-white/80',
  },
  forest: {
    label: 'Forest',
    page: 'bg-emerald-950 text-emerald-50',
    button: 'bg-emerald-50 hover:bg-white text-emerald-950',
    muted: 'text-emerald-300',
  },
} as const
export type LinkTheme = keyof typeof LINK_THEMES

/** First path segments the app uses, so they can't be claimed as link-in-bio handles. */
export const RESERVED_HANDLES = [
  'databases',
  'pages',
  'transcripts',
  'links',
  'go',
  'api',
  'settings',
  'login',
  'signup',
  'auth',
  'home',
]

export function formatTimestamp(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** DATE values are stored as local calendar days ("YYYY-MM-DD"), never as timestamps. */
export function parseDateValue(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined
}

export function toDateValue(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}
