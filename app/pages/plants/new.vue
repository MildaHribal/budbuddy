<script setup lang="ts">
import type { PlantInput } from '~/composables/useGrow'

definePageMeta({ hideNav: true })
const { t } = useI18n()
useHead({ title: () => t('plants.new.title') })

const grow = useGrow()
const { notify } = useNotify()

function create(data: PlantInput) {
  const plant = grow.addPlant(data)
  notify(t('plants.new.added', { name: plant.name }), { icon: 'i-tabler-plant' })
  navigateTo(`/plants/${plant.id}`, { replace: true })
}
</script>

<template>
  <div>
    <AppHeader
      :title="t('plants.new.title')"
      :subtitle="t('plants.new.subtitle')"
      back
    />
    <div class="page">
      <PlantForm
        :submit-label="t('plants.new.submit')"
        @submit="create"
      />
    </div>
  </div>
</template>
