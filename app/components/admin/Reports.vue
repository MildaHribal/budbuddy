<script setup lang="ts">
import { MOD_TARGETS, type ModAuthor, type ModPreview, type ModTarget } from '~/composables/useModeration'

interface ReportRow {
  id: string
  target_type: ModTarget
  target_id: string
  reason: string
  details: string | null
  created_at: string
  reporter: { username: string } | null
}

interface Group {
  key: string
  type: ModTarget
  id: string
  reports: ReportRow[]
  reasons: { reason: string, n: number }[]
  preview: ModPreview | null
  author: ModAuthor | null
}

const { t } = useI18n()
const { notify } = useNotify()
const { confirm } = useConfirm()
const mod = useModeration()

const groups = ref<Group[]>([])
const loading = ref(true)
const failed = ref(false)
const busy = ref<string | null>(null)

async function load() {
  loading.value = true
  failed.value = false
  try {
    const { data, error } = await useSupabase().from('reports')
      .select('id, target_type, target_id, reason, details, created_at, reporter:profiles!reports_reporter_id_fkey(username)')
      .eq('status', 'open').order('created_at', { ascending: false }).limit(300)
    if (error) throw error
    const map = new Map<string, Group>()
    for (const r of (data ?? []) as unknown as ReportRow[]) {
      const key = `${r.target_type}:${r.target_id}`
      let g = map.get(key)
      if (!g) map.set(key, (g = { key, type: r.target_type, id: r.target_id, reports: [], reasons: [], preview: null, author: null }))
      g.reports.push(r)
    }
    const list = [...map.values()]
    for (const g of list) {
      const counts = new Map<string, number>()
      for (const r of g.reports) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1)
      g.reasons = [...counts].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n)
    }
    const types = [...new Set(list.map(g => g.type))]
    const previews = await Promise.all(types.map(type => mod.fetchTargets(type, list.filter(g => g.type === type).map(g => g.id))))
    types.forEach((type, i) => list.filter(g => g.type === type).forEach(g => (g.preview = previews[i]!.get(g.id) ?? null)))
    const authors = await mod.fetchAuthors(list.map(g => g.preview?.authorId ?? null))
    for (const g of list) g.author = g.preview?.authorId ? authors.get(g.preview.authorId) ?? null : null
    groups.value = list.sort((a, b) => b.reports.length - a.reports.length)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function run(g: Group, fn: () => Promise<void>, done?: string) {
  busy.value = g.key
  try {
    await fn()
    if (done) notify(done)
  } catch {
    notify(t('admin.failed'), { tone: 'error' })
  } finally {
    busy.value = null
  }
}

const drop = (g: Group) => (groups.value = groups.value.filter(x => x.key !== g.key))

const toggleHidden = (g: Group) => run(g, async () => {
  const next = !g.preview?.isHidden
  await mod.setHidden(g.type, g.id, next)
  if (g.preview) g.preview.isHidden = next
})

const close = (g: Group, status: 'resolved' | 'dismissed') => run(g, async () => {
  await mod.closeReports(g.type, g.id, status)
  drop(g)
}, t(status === 'resolved' ? 'admin.reports.resolved' : 'admin.reports.dismissed'))

async function toggleBan(g: Group) {
  const a = g.author
  if (!a || a.is_admin) return
  const name = a.display_name || a.username
  if (!a.is_banned && !(await confirm({ title: t('admin.reports.banConfirm', { name }), message: t('admin.reports.banText'), confirmLabel: t('admin.reports.ban'), danger: true }))) return
  await run(g, async () => {
    await mod.setBanned(a.id, !a.is_banned)
    for (const x of groups.value) if (x.author?.id === a.id) x.author.is_banned = !a.is_banned
  })
}

async function remove(g: Group) {
  if (!(await confirm({ title: t('admin.reports.deleteConfirm'), message: t('admin.reports.deleteText'), confirmLabel: t('admin.reports.delete'), danger: true }))) return
  await run(g, async () => {
    await mod.deleteTarget(g.type, g.id)
    await mod.closeReports(g.type, g.id, 'resolved')
    drop(g)
  }, t('admin.reports.deleted'))
}

