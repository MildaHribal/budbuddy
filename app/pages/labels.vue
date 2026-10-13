<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { Plant } from '~/types/grow'
import { blobToDataUrl } from '~/utils/image'
import { buildLabelPdf, cellSize, qrSvg, type LabelItem } from '~/utils/labelSheet'
import { LABEL_LAYOUTS, paginateLabels, type LabelLayout } from '~/utils/qr'

definePageMeta({ hideNav: true })
const { t } = useI18n()
useHead({ title: () => t('labels.title') })

const route = useRoute()
const grow = useGrow()
const { notify } = useNotify()
const { getSpace } = useSpaces()
const isNative = Capacitor.isNativePlatform()

const candidates = computed(() => grow.state.plants.filter(p => !p.archived))

function initialPick(): string[] {
  const ids = typeof route.query.ids === 'string' ? route.query.ids.split(',').filter(Boolean) : []
  if (ids.length) return ids.filter(id => grow.getPlant(id))
  const space = typeof route.query.space === 'string' ? route.query.space : null
  if (space) return plantsInSpace(grow.state.plants, space).map(p => p.id)
  return candidates.value.map(p => p.id)
}
const picked = ref<string[]>(initialPick())

const layoutId = useLocalStorage<LabelLayout['id']>('budbuddy:label-layout', 'small')
const layout = computed(() => LABEL_LAYOUTS.find(l => l.id === layoutId.value) ?? LABEL_LAYOUTS[0]!)
const perPage = computed(() => layout.value.cols * layout.value.rows)

const show = useLocalStorage('budbuddy:label-fields', { strain: true, start: true, space: true })

function item(p: Plant): LabelItem {
  const meta = [
    show.value.start ? t('labels.started', { date: formatDate(p.startDate) }) : '',
    show.value.space ? getSpace(p.spaceId)?.name ?? '' : ''
  ].filter(Boolean).join(' · ')
  return { id: p.id, name: p.name, sub: show.value.strain ? p.strain : '', meta }
}

// labels keep the plant list order
const items = computed(() => candidates.value.filter(p => picked.value.includes(p.id)).map(item))
const pages = computed(() => paginateLabels(items.value, perPage.value).length)

// preview of the first sheet
const svgs = ref<Record<string, string>>({})
watch(items, async (list) => {
  for (const it of list.slice(0, perPage.value)) {
    if (!svgs.value[it.id]) svgs.value = { ...svgs.value, [it.id]: await qrSvg(it.id) }
  }
}, { immediate: true })
const preview = computed(() => items.value.slice(0, perPage.value))
const cell = computed(() => cellSize(layout.value))

const busy = ref(false)
async function exportPdf() {
  if (!items.value.length || busy.value) return
  busy.value = true
  const filename = `budbuddy-labels-${todayISO()}.pdf`
  try {
    const pdf = await buildLabelPdf(items.value, layout.value)
    if (isNative) {
      const data = (await blobToDataUrl(pdf)).split(',')[1] ?? ''
      const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache })
      try {
        await Share.share({ title: t('labels.shareTitle'), files: [uri] })
      } catch (e) {
        if (!/cancel/i.test(String(e))) throw e
      }
    } else {
      const url = URL.createObjectURL(pdf)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      notify(t('labels.downloaded'))
    }
  } catch (e) {
    console.error(e)
    notify(t('labels.failed'), { tone: 'error' })
  } finally {
    busy.value = false
  }
}

const scanOpen = ref(false)
</script>

