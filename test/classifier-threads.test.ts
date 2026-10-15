import { describe, expect, it } from 'vitest'
import { wasmThreads } from '../app/ai/diagnose'

describe('wasmThreads', () => {
  it('stays single-threaded without SharedArrayBuffer', () => {
    expect(wasmThreads({ navigator: { hardwareConcurrency: 8 } })).toBe(1)
  })
  it('uses half the cores, at most 4', () => {
    const sab = SharedArrayBuffer
    expect(wasmThreads({ SharedArrayBuffer: sab, navigator: { hardwareConcurrency: 8 } })).toBe(4)
    expect(wasmThreads({ SharedArrayBuffer: sab, navigator: { hardwareConcurrency: 16 } })).toBe(4)
    expect(wasmThreads({ SharedArrayBuffer: sab, navigator: { hardwareConcurrency: 4 } })).toBe(2)
    expect(wasmThreads({ SharedArrayBuffer: sab, navigator: { hardwareConcurrency: 1 } })).toBe(1)
    expect(wasmThreads({ SharedArrayBuffer: sab })).toBe(1)
  })
})
