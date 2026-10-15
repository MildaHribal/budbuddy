# Google Play: checklist pro BudBuddy (eu.budbuddy.app)

Stav k 13. 10. 2026. ✅ hotovo · 🔧 potřeba práce v kódu · 👤 akce vlastníka (Play Console apod.)

## Technické požadavky

| Požadavek | Pravidlo | Stav |
|---|---|---|
| Cílové API | Od 31. 8. 2026 musí nové aplikace i aktualizace cílit na **API 36** (Android 16). Prodloužení šlo získat nejpozději do 1. 11. 2026. | ✅ `compileSdk`/`targetSdk` 36, AGP 8.9.1, Gradle 8.11.1, všechny pluginy Capacitor 7 se přeložily |
| Velikost AAB | Base modul ≤ 500 MB (komprimovaný download), asset pack ≤ 1,5 GB, install-time celkem ≤ 4 GB. Samostatné APK ≤ 100 MB. | ✅ release AAB 11 MB, odhad stažení ~10,5 MB. Bez `public/ai` (`-PnoAi`), viz `AI_PACK.md` |
| 16 KB stránky paměti | Platí pro aplikace s nativními knihovnami. Aktualizace bez podpory nepůjde vydat od 1. 2. 2027. | 🔧 AAB už obsahuje nativní `.so` (ML Kit barcode scanning, BLE apod.). Zarovnání na 16 KB se opravuje; před nahráním ověř `zipalign -c -P 16 -v 4` na APK z bundletoolu nebo v Play Console → App bundle explorer |
| Edge-to-edge (Android 15+), u API 36 bez možnosti opt-outu | WebView nesmí zalézat pod systémové lišty. | ✅ `adjustMarginsForEdgeToEdge: 'force'`, tmavé pozadí okna a světlé ikony lišt. ⚠️ Na zařízení neověřeno, emulátor není |
| Predictive back (API 36) | `onBackPressed` se už nevolá. | ✅ plugin App používá `OnBackPressedDispatcher`. ⚠️ Na zařízení neověřeno |
| Velké displeje (API 36) | Systém ignoruje zámek orientace. | ✅ aplikace orientaci nezamyká |
| Přesné alarmy | `USE_EXACT_ALARM` jen pro budíky a kalendáře. `SCHEDULE_EXACT_ALARM` je od Androidu 14 ve výchozím stavu zakázaný. | ✅ aplikace nedeklaruje žádné. Plugin pak plánuje nepřesný alarm, takže připomínka může přijít o pár minut později |
| Fotky a videa | `READ_MEDIA_*` jen tehdy, když nestačí systémový výběr. | ✅ žádné `READ_MEDIA_*`. Galerie jde přes systémový výběr souborů, běžná fotka přes `ACTION_IMAGE_CAPTURE`. `CAMERA` je deklarovaná kvůli „ghost camera“ (živý náhled s překryvem předchozí fotky pro timelapse), vyžádá se až při jejím otevření; `android.hardware.camera` je `required=false` |
| Foreground služby | Typ musí být deklarovaný v Console. | ✅ aplikace žádné nemá |
| Notifikace (Android 13+) | `POST_NOTIFICATIONS` se musí vyžádat za běhu. | ✅ `requestPermissions()` v onboardingu i v Nastavení (`useReminders.ts`). ⚠️ Na zařízení neověřeno |
| Oprávnění v merged manifestu | — | ✅ INTERNET, VIBRATE, RECEIVE_BOOT_COMPLETED a WAKE_LOCK (obnova připomínek po restartu), POST_NOTIFICATIONS, CAMERA (ghost camera), RECORD_AUDIO (hlasové zadávání, plugin speech-recognition), BLUETOOTH_SCAN s `neverForLocation` a BLUETOOTH_CONNECT (BLE teploměry), ACCESS_FINE/COARSE_LOCATION jen `maxSdkVersion=30` (BLE sken na Androidu ≤ 11). 👤 Po každém buildu zkontroluj merged manifest, ať nic nepřibylo |
| Deep link `budbuddy://app/auth-callback` | — | ✅ intent-filter VIEW/BROWSABLE, `singleTask`, obsluha `appUrlOpen` |
| Ikona | — | ✅ adaptivní ikona a nově i monochromatická vrstva pro tematické ikony (Android 13+) |
| versionCode | — | ✅ CI: `yyDDDnn`, kde nn je číslo běhu. Lokálně stejný prefix a nn je čtvrthodina dne, takže už nikdy nespadne na 1 |
| Podepsaný AAB | — | ✅ `bundleRelease` s podpisem přes stejné env proměnné. V CI je samostatný artefakt `play-bundle-*` s kontrolou, že AAB neobsahuje AI balíček |
| Technická kvalita | Od 2/2027 se vyžaduje optimalizace DEX nad 10 MB. | ✅ DEX má 7,4 MB |