<template>
  <div class="labels-page">
    <AppHeader
      :title="t('labels.title')"
      :subtitle="items.length ? t('labels.subtitle', { n: items.length, pages }) : undefined"
      back
    >
      <template #actions>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('organize.scan.open')"
          @click="scanOpen = true"
        >
          <UIcon
            name="i-tabler-scan"
            class="size-5"
          />
        </button>
      </template>
    </AppHeader>

    <div class="page">
      <EmptyState
        v-if="!candidates.length"
        icon="seedling"
        :title="t('labels.emptyTitle')"
        :text="t('labels.emptyText')"
      />

      <template v-else>
        <section
          class="paper-wrap"
          :aria-label="t('labels.preview')"
        >
          <div
            v-if="preview.length"
            class="paper"
            :style="{ '--cols': layout.cols, '--ratio': `${cell.w} / ${cell.h}` }"
          >
            <div
              v-for="it in preview"
              :key="it.id"
              class="label"
            >
              <!-- eslint-disable vue/no-v-html -- SVG generated locally by qrcode -->
              <span
                class="label-qr"
                aria-hidden="true"
                v-html="svgs[it.id] ?? ''"
              />
              <!-- eslint-enable vue/no-v-html -->
              <span class="label-text">
                <strong>{{ it.name }}</strong>
                <span v-if="it.sub">{{ it.sub }}</span>
                <small v-if="it.meta">{{ it.meta }}</small>
              </span>
            </div>
          </div>
          <p
            v-else
            class="paper-empty muted"
          >
            {{ t('labels.nonePicked') }}
          </p>
          <p
            v-if="pages > 1"
            class="field-hint more-pages"
          >
            {{ t('labels.morePages', { n: pages - 1 }) }}
          </p>
        </section>

        <section class="form-stack">
          <div class="field">
            <span class="field-label">{{ t('labels.size') }}</span>
            <div
              class="segmented"
              role="group"
              :aria-label="t('labels.size')"
            >
              <button
                v-for="l in LABEL_LAYOUTS"
                :key="l.id"
                type="button"
                :aria-pressed="layoutId === l.id"
                @click="layoutId = l.id"
              >
                {{ t(`labels.layouts.${l.id}`, { n: l.cols * l.rows }) }}
              </button>
            </div>
          </div>
          <div class="field">
            <span class="field-label">{{ t('labels.fields') }}</span>
            <div class="chips wrap">
              <button
                v-for="f in (['strain', 'start', 'space'] as const)"
                :key="f"
                type="button"
                class="chip"
                :aria-pressed="show[f]"
                @click="show = { ...show, [f]: !show[f] }"
              >
                {{ t(`labels.field.${f}`) }}
              </button>
            </div>
          </div>
          <SpacesPlantPicker
            v-model="picked"
            :plants="candidates"
            :label="t('labels.plants', { n: picked.length })"
          />
        </section>

        <p class="about muted">
          <UIcon
            name="i-tabler-info-circle"
            class="size-4"
          />
          <span>{{ t('labels.about') }}</span>
        </p>
      </template>
    </div>

    <div
      v-if="candidates.length"
      class="export-bar"
    >
      <button
        type="button"
        class="btn btn-primary btn-block"
        :disabled="!items.length || busy"
        @click="exportPdf"
      >
        <UIcon
          :name="busy ? 'i-tabler-loader-2' : isNative ? 'i-tabler-share-2' : 'i-tabler-file-type-pdf'"
          class="size-5"
          :class="{ 'animate-spin': busy }"
        />
        {{ busy ? t('labels.building') : isNative ? t('labels.share') : t('labels.download') }}
      </button>
    </div>

    <ScanSheet v-model:open="scanOpen" />
  </div>
</template>

<style scoped>
.paper-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.paper {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: 4px;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: #fff;
  color: #000;
}

.label {
  aspect-ratio: var(--ratio);
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 4px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
}

.label-qr {
  height: 100%;
  aspect-ratio: 1;
  flex-shrink: 0;
  max-width: 48%;
}

.label-qr :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.label-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.label-text strong,
.label-text span,
.label-text small {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-text strong {
  font-size: 9px;
  font-weight: 600;
}

.label-text span {
  font-size: 7px;
  color: #333;
}

.label-text small {
  font-size: 6px;
  color: #666;
}

.paper-empty {
  margin: 0;
  padding: 24px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius);
  text-align: center;
  font-size: 14px;
}

.more-pages {
  text-align: center;
}

.about {
  display: flex;
  gap: 8px;
  margin: 0;
  font-size: 13px;
}

.about .iconify {
  flex-shrink: 0;
  margin-top: 2px;
}

.labels-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.export-bar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  margin-top: auto;
  padding: 12px 16px calc(12px + var(--safe-bottom));
  border-top: 1px solid var(--line);
  background: var(--bg);
}
</style>
