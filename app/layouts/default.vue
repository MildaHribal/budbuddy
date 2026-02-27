<template>
  <div class="app-layout">
    <div class="app-content">
      <slot />
    </div>

    <DownBar />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import DownBar from '~/components/DownBar.vue'

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('bg-white')
    // Set meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', '#0a0a0a')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = '#0a0a0a'
      document.head.appendChild(meta)
    }
  }
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: #0a0a0a;
  position: relative;
  overflow-x: hidden;
}

.app-content {
  width: 100%;
  padding-bottom: calc(90px + env(safe-area-inset-bottom));
}
</style>

