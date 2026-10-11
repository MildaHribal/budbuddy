import type { Chapter } from '../types'

export default {
  id: 'nutrition',
  order: 7,
  title: { en: 'Feeding', cs: 'Hnojení' },
  summary: {
    en: 'What your plant eats, how to keep pH and EC in range, when to feed what and how to spot that you overdid it.',
    cs: 'Co rostlina jí, jak udržet pH a EC v rozmezí, kdy čím hnojit a jak poznat, že jsi to přehnal.'
  },
  glyph: 'feed',
  color: '#c9a2ff',
  lessons: [
    {
      id: 'nutrition-npk',
      title: { en: 'NPK & micronutrients', cs: 'NPK a mikroprvky' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Every bottle of fertilizer lists three numbers, like **3-1-2**. That is the **NPK** ratio: nitrogen, phosphorus and potassium. These are the macronutrients the plant uses in the largest amounts. Next to them it needs secondary nutrients and a pinch of micronutrients.',
            cs: 'Na každé lahvi hnojiva najdeš tři čísla, třeba **3-1-2**. To je poměr **NPK**: dusík, fosfor a draslík. Jsou to makroprvky, kterých rostlina spotřebuje nejvíc. Vedle nich potřebuje sekundární živiny a špetku mikroprvků.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Nutrient', cs: 'Živina' },
            { en: 'What it does', cs: 'K čemu je' },
            { en: 'When it matters most', cs: 'Kdy je nejdůležitější' }
          ],
          rows: [
            [{ en: 'N, nitrogen', cs: 'N, dusík' }, { en: 'Leaves, stems, green colour', cs: 'Listy, stonky, zelená barva' }, { en: 'Vegetation', cs: 'Vegetace' }],
            [{ en: 'P, phosphorus', cs: 'P, fosfor' }, { en: 'Roots, energy, flower formation', cs: 'Kořeny, energie, tvorba květů' }, { en: 'Early flower', cs: 'Začátek kvetení' }],
            [{ en: 'K, potassium', cs: 'K, draslík' }, { en: 'Water balance, bud density', cs: 'Hospodaření s vodou, hustota palic' }, { en: 'Mid to late flower', cs: 'Střed a konec kvetení' }],
            [{ en: 'Ca, calcium', cs: 'Ca, vápník' }, { en: 'Cell walls, new growth', cs: 'Buněčné stěny, nové přírůstky' }, { en: 'Whole grow, coco & LED', cs: 'Celý grow, kokos a LED' }],
            [{ en: 'Mg, magnesium', cs: 'Mg, hořčík' }, { en: 'Core of chlorophyll', cs: 'Základ chlorofylu' }, { en: 'Whole grow, esp. flower', cs: 'Celý grow, hlavně kvetení' }],
            [{ en: 'S, sulfur', cs: 'S, síra' }, { en: 'Proteins, aroma (terpenes)', cs: 'Bílkoviny, vůně (terpeny)' }, { en: 'Flower', cs: 'Kvetení' }],
            [{ en: 'Fe, Zn, Mn, B, Cu, Mo', cs: 'Fe, Zn, Mn, B, Cu, Mo' }, { en: 'Micronutrients, enzymes', cs: 'Mikroprvky, enzymy' }, { en: 'Tiny amounts, always', cs: 'V malém množství, pořád' }]
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          title: { en: 'Mobile vs immobile', cs: 'Pohyblivé a nepohyblivé' },
          md: {
            en: 'N, P, K and Mg are **mobile**: when they run short, the plant moves them from old leaves, so deficiencies show **low** on the plant. Ca, Fe, S and Zn are **immobile**, so their deficiencies show on **new growth** at the top.',
            cs: 'N, P, K a Mg jsou **pohyblivé**: když chybí, rostlina je přesune ze starých listů, takže nedostatek uvidíš **dole**. Ca, Fe, S a Zn jsou **nepohyblivé**, jejich nedostatek se ukáže na **nových přírůstcích** nahoře.'
          }
        },
        {
          type: 'text',
          md: {
            en: 'You do not need to mix single salts. A good **base nutrient** line (often a grow and a bloom bottle, or an A+B pair for coco and hydro) covers everything. Use the one made for your medium and add CalMag if needed. Detailed deficiency pictures are in [Problems](/guide/problems).',
            cs: 'Nemusíš míchat jednotlivé soli. Dobrá řada **základních hnojiv** (často grow a bloom, nebo dvousložkové A+B pro kokos a hydro) pokryje všechno. Používej to, co je určené pro tvůj substrát, a v případě potřeby přidej CalMag. Fotky jednotlivých nedostatků najdeš v kapitole [Problémy](/guide/problems).'
          }
        }
      ]
    },
    {
      id: 'nutrition-ph-ec',
      title: { en: 'pH & EC per medium', cs: 'pH a EC podle substrátu' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: '**pH** decides whether roots can actually take up the food you give. Outside the range some nutrients get locked out, even if they are in the pot. **EC** (electrical conductivity) tells you how strong the solution is, meaning how much dissolved fertilizer is in it.',
            cs: '**pH** rozhoduje, jestli kořeny dokážou živiny, které jim dáváš, vůbec přijmout. Mimo rozmezí se část živin zablokuje, i když v květináči jsou. **EC** (elektrická vodivost) říká, jak silný je roztok, tedy kolik rozpuštěného hnojiva v něm je.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Medium', cs: 'Substrát' },
            { en: 'pH range', cs: 'Rozmezí pH' },
            { en: 'Sweet spot', cs: 'Ideál' },
            { en: 'Peak EC (mS/cm)', cs: 'Max. EC (mS/cm)' }
          ],
          rows: [
            [{ en: 'Soil', cs: 'Hlína' }, { en: '6.0–7.0', cs: '6,0–7,0' }, { en: '6.3–6.8', cs: '6,3–6,8' }, { en: '1.2–1.8', cs: '1,2–1,8' }],
            [{ en: 'Coco', cs: 'Kokos' }, { en: '5.5–6.5', cs: '5,5–6,5' }, { en: '5.8–6.2', cs: '5,8–6,2' }, { en: '1.4–2.2', cs: '1,4–2,2' }],
            [{ en: 'Hydro', cs: 'Hydro' }, { en: '5.5–6.5', cs: '5,5–6,5' }, { en: '5.6–6.0', cs: '5,6–6,0' }, { en: '1.4–2.2', cs: '1,4–2,2' }]
          ]
        },
        {
          type: 'interactive',
          widget: 'ph-availability',
          props: { medium: 'soil' },
          caption: { en: 'Slide the pH and watch which nutrients become hard to take up.', cs: 'Posuň pH a sleduj, které živiny se začnou hůř přijímat.' }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Mix nutrients first', cs: 'Nejdřív rozmíchej hnojivo' },
              md: { en: 'Add each bottle to the water separately and stir in between. Fertilizer shifts pH, so measure only after mixing.', cs: 'Každou lahev přidávej do vody zvlášť a mezitím zamíchej. Hnojivo mění pH, takže měř až po rozmíchání.' }
            },
            {
              title: { en: 'Check EC', cs: 'Změř EC' },
              md: { en: 'Compare with the stage targets in [feeding by stage](/guide/nutrition#nutrition-schedule).', cs: 'Porovnej s cíli pro danou fázi v lekci [hnojení podle fáze](/guide/nutrition#nutrition-schedule).' }
            },
            {
              title: { en: 'Adjust pH last', cs: 'pH uprav nakonec' },
              md: { en: 'Use pH down/up in small drops, stir, wait a minute and measure again.', cs: 'pH mínus/plus přidávej po kapkách, zamíchej, chvíli počkej a změř znovu.' }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'EC, PPM and confusion', cs: 'EC, PPM a zmatek' },
          md: {
            en: 'PPM meters convert EC with different factors: 1.0 EC = 500 ppm (scale 500) or 700 ppm (scale 700). Stick to EC and you avoid the mess. Calibrate the pH pen every few weeks and keep it stored in storage solution.',
            cs: 'PPM metry přepočítávají EC různými koeficienty: 1,0 EC = 500 ppm (škála 500), nebo 700 ppm (škála 700). Když se budeš držet EC, vyhneš se zmatku. pH metr kalibruj každých pár týdnů a skladuj ho v uchovávacím roztoku.'
          }
        },
        {
          type: 'text',
          md: {
            en: 'Not sure how much of each bottle goes into your can? Use the [nutrient calculator](/tools).',
            cs: 'Nevíš, kolik které lahve dát do konve? Použij [kalkulačku hnojiv](/tools).'
          }
        }
      ]
    },
    {
      id: 'nutrition-schedule',
      title: { en: 'Feeding by stage', cs: 'Hnojení podle fáze' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Manufacturer charts are a ceiling, not a target. Most plants do great at **50–75 % of the label dose**. Start low, watch the leaves and raise slowly.',
            cs: 'Tabulky výrobců jsou strop, ne cíl. Většině rostlin se daří skvěle na **50–75 % dávky z etikety**. Začni níž, sleduj listy a přidávej pomalu.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Stage', cs: 'Fáze' },
            { en: 'EC coco/hydro', cs: 'EC kokos/hydro' },
            { en: 'Soil', cs: 'Hlína' },
            { en: 'Focus', cs: 'Na co se zaměřit' }
          ],
          rows: [
            [{ en: 'Seedling', cs: 'Sazenice' }, { en: '0.4–0.8', cs: '0,4–0,8' }, { en: 'Water only', cs: 'Jen voda' }, { en: 'Little or no feed, CalMag in coco', cs: 'Málo nebo nic, v kokosu CalMag' }],
            [{ en: 'Early veg', cs: 'Začátek vegetace' }, { en: '0.8–1.2', cs: '0,8–1,2' }, { en: 'Light feed from week 2–4', cs: 'Lehce od 2.–4. týdne' }, { en: 'Grow (N-rich) base', cs: 'Růstové hnojivo (víc N)' }],
            [{ en: 'Late veg', cs: 'Konec vegetace' }, { en: '1.2–1.6', cs: '1,2–1,6' }, { en: 'Every 2nd watering', cs: 'Každá 2. zálivka' }, { en: 'Grow base, full CalMag', cs: 'Růstové hnojivo, plný CalMag' }],
            [{ en: 'Flip & stretch (wk 1–3)', cs: 'Přepnutí a stretch (1.–3. týden)' }, { en: '1.4–1.8', cs: '1,4–1,8' }, { en: 'Every 2nd watering', cs: 'Každá 2. zálivka' }, { en: 'Switch to bloom, plant still needs N', cs: 'Přechod na bloom, dusík ještě potřebuje' }],
            [{ en: 'Mid flower', cs: 'Střed kvetení' }, { en: '1.6–2.2', cs: '1,6–2,2' }, { en: 'Every 2nd watering', cs: 'Každá 2. zálivka' }, { en: 'Bloom + PK, peak demand', cs: 'Bloom + PK, největší spotřeba' }],
            [{ en: 'Late flower', cs: 'Konec kvetení' }, { en: '1.2–1.6, tapering', cs: '1,2–1,6, klesá' }, { en: 'Lighter or water', cs: 'Slaběji nebo voda' }, { en: 'Less N, let leaves fade naturally', cs: 'Méně N, listy můžou přirozeně blednout' }]
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          title: { en: 'Autoflowers eat less', cs: 'Automatky jedí méně' },
          md: {
            en: 'Keep autos about 25 % below these numbers. They have a short life and little time to recover from overfeeding.',
            cs: 'U automatek drž hodnoty zhruba o 25 % níž. Žijí krátce a na zotavení z přehnojení nemají čas.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'The plant is the real schedule. Dark green leaves with slightly clawed tips mean back off. Pale lower leaves in veg mean it is hungry.',
            cs: 'Skutečný rozvrh určuje rostlina. Tmavě zelené listy se zahnutými špičkami znamenají ubrat. Bledé spodní listy ve vegetaci znamenají, že má hlad.'
          }
        }
      ]
    },
    {
      id: 'nutrition-calmag',
      title: { en: 'CalMag', cs: 'CalMag' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'CalMag is a supplement with calcium and magnesium (often plus a little iron). Base nutrients contain some, but in a few situations it is not enough:',
            cs: 'CalMag je doplněk s vápníkem a hořčíkem (často i trochou železa). Základní hnojiva ho nějaký obsahují, ale v některých situacích to nestačí:'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Coco', cs: 'Kokos' },
              md: { en: 'Coco binds calcium and magnesium, especially in the first weeks. Use CalMag from the first feed.', cs: 'Kokos váže vápník a hořčík, hlavně v prvních týdnech. Používej CalMag od prvního hnojení.' }
            },
            {
              title: { en: 'LED lights', cs: 'LED osvětlení' },
              md: { en: 'LEDs give off less radiant heat than HPS. Leaves stay cooler, the plant transpires less and moves less calcium. LED grows usually need more Ca/Mg.', cs: 'LED vyzařují méně tepla než výbojka. Listy jsou chladnější, rostlina méně odpařuje a přesouvá méně vápníku. Pod LED je obvykle potřeba víc Ca/Mg.' }
            },
            {
              title: { en: 'RO or very soft water', cs: 'RO nebo hodně měkká voda' },
              md: { en: 'Below EC 0.2 the water has almost no minerals. Add CalMag until it reads about 0.3–0.4 before adding base nutrients.', cs: 'Pod EC 0,2 voda skoro nemá minerály. Přidej CalMag, až bude ukazovat zhruba 0,3–0,4, a teprve pak základní hnojivo.' }
            }
          ]
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Calcium short', cs: 'Chybí vápník' },
              points: [
                { en: 'Rusty brown spots on new and middle leaves', cs: 'Rezavé hnědé skvrny na nových a středních listech' },
                { en: 'Twisted, crinkled new growth', cs: 'Zkroucené, zvlněné nové přírůstky' }
              ]
            },
            {
              title: { en: 'Magnesium short', cs: 'Chybí hořčík' },
              points: [
                { en: 'Yellowing between veins, veins stay green', cs: 'Žloutnutí mezi žilkami, žilky zůstávají zelené' },
                { en: 'Starts on older lower leaves', cs: 'Začíná na starších spodních listech' }
              ]
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          md: {
            en: 'Hard tap water already carries plenty of calcium. Measure its EC first. Adding CalMag on top of hard water can cause lockout of other nutrients.',
            cs: 'Tvrdá voda z kohoutku už vápníku obsahuje dost. Nejdřív jí změř EC. Přidávat CalMag do tvrdé vody může zablokovat jiné živiny.'
          }
        }
      ]
    },
    {
      id: 'nutrition-overfeeding',
      title: { en: 'Signs of overfeeding', cs: 'Jak poznat přehnojení' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Overfeeding is the most common beginner mistake, much more common than real deficiencies. Too many salts in the root zone make it hard for the plant to drink and burn the leaf tips.',
            cs: 'Přehnojení je nejčastější začátečnická chyba, mnohem častější než skutečný nedostatek. Příliš mnoho solí u kořenů rostlině ztěžuje pití a pálí špičky listů.'
          }
        },
        {
          type: 'figure',
          illustration: 'leaf-nutrient-burn',
          caption: { en: 'Nutrient burn: yellow-brown, crispy tips that slowly creep inward.', cs: 'Spálení hnojivem: žlutohnědé, křupavé špičky, které se pomalu šíří dovnitř.' }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Burnt tips', cs: 'Spálené špičky' },
              md: { en: 'Tips turn yellow, then brown and crispy. A tiny bit of tip burn in late flower is fine, it means you are at the limit.', cs: 'Špičky zežloutnou, pak zhnědnou a zkřupavějí. Lehké připálení špiček na konci kvetení nevadí, znamená, že jsi na hraně.' }
            },
            {
              title: { en: 'The claw', cs: 'Drápek' },
              md: { en: 'Very dark green, glossy leaves with tips curling down like a claw. Classic sign of too much nitrogen.', cs: 'Hodně tmavě zelené, lesklé listy se špičkami stočenými dolů jako dráp. Klasický znak přebytku dusíku.' }
            },
            {
              title: { en: 'Lockout', cs: 'Lockout (zablokování)' },
              md: { en: 'Many deficiency symptoms at once while you feed plenty. Salt buildup or wrong pH blocks uptake.', cs: 'Spousta příznaků nedostatku najednou, i když hnojíš hodně. Nahromaděné soli nebo špatné pH blokují příjem.' }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'What to do', cs: 'Co s tím' },
          md: {
            en: 'Drop the strength by 25–30 % and check pH. If runoff EC is far above what you feed, give one or two waterings with plain pH-adjusted water (or a very weak solution in coco) and measure runoff again. Damaged leaves will not recover, watch the new growth instead.',
            cs: 'Uber sílu o 25–30 % a zkontroluj pH. Pokud je EC výtoku výrazně nad tím, co dáváš, dej jednu nebo dvě zálivky čistou vodou s upraveným pH (v kokosu velmi slabým roztokem) a výtok změř znovu. Poškozené listy se nespraví, sleduj nové přírůstky.'
          }
        },
        {
          type: 'text',
          md: {
            en: 'Not sure what you are looking at? Try the diagnosis tool in [Problems](/guide/problems).',
            cs: 'Nevíš si rady s tím, co vidíš? Zkus diagnostiku v kapitole [Problémy](/guide/problems).'
          }
        }
      ]
    },
    {
      id: 'nutrition-runoff',
      title: { en: 'Runoff testing', cs: 'Měření výtoku' },
      minutes: 3,
      media: ['soil', 'coco'],
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Runoff is the water that drips out the bottom after watering. Measuring it tells you what is happening in the root zone, which you cannot see from above.',
            cs: 'Výtok je voda, která po zálivce vyteče spodem květináče. Když ji změříš, dozvíš se, co se děje u kořenů, což shora nevidíš.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Note what goes in', cs: 'Zapiš si, co dáváš' },
              md: { en: 'Measure pH and EC of your watering can.', cs: 'Změř pH a EC roztoku v konvi.' }
            },
            {
              title: { en: 'Catch the runoff', cs: 'Zachyť výtok' },
              md: { en: 'Water normally, discard the very first drops, then collect a sample in a clean cup.', cs: 'Zalij normálně, úplně první kapky vylij a pak naber vzorek do čistého kelímku.' }
            },
            {
              title: { en: 'Compare', cs: 'Porovnej' },
              md: { en: 'Log both numbers in BudBuddy as a measurement so you can see the trend over time.', cs: 'Obě čísla si zapiš v BudBuddy jako měření, ať vidíš vývoj v čase.' }
            }
          ]
        },
        {
          type: 'table',
          head: [
            { en: 'Runoff vs input', cs: 'Výtok vs vstup' },
            { en: 'Meaning', cs: 'Co to znamená' },
            { en: 'Action', cs: 'Co udělat' }
          ],
          rows: [
            [{ en: 'EC about the same (±0.3)', cs: 'EC zhruba stejné (±0,3)' }, { en: 'Plant eats what you give', cs: 'Rostlina sní, co dáváš' }, { en: 'Keep going', cs: 'Pokračuj' }],
            [{ en: 'EC much higher (+0.5 or more)', cs: 'EC výrazně vyšší (o 0,5 a víc)' }, { en: 'Salts building up', cs: 'Hromadí se soli' }, { en: 'Feed weaker, water to more runoff', cs: 'Hnoj slaběji, zalévej s větším výtokem' }],
            [{ en: 'EC lower', cs: 'EC nižší' }, { en: 'Plant is hungry', cs: 'Rostlina má hlad' }, { en: 'Raise strength a little', cs: 'Mírně přidej' }],
            [{ en: 'pH off by more than ~0.5', cs: 'pH ujíždí o víc než ~0,5' }, { en: 'Medium drifting, lockout risk', cs: 'Substrát ujíždí, hrozí lockout' }, { en: 'Check input pH, correct gradually', cs: 'Zkontroluj vstupní pH, opravuj postupně' }]
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'Runoff numbers in soil are rough, organic soils especially. Treat them as a trend, not an exact reading. In hydro you simply measure the reservoir.',
            cs: 'V hlíně, hlavně organické, jsou čísla z výtoku jen orientační. Ber je jako trend, ne jako přesné měření. V hydru prostě měříš nádrž.'
          }
        }
      ]
    },
    {
      id: 'nutrition-flush',
      title: { en: 'Flushing before harvest', cs: 'Proplach před sklizní' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: '"Flushing" means giving only plain water (or a very weak solution) for the last 1–2 weeks of flower. Growers have argued about it for decades, so here is the honest version.',
            cs: '„Proplach“ (flush) znamená dávat poslední 1–2 týdny kvetení jen čistou vodu (nebo velmi slabý roztok). Pěstitelé se o něj přou desítky let, tak tady je poctivá verze.'
          }
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'For flushing', cs: 'Pro proplach' },
              points: [
                { en: 'Many growers swear it gives smoother smoke and white ash', cs: 'Hodně pěstitelů přísahá na jemnější kouř a bílý popel' },
                { en: 'Clears salt buildup in coco and hydro', cs: 'V kokosu a hydru odstraní nahromaděné soli' },
                { en: 'Little risk if the plant is healthy', cs: 'Malé riziko, když je rostlina zdravá' }
              ]
            },
            {
              title: { en: 'Against flushing', cs: 'Proti proplachu' },
              points: [
                { en: 'A small university study (Guelph, 2020) found no difference in taste or ash in blind tests', cs: 'Malá univerzitní studie (Guelph, 2020) nenašla ve slepých testech rozdíl v chuti ani popelu' },
                { en: 'Harsh smoke is mostly bad drying and curing', cs: 'Drsný kouř je většinou důsledek špatného sušení a zrání' },
                { en: 'Starving a hungry plant can cost yield', cs: 'Vyhladovění rostliny může stát výnos' }
              ]
            }
          ]
        },
        {
          type: 'text',
          md: {
            en: 'The research is thin and does not settle it either way. What clearly matters more: **do not overfeed in late flower**, and take [drying and curing](/guide/harvest) seriously.\n\nA sensible middle ground most growers land on:',
            cs: 'Výzkumu je málo a jednoznačně to nerozhodl. Co prokazatelně hraje větší roli: **nepřehnojuj na konci kvetení** a ber vážně [sušení a zrání](/guide/harvest).\n\nRozumný kompromis, ke kterému dojde většina pěstitelů:'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Soil', cs: 'Hlína' },
              md: { en: 'Taper feeding over the last 2 weeks and finish with plain water for 7–10 days. Organic living soil: just keep watering.', cs: 'Poslední 2 týdny postupně ubírej hnojení a posledních 7–10 dní dávej jen vodu. Živá organická půda: prostě dál zalévej.' }
            },
            {
              title: { en: 'Coco & hydro', cs: 'Kokos a hydro' },
              md: { en: 'Inert media empty fast. 5–7 days of plain pH-adjusted water (or EC ~0.4–0.6) is plenty.', cs: 'Inertní média se vyprázdní rychle. 5–7 dní čisté vody s upraveným pH (nebo EC ~0,4–0,6) úplně stačí.' }
            },
            {
              title: { en: 'Keep pH right', cs: 'Hlídej pH' },
              md: { en: 'Even plain water should be pH-adjusted to your medium.', cs: 'I čistá voda by měla mít pH upravené pro tvůj substrát.' }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'Fading, yellowing fan leaves in the last weeks are normal. The plant pulls stored nutrients into the buds.',
            cs: 'Blednutí a žloutnutí velkých listů v posledních týdnech je normální. Rostlina stahuje uložené živiny do palic.'
          }
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'nutrition-q1',
              q: { en: 'What does the K in NPK stand for?', cs: 'Co znamená K v NPK?' },
              options: [
                { en: 'Calcium', cs: 'Vápník' },
                { en: 'Potassium', cs: 'Draslík' },
                { en: 'Phosphorus', cs: 'Fosfor' },
                { en: 'Carbon', cs: 'Uhlík' }
              ],
              correct: 1,
              explain: {
                en: 'K is potassium (kalium). It drives water balance and bud density in flower.',
                cs: 'K je draslík (kalium). Řídí hospodaření s vodou a hustotu palic v kvetení.'
              }
            },
            {
              id: 'nutrition-q2',
              q: { en: 'When should you measure the pH of your nutrient solution?', cs: 'Kdy máš měřit pH živného roztoku?' },
              options: [
                { en: 'Before adding nutrients', cs: 'Před přidáním hnojiva' },
                { en: 'After mixing all nutrients', cs: 'Po rozmíchání všech hnojiv' },
                { en: 'Only once a week', cs: 'Jen jednou týdně' },
                { en: 'Only in hydro', cs: 'Jen v hydru' }
              ],
              correct: 1,
              explain: {
                en: 'Nutrients shift pH, so adjust it as the very last step.',
                cs: 'Hnojiva pH posouvají, proto se upravuje úplně nakonec.'
              }
            },
            {
              id: 'nutrition-q3',
              q: { en: 'Why do LED grows often need more CalMag?', cs: 'Proč se pod LED často potřebuje víc CalMagu?' },
              options: [
                { en: 'LEDs destroy calcium in the medium', cs: 'LED ničí vápník v substrátu' },
                { en: 'Cooler leaves transpire less and move less calcium', cs: 'Chladnější listy méně odpařují a přesouvají méně vápníku' },
                { en: 'LEDs make the plant grow slower', cs: 'Pod LED roste rostlina pomaleji' },
                { en: 'They do not, it is a myth', cs: 'Nepotřebuje, je to mýtus' }
              ],
              correct: 1,
              explain: {
                en: 'Less radiant heat means less transpiration, and calcium travels with the water stream.',
                cs: 'Méně sálavého tepla znamená menší odpar a vápník se v rostlině pohybuje s proudem vody.'
              }
            },
            {
              id: 'nutrition-q4',
              q: { en: 'Dark green leaves with tips curling down like a claw usually mean…', cs: 'Tmavě zelené listy se špičkami stočenými dolů jako dráp obvykle znamenají…' },
              options: [
                { en: 'Too much nitrogen', cs: 'Přebytek dusíku' },
                { en: 'Magnesium deficiency', cs: 'Nedostatek hořčíku' },
                { en: 'Too little light', cs: 'Málo světla' },
                { en: 'Underwatering', cs: 'Málo vody' }
              ],
              correct: 0,
              explain: {
                en: 'The claw is the classic nitrogen toxicity sign. Cut the grow nutrient back.',
                cs: 'Drápek je klasický znak přebytku dusíku. Uber růstové hnojivo.'
              }
            },
            {
              id: 'nutrition-q5',
              q: { en: 'Your runoff EC is 2.6 while you feed at 1.6. What is going on?', cs: 'EC výtoku je 2,6 a ty dáváš 1,6. Co se děje?' },
              options: [
                { en: 'The plant is hungry, feed more', cs: 'Rostlina má hlad, přidej' },
                { en: 'Salts are building up, feed weaker with more runoff', cs: 'Hromadí se soli, hnoj slaběji a s větším výtokem' },
                { en: 'All is fine', cs: 'Všechno je v pořádku' },
                { en: 'The meter is broken for sure', cs: 'Měřák je určitě rozbitý' }
              ],
              correct: 1,
              explain: {
                en: 'Runoff far above input means the plant is not using it all and salts accumulate in the medium.',
                cs: 'Výtok výrazně nad vstupem znamená, že rostlina všechno nespotřebuje a soli se hromadí v substrátu.'
              }
            },
            {
              id: 'nutrition-q6',
              q: { en: 'What does current research say about flushing?', cs: 'Co říká současný výzkum o proplachu?' },
              options: [
                { en: 'It is proven to double flavour', cs: 'Prokazatelně zdvojnásobí chuť' },
                { en: 'It is proven to be harmful', cs: 'Prokazatelně škodí' },
                { en: 'Evidence is thin, a small study found no clear difference', cs: 'Důkazů je málo, malá studie nenašla jasný rozdíl' },
                { en: 'It is required by law', cs: 'Vyžaduje ho zákon' }
              ],
              correct: 2,
              explain: {
                en: 'The debate is open. Not overfeeding late and a proper dry and cure matter more.',
                cs: 'Debata je otevřená. Víc záleží na tom nepřehnojovat ke konci a pořádně sušit a nechat zrát.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
