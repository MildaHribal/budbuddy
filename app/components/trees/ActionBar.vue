<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import {
  playOutline,
  listOutline,
  cameraOutline,
  ellipsisHorizontalOutline,
  waterOutline,
  flaskOutline,
  bugOutline,
  cutOutline,
} from 'ionicons/icons'
import { useDayActions } from '../../composables/useDayActions'
import { computed, ref, watch, type Ref } from 'vue'

const props = defineProps<{ date?: string | Ref<string> }>()
const dateStr = computed(() => {
  if (!props.date) return new Date().toISOString().slice(0,10)
  return typeof props.date === 'string' ? props.date : props.date.value
})

const store = ref<any>(useDayActions(dateStr.value))
watch(dateStr, (d) => {
  store.value = useDayActions(d)
})

const emit = defineEmits<{
  (e: 'action', key: string): void
}>()

const actionLabels: Record<string, string> = {
  action: 'General action',
  'tree-log': 'Open tree log',
  photo: 'Take photo',
  more: 'More...',
  water: 'Water plants',
  nutrients: 'Add nutrients',
  repellent: 'Apply repellent',
  trim: 'Trim branches',
}

const actionableKeys = new Set(['water', 'nutrients', 'repellent', 'trim'])

function onClick(key: string) {
  emit('action', key)
  if (!actionableKeys.has(key)) return
  const label = actionLabels[key] ?? 'Action'
  console.log('[ActionBar] add', dateStr.value, key, label)
  store.value.add(label).catch((err: unknown) => {
    console.error('Failed to add action', err)
  })
}
</script>

<template>
  <div class="action-bar">
    <div class="action-box action-box-top">
      <div class="row">
        <button type="button" class="action-btn" @click="onClick('action')">
          <IonIcon :icon="playOutline" class="icon" />
          <span class="label">Action</span>
        </button>

        <button type="button" class="action-btn" @click="onClick('tree-log')">
          <IonIcon :icon="listOutline" class="icon" />
          <span class="label">Tree log</span>
        </button>

        <button type="button" class="action-btn" @click="onClick('photo')">
          <IonIcon :icon="cameraOutline" class="icon" />
          <span class="label">Photo</span>
        </button>

        <button type="button" class="action-btn" @click="onClick('more')">
          <IonIcon :icon="ellipsisHorizontalOutline" class="icon" />
          <span class="label">More</span>
        </button>
      </div>
    </div>


    <div class="action-box action-box-bottom">
      <div>
        <label class="text-white text-sm">Instant actions</label>
      </div>

      <div class="row">
        <button type="button" class="action-btn" @click="onClick('water')">
          <IonIcon :icon="waterOutline" class="icon" />
          <span class="label">Water</span>
        </button>

        <button type="button" class="action-btn" @click="onClick('nutrients')">
          <IonIcon :icon="flaskOutline" class="icon" />
          <span class="label">Nutrients</span>
        </button>

        <button type="button" class="action-btn" @click="onClick('repellent')">
          <IonIcon :icon="bugOutline" class="icon" />
          <span class="label">Repellent</span>
        </button>

        <button type="button" class="action-btn" @click="onClick('trim')">
          <IonIcon :icon="cutOutline" class="icon" />
          <span class="label">Trim</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-bar {
  margin: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-box {
  padding: 5px 12px;
  border-radius: 14px;
  background: #2b3036;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.action-btn {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #e5e7eb;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease, color 0.15s ease;
}

.action-btn:active {
  transform: scale(0.97);
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.04);
}

.icon {
  font-size: 20px;
  color: #38bdf8;
}

.label {
  font-size: 11px;
  text-transform: none;
}

@media (min-width: 480px) {
  .action-bar {
    margin-inline: 24px;
  }
}
</style>
