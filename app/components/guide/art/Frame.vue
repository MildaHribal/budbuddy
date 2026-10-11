<script setup lang="ts">
withDefaults(defineProps<{ label: string, viewBox?: string }>(), { viewBox: '0 0 320 200' })
</script>

<template>
  <svg
    class="guide-art"
    :viewBox="viewBox"
    role="img"
    :aria-label="label"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.8"
  >
    <slot />
  </svg>
</template>

<style>
.guide-art {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  font-family: var(--font-sans, 'Sora', sans-serif);
}

.guide-art text {
  stroke: none;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.guide-art .ga-glow {
  filter: drop-shadow(0 0 5px color-mix(in srgb, currentColor 50%, transparent));
}

.guide-art .ga-muted {
  fill: #8d9a8a;
}

.guide-art .ga-text {
  fill: #e9f3e4;
}
</style>
