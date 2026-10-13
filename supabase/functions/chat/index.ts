import handler from '../../../netlify/functions/chat.mts'
import { limited } from '../_shared/limit.ts'

Deno.serve(limited(handler, 20))
