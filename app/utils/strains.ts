import { isMissingSchema } from './dbErrors'
import { locale } from './locale'

export interface Strain {
  id: string
  slug: string
  name: string
  breeder: string | null
  dominance: 'indica' | 'sativa' | 'hybrid' | null
  flowering: 'auto' | 'photo' | null
  flowering_weeks_min: number | null
  flowering_weeks_max: number | null
  description: string | null
  description_cs?: string | null
  image_url: string | null
  image_credit: string | null
  created_by: string | null
  approved: boolean
}

export interface StrainStats {
  strain_id: string
  reports: number
  avg_flowering_days: number | null
  avg_yield_g: number | null
  avg_difficulty: number | null
  avg_rating: number | null
}

const BASE_COLUMNS = 'id, slug, name, breeder, dominance, flowering, flowering_weeks_min, flowering_weeks_max, description, image_url, image_credit, created_by, approved'
export const STRAIN_COLUMNS = BASE_COLUMNS

let hasCs = true

/** Runs a strains query with description_cs, retrying without it while the column doesn't exist. */
export async function withStrainColumns<R extends { error: { code?: string } | null }>(run: (cols: string) => PromiseLike<R>): Promise<R> {
  if (hasCs) {
    const res = await run(`${BASE_COLUMNS}, description_cs`)
    if (!isMissingSchema(res.error)) return res
    hasCs = false
  }
  return run(BASE_COLUMNS)
}

/** Czech description when the app is in Czech and one exists. */
export function strainDescription(s: Pick<Strain, 'description' | 'description_cs'>): string | null {
  return (locale.value === 'cs' && s.description_cs?.trim()) || s.description
}

/** Seed rows use "Various" for multi-breeder strains. */
export function isVariousBreeder(b: string | null | undefined): boolean {
  return !!b && /^various$/i.test(b.trim())
}

/** Smaller Wikimedia thumbnail for grids (Commons only serves standard widths). */
export function strainThumb(url: string | null, width: 330 | 500 | 960 = 330): string | null {
  if (!url) return null
  return url.includes('upload.wikimedia.org') ? url.replace(/\/960px-/, `/${width}px-`) : url
}

/** Growth-habit icon per dominance: sativa grows tall, indica wide, hybrid mixes both. */
export function dominanceIcon(d: Strain['dominance']): string {
  return d === 'sativa' ? 'i-tabler-arrow-autofit-height' : d === 'indica' ? 'i-tabler-arrow-autofit-width' : 'i-tabler-git-merge'
}

export const STRAIN_MEDIA = ['soil', 'coco', 'hydro'] as const
export const STRAIN_TAGS = ['beginner-friendly', 'compact', 'stretchy', 'heavy-feeder', 'mould-resistant', 'smelly'] as const

export function strainSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/#/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
