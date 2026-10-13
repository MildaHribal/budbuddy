import { translate as t } from '~/composables/useI18n'
import { addDays, formatDate } from '~/utils/date'
import { formatNumber, intlLocale, l, locale } from '~/utils/locale'
import type { WeatherAlert } from './weather'

/** "today", "tomorrow" or "Thu 16 Oct" – lowercase so it reads inside a sentence */
export function dayWhen(date: string, today: string): string {
  if (date === today) return l({ en: 'today', cs: 'dnes' })
  if (date === addDays(today, 1)) return l({ en: 'tomorrow', cs: 'zítra' })
  if (date === addDays(today, -1)) return l({ en: 'yesterday', cs: 'včera' })
  return formatDate(date, { weekday: 'short', day: 'numeric', month: locale.value === 'cs' ? 'numeric' : 'short' })
}

export function dayShort(date: string, today: string): string {
  if (date === today) return t('environment.weather.today')
  if (date === addDays(today, -1)) return t('environment.weather.yesterday')
  return formatDate(date, { weekday: 'short', day: 'numeric' })
}

export function alertTitle(a: WeatherAlert, today: string): string {
  return t(`environment.alerts.${a.type}`, { when: dayWhen(a.date, today) })
}

export function alertText(a: WeatherAlert): string {
  return t(`environment.alerts.${a.type}Text`, { v: formatNumber(a.value, a.type === 'mould' ? 0 : 1) })
}

/** chart / tile colours from the data palette (DESIGN.md: entry-pest, water blue, entry-measure) */
export const METRIC_COLOR = { temp: '#f0905a', rh: '#5fb4ee', vpd: '#5fd9c4' } as const

/** "5 min ago", "3 h ago", or a date */
export function ago(iso: string | number | null, now = Date.now()): string {
  if (iso === null) return ''
  const ms = typeof iso === 'number' ? iso : Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  const min = Math.round((now - ms) / 60_000)
  const rtf = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto', style: 'short' })
  if (min < 1) return rtf.format(0, 'minute')
  if (min < 60) return rtf.format(-min, 'minute')
  if (min < 48 * 60) return rtf.format(-Math.round(min / 60), 'hour')
  return new Date(ms).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' })
}

export function timeLabel(ms: number, withDate: boolean): string {
  const d = new Date(ms)
  const time = d.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })
  return withDate ? `${d.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'numeric' })} ${time}` : time
}
