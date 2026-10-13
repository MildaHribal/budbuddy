<script setup lang="ts">
import { compressImage } from '~/utils/image'
import { createId } from '~/utils/id'
import { photoStore } from '~/utils/photoStore'
import { stageInfo } from '~/utils/stages'
import { useFeedActions } from '~/utils/feed/actions'
import { CATEGORIES, CATEGORY_GLYPH, HELP_CATEGORIES, POST_SELECT, storagePath, toPostContext, SYMPTOMS, type Category, type ComposerPrefill, type PostPlantContext, type Post, type Symptom } from '~/utils/feed/feed'
import { buildPlantContext } from '~/utils/plantContext'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ post?: Post | null, prefill?: ComposerPrefill | null }>()
const emit = defineEmits<{ saved: [post: Post, created: boolean] }>()

const { t } = useI18n()
const { user } = useAuth()
const { notify } = useNotify()
const { confirm } = useConfirm()
const { fail, preCheck } = useFeedActions()
const grow = useGrow()

interface Photo {
  key: string
  preview: string
  url: string | null
  /** 0–1 */
  progress: number
  status: 'uploading' | 'done' | 'error'
  blob: Blob | null
  /** uploaded in this session; removed again when discarded */
  fresh: boolean
}

const MAX_PHOTOS = 6
const MAX_SYMPTOMS = 6
const category = ref<Category>('plants')
const symptoms = ref<Symptom[]>([])
const title = ref('')
const body = ref('')
const photos = ref<Photo[]>([])
const plantId = ref<string | null>(null)
const contextPlant = ref<string | null>(null)
const keepContext = ref<PostPlantContext | null>(null)
const busy = ref(false)
const touched = ref(false)
let submitted = false
let reopening = false

interface MyPlant { id: string, name: string, stage: string, cover_url: string | null }
const myPlants = ref<MyPlant[]>([])

const editing = computed(() => !!props.post)
const isQuestion = computed(() => HELP_CATEGORIES.includes(category.value))
const isProblem = computed(() => category.value === 'problem')
const titleMissing = computed(() => isQuestion.value && !title.value.trim())
const titleErrId = useId()
const uploading = computed(() => photos.value.some(p => p.status === 'uploading'))
const localPlants = computed(() => grow.state.plants.filter(p => !p.archived))
const dirty = computed(() => !editing.value && (!!title.value.trim() || !!body.value.trim() || photos.value.length > 0))

watch(open, async (v) => {
  if (v) {
    if (reopening) {
      reopening = false
      return
    }
    reset()
    loadMyPlants()
    return
  }
  if (submitted || !dirty.value) {
    if (!submitted) cleanup()
    return
  }
  const discard = await confirm({ title: t('feed.composer.discardTitle'), message: t('feed.composer.discardText'), confirmLabel: t('feed.composer.discard'), danger: true })
  if (discard) cleanup()
  else {
    reopening = true
    open.value = true
  }
})

function reset() {
  submitted = false
  touched.value = false
  busy.value = false
  const p = props.post
  const pre = p ? null : props.prefill
  category.value = p?.category ?? pre?.category ?? 'plants'
  title.value = p?.title ?? pre?.title ?? ''
  body.value = p?.body ?? ''
  symptoms.value = (p?.symptom_tags ?? []).filter((x): x is Symptom => (SYMPTOMS as readonly string[]).includes(x))
  plantId.value = p?.plant_id ?? null
  contextPlant.value = null
  keepContext.value = p?.plant_context ?? null
  photos.value = (p?.images ?? []).map(url => ({ key: url, preview: url, url, progress: 1, status: 'done', blob: null, fresh: false }))
  const local = pre?.plant ? grow.getPlant(pre.plant) : null
  if (local) {
    contextPlant.value = local.id
    if (local.sharing?.publicId) plantId.value = local.sharing.publicId
    attachLocal(buildPlantContext(local.id)?.photoIds ?? [], local.name)
  }
}

