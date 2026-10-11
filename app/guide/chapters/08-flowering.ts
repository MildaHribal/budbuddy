import type { Chapter } from '../types'

export default {
  id: 'flowering',
  order: 8,
  title: { en: 'Flowering', cs: 'Kvetení' },
  summary: {
    en: 'The flip to 12/12, the stretch, how buds develop week by week, keeping mould away and reading trichomes to pick harvest day.',
    cs: 'Přepnutí na 12/12, stretch, jak se týden po týdnu vyvíjejí palice, jak si udržet plíseň od těla a jak podle trichomů poznat den sklizně.'
  },
  glyph: 'flowering',
  color: '#c9a2ff',
  lessons: [
    {
      id: 'flowering-flip',
      title: { en: 'The flip: 12/12 and autoflowers', cs: 'Přepnutí: 12/12 a automatky' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Photoperiod plants flower when the nights get long. Indoors you decide when that happens: switch the timer from **18/6** (veg) to **12/12** — 12 hours of light, 12 hours of *uninterrupted* darkness. That moment is called **the flip**.\n\nAutoflowers ignore the light schedule. They start flowering on their own around week 3–5 from sprouting, so you keep them on 18/6 (or 20/4) from seed to harvest.',
            cs: 'Fotoperiodické rostliny začnou kvést, když se prodlouží noci. Uvnitř o tom rozhoduješ ty: přepneš časovač z **18/6** (vegetace) na **12/12** — 12 hodin světla a 12 hodin *nepřerušené* tmy. Tomuhle se říká **přepnutí** (flip).\n\nAutomatky na světelný režim nereagují. Kvést začnou samy zhruba ve 3.–5. týdnu od vyklíčení, takže je necháš na 18/6 (nebo 20/4) od semínka až do sklizně.'
          }
        },
        { type: 'interactive', widget: 'photoperiod', caption: { en: 'Compare 18/6, 20/4 and 12/12.', cs: 'Porovnej 18/6, 20/4 a 12/12.' } },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Check plant size', cs: 'Zkontroluj velikost' },
              md: {
                en: 'Plants will grow another 50–100 % (sometimes more) after the flip. Flip when they are roughly **half the final height** you have room for.',
                cs: 'Po přepnutí rostliny vyrostou ještě o 50–100 % (někdy i víc). Přepínej, když mají zhruba **polovinu výšky**, na kterou máš místo.'
              }
            },
            {
              title: { en: 'Make sure the plant is female', cs: 'Ověř, že je to samice' },
              md: {
                en: 'With regular seeds, wait for [pre-flowers](/guide/vegetative) and remove males before they open pollen sacs.',
                cs: 'U regulárních semínek počkej na [předkvěty](/guide/vegetative) a samce vyhoď dřív, než se jim otevřou pylové váčky.'
              }
            },
            {
              title: { en: 'Set the timer to 12/12', cs: 'Nastav časovač na 12/12' },
              md: {
                en: 'Pick light-on hours when your room is cool — many growers run lights at night to fight summer heat.',
                cs: 'Vyber si hodiny svícení, kdy je v místnosti chladněji — hodně pěstitelů v létě svítí v noci, aby nebojovali s horkem.'
              }
            },
            {
              title: { en: 'Light-proof the tent', cs: 'Utěsni stan proti světlu' },
              md: {
                en: 'Sit inside with lights off during the day. Every pinhole, LED on a power strip or gap at the zipper needs covering.',
                cs: 'Přes den si vlez do stanu se zhasnutým světlem. Každou dírku, svítící diodu na prodlužce nebo škvíru u zipu zakryj.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Light leaks cause hermies', cs: 'Prosvítání způsobuje hermafrodity' },
          md: {
            en: 'Light during the dark period stresses photoperiod plants. They can stall, revert to veg or grow male flowers (*nanners*) that seed your crop. If you must enter during the dark, use a dim green light.',
            cs: 'Světlo během tmy fotoperiodické rostliny stresuje. Můžou se zaseknout, vrátit do vegetace nebo nasadit samčí květy (*banánky*), které ti osemení úrodu. Když do stanu musíš v noci, posviť si slabým zeleným světlem.'
          }
        },
        {
          type: 'callout',
          tone: 'info',
          title: { en: 'Outdoors', cs: 'Venku' },
          md: {
            en: 'Outdoor photoperiods flip by themselves when days shorten after the summer solstice — in Central Europe buds usually show in August and finish from late September into October.',
            cs: 'Venkovní fotoperiodky se přepnou samy, když se po letním slunovratu zkracují dny — ve střední Evropě se palice obvykle objeví v srpnu a dozrávají od konce září do října.'
          }
        }
      ]
    },
    {
      id: 'flowering-stretch',
      title: { en: 'The stretch', cs: 'Stretch' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'For the first **2–3 weeks after the flip** plants shoot up fast and space out their nodes. This is the **stretch**. Indica-leaning strains often grow 50 %, sativa-leaning ones can double or even triple in height.',
            cs: 'Prvních **2–3 týdny po přepnutí** rostliny rychle vyrostou a natáhnou se mezi patry. Tomu se říká **stretch**. Indikové odrůdy obvykle přidají kolem 50 %, sativové se můžou zdvojnásobit i ztrojnásobit.'
          }
        },
        { type: 'figure', illustration: 'stretch', caption: { en: 'Same plant at the flip and three weeks later.', cs: 'Stejná rostlina v den přepnutí a o tři týdny později.' } },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Keep training', cs: 'Pokračuj v tréninku' },
              md: {
                en: 'Keep tucking branches into the SCROG net or bending them with LST so the canopy stays flat. See [Plant training](/guide/training).',
                cs: 'Dál zastrkávej větve do SCROG sítě nebo je ohýbej LST, ať je vršek rovný. Viz [Trénink rostlin](/guide/training).'
              }
            },
            {
              title: { en: 'Last chance for hard training', cs: 'Poslední šance na tvrdý trénink' },
              md: {
                en: 'Supercropping still works early in the stretch. Don\'t top or FIM after the flip — the plant loses time it can\'t make up.',
                cs: 'Supercropping ještě na začátku stretche jde. Topovat ani FIMovat po přepnutí nedělej — rostlina ztratí čas, který už nedožene.'
              }
            },
            {
              title: { en: 'Watch the light distance', cs: 'Hlídej vzdálenost od světla' },
              md: {
                en: 'Raise the lamp as tops climb. Bleached, yellow tops right under the light mean light stress.',
                cs: 'Jak vršky rostou, zvedej lampu. Vybělené, žluté vršky těsně pod světlem znamenají stres ze světla.'
              }
            },
            {
              title: { en: 'Switch to bloom feeding gradually', cs: 'Postupně přejdi na květové hnojení' },
              md: {
                en: 'Plants still need nitrogen during the stretch. Blend veg and bloom nutrients for a week or two, then go full bloom. More in [Feeding](/guide/nutrition).',
                cs: 'Během stretche rostlina ještě potřebuje dusík. Týden dva míchej růstové a květové hnojivo, pak jeď jen na květové. Víc v kapitole [Hnojení](/guide/nutrition).'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Not sure how much a strain will stretch? Check the breeder\'s description or grow reports. When in doubt, flip a little earlier.',
            cs: 'Nevíš, jak moc se odrůda natáhne? Mrkni do popisu od šlechtitele nebo do grow reportů. Když si nejsi jistý, přepni radši o něco dřív.'
          }
        }
      ]
    },
    {
      id: 'flowering-bud-development',
      title: { en: 'Bud development week by week', cs: 'Vývoj palic týden po týdnu' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Most photoperiod strains flower for **8–10 weeks** (sativas up to 12+). The breeder\'s number is a guide, not a deadline — the trichomes decide. Here is a typical 9-week strain:',
            cs: 'Většina fotoperiodických odrůd kvete **8–10 týdnů** (sativy i 12 a víc). Číslo od šlechtitele je orientační, ne termín — rozhodují trichomy. Takhle vypadá typická 9týdenní odrůda:'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Week', cs: 'Týden' },
            { en: 'What you see', cs: 'Co vidíš' },
            { en: 'Your focus', cs: 'Na co se soustředit' }
          ],
          rows: [
            [
              { en: '1–2', cs: '1.–2.' },
              { en: 'Stretch, white pistils appear at the nodes.', cs: 'Stretch, v paždích se objevují bílé pestíky.' },
              { en: 'Training, light height, veg→bloom feed.', cs: 'Trénink, výška světla, přechod na květové hnojivo.' }
            ],
            [
              { en: '3–4', cs: '3.–4.' },
              { en: 'Stretch ends, bud sites fill with pistils, first smell.', cs: 'Stretch končí, místa palic se plní pestíky, první vůně.' },
              { en: 'Clean up the lower third (lollipop), add support.', cs: 'Vyčisti spodní třetinu (lollipop), přidej oporu.' }
            ],
            [
              { en: '5–6', cs: '5.–6.' },
              { en: 'Buds bulk up, trichomes cover the sugar leaves, smell gets strong.', cs: 'Palice nabírají, trichomy pokrývají cukrové lístky, vůně sílí.' },
              { en: 'Peak feeding, lower humidity, carbon filter.', cs: 'Vrchol hnojení, nižší vlhkost, uhlíkový filtr.' }
            ],
            [
              { en: '7–8', cs: '7.–8.' },
              { en: 'Buds harden, pistils darken and curl in, fan leaves yellow.', cs: 'Palice tvrdnou, pestíky hnědnou a stahují se, velké listy žloutnou.' },
              { en: 'Check for bud rot, start checking trichomes.', cs: 'Hlídej plíseň v palicích, začni koukat na trichomy.' }
            ],
            [
              { en: '9+', cs: '9.+' },
              { en: 'Most trichomes cloudy, some amber.', cs: 'Většina trichomů mléčná, některé jantarové.' },
              { en: 'Pick harvest day.', cs: 'Vyber den sklizně.' }
            ]
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          title: { en: 'Autoflowers', cs: 'Automatky' },
          md: {
            en: 'Autos follow the same pattern compressed into about 6–8 weeks of flower, usually 9–11 weeks from seed. Stretch is shorter and there is no time to recover from mistakes, so avoid stress.',
            cs: 'Automatky jedou podle stejného vzorce, jen zhuštěného do zhruba 6–8 týdnů kvetení, celkem obvykle 9–11 týdnů od semínka. Stretch je kratší a na nápravu chyb není čas, takže se stresu vyhýbej.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Yellowing fan leaves in the last 2–3 weeks are normal — the plant is pulling stored nutrients into the buds. Yellowing in week 3 is not; see [Problems & diagnosis](/guide/problems).',
            cs: 'Žloutnutí velkých listů v posledních 2–3 týdnech je normální — rostlina si z nich bere zásoby do palic. Žloutnutí ve 3. týdnu normální není, mrkni do [Problémů a diagnostiky](/guide/problems).'
          }
        }
      ]
    },
    {
      id: 'flowering-climate',
      title: { en: 'Climate & humidity in flower', cs: 'Klima a vlhkost v kvetení' },
      minutes: 5,
      environments: ['indoor', 'greenhouse'],
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Dense buds hold moisture. The biggest flower-stage threat is **bud rot** (*Botrytis*): grey mould that starts inside the bud where you can\'t see it. Your defence is lower humidity, steady airflow and no big temperature drops at night.',
            cs: 'Husté palice drží vlhkost. Největší hrozbou v kvetení je **plíseň šedá** v palicích (*Botrytis*): začíná uvnitř palice, kde ji nevidíš. Bráníš se nižší vlhkostí, stálým prouděním vzduchu a tím, že v noci nenecháš teplotu prudce spadnout.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Stage', cs: 'Fáze' },
            { en: 'Temp (lights on)', cs: 'Teplota (svítí)' },
            { en: 'RH', cs: 'Vlhkost' },
            { en: 'VPD', cs: 'VPD' }
          ],
          rows: [
            [
              { en: 'Early flower (wk 1–3)', cs: 'Začátek (1.–3. týden)' },
              { en: '22–27 °C', cs: '22–27 °C' },
              { en: '50–60 %', cs: '50–60 %' },
              { en: '1.0–1.3 kPa', cs: '1,0–1,3 kPa' }
            ],
            [
              { en: 'Mid flower (wk 4–6)', cs: 'Střed (4.–6. týden)' },
              { en: '21–26 °C', cs: '21–26 °C' },
              { en: '45–50 %', cs: '45–50 %' },
              { en: '1.2–1.5 kPa', cs: '1,2–1,5 kPa' }
            ],
            [
              { en: 'Late flower (wk 7+)', cs: 'Konec (7. týden a dál)' },
              { en: '20–25 °C', cs: '20–25 °C' },
              { en: '40–45 %', cs: '40–45 %' },
              { en: '1.3–1.6 kPa', cs: '1,3–1,6 kPa' }
            ]
          ]
        },
        { type: 'interactive', widget: 'vpd', caption: { en: 'Find your flower zone with your tent\'s numbers.', cs: 'Najdi si svou zónu pro kvetení podle čísel ze stanu.' } },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Keep night drop under ~5 °C', cs: 'Noční pokles do ~5 °C' },
              md: {
                en: 'When the lights go off, air cools and RH spikes. A big drop can push buds past the dew point.',
                cs: 'Po zhasnutí se vzduch ochladí a vlhkost vyskočí. Velký pokles teploty může na palicích srazit rosu.'
              }
            },
            {
              title: { en: 'Move air everywhere', cs: 'Vzduch musí proudit všude' },
              md: {
                en: 'Gentle oscillating fans above and below the canopy, plus an exhaust fan that swaps the tent air every 1–3 minutes.',
                cs: 'Jemné otočné ventilátory nad i pod vrškem a odtahový ventilátor, který vymění vzduch ve stanu každé 1–3 minuty.'
              }
            },
            {
              title: { en: 'Thin the canopy', cs: 'Prosvětli porost' },
              md: {
                en: 'Remove big leaves that sit on buds and the larfy growth in the shaded bottom. See [Plant training](/guide/training).',
                cs: 'Odstraň velké listy, které leží na palicích, a drobotinu ve stinném spodku. Viz [Trénink rostlin](/guide/training).'
              }
            },
            {
              title: { en: 'Use a dehumidifier if needed', cs: 'Když je třeba, přidej odvlhčovač' },
              md: {
                en: 'Plants in flower transpire a lot of water. A small dehumidifier in the room (or tent) is often the single best upgrade.',
                cs: 'Kvetoucí rostliny odpaří spoustu vody. Malý odvlhčovač v místnosti (nebo ve stanu) bývá ten nejlepší upgrade.'
              }
            }
          ]
        },
        { type: 'figure', illustration: 'bud-rot', caption: { en: 'Bud rot: a single brown, dry leaf poking out of an otherwise healthy bud is the first sign.', cs: 'Plíseň v palici: prvním znakem bývá jediný hnědý suchý lístek trčící ze zdánlivě zdravé palice.' } },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Found rot?', cs: 'Našel jsi plíseň?' },
          md: {
            en: 'Cut the bud out with a margin of healthy tissue, bag it before you carry it out and clean the scissors. Never try to save it — the spores spread. Check every big bud daily from then on. Details in [Problems & diagnosis](/guide/problems).',
            cs: 'Vyřízni palici i s kusem zdravé tkáně, než ji vyneseš, dej ji do sáčku a očisti nůžky. Nikdy ji nezachraňuj — spory se šíří. Od té doby kontroluj každou velkou palici denně. Podrobnosti v [Problémech a diagnostice](/guide/problems).'
          }
        },
        {
          type: 'callout',
          tone: 'info',
          title: { en: 'Smell', cs: 'Zápach' },
          md: {
            en: 'From week 4–5 the smell gets strong. Run the exhaust through a carbon filter and keep the tent at slight negative pressure (sides pulled slightly in).',
            cs: 'Od 4.–5. týdne vůně hodně zesílí. Odtah veď přes uhlíkový filtr a drž ve stanu mírný podtlak (stěny lehce vtažené dovnitř).'
          }
        }
      ]
    },
    {
      id: 'flowering-late',
      title: { en: 'Late flower care', cs: 'Péče na konci kvetení' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'The last few weeks are about **not messing up**. The buds are mostly built; now they ripen and swell. Keep conditions steady and handle plants gently.',
            cs: 'V posledních týdnech jde hlavně o to **nic nepokazit**. Palice jsou z velké části hotové, teď zrají a nabírají. Drž stabilní podmínky a s rostlinami zacházej jemně.'
          }
        },
        {
          type: 'checklist',
          id: 'flowering-late-weekly',
          items: [
            { en: 'Branches supported (yoyos, stakes or net) so heavy colas don\'t snap', cs: 'Větve podepřené (jojo háčky, tyčky nebo síť), ať se těžké palice nezlomí' },
            { en: 'Every big bud checked for rot or mould', cs: 'Každá velká palice zkontrolovaná na plíseň' },
            { en: 'RH at or below 45 % with lights on, no big night spikes', cs: 'Vlhkost při svícení do 45 %, v noci žádné velké skoky' },
            { en: 'Feeding tapered off, no heavy nutrient boosts', cs: 'Hnojení utlumené, žádné silné boostery' },
            { en: 'Under-leaf scan for spider mites and thrips', cs: 'Kontrola rubu listů na svilušky a třásněnky' },
            { en: 'Trichomes checked every 2–3 days from week 7', cs: 'Od 7. týdne trichomy každé 2–3 dny' }
          ]
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Do', cs: 'Dělej' },
              glyph: 'flowering',
              points: [
                { en: 'Keep watering on schedule — buds still need water.', cs: 'Zalévej pravidelně dál — palice vodu pořád potřebují.' },
                { en: 'Let fan leaves fade naturally.', cs: 'Nech velké listy přirozeně vyblednout.' },
                { en: 'Remove a leaf only if it sits on a bud or is rotting.', cs: 'List odstraň jen tehdy, když leží na palici nebo hnije.' }
              ]
            },
            {
              title: { en: 'Don\'t', cs: 'Nedělej' },
              glyph: 'pest',
              points: [
                { en: 'Spray anything on buds — not even water.', cs: 'Nic na palice nestříkej — ani vodu.' },
                { en: 'Raise nutrients "for bigger buds" — that means burnt tips, not weight.', cs: 'Nepřidávej hnojivo „pro větší palice" — dostaneš spálené špičky, ne váhu.' },
                { en: 'Defoliate heavily — the plant needs leaves to finish.', cs: 'Neodlisťuj ve velkém — rostlina listy na dozrání potřebuje.' }
              ]
            }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          title: { en: 'Flushing', cs: 'Proplach' },
          md: {
            en: 'Many growers feed plain water (or a very light feed) for the last 1–2 weeks in soil and the last few days in coco/hydro. The science is mixed; what clearly matters is not overfeeding. See [Feeding](/guide/nutrition).',
            cs: 'Hodně pěstitelů posledních 1–2 týdny v hlíně (v kokosu a hydru posledních pár dní) zalévá čistou vodou nebo jen velmi slabým hnojivem. Výzkumy se neshodují; jasně ale platí, že nesmíš přehnojovat. Viz [Hnojení](/guide/nutrition).'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Seeing yellow or orange bananas (*nanners*) late in flower? Some strains throw a few when overripe or stressed. Pull them off carefully and consider harvesting soon. More in [Problems & diagnosis](/guide/problems).',
            cs: 'Vidíš na konci kvetení žluté nebo oranžové banánky? Některé odrůdy pár vyhodí, když jsou přezrálé nebo ve stresu. Opatrně je otrhej a zvaž brzkou sklizeň. Víc v [Problémech a diagnostice](/guide/problems).'
          }
        }
      ]
    },
    {
      id: 'flowering-when-to-harvest',
      title: { en: 'When to harvest: reading trichomes', cs: 'Kdy sklízet: čtení trichomů' },
      minutes: 5,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Trichomes are the tiny resin glands that make buds sticky and frosty. Their heads change colour as the plant ripens, and that is the most reliable harvest signal. Pistils (the hairs) help, but they also darken from heat, touching or stress.',
            cs: 'Trichomy jsou drobné pryskyřičné žlázky, díky kterým jsou palice lepkavé a ojíněné. Jak rostlina zraje, mění jejich hlavičky barvu — a to je nejspolehlivější znamení sklizně. Pestíky (chloupky) napoví taky, jenže hnědnou i od tepla, osahávání nebo stresu.'
          }
        },
        { type: 'figure', illustration: 'trichome-stages', caption: { en: 'Clear → cloudy → amber trichome heads under magnification.', cs: 'Hlavičky trichomů pod zvětšením: čiré → mléčné → jantarové.' } },
        {
          type: 'table',
          head: [
            { en: 'Trichomes', cs: 'Trichomy' },
            { en: 'What it means', cs: 'Co to znamená' }
          ],
          rows: [
            [
              { en: 'Mostly clear', cs: 'Většinou čiré' },
              { en: 'Too early. Potency not there yet.', cs: 'Moc brzo. Účinek ještě není hotový.' }
            ],
            [
              { en: 'Mostly cloudy, few amber', cs: 'Většinou mléčné, pár jantarových' },
              { en: 'Peak — brighter, more energetic effect.', cs: 'Vrchol — svěžejší, energičtější účinek.' }
            ],
            [
              { en: 'Cloudy with 10–30 % amber', cs: 'Mléčné s 10–30 % jantarových' },
              { en: 'The classic window — fuller, more relaxing effect.', cs: 'Klasické okno — plnější, uvolňující účinek.' }
            ],
            [
              { en: 'Lots of amber', cs: 'Hodně jantarových' },
              { en: 'Late — heavier and sleepier, THC is breaking down.', cs: 'Pozdě — těžší a ospalý účinek, THC se rozkládá.' }
            ]
          ]
        },
        { type: 'interactive', widget: 'trichomes', caption: { en: 'Slide to see what each ratio means for harvest.', cs: 'Posouvej a uvidíš, co který poměr znamená pro sklizeň.' } },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Get magnification', cs: 'Pořiď si zvětšení' },
              md: {
                en: 'A 60× jeweller\'s loupe or a cheap clip-on phone macro/USB microscope. The naked eye isn\'t enough.',
                cs: 'Klenotnická lupa 60× nebo levný makro nástavec na mobil či USB mikroskop. Pouhým okem to nepoznáš.'
              }
            },
            {
              title: { en: 'Look at the bud, not sugar leaves', cs: 'Koukej na palici, ne na cukrové lístky' },
              md: {
                en: 'Sugar-leaf trichomes amber earlier and mislead you. Check the calyxes on several buds — tops ripen before lower ones.',
                cs: 'Trichomy na cukrových lístcích zjantarovatí dřív a zmatou tě. Kontroluj kalichy na víc palicích — vršky dozrávají dřív než spodek.'
              }
            },
            {
              title: { en: 'Check every 2–3 days', cs: 'Kontroluj každé 2–3 dny' },
              md: {
                en: 'Start around week 7 (week 5–6 for autos). Change happens fast at the end.',
                cs: 'Začni kolem 7. týdne (u automatek v 5.–6.). Na konci se to mění rychle.'
              }
            },
            {
              title: { en: 'Harvest in stages if needed', cs: 'Klidně sklízej postupně' },
              md: {
                en: 'Take the ripe tops first and give the lower buds another week of light.',
                cs: 'Nejdřív sklid zralé vršky a spodním palicím dej ještě týden světla.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Move your plant to the flowering stage in BudBuddy on the day of the flip — it uses that date to estimate your harvest window. Add a task to start checking trichomes in week 7.',
            cs: 'V den přepnutí přepni rostlinu v BudBuddy do fáze kvetení — podle toho data odhadne okno sklizně. Přidej si úkol, ať v 7. týdnu začneš koukat na trichomy.'
          }
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'flowering-q1',
              q: { en: 'What light schedule starts flowering in indoor photoperiod plants?', cs: 'Jaký světelný režim spustí kvetení u fotoperiodek uvnitř?' },
              options: [
                { en: '18/6', cs: '18/6' },
                { en: '12/12 with uninterrupted darkness', cs: '12/12 s nepřerušenou tmou' },
                { en: '20/4', cs: '20/4' },
                { en: '24/0', cs: '24/0' }
              ],
              correct: 1,
              explain: {
                en: 'Photoperiods flower when nights are long: 12 hours of light and 12 hours of real darkness. 18/6 and 20/4 keep them in veg.',
                cs: 'Fotoperiodky kvetou, když jsou noci dlouhé: 12 hodin světla a 12 hodin skutečné tmy. 18/6 a 20/4 je drží ve vegetaci.'
              }
            },
            {
              id: 'flowering-q2',
              q: { en: 'Your plant is 60 cm and you have 120 cm of usable height. When should you flip a stretchy strain?', cs: 'Rostlina má 60 cm a ty máš 120 cm využitelné výšky. Kdy přepnout odrůdu, která se hodně natahuje?' },
              options: [
                { en: 'Now or soon — it may double in the stretch', cs: 'Teď nebo brzy — ve stretchi se může zdvojnásobit' },
                { en: 'When it reaches 110 cm', cs: 'Až dosáhne 110 cm' },
                { en: 'Height doesn\'t matter after the flip', cs: 'Po přepnutí na výšce nezáleží' },
                { en: 'Only once it shows amber trichomes', cs: 'Až bude mít jantarové trichomy' }
              ],
              correct: 0,
              explain: {
                en: 'Plants grow 50–200 % in the first 2–3 weeks of flower. Flip at about half the height you can fit.',
                cs: 'V prvních 2–3 týdnech kvetení rostliny přidají 50–200 %. Přepínej zhruba v polovině výšky, kterou máš k dispozici.'
              }
            },
            {
              id: 'flowering-q3',
              q: { en: 'What RH is a good target in late flower?', cs: 'Jaká vlhkost je dobrý cíl na konci kvetení?' },
              options: [
                { en: '65–70 %', cs: '65–70 %' },
                { en: '55–60 %', cs: '55–60 %' },
                { en: '40–45 %', cs: '40–45 %' },
                { en: '20–25 %', cs: '20–25 %' }
              ],
              correct: 2,
              explain: {
                en: 'Around 40–45 % keeps dense buds safe from bud rot. Much drier stresses the plant; above 55 % invites mould.',
                cs: 'Kolem 40–45 % ochrání husté palice před plísní. Mnohem sušší vzduch rostlinu stresuje, nad 55 % si říkáš o plíseň.'
              }
            },
            {
              id: 'flowering-q4',
              q: { en: 'You find a brown, mushy spot inside a big cola in week 7. What do you do?', cs: 'V 7. týdnu najdeš uvnitř velké palice hnědé kašovité místo. Co uděláš?' },
              options: [
                { en: 'Spray it with water and keep going', cs: 'Postříkáš ho vodou a jedeš dál' },
                { en: 'Cut it out with a margin, bag it, clean tools and lower RH', cs: 'Vyřízneš ho i s okrajem, dáš do sáčku, očistíš nářadí a snížíš vlhkost' },
                { en: 'Leave it until harvest and trim it off then', cs: 'Necháš ho do sklizně a pak ho odstřihneš' },
                { en: 'Raise the temperature to 32 °C', cs: 'Zvýšíš teplotu na 32 °C' }
              ],
              correct: 1,
              explain: {
                en: 'Bud rot spreads by spores. Remove it right away with healthy margin, keep it bagged and fix the climate.',
                cs: 'Plíseň v palicích se šíří sporami. Hned ji odstraň i se zdravým okrajem, vynes v sáčku a sraz vlhkost.'
              }
            },
            {
              id: 'flowering-q5',
              q: { en: 'Where should you look when checking trichomes for harvest?', cs: 'Kam se dívat, když kontroluješ trichomy kvůli sklizni?' },
              options: [
                { en: 'The big fan leaves', cs: 'Na velké listy' },
                { en: 'Sugar leaves only', cs: 'Jen na cukrové lístky' },
                { en: 'The calyxes on the buds themselves, on several buds', cs: 'Na kalichy přímo na palicích, a to na víc palicích' },
                { en: 'The colour of the pistils is enough', cs: 'Stačí barva pestíků' }
              ],
              correct: 2,
              explain: {
                en: 'Sugar-leaf trichomes amber early and pistils react to stress. Check bud calyxes at the top and lower down.',
                cs: 'Trichomy na cukrových lístcích zjantarovatí dřív a pestíky reagují na stres. Kontroluj kalichy palic nahoře i níž.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
