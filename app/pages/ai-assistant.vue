<script setup lang="ts">
import type { DiagHit } from '~/ai/diagnose'
import { renderMarkdown } from '~/ai/markdown'
import { DIAG_RELIABLE, evidenceLabel, kbKindLabel } from '~/ai/prompt'
import { AI_REPORT_REASONS, sendAiReport, type AiReportReason } from '~/ai/report'
import type { GuideLink } from '~/ai/guideLinks'
import { getLesson } from '~/guide'
import { GENERAL_THREAD, type AssistantMessage } from '~/composables/useAssistant'
import { locale } from '~/utils/locale'
import type { Plant } from '~/types/grow'

const route = useRoute()
const config = useRuntimeConfig()
const grow = useGrow()
const assistant = useAssistant()
const ai = useAiSettings()
const { notify } = useNotify()
const { t } = useI18n()
useHead({ title: () => t('ai.page.title') })
const { confirm } = useConfirm()

const { busy, classifierState, kbState } = assistant

// ── Plant / conversation ──────────────────────────────────────────
const threadKey = ref<string>(GENERAL_THREAD)

const plants = computed(() => {
  const list = grow.state.plants.filter(p => !p.archived || p.id === threadKey.value)
  // growing plants first, then the rest
  return [...list].sort((a, b) => Number(isGrowing(b)) - Number(isGrowing(a)))
})
const plant = computed<Plant | undefined>(() => (threadKey.value === GENERAL_THREAD ? undefined : grow.getPlant(threadKey.value)))
const messages = computed<AssistantMessage[]>(() => assistant.threads[threadKey.value] ?? [])

/** The plant the grower most recently worked with. */
function mostRecentPlant(): string | null {
  const growing = grow.state.plants.filter(isGrowing)
  let best: { id: string, at: string } | null = null
  for (const p of growing) {
    const at = [p.updatedAt, grow.lastEntryOf(p.id, ['water', 'feed', 'train', 'pest', 'measure', 'note', 'photo'])?.createdAt ?? ''].sort().pop() ?? ''
    if (!best || at > best.at) best = { id: p.id, at }
  }
  return best?.id ?? null
}

function pickInitialThread() {
  const fromQuery = typeof route.query.plant === 'string' ? route.query.plant : null
  const last = assistant.lastThread.value
  const valid = (key: string | null): key is string => !!key && (key === GENERAL_THREAD || !!grow.getPlant(key))
  threadKey.value = [fromQuery, last, mostRecentPlant()].find(valid) ?? GENERAL_THREAD
}

function selectThread(key: string) {
  if (busy.value) return
  threadKey.value = key
  assistant.selectThread(key)
  if (messages.value.length) scrollToEnd(false)
  else scroller()?.scrollTo({ top: 0 })
}

async function newConversation() {
  if (!messages.value.length) return
  const ok = await confirm({
    title: t('ai.page.confirmTitle'),
    message: plant.value ? t('ai.page.confirmPlant', { name: plant.value.name }) : t('ai.page.confirmGeneral'),
    confirmLabel: t('ai.page.newChat'),
    danger: true
  })
  if (ok) assistant.clearThread(threadKey.value)
}

const plantSummary = computed(() => {
  const p = plant.value
  if (!p) return null
  const progress = stageProgress(p)
  return t('ai.page.subtitlePlant', { name: p.name, stage: stageInfo(p.stage).label, day: progress.dayInStage, age: progress.age })
})

// ── Quick questions ───────────────────────────────────────────────
const quickQuestions = computed(() => {
  const p = plant.value
  if (!p) {
    return [
      { icon: 'i-tabler-droplet', text: t('ai.quick.general.ph') },
      { icon: 'i-tabler-leaf-off', text: t('ai.quick.general.nitrogen') },
      { icon: 'i-tabler-bug', text: t('ai.quick.general.mites') },
      { icon: 'i-tabler-bulb', text: t('ai.quick.general.led') }
    ]
  }
  const list = [{ icon: 'i-tabler-checklist', text: t('ai.quick.plant.now') }]
  if (p.stage === 'flowering') list.push({ icon: 'i-tabler-basket', text: t('ai.quick.plant.harvest') })
  else if (p.stage === 'vegetative') list.push({ icon: 'i-tabler-scissors', text: t('ai.quick.plant.training') })
  else if (p.stage === 'drying' || p.stage === 'curing') list.push({ icon: 'i-tabler-bottle', text: t('ai.quick.plant.drying') })
  else list.push({ icon: 'i-tabler-seeding', text: t('ai.quick.plant.feeding') })
  list.push(
    { icon: 'i-tabler-droplet', text: t('ai.quick.plant.watering') },
    { icon: 'i-tabler-leaf-off', text: t('ai.quick.plant.yellow') }
  )
  return list
})

// ── Composer ──────────────────────────────────────────────────────
const input = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)
const photo = shallowRef<File | null>(null)
const photoPreview = ref<string | null>(null)

