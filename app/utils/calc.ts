// Grow calculators – pure functions so they can be unit-tested.

/** Saturation vapour pressure in kPa (Tetens). */
export function svp(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3))
}

/**
 * Leaf vapour pressure deficit in kPa.
 * @param leafOffset leaf temperature relative to air, usually −1 to −3 °C under LEDs
 */
export function vpd(airTempC: number, rh: number, leafOffset = -2): number {
  const leaf = svp(airTempC + leafOffset)
  const air = svp(airTempC) * (rh / 100)
  return Math.max(0, leaf - air)
}

export interface VpdZone {
  label: string
  color: string
  advice: string
}

export function vpdZone(kpa: number): VpdZone {
  if (kpa < 0.4) return { label: 'Too low', color: '#60a5fa', advice: 'Danger of mould – lower humidity or raise temperature.' }
  if (kpa < 0.8) return { label: 'Propagation', color: '#2dd4bf', advice: 'Ideal for clones and seedlings.' }
  if (kpa < 1.2) return { label: 'Vegetative', color: '#7bc74d', advice: 'Ideal for vegetative growth and early flower.' }
  if (kpa <= 1.6) return { label: 'Flowering', color: '#f472b6', advice: 'Ideal for mid and late flowering.' }
  return { label: 'Too high', color: '#ef4444', advice: 'Plants are stressed – raise humidity or lower temperature.' }
}

/** Daily light integral (mol/m²/day) from PPFD (µmol/m²/s) and hours of light. */
export function dli(ppfd: number, hours: number): number {
  return (ppfd * hours * 3600) / 1_000_000
}

/** PPFD needed to reach a target DLI. */
export function ppfdForDli(targetDli: number, hours: number): number {
  return hours > 0 ? (targetDli * 1_000_000) / (hours * 3600) : 0
}

export function dliAdvice(value: number): string {
  if (value < 12) return 'Low – fine for clones and seedlings.'
  if (value < 25) return 'Good for seedlings and early veg.'
  if (value < 40) return 'Great for vegetative growth.'
  if (value <= 50) return 'Great for flowering (with good CO₂ and nutrition).'
  return 'Very high – risk of light stress without extra CO₂.'
}

export interface NutrientLine {
  name: string
  /** ml per litre */
  dose: number
}

export function nutrientMix(lines: NutrientLine[], litres: number, strength = 100) {
  const factor = Math.max(0, strength) / 100
  return lines
    .filter(l => l.name.trim() || l.dose > 0)
    .map(l => ({
      name: l.name.trim() || 'Unnamed',
      dosePerLitre: +(l.dose * factor).toFixed(2),
      total: +(l.dose * factor * Math.max(0, litres)).toFixed(1)
    }))
}

export const GALLON_IN_L = 3.785411784

export function gallonsToLitres(gal: number): number {
  return gal * GALLON_IN_L
}

export function litresToGallons(l: number): number {
  return l / GALLON_IN_L
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}
