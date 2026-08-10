# HxGN EAM Mobile — Project Memory

## What this is
A technician-first, offline-capable work order execution app (iOS/Android)
for HxGN EAM. We are prototyping a guided 5-step WO workflow — WO Record
View, Activity Checklist, Issue Parts, Book Labor, WO Closing — plus a Home
screen and the app-level navigation shell (bottom nav, avatar/profile menu,
sync icon) that wraps around all of it. The nav shell's *mechanics* are
locked (§4.2/§4.3 of the design doc); Home's own *content* (which dataspy
tiles/chips, counts) is still an open, unlocked design riff — don't treat
anything about Home's tile/chip choices as decided.

## START HERE next session
Read `docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` §7–§8 before doing
anything else. That's the live, current plan — what's already built, the
compiled-app decision that needs a throwaway proof-of-concept first, the
shared-component discipline to follow going forward, and how Screen
Designer specifically can run given the real base EAM admin framework — a
separate app launched from a legacy menu item, its mobile-preview panel a
real iframe against the actual screens in a new `designerMode`, not a
hand-built mockup renderer. Don't re-derive a plan from scratch or re-run
the conformance audit from §7/§8 — it already ran once, its cross-cutting
fixes are already applied, and its remaining findings are tracked as open
debt in `docs/design-decisions-v3-1.md` §20. Re-auditing everything again
is exactly the kind of token burn to avoid.

**Resolved (was the blocking "single vs. multiple WO base function"
question):** stays on **one function, `WSJOBS`, always** (including the
fallback) — keeps the WO List dataspy mechanism (§6.3/§8.3) exactly as
already built, untouched. A real EAM precedent for routing WO Types to
distinct `FUN_CODE`s does exist in this customer's data (`docs/Data_refs/
Page Layouts perms/`) but was rejected specifically because it would've
fragmented the dataspy mechanism across multiple functions for no benefit
here. The WO-Type dimension instead comes from three small additions: a new
`WOTYPE` column on the existing `R5PAGELAYOUT` (field-level layout), and two
genuinely new small tables — a **WO Workflow header** (Free Form flag +
status source, keyed WO Type × User Group) and **WO Workflow Steps** (tab
visibility/order/required, keyed WO Type × User Group × Step) — all
authored through Screen Designer (§10) itself, which gains a WO Type
selector; no new admin screen. Full resolution in
`docs/design-decisions-v3-1.md` §11–§13. Existing `R5FUNCTIONTABS`/
`R5TABPERMISSIONS` (real tab-level access control) are completely untouched
by any of this.

## Source of truth
`docs/design-decisions-v3-1.md` is the authoritative design spec. Never
contradict a locked decision in that doc without explicitly flagging it to
the user first. It's long — grep for the section you need rather than
reading it end to end. (Note: this doc has its own pending cleanup pass in
progress; treat it as the single source of truth for locked rules/rationale
regardless.)

`docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` is the process/
execution doc — what to build, in what order, and the current plan. Check
there before design-decisions-v3-1.md for "what should I work on," and
check design-decisions-v3-1.md for "what's the locked rule for X."

Also read `docs/project-kickoff-whitepaper-v3.md` for project status,
architecture questions, and proposed sequence.

`docs/component-library.md` is the human-readable, name-first component
reference — "what is the thing called X, and what are its rules,"
browsable by proper name rather than CSS class. Different job from the
other two: `design-decisions-v3-1.md` is the locked-rule spec,
`docs/ui-component-inventory.md` is the raw CSS-level audit,
`component-library.md` is the named catalog that ties a plain-English name
to both. Add an entry here whenever a recurring on-screen pattern gets
named/audited/resolved — don't let "what do we call this thing" become a
re-investigation every time it comes up.

## Current state

### Canonical reference files & shared architecture
- **Canonical standard** — build every new/rebuilt screen against these two
  files, don't re-derive rules per screen: `screen-layout-field-behavior-
  prototype-v1.html` (every field type, in both the Grid and List
  containers — §5.2; rule + rationale live in the design doc, not as an
  inline caption in the file) and `eam-equipment-record-view-prototype-
  v1.html` (the standard applied to a full record view, incl. the
  canonical header pattern — §5.3). `sample-screen-standard-model-
  prototype.html` is retired (superseded by the field-behavior file) —
  archived in `old versions/` for history only, don't copy patterns from
  it or re-add it as a link target.
- **Shared-file architecture:** `prototypes/standalone/shared/
  eam-shared.css` and `eam-shared.js` hold every generic component's CSS/
  JS — headers, sheets, LOV/date/text-editor pickers, Comments/Documents,
  required-field badges, step rail/tab rail chrome, the sync control, Insert
  Mode, Action Row, and more. Loaded via plain relative `<link>`/`<script
  src>` tags (works under `file://`, which only blocks `fetch()`/XHR, not
  tag-based resource loading). A screen adds only its own data/config
  globals and genuinely screen-specific content — never re-implements
  something the shared files already provide. New generic component →
  `eam-shared.css`/`.js` by default, screen-local only until there's a real
  2nd consumer.
