# Shadow Grow (Stínový grow): design

Status: approved by owner 2026-10-13 (parts 1–3 in chat). Contract types: `shared/game/types.ts`.

## Goal
A grow simulation inside BudBuddy (same app, own tab) that is fun on its own and teaches real growing:
the same problems, wording and fixes as the in-app atlas and guide. Not monetized. Offline, no account;
the weekly Shadow Challenge and leaderboard need sign-in.

## Time model
- Sim unit = game hour, step = 1 h. 1 game day = 20 real minutes (`GAME_DAY_REAL_MIN`).
- Autoflower ~72–80 game days ≈ 24–27 real hours. Photoperiod: veg is player-controlled (min ~21 days) + flower 56–70 days ≈ 33–40 real hours.
- Offline progress: on open, `syncToNow` advances from `syncedAtMs`; cap at 3 real days of catch-up.

## Balance targets (in REAL time; tests must check these)
- A fully watered 11 L soil pot in a medium plant lasts 5–8 real hours (bigger pot, coco/hydro and irrigation change this; auto-irrigation removes the chore).
- Any problem takes >= 2 real hours from onset to `clear`, and >= 3 more real hours from `clear` to `severe`/permanent damage.
- A player who checks in 4x a day (gaps up to 8 h at night) and plays correctly reaches >= 85 % of max quality.
- Fully neglecting a plant for 24 real hours causes heavy damage, but death only after prolonged neglect (>= ~16 real hours of severe state).
- A first grow with starter gear and decent play earns enough coins for one meaningful upgrade.

## Simulation (shared/game, pure TS, deterministic, no DOM, no Vue)
Module API (exact names, other modules depend on them):
- `shared/game/rng.ts`: `nextRandom(state: number): [value: number, nextState: number]` (mulberry32), `makeRand(holder: { rng: number }): () => number`.
- `shared/game/sim/index.ts` re-exports:
  - `newGame(seed: number, nowMs: number): GameState` (starter tent 60, starter LED, 1 seed of the starter strain, starter coins)
  - `advance(state: GameState, toH: number): void` (mutates; steps STEP_H; pushes GameEvents)
  - `syncToNow(state: GameState, nowMs: number): void`
  - `apply(state: GameState, action: GameAction): ActionResult` (validates, mutates, appends to `state.log` when present)
  - `plantVisual(plant: PlantSim, tent: Tent): PlantVisual`
  - `observe(state: GameState, plantId: string): Observation` — visible facts only: observations text for active problems (phase >= subtle), plus numeric readings ONLY if the tent has the matching meter (pH/EC meter, thermo-hygrometer). Answer 10b of the owner: values visible when owned.
  - `forecast(state: GameState, horizonH: number): Forecast[]` — predicted moments for notifications: `{ atH, kind: 'thirsty' | 'problem' | 'ripe' | 'dry-done' | 'burp', plantId?, jarId? }`.
  - `gameHourToMs(state, h)` / `msToGameHour(state, ms)`.
  - `replayChallenge(def: ChallengeDef, actions: LoggedAction[]): ChallengeScore` — server and client use the same code.
- `shared/game/content/*` data: strains, equipment, products, treatments, levels/unlocks, random events, problem rules + presentation.
- `shared/game/drying.ts`: `stepDrying(state, dtH)`, `startDrying(state, plantId)`, `scoreCure(batch, jar)`.
- `shared/game/genetics.ts`: `cross(a: Genome, b: Genome, rand): Genome`, `breedStrain(state, motherId, fatherId, name): StrainDef`.

Imports inside `shared/game` use explicit `.ts` extensions (Deno imports it).

### Plant model
Hidden variables in `PlantSim`: root water, pH, EC, salts, root health; nutrient reserves (12 elements, 1.0 ideal,
< 0.6 deficiency pressure, > 1.3 toxicity pressure); biomass/bud mass; height, nodes; health, stress, permanent damage.
Uptake depends on pH window per medium (soil 6.0–7.0, coco/hydro 5.5–6.5; per-element availability curves so
pH drift locks out specific elements realistically: e.g. Fe/Mn at high pH, Ca/Mg at low pH). Environment: temp, RH, VPD,
PPFD and DLI from light + dim + plant height, airflow. Growth = f(DLI, VPD, root health, nutrients, stress).

