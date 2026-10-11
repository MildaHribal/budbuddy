<script setup lang="ts">
import { badgeColor, badgeDesc, badgeGlyph, badgeName, MAX_PINNED, type BadgeDef } from '~/composables/useBadges'

const props = defineProps<{
  defs: BadgeDef[]
  /** badge id → earned_at */
  earned: Record<string, string>
  pinned: string[]
  owner: boolean
  userId: string
}>()
const emit = defineEmits<{ pinned: [ids: string[]] }>()

const { t } = useI18n()
const { notify } = useNotify()
const { savePinned } = useBadges()

// earned first (newest first), then locked in catalogue order
const sorted = computed(() => {
  const got = props.defs.filter(d => props.earned[d.id]).sort((a, b) => props.earned[b.id]!.localeCompare(props.earned[a.id]!))
  return [...got, ...props.defs.filter(d => !props.earned[d.id])]
})
const earnedCount = computed(() => props.defs.filter(d => props.earned[d.id]).length)

const openId = ref<string | null>(null)
const sheetOpen = computed({
  get: () => openId.value !== null,
  set: (v) => {
    if (!v) openId.value = null
  }
})
const current = computed(() => props.defs.find(d => d.id === openId.value) ?? null)
const currentEarned = computed(() => (current.value ? props.earned[current.value.id] ?? null : null))
const isPinned = computed(() => !!current.value && props.pinned.includes(current.value.id))

const saving = ref(false)
async function togglePin() {
  const b = current.value
  if (!b || saving.value) return
  if (!isPinned.value && props.pinned.length >= MAX_PINNED) {
    notify(t('profile.badges.pinFull'), { tone: 'info' })
    return
  }
  const next = isPinned.value ? props.pinned.filter(id => id !== b.id) : [...props.pinned, b.id]
  saving.value = true
  const err = await savePinned(props.userId, next)
  saving.value = false
  if (err) {
    notify(t(err), { tone: 'error' })
    return
  }
  emit('pinned', next)
}
</script>

<template>
  <section
    id="badges"
    aria-labelledby="h-badges"
    class="badges-sec"
  >
    <div class="section-head">
      <h2
        id="h-badges"
        class="section-title"
      >
        <UIcon name="i-tabler-award" /> {{ t('profile.badges.title') }}
      </h2>
      <span class="section-meta num">{{ t('profile.badges.count', { n: earnedCount, total: defs.length }) }}</span>
    </div>
    <p
      v-if="owner && !earnedCount"
      class="muted none"
    >
      {{ t('profile.badges.noneOwn') }}
    </p>
    <ul class="grid">
      <li
        v-for="b in sorted"
        :key="b.id"
      >
        <button
          type="button"
          class="cell"
          :class="{ got: !!earned[b.id] }"
          :aria-label="t('profile.badges.open', { name: badgeName(b), state: earned[b.id] ? t('profile.badges.stateEarned') : t('profile.badges.stateLocked') })"
          @click="openId = b.id"
        >
          <CommunityBadgeMedal
            :glyph="badgeGlyph(b)"
            :tier="b.tier"
            :earned="!!earned[b.id]"
            :size="52"
          />
          <span class="cell-name">{{ badgeName(b) }}</span>
          <span
            v-if="earned[b.id]"
            class="cell-date num"
          >{{ formatDate(earned[b.id]!.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
          <UIcon
            v-if="pinned.includes(b.id)"
            name="i-tabler-pin-filled"
            class="pin-mark"
          />
        </button>
      </li>
    </ul>

    <BottomSheet
      v-model:open="sheetOpen"
      :title="current ? badgeName(current) : ''"
    >
      <div
        v-if="current"
        class="detail"
        :style="{ '--c': badgeColor(current.tier) }"
      >
        <CommunityBadgeMedal
          :key="current.id"
          :glyph="badgeGlyph(current)"
          :tier="current.tier"
          :earned="!!currentEarned"
          :size="88"
          :draw="!!currentEarned"
        />
        <p
          class="state num"
          :class="{ on: currentEarned }"
        >
          {{ currentEarned ? t('profile.badges.earnedOn', { date: formatDate(currentEarned.slice(0, 10)) }) : t('profile.badges.locked') }}
        </p>
        <div class="how">
          <h3>{{ t('profile.badges.howTo') }}</h3>
          <p>{{ badgeDesc(current) }}</p>
        </div>
        <p
          v-if="owner && currentEarned"
          class="field-hint"
        >
          {{ t('profile.badges.pinHint') }}
        </p>
      </div>
      <template
        v-if="owner && currentEarned"
        #footer
      >
        <button
          type="button"
          class="btn btn-block"
          :class="isPinned ? 'btn-soft' : 'btn-lamp'"
          :disabled="saving"
          @click="togglePin"
        >
          <UIcon :name="isPinned ? 'i-tabler-pinned-off' : 'i-tabler-pin'" />
          {{ isPinned ? t('profile.badges.unpin') : t('profile.badges.pin') }}
        </button>
      </template>
    </BottomSheet>
  </section>
</template>

<style scoped>
.badges-sec {
  scroll-margin-top: 72px;
}

.none {
  margin: 0 0 10px;
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cell {
  position: relative;
  width: 100%;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px 10px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-3);
  text-align: center;
  transition: transform var(--dur-fast) var(--ease-out);
}

.cell.got {
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight);
  color: var(--text);
}

.cell:active {
  transform: scale(0.96);
}

.cell-name {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.cell:not(.got) .cell-name {
  color: var(--text-2);
}

.cell-date {
  font-size: 11px;
  color: var(--text-3);
}

.pin-mark {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 14px;
  height: 14px;
  color: var(--lamp);
}

.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 6px 0 12px;
}

.state {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}

.state.on {
  color: var(--c);
}

.how {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  text-align: left;
}

.how h3 {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.how p {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
}
</style>
