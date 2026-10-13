import { Capacitor } from '@capacitor/core'
import { parsePlantLink } from '~/utils/qr'

export type ScanFailure = 'unsupported' | 'installing' | 'cancelled' | 'failed'

/** Android: Google code scanner via ML Kit (no camera permission needed). */
export async function scanNative(): Promise<{ text: string } | { error: ScanFailure }> {
  try {
    const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning')
    if (!(await BarcodeScanner.isSupported()).supported) return { error: 'unsupported' }
    if (!(await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()).available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule()
      return { error: 'installing' }
    }
    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] })
    const text = barcodes[0]?.rawValue
    return text ? { text } : { error: 'cancelled' }
  } catch (e) {
    return { error: /cancel/i.test(String((e as Error)?.message ?? e)) ? 'cancelled' : 'failed' }
  }
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> }

/** Web: BarcodeDetector where the browser has it, jsQR otherwise. */
export async function createDecoder(): Promise<(src: HTMLVideoElement | HTMLImageElement | ImageBitmap) => Promise<string | null>> {
  const BD = (globalThis as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector, getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector
  const formats: string[] = (await BD?.getSupportedFormats?.().catch(() => [])) ?? []
  if (BD && formats.includes('qr_code')) {
    const detector = new BD({ formats: ['qr_code'] })
    return async src => (await detector.detect(src).catch(() => []))[0]?.rawValue ?? null
  }
  const jsQR = (await import('jsqr')).default
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  return async (src) => {
    const w = src instanceof HTMLVideoElement ? src.videoWidth : src.width
    const h = src instanceof HTMLVideoElement ? src.videoHeight : src.height
    if (!ctx || !w || !h) return null
    // video frames stay small for speed; photos get a sharper pass first
    const sizes = src instanceof HTMLVideoElement ? [800] : [2000, 1000]
    for (const max of sizes) {
      const scale = Math.min(1, max / Math.max(w, h))
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })?.data
      if (hit) return hit
    }
    return null
  }
}

/** Opens the plant behind a scanned code; returns false when it is not one of ours. */
export function openScanned(text: string): boolean {
  const { notify } = useNotify()
  const id = parsePlantLink(text)
  if (!id) {
    notify(translate('organize.scan.notLabel'), { tone: 'error' })
    return false
  }
  const plant = useGrow().getPlant(id)
  if (!plant) {
    notify(translate('organize.scan.notHere'), { tone: 'error', duration: 5000 })
    return false
  }
  navigateTo(`/plants/${plant.id}`)
  notify(translate('organize.scan.opened', { name: plant.name }), { icon: 'i-tabler-qrcode' })
  return true
}

export const isNativeScan = () => Capacitor.isNativePlatform()
