<script setup lang="ts">
const route = useRoute()
const scroller = ref<HTMLElement | null>(null)
const hideNav = computed(() => route.meta.hideNav === true)

// Each page starts at the top – the scroll container is ours, not the window's.
watch(() => route.path, () => {
  scroller.value?.scrollTo({ top: 0 })
})
</script>

<template>
  <div class="layout">
    <main
      ref="scroller"
      class="app-scroll"
      :class="{ 'no-nav': hideNav }"
    >
      <slot />
    </main>
    <BottomNav v-if="!hideNav" />
  </div>
</template>

<style scoped>
.layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.app-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: none;
  padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px);
}

.app-scroll::-webkit-scrollbar {
  display: none;
}

.app-scroll.no-nav {
  padding-bottom: 0;
}
</style>
