// Reporting an assistant answer (Google Play generative-AI policy): reports table directly, or the
// report-ai endpoint (e.g. for a banned account), which writes the same row with the service role.
// Both need sign-in, like the assistant itself.

import { normalizeAiReport, UUID, type AiReportReason } from '../../shared/aiReport'

export { AI_REPORT_REASONS, type AiReportReason } from '../../shared/aiReport'

export interface AiReportInput {
  messageId: string
  reason: AiReportReason
  note?: string
  question: string
  answer: string
  model?: string
  lang: string
  hadPhoto?: boolean
  appVersion?: string
}

/** Old message ids were not UUIDs; those get a fresh one (reports are per message anyway). */
export const reportTargetId = (id: string) => (UUID.test(id) ? id : crypto.randomUUID())

export const reportEndpoint = (chatUrl: string) => chatUrl.replace(/\/(api|functions\/v1)\/chat\/?$/, '/$1/report-ai')

export type AiReportResult = 'sent' | 'already'

/** Signed out or the session expired: the page asks for sign-in. */
export class AiReportAuthError extends Error {
  constructor() {
    super('sign-in required')
    this.name = 'AiReportAuthError'
  }
}

export async function sendAiReport(input: AiReportInput, endpoint: { chatUrl: string, token?: string }): Promise<AiReportResult> {
  const body = { ...input, messageId: reportTargetId(input.messageId) }
  const checked = normalizeAiReport(body)
  if ('error' in checked) throw new Error(checked.error)

  // supabase-js stays out of the page chunk until someone actually reports
  const { useSupabase } = await import('~/composables/useSupabase')
  const sb = useSupabase()
  const { data } = await sb.auth.getSession().catch(() => ({ data: { session: null } }))
  const session = data.session
  if (!session) throw new AiReportAuthError()
  const { error } = await sb.from('reports').insert({
    reporter_id: session.user.id,
    target_type: 'ai',
    target_id: checked.targetId,
    reason: checked.reason,
    details: checked.details,
    meta: checked.meta
  })
  if (!error) return 'sent'
  if (error.code === '23505') return 'already'
  // e.g. a banned account: fall back to the endpoint below
  console.warn('[BudBuddy] AI report insert failed', error.message)

  const res = await fetch(reportEndpoint(endpoint.chatUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, ...(endpoint.token ? { 'X-BudBuddy-Token': endpoint.token } : {}) },
    body: JSON.stringify(body)
  })
  if (res.status === 409) return 'already'
  if (res.status === 401) throw new AiReportAuthError()
  if (!res.ok) throw new Error(`report HTTP ${res.status}`)
  return 'sent'
}
