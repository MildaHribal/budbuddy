---
name: BudBuddy
description: Offline grow journal; a calm dark grow app at category craft level, one green accent, flat 1px cards.
colors:
  ground: "#0e100f"
  surface: "#171a18"
  surface-2: "#1e2220"
  surface-3: "#262b28"
  well: "#121413"
  line: "#252a27"
  line-strong: "#323835"
  track: "#2a302d"
  text: "#f2f4f1"
  text-2: "#a5ada8"
  text-3: "#838b86"
  green: "#3dd173"
  green-deep: "#22a858"
  on-accent: "#06140b"
  accent-soft: "rgba(61, 209, 115, 0.12)"
  accent-line: "rgba(61, 209, 115, 0.32)"
  amber: "#f2b544"
  amber-soft: "rgba(242, 181, 68, 0.12)"
  red: "#f2626a"
  red-soft: "rgba(242, 98, 106, 0.12)"
  blue: "#5fb4ee"
  stage-germination: "#d9c46b"
  stage-seedling: "#8fd97a"
  stage-vegetative: "#3dd173"
  stage-flowering: "#b58cf5"
  stage-drying: "#d9a06a"
  stage-curing: "#f2b544"
  entry-water: "#5fb4ee"
  entry-feed: "#b58cf5"
  entry-pest: "#f0905a"
  entry-measure: "#5fd9c4"
  entry-note: "#a5ada8"
  entry-photo: "#8ea6f5"
  scrim: "rgba(0, 0, 0, 0.62)"
typography:
  headline:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  section:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  caption:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  number:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
    fontVariation: "proportional-nums"
  number-lg:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
    fontVariation: "proportional-nums"
rounded:
  tile: "10px"
  control: "12px"
  card: "16px"
  sheet: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
  button:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-primary-active:
    backgroundColor: "{colors.green-deep}"
  button-soft:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.green}"
    rounded: "{rounded.control}"
    height: "48px"
  button-lamp:
    backgroundColor: "{colors.amber-soft}"
    textColor: "{colors.amber}"
    rounded: "{rounded.control}"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.red}"
    rounded: "{rounded.control}"
    height: "48px"
  button-ghost:
    textColor: "{colors.text-2}"
    rounded: "{rounded.control}"
    height: "48px"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    size: "44px"
  fab:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.card}"
    height: "56px"
    padding: "0 18px"
  input:
    backgroundColor: "{colors.well}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "48px"
  chip:
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  chip-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.green}"
  segmented:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.control}"
    padding: "4px"
  segmented-selected:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text}"
  badge:
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  bottom-nav:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text-3}"
  bottom-nav-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.green}"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
  toast:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    height: "52px"
---

# Design System: BudBuddy

## Overview

**Creative North Star: "The Category Standard, Played Straight"**

BudBuddy is a dark grow journal that sits beside Grow with Jane, Planta and GrowDiaries and asks to be mistaken for one of them. Nothing on screen argues for attention: a near-black ground, cards one step lighter with a hairline border, white-on-dark text in three greys, and a single green that does every job an accent has (actions, active tab, progress, healthy). Amber is reserved for light and time; red for overdue and errors. The plant photo and its numbers are the content; the chrome is quiet enough to disappear at the tent in the dark.

Density is phone-first and one-handed: 390px wide, 16px gutters, 24px between sections, 48px controls and 44px hit areas everywhere, a labelled five-tab bar at the bottom and a green floating action button on list screens. On desktop the whole app is shown inside a 390x844 phone frame; nothing reflows. The build is bilingual (Czech / English), and every screen is written so both languages fit the same boxes.

The previous "Lights On" world (lamp bar, glows, gradients, mylar sheen) was replaced by the user's decision on 2026-10-13. The confirmed rejections carry over as hard rules: no gradients, no glows, no blur, no decorative shadows, no oversized headlines, no pill-everything.

**Key Characteristics:**
- Flat surfaces: 1px borders carry structure; shadows exist only under floating things (FAB, toast, sheet, dialog).
- One accent, green, used sparingly; amber and red are semantic, never decorative.
- Onest variable (self-hosted, latin + latin-ext) at 15px body, 600 for every heading and number.
- Stage, entry-type and health colours form a flat data palette; custom stroke glyphs with a 20% tint fill.
- 150–360 ms ease-out motion; press feedback is a 2–6% scale, never a colour flash.

