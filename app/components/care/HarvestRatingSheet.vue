<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import type { HarvestRating, Plant } from '~/types/grow'
import { buildRatingRequest, MAX_RATING_PHOTOS, parseRatingReply } from '~/ai/harvestRating'
import { LlmError, type LlmImage } from '~/ai/llm'
import { loadNamespaces } from '~/composables/useI18n'
import { authUiWanted } from '~/utils/authUi'
import { scoreHarvest } from '~/utils/harvestScore'
import { blobToDataUrl, compressImage } from '~/utils/image'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plant: Plant }>()
const emit = defineEmits<{ rated: [rating: HarvestRating] }>()

const { t } = useI18n()
const grow = useGrow()
const { notify } = useNotify()
const today = useToday()
const { provider } = useAiSettings()
const native = Capacitor.isNativePlatform()

interface Shot { id: string, file: Blob }
const shots = ref<Shot[]>([])
const aroma = ref<1 | 2 | 3 | null>(null)
const dry = ref<number | ''>('')
const busy = ref(false)
const judging = ref(false)
const problem = ref<string | null>(null)
const needsSignIn = ref(false)
let controller: AbortController | null = null

watch(open, (v) => {
  if (!v) {
    controller?.abort()
    return
  }
  shots.value = []
  aroma.value = props.plant.harvest?.rating?.aroma ?? null
  dry.value = props.plant.harvest?.dryWeight ?? ''
  problem.value = null
  needsSignIn.value = false
})

async function addPhoto() {
  if (shots.value.length >= MAX_RATING_PHOTOS) return
  const file = await pickImage('environment')
  if (!file) return
  busy.value = true
  try {
    shots.value.push({ id: await grow.savePhoto(file), file })
  } catch (e) {
    console.error(e)
    notify(t('entry.imageError'), { tone: 'error' })
  } finally {
    busy.value = false
  }
}

function removePhoto(id: string) {
  shots.value = shots.value.filter(s => s.id !== id)
  grow.cleanupPhotos()
}

async function toImage(blob: Blob): Promise<LlmImage> {
  const small = await compressImage(blob, 1024, 0.85)
  const url = await blobToDataUrl(small)
  return { mimeType: small.type || 'image/jpeg', base64: url.slice(url.indexOf(',') + 1) }
}

async function promptSignIn() {
  const [{ useAuth }] = await Promise.all([import('~/composables/useAuth'), loadNamespaces(['auth'])])
  const auth = useAuth()
  if (auth.signedIn.value) await auth.signOut(true)
  authUiWanted.value = true
  auth.signInPrompt.value = true
}

