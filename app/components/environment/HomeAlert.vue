<script setup lang="ts">
// Home screen: shows only when it matters – a rain-watering suggestion or the most urgent weather alert.
import { loadNamespaces } from '~/composables/useI18n'

const envApi = useEnvironment()
const ready = ref(false)

const relevant = computed(() => envApi.env.value.places.length > 0 && envApi.outdoorPlants.value.length > 0)
const rain = computed(() => envApi.rainDays.value[0] ?? null)
const alert = computed(() => {
  const list = envApi.alerts.value
  return list.find(a => a.severe) ?? list[0] ?? null
})
const visible = computed(() => ready.value && (rain.value || alert.value))

watch(relevant, (v) => {
  if (!v) return
  envApi.refreshAll()
  loadNamespaces(['environment']).then(() => (ready.value = true), () => {})
}, { immediate: true })
</script>

<template>
  <div
    v-if="visible"
    class="env-home"
  >
    <EnvironmentRainCard
      v-if="rain"
      :rain="rain"
    />
    <NuxtLink
      v-else-if="alert"
      to="/environment/weather"
      class="card alert-link"
    >
      <EnvironmentAlertItem :alert="alert" />
    </NuxtLink>
  </div>
</template>

<style scoped>
.alert-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.alert-link:active {
  transform: scale(0.985);
}
</style>
