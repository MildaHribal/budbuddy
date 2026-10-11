<script setup lang="ts">
import type { Block } from '~/guide'

defineProps<{ block: Block, lessonId: string }>()
const { tr } = useGuide()
</script>

<template>
  <div
    class="guide-block"
    :class="`b-${block.type}`"
  >
    <GuideMarkdown
      v-if="block.type === 'text'"
      class="measure"
      :md="tr(block.md)"
    />
    <GuideCallout
      v-else-if="block.type === 'callout'"
      :tone="block.tone"
      :title="block.title"
      :md="block.md"
    />
    <GuideSteps
      v-else-if="block.type === 'steps'"
      :items="block.items"
    />
    <GuideCompare
      v-else-if="block.type === 'compare'"
      :columns="block.columns"
    />
    <GuideTable
      v-else-if="block.type === 'table'"
      :head="block.head"
      :rows="block.rows"
    />
    <GuideFigure
      v-else-if="block.type === 'figure'"
      :illustration="block.illustration"
      :photo="block.photo"
      :caption="block.caption"
      :credit="block.credit"
    />
    <GuideInteractive
      v-else-if="block.type === 'interactive'"
      :widget="block.widget"
      :props="block.props"
      :caption="block.caption"
    />
    <GuideQuiz
      v-else-if="block.type === 'quiz'"
      :questions="block.questions"
      :quiz-key="lessonId"
    />
    <GuideChecklist
      v-else-if="block.type === 'checklist'"
      :id="block.id"
      :items="block.items"
    />
  </div>
</template>

<style scoped>
.measure {
  max-width: 65ch;
}
</style>
