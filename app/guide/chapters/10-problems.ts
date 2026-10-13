import type { Chapter } from '../types'

const WIKI = 'Wikimedia Commons'

export default {
  id: 'problems',
  order: 10,
  title: { en: 'Problems & diagnosis', cs: 'Problémy a diagnostika' },
  summary: {
    en: 'Read what your plant is telling you: deficiencies, burn and lockout, pests, mould and hermaphrodites, with a clear plan for each.',
    cs: 'Nauč se číst, co ti rostlina říká: nedostatky živin, přehnojení a zablokování, škůdci, plíseň a hermafroditi. U každého problému máš jasný postup.'
  },
  glyph: 'pest',
  color: '#f0905a',
  lessons: [
    {
      id: 'problems-diagnose',
      title: { en: 'How to diagnose a sick plant', cs: 'Jak diagnostikovat nemocnou rostlinu' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'A yellow leaf is a symptom, not a diagnosis. Most "deficiencies" beginners see are really caused by wrong pH, too much or too little food, bad watering or a lamp that is too close. So don\'t reach for a bottle straight away. Check the basics first, then look at **where** on the plant the problem shows up.',
            cs: 'Žlutý list je příznak, ne diagnóza. Většina „nedostatků“, které začátečníci vidí, má ve skutečnosti na svědomí špatné pH, moc nebo málo hnojiva, špatnou zálivku nebo moc blízko zavěšenou lampu. Takže hned nesahej po další lahvi. Nejdřív zkontroluj základy a pak se podívej, **kde** na rostlině se problém objevuje.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: '1. pH', cs: '1. pH' },
              md: {
                en: 'Measure the pH of your water/feed and, ideally, the runoff. Soil: **6.0–7.0**. Coco and hydro: **5.5–6.5**. Outside these ranges roots can\'t take up some nutrients even when they\'re in the pot.',
                cs: 'Změř pH zálivky a ideálně i toho, co vyteče dole (odtok). Hlína: **6,0–7,0**. Kokos a hydro: **5,5–6,5**. Mimo tyhle hodnoty kořeny některé živiny nepřijmou, i když v květináči jsou.'
              }
            },
            {
              title: { en: '2. EC / feeding', cs: '2. EC a hnojení' },
              md: {
                en: 'Compare the EC of what goes in with what comes out. Runoff much higher than input means salts are building up (overfeeding). Runoff far lower means the plant is hungry.',
                cs: 'Porovnej EC toho, co do květináče leješ, s odtokem. Když je odtok výrazně vyšší, hromadí se soli (přehnojení). Když je výrazně nižší, rostlina hladoví.'
              }
            },
            {
              title: { en: '3. Watering', cs: '3. Zálivka' },
              md: {
                en: 'Lift the pot. Heavy for days = overwatering. Light and dusty = underwatering. Both cause droopy leaves and both mimic deficiencies, because sick roots don\'t feed well.',
                cs: 'Nadzvedni květináč. Několik dní těžký = přelíváš. Lehký a suchý = podléváš. Obojí způsobí svěšené listy a obojí se tváří jako nedostatek živin, protože nemocné kořeny špatně přijímají.'
              }
            },
            {
              title: { en: '4. Light & climate', cs: '4. Světlo a klima' },
              md: {
                en: 'Is the damage only at the top, near the lamp? Think light or heat. Check canopy temperature (aim 22–28 °C with lights on) and humidity for your stage.',
                cs: 'Je poškození jen nahoře u lampy? Pak tipuj světlo nebo teplo. Zkontroluj teplotu u vršků (při rozsvícené lampě ideálně 22–28 °C) a vlhkost podle fáze.'
              }
            },
            {
              title: { en: '5. Where and how', cs: '5. Kde a jak' },
              md: {
                en: 'Only now read the leaves: old (bottom) or new (top) leaves? Whole leaf yellow, or between the veins? Edges, tips or spots? Use the tool below.',
                cs: 'Až teď čti listy: staré (spodní), nebo nové (horní)? Žloutne celý list, nebo jen mezi žilkami? Okraje, špičky, nebo skvrny? Pomůže ti nástroj níž.'
              }
            }
          ]
        },
        {
          type: 'interactive',
          widget: 'leaf-diagnosis',
          caption: {
            en: 'Pick where and how the leaf discolours to see the likely causes.',
            cs: 'Vyber, kde a jak list mění barvu, a uvidíš nejpravděpodobnější příčiny.'
          }
        },
        {
          type: 'figure',
          photo: 'deficiency-nitrogen.jpg',
          caption: {
            en: 'A young cannabis plant with yellowing fan leaves. Before you blame a nutrient, check pH, EC and watering.',
            cs: 'Mladá rostlina se žloutnoucími listy. Než to svedeš na konkrétní živinu, zkontroluj pH, EC a zálivku.'
          },
          credit: `Cannabis Training University · CC BY-SA 3.0 (${WIKI})`
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'One change at a time', cs: 'Vždycky jen jedna změna' },
          md: {
            en: 'Fix one thing, then wait 3–5 days. Damaged leaves won\'t turn green again, so judge by the **new growth**. If you change pH, food and watering all at once, you\'ll never know what helped.',
            cs: 'Oprav jednu věc a počkej 3–5 dní. Poškozené listy už nezezelenají, takže hodnoť podle **nových přírůstků**. Když změníš najednou pH, hnojení i zálivku, nikdy nezjistíš, co pomohlo.'
          }
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'Some yellowing is normal: lower leaves fade in late flower as the plant uses up its stored nitrogen. That\'s not a problem, it\'s the season ending.',
            cs: 'Trochu žloutnutí je normální: v pozdním kvetení spodní listy blednou, protože rostlina spotřebovává uložený dusík. To není problém, jen konec sezóny.'
          }
        }
      ]
    },
    {
      id: 'problems-deficiencies',
      title: { en: 'Nutrient deficiencies', cs: 'Nedostatky živin' },
      minutes: 6,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'The key to reading deficiencies is **mobility**. Mobile nutrients can be moved inside the plant: when they run short, the plant pulls them out of old leaves to feed new ones, so symptoms start **at the bottom**. Immobile nutrients stay where they were built in, so shortages show up **in new growth at the top**.',
            cs: 'Klíč ke čtení nedostatků je **pohyblivost** živin. Pohyblivé živiny umí rostlina přesouvat: když dojdou, vytáhne je ze starých listů a pošle je do nových, takže příznaky začínají **dole**. Nepohyblivé živiny zůstanou tam, kde jsou zabudované, takže nedostatek uvidíš **na nových přírůstcích nahoře**.'
          }
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Mobile: old leaves first', cs: 'Pohyblivé: nejdřív staré listy' },
              points: [
                { en: 'Nitrogen (N)', cs: 'Dusík (N)' },
                { en: 'Phosphorus (P)', cs: 'Fosfor (P)' },
                { en: 'Potassium (K)', cs: 'Draslík (K)' },
                { en: 'Magnesium (Mg)', cs: 'Hořčík (Mg)' }
              ]
            },
            {
              title: { en: 'Immobile: new growth first', cs: 'Nepohyblivé: nejdřív nové přírůstky' },
              points: [
                { en: 'Calcium (Ca)', cs: 'Vápník (Ca)' },
                { en: 'Iron (Fe)', cs: 'Železo (Fe)' },
                { en: 'Sulfur (S)', cs: 'Síra (S)' },
                { en: 'Zinc (Zn)', cs: 'Zinek (Zn)' }
              ]
            }
          ]
        },
        {
          type: 'figure',
          illustration: 'leaf-healthy',
          caption: { en: 'For comparison: a healthy, evenly green fan leaf.', cs: 'Pro srovnání: zdravý, rovnoměrně zelený list.' }
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'pH first, bottles second', cs: 'Nejdřív pH, až pak lahve' },
          md: {
            en: 'Nine times out of ten the nutrient is in the pot but locked out by pH. Check pH before you add anything.',
            cs: 'V devíti případech z deseti živina v květináči je, jen ji pH zablokovalo. Než cokoli přidáš, zkontroluj pH.'
          }
        },
        {
          type: 'text',
          md: {
            en: '## Nitrogen (N)\n**Symptoms:** lower leaves turn evenly pale, then yellow from the tip inwards, and eventually drop. Growth slows and the whole plant looks light green.\n**Cause:** too little food (often in veg, or in small, exhausted soil pots), or pH lockout.\n**Fix:** feed a grow (veg) nutrient or top up with a balanced feed; check pH. In the last weeks of flower, yellowing lower leaves are normal.',
            cs: '## Dusík (N)\n**Příznaky:** spodní listy rovnoměrně blednou, pak žloutnou od špičky dovnitř a nakonec opadají. Růst se zpomalí a celá rostlina je světle zelená.\n**Příčina:** málo hnojiva (často ve vegetaci nebo v malém, vyčerpaném květináči s hlínou), případně zablokování kvůli pH.\n**Řešení:** přihnoj růstovým hnojivem nebo vyváženým hnojivem a zkontroluj pH. V posledních týdnech kvetení je žloutnutí spodních listů normální.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-nitrogen',
          caption: { en: 'Nitrogen: even yellowing on old leaves, starting at the tip.', cs: 'Dusík: rovnoměrné žloutnutí starých listů od špičky.' }
        },
        {
          type: 'text',
          md: {
            en: '## Phosphorus (P)\n**Symptoms:** older leaves go dark, dull or bluish green, then get bronze or brown blotches. Leaf stems turn red-purple and growth stalls.\n**Cause:** cold roots (below about 15 °C), pH out of range, or too little bloom food in flower. Note that purple stems alone are often just genetics or cool nights.\n**Fix:** keep the root zone warm, correct pH and use a bloom nutrient in flower.',
            cs: '## Fosfor (P)\n**Příznaky:** starší listy ztmavnou, jsou matné nebo do modrozelena a pak se na nich objeví bronzové až hnědé skvrny. Řapíky zfialoví a růst se zastaví.\n**Příčina:** studené kořeny (zhruba pod 15 °C), pH mimo rozsah nebo málo květového hnojiva v kvetení. Pozor, samotné fialové stonky bývají často jen genetika nebo chladné noci.\n**Řešení:** udržuj kořeny v teple, oprav pH a v kvetení používej květové hnojivo.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-phosphorus',
          caption: { en: 'Phosphorus: dark leaves with bronze blotches and purple stems.', cs: 'Fosfor: tmavé listy s bronzovými skvrnami a fialové řapíky.' }
        },
        {
          type: 'figure',
          photo: 'problems-phosphorus-leaves.webp',
          caption: { en: 'Leaves from a phosphorus-deficiency trial: dark, dull green that turns into bronze blotches.', cs: 'Listy z pokusu s nedostatkem fosforu: tmavá matná zeleň, která přechází v bronzové skvrny.' },
          credit: 'Llewellyn et al. (Plants 2023) · CC BY 4.0 (PubMed Central), cropped & resized'
        },
        {
          type: 'text',
          md: {
            en: '## Potassium (K)\n**Symptoms:** the edges and tips of older and middle leaves yellow, then turn brown and crispy, like they\'ve been scorched. Common in flower, when the plant needs a lot of K.\n**Cause:** too little bloom food, pH lockout, or too much calcium/sodium competing with potassium.\n**Fix:** correct pH and use a bloom feed with enough K. If you use hard tap water, test it.',
            cs: '## Draslík (K)\n**Příznaky:** okraje a špičky starších a středních listů žloutnou, pak zhnědnou a zkřehnou, jako by je někdo připálil. Častý v kvetení, kdy rostlina potřebuje draslíku hodně.\n**Příčina:** málo květového hnojiva, zablokování kvůli pH nebo moc vápníku či sodíku, které draslíku konkurují.\n**Řešení:** oprav pH a používej květové hnojivo s dostatkem draslíku. Pokud zaléváš tvrdou vodou z kohoutku, nech si ji otestovat.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-potassium',
          caption: { en: 'Potassium: yellow-brown, crispy edges on older leaves.', cs: 'Draslík: žlutohnědé, křehké okraje starších listů.' }
        },
        {
          type: 'figure',
          photo: 'deficiency-potassium.jpg',
          caption: {
            en: 'Potassium deficiency on a tomato leaf: yellowing that starts at the edges. On cannabis it looks very similar.',
            cs: 'Nedostatek draslíku na listu rajčete: žloutnutí, které začíná od okrajů. Na konopí vypadá hodně podobně.'
          },
          credit: `Goldlocki · CC BY-SA 3.0 (${WIKI})`
        },
        {
          type: 'text',
          md: {
            en: '## Calcium (Ca)\n**Symptoms:** brown, rusty spots on new and middle leaves, new growth twisted or crinkled, weak stems.\n**Cause:** very common in **coco** (coco holds on to calcium), with RO or soft water, and under strong LEDs. Low pH (below about 5.8 in coco) makes it worse.\n**Fix:** add CalMag, keep coco/hydro pH around 5.8–6.2.',
            cs: '## Vápník (Ca)\n**Příznaky:** hnědé, rezavé skvrny na nových a středních listech, pokroucené nebo zvlněné nové přírůstky, slabé stonky.\n**Příčina:** hodně častý v **kokosu** (kokos vápník váže), při zálivce osmózou nebo měkkou vodou a pod silnými LED. Nízké pH (v kokosu zhruba pod 5,8) to ještě zhorší.\n**Řešení:** přidej CalMag a drž pH v kokosu a hydru kolem 5,8–6,2.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-calcium',
          caption: { en: 'Calcium: rusty brown spots on new and middle leaves.', cs: 'Vápník: rezavé hnědé skvrny na nových a středních listech.' }
        },
        {
          type: 'text',
          md: {
            en: '## Magnesium (Mg)\n**Symptoms:** yellowing **between the veins** of older and middle leaves while the veins stay green. Often appears around weeks 3–5 of flower.\n**Cause:** coco, RO water, strong LEDs, too much potassium, or pH lockout.\n**Fix:** CalMag, or Epsom salt (magnesium sulfate) at about 0.5–1 g per litre in the feed. Fixes show up in new leaves within a few days.',
            cs: '## Hořčík (Mg)\n**Příznaky:** žloutnutí **mezi žilkami** starších a středních listů, žilky zůstávají zelené. Často se objeví kolem 3.–5. týdne kvetení.\n**Příčina:** kokos, voda z osmózy, silné LED, přebytek draslíku nebo zablokování kvůli pH.\n**Řešení:** CalMag, nebo hořká sůl (síran hořečnatý) zhruba 0,5–1 g na litr zálivky. Zlepšení uvidíš na nových listech během pár dní.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-magnesium',
          caption: { en: 'Magnesium: interveinal yellowing, veins stay green.', cs: 'Hořčík: žloutnutí mezi žilkami, žilky zůstávají zelené.' }
        },
        {
          type: 'figure',
          photo: 'deficiency-magnesium.jpg',
          caption: {
            en: 'Magnesium deficiency on alder buckthorn: older leaves yellow between the veins. Cannabis shows the same pattern.',
            cs: 'Nedostatek hořčíku na krušině: starší listy žloutnou mezi žilkami. Konopí má stejný vzor.'
          },
          credit: `Karduelis · Public domain (${WIKI})`
        },
        {
          type: 'text',
          md: {
            en: '## Iron (Fe)\n**Symptoms:** the **newest** leaves turn bright yellow while the veins stay green, starting at the very top.\n**Cause:** almost always pH too high (above 7 in soil, above 6.5 in coco/hydro), sometimes waterlogged roots.\n**Fix:** bring pH back into range. Chelated iron helps if the feed is really missing it.',
            cs: '## Železo (Fe)\n**Příznaky:** **nejmladší** listy zesvětlají do jasně žluté a žilky zůstanou zelené, začíná to úplně nahoře.\n**Příčina:** skoro vždycky moc vysoké pH (v hlíně nad 7, v kokosu a hydru nad 6,5), občas přemokřené kořeny.\n**Řešení:** vrať pH do správného rozsahu. Chelát železa pomůže, pokud ho hnojivu opravdu chybí.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-iron',
          caption: { en: 'Iron: bright yellow new leaves with green veins.', cs: 'Železo: jasně žluté nové listy se zelenými žilkami.' }
        },
        {
          type: 'text',
          md: {
            en: '## Sulfur (S)\n**Symptoms:** new leaves turn evenly pale yellow, **veins included**, a bit like nitrogen deficiency but at the top. Rare with complete nutrients.\n**Cause:** pH lockout or a very lean feed.\n**Fix:** correct pH; a complete nutrient or a little Epsom salt (it contains sulfur too) solves it.',
            cs: '## Síra (S)\n**Příznaky:** nové listy rovnoměrně zbledne do žluta, **včetně žilek**, trochu jako u dusíku, jen nahoře. S kompletním hnojivem je vzácná.\n**Příčina:** zablokování kvůli pH nebo hodně chudé hnojení.\n**Řešení:** oprav pH; kompletní hnojivo nebo trocha hořké soli (obsahuje i síru) to vyřeší.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-sulfur',
          caption: { en: 'Sulfur: new leaves evenly pale, veins included.', cs: 'Síra: nové listy rovnoměrně bledé, i se žilkami.' }
        },
        {
          type: 'text',
          md: {
            en: '## Zinc (Zn)\n**Symptoms:** new leaves are small, narrow and twisted, yellow between the veins, with very short gaps between nodes. Leaf tips may twist sideways.\n**Cause:** usually high pH.\n**Fix:** correct pH and use a nutrient with a full micronutrient (trace element) mix.',
            cs: '## Zinek (Zn)\n**Příznaky:** nové listy jsou malé, úzké a pokroucené, žloutnou mezi žilkami a internodia jsou hodně krátká. Špičky listů se můžou stáčet do strany.\n**Příčina:** obvykle vysoké pH.\n**Řešení:** oprav pH a používej hnojivo s kompletními mikroprvky.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-zinc',
          caption: { en: 'Zinc: small, twisted new leaves with interveinal yellowing.', cs: 'Zinek: malé, pokroucené nové listy se žloutnutím mezi žilkami.' }
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'More on pH, EC and feeding schedules in [Feeding](/guide/nutrition).',
            cs: 'Víc o pH, EC a hnojicích plánech najdeš v kapitole [Hnojení](/guide/nutrition).'
          }
        }
      ]
    },
    {
      id: 'problems-burn-lockout',
      title: { en: 'Burn, lockout, water & heat stress', cs: 'Přehnojení, zablokování, zálivka a horko' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'These problems are caused by too much of something rather than too little: too much food, too much light, too much (or too little) water, too much heat. The good news is that they\'re usually easy to fix once you spot them.',
            cs: 'Tyhle problémy nezpůsobuje nedostatek, ale přebytek: moc hnojiva, moc světla, moc (nebo málo) vody, moc tepla. Dobrá zpráva je, že když je včas poznáš, většinou se dají snadno spravit.'
          }
        },
        {
          type: 'text',
          md: {
            en: '## Nutrient burn\nLeaf tips turn yellow, then brown and crispy, and the burn slowly creeps inwards. Very dark green leaves whose tips curl down like claws mean too much nitrogen.\n**Fix:** lower the feed strength by 20–30 % or give a plain pH-corrected watering. If runoff EC is very high, water through until it drops. Burnt tips stay burnt; watch the new leaves.',
            cs: '## Přehnojení (spálení živinami)\nŠpičky listů zežloutnou, pak zhnědnou a zkřehnou a spálenina se pomalu šíří dovnitř. Hodně tmavě zelené listy se špičkami stočenými dolů jako drápy znamenají přebytek dusíku.\n**Řešení:** sniž dávku hnojiva o 20–30 % nebo zalij jen čistou vodou se správným pH. Když je EC odtoku hodně vysoké, proplachuj, dokud neklesne. Spálené špičky už zůstanou, sleduj nové listy.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-nutrient-burn',
          caption: { en: 'Nutrient burn: brown, crispy tips creeping inwards.', cs: 'Přehnojení: hnědé, křehké špičky, které se šíří dovnitř.' }
        },
        {
          type: 'figure',
          photo: 'nutrient-burn.jpg',
          caption: { en: 'Fertiliser burn on a cannabis leaf.', cs: 'Spálení hnojivem na listu konopí.' },
          credit: `Fenrisulfir · CC BY-SA 3.0 (${WIKI})`
        },
        {
          type: 'text',
          md: {
            en: '## pH lockout\nThe plant shows several deficiencies at once, or gets worse the more you feed. The nutrients are there, but at the wrong pH the roots can\'t take them up.\n**Fix:** measure runoff pH and EC. Water through with pH-corrected water (about 2–3× the pot volume in soil, less in coco), then go back to feeding at half strength and increase slowly.',
            cs: '## Zablokování kvůli pH\nRostlina ukazuje víc nedostatků najednou, nebo je jí tím hůř, čím víc hnojíš. Živiny v substrátu jsou, ale při špatném pH je kořeny nepřijmou.\n**Řešení:** změř pH a EC odtoku. Propláchni substrát vodou se správným pH (v hlíně zhruba 2–3× objem květináče, v kokosu méně), pak hnoj na půl dávky a postupně přidávej.'
          }
        },
        {
          type: 'interactive',
          widget: 'ph-availability',
          props: { medium: 'soil' },
          caption: {
            en: 'Move the pH and watch which nutrients become unavailable.',
            cs: 'Posouvej pH a sleduj, které živiny přestanou být dostupné.'
          }
        },
        {
          type: 'text',
          md: {
            en: '## Light burn\nOnly the top leaves and buds closest to the lamp bleach yellow or white, while lower leaves look fine. Unlike nitrogen deficiency it starts at the top.\n**Fix:** raise or dim the lamp. Without added CO₂, more than about 900–1,000 µmol/m²/s PPFD at the canopy rarely helps.',
            cs: '## Spálení světlem\nVyblednou do žluta až do běla jen vrchní listy a palice nejblíž lampě, spodní listy jsou v pořádku. Na rozdíl od nedostatku dusíku to začíná nahoře.\n**Řešení:** lampu zvedni nebo ztlum. Bez přidaného CO₂ víc než zhruba 900–1 000 µmol/m²/s PPFD u vršků většinou nepomůže.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-light-burn',
          caption: { en: 'Light burn: bleached leaves right under the lamp.', cs: 'Spálení světlem: vybledlé listy přímo pod lampou.' }
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Overwatering', cs: 'Přelití' },
              glyph: 'water',
              points: [
                { en: 'Leaves droop but feel firm and swollen, curled down along their whole length', cs: 'Listy visí, ale jsou pevné a napité, stočené dolů po celé délce' },
                { en: 'Pot stays heavy for days', cs: 'Květináč je několik dní těžký' },
                { en: 'Fungus gnats love it', cs: 'Smutnice jsou nadšené' },
                { en: 'Fix: let it dry out, water less often, check drainage', cs: 'Řešení: nech substrát proschnout, zalévej méně často, zkontroluj drenáž' }
              ]
            },
            {
              title: { en: 'Underwatering', cs: 'Nedostatek vody' },
              glyph: 'water',
              points: [
                { en: 'Leaves hang limp and thin, like wet paper', cs: 'Listy visí zplihle a tence jako mokrý papír' },
                { en: 'Pot is light, medium pulls away from the sides', cs: 'Květináč je lehký, substrát se odtahuje od stěn' },
                { en: 'Recovers within hours after watering', cs: 'Po zálivce se během pár hodin vzpamatuje' },
                { en: 'Fix: water slowly until a little runoff appears', cs: 'Řešení: zalévej pomalu, dokud dole trochu nevyteče' }
              ]
            }
          ]
        },
        {
          type: 'figure',
          illustration: 'leaf-overwatering',
          caption: { en: 'Overwatering: firm leaves curling down.', cs: 'Přelití: pevné listy stočené dolů.' }
        },
        {
          type: 'figure',
          illustration: 'leaf-underwatering',
          caption: { en: 'Underwatering: limp, papery leaves.', cs: 'Nedostatek vody: zplihlé listy jako papír.' }
        },
        {
          type: 'text',
          md: {
            en: '## Heat stress\nLeaf edges curl up into a "taco" or canoe shape, top leaves look shiny and stressed, and late in flower buds can grow odd spires (foxtailing).\n**Fix:** aim for 22–28 °C at canopy height with lights on, add airflow, raise the lamp and run the lights at night if the room gets hot during the day.',
            cs: '## Stres z horka\nOkraje listů se stáčejí nahoru do tvaru „taco“ nebo loďky, vrchní listy jsou lesklé a vystresované a v pozdním kvetení můžou palice vyhánět divné věžičky (foxtailing).\n**Řešení:** drž u vršků 22–28 °C při rozsvícené lampě, přidej proudění vzduchu, zvedni lampu, a pokud je přes den v místnosti horko, svěť v noci.'
          }
        },
        {
          type: 'interactive',
          widget: 'vpd',
          caption: {
            en: 'Heat and humidity work together. Check you\'re in the right VPD zone.',
            cs: 'Teplota a vlhkost spolu souvisí. Zkontroluj, že jsi ve správné zóně VPD.'
          }
        }
      ]
    },
    {
      id: 'problems-pests',
      title: { en: 'Pests', cs: 'Škůdci' },
      minutes: 6,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Indoor pests usually come in on clones, new plants, pets, clothes or unsterilised soil. Prevention is far easier than a cure, so inspect the **undersides** of leaves with a magnifier or phone camera once a week. Prefer **IPM** (integrated pest management): prevention, sticky traps, beneficial insects and mild sprays, with harsh chemicals as a last resort.',
            cs: 'Škůdci se do pěstírny většinou dostanou na řízcích, nových rostlinách, zvířatech, oblečení nebo v nesterilní hlíně. Prevence je mnohem snazší než léčba, takže jednou týdně prohlédni **spodní stranu** listů lupou nebo foťákem v mobilu. Drž se **IPM** (integrované ochrany): prevence, lepové desky, užiteční predátoři a šetrné postřiky, chemie až úplně nakonec.'
          }
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'No sprays on buds', cs: 'Žádné postřiky na palice' },
          md: {
            en: 'Once buds have formed (roughly from week 3 of flower), don\'t spray oils, soaps or neem on them. They stick in the flowers and spoil taste and safety. In flower, rely on beneficial insects, traps and removing affected leaves.',
            cs: 'Jakmile se tvoří palice (zhruba od 3. týdne kvetení), nestříkej na ně oleje, mýdla ani neem. Zůstanou v květech a zkazí chuť i bezpečnost. V kvetení spoléhej na predátory, lepové desky a odstraňování napadených listů.'
          }
        },
        {
          type: 'text',
          md: {
            en: '## Spider mites\n**ID:** tiny pale dots (stippling) on top of leaves, later fine webbing. The mites themselves are dot-sized and sit on the undersides.\n**Prevention:** they love hot, dry air, so don\'t let humidity crash. Quarantine new plants for two weeks.\n**Treatment:** shower the leaves (undersides too), then spray insecticidal (potassium) soap every 3 days in veg. Release predatory mites such as *Phytoseiulus persimilis* or *Neoseiulus californicus*. Webs on buds in late flower usually mean an early harvest.',
            cs: '## Svilušky\n**Jak je poznat:** drobné světlé tečky na horní straně listů, později jemné pavučinky. Samotné svilušky jsou velké jako tečka a sedí na spodní straně listů.\n**Prevence:** milují horký a suchý vzduch, takže nenech vlhkost spadnout moc nízko. Nové rostliny drž dva týdny v karanténě.\n**Léčba:** osprchuj listy (i zespodu) a ve vegetaci stříkej každé 3 dny draselným mýdlem. Vypusť dravé roztoče, třeba *Phytoseiulus persimilis* nebo *Neoseiulus californicus*. Pavučiny na palicích v pozdním kvetení většinou znamenají dřívější sklizeň.'
          }
        },
        {
          type: 'figure',
          illustration: 'pest-spider-mites',
          caption: { en: 'Spider mites: stippling on top, mites and webs below.', cs: 'Svilušky: tečkování nahoře, roztoči a pavučinky zespodu.' }
        },
        {
          type: 'figure',
          photo: 'spider-mites.jpg',
          caption: { en: 'Spider mite damage on a cannabis leaf, webbing clearly visible.', cs: 'Napadení sviluškami na listu konopí, pavučinky jsou dobře vidět.' },
          credit: `Rikva at Dutch Wikipedia · Public domain (${WIKI})`
        },
        {
          type: 'text',
          md: {
            en: '## Fungus gnats\n**ID:** small black flies hopping around the soil surface. The adults are harmless, but their larvae live in the wet top layer and chew on roots, which hurts seedlings and clones most.\n**Prevention:** let the top few centimetres dry out between waterings; don\'t overwater.\n**Treatment:** yellow sticky traps for adults, a BTI (*Bacillus thuringiensis israelensis*) soil drench for larvae, or beneficial nematodes (*Steinernema feltiae*) or predatory mites (*Stratiolaelaps scimitus*). A layer of sand on top helps too.',
            cs: '## Smutnice\n**Jak je poznat:** malé černé mušky, které poskakují po povrchu substrátu. Dospělci neškodí, ale jejich larvy žijí v mokré horní vrstvě a okusují kořeny, což nejvíc vadí sazenicím a řízkům.\n**Prevence:** mezi zálivkami nech horních pár centimetrů proschnout a nepřelévej.\n**Léčba:** žluté lepové desky na dospělce, zálivka s BTI (*Bacillus thuringiensis israelensis*) na larvy, nebo užitečné hlístice (*Steinernema feltiae*) či dravý roztoč (*Stratiolaelaps scimitus*). Pomůže i vrstva písku navrch.'
          }
        },
        {
          type: 'figure',
          illustration: 'pest-fungus-gnats',
          caption: { en: 'Fungus gnats: adults on the surface, larvae in wet soil.', cs: 'Smutnice: dospělci na povrchu, larvy ve vlhkém substrátu.' }
        },
        {
          type: 'figure',
          photo: 'fungus-gnat.jpg',
          caption: { en: 'An adult fungus gnat (photographed in the wild, not on cannabis).', cs: 'Dospělá smutnice (vyfocená v přírodě, ne na konopí).' },
          credit: `James K. Lindsey · CC BY-SA 3.0 (${WIKI})`
        },
        {
          type: 'text',
          md: {
            en: '## Thrips\n**ID:** silvery, shiny streaks and patches on leaves, often with tiny black dots (their droppings). The insects are slim, a millimetre or two long, and quick.\n**Prevention:** clean grow space, quarantine, blue sticky traps as an early warning.\n**Treatment:** predatory mites (*Amblyseius cucumeris* or *A. swirskii*) or minute pirate bugs (*Orius*). In veg, spinosad-based sprays work well.',
            cs: '## Třásněnky\n**Jak je poznat:** stříbřité, lesklé čárky a plošky na listech, často s drobnými černými tečkami (trus). Samotný hmyz je štíhlý, milimetr až dva dlouhý a rychlý.\n**Prevence:** čistá pěstírna, karanténa a modré lepové desky jako včasné varování.\n**Léčba:** dravý roztoč (*Amblyseius cucumeris* nebo *A. swirskii*) nebo dravá ploštice *Orius*. Ve vegetaci dobře fungují postřiky se spinosadem.'
          }
        },
        {
          type: 'figure',
          illustration: 'pest-thrips',
          caption: { en: 'Thrips: silvery streaks with black specks.', cs: 'Třásněnky: stříbřité čárky s černými tečkami.' }
        },
        {
          type: 'figure',
          photo: 'problems-thrips.webp',
          caption: { en: 'Western flower thrips on a hemp leaf: a pale larva and a slim adult.', cs: 'Třásněnka západní na listu konopí: světlá larva a štíhlý dospělec.' },
          credit: 'Dr. Guido Bohne · CC BY-SA 4.0 (iNaturalist), resized'
        },
        {
          type: 'text',
          md: {
            en: '## Aphids\n**ID:** clusters of small green, black or white soft-bodied insects on stems and under leaves, sticky honeydew, sometimes ants farming them.\n**Prevention:** check new plants, keep outdoor plants away from heavily infested neighbours.\n**Treatment:** squash or shower them off, spray insecticidal soap in veg. Ladybirds, lacewing larvae and the parasitic wasp *Aphidius colemani* clean them up fast.',
            cs: '## Mšice\n**Jak je poznat:** shluky malého zeleného, černého nebo bílého hmyzu s měkkým tělem na stoncích a pod listy, lepkavá medovice, občas je „pasou“ mravenci.\n**Prevence:** kontroluj nové rostliny a venku je nedávej k silně zamořeným sousedům.\n**Léčba:** rozmačkej je nebo spláchni sprchou, ve vegetaci postřik draselným mýdlem. Slunéčka, larvy zlatooček a parazitická vosička *Aphidius colemani* je rychle zlikvidují.'
          }
        },
        {
          type: 'figure',
          illustration: 'pest-aphids',
          caption: { en: 'Aphids: soft-bodied clusters on stems and leaf undersides.', cs: 'Mšice: shluky na stoncích a spodní straně listů.' }
        },
        {
          type: 'figure',
          photo: 'problems-aphids.webp',
          caption: { en: 'Black bean aphids crowding a hemp plant between its seeds.', cs: 'Mšice maková se hromadí na konopí mezi semeny.' },
          credit: 'Igor Balashov · CC BY 4.0 (iNaturalist), resized'
        },
        {
          type: 'checklist',
          id: 'problems-pests-weekly',
          items: [
            { en: 'Check leaf undersides on 3–4 random leaves per plant', cs: 'Prohlédni spodní stranu 3–4 náhodných listů u každé rostliny' },
            { en: 'Look at sticky traps and note any new catches', cs: 'Mrkni na lepové desky a zapiš nové úlovky' },
            { en: 'Feel the top of the substrate: is it drying between waterings?', cs: 'Sáhni na povrch substrátu: prosychá mezi zálivkami?' },
            { en: 'Remove dead leaves and debris from the floor', cs: 'Ukliď opadané listy a nečistoty z podlahy' }
          ]
        }
      ]
    },
    {
      id: 'problems-mould',
      title: { en: 'Bud rot & powdery mildew', cs: 'Hniloba palic a padlí' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Mould is the problem that can ruin a whole harvest in the last two weeks. Both main villains love stagnant, humid air, so the cure is mostly **climate and airflow**.',
            cs: 'Plíseň je problém, který ti může zničit celou úrodu v posledních dvou týdnech. Oba hlavní padouši milují stojatý a vlhký vzduch, takže léčba je hlavně o **klimatu a proudění vzduchu**.'
          }
        },
        {
          type: 'text',
          md: {
            en: '## Bud rot (Botrytis)\n**ID:** grey mould (*Botrytis cinerea*) starts **inside** dense colas. From outside you see a single sugar leaf that suddenly wilts and turns brown; pull the bud apart and it\'s grey-brown and mushy, sometimes with grey fuzz.\n**What to do:** cut out the whole affected bud with a good margin, put it straight into a bag without shaking it (spores spread easily), and clean your scissors. Check every cola daily from then on. **Never smoke mouldy buds.**',
            cs: '## Hniloba palic (plíseň šedá)\n**Jak ji poznat:** plíseň šedá (*Botrytis cinerea*) začíná **uvnitř** hustých palic. Zvenku uvidíš jen jeden lísteček, který najednou zvadne a zhnědne; když palici rozevřeš, je uvnitř šedohnědá a kašovitá, někdy s šedým chmýřím.\n**Co dělat:** vystřihni celou napadenou palici s dobrou rezervou, dej ji rovnou do sáčku a netřes s ní (spory se snadno šíří) a vydezinfikuj nůžky. Od té doby kontroluj každou palici denně. **Plesnivé palice nikdy nekuř.**'
          }
        },
        {
          type: 'figure',
          illustration: 'bud-rot',
          caption: { en: 'Bud rot: a wilting sugar leaf hides grey rot inside the cola.', cs: 'Hniloba palic: zvadlý lísteček skrývá šedou hnilobu uvnitř palice.' }
        },
        {
          type: 'figure',
          photo: 'bud-rot-botrytis.jpg',
          caption: {
            en: 'Grey mould (Botrytis cinerea) on a rose. On cannabis the same fuzz grows inside dense buds.',
            cs: 'Plíseň šedá (Botrytis cinerea) na růži. Na konopí roste stejné chmýří uvnitř hustých palic.'
          },
          credit: `Flowersabc · CC BY-SA 2.0 (${WIKI})`
        },
        {
          type: 'text',
          md: {
            en: '## Powdery mildew\n**ID:** white, flour-like spots on top of leaves that spread into a dusty coat. Wipe it with a finger and it smears off.\n**What to do:** remove affected leaves carefully. In veg you can spray potassium bicarbonate or a *Bacillus subtilis* product. In flower, don\'t spray buds; remove leaves, fix the climate and keep a close eye on it.',
            cs: '## Padlí\n**Jak ho poznat:** bílé skvrny jako od mouky na horní straně listů, které se rozrůstají v práškový povlak. Když po něm přejedeš prstem, setře se.\n**Co dělat:** opatrně odstraň napadené listy. Ve vegetaci můžeš stříkat hydrogenuhličitan draselný nebo přípravek s *Bacillus subtilis*. V kvetení na palice nestříkej; odstraňuj listy, sprav klima a bedlivě to sleduj.'
          }
        },
        {
          type: 'figure',
          illustration: 'powdery-mildew',
          caption: { en: 'Powdery mildew: white, flour-like spots on leaves.', cs: 'Padlí: bílé skvrny jako od mouky na listech.' }
        },
        {
          type: 'figure',
          photo: 'powdery-mildew.jpg',
          caption: {
            en: 'Powdery mildew coating a squash leaf. On cannabis it starts as small white spots.',
            cs: 'Padlí pokrývající list dýně. Na konopí začíná jako malé bílé skvrnky.'
          },
          credit: `Dmitry Brant · CC BY-SA 4.0 (${WIKI})`
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Keep humidity in check', cs: 'Hlídej vlhkost' },
              md: {
                en: 'Aim for about 40–50 % RH in late flower. Dense, big colas need it most.',
                cs: 'V pozdním kvetení drž vlhkost kolem 40–50 %. Nejvíc to potřebují velké, husté palice.'
              }
            },
            {
              title: { en: 'Move the air', cs: 'Hýbej vzduchem' },
              md: {
                en: 'Exhaust running, plus a fan that gently moves every part of the canopy, above and below.',
                cs: 'Odvětrání v provozu a k tomu ventilátor, který jemně provětrá celý porost, nad i pod listy.'
              }
            },
            {
              title: { en: 'Avoid big night drops', cs: 'Žádné velké noční poklesy' },
              md: {
                en: 'A sharp temperature drop when the lights go off pushes humidity up and can form dew on buds. Keep the swing under about 5–8 °C.',
                cs: 'Prudký pokles teploty po zhasnutí zvedne vlhkost a na palicích se může srazit rosa. Drž rozdíl zhruba pod 5–8 °C.'
              }
            },
            {
              title: { en: 'Thin the canopy', cs: 'Prosvětli porost' },
              md: {
                en: '[Defoliation and lollipopping](/guide/training) open up the plant so air can reach every bud.',
                cs: '[Defoliace a lollipopping](/guide/training) rostlinu otevřou, aby se vzduch dostal ke každé palici.'
              }
            },
            {
              title: { en: 'Outdoors: pick the right genetics', cs: 'Venku: vyber správnou genetiku' },
              md: {
                en: 'In wet climates choose mould-resistant strains and shake rain off buds after a storm.',
                cs: 'Ve vlhkém podnebí vybírej odrůdy odolné vůči plísni a po dešti z palic vodu jemně setřes.'
              }
            }
          ]
        }
      ]
    },
    {
      id: 'problems-hermies',
      title: { en: 'Hermaphrodites', cs: 'Hermafroditi' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'A hermaphrodite ("hermie") is a female plant that also grows male parts. Its pollen can seed your own buds and the rest of the tent, and seeded buds are smaller and harsher. Feminized seeds aren\'t immune; under enough stress any plant can do it.',
            cs: 'Hermafrodit („hermáč“) je samičí rostlina, které narostou i samčí části. Její pyl může opylit její vlastní palice i zbytek stanu a palice se semínky jsou menší a horší. Ani feminizovaná semínka nejsou imunní; při dostatečném stresu to zvládne jakákoli rostlina.'
          }
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Pollen sacs', cs: 'Pylové váčky' },
              points: [
                { en: 'Small round "balls" on short stems at nodes', cs: 'Malé kulaté „kuličky“ na krátkých stopkách v nodech' },
                { en: 'Usually early in flower', cs: 'Obvykle na začátku kvetení' },
                { en: 'Open after a few weeks and release pollen', cs: 'Po pár týdnech se otevřou a uvolní pyl' }
              ]
            },
            {
              title: { en: 'Nanners (bananas)', cs: 'Banánky' },
              points: [
                { en: 'Yellow, banana-shaped stamens poking out of buds', cs: 'Žluté prašníky ve tvaru banánku, které trčí z palic' },
                { en: 'Usually mid to late flower', cs: 'Obvykle ve středním až pozdním kvetení' },
                { en: 'Release pollen almost straight away', cs: 'Pyl uvolňují skoro okamžitě' }
              ]
            }
          ]
        },
        {
          type: 'figure',
          illustration: 'pre-flowers',
          caption: {
            en: 'Know the difference: female pistils vs. male pollen sacs.',
            cs: 'Pozor na rozdíl: samičí pestíky a samčí pylové váčky.'
          }
        },
        {
          type: 'figure',
          photo: 'problems-male-flowers.webp',
          caption: { en: 'An open male flower among developing seeds: where there is pollen, there will be seeds.', cs: 'Otevřený samčí květ mezi dozrávajícími semeny: kde je pyl, tam budou semena.' },
          credit: 'Patrick Hacker · CC BY 4.0 (iNaturalist), resized'
        },
        {
          type: 'text',
          md: {
            en: '## Common causes\n- **Light leaks** during the dark period of flowering (the classic one)\n- Irregular light schedule or long interruptions\n- Heat stress, severe nutrient or pH stress, root damage\n- Heavy damage or stress late in flower, or harvesting very late\n- Genetics: some strains are simply prone to it',
            cs: '## Časté příčiny\n- **Prosvítání světla** během tmavé fáze v kvetení (klasika)\n- Nepravidelný světelný režim nebo dlouhé výpadky\n- Stres z horka, silný stres z hnojení nebo pH, poškozené kořeny\n- Velké poškození nebo stres v pozdním kvetení, případně hodně pozdní sklizeň\n- Genetika: některé odrůdy k tomu prostě mají sklony'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Find the cause', cs: 'Najdi příčinu' },
              md: {
                en: 'Sit inside the tent with the lights off for a few minutes and look for any light leaks. Check timer, heat and feeding.',
                cs: 'Sedni si na pár minut do stanu se zhasnutou lampou a hledej, kudy prosvítá světlo. Zkontroluj časovač, teplotu a hnojení.'
              }
            },
            {
              title: { en: 'A few sacs early on', cs: 'Pár váčků na začátku' },
              md: {
                en: 'Pluck them off carefully with tweezers before they open, then inspect the plant every day.',
                cs: 'Opatrně je odstraň pinzetou dřív, než se otevřou, a pak rostlinu kontroluj každý den.'
              }
            },
            {
              title: { en: 'Many sacs or keeps coming back', cs: 'Hodně váčků nebo se to vrací' },
              md: {
                en: 'Remove the plant from the grow before it pollinates everything else.',
                cs: 'Rostlinu z pěstírny odstraň dřív, než opylí všechno ostatní.'
              }
            },
            {
              title: { en: 'A few nanners in the last 1–2 weeks', cs: 'Pár banánků v posledních 1–2 týdnech' },
              md: {
                en: 'Common and mostly harmless at this point. Pick them off if you can and harvest on time.',
                cs: 'Běžná věc a v téhle fázi většinou neškodná. Pokud to jde, otrhej je a skliď včas.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Don\'t keep seeds from a hermie: they tend to pass the trait on.',
            cs: 'Semínka z hermafrodita si nenechávej: sklon k tomu se často dědí.'
          }
        }
      ]
    },
    {
      id: 'problems-review',
      title: { en: 'Recap & quiz', cs: 'Shrnutí a kvíz' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: '- Check **pH, EC, watering, light and climate** before blaming a nutrient.\n- **Old leaves** first = mobile nutrient (N, P, K, Mg). **New growth** first = immobile (Ca, Fe, S, Zn).\n- Burnt tips = too much food; bleached tops = too much light; taco leaves = heat.\n- Inspect leaf undersides weekly; no sprays on buds.\n- Late flower: humidity around 40–50 % and plenty of airflow against bud rot.\n- Hermies are mostly caused by stress, especially light leaks.',
            cs: '- Než to svedeš na živinu, zkontroluj **pH, EC, zálivku, světlo a klima**.\n- Nejdřív **staré listy** = pohyblivá živina (N, P, K, Mg). Nejdřív **nové přírůstky** = nepohyblivá (Ca, Fe, S, Zn).\n- Spálené špičky = moc hnojiva; vybledlé vršky = moc světla; listy jako taco = horko.\n- Spodní strany listů kontroluj každý týden; na palice nestříkej.\n- V pozdním kvetení drž vlhkost kolem 40–50 % a hodně proudění proti hnilobě palic.\n- Hermafroditi vznikají hlavně ze stresu, nejčastěji z prosvítajícího světla.'
          }
        },
        {
          type: 'figure',
          photo: 'problems-mites-macro.webp',
          caption: { en: 'Spider mites under a loupe. Five minutes with a lens every week catches them early.', cs: 'Svilušky pod lupou. Pět minut s lupou každý týden je odhalí včas.' },
          credit: 'Dr. Guido Bohne · CC BY-SA 4.0 (iNaturalist), resized'
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'problems-q1',
              q: {
                en: 'Your lower leaves are turning yellow. What should you do first?',
                cs: 'Spodní listy ti žloutnou. Co uděláš jako první?'
              },
              options: [
                { en: 'Add more nitrogen right away', cs: 'Hned přidám dusík' },
                { en: 'Check pH, EC and watering', cs: 'Zkontroluju pH, EC a zálivku' },
                { en: 'Flush the pot with lots of plain water', cs: 'Propláchnu květináč spoustou čisté vody' },
                { en: 'Cut off all yellow leaves', cs: 'Ustřihnu všechny žluté listy' }
              ],
              correct: 1,
              explain: {
                en: 'Most deficiencies are caused by pH, feeding or watering problems. Check the basics before you add or flush anything.',
                cs: 'Většinu nedostatků způsobí pH, hnojení nebo zálivka. Než cokoli přidáš nebo propláchneš, zkontroluj základy.'
              }
            },
            {
              id: 'problems-q2',
              q: {
                en: 'New leaves at the top are bright yellow with green veins. What\'s the most likely cause?',
                cs: 'Nové listy nahoře jsou jasně žluté se zelenými žilkami. Co je nejpravděpodobnější příčina?'
              },
              options: [
                { en: 'Nitrogen deficiency', cs: 'Nedostatek dusíku' },
                { en: 'Magnesium deficiency', cs: 'Nedostatek hořčíku' },
                { en: 'Iron deficiency from high pH', cs: 'Nedostatek železa kvůli vysokému pH' },
                { en: 'Overwatering', cs: 'Přelití' }
              ],
              correct: 2,
              explain: {
                en: 'Iron is immobile, so it shows in new growth, and it\'s usually locked out by pH that\'s too high. Nitrogen and magnesium start on old leaves.',
                cs: 'Železo je nepohyblivé, takže se projeví na nových přírůstcích, a obvykle ho zablokuje moc vysoké pH. Dusík a hořčík začínají na starých listech.'
              }
            },
            {
              id: 'problems-q3',
              q: {
                en: 'Only the top leaves right under the lamp are bleached, the rest of the plant looks fine. Why?',
                cs: 'Vybledlé jsou jen vrchní listy přímo pod lampou, zbytek rostliny vypadá dobře. Proč?'
              },
              options: [
                { en: 'Light burn: the lamp is too close or too strong', cs: 'Spálení světlem: lampa je moc blízko nebo moc silná' },
                { en: 'Nitrogen deficiency', cs: 'Nedostatek dusíku' },
                { en: 'Spider mites', cs: 'Svilušky' },
                { en: 'Underwatering', cs: 'Nedostatek vody' }
              ],
              correct: 0,
              explain: {
                en: 'Damage limited to the leaves closest to the light points to light burn. Raise or dim the lamp.',
                cs: 'Poškození jen u listů nejblíž světlu ukazuje na spálení světlem. Lampu zvedni nebo ztlum.'
              }
            },
            {
              id: 'problems-q4',
              q: {
                en: 'You see tiny pale dots on top of the leaves and fine webbing. What\'s going on?',
                cs: 'Na horní straně listů vidíš drobné světlé tečky a jemné pavučinky. Co se děje?'
              },
              options: [
                { en: 'Fungus gnats', cs: 'Smutnice' },
                { en: 'Calcium deficiency', cs: 'Nedostatek vápníku' },
                { en: 'Powdery mildew', cs: 'Padlí' },
                { en: 'Spider mites', cs: 'Svilušky' }
              ],
              correct: 3,
              explain: {
                en: 'Stippling plus webbing is the classic sign of spider mites. Check the leaf undersides to confirm.',
                cs: 'Tečkování a pavučinky jsou typický znak svilušek. Pro jistotu se podívej na spodní stranu listů.'
              }
            },
            {
              id: 'problems-q5',
              q: {
                en: 'What helps most against bud rot in late flower?',
                cs: 'Co v pozdním kvetení nejvíc pomáhá proti hnilobě palic?'
              },
              options: [
                { en: 'Spraying the buds with neem oil', cs: 'Postřik palic neemovým olejem' },
                { en: 'Raising humidity so buds don\'t dry out', cs: 'Zvýšit vlhkost, aby palice nevysychaly' },
                { en: 'Humidity around 40–50 % and good airflow', cs: 'Vlhkost kolem 40–50 % a dobré proudění vzduchu' },
                { en: 'Feeding more potassium', cs: 'Víc draslíku v hnojení' }
              ],
              correct: 2,
              explain: {
                en: 'Botrytis loves stagnant, humid air. Low humidity and airflow prevent it; sprays on buds are a no-go.',
                cs: 'Plíseň šedá miluje stojatý vlhký vzduch. Brání jí nízká vlhkost a proudění; postřiky na palice nepřipadají v úvahu.'
              }
            },
            {
              id: 'problems-q6',
              q: {
                en: 'What is the most common cause of hermaphrodites indoors?',
                cs: 'Co je uvnitř nejčastější příčina hermafroditů?'
              },
              options: [
                { en: 'Light leaks during the dark period', cs: 'Prosvítání světla během tmavé fáze' },
                { en: 'Using LED instead of HPS', cs: 'LED místo výbojky' },
                { en: 'Watering with tap water', cs: 'Zálivka vodou z kohoutku' },
                { en: 'Too big a pot', cs: 'Moc velký květináč' }
              ],
              correct: 0,
              explain: {
                en: 'Interrupting the 12-hour night stresses a flowering plant. Check your tent for light leaks with the lights off.',
                cs: 'Narušená dvanáctihodinová noc kvetoucí rostlinu stresuje. Zkontroluj stan se zhasnutým světlem, jestli někudy neprosvítá.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
