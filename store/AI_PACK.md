# Offline AI pack on Google Play: design proposal

Audience: the AI session (karel-1e). The native and Gradle parts live in `android/` (PLAY owns that folder); the JS parts live in `useAssistant.ts` / `app/ai/**`.

## Current state
- `public/ai/` is about 185 MB: `classifier/` 99 MB (`diag.onnx`), `kb/` 72 MB (e5-small `model.ort`, vectors, BM25), and `ort/` 14 MB (onnxruntime wasm/mjs). It is gitignored and copied in by `scripts/install-ai.sh`.
- `useAssistant.ts:93-112` loads everything from `${baseURL}ai/{classifier,kb,ort}/`. If the files are missing, it falls back to the `missing` state, so the assistant still answers through the proxy.
- Store builds use `./gradlew … -PnoAi`. In `android/app/build.gradle` that sets `ignoreAssetsPattern` `<dir>ai` and `<file>ort-wasm-*`, which drops `public/ai` **and** the 13.6 MB `_nuxt/ort-wasm-simd-threaded.*.wasm` that Vite emits. Nothing uses that wasm at runtime, because `wasmPaths` always points to `ai/ort/`. CI passes `-PnoAi` and fails if `assets/public/ai/` ends up in the AAB.
- The result is a release AAB of 11 MB.
- Play's base-module limit is 500 MB, so the pack would technically fit in the base. That is a bad trade: every install and every update downloads 185 MB, even for users who never use offline diagnosis.

## Blocker before any distribution
`.gitignore` says the pack is "partly non-redistributable". Before it ships through Play or any download host, check the licences of:
- the KB sources (the text passages in `meta.bin`),
- the classifier weights and their training data,
- the e5-small model (MIT, so that one is fine).

Anything without a licence that allows redistribution must be removed or rebuilt. **This is a user action.**

## Recommendation: on-demand Play Asset Delivery pack, with the bundled fallback kept

### Why
- Play hosts and patches the files, so there is no CDN cost and no new endpoint in Data safety.
- There is no "downloaded executable code" grey zone: the wasm comes from Play.
- The pack limit is 1.5 GB.

### Android side (PLAY or the AI session, in `android/`)
1. Add a new module `android/ai_pack/build.gradle`:
   ```groovy
   plugins { id 'com.android.asset-pack' }
   assetPack {
       packName = "ai_pack"
       dynamicDelivery { deliveryType = "on-demand" }
   }
   ```
   - Its assets must sit at `src/main/assets/ai/{classifier,kb,ort}/`. A Gradle Copy task from `../../public/ai` (run before `bundleRelease`) fills them.
   - Then add `include ':ai_pack'` in `settings.gradle` and `assetPacks = [":ai_pack"]` in `app/build.gradle`.
2. Add the dependency `com.google.android.play:asset-delivery:2.x`.
3. Add a small Capacitor plugin, `AiPackPlugin` (Java, registered in `MainActivity`):
   - `getState()` returns `{ status: 'none'|'pending'|'downloading'|'waiting_wifi'|'needs_confirmation'|'completed'|'failed', bytes, total }`.
   - `fetch()` calls `AssetPackManager.fetch(["ai_pack"])` and emits `progress` events from the `AssetPackStateUpdateListener`.
   - `confirm()` calls `showConfirmationDialog(activity)`. It is needed for `REQUIRES_USER_CONFIRMATION` or `WAITING_FOR_WIFI` when the download is large on mobile data.
   - `location()` returns `getPackLocation("ai_pack").assetsPath()` or null.
   - `remove()` calls `removePack("ai_pack")`.

### JS side (AI session)
1. Add `resolveAiBase(): Promise<string | null>`:
   1. Bundled (sideloaded APK built without `-PnoAi`, or a web/dev build): a HEAD request to `${baseURL}ai/kb/manifest.json` returns ok, so use `${baseURL}ai/`.
   2. Native and `AiPack.location()` is set: use `Capacitor.convertFileSrc(location + '/ai/')`. Capacitor's local server serves it as `https://localhost/_capacitor_file_/…`, so `fetch` and `ort` work unchanged.
   3. Otherwise return `null`, which means the `missing` state.
2. In `useAssistant.ts`, replace `const base = …` with the value from `resolveAiBase()`. `initClassifier`, `configureKb` and `initKb` already take base URLs, so nothing in `app/ai/**` needs to change.
3. In the AI section of Settings, add an "Offline diagnosis: download (≈185 MB, Wi-Fi recommended)" row with a progress bar, a confirmation step and a Remove button. After `completed`, reset `classifierState`/`kbState` to `idle` and initialise again.
4. Add i18n keys for en and cs.

### Testing
- `bundletool build-apks --local-testing --bundle app-release.aab` together with `bundletool install-apks` simulates on-demand delivery without Play.
- Internal testing in Play Console is the real end-to-end test.

## Alternative: runtime download from your own host
For example R2 or GitHub Releases, written to `Directory.Data` with `Filesystem.downloadFile` and checked against a SHA-256 manifest, then loaded through `convertFileSrc`.
- **Pros:** it also works for the sideloaded APK and the web.
- **Cons:**
  - hosting and bandwidth cost;
  - a new endpoint in Data safety and the privacy policy (the host sees the IP);
  - you must handle resume, partial downloads and integrity yourself;
  - the wasm must then stay in the base (ship `ort/` in the APK) so no runtime is downloaded from outside Play.

