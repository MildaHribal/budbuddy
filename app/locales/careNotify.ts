// Notification texts for drying checks and jar burping (eager: scheduled from the app plugin).
export default {
  en: {
    burpTitle: { one: 'Burp jar {names}', other: 'Burp {n} jars' },
    burpBody: 'Open for 10–15 minutes and note the hygrometer reading.',
    burpBodyList: 'Jars: {names}. Open for 10–15 minutes.',
    dryTitle: { one: 'Drying check: {names}', other: 'Drying check: {n} plants' },
    dryBody: 'Look at the hygrometer, smell the buds and try the stem test.'
  },
  cs: {
    burpTitle: { one: 'Odvětrej sklenici {names}', few: 'Odvětrej {n} sklenice', other: 'Odvětrej {n} sklenic' },
    burpBody: 'Otevři na 10–15 minut a zapiš hodnotu z vlhkoměru.',
    burpBodyList: 'Sklenice: {names}. Otevři na 10–15 minut.',
    dryTitle: { one: 'Kontrola sušení: {names}', few: 'Kontrola sušení: {n} rostliny', other: 'Kontrola sušení: {n} rostlin' },
    dryBody: 'Mrkni na vlhkoměr, přičichni k palicím a zkus test stonku.'
  }
}
