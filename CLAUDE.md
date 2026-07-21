# HxGN EAM Mobile — Project Memory

## What this is
A technician-first, offline-capable work order execution app (iOS/Android) for
HxGN EAM. We are prototyping a guided 5-step WO workflow: WO Record View,
Activity Checklist, Issue Parts, Book Labor, WO Closing — plus, as of
2026-07-16, a Home screen and the app-level navigation shell (bottom nav,
avatar/profile menu, sync icon) that wraps around all of it. The nav shell's
*mechanics* are locked (§4.2/§4.3 of the design doc); Home's own *content*
(which dataspy tiles/chips, counts) is still an open, unlocked design riff —
don't treat anything about Home's tile/chip choices as decided.

## START HERE next session
Read `docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` §7 before doing
anything else. That's the live, current plan — what's already built, the
compiled-app decision that needs a throwaway proof-of-concept first, and
the shared-component discipline to follow going forward. Don't re-derive
a plan from scratch or re-run the conformance audit from §7/§8 below
again — it already ran once (2026-07-16), its cross-cutting fixes are
already applied, and its remaining findings are already logged as tracked
debt in `docs/design-decisions-v3-1.md` §20. Re-auditing everything again
is exactly the kind of token burn to avoid.

**Resolved 2026-07-22 (was the blocking "single vs. multiple WO base
function" question):** stays on **one function, `WSJOBS`, always**
(including the fallback) — keeps the WO List dataspy mechanism
(§6.3/§8.3) exactly as already built, untouched. A real EAM precedent for
routing WO Types to distinct `FUN_CODE`s does exist in this customer's
data (`docs/Data_refs/Page Layouts perms/`) and was seriously explored
this session, but was rejected specifically because it would've
fragmented the dataspy mechanism across multiple functions for no benefit
here. The WO-Type dimension instead comes from two small additions: a new
`WOTYPE` column on the existing `R5PAGELAYOUT` (field-level layout), and
one genuinely new small table, **WO Workflow Steps** (tab visibility/
order/required + the Free Form flag + status source, keyed WO Type ×
User Group × Step) — both authored through Screen Designer (§10) itself,
which gains a WO Type selector; no new admin screen. Full resolution in
`docs/design-decisions-v3-1.md` §11–§13. Existing `R5FUNCTIONTABS`/
`R5TABPERMISSIONS` (real tab-level access control) are completely
untouched by any of this.

## Source of truth
`docs/design-decisions-v3-1.md` is the authoritative design spec. Never
contradict a locked decision in that doc without explicitly flagging it to
the user first. It's long (2,400+ lines) — grep for the section you need
rather than reading it end to end.

`docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` is the process/
execution doc — what to build, in what order, and the current plan. Check
there before design-decisions-v3-1.md for "what should I work on," and
check design-decisions-v3-1.md for "what's the locked rule for X."

Also read `docs/project-kickoff-whitepaper-v3.md` for current project status,
architecture questions, and proposed sequence.

`docs/component-library.md` (new 2026-07-21) is the human-readable,
name-first component reference — "what is the thing called X, and what
are its rules," browsable by proper name rather than CSS class. Different
job from the other two: `design-decisions-v3-1.md` is the locked-rule
spec, `docs/ui-component-inventory.md` is the raw CSS-level audit,
`component-library.md` is the named catalog that ties a plain-English
name to both. Add an entry here whenever a recurring on-screen pattern
gets named/audited/resolved — don't let "what do we call this thing"
become a re-investigation every time it comes up.

## Current state
- **Canonical standard (locked, build every new/rebuilt screen against
  these two files, don't re-derive rules per screen):**
  `sample-screen-standard-model-prototype.html` (every field type + the
  rule captioned under each — §5.2) and `eam-equipment-record-view-prototype-v1.html`
  (the standard applied to a full record view, incl. the canonical header
  pattern — §5.3). Both load `prototypes/standalone/shared/eam-shared.css`
  and `eam-shared.js` (see "Shared-file architecture" below) — copy their
  markup/config conventions, not their pre-2026-07-16 self-contained form.
- **Rebuild in progress, not patch-in-place.** The 5 WO workflow steps
  predate the canonical standard above and were getting retrofitted via
  repeated conformance sweeps — that approach is retired. Screens are now
  being rebuilt fresh, one at a time, referencing the two canonical files
  directly:
  - Rebuilt onto the shared-file architecture: `sample-screen-standard-
    model-prototype.html`, `eam-equipment-record-view-prototype-v1.html`,
    `eam-wo-record-view-prototype-v1.html` (Step 1),
    `eam-activity-checklist-prototype-v2.html` (Step 2, rebuilt again
    2026-07-21 — see the dated bullet below, this is now its 2nd rebuild),
    `eam-wo-prototype-issue-parts-v1.html` (Step 3),
    `eam-book-labor-prototype-v2.html` (Step 4),
    `eam-wo-closing-prototype-v2.html` (Step 5) — **all 5 WO workflow
    steps are now rebuilt**, no old-pattern screens remain. The step-rail/
    timer-pill/bottom-bar chrome (§14.2–§14.7) now lives in the shared
    files too, generalized when Activity Checklist became the 2nd real
    WO-workflow consumer — WO Record View was retrofitted onto it the same
    day; Issue Parts, Book Labor, and WO Closing are the 3rd/4th/5th
    consumers. The timer pill also gained a STOPPED state (gray, no pulse
    — `.timer-pill.stopped`) for Book Labor, where the WO timer has
    already stopped (§18.2); WO Closing has no timer pill at all, same as
    WO Record View. The Yes/No prompt bar (§14.6) is still screen-local
    (one consumer so far) — its old checklist-local partner, the
    Instructions/Attachments info sheet, is gone as of the checklist's
    2026-07-21 rebuild (see the dated bullet below): Instructions was
    never a real, separately-supported field, and Attachments became a
    real per-item Documents container instead of a read-only info sheet.
    Issue Parts' Store/Bin/Lot LOV picking also
    stays local — dynamic per-sheet options + a nested-above-a-sheet stack
    are a different shape from the shared single-field `openLov()` — but
    reuses the shared sheet/lov-option markup/CSS. Book Labor's Add/Add-
    by-Crew Save buttons reuse the shared `.insert-save-btn`
    (gray→green); its Correction sheet's always-ready red Save uses a new
    `.insert-save-btn.danger-ready` modifier. WO Closing's Closing Codes
    sequential-unlock grid, status change control (§19.2 Option D), and
    inline required Closing Comments textarea stay local too — no shared
    equivalent for any of the three; its "every container is collapsible"
    pattern (§3.4) is likewise still screen-local, first real consumer.
    WO Closing's Remove-attachment confirmation now reuses the shared
    centered `openConfirm()` modal (§3.4), which gained an optional 3rd
    `dangerLabel` arg for this (defaults to `'Delete'`, backward
    compatible with every existing 2-arg caller).
  - Retire each old file to `prototypes/standalone/old versions/` once its
    replacement lands — never keep both versions of the same step live.
- **`eam-home-screen-prototype-v1.html`** (new 2026-07-16, iterated
  2026-07-20) — Home screen, built on the shared-file architecture from
  the start. Introduced the app-level nav shell: `.nav-avatar` (top-left,
  browsing-tier screens), `.bottom-nav` (Home/Work/Notifications,
  glass/blur, anchored not floating), and the profile dropdown (100%
  reused `.rec-actions-menu` shell, just left-anchored) — all promoted
  into `eam-shared.css`/`.js` immediately as nav-bar chrome, not held
  screen-local. Also introduced §9.4's two-pill Insert Mode header for
  Home's Create action — **built out to a real save 2026-07-20** (full
  WO/Equipment flat-field containers, Comments/Documents, real save gate,
  real "After Save" navigation via `navigateToNewRecord()`; see §9.5).
  Home's Create bar is Equipment Insert Mode's *only* entry point — no
  Equipment List screen exists yet. **2026-07-20 pass:** a greeting/status strip
  atop the scroll body; Favorites reshaped into a taller/narrower
  vertical icon-over-name stack with the count badge dropped (screen
  icon alone disambiguates); the Home tile grid split into two labeled
  sections ("My Work"/"My Equipment") and switched from a fixed-column grid
  to the same horizontally-scrolling-row mechanic as Favorites (no cap
  on tiles per section this way), tile size pulled back down to a
  compact scroll-row size; section labels (`.home-section-label`)
  restyled bold black/white instead of a muted caption; the Create bar
  moved out of the scroll body into its own pinned strip between the nav
  header and `.home-body`, and opted into the generalized scroll-collapse
  mechanism (§5.3) via `.scroll-collapse` so it collapses on scroll down
  and reappears near the top, same as Record View's status row. This
  pass also fixed a real bug surfaced while wiring the header-tap-to-
  scroll-top standard (now locked app-wide, §4.2): `scrollFormToTop()`
  was hardcoded to `.tab-content.active`/`.content` and silently did
  nothing on Home, whose scrollable body is `.home-body` — it now reads
  `activeContentSelector`, set by `initSharedApp({contentSelector})`,
  instead of a hardcoded selector. `eam-wo-list-prototype-v5_1.html`
  (no shared-JS link) got a local equivalent, `scrollListToTop()`.
  Tile/chip/section **content** (which dataspies, which tiles, counts)
  is still an open, unlocked design riff — the layout mechanics above
  (scroll-collapse, tap-to-top, horizontal-scroll sections) are locked;
  don't treat the specific tiles/chips shown as decided.
- **List Search Screen standard (§8.3, locked/unified 2026-07-20)** — ONE
  card/list/filter/sort/dataspy-bar standard now governs every dataspy-
  scoped record list in the app: WO List, WO Search, and every child tab
  (§8.2's shell). No per-screen exceptions except §8.2's Costs variant
  (structural — an aggregation view, not a plain list). Card = up to 6
  fields from the dataspy's own column order (pill headline / muted
  subline / up to 3 attribute rows, reusing `.field-label`/`.field-value`
  exactly), with Organization carved to a gray corner badge whenever it's
  present in the first 6 columns. List mode shows every field available
  (tiered online/offline, §6.13). Filter chips and sort options are the
  same 6 fields, all of them, uniformly. Dataspy bar/selector dropped its
  live record count and gained a favorite star (favorited dataspies sort
  to the top). Dates are always plain `MM/DD/YYYY`, never relative or
  urgency-tinted, anywhere. Rendered via `renderStdCard`/`renderStdTable`
  in `shared/eam-shared.js` — never hand-roll a card/table for a new
  dataspy-driven list, call these instead. Prototyped in isolation at
  `eam-card-standard-prototype-v1.html` (an active canonical reference,
  not a throwaway).
- **`eam-wo-list-prototype-v5_1.html`** — rebuilt 2026-07-20 onto the
  §8.3 standard above (its old bespoke card/table anatomy, §6.5/§6.6, is
  retired — see `design-decisions-v3-1.md` §21). Now links
  `eam-shared.css`/`.js` too (added same day for its own Insert Mode build,
  §9.5 — the LOV-sheet/section-card/org-pill machinery Insert Mode needs
  wasn't worth a 3rd hand-copy). Its pre-existing local duplicates
  (`.nav-avatar`, `.bottom-nav`, the §8.3 card component, `.field-label`)
  are untouched, identical-but-local overrides — not yet de-duplicated
  against the shared versions (that's still this file's own future full
  rebuild pass). WO's own
  first-6 dataspy columns: Status (pill headline), Description (subline),
  WO Number/Priority/Due Date (attribute rows), Organization (corner
  badge). Parent/child expand (§6.9) and the 3-real-sheet/3-stub filter
  chip split (§6.11) are this file's own local logic layered on top of
  the shared visual standard — not something `renderStdCard`/
  `renderStdTable` need to know about generically. **Treat this file as
  the template for any future top-level record-list screen** (Equipment's
  included) — copy its dataspy-bar/card-list/nav pattern and swap the
  data source, don't design a second version of this pattern. Pre-rebuild
  version archived at `prototypes/standalone/old versions/
  eam-wo-list-prototype-v5_1.html` for reference.
- **Insert Mode (§9) built for WO and Equipment, 2026-07-20** — first real
  §9.1 standard-1 ("Record View insert") builds, end to end: real field
  content, a real Save, and real "After Save" navigation (§9.2/§9.5). WO
  has 2 entry points (WO List's own Create, Home's Create bar); Equipment
  has 1 (Home's Create bar only — no Equipment List screen). Both
  `eam-wo-record-view-prototype-v1.html` and
  `eam-equipment-record-view-prototype-v1.html` now check (consume-once,
  no query flag — `npx serve` drops query strings on its clean-URL
  redirect, see §9.5) for a freshly-created record in `sessionStorage`,
  written by the new `navigateToNewRecord()` helper, and render it instead
  of their hardcoded demo record — same screen, ordinary Standard Update
  Mode. Don't re-derive
  field sets for either entity's Insert Mode — §9.5 already locks this
  session's working defaults.
- A full conformance audit ran 2026-07-16 (5 parallel reviews against
  `design-decisions-v3-1.md`) — cross-cutting fixes are already applied
  (see `eam-shared.css`/`.js` inline comments dated that day for what and
  why); remaining per-screen findings and doc-structure issues are tracked
  as open debt in `design-decisions-v3-1.md` §20, not re-discovered.
  Don't re-run this audit; extend §20 instead if something new turns up.
- **Sync Status Screen (§4.5) built 2026-07-20** — `eam-sync-status-
  prototype-v1.html`, the drill-down reached via the sync panel's Review
  action. Also built the sync panel itself (§4.4.2, didn't exist in code
  before this — only the icon's 5 states were documented): a bottom
  sheet (`openSyncPanel()`/`#syncPanelSheet`) wired so far to Home's sync
  icon only, the other 10 screens' sync icons are still inert stopPropagation
  stubs. Demo outbox data (`SYNC_DEMO_ITEMS`) and all the sync-item
  behavior (`openSyncErrorRecord`, `deleteSyncItem`, `syncItemDeletable`,
  `retrySyncItem`, `syncErrorTierText`) live in `eam-shared.js` since the
  panel is a 2nd real consumer of the same data the full screen shows;
  the full screen's own card rendering/protection-label copy stays local
  (single consumer so far). Carried over all four of legacy Mobile's
  Transaction Log protection rules (`docs/existing_use_cases/
  EAM.MOBILE.REQ.TransactionLog.txt`): WO Status locked mid-Started-
  workflow, LOTO/Calibration read-only, Start/Stop labor delete-from-
  end-only, nonconformity delete-only. Trouble-field surfacing
  (`applySyncErrorBanner()`/`scrollToField()`) is generic enough that WO
  Record View and Equipment Record View both opt in via one `#syncErrorBanner`
  container + one init-time call — reuses the exact `data-field="key"`
  hook `openLov()` rows already carry, no new markup convention. A
  not-yet-synced local record (the insert-vs-update question raised this
  session) needed zero new code — it already opens through the existing
  `navigateToNewRecord()`/Standard Update Mode path from §9.5, just with
  the error banner layered on top the same way a synced record gets it.
  **Same-day follow-up pass:** fixing a flagged field now clears its own
  trouble state live (red left-bar/inline message/banner chip all gone
  the instant the value changes) — one shared `clearFieldSyncError(key)`
  wired into every field-mutation entry point in `eam-shared.js`
  (LOV/edit/date/date-time select-or-clear, inline text blur, checkbox
  toggle), unconditional since there's no client-side validation engine
  anywhere in this app to gate it on. The banner also gained a **Retry**
  button and a 3-state machine (red/orange/green — `SYNC_ERROR_ACTIVE`,
  `renderSyncBanner()`, `retryFromBanner()`): offline just queues,
  online actually resolves against a hand-flipped `DEMO_ONLINE` toggle
  (next to the theme toggle — this prototype has no real connectivity to
  detect) and removes the item from `SYNC_DEMO_ITEMS` on success. Also
  fixed a real bug from the first pass: a tier-3 item with no message
  and no fields (e.g. the Equipment demo card) never set
  `eamSyncErrorContext` at all, so its banner silently never appeared —
  `openSyncErrorRecord()` now always sets it. `navBack()` on WO/Equipment
  Record View now returns to the Sync Status Screen (via a consume-once
  `eamSyncReturnUrl` flag) when that's where the technician came from,
  instead of always falling back to the generic list-screen stub.
  **Dev-server note:** `npx serve prototypes`'s clean-URL redirect was
  found completely broken in this environment (redirects `.html` →
  extensionless, then 404s the extensionless path, for *every* file, not
  just this feature's) — added `prototypes/serve.json` with
  `{"cleanUrls": false}` to serve `.html` paths directly and sidestep it;
  every internal link already uses explicit `.html` hrefs, so this has
  no effect on app behavior.
  **2nd same-day refinement pass:** the banner's single small Retry
  button became a full `.sync-card-actions` Retry/Discard pair — the
  exact same two-button component the Sync Status Screen's cards already
  used, promoted to `eam-shared.css` on this 2nd consumer. Retry is now
  protected until the flagged field clears (tapping it early just shows
  a toast rather than re-reporting the failure it just displayed) and
  turns green (`.sync-card-btn.ready`, same language as
  `.insert-save-btn.ready`) once unblocked; Discard is never gated and
  always reuses `deleteSyncItem()` verbatim, so its confirm copy/behavior
  is identical whether tapped from the banner or a Sync Status Screen
  card. The Sync Status Screen's own cards picked up the identical
  gating + styling + a matching online/offline toggle, so both surfaces
  read the same rule. `fields` stays an array structurally, but the
  actual expectation (confirmed this session) is at most one flagged
  field per item — this server rejects and responds per-request, it
  doesn't compile a multi-field validation list.
- `prototypes/wo-workflow/index.html` exists (the prior unified compile)
  but is **intentionally frozen** during this rebuild phase. It's also
  the *wrong* model to extend — it's a hand-merged monolith with no live
  connection to the standalone source files, meaning any fix needs making
  in two places forever. The plan now (see "START HERE" above) is a real
  compiled shell that actually invokes the standalone files rather than
  duplicating them — still being proven out, don't build toward the old
  monolith pattern in the meantime.
- **`data/` — Phase 0.6 started 2026-07-20, not finished.** Real reference
  data lives in `docs/Data_refs/` (real EAM exports + screenshots for
  Employees/Crews/Stores/Parts/Trades/Custom Fields — see that folder's
  own memory note). `data/employees.js`, `crews.js`, `crew_employees.js`,
  `stores.js`, `parts.js`, `parts_stock.js`, `wo_parts_lines.js`, `closing_codes.js`,
  `custom_field_defs.js`, `equipment.js`, `wo-19257.js`, `wo-19831.js`,
  `wo-registry.js` all now exist as plain JS globals (`file://` blocks
  `fetch()`/XHR but not `<script src>`). Live consumers so far: Custom
  Fields (WO Record View + Equipment), **Book Labor, wired 2026-07-21**
  (Employee/Crew lists from `employees.js`/`crews.js`, and the booked-
  labor list itself seeded from `wo-19257.js`'s new `labor` array via
  `renderSeedLabor()`, not hardcoded HTML), and **WO Closing, wired
  2026-07-21** (Closing Codes' Problem/Failure/Cause/Action option lists
  now source from `closing_codes.js`'s `EAM_CLOSING_CODES` instead of a
  screen-local duplicate — values unchanged, only the source of truth
  moved). Issue Parts still carries its own local hardcoded parts data
  untouched — rewiring that, and real cross-screen `?wo=` navigation, is
  still open (Phase 1+, unstarted). Don't assume "the data files exist" means "the
  screens use them" — check per-screen.
- **Custom Fields container — built 2026-07-20, WO + Equipment Record
  View only.** Admin-defined fields per record Class+Class Org, collapsible,
  same shell as Equipment's other accordions, renders nothing when no
  definition matches. `applyCustomFields()`/`renderCustomFieldsSection()`
  in `eam-shared.js`, defs in `data/custom_field_defs.js`. Equipment's real
  PUMP set (FLA/INLET/OUTLET/PHASE/HP) replaced the old hardcoded, Class-
  gated "Pump Information" section — same real values, now data-driven.
  See design-decisions-v3-1.md §22 for the full rule set, including a
  pending call on Group Label rendering (sparse in the real export,
  forward-filled here — not a confirmed spec).
- **Preview server now serves the repo root, not just `prototypes/`** —
  changed in `.claude/launch.json` (`serve .` instead of `serve prototypes`)
  2026-07-20, specifically so screens' `<script src="../../data/...">` tags
  can reach the top-level `data/` folder. URLs shifted accordingly (e.g.
  `/prototypes/standalone/eam-wo-record-view-prototype-v1.html`, not
  `/standalone/...`) — existing relative links between prototype files are
  unaffected (they resolve against each file's own path, not the server
  root). Don't revert this without re-pointing those script tags.
- **Identity renamed Brian Campbell → Bruce Campbell, 2026-07-20** — the
  real Data_refs export has this exact code (`BCAMPBELL`) under "Bruce."
  Changed everywhere: `CURRENT_USER_NAME` in all 4 files that declare it,
  Book Labor's employee list, WO List/Home's Insert Mode LOV stubs, the
  Home profile dropdown, and eam-shared.js's sync-queue demo data. If you
  see "Brian Campbell" anywhere outside `prototypes/standalone/old
  versions/`, it's a miss — fix it on sight.
- **Dates are plain numeric app-wide now, 2026-07-21** — `isoToDisplay()`
  in `eam-shared.js` changed from spelled-month ("May 19, 2026"); see
  design-decisions-v3-1.md §3.4. **Corrected same day:** the numeric
  format is supposed to be locale-driven (this app targets North America/
  Europe/Asia — DD/MM/YYYY and YYYY/MM/DD are real cases), not hardcoded
  MM/DD/YYYY — `isoToDisplay()` still hardcodes `'en-US'` as a stand-in
  since no per-user locale/session concept exists yet; flagged in §20 for
  final-review accuracy, don't treat any screen's current MM/DD/YYYY as
  the locked-for-everyone behavior. This only affects values actually
  re-rendered through it — 4 screens (WO Record View, Equipment, Sample
  Screen, WO Closing) still have stale spelled-month literals baked into
  their initial markup, also tracked in §20. Book Labor's own dates were
  updated to match as part of its overhaul (below).
- **Book Labor overhauled, 2026-07-21** — wired to `data/` (see above),
  plus: no avatar anywhere on the screen (labor list, Add Labor's
  Employee/Crew picker cards, Add-by-Crew member rows — the hours pill
  stayed); no redundant "Book Labor"/"Booked labor" title/section label;
  Add Labor promoted to the new shared `.btn-contained` (Octave Black
  primary button, `eam-shared.css` — 2nd real consumer after Issue Parts'
  near-identical local `.btn-quick-issue-all`), full-width to match the
  labor-list card; Add Labor's Department/Trade rows now show code +
  description, matching the app-wide plain-LOV default. **Caught and
  reverted a near-miss:** the labor detail grid briefly gained a
  "Description (CODE)" bracket format per §18.3's own (stale, never-
  implemented) text, which directly contradicted §3.4's actual locked
  "detail grid values: description only" rule already applied everywhere
  else — reverted, and §18.3's stale text corrected instead. If a
  section's own prose and §3.4's general table ever disagree again,
  §3.4 wins — flag it, don't silently pick the local text.
- **Book Labor, same-day follow-up pass:** Timer Stopped banner de-purpled
  (plain neutral card, black/white text, purple kept only on the small
  icon — was violating §3.4's "purple never on field values" rule);
  step-rail timer pill removed (banner is now the only stopped-time
  display); banner + Add Labor auto-open are now gated on a real
  `sessionStorage` flag (`eamArrivedViaNextStep`) set by Issue Parts'
  "Next: Book Labor" button, which now does a **real navigation** instead
  of a toast stub — the first real inter-screen nav edge in these
  standalones; a freeflow visit correctly shows neither. Labor row name
  now stacks code beneath description (was inline beside it). Activity
  summary's "Technicians" → "Trades" (distinct trades booked, not
  headcount). Added a real Date Worked/Hours Worked Header-Fields-style
  card above Start/End, with genuine bidirectional sync (editing Hours
  Worked recomputes End Time, Start always the anchor) via a new shared
  `EDIT_ON_SAVE` hook in `eam-shared.js` (3rd hook of this shape, after
  `LOV_ON_SELECT`/`DATE_ON_SELECT`) — first real use of the shared
  numeric edit sheet on this screen, required adding its markup
  (`#editSheet`) which this file never had.
- **Book Labor, 2nd same-day follow-up + new "Time Only" field type,
  2026-07-21** — collapsed the Date Worked/Hours Worked card and the
  Start/End time chips into one standard 2x2 Header Fields grid (all 4
  as plain `.attr-item` cells; the old big time-chip/duration-connector
  styling is gone). Activity Summary reworked: removed "Trades" (an
  Activity only ever has one, so it was always trivially 1), added real
  WO Regular/OT Hours (summed from each row's `data-minutes`/
  `data-type-code`, not re-parsed text) and WO Est. Hours (fixed, from
  the Activity, invented — no real Activity-Estimated-Hours field exists
  in this app's data model); also fixed Total Hours, which had silently
  been a `rows.length * 83` placeholder, and `saveAddLabor()`, which had
  been booking a hardcoded demo row regardless of what was entered.
  **This surfaced the app's first Time Only field** (a time with no
  paired date) — corrected to Inter (not mono, `.time-input` in
  `eam-shared.css`, shared by Date/Time's own time portion and Add-by-
  Crew too) and locked "24-hour military, never AM/PM" as a fixed
  business rule (unlike dates, this one is NOT locale-driven). Added the
  canonical "Start Time" example to `sample-screen-standard-model-
  prototype.html` (§5.2) — copy that file's caption, not this one, for
  the exact rule. **Real finding, not just theory:** `lang="en-GB"` on
  the `<input type="time">` (the standard 24-hour hint) does **not**
  reliably work — verified live, modern Chrome renders time-input chrome
  off `navigator.language`, not the page's `lang` attribute. Accepted as
  a platform limitation (same category as the existing scroll-wheel-vs-
  spinner note) rather than chased further — see design-decisions-v3-1.md
  §3.4/§20.
- **Book Labor, 3rd same-day follow-up, 2026-07-21** — reorganized the
  Add Labor sheet into the Standard Model's own order: Employee/Crew
  moved out of their old standalone double-wide `.picker-card` component
  (now retired) into the *same* Header Fields grid as Date Worked/Hours
  Worked/Start/End (6 cells, 2-per-row) — Header Fields always sits
  right under the top pill selector, and Employee/Crew are plain-LOV-
  shaped fields like any other, so that's where they belong. "Time"
  section label removed (no longer a separate section). Labor Details
  moved to the bottom. Also found and fixed a real font/alignment bug:
  the Time Only inputs' 14px/500 was hardcoded on `.time-input` itself
  and didn't match either real context — `.form-field` wants 14px/500,
  `.attr-item`'s Header Fields convention is 14px/**600**. Rescoped to
  `.form-field .time-input` / `.attr-value .time-input` so it always
  matches its actual surroundings instead of guessing one. Right-
  alignment was already correct — every field value in this app is
  right-aligned, not a time-specific quirk.
- **Book Labor, 4th follow-up pass, 2026-07-22** — Employee/Crew/Type of
  Hours converted from cycle-on-tap to the real shared `openLov()` search
  sheet (the last "prototype-only stand-in" interaction on this screen,
  per §18.1 note [5], now retired). Surfaced and fixed two real bugs this
  exposed: `#lovSheet`'s markup had never existed in this file at all
  (copied from Equipment, `closeAllSheets()` updated to close it as a 3rd
  nested-sheet type); and `saveAddLabor()` never read the Crew field —
  only Employee, with a hardcoded fallback name — so booking labor
  against a Crew silently mislabeled the row (fixed: reads whichever of
  Employee/Crew is actually set; `empNames` lookup extended to cover
  crew codes too). Also restored a real regression: the tap-anywhere-
  opens-picker CSS trick (`::-webkit-calendar-picker-indicator` stretched
  to the full field) existed on the old `.time-chip` class but was
  dropped when Start/End Time moved onto the shared `.time-input` —
  re-added there in `eam-shared.css` so every consumer gets it back, not
  just this screen. Punch-list-only note added to design-decisions-v3-
  1.md §20: the date-selector calendar popup's font (`.cal-month-label`/
  `.cal-weekday`) should move off mono onto Inter — flagged, not changed.
  See design-decisions-v3-1.md §18.7 for the full write-up.
- **Book Labor, 5th follow-up pass, 2026-07-22 — real Crew-booking
  behavior.** Booking labor against a Crew doesn't book one row "for the
  crew" — the real system has no such row; it books every employee
  currently assigned to that crew, one labor row each, same date/Start/
  End/Type of Hours. New junction file `data/crew_employees.js`
  (`EAM_CREW_EMPLOYEES`) holds that assignment (2 employees per crew,
  never BCAMPBELL) — same entity/junction split as `parts_stock.js`/
  `wo_parts_lines.js`, not nested onto `crews.js`'s existing `memberCodes`
  field, which is now legacy (only the unreachable "Add by Crew" sheet
  still reads it). Each expanded row uses that employee's own real
  Department/Trade from `data/employees.js`, not the crew's generic
  dept/trade shown in the sheet itself — surfaced a missing `TECH-II`
  trade label along the way, added ("Technician II"). See
  design-decisions-v3-1.md §18.7 for the full write-up.
- **Sync control rebuilt app-wide, 2026-07-21** — the nav-bar sync icon
  (§4.4.1) present on every screen was too small (32px circle, 18px glyph)
  and its 5-state language had a real ambiguity: Pending and Syncing
  described the same event (a backlog going out after reconnecting) with
  no way for a technician to tell them apart in real time. Resolved by
  dropping to **4 states** (Synced/Offline/Syncing/Error — Pending
  removed, its cases now split between Offline/Syncing by connectivity
  alone) and an **adaptive icon/pill** treatment: Synced stays a small
  icon-only circle (the ~always-true resting state), the other three
  bloom into a labeled pill (icon + word, Inter/`--font-sans` — mono
  stays reserved for identifiers like record numbers/org codes, not state
  words). Full rationale and the state definitions are now in
  design-decisions-v3-1.md §4.4.1 — don't re-derive them, that section is
  authoritative. Built as a real shared component, not per-screen demo
  dressing: `renderSyncControl()`/`syncOverallState()` in `eam-shared.js`
  read live off `SYNC_DEMO_ITEMS`/`DEMO_ONLINE` (the same data the sync
  panel and Sync Status Screen already used), and `initSharedApp()` calls
  it automatically — every screen just needs one empty `<span
  id="syncCtrl">` in its `.nav-actions`, nothing hand-rolled. All 9 live
  screens' headers were migrated to this container (the old per-screen
  static demo states — e.g. Home's hardcoded error icon — are gone; the
  control now shows the same real, live state everywhere). Item-level
  outbox state renamed `'pending'` → `'queued'` throughout (`SYNC_DEMO_
  ITEMS`, the sync panel's section label, `.sync-item-dot`) to keep the
  word "Pending" out of the vocabulary entirely now that it's not a state
  anymore. **To simulate a state live:** Error shows by default (2 seeded
  error items); discard/retry those away and flip the 🌐 Online/Offline
  toggle to see Offline vs. Syncing with the 2 seeded queued items; clear
  everything to see Synced — no new debug UI needed, this reuses controls
  that already existed.
- **`PROTOTYPE` label moved to the left, 2026-07-21** — resolved the
  open §20 punch-list item. Was in `.nav-actions` crowding the sync
  control on the right; now grouped with the back arrow/avatar in a new
  `.nav-left` wrapper, and knocked down 10px→9px since it's a dev
  watermark, not content. See design-decisions-v3-1.md §4.2. All 10 live
  screens updated (the 9 above plus the Sync Status Screen, which has no
  sync icon but still carries the label).
- **WO Closing reviewed for final-version prep, 2026-07-21** — no anatomy/
  markup changes (the screen already matched §19 end to end from its
  2026-07-16/21 rebuild passes); this pass closed real gaps found while
  checking it against the standard model: Closing Codes now sources its
  Problem/Failure/Cause/Action option lists from `data/closing_codes.js`
  (see the `data/` bullet above) instead of a screen-local duplicate;
  Downtime's Date completed field and the Closed-overlay's WO#/date line
  had stale spelled-month literals baked into markup (§20's tracked
  "4 screens" list — now 3, see design-decisions-v3-1.md §20), fixed to
  plain numeric and, for the overlay, generated live at close time instead
  of a static string; a real shared-file bug found in the process — the
  shared `saveDateTime()` (`eam-shared.js`) rendered dates as month:'short'
  ("May 19, 2026") instead of `isoToDisplay()`'s numeric format, so
  re-picking Date completed via the calendar sheet would've shown stale
  formatting even after the literal was fixed — corrected at the shared-
  file source, which also fixes Sample Screen's date-time field, the only
  other consumer. Also dropped a redundant inline `border-top` on the
  Closing Codes grid's Cause/Action cells — the grid's `gap:1px;
  background:var(--border)` trick already draws that exact divider on
  every internal edge, so the inline border was doubling the row divider
  vs. the column dividers. **Not yet live-verified in a browser this
  session** — no dev-server slot was available (5 already running from
  other sessions in this folder); re-check visually next time this file
  is touched.
- **Code-level UI component inventory, 2026-07-21** — new
  `docs/ui-component-inventory.md`, a static CSS/markup audit (not a
  rendered/visual one) cataloging every recurring "object" (cards, rows,
  pills, buttons, headers, field types) across all 10 live screens against
  `eam-shared.css`/`.js` and the design doc, done ahead of the compile/
  handoff pass this session started planning. Found and fixed 12 real
  drift items same-session (logged with "Fixed 2026-07-21" in
  design-decisions-v3-1.md §20): WO Record View's "Work order details"
  group was silently missing its required-badge (wrong section class,
  `.rv-section` instead of `.fg-section`); `.bottom-nav` was still
  hand-copied in Home/WO List with a drifted z-index despite already
  having 2 consumers — promoted to `eam-shared.css` now, resolving a
  prior inaccurate claim in this file that it already had been; Sync
  Status Screen was missing its own sync control and silently dropping
  `timestamp` on its cards; row-title/identifier text sizes had drifted
  13px/10px vs. the rest of the app's 14px/11-12px convention on Book
  Labor and WO Closing; Book Labor's crew-selector-pill didn't match
  Issue Parts' store-selector in light mode despite the doc calling them
  "the same pattern"; WO Closing's Close/Cancel buttons duplicated
  `.insert-save-btn.ready`/`.btn-outlined` with different specs instead
  of reusing them; Issue Parts' `.btn-quick-issue-all` converged onto
  `.btn-contained` (already flagged as a deferred duplicate); Equipment's
  and WO's Structure Details tree fonts had drifted from each other
  (mono+uppercase vs. sans); and a new shared `.row-action-btn` (34px/
  13px, Issue Parts' spec picked as the standard) now replaces 3
  differently-sized local duplicates (Issue Parts' `.btn-quick-issue`,
  Book Labor's `.detail-btn`, WO Closing's `.viewer-action-btn`). Also
  caught a stale "Brian Campbell" reference in `eam-shared.js`'s sync-demo
  data missed by the 2026-07-20 rename sweep — fixed on sight per this
  file's own standing rule. **Not yet live-verified in a browser** — all
  5 dev-server slots in this folder were held by other sessions; re-check
  visually (especially the new `.row-action-btn` across its 3 consumers
  and the WO RV required-badge) next time any of these files is touched.
  Remaining punch-list items from this session's broader scope (functional
  gaps on Checklist/Closing, Insert/Update Mode structural conformance,
  pending-screen design, entry-point/flow audit, compile decision) are
  still open — this bullet covers only the visual-inventory slice.
- **Step rail's "X of 5" step-count pill removed app-wide, 2026-07-22** —
  a larger design decision, not a per-screen tweak: the step-map segments
  (row 2) and the expanded step map already communicate progress, so the
  numeric counter was redundant. Its vacated left slot (`.step-rail-left`,
  new shared class in `eam-shared.css`, mirrors `.step-rail-right`) now
  holds the timer pill instead, which used to share the cramped right
  side with the expand chevron. Applied to all 5 WO workflow screens:
  Activity Checklist and Issue Parts (both have a running timer) moved
  their `#timerPill` from `.step-rail-right` into the new `.step-rail-
  left`; WO Record View, Book Labor, and WO Closing (none of the three
  show a timer pill in the rail — Book Labor's is in its own banner
  instead, §18.7) just render an empty `.step-rail-left`, which still
  matters structurally: `.step-rail-collapsed`'s flex `space-between`
  needs two sibling slots to keep the chevron pinned right, not zero.
  `.step-name` stays centered via its own absolute positioning either
  way, unaffected by what's in the left slot. Verified live on all 5
  screens (chevron flush right, timer flush left where present, no
  console errors, dark mode and rail expand/collapse both fine). See
  design-decisions-v3-1.md §14.2 for the full write-up.
- **Step rail relayout + expanded-timer-panel bug fix, 2026-07-22 (user
  direction) — supersedes the left-slot bullet above.** `.step-name` is
  no longer absolutely-centered — it's a plain left-justified `flex:1`
  item now, matching `.tab-rail-name`'s own left-justified layout so the
  two rail components read consistently. `.step-rail-left` is gone
  entirely; the timer pill moved into `.step-rail-right`, before the
  chevron, and its running-state color changed purple→green
  (`var(--green)`, stopped-gray state unchanged). Applied to all 5 WO
  workflow screens (the 3 with an empty left slot just lost that empty
  div; Activity Checklist/Issue Parts moved their real timer pill to the
  right side). **Also found and fixed a real bug while doing this:** the
  expanded step-timer-panel (§14.9's larger timer + Pause/Stop) had
  actually been built correctly in Activity Checklist's/Issue Parts'
  markup, but `renderStepRail()` (`eam-shared.js`) was silently wiping it
  out on every load — it rebuilds `#stepMap`'s entire `innerHTML` from
  the resolved workflow's step list, and the timer panel was hardcoded as
  that same container's first child. Fixed by having `renderStepRail()`
  capture and re-prepend any existing `.step-timer-panel` before
  overwriting. Also: Book Labor's Add Labor sheet now defaults Employee
  to the current logged-on user (BCAMPBELL) when it auto-opens via the
  real timer-stop hand-off (not on a freeflow open), and its Timer
  Stopped banner is now one row (heading left, elapsed time right)
  instead of two stacked rows. Verified live, no console errors. See
  design-decisions-v3-1.md §14.2/§18.7 for the full write-up.
- **Equipment LOV converged, 2026-07-21 (user direction)** — WO Insert
  Mode's Equipment field (WO List's + Home's Create bar) used to open a
  plain generic LOV sheet; now opens the exact same full Search+Structure
  two-tab picker as WO Record View's own Equipment field, promoted to
  `eam-shared.css`/`.js` (`openEquipmentLookup()`, `commitEquipmentSelection()`,
  the tree/search data and CSS). A `REF_CARD_FIELDS` key opts in with
  `useEquipmentLookup: true`; a plain record field (like WO Record View's)
  supplies `EQUIP_LOOKUP_CURRENT`/`EQUIP_LOOKUP_ON_SELECT` hooks instead —
  same shape as `LOV_ON_SELECT`/`DATE_ON_SELECT`. Named **Equipment LOV**;
  Activity Checklist's separate read-only `.item-equip` badge is named
  **Equipment ID Badge** and was confirmed to stay a distinct, unconverged
  component. `LOV_DATA.insertEquipment` in both WO List and Home now
  literally *is* `EQUIPMENT_LOOKUP_DATA` (was a hand-copied duplicate).
  On-field display (`.equip-summary-card` vs `.equip-card`) was explicitly
  out of scope for this convergence, still its own open question. Full
  write-up: `docs/component-library.md`'s Equipment LOV entry. Verified
  live in-browser on all 3 consumers (WO Record View, WO List's Insert
  Mode, Home's Insert Mode) — Search-tab select, Structure-tab select, and
  the pre-existing WO Record View path all commit correctly, no console
  errors.
- **Activity Checklist rebuilt again, 2026-07-21 — "Focused Stepper"
  (v1 -> v2)** — a deliberate, user-driven redesign, not a conformance
  fix: v1's grouped-scroll-list of dense cards is retired to `old
  versions/`, replaced by `eam-activity-checklist-prototype-v2.html`,
  which shows one item at a time (Prev/Next `#stepperNav`) instead of a
  long list — explored first as 3 sibling mockup directions in
  `prototypes/standalone/mockups/` (compact-rows-with-detail-sheet,
  this focused stepper, and adaptive-collapse-with-filters); only the
  stepper was carried into the real file, the other two stay mockup-only.
  Real changes, not just a reshuffle: Notes is now a real always-visible
  UDF01-style field (was hidden behind a tap-to-expand trigger); Comments
  and Documents are real per-item containers reusing the exact shared
  §7.2 `.rv-section` pattern (rebinding `COMMENTS_DATA`/`DOCUMENTS_DATA`
  to whichever item is focused — same trick as any record-level
  consumer, just re-pointed per item instead of per record); Follow-up
  is a full-width button that reveals a new "Create Follow-up WO" button
  once flagged; Equipment (item-scoped items only) is a plain always-
  visible `.form-field.protected` row, not a dropdown/collapsible and
  not the old `.item-equip` badge (see the Equipment LOV bullet above —
  that convergence and this are unrelated; Insert Mode's Equipment LOV
  is untouched, only the checklist's own item-scoped display changed
  shape, twice now); the checklist's progress indicator is a single
  proportional completion bar, not per-item dots/segments, specifically
  so it holds up at ~100 items (dots don't scale); and **dynamic
  checklist items** are new — an item's answer can insert new items
  right after it (`syncDynamicChildren()`), indented under their trigger
  in "View all" with a branch-icon cue, previewed as a locked "ghost" row
  before they're triggered. Instructions (a purple callout + info-sheet
  in v1) is gone entirely — it was never a real, separately-supported
  checklist item field; the item's label/description is the only
  instructional text there is. One interaction-model adaptation worth
  knowing: the Yes/No prompt bar (§14.6) now only surfaces once you've
  reached the actual last item with all required items complete, not
  the instant requirements are met mid-browse like v1 — a one-item-at-
  a-time flow has no "still scrolling, but already done" moment to
  interrupt the way a list does. See the header comment in the v2 file
  itself for the full before/after rationale.

## Shared-file architecture
- `prototypes/standalone/shared/eam-shared.css` and `eam-shared.js` hold
  every generic component's CSS/JS (headers, sheets, LOV/date/text-editor
  pickers, Comments/Documents, required-field badges, etc.) — loaded via
  plain relative `<link>`/`<script src>` tags (works under `file://` since
  that only blocks `fetch()`/XHR, not tag-based resource loading). A
  rebuilt screen adds only its own data/config globals and any content the
  shared files have no component for (e.g. Equipment's Structure Details
  tree, WO Record View's step rail) — never re-implements something the
  shared files already provide.
- Design decisions and locked rules live in `docs/design-decisions-v3-1.md`
  (§5–§9 for the generic Standard Model, §14–§19 for the WO workflow) —
  that document is authoritative; this file intentionally doesn't mirror
  its rule tables, to avoid the same drift that made repeated conformance
  sweeps necessary in the first place. Skim §5.2/§5.3 before touching any
  rebuilt screen.

## Prototype conventions
- Each prototype is one HTML file per screen, loading the two shared files
  above plus CDN-hosted fonts — no build step, no bundler, no other
  external dependencies. Not fully self-contained anymore (superseded
  2026-07-16) — that was true before the shared-file architecture existed.
- Reference screenshots for visual matching are in
  `prototypes/reference-screenshots/`.

## Working style
- Flag any place where a request would conflict with a locked decision above.
- When a new design decision gets made during a session, add it to
  `docs/design-decisions-v3-1.md` in the same session — don't let the doc
  lag the prototypes.
- **Token economy (added 2026-07-16 — sessions were burning tokens fast):**
  - Grep for the specific section/pattern you need instead of reading a
    whole large file (the design doc, a 600–1000+ line standalone) end to
    end. Read tool calls should be targeted, not exploratory by default.
  - Don't re-run the full conformance audit "just to check" — it already
    ran once; extend `design-decisions-v3-1.md` §20 for anything new
    instead of re-discovering what's already tracked there.
  - New generic component → `eam-shared.css`/`.js` by default, screen-
    local only until there's a real 2nd consumer. This is the actual fix
    for "why did updating one thing touch 3 files" — not a tooling
    change, a discipline one.
  - Prefer fixing a bug at its source (the shared file, or the canonical
    reference file everyone copies from) over patching every screen that
    exhibits it — same file, one edit, cascades everywhere it's loaded.