<script setup lang="ts">
import type { PlantInput } from '~/composables/useGrow'

definePageMeta({ hideNav: true })
useHead({ title: 'New plant' })

const grow = useGrow()
const { notify } = useNotify()

function create(data: PlantInput) {
  const plant = grow.addPlant(data)
  notify(`${plant.name} added`, { icon: 'i-tabler-plant' })
  navigateTo(`/plants/${plant.id}`, { replace: true })
}
</script>

<template>
  <div>
    <AppHeader
      title="New plant"
      subtitle="Start a new journal"
      back
    />
    <div class="page">
      <PlantForm
        submit-label="Add plant"
        @submit="create"
      />
    </div>
  </div>
</template>
