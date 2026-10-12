<script setup lang="ts">
import { useOnlineRetry } from '~/utils/feed/online'
import type { LightboxItem } from '~/components/PhotoLightbox.vue'
import type { PublicPlant, PublicTimelineEntry } from '~/utils/grower'
import type { TrainingMethod } from '~/types/grow'
import { isMissingSchema } from '~/utils/dbErrors'
import { completedWeek, updateStreak, type JournalSummary } from '~/utils/weeklyUpdate'

interface Owner { id: string, username: string, display_name: string | null, avatar_url: string | null, reputation: number }
interface StrainRef { slug: string, name: string }
interface UpdateRow { id: string, week_no: number, body: string | null, images: string[] | null, journal_summary: Partial<JournalSummary> | null, created_at: string }
interface PostRow { id: string, title: string | null, body: string, images: string[], likes_count: number, comments_count: number, created_at: string }

const route = useRoute()
const { t } = useI18n()
const { $goBack } = useNuxtApp()
const { isBlocked, load: loadBlocks } = useBlocks()
const { user, requireAuth } = useAuth()
const { notify } = useNotify()
const sb = useSupabase()

const id = computed(() => String(route.params.id))
const plant = ref<PublicPlant | null>(null)
const owner = ref<Owner | null>(null)
const posts = ref<PostRow[]>([])
const strainRef = ref<StrainRef | null>(null)
const updates = ref<UpdateRow[]>([])
const updatesLive = ref(true)
const following = ref(false)
const followBusy = ref(false)
const state = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')

useHead({ title: () => plant.value?.name ?? t('profile.plant.title') })

async function load() {
  const want = id.value
  state.value = 'loading'
  loadBlocks()
  if (!/^[0-9a-f-]{36}$/i.test(id.value)) {
    state.value = 'missing'
    return
  }
  const { data, error } = await sb.from('public_plants')
    .select('*, owner:profiles!public_plants_owner_id_fkey(id, username, display_name, avatar_url, reputation), strain_ref:strains!public_plants_strain_id_fkey(slug, name)')
    .eq('id', id.value).maybeSingle()
  if (want !== id.value) return
  if (error) {
    state.value = 'error'
    return
  }
  if (!data) {
    state.value = 'missing'
    return
  }
  const { owner: o, strain_ref: sr, ...rest } = data as PublicPlant & { owner: Owner | null, strain_ref: StrainRef | null }
  plant.value = rest
  owner.value = o
  strainRef.value = sr
  updates.value = []
  following.value = false
  state.value = 'ready'
  const me = user.value?.id
  const [res, ups, fol] = await Promise.all([
    sb.from('posts').select('id, title, body, images, likes_count, comments_count, created_at')
      .eq('plant_id', want).order('created_at', { ascending: false }).limit(20),
    sb.from('plant_updates').select('id, week_no, body, images, journal_summary, created_at')
      .eq('plant_id', want).order('week_no', { ascending: false }).limit(60),
    me && o && o.id !== me
      ? sb.from('follows').select('follower_id').eq('follower_id', me).eq('following_id', o.id).maybeSingle()
      : Promise.resolve({ data: null })
  ])
  if (want !== id.value) return
  posts.value = (res.data ?? []) as PostRow[]
  updatesLive.value = !isMissingSchema(ups.error)
  updates.value = (ups.data ?? []) as UpdateRow[]
  following.value = !!fol.data
}

const ownerLevel = computed(() => growerLevel(owner.value?.reputation ?? 0))
const isOwner = computed(() => !!owner.value && owner.value.id === user.value?.id)

async function toggleFollow() {
  const o = owner.value
  if (!o || followBusy.value || !requireAuth() || !user.value || isOwner.value) return
  const next = !following.value
  following.value = next
  followBusy.value = true
  const { error } = next
    ? await sb.from('follows').insert({ follower_id: user.value.id, following_id: o.id })
    : await sb.from('follows').delete().eq('follower_id', user.value.id).eq('following_id', o.id)
  followBusy.value = false
  if (error && error.code !== '23505') {
    following.value = !next
    notify(t('profile.followError'), { tone: 'error' })
  }
}
watch(id, load, { immediate: true })

const { confirm } = useConfirm()
async function removeShared() {
  const p = plant.value
  if (!p || !isOwner.value) return
  const ok = await confirm({ title: t('auth.share.privateTitle'), message: t('auth.share.privateMessage'), confirmLabel: t('auth.share.makePrivate'), danger: true })
  if (!ok) return
  try {
    await usePlantSharing().removePublic(p.id)
    notify(t('auth.share.nowPrivate'), { icon: 'i-tabler-lock' })
    $goBack()
  } catch (e) {
    console.error(e)
    notify(t('auth.share.failed'), { tone: 'error' })
  }
}

