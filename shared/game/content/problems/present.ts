import type { L10n, ProblemId, ProblemPresentation, SymptomKind, SymptomWhere, VisualSymptom } from '../../types.ts'

/** symptom with intensity per phase subtle/clear/severe; 0 = not shown in that phase */
export type Sym = [SymptomKind, SymptomWhere, [number, number, number]]
/** one observation line: [en, cs] */
export type Line = [string, string]

const phaseSymptoms = (syms: Sym[], i: 0 | 1 | 2): VisualSymptom[] =>
  syms.filter(s => s[2][i] > 0).map(([kind, where, by]) => ({ kind, where, intensity: by[i] }))

const lines = (ls: Line[]): L10n[] => ls.map(([en, cs]) => ({ en, cs }))

export function present(id: ProblemId, syms: Sym[], subtle: Line[], clear: Line[], severe: Line[]): ProblemPresentation {
  return {
    id,
    atlasId: id,
    symptoms: { subtle: phaseSymptoms(syms, 0), clear: phaseSymptoms(syms, 1), severe: phaseSymptoms(syms, 2) },
    observations: { subtle: lines(subtle), clear: lines(clear), severe: lines(severe) }
  }
}
