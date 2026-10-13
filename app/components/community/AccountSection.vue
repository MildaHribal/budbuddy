<script setup lang="ts">
import { compressImage } from '~/utils/image'
import { createId } from '~/utils/id'
import { contentBlockedKey, isMissingSchema } from '~/utils/dbErrors'
import { badgeGlyph, badgeName, MAX_PINNED, pinErrorKey, type BadgeDef } from '~/composables/useBadges'
import type { Profile } from '~/composables/useAuth'

const { t } = useI18n()
const { session, user, profile, accepted, signInPrompt, signOut, loadProfile } = useAuth()
const { notify } = useNotify()
const { confirm } = useConfirm()
const { loadCatalog, loadEarned } = useBadges()

const me = computed(() => profile.value)
const name = computed(() => profile.value?.display_name || profile.value?.username || '')
const banned = computed(() => !!profile.value?.is_banned)

// ── Edit profile ──────────────────────────────────────────────────
const EXPERIENCE = ['beginner', 'intermediate', 'advanced', 'expert'] as const
const ENVIRONMENTS = ['indoor', 'outdoor', 'greenhouse'] as const
const MEDIA = ['soil', 'coco', 'hydro', 'other'] as const
const LIGHTS = ['led', 'hps', 'cfl', 'sun', 'mixed'] as const

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
  avatar_url: null as string | null,
  first_grow: true,
  light_type: null as Profile['light_type'],
  space: '',
  pinned_badges: [] as string[]
})
/** wave-2 columns exist in the DB */
const extended = computed(() => !!me.value && 'first_grow' in me.value)
const earnedBadges = shallowRef<BadgeDef[]>([])

async function loadEarnedBadges() {
  const uid = user.value?.id
  if (!uid || !extended.value) return
  const [defs, earned] = await Promise.all([loadCatalog(), loadEarned(uid)])
  const ids = new Set(earned.map(e => e.badge_id))
  earnedBadges.value = defs.filter(d => ids.has(d.id))
}

function openEdit() {
  const p = me.value
  if (!p) return
  if (banned.value) {
    notify(t('profile.account.bannedEdit'), { tone: 'error' })
    return
  }
  Object.assign(form, {
    display_name: p.display_name ?? '',
    bio: p.bio ?? '',
    experience: p.experience,
    environments: [...p.environments],
    media: [...p.media],
    favorite_strain: p.favorite_strain ?? '',
    avatar_url: p.avatar_url,
    first_grow: p.first_grow ?? true,
    light_type: p.light_type ?? null,
    space: p.space ?? '',
    pinned_badges: [...(p.pinned_badges ?? [])]
  })
  editOpen.value = true
  loadEarnedBadges()
}

function toggle(list: string[], value: string) {
  const i = list.indexOf(value)
  if (i === -1) list.push(value)
  else list.splice(i, 1)
}

