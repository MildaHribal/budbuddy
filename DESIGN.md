---
name: BudBuddy
description: Offline grow journal, drawn as a grow tent at lights-on.
colors:
  tent-black: "#07080a"
  surface: "#14171b"
  panel: "#1a1d22"
  surface-raised: "#23272d"
  well: "#0b0d10"
  canopy-text: "#e9f3e4"
  text-secondary: "#a9b5a6"
  text-muted: "#8d9a8a"
  leaf: "#9be36b"
  leaf-deep: "#5fb04a"
  on-leaf: "#07120a"
  lamp: "#ffd28a"
  spectrum-pink: "#ff5fa2"
  dark-arc: "#3a4350"
  danger: "#ff5f6d"
  info: "#7cc8f2"
typography:
  headline:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  numeral:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'ss01'"
  label:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  caption:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sm: "10px"
  control: "14px"
  md: "16px"
  lg: "22px"
  sheet: "24px"
  pill: "999px"
spacing:
  page-x: "20px"
  section: "28px"
  stack: "18px"
  gap: "12px"
  tight: "8px"
components:
  button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.canopy-text}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-primary:
    backgroundColor: "{colors.leaf}"
    textColor: "{colors.on-leaf}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-ghost:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    height: "48px"
  icon-button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.canopy-text}"
    rounded: "{rounded.control}"
    size: "44px"
  input:
    backgroundColor: "{colors.well}"
    textColor: "{colors.canopy-text}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "48px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "38px"
  chip-active:
    textColor: "{colors.leaf}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
---

# Design System: BudBuddy

## Overview

**Creative North Star: "Lights On"**

The app is the inside of a grow tent at night with the lamp just switched on. The ground is near-black with a faint diagonal mylar sheen and a warm falloff from a lamp bar at the top edge. Panels are lit from above: a top-to-bottom gradient with a 1px inner highlight. Light is the only colour that means anything: leaf green for growth and action, lamp amber for light and time, full-spectrum pink only for something overdue.

Density is phone-first and one-handed: 48px controls, a 20px page gutter, sections 28px apart. Big numbers are set light (300) and large; headings are 600. Motion has one signature, the lights-on boot (the lamp flickers, light falls down the tent, the photoperiod ring draws in); everything else is short ease-out.

**Key Characteristics:**
- Near-black tent ground with mylar sheen and a lamp glow from the top edge.
- Top-lit panels: gradient fill, hairline border, inset highlight.
- Three signal colours: leaf, lamp, pink. Each has one job.
- Sora throughout; light numerals, semibold headings.
- Custom duotone line glyphs (1.6 stroke, 20% fill) for stages and entry types.

## Colors

A dark, nearly neutral ground, with light used as the only signal.

### Primary
- **Leaf** (leaf): growth, success, active nav, primary buttons, focus ring, caret, selection, progress fill, section-title glyphs. Primary buttons use a vertical leaf gradient (light top, deeper bottom) with dark on-leaf text.
- **Leaf Deep** (leaf-deep): start of the progress gradient and pressed/strong accent.

### Secondary
- **Lamp** (lamp): light and time only: the lamp bar, the lights-off countdown, due-soon and ETA text, the active AI nav item, the demo tag.

### Tertiary
- **Spectrum Pink** (spectrum-pink): overdue and attention only (overdue watering, late ETA, attention badges).

### Neutral
- **Tent Black** (tent-black): app ground and theme-color.
- **Surface / Panel / Surface Raised** (surface, panel, surface-raised): chip fill, panel base, raised elements.
- **Well** (well): recessed fills (inputs, segmented track, progress track), always with an inset shadow.
- **Canopy Text / Secondary / Muted** (canopy-text, text-secondary, text-muted): body, labels, meta.
- **Dark Arc** (dark-arc): the dark portion of the photoperiod ring.
- Hairlines are white at 7% (line) and 13% (line-strong); the inner highlight is white at 5%.

