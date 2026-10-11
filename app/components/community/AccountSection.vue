<script setup lang="ts">
import { compressImage } from '~/utils/image'
import { createId } from '~/utils/id'
import type { Profile } from '~/composables/useAuth'

const { t } = useI18n()
const { session, user, profile, accepted, signInPrompt, signOut, loadProfile } = useAuth()
const { notify } = useNotify()
const { confirm } = useConfirm()

const name = computed(() => profile.value?.display_name || profile.value?.username || '')

// ── Edit profile ──────────────────────────────────────────────────
const EXPERIENCE = ['beginner', 'intermediate', 'advanced', 'expert'] as const
const ENVIRONMENTS = ['indoor', 'outdoor', 'greenhouse'] as const
const MEDIA = ['soil', 'coco', 'hydro', 'other'] as const

const editOpen = ref(false)
const saving = ref(false)
const uploading = ref(false)
const form = reactive({
  display_name: '',
  bio: '',
  experience: 'beginner' as Profile['experience'],
  environments: [] as string[],
  media: [] as string[],
  favorite_strain: '',
  avatar_url: null as string | null
})

function openEdit() {
  const p = profile.value
  if (!p) return
  Object.assign(form, {
    display_name: p.display_name ?? '',
    bio: p.bio ?? '',
    experience: p.experience,
    environments: [...p.environments],
    media: [...p.media],
    favorite_strain: p.favorite_strain ?? '',
    avatar_url: p.avatar_url
  })
  editOpen.value = true
}

function toggle(list: string[], value: string) {
  const i = list.indexOf(value)
  if (i === -1) list.push(value)
  else list.splice(i, 1)
}

const MEDIA_MARK = '/object/public/media/'
const ownPath = (url: string | null) => {
  const uid = session.value?.user.id
  if (!url || !uid) return null
  const i = url.indexOf(MEDIA_MARK)
  const path = i < 0 ? null : decodeURIComponent(url.slice(i + MEDIA_MARK.length))
  return path?.startsWith(`${uid}/avatar/`) ? path : null
}

async function changeAvatar() {
  const uid = session.value?.user.id
  if (!uid) return
  const file = await pickImage()
  if (!file) return
  uploading.value = true
  try {
    const blob = await compressImage(file, 512, 0.85)
    const path = `${uid}/avatar/${createId()}.jpg`
    const sb = useSupabase()
    const { error } = await sb.storage.from('media').upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000' })
    if (error) throw error
    const previous = ownPath(form.avatar_url)
    form.avatar_url = sb.storage.from('media').getPublicUrl(path).data.publicUrl
    // persist right away so the old file can go
    const { error: upd } = await sb.from('profiles').update({ avatar_url: form.avatar_url }).eq('id', uid)
    if (upd) throw upd
    if (previous) sb.storage.from('media').remove([previous]).catch(() => {})
    await loadProfile()
  } catch (e) {
    console.error(e)
    notify(t('auth.profile.avatarFailed'), { tone: 'error' })
  } finally {
    uploading.value = false
  }
}

async function saveProfile() {
  const uid = session.value?.user.id
  if (!uid) return
  saving.value = true
  const { error } = await useSupabase().from('profiles').update({
    display_name: form.display_name.trim().slice(0, 40) || null,
    bio: form.bio.trim().slice(0, 300) || null,
    experience: form.experience,
    environments: form.environments,
    media: form.media,
    favorite_strain: form.favorite_strain.trim().slice(0, 60) || null,
    avatar_url: form.avatar_url
  }).eq('id', uid)
  saving.value = false
  if (error) {
    console.error(error)
    notify(t('auth.profile.failed'), { tone: 'error' })
    return
  }
  await loadProfile()
  editOpen.value = false
  notify(t('auth.profile.saved'))
}

// ── Sign out / delete ─────────────────────────────────────────────
async function doSignOut() {
  await signOut()
  notify(t('auth.account.signedOut'), { tone: 'info' })
}

// SQL can't delete storage rows, so empty the user's folder via the Storage API first
async function removeMyFiles(prefix = user.value?.id ?? ''): Promise<void> {
  if (!prefix) return
  const bucket = useSupabase().storage.from('media')
  const { data } = await bucket.list(prefix, { limit: 1000 })
  if (!data?.length) return
  const files = data.filter(f => f.id).map(f => `${prefix}/${f.name}`)
  if (files.length) await bucket.remove(files)
  for (const dir of data.filter(f => !f.id)) await removeMyFiles(`${prefix}/${dir.name}`)
}

