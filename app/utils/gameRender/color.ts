export type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Linear RGB-ish mix; t clamped to 0..1. */
export function mix(a: string, b: string, t: number): string {
  const k = clamp01(t)
  if (k <= 0) return a
  if (k >= 1) return b
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k])
}

/** Multiply lightness (0.8 darker, 1.1 lighter). */
export function shade(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex)
  if (f <= 1) return rgbToHex([r * f, g * f, b * f])
  const k = f - 1
  return rgbToHex([r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k])
}

export const smoothstep = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo))
  return t * t * (3 - 2 * t)
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