async function judge() {
  if (!shots.value.length || judging.value) return
  const weight = dry.value === '' || Number.isNaN(dry.value) ? null : Number(dry.value)
  if (weight != null && (weight < 0 || weight > 5000)) {
    problem.value = t('care.rate.weightRange')
    return
  }
  problem.value = null
  needsSignIn.value = false
  judging.value = true
  controller = new AbortController()
  try {
    await loadNamespaces(['ai'])
    if (weight !== (props.plant.harvest?.dryWeight ?? null)) grow.updateHarvest(props.plant.id, { dryWeight: weight })
    const plant = grow.getPlant(props.plant.id)!
    const entries = grow.entriesFor(plant.id)
    const images = await Promise.all(shots.value.map(s => toImage(s.file)))
    const req = buildRatingRequest({ plant, entries, images, aroma: aroma.value, today: today.value })
    let parsed = null
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      const answer = await provider.value.generate({ ...req, signal: controller.signal })
      parsed = parseRatingReply(answer.text)
    }
    if (!parsed) {
      problem.value = t('care.rate.unreadable')
      return
    }
    if (!parsed.valid) {
      problem.value = t('care.rate.notBuds', { reason: parsed.reason })
      return
    }
    const photoIds = shots.value.map(s => s.id)
    grow.addEntry({ plantId: plant.id, type: 'photo', date: today.value, photoIds, note: t('care.rate.entryNote') })
    const rating = scoreHarvest(plant, grow.entriesFor(plant.id), parsed, { photoIds, aroma: aroma.value }, today.value)
    grow.updateHarvest(plant.id, { rating })
    haptic('success')
    emit('rated', rating)
    open.value = false
  } catch (e) {
    if (e instanceof LlmError && e.code === 'aborted') return
    if (e instanceof LlmError && e.code === 'auth') needsSignIn.value = true
    problem.value = e instanceof LlmError ? e.message : t('care.rate.failed')
  } finally {
    judging.value = false
    controller = null
  }
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('care.rate.sheetTitle')"
    icon="i-tabler-star"
    icon-color="var(--amber)"
  >
    <div class="form-stack">
      <p class="care-note">
        {{ t('care.rate.sheetIntro') }}
      </p>

      <p
        v-if="!native"
        class="note-box"
        role="note"
      >
        <UIcon name="i-tabler-device-mobile" />
        <span>{{ t('care.rate.appOnly') }}</span>
      </p>

      <div class="field">
        <span class="field-label">{{ t('care.rate.photos', { n: MAX_RATING_PHOTOS }) }}</span>
        <div class="photos">
          <div
            v-for="s in shots"
            :key="s.id"
            class="photo"
          >
            <PlantPhoto
              :photo-id="s.id"
              stage="curing"
            />
            <button
              type="button"
              class="photo-remove"
              :aria-label="t('entry.removePhoto')"
              :disabled="judging"
              @click="removePhoto(s.id)"
            >
              <UIcon
                name="i-tabler-x"
                class="size-4"
              />
            </button>
          </div>
          <button
            v-if="shots.length < MAX_RATING_PHOTOS"
            type="button"
            class="photo add"
            :disabled="busy || judging"
            @click="addPhoto"
          >
            <UIcon
              :name="busy ? 'i-tabler-loader-2' : 'i-tabler-camera-plus'"
              class="size-6"
              :class="{ 'animate-spin': busy }"
            />
            <span>{{ busy ? t('entry.savingPhoto') : t('entry.addPhoto') }}</span>
          </button>
        </div>
        <span class="field-hint">{{ t('care.rate.photoHint') }}</span>
      </div>

      <div class="field">
        <label
          class="field-label"
          for="rate-dry"
        >{{ t('care.rate.dryWeight') }}</label>
        <input
          id="rate-dry"
          v-model.number="dry"
          class="input num"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.1"
          :placeholder="t('care.rate.dryPlaceholder')"
        >
        <span class="field-hint">{{ t('care.rate.dryHint') }}</span>
      </div>

      <div class="field">
        <span class="field-label">{{ t('care.rate.aroma') }}</span>
        <div class="chips">
          <button
            v-for="a in ([1, 2, 3] as const)"
            :key="a"
            type="button"
            class="chip"
            :aria-pressed="aroma === a"
            @click="aroma = aroma === a ? null : a"
          >
            {{ t(`care.rate.aromaLevel.${a}`) }}
          </button>
        </div>
      </div>

      <p
        v-if="problem"
        class="field-error"
        role="alert"
      >
        {{ problem }}
      </p>
      <button
        v-if="needsSignIn"
        type="button"
        class="btn btn-soft"
        @click="promptSignIn"
      >
        {{ t('care.rate.signIn') }}
      </button>
    </div>

    <template #footer>
      <button
        type="button"
        class="btn btn-primary w-full"
        :disabled="!native || !shots.length || judging || busy"
        @click="judge"
      >
        <UIcon
          v-if="judging"
          name="i-tabler-loader-2"
          class="animate-spin"
        />
        {{ judging ? t('care.rate.judging') : t('care.rate.submit') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.care-note {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.note-box {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--amber) 12%, transparent);
  color: var(--amber);
  font-size: 13px;
  line-height: 1.45;
}

.note-box > :first-child {
  flex-shrink: 0;
  margin-top: 2px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photo {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-2);
}

.photo.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed var(--line-strong);
  color: var(--text-2);
  font-size: 12px;
}

.photo-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 5px;
  border: 0;
  background: none;
  color: #fff;
}

.photo-remove > * {
  box-sizing: content-box;
  padding: 4px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.72);
}
</style>
