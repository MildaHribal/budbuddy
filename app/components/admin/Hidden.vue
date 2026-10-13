<script setup lang="ts">
import { MOD_HIDEABLE, type ModAuthor, type ModPreview } from '~/composables/useModeration'

const { t } = useI18n()
const { notify } = useNotify()
const mod = useModeration()

const items = ref<ModPreview[]>([])
const authors = ref(new Map<string, ModAuthor>())
const loading = ref(true)
const failed = ref(false)
const busy = ref<string | null>(null)

async function load() {
  loading.value = true
  failed.value = false
  try {
    const lists = await Promise.all(MOD_HIDEABLE.map(type => mod.fetchHidden(type)))
    const all = lists.flat().sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    authors.value = await mod.fetchAuthors(all.map(i => i.authorId))
    items.value = all
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function unhide(p: ModPreview) {
  busy.value = p.id
  try {
    await mod.setHidden(p.type, p.id, false)
    items.value = items.value.filter(x => x.id !== p.id)
    notify(t('admin.hidden.unhidden'))
  } catch {
    notify(t('admin.failed'), { tone: 'error' })
  } finally {
    busy.value = null
  }
}
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
      v-else-if="!items.length"
      icon="note"
      :title="t('admin.hidden.empty')"
      :text="t('admin.hidden.emptyText')"
    />
    <ul
      v-else
      class="list rise"
    >
      <li
        v-for="p in items"
        :key="`${p.type}:${p.id}`"
        class="item"
        :class="{ busy: busy === p.id }"
      >
        <AdminTargetPreview
          :type="p.type"
          :preview="p"
          :author="p.authorId ? authors.get(p.authorId) : null"
        />
        <div class="actions">
          <button
            type="button"
            class="btn btn-lamp"
            :disabled="busy === p.id"
            @click="unhide(p)"
          >
            <UIcon name="i-tabler-eye" />{{ t('admin.hidden.unhide') }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
