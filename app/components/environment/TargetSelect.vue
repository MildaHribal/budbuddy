<script setup lang="ts">
import type { EnvTarget } from '~/types/environment'

const model = defineModel<EnvTarget>({ required: true })

const { t } = useI18n()
const { state } = useGrow()
const plants = computed(() => state.plants.filter(p => !p.archived))
const value = computed({
  get: () => (model.value.type === 'plant' ? model.value.plantId : ''),
  set: (v: string) => {
    model.value = v ? { type: 'plant', plantId: v } : { type: 'tent' }
  }
})
</script>

<template>
  <label class="field">
    <span class="field-label">{{ t('environment.target.label') }}</span>
    <select
      v-model="value"
      class="input"
    >
      <option value="">{{ t('environment.target.tent') }}</option>
      <option
        v-for="p in plants"
        :key="p.id"
        :value="p.id"
      >{{ t('environment.target.plant') }}: {{ p.name }}</option>
    </select>
  </label>
</template>
