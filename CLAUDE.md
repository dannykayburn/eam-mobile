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
Read `docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` §7–§8 first —
that's the live plan. **Don't re-derive a plan or re-run the §7/§8
conformance audit**: it ran once, its cross-cutting fixes are applied, and
its leftovers are tracked as open debt in `design-decisions-v3-1.md` §20.
Re-auditing is exactly the token burn to avoid.

Candidates, roughly in order of how ready they are:
1. **Compiled-shell proof-of-concept** (§7.2 of the plan doc) — a 2-file
   throwaway proving parent↔iframe scripting under both `npx serve` and raw
   `file://`. Decides Option A (iframe shell) vs. Option B (real navigation)
   and unblocks Phase 7. Small and decisive.
2. **WO List shared-component consolidation** (§7.3) — `eam-wo-list-
   prototype-v5_1.html` still hand-copies `.nav-avatar`/`.bottom-nav`/
   `.nav-title` CSS that already exists correctly in `eam-shared.css`.
3. **Insert Mode's Equipment Type-vs-Class question** (§20, surfaced
   2026-08-11) — Insert Mode's third pill offers Asset/Position/System and
   saves it as the record's `class`, which no Equipment List filter can
   select and no Custom Fields definition matches. Needs a call on what that
   field actually is, not just a wider list.
4. **Row-tap decision on the WO Equipment tab** — needs a device, not a
   session: flip its dev toggle and pick `chooser` or `split` (§20). Both
   destinations are real navigation now, so it's a fair comparison.

Settled: the WO-Type dimension comes from a `PLO_WOTYPE` column plus the
two new WO Workflow tables, authored through Screen Designer, and the app
mints **no new `FUN_CODE`s** (rationale §11–§13, rejected alternative §21).
**Reversed 2026-08-24, see §26.7:** the "one function, `WSJOBS`, always" half
of that is gone. Any function with `FUN_RENTITY = EVNT` may be
workflow-enabled, opted in per **user group** — this customer already runs
four `WSJOBS` clones (CCJOBS/TRJOBS/ZJ1000/WSJODC) as distinct business
processes, and a single blessed function would cost them the per-clone
labels, boilerplate and field layouts those clones exist for. §26 is the
new base-side section: function resolution, bottom-nav slot binding, and
the User Group Setup screen paradigm.

## Source of truth
`docs/design-decisions-v3-1.md` is the authoritative design spec. Never
contradict a locked decision in that doc without explicitly flagging it to
the user first. It's long — grep for the section you need rather than
reading it end to end.

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
- **Shared hooks a screen can override** (all optional, all no-op without
  the screen's own object/markup): `TAB_PLUS_HANDLERS` (a tab's Plus),
  `ROW_TAP_HANDLERS` (a List/Detail row tap), `LOV_ON_SELECT`/`LOV_ON_CLEAR`,
  `EQUIP_LOOKUP_ON_SELECT`/`EQUIP_LOOKUP_ON_MULTI_SELECT`, `equipPhotoOnSet`.
- **Two rules that bite when building a new standalone screen**, both being
  shared behavior that fails *silently* without per-screen markup:
  `#toast`/`#toastMsg` must exist or **every** `showToast()` is a no-op
  (looks like "taps do nothing"); and `#listDetailHeader` must carry `active`
  or the whole §8.1 header renders invisibly. Full list in §16.10.
- **A card field's `value` must be plain text** — markup goes in a separate
  `html` property (`fieldDisplay()`). `value` feeds the `data-search`
  attribute, so markup in it breaks the row outright.
- **Never put a button at the bottom edge of a sheet that raises the
  keyboard** (§3.4, learned on device 2026-08-11). `.bottom-sheet` lifts by
  `--kb-inset` when the keyboard opens, which parks that button exactly where
  iOS draws its own accessory bar. Both keyboard editors now use a ✕/✓ pair in
  the top corners and no footer; the long-text editor is anchored `top:0;
  bottom:0` so `--kb-inset` can't lift it at all. iOS's accessory bar itself
  cannot be suppressed from a web page — the rule is to not collide with it.
