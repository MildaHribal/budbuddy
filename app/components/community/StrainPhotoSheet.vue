<script setup lang="ts">
import { compressImage } from '~/utils/image'
import { createId } from '~/utils/id'
import { mediaPathOf, photoDraftIssue, photoErrorKey, type PhotoKind } from '~/utils/strainPhotos'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ strainId: string, strainName: string }>()
const emit = defineEmits<{ sent: [] }>()

const { t } = useI18n()
const { user } = useAuth()
const { notify } = useNotify()

const photo = ref<Blob | null>(null)
const preview = ref<string | null>(null)
const size = ref<{ w: number, h: number } | null>(null)
const kind = ref<PhotoKind | null>(null)
const consentDisplay = ref(false)
const consentTraining = ref(false)
const reading = ref(false)
const busy = ref(false)
const touched = ref(false)

const issue = computed(() => photoDraftIssue({ photo: photo.value, kind: kind.value, consentDisplay: consentDisplay.value }))
const consentErrId = useId()
const kindErrId = useId()
const kindLabelId = useId()

function setPreview(blob: Blob | null) {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = blob ? URL.createObjectURL(blob) : null
}

watch(open, (v) => {
  if (v) {
    photo.value = null
    setPreview(null)
    size.value = null
    kind.value = null
    consentDisplay.value = false
    consentTraining.value = false
    touched.value = false
  } else if (!busy.value) {
    setPreview(null)
  }
})
onBeforeUnmount(() => setPreview(null))

async function choose(capture?: 'environment') {
  const file = await pickImage(capture)
  if (!file) return
  reading.value = true
  try {
    // re-encoding drops EXIF, GPS included
    const blob = await compressImage(file)
    const bmp = await createImageBitmap(blob).catch(() => null)
    size.value = bmp ? { w: bmp.width, h: bmp.height } : null
    bmp?.close()
    photo.value = blob
    setPreview(blob)
  } catch {
    notify(t('strains.userPhoto.readFailed'), { tone: 'error' })
  } finally {
    reading.value = false
  }
}

async function upload(path: string, blob: Blob): Promise<string> {
  const bucket = useSupabase().storage.from('media')
  const { error } = await bucket.upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' })
  if (error) throw error
  return bucket.getPublicUrl(path).data.publicUrl
}