watch(photo, (file, _old, onCleanup) => {
  photoPreview.value = file ? URL.createObjectURL(file) : null
  const url = photoPreview.value
  onCleanup(() => {
    if (url) URL.revokeObjectURL(url)
  })
})

const canSend = computed(() => !busy.value && (input.value.trim().length > 0 || !!photo.value))

function autosize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`
}

const attachMenu = ref(false)
useBackHandler(attachMenu, () => {
  attachMenu.value = false
})

async function attachPhoto(source: 'camera' | 'gallery') {
  attachMenu.value = false
  const file = await pickImage(source === 'camera' ? 'environment' : undefined)
  if (file) photo.value = file
}

async function send(text = input.value) {
  if (busy.value) return
  const question = text.trim()
  if (!question && !photo.value) return
  const file = photo.value
  input.value = ''
  photo.value = null
  await nextTick()
  autosize()
  scrollToEnd()
  await assistant.ask({ threadKey: threadKey.value, question, file })
}

function onKeydown(e: KeyboardEvent) {
  // Enter sends on desktop; on touch keyboards Enter makes a new line.
  if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer: coarse)').matches) {
    e.preventDefault()
    send()
  }
}

// ── Scrolling ─────────────────────────────────────────────────────
const bottom = ref<HTMLElement | null>(null)

function scroller(): HTMLElement | null {
  return bottom.value?.closest<HTMLElement>('.app-scroll') ?? null
}

// wait for the keyboard to slide in before scrolling
function onComposerFocus() {
  setTimeout(() => scrollToEnd(false), 350)
}

function scrollToEnd(smooth = true) {
  nextTick(() => {
    const el = scroller()
    el?.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}

// Follow a streaming answer, unless the grower scrolled up to read.
const streamed = computed(() => messages.value[messages.value.length - 1]?.text.length ?? 0)
watch(streamed, () => {
  const el = scroller()
  if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) scrollToEnd(false)
})
watch(() => messages.value.length, () => scrollToEnd())

// ── Message helpers ───────────────────────────────────────────────
const rendered = (text: string) => renderMarkdown(text)

/** Sources the answer cites come first; the rest are what was searched but not used. */
function citedSet(m: AssistantMessage): Set<number> {
  const set = new Set<number>()
  for (const match of m.text.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    for (const n of (match[1] ?? '').split(/\s*,\s*/)) set.add(Number(n))
  }
  return set
}

const openSources = reactive(new Set<string>())
const allSources = reactive(new Set<string>())
const citedSources = (m: AssistantMessage) => (m.sources ?? []).filter(s => citedSet(m).has(s.n))
const shownSources = (m: AssistantMessage) => (allSources.has(m.id) || !citedSources(m).length ? m.sources ?? [] : citedSources(m))
const isLast = (m: AssistantMessage) => m === messages.value[messages.value.length - 1]
const highlighted = ref<string | null>(null)

function toggleSources(id: string) {
  if (openSources.has(id)) openSources.delete(id)
  else openSources.add(id)
}

function onAnswerClick(e: MouseEvent, m: AssistantMessage) {
  const cite = (e.target as HTMLElement).closest<HTMLElement>('.cite')
  if (!cite) return
  const n = cite.dataset.cite
  if (!n || !m.sources?.some(s => String(s.n) === n)) return
  openSources.add(m.id)
  highlighted.value = `${m.id}-${n}`
  nextTick(() => document.getElementById(`src-${m.id}-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  setTimeout(() => {
    if (highlighted.value === `${m.id}-${n}`) highlighted.value = null
  }, 1800)
}

async function copy(m: AssistantMessage) {
  try {
    await navigator.clipboard.writeText(m.text)
    notify(t('ai.page.copied'))
  } catch {
    notify(t('ai.page.copyFailed'), { tone: 'error' })
  }
}

const EVIDENCE_TONE: Record<DiagHit['evidence'], string> = {
  'tested': 'var(--accent)',
  'weak': 'var(--warning)',
  'transfer-only': 'var(--text-3)'
}

const guideChip = (g: GuideLink) => {
  const ref = getLesson(g.lesson)
  return ref ? { to: `/guide/${ref.chapter.id}#${ref.lesson.id}`, label: ref.lesson.title[locale.value] || ref.lesson.title.en } : null
}
const guideChips = (m: AssistantMessage) => (m.guide ?? []).map(guideChip).filter(x => !!x)
const lowConfidence = (m: AssistantMessage) => (m.diag?.[0]?.p ?? 0) < DIAG_RELIABLE

// ── Report an answer ──────────────────────────────────────────────
const reportFor = ref<AssistantMessage | null>(null)
const reportOpen = computed({
  get: () => !!reportFor.value,
  set: (v) => {
    if (!v) reportFor.value = null
  }
})
const reportReason = ref<AiReportReason | null>(null)
const reportNote = ref('')
const reportBusy = ref(false)

