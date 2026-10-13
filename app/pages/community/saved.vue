<script setup lang="ts">
import { useOnlineRetry } from '~/utils/feed/online'
import { useFeedActions } from '~/utils/feed/actions'
import { ensureSchema, keysetOr, PAGE, POST_SELECT, type Cursor, type Post } from '~/utils/feed/feed'
import { useInfinite } from '~/utils/feed/infinite'

const { t } = useI18n()
useHead({ title: () => t('feed.savedPage.title') })

const { user, ready, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { saved, loadMine } = useFeedActions()

const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref(false)
const done = ref(false)
let cursor: Cursor | null = null
let gen = 0

// Unsaving here drops the card right away.
const visible = computed(() => posts.value.filter(p => saved.value.has(p.id) && !isBlocked(p.author_id)))

async function loadMore() {
  const uid = user.value?.id
  if (!uid || loading.value || done.value || error.value) return
  const my = gen
  loading.value = true
  await ensureSchema()
  // keyset on (created_at, post_id) so unsaving on this page can't skip rows (M7)
  let q = useSupabase().from('saves')
    .select(`created_at, post_id, post:posts(${POST_SELECT})`)
    .eq('user_id', uid)
  if (cursor) q = q.or(keysetOr(cursor, 'created_at', 'post_id'))
  const { data, error: e } = await q
    .order('created_at', { ascending: false })
    .order('post_id', { ascending: false })
    .limit(PAGE)
  if (my !== gen) return
  loading.value = false
  if (e) {
    error.value = true
    return
  }
  const rows = (data ?? []) as unknown as { created_at: string, post_id: string, post: Post | null }[]
  const last = rows[rows.length - 1]
  if (last) cursor = { at: last.created_at, id: last.post_id }
  if (rows.length < PAGE) done.value = true
  const list = rows.map(r => r.post).filter((p): p is Post => !!p)
  const ids = list.map(p => p.id)
  saved.value = new Set([...saved.value, ...ids])
  posts.value.push(...list)
  loadMine(ids)
}

const sentinel = ref<HTMLElement | null>(null)
const { pump } = useInfinite(sentinel, loadMore, () => !!user.value && !loading.value && !done.value && !error.value)

async function reset() {
  gen++
  posts.value = []
  cursor = null
  done.value = false
  error.value = false
  loading.value = false
  await loadMore()
  await nextTick()
  pump()
}

watch(() => user.value?.id, () => {
  loadBlocks()
  reset()
})

onMounted(() => {
  loadBlocks()
  reset()
})

const composerOpen = ref(false)
const editing = ref<Post | null>(null)
function edit(p: Post) {
  editing.value = p
  composerOpen.value = true
}
function onSaved(p: Post) {
  const i = posts.value.findIndex(x => x.id === p.id)
  if (i !== -1) posts.value[i] = p
}
function onDeleted(p: Post) {
  posts.value = posts.value.filter(x => x.id !== p.id)
}
useOnlineRetry(() => error.value, reset)
</script>

<template>
  <div>
    <AppHeader
      :title="t('feed.savedPage.title')"
      back
    />
    <div class="page saved-page">
      <EmptyState
        v-if="ready && !user"
        icon="community"
        :title="t('feed.savedPage.signInTitle')"
        :text="t('feed.savedPage.signInText')"
      >
        <button
          type="button"
          class="btn btn-soft"
          @click="requireAuth()"
        >
          {{ t('feed.signIn') }}
        </button>
      </EmptyState>

      <template v-else>
        <div
          v-if="loading && !posts.length"
          class="list"
        >
          <CommunityFeedPostSkeleton photo />
          <CommunityFeedPostSkeleton />
        </div>
        <div
          v-else-if="visible.length"
          class="list rise"
        >
          <CommunityFeedPostCard
            v-for="p in visible"
            :key="p.id"
            :post="p"
            @edit="edit"
            @deleted="onDeleted"
          />
        </div>
        <EmptyState
          v-else-if="error"
          icon="pest"
          :title="t('feed.loadError')"
          :text="t('feed.err.offline')"
        >
          <button
            type="button"
            class="btn btn-soft"
            @click="error = false; loadMore().then(pump)"
          >
            <UIcon name="i-tabler-refresh" /> {{ t('feed.retry') }}
          </button>
        </EmptyState>
        <EmptyState
          v-else-if="done"
          icon="note"
          :title="t('feed.savedPage.emptyTitle')"
          :text="t('feed.savedPage.emptyText')"
        >
          <NuxtLink
            to="/community"
            class="btn btn-soft"
          >
            {{ t('feed.detail.back') }}
          </NuxtLink>
        </EmptyState>
      </template>

      <div
        ref="sentinel"
        class="sentinel"
        aria-hidden="true"
      />
    </div>

    <CommunityFeedComposer
      v-model:open="composerOpen"
      :post="editing"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.saved-page {
  padding-top: 4px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sentinel {
  height: 1px;
  margin-top: -28px;
}
</style>
