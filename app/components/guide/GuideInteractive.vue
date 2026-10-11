<script setup lang="ts">
import type { L10n } from '~/guide'
import { asyncRegistry, componentKey } from '~/guide/resolve'

const props = defineProps<{ widget: string, props?: Record<string, unknown>, caption?: L10n }>()
const { tr } = useGuide()
const { t } = useI18n()

const widgets = asyncRegistry(import.meta.glob('./widgets/*.vue'))
const comp = computed(() => widgets.get(componentKey(props.widget)))
</script>

<template>
  <figure class="interactive">
    <div class="widget card">
      <component
        :is="comp"
        v-if="comp"
        v-bind="props.props ?? {}"
      />
      <div
        v-else
        class="placeholder"
      >
        <GrowIcon
          name="measure"
          class="ph-glyph"
        />
        <span>{{ t('guide.widget.missing') }}</span>
      </div>
    </div>
    <figcaption v-if="caption">
      {{ tr(caption) }}
    </figcaption>
  </figure>
</template>

<style scoped>
.interactive {
  margin: 0;
}

.widget {
  padding: 16px;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 12px;
  font-size: 13px;
  color: var(--text-3);
  text-align: center;
}

.ph-glyph {
  font-size: 30px;
  color: var(--dark-arc);
}

figcaption {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}
</style>
