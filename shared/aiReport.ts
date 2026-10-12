// AI answer reports: validation shared by the app and netlify/functions/report-ai.mts.

export const AI_REPORT_REASONS = ['offensive', 'dangerous', 'wrong', 'other'] as const
export type AiReportReason = typeof AI_REPORT_REASONS[number]

export const AI_REPORT_LIMITS = { note: 500, question: 1000, answer: 4000, model: 60 }

export interface AiReportMeta {
  question: string
  answer: string
  model: string | null
  lang: string
  had_photo: boolean
  app_version: string | null
}

const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '')
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Shared by the app and the Netlify function: clipped, typed, or an error. */
export function normalizeAiReport(raw: unknown): { targetId: string, reason: AiReportReason, details: string | null, meta: AiReportMeta } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Body must be a JSON object.' }
  const r = raw as Record<string, unknown>
  if (!AI_REPORT_REASONS.includes(r.reason as AiReportReason)) return { error: 'Invalid reason.' }
  if (typeof r.messageId !== 'string' || !UUID.test(r.messageId)) return { error: 'Invalid messageId.' }
  const answer = clip(r.answer, AI_REPORT_LIMITS.answer)
  if (!answer) return { error: 'Missing answer.' }
  const note = clip(r.note, AI_REPORT_LIMITS.note)
  return {
    targetId: r.messageId.toLowerCase(),
    reason: r.reason as AiReportReason,
    details: note || null,
    meta: {
      question: clip(r.question, AI_REPORT_LIMITS.question),
      answer,
      model: clip(r.model, AI_REPORT_LIMITS.model) || null,
      lang: r.lang === 'cs' ? 'cs' : 'en',
      had_photo: r.hadPhoto === true,
      app_version: clip(r.appVersion, 20) || null
    }
  }
}
