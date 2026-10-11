<script setup lang="ts">
import type { QuizQuestion } from '~/guide'

const props = defineProps<{ questions: QuizQuestion[], quizKey: string }>()
const { tr, quizBest, saveQuiz } = useGuide()
const { t } = useI18n()

const index = ref(0)
const picked = ref<number | null>(null)
const score = ref(0)
const finished = ref(false)

const total = computed(() => props.questions.length)
const question = computed(() => props.questions[index.value])
const best = computed(() => quizBest(props.quizKey))
const isLast = computed(() => index.value >= total.value - 1)
const verdict = computed(() => {
  const r = total.value ? score.value / total.value : 0
  if (r === 1) return t('guide.quiz.perfect')
  if (r >= 0.6) return t('guide.quiz.good')
  return t('guide.quiz.retryHint')
})

function pick(i: number) {
  if (picked.value !== null || !question.value) return
  picked.value = i
  if (i === question.value.correct) score.value++
}

function next() {
  if (isLast.value) {
    finished.value = true
    saveQuiz(props.quizKey, score.value)
    return
  }
  index.value++
  picked.value = null
}

function retry() {
  index.value = 0
  picked.value = null
  score.value = 0
  finished.value = false
}

const optionState = (i: number) => {
  if (picked.value === null || !question.value) return undefined
  if (i === question.value.correct) return 'right'
  if (i === picked.value) return 'wrong'
  return 'dim'
}
</script>

<template>
  <section
    class="quiz card"
    :aria-label="t('guide.quiz.title')"
  >
    <header class="quiz-head">
      <h3>
        <GrowIcon
          name="spark"
          class="quiz-glyph"
        />
        {{ t('guide.quiz.title') }}
      </h3>
      <span
        v-if="best !== null"
        class="best num"
      >{{ t('guide.quiz.best', { score: best, total }) }}</span>
    </header>

    <div
      v-if="!finished && question"
      :key="question.id"
      class="quiz-body"
    >
      <div
        class="dots"
        aria-hidden="true"
      >
        <i
          v-for="(_, i) in questions"
          :key="i"
          :class="{ on: i <= index }"
        />
      </div>
      <p class="q-count num">
        {{ t('guide.quiz.question', { n: index + 1, total }) }}
      </p>
      <p class="q">
        {{ tr(question.q) }}
      </p>
      <div class="options">
        <button
          v-for="(opt, i) in question.options"
          :key="i"
          type="button"
          class="option"
          :class="optionState(i)"
          :disabled="picked !== null"
          :aria-pressed="picked === i"
          @click="pick(i)"
        >
          <span class="opt-text">{{ tr(opt) }}</span>
          <UIcon
            v-if="optionState(i) === 'right'"
            name="i-tabler-check"
            class="opt-mark"
          />
          <UIcon
            v-else-if="optionState(i) === 'wrong'"
            name="i-tabler-x"
            class="opt-mark"
          />
        </button>
      </div>
      <div
        class="feedback-slot"
        aria-live="polite"
      >
        <div
          v-if="picked !== null"
          class="feedback"
          :class="picked === question.correct ? 'right' : 'wrong'"
        >
          <p class="fb-title">
            {{ picked === question.correct ? t('guide.quiz.correct') : t('guide.quiz.wrong') }}
          </p>
          <GuideMarkdown :md="tr(question.explain)" />
          <button
            type="button"
            class="btn btn-primary btn-block fb-next"
            @click="next"
          >
            {{ isLast ? t('guide.quiz.finish') : t('guide.quiz.next') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-else-if="finished"
      class="result"
      aria-live="polite"
    >
      <p class="score num">
        {{ score }}<span>/{{ total }}</span>
      </p>
      <p class="result-label">
        {{ t('guide.quiz.result', { score, total }) }}
      </p>
      <p class="verdict">
        {{ verdict }}
      </p>
      <button
        type="button"
        class="btn btn-soft btn-block"
        @click="retry"
      >
        <UIcon name="i-tabler-refresh" />
        {{ t('guide.quiz.retry') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.quiz {
  padding: 18px 16px 16px;
}

.quiz-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.quiz-glyph {
  font-size: 20px;
  color: var(--lamp);
}

.best {
  font-size: 12px;
  color: var(--text-3);
}

.quiz-body {
  animation: q-in var(--dur-slow) var(--ease-out) both;
}

@keyframes q-in {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
}

.dots {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.dots i {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: var(--surface-3);
  transition: background var(--dur) ease;
}

.dots i.on {
  background: var(--leaf);
}

.q-count {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.q {
  margin: 4px 0 14px;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.45;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
  transition: background var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), opacity var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.option:active:not(:disabled) {
  transform: scale(0.98);
}

.option:disabled {
  cursor: default;
}

.option.right {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--leaf);
}

.option.wrong {
  background: var(--danger-soft);
  border-color: color-mix(in srgb, var(--danger) 40%, transparent);
  color: #ffb3ba;
}

.option.dim {
  opacity: 0.55;
}

.opt-mark {
  flex: none;
  font-size: 18px;
}

.feedback {
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  background: #0b0d10;
  box-shadow: inset 0 0 0 1px var(--line);
  animation: q-in var(--dur) var(--ease-out) both;
}

.fb-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
}

.feedback.right .fb-title {
  color: var(--leaf);
}

.feedback.wrong .fb-title {
  color: #ffb3ba;
}

.feedback :deep(.guide-md) {
  font-size: 14px;
  color: var(--text-2);
}

.fb-next {
  margin-top: 14px;
}

.result {
  text-align: center;
  animation: q-in var(--dur-slow) var(--ease-out) both;
}

.score {
  margin: 4px 0 0;
  font-size: 48px;
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--leaf);
}

.score span {
  font-size: 24px;
  color: var(--text-3);
}

.result-label {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 600;
}

.verdict {
  margin: 6px auto 16px;
  max-width: 32ch;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

@media (prefers-reduced-motion: reduce) {
  .quiz-body,
  .feedback,
  .result {
    animation: none;
  }
}
</style>
