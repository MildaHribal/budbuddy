# BudBuddy Premium: design

Status: approved by owner 2026-10-15 (parts 1–3 in chat). Smart notifications are a separate spec.

## Goal
Earn money from the Android app on Google Play while the free app stays complete: journal, plants,
reminders, community, strain catalogue, backups and basic stats stay free with no limits.
Money comes from one one-time purchase (**BudBuddy Premium**, about 5 USD) and optional AI credit packs.

## Product

| | Free | Premium (one-time) |
|---|---|---|
| Journal, plants, reminders, community, catalogue, backups, basic stats | yes, unlimited | yes |
| Home-screen widgets | the current 4 | + new styles and sizes |
| Grow guide | chapters 01, 02, 04, 05, 10 + first lesson of every locked chapter | all 10 chapters |
| AI text questions | 5 / day | 30 / day |
| AI photo requests (diagnosis, harvest rating) | 3 / day | 10 / day |
| AI credits | can be bought | can be bought |
| Advanced stats (g/W, g/L, cost per gram, grow-vs-grow comparison) | no | yes |
| PDF grow report (plant or whole run: photos, timeline, feeding, yield, harvest rating) | no | yes |
| Looks: colour themes, alternative app icon | no | yes |
| Supporter badge in the community | no | yes |

- Locked guide chapters: 03 Media, 06 Training, 07 Nutrition, 08 Flowering, 09 Harvest.
- Credits: pack of 200 for about 2 USD, buyable repeatedly. Text request = 1 credit, photo request = 2.
  Credits are used only after the daily limit is spent and do not expire.
- Daily limits reset at 00:00 UTC (same as the current `private.ai_usage` day).
- Prices shown in the app always come from Google Play (localized), never hard-coded.

## Rules
- Premium (guide, looks, stats, PDF, widgets) works **without sign-in**: RevenueCat anonymous app user,
  restored with "Restore purchase" on a new phone (same Google account).
- AI already needs sign-in. AI limits and credits are decided by the server from the Supabase user.
- Credits can only be bought while signed in (they live on the server).
- Web (budbuddy.hribal.site) sells nothing and links to no payment. Locked items say "Available in the Android app".
  The web demo garden shows Premium features as a sample.
- Locked items show a short preview and a button to `/premium`. No paywall ever opens on its own.
- The current signed-in limit of 40 AI requests/day is replaced by the table above (env overrides kept).

## Architecture

### App
- `usePremium()` (single source of truth):
  wraps `@revenuecat/purchases-capacitor`; exposes `isPremium`, `credits`, `offerings` (Play prices),
  `buy()`, `buyCredits()`, `restore()`. Caches `isPremium` in Preferences so locks work offline.
  Web: `isPremium = false`, `purchasable = false`. Demo garden: `sample = true`.
- On sign-in: `Purchases.logIn(supabaseUid)`; on sign-out: `Purchases.logOut()`.
- `/premium` page: what Premium includes, Play price, buy, restore, credit packs, legal line
  (one-time purchase, refunds via Google Play, links to terms and privacy).
- Locks: `useGuide` gets the free chapter/lesson list; advanced stats, PDF report, themes/icon, new widgets
  check `usePremium`.
- AI assistant shows remaining quota, e.g. "2 photos · 4 questions left today · 150 credits".
  A `daily_limit` answer shows a card with "Buy credits" / "Premium".

### Server (Supabase)
- Migration:
  - `private.entitlements (user_id pk, premium bool, credits int >= 0, updated_at)`.
  - `private.purchase_events (event_id text unique, transaction_id text, user_id, product_id, type, at)` for idempotency.
  - `public.ai_quota_take(uid uuid, kind text)` replaces `(uid, lim)`. Order: banned → daily limit for
    the user's tier and kind → credits → `limit`. Returns `{status, source, left_text, left_photo, credits}`.
    Limits per tier/kind from env with the table above as defaults. Grants: service_role only.
  - `profiles.supporter bool` (badge), set only by the webhook.
- Edge Function `rc-webhook` (`--no-verify-jwt`, checks a shared secret in `Authorization`):
  - `INITIAL_PURCHASE` / `NON_RENEWING_PURCHASE` of `premium_unlock` → `premium = true`, `supporter = true`.
  - Purchase of `ai_credits_200` → `credits += 200`.
  - `CANCELLATION` / refund → Premium off / credits minus 200, floor 0.
  - `TRANSFER` → move the entitlement to the new app user id.
  - Every event stored in `purchase_events`; a repeated `event_id` is a no-op.
  - Only events whose app user id is a Supabase uuid touch `entitlements`; anonymous ids are ignored
    (they are picked up after `logIn` through `TRANSFER`).
