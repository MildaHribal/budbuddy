import type { GrowData, JournalEntry, Plant, StageId } from '../types/grow'
import { addDays, daysBetween, todayISO } from './date'
import { blankEntry } from './entries'
import { demoPhotoId as pid } from './demoCredits'
import { createId } from './id'
import { locale } from './locale'
import { emptyData } from './schema'

/** Example garden shown on first launch so the app does not open empty. */
export function buildDemoData(today = todayISO()): GrowData {
  const data = emptyData()
  data.settings.initialized = true
  data.settings.demo = true
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
    stageHistory: history.map(([stage, d]) => ({ stage, date: ago(d) })),
    ...p
  })

  const nl = plant(
    { name: 'Northern Lights #1', strain: 'Northern Lights', stage: 'flowering', startDate: ago(68), health: 5, photoId: pid('flower-cola'), notes: t('Topped once at node 5, very even canopy.', 'Jeden topping nad 5. nodem, krásně vyrovnaný porost.') },
    [['germination', 68], ['seedling', 63], ['vegetative', 45], ['flowering', 19]]
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
      photoId: pid('jar'),
      harvest: { date: ago(30), wetWeight: 412, dryWeight: 96, notes: t('Dense buds, slight foxtailing on the top cola.', 'Husté palice, na vrcholové palici lehký foxtailing.') }
    },
    [['germination', 140], ['seedling', 134], ['vegetative', 115], ['flowering', 88], ['drying', 30], ['curing', 19]]
  )
  data.plants = [nl, sd, gg, wh]

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
    entry(nl.id, 50, { type: 'train', method: 'topping', note: t('Topped above the 5th node.', 'Topping nad 5. nodem.') }),
    entry(nl.id, 40, { type: 'measure', heightCm: 32, tempC: 25, humidity: 60 }),
    entry(nl.id, 30, { type: 'measure', heightCm: 51, tempC: 25, humidity: 55 }),
    entry(nl.id, 20, { type: 'measure', heightCm: 68, tempC: 24, humidity: 50 }),
    entry(nl.id, 12, { type: 'train', method: 'defoliation', note: t('Removed big fan leaves shading bud sites.', 'Odstraněny velké listy, které stínily květům.') }),
    entry(nl.id, 10, { type: 'measure', heightCm: 84, tempC: 24, humidity: 48 }),
    entry(nl.id, 7, { type: 'feed', amountMl: 1500, nutrients: 'Bloom 3 ml/L, PK 1 ml/L', ph: 6.3, ec: 1.8 }),
    entry(nl.id, 4, { type: 'water', amountMl: 1500, ph: 6.4 }),
    entry(nl.id, 1, { type: 'feed', amountMl: 1500, nutrients: 'Bloom 3 ml/L', ph: 6.2, ec: 1.9 }),
    entry(nl.id, 0, { type: 'note', note: t('First amber trichomes? Not yet, all cloudy and clear.', 'První jantarové trichomy? Zatím ne, všechny mléčné a čiré.'), photoIds: [pid('trichomes')] }),
    entry(nl.id, 62, { type: 'photo', note: t('First true leaves.', 'První pravé lístky.'), photoIds: [pid('seedling-sprout')] }),
    entry(nl.id, 38, { type: 'photo', note: t('Week 5 – filling the tent.', '5. týden – zaplňuje stan.'), photoIds: [pid('veg-tent')] }),
    entry(nl.id, 24, { type: 'photo', note: t('Canopy flat under the net, ready to flip.', 'Porost srovnaný pod sítí, připraveno na přepnutí.'), photoIds: [pid('canopy-scrog')] }),
    entry(nl.id, 9, { type: 'photo', note: t('Flower week 2 – stacking nicely.', '2. týden květu – pěkně nasazuje.'), photoIds: [pid('flower-plant')] }),
    entry(nl.id, 2, { type: 'photo', note: t('Top cola frosting up.', 'Vrcholová palice se pokrývá pryskyřicí.'), photoIds: [pid('flower-cola')] }),

    entry(sd.id, 20, { type: 'water', amountMl: 300, ph: 5.9 }),
    entry(sd.id, 14, { type: 'feed', amountMl: 600, nutrients: 'Grow 2 ml/L, CalMag 1 ml/L', ph: 5.8, ec: 1.2 }),
    entry(sd.id, 12, { type: 'measure', heightCm: 14 }),
    entry(sd.id, 8, { type: 'train', method: 'lst', note: t('Main stem bent and tied down.', 'Hlavní stonek ohnutý a přivázaný.') }),
    entry(sd.id, 5, { type: 'pest', product: t('Neem oil', 'Neemový olej'), note: t('A few fungus gnats, sprayed and added sticky traps.', 'Pár smutnic, postříkáno a přidány lepové pasti.') }),
    entry(sd.id, 4, { type: 'measure', heightCm: 26, tempC: 26, humidity: 62 }),
    entry(sd.id, 3, { type: 'photo', note: t('Bushing out after LST.', 'Po LST se pěkně rozvětvuje.'), photoIds: [pid('veg-coco')] }),
    entry(sd.id, 2, { type: 'feed', amountMl: 800, nutrients: t('Grow 2.5 ml/L, CalMag 1 ml/L', 'Grow 2,5 ml/L, CalMag 1 ml/L'), ph: 5.8, ec: 1.4 }),

    entry(gg.id, 6, { type: 'note', note: t('Cotyledons open, moved under the light.', 'Děložní lístky otevřené, přesunuto pod světlo.'), photoIds: [pid('seedling-led')] }),
    entry(gg.id, 3, { type: 'water', amountMl: 150 }),
    entry(gg.id, 1, { type: 'note', note: t('Slight droop – probably overwatered, waiting longer next time.', 'Mírně svěšené – asi přelito, příště počkám déle.') }),

    entry(wh.id, 30, { type: 'harvest', note: t('Chopped, wet weight 412 g.', 'Sklizeno, mokrá váha 412 g.') }),
    entry(wh.id, 27, { type: 'photo', note: t('Hanging whole branches, 18 °C / 55 %.', 'Visí celé větve, 18 °C / 55 %.'), photoIds: [pid('drying')] }),
    entry(wh.id, 15, { type: 'photo', note: t('Jarred, burping daily.', 'Ve sklenicích, denně větrám.'), photoIds: [pid('jar')] }),
    entry(wh.id, 60, { type: 'feed', amountMl: 2000, nutrients: 'Bloom 3 ml/L', ph: 6.3, ec: 1.8 }),
    entry(wh.id, 40, { type: 'water', amountMl: 2000, note: t('Flush started.', 'Začal proplach.') })
  )

  data.tasks = [
    { id: createId(), title: t('Check trichomes on Northern Lights', 'Zkontrolovat trichomy na Northern Lights'), date: today, plantId: nl.id, done: false, createdAt: now },
    { id: createId(), title: t('Refill reservoir & calibrate pH pen', 'Doplnit nádrž a zkalibrovat pH metr'), date: today, plantId: null, done: true, createdAt: now },
    { id: createId(), title: t('Burp White Widow jars', 'Vyvětrat sklenice s White Widow'), date: today, plantId: wh.id, done: false, createdAt: now }
  ]

  return data
}
