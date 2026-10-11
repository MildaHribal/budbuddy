<script setup lang="ts">
import { useFeedActions } from '~/utils/feed/actions'
import { REACTION_GLYPH, REACTIONS, reactionCount, type Post, type ReactionKind } from '~/utils/feed/feed'

const props = defineProps<{ post: Post }>()

const { t } = useI18n()
const { has, toggleReaction } = useFeedActions()

const liked = computed(() => has(props.post.id, 'like'))
const total = computed(() => props.post.likes_count)
const extras = computed(() => REACTIONS.filter(k => k !== 'like' && reactionCount(props.post, k) > 0)
  .sort((a, b) => reactionCount(props.post, b) - reactionCount(props.post, a))
  .slice(0, 3))
const mineExtra = computed(() => REACTIONS.some(k => k !== 'like' && has(props.post.id, k)))

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const burst = ref<ReactionKind | null>(null)
let burstTimer: ReturnType<typeof setTimeout> | undefined

function pop(kind: ReactionKind) {
  burst.value = null
  requestAnimationFrame(() => (burst.value = kind))
  clearTimeout(burstTimer)
  burstTimer = setTimeout(() => (burst.value = null), 700)
}

async function react(kind: ReactionKind) {
  if (!has(props.post.id, kind)) pop(kind)
  await toggleReaction(props.post, kind)
}

// Long-press on the heart opens the picker.
let pressTimer: ReturnType<typeof setTimeout> | undefined
let longPressed = false
function pressStart(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  longPressed = false
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    longPressed = true
    open.value = true
  }, 420)
}
function pressEnd() {
  clearTimeout(pressTimer)
}
function onHeart() {
  if (longPressed) {
    longPressed = false
    return
  }
  react('like')
}

function pick(kind: ReactionKind) {
  react(kind)
  open.value = false
}

function onDoc(e: Event) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
watch(open, (v) => {
  if (v) document.addEventListener('pointerdown', onDoc, true)
  else document.removeEventListener('pointerdown', onDoc, true)
})
useBackHandler(open, () => (open.value = false))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDoc, true)
  clearTimeout(pressTimer)
  clearTimeout(burstTimer)
})

const label = (k: ReactionKind) => t('feed.react.count', { label: t(`feed.react.${k}`), n: reactionCount(props.post, k) })
</script>

