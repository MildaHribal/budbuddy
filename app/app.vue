<script setup lang="ts">
const { ready, loadError, state } = useGrow()
const { t } = useI18n()

// Lights-on boot: the lamp flickers on, then light falls down the tent.
const lit = ref(false)
onMounted(() => requestAnimationFrame(() => (lit.value = true)))

useHead({
  titleTemplate: chunk => (chunk ? `${chunk} · BudBuddy` : 'BudBuddy – grow journal'),
  meta: [
    { name: 'description', content: 'BudBuddy is an offline grow journal: track plants, watering, feeding, training, photos and harvests, with VPD, DLI and nutrient calculators.' },
    { name: 'theme-color', content: '#07080a' },
    { property: 'og:title', content: 'BudBuddy – grow journal' },
    { property: 'og:description', content: 'Track every plant from seed to jar.' },
    { property: 'og:type', content: 'website' }
  ],
  link: [
    { rel: 'icon', type: 'image/webp', href: '/icon.webp' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
  ]
})
</script>

<template>
  <div class="device-stage">
    <div
      class="device tent"
      :class="{ lit }"
    >
      <div
        class="lamp-bar"
        aria-hidden="true"
      />
      <div
        class="lamp-light"
        aria-hidden="true"
      />
      <OnboardingGuide v-if="ready && !state.settings.onboarded" />
      <div id="overlays" />
      <Transition name="splash">
        <div
          v-if="!ready"
          class="splash"
          role="status"
          :aria-label="t('common.loading')"
        >
          <img
            src="/icon.webp"
            alt=""
            width="104"
            height="104"
            class="splash-logo"
          >
          <span>BudBuddy</span>
        </div>
      </Transition>
      <div
        v-if="loadError"
        class="load-error"
        role="alert"
      >
        <strong>{{ t('common.loadError') }}</strong>
        {{ t('common.loadErrorHint') }} ({{ loadError }})
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
  isolation: isolate;
  /* makes position:fixed descendants relative to the device frame */
  transform: translateZ(0);
}

.lamp-bar {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 60;
  width: 150px;
  height: 3px;
  margin-left: -75px;
  border-radius: 0 0 8px 8px;
  background: var(--lamp);
  box-shadow: var(--glow-lamp);
  pointer-events: none;
  opacity: 0;
}

.lamp-light {
  position: absolute;
  inset: 0 0 auto;
  height: 70%;
  z-index: -1;
  background: radial-gradient(90% 55% at 50% 0%, rgba(255, 210, 138, 0.1) 0%, rgba(155, 227, 107, 0.04) 45%, transparent 75%);
  pointer-events: none;
  opacity: 0;
  transform: scaleY(0.4);
  transform-origin: top;
}

.lit .lamp-bar {
  animation: lamp-on 0.9s steps(1, end) forwards, lamp-glow 1.2s 0.9s var(--ease-out) forwards;
}

.lit .lamp-light {
  animation: light-fall 1.4s 0.55s var(--ease-out) forwards;
}

@keyframes lamp-on {
  0% { opacity: 0; }
  12% { opacity: 0.7; }
  20% { opacity: 0.1; }
  34% { opacity: 0.9; }
  42% { opacity: 0.3; }
  60%, 100% { opacity: 1; }
}

@keyframes lamp-glow {
  from { opacity: 1; filter: brightness(1.4); }
  to { opacity: 1; filter: brightness(1); }
}

@keyframes light-fall {
  to {
    opacity: 1;
    transform: scaleY(1);
  }
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
  gap: 16px;
  background: var(--bg);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.splash-logo {
  border-radius: 26px;
  box-shadow: 0 0 60px rgba(255, 210, 138, 0.18);
}

.load-error {
  padding: calc(10px + var(--safe-top)) 16px 10px;
  background: var(--danger-soft);
  border-bottom: 1px solid rgba(255, 95, 109, 0.4);
  color: #ffb4bb;
  font-size: 13px;
  line-height: 1.4;
}

.splash-leave-active {
  transition: opacity 0.5s var(--ease-out);
}

.splash-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .lit .lamp-bar,
  .lit .lamp-light {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

/* On desktop the app is shown inside a phone frame (used for the portfolio embed). */
@media (pointer: fine) and (min-width: 640px) and (min-height: 640px) {
  .device-stage {
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(60% 50% at 50% 0%, rgba(255, 210, 138, 0.08), transparent 70%),
      #040506;
  }

  .device {
    width: 390px;
    height: min(844px, calc(100vh - 40px));
    border-radius: 48px;
    border: 10px solid #15171a;
    box-shadow:
      0 0 0 1px #2a2e33,
      0 40px 80px -20px rgba(0, 0, 0, 0.9),
      0 -20px 80px -30px rgba(255, 210, 138, 0.18);
    --safe-top: 18px;
    --safe-bottom: 10px;
  }
}
</style>
