<script setup lang="ts">
import { useOnlineRetry } from '~/utils/feed/online'
import type { PublicAuthor } from '~/types/community'
import type { Strain, StrainStats } from '~/utils/strains'

type Author = PublicAuthor
interface ReportRow {
  id: string
  user_id: string
  plant_id: string | null
  flowering_days: number | null
  yield_g: number | null
  difficulty: number | null
  rating: number | null
  notes: string | null
  medium?: string | null
  tags?: string[] | null
  created_at: string
  user: Author | null
  plant: { id: string, name: string } | null
}
interface PlantRow { id: string, owner_id: string, name: string, stage: string, cover_url: string | null, updated_at: string, owner: Author | null }
interface MyPlant { id: string, name: string, stage: string, cover_url: string | null, strain_id: string | null }

const route = useRoute()
const { t, locale } = useI18n()
const { user, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { notify } = useNotify()
const { confirm } = useConfirm()
const sb = useSupabase()

const slug = computed(() => String(route.params.slug))
const strain = ref<Strain | null>(null)
const stats = ref<StrainStats | null>(null)
const reports = ref<ReportRow[]>([])
const plants = ref<PlantRow[]>([])
const state = ref<'loading' | 'ready' | 'missing' | 'offline' | 'error'>('loading')

useHead({ title: () => strain.value?.name ?? t('strains.title') })

const REPORT_BASE = 'id, user_id, plant_id, flowering_days, yield_g, difficulty, rating, notes, created_at, user:profiles!strain_reports_user_id_fkey(username, display_name, avatar_url, reputation), plant:public_plants!strain_reports_plant_id_fkey(id, name)'
const hasReportExtras = ref(true)

async function load() {
  state.value = 'loading'
  const { data, error } = await withStrainColumns(cols => sb.from('strains').select(cols).eq('slug', slug.value).maybeSingle())
  if (error) {
    state.value = navigator.onLine ? 'error' : 'offline'
    return
  }
  if (!data) {
    state.value = 'missing'
    return
  }
  strain.value = data as unknown as Strain
  state.value = 'ready'
  await Promise.all([loadStats(), loadReports(), loadPlants()])
}

async function loadStats() {
  if (!strain.value) return
  const { data } = await sb.from('strain_stats').select('*').eq('strain_id', strain.value.id).maybeSingle()
  stats.value = (data as StrainStats | null) ?? null
}

async function loadReports() {
  if (!strain.value) return
  const id = strain.value.id
  const run = (cols: string) => sb.from('strain_reports').select(cols).eq('strain_id', id).order('created_at', { ascending: false }).limit(50)
  let res = hasReportExtras.value ? await run(`${REPORT_BASE}, medium, tags`) : await run(REPORT_BASE)
  if (isMissingSchema(res.error)) {
    hasReportExtras.value = false
    res = await run(REPORT_BASE)
  }
  reports.value = (res.data ?? []) as unknown as ReportRow[]
}

async function loadPlants() {
  if (!strain.value) return
  const { data } = await sb.from('public_plants')
    .select('id, owner_id, name, stage, cover_url, updated_at, owner:profiles!public_plants_owner_id_fkey(username, display_name, avatar_url)')
    .eq('strain_id', strain.value.id)
    .order('updated_at', { ascending: false })
    .limit(12)
  plants.value = (data ?? []) as unknown as PlantRow[]
}

onMounted(() => {
  loadBlocks()
  load()
})
watch(slug, () => {
  heroLoaded.value = false
  heroFailed.value = false
  load()
})

const shownReports = computed(() => reports.value.filter(r => !isBlocked(r.user_id)))
const shownPlants = computed(() => plants.value.filter(p => !isBlocked(p.owner_id)))
const growerCount = computed(() => new Set(shownPlants.value.map(p => p.owner_id)).size)

const description = computed(() => (strain.value ? strainDescription(strain.value) : null))
const descInEnglish = computed(() => locale.value === 'cs' && !!description.value && !strain.value?.description_cs?.trim())
const breederLabel = computed(() => (isVariousBreeder(strain.value?.breeder) ? t('strains.various') : strain.value?.breeder || null))

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const byMedium = computed(() => STRAIN_MEDIA.map((m) => {
  const rs = shownReports.value.filter(r => r.medium === m)
  const days = avg(rs.flatMap(r => (r.flowering_days ? [r.flowering_days] : [])))
  const grams = avg(rs.flatMap(r => (r.yield_g != null ? [Number(r.yield_g)] : [])))
  const rating = avg(rs.flatMap(r => (r.rating ? [r.rating] : [])))
  return { medium: m, n: rs.length, days: days && Math.round(days), grams: grams != null ? Math.round(grams) : null, rating: rating && Math.round(rating * 10) / 10 }
}).filter(x => x.n > 0))
const fmt1 = (n: number) => new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1 }).format(n)

