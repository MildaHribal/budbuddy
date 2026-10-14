<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { COMMUNITY_NAMESPACES, loadNamespaces } from '~/composables/useI18n'
import { SHOWCASE_MEDIA } from '~/composables/useGrow'
import { authUiWanted } from '~/utils/authUi'

const { ready, loadError, recovered, state } = useGrow()
const { t } = useI18n()
const { active: tourActive } = useAppTour()

// Never over unreadable or set-aside data: its "Start empty" would wipe what is left.
const onboarding = computed(() => ready.value && !loadError.value && !recovered.value && !state.settings.onboarded)

// First run: the onboarding covers the page, so mount the page (and its photos) a moment later
// instead of competing with the onboarding's first paint.
const pageWarm = ref(false)
watch(ready, (v) => {
  if (!v || pageWarm.value) return
  if (!onboarding.value) pageWarm.value = true
  else setTimeout(() => (pageWarm.value = true), 1500)
}, { immediate: true })
watch(() => state.settings.onboarded, (v) => {
  if (v) pageWarm.value = true
})

// supabase-js lives in the sign-in sheet's chunk: mount it only where sign-in can be asked for
// (community, settings, on request) or at idle when a session is stored (badge toasts, sync).
const route = useRoute()
const authUi = ref(false)
const AUTH_ROUTES = /^\/(community|u|plant|strains|challenges|auth|auth-callback|admin|settings)(\/|$)/
watch(() => route.path, (p) => {
  if (AUTH_ROUTES.test(p)) authUi.value = true
}, { immediate: true })
// other pages ask for it right before they need sign-in (e.g. sharing a plant)
watch(authUiWanted, (v) => {
  if (v) authUi.value = true
})

function hasSession(): boolean {
  try {
    return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch {
    return false
  }
}

watch(ready, (v) => {
  if (!v || authUi.value || !hasSession()) return
  // sign-in sheet and badge toasts need the community texts first
  const show = () => loadNamespaces([...COMMUNITY_NAMESPACES]).then(() => (authUi.value = true), () => {})
  if ('requestIdleCallback' in window) requestIdleCallback(show, { timeout: 4000 })
  else setTimeout(show, 2500)
}, { immediate: true })

// meta, og tags and icons are static in nuxt.config.ts
useHead({
  titleTemplate: chunk => (chunk ? `${chunk} · BudBuddy` : 'BudBuddy – free grow journal for home growers')
})

// Wide desktop web: a short product presentation beside the phone frame.
const native = Capacitor.isNativePlatform()
const wide = useMediaQuery(SHOWCASE_MEDIA)
const showcase = computed(() => !native && wide.value)
</script>

<template>
  <div
    class="device-stage"
    :class="{ 'has-showcase': showcase }"
  >
    <LazyDesktopShowcase v-if="showcase && ready" />
    <div class="device">
      <OnboardingGuide v-if="onboarding" />
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
      <DataAlerts v-if="ready" />
      <NuxtLayout v-if="ready && pageWarm">
        <NuxtPage />
      </NuxtLayout>
      <LazyAppTour v-if="ready && pageWarm && tourActive" />
      <AppToaster />
      <ConfirmDialog />
      <LazyCommunitySignInSheet v-if="ready && authUi" />
      <LazyCommunityBadgeCelebration v-if="ready && authUi" />
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
}

.splash-leave-active {
  transition: opacity 0.5s var(--ease-out);
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
    background: #060707;
  }

  .device {
    width: 390px;
    height: min(844px, calc(100vh - 40px));
    border-radius: 48px;
    border: 10px solid #15171a;
    box-shadow: 0 0 0 1px #2a2e33, 0 30px 60px -20px rgba(0, 0, 0, 0.8);
    --safe-top: 18px;
    --safe-bottom: 10px;
    flex-shrink: 0;
  }

  .device-stage.has-showcase {
    gap: clamp(48px, 7vw, 112px);
    padding: 20px 32px;
    align-items: safe center;
    overflow-y: auto;
  }
}
</style>
