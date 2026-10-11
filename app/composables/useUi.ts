import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import { todayISO } from '~/utils/date'
import { haptic } from '~/utils/haptics'
import { compressImage } from '~/utils/image'
import { photoStore } from '~/utils/photoStore'

// ── Toasts ─────────────────────────────────────────────────────────

export interface Notice {
  id: number
  message: string
  icon?: string
  tone: 'success' | 'error' | 'info'
  action?: { label: string, run: () => void }
}

const notices = ref<Notice[]>([])
let noticeSeq = 0

export function useNotify() {
  function notify(message: string, opts: Partial<Omit<Notice, 'id' | 'message'>> & { duration?: number } = {}) {
    const id = ++noticeSeq
    haptic(opts.tone === 'error' ? 'warning' : 'success')
    notices.value.push({ id, message, tone: opts.tone ?? 'success', icon: opts.icon, action: opts.action })
    setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 5000 : 2600))
  }
  function dismiss(id: number) {
    notices.value = notices.value.filter(n => n.id !== id)
  }
  return { notices, notify, dismiss }
}

// ── Confirm dialog ─────────────────────────────────────────────────

export interface ConfirmRequest {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

const confirmRequest = shallowRef<ConfirmRequest | null>(null)

export function useConfirm() {
  function confirm(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
    confirmRequest.value?.resolve(false)
    return new Promise((resolve) => {
      confirmRequest.value = { ...opts, resolve }
    })
  }
  function answer(ok: boolean) {
    confirmRequest.value?.resolve(ok)
    confirmRequest.value = null
  }
  return { confirmRequest, confirm, answer }
}

// ── Back stack ─────────────────────────────────────────────────────
// Open sheets/lightboxes register a close handler so the Android back
// button and the Escape key close the top-most overlay instead of
// navigating away.

const backHandlers: (() => void)[] = []

export function useBackHandler(active: Ref<boolean>, close: () => void) {
  const handler = () => close()
  watch(active, (on) => {
    const i = backHandlers.indexOf(handler)
    if (on && i === -1) backHandlers.push(handler)
    if (!on && i !== -1) backHandlers.splice(i, 1)
  }, { immediate: true })
  onBeforeUnmount(() => {
    const i = backHandlers.indexOf(handler)
    if (i !== -1) backHandlers.splice(i, 1)
  })
}

/** Closes the top-most overlay. Returns false when nothing was open. */
export function popBackHandler(): boolean {
  const top = backHandlers[backHandlers.length - 1]
  if (!top) return false
  top()
  return true
}

// ── Today ──────────────────────────────────────────────────────────
// A reactive "today" that rolls over at midnight and when the app resumes,
// because Android keeps the WebView alive for days.

const today = ref(todayISO())
let todayTimer: ReturnType<typeof setInterval> | null = null

export function useToday() {
  if (!todayTimer && typeof window !== 'undefined') {
    const refresh = () => {
      const t = todayISO()
      if (t !== today.value) today.value = t
    }
    todayTimer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
  }
  return today
}

// ── Photos ─────────────────────────────────────────────────────────
// Object URLs are ref-counted; unused ones stay in a small LRU, older ones are revoked.

export type PhotoSize = 'thumb' | 'full'
export const THUMB_SUFFIX = ':t'
const THUMB_MAX = 480
const IDLE_URLS = 40

interface UrlEntry { url: Promise<string | null>, refs: number }
const urlCache = new Map<string, UrlEntry>()
let urlEpoch = 0

const revoke = (e: UrlEntry) => e.url.then(u => u?.startsWith('blob:') && URL.revokeObjectURL(u))

function trimIdle() {
  const idle = [...urlCache].filter(([, e]) => e.refs <= 0)
  for (const [key, e] of idle.slice(0, Math.max(0, idle.length - IDLE_URLS))) {
    urlCache.delete(key)
    revoke(e)
  }
}

/** Forget cached object URLs (after a restore / erase replaced the photo library). */
export function resetPhotoUrls() {
  urlEpoch++
  for (const e of urlCache.values()) revoke(e)
  urlCache.clear()
}

async function demoBlob(id: string): Promise<Blob | null> {
  const src = (await import('~/utils/demoPhotos')).demoPhotoUrl(id)
  if (!src) return null
  const res = await fetch(src)
  return res.ok ? res.blob() : null
}

async function fullBlob(id: string): Promise<Blob | null> {
  const photo = await photoStore.get(id).catch(() => undefined)
  if (photo) return photo.blob
  return id.startsWith('demo-') ? demoBlob(id) : null
}

// thumbnails decode full-size photos, so keep at most two in flight
let thumbJobs = 0
const thumbQueue: (() => void)[] = []
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (thumbJobs >= 2) await new Promise<void>(r => thumbQueue.push(r))
  thumbJobs++
  try {
    return await fn()
  } finally {
    thumbJobs--
    thumbQueue.shift()?.()
  }
}