function openReport(m: AssistantMessage) {
  reportReason.value = null
  reportNote.value = ''
  reportFor.value = m
}

async function submitReport() {
  const m = reportFor.value
  if (!m || !reportReason.value || reportBusy.value) return
  const list = messages.value
  const i = list.indexOf(m)
  const asked = list.slice(0, i).findLast(x => x.role === 'user')
  reportBusy.value = true
  try {
    const result = await sendAiReport({
      messageId: m.id,
      reason: reportReason.value,
      note: reportNote.value,
      question: asked?.text ?? '',
      answer: m.text,
      model: m.model,
      lang: locale.value,
      hadPhoto: !!asked?.thumb,
      appVersion: String(config.public.version ?? '')
    }, { chatUrl: String(config.public.aiProxyUrl), token: config.public.aiAppToken ? String(config.public.aiAppToken) : undefined })
    assistant.markReported(threadKey.value, m.id)
    reportFor.value = null
    notify(t(result === 'already' ? 'ai.report.already' : 'ai.report.sent'), { tone: 'success' })
  } catch {
    notify(t('ai.report.failed'), { tone: 'error' })
  } finally {
    reportBusy.value = false
  }
}

// ── Status notices ────────────────────────────────────────────────
const offlineNotice = computed(() => {
  const settled = (s: string) => s === 'ready' || s === 'missing'
  if (!settled(classifierState.value) || !settled(kbState.value)) return null
  const missing: string[] = []
  if (classifierState.value === 'missing') missing.push(t('ai.notice.classifier'))
  if (kbState.value === 'missing') missing.push(t('ai.notice.kb'))
  if (!missing.length) return null
  const what = missing.join(t('ai.notice.and'))
  return t('ai.notice.missing', { n: missing.length, what: `${what.charAt(0).toUpperCase()}${what.slice(1)}`, provider: ai.provider.value.label })
})

onMounted(async () => {
  assistant.initOffline(config.app.baseURL)
  await assistant.ready()
  pickInitialThread()
  if (messages.value.length) scrollToEnd(false)
})
</script>

