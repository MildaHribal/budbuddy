import { ref } from 'vue'
import { useRuntimeConfig } from '#imports'
import { useNativeStorage } from './useNativeStorage'

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  promptFeedback?: { blockReason?: string }
}

// BudBuddy uses Google's Gemini API for the AI assistant. Gemini has a
// generous free tier (https://aistudio.google.com/app/apikey) and supports
// image input, which is ideal for diagnosing plant photos.
//
// Because this is a static client-side app, every user supplies their own
// free API key (stored locally on the device). When no key is set we fall
// back to a small set of built-in offline answers so the feature still works.

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const KEY_STORAGE = 'budbuddy-gemini-key'

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

  // The server-side proxy keeps a shared key hidden so users don't need to
  // configure anything. Configurable via NUXT_PUBLIC_AI_PROXY_URL; defaults to
  // the relative Netlify function path for web builds.
  const config = useRuntimeConfig()
  const proxyUrl = (config.public.aiProxyUrl as string) || '/api/chat'

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

  // Calls Gemini directly using the user's own API key.
  const askWithKey = async (history: ChatTurn[]): Promise<string> => {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey.value)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: buildContents(history),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    })

    if (!res.ok) {
      if (res.status === 400 || res.status === 403) throw new Error('INVALID_API_KEY')
      const detail = await res.text().catch(() => '')
      throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 200)}`)
    }
    return extractText(await res.json() as GeminiResponse)
  }

  // Calls the shared server proxy (key stays on the server). Throws NO_BACKEND
  // when no proxy is reachable (e.g. on a plain static host) so the caller can
  // fall back to the offline guide.
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

  // The user's own key takes priority; otherwise use the shared proxy.
  const ask = (history: ChatTurn[]): Promise<string> =>
    hasKey() ? askWithKey(history) : askViaProxy(history)

  return { apiKey, keyLoaded, loadKey, saveKey, hasKey, ask }
}

export type { ChatTurn }
