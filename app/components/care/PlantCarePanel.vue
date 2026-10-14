<script setup lang="ts">
import type { Plant } from '~/types/grow'

// Plant page block: drying/curing assistant after harvest and treatment plans.
defineProps<{ plant: Plant }>()
</script>

<template>
  <CareDryingCard
    v-if="plant.stage === 'drying' && !plant.archived"
    :plant="plant"
  />
  <CareCuringCard
    v-if="plant.stage === 'curing' && !plant.archived"
    :plant="plant"
  />
  <CareHarvestRatingCard
    v-if="plant.harvest"
    :plant="plant"
  />
  <CareTreatmentList :plant="plant" />
</template>
