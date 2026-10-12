# Google Play: checklist pro BudBuddy (eu.budbuddy.app)

Stav k 12. 10. 2026. ✅ hotovo · 🔧 potřeba práce v kódu · 👤 akce uživatele v Play Console

## Technické požadavky

| Požadavek | Pravidlo | Stav |
|---|---|---|
| Cílové API | Od 31. 8. 2026 musí nové aplikace i aktualizace cílit na **API 36** (Android 16). Prodloužení šlo získat nejpozději do 1. 11. 2026. | ✅ `compileSdk`/`targetSdk` 36, AGP 8.9.1, Gradle 8.11.1, všechny pluginy Capacitor 7 se přeložily |
| Velikost AAB | Base modul ≤ 500 MB (komprimovaný download), asset pack ≤ 1,5 GB, install-time celkem ≤ 4 GB. Samostatné APK ≤ 100 MB. | ✅ release AAB 11 MB, odhad stažení ~10,5 MB. Bez `public/ai` (`-PnoAi`), viz `AI_PACK.md` |
| 16 KB stránky paměti | Platí pro aplikace s nativními knihovnami. Aktualizace bez podpory nepůjde vydat od 1. 2. 2027. | ✅ v AAB nejsou žádné `.so` |
| Edge-to-edge (Android 15+), u API 36 bez možnosti opt-outu | WebView nesmí zalézat pod systémové lišty. | ✅ `adjustMarginsForEdgeToEdge: 'force'`, tmavé pozadí okna a světlé ikony lišt. ⚠️ Na zařízení neověřeno, emulátor není |
| Predictive back (API 36) | `onBackPressed` se už nevolá. | ✅ plugin App používá `OnBackPressedDispatcher`. ⚠️ Na zařízení neověřeno |
| Velké displeje (API 36) | Systém ignoruje zámek orientace. | ✅ aplikace orientaci nezamyká |
| Přesné alarmy | `USE_EXACT_ALARM` jen pro budíky a kalendáře. `SCHEDULE_EXACT_ALARM` je od Androidu 14 ve výchozím stavu zakázaný. | ✅ aplikace nedeklaruje žádné. Plugin pak plánuje nepřesný alarm, takže připomínka může přijít o pár minut později |
| Fotky a videa | `READ_MEDIA_*` jen tehdy, když nestačí systémový výběr. | ✅ žádné `READ_MEDIA_*` ani `CAMERA`. Galerie jde přes systémový výběr souborů, foťák přes `ACTION_IMAGE_CAPTURE` |
| Foreground služby | Typ musí být deklarovaný v Console. | ✅ aplikace žádné nemá |
| Notifikace (Android 13+) | `POST_NOTIFICATIONS` se musí vyžádat za běhu. | ✅ `requestPermissions()` v onboardingu i v Nastavení (`useReminders.ts`). ⚠️ Na zařízení neověřeno |
| Oprávnění v merged manifestu | — | ✅ INTERNET, VIBRATE, RECEIVE_BOOT_COMPLETED a WAKE_LOCK (obnova připomínek po restartu), POST_NOTIFICATIONS. Nic nadbytečného |
| Deep link `budbuddy://app/auth-callback` | — | ✅ intent-filter VIEW/BROWSABLE, `singleTask`, obsluha `appUrlOpen` |
| Ikona | — | ✅ adaptivní ikona a nově i monochromatická vrstva pro tematické ikony (Android 13+) |
| versionCode | — | ✅ CI: `yyDDDnn`, kde nn je číslo běhu. Lokálně stejný prefix a nn je čtvrthodina dne, takže už nikdy nespadne na 1 |
| Podepsaný AAB | — | ✅ `bundleRelease` s podpisem přes stejné env proměnné. V CI je samostatný artefakt `play-bundle-*` s kontrolou, že AAB neobsahuje AI balíček |
| Technická kvalita | Od 2/2027 se vyžaduje optimalizace DEX nad 10 MB. | ✅ DEX má 7,4 MB |