## Colors

A near-monochrome green-black ground with one saturated green and two semantic warm tones; data colours live beside it, not on top of it.

### Primary
- **Grow Green** (`green`): the single accent. Primary buttons, FAB, active bottom-tab tint, progress fills, links, focus ring (2px outline), caret and selection. Also the Vegetative stage, the Thriving health level and the Train / Stage entry types.
- **Grow Green Deep** (`green-deep`): the pressed state of green surfaces only.
- **Green Tint** (`accent-soft`, 12%): fills for soft buttons, active chips, active nav icon pill, the empty-state tile, the input focus ring halo.
- **On Accent** (`on-accent`): near-black text on green surfaces.

### Secondary
- **Lamp Amber** (`amber`): light cycle, time, harvest windows, the Curing stage, the Fair health level, the ring marker stroke. `amber-soft` (12%) fills the light-card icon tile and `.btn-lamp`.
- **Alert Red** (`red`): overdue, errors, destructive confirm, the Critical health level. `red-soft` (12%) fills `.btn-danger` and the load-error strip.
- **Water Blue** (`blue`): the Water entry type and the per-plant quick-log button (14% tint); also the info toast icon.

### Neutral
- **Ground** (`ground`): page background, header, bottom nav, splash.
- **Surface** (`surface`): cards, sheets, dialogs, icon buttons, empty states.
- **Surface 2** (`surface-2`): default button face, pending photo placeholder.
- **Surface 3** (`surface-3`): selected segment, toast face, dark light-icon tile.
- **Well** (`well`): inputs and the segmented-control trough; sits below surface.
- **Line / Line Strong** (`line`, `line-strong`): card and row borders (line); control borders, checkboxes, sheet handle, scrollbar thumb (line-strong).
- **Track** (`track`): empty progress and ring track.
- **Text / Text 2 / Text 3** (`text`, `text-2`, `text-3`): primary, secondary (body and sub-lines), tertiary (dates, captions, inactive nav, placeholders).
- **Scrim** (`scrim`): sheet backdrop; the confirm backdrop is a darker `rgba(3, 4, 5, 0.74)`.

### Data palette (flat, from `app/utils`)
- Stages: Germination `stage-germination`, Seedling `stage-seedling`, Vegetative `stage-vegetative`, Flowering `stage-flowering`, Drying `stage-drying`, Curing `stage-curing`. Rendered as a `.badge` with a 16% mix of the stage colour over surface, and as the photo placeholder tint (12% over surface-2).
- Entry types: Water `entry-water`, Feed `entry-feed`, Train (green), Pest `entry-pest`, Measure `entry-measure`, Note `entry-note`, Photo `entry-photo`, Stage (green), Harvest (amber).
- Health: Thriving green, Good `stage-seedling`, Fair amber, Struggling `entry-pest`, Critical red.
- VPD zones: too low blue, propagation `entry-measure`, vegetative green, flowering `entry-feed`, too high red.
- Grower levels: seedling `text-2`, sprout `stage-seedling`, veg green, flowering `entry-feed`, master amber.

### Named Rules
**The One Green Rule.** Green is the only accent. If a surface needs a second emphasis colour it is semantic (amber = light/time, red = overdue/error, blue = water) or it is data (stage, entry type); it is never a second brand colour.

**The Twelve Percent Rule.** Tinted fills are the colour at 12–16% over the surface (`accent-soft`, `amber-soft`, `red-soft`, `color-mix(currentColor 14–16%)`). Text and icons on a tint use the full colour. No tint is darker or lighter than that band.

**The Hairline Rule.** Structure is a 1px `line` border on `surface`. Rows inside a card are separated by a 1px `line` top border, not by spacing or background changes.

## Typography

**Display Font:** Onest (variable 100–900, self-hosted woff2, latin + latin-ext; fallback system-ui, sans-serif)
**Body Font:** Onest
**Label/Mono Font:** none; numbers use Onest with `proportional-nums`

**Character:** A single geometric-humanist sans at two weights. Everything that leads is 600; everything that explains is 400 (500 for task titles and toasts). Headings tighten by -0.01em; nothing is uppercase, nothing is tracked out, nothing is display-sized.

