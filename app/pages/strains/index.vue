<script setup lang="ts">
import { useOnlineRetry } from '~/utils/feed/online'
import type { Strain, StrainStats } from '~/utils/strains'

const { t } = useI18n()
useHead({ title: () => t('strains.title') })

const { requireAuth } = useAuth()

const PAGE = 20
const DOMS = ['indica', 'sativa', 'hybrid'] as const

const query = ref('')
const debounced = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(query, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => (debounced.value = v.trim()), 250)
})
const dom = ref<string | null>(null)
const flow = ref<'auto' | 'photo' | null>(null)

const strains = ref<Strain[]>([])
const stats = reactive(new Map<string, StrainStats>())
const loading = ref(false)
const done = ref(false)
const error = ref<'offline' | 'error' | null>(null)
let seq = 0

async function loadPage(reset = false) {
  if (loading.value && !reset) return
  if (reset) {
    strains.value = []
    done.value = false
  }
  if (done.value) return
  const my = ++seq
  loading.value = true
  error.value = null
  const sb = useSupabase()
  const term = debounced.value.replace(/[%*,()\\]/g, ' ').trim()
  const from = strains.value.length
  const { data, error: err } = await withStrainColumns((cols) => {
    let q = sb.from('strains').select(cols).eq('approved', true)
    if (term) q = q.or(`name.ilike.%${term}%,breeder.ilike.%${term}%`)
    if (dom.value) q = q.eq('dominance', dom.value)
    if (flow.value) q = q.eq('flowering', flow.value)
    return q.order('name').range(from, from + PAGE - 1)
  })
  if (my !== seq) return
  loading.value = false
  if (err) {
    error.value = navigator.onLine ? 'error' : 'offline'
    return
  }
  const rows = (data ?? []) as unknown as Strain[]
  strains.value = [...strains.value, ...rows]
  if (rows.length < PAGE) done.value = true
  if (rows.length) {
    const { data: st } = await sb.from('strain_stats').select('*').in('strain_id', rows.map(r => r.id))
    for (const s of (st ?? []) as StrainStats[]) stats.set(s.strain_id, s)
  }
}

watch([debounced, dom, flow], () => loadPage(true))

const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null
onMounted(() => {
  loadPage(true)
  io = new IntersectionObserver((e) => {
    if (e[0]?.isIntersecting && !loading.value && !done.value && !error.value && strains.value.length) loadPage()
  }, { rootMargin: '400px' })
  if (sentinel.value) io.observe(sentinel.value)
})
onBeforeUnmount(() => {
  io?.disconnect()
  clearTimeout(timer)
})

function weeks(s: Strain): string | null {
  const a = s.flowering_weeks_min
  const b = s.flowering_weeks_max
  if (a && b && a !== b) return t('strains.weeks', { min: a, max: b })
  if (a || b) return t('strains.weeksOne', { n: (a ?? b)! })
  return null
}

const suggestOpen = ref(false)
function suggest() {
  if (requireAuth()) suggestOpen.value = true
}

const loaded = reactive(new Set<string>())
const failed = reactive(new Set<string>())
useOnlineRetry(() => !!error.value, () => loadPage(!strains.value.length))
</script>

