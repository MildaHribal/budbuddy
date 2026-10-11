import type { Chapter } from '../types'

export default {
  id: 'vegetative',
  order: 5,
  title: { en: 'Vegetative growth', cs: 'Vegetace' },
  summary: {
    en: 'Build a big, healthy plant: light and climate for veg, watering and feeding, transplanting and telling males from females.',
    cs: 'Vypěstuj velkou a zdravou rostlinu: světlo a klima ve vegetaci, zálivka a hnojení, přesazování a rozpoznání samců od samic.'
  },
  glyph: 'vegetative',
  color: '#9be36b',
  lessons: [
    {
      id: 'vegetative-light-climate',
      title: { en: 'Light & climate in veg', cs: 'Světlo a klima ve vegetaci' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'In the vegetative stage the plant grows stems, leaves and roots – the "factory" that will later feed your buds. It does not flower yet, so photoperiods are kept on a **long day: 18/6** (18 hours light, 6 dark). Some growers run 20/4; 24/0 brings little extra and costs power.',
            cs: 'Ve vegetaci rostlina staví stonky, listy a kořeny – „továrnu“, která později nakrmí palice. Ještě nekvete, takže fotoperiodické rostliny držíš na **dlouhém dni: 18/6** (18 hodin světla, 6 tmy). Někdo jede 20/4; 24/0 přidá málo a stojí elektřinu navíc.'
          }
        },
        {
          type: 'interactive',
          widget: 'photoperiod',
          caption: {
            en: 'Compare 18/6, 20/4 and 12/12 – only 12/12 triggers flowering in photoperiods.',
            cs: 'Porovnej 18/6, 20/4 a 12/12 – kvetení u fotoperiodických rostlin spustí až 12/12.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Parameter', cs: 'Parametr' },
            { en: 'Veg target', cs: 'Cíl ve vegetaci' }
          ],
          rows: [
            [{ en: 'Light intensity', cs: 'Intenzita světla' }, { en: '400–600 PPFD (up to ~700 late veg)', cs: '400–600 PPFD (koncem vegetace až ~700)' }],
            [{ en: 'Temperature (lights on)', cs: 'Teplota (světlo zapnuté)' }, { en: '22–28 °C', cs: '22–28 °C' }],
            [{ en: 'Temperature (lights off)', cs: 'Teplota (světlo vypnuté)' }, { en: '18–24 °C, max ~5 °C lower', cs: '18–24 °C, max o ~5 °C níž' }],
            [{ en: 'Humidity', cs: 'Vlhkost' }, { en: '55–70 %', cs: '55–70 %' }],
            [{ en: 'VPD', cs: 'VPD' }, { en: '0.8–1.2 kPa', cs: '0,8–1,2 kPa' }]
          ]
        },
        {
          type: 'interactive',
          widget: 'vpd',
          caption: {
            en: 'Set your tent temperature and humidity to see if you are in the veg sweet spot.',
            cs: 'Nastav teplotu a vlhkost ve stanu a uvidíš, jestli jsi v ideální zóně pro vegetaci.'
          }
        },
        {
          type: 'interactive',
          widget: 'light-calc',
          caption: {
            en: 'Not sure your lamp is strong enough for your area? Check here.',
            cs: 'Nevíš, jestli tvoje lampa stačí na tvou plochu? Spočítej si to.'
          }
        },
        {
          type: 'callout',
          tone: 'warning',
          md: {
            en: 'The dark period must be really dark for photoperiods. Light leaks don\'t matter much in veg, but get into the habit now – in flower they can cause hermaphrodites.',
            cs: 'Tma musí být u fotoperiodek opravdu tma. Ve vegetaci prosvítání tolik nevadí, ale zvykni si to hlídat už teď – v kvetení může způsobit hermafrodity.'
          }
        }
      ]
    },
    {
      id: 'vegetative-watering-feeding',
      title: { en: 'Watering & feeding basics', cs: 'Základy zálivky a hnojení' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'The golden rule: **water thoroughly, then let it dry**. In soil, wait until the pot feels clearly lighter and the top 2–3 cm are dry. Coco likes it more often – daily or every other day once roots fill the pot – with 10–20 % runoff each time.',
            cs: 'Zlaté pravidlo: **zalij pořádně a pak nech proschnout**. V hlíně počkej, až je květináč znatelně lehčí a vrchní 2–3 cm jsou suché. Kokos chce zálivku častěji – jakmile kořeny prorostou květináč, denně nebo obden – a pokaždé s 10–20 % odtoku.'
          }
        },
        {
          type: 'interactive',
          widget: 'watering',
          caption: {
            en: 'Rule-of-thumb volume and frequency for your pot and medium.',
            cs: 'Orientační množství a frekvence zálivky pro tvůj květináč a substrát.'
          }
        },
        {
          type: 'text',
          md: {
            en: 'In veg the plant wants mainly **nitrogen (N)** – use a "grow" fertilizer. Start at **half the dose on the label** and raise it slowly while the leaves stay deep green without burnt tips.',
            cs: 'Ve vegetaci rostlina chce hlavně **dusík (N)** – použij růstové hnojivo („grow“). Začni na **polovině dávky z etikety** a pomalu přidávej, dokud zůstávají listy sytě zelené a bez spálených špiček.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Medium', cs: 'Substrát' },
            { en: 'pH', cs: 'pH' },
            { en: 'EC in veg', cs: 'EC ve vegetaci' }
          ],
          rows: [
            [{ en: 'Soil', cs: 'Hlína' }, { en: '6.0–7.0', cs: '6,0–7,0' }, { en: '0.8–1.4 (often plain water for the first weeks)', cs: '0,8–1,4 (první týdny často jen voda)' }],
            [{ en: 'Coco', cs: 'Kokos' }, { en: '5.5–6.5', cs: '5,5–6,5' }, { en: '0.8–1.6', cs: '0,8–1,6' }],
            [{ en: 'Hydro', cs: 'Hydro' }, { en: '5.5–6.5', cs: '5,5–6,5' }, { en: '0.8–1.6', cs: '0,8–1,6' }]
          ]
        },
        {
          type: 'interactive',
          widget: 'ph-availability',
          props: { medium: 'soil' },
          caption: {
            en: 'Slide the pH to see which nutrients the roots can actually take up.',
            cs: 'Posuň pH a uvidíš, které živiny kořeny opravdu dokážou přijmout.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'More detail on schedules, CalMag and overfeeding is in [Feeding](/guide/nutrition). If something looks off, go to [Problems & diagnosis](/guide/problems).',
            cs: 'Víc o hnojicích plánech, CalMagu a přehnojení najdeš v kapitole [Hnojení](/guide/nutrition). Když něco nevypadá dobře, mrkni do [Problémů a diagnostiky](/guide/problems).'
          }
        }
      ]
    },
    {
      id: 'vegetative-transplanting',
      title: { en: 'Transplanting', cs: 'Přesazování' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Photoperiods are usually moved up once or twice: seedling cup → 2–4 l → final pot (11–25 l is common indoors). Transplant when the **roots reach the edges** and the rootball holds together, but before they circle the pot. Usually that is 4–6 nodes or when the plant drinks its cup dry within a day.',
            cs: 'Fotoperiodky se obvykle přesazují jednou nebo dvakrát: kelímek → 2–4 l → finální květináč (indoor běžně 11–25 l). Přesazuj, když **kořeny dosáhnou okrajů** a bal drží pohromadě, ale dřív, než začnou kroužit dokola. Typicky při 4–6 patrech nebo když rostlina vypije kelímek za den.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Water a day before', cs: 'Den předem zalij' },
              md: {
                en: 'A slightly moist rootball slides out in one piece. Too dry crumbles, too wet falls apart.',
                cs: 'Mírně vlhký kořenový bal vyklouzne vcelku. Suchý se drolí, mokrý se rozpadne.'
              }
            },
            {
              title: { en: 'Prepare the new pot', cs: 'Připrav nový květináč' },
              md: {
                en: 'Fill it, pre-moisten the medium and make a hole the size of the old pot.',
                cs: 'Naplň ho, substrát předem navlhči a udělej v něm díru velkou jako starý květináč.'
              }
            },
            {
              title: { en: 'Flip and slide out', cs: 'Otoč a vyklop' },
              md: {
                en: 'Hold the stem between your fingers, turn the pot upside down and tap it. Don\'t pull on the plant.',
                cs: 'Stonek drž mezi prsty, květináč otoč dnem vzhůru a poklepej na něj. Za rostlinu netahej.'
              }
            },
            {
              title: { en: 'Set in and water lightly', cs: 'Usaď a lehce zalij' },
              md: {
                en: 'Put it in the hole (a stretched stem can go deeper), firm the medium gently and water to settle it. Keep the light a bit softer for 1–2 days.',
                cs: 'Vlož do díry (vytáhlý stonek můžeš zasadit hlouběji), jemně přitlač substrát a zalij, aby se usadil. 1–2 dny drž světlo o něco slabší.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Autos', cs: 'Automatky' },
          md: {
            en: 'Avoid transplanting autos – sow them in the final pot (usually 11–15 l). If you must, do it only once and early, in the first 2 weeks.',
            cs: 'Automatky radši nepřesazuj – zasaď je rovnou do finálního květináče (obvykle 11–15 l). Když už musíš, tak jen jednou a brzy, do 2 týdnů.'
          }
        }
      ]
    },
    {
      id: 'vegetative-how-long',
      title: { en: 'How long to veg', cs: 'Jak dlouho nechat ve vegetaci' },
      minutes: 3,
      blocks: [
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Autoflowers', cs: 'Automatky' },
              glyph: 'seedling',
              points: [
                { en: 'You don\'t decide – they start flowering on their own after ~3–5 weeks', cs: 'Nerozhoduješ ty – začnou kvést samy po ~3–5 týdnech' },
                { en: 'Keep 18/6 (or 20/4) from seed to harvest', cs: 'Od semínka po sklizeň drž 18/6 (nebo 20/4)' },
                { en: 'Any stress in veg directly shrinks the plant', cs: 'Každý stres ve vegetaci rostlinu přímo zmenší' }
              ]
            },
            {
              title: { en: 'Photoperiods', cs: 'Fotoperiodky' },
              glyph: 'vegetative',
              points: [
                { en: 'Veg as long as you want – they flower when you switch to 12/12', cs: 'Vegetují, jak dlouho chceš – kvést začnou po přepnutí na 12/12' },
                { en: 'Typical indoor veg: 4–8 weeks', cs: 'Běžná vegetace indoor: 4–8 týdnů' },
                { en: 'Outdoors the season decides – they flip as days shorten', cs: 'Venku rozhoduje sezóna – kvést začnou, když se zkracují dny' }
              ]
            }
          ]
        },
        {
          type: 'text',
          md: {
            en: 'The main rule for photoperiods indoors: **flip when the plant is about half the height you want at the end.** In flower it will stretch to roughly 1.5–2× (sativa-dominant strains even more). Leave room for the lamp distance above the canopy.',
            cs: 'Hlavní pravidlo pro fotoperiodky indoor: **přepni, když má rostlina zhruba polovinu výšky, kterou chceš mít na konci.** V kvetení se natáhne zhruba 1,5–2× (sativy i víc). Počítej i s místem na odstup lampy nad vrcholky.'
          }
        },
        {
          type: 'interactive',
          widget: 'grow-timeline',
          props: { type: 'photo' },
          caption: {
            en: 'A whole photoperiod grow at a glance – veg is the part you control.',
            cs: 'Celý pěstební cyklus fotoperiodky na jednom místě – vegetace je ta část, kterou řídíš ty.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Training (see [Plant training](/guide/training)) is done in veg. For photoperiods, add a week of veg for every major training step so the plant can recover.',
            cs: 'Tvarování (viz [Tvarování rostlin](/guide/training)) se dělá ve vegetaci. U fotoperiodek přidej za každý větší zásah týden vegetace navíc, ať se rostlina stihne zotavit.'
          }
        }
      ]
    },
    {
      id: 'vegetative-sexing',
      title: { en: 'Sexing & pre-flowers', cs: 'Určení pohlaví a předkvěty' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Cannabis has male and female plants. Only **females** make the resinous buds; males make pollen sacs, and pollen turns sinsemilla buds into seedy ones. With **feminized seeds** nearly all plants are female, but with **regular seeds** expect roughly half males.',
            cs: 'Konopí má samčí a samičí rostliny. Pryskyřičné palice tvoří jen **samice**; samci tvoří pylové váčky a opylené palice pak místo pryskyřice cpou energii do semen. U **feminizovaných semínek** jsou skoro všechny rostliny samice, u **regulárních** počítej zhruba s polovinou samců.'
          }
        },
        {
          type: 'figure',
          illustration: 'pre-flowers',
          caption: {
            en: 'Pre-flowers at the nodes: female – a teardrop calyx with white hairs (pistils). Male – a small round ball on a short stalk, no hairs.',
            cs: 'Předkvěty v uzlech: samice – kapkovitý kalich s bílými chloupky (pestíky). Samec – malá kulička na krátké stopce, bez chloupků.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'When to look', cs: 'Kdy se dívat' },
              md: {
                en: 'Photoperiods usually show pre-flowers after 4–6 weeks from seed, even under 18/6. Autos show them at around 3–4 weeks.',
                cs: 'Fotoperiodky obvykle ukážou předkvěty po 4–6 týdnech od semínka, i na 18/6. Automatky zhruba ve 3–4 týdnech.'
              }
            },
            {
              title: { en: 'Where to look', cs: 'Kam se dívat' },
              md: {
                en: 'At the nodes – where side branches meet the main stem, behind the small leaf-like stipules. Start at the upper nodes.',
                cs: 'Do uzlů – tam, kde boční větve vyrůstají z hlavního stonku, za malými lístkovitými palisty. Začni u horních pater.'
              }
            },
            {
              title: { en: 'Use a magnifier', cs: 'Vezmi lupu' },
              md: {
                en: 'A 30–60× loupe or a phone macro lens helps a lot. Wait until you see **hairs** (female) or clearly round sacs (male) – a young bump can be either.',
                cs: 'Hodně pomůže lupa 30–60× nebo makro čočka na mobil. Počkej, až uvidíš **chloupky** (samice), nebo jasně kulaté váčky (samec) – mladý výrůstek může být obojí.'
              }
            },
            {
              title: { en: 'Remove males early', cs: 'Samce odstraň včas' },
              md: {
                en: 'Remove confirmed males before the sacs open. One male can pollinate a whole tent. Bag it carefully on the way out.',
                cs: 'Potvrzené samce odstraň dřív, než se váčky otevřou. Jeden samec dokáže opylit celý stan. Při vynášení ho opatrně zabal do pytle.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Both on one plant?', cs: 'Obojí na jedné rostlině?' },
          md: {
            en: 'A plant showing both pistils and pollen sacs is a hermaphrodite. Learn what to do in [Problems & diagnosis](/guide/problems).',
            cs: 'Rostlina, která má pestíky i pylové váčky zároveň, je hermafrodit. Co s ní, se dozvíš v [Problémech a diagnostice](/guide/problems).'
          }
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'veg-q1',
              q: { en: 'What light schedule keeps photoperiods in veg?', cs: 'Jaký světelný režim drží fotoperiodky ve vegetaci?' },
              options: [
                { en: '12/12', cs: '12/12' },
                { en: '18/6', cs: '18/6' },
                { en: '10/14', cs: '10/14' },
                { en: '6/18', cs: '6/18' }
              ],
              correct: 1,
              explain: {
                en: 'A long day (18/6 or 20/4) keeps them growing; switching to 12/12 triggers flowering.',
                cs: 'Dlouhý den (18/6 nebo 20/4) je drží v růstu; přepnutí na 12/12 spustí kvetení.'
              }
            },
            {
              id: 'veg-q2',
              q: { en: 'Which nutrient does the plant need most in veg?', cs: 'Kterou živinu rostlina ve vegetaci potřebuje nejvíc?' },
              options: [
                { en: 'Phosphorus', cs: 'Fosfor' },
                { en: 'Nitrogen', cs: 'Dusík' },
                { en: 'Iron', cs: 'Železo' },
                { en: 'Sulfur', cs: 'Síru' }
              ],
              correct: 1,
              explain: {
                en: 'Nitrogen drives leaf and stem growth – that is why grow fertilizers are N-heavy.',
                cs: 'Dusík pohání růst listů a stonků – proto mají růstová hnojiva hodně N.'
              }
            },
            {
              id: 'veg-q3',
              q: { en: 'When is the right time to transplant?', cs: 'Kdy je správný čas na přesazení?' },
              options: [
                { en: 'Right after sprouting', cs: 'Hned po vyklíčení' },
                { en: 'When roots reach the edges but before they circle', cs: 'Když kořeny dosáhnou okrajů, ale ještě nekroužkují' },
                { en: 'Mid-flowering', cs: 'V polovině kvetení' },
                { en: 'Only when leaves turn yellow', cs: 'Až když listy zežloutnou' }
              ],
              correct: 1,
              explain: {
                en: 'The rootball holds together and the plant has room to grow on before it gets rootbound.',
                cs: 'Kořenový bal drží pohromadě a rostlina má prostor růst dál, než se kořeny zamotají.'
              }
            },
            {
              id: 'veg-q4',
              q: { en: 'When should you flip a photoperiod to 12/12 indoors?', cs: 'Kdy přepnout fotoperiodku indoor na 12/12?' },
              options: [
                { en: 'When it reaches the final height you want', cs: 'Až dosáhne cílové výšky' },
                { en: 'At about half the final height you want', cs: 'Zhruba v polovině cílové výšky' },
                { en: 'Always after exactly 2 weeks', cs: 'Vždycky přesně po 2 týdnech' },
                { en: 'When pre-flowers appear', cs: 'Až se objeví předkvěty' }
              ],
              correct: 1,
              explain: {
                en: 'Plants stretch about 1.5–2× in early flower, so flipping at full height leaves you out of room.',
                cs: 'Rostliny se na začátku kvetení natáhnou zhruba 1,5–2×, takže přepnutí v cílové výšce by ti nechalo málo místa.'
              }
            },
            {
              id: 'veg-q5',
              q: { en: 'How do you recognize a female pre-flower?', cs: 'Jak poznáš samičí předkvět?' },
              options: [
                { en: 'Round ball on a stalk', cs: 'Kulička na stopce' },
                { en: 'Teardrop calyx with white hairs', cs: 'Kapkovitý kalich s bílými chloupky' },
                { en: 'Yellow leaf tips', cs: 'Žluté špičky listů' },
                { en: 'Purple stem', cs: 'Fialový stonek' }
              ],
              correct: 1,
              explain: {
                en: 'The white hairs (pistils) are the giveaway. Round sacs without hairs mean a male.',
                cs: 'Prozradí ji bílé chloupky (pestíky). Kulaté váčky bez chloupků znamenají samce.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
