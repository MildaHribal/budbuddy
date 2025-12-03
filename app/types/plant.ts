// Typy pro rostliny a pěstování

export interface Plant {
  id: number
  name: string
  strain: string
  stage: GrowthStage
  currentDay: number
  plantedDate: string
  health: number
  height: number
  moisture: number
  imageUrl?: string
}

export type GrowthStage =
  | 'germination'  // Klíčení
  | 'seedling'     // Sazenice
  | 'vegetative'   // Vegetace
  | 'pre-flower'   // Předkvět
  | 'flowering'    // Květení
  | 'ripening'     // Zrání

export interface GrowthStageInfo {
  name: string
  icon: string
  duration: string
  days: number
  description: string
  tips: string[]
}

export interface Action {
  id: number
  plantId: number
  type: ActionType
  date: string
  notes?: string
  amount?: number
  unit?: string
}

export type ActionType =
  | 'water'        // Zalévání
  | 'feed'         // Hnojení
  | 'prune'        // Ořez
  | 'train'        // Trénink
  | 'transplant'   // Přesazení
  | 'note'         // Poznámka
  | 'photo'        // Fotka

export interface Nutrient {
  name: string
  n: number  // Dusík
  p: number  // Fosfor
  k: number  // Draslík
}

export interface EnvironmentData {
  temperature: number
  humidity: number
  ph: number
  ec: number
  timestamp: string
}

export interface HarvestRecord {
  id: number
  plantId: number
  date: string
  wetWeight: number
  dryWeight: number
  strain: string
  notes?: string
}

// Konstanty pro fáze růstu
export const GROWTH_STAGES: Record<GrowthStage, GrowthStageInfo> = {
  germination: {
    name: 'Klíčení',
    icon: 'tabler:seeding',
    duration: '1-7 dní',
    days: 7,
    description: 'Semínko klíčí a vytváří první kořínky a listy.',
    tips: [
      'Udržuj vlhkost 70-90%',
      'Teplota 22-25°C',
      'Minimální světlo'
    ]
  },
  seedling: {
    name: 'Sazenice',
    icon: 'tabler:plant',
    duration: '2-3 týdny',
    days: 21,
    description: 'Rostlina vytváří první pravé listy a posiluje kořenový systém.',
    tips: [
      'Světlo 18/6 hodin',
      'Jemné hnojení',
      'Pozor na přelití'
    ]
  },
  vegetative: {
    name: 'Vegetace',
    icon: 'tabler:tree',
    duration: '3-16 týdnů',
    days: 56,
    description: 'Rychlý růst vegetativní hmoty, tvorba větví a listů.',
    tips: [
      'Více dusíku (N)',
      'Trénink a ořez',
      'Silné osvětlení'
    ]
  },
  'pre-flower': {
    name: 'Předkvět',
    icon: 'tabler:flower',
    duration: '1-2 týdny',
    days: 14,
    description: 'Přechod na květení, začínají se tvořit první pistily.',
    tips: [
      'Změna na 12/12',
      'Snížit dusík',
      'Zvýšit fosfor (P)'
    ]
  },
  flowering: {
    name: 'Květení',
    icon: 'tabler:cannabis',
    duration: '6-12 týdnů',
    days: 63,
    description: 'Tvorba květů a pryskyřice, hlavní produkční fáze.',
    tips: [
      'Více fosforu a draslíku',
      'Kontrola vlhkosti',
      'Sleduj trichomy'
    ]
  },
  ripening: {
    name: 'Zrání',
    icon: 'tabler:adjustments',
    duration: '1-2 týdny',
    days: 14,
    description: 'Finální dozrávání, propláchnutí před sklizní.',
    tips: [
      'Proplach čistou vodou',
      'Sleduj trichomy',
      'Příprava na sklizeň'
    ]
  }
}

// Helper funkce
export const getStageIcon = (stage: GrowthStage): string => {
  return GROWTH_STAGES[stage].icon
}

export const getStageName = (stage: GrowthStage): string => {
  return GROWTH_STAGES[stage].name
}

export const getStageInfo = (stage: GrowthStage): GrowthStageInfo => {
  return GROWTH_STAGES[stage]
}

