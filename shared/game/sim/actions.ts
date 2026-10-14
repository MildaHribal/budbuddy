import type { ActionResult, CureJar, EquipmentDef, FeedDose, GameAction, GameState, L10n, Medium, PlantSim, Tent } from '../types.ts'
import { NUTRIENTS } from '../types.ts'
import { makeRand } from '../rng.ts'
import { burpJar, finishCure, jarBatch, setDryClimate, startDrying } from '../drying.ts'
import { breedStrain } from '../genetics.ts'
import { BOTTLE_SIZES, DIAGNOSIS_REWARD } from '../content/catalog.ts'
import { SCANNER_ITEM, content, equipmentDef, levelFor, productDef, ruleDef, seedKey, strainDef, treatmentDef } from './content.ts'
import { nextId, pushEvent } from './events.ts'
import { PH_IDEAL, plainWater, solutionOf } from './nutrients.ts'
import { flowerProgress, freshMedium, newPlant } from './plant.ts'
import { activate, problemPhase } from './problems.ts'
import { cureScore, draftResult, finalizeScore } from './score.ts'
import { tentSpec } from './spec.ts'
import { capacityL, effVol, irrigate } from './water.ts'

export { MIN_CURE_H } from '../drying.ts'

const MEDIUM_CODE: Record<Medium, number> = { soil: 0, coco: 1, hydro: 2 }
const SINGLE_SLOTS = new Set(['exhaust', 'dehumidifier', 'humidifier', 'heater', 'ac', 'irrigation'])

type Fail = Extract<ActionResult, { ok: false }>
const fail = (reason: Fail['reason'], en?: string, cs?: string): ActionResult =>
  en ? { ok: false, reason, message: { en, cs: cs ?? en } } : { ok: false, reason }
const ok = (data?: unknown, message?: L10n): ActionResult => {
  const r: ActionResult = { ok: true }
  if (data !== undefined) r.data = data
  if (message) r.message = message
  return r
}