const ownerName = computed(() => owner.value?.display_name?.trim() || owner.value?.username || '')
const blocked = computed(() => !!owner.value && owner.value.id !== user.value?.id && isBlocked(owner.value.id))
const stage = computed(() => stageInfo(plant.value?.stage))
const items = computed<PublicTimelineEntry[]>(() => parsePublicTimeline(plant.value?.timeline))

const startDate = computed(() => plant.value?.start_date ?? items.value[items.value.length - 1]?.date ?? null)
const age = computed(() => (startDate.value ? daysSince(startDate.value) : null))

// day in the current stage from the latest shared stage entry
const stageStart = computed(() => items.value.find(i => i.type === 'stage' && i.stage === plant.value?.stage)?.date ?? startDate.value)
const dayInStage = computed(() => (stageStart.value ? daysSince(stageStart.value) : null))

const stageIndex = computed(() => Math.max(0, STAGES.findIndex(s => s.id === plant.value?.stage)))
const journey = computed(() => stages().map((s, i) => ({
  ...s,
  short: t(`profile.rail.${s.id}`),
  state: i < stageIndex.value ? 'done' as const : i === stageIndex.value ? 'current' as const : 'future' as const
})))
const railFill = computed(() => {
  const last = STAGES.length - 1
  const pct = dayInStage.value != null ? Math.min(1, dayInStage.value / stage.value.days) : 0
  const within = stageIndex.value < last ? pct : 0
  return Math.min(1, (stageIndex.value + within * 0.85) / last)
})

const weeks = computed(() => {
  const start = startDate.value
  const groups: { key: string, label: string, items: PublicTimelineEntry[] }[] = []
  for (const it of items.value) {
    const diff = start ? daysBetween(start, it.date) : 0
    const key = diff < 0 ? 'before' : String(Math.floor(diff / 7) + 1)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(it)
    else groups.push({ key, label: key === 'before' ? t('profile.plant.before') : t('profile.plant.week', { n: key }), items: [it] })
  }
  return groups
})

// ── Weekly updates ────────────────────────────────────────────────
const weeksSoFar = computed(() => {
  const max = Math.max(0, ...updates.value.map(u => u.week_no))
  if (!startDate.value || plant.value?.archived) return max
  return Math.max(max, completedWeek({ startDate: startDate.value }, todayISO()))
})
const consistency = computed(() => updateStreak(updates.value, weeksSoFar.value + 1))
const weekCells = computed(() => {
  const s = consistency.value
  if (!s) return []
  const first = Math.min(...updates.value.map(u => u.week_no))
  const have = new Set(updates.value.map(u => u.week_no))
  return Array.from({ length: Math.min(s.weeks, 24) }, (_, i) => ({ n: first + i, on: have.has(first + i) }))
})

// "Week {n}" / "{n}. týden" split around the big number; an ordinal dot stays on the number
const weekParts = computed(() => {
  const [pre = '', post = ''] = t('profile.plant.weekOf', { n: '\u0000' }).split('\u0000')
  const dot = post.startsWith('.')
  return [pre.trim(), (dot ? post.slice(1) : post).trim(), dot ? '.' : ''] as const
})

interface Chip { key: string, glyph: string, color: string, label: string }
function summaryChips(sum: Partial<JournalSummary> | null): Chip[] {
  if (!sum || typeof sum !== 'object') return []
  const out: Chip[] = []
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const e = (type: 'water' | 'feed' | 'train' | 'pest' | 'measure') => entryInfo(type)
  const w = num(sum.waterings)
  if (w) out.push({ key: 'w', glyph: e('water').glyph, color: e('water').color, label: t('profile.plant.sum.water', { n: w }) })
  const f = num(sum.feeds)
  if (f) out.push({ key: 'f', glyph: e('feed').glyph, color: e('feed').color, label: t('profile.plant.sum.feed', { n: f }) })
  if (Array.isArray(sum.trainings)) {
    for (const m of sum.trainings.slice(0, 3)) {
      const label = typeof m === 'string' ? trainingLabel(m as TrainingMethod) : ''
      if (label) out.push({ key: `t-${m}`, glyph: e('train').glyph, color: e('train').color, label })
    }
  }
  const pe = num(sum.pests)
  if (pe) out.push({ key: 'p', glyph: e('pest').glyph, color: e('pest').color, label: t('profile.plant.sum.pest', { n: pe }) })
  const ph = num(sum.ph)
  if (ph != null) out.push({ key: 'ph', glyph: e('measure').glyph, color: e('measure').color, label: t('profile.plant.sum.ph', { v: ph }) })
  const ec = num(sum.ec)
  if (ec != null) out.push({ key: 'ec', glyph: e('measure').glyph, color: e('measure').color, label: t('profile.plant.sum.ec', { v: ec }) })
  const h = num(sum.heightCm)
  if (h != null) out.push({ key: 'h', glyph: e('measure').glyph, color: e('measure').color, label: t('profile.plant.sum.height', { v: h }) })
  return out
}
const updateCards = computed(() => updates.value.map((u) => {
  const sum = u.journal_summary && typeof u.journal_summary === 'object' ? u.journal_summary : null
  const stageId = typeof sum?.stage === 'string' ? sum.stage : null
  return {
    ...u,
    images: (u.images ?? []).filter(x => /^https?:/.test(x)).slice(0, 4),
    day: typeof sum?.day === 'number' ? sum.day : null,
    stage: stageId ? stageInfo(stageId) : null,
    chips: summaryChips(sum)
  }
}))

