import type { Chapter } from '../types'

export default {
  id: 'harvest',
  order: 9,
  title: { en: 'Harvest, drying & curing', cs: 'Sklizeň, sušení a zrání' },
  summary: {
    en: 'Chop day, wet vs dry trim, slow drying at about 18–20 °C and 60 % RH, and curing in jars — the steps that decide how your harvest smells and smokes.',
    cs: 'Den sklizně, mokrý a suchý střih, pomalé sušení kolem 18–20 °C a 60 % a zrání ve sklenicích — kroky, které rozhodnou, jak bude úroda vonět a chutnat.'
  },
  glyph: 'harvest',
  color: '#ffd28a',
  lessons: [
    {
      id: 'harvest-chop-day',
      title: { en: 'Chop day', cs: 'Den sklizně' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'When the [trichomes](/guide/flowering#flowering-when-to-harvest) say it\'s time, prepare your drying space **before** you cut. Freshly cut plants start drying immediately, so the room should already be at the right climate.',
            cs: 'Až ti [trichomy](/guide/flowering#flowering-when-to-harvest) řeknou, že je čas, připrav si sušárnu **dřív**, než začneš stříhat. Čerstvě uříznuté rostliny začnou schnout hned, takže místnost už musí mít správné klima.'
          }
        },
        {
          type: 'figure',
          photo: 'harvest-ripe-cola.webp',
          caption: { en: 'A ripe cola on chop day: swollen, sticky and covered in trichomes.', cs: 'Zralá palice v den sklizně: nabitá, lepkavá a pokrytá trichomy.' },
          credit: 'bshamblen · CC BY 2.0 (Flickr), resized'
        },
        {
          type: 'checklist',
          id: 'harvest-chop-prep',
          items: [
            { en: 'Drying space dark and stable at 18–20 °C, 55–62 % RH', cs: 'Sušárna je tmavá a stabilně na 18–20 °C a 55–62 % vlhkosti' },
            { en: 'Hygrometer in the drying space (check it against another one)', cs: 'Vlhkoměr v sušárně (porovnej ho s jiným)' },
            { en: 'Sharp, clean scissors plus small trimming scissors', cs: 'Ostré čisté nůžky a malé nůžky na střih' },
            { en: 'Gloves and isopropyl alcohol to clean sticky blades', cs: 'Rukavice a izopropylalkohol na čištění lepkavých čepelí' },
            { en: 'Line, hangers or a drying net ready', cs: 'Připravený provázek, ramínka nebo sušicí síť' },
            { en: 'Kitchen scale for wet weight', cs: 'Kuchyňská váha na mokrou váhu' }
          ]
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Stop watering a day or two before', cs: 'Den dva předem přestaň zalévat' },
              md: {
                en: 'A slightly dry pot means less water in the plant and a smoother start to drying. Don\'t let it wilt hard.',
                cs: 'Lehce proschlý květináč znamená míň vody v rostlině a klidnější začátek sušení. Nenech ji ale úplně zvadnout.'
              }
            },
            {
              title: { en: 'Cut in the morning, before lights on', cs: 'Stříhej ráno, než se rozsvítí' },
              md: {
                en: 'Terpenes are at their freshest after the dark period. Long dark periods (24–48 h) before chop are optional — there is no solid proof they help.',
                cs: 'Terpeny jsou po noční tmě nejsvěžejší. Dlouhá tma (24–48 h) před sklizní je volitelná — žádný pádný důkaz, že pomáhá, není.'
              }
            },
            {
              title: { en: 'Cut whole plant or by branch', cs: 'Řež celou rostlinu nebo po větvích' },
              md: {
                en: 'Hanging the whole plant dries slowest (good in dry rooms). Branches are easier to fit and handle.',
                cs: 'Celá zavěšená rostlina schne nejpomaleji (hodí se pro suché místnosti). Větve se líp vejdou a líp se s nimi pracuje.'
              }
            },
            {
              title: { en: 'Weigh it', cs: 'Zvaž to' },
              md: {
                en: 'Log the **wet weight** in BudBuddy when you mark the harvest. Later you add the dry weight and see how much water you lost — usually 70–80 %.',
                cs: 'Při zápisu sklizně v BudBuddy zadej **mokrou váhu**. Později doplníš suchou váhu a uvidíš, kolik vody odešlo — obvykle 70–80 %.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'Only harvest and keep what is legal where you live, and keep it for personal use.',
            cs: 'Sklízej a uchovávej jen tolik, kolik je tam, kde žiješ, legální, a jen pro vlastní potřebu.'
          }
        }
      ]
    },
    {
      id: 'harvest-trim',
      title: { en: 'Wet vs dry trim', cs: 'Mokrý vs. suchý střih' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Trimming removes the leaves around buds. Fan leaves always go first. The **sugar leaves** (small, resin-covered leaves sticking out of the bud) you can trim right away or after drying.',
            cs: 'Střihem odstraníš listy kolem palic. Velké listy jdou pryč vždycky jako první. **Cukrové lístky** (malé, pryskyřicí obalené lístky trčící z palice) můžeš ostříhat hned, nebo až po usušení.'
          }
        },
        {
          type: 'figure',
          photo: 'harvest-trimming.webp',
          caption: { en: 'Trimming with small scissors and gloves on: resin sticks to everything.', cs: 'Trimování malými nůžkami a v rukavicích: pryskyřice se lepí na všechno.' },
          credit: 'Cannabis Tours · CC BY-SA 4.0 (Wikimedia Commons), resized'
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Wet trim (right after chop)', cs: 'Mokrý střih (hned po sklizni)' },
              glyph: 'harvest',
              points: [
                { en: 'Leaves stand out and are easy to snip.', cs: 'Lístky odstávají a snadno se stříhají.' },
                { en: 'Faster drying — good in humid rooms.', cs: 'Rychlejší sušení — dobré do vlhčích místností.' },
                { en: 'Takes less space; buds can dry on a net.', cs: 'Zabere míň místa, palice můžou schnout na síti.' },
                { en: 'Very sticky, messy work.', cs: 'Hodně lepkavá a upatlaná práce.' }
              ]
            },
            {
              title: { en: 'Dry trim (after drying)', cs: 'Suchý střih (po usušení)' },
              glyph: 'drying',
              points: [
                { en: 'Leaves protect buds and slow the dry — good in dry rooms.', cs: 'Lístky palice chrání a zpomalují sušení — dobré do suchých místností.' },
                { en: 'Often better smell and smoother smoke.', cs: 'Často lepší vůně a jemnější kouř.' },
                { en: 'Trichomes are brittle; handle gently.', cs: 'Trichomy jsou křehké, zacházej s tím jemně.' },
                { en: 'Needs hanging space.', cs: 'Potřebuješ místo na věšení.' }
              ]
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'Many growers do both', cs: 'Hodně lidí dělá obojí' },
          md: {
            en: 'Strip the fan leaves wet, hang the branches with sugar leaves on, and do the fine trim when dry. It\'s a good default for beginners.',
            cs: 'Velké listy otrhej za mokra, větve pověs i s cukrovými lístky a jemný střih udělej po usušení. Pro začátečníka dobrá výchozí volba.'
          }
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'Keep the resin-covered trim in a bag in the freezer — it can be used for simple homemade infusions such as butter or oil. Skip anything involving solvents.',
            cs: 'Pryskyřičné odstřižky si schovej v sáčku v mrazáku — dají se použít na jednoduché domácí výluhy, třeba do másla nebo oleje. Cokoli s rozpouštědly vynech.'
          }
        }
      ]
    },
    {
      id: 'harvest-drying',
      title: { en: 'Drying', cs: 'Sušení' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Slow drying is where quality is made or lost. Too fast (hot, dry, windy) and buds taste like hay. Too slow and humid and they go mouldy. The target growers call **60/60** — about 60 °F (15–16 °C) and 60 % RH — is the classic; at home **18–20 °C and 55–62 %** works well.',
            cs: 'Při pomalém sušení se kvalita buď vytvoří, nebo ztratí. Moc rychle (teplo, sucho, průvan) a palice chutnají jako seno. Moc pomalu a vlhko a zplesniví. Klasikou je **60/60** — asi 15–16 °C a 60 % vlhkosti; doma dobře funguje **18–20 °C a 55–62 %**.'
          }
        },
        { type: 'figure', illustration: 'drying-hang', caption: { en: 'Branches hung upside down with space between them, in the dark.', cs: 'Větve zavěšené vzhůru nohama s mezerami mezi sebou, ve tmě.' } },
        {
          type: 'figure',
          photo: 'harvest-hanging-bud.webp',
          caption: { en: 'A whole branch hanging upside down to dry.', cs: 'Celá větev zavěšená vzhůru nohama, aby schla.' },
          credit: 'eggrole · CC BY 2.0 (Flickr), resized'
        },
        {
          type: 'table',
          head: [
            { en: 'Setting', cs: 'Parametr' },
            { en: 'Target', cs: 'Cíl' }
          ],
          rows: [
            [{ en: 'Temperature', cs: 'Teplota' }, { en: '18–20 °C', cs: '18–20 °C' }],
            [{ en: 'Humidity', cs: 'Vlhkost' }, { en: '55–62 %', cs: '55–62 %' }],
            [{ en: 'Light', cs: 'Světlo' }, { en: 'Dark (light and heat break down THC and terpenes)', cs: 'Tma (světlo a teplo rozkládají THC a terpeny)' }],
            [{ en: 'Air', cs: 'Vzduch' }, { en: 'Gentle exchange, fans not pointed at buds', cs: 'Mírná výměna, ventilátor nemíří na palice' }],
            [{ en: 'Time', cs: 'Doba' }, { en: '7–14 days', cs: '7–14 dní' }]
          ]
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Hang with space', cs: 'Věšej s rozestupy' },
              md: {
                en: 'Buds shouldn\'t touch each other or the walls. A grow tent with the lamp off and a small exhaust on low is a great drying room.',
                cs: 'Palice se nemají dotýkat navzájem ani stěn. Skvělá sušárna je stan se zhasnutým světlem a odtahem na nízkých otáčkách.'
              }
            },
            {
              title: { en: 'Check daily', cs: 'Kontroluj denně' },
              md: {
                en: 'Watch the hygrometer, smell for anything musty and look for mould in the densest buds.',
                cs: 'Sleduj vlhkoměr, čichej, jestli něco nezapáchá zatuchle, a koukej po plísni v nejhustších palicích.'
              }
            },
            {
              title: { en: 'Do the stem test', cs: 'Udělej test stonku' },
              md: {
                en: 'Small stems should **snap** instead of bending. Buds feel dry outside but slightly springy. That is the moment to trim and jar.',
                cs: 'Tenké stonky by měly **prasknout**, ne se ohnout. Palice jsou na povrchu suché, ale ještě lehce pružné. Teď je čas na střih a do sklenic.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Dried in 3–4 days?', cs: 'Usušeno za 3–4 dny?' },
          md: {
            en: 'That\'s too fast. Next time raise humidity, lower temperature, hang whole plants or leave more leaf on. You can still rescue some flavour with a slow cure.',
            cs: 'To je moc rychle. Příště zvyš vlhkost, sniž teplotu, věš celé rostliny nebo nech víc lístků. Trochu chuti ještě zachrání pomalé zrání.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Move the plant to the **drying** stage in BudBuddy on chop day so your journal shows how long the dry really took.',
            cs: 'V den sklizně přepni rostlinu v BudBuddy do fáze **sušení**, ať v deníku vidíš, jak dlouho sušení opravdu trvalo.'
          }
        }
      ]
    },
    {
      id: 'harvest-curing',
      title: { en: 'Curing in jars', cs: 'Zrání ve sklenicích' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Curing is slow, controlled finishing in airtight jars. Moisture from the inside of the bud spreads evenly, chlorophyll breaks down and the harsh, grassy taste fades. Give it **at least 2 weeks**, ideally 4–8.',
            cs: 'Zrání (curing) je pomalé, kontrolované dokončení v neprodyšných sklenicích. Vlhkost z nitra palice se rovnoměrně rozloží, chlorofyl se rozkládá a drsná, travnatá chuť mizí. Dej tomu **aspoň 2 týdny**, ideálně 4–8.'
          }
        },
        { type: 'figure', illustration: 'curing-jar', caption: { en: 'Jar about ¾ full with a small hygrometer inside.', cs: 'Sklenice zhruba ze ¾ plná, uvnitř malý vlhkoměr.' } },
        {
          type: 'figure',
          photo: 'harvest-curing-jar.webp',
          caption: { en: 'Dried buds in an airtight glass jar, ready to cure.', cs: 'Usušené palice ve vzduchotěsné sklenici, připravené na dozrávání.' },
          credit: 'Cannabis Culture · CC BY 2.0 (Wikimedia Commons), resized'
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Fill jars loosely', cs: 'Plň sklenice volně' },
              md: {
                en: 'Glass jars with a good seal, filled to about **¾**. Don\'t pack buds down.',
                cs: 'Skleněné sklenice s dobrým těsněním, naplněné zhruba do **¾**. Palice nemačkej.'
              }
            },
            {
              title: { en: 'Put a hygrometer in', cs: 'Dej dovnitř vlhkoměr' },
              md: {
                en: 'Target **58–62 % RH** inside the jar. A small digital hygrometer takes the guessing out.',
                cs: 'Cíl je **58–62 % vlhkosti** ve sklenici. Malý digitální vlhkoměr tě zbaví hádání.'
              }
            },
            {
              title: { en: 'Burp the jars', cs: 'Větrej sklenice' },
              md: {
                en: 'Week 1: open each jar 2–3 times a day for 10–15 minutes. Week 2: once a day. After that: once or twice a week.',
                cs: '1. týden: otevři každou sklenici 2–3× denně na 10–15 minut. 2. týden: jednou denně. Pak jednou dvakrát týdně.'
              }
            },
            {
              title: { en: 'React to the reading', cs: 'Reaguj na čísla' },
              md: {
                en: 'Over **65 %**: take buds out on a tray for a few hours, then jar again. Under **55 %**: keep the lid closed longer, or add a 62 % humidity pack.',
                cs: 'Nad **65 %**: vysyp palice na pár hodin na tác a pak zpátky do sklenice. Pod **55 %**: nech víko zavřené déle nebo přidej 62% vlhkostní sáček.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Ammonia smell = too wet', cs: 'Čpavkový zápach = moc vlhké' },
          md: {
            en: 'A smell of ammonia or hay when you open a jar means the buds were jarred too wet. Air them out right away and check closely for mould. Mouldy buds go in the bin.',
            cs: 'Když po otevření sklenice ucítíš čpavek nebo seno, šly palice do sklenice moc vlhké. Hned je vyvětrej a pečlivě zkontroluj, jestli neplesniví. Plesnivé palice patří do koše.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'When the buds are dry, weigh them and add the **dry weight** to the harvest in BudBuddy. Then set the stage to **curing** to track how long they\'ve aged.',
            cs: 'Až budou palice suché, zvaž je a doplň ke sklizni v BudBuddy **suchou váhu**. Pak přepni fázi na **zrání**, ať víš, jak dlouho už zrají.'
          }
        }
      ]
    },
    {
      id: 'harvest-storage',
      title: { en: 'Storage', cs: 'Skladování' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'After the cure, the enemies are **light, heat, air and wrong humidity**. Stored well, buds keep most of their quality for 6–12 months.',
            cs: 'Po zrání jsou nepřáteli **světlo, teplo, vzduch a špatná vlhkost**. Při dobrém skladování si palice většinu kvality udrží 6–12 měsíců.'
          }
        },
        {
          type: 'figure',
          photo: 'harvest-glass-storage.webp',
          caption: { en: 'Glass holds no smell and builds no static, so it is the best home for dry buds.', cs: 'Sklo nenasává pach a nenabíjí se, takže je pro suché palice nejlepší.' },
          credit: 'Dj701 · Public domain (Wikimedia Commons), resized'
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Good', cs: 'Dobře' },
              glyph: 'curing',
              points: [
                { en: 'Airtight glass jars, filled well to reduce air', cs: 'Neprodyšné skleněné sklenice, dobře naplněné, ať v nich není moc vzduchu' },
                { en: 'Dark, cool place around 15–21 °C', cs: 'Tmavé chladné místo kolem 15–21 °C' },
                { en: 'Humidity pack 58–62 %', cs: 'Vlhkostní sáček 58–62 %' },
                { en: 'Label with strain and harvest date', cs: 'Štítek s odrůdou a datem sklizně' }
              ]
            },
            {
              title: { en: 'Avoid', cs: 'Vyhni se' },
              glyph: 'pest',
              points: [
                { en: 'Plastic bags — static pulls off trichomes, smell leaks', cs: 'Igelitové sáčky — statika strhává trichomy a smrdí to ven' },
                { en: 'Fridge — humidity swings and condensation', cs: 'Lednička — kolísá vlhkost a sráží se voda' },
                { en: 'Freezer for buds — trichomes go brittle and break off', cs: 'Mrazák na palice — trichomy zkřehnou a olámou se' },
                { en: 'Windowsills, near heaters or electronics', cs: 'Parapety, blízko topení nebo elektroniky' }
              ]
            }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'Keep your stash locked and out of reach of children and pets. Edibles especially can look like normal food.',
            cs: 'Úrodu měj zamčenou a mimo dosah dětí a zvířat. Hlavně jedlé výrobky můžou vypadat jako obyčejné jídlo.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Write a final note in BudBuddy: how it smells after the cure, what you\'d change next time. Your future grows will thank you.',
            cs: 'Zapiš si do BudBuddy závěrečnou poznámku: jak to po zrání voní a co příště uděláš jinak. Tvoje příští grow ti poděkuje.'
          }
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'harvest-q1',
              q: { en: 'What drying conditions are a good target at home?', cs: 'Jaké podmínky na sušení jsou doma dobrý cíl?' },
              options: [
                { en: '26–28 °C and 40 % RH with a fan on the buds', cs: '26–28 °C a 40 % vlhkosti s ventilátorem na palice' },
                { en: '18–20 °C and 55–62 % RH, dark, gentle air exchange', cs: '18–20 °C a 55–62 % vlhkosti, tma, mírná výměna vzduchu' },
                { en: '12 °C and 75 % RH', cs: '12 °C a 75 % vlhkosti' },
                { en: 'Any room, lights on so it dries faster', cs: 'Jakákoli místnost, se světlem, ať to schne rychleji' }
              ],
              correct: 1,
              explain: {
                en: 'Cool, dark and around 60 % RH gives a slow 7–14 day dry. Heat, light and wind dry too fast and destroy terpenes; very humid air invites mould.',
                cs: 'Chladno, tma a kolem 60 % vlhkosti dá pomalé sušení na 7–14 dní. Teplo, světlo a průvan sušení zrychlí a zničí terpeny, velmi vlhký vzduch láká plíseň.'
              }
            },
            {
              id: 'harvest-q2',
              q: { en: 'How do you know buds are ready to go into jars?', cs: 'Jak poznáš, že palice můžou do sklenic?' },
              options: [
                { en: 'They crumble to dust', cs: 'Rozpadají se na prach' },
                { en: 'After exactly 3 days', cs: 'Přesně po 3 dnech' },
                { en: 'Small stems snap instead of bending', cs: 'Tenké stonky prasknou, místo aby se ohnuly' },
                { en: 'The leaves are still green and soft', cs: 'Lístky jsou ještě zelené a měkké' }
              ],
              correct: 2,
              explain: {
                en: 'The stem snap test is the classic sign. Crumbling means overdried; a fixed day count ignores your room.',
                cs: 'Test prasknutí stonku je klasické znamení. Když se drolí, jsou přesušené; pevný počet dní nebere ohled na tvou místnost.'
              }
            },
            {
              id: 'harvest-q3',
              q: { en: 'What humidity should the inside of a curing jar sit at?', cs: 'Jakou vlhkost má mít vzduch ve sklenici při zrání?' },
              options: [
                { en: '40–45 %', cs: '40–45 %' },
                { en: '58–62 %', cs: '58–62 %' },
                { en: '70–75 %', cs: '70–75 %' },
                { en: 'It doesn\'t matter if the lid is shut', cs: 'Nezáleží na tom, když je víko zavřené' }
              ],
              correct: 1,
              explain: {
                en: '58–62 % keeps buds fresh without mould. Above 65 % air them out; below 55 % they turn harsh and brittle.',
                cs: '58–62 % udrží palice svěží bez plísně. Nad 65 % je vyvětrej, pod 55 % začnou být drsné a křehké.'
              }
            },
            {
              id: 'harvest-q4',
              q: { en: 'You open a jar and smell ammonia. What happened?', cs: 'Otevřeš sklenici a cítíš čpavek. Co se stalo?' },
              options: [
                { en: 'The buds are curing perfectly', cs: 'Palice zrají perfektně' },
                { en: 'They went in too wet — air them out and check for mould', cs: 'Šly do sklenice moc vlhké — vyvětrej je a zkontroluj plíseň' },
                { en: 'They are too dry — add water', cs: 'Jsou moc suché — přidej vodu' },
                { en: 'It\'s the strain\'s normal smell', cs: 'To je normální vůně odrůdy' }
              ],
              correct: 1,
              explain: {
                en: 'Ammonia means trapped moisture and bacteria breaking down plant matter. Get them out of the jar and dry them a bit more.',
                cs: 'Čpavek znamená uvězněnou vlhkost a bakterie, které rozkládají rostlinnou hmotu. Vyndej je ze sklenice a nech je ještě trochu doschnout.'
              }
            },
            {
              id: 'harvest-q5',
              q: { en: 'Your wet weight was 400 g. Roughly what dry weight should you expect?', cs: 'Mokrá váha byla 400 g. Zhruba jakou suchou váhu čekat?' },
              options: [
                { en: 'About 300 g', cs: 'Asi 300 g' },
                { en: 'About 200 g', cs: 'Asi 200 g' },
                { en: 'About 80–120 g', cs: 'Asi 80–120 g' },
                { en: 'About 20 g', cs: 'Asi 20 g' }
              ],
              correct: 2,
              explain: {
                en: 'Buds lose roughly 70–80 % of their weight as water, so dry weight is usually 20–30 % of wet. Log both in BudBuddy to see your own ratio.',
                cs: 'Palice ztratí zhruba 70–80 % váhy jako vodu, takže suchá váha bývá 20–30 % mokré. Zapiš obě do BudBuddy a uvidíš svůj vlastní poměr.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
