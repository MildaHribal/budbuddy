import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import { todayISO } from '~/utils/date'
import { haptic } from '~/utils/haptics'
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

const urlCache = new Map<string, Promise<string | null>>()

/** Forget cached object URLs (after a restore / erase replaced the photo library). */
export function resetPhotoUrls() {
  for (const p of urlCache.values()) p.then(url => url && URL.revokeObjectURL(url))
  urlCache.clear()
}

export function photoUrl(id: string): Promise<string | null> {
  let p = urlCache.get(id)
  if (!p) {
    p = photoStore.get(id)
      .then(photo => (photo ? URL.createObjectURL(photo.blob) : null))
      .catch(() => null)
    urlCache.set(id, p)
  }
  return p
}

export function usePhotoUrl(id: Ref<string | null | undefined>) {
  const url = ref<string | null>(null)
  watch(id, async (value) => {
    url.value = null
    if (!value) return
    const resolved = await photoUrl(value)
    if (id.value === value) url.value = resolved
  }, { immediate: true })
  return url
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