const weeks = computed(() => {
  const s = strain.value
  if (!s) return null
  const a = s.flowering_weeks_min
  const b = s.flowering_weeks_max
  if (a && b && a !== b) return t('strains.weeks', { min: a, max: b })
  if (a || b) return t('strains.weeksOne', { n: (a ?? b)! })
  return null
})
const typeLabel = computed(() => {
  const s = strain.value
  if (!s) return ''
  return [s.dominance && t(`strains.dominance.${s.dominance}`), s.flowering && t(`strains.flowering.${s.flowering}`).toLocaleLowerCase(intlLocale())].filter(Boolean).join(' · ')
})

const heroLoaded = ref(false)
const heroFailed = ref(false)
const authorName = (a: Author | null) => a?.display_name || a?.username || '?'

// ── Report sheet ───────────────────────────────────────────────────
const sheetOpen = ref(false)
const editing = ref<ReportRow | null>(null)
const draft = reactive({
  flowering_days: '' as number | '',
  yield_g: '' as number | '',
  difficulty: null as number | null,
  rating: null as number | null,
  notes: '',
  plant_id: null as string | null,
  medium: null as string | null,
  tags: [] as string[]
})
const myPlants = ref<{ id: string, name: string }[]>([])
const saving = ref(false)

const daysOk = computed(() => draft.flowering_days === '' || (Number.isInteger(draft.flowering_days) && draft.flowering_days >= 20 && draft.flowering_days <= 200))
const yieldOk = computed(() => draft.yield_g === '' || (draft.yield_g >= 0 && draft.yield_g <= 100000))
const anyValue = computed(() => draft.flowering_days !== '' || draft.yield_g !== '' || draft.difficulty || draft.rating || draft.notes.trim())
const valid = computed(() => daysOk.value && yieldOk.value && !!anyValue.value)

async function openReport(r?: ReportRow) {
  if (!requireAuth() || !user.value) return
  editing.value = r ?? null
  Object.assign(draft, {
    flowering_days: r?.flowering_days ?? '',
    yield_g: r?.yield_g ?? '',
    difficulty: r?.difficulty ?? null,
    rating: r?.rating ?? null,
    notes: r?.notes ?? '',
    plant_id: r?.plant_id ?? null,
    medium: r?.medium ?? null,
    tags: [...(r?.tags ?? [])]
  })
  sheetOpen.value = true
  const { data } = await sb.from('public_plants').select('id, name').eq('owner_id', user.value.id).order('updated_at', { ascending: false }).limit(30)
  myPlants.value = (data ?? []) as { id: string, name: string }[]
}

async function saveReport() {
  if (!valid.value || saving.value || !user.value || !strain.value) return
  saving.value = true
  const fields = {
    flowering_days: draft.flowering_days === '' ? null : draft.flowering_days,
    yield_g: draft.yield_g === '' ? null : draft.yield_g,
    difficulty: draft.difficulty,
    rating: draft.rating,
    notes: draft.notes.trim() || null,
    plant_id: draft.plant_id,
    ...(hasReportExtras.value ? { medium: draft.medium, tags: draft.tags.slice(0, 6) } : {})
  }
  const res = editing.value
    ? await sb.from('strain_reports').update(fields).eq('id', editing.value.id)
    : await sb.from('strain_reports').insert({ ...fields, strain_id: strain.value.id, user_id: user.value.id })
  saving.value = false
  if (res.error) {
    const blocked = contentBlockedKey(res.error)
    notify(blocked ? t(`strains.blocked.${blocked}`) : res.error.code === '23505' ? t('strains.reportExists') : res.error.code === 'P0001' ? t('strains.rateLimited') : t('strains.failed'), { tone: 'error' })
    return
  }
  sheetOpen.value = false
  notify(t('strains.reportSaved'))
  await Promise.all([loadReports(), loadStats()])
}