### Hierarchy
- **Headline** (600, 22px, 1.2, -0.01em): the page `h1` in `AppHeader` and the home greeting. One per screen. The splash wordmark is the same size at -0.02em.
- **Sheet title** (600, 18px, -0.01em): `h2` in bottom sheets and the confirm dialog; the light card's countdown line.
- **Section** (600, 17px, -0.01em): `.section-title`, paired with a 13px `text-3` `.section-meta` on the right.
- **Title** (600, 16px, -0.01em): card titles such as the plant name. Inputs are also 16px so mobile browsers do not zoom.
- **Body** (400, 15px, 1.45): base text, buttons (600), task row titles (500), empty-state titles (600).
- **Label** (600, 13px): field labels, chips, the quick-log button, section meta, `text-2` sub-lines; 14px 600 for links, segmented buttons and toast actions.
- **Caption** (400, 12px): hints, row meta, legend; 11px 600 for badges and bottom-nav labels.
- **Number** (600, 20–28px, 1.15, -0.01em, proportional): week-strip values and card figures at 20px; ring value and countdown at 24px; stats up to 28px.

### Named Rules
**The Six-Hundred Rule.** Every heading, title, number, button, chip, badge and label is weight 600. There is no 700 and no 300 in the build; emphasis comes from size and colour, not from a heavier cut.

**The Proportional Numbers Rule.** Big numbers use `.num` (proportional figures). `.tabular` is added only where digits must align in columns (tables, aligned stats), because tabular digits in Onest leave visible gaps around 1.

**The No-Eyebrow Rule.** No uppercase kickers, no letter-spaced labels, no eyebrows above headings. Section structure is the 17px section title plus its right-hand meta.

## Layout

Single column, phone-first. The device is 390px wide on desktop (phone frame, 48px outer radius, 10px bezel) and the full viewport on mobile, with `100dvh` height and safe-area insets as custom properties. Pages use `.page`: 16px side gutters, 16px top (plus safe-top), 32px bottom, and a 24px gap between sections. Inside a card the padding is 12–14px; rows are 56px tall; lists of cards sit 10px apart.

The spacing rhythm is 4 / 8 / 12 / 16 / 24: 4px between stacked text lines, 8px between inline controls, 12px between form fields and under section heads, 16px gutters, 24px between sections. Form grids are two equal columns with a 12px gap; stacks use 18px.

The shell is a sticky 64px header (ground background, no border), a scrolling main area with hidden scrollbars, and an absolutely positioned 80px bottom nav (`--nav-h`) that hides when the on-screen keyboard opens. The FAB sits 16px above the nav. Sheets are 92% max height and teleport into the device frame so they stay inside the phone on desktop.

Touch targets are 44px minimum: icon buttons are 44px, checkboxes sit in a 44px grid cell, chips and text links grow an invisible 44px hit area via `::after`, compact 40px buttons extend their hit area by 4px.

## Elevation & Depth

Flat by default. Depth is tonal: ground, then surface with a 1px line border, then surface-2 and surface-3 for interactive faces inside a card, and well below surface for inputs. No glows, no blur, no backdrop filter, no inset highlights (`--highlight: transparent`, `--glow-*: none`, `--panel-shadow: none`).

