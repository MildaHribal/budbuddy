<script setup lang="ts">
import { IonFab, IonFabButton, IonIcon, IonContent, IonPage, IonList, IonItem, IonLabel, IonAvatar, modalController } from '@ionic/vue';
import { add } from 'ionicons/icons';
import AddTreeModal from '../components/trees/journal/AddTreeModal.vue';
import { onMounted } from 'vue';
import { usePlants } from '../../composables/usePlants';

const { plants, loadPlantsFromStorage } = usePlants();

onMounted(() => {
  loadPlantsFromStorage();
});

const openModal = async () => {
  const modal = await modalController.create({ component: AddTreeModal });
  await modal.present();
  await modal.onWillDismiss();
};
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>My Trees</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="plants.length === 0" class="text-muted">No plants yet. Click + to add one.</div>

      <ion-list>
        <ion-item v-for="(p, i) in plants" :key="p.id || i" button>
          <ion-avatar slot="start" v-if="p.photoPreview">
            <img :src="p.photoPreview" alt="photo" />
          </ion-avatar>
          <ion-avatar slot="start" v-else>
            <div class="w-8 h-8 bg-white/10 rounded-full" />
          </ion-avatar>

          <ion-label>
            <h3 class="ion-text-wrap">{{ p.name || '—' }}</h3>
            <p class="ion-text-wrap text-sm text-gray-300">{{ p.strain || '—' }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-fab @click="openModal" style="position: fixed; right: 16px; bottom: calc(var(--ion-safe-area-bottom, env(safe-area-inset-bottom)) + 72px); z-index: 60;">
        <ion-fab-button>
          <ion-icon :icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-fab-button {
  --background: #7bc74d;
  --background-activated: #8fe658;
  --background-hover: #a3e681;
  --color: black;
}

/* Ensure plant name is white (override Ionic or theme styles) */
ion-item ion-label h3 {
  color: #ffffff !important;
}
</style>