async function submit() {
  touched.value = true
  const uid = user.value?.id
  if (issue.value || !photo.value || !uid || busy.value) return
  busy.value = true
  const id = createId()
  const urls: string[] = []
  try {
    const thumb = await compressImage(photo.value, 480, 0.8)
    urls.push(await upload(`${uid}/strain-photos/${id}.jpg`, photo.value))
    urls.push(await upload(`${uid}/strain-photos/${id}-thumb.jpg`, thumb))
    const { error } = await useSupabase().from('strain_photos').insert({
      strain_id: props.strainId,
      kind: kind.value,
      url: urls[0],
      thumb_url: urls[1],
      width: size.value?.w ?? null,
      height: size.value?.h ?? null,
      consent_display: true,
      consent_training: consentTraining.value
    })
    if (error) throw error
  } catch (e) {
    const paths = urls.map(mediaPathOf).filter((x): x is string => !!x)
    if (paths.length) useSupabase().storage.from('media').remove(paths).catch(() => {})
    busy.value = false
    notify(t(`strains.userPhoto.${photoErrorKey(e as { code?: string, message?: string })}`), { tone: 'error' })
    return
  }
  busy.value = false
  open.value = false
  notify(t('strains.userPhoto.sent'), { tone: 'success', duration: 6000 })
  emit('sent')
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('strains.userPhoto.title')"
  >
    <template #icon>
      <UIcon name="i-tabler-camera-plus" />
    </template>
    <form
      id="strain-photo"
      class="form-stack"
      novalidate
      @submit.prevent="submit"
    >
      <p class="muted intro">
        {{ t('strains.userPhoto.intro', { strain: strainName }) }}
      </p>

      <div class="field">
        <span class="field-label">{{ t('strains.userPhoto.photo') }}</span>
        <div
          v-if="preview"
          class="preview"
        >
          <img
            :src="preview"
            :alt="t('strains.userPhoto.previewAlt')"
          >
        </div>
        <div
          v-else
          class="pick-empty"
          :class="{ invalid: touched && issue === 'photo' }"
          :aria-busy="reading"
        >
          <UIcon
            :name="reading ? 'i-tabler-loader-2' : 'i-tabler-photo'"
            :class="{ 'animate-spin': reading }"
            class="pick-icon"
          />
          <span>{{ reading ? t('strains.userPhoto.preparing') : t('strains.userPhoto.pickHint') }}</span>
        </div>
        <div class="pick-row">
          <button
            type="button"
            class="btn"
            :disabled="reading || busy"
            @click="choose('environment')"
          >
            <UIcon name="i-tabler-camera" />{{ t('strains.userPhoto.camera') }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="reading || busy"
            @click="choose()"
          >
            <UIcon name="i-tabler-photo" />{{ preview ? t('strains.userPhoto.change') : t('strains.userPhoto.gallery') }}
          </button>
        </div>
        <span class="field-hint">{{ t('strains.userPhoto.privacy') }}</span>
      </div>

      <div class="field">
        <span
          :id="kindLabelId"
          class="field-label"
        >{{ t('strains.userPhoto.kind') }}</span>
        <div
          class="segmented"
          role="group"
          :aria-labelledby="kindLabelId"
          :aria-describedby="touched && issue === 'kind' ? kindErrId : undefined"
        >
          <button
            v-for="k in (['plant', 'bud'] as const)"
            :key="k"
            type="button"
            :aria-pressed="kind === k"
            @click="kind = k"
          >
            <GrowIcon :name="k === 'plant' ? 'plants' : 'flowering'" />{{ t(`strains.photoKind.${k}`) }}
          </button>
        </div>
        <span
          v-if="touched && issue === 'kind'"
          :id="kindErrId"
          class="field-error"
        >{{ t('strains.userPhoto.needKind') }}</span>
      </div>

      <div class="consents">
        <label
          class="check"
          :class="{ invalid: touched && issue === 'consent' }"
        >
          <input
            v-model="consentDisplay"
            type="checkbox"
            required
            :aria-invalid="touched && issue === 'consent'"
            :aria-describedby="touched && issue === 'consent' ? consentErrId : undefined"
          >
          <span>{{ t('strains.userPhoto.consentDisplay') }}</span>
        </label>
        <span
          v-if="touched && issue === 'consent'"
          :id="consentErrId"
          class="field-error"
        >{{ t('strains.userPhoto.needConsent') }}</span>
        <label class="check">
          <input
            v-model="consentTraining"
            type="checkbox"
          >
          <span>
            {{ t('strains.userPhoto.consentTraining') }}
            <small>{{ t('strains.userPhoto.optional') }}</small>
          </span>
        </label>
      </div>

      <p class="rule">
        <UIcon
          name="i-tabler-shield-check"
          class="rule-icon"
        />
        <span>{{ t('strains.userPhoto.rules') }}</span>
      </p>
    </form>
    <template #footer>
      <button
        type="submit"
        form="strain-photo"
        class="btn btn-primary"
        :disabled="busy || reading"
      >
        <UIcon
          v-if="busy"
          name="i-tabler-loader-2"
          class="size-5 animate-spin"
        />
        {{ busy ? t('strains.userPhoto.sending') : t('strains.userPhoto.send') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.intro {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.preview,
.pick-empty {
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-2);
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pick-empty {
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border: 1px dashed var(--line-strong);
  color: var(--text-2);
  font-size: 13px;
  text-align: center;
}

.pick-empty.invalid {
  border-color: var(--red);
}

.pick-icon {
  font-size: 32px;
  color: var(--text-3);
}

.pick-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pick-row .btn {
  padding: 0 12px;
}

.consents {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 44px;
  font-size: 14px;
  line-height: 1.45;
  cursor: pointer;
}

.check input {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin: 0;
  accent-color: var(--green);
}

.check.invalid input {
  outline: 2px solid var(--red);
  outline-offset: 2px;
}

.check small {
  color: var(--text-3);
  font-size: 12px;
}

.consents .field-error {
  margin: -4px 0 4px 34px;
}

.rule {
  display: flex;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.rule-icon {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 18px;
  color: var(--text-3);
}
</style>