<template>
  <div class="assistant">
    <AppHeader
      :title="t('ai.page.title')"
      :subtitle="plantSummary ?? t('ai.page.subtitleGeneral')"
    >
      <template #actions>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('ai.page.newChat')"
          :title="t('ai.page.newChat')"
          :disabled="!messages.length || busy"
          @click="newConversation"
        >
          <UIcon
            name="i-tabler-message-plus"
            class="size-5"
          />
        </button>
        <NuxtLink
          to="/settings#ai"
          class="icon-btn"
          :aria-label="t('ai.page.settings')"
        >
          <UIcon
            name="i-tabler-settings"
            class="size-5"
          />
        </NuxtLink>
      </template>
    </AppHeader>

    <div
      class="plant-bar chips"
      role="tablist"
      :aria-label="t('ai.page.conversations')"
    >
      <button
        type="button"
        class="chip"
        role="tab"
        :aria-selected="threadKey === GENERAL_THREAD"
        :class="{ active: threadKey === GENERAL_THREAD }"
        :disabled="busy"
        @click="selectThread(GENERAL_THREAD)"
      >
        <UIcon
          name="i-tabler-messages"
          class="size-4"
        />
        {{ t('ai.page.general') }}
      </button>
      <button
        v-for="p in plants"
        :key="p.id"
        type="button"
        class="chip"
        role="tab"
        :aria-selected="threadKey === p.id"
        :class="{ active: threadKey === p.id }"
        :disabled="busy"
        @click="selectThread(p.id)"
      >
        <GrowIcon
          :name="stageInfo(p.stage).glyph"
          class="chip-glyph"
          :style="{ color: stageInfo(p.stage).color }"
        />
        {{ p.name }}
      </button>
    </div>

    <div class="chat">
      <p
        v-if="offlineNotice"
        class="offline-note"
      >
        <UIcon
          name="i-tabler-cloud-off"
          class="size-4 shrink-0"
        />
        {{ offlineNotice }}
      </p>
      <div
        v-if="!messages.length"
        class="welcome"
      >
        <GrowIcon
          name="spark"
          class="welcome-mark"
          draw
          glow
        />
        <h2>{{ plant ? t('ai.page.welcomePlant', { name: plant.name }) : t('ai.page.welcome') }}</h2>
        <p>
          <template v-if="plant">
            {{ t('ai.page.introPlant') }}
          </template>
          <template v-else>
            {{ t('ai.page.introGeneral') }}
          </template>
        </p>
        <div class="quick rise">
          <button
            v-for="q in quickQuestions"
            :key="q.text"
            type="button"
            class="quick-btn"
            :disabled="busy"
            @click="send(q.text)"
          >
            <UIcon
              :name="q.icon"
              class="size-[18px]"
            />
            <span>{{ q.text }}</span>
            <UIcon
              name="i-tabler-arrow-up-right"
              class="size-4 quick-go"
            />
          </button>
        </div>
      </div>

      <div
        v-else
        class="messages"
      >
        <div
          v-for="m in messages"
          :key="m.id"
          class="msg"
          :class="m.role === 'user' ? 'msg-user' : 'msg-bot'"
        >
          <template v-if="m.role === 'user'">
            <div class="bubble user-bubble">
              <img
                v-if="m.thumb"
                :src="m.thumb"
                :alt="t('ai.page.photoAlt')"
                class="thumb"
              >
              <p
                v-if="m.text"
                class="user-text"
              >
                {{ m.text }}
              </p>
              <span class="meta">{{ formatTime(m.createdAt) }}</span>
            </div>
          </template>

          <template v-else>
            <span
              class="avatar"
              :class="{ thinking: m.pending }"
              aria-hidden="true"
            >
              <GrowIcon
                name="spark"
                glow
              />
            </span>
            <div class="bubble bot-bubble">
              <div
                v-if="m.diag?.length"
                class="diag"
              >
                <div class="diag-head">
                  <GrowIcon name="photo" />
                  {{ t('ai.page.diagTitle') }}
                </div>
                <div
                  v-for="d in m.diag"
                  :key="d.cls"
                  class="diag-row"
                >
                  <div class="diag-line">
                    <span class="diag-label">{{ d.label }}</span>
                    <span class="diag-p">{{ d.p < 0.005 ? '<1' : Math.round(d.p * 100) }} %</span>
                  </div>
                  <div class="progress">
                    <div :style="{ width: `${Math.round(d.p * 100)}%`, background: EVIDENCE_TONE[d.evidence] }" />
                  </div>
                  <span
                    class="badge"
                    :style="{ color: EVIDENCE_TONE[d.evidence] }"
                    :title="evidenceLabel(d.evidence)"
                  >{{ t(`ai.evidenceShort.${d.evidence}`) }}</span>
                </div>
                <p
                  v-if="lowConfidence(m)"
                  class="diag-note"
                >
                  {{ t('ai.page.diagUnsure') }}
                </p>
                <p
                  v-if="m.unsupported?.length"
                  class="diag-note"
                >
                  {{ t('ai.page.unsupported', { list: m.unsupported.join(', ') }) }}
                </p>
              </div>

              <div
                v-if="m.pending && !m.text"
                class="pending"
                role="status"
              >
                <span class="dots"><span /><span /><span /></span>
                <span>{{ m.status }}</span>
              </div>

              <!-- renderMarkdown escapes all input and only emits its own tags -->
              <!-- eslint-disable vue/no-v-html -->
              <div
                v-if="m.text"
                class="md"
                :class="{ streaming: m.pending }"
                @click="onAnswerClick($event, m)"
                v-html="rendered(m.text)"
              />
              <!-- eslint-enable vue/no-v-html -->

              <div
                v-if="m.error"
                class="error"
                role="alert"
              >
                <UIcon
                  name="i-tabler-alert-triangle"
                  class="size-5 shrink-0"
                />
                <div>
                  <p>{{ m.error }}</p>
                  <div class="error-actions">
                    <button
                      v-if="m === messages[messages.length - 1] && assistant.canRetry(threadKey)"
                      type="button"
                      class="btn btn-soft btn-sm"
                      :disabled="busy"
                      @click="assistant.retry(threadKey)"
                    >
                      <UIcon
                        name="i-tabler-refresh"
                        class="size-4"
                      />
                      {{ t('ai.page.retry') }}
                    </button>
                  </div>
                </div>
              </div>

              <div
                v-if="m.fallback?.length"
                class="fallback"
              >
                <div class="fallback-head">
                  <UIcon
                    name="i-tabler-books"
                    class="size-4"
                  />
                  {{ t('ai.page.fallbackTitle') }}
                </div>
                <p
                  v-if="m.fallback.some(f => f.lang !== locale)"
                  class="fallback-note"
                >
                  {{ t('ai.page.fallbackLang') }}
                </p>
                <article
                  v-for="(f, i) in m.fallback"
                  :key="i"
                  class="fallback-card"
                >
                  <strong>{{ f.title }}</strong>
                  <p>{{ f.text }}</p>
                </article>
              </div>

              <div
                v-if="m.sources?.length && !m.pending && !m.fallback?.length"
                class="sources"
              >
                <button
                  type="button"
                  class="sources-toggle"
                  :aria-expanded="openSources.has(m.id)"
                  @click="toggleSources(m.id)"
                >
                  <UIcon
                    name="i-tabler-books"
                    class="size-4"
                  />
                  {{ citedSources(m).length ? t('ai.page.sources', { n: citedSources(m).length }) : t('ai.page.allSources', { n: m.sources.length }) }}
                  <UIcon
                    name="i-tabler-chevron-down"
                    class="size-4 chev"
                    :class="{ open: openSources.has(m.id) }"
                  />
                </button>
                <ol
                  v-if="openSources.has(m.id)"
                  class="sources-list"
                >
                  <li
                    v-for="s in shownSources(m)"
                    :id="`src-${m.id}-${s.n}`"
                    :key="s.n"
                    :class="{ unused: citedSet(m).size && !citedSet(m).has(s.n), flash: highlighted === `${m.id}-${s.n}` }"
                  >
                    <span class="src-n">{{ s.n }}</span>
                    <div class="src-body">
                      <a
                        v-if="s.url"
                        :href="s.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="src-title"
                      >{{ s.title }}</a>
                      <strong
                        v-else
                        class="src-title"
                      >{{ s.title }}</strong>
                      <span class="src-kind">{{ kbKindLabel(s.kind) }}<template v-if="citedSet(m).size && !citedSet(m).has(s.n)">{{ t('ai.page.unused') }}</template></span>
                      <span class="src-snippet">{{ s.snippet }}</span>
                    </div>
                  </li>
                  <li
                    v-if="citedSources(m).length && citedSources(m).length < m.sources.length"
                    class="sources-more"
                  >
                    <button
                      type="button"
                      class="link"
                      @click="allSources.has(m.id) ? allSources.delete(m.id) : allSources.add(m.id)"
                    >
                      {{ allSources.has(m.id) ? t('ai.page.citedSources') : t('ai.page.allSources', { n: m.sources.length }) }}
                    </button>
                  </li>
                </ol>
              </div>

              <nav
                v-if="!m.pending && guideChips(m).length"
                class="guide-chips"
                :aria-label="t('ai.page.guideLinks')"
              >
                <NuxtLink
                  v-for="g in guideChips(m)"
                  :key="g!.to"
                  :to="g!.to"
                  class="chip guide-chip"
                >
                  <GrowIcon
                    name="guide"
                    class="chip-glyph"
                  />
                  {{ g!.label }}
                </NuxtLink>
              </nav>

              <div
                v-if="isLast(m) && !m.pending && (m.replies?.length || m.askPhoto)"
                class="reply-chips"
              >
                <button
                  v-if="m.askPhoto"
                  type="button"
                  class="chip active"
                  :disabled="busy"
                  @click="attachMenu = true"
                >
                  <UIcon
                    name="i-tabler-camera-plus"
                    class="size-4"
                  />
                  {{ t('ai.page.attachPhoto') }}
                </button>
                <button
                  v-for="r in m.replies"
                  :key="r"
                  type="button"
                  class="chip"
                  :disabled="busy"
                  @click="send(r)"
                >
                  {{ r }}
                </button>
              </div>

              <div
                v-if="!m.pending && m.text"
                class="bot-meta"
              >
                <span class="meta">{{ formatTime(m.createdAt) }}<template v-if="m.model"> · {{ m.model }}</template></span>
                <button
                  type="button"
                  class="meta-btn"
                  :aria-label="t('ai.page.copy')"
                  @click="copy(m)"
                >
                  <UIcon
                    name="i-tabler-copy"
                    class="size-4"
                  />
                </button>
                <button
                  type="button"
                  class="meta-btn"
                  :aria-label="m.reported ? t('ai.report.done') : t('ai.report.action')"
                  :title="m.reported ? t('ai.report.done') : t('ai.report.action')"
                  :disabled="m.reported"
                  @click="openReport(m)"
                >
                  <UIcon
                    :name="m.reported ? 'i-tabler-flag-check' : 'i-tabler-flag'"
                    class="size-4"
                  />
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div ref="bottom" />
    </div>

    <div class="composer">
      <div
        v-if="attachMenu"
        class="attach-scrim"
        @click="attachMenu = false"
      />
      <div
        v-if="attachMenu"
        class="attach-menu"
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          @click="attachPhoto('camera')"
        >
          <UIcon
            name="i-tabler-camera"
            class="size-5"
          />
          {{ t('ai.page.takePhoto') }}
        </button>
        <button
          type="button"
          role="menuitem"
          @click="attachPhoto('gallery')"
        >
          <UIcon
            name="i-tabler-photo"
            class="size-5"
          />
          {{ t('ai.page.fromGallery') }}
        </button>
      </div>
      <div
        v-if="photoPreview"
        class="preview"
      >
        <img
          :src="photoPreview"
          :alt="t('ai.page.selectedPhoto')"
        >
        <button
          type="button"
          class="preview-remove"
          :aria-label="t('ai.page.removePhoto')"
          @click="photo = null"
        >
          <UIcon
            name="i-tabler-x"
            class="size-4"
          />
        </button>
      </div>
      <div class="composer-row">
        <button
          type="button"
          class="composer-btn"
          :class="{ active: photo }"
          :aria-label="t('ai.page.attachPhoto')"
          :aria-expanded="attachMenu"
          :disabled="busy"
          @click="attachMenu = !attachMenu"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-[22px]"
          />
        </button>
        <textarea
          ref="textarea"
          v-model="input"
          class="composer-input"
          rows="1"
          :placeholder="plant ? t('ai.page.placeholderPlant', { name: plant.name }) : t('ai.page.placeholder')"
          :aria-label="t('ai.page.question')"
          enterkeyhint="enter"
          @input="autosize"
          @keydown="onKeydown"
          @focus="onComposerFocus"
        />
        <button
          v-if="busy"
          type="button"
          class="send-btn stop"
          :aria-label="t('ai.page.stop')"
          @click="assistant.stop()"
        >
          <UIcon
            name="i-tabler-player-stop-filled"
            class="size-5"
          />
        </button>
        <button
          v-else
          type="button"
          class="send-btn"
          :disabled="!canSend"
          :aria-label="t('ai.page.send')"
          @click="send()"
        >
          <UIcon
            name="i-tabler-send"
            class="size-5"
          />
        </button>
      </div>
    </div>
    <BottomSheet
      v-model:open="reportOpen"
      :title="t('ai.report.title')"
    >
      <form
        class="form-stack"
        @submit.prevent="submitReport"
      >
        <p class="muted">
          {{ t('ai.report.why') }}
        </p>
        <div
          class="report-reasons"
          role="radiogroup"
          :aria-label="t('ai.report.why')"
        >
          <button
            v-for="r in AI_REPORT_REASONS"
            :key="r"
            type="button"
            role="radio"
            class="chip"
            :aria-checked="reportReason === r"
            :class="{ active: reportReason === r }"
            @click="reportReason = r"
          >
            {{ t(`ai.report.reasons.${r}`) }}
          </button>
        </div>
        <label class="field">
          <span class="field-label">{{ t('ai.report.note') }}</span>
          <textarea
            v-model="reportNote"
            class="input"
            maxlength="500"
            rows="3"
          />
        </label>
        <p class="field-hint">
          {{ t('ai.report.privacy') }}
        </p>
        <button
          type="submit"
          class="btn btn-danger btn-block"
          :disabled="!reportReason || reportBusy"
        >
          {{ t('ai.report.send') }}
        </button>
      </form>
    </BottomSheet>
  </div>
