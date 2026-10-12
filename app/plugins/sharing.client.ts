// Keeps publicly shared plants in sync; lazy so supabase-js stays out of the entry chunk.
// Pre-checks without importing anything: most people share nothing, and the import pulls ~220 KB of supabase-js.
function maybeSharing(): boolean {
  if (useGrow().state.plants.some(p => p.sharing)) return true
  try {
    // pending remote deletes (see usePlantSharing META_KEY)
    return (JSON.parse(localStorage.getItem('bb.sharing.v1') ?? 'null')?.tombstones?.length ?? 0) > 0
  } catch {
    return false
  }
}

export default defineNuxtPlugin(() => {
  const { ready } = useGrow()
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500))
  const stop = watch(ready, (v) => {
    if (!v) return
    queueMicrotask(() => stop())
    idle(() => {
      if (!maybeSharing()) return
      import('~/composables/usePlantSharing')
        .then((m) => {
          if (m.sharingNeeded()) m.usePlantSharing().startAutoSync()
        })
        .catch(e => console.warn('[sharing] auto-sync not started', e))
    })
  }, { immediate: true })
})
