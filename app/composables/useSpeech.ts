// Speech to text: Android on-device recognizer via @capacitor-community/speech-recognition, Web Speech API in browsers.
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'

type SpeechState = 'idle' | 'listening' | 'error'
export type SpeechError = 'unsupported' | 'denied' | 'nothing' | 'failed'

interface WebRecognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function webCtor(): (new () => WebRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => WebRecognition, webkitSpeechRecognition?: new () => WebRecognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechSupported(): boolean {
  return Capacitor.isNativePlatform() || !!webCtor()
}

export function useSpeech() {
  const state = ref<SpeechState>('idle')
  const error = ref<SpeechError | null>(null)
  const transcript = ref('')
  let web: WebRecognition | null = null
  let handles: PluginListenerHandle[] = []
  let onDone: ((text: string) => void) | null = null

  const finish = () => {
    if (state.value !== 'listening') return
    state.value = 'idle'
    if (!transcript.value.trim() && !error.value) error.value = 'nothing'
    onDone?.(transcript.value.trim())
  }

  async function cleanupNative() {
    for (const h of handles) await h.remove().catch(() => {})
    handles = []
  }

  async function start(lang: string, done: (text: string) => void) {
    error.value = null
    transcript.value = ''
    onDone = done
    if (Capacitor.isNativePlatform()) {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
      try {
        if (!(await SpeechRecognition.available()).available) {
          error.value = 'unsupported'
          state.value = 'error'
          return
        }
        let perm = await SpeechRecognition.checkPermissions()
        if (perm.speechRecognition !== 'granted') perm = await SpeechRecognition.requestPermissions()
        if (perm.speechRecognition !== 'granted') {
          error.value = 'denied'
          state.value = 'error'
          return
        }
        await cleanupNative()
        handles.push(await SpeechRecognition.addListener('partialResults', (d) => {
          if (d.matches?.[0]) transcript.value = d.matches[0]
        }))
        handles.push(await SpeechRecognition.addListener('listeningState', (d) => {
          if (d.status === 'stopped') {
            cleanupNative()
            finish()
          }
        }))
        state.value = 'listening'
        const res = await SpeechRecognition.start({ language: lang, maxResults: 1, partialResults: true, popup: false })
        if (res?.matches?.[0]) {
          transcript.value = res.matches[0]
          finish()
        }
      } catch (e) {
        console.warn('[BudBuddy] speech', e)
        await cleanupNative()
        // "No match" style errors just mean nothing was heard
        error.value = /match|speech|timeout/i.test(String(e)) ? 'nothing' : 'failed'
        state.value = 'error'
      }
      return
    }

    const Ctor = webCtor()
    if (!Ctor) {
      error.value = 'unsupported'
      state.value = 'error'
      return
    }
    web = new Ctor()
    web.lang = lang
    web.interimResults = true
    web.continuous = false
    web.maxAlternatives = 1
    web.onresult = (e) => {
      transcript.value = Array.from(e.results).map(r => r[0]?.transcript ?? '').join(' ')
    }
    web.onerror = (e) => {
      error.value = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' ? 'nothing' : 'failed'
      state.value = 'error'
    }
    web.onend = finish
    state.value = 'listening'
    try {
      web.start()
    } catch {
      error.value = 'failed'
      state.value = 'error'
    }
  }

  async function stop() {
    if (state.value !== 'listening') return
    if (Capacitor.isNativePlatform()) {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
      await SpeechRecognition.stop().catch(() => {})
      // some recognizers never send "stopped" after a manual stop
      setTimeout(finish, 400)
    } else {
      web?.stop()
    }
  }

  function cancel() {
    onDone = null
    if (state.value === 'listening') {
      state.value = 'idle'
      if (Capacitor.isNativePlatform()) import('@capacitor-community/speech-recognition').then(m => m.SpeechRecognition.stop()).catch(() => {})
      else web?.abort()
    }
    cleanupNative()
  }

  onBeforeUnmount(cancel)

  return { state, error, transcript, start, stop, cancel }
}
