<script setup>
import { IonApp, IonContent, IonPage } from '@ionic/vue'
</script>

<template>
  <UApp>
    <ion-page>
      <ion-content>
        <NuxtLayout>
          <IonApp class="min-h-screen">
            <IonContent>
              <UMain>
                <NuxtPage />
              </UMain>
            </IonContent>
          </IonApp>
        </NuxtLayout>
      </ion-content>
    </ion-page>

  </UApp>
</template>
