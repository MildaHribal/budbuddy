<script setup lang="ts">
import { badgeColor, badgeDesc, badgeGlyph, badgeName, MAX_PINNED } from '~/composables/useBadges'

const { t } = useI18n()
const { user, profile, loadProfile } = useAuth()
const { celebrate, markCelebrated, savePinned } = useBadges()
const { notify } = useNotify()

const open = ref(false)
const pinning = ref(false)
watch(celebrate, (b) => {
  open.value = !!b
}, { immediate: true })
watch(open, (v) => {
  if (!v && celebrate.value && user.value) markCelebrated(user.value.id, celebrate.value.id)
})
useBackHandler(open, () => (open.value = false))

const ctaBtn = ref<HTMLButtonElement | null>(null)
watch(open, async (v) => {
  if (!v) return
  await nextTick()
  ctaBtn.value?.focus({ preventScroll: true })
})

const pinned = computed(() => profile.value?.pinned_badges ?? [])
const canPin = computed(() => !!celebrate.value && !pinned.value.includes(celebrate.value.id) && pinned.value.length < MAX_PINNED)

async function pin() {
  const b = celebrate.value
  const uid = user.value?.id
  if (!b || !uid || pinning.value) return
  pinning.value = true
  const err = await savePinned(uid, [...pinned.value, b.id])
  pinning.value = false
  if (err) {
    notify(t(err), { tone: 'error' })
    return
  }
  await loadProfile()
  open.value = false
}

function viewAll() {
  open.value = false
  if (profile.value) navigateTo(`/u/${profile.value.username}#badges`)
}
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <Transition name="cel">
      <div
        v-if="open && celebrate"
        class="cel-backdrop"
        @click.self="open = false"
      >
        <div
          class="cel card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cel-title"
          :style="{ '--c': badgeColor(celebrate.tier) }"
        >
          <h2
            id="cel-title"
            class="cel-title"
          >
            {{ t('profile.badges.celebrate.title') }}
          </h2>
          <CommunityBadgeMedal
            :key="celebrate.id"
            :glyph="badgeGlyph(celebrate)"
            :tier="celebrate.tier"
            :size="72"
          />
          <p class="lead">
            {{ t('profile.badges.celebrate.lead', { name: badgeName(celebrate) }) }}
          </p>
          <p class="desc">
            {{ badgeDesc(celebrate) }}
          </p>
          <p class="date num">
            {{ t('profile.badges.earnedOn', { date: formatDate(celebrate.earned_at.slice(0, 10)) }) }}
          </p>
          <div class="actions">
            <button
              v-if="canPin"
              type="button"
              class="btn btn-block"
              :disabled="pinning"
              @click="pin"
            >
              <UIcon name="i-tabler-pin" /> {{ t('profile.badges.celebrate.pin') }}
            </button>
            <button
              ref="ctaBtn"
              type="button"
              class="btn btn-primary btn-block"
              @click="open = false"
            >
              {{ t('profile.badges.celebrate.cta') }}
            </button>
            <button
              type="button"
              class="link view"
              @click="viewAll"
            >
              {{ t('profile.badges.celebrate.view') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cel-backdrop {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(3, 4, 5, 0.74);
}

.cel {
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 20px 16px;
  text-align: center;
  box-shadow: var(--shadow-float);
}

.cel-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.lead {
  margin: 8px 0 0;
  font-size: 15px;
  font-weight: 600;
}

.desc {
  margin: 0;
  max-width: 32ch;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-2);
}

.date {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.view {
  align-self: center;
  min-height: 44px;
}

.cel-enter-active,
.cel-leave-active {
  transition: opacity var(--dur) var(--ease-out);
}

.cel-enter-active .cel {
  transition: transform var(--dur-slow) var(--ease-out), opacity var(--dur) var(--ease-out);
}

.cel-leave-active .cel {
  transition: transform var(--dur-fast) ease, opacity var(--dur-fast) ease;
}

.cel-enter-from,
.cel-leave-to {
  opacity: 0;
}

.cel-enter-from .cel,
.cel-leave-to .cel {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}
</style>
