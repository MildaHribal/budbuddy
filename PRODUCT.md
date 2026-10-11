# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Shipped as a Nuxt SPA on the web and inside a Capacitor Android WebView; the design language is web, not Material.)

## Users

Two audiences, both confirmed:

- **Home growers**, starting with the author, logging their plants daily. Typical scene: evening, at the grow tent, often under the grow light or in the dark, phone in one hand.
- **Portfolio visitors** (recruiters, other developers) who open the live demo at budbuddy.hribal.site, usually framed inside the portfolio hribal.site in a phone frame on desktop. They must be impressed within seconds without creating any data (demo garden loads on first run).

## Product Purpose

An offline grow journal: track every plant from seed to jar. Logging must be fast and reliable; the history must be pleasant to look back on. Success = a grower logs a watering in a few taps, and a visitor understands what the app does and finds it beautiful on first view.

## Positioning

Fully offline, private, no account. Everything (data and photos) stays on the device. Covers the whole lifecycle including harvest, drying and curing, not just the growing weeks.

## Operating Context

- Lifecycle: germination → seedling → vegetative → flowering → harvest (wet weight) → drying → curing (dry weight) → archive.
- Journal entry types: water, feed (ml, nutrients, pH, EC), training (topping, LST, SCROG…), pest treatment, measurement (height, temperature, humidity), note, photo; stage and harvest events.
- Tools used alongside: nutrient mixer, VPD, DLI/PPFD, unit converters.
- Backup to a JSON file, restore on another device.
- Android extras: local watering/task notifications and home-screen widgets (light cycle, plants, gallery, AI).

## Capabilities and Constraints

- Nuxt 4 SPA (`ssr: false`), Capacitor 7 Android, Tailwind 4, @nuxt/ui used only for `UIcon`; icons must work offline (bundled, no API).
- Must run smoothly in an Android WebView on a mid-range phone.
- Desktop shows the app inside a phone frame; overlays teleport into it.
- UI is bilingual: Czech and English, switched in Settings (`settings.language`), including the AI assistant.
- The AI assistant page (`app/pages/ai-assistant.vue`, `app/ai/**`) is developed separately; its script logic must stay untouched.

## Evidence on Hand

- Demo garden data in `app/utils/demo.ts` (synthetic).
- Custom stage/entry glyphs in `app/utils/glyphs.ts` (drawn in code).
- No real grow photos in the demo garden yet; the user should supply their own tent photos.
- No real testimonials, user counts or ratings exist; none may be invented.

## Product Principles

1. Logging speed beats decoration: the daily path (open plant → log water) stays a few taps.
2. Offline and private by default; never imply cloud sync.
3. The plant is the hero: photos and growth history are the content, chrome recedes.
4. Every screen must work in the dark at the tent.

## Accessibility & Inclusion

Large touch targets for one-handed use; readable contrast on a dark screen in low light; respect reduced motion.
