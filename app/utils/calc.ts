// Grow calculators – pure functions so they can be unit-tested.
import { l } from './locale'

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
  if (kpa < 0.4) return { label: l({ en: 'Too low', cs: 'Příliš nízké' }), color: '#7cc8f2', advice: l({ en: 'Danger of mould – lower humidity or raise temperature.', cs: 'Hrozí plíseň – sniž vlhkost nebo zvyš teplotu.' }) }
  if (kpa < 0.8) return { label: l({ en: 'Propagation', cs: 'Množení' }), color: '#6fe0c8', advice: l({ en: 'Ideal for clones and seedlings.', cs: 'Ideální pro řízky a sazenice.' }) }
  if (kpa < 1.2) return { label: l({ en: 'Vegetative', cs: 'Vegetace' }), color: '#9be36b', advice: l({ en: 'Ideal for vegetative growth and early flower.', cs: 'Ideální pro vegetaci a začátek kvetení.' }) }
  if (kpa <= 1.6) return { label: l({ en: 'Flowering', cs: 'Kvetení' }), color: '#c9a2ff', advice: l({ en: 'Ideal for mid and late flowering.', cs: 'Ideální pro střed a konec kvetení.' }) }
  return { label: l({ en: 'Too high', cs: 'Příliš vysoké' }), color: '#ff5f6d', advice: l({ en: 'Plants are stressed – raise humidity or lower temperature.', cs: 'Rostliny jsou ve stresu – zvyš vlhkost nebo sniž teplotu.' }) }
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
  if (value < 12) return l({ en: 'Low – fine for clones and seedlings.', cs: 'Nízké – stačí pro řízky a sazenice.' })
  if (value < 25) return l({ en: 'Good for seedlings and early veg.', cs: 'Dobré pro sazenice a začátek vegetace.' })
  if (value < 40) return l({ en: 'Great for vegetative growth.', cs: 'Výborné pro vegetaci.' })
  if (value <= 50) return l({ en: 'Great for flowering (with good CO₂ and nutrition).', cs: 'Výborné pro kvetení (s dostatkem CO₂ a živin).' })
  return l({ en: 'Very high – risk of light stress without extra CO₂.', cs: 'Velmi vysoké – bez přidaného CO₂ hrozí světelný stres.' })
}

export interface NutrientLine {
  name: string
  /** ml per litre */
  dose: number
}

const unnamed = () => l({ en: 'Unnamed', cs: 'Bez názvu' })

export function nutrientMix(lines: NutrientLine[], litres: number, strength = 100) {
  const factor = Math.max(0, strength) / 100
  return lines
    .filter(line => line.name.trim() || line.dose > 0)
    .map((line) => {
      const dose = Math.max(0, line.dose)
      return {
        name: line.name.trim() || unnamed(),
        dosePerLitre: +(dose * factor).toFixed(2),
        total: +(dose * factor * Math.max(0, litres)).toFixed(1)
      }
    })
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
