import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export type HapticKind = 'tap' | 'success' | 'warning' | 'select'

/** Fire-and-forget tactile feedback; silent on the web. */
export function haptic(kind: HapticKind = 'tap') {
  if (!Capacitor.isNativePlatform()) return
  const run = kind === 'success'
    ? Haptics.notification({ type: NotificationType.Success })
    : kind === 'warning'
      ? Haptics.notification({ type: NotificationType.Warning })
      : kind === 'select'
        ? Haptics.selectionChanged()
        : Haptics.impact({ style: ImpactStyle.Light })
  run.catch(() => {})
}
