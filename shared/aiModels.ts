// Shared by the app (model picker) and the Netlify proxy (allowlist).
export interface AiModel {
  id: string
  /** label/hint key in app/locales/ai.ts (models.<key>) */
  key: string
}

export const AI_MODELS: AiModel[] = [
  { id: 'gemini-flash-latest', key: 'flash' },
  { id: 'gemini-3.8-flash', key: 'flash38' },
  { id: 'gemini-flash-lite-latest', key: 'lite' },
  { id: 'gemini-2.5-flash', key: 'flash25' }
]

export const DEFAULT_AI_MODEL = 'gemini-flash-latest'

export const isAllowedModel = (id: unknown): id is string => AI_MODELS.some(m => m.id === id)