function toggleTag(tag: string) {
  const i = draft.tags.indexOf(tag)
  if (i >= 0) draft.tags.splice(i, 1)
  else if (draft.tags.length < 6) draft.tags.push(tag)
}

// ── "I'm growing this": sets strain_id on one of my public plants ──
const growOpen = ref(false)
const growPlants = ref<MyPlant[] | null>(null)
const growBusy = ref<string | null>(null)

async function openGrowing() {
  if (!requireAuth() || !user.value) return
  growPlants.value = null
  growOpen.value = true
  const { data } = await sb.from('public_plants').select('id, name, stage, cover_url, strain_id')
    .eq('owner_id', user.value.id).eq('archived', false).order('updated_at', { ascending: false }).limit(30)
  growPlants.value = (data ?? []) as MyPlant[]
}

const otherStrainNames = ref(new Map<string, string>())
watch(growPlants, async (list) => {
  const ids = [...new Set((list ?? []).map(p => p.strain_id).filter((x): x is string => !!x && x !== strain.value?.id))]
  if (!ids.length) return
  const { data } = await sb.from('strains').select('id, name').in('id', ids)
  otherStrainNames.value = new Map((data ?? []).map(x => [x.id as string, x.name as string]))
})

async function setGrowing(p: MyPlant, link: boolean) {
  if (!user.value || !strain.value || growBusy.value) return
  growBusy.value = p.id
  const strainId = link ? strain.value.id : null
  const { error } = await sb.from('public_plants').update({ strain_id: strainId }).eq('id', p.id).eq('owner_id', user.value.id)
  growBusy.value = null
  if (error) return notify(t('strains.failed'), { tone: 'error' })
  p.strain_id = strainId
  haptic('select')
  notify(link ? t('strains.growingLinked', { name: p.name }) : t('strains.growingUnlinked'))
  if (link) growOpen.value = false
  loadPlants()
}

