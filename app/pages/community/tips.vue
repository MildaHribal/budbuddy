<script setup lang="ts">
import type { TipRow } from '~/components/community/TipCard.vue'

const { t } = useI18n()
useHead({ title: () => t('tips.title') })

const route = useRoute()
const { user, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { notify } = useNotify()
const { confirm } = useConfirm()

const PAGE = 20
const MEDIA = ['soil', 'coco', 'hydro'] as const
const ENVS = ['indoor', 'outdoor', 'greenhouse'] as const
const SELECT = 'id, author_id, body, stage, medium, environment, helpful_count, unhelpful_count, score, created_at, author:profiles!tips_author_id_fkey(username, display_name, avatar_url, reputation)'

const stageFilter = ref<string | null>(isStageId(route.query.stage) ? route.query.stage : null)
const mediumFilter = ref<string | null>(null)
const envFilter = ref<string | null>(null)
const filtered = computed(() => !!(stageFilter.value || mediumFilter.value || envFilter.value))

const tips = ref<TipRow[]>([])
const votes = reactive(new Map<string, 1 | -1>())
const loading = ref(false)
const done = ref(false)
const error = ref<'offline' | 'error' | null>(null)
let seq = 0

const shown = computed(() => tips.value.filter(x => !isBlocked(x.author_id)))

async function loadPage(reset = false) {
  if (loading.value && !reset) return
  if (reset) {
    tips.value = []
    done.value = false
  }
  if (done.value) return
  const my = ++seq
  loading.value = true
  error.value = null
  let q = useSupabase().from('tips').select(SELECT)
  if (stageFilter.value) q = q.eq('stage', stageFilter.value)
  if (mediumFilter.value) q = q.eq('medium', mediumFilter.value)
  if (envFilter.value) q = q.eq('environment', envFilter.value)
  const from = tips.value.length
  const { data, error: err } = await q
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE - 1)
  if (my !== seq) return
  loading.value = false
  if (err) {
    error.value = navigator.onLine ? 'error' : 'offline'
    return
  }
  const rows = (data ?? []) as unknown as TipRow[]
  tips.value = [...tips.value, ...rows]
  if (rows.length < PAGE) done.value = true
  loadVotes(rows.map(r => r.id))
}

async function loadVotes(ids: string[]) {
  const uid = user.value?.id
  if (!uid || !ids.length) return
  const { data } = await useSupabase().from('tip_votes').select('tip_id, value').eq('user_id', uid).in('tip_id', ids)
  for (const v of data ?? []) votes.set(v.tip_id as string, v.value as 1 | -1)
}

watch([stageFilter, mediumFilter, envFilter], () => loadPage(true))
watch(() => user.value?.id, () => {
  votes.clear()
  loadBlocks()
  loadVotes(tips.value.map(x => x.id))
})

function clearFilters() {
  stageFilter.value = null
  mediumFilter.value = null
  envFilter.value = null
}

// infinite scroll
const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null
onMounted(() => {
  loadBlocks()
  loadPage(true)
  io = new IntersectionObserver((e) => {
    if (e[0]?.isIntersecting && !loading.value && !done.value && !error.value && tips.value.length) loadPage()
  }, { rootMargin: '400px' })
  if (sentinel.value) io.observe(sentinel.value)
})
onBeforeUnmount(() => io?.disconnect())

// ── Voting (optimistic) ───────────────────────────────────────────
async function vote(tip: TipRow, value: 1 | -1) {
  if (!requireAuth()) return
  const uid = user.value!.id
  const prev = votes.get(tip.id)
  const next = prev === value ? undefined : value
  const snapshot = { h: tip.helpful_count, u: tip.unhelpful_count }
  const bump = (v: 1 | -1 | undefined, d: number) => {
    if (v === 1) tip.helpful_count += d
    if (v === -1) tip.unhelpful_count += d
  }
  bump(prev, -1)
  bump(next, 1)
  if (next) votes.set(tip.id, next)
  else votes.delete(tip.id)
  haptic('select')

  const sb = useSupabase()
  const { error: err } = next
    ? await sb.from('tip_votes').upsert({ user_id: uid, tip_id: tip.id, value: next })
    : await sb.from('tip_votes').delete().eq('user_id', uid).eq('tip_id', tip.id)
  if (err) {
    tip.helpful_count = snapshot.h
    tip.unhelpful_count = snapshot.u
    if (prev) votes.set(tip.id, prev)
    else votes.delete(tip.id)
    notify(t('tips.voteFailed'), { tone: 'error' })
  }
}

// ── Composer ──────────────────────────────────────────────────────
const MIN = 10
const MAX = 500
const composeOpen = ref(false)
const editing = ref<TipRow | null>(null)
const draft = reactive({ body: '', stage: null as string | null, medium: null as string | null, environment: null as string | null })
const saving = ref(false)
const bodyLen = computed(() => draft.body.trim().length)
const valid = computed(() => bodyLen.value >= MIN && bodyLen.value <= MAX)

