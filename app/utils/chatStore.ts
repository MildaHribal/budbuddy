// Assistant chat storage. Kept apart from useAssistant so the garden store can prune
// threads of removed plants without loading the assistant.
import { Preferences } from '@capacitor/preferences'

export const CHAT_KEY = 'budbuddy:ai-chat'
const GENERAL = 'general'
/** photo previews kept in storage; base64 thumbs share the quota with the journal */
export const CHAT_THUMBS_KEPT = 6

interface ChatMessageLike {
  id: string
  createdAt: string
  pending?: boolean
  thumb?: string
  thumbDropped?: boolean
}

/** What gets stored: finished messages, the last `max` per thread, thumbs only on the newest few. */
export function chatSnapshot<M extends ChatMessageLike>(threads: Record<string, M[]>, max: number, keepThumbs = CHAT_THUMBS_KEPT): Record<string, M[]> {
  const data: Record<string, M[]> = {}
  for (const [key, list] of Object.entries(threads)) {
    const done = list.filter(m => !m.pending).slice(-max)
    if (done.length) data[key] = done
  }
  const newest = Object.values(data).flat().filter(m => m.thumb).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const keep = new Set(newest.slice(0, keepThumbs).map(m => m.id))
  for (const [key, list] of Object.entries(data)) {
    data[key] = list.map(m => (m.thumb && !keep.has(m.id) ? { ...m, thumb: undefined, thumbDropped: true } : m))
  }
  return data
}

type Pruner = (keep: (key: string) => boolean) => Promise<void> | void
let livePruner: Pruner | null = null

/** The loaded assistant prunes its in-memory threads too (otherwise its next save would bring them back). */
export function setChatPruner(fn: Pruner) {
  livePruner = fn
}

/** Drops chat threads of plants that no longer exist; the general thread stays. */
export async function pruneChats(plantIds: Iterable<string>): Promise<void> {
  const ids = new Set(plantIds)
  const keep = (key: string) => key === GENERAL || ids.has(key)
  if (livePruner) return livePruner(keep)
  const { value } = await Preferences.get({ key: CHAT_KEY })
  if (!value) return
  const raw = JSON.parse(value) as { threads?: Record<string, unknown>, lastThread?: unknown }
  const threads = raw.threads ?? {}
  const kept = Object.fromEntries(Object.entries(threads).filter(([k]) => keep(k)))
  if (Object.keys(kept).length === Object.keys(threads).length) return
  const lastThread = typeof raw.lastThread === 'string' && keep(raw.lastThread) ? raw.lastThread : null
  await Preferences.set({ key: CHAT_KEY, value: JSON.stringify({ threads: kept, lastThread }) })
}
