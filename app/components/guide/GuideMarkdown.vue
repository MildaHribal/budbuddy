<script setup lang="ts">
import { renderGuideMarkdown } from '~/guide/markdown'

const props = defineProps<{ md: string }>()
const html = computed(() => renderGuideMarkdown(props.md))
const router = useRouter()

function onClick(e: MouseEvent) {
  const a = (e.target as HTMLElement | null)?.closest('a[data-internal]')
  if (!a) return
  e.preventDefault()
  router.push(a.getAttribute('href') ?? '/guide')
}
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- escaped, only our own tags -->
  <div
    class="guide-md"
    @click="onClick"
    v-html="html"
  />
</template>

<style scoped>
.guide-md {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text);
}

.guide-md :deep(p) {
  margin: 0 0 12px;
}

.guide-md :deep(> :last-child) {
  margin-bottom: 0;
}

.guide-md :deep(h4) {
  margin: 20px 0 8px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.guide-md :deep(ul),
.guide-md :deep(ol) {
  margin: 0 0 12px;
  padding-left: 22px;
}

.guide-md :deep(li) {
  margin: 4px 0;
  padding-left: 2px;
}

.guide-md :deep(li::marker) {
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.guide-md :deep(strong) {
  font-weight: 600;
  color: var(--text);
}

.guide-md :deep(a) {
  color: var(--green);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--accent-line);
  text-underline-offset: 3px;
}
</style>