Shadows exist only on things that float over the page.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35)`): FAB, toast, confirm dialog.
- **Sheet** (`box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.4)`): bottom sheet, cast upward.
- **Focus halo** (`box-shadow: 0 0 0 3px {colors.accent-soft}`): focused input, with the border turning green. Keyboard focus elsewhere is a 2px green outline at 2px offset.

### Named Rules
**The Floating-Only Rule.** A shadow is permitted only on an element that is layered above the scroll content (FAB, toast, sheet, dialog). Cards, buttons, tiles and photos never carry one.

## Shapes

Rounded rectangles on a five-step scale: 10px tiles (`--radius-sm`), 12px controls (buttons, icon buttons, inputs, segmented control, photo thumbnails, icon tiles), 16px cards (also the FAB, toast and empty state), 20px sheets and dialogs (sheet top corners only), and 999px pills for chips, badges, progress bars and the nav icon pill. Checkboxes are 22px with a 6px radius and a 2px border; segments inside the 12px trough are 9px.

Borders are always 1px (`line` on cards, `line-strong` on controls and inputs); active tinted states drop the border to transparent rather than recolouring it. Photos are clipped to the 12px control radius at 64px square on cards. The sheet handle is a 36x4px bar at 2px radius.

Custom glyphs (`GrowIcon`, 23 names in `app/utils/glyphs.ts`) are 24-unit stroke icons at 1.8 stroke width, round caps and joins, with a 20%-opacity `currentColor` fill beneath the stroke. They render at 24px in nav and tiles, 20px in buttons, 14px inside badges. Non-glyph icons fall back to Tabler via `UIcon`, bundled offline.

## Components

### Buttons
Confident and quiet: full-height, a filled face, no shadow, a 2% press.
- **Shape:** rounded control (12px), 48px min height, 0 20px padding, 15px / 600.
- **Default:** surface-2 face with a line-strong border, text colour.
- **Primary:** green face and border, on-accent text; pressed goes green-deep.
- **Soft / Lamp / Danger:** 12% tint face, no border, text in the full colour (green / amber / red).
- **Ghost:** transparent, text-2.
- **Press / Disabled:** `scale(0.98)` over 140ms ease-out; disabled at 40% opacity.
- **Icon button:** 44px square, surface face, 1px line border, 20px icon; `.accent` variant uses the green tint; press `scale(0.94)`.
- **FAB:** 56px tall, 16px radius, green with on-accent text, float shadow, 24px glyph; bottom-right above the nav on list screens; press `scale(0.96)` and green-deep.

### Chips
- **Style:** pill, 36px, 0 14px, 13px / 600, transparent face with a line-strong border, text-2; rows scroll horizontally with hidden scrollbars and 8px gaps.
- **State:** active (`aria-pressed` or `.active`) = green 12% tint, no border, green text. Press `scale(0.97)`.
- **Segmented control:** well trough with a line border at 12px, 4px padding and gaps; segments 38px, 9px radius, 14px / 600 text-3; selected segment surface-3 face with text colour.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** surface.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px line.
- **Internal Padding:** 12px (plant card), 14px (light card), rows 56px tall separated by 1px line; a "+N more" footer row is 44px, 13px / 600 text-2.
- **Pressable cards** (plant, light, week) scale to 0.985 on press.
- **Plant card:** 64px photo at 12px radius, 16px/600 name, stage badge right, 13px sub-line with day count in 600 text, 12px/600 amber hint (red when late), 4px green progress bar, 40px blue-tinted water quick-log button.
- **Empty state:** same card, centred, 64px green-tinted tile with a 32px glyph, 15px/600 title, 13px text-2 copy at 30ch max.

### Inputs / Fields
- **Style:** well face, 1px line-strong border, 12px radius, 48px min height, 12px 14px padding, 16px text; placeholder text-3; selects use an inline chevron SVG; textareas size to content (96–260px).
- **Focus:** border turns green and a 3px green-tint halo appears (220ms).
- **Error:** border red; `.field-error` 12px red; hints 12px text-3; labels 13px/600 text-2 with 8px gap.
- **Checkbox (task row):** 22px, 6px radius, 2px line-strong border; done = green face with on-accent tick, title struck through in text-3.
- **Progress:** 6px pill track, green fill (amber on the light card, 4px there), width eased 360ms, scale-in on mount.

### Navigation
- **Bottom bar:** five labelled tabs (Home, Plants, AI, Guide, Community), ground background, 1px line top border, 6px 8px padding plus safe-bottom.
- **Item:** column, 24px glyph in a 56x32 pill, 11px/600 label at 0.01em; inactive text-3, active text with the icon pill in green tint and green glyph; press `scale(0.9)` on the pill. Hides by sliding down when the keyboard is open.
- **Header:** sticky, ground background, 64px, 22px/600 title with optional 13px text-3 subtitle, optional 44px back icon button, actions right at 8px gap. The home screen replaces it with a date line (13px text-3, sentence case) and a 22px greeting.

### Bottom Sheet (signature)
Surface panel with 20px top corners, 1px line border, sheet shadow, 92% max height, over a 62% black scrim. A 36x4 line-strong handle at the top; drag the grip to dismiss (velocity or 30% of height). Head is a 24px coloured glyph, 18px/600 title and a 44px close icon button; body padded 4px 20px 20px; footer has a 1px line top border and equal-width buttons at 10px gap. Enters in 440ms (`cubic-bezier(0.32, 0.72, 0, 1)`), leaves in 260ms. Background becomes inert; focus returns to the trigger.

### Confirm Dialog
Centred surface card at 20px radius, 340px max, line-strong border, float shadow, over a 74% black backdrop. 18px/600 title, 14px text-2 body, two equal buttons (default + primary, or default + solid red with `#1a0507` text for destructive).

