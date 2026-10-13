<script setup lang="ts">
import { intlLocale } from '~/utils/locale'
import { HELP_CATEGORIES } from '~/utils/feed/feed'
import { challengeTitle } from '~/utils/challenge'

const emit = defineEmits<{ unanswered: [] }>()

const { t } = useI18n()
const { user, profile } = useAuth()

const KEY = 'bb.feed.weekHidden'

/** Monday of this week, local, YYYY-MM-DD */
function mondayOf(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  return m
}
const monday = mondayOf()
const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

const hidden = ref(false)
try {
  hidden.value = localStorage.getItem(KEY) === weekKey
} catch { /* storage blocked */ }

function dismiss() {
  hidden.value = true
  try {
    localStorage.setItem(KEY, weekKey)
  } catch { /* storage blocked */ }
}

interface Tip { id: string, body: string }
interface Challenge { slug: string, title: string, title_cs: string | null, ends_at: string, voting_ends_at: string }

const diaries = ref(0)
const waiting = ref(0)
const matching = ref(false)
const tip = ref<Tip | null>(null)
const challenge = ref<Challenge | null>(null)
const loaded = ref(false)

async function load() {
  if (hidden.value) return
  const sb = useSupabase()
  const since = monday.toISOString()
  const uid = user.value?.id ?? null
  const media = profile.value?.media ?? []

  const diariesQ = (async () => {
    if (!uid) return 0
    const { data: f } = await sb.from('follows').select('following_id').eq('follower_id', uid).limit(500)
    const ids = (f ?? []).map(r => r.following_id as string)
    if (!ids.length) return 0
    const { data, error } = await sb.from('plant_updates').select('plant_id').in('owner_id', ids).gte('created_at', since).limit(200)
    return error ? 0 : new Set((data ?? []).map(r => r.plant_id as string)).size
  })()

  const waitingQ = (async () => {
    const base = () => {
      let q = sb.from('posts').select('id', { count: 'exact', head: true })
        .in('category', HELP_CATEGORIES as string[])
        .is('accepted_comment_id', null)
        .eq('comments_count', 0)
        .gte('created_at', new Date(Date.now() - 14 * 86_400_000).toISOString())
      if (uid) q = q.neq('author_id', uid)
      return q
    }
    if (media.length) {
      const { count, error } = await base().in('plant_context->>medium', media)
      if (!error && count) return { n: count, match: true }
    }
    const { count } = await base()
    return { n: count ?? 0, match: false }
  })()

  const tipQ = sb.from('tips').select('id, body').gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()).gt('helpful_count', 0).order('score', { ascending: false }).limit(1).maybeSingle()
  const challengeQ = sb.from('challenges').select('*').gt('voting_ends_at', new Date().toISOString()).lte('starts_at', new Date().toISOString()).order('ends_at', { ascending: true }).limit(1).maybeSingle()

  const [d, w, tp, ch] = await Promise.all([diariesQ.catch(() => 0), waitingQ.catch(() => ({ n: 0, match: false })), tipQ, challengeQ])
  diaries.value = d
  waiting.value = w.n
  matching.value = w.match
  tip.value = (tp.data as Tip | null) ?? null
  challenge.value = (ch.data as Challenge | null) ?? null
  loaded.value = true
}

onMounted(load)
watch(() => user.value?.id, load)

const fmt = (iso: string) => new Date(iso).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'long' })
const challengeText = computed(() => {
  const c = challenge.value
  if (!c) return ''
  const open = new Date(c.ends_at).getTime() > Date.now()
  return open ? t('feed.week.entriesClose', { date: fmt(c.ends_at) }) : t('feed.week.votingEnds', { date: fmt(c.voting_ends_at) })
})
const range = computed(() => {
  const end = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const f = new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short' })
  return `${f.format(monday)} – ${f.format(end)}`
})
const empty = computed(() => !diaries.value && !waiting.value && !tip.value && !challenge.value)
</script>

<template>
  <section
    v-if="!hidden && loaded"
    class="week card"
    aria-labelledby="week-title"
  >
    <header class="w-head">
      <h2
        id="week-title"
        class="w-title"
      >
        {{ t('feed.week.title') }}
      </h2>
      <span class="w-range num">{{ range }}</span>
      <button
        type="button"
        class="icon-btn w-close"
        :aria-label="t('feed.week.dismiss')"
        @click="dismiss"
      >
        <UIcon name="i-tabler-x" />
      </button>
    </header>

    <p
      v-if="empty"
      class="w-quiet"
    >
      {{ t('feed.week.quiet') }}
    </p>

    <ul
      v-else
      class="w-rows"
    >
      <li v-if="diaries">
        <NuxtLink
          to="/community?tab=following"
          class="w-row"
        >
          <GrowIcon
            name="note"
            class="w-glyph"
          />
          <span class="w-text">{{ t('feed.week.diaries', { n: diaries }) }}</span>
          <UIcon
            name="i-tabler-chevron-right"
            class="w-chev"
          />
        </NuxtLink>
      </li>
      <li v-if="waiting">
        <button
          type="button"
          class="w-row"
          @click="emit('unanswered')"
        >
          <GrowIcon
            name="i-tabler-help-circle"
            class="w-glyph attention"
          />
          <span class="w-text">{{ matching ? t('feed.week.matching', { n: waiting }) : t('feed.week.waiting', { n: waiting }) }}</span>
          <span class="w-cta">{{ t('feed.week.help') }}</span>
        </button>
      </li>
      <li v-if="tip">
        <NuxtLink
          to="/community/tips"
          class="w-row"
        >
          <GrowIcon
            name="i-tabler-bulb"
            class="w-glyph lamp"
          />
          <span class="w-text">
            <span class="w-label">{{ t('feed.week.topTip') }}</span>
            <span
              class="w-tip"
              lang="en"
            >{{ tip.body }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="w-chev"
          />
        </NuxtLink>
      </li>
      <li v-if="challenge">
        <NuxtLink
          :to="`/challenges/${challenge.slug}`"
          class="w-row"
        >
          <GrowIcon
            name="i-tabler-trophy"
            class="w-glyph lamp"
          />
          <span class="w-text">
            <span class="w-label">{{ challengeTitle(challenge) }}</span>
            <span>{{ challengeText }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="w-chev"
          />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.week {
  position: relative;
  overflow: hidden;
  padding: 12px 6px 4px 14px;
}

.w-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2px;
}

.w-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.w-range {
  flex: 1;
  font-size: 12px;
  color: var(--text-3);
}

.w-close {
  border-color: transparent;
  background: transparent;
  color: var(--text-3);
  font-size: 18px;
}

.w-quiet {
  margin: 4px 10px 10px 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-2);
}

.w-rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.w-rows li + li {
  border-top: 1px solid var(--line);
}

.w-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 8px 10px 8px 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.w-row:active {
  transform: scale(0.985);
}

.w-glyph {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--green);
}

.w-glyph.lamp {
  color: var(--amber);
}

.w-glyph.attention {
  color: var(--red);
}

.w-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-2);
}

.w-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.w-tip {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.w-cta {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--green);
  font-size: 12px;
  font-weight: 600;
}

.w-chev {
  flex-shrink: 0;
  color: var(--text-3);
}
</style>
