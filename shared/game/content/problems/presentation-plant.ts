import type { ProblemPresentation } from '../../types.ts'
import { present } from './present.ts'

// Lookalikes share their 'subtle' wording on purpose; the telling detail shows from 'clear' on.
const PALE_LOWER: [string, string] = ['A few lower fan leaves look slightly paler than the rest.', 'Pár spodních vějířovitých listů je o něco bledších než ostatní.']
const PALE_TOP: [string, string] = ['The newest leaves at the top look lighter green than usual.', 'Nejmladší listy na vršku jsou světlejší než obvykle.']
const YELLOW_TIPS: [string, string] = ['The very tips of some leaves have turned yellow.', 'Úplné špičky některých listů zežloutly.']
const HANGING: [string, string] = ['The leaves hang a little lower than usual.', 'Listy visí o trochu níž než obvykle.']
const TOPS_CURL: [string, string] = ['The top leaves point upward and their edges lift a little.', 'Horní listy míří vzhůru a jejich okraje se mírně zvedají.']

export const PLANT_PRESENTATION: ProblemPresentation[] = [
  present('n_def',
    [['chlorosis-uniform', 'old', [0.3, 0.6, 0.9]], ['purple-petioles', 'old', [0, 0.3, 0.4]], ['stunted', 'all', [0, 0.1, 0.3]]],
    [['The lowest fan leaves look a shade paler green than the leaves above them.', 'Nejspodnější vějířovité listy jsou o odstín světlejší než listy nad nimi.']],
    [
      ['Several lower fan leaves have turned evenly yellow, veins included, while the top stays green.', 'Několik spodních vějířovitých listů zežloutlo celých i se žilkami, vršek rostliny zůstává zelený.'],
      ['Leaf stems on the lower branches show a reddish tint underneath.', 'Řapíky na spodních větvích jsou zespodu načervenalé.']
    ],
    [
      ['The yellowing has climbed halfway up the plant and the bottom leaves come off at a light tug.', 'Žloutnutí vystoupalo do půlky rostliny a spodní listy jdou dolů při lehkém zatažení.'],
      ['The whole plant looks light green and growth has slowed.', 'Celá rostlina je světle zelená a skoro neroste.']
    ]),

  present('p_def',
    [['dark-green', 'old', [0.3, 0.5, 0.6]], ['bronze-patches', 'old', [0, 0.5, 0.8]], ['purple-stems', 'stems', [0.1, 0.5, 0.7]], ['stunted', 'all', [0, 0.2, 0.4]]],
    [['Some older leaves look darker and duller than the rest.', 'Některé starší listy jsou tmavší a matnější než ostatní.']],
    [
      ['Older and middle leaves have a dull bluish-green tone, with bronze-brown blotches spreading in from the edges.', 'Starší a prostřední listy mají matný modrozelený odstín a od okrajů se po nich šíří bronzově hnědé skvrny.'],
      ['Leaf stems and the main stem are turning red to purple.', 'Řapíky i hlavní stonek fialoví do červena.']
    ],
    [
      ['The blotched leaves feel stiff and brittle and growth has nearly stalled.', 'Skvrnité listy jsou tuhé a křehké a růst se téměř zastavil.'],
      ['New shoots and bud sites stay small.', 'Nové výhony i místa pro palice zůstávají malé.']
    ]),

  present('k_def',
    [['yellow-edges-in', 'old', [0.3, 0.6, 0.8]], ['edge-burn', 'old', [0, 0.5, 0.8]], ['curl-up', 'old', [0, 0.3, 0.5]], ['rust-spots', 'old', [0, 0, 0.4]]],
    [['The tips of a few older leaves have turned yellow.', 'Špičky několika starších listů zežloutly.']],
    [
      ['Yellow margins on older and middle leaves are browning and feel crispy, while the centre of each leaf stays green.', 'Žluté okraje starších a prostředních listů hnědnou a jsou na dotek křupavé, střed listu zůstává zelený.'],
      ['The leaf edges are starting to curl up.', 'Okraje listů se začínají kroutit nahoru.']
    ],
    [
      ['Brown scorched edges have spread over many leaves, with rusty specks near the margins.', 'Hnědé spálené okraje se rozšířily na spoustu listů a u okrajů přibyly rezavé tečky.'],
      ['Stems feel weak and bend easily.', 'Stonky jsou slabé a snadno se ohnou.']
    ]),

  present('ca_def',
    [['rust-spots', 'new', [0.3, 0.6, 0.8]], ['twisted-new-growth', 'new', [0, 0.3, 0.6]], ['necrotic-spots', 'new', [0, 0.2, 0.5]], ['stunted', 'top', [0, 0, 0.3]]],
    [['A few small brownish spots have appeared on some middle leaves.', 'Na některých prostředních listech se objevilo pár malých nahnědlých teček.']],
    [
      ['Rusty brown spots with yellow rims are spreading over new and middle leaves.', 'Po nových a prostředních listech se šíří rezavě hnědé skvrny se žlutým lemem.'],
      ['Some new leaves come out crinkled, with hooked tips.', 'Některé nové listy rostou zvrásněné, se zahnutými špičkami.']
    ],
    [
      ['The spots have merged into dead patches and fresh growth at the top is twisted and slow.', 'Skvrny splynuly v odumřelé plochy a nové přírůstky nahoře jsou zkroucené a rostou pomalu.'],
      ['Stems feel weak and almost hollow.', 'Stonky jsou slabé a jakoby duté.']
    ]),

  present('mg_def',
    [['chlorosis-interveinal', 'old', [0.3, 0.6, 0.9]], ['rust-spots', 'old', [0, 0.2, 0.5]], ['curl-up', 'old', [0, 0, 0.4]]],
    [PALE_LOWER],
    [['Older leaves are yellowing between the veins while the veins stay green, like a green fishbone on a yellow leaf.', 'Starší listy žloutnou mezi žilkami a žilky zůstávají zelené, jako zelená rybí kost na žlutém listu.']],
    [
      ['The yellow areas carry rusty brown spots and are drying out.', 'Na žlutých plochách jsou rezavě hnědé skvrny a zasychají.'],
      ['The worst leaves curl at the edges and drop early.', 'Nejhorší listy se na okrajích kroutí a předčasně opadávají.']
    ]),

  present('s_def',
    [['pale-new-growth', 'new', [0.3, 0.6, 0.8]], ['chlorosis-uniform', 'new', [0, 0.5, 0.8]], ['purple-petioles', 'new', [0, 0.3, 0.4]], ['tip-burn', 'new', [0, 0, 0.4]], ['stunted', 'top', [0, 0.1, 0.3]]],
    [PALE_TOP],
    [
      ['New leaves at the top are evenly pale lime-yellow, veins included, while older leaves stay green.', 'Nové listy na vršku jsou rovnoměrně bledě limetkově žluté i se žilkami, starší listy zůstávají zelené.'],
      ['Leaf stems near the top look purplish.', 'Řapíky u vršku fialoví.']
    ],
    [['Top leaves stay small, their tips brown and curl, and growth has slowed.', 'Horní listy zůstávají malé, špičky jim hnědnou a kroutí se a růst se zpomalil.']]),

  present('fe_def',
    [['pale-new-growth', 'new', [0.3, 0.4, 0.6]], ['chlorosis-interveinal', 'new', [0, 0.6, 0.9]]],
    [PALE_TOP],
    [
      ['New leaves at the tops are bright yellow between the veins, and the sharp green veins form a clear net.', 'Nové listy na vrcholcích jsou mezi žilkami jasně žluté a ostře zelené žilky tvoří zřetelnou síťku.'],
      ['Older leaves lower down look normal.', 'Starší listy níž vypadají normálně.']
    ],
    [['The freshest leaves come out almost white, still without brown spots.', 'Nejčerstvější listy vyrůstají skoro bílé, zatím bez hnědých skvrn.']]),

  present('zn_def',
    [['twisted-new-growth', 'new', [0.2, 0.5, 0.8]], ['chlorosis-interveinal', 'new', [0, 0.4, 0.6]], ['stunted', 'top', [0, 0.3, 0.6]], ['necrotic-spots', 'new', [0, 0, 0.3]]],
    [['New leaves at the top look a bit smaller and narrower than before.', 'Nové listy na vršku jsou o něco menší a užší než dřív.']],
    [
      ['New leaves come out small and wrinkled, yellow between the veins, and some blades twist sideways.', 'Nové listy rostou malé a zvrásněné, mezi žilkami žloutnou a některé čepele se stáčejí do strany.'],
      ['The nodes at the top sit very close together.', 'Nody na vršku jsou nahuštěné těsně nad sebou.']
    ],
    [['The top is bunched up and stunted, with leaves twisted almost sideways and a few brown spots.', 'Vršek je zhuštěný a zakrslý, listy jsou zkroucené skoro napříč a mají pár hnědých skvrn.']]),

  present('mn_def',
    [['chlorosis-interveinal', 'new', [0.2, 0.5, 0.7]], ['necrotic-spots', 'new', [0, 0.3, 0.7]]],
    [['Upper and middle leaves look slightly pale and blotchy.', 'Horní a prostřední listy jsou lehce bledé a skvrnité.']],
    [
      ['Upper and middle leaves show a blurry, mottled yellow between the veins, with wide green bands along each vein.', 'Horní a prostřední listy jsou mezi žilkami rozmazaně žlutě mramorované a podél žilek zůstávají široké zelené pruhy.'],
      ['Tiny brown or grey dead specks sit in the yellow areas.', 'Ve žlutých místech jsou drobné hnědé nebo šedé odumřelé tečky.']
    ],
    [['The specks have joined into dead patches and some leaves drop, though the leaf shape stays normal.', 'Tečky se slily do odumřelých ploch a některé listy opadávají, tvar listů je ale normální.']]),

  present('b_def',
    [['twisted-new-growth', 'new', [0.2, 0.6, 0.8]], ['stunted', 'top', [0.1, 0.4, 0.7]], ['necrotic-spots', 'new', [0, 0.2, 0.4]]],
    [['The growing tips look a little thick and stiff.', 'Růstové vrcholy vypadají trochu ztluštělé a tuhé.']],
    [['New leaves come out thick, brittle and twisted, and the main growing tip has turned brown.', 'Nové listy rostou tlusté, křehké a zkroucené a hlavní růstový vrchol zhnědl.']],
    [
      ['The tip has died and a bushy tangle of side shoots grows below it.', 'Vrchol odumřel a pod ním raší chomáč postranních výhonů.'],
      ['Stems crack easily.', 'Stonky snadno praskají.']
    ]),

  present('cu_def',
    [['dark-green', 'new', [0.3, 0.6, 0.7]], ['droop', 'new', [0.1, 0.4, 0.6]], ['tip-burn', 'new', [0, 0.3, 0.6]], ['twisted-new-growth', 'new', [0, 0, 0.4]]],
    [['New leaves look unusually dark and a bit limp.', 'Nové listy jsou nezvykle tmavé a trochu povadlé.']],
    [
      ['New leaves are dark blue-green with a shiny, metallic look, and they droop even though the pot is moist.', 'Nové listy jsou tmavě modrozelené, lesklé až kovové a visí, přestože je substrát vlhký.'],
      ['Their edges curl and the tips are browning.', 'Okraje se jim kroutí a špičky hnědnou.']
    ],
    [['Tips on the new growth are dying and fresh leaves come out twisted.', 'Špičky nových přírůstků odumírají a čerstvé listy vyrůstají pokroucené.']]),

  present('mo_def',
    [['chlorosis-interveinal', 'old', [0.2, 0.5, 0.7]], ['yellow-edges-in', 'old', [0, 0.4, 0.6]], ['curl-up', 'old', [0, 0.3, 0.5]], ['edge-burn', 'old', [0, 0, 0.5]]],
    [['Some middle and lower leaves look a little washed out.', 'Některé prostřední a spodní listy jsou trochu vybledlé.']],
    [
      ['Middle and older leaves yellow between the veins and their margins turn orange to pink.', 'Prostřední a starší listy žloutnou mezi žilkami a jejich okraje oranžoví až růžovějí.'],
      ['Some of those leaves are cupping.', 'Některé z nich se miskovitě prohýbají.']
    ],
    [['The coloured margins are scorching and the cupped leaves twist.', 'Barevné okraje usychají a prohnuté listy se kroutí.']]),

  present('nutrient_burn',
    [['tip-burn', 'all', [0.3, 0.6, 0.8]], ['dark-green', 'all', [0.2, 0.4, 0.5]], ['edge-burn', 'all', [0, 0.2, 0.5]]],
    [YELLOW_TIPS],
    [['Leaf tips are brown, crispy and slightly twisted, while the leaves themselves are a deep dark green.', 'Špičky listů jsou hnědé, křupavé a lehce zkroucené, samotné listy jsou sytě tmavě zelené.']],
    [['The brown is creeping in from the tips along the edges, on leaves at every height.', 'Hnědnutí postupuje od špiček podél okrajů dovnitř, a to na listech ve všech patrech.']]),

  present('n_toxicity',
    [['dark-green', 'all', [0.4, 0.7, 0.8]], ['claw', 'all', [0.1, 0.6, 0.8]], ['tip-burn', 'all', [0, 0, 0.4]]],
    [['The leaves look a very deep green and glossy.', 'Listy jsou velmi sytě zelené a lesklé.']],
    [['Leaf tips bend down sharply like claws, while the leaves stay firm and almost blue-green.', 'Špičky listů se ostře ohýbají dolů jako drápy, listy přitom zůstávají pevné a skoro modrozelené.']],
    [
      ['Whole leaves arc downward and the stems feel soft.', 'Celé listy se obloukem stáčejí dolů a stonky jsou měkké.'],
      ['Some of the hooked tips are starting to yellow and burn.', 'Některé zahnuté špičky začínají žloutnout a hnědnout.']
    ]),

  present('ph_lockout',
    [['stunted', 'all', [0.1, 0.3, 0.6]], ['chlorosis-interveinal', 'all', [0, 0.4, 0.6]], ['rust-spots', 'new', [0, 0.3, 0.5]], ['tip-burn', 'all', [0, 0.3, 0.5]]],
    [['Growth has slowed a little and the leaves look dull.', 'Růst se trochu zpomalil a listy vypadají matně.']],
    [
      ['Different patterns show at once: yellowing on old leaves, odd spots on new ones and burnt tips here and there.', 'Najednou se objevuje víc vzorů: žloutnutí na starých listech, podivné skvrny na nových a tu a tam spálené špičky.'],
      ['Despite steady feeding the plant is barely growing.', 'I přes pravidelné krmení rostlina skoro neroste.']
    ],
    [['Old and new leaves alike are spotted, pale and burnt at the tips, and growth has stalled.', 'Staré i nové listy jsou skvrnité, bledé a mají spálené špičky, růst se zastavil.']]),

  present('salt_buildup',
    [['tip-burn', 'all', [0.1, 0.4, 0.6]], ['stunted', 'all', [0, 0.2, 0.4]], ['yellow-edges-in', 'old', [0, 0, 0.4]]],
    [
      ['The plant drinks a little less than before.', 'Rostlina pije o trochu méně než dřív.'],
      YELLOW_TIPS
    ],
    [
      ['A white crust has formed on the surface of the medium and around the drainage holes.', 'Na povrchu substrátu a kolem odtokových otvorů se vytvořila bílá krusta.'],
      ['Leaf tips are slowly burning and the leaves look dull and stiff.', 'Špičky listů pomalu hnědnou a listy jsou matné a tuhé.']
    ],
    [['The pot stays wet for days, and yellowing like a hungry plant shows up despite regular feeding.', 'Květináč zůstává mokrý celé dny a i přes pravidelné krmení se objevuje žloutnutí jako u hladové rostliny.']]),

  present('light_burn',
    [['bleached-top', 'top', [0.2, 0.6, 0.9]], ['curl-up', 'top', [0, 0.3, 0.4]]],
    [['The topmost leaves look a little paler than the leaves below them.', 'Úplně horní listy jsou o něco bledší než listy pod nimi.']],
    [
      ['Leaves and tips closest to the lamp are fading from yellow toward white, while the veins stay green for now.', 'Listy a vrcholky nejblíž lampě blednou ze žluté do bílé, žilky zatím zůstávají zelené.'],
      ['Lower leaves look perfectly healthy.', 'Spodní listy vypadají úplně zdravě.']
    ],
    [['The tops are bone white and crispy, and they have lost their smell.', 'Vrcholky jsou bílé jako kost, křupavé a ztratily vůni.']]),

  present('taco_leaves',
    [['taco', 'top', [0.2, 0.6, 0.8]], ['edge-burn', 'top', [0, 0, 0.4]]],
    [TOPS_CURL],
    [['Upper leaves fold into a canoe shape and show their silvery undersides from above, but they still feel firm and green.', 'Horní listy se skládají do tvaru kánoe a shora je vidět jejich stříbřitý rub, pořád jsou ale pevné a zelené.']],
    [['The folded edges are drying out and turning crispy.', 'Přehnuté okraje zasychají a křupou.']]),

  present('low_light',
    [['stretch', 'all', [0.3, 0.6, 0.8]], ['chlorosis-uniform', 'all', [0.1, 0.3, 0.4]], ['chlorosis-uniform', 'old', [0, 0.2, 0.5]], ['droop', 'all', [0, 0, 0.3]]],
    [['The gaps between nodes look a bit longer than usual.', 'Mezery mezi nody jsou o něco delší než obvykle.']],
    [['Stems are thin and stretch toward the lamp, and the leaves are large, thin and pale green.', 'Stonky jsou tenké a natahují se k lampě, listy jsou velké, tenké a světle zelené.']],
    [
      ['The plant is leggy and flops over without support.', 'Rostlina je vytáhlá a bez opory poléhá.'],
      ['Shaded lower leaves yellow and drop, and any flowers stay small and airy.', 'Zastíněné spodní listy žloutnou a padají a případné květy zůstávají malé a vzdušné.']
    ]),

  present('light_leak_stress',
    [['stretch', 'top', [0.1, 0.3, 0.4]], ['foxtails', 'buds', [0, 0.2, 0.4]], ['nanners', 'buds', [0, 0, 0.3]]],
    [['Flowering looks slightly behind where it should be.', 'Kvetení je o kousek pozadu oproti tomu, kde by mělo být.']],
    [['Buds develop unevenly, and some tops keep pushing out leaves instead of flowers.', 'Palice se vyvíjejí nerovnoměrně a některé vrcholky dál ženou listy místo květů.']],
    [
      ['Round, single-bladed leaves sprout from the buds.', 'Z palic raší kulaté lístky s jedinou čepelí.'],
      ['A few pale, pointed pods poke out between the pistils.', 'Mezi pestíky vykukuje pár bledých špičatých útvarů.']
    ]),

  present('overwatering',
    [['droop', 'all', [0.3, 0.6, 0.8]], ['curl-down', 'all', [0.1, 0.5, 0.7]], ['chlorosis-uniform', 'old', [0, 0, 0.4]]],
    [HANGING],
    [['Whole leaves curl down from the stem but feel firm and swollen, and the pot is heavy with dark, wet topsoil.', 'Celé listy se od stonku stáčejí dolů, ale jsou pevné a nalité, květináč je těžký a vršek substrátu tmavý a mokrý.']],
    [
      ['The droop never lifts, growth has stalled and the lower leaves are fading to yellow.', 'Svěšení vůbec nepovolí, růst stojí a spodní listy blednou do žluta.'],
      ['A green film is growing on the surface of the medium.', 'Na povrchu substrátu roste zelený povlak.']
    ]),

  present('underwatering',
    [['wilt', 'all', [0.3, 0.7, 0.9]], ['droop', 'all', [0.2, 0.4, 0.6]], ['chlorosis-uniform', 'old', [0, 0, 0.3]]],
    [HANGING],
    [['Leaves hang limp and soft, thin like paper, and the pot feels light with the medium pulling away from the wall.', 'Listy visí zplihle a měkce, tenké jako papír, květináč je lehký a substrát odstupuje od stěny.']],
    [['The whole plant sags and the lowest leaves are yellowing and crisping.', 'Celá rostlina se hroutí a nejspodnější listy žloutnou a usychají.']]),

  present('root_rot',
    [['wilt', 'all', [0.2, 0.5, 0.8]], ['chlorosis-uniform', 'all', [0, 0.3, 0.5]], ['edge-burn', 'all', [0, 0, 0.4]], ['stunted', 'all', [0, 0.3, 0.6]]],
    [['The plant looks a little tired and droopy, even though the pot is moist.', 'Rostlina vypadá trochu unaveně a svěšeně, i když je substrát vlhký.']],
    [
      ['It wilts in wet medium, and a sour, swampy smell rises from the root zone.', 'Vadne i v mokrém substrátu a od kořenů je cítit kyselý, bažinatý zápach.'],
      ['The roots you can see are brown and slimy instead of white.', 'Kořeny, které jsou vidět, jsou hnědé a slizké místo bílých.']
    ],
    [['Leaves yellow and look burnt no matter how you feed, and growth has stopped.', 'Listy žloutnou a vypadají spáleně, ať krmíš jakkoli, a růst se zastavil.']]),

  present('heat_stress',
    [['taco', 'top', [0.3, 0.6, 0.8]], ['edge-burn', 'top', [0, 0.3, 0.6]], ['wilt', 'top', [0, 0.3, 0.5]], ['foxtails', 'buds', [0, 0, 0.3]]],
    [TOPS_CURL],
    [
      ['The top leaves fold up, and crispy brown spots appear on the ones nearest the lamp.', 'Horní listy se přehýbají nahoru a na těch nejblíž lampě se objevují křupavé hnědé skvrny.'],
      ['The top wilts while the lamp is on and recovers in the dark.', 'Vršek při svícení vadne a ve tmě se vzpamatuje.']
    ],
    [['Brown, crispy edges cover the upper canopy and the smell in the tent has gone weak.', 'Hnědé křupavé okraje pokrývají celé horní patro a vůně ve stanu zeslábla.']]),

  present('cold_stress',
    [['purple-stems', 'stems', [0.3, 0.6, 0.8]], ['purple-petioles', 'all', [0.2, 0.5, 0.7]], ['dark-green', 'all', [0, 0.3, 0.5]], ['droop', 'all', [0, 0.2, 0.3]], ['stunted', 'all', [0, 0.2, 0.5]]],
    [['Stems and leaf stalks show a faint purple tint.', 'Stonky a řapíky mají lehce fialový nádech.']],
    [
      ['Stems and leaf stalks have turned purple-red, some leaves look dark, and the pot dries very slowly.', 'Stonky a řapíky zčervenaly do fialova, některé listy ztmavly a substrát vysychá velmi pomalu.'],
      ['The leaves droop in the morning and lift later in the day.', 'Ráno listy visí a během dne se zvednou.']
    ],
    [['Growth has nearly stopped and dull blotches show on the darkened leaves.', 'Růst se skoro zastavil a na ztmavlých listech jsou matné skvrny.']]),

  present('high_humidity',
    [['stunted', 'all', [0.05, 0.2, 0.4]]],
    [['The tent walls fog up with condensation at lights off.', 'Při zhasnutí se stěny stanu orosí.']],
    [
      ['Droplets hang on the leaf tips in the morning and the pots stay wet longer than usual.', 'Ráno visí na špičkách listů kapky a květináče zůstávají mokré déle než obvykle.'],
      ['There is a faint musty smell in the tent.', 'Ve stanu je cítit slabý zatuchlý pach.']
    ],
    [['Growth has slowed, the air feels heavy and damp, and the musty smell is strong.', 'Růst se zpomalil, vzduch je těžký a vlhký a zatuchlý pach je výrazný.']]),

  present('low_humidity',
    [['tip-burn', 'all', [0.3, 0.5, 0.7]], ['edge-burn', 'all', [0, 0.4, 0.6]], ['taco', 'top', [0, 0.3, 0.5]], ['stunted', 'all', [0, 0, 0.3]]],
    [['The tips of some leaves look dry and crispy.', 'Špičky některých listů jsou suché a křupavé.']],
    [
      ['Leaf edges are dry and crispy with green tissue right behind them, and the upper leaves fold up and look dull.', 'Okraje listů jsou suché a křupavé a hned za nimi je zelené pletivo, horní listy se přehýbají nahoru a jsou matné.'],
      ['The pots dry out much faster than before.', 'Květináče vysychají mnohem rychleji než dřív.']
    ],
    [['Dry, crispy edges are everywhere and the plant barely grows.', 'Suché křupavé okraje jsou všude a rostlina téměř neroste.']]),

  present('wind_burn',
    [['curl-down', 'all', [0.2, 0.4, 0.6]], ['claw', 'top', [0, 0.4, 0.6]], ['edge-burn', 'all', [0, 0.4, 0.7]]],
    [['Leaves on one side of the plant flutter hard and look a little twisted.', 'Listy na jedné straně rostliny se prudce třepotají a jsou trochu zkroucené.']],
    [['Leaves facing the airflow curl down into claws and have dry, torn edges, while the far side looks fine.', 'Listy otočené proti proudu vzduchu se stáčejí dolů jako drápy a mají suché, potrhané okraje, odvrácená strana vypadá v pořádku.']],
    [['Leaves on that side are shredded and crispy and keep whipping back and forth.', 'Listy na té straně jsou rozedrané, křupavé a pořád se zmítají sem a tam.']]),

  present('hermaphrodite',
    [['nanners', 'buds', [0.2, 0.6, 0.9]]],
    [['A few small pale growths poke out between the pistils on some buds.', 'Na některých palicích vykukuje mezi pestíky pár malých bledých výrůstků.']],
    [
      ['Yellow-green, banana-shaped pods stick out of the buds.', 'Z palic trčí žlutozelené útvary ve tvaru banánku.'],
      ['Small round pods on stalks hang at some nodes.', 'U některých nodů visí malé kulaté váčky na stopkách.']
    ],
    [
      ['Pale dust coats the leaves below the pods.', 'Listy pod nimi pokrývá světlý prach.'],
      ['Seeds are swelling inside the buds.', 'V palicích se nalévají semena.']
    ]),

  present('transplant_shock',
    [['droop', 'all', [0.3, 0.5, 0.7]], ['stunted', 'all', [0.1, 0.3, 0.5]], ['pale-new-growth', 'new', [0, 0.3, 0.4]], ['chlorosis-uniform', 'old', [0, 0.2, 0.4]]],
    [['The plant has drooped a little since it moved into the new pot.', 'Od přesazení rostlina trochu visí.']],
    [['Growth has paused for several days, a couple of lower leaves are yellowing and the new growth looks slightly pale.', 'Růst se na několik dní zastavil, pár spodních listů žloutne a nové přírůstky jsou lehce bledé.']],
    [['Days after the move the plant still wilts and has made no new growth.', 'Ani pár dní po přesazení se rostlina nevzpamatovala, vadne a nic nového nevyrostlo.']]),

  present('foxtailing',
    [['foxtails', 'buds', [0.2, 0.6, 0.9]]],
    [['A few top buds look slightly spiky instead of rounded.', 'Pár vrchních palic je mírně špičatých místo zakulacených.']],
    [['Thin towers of new calyxes with white pistils are growing out of mature buds on the top colas under the lamp.', 'Z vyzrálých palic na vrcholcích pod lampou vyrůstají tenké věžičky nových kalichů s bílými pestíky.']],
    [['The top colas look stretched and spiky rather than dense, stacked with towers of fresh calyxes.', 'Vrchní palice jsou vytáhlé a špičaté místo hutných, poskládané z věžiček čerstvých kalichů.']])
]
