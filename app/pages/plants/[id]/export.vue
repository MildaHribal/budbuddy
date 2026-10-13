<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { buildArchive, extFromType, journalCsv, photoFileNames, type ArchivePhoto } from '~/utils/review/archive'
import { daySeries, runSummary } from '~/utils/review/compare'
import { safeFileName, shareFiles } from '~/utils/review/shareFile'
import { timelapseFrames } from '~/utils/review/timelapse'

const route = useRoute()
const grow = useGrow()
const { t } = useI18n()
const { notify } = useNotify()
const today = useToday()
const isNative = Capacitor.isNativePlatform()

const plantId = computed(() => String(route.params.id))
const plant = computed(() => grow.getPlant(plantId.value))
useHead({ title: () => `${t('review.export.title')} · ${plant.value?.name ?? ''}` })

const entries = computed(() => grow.entriesFor(plantId.value))
const frames = computed(() => (plant.value ? timelapseFrames(plant.value, grow.state.entries) : []))
const summary = computed(() => (plant.value ? runSummary(plant.value, grow.state.entries, today.value) : null))
const photoTotal = computed(() => frames.value.length + (plant.value?.photoId ? 1 : 0))
const includePhotos = ref(true)
const baseName = computed(() => safeFileName(plant.value?.name ?? '', 'plant'))

// ── PDF report ────────────────────────────────────────────────────
const pdfBusy = ref(false)
const pdfProgress = ref(0)
const pdf = shallowRef<Blob | null>(null)
const previews = ref<string[]>([])

function clearPdf() {
  previews.value.forEach(u => URL.revokeObjectURL(u))
  previews.value = []
  pdf.value = null
}
watch(includePhotos, clearPdf)
onBeforeUnmount(clearPdf)

async function makePdf() {
  const p = plant.value
  const s = summary.value
  if (!p || !s || pdfBusy.value) return
  clearPdf()
  pdfBusy.value = true
  pdfProgress.value = 0
  try {
    const { renderReport } = await import('~/utils/review/reportPages')
    const res = await renderReport({
      plant: JSON.parse(JSON.stringify(p)),
      entries: entries.value,
      summary: s,
      frames: frames.value,
      height: daySeries(p, entries.value, 'heightCm'),
      ec: daySeries(p, entries.value, 'ec'),
      ph: daySeries(p, entries.value, 'ph'),
      includePhotos: includePhotos.value,
      t,
      onProgress: v => (pdfProgress.value = v)
    })
    pdf.value = res.pdf
    previews.value = res.previews.map(b => URL.createObjectURL(b))
    haptic('success')
  } catch (e) {
    console.error(e)
    notify(t('review.export.failed'), { tone: 'error' })
  } finally {
    pdfBusy.value = false
  }
}

async function sharePdf() {
  if (!pdf.value || !plant.value) return
  await deliver([{ blob: pdf.value, name: `${baseName.value}-report.pdf` }])
}

// ── ZIP archive ───────────────────────────────────────────────────
const zipBusy = ref(false)
const zipProgress = ref(0)
const zip = shallowRef<Blob | null>(null)
const zipSkipped = ref(0)

async function photoBytes(id: string): Promise<{ bytes: Uint8Array, type: string } | null> {
  const url = await photoUrl(id, 'full')
  if (!url) return null
  const blob = await (await fetch(url)).blob()
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type }
}

async function makeZip() {
  const p = plant.value
  if (!p || zipBusy.value) return
  zip.value = null
  zipBusy.value = true
  zipProgress.value = 0
  zipSkipped.value = 0
  try {
    const list: (ArchivePhoto & { bytes: Uint8Array })[] = []
    const ids = frames.value.map(f => ({ photoId: f.photoId, date: f.date, day: f.day }))
    if (p.photoId && !ids.some(i => i.photoId === p.photoId)) ids.unshift({ photoId: p.photoId, date: p.startDate, day: 0 })
    for (const [i, f] of ids.entries()) {
      try {
        const got = await photoBytes(f.photoId)
        if (got) list.push({ ...f, ext: extFromType(got.type), bytes: got.bytes })
        else zipSkipped.value++
      } catch {
        zipSkipped.value++
      }
      zipProgress.value = (i + 1) / Math.max(1, ids.length) * 0.9
      if (i % 4 === 3) await new Promise(r => setTimeout(r, 0))
    }
    const names = photoFileNames(list)
    const plain = JSON.parse(JSON.stringify({ plant: p, entries: entries.value }))
    const data = {
      app: 'budbuddy',
      kind: 'plant-export',
      exportedAt: new Date().toISOString(),
      ...plain,
      photoFiles: Object.fromEntries(names)
    }
    const extra = pdf.value ? [{ name: 'report.pdf', bytes: new Uint8Array(await pdf.value.arrayBuffer()) }] : []
    const bytes = buildArchive({
      data,
      csv: journalCsv(p, entries.value, names),
      readme: t('review.export.readme', { name: p.name, date: formatDate(todayISO()) }),
      photos: list.map(ph => ({ name: names.get(ph.photoId)!, bytes: ph.bytes })),
      extra
    }, baseName.value)
    zip.value = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' })
    zipProgress.value = 1
    haptic('success')
  } catch (e) {
    console.error(e)
    notify(t('review.export.failed'), { tone: 'error' })
  } finally {
    zipBusy.value = false
  }
}

