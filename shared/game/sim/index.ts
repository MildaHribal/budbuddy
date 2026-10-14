/**
 * Shadow Grow simulation core. Pure, deterministic, JSON-safe state; one step = STEP_H game hour.
 *
 * Equipment `stats` keys the sim reads (EquipmentDef.slot -> keys):
 * - tent:         widthCm, heightCm, slots, depthCm? (defaults to widthCm), leak? (0..1 light leak in the dark)
 * - light:        watts, ppfd (µmol/m²/s 30 cm under the lamp at full power), heat (°C added in a closed tent; exhaust removes most of it)
 * - exhaust:      m3h
 * - fan:          airflow (0..1, fans add up, capped at 1)
 * - dehumidifier: lPerDay        humidifier: lPerDay
 * - heater:       watts          ac: watts       (both thermostatic to the tent ClimateTarget)
 * - meter:        ph: 1, ec: 1, climate: 1 (temp/RH/VPD), ppfd: 1 (PAR meter), moisture: 1 (pot water), any combination
 * - irrigation:   auto: 1  (tops pots up below 35 % with the tent's last recipe, `Tent.lastFeed`)
 * - pot:          liters, medium (0 soil, 1 coco, 2 hydro). Pots are only enforced when the catalog sells any.
 *
 * Products: `npk[e]` is mg/L per 1 ml/L; the sim converts with PPM_PER_UNIT (1 unit = full demand of a plant).
 * `ecPerMl` is EC (mS/cm) per ml/L on top of tap water (EC 0.3, carries some Ca/Mg).
 *
 * Shop/inventory ids (see content/catalog.ts): `seed:<strainId>`, `<productId>@<ml>` (stock in ml under the product id),
 * `scanner-credit`, treatments in uses (price 0 = free, no stock), pots as stock consumed per sow/transplant,
 * other equipment bought once into `owned` and installed per tent.
 *
 * Harvest flow: `harvest` scores everything except the cure and calls drying.startDrying. With a batch the draft
 * HarvestResult waits in `state.pending` (cure placeholder 50). `dry`/`jar`/`burp` delegate to drying.ts; the batch
 * stays in `state.drying` (done) while jarred. `finishCure` runs drying.finishCure, then scores the cure with
 * drying.scoreCure, scales dryG by mold losses, moves the result to `history`, pays coins/xp and removes
 * jar, batch and plant. Without a batch (no buds) the result is final at once.
 *
 * Problems: every PROBLEM_RULES entry is evaluated per plant per step. The first positive pressure creates the
 * ActiveProblem at severity ONSET (phase hidden); severity 0 removes it. A treatment whose `helps` lists the
 * problem adds -TREAT_PULL/h for TREAT_H hours, except for nutrient/pH problems (healed by the treatment's real
 * effect: flush, pH shift, cal-mag) and pests (the rules' own knockdown). The engine seeds pests through the
 * 'pest-hitchhiker' event, 'transplant_shock' on transplant/repot and sets `hermed` once 'hermaphrodite' is clear.
 * `tent.env.ppfd` is the evaluated plant's canopy PPFD during its rule calls and the brightest canopy afterwards;
 * 0 while the lights are off.
 */
export { advance, syncToNow, step } from './step.ts'
export { apply, MIN_CURE_H } from './actions.ts'
export { newGame } from './state.ts'
export { plantVisual } from './visual.ts'
export { observe } from './observe.ts'
export { forecast } from './forecast.ts'
export { gameHourToMs, msToGameHour, realH } from './time.ts'
export { replayChallenge, newChallenge, challengeScore } from './challenge.ts'
export { setSimContent, SCANNER_ITEM, seedKey } from './content.ts'
export type { SimContent } from './content.ts'
export { problemPhase, phaseOf, ONSET, TREAT_H, TREAT_PULL } from './problems.ts'
export { flowerProgress } from './plant.ts'
export { availability, PH_WINDOW, PPM_PER_UNIT } from './nutrients.ts'
