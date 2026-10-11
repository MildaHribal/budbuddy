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
    const { data } = await useSupabase().from('blocks').select('blocked_id').eq('blocker_id', uid)
    blocked.value = new Set((data ?? []).map(r => r.blocked_id as string))
  }

  async function setBlocked(id: string, on: boolean) {
    const uid = user.value?.id
    if (!uid) return
    const sb = useSupabase()
    const next = new Set(blocked.value)
    if (on) {
      await sb.from('blocks').insert({ blocker_id: uid, blocked_id: id })
      next.add(id)
    } else {
      await sb.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', id)
      next.delete(id)
    }
    blocked.value = next
  }

  const isBlocked = (id: string | null | undefined) => !!id && blocked.value.has(id)

  return { blocked, load, setBlocked, isBlocked }
}