async function shareZip() {
  if (!zip.value) return
  await deliver([{ blob: zip.value, name: `${baseName.value}-budbuddy.zip` }])
}

const delivering = ref(false)
async function deliver(files: { blob: Blob, name: string }[]) {
  delivering.value = true
  try {
    const res = await shareFiles(files, plant.value?.name ?? 'BudBuddy')
    if (res === 'downloaded') notify(t('review.common.downloaded'))
  } catch (e) {
    console.error(e)
    notify(t('review.common.shareFailed'), { tone: 'error' })
  } finally {
    delivering.value = false
  }
}

const sizeLabel = (b: Blob) => (b.size >= 1e6 ? `${formatNumber(b.size / 1e6, 1)} MB` : `${Math.max(1, Math.round(b.size / 1e3))} kB`)
</script>

<template>
  <div>
    <AppHeader
      :title="t('review.export.title')"
      :subtitle="plant?.name"
      back
    />

    <div
      v-if="!plant || !summary"
      class="page"
    >
      <EmptyState
        icon="seedling"
        :title="t('review.common.noPlant')"
      />
    </div>

    <div
      v-else
      class="page rise"
    >
      <section
        class="card overview"
        :aria-label="t('review.export.contains')"
      >
        <div class="stat">
          <strong class="num">{{ summary.length + 1 }}</strong>
          <span>{{ t('review.export.days') }}</span>
        </div>
        <div class="stat">
          <strong class="num">{{ entries.length }}</strong>
          <span>{{ t('review.export.entries') }}</span>
        </div>
        <div class="stat">
          <strong class="num">{{ photoTotal }}</strong>
          <span>{{ t('review.export.photos') }}</span>
        </div>
        <div class="stat">
          <strong
            class="num"
            :class="{ warm: plant.harvest?.dryWeight != null }"
          >{{ plant.harvest?.dryWeight != null ? `${formatNumber(plant.harvest.dryWeight, 1)} g` : '–' }}</strong>
          <span>{{ t('review.export.dry') }}</span>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            <UIcon
              name="i-tabler-file-type-pdf"
              class="size-5"
            /> {{ t('review.export.pdfTitle') }}
          </h2>
          <span
            v-if="pdf"
            class="section-meta num"
          >{{ t('review.export.pages', { n: previews.length }) }} · {{ sizeLabel(pdf) }}</span>
        </div>
        <div class="card block">
          <p class="muted desc">
            {{ t('review.export.pdfText') }}
          </p>
          <button
            v-if="photoTotal"
            type="button"
            class="rv-switch flush"
            role="switch"
            :aria-checked="includePhotos"
            @click="includePhotos = !includePhotos"
          >
            <span class="rv-switch-text">
              {{ t('review.export.withPhotos') }}
              <small>{{ t('review.export.withPhotosHint', { n: frames.length }) }}</small>
            </span>
            <span class="rv-switch-track" />
          </button>
          <div
            v-if="previews.length"
            class="pages"
            role="list"
            :aria-label="t('review.export.previewAria')"
          >
            <img
              v-for="(src, i) in previews"
              :key="src"
              :src="src"
              role="listitem"
              :alt="t('review.export.pageAlt', { n: i + 1 })"
              class="page-thumb"
            >
          </div>
          <div
            v-if="pdfBusy"
            aria-live="polite"
          >
            <div class="rv-progress-label">
              <span>{{ t('review.export.drawing') }}</span>
              <span class="num">{{ Math.round(pdfProgress * 100) }} %</span>
            </div>
            <div class="progress">
              <div :style="{ width: `${Math.max(2, pdfProgress * 100)}%` }" />
            </div>
          </div>
          <div class="rv-actions">
            <button
              type="button"
              class="btn"
              :class="{ 'btn-primary': !pdf }"
              :disabled="pdfBusy"
              @click="makePdf"
            >
              <UIcon
                :name="pdfBusy ? 'i-tabler-loader-2' : pdf ? 'i-tabler-refresh' : 'i-tabler-file-plus'"
                class="size-5"
                :class="{ 'animate-spin': pdfBusy }"
              /> {{ pdf ? t('review.export.redo') : t('review.export.makePdf') }}
            </button>
            <button
              v-if="pdf"
              type="button"
              class="btn btn-primary"
              :disabled="delivering"
              @click="sharePdf"
            >
              <UIcon
                :name="isNative ? 'i-tabler-share-2' : 'i-tabler-download'"
                class="size-5"
              /> {{ isNative ? t('review.common.share') : t('review.common.saveFile') }}
            </button>
          </div>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">
            <UIcon
              name="i-tabler-file-zip"
              class="size-5"
            /> {{ t('review.export.zipTitle') }}
          </h2>
          <span
            v-if="zip"
            class="section-meta num"
          >{{ sizeLabel(zip) }}</span>
        </div>
        <div class="card block">
          <p class="muted desc">
            {{ t('review.export.zipText') }}
          </p>
          <ul class="contents">
            <li>
              <UIcon
                name="i-tabler-photo"
                class="size-4"
              /> {{ t('review.export.zipPhotos', { n: photoTotal }) }}
            </li>
            <li>
              <UIcon
                name="i-tabler-braces"
                class="size-4"
              /> {{ t('review.export.zipJson') }}
            </li>
            <li>
              <UIcon
                name="i-tabler-table"
                class="size-4"
              /> {{ t('review.export.zipCsv') }}
            </li>
            <li v-if="pdf">
              <UIcon
                name="i-tabler-file-type-pdf"
                class="size-4"
              /> {{ t('review.export.zipPdf') }}
            </li>
          </ul>
          <div
            v-if="zipBusy"
            aria-live="polite"
          >
            <div class="rv-progress-label">
              <span>{{ t('review.export.packing') }}</span>
              <span class="num">{{ Math.round(zipProgress * 100) }} %</span>
            </div>
            <div class="progress">
              <div :style="{ width: `${Math.max(2, zipProgress * 100)}%` }" />
            </div>
          </div>
          <p
            v-if="zip && zipSkipped"
            class="field-error"
          >
            {{ t('review.export.skipped', { n: zipSkipped }) }}
          </p>
          <div class="rv-actions">
            <button
              type="button"
              class="btn"
              :class="{ 'btn-primary': !zip }"
              :disabled="zipBusy"
              @click="makeZip"
            >
              <UIcon
                :name="zipBusy ? 'i-tabler-loader-2' : zip ? 'i-tabler-refresh' : 'i-tabler-file-zip'"
                class="size-5"
                :class="{ 'animate-spin': zipBusy }"
              /> {{ zip ? t('review.export.redo') : t('review.export.makeZip') }}
            </button>
            <button
              v-if="zip"
              type="button"
              class="btn btn-primary"
              :disabled="delivering"
              @click="shareZip"
            >
              <UIcon
                :name="isNative ? 'i-tabler-share-2' : 'i-tabler-download'"
                class="size-5"
              /> {{ isNative ? t('review.common.share') : t('review.common.saveFile') }}
            </button>
          </div>
        </div>
      </section>

      <p class="rv-note">
        <UIcon
          name="i-tabler-lock"
          class="size-4"
        />
        <span>{{ t('review.export.private') }}
          <NuxtLink
            to="/settings"
            class="inline-link"
          >{{ t('review.export.backupLink') }}</NuxtLink></span>
      </p>
    </div>
  </div>
</template>

<style src="~/components/review/review.css"></style>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 10px;
  min-width: 0;
}

.stat + .stat {
  border-left: 1px solid var(--line);
}

.stat strong {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.stat strong.warm {
  color: var(--amber);
}

.stat span {
  font-size: 12px;
  color: var(--text-3);
}

.block {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.desc {
  margin: 0;
  font-size: 14px;
}

.rv-switch.flush {
  margin: -6px -14px;
  width: calc(100% + 28px);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.pages {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -14px;
  padding: 0 14px;
}

.pages::-webkit-scrollbar {
  display: none;
}

.page-thumb {
  flex-shrink: 0;
  width: 124px;
  aspect-ratio: 1240 / 1754;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: #fff;
}

.contents {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: var(--text-2);
}

.contents li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inline-link {
  color: var(--green);
  font-weight: 600;
  text-decoration: none;
}
</style>
