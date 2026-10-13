// Generated from app/guide/chapters by test/guide-meta.test.ts (UPDATE_GUIDE_META=1). Do not edit.
import type { ChapterMeta } from './index'

export const CHAPTER_META: ChapterMeta[] = [
  {
    id: 'start',
    order: 1,
    title: {
      en: 'Getting started',
      cs: 'Začínáme'
    },
    summary: {
      en: 'The law, the gear, the budget and the first big choices: autoflower or photoperiod, feminized or regular, and which strain.',
      cs: 'Zákon, vybavení, rozpočet a první velká rozhodnutí: automat, nebo fotoperioda, feminizovaná, nebo regulérní semínka a jaká odrůda.'
    },
    glyph: 'seedling',
    color: '#8fd97a',
    file: '01-start',
    lessons: [
      {
        id: 'start-legal',
        title: {
          en: 'Before you start: the law and common sense',
          cs: 'Než začneš: zákon a zdravý rozum'
        },
        minutes: 3
      },
      {
        id: 'start-gear',
        title: {
          en: 'What you need and what it costs',
          cs: 'Co budeš potřebovat a kolik to stojí'
        },
        minutes: 5
      },
      {
        id: 'start-auto-vs-photo',
        title: {
          en: 'Autoflower or photoperiod?',
          cs: 'Automat, nebo fotoperioda?'
        },
        minutes: 4
      },
      {
        id: 'start-seeds',
        title: {
          en: 'Seeds and strains',
          cs: 'Semínka a odrůdy'
        },
        minutes: 5,
        quiz: true
      }
    ]
  },
  {
    id: 'environment',
    order: 2,
    title: {
      en: 'Where to grow',
      cs: 'Kde pěstovat'
    },
    summary: {
      en: 'Indoors in a tent, outdoors under the sun, or in a greenhouse: how to set up light, air and climate so plants thrive.',
      cs: 'Uvnitř ve stanu, venku pod sluncem, nebo ve skleníku: jak nastavit světlo, vzduch a klima, aby se rostlinám dařilo.'
    },
    glyph: 'lamp',
    color: '#5fd9c4',
    file: '02-environment',
    lessons: [
      {
        id: 'environment-choose',
        title: {
          en: 'Indoor, outdoor or greenhouse?',
          cs: 'Uvnitř, venku, nebo ve skleníku?'
        },
        minutes: 3
      },
      {
        id: 'environment-tent',
        title: {
          en: 'Setting up a grow tent',
          cs: 'Jak postavit pěstební stan'
        },
        minutes: 5,
        environments: [
          'indoor'
        ]
      },
      {
        id: 'environment-light',
        title: {
          en: 'Light: how much and how long',
          cs: 'Světlo: kolik a jak dlouho'
        },
        minutes: 5,
        environments: [
          'indoor'
        ]
      },
      {
        id: 'environment-climate',
        title: {
          en: 'Temperature, humidity and VPD',
          cs: 'Teplota, vlhkost a VPD'
        },
        minutes: 5,
        environments: [
          'indoor',
          'greenhouse'
        ]
      },
      {
        id: 'environment-outdoor',
        title: {
          en: 'Growing outdoors',
          cs: 'Pěstování venku'
        },
        minutes: 5,
        environments: [
          'outdoor'
        ]
      },
      {
        id: 'environment-greenhouse',
        title: {
          en: 'Growing in a greenhouse',
          cs: 'Pěstování ve skleníku'
        },
        minutes: 4,
        environments: [
          'greenhouse'
        ]
      },
      {
        id: 'environment-ready',
        title: {
          en: 'Final check before you plant',
          cs: 'Poslední kontrola před sázením'
        },
        minutes: 3,
        quiz: true
      }
    ]
  },
  {
    id: 'media',
    order: 3,
    title: {
      en: 'Growing media & watering',
      cs: 'Substráty a zálivka'
    },
    summary: {
      en: 'Soil, coco or hydro: what each one asks of you, which pot to pick and how to water without drowning the roots.',
      cs: 'Hlína, kokos, nebo hydro: co od tebe který vyžaduje, jaký vybrat květináč a jak zalévat, abys kořeny neutopil.'
    },
    glyph: 'water',
    color: '#5fb4ee',
    file: '03-media',
    lessons: [
      {
        id: 'media-overview',
        title: {
          en: 'Choosing your medium',
          cs: 'Jaký substrát vybrat'
        },
        minutes: 3
      },
      {
        id: 'media-soil',
        title: {
          en: 'Growing in soil',
          cs: 'Pěstování v hlíně'
        },
        minutes: 4,
        media: [
          'soil'
        ]
      },
      {
        id: 'media-coco',
        title: {
          en: 'Growing in coco',
          cs: 'Pěstování v kokosu'
        },
        minutes: 4,
        media: [
          'coco'
        ]
      },
      {
        id: 'media-hydro',
        title: {
          en: 'Hydroponics',
          cs: 'Hydroponie'
        },
        minutes: 5,
        media: [
          'hydro'
        ]
      },
      {
        id: 'media-pots',
        title: {
          en: 'Pots & drainage',
          cs: 'Květináče a odtok'
        },
        minutes: 3
      },
      {
        id: 'media-watering',
        title: {
          en: 'How to water',
          cs: 'Jak zalévat'
        },
        minutes: 5,
        quiz: true
      }
    ]
  },
  {
    id: 'germination',
    order: 4,
    title: {
      en: 'Germination & seedlings',
      cs: 'Klíčení a sazenice'
    },
    summary: {
      en: 'Wake the seed up, plant it at the right depth and get the fragile seedling through its first weeks.',
      cs: 'Probuď semínko, zasaď ho do správné hloubky a proveď křehkou sazenici prvními týdny.'
    },
    glyph: 'germination',
    color: '#d9c46b',
    file: '04-germination',
    lessons: [
      {
        id: 'germination-methods',
        title: {
          en: 'Three ways to germinate',
          cs: 'Tři způsoby klíčení'
        },
        minutes: 4
      },
      {
        id: 'germination-planting',
        title: {
          en: 'Planting depth & climate',
          cs: 'Hloubka výsadby a klima'
        },
        minutes: 3
      },
      {
        id: 'germination-seedling-care',
        title: {
          en: 'Seedling care',
          cs: 'Péče o sazenice'
        },
        minutes: 4
      },
      {
        id: 'germination-seedling-problems',
        title: {
          en: 'Stretch, damping off & other seedling problems',
          cs: 'Vytáhlé sazenice, padání klíčních rostlin a další potíže'
        },
        minutes: 5,
        quiz: true
      }
    ]
  },
  {
    id: 'vegetative',
    order: 5,
    title: {
      en: 'Vegetative growth',
      cs: 'Vegetace'
    },
    summary: {
      en: 'Build a big, healthy plant: light and climate for veg, watering and feeding, transplanting and telling males from females.',
      cs: 'Vypěstuj velkou a zdravou rostlinu: světlo a klima ve vegetaci, zálivka a hnojení, přesazování a rozpoznání samců od samic.'
    },
    glyph: 'vegetative',
    color: '#3dd173',
    file: '05-vegetative',
    lessons: [
      {
        id: 'vegetative-light-climate',
        title: {
          en: 'Light & climate in veg',
          cs: 'Světlo a klima ve vegetaci'
        },
        minutes: 4
      },
      {
        id: 'vegetative-watering-feeding',
        title: {
          en: 'Watering & feeding basics',
          cs: 'Základy zálivky a hnojení'
        },
        minutes: 5
      },
      {
        id: 'vegetative-transplanting',
        title: {
          en: 'Transplanting',
          cs: 'Přesazování'
        },
        minutes: 4
      },
      {
        id: 'vegetative-how-long',
        title: {
          en: 'How long to veg',
          cs: 'Jak dlouho nechat ve vegetaci'
        },
        minutes: 3
      },
      {
        id: 'vegetative-sexing',
        title: {
          en: 'Sexing & pre-flowers',
          cs: 'Určení pohlaví a předkvěty'
        },
        minutes: 5,
        quiz: true
      }
    ]
  },
  {
    id: 'training',
    order: 6,
    title: {
      en: 'Plant training',
      cs: 'Tvarování rostlin'
    },
    summary: {
      en: 'Shape the plant for a flat, even canopy and more top buds: LST, topping, FIM, SCROG, defoliation, lollipopping and supercropping.',
      cs: 'Vytvaruj rostlinu do rovné a rovnoměrné koruny s víc vrcholovými palicemi: LST, topping, FIM, SCROG, defoliace, lollipopping a supercropping.'
    },
    glyph: 'train',
    color: '#3dd173',
    file: '06-training',
    lessons: [
      {
        id: 'training-lst',
        title: {
          en: 'LST – low stress training',
          cs: 'LST – tvarování s nízkým stresem'
        },
        minutes: 5
      },
      {
        id: 'training-topping',
        title: {
          en: 'Topping',
          cs: 'Topping (zaštípnutí)'
        },
        minutes: 4
      },
      {
        id: 'training-fim',
        title: {
          en: 'FIM',
          cs: 'FIM'
        },
        minutes: 3
      },
      {
        id: 'training-scrog',
        title: {
          en: 'SCROG – screen of green',
          cs: 'SCROG – zelená síť'
        },
        minutes: 5
      },
      {
        id: 'training-defoliation',
        title: {
          en: 'Defoliation',
          cs: 'Defoliace'
        },
        minutes: 4
      },
      {
        id: 'training-lollipopping',
        title: {
          en: 'Lollipopping',
          cs: 'Lollipopping'
        },
        minutes: 3
      },
      {
        id: 'training-supercropping',
        title: {
          en: 'Supercropping',
          cs: 'Supercropping'
        },
        minutes: 5,
        quiz: true
      }
    ]
  },
  {
    id: 'nutrition',
    order: 7,
    title: {
      en: 'Feeding',
      cs: 'Hnojení'
    },
    summary: {
      en: 'What your plant eats, how to keep pH and EC in range, when to feed what and how to spot that you overdid it.',
      cs: 'Co rostlina jí, jak udržet pH a EC v rozmezí, kdy čím hnojit a jak poznat, že jsi to přehnal.'
    },
    glyph: 'feed',
    color: '#b58cf5',
    file: '07-nutrition',
    lessons: [
      {
        id: 'nutrition-npk',
        title: {
          en: 'NPK & micronutrients',
          cs: 'NPK a mikroprvky'
        },
        minutes: 4
      },
      {
        id: 'nutrition-ph-ec',
        title: {
          en: 'pH & EC per medium',
          cs: 'pH a EC podle substrátu'
        },
        minutes: 5
      },
      {
        id: 'nutrition-schedule',
        title: {
          en: 'Feeding by stage',
          cs: 'Hnojení podle fáze'
        },
        minutes: 5
      },
      {
        id: 'nutrition-calmag',
        title: {
          en: 'CalMag',
          cs: 'CalMag'
        },
        minutes: 3
      },
      {
        id: 'nutrition-overfeeding',
        title: {
          en: 'Signs of overfeeding',
          cs: 'Jak poznat přehnojení'
        },
        minutes: 4
      },
      {
        id: 'nutrition-runoff',
        title: {
          en: 'Runoff testing',
          cs: 'Měření výtoku'
        },
        minutes: 3,
        media: [
          'soil',
          'coco'
        ]
      },
      {
        id: 'nutrition-flush',
        title: {
          en: 'Flushing before harvest',
          cs: 'Proplach před sklizní'
        },
        minutes: 4,
        quiz: true
      }
    ]
  },
  {
    id: 'flowering',
    order: 8,
    title: {
      en: 'Flowering',
      cs: 'Kvetení'
    },
    summary: {
      en: 'The flip to 12/12, the stretch, how buds develop week by week, keeping mould away and reading trichomes to pick harvest day.',
      cs: 'Přepnutí na 12/12, stretch, jak se týden po týdnu vyvíjejí palice, jak si udržet plíseň od těla a jak podle trichomů poznat den sklizně.'
    },
    glyph: 'flowering',
    color: '#b58cf5',
    file: '08-flowering',
    lessons: [
      {
        id: 'flowering-flip',
        title: {
          en: 'The flip: 12/12 and autoflowers',
          cs: 'Přepnutí: 12/12 a automatky'
        },
        minutes: 4
      },
      {
        id: 'flowering-stretch',
        title: {
          en: 'The stretch',
          cs: 'Stretch'
        },
        minutes: 3
      },
      {
        id: 'flowering-bud-development',
        title: {
          en: 'Bud development week by week',
          cs: 'Vývoj palic týden po týdnu'
        },
        minutes: 4
      },
      {
        id: 'flowering-climate',
        title: {
          en: 'Climate & humidity in flower',
          cs: 'Klima a vlhkost v kvetení'
        },
        minutes: 5,
        environments: [
          'indoor',
          'greenhouse'
        ]
      },
      {
        id: 'flowering-late',
        title: {
          en: 'Late flower care',
          cs: 'Péče na konci kvetení'
        },
        minutes: 4
      },
      {
        id: 'flowering-when-to-harvest',
        title: {
          en: 'When to harvest: reading trichomes',
          cs: 'Kdy sklízet: čtení trichomů'
        },
        minutes: 5,
        quiz: true
      }
    ]
  },
  {
    id: 'harvest',
    order: 9,
    title: {
      en: 'Harvest, drying & curing',
      cs: 'Sklizeň, sušení a zrání'
    },
    summary: {
      en: 'Chop day, wet vs dry trim, slow drying at about 18–20 °C and 60 % RH, and curing in jars — the steps that decide how your harvest smells and smokes.',
      cs: 'Den sklizně, mokrý a suchý střih, pomalé sušení kolem 18–20 °C a 60 % a zrání ve sklenicích — kroky, které rozhodnou, jak bude úroda vonět a chutnat.'
    },
    glyph: 'harvest',
    color: '#f2b544',
    file: '09-harvest',
    lessons: [
      {
        id: 'harvest-chop-day',
        title: {
          en: 'Chop day',
          cs: 'Den sklizně'
        },
        minutes: 3
      },
      {
        id: 'harvest-trim',
        title: {
          en: 'Wet vs dry trim',
          cs: 'Mokrý vs. suchý střih'
        },
        minutes: 3
      },
      {
        id: 'harvest-drying',
        title: {
          en: 'Drying',
          cs: 'Sušení'
        },
        minutes: 4
      },
      {
        id: 'harvest-curing',
        title: {
          en: 'Curing in jars',
          cs: 'Zrání ve sklenicích'
        },
        minutes: 4
      },
      {
        id: 'harvest-storage',
        title: {
          en: 'Storage',
          cs: 'Skladování'
        },
        minutes: 3,
        quiz: true
      }
    ]
  },
  {
    id: 'problems',
    order: 10,
    title: {
      en: 'Problems & diagnosis',
      cs: 'Problémy a diagnostika'
    },
    summary: {
      en: 'Read what your plant is telling you: deficiencies, burn and lockout, pests, mould and hermaphrodites, with a clear plan for each.',
      cs: 'Nauč se číst, co ti rostlina říká: nedostatky živin, přehnojení a zablokování, škůdci, plíseň a hermafroditi. U každého problému máš jasný postup.'
    },
    glyph: 'pest',
    color: '#f0905a',
    file: '10-problems',
    lessons: [
      {
        id: 'problems-diagnose',
        title: {
          en: 'How to diagnose a sick plant',
          cs: 'Jak diagnostikovat nemocnou rostlinu'
        },
        minutes: 5
      },
      {
        id: 'problems-deficiencies',
        title: {
          en: 'Nutrient deficiencies',
          cs: 'Nedostatky živin'
        },
        minutes: 6
      },
      {
        id: 'problems-burn-lockout',
        title: {
          en: 'Burn, lockout, water & heat stress',
          cs: 'Přehnojení, zablokování, zálivka a horko'
        },
        minutes: 5
      },
      {
        id: 'problems-pests',
        title: {
          en: 'Pests',
          cs: 'Škůdci'
        },
        minutes: 6
      },
      {
        id: 'problems-mould',
        title: {
          en: 'Bud rot & powdery mildew',
          cs: 'Hniloba palic a padlí'
        },
        minutes: 5
      },
      {
        id: 'problems-hermies',
        title: {
          en: 'Hermaphrodites',
          cs: 'Hermafroditi'
        },
        minutes: 4
      },
      {
        id: 'problems-review',
        title: {
          en: 'Recap & quiz',
          cs: 'Shrnutí a kvíz'
        },
        minutes: 4,
        quiz: true
      }
    ]
  }
]
