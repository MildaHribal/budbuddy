<script setup>
import { useHead } from '#imports'
import { IonApp, IonContent, IonPage } from '@ionic/vue'
import PhoneFrame from '~/components/ui/PhoneFrame.vue'

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} | BudBuddy` : 'BudBuddy - Smart Plant Care & Tracking';
  },
  htmlAttrs: {
    lang: 'en'
  },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no' },
    { name: 'description', content: 'Track, manage, and optimize your plant growth with BudBuddy. Enjoy AI-assisted help, nutrient calculators, and photo journals for your indoor garden.' },
    { property: 'og:title', content: 'BudBuddy - Smart Plant Care' },
    { property: 'og:description', content: 'Your personal assistant for tracking plant growth and maximizing yields.' },
    { property: 'og:type', content: 'website' },
    { name: 'theme-color', content: '#0a0a0a' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/favicon.ico' } // Assuming a favicon exists or will be added
  ]
})
</script>
<template>
  <UApp>
    <PhoneFrame>
      <IonApp class="min-h-screen">
        <ion-page>
          <NuxtLayout>
                <UMain>
                  <NuxtPage />
                </UMain>
          </NuxtLayout>
      </ion-page>
      </IonApp>
    </PhoneFrame>
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
