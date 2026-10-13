<script setup lang="ts">
import type { L10n } from '~/guide'

defineProps<{ items: { title: L10n, md: L10n }[] }>()
const { tr } = useGuide()
</script>

<template>
  <ol class="steps card">
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
  padding: 0 14px;
}

.step {
  display: flex;
  gap: 12px;
  padding: 14px 0;
}

.step + .step {
  border-top: 1px solid var(--line);
}

.step-n {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--surface-3);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.step-body {
  min-width: 0;
  flex: 1;
  padding-top: 5px;
}

.step-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.step :deep(.guide-md) {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}
</style>
