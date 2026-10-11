<script setup lang="ts">
import type { PlantInput } from '~/composables/useGrow'

definePageMeta({ hideNav: true })

const route = useRoute()
const grow = useGrow()
const { notify } = useNotify()
const { $goBack } = useNuxtApp()
const { t } = useI18n()

const plant = computed(() => grow.getPlant(String(route.params.id)))
useHead({ title: () => (plant.value ? t('plants.edit.headTitle', { name: plant.value.name }) : t('plants.edit.title')) })

function save(data: PlantInput) {
  if (!plant.value) return
  // The stage is changed from the detail page so it lands in the journal.
  const { stage: _stage, ...rest } = data
  grow.updatePlant(plant.value.id, rest)
  notify(t('plants.edit.saved'))
  $goBack()
}
</script>

<template>
  <div>
    <AppHeader
      :title="t('plants.edit.title')"
      :subtitle="plant?.name"
      back
    />
    <div class="page">
      <PlantForm
        v-if="plant"
        :plant="plant"
        :submit-label="t('plants.edit.submit')"
        @submit="save"
      />
      <EmptyState
        v-else
        icon="seedling"
        :title="t('plants.edit.notFoundTitle')"
        :text="t('plants.edit.notFoundText')"
      >
        <NuxtLink
          to="/plants"
          class="btn btn-soft"
        >
          {{ t('plants.edit.backToPlants') }}
        </NuxtLink>
      </EmptyState>
    </div>
  </div>
</template>
