<script setup lang="ts">
const route = useRoute()
const scroller = ref<HTMLElement | null>(null)
const hideNav = computed(() => route.meta.hideNav === true)

// Demo garden (web visitors, or the app after its tour): offer the way out at the end of home.
const { state, preview } = useGrow()
const { t } = useI18n()
const startOwnGarden = useOwnGarden()
const demoNote = computed(() => (state.settings.demo || state.plants.some(p => p.demo)) && route.path === '/')

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
      <div
        v-if="demoNote"
        class="demo-note card"
      >
        <span class="demo-tile"><UIcon
          name="i-tabler-flask-2"
          class="size-5"
        /></span>
        <span class="demo-text">{{ t('showcase.note') }}</span>
        <button
          type="button"
          class="btn btn-soft"
          @click="startOwnGarden"
        >
          {{ t(preview ? 'showcase.own.saved' : 'showcase.own.action') }}
        </button>
      </div>
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

/* bottom margin keeps the button clear of the FAB */
.demo-note {
  margin: 0 16px 72px;
  padding: 12px 14px 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.demo-tile {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  color: var(--text-2);
}

.demo-text {
  flex: 1;
  min-width: 140px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.demo-note .btn {
  flex-basis: 100%;
  min-height: 44px;
  font-size: 14px;
}
</style>
