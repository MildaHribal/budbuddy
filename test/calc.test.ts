import { describe, expect, it } from 'vitest'
import { celsiusToFahrenheit, dli, gallonsToLitres, nutrientMix, ppfdForDli, vpd, vpdZone } from '../app/utils/calc'

describe('calculators', () => {
  it('computes leaf VPD', () => {
    expect(vpd(25, 60, -2)).toBeCloseTo(0.91, 2)
    expect(vpd(25, 60, 0)).toBeCloseTo(1.27, 2)
    expect(vpd(20, 100, 0)).toBe(0)
    expect(vpdZone(1.0).label).toBe('Vegetative')
    expect(vpdZone(0.2).label).toBe('Too low')
    expect(vpdZone(1.9).label).toBe('Too high')
  })

  it('computes DLI both ways', () => {
    expect(dli(600, 18)).toBeCloseTo(38.88, 2)
    expect(ppfdForDli(38.88, 18)).toBeCloseTo(600, 5)
    expect(ppfdForDli(40, 0)).toBe(0)
  })

  it('mixes nutrients for a volume and strength', () => {
    const mix = nutrientMix([{ name: 'Grow', dose: 2 }, { name: ' ', dose: 0 }, { name: 'CalMag', dose: 1 }], 10, 50)
    expect(mix).toEqual([
      { name: 'Grow', dosePerLitre: 1, total: 10 },
      { name: 'CalMag', dosePerLitre: 0.5, total: 5 }
    ])
  })

  it('converts units', () => {
    expect(gallonsToLitres(5)).toBeCloseTo(18.93, 2)
    expect(celsiusToFahrenheit(25)).toBe(77)
  })
})
