// Keeps publicly shared plants in sync with the community copy.
export default defineNuxtPlugin(() => {
  const { ready } = useGrow()
  const stop = watch(ready, (v) => {
    if (!v) return
    usePlantSharing().startAutoSync()
    queueMicrotask(() => stop())
  }, { immediate: true })
})
