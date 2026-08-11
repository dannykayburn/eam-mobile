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

## 0. Run these. All committed — do not re-implement them.

```bash
node .claude/skills/verify/scripts/check-scope.js prototypes/standalone/eam-*.html && node .claude/skills/verify/scripts/check-keyboard.js && node .claude/skills/verify/scripts/run-load.js && for t in .claude/skills/verify/scripts/tests/test-*.js; do node "$t" || exit 1; done
```

**`check-keyboard.js`** guards the three keyboard-surface patterns, every one of
which shipped to a device before being caught. Each is verified to actually
fire — re-introduce any of them and the script reports it:

| | What breaks | Fix |
| --- | --- | --- |
| **P1** | A control at a sheet's **bottom edge** in a sheet that also holds a text input. `--kb-inset` lifts the sheet and parks that control under iOS's own accessory bar (`^ v ✓`) — two affirmative controls overlapping. | Put the action in the header (`.sheet-confirm-btn`), no `.sheet-footer`. |
| **P2** | A **full-attention surface opening without closing others**, so the previous sheet shows through underneath (seen: Comment Actions behind the checklist overlay, Set Equipment Photo behind the comment editor). | `openSheetExclusive()` for a `.bottom-sheet`; `closeAllSheets()` first for a non-sheet overlay. |
| **P3** | A rule pinning `bottom:0` on a `.bottom-sheet`, which **defeats `--kb-inset`** so the keyboard covers the sheet entirely. Only legitimate when the surface is anchored top *and* bottom (the full-cover text editor). | Keep `bottom:var(--kb-inset,0px)` on anything bottom-anchored. |

iOS's accessory bar cannot be suppressed from a web page. The rule is to never
put anything underneath it, not to remove it.

The `tests/` files are behavioural regressions for flows that broke on a real
device and were invisible to every static check:

- **`test-insert-roundtrip.js`** — fill Insert Mode → Create → land on the new
  record showing the entered data → find it again in the list, for both WO and
  Equipment, plus the required-field guard and header-description editing.
  Create was silently dead for ~2 weeks (see the `currentFlatFields()` note in
  `saveInsertRecord`): the Save button went green, the tap fired, and an
  exception killed it before anything was built. **A gate reporting "ready" is
  not evidence the action works — drive the action.**
- **`test-editors.js`** — the ✕/✓ keyboard-editing popups: confirm gating,
  required-empty refusal, sheet exclusivity, and the CSS contract.

**This is step 0 because skipping it shipped a dead app on 2026-08-11.** The
recipe below used to be prose, a past session re-implemented it as a weaker
per-`<script>`-block check, that check passed, and every search screen went
DOA on device. Run the scripts; don't rewrite them from the description.

- **`check-scope.js`** — compiles `eam-shared.js` + a page's inline scripts as
  **one** top-level scope, which is what the browser actually does for classic
  `<script>` tags, and separately reports lexical name clashes against shared.
  Checking each block in isolation **cannot** see these and will pass.
- **`run-load.js`** — actually *executes* each screen's full load path
  (`data/*.js` → `eam-shared.js` → inline) against a DOM shim, in several
  seeded states (cold, restored list state, Home hand-off, routed-in record,
  checklist fan-out). Compiling only catches redeclarations; **executing** is
  what catches temporal-dead-zone errors and anything thrown during init.

### The failure mode these exist to catch

A duplicate top-level `const`/`let` between a screen and `eam-shared.js` is a
`SyntaxError` that kills **the entire inline script** of that screen. What that
looks like on a device is deceptive, because `eam-shared.js` itself still ran:

- counters frozen at whatever their **static markup** said (e.g. "8 work
  orders" on a 3-record dataspy) — the giveaway, and the fastest way to
  recognise this class of bug
- no records rendered
- every screen-local button dead, while shared-owned chrome still works
- **Insert Mode opens but Save does nothing** — `openCreateSheet()` is shared,
  but `saveInsertRecord()` reads the screen's own `LOV_DATA`/`LOV_CURRENT`/
  `RECORD`, which were never declared

**Rule that follows:** prefix any new shared module-level variable with its
component (`sortSheetDir`, not `sortDir`). The 2026-08-11 break was shared's
sort sheet declaring a bare `sortDir` that both list screens already had.
Function declarations are safe to share a name (they just reassign); `const`,
`let` and `class` are not.

Run both across **every** screen after touching a shared file, not just the
screen you edited — a shared change can break any consumer.

## 2. Targeted assertions on real functions (beyond run-load.js)

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
