<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed, ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, onIonViewWillEnter } from '@ionic/vue';
import { usePlants } from '~/composables/usePlants';
import DayPicker from '~/components/trees/DayPicker.vue';
import Actions from '~/components/trees/journal/Actions.vue';
import ActionBar from "~/components/trees/ActionBar.vue";

const route = useRoute();
const { plants, loadPlantsFromStorage } = usePlants();

const selectedDate = ref(new Date().toISOString().slice(0,10));

onIonViewWillEnter(() => {
  loadPlantsFromStorage();
});

const plantId = route.params.id;

const plant = computed(() => {
  if (!plantId) return null;
  return plants.value.find(p => String(p.id) === String(plantId)) || null;
});

function handleDateUpdate(newDate: string) {
  selectedDate.value = newDate;
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/my-trees" text="Back"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ plant?.name || 'Loading...' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="!plant && plants.length === 0" class="text-center mt-10">
        Loading plant data...
      </div>

      <div v-else-if="!plant" class="text-center mt-10 text-red-400">
        Plant not found (ID: {{ plantId }})
      </div>

      <div v-else>
        <div class="mb-4">
          <div class="relative w-full h-48 rounded overflow-hidden bg-gray-800">
            <img v-if="plant.photoPreview" :src="plant.photoPreview" class="w-full h-full object-cover" alt="plant" />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-500">No image</div>
          </div>

          <h2 class="text-2xl font-semibold text-white mt-3">{{ plant.name }}</h2>
          <div class="text-sm text-gray-300">{{ plant.strain }}</div>
        </div>

        <div>
          <DayPicker @update:date="handleDateUpdate" />

          <ActionBar :date="selectedDate" />

          <Actions :date="selectedDate" />
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>
