import type { Chapter } from '../types'

export default {
  id: 'start',
  order: 1,
  title: { en: 'Getting started', cs: 'Začínáme' },
  summary: {
    en: 'The law, the gear, the budget and the first big choices: autoflower or photoperiod, feminized or regular, and which strain.',
    cs: 'Zákon, vybavení, rozpočet a první velká rozhodnutí: automat, nebo fotoperioda, feminizovaná, nebo regulérní semínka a jaká odrůda.'
  },
  glyph: 'seedling',
  color: '#8fd97a',
  lessons: [
    {
      id: 'start-legal',
      title: { en: 'Before you start: the law and common sense', cs: 'Než začneš: zákon a zdravý rozum' },
      minutes: 3,
      blocks: [
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Grow only where it is legal', cs: 'Pěstuj jen tam, kde je to legální' },
          md: {
            en: 'Cannabis laws differ by country, and sometimes by region. They also change often. Before you plant a single seed, check the **current** rules where you live: how many plants you may grow, how much you may keep at home, and whether growing needs a licence.',
            cs: 'Zákony o konopí se liší podle země, někdy i podle regionu, a často se mění. Než zasadíš první semínko, zjisti si **aktuální** pravidla tam, kde bydlíš: kolik rostlin smíš pěstovat, kolik smíš mít doma a jestli k pěstování nepotřebuješ povolení.'
          }
        },
        {
          type: 'figure',
          photo: 'start-legal-home-plant.webp',
          caption: { en: 'A single plant in a pot at home. Small and personal is the whole idea.', cs: 'Jedna rostlina v květináči doma. Malé a pro sebe, o to tu jde.' },
          credit: 'Qadry Anthony · CC BY 4.0 (iNaturalist), resized'
        },
        {
          type: 'text',
          md: {
            en: 'This guide is about growing a few plants for yourself. It does not cover selling or trading. Even where home growing is allowed, selling usually is not.',
            cs: 'Tenhle průvodce je o pěstování pár rostlin pro sebe. Prodej ani výměnu neřeší. I tam, kde je pěstování doma povolené, prodej většinou povolený není.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Know your limits', cs: 'Znej své limity' },
              md: {
                en: 'Write down the plant and possession limits that apply to you. Plan your grow so you stay under them, including the harvest weight.',
                cs: 'Zapiš si limity na počet rostlin a množství, které pro tebe platí. Naplánuj grow tak, abys je nepřekročil, a to i co do váhy sklizně.'
              }
            },
            {
              title: { en: 'Respect the people around you', cs: 'Mysli na lidi kolem sebe' },
              md: {
                en: 'Flowering plants smell strong. Indoors you will want a carbon filter, outdoors a spot where neighbours are not bothered. If you rent, check your lease.',
                cs: 'Kvetoucí rostliny silně voní. Uvnitř budeš chtít uhlíkový filtr, venku místo, kde neobtěžuješ sousedy. Pokud bydlíš v nájmu, mrkni do smlouvy.'
              }
            },
            {
              title: { en: 'Keep it away from kids and pets', cs: 'Mimo dosah dětí a zvířat' },
              md: {
                en: 'Lock the tent or room, store nutrients and the harvest safely. Cannabis edibles and leaves can make dogs seriously ill.',
                cs: 'Stan nebo místnost zamykej, hnojiva i sklizeň skladuj bezpečně. Jedlé konopné výrobky i samotné listy můžou psovi vážně ublížit.'
              }
            },
            {
              title: { en: 'Electricity and water do not mix', cs: 'Elektřina a voda nejdou dohromady' },
              md: {
                en: 'Hang power strips above the floor, use a socket with a residual-current device (RCD) and never overload an extension cord with lamps and heaters.',
                cs: 'Prodlužky pověs nad zem, používej zásuvku s proudovým chráničem a nepřetěžuj jednu prodlužku lampou a topením zároveň.'
              }
            }
          ]
        }
      ]
    },
    {
      id: 'start-gear',
      title: { en: 'What you need and what it costs', cs: 'Co budeš potřebovat a kolik to stojí' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'A plant needs five things: **light, air, water, food and a root zone**. The gear list below covers all of them. Outdoors the sun replaces the lamp and the tent, so the list gets much shorter.',
            cs: 'Rostlina potřebuje pět věcí: **světlo, vzduch, vodu, živiny a prostor pro kořeny**. Seznam níže pokrývá všechny. Venku nahradí lampu i stan slunce, takže seznam se hodně zkrátí.'
          }
        },
        {
          type: 'figure',
          photo: 'start-gear-tent.webp',
          caption: { en: 'A small tent with a lamp, reflective walls and plants in pots: the core of an indoor setup.', cs: 'Malý stan s lampou, reflexními stěnami a rostlinami v květináčích: základ pěstování uvnitř.' },
          credit: 'spotreporting · CC BY-SA 2.0 (Flickr), resized'
        },
        {
          type: 'checklist',
          id: 'start-gear-indoor',
          items: [
            { en: 'Grow tent (60×60 to 120×120 cm)', cs: 'Pěstební stan (60×60 až 120×120 cm)' },
            { en: 'LED grow light sized for the tent', cs: 'LED světlo odpovídající velikosti stanu' },
            { en: 'Exhaust fan + carbon filter + ducting', cs: 'Odsávací ventilátor + uhlíkový filtr + potrubí' },
            { en: 'Small clip fan for air movement inside', cs: 'Malý ventilátor na klip pro pohyb vzduchu ve stanu' },
            { en: 'Timer for the light', cs: 'Spínací hodiny pro světlo' },
            { en: 'Thermo-hygrometer (temperature + humidity)', cs: 'Teploměr s vlhkoměrem' },
            { en: 'Pots (fabric pots 11–20 l) and saucers', cs: 'Květináče (textilní 11–20 l) a podmisky' },
            { en: 'Medium: soil or coco', cs: 'Substrát: hlína nebo kokos' },
            { en: 'Base nutrients (if not using pre-fertilized soil)', cs: 'Základní hnojiva (pokud nemáš předhnojenou hlínu)' },
            { en: 'pH meter or pH drops + pH up/down', cs: 'pH metr nebo kapky + pH plus/mínus' },
            { en: 'Watering can, measuring syringe or cup', cs: 'Konev, odměrná stříkačka nebo kelímek' },
            { en: 'Seeds', cs: 'Semínka' }
          ]
        },
        {
          type: 'table',
          head: [
            { en: 'Item', cs: 'Položka' },
            { en: 'Budget', cs: 'Levná varianta' },
            { en: 'Solid', cs: 'Solidní varianta' }
          ],
          rows: [
            [{ en: 'Tent 80×80', cs: 'Stan 80×80' }, { en: '€50', cs: '1 200 Kč' }, { en: '€120', cs: '3 000 Kč' }],
            [{ en: 'LED light', cs: 'LED světlo' }, { en: '€100', cs: '2 500 Kč' }, { en: '€250', cs: '6 000 Kč' }],
            [{ en: 'Fan + carbon filter', cs: 'Ventilátor + uhlíkový filtr' }, { en: '€80', cs: '2 000 Kč' }, { en: '€180', cs: '4 500 Kč' }],
            [{ en: 'Pots, soil, nutrients, pH', cs: 'Květináče, substrát, hnojiva, pH' }, { en: '€60', cs: '1 500 Kč' }, { en: '€120', cs: '3 000 Kč' }],
            [{ en: 'Timer, hygrometer, clip fan', cs: 'Spínačky, vlhkoměr, ventilátor' }, { en: '€30', cs: '700 Kč' }, { en: '€60', cs: '1 500 Kč' }],
            [{ en: '**Total**', cs: '**Celkem**' }, { en: '**≈ €320**', cs: '**≈ 8 000 Kč**' }, { en: '**≈ €730**', cs: '**≈ 18 000 Kč**' }]
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          title: { en: 'Don\'t forget electricity', cs: 'Nezapomeň na elektřinu' },
          md: {
            en: 'A 200 W LED running 18 hours a day uses 3.6 kWh daily, around 110 kWh a month in veg. In flower (12 h) it drops to about 72 kWh. Add a little for the fan. Multiply by your price per kWh.',
            cs: 'LED o příkonu 200 W, která svítí 18 hodin denně, spotřebuje 3,6 kWh za den, ve vegetaci zhruba 110 kWh měsíčně. V květu (12 h) je to asi 72 kWh. Přičti něco málo za ventilátor a vynásob svou cenou za kWh.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'Where to save, where not to', cs: 'Kde šetřit a kde ne' },
          md: {
            en: 'Save on the tent and pots. Do **not** save on the light and the carbon filter: a weak light means a weak harvest, and a cheap filter means your whole flat smells in flower.',
            cs: 'Šetřit můžeš na stanu a květináčích. **Nešetři** na světle a uhlíkovém filtru: slabé světlo znamená slabou sklizeň a levný filtr znamená, že ti v květu bude vonět celý byt.'
          }
        }
      ]
    },
    {
      id: 'start-auto-vs-photo',
      title: { en: 'Autoflower or photoperiod?', cs: 'Automat, nebo fotoperioda?' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: '**Photoperiod** plants stay in vegetative growth as long as they get long days. They only start flowering when the nights get long, which you trigger indoors by switching the light to 12/12. **Autoflowers** start flowering on their own after 3–5 weeks, no matter how much light they get.',
            cs: '**Fotoperiodické** rostliny zůstávají ve vegetaci, dokud mají dlouhé dny. Kvést začnou až ve chvíli, kdy se prodlouží noci, což uvnitř spustíš přepnutím světla na 12/12. **Automaty** začnou kvést samy po 3–5 týdnech, ať svítíš, jak svítíš.'
          }
        },
        {
          type: 'figure',
          photo: 'start-auto-vs-photo-cola.webp',
          caption: { en: 'A flowering top. Autoflowers get here on their own, photoperiods only after the switch to 12/12.', cs: 'Kvetoucí vrchol. Automat se sem dostane sám, fotoperioda až po přepnutí na 12/12.' },
          credit: 'Alex Abair · CC BY 4.0 (iNaturalist), resized'
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Autoflower', cs: 'Automat (autoflower)' },
              glyph: 'seedling',
              points: [
                { en: 'Seed to harvest in 9–12 weeks', cs: 'Od semínka ke sklizni za 9–12 týdnů' },
                { en: 'Same light all grow: 18/6 or 20/4', cs: 'Celou dobu stejné světlo: 18/6 nebo 20/4' },
                { en: 'Small plants, 50–100 cm', cs: 'Malé rostliny, 50–100 cm' },
                { en: 'Smaller yield per plant', cs: 'Menší sklizeň z rostliny' },
                { en: 'Little room for mistakes: lost days don\'t come back', cs: 'Málo prostoru pro chyby: ztracené dny se nevrátí' },
                { en: 'Best sown straight into the final pot', cs: 'Nejlíp sázet rovnou do finálního květináče' }
              ]
            },
            {
              title: { en: 'Photoperiod', cs: 'Fotoperioda' },
              glyph: 'flowering',
              points: [
                { en: 'Seed to harvest in 3.5–5 months', cs: 'Od semínka ke sklizni za 3,5–5 měsíců' },
                { en: '18/6 in veg, 12/12 to flower', cs: '18/6 ve vegetaci, 12/12 v květu' },
                { en: 'You control the size by the length of veg', cs: 'Velikost řídíš délkou vegetace' },
                { en: 'Bigger yield, takes all kinds of training', cs: 'Větší sklizeň, snese jakýkoli trénink' },
                { en: 'Forgiving: you can wait until a plant recovers', cs: 'Odpouští: můžeš počkat, až se rostlina vzpamatuje' },
                { en: 'Can be cloned', cs: 'Dá se klonovat' }
              ]
            }
          ]
        },
        {
          type: 'interactive',
          widget: 'grow-timeline',
          props: { type: 'auto' },
          caption: { en: 'A typical autoflower grow, week by week.', cs: 'Typický grow automatu týden po týdnu.' }
        },
        {
          type: 'interactive',
          widget: 'grow-timeline',
          props: { type: 'photo' },
          caption: { en: 'A typical photoperiod grow indoors.', cs: 'Typický grow fotoperiody uvnitř.' }
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'Which one for a first grow?', cs: 'Co na první grow?' },
          md: {
            en: 'Small tent, little time, or outdoors in a short northern summer: go **auto**. If you want to learn training and have patience, go **photo**. Photos are actually more forgiving, because you can fix a problem in veg before flipping.',
            cs: 'Malý stan, málo času nebo venku v krátkém severském létě: ber **automat**. Jestli se chceš naučit trénink a máš trpělivost, ber **fotoperiodu**. Fotoperiody jsou paradoxně shovívavější, protože problém můžeš ve vegetaci vyřešit ještě před přepnutím.'
          }
        }
      ]
    },
    {
      id: 'start-seeds',
      title: { en: 'Seeds and strains', cs: 'Semínka a odrůdy' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Only **female** plants grow the buds you want. A male pollinates them, and pollinated buds fill with seeds instead of resin. That is why the type of seed matters.',
            cs: 'Palice, o které ti jde, dělají jen **samičí** rostliny. Samec je opyluje a opylené palice se místo pryskyřice plní semínky. Proto záleží na tom, jaká semínka koupíš.'
          }
        },
        {
          type: 'figure',
          photo: 'start-seeds-pile.webp',
          caption: { en: 'Cannabis seeds. Healthy ones are hard, dry and grey-brown, often with darker stripes.', cs: 'Konopná semínka. Zdravá jsou tvrdá, suchá a šedohnědá, často s tmavším žíháním.' },
          credit: 'Yo · CC BY-SA 4.0 (Wikimedia Commons), resized'
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Feminized', cs: 'Feminizovaná' },
              points: [
                { en: '~99 % of plants are female', cs: '~99 % rostlin jsou samice' },
                { en: 'Every seed counts toward a harvest', cs: 'Každé semínko se počítá do sklizně' },
                { en: 'The right choice for almost every home grower', cs: 'Správná volba skoro pro každého domácího pěstitele' }
              ]
            },
            {
              title: { en: 'Regular', cs: 'Regulérní' },
              points: [
                { en: 'About 50 % males, 50 % females', cs: 'Zhruba půl samců, půl samic' },
                { en: 'You must find and remove males before they open', cs: 'Samce musíš poznat a odstranit, než se otevřou' },
                { en: 'Cheaper, useful for breeding and mother plants', cs: 'Levnější, hodí se na šlechtění a matečné rostliny' }
              ]
            }
          ]
        },
        {
          type: 'text',
          md: {
            en: 'With plant limits in mind, feminized seeds are the sensible default. Regular seeds only make sense if you want to breed or pick a mother plant from many candidates.',
            cs: 'Když počítáš s limitem rostlin, jsou feminizovaná semínka jasná volba. Regulérní dávají smysl, jen když chceš šlechtit nebo vybírat matku z mnoha kandidátek.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Height and space', cs: 'Výška a prostor' },
              md: {
                en: 'Indica-dominant strains stay short and bushy, sativa-dominant ones stretch tall and thin. In a tent under 160 cm, prefer indica-leaning genetics or autos.',
                cs: 'Odrůdy s převahou indiky zůstávají nízké a košaté, sativy se vytahují do výšky. Ve stanu nižším než 160 cm sáhni spíš po indice nebo po automatu.'
              }
            },
            {
              title: { en: 'Flowering time', cs: 'Doba kvetení' },
              md: {
                en: 'Breeders state how long a photoperiod strain flowers after the flip: 7–9 weeks is beginner-friendly, 10–14 weeks needs patience. Outdoors in central Europe, pick strains that finish by early October.',
                cs: 'Šlechtitelé uvádějí, jak dlouho fotoperioda kvete po přepnutí: 7–9 týdnů je pro začátečníka ideál, 10–14 týdnů chce trpělivost. Venku ve střední Evropě vybírej odrůdy, které dozrají do začátku října.'
              }
            },
            {
              title: { en: 'Resistance', cs: 'Odolnost' },
              md: {
                en: 'Look for "mould resistant" or "easy to grow". Dense, fat buds look great but rot easily in humid weather.',
                cs: 'Hledej popisky jako „odolná vůči plísni" nebo „snadné pěstování". Husté tlusté palice vypadají skvěle, ale ve vlhku snadno hnijí.'
              }
            },
            {
              title: { en: 'Get seeds from a reputable breeder where this is legal', cs: 'Semínka od ověřeného šlechtitele, kde je to legální' },
              md: {
                en: 'Known breeders have stable genetics and better germination. Store seeds dark, cool and dry until you plant them.',
                cs: 'Zavedení šlechtitelé mají stabilní genetiku a lepší klíčivost. Do zasazení skladuj semínka v temnu, chladu a suchu.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'Ready? Next, decide [where you will grow](/guide/environment#environment-choose).',
            cs: 'Máš jasno? Teď se rozhodni, [kde budeš pěstovat](/guide/environment#environment-choose).'
          }
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'start-q1',
              q: { en: 'What makes an autoflower start flowering?', cs: 'Co spustí kvetení u automatu?' },
              options: [
                { en: 'Switching the light to 12/12', cs: 'Přepnutí světla na 12/12' },
                { en: 'Its age: it flowers on its own after a few weeks', cs: 'Věk: po pár týdnech začne kvést sám' },
                { en: 'Bloom fertilizer', cs: 'Květové hnojivo' },
                { en: 'Lower temperature', cs: 'Nižší teplota' }
              ],
              correct: 1,
              explain: {
                en: 'Autoflowers carry ruderalis genetics and flower by age, not by day length. Photoperiods need long nights (12/12) to flower.',
                cs: 'Automaty mají v sobě genetiku ruderalis a kvetou podle věku, ne podle délky dne. Fotoperiody potřebují k nakvetení dlouhé noci (12/12).'
              }
            },
            {
              id: 'start-q2',
              q: { en: 'Why do growers avoid male plants?', cs: 'Proč se pěstitelé vyhýbají samcům?' },
              options: [
                { en: 'They are toxic', cs: 'Jsou jedovatí' },
                { en: 'They grow too tall', cs: 'Rostou moc vysoko' },
                { en: 'Their pollen makes female buds full of seeds', cs: 'Jejich pyl naplní samičí palice semínky' },
                { en: 'They need more light', cs: 'Potřebují víc světla' }
              ],
              correct: 2,
              explain: {
                en: 'Pollinated females put energy into seeds instead of resin, so the harvest is seedy and weaker.',
                cs: 'Opylená samice dává energii do semínek místo do pryskyřice, takže sklizeň je plná semen a slabší.'
              }
            },
            {
              id: 'start-q3',
              q: { en: 'Which part of the setup should you not cheap out on?', cs: 'Na čem bys neměl šetřit?' },
              options: [
                { en: 'The tent', cs: 'Na stanu' },
                { en: 'The pots', cs: 'Na květináčích' },
                { en: 'The light and the carbon filter', cs: 'Na světle a uhlíkovém filtru' },
                { en: 'The watering can', cs: 'Na konvi' }
              ],
              correct: 2,
              explain: {
                en: 'Light drives the yield directly, and a weak filter lets the smell out. The rest can be basic.',
                cs: 'Světlo přímo určuje sklizeň a slabý filtr pustí ven vůni. Zbytek může být klidně základní.'
              }
            },
            {
              id: 'start-q4',
              q: { en: 'You have a 140 cm tall tent. Which plant suits it best?', cs: 'Máš stan vysoký 140 cm. Jaká rostlina se do něj hodí nejlíp?' },
              options: [
                { en: 'A sativa-dominant photoperiod with 14 weeks of flower', cs: 'Sativová fotoperioda se 14 týdny květu' },
                { en: 'An indica-leaning strain or an autoflower', cs: 'Odrůda s převahou indiky nebo automat' },
                { en: 'Regular seeds, because they are cheaper', cs: 'Regulérní semínka, protože jsou levnější' },
                { en: 'Any strain, height does not matter', cs: 'Jakákoli, na výšce nezáleží' }
              ],
              correct: 1,
              explain: {
                en: 'Sativas can double or triple in height after the flip. In a low tent, short genetics save you a lot of stress.',
                cs: 'Sativy se po přepnutí umí zdvojnásobit i ztrojnásobit. V nízkém stanu ti krátká genetika ušetří spoustu starostí.'
              }
            },
            {
              id: 'start-q5',
              q: { en: 'Before buying seeds, the very first thing to check is…', cs: 'Úplně první věc, kterou si před nákupem semínek ověříš, je…' },
              options: [
                { en: 'The THC percentage', cs: 'Procento THC' },
                { en: 'The current law where you live', cs: 'Aktuální zákon tam, kde bydlíš' },
                { en: 'The price of LEDs', cs: 'Cena LEDek' },
                { en: 'The moon phase', cs: 'Fáze Měsíce' }
              ],
              correct: 1,
              explain: {
                en: 'Rules differ by country and change over time. Know your plant and possession limits before you start.',
                cs: 'Pravidla se liší podle země a mění se. Limity na počet rostlin a množství znej dřív, než začneš.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
