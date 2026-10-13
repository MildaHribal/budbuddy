import type { Settings } from '../types/grow'

/** A first web visit opens straight into the demo garden; the native app keeps its onboarding. */
export function skipsOnboarding(settings: Pick<Settings, 'demo' | 'onboarded'>, native: boolean): boolean {
  return !native && settings.demo && !settings.onboarded
}
