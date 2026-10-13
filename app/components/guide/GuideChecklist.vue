<script setup lang="ts">
import type { L10n } from '~/guide'

const props = defineProps<{ id: string, items: L10n[] }>()
const { tr, checked, toggleCheck } = useGuide()
const { t } = useI18n()
const ticks = computed(() => new Set(checked(props.id)))
const count = computed(() => props.items.filter((_, i) => ticks.value.has(i)).length)
</script>

<template>
  <div class="checklist card">
    <ul>
      <li
        v-for="(item, i) in items"
        :key="i"
      >
        <button
          type="button"
          class="check"
          role="checkbox"
          :aria-checked="ticks.has(i)"
          @click="toggleCheck(id, i)"
        >
          <span
            class="box"
            aria-hidden="true"
          >
            <svg viewBox="0 0 12 12">
              <path d="M2.5 6.5l2.5 2.5 4.5-5" />
            </svg>
          </span>
          <span class="label">{{ tr(item) }}</span>
        </button>
      </li>
    </ul>
    <p class="meta num">
      {{ t('guide.checklist.progress', { done: count, total: items.length }) }}
    </p>
  </div>
</template>

<style scoped>
.checklist {
  padding: 0 14px;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

li + li {
  border-top: 1px solid var(--line);
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 14px 0;
  border: 0;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: 15px;
  line-height: 1.45;
  text-align: left;
}

.box {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid var(--line-strong);
  transition: background var(--dur) ease, border-color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.box svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--on-accent);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transition: opacity var(--dur-fast) ease;
}

.check:active .box {
  transform: scale(0.9);
}

.check[aria-checked="true"] .box {
  background: var(--green);
  border-color: var(--green);
}

.check[aria-checked="true"] .box svg {
  opacity: 1;
}

.check[aria-checked="true"] .label {
  color: var(--text-3);
}

.meta {
  margin: 0;
  padding: 10px 0 12px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--text-3);
}
</style>
