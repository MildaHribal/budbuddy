<script setup lang="ts">
import type { Challenge, ChallengeEntry } from '~/utils/challenge'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ challenge: Challenge }>()
const emit = defineEmits<{ entered: [entry: ChallengeEntry] }>()

const { t } = useI18n()
const { user } = useAuth()
const { notify } = useNotify()

interface MyPlant { id: string, name: string, cover_url: string }

const file = shallowRef<File | null>(null)
const preview = ref<string | null>(null)
const plantId = ref<string | null>(null)
const caption = ref('')
const busy = ref(false)
const plants = ref<MyPlant[]>([])
const plantsLoaded = ref(false)

const imageUrl = computed(() => preview.value ?? plants.value.find(p => p.id === plantId.value)?.cover_url ?? null)

function setPreview(f: File | null) {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = f ? URL.createObjectURL(f) : null
}

watch(open, async (v) => {
  if (!v) return
  file.value = null
  setPreview(null)
  plantId.value = null
  caption.value = ''
  if (plantsLoaded.value || !user.value) return
  const { data } = await useSupabase().from('public_plants')
    .select('id, name, cover_url').eq('owner_id', user.value.id).not('cover_url', 'is', null)
    .order('updated_at', { ascending: false }).limit(12)
  plants.value = (data ?? []) as MyPlant[]
  plantsLoaded.value = true
})

onBeforeUnmount(() => setPreview(null))

async function pick() {
  const f = await pickImage()
  if (!f) return
  file.value = f
  setPreview(f)
  plantId.value = null
}

function selectPlant(p: MyPlant) {
  file.value = null
  setPreview(null)
  plantId.value = plantId.value === p.id ? null : p.id
}

async function submit() {
  if (!user.value || !imageUrl.value || busy.value) return
  busy.value = true
  let uploaded: string | null = null
  try {
    // plant covers get deleted on re-sync, so entries keep their own copy
    const image_url = file.value
      ? (uploaded = await uploadChallengeImage(file.value))
      : (uploaded = await copyToChallenges(imageUrl.value)) ?? imageUrl.value
    const { data, error } = await useSupabase().from('challenge_entries').insert({
      challenge_id: props.challenge.id,
      user_id: user.value.id,
      plant_id: plantId.value,
      image_url,
      caption: caption.value.trim() || null
    }).select(ENTRY_SELECT).single()
    if (error) throw error
    open.value = false
    notify(t('challenge.sheet.done'))
    emit('entered', data as unknown as ChallengeEntry)
  } catch (e) {
    if (uploaded) removeChallengeImage(uploaded)
    const err = e as { code?: string, message?: string }
    const blocked = contentBlockedKey(err)
    if (blocked) return notify(t(`challenge.blocked.${blocked}`), { tone: 'error' })
    const msg = err.code === '23505'
      ? 'already'
      : err.message?.includes('not open') || err.message?.includes('closed')
        ? 'closed'
        : err.code === '42501' ? 'banned' : 'error'
    notify(t(`challenge.sheet.${msg}`), { tone: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('challenge.sheet.title')"
    icon="photo"
  >
    <form
      class="form-stack"
      @submit.prevent="submit"
    >
      <div class="field">
        <span class="field-label">{{ t('challenge.sheet.photo') }}</span>
        <button
          type="button"
          class="drop"
          :class="{ filled: imageUrl }"
          @click="pick"
        >
          <img
            v-if="imageUrl"
            :src="imageUrl"
            alt=""
          >
          <span class="drop-label">
            <UIcon name="i-tabler-photo-plus" />
            {{ imageUrl ? t('challenge.sheet.change') : t('challenge.sheet.pick') }}
          </span>
        </button>
      </div>

      <div class="field">
        <span class="field-label">{{ t('challenge.sheet.fromPlant') }}</span>
        <div
          v-if="plants.length"
          class="plants"
        >
          <button
            v-for="p in plants"
            :key="p.id"
            type="button"
            class="plant"
            :aria-pressed="plantId === p.id"
            @click="selectPlant(p)"
          >
            <img
              :src="p.cover_url"
              alt=""
              loading="lazy"
            >
            <span>{{ p.name }}</span>
          </button>
        </div>
        <p
          v-else-if="plantsLoaded"
          class="field-hint"
        >
          {{ t('challenge.sheet.noPlants') }}
        </p>
      </div>

      <label class="field">
        <span class="field-label">{{ t('challenge.sheet.caption') }}</span>
        <textarea
          v-model="caption"
          class="input"
          maxlength="300"
          rows="2"
          lang="en"
          :placeholder="t('challenge.sheet.captionPlaceholder')"
        />
        <span class="field-hint hint-row"><UIcon name="i-tabler-language" />{{ t('challenge.sheet.english') }}</span>
        <span class="field-hint hint-row"><UIcon name="i-tabler-shield-check" />{{ t('challenge.sheet.noSale') }}</span>
      </label>

      <button
        type="submit"
        class="btn btn-primary btn-block"
        :disabled="!imageUrl || busy"
      >
        {{ busy ? t('challenge.sheet.uploading') : t('challenge.sheet.submit') }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.drop {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius);
  border: 1px dashed var(--line-strong);
  background: #0b0d10;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
  color: var(--text-2);
  overflow: hidden;
}

.drop.filled {
  border-style: solid;
}

.drop img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drop-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.filled .drop-label {
  align-self: end;
  margin-bottom: 10px;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  color: var(--text);
}

.drop-label .iconify {
  font-size: 18px;
}

.plants {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.plant {
  flex: 0 0 84px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
}

.plant img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: border-color var(--dur) ease;
}

.plant[aria-pressed="true"] img {
  border-color: var(--leaf);
}

.plant span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-2);
}

.hint-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
