<script setup lang="ts">
import type { PlantInput } from '~/composables/useGrow'

definePageMeta({ hideNav: true })

const route = useRoute()
const grow = useGrow()
const { notify } = useNotify()
const { $goBack } = useNuxtApp()

const plant = computed(() => grow.getPlant(String(route.params.id)))
useHead({ title: () => (plant.value ? `Edit ${plant.value.name}` : 'Edit plant') })

function save(data: PlantInput) {
  if (!plant.value) return
  // The stage is changed from the detail page so it lands in the journal.
  const { stage: _stage, ...rest } = data
  grow.updatePlant(plant.value.id, rest)
  notify('Changes saved')
  $goBack()
}
</script>

<template>
  <div>
    <AppHeader
      title="Edit plant"
      :subtitle="plant?.name"
      back
    />
    <div class="page">
      <PlantForm
        v-if="plant"
        :plant="plant"
        submit-label="Save changes"
        @submit="save"
      />
      <EmptyState
        v-else
        icon="i-tabler-plant-off"
        title="Plant not found"
        text="It may have been deleted."
      >
        <NuxtLink
          to="/plants"
          class="btn btn-soft"
        >
          Back to plants
        </NuxtLink>
      </EmptyState>
    </div>
  </div>
</template>
