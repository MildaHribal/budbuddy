// Types for plants and growing

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

export type GrowthStage
  = | 'germination' // Germination
    | 'seedling' // Seedling
    | 'vegetative' // Vegetative
    | 'pre-flower' // Pre-flower
    | 'flowering' // Flowering
    | 'ripening' // Ripening

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

export type ActionType
  = | 'water' // Watering
    | 'feed' // Feeding
    | 'prune' // Pruning
    | 'train' // Training
    | 'transplant' // Transplanting
    | 'note' // Note
    | 'photo' // Photo

export interface Nutrient {
  name: string
  n: number // Nitrogen
  p: number // Phosphorus
  k: number // Potassium
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

// Growth stage constants
export const GROWTH_STAGES: Record<GrowthStage, GrowthStageInfo> = {
  'germination': {
    name: 'Germination',
    icon: 'tabler:seeding',
    duration: '1-7 days',
    days: 7,
    description: 'The seed is sprouting and developing its first roots and leaves.',
    tips: [
      'Keep humidity at 70-90%',
      'Temperature 22-25°C',
      'Minimal light'
    ]
  },
  'seedling': {
    name: 'Seedling',
    icon: 'tabler:plant',
    duration: '2-3 weeks',
    days: 21,
    description: 'The plant develops its first true leaves and strengthens the root system.',
    tips: [
      'Light cycle 18/6 hours',
      'Light feeding',
      'Watch for overwatering'
    ]
  },
  'vegetative': {
    name: 'Vegetative',
    icon: 'tabler:tree',
    duration: '3-16 weeks',
    days: 56,
    description: 'Rapid growth of vegetative mass, formation of branches and leaves.',
    tips: [
      'More nitrogen (N)',
      'Training and pruning',
      'Strong lighting'
    ]
  },
  'pre-flower': {
    name: 'Pre-flower',
    icon: 'tabler:flower',
    duration: '1-2 weeks',
    days: 14,
    description: 'Transition to flowering, first pistils begin to form.',
    tips: [
      'Switch to 12/12',
      'Reduce nitrogen',
      'Increase phosphorus (P)'
    ]
  },
  'flowering': {
    name: 'Flowering',
    icon: 'tabler:cannabis',
    duration: '6-12 weeks',
    days: 63,
    description: 'Bud and resin production, the main production phase.',
    tips: [
      'More phosphorus and potassium',
      'Monitor humidity',
      'Watch trichomes'
    ]
  },
  'ripening': {
    name: 'Ripening',
    icon: 'tabler:adjustments',
    duration: '1-2 weeks',
    days: 14,
    description: 'Final ripening, flushing before harvest.',
    tips: [
      'Flush with plain water',
      'Watch trichomes',
      'Prepare for harvest'
    ]
  }
}

// Helper functions
export const getStageIcon = (stage: GrowthStage): string => {
  return GROWTH_STAGES[stage].icon
}

export const getStageName = (stage: GrowthStage): string => {
  return GROWTH_STAGES[stage].name
}

export const getStageInfo = (stage: GrowthStage): GrowthStageInfo => {
  return GROWTH_STAGES[stage]
}
