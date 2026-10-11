import { compressImage } from '~/utils/image'
import { createId } from '~/utils/id'

export const ENTRY_SELECT = 'id, challenge_id, user_id, plant_id, image_url, caption, votes_count, is_hidden, created_at, author:profiles!challenge_entries_user_id_fkey(username, display_name, avatar_url, reputation)'

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