const deleting = ref(false)
async function deleteAccount() {
  const first = await confirm({ title: t('auth.account.deleteTitle'), message: t('auth.account.deleteMessage'), confirmLabel: t('auth.account.delete'), danger: true })
  if (!first) return
  const second = await confirm({ title: t('auth.account.deleteAgainTitle'), message: t('auth.account.deleteAgainMessage'), confirmLabel: t('auth.account.deleteConfirm'), danger: true })
  if (!second) return
  deleting.value = true
  await removeMyFiles()
  const { error } = await useSupabase().rpc('delete_my_account')
  deleting.value = false
  if (error) {
    console.error(error)
    notify(t('auth.account.deleteFailed'), { tone: 'error' })
    return
  }
  usePlantSharing().forgetAll()
  await signOut()
  notify(t('auth.account.deleted'), { tone: 'info' })
}
</script>

<template>
  <section aria-labelledby="h-account">
    <div class="section-head">
      <h2
        id="h-account"
        class="section-title"
      >
        {{ t('auth.account.title') }}
      </h2>
    </div>

    <div
      v-if="!session"
      class="card pad signed-out"
    >
      <GrowIcon
        name="community"
        class="so-glyph"
      />
      <div class="so-text">
        <strong>{{ t('auth.account.signedOutTitle') }}</strong>
        <span>{{ t('auth.account.signedOutText') }}</span>
      </div>
      <button
        type="button"
        class="btn btn-primary btn-block"
        @click="signInPrompt = true"
      >
        {{ t('auth.account.signIn') }}
      </button>
    </div>

    <div
      v-else
      class="card list"
    >
      <div class="who">
        <CommunityUserAvatar
          :url="profile?.avatar_url"
          :name="name"
          :size="56"
        />
        <div class="who-text">
          <strong>{{ name }}</strong>
          <span v-if="profile">@{{ profile.username }} · <span class="num">{{ t('auth.account.reputation', { n: profile.reputation }) }}</span></span>
        </div>
      </div>
      <button
        v-if="profile && !accepted"
        type="button"
        class="row attention"
        @click="signInPrompt = true"
      >
        <span class="row-text">
          <strong>{{ t('auth.account.finish') }}</strong>
          <span>{{ t('auth.account.finishHint') }}</span>
        </span>
        <UIcon
          name="i-tabler-chevron-right"
          class="size-5 trail"
        />
      </button>
      <button
        type="button"
        class="row"
        :disabled="!profile"
        @click="openEdit"
      >
        <span class="row-text">
          <strong>{{ t('auth.account.editProfile') }}</strong>
          <span>{{ t('auth.account.editProfileHint') }}</span>
        </span>
        <UIcon
          name="i-tabler-pencil"
          class="size-5 trail"
        />
      </button>
      <button
        type="button"
        class="row"
        @click="doSignOut"
      >
        <span class="row-text">
          <strong>{{ t('auth.account.signOut') }}</strong>
          <span>{{ t('auth.account.signOutHint') }}</span>
        </span>
        <UIcon
          name="i-tabler-logout"
          class="size-5 trail"
        />
      </button>
      <button
        type="button"
        class="row danger"
        :disabled="deleting"
        @click="deleteAccount"
      >
        <span class="row-text">
          <strong>{{ t('auth.account.delete') }}</strong>
          <span>{{ t('auth.account.deleteHint') }}</span>
        </span>
        <UIcon
          :name="deleting ? 'i-tabler-loader-2' : 'i-tabler-user-x'"
          class="size-5 trail"
          :class="{ 'animate-spin': deleting }"
        />
      </button>
    </div>

    <BottomSheet
      v-model:open="editOpen"
      :title="t('auth.profile.title')"
    >
      <form
        id="profile-form"
        class="form-stack"
        @submit.prevent="saveProfile"
      >
        <div class="avatar-row">
          <CommunityUserAvatar
            :url="form.avatar_url"
            :name="form.display_name || profile?.username"
            :size="72"
          />
          <button
            type="button"
            class="btn btn-soft"
            :disabled="uploading"
            @click="changeAvatar"
          >
            <UIcon
              :name="uploading ? 'i-tabler-loader-2' : 'i-tabler-camera'"
              class="size-5"
              :class="{ 'animate-spin': uploading }"
            />
            {{ t('auth.profile.avatar') }}
          </button>
        </div>

        <div class="field">
          <label
            class="field-label"
            for="pf-name"
          >{{ t('auth.profile.displayName') }}</label>
          <input
            id="pf-name"
            v-model="form.display_name"
            class="input"
            maxlength="40"
            autocomplete="nickname"
          >
        </div>

        <div class="field">
          <label
            class="field-label"
            for="pf-bio"
          >{{ t('auth.profile.bio') }}</label>
          <textarea
            id="pf-bio"
            v-model="form.bio"
            class="input"
            rows="3"
            maxlength="300"
            lang="en"
            aria-describedby="pf-bio-hint"
          />
          <span
            id="pf-bio-hint"
            class="field-hint"
          >{{ t('auth.profile.bioHint') }} <span class="num">{{ form.bio.length }}/300</span></span>
        </div>

        <fieldset class="field">
          <legend class="field-label">
            {{ t('auth.profile.experience') }}
          </legend>
          <div class="wrap-chips">
            <button
              v-for="lvl in EXPERIENCE"
              :key="lvl"
              type="button"
              class="chip"
              :aria-pressed="form.experience === lvl"
              @click="form.experience = lvl"
            >
              {{ t(`auth.profile.levels.${lvl}`) }}
            </button>
          </div>
        </fieldset>

        <fieldset class="field">
          <legend class="field-label">
            {{ t('auth.profile.environments') }}
          </legend>
          <div class="wrap-chips">
            <button
              v-for="env in ENVIRONMENTS"
              :key="env"
              type="button"
              class="chip"
              :aria-pressed="form.environments.includes(env)"
              @click="toggle(form.environments, env)"
            >
              {{ t(`auth.profile.env.${env}`) }}
            </button>
          </div>
        </fieldset>

        <fieldset class="field">
          <legend class="field-label">
            {{ t('auth.profile.media') }}
          </legend>
          <div class="wrap-chips">
            <button
              v-for="m in MEDIA"
              :key="m"
              type="button"
              class="chip"
              :aria-pressed="form.media.includes(m)"
              @click="toggle(form.media, m)"
            >
              {{ t(`auth.profile.medium.${m}`) }}
            </button>
          </div>
        </fieldset>

        <div class="field">
          <label
            class="field-label"
            for="pf-strain"
          >{{ t('auth.profile.favoriteStrain') }}</label>
          <input
            id="pf-strain"
            v-model="form.favorite_strain"
            class="input"
            maxlength="60"
          >
        </div>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn btn-ghost"
          @click="editOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="submit"
          form="profile-form"
          class="btn btn-primary"
          :disabled="saving || uploading"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>
  </section>
