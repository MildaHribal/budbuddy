<script setup lang="ts">

import { IonFab, IonFabButton, IonIcon } from '@ionic/vue';
import { add } from 'ionicons/icons';

import {  IonContent, modalController } from '@ionic/vue';
import AddTreeModal from '../components/trees/journal/AddTreeModal.vue';
import { ref } from 'vue';

const message = ref('This modal example uses the modalController to present and dismiss modals.');

const openModal = async () => {
  const modal = await modalController.create({
    component: AddTreeModal,
  });

  modal.present();

  const { data, role } = await modal.onWillDismiss();

  if (role === 'confirm') {
    message.value = `Hello, ${data}!`;
  }
};
</script>

<template>
  <div class="relative">



    <ion-content class="ion-padding">
      <ion-fab @click="openModal" style="position: fixed; right: 16px; bottom: calc(var(--ion-safe-area-bottom, env(safe-area-inset-bottom)) + 72px); z-index: 60;">
        <ion-fab-button>
          <ion-icon :icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>    </ion-content>
  </div>

</template>

<style scoped>
ion-fab-button {
  --background: #7bc74d;
  --background-activated: #8fe658;
  --background-hover: #a3e681;
  --color: black;
}
</style>
