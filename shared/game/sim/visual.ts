import type { PlantSim, PlantVisual, SymptomKind, SymptomWhere, Tent, VisualSymptom } from '../types.ts'
import { presentation } from './content.ts'
import { flowerClock } from './plant.ts'
import { problemPhase } from './problems.ts'

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

function lifeOf(p: PlantSim, h: number): number {
  const c = flowerClock(p)
  const age = h - p.sownAtH
  if (c) return clamp01(age / (c.startH + c.lenH - p.sownAtH))
  return Math.min(0.4, (age / (35 * 24)) * 0.4)
}

export function plantVisual(p: PlantSim, _tent: Tent): PlantVisual {
  const h = p.lastH ?? p.sownAtH
  const pres = presentation()
  const merged = new Map<string, VisualSymptom>()
  const add = (kind: SymptomKind, where: SymptomWhere, intensity: number): void => {
    const key = `${kind}|${where}`
    const cur = merged.get(key)
    const v = clamp01(intensity)
    if (!cur) merged.set(key, { kind, where, intensity: v })
    else cur.intensity = Math.max(cur.intensity, v)
  }
  for (const x of p.problems) {
    const phase = problemPhase(x)
    if (phase === 'hidden') continue
    for (const s of pres[x.id]?.symptoms[phase] ?? []) add(s.kind, s.where, s.intensity * (0.5 + 0.5 * x.severity))
  }
  const w = p.root.water
  if (p.medium !== 'hydro' && !p.dead && p.stage !== 'harvested') {
    if (w < 0.2) add('droop', 'all', (0.2 - w) / 0.2)
    if (w < 0.08) add('wilt', 'all', (0.08 - w) / 0.08)
    if (w > 0.97 && p.root.health < 0.8) add('droop', 'all', 0.4 * (1 - p.root.health))
  }
  const leafy = p.biomass - p.budMass
  const defol = p.training.defoliatedAtH !== undefined && h - p.training.defoliatedAtH < 14 * 24
  const acc = p.acc
  return {
    seed: p.seed,
    stage: p.stage,
    life: lifeOf(p, h),
    heightCm: Math.round(p.heightCm * 10) / 10,
    nodes: p.nodes,
    topped: p.training.topped,
    lst: p.training.lst,
    defoliated: defol,
    leafShape: p.genome.leafShape,
    leafiness: clamp01((0.35 + 0.65 * clamp01(Math.sqrt(leafy / 120))) * (defol ? 0.7 : 1) * (0.6 + 0.4 * p.health)),
    budSize: clamp01(Math.sqrt(p.budMass / 120)),
    budDensity: acc && acc.flowerH > 0 ? clamp01(acc.density / acc.flowerH) : 0,
    pistils: clamp01((p.ripeness - 0.4) / 0.6),
    frost: clamp01(p.ripeness * (0.5 + 0.5 * p.genome.potency)),
    purple: clamp01(p.genome.purple * clamp01((p.ripeness - 0.6) / 0.4)),
    vigor: p.dead ? 0 : clamp01(p.health * (1 - 0.3 * p.stress)),
    medium: p.medium,
    potL: p.potL,
    symptoms: [...merged.values()]
  }
}
