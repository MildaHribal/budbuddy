<script setup lang="ts">
import type { PlantVisual } from '../../../../shared/game/types'
import GamePlant from './GamePlant.vue'

withDefaults(defineProps<{
  visual: PlantVisual
  size?: number
  label?: string
}>(), { size: 64, label: '' })
</script>

<template>
  <GamePlant
    :visual="visual"
    :size="size"
    :label="label"
    detail="thumb"
  />
</template>
