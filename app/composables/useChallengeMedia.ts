import { compressImage } from '~/utils/image'
import { createId } from '~/utils/id'

import { isMissingSchema } from '~/utils/dbErrors'

const AUTHOR_COLS = 'username, display_name, avatar_url, reputation'
export const ENTRY_SELECT = `id, challenge_id, user_id, plant_id, image_url, caption, votes_count, is_hidden, created_at, author:profiles!challenge_entries_user_id_fkey(${AUTHOR_COLS})`

/** Always the public view: it hides vote counts until voting ends. The plain embed is a fallback if the FK hint stops resolving. */
const SOURCES = [
  { table: 'challenge_entries_public', select: ENTRY_SELECT },
  { table: 'challenge_entries_public', select: ENTRY_SELECT.replace('profiles!challenge_entries_user_id_fkey', 'profiles') }
]
let sourceIx = 0

type EntryQuery = ReturnType<ReturnType<ReturnType<typeof useSupabase>['from']>['select']>

/** Runs an entries read against the best available source. */
export async function queryEntries<R extends { error: { code?: string } | null }>(build: (q: EntryQuery) => PromiseLike<R>): Promise<R> {
  const sb = useSupabase()
  for (;;) {
    const src = SOURCES[sourceIx]!
    const res = await build(sb.from(src.table).select(src.select))
    if (!isMissingSchema(res.error) || sourceIx === SOURCES.length - 1) return res
    sourceIx++
  }
}

/** Compresses and uploads a photo to media/<uid>/challenges/<prefix><uuid>.jpg; returns its public URL. */
export async function uploadChallengeImage(file: Blob, prefix = ''): Promise<string> {
  const sb = useSupabase()
  const uid = useAuth().user.value?.id
  if (!uid) throw new Error('not signed in')
  const blob = await compressImage(file)
  const path = `${uid}/challenges/${prefix}${createId()}.jpg`
  const { error } = await sb.storage.from('media').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return sb.storage.from('media').getPublicUrl(path).data.publicUrl
}

/** Copies one of the user's own media files into <uid>/challenges/; null when it isn't theirs or the copy fails. */
export async function copyToChallenges(url: string): Promise<string | null> {
  const uid = useAuth().user.value?.id
  const marker = '/storage/v1/object/public/media/'
  const i = url.indexOf(marker)
  if (!uid || i === -1) return null
  const from = decodeURIComponent(url.slice(i + marker.length).split('?')[0]!)
  if (!from.startsWith(`${uid}/`)) return null
  const to = `${uid}/challenges/${createId()}.jpg`
  const bucket = useSupabase().storage.from('media')
  const { error } = await bucket.copy(from, to)
  return error ? null : bucket.getPublicUrl(to).data.publicUrl
}

/** Removes an uploaded image when it lives in the user's own folder (best effort). */
export async function removeChallengeImage(url: string) {
  const uid = useAuth().user.value?.id
  const marker = '/storage/v1/object/public/media/'
  const i = url.indexOf(marker)
  if (!uid || i === -1) return
  const path = decodeURIComponent(url.slice(i + marker.length))
  if (!path.startsWith(`${uid}/challenges/`)) return
  await useSupabase().storage.from('media').remove([path]).catch(() => {})
}
