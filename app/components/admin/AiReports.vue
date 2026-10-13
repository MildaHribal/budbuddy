<script setup lang="ts">
interface AiMeta { question?: string, answer?: string, model?: string, lang?: string, had_photo?: boolean }
interface AiReport { id: string, target_id: string, reason: string, details: string | null, meta: AiMeta | null, created_at: string, reporter_id: string | null }
interface Group { key: string, reports: AiReport[], meta: AiMeta }

const { t } = useI18n()
const { notify } = useNotify()
const sb = useSupabase()

const groups = ref<Group[]>([])
const loading = ref(true)
const failed = ref(false)
const busy = ref<string | null>(null)

async function load() {
  loading.value = true
  failed.value = false
  const { data, error } = await sb.from('reports')
    .select('id, target_id, reason, details, meta, created_at, reporter_id')
    .eq('target_type', 'ai').eq('status', 'open').order('created_at', { ascending: false }).limit(200)
  loading.value = false
  if (error) {
    failed.value = true
    return
  }
  const map = new Map<string, Group>()
  for (const r of (data ?? []) as AiReport[]) {
    let g = map.get(r.target_id)
    if (!g) map.set(r.target_id, (g = { key: r.target_id, reports: [], meta: r.meta ?? {} }))
    g.reports.push(r)
  }
  groups.value = [...map.values()]
}
onMounted(load)

async function close(g: Group, status: 'resolved' | 'dismissed') {
  busy.value = g.key
  const { data: me } = await sb.auth.getUser()
  const { error } = await sb.from('reports').update({ status, resolved_by: me.user?.id ?? null })
    .eq('target_type', 'ai').eq('target_id', g.key).eq('status', 'open')
  busy.value = null
  if (error) return notify(t('admin.failed'), { tone: 'error' })
  groups.value = groups.value.filter(x => x.key !== g.key)
  notify(t(status === 'resolved' ? 'admin.reports.resolved' : 'admin.reports.dismissed'))
}

const when = (iso: string) => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
const reason = (r: string) => t(`admin.ai.reasons.${['offensive', 'dangerous', 'wrong'].includes(r) ? r : 'other'}`)
</script>

<template>
  <div class="stack">
    <template v-if="loading">
      <div
        v-for="i in 2"
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
      :title="t('admin.ai.empty')"
      :text="t('admin.ai.emptyText')"
    />
    <ul
      v-else
      class="list rise"
    >
      <li
        v-for="g in groups"
        :key="g.key"
        class="item"
        :class="{ busy: busy === g.key }"
      >
        <div class="item-head">
          <span class="count badge">{{ t('admin.reports.count', { n: g.reports.length }) }}</span>
          <span
            v-if="g.meta.model"
            class="model"
          >{{ g.meta.model }}<template v-if="g.meta.lang"> · {{ g.meta.lang }}</template></span>
        </div>
        <div class="qa">
          <span class="qa-label">{{ t('admin.ai.question') }}</span>
          <p class="qa-text">
            {{ g.meta.question || '—' }}
          </p>
          <span class="qa-label">{{ t('admin.ai.answer') }}</span>
          <p class="qa-text answer">
            {{ g.meta.answer || '—' }}
          </p>
        </div>
        <ul class="notes">
          <li
            v-for="r in g.reports"
            :key="r.id"
          >
            <span class="note-meta">{{ reason(r.reason) }} · {{ when(r.created_at) }}<template v-if="!r.reporter_id"> · {{ t('admin.ai.anonymous') }}</template></span>
            <p
              v-if="r.details"
              class="note"
            >
              {{ r.details }}
            </p>
          </li>
        </ul>
        <div class="actions">
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
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.count {
  flex-shrink: 0;
  color: var(--red);
}

.model {
  font-size: 12px;
  color: var(--text-3);
  overflow-wrap: anywhere;
}

.qa {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.qa-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
}

.qa-text {
  margin: 0 0 6px;
  font-size: 14px;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.answer {
  max-height: 240px;
  overflow-y: auto;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--well);
  color: var(--text-2);
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.note-meta {
  font-size: 12px;
  color: var(--text-2);
}

.note {
  margin: 2px 0 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}
</style>
