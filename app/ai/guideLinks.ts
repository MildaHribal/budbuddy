// Picks in-app guide lessons for an answer by keyword (offline, no search).

export interface GuideLink {
  chapter: string
  lesson: string
}

// [chapter, lesson, pattern on folded text (lowercase, no diacritics)]
const TOPICS: [string, string, RegExp][] = [
  ['problems', 'problems-pests', /svilus|roztoc|\bmites?\b|smutnic|gnats?\b|trasnen|thrips|msic|aphid|molic|whitefl|housen|caterpill|skudc|\bpests?\b|pavucin|webbing/],
  ['problems', 'problems-mould', /plisen|plisn|\bmou?ld|botryt|padli|mildew|hnilob|bud ?rot/],
  ['problems', 'problems-deficiencies', /nedostat|deficien|chloro|mezizil|mezi zilk|interveinal|between the veins|dusik|nitrogen|horcik|magnes|draslik|potass|vapnik|calcium|zelez|\biron\b|mangan|fosfor|phosph/],
  ['problems', 'problems-burn-lockout', /spalen|spalil|\bburn|lockout|blokac|drap|\bclaw|preliti|prelev|overwater|svesen|droop|beleni|bleach|heat stress/],
  ['problems', 'problems-hermies', /hermaf|hermie|banan|nanner|pylov|pollen/],
  ['problems', 'problems-diagnose', /zlout|zlut|yellow|skvrn|\bspots?\b|hned|brown|co (se )?(to )?deje|what'?s wrong/],
  ['nutrition', 'nutrition-calmag', /cal-?mag/],
  ['nutrition', 'nutrition-flush', /proplach|flush/],
  ['nutrition', 'nutrition-overfeeding', /prehnoj|overfe|nutrient burn|spaleni hnoj/],
  ['nutrition', 'nutrition-runoff', /runoff|odtok|vyluh/],
  ['nutrition', 'nutrition-ph-ec', /\bph\b|\bec\b|\bppm\b/],
  ['nutrition', 'nutrition-schedule', /hnoj|\bfeed|davkov|nutrients?\b|zivin/],
  ['media', 'media-watering', /zalev|zalit|zaliv|\bwater(ing)?\b|presch|underwater/],
  ['environment', 'environment-light', /ppfd|\bdli\b|svetl|\blight|\bled\b|lamp/],
  ['environment', 'environment-climate', /\bvpd\b|vlhkost|humidity|teplot|temperat/],
  ['flowering', 'flowering-when-to-harvest', /trichom|sklize|sklid|harvest|zralost|\bripe|amber|jantar/],
  ['flowering', 'flowering-flip', /prepn|\bflip|12\/12/],
  ['harvest', 'harvest-drying', /suseni|susit|\bdrying\b|\bdry (room|tent)/],
  ['harvest', 'harvest-curing', /curing|\bcure\b|sklenic|\bjars?\b|burp/],
  ['training', 'training-topping', /topping|zastipn|\btop (it|her|my)\b/],
  ['training', 'training-lst', /\blst\b|ohyb|\bbend/],
  ['training', 'training-scrog', /scrog/],
  ['training', 'training-defoliation', /defol/],
  ['germination', 'germination-seedling-care', /semenac|seedling|sazenic/],
  ['germination', 'germination-methods', /klic|germinat/],
  ['start', 'start-legal', /zakon|legal|\blaw\b|prodej|\bsell|\bbuy\b/]
]

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

/**
 * Up to `max` lessons. The question counts twice as much as the passage titles and photo labels,
 * so a stray passage does not outweigh what was asked.
 */
export function pickGuideLinks(question: string, topics: readonly string[] = [], max = 2): GuideLink[] {
  const q = fold(question)
  const extra = fold(topics.join(' \n '))
  const scored = TOPICS
    .map(([chapter, lesson, re], order) => ({ chapter, lesson, order, score: (re.test(q) ? 2 : 0) + (re.test(extra) ? 1 : 0) }))
    .filter(x => x.score > 0)
  // matches from the titles alone only count when the question itself matched nothing
  const min = scored.some(x => x.score >= 2) ? 2 : 1
  return scored
    .filter(x => x.score >= min)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, max)
    .map(({ chapter, lesson }) => ({ chapter, lesson }))
}

export const guideLessonIds = () => TOPICS.map(([chapter, lesson]) => ({ chapter, lesson }))
