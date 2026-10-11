<script setup lang="ts">
import { badgeColor } from '~/composables/useBadges'

const props = withDefaults(defineProps<{
  glyph: string
  tier?: number
  earned?: boolean
  size?: number
  draw?: boolean
}>(), { tier: 1, earned: true, size: 48, draw: false })

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
      :draw="draw"
      :stroke-width="1.5"
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
  background:
    radial-gradient(70% 70% at 50% 18%, color-mix(in srgb, var(--c) 30%, transparent), transparent 72%),
    #0c100d;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--c) 45%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 0 calc(var(--s) * 0.35) color-mix(in srgb, var(--c) 22%, transparent);
}

.medal.earned .grow-icon {
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 55%, transparent));
}

.medal.locked {
  color: var(--text-3);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}

.medal.locked .grow-icon {
  opacity: 0.45;
}

.lock {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: max(14px, calc(var(--s) * 0.32));
  height: max(14px, calc(var(--s) * 0.32));
  padding: 2px;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-2);
  box-shadow: 0 0 0 2px var(--bg);
}
</style>
