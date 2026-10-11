// Lenient client-side mirror of the DB content filter (the DB has the final say).

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i
const MESSENGER = /\b(?:t\.me|telegram|wa\.me|whats\s?app|signal\.me|wickr|threema|snap\s?chat|kik)\b/i
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?<![\d.,])\d{3}[\s.-]?\d{3}[\s.-]?\d{3,4}(?![\d.,])/
const SALE = String.raw`(?:\bsell(?:ing)?\b|\bfor sale\b|\bbuy\b|\bprice\b|\bpay\b|\bcash\b|\bship(?:ping)?\b|\bdelivery\b|prodám|prodam\b|koupím|koupim\b|\bcena\b|\bkč\b|\bczk\b|€|\$|\busd\b|\beur\b)`
const PRODUCT = String.raw`(?:\bclones?\b|\bseeds?\b|\bweed\b|\bbuds?\b|\bgrams?\b|\boz\b|\bounces?\b|řízk|semín|semink|tráv|\bgram)`
const SALE_NEAR = new RegExp(`${SALE}[\\s\\S]{0,30}${PRODUCT}|${PRODUCT}[\\s\\S]{0,30}${SALE}`, 'i')

export type ContentIssue = 'contact' | 'sale'

/** Returns why the DB would likely reject this text, or null. */
export function contentIssue(...texts: (string | null | undefined)[]): ContentIssue | null {
  const text = texts.filter(Boolean).join('\n')
  if (!text.trim()) return null
  // dates and times are not phone numbers
  const plain = text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ').replace(/\b\d{1,2}:\d{2}\b/g, ' ')
  if (EMAIL.test(plain) || MESSENGER.test(plain) || PHONE.test(plain)) return 'contact'
  if (SALE_NEAR.test(plain)) return 'sale'
  return null
}