const num = (x: unknown, lo: number, hi: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi
const living = (p: PlantSim | undefined): p is PlantSim => !!p && !p.dead && p.stage !== 'harvested'
const findTent = (s: GameState, id: string): Tent | undefined => s.tents.find(t => t.id === id)

function installedCount(s: GameState, itemId: string): number {
  let n = 0
  for (const t of s.tents) {
    if (t.tentItem === itemId) n++
    if (t.light === itemId) n++
    for (const g of t.gear) if (g === itemId) n++
  }
  return n
}
const addInv = (s: GameState, id: string, n: number): void => {
  s.inventory[id] = (s.inventory[id] ?? 0) + n
}
const ownedCount = (s: GameState, itemId: string): number => s.owned.reduce((n, x) => n + (x === itemId ? 1 : 0), 0)

/** Pot item a sow/transplant consumes; undefined = not enforced (catalog sells no pots), null = size not sold. */
export function potItem(potL: number, medium: Medium): EquipmentDef | null | undefined {
  const pots = content().equipment.filter(e => e.slot === 'pot')
  if (!pots.length) return undefined
  return pots.find(e => e.stats.liters === potL && (e.stats.medium ?? 0) === MEDIUM_CODE[medium]) ?? null
}

/** Checks pot stock; returns a consumer or a failure. */
function takePot(s: GameState, potL: number, medium: Medium): (() => void) | ActionResult {
  const pot = potItem(potL, medium)
  if (pot === undefined) return () => {}
  if (pot === null) return fail('invalid', 'That pot size is not sold.', 'Takový květináč se neprodává.')
  if ((s.inventory[pot.id] ?? 0) < 1) return fail('no-item', 'You need a matching pot.', 'Potřebuješ odpovídající květináč.')
  return () => addInv(s, pot.id, -1)
}

function feedNeed(feed: FeedDose[], liters: number): Map<string, number> {
  const need = new Map<string, number>()
  for (const d of feed) need.set(d.productId, (need.get(d.productId) ?? 0) + d.mlPerL * liters)
  return need
}

function hasAll(s: GameState, need: Map<string, number>): boolean {
  for (const [id, ml] of need) if ((s.inventory[id] ?? 0) + 1e-9 < ml) return false
  return true
}

function consume(s: GameState, need: Map<string, number>): void {
  for (const [id, ml] of need) s.inventory[id] = Math.max(0, Math.round(((s.inventory[id] ?? 0) - ml) * 100) / 100)
}

/** Irrigation gear tops the pot up with the tent's last recipe (plain water when stock runs out). */
export function autoIrrigate(s: GameState, p: PlantSim, tent: Tent): void {
  if (p.medium === 'hydro' || p.stage === 'germination' || p.root.water >= 0.35) return
  const cap = capacityL(p)
  const liters = cap * (1 - p.root.water) + cap * 0.15
  const recipe = tent.lastFeed ?? { ph: PH_IDEAL[p.medium], feed: [] }
  const need = feedNeed(recipe.feed, liters)
  const sol = hasAll(s, need) ? solutionOf(recipe.feed) : null
  if (sol) consume(s, need)
  irrigate(p, liters, recipe.ph, sol ?? plainWater())
}

function checkLevel(s: GameState): void {
  const lvl = levelFor(s.xp)
  if (lvl > s.level) {
    s.level = lvl
    pushEvent(s, 'info', { en: `Level ${lvl} reached.`, cs: `Dosažena úroveň ${lvl}.` })
  }
}

function finishResult(s: GameState, plantId: string, cure: number): void {
  const pending = s.pending ?? []
  const i = pending.findIndex(r => r.plantId === plantId)
  if (i < 0) return
  const r = finalizeScore(pending[i] as NonNullable<typeof pending[number]>, cure)
  pending.splice(i, 1)
  s.history.push(r)
  s.coins += r.coins
  s.xp += r.xp
  Reflect.deleteProperty(s.plants, plantId)
}

/** Validates and applies a player action at state.nowH. Successful actions are appended to state.log when present. */
export function apply(s: GameState, a: GameAction): ActionResult {
  let r: ActionResult
  try {
    r = run(s, a)
  } catch {
    r = fail('invalid')
  }
  if (r.ok) {
    checkLevel(s)
    s.log?.push({ atH: s.nowH, action: JSON.parse(JSON.stringify(a)) as GameAction })
  }
  return r
}

function run(s: GameState, a: GameAction): ActionResult {
  switch (a.t) {
    case 'buy': return buy(s, a.itemId, a.qty)
    case 'install': return install(s, a.tentId, a.itemId)
    case 'sow': return sow(s, a)
    case 'water': return water(s, a.plantId, a.liters, a.ph, a.feed)
    case 'flush': return flush(s, a.plantId)
    case 'treat': return treat(s, a.plantId, a.treatmentId)
    case 'train': return train(s, a.plantId, a.kind)
    case 'transplant': return transplant(s, a.plantId, a.potL)
    case 'flip': {
      const t = findTent(s, a.tentId)
      if (!t) return fail('not-found')
      if (t.lightHours <= 12) return fail('invalid')
      t.lightHours = 12
      return ok()
    }
    case 'climate': {
      const t = findTent(s, a.tentId)
      if (!t) return fail('not-found')
      if (!num(a.tempC, 10, 40) || !num(a.rh, 20, 90)) return fail('invalid')
      t.climate = { tempC: a.tempC, rh: a.rh }
      return ok()
    }
    case 'light': {
      const t = findTent(s, a.tentId)
      if (!t) return fail('not-found')
      if (!num(a.lightHours, 0, 24) || !Number.isInteger(a.lightHours) || !num(a.dim, 0.2, 1)) return fail('invalid')
      t.lightHours = a.lightHours
      t.dim = a.dim
      return ok()
    }
    case 'harvest': return harvest(s, a.plantId)
    case 'cull': return cull(s, a.plantId)
    case 'diagnose': return diagnose(s, a.plantId, a.problemId)
    case 'scan': {
      const p = s.plants[a.plantId]
      if (!living(p)) return fail('not-found')
      if ((s.inventory[SCANNER_ITEM] ?? 0) < 1) return fail('no-item')
      s.inventory[SCANNER_ITEM] = (s.inventory[SCANNER_ITEM] ?? 0) - 1
      return ok(p.problems.map(x => ({ id: x.id, phase: problemPhase(x) })))
    }
    case 'dry': return setDryClimate(s, a.batchId, a.tempC, a.rh)
    case 'jar': return jarBatch(s, a.batchId)
    case 'burp': return burpJar(s, a.jarId)
    case 'finishCure': {
      const r = finishCure(s, a.jarId)
      if (!r.ok) return r
      const j = s.jars.find(x => x.id === a.jarId) as CureJar
      const b = s.drying.find(x => x.plantId === j.plantId)
      const plant = s.plants[j.plantId]
      const draft = s.pending?.find(x => x.plantId === j.plantId)
      // mold losses during drying/curing come off the harvested weight
      if (draft && plant && plant.budMass > 0) draft.dryG = Math.round(draft.dryG * Math.min(1, j.dryG / plant.budMass) * 10) / 10
      finishResult(s, j.plantId, cureScore(b, j))
      s.jars = s.jars.filter(x => x !== j)
      if (b) s.drying = s.drying.filter(x => x !== b)
      return ok(s.history[s.history.length - 1])
    }
    case 'breed': return breed(s, a.motherId, a.fatherId, a.name)
    default: return fail('invalid')
  }
}

/**
 * Item ids: `seed:<strainId>`, `<productId>@<ml>` (bottle sizes from the catalog, ml land in inventory[productId]),
 * `scanner-credit`, treatment ids (uses), pot ids (stock), other equipment ids (into owned).
 */
function buy(s: GameState, itemId: string, qty: number): ActionResult {
  if (!num(qty, 1, 999) || !Number.isInteger(qty) || typeof itemId !== 'string') return fail('invalid')
  const c = content()
  let price: number
  let unlock = 0
  let give: () => void
  const at = itemId.indexOf('@')
  if (itemId === SCANNER_ITEM) {
    price = c.scannerPrice
    give = () => addInv(s, SCANNER_ITEM, qty)
  } else if (itemId.startsWith('seed:')) {
    const strain = c.strains.find(x => x.id === itemId.slice(5))
    if (!strain) return fail('not-found')
    price = strain.price
    unlock = strain.unlockLevel
    give = () => addInv(s, itemId, qty)
  } else if (at > 0) {
    const prod = productDef(itemId.slice(0, at))
    const ml = Number(itemId.slice(at + 1))
    const f = BOTTLE_SIZES[ml]
    if (!prod) return fail('not-found')
    if (!f) return fail('invalid')
    price = Math.max(1, Math.round(prod.price * f))
    unlock = prod.unlockLevel
    give = () => addInv(s, prod.id, ml * qty)
  } else {
    const eq = equipmentDef(itemId)
    const treat = eq ? undefined : treatmentDef(itemId)
    if (eq) {
      price = eq.price
      unlock = eq.unlockLevel
      give = eq.slot === 'pot'
        ? () => addInv(s, eq.id, qty)
        : () => s.owned.push(...Array.from({ length: qty }, () => eq.id))
    } else if (treat) {
      price = treat.price
      unlock = treat.unlockLevel
      give = () => addInv(s, treat.id, qty)
    } else {
      return fail('not-found')
    }
  }
  if (unlock > s.level) return fail('locked')
  const total = price * qty
  if (total > s.coins) return fail('no-money')
  s.coins -= total
  give()
  return ok()
}

function install(s: GameState, tentId: string, itemId: string): ActionResult {
  const eq = equipmentDef(itemId)
  if (!eq) return fail('not-found')
  if (eq.slot === 'pot') return fail('invalid')
  if (installedCount(s, itemId) >= ownedCount(s, itemId)) return fail('no-item')
  let t = findTent(s, tentId)
  if (eq.slot === 'tent') {
    if (!t) {
      if (!tentId || s.tents.length >= 6) return fail('invalid')
      t = {
        id: tentId, tentItem: itemId, light: null, gear: [],
        env: { ...(s.tents[0]?.env ?? { tempC: 22, rh: 55, vpd: 1, ppfd: 0, lightsOn: false, lightHours: 18, airflow: 0, leak: 0 }) },
        climate: { tempC: 25, rh: 55 }, lightHours: 18, dim: 1, plantIds: []
      }
      s.tents.push(t)
      return ok()
    }
    const slots = Math.max(1, Math.floor(eq.stats.slots ?? 1))
    if (t.plantIds.filter(id => living(s.plants[id])).length > slots) return fail('no-space')
    t.tentItem = itemId
    return ok()
  }
  if (!t) return fail('not-found')
  if (eq.slot === 'light') {
    t.light = itemId
  } else if (SINGLE_SLOTS.has(eq.slot)) {
    t.gear = t.gear.filter(g => equipmentDef(g)?.slot !== eq.slot)
    t.gear.push(itemId)
  } else {
    if (t.gear.includes(itemId)) return fail('invalid')
    t.gear.push(itemId)
  }
  return ok()
}

function sow(s: GameState, a: Extract<GameAction, { t: 'sow' }>): ActionResult {
  const t = findTent(s, a.tentId)
  if (!t) return fail('not-found')
  if (a.medium !== 'soil' && a.medium !== 'coco' && a.medium !== 'hydro') return fail('invalid')
  if (!num(a.potL, 0.5, 200)) return fail('invalid')
  const strain = strainDef(s, a.strainId)
  if (!strain) return fail('not-found')
  const key = seedKey(strain.id)
  if ((s.inventory[key] ?? 0) < 1) return fail('no-item')
  if (t.plantIds.filter(id => living(s.plants[id])).length >= tentSpec(t).slots) return fail('no-space')
  const pot = takePot(s, a.potL, a.medium)
  if (typeof pot !== 'function') return pot
  pot()
  s.inventory[key] = (s.inventory[key] ?? 0) - 1
  const id = nextId(s, 'p')
  const seed = Math.floor(makeRand(s)() * 2147483647)
  const p = newPlant(id, strain.id, strain.genome, t.id, a.medium, a.potL, seed, s.nowH)
  if (s.customStrains.some(c => c.id === strain.id)) p.label = strain.name
  s.plants[id] = p
  t.plantIds.push(id)
  return ok({ plantId: id })
}

function water(s: GameState, plantId: string, liters: number, ph: number, feed: FeedDose[]): ActionResult {
  const p = s.plants[plantId]
  if (!living(p)) return fail('not-found')
  const max = p.medium === 'hydro' ? p.potL * 2 : capacityL(p) * 3 + p.potL
  if (!num(liters, 0.05, max) || !num(ph, 3, 9) || !Array.isArray(feed) || feed.length > 8) return fail('invalid')
  for (const d of feed) if (!d || typeof d.productId !== 'string' || !num(d.mlPerL, 0, 20)) return fail('invalid')
  const sol = solutionOf(feed)
  if (!sol) return fail('not-found')
  const need = feedNeed(feed, liters)
  if (!hasAll(s, need)) return fail('no-item')
  consume(s, need)
  const r = irrigate(p, liters, ph, sol)
  const t = findTent(s, p.tentId)
  if (t) t.lastFeed = { ph, feed: feed.map(d => ({ productId: d.productId, mlPerL: d.mlPerL })) }
  return ok({ runoffL: Math.round(r.runoff * 100) / 100, ec: Math.round(sol.ec * 100) / 100 })
}

function flushRoot(s: GameState, p: PlantSim): void {
  irrigate(p, p.medium === 'hydro' ? p.potL : p.potL * 3, PH_IDEAL[p.medium], plainWater())
  p.root.salts *= 0.15
  for (const k of NUTRIENTS) p.reserves[k] *= 0.95
}

function flush(s: GameState, plantId: string): ActionResult {
  const p = s.plants[plantId]
  if (!living(p)) return fail('not-found')
  flushRoot(s, p)
  return ok()
}

function shiftPh(p: PlantSim, dir: -1 | 1): void {
  const target = PH_IDEAL[p.medium]
  const off = (p.root.ph - target) * -dir
  p.root.ph += dir * (off > 0 ? Math.min(0.5, off) : 0.3)
}

/** Physical side of a treatment, on top of the problem bookkeeping. */
const TREATMENT_EFFECTS: Record<string, (s: GameState, p: PlantSim) => void> = {
  'flush-water': flushRoot,
  'calmag': (_s, p) => {
    const ev = effVol(p, p.root.water)
    const pool = p.root.pool
    if (pool) {
      pool.Ca += 0.6 * ev
      pool.Mg += 0.6 * ev
    }
    p.reserves.Ca = Math.min(1.2, p.reserves.Ca + 0.25)
    p.reserves.Mg = Math.min(1.2, p.reserves.Mg + 0.25)
  },
  'ph-down': (_s, p) => shiftPh(p, -1),
  'ph-up': (_s, p) => shiftPh(p, 1),
  'raise-light': (s, p) => {
    const t = findTent(s, p.tentId)
    if (t) t.dim = Math.max(0.2, Math.round((t.dim - 0.15) * 100) / 100)
  },
  'defoliate': (s, p) => {
    p.training.defoliatedAtH = s.nowH
    p.biomass -= (p.biomass - p.budMass) * 0.08
    p.stress = Math.min(1, p.stress + 0.1)
  },
  'remove-buds': (_s, p) => {
    const cut = p.budMass * 0.05
    p.budMass -= cut
    p.biomass -= cut
  },
  'hydrogen-peroxide': (_s, p) => { p.root.health = Math.min(1, p.root.health + 0.05) },
  'dehumidify': (s, p) => {
    const t = findTent(s, p.tentId)
    if (t) t.env.rh = Math.max(20, t.env.rh - 10)
  },
  'repot': (s, p) => {
    if (p.medium === 'hydro') return
    const water = p.root.water
    freshMedium(p)
    p.root.water = Math.max(water, 0.6)
    p.root.health = Math.max(0, p.root.health - 0.05)
    p.stress = Math.min(1, p.stress + 0.2)
    if (ruleDef('transplant_shock')) activate(p, 'transplant_shock', 0.05, s.nowH)
  }
}

function treat(s: GameState, plantId: string, treatmentId: string): ActionResult {
  const p = s.plants[plantId]
  if (!living(p)) return fail('not-found')
  const def = treatmentDef(treatmentId)
  if (!def) return fail('not-found')
  if (def.price > 0) {
    if ((s.inventory[treatmentId] ?? 0) < 1) return fail('no-item')
    s.inventory[treatmentId] = (s.inventory[treatmentId] ?? 0) - 1
  }
  if (treatmentId === 'cull-plant') return cull(s, plantId)
  let helped = 0
  for (const x of p.problems) {
    x.treatedWith = treatmentId
    x.treatedAtH = s.nowH
    if (def.helps.includes(x.id)) helped++
  }
  TREATMENT_EFFECTS[treatmentId]?.(s, p)
  return ok({ helped })
}

function cull(s: GameState, plantId: string): ActionResult {
  const p = s.plants[plantId]
  if (!p) return fail('not-found')
  if (p.stage === 'harvested') return fail('invalid')
  const t = findTent(s, p.tentId)
  if (t) t.plantIds = t.plantIds.filter(id => id !== p.id)
  Reflect.deleteProperty(s.plants, p.id)
  return ok()
}

function train(s: GameState, plantId: string, kind: 'top' | 'lst' | 'defoliate'): ActionResult {
  const p = s.plants[plantId]
  if (!living(p)) return fail('not-found')
  const fp = flowerProgress(p, s.nowH)
  const flowering = p.stage === 'flower' || p.stage === 'ripening'
  if (kind === 'top') {
    if (p.stage !== 'veg' || p.nodes < 4 || p.training.topped >= 3) return fail('invalid')
    p.training.topped++
    p.biomass *= 0.97
    p.stress = Math.min(1, p.stress + 0.25)
  } else if (kind === 'lst') {
    if (p.training.lst || !(p.stage === 'veg' || (flowering && (fp ?? 1) < 0.3))) return fail('invalid')
    p.training.lst = true
    p.stress = Math.min(1, p.stress + 0.05)
  } else if (kind === 'defoliate') {
    if (!(p.stage === 'veg' || flowering)) return fail('invalid')
    if (p.training.defoliatedAtH !== undefined && s.nowH - p.training.defoliatedAtH < 7 * 24) return fail('invalid')
    p.training.defoliatedAtH = s.nowH
    p.biomass -= (p.biomass - p.budMass) * 0.08
    p.stress = Math.min(1, p.stress + 0.12)
  } else {
    return fail('invalid')
  }
  return ok()
}

function transplant(s: GameState, plantId: string, potL: number): ActionResult {
  const p = s.plants[plantId]
  if (!living(p)) return fail('not-found')
  if (p.medium === 'hydro' || !(p.stage === 'seedling' || p.stage === 'veg')) return fail('invalid')
  if (!num(potL, p.potL + 0.5, 200)) return fail('invalid')
  const pot = takePot(s, potL, p.medium)
  if (typeof pot !== 'function') return pot
  pot()
  const oldWaterL = capacityL(p) * p.root.water
  const ev0 = effVol(p, p.root.water)
  const ec0 = p.root.ec
  const oldPot = p.potL
  p.potL = potL
  p.root.water = Math.min(1, (oldWaterL + (potL - oldPot) * (capacityL(p) / potL) * 0.6) / capacityL(p))
  const ev1 = effVol(p, p.root.water)
  const added = ev1 - ev0
  const freshConc = p.medium === 'soil' ? 1 : 0
  const pool = p.root.pool
  if (pool) for (const k of NUTRIENTS) pool[k] += freshConc * added
  p.root.ec = (ec0 * ev0 + (p.medium === 'soil' ? 1.1 : 0.4) * added) / ev1
  p.root.salts *= ev0 / ev1
  p.stress = Math.min(1, p.stress + 0.2)
  if (ruleDef('transplant_shock')) activate(p, 'transplant_shock', 0.05 + (1 - p.root.health) * 0.1, s.nowH)
  return ok()
}

function harvest(s: GameState, plantId: string): ActionResult {
  const p = s.plants[plantId]
  if (!living(p)) return fail('not-found')
  const fp = flowerProgress(p, s.nowH)
  if (!(p.stage === 'flower' || p.stage === 'ripening') || fp === null || fp < 0.3) return fail('invalid')
  const draft = draftResult(s, p)
  p.stage = 'harvested'
  p.stageStartH = s.nowH
  const t = findTent(s, p.tentId)
  if (t) t.plantIds = t.plantIds.filter(id => id !== p.id)
  const batch = startDrying(s, p.id)
  if (batch) {
    if (!s.drying.includes(batch)) s.drying.push(batch)
    ;(s.pending ??= []).push(draft)
    return ok(draft)
  }
  ;(s.pending ??= []).push(draft)
  finishResult(s, p.id, 0.5)
  return ok(s.history[s.history.length - 1])
}

function diagnose(s: GameState, plantId: string, problemId: string): ActionResult {
  const p = s.plants[plantId]
  if (!living(p)) return fail('not-found')
  const hit = p.problems.find(x => x.id === problemId)
  if (!hit) {
    s.xp = Math.max(0, s.xp - Math.abs(DIAGNOSIS_REWARD.wrongXp))
    return ok({ correct: false })
  }
  let bonus = false
  if (!hit.diagnosed) {
    hit.diagnosed = true
    s.coins += DIAGNOSIS_REWARD.coins
    s.xp += DIAGNOSIS_REWARD.xp
    bonus = true
    if (!s.knowledge.includes(hit.id)) s.knowledge.push(hit.id)
  }
  return ok({ correct: true, bonus })
}

function breed(s: GameState, motherId: string, fatherId: string, name: string): ActionResult {
  const m = s.plants[motherId]
  if (!living(m)) return fail('not-found')
  if (!(m.stage === 'flower' || m.stage === 'ripening')) return fail('invalid')
  const clean = typeof name === 'string' ? name.trim() : ''
  if (!clean || clean.length > 40 || s.customStrains.length >= 50) return fail('invalid')
  const before = JSON.stringify(s.inventory)
  const strain = breedStrain(s, motherId, fatherId, clean)
  if (!strain) return fail('invalid')
  if (!s.customStrains.some(x => x.id === strain.id)) s.customStrains.push(strain)
  if (JSON.stringify(s.inventory) === before) {
    const k = seedKey(strain.id)
    s.inventory[k] = (s.inventory[k] ?? 0) + 5
  }
  return ok({ strainId: strain.id })
}
