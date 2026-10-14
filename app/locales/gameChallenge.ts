export default {
  en: {
    title: 'Shadow Challenge',
    subtitle: 'One strain, one setup, one week',
    week: 'Week {n}',
    timeLeft: '{d} d {h} h left',
    hoursLeft: '{h} h left',
    ended: 'Closed',
    setup: '{medium}, {pot} L pot',
    medium: { soil: 'Soil', coco: 'Coco', hydro: 'Hydro' },
    rules: 'Everyone grows the same strain in the same tent this week. When your harvest is cured, the server replays your log and scores it, so the board only lists verified runs.',
    start: 'Start this week\'s run',
    shortTime: 'A run takes about 30 real hours from seed to jar. Less is left this week, so this one may not finish in time.',
    separate: 'The run has its own tent and coins. Your farm is not touched.',
    loadError: 'This week\'s challenge did not load. Check the connection and try again.',
    retry: 'Try again',
    locked: {
      title: 'Opens at level {n}',
      text: 'Grow on your farm until level {n}, then join the weekly run.'
    },
    stale: {
      title: 'Your run from {week} has closed',
      text: 'Its log can no longer be submitted. Clear it to start this week\'s run.',
      clear: 'Clear old run'
    },
    stage: {
      germination: 'Germinating',
      seedling: 'Seedling',
      veg: 'Vegetative',
      flower: 'Flowering',
      ripening: 'Ripening',
      harvested: 'Harvested',
      dead: 'Dead'
    },
    play: {
      title: 'Your run',
      day: 'Day {n}',
      health: 'Health {n} %',
      coins: '{n} coins',
      pot: { dry: 'Pot feels light', moist: 'Pot feels moist', wet: 'Pot feels heavy' },
      signs: 'What you notice',
      noSigns: 'Nothing unusual on the leaves.',
      readings: 'Meters',
      water: 'Water',
      flush: 'Flush',
      train: 'Train',
      treat: 'Treat',
      climate: 'Climate',
      flip: 'Switch to 12/12',
      harvest: 'Harvest',
      flushed: 'Flushed with plain water',
      watered: 'Watered',
      dead: 'The plant died, so this run cannot reach the board. Clear it and start again.',
      clear: 'Clear run'
    },
    water: {
      title: 'Water',
      liters: 'Amount',
      litersValue: '{n} L',
      ph: 'pH of the water',
      feed: 'Nutrients',
      noFeed: 'No nutrients in stock for this run.',
      dose: 'Dose per liter',
      doseValue: '{n} ml',
      confirm: 'Water now'
    },
    trainSheet: {
      title: 'Train',
      top: 'Top the main stem',
      lst: 'Bend and tie down',
      defoliate: 'Remove big fan leaves',
      done: 'Done'
    },
    treatSheet: {
      title: 'Treat',
      none: 'No treatments unlocked in this run yet.',
      price: '{n} coins',
      owned: 'In stock: {n}',
      apply: 'Apply'
    },
    climateSheet: {
      title: 'Climate',
      temp: 'Temperature (°C)',
      rh: 'Humidity (%)',
      save: 'Set climate',
      saved: 'Climate set'
    },
    drying: {
      title: 'Drying',
      moisture: 'Moisture {n} %',
      set: 'Set drying room',
      jar: 'Move to jars'
    },
    jars: {
      title: 'Curing',
      rh: 'Jar humidity {n} %',
      burp: 'Burp',
      finish: 'Finish cure',
      burped: 'Jar burped'
    },
    submit: {
      title: 'Run complete',
      text: 'Your harvest is cured. Submit the log so the server can replay it and give you a verified score.',
      button: 'Submit for scoring',
      busy: 'Replaying your run',
      local: 'Score on this device: {n}'
    },
    result: {
      title: 'Verified score',
      quality: 'Quality',
      dry: 'Dry weight',
      rank: 'Place',
      gValue: '{n} g',
      qValue: '{n} %',
      kept: 'Lower than your best, so the board keeps {n}.',
      coins: '{n} coins added to your farm',
      again: 'Grow it again',
      againTitle: 'Start a new run?',
      againText: 'This clears the run on this device. Your verified best stays on the board.',
      againOk: 'Start over'
    },
    err: {
      auth_required: 'Sign in to submit your run.',
      closed: 'This week\'s challenge has closed.',
      too_fast: 'The log covers more game time than has passed this week, so it was not accepted.',
      unfinished: 'The server found no cured harvest in this log.',
      replay_failed: 'The server could not replay this log.',
      quota: 'Too many submits. Try again in a few minutes.',
      banned: 'This account cannot take part.',
      network: 'No connection. Your run is saved, submit it when you are back online.',
      generic: 'Submitting failed. Your run is saved, try again.'
    },
    board: {
      title: 'Leaderboard',
      meta: 'Top 50',
      signedOutTitle: 'Sign in to see the board',
      signedOutText: 'Scores are tied to accounts so every run on the board is verified.',
      signIn: 'Sign in',
      emptyTitle: 'No verified runs yet',
      emptyText: 'Finish and submit a run this week and yours opens the board.',
      error: 'The leaderboard did not load.',
      you: 'You',
      yourPlace: 'Your place',
      row: '{q} % quality, {g} g',
      label: 'Leaderboard for {week}'
    }
  },
  cs: {
    title: 'Stínová výzva',
    subtitle: 'Jedna odrůda, jedna sestava, jeden týden',
    week: '{n}. týden',
    timeLeft: 'zbývá {d} d {h} h',
    hoursLeft: 'zbývá {h} h',
    ended: 'Uzavřeno',
    setup: '{medium}, květináč {pot} l',
    medium: { soil: 'Hlína', coco: 'Kokos', hydro: 'Hydro' },
    rules: 'Tento týden všichni pěstují stejnou odrůdu ve stejném stanu. Až sklizeň dozraje ve sklenici, server tvůj záznam přehraje a oboduje, takže v žebříčku jsou jen ověřené pokusy.',
    start: 'Začít pokus na tento týden',
    shortTime: 'Pokus trvá od semínka po sklenici zhruba 30 skutečných hodin. Do konce týdne zbývá méně, takže to nemusíš stihnout.',
    separate: 'Pokus má vlastní stan i mince. Tvoje farma zůstane, jak je.',
    loadError: 'Výzva na tento týden se nenačetla. Zkontroluj připojení a zkus to znovu.',
    retry: 'Zkusit znovu',
    locked: {
      title: 'Otevře se na úrovni {n}',
      text: 'Pěstuj na farmě do úrovně {n}, pak se můžeš zapojit do týdenní výzvy.'
    },
    stale: {
      title: 'Pokus z týdne {week} je uzavřený',
      text: 'Jeho záznam už nejde odeslat. Smaž ho a začni tento týden.',
      clear: 'Smazat starý pokus'
    },
    stage: {
      germination: 'Klíčí',
      seedling: 'Semenáček',
      veg: 'Růst',
      flower: 'Kvetení',
      ripening: 'Dozrávání',
      harvested: 'Sklizeno',
      dead: 'Uhynula'
    },
    play: {
      title: 'Tvůj pokus',
      day: '{n}. den',
      health: 'Zdraví {n} %',
      coins: '{n} mincí',
      pot: { dry: 'Květináč je lehký', moist: 'Květináč je vlhký', wet: 'Květináč je těžký' },
      signs: 'Čeho si všímáš',
      noSigns: 'Na listech nic neobvyklého.',
      readings: 'Měřáky',
      water: 'Zalít',
      flush: 'Propláchnout',
      train: 'Tvarovat',
      treat: 'Ošetřit',
      climate: 'Klima',
      flip: 'Přepnout na 12/12',
      harvest: 'Sklidit',
      flushed: 'Propláchnuto čistou vodou',
      watered: 'Zalito',
      dead: 'Rostlina uhynula, tenhle pokus se do žebříčku nedostane. Smaž ho a začni znovu.',
      clear: 'Smazat pokus'
    },
    water: {
      title: 'Zalít',
      liters: 'Množství',
      litersValue: '{n} l',
      ph: 'pH vody',
      feed: 'Hnojiva',
      noFeed: 'V tomto pokusu nemáš žádná hnojiva.',
      dose: 'Dávka na litr',
      doseValue: '{n} ml',
      confirm: 'Zalít teď'
    },
    trainSheet: {
      title: 'Tvarovat',
      top: 'Zaštípnout hlavní stonek',
      lst: 'Ohnout a vyvázat',
      defoliate: 'Odstranit velké listy',
      done: 'Hotovo'
    },
    treatSheet: {
      title: 'Ošetřit',
      none: 'V tomto pokusu zatím nemáš odemčené žádné ošetření.',
      price: '{n} mincí',
      owned: 'Skladem: {n}',
      apply: 'Použít'
    },
    climateSheet: {
      title: 'Klima',
      temp: 'Teplota (°C)',
      rh: 'Vlhkost (%)',
      save: 'Nastavit klima',
      saved: 'Klima nastaveno'
    },
    drying: {
      title: 'Sušení',
      moisture: 'Vlhkost {n} %',
      set: 'Nastavit sušárnu',
      jar: 'Přesunout do sklenic'
    },
    jars: {
      title: 'Zrání',
      rh: 'Vlhkost ve sklenici {n} %',
      burp: 'Odvětrat',
      finish: 'Dokončit zrání',
      burped: 'Sklenice odvětrána'
    },
    submit: {
      title: 'Pokus dokončen',
      text: 'Sklizeň dozrála. Odešli záznam, server ho přehraje a dá ti ověřené skóre.',
      button: 'Odeslat k hodnocení',
      busy: 'Přehrávám tvůj pokus',
      local: 'Skóre v tomto zařízení: {n}'
    },
    result: {
      title: 'Ověřené skóre',
      quality: 'Kvalita',
      dry: 'Suchá váha',
      rank: 'Místo',
      gValue: '{n} g',
      qValue: '{n} %',
      kept: 'Méně než tvoje nejlepší, v žebříčku zůstává {n}.',
      coins: 'Na farmu připsáno {n} mincí',
      again: 'Pěstovat znovu',
      againTitle: 'Začít nový pokus?',
      againText: 'Pokus v tomto zařízení se smaže. Tvoje ověřené nejlepší skóre v žebříčku zůstane.',
      againOk: 'Začít znovu'
    },
    err: {
      auth_required: 'Pro odeslání pokusu se přihlas.',
      closed: 'Výzva na tento týden už je uzavřená.',
      too_fast: 'Záznam pokrývá víc herního času, než tento týden uplynulo, proto nebyl přijat.',
      unfinished: 'Server v záznamu nenašel dozrálou sklizeň.',
      replay_failed: 'Server tento záznam nedokázal přehrát.',
      quota: 'Příliš mnoho odeslání. Zkus to za pár minut.',
      banned: 'Tento účet se nemůže zapojit.',
      network: 'Chybí připojení. Pokus je uložený, odešli ho, až budeš online.',
      generic: 'Odeslání selhalo. Pokus je uložený, zkus to znovu.'
    },
    board: {
      title: 'Žebříček',
      meta: 'Nejlepších 50',
      signedOutTitle: 'Žebříček uvidíš po přihlášení',
      signedOutText: 'Skóre patří k účtům, takže každý pokus v žebříčku je ověřený.',
      signIn: 'Přihlásit se',
      emptyTitle: 'Zatím žádné ověřené pokusy',
      emptyText: 'Dokonči a odešli pokus tento týden a žebříček otevřeš ty.',
      error: 'Žebříček se nenačetl.',
      you: 'Ty',
      yourPlace: 'Tvoje místo',
      row: 'kvalita {q} %, {g} g',
      label: 'Žebříček za {week}'
    }
  }
}
