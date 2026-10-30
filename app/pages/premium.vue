<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { openExternal } from '~/utils/external'

const { t } = useI18n()
useHead({ title: () => t('premium.title') })
const { notify } = useNotify()
const { user, signedIn, ready, requireAuth } = useAuth()
const plan = useAiPlan()
const remote = useRemoteConfig()
const cfg = remote.config

onMounted(() => {
  remote.load()
  plan.refresh()
})
watch(signedIn, (v) => {
  if (v) plan.refresh()
})

const email = computed(() => user.value?.email ?? '')
const price = computed(() => cfg.value.price || '5 USD')
const payUrl = computed(() => safeUrl(cfg.value.pay_url))
const contactUrl = computed(() => safeUrl(cfg.value.contact_url))
const contactEmail = computed(() => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.value.contact_email) ? cfg.value.contact_email : ''))
const hasPay = computed(() => !!cfg.value.pay_note.trim() || !!payUrl.value)

const copied = ref(false)
async function copyEmail() {
  try {
    await navigator.clipboard.writeText(email.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    notify(email.value)
  }
}

function pay() {
  logPaymentClick('pay')
  openExternal(payUrl.value)
}

function mail() {
  const q = new URLSearchParams({ subject: t('premium.mailSubject'), body: t('premium.mailBody', { email: email.value || '?' }) })
  openExternal(`mailto:${contactEmail.value}?${q.toString().replace(/\+/g, '%20')}`)
}

const native = Capacitor.isNativePlatform()
</script>

<template>
  <div>
    <AppHeader
      :title="t('premium.title')"
      :subtitle="t('premium.subtitle')"
      back
    />
    <div class="page rise">
      <section
        v-if="plan.unlimited.value"
        class="card pad active"
        role="status"
      >
        <UIcon
          name="i-tabler-circle-check"
          class="active-icon"
        />
        <div>
          <strong>{{ t('premium.active') }}</strong>
          <p>{{ plan.tier.value === 'admin' ? t('premium.admin') : t('premium.activeText') }}</p>
          <p
            v-if="plan.status.value"
            class="num today"
          >
            {{ t('premium.today', { text: plan.status.value.text, photo: plan.status.value.photo }) }}
          </p>
        </div>
      </section>

      <template v-else>
        <p class="lead">
          {{ t('premium.lead') }}
        </p>

        <div class="plans">
          <div class="card pad plan">
            <span class="plan-name">{{ t('premium.free') }}</span>
            <strong class="plan-price">0</strong>
            <span class="plan-text">{{ t('premium.perDay', { text: FREE_LIMITS.text, photo: FREE_LIMITS.photo }) }}</span>
            <span
              v-if="plan.status.value"
              class="plan-text num"
            >{{ t('premium.today', { text: plan.status.value.text, photo: plan.status.value.photo }) }}</span>
          </div>
          <div class="card pad plan best">
            <span class="plan-name">{{ t('premium.unlimited') }}</span>
            <strong class="plan-price">{{ t('premium.price', { price }) }}</strong>
            <span class="plan-text">{{ t('premium.unlimitedPerDay') }}</span>
          </div>
        </div>
        <p class="note">
          {{ t('premium.fairUse') }}
        </p>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('premium.stepsTitle') }}
            </h2>
          </div>
          <ol class="steps card">
            <li :class="{ done: signedIn }">
              <span class="step-n num">1</span>
              <div class="step-body">
                <p>{{ t('premium.step1') }}</p>
                <button
                  v-if="ready && !signedIn"
                  type="button"
                  class="btn btn-primary btn-sm"
                  @click="requireAuth()"
                >
                  <UIcon
                    name="i-tabler-login"
                    class="size-4"
                  />{{ t('premium.signIn') }}
                </button>
                <div
                  v-else-if="email"
                  class="email"
                >
                  <span class="email-label">{{ t('premium.yourEmail') }}</span>
                  <code>{{ email }}</code>
                  <button
                    type="button"
                    class="btn btn-soft btn-sm"
                    @click="copyEmail"
                  >
                    <UIcon
                      :name="copied ? 'i-tabler-check' : 'i-tabler-copy'"
                      class="size-4"
                    />{{ copied ? t('premium.copied') : t('premium.copy') }}
                  </button>
                </div>
              </div>
            </li>
            <li>
              <span class="step-n num">2</span>
              <div class="step-body">
                <p>{{ t('premium.step2', { price }) }}</p>
                <p
                  v-if="cfg.pay_note.trim()"
                  class="pay-note"
                >
                  {{ cfg.pay_note }}
                </p>
                <button
                  v-if="payUrl"
                  type="button"
                  class="btn btn-soft btn-sm"
                  @click="pay"
                >
                  <UIcon
                    name="i-tabler-external-link"
                    class="size-4"
                  />{{ t('premium.payOpen') }}
                </button>
                <p
                  v-if="remote.loaded.value && !hasPay"
                  class="muted"
                >
                  {{ t('premium.payMissing') }}
                </p>
              </div>
            </li>
            <li>
              <span class="step-n num">3</span>
              <div class="step-body">
                <p>{{ t('premium.step3') }}</p>
                <div class="row-btns">
                  <button
                    v-if="contactEmail"
                    type="button"
                    class="btn btn-primary btn-sm"
                    @click="mail"
                  >
                    <UIcon
                      name="i-tabler-mail"
                      class="size-4"
                    />{{ t('premium.contactEmail') }}
                  </button>
                  <button
                    v-if="contactUrl"
                    type="button"
                    class="btn btn-soft btn-sm"
                    @click="openExternal(contactUrl)"
                  >
                    <UIcon
                      name="i-tabler-message"
                      class="size-4"
                    />{{ t('premium.contactOther') }}
                  </button>
                </div>
              </div>
            </li>
          </ol>
        </section>

        <p
          v-if="remote.failed.value"
          class="muted"
          role="alert"
        >
          {{ t('premium.offline') }}
        </p>
        <button
          v-if="signedIn"
          type="button"
          class="btn btn-soft btn-block"
          :disabled="plan.loading.value"
          @click="plan.refresh()"
        >
          <UIcon
            name="i-tabler-refresh"
            class="size-5"
            :class="{ 'animate-spin': plan.loading.value }"
          />{{ t('premium.refresh') }}
        </button>
        <p class="note">
          {{ t('premium.legal') }}
        </p>
        <p
          v-if="!native"
          class="note"
        >
          {{ t('ai.web.text') }}
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pad {
  padding: 16px;
}

