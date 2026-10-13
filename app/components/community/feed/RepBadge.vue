<script setup lang="ts">
import { growerLevel } from '~/utils/grower'

const props = defineProps<{ rep: number }>()
const { t } = useI18n()
const level = computed(() => growerLevel(props.rep ?? 0))
const open = ref(false)
const mounted = ref(false)
async function show() {
  mounted.value = true
  await nextTick()
  open.value = true
}
</script>

<template>
  <button
    type="button"
    class="rep"
    :style="{ '--c': level.color }"
    :aria-label="t('feed.levelSheet.open', { level: level.label, n: rep ?? 0 })"
    @click.stop.prevent="show"
  >
    <span
      class="dot"
      aria-hidden="true"
    />
    {{ level.label }}
  </button>
  <CommunityFeedLevelSheet
    v-if="mounted"
    v-model:open="open"
    :rep="rep ?? 0"
  />
</template>

<style scoped>
.rep {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

/* 44px hit area without growing the label */
.rep::after {
  content: '';
  position: absolute;
  inset: -12px -4px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c);
}
</style>
