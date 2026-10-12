# Data safety: odpovědi pro Play Console

Odvozeno z kódu k 12. 10. 2026. Pokud se změní, co aplikace posílá, uprav i tento soubor.

## Kam data tečou

| Cíl | Co se posílá | Kdy |
|---|---|---|
| Nikam (jen zařízení) | Rostliny, záznamy, úkoly, fotky (IndexedDB), nastavení, historie AI chatu a data widgetů | vždy |
| Supabase (`*.supabase.co`) | Google ID, e-mail, profil, zveřejněný obsah a fotky (bucket `media`, EXIF odstraní re-encode přes canvas) | jen po přihlášení do komunity |
| Netlify proxy → Google Gemini | Otázka, historie konverzace, volitelná fotka (768 px, bez EXIF), souhrn deníku rostliny a výsledek on-device diagnózy. Bez ID uživatele. Netlify vidí IP kvůli rate limitu. Nic se neukládá | jen při dotazu na AI |
| Google OAuth | Přihlášení | jen při přihlášení |

Bez reklam, analytiky, crash reportingu a Firebase. Bez polohy.

## Formulář

**Collects or shares any required data types?** Ano

**Is all user data encrypted in transit?** Ano: Supabase, Netlify i Google jen přes HTTPS

**Which account creation methods?** OAuth (Sign in with Google). Účet je volitelný.

**Can users request data deletion?** Ano
- V aplikaci: Nastavení → Účet → Smazat účet
- Web: https://budbuddy.hribal.site/delete-account.html

**Is any data shared with third parties?** Ne. Supabase, Netlify a Google Gemini jsou zpracovatelé (service providers).
- ⚠️ Platí jen tehdy, když Gemini API **neběží na free tieru**. Na free tieru může Google data použít pro sebe. Pak buď přejdi na placený tier, nebo u „Photos“ a „Other user-generated content“ zaškrtni i *Shared*.

### Datové typy (vše: *Collected*, ne *Shared*, uživatel si může vybrat = optional)

| Kategorie → typ | Účel | Ephemeral? | Poznámka |
|---|---|---|---|
| Personal info → **Email address** | Account management | Ne | Google přihlášení, nikdy veřejně |
| Personal info → **Name** | App functionality, Account management | Ne | jméno z Google účtu jako zobrazované jméno, lze změnit |
| Personal info → **User IDs** | Account management | Ne | Google/Supabase ID, uživatelské jméno |
| Photos and videos → **Photos** | App functionality | Ne | fotky v příspěvcích, veřejných rostlinách, výzvách a avatar. Fotky pro AI se zpracují jen dočasně |
| App activity → **App interactions** | App functionality | Ne | lajky, reakce, uložené příspěvky, sledování, hlasy |
| App activity → **Other user-generated content** | App functionality | Ne | příspěvky, komentáře, tipy, reporty odrůd, veřejné rostliny, nahlášení. Dotazy na AI a souhrn deníku se zpracují jen dočasně |

### Nedeklarovat
- Location: EXIF se odstraňuje a IP na Netlify se nepoužívá k určení polohy.
- Device or other IDs, App info and performance, Health, Financial, Messages, Contacts, Calendar, Audio, Files: nic z toho se neposílá.
- Web browsing, Search history: ne.

## Poznámky
- `android:allowBackup="true"`: systémová záloha Google může obsahovat lokální deník. Nepočítá se jako sběr vývojářem, ale je uvedená v zásadách.
- Pokud někdy přibude analytika, crash reporting nebo FCM, je potřeba formulář aktualizovat **před** vydáním.