async function deleteReport(r: ReportRow) {
  const ok = await confirm({ title: t('strains.deleteReportConfirm'), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  const { error } = await sb.from('strain_reports').delete().eq('id', r.id)
  if (error) return notify(t('strains.failed'), { tone: 'error' })
  notify(t('strains.reportDeleted'), { tone: 'info' })
  await Promise.all([loadReports(), loadStats()])
}

const statTiles = computed(() => {
  const s = stats.value
  return [
    { key: 'avgFlowering', value: s?.avg_flowering_days != null ? t('strains.daysShort', { n: s.avg_flowering_days }) : '–', icon: 'flowering', color: stageInfo('flowering').color },
    { key: 'avgYield', value: s?.avg_yield_g != null ? t('strains.gramsShort', { n: s.avg_yield_g }) : '–', icon: 'harvest', color: 'var(--amber)' },
    { key: 'avgDifficulty', value: s?.avg_difficulty != null ? fmt1(Number(s.avg_difficulty)) : '–', suffix: t('strains.ofFive'), icon: 'train', color: 'var(--text-2)' },
    { key: 'avgRating', value: s?.avg_rating != null ? fmt1(Number(s.avg_rating)) : '–', suffix: t('strains.ofFive'), icon: 'spark', color: 'var(--green)' }
  ]
})
useOnlineRetry(() => state.value === 'offline' || state.value === 'error', load)
</script>

<template>
  <div>
    <AppHeader
      :title="strain?.name ?? t('strains.title')"
      :subtitle="breederLabel ?? undefined"
      back
    >
      <template
        v-if="strain"
        #actions
      >
        <CommunityReportMenu
          target-type="strain"
          :target-id="strain.id"
          :author-id="strain.created_by"
          framed
        />
      </template>
    </AppHeader>

    <div
      v-if="state === 'loading'"
      class="page"
      aria-busy="true"
    >
      <div class="card hero sk" />
      <div class="card sk-block" />
      <div class="card sk-block tall" />
      <span class="sr-only">{{ t('common.loading') }}</span>
    </div>

    <div
      v-else-if="state !== 'ready' || !strain"
      class="page"
    >
      <EmptyState
        :icon="state === 'missing' ? 'flowering' : 'pest'"
        :title="state === 'missing' ? t('strains.emptyTitle') : t('strains.errorTitle')"
        :text="state === 'missing' ? t('strains.notFound') : state === 'offline' ? t('strains.offline') : t('strains.failed')"
      >
        <button
          v-if="state !== 'missing'"
          type="button"
          class="btn btn-soft"
          @click="load"
        >
          <UIcon name="i-tabler-refresh" /> {{ t('strains.retry') }}
        </button>
        <NuxtLink
          v-else
          to="/strains"
          class="btn btn-soft"
        >
          {{ t('strains.title') }}
        </NuxtLink>
      </EmptyState>
    </div>

    <div
      v-else
      class="page"
    >
      <figure class="hero-wrap card">
        <div
          class="hero"
          :class="{ loaded: !strain.image_url || heroLoaded, empty: !strain.image_url }"
        >
          <img
            v-if="strain.image_url && !heroFailed"
            :src="strain.image_url"
            :alt="strain.name"
            decoding="async"
            referrerpolicy="no-referrer"
            @load="heroLoaded = true"
            @error="heroFailed = true"
          >
          <GrowIcon
            v-else
            :name="strain.flowering === 'auto' ? 'seedling' : 'flowering'"
            class="placeholder"
          />
        </div>
        <figcaption
          v-if="strain.image_credit && !heroFailed"
          class="credit"
        >
          {{ t('strains.photoCredit', { credit: strain.image_credit }) }}
        </figcaption>
      </figure>

      <p
        v-if="!strain.approved"
        class="pending"
      >
        <UIcon name="i-tabler-hourglass" />{{ t('strains.pending') }}
      </p>

      <section aria-labelledby="facts-title">
        <div class="section-head">
          <h2
            id="facts-title"
            class="section-title"
          >
            <GrowIcon name="note" />{{ t('strains.facts') }}
          </h2>
        </div>
        <dl class="card facts">
          <div>
            <dt>{{ t('strains.breeder') }}</dt>
            <dd>{{ breederLabel || '–' }}</dd>
          </div>
          <div>
            <dt>{{ t('strains.type') }}</dt>
            <dd>
              <UIcon
                v-if="strain.dominance"
                :name="dominanceIcon(strain.dominance)"
                class="dom-icon"
                :title="t(`strains.dominanceHint.${strain.dominance}`)"
              />{{ typeLabel || '–' }}
            </dd>
          </div>
          <div>
            <dt>{{ t('strains.floweringTime') }}</dt>
            <dd class="lamp num">
              {{ weeks || '–' }}
            </dd>
          </div>
        </dl>
        <p
          v-if="description"
          class="about"
          :lang="descInEnglish || locale === 'en' ? 'en' : 'cs'"
        >
          {{ description }}
          <span
            v-if="descInEnglish"
            class="badge lang-badge"
            :title="t('strains.descEnglish')"
          >EN</span>
        </p>
      </section>

      <section aria-labelledby="community-title">
        <div class="section-head">
          <h2
            id="community-title"
            class="section-title"
          >
            <UIcon name="i-tabler-users" />{{ t('strains.community') }}
          </h2>
          <span class="section-meta num">{{ t('strains.reportsN', { n: stats?.reports ?? 0 }) }}</span>
        </div>
        <div class="card stats">
          <div
            v-for="s in statTiles"
            :key="s.key"
            class="stat"
          >
            <GrowIcon
              :name="s.icon"
              class="stat-icon"
              :style="{ color: s.color }"
            />
            <span class="stat-value num">{{ s.value }}<small v-if="s.suffix && s.value !== '–'"> {{ s.suffix }}</small></span>
            <span class="stat-label">{{ t(`strains.${s.key}`) }}</span>
          </div>
        </div>
        <div
          v-if="byMedium.length"
          class="card by-medium"
        >
          <p class="by-medium-title">
            {{ t('strains.byMedium') }}
          </p>
          <dl>
            <div
              v-for="m in byMedium"
              :key="m.medium"
              class="medium-row"
            >
              <dt>
                {{ t(`strains.mediums.${m.medium}`) }}
                <span class="num">{{ t('strains.mediumRow', { n: m.n }) }}</span>
              </dt>
              <dd class="num">
                <span v-if="m.days"><GrowIcon
                  name="flowering"
                  :style="{ color: stageInfo('flowering').color }"
                />{{ t('strains.daysShort', { n: m.days }) }}</span>
                <span v-if="m.grams != null"><GrowIcon
                  name="harvest"
                  class="lamp"
                />{{ t('strains.gramsShort', { n: m.grams }) }}</span>
                <span v-if="m.rating"><UIcon
                  name="i-tabler-star-filled"
                  class="lamp"
                />{{ fmt1(m.rating) }}</span>
              </dd>
            </div>
          </dl>
        </div>
        <div class="cta-row">
          <button
            type="button"
            class="btn btn-primary"
            @click="openReport()"
          >
            <UIcon name="i-tabler-plus" />{{ t('strains.addReport') }}
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            @click="openGrowing"
          >
            <GrowIcon name="plants" />{{ t('strains.growing') }}
          </button>
        </div>
      </section>

      <section aria-labelledby="reports-title">
        <div class="section-head">
          <h2
            id="reports-title"
            class="section-title"
          >
            <GrowIcon name="harvest" />{{ t('strains.reports') }}
          </h2>
        </div>
        <EmptyState
          v-if="!shownReports.length"
          icon="harvest"
          :title="t('strains.noReportsTitle')"
          :text="t('strains.noReportsText')"
        />
        <ul
          v-else
          class="card reports rise"
        >
          <li
            v-for="r in shownReports"
            :key="r.id"
            class="report"
          >
            <div class="report-head">
              <CommunityAuthorChip :author="r.user">
                <time
                  :datetime="r.created_at"
                  class="num"
                >{{ communityAgo(r.created_at) }}</time>
              </CommunityAuthorChip>
              <span
                v-if="r.rating"
                class="stars"
                :aria-label="`${t('strains.reportRating')}: ${r.rating}/5`"
              >
                <UIcon
                  v-for="i in 5"
                  :key="i"
                  :name="i <= r.rating ? 'i-tabler-star-filled' : 'i-tabler-star'"
                  :class="{ off: i > r.rating }"
                />
              </span>
              <CommunityReportMenu
                target-type="profile"
                :target-id="r.user_id"
                :author-id="r.user_id"
                :author-name="authorName(r.user)"
                @edit="openReport(r)"
                @delete="deleteReport(r)"
              />
            </div>
            <div class="report-facts">
              <span
                v-if="r.flowering_days"
                class="badge"
                :style="{ color: stageInfo('flowering').color }"
              >
                <GrowIcon name="flowering" />{{ t('strains.daysShort', { n: r.flowering_days }) }}
              </span>
              <span
                v-if="r.yield_g != null"
                class="badge"
                style="color: var(--amber)"
              >
                <GrowIcon name="harvest" />{{ t('strains.gramsShort', { n: r.yield_g }) }}
              </span>
              <span
                v-if="r.difficulty"
                class="badge tag"
              >{{ t(`strains.difficulty.${r.difficulty}`) }}</span>
              <span
                v-if="r.medium"
                class="badge tag"
              >{{ t(`strains.mediums.${r.medium}`) }}</span>
              <span
                v-for="tag in r.tags ?? []"
                :key="tag"
                class="badge tag"
              >{{ t(`strains.tags.${tag}`) }}</span>
            </div>
            <p
              v-if="r.notes"
              class="notes"
            >
              {{ r.notes }}
            </p>
            <NuxtLink
              v-if="r.plant"
              :to="`/plant/${r.plant.id}`"
              class="link plant-link"
            >
              <GrowIcon name="plants" />{{ r.plant.name }}
              <UIcon name="i-tabler-chevron-right" />
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section aria-labelledby="plants-title">
        <div class="section-head">
          <h2
            id="plants-title"
            class="section-title"
          >
            <GrowIcon name="plants" />{{ t('strains.diaries') }}
          </h2>
          <span
            v-if="growerCount"
            class="section-meta num"
          >{{ t('strains.diariesMeta', { n: growerCount }) }}</span>
        </div>
        <button
          v-if="!shownPlants.length"
          type="button"
          class="card diaries-empty"
          @click="openGrowing"
        >
          <GrowIcon
            name="seedling"
            class="diaries-glyph"
          />
          <span>{{ t('strains.diariesEmpty') }}</span>
          <UIcon
            name="i-tabler-chevron-right"
            class="chev"
          />
        </button>
        <ul
          v-else
          class="plants"
        >
          <li
            v-for="p in shownPlants"
            :key="p.id"
          >
            <NuxtLink
              :to="`/plant/${p.id}`"
              class="card plant"
              :aria-label="`${t('strains.viewPlant')}: ${p.name}`"
            >
              <span
                class="plant-img"
                :style="{ color: stageInfo(p.stage).color }"
              >
                <img
                  v-if="p.cover_url"
                  :src="p.cover_url"
                  alt=""
                  loading="lazy"
                >
                <GrowIcon
                  v-else
                  :name="stageInfo(p.stage).glyph"
                />
              </span>
              <span class="plant-meta">
                <strong>{{ p.name }}</strong>
                <span>{{ stageInfo(p.stage).label }} · {{ communityAgo(p.updated_at) }}</span>
                <span v-if="p.owner">{{ authorName(p.owner) }}</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <BottomSheet
      v-model:open="sheetOpen"
      :title="editing ? t('strains.editReport') : t('strains.addReport')"
      icon="harvest"
      icon-color="var(--amber)"
    >
      <form
        id="strain-report"
        class="form-stack"
        @submit.prevent="saveReport"
      >
        <div class="form-grid">
          <label class="field">
            <span class="field-label">{{ t('strains.reportFlowering') }}</span>
            <input
              v-model.number="draft.flowering_days"
              class="input"
              :class="{ invalid: !daysOk }"
              :aria-invalid="!daysOk"
              aria-describedby="days-err"
              type="number"
              inputmode="numeric"
              min="20"
              max="200"
            >
            <span
              v-if="!daysOk"
              id="days-err"
              class="field-error"
            >{{ t('strains.daysInvalid') }}</span>
          </label>
          <label class="field">
            <span class="field-label">{{ t('strains.reportYield') }}</span>
            <input
              v-model.number="draft.yield_g"
              class="input"
              :class="{ invalid: !yieldOk }"
              :aria-invalid="!yieldOk"
              aria-describedby="yield-err"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
            >
            <span
              v-if="!yieldOk"
              id="yield-err"
              class="field-error"
            >{{ t('strains.yieldInvalid') }}</span>
          </label>
        </div>

        <div
          v-if="hasReportExtras"
          class="field"
        >
          <span class="field-label">{{ t('strains.reportMedium') }}</span>
          <div class="segmented">
            <button
              type="button"
              :aria-pressed="draft.medium === null"
              @click="draft.medium = null"
            >
              {{ t('strains.any') }}
            </button>
            <button
              v-for="m in STRAIN_MEDIA"
              :key="m"
              type="button"
              :aria-pressed="draft.medium === m"
              @click="draft.medium = m"
            >
              {{ t(`strains.mediums.${m}`) }}
            </button>
          </div>
        </div>

        <div class="field">
          <span class="field-label">{{ t('strains.reportDifficulty') }}<template v-if="draft.difficulty"> · {{ t(`strains.difficulty.${draft.difficulty}`) }}</template></span>
          <div class="segmented">
            <button
              v-for="i in 5"
              :key="i"
              type="button"
              :aria-pressed="draft.difficulty === i"
              :aria-label="t(`strains.difficulty.${i}`)"
              @click="draft.difficulty = draft.difficulty === i ? null : i"
            >
              {{ i }}
            </button>
          </div>
        </div>

        <div class="field">
          <span class="field-label">{{ t('strains.reportRating') }}</span>
          <div
            class="star-input"
            role="radiogroup"
            :aria-label="t('strains.reportRating')"
          >
            <button
              v-for="i in 5"
              :key="i"
              type="button"
              role="radio"
              :aria-checked="draft.rating === i"
              :aria-label="`${i} / 5`"
              :class="{ on: (draft.rating ?? 0) >= i }"
              @click="draft.rating = draft.rating === i ? null : i"
            >
              <UIcon :name="(draft.rating ?? 0) >= i ? 'i-tabler-star-filled' : 'i-tabler-star'" />
            </button>
          </div>
        </div>

        <div
          v-if="hasReportExtras"
          class="field"
        >
          <span class="field-label">{{ t('strains.reportTags') }}</span>
          <div class="chips wrap">
            <button
              v-for="tag in STRAIN_TAGS"
              :key="tag"
              type="button"
              class="chip"
              :aria-pressed="draft.tags.includes(tag)"
              @click="toggleTag(tag)"
            >
              {{ t(`strains.tags.${tag}`) }}
            </button>
          </div>
        </div>

        <label class="field">
          <span class="field-label">{{ t('strains.reportNotes') }}</span>
          <textarea
            v-model="draft.notes"
            class="input"
            maxlength="600"
            rows="3"
            lang="en"
            :placeholder="t('strains.notesPlaceholder')"
          />
          <span class="field-hint">{{ t('strains.english') }}</span>
        </label>

        <div
          v-if="myPlants.length"
          class="field"
        >
          <span class="field-label">{{ t('strains.linkPlant') }}</span>
          <div class="chips wrap">
            <button
              type="button"
              class="chip"
              :aria-pressed="draft.plant_id === null"
              @click="draft.plant_id = null"
            >
              {{ t('strains.noPlant') }}
            </button>
            <button
              v-for="p in myPlants"
              :key="p.id"
              type="button"
              class="chip"
              :aria-pressed="draft.plant_id === p.id"
              @click="draft.plant_id = p.id"
            >
              {{ p.name }}
            </button>
          </div>
        </div>

        <p
          v-if="!anyValue"
          class="field-hint"
        >
          {{ t('strains.needOne') }}
        </p>
        <p class="rule">
          <UIcon name="i-tabler-ban" />{{ t('strains.noSale') }}
        </p>
      </form>
      <template #footer>
        <button
          type="submit"
          form="strain-report"
          class="btn btn-primary"
          :disabled="!valid || saving"
        >
          {{ t('strains.saveReport') }}
        </button>
      </template>
    </BottomSheet>

    <BottomSheet
      v-model:open="growOpen"
      :title="t('strains.growingTitle')"
      icon="plants"
      icon-color="var(--green)"
    >
      <div class="form-stack">
        <p class="muted grow-intro">
          {{ t('strains.growingText') }}
        </p>
        <div
          v-if="!growPlants"
          class="sk-block"
          aria-busy="true"
        />
        <EmptyState
          v-else-if="!growPlants.length"
          icon="plants"
          :title="t('strains.growingNone')"
        />
        <ul
          v-else
          class="grow-list"
        >
          <li
            v-for="p in growPlants"
            :key="p.id"
            class="grow-item"
            :class="{ busy: growBusy === p.id }"
          >
            <span
              class="grow-img"
              :style="{ color: stageInfo(p.stage).color }"
            >
              <img
                v-if="p.cover_url"
                :src="p.cover_url"
                alt=""
                loading="lazy"
              >
              <GrowIcon
                v-else
                :name="stageInfo(p.stage).glyph"
              />
            </span>
            <span class="grow-meta">
              <strong>{{ p.name }}</strong>
              <span v-if="p.strain_id === strain?.id">{{ t('strains.linkedHere') }}</span>
              <span v-else-if="p.strain_id && otherStrainNames.get(p.strain_id)">{{ t('strains.growingOther', { strain: otherStrainNames.get(p.strain_id)! }) }}</span>
              <span v-else>{{ stageInfo(p.stage).label }}</span>
            </span>
            <button
              v-if="p.strain_id === strain?.id"
              type="button"
              class="btn btn-ghost"
              :disabled="!!growBusy"
              @click="setGrowing(p, false)"
            >
              {{ t('strains.unlink') }}
            </button>
            <button
              v-else
              type="button"
              class="btn btn-soft"
              :disabled="!!growBusy"
              :aria-label="`${t('strains.growing')}: ${p.name}`"
              @click="setGrowing(p, true)"
            >
              <UIcon name="i-tabler-link" />
            </button>
          </li>
        </ul>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.hero-wrap {
  margin: 0;
  overflow: hidden;
}

.hero {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  color: var(--text-3);
  background: var(--surface-3);
}

.hero img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--dur) ease;
}

