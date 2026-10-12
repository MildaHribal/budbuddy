<script setup lang="ts">
import { mediaPaths } from '~/composables/useModeration'
import { challengePhase, challengeTitle, dayBoundary, defaultChallengeDates, localDateISO, slugify, type Challenge } from '~/utils/challenge'

const { t } = useI18n()
const { notify } = useNotify()
const { confirm } = useConfirm()
const sb = useSupabase()

const items = ref<(Challenge & { entries: number })[]>([])
const loading = ref(true)
const failed = ref(false)
/** title_cs/description_cs exist once the wave-2 migration is live */
const hasCs = computed(() => items.value.some(c => 'title_cs' in c))

async function load() {
  loading.value = true
  failed.value = false
  const { data, error } = await sb.from('challenges').select('*, challenge_entries(count)').order('starts_at', { ascending: false }).limit(60)
  loading.value = false
  if (error) {
    failed.value = true
    return
  }
  items.value = ((data ?? []) as (Challenge & { challenge_entries: { count: number }[] })[])
    .map(({ challenge_entries, ...c }) => ({ ...c, entries: challenge_entries?.[0]?.count ?? 0 }))
}

onMounted(load)

const open = ref(false)
const editing = ref<Challenge | null>(null)
const form = reactive({ slug: '', title: '', description: '', titleCs: '', descriptionCs: '', cover: null as string | null, starts: '', ends: '', votingEnds: '' })
const slugTouched = ref(false)
const coverFile = shallowRef<File | null>(null)
const coverPreview = ref<string | null>(null)
const saving = ref(false)
const err = ref<string | null>(null)

function setCoverFile(f: File | null) {
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
  coverFile.value = f
  coverPreview.value = f ? URL.createObjectURL(f) : null
}
onBeforeUnmount(() => setCoverFile(null))

function startNew() {
  const d = defaultChallengeDates()
  editing.value = null
  Object.assign(form, { slug: '', title: '', description: '', titleCs: '', descriptionCs: '', cover: null, starts: d.starts, ends: d.ends, votingEnds: d.votingEnds })
  slugTouched.value = false
  setCoverFile(null)
  err.value = null
  open.value = true
}

function startEdit(c: Challenge) {
  editing.value = c
  Object.assign(form, {
    slug: c.slug,
    title: c.title,
    description: c.description,
    titleCs: c.title_cs ?? '',
    descriptionCs: c.description_cs ?? '',
    cover: c.cover_url,
    starts: localDateISO(new Date(c.starts_at)),
    ends: localDateISO(new Date(c.ends_at)),
    votingEnds: localDateISO(new Date(c.voting_ends_at))
  })
  slugTouched.value = true
  setCoverFile(null)
  err.value = null
  open.value = true
}

watch(() => form.title, (v) => {
  if (slugTouched.value || editing.value) return
  const base = slugify(v)
  form.slug = base ? `${base}-${form.starts.slice(0, 7)}` : ''
})

async function pickCover() {
  const f = await pickImage()
  if (f) setCoverFile(f)
}

function removeCover() {
  setCoverFile(null)
  form.cover = null
}

async function save() {
  err.value = null
  const slug = slugify(form.slug)
  const starts = dayBoundary(form.starts)
  const ends = dayBoundary(form.ends, true)
  const votingEnds = dayBoundary(form.votingEnds, true)
  if (!slug || !form.title.trim()) return
  if (!(starts < ends && ends <= votingEnds)) {
    err.value = t('admin.challenges.invalidDates')
    return
  }
  saving.value = true
  try {
    const cover_url = coverFile.value ? await uploadChallengeImage(coverFile.value, 'cover-') : form.cover
    const cs: Record<string, string | null> = hasCs.value ? { title_cs: form.titleCs.trim() || null, description_cs: form.descriptionCs.trim() || null } : {}
    const row: Record<string, string | null> = { slug, title: form.title.trim(), description: form.description.trim(), ...cs, cover_url, starts_at: starts, ends_at: ends, voting_ends_at: votingEnds }
    const { error } = editing.value
      ? await sb.from('challenges').update(row).eq('id', editing.value.id)
      : await sb.from('challenges').insert(row)
    if (error) {
      err.value = error.code === '23505' ? t('admin.challenges.slugTaken') : t('admin.failed')
      return
    }
    open.value = false
    notify(t('admin.challenges.saved'))
    load()
  } catch {
    err.value = t('admin.failed')
  } finally {
    saving.value = false
  }
}

