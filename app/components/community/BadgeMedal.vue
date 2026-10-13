<script setup lang="ts">
import { badgeColor } from '~/composables/useBadges'

const props = withDefaults(defineProps<{
  glyph: string
  tier?: number
  earned?: boolean
  size?: number
}>(), { tier: 1, earned: true, size: 48 })

const color = computed(() => badgeColor(props.tier))
</script>

<template>
  <span
    class="medal"
    :class="{ earned, locked: !earned }"
    :style="{ '--c': color, '--s': `${size}px` }"
    aria-hidden="true"
  >
    <GrowIcon
      :name="glyph"
    />
    <UIcon
      v-if="!earned"
      name="i-tabler-lock"
      class="lock"
    />
  </span>
</template>

<style scoped>
.medal {
  position: relative;
  flex-shrink: 0;
  width: var(--s);
  height: var(--s);
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  font-size: calc(var(--s) * 0.5);
}

.medal.earned {
  color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent);
}

.medal.locked {
  color: var(--text-3);
  background: var(--surface-3);
}

.medal.locked .grow-icon {
  opacity: 0.5;
}

.lock {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: max(14px, calc(var(--s) * 0.32));
  height: max(14px, calc(var(--s) * 0.32));
  padding: 2px;
  border-radius: 50%;
  border: 2px solid var(--surface);
  background: var(--surface-3);
  color: var(--text-2);
}
</style>