</template>

<style scoped>
.assistant {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.plant-bar {
  padding: 12px 20px 4px;
}

.plant-bar .chip {
  min-height: 44px;
}

.chip-glyph {
  font-size: 16px;
}

.chip.active .chip-glyph {
  filter: drop-shadow(0 0 5px color-mix(in srgb, currentColor 50%, transparent));
}

.chip:disabled {
  opacity: 0.5;
}

.chat {
  flex: 1;
  padding: 8px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Notices */
.offline-note {
  display: flex;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-3);
}

/* Welcome */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 28px 0 4px;
}

.welcome-mark {
  font-size: 48px;
  color: var(--lamp);
  margin-bottom: 18px;
}

.welcome h2 {
  margin: 0 0 8px;
  font-size: 21px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  text-wrap: balance;
}

.welcome p {
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-2);
  max-width: 320px;
}

.quick {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight);
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  text-align: left;
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur) var(--ease-out);
}

.quick-btn > span:not(.iconify) {
  flex: 1;
}

.quick-btn .iconify {
  color: var(--leaf);
  flex-shrink: 0;
}

.quick-btn .quick-go {
  color: var(--text-3);
  transition: transform var(--dur) var(--ease-out), color var(--dur) ease;
}

.quick-btn:active:not(:disabled) {
  transform: scale(0.98);
  border-color: var(--accent-line);
}

