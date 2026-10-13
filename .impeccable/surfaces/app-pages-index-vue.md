---
version: 1
slug: "app-pages-index-vue"
primary_target: "app/pages/index.vue"
related_targets: ["app/app.vue"]
---

Scope: the whole BudBuddy app shell and every screen (home, plants, plant detail, entry sheets, gallery, stats, tools, settings, guide, community, AI page styling). Visitor mode: Operate.

Audience/job: home grower at the tent in the evening, one hand, low light; portfolio visitor opening the demo garden.

## Direction contract

THESIS: The category standard, played straight: a calm dark grow app at the craft level of Grow with Jane, Planta and GrowDiaries. It refuses the "lit tent" decoration of the previous world (lamp bar, glows, gradients, mylar sheen) and the generic AI-app tells: no gradients, glass, glow, decorative shadows, oversized headlines or pill-everything.

OWN-WORLD: Ground #0E100F, cards #171A18 with 1px #252A27 borders and 16px corners, text #F2F4F1 / #A5ADA8 / #838B86. One accent, green #3DD173 (actions, active tab, progress, healthy); amber #F2B544 for light/time and harvest windows; red #F2626A for overdue and errors. Onest variable, 15px body, 600 headings, big numbers 600 tabular. Stage colours and the custom stage/entry glyphs stay, flat (no glow, no draw-in). Standard controls: 48px buttons (12px radius), chips, segmented control, labelled 5-tab bottom bar, bottom sheets with a handle, a green FAB on list screens.

STORY: The grower opens the app, sees today's tasks and the light countdown, logs a watering in two taps from a plant card, and reads the plant's history as a clean timeline; the visitor recognises a polished grow app immediately.

FIRST VIEWPORT: Date line + "Dobrý večer, Mildo" (22px) with a bell/settings button right; "Dnes" card with checkbox rows and a "0 / 2 hotovo" count; light card with sun icon, "Světlo · 18/6 · 06:00–00:00", "Zhasíná za 2 h 40 min" and a flat progress bar; "Rostliny / Zobrazit vše" head; plant cards (56–64px photo, name, stage chip, bold day count + pH/EC, progress bar); green FAB bottom-right; labelled bottom tabs.

FORM: Category standard (canon), chosen by the user over the assigned Seed Bank Catalogue; seed key 4c57e36d. Signature interaction: logging an entry from a plant card ticks the task and fills the progress bar; motion is 150–250 ms ease-out, no boot animation beyond a fade.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