- **Retirement convention:** when a screen is rebuilt, move the old version
  to `prototypes/standalone/old versions/` — never keep two live versions
  of the same screen.
- `prototypes/wo-workflow/index.html` (the prior unified compile) is
  **intentionally frozen** — it's a hand-merged monolith with no live
  connection to the standalone source files and is the *wrong* model to
  extend. The plan (see "START HERE") is a real compiled shell that
  actually invokes the standalone files rather than duplicating them —
  still being proven out.
- Known platform limitations, accepted rather than chased further: mobile
  browsers don't reliably honor `lang="en-GB"` (or CSS `text-align`) on
  native `<input type="time">` controls — see §3.4/§20.
- **Browser preview tools are admin-disabled in this environment** (see
  `feedback_no_browser_preview` memory) — don't retry `preview_start`/
  `preview_list`/etc. Verify changes via static code review plus the
  user's own LAN phone testing.

### WO workflow (5-step flow)
All 5 steps are rebuilt onto the shared-file architecture: `eam-wo-record-
view-prototype-v1.html` (Step 1), `eam-activity-checklist-prototype-v2.html`
(Step 2), `eam-wo-prototype-issue-parts-v1.html` (Step 3), `eam-book-labor-
prototype-v2.html` (Step 4), `eam-wo-closing-prototype-v2.html` (Step 5).
Shared chrome: step rail + timer pill (§14.2), a "Reference" group
(Comments/Documents jump-shortcuts + an Equipment stub) pinned after the
last numbered step (§14.8), and the per-step bottom bar (§14.5–§14.7). The
rail (and Equipment RV's tab rail, same shared shell) is a floating pill/
capsule, not the old flush full-bleed card (§14.2 — that old style is
preserved by name, "Flush Full-Bleed Card," in §21 for an easy revert).
The rail also carries the WO Type Colour + Icon Badge (§23.3) — a plain
colour-tinted icon plus a Type-tinted glow on the pill's own shadow for a
real configured workflow, or the same icon inside a solid filled circle
for the §11 fallback (plain shadow, no glow) — doubling as the
workflow-vs-free-form cue the rail previously had none of.

Real cross-screen navigation exists end to end: each step's "Next" button
carries the current WO's identity forward via `eamOpenDemoWo`. Demo data
covers 3 WO identities — **19257** (Breakdown, full 5-step flow), **19831**
(PM, skips Issue Parts), **20450** (Routine, no configured workflow — §11
fallback: flat, unordered, ungated step rail). WO List routes any tapped WO
to the correct identity by its Type (§24 rule 3); an unrecognized WO number
falls back to 20450.

- **WO Record View:** header status pill is green only for Released
  (Work Request/Closed render neutral outline, §15.4). Activities section
  shows Trade + Start Date only. Closing a WO returns here (not to WO
  List); the workflow's activity gets Completed forced true and its
  Activity #/Notes line renders with a strikethrough (§15.2/§19.7).
  Equipment field uses the shared Equipment Lookup popup (Search +
  Structure tabs, §15.5) — the same component Insert Mode uses. Equipment's
  grid badge is now a 44px photo-slot tile (`.attr-badge-photo`, §7.5/
  §15.5 — was a 28px outline icon); tapping the tile itself (not the rest
  of the row) opens a full-screen photo viewer (close top-left, single
  Modify button, real `<img>` so native long-press Share/Copy/Save works
  for free) when a photo's set, or the Camera/Photo library/File source
  picker when it isn't — built shared in `eam-shared.css`/`.js`, only
  wired up (`equipPhotoOnSet`) on this screen so far. A conditional
  Route/MEC pill sits below the badge+value row (§16.9) — "Route:
  `<code>` - `<description>`" when `RECORD.route` is set, "Multiple
  Equipment" when it's an MEC parent without a route, tapping either
  always jumps to the (not-yet-built) Equipment tab. Route itself is a
  real optional LOV field now (Work order details section, 2 demo
  options — Pumps/Fire Extinguishers), defaulting empty on every WO.
  Equipment itself stays unaffected by any of this — still single,
  required, stays in the grid fields (not pulled into its own section).
  Type field's badge carries the WO Type Colour + Icon Badge's solid fill
  (§23.3) — the one field on this screen where that instrument shows as a
  full badge, not a dot. Header description opens the shared long-text
  editor's compact variant (`openDescEditor()`), not an inline edit —
  always required, Save blocked while empty, same as Equipment Record
  View's own header (both share this behavior via `eam-shared.js`).
- **Activity Checklist** ("Focused Stepper", v2, §16): one item at a time
  (Prev/Next), not a scrolling list. Notes is a real always-visible field;
  Comments/Documents are real per-item containers; an item's answer can
  insert dynamic follow-on items (§16.5). No separate "Instructions"
  field on an item — an item's description is the only instructional text
  (see `feedback_checklist_field_model` memory). A *task plan's own*
  instructions (a different, per-plan concept, §16.7) render as a
  one-time, read-only, comment-card-styled screen before item 1 when
  configured, labeled "Task Instructions" everywhere it appears
  (renamed 2026-08-10) — "Start Checklist" advances past it, Prev from
  item 1 returns to it. The Yes/No prompt bar (§14.6) only appears once
  the last item is reached with all required items complete (§16.6). An
  equipment-scoped item's own equipment identity is a chip
  (`.focus-equip-chip`) above the label — supersedes the old low-emphasis
  protected-field row (§16.2 item 7 → §16.8). "View all" has a
  Step/Equipment group-by toggle (§16.8) — Equipment mode groups by
  `equipId`, for checklists carrying one item per piece of Route
  equipment (§16.9, still open/unresolved end to end) — both modes now
  share one group-header component (thin/plain style + a done/total badge
  + collapse chevron on every group, not just Equipment's), and a dataspy
  filter (All/Uncompleted, real `.ds-bar` pill) + icon-triggered search
  sit above that toggle (§16.8 — several filtering/search gotchas
  recorded there, worth reading before touching this area again).
- **Issue Parts** (§17): Store/Bin/Lot picking is screen-local (dynamic
  per-sheet options), reusing shared sheet/lov-option markup. Parts rows
  use the shared Action Row component (§17.4) — tap reveals a detail list
  + action button(s) in place, no navigation. Still uses its own local
  hardcoded parts data, not yet wired to `data/parts*.js`.
- **Book Labor** (§18): wired to `data/employees.js`/`crews.js`/
  `crew_employees.js` — Employee/Crew pickers and the booked-labor list are
  data-driven. Booking against a Crew expands to one labor row per
  employee currently assigned to that crew (§18.7). Labor rows use the
  shared Action Row component (§18.3). Time Only (24-hour, no AM/PM, Inter
  not mono) is this screen's own field-type addition to the standard
  (§3.4/§5.2).
- **WO Closing** (§19): Closing Codes' Problem/Failure/Cause/Action option
  lists source from `data/closing_codes.js`. Status change control,
  Closing Comments, Attachments, and the "every container is collapsible"
  pattern are all screen-local — no shared equivalent yet.

### Home
`eam-home-screen-prototype-v1.html`. Introduced the app-level nav shell
(`.nav-avatar`, `.bottom-nav`, profile dropdown), now promoted to the
shared files (§4.2/§4.3). Create bar opens a new entity-choice menu first
(`openCreateEntityMenu()`, §9.4.1, changed 2026-07-29 — was straight into
Insert Mode with an editable entity pill defaulting to Work Order);
picking WO or Equipment opens the one shared Insert Mode
(`openCreateSheet(code)`, §9.6) locked to that entity, same as WO List/
Equipment List's own Create. Home is a **deliberate, named exception** to the app's
otherwise-monochrome palette rule (§23) — tile/favorite icons keep real
color. Tile/chip **content** (which dataspies, which tiles, counts) is
still an open, unlocked design riff; only the layout mechanics
(scroll-collapse, tap-to-scroll-top, horizontally-scrolling sections) are
locked. The Favorites section (label + row) hides entirely when there are
zero favorites, reappearing once one exists (§24.2).

### WO List / WO Search
`eam-wo-list-prototype-v5_1.html` — **treat this file as the template for
any top-level record-list screen**; copy its dataspy-bar/card-list/nav
pattern rather than designing a second version. Implements the List
Search Screen standard (§8.3): card = up to 6 fields from the dataspy's own
column order (pill headline / muted subline / up to 3 attribute rows,
Organization as a corner badge); List mode shows every available field
(tiered online/offline, §6.13); dataspy bar has a favorite star. Type
shows a small solid colour dot ahead of its plain-text value (WO Type
Colour + Icon Badge, §23.3 — supersedes the earlier "plain monochrome
text" call); Status uses the shared green/red/outline tier vocabulary. 3 of
6 filter chips (Status/Type/Organization) have a real multi-select sheet
driven by each dataspy's own code/description list; Description/WO
number/Due date are still "coming soon" stubs — free-text and date-range
filter UI don't exist anywhere in the app yet. Create (`+`) opens the
shared Insert Mode locked to Work Order.

### Equipment Record View / Equipment List
Equipment Record View (`eam-equipment-record-view-prototype-v1.html`) is
the canonical full-record-view reference (§5.3) — copy its header/section
pattern for any new record view. Custom Fields (admin-defined fields per
record Class+Org, §22) are built for both WO and Equipment Record View,
sourced from `data/custom_field_defs.js`.

Equipment List (`eam-equipment-list-prototype-v1.html`) has a real dataspy
bar/favorites, a Search screen, and 3 real filter-chip sheets
(Organization/Class/Assigned To); Description/Asset ID/Category filters and
Sort are still stubs. Has its own Create entry point
(`openCreateSheet('EQUIP')`). List content isn't 1:1 with the backing
detail record yet — every card opens the same hardcoded demo Equipment
record regardless of which row was tapped (no per-record routing exists
anywhere in the app yet, same as WO List).

### Insert Mode
One shared implementation (§9.6/§9.7): `openCreateSheet(lockEntity)` in
`eam-shared.js` is the single entry point every screen's `+`/Create action
calls — WO List (locked to WO), Equipment List (locked to Equipment), and
now Home too (§9.4.1, changed 2026-07-29): tapping Home's Create icon
opens a new entity-choice menu (`openCreateEntityMenu()`, own component,
not the old editable pill) first, and whichever entity gets picked opens
Insert Mode locked to it, same as the List screens. Description is required,
full-width, and pinned first; the Equipment field reuses the same
Equipment Lookup component as WO Record View; flat fields sit in a
collapsible section matching Record View's own "details" section pattern.
Type is a pill now, not a grid field (§9.4.2, changed 2026-07-29) —
paired with Organization (`[Organization] [Type]`, no connector between
them) in the pill row; the Screen/entity choice itself moved to a small
protected badge in the sheet header (always locked now, every entry point
commits to an entity before Insert Mode opens). Grid is just Description/
Equipment(WO)/Status now, all full-width.
**Renders the record's own screen design** (§9.8) — field set/placement/
required-ness all come from `ENTITY_FIELD_META`/`ENTITY_FLAT_FIELDS`,
standing in for a real Screen Designer layout, and now vary by **Type**
too, not just entity (§9.4.2): each entity has a `default` flat-field
variant (its own default Type) and one shared `alt` variant every other
Type renders instead — obvious, cheap differences only (which fields
appear + required-ness), not a bespoke layout per Type code. Insert Mode
is also the **one documented exception** to the app-wide
required-marker removal (§21/§23/§9.8) — the red left-bar and required-
count badge still render, scoped to `#insertModeSheet`, since a blank
form has nothing to Clear yet.

### Sync system
Nav-bar sync control (`renderSyncControl()`, §4.4.1) shows 4 states
(Synced/Offline/Syncing/Error) as an adaptive icon/pill. The sync panel
bottom sheet (§4.4.2) and the full Sync Status Screen (`eam-sync-status-
prototype-v1.html`, §4.5) both read the same demo outbox data
(`SYNC_DEMO_ITEMS`). Trouble-field surfacing (banner with Retry/Discard) is
a shared component used identically by the banner and by the Sync Status
Screen's own cards. A dev-only online/offline toggle simulates
connectivity; there's no real network detection.

### Notifications
`eam-notifications-prototype-v1.html` (§25) — grouped Today/Earlier cards,
All/Unread filter, mark-all-read, per-card dismiss, tap-through to the
source WO (via WO List's demo-WO fallback rule). Modeled on the real
R5MAILEVENTS table; that table has no read/unread column in real EAM,
flagged but not solved. The `comment_mention` notification type is a
forward reference — **@mention tagging in Comments itself is not built
anywhere in this prototype** (see `project_comment_tagging_circleback`
memory).

### Screen Designer (Base Screens track)
`prototypes/standalone/base screens/eam-screen-designer-v1.html` — a
separate, self-contained visual system (not `eam-shared.css`/`.js`),
modeling the real base-EAM admin surface per §10–§13: entry modal (Base
Screen, WO Type, Copy-from-Group, dual-listbox Save-to-Group), a
mobile-emulator canvas, a persistent left pane merging tab navigation with
step management, right-click field editing (Required/Protected/Optional/
Hidden/Not Available), drag-to-reorder, and a Field Grid Section
(List↔Grid toggle, drag-resizable cells — §12/§13 has no doc section for
this yet, flag if it becomes real). Separate track from the mobile app
screens; feeds the compiled-app/`designerMode` plan referenced under
"START HERE."

### data/ layer
Real reference data lives in `docs/Data_refs/` (Employees/Crews/Stores/
Parts/Trades/Custom Fields exports — see that folder's own memory note).
`data/*.js` files are plain JS globals (works under `file://`, `<script
src>` only — `fetch()`/XHR is blocked). Live consumers: Custom Fields (WO +
Equipment Record View), Book Labor (`employees.js`/`crews.js`/
`crew_employees.js`), WO Closing (`closing_codes.js`). Issue Parts still
uses its own local hardcoded parts data — not yet wired to `data/
parts.js`/`parts_stock.js`/`wo_parts_lines.js`. **Don't assume a data
file's existence means a screen uses it** — check per-screen.

### Palette & navigation (locked, app-wide)
Color is 2 core instruments now, not 3 — status and sync (§23); the 3rd
("required") was a static red left-bar + count badge, **removed
2026-07-28** (direct instruction) since every required field's own edit
popup already blocks Clear, so the marker warned about a state that
can't happen (named for revert in §21, "Required Field Marker"). Plus 3
narrowly-scoped additions, all bold/saturated ("Primary") as of
2026-07-28: editable-pill fill (§23.2), WO Type's own colour + icon
badge (§23.3 — one curated colour per Type, reused identically across
the Type field, WO List row, and step rail; see the WO workflow section
above for the rail's own split treatment), and Priority High's own
colour (§23.4). Home is an explicit, named exception to all of this, see
above. Purple is retired as a UI-state accent; mono is identifiers-only
and never tinted; icons/chips are outlined, not filled, except Priority
Critical/High and WO Type's badge. Back buttons navigate for real on
every screen (§24); every screen's sync icon opens the shared sync
panel. One open item: "Not Free Form" (a configured-but-ungated workflow)
still has no visual signal of its own in the step/tab rail (a prior yellow
wash was removed and never replaced) — flagged in §3.2.2/§15.4, not
resolved. This is separate from the rail's WO Type signal, which
distinguishes a different axis (configured workflow vs. the §11 fallback),
not Free Form vs. Not Free Form within a configured one.

### Dev/demo tooling
No design-doc entries — same category as any other dev convenience. Every
screen's `.proto-theme-bar` carries a theme toggle, an online/offline
toggle, and a "Restart Demo" button (navigates to login; the actual reset —
`resetDemoState()` in `eam-shared.js`, clears all demo `localStorage` keys —
runs on Log In). Cross-screen navigation reaches all 3 demo WO identities
for real, so the old per-screen "cycle demo WO" pill was removed. The
online/offline toggle is now a 3-way cycle (Offline → Online → **Synced**
→ Offline, `toggleDemoOnline()`) — Synced forces the nav-bar sync control
green regardless of `SYNC_DEMO_ITEMS`' own seeded error rows, so a live
demo doesn't show "Error" the whole time without manually clearing them
first. **Defaults to Synced** (2026-07-28) — a fresh load/Reset no longer
starts on Offline-with-2-errors; flip it by hand to see the real outbox
state. Present on every main screen including Home (added 2026-07-28 —
was the one screen missing it).

## Open / deferred work
- **Insert Mode Type pill** — noted 2026-07-28, not scoped or built yet.
  Add a 3rd pill to Insert Mode's entity→Organization pair (§9.4/§9.8),
  for both WO and Equipment, that re-renders Insert Mode's own grid/flat
  layout per selected Type — the same WOTYPE-driven page-layout mechanism
  already resolved for real screens (§11–§13), live inside Insert Mode
  itself rather than only visible after saving.
- **Home's system-action entities + their base-admin config** — noted
  2026-07-28, not scoped or built. Home's Create entity menu (§9.4.1)
  covers WO/Equipment only; legacy non-WO/Equipment menu items — Meter Reading,
  Work Request, Operator Checklist (and possibly Batch Book Labor/Hours
  Worked/Permit to Work) — are candidates to add, each needing its own
  call on full-Insert-Mode vs. lighter action-sheet shape. Separately,
  whichever set Home exposes needs to be admin-configurable rather than
  hardcoded — a base EAM admin screen (informally "Home Icon"/"digital
  work home" setup) for picking which quick actions surface, not yet
  located/named or built; candidate addition to the Screen Designer track
  (§10). Full detail in `design-decisions-v3-1.md` §9.4.
- **Conditional field rules** — analysis written up 2026-08-10 in
  `design-decisions-v3-1.md` §13.1–§13.4; **no tier chosen, nothing built,
  nothing locked.** Field-level conditions ("if field X is Y, make Z
  required / surface another step") would move a mutable record value into
  a config key that today always resolves before render — a different
  evaluation model, not a bigger table. The §11–§13 foundation holds up;
  the two prerequisites worth doing regardless are a single
  `resolveFieldState(field, context)` seam (screens read
  `ENTITY_FLAT_FIELDS`/inline required-ness directly today) and a
  declared-vs-effective field-state split. Read §13.1–§13.4 rather than
  re-deriving the options.
- **Activity Insert/Update Mode** — confirmed fully unbuilt (see
  `project_deferred_screens_backlog` memory).
- **@mention tagging in Comments** — not built (see
  `project_comment_tagging_circleback` memory).
- **Free-text and date-range filter-chip UI** — WO List's and Equipment
  List's non-code-list filter chips (Description, WO number/Asset ID, due
  dates) are still "coming soon" stubs; no text-search or date-range
  picker UI has been designed yet.
- **Equipment List's `pumps` favorite dataspy still self-seeds** on first
  read, unlike WO's equivalent (fixed to not self-seed) — a true
  zero-favorites state isn't reachable for Equipment yet. Flagged in
  `resetDemoState()`'s own comment, not fixed.
- **Issue Parts' parts data** isn't wired to `data/parts.js`/
  `parts_stock.js`/`wo_parts_lines.js` yet — still screen-local hardcoded
  data.
- Remaining per-screen conformance findings from earlier audits are
  tracked in `docs/design-decisions-v3-1.md` §20 — check there rather than
  re-auditing.
- **Route → Multiple Equipment Child (MEC)** — mostly built now (§16.9),
  2026-08-10. Real: the checklist's equipment-context chip + "View all"
  Step/Equipment toggle (§16.8); WO Record View's real Route LOV field
  (Work order details, 2 demo options, defaults empty on every WO) and
  its Route/MEC pill next to Equipment ("Route: `<code>` -
  `<description>`" or "Multiple Equipment," always jumps to the — still
  not built — Equipment tab); and Equipment's photo — enlarged 44px
  badge (§7.5/§15.5) plus a full-screen tap-to-view/Modify photo viewer
  and Camera/Library/File source-picker (shared component, only wired up
  on this one screen so far). Equipment itself stays untouched by any of
  this — single, required, stays in the grid fields. **Still open:** the
  separate **Profile Picture** problem
  (viewing/setting the tech's own avatar photo — today's tiny nav-bar
  icon "adds no real value on mobile") — floated alongside Equipment's
  photo as a possible shared pattern, explored together in
  `prototypes/standalone/mockups/record-photo-section-equipment-and-
  profile-options.html`, but nothing promoted for it; Equipment's own
  photo treatment ended up folding into §7.5 instead of becoming a new
  shared component. Full detail in `design-decisions-v3-1.md` §16.9.

## Prototype conventions
- Each prototype is one HTML file per screen, loading the two shared files
  above plus CDN-hosted fonts — no build step, no bundler, no other
  external dependencies.
- Reference screenshots for visual matching are in
  `prototypes/reference-screenshots/`.

## Working style
- Flag any place where a request would conflict with a locked decision above.
- When a new design decision gets made during a session, add it to
  `docs/design-decisions-v3-1.md` in the same session — don't let the doc
  lag the prototypes.
- **Token economy (sessions were burning tokens fast):**
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
  - Keep this file (`CLAUDE.md`) a current-state snapshot, not a
    changelog — record rationale/history in `design-decisions-v3-1.md`
    instead of narrating it here.
