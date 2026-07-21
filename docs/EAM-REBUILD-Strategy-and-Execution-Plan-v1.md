# EAM Mobile — Ground-Up Rebuild Strategy & Execution Plan

Status: **v1 — draft, pending sign-off on the architecture decisions in §2 before Phase 0 starts.**

## 0. Why this doc is separate from design-decisions-v3-1.md

This is a process/execution document — task sequencing, file architecture,
progress tracking — not a design decision record. `design-decisions-v3-1.md`
just went through a consolidation pass specifically to remove that kind of
process narration ("Working-mode change," "compiled prototype frozen,"
conformance-sweep logs) because it clutters the authoritative spec. This
doc is where that churn belongs instead — matching the existing
`docs/handoffs/EAM-HANDOFF-*.md` convention already used for the
Book-Labor/WO-Closing and Issue-Parts/Book-Labor assembly briefs.

**Division of labor going forward:**
- **This doc** — what to build, in what order, how to keep it efficient,
  and a running checklist of progress.
- **`design-decisions-v3-1.md`** — the actual design decisions that come
  out of doing the work (Standard Model updates, module-specific deltas),
  same as always. Update it the same session a decision gets made — this
  doc doesn't change that habit.
- **`sample-screen-standard-model-prototype.html`** — gets a new canonical
  field type/pattern added the same session it's locked, same as always.

## 1. Goal

Rebuild every prototype screen against the current Standard Model, ending
with one compiled, working app that demonstrates:
- A **Free Form** WO and a **Not Free Form (Guided)** WO — two real WO
  records, selected from the WO List/Search screen, not a dev-only toggle
  outside the app frame (unlike the dark-mode toggle, which stays external
  since it represents a future real Settings preference — these two WOs
  represent a real *data-driven* branch, so they belong inside the app,
  reachable through real navigation).
- Every screen built once, against shared foundation, not 8 independent
  reinventions of the same buttons/sheets/tokens.

## 2. Architecture decisions — need your sign-off, these touch a locked convention

`CLAUDE.md` currently locks: *"Each prototype is a single self-contained
HTML file: no build step, no external dependencies beyond CDN-hosted
libraries if absolutely needed."* The efficiency goal you asked for
conflicts with treating that literally, so — flagging per that same
file's own instruction — here's the proposal:

### 2.1 Shared CSS + JS files (recommend: yes)

Right now, each standalone duplicates the *entire* design-token/component
CSS and shared JS (LOV sheets, header scroll-collapse, toasts, currency
formatting, etc.) independently. Measured on the current files:

| File | Total lines | `<style>` | `<script>` |
| --- | --- | --- | --- |
| `sample-screen-standard-model-prototype.html` | 1695 | 336 | 852 |

That's ~70% boilerplate that's identical (or should be identical) across
all 8 files. Across the full set (12,437 lines today), that's thousands of
duplicated lines — and every rebuild session re-writes/re-verifies all of
it per file, which is the actual token cost, not just the file-size cost.

