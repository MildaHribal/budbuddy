<script setup lang="ts">
import type { LightboxItem } from '~/components/PhotoLightbox.vue'

definePageMeta({ alias: ['/nutriens-calc'] })
useHead({ title: 'Gallery' })

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
  for (const p of state.plants) {
    if (p.photoId) {
      list.push({ photoId: p.photoId, plantId: p.id, date: p.startDate, entryId: null, title: p.name, subtitle: 'Profile photo', to: `/plants/${p.id}` })
    }
  }
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
        subtitle: `${formatDate(e.date)} · day ${Math.max(0, daysBetween(p.startDate, e.date))}${e.note ? ` · ${e.note}` : ''}`,
        to: `/plants/${p.id}`
      })
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

const lightboxIndex = ref<number | null>(null)
function open(item: GalleryItem) {
  lightboxIndex.value = shown.value.indexOf(item)
}

async function deletePhoto(item: LightboxItem) {
  const ok = await confirm({ title: 'Delete this photo?', confirmLabel: 'Delete', danger: true })
  if (!ok) return
  for (const p of state.plants) if (p.photoId === item.photoId) grow.updatePlant(p.id, { photoId: null })
  for (const e of state.entries.filter(x => x.photoIds.includes(item.photoId))) {
    const rest = e.photoIds.filter(id => id !== item.photoId)
    if (e.type === 'photo' && !rest.length && !e.note) grow.deleteEntry(e.id)
    else grow.updateEntry(e.id, { photoIds: rest })
  }
  grow.cleanupPhotos()
  notify('Photo deleted', { tone: 'info' })
}
</script>

<template>
  <div>
    <AppHeader
      title="Gallery"
      :subtitle="`${items.length} photo${items.length === 1 ? '' : 's'}`"
      icon="i-tabler-photo"
    />
    <div class="page">
      <div
        v-if="plantsWithPhotos.length > 1"
        class="chips"
      >
        <button
          type="button"
          class="chip"
          :aria-pressed="plantFilter === null"
          @click="plantFilter = null"
        >
          All plants
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
        icon="i-tabler-photo-off"
        title="No photos yet"
        text="Add photos from a plant's journal – they all show up here, sorted by date."
      >
        <NuxtLink
          to="/plants"
          class="btn btn-soft"
        >
          <UIcon
            name="i-tabler-leaf"
            class="size-4"
          /> Go to plants
        </NuxtLink>
      </EmptyState>

      <section
        v-for="g in groups"
        :key="g.month"
      >
        <h2 class="month">
          {{ g.month }} <span>{{ g.items.length }}</span>
        </h2>
        <div class="grid">
          <button
            v-for="i in g.items"
            :key="i.photoId"
            type="button"
            class="cell"
            :aria-label="`${i.title}, ${i.subtitle}`"
            @click="open(i)"
          >
            <PlantPhoto
              :photo-id="i.photoId"
              stage="vegetative"
            />
            <span class="cell-label">{{ i.title }}</span>
          </button>
        </div>
      </section>
    </div>
    <PhotoLightbox
      v-model:index="lightboxIndex"
      :items="shown"
      @delete="deletePhoto"
    />
  </div>
</template>

<style scoped>
.month {
  display: flex;
  justify-content: space-between;
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
}

.month span {
  color: var(--text-3);
  font-weight: 500;
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  border-radius: var(--radius);
  overflow: hidden;
}

.cell {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: var(--surface-2);
}

.cell-label {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14px 6px 5px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