<template>
  <div>
    <AppHeader
      :title="t('strains.title')"
      :subtitle="t('strains.subtitle')"
      back
    >
      <template #actions>
        <button
          type="button"
          class="icon-btn accent"
          :aria-label="t('strains.suggest')"
          @click="suggest"
        >
          <UIcon name="i-tabler-plus" />
        </button>
      </template>
    </AppHeader>

    <div class="page">
      <div class="controls">
        <label class="search">
          <UIcon
            name="i-tabler-search"
            class="search-icon"
          />
          <input
            v-model="query"
            class="input"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            :placeholder="t('strains.search')"
            :aria-label="t('strains.search')"
          >
        </label>
        <div class="chips filter-row">
          <button
            type="button"
            class="chip"
            :aria-pressed="!dom && !flow"
            @click="dom = null; flow = null"
          >
            {{ t('strains.all') }}
          </button>
          <button
            v-for="d in DOMS"
            :key="d"
            type="button"
            class="chip"
            :aria-pressed="dom === d"
            @click="dom = dom === d ? null : d"
          >
            <UIcon
              :name="dominanceIcon(d)"
              class="dom-icon"
            />{{ t(`strains.dominance.${d}`) }}
          </button>
          <span
            class="divider"
            aria-hidden="true"
          />
          <button
            type="button"
            class="chip"
            :aria-pressed="flow === 'auto'"
            @click="flow = flow === 'auto' ? null : 'auto'"
          >
            {{ t('strains.flowering.auto') }}
          </button>
          <button
            type="button"
            class="chip"
            :aria-pressed="flow === 'photo'"
            @click="flow = flow === 'photo' ? null : 'photo'"
          >
            {{ t('strains.flowering.photo') }}
          </button>
        </div>
      </div>

      <EmptyState
        v-if="error && !strains.length"
        icon="pest"
        :title="t('strains.errorTitle')"
        :text="error === 'offline' ? t('strains.offline') : t('strains.failed')"
      >
        <button
          type="button"
          class="btn btn-soft"
          @click="loadPage(true)"
        >
          <UIcon name="i-tabler-refresh" /> {{ t('strains.retry') }}
        </button>
      </EmptyState>

      <EmptyState
        v-else-if="done && !strains.length"
        icon="flowering"
        :title="t('strains.emptyTitle')"
        :text="t('strains.emptyText')"
      >
        <button
          type="button"
          class="btn btn-soft"
          @click="suggest"
        >
          <UIcon name="i-tabler-plus" /> {{ t('strains.suggest') }}
        </button>
      </EmptyState>

      <div
        v-else
        class="list-wrap"
      >
        <ul class="card list rise">
          <li
            v-for="s in strains"
            :key="s.id"
          >
            <NuxtLink
              :to="`/strains/${s.slug}`"
              class="row"
            >
              <span
                class="thumb"
                :class="{ loaded: !s.image_url || loaded.has(s.id) }"
              >
                <img
                  v-if="s.image_url && !failed.has(s.id)"
                  :src="strainThumb(s.image_url)!"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerpolicy="no-referrer"
                  @load="loaded.add(s.id)"
                  @error="failed.add(s.id)"
                >
                <GrowIcon
                  v-else
                  :name="s.flowering === 'auto' ? 'seedling' : 'flowering'"
                  class="placeholder"
                />
              </span>
              <span class="meta">
                <strong class="name">{{ s.name }}</strong>
                <span class="breeder">{{ isVariousBreeder(s.breeder) ? t('strains.various') : s.breeder || '–' }}</span>
                <span class="facts">
                  <span
                    v-if="s.dominance"
                    class="badge dom"
                    :class="`dom-${s.dominance}`"
                  ><UIcon
                    :name="dominanceIcon(s.dominance)"
                    aria-hidden="true"
                  />{{ t(`strains.dominance.${s.dominance}`) }}</span>
                  <span
                    v-if="s.flowering === 'auto'"
                    class="badge auto"
                  >{{ t('strains.flowering.auto') }}</span>
                  <span
                    v-if="weeks(s)"
                    class="fact num"
                  >{{ weeks(s) }}</span>
                  <span
                    v-if="stats.get(s.id)?.reports"
                    class="fact rating num"
                  >
                    <UIcon name="i-tabler-star-filled" />{{ stats.get(s.id)!.avg_rating ?? '–' }}
                    <template v-if="stats.get(s.id)!.avg_yield_g">
                      · {{ t('strains.gramsShort', { n: stats.get(s.id)!.avg_yield_g! }) }}
                    </template>
                  </span>
                  <span
                    v-else
                    class="fact"
                  >{{ t('strains.noRating') }}</span>
                </span>
              </span>
              <UIcon
                name="i-tabler-chevron-right"
                class="chev"
              />
            </NuxtLink>
          </li>
          <li
            v-for="i in loading ? (strains.length ? 2 : 6) : 0"
            :key="`sk${i}`"
            class="row sk-row"
            aria-hidden="true"
          >
            <span class="thumb sk" />
            <span class="meta">
              <span class="sk sk-line" />
              <span class="sk sk-line short" />
            </span>
          </li>
        </ul>

        <button
          v-if="error && !loading"
          type="button"
          class="btn btn-ghost"
          @click="loadPage()"
        >
          <UIcon name="i-tabler-refresh" /> {{ t('strains.retry') }}
        </button>

        <div
          v-else-if="done && !loading"
          class="end"
        >
          <p>{{ t('strains.suggestText') }}</p>
          <button
            type="button"
            class="btn btn-soft"
            @click="suggest"
          >
            <UIcon name="i-tabler-plus" /> {{ t('strains.suggest') }}
          </button>
        </div>
      </div>
      <div
        ref="sentinel"
        aria-hidden="true"
      />
    </div>

    <CommunityStrainSuggestSheet
      v-model:open="suggestOpen"
      :initial-name="query"
    />
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: -12px;
}

.search {
  position: relative;
  display: block;
}

.search .input {
  padding-left: 42px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  font-size: 18px;
  pointer-events: none;
}

.filter-row {
  margin: 0 -16px;
  padding: 0 16px 2px;
}

.filter-row .chip {
  min-height: 44px;
}

.dom-icon {
  font-size: 16px;
  color: var(--text-3);
}

.filter-row .chip[aria-pressed='true'] .dom-icon {
  color: inherit;
}

.divider {
  flex-shrink: 0;
  width: 1px;
  margin: 8px 4px;
  background: var(--line-strong);
}

.list-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: hidden;
}

.list li + li {
  border-top: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 10px 10px 10px 12px;
  color: var(--text);
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.row:active {
  transform: scale(0.985);
}

.thumb {
  position: relative;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
  color: var(--text-3);
  background: var(--surface-3);
}

.thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity var(--dur) ease;
}

.thumb.loaded img {
  opacity: 1;
}

.placeholder {
  font-size: 26px;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.breeder {
  color: var(--text-2);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-top: 4px;
}

.dom .iconify {
  font-size: 12px;
}

.dom-indica {
  color: var(--blue);
}

.dom-sativa {
  color: var(--amber);
}

.dom-hybrid {
  color: var(--green);
}

.auto {
  color: var(--text-2);
}

.fact {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-3);
}

.rating .iconify {
  font-size: 13px;
  color: var(--amber);
}

.chev {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--text-3);
}

.sk {
  display: block;
  background: var(--surface-3);
}

.sk-line {
  height: 12px;
  border-radius: 6px;
  margin-top: 4px;
  width: 70%;
}

.sk-line.short {
  width: 40%;
}

.end {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 8px 0;
  text-align: center;
}

.end p {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}
</style>
