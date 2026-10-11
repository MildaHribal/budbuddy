import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Every app/locales/<ns>.ts exports { en, cs }; keys resolve as "<ns>.<path>".
const modules = import.meta.glob<{ default: Record<'en' | 'cs', Record<string, unknown>> }>('../app/locales/*.ts', { eager: true })

function flatten(obj: unknown, prefix: string, out: Set<string>) {
  if (typeof obj === 'string') {
    out.add(prefix)
    return
  }
  if (!obj || typeof obj !== 'object') return
  const o = obj as Record<string, unknown>
  // plural entries count as a leaf
  if (typeof o.other === 'string' && typeof o.one === 'string') {
    out.add(prefix)
    return
  }
  for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out)
}

const en = new Set<string>()
const cs = new Set<string>()
for (const [path, mod] of Object.entries(modules)) {
  const ns = path.split('/').pop()!.replace(/\.ts$/, '')
  flatten(mod.default.en, ns, en)
  flatten(mod.default.cs, ns, cs)
}

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(vue|ts)$/.test(f)) out.push(p)
  }
  return out
}

const root = new URL('../app/', import.meta.url).pathname
const files = ['pages', 'components', 'composables', 'utils', 'layouts', 'plugins'].flatMap(d => walk(join(root, d)))

/** static keys passed to t('…') / translate('…') / tOr('…') */
function staticKeys(): { key: string, file: string }[] {
  const out: { key: string, file: string }[] = []
  const re = /\b(?:t|translate|tOr)\(\s*'([a-zA-Z][\w-]*(?:\.[\w-]+)+)'/g
  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(re)) out.push({ key: m[1]!, file: file.slice(root.length) })
  }
  return out
}

describe('i18n keys', () => {
  it('en and cs define the same keys', () => {
    expect([...en].filter(k => !cs.has(k)), 'missing in cs').toEqual([])
    expect([...cs].filter(k => !en.has(k)), 'missing in en').toEqual([])
  })

  it('every static t() key used in the app exists in en', () => {
    const missing = staticKeys().filter(({ key }) => !en.has(key)).map(({ key, file }) => `${file}: ${key}`)
    expect([...new Set(missing)]).toEqual([])
  })
})

describe('i18n dynamic key families (community)', () => {
  const families: Record<string, readonly string[]> = {
    'feed.err': ['rate', 'banned', 'offline', 'generic'],
    'feed.blocked': ['contact', 'sale'],
    'feed.react': ['like', 'healthy', 'training', 'frosty', 'helpful'],
    'feed.symptoms': ['yellowing', 'spots', 'burn', 'claw', 'droop', 'curl', 'purple', 'pests', 'mould', 'slow', 'other'],
    'feed.levelSheet.perks': ['seedling', 'sprout', 'veg', 'flowering', 'master'],
    'feed.cats': ['all', 'question', 'plants', 'harvest', 'problem', 'gear', 'outdoor', 'general'],
    'feed.tabs': ['forYou', 'following', 'new', 'popular', 'unanswered'],
    'feed.levels': ['seedling', 'sprout', 'veg', 'flowering', 'master'],
    'notifications.types': ['like', 'reaction', 'comment', 'reply', 'follow', 'accepted', 'tip_vote', 'challenge', 'moderation', 'badge', 'solve_ping', 'update'],
    'challenge.sheet': ['already', 'closed', 'banned', 'error'],
    'challenge.phase': ['upcoming', 'entries', 'voting', 'finished'],
    'challenge.countdown': ['upcoming', 'entries', 'voting', 'finished'],
    'profile.experience': ['beginner', 'intermediate', 'advanced', 'expert'],
    'auth.profile.levels': ['beginner', 'intermediate', 'advanced', 'expert'],
    'auth.profile.env': ['indoor', 'outdoor', 'greenhouse'],
    'auth.profile.medium': ['soil', 'coco', 'hydro', 'other'],
    'profile.env': ['indoor', 'outdoor', 'greenhouse'],
    'profile.media': ['soil', 'coco', 'hydro', 'other'],
    'profile.plant.type': ['photoperiod', 'autoflower'],
    'admin.types': ['post', 'comment', 'tip', 'profile', 'plant', 'strain', 'entry'],
    'report.reasons': ['spam', 'sale', 'abuse', 'nsfw', 'minor', 'personal', 'other'],
    'strains.dominance': ['indica', 'sativa', 'hybrid'],
    'strains.flowering': ['auto', 'photo']
  }
  it.each(Object.entries(families))('%s.* exists in en and cs', (prefix, values) => {
    const missing = values.flatMap(v => [en.has(`${prefix}.${v}`) ? null : `en:${prefix}.${v}`, cs.has(`${prefix}.${v}`) ? null : `cs:${prefix}.${v}`]).filter(Boolean)
    expect(missing).toEqual([])
  })
})
