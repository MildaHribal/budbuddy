<script setup lang="ts">
import { useOnlineRetry } from '~/utils/feed/online'
import type { TipRow } from '~/components/community/TipCard.vue'
import { TIP_GROUPS, TIP_SYMPTOMS, parseTipGroup, symptomFilter, tipGroupOf, type TipGroupId } from '~/utils/tips'

const { t } = useI18n()
useHead({ title: () => t('tips.title') })

const route = useRoute()
const router = useRouter()
const { user, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { notify } = useNotify()
const { confirm } = useConfirm()
const { state: grow } = useGrow()

const PAGE = 20
const HUB = 3
const MEDIA = ['soil', 'coco', 'hydro'] as const
const ENVS = ['indoor', 'outdoor', 'greenhouse'] as const
const SYMPTOMS = Object.keys(TIP_SYMPTOMS)
const SELECT = 'id, author_id, body, stage, medium, environment, helpful_count, unhelpful_count, score, created_at, author:profiles!tips_author_id_fkey(username, display_name, avatar_url, reputation)'

const groupFilter = ref<TipGroupId | 'general' | null>(route.query.stage === 'general' ? 'general' : parseTipGroup(route.query.stage))
const symptomFilterKey = ref<string | null>(typeof route.query.symptom === 'string' && route.query.symptom in TIP_SYMPTOMS ? route.query.symptom : null)
const mediumFilter = ref<string | null>(null)
const envFilter = ref<string | null>(null)
const extraCount = computed(() => [symptomFilterKey.value, mediumFilter.value, envFilter.value].filter(Boolean).length)
const filtered = computed(() => !!groupFilter.value || extraCount.value > 0)
/** Hub = top tips per stage; any filter switches to the ranked, paginated list. */
const hubMode = computed(() => !filtered.value)

watch([groupFilter, symptomFilterKey], ([g, sy]) => {
  router.replace({ query: { ...route.query, stage: g ?? undefined, symptom: sy ?? undefined } })
})

// stage group of the user's growing plants, shown first in the hub
const myGroup = computed<TipGroupId | null>(() => {
  const counts = new Map<TipGroupId, number>()
  for (const p of grow.plants) {
    if (p.archived) continue
    const g = tipGroupOf(p.stage)
    if (g) counts.set(g.id, (counts.get(g.id) ?? 0) + 1)
  }
  let best: TipGroupId | null = null
  let n = 0
  for (const [g, c] of counts) if (c > n) [best, n] = [g, c]
  return best
})

const groupChips = computed(() => TIP_GROUPS.map(g => ({ ...g, info: stageInfo(g.stage), label: t(`tips.groups.${g.id}`) })))
// hub puts the stage of the user's plants first
const groups = computed(() => {
  const list = groupChips.value
  const mine = myGroup.value
  return mine ? [...list.filter(g => g.id === mine), ...list.filter(g => g.id !== mine)] : list
})

const tips = ref<TipRow[]>([])
const votes = reactive(new Map<string, 1 | -1>())
const loading = ref(false)
const done = ref(false)
const error = ref<'offline' | 'error' | null>(null)
let seq = 0
let localShift = 0

const shown = computed(() => tips.value.filter(x => !isBlocked(x.author_id)))

const hubSections = computed(() => {
  const out = groups.value.map(g => ({ ...g, tips: shown.value.filter(x => (g.stages as string[]).includes(x.stage ?? '')).slice(0, HUB) }))
  const general = shown.value.filter(x => !tipGroupOf(x.stage)).slice(0, HUB)
  return { stages: out.filter(g => g.tips.length), general }
})
const hubEmpty = computed(() => !hubSections.value.stages.length && !hubSections.value.general.length)

async function loadPage(reset = false) {
  if (loading.value && !reset) return
  if (reset) {
    tips.value = []
    done.value = false
    localShift = 0
  }
  if (done.value) return
  const my = ++seq
  loading.value = true
  error.value = null
  let q = useSupabase().from('tips').select(SELECT)
  const g = groupFilter.value
  if (g === 'general') q = q.is('stage', null)
  else if (g) q = q.in('stage', TIP_GROUPS.find(x => x.id === g)!.stages)
  const sy = symptomFilterKey.value && symptomFilter(symptomFilterKey.value)
  if (sy) q = q.or(sy)
  if (mediumFilter.value) q = q.eq('medium', mediumFilter.value)
  if (envFilter.value) q = q.eq('environment', envFilter.value)
  // hub: one ranked batch, grouped client-side
  const size = hubMode.value ? 80 : PAGE
  const from = Math.max(0, tips.value.length - localShift)
  const { data, error: err } = await q
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + size - 1)
  if (my !== seq) return
  loading.value = false
  if (err) {
    error.value = navigator.onLine ? 'error' : 'offline'
    return
  }
  const rows = (data ?? []) as unknown as TipRow[]
  const seen = new Set(tips.value.map(x => x.id))
  tips.value = [...tips.value, ...rows.filter(r => !seen.has(r.id))]
  if (hubMode.value || rows.length < size) done.value = true
  loadVotes(rows.map(r => r.id))
  await nextTick()
  recheckSentinel()
}

