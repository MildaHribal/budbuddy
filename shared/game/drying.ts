// Drying & curing minigame: state transitions on GameState. Physics lives in ./drying/model.ts.
import { makeRand } from './rng.ts'
import type { ActionResult, CureJar, DryBatch, Forecast, GameState, L10n } from './types.ts'
import {
  JAR_MAX_MOISTURE, JAR_RH_HI, MIN_CURE_H, MOLD_LOSS_FROM, READY_HI, RH_MAX, RH_MIN, TEMP_MAX, TEMP_MIN, WET_MOISTURE,
  DEFAULT_RH, DEFAULT_TEMP, airIntervalH, breakdown, burpEffect, dryStep, eqRh, hoursToJarHigh, hoursToMoisture, jarStep,
  type CureBreakdown
} from './drying/model.ts'

export * from './drying/model.ts'

const r3 = (v: number) => Math.round(v * 1000) / 1000
const dryMatter = (b: DryBatch) => b.wetG * (1 - WET_MOISTURE)
export const gramsAt = (b: DryBatch) => dryMatter(b) / (1 - b.moisture)

export const batchIdFor = (plantId: string) => `dry-${plantId}`
export const jarIdFor = (plantId: string) => `jar-${plantId}`

/** Batch that belongs to a jar; it stays in `state.drying` (done = true) and keeps tracking bud moisture during the cure. */
export function batchOfJar(state: GameState, jar: CureJar): DryBatch | undefined {
  return state.drying.find(b => b.plantId === jar.plantId)
}

function resistOf(state: GameState, plantId: string): number {
  return state.plants[plantId]?.genome.moldResistance ?? 0.5
}

function pushEvent(state: GameState, id: string, plantId: string, text: L10n) {
  if (state.events.some(e => e.id === id)) return
  state.events.push({ id, atH: state.nowH, kind: 'info', plantId, text })
}

/** Rolls for visible mold once risk is high; a hit bins 6-16 % of the buds. Draws from the rng only above the threshold. */
function rollMold(state: GameState, b: DryBatch, risk: number, h: number, rand: () => number, inJar: boolean) {
  if (risk <= MOLD_LOSS_FROM) return
  if (rand() >= (risk - MOLD_LOSS_FROM) * 0.025 * h) return
  const lost = 0.06 + 0.1 * rand()
  const g = gramsAt(b) * lost
  b.wetG = b.wetG * (1 - lost)
  const grams = Math.round(g * 10) / 10
  pushEvent(state, `mold-${b.id}-${Math.floor(state.nowH)}`, b.plantId, inJar
    ? { en: `Mold in a curing jar: ${grams} g went in the bin.`, cs: `Plíseň ve sklenici: ${grams} g šlo do koše.` }
    : { en: `Mold on a drying branch: ${grams} g went in the bin.`, cs: `Plíseň na sušící se větvi: ${grams} g šlo do koše.` })
}

export function stepDrying(state: GameState, dtH: number): void {
  if (!(dtH > 0)) return
  const rand = makeRand(state)
  const steps = Math.ceil(dtH)
  const h = dtH / steps

  for (const b of state.drying) {
    if (b.done) continue
    const resist = resistOf(state, b.plantId)
    for (let i = 0; i < steps; i++) {
      const before = b.moisture
      const s = dryStep(b.moisture, b.tempC, b.rh, resist, h)
      b.moisture = s.moisture
      b.terpeneLoss = Math.min(1, b.terpeneLoss + s.terpene)
      b.moldRisk = Math.min(1, b.moldRisk + s.mold)
      if (before > READY_HI && b.moisture <= READY_HI) {
        pushEvent(state, `dry-ready-${b.id}`, b.plantId, {
          en: 'Small stems on a drying batch snap now. Check it and move it to jars.',
          cs: 'Tenké stonky na sušené várce už praskají. Zkontroluj ji a přesuň do sklenic.'
        })
      }
      rollMold(state, b, b.moldRisk, h, rand, false)
    }
  }

  for (const jar of state.jars) {
    if (jar.done) continue
    const b = batchOfJar(state, jar)
    if (!b) continue
    const resist = resistOf(state, jar.plantId)
    for (let i = 0; i < steps; i++) {
      const at = state.nowH + i * h
      const s = jarStep(jar.jarRh, b.moisture, at - jar.startedAtH, at - jar.lastBurpH, jar.cureQuality, resist, h)
      jar.jarRh = s.jarRh
      jar.cureQuality = Math.min(1, s.cure)
      jar.moldRisk = Math.min(1, jar.moldRisk + s.mold)
      b.terpeneLoss = Math.min(1, b.terpeneLoss + s.terpene)
      rollMold(state, b, jar.moldRisk, h, rand, true)
    }
    jar.dryG = gramsAt(b)
  }
}