- **A full-attention sheet should open via `openSheetExclusive()`**, not
  `openSheet()`, or a previously-opened sheet stays visible underneath. This
  happened twice: "Set Equipment Photo" behind the comment editor, and Comment
  Actions behind the checklist's All-items overlay. A **non-sheet overlay**
  (the checklist overview) needs `closeAllSheets()` instead, since it isn't a
  `.bottom-sheet` itself. Exclusivity is opt-in because some flows legitimately
  nest sheets (§18).
- **A CLOSED sheet must hide past its own height PLUS `--kb-inset`** — the
  costliest bug of the lot, and the real cause of three "popup showing behind"
  reports. `bottom:var(--kb-inset)` lifts every sheet whether open or not, while
  a closed one is hidden only by `translateY(100%)` (its own height). With the
  keyboard up, any sheet shorter than the inset peeks above it. **The sheets
  were closed, not open** — which is why `closeAllSheets()` and then
  `openSheetExclusive()` both failed to fix it. The closed transform adds the
  inset back: `translateY(calc(100% + var(--kb-inset,0px)))`. If a "showing
  behind" report ever recurs, check whether the surface is actually *open*
  before reaching for a stacking fix.
- **Run `check-keyboard.js` after touching any sheet holding a text input.**
  Four patterns, every one of which reached a device before being caught: the
  closed-transform one above, a control at a sheet's bottom edge (collides with
  iOS's accessory bar), a surface opening without closing others, and `bottom:0`
  defeating `--kb-inset`. The script is verified to catch each — re-introduce
  one and it reports it.
- `prototypes/wo-workflow/index.html` (the prior unified compile) is
  **intentionally frozen** — it's a hand-merged monolith with no live
  connection to the standalone source files and is the *wrong* model to
  extend. The plan (see "START HERE") is a real compiled shell that
  actually invokes the standalone files rather than duplicating them —
  still being proven out.
- Known platform limitations, accepted rather than chased further: mobile
  browsers don't reliably honor `lang="en-GB"` (or CSS `text-align`) on
  native `<input type="time">` controls — see §3.4/§20.
- **Viewport height must be `dvh`, not `vh`** (fixed 2026-08-11). `body` is
  `height:100dvh` with a `100vh` fallback line first, and every `vh`-sized
  bottom sheet has the same pair. On iOS Safari/Android Chrome `100vh` is the
  *large* viewport (URL bar collapsed), so with `overflow:hidden` the bottom
  nav sat below the fold and was unreachable — which is how the app got
  reported as "not rendering properly across device screen sizes" off the
  public URL. Don't reintroduce a bare `vh` height on a full-height box.
- **New shared bottom sheets should build their own markup** and inject into
  `.app` (`ensureSharedSheet()`), rather than requiring per-screen HTML the
  way `openMultiDelete()` does — see §8.3.
- **Browser preview tools are admin-disabled in this environment** (see
  `feedback_no_browser_preview` memory) — don't retry `preview_start`/
  `preview_list`/etc. Verify changes via static code review plus the
  user's own LAN phone testing.

