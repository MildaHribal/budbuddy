<script setup lang="ts">
import type { L10n } from '~/guide'

defineProps<{ head: L10n[], rows: L10n[][] }>()
const { tr } = useGuide()
</script>

<template>
  <div class="table-wrap card">
    <table>
      <thead>
        <tr>
          <th
            v-for="(h, i) in head"
            :key="i"
            scope="col"
          >
            {{ tr(h) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in rows"
          :key="i"
        >
          <component
            :is="j === 0 ? 'th' : 'td'"
            v-for="(cell, j) in row"
            :key="j"
            :scope="j === 0 ? 'row' : undefined"
          >
            {{ tr(cell) }}
          </component>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
  scrollbar-width: none;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

th,
td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  line-height: 1.4;
}

thead th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  border-bottom: 1px solid var(--line-strong);
  white-space: nowrap;
}

tbody th {
  font-weight: 600;
  color: var(--text);
}

tbody td {
  color: var(--text-2);
}

tbody tr + tr > * {
  border-top: 1px solid var(--line);
}
</style>
