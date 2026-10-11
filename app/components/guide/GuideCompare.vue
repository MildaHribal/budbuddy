<script setup lang="ts">
import type { L10n } from '~/guide'

defineProps<{ columns: { title: L10n, points: L10n[], glyph?: string }[] }>()
const { tr } = useGuide()
</script>

<template>
  <div
    class="compare"
    :class="{ wide: columns.length > 2 }"
  >
    <section
      v-for="(col, i) in columns"
      :key="i"
      class="col card"
    >
      <h4 class="col-title">
        <GrowIcon
          v-if="col.glyph"
          :name="col.glyph"
          class="col-glyph"
        />
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.compare.wide {
  grid-template-columns: 1fr;
}

.col {
  padding: 14px;
}

.col-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}

.col-glyph {
  font-size: 20px;
  color: var(--leaf);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  position: relative;
  padding-left: 14px;
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--leaf);
  opacity: 0.7;
}
</style>
