import { registerPlugin } from '@capacitor/core'

export interface WidgetBridgePlugin {
  /** Re-renders every home-screen widget from the saved data. */
  refresh(): Promise<void>
}

export const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge')
