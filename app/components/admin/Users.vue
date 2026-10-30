<script setup lang="ts">
interface UserRow {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  reputation: number
  is_admin: boolean
  is_banned: boolean
  created_at: string
  email: string | null
  last_sign_in_at: string | null
  ai_unlimited: boolean
  note: string | null
}

interface Stats { posts: number, tips: number, reports: number }

const { t } = useI18n()
const { notify } = useNotify()
const { confirm } = useConfirm()
const sb = useSupabase()
const mod = useModeration()

const route = useRoute()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const results = ref<UserRow[]>([])
const searching = ref(false)
const failed = ref(false)
const searched = ref(false)
const expanded = ref<string | null>(null)
const stats = reactive(new Map<string, Stats>())
const busy = ref<string | null>(null)

let seq = 0
async function search() {
  const q = query.value.trim().toLowerCase()
  if (q.replace(/^@/, '').length < 2) {
    results.value = []
    searched.value = false
    return
  }
  const mine = ++seq
  searching.value = true
  failed.value = false
  // e-mail lives in auth.users, so the search goes through an admin-only RPC
  const found = await sb.rpc('admin_find_users', { q })
  const ids = ((found.data ?? []) as { id: string }[]).map(r => r.id)
  const profiles = ids.length && !found.error
    ? await sb.from('profiles').select('id, avatar_url, bio, reputation').in('id', ids)
    : { data: [], error: null }
  if (mine !== seq) return
  searching.value = false
  searched.value = true
  if (found.error || profiles.error) {
    failed.value = true
    return
  }
  const extra = new Map(((profiles.data ?? []) as Pick<UserRow, 'id' | 'avatar_url' | 'bio' | 'reputation'>[]).map(p => [p.id, p]))
  results.value = ((found.data ?? []) as UserRow[]).map(u => ({
    ...u,
    username: u.username ?? '',
    avatar_url: extra.get(u.id)?.avatar_url ?? null,
    bio: extra.get(u.id)?.bio ?? null,
    reputation: extra.get(u.id)?.reputation ?? 0
  }))
}

const debounced = useDebounceFn(search, 300)
watch(query, () => debounced())
watch(() => route.query.q, (q) => {
  if (typeof q === 'string' && q) query.value = q
})

interface Pending { user_id: string, email: string, username: string | null, clicks: number, last_at: string }
const pending = ref<Pending[]>([])
async function loadPending() {
  const { data } = await sb.rpc('admin_payment_clicks')
  pending.value = (data ?? []) as Pending[]
}
onMounted(() => {
  loadPending()
  if (query.value) search()
})
onActivated(loadPending)
const ago = (iso: string) => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

async function toggle(u: UserRow) {
  expanded.value = expanded.value === u.id ? null : u.id
  if (expanded.value !== u.id || stats.has(u.id)) return
  const head = { count: 'exact', head: true } as const
  const [posts, tips, reports] = await Promise.all([
    sb.from('posts').select('id', head).eq('author_id', u.id),
    sb.from('tips').select('id', head).eq('author_id', u.id),
    sb.from('reports').select('id', head).eq('target_type', 'profile').eq('target_id', u.id)
  ])
  stats.set(u.id, { posts: posts.count ?? 0, tips: tips.count ?? 0, reports: reports.count ?? 0 })
}

async function toggleBan(u: UserRow) {
  if (u.is_admin) return notify(t('admin.users.cantBanAdmin'), { tone: 'info' })
  const name = u.display_name || u.username
  const ban = !u.is_banned
  if (ban && !(await confirm({ title: t('admin.users.banConfirm', { name }), message: t('admin.users.banText'), confirmLabel: t('admin.users.ban'), danger: true }))) return
  busy.value = u.id
  try {
    await mod.setBanned(u.id, ban)
    u.is_banned = ban
    notify(t(ban ? 'admin.users.bannedDone' : 'admin.users.unbannedDone', { name }))
  } catch {
    notify(t('admin.failed'), { tone: 'error' })
  } finally {
    busy.value = null
  }
}

const notes = reactive(new Map<string, string>())
async function toggleUnlimited(u: UserRow) {
  const name = u.email || u.display_name || u.username
  const on = !u.ai_unlimited
  if (on && !(await confirm({ title: t('admin.users.unlimitedConfirm', { name }), message: t('admin.users.unlimitedText'), confirmLabel: t('admin.users.unlimitedOn') }))) return
  busy.value = u.id
  try {
    const note = notes.get(u.id)?.trim() || null
    const { error } = await sb.rpc('admin_set_ai_unlimited', { uid: u.id, enabled: on, note })
    if (error) throw error
    u.ai_unlimited = on
    if (note) u.note = note
    loadPending()
    notify(t(on ? 'admin.users.unlimitedDone' : 'admin.users.unlimitedOffDone', { name }))
  } catch {
    notify(t('admin.failed'), { tone: 'error' })
  } finally {
    busy.value = null
  }
}

const joined = (iso: string) => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
</script>