Use it only if the pack also has to reach non-Play users.

## Size ideas (independent of delivery)
- The classifier is 99 MB. An int8-quantised `diag.onnx` would probably shrink to about 25–30 MB.
- `kb/vectors.i8` is already int8, and the tokenizer is pruned.

---

## Implemented in the app (AI session, 2026-10-12)

The app now runs cleanly with no `/ai` assets (the `-PnoAi` AAB, the benchmark's A1 path). The assistant answers
through the proxy with the plant context only. It finds the offline files in this order (`app/ai/pack.ts` →
`resolveAiSource`):

1. **Bundled:** `${baseURL}ai/kb/manifest.json` answers with something other than HTML (sideloaded APK, web, dev).
2. **Play asset pack:** only when a native `AiPack` plugin is registered. `app/ai/assetPack.ts` is written against
   the interface above, plus `cancel()` and a `canceled` status. The pack's `assetsPath()/ai/` goes through
   `Capacitor.convertFileSrc`.
3. **Downloaded pack:** stored in the Cache API (`budbuddy-ai-pack-v1`), served to `kb.ts` / `diagnose.ts` through
   a custom `fetch`. The ORT runtime gets `blob:` URLs.

Settings → AI assistant has an "Offline AI" row (`app/ai/AiPackRow.vue`): download (≈185 MB), progress,
pause/resume, retry, delete. **The row is hidden unless a source exists.** With no `AiPack` plugin and an empty
`VITE_AI_PACK_URL` (the default), users never see it.

### HTTP pack format (for any static host)
- `node scripts/build-ai-pack.mjs <out-dir> [public/ai] [version]` writes `ai-pack.json` and
  `parts/<sha256>` (16 MiB parts, content-addressed, so a new version only re-downloads changed parts).
- The client checks every part against its SHA-256 before storing it. Parts already stored are skipped, so a
  cancel, a crash or a lost connection resumes. After a complete download, parts of older versions are removed.
- Enable it with `VITE_AI_PACK_URL=https://host/path/` at build time. Nothing has been uploaded anywhere.

### Hosting options (user decision)
| Option | Fits | Against |
|---|---|---|
| Play Asset Delivery (recommended above) | Play users; Play hosts and patches it | Needs the native plugin (PLAY); Play only |
| Cloudflare R2 / S3 behind a private-ish URL | All builds; parts ≤ 16 MiB fit any CDN | Cost; the URL is in the app, so the files are effectively public |
| Netlify (same site) | No new vendor | Large deploys, bandwidth on the free tier; same public-URL issue |
| GitHub Releases | Free | Public by design – ruled out by the earlier "data must not be public" decision |

Any URL the app can download from can be downloaded by anyone. "Not public" therefore only holds for Play
Asset Delivery (served to signed Play installs). For any HTTP host, the licence question below decides it.

## Licence audit of `public/ai` (2026-10-12, from ~/konopi-expert metadata)

| Part | Licence found | Redistributable? |
|---|---|---|
| `kb/texts` corpus chunks: 27,489 of 31,569 | `"(c) site owner; personal local TDM use only (CZ s. 39d), do not redistribute"` (`scripts/sources.py:79`). Commercial seedbanks, shops and blogs (2fast4buds, Royal Queen Seeds, Zamnesia, growweedeasy …) | **No** |
| corpus: grower.cz (276), manufacturer pages (41) | "forum FAQ, personal use only" / "do not redistribute" | **No** |
| corpus: ~2.9k chunks | CC BY, CC BY-SA (Wikipedia, Cornell eCommons, papers), CC0 | Yes, with attribution (BY-SA: share-alike) |
| corpus: ~0.8k chunks | "free access" university extension pages, bronze OA, NC-ND, Crown copyright | Unclear / no for commercial use |
| `kb` knowledge cards (917, Czech) | No licence statement; the project's own paraphrased syntheses with source URLs | Probably yes |
| `kb` feeding charts (21) | Own normalised rewrite of manufacturer charts (sources tagged "do not redistribute") | Unclear (facts; low risk with a link to the maker) |
| `kb` vectors / BM25 / meta | Derived from the texts | Follow the texts → rebuild after pruning |
| `kb/model.ort` + tokenizer | multilingual-e5-small, MIT (from general knowledge, not verified locally) | Yes (ship the notice) |
| `classifier/diag.onnx` backbone | DINOv2-base, Apache-2.0 (from general knowledge) | Yes (notice; weights modified) |
| `classifier` heads | Trained on 23.5k images: 13.0k permissive, **9.6k non-commercial** (LMDC CC BY-NC-SA, iNat NC, Bugwood), 0.8k unknown (Kaggle Tomato-Village) | Unclear for a commercial app |
| `ort/` | onnxruntime-web 1.30.0, MIT (verified) | Yes (ship MIT + ThirdPartyNotices) |

Consequences:
- **The current `kb` pack must not be distributed** through Play, any host, or a sideloaded APK that is handed to
  other people. A distributable pack keeps the 917 cards, maybe the 21 charts, and the ~2.9k CC chunks (≈3.8k of
  32.5k). Rebuild it with `scripts/mobile/build_kb_pack.py` and ship an attribution file.
- For a commercial app, the classifier heads need a decision on the NC-trained images. Refitting without them
  (`scripts/mobile/refit.py`) costs accuracy, mostly from dropping LMDC.
- Until that is cleared, keep `VITE_AI_PACK_URL` empty and don't add the `ai_pack` module.
