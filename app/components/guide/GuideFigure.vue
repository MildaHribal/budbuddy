<script setup lang="ts">
import type { L10n } from '~/guide'
import { asyncRegistry, componentKey } from '~/guide/resolve'

const props = defineProps<{ illustration?: string, photo?: string, caption: L10n, credit?: string }>()
const { tr } = useGuide()
const { t } = useI18n()

const illustrations = asyncRegistry(import.meta.glob('./illustrations/*.vue'))
const photos = import.meta.glob<string>('~/assets/guide/*.{jpg,jpeg,webp,png}', { eager: true, query: '?url', import: 'default' })
const credits = import.meta.glob<unknown>('~/assets/guide/credits.json', { eager: true, import: 'default' })

const comp = computed(() => (props.illustration ? illustrations.get(componentKey(props.illustration)) : undefined))
const photoUrl = computed(() => {
  if (!props.photo) return undefined
  const hit = Object.entries(photos).find(([path]) => path.split('/').pop() === props.photo)
  return hit?.[1]
})

function creditFromJson(file: string): string | undefined {
  const data = Object.values(credits)[0] as Record<string, unknown> | unknown[] | undefined
  if (!data) return undefined
  const entry = Array.isArray(data)
    ? data.find(d => (d as Record<string, unknown>)?.file === file)
    : data[file]
  if (typeof entry === 'string') return entry
  if (entry && typeof entry === 'object') {
    const e = entry as Record<string, unknown>
    return [e.author, e.license].filter(v => typeof v === 'string' && v).join(', ') || undefined
  }
  return undefined
}

const creditLine = computed(() => props.credit || (props.photo ? creditFromJson(props.photo) : undefined))
</script>

<template>
  <figure class="figure">
    <div
      class="frame"
      :class="{ photo: !!photoUrl }"
    >
      <component
        :is="comp"
        v-if="comp"
      />
      <img
        v-else-if="photoUrl"
        :src="photoUrl"
        :alt="tr(caption)"
        loading="lazy"
        decoding="async"
      >
      <div
        v-else
        class="placeholder"
      >
        <GrowIcon
          name="photo"
          class="ph-glyph"
        />
        <span>{{ t('guide.widget.missingFigure') }}</span>
      </div>
    </div>
    <figcaption>
      {{ tr(caption) }}
      <span
        v-if="creditLine"
        class="credit"
      >{{ t('guide.photoCredit', { credit: creditLine }) }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.figure {
  margin: 0;
}

.frame {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background:
    radial-gradient(120% 70% at 50% 0%, rgba(255, 210, 138, 0.07), transparent 60%),
    linear-gradient(180deg, #111418, #0b0d10);
  border: 1px solid var(--line);
  box-shadow: inset 0 1px 0 var(--highlight);
}

.frame :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.frame.photo img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 420px;
  object-fit: cover;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 160px;
  padding: 20px;
  font-size: 13px;
  color: var(--text-3);
  text-align: center;
}

.ph-glyph {
  font-size: 32px;
  color: var(--dark-arc);
}

figcaption {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

.credit {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-3);
}
</style>
