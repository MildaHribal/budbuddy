<script setup lang="ts">
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

const { t } = useI18n()
const { session, profile, signInPrompt, signIn, signOut, loadProfile } = useAuth()
const { notify } = useNotify()
const config = useRuntimeConfig()

const needsGate = computed(() => !!session.value && !!profile.value && !profile.value.accepted_terms_at)

// sign-in sheet: signed out and something asked for an account
const signInOpen = computed({
  get: () => signInPrompt.value && !session.value,
  set: (v) => {
    if (!v) signInPrompt.value = false
  }
})

// first sign-in gate: opens by itself once the profile loads without accepted terms
const gateOpen = ref(false)
watch(needsGate, (v) => {
  gateOpen.value = v
}, { immediate: true })
watch(signInPrompt, (v) => {
  if (v && needsGate.value) gateOpen.value = true
})
watch(gateOpen, (v) => {
  if (!v) signInPrompt.value = false
})

const busy = ref(false)
async function google() {
  if (busy.value) return
  busy.value = true
  try {
    await signIn()
  } catch (e) {
    console.error(e)
    notify(t('auth.signIn.failed'), { tone: 'error' })
  } finally {
    // web navigates away; native waits for the deep link
    busy.value = false
  }
}

// legal pages: the app bundle serves them on web; the APK opens the hosted copy
const legalBase = computed(() => {
  try {
    return new URL(String(config.public.aiProxyUrl)).origin
  } catch {
    return ''
  }
})
function openLegal(e: MouseEvent, page: 'privacy' | 'terms') {
  if (!Capacitor.isNativePlatform() || !legalBase.value) return
  e.preventDefault()
  Browser.open({ url: `${legalBase.value}/${page}.html` }).catch(() => {})
}

// ── Gate: username + 18+ + terms ──────────────────────────────────
const USERNAME = /^[a-z0-9_]{3,20}$/
const username = ref('')
const adult = ref(false)
const terms = ref(false)
const usernameError = ref<string | null>(null)
const saving = ref(false)

// a different account must never inherit the previous handle or ticked boxes
watch(() => session.value?.user.id, () => {
  username.value = profile.value?.username ?? ''
  adult.value = false
  terms.value = false
  usernameError.value = null
})
watch(() => profile.value?.username, (u) => {
  if (u && !username.value) username.value = u
}, { immediate: true })

const usernameValid = computed(() => USERNAME.test(username.value))
watch(username, (v) => {
  const clean = v.toLowerCase().replace(/\s+/g, '_')
  if (clean !== v) username.value = clean
  usernameError.value = null
})

async function accept() {
  const p = profile.value
  if (saving.value || !p || p.id !== session.value?.user.id || !usernameValid.value || !adult.value || !terms.value) return
  saving.value = true
  usernameError.value = null
  const sb = useSupabase()
  try {
    if (username.value !== p.username) {
      const { error } = await sb.from('profiles').update({ username: username.value }).eq('id', p.id)
      if (error) {
        usernameError.value = error.code === '23505' ? t('auth.gate.taken') : t('auth.gate.invalid')
        return
      }
    }
    const { error } = await sb.rpc('accept_terms')
    if (error) throw error
    await loadProfile()
    gateOpen.value = false
    notify(t('auth.gate.welcome', { name: `@${username.value}` }))
  } catch (e) {
    console.error(e)
    notify(t('auth.gate.failed'), { tone: 'error' })
  } finally {
    saving.value = false
  }
}

async function leave() {
  gateOpen.value = false
  await signOut()
}
</script>

