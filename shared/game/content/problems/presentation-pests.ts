import type { ProblemPresentation } from '../../types.ts'
import { present } from './present.ts'
import type { Line } from './present.ts'

const STICKY: Line = ['A few leaves feel a little sticky to the touch.', 'Pár listů je na dotek trochu lepkavých.']
const PALE_DOTS: Line = ['Some leaves show a sprinkling of tiny pale dots on the upper surface.', 'Na líci některých listů je poprášení drobných světlých teček.']

export const PEST_PRESENTATION: ProblemPresentation[] = [
  present('spider_mites',
    [['stipple', 'all', [0.3, 0.6, 0.9]], ['insects', 'underside', [0, 0.3, 0.6]], ['bronze-patches', 'all', [0, 0.2, 0.5]], ['webbing', 'top', [0, 0.1, 0.7]]],
    [PALE_DOTS],
    [
      ['Fine pale stippling covers many leaves.', 'Jemné světlé tečkování pokrývá spoustu listů.'],
      ['Tiny moving specks and round eggs sit on the undersides.', 'Na rubu listů se pohybují drobounké tečky a leží tam kulatá vajíčka.']
    ],
    [
      ['Leaves have turned bronze-grey and crispy.', 'Listy zbronzověly do šeda a jsou křupavé.'],
      ['Fine silk webbing stretches between leaves and branch tips.', 'Mezi listy a konci větví se táhnou jemné hedvábné pavučinky.']
    ]),

  present('thrips',
    [['silver-streaks', 'all', [0.3, 0.6, 0.9]], ['insects', 'underside', [0, 0.3, 0.5]], ['necrotic-spots', 'all', [0, 0, 0.4]]],
    [['Some leaves show small pale, slightly silvery patches on top.', 'Na líci některých listů jsou malé světlé, lehce stříbřité plošky.']],
    [
      ['Silvery streaks and patches on the leaves are speckled with tiny black dots.', 'Stříbřité šmouhy a plochy na listech jsou posety drobnými černými tečkami.'],
      ['Slender little insects run off when you touch a leaf.', 'Po dotyku listu z něj utíkají štíhlí drobní hmyzáci.']
    ],
    [['Large papery silver areas curl and die back, with pale larvae along the veins underneath.', 'Velké papírově stříbřité plochy se kroutí a odumírají a na rubu podél žilek lezou bledé larvy.']]),

  present('aphids',
    [['sticky', 'all', [0.2, 0.5, 0.8]], ['twisted-new-growth', 'new', [0.1, 0.3, 0.6]], ['insects', 'new', [0, 0.5, 0.8]]],
    [
      ['The new shoots look slightly curled.', 'Nové výhony jsou mírně zkroucené.'],
      STICKY
    ],
    [
      ['Clusters of small pear-shaped insects sit on new shoots and under leaves.', 'Na nových výhonech a na rubu listů sedí shluky malých hruškovitých hmyzáků.'],
      ['Shiny sticky drops and white cast skins lie on the leaves below.', 'Na listech pod nimi jsou lesklé lepkavé kapky a bílé svlečky.']
    ],
    [
      ['A black sooty film covers the sticky leaves and new growth is twisted and yellowing.', 'Lepkavé listy pokrývá černý sazovitý povlak a nové přírůstky jsou zkroucené a žloutnou.'],
      ['Ants are walking up the stems.', 'Po stoncích lezou mravenci.']
    ]),

  present('fungus_gnats',
    [['insects', 'stems', [0.1, 0.4, 0.6]], ['droop', 'all', [0, 0.2, 0.5]], ['stunted', 'all', [0, 0.1, 0.4]]],
    [['A couple of tiny dark specks flit up from the soil when you water.', 'Při zálivce vylétne ze substrátu pár drobných tmavých teček.']],
    [
      ['Small dark flies run over the wet topsoil and circle the pot.', 'Po mokrém povrchu substrátu pobíhají malé tmavé mušky a krouží kolem květináče.'],
      ['The top few centimetres of soil hold thin, see-through larvae with black heads.', 'V horních pár centimetrech substrátu jsou tenké průsvitné larvy s černou hlavičkou.']
    ],
    [['The plant droops and stalls as if the pot were always too wet, and the youngest shoots look weak at the base.', 'Rostlina visí a neroste, jako by byl substrát pořád moc mokrý, a nejmladší výhony jsou u báze slabé.']]),

  present('whiteflies',
    [['sticky', 'all', [0.2, 0.5, 0.7]], ['insects', 'underside', [0.1, 0.5, 0.8]], ['chlorosis-uniform', 'all', [0, 0.2, 0.5]]],
    [
      STICKY,
      ['Some leaves look slightly pale.', 'Některé listy jsou lehce bledé.']
    ],
    [
      ['A cloud of tiny white flies rises when you brush the plant.', 'Když o rostlinu zavadíš, vzlétne obláček drobných bílých mušek.'],
      ['Small oval specks and eggs cover the leaf undersides.', 'Rub listů pokrývají malé oválné tečky a vajíčka.']
    ],
    [['The lower leaves are sticky and blackened by a sooty film, and many leaves are yellow and weak.', 'Spodní listy jsou lepkavé a zčernalé sazovitým povlakem a spousta listů je žlutých a slabých.']]),

  present('caterpillars',
    [['chewed', 'all', [0.2, 0.5, 0.7]], ['necrotic-spots', 'buds', [0, 0.3, 0.5]], ['gray-mold', 'buds', [0, 0, 0.4]]],
    [['A couple of leaves have small ragged holes along the edges.', 'Pár listů má po okrajích malé roztřepené díry.']],
    [
      ['Small dark green pellets lie on the chewed leaves.', 'Na okousaných listech leží malé tmavě zelené kuličky.'],
      ['A single brown, dead patch of pistils sits in the middle of an otherwise healthy bud.', 'Uprostřed jinak zdravé palice je osamělé hnědé odumřelé místo s pestíky.']
    ],
    [['Thin silk and holes lead into the colas, and grey fuzz grows inside a bud where something has been feeding.', 'Do palic vedou tenká vlákna a díry a uvnitř palice, kde se něco krmilo, roste šedé chmýří.']]),

  present('mealybugs',
    [['insects', 'stems', [0.2, 0.5, 0.8]], ['sticky', 'all', [0, 0.3, 0.6]], ['chlorosis-uniform', 'all', [0, 0.1, 0.5]]],
    [['A few white fluffy specks sit in some leaf joints.', 'V paždí několika listů sedí pár bílých chmýřovitých teček.']],
    [['White cottony clumps line the branch joints and stems, and up close they are slow oval insects coated in wax powder.', 'Paždí větví a stonky lemují bílé vatovité chomáčky a zblízka jsou to pomalí ovální hmyzáci pokrytí voskovým pudrem.']],
    [['A sticky film and black soot cover the leaves, growth is weak and yellow, and leaves drop.', 'Listy pokrývá lepkavý povlak a černé saze, růst je slabý a žlutý a listy opadávají.']]),

  present('leaf_miners',
    [['leaf-trails', 'old', [0.2, 0.6, 0.8]], ['stipple', 'old', [0.1, 0.2, 0.3]], ['chlorosis-uniform', 'old', [0, 0, 0.4]]],
    [['A few lower leaves show tiny pale dots and a short pale squiggle.', 'Na pár spodních listech jsou drobné světlé tečky a krátká světlá klikatá čárka.']],
    [['Pale winding trails run inside the leaves, widening along their length, with a dark line down the middle.', 'Uvnitř listů se táhnou světlé klikaté cestičky, které se postupně rozšiřují a uprostřed mají tmavou linku.']],
    [['Leaves crowded with trails are turning yellow and dropping.', 'Listy hustě protkané cestičkami žloutnou a opadávají.']]),

  present('russet_broad_mites',
    [['twisted-new-growth', 'new', [0.2, 0.5, 0.8]], ['bronze-patches', 'stems', [0, 0.4, 0.6]], ['stunted', 'top', [0, 0.3, 0.6]], ['curl-up', 'old', [0, 0.2, 0.5]]],
    [['The newest leaves look slightly cupped and oddly shiny.', 'Nejmladší listy jsou mírně miskovitě prohnuté a podivně lesklé.']],
    [
      ['New growth is twisted, glossy and wet-looking and has stopped expanding.', 'Nové přírůstky jsou zkroucené, lesklé jako mokré a přestaly růst.'],
      ['Stems and leaf stalks look rusty, yet nothing is visible to the naked eye, not even under the leaves.', 'Stonky a řapíky vypadají rezavě, pouhým okem ale nic vidět není, ani na rubu listů.']
    ],
    [['Lower leaf edges curl up and turn bronze, pistils have died early, and the buds are brown and no longer swelling.', 'Okraje spodních listů se kroutí nahoru a bronzoví, pestíky předčasně odumřely a palice jsou hnědé a přestaly nabírat.']]),

  present('root_aphids',
    [['chlorosis-uniform', 'all', [0.2, 0.4, 0.6]], ['stunted', 'all', [0.1, 0.3, 0.6]], ['wilt', 'all', [0, 0.3, 0.6]]],
    [['The plant is growing a little slower and paler than it should.', 'Rostlina roste o něco pomaleji a je bledší, než by měla.']],
    [
      ['It wilts between waterings although the soil is still moist, and changing the feed does nothing for the yellowing.', 'Mezi zálivkami vadne, i když je substrát ještě vlhký, a se žloutnutím nepomáhá ani změna krmení.'],
      ['A white waxy residue clings to the inside wall of the pot.', 'Na vnitřní stěně květináče ulpívá bílý voskový povlak.']
    ],
    [['Lifting the root ball shows pale pear-shaped insects on the roots, and small winged insects hover around the pot.', 'Po vytažení balu jsou na kořenech vidět bledí hruškovití hmyzáci a kolem květináče poletují malí okřídlení hmyzáci.']]),

  present('powdery_mildew',
    [['powder', 'old', [0.2, 0.5, 0.6]], ['powder', 'all', [0, 0.3, 0.7]], ['chlorosis-uniform', 'old', [0, 0.2, 0.5]]],
    [['A few faint white spots sit on the upper surface of some lower leaves.', 'Na líci několika spodních listů je pár nevýrazných bílých skvrnek.']],
    [['Round white powdery spots are spreading and merging on the inner and lower leaves, and they smear off when wiped.', 'Kulaté bílé moučné skvrny se na vnitřních a spodních listech šíří a slévají a dají se setřít.']],
    [
      ['The leaves look dusted with flour and are yellowing and drying underneath it.', 'Listy vypadají jako poprášené moukou a pod povlakem žloutnou a zasychají.'],
      ['The white coating is climbing onto the upper leaves.', 'Bílý povlak šplhá i na horní listy.']
    ]),

  present('botrytis',
    [['necrotic-spots', 'buds', [0.1, 0.3, 0.4]], ['gray-mold', 'buds', [0, 0.4, 0.9]], ['wilt', 'top', [0, 0, 0.3]]],
    [['A single sugar leaf in the middle of one bud has turned yellow and dry.', 'Jeden cukrový lístek uprostřed palice zežloutl a uschl.']],
    [
      ['A patch of pistils inside a dense bud has gone brown, and the tissue underneath is soft and wet.', 'Kus pestíků uvnitř hutné palice zhnědl a pletivo pod ním je měkké a mokré.'],
      ['A damp, musty smell hangs over the canopy.', 'Nad porostem visí vlhký zatuchlý pach.']
    ],
    [['Grey fuzz grows out of the buds and puffs grey-brown dust, and the stems above the soft sections are wilting.', 'Z palic vyrůstá šedé chmýří a práší z něj šedohnědý prach, stonky nad rozměklými místy vadnou.']]),

  present('septoria',
    [['necrotic-spots', 'old', [0.2, 0.5, 0.8]], ['chlorosis-uniform', 'old', [0, 0.2, 0.5]]],
    [['A few small yellow spots dot some of the lowest leaves.', 'Na některých nejspodnějších listech je pár malých žlutých teček.']],
    [
      ['The spots have turned tan to brown with a darker rim and a yellow halo, and they are climbing to higher leaves.', 'Skvrny zhnědly do béžova, mají tmavší lem a žlutou obrubu a šplhají na výš položené listy.'],
      ['Older spots carry tiny black dots in the centre.', 'Starší skvrny mají uprostřed drobné černé tečky.']
    ],
    [['The spots merge, many lower leaves have yellowed and dropped, and the damage keeps moving upward.', 'Skvrny splývají, spousta spodních listů zežloutla a opadala a poškození postupuje dál vzhůru.']]),

  present('fusarium_wilt',
    [['wilt', 'all', [0.2, 0.5, 0.9]], ['chlorosis-uniform', 'old', [0, 0.4, 0.6]], ['curl-up', 'old', [0, 0.3, 0.4]]],
    [['One branch hangs a little lower than the rest.', 'Jedna větev visí o trochu níž než ostatní.']],
    [['The wilting on one side does not recover after watering, and the lower leaves yellow and dry with their tips curling up.', 'Vadnutí na jedné straně se po zálivce nespraví a spodní listy žloutnou a usychají se špičkami stočenými nahoru.']],
    [
      ['The base of the stem is dark and dry.', 'Spodek stonku je tmavý a suchý.'],
      ['The plant is collapsing quickly.', 'Rostlina rychle kolabuje.']
    ]),

  present('hlvd',
    [['stunted', 'all', [0.2, 0.5, 0.7]], ['chlorosis-uniform', 'all', [0, 0.2, 0.3]], ['twisted-new-growth', 'new', [0, 0.1, 0.3]]],
    [['The plant seems a little small for its age.', 'Rostlina je na svůj věk trochu malá.']],
    [
      ['Growth is slow, the gaps between nodes are short, and a stem snaps far more easily than it should.', 'Roste pomalu, mezery mezi nody jsou krátké a stonek praskne mnohem snáz, než by měl.'],
      ['Some leaves look yellowed or misshapen without any clear pattern.', 'Některé listy jsou zažloutlé nebo zdeformované bez jasného vzoru.']
    ],
    [['The plant is stunted and brittle, and any flowers are small and loose with little frost and a faint smell.', 'Rostlina je zakrslá a křehká a případné květy jsou malé a řídké, s málo trichomy a slabou vůní.']])
]
