<script setup lang="ts">
import type { LightboxItem } from '~/components/PhotoLightbox.vue'

definePageMeta({ alias: ['/nutriens-calc'] })
const { t } = useI18n()
useHead({ title: () => t('gallery.title') })

const grow = useGrow()
const { state } = grow
const { confirm } = useConfirm()
const { notify } = useNotify()

interface GalleryItem extends LightboxItem {
  plantId: string
  date: string
  entryId: string | null
}

const items = computed<GalleryItem[]>(() => {
  const list: GalleryItem[] = []
  for (const e of state.entries) {
    const p = grow.getPlant(e.plantId)
    if (!p) continue
    for (const id of e.photoIds) {
      list.push({
        photoId: id,
        plantId: p.id,
        date: e.date,
        entryId: e.id,
        title: p.name,
        subtitle: `${formatDate(e.date)} · ${t('gallery.day', { n: Math.max(0, daysBetween(p.startDate, e.date)) })}${e.note ? ` · ${e.note}` : ''}`,
        to: `/plants/${p.id}`
      })
    }
  }
  // a cover photo that is also in the journal is shown once
  const seen = new Set(list.map(i => i.photoId))
  for (const p of state.plants) {
    if (p.photoId && !seen.has(p.photoId)) {
      list.push({ photoId: p.photoId, plantId: p.id, date: p.startDate, entryId: null, title: p.name, subtitle: t('gallery.profilePhoto'), to: `/plants/${p.id}` })
    }
  }
  return list.sort((a, b) => b.date.localeCompare(a.date))
})

const plantFilter = ref<string | null>(null)
const plantsWithPhotos = computed(() => {
  const ids = new Set(items.value.map(i => i.plantId))
  return state.plants.filter(p => ids.has(p.id))
})

const shown = computed(() => (plantFilter.value ? items.value.filter(i => i.plantId === plantFilter.value) : items.value))

const groups = computed(() => {
  const out: { month: string, items: GalleryItem[] }[] = []
  for (const i of shown.value) {
    const month = formatDate(i.date, { month: 'long', year: 'numeric' })
    const last = out[out.length - 1]
    if (last?.month === month) last.items.push(i)
    else out.push({ month, items: [i] })
  }
  return out
})

const showNames = computed(() => !plantFilter.value && plantsWithPhotos.value.length > 1)

const loaded = reactive(new Set<string>())

const header = ref<{ $el: HTMLElement } | null>(null)
const headH = ref(80)
let ro: ResizeObserver | null = null
onMounted(() => {
  const el = header.value?.$el
  if (!el) return
  ro = new ResizeObserver(() => (headH.value = el.offsetHeight))
  ro.observe(el)
})
onBeforeUnmount(() => ro?.disconnect())

const lightboxIndex = ref<number | null>(null)
const origin = ref<DOMRect | null>(null)
function open(item: GalleryItem, e: MouseEvent) {
  origin.value = (e.currentTarget as HTMLElement).getBoundingClientRect()
  lightboxIndex.value = shown.value.indexOf(item)
}

async function deletePhoto(item: LightboxItem) {
  const ok = await confirm({ title: t('gallery.deleteConfirm'), confirmLabel: t('gallery.delete'), danger: true })
  if (!ok) return
  for (const p of state.plants) if (p.photoId === item.photoId) grow.updatePlant(p.id, { photoId: null })
  for (const e of state.entries.filter(x => x.photoIds.includes(item.photoId))) {
    const rest = e.photoIds.filter(id => id !== item.photoId)
    if (e.type === 'photo' && !rest.length && !e.note) grow.deleteEntry(e.id)
    else grow.updateEntry(e.id, { photoIds: rest })
  }
  grow.cleanupPhotos()
  notify(t('gallery.deleted'), { tone: 'info' })
}
</script>

<template>
  <div :style="{ '--head-h': `${headH}px` }">
    <AppHeader
      ref="header"
      :title="t('gallery.title')"
      :subtitle="t('gallery.count', { n: items.length })"
    />
    <div class="page">
      <div
        v-if="plantsWithPhotos.length > 1"
        class="chips filter"
      >
        <button
          type="button"
          class="chip"
          :aria-pressed="plantFilter === null"
          @click="plantFilter = null"
        >
          {{ t('gallery.allPlants') }}
        </button>
        <button
          v-for="p in plantsWithPhotos"
          :key="p.id"
          type="button"
          class="chip"
          :aria-pressed="plantFilter === p.id"
          @click="plantFilter = plantFilter === p.id ? null : p.id"
        >
          {{ p.name }}
        </button>
      </div>

      <EmptyState
        v-if="!items.length"
        icon="gallery"
        :title="t('gallery.emptyTitle')"
        :text="t('gallery.emptyText')"
      >
        <NuxtLink
          to="/plants"
          class="btn btn-soft"
        >
          <GrowIcon name="plants" /> {{ t('gallery.goToPlants') }}
        </NuxtLink>
      </EmptyState>

      <div
        v-else
        class="months"
      >
        <section
          v-for="g in groups"
          :key="g.month"
          class="month"
        >
          <div class="section-head month-head">
            <h2 class="section-title">
              {{ g.month }}
            </h2>
            <span class="section-meta num">{{ g.items.length }}</span>
          </div>
          <div class="grid">
            <button
              v-for="i in g.items"
              :key="i.photoId"
              type="button"
              class="cell"
              :class="{ loaded: loaded.has(i.photoId) }"
              :aria-label="`${i.title}, ${i.subtitle}`"
              @click="open(i, $event)"
              @load.capture="loaded.add(i.photoId)"
              @error.capture="loaded.add(i.photoId)"
            >
              <PlantPhoto
                :photo-id="i.photoId"
                stage="vegetative"
              />
              <span
                v-if="showNames"
                class="cell-label"
              >{{ i.title }}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
    <PhotoLightbox
      v-model:index="lightboxIndex"
      :items="shown"
      :origin="origin"
      @delete="deletePhoto"
    />
  </div>
</template>

<style scoped>
.filter {
  margin: 0 -16px;
  padding: 0 16px 2px;
}

.filter .chip {
  min-height: 44px;
}

.months {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.month-head {
  position: sticky;
  top: calc(var(--head-h) - 8px);
  z-index: 2;
  margin: 0 -16px 12px;
  padding: 8px 16px;
  background: var(--bg);
}

.section-title {
  text-transform: capitalize;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}

.cell {
  position: relative;
  display: block;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface);
}

.cell :deep(img.plant-photo) {
  opacity: 0;
  transition: opacity var(--dur) ease;
}

.cell.loaded :deep(img.plant-photo) {
  opacity: 1;
}

.cell:active :deep(img.plant-photo) {
  opacity: 0.8;
}

.cell:focus-visible {
  outline-offset: -2px;
}

.cell-label {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 6px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(14, 16, 15, 0.8);
  color: var(--text);
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
