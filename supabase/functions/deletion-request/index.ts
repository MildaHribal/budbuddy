import { limited } from '../_shared/limit.ts'
import { createDeletionHandler } from './handler.ts'

Deno.serve(limited(createDeletionHandler(), 3))
