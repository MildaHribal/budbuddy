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

export const STRAIN_COLUMNS = 'id, slug, name, breeder, dominance, flowering, flowering_weeks_min, flowering_weeks_max, description, image_url, image_credit, created_by, approved'

/** Smaller Wikimedia thumbnail for grids (Commons only serves standard widths). */
export function strainThumb(url: string | null, width: 330 | 500 | 960 = 330): string | null {
  if (!url) return null
  return url.includes('upload.wikimedia.org') ? url.replace(/\/960px-/, `/${width}px-`) : url
}

/** Placeholder glyph colour per dominance. */
export function dominanceColor(d: Strain['dominance']): string {
  return d === 'indica' ? '#c9a2ff' : d === 'sativa' ? '#ffd28a' : '#9be36b'
}

export function strainSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/#/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
