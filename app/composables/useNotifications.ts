const unread = ref(0)
let inflight: Promise<void> | null = null

/** Shared unread-notification count (bell + notifications page). */
export function useNotifications() {
  const { user } = useAuth()

  function refresh(): Promise<void> {
    const uid = user.value?.id
    if (!uid) {
      unread.value = 0
      return Promise.resolve()
    }
    inflight ??= (async () => {
      try {
        const { count, error } = await useSupabase().from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid)
          .is('read_at', null)
        if (!error) unread.value = count ?? 0
      } finally {
        inflight = null
      }
    })()
    return inflight
  }

  return { unread, refresh }
}