.quick-btn:active:not(:disabled) .quick-go {
  color: var(--leaf);
  transform: translate(2px, -2px);
}

.quick-btn:disabled {
  opacity: 0.5;
}

/* Messages */
.messages {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.msg {
  display: flex;
  flex-direction: row;
  gap: 10px;
  animation: msg-in var(--dur-slow) var(--ease-out) both;
}

.msg-user {
  justify-content: flex-end;
}

@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

/* The lamp mark: breathes while the answer is being written */
.avatar {
  width: 28px;
  height: 28px;
  margin-top: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--lamp);
}

.avatar.thinking .grow-icon {
  animation: breathe 1.6s var(--ease-out) infinite alternate;
}

@keyframes breathe {
  from {
    opacity: 0.55;
    transform: scale(0.88) rotate(-8deg);
  }
  to {
    opacity: 1;
    transform: scale(1.06) rotate(6deg);
  }
}

.bubble {
  min-width: 0;
  border-radius: 18px;
  padding: 12px 14px;
}

.user-bubble {
  max-width: 84%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: linear-gradient(180deg, rgba(155, 227, 107, 0.16) 0%, rgba(155, 227, 107, 0.09) 100%);
  border: 1px solid var(--accent-line);
  box-shadow: inset 0 1px 0 rgba(155, 227, 107, 0.18);
  color: var(--text);
  border-bottom-right-radius: 6px;
}

