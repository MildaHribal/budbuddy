import { ref } from 'vue'
import { useRuntimeConfig } from '#imports'
import { useNativeStorage } from './useNativeStorage'

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  promptFeedback?: { blockReason?: string }
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const KEY_STORAGE = 'budbuddy-gemini-key'

// Optional built-in key. Leave EMPTY in production: a key hardcoded here ships
// in the public bundle, which (a) lets Google's scanner flag and revoke it and
// (b) makes Netlify's secret scanner fail the build. With it empty, requests go
// straight to the server proxy, which holds the real key (GEMINI_API_KEY) safely
// server-side. A user-supplied key (⚙️ in the app) always takes priority.
const BUILTIN_API_KEY = ''

const SYSTEM_PROMPT = `You are BudBuddy, a friendly and highly knowledgeable cannabis cultivation assistant inside a grow-tracking app.
Help home growers with germination, seedling, vegetative and flowering care, nutrients and pH, lighting, watering, ventilation, training (LST/topping), pest and deficiency diagnosis, harvesting, drying and curing.
Guidelines:
- Give practical, specific, actionable advice. Use short paragraphs and bullet points.
- Use occasional plant emoji (🌱🌿💧) to stay friendly, but don't overdo it.
- When a photo is provided, describe what you see and give a likely diagnosis with next steps.
- Always remind users to follow the cannabis laws of their own country/region.
- Reply in the same language the user writes in.
Keep answers focused and concise.`

interface ChatTurn {
  role: 'user' | 'model'
  text: string
  imageBase64?: string // data URL or raw base64
}

export const useAiAssistant = () => {
  const storage = useNativeStorage()
  const apiKey = ref<string>('')
  const keyLoaded = ref(false)

  // Absolute fallback so the bundled APK (and any build that didn't get the
  // AI_PROXY_URL set) still reaches a real proxy instead of a relative path
  // that only resolves on the Netlify-hosted web build.
  const DEFAULT_PROXY = 'https://budbuddy-demo.netlify.app/api/chat'
  const config = useRuntimeConfig()
  const proxyUrl = (config.public.aiProxyUrl as string)?.trim() || DEFAULT_PROXY

  const loadKey = async () => {
    apiKey.value = (await storage.getItem(KEY_STORAGE)) || ''
    keyLoaded.value = true
    return apiKey.value
  }

  const saveKey = async (key: string) => {
    apiKey.value = key.trim()
    if (apiKey.value) {
      await storage.setItem(KEY_STORAGE, apiKey.value)
    } else {
      await storage.removeItem(KEY_STORAGE)
    }
  }

  const hasKey = () => apiKey.value.trim().length > 0

  const stripDataUrl = (img: string) => {
    const comma = img.indexOf(',')
    return comma >= 0 ? img.slice(comma + 1) : img
  }

  const guessMime = (img: string) => {
    const m = img.match(/^data:(image\/[a-zA-Z+]+);base64,/)
    return m ? m[1] : 'image/jpeg'
  }

  // Turns the chat history into Gemini "contents".
  const buildContents = (history: ChatTurn[]) =>
    history.map((turn) => {
      const parts: Array<Record<string, unknown>> = []
      if (turn.imageBase64) {
        parts.push({
          inline_data: {
            mime_type: guessMime(turn.imageBase64),
            data: stripDataUrl(turn.imageBase64)
          }
        })
      }
      if (turn.text) parts.push({ text: turn.text })
      if (parts.length === 0) parts.push({ text: '' })
      return { role: turn.role, parts }
    })

  const extractText = (data: GeminiResponse): string => {
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || '')
      .join('')
      .trim()
    if (!text) {
      if (data?.promptFeedback?.blockReason) {
        return '⚠️ I couldn\'t answer that one. Try rephrasing your question about your grow.'
      }
      throw new Error('Empty response from Gemini.')
    }
    return text
  }

  const askWithKey = async (history: ChatTurn[], key: string): Promise<string> => {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: buildContents(history),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    })

    if (!res.ok) {
      // 400/403: bad or revoked key. 429: out of quota (the built-in key is
      // rate-limited or has been flagged). Both are recoverable by falling
      // back to the server proxy, so surface them as typed errors.
      if (res.status === 400 || res.status === 403) throw new Error('INVALID_API_KEY')
      if (res.status === 429) throw new Error('QUOTA')
      const detail = await res.text().catch(() => '')
      throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 200)}`)
    }
    return extractText(await res.json() as GeminiResponse)
  }

  const askViaProxy = async (history: ChatTurn[]): Promise<string> => {
    let res: Response
    try {
      res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: buildContents(history) })
      })
    } catch {
      throw new Error('NO_BACKEND')
    }

    const contentType = res.headers.get('content-type') || ''
    if (res.status === 404 || res.status === 503 || !contentType.includes('application/json')) {
      throw new Error('NO_BACKEND')
    }

    const data = await res.json().catch(() => null) as { text?: string, error?: string } | null
    if (!res.ok || !data) throw new Error(data?.error || `AI service error ${res.status}`)
    if (!data.text) throw new Error('Empty response from AI.')
    return data.text
  }

  const isRecoverable = (e: unknown) =>
    e instanceof Error && (e.message === 'INVALID_API_KEY' || e.message === 'QUOTA' || e.message === 'NO_BACKEND')

  // Resolution order:
  //  1. If the user set their own key, use only that — surface its errors so
  //     they can fix it in settings.
  //  2. Otherwise try the built-in key, and on any recoverable failure (bad
  //     key / out of quota) fall back to the shared server proxy.
  const ask = async (history: ChatTurn[]): Promise<string> => {
    const userKey = apiKey.value.trim()
    if (userKey) return askWithKey(history, userKey)

    // No built-in key configured → go straight to the server proxy.
    if (!BUILTIN_API_KEY) return askViaProxy(history)

    try {
      return await askWithKey(history, BUILTIN_API_KEY)
    } catch (e) {
      if (isRecoverable(e)) return askViaProxy(history)
      throw e
    }
  }

  return { apiKey, keyLoaded, loadKey, saveKey, hasKey, ask }
}

export type { ChatTurn }
