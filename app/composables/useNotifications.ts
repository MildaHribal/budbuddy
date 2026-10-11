const unread = ref(0)
let inflight: Promise<void> | null = null
let inflightUid: string | null = null
let lastPing = 0
const PING_EVERY = 3600e3

/** Shared unread-notification count (bell + notifications page). Polling only: notifications aren't in the realtime publication. */
export function useNotifications() {
  const { user } = useAuth()

  // ping_unsolved is idempotent; any signed-in client may nudge it when pg_cron isn't there
  function pingUnsolved() {
    if (Date.now() - lastPing < PING_EVERY) return
    lastPing = Date.now()
    useSupabase().rpc('ping_unsolved').then(() => {}, () => {})
  }

  async function fetchCount(uid: string) {
    const { count, error } = await useSupabase().from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .is('read_at', null)
    // drop answers for a user who signed out meanwhile
    if (!error && user.value?.id === uid) unread.value = count ?? 0
  }

  function refresh(): Promise<void> {
    const uid = user.value?.id
    if (!uid) {
      unread.value = 0
      return Promise.resolve()
    }
    if (inflight && inflightUid === uid) return inflight
    inflightUid = uid
    const run = fetchCount(uid).finally(() => {
      if (inflight === run) inflight = null
    })
    inflight = run
    pingUnsolved()
    return run
  }

  return { unread, refresh }
}