function openCompose(tip?: TipRow) {
  if (!requireAuth()) return
  editing.value = tip ?? null
  draft.body = tip?.body ?? ''
  draft.stage = tip ? tip.stage : stageFilter.value
  draft.medium = tip ? tip.medium : mediumFilter.value
  draft.environment = tip ? tip.environment : envFilter.value
  composeOpen.value = true
}

async function submit() {
  if (!valid.value || saving.value || !user.value) return
  saving.value = true
  const fields = { body: draft.body.trim(), stage: draft.stage, medium: draft.medium, environment: draft.environment }
  const sb = useSupabase()
  const res = editing.value
    ? await sb.from('tips').update(fields).eq('id', editing.value.id).select(SELECT).single()
    : await sb.from('tips').insert({ ...fields, author_id: user.value.id }).select(SELECT).single()
  saving.value = false
  if (res.error) {
    notify(res.error.code === 'P0001' ? t('tips.rateLimited') : t('tips.failed'), { tone: 'error' })
    return
  }
  const row = res.data as unknown as TipRow
  if (editing.value) {
    const i = tips.value.findIndex(x => x.id === row.id)
    if (i >= 0) tips.value[i] = row
    notify(t('tips.updated'))
  } else {
    tips.value = [row, ...tips.value]
    notify(t('tips.posted'))
  }
  composeOpen.value = false
}