async function remove(c: Challenge) {
  if (!(await confirm({ title: t('admin.challenges.deleteConfirm'), message: t('admin.challenges.deleteText'), confirmLabel: t('common.delete'), danger: true }))) return
  const { data: entries } = await sb.from('challenge_entries').select('image_url').eq('challenge_id', c.id)
  const { error } = await sb.from('challenges').delete().eq('id', c.id)
  if (error) return notify(t('admin.failed'), { tone: 'error' })
  // the cover and entry photos would be orphaned otherwise
  const paths = mediaPaths({ cover: c.cover_url, images: (entries ?? []).map(e => e.image_url as string) })
  if (paths.length) sb.storage.from('media').remove(paths).catch(() => {})
  items.value = items.value.filter(x => x.id !== c.id)
  open.value = false
  notify(t('admin.challenges.deleted'), { tone: 'info' })
}

const finalizing = ref(false)
async function finalize(c: Challenge) {
  if (!(await confirm({ title: t('admin.challenges.finalizeConfirm'), message: t('admin.challenges.finalizeConfirmText'), confirmLabel: t('admin.challenges.finalize') }))) return
  finalizing.value = true
  const { error } = await sb.rpc('finalize_challenge', { challenge: c.id })
  finalizing.value = false
  if (!error) {
    c.finalized_at = new Date().toISOString()
    load()
    return notify(t('admin.challenges.finalized'))
  }
  if (isMissingSchema(error)) return notify(t('admin.challenges.finalizeUnavailable'), { tone: 'error' })
  notify(/not (yet )?(ended|finished)|still open|voting/i.test(error.message) ? t('admin.challenges.finalizeTooEarly') : t('admin.failed'), { tone: 'error' })
}

const range = (c: Challenge) => {
  const f = new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short' })
  return `${f.format(new Date(c.starts_at))} – ${f.format(new Date(c.ends_at))} · ${f.format(new Date(c.voting_ends_at))}`
}
const coverShown = computed(() => coverPreview.value ?? form.cover)
</script>

