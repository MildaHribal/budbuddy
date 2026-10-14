import type { GrowData, JournalEntry, Plant, StageId } from '../types/grow'
import { addDays, daysBetween, todayISO } from './date'
import { blankEntry } from './entries'
import { demoPhotoId as pid } from './demoCredits'
import { addDemoKit } from './demoKit'
import { scoreHarvest } from './harvestScore'
import { createId } from './id'
import { locale } from './locale'
import { emptyData } from './schema'

/** Bumped when the demo content changes, so saved demo gardens get the new version. */
export const DEMO_VERSION = 3

/** Example garden shown on first launch so the app does not open empty. */
export function buildDemoData(today = todayISO()): GrowData {
  const data = emptyData()
  data.settings.initialized = true
  data.settings.demo = true
  data.settings.demoVersion = DEMO_VERSION
  // the hero plant (Northern Lights, photoperiod) is flowering, so the main tent runs 12/12
  data.settings.lightHours = 12
  const now = new Date().toISOString()
  const ago = (d: number) => addDays(today, -d)
  const cs = locale.value === 'cs'
  const t = (en: string, czech: string) => (cs ? czech : en)

  const plant = (p: Partial<Plant> & Pick<Plant, 'name' | 'strain' | 'stage' | 'startDate'>, history: [StageId, number][]): Plant => ({
    id: createId(),
    type: 'photoperiod',
    potSize: '11 L',
    medium: 'soil',
    location: 'indoor',
    wateringInterval: 3,
    health: 4,
    photoId: null,
    notes: '',
    harvest: null,
    archived: false,
    createdAt: now,
    updatedAt: now,
    demo: true,
    stageHistory: history.map(([stage, d]) => ({ stage, date: ago(d) })),
    ...p
  })

  const nl = plant(
    { name: 'Northern Lights #1', strain: 'Northern Lights', stage: 'flowering', startDate: ago(68), health: 5, photoId: pid('nl-tent'), notes: t('Topped once at node 4, very even canopy.', 'Jeden topping nad 4. nodem, krásně vyrovnaný porost.') },
    [['germination', 68], ['seedling', 63], ['vegetative', 48], ['flowering', 33]]
  )
  const sd = plant(
    { name: t('Sour Diesel clone', 'Sour Diesel (řízek)'), strain: 'Sour Diesel', stage: 'vegetative', startDate: ago(24), medium: 'coco', potSize: '15 L', wateringInterval: 2, photoId: pid('veg-coco') },
    [['seedling', 24], ['vegetative', 12]]
  )
  const gg = plant(
    { name: 'Gorilla Auto', strain: 'Gorilla Glue Auto', type: 'autoflower', stage: 'seedling', startDate: ago(9), potSize: '7 L', health: 3, photoId: pid('seedling-led') },
    [['germination', 9], ['seedling', 5]]
  )
  const wh = plant(
    {
      name: 'White Widow #2',
      strain: 'White Widow',
      stage: 'curing',
      startDate: ago(140),
      archived: true,
      photoId: pid('ww-cured'),
      harvest: { date: ago(30), wetWeight: 412, dryWeight: 96, notes: t('Dense buds, slight foxtailing on the top cola.', 'Husté palice, na vrcholové palici lehký foxtailing.') }
    },
    [['germination', 140], ['seedling', 134], ['vegetative', 115], ['flowering', 88], ['drying', 30], ['curing', 19]]
  )
  data.plants = [nl, sd, gg, wh]

  // two tents: the flowering hero under 12/12, the young plants under 18/6
  const space = (name: string, size: string, light: string, lightHours: number) =>
    ({ id: createId(), name, location: 'indoor' as const, size, light, lightsOn: '06:00', lightHours, notes: '', createdAt: now, updatedAt: now })
  const flowerTent = space(t('Flower tent', 'Květový stan'), '80 × 80 × 160 cm', 'LED 240 W', 12)
  const vegTent = space(t('Veg tent', 'Růstový stan'), '60 × 60 × 140 cm', 'LED 100 W', 18)
  data.spaces = [flowerTent, vegTent]
  nl.spaceId = flowerTent.id
  sd.spaceId = vegTent.id
  gg.spaceId = vegTent.id

  const entry = (plantId: string, daysAgo: number, e: Partial<JournalEntry> & Pick<JournalEntry, 'type'>): JournalEntry => {
    const date = ago(daysAgo)
    return { ...blankEntry(), id: createId(), plantId, date, createdAt: `${date}T${String(8 + (daysAgo % 10)).padStart(2, '0')}:15:00`, ...e }
  }

  for (const p of data.plants) {
    for (const h of p.stageHistory.slice(1)) {
      data.entries.push(entry(p.id, daysBetween(h.date, today), { type: 'stage', stage: h.stage }))
    }
  }

  data.entries.push(
    entry(nl.id, 66, { type: 'note', note: t('Taproot out, planted 1 cm deep.', 'Kořínek venku, zasazeno 1 cm hluboko.') }),
    entry(nl.id, 65, { type: 'photo', note: t('Popped! Cotyledons up in the peat pot.', 'Vyklíčilo! Děložní lístky venku z rašelinového květináčku.'), photoIds: [pid('nl-sprout')] }),
    entry(nl.id, 59, { type: 'photo', note: t('First serrated leaves.', 'První zubaté lístky.'), photoIds: [pid('nl-seedling')] }),
    entry(nl.id, 50, { type: 'photo', note: t('Third set of leaves, growing fast now.', 'Třetí patro listů, teď už roste rychle.'), photoIds: [pid('nl-leaves')] }),
    entry(nl.id, 44, { type: 'train', method: 'topping', note: t('Topped above the 4th node.', 'Topping nad 4. nodem.') }),
    entry(nl.id, 40, { type: 'measure', heightCm: 32, tempC: 25, humidity: 60 }),
    entry(nl.id, 38, { type: 'photo', note: t('Two main tops coming up evenly after topping.', 'Po toppingu rostou dva hlavní vrcholy rovnoměrně.'), photoIds: [pid('nl-topped')] }),
    entry(nl.id, 34, { type: 'photo', note: t('Last day of veg, flipping to 12/12 tonight.', 'Poslední den růstu, dnes večer přepínám na 12/12.'), photoIds: [pid('nl-flip')] }),
    entry(nl.id, 30, { type: 'measure', heightCm: 51, tempC: 25, humidity: 55 }),
    entry(nl.id, 26, { type: 'photo', note: t('Flower week 2, the stretch is on.', '2. týden květu, rostlina se natahuje.'), photoIds: [pid('nl-stretch')] }),
    entry(nl.id, 20, { type: 'measure', heightCm: 68, tempC: 24, humidity: 50 }),
    entry(nl.id, 18, { type: 'photo', note: t('Week 3, bud sites on every top.', '3. týden, květy na každém vrcholu.'), photoIds: [pid('nl-early-bud')] }),
    entry(nl.id, 12, { type: 'train', method: 'defoliation', note: t('Removed big fan leaves shading bud sites.', 'Odstraněny velké listy, které stínily květům.') }),
    entry(nl.id, 10, { type: 'measure', heightCm: 84, tempC: 24, humidity: 48 }),
    entry(nl.id, 8, { type: 'photo', note: t('Week 4, colas stacking up.', '4. týden, palice pěkně nasazují.'), photoIds: [pid('nl-mid-flower')] }),
    entry(nl.id, 7, { type: 'feed', amountMl: 1500, nutrients: 'Bio-Bloom 3 ml/L, Top-Max 1 ml/L', ph: 6.3, ec: 1.8 }),
    entry(nl.id, 4, { type: 'water', amountMl: 1500, ph: 6.4 }),
    entry(nl.id, 3, { type: 'photo', note: t('Week 5, first pistils turning orange.', '5. týden, první pestíky oranžovějí.'), photoIds: [pid('nl-bud')] }),
    entry(nl.id, 1, { type: 'feed', amountMl: 1500, nutrients: 'Bio-Bloom 3 ml/L', ph: 6.2, ec: 1.9 }),
    entry(nl.id, 0, { type: 'photo', note: t('Loupe check: trichomes clear and cloudy, no amber yet.', 'Kontrola lupou: trichomy čiré a mléčné, zatím žádné jantarové.'), photoIds: [pid('nl-trichome')] }),

    entry(sd.id, 24, { type: 'photo', note: t('Clone rooted, potted up today.', 'Řízek zakořenil, dnes přesazen.'), photoIds: [pid('sd-clone')] }),
    entry(sd.id, 20, { type: 'water', amountMl: 300, ph: 5.9 }),
    entry(sd.id, 16, { type: 'photo', note: t('Roots took, new growth on every clone.', 'Kořeny chytly, všechny řízky nově rostou.'), photoIds: [pid('sd-veg')] }),
    entry(sd.id, 14, { type: 'feed', amountMl: 600, nutrients: 'CANNA Coco A 2 ml/L, CANNA Coco B 2 ml/L', ph: 5.8, ec: 1.2 }),
    entry(sd.id, 12, { type: 'measure', heightCm: 14 }),
    entry(sd.id, 11, { type: 'photo', note: t('Moved into the veg tent, 15 L of coco.', 'Přestěhován do růstového stanu, 15 L kokosu.'), photoIds: [pid('veg-coco')] }),
    entry(sd.id, 8, { type: 'train', method: 'lst', note: t('Main stem bent and tied down.', 'Hlavní stonek ohnutý a přivázaný.') }),
    entry(sd.id, 6, { type: 'train', method: 'topping', note: t('Topped the new leader, two tops now.', 'Topping nového vrcholu, teď má dva.'), photoIds: [pid('sd-topped')] }),
    entry(sd.id, 5, { type: 'pest', product: t('Neem oil', 'Neemový olej'), note: t('A few fungus gnats, sprayed and added sticky traps.', 'Pár smutnic, postříkáno a přidány lepové pasti.') }),
    entry(sd.id, 4, { type: 'measure', heightCm: 26, tempC: 26, humidity: 62 }),
    entry(sd.id, 2, { type: 'feed', amountMl: 800, nutrients: t('CANNA Coco A 2.5 ml/L, CANNA Coco B 2.5 ml/L', 'CANNA Coco A 2,5 ml/L, CANNA Coco B 2,5 ml/L'), ph: 5.8, ec: 1.4 }),

    entry(gg.id, 8, { type: 'photo', note: t('Breaking the surface in the propagator.', 'Prorůstá na povrch v množárně.'), photoIds: [pid('gg-germ')] }),
    entry(gg.id, 5, { type: 'photo', note: t('Cotyledons open, moved under the light.', 'Děložní lístky otevřené, přesunuto pod světlo.'), photoIds: [pid('gg-sprout')] }),
    entry(gg.id, 3, { type: 'water', amountMl: 150 }),
    entry(gg.id, 1, { type: 'note', note: t('Slight droop, probably overwatered. Waiting longer next time.', 'Mírně svěšené, asi přelito. Příště počkám déle.') }),
    entry(gg.id, 0, { type: 'photo', note: t('First true leaves, standing up straight again.', 'První pravé lístky, zase stojí rovně.'), photoIds: [pid('gg-leaves')] }),

    entry(wh.id, 30, { type: 'harvest', note: t('Chopped, wet weight 412 g.', 'Sklizeno, mokrá váha 412 g.') }),
    entry(wh.id, 27, { type: 'photo', note: t('Hanging whole branches, 18 °C / 55 %.', 'Visí celé větve, 18 °C / 55 %.'), photoIds: [pid('drying')] }),
    entry(wh.id, 15, { type: 'photo', note: t('Jarred, burping daily.', 'Ve sklenicích, denně větrám.'), photoIds: [pid('ww-cured')] }),
    entry(wh.id, 59, { type: 'photo', note: t('Day 29 of flower.', '29. den květu.'), photoIds: [pid('ww-bloom')] }),
    entry(wh.id, 45, { type: 'photo', note: t('Frost everywhere, almost there.', 'Všude pryskyřice, už to bude.'), photoIds: [pid('ww-flower')] }),
    entry(wh.id, 60, { type: 'feed', amountMl: 2000, nutrients: 'Bio-Bloom 3 ml/L', ph: 6.3, ec: 1.8 }),
    entry(wh.id, 40, { type: 'water', amountMl: 2000, note: t('Flush started.', 'Začal proplach.') })
  )

  data.tasks = [
    { id: createId(), title: t('Check trichomes on Northern Lights', 'Zkontrolovat trichomy na Northern Lights'), date: today, plantId: nl.id, done: false, createdAt: now },
    { id: createId(), title: t('Refill reservoir & calibrate pH pen', 'Doplnit nádrž a zkalibrovat pH metr'), date: today, plantId: null, done: true, createdAt: now },
    { id: createId(), title: t('Burp White Widow jars', 'Vyvětrat sklenice s White Widow'), date: today, plantId: wh.id, done: false, createdAt: now }
  ]

  // a sample AI rating, so the web demo shows what the Android app gives after a harvest
  wh.harvest!.rating = scoreHarvest(wh, data.entries.filter(e => e.plantId === wh.id), {
    scores: { structure: 8, frost: 9, trimCure: 7, health: 9 },
    summary: t('Dense, very frosty buds with a clean cure. The top cola stretched a little in late flower.', 'Husté, hodně ojíněné palice a čisté zrání. Vrcholová palice se na konci květu trochu vytáhla.'),
    good: [t('Heavy trichome cover down to the sugar leaves', 'Hustá vrstva trichomů až na cukrové listy'), t('No mould or burnt tips', 'Bez plísně a spálených špiček'), t('Slow dry kept the colour green-gold', 'Pomalé sušení zachovalo zelenozlatou barvu')],
    improve: [t('Keep late-flower heat under 26 °C to stop foxtailing', 'Na konci květu drž teplotu pod 26 °C, ať palice nefoxtailují'), t('A tighter trim around the top buds', 'Pečlivější trim kolem vrcholových palic')]
  }, { photoIds: [pid('ww-cured'), pid('ww-flower')], aroma: 3 }, today, new Date(`${ago(2)}T18:00:00`))

  addDemoKit(data, { nl, sd, gg, wh }, ago, cs)
  return data
}

