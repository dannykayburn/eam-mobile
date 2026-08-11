---
name: verify
description: Repo-specific verification recipe for the EAM Mobile prototypes (static HTML/CSS/JS, no build step).
---

# Verifying changes to prototypes/standalone/*.html and shared/eam-shared.{css,js}

## Read this first — browser preview is disabled in this environment

`preview_start` / `preview_list` / `preview_eval` are **admin-denied**.
Don't retry them; you'll just burn a turn on a permission error. The
browser-driven recipe is kept at the bottom for whenever that changes, but
**the static path below is the working one.** Live/visual confirmation comes
from the user testing on their own phone — so say plainly what you verified
and what still needs their eyes, and never imply a screen was seen running
when it wasn't.

## 1. Parse every page the way the browser loads it

Catches syntax errors AND cross-file redeclarations — separate `<script>`
tags share one global lexical scope, so a screen declaring `let currentTab`
when `eam-shared.js` already does is a `SyntaxError` that kills the whole
screen. This has happened for real.

Extract each page's scripts in document order (external `src` first, then
inline), concatenate, and `node --check`:

```js
// scratchpad/extract.js — page path in argv[2], output in argv[3]
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(process.argv[2], 'utf8');
const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"[^>]*>/g)].map(m => m[1]);
const base = path.dirname(process.argv[2]);
let out = '';
for (const s of srcs) out += '\n' + fs.readFileSync(path.join(base, s), 'utf8');
fs.writeFileSync(process.argv[3], out + '\n' + inline.join('\n'));
```

Run it across `prototypes/standalone/*.html` after touching a shared file —
a shared-file change can break any consumer, so check them all, not just
the screen you edited.

## 2. Execute the real functions with a DOM shim

Concatenate `eam-shared.js` + assertions into one file and run it under
Node. Everything shares one scope this way, so `let`-declared shared state
(`equipMultiMode`, `woCurrentStep`, …) is readable — with `eval()` it is
**not** (only `function` declarations hoist out of a direct eval).

**The shim gotcha that cost real time:** stub `localStorage` as a no-op and
every persistence-backed function silently does nothing — which looks like a
pile of genuine logic failures. Give it real in-memory storage:

```js
const _mk = () => { const m = {}; return {
  getItem: k => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
  setItem: (k, v) => { m[k] = String(v); },
  removeItem: k => { delete m[k]; },
}; };
global.localStorage = _mk(); global.sessionStorage = _mk();
```

Plus a minimal `document`/`window`. For renderers that read back what they
wrote, hand `getElementById`/`querySelector` per-id fake nodes that record
`innerHTML`/`textContent` rather than one shared stub — that's what makes
assertions on rendered markup possible.

This has verified, for real: the WO equipment store's whole state model
(route insert → MEC child minting → clear → delete → pill visibility), the
step rail's Reference-destination mode, multi-select LOV selection/commit,
and that a card's `data-search` attribute stays clean text.

**Always include a regression assertion for the untouched path**, not just
the new one — e.g. after adding `activeRef` to the rail, assert a normal
step screen still renders exactly one active row.

## 3. Grep for the things parsing can't catch

- Screen functions/consts silently overriding shared ones (a `function`
  redeclaration is legal and wins by source order — no error at all).
- Stale references after a rename or a removed element.
- Required per-screen markup ids: `#toast`/`#toastMsg`,
  `#listDetailHeader` carrying `active`, `#confirmOverlay`/`#confirmMessage`/
  `#confirmDangerBtn`, and any component-specific footer ids. Shared
  behavior no-ops silently without these — see §16.10.

## What static verification cannot tell you

**CSS.** Layout, colour, contrast in both themes, tap-target size, anything
transition-driven. Say so explicitly rather than implying coverage.

## If browser preview is ever re-enabled

`.claude/launch.json` → `npx serve prototypes -l 5175`; pages at
`http://localhost:5175/standalone/<file>.html`. Drive it with `preview_eval`
calling the page's own real handlers (`openLov('key')`, `goToTab('tab2')`).

**Known harness gotcha (confirmed 2026-07-16):** the preview pane runs
`document.hidden === true`, and Chrome freezes CSS transitions on hidden
tabs — a `.open` class add with `transition:transform .32s` never reaches its
target computed value no matter how long you wait, even with an inline
`!important`. So: `preview_click` on a coordinate that depends on a
transition completing will silently miss (the element is still at its
pre-transition position) — don't read that as "the click does nothing."
`preview_screenshot` has also timed out at 30s in this state; `preview_snapshot`
(accessibility tree) was the reliable fallback. Static computed properties
(z-index, colour, display, text, classList) do read correctly — trust those.
Useful trick: iterate `document.styleSheets[].cssRules` with
`el.matches(selectorText)` to list every rule actually hitting an element
when a computed value looks wrong.
