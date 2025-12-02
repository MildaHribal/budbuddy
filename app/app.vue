<script setup>
import { IonApp, IonContent, IonPage } from '@ionic/vue'
</script>

<template>
  <UApp>
    <IonApp class="min-h-screen">
      <ion-page>
        <NuxtLayout>
              <UMain>
                <NuxtPage />
              </UMain>
        </NuxtLayout>
    </ion-page>
    </IonApp>
  </UApp>
</template>

<style>
ion-content {
  --background: #121212;
}


ion-action-sheet.sheet {
  --background: #0b0f13;
  --backdrop-opacity: 0.55;
}

ion-action-sheet.android-sheet {
  --color: #ffffff;
}
</style>
