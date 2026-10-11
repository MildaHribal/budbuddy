// Provider + model per provider; stored outside the grow data, so not in backups.
import { Preferences } from '@capacitor/preferences'
import { computed, reactive, ref } from 'vue'
import { DEFAULT_PROVIDER, getProvider, isProviderId } from '~/ai/providers'
import type { ProxyEndpoint } from '~/ai/providers/proxy'

const STORAGE_KEY = 'budbuddy:ai-settings'

const settings = reactive({ provider: DEFAULT_PROVIDER, models: {} as Record<string, string> })
const loaded = ref(false)
let loadPromise: Promise<void> | null = null
let endpoint: ProxyEndpoint | null = null

function load(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Preferences.get({ key: STORAGE_KEY })
      .then(({ value }) => {
        if (!value) return
        const raw = JSON.parse(value) as { provider?: unknown, models?: unknown }
        if (isProviderId(raw.provider)) settings.provider = raw.provider
        if (raw.models && typeof raw.models === 'object') {
          settings.models = Object.fromEntries(Object.entries(raw.models).filter((e): e is [string, string] => typeof e[1] === 'string'))
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.value = true
      })
  }
  return loadPromise
}

const save = () => Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(settings) })

/** First call must be in component setup (reads runtime config). */
export function useAiSettings() {
  if (!endpoint) {
    const { aiProxyUrl, aiAppToken } = useRuntimeConfig().public
    endpoint = { url: String(aiProxyUrl), token: aiAppToken ? String(aiAppToken) : undefined }
  }
  const env = endpoint
  load()
  const provider = computed(() => getProvider(settings.provider, env))
  return {
    loaded,
    ready: load,
    provider,
    model: computed({
      get: () => {
        const chosen = settings.models[provider.value.id]
        return chosen && provider.value.models.some(m => m.id === chosen) ? chosen : provider.value.defaultModel
      },
      set: (model: string) => {
        settings.models[provider.value.id] = model
        save()
      }
    })
  }
}
