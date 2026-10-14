// Sample PlantVisual values for the dev gallery and the preview script.
import type { PlantVisual, SymptomKind, SymptomWhere, VisualSymptom } from '../../../shared/game/types'

export const SYMPTOM_KINDS: SymptomKind[] = [
  'chlorosis-uniform', 'chlorosis-interveinal', 'yellow-edges-in', 'tip-burn', 'edge-burn',
  'rust-spots', 'necrotic-spots', 'bronze-patches', 'purple-stems', 'purple-petioles', 'dark-green',
  'claw', 'taco', 'curl-down', 'curl-up', 'twisted-new-growth', 'pale-new-growth', 'bleached-top',
  'droop', 'wilt', 'stretch', 'stunted',
  'stipple', 'webbing', 'silver-streaks', 'insects', 'powder', 'gray-mold', 'leaf-trails', 'chewed', 'sticky',
  'nanners', 'foxtails'
]

/** Typical location of each symptom, as the sim's presentations use them. */
export const TYPICAL_WHERE: Record<SymptomKind, SymptomWhere> = {
  'chlorosis-uniform': 'old', 'chlorosis-interveinal': 'old', 'yellow-edges-in': 'old', 'tip-burn': 'all', 'edge-burn': 'old',
  'rust-spots': 'old', 'necrotic-spots': 'old', 'bronze-patches': 'old', 'purple-stems': 'stems', 'purple-petioles': 'stems', 'dark-green': 'all',
  'claw': 'all', 'taco': 'top', 'curl-down': 'all', 'curl-up': 'all', 'twisted-new-growth': 'new', 'pale-new-growth': 'new', 'bleached-top': 'top',
  'droop': 'all', 'wilt': 'all', 'stretch': 'all', 'stunted': 'all',
  'stipple': 'old', 'webbing': 'all', 'silver-streaks': 'all', 'insects': 'underside', 'powder': 'all', 'gray-mold': 'buds', 'leaf-trails': 'old', 'chewed': 'all', 'sticky': 'all',
  'nanners': 'buds', 'foxtails': 'buds'
}

export function sampleVisual(p: Partial<PlantVisual> = {}): PlantVisual {
  return {
    seed: 42, stage: 'veg', life: 0.3, heightCm: 45, nodes: 8, topped: 0, lst: false, defoliated: false,
    leafShape: 0.5, leafiness: 0.8, budSize: 0, budDensity: 0.6, pistils: 0, frost: 0, purple: 0, vigor: 1,
    medium: 'soil', potL: 11, symptoms: [], ...p
  }
}

export const SAMPLE_VEG = sampleVisual()
export const SAMPLE_FLOWER = sampleVisual({ stage: 'flower', life: 0.7, heightCm: 80, nodes: 12, budSize: 0.7, budDensity: 0.7, pistils: 0.3, frost: 0.6 })

export const symptom = (kind: SymptomKind, intensity: number, where: SymptomWhere = TYPICAL_WHERE[kind]): VisualSymptom => ({ kind, where, intensity })

export const SAMPLE_STAGES: { title: string, v: PlantVisual }[] = [
  { title: 'germination', v: sampleVisual({ stage: 'germination', life: 0.02, heightCm: 1, nodes: 0 }) },
  { title: 'seedling', v: sampleVisual({ stage: 'seedling', life: 0.06, heightCm: 6, nodes: 2 }) },
  { title: 'veg sativa', v: sampleVisual({ leafShape: 0.1, heightCm: 55, nodes: 9 }) },
  { title: 'veg indica', v: sampleVisual({ leafShape: 0.95, heightCm: 40, nodes: 8 }) },
  { title: 'flower', v: SAMPLE_FLOWER },
  { title: 'ripening', v: sampleVisual({ stage: 'ripening', life: 0.95, heightCm: 85, nodes: 12, budSize: 1, budDensity: 0.8, pistils: 0.85, frost: 0.9 }) },
  { title: 'harvested', v: sampleVisual({ stage: 'harvested', life: 1, heightCm: 85, nodes: 12 }) },
  { title: 'dead', v: sampleVisual({ stage: 'dead', life: 0.6, heightCm: 60, nodes: 10, budSize: 0.4, vigor: 0.2 }) }
]

export const SAMPLE_VARIANTS: { title: string, v: PlantVisual }[] = [
  { title: 'topped x1', v: sampleVisual({ topped: 1, heightCm: 50, nodes: 10 }) },
  { title: 'topped x2 flower', v: sampleVisual({ stage: 'flower', topped: 2, heightCm: 70, nodes: 12, budSize: 0.6, pistils: 0.2, frost: 0.4 }) },
  { title: 'lst', v: sampleVisual({ lst: true, heightCm: 50, nodes: 10 }) },
  { title: 'lst flower', v: sampleVisual({ stage: 'flower', lst: true, heightCm: 60, nodes: 11, budSize: 0.7, pistils: 0.4, frost: 0.5 }) },
  { title: 'purple flower', v: sampleVisual({ stage: 'flower', heightCm: 70, nodes: 11, budSize: 0.8, pistils: 0.5, frost: 0.7, purple: 0.9 }) },
  { title: 'coco 20 L', v: sampleVisual({ medium: 'coco', potL: 20, heightCm: 60, nodes: 10 }) },
  { title: 'hydro', v: sampleVisual({ medium: 'hydro', potL: 15, heightCm: 60, nodes: 10 }) },
  { title: 'defoliated flower', v: sampleVisual({ stage: 'flower', defoliated: true, heightCm: 70, nodes: 12, budSize: 0.6, pistils: 0.3, frost: 0.5 }) },
  { title: 'low vigor', v: sampleVisual({ vigor: 0.3 }) },
  { title: 'small pot 3 L', v: sampleVisual({ potL: 3, heightCm: 25, nodes: 6 }) },
  { title: 'tall sativa 150', v: sampleVisual({ leafShape: 0, heightCm: 150, nodes: 18 }) },
  { title: 'seed 2', v: sampleVisual({ seed: 1234 }) }
]
