<script setup lang="ts">
import { slugify } from '~/utils/challenge'

interface Strain {
  id: string
  slug: string
  name: string
  breeder: string | null
  dominance: 'indica' | 'sativa' | 'hybrid' | null
  flowering: 'auto' | 'photo' | null
  flowering_weeks_min: number | null
  flowering_weeks_max: number | null
  description: string | null
  description_cs?: string | null
  image_url: string | null
  created_at: string
  author: { username: string } | null
}

const { t } = useI18n()
const { notify } = useNotify()
const { confirm } = useConfirm()
const sb = useSupabase()

const items = ref<Strain[]>([])
const loading = ref(true)
const failed = ref(false)
const busy = ref<string | null>(null)
const hasCs = ref(true)
const COLS = 'id, slug, name, breeder, dominance, flowering, flowering_weeks_min, flowering_weeks_max, description, image_url, created_at, author:profiles!strains_created_by_fkey(username)'

async function load() {
  loading.value = true
  failed.value = false
  const run = (cols: string) => sb.from('strains').select(cols).eq('approved', false).order('created_at').limit(100)
  let { data, error } = await run(hasCs.value ? `${COLS}, description_cs` : COLS)
  if (isMissingSchema(error)) {
    hasCs.value = false;
    ({ data, error } = await run(COLS))
  }
  loading.value = false
  if (error) failed.value = true
  else items.value = (data ?? []) as unknown as Strain[]
}

onMounted(load)

async function run(id: string, fn: () => Promise<{ error: unknown }>, done: string, removeFromList = true) {
  busy.value = id
  const { error } = await fn()
  busy.value = null
  if (error) return notify(t('admin.failed'), { tone: 'error' })
  if (removeFromList) items.value = items.value.filter(s => s.id !== id)
  notify(done)
}

const approve = (s: Strain) => run(s.id, async () => sb.from('strains').update({ approved: true }).eq('id', s.id), t('admin.strains.approved'))

async function remove(s: Strain) {
  if (!(await confirm({ title: t('admin.strains.deleteConfirm'), confirmLabel: t('common.delete'), danger: true }))) return
  await run(s.id, async () => sb.from('strains').delete().eq('id', s.id), t('admin.strains.deleted'))
}

const editOpen = ref(false)
const editing = ref<Strain | null>(null)
const form = reactive({ name: '', slug: '', breeder: '', dominance: '', flowering: '', min: '', max: '', description: '', descriptionCs: '' })
const saving = ref(false)

function edit(s: Strain) {
  editing.value = s
  Object.assign(form, {
    name: s.name,
    slug: s.slug,
    breeder: s.breeder ?? '',
    dominance: s.dominance ?? '',
    flowering: s.flowering ?? '',
    min: s.flowering_weeks_min?.toString() ?? '',
    max: s.flowering_weeks_max?.toString() ?? '',
    description: s.description ?? '',
    descriptionCs: s.description_cs ?? ''
  })
  editOpen.value = true
}

const num = (v: string) => (v.trim() ? Math.min(20, Math.max(4, Math.round(Number(v)))) : null)

async function save(approveToo: boolean) {
  const s = editing.value
  if (!s || form.name.trim().length < 2) return
  saving.value = true
  const patch = {
    name: form.name.trim(),
    slug: slugify(form.slug || form.name) || s.slug,
    breeder: form.breeder.trim() || null,
    dominance: form.dominance || null,
    flowering: form.flowering || null,
    flowering_weeks_min: num(form.min),
    flowering_weeks_max: num(form.max),
    description: form.description.trim() || null,
    ...(hasCs.value ? { description_cs: form.descriptionCs.trim() || null } : {}),
    ...(approveToo ? { approved: true } : {})
  }
  const { error } = await sb.from('strains').update(patch).eq('id', s.id)
  saving.value = false
  if (error) return notify(t('admin.failed'), { tone: 'error' })
  if (approveToo) items.value = items.value.filter(x => x.id !== s.id)
  else Object.assign(s, patch)
  editOpen.value = false
  notify(t(approveToo ? 'admin.strains.approved' : 'admin.strains.saved'))
}
</script>

