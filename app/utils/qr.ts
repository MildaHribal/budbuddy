// Plant label links. Labels carry an https link so any camera app can open it;
// the app also accepts its own budbuddy:// scheme.
export const LABEL_ORIGIN = 'https://budbuddy.hribal.site'

export function plantLink(id: string): string {
  return `${LABEL_ORIGIN}/plants/${encodeURIComponent(id)}`
}

const ID = '([\\w-]{1,64})'
const PATTERNS = [
  new RegExp(`^https?://(?:www\\.)?budbuddy\\.hribal\\.site/(?:plants|my_trees)/${ID}/?(?:[?#].*)?$`, 'i'),
  new RegExp(`^budbuddy://app/plants/${ID}/?(?:[?#].*)?$`, 'i'),
  new RegExp(`^/plants/${ID}/?$`)
]

/** Plant id from a scanned label, or null when the code is not a BudBuddy label. */
export function parsePlantLink(text: string): string | null {
  const s = text.trim()
  for (const re of PATTERNS) {
    const m = re.exec(s)
    if (m) return decodeURIComponent(m[1]!)
  }
  return null
}

export interface LabelLayout {
  id: 'small' | 'large'
  cols: number
  rows: number
}

export const LABEL_LAYOUTS: LabelLayout[] = [
  { id: 'small', cols: 3, rows: 8 },
  { id: 'large', cols: 2, rows: 4 }
]

/** Splits labels into A4 pages. */
export function paginateLabels<T>(items: readonly T[], perPage: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage))
  return pages
}