.user-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.thumb {
  width: 100%;
  max-width: 220px;
  border-radius: 12px;
  display: block;
}

.user-bubble .meta {
  align-self: flex-end;
}

.bot-bubble {
  flex: 1;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: var(--panel-shadow);
  border-top-left-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
}

.meta {
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.bot-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: -4px 0 -10px;
}

.meta-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: -12px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-3);
  transition: color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.meta-btn:active {
  color: var(--leaf);
  transform: scale(0.9);
}

/* Pending */
.pending {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  font-size: 13px;
  color: var(--text-2);
}

.dots {
  display: inline-flex;
  gap: 4px;
}

.dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--lamp);
  animation: blink 1.4s infinite;
}

.dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Diagnosis */
.diag {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #0b0d10;
  border: 1px solid var(--line);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}

.diag-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.diag-head .grow-icon {
  font-size: 16px;
  color: var(--leaf);
}

.diag-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 6px 10px;
}

.diag-line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
}

.diag-label {
  font-weight: 600;
}

.diag-p {
  white-space: nowrap;
  color: var(--text-2);
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

.diag-row .progress {
  grid-column: 1;
}

.diag-row .badge {
  grid-column: 2;
  grid-row: 1 / span 2;
}

.diag-note {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.4;
}

/* Error */
.error {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: var(--danger-soft);
  border: 1px solid rgba(255, 95, 109, 0.3);
  color: #ff9aa3;
  font-size: 14px;
  line-height: 1.45;
}

.error p {
  margin: 0;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.error-actions:not(:empty) {
  margin-top: 10px;
}

.btn-sm {
  min-height: 44px;
  padding: 0 14px;
  font-size: 13px;
}

/* Sources */
.sources {
  border-top: 1px solid var(--line);
  margin: 0 -16px;
  padding: 2px 16px 0;
}

.sources-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--leaf);
  font-size: 13px;
  font-weight: 600;
}

.chev {
  transition: transform var(--dur) var(--ease-out);
}

.chev.open {
  transform: rotate(180deg);
}

.sources-list {
  list-style: none;
  margin: 4px 0 6px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: msg-in var(--dur) var(--ease-out) both;
}

.sources-list li {
  display: flex;
  gap: 10px;
  padding: 6px;
  margin: -6px;
  border-radius: 10px;
  transition: background var(--dur-slow) ease;
}

.sources-list li.flash {
  background: var(--lamp-soft);
}

.sources-list li.sources-more {
  padding-left: 38px;
}

.reply-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reply-chips .chip {
  white-space: normal;
  text-align: left;
}

.sources-list li.unused {
  opacity: 0.6;
}

.src-n {
  flex-shrink: 0;
  min-width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--leaf);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.src-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  line-height: 1.4;
}

.src-title {
  color: var(--text);
  font-weight: 600;
  overflow-wrap: anywhere;
}

a.src-title {
  text-decoration: underline;
  text-decoration-color: var(--accent-line);
  text-underline-offset: 2px;
}

.src-kind {
  font-size: 11px;
  color: var(--text-3);
}

.src-snippet {
  color: var(--text-2);
}

/* Markdown answer */
.md {
  font-size: 15px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.md :deep(p),
.md :deep(ul),
.md :deep(ol),
.md :deep(blockquote),
.md :deep(pre),
.md :deep(.md-table) {
  margin: 0 0 10px;
}

.md :deep(> :last-child) {
  margin-bottom: 0;
}

.md :deep(h3),
.md :deep(h4),
.md :deep(h5) {
  margin: 16px 0 6px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
}

.md :deep(> h3:first-child),
.md :deep(> h4:first-child),
.md :deep(> h5:first-child) {
  margin-top: 0;
}

.md :deep(ul),
.md :deep(ol) {
  padding-left: 20px;
}

.md :deep(ul) {
  list-style: disc;
}

.md :deep(ol) {
  list-style: decimal;
}

.md :deep(li) {
  margin: 3px 0;
}

.md :deep(li.nested) {
  margin-left: 16px;
  list-style: circle;
}

.md :deep(li::marker) {
  color: var(--leaf);
}

.md :deep(strong) {
  font-weight: 600;
  color: #fff;
}

.md :deep(code) {
  padding: 1px 5px;
  border-radius: 6px;
  background: var(--surface-3);
  font-size: 13px;
}

.md :deep(pre) {
  padding: 10px;
  border-radius: 10px;
  background: #0b0d10;
  border: 1px solid var(--line);
  overflow-x: auto;
}

.md :deep(pre code) {
  padding: 0;
  background: none;
}

.md :deep(blockquote) {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--highlight);
  color: var(--text-2);
}

.md :deep(hr) {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 12px 0;
}

