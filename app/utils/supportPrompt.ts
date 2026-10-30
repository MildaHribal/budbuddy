export interface SupportState { firstOpen: number, opens: number, lastShown: number, never: boolean }

const DAY = 24 * 3600 * 1000
export const SUPPORT_FIRST_AFTER_DAYS = 7
export const SUPPORT_MIN_OPENS = 5
export const SUPPORT_EVERY_DAYS = 30

/** First a week of use and a few opens, then at most once a month, never after "don't show again". */
export function shouldAskSupport(s: SupportState, now: number, unlimited: boolean): boolean {
  if (s.never) return false
  if (now - s.firstOpen < SUPPORT_FIRST_AFTER_DAYS * DAY || s.opens < SUPPORT_MIN_OPENS) return false
  // paying growers already helped, ask them less often
  const every = (unlimited ? 3 : 1) * SUPPORT_EVERY_DAYS * DAY
  return now - s.lastShown >= every
}