function toggleSymptom(x: Symptom) {
  if (symptoms.value.includes(x)) symptoms.value = symptoms.value.filter(s => s !== x)
  else if (symptoms.value.length < MAX_SYMPTOMS) symptoms.value = [...symptoms.value, x]
}

function cleanup() {
  const paths = photos.value.filter(p => p.fresh && p.url).map(p => storagePath(p.url!)).filter((x): x is string => !!x)
  if (paths.length) useSupabase().storage.from('media').remove(paths).catch(() => {})
  for (const p of photos.value) if (p.preview.startsWith('blob:')) URL.revokeObjectURL(p.preview)
  photos.value = []
}

async function loadMyPlants() {
  const uid = user.value?.id
  if (!uid) return
  const { data } = await useSupabase().from('public_plants').select('id, name, stage, cover_url').eq('owner_id', uid).eq('archived', false).order('updated_at', { ascending: false }).limit(20)
  myPlants.value = (data ?? []) as MyPlant[]
}

// ── Photos ─────────────────────────────────────────────────────────

async function addBlob(file: Blob): Promise<boolean> {
  if (photos.value.length >= MAX_PHOTOS) return false
  let blob: Blob
  try {
    blob = await compressImage(file)
  } catch {
    return false
  }
  const photo = reactive<Photo>({ key: createId(), preview: URL.createObjectURL(blob), url: null, progress: 0, status: 'uploading', blob, fresh: true })
  photos.value.push(photo)
  upload(photo)
  return true
}

async function addPhoto() {
  if (photos.value.length >= MAX_PHOTOS) return
  const file = await pickImage()
  if (!file) return
  if (!await addBlob(file)) notify(t('feed.err.generic'), { tone: 'error' })
}

/** Uploads the newest journal photos of a local plant (compressed, EXIF stripped). */
async function attachLocal(ids: string[], name: string) {
  let n = 0
  for (const id of ids) {
    const stored = await photoStore.get(id).catch(() => undefined)
    if (stored && open.value && await addBlob(stored.blob)) n++
  }
  if (n) notify(t('feed.composer.autoPhotos', { n, name }), { tone: 'info', icon: 'i-tabler-photo-check' })
}