const harvest = computed(() => {
  const p = plant.value
  if (!p || (p.harvest_wet_g == null && p.harvest_dry_g == null)) return null
  const wet = p.harvest_wet_g != null ? Number(p.harvest_wet_g) : null
  const dry = p.harvest_dry_g != null ? Number(p.harvest_dry_g) : null
  return { wet, dry, ratio: wet && dry ? Math.round((dry / wet) * 100) : null }
})

const facts = computed(() => {
  const p = plant.value
  if (!p) return []
  const out: { icon: string, label: string }[] = []
  if (p.plant_type) out.push({ icon: p.plant_type === 'autoflower' ? 'i-tabler-bolt' : 'i-tabler-sun', label: t(`profile.plant.type.${p.plant_type}`) })
  if (p.environment) out.push({ icon: p.environment === 'outdoor' ? 'i-tabler-sun' : 'lamp', label: tOr(`profile.env.${p.environment}`, p.environment) })
  if (p.medium) out.push({ icon: 'i-tabler-shovel', label: tOr(`profile.media.${p.medium}`, p.medium) })
  if (startDate.value) out.push({ icon: 'i-tabler-calendar', label: t('profile.plant.started', { date: formatDate(startDate.value) }) })
  return out
})

// ── Lightbox ──────────────────────────────────────────────────────
const photoItems = computed<LightboxItem[]>(() => {
  const list: LightboxItem[] = []
  for (const u of updateCards.value) {
    for (const url of u.images) {
      list.push({ photoId: url, title: t('profile.plant.weekOf', { n: u.week_no }), subtitle: formatDate(u.created_at.slice(0, 10)) })
    }
  }
  for (const it of items.value) {
    if (!it.photoUrl) continue
    list.push({
      photoId: it.photoUrl,
      title: it.note || entryInfo(it.type).verb,
      subtitle: `${formatDate(it.date)}${startDate.value ? ` · ${t('profile.day', { n: daysBetween(startDate.value, it.date) })}` : ''}`
    })
  }
  if (plant.value?.cover_url && !list.some(i => i.photoId === plant.value!.cover_url)) {
    list.push({ photoId: plant.value.cover_url, title: plant.value.name, subtitle: plant.value.strain ?? undefined })
  }
  return list
})
const lbIndex = ref<number | null>(null)
const lbOrigin = ref<DOMRect | null>(null)
function openPhoto(url: string, e?: Event) {
  lbOrigin.value = (e?.currentTarget as HTMLElement | undefined)?.getBoundingClientRect() ?? null
  lbIndex.value = Math.max(0, photoItems.value.findIndex(i => i.photoId === url))
}

const excerpt = (s: string, n = 100) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s)
useOnlineRetry(() => state.value === 'error', load)
</script>

