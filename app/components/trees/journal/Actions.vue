<script setup lang="ts">
import { IonCheckbox, IonIcon } from '@ionic/vue'
import { computed, type Ref } from 'vue'
import { useDayActions } from '../../../composables/useDayActions'
import { trashOutline } from 'ionicons/icons'

const props = defineProps<{ date?: string | Ref<string> }>()

const selectedDate = computed(() => {
  if (!props.date) return new Date().toISOString().slice(0, 10)
  return typeof props.date === 'string' ? props.date : props.date.value
})

// Store pro aktuálně vybraný den – díky `stores` v useDayActions
const store = computed(() => useDayActions(selectedDate.value))

// Pole použitých akcí (rozbalený ref)
const actions = computed(() => store.value.actions.value)

function toggleAction(id: string, value: boolean) {
  store.value.toggle(id, value).catch((err: unknown) => {
    console.error('toggle failed', err)
  })
}

function deleteAction(id: string) {
  store.value.remove(id).catch((err: unknown) => {
    console.error('remove failed', err)
  })
}
</script>

<template>
  <div class="actions-wrapper">
    <h5 class="title">Actions for today</h5>

    <div class="actions-list">
      <div
        v-for="action in actions"
        :key="action.id"
        class="action-row"
      >

        <IonCheckbox
          :checked="action.done"
          class="checkbox"
          @ion-change="toggleAction(action.id, $event.detail.checked)"
        />

        <span
          class="action-label"
          :class="{ 'action-label-done': action.done }"
        >
          {{ action.label }}
        </span>

        <button class="delete-btn ml-auto" @click="deleteAction(action.id)" aria-label="Delete action">
          <IonIcon :icon="trashOutline" />
        </button>
      </div>
    </div>
  </div>
</template>


<style scoped>
.actions-wrapper {
  margin: 16px;
}

.title {
  color: #f9fafb;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 8px;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.12);
}

.checkbox {
  --background: #020617;
  --border-color: #4b5563;
}

.action-label {
  color: #e5e7eb;
  font-size: 13px;
}

.action-label-done {
  text-decoration: line-through;
  color: #9ca3af;
}
</style>