<template>
  <BottomSheet
    v-model:open="signInOpen"
    :title="t('auth.signIn.title')"
    icon="community"
    icon-color="var(--green)"
  >
    <div class="intro">
      <p class="lead">
        {{ t('auth.signIn.lead') }}
      </p>
      <ul class="points">
        <li>
          <span class="pt-tile"><GrowIcon name="community" /></span>
          <span>{{ t('auth.signIn.pointCommunity') }}</span>
        </li>
        <li>
          <span class="pt-tile"><UIcon name="i-tabler-lock" /></span>
          <span>{{ t('auth.signIn.pointPrivate') }}</span>
        </li>
        <li>
          <span class="pt-tile"><UIcon name="i-tabler-world" /></span>
          <span>{{ t('auth.signIn.pointShare') }}</span>
        </li>
      </ul>
      <button
        type="button"
        class="btn btn-block google-btn"
        :disabled="busy"
        @click="google"
      >
        <svg
          class="g-mark"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        <span>{{ busy ? t('auth.signIn.opening') : t('auth.signIn.google') }}</span>
      </button>
      <p class="legal">
        {{ t('auth.signIn.legalPrefix') }}
        <a
          href="/terms.html"
          target="_blank"
          rel="noopener"
          @click="openLegal($event, 'terms')"
        >{{ t('auth.terms') }}</a>
        {{ t('auth.and') }}
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener"
          @click="openLegal($event, 'privacy')"
        >{{ t('auth.privacy') }}</a>.
      </p>
    </div>
  </BottomSheet>

  <BottomSheet
    v-model:open="gateOpen"
    :title="t('auth.gate.title')"
    icon="seedling"
    icon-color="var(--green)"
  >
    <form
      class="form-stack"
      @submit.prevent="accept"
    >
      <p class="muted">
        {{ t('auth.gate.lead') }}
      </p>
      <div class="field">
        <label
          class="field-label"
          for="gate-username"
        >{{ t('auth.gate.username') }}</label>
        <div class="handle">
          <span aria-hidden="true">@</span>
          <input
            id="gate-username"
            v-model="username"
            class="input"
            :class="{ invalid: !!usernameError || (username.length > 0 && !usernameValid) }"
            maxlength="20"
            autocapitalize="none"
            autocomplete="username"
            spellcheck="false"
            :aria-describedby="'gate-username-hint'"
            :aria-invalid="!!usernameError || !usernameValid"
          >
        </div>
        <span
          id="gate-username-hint"
          :class="usernameError || (username.length > 0 && !usernameValid) ? 'field-error' : 'field-hint'"
          role="status"
        >{{ usernameError ?? t('auth.gate.usernameHint') }}</span>
      </div>

      <label class="check">
        <input
          v-model="adult"
          type="checkbox"
        >
        <span>{{ t('auth.gate.adult') }}</span>
      </label>
      <label class="check">
        <input
          v-model="terms"
          type="checkbox"
        >
        <span>
          {{ t('auth.gate.acceptPrefix') }}
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener"
            @click="openLegal($event, 'terms')"
          >{{ t('auth.terms') }}</a>
          {{ t('auth.gate.acceptSuffix') }}
        </span>
      </label>
      <p class="rule">
        <UIcon
          name="i-tabler-shield-check"
          class="rule-icon"
        />
        <span>{{ t('auth.gate.rules') }}</span>
      </p>

      <button
        type="submit"
        class="btn btn-primary btn-block"
        :disabled="saving || !usernameValid || !adult || !terms"
      >
        <UIcon
          v-if="saving"
          name="i-tabler-loader-2"
          class="size-5 animate-spin"
        />
        {{ t('auth.gate.join') }}
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-block"
        @click="leave"
      >
        {{ t('auth.gate.notNow') }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: calc(8px + var(--safe-bottom));
}

.lead {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-2);
}

.points {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.points li {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  font-size: 14px;
  line-height: 1.45;
}

.pt-tile {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 20px;
}

.google-btn {
  gap: 12px;
}

.g-mark {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.legal {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
  text-align: center;
}

a {
  color: var(--green);
  text-underline-offset: 2px;
}

.handle {
  position: relative;
}

.handle > span {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  pointer-events: none;
}

.handle .input {
  padding-left: 30px;
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 44px;
  font-size: 14px;
  line-height: 1.45;
  cursor: pointer;
}

.check input {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin: 0;
  accent-color: var(--green);
}

.rule {
  display: flex;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.rule-icon {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 18px;
  color: var(--text-3);
}
</style>