async function loadVotes(ids: string[]) {
  const uid = user.value?.id
  if (!uid || !ids.length) return
  const { data } = await useSupabase().from('tip_votes').select('tip_id, value').eq('user_id', uid).in('tip_id', ids)
  for (const v of data ?? []) votes.set(v.tip_id as string, v.value as 1 | -1)
}

watch([groupFilter, symptomFilterKey, mediumFilter, envFilter], () => loadPage(true))
watch(() => user.value?.id, () => {
  votes.clear()
  loadBlocks()
  loadVotes(tips.value.map(x => x.id))
})

function clearFilters() {
  groupFilter.value = null
  symptomFilterKey.value = null
  mediumFilter.value = null
  envFilter.value = null
}

function openGroup(id: TipGroupId | 'general') {
  groupFilter.value = id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const filterOpen = ref(false)

const activeExtras = computed(() => [
  symptomFilterKey.value && { key: 'symptom', label: t(`tips.symptoms.${symptomFilterKey.value}`), clear: () => (symptomFilterKey.value = null) },
  mediumFilter.value && { key: 'medium', label: t(`tips.mediums.${mediumFilter.value}`), clear: () => (mediumFilter.value = null) },
  envFilter.value && { key: 'env', label: t(`tips.envs.${envFilter.value}`), clear: () => (envFilter.value = null) }
].filter(Boolean) as { key: string, label: string, clear: () => void }[])

// infinite scroll
const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null
const canLoadMore = () => !loading.value && !done.value && !error.value && tips.value.length > 0
function recheckSentinel() {
  const el = sentinel.value
  if (!el || !canLoadMore()) return
  if (el.getBoundingClientRect().top < window.innerHeight + 400) loadPage()
}
onMounted(() => {
  loadBlocks()
  loadPage(true)
  if (groupFilter.value) nextTick(() => document.querySelector('.filter-row .chip[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }))
  io = new IntersectionObserver((e) => {
    if (e[0]?.isIntersecting && canLoadMore()) loadPage()
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
  const g = TIP_GROUPS.find(x => x.id === groupFilter.value)
  draft.stage = tip ? tip.stage : g?.stage ?? null
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
    const blocked = contentBlockedKey(res.error)
    notify(blocked ? t(`tips.blocked.${blocked}`) : res.error.code === 'P0001' ? t('tips.rateLimited') : t('tips.failed'), { tone: 'error' })
    return
  }
  const row = res.data as unknown as TipRow
  if (editing.value) {
    const i = tips.value.findIndex(x => x.id === row.id)
    if (i >= 0) tips.value[i] = row
    notify(t('tips.updated'))
  } else {
    tips.value = [row, ...tips.value]
    localShift++
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
  localShift--
  notify(t('tips.deleted'), { tone: 'info' })
}

const stageList = computed(() => stages())
useOnlineRetry(() => !!error.value, () => loadPage(!tips.value.length))
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
      <div
        v-if="filtered || !hubEmpty || loading"
        class="filters"
      >
        <div
          class="chips filter-row"
          role="group"
          :aria-label="t('tips.stageLabel')"
        >
          <button
            type="button"
            class="chip"
            :aria-pressed="groupFilter === null"
            @click="groupFilter = null"
          >
            {{ t('tips.hub') }}
          </button>
          <button
            v-for="g in groupChips"
            :key="g.id"
            type="button"
            class="chip"
            :aria-pressed="groupFilter === g.id"
            @click="groupFilter = groupFilter === g.id ? null : g.id"
          >
            <GrowIcon
              :name="g.info.glyph"
              :style="{ color: g.info.color }"
            />{{ g.label }}
          </button>
          <button
            type="button"
            class="chip"
            :aria-pressed="groupFilter === 'general'"
            @click="groupFilter = groupFilter === 'general' ? null : 'general'"
          >
            {{ t('tips.general') }}
          </button>
        </div>
        <div class="chips filter-row">
          <button
            type="button"
            class="chip filter-chip"
            :aria-pressed="extraCount > 0"
            aria-haspopup="dialog"
            @click="filterOpen = true"
          >
            <UIcon name="i-tabler-adjustments-horizontal" />{{ t('tips.filter') }}
            <span
              v-if="extraCount"
              class="count num"
            >{{ extraCount }}</span>
          </button>
          <button
            v-for="a in activeExtras"
            :key="a.key"
            type="button"
            class="chip active-chip"
            :aria-label="t('tips.removeFilter', { name: a.label })"
            @click="a.clear()"
          >
            {{ a.label }}<UIcon name="i-tabler-x" />
          </button>
          <template v-if="!activeExtras.length">
            <button
              v-for="sy in SYMPTOMS.slice(0, 4)"
              :key="sy"
              type="button"
              class="chip quiet"
              @click="symptomFilterKey = sy"
            >
              {{ t(`tips.symptoms.${sy}`) }}
            </button>
          </template>
        </div>
      </div>

      <div
        v-if="error && !tips.length"
        class="state"
      >
        <EmptyState
          :icon="error === 'offline' ? 'measure' : 'pest'"
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

      <template v-else-if="loading && !tips.length">
        <div
          v-for="i in 3"
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

      <EmptyState
        v-else-if="done && (hubMode ? hubEmpty : !shown.length)"
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
        v-else-if="hubMode"
        class="hub rise"
      >
        <section
          v-for="g in hubSections.stages"
          :key="g.id"
          :aria-labelledby="`hub-${g.id}`"
        >
          <div class="section-head">
            <h2
              :id="`hub-${g.id}`"
              class="section-title"
            >
              <GrowIcon
                :name="g.info.glyph"
                :style="{ color: g.info.color }"
              />{{ g.label }}
            </h2>
            <span
              v-if="g.id === myGroup"
              class="section-meta here"
            >{{ t('tips.yourStage') }}</span>
          </div>
          <div class="list">
            <CommunityTipCard
              v-for="tip in g.tips"
              :key="tip.id"
              :tip="tip"
              :vote="votes.get(tip.id)"
              :mine="tip.author_id === user?.id"
              @vote="v => vote(tip, v)"
              @edit="openCompose(tip)"
              @delete="remove(tip)"
            />
          </div>
          <button
            type="button"
            class="btn btn-ghost more"
            @click="openGroup(g.id)"
          >
            {{ t('tips.moreIn', { stage: g.label.toLocaleLowerCase(intlLocale()) }) }}<UIcon name="i-tabler-chevron-right" />
          </button>
        </section>

        <section
          v-if="hubSections.general.length"
          aria-labelledby="hub-general"
        >
          <div class="section-head">
            <h2
              id="hub-general"
              class="section-title"
            >
              <GrowIcon
                name="lamp"
                class="lamp"
              />{{ t('tips.general') }}
            </h2>
          </div>
          <div class="list">
            <CommunityTipCard
              v-for="tip in hubSections.general"
              :key="tip.id"
              :tip="tip"
              :vote="votes.get(tip.id)"
              :mine="tip.author_id === user?.id"
              @vote="v => vote(tip, v)"
              @edit="openCompose(tip)"
              @delete="remove(tip)"
            />
          </div>
          <button
            type="button"
            class="btn btn-ghost more"
            @click="openGroup('general')"
          >
            {{ t('tips.moreGeneral') }}<UIcon name="i-tabler-chevron-right" />
          </button>
        </section>
      </div>

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
            v-for="i in 2"
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
      v-model:open="filterOpen"
      :title="t('tips.filter')"
    >
      <div class="form-stack">
        <div class="field">
          <span class="field-label">{{ t('tips.symptomLabel') }}</span>
          <div class="chips wrap">
            <button
              v-for="sy in SYMPTOMS"
              :key="sy"
              type="button"
              class="chip"
              :aria-pressed="symptomFilterKey === sy"
              @click="symptomFilterKey = symptomFilterKey === sy ? null : sy"
            >
              {{ t(`tips.symptoms.${sy}`) }}
            </button>
          </div>
        </div>
        <div class="field">
          <span class="field-label">{{ t('tips.mediumLabel') }}</span>
          <div class="segmented">
            <button
              type="button"
              :aria-pressed="mediumFilter === null"
              @click="mediumFilter = null"
            >
              {{ t('tips.any') }}
            </button>
            <button
              v-for="m in MEDIA"
              :key="m"
              type="button"
              :aria-pressed="mediumFilter === m"
              @click="mediumFilter = m"
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
              :aria-pressed="envFilter === null"
              @click="envFilter = null"
            >
              {{ t('tips.any') }}
            </button>
            <button
              v-for="e in ENVS"
              :key="e"
              type="button"
              :aria-pressed="envFilter === e"
              @click="envFilter = e"
            >
              {{ t(`tips.envs.${e}`) }}
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="!extraCount"
          @click="symptomFilterKey = null; mediumFilter = null; envFilter = null"
        >
          {{ t('tips.clearFilters') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="filterOpen = false"
        >
          {{ t('tips.showResults') }}
        </button>
      </template>
    </BottomSheet>

    <BottomSheet
      v-model:open="composeOpen"
      :title="editing ? t('tips.editTitle') : t('tips.composeTitle')"
      icon="lamp"
      icon-color="var(--amber)"
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
  margin: 0 -16px -8px;
}

.filter-chip .iconify {
  font-size: 17px;
}

.count {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--green);
  color: var(--on-accent);
  font-size: 11px;
  font-weight: 600;
}

.active-chip {
  color: var(--green);
  border-color: transparent;
  background: var(--accent-soft);
}

.active-chip .iconify {
  margin-left: 2px;
  font-size: 15px;
  color: var(--text-2);
}

.chip.quiet {
  color: var(--text-3);
}

.hub {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.here {
  color: var(--green);
  font-weight: 600;
}

.more {
  width: 100%;
  margin-top: 6px;
  justify-content: center;
  gap: 4px;
  color: var(--text-2);
}

.lamp {
  color: var(--amber);
}

.filter-row {
  padding: 0 16px 2px;
}

.filter-row .chip {
  min-height: 44px;
}

.filter-row .grow-icon {
  font-size: 16px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  background: var(--surface-3);
  animation: pulse 1.4s ease-in-out infinite;
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

@keyframes pulse {
  50% {
    opacity: 0.45;
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
  color: var(--amber);
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
