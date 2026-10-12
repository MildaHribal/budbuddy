// English → Czech grow terms. The curated cards are Czech, so English questions get a second, Czech search.

const PHRASES: [RegExp, string][] = [
  [/\bfan leaves?\b/g, 'vějířové listy'],
  [/\bsugar leaves?\b/g, 'cukrové lístky'],
  [/\b(?:yellow(?:ing)? between the veins|interveinal)\b/g, 'mezižilková chloróza žloutnutí mezi žilkami'],
  [/\bveins? (?:stay )?green\b/g, 'zelené žilky'],
  [/\bburnt? (?:tips|margins|edges)\b|\bnutrient burn\b/g, 'spálení hnojivem spálené špičky'],
  [/\b(?:black|small) (?:flies|gnats)\b|\bfungus gnats?\b/g, 'smutnice larvy smutnic'],
  [/\bspider ?mites?\b/g, 'sviluška'],
  [/\bpowdery mildew\b|\bwhite powder\b/g, 'padlí'],
  [/\bbud ?rot\b|\bgr[ae]y (?:fuzzy )?mou?ld\b|\bbotrytis\b/g, 'plíseň botrytida hniloba palic'],
  [/\broot ?rot\b/g, 'hniloba kořenů'],
  [/\blight schedule\b|\b(?:12\/12|18\/6|20\/4)\b/g, 'světelný režim 12/12 18/6'],
  [/\bgrow ?tent\b/g, 'pěstební stan'],
  [/\bcarbon filter\b/g, 'uhlíkový filtr'],
  [/\brunoff\b/g, 'odtok výluh'],
  [/\bcal-?mag\b/g, 'Cal-Mag vápník hořčík'],
  [/\b(?:slow(?:ly)? grow(?:th|ing)?|grow(?:th|ing)? (?:is )?slow(?:ly)?)\b/g, 'pomalý růst'],
  [/\bready to harvest\b|\bwhen to harvest\b/g, 'kdy sklízet zralost'],
  [/\bstep by step\b/g, 'postup']
]

const WORDS: Record<string, string> = {
  yellow: 'žluté žloutnutí', yellowing: 'žloutnutí', brown: 'hnědé', crispy: 'suché křehké', spots: 'skvrny', spot: 'skvrny', rusty: 'rezavé skvrny',
  pale: 'bledé', purple: 'fialové', droopy: 'svěšené', drooping: 'svěšené', wilting: 'vadnutí', curl: 'kroucení', curled: 'kroucení', curling: 'kroucení',
  claw: 'drápy', taco: 'taco', bleaching: 'bělení', tips: 'špičky', edges: 'okraje', margins: 'okraje', leaves: 'listy', leaf: 'list',
  older: 'starší spodní', lower: 'spodní', new: 'nové horní', upper: 'horní', veins: 'žilky', stem: 'stonek', roots: 'kořeny',
  nitrogen: 'dusík', potassium: 'draslík', phosphorus: 'fosfor', magnesium: 'hořčík', calcium: 'vápník', iron: 'železo', manganese: 'mangan',
  sulfur: 'síra', zinc: 'zinek', boron: 'bor', deficiency: 'nedostatek', deficiencies: 'nedostatek', lockout: 'blokace živin', toxicity: 'přebytek',
  overfeeding: 'přehnojení', overwatering: 'přelití', overwatered: 'přelití', underwatering: 'přeschnutí', wet: 'mokrý přelití', dry: 'suchý', heavy: 'těžký',
  water: 'zálivka zalévat', watering: 'zálivka', feed: 'hnojivo dávka', feeding: 'hnojení', nutrients: 'hnojivo živiny', nutrient: 'živiny', ph: 'pH',
  ec: 'EC', ppm: 'ppm', ppfd: 'PPFD', dli: 'DLI', vpd: 'VPD', humidity: 'vlhkost', temperature: 'teplota', light: 'světlo', lights: 'světlo', led: 'LED',
  seedling: 'semenáček', seedlings: 'semenáčky', germination: 'klíčení', germinate: 'klíčení', clone: 'řízek', clones: 'řízky', veg: 'vegetace',
  vegetative: 'vegetace', flower: 'květ', flowering: 'kvetení', bloom: 'květ', stretch: 'natahování', flip: 'přepnutí na květ',
  autoflower: 'automat autoflower', autoflowers: 'automat autoflower', auto: 'automat', photoperiod: 'fotoperioda', strain: 'odrůda',
  harvest: 'sklizeň', trichomes: 'trichomy', trichome: 'trichomy', amber: 'jantarové', cloudy: 'mléčné', milky: 'mléčné', pistils: 'blizny',
  drying: 'sušení', cure: 'curing zrání', curing: 'curing zrání', jars: 'sklenice', burping: 'větrání sklenic', flush: 'proplach', flushing: 'proplach',
  lst: 'LST ohýbání', hst: 'HST', topping: 'topping zaštípnutí', top: 'topping', fim: 'FIM', scrog: 'SCROG síť', sog: 'SOG', defoliate: 'defoliace',
  defoliation: 'defoliace', lollipopping: 'lollipopping', supercropping: 'supercropping', training: 'trénink', bend: 'ohýbání', breaking: 'zlomení',
  soil: 'hlína', coco: 'kokos', perlite: 'perlit', hydro: 'hydroponie', hydroponics: 'hydroponie', pot: 'květináč', pots: 'květináče', transplant: 'přesazení',
  mites: 'roztoči sviluška', thrips: 'třásněnky', aphids: 'mšice', whiteflies: 'molice', gnats: 'smutnice', caterpillars: 'housenky', pests: 'škůdci',
  mold: 'plíseň', mould: 'plíseň', mildew: 'padlí', webbing: 'pavučinky', fuzzy: 'chlupatá plíseň', hermaphrodite: 'hermafrodit', hermie: 'hermafrodit',
  bananas: 'banány', nanners: 'banány', males: 'samec', male: 'samec', yield: 'úroda', smell: 'zápach pach', odor: 'zápach', law: 'zákon', legal: 'zákon'
}

/** Czech search terms for an English question, or '' when fewer than two terms matched. */
export function toCzechQuery(question: string): string {
  let rest = question.toLowerCase()
  const out: string[] = []
  for (const [re, cs] of PHRASES) {
    rest = rest.replace(re, () => {
      out.push(cs)
      return ' '
    })
  }
  for (const w of rest.match(/[a-z0-9-]+/g) ?? []) {
    const cs = WORDS[w]
    if (cs && !out.includes(cs)) out.push(cs)
  }
  return out.length >= 2 ? out.join(' ') : ''
}
