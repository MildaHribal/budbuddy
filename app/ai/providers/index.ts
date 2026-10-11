import type { LlmProvider } from '../llm'
import { createProxyProvider, type ProxyEndpoint } from './proxy'

// Swap or add providers here.
export function getProvider(env: ProxyEndpoint): LlmProvider {
  return createProxyProvider(env)
}
