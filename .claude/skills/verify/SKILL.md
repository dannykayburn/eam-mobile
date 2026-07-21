---
name: verify
description: Repo-specific verification recipe for the EAM Mobile prototypes (static HTML/CSS/JS, no build step).
---

# Verifying changes to prototypes/standalone/*.html and shared/eam-shared.{css,js}

## Launch

A local static server config already exists: `.claude/launch.json` →
`npx serve prototypes -l 5175`. Use `preview_start` with name
`prototypes` (reuses if already running). Pages are then at
`http://localhost:5175/standalone/<file>.html`.

## Drive it

Use `preview_eval` to call the page's own real functions directly
(`openLov('key')`, `openInsertMode('tab1')`, `selectLov('CODE','Desc')`,
`goToTab('tab2')`, etc.) — these ARE the real onclick handlers, just
invoked programmatically. Read back state with a second eval: DOM text,
classList membership, `getComputedStyle(...).zIndex` / other *static*
(non-animated) computed properties.

## Known environment gotcha — do not trust click-simulation or screenshots for anything CSS-transition-gated

The preview pane runs with `document.hidden === true` / `visibilityState
== "hidden"` / `document.hasFocus() === false`. Chrome throttles/freezes
CSS transitions on hidden tabs. Confirmed 2026-07-16: a `.open` class add
with `transition:transform .32s ...` never resolves to its target value
no matter how long you wait or how many separate eval round-trips pass —
even an inline `!important` override on the same property doesn't move
the computed value. This is NOT a page bug; it's the harness's tab
visibility state freezing the animation. Consequences:
- `preview_click` on a coordinate that depends on a transition having
  completed (e.g. a field inside a sheet that's supposed to have slid
  into view) will silently miss — the element is still positioned at its
  pre-transition location. Don't conclude "click does nothing" from that
  alone; verify via direct function call + computed *non-animated*
  properties (z-index, classList, text content) instead.
- `preview_screenshot` has also timed out (30s) on this same page in this
  same hidden-tab state — don't block verification on getting a
  screenshot; `preview_snapshot` (accessibility tree) worked reliably
  as a visual-structure fallback when screenshot hung.
- Static/non-transitioning computed properties (z-index, color, display,
  text content, classList) read correctly even in this state — trust
  those.

## What's worked so far

- Confirming a CSS fix landed: reload page, `getComputedStyle(el).<prop>`
  for the changed non-animated property.
- Confirming an interaction flow end-to-end: chain direct function calls
  in one eval (e.g. `openInsertMode('x'); openLov('key');`) then a
  second eval reading back classList/z-index/text on all the elements
  involved — this exercises the real code path (same functions the
  onclick attributes call) without depending on the frozen transition.
- `document.styleSheets[].cssRules` iteration with `el.matches(selectorText)`
  to list every CSS rule actually matching an element, when a computed
  value looks wrong and you need to find what's really being applied.
