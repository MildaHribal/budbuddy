<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  iconColor?: string
}>(), {
  title: undefined,
  icon: undefined,
  iconColor: 'var(--accent)'
})

const sheet = ref<HTMLElement | null>(null)
const titleId = useId()

useBackHandler(open, () => {
  open.value = false
})

watch(open, async (v) => {
  if (!v) return
  await nextTick()
  // Move focus into the dialog. On touch screens focusing a field would pop the
  // keyboard over the form, so only desktop users get the first field focused.
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const first = coarse ? null : sheet.value?.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select')
  ;(first ?? sheet.value)?.focus({ preventScroll: true })
})
</script>

<template>
  <Teleport
    to="#overlays"
    defer
  >
    <Transition name="sheet">
      <div
        v-if="open"
        class="sheet-backdrop"
        @click.self="open = false"
      >
        <div
          ref="sheet"
          class="sheet"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="props.title ? titleId : undefined"
          tabindex="-1"
        >
          <div class="sheet-handle" />
          <div
            v-if="props.title"
            class="sheet-head"
          >
            <span
              v-if="props.icon"
              class="sheet-icon"
              :style="{ color: props.iconColor }"
            >
              <UIcon
                :name="props.icon"
                class="size-6"
              />
            </span>
            <h2 :id="titleId">
              {{ props.title }}
            </h2>
            <button
              type="button"
              class="icon-btn"
              aria-label="Close"
              @click="open = false"
            >
              <UIcon
                name="i-tabler-x"
                class="size-5"
              />
            </button>
          </div>
          <div class="sheet-body">
            <slot />
          </div>
          <div
            v-if="$slots.footer"
            class="sheet-footer"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.sheet {
  width: 100%;
  max-height: 92%;
  display: flex;
  flex-direction: column;
  background: #121412;
  border: 1px solid var(--line);
  border-bottom: 0;
  border-radius: 24px 24px 0 0;
  outline: none;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  margin: 10px auto 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
}

.sheet-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px 10px 20px;
  flex-shrink: 0;
}

.sheet-icon {
  display: inline-flex;
}

h2 {
  flex: 1;
  margin: 0;
  font-size: 19px;
  font-weight: 800;
}

.sheet-body {
  padding: 4px 20px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.sheet-footer {
  display: flex;
  gap: 10px;
  padding: 12px 20px calc(14px + var(--safe-bottom));
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}

.sheet-footer > :deep(*) {
  flex: 1;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.22s ease;
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
