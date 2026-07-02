# UI Revamp Synthesis — Airy Positron Aesthetic (2026-07-02)

Confirmed interpretation of the two reference images ([ui-ref-1.png](ui-ref-1.png),
[ui-ref-2.png](ui-ref-2.png)) that drove the light/airy UI revamp.

## What each reference contributed

**ui-ref-1 — Berlin *Musikspielstätten* editorial spread** → *mood.*
Taken: monochrome ink-on-white, hairline strokes, generous whitespace,
uppercase letter-spaced labels, data-viz restraint, clean grotesque type.
Not taken: literal book layout, isometric illustration, German editorial density.

**ui-ref-2 — Cx2 carbon dashboard** → *component language.*
Taken (user-called-out): the **dark high-contrast rectangular affordances**
(the `tc02e` status pill, the black "Place New Order" primary button vs the
white-outline secondary) used sparingly as focal points; **clean sans-serif**;
big tabular numbers; hairline dividers; single restrained accent.
Not taken: the dashboard's charts, side panels, notification feed.

## How it mapped to the app

| Reference cue | Applied to Desk View GIS |
| --- | --- |
| Light airy surfaces | Chrome flipped from dark navy → white/frosted panels over the Positron map |
| Dark contrast affordance | HUD status = dark pill; primary source button = black; active toolbar toggle = dark fill |
| White-outline secondary | "Use a camera" and default toolbar buttons |
| Clean sans + uppercase labels | System grotesque; gesture legend keys in uppercase letter-spacing |
| No emoji (felt "AI-sloppish") | All emoji replaced with a monochrome inline-SVG line-icon set |

## Constraints held (design system + safety)

- All values flow through CSS tokens in `css/style.css :root` (palette rebuilt
  light; hand-overlay colors kept as functional tokens).
- Hand skeleton colors stay distinguishable (right `--hand-right` cyan / left
  `--hand-left` magenta), incl. color-blind — per the safety rule.
- Icons are inline SVG (no web-font host) → no CSP change needed.

## Related items shipped in the same pass

- Blurred live map behind the splash (frosted `backdrop-filter`) as a
  foreshadowing preview, with a quick fade transition into the app.
- "Skip to map" bypass → map-only troubleshooting mode (mouse-driven).
