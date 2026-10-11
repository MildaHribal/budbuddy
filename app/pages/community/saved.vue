<script setup lang="ts">
import { useFeedActions } from '~/utils/feed/actions'
import { PAGE, POST_SELECT, type Post } from '~/utils/feed/feed'

const { t } = useI18n()
useHead({ title: () => t('feed.savedPage.title') })

const { user, ready, requireAuth } = useAuth()
const { isBlocked, load: loadBlocks } = useBlocks()
const { saved, loadMine } = useFeedActions()

const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref(false)
const done = ref(false)
let offset = 0
let gen = 0

// Unsaving here drops the card right away.
const visible = computed(() => posts.value.filter(p => saved.value.has(p.id) && !isBlocked(p.author_id)))

async function loadMore() {
  const uid = user.value?.id
  if (!uid || loading.value || done.value || error.value) return
  const my = gen
  loading.value = true
  const { data, error: e } = await useSupabase().from('saves')
    .select(`created_at, post:posts(${POST_SELECT})`)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE - 1)
  if (my !== gen) return
  loading.value = false
  if (e) {
    error.value = true
    return
  }
  const rows = (data ?? []) as unknown as { post: Post | null }[]
  offset += rows.length
  if (rows.length < PAGE) done.value = true
  const list = rows.map(r => r.post).filter((p): p is Post => !!p)
  const ids = list.map(p => p.id)
  saved.value = new Set([...saved.value, ...ids])
  posts.value.push(...list)
  loadMine(ids)
}

function reset() {
  gen++
  posts.value = []
  offset = 0
  done.value = false
  error.value = false
  loading.value = false
  loadMore()
}

watch(() => user.value?.id, () => {
  loadBlocks()
  reset()
})

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
onMounted(() => {
  loadBlocks()
  reset()
  observer = new IntersectionObserver((es) => {
    if (es.some(e => e.isIntersecting)) loadMore()
  }, { rootMargin: '600px 0px' })
  if (sentinel.value) observer.observe(sentinel.value)
})
onBeforeUnmount(() => observer?.disconnect())

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
            @click="error = false; loadMore()"
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
  gap: 12px;
}

.sentinel {
  height: 1px;
  margin-top: -28px;
}
</style>
