import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { blobToBase64 } from '../shareCard'

export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

/** ASCII file name from a plant name etc. */
export function safeFileName(name: string, fallback = 'budbuddy'): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || fallback
}

const isCancel = (e: unknown) => /cancel|abort/i.test(String((e as Error)?.name ?? '') + String((e as Error)?.message ?? e))

/**
 * Android: writes the files to the cache and opens the system share sheet.
 * Web: the Web Share API when it takes files, otherwise a download per file.
 */
export async function shareFiles(files: { blob: Blob, name: string }[], title: string, opts: { preferDownload?: boolean } = {}): Promise<ShareResult> {
  if (!files.length) return 'cancelled'
  if (Capacitor.isNativePlatform()) {
    const uris: string[] = []
    for (const f of files) {
      const { uri } = await Filesystem.writeFile({ path: f.name, data: await blobToBase64(f.blob), directory: Directory.Cache })
      uris.push(uri)
    }
    try {
      await Share.share({ title, files: uris })
      return 'shared'
    } catch (e) {
      if (isCancel(e)) return 'cancelled'
      throw e
    }
  }
  if (!opts.preferDownload && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    const list = files.map(f => new File([f.blob], f.name, { type: f.blob.type }))
    if (navigator.canShare({ files: list })) {
      try {
        await navigator.share({ title, files: list })
        return 'shared'
      } catch (e) {
        if (isCancel(e)) return 'cancelled'
        // fall through to a download (e.g. NotAllowedError without a user gesture)
      }
    }
  }
  for (const f of files) download(f.blob, f.name)
  return 'downloaded'
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Web Share with files exists (Android WebView or a mobile browser). */
export function canShareFiles(): boolean {
  if (Capacitor.isNativePlatform()) return true
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}
