<script setup lang="ts">
import type { L10n } from '~/guide'

defineProps<{ columns: { title: L10n, points: L10n[], glyph?: string }[] }>()
const { tr } = useGuide()
</script>

<template>
  <div class="compare card">
    <section
      v-for="(col, i) in columns"
      :key="i"
      class="col"
    >
      <h4 class="col-title">
        <span
          v-if="col.glyph"
          class="col-tile"
          aria-hidden="true"
        >
          <GrowIcon :name="col.glyph" />
        </span>
        {{ tr(col.title) }}
      </h4>
      <ul>
        <li
          v-for="(p, j) in col.points"
          :key="j"
        >
          {{ tr(p) }}
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.compare {
  padding: 0 14px;
}

.col {
  padding: 14px 0;
}

.col + .col {
  border-top: 1px solid var(--line);
}

.col-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.col-tile {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 20px;
}

ul {
  margin: 0;
  padding-left: 18px;
}

li {
  margin: 4px 0;
  padding-left: 2px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

li::marker {
  color: var(--text-3);
}
</style>