const isDemoPhoto = (id: string) => id.startsWith('demo-')

/**
 * Brings a demo garden saved by an older version up to date; returns null when nothing changes.
 * A pure demo garden is rebuilt (keeping settings and guide progress). Next to the grower's own
 * plants only the demo photos are swapped, so nothing the grower logged is lost.
 */
export function upgradeDemo(data: GrowData, today = todayISO()): GrowData | null {
  if ((data.settings.demoVersion ?? 1) >= DEMO_VERSION) return null
  const old = data.plants.filter(p => p.demo)
  if (!old.length) return null
  const fresh = buildDemoData(today)

  if (data.settings.demo && old.length === data.plants.length) {
    fresh.guide = data.guide
    fresh.settings = { ...data.settings, demoVersion: DEMO_VERSION }
    return fresh
  }

  for (const p of old) {
    const match = fresh.plants.find(f => f.strain === p.strain)
    if (!match) continue
    const shift = daysBetween(match.startDate, p.startDate)
    data.entries = data.entries.filter(e => !(e.plantId === p.id && e.photoIds.length && e.photoIds.every(isDemoPhoto)))
    for (const e of fresh.entries.filter(x => x.plantId === match.id && x.photoIds.length)) {
      const date = addDays(e.date, shift)
      data.entries.push({ ...e, id: createId(), plantId: p.id, date, createdAt: date + e.createdAt.slice(10) })
    }
    if (p.photoId && isDemoPhoto(p.photoId)) p.photoId = match.photoId
  }
  data.settings.demoVersion = DEMO_VERSION
  return data
}
