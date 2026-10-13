import type { Chapter } from '../types'

export default {
  id: 'media',
  order: 3,
  title: { en: 'Growing media & watering', cs: 'Substráty a zálivka' },
  summary: {
    en: 'Soil, coco or hydro: what each one asks of you, which pot to pick and how to water without drowning the roots.',
    cs: 'Hlína, kokos, nebo hydro: co od tebe který vyžaduje, jaký vybrat květináč a jak zalévat, abys kořeny neutopil.'
  },
  glyph: 'water',
  color: '#5fb4ee',
  lessons: [
    {
      id: 'media-overview',
      title: { en: 'Choosing your medium', cs: 'Jaký substrát vybrat' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'The medium is what your roots live in. It decides how often you water, how precise your feeding has to be and how quickly mistakes show up. None of them is "best". They trade **forgiveness** for **speed and control**.',
            cs: 'Substrát je prostředí, ve kterém žijí kořeny. Určuje, jak často budeš zalévat, jak přesně musíš hnojit a jak rychle se projeví chyby. Žádný není „nejlepší“. Každý jinak vyvažuje **odpustitelnost** proti **rychlosti a kontrole**.'
          }
        },
        {
          type: 'figure',
          photo: 'media-overview-pot-mix.webp',
          caption: { en: 'Potting soil with white perlite: the easiest medium to start with.', cs: 'Zahradní substrát s bílým perlitem: nejjednodušší začátek.' },
          credit: 'r0bz · CC BY 2.0 (Flickr), resized'
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Soil', cs: 'Hlína' },
              glyph: 'seedling',
              points: [
                { en: 'Most forgiving, great first grow', cs: 'Nejvíc odpouští, ideální na první grow' },
                { en: 'Water every 2–4 days', cs: 'Zálivka každé 2–4 dny' },
                { en: 'pH 6.0–7.0, often little feeding at first', cs: 'pH 6,0–7,0, ze začátku často skoro bez hnojení' },
                { en: 'Slowest growth of the three', cs: 'Nejpomalejší růst ze všech tří' }
              ]
            },
            {
              title: { en: 'Coco', cs: 'Kokos' },
              glyph: 'water',
              points: [
                { en: 'Faster growth, lots of oxygen at the roots', cs: 'Rychlejší růst, hodně kyslíku u kořenů' },
                { en: 'Feed with almost every watering', cs: 'Hnojíš skoro při každé zálivce' },
                { en: 'pH 5.5–6.5, needs CalMag', cs: 'pH 5,5–6,5, potřebuje CalMag' },
                { en: 'Hard to overwater, easy to let dry out', cs: 'Těžko přeliješ, snadno přeschne' }
              ]
            },
            {
              title: { en: 'Hydro', cs: 'Hydro' },
              glyph: 'measure',
              points: [
                { en: 'Fastest growth, biggest potential', cs: 'Nejrychlejší růst, největší potenciál' },
                { en: 'Daily checks of pH, EC and water temp', cs: 'Denní kontrola pH, EC a teploty vody' },
                { en: 'pH 5.5–6.5, no buffer at all', cs: 'pH 5,5–6,5, žádná rezerva' },
                { en: 'Pump failure = trouble within hours', cs: 'Výpadek čerpadla = problém během pár hodin' }
              ]
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'First grow?', cs: 'První grow?' },
          md: {
            en: 'Pick a light, airy potting soil. Once you can read your plants, coco is the natural next step.',
            cs: 'Vezmi lehkou, vzdušnou hlínu. Až se naučíš rostliny číst, kokos je logický další krok.'
          }
        }
      ]
    },
    {
      id: 'media-soil',
      title: { en: 'Growing in soil', cs: 'Pěstování v hlíně' },
      minutes: 4,
      media: ['soil'],
      blocks: [
        {
          type: 'figure',
          illustration: 'medium-soil',
          caption: { en: 'Soil holds water and nutrients and releases them slowly.', cs: 'Hlína drží vodu i živiny a pouští je pomalu.' }
        },
        {
          type: 'text',
          md: {
            en: 'Soil works like a buffer: it holds water, nutrients and life, and smooths out small mistakes in pH or feeding. That is why it is the classic beginner medium.\n\nLook for a **light, well-draining mix**. Garden soil from the yard is too heavy and full of pests. Many growers add 20–30 % **perlite** for air and drainage.',
            cs: 'Hlína funguje jako polštář: drží vodu, živiny i život a vyhladí drobné chyby v pH nebo hnojení. Proto je to klasický substrát pro začátečníky.\n\nHledej **lehkou, dobře propustnou směs**. Hlína ze zahrady je moc těžká a plná škůdců. Hodně pěstitelů přidává 20–30 % **perlitu** kvůli vzduchu a odtoku.'
          }
        },
        {
          type: 'figure',
          photo: 'media-soil-seedling.webp',
          caption: { en: 'A seedling in a light soil mix. The perlite keeps it airy and drains well.', cs: 'Sazenice v lehké hlíně. Perlit ji drží vzdušnou a dobře odvádí vodu.' },
          credit: 'Grower · Public domain (Wikimedia Commons)'
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Light mix', cs: 'Light mix' },
              points: [
                { en: 'Few nutrients in the bag', cs: 'V pytli je málo živin' },
                { en: 'You start feeding after ~2 weeks', cs: 'Hnojit začínáš zhruba po 2 týdnech' },
                { en: 'Good for seedlings and autos', cs: 'Dobrý pro sazenice a automatky' }
              ]
            },
            {
              title: { en: 'All mix / pre-fertilized', cs: 'All mix / předhnojená' },
              points: [
                { en: 'Feeds the plant for 3–5 weeks', cs: 'Rostlinu krmí 3–5 týdnů' },
                { en: 'Too strong for tiny seedlings', cs: 'Pro malé sazenice moc silná' },
                { en: 'Feed only once the plant shows hunger', cs: 'Přihnojuj, až rostlina začne strádat' }
              ]
            },
            {
              title: { en: 'Living soil', cs: 'Živá půda' },
              points: [
                { en: 'Organic, microbes feed the plant', cs: 'Organická, rostlinu krmí mikroorganismy' },
                { en: 'Water only, no bottled nutrients', cs: 'Jen voda, žádná hnojiva z lahve' },
                { en: 'Needs big pots and patience', cs: 'Chce velké květináče a trpělivost' }
              ]
            }
          ]
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Water to pH 6.0–7.0', cs: 'Zalévej s pH 6,0–7,0' },
              md: { en: 'Around 6.3–6.8 is the sweet spot. Soil buffers, so small swings are fine.', cs: 'Ideál je kolem 6,3–6,8. Hlína pufruje, takže malé výkyvy nevadí.' }
            },
            {
              title: { en: 'Let it dry a bit', cs: 'Nech ji trochu proschnout' },
              md: { en: 'Water when the top 2–3 cm are dry and the pot feels light. Roots need air as much as water.', cs: 'Zalij, až je vrchní 2–3 cm suchá a květináč je lehký. Kořeny potřebují vzduch stejně jako vodu.' }
            },
            {
              title: { en: 'Feed lightly', cs: 'Hnoj opatrně' },
              md: { en: 'Start at a quarter to half of the label dose. Soil already contains nutrients.', cs: 'Začni na čtvrtině až polovině dávky z etikety. Hlína už nějaké živiny obsahuje.' }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Fungus gnats love wet soil', cs: 'Smutnice milují mokrou hlínu' },
          md: {
            en: 'Constantly damp topsoil invites them. Letting the top layer dry between waterings is the best prevention.',
            cs: 'Pořád vlhký povrch je přiláká. Nejlepší prevence je nechat vrchní vrstvu mezi zálivkami proschnout.'
          }
        }
      ]
    },
    {
      id: 'media-coco',
      title: { en: 'Growing in coco', cs: 'Pěstování v kokosu' },
      minutes: 4,
      media: ['coco'],
      blocks: [
        {
          type: 'figure',
          illustration: 'medium-coco',
          caption: { en: 'Coco fibre holds water and air at the same time, but no food.', cs: 'Kokosové vlákno drží vodu i vzduch zároveň, ale žádné živiny.' }
        },
        {
          type: 'text',
          md: {
            en: 'Coco coir is shredded coconut husk. It is almost inert: it gives roots structure, water and plenty of oxygen, but **no nutrients**. You feed with nearly every watering, which means faster growth and more control, but also more responsibility.',
            cs: 'Kokos je rozdrcená slupka kokosových ořechů. Je skoro inertní: kořenům dá strukturu, vodu a spoustu kyslíku, ale **žádné živiny**. Hnojíš skoro při každé zálivce. Znamená to rychlejší růst a víc kontroly, ale taky víc zodpovědnosti.'
          }
        },
        {
          type: 'figure',
          photo: 'media-coco-brick.webp',
          caption: { en: 'Coco often comes as a pressed brick. Soak it and it swells to several times its size.', cs: 'Kokos se často prodává jako lisovaná cihla. Po namočení nabobtná na několikanásobek.' },
          credit: 'MatiasMiika · CC BY 3.0 (Wikimedia Commons), resized'
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Buy buffered coco', cs: 'Kupuj pufrovaný kokos' },
              md: { en: 'Raw coco grabs calcium and magnesium and releases sodium. Buffered (pre-treated) coco does not. Mixing in 20–30 % perlite helps drainage.', cs: 'Nepufrovaný kokos vychytává vápník a hořčík a uvolňuje sodík. Pufrovaný (předupravený) ne. Přidání 20–30 % perlitu pomůže odtoku.' }
            },
            {
              title: { en: 'Pre-soak with nutrient solution', cs: 'Před výsadbou ho namoč v roztoku' },
              md: { en: 'Soak with a weak CalMag or nutrient solution at pH 5.8–6.0 before planting.', cs: 'Před výsadbou ho zalij slabým roztokem CalMagu nebo hnojiva s pH 5,8–6,0.' }
            },
            {
              title: { en: 'Feed every watering, aim for runoff', cs: 'Hnoj při každé zálivce, s výtokem' },
              md: { en: 'Water at pH 5.5–6.5 (sweet spot 5.8–6.2) until 10–20 % runs out the bottom. Runoff stops salts from building up.', cs: 'Zalévej s pH 5,5–6,5 (ideál 5,8–6,2), dokud spodem nevyteče 10–20 %. Výtok brání hromadění solí.' }
            },
            {
              title: { en: 'Never let it dry out', cs: 'Nikdy ho nenech vyschnout' },
              md: { en: 'Coco is hard to overwater but salts concentrate fast when it dries. Big plants may need watering daily or even several times a day.', cs: 'Kokos jde těžko přelít, ale když proschne, soli se rychle zakoncentrují. Velké rostliny můžou potřebovat zálivku denně i několikrát denně.' }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'Coco almost always needs extra calcium and magnesium. See [CalMag](/guide/nutrition#nutrition-calmag).',
            cs: 'Kokos skoro vždycky potřebuje extra vápník a hořčík. Mrkni na [CalMag](/guide/nutrition#nutrition-calmag).'
          }
        }
      ]
    },
    {
      id: 'media-hydro',
      title: { en: 'Hydroponics', cs: 'Hydroponie' },
      minutes: 5,
      media: ['hydro'],
      blocks: [
        {
          type: 'figure',
          illustration: 'medium-hydro',
          caption: { en: 'In DWC the roots hang in aerated nutrient water.', cs: 'V DWC visí kořeny v okysličeném živném roztoku.' }
        },
        {
          type: 'text',
          md: {
            en: 'In hydro the roots grow in water (or in an inert medium like clay pebbles or rockwool) and get everything from the nutrient solution. No buffer, so growth is fast and mistakes show up fast too.',
            cs: 'V hydru rostou kořeny ve vodě (nebo v inertním médiu jako keramzit či minerální vata) a všechno berou z živného roztoku. Žádná rezerva, takže růst je rychlý, ale chyby se projeví stejně rychle.'
          }
        },
        {
          type: 'figure',
          photo: 'media-hydro-buckets.webp',
          caption: { en: 'Two plants in hydro buckets in a tent. The roots sit in the solution under the lid.', cs: 'Dvě rostliny v hydro kbelících ve stanu. Kořeny jsou pod víkem v roztoku.' },
          credit: 'Plantlady223 · CC BY-SA 4.0 (Wikimedia Commons), resized'
        },
        {
          type: 'table',
          head: [
            { en: 'System', cs: 'Systém' },
            { en: 'How it works', cs: 'Jak funguje' },
            { en: 'For whom', cs: 'Pro koho' }
          ],
          rows: [
            [
              { en: 'DWC', cs: 'DWC' },
              { en: 'Roots in an aerated reservoir, air pump + air stone', cs: 'Kořeny v okysličené nádrži, vzduchovací čerpadlo + kámen' },
              { en: 'Simplest hydro to start with', cs: 'Nejjednodušší hydro na začátek' }
            ],
            [
              { en: 'Ebb & flow', cs: 'Ebb & flow (příliv/odliv)' },
              { en: 'A tray floods and drains on a timer', cs: 'Podnos se podle časovače zaplaví a zase vypustí' },
              { en: 'Several plants, clay pebbles', cs: 'Víc rostlin, keramzit' }
            ],
            [
              { en: 'Drip / rockwool', cs: 'Kapková závlaha / vata' },
              { en: 'Drippers feed blocks or pebbles several times a day', cs: 'Kapače krmí kostky nebo keramzit několikrát denně' },
              { en: 'Larger, automated setups', cs: 'Větší automatizované systémy' }
            ]
          ]
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Check pH and EC daily', cs: 'Kontroluj pH a EC denně' },
              md: { en: 'Keep pH at 5.5–6.5, ideally 5.6–6.0. Slow drift is normal, letting it wander through the range even helps uptake.', cs: 'Drž pH 5,5–6,5, ideálně 5,6–6,0. Pomalé kolísání je normální a když se v rozmezí trochu hýbe, příjmu to dokonce pomáhá.' }
            },
            {
              title: { en: 'Keep the water cool', cs: 'Drž vodu chladnou' },
              md: { en: '18–21 °C. Warmer water holds less oxygen and invites root rot.', cs: '18–21 °C. Teplejší voda drží méně kyslíku a láká hnilobu kořenů.' }
            },
            {
              title: { en: 'Change the reservoir', cs: 'Měň roztok' },
              md: { en: 'Every 7–10 days. Top up with plain pH-adjusted water in between.', cs: 'Každých 7–10 dní. Mezitím dolévej čistou vodu s upraveným pH.' }
            },
            {
              title: { en: 'Block all light', cs: 'Nepusť dovnitř světlo' },
              md: { en: 'Light in the reservoir grows algae. Use opaque containers.', cs: 'Světlo v nádrži = řasy. Používej neprůsvitné nádoby.' }
            }
          ]
        },
        {
          type: 'figure',
          photo: 'media-hydro-roots.webp',
          caption: { en: 'Healthy hydro roots: white, fine and firm.', cs: 'Zdravé hydro kořeny: bílé, jemné a pevné.' },
          credit: 'Banana patrol · CC BY-SA 3.0 (Wikimedia Commons), resized'
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Healthy roots are white', cs: 'Zdravé kořeny jsou bílé' },
          md: {
            en: 'Brown, slimy, smelly roots mean root rot. Check the air pump and water temperature first.',
            cs: 'Hnědé, slizké a páchnoucí kořeny znamenají hnilobu. Nejdřív zkontroluj vzduchování a teplotu vody.'
          }
        }
      ]
    },
    {
      id: 'media-pots',
      title: { en: 'Pots & drainage', cs: 'Květináče a odtok' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Roots need both water and air. Whatever pot you choose, it must let excess water out the bottom. A pot without drainage holes is a swamp in waiting.',
            cs: 'Kořeny potřebují vodu i vzduch. Ať zvolíš jakýkoli květináč, musí spodem pouštět přebytečnou vodu. Květináč bez děr je budoucí bažina.'
          }
        },
        {
          type: 'figure',
          photo: 'media-pots-plastic.webp',
          caption: { en: 'Young plants in plastic pots standing in saucers, so the runoff has somewhere to go.', cs: 'Mladé rostliny v plastových květináčích na podmiskách, aby měl výtok kam odtéct.' },
          credit: 'My 420 Tours · CC BY-SA 4.0 (Wikimedia Commons), resized'
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Fabric pots', cs: 'Textilní květináče' },
              points: [
                { en: 'Air-prune roots, no circling', cs: 'Kořeny se samy zaštipují, nekroutí se dokola' },
                { en: 'Dry out faster, harder to overwater', cs: 'Rychleji schnou, hůř se přelijí' },
                { en: 'Need watering more often', cs: 'Potřebují častější zálivku' }
              ]
            },
            {
              title: { en: 'Plastic pots', cs: 'Plastové květináče' },
              points: [
                { en: 'Cheap, hold moisture longer', cs: 'Levné, déle drží vlhkost' },
                { en: 'Pick ones with many holes', cs: 'Vyber ty s hodně dírami' },
                { en: 'Roots may circle the wall', cs: 'Kořeny se můžou točit podél stěny' }
              ]
            }
          ]
        },
        {
          type: 'table',
          head: [
            { en: 'Plant', cs: 'Rostlina' },
            { en: 'Final pot (soil/coco)', cs: 'Finální květináč (hlína/kokos)' }
          ],
          rows: [
            [{ en: 'Autoflower', cs: 'Automatka' }, { en: '11–15 L, plant straight into it', cs: '11–15 l, sázej rovnou do něj' }],
            [{ en: 'Photoperiod, short veg', cs: 'Fotoperioda, krátká vegetace' }, { en: '11–20 L', cs: '11–20 l' }],
            [{ en: 'Photoperiod, long veg / SCROG', cs: 'Fotoperioda, dlouhá vegetace / SCROG' }, { en: '20–40 L', cs: '20–40 l' }]
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Photoperiod plants usually go seedling cup → ~3 L → final pot. Autos dislike transplant stress, so plant them in the final pot from day one. More in [transplanting](/guide/vegetative).',
            cs: 'Fotoperiody obvykle putují kelímek → cca 3 l → finální květináč. Automatky stres z přesazení nemají rády, takže je sázej rovnou do finálního. Víc v kapitole o [přesazování](/guide/vegetative).'
          }
        },
        {
          type: 'callout',
          tone: 'warning',
          md: {
            en: 'Never leave the pot standing in runoff. Empty the saucer within 30 minutes or raise the pot on a stand.',
            cs: 'Nikdy nenechávej květináč stát ve vyteklé vodě. Podmisku vylij do 30 minut, nebo květináč podlož.'
          }
        }
      ]
    },
    {
      id: 'media-watering',
      title: { en: 'How to water', cs: 'Jak zalévat' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'More plants die from too much love than from thirst. Watering is not about a schedule, it is about **reading the pot**. Lift it right after watering and remember the weight. Water again when it feels clearly lighter.',
            cs: 'Víc rostlin zahyne z přehnané péče než žízní. Zálivka není o rozvrhu, ale o **čtení květináče**. Po zálivce ho zvedni a zapamatuj si váhu. Znovu zalij, až bude znatelně lehčí.'
          }
        },
        {
          type: 'figure',
          photo: 'media-watering-seedlings.webp',
          caption: { en: 'Fresh sprouts need just a little water around the stem, not a soaked pot.', cs: 'Čerstvým klíčkům stačí trocha vody kolem stonku, ne promáčený květináč.' },
          credit: 'rawpixel · CC0 1.0 (rawpixel)'
        },
        {
          type: 'interactive',
          widget: 'watering',
          caption: { en: 'Pick pot size and medium for a rule-of-thumb amount.', cs: 'Vyber velikost květináče a substrát a dostaneš orientační dávku.' }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Water slowly and evenly', cs: 'Zalévej pomalu a rovnoměrně' },
              md: { en: 'Pour in circles over the whole surface so the entire root ball gets wet, not just one channel.', cs: 'Lij v kruzích po celé ploše, ať se provlhčí celý bal, ne jen jeden kanálek.' }
            },
            {
              title: { en: 'Aim for 10–20 % runoff', cs: 'Cíl je 10–20 % výtoku' },
              md: { en: 'Roughly a quarter of the pot volume per watering for a grown plant (about 2.5 L in an 11 L pot). Soil can do with less runoff, coco needs it every time.', cs: 'U vzrostlé rostliny zhruba čtvrtina objemu květináče na zálivku (asi 2,5 l do 11l květináče). Hlíně stačí menší výtok, kokos ho potřebuje pokaždé.' }
            },
            {
              title: { en: 'Wait for the right moment', cs: 'Počkej na správný moment' },
              md: { en: 'Soil: top 2–3 cm dry and a light pot. Coco: before it dries out, often daily. Hydro: the system does it for you.', cs: 'Hlína: vrchní 2–3 cm suché a lehký květináč. Kokos: dřív, než proschne, často denně. Hydro: to za tebe řeší systém.' }
            },
            {
              title: { en: 'Seedlings drink little', cs: 'Sazenice pijí málo' },
              md: { en: 'In a big pot, water only a small circle around the stem and widen it as the roots grow.', cs: 'Ve velkém květináči zalévej jen malý kruh kolem stonku a rozšiřuj ho, jak rostou kořeny.' }
            }
          ]
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Overwatered', cs: 'Přelitá' },
              points: [
                { en: 'Leaves droop but feel firm and swollen', cs: 'Listy visí, ale jsou pevné a nafouklé' },
                { en: 'Pot stays heavy for days', cs: 'Květináč je těžký několik dní' },
                { en: 'Fix: wait, improve drainage', cs: 'Řešení: počkej, zlepši odtok' }
              ]
            },
            {
              title: { en: 'Underwatered', cs: 'Žíznivá' },
              points: [
                { en: 'Leaves limp, thin and papery', cs: 'Listy povadlé, tenké a papírové' },
                { en: 'Pot very light, soil pulls from the wall', cs: 'Květináč je lehký, hlína odstupuje od stěny' },
                { en: 'Fix: water slowly in two rounds', cs: 'Řešení: zalij pomalu ve dvou kolech' }
              ]
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Use room-temperature water (around 20 °C). Let tap water stand for a few hours or check its EC so you know what you are starting with.',
            cs: 'Používej vodu pokojové teploty (kolem 20 °C). Vodu z kohoutku nech pár hodin odstát, nebo jí změř EC, ať víš, s čím začínáš.'
          }
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'media-q1',
              q: { en: 'Which medium is most forgiving for a first grow?', cs: 'Který substrát nejvíc odpouští na prvním growu?' },
              options: [
                { en: 'Soil', cs: 'Hlína' },
                { en: 'Coco', cs: 'Kokos' },
                { en: 'DWC hydro', cs: 'DWC hydro' },
                { en: 'Rockwool', cs: 'Minerální vata' }
              ],
              correct: 0,
              explain: {
                en: 'Soil buffers pH and nutrients, so small mistakes show up slowly and are easy to fix.',
                cs: 'Hlína pufruje pH i živiny, takže drobné chyby se projevují pomalu a snadno se opraví.'
              }
            },
            {
              id: 'media-q2',
              q: { en: 'What pH range should you aim for in coco?', cs: 'Jaké pH je ideální pro kokos?' },
              options: [
                { en: '4.5–5.0', cs: '4,5–5,0' },
                { en: '5.5–6.5', cs: '5,5–6,5' },
                { en: '6.5–7.5', cs: '6,5–7,5' },
                { en: 'pH does not matter in coco', cs: 'V kokosu na pH nezáleží' }
              ],
              correct: 1,
              explain: {
                en: 'Coco and hydro work best at 5.5–6.5. Soil sits higher, at 6.0–7.0.',
                cs: 'Kokos a hydro fungují nejlíp při 5,5–6,5. Hlína je výš, na 6,0–7,0.'
              }
            },
            {
              id: 'media-q3',
              q: { en: 'Why do coco growers water to runoff every time?', cs: 'Proč se v kokosu zalévá pokaždé s výtokem?' },
              options: [
                { en: 'To cool the roots', cs: 'Aby se zchladily kořeny' },
                { en: 'To wash out the coco fibre', cs: 'Aby se vymylo kokosové vlákno' },
                { en: 'To stop salts from building up', cs: 'Aby se nehromadily soli' },
                { en: 'Runoff is not needed in coco', cs: 'V kokosu výtok potřeba není' }
              ],
              correct: 2,
              explain: {
                en: 'You feed with every watering, so 10–20 % runoff keeps the salt level in the root zone stable.',
                cs: 'Hnojíš při každé zálivce, takže 10–20 % výtoku drží hladinu solí u kořenů stabilní.'
              }
            },
            {
              id: 'media-q4',
              q: { en: 'Leaves droop but feel firm and the pot is heavy. What is likely going on?', cs: 'Listy visí, ale jsou pevné a květináč je těžký. Co se nejspíš děje?' },
              options: [
                { en: 'Thirst, water right away', cs: 'Žízeň, hned zalij' },
                { en: 'Overwatering, let it dry', cs: 'Přelití, nech proschnout' },
                { en: 'Nitrogen deficiency', cs: 'Nedostatek dusíku' },
                { en: 'Too little light', cs: 'Málo světla' }
              ],
              correct: 1,
              explain: {
                en: 'Firm, swollen drooping leaves plus a heavy pot are the classic sign of roots short on air.',
                cs: 'Pevné, nafouklé povislé listy a těžký květináč jsou klasický znak kořenů, kterým chybí vzduch.'
              }
            },
            {
              id: 'media-q5',
              q: { en: 'What water temperature suits a DWC reservoir?', cs: 'Jaká teplota vody sedí DWC nádrži?' },
              options: [
                { en: '10–14 °C', cs: '10–14 °C' },
                { en: '18–21 °C', cs: '18–21 °C' },
                { en: '24–28 °C', cs: '24–28 °C' },
                { en: 'As warm as possible', cs: 'Co nejteplejší' }
              ],
              correct: 1,
              explain: {
                en: 'Around 18–21 °C keeps enough dissolved oxygen. Warmer water invites root rot.',
                cs: 'Kolem 18–21 °C drží voda dost rozpuštěného kyslíku. Teplejší voda láká hnilobu kořenů.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
