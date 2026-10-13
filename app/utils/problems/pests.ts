import type { Problem } from './types'

const PESTS_GUIDE = '/guide/problems#problems-pests'
const MOULD_GUIDE = '/guide/problems#problems-mould'

const NO_BUD_SPRAYS = 'No sprays on flowering buds. After week 2 of flower, rely on predators, traps and manual removal.'

export const PEST_PROBLEMS: Problem[] = [
  {
    id: 'spider_mites',
    category: 'pest',
    name: 'Spider mites',
    aka: ['Two-spotted spider mite', 'Red spider mite'],
    summary: 'Tiny sap-sucking mites that leave pale stippling on leaves and spin webs in heavy infestations.',
    areas: ['underside', 'old-leaves', 'whole-plant'],
    symptoms: [
      'Fine pale or yellow pin-prick dots (stippling) on the upper leaf surface.',
      'Leaves turn bronze or grey-yellow, then dry and crispy as the stippling merges.',
      'Fine silk webbing between leaves, bud sites and at branch tips in heavy cases.',
      'Moving specks on the leaf underside, often with tiny round eggs and shed skins.',
      'Problem spreads fast in hot, dry rooms and often starts on one plant.'
    ],
    confirm: [
      'Check leaf undersides with a 30–60× loupe. Look for oval mites with two dark spots, clear round eggs and white cast skins.',
      'Tap a branch over white paper. Specks that crawl away are mites.',
      'Wipe the underside with a white tissue. Red or brown smears point to crushed mites.',
      'Look for webbing at the tops of colas with a torch held at a low angle.'
    ],
    lookalikes: [
      { id: 'thrips', howToTell: 'Thrips leave silver streaks with black frass dots, not fine dot stippling, and the insects are long and fast.' },
      { id: 'russet_broad_mites', howToTell: 'Russet and broad mites are too small for a loupe at 30×, leave no webbing and cause glossy, twisted new growth.' },
      { id: 'mg_def', howToTell: 'Magnesium deficiency shows interveinal yellowing on older leaves with no dots, eggs or webs underneath.' },
      { id: 'light_burn', howToTell: 'Light burn bleaches only the top canopy closest to the lamp and the undersides are clean.' },
      { id: 'low_humidity', howToTell: 'Dry air gives crispy, curled edges but no stippling or moving specks; it does favour mites, so check anyway.' }
    ],
    causes: [
      'Hitchhiking on new clones, pets, clothes or outdoor plants.',
      'Hot and dry air, above 27 °C with RH under 40 %, speeds up breeding.',
      'Poor airflow and leaves left touching the tent walls.'
    ],
    fix: [
      'Isolate the plant. Mites spread on hands and tools, so treat it last.',
      'Remove the worst leaves and bag them before leaving the tent.',
      'Rinse leaf undersides with a strong water spray in veg to knock numbers down.',
      'Release Phytoseiulus persimilis for hotspots and Neoseiulus californicus or Amblyseius andersoni as a longer-lasting backup.',
      'Raise RH a little in veg; predators work better above 60 % and mites hate it.',
      'In veg, spray insecticidal soap or neem/azadirachtin every 3–5 days for 3 rounds to hit hatching eggs. Do not combine soap sprays with predator releases.',
      NO_BUD_SPRAYS,
      'With heavy webbing in late flower, harvest early rather than spray buds.'
    ],
    prevent: [
      'Quarantine new clones for 1–2 weeks and check them with a loupe.',
      'Keep RH at stage targets and temps under 28 °C.',
      'Good airflow and a clean tent between grows.',
      'Check leaf undersides weekly and run preventive Amblyseius andersoni or californicus sachets.',
      'Do not go into the grow room straight after working in the garden.'
    ],
    severity: 'high',
    stages: ['vegetative', 'flowering'],
    classifier: 'spider_mites',
    guide: PESTS_GUIDE
  },
  {
    id: 'thrips',
    category: 'pest',
    name: 'Thrips',
    summary: 'Slender fast-moving insects that rasp leaf cells and leave silvery streaks dotted with black frass.',
    areas: ['top-canopy', 'whole-plant', 'underside'],
    symptoms: [
      'Silver or bronze streaks and patches on the upper leaf surface.',
      'Tiny black dots of frass scattered over the silver patches.',
      'Slender yellow, brown or black insects 1–2 mm long that run or jump when disturbed.',
      'Pale larvae on leaf undersides and along veins.',
      'Damaged leaves turn papery and may curl or die back.'
    ],
    confirm: [
      'Use a 30–60× loupe on both leaf sides. Look for cigar-shaped insects and black frass.',
      'Hang blue or yellow sticky traps at canopy height; blue catches thrips best.',
      'Tap a leaf over white paper and watch for thin, fast insects.',
      'Pupae drop into the soil, so check the top layer too.'
    ],
    lookalikes: [
      { id: 'spider_mites', howToTell: 'Mites leave fine dot stippling and webbing, with no black frass streaks.' },
      { id: 'leaf_miners', howToTell: 'Leaf miners make winding tunnels inside the leaf, not surface silvering.' },
      { id: 'light_burn', howToTell: 'Light burn bleaches leaves evenly near the lamp, without black frass dots or insects.' },
      { id: 'mg_def', howToTell: 'Magnesium deficiency yellows between veins on older leaves and has no frass.' }
    ],
    causes: [
      'Brought in on clones, cut flowers or houseplants.',
      'Flying in from outdoors through open intakes.',
      'Pupae surviving in reused soil.'
    ],
    fix: [
      'Remove the worst leaves and hang blue sticky traps across the canopy.',
      'Release Amblyseius swirskii or Neoseiulus cucumeris on the plants.',
      'Add Stratiolaelaps (Hypoaspis) or beneficial nematodes to the soil to eat pupae.',
      'In veg, spray insecticidal soap or neem/azadirachtin, repeated every 5 days for 3 rounds.',
      NO_BUD_SPRAYS
    ],
    prevent: [
      'Quarantine new clones and inspect them with a loupe.',
      'Put fine mesh or a filter on air intakes.',
      'Do not bring flowers or houseplants into the grow room.',
      'Keep sticky traps up all grow and log new catches weekly.',
      'Use fresh soil or treat reused soil, and clean the tent between grows.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'thrips',
    guide: PESTS_GUIDE
  },
  {
    id: 'aphids',
    category: 'pest',
    name: 'Aphids',
    aka: ['Greenfly', 'Plant lice'],
    summary: 'Soft-bodied sap suckers that cluster on new growth and leave sticky honeydew.',
    areas: ['new-leaves', 'underside', 'stems'],
    symptoms: [
      'Clusters of small pear-shaped green, black or grey insects on new shoots and under leaves.',
      'Sticky, shiny honeydew on leaves below the colony.',
      'Black sooty mould growing on the honeydew.',
      'White cast skins scattered on leaves.',
      'Curled, twisted or yellowing new growth.',
      'Ants walking up the stems to farm the honeydew.'
    ],
    confirm: [
      'Check new tips and leaf undersides with a 30× loupe for colonies and cast skins.',
      'Touch the leaves. Honeydew feels sticky.',
      'Yellow sticky traps catch the winged adults.',
      'Look for ants on the pot or stems.'
    ],
    lookalikes: [
      { id: 'whiteflies', howToTell: 'Whiteflies are white and fly up in a cloud when you shake the plant; aphids mostly sit still.' },
      { id: 'mealybugs', howToTell: 'Mealybugs are covered in white wax and sit in leaf axils and stem joints.' },
      { id: 'root_aphids', howToTell: 'Root aphids live in the root zone and show as general decline, not visible leaf colonies.' },
      { id: 'heat_stress', howToTell: 'Heat stress curls new leaves up like tacos, with no insects or honeydew.' }
    ],
    causes: [
      'Winged adults flying in from outdoors.',
      'Infested clones or houseplants.',
      'Ants carrying and protecting colonies.',
      'Soft, lush growth from too much nitrogen.'
    ],
    fix: [
      'Squash small colonies by hand and rinse plants with water in veg.',
      'Release ladybird larvae, lacewing larvae or Aphidius parasitic wasps.',
      'Control ants around the pots so they stop guarding the colonies.',
      'In veg, spray insecticidal soap or neem/azadirachtin every 5 days for 2–3 rounds.',
      NO_BUD_SPRAYS
    ],
    prevent: [
      'Quarantine new clones.',
      'Fine mesh on air intakes.',
      'Do not overfeed nitrogen.',
      'Yellow sticky traps to spot winged adults early.',
      'Clean tent and no houseplants in the grow room.'
    ],
    severity: 'medium',
    stages: ['seedling', 'vegetative', 'flowering'],
    classifier: 'aphids',
    guide: PESTS_GUIDE
  },
  {
    id: 'fungus_gnats',
    category: 'pest',
    name: 'Fungus gnats',
    aka: ['Sciarid flies'],
    summary: 'Small black flies around wet topsoil whose larvae chew roots, mostly hurting seedlings and clones.',
    areas: ['soil', 'roots'],
    symptoms: [
      'Small dark flies running over wet soil or flying around the pot.',
      'Thin translucent larvae with a black head in the top 2–5 cm of soil.',
      'Seedlings and clones wilt, stall or collapse at the base.',
      'Slow, droopy growth that looks like overwatering.'
    ],
    confirm: [
      'Push a slice of raw potato into the topsoil. Lift it after 1–2 days and check for white larvae.',
      'Place yellow sticky traps flat on the soil surface to count adults.',
      'Dig gently into the top layer with a loupe and look for larvae with black heads.'
    ],
    lookalikes: [
      { id: 'overwatering', howToTell: 'Overwatering alone gives droop with no flies or larvae; the two often come together.' },
      { id: 'root_rot', howToTell: 'Root rot shows brown slimy roots with a bad smell, not larvae in the topsoil.' },
      { id: 'root_aphids', howToTell: 'Root aphids are pear-shaped insects on the roots and leave white waxy residue, not worm-like larvae.' },
      { id: 'whiteflies', howToTell: 'Whiteflies are white and live under leaves, gnats are dark and stay near the soil.' }
    ],
    causes: [
      'Topsoil that stays wet for days.',
      'Bagged soil or compost with eggs in it.',
      'Organic mulches and decaying plant matter on the soil.'
    ],
    fix: [
      'Let the top 2–3 cm of soil dry between waterings; water from below if possible.',
      'Lay yellow sticky traps on the soil to catch adults.',
      'Drench the soil with BTi (Bacillus thuringiensis israelensis) every 5–7 days for 3 rounds.',
      'Add Stratiolaelaps scimitus (Hypoaspis) or Steinernema feltiae nematodes to the soil.',
      'Top-dress with 1–2 cm of coarse sand or perlite so adults cannot lay eggs.'
    ],
    prevent: [
      'Do not overwater; use pots with good drainage.',
      'Store soil sealed and dry.',
      'Clear fallen leaves off the soil.',
      'Keep sticky traps on the soil from day one.'
    ],
    severity: 'low',
    stages: ['germination', 'seedling', 'vegetative'],
    classifier: 'fungus_gnats',
    guide: PESTS_GUIDE
  },
  {
    id: 'whiteflies',
    category: 'pest',
    name: 'Whiteflies',
    summary: 'Tiny white moth-like flies on leaf undersides that suck sap and drip honeydew.',
    areas: ['underside', 'new-leaves'],
    symptoms: [
      'A cloud of tiny white flies rises when you shake the plant.',
      'Adults, oval scale-like nymphs and eggs on leaf undersides.',
      'Sticky honeydew and black sooty mould on leaves below.',
      'Pale, yellowing and weak leaves.'
    ],
    confirm: [
      'Shake a branch and watch for white flies.',
      'Check leaf undersides with a 30× loupe for flat, oval nymphs and eggs in rings.',
      'Hang yellow sticky traps; whiteflies show up as white specks.'
    ],
    lookalikes: [
      { id: 'aphids', howToTell: 'Aphids are pear-shaped, mostly wingless and do not fly up when disturbed.' },
      { id: 'fungus_gnats', howToTell: 'Gnats are dark grey and hang around the soil, not the leaf undersides.' },
      { id: 'mealybugs', howToTell: 'Mealybugs are fluffy, slow and sit in joints; they do not fly.' },
      { id: 'n_def', howToTell: 'Nitrogen deficiency yellows the oldest leaves first and leaves no honeydew or insects.' }
    ],
    causes: [
      'Infested clones or houseplants.',
      'Flying in from a greenhouse or garden.',
      'Warm, still air.'
    ],
    fix: [
      'Hang plenty of yellow sticky traps and shake plants to drive adults onto them.',
      'Vacuum adults off the undersides with a handheld vacuum.',
      'Release Amblyseius swirskii for nymphs and eggs, or Encarsia formosa parasitic wasps.',
      'In veg, spray insecticidal soap or neem/azadirachtin on the undersides every 5 days for 3 rounds.',
      NO_BUD_SPRAYS
    ],
    prevent: [
      'Quarantine new plants.',
      'Fine mesh on intakes.',
      'Good airflow and a clean tent.',
      'Keep yellow traps up and check them weekly.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'whiteflies',
    guide: PESTS_GUIDE
  },
  {
    id: 'caterpillars',
    category: 'pest',
    name: 'Caterpillars',
    aka: ['Budworms', 'Bud worms'],
    summary: 'Moth larvae that chew leaves and bore into buds, letting bud rot in from the inside.',
    areas: ['buds', 'top-canopy', 'whole-plant'],
    symptoms: [
      'Ragged holes and chewed edges on leaves.',
      'Small dark green or black pellets of frass on leaves and buds.',
      'Single brown, dead pistils or sugar leaves in the middle of an otherwise healthy bud.',
      'Thin silk and holes leading into colas.',
      'Grey mould starting inside a bud where a larva has fed.'
    ],
    confirm: [
      'Look for frass pellets on the leaves below a damaged bud.',
      'Gently open suspicious buds and look for a green or brown larva and tunnels.',
      'Check at night with a torch; many caterpillars feed in the dark.',
      'Look for moths around lights or outdoor plants.'
    ],
    lookalikes: [
      { id: 'botrytis', howToTell: 'Bud rot can follow caterpillar damage; frass and tunnels in the bud point to a larva as the cause.' },
      { id: 'leaf_miners', howToTell: 'Leaf miners tunnel inside the leaf tissue; caterpillars chew through from outside.' },
      { id: 'nutrient_burn', howToTell: 'Nutrient burn crisps leaf tips evenly and leaves no holes or frass.' }
    ],
    causes: [
      'Moths laying eggs on outdoor and greenhouse plants, mostly from mid-summer.',
      'Open windows or intakes without mesh near lights.'
    ],
    fix: [
      'Hand-pick every larva you find, checking daily at dusk.',
      'Open and remove damaged bud sections, cutting well into healthy tissue, and bag them.',
      'Spray Bt (Bacillus thuringiensis kurstaki) on leaves in veg and early flower, before buds stack; it only kills larvae that eat it.',
      NO_BUD_SPRAYS,
      'Release Trichogramma wasps outdoors to parasitise moth eggs.'
    ],
    prevent: [
      'Insect mesh over outdoor plants and intakes.',
      'Inspect plants weekly from mid-summer, looking for eggs and frass.',
      'Preventive Bt in veg and early flower for outdoor grows.',
      'Keep lights off near open windows at night.'
    ],
    severity: 'high',
    stages: ['vegetative', 'flowering'],
    classifier: 'caterpillars',
    guide: PESTS_GUIDE
  },
  {
    id: 'mealybugs',
    category: 'pest',
    name: 'Mealybugs',
    summary: 'Slow, white, waxy insects that hide in leaf axils and stem joints and leave honeydew.',
    areas: ['stems', 'underside', 'roots'],
    symptoms: [
      'White cottony clumps in leaf axils, branch joints and along stems.',
      'Oval insects 2–4 mm long covered in white wax powder.',
      'Sticky honeydew and sooty mould.',
      'Yellowing, weak growth and leaf drop in bad cases.'
    ],
    confirm: [
      'Check stem joints and leaf axils with a loupe for wax-covered insects.',
      'Crush a clump on paper. A live mealybug leaves a reddish or pink smear.',
      'Check the root ball and pot rim for white waxy patches.'
    ],
    lookalikes: [
      { id: 'powdery_mildew', howToTell: 'Powdery mildew is a flat white coating on leaf tops, not raised fluffy insects in the joints.' },
      { id: 'aphids', howToTell: 'Aphids are not waxy and move faster in colonies on new growth.' },
      { id: 'whiteflies', howToTell: 'Whiteflies fly up when the plant is shaken; mealybugs crawl slowly.' },
      { id: 'root_aphids', howToTell: 'Root aphids are smaller and pear-shaped; root mealybugs carry more white wax.' }
    ],
    causes: [
      'Brought in on houseplants or clones.',
      'Warm, dry, still rooms.',
      'Ants moving them between plants.'
    ],
    fix: [
      'Dab each clump with a cotton bud dipped in 70 % isopropyl alcohol in veg.',
      'Prune and bag heavily infested branches.',
      'Release Cryptolaemus montrouzieri (mealybug destroyer beetle) or lacewing larvae.',
      'In veg, spray insecticidal soap or neem/azadirachtin every 5 days for 3 rounds.',
      NO_BUD_SPRAYS
    ],
    prevent: [
      'Quarantine and inspect all new plants.',
      'No houseplants in the grow room.',
      'Keep ants out of the pots.',
      'Clean tent and tools between grows.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'mealybugs',
    guide: PESTS_GUIDE
  },
  {
    id: 'leaf_miners',
    category: 'pest',
    name: 'Leaf miners',
    summary: 'Fly larvae that tunnel inside leaves and leave pale winding trails.',
    areas: ['old-leaves', 'whole-plant'],
    symptoms: [
      'White or pale winding lines (mines) inside the leaf, getting wider as the larva grows.',
      'A dark line of frass inside the tunnel.',
      'Small round pale stipples where adult flies fed.',
      'Badly mined leaves yellow and drop.'
    ],
    confirm: [
      'Hold a leaf against the light. Live larvae show as a small dark spot at the wide end of the trail.',
      'Look at the surface with a loupe; the mine is under the skin, not on top.',
      'Yellow sticky traps catch the small black and yellow adult flies.'
    ],
    lookalikes: [
      { id: 'thrips', howToTell: 'Thrips damage is surface silvering in patches, not narrow winding tunnels.' },
      { id: 'caterpillars', howToTell: 'Caterpillars chew holes through the leaf from outside.' },
      { id: 'septoria', howToTell: 'Septoria makes round spots with dark edges, not winding trails.' }
    ],
    causes: [
      'Adult flies coming in from outdoors.',
      'Outdoor and greenhouse plants near weeds or vegetable beds.'
    ],
    fix: [
      'Crush the larva inside the mine with your fingers, or pick off mined leaves and bag them.',
      'Hang yellow sticky traps for adults.',
      'Release Diglyphus isaea parasitic wasps for heavier outdoor infestations.',
      'In veg, neem/azadirachtin works systemically on young larvae; repeat every 7 days for 2 rounds.',
      NO_BUD_SPRAYS
    ],
    prevent: [
      'Mesh on intakes and over outdoor plants.',
      'Remove weeds around outdoor grows.',
      'Check leaves weekly and remove the first mined leaves at once.'
    ],
    severity: 'low',
    stages: ['vegetative', 'flowering'],
    classifier: 'leaf_miners',
    guide: PESTS_GUIDE
  },
  {
    id: 'russet_broad_mites',
    category: 'pest',
    name: 'Russet & broad mites',
    aka: ['Hemp russet mite', 'Broad mite'],
    summary: 'Microscopic mites that cause glossy, twisted new growth and rusty, dead-looking buds.',
    areas: ['new-leaves', 'top-canopy', 'buds', 'stems'],
    symptoms: [
      'New growth is twisted, cupped, glossy or wet-looking, and stalls (broad mites).',
      'Leaf edges curl upward and turn bronze or rusty from the bottom up (russet mites).',
      'Stems and petioles look rusty or bronzed.',
      'Pistils die early and buds turn brown and stop swelling.',
      'Trichomes look flattened, broken or missing heads.',
      'No webbing and nothing visible to the naked eye.'
    ],
    confirm: [
      'You need at least 60× magnification; a 100× clip-on lens or a microscope is better.',
      'Look at stems, petioles and the base of new leaves for tiny cone-shaped (russet) or oval translucent (broad) mites.',
      'Press clear tape onto a stem, stick it on white paper and check under the microscope.',
      'Rule out feeding issues: one plant or one area getting worse while pH and EC are fine points to mites.'
    ],
    lookalikes: [
      { id: 'heat_stress', howToTell: 'Heat stress curls leaves near the lamp and clears when temps drop; mite damage keeps spreading.' },
      { id: 'ca_def', howToTell: 'Calcium deficiency gives brown spots on new leaves, while broad mites make them glossy and twisted.' },
      { id: 'k_def', howToTell: 'Potassium deficiency burns leaf edges with a crisp brown margin, without rusty stems.' },
      { id: 'hlvd', howToTell: 'HLVD gives small, airy buds but not glossy twisted growth or rusty stems, and mites are visible at 60×.' },
      { id: 'spider_mites', howToTell: 'Spider mites are visible with a 30× loupe, leave dot stippling and spin webs.' }
    ],
    causes: [
      'Infested clones; this is the main way they spread.',
      'Carried on clothing, pets and tools.',
      'Survive on old plant debris in the room.'
    ],
    fix: [
      'Isolate the plant at once and handle it last.',
      'Remove and bag the worst new growth.',
      'Release Amblyseius swirskii or Neoseiulus californicus; for russet mites, Amblyseius andersoni.',
      'In veg, spray sulfur (never within 2 weeks of an oil spray) or insecticidal soap on all surfaces every 5 days.',
      NO_BUD_SPRAYS,
      'In flower with heavy damage, consider ending the run early and deep-cleaning the room.'
    ],
    prevent: [
      'Quarantine all clones for 2 weeks and check stems at 60×.',
      'Start from seed if clone sources are unknown.',
      'Change clothes before entering the grow room.',
      'Deep-clean the room and tools between grows.'
    ],
    severity: 'high',
    stages: ['vegetative', 'flowering'],
    classifier: 'russet_broad_mites',
    guide: PESTS_GUIDE
  },
  {
    id: 'root_aphids',
    category: 'pest',
    name: 'Root aphids',
    summary: 'Aphids that live on roots and slowly starve the plant while hiding below the soil line.',
    areas: ['roots', 'soil', 'whole-plant'],
    symptoms: [
      'Slow growth and general yellowing that feeding changes do not fix.',
      'Plant wilts between waterings even when the soil is moist.',
      'White waxy residue on roots and the inside wall of the pot.',
      'Pale, pear-shaped insects on roots when you lift the root ball.',
      'Winged adults on sticky traps that look like gnats.'
    ],
    confirm: [
      'Lift the plant from the pot and check roots and the root ball edge with a 30× loupe.',
      'Look at gnat-like flies on yellow traps under a loupe: aphids have a pear-shaped body and tubes (cornicles) on the back.',
      'Do the potato-slice test to rule out gnat larvae.',
      'Check the drainage holes for insects crawling out.'
    ],
    lookalikes: [
      { id: 'fungus_gnats', howToTell: 'Gnat larvae are worm-like with a black head; root aphids are pear-shaped and leave white wax.' },
      { id: 'root_rot', howToTell: 'Root rot shows brown slimy roots and a bad smell, not white wax and insects.' },
      { id: 'n_def', howToTell: 'A real nitrogen deficiency improves after feeding; root aphid decline does not.' },
      { id: 'yellowing_wilting', howToTell: 'If yellowing and wilting persist with good pH, EC and watering, lift the plant and check the roots.' }
    ],
    causes: [
      'Infested clones or bagged soil.',
      'Reused soil from an infested grow.',
      'Ants carrying them between pots.'
    ],
    fix: [
      'Isolate the plant and do not reuse its soil.',
      'Drench the soil with beneficial nematodes (Steinernema feltiae) or Beauveria bassiana.',
      'Add Stratiolaelaps scimitus (Hypoaspis) to the soil.',
      'Use yellow sticky traps for winged adults.',
      'In veg, drench with neem/azadirachtin; in flower, stay with soil biologicals only.',
      NO_BUD_SPRAYS
    ],
    prevent: [
      'Quarantine clones and check their root balls.',
      'Do not reuse soil without treating it.',
      'Keep ants away from pots.',
      'Clean pots and the tent between grows.'
    ],
    severity: 'high',
    stages: ['vegetative', 'flowering'],
    guide: PESTS_GUIDE
  },
  {
    id: 'powdery_mildew',
    category: 'disease',
    name: 'Powdery mildew',
    aka: ['PM', 'White powdery mildew'],
    summary: 'A fungus that grows as white powdery spots on leaves and can spread onto buds.',
    areas: ['old-leaves', 'whole-plant', 'buds'],
    symptoms: [
      'Round white or grey powdery spots on the upper leaf surface.',
      'Spots spread and merge until leaves look dusted with flour.',
      'Under the powder, leaves turn yellow, then brown and dry.',
      'Starts on lower and inner leaves where air is still.',
      'In flower it can spread onto sugar leaves and buds.'
    ],
    confirm: [
      'Wipe a spot with your finger. Powdery mildew wipes off and comes back in a few days.',
      'Check with a loupe: mildew is fine, cobweb-like threads, not crystals.',
      'Trichomes are glassy and raised; mildew is flat and matte.',
      'Check RH and nighttime temperature drops.'
    ],
    lookalikes: [
      { id: 'mealybugs', howToTell: 'Mealybugs are raised insects that crawl, sitting in joints, not flat powder on leaf tops.' },
      { id: 'botrytis', howToTell: 'Botrytis is grey fuzzy mould inside buds that turns tissue brown and mushy.' },
      { id: 'high_humidity', howToTell: 'High humidity is the cause, not the symptom; it brings mildew, so check leaves when RH runs high.' },
      { id: 'nutrient_burn', howToTell: 'Dried fertiliser salts on leaves are crystal-like and do not spread from spot to spot.' }
    ],
    causes: [
      'High humidity, especially above 60 % with big day-night temperature swings.',
      'Still air in a dense canopy.',
      'Spores brought in on clones, clothes or from outdoors.'
    ],
    fix: [
      'Remove and bag the worst leaves without shaking spores around.',
      'Lower RH to stage targets and improve airflow through the canopy.',
      'Defoliate the inner canopy to let air in.',
      'In veg, spray potassium bicarbonate, diluted milk (1:9) or sulfur; keep sulfur away from oil sprays by 2 weeks.',
      'Bacillus subtilis or Bacillus amyloliquefaciens sprays work as a biological option in veg.',
      'No sprays on flowering buds. In flower, control RH and airflow and remove infected leaves.',
      'Do not smoke buds covered in mildew.'
    ],
    prevent: [
      'Keep RH at 40–50 % in flower and avoid night temperature drops above 5 °C.',
      'Strong airflow above and below the canopy.',
      'Thin out dense growth in late veg.',
      'Quarantine clones and clean the tent between grows.',
      'Choose mildew-resistant strains for humid climates.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'powdery_mildew',
    guide: MOULD_GUIDE
  },
  {
    id: 'botrytis',
    category: 'disease',
    name: 'Bud rot',
    aka: ['Botrytis', 'Grey mould', 'Gray mold'],
    summary: 'A grey mould that rots dense buds from the inside out, mostly in late flower.',
    areas: ['buds', 'top-canopy', 'stems'],
    symptoms: [
      'A single sugar leaf or a patch of pistils turns brown or yellow and dries in the middle of a healthy bud.',
      'Inside the bud, tissue is brown, mushy and wet.',
      'Grey fuzzy mould grows out of the bud, then dusty grey-brown spores.',
      'Stems above a rotting section may wilt.',
      'Musty, damp smell around the canopy.'
    ],
    confirm: [
      'Gently open suspicious buds and look at the core near the stem.',
      'Look for grey fuzz and brown mush, not just dry leaves.',
      'Check for caterpillar frass; larvae often start rot.',
      'Check RH, especially at lights-off.'
    ],
    lookalikes: [
      { id: 'caterpillars', howToTell: 'Caterpillar damage shows frass pellets and tunnels; rot often follows it.' },
      { id: 'powdery_mildew', howToTell: 'Powdery mildew is a white surface powder that wipes off, not rot inside the bud.' },
      { id: 'nutrient_burn', howToTell: 'Burnt tips on sugar leaves are crispy at the edges, while the bud inside stays firm and green.' },
      { id: 'high_humidity', howToTell: 'High RH in flower is the main trigger; open buds if it ran high.' }
    ],
    causes: [
      'RH above 55 % in late flower, especially at lights-off.',
      'Dense, large colas with poor airflow.',
      'Wet buds after a spray, rain or condensation.',
      'Caterpillar or other damage that opens the bud to spores.'
    ],
    fix: [
      'Cut out the rotting part plus a 2–3 cm margin of healthy-looking bud.',
      'Bag the cut piece inside the tent before moving it, so spores do not spread.',
      'Wash hands and clean scissors with alcohol after each cut.',
      'Never dry or smoke rotted buds; throw them away.',
      'Lower RH to 40–45 % and add airflow through the colas.',
      'Check every bud daily for the rest of the run.',
      'No sprays on flowering buds. If rot spreads fast near harvest, harvest early.'
    ],
    prevent: [
      'Keep RH at 40–50 % in late flower and run a dehumidifier at lights-off.',
      'Strong airflow and spaced-out plants.',
      'Defoliate and thin dense colas in early flower.',
      'Do not spray anything after week 2 of flower.',
      'Pick mould-resistant, airy strains for humid climates and outdoors.'
    ],
    severity: 'high',
    stages: ['flowering', 'drying'],
    classifier: 'botrytis',
    guide: MOULD_GUIDE
  },
  {
    id: 'septoria',
    category: 'disease',
    name: 'Septoria leaf spot',
    aka: ['Yellow leaf spot'],
    summary: 'A fungal leaf spot that starts on lower leaves and climbs the plant in wet conditions.',
    areas: ['old-leaves', 'whole-plant'],
    symptoms: [
      'Small round or angular yellow spots on lower leaves.',
      'Spots turn tan or brown with a darker edge and a yellow halo.',
      'Tiny black dots (fruiting bodies) in the centre of older spots.',
      'Spots merge, leaves yellow and drop, and the damage climbs upward.'
    ],
    confirm: [
      'Check spot centres with a 30× loupe for tiny black dots.',
      'Look at where it started: septoria begins low and moves up.',
      'Spots are scattered, not tied to leaf veins or edges.',
      'Check whether leaves stay wet for hours after watering or spraying.'
    ],
    lookalikes: [
      { id: 'ca_def', howToTell: 'Calcium deficiency spots appear on newer leaves and have no black dots or halos.' },
      { id: 'k_def', howToTell: 'Potassium deficiency browns leaf edges and tips, not round spots in the leaf.' },
      { id: 'mg_def', howToTell: 'Magnesium deficiency yellows between the veins without distinct spots.' },
      { id: 'nutrient_burn', howToTell: 'Nutrient burn starts at the tips, not as scattered round spots.' },
      { id: 'leaf_miners', howToTell: 'Leaf miners make winding trails, not round spots.' }
    ],
    causes: [
      'Wet leaves for long periods from watering, spraying or rain.',
      'Spores splashing up from soil and infected debris.',
      'High humidity and low airflow.'
    ],
    fix: [
      'Remove and bag spotted leaves, starting from the bottom.',
      'Water at the base and keep leaves dry.',
      'Improve airflow and lower RH.',
      'Mulch or cover the soil so spores do not splash up.',
      'In veg, spray a copper fungicide or Bacillus subtilis on remaining leaves.',
      'No sprays on flowering buds; in flower, just remove spotted leaves and keep air dry.'
    ],
    prevent: [
      'Water the soil, not the leaves.',
      'Keep RH at stage targets with good airflow.',
      'Remove fallen leaves and do not reuse infected soil.',
      'Clean the tent between grows.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'septoria'
  },
  {
    id: 'fusarium_wilt',
    category: 'disease',
    name: 'Fusarium wilt',
    aka: ['Fusarium'],
    summary: 'A soil fungus that blocks the plant’s water vessels and causes wilting that watering does not fix.',
    areas: ['whole-plant', 'stems', 'roots', 'old-leaves'],
    symptoms: [
      'Wilting that does not recover after watering, often one side or one branch first.',
      'Lower leaves yellow and dry, often curling upward with the tips.',
      'Brown or reddish streaks inside the stem when it is cut.',
      'Dark, dry rot at the stem base and on roots.',
      'Rapid collapse in warm soil.'
    ],
    confirm: [
      'Cut the main stem low down. Brown or red discolouration in the wood points to fusarium.',
      'Check roots: fusarium roots are dry-brown, not slimy like root rot.',
      'Rule out watering: check soil moisture with your finger or by pot weight.',
      'A plant lab can confirm it from a stem sample.'
    ],
    lookalikes: [
      { id: 'overwatering', howToTell: 'Overwatered plants droop evenly and recover as the soil dries; fusarium does not.' },
      { id: 'root_rot', howToTell: 'Root rot is brown, slimy and smelly; fusarium stains the inside of the stem.' },
      { id: 'yellowing_wilting', howToTell: 'Check the stem inside: clean wood rules out fusarium.' },
      { id: 'heat_stress', howToTell: 'Heat wilting recovers at lights-off; fusarium wilting stays.' }
    ],
    causes: [
      'Infected soil, clones or reused pots.',
      'Warm soil above 25 °C.',
      'Root damage from pests, transplanting or overwatering.'
    ],
    fix: [
      'Remove and bag the infected plant with its soil; there is no cure once vessels are blocked.',
      'Do not reuse the soil.',
      'Sterilise pots, trays and tools with a bleach or peroxide solution.',
      'Treat the remaining plants with Trichoderma or Bacillus subtilis soil drenches to protect roots.',
      'Isolate nearby plants and watch them closely.'
    ],
    prevent: [
      'Use fresh, sterile media and do not reuse soil from sick plants.',
      'Inoculate roots with Trichoderma at transplant.',
      'Keep root zone temperature under 24 °C.',
      'Avoid root damage and overwatering.',
      'Quarantine clones from unknown sources.'
    ],
    severity: 'high',
    stages: ['seedling', 'vegetative', 'flowering'],
    classifier: 'fusarium_wilt'
  },
  {
    id: 'hlvd',
    category: 'disease',
    name: 'Hop latent viroid',
    aka: ['HLVd', 'Dudding', 'Dud disease'],
    summary: 'A viroid spread mainly through clones that makes plants weak, brittle and gives small, low-potency buds.',
    areas: ['whole-plant', 'stems', 'buds'],
    symptoms: [
      'Plants grow slower and smaller than others of the same strain (dudding).',
      'Stems are brittle and snap easily, often with shorter internodes.',
      'Small, loose buds with fewer trichomes and weaker smell.',
      'Leaves may yellow or look malformed without a clear nutrient cause.',
      'A mother plant gets weaker clone after clone and cuttings root poorly.',
      'Some plants show no symptoms but still carry it.'
    ],
    confirm: [
      'Symptoms alone cannot confirm it. Send a sample to a plant testing lab for an RT-PCR test.',
      'Roots are the best sample in veg because the viroid shows there first; leaves are fine later.',
      'Test mother plants first, then a few clones from each.',
      'Rule out root problems, pests and feeding issues before suspecting HLVd.'
    ],
    lookalikes: [
      { id: 'russet_broad_mites', howToTell: 'Russet and broad mites cause similar stunting and poor buds but are visible at 60× and leave rusty stems.' },
      { id: 'root_aphids', howToTell: 'Root aphids show insects and white wax on the roots.' },
      { id: 'n_def', howToTell: 'A deficiency improves with correct feeding; HLVd does not.' },
      { id: 'heat_stress', howToTell: 'Heat stress clears when climate is fixed and does not pass on to clones.' }
    ],
    causes: [
      'Clones from an infected mother.',
      'Scissors and blades that carry sap between plants.',
      'Sometimes through infected seeds, though this is less common.'
    ],
    fix: [
      'There is no cure. Destroy confirmed plants and do not take clones from them.',
      'Sterilise scissors and blades with 10 % bleach between plants; alcohol alone does not kill the viroid.',
      'Restart from seed or from clean, tested stock.',
      'Labs can clean a valuable cultivar through tissue culture with meristem tips.'
    ],
    prevent: [
      'Buy clones only from sources that test their mothers.',
      'Quarantine and test new clones before they meet your mothers.',
      'Test mother plants regularly.',
      'Use separate or bleached tools for each plant.'
    ],
    severity: 'high',
    stages: ['vegetative', 'flowering']
  }
]
