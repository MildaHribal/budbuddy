// Feeding schedules, costs, inventory and legal limits: texts used outside their own pages.
export default {
  en: {
    custom: 'Custom',
    plainWater: 'Plain water, no nutrients',
    weekLabel: '{phase}, week {n}',
    weekN: 'Week {n}',
    phase: { seedling: 'Seedling', veg: 'Veg', bloom: 'Bloom', flush: 'Flush' },
    media: { soil: 'Soil', coco: 'Coco', hydro: 'Hydro', other: 'Other' },
    location: { indoor: 'Indoor', outdoor: 'Outdoor', greenhouse: 'Greenhouse' },
    fill: {
      use: 'Use this week',
      noWeek: 'Not in the chart for this stage',
      bottleFor: 'Bottle for {name}',
      noBottle: 'Not from stock',
      amountHint: 'Enter the amount so the poured nutrients come off your stock.',
      assign: 'Assign a feeding schedule'
    },
    assign: {
      title: 'Feeding schedule',
      plants: 'Plants',
      noPlants: 'No growing plants yet.',
      pickPlant: 'Pick at least one plant.',
      schedule: 'Schedule',
      strength: 'Strength',
      water: 'Water per feed',
      strengthHint: 'Many growers start at 50–75 % of the chart and go up when the plants look hungry.',
      autoHint: 'Autoflowers are usually fed lighter, around 50–75 % of the chart. Manufacturers give no separate numbers.',
      preview: '{name} this week: {week}',
      saved: { one: 'Schedule assigned', few: 'Schedule assigned to {n} plants', other: 'Schedule assigned to {n} plants' }
    },
    editor: {
      title: 'Your schedule',
      brand: 'Brand',
      brandPlaceholder: 'e.g. My mix',
      brandError: 'Give the schedule a name.',
      line: 'Line',
      media: 'Medium',
      products: 'Products',
      productPlaceholder: 'e.g. Grow A',
      productName: 'Product {n} name',
      removeProduct: 'Remove product {n}',
      addProduct: 'Add product',
      productsError: 'Add at least one product.',
      weeks: 'Weeks',
      weeksHint: 'Doses in ml per litre. Leave a field empty when the product is not used that week.',
      phaseOf: 'Phase of week {n}',
      removeWeek: 'Remove {week}',
      addWeek: 'Add week',
      saved: 'Schedule saved'
    },
    plan: {
      title: 'Feeding schedule',
      empty: 'Pick a nutrient brand and the app shows this week’s dose and fills it into feed entries.',
      assign: 'Choose a schedule',
      log: 'Log this feed',
      repeated: 'chart repeats its last week'
    },
    week: {
      title: 'Feeding this week',
      plans: 'Schedules',
      log: 'Log',
      logFor: 'Log feed for {name}',
      fed: 'Fed {when}',
      more: '+{n} more'
    },
    costs: {
      title: 'Costs',
      open: 'Details',
      start: 'Start tracking',
      spent: 'Spent incl. power',
      power: 'Electricity',
      perGram: 'Cost per gram',
      gpw: 'Best g/W',
      empty: 'Log what seeds, nutrients and power cost you and see the price per gram after harvest.'
    },
    links: {
      title: 'Grow management',
      low: { one: '{n} running low', other: '{n} running low' },
      feeding: { title: 'Feeding schedules', desc: 'Weekly doses from BioBizz, CANNA, Plagron…' },
      costs: { title: 'Costs and electricity', desc: 'Expenses, kWh and cost per gram' },
      inventory: { title: 'Inventory', desc: 'Seeds, nutrients and substrate' },
      legal: { title: 'Legal limits', desc: 'Plant and storage limits in CZ and DE' }
    },
    legal: {
      settingsTitle: 'Legal limits',
      settingsHint: 'Warns on the home screen when your plants or stored harvest go over the home-grow limit, or the harvest gets close to it. Information only.',
      details: 'Details',
      countries: { cz: 'Czechia', de: 'Germany', none: 'Off' },
      disclaimer: 'Information only, not legal advice. Rules checked on {date}; laws change, always check the official text.',
      short: 'Information only, not legal advice.',
      nearGramsTitle: 'Stored harvest is close to the limit',
      overTitle: 'Over the home-grow limit',
      summary: 'Plants {plants}/{plantLimit} · stored {grams}/{gramLimit} g',
      level: { ok: 'Within the limits', near: 'At or close to the limit', over: 'Over the limit' }
    }
  },
  cs: {
    custom: 'Vlastní',
    plainWater: 'Čistá voda, bez hnojiv',
    weekLabel: '{phase}, týden {n}',
    weekN: 'Týden {n}',
    phase: { seedling: 'Semenáček', veg: 'Růst', bloom: 'Květ', flush: 'Proplach' },
    media: { soil: 'Hlína', coco: 'Kokos', hydro: 'Hydro', other: 'Jiné' },
    location: { indoor: 'Uvnitř', outdoor: 'Venku', greenhouse: 'Skleník' },
    fill: {
      use: 'Použít tento týden',
      noWeek: 'Pro tuhle fázi plán nic nemá',
      bottleFor: 'Lahev pro {name}',
      noBottle: 'Neodečítat ze skladu',
      amountHint: 'Vyplň množství, ať se nalitá hnojiva odečtou ze skladu.',
      assign: 'Přiřadit krmný plán'
    },
    assign: {
      title: 'Krmný plán',
      plants: 'Rostliny',
      noPlants: 'Zatím žádné rostoucí rostliny.',
      pickPlant: 'Vyber aspoň jednu rostlinu.',
      schedule: 'Plán',
      strength: 'Síla',
      water: 'Voda na jedno hnojení',
      strengthHint: 'Hodně pěstitelů začíná na 50–75 % tabulky a přidává, až rostliny vypadají hladově.',
      autoHint: 'Autoflowery se obvykle hnojí slaběji, kolem 50–75 % tabulky. Výrobci pro ně samostatná čísla neuvádějí.',
      preview: '{name} tento týden: {week}',
      saved: { one: 'Plán přiřazen', few: 'Plán přiřazen {n} rostlinám', other: 'Plán přiřazen {n} rostlinám' }
    },
    editor: {
      title: 'Vlastní plán',
      brand: 'Značka',
      brandPlaceholder: 'např. Moje směs',
      brandError: 'Pojmenuj plán.',
      line: 'Řada',
      media: 'Substrát',
      products: 'Produkty',
      productPlaceholder: 'např. Grow A',
      productName: 'Název produktu {n}',
      removeProduct: 'Odebrat produkt {n}',
      addProduct: 'Přidat produkt',
      productsError: 'Přidej aspoň jeden produkt.',
      weeks: 'Týdny',
      weeksHint: 'Dávky v ml na litr. Když se produkt ten týden nepoužívá, nech pole prázdné.',
      phaseOf: 'Fáze týdne {n}',
      removeWeek: 'Odebrat: {week}',
      addWeek: 'Přidat týden',
      saved: 'Plán uložen'
    },
    plan: {
      title: 'Krmný plán',
      empty: 'Vyber značku hnojiv a appka ukáže dávku na tento týden a vyplní ji do záznamu hnojení.',
      assign: 'Vybrat plán',
      log: 'Zapsat hnojení',
      repeated: 'opakuje se poslední týden plánu'
    },
    week: {
      title: 'Hnojení tento týden',
      plans: 'Plány',
      log: 'Zapsat',
      logFor: 'Zapsat hnojení: {name}',
      fed: 'Pohnojeno {when}',
      more: '+{n} další'
    },
    costs: {
      title: 'Náklady',
      open: 'Podrobnosti',
      start: 'Začít sledovat',
      spent: 'Utraceno vč. proudu',
      power: 'Elektřina',
      perGram: 'Cena za gram',
      gpw: 'Nejlepší g/W',
      empty: 'Zapisuj, kolik tě stála semínka, hnojiva a elektřina, a po sklizni uvidíš cenu za gram.'
    },
    links: {
      title: 'Správa pěstování',
      low: { one: 'dochází {n}', few: 'dochází {n}', other: 'dochází {n}' },
      feeding: { title: 'Krmné plány', desc: 'Týdenní dávky BioBizz, CANNA, Plagron…' },
      costs: { title: 'Náklady a elektřina', desc: 'Výdaje, kWh a cena za gram' },
      inventory: { title: 'Sklad', desc: 'Semínka, hnojiva a substrát' },
      legal: { title: 'Zákonné limity', desc: 'Limity rostlin a množství v ČR a DE' }
    },
    legal: {
      settingsTitle: 'Zákonné limity',
      settingsHint: 'Na přehledu upozorní, když rostliny nebo uskladněná sklizeň překročí limit pro pěstování doma, nebo když se sklizeň k limitu blíží. Jen pro informaci.',
      details: 'Podrobnosti',
      countries: { cz: 'Česko', de: 'Německo', none: 'Vypnuto' },
      disclaimer: 'Jen pro informaci, nejde o právní radu. Pravidla ověřena {date}. Zákony se mění, vždy si ověř oficiální znění.',
      short: 'Jen pro informaci, nejde o právní radu.',
      nearGramsTitle: 'Uskladněná sklizeň se blíží limitu',
      overTitle: 'Překračuješ limit pro pěstování doma',
      summary: 'Rostliny {plants}/{plantLimit} · doma {grams}/{gramLimit} g',
      level: { ok: 'V rámci limitů', near: 'Na limitu nebo těsně pod ním', over: 'Nad limitem' }
    }
  }
}
