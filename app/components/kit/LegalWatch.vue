<script setup lang="ts">
// Home: shown when the household is over a limit, or its stored harvest nears the limit.
const { t } = useI18n()
const { status } = useLegal()
const show = computed(() => !!status.value && (status.value.level === 'over' || status.value.gramLevel === 'near'))
const over = computed(() => status.value?.level === 'over')
</script>

<template>
  <NuxtLink
    v-if="show && status"
    to="/legal"
    class="card legal-watch"
    :class="{ over }"
  >
    <UIcon
      :name="over ? 'i-tabler-alert-triangle' : 'i-tabler-info-circle'"
      class="size-6 icon"
    />
    <span class="text">
      <strong>{{ over ? t('kit.legal.overTitle') : t('kit.legal.nearGramsTitle') }}</strong>
      <span class="num">
        {{ t('kit.legal.summary', { plants: status.plants, plantLimit: status.plantLimit, grams: status.grams, gramLimit: status.gramLimit }) }}
      </span>
      <span class="faint">{{ t('kit.legal.short') }}</span>
    </span>
    <UIcon
      name="i-tabler-chevron-right"
      class="size-5 go"
    />
  </NuxtLink>
</template>

<style scoped>
.legal-watch {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
  color: inherit;
  text-decoration: none;
  --tone: var(--amber);
}

.legal-watch.over {
  --tone: var(--red);
}

.icon {
  flex-shrink: 0;
  color: var(--tone);
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: var(--text-2);
}

.text strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--tone);
}

.faint {
  font-size: 12px;
  color: var(--text-3);
}

.go {
  flex-shrink: 0;
  color: var(--text-3);
}
</style>