### Problems
Every atlas problem id has a `ProblemRule` (pressure from conditions, per-step effect) and a `ProblemPresentation`
(visual symptoms + observation sentences per phase subtle/clear/severe, no problem name; phrasing like
"New leaves turn yellow between the veins, veins stay green"). Mobile nutrient deficiencies show on old leaves,
immobile on new leaves. Treatments are realistic; wrong treatment wastes money and time and can hurt
(flush during N deficiency worsens it, heavy feeding during burn worsens it).
Diagnosis: player picks a problem; correct = bonus coins/xp once + adds to `knowledge`; wrong = small xp loss, no coins.
Scanner: paid per use (inventory item `scanner-credit`), reveals the problem id(s) and phase.
Random events: power cut, heatwave, cold snap, pest hitchhiker, humidity spike; hermaphrodite under light-leak/heat stress.

### Economy
Coins from harvest quality (and grams), diagnosis bonuses, Shadow Challenge placement, and once per finished REAL
journal grow (owner answer 4a): bonus when a journal plant was harvested with >= 28 days of entries and >= 5 own photos,
max one per 30 days per real tent/space. Coins buy equipment, seeds, products, treatments, scanner credits.
Levels from xp unlock items and strains so beginners are not overwhelmed.

### Drying & curing minigame
Drying room: player sets temp/RH; moisture falls; too fast = terpene loss, too humid = mold risk. Then jars:
burp windows over a few real hours; jar RH must settle 58–65 %. Cure score feeds final quality.

### Breeding (M5)
Cross a flowering female with pollen from a hermed plant or a purchased male pollen item; child genome = per-trait
mix with variance; player names the strain; seeds land in inventory.

## App (Nuxt)
- Route `/game` (tents overview, events feed), `/game/plant/[id]`, `/game/shop`, `/game/dry`, `/game/knowledge`,
  `/game/challenge`, `/game/breed`. Bottom nav gets a 6th tab only if it fits 360 px wide; otherwise entry from Home + Tools + Guide.
- `useGame()` composable: loads/saves `budbuddy:game` (Capacitor Preferences, own key, debounced), syncs to now on
  start and on visibility, exposes state + `act(action)`. Included in backup export/import.
- Notifications: ids 7400–7499, max 3 per real day, toggle in game settings; scheduled from `forecast()`.
- Renderer: `app/components/game/render/*` — parametric SVG from `PlantVisual`; detailed fan leaf `<symbol>`,
  symptom layers by leaf age; buds with pistils/frost; performance: <= ~120 leaves, reuse via `<use>`.
  Dev gallery `/game/dev-gallery` (only in dev builds) shows symptom x phase x stage grid.
- Locales: lazy namespaces `game`, `gameDry`, `gameChallenge`, `gameBreed` (en + cs). Content texts live in
  content files as `L10n` objects.
- Design: follow `DESIGN.md` (calm dark grow app, one green accent, flat 1px cards, bottom sheets). antislop rules apply.

## Server (Shadow Challenge, M4)
- Tables `game_challenges` (week, def jsonb), `game_runs` (user, challenge, actions jsonb, score, verified bool), RLS,
  leaderboard view. Edge function `game-submit` replays with `replayChallenge` and stores the server-computed score.
  Size limits and rate limit like other functions. Requires sign-in.

## Milestones
M1 sim core + soil + renderer v1 + harvest; M2 shop/economy/coco/hydro/drying; M3 all problems, treatments,
diagnosis, scanner, events, notifications; M4 challenge + leaderboard; M5 breeding. Built in parallel, integrated by lead.

## Testing
vitest: determinism (same seed + actions = same state), each problem triggers under its condition and the correct
treatment stops it, balance targets above, replay parity client/server, save/load round trip. Renderer: gallery screenshots reviewed by lead.