## Obsahové zásady

| Zásada | Pravidlo | Stav |
|---|---|---|
| Marihuana | Zakázané je usnadňovat prodej (košík, doručení, domluva vyzvednutí, THC produkty). Deník pěstování zákaz výslovně nezmiňuje. | ✅ aplikace nic neprodává. Serverový filtr blokuje kontakty a slova typu koupím/prodám a v nahlášení je důvod „sale“. Riziko: recenzent může cannabis aplikaci posoudit přísně. Proto 18+, právní upozornění a žádné nákupní formulace v listingu |
| Generativní AI | Chatbot, který je hlavní funkcí, musí mít **nahlášení urážlivé AI odpovědi přímo v aplikaci**. | 🔧 **Chybí.** U odpovědi jsou jen tlačítka kopírovat, znovu a zdroje. Patří do AI session (`ai-assistant.vue`), požadavek je v `requests-play.md` |
| AI a osobní data třetí strany | Zásady User Data platí i pro AI API třetích stran (aktualizace 15. 7. 2026). | 👤 Ověř, že klíč Gemini **není na free tieru**. Free tier dovoluje Googlu použít prompty ke zlepšování produktů, a pak by šlo o „sdílení“, ne o zpracovatele |
| UGC | Před tvorbou obsahu souhlas s podmínkami, nahlášení i blokování v aplikaci a průběžná moderace. | ✅ checkbox s podmínkami a 18+ při prvním přihlášení, `ReportMenu` (7 typů obsahu), blokování, automatické skrytí po 3 nahlášeních, admin panel. 👤 Moderovat je potřeba skutečně a průběžně |
| Smazání účtu | V aplikaci i přes webový odkaz. | ✅ Nastavení → Účet → Smazat účet a dále https://budbuddy.hribal.site/delete-account.html |
| Zásady ochrany OÚ | Odkaz v Console i v aplikaci. | ✅ https://budbuddy.hribal.site/privacy.html. Dnes jsem opravil nepřesnosti: jméno a fotka z Googlu, úplný seznam ukládaných dat, IP adresa na Netlify, Android záloha a to, že AI odpovědi vždy jdou přes Gemini |
| Data safety | Musí odpovídat kódu. | 👤 vyplnit podle `DATA_SAFETY.md` |
| Hodnocení obsahu (IARC) | Aplikace bez hodnocení nejsou povolené. | 👤 vyplnit podle `CONTENT_RATING.md` |
| Cílové publikum | — | 👤 jen 18+ a „neláká děti“ |

## Účet a vydání

| Krok | Pravidlo | Stav |
|---|---|---|
| Uzavřené testování | Osobní účty založené po 13. 11. 2023: **12 testerů, 14 dní nepřetržitě**, teprve potom lze žádat o produkci. | 👤 sehnat 12 testerů (Google účty), nahrát AAB do Closed testing, počkat 14 dní a pak požádat o produkci |
| Play App Signing | — | 👤 při prvním nahrání zapnout. `budbuddy-upload.jks` je upload klíč. **Zálohuj** keystore i heslo mimo počítač |
| Ověření vývojáře | Play registruje aplikace automaticky, neregistrované hrozí stažení. | 👤 v Console zkontrolovat stav registrace balíčku `eu.budbuddy.app` |
| App access | Komunita vyžaduje přihlášení. | 👤 do pokynů napsat: „Deník funguje bez účtu. Komunita: přihlášení libovolným Google účtem.“ |
| Reklamy | — | 👤 deklarovat „Bez reklam“ |
| Kontakt | — | 👤 vyplnit veřejný kontaktní e-mail vývojáře (povinné) |
| Listing a grafika | — | ✅ `store/listing/{cs,en}.md`, `store/graphics/` (ikona 512, feature graphic cs/en) a `store/screenshots/{cs,en}/` (7× 1080×2400) |

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