.md :deep(a) {
  color: var(--leaf);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.md :deep(.md-table) {
  overflow-x: auto;
}

.md :deep(table) {
  border-collapse: collapse;
  font-size: 13px;
  min-width: 100%;
  font-variant-numeric: tabular-nums;
}

.md :deep(th),
.md :deep(td) {
  padding: 6px 8px;
  border: 1px solid var(--line-strong);
  text-align: left;
  vertical-align: top;
}

.md :deep(th) {
  background: var(--surface-3);
  font-weight: 600;
}

.md :deep(.cite) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin: 0 1px;
  padding: 0 4px;
  border: 0;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--leaf);
  font-size: 11px;
  font-weight: 600;
  vertical-align: 2px;
  line-height: 1;
}

.md.streaming :deep(> :last-child)::after {
  content: '';
  display: inline-block;
  width: 7px;
  height: 14px;
  margin-left: 3px;
  vertical-align: -2px;
  border-radius: 2px;
  background: var(--lamp);
  box-shadow: 0 0 8px rgba(255, 210, 138, 0.6);
  animation: blink 1s infinite;
}

/* Composer */
/* The scroll container's bottom padding (room for the nav) already counts as
   the sticky edge, so -16px makes the composer sit right on top of the nav. */
.composer {
  position: sticky;
  bottom: -16px;
  z-index: 10;
  padding: 12px 20px 26px;
  background: linear-gradient(180deg, rgba(11, 13, 16, 0.96) 0%, #07080a 100%);
  border-top: 1px solid var(--line);
  /* second shadow fills the gap down to the nav */
  box-shadow: 0 -12px 24px -12px rgba(0, 0, 0, 0.7), 0 40px 0 0 #07080a;
}

.preview {
  position: relative;
  width: 84px;
  margin-bottom: 10px;
  animation: msg-in var(--dur) var(--ease-out) both;
}

.preview img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  display: block;
}

.preview-remove {
  position: absolute;
  top: -14px;
  right: -14px;
  z-index: 1;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--text);
}

.preview-remove::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
  background: var(--surface-3);
  z-index: -1;
}

.preview-remove .iconify {
  position: relative;
}

/* Keyboard open: the nav slides away and the WebView doesn't resize, so pin the composer above the keyboard. */
html.kb-open .composer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--kb, 0px);
  padding-bottom: 10px;
  box-shadow: 0 -12px 24px -12px rgba(0, 0, 0, 0.7);
}

html.kb-open .messages {
  padding-bottom: 110px;
}

.attach-scrim {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.attach-menu {
  position: absolute;
  bottom: calc(100% - 4px);
  left: 20px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: 6px;
  border-radius: 16px;
  border: 1px solid var(--line-strong);
  background: var(--surface-3);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
  animation: msg-in var(--dur) var(--ease-out) both;
}

.attach-menu button {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  font-size: 15px;
  text-align: left;
}

.attach-menu button:active {
  background: var(--accent-soft);
}

.composer-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 4px;
  border-radius: 24px;
  border: 1px solid var(--line-strong);
  background: #0b0d10;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
  transition: border-color var(--dur) ease, box-shadow var(--dur) ease;
}

.composer-row:focus-within {
  border-color: var(--leaf);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5), 0 0 0 3px rgba(155, 227, 107, 0.14);
}

.composer-btn,
.send-btn {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 0;
  transition: transform var(--dur-fast) var(--ease-out), opacity var(--dur) ease, box-shadow var(--dur) var(--ease-out), background var(--dur) ease;
}

.composer-btn {
  background: transparent;
  color: var(--text-2);
}

.composer-btn.active {
  background: var(--accent-soft);
  color: var(--leaf);
}

.composer-btn:disabled {
  opacity: 0.4;
}

.send-btn {
  background: linear-gradient(180deg, #b3ef87 0%, var(--leaf) 55%, #86d257 100%);
  color: var(--on-accent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 0 16px -2px rgba(155, 227, 107, 0.55);
}

.send-btn.stop {
  background: var(--surface-3);
  color: var(--text);
  box-shadow: inset 0 1px 0 var(--highlight);
}

.send-btn:disabled {
  background: var(--surface-3);
  color: var(--text-3);
  box-shadow: none;
}

.composer-btn:active:not(:disabled),
.send-btn:active:not(:disabled) {
  transform: scale(0.9);
}

.composer-input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  max-height: 140px;
  padding: 11px 4px;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--text);
  font-size: 16px;
  line-height: 1.4;
}

.composer-input:focus-visible {
  outline: none;
}

.composer-input::placeholder {
  color: #6b7669;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
  .avatar.thinking .grow-icon {
    animation: none;
  }
}
.report-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.guide-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.guide-chip {
  min-height: 36px;
  max-width: 100%;
  font-size: 13px;
  text-decoration: none;
}

.guide-chip .chip-glyph {
  color: var(--accent);
}

.fallback {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.fallback-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.fallback-note {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.fallback-card {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-2);
}

.fallback-card strong {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
}

.fallback-card p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-2);
  white-space: pre-line;
}
</style>