<template>
  <div
    ref="root"
    class="reactions"
    @keydown.esc="open = false"
  >
    <button
      type="button"
      class="act heart-btn"
      :class="{ on: liked, burst: burst === 'like' }"
      :aria-pressed="liked"
      :aria-label="`${t('feed.react.like')}, ${t('feed.reactions', { n: total })}`"
      @pointerdown="pressStart"
      @pointerup="pressEnd"
      @pointerleave="pressEnd"
      @pointercancel="pressEnd"
      @contextmenu.prevent
      @click="onHeart"
    >
      <span class="glyph">
        <UIcon :name="liked ? 'i-tabler-heart-filled' : 'i-tabler-heart'" />
        <span
          class="sparks"
          aria-hidden="true"
        ><i
          v-for="n in 6"
          :key="n"
          :style="{ '--a': `${n * 60}deg` }"
        /></span>
      </span>
      <Transition
        name="tick"
        mode="out-in"
      >
        <span
          :key="total"
          class="num"
        >{{ total }}</span>
      </Transition>
    </button>

    <button
      type="button"
      class="act more-btn"
      :class="{ on: mineExtra, burst: burst && burst !== 'like' }"
      :aria-label="t('feed.react.more')"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="open = !open"
    >
      <span
        v-if="extras.length"
        class="stack"
      >
        <GrowIcon
          v-for="k in extras"
          :key="k"
          :name="REACTION_GLYPH[k].glyph"
          :style="{ color: REACTION_GLYPH[k].color }"
        />
      </span>
      <UIcon
        v-else
        name="i-tabler-mood-plus"
      />
    </button>

    <Transition name="picker">
      <div
        v-if="open"
        class="picker"
        role="group"
        :aria-label="t('feed.react.picker')"
      >
        <button
          v-for="(k, i) in REACTIONS"
          :key="k"
          type="button"
          class="pick"
          :class="{ on: has(post.id, k) }"
          :style="{ '--c': REACTION_GLYPH[k].color, '--i': i }"
          :aria-pressed="has(post.id, k)"
          :aria-label="label(k)"
          @click="pick(k)"
        >
          <GrowIcon
            :name="has(post.id, k) ? REACTION_GLYPH[k].on : REACTION_GLYPH[k].glyph"
            class="pick-glyph"
          />
          <span
            class="pick-label"
            aria-hidden="true"
          >{{ t(`feed.react.${k}`) }}</span>
          <span
            v-if="reactionCount(post, k)"
            class="pick-count num"
            aria-hidden="true"
          >{{ reactionCount(post, k) }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.reactions {
  position: relative;
  display: flex;
  align-items: center;
}

.act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  border: 0;
  border-radius: 12px;
  background: none;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 600;
  justify-content: center;
  user-select: none;
  -webkit-touch-callout: none;
  transition: color var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.act .iconify {
  font-size: 20px;
}

.act:active {
  transform: scale(0.92);
}

.act.on {
  color: var(--leaf);
}

.more-btn {
  padding: 0 8px;
  margin-left: -6px;
}

.stack {
  display: inline-flex;
  font-size: 17px;
}

.stack .grow-icon + .grow-icon {
  margin-left: -4px;
}

.glyph {
  position: relative;
  display: inline-flex;
}

.burst .glyph > .iconify,
.burst .stack {
  animation: pop 0.5s var(--ease-out);
}

.sparks {
  position: absolute;
  inset: 50% auto auto 50%;
  pointer-events: none;
}

.sparks i {
  position: absolute;
  width: 4px;
  height: 4px;
  margin: -2px;
  border-radius: 50%;
  background: var(--leaf);
  opacity: 0;
}

.burst .sparks i {
  animation: spark 0.6s var(--ease-out) forwards;
}

.num {
  display: inline-block;
  min-width: 1ch;
}

.tick-enter-active,
.tick-leave-active {
  transition: transform 160ms var(--ease-out), opacity 160ms ease;
}

.tick-enter-from {
  transform: translateY(6px);
  opacity: 0;
}

.tick-leave-to {
  transform: translateY(-6px);
  opacity: 0;
}

.picker {
  position: absolute;
  left: -4px;
  bottom: calc(100% + 6px);
  z-index: 5;
  display: flex;
  gap: 2px;
  padding: 5px;
  border-radius: 20px;
  border: 1px solid var(--line-strong);
  background: var(--panel);
  box-shadow: inset 0 1px 0 var(--highlight), var(--panel-shadow), 0 14px 30px -10px rgba(0, 0, 0, 0.8);
  transform-origin: 24px 100%;
}

.pick {
  position: relative;
  width: 58px;
  min-height: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 2px 5px;
  border: 1px solid transparent;
  border-radius: 15px;
  background: none;
  color: var(--text-2);
  transition: transform var(--dur-fast) var(--ease-out), background var(--dur) ease;
}

.pick:active {
  transform: scale(0.9);
}

.pick.on {
  background: color-mix(in srgb, var(--c) 13%, transparent);
  border-color: color-mix(in srgb, var(--c) 32%, transparent);
  color: var(--text);
}

.pick-glyph {
  font-size: 24px;
  color: var(--c);
}

.picker .pick {
  animation: pick-in 260ms var(--ease-out) both;
  animation-delay: calc(var(--i) * 28ms);
}

.pick-label {
  max-width: 100%;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
  text-wrap: balance;
}

.pick-count {
  position: absolute;
  top: 3px;
  right: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
}

.picker-enter-active {
  transition: transform 240ms var(--ease-out), opacity 180ms ease;
}

.picker-leave-active {
  transition: transform 140ms ease, opacity 140ms ease;
}

.picker-enter-from,
.picker-leave-to {
  transform: translateY(6px) scale(0.92);
  opacity: 0;
}

@keyframes pop {
  0% { transform: scale(0.6); }
  45% { transform: scale(1.35); }
  100% { transform: scale(1); }
}

@keyframes spark {
  0% {
    opacity: 1;
    transform: rotate(var(--a)) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--a)) translateY(-16px) scale(0.4);
  }
}

@keyframes pick-in {
  from {
    transform: translateY(8px) scale(0.7);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .burst .glyph > .iconify,
  .burst .stack,
  .burst .sparks i,
  .picker .pick {
    animation: none;
  }
}
</style>