## Obsahové zásady

| Zásada | Pravidlo | Stav |
|---|---|---|
| Marihuana | Zakázané je usnadňovat prodej (košík, doručení, domluva vyzvednutí, THC produkty). Deník pěstování zákaz výslovně nezmiňuje. | ✅ aplikace nic neprodává. Serverový filtr blokuje kontakty a slova typu koupím/prodám a v nahlášení je důvod „sale“. Riziko: recenzent může cannabis aplikaci posoudit přísně. Proto 18+, právní upozornění a žádné nákupní formulace v listingu |
| Generativní AI | Chatbot, který je hlavní funkcí, musí mít **nahlášení urážlivé AI odpovědi přímo v aplikaci**. | ✅ Nahlášení odpovědi existuje (`app/ai/report.ts` → Edge Function `report-ai`, ukládá otázku, odpověď, poznámku a user ID). AI nově vyžaduje přihlášení Googlem a má denní limit na uživatele (`private.ai_usage`) |
| AI a osobní data třetí strany | Zásady User Data platí i pro AI API třetích stran (aktualizace 15. 7. 2026). | ✅ Gemini běží na placeném tieru (billing s kredity), Google tedy prompty nepoužívá ke zlepšování produktů. Řetězec: Supabase Edge Function (EU) → Gemini → Cloudflare Workers AI → model na počítači vývojáře. Popsáno v `privacy.html` §4. 👤 Hlídej, ať billing nespadne (po vyčerpání kreditů by klíč přestal fungovat nebo by se musel přepnout na free tier, a to by znamenalo „Shared“ v Data safety) |
| UGC | Před tvorbou obsahu souhlas s podmínkami, nahlášení i blokování v aplikaci a průběžná moderace. | ✅ checkbox s podmínkami a 18+ při prvním přihlášení, `ReportMenu` (7 typů obsahu), blokování, automatické skrytí po 3 nahlášeních, admin panel. 👤 Moderovat je potřeba skutečně a průběžně |
| Smazání účtu | V aplikaci i přes webový odkaz. | ✅ Nastavení → Účet → Smazat účet a webový formulář na https://budbuddy.hribal.site/delete-account.html (POST na Edge Function `deletion-request`). GitHub issue už je jen vedlejší možnost. 👤 Ověř, že funkce `deletion-request` je nasazená a že ti žádosti chodí; vyřizuj je do 30 dnů |
| Zásady ochrany OÚ | Odkaz v Console i v aplikaci. | ✅ https://budbuddy.hribal.site/privacy.html, odkaz je v přihlášení i v patičce Nastavení (zásady, podmínky, smazání účtu / kontakt). Zásady 13. 10. 2026 přepsány: Supabase místo Netlify, AI jen po přihlášení a placený Gemini, Open-Meteo (0,1°), ML Kit, rozpoznávání řeči, Wikimedia a Google avatary, Cloudflare hosting, tabulka zpracovatelů, právní základ a doba uložení, kontakt přes formulář. 👤 Po nasazení webu zkontroluj, že je online nová verze |
| Data safety | Musí odpovídat kódu. | 👤 vyplnit podle `DATA_SAFETY.md` (přepsáno 13. 10.: přibyla přibližná poloha, diagnostika a ID zařízení kvůli ML Kit) |
| Hodnocení obsahu (IARC) | Aplikace bez hodnocení nejsou povolené. | 👤 vyplnit podle `CONTENT_RATING.md`. Klíčové odpovědi: drogy **ano**, interakce uživatelů / UGC **ano**, generativní AI **ano**, sdílení polohy ne, nákupy ne |
| Cílové publikum | — | 👤 jen 18+ a „neláká děti“ |
| Ukázková komunita | Recenzent nesmí narazit na falešné účty a obsah. | ✅ demo komunita je z produkce smazaná (13. 10. 2026). Screenshot `6-community` ukazuje ukázková data, to je pro listing v pořádku |
| Pokyny ke stažení semen | Nepropagovat nákup tam, kde je nelegální. | ✅ průvodce: „Get seeds from a reputable breeder where this is legal“ místo „Buy from a reputable seed bank“ |

