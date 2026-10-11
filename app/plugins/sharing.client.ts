// Keeps publicly shared plants in sync; lazy so supabase-js stays out of the entry chunk.
export default defineNuxtPlugin(() => {
  const { ready } = useGrow()
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500))
  const stop = watch(ready, (v) => {
    if (!v) return
    queueMicrotask(() => stop())
    idle(() => {
      import('~/composables/usePlantSharing')
        .then((m) => {
          if (m.sharingNeeded()) m.usePlantSharing().startAutoSync()
        })
        .catch(e => console.warn('[sharing] auto-sync not started', e))
    })
  }, { immediate: true })
})
