import type { GrowData, JournalEntry, Plant, StageId } from '../types/grow'
import { addDays, daysBetween, todayISO } from './date'
import { blankEntry } from './entries'
import { createId } from './id'
import { emptyData } from './schema'

/** Example garden shown on first launch so the app does not open empty. */
export function buildDemoData(today = todayISO()): GrowData {
  const data = emptyData()
  data.settings.initialized = true
  const now = new Date().toISOString()
  const ago = (d: number) => addDays(today, -d)

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
    { name: 'Northern Lights #1', strain: 'Northern Lights', stage: 'flowering', startDate: ago(68), health: 5, notes: 'Topped once at node 5, very even canopy.' },
    [['germination', 68], ['seedling', 63], ['vegetative', 45], ['flowering', 19]]
  )
  const sd = plant(
    { name: 'Sour Diesel clone', strain: 'Sour Diesel', stage: 'vegetative', startDate: ago(24), medium: 'coco', potSize: '15 L', wateringInterval: 2 },
    [['seedling', 24], ['vegetative', 12]]
  )
  const gg = plant(
    { name: 'Gorilla Auto', strain: 'Gorilla Glue Auto', type: 'autoflower', stage: 'seedling', startDate: ago(9), potSize: '7 L', health: 3 },
    [['germination', 9], ['seedling', 5]]
  )
  const wh = plant(
    {
      name: 'White Widow #2',
      strain: 'White Widow',
      stage: 'curing',
      startDate: ago(140),
      archived: true,
      harvest: { date: ago(30), wetWeight: 412, dryWeight: 96, notes: 'Dense buds, slight foxtailing on the top cola.' }
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
    entry(nl.id, 66, { type: 'note', note: 'Taproot out, planted 1 cm deep.' }),
    entry(nl.id, 50, { type: 'train', method: 'topping', note: 'Topped above the 5th node.' }),
    entry(nl.id, 40, { type: 'measure', heightCm: 32, tempC: 25, humidity: 60 }),
    entry(nl.id, 30, { type: 'measure', heightCm: 51, tempC: 25, humidity: 55 }),
    entry(nl.id, 20, { type: 'measure', heightCm: 68, tempC: 24, humidity: 50 }),
    entry(nl.id, 12, { type: 'train', method: 'defoliation', note: 'Removed big fan leaves shading bud sites.' }),
    entry(nl.id, 10, { type: 'measure', heightCm: 84, tempC: 24, humidity: 48 }),
    entry(nl.id, 7, { type: 'feed', amountMl: 1500, nutrients: 'Bloom 3 ml/L, PK 1 ml/L', ph: 6.3, ec: 1.8 }),
    entry(nl.id, 4, { type: 'water', amountMl: 1500, ph: 6.4 }),
    entry(nl.id, 1, { type: 'feed', amountMl: 1500, nutrients: 'Bloom 3 ml/L', ph: 6.2, ec: 1.9 }),
    entry(nl.id, 0, { type: 'note', note: 'First amber trichomes? Not yet, all cloudy and clear.' }),

    entry(sd.id, 20, { type: 'water', amountMl: 300, ph: 5.9 }),
    entry(sd.id, 14, { type: 'feed', amountMl: 600, nutrients: 'Grow 2 ml/L, CalMag 1 ml/L', ph: 5.8, ec: 1.2 }),
    entry(sd.id, 12, { type: 'measure', heightCm: 14 }),
    entry(sd.id, 8, { type: 'train', method: 'lst', note: 'Main stem bent and tied down.' }),
    entry(sd.id, 5, { type: 'pest', product: 'Neem oil', note: 'A few fungus gnats, sprayed and added sticky traps.' }),
    entry(sd.id, 4, { type: 'measure', heightCm: 26, tempC: 26, humidity: 62 }),
    entry(sd.id, 2, { type: 'feed', amountMl: 800, nutrients: 'Grow 2.5 ml/L, CalMag 1 ml/L', ph: 5.8, ec: 1.4 }),

    entry(gg.id, 6, { type: 'note', note: 'Cotyledons open, moved under the light.' }),
    entry(gg.id, 3, { type: 'water', amountMl: 150 }),
    entry(gg.id, 1, { type: 'note', note: 'Slight droop – probably overwatered, waiting longer next time.' }),

    entry(wh.id, 30, { type: 'harvest', note: 'Chopped, wet weight 412 g.' }),
    entry(wh.id, 60, { type: 'feed', amountMl: 2000, nutrients: 'Bloom 3 ml/L', ph: 6.3, ec: 1.8 }),
    entry(wh.id, 40, { type: 'water', amountMl: 2000, note: 'Flush started.' })
  )

  data.tasks = [
    { id: createId(), title: 'Check trichomes on Northern Lights', date: today, plantId: nl.id, done: false, createdAt: now },
    { id: createId(), title: 'Refill reservoir & calibrate pH pen', date: today, plantId: null, done: true, createdAt: now },
    { id: createId(), title: 'Burp White Widow jars', date: today, plantId: wh.id, done: false, createdAt: now }
  ]

  return data
}
