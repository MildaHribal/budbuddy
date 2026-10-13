<script setup lang="ts">
// Puts one or more plants into a grow space (or takes them out).
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ plantIds: string[] }>()
const emit = defineEmits<{ moved: [spaceId: string | null] }>()

const { t } = useI18n()
const grow = useGrow()
const { notify } = useNotify()
const { spaces, setPlantSpace } = useSpaces()

const choice = ref<string | null>(null)
const creating = ref(false)

watch(open, (v) => {
  if (!v) return
  const current = new Set(props.plantIds.map(id => grow.getPlant(id)?.spaceId ?? null))
  choice.value = current.size === 1 ? [...current][0]! : null
}, { immediate: true })

function apply(spaceId: string | null) {
  setPlantSpace(props.plantIds, spaceId)
  const name = spaceId ? spaces.value.find(s => s.id === spaceId)?.name ?? '' : ''
  notify(spaceId ? t('organize.move.moved', { n: props.plantIds.length, name }) : t('organize.move.removed', { n: props.plantIds.length }))
  emit('moved', spaceId)
  open.value = false
}

function onCreated(id: string) {
  apply(id)
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="plantIds.length > 1 ? t('organize.move.titleMany', { n: plantIds.length }) : t('organize.move.title')"
    icon="i-tabler-tent"
  >
    <div
      class="options"
      role="radiogroup"
      :aria-label="t('organize.move.title')"
    >
      <button
        v-for="s in spaces"
        :key="s.id"
        type="button"
        role="radio"
        class="option"
        :aria-checked="choice === s.id"
        @click="choice = s.id"
      >
        <UIcon
          name="i-tabler-tent"
          class="size-5 option-icon"
        />
        <span class="option-text">
          <strong>{{ s.name }}</strong>
          <span>{{ spaceSubline(s) }}</span>
        </span>
        <UIcon
          v-if="choice === s.id"
          name="i-tabler-circle-check-filled"
          class="size-5 option-check"
        />
      </button>
      <button
        type="button"
        role="radio"
        class="option"
        :aria-checked="choice === null"
        @click="choice = null"
      >
        <UIcon
          name="i-tabler-circle-dashed"
          class="size-5 option-icon"
        />
        <span class="option-text">
          <strong>{{ t('organize.move.none') }}</strong>
        </span>
        <UIcon
          v-if="choice === null"
          name="i-tabler-circle-check-filled"
          class="size-5 option-check"
        />
      </button>
    </div>
    <button
      type="button"
      class="btn btn-soft btn-block new"
      @click="open = false; creating = true"
    >
      <UIcon
        name="i-tabler-plus"
        class="size-5"
      /> {{ t('organize.move.new') }}
    </button>
    <template #footer>
      <button
        type="button"
        class="btn"
        @click="open = false"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        @click="apply(choice)"
      >
        {{ t('organize.move.apply') }}
      </button>
    </template>
  </BottomSheet>
  <SpacesSpaceSheet
    v-model:open="creating"
    @saved="onCreated"
  />
</template>

<style scoped>
.options {
  display: flex;
  flex-direction: column;
}

.option {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  padding: 8px 4px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  text-align: left;
}

.option-icon {
  flex-shrink: 0;
  color: var(--text-2);
}

.option[aria-checked="true"] .option-icon,
.option-check {
  color: var(--green);
}

.option-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-text strong {
  font-weight: 600;
}

.option-text span {
  font-size: 13px;
  color: var(--text-3);
}

.new {
  margin-top: 16px;
}
</style>
