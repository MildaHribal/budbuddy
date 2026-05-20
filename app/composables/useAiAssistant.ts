import { ref } from 'vue'
import { useNativeStorage } from './useNativeStorage'

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

  // Calls Gemini with the full conversation history for context.
  const ask = async (history: ChatTurn[]): Promise<string> => {
    if (!hasKey()) {
      throw new Error('NO_API_KEY')
    }

    const contents = history.map((turn) => {
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

    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey.value)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      if (res.status === 400 || res.status === 403) {
        throw new Error('INVALID_API_KEY')
      }
      throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || '')
      .join('')
      .trim()

    if (!text) {
      const blocked = data?.promptFeedback?.blockReason
      if (blocked) {
        return '⚠️ I couldn\'t answer that one. Try rephrasing your question about your grow.'
      }
      throw new Error('Empty response from Gemini.')
    }
    return text
  }

  return { apiKey, keyLoaded, loadKey, saveKey, hasKey, ask }
}

export type { ChatTurn }