<template>
  <div class="detail">
    <div
      v-if="state === 'loading'"
      class="page"
      aria-busy="true"
      :aria-label="t('common.loading')"
    >
      <span class="sk sk-hero" />
      <span class="sk sk-card" />
      <span class="sk sk-card" />
    </div>

    <div
      v-else-if="state !== 'ready' || !plant"
      class="page missing"
    >
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('common.back')"
        @click="$goBack()"
      >
        <UIcon name="i-tabler-chevron-left" />
      </button>
      <EmptyState
        icon="seedling"
        :title="state === 'error' ? t('profile.loadError') : t('profile.plant.notFound')"
        :text="state === 'error' ? undefined : t('profile.plant.notFoundText')"
      >
        <button
          v-if="state === 'error'"
          type="button"
          class="btn btn-soft"
          @click="load"
        >
          <UIcon name="i-tabler-refresh" /> {{ t('profile.retry') }}
        </button>
        <NuxtLink
          v-else
          to="/community"
          class="btn btn-soft"
        >
          {{ t('profile.toCommunity') }}
        </NuxtLink>
      </EmptyState>
    </div>

    <template v-else>
      <section
        class="hero"
        :class="{ lit: !plant.cover_url }"
        :style="{ '--stage': stage.color }"
      >
        <template v-if="plant.cover_url">
          <button
            type="button"
            class="hero-img-btn"
            :aria-label="t('profile.plant.photo')"
            @click="openPhoto(plant.cover_url, $event)"
          >
            <img
              :src="plant.cover_url"
              :alt="plant.name"
              class="hero-img"
            >
          </button>
          <div
            class="hero-shade"
            aria-hidden="true"
          />
        </template>
        <div
          v-else
          class="hero-tile"
          aria-hidden="true"
        >
          <GrowIcon
            :name="stage.glyph"
            class="hero-tile-glyph"
            draw
            :stroke-width="1.3"
          />
        </div>
        <div class="hero-bar">
          <button
            type="button"
            class="bar-btn"
            :aria-label="t('common.back')"
            @click="$goBack()"
          >
            <UIcon
              name="i-tabler-arrow-left"
              class="size-5"
            />
          </button>
          <CommunityReportMenu
            class="bar-menu"
            target-type="plant"
            :target-id="plant.id"
            :author-id="owner?.id"
            :author-name="ownerName"
            no-edit
            @delete="removeShared"
          />
        </div>
        <div class="hero-info">
          <div class="hero-badges">
            <span
              class="badge stage-badge"
              :style="{ color: stage.color }"
            >
              <GrowIcon
                :name="stage.glyph"
                class="text-[14px]"
              />{{ stage.label }}
            </span>
            <span
              v-if="plant.archived"
              class="badge muted-badge"
            >
              <UIcon
                name="i-tabler-archive"
                class="size-3.5"
              />{{ t('profile.plant.archived') }}
            </span>
          </div>
          <h1>{{ plant.name }}</h1>
          <p class="hero-strain">
            <NuxtLink
              v-if="strainRef"
              :to="`/strains/${strainRef.slug}`"
              class="strain-link"
            >{{ plant.strain || strainRef.name }}</NuxtLink>
            <template v-else>
              {{ plant.strain || t('profile.plant.unknownStrain') }}
            </template><template v-if="age != null">
              <span aria-hidden="true"> · </span><span class="num">{{ t('profile.day', { n: age }) }}</span>
            </template>
          </p>
        </div>
      </section>

      <div class="detail-body">
        <NuxtLink
          v-if="owner"
          :to="`/u/${owner.username}`"
          class="owner card"
        >
          <CommunityUserAvatar
            :url="owner.avatar_url"
            :name="ownerName"
            :size="40"
          />
          <span class="owner-text">
            <span class="owner-by">{{ t('profile.plant.by') }}</span>
            <span class="owner-name">{{ ownerName }} <span class="owner-handle">@{{ owner.username }}</span></span>
          </span>
          <span
            class="badge"
            :style="{ color: ownerLevel.color }"
          >
            <GrowIcon
              :name="ownerLevel.glyph"
              class="text-[13px]"
            />{{ ownerLevel.label }}
          </span>
        </NuxtLink>

        <div
          v-if="owner && !isOwner && !blocked"
          class="follow-cta"
        >
          <button
            type="button"
            class="btn btn-block"
            :class="following ? 'btn-soft is-following' : 'btn-primary'"
            :aria-pressed="following"
            :disabled="followBusy"
            @click="toggleFollow"
          >
            <UIcon :name="following ? 'i-tabler-check' : 'i-tabler-bookmark-plus'" />
            {{ following ? t('profile.plant.followingDiary') : t('profile.plant.followDiary') }}
          </button>
          <p
            v-if="!following"
            class="follow-hint"
          >
            {{ t('profile.plant.followHint', { name: ownerName }) }}
          </p>
        </div>

        <p
          v-if="blocked"
          class="blocked-note"
        >
          <UIcon name="i-tabler-ban" /> {{ t('report.blocked', { name: ownerName }) }}
        </p>

        <template v-else>
          <section class="stage-card card">
            <div
              class="rail"
              :style="{ '--fill': railFill }"
            >
              <span
                class="rail-track"
                aria-hidden="true"
              ><span class="rail-fill" /></span>
              <ol class="rail-stops">
                <li
                  v-for="s in journey"
                  :key="s.id"
                  class="rail-stop"
                  :class="s.state"
                  :style="{ '--c': s.color }"
                  :aria-current="s.state === 'current' ? 'step' : undefined"
                >
                  <span class="rail-node">
                    <GrowIcon
                      :name="s.glyph"
                      :draw="s.state === 'current'"
                    />
                  </span>
                  <span
                    class="rail-label"
                    aria-hidden="true"
                  >{{ s.short }}</span>
                  <span class="sr-only">{{ s.label }}, {{ t(`profile.railState.${s.state}`) }}</span>
                </li>
              </ol>
            </div>
            <p
              v-if="dayInStage != null && !plant.archived"
              class="stage-line num"
            >
              {{ t('profile.plant.dayInStage', { n: dayInStage, stage: stage.label.toLowerCase() }) }}
            </p>
            <ul
              v-if="facts.length"
              class="facts"
            >
              <li
                v-for="f in facts"
                :key="f.label"
                class="fact"
              >
                <GrowIcon
                  :name="f.icon"
                  class="text-[15px]"
                />{{ f.label }}
              </li>
            </ul>
            <NuxtLink
              v-if="strainRef"
              :to="`/strains/${strainRef.slug}`"
              class="strain-row"
            >
              <GrowIcon name="flowering" />
              <span>{{ t('profile.plant.strainLink', { strain: strainRef.name }) }}</span>
              <UIcon
                name="i-tabler-chevron-right"
                class="strain-go"
              />
            </NuxtLink>
          </section>

          <section
            v-if="updatesLive"
            aria-labelledby="h-updates"
          >
            <div class="section-head">
              <h2
                id="h-updates"
                class="section-title"
              >
                <GrowIcon name="photo" /> {{ t('profile.plant.updates') }}
              </h2>
              <span
                v-if="consistency"
                class="section-meta num"
              >{{ t('profile.plant.consistency', { n: consistency.updated, total: consistency.weeks }) }}</span>
            </div>

            <div
              v-if="consistency"
              class="consistency"
              :class="{ good: consistency.consistent }"
            >
              <ol
                class="week-cells"
                aria-hidden="true"
              >
                <li
                  v-for="c in weekCells"
                  :key="c.n"
                  :class="{ on: c.on }"
                />
              </ol>
              <span
                v-if="consistency.consistent"
                class="consistent-tag"
              >
                <GrowIcon name="lamp" /> {{ t('profile.plant.consistent') }}
              </span>
            </div>

            <EmptyState
              v-if="!updateCards.length"
              icon="photo"
              :title="t('profile.plant.noUpdates')"
              :text="t('profile.plant.noUpdatesText')"
            />
            <ol
              v-else
              class="updates rise"
            >
              <li
                v-for="u in updateCards"
                :key="u.id"
                class="update card"
              >
                <header class="update-head">
                  <span class="update-week">
                    <span
                      v-if="weekParts[0]"
                      class="update-wlabel"
                      aria-hidden="true"
                    >{{ weekParts[0] }}</span>
                    <span
                      class="update-n num"
                      aria-hidden="true"
                    >{{ u.week_no }}{{ weekParts[2] }}</span>
                    <span
                      v-if="weekParts[1]"
                      class="update-wlabel"
                      aria-hidden="true"
                    >{{ weekParts[1] }}</span>
                    <span class="sr-only">{{ t('profile.plant.weekOf', { n: u.week_no }) }}</span>
                  </span>
                  <span class="update-meta num">
                    <span
                      v-if="u.stage"
                      class="update-stage"
                      :style="{ color: u.stage.color }"
                    ><GrowIcon :name="u.stage.glyph" /> {{ u.stage.label }}</span>
                    <span v-if="u.day != null">{{ t('profile.plant.dayN', { n: u.day }) }}</span>
                    <span>{{ formatDate(u.created_at.slice(0, 10), { day: 'numeric', month: 'short' }) }}</span>
                  </span>
                </header>
                <div
                  v-if="u.images.length"
                  class="update-photos"
                  :class="`n${u.images.length}`"
                >
                  <button
                    v-for="(img, k) in u.images"
                    :key="img"
                    type="button"
                    class="update-photo"
                    :aria-label="t('profile.plant.updatePhoto', { n: u.week_no })"
                    @click="openPhoto(img, $event)"
                  >
                    <img
                      :src="img"
                      alt=""
                      :loading="k === 0 ? 'eager' : 'lazy'"
                      decoding="async"
                    >
                  </button>
                </div>
                <p
                  v-if="u.body"
                  class="update-body"
                  lang="en"
                >
                  {{ u.body }}
                </p>
                <ul
                  v-if="u.chips.length"
                  class="update-chips"
                >
                  <li
                    v-for="c in u.chips"
                    :key="c.key"
                    class="sum-chip num"
                    :style="{ '--c': c.color }"
                  >
                    <GrowIcon :name="c.glyph" />{{ c.label }}
                  </li>
                </ul>
              </li>
            </ol>
          </section>

          <section
            v-if="harvest"
            class="harvest card"
          >
            <h2 class="section-title">
              <GrowIcon name="harvest" /> {{ t('profile.plant.harvest') }}
            </h2>
            <div class="harvest-row">
              <div
                v-if="harvest.wet != null"
                class="h-stat"
              >
                <span class="h-num num">{{ Math.round(harvest.wet) }}<small> g</small></span>
                <span class="h-label">{{ t('profile.plant.wet') }}</span>
              </div>
              <div
                v-if="harvest.dry != null"
                class="h-stat dry"
              >
                <span class="h-num num">{{ Math.round(harvest.dry) }}<small> g</small></span>
                <span class="h-label">{{ t('profile.plant.dry') }}</span>
              </div>
              <div
                v-if="harvest.ratio != null"
                class="h-stat"
              >
                <span class="h-num num">{{ harvest.ratio }}<small> %</small></span>
                <span class="h-label">{{ t('profile.plant.ratio') }}</span>
              </div>
            </div>
          </section>

          <section>
            <div class="section-head">
              <h2 class="section-title">
                <GrowIcon name="stage" /> {{ t('profile.plant.journal') }}
              </h2>
              <span
                v-if="items.length"
                class="section-meta"
              >{{ t('common.entries', { n: items.length }) }}</span>
            </div>
            <EmptyState
              v-if="!items.length"
              icon="note"
              :title="t('profile.plant.noTimeline')"
            />
            <div
              v-else
              class="weeks"
            >
              <section
                v-for="w in weeks"
                :key="w.key"
                class="week"
              >
                <h3 class="week-label">
                  {{ w.label }}
                </h3>
                <ol class="entries rise">
                  <li
                    v-for="it in w.items"
                    :key="it.id"
                    class="entry"
                    :style="{ '--c': it.type === 'stage' ? stageInfo(it.stage).color : entryInfo(it.type).color }"
                  >
                    <span class="entry-dot"><GrowIcon :name="it.type === 'stage' ? stageInfo(it.stage).glyph : entryInfo(it.type).glyph" /></span>
                    <div class="entry-body">
                      <p class="entry-head">
                        <strong>{{ it.type === 'stage' ? stageInfo(it.stage).label : entryInfo(it.type).verb }}</strong>
                        <span class="entry-date num">{{ formatDate(it.date, { day: 'numeric', month: 'short' }) }}</span>
                      </p>
                      <p
                        v-if="it.summary"
                        class="entry-facts num"
                      >
                        {{ it.summary }}
                      </p>
                      <p
                        v-if="it.note"
                        class="entry-note"
                      >
                        {{ it.note }}
                      </p>
                      <div
                        v-if="it.photoUrl"
                        class="entry-photos"
                      >
                        <button
                          type="button"
                          class="entry-photo"
                          :aria-label="t('profile.plant.photo')"
                          @click="openPhoto(it.photoUrl, $event)"
                        >
                          <img
                            :src="it.photoUrl"
                            alt=""
                            loading="lazy"
                          >
                        </button>
                      </div>
                    </div>
                  </li>
                </ol>
              </section>
            </div>
          </section>

          <section>
            <div class="section-head">
              <h2 class="section-title">
                <GrowIcon name="community" /> {{ t('profile.plant.posts') }}
              </h2>
            </div>
            <p
              v-if="!posts.length"
              class="muted no-posts"
            >
              {{ t('profile.plant.noPosts') }}
            </p>
            <ul
              v-else
              class="post-list"
            >
              <li
                v-for="p in posts"
                :key="p.id"
              >
                <NuxtLink
                  :to="`/community/post/${p.id}`"
                  class="post-row card"
                >
                  <img
                    v-if="p.images[0]"
                    :src="p.images[0]"
                    alt=""
                    class="post-thumb"
                    loading="lazy"
                  >
                  <div class="post-text">
                    <p class="post-title">
                      {{ p.title || excerpt(p.body, 80) || t('profile.untitled') }}
                    </p>
                    <p class="post-meta num">
                      <span>{{ communityAgo(p.created_at) }}</span>
                      <span><UIcon name="i-tabler-heart" /> {{ p.likes_count }}</span>
                      <span><UIcon name="i-tabler-message-circle" /> {{ p.comments_count }}</span>
                    </p>
                  </div>
                </NuxtLink>
              </li>
            </ul>
          </section>
        </template>
      </div>

      <PhotoLightbox
        v-model:index="lbIndex"
        :items="photoItems"
        :origin="lbOrigin"
        readonly
      />
    </template>
  </div>
