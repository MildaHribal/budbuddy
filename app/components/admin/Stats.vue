<script setup lang="ts">
import type { Bar } from '~/components/BarChart.vue'

interface Analytics {
  users: number
  users7: number
  users30: number
  active7: number
  active30: number
  aiUsers7: number
  unlimited: number
  banned: number
  posts: number
  posts7: number
  comments7: number
  deletionOpen: number
  signups: { day: string, n: number }[]
  ai: { day: string, text: number, photo: number }[]
}

const { t } = useI18n()
const sb = useSupabase()

const data = ref<Analytics | null>(null)
const downloads = ref<{ total: number, latest: number } | null>(null)
const loading = ref(false)
const failed = ref(false)

async function loadDownloads() {
  const res = await fetch('https://api.github.com/repos/MildaHribal/budbuddy/releases?per_page=100', { signal: AbortSignal.timeout(8000) }).catch(() => null)
  if (!res?.ok) return
  const list = await res.json().catch(() => []) as { assets?: { name?: string, download_count?: number }[] }[]
  const count = (r: typeof list[number]) => (r.assets ?? []).filter(a => a.name?.endsWith('.apk')).reduce((n, a) => n + (a.download_count ?? 0), 0)
  downloads.value = { total: list.reduce((n, r) => n + count(r), 0), latest: list[0] ? count(list[0]) : 0 }
}

async function load() {
  loading.value = true
  failed.value = false
  const [res] = await Promise.all([sb.rpc('admin_analytics'), loadDownloads()])
  loading.value = false
  if (res.error) failed.value = true
  else data.value = res.data as Analytics
}
onMounted(load)

const short = (iso: string) => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'numeric' }).format(new Date(`${iso}T12:00:00Z`))
const signupBars = computed<Bar[]>(() => (data.value?.signups ?? []).map(d => ({ label: short(d.day), value: d.n })))
const aiBars = computed<Bar[]>(() => (data.value?.ai ?? []).map(d => ({
  label: short(d.day),
  value: d.text + d.photo,
  hint: t('admin.stats.aiSplit', { text: d.text, photo: d.photo })
})))
const sum = (bars: Bar[]) => bars.reduce((n, b) => n + b.value, 0)

const tiles = computed(() => {
  const d = data.value
  if (!d) return []
  return [
    { key: 'users', value: d.users, sub: t('admin.stats.new7', { n: d.users7 }) },
    { key: 'active7', value: d.active7, sub: t('admin.stats.active30') + `: ${d.active30}` },
    { key: 'aiUsers7', value: d.aiUsers7 },
    { key: 'unlimited', value: d.unlimited },
    ...(downloads.value ? [{ key: 'downloads', value: downloads.value.total, sub: t('admin.stats.downloadsLatest', { n: downloads.value.latest }) }] : []),
    { key: 'posts', value: d.posts, sub: t('admin.stats.posts7', { n: d.posts7 }) },
    { key: 'comments7', value: d.comments7 },
    { key: 'deletionOpen', value: d.deletionOpen, warn: d.deletionOpen > 0 },
    { key: 'banned', value: d.banned }
  ]
})
</script>

<template>
  <div class="stack">
    <div
      v-if="failed"
      class="error card"
    >
      <p class="muted">
        {{ t('admin.loadError') }}
      </p>
      <button
        type="button"
        class="btn btn-soft"
        @click="load"
      >
        <UIcon name="i-tabler-refresh" />{{ t('admin.retry') }}
      </button>
    </div>
    <div
      v-else-if="!data"
      class="sk"
    />
    <template v-else>
      <div class="tiles">
        <div
          v-for="tile in tiles"
          :key="tile.key"
          class="card tile"
          :class="{ warn: tile.warn }"
        >
          <span class="tile-label">{{ t(`admin.stats.${tile.key}`) }}</span>
          <strong class="tile-value num">{{ formatNumber(tile.value) }}</strong>
          <span
            v-if="tile.sub"
            class="tile-sub num"
          >{{ tile.sub }}</span>
        </div>
      </div>

      <section class="card pad chart">
        <h3>{{ t('admin.stats.signups') }}</h3>
        <BarChart
          :bars="signupBars"
          :label="t('admin.stats.signupsAria', { n: sum(signupBars) })"
        />
      </section>
      <section class="card pad chart">
        <h3>{{ t('admin.stats.ai') }}</h3>
        <BarChart
          :bars="aiBars"
          :label="t('admin.stats.aiAria', { n: sum(aiBars) })"
        />
      </section>
      <p class="field-hint">
        {{ t('admin.stats.note') }}
      </p>
      <button
        type="button"
        class="btn btn-soft"
        :disabled="loading"
        @click="load"
      >
        <UIcon
          name="i-tabler-refresh"
          :class="{ 'animate-spin': loading }"
        />{{ t('admin.stats.refresh') }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.pad {
  padding: 16px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
}

.tile-label {
  font-size: 12px;
  color: var(--text-3);
}

.tile-value {
  font-size: 24px;
  line-height: 1.2;
}

.tile-sub {
  font-size: 12px;
  color: var(--text-2);
}

.tile.warn .tile-value {
  color: var(--amber);
}

.chart h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}

.sk {
  height: 320px;
  border-radius: var(--radius-card, 14px);
  background: var(--well);
}
</style>
