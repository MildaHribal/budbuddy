import type { EquipmentDef, EquipmentSlot } from '../../types.ts'

/** Stat keys the sim reads, per slot. Extra keys are informational. */
export const EQUIPMENT_STAT_KEYS: Record<EquipmentSlot, string[]> = {
  tent: ['widthCm', 'heightCm', 'slots'],
  light: ['watts', 'ppfd', 'heat'],
  exhaust: ['m3h'],
  fan: ['airflow'],
  dehumidifier: ['lPerDay'],
  humidifier: ['lPerDay'],
  heater: ['watts'],
  ac: ['watts'],
  meter: [],
  irrigation: ['auto'],
  pot: ['liters', 'medium']
}

/** pot stat `medium` */
export const MEDIUM_CODE = { soil: 0, coco: 1, hydro: 2 } as const

const e = (id: string, slot: EquipmentSlot, price: number, unlockLevel: number, stats: Record<string, number>,
  name: [string, string], blurb: [string, string]): EquipmentDef =>
  ({ id, slot, price, unlockLevel, stats, name: { en: name[0], cs: name[1] }, blurb: { en: blurb[0], cs: blurb[1] } })

export const EQUIPMENT: EquipmentDef[] = [
  // tents
  e('tent-60', 'tent', 60, 1, { widthCm: 60, heightCm: 140, slots: 2 },
    ['Tent 60 × 60 × 140', 'Stan 60 × 60 × 140'],
    ['Small closet tent for two plants. Little air volume, so heat and humidity swing fast.', 'Malý stan pro dvě rostliny. Má málo vzduchu, takže teplota a vlhkost v něm rychle kolísají.']),
  e('tent-80', 'tent', 120, 3, { widthCm: 80, heightCm: 160, slots: 4 },
    ['Tent 80 × 80 × 160', 'Stan 80 × 80 × 160'],
    ['Room for four plants and a bit more headroom for photoperiod stretch.', 'Místo pro čtyři rostliny a o kus víc výšky na vytahování fotoperiod.']),
  e('tent-100', 'tent', 200, 7, { widthCm: 100, heightCm: 200, slots: 6 },
    ['Tent 100 × 100 × 200', 'Stan 100 × 100 × 200'],
    ['One square metre for six plants. Full height lets tall sativas finish.', 'Metr čtvereční pro šest rostlin. Plná výška stačí i vysokým sativám.']),
  e('tent-120', 'tent', 280, 12, { widthCm: 120, heightCm: 200, slots: 9 },
    ['Tent 120 × 120 × 200', 'Stan 120 × 120 × 200'],
    ['Nine plants on 1.44 m². Needs a strong lamp and exhaust to light and cool it evenly.', 'Devět rostlin na 1,44 m². Potřebuje silnou lampu a odtah, aby byl rovnoměrně osvětlený a chlazený.']),

  // lights: ppfd = µmol/m²/s under the centre at 30 cm, full power; heat = °C added to the tent at full power
  e('light-blurple-100', 'light', 45, 1, { watts: 100, ppfd: 450, heat: 4, efficacy: 1.3, coverCm: 60 },
    ['Budget LED 100 W (red/blue)', 'Levná LED 100 W (červenomodrá)'],
    ['Purple light from cheap red and blue diodes, about 1.3 µmol per watt. Enough for one or two small autos, weak for big yields, and it makes leaf colours hard to judge.', 'Fialové světlo z levných červených a modrých diod, zhruba 1,3 µmol na watt. Stačí na jedno dvě malá autíčka, na velkou úrodu je slabé a barvu listů pod ním špatně posoudíš.']),
  e('light-fs-150', 'light', 150, 2, { watts: 150, ppfd: 800, heat: 3, efficacy: 2.5, coverCm: 60 },
    ['Full-spectrum LED board 150 W', 'Celospektrální LED deska 150 W'],
    ['White full-spectrum board with a dimmer, about 2.5 µmol per watt. Covers a 60 tent well and shows true leaf colours.', 'Bílá celospektrální deska se stmívačem, zhruba 2,5 µmol na watt. Dobře pokryje stan 60 a ukáže skutečnou barvu listů.']),
  e('light-fs-240', 'light', 260, 3, { watts: 240, ppfd: 1000, heat: 4.5, efficacy: 2.7, coverCm: 80 },
    ['Full-spectrum LED 240 W', 'Celospektrální LED 240 W'],
    ['Efficient full-spectrum lamp for an 80 tent, about 2.7 µmol per watt. Can burn tops at full power, so use the dimmer.', 'Úsporná celospektrální lampa pro stan 80, zhruba 2,7 µmol na watt. Na plný výkon umí spálit vršky, proto používej stmívač.']),
  e('light-fs-480', 'light', 520, 7, { watts: 480, ppfd: 1150, heat: 6, efficacy: 2.8, coverCm: 100 },
    ['Full-spectrum LED bar 480 W', 'Celospektrální LED lišty 480 W'],
    ['Bar fixture that spreads light evenly over one square metre. Needs strong exhaust in summer.', 'Lištové svítidlo, které rovnoměrně pokryje metr čtvereční. V létě potřebuje silný odtah.']),
  e('light-fs-720', 'light', 850, 12, { watts: 720, ppfd: 1250, heat: 7.5, efficacy: 2.9, coverCm: 120 },
    ['Full-spectrum LED bar 720 W', 'Celospektrální LED lišty 720 W'],
    ['Eight-bar fixture for a 120 tent. Enough light for very high yields if climate and feeding keep up.', 'Osmilištové svítidlo pro stan 120. Světla dost na velmi vysokou úrodu, pokud stačí klima a krmení.']),

  // exhaust with carbon filter
  e('exhaust-150', 'exhaust', 90, 1, { m3h: 150, filter: 1 },
    ['Exhaust 150 m³/h + carbon filter', 'Odtah 150 m³/h + uhlíkový filtr'],
    ['Small inline fan with a carbon filter. Pulls warm, wet air out and removes the smell. Enough for a 60 or 80 tent.', 'Malý potrubní ventilátor s uhlíkovým filtrem. Odsává teplý a vlhký vzduch a zachytí pach. Stačí pro stan 60 nebo 80.']),
  e('exhaust-280', 'exhaust', 150, 5, { m3h: 280, filter: 1 },
    ['Exhaust 280 m³/h + carbon filter', 'Odtah 280 m³/h + uhlíkový filtr'],
    ['Mid-size fan and filter for a 100 tent, or a smaller tent with a hot lamp.', 'Středně velký ventilátor s filtrem pro stan 100 nebo menší stan s horkou lampou.']),
  e('exhaust-400', 'exhaust', 230, 10, { m3h: 400, filter: 1 },
    ['Exhaust 400 m³/h + carbon filter', 'Odtah 400 m³/h + uhlíkový filtr'],
    ['Quiet EC fan with a large filter for a 120 tent under a 720 W lamp.', 'Tichý EC ventilátor s velkým filtrem pro stan 120 pod lampou 720 W.']),

  // circulation
  e('fan-clip', 'fan', 15, 1, { airflow: 0.4 },
    ['Clip fan', 'Klipsový ventilátor'],
    ['Small fan clipped to a pole. Moves air over the canopy, firms stems and cuts mould risk. Aim it across the plants, not straight at them.', 'Malý ventilátor připnutý na tyč. Hýbe vzduchem nad rostlinami, zpevňuje stonky a snižuje riziko plísně. Miř přes rostliny, ne přímo na ně.']),
  e('fan-oscillating', 'fan', 40, 4, { airflow: 0.7 },
    ['Oscillating fan', 'Otočný ventilátor'],
    ['Sweeps the whole tent so no leaf gets a constant blast. Better air under dense canopies.', 'Přejíždí celým stanem, takže žádný list nedostává stálý proud. Lepší proudění i pod hustým porostem.']),

  // humidity and temperature
  e('dehumidifier-small', 'dehumidifier', 120, 4, { lPerDay: 6 },
    ['Small dehumidifier 6 L/day', 'Malý odvlhčovač 6 l/den'],
    ['Compact compressor unit with a hygrostat. Keeps late flower under control in a small tent.', 'Kompaktní kompresorový odvlhčovač s hygrostatem. V malém stanu udrží pozdní květ pod kontrolou.']),
  e('dehumidifier-large', 'dehumidifier', 260, 8, { lPerDay: 16 },
    ['Large dehumidifier 16 L/day', 'Velký odvlhčovač 16 l/den'],
    ['Pulls enough water for a full 100 or 120 tent in late bloom. Adds a little heat.', 'Odebere dost vody pro plný stan 100 nebo 120 v pozdním květu. Trochu přihřívá.']),
  e('humidifier', 'humidifier', 45, 2, { lPerDay: 4 },
    ['Humidifier 4 L/day', 'Zvlhčovač 4 l/den'],
    ['Ultrasonic humidifier with a hygrostat. Helps seedlings and young plants in dry winter air.', 'Ultrazvukový zvlhčovač s hygrostatem. Pomáhá sazenicím a mladým rostlinám v suchém zimním vzduchu.']),
  e('heater', 'heater', 35, 4, { watts: 150 },
    ['Tent heater 150 W', 'Topení do stanu 150 W'],
    ['Small heater with a thermostat. Stops cold nights from stalling growth.', 'Malé topení s termostatem. Nedovolí, aby studené noci zastavily růst.']),
  e('ac-small', 'ac', 450, 14, { watts: 2600 },
    ['Portable air conditioner 2.6 kW', 'Mobilní klimatizace 2,6 kW'],
    ['Cools the grow room when exhaust alone cannot beat summer heat. Also dries the air a bit.', 'Chladí místnost, když v létě samotný odtah nestačí. Trochu i vysušuje vzduch.']),

  // meters
  e('meter-climate', 'meter', 12, 1, { climate: 1 },
    ['Thermo-hygrometer', 'Teploměr s vlhkoměrem'],
    ['Shows tent temperature, humidity and VPD. Without it you only guess the climate.', 'Ukazuje teplotu, vlhkost a VPD ve stanu. Bez něj klima jen odhaduješ.']),
  e('meter-ph', 'meter', 35, 2, { ph: 1 },
    ['pH pen', 'pH pero'],
    ['Measures pH of the water and the runoff. Shows when lockout is building before leaves do.', 'Měří pH vody i výtoku. Ukáže blokaci živin dřív než listy.']),
  e('meter-ec', 'meter', 30, 3, { ec: 1 },
    ['EC pen', 'EC pero'],
    ['Measures how strong the feed is and how much salt sits in the root zone.', 'Měří sílu hnojiva a kolik solí se drží v kořenové zóně.']),
  e('meter-combo', 'meter', 70, 5, { ph: 1, ec: 1 },
    ['pH and EC combo meter', 'Kombinovaný měřák pH a EC'],
    ['One probe for pH, EC and solution temperature. Cheaper than buying both pens.', 'Jedna sonda na pH, EC a teplotu roztoku. Levnější než obě pera zvlášť.']),

  // irrigation
  e('irrigation-cone', 'irrigation', 60, 6, { auto: 1, soilOnly: 1 },
    ['Clay-cone watering', 'Zavlažování keramickými kužely'],
    ['Ceramic cones in the soil draw water from a tank as the soil dries. Keeps soil evenly moist; for soil only.', 'Keramické kužely v hlíně si berou vodu z nádrže, jak substrát vysychá. Drží hlínu rovnoměrně vlhkou, jen pro hlínu.']),
  e('irrigation-drip', 'irrigation', 140, 10, { auto: 1, reservoirL: 60 },
    ['Drip system with timer', 'Kapková závlaha s časovačem'],
    ['Pump, drippers and a 60 L tank on a timer. Feeds coco several times a day without you.', 'Čerpadlo, kapače a 60 l nádrž na časovači. Krmí kokos několikrát denně bez tebe.']),

  // pots: consumable, price includes fresh medium
  e('pot-soil-7', 'pot', 6, 1, { liters: 7, medium: 0 },
    ['Fabric pot 7 L with soil', 'Textilní květináč 7 l s hlínou'],
    ['Small pot for autos. Dries out fast in late flower.', 'Malý květináč pro autíčka. V pozdním květu rychle vysychá.']),
  e('pot-soil-11', 'pot', 8, 1, { liters: 11, medium: 0 },
    ['Fabric pot 11 L with soil', 'Textilní květináč 11 l s hlínou'],
    ['Standard pot with lightly fertilised soil. Feeds the plant for the first 3 to 4 weeks.', 'Běžný květináč s lehce předhnojenou hlínou. Rostlinu živí první 3 až 4 týdny.']),
  e('pot-soil-18', 'pot', 12, 3, { liters: 18, medium: 0 },
    ['Fabric pot 18 L with soil', 'Textilní květináč 18 l s hlínou'],
    ['Big pot for photoperiods. Holds water longer and buffers mistakes.', 'Velký květináč pro fotoperiody. Déle drží vodu a tlumí chyby.']),
  e('pot-coco-11', 'pot', 10, 5, { liters: 11, medium: 1 },
    ['Fabric pot 11 L with coco', 'Textilní květináč 11 l s kokosem'],
    ['Inert coco with perlite. Faster growth, but feed with every watering and add cal-mag.', 'Inertní kokos s perlitem. Rychlejší růst, ale krmí se při každé zálivce a s cal-magem.']),
  e('pot-dwc-20', 'pot', 30, 9, { liters: 20, medium: 2 },
    ['DWC bucket 20 L', 'DWC kbelík 20 l'],
    ['Roots hang in aerated nutrient water. Fastest growth, but a warm or stale reservoir rots roots in a day.', 'Kořeny visí v provzdušněném živném roztoku. Nejrychlejší růst, ale teplá nebo stará nádrž shnije kořeny za den.'])
]
