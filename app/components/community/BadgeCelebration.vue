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
  <BottomSheet
    v-model:open="open"
    :title="t('profile.badges.celebrate.title')"
  >
    <div
      v-if="celebrate"
      class="cel"
      :style="{ '--c': badgeColor(celebrate.tier) }"
    >
      <div
        class="stage"
        aria-hidden="true"
      >
        <span class="bloom" />
        <CommunityBadgeMedal
          :key="celebrate.id"
          :glyph="badgeGlyph(celebrate)"
          :tier="celebrate.tier"
          :size="104"
          draw
          class="medal-in"
        />
      </div>
      <p class="lead">
        {{ t('profile.badges.celebrate.lead', { name: badgeName(celebrate) }) }}
      </p>
      <p class="desc">
        {{ badgeDesc(celebrate) }}
      </p>
      <p class="date num">
        {{ t('profile.badges.earnedOn', { date: formatDate(celebrate.earned_at.slice(0, 10)) }) }}
      </p>
      <button
        type="button"
        class="link view"
        @click="viewAll"
      >
        {{ t('profile.badges.celebrate.view') }}
      </button>
    </div>
    <template #footer>
      <button
        v-if="canPin"
        type="button"
        class="btn btn-lamp"
        :disabled="pinning"
        @click="pin"
      >
        <UIcon name="i-tabler-pin" /> {{ t('profile.badges.celebrate.pin') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        @click="open = false"
      >
        {{ t('profile.badges.celebrate.cta') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.cel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4px 0 8px;
}

.stage {
  position: relative;
  width: 180px;
  height: 150px;
  display: grid;
  place-items: center;
}

.bloom {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--c) 34%, transparent), rgba(255, 210, 138, 0.1) 55%, transparent 100%);
  opacity: 0;
  transform: scale(0.6);
  animation: bloom 900ms var(--ease-out) 120ms forwards;
}

.medal-in {
  animation: medal-in 520ms var(--ease-out) both;
}

.lead {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.desc {
  margin: 6px 0 0;
  max-width: 32ch;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-2);
}

.date {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--lamp);
}

.view {
  min-height: 44px;
  margin-top: 6px;
  border: 0;
  background: none;
}

@keyframes bloom {
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes medal-in {
  from {
    opacity: 0;
    transform: scale(0.82) translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bloom {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .medal-in {
    animation: none;
  }
}
</style>
