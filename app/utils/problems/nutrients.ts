import type { Problem } from './types'

const DEFICIENCIES = '/guide/problems#problems-deficiencies'
const CALMAG = '/guide/nutrition#nutrition-calmag'

export const NUTRIENT_PROBLEMS: Problem[] = [
  {
    id: 'n_def',
    category: 'nutrient',
    name: 'Nitrogen deficiency',
    aka: ['N deficiency', 'hungry plant'],
    summary: 'Old leaves fade to pale yellow from the bottom up while new growth stays green.',
    areas: ['old-leaves', 'whole-plant'],
    symptoms: [
      'Lowest fan leaves turn evenly pale green, then yellow, veins included.',
      'Yellowing often starts at the leaf tip and spreads back over the whole leaf.',
      'Affected leaves go soft, then drop off with a light tug.',
      'It climbs the plant from the bottom while the top stays green.',
      'Overall growth slows and the plant looks lighter green than it should.',
      'Leaf stems (petioles) can turn red or purple on the underside.'
    ],
    confirm: [
      'Check where it started: N is mobile, so it always begins on the oldest, lowest leaves.',
      'Look at the veins: in N deficiency they yellow along with the leaf; green veins point to magnesium.',
      'Measure runoff pH: soil should sit at 6.2–7.0, coco and hydro at 5.6–6.2.',
      'Measure runoff EC: a very low reading means the pot is simply hungry.',
      'Look at feeding history: plain water for weeks, a small pot of tired soil, or bloom food in early veg.',
      'In the last 2–3 weeks of flower, a yellowing fade of the fan leaves is normal. Do not treat it.'
    ],
    lookalikes: [
      { id: 'mg_def', howToTell: 'Magnesium yellows between the veins and keeps the veins green; nitrogen yellows the whole leaf.' },
      { id: 's_def', howToTell: 'Sulfur gives the same even pale yellow, but on the newest leaves at the top.' },
      { id: 'mo_def', howToTell: 'Molybdenum also hits older leaves but adds orange or reddish margins and cupping.' },
      { id: 'overwatering', howToTell: 'Soggy roots cause lower-leaf yellowing too, but the pot stays heavy and leaves droop firm and swollen.' },
      { id: 'ph_lockout', howToTell: 'If runoff pH is far off or other deficiencies show at the same time, it is lockout, not missing N.' }
    ],
    causes: [
      'Feed too weak, or plain water for too long.',
      'Small or old soil that has run out of food, usually 3–5 weeks after potting.',
      'Switching to a low-N bloom feed too early in the stretch.',
      'Root zone pH far out of range, or cold, waterlogged roots that cannot take up food.'
    ],
    fix: [
      'Check and correct pH first.',
      'Feed a veg (grow) nutrient, or raise the dose by 20–25 % and watch the new growth.',
      'In soil, a top dress or transplant into fresh soil fixes an exhausted pot.',
      'Yellow leaves will not green up again. Recovery shows as no new yellowing within 5–7 days.',
      'Pull fully yellow leaves only once they come away easily.'
    ],
    prevent: [
      'Raise feed strength as the plant grows; a big plant in veg eats a lot of N.',
      'Keep some N in the feed through the first half of flower.',
      'Plan soil top dressing or a transplant before the pot runs out.',
      'Measure runoff EC now and then to see when the pot is getting lean.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'n_def',
    guide: DEFICIENCIES
  },
  {
    id: 'p_def',
    category: 'nutrient',
    name: 'Phosphorus deficiency',
    aka: ['P deficiency'],
    summary: 'Older leaves turn dark and dull, then get bronze or brown blotches, with purple stems.',
    areas: ['old-leaves', 'stems'],
    symptoms: [
      'Older and middle leaves turn dark, dull or bluish green.',
      'Bronze, purple-brown or dead-looking blotches appear, often from the edges inwards.',
      'Blotches dry out and the leaf feels stiff and brittle.',
      'Leaf stems and main stems go red or purple.',
      'Growth stalls, and in flower the buds stay small.'
    ],
    confirm: [
      'Check where it started: P is mobile, so it shows on lower and middle leaves first.',
      'Measure runoff pH: P locks out in soil below about 6.0 or above 7.0, and in coco below 5.5 or well above 6.5.',
      'Measure root zone temperature: below about 15 °C the roots barely take up phosphorus.',
      'Check the feed: bloom phase on a grow-only feed is a common cause.',
      'Purple stems alone, with healthy green leaves, are usually genetics or cold nights, not P deficiency.'
    ],
    lookalikes: [
      { id: 'k_def', howToTell: 'Potassium burns yellow then brown along the margins, while P darkens the whole leaf first and blotches it.' },
      { id: 'septoria', howToTell: 'Septoria makes many small round spots with yellow halos, often with tiny dark dots inside, and spreads up the plant.' },
      { id: 'ca_def', howToTell: 'Calcium spots appear on new and middle leaves, not on the oldest ones.' },
      { id: 'ph_lockout', howToTell: 'Runoff pH outside the window plus symptoms of other elements means lockout.' }
    ],
    causes: [
      'pH out of range, especially too low in soil.',
      'Cold roots, from cold floors, cold water or cool nights.',
      'Too little bloom food once flower starts, when P demand jumps.',
      'Overwatering that starves the roots of oxygen.'
    ],
    fix: [
      'Correct pH to 6.3–6.8 in soil or 5.8–6.2 in coco and hydro.',
      'Warm the root zone: lift pots off cold floors and water at room temperature.',
      'Switch to a bloom feed with more P in flower, at the normal dose, not double.',
      'Damaged leaves will not recover. Judge progress by the new growth.'
    ],
    prevent: [
      'Keep root temperature around 18–24 °C.',
      'Change to a bloom feed from the end of the stretch.',
      'Check pH every feed and runoff pH weekly.'
    ],
    severity: 'medium',
    stages: ['flowering', 'vegetative'],
    classifier: 'leaf_necrosis',
    guide: DEFICIENCIES
  },
  {
    id: 'k_def',
    category: 'nutrient',
    name: 'Potassium deficiency',
    aka: ['K deficiency', 'potash deficiency'],
    summary: 'Tips and edges of older leaves yellow, then turn brown and crispy, mostly in flower.',
    areas: ['old-leaves', 'leaf-tips'],
    symptoms: [
      'Tips and margins of older and middle leaves turn yellow.',
      'The yellow edge turns brown and crispy, like it was scorched.',
      'Leaf edges can curl up while the centre of the leaf stays green.',
      'Rusty brown spots may appear near the edges.',
      'Stems get weak and stretchy, buds stay airy and light.'
    ],
    confirm: [
      'Check where it started: K is mobile, so older and middle leaves show it first.',
      'Look at the pattern: yellowing runs along the whole margin, not just the very tip.',
      'Measure runoff pH: K uptake drops in soil below 6.0 and in coco below 5.6.',
      'Test your tap water: high calcium or sodium competes with potassium.',
      'Look at feeding history: K demand peaks in mid and late flower.'
    ],
    lookalikes: [
      { id: 'nutrient_burn', howToTell: 'Burn starts right at the tips on dark green leaves after a stronger feed; K deficiency yellows the margins on pale leaves.' },
      { id: 'heat_stress', howToTell: 'Heat curls and crisps the leaves closest to the lamp, while K shows on older leaves lower down.' },
      { id: 'light_burn', howToTell: 'Light burn bleaches the top leaves under the lamp, not the edges of older leaves.' },
      { id: 'mg_def', howToTell: 'Magnesium yellows between the veins; potassium yellows from the edges inwards.' },
      { id: 'salt_buildup', howToTell: 'High runoff EC with crispy margins points to salt build-up locking out K, not a lack of it.' }
    ],
    causes: [
      'Too little bloom food in mid to late flower.',
      'pH too low, or high salt levels in the root zone.',
      'Hard water or too much cal-mag, with calcium and sodium crowding out potassium.'
    ],
    fix: [
      'Correct pH first.',
      'Use a bloom feed with enough K, or add a PK booster at the label minimum.',
      'If runoff EC is high, water through with weak, pH-corrected feed before adding more.',
      'Crispy edges stay. Watch for the burn to stop spreading.'
    ],
    prevent: [
      'Follow a bloom schedule that raises K through weeks 3–7 of flower.',
      'Do not overdo cal-mag on hard water.',
      'Check runoff EC and pH weekly in flower.'
    ],
    severity: 'medium',
    stages: ['flowering'],
    classifier: 'tip_burn',
    guide: DEFICIENCIES
  },
  {
    id: 'ca_def',
    category: 'nutrient',
    name: 'Calcium deficiency',
    aka: ['Ca deficiency'],
    summary: 'Rusty brown spots and crinkled, twisted new growth, very common in coco.',
    areas: ['new-leaves'],
    symptoms: [
      'Brown, rusty or bronze spots with yellow edges on new and middle leaves.',
      'Spots grow and merge into dead patches.',
      'New leaves come out crinkled, twisted or with hooked tips.',
      'Stems feel weak and hollow, and growth slows at the top.',
      'Roots, if you can see them, look short and brownish.'
    ],
    confirm: [
      'Check where it started: Ca is immobile, so new and middle growth show it first.',
      'Check your medium and water: coco and RO or soft water make it far more likely.',
      'Measure runoff pH: Ca locks out in coco below about 5.8 and in soil below 6.2.',
      'Look under the leaves: no webbing or moving dots rules out mites.',
      'Check transpiration: very high humidity or weak airflow slows calcium transport.'
    ],
    lookalikes: [
      { id: 'septoria', howToTell: 'Septoria starts on lower leaves and spreads upward; calcium spots start on new and middle leaves.' },
      { id: 'spider_mites', howToTell: 'Mites leave tiny pale stipples and fine webbing on the undersides, not larger rusty patches.' },
      { id: 'russet_broad_mites', howToTell: 'Broad mites twist and gloss the newest leaves with no rusty spots, and need a 60x loupe to see.' },
      { id: 'mg_def', howToTell: 'Magnesium yellows between the veins of older leaves first; calcium spots new growth.' },
      { id: 'p_def', howToTell: 'Phosphorus blotches older, darkened leaves and purples the stems.' }
    ],
    causes: [
      'Coco coir, which binds calcium unless it is buffered.',
      'RO, rain or very soft water with no added calcium.',
      'Low pH in the root zone.',
      'High light intensity raising demand, or high humidity slowing uptake.',
      'Too much potassium or ammonium competing with calcium.'
    ],
    fix: [
      'Add cal-mag to every feed, starting around 0.5 ml/L and adjusting to the label.',
      'With RO water, aim for about 0.3–0.4 EC of cal-mag before adding base nutrients.',
      'Raise coco pH toward 5.9–6.2 and soil pH toward 6.5.',
      'Improve airflow and keep VPD in range so the plant can transpire.',
      'Spotted leaves will not heal. Clean new growth means it is fixed.'
    ],
    prevent: [
      'Use buffered coco, or buffer it with cal-mag before planting.',
      'Always add cal-mag with RO or soft water.',
      'Let pH drift a little within the window instead of pinning it at the bottom.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'leaf_necrosis',
    guide: CALMAG
  },
  {
    id: 'mg_def',
    category: 'nutrient',
    name: 'Magnesium deficiency',
    aka: ['Mg deficiency'],
    summary: 'Yellowing between the veins of older leaves while the veins stay green.',
    areas: ['old-leaves'],
    symptoms: [
      'Older and middle leaves yellow between the veins; the veins stay green.',
      'The pattern looks like a green fishbone on a yellow leaf.',
      'Later the yellow areas get rusty brown spots and dry out.',
      'Leaf edges can curl up and the leaves drop early.',
      'Often shows up in weeks 3–6 of flower under strong light.'
    ],
    confirm: [
      'Check where it started: Mg is mobile, so lower and middle leaves show it first.',
      'Look at the veins: green veins with yellow tissue between them is the classic sign.',
      'Measure runoff pH: Mg locks out in soil below about 6.0 and in coco below 5.8.',
      'Check your water and feed: RO or soft water, or heavy PK boosters, make it likely.',
      'Late flower fade also yellows old leaves, but evenly and veins included.'
    ],
    lookalikes: [
      { id: 'fe_def', howToTell: 'Iron shows the same green-vein pattern but on the newest leaves at the top.' },
      { id: 'mn_def', howToTell: 'Manganese mottles new and middle leaves with small dead specks, not the oldest leaves.' },
      { id: 'n_def', howToTell: 'Nitrogen yellows the whole leaf, veins included.' },
      { id: 'k_def', howToTell: 'Potassium burns the edges first; magnesium yellows between the veins.' },
      { id: 'ph_lockout', howToTell: 'Low runoff pH with symptoms of calcium or phosphorus as well points to lockout.' }
    ],
    causes: [
      'Coco or RO water without enough added magnesium.',
      'pH too low.',
      'Too much potassium or calcium crowding out magnesium.',
      'High light raising demand in flower.'
    ],
    fix: [
      'Correct pH first.',
      'Add cal-mag, or Epsom salt (magnesium sulfate) at about 0.5–1 g/L in the feed.',
      'For fast results, a foliar spray of about 1 g/L Epsom salt in veg or early flower, lights off. Do not spray buds.',
      'Old leaves will not turn green again. New leaves should stay clean within 4–7 days.'
    ],
    prevent: [
      'Add cal-mag with RO or soft water and in coco.',
      'Do not overdo PK boosters.',
      'Watch the middle leaves closely from week 3 of flower.'
    ],
    severity: 'medium',
    stages: ['flowering', 'vegetative'],
    classifier: 'interveinal_chlorosis',
    guide: CALMAG
  },
  {
    id: 's_def',
    category: 'nutrient',
    name: 'Sulfur deficiency',
    aka: ['S deficiency', 'sulphur deficiency'],
    summary: 'New leaves turn evenly pale lime-yellow, veins included. Rare with a complete feed.',
    areas: ['new-leaves'],
    symptoms: [
      'The newest leaves turn evenly pale lime or yellow, veins included.',
      'Looks like nitrogen deficiency, but at the top of the plant.',
      'Leaf stems and stems may turn purple or red.',
      'Leaves stay small, and tips can brown and curl in later stages.',
      'Growth slows and buds develop poorly.'
    ],
    confirm: [
      'Check where it started: S moves poorly in the plant, so new growth shows it first.',
      'Look at the veins: they yellow along with the leaf, unlike iron or magnesium.',
      'Check the feed: very lean organic feeds or single-part salts with no sulfate.',
      'Measure runoff pH: sulfur uptake drops in strongly acidic or alkaline root zones.'
    ],
    lookalikes: [
      { id: 'n_def', howToTell: 'Nitrogen yellows the oldest leaves at the bottom; sulfur yellows the newest at the top.' },
      { id: 'fe_def', howToTell: 'Iron keeps sharp green veins on the yellow new leaves.' },
      { id: 'light_burn', howToTell: 'Light burn bleaches only the leaves closest to the lamp and fades lower down.' }
    ],
    causes: [
      'A feed that contains no sulfate.',
      'pH far out of range.',
      'Cold or waterlogged roots.'
    ],
    fix: [
      'Correct pH first.',
      'Add Epsom salt at about 0.5 g/L; it supplies sulfur as well as magnesium.',
      'Switch to a complete nutrient if you are using a single bottle without sulfate.'
    ],
    prevent: [
      'Use a complete base nutrient.',
      'Keep pH in the window for your medium.'
    ],
    severity: 'low',
    stages: ['vegetative', 'flowering'],
    classifier: 'new_leaf_chlorosis',
    guide: DEFICIENCIES
  },
  {
    id: 'fe_def',
    category: 'nutrient',
    name: 'Iron deficiency',
    aka: ['Fe deficiency', 'iron chlorosis'],
    summary: 'The newest leaves turn bright yellow with sharp green veins, almost always from high pH.',
    areas: ['new-leaves', 'top-canopy'],
    symptoms: [
      'The newest leaves at the tops turn bright yellow between the veins.',
      'Veins stay sharply green, giving a clear net pattern.',
      'In bad cases new leaves come out almost white.',
      'Older leaves below stay normal green.',
      'There are usually no brown spots at first.'
    ],
    confirm: [
      'Check where it started: Fe is immobile, so it begins at the growing tips.',
      'Measure runoff pH: iron locks out in soil above about 7.0 and in coco or hydro above 6.5.',
      'Check the water: hard, alkaline tap water slowly pushes pH up.',
      'Check watering: soggy, cold roots also block iron uptake.',
      'Look at feeding history: lots of extra phosphorus, zinc or manganese competes with iron.'
    ],
    lookalikes: [
      { id: 'mg_def', howToTell: 'Magnesium shows the same green veins, but on older and middle leaves.' },
      { id: 'mn_def', howToTell: 'Manganese is duller and mottled, with small dead specks and wider green bands along the veins.' },
      { id: 's_def', howToTell: 'Sulfur yellows the new leaves evenly, veins included.' },
      { id: 'zn_def', howToTell: 'Zinc also makes new leaves small, narrow and twisted with short gaps between nodes.' },
      { id: 'light_burn', howToTell: 'Light burn bleaches leaves closest to the lamp and the veins bleach too.' }
    ],
    causes: [
      'pH too high, by far the most common cause.',
      'Overwatering and cold roots.',
      'Excess phosphorus, manganese, zinc or copper.',
      'Old or non-chelated iron in the feed.'
    ],
    fix: [
      'Bring pH back into the window: 6.2–6.8 in soil, 5.7–6.0 in coco and hydro.',
      'Water through once with pH-corrected weak feed if runoff pH is high.',
      'Let the pot dry back properly between waterings.',
      'Chelated iron helps only if the feed really lacks it.',
      'New growth should come out green within about a week.'
    ],
    prevent: [
      'Measure pH every feed and calibrate the meter monthly.',
      'Know your tap water; alkaline water needs more pH down.',
      'Avoid soggy roots.'
    ],
    severity: 'medium',
    stages: ['seedling', 'vegetative', 'flowering'],
    classifier: 'new_leaf_chlorosis',
    guide: DEFICIENCIES
  },
  {
    id: 'zn_def',
    category: 'nutrient',
    name: 'Zinc deficiency',
    aka: ['Zn deficiency', 'little leaf'],
    summary: 'New leaves are small, narrow and twisted, with yellow between the veins and stacked nodes.',
    areas: ['new-leaves', 'top-canopy'],
    symptoms: [
      'New leaves come out small, narrow and wrinkled.',
      'Yellowing between the veins on the newest leaves, sometimes with brown spots.',
      'Leaf blades twist sideways, up to 90 degrees.',
      'Very short gaps between nodes, so the top looks bunched up.',
      'In flower, buds can twist and stall.'
    ],
    confirm: [
      'Check where it started: Zn is immobile, so the growing tips show it first.',
      'Measure runoff pH: zinc locks out above about 7.0 in soil and above 6.5 in coco.',
      'Look at the newest leaves with a 60x loupe to rule out broad mites.',
      'Check feeding history: heavy phosphorus boosters tie up zinc.'
    ],
    lookalikes: [
      { id: 'russet_broad_mites', howToTell: 'Broad mites make the newest leaves glossy, curled and stunted; a loupe shows the mites or their damage on the undersides.' },
      { id: 'fe_def', howToTell: 'Iron gives normally shaped yellow leaves with green veins; zinc makes them small and twisted.' },
      { id: 'mn_def', howToTell: 'Manganese mottles the leaves but keeps their shape.' },
      { id: 'b_def', howToTell: 'Boron makes new growth thick and brittle and kills the growing tip.' }
    ],
    causes: [
      'pH too high.',
      'Excess phosphorus.',
      'A feed without a full micronutrient mix.'
    ],
    fix: [
      'Correct pH first.',
      'Use a nutrient with a complete micro mix, or add one at the label dose.',
      'Cut back on PK boosters until new growth looks normal.'
    ],
    prevent: [
      'Use a complete base nutrient.',
      'Keep pH in the window.',
      'Use PK boosters at the label dose, not more.'
    ],
    severity: 'medium',
    stages: [],
    classifier: 'new_leaf_chlorosis',
    guide: DEFICIENCIES
  },
  {
    id: 'mn_def',
    category: 'nutrient',
    name: 'Manganese deficiency',
    aka: ['Mn deficiency'],
    summary: 'New and middle leaves go mottled yellow between the veins, then get small dead specks.',
    areas: ['new-leaves'],
    symptoms: [
      'Upper and middle leaves turn pale, mottled yellow between the veins.',
      'Veins keep a fairly wide green band, so the pattern is blurry, not sharp.',
      'Small brown or grey dead specks appear in the yellow areas.',
      'Spots can join into dead patches and the leaf may drop.',
      'Growth slows but leaf shape stays normal.'
    ],
    confirm: [
      'Check where it started: Mn is immobile, so new and middle leaves show it first.',
      'Measure runoff pH: manganese locks out in soil above about 7.0 and in coco above 6.5.',
      'Compare with iron: iron is brighter yellow with thin, sharp green veins.',
      'Look under the leaves for mites before blaming the feed.',
      'Check feeding history: lots of extra iron competes with manganese.'
    ],
    lookalikes: [
      { id: 'fe_def', howToTell: 'Iron is brighter, starts on the very newest leaves and shows thin, sharp green veins with no specks.' },
      { id: 'mg_def', howToTell: 'Magnesium starts on older leaves lower down.' },
      { id: 'zn_def', howToTell: 'Zinc makes new leaves small, narrow and twisted.' },
      { id: 'spider_mites', howToTell: 'Mites leave tiny pale dots all over the leaf and webbing on the underside.' },
      { id: 'septoria', howToTell: 'Septoria spots are round with yellow halos and start on lower leaves.' }
    ],
    causes: [
      'pH too high.',
      'Excess iron.',
      'A feed without enough micronutrients.'
    ],
    fix: [
      'Correct pH first.',
      'Use a complete micro mix at the label dose.',
      'Stop extra iron supplements if you were adding them.'
    ],
    prevent: [
      'Keep pH in the window.',
      'Use a complete base nutrient and skip single-element supplements you do not need.'
    ],
    severity: 'low',
    stages: [],
    classifier: 'interveinal_chlorosis',
    guide: DEFICIENCIES
  },
  {
    id: 'b_def',
    category: 'nutrient',
    name: 'Boron deficiency',
    aka: ['B deficiency'],
    summary: 'Growing tips go thick, brittle and twisted, and can die off, leaving bushy side shoots.',
    areas: ['new-leaves', 'top-canopy', 'roots'],
    symptoms: [
      'New leaves come out thick, brittle and twisted, sometimes with yellow or brown spots.',
      'The growing tip stops, browns and can die.',
      'Side shoots then sprout below it, giving a bushy, stunted top.',
      'Stems can crack or turn hollow and brittle.',
      'Root tips are short, thick and brown.'
    ],
    confirm: [
      'Check where it started: boron is immobile, so the growing tips show it first.',
      'Check humidity and watering: very dry air or letting the pot dry out hard slows boron transport.',
      'Measure runoff pH: boron is less available above about 7.0.',
      'Look at the newest leaves with a 60x loupe to rule out broad mites.',
      'Check the water: pure RO water with a lean feed can lack boron.'
    ],
    lookalikes: [
      { id: 'russet_broad_mites', howToTell: 'Broad mites cause glossy, curled new growth and leave tiny mites and eggs visible with a loupe.' },
      { id: 'ca_def', howToTell: 'Calcium spots new leaves with rusty patches but rarely kills the growing tip.' },
      { id: 'zn_def', howToTell: 'Zinc gives small, narrow, twisted leaves but the tip keeps growing.' },
      { id: 'heat_stress', howToTell: 'Heat curls leaves into tacos and crisps the tops near the lamp; it does not kill the growing points.' }
    ],
    causes: [
      'Low humidity or drought, which slows boron transport.',
      'pH too high.',
      'RO water with a lean feed missing micronutrients.'
    ],
    fix: [
      'Correct pH and keep watering even.',
      'Keep humidity in range for the stage.',
      'Use a complete micro mix. Boron turns toxic at low levels, so do not dose straight boric acid by guesswork.'
    ],
    prevent: [
      'Use a complete base nutrient.',
      'Avoid letting pots dry out hard.',
      'Keep VPD in range.'
    ],
    severity: 'medium',
    stages: [],
    classifier: 'deformed_growth',
    guide: DEFICIENCIES
  },
  {
    id: 'cu_def',
    category: 'nutrient',
    name: 'Copper deficiency',
    aka: ['Cu deficiency'],
    summary: 'Rare. New leaves go dark blue-green and limp, with curled edges and dying tips.',
    areas: ['new-leaves', 'top-canopy'],
    symptoms: [
      'New leaves turn dark, bluish green and look shiny or metallic.',
      'Leaves droop and look limp even when the pot is wet.',
      'Leaf edges curl and tips turn brown and die.',
      'New leaves may twist or come out deformed.',
      'In flower, buds may fail to mature.'
    ],
    confirm: [
      'Check where it started: copper is immobile, so new growth shows it first.',
      'Check the pot weight: limp leaves in a correctly watered pot rule out water problems.',
      'Measure runoff pH: copper locks out above about 7.0 in soil and 6.5 in coco.',
      'Check feeding history: extra zinc, iron or phosphorus compete with copper.',
      'It is rare with any complete nutrient, so rule out everything else first.'
    ],
    lookalikes: [
      { id: 'overwatering', howToTell: 'Overwatered plants droop all over and the pot stays heavy; copper droop sits in new growth only.' },
      { id: 'underwatering', howToTell: 'Underwatered plants perk up within hours of watering; copper droop does not.' },
      { id: 'heat_stress', howToTell: 'Heat damage follows the lamp and the temperature; copper symptoms do not.' },
      { id: 'p_def', howToTell: 'Phosphorus darkens older leaves and adds bronze blotches.' }
    ],
    causes: [
      'pH too high.',
      'Excess zinc, iron or phosphorus.',
      'A feed without micronutrients.'
    ],
    fix: [
      'Correct pH first.',
      'Use a complete micro mix at the label dose.',
      'Do not add copper on its own; it turns toxic easily.'
    ],
    prevent: [
      'Use a complete base nutrient.',
      'Keep pH in the window.'
    ],
    severity: 'low',
    stages: [],
    classifier: 'deformed_growth',
    guide: DEFICIENCIES
  },
  {
    id: 'mo_def',
    category: 'nutrient',
    name: 'Molybdenum deficiency',
    aka: ['Mo deficiency'],
    summary: 'Rare. Middle and older leaves yellow between the veins with orange or reddish margins.',
    areas: ['old-leaves'],
    symptoms: [
      'Middle and older leaves yellow between the veins.',
      'Leaf margins turn orange, pink or red.',
      'Leaves cup or twist, and edges can scorch.',
      'The plant can look nitrogen-starved even when well fed.'
    ],
    confirm: [
      'Measure runoff pH: unlike most micros, molybdenum gets scarce at LOW pH, below about 5.5.',
      'Check the colour: orange or red margins set it apart from plain nitrogen or magnesium yellowing.',
      'It is rare with any complete nutrient, so rule out N and Mg first.'
    ],
    lookalikes: [
      { id: 'n_def', howToTell: 'Nitrogen yellows the whole leaf evenly with no coloured margins.' },
      { id: 'mg_def', howToTell: 'Magnesium yellows between the veins too, but without orange or red edges or cupping.' },
      { id: 'p_def', howToTell: 'Phosphorus darkens the leaf first and purples the stems.' }
    ],
    causes: [
      'pH too low, mostly in coco or hydro.',
      'A feed without micronutrients.'
    ],
    fix: [
      'Raise pH back into the window: 5.8–6.2 in coco and hydro, 6.3–6.8 in soil.',
      'Use a complete micro mix.'
    ],
    prevent: [
      'Do not run coco or hydro below 5.6 for long.',
      'Use a complete base nutrient.'
    ],
    severity: 'low',
    stages: [],
    guide: DEFICIENCIES
  },
  {
    id: 'nutrient_burn',
    category: 'nutrient',
    name: 'Nutrient burn',
    aka: ['overfeeding', 'tip burn', 'nute burn'],
    summary: 'Leaf tips turn yellow, then brown and crispy, after feeding too strong.',
    areas: ['leaf-tips', 'top-canopy'],
    symptoms: [
      'The very tips of the leaves turn yellow, then brown and crispy.',
      'Burnt tips often curl or twist slightly.',
      'With continued overfeeding the burn creeps inwards along the edges.',
      'Leaves above the burn are usually dark green.',
      'Sugar leaves around buds get brown tips in flower.'
    ],
    confirm: [
      'Look at the timing: it usually shows a few days after raising the dose or adding a booster.',
      'Measure runoff EC: much higher than the input EC means salts are piling up in the pot.',
      'Check the input EC against your stage; seedlings and young clones burn easily.',
      'Check that it is the tips first, on otherwise healthy green leaves.'
    ],
    lookalikes: [
      { id: 'k_def', howToTell: 'Potassium yellows the whole margin on paler, older leaves; burn starts at the tips on dark green leaves.' },
      { id: 'n_toxicity', howToTell: 'Nitrogen excess gives very dark leaves whose tips hook down, often before any tips burn.' },
      { id: 'salt_buildup', howToTell: 'Salt build-up is the slow version: runoff EC creeping up over weeks with a steady feed.' },
      { id: 'light_burn', howToTell: 'Light burn bleaches the top leaves yellow-white near the lamp rather than browning the tips.' },
      { id: 'heat_stress', howToTell: 'Heat curls leaf edges up into tacos and follows high temperatures.' },
      { id: 'underwatering', howToTell: 'Letting a fed pot dry out hard concentrates the salts; check how dry the pot got.' }
    ],
    causes: [
      'Feeding stronger than the plant can use, often from following the full label dose.',
      'Adding boosters and additives on top of a full base feed.',
      'Feeding hot soil that already contains plenty of food.',
      'Letting the medium dry out hard, which concentrates the salts.'
    ],
    fix: [
      'Cut the feed strength by 20–30 %.',
      'In soil, give one or two plain pH-corrected waterings before feeding again.',
      'In coco, keep feeding but at the lower strength, with 10–20 % runoff.',
      'Only flush if runoff EC is far higher than input; then water through until it drops close to the input EC.',
      'Burnt tips stay burnt. Watch the new leaves.'
    ],
    prevent: [
      'Start at half the label dose and raise it only while the leaves stay clean.',
      'A tiny bit of tip burn means you are at the limit; back off slightly.',
      'Measure input and runoff EC.',
      'Skip extra additives unless something is actually missing.'
    ],
    severity: 'medium',
    stages: ['seedling', 'vegetative', 'flowering'],
    classifier: 'tip_burn',
    guide: '/guide/nutrition#nutrition-overfeeding'
  },
  {
    id: 'n_toxicity',
    category: 'nutrient',
    name: 'Nitrogen toxicity',
    aka: ['the claw', 'clawing', 'too much nitrogen'],
    summary: 'Very dark green, glossy leaves whose tips hook down like claws.',
    areas: ['whole-plant', 'leaf-tips'],
    symptoms: [
      'Leaves turn very dark, almost blue-green and glossy.',
      'Leaf tips bend down sharply into a claw.',
      'The whole leaf can arc downward but stays firm.',
      'Stems grow soft and stretched, and buds develop slowly.',
      'If it continues, leaves yellow and tips burn as other nutrients lock out.'
    ],
    confirm: [
      'Look at the colour: deep dark green is the key sign; healthy leaves are a medium green.',
      'Check the pot: if it is not heavy and soggy, it is not overwatering.',
      'Look at feeding history: a high-N veg feed carried into flower, or fresh hot soil.',
      'Measure runoff EC: a high reading supports overfeeding.'
    ],
    lookalikes: [
      { id: 'overwatering', howToTell: 'Overwatered leaves droop and puff up while the pot is heavy, and recover as it dries; clawing stays.' },
      { id: 'taco_leaves', howToTell: 'Taco leaves fold their edges up; the claw bends the tips down.' },
      { id: 'heat_stress', howToTell: 'Heat curls edges up near the lamp and does not darken the leaves.' },
      { id: 'nutrient_burn', howToTell: 'Burn browns the tips; in N toxicity the tips hook down while they are still green.' }
    ],
    causes: [
      'Too much nitrogen in the feed, often a veg feed in flower.',
      'Hot soil plus a full bottled feed.',
      'Ammonium-heavy feeds.',
      'Hot roots or overwatering that make it worse.'
    ],
    fix: [
      'Lower feed strength and switch to a lower-N formula.',
      'In soil, water with plain pH-corrected water until the claw stops spreading.',
      'In coco, keep feeding, but with a weaker, low-N solution and good runoff.',
      'Clawed leaves stay dark; new growth should flatten out within a week.'
    ],
    prevent: [
      'Move to a bloom formula once the stretch ends.',
      'Do not add bottled N to fresh amended soil.',
      'Raise feed strength slowly and watch leaf colour.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'n_toxicity',
    guide: '/guide/nutrition#nutrition-overfeeding'
  },
  {
    id: 'ph_lockout',
    category: 'nutrient',
    name: 'pH lockout',
    aka: ['nutrient lockout', 'pH out of range'],
    summary: 'Roots cannot take up food because the root zone pH is off, so several deficiencies show at once.',
    areas: ['whole-plant', 'roots', 'soil'],
    symptoms: [
      'Several deficiency patterns at once, on both old and new leaves.',
      'Symptoms get worse the more you feed.',
      'Growth stalls even though the feed is strong.',
      'Leaves may look dull, spotted and burnt at the tips at the same time.'
    ],
    confirm: [
      'Measure runoff pH, not only the input. Soil should run 6.2–7.0, coco and hydro 5.6–6.2.',
      'Low pH locks out calcium, magnesium, phosphorus, potassium and molybdenum.',
      'High pH locks out iron, manganese, zinc, copper, boron and phosphorus.',
      'Measure runoff EC too: a high EC with deficiency signs fits lockout.',
      'Calibrate your pH meter with fresh buffer; a drifting meter is a common cause.',
      'Check that you pH the water after adding nutrients, not before.'
    ],
    lookalikes: [
      { id: 'salt_buildup', howToTell: 'Salt build-up shows high runoff EC with pH roughly in range; lockout shows pH out of range.' },
      { id: 'root_rot', howToTell: 'Root rot gives brown, slimy, smelly roots and wilting even when wet.' },
      { id: 'overwatering', howToTell: 'Overwatering also blocks uptake, but the pot stays heavy and pH can be fine.' },
      { id: 'n_def', howToTell: 'A single clean pattern on old leaves with pH in range is a real deficiency.' },
      { id: 'fe_def', howToTell: 'Iron chlorosis alone is often the first sign of high pH; check runoff before adding iron.' }
    ],
    causes: [
      'Not measuring pH, or an uncalibrated meter.',
      'Alkaline tap water with high bicarbonates slowly raising pH.',
      'Peat soils and organic matter drifting acidic over time.',
      'Salt build-up in the root zone that drags pH off.',
      'Running coco or hydro at the very edge of the window for weeks.'
    ],
    fix: [
      'Calibrate the meter, then measure input and runoff pH.',
      'Soil: water through with 2–3 times the pot volume of plain, pH-corrected water.',
      'Coco: water through with a quarter- to half-strength, pH-corrected feed, not plain water.',
      'Hydro: change the reservoir and set pH to 5.8.',
      'Resume at half strength and build back up over 1–2 weeks.',
      'Judge recovery by new growth; damaged leaves will not heal.'
    ],
    prevent: [
      'Measure pH every feed and runoff pH at least weekly.',
      'Calibrate the meter monthly and store the probe wet.',
      'Let pH vary a little within the window so every element gets its turn.',
      'Know your tap water and correct for high alkalinity.'
    ],
    severity: 'high',
    stages: [],
    guide: '/guide/nutrition#nutrition-ph-ec'
  },
  {
    id: 'salt_buildup',
    category: 'nutrient',
    name: 'Salt build-up',
    aka: ['EC creep', 'salt accumulation'],
    summary: 'Unused fertiliser salts pile up in the medium, so runoff EC climbs and the plant struggles to drink.',
    areas: ['soil', 'leaf-tips', 'roots'],
    symptoms: [
      'Runoff EC keeps rising week after week while the input stays the same.',
      'White crust on the medium surface, pot rim or drainage holes.',
      'Slowly spreading tip burn and dull, stiff leaves.',
      'The plant drinks less and the pot dries out slower.',
      'Deficiency signs appear even though the feed is strong.'
    ],
    confirm: [
      'Measure input EC and runoff EC with the same meter; runoff more than about 0.5–1.0 above input is building up.',
      'Track the trend: one high reading matters less than a steady climb.',
      'Check runoff pH too: salt build-up often drags it out of range.',
      'Check watering habits: little or no runoff, or coco left to dry out hard between feeds.'
    ],
    lookalikes: [
      { id: 'nutrient_burn', howToTell: 'Burn follows a sudden stronger feed; salt build-up creeps in over weeks at a steady dose.' },
      { id: 'ph_lockout', howToTell: 'Lockout shows runoff pH far off; salt build-up shows high runoff EC first.' },
      { id: 'underwatering', howToTell: 'Underwatered plants wilt and recover after watering; salt-stressed plants stay dull.' },
      { id: 'k_def', howToTell: 'High salts can lock out potassium; low runoff EC means a real shortage instead.' }
    ],
    causes: [
      'Watering without runoff, so salts never leave the pot.',
      'Coco allowed to dry out too far, which concentrates the solution.',
      'Feeding bottled salts on top of rich soil.',
      'Hard tap water adding its own minerals.',
      'Feeding stronger than the plant uses in cool or low-light conditions.'
    ],
    fix: [
      'Coco: water through with a half-strength, pH-corrected feed until runoff EC is close to the input.',
      'Soil: water through with 2–3 times the pot volume of plain, pH-corrected water, then let it dry back.',
      'Hydro: drain and refill the reservoir at a lower EC.',
      'Then lower the feed slightly and water with 10–20 % runoff from now on.'
    ],
    prevent: [
      'In coco, water to 10–20 % runoff every time and do not let it dry out hard.',
      'Measure runoff EC weekly and log the trend.',
      'In soil, give a plain-water watering to runoff every few feeds.',
      'Lower feed strength if the plant is not drinking it.'
    ],
    severity: 'medium',
    stages: ['vegetative', 'flowering'],
    classifier: 'tip_burn',
    guide: '/guide/nutrition#nutrition-runoff'
  }
]
