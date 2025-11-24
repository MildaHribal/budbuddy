<script setup lang="ts">
import {
  IonButtons,
  modalController,
} from '@ionic/vue';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/vue';
import { onMounted, onUnmounted } from 'vue';

import germinationImg from '~/assets/germination.png';
import seedlingImg from '~/assets/seedling.png';
import vegetativeImg from '~/assets/vegetative.png';
import floweringImg from '~/assets/flowering.png';

const cancel = () => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('downbar-hidden');
  }
  return modalController.dismiss(null, 'cancel');
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.add('downbar-hidden');
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('downbar-hidden');
  }
});

</script>

<template>
  <div class="header">
    <div class="header-inner flex items-center justify-start">
      <div class="left">
        <ion-buttons slot="start">
          <button @click="cancel" class="cancel-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="cancel-icon" role="img" aria-hidden="true"><path fill="currentColor" d="M16 22L6 12L16 2l1.775 1.775L9.55 12l8.225 8.225z" /></svg>
          </button>
        </ion-buttons>
      </div>
    </div>
  </div>

  <ion-content>
    <div class="pt-2 content">
      <ion-card color="dark">
        <div class="flex flex-row items-center justify-center">
          <img :src="germinationImg" alt="Germination" class="stage-img" />
        </div>
        <ion-card-header>
          <ion-card-title>GERMINATION</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          Here's a small text description for the card content. Nothing more, nothing less.
        </ion-card-content>
        <div class="flex flex-row items-center justify-end">
          <ion-button shape="round">Add Tree</ion-button>
        </div>
      </ion-card>
    </div>

    <div class="pt-9 content">
      <ion-card color="dark">
        <div class="flex flex-row items-center justify-center">
          <img :src="seedlingImg" alt="Seedling" class="stage-img" />
        </div>
        <ion-card-header>
          <ion-card-title>SEEDLING</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          Here's a small text description for the card content. Nothing more, nothing less.
        </ion-card-content>
        <div class="flex flex-row items-center justify-end">
          <ion-button shape="round">Add Tree</ion-button>
        </div>
      </ion-card>
    </div>

    <div class="pt-9 content">
      <ion-card color="dark">
        <div class="flex flex-row items-center justify-center">
          <img :src="germinationImg" alt="Germination" class="stage-img" />
        </div>
        <ion-card-header>
          <ion-card-title>GERMINATION</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          Here's a small text description for the card content. Nothing more, nothing less.
        </ion-card-content>
        <div class="flex flex-row items-center justify-end">
          <ion-button shape="round">Add Tree</ion-button>
        </div>
      </ion-card>
    </div>

    <div class="pt-9 content">
      <ion-card color="dark">
        <div class="flex flex-row items-center justify-center">
          <img :src="germinationImg" alt="Germination" class="stage-img" />
        </div>
        <ion-card-header>
          <ion-card-title>GERMINATION</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          Here's a small text description for the card content. Nothing more, nothing less.
        </ion-card-content>
        <div class="flex flex-row items-center justify-end">
          <ion-button shape="round">Add Tree</ion-button>
        </div>
      </ion-card>
    </div>

  </ion-content>

</template>

<style scoped>
.header {
  background: #202123;
  color: #ffffff;
  box-shadow: 0 1px 0 rgba(0,0,0,0.06);
}

.header-inner {
  padding: 10px 12px;
  gap: 12px;
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 6px;
  border-radius: 9999px;
  background: transparent;
  border: none;
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.cancel-btn:hover {
  transform: translateY(-2px);
}

.cancel-btn:active {
  transform: translateY(0);
}

.cancel-btn:focus {
  outline: none;
  box-shadow: 0 0 0 6px rgba(255,255,255,0.06);
}

.cancel-icon {
  width: 24px;
  height: 24px;
  display: block;
  color: currentColor;
}

.title-text {
  color: #ffffff;
  font-weight: 600;
}

.stage-img {
  height: 220px;
  display: block;
  border-radius: 8px 8px 0 0;
}

.content {
  color: #ffffff;
}

.content ::v-deep(ion-card-title),
.content ::v-deep(ion-card-subtitle),
.content ::v-deep(ion-card-content) {
  color: #ffffff !important;
  --color: #ffffff;
}

ion-button {
  --background: #7bc74d;
  --background-activated: #8fe658;
  --background-hover: #a3e681;
  --color: black;
}

/* Nastavit padding pro ion-card a jeho části (header/content) */
.content ::v-deep(ion-card) {
  padding: 14px !important; /* celkový padding kolem karty */
  border-radius: 12px; /* jemné zaoblení */
}

.content ::v-deep(ion-card-header),
.content ::v-deep(ion-card-content) {
  /* jemnější vnitřní odsazení pro hlavičku a obsah */
  padding: 8px 0 !important;
}

/* Pokud chceš specifické odsazení uvnitř card contentu */
.content ::v-deep(ion-card-content) {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}
</style>
