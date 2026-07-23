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
Read `docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` §7–§8 before
doing anything else. That's the live, current plan — what's already
built, the compiled-app decision that needs a throwaway proof-of-concept
first, the shared-component discipline to follow going forward, and (§8,
2026-07-22) how Screen Designer specifically can run given the real base
EAM admin framework — a separate app launched from a legacy menu item,
its mobile-preview panel a real iframe against the actual screens in a
new `designerMode`, not a hand-built mockup renderer. Don't re-derive
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
  `screen-layout-field-behavior-prototype-v1.html` (every field type, in
  both the Grid and List containers — §5.2; the rule + rationale for
  each lives in the design doc now, not as an inline caption in this
  file) and `eam-equipment-record-view-prototype-v1.html` (the standard
  applied to a full record view, incl. the canonical header pattern —
  §5.3). Both load `prototypes/standalone/shared/eam-shared.css`
  and `eam-shared.js` (see "Shared-file architecture" below) — copy their
  markup/config conventions, not their pre-2026-07-16 self-contained form.
  **`sample-screen-standard-model-prototype.html` is retired** (2026-07-24,
  see the dated bullet below and design-decisions-v3-1.md §5.2/§21) —
  don't copy patterns from it, and don't re-add it as a link target;
  it's archived in `old versions/` for history only.
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
- **App-wide palette + navigation rollout, started 2026-07-22 — see
  design-decisions-v3-1.md §23/§24 for the locked rules, don't re-derive
  them here.** Triggered by a user complaint that the color palette felt
  "busy" (purple + orange + red + green + yellow, colored mono text) —
  explored via a series of scratch mockups in `prototypes/standalone/
  mockups/` (palette A–D, final options A/C, rail conversions) before
  landing anything real. Locked outcome: color is exactly 3 instruments
  (status/sync/required, §23) everywhere; purple is retired as a UI-state
  accent (selection now reads via ink weight/fill, not hue); mono is
  identifiers-only and never tinted; icons/chips are outlined not filled,
  except Priority Critical's one deliberate red exception. Applied so far
  to WO Record View (Type/Priority badges, equipment icon, required
  badge, Activities section rebuilt to grid-cell "Option A" — Trade/Task
  Plan/Material List/Start Date, note optional) and to the shared step
  rail/tab rail components (`eam-shared.css`/`.js`) — outlined, no
  persistent wash, 16px padding (was misaligned 2px vs. the header above
  it), no leading `.tab-rail-icon`. **Not yet applied:** the rest of
  Phase 2's purple sweep (dataspy bar, filter chips, LOV/tree/calendar
  selection, sync panel internals) and the other 4 WO workflow screens'
  own content — in progress, screen by screen, not a completed pass.
  Real bugs found and fixed along the way, unrelated to the palette
  itself: the sync icon crashed on 10 of 11 screens (missing
  `#syncPanelSheet` markup — now added everywhere); Issue Parts' local
  `openSheet(partId)` shadowed the shared `openSheet(id)` the sync panel
  needs (renamed to `openIssueSheet`); no screen's back button actually
  navigated anywhere (all toast stubs) — now real, per §24's rule.
  **New file:** `eam-equipment-list-prototype-v1.html`, Equipment's
  Search List screen (§24.1) — was briefly an in-page popup on Home,
  reverted the same day (can't preserve state across a real page nav to
  Record View and back, needs to be a real page). Home's "Equipment"
  tile now does a real navigation there instead of its old "coming soon"
  toast. **Step rail also gained a "Reference" group** (§14.8/§23) —
  Comments/Documents (jump-to shortcuts to WO Record View's own sections,
  cross-screen via `jumpToRvSection()`) + a dummy Equipment stub, always
  pinned after the last numbered step, supersedes the old ellipsis-menu
  mechanism (§21) — that mechanism's stubs are still sitting inert on
  Checklist/Issue Parts/Book Labor, tracked as stale in §20, not yet
  removed. **Also logged as backlog, not started:** a quick/dirty
  Notifications screen, and Activity Insert/Update Mode (confirmed fully
  unbuilt) — both deliberately deferred until this rollout finishes; see
  the `project_deferred_screens_backlog` memory note.
- **Per-screen rollout (Phase 5), started 2026-07-22 with Activity
  Checklist** — its own local purple/orange (required tag, dynamic-item
  tag/icons, numeric-input focus, severity toggle options, Flag-for-
  Follow-up button, Overview status dots) converted per §23; removed its
  now-stale Comments(3)/Documents(4) ellipsis entries (superseded by the
  step rail's Reference group, see the bullet above). Surfaced 2 new
  derived rules, now locked in design-decisions-v3-1.md §23.1: a 3-tier
  green/orange/red severity scale collapses to 2-tier green/red (orange
  retired, the option's text label already conveys degree); a "needs
  follow-up" action uses red (a 3rd "needs attention" case, not a new
  hue).
- **Issue Parts done, 2026-07-22** — its local purple (store-selector,
  parts-summary bar/divider, part number, planned-qty badge, required
  left-bar, qty stepper buttons, part-search icon, sheet header/part-num)
  converted per §23; the "verify quantities" warning callout goes from
  orange to red (needs-attention). Removed its stale ellipsis Comments/
  Documents entries too. **Real bug found + fixed, not just a palette
  tweak:** the confirm-sheet's quantity number (`.confirm-row-qty`) had
  an inline `style="color:var(--octave-black)"` that silently beat its
  own class's dark-mode override — the number was actually unreadable
  (dark text on a dark sheet) in dark mode before this pass, unrelated to
  purple. Fixed by moving that value + the confirm-sheet's other inline-
  colored bits (part number, +/- stepper buttons) onto real CSS classes
  (`.confirm-part-num`, `.confirm-qty-btn`) instead.
- **Book Labor done, 2026-07-22** — Type of Hours pill (Normal/Overtime
  now share one plain outlined look, same severity-tier-collapse
  reasoning as §23.1; Double time keeps red, same exception Priority's
  Critical gets), crew-selector-pill, step-btn, the Timer Stopped
  banner's icon (was the one deliberately-kept purple exception from an
  earlier pass — retired now that purple is gone entirely, not just from
  field values), and all 5 Activity Summary stat values (Total/Entries/
  Est/Regular/OT hours — were purple/a rogue hardcoded `#42b2ea`
  blue/gray/green/orange, one different decorative hue per stat; none of
  the 5 are a real color instrument, so all 5 are plain ink now). Removed
  its stale ellipsis Comments/Documents entries too. Next up: WO Closing.
