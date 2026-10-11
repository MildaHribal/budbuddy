import { locale, plural, type Locale, type Plural } from '~/utils/locale'

type Entry = string | Plural | { [key: string]: Entry }
type Dict = Record<string, Entry>

// Every app/locales/<ns>.ts exports { en, cs }; keys resolve as "<ns>.<path>".
const modules = import.meta.glob<{ default: Record<Locale, Dict> }>('../locales/*.ts', { eager: true })
const dicts: Record<Locale, Dict> = { en: {}, cs: {} }
for (const [path, mod] of Object.entries(modules)) {
  const ns = path.split('/').pop()!.replace(/\.ts$/, '')
  dicts.en[ns] = mod.default.en
  dicts.cs[ns] = mod.default.cs
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
