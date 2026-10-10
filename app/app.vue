<script setup lang="ts">
const { ready, loadError } = useGrow()

useHead({
  titleTemplate: chunk => (chunk ? `${chunk} · BudBuddy` : 'BudBuddy – grow journal'),
  htmlAttrs: { lang: 'en' },
  meta: [
    { name: 'description', content: 'BudBuddy is an offline grow journal: track plants, watering, feeding, training, photos and harvests, with VPD, DLI and nutrient calculators.' },
    { name: 'theme-color', content: '#0a0a0a' },
    { property: 'og:title', content: 'BudBuddy – grow journal' },
    { property: 'og:description', content: 'Track every plant from seed to jar.' },
    { property: 'og:type', content: 'website' }
  ],
  link: [{ rel: 'icon', type: 'image/webp', href: '/icon.webp' }]
})
</script>

<template>
  <div class="device-stage">
    <div class="device">
      <div id="overlays" />
      <Transition name="splash">
        <div
          v-if="!ready"
          class="splash"
          role="status"
          aria-label="Loading"
        >
          <img
            src="/icon.webp"
            alt=""
            width="88"
            height="88"
          >
          <span>BudBuddy</span>
        </div>
      </Transition>
      <div
        v-if="loadError"
        class="load-error"
        role="alert"
      >
        <strong>Your data could not be loaded.</strong>
        Nothing was changed or overwritten – please restart the app. ({{ loadError }})
      </div>
      <NuxtLayout v-if="ready">
        <NuxtPage />
      </NuxtLayout>
      <AppToaster />
      <ConfirmDialog />
    </div>
  </div>
</template>

<style>
.device-stage {
  height: 100%;
}

.device {
  position: relative;
  height: 100%;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  /* makes position:fixed descendants relative to the device frame */
  transform: translateZ(0);
}

#overlays {
  position: absolute;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}

#overlays > * {
  pointer-events: auto;
}

.splash {
  position: absolute;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: radial-gradient(circle at 50% 40%, #12210e 0%, var(--bg) 70%);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.load-error {
  padding: calc(10px + var(--safe-top)) 16px 10px;
  background: var(--danger-soft);
  border-bottom: 1px solid rgba(240, 82, 82, 0.4);
  color: #ffb4b4;
  font-size: 13px;
  line-height: 1.4;
}

.splash img {
  border-radius: 24px;
}

.splash-leave-active {
  transition: opacity 0.3s ease;
}

.splash-leave-to {
  opacity: 0;
}

/* On desktop the app is shown inside a phone frame (used for the portfolio embed). */
@media (pointer: fine) and (min-width: 640px) and (min-height: 640px) {
  .device-stage {
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #0d2614 0%, var(--bg) 70%);
  }

  .device {
    width: 390px;
    height: min(844px, calc(100vh - 40px));
    border-radius: 48px;
    border: 10px solid #1b1d1b;
    box-shadow:
      0 0 0 2px #2c2f2c,
      0 30px 60px -15px rgba(0, 0, 0, 0.8),
      0 0 40px rgba(123, 199, 77, 0.08);
    --safe-top: 18px;
    --safe-bottom: 10px;
  }
}
</style>
