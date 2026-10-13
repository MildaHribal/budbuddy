// Resolves the answer provider from the runtime config (no user settings).
import { computed } from 'vue'
import { getProvider } from '~/ai/providers'
import type { ProxyEndpoint } from '~/ai/providers/proxy'

let endpoint: ProxyEndpoint | null = null

/** First call must be in component setup (reads runtime config). */
export function useAiSettings() {
  if (!endpoint) {
    const { aiProxyUrl, aiAppToken } = useRuntimeConfig().public
    endpoint = { url: String(aiProxyUrl), token: aiAppToken ? String(aiAppToken) : undefined }
  }
  const env = endpoint
  return { provider: computed(() => getProvider(env)), endpoint: env }
}
