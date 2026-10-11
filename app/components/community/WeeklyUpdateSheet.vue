<script setup lang="ts">
import type { Plant } from '~/types/grow'
import { contentBlockedKey, isMissingSchema } from '~/utils/dbErrors'
import { compressImage } from '~/utils/image'
import { photoStore } from '~/utils/photoStore'
import { UPDATE_BODY_MAX, UPDATE_PHOTO_LIMIT, suggestBody, summarizeWeek, weekEntries, weekRange, type JournalSummary } from '~/utils/weeklyUpdate'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plant: Plant, publicId: string, week: number }>()
const emit = defineEmits<{ posted: [row: { week_no: number, created_at: string }] }>()

const { t, locale } = useI18n()
const { user, requireAuth } = useAuth()
const { notify } = useNotify()
const grow = useGrow()
const today = useToday()

interface PhotoOption { key: string, url: string, photoId?: string, file?: File }

const body = ref('')
const summary = shallowRef<JournalSummary | null>(null)
const options = ref<PhotoOption[]>([])
const chosen = ref<string[]>([])
const busy = ref(false)
const objectUrls: string[] = []

const range = computed(() => weekRange(props.plant, props.week, today.value))

function revokeAll() {
  for (const u of objectUrls.splice(0)) URL.revokeObjectURL(u)
}

watch(open, async (v) => {
  if (!v) return
  const all = grow.entriesFor(props.plant.id)
  const list = weekEntries(all, range.value)
  summary.value = summarizeWeek(props.plant, all, props.week, range.value)
  // journal notes are only offered when they're likely English (feed content is English only)
  body.value = suggestBody(summary.value, locale.value === 'en' ? list.map(e => e.note.trim()).filter(Boolean) : [])
  revokeAll()
  const ids = [...new Set(list.flatMap(e => e.photoIds))].slice(0, 12)
  const loaded = await Promise.all(ids.map(async id => ({ id, url: await photoUrl(id) })))
  options.value = loaded.filter(x => x.url).map(x => ({ key: x.id, url: x.url!, photoId: x.id }))
  chosen.value = options.value.slice(0, Math.min(2, UPDATE_PHOTO_LIMIT)).map(o => o.key)
})

onBeforeUnmount(revokeAll)

function toggle(key: string) {
  if (chosen.value.includes(key)) chosen.value = chosen.value.filter(k => k !== key)
  else if (chosen.value.length < UPDATE_PHOTO_LIMIT) chosen.value = [...chosen.value, key]
  else notify(t('plant.weekly.photoLimit', { n: UPDATE_PHOTO_LIMIT }), { tone: 'info' })
}

async function addPhoto() {
  const f = await pickImage()
  if (!f) return
  const url = URL.createObjectURL(f)
  objectUrls.push(url)
  const key = `f${Date.now()}`
  options.value = [{ key, url, file: f }, ...options.value]
  if (chosen.value.length < UPDATE_PHOTO_LIMIT) chosen.value = [...chosen.value, key]
}

const stats = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { glyph: 'water', n: s.waterings, label: t('plant.weekly.waterings', { n: s.waterings }) },
    { glyph: 'feed', n: s.feeds, label: t('plant.weekly.feeds', { n: s.feeds }) },
    { glyph: 'train', n: s.trainings.length, label: t('plant.weekly.trainings', { n: s.trainings.length }) },
    { glyph: 'note', n: s.notes, label: t('plant.weekly.notes', { n: s.notes }) }
  ]
})

async function upload(uid: string, pick: PhotoOption): Promise<string> {
  const source = pick.file ?? (pick.photoId ? (await photoStore.get(pick.photoId))?.blob : null)
  if (!source) throw new Error('photo missing')
  const blob = await compressImage(source, 1600, 0.82)
  const path = `${uid}/plants/${props.plant.id}/updates/${crypto.randomUUID()}.jpg`
  const bucket = useSupabase().storage.from('media')
  const { error } = await bucket.upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (error) throw error
  return path
}