### Toast
Top-centred surface-3 bar, 52px, 16px radius, line-strong border, float shadow, 14px/500 message with a 20px tone-coloured glyph (green / red / blue) and an optional 44px green text action. Enters from -18px with a 97% scale over 220–360ms.

### Photoperiod Ring (signature)
168px SVG: 12px track circle, 4px dark arc, 10px green lit arc drawn in over 1.4s, a 5.5px text-coloured marker with an amber stroke fading in after 1.5s; 24px/600 centre value with a text-3 slash. Beside it a 13px text-2 lead, a 24px/600 countdown and a 12px text-3 legend with 14x4 colour bars. When lights are off the lit arc drops to 55% opacity.

### Motion
Tokens: `--dur-fast` 140ms, `--dur` 220ms, `--dur-slow` 360ms; `--ease-out` cubic-bezier(0.16, 1, 0.3, 1), `--ease-in` cubic-bezier(0.7, 0, 0.84, 0). Routes cross-fade (220ms in, 140ms out). Lists use `.rise`: children fade and lift 8px over 360ms with a 40ms stagger capped at 200ms. Boot is a 0.5s splash fade only. Reduced motion collapses every animation and transition to 0.01ms.

## Do's and Don'ts

### Do:
- **Do** build every surface from `.card` (surface, 1px line border, 16px radius) and separate rows inside it with a 1px line border.
- **Do** use green for actions, the active tab, progress and healthy; amber only for light, time and harvest windows; red only for overdue, errors and destructive confirms; blue only for water and info.
- **Do** make tinted states the colour at 12–16% over the surface with the text in the full colour and no border.
- **Do** set every heading, title, label, button, chip and number at weight 600 in Onest and keep the ramp: h1 22px, section 17px, card title 16px, body 15px, labels 13px, captions 12px, big numbers 20–28px.
- **Do** keep radii on the scale: 16px cards, 12px controls and thumbnails, 10px tiles, 20px sheets and dialogs, 999px chips, badges and progress bars.
- **Do** keep controls 48px tall and every tap target 44px, extending compact elements with an invisible `::after` hit area.
- **Do** use `.num` (proportional figures) on big numbers and add `.tabular` only in aligned columns.
- **Do** draw icons as `GrowIcon` glyphs: 1.8 stroke, round caps, 20% tint fill; fall back to bundled Tabler icons, never a network icon API.
- **Do** write every label in both Czech and English and let the longer language set the box.
- **Do** keep motion between 140 and 360ms ease-out, press feedback as a 2–6% scale, and honour reduced motion.

### Don't:
- **Don't** use gradients, glows, blur, backdrop filters, inset highlights or mylar sheen anywhere; `--glow-*` and `--highlight` are `none` / `transparent` by decision.
- **Don't** put a shadow on a card, button, tile or photo; shadows belong only to the FAB, toast, sheet and dialog.
- **Don't** introduce a second accent; stage, entry-type and health colours are data, never brand.
- **Don't** add uppercase kickers, eyebrows, tracked-out labels or display-sized headlines; the largest text on a screen is the 22px h1 and 28px numbers.
- **Don't** make everything a pill: pills are for chips, badges, progress bars and the nav icon tint only; cards and controls stay at 16 / 12px.
- **Don't** use a weight other than 400, 500 or 600, or a face other than Onest (no system display faces, no monospace numbers).
- **Don't** use tabular figures outside aligned columns.
- **Don't** change colour on press; press is a scale, and only primary surfaces may darken to green-deep.
- **Don't** render a sheet, toast or dialog outside `#overlays`; on desktop they must stay inside the phone frame.
- **Don't** imply cloud, sync or accounts in the chrome; the app is offline and the visual language stays quiet about it.
