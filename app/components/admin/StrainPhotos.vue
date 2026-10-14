<script setup lang="ts">
import { REJECT_REASON_MAX } from '~/utils/strainPhotos'

interface PendingPhoto {
  id: string
  kind: 'plant' | 'bud'
  url: string
  thumb_url: string | null
  consent_training: boolean
  created_at: string
  strain: { slug: string, name: string, original_breeder?: boolean } | null
  uploader: { username: string, display_name: string | null } | null
}

const { t } = useI18n()
const { notify } = useNotify()
const sb = useSupabase()

const items = ref<PendingPhoto[]>([])
const loading = ref(true)
const failed = ref(false)
const busy = ref<string | null>(null)
const COLS = 'id, kind, url, thumb_url, consent_training, created_at, strain:strains(slug, name, original_breeder), uploader:profiles!strain_photos_user_id_fkey(username, display_name)'

async function load() {
  loading.value = true
  failed.value = false
  const { data, error } = await sb.from('strain_photos').select(COLS)
    .eq('status', 'pending').not('user_id', 'is', null)
    .order('created_at').limit(50)
  loading.value = false
  if (error) failed.value = true
  else items.value = (data ?? []) as unknown as PendingPhoto[]
}

onActivated(load)

async function review(p: PendingPhoto, status: 'approved' | 'rejected', reason: string | null = null) {
  busy.value = p.id
  const { error } = await sb.from('strain_photos').update({ status, reject_reason: reason }).eq('id', p.id)
  busy.value = null
  if (error) {
    notify(t('admin.failed'), { tone: 'error' })
    return false
  }
  items.value = items.value.filter(x => x.id !== p.id)
  notify(t(status === 'approved' ? 'admin.photos.approved' : 'admin.photos.rejected'))
  return true
}

const rejectOpen = ref(false)
const rejecting = ref<PendingPhoto | null>(null)
const reason = ref('')

function startReject(p: PendingPhoto) {
  rejecting.value = p
  reason.value = ''
  rejectOpen.value = true
}

async function confirmReject() {
  const p = rejecting.value
  if (!p) return
  if (await review(p, 'rejected', reason.value.trim().slice(0, REJECT_REASON_MAX) || null)) rejectOpen.value = false
}

const when = (iso: string) => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const uploaderName = (p: PendingPhoto) => p.uploader?.display_name || p.uploader?.username || '?'
</script>

<template>
  <div class="stack">
    <template v-if="loading">
      <div
        v-for="i in 2"
        :key="i"
        class="sk"
      />
      <span class="sr-only">{{ t('common.loading') }}</span>
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
      icon="flowering"
      :title="t('admin.photos.empty')"
      :text="t('admin.photos.emptyText')"
    />
    <template v-else>
      <p class="queue-meta num">
        {{ t('admin.photos.count', { n: items.length }) }}
      </p>
      <ul class="list rise">
        <li
          v-for="p in items"
          :key="p.id"
          class="item"
          :class="{ busy: busy === p.id }"
        >
          <a
            :href="p.url"
            target="_blank"
            rel="noopener noreferrer"
            class="shot"
            :aria-label="t('admin.photos.openFull')"
          >
            <img
              :src="p.url"
              :alt="t('admin.photos.alt', { strain: p.strain?.name ?? '?' })"
              loading="lazy"
            >
          </a>
          <div class="facts">
            <p class="strain">
              <NuxtLink
                v-if="p.strain"
                :to="`/strains/${p.strain.slug}`"
                class="link"
              >{{ p.strain.name }}</NuxtLink>
              <span
                v-else
                class="muted"
              >?</span>
              <span class="badge kind">{{ t(`strains.photoKind.${p.kind}`) }}</span>
            </p>
            <p class="by">
              <NuxtLink
                v-if="p.uploader"
                :to="`/u/${p.uploader.username}`"
                class="link"
              >{{ uploaderName(p) }} · @{{ p.uploader.username }}</NuxtLink>
              · <time
                :datetime="p.created_at"
                class="num"
              >{{ when(p.created_at) }}</time>
            </p>
            <p class="training">
              <UIcon :name="p.consent_training ? 'i-tabler-check' : 'i-tabler-minus'" />
              <span>{{ p.consent_training ? t('admin.photos.trainingYes') : t('admin.photos.trainingNo') }}</span>
            </p>
            <p
              v-if="p.strain?.original_breeder"
              class="training"
            >
              <UIcon name="i-tabler-info-circle" />
              <span>{{ t('admin.photos.breederStrain') }}</span>
            </p>
          </div>
          <div class="actions">
            <button
              type="button"
              class="btn btn-soft"
              :disabled="busy === p.id"
              @click="review(p, 'approved')"
            >
              <UIcon name="i-tabler-check" />{{ t('admin.photos.approve') }}
            </button>
            <button
              type="button"
              class="btn btn-danger"
              :disabled="busy === p.id"
              @click="startReject(p)"
            >
              <UIcon name="i-tabler-x" />{{ t('admin.photos.reject') }}
            </button>
          </div>
        </li>
      </ul>
    </template>

    <BottomSheet
      v-model:open="rejectOpen"
      :title="t('admin.photos.rejectTitle')"
    >
      <form
        id="photo-reject"
        class="form-stack"
        @submit.prevent="confirmReject"
      >
        <p class="muted reject-intro">
          {{ t('admin.photos.rejectText') }}
        </p>
        <label class="field">
          <span class="field-label">{{ t('admin.photos.reason') }}</span>
          <textarea
            v-model="reason"
            class="input"
            :maxlength="REJECT_REASON_MAX"
            rows="3"
            :placeholder="t('admin.photos.reasonPh')"
          />
          <span class="field-hint num">{{ reason.length }} / {{ REJECT_REASON_MAX }}</span>
        </label>
      </form>
      <template #footer>
        <button
          type="submit"
          form="photo-reject"
          class="btn btn-danger"
          :disabled="!!busy"
        >
          {{ t('admin.photos.rejectSend') }}
        </button>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
.queue-meta {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}

.shot {
  display: block;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-2);
}

.shot img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.facts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.facts p {
  margin: 0;
}

.strain {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.strain .link {
  font-size: 16px;
}

.kind {
  color: var(--text-2);
  background: var(--surface-2);
}

.by,
.training {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  color: var(--text-2);
  font-size: 13px;
}

.training {
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.4;
}

.training .iconify {
  flex-shrink: 0;
  margin-top: 2px;
}

.by .link {
  font-size: 13px;
}

.reject-intro {
  margin: 0;
  font-size: 14px;
}
</style>
