// Play Asset Delivery pack "ai_pack" through the native AiPack plugin (android/). Absent plugin = no pack.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export type AssetPackStatus = 'none' | 'pending' | 'downloading' | 'waiting_wifi' | 'needs_confirmation' | 'completed' | 'failed' | 'canceled'

export interface AssetPackState {
  status: AssetPackStatus
  bytes: number
  total: number
}

interface AiPackPlugin {
  getState(): Promise<AssetPackState>
  fetch(): Promise<void>
  cancel(): Promise<void>
  confirm(): Promise<void>
  /** absolute path of the pack's assets folder (contains ai/), or null */
  location(): Promise<{ path: string | null }>
  remove(): Promise<void>
  addListener(event: 'progress', cb: (s: AssetPackState) => void): Promise<PluginListenerHandle>
}

export const AiPack = registerPlugin<AiPackPlugin>('AiPack')

export const assetPackAvailable = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('AiPack')

/** URL prefix of the installed pack's ai/ folder, served by the Capacitor WebView. */
export async function assetPackBase(): Promise<string | null> {
  if (!assetPackAvailable()) return null
  const { path } = await AiPack.location()
  return path ? Capacitor.convertFileSrc(`${path.replace(/\/$/, '')}/ai/`) : null
}
