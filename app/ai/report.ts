// Reporting an assistant answer (Google Play generative-AI policy): signed in → reports table,
// signed out → the Netlify endpoint, which writes the same row without a reporter.

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

export async function sendAiReport(input: AiReportInput, endpoint: { chatUrl: string, token?: string }): Promise<AiReportResult> {
  const body = { ...input, messageId: reportTargetId(input.messageId) }
  const checked = normalizeAiReport(body)
  if ('error' in checked) throw new Error(checked.error)

  // supabase-js stays out of the page chunk until someone actually reports
  const { useSupabase } = await import('~/composables/useSupabase')
  const sb = useSupabase()
  const { data } = await sb.auth.getSession().catch(() => ({ data: { session: null } }))
  const uid = data.session?.user.id
  if (uid) {
    const { error } = await sb.from('reports').insert({
      reporter_id: uid,
      target_type: 'ai',
      target_id: checked.targetId,
      reason: checked.reason,
      details: checked.details,
      meta: checked.meta
    })
    if (!error) return 'sent'
    if (error.code === '23505') return 'already'
    // e.g. a banned account: fall back to the anonymous route below
    console.warn('[BudBuddy] AI report insert failed', error.message)
  }

  const res = await fetch(reportEndpoint(endpoint.chatUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(endpoint.token ? { 'X-BudBuddy-Token': endpoint.token } : {}) },
    body: JSON.stringify(body)
  })
  if (res.status === 409) return 'already'
  if (!res.ok) throw new Error(`report HTTP ${res.status}`)
  return 'sent'
}