## Účet a vydání

| Krok | Pravidlo | Stav |
|---|---|---|
| Uzavřené testování | Osobní účty založené po 13. 11. 2023: **12 testerů, 14 dní nepřetržitě**, teprve potom lze žádat o produkci. | 👤 sehnat aspoň 12 testerů (Google účty), nahrát AAB do Closed testing, ti musí být přihlášení do testu **14 dní nepřetržitě**, pak požádat o produkční přístup (odpovědět na dotazník o testování) |
| Play App Signing | — | 👤 při prvním nahrání zapnout. `budbuddy-upload.jks` je upload klíč. **Zálohuj** keystore i heslo mimo počítač |
| Ověření vývojáře | Play registruje aplikace automaticky, neregistrované hrozí stažení. | 👤 v Console zkontrolovat stav registrace balíčku `eu.budbuddy.app` |
| App access | Komunita vyžaduje přihlášení. | 👤 do App access zvolit „Některé funkce jsou omezené“ a napsat: „On first launch the app asks for country and date of birth (age check: 21+ in Czechia and the US, 18+ elsewhere); enter any adult date. The grow journal, guide, tools and reminders work without an account. The community and the AI assistant require Sign in with Google: tap Community (or AI) → Sign in with Google, use any Google account, then choose a username and confirm you are 18+ and accept the terms. No test credentials are needed.“ |
| Reklamy | — | 👤 deklarovat „Bez reklam“ |
| Kontakt | — | 👤 vyplnit veřejný kontaktní e-mail vývojáře (Play ho vyžaduje v listingu; může to být samostatná adresa jen pro aplikaci). V zásadách a na webu je místo e-mailu formulář |
| Listing a grafika | — | ✅ `store/listing/{cs,en}.md`, `store/graphics/` (ikona 512×512 RGBA, feature graphic cs/en 1024×500 RGB bez alfy) a `store/screenshots/{cs,en}/` (7× 1080×1920, 9:16, RGB bez alfy). Původní 1080×2400 (poměr přes 2:1, Play je odmítne) jsou v `store/screenshots/_original_2400/` |

## Zdroje

- Cílové API: https://support.google.com/googleplay/android-developer/answer/11926878 · https://developer.android.com/google/play/requirements/target-sdk
- Velikosti AAB a asset packů: https://support.google.com/googleplay/android-developer/answer/9859372#size_limits · https://developer.android.com/guide/playcore/asset-delivery
- Uzavřené testování: https://support.google.com/googleplay/android-developer/answer/14151465
- Generativní AI: https://support.google.com/googleplay/android-developer/answer/13985936 · https://support.google.com/googleplay/android-developer/answer/14094294
- Marihuana: https://support.google.com/googleplay/android-developer/answer/9878810
- UGC: https://support.google.com/googleplay/android-developer/answer/9876937
- Smazání účtu: https://support.google.com/googleplay/android-developer/answer/13327111
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469 · User Data: https://support.google.com/googleplay/android-developer/answer/10144311
- Oprávnění (alarmy, fotky): https://support.google.com/googleplay/android-developer/answer/9888170 · https://developer.android.com/about/versions/14/changes/schedule-exact-alarms
- Foreground služby: https://support.google.com/googleplay/android-developer/answer/13392821
- 16 KB stránky: https://developer.android.com/guide/practices/page-sizes
- Android 16 (edge-to-edge, back, velké displeje): https://developer.android.com/about/versions/16/behavior-changes-16
- Ověření vývojáře: https://developer.android.com/developer-verification · aktualizace zásad 7/2026: https://support.google.com/googleplay/android-developer/answer/17134731
- Technická kvalita: https://support.google.com/googleplay/android-developer/answer/17492799
