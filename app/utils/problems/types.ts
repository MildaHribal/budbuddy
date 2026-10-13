import type { StageId } from '~/types/grow'

export type ProblemCategory = 'nutrient' | 'water' | 'light' | 'climate' | 'pest' | 'disease' | 'plant'

/** Where the first signs usually show up; drives the symptom checker. */
export type ProblemArea = 'old-leaves' | 'new-leaves' | 'whole-plant' | 'leaf-tips' | 'top-canopy' | 'buds' | 'stems' | 'roots' | 'soil' | 'underside'

export interface Lookalike {
  /** id of another problem */
  id: string
  /** one sentence: how to tell the two apart */
  howToTell: string
}

export interface Problem {
  /** slug; equals the photo classifier class where one exists */
  id: string
  category: ProblemCategory
  name: string
  aka?: string[]
  /** one sentence shown in lists */
  summary: string
  areas: ProblemArea[]
  /** what you see, most telling first */
  symptoms: string[]
  /** how to confirm it is this and not something else (checks, measurements) */
  confirm: string[]
  lookalikes: Lookalike[]
  causes: string[]
  fix: string[]
  prevent: string[]
  severity: 'low' | 'medium' | 'high'
  /** stages where it is most common; empty = any */
  stages: StageId[]
  /** classifier class id in public/ai/classifier/meta.json */
  classifier?: string
  /** /guide/<chapter>#<lesson> link */
  guide?: string
}

export interface ProblemPhoto {
  /** file name in app/assets/problems/ */
  file: string
  /** what the photo shows, used as alt text and caption */
  caption: string
  author: string
  license: string
  licenseUrl: string | null
  sourceUrl: string
}