export function startDrying(state: GameState, plantId: string): DryBatch | null {
  const plant = state.plants[plantId]
  if (!plant || plant.dead || !(plant.budMass > 0)) return null
  if (state.drying.some(b => b.plantId === plantId)) return null
  const batch: DryBatch = {
    id: batchIdFor(plantId),
    plantId,
    strainId: plant.strainId,
    startedAtH: state.nowH,
    // budMass is dry-equivalent at ~12 % moisture
    wetG: plant.budMass * (1 - 0.12) / (1 - WET_MOISTURE),
    moisture: WET_MOISTURE,
    tempC: DEFAULT_TEMP,
    rh: DEFAULT_RH,
    terpeneLoss: 0,
    moldRisk: 0,
    done: false
  }
  state.drying.push(batch)
  return batch
}

/** Final cure quality 0..1. `jar` null scores a batch sold straight off the line, without a cure. */
export function scoreCure(batch: DryBatch, jar: CureJar | null): number {
  return cureBreakdown(batch, jar).score
}

export function cureBreakdown(batch: DryBatch, jar: CureJar | null): CureBreakdown {
  const risk = Math.max(batch.moldRisk, jar?.moldRisk ?? 0)
  return breakdown(batch.terpeneLoss, risk, jar ? jar.cureQuality : null, batch.moisture)
}

// ---------- actions ----------

const fail = (reason: 'not-found' | 'invalid', en: string, cs: string): ActionResult => ({ ok: false, reason, message: { en, cs } })

export function setDryClimate(state: GameState, batchId: string, tempC: number, rh: number): ActionResult {
  const b = state.drying.find(x => x.id === batchId)
  if (!b) return fail('not-found', 'That drying batch is gone.', 'Tahle várka už neexistuje.')
  if (b.done) return fail('invalid', 'This batch is already in jars.', 'Tahle várka už je ve sklenicích.')
  if (!Number.isFinite(tempC) || !Number.isFinite(rh)) return fail('invalid', 'Temperature and humidity must be numbers.', 'Teplota a vlhkost musí být čísla.')
  // accept 0..1 fractions as well as percent
  const pct = rh <= 1 ? rh * 100 : rh
  b.tempC = Math.round(Math.min(TEMP_MAX, Math.max(TEMP_MIN, tempC)) * 2) / 2
  b.rh = Math.round(Math.min(RH_MAX, Math.max(RH_MIN, pct)))
  return { ok: true, data: { tempC: b.tempC, rh: b.rh } }
}

export function jarBatch(state: GameState, batchId: string): ActionResult {
  const b = state.drying.find(x => x.id === batchId)
  if (!b) return fail('not-found', 'That drying batch is gone.', 'Tahle várka už neexistuje.')
  if (b.done) return fail('invalid', 'This batch is already in jars.', 'Tahle várka už je ve sklenicích.')
  if (b.moisture > JAR_MAX_MOISTURE) {
    return fail('invalid', 'Buds are still soft and stems bend. Jarred now they would rot.', 'Palice jsou ještě měkké a stonky se ohýbají. Ve sklenici by teď shnily.')
  }
  b.done = true
  const jar: CureJar = {
    id: jarIdFor(b.plantId),
    plantId: b.plantId,
    startedAtH: state.nowH,
    dryG: gramsAt(b),
    // jar starts with room air and climbs toward what the buds give off
    jarRh: b.rh,
    lastBurpH: state.nowH,
    cureQuality: 0,
    moldRisk: 0,
    done: false
  }
  state.jars = state.jars.filter(j => j.id !== jar.id)
  state.jars.push(jar)
  return { ok: true, data: { jarId: jar.id } }
}