### Data palettes
Stages and entry types each carry their own hue in `utils/stages.ts` and `utils/entries.ts` (water uses info blue, feed lavender #c9a2ff, harvest lamp, and so on). These colour glyphs and badges via `currentColor`; they are content colours, not UI accents.

### Named Rules
**The One Job Rule.** Leaf means growth or action, lamp means light or time, pink means overdue. Never swap them, and never use pink for decoration.

**The Soft Tint Rule.** Signal colours appear as fills at 12% opacity with a 28-35% border (soft buttons, chips, badges); full-strength fills are reserved for the primary button.

## Typography

**Display Font:** Sora variable (100-800), self-hosted, with system-ui fallback
**Body Font:** Sora, with stylistic set ss01

**Character:** One geometric family carries everything; weight does the work. Light 300 makes numbers feel like instrument readouts; 600 makes headings sturdy.

### Hierarchy
- **Numeral** (300, 26-34px, line-height 1.1, -0.03em): ring values, countdowns, stats, plant day counts. Use tabular figures (`.num`) where values update.
- **Headline** (600, 22px, -0.025em): page header h1, single line, truncated.
- **Title** (600, 15px, -0.01em): section titles, with a leaf glyph in front.
- **Body** (400, 15px, 1.45): default text. Inputs are 16px to stop mobile zoom.
- **Label** (600, 13px): field labels, links, chips, buttons at 13-15px.
- **Caption** (400-500, 11-12px): meta, hints, nav labels (11px, 500).

### Named Rules
**The Light Numbers Rule.** Any number that is the point of a view is set at weight 300 and large; headings stay at 600. Don't make big numbers bold.

## Layout

A single phone column. Pages pad 16px top, 20px sides, 28px bottom, with 28px between sections. Section heads sit 12px above their content. Forms stack at 18px with a two-column grid at 12px. The sticky header (min 64px) fades from tent-black to transparent with a 10px blur; the bottom nav (76px) is absolutely positioned, blurred, with a hairline top border. Safe areas are respected via `--safe-top` / `--safe-bottom`.

On desktop with a fine pointer at 640px and up, the app renders inside a 390px phone frame (48px radius, 10px bezel) on a near-black stage with a faint lamp glow; overlays teleport into the frame.

## Elevation & Depth

Depth comes from light, not lift. Panels are top-lit with a gradient, an inset 1px highlight and a soft dark drop underneath. Recessed elements (inputs, tracks) use the well colour with an inset shadow. Glows are the only coloured shadows, and only on signal elements.

### Shadow Vocabulary
- **Panel** (`inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 24px -8px rgba(0,0,0,0.6)`): cards.
- **Well** (`inset 0 1px 2px rgba(0,0,0,0.5)`): inputs, segmented track.
- **Leaf glow** (`0 0 14px rgba(155,227,107,0.45)`): active indicators; primary button drop `0 8px 22px -8px rgba(155,227,107,0.55)`.
- **Lamp glow** (`0 0 40px 10px rgba(255,210,138,0.4), 0 0 90px 24px rgba(255,210,138,0.13)`): the lamp bar only.

### Named Rules
**The Top-Lit Rule.** Every raised surface is lit from above: lighter at the top edge, a white inset highlight, darkness below. Never light from the side or use offset shadows.

## Shapes

Soft, rounded rectangles. Controls are 14px, cards 16px, large panels 22px, bottom sheets 24px on the top corners. Chips, badges and progress tubes are full pills. Glyph strokes have round caps and joins.

## Components

### Buttons
- **Shape:** gently rounded (14px), min height 48px, 20px horizontal padding, 15px/600.
- **Default:** panel gradient, line-strong border, inset highlight.
- **Primary:** leaf gradient, no border, dark on-leaf text, leaf drop glow.
- **Soft / Lamp / Danger:** 12% tint fill, tinted border, signal-coloured text, no shadow.
- **Ghost:** transparent, secondary text.
- **States:** press scales to 0.97 (140ms ease-out); disabled at 40% opacity; focus is a 2px leaf outline offset 2px.
- **Icon button:** 44px square, same treatment; press scales to 0.92.

### Chips
- **Style:** pill, 38px, surface fill, line-strong border, 13px/600 secondary text.
- **State:** active/pressed takes the leaf soft tint and leaf text. Segmented controls sit in a well track; the selected segment becomes a raised panel.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** panel gradient (#1f2328 to panel).
- **Shadow Strategy:** Panel shadow (see Elevation).
- **Border:** 1px line.

### Inputs / Fields
- **Style:** well fill, line-strong border, 14px radius, 48px min, 16px text, leaf caret.
- **Focus:** border turns leaf plus a 3px leaf ring at 14%.
- **Error:** danger border; error text #ff9aa3 at 12px.

### Navigation
- **Bottom nav:** five items, centre is the AI assistant. Inactive items are muted; active is leaf with a glowing glyph and a 26x2px glowing leaf bar above it. The centre item uses lamp instead of leaf.

### Badges
- **Style:** pill, 11px/600, coloured by `currentColor` at 11% fill and 35% border. Stage badges add the stage glyph and a blurred dark backing over photos.

### Photoperiod Ring (signature)
Lit arc in leaf, dark arc in dark-arc, a lamp marker for now; values in light numerals and the countdown in lamp. The arc draws in after the boot (1.4s ease-out) and the marker fades in last.

### Grow Glyphs (signature)
Custom 24px SVG glyphs from `utils/glyphs.ts`: 1.6 stroke line with a 20% `currentColor` fill. Optional `draw` animates the strokes in; `glow` adds a drop-shadow halo. Non-glyph names fall back to Tabler icons.

### Motion
Ease-out `cubic-bezier(0.16,1,0.3,1)` at 140 / 240 / 420ms. Lists rise in 10px with a stagger capped at 200ms; progress tubes fill from the left. Reduced motion falls back to instant states.

## Do's and Don'ts

### Do:
- **Do** set every raised surface top-lit: panel gradient, 1px line border, inset white highlight.
- **Do** keep leaf for growth and action, lamp for light and time, pink for overdue only.
- **Do** use the well colour with an inset shadow for anything recessed.
- **Do** use Grow Glyphs for stages and entry types; colour them with the stage or entry hue.
- **Do** keep touch targets at 44px or more and inputs at 16px.

### Don't:
- **Don't** use pink as an accent or decoration; it is reserved for overdue and attention.
- **Don't** use flat grey cards with a green accent stripe; panels are lit, not tinted.
- **Don't** set large numbers bold; they are weight 300.
- **Don't** add coloured glows to anything that isn't a signal element (active state, primary action, lamp).
