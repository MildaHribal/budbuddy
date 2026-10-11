<script setup lang="ts">
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
  created_at: string
  user: Author | null
  plant: { id: string, name: string } | null
}
interface PlantRow { id: string, owner_id: string, name: string, stage: string, cover_url: string | null, owner: Author | null }

const route = useRoute()
const { t } = useI18n()
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

const REPORT_SELECT = 'id, user_id, plant_id, flowering_days, yield_g, difficulty, rating, notes, created_at, user:profiles!strain_reports_user_id_fkey(username, display_name, avatar_url, reputation), plant:public_plants!strain_reports_plant_id_fkey(id, name)'

async function load() {
  state.value = 'loading'
  const { data, error } = await sb.from('strains').select(STRAIN_COLUMNS).eq('slug', slug.value).maybeSingle()
  if (error) {
    state.value = navigator.onLine ? 'error' : 'offline'
    return
  }
  if (!data) {
    state.value = 'missing'
    return
  }
  strain.value = data as Strain
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
  const { data } = await sb.from('strain_reports').select(REPORT_SELECT).eq('strain_id', strain.value.id).order('created_at', { ascending: false }).limit(50)
  reports.value = (data ?? []) as unknown as ReportRow[]
}

async function loadPlants() {
  if (!strain.value) return
  const { data } = await sb.from('public_plants')
    .select('id, owner_id, name, stage, cover_url, owner:profiles!public_plants_owner_id_fkey(username, display_name, avatar_url)')
    .eq('strain_id', strain.value.id)
    .order('updated_at', { ascending: false })
    .limit(12)
  plants.value = (data ?? []) as unknown as PlantRow[]
}

onMounted(() => {
  loadBlocks()
  load()
})
watch(slug, load)

const shownReports = computed(() => reports.value.filter(r => !isBlocked(r.user_id)))
const shownPlants = computed(() => plants.value.filter(p => !isBlocked(p.owner_id)))

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
  return [s.dominance && t(`strains.dominance.${s.dominance}`), s.flowering && t(`strains.flowering.${s.flowering}`)].filter(Boolean).join(' · ')
})

const heroLoaded = ref(false)
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
  plant_id: null as string | null
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
    plant_id: r?.plant_id ?? null
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
    plant_id: draft.plant_id
  }
  const res = editing.value
    ? await sb.from('strain_reports').update(fields).eq('id', editing.value.id)
    : await sb.from('strain_reports').insert({ ...fields, strain_id: strain.value.id, user_id: user.value.id })
  saving.value = false
  if (res.error) {
    notify(res.error.code === 'P0001' ? t('strains.rateLimited') : t('strains.failed'), { tone: 'error' })
    return
  }
  sheetOpen.value = false
  notify(t('strains.reportSaved'))
  await Promise.all([loadReports(), loadStats()])
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
    { key: 'avgFlowering', value: s?.avg_flowering_days != null ? t('strains.daysShort', { n: s.avg_flowering_days }) : '–', icon: 'flowering', color: '#c9a2ff' },
    { key: 'avgYield', value: s?.avg_yield_g != null ? t('strains.gramsShort', { n: s.avg_yield_g }) : '–', icon: 'harvest', color: 'var(--lamp)' },
    { key: 'avgDifficulty', value: s?.avg_difficulty != null ? `${s.avg_difficulty}` : '–', suffix: t('strains.ofFive'), icon: 'train', color: 'var(--text-2)' },
    { key: 'avgRating', value: s?.avg_rating != null ? `${s.avg_rating}` : '–', suffix: t('strains.ofFive'), icon: 'spark', color: 'var(--leaf)' }
  ]
})
</script>

