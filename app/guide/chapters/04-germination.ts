import type { Chapter } from '../types'

export default {
  id: 'germination',
  order: 4,
  title: { en: 'Germination & seedlings', cs: 'Klíčení a sazenice' },
  summary: {
    en: 'Wake the seed up, plant it at the right depth and get the fragile seedling through its first weeks.',
    cs: 'Probuď semínko, zasaď ho do správné hloubky a proveď křehkou sazenici prvními týdny.'
  },
  glyph: 'germination',
  color: '#e9d68f',
  lessons: [
    {
      id: 'germination-methods',
      title: { en: 'Three ways to germinate', cs: 'Tři způsoby klíčení' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'A seed needs three things to wake up: **moisture, warmth and darkness**. Light is not needed until the sprout breaks the surface. Healthy, fresh seeds usually crack within 1–5 days; older ones can take up to 10.',
            cs: 'Semínko potřebuje ke klíčení tři věci: **vlhko, teplo a tmu**. Světlo nepotřebuje, dokud klíček nevyleze nad povrch. Zdravá čerstvá semínka obvykle prasknou do 1–5 dnů, starší můžou trvat až 10.'
          }
        },
        {
          type: 'compare',
          columns: [
            {
              title: { en: 'Paper towel', cs: 'Papírový ubrousek' },
              glyph: 'germination',
              points: [
                { en: 'You see exactly when the taproot appears', cs: 'Přesně vidíš, kdy vyleze kořínek' },
                { en: 'Easy to check old or expensive seeds', cs: 'Hodí se na otestování starých nebo drahých semínek' },
                { en: 'Extra handling – the root is fragile', cs: 'Navíc manipulace – kořínek je křehký' }
              ]
            },
            {
              title: { en: 'Straight into the medium', cs: 'Rovnou do substrátu' },
              glyph: 'seedling',
              points: [
                { en: 'No transfer, no shock – the most natural way', cs: 'Žádné přesazování, žádný šok – nejpřirozenější cesta' },
                { en: 'Best for autos, which hate disturbance', cs: 'Nejlepší pro automatky, které nesnáší rušení' },
                { en: 'You cannot see what happens below', cs: 'Nevidíš, co se děje pod povrchem' }
              ]
            },
            {
              title: { en: 'Glass of water', cs: 'Sklenice s vodou' },
              glyph: 'water',
              points: [
                { en: 'Soak 12–24 h, seeds sink when ready', cs: 'Namáčej 12–24 h, nasáklá semínka klesnou ke dnu' },
                { en: 'Great kick-start for hard, old shells', cs: 'Skvělý start pro tvrdé a starší slupky' },
                { en: 'Never longer than ~32 h – seeds can drown', cs: 'Nikdy déle než ~32 h – semínko se může udusit' }
              ]
            }
          ]
        },
        {
          type: 'figure',
          illustration: 'germination-paper-towel',
          caption: {
            en: 'Paper towel method: damp (not dripping) towel between two plates, kept warm and dark.',
            cs: 'Metoda s ubrouskem: vlhký (ne mokrý) ubrousek mezi dvěma talíři, v teple a ve tmě.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Moisten the towel', cs: 'Navlhči ubrousek' },
              md: {
                en: 'Use plain, room-temperature water. The towel should be damp, with no puddles.',
                cs: 'Použij obyčejnou vodu o pokojové teplotě. Ubrousek má být vlhký, bez louží.'
              }
            },
            {
              title: { en: 'Lay the seeds and cover', cs: 'Rozlož semínka a zakryj' },
              md: {
                en: 'Space them a few centimetres apart, fold the towel over and put it between two plates or in a zip bag.',
                cs: 'Rozlož je pár centimetrů od sebe, přelož ubrousek a dej ho mezi dva talíře nebo do sáčku se zipem.'
              }
            },
            {
              title: { en: 'Keep it warm and check daily', cs: 'Drž v teple a kontroluj denně' },
              md: {
                en: 'Aim for 22–26 °C. Re-wet the towel if it starts drying out.',
                cs: 'Ideál je 22–26 °C. Když ubrousek začne vysychat, znovu ho navlhči.'
              }
            },
            {
              title: { en: 'Plant at 0.5–2 cm root', cs: 'Zasaď, když má kořínek 0,5–2 cm' },
              md: {
                en: 'Don\'t wait for a long root – it gets tangled in the towel and breaks. Move it with clean fingers or tweezers, touching only the shell.',
                cs: 'Nečekej na dlouhý kořen – zaplete se do ubrousku a ulomí se. Přenášej čistými prsty nebo pinzetou a chytej jen slupku.'
              }
            }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          title: { en: 'Legal note', cs: 'Právní poznámka' },
          md: {
            en: 'Germinate cannabis seeds only where growing it is legal for you.',
            cs: 'Semínka konopí naklíčuj jen tam, kde je pro tebe pěstování legální.'
          }
        }
      ]
    },
    {
      id: 'germination-planting',
      title: { en: 'Planting depth & climate', cs: 'Hloubka výsadby a klima' },
      minutes: 3,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'Plant the seed **0.5–1.5 cm deep** – roughly the length of your fingertip to the first joint, minus a bit. A germinated seed goes in **root down**. Too deep and the sprout wastes its energy reaching the light; too shallow and the root can push the seed out.',
            cs: 'Semínko zasaď **0,5–1,5 cm hluboko** – zhruba do poloviny prvního článku prstu. Naklíčené semínko dej **kořínkem dolů**. Moc hluboko a klíček vyplýtvá energii, než se dostane ke světlu; moc mělko a kořínek může semínko vytlačit ven.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Factor', cs: 'Faktor' },
            { en: 'Target', cs: 'Cíl' },
            { en: 'Why', cs: 'Proč' }
          ],
          rows: [
            [
              { en: 'Temperature', cs: 'Teplota' },
              { en: '22–26 °C', cs: '22–26 °C' },
              { en: 'Below 20 °C germination slows down a lot', cs: 'Pod 20 °C se klíčení výrazně zpomalí' }
            ],
            [
              { en: 'Humidity (RH)', cs: 'Vlhkost (RH)' },
              { en: '70–80 %', cs: '70–80 %' },
              { en: 'Seedlings drink through their leaves, roots are tiny', cs: 'Sazenice pijí listy, kořeny jsou zatím malé' }
            ],
            [
              { en: 'Medium moisture', cs: 'Vlhkost substrátu' },
              { en: 'Moist, never soggy', cs: 'Vlhký, nikdy rozbahněný' },
              { en: 'Roots need oxygen as much as water', cs: 'Kořeny potřebují kyslík stejně jako vodu' }
            ],
            [
              { en: 'Light', cs: 'Světlo' },
              { en: '18/6, gentle (LED at 30–50 % or higher up)', cs: '18/6, jemné (LED na 30–50 % nebo výš)' },
              { en: 'Strong light burns and stresses seedlings', cs: 'Silné světlo sazenice pálí a stresuje' }
            ]
          ]
        },
        {
          type: 'callout',
          tone: 'tip',
          title: { en: 'Small pot or final pot?', cs: 'Malý kelímek, nebo rovnou finální květináč?' },
          md: {
            en: 'Photoperiods do fine starting in a small cup or seedling plug and moving up later. **Autos** are best sown straight into their final pot – they have no time to recover from transplant shock.',
            cs: 'Fotoperiodické rostliny klidně začni v malém kelímku nebo sadbovači a přesaď je později. **Automatky** zasaď rovnou do finálního květináče – nemají čas se z přesazení vzpamatovat.'
          }
        },
        {
          type: 'callout',
          tone: 'warning',
          md: {
            en: 'Use a light, low-nutrient seedling mix or plain coco. Hot, heavily amended soil can burn a young seedling within days.',
            cs: 'Použij lehký, málo hnojený substrát pro výsev nebo čistý kokos. Silně předhnojená hlína dokáže mladou sazenici spálit během pár dnů.'
          }
        }
      ]
    },
    {
      id: 'germination-seedling-care',
      title: { en: 'Seedling care', cs: 'Péče o sazenice' },
      minutes: 4,
      blocks: [
        {
          type: 'text',
          md: {
            en: 'The sprout first opens two round **cotyledons** (seed leaves), then the first serrated **true leaves**. The seedling stage lasts about 2–3 weeks, until the plant has 3–5 sets of true leaves. Your job now is mostly to *not overdo it*.',
            cs: 'Klíček nejdřív rozevře dva kulaté **děložní lístky**, pak přijdou první zubaté **pravé listy**. Fáze sazenice trvá zhruba 2–3 týdny, dokud rostlina nemá 3–5 pater pravých listů. Tvým úkolem je teď hlavně *to nepřehnat*.'
          }
        },
        {
          type: 'steps',
          items: [
            {
              title: { en: 'Water little and around the stem', cs: 'Zalévej málo a kolem stonku' },
              md: {
                en: 'A few spoonfuls or a small spray ring around the stem is plenty in a big pot. Let the top centimetre dry before the next watering.',
                cs: 'Ve velkém květináči stačí pár lžic nebo malý kruh kolem stonku. Před další zálivkou nech vrchní centimetr proschnout.'
              }
            },
            {
              title: { en: 'Hold off on feeding', cs: 'S hnojením počkej' },
              md: {
                en: 'Soil and the cotyledons feed the seedling for the first 2–3 weeks. In coco or hydro start with a very weak solution (EC around 0.4–0.8).',
                cs: 'Hlína a děložní lístky živí sazenici první 2–3 týdny. V kokosu nebo hydru začni s hodně slabým roztokem (EC zhruba 0,4–0,8).'
              }
            },
            {
              title: { en: 'Keep it humid', cs: 'Drž vysokou vlhkost' },
              md: {
                en: 'Aim for 65–75 % RH. A humidity dome or a cut plastic bottle works – just air it out daily.',
                cs: 'Cíl je 65–75 % RH. Pomůže skleníček nebo uříznutá PET láhev – jen ji denně vyvětrej.'
              }
            },
            {
              title: { en: 'Light close enough, not too close', cs: 'Světlo blízko, ale ne moc' },
              md: {
                en: 'Around 200–400 PPFD is enough. Follow the lamp maker\'s seedling distance and watch the leaves – bleaching or curling up means too much.',
                cs: 'Stačí zhruba 200–400 PPFD. Řiď se doporučenou vzdáleností výrobce lampy pro sazenice a sleduj listy – blednutí nebo kroucení nahoru znamená moc světla.'
              }
            }
          ]
        },
        {
          type: 'interactive',
          widget: 'watering',
          caption: {
            en: 'Check how much water your pot really needs – seedlings need far less.',
            cs: 'Zjisti, kolik vody tvůj květináč opravdu potřebuje – sazenice ale mnohem méně.'
          }
        },
        {
          type: 'callout',
          tone: 'tip',
          md: {
            en: 'A gentle breeze from a fan (not blowing straight on the plant) makes the stem thicker and stronger.',
            cs: 'Jemný vánek z ventilátoru (ne přímo na rostlinu) udělá stonek silnější a pevnější.'
          }
        }
      ]
    },
    {
      id: 'germination-seedling-problems',
      title: { en: 'Stretch, damping off & other seedling problems', cs: 'Vytáhlé sazenice, padání klíčních rostlin a další potíže' },
      minutes: 5,
      blocks: [
        {
          type: 'figure',
          illustration: 'seedling-stretch',
          caption: {
            en: 'Left: a stretched seedling reaching for light. Right: a compact, healthy one.',
            cs: 'Vlevo vytáhlá sazenice, která se natahuje za světlem. Vpravo kompaktní a zdravá.'
          }
        },
        {
          type: 'text',
          md: {
            en: '**Stretch** is a long, thin, wobbly stem with few leaves. The cause is almost always **too little light** (lamp too far or too weak), sometimes too much heat. Fix it by lowering the light or raising its power, then bury the stretched stem deeper when you transplant – cannabis grows roots along a buried stem.',
            cs: '**Vytáhlá sazenice** má dlouhý, tenký, vratký stonek a málo listů. Příčinou je skoro vždycky **málo světla** (lampa moc daleko nebo moc slabá), občas i horko. Spusť lampu níž nebo přidej výkon a při přesazování zasaď natažený stonek hlouběji – konopí na zahrabaném stonku pustí nové kořeny.'
          }
        },
        {
          type: 'callout',
          tone: 'warning',
          title: { en: 'Damping off', cs: 'Padání klíčních rostlin' },
          md: {
            en: 'A fungal disease (Pythium, Rhizoctonia, Fusarium) that makes the stem thin, dark and pinched right at the soil line – the seedling then falls over and dies. It cannot be reversed, only prevented: **don\'t overwater**, use clean pots and fresh medium, keep air moving and don\'t let temperatures drop below ~20 °C with soggy soil.',
            cs: 'Houbová choroba (Pythium, Rhizoctonia, Fusarium), při které se stonek těsně u substrátu zúží, ztmavne a zaškrtí se – sazenice se pak zlomí a uhyne. Vyléčit se nedá, jen jí předejít: **nepřelévej**, používej čisté květináče a čerstvý substrát, zajisti proudění vzduchu a nenech teplotu klesnout pod ~20 °C při mokrém substrátu.'
          }
        },
        {
          type: 'table',
          head: [
            { en: 'Symptom', cs: 'Příznak' },
            { en: 'Likely cause', cs: 'Pravděpodobná příčina' },
            { en: 'What to do', cs: 'Co dělat' }
          ],
          rows: [
            [
              { en: 'Seed shell stuck on the leaves', cs: 'Slupka zůstala na lístcích' },
              { en: 'Medium too dry at the surface', cs: 'Moc suchý povrch substrátu' },
              { en: 'Mist it, wait a few hours, then gently remove', cs: 'Rosni ji, počkej pár hodin a opatrně sundej' }
            ],
            [
              { en: 'Drooping, dark, heavy leaves', cs: 'Svěšené, tmavé, těžké listy' },
              { en: 'Overwatering', cs: 'Přelití' },
              { en: 'Let it dry, water less but in smaller amounts', cs: 'Nech proschnout, pak zalévej menšími dávkami' }
            ],
            [
              { en: 'Yellow cotyledons after ~2 weeks', cs: 'Žluté děložní lístky po ~2 týdnech' },
              { en: 'Normal – stored food is used up', cs: 'Normální – zásoba živin došla' },
              { en: 'Nothing; start light feeding if true leaves pale too', cs: 'Nic; pokud blednou i pravé listy, začni lehce hnojit' }
            ],
            [
              { en: 'Burnt, clawing tips', cs: 'Spálené, zahnuté špičky' },
              { en: 'Too many nutrients or light', cs: 'Moc živin nebo světla' },
              { en: 'Plain water, lamp higher', cs: 'Čistá voda, lampa výš' }
            ],
            [
              { en: 'Nothing sprouts after 10 days', cs: 'Po 10 dnech nic nevyklíčilo' },
              { en: 'Old seed, too cold or too wet', cs: 'Staré semínko, zima nebo moc vody' },
              { en: 'Check temperature, try a new seed', cs: 'Zkontroluj teplotu, zkus nové semínko' }
            ]
          ]
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'germ-q1',
              q: { en: 'What does a seed need to germinate?', cs: 'Co semínko potřebuje ke klíčení?' },
              options: [
                { en: 'Moisture, warmth and darkness', cs: 'Vlhko, teplo a tmu' },
                { en: 'Strong light and fertilizer', cs: 'Silné světlo a hnojivo' },
                { en: 'Cold and dry conditions', cs: 'Chlad a sucho' },
                { en: 'Standing water for several days', cs: 'Stojatou vodu na několik dní' }
              ],
              correct: 0,
              explain: {
                en: 'Moisture softens the shell, warmth speeds up the process and light is not needed until the sprout surfaces.',
                cs: 'Vlhko změkčí slupku, teplo proces urychlí a světlo není potřeba, dokud klíček nevyleze nad povrch.'
              }
            },
            {
              id: 'germ-q2',
              q: { en: 'How deep should you plant a germinated seed?', cs: 'Jak hluboko zasadit naklíčené semínko?' },
              options: [
                { en: 'On the surface', cs: 'Na povrch' },
                { en: '0.5–1.5 cm, root down', cs: '0,5–1,5 cm, kořínkem dolů' },
                { en: '3–5 cm, root up', cs: '3–5 cm, kořínkem nahoru' },
                { en: 'As deep as possible', cs: 'Co nejhlouběji' }
              ],
              correct: 1,
              explain: {
                en: 'Shallow enough to surface quickly, deep enough to anchor. The root always points down.',
                cs: 'Dost mělko, aby rychle vylezlo, a dost hluboko, aby se ukotvilo. Kořínek vždy míří dolů.'
              }
            },
            {
              id: 'germ-q3',
              q: { en: 'Your seedling has a long, thin, wobbly stem. Most likely cause?', cs: 'Sazenice má dlouhý, tenký a vratký stonek. Nejpravděpodobnější příčina?' },
              options: [
                { en: 'Too much fertilizer', cs: 'Moc hnojiva' },
                { en: 'Too little light', cs: 'Málo světla' },
                { en: 'Pot too big', cs: 'Moc velký květináč' },
                { en: 'Humidity too high', cs: 'Moc vysoká vlhkost' }
              ],
              correct: 1,
              explain: {
                en: 'The seedling stretches to reach the light. Bring the lamp closer or raise its power.',
                cs: 'Sazenice se natahuje za světlem. Přibliž lampu nebo přidej výkon.'
              }
            },
            {
              id: 'germ-q4',
              q: { en: 'How do you prevent damping off?', cs: 'Jak předejít padání klíčních rostlin?' },
              options: [
                { en: 'Water more often', cs: 'Zalévat častěji' },
                { en: 'Spray with fertilizer', cs: 'Postřik hnojivem' },
                { en: 'Don\'t overwater, use clean pots and keep air moving', cs: 'Nepřelévat, čisté květináče a proudění vzduchu' },
                { en: 'Keep the room cold', cs: 'Držet v místnosti chladno' }
              ],
              correct: 2,
              explain: {
                en: 'The fungi thrive in cold, soggy, stagnant conditions. Once the stem pinches, the seedling cannot be saved.',
                cs: 'Houbám se daří v chladu, mokru a stojatém vzduchu. Jakmile se stonek zaškrtí, sazenice se už zachránit nedá.'
              }
            },
            {
              id: 'germ-q5',
              q: { en: 'Why are autos best sown straight into the final pot?', cs: 'Proč automatky zasadit rovnou do finálního květináče?' },
              options: [
                { en: 'They need more light', cs: 'Potřebují víc světla' },
                { en: 'They have a fixed short life and transplant shock costs them yield', cs: 'Mají pevně daný krátký život a šok z přesazení je stojí výnos' },
                { en: 'They cannot grow in small pots at all', cs: 'V malých kelímcích vůbec neporostou' },
                { en: 'Their seeds are bigger', cs: 'Mají větší semínka' }
              ],
              correct: 1,
              explain: {
                en: 'Autos flower on their own clock, so every day of stress is a day of growth lost for good.',
                cs: 'Automatky kvetou podle vlastních hodin, takže každý den stresu je den růstu, který už nedoženou.'
              }
            }
          ]
        }
      ]
    }
  ]
} satisfies Chapter