</template>

<style scoped>
.detail {
  padding-bottom: 28px;
}

.missing {
  align-items: flex-start;
  padding-top: calc(12px + var(--safe-top));
}

.missing > :deep(.empty) {
  align-self: stretch;
}

/* ── Hero (mirrors the local plant detail) ── */
.hero {
  position: relative;
  height: 392px;
  overflow: hidden;
}

.hero-img-btn {
  position: absolute;
  inset: 0;
  padding: 0;
  border: 0;
  background: none;
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  -webkit-mask-image: linear-gradient(180deg, #000 42%, rgba(0, 0, 0, 0.55) 72%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 42%, rgba(0, 0, 0, 0.55) 72%, transparent 100%);
}

.hero.lit {
  height: auto;
  padding-top: calc(var(--safe-top) + 68px);
}

.hero.lit .hero-info {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  padding: 16px 20px 8px;
}

.hero.lit h1 {
  text-shadow: none;
}

.hero-tile {
  height: 220px;
  margin: 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  border: 1px solid var(--line);
  background: radial-gradient(85% 90% at 50% 18%,
    color-mix(in srgb, #2f5a2c 72%, var(--stage)) 0%,
    color-mix(in srgb, #0f2412 86%, var(--stage)) 58%,
    #08140a 100%);
  box-shadow: inset 0 1px 0 var(--highlight), var(--panel-shadow);
}

.hero-tile-glyph {
  font-size: 120px;
  color: var(--stage);
  filter: drop-shadow(0 0 22px color-mix(in srgb, var(--stage) 60%, transparent));
}

.hero-shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(7, 8, 10, 0.62) 0%, transparent 24%),
    linear-gradient(0deg, rgba(7, 8, 10, 0.88) 0%, rgba(7, 8, 10, 0.4) 34%, transparent 58%);
  pointer-events: none;
}

.hero-bar {
  position: absolute;
  top: calc(12px + var(--safe-top));
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
}

.bar-btn,
.hero-bar :deep(.more-btn) {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(7, 8, 10, 0.66);
  box-shadow: inset 0 1px 0 var(--highlight);
  color: var(--text);
  transition: transform var(--dur-fast) var(--ease-out);
}

.bar-btn:active {
  transform: scale(0.92);
}

.hero-info {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 8px;
  pointer-events: none;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.stage-badge {
  background: color-mix(in srgb, currentColor 14%, color-mix(in srgb, var(--bg) 88%, transparent));
}

.muted-badge {
  color: var(--text-2);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
}

h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.12;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.7);
  overflow-wrap: anywhere;
}

.hero-strain {
  margin: 4px 0 0;
  color: var(--text-2);
  font-size: 14px;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 20px 0;
}

/* ── Owner ── */
.owner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  transition: transform var(--dur-fast) var(--ease-out);
}

