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
            <UIcon
              name="i-tabler-check"
              class="tick"
            />
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
  padding: 6px 6px 12px;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 10px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--text);
  font: inherit;
  font-size: 14px;
  line-height: 1.45;
  text-align: left;
}

.check:active {
  background: var(--surface-2);
}

.box {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-top: -1px;
  border-radius: 7px;
  background: #0b0d10;
  box-shadow: inset 0 0 0 1px var(--line-strong);
  transition: background var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
}

.tick {
  font-size: 15px;
  color: var(--on-accent);
  opacity: 0;
  transform: scale(0.5);
  transition: opacity var(--dur-fast) ease, transform var(--dur) var(--ease-out);
}

.check[aria-checked="true"] .box {
  background: var(--leaf);
  box-shadow: 0 0 10px rgba(155, 227, 107, 0.35);
}

.check[aria-checked="true"] .tick {
  opacity: 1;
  transform: none;
}

.check[aria-checked="true"] .label {
  color: var(--text-2);
}

.meta {
  margin: 4px 10px 0;
  font-size: 12px;
  color: var(--text-3);
}
</style>
