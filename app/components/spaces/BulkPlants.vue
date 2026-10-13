<script setup lang="ts">
// Plant toggles at the top of a bulk entry sheet.
const picked = defineModel<string[]>({ required: true })
const props = defineProps<{
  plantIds: string[]
  error?: string
}>()

const { t } = useI18n()
const grow = useGrow()
const plants = computed(() => props.plantIds.map(id => grow.getPlant(id)).filter(p => !!p))
const all = computed(() => picked.value.length === plants.value.length)

function toggle(id: string) {
  picked.value = picked.value.includes(id) ? picked.value.filter(x => x !== id) : [...picked.value, id]
}
function toggleAll() {
  picked.value = all.value ? [] : plants.value.map(p => p.id)
}
</script>

<template>
  <div class="field">
    <div class="bulk-head">
      <span class="field-label">{{ t('organize.bulk.for', { n: picked.length, total: plants.length }) }}</span>
      <button
        type="button"
        class="link"
        @click="toggleAll"
      >
        {{ all ? t('organize.bulk.none') : t('organize.bulk.all') }}
      </button>
    </div>
    <div
      class="bulk-chips"
      role="group"
      :aria-label="t('organize.bulk.plants')"
    >
      <button
        v-for="p in plants"
        :key="p.id"
        type="button"
        class="chip"
        :aria-pressed="picked.includes(p.id)"
        @click="toggle(p.id)"
      >
        <UIcon
          :name="picked.includes(p.id) ? 'i-tabler-check' : 'i-tabler-plus'"
          class="size-4"
        />
        {{ p.name }}
      </button>
    </div>
    <span class="field-hint">{{ t('organize.bulk.hint') }}</span>
    <span
      v-if="error"
      class="field-error"
    >{{ error }}</span>
  </div>
</template>

<style scoped>
.bulk-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.bulk-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bulk-chips .chip {
  min-height: 40px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