</template>

<style scoped>
.pad {
  padding: 16px;
}

.section-head {
  padding: 0 2px;
}

.signed-out {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: start;
}

.signed-out .btn {
  grid-column: 1 / -1;
}

.so-glyph {
  font-size: 30px;
  color: var(--leaf);
}

.so-text,
.who-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.so-text strong,
.who-text strong {
  font-size: 15px;
  font-weight: 600;
}

.so-text span,
.who-text > span {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-2);
}

.who-text strong,
.who-text > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list {
  overflow: hidden;
}

.who {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.row {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border: 0;
  border-top: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  text-align: left;
  transition: background var(--dur) var(--ease-out);
}

.row:active:not(:disabled) {
  background: var(--highlight);
}

.row:disabled {
  opacity: 0.5;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row-text strong {
  font-size: 15px;
  font-weight: 600;
}

.row-text span {
  font-size: 13px;
  color: var(--text-2);
}

.trail {
  flex-shrink: 0;
  color: var(--text-3);
}

.row.attention strong,
.row.attention .trail {
  color: var(--lamp);
}

.row.danger strong,
.row.danger .trail {
  color: #ff9aa3;
}

.row.danger:active {
  background: var(--danger-soft);
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

legend {
  padding: 0;
  margin-bottom: 8px;
}

.wrap-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wrap-chips .chip {
  min-height: 44px;
}
</style>