async function remove(tip: TipRow) {
  const ok = await confirm({ title: t('tips.deleteConfirm'), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  const { error: err } = await useSupabase().from('tips').delete().eq('id', tip.id)
  if (err) return notify(t('tips.failed'), { tone: 'error' })
  tips.value = tips.value.filter(x => x.id !== tip.id)
  notify(t('tips.deleted'), { tone: 'info' })
}

const stageList = computed(() => stages())
</script>

<template>
  <div>
    <AppHeader
      :title="t('tips.title')"
      :subtitle="t('tips.subtitle')"
      back
    >
      <template #actions>
        <button
          type="button"
          class="icon-btn accent"
          :aria-label="t('tips.add')"
          @click="openCompose()"
        >
          <UIcon name="i-tabler-plus" />
        </button>
      </template>
    </AppHeader>

    <div class="page">
      <div class="filters">
        <div
          class="chips filter-row"
          role="group"
          :aria-label="t('tips.stageLabel')"
        >
          <button
            type="button"
            class="chip"
            :aria-pressed="stageFilter === null"
            @click="stageFilter = null"
          >
            {{ t('tips.allStages') }}
          </button>
          <button
            v-for="s in stageList"
            :key="s.id"
            type="button"
            class="chip"
            :aria-pressed="stageFilter === s.id"
            @click="stageFilter = stageFilter === s.id ? null : s.id"
          >
            <GrowIcon
              :name="s.glyph"
              :style="{ color: s.color }"
            />{{ s.label }}
          </button>
        </div>
        <div class="chips filter-row">
          <button
            v-for="m in MEDIA"
            :key="m"
            type="button"
            class="chip"
            :aria-pressed="mediumFilter === m"
            @click="mediumFilter = mediumFilter === m ? null : m"
          >
            {{ t(`tips.mediums.${m}`) }}
          </button>
          <span
            class="divider"
            aria-hidden="true"
          />
          <button
            v-for="e in ENVS"
            :key="e"
            type="button"
            class="chip"
            :aria-pressed="envFilter === e"
            @click="envFilter = envFilter === e ? null : e"
          >
            {{ t(`tips.envs.${e}`) }}
          </button>
        </div>
      </div>

      <div
        v-if="error && !tips.length"
        class="state"
      >
        <EmptyState
          :icon="error === 'offline' ? 'i-tabler-mood-empty' : 'pest'"
          :title="t('tips.errorTitle')"
          :text="error === 'offline' ? t('tips.offline') : t('tips.failed')"
        >
          <button
            type="button"
            class="btn btn-soft"
            @click="loadPage(true)"
          >
            <UIcon name="i-tabler-refresh" /> {{ t('tips.retry') }}
          </button>
        </EmptyState>
      </div>

      <EmptyState
        v-else-if="done && !shown.length"
        icon="lamp"
        :title="t('tips.emptyTitle')"
        :text="filtered ? t('tips.emptyFiltered') : t('tips.emptyText')"
      >
        <button
          v-if="filtered"
          type="button"
          class="btn btn-ghost"
          @click="clearFilters"
        >
          {{ t('tips.clearFilters') }}
        </button>
        <button
          type="button"
          class="btn btn-soft"
          @click="openCompose()"
        >
          <UIcon name="i-tabler-bulb" /> {{ t('tips.add') }}
        </button>
      </EmptyState>

      <div
        v-else
        class="list"
      >
        <TransitionGroup
          tag="div"
          name="tip"
          class="list rise"
        >
          <CommunityTipCard
            v-for="tip in shown"
            :key="tip.id"
            :tip="tip"
            :vote="votes.get(tip.id)"
            :mine="tip.author_id === user?.id"
            @vote="v => vote(tip, v)"
            @edit="openCompose(tip)"
            @delete="remove(tip)"
          />
        </TransitionGroup>

        <template v-if="loading">
          <div
            v-for="i in tips.length ? 2 : 4"
            :key="`sk${i}`"
            class="card skeleton"
            aria-hidden="true"
          >
            <span class="sk sk-head" />
            <span class="sk sk-line" />
            <span class="sk sk-line short" />
            <span class="sk sk-foot" />
          </div>
          <span class="sr-only">{{ t('tips.loadingMore') }}</span>
        </template>

        <button
          v-else-if="error"
          type="button"
          class="btn btn-ghost"
          @click="loadPage()"
        >
          <UIcon name="i-tabler-refresh" /> {{ t('tips.retry') }}
        </button>

        <p
          v-else-if="done && shown.length > 3"
          class="end"
        >
          {{ t('tips.end') }}
        </p>
      </div>
      <div
        ref="sentinel"
        aria-hidden="true"
      />
    </div>

    <BottomSheet
      v-model:open="composeOpen"
      :title="editing ? t('tips.editTitle') : t('tips.composeTitle')"
      icon="lamp"
      icon-color="var(--lamp)"
    >
      <form
        id="tip-form"
        class="form-stack"
        @submit.prevent="submit"
      >
        <label class="field">
          <span class="field-label">{{ t('tips.bodyLabel') }}</span>
          <textarea
            v-model="draft.body"
            class="input"
            :maxlength="MAX"
            rows="4"
            lang="en"
            :placeholder="t('tips.bodyPlaceholder')"
          />
          <span class="count-row">
            <span class="field-hint english">
              <UIcon name="i-tabler-language" />{{ t('tips.english') }}
            </span>
            <span
              class="field-hint num"
              :class="{ warn: bodyLen > 0 && bodyLen < MIN }"
            >{{ bodyLen < MIN && bodyLen > 0 ? t('tips.tooShort', { n: MIN }) : `${bodyLen}/${MAX}` }}</span>
          </span>
        </label>

        <div class="field">
          <span class="field-label">{{ t('tips.stageLabel') }}</span>
          <div class="chips wrap">
            <button
              type="button"
              class="chip"
              :aria-pressed="draft.stage === null"
              @click="draft.stage = null"
            >
              {{ t('tips.general') }}
            </button>
            <button
              v-for="s in stageList"
              :key="s.id"
              type="button"
              class="chip"
              :aria-pressed="draft.stage === s.id"
              @click="draft.stage = s.id"
            >
              <GrowIcon
                :name="s.glyph"
                :style="{ color: s.color }"
              />{{ s.label }}
            </button>
          </div>
        </div>

        <div class="field">
          <span class="field-label">{{ t('tips.mediumLabel') }}</span>
          <div class="segmented">
            <button
              type="button"
              :aria-pressed="draft.medium === null"
              @click="draft.medium = null"
            >
              {{ t('tips.any') }}
            </button>
            <button
              v-for="m in MEDIA"
              :key="m"
              type="button"
              :aria-pressed="draft.medium === m"
              @click="draft.medium = m"
            >
              {{ t(`tips.mediums.${m}`) }}
            </button>
          </div>
        </div>

        <div class="field">
          <span class="field-label">{{ t('tips.envLabel') }}</span>
          <div class="segmented">
            <button
              type="button"
              :aria-pressed="draft.environment === null"
              @click="draft.environment = null"
            >
              {{ t('tips.any') }}
            </button>
            <button
              v-for="e in ENVS"
              :key="e"
              type="button"
              :aria-pressed="draft.environment === e"
              @click="draft.environment = e"
            >
              {{ t(`tips.envs.${e}`) }}
            </button>
          </div>
        </div>

        <p class="rule">
          <UIcon name="i-tabler-ban" />{{ t('tips.noSale') }}
        </p>
      </form>
      <template #footer>
        <button
          type="submit"
          form="tip-form"
          class="btn btn-primary"
          :disabled="!valid || saving"
        >
          {{ editing ? t('tips.saveEdit') : t('tips.post') }}
        </button>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 -20px -12px;
}

.filter-row {
  padding: 0 20px 2px;
}

.filter-row .chip {
  min-height: 44px;
}

.filter-row .grow-icon {
  font-size: 16px;
}

.divider {
  flex-shrink: 0;
  width: 1px;
  margin: 8px 4px;
  background: var(--line-strong);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.state {
  padding-top: 8px;
}

.end {
  margin: 4px 0 0;
  text-align: center;
  color: var(--text-3);
  font-size: 12px;
}

.skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.sk {
  display: block;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.04));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.sk-head {
  width: 40%;
  height: 26px;
  border-radius: 13px;
}

.sk-line.short {
  width: 70%;
}

.sk-foot {
  width: 46%;
  height: 36px;
  border-radius: 18px;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

.chips.wrap {
  flex-wrap: wrap;
  overflow: visible;
}

.chips.wrap .grow-icon {
  font-size: 16px;
}

.segmented button {
  min-width: 0;
  padding: 0 4px;
  font-size: 13px;
}

.count-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.english {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.warn {
  color: var(--lamp);
}

.rule {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
}

.tip-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.tip-enter-active,
.tip-leave-active {
  transition: opacity var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.tip-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
