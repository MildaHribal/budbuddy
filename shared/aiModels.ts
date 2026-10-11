// The one model the app uses; the Netlify proxy accepts nothing else.
export const AI_MODEL = 'gemini-3.5-flash'

// Enforced by the proxy. No thinking: ~2 s and no thought tokens. MEDIUM photos: ~540 tokens instead of ~1060.
export const AI_GENERATION = {
  thinkingBudget: 0,
  defaultOutputTokens: 900,
  maxOutputTokens: 2048,
  mediaResolution: 'MEDIA_RESOLUTION_MEDIUM'
}

export const isAllowedModel = (id: unknown): id is string => id === AI_MODEL
