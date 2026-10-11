<script setup lang="ts">
import type { L10n } from '~/guide'

defineProps<{ items: { title: L10n, md: L10n }[] }>()
const { tr } = useGuide()
</script>

<template>
  <ol class="steps">
    <li
      v-for="(step, i) in items"
      :key="i"
      class="step"
    >
      <span
        class="step-n num"
        aria-hidden="true"
      >{{ i + 1 }}</span>
      <div class="step-body">
        <p class="step-title">
          {{ tr(step.title) }}
        </p>
        <GuideMarkdown :md="tr(step.md)" />
      </div>
    </li>
  </ol>
</template>

<style scoped>
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
}

.step {
  position: relative;
  display: flex;
  gap: 14px;
  padding-bottom: 18px;
}

.step:last-child {
  padding-bottom: 0;
}

.step:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 15px;
  top: 34px;
  bottom: 4px;
  width: 1px;
  background: linear-gradient(180deg, var(--accent-line), var(--line));
}

.step-n {
  flex: none;
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--accent-line);
  color: var(--leaf);
  font-size: 14px;
  font-weight: 500;
  box-shadow: inset 0 1px 0 var(--highlight);
}

.step-body {
  min-width: 0;
  flex: 1;
  padding-top: 4px;
}

.step-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.step :deep(.guide-md) {
  font-size: 14px;
  color: var(--text-2);
}
</style>
