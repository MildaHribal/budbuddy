<script setup lang="ts">
import type { QuizQuestion } from '~/guide'

const props = defineProps<{ questions: QuizQuestion[], quizKey: string }>()
const emit = defineEmits<{ finished: [score: number, total: number] }>()
const { tr, quizBest, saveQuiz } = useGuide()
const { t } = useI18n()

const index = ref(0)
const picked = ref<number | null>(null)
const score = ref(0)
const answers = ref<boolean[]>([])
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
  const right = i === question.value.correct
  answers.value[index.value] = right
  if (right) score.value++
}

function next() {
  if (isLast.value) {
    finished.value = true
    saveQuiz(props.quizKey, score.value)
    emit('finished', score.value, total.value)
    return
  }
  index.value++
  picked.value = null
}

function retry() {
  index.value = 0
  picked.value = null
  score.value = 0
  answers.value = []
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
        <span
          class="quiz-tile"
          aria-hidden="true"
        >
          <GrowIcon name="spark" />
        </span>
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
          :class="answers[i] === true ? 'right' : answers[i] === false ? 'wrong' : i === index ? 'current' : undefined"
        />
      </div>
      <p class="q-count num">
        <span>{{ t('guide.quiz.question', { n: index + 1, total }) }}</span>
        <span
          v-if="index > 0 || picked !== null"
          class="so-far"
        >{{ t('guide.quiz.scoreSoFar', { score }) }}</span>
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
          <span
            class="opt-key num"
            aria-hidden="true"
          >{{ 'ABCDEF'[i] }}</span>
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
      <p
        class="score num"
        :class="{ low: score / total < 0.6 }"
      >
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
  padding: 14px;
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
  gap: 10px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.quiz-tile {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 20px;
}

.best {
  font-size: 12px;
  color: var(--text-3);
}

.quiz-body {
  animation: q-in var(--dur) var(--ease-out) both;
}

@keyframes q-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

.dots {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.dots i {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--track);
  transition: background var(--dur) ease;
}

.dots i.current {
  background: var(--line-strong);
}

.dots i.right {
  background: var(--green);
}

.dots i.wrong {
  background: var(--red);
}

.q-count {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.so-far {
  color: var(--text-2);
}

.q {
  margin: 4px 0 14px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 10px 12px;
  border-radius: var(--radius-control);
  border: 1px solid var(--line-strong);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  text-align: left;
  transition: background var(--dur) ease, border-color var(--dur) ease, color var(--dur) ease, opacity var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.option:active:not(:disabled) {
  transform: scale(0.98);
}

.option:disabled {
  cursor: default;
}

.option.right {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--green);
}

.option.wrong {
  background: var(--danger-soft);
  border-color: transparent;
  color: var(--red);
}

.option.dim {
  opacity: 0.5;
}

.opt-key {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--surface-3);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  transition: background var(--dur) ease, color var(--dur) ease;
}

.option.right .opt-key,
.option.wrong .opt-key {
  background: color-mix(in srgb, currentColor 14%, transparent);
  color: inherit;
}

.opt-text {
  flex: 1;
  min-width: 0;
}

.opt-mark {
  flex: none;
  font-size: 18px;
}

.feedback {
  margin-top: 12px;
  padding: 14px;
  border-radius: var(--radius-control);
  border: 1px solid var(--line);
  background: var(--surface-2);
  animation: q-in var(--dur) var(--ease-out) both;
}

.fb-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}

.feedback.right .fb-title {
  color: var(--green);
}

.feedback.wrong .fb-title {
  color: var(--red);
}

.feedback :deep(.guide-md) {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.fb-next {
  margin-top: 14px;
}

.result {
  text-align: center;
  animation: q-in var(--dur) var(--ease-out) both;
}

.score {
  margin: 4px 0 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--green);
}

.score.low {
  color: var(--text);
}

.score span {
  font-size: 18px;
  color: var(--text-3);
}

.result-label {
  margin: 8px 0 0;
  font-size: 15px;
  font-weight: 600;
}

.verdict {
  margin: 6px auto 16px;
  max-width: 36ch;
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