async function thumbBlob(id: string): Promise<Blob | null> {
  const cached = await photoStore.get(id + THUMB_SUFFIX).catch(() => undefined)
  if (cached) return cached.blob
  const epoch = urlEpoch
  return limited(async () => {
    const full = await fullBlob(id)
    if (!full) return null
    try {
      const thumb = await compressImage(full, THUMB_MAX, 0.74)
      if (epoch === urlEpoch) photoStore.put({ id: id + THUMB_SUFFIX, blob: thumb, createdAt: new Date().toISOString() }).catch(() => {})
      return thumb
    } catch {
      return full
    }
  })
}

function acquire(id: string, size: PhotoSize): { key: string, url: Promise<string | null> } {
  const key = size === 'thumb' ? id + THUMB_SUFFIX : id
  let e = urlCache.get(key)
  if (!e) {
    const blob = size === 'thumb' ? thumbBlob(id) : fullBlob(id)
    e = { url: blob.then(b => (b ? URL.createObjectURL(b) : null)).catch(() => null), refs: 0 }
    urlCache.set(key, e)
  }
  e.refs++
  return { key, url: e.url }
}

function release(key: string) {
  const e = urlCache.get(key)
  if (!e) return
  e.refs--
  if (e.refs <= 0) {
    // most recently used goes to the end of the LRU
    urlCache.delete(key)
    urlCache.set(key, e)
    trimIdle()
  }
}

const isRemote = (id: string) => /^(https?:|blob:|data:)/.test(id)

/** One-off URL (not ref-counted); it stays valid while it sits in the LRU. */
export function photoUrl(id: string, size: PhotoSize = 'full'): Promise<string | null> {
  if (isRemote(id)) return Promise.resolve(id)
  const { key, url } = acquire(id, size)
  release(key)
  return url
}

export interface PhotoOptions {
  size?: PhotoSize
  /** false while the photo is far off-screen: the URL is released */
  active?: Ref<boolean>
}

export function usePhoto(id: Ref<string | null | undefined>, opts: PhotoOptions = {}) {
  const url = ref<string | null>(null)
  const missing = ref(false)
  let held: string | null = null
  const drop = () => {
    if (held) release(held)
    held = null
  }
  watch([id, () => opts.active?.value ?? true], async ([value, active]) => {
    drop()
    url.value = null
    missing.value = false
    if (!value) return
    if (isRemote(value)) {
      url.value = value
      return
    }
    if (!active) return
    const got = acquire(value, opts.size ?? 'full')
    held = got.key
    const resolved = await got.url
    if (held !== got.key || id.value !== value) return
    url.value = resolved
    missing.value = !resolved
  }, { immediate: true })
  onBeforeUnmount(drop)
  return { url, missing }
}

export function usePhotoUrl(id: Ref<string | null | undefined>, opts: PhotoOptions = {}) {
  return usePhoto(id, opts).url
}

/** Opens the system file picker and resolves with the chosen image (or null). */
/** `capture` opens the camera directly; without it the system offers the gallery. */
export function pickImage(capture?: 'environment' | 'user'): Promise<File | null> {
  return pickFile('image/*', capture)
}

/**
 * Opens the system file picker. The input is attached to the document because
 * some Android WebViews drop the change event of detached inputs.
 */
export function pickFile(accept: string, capture?: 'environment' | 'user'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    if (capture) input.setAttribute('capture', capture)
    input.style.display = 'none'
    document.body.appendChild(input)
    const done = (file: File | null) => {
      input.remove()
      resolve(file)
    }
    input.onchange = () => done(input.files?.[0] ?? null)
    input.oncancel = () => done(null)
    input.click()
  })
}
