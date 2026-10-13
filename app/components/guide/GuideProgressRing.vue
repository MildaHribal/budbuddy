<script setup lang="ts">
const props = withDefaults(defineProps<{ value: number, size?: number, stroke?: number, label?: string }>(), { size: 132, stroke: 9, label: undefined })

const drawn = ref(false)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => (drawn.value = true))))

const R = computed(() => 50 - props.stroke / 2 - 4)
const C = computed(() => 2 * Math.PI * R.value)
const len = computed(() => (drawn.value ? Math.max(0, Math.min(1, props.value)) * C.value : 0))
</script>

<template>
  <div
    class="gp-ring"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label"
  >
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <g
        transform="rotate(-90 50 50)"
        fill="none"
        stroke-linecap="round"
      >
        <circle
          cx="50"
          cy="50"
          :r="R"
          stroke="var(--track)"
          :stroke-width="stroke"
        />
        <circle
          v-if="value > 0"
          class="arc"
          cx="50"
          cy="50"
          :r="R"
          stroke="var(--green)"
          :stroke-width="stroke"
          :stroke-dasharray="`${len} ${C}`"
        />
      </g>
    </svg>
    <div class="center">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.gp-ring {
  position: relative;
  flex: none;
}

svg {
  width: 100%;
  height: 100%;
}

.arc {
  transition: stroke-dasharray var(--dur-slow) var(--ease-out);
}

.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
</style>
