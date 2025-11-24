<template>
  <div class="min-h-screen flex flex-col" :style="{ backgroundColor: 'var(--app-bg)' }">
    <div class="flex-1 flex flex-col page-bg">
      <slot />
    </div>

    <DownBar class="sticky bottom-0 z-50" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('bg-white')
  }
})
</script>