- **WO Closing done, 2026-07-22 — last of the 4 remaining workflow
  screens, Phase 5 now complete.** Its own 4-color file-type icon scheme
  (`.attach-type-photo`/`-pdf`/`-doc`/`-file`: purple/red/blue/gray) and
  the 3-color attachment-source picker (`.source-option-icon`: Camera
  purple, Photo library blue, File green) both converged to the same
  monochrome-outlined treatment as the shared `.doc-icon` precedent
  (icon shape carries the type, not a per-type hue) — this covers the
  attachment row icon, the viewer sheet's header icon and its large
  non-image placeholder, and the source-picker sheet's 3 rows. Required
  markers (`.code-cell.required`, `.comments-area.required`) and
  `.char-count.warn` orange→red; `.comments-textarea:focus` purple→
  `border-strong` (no color instrument applies to a focus ring);
  `.attach-add-btn-label` purple→ink. **Real bug fixed alongside the
  CSS:** two JS `iconColors` hex maps (`renderAttachList()`,
  `openViewer()`) were feeding those same 4 hex values into
  `typeIconSvg()`'s inline `stroke` param, which would have kept the
  icons colored even after the CSS classes went monochrome (the same
  "inline style beats the class" pattern as Issue Parts' confirm-sheet
  bug) — removed both maps, `typeIconSvg()` calls now pass `'currentColor'`
  so the glyph always follows its container's ink color in either theme.
  Removed its stale ellipsis Comments/Documents entries too (kept "Print
  Work Order"). Verified live in both themes, no console errors — the
  green Closed-status colors (`.status-pill.to.fill-onhold` uses
  `var(--red)`, the closed-overlay/status-banner use hardcoded `#00AA14`/
  `rgba(0,170,20,...)`) are untouched, that's the Status instrument, not
  in scope for this pass. **Phase 5 (per-screen rollout of the 4
  remaining WO workflow screens) is now closed** — all 5 WO workflow
  screens plus WO Record View have been swept for §23. Next up: Phase 2b
  (component consolidation, still pending) or the broader Phase 6
  app-wide sweep (Equipment RV content pass, Home, WO List, Sync Status
  Screen, Sample Screen/Card Standard reference files) per the original
  master plan — no screen has been started yet, check with the user
  before picking one.
- **Phase 6 sweep started 2026-07-22 with Equipment Record View.** Turned
  out nearly clean already (no purple/orange/hardcoded hex anywhere, no
  filled non-instrument icon backgrounds, no stale ellipsis Comments/
  Documents entries — Reference-group/tab-rail work earlier this session
  already covered this file's chrome). **One real finding:** two field
  values — Performance Details' Availability (98.2%) and Depreciation's
  Current Book Value ($38,000.00) — were hardcoded `color:var(--green);
  font-weight:700` inline, a "this number looks good" decorative tint
  with no basis in the 3-instrument rule (not Status/Sync/Required),
  same anti-pattern as Book Labor's old per-stat decorative hues. Fixed
  by dropping the inline style entirely, matching their plain-ink
  sibling fields (MTBF/MTTR/Last Failure Date; Method/Useful Life/
  Salvage Value) exactly. Verified live, no console errors. Next up:
  Home, WO List, Sync Status Screen, Sample Screen/Card Standard
  reference files, per the original Phase 6 scope — none started yet.
- **Phase 6 sweep continued 2026-07-22 with Home.** Its per-tile/per-
  favorite decorative colour scheme — `SCREEN_META` (purple wrench for
  WO, teal box for Equipment favorites), `HOME_TILES`' 4 more hardcoded
  hex values (orange/green/teal/purple across the 6 tiles), and Insert
  Mode's `ENTITY_FIELD_META` Type/Status option lists (orange/green/red
  per Type or Status code) — all converged to the same monochrome-
  outlined `.fav-chip-icon`/`.home-tile-sq` treatment already established
  for `.attach-type-icon`/`.doc-icon` elsewhere: icon shape distinguishes
  items, not hue. Confirmed `renderColorBadge()` (`eam-shared.js`) already
  ignores `.color` entirely (reads only `.critical`) — so every one of
  these hex values was already dead data before this pass, just still
  visually live via each render function's own inline
  `style="background:${x.color}22"`/`style="color:${x.color}"`, now
  removed. **Real crash bug found + fixed, unrelated to colour:**
  `renderEntityFields()`'s two `.outerHTML = renderColorBadge(...).replace
  ('class="attr-badge"', ...)` calls silently failed to match once
  `renderColorBadge()` started emitting a 2-word class
  (`"attr-badge attr-badge-outline"`) — same exact bug already diagnosed
  and fixed in `selectLov()` this session, just never carried over to
  this file's own local copy. First render "succeeds" but drops the `id`
  entirely, so the *second* time Insert Mode's entity fields render
  (reopening Create after closing it once) throws `Cannot set properties
  of null` and Insert Mode breaks. Fixed both call sites with the same
  order-independent `.replace('<span ', ...)` pattern. **Found the
  identical bug in `eam-wo-list-prototype-v5_1.html`'s
  `renderInsertBadge()` while grepping for other occurrences of this
  pattern — fixed there too** (same 1-line change, same crash-on-reopen
  scenario), though WO List's own full palette sweep is still its own
  pending Phase 6 turn, not done here. Also fixed a 2nd real bug: the
  shared `ICO()` helper hardcoded `style="color:white"` on every badge
  icon — invisible on the now-outlined (dark-on-transparent) badge in
  light mode, the same "inline beats the class" pattern as this
  session's other finds — removed, icons now inherit ink/white correctly
  from whichever badge variant renders them. Verified live in both
  themes, Insert Mode reopened twice with no crash, no console errors.
  Next up: WO List, Sync Status Screen, Sample Screen/Card Standard
  reference files.
- **Phase 6 sweep continued 2026-07-22 with WO List — the biggest single
  file in this pass, several real findings.** Straightforward monochrome
  conversions: dataspy sheet's favorite star (orange→ink-fill, same
  `.rec-pin-btn.pinned` fill-not-hue language, fixed in both this file's
  local copy AND the shared `eam-shared.css` source — genuinely shared
  component, not just a hand-copy), parent/child table-row tint (purple
  wash→neutral black/white wash), and the whole sort/filter sheet's
  selection language (`.chip`/`.lov-check`/`.sh-radio`/`.sh-si`/`.s-inp`
  focus, all purple→ink-fill-or-border, matching the shared
  `.filter-chip.active`/`.lov-check.checked` precedent exactly) plus the
  `.sh-apply` CTA button (purple→`.btn-contained`'s black/white-12%
  language). Dataspy-by-status/org/priority quick-filter sheet rows
  (`CD`) dropped their per-row `color`/`bg` fields entirely — same
  navigation-shortcut-not-instrument reasoning as Home's tiles, `.sh-ri`
  icon containers now share that same monochrome-outlined base.
  **Bigger, real content decision:** the card/table Status pill and List
  mode's Type column had their own independent 4-way (RELEASED/WAPPR/
  WMATL/COMP) and 6-way (BK/CAL/CM/INS/MOD/PM) hex-color schemes — this
  predates §23 and was actually a locked decision (§6.7: "Type and
  Status both keep colour on this screen"), but §23 is the later,
  stricter, general rule and already retired Type's colour everywhere
  else (WO Record View's TYPE_META, this file's own Insert Mode
  TYPE_META) — so §6.7 loses here, flagged rather than silently
  overridden. Fixed: Type lost its colour entirely (name-only, plain
  text, no more `style="color:...` on table cells — this was actually
  the original session's opening complaint, "colored mono text," still
  alive in this one file); Status's `STI` map converted from 4 arbitrary
  hex values to the same `tier` vocabulary as WO Record View's header
  status pill (`STATUS_CLASS_MAP`: green=operational/completed,
  outlined=standby/waiting, red=down — unused by this file's demo data
  yet but supported) via new shared-in-file `.pill-green`/`.pill-red`/
  `.pill-outline` classes on the card headline pill and table pill.
  RELEASED/COMP→green, WAPPR/WMATL (this file's own "waiting on
  something" statuses, not in the canonical 4)→outline. Also removed the
  now-dead `tinted()` text-colour mechanism in `renderStdCard()` entirely
  (status never actually rendered as a tinted sub/attr field given this
  screen's own field ordering — always the headline pill — and type no
  longer qualifies at all). **Real bugs found + fixed, unrelated to
  which colours:** (1) same crash bug as Home's `renderEntityFields()` —
  `renderInsertBadge()`'s `.replace('class="attr-badge"', ...)` had the
  identical fragile-match failure, fixed with the same `<span `-based
  replace; (2) `TYPE_META`/`INSERT_STATUS_META`'s icons hardcoded
  `stroke="white"` — invisible on the outlined badge in light mode, same
  fix as Home's `ICO()`, now `currentColor`, `color` fields dropped
  (dead — `renderColorBadge()` only reads `.critical`); (3) **found while
  verifying live, not in the initial grep:** `eam-shared.css`'s own
  `.ld-card-headline.pill`/`.ld-table-pill` still hardcoded
  `color:#fff` — a 2-class shared selector that kept beating this file's
  new 1-class `.pill-outline` on specificity regardless of source order,
  so the outline tier rendered white-on-transparent (invisible) until
  the shared file's hardcoded color was removed too. Confirmed via grep
  that WO List is the only real consumer of either shared selector today
  (Sync Status Screen uses `.ld-card-headline` without `.pill`), so
  fixing the shared source directly was safe. Removed the stale §6.7
  comment's implication and added a note pointing to §23 as the
  overriding rule. Verified live in both themes — card pills, table
  pills, Type as plain text, favorite star, quick-filter sheet icons,
  and Insert Mode's badges (reopened/re-rendered twice with no crash) —
  no console errors. Next up: Sync Status Screen, Sample Screen/Card
  Standard reference files.
- **Phase 6 sweep continued 2026-07-22 with Sync Status Screen.** This
  screen's own local CSS (protection labels, trouble chips, empty state)
  was already fully converged — every real finding was in the shared
  `eam-shared.css` this screen is the main consumer of, missed by the
  earlier sync-control palette pass because they're one layer deeper
  than what that pass touched: (1) `.sync-item-dot.queued` (the outbox
  list's per-item dot, inside the sync panel) was still orange — the
  panel-level `.sync-panel-state`/nav-level `.sync-ctrl-pill` states
  already use neutral gray for "waiting" (Offline/Syncing), but this
  one dot never got the same treatment; converged to `var(--gray-3)`,
  explicit rather than just inheriting the base rule's identical value,
  since they mean different things even though they match today. (2)
  `.sync-error-banner.state-pending` (shown after tapping Retry while
  still resolving) was tinted orange background+text — CLAUDE.md's own
  2026-07-20 note called this a deliberate "3-state red/orange/green"
  banner, but that predates §23; "still resolving" is the same neutral
  language as (1), not its own hue, so it converged to
  `var(--bg-section)`/`var(--gray-4)`. Left `.sync-ctrl-pill.state-error`'s
  `#FF8785` (a lighter red, not `var(--red)`) alone — that's a deliberate
  contrast tune for sitting on the dark nav bar (same category as
  `.rec-pin-btn`'s white-based rgba tints), not a hue substitution, so
  not in scope for this pass. Verified both fixes' computed colors in
  both themes (temporary detached elements, since no visible queued/
  pending item exists in this screen's current seeded state) — correct
  neutral tones both themes, no console errors, sync panel still opens
  cleanly. Next up: Sample Screen/Card Standard reference files.
- **Phase 6 sweep finished 2026-07-22 with the Sample Screen + Card
  Standard reference files — the original Phase 6 punch list (Home, WO
  List, Sync Status Screen, Sample Screen/Card Standard) is now fully
  closed.** `sample-screen-standard-model-prototype.html` turned out to
  be the worst-converged file in the whole rollout — being the canonical
  "copy this file's pattern" reference didn't make it immune, it just
  meant nobody had touched its badge code since before §23 existed.
  Fixed: `TYPE_META`/`PRIORITY_META`/`STATUS_META` dropped their dead
  `color` fields and `stroke="white"`→`currentColor` (PRIORITY_META
  gained the real `critical:true` on CRITICAL, matching WO Record View);
  **its 4 header/Insert-Mode badges (`fv-type-badge` etc.) were 100%
  static markup — no JS ever re-rendered them** (unlike Home/WO List's
  equivalents), so they'd been permanently showing hardcoded
  `style="background:#hex"` + white strokes this entire rollout, on the
  one file every screen is told to copy from. Converted to
  `attr-badge-outline` directly in the markup. **3 stale captions**
  (§5.2's own required-marker/required-count-badge text) still said
  "orange left-bar"/"orange count badge" — fixed to red, since captions
  here are the copy-from-verbatim source of truth for every future
  screen, not just decorative prose.
  **Bigger finding:** 3 demo rows here (and 1 in
  `eam-card-standard-prototype-v1.html`) are the *only* real consumers
  anywhere in the app of `renderStdCard()`/`renderStdTable()`'s built-in
  Status-pill handling (WO List has its own independent local copy,
  already fixed on its own turn) — and that shared function still had
  the pre-§23 raw-hex-inline-style version, plus a `type:'type'` tinted-
  text branch matching Equipment's own `EQUIP_TYPE_COLOR` (see below).
  Converged the shared `renderStdCard`/`renderStdTable` to the same
  `pill-green`/`pill-red`/`pill-outline` tier vocabulary WO List already
  established on its own local copy — promoted here to `eam-shared.css`
  now that there's a real 2nd/3rd consumer. Updated both demo files'
  data (`color:'var(--x)'`→`tier:'x'`).
  **Real bug found + fixed while verifying live, not in any grep:** the
  new `.pill-green`/`.pill-red`/`.pill-outline` classes and
  `.ld-card-headline`'s own base `color` rule have equal (1-class)
  specificity — whichever sits later in the file wins the tie, which is
  pure source-order luck. In `eam-shared.css` the tie went the wrong
  way (status pill text was invisible-on-fill); fixed by adding a
  `.ld-card-headline.pill-green` (etc.) override at 2-class specificity
  that wins unconditionally, not relying on order. **Applied the same
  hardening to WO List's local copy too**, even though its own source
  order happened to already work — that "happened to" is exactly the
  kind of latent bug this session kept finding elsewhere, no reason to
  leave the identical fragility in place just because it isn't broken
  *yet*.
  **Two more real cross-cutting bugs found doing a broader hardcoded-hex
  sweep of `eam-shared.css`/`.js` while already in there** (neither
  purple nor orange, so no earlier per-screen grep this session ever
  would have caught them): `.inline-confirm-btn` (the floating checkmark
  FAB shown while editing any inline text field — live on WO Record
  View, Equipment RV, and this Sample Screen) was a hardcoded blue
  `#3B82F6` with no basis in the 3-instrument system — converged to
  `var(--green)`, matching `.insert-save-btn.ready`'s "go ahead" language
  since the FAB is inherently always in a ready-to-confirm state whenever
  it's shown. `.btn-outlined:hover` (live on WO Closing/Book Labor/Issue
  Parts) was a stray bright cyan `#00FFFF` — clearly a leftover/mistake,
  not a real design choice — converged to a plain `background:var(
  --bg-section)` hover tint, matching every other outlined-element hover
  in the app. Also removed `eam-shared.js`'s `EQUIP_TYPE_COLOR` (teal/
  purple/orange/gray per structure-tree level: Location/Position/System/
  Asset) — dead-in-spirit the same way Home's tile colours were (feeds
  `equipCardFields()`/`equipTableFields()`'s Type field, which no longer
  renders tinted text at all per the `renderStdCard` fix above). Verified
  all of the above live across every affected screen (Sample Screen,
  Card Standard, WO List, Equipment RV, WO Record View, Equipment List)
  in both themes — no console errors anywhere, pills/badges render
  correctly. **Phase 6 (Home/WO List/Sync Status Screen/Sample Screen)
  is complete.** Phase 2b (component consolidation, §17) is the one
  remaining item from the original master plan — not started.
- **Phase 2b (component consolidation) done, 2026-07-22 — the last item
  on the original master plan.** Worked through the 4 named duplicate
  groups:
  - **comment-add-row / activity-add-row / attach-add-row:** WO Record
    View's `.activity-add-row` (its empty-Activities-list "+ Add
    Activity" row) was structurally identical to the shared
    `.comment-add-row` (same flex row, same `.comment-add-plus` icon,
    same border-bottom/hover) — consolidated onto the shared class,
    local CSS deleted. **Real bug caught in the process:**
    `.activity-add-row` was still `color:var(--purple)` — a genuine §23
    miss that survived the entire rollout because it's only reachable
    when `ACTIVITIES` is empty, which this file's demo data never is, so
    no live-render check ever exercised it. `.attach-add-row` (WO
    Closing) stays separate — confirmed structurally different
    (center-justified persistent footer button, border-top, icon+label
    split into their own elements) rather than just a historical
    variant, so not forced into the same class.
  - **store-selector / crew-selector-pill:** confirmed byte-for-byte
    identical (Book Labor's own comment already said "same pattern as
    the store selector," §18.5) except `display:flex` vs `inline-flex`.
    Promoted the shared visual base to a new `.store-selector,
    .crew-selector-pill{...}` block in `eam-shared.css`; each file kept
    its own class name in markup (too many onclick/JS references to
    rename risk-free for a styling-only pass) and its own file-specific
    variant (Issue Parts' `.protected`/`.sheet-store-row` scoping stayed
    local, no 2nd consumer for those).
  - **labor-hours-badge / qty-badge:** the *base* sizing genuinely
    differs (3px/9px padding vs 2px/7px) and stayed local, but the
    color-tint recipe was duplicated — Book Labor's `.badge-green`/
    `.badge-red` and Issue Parts' `.qty-badge-issued` were the same
    light-wash-tint treatment at slightly different opacities (.1 vs
    .12). Promoted to a shared `.badge-green,.qty-badge-issued{...}` /
    `.badge-red{...}` block, unified on one opacity. Issue Parts' own
    `.qty-badge-planned` (outline, no fill) stays local — no 2nd
    consumer.
  - **rv-icon-btn / nav-icon-btn:** turned out to **not** be a duplicate
    at all — confirmed structurally different (`.nav-icon-btn` is a
    white-icon button for the permanently-dark nav bar; `.rv-icon-btn`
    is a gray-to-ink button for icon buttons sitting in a light content
    section, different surface entirely, different size too). No merge.
    **Real bug found investigating this pair anyway:** WO List's own
    local hand-copies of `.nav-back`/`.nav-icon-btn` (both genuinely
    shared, app-wide `eam-shared.css` components) had drifted from the
    shared source — 8px border-radius locally vs. the shared file's
    6px — and WO List's local copy had actually grown a `:hover`
    treatment for `.nav-back` that the shared version was missing
    entirely, meaning every *other* screen's back button had no hover
    feedback at all. Promoted the hover/radius up into `eam-shared.css`'s
    `.nav-back` (benefits every screen now) and deleted WO List's now-
    fully-redundant local duplicates outright, rather than just patching
    them to match.
  Verified every change live (WO List, Book Labor, Issue Parts, WO
  Record View) in both themes — computed styles match expectations,
  hover states work, no console errors. This closes out the entire
  palette+consolidation master plan from this session.
- **Post-rollout fix batch, 2026-07-22 (user-reported), 7 items.**
  - **Home is now a deliberate, named exception to §23** — user direction
    after seeing the rest of the app go monochrome. Restored real colour
    on `.home-tile-sq`/`.fav-chip-icon` (`SCREEN_META`/`HOME_TILES`'
    `color` fields + the inline `style="background:${x.color}22"`/
    `color:${x.color}"` template logic, all removed during Phase 6, put
    back exactly as they were) — also had to strip a `[data-theme="dark"]
    .home-tile-sq{background-color:...!important}` rule the Phase 6 pass
    added, which would've forced the neutral background back on in dark
    mode and silently defeated the restored colour. See design-decisions-
    v3-1.md §23 for the locked exception note.
  - **Step rail's Octave-Yellow "Not Free Form" wash is gone** — user
    call, "the yellow is not looking good at all," keep the rail visually
    identical regardless of Free Form state rather than re-tune the hue.
    Removed every `.rail-not-free-form` override in `eam-shared.css`
    (tab-rail + step-rail backgrounds/borders, active-segment/step-map-
    row/label colours) — the class is still applied by `renderStepRail()`
    (other logic may key off its presence) but now carries zero visual
    effect. Flagged, not resolved: design-decisions-v3-1.md §3.2.2/§15.4
    now both note this needs a real answer later (Not Free Form has no
    visual signal at all right now) — just not yellow, and not today.
  - **Real navigation bug fixed: WO List's `openWO()` was a complete
    toast stub** — no work order in the list ever actually opened, at
    all, this whole time. Real backing Record View data only exists for
    2 WO numbers (`DEMO_WO_JOBTYPES` in `eam-shared.js`: 19257, 19831).
    New rule (design-decisions-v3-1.md §24 rule 3): those 2 open as
    themselves; every other WO in the list opens as WO 20450 instead —
    a pre-existing "dummy routine, always Free Form, no configured
    workflow" demo WO (`data/wo-20450.js`) that was already built for
    §11's fallback case but never wired to anything. Hand-off via a new
    `eamOpenDemoWo` sessionStorage flag, consume-once, same pattern as
    `eamNewWoRecord`/`eamSyncReturnUrl`. Verified live: WO-19257 opens
    with its real configured workflow/step rail intact; any other WO
    (tested WO-19244) opens as 20450, Free Form, no step rail.
  - **Real cross-cutting bug fixed: `.prototype-label` was a raw "web
    orange" (`rgba(255,165,0,.9)`)** — never tied to `var(--orange)` or
    any hex any earlier grep this session targeted, so it survived every
    purple/orange sweep undetected despite being visible on every single
    screen's header. Converged to `var(--gray-4)` (it's a dev watermark,
    not content). Also found WO List's own local copy of this class was
    the *fuller* of the two definitions (had `white-space`/`font-family`/
    `text-transform`/a responsive `display:none`+`@media` toggle the
    shared copy lacked) — promoted all of that up to `eam-shared.css`
    instead of just patching the color, then deleted WO List's now-fully-
    redundant local copy. Same "local copy quietly improved, never
    synced back" pattern as `.nav-back` in the Phase 2b pass above.
  - **Real cross-cutting bug fixed: Activity Checklist's stepper header
    had a live 3-colour group-name scheme** (`.stepper-group-name.g-
    safety`/`.g-main`/`.g-close` — brown/purple/green raw hex, both
    themes) sitting directly above the progress bar, dynamically applied
    via `className = 'stepper-group-name g-' + it.group` — never caught
    by any earlier grep since none of the hex values matched `var(
    --purple)`/`var(--orange)`/known tokens. This, not the progress bar's
    own fill (already correctly `var(--green)`, a legitimate kept
    instrument), was what read as "outdated from our new palette."
    Collapsed to one plain-ink rule, all 3 group modifiers now no-ops.
  - **`.view-all-btn` (Activity Checklist) "buttered up" per user
    request** — was a flat muted-gray pill (`--gray-4` text, thin
    `--border`) that barely registered as a button next to everything
    else in the header. Now bold ink text, `1.5px --border-strong`
    border, a real hover (`background:var(--border-strong)`) and a tap-
    scale `:active` state.
  - **WO List's card Description subline was gray, should be ink** — a
    real internal inconsistency, not a deliberate "muted subline" choice:
    the same field already renders in ink everywhere else on this screen
    (List mode's table cell, any `.field-value`) — only the Detailed
    card's slot-2 subline was left on `--text-muted`. Fixed to
    `--text-body` in WO List's own local `.ld-card-subline` only — the
    shared `eam-shared.css` copy (Sample Screen/Card Standard/Equipment
    List) still renders slot 2 muted per §8.3's own "muted subline" rule,
    deliberately not generalized without the same complaint surfacing
    elsewhere. See design-decisions-v3-1.md §8.3 for the flagged note.
  Verified every item live (Home, Activity Checklist, WO List, WO Record
  View) in both themes where applicable — no console errors anywhere.
- **Notifications screen built, 2026-07-22** — `eam-notifications-
  prototype-v1.html`, the "quick and dirty" screen deferred since the
  nav/palette rollout began (see `project_deferred_screens_backlog`
  memory). Bottom-nav's Notifications tab on Home and WO List now does a
  real navigation here instead of a toast stub. Source data (`data/
  notifications.js`, `EAM_NOTIFICATIONS`) is modeled on the real
  R5MAILEVENTS table — the same log already driving this app's email +
  push system, not a new backend concept; the one real gap (that table
  has no read/unread column) is flagged, not solved, in design-decisions-
  v3-1.md §25. Screen has grouped Today/Earlier cards, All/Unread filter
  chips, mark-all-read, per-card dismiss (behind the shared confirm
  modal), and tap-to-open-source-WO reusing WO List's own §24 rule 3
  demo-WO fallback. One notification type, `comment_mention`, is a
  forward reference — **@mention tagging in Comments is still not built
  anywhere in this prototype** (circle-back item, not started this
  session — see `project_comment_tagging_circleback` memory). Bottom-nav
  badge promoted to a shared `updateNotifBadge()` in `eam-shared.js` on
  its 2nd real consumer (Home + WO List), called from `initSharedApp()`;
  both screens' old hardcoded static badge count is gone, replaced by the
  real live unread count. Verified live in both themes — filter, mark-
  all-read, dismiss, and tap-through-to-WO all confirmed working, no
  console errors. See design-decisions-v3-1.md §25 and
  `docs/component-library.md`'s Notification Card entry for the full
  write-up.
- **Notifications follow-up fix pass, 2026-07-22 (user-reported)** — 3
  items: (1) a real cross-cutting bug, `.nav-icon-wrap` (the wrapper
  `.bottom-nav-badge` positions against) was never actually promoted to
  `eam-shared.css` despite already having 2 consumers before this screen
  existed — both had quietly hand-copied it locally instead, so the gap
  never surfaced until a 3rd screen was built without it and its badge
  flew to the button's outer corner; fixed at the source, both local
  copies deleted. (2) Mark all read moved out of the header into the
  filter-chip row as a right-aligned pill (`.notif-mark-all-chip`,
  `margin-left:auto` on the button, not on the shared row class), instead
  of the header icon button from the first pass. (3) The per-card
  reference row is now `{date} · {time} | Work Order {number}` — `time`
  in `data/notifications.js` also moved off spelled-month onto this
  app's actual numeric-date standard (§3.4). Full write-up: design-
  decisions-v3-1.md §25's follow-up-pass bullet.
- **Near-final punch-list pass, 2026-07-22.** User called the prototype
  "very close" to done and worked through a punch list spanning WO
  Record View, Checklist, Issue Parts, Book Labor, Insert Mode, and
  Search screens. All items resolved except two left as open discussion
  (below).
  - **WO status colour locked** (design-decisions-v3-1.md §15.4) — the
    pre-delivered status list is now exactly the 3 real system statuses
    (Work Request/Released/Closed), not an arbitrary demo set; green is
    reserved for Released only, Work Request and Closed both render
    neutral outline, so green never means "closed." `STATUS_CLASS_MAP`
    in `eam-wo-record-view-prototype-v1.html` updated accordingly.
  - **Real bug found and fixed alongside this:** `applyDemoWoIdentity()`
    (`eam-shared.js`) was overwriting the header's Type badge text with
    `EAM_WOTYPE[jobType].desc` ("Breakdown Maintenance") — the internal
    job-type/workflow-routing table's description, not the same thing
    as the WO's own user-facing Type field. That's why Type showed
    "Breakdown Maintenance" instead of the Type LOV's actual "Breakdown"
    text. Fixed by leaving Type alone in that function; also corrected
    demo WO 19257's own `RECORD.type` to `BREAKDOWN`/"Breakdown" (was
    `CM`/"Corrective Maintenance," inconsistent with the WO's own
    breakdown-scenario narrative).
  - **Activities section simplified** — Task Plan and Material List
    dropped from both the on-screen card and the Activity Edit popup;
    ships with just Trade + Start Date, a user can add either field
    back via SD.
  - **Checklist:** Notes moved above the Flag for Follow-up button;
    the Yes/No prompt bar's question reworded present-tense ("Do you
    need to issue parts?") and restyled off the mono/uppercase/gray
    caption treatment onto the same bold Inter styling as the item's
    own focus label (`.prompt-question`).
  - **Issue Parts:** the decorative building icon removed from the
    store-selector pill everywhere on the screen (header + every sheet
    row) — the functional chevron/lock affordance icons stay, since
    they're the actual editable-vs-protected signal, now the subject
    of its own open circle-back item (below).
  - **Book Labor, 2 real bugs fixed:** (1) the Add Labor sheet's
    Employee code line (`fv-employee-code`) was right-aligned
    (`align-items:flex-end`) under the description, contradicting the
    labor-row/Correction-sheet convention this same field is supposed
    to match (left-aligned) — fixed to `flex-start`. (2) clearing
    Employee or Crew via the LOV sheet's Clear button never re-enabled
    (unprotected) the other field, because `clearLov()` (`eam-shared.js`)
    had no hook mechanism at all on the clear path — `LOV_ON_SELECT`
    existed for picks, nothing equivalent existed for clears. Added a
    parallel `LOV_ON_CLEAR`/`runLovOnClearHook()`, same optional-object
    shape, called from `clearLov()`; Book Labor wires
    `onEmployeeLovCleared()`/`onCrewLovCleared()` through it.
  - **"Auto-ready" footer label removed app-wide** (Book Labor, Issue
    Parts), and WO Closing's dynamic "Comments required" bar-meta text
    removed too, per explicit user direction — no bottom-bar status
    text ships by default anywhere now (`.bar-meta` CSS deleted, now
    fully unused). A future per-screen configurable version (same
    style as the checklist's own "Do you need to issue parts?" prompt)
    is expected later but wasn't built this pass.
  - **Insert Mode Description field** (WO List's own Create, Home's
    Create bar) converted from a popup-triggering `.form-field` (the
    Notes-style `openTextEditor()` pattern) to the real standard inline
    text field (`.field-inline-input` textarea, tap-to-focus, no
    popup) — matches every other single-line text field in the app
    (e.g. the Standard Model's own UDF01 example) instead of treating
    every text field as a Notes field.
  - **Insert Mode Equipment field converged onto WO Record View's own
    card, 2nd Equipment LOV pass** — `.equip-card` (Insert Mode's
    generic headline/subline/attrs table, actually an earlier iteration
    of WO Record View's own Equipment display that WO Record View had
    already moved off of) is gone; both screens now render the exact
    same `.equip-summary-card` (icon + desc/code/type), via a new
    shared `equipSummaryCardHTML()` helper in `eam-shared.js` that
    `renderEquipCard()` (WO Record View) and `renderRefCard()` (Insert
    Mode) both call. `EQUIP_ICON_SVG`/`EQUIP_CLASS_ICONS` promoted to
    `eam-shared.js`; WO Record View's local duplicates removed. This
    closes the "on-field display diverges" open item flagged in
    design-decisions-v3-1.md's punch list during the original Equipment
    LOV convergence (2026-07-21).
  - **Pill colour, editable vs. protected — resolved same session.**
    Mockup at `prototypes/standalone/mockups/pill-color-options-
    editable-vs-protected.html` (4 options: current/no-change, purple
    accent, green outline, solid ink fill). User picked **D — solid
    ink fill**, with 2 explicit scope limits: **pills only** (LOV-
    shaped fields like Book Labor's Employee/Crew Header Fields cells
    are NOT pills and were left alone — the mockup's inclusion of them
    was itself over-scoped) and **don't touch currently-protected org
    pills**. Applied to the 3 real pill components' editable state
    only: `.store-selector`/`.crew-selector-pill` (shared base,
    `eam-shared.css`) and `.org-pill` — each now `background:var(
    --octave-black);color:#fff` light / flipped dark, same recipe as
    `.btn-contained`. Protected variants (`.store-selector.protected`
    in Issue Parts, `.org-pill.protected` — always paired with
    `.in-header` on every live screen) were explicitly rewritten to
    spell out their pre-existing colors rather than just relying on
    opacity dimming over the new fill, since dimming a black fill
    reads completely differently than the original gray outline.
    Verified live across every consumer (Issue Parts store pill +
    Return-sheet protected variant, Book Labor's crew-selector-pill,
    WO List/Home's editable org-pill, WO Record View/Equipment RV's
    protected org-pill) in both themes — no console errors, protected
    pills pixel-identical to before.
  - **Search screens' quick filter dropdowns** — still an open
    question the user asked outright (what's needed to build them,
    what they should look like); answered in-conversation this
    session, not yet built into any screen. Current state: 3 of WO
    List's 6 filter chips (Status/Priority/Organization) already have
    a real multi-select sheet, driven by each dataspy's own CD
    (code/description) list; the other 3 (Description/WO number/Due
    date) are deliberate "coming soon" stubs, since a multi-select
    checklist doesn't fit free text/an identifier/a date — those need
    their own UI shape (a text search input, and a date-range picker)
    that hasn't been designed yet. Building a real one needs: (1) the
    field's own value domain (a fixed CD list vs. free text vs. a date
    range) to pick which of those 3 shapes applies, (2) for CD-driven
    fields, the actual option list (already how Status/Priority/Org
    work, and now Status/Type/Org — see the 2026-07-22 follow-up bullet
    below); for the other 2 shapes, no new mechanism exists yet.
- **WO flow routing fixed + Priority→Type swap, 2026-07-22 (2nd punch-
  list pass, same day).** User reported the step rail/Start Work bar
  "missing" from the PM and Routine WO flows (19831/20450), guessing the
  demo-WO toggle was the cause. Verified live first: the toggle itself
  works correctly (rail/bar render right for all 3 demo identities when
  driven directly) — the real cause was `eam-wo-list-prototype-v5_1.
  html`'s `openWO()`, which sent every non-19257/19831 WO in the list to
  the 20450/ROUT identity regardless of that row's own Type, so any real
  PM- or Breakdown-typed WO rendered as Free-Form/no-rail instead of its
  correct workflow. Fixed with real Type-based routing (`TYPE_TO_DEMO_WO`):
  BK→19257/BRKD, PM→19831/PM, everything else (CM/CAL/INS/MOD/ROUT, none
  configured, `data/wo-workflow.js`)→20450/ROUT, still per §11's own
  fallback rule — the 3 real WO numbers still open as themselves first.
  Notifications' `openNotification()` was on the exact same old blanket-
  20450 rule; rather than duplicate the Type lookup for a screen that
  doesn't carry a Type to route on, it now just defaults to the
  corrective (19257) flow instead, per direct instruction ("punching
  into a WO from any other screen, just launch the corrective flow").
  The Sync Status Screen's review flow already effectively did this
  (opens each item's own `openUrl` directly, landing on WO Record View's
  default 19257 state) — no change needed there.
  **Also this pass:** WO List's `WOS` array gained real rows for WO-19831
  and WO-20450 (previously only 19257 existed as a row, even though all
  3 have real backing Record View data) — added so "My Assigned WOs"
  (`DSF.ds1`, was `()=>true`, every WO) could be narrowed to exactly
  these 3 known-good identities, guaranteed to open correctly. And per
  direct instruction, **Priority was replaced by Type** as one of WO
  List's 6 dataspy fields (card attribute row, filter chip, quick-filter
  sheet) — reusing the exact same mechanism Priority had, just repointed
  at `TM`'s Type codes instead of `PRI`'s priority codes (`CD.type`,
  `CID`/`CLB` updated accordingly); List mode's own `woAllFields()` still
  shows both Type and Priority, since it deliberately shows every
  available field, not just the 6 highlighted ones. `TM` gained a new
  `ROUT` entry ("Routine maint", matching `data/wotype.js`'s own
  description) for WO 20450's own Type. Verified live end-to-end (no
  console errors): a PM-typed row opens with the 4-step rail, a
  Breakdown-typed row opens with the full 5-step rail, a CM/CAL/INS/MOD-
  typed row still correctly falls back to no rail, the Type quick-filter
  sheet opens/filters correctly, and "My Assigned WOs" shows exactly 3
  cards. See design-decisions-v3-1.md §24 rule 3 for the full write-up.
- **Screen Designer prototype started, 2026-07-22** —
  `eam-screen-designer-v1.html` (`prototypes/standalone/base screens/`),
  a real base-EAM-desktop-admin surface, separate track from the mobile
  app files above (own self-contained visual system, not
  `eam-shared.css`/`.js`) — replaces the earlier `eam-workflow-designer-
  v1_1.html` exploratory mockup (kept in the same folder as reference,
  not deleted) with a design that actually matches §10–§13's locked
  model: an entry modal (Base Screen: Work Order/Equipment, WO Type
  selector, Copy-from-Group + drag-and-drop-capable dual-listbox Save-to-
  Group(s)) opening onto a live mobile-emulator canvas with a persistent
  left pane that merges tab navigation with step management — draggable
  Visible/Required step rows (WO Record View pinned first) plus Free
  Form/Completion Status Entity/Start Work Status/Completion Status
  settings when a real WO Type is active, a flat plain-nav tab list
  otherwise (fallback WO Type or Equipment, matching §11's no-workflow
  rule). Field-level editing is right-click (Required/Protected/Optional/
  Hidden/Not Available + the same stubbed menu items real base EAM has),
  drag-to-reorder, New Container, and Add Field. Also introduced a **Field
  Grid Section** (§12/§13 has no doc section for this yet — flag if it
  becomes real): any container can toggle List↔Grid layout; grid cells
  drag-resize 1↔2 columns wide and auto-balance so a lone trailing field
  never dangles alone in the last row. See design-decisions-v3-1.md §12
  for the 3 resolved config fields this session added (Completion Status
  Entity — renamed from "status source" — plus new Start Work Status and
  Completion Status fields; Book Labor's Time Entry Mode) and §20 for
  what was reviewed and explicitly deferred (old-mockup speculative step
  options, checklist item authoring, filter-chip config). Verified live
  via the browser preview tool at each step (group drag-and-drop, step
  reorder/visibility renumbering, Completion Status Entity re-defaulting,
  Book Labor's settings gear, grid auto-balance) — one real bug found and
  fixed same session: step-tab badges didn't renumber when a step was
  hidden (fixed by filtering to visible steps before computing position,
  matching logic the mobile emulator's own step rail already used
  correctly).
- **Home nav wiring finished, 2026-07-22 — every Home tile/favorite now
  navigates for real, closing out design-decisions-v3-1.md §24 rule 2
  (previously built for the Equipment tile only).** New `goToScreen()`
  helper in `eam-home-screen-prototype-v1.html` resolves every tile/
  favorite tap to its parent screen + an optional pre-run dataspy. WO
  List gained 2 new dataspies for tiles that had no real target yet:
  **ds9 "Corrective Maintenance"** (Corrective WO's) and **ds10 "Closed
  WOs"** (My Closed WO's, and — as its closest available proxy, since the
  demo data has no real date-range dataspy — Last Week's Work too); My PM
  WO's already matched ds8. Equipment List gained its 2nd dataspy,
  **"Centrifugal Pumps,"** for the Pumps tile/favorite — still just a
  pre-run target, the ds-bar itself stays a "coming soon" stub. Bottom
  nav's Home↔Work stubs on both screens are real navigation now too. Full
  write-up (including 2 real bugs found along the way — a `?spy=` query
  string silently dropped by `npx serve`'s clean-URL redirect, and the
  root cause: `serve.json`'s `cleanUrls:false` had been sitting one
  directory below the actual served root since the 2026-07-20 root-serve
  change, so the underlying clean-URL-then-404 bug was quietly back in
  force app-wide — fixed by moving `serve.json` to the repo root):
  design-decisions-v3-1.md §24.
- **Equipment Search List's "pull-up" presentation got real sheet
  motion, 2026-07-22 (user direction)** — rounded top corners + a
  slide-up-from-bottom entrance on load, same size/ratio as before (the
  `.app` frame already matched Home's exactly), just with the pulled-up-
  over-Home feel a flat page swap never had. See design-decisions-v3-1.md
  §24.1 for the full write-up, including why it's a plain CSS
  `@keyframes` animation rather than the usual JS classList-toggle
  pattern every other sheet in this app uses.
- **Equipment List's search/dataspy/filter build, 2026-07-22 (user
  direction) — closes the "Equipment search wasn't there" gap.**
  Brought `eam-equipment-list-prototype-v1.html` up from its deliberately
  minimal 2026-07-22 stub (ds-bar/search/filter chips all "coming soon")
  to real functionality, copying `eam-wo-list-prototype-v5_1.html`'s own
  §8.3 dataspy-bar/search/filter-chip pattern (its explicit template)
  rather than inventing a second version — but implemented with the
  ALREADY-SHARED `eam-shared.css`/`.js` primitives that pattern's own
  future rebuild is still owed (`.bottom-sheet`/`openSheet()`/
  `closeAllSheets()` for both new sheets instead of a 2nd `.ov`/`.sh-*`
  system, `.lov-option`/`.lov-option-desc`/`.lov-check`/`.ds-fav-star`/
  `.filter-chip`/`.chip-count`/`.ds-bar`/`.res-row`/`.sort-btn`/
  `.ld-search-bar`/`LD_ICONS.*` — all already promoted by the §8.2 List/
  Detail shell or other shared sheets, zero new icons needed). The one
  genuinely new piece is the List↔Search full-screen swap itself
  (`.screen`/`.screen.active`), since that's a top-level 2-screen nav
  pattern distinct from §8.2's inline-collapsing search bar inside a
  record's own tab.
  - New local `EQUIPS` array (8 rows, replacing the old single-record
    `EAM_EQUIPMENT` read) — list-only demo data, same "list content
    isn't 1:1 with the real backing detail record" shape WO List's own
    `WOS` already has (every card still opens the one hardcoded demo
    Equipment record regardless of which row was tapped — no per-record
    routing exists anywhere in this app yet, unchanged). Real asset
    identities reused verbatim from `eam-shared.js`'s
    `EQUIPMENT_LOOKUP_DATA`/`TREE_DATA` (00067333/-334/-335, 00068211,
    00069045, 00070102, 00071358) and `data/equipment.js`'s BLDG-A — not
    invented.
  - 5 dataspies (`all`/`pumps` ids kept unchanged for Home's existing
    pre-run compatibility; added `myAssigned`/`fbpp`/`facilities`) with a
    real favorite-star sheet, same shape as WO List's. `pumps`' filter
    tightened to class+category (was category alone) — a real latent
    bug the old 1-record data never exposed: category-only would have
    wrongly caught the new Centrifugal Blower row too. Verified live.
  - Real Search screen (nav search icon → full nav-back "Search
    equipment" page, live text filter over description/asset ID) and 3
    real filter-chip sheets (Organization/Class/Assigned To — small
    fixed code lists; Description/Asset ID/Category stay toast stubs,
    same reasoning as WO List's own free-text/identifier/date stubs).
    Sort stays a toast stub too, matching WO List's own current state —
    not exceeding the template.
  - Equipment dataspy favorites now flow into Home for real, via a new,
    SEPARATE localStorage key (`eamFavoriteEquipDS`) from WO List's own
    `eamFavoriteDataspies` — sharing one key would have mislabeled every
    Equipment favorite with WO's icon/color/nav target on Home, since
    Home's `loadWoFavorites()` hardcodes `screen:'wo'` on everything it
    reads from that key. Replaces Home's old static `fav3` seed entry;
    `getFavoriteEquipDS()` seeds itself with `pumps` on first-ever read
    (same trick WO List's own `getFavoriteDS()` uses) so Home's
    "Centrifugal Pumps" favorite keeps showing by default.
  - **Real bug found + fixed while live-verifying, not in any grep:** the
    new `#s2List` (search results container) didn't get the shared
    `.content` class (`flex:1;overflow-y:auto`) that `#listContent`
    already carried — without it, `#s2List` had no constrained height of
    its own, so it grew to its full unconstrained size inside `.screen`'s
    flex column and starved its flex-shrink siblings (the search bar and
    filter-chip row) down to ~0px height instead. Fixed by adding the
    class; both screens verified live afterward, both themes, no console
    errors.
  - Not built (out of scope for this pass, matching what was actually
    asked for): List/Detail mode toggle + all-fields table, a real Sort
    sheet, and per-row search-within-filter-sheet inputs (the option
    lists are short enough not to need one yet).
- **§11 fallback (ROUT/WO 20450) rail+bar fix, 2026-07-22 (user-reported
  bug, "locked in").** WO 20450 (no configured workflow) was hiding its
  step rail and bottom bar entirely on all 5 WO workflow screens — read
  as a bug, not the deliberate Free Form behavior it was. Now shows a
  real rail and bar instead: a flat, unordered, ungated list of all 5 WO
  steps (WO Record View/Activity Checklist/Issue Parts/Book Labor/WO
  Closing), no sequence numbers, same visual paradigm as Equipment Record
  View's own tab rail — new `renderFlatStepRail()`/`goToWoStep()` in
  `eam-shared.js`, reusing the numbered rail's `#stepRail`/`#stepMap`
  shell. Every row is freely tappable in any order (real cross-file
  navigation, carrying the demo WO's identity forward via the same
  `eamOpenDemoWo` flag WO List's `openWO()` already used). WO Record
  View's bar now says "Start Work" and works for this case too
  (`startWork()` no longer guards on `CURRENT_WORKFLOW.configured`); the
  other 4 screens' bars ("Next: X"/"Close Work Order") already had no
  such guard, they just needed the same identity-carry fix on their Next
  buttons plus a read of `eamOpenDemoWo` on load (previously only WO
  Record View read it — the other 4 always silently defaulted back to
  WO 19257 regardless of how you arrived). Full write-up: design-
  decisions-v3-1.md's "Fallback rule" section (§11-area), "Revised
  2026-07-22" bullet. **Not yet live-verified in a browser this
  session** — browser preview tool access was denied this turn; re-check
  visually (both themes, full RV→Checklist→Issue Parts→Book Labor→
  Closing free-flow walk) next time this area is touched.
- **WO Closing's post-close flow + activity Completed state, 2026-07-23
  (user direction).** Closing a WO now returns to this same WO's Record
  View instead of the WO List (green overlay unchanged), header status
  updated to match whatever target status was chosen on the Closing
  screen, and the workflow's own activity gets its Completed checkbox
  forced true regardless of its prior assignment status. New: a
  completed activity (checkbox true OR assignment status at system
  status 'C') now renders its fields in a shrunk/raised, literal-
  superscript treatment on WO Record View's Activities list — flagged
  by the user themself as a first pass that might read "wonky" and need
  a different treatment. It stays selectable (only useful to reopen it
  via the Edit button and uncheck Completed); selecting one now makes
  the bottom bar's Start Work protected ("Activity is completed," toast
  on tap) instead of starting the workflow. Full write-up + the real
  cross-screen mechanics (new `eamActiveActivityId`/
  `eamActivityJustCompleted`/`eamClosedStatusKey` sessionStorage hand-
  offs, `CLOSING_STATUS_MAP`): design-decisions-v3-1.md §15.2/§19.7.
  **Live-verified 2026-07-23 by the user (screenshot)** — the close →
  back-to-Record-View round trip, header status swap, and Start Work
  protection all work as designed. The superscript treatment took 2
  follow-up passes to land: 1st pass superscripted every field (broke
  the Trade/Start Date grid's own alignment); 2nd pass narrowed the
  shrink+raise to just the Activity #/Notes line, which fixed the grid
  but still looked wrong — turned out "superscript" was the user's own
  shorthand for a **strikethrough**, not literal raised/shrunk text, all
  along. **Corrected:** the Activity # and Notes line now get a plain
  `text-decoration: line-through`, otherwise pixel-identical to the
  non-completed state (same size/weight/color) — everything else in the
  row, including the whole Trade/Start Date grid, is untouched either
  way.
- **Activity edit popup's Completed checkbox moved into the Header
  Fields grid, next to Assignment Status, 2026-07-23 (user direction).**
  Was a plain `.form-field` checkbox row buried in the popup's collapsed
  "Additional Details" card; now a plain `.attr-item` cell pairing with
  Assignment Status in the same grid row (Status lost its `full-width`
  class to make room) instead of sitting alone. Same `.field-checkbox`/
  `toggleCheckbox()` component every other checkbox in the popup already
  uses — first checkbox hosted in this particular grid, no JS changes
  needed since `toggleCheckbox()`/`isActivityChecked()`/
  `setActivityChecked()` only look for a `data-field` ancestor + a
  `.field-checkbox` child, not a specific row class, and both Insert and
  Update mode already populate it through the one shared
  `populateActivityPopup()`. Confirmed WO Closing's existing hand-off
  (§19.7) already checks this box correctly with no further change —
  it sets the activity's `completed` flag before the popup is ever
  opened, so the popup just reads that flag like any other field. Full
  write-up: design-decisions-v3-1.md §15.2.
- **Equipment LOV popup fixed to render identically from both Create WO
  entry points, 2026-07-23 (user-reported "wonky search LOV" from WO
  List's Create vs. Home's Create bar).** The two entry points already
  called the exact same shared `openEquipmentLookup()` (§15.5) — no
  divergent code path existed. The real cause: the popup's Search tab
  renders using the shared §8.2/§8.3 List/Detail shell's own class names
  (`.ds-bar`, `.mode-tog`/`.mode-btn`, `.res-row`/`.res-count`,
  `.ld-card-subline`, `.ld-table-wrap`) — and `eam-wo-list-prototype-
  v5_1.html` keeps its own local, deliberately-diverged copy of those
  same classes for its own screen (taller/bigger mode-toggle buttons, a
  mono result count, an ink-not-muted card subline, a `.ld-table-wrap`
  bottom margin padded 78px for its own bottom bar) — see that file's own
  header note on why it hand-copies this component at all. Loaded after
  `eam-shared.css`, that local copy silently won same-specificity ties by
  source order, so the popup rendered with WO List's own screen styling
  bleeding through instead of the shared/clean look — Home has no such
  local duplicate, so the popup only ever looked right there. Fixed at
  the shared-file source: added an `#equipmentPopup`-scoped override
  block in `eam-shared.css` (ID specificity always wins over a plain
  class rule, regardless of load order) that pins the popup's mode-
  toggle sizing/font, result-count font-family, card-subline color, and
  table-wrap margin to the canonical/shared values — covers any *future*
  per-screen local override of these same classes too, not just this
  one. **Not yet live-verified in a browser this session** — browser
  preview tool access was denied this turn; re-check visually (open
  Create WO's Equipment field from both WO List's Create and Home's
  Create bar, compare the Search tab's toggle size/result count/card
  subline in both themes) next time this area is touched.
- **Dev-only WO pill selector removed, 2026-07-23 (user direction).** The
  `demoWoToggle` pill (📋 WO 19257/19831/20450, `cycleDemoWo()`) that sat
  outside the app frame in each WO-workflow screen's `.proto-theme-bar`
  next to the theme/online toggles is gone — real cross-screen navigation
  already makes it redundant: WO List's `openWO()` routes by the tapped
  row's Type to the correct demo WO (§24 rule 3), and every WO-workflow
  screen's own "Next" button already carries the current demo WO forward
  via `eamOpenDemoWo`. All 3 workflow tiers (BRKD full flow / PM skips
  Issue Parts / ROUT §11 fallback) are reachable by actually navigating
  (e.g. WO List's "My Assigned WOs" dataspy has one real row per demo
  WO) — verified by reading each screen's own load-time logic, not a
  live-browser check this session (preview tool access was denied).
  `DEMO_WO`/`DEMO_WO_JOBTYPES`/`applyDemoWoIdentity()`/`onDemoWoChanged()`
  and each screen's consume-once `eamOpenDemoWo` read are unchanged —
  only the hand-operated pill itself (button markup in all 5 WO-workflow
  screens + `cycleDemoWo()` in `eam-shared.js`) was removed. See design-
  decisions-v3-1.md's "Dev-only `demoWoToggle` pill removed" row for the
  full write-up. **Re-check visually next time these screens are
  touched.**
- **Sync flow buttered up, 2026-07-23 (user direction) — `wo-local-
  insert`'s error message + 3 real fixes to Retry, all in
  `eam-shared.js`.** The not-yet-synced demo WO's error is now a real,
  matching message — "Equipment is not valid." (its seed data has no
  `equipment` key at all, so the field really is unset) — instead of the
  generic fallback. Fixing it in the UI and hitting Retry now behaves
  correctly end to end: offline actually moves the item into the queue
  (was previously just a banner-text claim — the underlying item stayed
  `'error'` the whole time, a real bug); online resolves it and assigns
  a real WO# (`'19265'`, new shared `resolveSyncItemSuccess()`) instead
  of leaving the header on `'(new)'` forever — same function fires
  whether it resolves directly or after sitting in the queue first, so
  "moved out of the queue" gets identical treatment, not a separate
  code path. Also fixed, found along the way: `retrySyncItem()`'s
  success branch was unconditionally force-opening the sync panel
  bottom sheet on every successful retry, even when it was never open —
  new `refreshSyncPanelIfOpen()` only re-renders it if it's actually
  visible. Full write-up: design-decisions-v3-1.md §4.5.
- **"Restart Demo" button added, 2026-07-23 (user-requested convenience)
  — dev/demo tooling only, no design-doc entry, same category as the
  theme/online toggles.** User was manually re-navigating to the
  standalone folder and opening the login screen by hand each time they
  wanted a clean run; asked whether a button could do that, and whether
  localStorage-cached progress would actually reset. Answer to the 2nd
  question: only partially, before this pass — `resetSyncDemoState()`
  (`eam-shared.js`) only ever cleared the sync outbox
  (`eamSyncItems`/`eamSyncOnline`); Insert Mode's auto-increment WO/
  Equipment number counters, WO List's/Equipment List's favorited
  dataspies, and Home's drag-reordered Favorites/tile order were all
  separate `localStorage` keys it never touched, so a "fresh" login
  wasn't actually fresh on any of those fronts. **Renamed and broadened
  to `resetDemoState()`** — now clears all 8 keys (see its own comment
  in `eam-shared.js` for the full list); still called only from
  `eam-login-prototype-v1.html`'s `startLogin()`, same as before, just
  doing more when it runs. **New `initRestartDemoButton()`**, called
  from `initSharedApp()` — injects a "⟲ Restart Demo" button into every
  screen's `.proto-theme-bar` in JS rather than hand-copying markup into
  ~15 files (same reasoning as any other shared component here); tapping
  it just navigates to the login screen — the actual reset still only
  runs when Log In is tapped there (one more tap, pre-filled
  credentials), not on page load, so simply landing on login to look
  around doesn't silently wipe anything. Not shown on the login screen
  itself (it never calls `initSharedApp()`) — nothing to restart from
  there. **Not yet live-verified in a browser this session** — preview
  tool access was denied this turn; re-check the button's placement in
  `.proto-theme-bar` (especially now that the `demoWoToggle` pill is also
  gone, per the row above — up to 2 buttons on WO-workflow screens,
  theme + restart on the rest) and that a fresh login genuinely resets
  every one of the 8 keys next time these files are touched.
- **Real bug found + fixed testing the above, 2026-07-23 (user-
  reported): WO dataspy favorites weren't actually consistent at the
  outset.** After a Restart Demo/fresh login, Home showed zero WO
  favorite chips, yet WO List's own dataspy sheet showed 2 stars
  (`ds3`/`ds6`) already filled — not a timing fluke, a real asymmetry:
  `eam-wo-list-prototype-v5_1.html`'s `getFavoriteDS()` self-seeded those
  2 as favorited the *first time it ever ran*, but Home's own
  `loadWoFavorites()` never seeds anything, just reads the key back —
  and a fresh login always reaches Home first (before WO List has run
  even once), so Home read the still-empty key while WO List's sheet
  seeded itself only once the technician actually opened it. Fixed by
  removing the seed entirely — `getFavoriteDS()` now just reads-and-
  defaults-to-empty, identically to Home's own function, so WO
  dataspies start genuinely unfavorited everywhere regardless of visit
  order. Equipment List's `getFavoriteEquipDS()` has the exact same
  self-seed shape (`pumps`) and would show the identical mismatch — not
  touched this pass since only WO was reported, flagged in
  `resetDemoState()`'s own comment (`eam-shared.js`) so it isn't lost.
  **Not yet live-verified in a browser this session** — preview tool
  access denied again this turn; re-check that Home shows zero WO
  favorites immediately after Restart Demo, before ever opening WO List,
  next time this area is touched.
- **2 new Home tiles + Favorites empty-state rule, 2026-07-23 (user
  direction).** Added "High Priority — Open" (`tile1b`, My Work group,
  red, points at WO List's already-real `ds3`) and "Facilities"
  (`tile4b`, My Equipment group, same teal as Equipment/Pumps, points at
  Equipment List's already-real `facilities` dataspy) to
  `HOME_TILES` — both dataspies existed already, they just had no Home
  tile pointing to them yet. New `#ico-building` symbol in Home's own
  sprite, copied verbatim from WO List's existing glyph of the same
  name. Also, per explicit user direction to lock this as a real design
  decision, not just a code tweak: **the "Favorites ⭐" section label
  (and its empty row) now hides entirely when there are zero
  favorites**, reappearing the instant a first one exists, same spot —
  previously it always rendered even at zero, which read as broken. This
  is directly downstream of this session's own WO-favorites-seeding fix
  above (§4.5 area) — that fix is what makes a genuinely-empty favorites
  state reachable at the outset in the first place; Equipment's `pumps`
  seed is untouched, so today's practical floor is still 1 favorite, not
  0, until/unless that seed gets the same treatment. Full write-up:
  design-decisions-v3-1.md §24.2, including one accepted minor cosmetic
  gap (a slightly larger top gap under the greeting when Favorites is
  hidden, from `:first-child`'s margin rule not transferring to "My
  Work"). **Not yet live-verified in a browser this session** — preview
  tool access denied again this turn; re-check both new tiles navigate
  correctly and that the Favorites label actually disappears/reappears
  next time this area is touched.
- **New file, 2026-07-23: `screen-layout-field-behavior-prototype-v1.html`
  — Grid vs. List field-type consolidation exercise, findings still
  pending your review, nothing locked yet.** Triggered by WO Closing's
  Activity Completed checkbox (§15.2) being the first field of any type
  ever placed inside the Header Fields grid (`.attr-item`) instead of a
  plain List row (`.form-field`) — it worked by luck (`toggleCheckbox()`/
  `.field-checkbox` never cared which container it sat in), which raised
  the real question this file answers for every field type, not just
  Checkbox. Dummy Record View header (code/description/org/status) above
  two containers: a header-less "Field Grid Container" (matches today's
  legacy Header Fields grid) and a titled "Collapsible Container"
  (`.fg-section`), each holding one example of all 14 field types in the
  same order — Notes/Description forced full-width and pinned first per
  this session's own new rule (a double-wide field can't be one of a
  2-up grid pair). A Findings panel at the bottom states, per type,
  whether Grid and List already agree (Currency/Number/Date/Date-Time/
  Time Only/Checkbox/Identifier LOV — Checkbox turned out to need zero
  new rule at all), deliberately diverge on purpose (Description-Only
  LOV — Grid-only per the 2026-07-16 code+desc-default rule), or are
  genuinely open questions this file is the first to surface (Badge/Icon
  LOV and Protected in a List row; plain Code+Description LOV in a Grid
  cell; Long-text's Grid full-width landing being coincidental, not a
  real rule the way Notes now has). Several new CSS classes
  (`.attr-item.protected`, `.attr-lov-stack`, `.field-badge-inline`,
  `.attr-text.muted`) are exploratory and screen-local on purpose — do
  not promote them to `eam-shared.css` until the relevant Finding is
  actually decided. Also surfaced 2 real pre-existing bugs, neither
  fixed as part of this exercise (flagged in-file/to-user instead):
  `setFieldValue()` is called by the Time Only field in both
  `sample-screen-standard-model-prototype.html` and Book Labor but is
  never defined anywhere in the app; and that same canonical file's
  Department field (and every other `.attr-item` LOV) has no
  `LOV_TITLES` entry and uses `.attr-label` not `.field-label`, so
  `openLov()`'s title fallback silently shows the raw data key instead
  of a real label — avoided in the new file via explicit `LOV_TITLES`
  entries, not fixed at the source. **Not live-verified in a browser
  this session** — preview tool access was denied throughout; re-check
  visually (both themes, every field type in both containers, both
  required examples' left-bar, the Protected/Badge exploratory CSS)
  next time this file is touched, and get your call on each open
  Finding before promoting anything into design-decisions-v3-1.md.
- **Screen Layout / Field Behavior file, follow-up pass, same day
  (2026-07-23) — first round of Findings reviewed, several decided.**
  Badge/Icon LOV in a List row: approved, icon leads (left of the
  description), promote `.field-badge-inline` to `eam-shared.css`.
  Protected in a Grid cell: approved with one change — lock icon moved
  onto the label's own row (new `.attr-label-row`) instead of sitting
  next to the value below it, so it's genuinely "in the same row as the
  label" the way List's single-row `.form-field.protected` already is.
  Long-text: locked to explicit `.attr-item.full-width`, not left to the
  odd-item-out coincidence. **"LOV — Code + Description" and "LOV —
  Identifier" are the same field type going forward** — code +
  description only, no separate "Identifier" name — but the stack ORDER
  (code-over-description, today's default, vs. description-over-code)
  is still the user's own open call: added a 2nd "(desc/code)" example
  of each, right after the original pair, in both containers (file now
  shows 16 field-type examples per container, not 14), so both orders
  can be compared side by side before this goes into design-decisions-
  v3-1.md. Nothing in this bullet is written into the design doc yet —
  still pending the user's final order decision.
- **Screen Layout / Field Behavior file, 3rd follow-up pass, same day
  (2026-07-23) — remaining decisions made, plus real cross-cutting
  fixes promoted straight to the shared files.** LOV stack order for
  Grid is now decided: description over code, locked (List's own
  `.field-lov-value` keeps its pre-existing code-over-description order,
  untouched — this was scoped to Grid LOVs only). The comparison "(desc/
  code)" rows added in the prior pass were removed now that the call is
  made — file is back to 14 field-type examples per container. Checkbox
  in Grid now centers (`.attr-item .field-checkbox{margin-left:auto;
  margin-right:auto;}`) instead of inheriting the List-only right-
  alignment. Time Only in Grid now left-aligns (`.attr-value .time-input
  {text-align:left;}`) to match every other Grid value — its base
  `.time-input` rule is right-aligned, correct for List, but Grid has no
  such convention. **Real cross-cutting change, not scoped to this one
  file:** inline-text fields (short and long, every real screen) now
  always land the cursor at the end of existing text on tap, regardless
  of where in the row the tap lands — new `focusInlineField()` in
  `eam-shared.js` (mirrors `onDescTap()`'s already-proven pattern for the
  header description field), replacing `this.querySelector('textarea')
  .focus()` at all 6 real call sites (Home, WO List, WO Record View,
  Activity Checklist, Sample Screen, this new file) plus the shared
  `fieldRowInline()` template (Equipment RV's Alias/Serial/Model, Custom
  Fields' text-type fields). **Real bug found and fixed doing this:**
  `updateInlineFieldLayout()` unconditionally called `.classList.add()`
  on `input.closest('.form-field')` with no null check — harmless in
  every pre-existing List context, but throws on every keystroke in a
  Grid inline-text field, which has no `.form-field` ancestor at all;
  now guarded. Checkbox/Time-Only/inline-text changes are all promoted
  directly to `eam-shared.css`/`.js` (real shared-component rules, not
  exploratory) — only the LOV stack-order CSS stays local to this file's
  own `<style>` block pending the Findings panel's remaining open items.
  **Not yet live-verified in a browser this session** — re-check on the
  LAN preview (phone) next open, especially: tapping an inline-text
  field's padding vs. its textarea lands the cursor at the end either
  way; typing in a Grid inline-text field no longer throws; Grid's
  Checkbox/Time Only render centered/left-aligned; Grid's two LOV
  examples show description above code.
- **Screen Layout / Field Behavior file, 4th follow-up pass, 2026-07-24
  (user-reported on a real device) — 2 real bugs, both real fixes
  promoted to `eam-shared.css`, neither caught by the prior passes'
  static review since both needed genuinely long/multi-line content
  typed into a field to surface.**
  1. **Inline Text / Notes still visibly cut off long values instead of
     growing taller.** Root cause was a flexbox min-size gotcha, not a
     missing `autoGrow()` call: `.field-inline-input`'s base rule sets
     `flex:1` (→ `flex-basis:0%`, governs the MAIN axis size) *and*
     `overflow:hidden`; inside a column-direction parent (List's
     `.form-field.stacked`, Grid's `.attr-item`) the main axis is
     vertical, so `flex-basis:0` controlled height — and `overflow:hidden`
     suppresses the browser's automatic content-based minimum-size
     safety net, letting the box collapse toward 0 regardless of
     `autoGrow()`'s own explicit inline height. Fixed with `flex:none` on
     both the `.form-field.stacked .field-inline-input` and `.attr-item
     .field-inline-input` override rules — the Grid rule was previously
     local-only to this file, now promoted to `eam-shared.css` alongside
     the List fix. Never caught before because no existing real screen's
     inline-text field had ever been tested with content long enough to
     wrap onto multiple lines.
  2. **Long-text's collapsed display never honored carriage returns.**
     The full-screen editor already allowed Enter to insert a line break
     (nothing blocked it), and the underlying value already stored `\n`
     correctly (`saveTextEditor()` just assigns the raw string to
     `textContent`) — only the read-only collapsed `<span>` failed to
     show them, since default `white-space:normal` collapses `\n` to a
     plain space like any other whitespace run. New `.field-value
     .multiline` / `.attr-text.multiline` modifier (`white-space:pre-
     wrap`, plus left-align on `.field-value` since a right-aligned
     paragraph reads badly) fixes both containers in this file and the
     canonical `sample-screen-standard-model-prototype.html`'s own Long
     Note field — the only other real single-field Long-text consumer
     (Comments/Closing Comments are a different, always-expanded-
     textarea component, not affected).
  Both Notes/Description and Long-text examples in this file now carry
  real multi-line sample content (was an empty "Tap to add…" placeholder
  for Long-text, which couldn't have demonstrated either bug). **Also
  found, flagged, not fixed:** `sample-screen-standard-model-prototype.
  html`'s own Insert Mode `insertDescription` field (line ~391) still
  uses the old `openTextEditor()`/Long-text popup pattern — the real
  screens (Home, WO List) already converted their equivalent field to
  the standard inline text field per this session's earlier decision
  (see the "Near-final punch-list pass" bullet above), but the canonical
  reference file itself was never updated to match its own documented
  rule. Not touched this pass — out of scope for what was asked, flagged
  here so it isn't lost.
  **Not yet live-verified in a browser this session** — preview tool
  access was denied again; the user is testing live via the LAN phone
  preview instead, which is what surfaced both bugs above in the first
  place.
- **Browser preview tools are admin-disabled, confirmed 2026-07-24 —
  see [[feedback_no_browser_preview]] memory.** Not a per-call fluke;
  don't keep retrying `preview_start`/`preview_list`/etc. Verify via
  static code review + the user's own LAN phone testing instead.
- **Grid checkbox — 7-option mockup, then locked in, 2026-07-24.** New
  `prototypes/standalone/mockups/grid-checkbox-size-alignment-options
  .html` — a "Multiple Equipment" checkbox shown 7 ways (4 variants of
  the stacked shape at 2 sizes/2 alignments, 3 variants of a new
  dedicated-right-zone row shape), built as a mockup rather than
  embedded in the comparison file directly (cheaper — no dummy header/
  sheets/Findings panel needed, and matches this project's own
  established convention for exploring options before picking one). User
  picked option 6 (single row, ~28%-wide right zone, medium 24px
  checkbox) — promoted to `eam-shared.css` as `.attr-item.checkbox-zone-
  row`/`.attr-checkbox-zone`, superseding the 2026-07-23 centered-in-
  value-row treatment entirely. Applied to the one real consumer too:
  WO Record View's Activity Edit popup, Completed checkbox —
  `toggleCheckbox()` needed no changes either time.
- **Screen Layout / Field Behavior file, 5th follow-up pass, 2026-07-24
  (same session, more real-device testing) — several real fixes,
  2 promoted app-wide, 1 reverses a locked design-doc rule.**
  - **Currency/Number edit sheet, 2 real bugs.** `openEdit()` never
    focused its input at all — the keyboard only appeared after a 2nd,
    separate tap directly on the input. Fixed with the same delayed-
    focus pattern `openTextEditor()` already used
    (`setTimeout(()=>input.focus(),250)`). Separately, Number used
    native `type="number"`, which pops a different mobile keypad than
    Currency's `type="text"`+`inputMode="decimal"` combo — both now use
    the identical combo per user request ("Number needs the same keypad
    Currency does").
  - **Time Only — reversed the 2026-07-23 Grid-only left-align.** User
    restated the rule directly: List is always right-aligned, no
    exceptions; if Grid defaults to right too, that's fine, no special-
    casing needed either direction. The `.attr-value .time-input{text-
    align:left}` override is removed entirely from `eam-shared.css`;
    both containers now inherit the same base right-aligned rule. Also
    noted: the native `<input type=time>` rendered *centered* in Grid on
    a real device regardless of which text-align value was in effect —
    accepted as a platform limitation (same category as the documented
    24-hour/`lang="en-GB"` quirk), not chased further now that there's
    no override left to suspect instead.
  - **"LOV — Code Only" replaces "LOV — Description Only" entirely —
    real reversal of a locked design-doc rule, not just this file.**
    design-decisions-v3-1.md §5.2's 2026-07-16 "Grid's plain-LOV items
    show description only, no code" is reversed by direct user
    decision: codes are wanted in Grid fields now. Doc updated in place
    (inline correction, matching this row's own established style of
    appending same-row corrections rather than relocating to §21). New
    `.field-value.mono`/`.attr-text.mono` modifier in `eam-shared.css`
    (mono font, normal value size/weight — same as any other identifier
    field, not the smaller muted sub-label style). **Real screen not yet
    swept:** `eam-equipment-record-view-prototype-v1.html`'s own
    Department field — the original example behind the now-reversed
    rule — still shows description-only. Flagged, not touched.
  - **Removed the bespoke floating green checkmark
    (`.inline-confirm-btn`) from every field, app-wide.** User report,
    real device: it duplicated the native mobile keyboard's own confirm/
    arrow affordances ("arrow duplication"). Markup deleted from all 4
    real consumers (this file, Sample Screen, WO Record View, Equipment
    Record View); `onInlineFocus()` is now a no-op stub (existing
    `onfocus="onInlineFocus(this)"` attributes left in place rather than
    hunted down across every screen — harmless), `onInlineBlur()`/
    `onDescTap()`/`onDescBlur()` no longer reference the button. Rely on
    the native OS keyboard's own Done/checkmark instead.
  - **Badge/Icon LOV in a List row — investigated, code confirmed
    correct via static re-read, no bug found.** User reported the icon
    not appearing next to the value in the List. Re-checked the markup,
    `.field-badge-inline`/`.attr-badge`/`.attr-badge-outline` CSS, and
    the flex layout end-to-end — nothing wrong found; the icon SVG is
    inline in the static markup (fixed in an earlier pass), sized,
    coloured via `currentColor`, and has room in the row. Likely
    explanation: the phone's browser cache serving a pre-fix copy from
    earlier in this session (`serve`'s default static-asset caching) —
    not something to fix in code. Re-check after a hard refresh.
  **Not yet live-verified in a browser this session** — preview tools
  are admin-disabled (see above); the user's own LAN phone testing is
  the only real verification path now.
- **Screen Layout / Field Behavior file, 6th follow-up pass, 2026-07-24
  — real device screenshots from an iPhone confirmed 3 of the 5th
  pass's items and surfaced one genuine platform limitation.**
  - **`.mono` fine-tuned twice more:** line-height set to exactly `1`
    (was `1.2`) per direct request. Then a deliberate List exception
    added: List's "LOV — Code Only" stays standard 14px value size,
    mono font-family only (`.field-value.mono`) — List's own row-mates
    (a plain chevron, a 2-line stack) don't create the "looks short"
    mismatch the 28px Grid badge did, so it doesn't need Grid's size
    bump. `.attr-text.mono` (Grid) keeps 24px/line-height 1.
  - **Badge / Icon LOV rebuilt, real bug confirmed by screenshot.** The
    nested-flex-wrapper approach (`.field-badge-inline` as its own
    `justify-content:flex-end` div) rendered the badge detached near the
    label instead of grouped with the value, exactly as reported.
    Rebuilt using the same proven `margin-left:auto` trick
    `.field-checkbox` already uses — badge is now a plain sibling of
    `.field-value`, no wrapper div, one flex context instead of two.
  - **Time Only — confirmed as a real iOS platform limitation, not a
    CSS bug, not chased further.** Both containers now resolve to the
    identical `text-align:right` at the CSS level (verified correct on
    desktop) — but on the user's real iPhone, Grid still shows the
    native control centered and List shows it left-aligned, regardless.
    `<input type="time">` renders as a fully native OS control on iOS
    Safari; its internal segment layout doesn't reliably honor
    `text-align` at all, full stop — same control, same category as the
    already-documented 24-hour/`lang="en-GB"` quirk. No further CSS
    attempts are planned; nothing from page CSS can reach inside a
    native-rendered control's own layout.
  **Not yet re-verified after this pass** — preview tools are admin-
  disabled; next real-device check is on the user.
- **Insert Mode converged onto ONE shared implementation, 2026-07-24
  (user direction) — see design-decisions-v3-1.md §9.6 for the full
  write-up.** Was 3 independent Create builds, one per screen: Home's
  entity-aware two-pill version, WO List's own separate WO-only version
  (hardcoded fields, no entity pill), and Equipment List's total absence
  of one. Now: `eam-shared.js`'s `openCreateSheet(lockEntity)` is the ONE
  entry point every screen's `+`/Create action calls — `ENTITY_META`/
  `ENTITY_FIELD_META`/`ENTITY_FLAT_FIELDS`/`ENTITY_FLAT_LOV_DATA`/
  `renderEntityFields()`/`renderFlatFields()`/`updateInsertSaveGate()`/
  `saveInsertRecord()` all promoted there (were Home-local, or
  independently duplicated by WO List with a different shape).
  `.im-pill-row`/`.im-entity-pill`/`.im-pill-connector` CSS promoted to
  `eam-shared.css` too (was Home-local).
  - **Home's Create bar** — `openCreateSheet()`, unchanged behavior:
    entity pill editable, defaults Work Order.
  - **WO List's own `+`** (both its screens) — `openCreateSheet('WO')`.
    Its entire separate Insert Mode build is gone: local `TYPE_META`/
    `INSERT_STATUS_META`/`renderInsertBadge()`/`initInsertModeDefaults()`
    and local `updateInsertSaveGate()`/`saveInsertRecord()` overrides all
    deleted, hardcoded flat-fields markup replaced by the same
    `#insertFlatFieldsMount` every other consumer uses. Entity pill is
    now `.org-pill.protected` (chevron auto-hides, same as any other
    protected org-pill — no new CSS needed) and locked to Work Order;
    tapping it shows a toast instead of opening the entity picker.
  - **Equipment List gained its first-ever Create entry point** — `+` on
    both its List and Search screens, `openCreateSheet('EQUIP')`. Needed
    the full `#insertModeSheet` markup plus the adjacent lovSheet/
    equipmentPopup/qrScanOverlay/dateSheet/textEditorSheet blocks added
    from scratch (none existed before). No `REF_CARD_FIELDS.
    insertEquipment` entry here (Equipment entities have no equipment-
    reference field pointing at themselves — that's WO-only), so its
    `currentEntity` is set to `'EQUIP'` explicitly before its own eager
    pre-render call — the shared default (`'WO'`) would otherwise try to
    render that card and throw.
  **Not yet live-verified in a browser this session** — preview tools
  are admin-disabled; re-check on the LAN phone preview next open, all 5
  entry points (Home ×2 entities, WO List ×2 screens, Equipment List ×2
  screens) — pill editable/protected states, Save end to end.
- **Insert Mode follow-up pass, same day — see design-decisions-v3-1.md
  §9.7 for the full write-up.** Closes the gap between §9.6's shell
  convergence and WO Record View's own separate §15.5 Equipment
  convergence (Equipment rolled into its `.equip-attrs` grid as a
  full-width required cell, already done in Home/WO List before this
  pass — only Equipment List's copy still needed the same fix, applied
  here even though it's always hidden there).
  - **Protected entity pill contrast, real bug fixed.**
    `.org-pill.protected` never set its own text color — invisible white
    text on its own light-gray background, since every prior consumer
    was also `.in-header` (a separate, correct override). Fixed with
    `.org-pill.protected:not(.in-header) .field-value{color:var(
    --gray-4)}` (`--gray-3` dark theme).
  - **Description rolled into the grid, pinned first, now required** —
    same "always double-wide, always first" rule the field-behavior
    reference file locked; real validation added to
    `updateInsertSaveGate()`/`saveInsertRecord()`, which had nothing
    checking it before.
  - **Flat fields are now a real collapsible `.fg-section`** (was a bare
    `.section-card`, no toggle at all) — matches WO Record View's own
    "Work order details" section exactly, starts collapsed
    (`openCreateSheet()` resets it every fresh open), entity-aware title
    (`ENTITY_FIELD_META[x].flatFieldsLabel`), required-count badge now
    refreshes via a new `updateRequiredBadges()` call in
    `renderEntityFields()`.
  - **Order flagged, not explicitly specified:** Description placed
    before Equipment (both full-width) — revisit if the intended order
    was reversed.
  **Not yet live-verified in a browser this session** — same admin-
  disabled constraint; re-check grid order, required left-bars, collapsed
  default, and pill contrast in both themes next open.
- **Canonical field-type reference coalesced onto one file, 2026-07-24
  (user direction) — `sample-screen-standard-model-prototype.html`
  retired.** The two files had converged onto the same job (§5.2 field
  types) with one real difference: the retired file explained each
  field's rule as an inline caption in the HTML, `screen-layout-field-
  behavior-prototype-v1.html` (built 2026-07-23 as a Grid-vs-List
  consolidation exercise, §20) is a superset — every type shown in both
  a Grid and a List container, not just one. Coalesced onto the latter:
  every per-field "why" (rationale, decision history) moved into design-
  decisions-v3-1.md §5.2 as real table rows, not an inline caption — the
  standalone now carries only field markup/config plus a one-line
  pointer comment to §5.2, so a rule can't drift out of sync with what's
  actually locked. The retired file's non-field-type scaffolding (full
  header pin/ellipsis-menu, a List/Detail header variant, a 3-tab
  dataspy-driven list demo, a full Insert Mode demo, real Comments/
  Documents sections) was dropped, not carried over — deliberate, not an
  oversight: each already has its own canonical home in a real screen
  (Equipment Record View §5.3, WO List §8.3, Home/WO List/Equipment
  List §9.6, Equipment RV §7.2), so a second, thinner copy in the field-
  type file was pure duplication risk. Also swept while in there:
  Equipment RV's Department/Criticality/Class/Manufacturer/Category
  fields (`fieldRowAttr()`) converted from the old description-only
  rule to the decided Code + Description stack — the flagged "real
  screens not yet swept" gap from the 2026-07-24 LOV reversal is now
  closed. See design-decisions-v3-1.md §5.2 (new consolidated rows) and
  §21 (the retired row) for the full write-up. Old file archived at
  `prototypes/standalone/old versions/sample-screen-standard-model-
  prototype.html` for history only — don't copy patterns from it.
- **Action Row — Part Card + Labor Row merged into one real shared
  component, 2026-07-24 (user direction).** Started as a naming-only fix
  (both were tracked as separate implementations of an unnamed category)
  — revisited same session, user's own read on it ("detailed row with
  multiple fields and a single action button unique to that row, real
  difference is the button is collapsible") turned it into an actual UI
  consolidation. Explored first via a 3-option comparison mockup
  (`prototypes/standalone/mockups/entry-row-part-labor-consolidation-
  options.html`) before landing on the shape now promoted to
  `eam-shared.css`/`.js` as `.action-row` (+ `toggleActionRow()`), with
  Issue Parts and Book Labor as its 2 real consumers — both files'
  former local `.part-card*`/`.labor-row*`/`.detail-*` CSS and Book
  Labor's screen-local `toggleRow(idx)` are gone, replaced by the shared
  component. Locked shape: description on top, code (mono) below,
  supporting fields as labeled mono chips always visible (Issue Parts'
  UOM/Store/Bin unchanged; Book Labor's Date/Trade converted from an
  unlabeled string to match), tap reveals a read-only detail list with
  the action button(s) at the bottom. Badges stay deliberately
  unconverged — Issue Parts' qty-badge (outline, "planned") and Book
  Labor's hours-badge (filled, "regular vs. correction") mean different
  things. **Locked interaction paradigm, the reason for the name:**
  tapping an Action Row never navigates to another screen or opens
  Update Mode — it transacts in place via its own button(s), a
  deliberate contrast with the standard List/Detail row-tap-to-Record-
  View rule (§8); Action Row only appears on a "function" tab (Issue
  Parts, Book Labor), every other list/detail screen uses the standard
  search-list pattern (§8.3) instead. Activity Row (WO Record View's
  Activity Selector) stays a deliberate, separate exception — not
  merged, different shape (radio-select, no action button), explicit
  user call. See design-decisions-v3-1.md §17.4/§18.3 and
  `docs/component-library.md`'s Action Row entry for the full write-up.
  **Not yet live-verified in a browser this session** — preview tools
  are admin-disabled; re-check both screens' expand/collapse, the issue/
  return and correction flows, and both themes next open.
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