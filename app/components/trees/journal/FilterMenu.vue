<script setup lang="ts">
import { ref } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'

const items = ref<DropdownMenuItem[]>([
  {
    label: 'Profile',
    icon: 'i-lucide-user'
  },
  {
    label: 'Billing',
    icon: 'i-lucide-credit-card'
  },
  {
    label: 'Settings',
    icon: 'i-lucide-cog'
  }
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{
      align: 'start',
      side: 'bottom',
      sideOffset: 8
    }"
    :ui="{
      content: 'w-48'
    }"
  >
    <UButton
      aria-label="Open menu"
      icon="i-lucide-menu"
      color="neutral"
      variant="outline"
    />
  </UDropdownMenu>
</template>

<style scoped>

</style>