- `chat` gate: decides `kind` itself (any `inlineData` image in the request = `photo`), calls the new RPC.
- If `entitlements` has no row right after a purchase (webhook late), the gate asks the RevenueCat REST API
  once for that user and caches the result.

### Owner setup (guide will be in `store/PREMIUM_SETUP.md`)
RevenueCat account + project, Play service account for RevenueCat, products `premium_unlock` (one-time)
and `ai_credits_200` (consumable) in Play Console, webhook URL + secret, license testers.

## Legal and Google Play compliance
Checked 2026-10-15 against current Play policy pages; not legal advice.

- **Marijuana policy:** Play bans apps that facilitate the sale of marijuana or THC products
  (shopping cart, delivery, THC products). Premium sells only guide content, AI help and app features,
  which is allowed. Rules: no seed or product sales, no affiliate links, no prices of cannabis products.
  Risk to watch: the Serious Seeds `breeder_url` links point to their shop pages. Required by their terms;
  keep as a plain credit link, never "buy" wording.
- **Payments policy:** digital content must use Play Billing (done through RevenueCat). The app and web never
  point to another payment method. Item terms and prices are described clearly and match the Play dialog.
  Credits are used only inside BudBuddy. No random rewards.
- **Store listing:** states "Free with optional Premium (one-time purchase) and AI credit packs";
  "Contains in-app purchases" in Play Console; IARC answer "Digital purchases: Yes" (update `store/CONTENT_RATING.md`).
- **Developer account:** an account with in-app purchases must have a physical address, and Google shows it
  publicly on the store page. Owner decides which address to use (ask Play support about a business/general address).
  Owner also needs a payments profile.
- **Taxes:** Google collects and pays EU VAT on Play sales. The owner's income is still taxable in CZ and
  may need a trade licence. **Owner checks with an accountant before launch.**
- **Licences of paid content:**
  - Server AI knowledge base (`kb_chunks`): only BudBuddy original, CC BY 4.0/3.0, CC BY-SA 4.0, CC0, US public domain.
    All allow commercial use. Attribution stays visible.
  - Guide photos: CC BY / BY-SA / CC0 / PD only; credits stay visible in locked chapters and in Settings.
    Locking is access control, not a restriction on reuse of the photos.
  - **Serious Seeds photos:** permission is for a free, non-commercial app. **Launch blocker:** e-mail them and
    get approval for an app with paid features, or delete their rows and files (`store/PHOTO_PERMISSIONS.md`).
  - On-device AI pack (`public/ai/`) is never in a Play build (`-PnoAi`), unchanged.
- **Terms (`public/terms.html`):** Premium = one-time purchase of app features, tied to the Google account;
  AI limits are fair-use and may change with notice; unused credits stay valid while the AI service runs and
  are refunded pro rata if it is shut down; refunds go through Google Play's refund policy.
- **Privacy (`public/privacy.html`) + `store/DATA_SAFETY.md`:** RevenueCat as processor (purchase history,
  app user id), purpose "app functionality". Purchase history = collected, not shared (service provider).
- **18+:** unchanged; Premium is sold inside an 18+ app.

## Error handling
- Purchase done, webhook late: app unlocks local features from the RevenueCat result right away; the AI gate
  falls back to the RevenueCat REST API (above).
- Offline: local Premium features use the cached state; AI is online-only as now.
- User cancels or payment fails: nothing changes, quiet "cancelled" message.
- Refund: Premium disappears on next sync; data is never deleted, features lock again.
- Credits run out mid-chat: `daily_limit` answer with remaining counts → buy card.

## Testing
- Vitest: free/locked chapter logic, `usePremium` with a mocked plugin, `kind` detection in the gate,
  webhook (idempotency, refund, transfer, anonymous id ignored), SQL quota order (daily → credits → limit)
  via the existing SQL test style.
- Device: Play license testers + internal testing track; buy, refund, restore on a second phone,
  sign-in after an anonymous purchase.

## Out of scope
Subscriptions, ads, cloud sync, web purchases, Premium for iOS.
