import type { Chapter } from '../types'

export default {
  id: 'training',
  order: 6,
  title: { en: 'Plant training', cs: 'Tvarování rostlin' },
  summary: {
    en: 'Shape the plant for a flat, even canopy and more top buds: LST, topping, FIM, SCROG, defoliation, lollipopping and supercropping.',
    cs: 'Vytvaruj rostlinu do rovné a rovnoměrné koruny s víc vrcholovými palicemi: LST, topping, FIM, SCROG, defoliace, lollipopping a supercropping.'
  },
  glyph: 'train',
  color: '#9be36b',
  lessons: [
    {
      id: 'training-lst',
      title: { en: 'LST – low stress training', cs: 'LST – tvarování s nízkým stresem' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Left alone, cannabis grows like a Christmas tree: one big top cola and smaller buds below that get less light. **Training** spreads the plant out so many tops sit at the same height under the lamp. **LST** does it without cutting – you just bend and tie branches down.',
            cs: 'Konopí samo od sebe roste jako vánoční stromek: jedna velká vrcholová palice a pod ní menší, které dostávají méně světla. **Tvarování** rostlinu roztáhne, aby bylo hodně vrcholků ve stejné výšce pod lampou. **LST** to dělá bez řezání – větve jen ohýbáš a přivazuješ dolů.'
          }
        },
        {
          type: 'interactive',
          widget: 'training',
          props: { technique: 'lst' },
          caption: {
            en: 'Bending the main stem sideways lets the side branches rise into new tops.',
            cs: 'Ohnutím hlavního stonku do strany se boční větve zvednou a stanou se z nich nové vrcholky.'
          }
        },
        {
          type: 'figure',
          photo: 'training-flat-canopy.webp',
          caption: {
            en: 'Plants trained flat in a tent: many tops at the same height, all close to the light.',
            cs: 'Rostliny vytvarované naplocho ve stanu: hodně vršků ve stejné výšce, všechny blízko světla.'
          },
          credit: 'Plantlady223 · CC BY-SA 4.0 (Wikimedia Commons), resized'
        },
        {
          type: 'text',
          md: {
            en: '**When:** from about the 4th–5th node until the first 2–3 weeks of flower, while stems are still flexible.',
            cs: '**Kdy:** zhruba od 4.–5. patra až do prvních 2–3 týdnů kvetení, dokud jsou stonky ohebné.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Prepare anchors', cs: 'Připrav úchyty' },
              md: {
                en: 'Soft plant wire, garden ties or string, and anchor points: holes in the pot rim or hooks pushed into the medium.',
                cs: 'Měkký vázací drát, zahradní úvazky nebo provázek a místa na uchycení: dírky v okraji květináče nebo háčky zapíchnuté do substrátu.'
              }
            },
            {
              title: { en: 'Bend the main stem', cs: 'Ohni hlavní stonek' },
              md: {
                en: 'Slowly bend the top towards the pot rim and tie it there. Bend where the stem is soft, not right at a node.',
                cs: 'Vrchol pomalu ohni k okraji květináče a tam ho přivaž. Ohýbej v měkkém místě stonku, ne přímo v uzlu.'
              }
            },
            {
              title: { en: 'Spread the side branches', cs: 'Roztáhni boční větve' },
              md: {
                en: 'Pull the branches outwards like spokes of a wheel so the middle opens up to light.',
                cs: 'Boční větve roztáhni do stran jako paprsky kola, aby se střed otevřel světlu.'
              }
            },
            {
              title: { en: 'Adjust every few days', cs: 'Každých pár dnů dolaď' },
              md: {
                en: 'Tops turn back up towards the light within a day. Re-bend whatever grows above the rest so the canopy stays flat.',
                cs: 'Vrcholky se do druhého dne otočí zpátky ke světlu. Co přeroste ostatní, znovu ohni, ať zůstane koruna rovná.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Risks', cs: 'Rizika' },
          md: {
            en: 'Thin wire cuts into the stem as it thickens – use padded ties and check them. Bend slowly; if a stem cracks, tape it and it usually heals.',
            cs: 'Tenký drát se do sílícího stonku zařízne – používej měkké úvazky a kontroluj je. Ohýbej pomalu; když stonek praskne, oblep ho páskou a většinou se zahojí.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'Autos', cs: 'Automatky' },
          md: {
            en: '**LST is the best training for autos.** It causes almost no stress, so the plant keeps growing at full speed.',
            cs: '**LST je pro automatky nejlepší tvarování.** Rostlinu skoro nestresuje, takže roste dál plnou rychlostí.'
          }
        }
      ]
    },
    {
      id: 'training-topping',
      title: { en: 'Topping', cs: 'Topping (zaštípnutí)' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: '**Topping** means cutting off the main growing tip. The two branches right below the cut take over, so one top becomes **two**. Repeat on each new top and you get 4, 8 and more.',
            cs: '**Topping** znamená odstřihnout hlavní vzrostný vrchol. Dvě větve těsně pod řezem převezmou vedení, takže z jednoho vrcholku jsou **dva**. Opakuj na každém novém vrcholku a máš 4, 8 i víc.'
          }
        },
        {
          type: 'interactive',
          widget: 'training',
          props: { technique: 'topping' },
          caption: {
            en: 'Cut above a node and the two side shoots become new main tops.',
            cs: 'Řez nad uzlem a z dvou bočních výhonů se stanou nové hlavní vrcholky.'
          }
        },
        {
          type: 'figure',
          photo: 'training-topped-plant.webp',
          caption: {
            en: 'A freshly topped plant: the main tip is gone and the two shoots at the node below take over.',
            cs: 'Čerstvě zaštípnutá rostlina: hlavní vrchol chybí a vedení přebírají dva výhony z uzlu pod ním.'
          },
          credit: 'Da.WheezeGenetics · CC BY-SA 4.0 (Wikimedia Commons), resized'
        },
        {
          type: 'text',
          md: {
            en: '**When:** once the plant has 4–6 healthy nodes (about 3–5 weeks from seed). Stop topping about a week or two before the flip.',
            cs: '**Kdy:** jakmile má rostlina 4–6 zdravých pater (zhruba 3–5 týdnů od semínka). S toppingem přestaň týden až dva před přepnutím na květ.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Pick the node', cs: 'Vyber patro' },
              md: {
                en: 'Choose the 3rd–5th node. Lower nodes give a lower, wider plant.',
                cs: 'Vyber 3.–5. patro. Nižší patro dá nižší a širší rostlinu.'
              }
            },
            {
              title: { en: 'Cut cleanly', cs: 'Střihni čistě' },
              md: {
                en: 'Use clean, sharp scissors and cut the stem just above the node, leaving the two small side shoots intact.',
                cs: 'Čistými ostrými nůžkami přestřihni stonek těsně nad uzlem a nech oba malé boční výhonky nepoškozené.'
              }
            },
            {
              title: { en: 'Let it recover', cs: 'Nech ji zotavit' },
              md: {
                en: 'Growth slows for 3–7 days. Then tie the two new tops apart with LST to keep them level.',
                cs: 'Růst se na 3–7 dní zpomalí. Pak oba nové vrcholky roztáhni od sebe pomocí LST, ať jsou ve stejné výšce.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Risks & autos', cs: 'Rizika a automatky' },
          md: {
            en: 'Topping a stressed or sick plant sets it back. **Autos:** mostly not recommended – the recovery time eats into their short veg. If you try it, top only once, at node 3–4 and before ~day 21.',
            cs: 'Topping vystresované nebo nemocné rostliny ji vrátí zpátky. **Automatky:** spíš nedoporučujeme – zotavení jim ukousne z krátké vegetace. Když to zkusíš, zaštípni jen jednou, ve 3.–4. patře a do ~21. dne.'
          }
        }
      ]
    },
    {
      id: 'training-fim',
      title: { en: 'FIM', cs: 'FIM' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: '**FIM** ("F*** I Missed") is a sloppy cousin of topping: instead of cutting the whole tip, you pinch or cut off about **75 % of the newest growth**. Done well, it can give 3–4 new tops at once – but results vary a lot.',
            cs: '**FIM** („F*** I Missed“, tedy „sakra, netrefil jsem se“) je ledabylejší bratranec toppingu: místo celého vrcholu odštípneš nebo odstřihneš zhruba **75 % nejmladšího výhonu**. Když se povede, vzniknou najednou 3–4 nové vrcholky – výsledky jsou ale dost nevyzpytatelné.'
          }
        },
        {
          type: 'interactive',
          widget: 'training',
          props: { technique: 'fim' },
          caption: {
            en: 'Pinch most of the new tip and leave a little at the base – several shoots can grow from it.',
            cs: 'Odštípni většinu nového vrcholku a u základu nech kousek – může z něj vyrůst několik výhonů.'
          }
        },
        {
          type: 'figure',
          photo: 'training-shoot-tip.webp',
          caption: {
            en: 'The newest growth in the centre of the top – this small cluster is what you pinch when you FIM.',
            cs: 'Nejmladší výhon uprostřed vrcholu – právě tenhle malý shluk při FIM odštípneš.'
          },
          credit: 'M. Whitson · CC BY 4.0 (iNaturalist), resized'
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Find the newest growth', cs: 'Najdi nejmladší výhon' },
              md: {
                en: 'At 4–5 nodes, look at the small cluster of tiny leaves at the very top.',
                cs: 'Ve 4.–5. patře se podívej na malý chomáček drobných lístků úplně nahoře.'
              }
            },
            {
              title: { en: 'Pinch about three quarters', cs: 'Odštípni asi tři čtvrtiny' },
              md: {
                en: 'Squeeze the cluster between your nails or scissors and remove the top ~75 %, leaving a little base.',
                cs: 'Chomáček sevři mezi nehty nebo nůžkami a odeber vrchních ~75 %, malý základ nech.'
              }
            },
            {
              title: { en: 'Wait and see', cs: 'Počkej a sleduj' },
              md: {
                en: 'In about a week you will see 2–4 new tops – or just one if the cut was too shallow.',
                cs: 'Zhruba za týden uvidíš 2–4 nové vrcholky – nebo jen jeden, když byl řez moc mělký.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          title: { en: 'Topping or FIM?', cs: 'Topping, nebo FIM?' },
          md: {
            en: 'FIM stresses the plant a bit less than topping and can make more tops, but they are less even. **Autos:** FIM is slightly gentler than topping, but LST is still the safer choice.',
            cs: 'FIM rostlinu stresuje o něco méně než topping a může dát víc vrcholků, jen méně vyrovnaných. **Automatky:** FIM je o kousek šetrnější než topping, ale bezpečnější volba je pořád LST.'
          }
        }
      ]
    },
    {
      id: 'training-scrog',
      title: { en: 'SCROG – screen of green', cs: 'SCROG – zelená síť' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: '**SCROG** uses a horizontal net (screen) above the pots. You weave branches through it, so the whole tent turns into one flat, even canopy of tops. It is the most efficient use of a lamp, especially with few plants in a small space.',
            cs: '**SCROG** využívá vodorovnou síť nad květináči. Větve jí proplétáš, takže se celý stan promění v jednu rovnou, vyrovnanou korunu vrcholků. Je to nejefektivnější využití lampy, hlavně s pár rostlinami na malém prostoru.'
          }
        },
        {
          type: 'interactive',
          widget: 'training',
          props: { technique: 'scrog' },
          caption: {
            en: 'Branches tucked under the net fill every square before the flip.',
            cs: 'Větve zastrkané pod síť zaplní každé okénko ještě před přepnutím na květ.'
          }
        },
        {
          type: 'figure',
          photo: 'training-scrog-canopy.webp',
          caption: {
            en: 'An outdoor SCROG in flower: a long, even wall of colas instead of one tall main top.',
            cs: 'Venkovní SCROG v květu: dlouhá vyrovnaná stěna palic místo jednoho vysokého vrcholu.'
          },
          credit: 'Cannabis Pictures · CC BY 2.0 (Wikimedia Commons), resized'
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Set up the net', cs: 'Natáhni síť' },
              md: {
                en: 'Use a net with 5×5 cm squares, about 20–30 cm above the pots. Stretch it tight to the tent poles.',
                cs: 'Použij síť s oky 5×5 cm, asi 20–30 cm nad květináči. Pořádně ji napni ke tyčím stanu.'
              }
            },
            {
              title: { en: 'Top or LST first', cs: 'Nejdřív topping nebo LST' },
              md: {
                en: 'A plant with many evenly sized branches fills the net faster.',
                cs: 'Rostlina s víc stejně velkými větvemi zaplní síť rychleji.'
              }
            },
            {
              title: { en: 'Tuck, don\'t pull', cs: 'Zastrkávej, netahej' },
              md: {
                en: 'When a tip grows 5–10 cm above the net, tuck it back under and point it to an empty square. Do it every 1–2 days.',
                cs: 'Když vrcholek přeroste síť o 5–10 cm, zastrč ho zpátky pod ni a nasměruj do prázdného oka. Dělej to každý den nebo obden.'
              }
            },
            {
              title: { en: 'Flip at ~70–80 % filled', cs: 'Přepni při zaplnění ~70–80 %' },
              md: {
                en: 'The stretch fills the rest. After about 2 weeks of flower, stop tucking and let the tops grow up through the net.',
                cs: 'Zbytek dorovná natahování v kvetení. Zhruba po 2 týdnech kvetení přestaň zastrkávat a nech vrcholky prorůst sítí nahoru.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Risks & autos', cs: 'Rizika a automatky' },
          md: {
            en: 'Once plants are in the net, you can\'t move them – plan watering access first. Dense canopy needs good airflow and some cleaning below the net. **Autos:** possible with a low net and LST only, but they rarely have time to fill it.',
            cs: 'Jakmile jsou rostliny v síti, už s nimi nepohneš – předem si promysli přístup k zálivce. Hustá koruna potřebuje dobré proudění vzduchu a trochu prosvětlení pod sítí. **Automatky:** jde to s nízkou sítí a jen s LST, ale málokdy ji stihnou zaplnit.'
          }
        }
      ]
    },
    {
      id: 'training-defoliation',
      title: { en: 'Defoliation', cs: 'Defoliace' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: '**Defoliation** means removing selected big fan leaves so light and air reach bud sites below. It improves airflow (less mould risk) and helps lower buds develop. It is a balance – leaves are also the plant\'s solar panels.',
            cs: '**Defoliace** znamená odebrání vybraných velkých vějířovitých listů, aby se světlo a vzduch dostaly k nižším místům pro palice. Zlepší proudění vzduchu (menší riziko plísně) a pomůže spodním palicím. Je to ale balanc – listy jsou zároveň solární panely rostliny.'
          }
        },
        {
          type: 'interactive',
          widget: 'training',
          props: { technique: 'defoliation' },
          caption: {
            en: 'Remove leaves that shade bud sites, keep the rest.',
            cs: 'Odeber listy, které stíní místa pro palice, zbytek nech.'
          }
        },
        {
          type: 'figure',
          photo: 'training-removed-fan-leaves.webp',
          caption: {
            en: 'Fan leaves removed during defoliation. Take only the ones that shade bud sites, never all at once.',
            cs: 'Velké listy odstraněné při defoliaci. Ber jen ty, které stíní místa pro palice, nikdy všechno najednou.'
          },
          credit: 'Beeblebrox · CC BY-SA 4.0 (Wikimedia Commons), resized'
        },
        {
          type: 'text',
          md: {
            en: '**When:** a light pass in late veg, a bigger one right before or at the flip, and often a second around day 21 of flower. Avoid heavy defoliation after week 4 of flower.',
            cs: '**Kdy:** lehce koncem vegetace, víc těsně před přepnutím nebo při něm a často ještě jednou kolem 21. dne kvetení. Po 4. týdnu kvetení už velké zásahy nedělej.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Pick the shading leaves', cs: 'Vyber stínící listy' },
              md: {
                en: 'Big fan leaves covering tops or bud sites, and leaves pointing into the middle of the plant.',
                cs: 'Velké vějířovité listy, které zakrývají vrcholky nebo místa pro palice, a listy mířící do středu rostliny.'
              }
            },
            {
              title: { en: 'Snip at the stalk', cs: 'Střihni u řapíku' },
              md: {
                en: 'Cut the leaf stalk near the stem with clean scissors. Don\'t tear – it leaves open wounds.',
                cs: 'Čistými nůžkami přestřihni řapík u stonku. Netrhej – zůstanou otevřené rány.'
              }
            },
            {
              title: { en: 'Take max ~20–30 % at once', cs: 'Najednou max ~20–30 %' },
              md: {
                en: 'Then give the plant a week before the next round.',
                cs: 'Pak dej rostlině týden, než přijde další kolo.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Risks & autos', cs: 'Rizika a automatky' },
          md: {
            en: 'Too much at once slows growth and can cut yield. Never defoliate a struggling plant. **Autos:** only light tucking or removing a few leaves that really block bud sites.',
            cs: 'Moc listů najednou zpomalí růst a může snížit výnos. Nikdy neodlisťuj rostlinu, která strádá. **Automatky:** jen lehce – listy radši zastrč, případně odeber pár těch, které opravdu zakrývají palice.'
          }
        }
      ]
    },
    {
      id: 'training-lollipopping',
      title: { en: 'Lollipopping', cs: 'Lollipopping' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: '**Lollipopping** is cleaning up the bottom of the plant: you remove small branches and leaves in the lower third that get little light. They would only make airy "popcorn" buds – the energy goes to the tops instead. The plant then looks like a lollipop.',
            cs: '**Lollipopping** je vyčištění spodku rostliny: odstraníš malé větvičky a listy ve spodní třetině, kam se světlo skoro nedostane. Tvořily by jen řídké „popcornové“ palice – energie tak půjde do vrcholků. Rostlina pak vypadá jako lízátko.'
          }
        },
        {
          type: 'interactive',
          widget: 'training',
          props: { technique: 'lollipop' },
          caption: {
            en: 'Bare lower stems, a full canopy on top.',
            cs: 'Holé spodní stonky, plná koruna nahoře.'
          }
        },
        {
          type: 'figure',
          photo: 'training-bare-lower-stem.webp',
          caption: {
            en: 'A cleaned-up lower stem: no small shoots at the bottom, all the energy goes to the tops up in the light.',
            cs: 'Vyčištěný spodek stonku: dole žádné drobné výhony, všechna energie jde do vršků na světle.'
          },
          credit: 'Cannabis Training University · CC BY-SA 3.0 (Wikimedia Commons), resized'
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Time it right', cs: 'Načasuj to' },
              md: {
                en: 'Just before the flip or in the first 1–3 weeks of flower, when you can see which branches will stay shaded.',
                cs: 'Těsně před přepnutím nebo v prvních 1–3 týdnech kvetení, kdy už vidíš, které větve zůstanou ve stínu.'
              }
            },
            {
              title: { en: 'Remove the lower third', cs: 'Odeber spodní třetinu' },
              md: {
                en: 'Cut small shoots and weak branches that don\'t reach the canopy. Leave the strong ones.',
                cs: 'Odstřihni malé výhonky a slabé větve, které nedosáhnou do koruny. Silné nech.'
              }
            },
            {
              title: { en: 'Spread it over two sessions', cs: 'Rozlož to na dvakrát' },
              md: {
                en: 'On big plants do half, then the rest a few days later to limit stress.',
                cs: 'U velkých rostlin udělej polovinu a zbytek za pár dní, ať je stres menší.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'Risks & autos', cs: 'Rizika a automatky' },
          md: {
            en: 'Low risk if done early in flower and not overdone. **Autos:** a light clean-up around weeks 4–5 works well, as it costs them little.',
            cs: 'Malé riziko, když to uděláš brzy v kvetení a nepřeženeš to. **Automatky:** lehké vyčištění kolem 4.–5. týdne funguje dobře, moc je to nestojí.'
          }
        }
      ]
    },
    {
      id: 'training-supercropping',
      title: { en: 'Supercropping', cs: 'Supercropping' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: '**Supercropping** is controlled damage: you squeeze a stem until the inner fibres soften and then bend it 90°. The branch forms a strong "knuckle" at the bend and grows sturdier. It is the go-to fix for a branch that shoots too close to the lamp.',
            cs: '**Supercropping** je řízené poškození: stonek mačkáš, dokud vnitřní vlákna nezměknou, a pak ho ohneš o 90°. V místě ohybu vznikne pevný „kloub“ a větev zesílí. Je to hlavní záchrana pro větev, která utíká moc blízko k lampě.'
          }
        },
        {
          type: 'interactive',
          widget: 'training',
          props: { technique: 'supercrop' },
          caption: {
            en: 'Soften, bend, heal – the knuckle carries more weight later.',
            cs: 'Změkčit, ohnout, zahojit – kloub pak unese víc váhy.'
          }
        },
        {
          type: 'figure',
          photo: 'training-high-stress-branches.webp',
          caption: {
            en: 'A high-stress-trained plant in flower: bent branches spread the colas sideways instead of up.',
            cs: 'Rostlina po tvarování s vysokým stresem v květu: ohnuté větve rozkládají palice do stran místo nahoru.'
          },
          credit: 'Kabelo bokaba · CC BY-SA 4.0 (Wikimedia Commons), resized'
        },
        {
          type: 'text',
          md: {
            en: '**When:** late veg up to about week 2 of flower (during the stretch). Use it on green, still flexible branches, not woody ones.',
            cs: '**Kdy:** koncem vegetace až zhruba do 2. týdne kvetení (během natahování). Používej na zelené, ještě ohebné větve, ne na zdřevnatělé.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Pick the spot', cs: 'Vyber místo' },
              md: {
                en: 'A soft part of the stem a few cm below the top, between two nodes.',
                cs: 'Měkkou část stonku pár cm pod vrcholkem, mezi dvěma uzly.'
              }
            },
            {
              title: { en: 'Squeeze and roll', cs: 'Mačkej a prokrucuj' },
              md: {
                en: 'Pinch the stem between thumb and finger and gently roll it for 10–20 s until it feels soft inside. The skin must stay intact.',
                cs: 'Stonek sevři mezi palcem a prstem a 10–20 s ho jemně prokrucuj, dokud uvnitř nezměkne. Slupka musí zůstat celá.'
              }
            },
            {
              title: { en: 'Bend and support', cs: 'Ohni a podepři' },
              md: {
                en: 'Bend the branch sideways ~90°. If it droops, tie or tape it. It perks up in 1–3 days.',
                cs: 'Ohni větev do strany o ~90°. Když visí, přivaž ji nebo podepři páskou. Do 1–3 dnů se zase zvedne.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Risks & autos', cs: 'Rizika a automatky' },
          md: {
            en: 'A broken skin lets disease in – tape it right away. It is high stress, so don\'t do it to sick plants or late in flower. **Autos:** avoid it; gentle LST does the same job with less stress.',
            cs: 'Prasklá slupka pustí dovnitř choroby – hned ji oblep páskou. Je to velký stres, takže ne na nemocné rostliny ani pozdě v kvetení. **Automatky:** radši vynech; stejnou práci udělá jemné LST s menším stresem.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Technique', cs: 'Technika' },
            { en: 'Stress', cs: 'Stres' },
            { en: 'Autos?', cs: 'Automatky?' }
          ],
          rows: [
            [{ en: 'LST', cs: 'LST' }, { en: 'Low', cs: 'Nízký' }, { en: 'Yes, best choice', cs: 'Ano, nejlepší volba' }],
            [{ en: 'Topping', cs: 'Topping' }, { en: 'High', cs: 'Vysoký' }, { en: 'Rather not', cs: 'Spíš ne' }],
            [{ en: 'FIM', cs: 'FIM' }, { en: 'Medium–high', cs: 'Střední–vysoký' }, { en: 'Rather not', cs: 'Spíš ne' }],
            [{ en: 'SCROG', cs: 'SCROG' }, { en: 'Low (with LST)', cs: 'Nízký (s LST)' }, { en: 'Possible', cs: 'Jde to' }],
            [{ en: 'Defoliation', cs: 'Defoliace' }, { en: 'Medium', cs: 'Střední' }, { en: 'Only lightly', cs: 'Jen lehce' }],
            [{ en: 'Lollipopping', cs: 'Lollipopping' }, { en: 'Low–medium', cs: 'Nízký–střední' }, { en: 'Lightly, yes', cs: 'Lehce ano' }],
            [{ en: 'Supercropping', cs: 'Supercropping' }, { en: 'High', cs: 'Vysoký' }, { en: 'No', cs: 'Ne' }]
          ]
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'train-q1',
              q: { en: 'Which training is safest for autoflowers?', cs: 'Které tvarování je pro automatky nejbezpečnější?' },
              options: [
                { en: 'Topping', cs: 'Topping' },
                { en: 'Supercropping', cs: 'Supercropping' },
                { en: 'LST', cs: 'LST' },
                { en: 'Heavy defoliation', cs: 'Silná defoliace' }
              ],
              correct: 2,
              explain: {
                en: 'LST bends without cutting, so autos keep growing at full speed during their short veg.',
                cs: 'LST ohýbá bez řezání, takže automatky rostou během krátké vegetace dál plnou rychlostí.'
              }
            },
            {
              id: 'train-q2',
              q: { en: 'What does topping do?', cs: 'Co udělá topping?' },
              options: [
                { en: 'Turns one main top into two', cs: 'Z jednoho hlavního vrcholku udělá dva' },
                { en: 'Makes the plant flower sooner', cs: 'Rostlina dřív pokvete' },
                { en: 'Removes the lower branches', cs: 'Odstraní spodní větve' },
                { en: 'Makes the stem thicker by squeezing', cs: 'Zesílí stonek mačkáním' }
              ],
              correct: 0,
              explain: {
                en: 'The two shoots below the cut take over as new main tops.',
                cs: 'Dva výhonky pod řezem převezmou roli nových hlavních vrcholků.'
              }
            },
            {
              id: 'train-q3',
              q: { en: 'When should you flip a SCROG to flower?', cs: 'Kdy přepnout SCROG na kvetení?' },
              options: [
                { en: 'As soon as the net is installed', cs: 'Hned po natažení sítě' },
                { en: 'When the net is ~70–80 % filled', cs: 'Když je síť zaplněná z ~70–80 %' },
                { en: 'Only when the net is 100 % filled', cs: 'Až když je síť zaplněná na 100 %' },
                { en: 'When branches are 30 cm above the net', cs: 'Když větve přerostou síť o 30 cm' }
              ],
              correct: 1,
              explain: {
                en: 'The flowering stretch fills the remaining gaps. Waiting for 100 % makes the canopy too dense.',
                cs: 'Zbylé mezery zaplní natahování v kvetení. Při čekání na 100 % bude koruna moc hustá.'
              }
            },
            {
              id: 'train-q4',
              q: { en: 'What is lollipopping for?', cs: 'K čemu je lollipopping?' },
              options: [
                { en: 'Making the plant taller', cs: 'Aby rostlina byla vyšší' },
                { en: 'Sending energy from shaded lower growth to the tops', cs: 'Přesměrovat energii ze stinného spodku do vrcholků' },
                { en: 'Preventing males', cs: 'Zabránit vzniku samců' },
                { en: 'Speeding up germination', cs: 'Urychlit klíčení' }
              ],
              correct: 1,
              explain: {
                en: 'Lower shoots would only make airy popcorn buds; removing them also improves airflow.',
                cs: 'Spodní výhony by daly jen řídké popcornové palice; jejich odstranění navíc zlepší proudění vzduchu.'
              }
            },
            {
              id: 'train-q5',
              q: { en: 'During supercropping the stem skin tears. What now?', cs: 'Při supercroppingu praskne slupka stonku. Co teď?' },
              options: [
                { en: 'Cut the branch off', cs: 'Větev odstřihnout' },
                { en: 'Ignore it', cs: 'Nevšímat si toho' },
                { en: 'Tape it up right away and support the branch', cs: 'Hned oblepit páskou a větev podepřít' },
                { en: 'Spray it with fertilizer', cs: 'Postříkat hnojivem' }
              ],
              correct: 2,
              explain: {
                en: 'Tape closes the wound and holds the branch – it usually heals within a week.',
                cs: 'Páska uzavře ránu a podrží větev – obvykle se do týdne zahojí.'
              }
            },
            {
              id: 'train-q6',
              q: { en: 'How much leaf should you remove in one defoliation round?', cs: 'Kolik listů odebrat při jednom kole defoliace?' },
              options: [
                { en: 'All fan leaves', cs: 'Všechny vějířovité listy' },
                { en: 'About 20–30 % at most', cs: 'Maximálně zhruba 20–30 %' },
                { en: 'At least 70 %', cs: 'Aspoň 70 %' },
                { en: 'Only yellow leaves, never green', cs: 'Jen žluté listy, nikdy zelené' }
              ],
              correct: 1,
              explain: {
                en: 'Leaves feed the plant. Take only the ones that shade bud sites, then give it a week.',
                cs: 'Listy rostlinu živí. Odeber jen ty, které stíní místa pro palice, a pak jí dej týden.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