<template>
  <div>
    <AppHeader
      :title="strain?.name ?? t('strains.title')"
      :subtitle="strain?.breeder ?? undefined"
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
        />
      </template>
    </AppHeader>

    <div
      v-if="state === 'loading'"
      class="page"
      aria-busy="true"
    >
      <div class="hero sk" />
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
      <figure class="hero-wrap">
        <div
          class="hero"
          :class="{ loaded: !strain.image_url || heroLoaded, empty: !strain.image_url }"
          :style="{ color: dominanceColor(strain.dominance) }"
        >
          <img
            v-if="strain.image_url"
            :src="strain.image_url"
            :alt="strain.name"
            decoding="async"
            referrerpolicy="no-referrer"
            @load="heroLoaded = true"
            @error="heroLoaded = true"
          >
          <GrowIcon
            v-else
            :name="strain.flowering === 'auto' ? 'seedling' : 'flowering'"
            class="placeholder"
            draw
            glow
          />
        </div>
        <figcaption
          v-if="strain.image_credit"
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
            <dd>{{ strain.breeder || '–' }}</dd>
          </div>
          <div>
            <dt>{{ t('strains.type') }}</dt>
            <dd>
              <i
                class="dot"
                :style="{ background: dominanceColor(strain.dominance) }"
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
          v-if="strain.description"
          class="about"
        >
          {{ strain.description }}
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
        <div class="stats">
          <div
            v-for="s in statTiles"
            :key="s.key"
            class="card stat"
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
        <button
          type="button"
          class="btn btn-soft btn-block add-report"
          @click="openReport()"
        >
          <UIcon name="i-tabler-plus" />{{ t('strains.addReport') }}
        </button>
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
          class="reports rise"
        >
          <li
            v-for="r in shownReports"
            :key="r.id"
            class="card report"
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
                style="color: #c9a2ff"
              >
                <GrowIcon name="flowering" />{{ t('strains.daysShort', { n: r.flowering_days }) }}
              </span>
              <span
                v-if="r.yield_g != null"
                class="badge"
                style="color: var(--lamp)"
              >
                <GrowIcon name="harvest" />{{ t('strains.gramsShort', { n: r.yield_g }) }}
              </span>
              <span
                v-if="r.difficulty"
                class="badge tag"
              >{{ t(`strains.difficulty.${r.difficulty}`) }}</span>
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

      <section
        v-if="shownPlants.length"
        aria-labelledby="plants-title"
      >
        <div class="section-head">
          <h2
            id="plants-title"
            class="section-title"
          >
            <GrowIcon name="plants" />{{ t('strains.plants') }}
          </h2>
        </div>
        <ul class="plants">
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
                <span>{{ stageInfo(p.stage).label }}<template v-if="p.owner"> · {{ authorName(p.owner) }}</template></span>
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
      icon-color="var(--lamp)"
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
              type="number"
              inputmode="numeric"
              min="20"
              max="200"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ t('strains.reportYield') }}</span>
            <input
              v-model.number="draft.yield_g"
              class="input"
              :class="{ invalid: !yieldOk }"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
            >
          </label>
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
  </div>
</template>

<style scoped>
.hero-wrap {
  margin: -16px -20px 0;
}

.hero {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background:
    radial-gradient(70% 60% at 50% 10%, color-mix(in srgb, currentColor 16%, transparent), transparent 72%),
    #0b0d10;
}

.hero img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.04);
  transition: opacity var(--dur-slow) var(--ease-out), transform 700ms var(--ease-out);
}

.hero.loaded img {
  opacity: 1;
  transform: none;
}

.hero::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 40%;
  background: linear-gradient(transparent, rgba(7, 8, 10, 0.55));
  pointer-events: none;
}

.hero.empty {
  aspect-ratio: 16 / 7;
}

.placeholder {
  font-size: 64px;
}

.credit {
  padding: 6px 20px 0;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.4;
}

.pending {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 210, 138, 0.3);
  background: var(--lamp-soft);
  color: var(--lamp);
  font-size: 13px;
  font-weight: 600;
}

.facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}

.facts > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 12px;
}

.facts > div + div {
  border-left: 1px solid var(--line);
}

.facts dt {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 500;
}

.facts dd {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: break-word;
}

.facts .lamp {
  color: var(--lamp);
}

.dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
}

.about {
  margin: 14px 0 0;
  color: var(--text-2);
  line-height: 1.55;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
}

.stat-icon {
  font-size: 20px;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 26px;
  font-weight: 300;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.stat-value small {
  font-size: 13px;
  color: var(--text-3);
  letter-spacing: 0;
}

.stat-label {
  color: var(--text-3);
  font-size: 12px;
}

.add-report {
  margin-top: 12px;
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
  gap: 12px;
}

.report {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 8px 14px 14px;
}

.report-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stars {
  display: inline-flex;
  gap: 1px;
  color: var(--lamp);
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
  margin: 0 -20px;
  padding: 0 20px 4px;
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
  background: #0b0d10;
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
  font-size: 13px;
}

.plant-meta span {
  color: var(--text-3);
  font-size: 11px;
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
  color: var(--lamp);
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
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.hero.sk {
  margin: -16px -20px 0;
}

.sk-block {
  height: 80px;
}

.sk-block.tall {
  height: 160px;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
</style>
