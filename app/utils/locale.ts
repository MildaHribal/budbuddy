import { ref } from 'vue'

export type Locale = 'en' | 'cs'
/** Czech is hidden for now; flip to bring it back. */
export const CZECH_ENABLED = false

export const LOCALES: { value: Locale, label: string }[] = CZECH_ENABLED
  ? [{ value: 'cs', label: 'Čeština' }, { value: 'en', label: 'English' }]
  : [{ value: 'en', label: 'English' }]

// Reactive so utils (stageInfo, formatDate…) re-render on switch.
export const locale = ref<Locale>('en')

export function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'cs'
}

export function detectLocale(): Locale {
  if (!CZECH_ENABLED) return 'en'
  const lang = typeof navigator === 'undefined' ? '' : navigator.language ?? ''
  return lang.toLowerCase().startsWith('cs') || lang.toLowerCase().startsWith('sk') ? 'cs' : 'en'
}

export function intlLocale(): string {
  return locale.value === 'cs' ? 'cs-CZ' : 'en-GB'
}

const formatters = new Map<string, Intl.NumberFormat>()

/**
 * Formats a number in the APP language (cs: decimal comma, en: dot), not the browser locale.
 * `digits` = max fraction digits; `fixed` also pads to that many (6 → "6,0").
 */
export function formatNumber(n: number | null | undefined, digits = 1, fixed = false): string {
  if (n == null || !Number.isFinite(n)) return '–'
  const key = `${locale.value}|${digits}|${fixed}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: digits, minimumFractionDigits: fixed ? digits : 0 })
    formatters.set(key, f)
  }
  return f.format(n)
}

export type Plural = { one: string, few?: string, other: string }

export function plural(forms: Plural, n: number): string {
  if (n === 1) return forms.one
  if (locale.value === 'cs' && n >= 2 && n <= 4) return forms.few ?? forms.other
  return forms.other
}

/** Picks the value for the current locale from an { en, cs } pair. */
export function l<T>(v: { en: T, cs: T }): T {
  return v[locale.value]
}

/** Czech vocative of a first name (Karel → Karle, Jana → Jano); good enough for greetings. */
export function czechVocative(name: string): string {
  const [first = '', ...rest] = name.trim().split(/\s+/)
  const w = first
  const lower = w.toLowerCase()
  const keep = (s: string) => [s, ...rest].join(' ')
  // only decline ordinary names: "Karel", not "QA", "MC" or "dj"
  if (!w || w.length < 3 || !/^\p{Lu}\p{Ll}+$/u.test(w) || /[eiíouyůú]$/.test(lower)) return name.trim()
  if (lower.endsWith('a')) return keep(w.slice(0, -1) + 'o')
  if (lower.endsWith('ek')) return keep(w.slice(0, -2) + 'ku')
  if (/[^aeiouyáéíóúý]el$/.test(lower)) return keep(w.slice(0, -2) + 'le')
  if (/[^aeiouyáéíóúý]r$/.test(lower)) return keep(w.slice(0, -1) + 'ře')
  if (/[šžčřjcx]$/.test(lower)) return keep(w + 'i')
  if (/[khg]$/.test(lower)) return keep(w + 'u')
  return keep(w + 'e')
}