.hero.loaded img {
  opacity: 1;
}

.placeholder {
  font-size: 48px;
}

.credit {
  padding: 8px 14px;
  border-top: 1px solid var(--line);
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.4;
}

.pending {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--radius-control);
  background: var(--lamp-soft);
  color: var(--amber);
  font-size: 13px;
  font-weight: 600;
}

.facts {
  display: flex;
  flex-direction: column;
  margin: 0;
  overflow: hidden;
}

.facts > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 8px 14px;
}

.facts > div + div {
  border-top: 1px solid var(--line);
}

.facts dt {
  flex-shrink: 0;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
}

.facts dd {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}

.facts .lamp {
  color: var(--amber);
}

.dom-icon {
  flex-shrink: 0;
  color: var(--text-3);
  font-size: 16px;
}

.lang-badge {
  margin-left: 4px;
  padding: 0 6px;
  min-height: 0;
  vertical-align: 1px;
  color: var(--text-3);
  font-size: 11px;
}

.by-medium {
  margin-top: 10px;
  padding: 12px 14px 6px;
}

.by-medium-title {
  margin: 0 0 4px;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
}

.by-medium dl {
  margin: 0;
}

.medium-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
}

.medium-row + .medium-row {
  border-top: 1px solid var(--line);
}

.medium-row dt {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  font-weight: 600;
}

