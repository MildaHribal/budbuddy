const blocked = ref(new Set<string>())
let loadedFor: string | null = null

export function useBlocks() {
  const { user } = useAuth()

  async function load() {
    const uid = user.value?.id ?? null
    if (uid === loadedFor) return
    loadedFor = uid
    if (!uid) {
      blocked.value = new Set()
      return
    }
    const { data, error } = await useSupabase().from('blocks').select('blocked_id').eq('blocker_id', uid)
    // retry on the next call instead of trusting an empty list
    if (error) {
      if (loadedFor === uid) loadedFor = null
      return
    }
    if (loadedFor !== uid) return
    blocked.value = new Set((data ?? []).map(r => r.blocked_id as string))
  }

  /** false when the change could not be saved */
  async function setBlocked(id: string, on: boolean): Promise<boolean> {
    const uid = user.value?.id
    if (!uid) return false
    const sb = useSupabase()
    const { error } = on
      ? await sb.from('blocks').insert({ blocker_id: uid, blocked_id: id })
      : await sb.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', id)
    if (error && error.code !== '23505') return false
    const next = new Set(blocked.value)
    if (on) next.add(id)
    else next.delete(id)
    blocked.value = next
    return true
  }

  const isBlocked = (id: string | null | undefined) => !!id && blocked.value.has(id)

  return { blocked, load, setBlocked, isBlocked }
}
