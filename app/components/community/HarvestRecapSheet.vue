<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { Plant } from '~/types/grow'
import { blobToBase64, renderRecapCard, type RecapStat } from '~/utils/shareCard'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plant: Plant }>()

const { t, locale } = useI18n()
const { notify } = useNotify()
const grow = useGrow()
const isNative = Capacitor.isNativePlatform()

type StatKey = 'days' | 'trainings' | 'waterings' | 'dry'
const shown = ref<StatKey[]>(['days', 'trainings', 'waterings', 'dry'])
const photoChoice = ref<string | null>(null)
const photoUrls = ref<{ id: string, url: string }[]>([])
const busy = ref(false)
const blob = shallowRef<Blob | null>(null)
const preview = ref<string | null>(null)

const entries = computed(() => grow.entriesFor(props.plant.id))
const numbers = computed<Record<StatKey, number | null>>(() => {
  const p = props.plant
  const end = p.harvest?.date ?? todayISO()
  return {
    days: Math.max(0, daysBetween(p.startDate, end)),
    trainings: entries.value.filter(e => e.type === 'train').length,
    waterings: entries.value.filter(e => e.type === 'water' || e.type === 'feed').length,
    dry: p.harvest?.dryWeight ?? null
  }
})
const available = computed(() => (['days', 'trainings', 'waterings', 'dry'] as StatKey[]).filter(k => numbers.value[k] != null))

function stat(k: StatKey): RecapStat {
  const n = numbers.value[k] ?? 0
  if (k === 'dry') return { value: `${locale.value === 'cs' ? String(n).replace('.', ',') : n} g`, label: t('plant.recap.dry'), warm: true }
  return { value: String(n), label: t(`plant.recap.${k}`, { n }) }
}

function clear() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
  blob.value = null
}

let seq = 0
async function render() {
  const mine = ++seq
  busy.value = true
  try {
    const photo = photoUrls.value.find(p => p.id === photoChoice.value)?.url ?? null
    const out = await renderRecapCard({
      title: t('plant.recap.cardTitle'),
      name: props.plant.name,
      strain: props.plant.strain,
      photoUrl: photo,
      stats: available.value.filter(k => shown.value.includes(k)).map(stat)
    })
    if (mine !== seq || !open.value) return
    clear()
    blob.value = out
    preview.value = URL.createObjectURL(out)
  } catch (e) {
    console.error(e)
    notify(t('plant.share.failed'), { tone: 'error' })
  } finally {
    if (mine === seq) busy.value = false
  }
}

watch(open, async (v) => {
  if (!v) return clear()
  const ids: string[] = []
  if (props.plant.photoId) ids.push(props.plant.photoId)
  for (const e of entries.value) for (const id of e.photoIds) if (ids.length < 8 && !ids.includes(id)) ids.push(id)
  const loaded = await Promise.all(ids.map(async id => ({ id, url: await photoUrl(id) })))
  photoUrls.value = loaded.filter((x): x is { id: string, url: string } => !!x.url)
  photoChoice.value = photoUrls.value[0]?.id ?? null
  render()
})
watch([shown, photoChoice], () => {
  if (open.value) render()
})
onBeforeUnmount(clear)

function toggleStat(k: StatKey) {
  shown.value = shown.value.includes(k) ? shown.value.filter(x => x !== k) : [...shown.value, k]
}

async function send() {
  const b = blob.value
  if (!b || busy.value) return
  const filename = `budbuddy-harvest-${props.plant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plant'}.png`
  busy.value = true
  try {
    if (isNative) {
      const { uri } = await Filesystem.writeFile({ path: filename, data: await blobToBase64(b), directory: Directory.Cache })
      try {
        await Share.share({ title: props.plant.name, files: [uri] })
      } catch (e) {
        if (!/cancel/i.test(String(e))) throw e
        return
      }
    } else {
      const a = document.createElement('a')
      a.href = preview.value!
      a.download = filename
      a.click()
      notify(t('plant.share.downloaded'))
    }
    haptic('success')
    open.value = false
  } catch (e) {
    console.error(e)
    notify(t('plant.share.failed'), { tone: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('plant.recap.title')"
    icon="harvest"
    icon-color="var(--lamp)"
  >
    <div class="form-stack">
      <div
        class="preview"
        :class="{ loading: !preview }"
      >
        <img
          v-if="preview"
          :src="preview"
          :alt="t('plant.recap.previewAlt', { name: plant.name })"
        >
        <span
          v-else
          class="muted"
        >{{ t('plant.share.rendering') }}</span>
      </div>

      <div class="field">
        <span class="field-label">{{ t('plant.recap.numbers') }}</span>
        <div class="chips stat-chips">
          <button
            v-for="k in available"
            :key="k"
            type="button"
            class="chip"
            :aria-pressed="shown.includes(k)"
            @click="toggleStat(k)"
          >
            {{ stat(k).value }} {{ k === 'dry' ? t('plant.recap.dryShort') : stat(k).label }}
          </button>
        </div>
      </div>

      <div
        v-if="photoUrls.length"
        class="field"
      >
        <span class="field-label">{{ t('plant.recap.photo') }}</span>
        <div class="photos">
          <button
            type="button"
            class="ph none"
            :aria-pressed="photoChoice === null"
            :aria-label="t('plant.recap.noPhoto')"
            @click="photoChoice = null"
          >
            <GrowIcon name="harvest" />
          </button>
          <button
            v-for="p in photoUrls"
            :key="p.id"
            type="button"
            class="ph"
            :aria-pressed="photoChoice === p.id"
            :aria-label="t('plant.recap.usePhoto')"
            @click="photoChoice = p.id"
          >
            <img
              :src="p.url"
              alt=""
              loading="lazy"
            >
          </button>
        </div>
      </div>

      <p class="field-hint hint-row">
        <UIcon name="i-tabler-map-pin-off" />{{ t('plant.recap.private') }}
      </p>

      <button
        type="button"
        class="btn btn-lamp btn-block"
        :disabled="!blob || busy"
        @click="send"
      >
        <UIcon
          :name="isNative ? 'i-tabler-share' : 'i-tabler-download'"
          class="size-5"
        />
        {{ isNative ? t('plant.share.share') : t('plant.share.download') }}
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.preview {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 5;
  width: min(100%, 300px);
  margin: 0 auto;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #07080a;
  box-shadow: var(--panel-shadow);
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: develop var(--dur-slow) var(--ease-out);
}

.stat-chips {
  flex-wrap: wrap;
  overflow: visible;
}

.photos {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.ph {
  flex: 0 0 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #0b0d10;
}

.ph img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ph.none {
  display: grid;
  place-items: center;
  font-size: 22px;
  color: var(--lamp);
}

.ph[aria-pressed='true'] {
  border-color: var(--lamp);
  box-shadow: 0 0 0 1px var(--lamp);
}

.hint-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

@keyframes develop {
  from { opacity: 0; filter: brightness(1.6) saturate(0.4); }
}

@media (prefers-reduced-motion: reduce) {
  .preview img { animation: none; }
}
</style>