export function burpJar(state: GameState, jarId: string): ActionResult {
  const jar = state.jars.find(j => j.id === jarId)
  const b = jar && batchOfJar(state, jar)
  if (!jar || !b) return fail('not-found', 'That jar is gone.', 'Tahle sklenice už neexistuje.')
  if (jar.done) return fail('invalid', 'This cure is finished.', 'Tohle zrání už je hotové.')
  const before = jar.jarRh
  const e = burpEffect(jar.jarRh, b.moisture, b.rh)
  b.moisture = e.moisture
  b.terpeneLoss = Math.min(1, b.terpeneLoss + e.terpene)
  jar.jarRh = e.jarRh
  jar.lastBurpH = state.nowH
  jar.dryG = gramsAt(b)
  const verdict: BurpVerdict = before > 70 ? 'wet' : before > JAR_RH_HI ? 'needed' : before >= 58 ? 'fine' : 'dry'
  return { ok: true, message: BURP_TEXT[verdict], data: { verdict, before: r3(before), after: r3(jar.jarRh) } }
}

export type BurpVerdict = 'wet' | 'needed' | 'fine' | 'dry'
const BURP_TEXT: Record<BurpVerdict, L10n> = {
  wet: { en: 'Damp, grassy air came out. Keep burping often until it settles.', cs: 'Vyšel vlhký, travnatý vzduch. Větrej často, dokud se to neusadí.' },
  needed: { en: 'Humid air out, fresh air in. Good timing.', cs: 'Vlhký vzduch ven, čerstvý dovnitř. Dobré načasování.' },
  fine: { en: 'Air was already fine. A short burp freshens it, too many dry the buds.', cs: 'Vzduch už byl v pořádku. Krátké větrání ho osvěží, moc častým palice vysušíš.' },
  dry: { en: 'The jar was already dry. Keep the lid shut longer.', cs: 'Sklenice už byla suchá. Nech víčko déle zavřené.' }
}

export function finishCure(state: GameState, jarId: string): ActionResult {
  const jar = state.jars.find(j => j.id === jarId)
  const b = jar && batchOfJar(state, jar)
  if (!jar || !b) return fail('not-found', 'That jar is gone.', 'Tahle sklenice už neexistuje.')
  if (jar.done) return fail('invalid', 'This cure is finished.', 'Tohle zrání už je hotové.')
  const left = jar.startedAtH + MIN_CURE_H - state.nowH
  if (left > 0) {
    return fail('invalid', 'Give it more time. Buds need a minimum cure before they taste right.', 'Dej tomu čas. Palice potřebují minimální zrání, než budou chutnat.')
  }
  jar.dryG = gramsAt(b)
  jar.done = true
  const bd = cureBreakdown(b, jar)
  return { ok: true, data: { score: r3(bd.score), breakdown: bd, dryG: Math.round(jar.dryG * 10) / 10, curedH: state.nowH - jar.startedAtH } }
}

// ---------- read helpers for UI and notifications ----------

/** Game hours until the snap point at the current climate; null when this air never gets the buds there. */
export function dryEtaH(batch: DryBatch): number | null {
  return hoursToMoisture(batch.moisture, READY_HI, batch.tempC, batch.rh)
}

export function burpDue(state: GameState, jar: CureJar): boolean {
  return jar.jarRh > JAR_RH_HI || state.nowH - jar.lastBurpH > airIntervalH(state.nowH - jar.startedAtH)
}

/** Game hours until the jar wants a burp (0 = now). */
export function nextBurpH(state: GameState, jar: CureJar): number {
  const b = batchOfJar(state, jar)
  const age = state.nowH - jar.startedAtH
  const air = Math.max(0, jar.lastBurpH + airIntervalH(age) - state.nowH)
  const wet = b ? hoursToJarHigh(jar.jarRh, b.moisture, age) : null
  return wet == null ? air : Math.min(air, wet)
}

/** Jar air the buds are heading to if left closed. */
export function jarTargetRh(state: GameState, jar: CureJar): number | null {
  const b = batchOfJar(state, jar)
  return b ? eqRh(b.moisture) : null
}

export function dryingForecast(state: GameState): Forecast[] {
  const out: Forecast[] = []
  for (const b of state.drying) {
    if (b.done) continue
    const eta = dryEtaH(b)
    if (eta != null) out.push({ atH: state.nowH + eta, kind: 'dry-done', plantId: b.plantId, batchId: b.id })
  }
  for (const jar of state.jars) {
    if (jar.done) continue
    out.push({ atH: state.nowH + nextBurpH(state, jar), kind: 'burp', plantId: jar.plantId, jarId: jar.id })
  }
  return out.sort((a, b) => a.atH - b.atH)
}
