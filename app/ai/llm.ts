// Provider-neutral contract for the model that writes the answer.
import { translate } from '../composables/useI18n'

export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
}

export interface LlmImage {
  mimeType: string
  /** base64 without the data: prefix */
  base64: string
}

export interface LlmRequest {
  system: string
  history: ChatTurn[]
  /** includes plant context, diagnosis and numbered passages */
  userText: string
  image?: LlmImage | null
  /** default is the server's short limit */
  maxOutputTokens?: number
  signal?: AbortSignal
  onText?: (text: string) => void
}

export interface LlmAnswer {
  text: string
  modelVersion?: string
}

export type LlmErrorCode = 'not-configured' | 'quota' | 'rate-limit' | 'safety' | 'offline' | 'model' | 'overloaded' | 'timeout' | 'aborted' | 'empty' | 'unknown'

/** Message is localised, ready to show. */
export class LlmError extends Error {
  constructor(public code: LlmErrorCode, message: string, public retryAfterSec?: number) {
    super(message)
    this.name = 'LlmError'
  }
}

export interface LlmProvider {
  id: string
  label: string
  model: string
  generate(req: LlmRequest): Promise<LlmAnswer>
  /** resolves with the model version that answered */
  test(): Promise<string>
}

export function networkError(e: unknown): LlmError {
  if (e instanceof LlmError) return e
  if ((e as Error)?.name === 'AbortError') return new LlmError('aborted', translate('ai.errors.aborted'))
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  return new LlmError('offline', translate(offline ? 'ai.errors.offline' : 'ai.errors.network'))
}