<template>
  <div class="stack">
    <section
      v-if="pending.length"
      class="card pending"
      :aria-label="t('admin.users.pendingTitle')"
    >
      <h3>{{ t('admin.users.pendingTitle') }}</h3>
      <p class="field-hint">
        {{ t('admin.users.pendingHint') }}
      </p>
      <button
        v-for="p in pending"
        :key="p.user_id"
        type="button"
        class="pending-row"
        @click="query = p.email"
      >
        <span class="pending-text">
          <strong>{{ p.email }}</strong>
          <span class="num">{{ p.username ? `@${p.username} · ` : '' }}{{ t('admin.users.pendingClicks', { n: p.clicks, when: ago(p.last_at) }) }}</span>
        </span>
        <UIcon
          name="i-tabler-chevron-right"
          class="chev"
        />
      </button>
    </section>
    <label class="search">
      <UIcon
        name="i-tabler-search"
        class="search-icon"
      />
      <span class="sr-only">{{ t('admin.users.search') }}</span>
      <input
        v-model="query"
        type="search"
        class="input"
        :placeholder="t('admin.users.search')"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        enterkeyhint="search"
        @keydown.enter.prevent="search"
      >
    </label>

    <p
      v-if="!searched && !searching"
      class="field-hint"
    >
      {{ t('admin.users.hint') }}
    </p>
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
        @click="search"
      >
        <UIcon name="i-tabler-refresh" />{{ t('admin.retry') }}
      </button>
    </div>
    <p
      v-else-if="searched && !results.length && !searching"
      class="muted none"
    >
      {{ t('admin.users.none') }}
    </p>

    <ul
      v-if="results.length"
      class="list"
    >
      <li
        v-for="u in results"
        :key="u.id"
        class="item"
        :class="{ busy: busy === u.id }"
      >
        <button
          type="button"
          class="user"
          :aria-expanded="expanded === u.id"
          @click="toggle(u)"
        >
          <CommunityUserAvatar
            :url="u.avatar_url"
            :name="u.display_name || u.username"
            :size="40"
          />
          <span class="user-text">
            <span class="user-name">{{ u.display_name || u.username }}</span>
            <span class="user-handle">{{ u.username ? `@${u.username}` : t('admin.users.noProfile') }}<template v-if="u.email"> · {{ u.email }}</template></span>
          </span>
          <span
            v-if="u.is_admin"
            class="badge admin-badge"
          >{{ t('admin.users.admin') }}</span>
          <span
            v-if="u.is_banned"
            class="badge banned-badge"
          >{{ t('admin.users.banned') }}</span>
          <span
            v-if="u.ai_unlimited"
            class="badge unlimited-badge"
          >{{ t('admin.users.unlimited') }}</span>
          <UIcon
            name="i-tabler-chevron-down"
            class="chev"
            :class="{ open: expanded === u.id }"
          />
        </button>

        <div
          v-if="expanded === u.id"
          class="detail"
        >
          <p
            v-if="u.bio"
            class="bio"
          >
            {{ u.bio }}
          </p>
          <p class="facts num">
            <span>{{ t('admin.users.joined', { date: joined(u.created_at) }) }}</span>
            <span>{{ t('admin.users.reputation', { n: u.reputation }) }}</span>
            <span v-if="u.last_sign_in_at">{{ t('admin.users.lastSignIn', { date: joined(u.last_sign_in_at) }) }}</span>
            <template v-if="stats.get(u.id)">
              <span>{{ t('admin.users.posts', { n: stats.get(u.id)!.posts }) }}</span>
              <span>{{ t('admin.users.tips', { n: stats.get(u.id)!.tips }) }}</span>
              <span :class="{ warn: stats.get(u.id)!.reports }">{{ t('admin.users.reportsAgainst', { n: stats.get(u.id)!.reports }) }}</span>
            </template>
          </p>
          <div
            v-if="!u.is_admin"
            class="unlimited"
          >
            <p
              v-if="u.note"
              class="bio"
            >
              {{ t('admin.users.note') }}: {{ u.note }}
            </p>
            <input
              :value="notes.get(u.id) ?? ''"
              class="input"
              maxlength="500"
              :placeholder="t('admin.users.notePlaceholder')"
              :aria-label="t('admin.users.note')"
              @input="notes.set(u.id, ($event.target as HTMLInputElement).value)"
            >
            <button
              type="button"
              class="btn"
              :class="u.ai_unlimited ? 'btn-soft' : 'btn-primary'"
              :disabled="busy === u.id"
              @click="toggleUnlimited(u)"
            >
              <UIcon name="i-tabler-infinity" />
              {{ u.ai_unlimited ? t('admin.users.unlimitedOff') : t('admin.users.unlimitedOn') }}
            </button>
          </div>
          <div
            v-if="!u.is_admin"
            class="actions"
          >
            <button
              type="button"
              class="btn"
              :class="u.is_banned ? 'btn-soft' : 'btn-danger'"
              :disabled="busy === u.id"
              @click="toggleBan(u)"
            >
              <UIcon :name="u.is_banned ? 'i-tabler-circle-check' : 'i-tabler-ban'" />
              {{ u.is_banned ? t('admin.users.unban') : t('admin.users.ban') }}
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search {
  position: relative;
  display: block;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  translate: 0 -50%;
  font-size: 18px;
  color: var(--text-3);
  pointer-events: none;
}

.search .input {
  padding-left: 42px;
}

.none {
  margin: 0;
  font-size: 13px;
}

.user {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
}

.user-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.user-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
}

.user-handle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-3);
}

.admin-badge { color: var(--green); }
.banned-badge { color: var(--red); }
.unlimited-badge { color: var(--amber); }

.pending {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-color: var(--amber);
}

.pending h3 {
  margin: 0;
  font-size: 15px;
}

.pending-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 6px 0;
  border: 0;
  border-top: 1px solid var(--line);
  background: none;
  color: inherit;
  text-align: left;
}

.pending-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.pending-text strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.pending-text span {
  font-size: 12px;
  color: var(--text-3);
}

.unlimited {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chev {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--text-3);
  transition: transform var(--dur) var(--ease-out);
}

.chev.open {
  transform: rotate(180deg);
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.bio {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
  overflow-wrap: anywhere;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.facts .warn {
  color: var(--red);
}
</style>
