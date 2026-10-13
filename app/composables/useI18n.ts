import { locale, plural, type Locale, type Plural } from '~/utils/locale'

type Entry = string | Plural | { [key: string]: Entry }
type Dict = Record<string, Entry>

type LocaleModule = { default: Record<Locale, Dict> }

// Every app/locales/<ns>.ts exports { en, cs }; keys resolve as "<ns>.<path>".
// Heavy namespaces used only on a few routes load on demand (see middleware/i18n.global.ts).
// Community, AI and single-page texts load with their routes (middleware/i18n.global.ts) to keep the entry chunk small.
export const COMMUNITY_NAMESPACES = ['feed', 'profile', 'auth', 'strains', 'admin', 'challenge', 'notifications', 'report', 'tips'] as const
export const LAZY_NAMESPACES = ['guide', 'guideWidgets', 'guideArt', 'ai', 'plant', 'tools', 'stats', 'settings', 'manage', 'review', 'environment', 'hunts', 'labels', 'care', ...COMMUNITY_NAMESPACES] as const
export type LazyNamespace = typeof LAZY_NAMESPACES[number]

// glob patterns must be literals, so the list is repeated here
const eager = import.meta.glob<LocaleModule>(['../locales/*.ts', '!../locales/{guide,guideWidgets,guideArt,ai,plant,tools,stats,settings,manage,review,environment,hunts,labels,care,feed,profile,auth,strains,admin,challenge,notifications,report,tips}.ts'], { eager: true })
const lazy = import.meta.glob<LocaleModule>('../locales/{guide,guideWidgets,guideArt,ai,plant,tools,stats,settings,manage,review,environment,hunts,labels,care,feed,profile,auth,strains,admin,challenge,notifications,report,tips}.ts')
const dicts: Record<Locale, Dict> = { en: {}, cs: {} }
const nsOf = (path: string) => path.split('/').pop()!.replace(/\.ts$/, '')

function register(path: string, mod: LocaleModule) {
  const ns = nsOf(path)
  dicts.en[ns] = mod.default.en
  dicts.cs[ns] = mod.default.cs
}
for (const [path, mod] of Object.entries(eager)) register(path, mod)

const pending = new Map<string, Promise<void>>()

/** Loads lazy namespaces before a page that needs them renders. */
export function loadNamespaces(names: readonly LazyNamespace[]): Promise<void> {
  return Promise.all(names.map((ns) => {
    if (dicts.en[ns]) return undefined
    const path = `../locales/${ns}.ts`
    let p = pending.get(ns)
    if (!p) {
      p = lazy[path]!().then(mod => register(path, mod)).catch((e) => {
        pending.delete(ns)
        console.error('[i18n] could not load', ns, e)
        throw e
      })
      pending.set(ns, p)
    }
    return p
  })).then(() => undefined)
}

function lookup(dict: Dict, key: string): Entry | undefined {
  let cur: Entry | undefined = dict
  for (const part of key.split('.')) {
    if (!cur || typeof cur === 'string') return undefined
    cur = (cur as Record<string, Entry>)[part]
  }
  return cur
}

const isPlural = (e: Entry): e is Plural => typeof e === 'object' && typeof (e as Plural).other === 'string' && typeof (e as Plural).one === 'string'

export type Params = Record<string, string | number>

export function translate(key: string, params?: Params): string {
  const entry = lookup(dicts[locale.value], key) ?? lookup(dicts.en, key)
  let text: string
  if (entry == null) text = key
  else if (typeof entry === 'string') text = entry
  else if (isPlural(entry)) text = plural(entry, Number(params?.n ?? 0))
  else text = key
  return params ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : text
}

export function useI18n() {
  return { t: translate, locale }
}
