// Stub of the on-device knowledge search; the real one replaces this file.

export interface KbHit {
  id: string
  kind: 'knowledge' | 'feeding_chart' | 'corpus'
  title: string
  text: string
  url?: string
  evidence?: string
  verdict?: string
  lang: string
  score: number
}

/** Resolves false when the knowledge pack is not installed. */
export async function initKb(_baseUrl: string): Promise<boolean> {
  return false
}

export async function searchKb(_query: string, _k = 12): Promise<KbHit[]> {
  return []
}
