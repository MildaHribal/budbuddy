# BudBuddy

Offline grow journal for Android and the web. Track every plant from seed to jar: watering, feeding, training, pest treatments, measurements, photos, stage changes and harvests.

Live demo: <https://budbuddy.hribal.site>

## Features

- **Dashboard** – greeting, daily tasks (with undo), watering reminders, plants that look ready for the next stage, recent activity and stage-aware grow tips.
- **Plants** – search, stage filter, sorting, active/archive views. Photoperiod or autoflower, pot, medium, location, watering interval, health and notes.
- **Journal** – week strip with marked days, one-tap logging of water, feed (ml, nutrients, pH, EC), training (topping, LST, SCROG…), pest treatment, measurements (height, temperature, humidity), notes and photos. Every entry can be edited, deleted and restored.
- **Lifecycle** – germination → seedling → vegetative → flowering → harvest (wet weight) → drying → curing (dry weight) → archive. Stage history is kept, so progress is measured from the start of the current stage.
- **Insights** – height chart, stage timeline, per-plant counters; global statistics with activity charts, logging streak, harvest yields, strain table and achievements.
- **Gallery** – all photos grouped by month with a swipeable viewer.
- **Tools** – nutrient mix calculator (log the mix straight to a plant), VPD, DLI / PPFD and unit converters.
- **Backup** – export everything (photos included) to one JSON file, restore it on another device, demo garden, erase all.
- **AI assistant** – Czech grow advisor per plant: sees the plant's journal and light schedule, takes a photo, cites the offline knowledge pack when installed. Answers come from Google Gemini through a small Netlify proxy, so the app holds no API key.

Everything is stored on the device: structured data in Capacitor Preferences, photos (downscaled to max 1600 px JPEG) in IndexedDB. Data from the 1.0 storage format is migrated automatically on first start.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint
pnpm typecheck
pnpm test         # unit tests for dates, stages, calculators and migrations
pnpm generate     # static build into dist/
```

CI uses npm (`package-lock.json`), so after changing dependencies also run `npm install --package-lock-only`.

### Android

Requires the Android SDK and JDK 21 (Gradle in this project does not run on newer JDKs).

```bash
pnpm android:sync                                   # build web app + copy into android/
cd android && JAVA_HOME=/usr/lib/jvm/java-21-openjdk ./gradlew assembleDebug
```

The APK ends up in `android/app/build/outputs/apk/debug/`. Release builds are signed when `KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` and `KEY_PASSWORD` are set; in GitHub Actions the keystore comes from the base64-encoded `KEYSTORE_BASE64` secret.

## AI assistant server

The app sends questions to `runtimeConfig.public.aiProxyUrl` (default `https://budbuddy-demo.netlify.app/api/chat`, override at build time with `NUXT_PUBLIC_AI_PROXY_URL`). That URL is the Netlify function `netlify/functions/chat.mts`, which checks the request (model allowlist in `shared/aiModels.ts`, token cap, ~6 MB body limit), adds the key and streams Gemini's answer back.

Netlify environment variables:

- `GEMINI_API_KEY` (required) – free key from Google AI Studio. Without it the function answers 503 and the app says the server is not set up.
- `BUDBUDDY_APP_TOKEN` (optional) – if set, requests must send the same value in `X-BudBuddy-Token`; build the app with `NUXT_PUBLIC_AI_APP_TOKEN` set to it. **This is weak protection:** the token ships inside the APK and the web build, so anyone can extract it. It only stops casual reuse of the endpoint. The real limits are the per-IP rate limit in the function config (20 requests/min) and the Gemini free-tier quota.

Netlify caps a function, streaming included, at 60 s; the proxy stops at 55 s and the app keeps whatever arrived. Offline photo diagnosis and the knowledge pack load from `public/ai/` (git-ignored, copied in only for local Android builds); without them the assistant still works.

## Project layout

```
app/
  composables/useGrow.ts   single store: plants, journal, tasks, photos, backup
  composables/useUi.ts     toasts, confirm dialog, back-button stack, photo URLs
  utils/                   pure logic (dates, stages, calculators, schema & migration, demo data)
  components/              sheets, lightbox, charts, forms, cards
  pages/                   dashboard, plants, plant detail/edit/new, gallery, stats, tools, settings
  plugins/grow.client.ts   loads data, Android back button
test/                      vitest unit tests
android/                   Capacitor Android project


v guide pouzijpro obrazky jednotlivych kapitol obrazky opravdovych rostlin konopi, ktere se k dannym kapitolam hodi, nechci tam mit generovane obrazky

```
