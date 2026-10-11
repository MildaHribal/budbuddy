<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'

const { t } = useI18n()
const { user, signedIn } = useAuth()
const { unread, refresh } = useNotifications()

let timer: ReturnType<typeof setInterval> | null = null
let channel: RealtimeChannel | null = null

const onVisible = () => {
  if (document.visibilityState === 'visible') refresh()
}

function stop() {
  if (timer) clearInterval(timer)
  timer = null
  if (channel) useSupabase().removeChannel(channel).catch(() => {})
  channel = null
}

function start(uid: string) {
  stop()
  refresh()
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') refresh()
  }, 60_000)
  // realtime is a bonus; polling covers it when the table isn't published
  try {
    channel = useSupabase()
      .channel(`notif-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => refresh())
      .subscribe()
  } catch {
    channel = null
  }
}

watch(() => user.value?.id, (uid) => {
  if (uid) start(uid)
  else {
    stop()
    unread.value = 0
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('focus', refresh)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  stop()
  window.removeEventListener('focus', refresh)
  document.removeEventListener('visibilitychange', onVisible)
})

const label = computed(() => (unread.value ? t('profile.notif.bellUnread', { n: unread.value }) : t('profile.notif.bell')))
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
  color: var(--lamp);
}

.count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--pink);
  color: #1a0710;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 0 0 2px var(--bg);
}

.pop-enter-active {
  transition: transform var(--dur) var(--ease-out);
}

.pop-enter-from {
  transform: scale(0.4);
}

@media (prefers-reduced-motion: reduce) {
  .pop-enter-active {
    transition: none;
  }
}
</style>
