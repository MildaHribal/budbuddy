// Bundled feeding schedules, transcribed from the manufacturers' public feed charts (ml per litre).
// Source URL and check date per schedule; change only against the official charts.
import type { FeedSchedule } from '../types/kit'

export const BUNDLED_SCHEDULES: FeedSchedule[] = [
  {
    id: 'biobizz-light-mix',
    brand: 'BioBizz',
    line: 'Light-Mix / Coco-Mix',
    media: [
      'soil',
      'coco'
    ],
    products: [
      {
        id: 'root-juice',
        name: 'Root-Juice'
      },
      {
        id: 'microbes',
        name: 'Microbes',
        unit: 'g'
      },
      {
        id: 'bio-grow',
        name: 'Bio-Grow'
      },
      {
        id: 'bio-bloom',
        name: 'Bio-Bloom'
      },
      {
        id: 'top-max',
        name: 'Top-Max'
      },
      {
        id: 'bio-heaven',
        name: 'Bio-Heaven'
      },
      {
        id: 'acti-vera',
        name: 'Acti-Vera'
      },
      {
        id: 'alg-a-mic',
        name: 'Alg-A-Mic'
      }
    ],
    weeks: [
      {
        phase: 'seedling',
        n: 1,
        doses: {
          'root-juice': 4,
          'microbes': 0.4,
          'bio-grow': 2,
          'bio-heaven': 2,
          'acti-vera': 2
        }
      },
      {
        phase: 'veg',
        n: 1,
        doses: {
          'root-juice': 4,
          'microbes': 0.4,
          'bio-grow': 2,
          'bio-heaven': 2,
          'acti-vera': 2,
          'alg-a-mic': 2
        },
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'bloom',
        n: 1,
        doses: {
          'root-juice': 2,
          'microbes': 0.2,
          'bio-grow': 3,
          'bio-bloom': 2,
          'top-max': 1,
          'bio-heaven': 2,
          'acti-vera': 3,
          'alg-a-mic': 2
        }
      },
      {
        phase: 'bloom',
        n: 2,
        doses: {
          'root-juice': 2,
          'microbes': 0.2,
          'bio-grow': 4,
          'bio-bloom': 3,
          'top-max': 2,
          'bio-heaven': 3,
          'acti-vera': 4,
          'alg-a-mic': 2
        }
      },
      {
        phase: 'bloom',
        n: 3,
        doses: {
          'microbes': 0.4,
          'bio-grow': 4,
          'bio-bloom': 3,
          'top-max': 2,
          'bio-heaven': 4,
          'acti-vera': 5,
          'alg-a-mic': 3
        }
      },
      {
        phase: 'bloom',
        n: 4,
        doses: {
          'microbes': 0.4,
          'bio-grow': 4,
          'bio-bloom': 4,
          'top-max': 3,
          'bio-heaven': 5,
          'acti-vera': 5,
          'alg-a-mic': 3
        }
      },
      {
        phase: 'bloom',
        n: 5,
        doses: {
          'microbes': 0.4,
          'bio-grow': 2,
          'bio-bloom': 4,
          'top-max': 3,
          'bio-heaven': 5,
          'acti-vera': 3,
          'alg-a-mic': 4
        }
      },
      {
        phase: 'bloom',
        n: 6,
        doses: {
          'microbes': 0.2,
          'bio-grow': 2,
          'bio-bloom': 4,
          'top-max': 4,
          'bio-heaven': 3,
          'acti-vera': 3,
          'alg-a-mic': 4
        }
      },
      {
        phase: 'bloom',
        n: 7,
        doses: {
          'microbes': 0.2,
          'bio-grow': 2,
          'bio-bloom': 3,
          'top-max': 4,
          'bio-heaven': 3,
          'acti-vera': 2,
          'alg-a-mic': 3
        }
      },
      {
        phase: 'bloom',
        n: 8,
        doses: {
          'microbes': 0.2,
          'bio-grow': 1,
          'bio-bloom': 3,
          'top-max': 1,
          'bio-heaven': 2,
          'acti-vera': 1,
          'alg-a-mic': 2
        }
      },
      {
        phase: 'flush',
        n: 1,
        doses: {},
        note: {
          en: 'Plain water only.',
          cs: 'Jen čistá voda.'
        }
      }
    ],
    source: {
      url: 'https://biobizz.com/downloads/nutrient-schedule/',
      checked: '2026-10-13'
    },
    notes: {
      en: 'Official 2026 BioBizz nutrient schedule. Doses in ml per litre; Microbes in grams per litre. Fish-Mix can replace Bio-Grow at the same dose (use one, not both). Count bloom weeks from the switch to 12/12; bloom week 9 is plain water, week 10 harvest. BioBizz says pH adjustment is usually not needed (optimum about 6.2–6.5). No separate autoflower chart: use this one and skip weeks as autos develop faster.',
      cs: 'Oficiální krmný plán BioBizz 2026. Dávky v ml na litr, Microbes v gramech na litr. Fish-Mix může nahradit Bio-Grow ve stejné dávce (jen jedno z nich). Týdny květu se počítají od přepnutí na 12/12, 9. týden je jen voda, 10. sklizeň. Podle BioBizz pH obvykle není potřeba upravovat (optimum asi 6,2–6,5). Samostatný plán pro autoflowery nemají: použij tento a týdny přeskakuj, autoflowery se vyvíjejí rychleji.'
    }
  },
  {
    id: 'biobizz-all-mix',
    brand: 'BioBizz',
    line: 'All-Mix',
    media: [
      'soil'
    ],
    products: [
      {
        id: 'root-juice',
        name: 'Root-Juice'
      },
      {
        id: 'microbes',
        name: 'Microbes',
        unit: 'g'
      },
      {
        id: 'bio-grow',
        name: 'Bio-Grow'
      },
      {
        id: 'bio-bloom',
        name: 'Bio-Bloom'
      },
      {
        id: 'top-max',
        name: 'Top-Max'
      },
      {
        id: 'bio-heaven',
        name: 'Bio-Heaven'
      },
      {
        id: 'acti-vera',
        name: 'Acti-Vera'
      }
    ],
    weeks: [
      {
        phase: 'seedling',
        n: 1,
        doses: {
          'root-juice': 4,
          'microbes': 0.4,
          'bio-grow': 2,
          'bio-heaven': 2,
          'acti-vera': 2
        }
      },
      {
        phase: 'veg',
        n: 1,
        doses: {
          'root-juice': 4,
          'microbes': 0.4,
          'bio-grow': 2,
          'bio-heaven': 2,
          'acti-vera': 2
        },
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'bloom',
        n: 1,
        doses: {
          'root-juice': 2,
          'microbes': 0.2,
          'bio-grow': 3,
          'bio-bloom': 1,
          'top-max': 1,
          'bio-heaven': 2,
          'acti-vera': 3
        }
      },
      {
        phase: 'bloom',
        n: 2,
        doses: {
          'root-juice': 2,
          'microbes': 0.2,
          'bio-grow': 2,
          'bio-bloom': 2,
          'top-max': 2,
          'bio-heaven': 3,
          'acti-vera': 4
        }
      },
      {
        phase: 'bloom',
        n: 3,
        doses: {
          'microbes': 0.4,
          'bio-grow': 2,
          'bio-bloom': 3,
          'top-max': 2,
          'bio-heaven': 4,
          'acti-vera': 5
        }
      },
      {
        phase: 'bloom',
        n: 4,
        doses: {
          'microbes': 0.4,
          'bio-grow': 2,
          'bio-bloom': 3,
          'top-max': 3,
          'bio-heaven': 5,
          'acti-vera': 5
        }
      },
      {
        phase: 'bloom',
        n: 5,
        doses: {
          'microbes': 0.4,
          'bio-grow': 2,
          'bio-bloom': 3,
          'top-max': 3,
          'bio-heaven': 5,
          'acti-vera': 3
        }
      },
      {
        phase: 'bloom',
        n: 6,
        doses: {
          'microbes': 0.2,
          'bio-grow': 2,
          'bio-bloom': 4,
          'top-max': 4,
          'bio-heaven': 4,
          'acti-vera': 3
        }
      },
      {
        phase: 'bloom',
        n: 7,
        doses: {
          'microbes': 0.2,
          'bio-grow': 2,
          'bio-bloom': 4,
          'top-max': 4,
          'bio-heaven': 4,
          'acti-vera': 2
        }
      },
      {
        phase: 'bloom',
        n: 8,
        doses: {
          'microbes': 0.2,
          'bio-grow': 1,
          'bio-bloom': 4,
          'top-max': 4,
          'bio-heaven': 3,
          'acti-vera': 1
        }
      },
      {
        phase: 'flush',
        n: 1,
        doses: {},
        note: {
          en: 'Plain water only.',
          cs: 'Jen čistá voda.'
        }
      }
    ],
    source: {
      url: 'https://biobizz.com/downloads/nutrient-schedule/',
      checked: '2026-10-13'
    },
    notes: {
      en: 'Official 2026 BioBizz schedule for the pre-fertilised All-Mix, so it is lighter than Light-Mix. Doses in ml per litre; Microbes in grams per litre. Fish-Mix can replace Bio-Grow at the same dose. Bloom weeks count from 12/12; bloom week 9 is plain water. No separate autoflower chart.',
      cs: 'Oficiální plán BioBizz 2026 pro předhnojený All-Mix, proto je slabší než pro Light-Mix. Dávky v ml na litr, Microbes v gramech na litr. Fish-Mix může nahradit Bio-Grow ve stejné dávce. Týdny květu od přepnutí na 12/12, 9. týden je jen voda. Samostatný plán pro autoflowery nemají.'
    }
  },
  {
    id: 'canna-terra',
    brand: 'CANNA',
    line: 'Terra',
    media: [
      'soil'
    ],
    products: [
      {
        id: 'terra-vega',
        name: 'Terra Vega'
      },
      {
        id: 'terra-flores',
        name: 'Terra Flores'
      },
      {
        id: 'rhizotonic',
        name: 'Rhizotonic'
      },
      {
        id: 'cannazym',
        name: 'Cannazym'
      },
      {
        id: 'cannaboost',
        name: 'Cannaboost'
      },
      {
        id: 'pk-13-14',
        name: 'PK 13/14'
      }
    ],
    weeks: [
      {
        phase: 'seedling',
        n: 1,
        doses: {
          'terra-vega': 4.1,
          'rhizotonic': 4.0
        },
        ec: 1.4
      },
      {
        phase: 'veg',
        n: 1,
        doses: {
          'terra-vega': 5.4,
          'rhizotonic': 2.0,
          'cannazym': 2.5
        },
        ec: 1.7,
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'veg',
        n: 2,
        doses: {
          'terra-vega': 5.4,
          'rhizotonic': 2.0,
          'cannazym': 2.5
        },
        ec: 1.7,
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'veg',
        n: 3,
        doses: {
          'terra-vega': 5.4,
          'rhizotonic': 2.0,
          'cannazym': 2.5
        },
        ec: 1.7,
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'bloom',
        n: 1,
        doses: {
          'terra-vega': 6.2,
          'rhizotonic': 2.0,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 1.9
      },
      {
        phase: 'bloom',
        n: 2,
        doses: {
          'terra-vega': 6.2,
          'rhizotonic': 2.0,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 1.9
      },
      {
        phase: 'bloom',
        n: 3,
        doses: {
          'terra-flores': 6.6,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 1.9
      },
      {
        phase: 'bloom',
        n: 4,
        doses: {
          'terra-flores': 6.6,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 1.9
      },
      {
        phase: 'bloom',
        n: 5,
        doses: {
          'terra-flores': 6.6,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 1.9
      },
      {
        phase: 'bloom',
        n: 6,
        doses: {
          'terra-flores': 6.6,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0,
          'pk-13-14': 1.5
        },
        ec: 2.3,
        note: {
          en: 'PK 13/14 week.',
          cs: 'Týden PK 13/14.'
        }
      },
      {
        phase: 'bloom',
        n: 7,
        doses: {
          'terra-flores': 6.6,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 1.9
      },
      {
        phase: 'bloom',
        n: 8,
        doses: {
          'terra-flores': 4.4,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 1.4
      },
      {
        phase: 'flush',
        n: 1,
        doses: {
          cannazym: 2.5,
          cannaboost: 2.0
        },
        ec: 0.4,
        note: {
          en: 'No base nutrients, only Cannazym and Cannaboost.',
          cs: 'Bez základních hnojiv, jen Cannazym a Cannaboost.'
        }
      }
    ],
    source: {
      url: 'https://www.canna.com.au/sites/australia/files/2026-04/downloads-grow-schedule-au-terra.pdf',
      checked: '2026-10-13'
    },
    notes: {
      en: 'Official CANNA Terra grow schedule (V25.01), converted from ml per 10 L. EC is the total including starting water of EC 0.4 (CANNA CalMag Agent as needed, not listed). pH 5.8–6.2. Repeat veg weeks for a longer veg and bloom weeks 3–5 for a longer flowering. Cannazym doubles to 5 ml/L only on reused substrate. PK 13/14 is a single week, 3–4 weeks before harvest. No autoflower chart.',
      cs: 'Oficiální plán CANNA Terra (V25.01), přepočtený z ml na 10 L. EC je celková včetně vody s EC 0,4 (CANNA CalMag Agent podle potřeby, není v seznamu). pH 5,8–6,2. Při delším růstu opakuj týdny růstu, při delším květu týdny 3–5. Cannazym na 5 ml/L jen u znovu použitého substrátu. PK 13/14 jen jeden týden, 3–4 týdny před sklizní. Plán pro autoflowery CANNA nemá.'
    }
  },
  {
    id: 'canna-coco',
    brand: 'CANNA',
    line: 'Coco',
    media: [
      'coco'
    ],
    products: [
      {
        id: 'coco-a',
        name: 'CANNA Coco A'
      },
      {
        id: 'coco-b',
        name: 'CANNA Coco B'
      },
      {
        id: 'rhizotonic',
        name: 'Rhizotonic'
      },
      {
        id: 'cannazym',
        name: 'Cannazym'
      },
      {
        id: 'cannaboost',
        name: 'Cannaboost'
      },
      {
        id: 'pk-13-14',
        name: 'PK 13/14'
      }
    ],
    weeks: [
      {
        phase: 'seedling',
        n: 1,
        doses: {
          'coco-a': 2.9,
          'coco-b': 2.9,
          'rhizotonic': 4.0
        },
        ec: 2.0
      },
      {
        phase: 'veg',
        n: 1,
        doses: {
          'coco-a': 2.9,
          'coco-b': 2.9,
          'rhizotonic': 2.0,
          'cannazym': 2.5
        },
        ec: 2.0,
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'veg',
        n: 2,
        doses: {
          'coco-a': 2.9,
          'coco-b': 2.9,
          'rhizotonic': 2.0,
          'cannazym': 2.5
        },
        ec: 2.0,
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'veg',
        n: 3,
        doses: {
          'coco-a': 2.9,
          'coco-b': 2.9,
          'rhizotonic': 2.0,
          'cannazym': 2.5
        },
        ec: 2.0,
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'bloom',
        n: 1,
        doses: {
          'coco-a': 3.3,
          'coco-b': 3.3,
          'rhizotonic': 2.0,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 2.2
      },
      {
        phase: 'bloom',
        n: 2,
        doses: {
          'coco-a': 3.3,
          'coco-b': 3.3,
          'rhizotonic': 2.0,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 2.2
      },
      {
        phase: 'bloom',
        n: 3,
        doses: {
          'coco-a': 3.3,
          'coco-b': 3.3,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 2.2
      },
      {
        phase: 'bloom',
        n: 4,
        doses: {
          'coco-a': 3.3,
          'coco-b': 3.3,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 2.2
      },
      {
        phase: 'bloom',
        n: 5,
        doses: {
          'coco-a': 3.3,
          'coco-b': 3.3,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 2.2
      },
      {
        phase: 'bloom',
        n: 6,
        doses: {
          'coco-a': 3.3,
          'coco-b': 3.3,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0,
          'pk-13-14': 1.5
        },
        ec: 2.7,
        note: {
          en: 'PK 13/14 week.',
          cs: 'Týden PK 13/14.'
        }
      },
      {
        phase: 'bloom',
        n: 7,
        doses: {
          'coco-a': 2.9,
          'coco-b': 2.9,
          'rhizotonic': 0.5,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 2.0
      },
      {
        phase: 'bloom',
        n: 8,
        doses: {
          'coco-a': 2.9,
          'coco-b': 2.9,
          'cannazym': 2.5,
          'cannaboost': 2.0
        },
        ec: 2.0
      },
      {
        phase: 'flush',
        n: 1,
        doses: {
          cannazym: 2.5,
          cannaboost: 2.0
        },
        ec: 0.4,
        note: {
          en: 'No base nutrients, only Cannazym and Cannaboost.',
          cs: 'Bez základních hnojiv, jen Cannazym a Cannaboost.'
        }
      }
    ],
    source: {
      url: 'https://www.canna.com.au/sites/australia/files/2026-04/downloads-grow-schedule-au-coco.pdf',
      checked: '2026-10-13'
    },
    notes: {
      en: 'Official CANNA Coco grow schedule (V25.01), converted from ml per 10 L. Add A first, then B, in equal amounts. EC is the total including starting water of EC 0.4. pH 5.5–6.2. Repeat veg weeks for a longer veg and bloom weeks 3–5 for a longer flowering. Cannazym doubles to 5 ml/L only on reused substrate. No autoflower chart.',
      cs: 'Oficiální plán CANNA Coco (V25.01), přepočtený z ml na 10 L. Nejdřív A, pak B, ve stejném množství. EC je celková včetně vody s EC 0,4. pH 5,5–6,2. Při delším růstu opakuj týdny růstu, při delším květu týdny 3–5. Cannazym na 5 ml/L jen u znovu použitého substrátu. Plán pro autoflowery CANNA nemá.'
    }
  },
  {
    id: 'an-sensi',
    brand: 'Advanced Nutrients',
    line: 'pH Perfect Sensi',
    media: [
      'soil',
      'coco',
      'hydro'
    ],
    products: [
      {
        id: 'sensi-grow-a',
        name: 'Sensi Grow A'
      },
      {
        id: 'sensi-grow-b',
        name: 'Sensi Grow B'
      },
      {
        id: 'sensi-bloom-a',
        name: 'Sensi Bloom A'
      },
      {
        id: 'sensi-bloom-b',
        name: 'Sensi Bloom B'
      },
      {
        id: 'big-bud',
        name: 'Big Bud'
      },
      {
        id: 'overdrive',
        name: 'Overdrive'
      },
      {
        id: 'flawless-finish',
        name: 'Flawless Finish'
      }
    ],
    weeks: [
      {
        phase: 'veg',
        n: 1,
        doses: {
          'sensi-grow-a': 1,
          'sensi-grow-b': 1
        },
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'veg',
        n: 2,
        doses: {
          'sensi-grow-a': 2,
          'sensi-grow-b': 2
        }
      },
      {
        phase: 'veg',
        n: 3,
        doses: {
          'sensi-grow-a': 3,
          'sensi-grow-b': 3
        }
      },
      {
        phase: 'veg',
        n: 4,
        doses: {
          'sensi-grow-a': 4,
          'sensi-grow-b': 4
        },
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'bloom',
        n: 1,
        doses: {
          'sensi-bloom-a': 4,
          'sensi-bloom-b': 4
        }
      },
      {
        phase: 'bloom',
        n: 2,
        doses: {
          'sensi-bloom-a': 4,
          'sensi-bloom-b': 4,
          'big-bud': 2
        }
      },
      {
        phase: 'bloom',
        n: 3,
        doses: {
          'sensi-bloom-a': 4,
          'sensi-bloom-b': 4,
          'big-bud': 2
        }
      },
      {
        phase: 'bloom',
        n: 4,
        doses: {
          'sensi-bloom-a': 4,
          'sensi-bloom-b': 4,
          'big-bud': 2
        },
        note: {
          en: 'Repeat if flowering runs past 8 weeks.',
          cs: 'Opakuj, pokud květ trvá déle než 8 týdnů.'
        }
      },
      {
        phase: 'bloom',
        n: 5,
        doses: {
          'sensi-bloom-a': 4,
          'sensi-bloom-b': 4,
          'big-bud': 2
        }
      },
      {
        phase: 'bloom',
        n: 6,
        doses: {
          'sensi-bloom-a': 4,
          'sensi-bloom-b': 4,
          'overdrive': 2
        }
      },
      {
        phase: 'bloom',
        n: 7,
        doses: {
          'sensi-bloom-a': 4,
          'sensi-bloom-b': 4,
          'overdrive': 2
        }
      },
      {
        phase: 'flush',
        n: 1,
        doses: {
          'flawless-finish': 2
        },
        note: {
          en: 'Nutrient-free flush with Flawless Finish.',
          cs: 'Proplach bez hnojiv, jen Flawless Finish.'
        }
      }
    ],
    source: {
      url: 'https://www.advancednutrients.com/feed-charts/pH_Perfect_Sensi_Grow_and_Bloom-GLOBAL.pdf',
      checked: '2026-10-13'
    },
    notes: {
      en: 'Official Advanced Nutrients chart for pH Perfect Sensi Grow and Bloom A+B, base nutrients plus Big Bud, Overdrive and Flawless Finish. Week 1 can be repeated for seedlings and clones; repeat veg week 4 for a longer veg and bloom week 4 if flowering runs past 8 weeks. If leaf tips burn, lower the base dose by 25 %. No EC, pH or autoflower advice on the chart.',
      cs: 'Oficiální tabulka Advanced Nutrients pro pH Perfect Sensi Grow a Bloom A+B: základní hnojiva, Big Bud, Overdrive a Flawless Finish. 1. týden lze opakovat u semenáčků a řízků, při delším růstu opakuj 4. týden růstu, při květu delším než 8 týdnů opakuj 4. týden květu. Když se pálí špičky listů, sniž základní dávku o 25 %. Tabulka neuvádí EC, pH ani rady pro autoflowery.'
    }
  },
  {
    id: 'gh-flora-medium',
    brand: 'General Hydroponics',
    line: 'Flora Series · Medium',
    media: [
      'coco',
      'hydro',
      'soil'
    ],
    products: [
      {
        id: 'floramicro',
        name: 'FloraMicro'
      },
      {
        id: 'floragro',
        name: 'FloraGro'
      },
      {
        id: 'florabloom',
        name: 'FloraBloom'
      }
    ],
    weeks: [
      {
        phase: 'seedling',
        n: 1,
        doses: {
          floramicro: 0.53,
          floragro: 0.53,
          florabloom: 0.53
        },
        ec: 0.55
      },
      {
        phase: 'veg',
        n: 1,
        doses: {
          floramicro: 1.11,
          floragro: 1.0,
          florabloom: 0.79
        },
        ec: 1.1
      },
      {
        phase: 'veg',
        n: 2,
        doses: {
          floramicro: 1.48,
          floragro: 1.37,
          florabloom: 1.0
        },
        ec: 1.45
      },
      {
        phase: 'veg',
        n: 3,
        doses: {
          floramicro: 1.8,
          floragro: 1.69,
          florabloom: 1.27
        },
        ec: 1.8
      },
      {
        phase: 'bloom',
        n: 1,
        doses: {
          floramicro: 1.61,
          floragro: 1.4,
          florabloom: 1.8
        },
        ec: 1.75
      },
      {
        phase: 'bloom',
        n: 2,
        doses: {
          floramicro: 1.61,
          floragro: 1.4,
          florabloom: 1.8
        },
        ec: 1.75
      },
      {
        phase: 'bloom',
        n: 3,
        doses: {
          floramicro: 1.4,
          floragro: 1.4,
          florabloom: 2.01
        },
        ec: 1.75
      },
      {
        phase: 'bloom',
        n: 4,
        doses: {
          floramicro: 1.4,
          floragro: 1.4,
          florabloom: 2.01
        },
        ec: 1.75
      },
      {
        phase: 'bloom',
        n: 5,
        doses: {
          floramicro: 1.4,
          floragro: 1.4,
          florabloom: 2.01
        },
        ec: 1.75
      },
      {
        phase: 'bloom',
        n: 6,
        doses: {
          floramicro: 1.0,
          floragro: 1.0,
          florabloom: 1.19
        },
        ec: 1.15
      },
      {
        phase: 'bloom',
        n: 7,
        doses: {
          floramicro: 1.0,
          floragro: 1.0,
          florabloom: 1.22
        },
        ec: 1.15
      },
      {
        phase: 'bloom',
        n: 8,
        doses: {
          floramicro: 0.61,
          floragro: 0.61,
          florabloom: 0.95
        },
        ec: 0.8
      },
      {
        phase: 'flush',
        n: 1,
        doses: {},
        note: {
          en: 'Plain water only.',
          cs: 'Jen čistá voda.'
        }
      }
    ],
    source: {
      url: 'https://generalhydroponics.com/cdn/shop/files/FloraSeries-Basic-Feed-Charts.pdf?v=7055597206226638945',
      checked: '2026-10-13'
    },
    notes: {
      en: 'US General Hydroponics Flora Series chart, Medium level, converted from ml per US gallon. EC is the midpoint of the chart range. Bloom week 9 is a flush. The European Terra Aquatica TriPart chart is stage-based without week lengths, so it is not bundled.',
      cs: 'Americká tabulka General Hydroponics Flora Series, úroveň Medium, přepočtená z ml na americký galon. EC je střed rozsahu z tabulky. 9. týden květu je proplach. Evropská tabulka Terra Aquatica TriPart jde podle fází bez délky v týdnech, proto tu není.'
    }
  },
  {
    id: 'plagron-terra-lightmix',
    brand: 'Plagron',
    line: '100% Terra · Lightmix',
    media: [
      'soil'
    ],
    products: [
      {
        id: 'terra-grow',
        name: 'Terra Grow'
      },
      {
        id: 'terra-bloom',
        name: 'Terra Bloom'
      },
      {
        id: 'power-roots',
        name: 'Power Roots'
      },
      {
        id: 'pure-zym',
        name: 'Pure Zym'
      },
      {
        id: 'green-sensation',
        name: 'Green Sensation'
      },
      {
        id: 'sugar-royal',
        name: 'Sugar Royal'
      },
      {
        id: 'power-buds',
        name: 'Power Buds'
      }
    ],
    weeks: [
      {
        phase: 'veg',
        n: 1,
        doses: {
          'terra-grow': 2.5,
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0
        },
        ec: 1.0
      },
      {
        phase: 'veg',
        n: 2,
        doses: {
          'terra-grow': 5.0,
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0
        },
        ec: 1.6,
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'bloom',
        n: 1,
        doses: {
          'terra-bloom': 5.0,
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 1.6
      },
      {
        phase: 'bloom',
        n: 2,
        doses: {
          'terra-bloom': 5.0,
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 1.6
      },
      {
        phase: 'bloom',
        n: 3,
        doses: {
          'terra-bloom': 5.0,
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 1.6
      },
      {
        phase: 'bloom',
        n: 4,
        doses: {
          'terra-bloom': 4.0,
          'pure-zym': 1.0,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 1.8
      },
      {
        phase: 'bloom',
        n: 5,
        doses: {
          'terra-bloom': 4.5,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 1.9
      },
      {
        phase: 'bloom',
        n: 6,
        doses: {
          'terra-bloom': 5.0,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 2.0
      },
      {
        phase: 'bloom',
        n: 7,
        doses: {
          'terra-bloom': 5.0,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 2.0
      },
      {
        phase: 'bloom',
        n: 8,
        doses: {
          'terra-bloom': 5.0,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 2.0
      },
      {
        phase: 'flush',
        n: 1,
        doses: {},
        note: {
          en: 'Plain water only.',
          cs: 'Jen čistá voda.'
        }
      }
    ],
    source: {
      url: 'https://plagron.com/downloads/en/grow-schedule-100-terra',
      checked: '2026-10-13'
    },
    notes: {
      en: 'Official Plagron 100% Terra schedule for Lightmix, converted from ml per 10 L, applied with every watering. EC includes tap water of EC 0.4 and must stay below 3.0. pH 5.5–6.5. Repeat veg week 2 for a longer veg. Chart weeks 3–10 are the bloom phase; week 11 is water only. No autoflower advice.',
      cs: 'Oficiální plán Plagron 100% Terra pro Lightmix, přepočtený z ml na 10 L, dávkuje se při každé zálivce. EC zahrnuje vodu z kohoutku s EC 0,4 a musí zůstat pod 3,0. pH 5,5–6,5. Při delším růstu opakuj 2. týden. Týdny 3–10 tabulky jsou květ, 11. týden jen voda. Rady pro autoflowery tabulka nemá.'
    }
  },
  {
    id: 'plagron-terra-growmix',
    brand: 'Plagron',
    line: '100% Terra · Growmix',
    media: [
      'soil'
    ],
    products: [
      {
        id: 'terra-grow',
        name: 'Terra Grow'
      },
      {
        id: 'terra-bloom',
        name: 'Terra Bloom'
      },
      {
        id: 'power-roots',
        name: 'Power Roots'
      },
      {
        id: 'pure-zym',
        name: 'Pure Zym'
      },
      {
        id: 'green-sensation',
        name: 'Green Sensation'
      },
      {
        id: 'sugar-royal',
        name: 'Sugar Royal'
      },
      {
        id: 'power-buds',
        name: 'Power Buds'
      }
    ],
    weeks: [
      {
        phase: 'veg',
        n: 1,
        doses: {
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0
        },
        ec: 0.6,
        note: {
          en: 'Growmix: no base nutrient yet.',
          cs: 'Growmix: zatím bez základního hnojiva.'
        }
      },
      {
        phase: 'veg',
        n: 2,
        doses: {
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0
        },
        ec: 0.6,
        note: {
          en: 'Repeat this week for as long as veg lasts.',
          cs: 'Opakuj tento týden po celou dobu růstu.'
        }
      },
      {
        phase: 'bloom',
        n: 1,
        doses: {
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 0.6
      },
      {
        phase: 'bloom',
        n: 2,
        doses: {
          'terra-bloom': 5.0,
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 1.6
      },
      {
        phase: 'bloom',
        n: 3,
        doses: {
          'terra-bloom': 5.0,
          'power-roots': 1.0,
          'pure-zym': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 1.6
      },
      {
        phase: 'bloom',
        n: 4,
        doses: {
          'terra-bloom': 4.0,
          'pure-zym': 1.0,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 1.8
      },
      {
        phase: 'bloom',
        n: 5,
        doses: {
          'terra-bloom': 4.5,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 1.9
      },
      {
        phase: 'bloom',
        n: 6,
        doses: {
          'terra-bloom': 5.0,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 2.0
      },
      {
        phase: 'bloom',
        n: 7,
        doses: {
          'terra-bloom': 5.0,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 2.0
      },
      {
        phase: 'bloom',
        n: 8,
        doses: {
          'terra-bloom': 5.0,
          'green-sensation': 1.0,
          'sugar-royal': 1.0,
          'power-buds': 1.0
        },
        ec: 2.0
      },
      {
        phase: 'flush',
        n: 1,
        doses: {},
        note: {
          en: 'Plain water only.',
          cs: 'Jen čistá voda.'
        }
      }
    ],
    source: {
      url: 'https://plagron.com/downloads/en/grow-schedule-100-terra',
      checked: '2026-10-13'
    },
    notes: {
      en: 'Official Plagron 100% Terra schedule for the pre-fertilised Growmix: no base nutrient for the first weeks. Converted from ml per 10 L. pH 5.5–6.5, EC includes tap water of EC 0.4. Repeat veg week 2 for a longer veg; week 11 is water only.',
      cs: 'Oficiální plán Plagron 100% Terra pro předhnojený Growmix: první týdny bez základního hnojiva. Přepočteno z ml na 10 L. pH 5,5–6,5, EC zahrnuje vodu z kohoutku s EC 0,4. Při delším růstu opakuj 2. týden, 11. týden jen voda.'
    }
  }
]