.owner:active {
  transform: scale(0.98);
}

.owner-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.owner-by {
  font-size: 11px;
  color: var(--text-3);
}

.owner-name {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.owner-handle {
  font-weight: 400;
  font-size: 13px;
  color: var(--text-3);
}

.blocked-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--line);
  color: var(--text-2);
  font-size: 14px;
}

/* ── Stage rail ── */
.stage-card {
  padding: 18px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rail {
  position: relative;
}

.rail-stops {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
}

.rail-track {
  position: absolute;
  top: 17px;
  left: calc(100% / 12);
  right: calc(100% / 12);
  height: 2px;
  border-radius: 2px;
  background: #0b0d10;
  box-shadow: inset 0 0 0 1px var(--line);
}

.rail-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--leaf-deep), var(--leaf));
  box-shadow: 0 0 10px rgba(155, 227, 107, 0.55);
  transform: scaleX(var(--fill));
  transform-origin: left;
  animation: rail-sweep 1s var(--ease-out) 0.15s backwards;
}

@keyframes rail-sweep {
  from {
    transform: scaleX(0);
  }
}

.rail-stop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.rail-node {
  position: relative;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #0b0d10;
  box-shadow: inset 0 0 0 1px var(--line-strong);
  color: var(--text-3);
  font-size: 19px;
}

