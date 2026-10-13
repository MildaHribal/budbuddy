<script setup lang="ts">
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { AUTH_RETURN_KEY } from '~/composables/useAuth'

definePageMeta({ alias: ['/auth-callback'], hideNav: true })

const { t } = useI18n()
useHead({ title: () => t('auth.callback.title') })

const route = useRoute()
const { loadProfile, session } = useAuth()
const failed = ref<string | null>(null)

function returnPath(): string {
  let to: string | null = null
  try {
    to = sessionStorage.getItem(AUTH_RETURN_KEY)
    sessionStorage.removeItem(AUTH_RETURN_KEY)
  } catch { /* storage blocked */ }
  // only same-app paths, never the callback itself
  return to && to.startsWith('/') && !to.startsWith('//') && !to.startsWith('/auth') ? to : '/community'
}

let handled: string | null = null

// native deep links can land on this page while it is already mounted, so react to every new code
async function exchange() {
  const q = route.query
  const code = typeof q.code === 'string' ? q.code : null
  const err = typeof q.error_description === 'string' || typeof q.error === 'string'
  if (Capacitor.isNativePlatform()) Browser.close().catch(() => {})
  if (!code) {
    failed.value = t(err ? 'auth.callback.denied' : 'auth.callback.noCode')
    return
  }
  if (code === handled) return
  handled = code
  failed.value = null
  const { data, error } = await useSupabase().auth.exchangeCodeForSession(code)
  if (error) {
    // a reload of the callback URL after success re-uses a spent code
    if (session.value) return navigateTo(returnPath(), { replace: true })
    console.warn('[BudBuddy] sign-in failed', error)
    failed.value = t('auth.callback.exchangeFailed')
    return
  }
  session.value = data.session
  await loadProfile()
  // the first-sign-in sheet opens itself when terms are not accepted yet
  navigateTo(returnPath(), { replace: true })
}

watch(() => route.query.code, () => {
  exchange()
}, { immediate: true })
</script>

<template>
  <div class="callback">
    <div class="card box">
      <template v-if="!failed">
        <UIcon
          name="i-tabler-loader-2"
          class="spin"
        />
        <p>{{ t('auth.callback.working') }}</p>
      </template>
      <template v-else>
        <GrowIcon
          name="community"
          class="glyph"
        />
        <h1>{{ t('auth.callback.failed') }}</h1>
        <p class="muted">
          {{ failed }}
        </p>
        <NuxtLink
          to="/community"
          replace
          class="btn btn-primary btn-block"
        >
          {{ t('auth.callback.back') }}
        </NuxtLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.callback {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24px + var(--safe-top)) 16px 40px;
}

.box {
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  text-align: center;
}

.spin {
  font-size: 28px;
  color: var(--green);
  animation: spin 0.9s linear infinite;
}

.glyph {
  width: 44px;
  height: 44px;
  padding: 10px;
  border-radius: var(--radius-control);
  background: var(--danger-soft);
  color: var(--red);
}

h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

p {
  margin: 0;
  max-width: 300px;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.box .btn {
  margin-top: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spin { animation-duration: 2.4s; }
}
</style>
