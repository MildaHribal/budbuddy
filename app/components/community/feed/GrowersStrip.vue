<script setup lang="ts">
import { haptic } from '~/utils/haptics'
import { tOr } from '~/utils/grower'
import { useFeedActions } from '~/utils/feed/actions'

interface Grower {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  reputation: number
  environments: string[] | null
  media: string[] | null
  light_type?: string | null
}

const { t } = useI18n()
const { user, signedIn, requireAuth } = useAuth()
const { isBlocked } = useBlocks()
const { fail } = useFeedActions()

const growers = ref<Grower[]>([])
const followed = ref(new Set<string>())
const pending = ref(new Set<string>())

async function load() {
  const sb = useSupabase()
  const uid = user.value?.id ?? null
  let rows: Grower[] = []
  const rpc = await sb.rpc('suggested_growers', { limit: 10 })
  if (!rpc.error) rows = (rpc.data ?? []) as Grower[]
  else {
    // RPC not deployed yet: top reputation, minus me and people I follow
    let q = sb.from('profiles').select('id, username, display_name, avatar_url, reputation, environments, media').order('reputation', { ascending: false }).limit(16)
    if (uid) q = q.neq('id', uid)
    const { data } = await q
    rows = (data ?? []) as Grower[]
    if (uid && rows.length) {
      const { data: f } = await sb.from('follows').select('following_id').eq('follower_id', uid).in('following_id', rows.map(r => r.id))
      const skip = new Set((f ?? []).map(r => r.following_id as string))
      rows = rows.filter(r => !skip.has(r.id))
    }
  }
  if (uid !== (user.value?.id ?? null)) return
  growers.value = rows.filter(r => r.id !== uid).slice(0, 10)
  followed.value = new Set()
}

onMounted(load)
watch(() => user.value?.id, load)

const shown = computed(() => growers.value.filter(g => !isBlocked(g.id)))
const nameOf = (g: Grower) => g.display_name?.trim() || g.username

function setup(g: Grower): string {
  const parts = [
    ...(g.environments ?? []).slice(0, 1).map(x => tOr(`auth.profile.env.${x}`, x)),
    ...(g.media ?? []).slice(0, 1).map(x => tOr(`auth.profile.medium.${x}`, x)),
    ...(g.light_type ? [tOr(`feed.growers.light.${g.light_type}`, g.light_type)] : [])
  ]
  return parts.join(' · ')
}

async function toggle(g: Grower) {
  if (!requireAuth() || !user.value || pending.value.has(g.id)) return
  const on = !followed.value.has(g.id)
  const set = (v: boolean) => {
    const next = new Set(followed.value)
    if (v) next.add(g.id)
    else next.delete(g.id)
    followed.value = next
  }
  set(on)
  if (on) haptic('tap')
  pending.value = new Set([...pending.value, g.id])
  const sb = useSupabase()
  const { error } = on
    ? await sb.from('follows').insert({ follower_id: user.value.id, following_id: g.id })
    : await sb.from('follows').delete().eq('follower_id', user.value.id).eq('following_id', g.id)
  const p = new Set(pending.value)
  p.delete(g.id)
  pending.value = p
  if (error && error.code !== '23505') {
    set(!on)
    fail(error)
  }
}
</script>

<template>
  <section
    v-if="shown.length >= 2"
    class="growers"
    aria-labelledby="growers-title"
  >
    <div class="section-head">
      <h2
        id="growers-title"
        class="section-title"
      >
        {{ signedIn ? t('feed.growers.title') : t('feed.growers.titleAnon') }}
      </h2>
    </div>
    <ul class="strip">
      <li
        v-for="g in shown"
        :key="g.id"
        class="grower card"
      >
        <NuxtLink
          :to="`/u/${g.username}`"
          class="g-link"
        >
          <CommunityUserAvatar
            :url="g.avatar_url"
            :name="nameOf(g)"
            :size="52"
          />
          <span class="g-name">{{ nameOf(g) }}</span>
          <span class="g-setup">{{ setup(g) || t('feed.growers.rep', { n: g.reputation }) }}</span>
        </NuxtLink>
        <button
          type="button"
          class="btn g-follow"
          :class="followed.has(g.id) ? 'btn-ghost' : 'btn-soft'"
          :aria-pressed="followed.has(g.id)"
          :aria-label="t('feed.growers.followLabel', { name: nameOf(g) })"
          @click="toggle(g)"
        >
          <UIcon
            v-if="followed.has(g.id)"
            name="i-tabler-check"
          />
          {{ followed.has(g.id) ? t('feed.growers.following') : t('feed.growers.follow') }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.growers {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.strip {
  display: flex;
  gap: 10px;
  margin: 0 -16px;
  padding: 2px 16px 6px;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding: 0 16px;
  scrollbar-width: none;
}

.strip::-webkit-scrollbar {
  display: none;
}

.grower {
  flex: 0 0 136px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 14px 10px 10px;
  scroll-snap-align: start;
}

.g-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  text-align: center;
}

.g-link :deep(.avatar) {
  margin-bottom: 4px;
}

.g-name {
  max-width: 100%;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.g-setup {
  max-width: 100%;
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.g-follow {
  min-height: 44px;
  padding: 0 10px;
  font-size: 13px;
}
</style>
