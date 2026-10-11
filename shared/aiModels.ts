// The one model the app uses; the Netlify proxy accepts nothing else.
export const AI_MODEL = 'gemini-3.8-flash'

// Enforced by the proxy. No thinking: ~2.5 s instead of ~9 s (low) for a short answer.
export const AI_GENERATION = {
  thinkingBudget: 0,
  defaultOutputTokens: 1536,
  maxOutputTokens: 2048
}

export const isAllowedModel = (id: unknown): id is string => id === AI_MODEL