<template>
  <div class="stack">
    <template v-if="loading">
      <div
        v-for="i in 3"
        :key="i"
        class="sk"
      />
    </template>
    <div
      v-else-if="failed"
      class="error card"
    >
      <p class="muted">
        {{ t('admin.loadError') }}
      </p>
      <button
        type="button"
        class="btn btn-soft"
        @click="load"
      >
        <UIcon name="i-tabler-refresh" />{{ t('admin.retry') }}
      </button>
    </div>
    <EmptyState
      v-else-if="!items.length"
      icon="seedling"
      :title="t('admin.strains.empty')"
      :text="t('admin.strains.emptyText')"
    />
    <ul
      v-else
      class="list rise"
    >
      <li
        v-for="s in items"
        :key="s.id"
        class="item"
        :class="{ busy: busy === s.id }"
      >
        <div class="strain">
          <p class="name">
            {{ s.name }}
          </p>
          <p class="facts">
            <span>{{ s.breeder || t('admin.strains.none') }}</span>
            <span v-if="s.dominance">{{ t(`admin.strains.dom.${s.dominance}`) }}</span>
            <span v-if="s.flowering">{{ t(`admin.strains.flow.${s.flowering}`) }}</span>
            <span
              v-if="s.flowering_weeks_min"
              class="num"
            >{{ t('admin.strains.weeksRange', { a: s.flowering_weeks_min, b: s.flowering_weeks_max ?? '?' }) }}</span>
          </p>
          <p
            v-if="s.description"
            class="desc"
          >
            {{ s.description }}
          </p>
          <p
            v-if="s.author"
            class="by"
          >
            {{ t('admin.strains.suggestedBy', { name: `@${s.author.username}` }) }}
          </p>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn btn-soft"
            :disabled="busy === s.id"
            @click="approve(s)"
          >
            <UIcon name="i-tabler-check" />{{ t('admin.strains.approve') }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="busy === s.id"
            @click="edit(s)"
          >
            <UIcon name="i-tabler-pencil" />{{ t('common.edit') }}
          </button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="busy === s.id"
            @click="remove(s)"
          >
            <UIcon name="i-tabler-trash" />{{ t('common.delete') }}
          </button>
        </div>
      </li>
    </ul>

    <BottomSheet
      v-model:open="editOpen"
      :title="t('admin.strains.editTitle')"
    >
      <form
        class="form-stack"
        @submit.prevent="save(false)"
      >
        <label class="field">
          <span class="field-label">{{ t('admin.strains.name') }}</span>
          <input
            v-model="form.name"
            class="input"
            maxlength="60"
            required
          >
        </label>
        <label class="field">
          <span class="field-label">{{ t('admin.strains.slug') }}</span>
          <input
            v-model="form.slug"
            class="input"
            maxlength="60"
            pattern="[a-z0-9\-]{2,60}"
          >
        </label>
        <label class="field">
          <span class="field-label">{{ t('admin.strains.breeder') }}</span>
          <input
            v-model="form.breeder"
            class="input"
            maxlength="60"
          >
        </label>
        <div class="form-grid">
          <label class="field">
            <span class="field-label">{{ t('admin.strains.dominance') }}</span>
            <select
              v-model="form.dominance"
              class="input"
            >
              <option value="">{{ t('admin.strains.none') }}</option>
              <option
                v-for="d in ['indica', 'sativa', 'hybrid']"
                :key="d"
                :value="d"
              >{{ t(`admin.strains.dom.${d}`) }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">{{ t('admin.strains.flowering') }}</span>
            <select
              v-model="form.flowering"
              class="input"
            >
              <option value="">{{ t('admin.strains.none') }}</option>
              <option
                v-for="f in ['auto', 'photo']"
                :key="f"
                :value="f"
              >{{ t(`admin.strains.flow.${f}`) }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">{{ t('admin.strains.weeksMin') }}</span>
            <input
              v-model="form.min"
              class="input"
              type="number"
              inputmode="numeric"
              min="4"
              max="20"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ t('admin.strains.weeksMax') }}</span>
            <input
              v-model="form.max"
              class="input"
              type="number"
              inputmode="numeric"
              min="4"
              max="20"
            >
          </label>
        </div>
        <label class="field">
          <span class="field-label">{{ t('admin.strains.description') }}</span>
          <textarea
            v-model="form.description"
            class="input"
            maxlength="1200"
            rows="4"
            lang="en"
          />
        </label>
        <label
          v-if="hasCs"
          class="field"
        >
          <span class="field-label">{{ t('admin.strains.descriptionCs') }}</span>
          <textarea
            v-model="form.descriptionCs"
            class="input"
            maxlength="1200"
            rows="4"
            lang="cs"
          />
        </label>
        <div class="sheet-actions">
          <button
            type="submit"
            class="btn"
            :disabled="saving"
          >
            {{ t('common.save') }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="saving"
            @click="save(true)"
          >
            {{ t('admin.strains.approve') }}
          </button>
        </div>
      </form>
    </BottomSheet>
  </div>
</template>

<style scoped>
.strain {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 0;
  font-size: 12px;
  color: var(--text-2);
}

.desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.by {
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}

.sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
