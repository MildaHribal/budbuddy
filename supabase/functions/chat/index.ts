import { createChatHandler } from '../../../netlify/functions/chat.mts'
import { limited } from '../_shared/limit.ts'
import { createChatGate } from './gate.ts'

Deno.serve(limited(createChatHandler(createChatGate()), 20))
