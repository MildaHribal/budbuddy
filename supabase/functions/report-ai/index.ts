import handler from '../../../netlify/functions/report-ai.mts'
import { limited } from '../_shared/limit.ts'

Deno.serve(limited(handler, 5))
