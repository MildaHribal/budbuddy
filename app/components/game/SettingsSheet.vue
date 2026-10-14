<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const { confirm } = useConfirm()
const { notify } = useNotify()
const game = useGame()

const native = Capacitor.isNativePlatform()
const on = computed(() => game.state.value?.settings.notifications ?? false)

async function toggle() {
  const next = !on.value
  if (next && native) {
    const perm = await LocalNotifications.checkPermissions().catch(() => null)
    const granted = perm?.display === 'granted' || (await LocalNotifications.requestPermissions().catch(() => null))?.display === 'granted'
    if (!granted) {
      notify(t('game.settings.denied'), { tone: 'error', duration: 5000 })
      return
    }
  }
  game.setNotifications(next)
}

async function restart() {
  const yes = await confirm({ title: t('game.settings.restartTitle'), message: t('game.settings.restartText'), confirmLabel: t('game.settings.restartConfirm'), danger: true })
  if (!yes) return
  await game.startNewGame()
  open.value = false
  notify(t('game.settings.restarted'))
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('game.settings.title')"
    icon="i-tabler-settings"
    icon-color="var(--text-2)"
  >
    <div class="card list">
      <button
        type="button"
        class="sw"
        role="switch"
        :aria-checked="on"
        :disabled="!native"
        @click="toggle"
      >
        <span class="sw-text">
          {{ t('game.settings.notify') }}
          <small>{{ native ? t('game.settings.notifyHint') : t('game.settings.notifyWeb') }}</small>
        </span>
        <span class="sw-track" />
      </button>
    </div>
    <div class="danger-zone">
      <p>{{ t('game.settings.restartLead') }}</p>
      <button
        type="button"
        class="btn btn-danger btn-block"
        @click="restart"
      >
        {{ t('game.settings.restart') }}
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.sw {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 10px 14px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  text-align: left;
  font-size: 15px;
  font-weight: 600;
}

.sw:disabled {
  opacity: 0.6;
}

.sw-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sw-text small {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-3);
}

.sw-track {
  position: relative;
  width: 44px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--track);
  transition: background var(--dur) ease;
}

.sw-track::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--text-2);
  transition: transform var(--dur) var(--ease-out), background var(--dur) ease;
}

.sw[aria-checked="true"] .sw-track {
  background: var(--accent-soft);
}

.sw[aria-checked="true"] .sw-track::after {
  transform: translateX(18px);
  background: var(--green);
}

.danger-zone {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.danger-zone p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
</style>