async function upload(photo: Photo) {
  const uid = user.value?.id
  if (!uid || !photo.blob) return
  photo.status = 'uploading'
  photo.progress = 0
  const sb = useSupabase()
  const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token
  const path = `${uid}/posts/${createId()}.jpg`
  // XHR instead of supabase-js so we get upload progress.
  const ok = await new Promise<boolean>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/media/${path}`)
    xhr.setRequestHeader('apikey', supabaseKey as string)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Content-Type', 'image/jpeg')
    xhr.setRequestHeader('Cache-Control', 'max-age=31536000')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) photo.progress = e.loaded / e.total
    }
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300)
    xhr.onerror = () => resolve(false)
    xhr.send(photo.blob)
  })
  if (!photos.value.includes(photo)) {
    if (ok) sb.storage.from('media').remove([path]).catch(() => {})
    return
  }
  if (!ok) {
    photo.status = 'error'
    return
  }
  photo.url = sb.storage.from('media').getPublicUrl(path).data.publicUrl
  photo.progress = 1
  photo.status = 'done'
}

function removePhoto(photo: Photo) {
  photos.value = photos.value.filter(p => p !== photo)
  if (photo.fresh && photo.url) {
    const path = storagePath(photo.url)
    if (path) useSupabase().storage.from('media').remove([path]).catch(() => {})
  }
  if (photo.preview.startsWith('blob:')) URL.revokeObjectURL(photo.preview)
}

// ── Plant context ──────────────────────────────────────────────────

const context = computed<PostPlantContext | null>(() => {
  if (!isQuestion.value) return null
  if (contextPlant.value) {
    const c = buildPlantContext(contextPlant.value)
    return c ? toPostContext(c) : null
  }
  return keepContext.value
})

function pickContext(id: string | null) {
  contextPlant.value = id
  if (!id) keepContext.value = null
}

// ── Submit ─────────────────────────────────────────────────────────

async function submit() {
  touched.value = true
  const uid = user.value?.id
  if (!uid || busy.value) return
  if (titleMissing.value) return
  if (uploading.value) {
    notify(t('feed.composer.waitUploads'), { tone: 'info' })
    return
  }
  const images = photos.value.filter(p => p.status === 'done' && p.url).map(p => p.url!)
  if (!body.value.trim() && !images.length) {
    notify(t('feed.composer.needBody'), { tone: 'error' })
    return
  }
  busy.value = true
  if (!await preCheck(title.value, body.value)) {
    busy.value = false
    return
  }
  const row: Record<string, unknown> = {
    category: category.value,
    title: title.value.trim() || null,
    body: body.value.trim(),
    images,
    plant_id: plantId.value,
    plant_context: context.value
  }
  const tags = isQuestion.value ? symptoms.value : []
  if (tags.length || props.post?.symptom_tags?.length) row.symptom_tags = tags
  const sb = useSupabase()
  const write = () => props.post
    ? sb.from('posts').update({ ...row, edited_at: new Date().toISOString() }).eq('id', props.post.id).select(POST_SELECT).single()
    : sb.from('posts').insert({ ...row, author_id: uid }).select(POST_SELECT).single()
  let res = await write()
  // symptom_tags not deployed yet
  if (res.error?.code === 'PGRST204' && 'symptom_tags' in row) {
    delete row.symptom_tags
    res = await write()
  }
  busy.value = false
  if (res.error || !res.data) {
    fail(res.error)
    return
  }
  if (props.post) {
    const gone = props.post.images.filter(u => !images.includes(u)).map(storagePath).filter((x): x is string => !!x)
    if (gone.length) sb.storage.from('media').remove(gone).catch(() => {})
  }
  submitted = true
  for (const p of photos.value) if (p.preview.startsWith('blob:')) URL.revokeObjectURL(p.preview)
  notify(t(props.post ? 'feed.composer.updated' : 'feed.composer.posted'))
  emit('saved', res.data as Post, !props.post)
  open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="editing ? t('feed.composer.edit') : t('feed.composer.new')"
    icon="community"
  >
    <form
      class="form-stack composer"
      @submit.prevent="submit"
    >
      <p class="hint">
        <UIcon name="i-tabler-language" />
        <span>{{ t('feed.composer.english') }} {{ t('feed.composer.rules') }}</span>
      </p>

      <div class="field">
        <span class="field-label">{{ t('feed.composer.category') }}</span>
        <div
          class="cats"
          role="radiogroup"
          :aria-label="t('feed.composer.category')"
        >
          <button
            v-for="c in CATEGORIES"
            :key="c"
            type="button"
            role="radio"
            class="chip"
            :aria-checked="category === c"
            :class="{ active: category === c }"
            @click="category = c"
          >
            <GrowIcon :name="CATEGORY_GLYPH[c]" />
            {{ t(`feed.cats.${c}`) }}
          </button>
        </div>
      </div>

      <label class="field">
        <span class="field-label">{{ isQuestion ? t('feed.composer.titleLabel') : t('feed.composer.titleOptional') }}</span>
        <input
          v-model="title"
          class="input"
          :class="{ invalid: touched && titleMissing }"
          maxlength="120"
          lang="en"
          enterkeyhint="next"
          :placeholder="isProblem ? t('feed.composer.problemPh') : isQuestion ? t('feed.composer.questionPh') : t('feed.composer.titlePh')"
          :aria-invalid="touched && titleMissing"
          :aria-describedby="touched && titleMissing ? titleErrId : undefined"
        >
        <span
          v-if="touched && titleMissing"
          :id="titleErrId"
          class="field-error"
          role="alert"
        >{{ t('feed.composer.titleRequired') }}</span>
      </label>

      <label class="field">
        <span class="field-label">{{ t('feed.composer.bodyLabel') }}</span>
        <textarea
          v-model="body"
          class="input body"
          maxlength="4000"
          rows="5"
          lang="en"
          :placeholder="isQuestion ? t('feed.composer.questionBodyPh') : t('feed.composer.bodyPh')"
        />
        <span
          v-if="body.length > 3500"
          class="field-hint num"
        >{{ body.length }} / 4000</span>
      </label>

      <div
        v-if="isQuestion"
        class="field"
      >
        <span class="field-label">{{ t('feed.composer.symptoms') }} <span class="count">{{ t('feed.composer.symptomsHint') }}</span></span>
        <div class="chips wrap">
          <button
            v-for="x in SYMPTOMS"
            :key="x"
            type="button"
            class="chip sym"
            :aria-pressed="symptoms.includes(x)"
            :disabled="!symptoms.includes(x) && symptoms.length >= MAX_SYMPTOMS"
            @click="toggleSymptom(x)"
          >
            {{ t(`feed.symptoms.${x}`) }}
          </button>
        </div>
      </div>

      <div class="field">
        <span class="field-label">{{ t('feed.composer.photos') }} <span class="num count">{{ photos.length }}/{{ MAX_PHOTOS }}</span></span>
        <div class="photos">
          <div
            v-for="p in photos"
            :key="p.key"
            class="thumb"
            :class="p.status"
          >
            <img
              :src="p.preview"
              alt=""
            >
            <span
              v-if="p.status === 'uploading'"
              class="thumb-progress"
              role="progressbar"
              :aria-label="t('feed.composer.uploading')"
              :aria-valuenow="Math.round(p.progress * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span :style="{ width: `${Math.max(6, p.progress * 100)}%` }" />
            </span>
            <button
              v-if="p.status === 'error'"
              type="button"
              class="thumb-retry"
              :aria-label="t('feed.composer.retryUpload')"
              @click="upload(p)"
            >
              <UIcon name="i-tabler-refresh" />
            </button>
            <button
              type="button"
              class="thumb-remove"
              :aria-label="t('feed.composer.remove')"
              @click="removePhoto(p)"
            >
              <UIcon name="i-tabler-x" />
            </button>
          </div>
          <button
            v-if="photos.length < MAX_PHOTOS"
            type="button"
            class="thumb add"
            :aria-label="t('feed.composer.addPhoto')"
            @click="addPhoto"
          >
            <GrowIcon name="photo" />
            <span>{{ t('feed.composer.addPhoto') }}</span>
          </button>
        </div>
        <ul
          v-if="isQuestion"
          class="checklist"
          :aria-label="t('feed.composer.checklist')"
        >
          <li class="check-title">
            {{ t('feed.composer.checklist') }}
          </li>
          <li :class="{ ok: photos.length >= 1 }">
            <UIcon :name="photos.length >= 1 ? 'i-tabler-circle-check-filled' : 'i-tabler-circle'" />
            {{ t('feed.composer.check.leaf') }}
          </li>
          <li :class="{ ok: photos.length >= 2 }">
            <UIcon :name="photos.length >= 2 ? 'i-tabler-circle-check-filled' : 'i-tabler-circle'" />
            {{ t('feed.composer.check.light') }}
          </li>
          <li :class="{ ok: !!context }">
            <UIcon :name="context ? 'i-tabler-circle-check-filled' : 'i-tabler-circle'" />
            {{ t('feed.composer.check.context') }}
          </li>
        </ul>
        <span
          v-if="photos.length"
          class="field-hint"
        >{{ t('feed.composer.privacy') }}</span>
      </div>

      <div class="field">
        <span class="field-label">{{ t('feed.composer.linkPlant') }}</span>
        <div
          v-if="myPlants.length"
          class="chips wrap"
        >
          <button
            type="button"
            class="chip"
            :aria-pressed="plantId === null"
            @click="plantId = null"
          >
            {{ t('feed.composer.none') }}
          </button>
          <button
            v-for="p in myPlants"
            :key="p.id"
            type="button"
            class="chip"
            :aria-pressed="plantId === p.id"
            @click="plantId = p.id"
          >
            <GrowIcon
              :name="stageInfo(p.stage).glyph"
              :style="{ color: stageInfo(p.stage).color }"
            />
            {{ p.name }}
          </button>
        </div>
        <span
          v-else
          class="field-hint"
        >{{ t('feed.composer.noPublicPlants') }}</span>
      </div>

      <div
        v-if="isQuestion && (localPlants.length || keepContext)"
        class="field"
      >
        <span class="field-label">{{ t('feed.composer.context') }}</span>
        <span class="field-hint">{{ t('feed.composer.contextHint') }}</span>
        <div class="chips wrap">
          <button
            type="button"
            class="chip"
            :aria-pressed="!context"
            @click="pickContext(null)"
          >
            {{ t('feed.composer.none') }}
          </button>
          <button
            v-for="p in localPlants"
            :key="p.id"
            type="button"
            class="chip"
            :aria-pressed="contextPlant === p.id"
            @click="pickContext(p.id)"
          >
            <GrowIcon
              :name="stageInfo(p.stage).glyph"
              :style="{ color: stageInfo(p.stage).color }"
            />
            {{ p.name }}
          </button>
        </div>
        <CommunityFeedPlantContext
          v-if="context"
          :ctx="context"
        />
      </div>
    </form>

    <template #footer>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="busy || uploading"
        @click="submit"
      >
        <UIcon
          v-if="busy || uploading"
          name="i-tabler-loader-2"
          class="spin"
        />
        <UIcon
          v-else
          name="i-tabler-send"
        />
        {{ editing ? t('feed.composer.saveChanges') : t('feed.composer.post') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.composer {
  min-height: min(70dvh, 620px);
}

.hint {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.45;
}

.hint .iconify {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 16px;
  color: var(--text-3);
}

.cats,
.chips.wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  overflow: visible;
}

.chip .grow-icon,
.chip .iconify {
  font-size: 16px;
}

.chip.sym {
  min-height: 44px;
}

.chip:disabled {
  opacity: 0.4;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 4px 0 0;
  padding: 12px 14px;
  list-style: none;
  border-radius: var(--radius-control);
  border: 1px solid var(--line);
  background: var(--surface-2);
  font-size: 13px;
  color: var(--text-2);
}

.checklist li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}

.checklist .iconify {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 16px;
  color: var(--text-3);
  transition: color var(--dur) ease;
}

.checklist li.ok .iconify {
  color: var(--green);
}

.check-title {
  font-weight: 600;
  color: var(--text);
}

.count {
  margin-left: 4px;
  font-weight: 500;
  color: var(--text-3);
}

.body {
  min-height: 130px;
}

.photos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}

.thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  border: 0;
  background: var(--well);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity var(--dur) ease;
}

.thumb.uploading img {
  opacity: 0.55;
}

.thumb.error img {
  opacity: 0.35;
}

.thumb-progress {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  height: 4px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.thumb-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--green);
  transition: width var(--dur) var(--ease-out);
}

.thumb-retry {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.7);
  color: var(--red);
  font-size: 20px;
}

.thumb-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 6px;
  border: 0;
  background: none;
  color: var(--text);
}

.thumb-remove .iconify {
  width: 24px;
  height: 24px;
  padding: 4px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
}

.thumb.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed var(--line-strong);
  background: var(--surface-2);
  color: var(--green);
  font-size: 12px;
  font-weight: 600;
}

.thumb.add .grow-icon {
  font-size: 26px;
}

.thumb.add:active {
  transform: scale(0.97);
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
