import type { ProductDef } from '../../types.ts'

/**
 * `price` = coins per 1000 ml. `npk` = mg/L (ppm) of each element added per 1 ml/L.
 * `ecPerMl` = mS/cm added per 1 ml/L.
 */
export const PRODUCTS: ProductDef[] = [
  {
    id: 'base-veg', kind: 'base', price: 18, unlockLevel: 1, ecPerMl: 0.16,
    name: { en: 'Base nutrient, grow', cs: 'Základní hnojivo, růst' },
    npk: { N: 26, P: 6, K: 22, Ca: 9, Mg: 4, S: 6, Fe: 0.4, Mn: 0.12, Zn: 0.06, B: 0.06, Cu: 0.015, Mo: 0.01 }
  },
  {
    id: 'base-bloom', kind: 'bloom', price: 18, unlockLevel: 1, ecPerMl: 0.17,
    name: { en: 'Base nutrient, bloom', cs: 'Základní hnojivo, květ' },
    npk: { N: 12, P: 14, K: 32, Ca: 7, Mg: 5, S: 10, Fe: 0.4, Mn: 0.12, Zn: 0.06, B: 0.08, Cu: 0.015, Mo: 0.01 }
  },
  {
    id: 'calmag-mix', kind: 'calmag', price: 14, unlockLevel: 2, ecPerMl: 0.2,
    name: { en: 'Cal-mag', cs: 'Cal-mag' },
    npk: { N: 14, Ca: 30, Mg: 12, Fe: 0.2 }
  },
  {
    id: 'micro-mix', kind: 'micro', price: 16, unlockLevel: 4, ecPerMl: 0.03,
    name: { en: 'Trace elements (Fe, Mn, Zn, B, Cu, Mo)', cs: 'Stopové prvky (Fe, Mn, Zn, B, Cu, Mo)' },
    npk: { S: 2, Fe: 3, Mn: 1, Zn: 0.5, B: 0.5, Cu: 0.1, Mo: 0.05 }
  },
  {
    id: 'pk-booster', kind: 'bloom', price: 20, unlockLevel: 5, ecPerMl: 0.2,
    name: { en: 'PK booster', cs: 'PK booster' },
    npk: { P: 55, K: 60 }
  },
  {
    id: 'silica-mix', kind: 'silica', price: 15, unlockLevel: 6, ecPerMl: 0.05,
    name: { en: 'Silica (potassium silicate)', cs: 'Křemík (křemičitan draselný)' },
    npk: { K: 8 }
  },
  {
    id: 'ph-down-acid', kind: 'ph-down', price: 10, unlockLevel: 1, ecPerMl: 0.03,
    name: { en: 'pH down (phosphoric acid)', cs: 'pH mínus (kyselina fosforečná)' },
    npk: { P: 12 }
  },
  {
    id: 'ph-up-base', kind: 'ph-up', price: 10, unlockLevel: 1, ecPerMl: 0.03,
    name: { en: 'pH up (potassium hydroxide)', cs: 'pH plus (hydroxid draselný)' },
    npk: { K: 15 }
  },
  {
    id: 'enzyme-mix', kind: 'enzyme', price: 22, unlockLevel: 8, ecPerMl: 0,
    name: { en: 'Enzyme root cleaner', cs: 'Enzymy na kořeny' },
    npk: {}
  }
]

/** Bottle sizes in ml and their price factor vs the 1000 ml price. */
export const BOTTLE_SIZES: Record<number, number> = { 250: 0.35, 500: 0.6, 1000: 1 }

export function bottlePrice(product: ProductDef, ml: number): number | null {
  const f = BOTTLE_SIZES[ml]
  return f ? Math.max(1, Math.round(product.price * f)) : null
}
