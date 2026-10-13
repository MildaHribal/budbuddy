export default {
  en: {
    title: 'Tools',
    subtitle: 'Calculators and grow management',
    groups: {
      calc: 'Calculators',
      care: 'Care',
      overview: 'Overview',
      spacesDesc: 'Light schedule and logging for a whole tent',
      huntsDesc: 'Score seedlings and pick a keeper',
      labelsDesc: 'Print plant labels to scan at the tent'
    },
    tabs: { nutrients: 'Nutrients', vpd: 'Air', dli: 'Light', convert: 'Convert', curing: 'Drying & curing', treatment: 'Treatment plans' },
    desc: { nutrients: 'Millilitres per can from the bottle dose', vpd: 'Temperature and humidity check (VPD)', dli: 'Daily light from PPFD and hours', convert: 'Gallons, litres, °F and °C', curing: 'Daily drying checks and jar burping', treatment: 'Steps and a follow-up photo for a problem' },
    whatFor: 'What is this for?',
    learnMore: 'Learn more',
    mix: {
      what: 'Tells you exactly how many millilitres of each fertiliser to pour into your watering can.',
      learn: {
        a: 'Bottles list a dose “per litre” (ml/L). This tool multiplies it by your water amount.',
        b: 'Feeding charts are usually written for strong, adult plants. Starting weaker is safer.',
        c: 'Too much fertiliser burns leaf tips. Too little shows as pale, yellowing leaves.',
        d: 'Use a syringe or measuring cup. Kitchen spoons are not precise enough.'
      },
      step1: 'How much water are you mixing?',
      step1Hint: 'The amount in your watering can or reservoir.',
      water: 'Water',
      waterSr: ' in litres',
      step2: 'Your nutrients',
      step2Hint: 'The dose printed on the bottle or feeding chart, in ml per litre.',
      colProduct: 'Product',
      colDose: 'Dose per litre',
      addProduct: 'Add product',
      product: 'e.g. Grow A',
      productName: 'Product {n} name',
      productDose: 'Product {n} dose in ml per litre',
      removeProduct: 'Remove product {n}',
      useExample: 'Fill in an example',
      step3: 'How strong?',
      step3Hint: '100 % is the full dose from the bottle. Seedlings and first-timers usually start at 25–50 % and go up when the plants look happy.',
      strength: 'Custom strength',
      strengthSr: ' in percent',
      levels: { 25: 'Seedlings', 50: 'Young plants', 75: 'Growing', 100: 'Full dose' },
      recipeTitle: 'Into {l} L of water add:',
      perLitre: '{d} ml per litre',
      empty: 'Add at least one product with a dose to see your recipe.',
      total: 'Total',
      howTitle: 'How to mix',
      how: {
        a: 'Fill the can with the water first.',
        b: 'Add the products one by one, in the order listed. Stir after each.',
        c: 'Measure the pH last and adjust it if needed.'
      },
      logPlant: 'Log to plant',
      logPlaceholder: 'Choose a plant',
      log: 'Log feed'
    },
    vpd: {
      what: 'Shows how thirsty the air is: whether it pulls water out of the leaves too little, just right, or too much.',
      learn: {
        a: 'Damp air (low VPD) means plants drink slowly and mould loves it.',
        b: 'Dry air (high VPD) makes plants lose water too fast, so they shut down to protect themselves.',
        c: 'Young plants like damper air. Flowering plants like it a bit drier.',
        d: 'The number is called VPD (vapour pressure deficit) and is measured in kPa.'
      },
      inputsTitle: 'Your grow room right now',
      airTemp: 'Temperature',
      rh: 'Humidity',
      rhHint: 'Read both values from a thermo-hygrometer placed at plant height.',
      leafOffset: 'Leaf temperature difference (optional)',
      leafHint: 'Leaves are usually 1–3 °C cooler than the air under LED lights. If you are not sure, leave it at −2 °C.',
      resultLabel: 'How thirsty the air is',
      aria: '{value} kPa, zone: {zone}',
      bands: { low: 'Too damp', clones: 'Clones', veg: 'Veg', flower: 'Flower', high: 'Too dry' },
      zones: {
        low: { title: 'The air is too damp', do: 'Plants drink slowly and mould can start. Lower the humidity (dehumidifier, more airflow) or raise the temperature a little.' },
        clones: { title: 'Gentle, damp air', do: 'Perfect for cuttings and seedlings. Bigger plants will grow faster in slightly drier air.' },
        veg: { title: 'Just right for growing plants', do: 'Ideal for leafy growth and early flowering. Keep it here.' },
        flower: { title: 'Drier air, right for flowering', do: 'Good for mid and late flowering. Too dry for seedlings, so raise the humidity for them.' },
        high: { title: 'The air is too dry', do: 'Plants lose water faster than they can drink. Raise the humidity (humidifier) or lower the temperature.' }
      },
      targets: 'What each stage likes',
      clones: 'Cuttings & seedlings',
      veg: 'Growing (veg)',
      flower: 'Flowering'
    },
    dli: {
      what: 'Shows how much light your plants get in a whole day, so you know if the lamp is too weak, right, or too strong.',
      learn: {
        a: 'PPFD is how strong the light is at the top of the plants, at one moment.',
        b: 'DLI adds that up over all the hours the lamp is on. It is the plant’s daily “light meal”.',
        c: 'Measure PPFD with a PAR meter or a phone app, or look it up in your lamp’s chart for the hanging height.',
        d: 'More light only helps if water, nutrients and temperature keep up.'
      },
      presetsTitle: 'Not sure? Pick your stage',
      presets: { seedling: 'Seedling', veg: 'Veg', flower: 'Flower', auto: 'Auto' },
      ppfd: 'Light strength (PPFD)',
      ppfdSr: ' in µmol per m² per second',
      ppfdHint: 'Measured at the top of the plants.',
      hours: 'Lamp on per day',
      hoursHint: 'e.g. 18 h for growing, 12 h for flowering.',
      unit: 'mol/m²/day',
      label: 'Light per day (DLI)',
      reverseTitle: 'Aiming for a number? How strong the light must be',
      target: 'Light per day you want',
      needed: 'PPFD needed at the top of the plants with {h} h of light'
    },
    convert: {
      what: 'Quick conversions for American feeding charts, pot sizes and thermometers.',
      learn: {
        a: 'Many charts give doses per gallon. Divide ml per gallon by 3.79 to get ml per litre.',
        b: 'Pot sizes are often sold in gallons: a “3 gallon” pot holds about 11 litres of soil.',
        c: 'Type into either box and the other one updates.'
      },
      volume: 'Gallons ↔ litres',
      gallons: 'US gallons (gal)',
      litres: 'Litres (L)',
      litre: 'L',
      temperature: 'Fahrenheit ↔ Celsius',
      fahrenheit: 'Fahrenheit (°F)',
      celsius: 'Celsius (°C)',
      potSizes: 'Common pot sizes'
    },
    curing: {
      what: 'Guides the slow finish after harvest: daily checks while the branches hang, then jars with a burp schedule that tapers off.',
      learn: {
        a: 'Dry in the dark at 18–21 °C and 55–62 % humidity. It usually takes 7–14 days.',
        b: 'Jar when small stems snap instead of bending. Fill jars about three quarters full.',
        c: 'Keep 58–62 % in the jar. Week 1: open 3× a day, week 2: daily, then less and less.'
      }
    },
    treatment: {
      what: 'Turns a problem into a short plan: concrete steps, reminders and a follow-up photo to compare before and after.',
      learn: {
        a: 'Most leaf problems start with pH or EC. Measure them first.',
        b: 'Damaged leaves do not recover. Judge the plan by the new growth.',
        c: 'Use only products allowed for your plants and follow the label. Never spray buds in flower.'
      }
    }
  },
  cs: {
    title: 'Nástroje',
    subtitle: 'Kalkulačky a správa pěstování',
    groups: {
      calc: 'Kalkulačky',
      care: 'Péče',
      overview: 'Přehled',
      spacesDesc: 'Světelný režim a zápis pro celý stan',
      huntsDesc: 'Hodnocení semenáčků a výběr keepera',
      labelsDesc: 'Štítky k rostlinám na skenování u stanu'
    },
    tabs: { nutrients: 'Živiny', vpd: 'Vzduch', dli: 'Světlo', convert: 'Převody', curing: 'Sušení a zrání', treatment: 'Léčebné plány' },
    desc: { nutrients: 'Mililitry do konve podle dávky na lahvi', vpd: 'Kontrola teploty a vlhkosti (VPD)', dli: 'Denní dávka světla z PPFD a hodin', convert: 'Galony, litry, °F a °C', curing: 'Denní kontrola sušení a odvětrávání sklenic', treatment: 'Kroky a kontrolní fotka při problému' },
    whatFor: 'K čemu to je?',
    learnMore: 'Víc informací',
    mix: {
      what: 'Spočítá ti, kolik mililitrů každého hnojiva nalít do konve.',
      learn: {
        a: 'Na lahvi je dávka „na litr“ (ml/L). Tady se jen vynásobí množstvím tvé vody.',
        b: 'Hnojicí plány bývají psané pro silné dospělé rostliny. Začít slabší je bezpečnější.',
        c: 'Moc hnojiva spálí špičky listů. Málo hnojiva se pozná podle bledých, žloutnoucích listů.',
        d: 'Odměřuj stříkačkou nebo odměrkou. Kuchyňská lžička není dost přesná.'
      },
      step1: 'Kolik vody mícháš?',
      step1Hint: 'Kolik máš v konvi nebo v nádrži.',
      water: 'Voda',
      waterSr: ' v litrech',
      step2: 'Tvoje hnojiva',
      step2Hint: 'Dávka z lahve nebo hnojicího plánu, v ml na litr.',
      colProduct: 'Hnojivo',
      colDose: 'Dávka na litr',
      addProduct: 'Přidat hnojivo',
      product: 'např. Grow A',
      productName: 'Název hnojiva {n}',
      productDose: 'Dávka hnojiva {n} v ml na litr',
      removeProduct: 'Odebrat hnojivo {n}',
      useExample: 'Vyplnit příklad',
      step3: 'Jak silně?',
      step3Hint: '100 % je plná dávka z lahve. Se sazenicemi a napoprvé se obvykle začíná na 25–50 % a přidává se, až rostliny vypadají spokojeně.',
      strength: 'Vlastní síla',
      strengthSr: ' v procentech',
      levels: { 25: 'Sazenice', 50: 'Mladé rostliny', 75: 'Rostou', 100: 'Plná dávka' },
      recipeTitle: 'Do {l} L vody přidej:',
      perLitre: '{d} ml na litr',
      empty: 'Přidej aspoň jedno hnojivo s dávkou a uvidíš recept.',
      total: 'Celkem',
      howTitle: 'Jak míchat',
      how: {
        a: 'Nejdřív napusť do konve vodu.',
        b: 'Přidávej hnojiva po jednom v tomhle pořadí a po každém zamíchej.',
        c: 'Nakonec změř pH a případně ho uprav.'
      },
      logPlant: 'Zapsat k rostlině',
      logPlaceholder: 'Vyber rostlinu',
      log: 'Zapsat hnojení'
    },
    vpd: {
      what: 'Ukáže, jak moc je vzduch „žíznivý“: jestli z listů tahá vodu málo, akorát, nebo moc.',
      learn: {
        a: 'Vlhký vzduch (nízké VPD) znamená, že rostliny pijí pomalu a daří se plísni.',
        b: 'Suchý vzduch (vysoké VPD) z rostlin tahá vodu moc rychle, takže se zavřou a přestanou růst.',
        c: 'Mladé rostliny chtějí vlhčí vzduch, kvetoucí o něco sušší.',
        d: 'Číslo se jmenuje VPD (deficit tlaku par) a měří se v kPa.'
      },
      inputsTitle: 'Tvoje pěstírna teď',
      airTemp: 'Teplota',
      rh: 'Vlhkost',
      rhHint: 'Obě hodnoty odečti z teploměru s vlhkoměrem ve výšce rostlin.',
      leafOffset: 'Rozdíl teploty listu (nepovinné)',
      leafHint: 'Pod LED světly bývají listy o 1–3 °C chladnější než vzduch. Když nevíš, nech −2 °C.',
      resultLabel: 'Jak žíznivý je vzduch',
      aria: '{value} kPa, zóna: {zone}',
      bands: { low: 'Moc vlhko', clones: 'Řízky', veg: 'Vegetace', flower: 'Kvetení', high: 'Moc sucho' },
      zones: {
        low: { title: 'Vzduch je moc vlhký', do: 'Rostliny pijí pomalu a může začít plíseň. Sniž vlhkost (odvlhčovač, víc větrat) nebo trochu zvyš teplotu.' },
        clones: { title: 'Jemný, vlhký vzduch', do: 'Ideální pro řízky a sazenice. Větším rostlinám se bude dařit v trochu sušším vzduchu.' },
        veg: { title: 'Akorát pro rostoucí rostliny', do: 'Ideální pro růst listů a začátek kvetení. Drž to tady.' },
        flower: { title: 'Sušší vzduch, vhodný pro kvetení', do: 'Dobré pro střed a konec kvetení. Pro sazenice je to moc sucho, těm vlhkost zvyš.' },
        high: { title: 'Vzduch je moc suchý', do: 'Rostliny ztrácí vodu rychleji, než stihnou pít. Zvyš vlhkost (zvlhčovač) nebo sniž teplotu.' }
      },
      targets: 'Co které fázi sedí',
      clones: 'Řízky a sazenice',
      veg: 'Vegetace',
      flower: 'Kvetení'
    },
    dli: {
      what: 'Ukáže, kolik světla rostliny dostanou za celý den, takže poznáš, jestli je lampa slabá, akorát, nebo moc silná.',
      learn: {
        a: 'PPFD je, jak silně svítí světlo na vršky rostlin v jednu chvíli.',
        b: 'DLI to sečte za všechny hodiny, kdy lampa svítí. Je to denní „světelná porce“ rostliny.',
        c: 'PPFD změříš PAR metrem nebo aplikací v telefonu, případně ho najdeš v tabulce výrobce lampy pro danou výšku.',
        d: 'Víc světla pomůže jen tehdy, když stíhá voda, živiny a teplota.'
      },
      presetsTitle: 'Nevíš? Vyber fázi',
      presets: { seedling: 'Sazenice', veg: 'Vegetace', flower: 'Kvetení', auto: 'Samonakvétací' },
      ppfd: 'Síla světla (PPFD)',
      ppfdSr: ' v µmol na m² za sekundu',
      ppfdHint: 'Měřeno u vršků rostlin.',
      hours: 'Lampa svítí denně',
      hoursHint: 'např. 18 h při růstu, 12 h při kvetení.',
      unit: 'mol/m²/den',
      label: 'Světla za den (DLI)',
      reverseTitle: 'Chceš konkrétní číslo? Jak silně musí světlo svítit',
      target: 'Kolik světla za den chceš',
      needed: 'potřebné PPFD u vršků rostlin při {h} h světla'
    },
    convert: {
      what: 'Rychlé převody pro americké hnojicí plány, velikosti květináčů a teploměry.',
      learn: {
        a: 'Hodně plánů uvádí dávku na galon. Vyděl ml na galon číslem 3,79 a máš ml na litr.',
        b: 'Květináče se často prodávají v galonech: „3galonový“ pojme zhruba 11 litrů substrátu.',
        c: 'Piš do kteréhokoli políčka, druhé se přepočítá samo.'
      },
      volume: 'Galony ↔ litry',
      gallons: 'US galony (gal)',
      litres: 'Litry (L)',
      litre: 'L',
      temperature: 'Fahrenheit ↔ Celsius',
      fahrenheit: 'Fahrenheit (°F)',
      celsius: 'Celsius (°C)',
      potSizes: 'Běžné velikosti květináčů'
    },
    curing: {
      what: 'Provede pomalým dokončením po sklizni: denní kontroly, dokud větve visí, a pak sklenice s rozpisem odvětrávání, který postupně řídne.',
      learn: {
        a: 'Suš ve tmě při 18–21 °C a vlhkosti 55–62 %. Obvykle to trvá 7–14 dní.',
        b: 'Do sklenic, až se tenké stonky lámou místo ohýbání. Sklenice plň zhruba do tří čtvrtin.',
        c: 'Ve sklenici drž 58–62 %. 1. týden otevírej 3× denně, 2. týden denně, pak čím dál méně.'
      }
    },
    treatment: {
      what: 'Udělá z problému krátký plán: konkrétní kroky, připomínky a kontrolní fotku pro porovnání před a po.',
      learn: {
        a: 'Většina problémů s listy začíná u pH nebo EC. Změř je jako první.',
        b: 'Poškozené listy se nevzpamatují. Plán posuzuj podle nových přírůstků.',
        c: 'Používej jen přípravky povolené pro tvoje rostliny a řiď se etiketou. Nikdy nestříkej na palice v květu.'
      }
    }
  }
}