### WO workflow (5-step flow)
All 5 steps are rebuilt onto the shared-file architecture: `eam-wo-record-
view-prototype-v1.html` (Step 1), `eam-activity-checklist-prototype-v2.html`
(Step 2), `eam-wo-prototype-issue-parts-v1.html` (Step 3), `eam-book-labor-
prototype-v2.html` (Step 4), `eam-wo-closing-prototype-v2.html` (Step 5).
Shared chrome: step rail + timer pill (§14.2), a "Reference" group pinned
after the last numbered step (§14.8) holding Comments/Documents
jump-shortcuts plus **Equipment, a real destination screen** (§16.10 — when
it's on screen the rail marks that row active via `activeRef`), and the
per-step bottom bar (§14.5–§14.7). The rail (and Equipment RV's tab rail,
same shared shell) is a floating pill/capsule (§14.2; the old "Flush
Full-Bleed Card" style is preserved by name in §21 for an easy revert). The
rail also carries the WO Type Colour + Icon Badge (§23.3) — a colour-tinted
icon plus a Type-tinted glow on the pill's shadow for a configured workflow,
or the same icon in a solid filled circle for the §11 fallback (plain
shadow, no glow) — which doubles as the workflow-vs-free-form cue.

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
  grid badge is a 44px photo-slot tile (`.attr-badge-photo`, §7.5/§15.5);
  tapping the tile itself (not the rest of the row) opens a full-screen photo
  viewer when a photo's set, or the Camera/Photo library/File source picker
  when it isn't — shared component, wired up (`equipPhotoOnSet`) on this
  screen only so far. A conditional **Route/MEC pill** sits below the
  badge+value row (§16.9): shows iff the WO has equipment rows in the shared
  store, labelled "Route: `<code>` - `<description>`" when a Route is set or
  "Multiple Equipment" otherwise, with a counter badge; always jumps to the
  Equipment tab. **Header Fields grid** holds Equipment (full-width,
  required), then Type | Priority, then **Department | Route** as the bottom
  row — Route is a deliberate optional-field exception to §5.2's
  required-only grid (§21). Equipment itself stays single and required.
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
  equipment — both modes now
  share one group-header component (thin/plain style + a done/total badge
  + collapse chevron on every group, not just Equipment's), and a dataspy
  filter (All/Uncompleted, real `.ds-bar` pill) + icon-triggered search
  sit above that toggle (§16.8 — several filtering/search gotchas
  recorded there, worth reading before touching this area again).
  **Equipment-scoped items now fan out per equipment** (2026-08-11, §16.9),
  which is what that Equipment group-by mode was built for and was never fed:
  when the WO carries equipment on its Equipment tab, every item with an
  `equipId` becomes one item per piece of equipment (equipment-major order,
  deep-cloned so §16.5's dynamic follow-ons work per copy); non-scoped
  safety/close-out items stay single. Recomputed from the store at load, so
  removing equipment removes its items with no separate teardown path. A MEC
  child fans out to its one asset. Note the scale this reaches on purpose —
  the demo Routes are 24 and 156 equipment, so ~96/~624 items; don't "fix"
  that by capping the fan-out.
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

### WO › Equipment tab
`eam-wo-equipment-tab-prototype-v1.html` (§16.10) — the WO's own per-record
equipment list, and **the first real §8 child-tab screen**; copy it for the
next child tab. Reached from WO Record View's Route/MEC pill and the step
rail's Reference-group Equipment item (`goToWoEquipmentTab()`). Not a
workflow step (not in `WO_STEP_FILES`), but it **does carry the WO step
rail** — it has no bottom bar, so the rail is its only way back. Header is
§8.1's protected identity; body is the shared List/Detail shell, config only.
Field set is the real base-EAM screen's 7 grid columns; Status is the
**equipment's** own and reads `Installed` on every row in this prototype.
- **State model:** a shared persisted **WO equipment store**
  (`eamWoEquipment`) is the single truth for this tab *and* WO Record View's
  pill. The tab is **empty unless a Route is selected on the WO header**;
  selecting one inserts that Route's equipment (PUMPS 24 / FIREEXT 156) and
  mints **one MEC child WO per row** parented to the header WO; manual adds
  do the same; the pill is exactly `rows exist`.
- **Buttons** follow §8.4: Add WO Header Equipment / Import Route Equipment /
  Delete Equipment are header actions in the ellipsis (Linear Location
  Details is out of scope); **Plus opens the multi-select Equipment LOV**,
  which *is* the insert here.
- **MEC children are real records now** (2026-08-11): WO List merges them out
  of the store as child rows under their parent, and a child opens as itself
  via a shared session-scoped **WO identity override** (`woIdentitySet()`/
  `woIdentity()`/`woIdentityClear()`) that carries its number/description/
  equipment while `eamOpenDemoWo` still points at the parent for workflow
  resolution. A child never shows the parent's Route, pill, or equipment set,
  and this tab's insert/delete actions are guarded on a child (it's a leaf).
  All 5 workflow steps pick the override up free via the shared
  `applyDemoWoIdentity()`.
- **Open:** row tap isn't locked — `chooser` (default) vs. `split`,
  live-switchable from the screen's own dev toggle (§20).

### Button placement rule (locked, app-wide)
§8.4: if a base-EAM link button errors with "Record must be selected before
performing this action" it is **row-scoped** → candidate for an **Action
Row** (§17.4/§18.3). Every other button — the ones that 9/10 times open a
popup — is a **header action** and belongs in the **vertical ellipsis at the
top of the screen, even when it sits on a tab**. Being on a tab does not make
a button a tab action. Plus stays Insert Mode only, never a shortcut menu for
header actions.

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

### Comments & Documents (locked 2026-08-11, app-wide)
§7.2. **Top 3 inline on the Record View + a `View more` footer** that opens the
matching full tab, everything newest-first. Resolves the old "which record
types get a tab vs. inline" question — it's **both**, for every record type
with these sections. WO Record View lost its old "render every comment inline"
exception. Destinations: Equipment RV uses its existing Comments/Documents
tabs; **WO uses `eam-wo-reference-tab-prototype-v1.html`** — one child-tab
screen carrying *both* tabs (copied from the WO Equipment tab, which is still
the §8 child-tab template). The step rail's Reference group now navigates there
instead of scrolling to the inline section.
- **The View more row is emitted by the shared excerpt renderers**, never
  appended by a screen — appending died on any re-render, and adding a comment
  triggers one. Tabbed screen → set `COMMENTS_TAB_KEY` (uses `goToTab()`);
  untabbed → set `COMMENTS_VIEW_MORE_ONCLICK`/`DOCUMENTS_VIEW_MORE_ONCLICK`.
- **Comments** are chat-style cards, own comments tinted, action ellipsis
  pinned top-right of the card. Actions unchanged: Edit+Delete on your own,
  Copy on everyone's.
- **Documents** carry `Source:` and group by the base-EAM hierarchy (WO /
  Equipment / Project / Department / Parent WO / Location / PM Schedule). **A
  level with no documents renders no group at all** — no "No Document"
  placeholder, deliberately unlike the base screen.
- **The preview slot is a fixed 38px box that degrades to a file-type badge,
  and its size must never depend on whether an image loaded.** Thumbnails
  can't be load-bearing: S3 generates none for `.sql`/`.dwg`/most CAD-office
  types, previews are unavailable offline (the normal state), and presigned
  URLs expire so offline caching must key on a document id, not the URL.
- **Comment cards carry a 26px initials avatar** — confirmed 2026-08-11,
  superseding §7.2's earlier "no avatar" call (relocated to §21 with its revert
  recipe). That call's stated reason was that an avatar would compete with the
  ellipsis, which stopped being true once the ellipsis moved to the card corner.

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
text" call); Status uses the shared green/red/outline tier vocabulary. **All 6 filter
chips and Sort are real** as of 2026-08-11 (§8.3): code-list chips
(Status/Type/Organization) use the per-screen multi-select sheet, and the
other three now use shared, **self-injecting** sheets —
`openTextFilter()` for Description/WO number, `openDateRangeFilter()` for
Due date, `openSortSheet()` for Sort. An active text/range chip shows its own
value, not a `.chip-count`. Create (`+`) opens the shared Insert Mode locked
to Work Order.

### Equipment Record View / Equipment List
Equipment Record View (`eam-equipment-record-view-prototype-v1.html`) is
the canonical full-record-view reference (§5.3) — copy its header/section
pattern for any new record view. Custom Fields (admin-defined fields per
record Class+Org, §22) are built for both WO and Equipment Record View,
sourced from `data/custom_field_defs.js`.
**Equipment photo is built here now** (§7.5, option A2, 2026-08-11): a 74px
slot (`.rec-id-split` + `.rec-photo-slot`, `renderRecordPhotoMount()`) left of
code/description, stretching down beside the status row and **collapsing away
with status on scroll** — status and the Org pill already vanish together, so
the photo goes with them. No photo set → camera glyph on a neutral fill, which
also closes the "what does it show when empty" half of that item. Tapping
routes into the same shared `openEquipPhotoTap()` flow as WO RV's own 44px
badge, so there's one photo mechanic, not two. Rejected alternatives (persist-
shrunk, 44px identity tile, body container, cover strip) are drawn in
`mockups/equipment-photo-header-placement-options.html`, which has real scroll
in every frame.

Equipment List (`eam-equipment-list-prototype-v1.html`) has a real dataspy
bar/favorites, a Search screen, and — as of 2026-08-11 — **all 6 filter
chips plus Sort real**: Organization/Class/Assigned To/**Category** as
multi-select sheets (Category was a stub purely by omission), Description/
Asset ID via the shared `openTextFilter()`, and Sort via `openSortSheet()`.
Its chip sheet also finally got the §6.11-locked in-sheet search box WO
List's always had. Has its own Create entry point
(`openCreateSheet('EQUIP')`). **Per-record routing exists now**
(2026-08-11): a tapped card hands its own row over (`eamOpenEquipment`) and
Equipment Record View opens as that asset. It's an **identity overlay**, not
a real per-asset record — asset/description/organization/class/category/
assigned-to are the tapped row's, the nameplate fields specific to 00067333
(alias/serial/model/manufacturer/value) are cleared, and everything deeper
(Comments, Documents, all 7 child tabs) is still the demo record's. Enough
that a card opens as the asset you tapped; not per-record data. §20.

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
**Created records persist now** (2026-08-11, §9.5): Save writes to a shared
`eamCreatedRecords` store as well as the one-navigation `sessionStorage`
hand-off, so WO List and Equipment List merge created records in at load
(`mergeCreatedWos()`/`mergeCreatedEquipment()`) and re-opening one replays
the hand-off it was born with (`openCreatedWo()`/`openCreatedEquip()`) rather
than adding a second rendering path. Cleared by `resetDemoState()`. A created
WO also stays visible in WO List's default dataspy regardless of its scope.

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
Screen — **clone-aware since 2026-08-24**: family pills plus a function select
over `BASE_FUNCTIONS`, so all four `WSJOBS` clones are designable, with
`state.baseScreen` still the family and `state.baseFunction` the `FUN_CODE`
per §26.2 — WO Type, Copy-from-Group, dual-listbox Save-to-Group), a
mobile-emulator canvas, a persistent left pane merging tab navigation with
step management, right-click field editing (Required/Protected/Optional/
Hidden/Not Available), drag-to-reorder, and a Field Grid Section
(List↔Grid toggle, drag-resizable cells — §12/§13 has no doc section for
this yet, flag if it becomes real). Separate track from the mobile app
screens; feeds the compiled-app/`designerMode` plan referenced under
"START HERE."

`prototypes/standalone/base screens/eam-user-group-setup-prototype-v1.html`
— the User Group Setup screen (§26, built 2026-08-24). A **binding**
screen, not a config form: protected group identity + child tabs, where
Bottom Nav and Sync are real assignment grids and Screen Design / Home
summarise and deep-link out. No insert (groups come from Security ▸ User
Groups), so it has **no Create button at all** rather than a disabled one.
Also self-contained; reuses `eam-base-desktop-ui-prototype-v1.html`'s
components (rail, crumb, hero, tab capsule, `.fd` fields, `.mg` grid).
On the Screen Design tab the only editable thing is
**assignment** — a workflow configuration is an artifact keyed `(function,
WO Type)`, authored in Screen Designer and saved to N groups, and this
screen edits that membership from the group's side. Never steps, gating or
layout. **Assign is not Copy** (§26.5.1). It also runs the cross-domain
consistency checks no designer can — nav slot vs. function permissions,
nav slot vs. assigned configs — which is its strongest justification. Its
**Edit layout** deep link is a real handoff: it writes
`sessionStorage.eamDesignerEntry` and Screen Designer consumes it, opening
pre-filled (function by code-or-alias, WO Type name mapped to the designer's
codes, group injected into Save-to-Group). Both files now share **one**
user-group list — they used to describe different worlds. Anything that
can't be honoured is reported, never substituted. §26.5.1.

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
Critical/High and WO Type's badge. **Counter badges** (§23.5, locked
2026-08-10) all take the Organization pill's recipe — transparent fill,
outlined, mono, **black/white text, never gray** — the sole exception being
the red required-count badge; `.chip-count` is excluded (it's a filled
active-filter marker, not a counter). **Green is reused, never re-invented**
— step-rail done, the running timer, and (2026-08-11) the **confirm ✓** on
keyboard-editing sheets all share the existing green; that ✓ is explicitly
**not** a new §23 instrument or exception, and its disabled state is gray, not
a faded green. Back buttons navigate for real on
every screen (§24); every screen's sync icon opens the shared sync
panel. One open item: "Not Free Form" (a configured-but-ungated workflow)
still has no visual signal of its own in the step/tab rail (a prior yellow
wash was removed and never replaced) — flagged in §3.2.2/§15.4, not
resolved. This is separate from the rail's WO Type signal, which
distinguishes a different axis (configured workflow vs. the §11 fallback),
not Free Form vs. Not Free Form within a configured one.

### Workflow gating is FORWARD-ONLY (locked 2026-08-11, §14.10)
A technician can **always** navigate back to an already-completed step to
update or change it. **"Not Free Form" dictates the order of moving forward,
not backward.** This reversed the rail's prior behaviour: a gated workflow used
to answer a tap on a ✓ step with "Already completed — steps stay in a fixed
order," and a Free Form *configured* workflow (PM) had no handler at all (a
silent dead end). Both navigate now. The reasoning: a mistyped reading or
wrongly-booked hours has to be correctable, or the only options left are
abandoning the WO or leaving bad data in the system of record — which no
workflow config intends. **Forward gating is untouched** (a later step stays
locked and still explains itself). Completed rows carry a trailing chevron
(`.step-map-back`) because `cursor:pointer` says nothing on a touch device, and
an undiscoverable corrective action is nearly as useless as none.
Note §14.7.1's back-button rule is unaffected but its *stated justification* was
corrected in the same pass — it used to cite the rail refusing backward jumps.

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
- **Conditional field rules — Phase 4+, deliberately deprioritised**
  (2026-08-11): "if field X is Y, make Z required / surface another step."
  Options ladder + prerequisites are in `design-decisions-v3-1.md`
  §13.1–§13.4; no tier chosen, nothing built. **Don't spend design time
  picking a tier** — the only thing owed up front is naming the **one-way
  doors**. Two prerequisites qualify, because retrofitting either later
  touches every field on every screen: a single `resolveFieldState(field,
  context)` seam, and a declared-vs-effective field-state split.
- **Offline-search surfacing needs dev involvement** (2026-08-11) — the
  per-row sync affordance and the "results as of \<time\>" freshness caption
  (§6.13) are specified but unbuilt, and shouldn't be prototyped from the
  design side alone: what a row can honestly claim about its freshness
  depends on how the real sync/index layer behaves. §20.
- **@mention tagging in Comments** — not built (see
  `project_comment_tagging_circleback` memory).
- **Insert Mode's Equipment Type vs. Equipment List's Class** — Insert Mode's
  third pill offers Asset/Position/System and `saveInsertRecord()` stores it
  as the record's `class`, but the list's Class column/filter is PUMP/MOTOR/
  VALVE/…, so a created Equipment record has a Class no filter selects and no
  Custom Fields definition matches. Needs a call on what that field *is*, not
  just a wider list. Surfaced 2026-08-11 by persisting created records. §20.
- **Equipment Record View's routed-in record is an identity overlay**, not a
  real per-asset record — deep content (Comments/Documents/all 7 child tabs)
  is still the demo record's. A real fix needs per-asset records in
  `data/equipment.js` (only 00067333 and BLDG-A exist). §20.
- **Issue Parts' parts data** isn't wired to `data/parts.js`/
  `parts_stock.js`/`wo_parts_lines.js` yet — still screen-local hardcoded
  data.
- Remaining per-screen conformance findings from earlier audits are
  tracked in `docs/design-decisions-v3-1.md` §20 — check there rather than
  re-auditing.
- **WO Equipment tab row tap** — `chooser` (default) vs. `split`, both built,
  live-switchable from that screen's dev toggle. Pick one on a device and
  lock it. Both destinations are real navigation now, so it's a fair
  comparison. §20.
- **Sort control only exists on each list screen's Screen 1**, not on its
  Search screen — a markup gap, not a behavior one (the shared sort sheet
  already re-renders both). §20.
- **Profile Picture** — viewing/setting the tech's own avatar photo; today's
  tiny nav-bar icon "adds no real value on mobile." Explored alongside
  Equipment's photo in `prototypes/standalone/mockups/record-photo-section-
  equipment-and-profile-options.html`; nothing promoted. Equipment's own
  photo folded into §7.5 instead of becoming a shared component, so this is
  now a standalone open problem. §16.9.

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