.medium-row dt .num {
  color: var(--text-3);
  font-size: 12px;
  font-weight: 400;
}

.medium-row dd {
  display: flex;
  gap: 12px;
  margin: 0;
  font-size: 13px;
}

.medium-row dd > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lamp {
  color: var(--amber);
}

.cta-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.cta-row .btn {
  width: 100%;
}

.diaries-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 12px 14px;
  text-align: left;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.45;
}

.diaries-glyph {
  flex-shrink: 0;
  font-size: 28px;
  color: var(--green);
}

.diaries-empty .chev {
  flex-shrink: 0;
  margin-left: auto;
  color: var(--text-3);
}

.grow-intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.grow-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.grow-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 8px 0;
  transition: opacity var(--dur) ease;
}

.grow-item + .grow-item {
  border-top: 1px solid var(--line);
}

.grow-item.busy {
  opacity: 0.55;
}

.grow-img {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--surface-3);
  font-size: 22px;
}

.grow-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.grow-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grow-meta strong {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grow-meta span {
  color: var(--text-3);
  font-size: 12px;
}

.grow-item .btn {
  flex-shrink: 0;
  min-height: 44px;
  min-width: 44px;
  padding: 0 14px;
}

.about {
  margin: 12px 0 0;
  color: var(--text-2);
  font-size: 15px;
  line-height: 1.5;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 12px 14px;
}

.stat:nth-child(2n) {
  border-left: 1px solid var(--line);
}

.stat:nth-child(n + 3) {
  border-top: 1px solid var(--line);
}

.stat-icon {
  font-size: 20px;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.stat-value small {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-3);
  letter-spacing: 0;
}

.stat-label {
  color: var(--text-3);
  font-size: 12px;
}

.reports,
.plants {
  margin: 0;
  padding: 0;
  list-style: none;
}

.reports {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.report {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 8px 14px 14px;
}

.report + .report {
  border-top: 1px solid var(--line);
}

.report-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stars {
  display: inline-flex;
  gap: 1px;
  color: var(--amber);
  font-size: 14px;
}

.stars .off {
  color: var(--text-3);
  opacity: 0.5;
}

.report-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.report-facts:empty {
  display: none;
}

.tag {
  color: var(--text-2);
}

.notes {
  margin: 0;
  padding-right: 6px;
  white-space: pre-line;
  overflow-wrap: anywhere;
  line-height: 1.5;
}

.plant-link {
  align-self: flex-start;
  gap: 6px;
  min-height: 36px;
}

.plants {
  display: flex;
  gap: 10px;
  margin: 0 -16px;
  padding: 0 16px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.plants li {
  flex-shrink: 0;
  width: 150px;
}

.plant {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text);
  text-decoration: none;
}

.plant-img {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  background: var(--surface-3);
  font-size: 36px;
}

.plant-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plant-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px 10px;
  min-width: 0;
}

.plant-meta strong,
.plant-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plant-meta strong {
  font-size: 14px;
}

.plant-meta span {
  color: var(--text-3);
  font-size: 12px;
}

.star-input {
  display: flex;
  gap: 4px;
}

.star-input button {
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-3);
  font-size: 26px;
  transition: color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.star-input button.on {
  color: var(--amber);
}

.star-input button:active {
  transform: scale(0.88);
}

.segmented button {
  font-variant-numeric: tabular-nums;
}

.chips.wrap {
  flex-wrap: wrap;
  overflow: visible;
}

.rule {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
}

.sk,
.sk-block {
  background: var(--surface-2);
}

.sk-block {
  height: 80px;
}

.sk-block.tall {
  height: 160px;
}
</style>
