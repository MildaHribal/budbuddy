import { growStore } from '~/composables/useGrow'

// Plants on smart watering keep wateringInterval equal to the learned interval,
// so the Android widgets and anything reading the stored data see the same number.
export default defineNuxtPlugin(() => {
  const { ready, wateringSuggestion } = useGrow()
  const sync = () => {
    for (const p of growStore.plants) {
      if (!p.wateringAuto) continue
      const days = wateringSuggestion(p).days
      if (p.wateringInterval !== days) p.wateringInterval = days
    }
  }
  const key = computed(() => growStore.plants
    .filter(p => p.wateringAuto)
    .map(p => `${p.id}:${p.stage}:${p.potSize}:${p.medium}`)
    .join('|') + `#${growStore.entries.filter(e => e.type === 'water' || e.type === 'feed').length}`)
  watch(ready, (v) => {
    if (!v) return
    sync()
    watch(key, sync)
  }, { immediate: true })
})
