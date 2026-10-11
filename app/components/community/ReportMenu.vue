<script setup lang="ts">
type Target = 'post' | 'comment' | 'tip' | 'profile' | 'plant' | 'strain' | 'entry'

const props = defineProps<{
  targetType: Target
  targetId: string
  /** author of the content; enables Block and owner actions */
  authorId?: string | null
  authorName?: string | null
}>()
const emit = defineEmits<{ edit: [], delete: [] }>()

const { t } = useI18n()
const { user, requireAuth } = useAuth()
const { isBlocked, setBlocked, load } = useBlocks()
const { notify } = useNotify()

const menuOpen = ref(false)
const reportOpen = ref(false)
const reason = ref<string | null>(null)
const details = ref('')
const busy = ref(false)
const REASONS = ['spam', 'sale', 'abuse', 'nsfw', 'minor', 'personal', 'other'] as const

const mine = computed(() => !!user.value && user.value.id === props.authorId)
const name = computed(() => props.authorName ?? '')

function openMenu() {
  load()
  menuOpen.value = true
}

function startReport() {
  menuOpen.value = false
  if (!requireAuth()) return
  reason.value = null
  details.value = ''
  reportOpen.value = true
}

async function sendReport() {
  if (!reason.value || !user.value) return
  busy.value = true
  const { error } = await useSupabase().from('reports').insert({
    reporter_id: user.value.id,
    target_type: props.targetType,
    target_id: props.targetId,
    reason: reason.value,
    details: details.value.trim() || null
  })
  busy.value = false
  reportOpen.value = false
  notify(error?.code === '23505' ? t('report.already') : t('report.sent'), { tone: error && error.code !== '23505' ? 'error' : 'success' })
}

async function toggleBlock() {
  menuOpen.value = false
  if (!props.authorId || !requireAuth()) return
  const on = !isBlocked(props.authorId)
  await setBlocked(props.authorId, on)
  notify(t(on ? 'report.blocked' : 'report.unblocked', { name: name.value }))
}
</script>

<template>
  <button
    type="button"
    class="icon-btn more-btn"
    :aria-label="t('report.more')"
    @click.stop="openMenu"
  >
    <UIcon name="i-tabler-dots" />
  </button>

  <BottomSheet v-model:open="menuOpen">
    <div class="menu">
      <template v-if="mine">
        <button
          type="button"
          class="menu-item"
          @click="menuOpen = false; emit('edit')"
        >
          <UIcon name="i-tabler-pencil" />{{ t('report.edit') }}
        </button>
        <button
          type="button"
          class="menu-item danger"
          @click="menuOpen = false; emit('delete')"
        >
          <UIcon name="i-tabler-trash" />{{ t('report.delete') }}
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="menu-item"
          @click="startReport"
        >
          <UIcon name="i-tabler-flag" />{{ t('report.report') }}
        </button>
        <button
          v-if="authorId"
          type="button"
          class="menu-item"
          @click="toggleBlock"
        >
          <UIcon name="i-tabler-ban" />{{ t(isBlocked(authorId) ? 'report.unblock' : 'report.block', { name }) }}
        </button>
      </template>
    </div>
  </BottomSheet>

  <BottomSheet
    v-model:open="reportOpen"
    :title="t('report.title')"
  >
    <form
      class="form-stack"
      @submit.prevent="sendReport"
    >
      <p class="muted">
        {{ t('report.why') }}
      </p>
      <div
        class="reasons"
        role="radiogroup"
      >
        <button
          v-for="r in REASONS"
          :key="r"
          type="button"
          role="radio"
          class="chip"
          :aria-checked="reason === r"
          :class="{ active: reason === r }"
          @click="reason = r"
        >
          {{ t(`report.reasons.${r}`) }}
        </button>
      </div>
      <label class="field">
        <span class="field-label">{{ t('report.details') }}</span>
        <textarea
          v-model="details"
          class="input"
          maxlength="500"
          rows="3"
        />
      </label>
      <button
        type="submit"
        class="btn btn-danger btn-block"
        :disabled="!reason || busy"
      >
        {{ t('report.send') }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.more-btn {
  width: 44px;
  height: 44px;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--text-3);
}

.menu {
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 0 4px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  font-size: 16px;
  text-align: left;
}

.menu-item:last-child {
  border-bottom: 0;
}

.menu-item .iconify {
  font-size: 20px;
  color: var(--text-2);
}

.menu-item.danger,
.menu-item.danger .iconify {
  color: #ff9aa3;
}

.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
