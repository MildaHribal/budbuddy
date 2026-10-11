import type { Chapter } from '../types'

export default {
  id: 'environment',
  order: 2,
  title: { en: 'Where to grow', cs: 'Kde pěstovat' },
  summary: {
    en: 'Indoors in a tent, outdoors under the sun, or in a greenhouse: how to set up light, air and climate so plants thrive.',
    cs: 'Uvnitř ve stanu, venku pod sluncem, nebo ve skleníku: jak nastavit světlo, vzduch a klima, aby se rostlinám dařilo.'
  },
  glyph: 'lamp',
  color: '#6fe0c8',
  lessons: [
    {
      id: 'environment-choose',
      title: { en: 'Indoor, outdoor or greenhouse?', cs: 'Uvnitř, venku, nebo ve skleníku?' },
      minutes: 3,
      blocks: [
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Indoor', cs: 'Uvnitř' },
              glyph: 'lamp',
              points: [
                { en: 'Full control, any time of year', cs: 'Plná kontrola, kdykoli během roku' },
                { en: 'Upfront cost + electricity', cs: 'Vstupní investice + elektřina' },
                { en: 'Smell must be filtered', cs: 'Vůni musíš filtrovat' },
                { en: 'Fewest pests and no weather', cs: 'Nejmíň škůdců a žádné počasí' }
              ]
            },
            {
              title: { en: 'Outdoor', cs: 'Venku' },
              glyph: 'seedling',
              points: [
                { en: 'Free sunlight, huge plants possible', cs: 'Slunce zdarma, rostliny můžou být obří' },
                { en: 'One harvest a year (photos)', cs: 'Jedna sklizeň za rok (fotoperiody)' },
                { en: 'Weather, pests and mould are the risk', cs: 'Riziko je počasí, škůdci a plíseň' },
                { en: 'Needs a private, sunny spot', cs: 'Chce soukromé a slunné místo' }
              ]
            },
            {
              title: { en: 'Greenhouse', cs: 'Skleník' },
              glyph: 'vegetative',
              points: [
                { en: 'Sun plus shelter from rain and cold', cs: 'Slunce a k tomu ochrana před deštěm a zimou' },
                { en: 'Longer season than outdoors', cs: 'Delší sezóna než venku' },
                { en: 'Can overheat and get humid fast', cs: 'Rychle se přehřeje a zavlhne' },
                { en: 'Cheap to run', cs: 'Levný provoz' }
              ]
            }
          ]
        },
        {
          type: 'text',
          md: {
            en: 'Not sure? Indoors is the easiest place to **learn**, because you can see cause and effect. Outdoors is the cheapest if you have a garden and a summer long enough for your strain.',
            cs: 'Nevíš? Uvnitř se nejsnáz **učí**, protože hned vidíš příčinu a následek. Venku je to nejlevnější, pokud máš zahradu a léto dost dlouhé pro tvou odrůdu.'
          }
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'The lessons below adapt to the setup you pick in your grow. Indoor lessons cover the tent, light and climate; outdoor and greenhouse lessons cover the season and the weather.',
            cs: 'Lekce níže se přizpůsobí tomu, jaké prostředí si u growu zvolíš. Indoor lekce řeší stan, světlo a klima, venkovní a skleníkové řeší sezónu a počasí.'
          }
        }
      ]
    },
    {
      id: 'environment-tent',
      title: { en: 'Setting up a grow tent', cs: 'Jak postavit pěstební stan' },
      minutes: 5,
      environments: ['indoor'],
      blocks: [
        {
          type: 'figure',
          illustration: 'setup-indoor',
          caption: {
            en: 'A basic tent: LED on top, exhaust fan pulling air through a carbon filter, passive intake at the bottom, clip fan in the canopy.',
            cs: 'Základní stan: nahoře LED, odsávání tahá vzduch přes uhlíkový filtr, dole pasivní nasávání, ve výšce rostlin ventilátor na klip.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Tent', cs: 'Stan' },
            { en: 'Plants', cs: 'Rostlin' },
            { en: 'LED (real draw)', cs: 'LED (skutečný příkon)' },
            { en: 'Exhaust fan', cs: 'Odsávání' }
          ],
          rows: [
            [{ en: '60×60 cm', cs: '60×60 cm' }, { en: '1–2', cs: '1–2' }, { en: '100–150 W', cs: '100–150 W' }, { en: '100 mm, ~150 m³/h', cs: '100 mm, ~150 m³/h' }],
            [{ en: '80×80 cm', cs: '80×80 cm' }, { en: '2–4', cs: '2–4' }, { en: '180–250 W', cs: '180–250 W' }, { en: '100–125 mm, ~200 m³/h', cs: '100–125 mm, ~200 m³/h' }],
            [{ en: '100×100 cm', cs: '100×100 cm' }, { en: '3–6', cs: '3–6' }, { en: '300–400 W', cs: '300–400 W' }, { en: '125 mm, ~300 m³/h', cs: '125 mm, ~300 m³/h' }],
            [{ en: '120×120 cm', cs: '120×120 cm' }, { en: '4–9', cs: '4–9' }, { en: '450–600 W', cs: '450–600 W' }, { en: '150 mm, ~400 m³/h', cs: '150 mm, ~400 m³/h' }]
          ]
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Pick the spot', cs: 'Vyber místo' },
              md: {
                en: 'A room that stays between 18 and 26 °C, with a socket nearby and somewhere to vent warm air. Cellars are cool but often damp; attics overheat in summer.',
                cs: 'Místnost, kde se drží 18–26 °C, poblíž zásuvka a kam odvádět teplý vzduch. Sklep je chladný, ale často vlhký, půda se v létě přehřívá.'
              }
            },
            {
              title: { en: 'Build the tent and hang the light', cs: 'Postav stan a pověs světlo' },
              md: {
                en: 'Hang the LED on adjustable ratchet hangers so you can raise it as the plants grow. Check the tent for light leaks with the lamp on in a dark room.',
                cs: 'LED zavěs na stavitelné kladky (ratchety), ať ji můžeš zvedat, jak rostliny rostou. Se zapnutou lampou v tmavé místnosti zkontroluj, jestli stan nikde nepropouští světlo.'
              }
            },
            {
              title: { en: 'Fit the exhaust at the top', cs: 'Odsávání dej nahoru' },
              md: {
                en: 'Warm air rises, so the carbon filter and fan go at the top and pull air out. Open a low vent (or use a small intake fan) so fresh air comes in from below. The tent walls should be slightly sucked in.',
                cs: 'Teplý vzduch stoupá, takže uhlíkový filtr s ventilátorem patří nahoru a vzduch odsávají. Dole otevři větrací otvor (nebo dej malé nasávání), ať čerstvý vzduch jde zespodu. Stěny stanu by měly být lehce vtažené dovnitř.'
              }
            },
            {
              title: { en: 'Move the air inside', cs: 'Rozhýbej vzduch uvnitř' },
              md: {
                en: 'A clip fan aimed across, not straight at, the plants. Leaves should gently flutter. This strengthens stems and prevents mould pockets.',
                cs: 'Ventilátor na klip namiř přes rostliny, ne přímo na ně. Listy se mají jemně chvět. Zpevní to stonky a zabrání vlhkým kapsám, kde se daří plísni.'
              }
            },
            {
              title: { en: 'Test run for 2 days', cs: 'Dva dny zkušební provoz' },
              md: {
                en: 'Run light and fan on the timer with no plants and watch the hygrometer. Fix temperature and humidity now, it is much harder with plants inside.',
                cs: 'Pusť světlo a ventilátor na spínačkách bez rostlin a sleduj vlhkoměr. Teplotu a vlhkost vylaď teď, s rostlinami uvnitř je to mnohem těžší.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'Fan sizing rule of thumb', cs: 'Jak dimenzovat ventilátor' },
          md: {
            en: 'Tent volume (W × D × H in m) × 60 = the air the fan must move per hour to swap the air once a minute. Add 25–50 % for the carbon filter and ducting. A 1 × 1 × 2 m tent: 2 × 60 = 120, so aim for 150–200 m³/h. Use a speed controller so it is quiet when it does not need full power.',
            cs: 'Objem stanu (š × h × v v metrech) × 60 = kolik m³/h musí ventilátor zvládnout, aby vyměnil vzduch jednou za minutu. Připočti 25–50 % na uhlíkový filtr a potrubí. Stan 1 × 1 × 2 m: 2 × 60 = 120, takže míř na 150–200 m³/h. Pořiď regulátor otáček, ať ventilátor zbytečně neřve.'
          }
        }
      ]
    },
    {
      id: 'environment-light',
      title: { en: 'Light: how much and how long', cs: 'Světlo: kolik a jak dlouho' },
      minutes: 5,
      environments: ['indoor'],
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Light is the engine of your grow. What matters is how much usable light reaches the leaves, measured as **PPFD** (µmol/m²/s). Watts on the box only tell you the power draw. A good modern LED makes 2.5–3 µmol per watt, so its real wattage is a decent guide.',
            cs: 'Světlo je motor celého growu. Rozhoduje, kolik užitečného světla dopadne na listy, měří se jako **PPFD** (µmol/m²/s). Watty na krabici říkají jen spotřebu. Dobrá moderní LED dává 2,5–3 µmol na watt, takže její skutečný příkon je slušné vodítko.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Stage', cs: 'Fáze' },
            { en: 'PPFD at the canopy', cs: 'PPFD u vršků' },
            { en: 'Typical LED distance', cs: 'Obvyklá vzdálenost LED' }
          ],
          rows: [
            [{ en: 'Seedling', cs: 'Sazenice' }, { en: '200–400', cs: '200–400' }, { en: '60–80 cm or dimmed to 25–40 %', cs: '60–80 cm nebo stmívat na 25–40 %' }],
            [{ en: 'Vegetative', cs: 'Vegetace' }, { en: '400–600', cs: '400–600' }, { en: '40–60 cm', cs: '40–60 cm' }],
            [{ en: 'Flowering', cs: 'Kvetení' }, { en: '600–900', cs: '600–900' }, { en: '30–45 cm', cs: '30–45 cm' }]
          ]
        },
        {
          type: 'interactive',
          widget: 'light-calc',
          caption: { en: 'Enter your lamp and tent size to see if the light fits.', cs: 'Zadej svou lampu a rozměr stanu a uvidíš, jestli světlo stačí.' }
        },
        {
          type: 'text',
          md: {
            en: 'The second half of the story is the **schedule**. Photoperiod plants grow leaves under long days (18 hours on, 6 off) and flower once nights are 12 hours long. Autoflowers ignore this and are usually run at 18/6 or 20/4 from seed to harvest.',
            cs: 'Druhá půlka příběhu je **režim světla**. Fotoperiody rostou pod dlouhým dnem (18 hodin svítí, 6 tma) a kvést začnou, když má noc 12 hodin. Automaty to ignorují a obvykle jedou na 18/6 nebo 20/4 od semínka až po sklizeň.'
          }
        },
        {
          type: 'interactive',
          widget: 'photoperiod',
          caption: { en: 'Compare 18/6, 20/4 and 12/12.', cs: 'Porovnej 18/6, 20/4 a 12/12.' }
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Darkness must be dark', cs: 'Tma musí být tma' },
          md: {
            en: 'In flower, light leaks during the 12-hour night (a gap in the tent, a status LED, opening the tent "just quickly") can stress photoperiods and cause seeds or hermaphrodites. Always use a timer; never switch the lamp by hand.',
            cs: 'Když v květu během 12hodinové noci prosakuje světlo (škvíra ve stanu, kontrolka, otevření stanu „jen na chvilku"), může to fotoperiody stresovat a vyvolat hermafrodity a semínka. Vždycky používej spínací hodiny, nikdy nevypínej lampu ručně.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Signs of too much light: top leaves turn pale or yellow while lower ones stay green, leaf edges curl up like a taco. Raise or dim the lamp. See [light burn](/guide/problems).',
            cs: 'Příznaky přesvícení: vrchní listy blednou nebo žloutnou, zatímco spodní jsou zelené, okraje listů se kroutí nahoru jako taco. Zvedni lampu nebo ji ztlum. Viz [spálení světlem](/guide/problems).'
          }
        }
      ]
    },
    {
      id: 'environment-climate',
      title: { en: 'Temperature, humidity and VPD', cs: 'Teplota, vlhkost a VPD' },
      minutes: 5,
      environments: ['indoor', 'greenhouse'],
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Plants "breathe" through their leaves. How fast they drink and transpire depends on temperature and humidity together. Growers combine the two into one number: **VPD** (vapour pressure deficit), in kPa. Too low and plants are sluggish and mould loves it; too high and they close up and stress.',
            cs: 'Rostliny „dýchají" listy. Jak rychle pijí a odpařují vodu, záleží na teplotě a vlhkosti dohromady. Pěstitelé to spojují do jednoho čísla: **VPD** (deficit tlaku páry) v kPa. Moc nízké a rostliny jsou líné a plíseň má hody, moc vysoké a rostliny se zavřou a stresují.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Stage', cs: 'Fáze' },
            { en: 'Day temp', cs: 'Teplota přes den' },
            { en: 'Humidity', cs: 'Vlhkost' },
            { en: 'VPD', cs: 'VPD' }
          ],
          rows: [
            [{ en: 'Seedling', cs: 'Sazenice' }, { en: '22–26 °C', cs: '22–26 °C' }, { en: '65–75 %', cs: '65–75 %' }, { en: '0.4–0.8 kPa', cs: '0,4–0,8 kPa' }],
            [{ en: 'Vegetative', cs: 'Vegetace' }, { en: '22–28 °C', cs: '22–28 °C' }, { en: '55–70 %', cs: '55–70 %' }, { en: '0.8–1.2 kPa', cs: '0,8–1,2 kPa' }],
            [{ en: 'Early/mid flower', cs: 'Začátek a střed květu' }, { en: '20–26 °C', cs: '20–26 °C' }, { en: '45–55 %', cs: '45–55 %' }, { en: '1.2–1.5 kPa', cs: '1,2–1,5 kPa' }],
            [{ en: 'Late flower', cs: 'Konec květu' }, { en: '18–24 °C', cs: '18–24 °C' }, { en: '35–45 %', cs: '35–45 %' }, { en: '1.3–1.6 kPa', cs: '1,3–1,6 kPa' }]
          ]
        },
        {
          type: 'interactive',
          widget: 'vpd',
          caption: { en: 'Move the sliders to your tent readings.', cs: 'Nastav posuvníky podle hodnot ze svého stanu.' }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Too hot', cs: 'Moc teplo' },
              md: {
                en: 'Turn up the exhaust, raise or dim the light, run the light at night when the room is cooler. Above 30 °C growth slows and buds get airy.',
                cs: 'Přidej odsávání, zvedni nebo ztlum světlo, posuň svícení na noc, kdy je v místnosti chladněji. Nad 30 °C se růst brzdí a palice řídnou.'
              }
            },
            {
              title: { en: 'Too cold', cs: 'Moc zima' },
              md: {
                en: 'Lower the fan speed, insulate the floor (polystyrene board under the pots), add a small heater with a thermostat. Keep the night drop within about 5 °C.',
                cs: 'Ubrat otáčky ventilátoru, zaizolovat podlahu (polystyren pod květináče), přidat malé topení s termostatem. V noci by teplota neměla spadnout o víc než asi 5 °C.'
              }
            },
            {
              title: { en: 'Too humid', cs: 'Moc vlhko' },
              md: {
                en: 'More exhaust, fewer open water surfaces, a dehumidifier in the room (not in a small tent). Defoliate dense plants. Critical in late flower: high humidity means [bud rot](/guide/problems).',
                cs: 'Silnější odsávání, žádné otevřené nádoby s vodou, odvlhčovač do místnosti (ne do malého stanu). Hustým rostlinám prosvětli listy. Na konci květu je to kritické: vysoká vlhkost znamená [hnilobu palic](/guide/problems).'
              }
            },
            {
              title: { en: 'Too dry', cs: 'Moc sucho' },
              md: {
                en: 'Common in winter flats. Slow the exhaust a bit, add a humidifier for seedlings and veg, or hang a wet towel. Dry air is less dangerous than wet air in flower.',
                cs: 'Typické v zimě v bytě. Trochu ubrat odsávání, k sazenicím a do vegetace dát zvlhčovač, nebo pověsit mokrý ručník. V květu je suchý vzduch menší zlo než vlhký.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Measure at plant height, not at the floor or right under the lamp. A hygrometer with min/max memory shows what happens while you sleep.',
            cs: 'Měř ve výšce rostlin, ne u podlahy ani těsně pod lampou. Vlhkoměr s pamětí min/max ti ukáže, co se děje, když spíš.'
          }
        }
      ]
    },
    {
      id: 'environment-outdoor',
      title: { en: 'Growing outdoors', cs: 'Pěstování venku' },
      minutes: 5,
      environments: ['outdoor'],
      blocks: [
        {
          type: 'figure',
          illustration: 'setup-outdoor',
          caption: {
            en: 'A good outdoor spot: full sun from the south, shelter from wind, water within reach and out of sight.',
            cs: 'Dobré místo venku: plné slunce z jihu, závětří, voda po ruce a mimo zraky.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Sun, at least 6 hours', cs: 'Slunce, aspoň 6 hodin' },
              md: {
                en: 'Direct sun for 6 hours is the minimum, 8+ is where big harvests happen. South-facing is best. Morning sun dries dew fast, which helps against mould.',
                cs: 'Šest hodin přímého slunce je minimum, velké sklizně začínají od 8 hodin. Nejlepší je jižní strana. Ranní slunce rychle osuší rosu, což pomáhá proti plísni.'
              }
            },
            {
              title: { en: 'Shelter and privacy', cs: 'Závětří a soukromí' },
              md: {
                en: 'A hedge or fence breaks the wind and keeps the plants out of view. Strong wind snaps branches in flower, so tie them to stakes.',
                cs: 'Živý plot nebo plot zastaví vítr a schová rostliny před zvědavci. Silný vítr v květu láme větve, takže je přivaž ke kůlům.'
              }
            },
            {
              title: { en: 'Big pots or prepared ground', cs: 'Velké květináče, nebo připravená zem' },
              md: {
                en: 'In the ground, dig a hole about 60 × 60 × 60 cm and fill it with good soil, compost and perlite. In pots, use 40 litres or more; small pots dry out in hours on a hot day.',
                cs: 'Do země vykopej jámu zhruba 60 × 60 × 60 cm a naplň ji kvalitní hlínou s kompostem a perlitem. V květináčích ber 40 litrů a víc, malý květináč v horku vyschne za pár hodin.'
              }
            },
            {
              title: { en: 'Water within reach', cs: 'Voda na dosah' },
              md: {
                en: 'A big plant in July can drink 10 litres or more a day. If you cannot water daily, plant in the ground and mulch the surface.',
                cs: 'Velká rostlina v červenci vypije i 10 litrů denně a víc. Pokud nemůžeš zalévat každý den, sázej do země a povrch namulčuj.'
              }
            }
          ]
        },
        {
          type: 'table',
          head: [
            { en: 'When (central Europe)', cs: 'Kdy (střední Evropa)' },
            { en: 'Photoperiod', cs: 'Fotoperioda' },
            { en: 'Autoflower', cs: 'Automat' }
          ],
          rows: [
            [{ en: 'April', cs: 'Duben' }, { en: 'Germinate indoors on a windowsill or under a small light', cs: 'Naklíčit uvnitř na okně nebo pod malým světlem' }, { en: '—', cs: '—' }],
            [{ en: 'Mid May (after the last frost)', cs: 'Polovina května (po zmrzlých)' }, { en: 'Harden off for a week, then plant out', cs: 'Týden otužovat, pak vysadit ven' }, { en: 'Sow the 1st run straight outside', cs: '1. běh vysít rovnou ven' }],
            [{ en: 'June–July', cs: 'Červen–červenec' }, { en: 'Vegetative growth, training, lots of water', cs: 'Vegetace, trénink, hodně vody' }, { en: 'Harvest the 1st run late July, sow a 2nd by early June at the latest', cs: '1. běh sklidit koncem července, 2. vysít nejpozději začátkem června' }],
            [{ en: 'August', cs: 'Srpen' }, { en: 'Days shorten, flowering starts', cs: 'Dny se krátí, začíná kvetení' }, { en: '2nd run flowering', cs: '2. běh kvete' }],
            [{ en: 'Late Sep – Oct', cs: 'Konec září – říjen' }, { en: 'Harvest (before cold, wet weather)', cs: 'Sklizeň (před chladem a deštivým počasím)' }, { en: 'Harvest the 2nd run in September', cs: '2. běh sklidit v září' }]
          ]
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Autumn rain is the main enemy', cs: 'Hlavní nepřítel je podzimní déšť' },
          md: {
            en: 'Cold nights and rain in late September are when buds rot. Pick early-finishing, mould-resistant strains, shake water off buds after rain, and check the inside of the biggest buds every few days.',
            cs: 'Studené noci a déšť na konci září jsou chvíle, kdy palice hnijí. Vybírej rané odrůdy odolné vůči plísni, po dešti z palic vodu vytřes a každých pár dní kontroluj vnitřek největších palic.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'Never move a photoperiod plant from a long indoor day straight outside in April: the short spring days can trigger early flowering. Plant out once days are 14+ hours long (from mid May).',
            cs: 'Fotoperiodu z dlouhého dne pod lampou nikdy nedávej ven už v dubnu: krátké jarní dny můžou spustit předčasné kvetení. Vysazuj, až má den 14 a víc hodin (od poloviny května).'
          }
        }
      ]
    },
    {
      id: 'environment-greenhouse',
      title: { en: 'Growing in a greenhouse', cs: 'Pěstování ve skleníku' },
      minutes: 4,
      environments: ['greenhouse'],
      blocks: [
        {
          type: 'figure',
          illustration: 'setup-greenhouse',
          caption: {
            en: 'Roof vents and an open door let hot, humid air escape; a fan keeps it moving between plants.',
            cs: 'Střešní větrání a otevřené dveře pustí ven horký vlhký vzduch, ventilátor ho rozhýbe mezi rostlinami.'
          }
        },
        {
          type: 'text',
          md: {
            en: 'A greenhouse gives you outdoor sunlight with a roof over the buds. You can plant out 2–4 weeks earlier, harvest later, and autumn rain cannot reach the flowers. The price is heat and humidity: on a sunny day a closed greenhouse passes 40 °C within an hour.',
            cs: 'Skleník ti dá venkovní slunce se střechou nad palicemi. Vysadit můžeš o 2–4 týdny dřív, sklízet později a podzimní déšť na květy nedosáhne. Daní je teplo a vlhkost: zavřený skleník se za slunečného dne do hodiny rozpálí přes 40 °C.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Ventilate a lot', cs: 'Hodně větrej' },
              md: {
                en: 'Open roof vents and the door every morning. An automatic vent opener (wax cylinder, no electricity) is cheap and worth it. Add a fan inside if you have power.',
                cs: 'Každé ráno otevři střešní okna a dveře. Automatický otvírač oken (voskový válec, bez elektřiny) je levný a vyplatí se. Máš-li elektřinu, přidej dovnitř ventilátor.'
              }
            },
            {
              title: { en: 'Shade in high summer', cs: 'V létě stínuj' },
              md: {
                en: 'A 30–50 % shade cloth or whitewash on the glass in July and August keeps temperatures under 30 °C.',
                cs: 'Stínící tkanina 30–50 % nebo nátěr na skle v červenci a srpnu udrží teplotu pod 30 °C.'
              }
            },
            {
              title: { en: 'Watch the night humidity', cs: 'Hlídej noční vlhkost' },
              md: {
                en: 'When it cools at night, humidity rises and dew forms on the glass. In flower, leave vents slightly open overnight and water in the morning, not in the evening.',
                cs: 'Když se v noci ochladí, vlhkost stoupá a na skle se sráží rosa. V květu nech větrání přes noc pootevřené a zalévej ráno, ne večer.'
              }
            },
            {
              title: { en: 'Mind the street lights', cs: 'Pozor na pouliční osvětlení' },
              md: {
                en: 'A lamp shining into the greenhouse at night can delay flowering of photoperiods. Cover that side with a dark sheet in flower.',
                cs: 'Lampa, která v noci svítí do skleníku, může fotoperiodám oddálit kvetení. V květu tu stranu zakryj tmavou fólií.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          md: {
            en: 'Use the [VPD lesson](/guide/environment#environment-climate) with a cheap hygrometer hung at plant height. The numbers are the same as indoors.',
            cs: 'Pověs levný vlhkoměr do výšky rostlin a řiď se [lekcí o VPD](/guide/environment#environment-climate). Čísla platí stejná jako uvnitř.'
          }
        }
      ]
    },
    {
      id: 'environment-ready',
      title: { en: 'Final check before you plant', cs: 'Poslední kontrola před sázením' },
      minutes: 3,
      blocks: [
        {
          type: 'checklist',
          id: 'environment-ready-check',
          items: [
            { en: 'I know the legal limits where I live', cs: 'Znám zákonné limity tam, kde bydlím' },
            { en: 'The spot gets enough light (lamp sized for the tent, or 6+ h of sun)', cs: 'Místo má dost světla (lampa odpovídá stanu, nebo 6+ h slunce)' },
            { en: 'Fresh air comes in and stale air goes out', cs: 'Čerstvý vzduch jde dovnitř a vydýchaný ven' },
            { en: 'Temperature and humidity were stable during a test run', cs: 'Teplota a vlhkost byly během zkušebního provozu stabilní' },
            { en: 'The timer is set and the tent has no light leaks', cs: 'Spínačky jsou nastavené a stan nikde nepropouští světlo' },
            { en: 'Smell is handled (carbon filter or a discreet spot)', cs: 'Vůně je vyřešená (uhlíkový filtr nebo nenápadné místo)' },
            { en: 'Water is within easy reach', cs: 'Voda je snadno po ruce' }
          ]
        },
        {
          type: 'text',
          md: {
            en: 'All ticked? Pick your [growing medium](/guide/media) next.',
            cs: 'Všechno odškrtnuté? Teď si vyber [substrát](/guide/media).'
          }
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'environment-q1',
              q: { en: 'Where does the exhaust fan with the carbon filter go in a tent?', cs: 'Kam patří ve stanu odsávání s uhlíkovým filtrem?' },
              options: [
                { en: 'On the floor', cs: 'Na podlahu' },
                { en: 'At the top, pulling air out', cs: 'Nahoru, odsává vzduch ven' },
                { en: 'In the middle, blowing at the plants', cs: 'Doprostřed, fouká na rostliny' },
                { en: 'Outside the room', cs: 'Mimo místnost' }
              ],
              correct: 1,
              explain: {
                en: 'Hot air rises. Pulling it out at the top keeps the tent cool, and the slight negative pressure stops smell leaking through gaps.',
                cs: 'Teplý vzduch stoupá. Když ho odsáváš nahoře, stan se nepřehřívá a mírný podtlak nepustí vůni ven škvírami.'
              }
            },
            {
              id: 'environment-q2',
              q: { en: 'What light schedule makes photoperiod plants flower indoors?', cs: 'Jaký světelný režim donutí fotoperiody uvnitř kvést?' },
              options: [
                { en: '18/6', cs: '18/6' },
                { en: '20/4', cs: '20/4' },
                { en: '12/12', cs: '12/12' },
                { en: '24/0', cs: '24/0' }
              ],
              correct: 2,
              explain: {
                en: 'A 12-hour uninterrupted night signals autumn. 18/6 and 20/4 keep them in vegetative growth.',
                cs: 'Nepřerušená 12hodinová noc rostlině říká, že přichází podzim. 18/6 a 20/4 ji drží ve vegetaci.'
              }
            },
            {
              id: 'environment-q3',
              q: { en: 'Late flower, 24 °C and 70 % humidity. What is the main risk?', cs: 'Konec květu, 24 °C a 70 % vlhkost. Jaké je hlavní riziko?' },
              options: [
                { en: 'Bud rot and mould', cs: 'Hniloba palic a plíseň' },
                { en: 'Nutrient deficiency', cs: 'Nedostatek živin' },
                { en: 'Light burn', cs: 'Spálení světlem' },
                { en: 'None, that is ideal', cs: 'Žádné, to je ideál' }
              ],
              correct: 0,
              explain: {
                en: 'Late flower wants 35–45 % humidity. At 70 % the VPD is low and dense buds stay damp inside, perfect for botrytis.',
                cs: 'Konec květu chce 35–45 % vlhkosti. Při 70 % je VPD nízké a husté palice zůstávají uvnitř vlhké, ideální pro plíseň šedou.'
              }
            },
            {
              id: 'environment-q4',
              q: { en: 'In central Europe, when is it safe to plant photoperiods outdoors?', cs: 'Kdy je ve střední Evropě bezpečné vysadit fotoperiody ven?' },
              options: [
                { en: 'Early March', cs: 'Začátkem března' },
                { en: 'Mid April', cs: 'V polovině dubna' },
                { en: 'Mid May, after the last frost', cs: 'V polovině května, po zmrzlých' },
                { en: 'August', cs: 'V srpnu' }
              ],
              correct: 2,
              explain: {
                en: 'By mid May the frost is over and days are long enough (14+ h) that the plant will not start flowering early.',
                cs: 'V polovině května už nemrzne a dny jsou dost dlouhé (14+ h), takže rostlina nezačne předčasně kvést.'
              }
            },
            {
              id: 'environment-q5',
              q: { en: 'Top leaves bleach and curl up, lower leaves look fine. What do you do?', cs: 'Vrchní listy blednou a kroutí se nahoru, spodní jsou v pořádku. Co uděláš?' },
              options: [
                { en: 'Feed more nitrogen', cs: 'Přidám dusík' },
                { en: 'Raise or dim the light', cs: 'Zvednu nebo ztlumím světlo' },
                { en: 'Water more often', cs: 'Budu víc zalévat' },
                { en: 'Switch to 12/12', cs: 'Přepnu na 12/12' }
              ],
              correct: 1,
              explain: {
                en: 'Symptoms only at the top, closest to the lamp, point to too much light rather than a nutrient problem.',
                cs: 'Příznaky jen nahoře, nejblíž lampě, ukazují spíš na přesvícení než na problém s živinami.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
