<script setup lang="ts">
const value = defineModel<number>({ required: true })
const props = withDefaults(defineProps<{
  label: string
  min: number
  max: number
  step?: number
  display: string
  hint?: string
  tone?: 'green' | 'amber' | 'blue'
}>(), { step: 1, hint: undefined, tone: 'green' })

const id = useId()
const pct = computed(() => `${((value.value - props.min) / Math.max(1e-9, props.max - props.min)) * 100}%`)
</script>

<template>
  <div class="grange">
    <div class="head">
      <label
        :for="id"
        class="field-label"
      >{{ label }}</label>
      <output
        :for="id"
        class="val num"
      >{{ display }}</output>
    </div>
    <input
      :id="id"
      v-model.number="value"
      type="range"
      class="range"
      :class="tone"
      :min="min"
      :max="max"
      :step="step"
      :aria-valuetext="display"
      :style="{ '--pct': pct }"
    >
    <span
      v-if="hint"
      class="field-hint"
    >{{ hint }}</span>
  </div>
</template>

<style scoped>
.grange {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.val {
  font-size: 15px;
  font-weight: 600;
}

.range {
  --fill: var(--green);
  width: 100%;
  height: 44px;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
}

.range.amber {
  --fill: var(--amber);
}

.range.blue {
  --fill: var(--blue);
}

/* hard-stop fill: the part left of the thumb is the value */
.range::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--fill) var(--pct), var(--track) var(--pct));
}

.range::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  background: var(--track);
}

.range::-moz-range-progress {
  height: 6px;
  border-radius: 999px;
  background: var(--fill);
}

.range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  margin-top: -9px;
  border-radius: 50%;
  background: var(--fill);
  border: 3px solid var(--surface);
  transition: transform var(--dur-fast) var(--ease-out);
}

.range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--fill);
  border: 3px solid var(--surface);
}

.range:active::-webkit-slider-thumb {
  transform: scale(1.1);
}
</style>