function togglePin(id: string) {
  if (!form.pinned_badges.includes(id) && form.pinned_badges.length >= MAX_PINNED) {
    notify(t('profile.badges.pinFull'), { tone: 'info' })
    return
  }
  toggle(form.pinned_badges, id)
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
  if (!uid || saving.value) return
  saving.value = true
  const base = {
    display_name: form.display_name.trim().slice(0, 40) || null,
    bio: form.bio.trim().slice(0, 300) || null,
    experience: form.experience,
    environments: form.environments,
    media: form.media,
    favorite_strain: form.favorite_strain.trim().slice(0, 60) || null,
    avatar_url: form.avatar_url
  }
  const extra = {
    first_grow: form.first_grow,
    light_type: form.light_type,
    space: form.space.trim().slice(0, 20) || null,
    pinned_badges: form.pinned_badges.slice(0, MAX_PINNED)
  }
  const sb = useSupabase()
  let { error } = await sb.from('profiles').update(extended.value ? { ...base, ...extra } : base).eq('id', uid)
  if (error && isMissingSchema(error)) ({ error } = await sb.from('profiles').update(base).eq('id', uid))
  saving.value = false
  if (error) {
    console.error(error)
    const blocked = contentBlockedKey(error)
    const pinErr = /pin badges/i.test(error.message ?? '') ? pinErrorKey(error.message) : null
    notify(blocked ? t(`profile.account.blocked.${blocked}`) : pinErr ? t(pinErr) : t('auth.profile.failed'), { tone: 'error' })
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

/** Every file path under the user's folder (paged, recursive). Throws on any list error. */
async function listMyFiles(prefix: string): Promise<string[]> {
  const bucket = useSupabase().storage.from('media')
  const out: string[] = []
  const LIMIT = 100
  for (let offset = 0; ; offset += LIMIT) {
    const { data, error } = await bucket.list(prefix, { limit: LIMIT, offset })
    if (error) throw error
    for (const f of data ?? []) {
      if (f.id) out.push(`${prefix}/${f.name}`)
      else out.push(...await listMyFiles(`${prefix}/${f.name}`))
    }
    if ((data?.length ?? 0) < LIMIT) return out
  }
}

// SQL can't delete storage objects, so the Storage API empties the folder before the RPC
async function removeMyFiles(uid: string) {
  const files = await listMyFiles(uid)
  const bucket = useSupabase().storage.from('media')
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await bucket.remove(files.slice(i, i + 100))
    if (error) throw error
  }
}

const deleting = ref(false)
async function deleteAccount() {
  const uid = user.value?.id
  if (!uid || deleting.value) return
  const first = await confirm({ title: t('auth.account.deleteTitle'), message: t('auth.account.deleteMessage'), confirmLabel: t('auth.account.delete'), danger: true })
  if (!first) return
  const second = await confirm({ title: t('auth.account.deleteAgainTitle'), message: t('auth.account.deleteAgainMessage'), confirmLabel: t('auth.account.deleteConfirm'), danger: true })
  if (!second) return
  if (!navigator.onLine) {
    notify(t('profile.account.deleteOffline'), { tone: 'error' })
    return
  }
  deleting.value = true
  try {
    // cheap authenticated round-trip first, so a dead session or network stops us before any file is touched
    const pre = await useSupabase().from('profiles').select('id').eq('id', uid).maybeSingle()
    if (pre.error) {
      notify(t('auth.account.deleteFailed'), { tone: 'error' })
      return
    }
    try {
      await removeMyFiles(uid)
    } catch (e) {
      console.error(e)
      notify(t('profile.account.deleteFilesFailed'), { tone: 'error' })
      return
    }
    const { error } = await useSupabase().rpc('delete_my_account')
    if (error) {
      console.error(error)
      notify(t('profile.account.deletePartial'), { tone: 'error' })
      return
    }
    usePlantSharing().forgetAll()
    await signOut(true)
    notify(t('auth.account.deleted'), { tone: 'info' })
  } finally {
    deleting.value = false
  }
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
          :size="48"
        />
        <div class="who-text">
          <strong>{{ name }}</strong>
          <span v-if="profile">@{{ profile.username }} · <span class="num">{{ t('auth.account.reputation', { n: profile.reputation }) }}</span></span>
        </div>
      </div>
      <div
        v-if="banned"
        class="banned"
        role="status"
      >
        <UIcon
          name="i-tabler-ban"
          class="size-5 banned-icon"
        />
        <span class="row-text">
          <strong>{{ t('profile.account.bannedTitle') }}</strong>
          <span>{{ t('profile.account.bannedText') }}</span>
          <a
            href="https://github.com/MildaHribal/budbuddy/issues"
            target="_blank"
            rel="noopener"
            class="link appeal"
          >{{ t('profile.account.appeal') }}</a>
        </span>
      </div>
      <button
        v-if="profile && !accepted && !banned"
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
        :disabled="!profile || banned"
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
    <a
      v-if="session"
      href="/delete-account.html"
      target="_blank"
      rel="noopener"
      class="delete-info"
    >
      <UIcon name="i-tabler-info-circle" /> {{ t('profile.account.deleteInfo') }}
    </a>

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

        <template v-if="extended">
          <button
            type="button"
            role="switch"
            class="switch-row"
            :aria-checked="form.first_grow"
            @click="form.first_grow = !form.first_grow"
          >
            <span class="switch-text">
              <span class="switch-label">{{ t('profile.account.firstGrow') }}</span>
              <span class="field-hint">{{ t('profile.account.firstGrowHint') }}</span>
            </span>
            <span
              class="switch"
              aria-hidden="true"
            />
          </button>

          <fieldset class="field">
            <legend class="field-label">
              {{ t('profile.account.lightType') }}
            </legend>
            <div class="wrap-chips">
              <button
                v-for="l in LIGHTS"
                :key="l"
                type="button"
                class="chip"
                :aria-pressed="form.light_type === l"
                @click="form.light_type = form.light_type === l ? null : l"
              >
                {{ t(`profile.light.${l}`) }}
              </button>
            </div>
          </fieldset>

          <div class="field">
            <label
              class="field-label"
              for="pf-space"
            >{{ t('profile.account.space') }}</label>
            <input
              id="pf-space"
              v-model="form.space"
              class="input"
              maxlength="20"
              :placeholder="t('profile.account.spacePlaceholder')"
            >
          </div>
        </template>

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

        <fieldset
          v-if="extended"
          class="field"
        >
          <legend class="field-label">
            {{ t('profile.account.pinned') }} <span class="num pin-count">{{ form.pinned_badges.length }}/3</span>
          </legend>
          <p class="field-hint pin-hint">
            {{ earnedBadges.length ? t('profile.account.pinnedHint') : t('profile.account.pinnedNone') }}
          </p>
          <div
            v-if="earnedBadges.length"
            class="wrap-chips"
          >
            <button
              v-for="b in earnedBadges"
              :key="b.id"
              type="button"
              class="chip pin-chip"
              :aria-pressed="form.pinned_badges.includes(b.id)"
              @click="togglePin(b.id)"
            >
              <CommunityBadgeMedal
                :glyph="badgeGlyph(b)"
                :tier="b.tier"
                :size="26"
              />
              {{ badgeName(b) }}
            </button>
          </div>
        </fieldset>
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

.signed-out {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.signed-out .btn {
  grid-column: 1 / -1;
}

.so-glyph {
  width: 44px;
  height: 44px;
  padding: 10px;
  border-radius: var(--radius-control);
  background: var(--accent-soft);
  color: var(--green);
}

.so-text,
.who-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  gap: 12px;
  min-height: 56px;
  padding: 12px 16px;
}

.row {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border: 0;
  border-top: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  text-align: left;
  transition: background var(--dur) ease;
}

.row:active:not(:disabled) {
  background: var(--surface-2);
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
  font-weight: 500;
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
  color: var(--green);
}

.row.danger strong,
.row.danger .trail {
  color: var(--red);
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

.pin-chip {
  padding-left: 8px;
}

.pin-count {
  margin-left: 6px;
  color: var(--text-3);
  font-weight: 500;
}

.pin-hint {
  margin: -2px 0 10px;
}

.banned {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--danger-soft);
}

.banned-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--red);
}

.banned .row-text span {
  line-height: 1.45;
}

.appeal {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 13px;
  font-weight: 600;
}

.delete-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 4px;
  font-size: 13px;
  color: var(--text-2);
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 48px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text);
  text-align: left;
}

.switch-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch-label {
  font-size: 15px;
  font-weight: 600;
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--well);
  transition: background var(--dur) ease, border-color var(--dur) ease;
}

.switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--text-3);
  transition: transform var(--dur) var(--ease-out), background var(--dur) ease;
}

.switch-row[aria-checked="true"] .switch {
  background: var(--green);
  border-color: var(--green);
}

.switch-row[aria-checked="true"] .switch::after {
  transform: translateX(22px);
  background: var(--on-accent);
}
</style>
