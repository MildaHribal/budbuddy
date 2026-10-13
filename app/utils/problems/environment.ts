import type { Problem } from './types'

export const GROW_PROBLEMS: Problem[] = [
  // light
  {
    id: 'light_burn',
    category: 'light',
    name: 'Light burn (bleaching)',
    aka: ['bleaching', 'light stress', 'white tops'],
    summary: 'Too much light intensity bleaches the top leaves and buds closest to the lamp.',
    areas: ['top-canopy', 'buds'],
    symptoms: [
      'Top leaves and cola tips turn pale yellow, then bone white.',
      'Only the parts closest to the lamp are affected; lower leaves look healthy.',
      'Leaf veins often stay green at first while the blade yellows from the top down.',
      'Sugar leaves and bracts on top buds go white, crispy and lose smell.',
      'Leaves near the top may point straight up or curl up at the edges.'
    ],
    confirm: [
      'Measure lamp-to-canopy distance and compare with the maker\'s chart for the dimming level you run.',
      'Measure PPFD at the tallest tops: over 1000 µmol/m²/s without added CO2 is past what most plants use.',
      'Work out DLI: PPFD × light hours × 0.0036. Over about 40 mol/m²/day in flower is asking for bleaching.',
      'Check that damage follows the light footprint: tops in the hotspot are white, tops at the edges are not.',
      'Check canopy temperature; if it is normal, light is the cause rather than heat.'
    ],
    lookalikes: [
      { id: 'heat_stress', howToTell: 'Heat stress tacos and droops leaves across the whole top in a hot tent; light burn bleaches white under the hotspot even when the temperature is fine.' },
      { id: 'n_def', howToTell: 'Nitrogen deficiency yellows the oldest, lowest leaves first; light burn starts at the very top.' },
      { id: 'fe_def', howToTell: 'Iron deficiency yellows new growth everywhere with green veins, not just under the lamp.' },
      { id: 'nutrient_burn', howToTell: 'Nutrient burn shows as brown crispy tips on leaves at all heights, not white bleached tops.' }
    ],
    causes: [
      'Lamp hung too low or dimmer set too high for the stage.',
      'Tall colas that grew into the hotspot during the stretch.',
      'Raising light intensity too fast after moving from veg to flower.',
      'High intensity without enough CO2, nutrition or VPD to use it.'
    ],
    fix: [
      'Raise the lamp or dim it 10–20 % until the top PPFD is roughly 800–1000 µmol/m²/s in flower.',
      'Bend or supercrop the tallest colas down to even the canopy.',
      'Shorten the light period in veg if the DLI is too high.',
      'Bleached tissue will not turn green again; judge recovery by new growth.',
      'Late in flower, harvest bleached tops a few days early if they turn hay-like.'
    ],
    prevent: [
      'Measure PPFD at the canopy after every lamp height change, or use a phone light meter app as a rough guide.',
      'Ramp intensity up over a week after the flip instead of jumping to full power.',
      'Keep the canopy flat with training so no top sits in the hotspot.',
      'Re-check the gap twice a week during the stretch.'
    ],
    severity: 'medium',
    stages: ['flowering'],
    guide: '/guide/problems#problems-burn-lockout'
  },
  {
    id: 'taco_leaves',
    category: 'light',
    name: 'Taco leaves',
    aka: ['canoeing', 'leaf edges curling up', 'tacoing'],
    summary: 'Leaflets fold up along the midrib like a taco to dodge too much light or heat.',
    areas: ['top-canopy'],
    symptoms: [
      'Leaflet edges curl upward so the leaf looks like a taco or canoe.',
      'Mostly on the upper canopy closest to the lamp.',
      'Leaves stay green and firm at first, not droopy.',
      'The silvery underside shows from above as leaves fold.',
      'With time the edges may dry and turn crispy.'
    ],
    confirm: [
      'Check whether only the top canopy is affected; lower leaves sit flat.',
      'Measure canopy temperature with lights on; over about 29 °C points to heat.',
      'Measure PPFD at the tops; if it is very high but the temperature is fine, light is the driver.',
      'Measure RH and compute VPD; above about 1.6 kPa in veg or 1.8 kPa in flower the plant folds leaves to save water.',
      'Raise the lamp or dim it for two days and see whether new leaves come in flat.'
    ],
    lookalikes: [
      { id: 'heat_stress', howToTell: 'Heat stress is the same fold plus a hot tent reading and often foxtailing; tacoing in a cool tent points to light intensity.' },
      { id: 'low_humidity', howToTell: 'Dry air causes tacoing with crispy edges and fast drying pots even under moderate light.' },
      { id: 'mg_def', howToTell: 'Magnesium deficiency starts on older middle leaves with yellowing between the veins before curling.' },
      { id: 'russet_broad_mites', howToTell: 'Broad mites twist and glaze new growth in odd shapes, not a clean upward fold on top leaves.' },
      { id: 'overwatering', howToTell: 'Overwatered leaves curl down and droop; tacoing leaves curl up.' }
    ],
    causes: [
      'Light intensity too high at the tops.',
      'Canopy temperature too high.',
      'High VPD from dry air, which makes the plant close up to cut water loss.',
      'Poor airflow leaving a hot layer of air right under the lamp.'
    ],
    fix: [
      'Raise or dim the lamp until the folding stops on new growth.',
      'Bring canopy temperature to 24–28 °C with lights on.',
      'Raise humidity to bring VPD into range.',
      'Add a clip fan that moves air across the tops, not straight into them.'
    ],
    prevent: [
      'Keep PPFD and canopy temperature in range for the stage and check them weekly.',
      'Track VPD, not just RH.',
      'Keep the canopy level so no top sits close to the lamp.'
    ],
    severity: 'low',
    stages: ['vegetative', 'flowering'],
    guide: '/guide/environment#environment-light'
  },
  {
    id: 'low_light',
    category: 'light',
    name: 'Not enough light',
    aka: ['stretching', 'leggy plants', 'etiolation'],
    summary: 'Too little light makes plants stretch toward the lamp with thin stems and airy growth.',
    areas: ['whole-plant', 'stems'],
    symptoms: [
      'Long gaps between nodes and thin, weak stems.',
      'Seedlings that flop over or lean hard toward the light.',
      'Pale, light green leaves that are large but thin.',
      'Slow growth even with good feeding and watering.',
      'In flower: small, airy, loose buds, especially lower down.',
      'Lower leaves yellow and drop early because they are shaded.'
    ],
    confirm: [
      'Measure PPFD at the canopy: seedlings want about 200–400, veg 400–600, flower 600–1000 µmol/m²/s.',
      'Work out DLI: PPFD × light hours × 0.0036. Under about 15 mol/m²/day in veg or 25 in flower is low.',
      'Measure the lamp distance; very high hanging or heavy dimming is common in small tents.',
      'Compare the lamp wattage with the area: LEDs need roughly 30–50 W per square foot of flowering canopy.',
      'Check that the stretch happens under the lamp too, not only at the edges.'
    ],
    lookalikes: [
      { id: 'heat_stress', howToTell: 'Heat also stretches plants, but the tent reads hot and top leaves taco; low light stretches in a normal or cool tent.' },
      { id: 'n_def', howToTell: 'Nitrogen deficiency yellows old leaves first but does not cause long internodes.' },
      { id: 'foxtailing', howToTell: 'Foxtailing is new spires on top of finished buds; low light gives loose buds from the start.' }
    ],
    causes: [
      'Lamp too weak for the space or hung too high.',
      'Dimmer left at a low seedling setting.',
      'Windowsill or weak outdoor spot with only a few hours of direct sun.',
      'Seedlings kept too long under very weak light.',
      'A dense canopy shading lower bud sites.'
    ],
    fix: [
      'Lower the lamp or raise the dimmer in steps, checking PPFD each time.',
      'Bury stretched seedlings deeper at transplant; the buried stem grows roots.',
      'Support leggy stems with stakes and add a gentle fan to firm them.',
      'Defoliate or lollipop shaded lower growth that will never get light.',
      'In veg, extend the light period to raise DLI if the lamp is already at full power.'
    ],
    prevent: [
      'Size the lamp to the tent before you start.',
      'Measure PPFD at seedling height on day one.',
      'Use training to keep the canopy flat and inside the lamp footprint.'
    ],
    severity: 'medium',
    stages: ['seedling', 'vegetative', 'flowering'],
    guide: '/guide/environment#environment-light'
  },
  {
    id: 'light_leak_stress',
    category: 'light',
    name: 'Light leaks in the dark period',
    aka: ['light interruption', 'broken dark period'],
    summary: 'Light reaching photoperiod plants during the dark period stresses them and can cause hermies or delay flowering.',
    areas: ['buds', 'whole-plant'],
    symptoms: [
      'Bananas or male pods appearing mid to late flower.',
      'Flowering starts late or plants keep stretching and throwing leaves after the flip.',
      'Buds foxtail or reveg with round single-blade leaves.',
      'Uneven flowering: plants near the leak lag behind.'
    ],
    confirm: [
      'Sit inside the closed tent with the lights off for five minutes until your eyes adjust and look for pinholes and glowing zips.',
      'Check the room for street lights, standby LEDs, phone screens and doors opened during the dark period.',
      'Confirm the timer is set right and has not drifted or reset after a power cut.',
      'Check whether the problem is worse on the side of the tent nearest the leak.'
    ],
    lookalikes: [
      { id: 'hermaphrodite', howToTell: 'Hermies with a proven dark tent point to genetics or other stress; check for leaks before blaming the strain.' },
      { id: 'foxtailing', howToTell: 'Heat or light foxtailing hits the top colas under the lamp; leak-related reveg shows round leaves throughout.' }
    ],
    causes: [
      'Pinholes in the tent fabric, worn seams or zips not fully closed.',
      'Room lights or street lights entering through vents or ducting.',
      'Indicator LEDs on gear inside the tent.',
      'Opening the tent to check plants during lights off.',
      'Faulty or wrongly set timer.'
    ],
    fix: [
      'Patch pinholes with black tape and cover glowing indicator LEDs.',
      'Fit light traps or bends in intake ducting.',
      'If you must work in the dark period, use a dim green headlamp only, briefly.',
      'Pick off any bananas found and check the plant every few days.',
      'Keep the dark period strictly uninterrupted from now on.'
    ],
    prevent: [
      'Do the dark tent check before the flip and again after any gear change.',
      'Use a digital timer with battery backup.',
      'Schedule lights off for a time when nobody needs to open the tent.'
    ],
    severity: 'medium',
    stages: ['flowering'],
    guide: '/guide/problems#problems-hermies'
  },
  // water
  {
    id: 'overwatering',
    category: 'water',
    name: 'Overwatering',
    aka: ['drooping', 'waterlogged'],
    summary: 'Roots sit in wet medium with no air, so the plant droops even though it has plenty of water.',
    areas: ['whole-plant'],
    symptoms: [
      'Whole leaves droop and curl down from the stem like claws, but feel firm and swollen.',
      'Droop is there before and after watering, often worst a few hours after.',
      'Pot stays heavy and the top of the medium stays dark and wet for days.',
      'Slow growth and leaves may turn pale or yellow over time.',
      'Fungus gnats and green algae on the surface are common side effects.'
    ],
    confirm: [
      'Lift the pot: it feels heavy compared with a pot that was just watered and drained.',
      'Push a finger 3–5 cm into the medium; still wet means no watering is needed.',
      'Feel a leaf: overwatered leaves are firm and turgid, not soft and papery.',
      'Check that the pot drains freely and is not standing in runoff.',
      'If roots are visible, they should be white; brown and smelly means root rot.'
    ],
    lookalikes: [
      { id: 'underwatering', howToTell: 'Underwatered leaves droop limp and papery in a light pot and perk up within hours of watering.' },
      { id: 'n_toxicity', howToTell: 'Nitrogen toxicity gives dark green clawed leaves with tips curled down, but the pot is not soggy and the plant does not droop.' },
      { id: 'root_rot', howToTell: 'Root rot is the next step: drooping that does not improve as the pot dries, plus brown slimy roots.' },
      { id: 'heat_stress', howToTell: 'Heat makes leaves curl up and wilt at the top; overwatering curls the whole leaf down.' }
    ],
    causes: [
      'Watering on a schedule instead of by pot weight.',
      'Pot too large for a small plant, so the medium never dries.',
      'Poor drainage: no holes, dense soil, saucers left full.',
      'Low temperature or low VPD, so the plant drinks slowly.'
    ],
    fix: [
      'Stop watering until the pot feels light and the top few cm are dry.',
      'Empty saucers and raise the pot so it drains.',
      'Increase airflow and keep root zone temperature around 20–24 °C.',
      'Next time water until 10–20 % runoff, then wait for the pot to get light again.',
      'For seedlings in big pots, water only a ring around the stem until roots fill out.'
    ],
    prevent: [
      'Learn the pot weight dry and right after watering, and water by weight.',
      'Use fabric pots or add 20–30 % perlite to soil.',
      'Step up pot sizes as the plant grows.',
      'Keep VPD in range so the plant transpires properly.'
    ],
    severity: 'medium',
    stages: ['seedling', 'vegetative'],
    guide: '/guide/media#media-watering'
  },
  {
    id: 'underwatering',
    category: 'water',
    name: 'Underwatering',
    aka: ['thirsty plant', 'wilting'],
    summary: 'The medium has dried out and the plant wilts limp until it gets water.',
    areas: ['whole-plant'],
    symptoms: [
      'Leaves hang limp and soft, the whole plant sags.',
      'Leaves feel thin and papery, not firm.',
      'Medium is dry, pulling away from the pot edge.',
      'Lower leaves yellow and crisp up if it happens often.',
      'Plant perks up within a few hours of watering.'
    ],
    confirm: [
      'Lift the pot: it feels very light.',
      'Push a finger into the medium; it is dry several cm down.',
      'Water and check again in 2–4 hours; recovery confirms it.',
      'In coco or hydro, check runoff EC: repeated drying concentrates salts.'
    ],
    lookalikes: [
      { id: 'overwatering', howToTell: 'Overwatered plants droop with firm leaves in a heavy, wet pot.' },
      { id: 'low_humidity', howToTell: 'Dry air makes plants thirsty and crisps edges, but the pot is not bone dry.' },
      { id: 'root_rot', howToTell: 'A plant with root rot wilts even when the pot is wet, because dead roots cannot drink.' },
      { id: 'k_def', howToTell: 'Potassium deficiency browns leaf edges on older leaves without the whole plant wilting.' }
    ],
    causes: [
      'Too long between waterings as the plant grows and drinks more.',
      'Pot too small for the plant.',
      'Hot, dry air or strong light raising water use.',
      'Hydrophobic dry soil that sheds water down the sides.'
    ],
    fix: [
      'Water slowly in two passes so the medium soaks it up instead of channelling it.',
      'If soil is hydrophobic, bottom water for 15–20 minutes or add a few drops of mild wetting agent.',
      'Water by weight from now on and check daily in late veg and flower.',
      'Trim only fully dead leaves; give wilted ones a day to recover.'
    ],
    prevent: [
      'Check pot weight every day once the plant is large.',
      'Up-pot when the plant needs water every day in soil.',
      'In coco, water daily or more often to 10–20 % runoff.',
      'Consider a drip or wicking system if you are away.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'underwatering',
    guide: '/guide/media#media-watering'
  },
  {
    id: 'root_rot',
    category: 'water',
    name: 'Root rot',
    aka: ['pythium', 'brown roots', 'slimy roots'],
    summary: 'Roots starved of oxygen die and get attacked by water moulds like pythium, so the plant wilts and stalls.',
    areas: ['roots', 'whole-plant'],
    symptoms: [
      'Plant droops and wilts even though the medium is wet.',
      'Roots brown, slimy and stringy instead of white and fuzzy.',
      'Rotten, swampy smell from the root zone or reservoir.',
      'Yellowing and burnt-looking leaves that look like deficiencies but do not respond to feeding.',
      'Growth stalls; seedlings may collapse at the base (damping off).'
    ],
    confirm: [
      'Slide the plant out of the pot or lift the net pot and look: healthy roots are white or cream and firm.',
      'Pinch a brown root: if the outer layer slides off leaving a thin thread, it is rot.',
      'Smell the roots and reservoir; healthy roots smell earthy, rot smells sour or like sewage.',
      'In hydro, measure water temperature: over 22 °C sharply raises the risk.',
      'Check dissolved oxygen: air stone running, bubbles visible, no dead spots.'
    ],
    lookalikes: [
      { id: 'overwatering', howToTell: 'Overwatering droops a plant with white roots; rot means brown slimy roots and a bad smell.' },
      { id: 'ph_lockout', howToTell: 'Lockout gives mixed deficiency signs with healthy-looking roots and a pH reading out of range.' },
      { id: 'fungus_gnats', howToTell: 'Gnat larvae chew roots in wet soil and add to rot, but you will see adults flying from the surface.' },
      { id: 'underwatering', howToTell: 'An underwatered plant wilts in a dry pot and recovers fast after watering; a rotting one does not.' }
    ],
    causes: [
      'Medium kept wet for long periods so roots run out of oxygen.',
      'Warm nutrient solution in hydro, which holds little oxygen.',
      'Pythium and similar water moulds that attack weakened roots; they spread through water, tools and gnat larvae.',
      'Light reaching the reservoir or roots, growing algae that eat oxygen.',
      'Organic additives or dead roots rotting in the reservoir.'
    ],
    fix: [
      'In hydro: change the reservoir, cool it to 18–21 °C and run strong aeration.',
      'Rinse roots in clean, pH-corrected water and cut off fully mushy roots with clean scissors.',
      'Add beneficial microbes (Bacillus or Trichoderma) to outcompete pythium, or use a peroxide dose in sterile hydro, not both.',
      'In soil or coco: let the pot dry to a light weight before the next watering.',
      'Lower stress: reduce light intensity a little until new white roots appear.',
      'Badly rotted seedlings rarely recover; replace them.'
    ],
    prevent: [
      'Keep reservoir water at 18–21 °C and always aerated.',
      'Make reservoirs and tubing light-proof.',
      'Water by pot weight, use airy media and pots that drain.',
      'Clean and sterilise gear between grows.',
      'Control fungus gnats, which carry pythium.'
    ],
    severity: 'high',
    stages: [],
    classifier: 'root_rot',
    guide: '/guide/media#media-hydro'
  },
  // climate
  {
    id: 'heat_stress',
    category: 'climate',
    name: 'Heat stress',
    aka: ['heat burn', 'too hot'],
    summary: 'Canopy temperatures above about 30 °C make top leaves taco, edges burn and buds foxtail.',
    areas: ['top-canopy', 'leaf-tips', 'buds'],
    symptoms: [
      'Top leaves curl up into tacos and point upward.',
      'Brown, crispy spots or edges on the leaves closest to the lamp.',
      'Wilting at the top during lights on, recovering at lights off.',
      'In flower: foxtails, loose buds and a weaker smell from evaporating terpenes.',
      'Stretchy growth in veg.'
    ],
    confirm: [
      'Measure temperature at canopy height with the lights on, not at the tent wall.',
      'Point an IR thermometer at the top leaves; leaf surface over about 30 °C is too hot.',
      'Measure RH and compute VPD; heat usually pushes VPD high too.',
      'Check whether symptoms are worst at the end of the light period.',
      'Compare lower canopy: if it looks fine, heat is concentrated under the lamp.'
    ],
    lookalikes: [
      { id: 'light_burn', howToTell: 'Light burn bleaches tops white at normal temperatures; heat stress shows on the thermometer.' },
      { id: 'taco_leaves', howToTell: 'Tacoing is one sign of heat stress; if the temperature is fine, light or dry air is the cause.' },
      { id: 'k_def', howToTell: 'Potassium deficiency browns edges on older leaves first; heat damage is at the top near the lamp.' },
      { id: 'nutrient_burn', howToTell: 'Nutrient burn starts at the tips of leaves at all heights; heat damage follows the hottest spot.' },
      { id: 'low_humidity', howToTell: 'Dry air crisps edges in a tent at normal temperature; often both happen together.' }
    ],
    causes: [
      'Lamp too close or too strong for the tent\'s exhaust capacity.',
      'Exhaust fan undersized or turned down.',
      'Hot room or summer heat waves.',
      'Poor air movement inside the canopy.'
    ],
    fix: [
      'Bring canopy temperature to 24–28 °C with lights on.',
      'Raise or dim the lamp until temperatures drop.',
      'Increase exhaust speed and make sure there is a free intake.',
      'Add an oscillating fan above the canopy.',
      'Move lights-on to the night when the room is cooler.',
      'Water in the cooler part of the day and keep pots shaded from direct heat.'
    ],
    prevent: [
      'Use a min/max thermometer at canopy height and check it daily.',
      'Size the exhaust fan for the tent volume plus filter and duct losses.',
      'Plan summer grows with lights on at night or a cooler room.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    guide: '/guide/problems#problems-burn-lockout'
  },
  {
    id: 'cold_stress',
    category: 'climate',
    name: 'Cold stress',
    aka: ['too cold', 'cold nights'],
    summary: 'Cold temperatures, usually at night, slow growth and turn stems and leaves purple.',
    areas: ['whole-plant', 'stems'],
    symptoms: [
      'Purple or red stems and leaf stalks on a strain that is not meant to purple.',
      'Purple or dark leaves, often on the side facing a cold wall or window.',
      'Very slow growth and slow drinking, so pots stay wet.',
      'Droopy leaves in the morning that perk up as it warms.',
      'Phosphorus-like signs because cold roots take up nutrients poorly.'
    ],
    confirm: [
      'Use a min/max thermometer: night temperatures under about 15 °C cause it, under 10 °C cause damage.',
      'Check the day-night difference; more than about 10 °C is too big.',
      'Check root zone temperature; cold floors chill pots.',
      'Compare with the breeder\'s description: some strains purple by genetics in late flower.',
      'Warm the tent at night for a week and watch whether new growth stays green.'
    ],
    lookalikes: [
      { id: 'p_def', howToTell: 'Phosphorus deficiency gives dark purple blotches with brown dead patches on older leaves at normal temperatures.' },
      { id: 'overwatering', howToTell: 'Cold plants drink slowly so they look overwatered; fix the temperature first, then watering.' },
      { id: 'mg_def', howToTell: 'Magnesium deficiency yellows between veins on middle leaves rather than turning stems purple.' }
    ],
    causes: [
      'Unheated room, garage or outdoor nights in autumn.',
      'Exhaust fan pulling cold air in during lights off.',
      'Pots standing on a cold concrete floor.',
      'Cold water used for watering.'
    ],
    fix: [
      'Keep nights at 18–22 °C and no more than 5–10 °C below day temperature.',
      'Slow the exhaust fan at lights off.',
      'Put pots on a board, foam or a stand off the floor.',
      'Water with room temperature water.',
      'Use a small heater with a thermostat if needed.'
    ],
    prevent: [
      'Check the night minimum before starting a grow in a cold room.',
      'Use a fan controller with separate day and night settings.',
      'Outdoors, plan harvest before the first frosts.'
    ],
    severity: 'low',
    stages: ['vegetative', 'flowering'],
    guide: '/guide/environment#environment-climate'
  },
  {
    id: 'high_humidity',
    category: 'climate',
    name: 'High humidity',
    aka: ['low VPD', 'humid tent'],
    summary: 'Humid air slows transpiration and invites mould, especially in dense flowering buds.',
    areas: ['whole-plant', 'buds'],
    symptoms: [
      'Condensation on tent walls or leaves at lights off.',
      'Slow growth and slow drinking; pots stay wet longer.',
      'Droplets on leaf tips in the morning (guttation).',
      'Powdery mildew spots or brown, mushy patches in buds.',
      'Musty smell in the tent.'
    ],
    confirm: [
      'Measure RH at canopy height: over about 70 % in veg or 55 % in flower is high.',
      'Compute VPD from leaf temperature and RH; under about 0.8 kPa is too low for most stages.',
      'Check RH right after lights off, when it usually spikes.',
      'Look inside the densest colas for grey fuzz or brown leaves.'
    ],
    lookalikes: [
      { id: 'overwatering', howToTell: 'Overwatering droops the plant in a wet pot; high humidity gives normal droop-free leaves but slow growth and mould risk.' },
      { id: 'powdery_mildew', howToTell: 'Powdery mildew is a result of humid, stagnant air; the white powder confirms it.' },
      { id: 'botrytis', howToTell: 'Bud rot is the worst outcome of high RH in flower; look for grey or brown tissue inside buds.' }
    ],
    causes: [
      'Weak or no exhaust ventilation.',
      'Many plants or wet pots in a small space.',
      'Humid room or rainy season air.',
      'Temperature drop at lights off.'
    ],
    fix: [
      'Raise exhaust speed and keep fans moving air through the canopy.',
      'Run a dehumidifier in the room or tent in flower.',
      'Defoliate dense areas to open up airflow.',
      'Avoid watering right before lights off.',
      'Keep the night temperature drop small to avoid condensation.'
    ],
    prevent: [
      'Target RH by stage: seedlings 65–75 %, veg 55–70 %, flower 40–55 %, late flower 40–50 %.',
      'Plan for a dehumidifier before flower, not after mould appears.',
      'Keep spacing and leaf density in check.'
    ],
    severity: 'medium',
    stages: ['flowering'],
    guide: '/guide/environment#environment-climate'
  },
  {
    id: 'low_humidity',
    category: 'climate',
    name: 'Low humidity',
    aka: ['high VPD', 'dry air'],
    summary: 'Dry air pulls water out of leaves faster than roots can supply it, crisping edges and stressing the plant.',
    areas: ['leaf-tips', 'top-canopy', 'whole-plant'],
    symptoms: [
      'Crispy, dry leaf edges and tips without yellowing behind them.',
      'Leaves taco upward and look dull.',
      'Plants drink much more and pots dry fast.',
      'Seedlings and clones wilt or grow very slowly.',
      'Nutrient burn shows at feed levels that were fine before.'
    ],
    confirm: [
      'Measure RH at canopy height: under about 40 % is dry for most stages, under 60 % is dry for seedlings and clones.',
      'Compute VPD; above about 1.4 kPa in veg or 1.6 kPa in flower is high.',
      'Check how fast pots dry compared with before.',
      'Check whether damage is spread over the plant rather than only under the lamp.'
    ],
    lookalikes: [
      { id: 'nutrient_burn', howToTell: 'Nutrient burn has yellow tips turning brown; dry air gives crispy edges with green tissue right behind them, and often both together.' },
      { id: 'heat_stress', howToTell: 'Heat stress shows a high temperature reading; dry air causes the same curl at normal temperatures.' },
      { id: 'underwatering', howToTell: 'Underwatering wilts the whole plant in a dry pot; low humidity crisps edges even when watering keeps up.' },
      { id: 'spider_mites', howToTell: 'Spider mites thrive in dry air; check under leaves for tiny specks and webbing.' }
    ],
    causes: [
      'Winter heating or dry climate.',
      'Exhaust pulling in dry room air too fast.',
      'High temperature, which raises VPD further.',
      'Small plants in a large tent that release little moisture.'
    ],
    fix: [
      'Add a humidifier with a hygrostat, or hang wet towels as a stopgap.',
      'Slow the exhaust as far as temperature allows.',
      'Lower temperature a little to bring VPD down.',
      'Use a humidity dome for seedlings and clones.',
      'Dial feed strength down slightly while VPD is high.'
    ],
    prevent: [
      'Track VPD daily, not just RH.',
      'Plan for a humidifier in winter.',
      'Keep seedlings and clones under a dome until roots establish.'
    ],
    severity: 'low',
    stages: ['seedling', 'vegetative'],
    guide: '/guide/environment#environment-climate'
  },
  {
    id: 'wind_burn',
    category: 'climate',
    name: 'Wind burn',
    aka: ['fan burn', 'fan damage'],
    summary: 'A fan blowing straight at the plant dries and shreds the leaves in its path.',
    areas: ['top-canopy', 'leaf-tips'],
    symptoms: [
      'Leaves near the fan curl down into claws or twist.',
      'Shredded, torn, dry or crispy edges on leaves in the fan\'s path.',
      'Damage is one-sided, facing the fan.',
      'Leaves constantly whipping rather than gently fluttering.'
    ],
    confirm: [
      'Check whether damage is only on the side and height where the fan points.',
      'Look at leaves away from the fan: they should look normal.',
      'Hold your hand where the damaged leaves are; a strong steady blast confirms it.',
      'Move the fan for a week and see whether new leaves grow normally.'
    ],
    lookalikes: [
      { id: 'n_toxicity', howToTell: 'Nitrogen toxicity claws dark green leaves all over the plant, not just near the fan.' },
      { id: 'low_humidity', howToTell: 'Dry air crisps edges evenly across the plant; wind burn is one-sided.' },
      { id: 'russet_broad_mites', howToTell: 'Mites twist and glaze new growth anywhere; wind burn follows the airflow.' },
      { id: 'heat_stress', howToTell: 'Heat damage is under the lamp; wind damage is in the fan\'s line.' }
    ],
    causes: [
      'Clip fan aimed directly at the plant at close range.',
      'Fan set too high for small plants.',
      'Plants grown into the fan as they got taller.'
    ],
    fix: [
      'Aim fans across or above the canopy, not straight at leaves.',
      'Lower the speed or move the fan further away.',
      'Use an oscillating fan so no leaf gets a constant blast.',
      'Remove badly shredded leaves only if they are dead.'
    ],
    prevent: [
      'Aim for leaves that gently flutter, not whip.',
      'Re-check fan position as plants grow.'
    ],
    severity: 'low',
    stages: ['seedling', 'vegetative'],
    guide: '/guide/environment#environment-tent'
  },
  // plant
  {
    id: 'hermaphrodite',
    category: 'plant',
    name: 'Hermaphrodite (hermie)',
    aka: ['nanners', 'bananas', 'hermie'],
    summary: 'A female plant grows male flowers that can pollinate the buds and fill them with seeds.',
    areas: ['buds'],
    symptoms: [
      'Yellow-green banana-shaped anthers (nanners) poking out of buds, usually late in flower.',
      'Small round pods on stalks at nodes, like a male plant, alongside female pistils.',
      'Pale dust (pollen) on leaves below the flowers.',
      'Seeds forming in buds a few weeks after pollination.'
    ],
    confirm: [
      'Use a loupe: bananas are bare, pointed and pale; pistils are white hairs.',
      'Check every node: male pods hang on short stalks, calyxes hold pistils.',
      'Look for opened pods or pollen dust on leaves below.',
      'Review stress history: light leaks, heat, bad pruning or a missed harvest.'
    ],
    lookalikes: [
      { id: 'light_leak_stress', howToTell: 'Light leaks are a common trigger; check the dark tent before blaming genetics.' },
      { id: 'foxtailing', howToTell: 'Foxtails are spires of calyxes with pistils, not bare banana anthers.' }
    ],
    causes: [
      'Genetics: unstable strains or plants bred from hermies.',
      'Light leaks or an irregular dark period in flower.',
      'Heat stress, especially in flower.',
      'Heavy pruning or damage late in flower.',
      'Leaving plants far past ripeness, which can trigger late bananas as a last try to seed.'
    ],
    fix: [
      'Pick off bananas with tweezers; mist the spot with water first so pollen does not fly.',
      'Check the plant every 2–3 days from now on.',
      'If there are many male pods, remove the plant from the tent to protect others.',
      'Late in flower with only a few bananas, harvest early instead of risking seeds.',
      'Fix the cause: light leaks, heat or schedule problems.'
    ],
    prevent: [
      'Buy seeds from breeders that test for stability.',
      'Keep the dark period truly dark and the timer reliable.',
      'Avoid high stress training after week 2–3 of flower.',
      'Inspect buds weekly from week 3 of flower.'
    ],
    severity: 'high',
    stages: ['flowering'],
    guide: '/guide/problems#problems-hermies'
  },
  {
    id: 'transplant_shock',
    category: 'plant',
    name: 'Transplant shock',
    summary: 'Root damage or a sudden change after moving to a new pot causes droop and a few days of stalled growth.',
    areas: ['whole-plant'],
    symptoms: [
      'Drooping or wilting within a day of transplanting.',
      'Growth stops for several days.',
      'Lower leaves may yellow.',
      'Slight pale tint on new growth.'
    ],
    confirm: [
      'Check whether symptoms started right after the move.',
      'Compare the new medium: different pH, hotter soil mix or a big pot kept soaking wet.',
      'Check that new growth continues within 3–7 days.',
      'If roots were torn or the root ball broke, expect a longer recovery.'
    ],
    lookalikes: [
      { id: 'overwatering', howToTell: 'A big new pot soaked fully can stay wet for days, giving overwatering droop on top of shock.' },
      { id: 'nutrient_burn', howToTell: 'Hot soil mixes burn leaf tips; shock droops without tip burn.' },
      { id: 'root_rot', howToTell: 'Shock clears in a week; ongoing wilting with smelly roots is rot.' }
    ],
    causes: [
      'Root ball broken or roots torn when removing the plant.',
      'Bare roots exposed to light or air for too long.',
      'Big change in medium, pH or feed strength.',
      'Overwatering the new pot.',
      'Moving to strong light or outdoors at the same time.'
    ],
    fix: [
      'Lower light intensity a little for a few days.',
      'Water lightly around the root ball only, not the whole pot.',
      'Keep humidity a bit higher to reduce water loss.',
      'Do not feed heavily or train until new growth starts.'
    ],
    prevent: [
      'Water a day before so the root ball holds together.',
      'Transplant when roots reach the pot edges but before they circle.',
      'Prepare the hole in the new pot to the size of the root ball.',
      'Transplant at lights off so the plant has hours to settle.',
      'Do not change several things on the same day.'
    ],
    severity: 'low',
    stages: ['seedling', 'vegetative'],
    guide: '/guide/vegetative#vegetative-transplanting'
  },
  {
    id: 'foxtailing',
    category: 'plant',
    name: 'Foxtailing',
    aka: ['foxtails', 'spires'],
    summary: 'Buds stack new calyx towers on top of each other, from heat or light stress or from genetics.',
    areas: ['buds', 'top-canopy'],
    symptoms: [
      'Thin spires of new calyxes with white pistils growing out of mature buds.',
      'Buds look stretched and spiky rather than dense.',
      'Stress foxtails appear on the top colas under the lamp.',
      'Genetic foxtails appear evenly across the plant.'
    ],
    confirm: [
      'Check whether only the top colas closest to the lamp foxtail; that points to stress.',
      'Measure canopy temperature and PPFD at the foxtailing tops.',
      'Look at the rest of the plant: even foxtailing in a normal climate points to genetics.',
      'Check the strain\'s description; many sativa-leaning strains foxtail by nature.',
      'Look for bananas while you are close.'
    ],
    lookalikes: [
      { id: 'hermaphrodite', howToTell: 'Foxtails have pistils; bananas are bare, pale and pointed.' },
      { id: 'light_burn', howToTell: 'Light burn bleaches the same top buds white; it often comes with foxtails.' },
      { id: 'heat_stress', howToTell: 'Heat stress foxtails plus tacoing top leaves and a hot reading.' }
    ],
    causes: [
      'Heat at the canopy in flower.',
      'Too much light intensity at the tops.',
      'Strain genetics, mostly sativa-leaning.',
      'Late in flower, some strains foxtail as a ripening trait.'
    ],
    fix: [
      'Lower canopy temperature to 24–27 °C in flower.',
      'Raise or dim the lamp if PPFD at the tops is high.',
      'Genetic foxtails need no fix; they do not hurt quality.'
    ],
    prevent: [
      'Keep the canopy level and below the hotspot.',
      'Control heat from week 3 of flower on.',
      'Read strain notes before the grow to know what to expect.'
    ],
    severity: 'low',
    stages: ['flowering'],
    guide: '/guide/problems#problems-burn-lockout'
  },
  {
    id: 'yellowing_wilting',
    category: 'plant',
    name: 'Yellowing or wilting, cause unclear',
    aka: ['yellow leaves', 'droopy plant', 'unhealthy plant'],
    summary: 'The plant is yellowing or drooping and the cause is not clear yet; narrow it down step by step.',
    areas: ['whole-plant', 'old-leaves', 'new-leaves'],
    symptoms: [
      'Leaves turning yellow, pale or patchy.',
      'Drooping or wilting leaves.',
      'Slow or stalled growth.',
      'Brown spots or crispy edges along with the yellowing.'
    ],
    confirm: [
      'Note where it starts: old lower leaves point to mobile nutrients (N, P, K, Mg); new top growth points to Ca, Fe or lockout.',
      'Lift the pot: heavy and droopy is overwatering, light and limp is underwatering.',
      'Measure input and runoff pH and EC; out of range explains most mixed deficiencies.',
      'Measure canopy temperature and RH and compute VPD.',
      'Check only the top canopy versus the whole plant to separate light or heat from root problems.',
      'Look under leaves with a loupe for mites, eggs and webbing.',
      'Check the roots: white is healthy, brown and smelly is rot.',
      'In late flower, gradual yellowing from the bottom is normal fade.'
    ],
    lookalikes: [
      { id: 'n_def', howToTell: 'Even yellowing that starts on the oldest leaves and moves up is usually nitrogen.' },
      { id: 'mg_def', howToTell: 'Yellow between green veins on middle and older leaves points to magnesium.' },
      { id: 'overwatering', howToTell: 'Firm droopy leaves in a heavy pot point to overwatering.' },
      { id: 'underwatering', howToTell: 'Limp leaves in a light pot that recover after watering point to underwatering.' },
      { id: 'ph_lockout', howToTell: 'Several deficiencies at once with a pH out of range point to lockout.' },
      { id: 'root_rot', howToTell: 'Wilting in a wet pot with brown roots points to root rot.' },
      { id: 'light_burn', howToTell: 'Yellow-white tops only under the lamp point to light burn.' },
      { id: 'spider_mites', howToTell: 'Fine yellow speckles with specks under leaves point to mites.' }
    ],
    causes: [
      'Watering problems, the most common cause by far.',
      'pH out of range causing lockout.',
      'Nutrient deficiency or excess.',
      'Light, heat or humidity outside the plant\'s range.',
      'Root problems from rot, root-bound pots or pests.',
      'Normal senescence late in flower.'
    ],
    fix: [
      'Fix one thing at a time and watch new growth for 3–5 days.',
      'Start with watering and pH, since they cause most problems.',
      'Log measurements so you can compare before and after.',
      'Once the pattern is clear, open the matching problem in this atlas.'
    ],
    prevent: [
      'Check pot weight, pH and EC as a routine.',
      'Log temperature and RH daily.',
      'Inspect plants top and underside weekly.'
    ],
    severity: 'medium',
    stages: [],
    classifier: 'yellowing_wilting',
    guide: '/guide/problems#problems-diagnose'
  }
]
