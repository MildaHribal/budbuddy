import type { LlmProvider } from '../llm'
import { createProxyProvider, type ProxyEndpoint } from './proxy'

// New providers: add a factory here.
const FACTORIES: Record<string, (env: ProxyEndpoint) => LlmProvider> = {
  proxy: createProxyProvider
}

export const DEFAULT_PROVIDER = 'proxy'

export function getProvider(id: string | null | undefined, env: ProxyEndpoint): LlmProvider {
  return (FACTORIES[id ?? ''] ?? createProxyProvider)(env)
}

export const isProviderId = (id: unknown): id is string => typeof id === 'string' && id in FACTORIES
