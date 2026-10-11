---
version: 1
slug: "app-pages-index-vue"
primary_target: "app/pages/index.vue"
related_targets: ["app/app.vue"]
---

Scope: the whole BudBuddy app shell and every screen (dashboard, plants, plant detail, entry sheets, gallery, stats, tools, settings, AI page styling). Visitor mode: Operate (portfolio visitors judge it at first view).

Audience/job: home grower at the tent in the evening, one hand, low light; portfolio visitor opening the demo garden.

## Direction contract

THESIS: The app is the grow tent at lights-on. Dark crinkled-mylar ground, the canopy lit from a lamp at the top of the screen, and the light cycle is the clock of the day. Refuses the flat grey dark-mode tracker with green accent cards.

OWN-WORLD: Ground #07080a with faint diagonal mylar sheen; panels #1a1d22 with a top-lit gradient and 1px inner highlight; text #e9f3e4, muted #8d9a8a; leaf green #9be36b for growth/success/active; lamp #ffd28a for light and time; full-spectrum pink #ff5fa2 only for overdue/attention. Sora variable, light 300 for big numbers, 600 for headings. Custom duotone line glyphs (1.6 stroke, 20% fill) for stages and entry types; active nav marked by a glowing leaf bar.

STORY: The grower sees what needs doing tonight, logs it in two taps, and watches each plant move through its stages; the visitor understands it is a full grow journal within one screen.

FIRST VIEWPORT: Date + "Good evening, <name>" header; photoperiod ring (168px, lit arc green, dark arc slate, lamp marker = now) with "Lights off in 4 h 12 m"; Today tasks list in one panel; Your garden plant rows with photo, stage, day and stage progress; bottom nav with centre AI. Lamp bar glows at the top edge.

FORM: Lights On (my pick, ranked 1st of 7 grounded candidates), seed key c067bf83.

Signature interaction / motion grammar: lights-on boot — lamp bar flickers on, light falls down the screen, ring arc draws in, content settles. Routine transitions 150–300 ms ease-out (cubic-bezier(0.16,1,0.3,1)); stage glyphs draw themselves on stage change; logging an entry pulses the lamp light once. Reduced motion: fades only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
