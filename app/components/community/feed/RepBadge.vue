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
    <span class="pips">
      <i
        v-for="n in 5"
        :key="n"
        :class="{ lit: n <= level.tier + 1 }"
      />
    </span>
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
  padding: 0 7px 0 6px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: transparent;
  color: var(--text-2);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

/* 44px hit area without growing the chip */
.rep::after {
  content: '';
  position: absolute;
  inset: -12px -4px;
}

.pips {
  display: inline-flex;
  gap: 1.5px;
  align-items: flex-end;
}

.pips i {
  width: 2px;
  height: 8px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.14);
}

.pips i:nth-child(1) { height: 4px; }
.pips i:nth-child(2) { height: 5px; }
.pips i:nth-child(3) { height: 6px; }
.pips i:nth-child(4) { height: 7px; }

.pips i.lit {
  background: var(--c);
}
</style>
