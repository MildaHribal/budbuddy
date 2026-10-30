<script setup lang="ts">
import { openExternal } from '~/utils/external'

const { t } = useI18n()
const support = useSupport()
const remote = useRemoteConfig()
const plan = useAiPlan()
watch(support.open, (v) => {
  if (v) remote.load()
})

const donateUrl = computed(() => safeUrl(remote.config.value.donate_url))

function donate() {
  logPaymentClick('donate')
  openExternal(donateUrl.value)
  support.open.value = false
}

function unlimited() {
  support.open.value = false
  navigateTo('/premium')
}
</script>

<template>
  <BottomSheet
    v-model:open="support.open.value"
    :title="t('support.title')"
    icon-color="var(--green)"
  >
    <template #icon>
      <UIcon name="i-tabler-heart-handshake" />
    </template>
    <div class="form-stack">
      <p class="text">
        {{ t('support.text') }}
      </p>
      <p
        v-if="remote.config.value.donate_note.trim()"
        class="note"
      >
        {{ remote.config.value.donate_note }}
      </p>
      <p
        v-else-if="remote.loaded.value && !donateUrl"
        class="note"
      >
        {{ t('support.missing') }}
      </p>
      <button
        v-if="donateUrl"
        type="button"
        class="btn btn-primary btn-block"
        @click="donate"
      >
        <UIcon
          name="i-tabler-heart"
          class="size-5"
        />{{ t('support.donate') }}
      </button>
      <button
        v-if="!plan.unlimited.value"
        type="button"
        class="btn btn-soft btn-block"
        @click="unlimited"
      >
        <UIcon
          name="i-tabler-infinity"
          class="size-5"
        />{{ t('support.unlimited') }}
      </button>
      <div class="later">
        <button
          type="button"
          class="btn btn-ghost"
          @click="support.open.value = false"
        >
          {{ t('support.later') }}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          @click="support.never()"
        >
          {{ t('support.never') }}
        </button>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.text {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-2);
}

.note {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--well);
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-line;
  user-select: text;
}

.later {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
</style>
