// Demo garden extras: feeding schedules, costs and inventory for the example plants.
import type { GrowData, Plant } from '../types/grow'
import { createId } from './id'

interface DemoPlants { nl: Plant, sd: Plant, gg: Plant, wh: Plant }

export function addDemoKit(data: GrowData, p: DemoPlants, ago: (d: number) => string, cs: boolean) {
  const now = new Date().toISOString()
  const t = (en: string, czech: string) => (cs ? czech : en)
  const plan = (plantId: string, scheduleId: string, strength: number, waterL: number) => ({ id: createId(), plantId, scheduleId, strength, waterL, createdAt: now })
  data.feeding = {
    custom: [],
    plans: [plan(p.nl.id, 'biobizz-light-mix', 100, 10), plan(p.sd.id, 'canna-coco', 75, 5), plan(p.gg.id, 'biobizz-light-mix', 50, 5)]
  }

  const eur = !cs
  const price = (czk: number) => (eur ? Math.round(czk / 25) : czk)
  const past = { id: createId(), name: 'White Widow', plantIds: [p.wh.id], createdAt: now }
  const current = { id: createId(), name: t('Current grow', 'Aktuální pěstování'), plantIds: [p.nl.id, p.sd.id, p.gg.id], createdAt: now }
  const expense = (title: string, category: 'seeds' | 'nutrients' | 'substrate' | 'gear', czk: number, daysAgo: number, runId: string | null) =>
    ({ id: createId(), title, category, amount: price(czk), date: ago(daysAgo), runId, createdAt: now })
  data.costs = {
    currency: eur ? 'EUR' : 'CZK',
    kwhPrice: eur ? 0.35 : 6,
    devices: [
      { id: createId(), name: 'LED 240 W', watts: 240, kind: 'light', hoursVeg: 18, hoursFlower: 12 },
      { id: createId(), name: t('Exhaust fan', 'Odtahový ventilátor'), watts: 35, kind: 'other', hoursVeg: 24, hoursFlower: 24 }
    ],
    expenses: [
      expense(t('Tent 80×80 and filter', 'Stan 80×80 a filtr'), 'gear', 3490, 150, null),
      expense('White Widow', 'seeds', 390, 142, past.id),
      expense('Light-Mix 50 L', 'substrate', 420, 141, past.id),
      expense(t('BioBizz starter pack', 'BioBizz startovací balení'), 'nutrients', 890, 120, past.id),
      expense(t('Northern Lights, 3 seeds', 'Northern Lights, 3 semínka'), 'seeds', 450, 70, current.id),
      expense(t('Coco 50 L', 'Kokos 50 L'), 'substrate', 360, 26, current.id)
    ],
    runs: [current, past]
  }

  const bottle = (name: string, volumeMl: number, startMl: number) => ({ id: createId(), name, volumeMl, startMl, countedAt: now, createdAt: now })
  data.inventory = {
    seeds: [
      { id: createId(), strain: 'Northern Lights', breeder: '', count: 2, type: 'photoperiod', sex: 'feminized', purchaseDate: ago(70), note: '', createdAt: now },
      { id: createId(), strain: 'Gorilla Glue Auto', breeder: '', count: 1, type: 'autoflower', sex: 'feminized', purchaseDate: ago(20), note: '', createdAt: now }
    ],
    nutrients: [bottle('Bio-Grow', 1000, 420), bottle('Bio-Bloom', 1000, 760), bottle('Top-Max', 500, 80)],
    supplies: [
      { id: createId(), kind: 'substrate', name: 'Light-Mix', quantity: 20, unit: 'L', lowAt: 25, createdAt: now },
      { id: createId(), kind: 'pot', name: t('Fabric pot 11 L', 'Textilní květináč 11 L'), quantity: 3, unit: 'pcs', lowAt: 1, createdAt: now }
    ],
    usage: []
  }
}
