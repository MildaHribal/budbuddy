// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  { ignores: ['android/**', 'dist/**', '.output/**', 'app/types/supabase.ts'] }
)