.btn-sm {
  min-height: 44px;
  padding: 0 14px;
  font-size: 13px;
}

.lead {
  margin: 0 2px;
  color: var(--text-2);
  font-size: 15px;
  line-height: 1.55;
}

.plans {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.plan {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plan.best {
  border-color: var(--accent);
}

.plan-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.plan-price {
  font-size: 20px;
  line-height: 1.25;
}

.plan-text {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.note {
  margin: 0 2px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-3);
}

.steps {
  margin: 0;
  padding: 4px 16px;
  list-style: none;
}

.steps li {
  display: flex;
  gap: 12px;
  padding: 14px 0;
}

.steps li + li {
  border-top: 1px solid var(--line);
}

.step-n {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--well);
  font-size: 14px;
  font-weight: 700;
}

.steps li.done .step-n {
  background: var(--accent);
  color: var(--on-accent, #06140b);
}

.step-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.step-body p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.pay-note {
  white-space: pre-line;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--well);
  user-select: text;
}

.email {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}

.email-label {
  width: 100%;
  font-size: 12px;
  color: var(--text-3);
}

.email code {
  font-size: 14px;
  word-break: break-all;
  user-select: text;
}

.row-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.active {
  display: flex;
  gap: 12px;
}

.active-icon {
  flex-shrink: 0;
  font-size: 28px;
  color: var(--green);
}

.active p {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-2);
}

.today {
  font-size: 13px;
}
</style>
