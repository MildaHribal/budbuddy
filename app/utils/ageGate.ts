// First-run age check. Only the outcome is stored, never the birth date.

/** Home growing is legal from 21 here (CZ: zákon 270/2025 Sb.; US: state laws); 18 everywhere else (Play rating 18+). */
const AGE_21 = new Set(['CZ', 'US'])
export const BLOCK_HOURS = 24
const MAX_AGE = 120

export const COUNTRY_CODES = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ '
  + 'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR '
  + 'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP '
  + 'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ '
  + 'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW '
  + 'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ '
  + 'UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW').split(' ')

export interface Birth { y: number, m: number, d: number }

export type AgeRecord
  = | { v: 1, country: string, minAge: number, verifiedAt: string }
    | { v: 1, country: string, minAge: number, blockedUntil: string }

export const minAgeFor = (country: string) => (AGE_21.has(country.toUpperCase()) ? 21 : 18)

export function ageOn(birth: Birth, today: Date): number {
  const m = today.getMonth() + 1
  const d = today.getDate()
  const before = m < birth.m || (m === birth.m && d < birth.d)
  return today.getFullYear() - birth.y - (before ? 1 : 0)
}

export function checkBirth(birth: Birth, today: Date): 'ok' | 'invalid' {
  const { y, m, d } = birth
  if (![y, m, d].every(Number.isInteger)) return 'invalid'
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return 'invalid'
  if (date > today) return 'invalid'
  return ageOn(birth, today) > MAX_AGE ? 'invalid' : 'ok'
}

export function recordFor(country: string, birth: Birth, now: Date): AgeRecord {
  const code = country.toUpperCase()
  const minAge = minAgeFor(code)
  if (ageOn(birth, now) >= minAge) return { v: 1, country: code, minAge, verifiedAt: now.toISOString() }
  return { v: 1, country: code, minAge, blockedUntil: new Date(now.getTime() + BLOCK_HOURS * 3600_000).toISOString() }
}

export function gateState(rec: AgeRecord | null, now: Date): 'ask' | 'ok' | 'blocked' {
  if (!rec) return 'ask'
  if ('blockedUntil' in rec) return new Date(rec.blockedUntil) > now ? 'blocked' : 'ask'
  return rec.minAge >= minAgeFor(rec.country) ? 'ok' : 'ask'
}

export function parseRecord(raw: string | null): AgeRecord | null {
  if (!raw) return null
  try {
    const r = JSON.parse(raw)
    if (r?.v !== 1 || typeof r.country !== 'string' || typeof r.minAge !== 'number') return null
    if (typeof r.verifiedAt === 'string') return { v: 1, country: r.country, minAge: r.minAge, verifiedAt: r.verifiedAt }
    if (typeof r.blockedUntil === 'string') return { v: 1, country: r.country, minAge: r.minAge, blockedUntil: r.blockedUntil }
    return null
  } catch {
    return null
  }
}

/** Region of the first device language that has one ("cs" → CZ via likely subtags). */
export function deviceCountry(languages: readonly string[]): string | null {
  for (const tag of languages) {
    try {
      const region = new Intl.Locale(tag).maximize().region
      if (region && COUNTRY_CODES.includes(region)) return region
    } catch {
      // malformed tag
    }
  }
  return null
}
