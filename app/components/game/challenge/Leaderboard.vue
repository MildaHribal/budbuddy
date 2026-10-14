<script setup lang="ts">
import { fetchLeaderboard, type BoardRow } from './api'

const props = defineProps<{ challengeId: string, weekLabel: string, refreshKey?: number }>()
const emit = defineEmits<{ signIn: [] }>()
const { t } = useI18n()
const { signedIn, user, ready } = useAuth()

const loading = ref(false)
const failed = ref(false)
const top = ref<BoardRow[]>([])
const mine = ref<BoardRow | null>(null)
let seq = 0

async function load() {
  if (!signedIn.value) return
  const n = ++seq
  loading.value = true
  failed.value = false
  try {
    const r = await fetchLeaderboard(props.challengeId, user.value?.id ?? null)
    if (n !== seq) return
    top.value = r.top
    mine.value = r.mine
  } catch {
    if (n === seq) failed.value = true
  } finally {
    if (n === seq) loading.value = false
  }
}

watch(() => [props.challengeId, props.refreshKey, signedIn.value] as const, () => load().catch(() => {}), { immediate: true })

const mineOutside = computed(() => !!mine.value && !top.value.some(r => r.user_id === mine.value?.user_id))
const nameOf = (r: BoardRow) => r.display_name || `@${r.username}`
const fmt = (n: number) => Math.round(Number(n)).toLocaleString()
</script>

<template>
  <section :aria-label="t('gameChallenge.board.label', { week: weekLabel })">
    <div class="section-head">
      <h2 class="section-title">
        {{ t('gameChallenge.board.title') }}
      </h2>
      <span class="section-meta">{{ t('gameChallenge.board.meta') }}</span>
    </div>

    <div
      v-if="ready && !signedIn"
      class="card notice"
    >
      <p class="notice-title">
        {{ t('gameChallenge.board.signedOutTitle') }}
      </p>
      <p class="sub">
        {{ t('gameChallenge.board.signedOutText') }}
      </p>
      <button
        type="button"
        class="btn btn-soft"
        @click="emit('signIn')"
      >
        {{ t('gameChallenge.board.signIn') }}
      </button>
    </div>

    <div
      v-else-if="!ready || (loading && !top.length)"
      class="card board"
      aria-busy="true"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="row sk-row"
      >
        <span class="sk sk-rank" />
        <span class="sk sk-name" />
      </div>
    </div>

    <div
      v-else-if="failed"
      class="card notice"
      role="alert"
    >
      <p class="sub">
        {{ t('gameChallenge.board.error') }}
      </p>
      <button
        type="button"
        class="btn btn-soft"
        @click="load"
      >
        <UIcon name="i-tabler-refresh" />{{ t('gameChallenge.retry') }}
      </button>
    </div>

    <EmptyState
      v-else-if="!top.length"
      icon="harvest"
      :title="t('gameChallenge.board.emptyTitle')"
      :text="t('gameChallenge.board.emptyText')"
    />

    <div
      v-else
      class="card board"
    >
      <ol class="list">
        <li
          v-for="r in top"
          :key="r.user_id"
          class="row"
          :class="{ me: r.user_id === user?.id }"
        >
          <span class="rank num">{{ r.rank }}</span>
          <span class="who">
            <span class="name">{{ nameOf(r) }}<span
              v-if="r.user_id === user?.id"
              class="you"
            > ({{ t('gameChallenge.board.you') }})</span></span>
            <span class="sub">{{ t('gameChallenge.board.row', { q: Math.round(Number(r.quality)), g: Math.round(Number(r.dry_g)) }) }}</span>
          </span>
          <span class="score num">{{ fmt(r.score) }}</span>
        </li>
      </ol>
      <div
        v-if="mineOutside && mine"
        class="row me mine"
      >
        <span class="rank num">{{ mine.rank }}</span>
        <span class="who">
          <span class="name">{{ t('gameChallenge.board.yourPlace') }}</span>
          <span class="sub">{{ t('gameChallenge.board.row', { q: Math.round(Number(mine.quality)), g: Math.round(Number(mine.dry_g)) }) }}</span>
        </span>
        <span class="score num">{{ fmt(mine.score) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.notice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
}

.notice-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.notice .btn {
  margin-top: 4px;
}

.board {
  padding: 0;
  overflow: hidden;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 14px;
  border-top: 1px solid var(--line);
}

.list .row:first-child,
.board > .row:first-child {
  border-top: 0;
}

.row.me {
  background: var(--accent-soft);
}

.rank {
  width: 28px;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-3);
  text-align: right;
}

.list .row:nth-child(-n+3) .rank {
  color: var(--text);
}

.who {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.you {
  color: var(--green);
}

.score {
  font-size: 16px;
  font-weight: 600;
}

.mine {
  border-top: 1px solid var(--line-strong);
}

.sk {
  display: block;
  height: 12px;
  border-radius: 6px;
  background: var(--surface-2);
  animation: pulse 1.4s ease-in-out infinite;
}

.sk-rank { width: 20px; }
.sk-name { width: 55%; }

@keyframes pulse {
  50% { opacity: 0.55; }
}
</style>
