<script setup lang="ts">
const { t } = useI18n()
const { user, signedIn } = useAuth()
const { unread, refresh } = useNotifications()
const { checkCelebration } = useBadges()

let timer: ReturnType<typeof setInterval> | null = null
let lastBadgeCheck = 0

function tick() {
  if (document.visibilityState !== 'visible') return
  refresh()
  if (user.value && Date.now() - lastBadgeCheck > 5 * 60e3) {
    lastBadgeCheck = Date.now()
    checkCelebration(user.value.id)
  }
}

function stop() {
  if (timer) clearInterval(timer)
  timer = null
}

function start() {
  stop()
  lastBadgeCheck = 0
  tick()
  timer = setInterval(tick, 60_000)
}

watch(() => user.value?.id, (uid) => {
  if (uid) start()
  else {
    stop()
    unread.value = 0
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('focus', tick)
  document.addEventListener('visibilitychange', tick)
})
onBeforeUnmount(() => {
  stop()
  window.removeEventListener('focus', tick)
  document.removeEventListener('visibilitychange', tick)
})

const label = computed(() => (unread.value ? t('notifications.bellUnread', { n: unread.value }) : t('notifications.bell')))
</script>

<template>
  <NuxtLink
    v-if="signedIn"
    to="/community/notifications"
    class="icon-btn bell"
    :class="{ live: unread > 0 }"
    :aria-label="label"
  >
    <UIcon
      name="i-tabler-bell"
      class="size-5"
    />
    <Transition name="pop">
      <span
        v-if="unread > 0"
        :key="unread"
        class="count num"
        aria-hidden="true"
      >{{ unread > 99 ? '99+' : unread }}</span>
    </Transition>
  </NuxtLink>
</template>

<style scoped>
.bell {
  position: relative;
}

.bell.live .iconify {
  color: var(--green);
}

.count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--red);
  color: var(--text);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  border: 2px solid var(--bg);
}

.pop-enter-active {
  transition: transform var(--dur) var(--ease-out);
}

.pop-enter-from {
  transform: scale(0.6);
}

@media (prefers-reduced-motion: reduce) {
  .pop-enter-active {
    transition: none;
  }
}
</style>