<template>
  <div class="stack">
    <button
      type="button"
      class="btn btn-primary btn-block"
      @click="startNew"
    >
      <UIcon name="i-tabler-plus" />{{ t('admin.challenges.new') }}
    </button>

    <template v-if="loading">
      <div
        v-for="i in 2"
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
      icon="lamp"
      :title="t('admin.challenges.empty')"
      :text="t('admin.challenges.emptyText')"
    />
    <ul
      v-else
      class="list rise"
    >
      <li
        v-for="c in items"
        :key="c.id"
      >
        <button
          type="button"
          class="item card row"
          @click="startEdit(c)"
        >
          <img
            v-if="c.cover_url"
            :src="c.cover_url"
            alt=""
            class="row-cover"
          >
          <span class="row-body">
            <span class="row-top">
              <ChallengePhaseBadge :phase="challengePhase(c)" />
              <span class="section-meta">{{ t('admin.challenges.entries', { n: c.entries }) }}</span>
            </span>
            <span class="row-title">{{ challengeTitle(c) }}</span>
            <span class="row-meta num">/{{ c.slug }} · {{ range(c) }}</span>
          </span>
          <UIcon
            name="i-tabler-pencil"
            class="row-icon"
          />
        </button>
      </li>
    </ul>

    <BottomSheet
      v-model:open="open"
      :title="editing ? t('admin.challenges.editTitle') : t('admin.challenges.newTitle')"
      icon="lamp"
      icon-color="var(--lamp)"
    >
      <form
        class="form-stack"
        @submit.prevent="save"
      >
        <label class="field">
          <span class="field-label">{{ t('admin.challenges.title') }}</span>
          <input
            v-model="form.title"
            class="input"
            maxlength="80"
            required
            lang="en"
          >
        </label>
        <label class="field">
          <span class="field-label">{{ t('admin.challenges.slug') }}</span>
          <input
            v-model="form.slug"
            class="input"
            maxlength="60"
            required
            autocapitalize="off"
            spellcheck="false"
            @input="slugTouched = true"
          >
          <span class="field-hint">{{ t('admin.challenges.slugHint') }}</span>
        </label>
        <label class="field">
          <span class="field-label">{{ t('admin.challenges.description') }}</span>
          <textarea
            v-model="form.description"
            class="input"
            maxlength="1000"
            rows="3"
            lang="en"
          />
        </label>
        <template v-if="hasCs">
          <label class="field">
            <span class="field-label">{{ t('admin.challenges.titleCs') }}</span>
            <input
              v-model="form.titleCs"
              class="input"
              maxlength="80"
              lang="cs"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ t('admin.challenges.descriptionCs') }}</span>
            <textarea
              v-model="form.descriptionCs"
              class="input"
              maxlength="1000"
              rows="3"
              lang="cs"
            />
          </label>
        </template>
        <div class="field">
          <span class="field-label">{{ t('admin.challenges.cover') }}</span>
          <div class="cover-row">
            <img
              v-if="coverShown"
              :src="coverShown"
              alt=""
              class="cover-thumb"
            >
            <button
              type="button"
              class="btn"
              @click="pickCover"
            >
              <UIcon name="i-tabler-photo-up" />{{ coverShown ? t('admin.challenges.changeCover') : t('admin.challenges.pickCover') }}
            </button>
            <button
              v-if="coverShown"
              type="button"
              class="btn btn-ghost"
              @click="removeCover"
            >
              {{ t('admin.challenges.removeCover') }}
            </button>
          </div>
        </div>
        <div class="form-grid">
          <label class="field">
            <span class="field-label">{{ t('admin.challenges.starts') }}</span>
            <input
              v-model="form.starts"
              type="date"
              class="input"
              required
            >
          </label>
          <label class="field">
            <span class="field-label">{{ t('admin.challenges.ends') }}</span>
            <input
              v-model="form.ends"
              type="date"
              class="input"
              required
            >
          </label>
          <label class="field">
            <span class="field-label">{{ t('admin.challenges.votingEnds') }}</span>
            <input
              v-model="form.votingEnds"
              type="date"
              class="input"
              required
            >
          </label>
        </div>
        <p class="field-hint">
          {{ t('admin.challenges.datesHint') }}
        </p>
        <p
          v-if="err"
          class="field-error"
          role="alert"
        >
          {{ err }}
        </p>
        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="saving"
        >
          {{ t('common.save') }}
        </button>
        <p
          v-if="editing?.finalized_at"
          class="field-hint"
        >
          {{ t('admin.challenges.finalizedOn', { date: formatDate(editing.finalized_at.slice(0, 10)) }) }}
        </p>
        <div
          v-else-if="editing && challengePhase(editing) === 'finished'"
          class="finalize"
        >
          <button
            type="button"
            class="btn btn-lamp btn-block"
            :disabled="finalizing"
            @click="finalize(editing)"
          >
            <UIcon name="i-tabler-trophy" />{{ t('admin.challenges.finalize') }}
          </button>
          <p class="field-hint">
            {{ t('admin.challenges.finalizeText') }}
          </p>
        </div>
        <button
          v-if="editing"
          type="button"
          class="btn btn-danger btn-block"
          :disabled="saving"
          @click="remove(editing)"
        >
          <UIcon name="i-tabler-trash" />{{ t('common.delete') }}
        </button>
      </form>
    </BottomSheet>
  </div>
</template>

<style scoped>
.finalize {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
}

.row {
  flex-direction: row;
  align-items: center;
  width: 100%;
  text-align: left;
  color: inherit;
}

.row-cover {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 12px;
}

.row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.row-title {
  font-size: 15px;
  font-weight: 600;
}

.row-meta {
  font-size: 12px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-icon {
  flex-shrink: 0;
  color: var(--text-3);
  font-size: 18px;
}

.cover-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.cover-thumb {
  width: 64px;
  height: 48px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
}
</style>
