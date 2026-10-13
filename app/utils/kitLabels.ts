import type { FeedPhase, FeedSchedule } from '../types/kit'
import { translate } from '../composables/useI18n'
import { locale } from './locale'

/** "Bloom, week 3" */
export function feedWeekLabel(phase: FeedPhase, n: number): string {
  return translate('kit.weekLabel', { phase: translate(`kit.phase.${phase}`), n })
}

type Localized = string | { en: string, cs: string } | undefined

export function localized(v: Localized): string {
  if (!v) return ''
  return typeof v === 'string' ? v : v[locale.value]
}

export const scheduleNotes = (s: Pick<FeedSchedule, 'notes'>) => localized(s.notes)