.rail-stop.future .rail-node .grow-icon {
  opacity: 0.55;
}

.rail-stop.done .rail-node {
  color: var(--c);
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--c) 16%, #101317), #0b0d10 75%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 34%, transparent);
}

.rail-stop.current .rail-node {
  color: var(--c);
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--c) 30%, #101317), #0b0d10 80%);
  box-shadow: inset 0 0 0 1.5px var(--c), 0 0 16px color-mix(in srgb, var(--c) 45%, transparent);
}

.rail-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
  white-space: nowrap;
}

.rail-stop.done .rail-label {
  color: var(--text-2);
}

.rail-stop.current .rail-label {
  color: var(--text);
  font-weight: 600;
}

.stage-line {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.strain-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(201, 162, 255, 0.5);
  text-underline-offset: 3px;
}

.strain-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-size: 14px;
  font-weight: 600;
}

.strain-row .grow-icon {
  color: #c9a2ff;
  font-size: 18px;
}

.strain-go {
  margin-left: auto;
  color: var(--text-3);
}

/* ── Follow ── */
.follow-cta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: -6px;
}

.follow-cta .is-following {
  color: var(--leaf);
}

.follow-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
  text-align: center;
}

/* ── Weekly updates ── */
.consistency {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: -2px 0 12px;
}

