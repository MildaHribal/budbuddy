declare module 'gifenc' {
  export type Palette = number[][]
  export interface GifEncoder {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: { palette?: Palette, delay?: number, repeat?: number, transparent?: boolean }): void
    finish(): void
    bytes(): Uint8Array<ArrayBuffer>
  }
  export function GIFEncoder(opts?: { auto?: boolean, initialCapacity?: number }): GifEncoder
  export function quantize(rgba: Uint8ClampedArray | Uint8Array, maxColors: number, opts?: Record<string, unknown>): Palette
  export function applyPalette(rgba: Uint8ClampedArray | Uint8Array, palette: Palette, format?: string): Uint8Array
}