async function submit() {
  if (busy.value || !requireAuth()) return
  const uid = user.value?.id
  if (!uid || !summary.value) return
  busy.value = true
  const paths: string[] = []
  const bucket = useSupabase().storage.from('media')
  try {
    for (const key of chosen.value) {
      const p = options.value.find(o => o.key === key)
      if (p) paths.push(await upload(uid, p))
    }
    const images = paths.map(p => bucket.getPublicUrl(p).data.publicUrl)
    const { data, error } = await useSupabase().from('plant_updates').insert({
      plant_id: props.publicId,
      owner_id: uid,
      week_no: props.week,
      body: body.value.trim().slice(0, UPDATE_BODY_MAX),
      images,
      journal_summary: summary.value
    }).select('week_no, created_at').single()
    if (error) throw error
    haptic('success')
    notify(t('plant.weekly.posted', { n: props.week }), { icon: 'photo' })
    emit('posted', data as { week_no: number, created_at: string })
    open.value = false
  } catch (e) {
    if (paths.length) bucket.remove(paths).catch(() => {})
    const err = e as { code?: string, message?: string }
    const blocked = contentBlockedKey(err)
    const key = blocked
      ? `plant.weekly.blocked.${blocked}`
      : err.code === '23505'
        ? 'plant.weekly.already'
        : isMissingSchema(err) ? 'plant.weekly.unavailable' : 'plant.weekly.failed'
    console.warn('[BudBuddy] weekly update failed', e)
    notify(t(key), { tone: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('plant.weekly.sheetTitle', { n: week })"
    icon="photo"
    icon-color="var(--leaf)"
  >
    <form
      class="form-stack"
      @submit.prevent="submit"
    >
      <p class="range num">
        {{ formatDate(range.from, { day: 'numeric', month: 'short' }) }} – {{ formatDate(range.to, { day: 'numeric', month: 'short' }) }}
        <span aria-hidden="true">·</span> {{ plant.name }}
      </p>

      <ul
        class="stats"
        :aria-label="t('plant.weekly.statsAria')"
      >
        <li
          v-for="s in stats"
          :key="s.glyph"
          :class="{ zero: !s.n }"
        >
          <GrowIcon
            :name="s.glyph"
            class="stat-glyph"
          />
          <span class="stat-n num">{{ s.n }}</span>
          <span class="stat-label">{{ s.label }}</span>
        </li>
      </ul>

      <div class="field">
        <span class="field-label">{{ t('plant.weekly.photos', { n: chosen.length, max: UPDATE_PHOTO_LIMIT }) }}</span>
        <div class="grid">
          <button
            type="button"
            class="tile add"
            :aria-label="t('plant.weekly.addPhoto')"
            @click="addPhoto"
          >
            <UIcon
              name="i-tabler-photo-plus"
              class="size-6"
            />
          </button>
          <button
            v-for="o in options"
            :key="o.key"
            type="button"
            class="tile"
            :class="{ on: chosen.includes(o.key) }"
            :aria-pressed="chosen.includes(o.key)"
            :aria-label="t('plant.weekly.togglePhoto')"
            @click="toggle(o.key)"
          >
            <img
              :src="o.url"
              alt=""
              loading="lazy"
            >
            <span
              class="tick"
              aria-hidden="true"
            >
              <span
                v-if="chosen.includes(o.key)"
                class="tick-n num"
              >{{ chosen.indexOf(o.key) + 1 }}</span>
            </span>
          </button>
        </div>
        <p
          v-if="!options.length"
          class="field-hint"
        >
          {{ t('plant.weekly.noPhotos') }}
        </p>
      </div>

      <label class="field">
        <span class="field-label">{{ t('plant.weekly.body') }}</span>
        <textarea
          v-model="body"
          class="input"
          rows="5"
          :maxlength="UPDATE_BODY_MAX"
          lang="en"
        />
        <span class="field-hint hint-row"><UIcon name="i-tabler-language" />{{ t('plant.weekly.english') }}</span>
        <span class="field-hint hint-row"><UIcon name="i-tabler-shield-check" />{{ t('plant.weekly.noSale') }}</span>
      </label>

      <button
        type="submit"
        class="btn btn-primary btn-block"
        :disabled="busy || (!body.trim() && !chosen.length)"
      >
        <UIcon
          v-if="busy"
          name="i-tabler-loader-2"
          class="size-5 animate-spin"
        />
        {{ busy ? t('plant.weekly.posting') : t('plant.weekly.post', { n: week }) }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.range {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stats li {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 10px 9px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: inset 0 1px 0 var(--highlight);
}

.stats li.zero {
  opacity: 0.55;
}

.stat-glyph {
  font-size: 18px;
  color: var(--leaf);
}

.stat-n {
  font-size: 22px;
  font-weight: 300;
  line-height: 1.1;
  color: var(--text);
}

.stat-label {
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.25;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tile {
  position: relative;
  aspect-ratio: 1;
  min-height: 44px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #0b0d10;
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) ease;
}

.tile:active {
  transform: scale(0.96);
}

.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity var(--dur-fast) ease;
}

.tile:not(.on) img {
  opacity: 0.6;
}

.tile.on {
  border-color: var(--leaf);
  box-shadow: 0 0 0 1px var(--leaf), var(--glow-leaf);
}

.tile.add {
  display: grid;
  place-items: center;
  border-style: dashed;
  border-color: var(--line-strong);
  color: var(--text-2);
}

.tick {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1.5px solid rgba(255, 255, 255, 0.7);
  background: rgba(7, 8, 10, 0.45);
}

.tile.on .tick {
  border-color: var(--leaf);
  background: var(--leaf);
  animation: pop var(--dur) var(--ease-out);
}

.tick-n {
  font-size: 12px;
  font-weight: 700;
  color: #07080a;
}

.hint-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

@keyframes pop {
  from { transform: scale(0.5); }
}

@media (prefers-reduced-motion: reduce) {
  .tile.on .tick { animation: none; }
}
</style>