const when = (iso: string) => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short' }).format(new Date(iso))
</script>

<template>
  <div class="stack">
    <template v-if="loading">
      <div
        v-for="i in 3"
        :key="i"
        class="sk"
      />
    </template>
    <div
      v-else-if="failed"
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
    <EmptyState
      v-else-if="!groups.length"
      icon="spark"
      :title="t('admin.reports.empty')"
      :text="t('admin.reports.emptyText')"
    />
    <ul
      v-else
      class="list rise"
    >
      <li
        v-for="g in groups"
        :key="g.key"
        class="item card"
        :class="{ busy: busy === g.key }"
      >
        <div class="item-head">
          <span class="count badge">{{ t('admin.reports.count', { n: g.reports.length }) }}</span>
          <div class="reasons">
            <span
              v-for="r in g.reasons"
              :key="r.reason"
              class="reason"
            >{{ t(`report.reasons.${r.reason}`) }}<b v-if="r.n > 1"> ×{{ r.n }}</b></span>
          </div>
        </div>

        <AdminTargetPreview
          :type="g.type"
          :preview="g.preview"
          :author="g.author"
        />

        <details class="who">
          <summary>{{ t('admin.reports.reporters') }}</summary>
          <ul>
            <li
              v-for="r in g.reports"
              :key="r.id"
            >
              <span class="who-name">@{{ r.reporter?.username ?? '?' }}</span>
              <span class="who-meta">{{ t(`report.reasons.${r.reason}`) }} · {{ when(r.created_at) }}</span>
              <p
                v-if="r.details"
                class="who-details"
              >
                {{ r.details }}
              </p>
            </li>
          </ul>
        </details>

        <div class="actions">
          <button
            v-if="MOD_TARGETS[g.type].hideable && g.preview"
            type="button"
            class="btn btn-lamp"
            :disabled="busy === g.key"
            @click="toggleHidden(g)"
          >
            <UIcon :name="g.preview.isHidden ? 'i-tabler-eye' : 'i-tabler-eye-off'" />
            {{ g.preview.isHidden ? t('admin.reports.unhide') : t('admin.reports.hide') }}
          </button>
          <button
            type="button"
            class="btn btn-soft"
            :disabled="busy === g.key"
            @click="close(g, 'resolved')"
          >
            <UIcon name="i-tabler-check" />{{ t('admin.reports.resolve') }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="busy === g.key"
            @click="close(g, 'dismissed')"
          >
            <UIcon name="i-tabler-x" />{{ t('admin.reports.dismiss') }}
          </button>
          <button
            v-if="g.author && !g.author.is_admin"
            type="button"
            class="btn btn-danger"
            :disabled="busy === g.key"
            @click="toggleBan(g)"
          >
            <UIcon name="i-tabler-ban" />{{ g.author.is_banned ? t('admin.reports.unban') : t('admin.reports.ban') }}
          </button>
          <button
            v-if="g.preview && g.type !== 'profile'"
            type="button"
            class="btn btn-danger"
            :disabled="busy === g.key"
            @click="remove(g)"
          >
            <UIcon name="i-tabler-trash" />{{ t('admin.reports.delete') }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.item-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.count {
  flex-shrink: 0;
  color: var(--pink);
}

.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 12px;
  color: var(--text-2);
}

.reason b {
  color: var(--text);
}

.who summary {
  min-height: 32px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--leaf);
  cursor: pointer;
}

.who ul {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}

.who li {
  padding: 8px 10px;
  border-radius: 10px;
  background: #0b0d10;
}

.who-name {
  font-size: 13px;
  font-weight: 600;
}

.who-meta {
  margin-left: 6px;
  font-size: 12px;
  color: var(--text-3);
}

.who-details {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-2);
  overflow-wrap: anywhere;
}
</style>
