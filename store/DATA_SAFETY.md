# Data safety: odpovědi pro Play Console

Odvozeno z kódu a rozhodnutí vlastníka k 13. 10. 2026. Pokud se změní, co aplikace posílá, uprav i tento soubor a `public/privacy.html`.

## Kam data tečou

| Cíl | Co se posílá | Kdy | Uloženo? |
|---|---|---|---|
| Nikam (jen zařízení) | Rostliny, záznamy, úkoly, fotky (IndexedDB), nastavení, historie AI chatu, data widgetů, BLE čidla | vždy | jen v zařízení |
| Home Assistant uživatele | Dotazy na senzory, přímo na adresu, kterou uživatel zadá | jen když ho připojí | ne u nás |
| Supabase Auth + Google OAuth | Google ID, e-mail, jméno, obrázek | přihlášení | ano, do smazání účtu |
| Supabase DB + Storage (EU) | Profil, zveřejněný obsah, fotky (bucket `media`, EXIF odstraní re-encode přes canvas), nahlášení, blokování, `accepted_terms_at` | po přihlášení | ano, do smazání |
| Supabase Edge Function `chat` → Google Gemini API (placený tier) → Cloudflare Workers AI → model na počítači vývojáře | Otázka, historie konverzace, volitelná fotka (zmenšená, bez EXIF), souhrn deníku rostliny. Bez ID uživatele | dotaz na AI (vyžaduje přihlášení) | ne (ephemeral) |
| Supabase rate limit | IP a user ID v paměti funkce, denní počítadlo na user ID v `private.ai_usage` | dotaz na AI | IP/ID krátce v paměti, počítadlo v DB |
| Supabase `kb-search` | Text otázky | dotaz na AI | ne |
| Supabase `report-ai` | Otázka, odpověď, poznámka, user ID | nahlášení AI odpovědi | ano, pro moderaci |
| Supabase `deletion-request` | Kontakt, přezdívka, poznámka | webový formulář | ano, do vyřízení |
| Open-Meteo | Hledaný název místa (geokódování), souřadnice zaokrouhlené na 0,1° (předpověď) | počasí, volitelné | ne u nás |
| Google ML Kit (barcode scanning) | Diagnostika, údaje o výkonu, info o zařízení a aplikaci, ID instalace ([disclosure](https://developers.google.com/ml-kit/android-data-disclosure)) | skenování QR | u Googlu |
| Android SpeechRecognizer (obvykle Google) | Hlas, zpracuje systémová služba, aplikace dostane jen text | hlasové zadávání | ne u nás |
| upload.wikimedia.org, lh3.googleusercontent.com | Jen IP při načítání obrázků (fotky odrůd, Google avatary) | knihovna odrůd, komunita | ne u nás |
| Cloudflare (hosting webu) | IP | web a webová verze | ne u nás |

Bez reklam, bez vlastní analytiky, crash reportingu a Firebase. Bez GPS (oprávnění k poloze jen do Androidu 11 kvůli BLE skenu, `neverForLocation` od Androidu 12).

## Formulář

**Does your app collect or share any of the required user data types?** Ano

**Is all of the user data collected by your app encrypted in transit?** Ano (vše přes HTTPS; výjimka je jen Home Assistant na adrese, kterou zadá uživatel, a to data vývojáři neposílá)

**Which of the following methods of account creation does your app support?** OAuth (Sign in with Google). Účet je volitelný, deník funguje bez něj.

**Do you provide a way for users to request that their data is deleted?** Ano
- V aplikaci: Nastavení → Účet → Smazat účet
- Web: https://budbuddy.hribal.site/delete-account.html (formulář → `deletion-request`)

**Is any data shared with third parties?** Ne. Supabase, Google (Gemini API na placeném tieru, OAuth, ML Kit), Cloudflare a Open-Meteo jsou poskytovatelé služeb, kteří data zpracovávají jménem aplikace. Záložní model na počítači vývojáře provozuje vývojář sám, není to třetí strana.

### Datové typy

Collected = Ano u všech níže, Shared = Ne u všech.

| Kategorie → typ | Ephemeral? | Required / optional | Účely | Poznámka |
|---|---|---|---|---|
| Personal info → **Email address** | Ne | Optional | Account management | Google přihlášení, nikdy veřejně |
| Personal info → **Name** | Ne | Optional | App functionality, Account management | jméno z Google účtu jako zobrazované jméno, lze změnit |
| Personal info → **User IDs** | Ne | Optional | App functionality, Account management, Fraud prevention, security, and compliance | Google/Supabase ID, uživatelské jméno; ID i v denním počítadle AI a v nahlášeních |
| Photos and videos → **Photos** | Ne | Optional | App functionality | fotky v příspěvcích, veřejných rostlinách, výzvách a avatar. Fotky pro AI jsou ephemeral, ale typ se deklaruje jednou, takže celkově „Ne“ |
| App activity → **App interactions** | Ne | Optional | App functionality | lajky, reakce, uložené příspěvky, sledování, hlasy |
| App activity → **Other user-generated content** | Ne | Optional | App functionality, Fraud prevention, security, and compliance | příspěvky, komentáře, tipy, reporty odrůd, veřejné rostliny, nahlášení obsahu i AI odpovědí, žádosti z formuláře. Dotazy na AI a souhrn deníku jsou ephemeral |
| Location → **Approximate location** | Ano | Optional | App functionality | jen souřadnice místa pro počasí zaokrouhlené na 0,1° (~10 km), které si uživatel vybere; neukládá se u nás |
| App info and performance → **Diagnostics** | Ne | Required | Analytics | ML Kit posílá Googlu diagnostiku a údaje o výkonu, uživatel to nemůže vypnout |
| Device or other IDs → **Device or other IDs** | Ne | Required | Analytics | ML Kit per-installation ID |

Pozn. k ML Kit: Google na stránce disclosure uvádí, co přesně deklarovat. Před odesláním formuláře to porovnej s aktuální verzí stránky (účely a „required“).

### Nedeklarovat (a proč)
- **Audio**: hlas zpracuje systémová služba rozpoznávání řeči, aplikace zvuk nedostane ani nikam neposílá. Uvedeno v zásadách.
- **Precise location**: aplikace GPS nepoužívá; EXIF se před nahráním odstraňuje.
- **Search history / Web browsing**: hledání místa jde do Open-Meteo jen kvůli výsledku, není to historie vyhledávání ukládaná vývojářem.
- **IP adresa** sama o sobě není v Play datový typ; rate limit ji drží jen krátce v paměti.
- Health, Financial, Messages, Contacts, Calendar, Files and docs: nic z toho se neposílá.

## Poznámky
- `android:allowBackup="true"`: systémová záloha Google může obsahovat lokální deník. Nepočítá se jako sběr vývojářem, ale je uvedená v zásadách.
- Gemini musí zůstat na **placeném tieru**. Kdyby klíč spadl na free tier, Google smí prompty použít ke zlepšování produktů a u „Photos“ a „Other user-generated content“ by se muselo zaškrtnout i *Shared*.
- Pokud přibude analytika, crash reporting nebo FCM, je potřeba formulář aktualizovat **před** vydáním.