**Proposal:** extract into
`prototypes/standalone/shared/eam-shared.css` and
`prototypes/standalone/shared/eam-shared.js`, loaded via plain relative
tags:
```html
<link rel="stylesheet" href="shared/eam-shared.css">
<script src="shared/eam-shared.js"></script>
```
This still opens directly via `file://`, no server, no build step, no
bundler — `<link>`/`<script src>` tag loading of local relative files is
not subject to the CORS restriction that blocks `fetch()`/`XHR` under
`file://` (that restriction, already documented in §3.4 of the design
doc, is what killed the iframe/`fetch()`-based compiled-shell idea
earlier — it doesn't apply to tag-based loading). **First thing built in
Phase 0 is a throwaway file that proves this loads correctly when opened
directly, before anything else depends on it.**

Trade-off: no longer literally *one* file per screen — a small shared
dependency. `CLAUDE.md`'s "Prototype conventions" section needs a one-line
amendment to reflect this if you approve it.

**What moves into the shared files:** design tokens (§3.2), typography
rules (§3.3), every row in Component Patterns (§3.4) that isn't
screen-specific, the LOV/bottom-sheet engine, header scroll-collapse
mechanics (§5.3), the List/Detail shell renderer (§8.2), the Insert Mode
shell (§9.2), sync icon/panel (§4.4), toast/confirm-modal utilities, and
currency/date/number formatting helpers.

**What stays per-file:** each screen's unique markup, its own field
config/data-binding, and any genuinely screen-specific JS (e.g. Issue
Parts' bin-stock-list rendering, Book Labor's crew sheet).

### 2.2 WO data as `.js` files, not `.json` (recommend: yes, technical necessity)

Same `file://` restriction blocks `fetch()`-ing a `.json` file too. Fix:
plain `.js` files that assign a global const, loaded the same tag-based
way:
```html
<!-- data/wo-19257.js -->
const WO_19257 = { woNumber: '19257', workflowType: 'NOT_FREE_FORM', ... };
```
```html
<script src="../../data/wo-19257.js"></script>
```
This finally resolves the long-standing `CLAUDE.md`/Remaining Work item
that `data/` is empty and WO 19257 needs extracting out of the standalones
into a shared source — it just resolves to `.js` instead of `.json` for
browsability reasons.

### 2.3 One set of 5 screens, not two (recommend: yes)

Free Form and Not Free Form aren't two different workflows — per §15.4,
they're the *same* 5 guided steps, differing only in whether the status
control is editable at two touchpoints (WO Record View, WO Closing). So:
**one rebuild of each of the 5 screens**, with the status-header logic
branching on `workflowType` read from whichever WO's data file got loaded
— not two parallel sets of files. This also finally resolves the
Remaining Work item that's been blocked since 2026-07-13 ("Free
Form/Not Free Form flag isn't modeled anywhere yet").

### 2.4 Routing between static files: query string, not a toggle

WO List/Search's row tap navigates to
`eam-wo-record-view-prototype-v1.html?wo=19257` (real link, replacing the
current `openWO()` toast stub). The target screen reads
`new URLSearchParams(location.search).get('wo')`, looks up a small WO
registry (which data file to load, which `workflowType`), and injects
that WO's data script tag. Stateless, bookmarkable, no localStorage
needed. Same mechanism carries the WO id through all 5 steps.

### 2.5 Two WO numbers — need you to confirm or pick

Proposing **WO 19257 = Not Free Form (Guided)** (it's already the
canonical WO referenced everywhere in the existing standalones) and a
**new WO — suggest 19831 — as Free Form**. Change either number if you
have a preference.

### 2.6 Sharing implications — read before Phase 0

Today, any single standalone file can be emailed/Slacked in isolation and
just works when double-clicked — zero dependencies. Once §2.1/§2.2 land,
a single file has relative references to `shared/eam-shared.css`,
`shared/eam-shared.js`, and `../../data/wo-*.js` — sending that one file
alone breaks: the recipient gets an unstyled, non-functional page. This
isn't a new *category* of problem — once WO List's `?wo=` navigation is
real (Phase 1), a screen already needs its sibling screen files present
to navigate anywhere — this just extends "needs its neighbors" to include
the shared CSS/JS/data too.

**How to share under this design, in order of preference:**
1. **Zip `prototypes/standalone/` + `data/` together, preserving folder
   structure.** Recipient unzips, opens the HTML file from inside that
   folder, everything resolves. Same simplicity as today plus one step.
   Right default for one-off "look at this" sharing.
2. **Host it, share a link** once real cross-screen navigation exists
   (Phase 1+) — better reviewer experience for anyone clicking through the
   full flow, and testable on an actual phone. Preferred over a zip for
   full walkthroughs.
   - **Decided 2026-07-15: start with a local static server** —
     `npx serve prototypes/` (Node already installed, zero extra setup),
     share the resulting `http://<machine-ip>:port/` URL with colleagues
     on the same network/VPN. No external upload, no account, no org
     approval needed to get moving.
   - **Not a one-way door.** The prototype is 100% static files with no
     server logic and no environment-specific config — the exact same
     folder that runs locally is what you'd later point GitHub Pages,
     Netlify, or an internal host at, with zero code changes. Moving
     later is "serve the same folder from somewhere else," not a rebuild.
     Two small things to watch when that day comes, neither a redesign:
     some static hosts are case-sensitive about file paths (keep
     filenames consistent-case); a hosted deployment benefits from a root
     `index.html` redirecting to WO List so the base URL isn't a 404.
   - Where to move to eventually (GitHub Pages / Netlify / internal
     corporate hosting) is still an open, no-remote-configured-yet
     question — revisit once there's real content worth hosting
     externally (post Phase 1).
3. **Git access** for anyone already in the repo — zero extra effort,
   already true today, not a new option.

**Not doing, unless single-file-attachment sharing turns out to be
frequent:** a one-shot export script that inlines the shared CSS/JS/data
into a standalone copy just for sharing. Extra tooling to maintain for a
case the zip already covers — revisit only if it becomes real friction.

## 3. Open scope question — App Shell in the compiled demo

Login, Navigation Bar, Profile, and the Sync Status Screen are all still
"pending, not designed" (§4). For "a completely compiled working app to
show" — do these need real screens, or is a lightweight pass-through
acceptable for this round (e.g., app opens straight to WO List, no login
gate; a minimal top nav bar with just the sync icon; no Profile/Settings
entry point yet)? Recommend the lightweight version for this pass — it
keeps focus on the workflow rebuild, and those four screens are
independent enough to design properly in a later round without blocking
this one. Flag if you want them in scope now instead.

## 4. Execution plan

Each phase ends with the design doc and Sample Screen updated for
anything newly locked during that phase — not deferred to the end.

### Phase 0 — Foundation (build once, everything else depends on it)
- [ ] 0.1 Prove `<link>`/`<script src>` local relative loading works when
      opened directly via `file://` (throwaway test file, delete once confirmed)
- [ ] 0.2 Extract `eam-shared.css` from Sample Screen + Equipment
- [ ] 0.3 Extract `eam-shared.js` from Sample Screen + Equipment, including
      a new `applyWorkflowTypeHeader()` helper for the Free Form branch
- [ ] 0.4 Rebuild Sample Screen + Equipment to consume the shared files —
      proves the pattern end-to-end against the two files that are already
      the canonical source
- [ ] 0.5 Amend `CLAUDE.md`'s prototype-conventions line for the shared-file
      architecture
- [ ] 0.6 Build `data/wo-19257.js` (Not Free Form) and `data/wo-19831.js`
      (Free Form), plus the small WO registry

### Phase 1 — WO List/Search (entry point)
- [ ] Rebuild against shared foundation
- [ ] Add both demo WOs to the list
- [ ] Wire real navigation (`?wo=` query string) — retire the `openWO()` toast stub

### Phase 2 — WO Record View (Step 1)
- [ ] Rebuild against shared foundation
- [ ] Implement the Free Form/Not Free Form status-header branch for real

### Phase 3 — Activity Checklist (Step 2)
- [ ] Rebuild against shared foundation (already conformant once — this is
      a migration, not a redesign)

### Phase 4 — Issue Parts (Step 3)
- [ ] Rebuild against shared foundation

### Phase 5 — Book Labor (Step 4)
- [ ] Rebuild against shared foundation

### Phase 6 — WO Closing (Step 5)
- [ ] Rebuild against shared foundation
- [ ] Implement the Free Form status-header branch here too

### Phase 7 — Compile
- [ ] Rebuild `prototypes/wo-workflow/index.html` from the final standalones
      (per the plan already locked in the design doc) — both demo WOs
      navigable end-to-end through real routing

### Phase 8 — Retire old files
- [ ] Move every superseded standalone version to `prototypes/standalone/old versions/`
- [ ] Confirm no screen has two live versions

## 5. Efficiency tactics (the "reduce tokens" part)

- Foundation-first sequencing (Phase 0) means every later phase is a small
  diff against shared code, not a full regeneration.
- Each screen rebuild happens as its own isolated unit of work — keeps
  context focused on one file's actual delta instead of re-loading the
  whole shared foundation into context every time.
- Shared JS exposes config-driven helpers (`openLovSheet(config)`,
  `renderListDetailShell(tabKey)`, etc.) — screens call these, they don't
  re-implement sheet/toast/formatting mechanics locally.
- No re-deriving rules per screen — check Sample Screen + this plan's
  phase checklist first, same discipline as always.

## 6. Progress tracking

Check boxes off in this file as phases complete. Update the "Status" line
at the top when a phase finishes. This file is expected to get noisy with
progress notes over many sessions — that's fine here, unlike in the design
doc.

## 7. Session 2026-07-16 — conformance audit, WO List overhaul, and
   tomorrow's plan

Since this doc was written, a full conformance audit ran (5 parallel
reviews against `design-decisions-v3-1.md`), cross-cutting fixes landed
(`.org-pill.required` marker, Comments/Documents collapsibility on both
canonical files, restored `.bar-meta` on 4 WO-workflow bottom bars, "no
icons inside any pill/field" locked as a general rule), and WO List got a
full visual overhaul (icons/tinted badges stripped, WO's own description
now the headline, nav bar swapped to the avatar/sync pattern, bottom nav
added). None of that changes this doc's Phase 0–8 plan below — it's the
same foundation-first sequencing, just executed piecemeal against the
existing standalones instead of waiting for a from-scratch Phase 0. Two
things *do* need folding into the plan:

### 7.1 WO List is the template for every future top-level record list

Not just "the WO screen" — it's the de facto Standard Model instantiation
of "a top-level record list with a dataspy bar, Detailed/List view toggle,
and browsing-tier nav chrome." When Equipment (or anything else) needs its
own top-level list/search screen, **start from WO List's markup/CSS/JS
and swap the data source** — don't design a second pattern from scratch.
Concretely: the card/list-row anatomy (§6.5–§6.7 in the design doc, just
rewritten this session), the dataspy bar/sheet mechanism, and the
Detailed/List mode toggle are all generic enough to carry over directly;
only the field mappings (what a "type," "status," "priority" mean for
that entity) change per screen.

### 7.2 The compiled-app question — reconciled, needs a throwaway proof-of-concept first

§2.1 above already notes an "iframe/`fetch()`-based compiled-shell idea"
was killed earlier by the `file://` restriction on `fetch()`/XHR. On
re-inspection that's not quite the same mechanism as what's being
proposed now — that earlier idea used `fetch()` to pull in HTML content as
text; an `<iframe src="...">` is tag-based navigation (same category as
`<link>`/`<script src>`), not a `fetch()` call, so it isn't blocked by
that specific restriction. The real open question is narrower: whether
the **parent shell and the iframe can script each other** (parent calling
into the iframe to swap it, or the iframe telling the parent "navigate
me") — that's a same-origin question, and `file://` documents' origin
handling for cross-frame scripting is genuinely browser/version-dependent
in a way tag-based loading isn't. Two paths, need to pick one tomorrow:

- **Option A — iframe shell.** One persistent outer frame (ideally almost
  no visible chrome of its own — each standalone already draws its own
  complete nav/bottom-nav, so the shell shouldn't compete with a second
  copy), iframe `src` swapped to route between the real standalone files.
  Closest to "one file per screen, genuinely invoked, not copied." Real
  risk: cross-frame scripting under raw `file://` is not guaranteed
  across browsers. **This project has already decided to serve from a
  local static server for real use** (§2.6 above, decided 2026-07-15,
  `npx serve prototypes/`) — under that model there's no cross-origin
  ambiguity at all, same-origin `http://localhost:port` on both sides.
  So Option A is likely fine for how this project actually gets used and
  shared, just build a 2-file throwaway (shell + one dummy screen) and
  confirm parent↔iframe scripting works first, under the server *and*
  raw `file://`, before committing every screen's nav to it — same
  "prove it before depending on it" discipline as Phase 0.1 already uses
  for shared CSS/JS.
- **Option B — real navigation, already planned (§2.4 above).** WO List's
  row tap becomes a real link (`eam-wo-record-view-prototype-v1.html?wo=
  19257`), full page loads between actual standalone files, no framing,
  no cross-origin risk at all, works identically under `file://` and a
  server. Loses zero-flash SPA-style transitions (each navigation is a
  real page load) but every screen already draws its own persistent-
  *looking* chrome, so the experience still reads as one continuous app.
  Lower risk, less to build, and it's what §2.4 already committed to —
  the only reason to prefer A over it is if smooth no-reload transitions
  actually matter enough to justify the added risk.

**Recommendation: build the Option A throwaway proof-of-concept first —
if parent↔iframe scripting checks out cleanly under both the server and
`file://`, go with A; if it's flaky under `file://`, fall back to B
without having lost more than the time spent on the 2-file test.**

### 7.3 Shared-component consolidation — do this *as part of* wiring navigation, not after

Directly motivated by today's session: fixing WO List's nav-title
font/centering bug required hand-editing a *local duplicate* of CSS that
already exists correctly in `eam-shared.css` — exactly the "15-minute
session to update one thing across 3 files" problem to avoid going
forward. Two concrete moves:

- **Audit what's still duplicated locally that shouldn't be.** `.nav-
  avatar`, `.bottom-nav`/`.bottom-nav-item`, `.nav-title` centering, the
  sync-icon markup pattern — all now exist correctly in `eam-shared.css`,
  copied by hand into `eam-wo-list-prototype-v5_1.html` today rather than
  linked, only because that file predates the shared-file architecture.
  When WO List (and whichever screen needs a top-level-list pattern next,
  e.g. Equipment's own) get their real rebuild pass, this is exactly the
  Phase 0.2–0.4 work already planned above — just confirming it's still
  the right call, doubly so now that WO List has its own local copies of
  3 more shared components than it did this morning.
- **Every new generic component built from here forward goes in
  `eam-shared.css`/`.js` first, screen-local only until a real 2nd
  consumer appears** — the pattern this session already used correctly
  for `.nav-avatar` (promoted immediately, treated as nav-bar chrome, not
  gated behind a usage count) and the profile-menu toggle mechanism
  (generalized to `toggleActionsMenu(id)`/`closeActionsMenu(id)` rather
  than a third bespoke function). Keep doing that by default, not just
  when it's convenient.