.week-cells {
  flex: 1;
  display: flex;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.week-cells li {
  flex: 1;
  max-width: 22px;
  height: 6px;
  border-radius: 3px;
  background: var(--surface-3);
}

.week-cells li.on {
  background: var(--leaf);
  box-shadow: 0 0 6px rgba(155, 227, 107, 0.4);
}

.consistent-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--lamp);
  white-space: nowrap;
}

.updates {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.update {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.update-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.update-week {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.update-n {
  font-size: 34px;
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--lamp);
}

.update-wlabel {
  font-size: 14px;
  font-weight: 600;
}

.update-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px 10px;
  font-size: 12px;
  color: var(--text-3);
}

.update-stage {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.update-photos {
  display: grid;
  gap: 4px;
  border-radius: 12px;
  overflow: hidden;
}

.update-photos.n2,
.update-photos.n4 {
  grid-template-columns: 1fr 1fr;
}

.update-photos.n3 {
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.update-photos.n3 .update-photo:first-child {
  grid-row: span 2;
}

.update-photo {
  padding: 0;
  border: 0;
  background: var(--surface);
  aspect-ratio: 1;
  overflow: hidden;
}

.update-photos.n1 .update-photo {
  aspect-ratio: 4 / 3;
}

.update-photos.n3 .update-photo:first-child {
  aspect-ratio: auto;
}

.update-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.update-body {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.update-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sum-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
}

.sum-chip .grow-icon {
  color: var(--c);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
}

.fact .grow-icon,
.fact .iconify {
  color: var(--leaf);
}

/* ── Harvest ── */
.harvest {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.harvest .section-title .grow-icon {
  color: var(--lamp);
}

.harvest-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.h-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.h-num {
  font-size: 28px;
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.h-num small {
  font-size: 13px;
  color: var(--text-3);
}

.h-stat.dry .h-num {
  color: var(--lamp);
}

.h-label {
  font-size: 12px;
  color: var(--text-3);
}

/* ── Diary ── */
.weeks {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.week-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--lamp);
}

.entries {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.entry {
  position: relative;
  display: flex;
  gap: 12px;
  padding-bottom: 14px;
}

.entry:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 16px;
  top: 36px;
  bottom: 2px;
  width: 1px;
  background: var(--line-strong);
}

.entry-dot {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--c);
  font-size: 18px;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--c) 16%, #101317), #0b0d10 75%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 32%, transparent);
}

.entry-body {
  flex: 1;
  min-width: 0;
  padding-top: 6px;
}

.entry-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  font-size: 14px;
}

.entry-head strong {
  font-weight: 600;
}

.entry-date {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
}

.entry-facts {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.entry-note {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.entry-photos {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.entry-photo {
  flex-shrink: 0;
  width: 88px;
  height: 88px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
  transition: transform var(--dur-fast) var(--ease-out);
}

.entry-photo:active {
  transform: scale(0.95);
}

.entry-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ── Posts ── */
.no-posts {
  margin: 0;
  font-size: 14px;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-row {
  display: flex;
  gap: 12px;
  padding: 12px;
}

.post-thumb {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 12px;
  object-fit: cover;
}

.post-text {
  min-width: 0;
  flex: 1;
}

.post-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.post-meta {
  display: flex;
  gap: 14px;
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.post-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ── Skeletons ── */
.sk {
  display: block;
  border-radius: 16px;
  background: linear-gradient(90deg, var(--surface) 0%, var(--surface-3) 50%, var(--surface) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.sk-hero {
  height: 300px;
  border-radius: 24px;
}

.sk-card {
  height: 110px;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sk,
  .rail-fill {
    animation: none;
  }
}
</style>
