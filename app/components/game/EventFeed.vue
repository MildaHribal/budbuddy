<script setup lang="ts">
import type { GameEvent } from '~~/shared/game/types'
import { gameText } from '~/utils/gameUi'

const props = defineProps<{ events: readonly GameEvent[] }>()
const emit = defineEmits<{ readAll: [] }>()
const { t } = useI18n()

const LIMIT = 6
const showAll = ref(false)
const sorted = computed(() => [...props.events].sort((a, b) => b.atH - a.atH))
const list = computed(() => (showAll.value ? sorted.value : sorted.value.slice(0, LIMIT)))
const unread = computed(() => props.events.filter(e => !e.read).length)

const ICON: Record<GameEvent['kind'], { icon: string, tone: string }> = {
  'power-cut': { icon: 'i-tabler-plug-off', tone: 'var(--red)' },
  'heatwave': { icon: 'i-tabler-temperature-plus', tone: 'var(--red)' },
  'cold-snap': { icon: 'i-tabler-temperature-minus', tone: 'var(--blue)' },
  'pest-hitchhiker': { icon: 'pest', tone: '#f0905a' },
  'humidity-spike': { icon: 'i-tabler-droplet-half-2', tone: 'var(--blue)' },
  'problem': { icon: 'i-tabler-alert-triangle', tone: 'var(--amber)' },
  'stage': { icon: 'stage', tone: 'var(--green)' },
  'ripe': { icon: 'harvest', tone: 'var(--amber)' },
  'dead': { icon: 'i-tabler-plant-off', tone: 'var(--red)' },
  'herm': { icon: 'flowering', tone: '#b58cf5' },
  'info': { icon: 'i-tabler-info-circle', tone: 'var(--text-2)' }
}

const when = (h: number) => t('game.clockShort', { day: Math.floor(h / 24) + 1, time: `${String(Math.floor(h % 24)).padStart(2, '0')}:00` })
const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <section aria-labelledby="g-feed">
    <div class="section-head">
      <h2
        id="g-feed"
        class="section-title"
      >
        {{ t('game.feed.title') }}
      </h2>
      <button
        v-if="unread"
        type="button"
        class="link"
        @click="emit('readAll')"
      >
        {{ t('game.feed.markRead', { n: unread }) }}
      </button>
    </div>
    <div
      v-if="!events.length"
      class="card feed-empty"
    >
      {{ t('game.feed.empty') }}
    </div>
    <ul
      v-else
      class="card feed"
    >
      <li
        v-for="e in list"
        :key="e.id"
      >
        <component
          :is="e.plantId ? NuxtLink : 'div'"
          :to="e.plantId ? `/game/plant/${e.plantId}` : undefined"
          class="ev"
          :class="{ unread: !e.read }"
        >
          <span
            class="ev-icon"
            :style="{ color: ICON[e.kind].tone }"
          >
            <GrowIcon :name="ICON[e.kind].icon" />
          </span>
          <span class="ev-text">
            <span class="ev-msg">{{ gameText(e.text) }}</span>
            <span class="ev-when num">{{ when(e.atH) }}<template v-if="!e.read"> · <span class="ev-new">{{ t('game.feed.new') }}</span></template></span>
          </span>
        </component>
      </li>
      <li v-if="sorted.length > LIMIT">
        <button
          type="button"
          class="more"
          :aria-expanded="showAll"
          @click="showAll = !showAll"
        >
          {{ showAll ? t('game.feed.showLess') : t('game.feed.showAll', { n: sorted.length }) }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.feed {
  margin: 0;
  padding: 0;
  list-style: none;
}

.feed li + li {
  border-top: 1px solid var(--line);
}

.ev {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  color: inherit;
  text-decoration: none;
}

.ev-icon {
  flex-shrink: 0;
  font-size: 20px;
  padding-top: 1px;
}

.ev-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ev-msg {
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-2);
}

.ev.unread .ev-msg {
  color: var(--text);
  font-weight: 500;
}

.ev-when {
  font-size: 12px;
  color: var(--text-3);
}

.ev-new {
  color: var(--green);
  font-weight: 600;
}

.more {
  width: 100%;
  min-height: 44px;
  border: 0;
  background: none;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
}

.feed-empty {
  padding: 16px 14px;
  font-size: 13px;
  color: var(--text-2);
}
</style>
