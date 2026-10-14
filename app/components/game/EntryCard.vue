<script setup lang="ts">
import { Preferences } from '@capacitor/preferences'
import { loadNamespaces } from '~/composables/useI18n'
import { GAME_KEY, peekGame, type GamePeek } from '~/utils/gameUi'

// Entry point to Shadow Grow from Home, Tools and the Guide. Loads its own texts so those pages stay light.
const props = withDefaults(defineProps<{ variant?: 'home' | 'row', withHeading?: boolean }>(), { variant: 'row', withHeading: false })
const { t } = useI18n()

const ready = ref(false)
const peek = ref<GamePeek | null>(null)

onMounted(async () => {
  try {
    await loadNamespaces(['game'])
    ready.value = true
  } catch {
    return
  }
  try {
    peek.value = peekGame((await Preferences.get({ key: GAME_KEY })).value)
  } catch {
    peek.value = null
  }
})

const line = computed(() => {
  const p = peek.value
  if (!p) return t(props.variant === 'home' ? 'game.entry.homeText' : 'game.entry.rowText')
  const parts = [t('game.grower.level', { n: p.level }), t('game.entry.growing', { n: p.growing })]
  if (p.unread) parts.push(t('game.entry.unread', { n: p.unread }))
  return parts.join(' · ')
})
</script>

<template>
  <section
    v-if="ready && withHeading"
    aria-labelledby="g-entry-h"
  >
    <div class="section-head">
      <h2
        id="g-entry-h"
        class="section-title"
      >
        {{ t('game.entry.section') }}
      </h2>
    </div>
    <NuxtLink
      to="/game"
      class="card g-entry"
    >
      <span class="tile"><GrowIcon name="tent" /></span>
      <span class="text">
        <span class="title">{{ t('game.title') }}</span>
        <span class="desc">{{ line }}</span>
      </span>
      <UIcon
        name="i-tabler-chevron-right"
        class="size-5 go"
      />
    </NuxtLink>
  </section>
  <NuxtLink
    v-else-if="ready"
    to="/game"
    class="card g-entry"
    :class="variant"
  >
    <span class="tile"><GrowIcon name="tent" /></span>
    <span class="text">
      <span class="title">{{ variant === 'home' ? t('game.entry.homeTitle') : t('game.title') }}</span>
      <span class="desc">{{ line }}</span>
    </span>
    <span
      v-if="variant === 'home'"
      class="cta"
    >{{ peek ? t('game.entry.open') : t('game.entry.start') }}</span>
    <UIcon
      v-else
      name="i-tabler-chevron-right"
      class="size-5 go"
    />
  </NuxtLink>
</template>

<style scoped>
.g-entry {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 72px;
  padding: 12px 14px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.g-entry:active {
  transform: scale(0.985);
}

.tile {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-control);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 24px;
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 15px;
  font-weight: 600;
}

.desc {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.cta {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--green);
}

.go {
  flex-shrink: 0;
  color: var(--text-3);
}
</style>
