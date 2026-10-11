export default {
  en: {
    reminders: {
      title: 'Reminders',
      toggle: 'Watering & task reminders',
      hint: 'A notification on days when a plant needs water or a task is due.',
      appOnly: 'Available in the Android app.',
      time: 'Remind me at',
      test: 'Send a test',
      denied: 'Notifications are blocked – allow them in the phone settings.',
      enabled: 'Reminders are on'
    },
    title: 'Settings',
    you: 'You',
    yourName: 'Your name',
    namePlaceholder: 'Used in the dashboard greeting',
    language: 'Language',
    light: {
      title: 'Light schedule',
      presets: 'Light cycle presets',
      lightsOn: 'Lights on at',
      hours: 'Hours of light',
      invalid: 'Enter a whole number from 0 to 24.',
      hint: 'Drives the light ring on the dashboard.'
    },
    data: {
      title: 'Your data',
      plants: { one: 'plant', other: 'plants' },
      entries: { one: 'entry', other: 'entries' },
      photos: { one: 'photo', other: 'photos' },
      export: 'Export backup',
      exportHint: 'One JSON file with everything, including photos',
      restore: 'Restore backup',
      restoreHint: 'Replace the current data with a backup file',
      stats: 'Statistics',
      statsHint: 'Activity, harvests and achievements',
      note: 'BudBuddy works offline and never uploads your journal – only what you send to the AI assistant leaves the device. Export a backup now and then – uninstalling the app deletes its data.'
    },
    danger: {
      title: 'Danger zone',
      demo: 'Load demo garden',
      demoHint: 'Replace your data with example plants',
      erase: 'Erase all data',
      eraseHint: 'Start from an empty garden'
    },
    about: {
      tagline: 'Grow journal · made with Nuxt & Capacitor',
      legal: 'Only grow where it is legal for you to do so.',
      credits: 'Demo garden photos (Wikimedia Commons)'
    },
    toast: {
      downloaded: 'Backup downloaded',
      exportFailed: 'Could not create the backup',
      shareFailed: 'Could not open the share sheet',
      restored: 'Restored {plants}, {entries} and {photos}',
      invalidJson: 'That file is not valid JSON',
      importFailed: 'Import failed',
      notBackup: 'That file is not a BudBuddy backup',
      skipped: { one: '{n} damaged photo was skipped', other: '{n} damaged photos were skipped' },
      demoLoaded: 'Demo garden loaded',
      erased: 'All data erased'
    },
    shareTitle: 'BudBuddy backup',
    confirm: {
      restoreTitle: 'Restore this backup?',
      restoreMessage: 'All current plants, journal entries, tasks and photos will be replaced by the backup.',
      restoreLabel: 'Restore',
      demoTitle: 'Load demo garden?',
      demoMessage: 'Your current data will be replaced with example plants. Export a backup first if you want to keep it.',
      demoLabel: 'Load demo',
      eraseTitle: 'Erase everything?',
      eraseMessage: 'This deletes all plants, journal entries, tasks, photos and AI chats from this device. It cannot be undone.',
      eraseLabel: 'Erase all'
    }
  },
  cs: {
    reminders: {
      title: 'Připomínky',
      toggle: 'Připomínat zálivku a úkoly',
      hint: 'Notifikace ve dny, kdy rostlina potřebuje zalít nebo máš úkol.',
      appOnly: 'Dostupné v aplikaci pro Android.',
      time: 'Připomenout v',
      test: 'Poslat zkušební',
      denied: 'Notifikace jsou zablokované – povol je v nastavení telefonu.',
      enabled: 'Připomínky jsou zapnuté'
    },
    title: 'Nastavení',
    you: 'Ty',
    yourName: 'Tvoje jméno',
    namePlaceholder: 'Použije se v pozdravu na přehledu',
    language: 'Jazyk',
    light: {
      title: 'Světelný režim',
      presets: 'Předvolby světelného cyklu',
      lightsOn: 'Rozsvícení v',
      hours: 'Hodin světla',
      invalid: 'Zadej celé číslo od 0 do 24.',
      hint: 'Řídí světelný kruh na přehledu.'
    },
    data: {
      title: 'Tvoje data',
      plants: { one: 'rostlina', few: 'rostliny', other: 'rostlin' },
      entries: { one: 'záznam', few: 'záznamy', other: 'záznamů' },
      photos: { one: 'fotka', few: 'fotky', other: 'fotek' },
      export: 'Exportovat zálohu',
      exportHint: 'Jeden JSON soubor se vším včetně fotek',
      restore: 'Obnovit zálohu',
      restoreHint: 'Nahradí současná data souborem zálohy',
      stats: 'Statistiky',
      statsHint: 'Aktivita, sklizně a úspěchy',
      note: 'BudBuddy funguje offline a tvůj deník nikam nenahrává – zařízení opouští jen to, co pošleš AI asistentovi. Občas si udělej zálohu – odinstalováním aplikace se data smažou.'
    },
    danger: {
      title: 'Nebezpečná zóna',
      demo: 'Načíst ukázkovou zahradu',
      demoHint: 'Nahradí tvoje data ukázkovými rostlinami',
      erase: 'Smazat všechna data',
      eraseHint: 'Začni s prázdnou zahradou'
    },
    about: {
      tagline: 'Pěstitelský deník · vytvořeno v Nuxtu a Capacitoru',
      legal: 'Pěstuj jen tam, kde je to pro tebe legální.',
      credits: 'Fotky ukázkové zahrady (Wikimedia Commons)'
    },
    toast: {
      downloaded: 'Záloha stažena',
      exportFailed: 'Zálohu se nepodařilo vytvořit',
      shareFailed: 'Nepodařilo se otevřít sdílení',
      restored: 'Obnoveno: {plants}, {entries} a {photos}',
      invalidJson: 'Soubor není platný JSON',
      importFailed: 'Import se nepovedl',
      notBackup: 'Tohle není záloha BudBuddy',
      skipped: { one: '{n} poškozenou fotku jsme přeskočili', few: '{n} poškozené fotky jsme přeskočili', other: '{n} poškozených fotek jsme přeskočili' },
      demoLoaded: 'Ukázková zahrada načtena',
      erased: 'Všechna data smazána'
    },
    shareTitle: 'Záloha BudBuddy',
    confirm: {
      restoreTitle: 'Obnovit tuto zálohu?',
      restoreMessage: 'Všechny současné rostliny, záznamy v deníku, úkoly a fotky se nahradí zálohou.',
      restoreLabel: 'Obnovit',
      demoTitle: 'Načíst ukázkovou zahradu?',
      demoMessage: 'Tvoje současná data se nahradí ukázkovými rostlinami. Jestli si je chceš nechat, nejdřív si udělej zálohu.',
      demoLabel: 'Načíst ukázku',
      eraseTitle: 'Smazat všechno?',
      eraseMessage: 'Z tohoto zařízení se smažou všechny rostliny, záznamy, úkoly, fotky i AI chaty. Nejde to vrátit.',
      eraseLabel: 'Smazat vše'
    }
  }
}
