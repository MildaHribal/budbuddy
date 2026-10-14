import { createReportHandler } from '../../../netlify/functions/report-ai.mts'
import { identify, isDenied } from '../_shared/auth.ts'
import { limited } from '../_shared/limit.ts'

Deno.serve(limited(createReportHandler(async (req) => {
  const caller = await identify(req)
  if (isDenied(caller)) return caller
  return { reporterId: caller.kind === 'user' ? caller.id : null }
}), 5))
