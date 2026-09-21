# HxGN EAM Mobile — Project Memory

## What this is
A technician-first, offline-capable work order execution app (iOS/Android)
for HxGN EAM. We are prototyping a guided 5-step WO workflow — WO Record
View, Activity Checklist, Issue Parts, Book Labor, WO Closing — plus a Home
screen and the app-level navigation shell (bottom nav, avatar/profile menu,
sync icon) that wraps around all of it. The nav shell's *mechanics* are
locked (§4.2/§4.3 of the spec); Home's own *content* (which dataspy
tiles/chips, counts) is still an open, unlocked design riff — don't treat
anything about Home's tile/chip choices as decided.

## START HERE next session
Read `docs/EAM-Mobile-Design-Doc-v1.md` first — it's the squad-facing summary
layer, and its **Timeline** (M0–M9) is the live sequence. **Don't re-derive a
plan and don't re-run the conformance audit**: it ran once, its cross-cutting
fixes are applied, and its leftovers are open debt in §20. Re-auditing is
exactly the token burn to avoid.

Candidates, roughly in order of how ready they are:
1. **Compiled-shell proof-of-concept** (design doc M3) — a 2-file throwaway
   proving parent↔iframe scripting under both `npx serve` and raw `file://`.
   Decides iframe shell vs. real navigation, and unblocks the compile. Small and
   decisive.
2. **WO List shared-component consolidation** — `eam-wo-list-prototype-v5_1.html`
   still hand-copies `.nav-avatar`/`.bottom-nav`/`.nav-title` CSS that already
   exists correctly in `eam-shared.css`.
3. **Insert Mode's Equipment `Location` option** — the pill is the system type
   (answered, §26.8) but still offers only Asset/Position/System and saves it as
   `class`. See Open work.
4. **Row-tap decision on the WO Equipment tab** — needs a device, not a session:
   flip its dev toggle and pick `chooser` or `split`. Both destinations are real
   navigation now, so it's a fair comparison.

**Two things are settled that older notes may contradict.** The **offline model**
closed 2026-09-08 — R1 is locked (online-first, declared per-entity scope) and R2
(GIS) is Phase 2. Six §20 items closed with it, so §20 is shorter than it looks
in older notes, and the prototype was unaffected except one new item: the sync
control needs a state or copy for an online-only user (§4.4.1/§2.10). **Don't
re-open either, and don't re-run the options analysis** — four options were
weighed once, and the brief was rolled up and retired (§21). Separately, the
spec now runs **§1–§30**; §30 (the Workflow Designer Portal — four configuration
areas over one membership table) is the newest and runs to **§30.23**, and §29
(step instances, gates, forks) sits under it.

## Locked rules — don't re-derive these
**Conclusions only. The rationale, rejected alternatives and revert recipes live
in the spec at the § given — follow the pointer rather than reasoning it out
again.** Requirement-level versions of several of these also appear in the design
doc's Requirements section; neither file holds the reasoning.

| Rule | § | The consequence that bites |
| --- | --- | --- |
| **Start Work is the commitment boundary** | §14.11 | Five things happen at once and only make sense together: status → Start Work Status, **Type protects**, **the WO pins to the technician**, **children hydrate**, config version stamped. Starting a WO found by search **is** its promotion into Tier 1, and it is the **first device-originated pin** — a local pin must survive a server list that omits it, or the next sync evicts live work. |
| **The punch list is BOTH a dataspy and pins** | §2.6 | Locked 2026-09-11, replacing a two-month A-or-B open item. A **dataspy named per user group** is the *automatic* layer — **and its selector still has no home**, since User Group Setup is retired and the portal's User Groups area is a binding surface (§20/§30.14, which also keeps it separate from the offline profile's per-entity dataspy); **pinning** (`R5PINS`) is the *manual* layer on top. Costs both backend asks, not one. The membership row must record **which source** pinned it, or a dataspy re-evaluation evicts a manual pin — and a local pin must survive a server list that omits it, which is now architecturally required rather than just advisable. |
| **One paradigm for every configuration artifact** | §30.13 | Workflows, offline profiles, Home layouts and Home tiles are all **authored once and applied**, and the four answers are shared, not per-area: assignment runs **both directions over ONE membership table** (`{type, artifactId, group}`, every read through an accessor — four parallel arrays is the failure mode); **cardinality follows what the runtime resolves on** (§11 resolves a workflow on *(WO Type, group)* → one per Type plus Free Form; everything else resolves on the group alone → exactly one); **Create follows size** (modal for what fits one form, blank canvas for an arrangement); **Home tiles are global and reused by reference**, so editing one reaches every layout using it and only the *layout* is assignable. |
| **Gating is forward-only** | §14.10 | A completed step is **always** reopenable; "Not Free Form" dictates forward order, not backward. Forward gating is untouched — a later step stays locked and explains itself. Completed rows carry a trailing chevron (`.step-map-back`), because `cursor:pointer` says nothing on a touch device. |
| **Function resolution is per user group, never one blessed function** | §26.7 | Any function with `FUN_RENTITY = EVNT` may be workflow-enabled, opted in per **user group** — this customer already runs four `WSJOBS` clones (CCJOBS/TRJOBS/ZJ1000/WSJODC) as distinct business processes. **This half is still locked and holds either way.** *(What is NOT locked any more: "no new `FUN_CODE`s" — reuse `WSJOBS`/clones vs. a new standalone mobile function was reopened 2026-09-11 and is a **decision required**, §11/§20. A new Equipment function that renders by equipment type is **required** regardless, §26.8. Don't re-derive §26.7 with it.)* |
| **Online-first, with declared offline scope** | §2.1 | Reads hit the server at full fidelity; the local store is a **scoped fallback**, never a projection of the whole database. **Database-wide search does not work offline.** Unchanged: one write path, always-on outbox, the UI never reads the network directly, **no mode the technician chooses**. Consequences live at §2.3/§2.7 (per-entity scope + traversal), §2.8 (three-way lookups), §2.9 (actions may narrow, field state never does), §2.10 (profile per user group), §2.5 (LWW withdrawn — per-shape conflicts). |
| **R2 (GIS / maps) is Phase 2** | §28 | The map is an **editor, not a viewer** (the viewer reduction does not exist); it is a **second sync engine** and GIS edits **never** ride the EAM outbox; its offline unit is a **per-map-area download**. One v1 consequence: keep §27.3's definition-driven renderer generic enough for a map tab. |
| **Hydration has a Tier 0** | §2.3 | Bootstrap config sits in front of the record tiers and is deliberately not one of them — records degrade (fewer rows), configuration doesn't (a missing layout is a blank screen). **Layout is first because it scopes everything after it.** Fetched inside the login round-trip — **not a separate modal**, though login itself legitimately blocks (§2.3 clarifies what "no blocking modals" actually prohibits: bulk record download and connectivity-triggered interruptions, not a user-initiated round-trip). Say **"my open pinned work orders"**, never "today's WOs". |
| **WO resolves on Type; Equipment on system type** | §11–§13, §26.8 | WO needs a `PLO_WOTYPE` column + two WO Workflow tables. Equipment's four system types **already are** four `PLO_PAGENAME` values — no new column, no new table — so four base screens collapse into one mobile surface. **But the authoring surface for those four doesn't exist, and that blocks the Equipment track**: don't build Equipment RV against one hardcoded layout, or every child tab inherits it. |
| **Type protects at its commitment point** | §13.5 | WO Type is editable while not started (confirm → immediate commit → re-render) and **Protected from Start Work onward, no exceptions, no permission escape**. Equipment's system type is **Protected in update mode, always** — so Equipment has no re-resolution exposure at all. One paradigm, two triggers. This replaced a four-tier gate ladder and withdrew the §23 required-marker tension — **§23 stands as written.** |
| **User Defined Screens are scoped, not designed** | §27 | A **UDS** is a customer-authored *screen* — **not** §22's Custom Fields, which are admin-defined *fields*. Don't merge the mechanics; a record can carry both. **In:** UDS-as-a-tab-on-WO. **Deferred:** standalone UDS. **Out:** UDS field authoring. What's needed is **one generic definition-driven tab renderer** (§27.3), never a screen per UDS — and sequence it after a 2nd real child tab exists, since the Equipment tab is a sample size of one. |
| **Workflow steps are *instances*** | §29 | The tier-2 key gained an `Instance` dimension — `(WO Type, User Group, Tab, Instance)` — because "a tab placed twice" and "a second Record View with a different layout" are the same requirement. Layout key is the bare tab id for instance 1 and `tab#n` after, so **nothing migrates**. An instance is either a Step or a More entry, never both, so **forward gating stays unbypassable**. Adds comment/document gates (§29.3) and a **question fork** that routes forward-only and marks skipped steps **N/A rather than hiding them** (§29.4). Authoring is Screen Designer's alone — **don't put any of it on User Group Setup** (§26.5.1) and don't revive a third surface. |
| **Responsive: WIDTH CLASSES, never device names** | §31 | Scope is the **mobile app only** — the portal is web and needs no modes (the mirror of §30.7). **Three classes, and `orientation` is never queried anywhere**: Compact `<600px` (bottom bar, one pane), Medium `600–839` (rail, one pane — foldables and small tablets in portrait; **skipping it is how a foldable gets a stretched phone layout**), Expanded `>=840` **and** height `>=600` (rail, two panes). The height floor is what makes it orientation-free — a rotated phone and a tablet in portrait both correctly stay single-pane. Fluid within a class, **320px floor**, measure capped on typographic not device grounds. Expanded is a *width* problem: a tablet in landscape has roughly the same usable height as a phone in portrait. The **band model** (§4.2 already names the three levels) and **rail-in-band-2** are **proposed, not locked** — frames in `mockups/landscape-mode-approach-options.html`. Amending §4.2's browsing-XOR-record-open binary and §30.16's single `HOME_FOLD` is required to land it; both in §20. |
| **Six cross-device rules — APPLIED 2026-09-21** | §31.5 | All six are done and verified (17/17 screens load, 10/10 tests). **Every one had been invisible on the device it was authored on**, which is the argument for auditing against the rule, not a device. What landed: pinch-zoom unblocked on all 17 screens; **354 `font-size` declarations px→rem** (exact /16, so identical at a 16px root) with **6 deliberate px exceptions** — glyphs inside fixed-size circles, which scale with their control not with reading text; hit areas grown to 48px by transparent `::after`, **painted sizes untouched**; a solid `background` before `.bottom-nav`s `color-mix()`; all storage via **`lsGet()`/`lsSet()`/`lsRemove()`** (never call `localStorage` directly again — it throws in iOS Private Browsing and the symptom is a control *silently doing nothing*); and both fonts self-hosted, so the app now has **zero runtime network dependencies**. Residue in §20: the top-nav cluster cannot reach 48×48 without a §4.2 spacing call, and `mockups/`/`old versions/` still block zoom on purpose. |
| **Native-app feel — and the ZOOM TRAP** | §31.6 | **Two things are called zoom and conflating them caused a wrong fix once.** **Pinch**-zoom is never blocked (it is an accessibility affordance, the app never *needs* it) — and blocking it buys no native feel anyway, because **iOS has ignored `user-scalable=no` for pinch since iOS 10**, so the old tag only restricted Android. The real jank is **iOS force-zooming the page when a text input under 16px takes focus, and not zooming back**. Fix is to **remove the trigger: every text input is `1rem`** (14 rules raised from 13/14/15px — accepted visible cost; iOS system field text is 17pt, so this is *closer* to native). **Never cap viewport scale to fix a field.** What actually delivers app feel, all now in `eam-shared.css`: tap-highlight transparent (the grey flash was the biggest web tell), `overscroll-behavior:none`, `user-select`/`touch-callout` **scoped to chrome so record values stay copyable**, and `touch-action:manipulation` (**not `none`** — that breaks scrolling). Plus a **PWA manifest** + apple meta + generated 180/192/512 icons: Add to Home Screen launches fullscreen, no browser UI. iOS <16.4 leaves the installed window on cross-file navigation — §20. |

## Source of truth

**One fact, one home.** Every fact below has exactly one owning file. Other
files may *point* at it; they must not restate it. Changing a fact means editing
**one** file plus, at most, a pointer.

| Kind of fact | Single home |
| --- | --- |
| Requirements R1–R6, objective, goals/non-goals, scenarios, SLOs, security/privacy/legal, timeline, sign-offs | `docs/EAM-Mobile-Design-Doc-v1.md` |
| A locked design rule, and its rationale | `docs/design-decisions-v3-1.md` |
| Open/deferred items, and rejected alternatives | same file, §20 and §21 |
| What to build next, and in what order | the design doc's **Timeline** |
| What a UI pattern is *called*, and its rules | `docs/component-library.md` |
| Raw CSS-level component audit | `docs/ui-component-inventory.md` |
| Current state of the prototypes, and their traps | this file |

**Why the rule exists, in one line:** the offline-search summary doc restated
§2.3/§2.6/§6.13, drifted for over a month, and was retired 2026-08-25 (§21).
**Don't create a "summary of X" doc where X is already specified** — if something
is hard to find, add a pointer or fix §-numbering.

`docs/EAM-Mobile-Design-Doc-v1.md` is the **squad-facing summary layer** — read
it before the spec. It owns requirements and sequence, and **no design rule**.
Check it for "what should I work on."

`docs/design-decisions-v3-1.md` is the authoritative spec — check it for
"what's the locked rule for X." **Never contradict a locked decision in it
without flagging that to the user first.** It's long — **grep for the section
you need rather than reading it end to end.**

**The doc set was cut back 2026-09-11** to the four files above plus this one.
Anything not in that set is not pointed at on purpose — **don't add pointers
back**, and don't treat a doc's absence from this file as evidence it never
existed.

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
- **The booking pull-up** (`openBookingPullup()`, §18.2/§30.21) is shared and
  **self-injecting** — one sheet, two invocation points by construction (Book
  Labor's timer-running trigger, and the portal's Stop Timer action once the
  app is fed workflow definitions; only the first is wired). Every derived
  value is an **argument**, never read off Book Labor, and it honours
  `mode:'system'` by booking with no sheet at all. Four traps it taught, all
  still live:
  - **Hours is a STEPPER, not a number input** — so the sheet raises no
    keyboard and §3.4 never engages. §18.6's stepper was promoted to
    `eam-shared.css`/`.js` (`startHoldStep()`) as its 2nd consumer;
    don't re-add a local copy.
  - **A screen that shadows `closeAllSheets()` may close sheets BY ID** —
    Book Labor did, so a self-injecting sheet could not be dismissed at all.
    It now closes every `.bottom-sheet`; **never reintroduce an id list**,
    and note the component also closes itself by id as a backstop.
  - **The scrim bypasses per-control handlers** (`.sheet-overlay` always calls
    `closeAllSheets()`), so live sheet state must be released on the **close
    path** (`releaseBookingPullup()`), not on the ✕. Both the shared copy and
    Book Labor's override call it.
  - **Clear state BEFORE closing on the affirmative path**, or a booking also
    fires `onDiscard`. The toast still looks right when this is broken —
    only a callback count catches it (`test-booking-pullup.js`).
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
Shared chrome: step rail + timer pill, the **"More" group** pinned after the
last numbered step, and the per-step bottom bar (§14.2/§14.5–§14.8). More's
membership is **configuration, not definition** — driven by `WO_MORE_TABS` /
`stepMapMoreGroupHtml()` / `openWoMoreTab()` in `eam-shared.js`, so don't
re-hardcode rows into it. Today's three (Comments, Documents, and Equipment —
a real destination screen, marked active via `activeRef`) are a default, not
the spec. Rules, rail styling and the WO Type badge: §14.8, §14.2, §23.3.
Screen Designer has no Placement control yet (§20).

Real cross-screen navigation exists end to end: each step's "Next" button
carries the current WO's identity forward via `eamOpenDemoWo`. Demo data
covers 3 WO identities — **19257** (Breakdown, full 5-step flow), **19831**
(PM, skips Issue Parts), **20450** (Routine, no configured workflow — §11
fallback: flat, unordered, ungated step rail). WO List routes any tapped WO
to the correct identity by its Type (§24 rule 3); an unrecognized WO number
falls back to 20450.

Per-screen notes — **design rules live in §15–§19; these are implementation
facts and traps only.**
- **WO Record View** (§15): Equipment field uses the shared Equipment Lookup;
  its grid badge is a 44px photo tile wired via `equipPhotoOnSet` — **this
  screen only, so far**. A conditional **Route/MEC pill** below it (§16.9)
  shows iff the shared equipment store has rows for this WO, and always jumps
  to the Equipment tab. Header description uses the shared long-text editor's
  compact variant (`openDescEditor()`), not an inline edit — same as Equipment
  RV's header, both via `eam-shared.js`. Closing a WO returns *here*, not to
  WO List (§15.2/§19.7).
- **Activity Checklist** ("Focused Stepper", v2, §16): one item at a time,
  and **navigation is a snap-SCROLL between items — the A/B closed 2026-09-21
  in favour of scroll (§16.1)**. The paged path, its `SCROLL_MODE` flag and the
  copy that carried both were **deleted, not pinned**, so there is one render
  path and no dead branch; the old paged v2 is in `old versions/`. Prev/Next is
  retained and commits the cursor directly. Snapping is JS-owned on
  deceleration — CSS `scroll-snap` was rejected on device.
  No separate "Instructions" field on an item — the description *is* the
  instructional text (`feedback_checklist_field_model` memory); a task plan's
  own instructions are a different concept (§16.7). **Equipment-scoped items
  fan out per equipment** (§16.9), recomputed from the store at load, so
  removing equipment removes its items with no separate teardown path. The
  scale is deliberate — demo Routes of 24 and 156 equipment give ~96/~624
  items; **don't "fix" that by capping the fan-out.** §16.8 records several
  filtering/search gotchas worth reading before touching that area again.
- **Issue Parts** (§17): Store/Bin/Lot picking is screen-local (dynamic
  per-sheet options). **Still on its own hardcoded parts data — not wired to
  `data/parts*.js`.**
- **Book Labor** (§18): wired to `data/employees.js`/`crews.js`/
  `crew_employees.js`. Booking a Crew expands to one row per current member
  (§18.7). **Time Only** (24-hour, Inter not mono) is this screen's own
  field-type addition to the standard (§3.4/§5.2).
- **WO Closing** (§19): option lists from `data/closing_codes.js`. Status
  control, Closing Comments, Attachments and the collapsible-container
  pattern are all **screen-local — no shared equivalent yet.**

### WO › Equipment tab
`eam-wo-equipment-tab-prototype-v1.html` (§16.10) — **the first real §8
child-tab screen; copy it for the next one.** Reached from WO RV's Route/MEC
pill and the step rail's More Equipment item (`goToWoEquipmentTab()`). Not a
workflow step (not in `WO_STEP_FILES`) but it **does carry the step rail** —
it has no bottom bar, so the rail is its only way back.
- **State model:** a shared persisted store (`eamWoEquipment`) is the single
  truth for this tab *and* WO RV's pill. Empty unless a Route is set on the WO
  header; selecting one inserts that Route's equipment (PUMPS 24 / FIREEXT 156)
  and mints **one MEC child WO per row**; manual adds do the same. The pill is
  exactly `rows exist`.
- **MEC children are real records:** WO List merges them in as child rows, and
  a child opens as itself via the session-scoped **WO identity override**
  (`woIdentitySet()`/`woIdentity()`/`woIdentityClear()`) while `eamOpenDemoWo`
  still points at the parent for workflow resolution. All 5 steps pick it up
  free via `applyDemoWoIdentity()`. Insert/delete are guarded on a child.
- **Open:** row tap is `chooser` (default) vs. `split`, live-switchable from
  the screen's own dev toggle (§20).

### Button placement rule (locked, app-wide)
§8.4 owns it. The test: if a base-EAM link button errors with "Record must be
selected before performing this action" it is **row-scoped** → an **Action
Row** (§17.4/§18.3). Everything else is a **header action** in the
top-of-screen ellipsis, **even when it sits on a tab** — being on a tab does
not make a button a tab action. Plus is Insert Mode only.

### Home
`eam-home-screen-prototype-v1.html`. Introduced the app-level nav shell
(`.nav-avatar`, `.bottom-nav`, profile dropdown), since promoted to the shared
files (§4.2/§4.3). Create opens an entity-choice menu
(`openCreateEntityMenu()`, §9.4.1) and then the shared Insert Mode locked to
that entity. **A deliberate, named exception to the monochrome palette rule
(§23)** — tile/favorite icons keep real colour. **Tile/chip *content* (which
dataspies, which tiles, counts) is still an unlocked design riff**; only the
layout mechanics are locked.

### Comments & Documents (locked 2026-08-11, app-wide)
§7.2 owns the rules: top 3 inline on the Record View plus a `View more` footer
to the matching full tab, newest-first, for every record type with these
sections. Destinations: Equipment RV's own tabs; WO uses
`eam-wo-reference-tab-prototype-v1.html` — one screen carrying both tabs
(**the filename is stale**, §20). Two implementation traps:
- **The View more row is emitted by the shared excerpt renderers**, never
  appended by a screen — appending died on any re-render, and adding a comment
  triggers one. Tabbed screen → set `COMMENTS_TAB_KEY` (uses `goToTab()`);
  untabbed → `COMMENTS_VIEW_MORE_ONCLICK`/`DOCUMENTS_VIEW_MORE_ONCLICK`.
- **The document preview slot is a fixed 38px box that degrades to a file-type
  badge, and its size must never depend on whether an image loaded.**
  Thumbnails cannot be load-bearing: S3 generates none for `.sql`/`.dwg`/most
  CAD-office types, previews are unavailable offline (the normal state), and
  presigned URLs expire — so offline caching keys on a document id, never a URL.

### WO List / WO Search
`eam-wo-list-prototype-v5_1.html` — **the template for any top-level
record-list screen**; copy its dataspy-bar/card-list/nav pattern rather than
designing a second version. Implements the §8.3 List Search Screen standard.
All 6 filter chips and Sort are real: the code-list chips use the per-screen
multi-select sheet, while Description/WO number, Due date and Sort use the
shared **self-injecting** sheets `openTextFilter()` / `openDateRangeFilter()` /
`openSortSheet()`. Create (`+`) opens shared Insert Mode locked to Work Order.
**A same-named copy also sits in `old versions/`**, so doc references to this
filename are ambiguous (§20).

### Equipment Record View / Equipment List
`eam-equipment-record-view-prototype-v1.html` is the **canonical
full-record-view reference (§5.3)** — copy its header/section pattern for any
new record view. Custom Fields (§22) are built here and on WO RV, from
`data/custom_field_defs.js`. The equipment photo lives in the header (§7.5): a
74px slot (`.rec-id-split`/`.rec-photo-slot`, `renderRecordPhotoMount()`) that
collapses with status on scroll, routing into the same shared
`openEquipPhotoTap()` flow as WO RV's 44px badge — **one photo mechanic, not
two.**

`eam-equipment-list-prototype-v1.html` has a real dataspy bar/favorites, a
Search screen, all 6 filter chips + Sort, and its own Create
(`openCreateSheet('EQUIP')`). **Per-record routing is an identity overlay, not
a real record:** the tapped row's identity fields carry over
(`eamOpenEquipment`), 00067333's nameplate fields are cleared, and everything
deeper (Comments, Documents, all 7 child tabs) is still the demo record's.
Only 00067333 and BLDG-A exist in `data/equipment.js`. §20.

### Insert Mode
One shared implementation (§9.6/§9.7): `openCreateSheet(lockEntity)` in
`eam-shared.js` is the single entry point for every screen's `+`/Create — WO
List, Equipment List and Home (§9.4.1). **Always locked to an entity before it
opens**; the entity shows as a protected badge in the sheet header. Layout
comes from `ENTITY_FIELD_META`/`ENTITY_FLAT_FIELDS`, standing in for a real
Screen Designer layout, and varies by **Type** as well as entity (§9.4.2) — a
`default` variant plus one shared `alt`, cheap differences only, never a
bespoke layout per Type code. **The one documented exception to the app-wide
required-marker removal** (§21/§23/§9.8): the red left-bar and required-count
badge still render, scoped to `#insertModeSheet`, since a blank form has
nothing to Clear yet.
**Created records persist** (§9.5): Save writes to a shared
`eamCreatedRecords` store *and* the one-navigation `sessionStorage` hand-off,
so both List screens merge them at load
(`mergeCreatedWos()`/`mergeCreatedEquipment()`) and re-opening one replays that
hand-off (`openCreatedWo()`/`openCreatedEquip()`) rather than adding a second
rendering path. Cleared by `resetDemoState()`.

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

### Base Screens track — the portal is the only live surface
`…/old versions/eam-screen-designer-v1.html` — **RETIRED 2026-09-16** (§30.9).
Screen Designer standalone "is not a thing": it is invoked **per step node**
from the portal's workflow configurator and opens in the portal's own
right-hand panel. The panel was built **to parity** the same day, so the old
file is history, not a reference — nothing navigates to it, no `screens.html`
card, and `component-library.md`'s Step Instance Row points at the portal now.
`test-step-instances.js` still executes §29 against the archived copy (headered
to say so), but **the live coverage is `test-workflow-portal.js`** — extend
that one. §10–§13 still describe the model it prototyped, and its Field Grid
Section (List↔Grid toggle, drag-resizable cells) **still has no doc section —
flag it if it becomes real.** The clone-aware function picker it introduced
(`BASE_FUNCTIONS`, §26.2) lives in the portal's banner now, by grain (§30.9).
**The "which surface authors workflows" question is closed** — the portal does,
and nothing else does.
`eam-workflow-designer-v1_1.html` stays retired (§21) — the *field-level* half of
that retirement still holds; don't restore it, and note it modelled several §29
features, so its retirement is not evidence against them.

**`state.steps` is one ordered row per step instance** (§29) — replacing
`stepOrder` + a `steps` map keyed by tab id, which could express none of it. Each
row carries a **kind** (`tab`/`uds`/`prompt`), a **placement** (`step`/`more`,
both lists real and drag-transferable), `visible`, `required`, and the two gates
(`reqComment`/`reqDoc`). Book Labor's Time Entry Mode moved onto the instance,
since Book Labor can now be placed twice. Pinned by `test-step-instances.js` —
**the load-bearing assertion is that instance 2's layout is a copy, not a shared
reference**, which is the one way to break the whole feature while everything
still renders.

`…/old versions/eam-user-group-setup-prototype-v1.html` — **RETIRED
2026-09-16** (§30.6/§21) when the portal became the single base entry point.
**§26's model is not retired** — it was **rebuilt as the portal's User Groups
area** the same day (§30.13), carrying §21's six mechanics rather than
re-deriving them. `test-user-group-offline.js` still runs against the archived
copy, so those rules stay executable — but a green run says nothing about the
portal, and the **severity** cases (§2.10/§27.4) still need porting across; the
"All records" refusal is already re-pinned in `test-workflow-portal.js` (§20).

<!-- retired, kept for the carry-over pointer only -->
What it was: User Group Setup (§26). A
**binding** screen, not a config form: the only editable thing is **assignment**
— never steps, gating or layout — and **assign is not copy** (§26.5.1). No
insert, so **no Create button at all** rather than a disabled one. Its **Edit
layout** deep link writes `sessionStorage.eamDesignerEntry`, which Screen
Designer consumed to open pre-filled. **That contract is now entirely inside
`old versions/`** — both ends retired together, and the portal deliberately
replaced it with a *panel* rather than a hand-off, so there is nothing to
reconnect. Don't revive `eamDesignerEntry` as the way into the designer.

Its **Offline tab assigns one §2.10 offline profile** (§29.6) and shows that
profile's per-entity policy read-only — one artifact serves many groups, so
editing it here would re-provision every other member. It renders the two
never-switchable layers first (Tier 0 + the outbox) and treats profile `None` as
**valid and informational**, not a warning. It also carries §27.4's third check:
a **Required** UDS step for a group without that tab permission is an **error**
(a dead end the WO can't be finished through); the same step optional is a
warning. `capabilityGap()` is keyed on the **configuration**, not the function —
which killed a live false positive. Pinned by `test-user-group-offline.js`.

`…/eam-workflow-portal-v1.html` — **Workflow Designer Portal** (§30, added
2026-09-16). **Built on the Octave / OUX design system** (§30.7), not the
app's own — tokens come from a `<link>` to `DESIGN_FILES/uxt-tokens.css`
(uxt-dsp@2.4.0), which is therefore a **runtime dependency, committed**. Noto
Sans + Material Symbols; `data-uxt-theme` switches light/dark. Octave
component classes throughout (`.Button`, `.chip`, `.rail__row`, `.app-bar__*`,
`.Banner`, `.uxt-switch`, `.seg__btn`). **The single base-screen entry point**
(§30.6): mobile
configuration is one portal with *areas*, not a folder of sibling screens —
a rail row under "Mobile configuration" is an area, **never a link to another
file**. **There are now ZERO links out** (§30.9) — Screen Designer is a panel
invoked from a step node, not a sibling screen — and a test asserts it, because
the dead User Group Setup link is how this erodes. A workflow is an **artifact** you author, copy, preview and apply to
user groups — not the residue of saving a layout to one. Gallery of workflow cards
→ edit mode: banner (description / Free Form / WO Type / notes), **Step Library**
(left, drag-only, inert on click), auto-laid-out single-column flow canvas, and the
**Screen Designer panel opening alongside it in the right third** for the selected
node (real 390px emulator, not scaled).
- **A node IS a §29.2 step instance.** `inst` is minted (smallest unused) and
  stable, the layout key is `id` then `id#n`, and **each instance deep-copies its
  own layout** — same load-bearing assertion as `test-step-instances.js`.
- **New locked rule (§30.2):** a group gets **one workflow per WO Type** and **one
  Free Form** — now a special case of §30.13's cardinality rule rather than a
  workflow-only rule. Collisions are **predicted in the assignment control before
  the click**, from either side, and **Copy carries no assignments** (it would
  collide with its own source on every group) and re-mints every nid.
- **Forks are authored from the `+` on a connector** (recommended over a library
  entry: it names the insertion point), are still `kind:'prompt'` underneath, and
  are capped at two answers. `validateForks()` re-runs on **every** structural
  change and clears backward/dangling targets, counting what it rewrote.
- **TWO FORK KINDS, ONE IMPLEMENTATION** (§30.19, added 2026-09-16). A
  **condition fork** (`kind:'cond'`) reads a field and routes; a question fork
  asks. Everything routing-related goes through **`isForkKind()`** and
  **`forkBranches()`** — never a second copy, or every §29.4 rule has to be
  re-proved for the second kind.
  - **It evaluates at the NEXT tap, on the current screen's fields only.** That
    is what makes it safe: the value is pinned like an answer, it is visible to
    the person being routed, and it is client-evaluable so online and offline
    route identically. Don't make it live — §13.3 item 4.
  - **`condSourceStep()` is the nearest STEP in front of it**, and
    `validateForks()` clears a **stale field reference** as a third failure
    mode alongside backward and dangling targets. Reorder the flow and the
    field's owner changes.
  - **EMPTY IS NOT FALSE.** `condEval()` returns true / false / **null**, and
    null continues in sequence. Optional fields are blank by construction.
  - **Job-captured fields only.** No WO Type, user group, function or system
    type — §11 resolves the workflow on those already and §13.5 protects WO
    Type. No Hidden fields (invisible logic), no buttons (no value).
  - **It is an ACTION that routes** — `isForkKind()` true, `isStepKind()`
    false. No rail number, no gate, positional. First of its kind.
  - **No relative dates** on a date condition; literal only (§20).
- **NO SUMMARY PANELS ANYWHERE** (§30.20, 2026-09-16, user direction — they
  "put off devs"). No "N to look at", no collision banner, no per-card
  "to fix" chip, no capability banner, no rail conflict count. **Every
  validator is KEPT and still called** — `allConflicts`, `profileIssues`,
  `homeIssues`, `capabilityGaps`, `allHomeGaps`, `wouldClash` — by the control
  that can violate it: a clash is refused **in the assignment popover before
  the click**, a missing dataspy is `is-error` on its own select, a capability
  gap is a tag on the node, a hidden tile outlines red. **Raise the error where
  the action is; don't add a roll-up back.** `capabilityBannerHtml` and
  `profileIssueBanner` are deliberate no-ops so the call sites read as absence,
  not oversight.
- **THREE ACTIONS, ONE MODE FIELD** (§30.21, 2026-09-17). `System action` vs
  `User selected` on all three, through **one `mode` field and one
  `actionAsks()` accessor** — never a per-kind test, and a legacy boolean
  `ask` migrates in `normalizeWf()`. Status update / Start Timer / **Stop
  Timer**. The user-selected status **replaces the old "End of Workflow when
  Closing isn't present" design** — it composes, so it can sit anywhere and
  more than once.
  - **The technician's status list is NOT authored here** — it resolves on the
    device from base's user-group status authorisation. An authored subset was
    weighed and rejected as a fifth place a status list would live. Same
    boundary as a UDS definition (§27.4) and a dataspy (§30.14).
  - **STOP TIMER BOOKS THE TIME** — §18.4's whole Add Labor field set is
    *derived* (employee, trade, department, activity, date, start/end, hours),
    so nothing needs asking and no second labour form has to exist. Listed
    protected in the editor as `STOP_TIMER_BOOKING`, which is the argument for
    the action existing, on screen. **The payoff is that Book Labor can sit in
    More.** `User selected` makes **Hours the one editable field** — elapsed
    time is not worked time — and everything else stays protected, because
    there is one labour form in this app and this is not it.
    **Type of Hours is deliberately not authorable** (overtime depends on the
    shift, not the workflow); it books Normal, and §18.3's correction path
    fixes a misbooking. **An earlier same-day refusal of Stop Timer is
    retired — §21. Don't re-derive it.**
  - Three runtime rules, each stated in the editor: **no timer running → no-op
    and continue** (§30.19's "empty is not false"); **Discard never stops the
    timer**, so no path can silently cost a technician their clock; and **a
    Book Labor step alongside a Stop Timer is fine** — see the §18.2 rule
    below, which is the same one condition.
  - **Cancel returns and does NOT advance** on the status prompt, which is what
    keeps an empty authorisation set a "nothing to pick" state rather than a
    dead end. **The timer declines DO advance** — the asymmetry is the
    decision, not an oversight (nothing on the record depends on a timer).
  - An action is still not a step (§30.11): no rail entry, no number, no gate,
    refused by More and by Free Form. One door to the editors
    (`openActionEditor()`), one mode control (`actionModeField()`), one
    setter (`setActionMode()`). The **preview draws every mode** —
    `actionEmulatorHtml()` renders the pull-up over the faded previous step,
    or says "no screen at all". Before this it rendered a blank tab that
    **threw** on click.
- **§18.2 CHANGED 2026-09-17 — the Book Labor booking pull-up, and it is
  BUILT.** Opening Book Labor **while a timer is running** invokes the pull-up
  with hours calculated; opening it with **no timer running does nothing**.
  That one condition is why a Stop Timer action and a Book Labor step can
  coexist with **no validator and no warning** — a timer runs once, so the
  second of the two finds nothing to do. Component notes above.
- **The assignment control's shape is DERIVED from cardinality** (§30.23,
  2026-09-17). `per-wotype` → checkboxes + Done, clash refused at the click;
  `per-group` → **radios that replace and close**, plus a **None** row. One
  writer from the group side (`groupAssignPick()`) — it must never call
  `toggleAssign()`/`openAssign()`, which is the gallery-side control and is
  what produced the phantom second popover. Pinned by test.
- **The out-of-flow zone is "More", not "Reference"** (§14.8 renamed it) — moving a
  node in **clears Required and both gates**. Free Form is the same zone at full
  extent; switching it **on** confirms and dedupes, switching it **off** doesn't.
- **OCTAVE SCOPE: base screens only.** It does not apply to the mobile app
  unless explicitly stated (confirmed 2026-09-16). §23/`eam-shared.css` still
  own the app. **§30.8 catalogues where the two systems differ** — the short
  version: the greys are literally the same HUES primitives (13 tokens match
  hex-for-hex), while every semantic hue differs, mobile has **no `warning`
  and no `info` token at all**, "good" is green on mobile and **blue** in
  Octave, and mobile's 10px radius is not on Octave's scale. No component
  crosses the seam unchanged.
- **Five documented exceptions to Octave** (§30.7), all declared in one place
  so they stay countable: WO Type's four raw hexes and its four SVG glyphs
  (§23.3 needs byte-identical rendering with the device), the emulator keeping
  the **device** palette as `--d-*` tokens scoped to `.emu`, the action-state
  overlay as `::after` rather than a child span, and the fork-wire arrowhead.
- **A mistyped token is INVISIBLE** — `var(--nope)` resolves to nothing and the
  screen still renders. It bit once: the package ships `h-5`/`sub-title-2`, not
  `h5`/`subtitle-2`. `test-workflow-portal.js` now diffs every
  `var(--uxt-theme-*)` against the linked package. **Don't guess token names.**
- **Six capabilities ported from the standalone designer** (§30.9), placed by
  grain rather than all in the panel: the **clone-aware function picker**
  (`BASE_FUNCTIONS`, §26.2) and the **§12 completion trio** are in the
  **banner** (workflow-level — the function decides which steps can exist, and
  §12 is keyed on WO Type with no Group dimension); **grid spans** are in the
  panel; **UDS placement** is a `uds` node kind in the Step Library with a
  **read-only** panel (§27.4 — no add-field, no property menu, ever); **fork
  translations** are in the fork editor; **Time Entry Mode** is per-instance in
  step settings.
- **Capability gaps are REPORTED, never auto-fixed** (§26.5.1). `ZJ1000` is a
  real capability-limited clone and one demo workflow ships on it, so the gap
  path is live on load: library entries disable with the reason, the node
  outlines in error red, a Banner counts them. A **family** switch confirms
  first; a clone switch inside a family does not.
- **`isStepKind()` — a UDS IS a step** (§29.5). It replaced every
  `kind==='step'` test in sequencing, N/A propagation and fork targets, so a
  UDS numbers, gates and gets skipped exactly like a delivered tab. Don't
  reintroduce a bare `kind==='step'` check.
- **Fork text is a language map** (§29.4). Read via `tx()`, write only the
  current slot, `toTx()` migrates a plain string on read. A missing
  translation **falls back and never blanks**; an empty *base* language is the
  one state the editor refuses.
- **§5.2 CHANGED 2026-09-16 — container shape is per-container, not positional.**
  A Grid container can sit anywhere and a form can have several; what survived
  is **nothing goes above container 0** (pinned) and **a Grid cannot be
  Collapsed but CAN be Hidden** (collapsing a two-up grid destroys the point of
  it). Enforced in the setter, not just omitted from a menu. **No mobile screen
  demonstrates this yet** — the canonical reference files still show the old
  leading-grid arrangement, so treat it as authored-but-unproven on device (§20).
- **Designer panel rework** (§30.10): a collapsible **Available fields** sidebar
  (4th column, panel-only, and it is the *complement* of the screen — a field
  leaves when placed, returns when removed), **Add container is a drag source**
  not a button, containers **reorder by header drag**, and the container header
  **right-click** owns display state + To Grid/To List + Rename + Remove. The
  old container button-row and  menu are both gone.
- **WO Record View's Activities container is NOT a field container** (§15.2) —
  it is a single-select record list with its own +, its own Add/Edit popup and a
  per-row completion state. Flagged on the data (`sec.std === false`, derived
  in `normalizeWf()`), marked in the panel, and it **refuses dropped fields**.
  Don't re-derive it by name-matching at a render site.
- **§12 RESHAPED 2026-09-16 (§30.11): status transitions are PLACED, not
  declared.** The Completion Entity / Start Work status / Completion status
  fields are gone; a **Status update action** is dragged into the flow where
  the transition happens (popup: Status Entity + one status, defaults to Work
  Order). The §12 resolution key is unchanged. **An action is not a step** —
  no rail entry, no number, no gate; `seqNodes()` excludes it. It is
  positional, so the More group and Free Form both refuse it, guarded in
  `moveToRef()` at the mutation.
- **Library is `Available screens` then `Actions`** — the Execution /
  Record-tabs headings are gone (they implied a rule §14.8 denies), and UDS
  entries sit in the same list marked by icon.
- **`LAYOUTS.recordview` is the REAL WO Record View** (from a screenshot):
  Header Fields / Work Order Details / Activity / Scheduling / User Defined
  Fields / Custom Fields, with the rest of the real screen in the sidebar.
  Don't replace it with invented fields — the point is that a real screen is
  demonstrably authorable.
- **Buttons are fields** (`type:'button'`) so they carry hide/show behavior.
  They take **Optional or Hidden only** — guarded in `setFieldBehavior()`,
  since Required/Protected/N/A are meaningless for a control.
- **DESIGN DECISION: the Activity container can be HIDDEN, never DELETED**
  (§15.2) — the screen's code depends on it existing, so removing it is a
  broken screen, not a layout choice. It *does* accept fields.
- **NEVER re-render a drag's own container during `dragover`.** That was the
  container-DnD bug: `contDragOver()` called `renderDsn()`, destroying the
  drag source mid-gesture. Toggle classes instead — which is the only reason
  the field drag always worked. Also: a container menu is **right-click
  only** (binding it to `onclick` too made clicking away reopen it).
- Record View instance 1 is **pinned as step 1**, clamped at the array mutation
  rather than only in the drag geometry. Persists to `localStorage.eamWorkflowDefs`.
- **A fork card is a question pill over two answer pills, and its routing is
  DRAWN** — wires measured from live layout, curving through the canvas gutter
  into each destination (`drawForkArrows()`). So the straight connector below a
  fork is suppressed, "continue" resolves to the next *step* (never an adjacent
  fork — `forkBranchTargetNid()`, pinned), and an End chip renders only when a
  fork targets it. The renderer guards on **DOM capability, not box size**: a
  headless rect is non-zero, so a size check alone throws on `createElementNS`.
- **Five smaller calls, 2026-09-17** (§30.22): the condition fork's field
  picker groups options under an `<optgroup>` **container** label (the option
  text is the field description alone; grouped on the container *index*, so two
  same-titled containers stay apart); a condition fork's ⋯ menu is a **fork**
  menu — it used to fall through to the step menu and offer Screen Designer,
  Rename, Step settings and Move to More, so **use `isForkKind()`, never a
  bare `kind==='fork'`**; **WO Type** moved under Description and carries its
  §23.3 colour/glyph in the control (`woTypeBadge()`), with the function
  taking its old wide column; the canvas bar's **"Close designer" pill is
  gone** — the panel's own ✕ is the one affordance; and the UDS demo labels are
  **`UDS Tab 1/2/3`**, since three plausible names read as three shipped
  screens.
- **Designer panel is 40%, drag-resizable, width persisted** (`eamWfpDsnWidth`),
  floored at a real 390px emulator. **More sits under the flow at the same
  width**, not beside it. **No `text-transform:uppercase` anywhere in this file**
  (§30.4) — note `eam-shared.css` still upper-cases the device's own More label,
  deliberately not synchronised.
**FOUR AREAS, ONE MEMBERSHIP TABLE** (§30.13/§30.14, added 2026-09-16). Three
rail rows under **Mobile configuration** — Workflows, Home Layouts, Offline
Profiles — plus **User Groups under Security**, which is where it belongs: a
group is a security object, created there, and this area only ever *binds*
(§26.5.1). All four are areas of this one file; the rail listed User Groups
twice until 2026-09-16.
- **`ASSIGN` is the ONE store**: a flat `{type, artifactId, group}` array read
  only through `groupsOf()` / `artifactsForGroup()` / `isAssigned()`. **Never add
  a per-artifact `assignments` array back** — that is what `w.assignments` was,
  and with four artifact types it becomes four arrays free to disagree with each
  other and with the group view. A test asserts both directions return the same
  rows; if that fails the area is decoration.
- **`ARTIFACT_TYPES` declares cardinality**, and the rule text a user reads is
  *derived* from it — `per-wotype` for workflows (§11 resolves on *(WO Type,
  group)*), `per-group` for the rest. Don't hardcode a cardinality sentence.
- **Deleting an artifact drops its membership rows** (`dropAssignmentsFor()`) —
  a row pointing at a deleted artifact is a group silently provisioned with
  nothing.
- **Offline Profiles** authors §2.7's per-entity registry: **four** policies
  (reduced from five 2026-09-18), each **defined at the point of choice**, and
  labelled on the **capability** axis — Online only / Offline read / Offline
  read/write / Offline read/write — external. *Who decided this is on the
  device* is the line beneath each label, not the label. **`reference` and
  `on-demand` merged into `offline-read`**: a kept record lands in the same
  store a dataspy-matched one would, so provenance is a **column, not a class**
  (§2.6 generalised). Two things that bite — read-only is a property of the
  **entity**, not of how a row arrived; and `POLICY_MIGRATE` is load-bearing,
  since `normalizeProfile` would otherwise fall a stored retired key back to
  `server-only` and silently stop shipping it. What `reference` was really
  carrying was **Tier 0** (layouts, UDS definitions, code domains) — that is
  where "ships whole, unfiltered" lives, and it is not a per-entity policy.
  **Whether a dataspy is REQUIRED is arithmetic against the caps, never a
  description** (2026-09-18): an entity may ship its whole domain when the whole
  domain fits the per-entity row cap **and** the volume budget; otherwise a
  dataspy is required and must itself fit. Both dimensions bind on real rows —
  Parts on rows, Equipment on volume (40,000 rows ≈ 625 MB against 500 MB) — so
  **a records-only rule passes every check and still overflows the device.** Two
  description-based versions were tried and removed; don't reintroduce a
  `bounded` column, and don't derive the rule from whether a dataspy happens to
  exist. The test that keeps it honest is **cap sensitivity**: move the cap and
  the verdict must move. Counts are server-supplied, refreshed on demand
  (§30.16's shape). Caps are **protected**: they are
  platform limits, not profile preferences, so raising one would only move the
  failure from authoring time to the technician's morning. Still shown
  (200,000 / 50,000 / **500 MB** / 15 / 1 — §2.7's market figures plus the
  design doc's SLO-8, added as a cap 2026-09-18), because a budget you cannot
  see is not a budget — and **two of them are now computed against**, with an
  over-budget total reported on the cap it breaches rather than in a banner. `server-only` shows as a decided-out state, and
  **"all records" is refused** — a filtered policy with no dataspy is an error, not a default.
  Tier 0 + the outbox render first on every profile, **including `None`**, which
  is valid and informational. **11 of its 31 entities have no policy decision**
  and are listed **out of the grid**, at the bottom of the screen (§30.14) —
  listed rather than dropped, since a removed row silently keeps its seeded
  policy. Don't quietly default them in. Dataspies are
  *selected* here and **authored on the record list screen**, same boundary as
  UDS definitions.
- **Home Layouts is THREE levels** (§30.16, reworked 2026-09-16 against
  `existing_use_cases/EAM.DUX.REQ.DigitalWorkHome.docx` — the product's own
  requirement, whose setup screen **Digital Work Home Setup** is the admin
  surface §9.4 had logged as "not yet located"). Layout ▸ **section** ▸
  placement, plus the pinned Create control's contents. A global tile catalogue
  holds **tile ids, never copies**, so editing a tile reaches every layout using
  it. Only the *layout* is assignable.
  - **The section lives on the LAYOUT, never on the tile.** A section column on
    the tile would pin one tile to one section everywhere it appears, killing
    the reuse §30.13 exists for.
  - **Insert Mode is a FLAG on a tile, not a kind** — the product's own
    checkbox, drawn as a `+` badge. A flagged tile drops **only** into the
    Create control; an unflagged one **only** into a section. Both directions,
    guarded in the drop handler *and* in `normalizeHome()`. The rule is §9.4.1's:
    Home's tiles mean "go look at a list", not "start a new record".
  - **The count is SEPARATE from the dataspy.** Dataspy = where it goes; a SQL
    statement = what the badge says. `>= 1000` renders `999+`; a statement
    returning **0 renders no badge at all**. Counts refresh on demand, not live.
  - **The editor WRAPS at `HOME_FOLD = 3` where the device scrolls sideways** —
    because HTML5 DnD does not auto-scroll a container, so a tile past the fold
    would be undroppable. Three is arithmetic (390 − 28 padding, 100px tiles,
    10px gaps), so **line one is what the technician sees without swiping**, and
    the editor draws the fold.
  - **Favorites is the TECHNICIAN's row** — built from their own starred
    dataspies. `showFavorites` positions/toggles it; the admin can never fill it.
  - **A layout with no tiles falls back to the STANDARD MENU**, not a blank
    screen — so it reports as info, never a warning.
  - **A tile whose screen is not in a group's menu is SILENTLY DROPPED by the
    product** (§30.17). `allHomeGaps()` is the only place that is visible.
    Reported, never auto-fixed. **Key it on `targetScreen()`, not the raw
    target** — a create target is an insert mode *of* a screen, and getting
    that wrong reported every create tile as hidden (the §29.7 shape again).
- **User Groups is the inverse view**, and a **binding surface** — assignment
  only. `effectiveFor()` distinguishes explicit / inherited / unset, and
  `allConflicts()` is what the rail badge counts. **Create refuses here**: a user
  group is made in Security ▸ User Groups.
- **Home's CONTENT is still unlocked** — §30.13 locks the authoring mechanics
  only. The demo tile set is a demo; don't read it as deciding a technician's
  Home screen.

**THE BASE TRACK IS THIS PORTAL AND NOTHING ELSE** (user direction 2026-09-16:
*"Desktop UI is completely out of scope for this project. It is just the Mobile
App and this portal now. Total."*). `eam-base-desktop-ui-prototype-v1.html` is
retired to `old versions/` — a **scope** call, not a quality one (§21/NG9). Two
consequences: **"restyle onto the Base/Desktop UI components" is no longer a fix
for anything** — it was the standing answer to the two-visual-languages problem,
which is now closed twice over (§30.9 removed Screen Designer's surface, this
removed the other language entirely) — and the four departures from base plus
its banner/header split were never promoted into the spec **on purpose**, since
a spec section for an out-of-scope surface is exactly the doc debt §21 prevents.
Don't mine that file for patterns without re-opening the scope statement first.

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
§23 owns the instrument set and its rationale — **don't re-derive it here.** The
shape: 2 core instruments (status, sync) plus 3 narrowly-scoped additions —
editable-pill fill (§23.2), WO Type colour + icon badge (§23.3, reused
identically across the Type field, WO List row and step rail) and Priority High
(§23.4). Purple is retired as a UI-state accent; mono is identifiers-only and
never tinted; icons/chips are outlined except Priority Critical/High and WO
Type's badge. Counter badges take the Organization pill's recipe (§23.5).
**Green is reused, never re-invented.** Home is the one named exception.
Back buttons navigate for real on every screen (§24); every sync icon opens the
shared panel. **One open item:** "Not Free Form" (configured but ungated) has no
rail signal of its own (§3.2.2/§15.4) — a different axis from the rail's WO Type
cue, which distinguishes configured vs. the §11 fallback.

### Dev/demo tooling
No design-doc entries — dev convenience, same as any other. **The top
`.proto-theme-bar` banner is GONE from the app screens (§31.6, 2026-09-21)** —
a visible dev banner was the most obvious "this is not an app" tell. The three
controls (**Dark/Light, Offline/Online, Reset demo**) are now rows in a header
menu under a `Prototype` label, **self-injecting** via
`injectProtoMenuGroup()`. They land in the **profile menu** where an avatar
exists and the **record ellipsis menu** otherwise — two homes because §4.2
gives the nav bar one slot, so no control is on every screen. A screen adds its
own row with `PROTO_MENU_EXTRA` (same optional-global shape as
`TAB_PLUS_HANDLERS`); **Book Labor's timer toggle and the WO Equipment tab's
row-tap toggle both use it, and both are load-bearing** — the first drives
§18.2's booking-pull-up condition, the second is the open `chooser`/`split`
experiment. `ensureProfileMenu()` injects the §4.3 dropdown beside any
`.nav-avatar` that lacks one (this is how WO List got a real menu instead of a
"coming soon" toast). **Four screens keep the banner** because they have no
header menu at all — Login, the two component-reference pages, Equipment List
and Sync Status; the last two are a §20 item. The actual reset,
`resetDemoState()` in `eam-shared.js`, clears all demo `localStorage` keys and
runs on Log In. The online/offline control is a 3-way cycle (Offline → Online →
**Synced**, `toggleDemoOnline()`) — Synced forces the nav-bar sync control green
regardless of `SYNC_DEMO_ITEMS`' own seeded error rows, so a live demo doesn't
sit on "Error". **Defaults to Synced**; flip it by hand to see the real outbox
state.

## Open / deferred work
**Don't re-audit — everything open is already tracked.** `design-decisions-v3-1.md`
§20 is the full list; the design doc's **Open issues** holds the subset that
blocks a milestone, with a proposed next step each. Below is only what a
prototype session trips over, one line each.

- **`WSJOBS` reuse vs. a new standalone mobile function — DECISION REQUIRED**
  (reopened 2026-09-11). Needed before any base-side layout authoring, since
  every layout row, dataspy and permission set keys to the resolved function.
  §11/§20.
- **A new Equipment screen function that renders by equipment type is required**
  and unspecified — the function, its `PLO_PAGENAME` mapping across the four
  system types and their clones, and the Screen Designer surface for them.
  **Blocks the Equipment track.** §20/§26.8.
- **The `*` default group has no model** — the User Groups area is built, but a
  wildcard row is a different shape from a named group: under one-per-group
  cardinality it *always* collides unless the resolver reads it as a fallback
  rather than a member. §30.18.
- **What happens to in-flight work when an assignment is removed** — the
  membership table makes removal one click from either side, which raises the
  question harder than §26.5 did. §29.5's config-version stamp is the mechanism;
  nothing joins them up. §30.18.
- **The punch-list dataspy selector still has no home** — User Group Setup is
  retired and the portal's User Groups area is a *binding* surface, so this
  would be its first configuring control. Keep it separate from the offline
  profile's per-entity dataspy (§30.14), and keep its output distinguishable
  from a manual pin. §20.
- **§2.7 narrows offline capability vs. the SHIPPING product — DECISION
  REQUIRED.** It puts equipment/WO history and meter readings in `server-only`;
  the live product downloads both. Either communicate the regression or give
  §2.7 a **bounded** carve-out (last N), never unbounded history. §20.
- **11 offline entities have no policy decision** — marked in the registry and
  warned on, which is not the same as decided. Main Isolation Tables and
  Inspection Results deserve deliberate calls. §20.
- **Insert Mode Type pill** — a 3rd pill that re-renders Insert Mode's own
  layout per selected Type, the §11–§13 mechanism live inside the sheet. Not
  scoped. §9.4.
- **Insert Mode's Equipment Type pill is missing `Location`** — the pill is the
  **system type** (answered, §26.8), but it offers only Asset/Position/System and
  `saveInsertRecord()` still stores it as `class`, which no list filter selects.
  A real defect, since insert is the only place system type is ever set. §20.
- **Home's system-action entities** — the Create menu covers WO/Equipment only;
  Meter Reading, Work Request, Operator Checklist are candidates, each needing a
  call on full-Insert-Mode vs. action sheet. **The admin surface half is now
  built** (§30.16 — the portal authors the Create control's contents), so what's
  left is the per-action shape call. §9.4.
- **Conditional field rules** — Phase 4+, deliberately deprioritised. **Don't
  pick a tier**; the only thing owed up front is the two one-way doors
  (`resolveFieldState()` seam, declared-vs-effective split). §13.1–§13.4.
  **ONE narrow entry was made 2026-09-16 — the condition fork (§30.19) — and
  it is ROUTING ONLY.** It changes no field's state and adds no seam. Don't
  read it as Tier 2 being adopted, and don't cite it (or §29's question fork)
  as precedent for field-level rules. What it did settle: §13.4's
  verification is paid — the customer's export has **no** condition-shaped
  column, and base's only such mechanism (`FTB_SQLEXIST`) is unused
  server-side SQL, so there is no base paradigm to extend.
- **WO Equipment tab row tap** — `chooser` vs. `split`, both built,
  live-switchable from that screen's dev toggle. Needs a device. §20.
- **Equipment Record View's routed-in record is an identity overlay** — deep
  content (Comments/Documents/all 7 child tabs) is still the demo record's. Needs
  per-asset records in `data/equipment.js`; only 00067333 and BLDG-A exist. §20.
- **Issue Parts is on hardcoded parts data** — not wired to `data/parts.js` /
  `parts_stock.js` / `wo_parts_lines.js`.
- **Sort is missing from each list screen's Search sub-screen** — markup gap
  only; the shared sort sheet already re-renders both. §20.
- **`eam-wo-reference-tab-prototype-v1.html` has a stale filename** after §14.8's
  rename, and a same-named copy of the WO List file sits in `old versions/`, so
  doc references to it are ambiguous. §20.
- **@mention tagging in Comments** — not built; Notifications' `comment_mention`
  type is a forward reference. See the `project_comment_tagging_circleback` memory.
- **Profile Picture** — the tech's own avatar; today's nav-bar icon adds no real
  value on mobile. Explored in `mockups/record-photo-section-equipment-and-
  profile-options.html`; nothing promoted. §16.9.

## Prototype conventions
- Each prototype is one HTML file per screen, loading the two shared files
  above plus CDN-hosted fonts — no build step, no bundler, no other
  external dependencies.
- Reference screenshots for visual matching are in
  `prototypes/reference-screenshots/`.

## Working style
- **Flag any request that conflicts with a locked rule** before acting on it.
- **A new design decision goes into `design-decisions-v3-1.md` the same
  session** — don't let the spec lag the prototypes. A new *requirement* or a
  changed sequence goes into the design doc instead.
- **Keep this file a current-state snapshot, not a changelog.** Rationale and
  history belong in the spec; requirements and plan belong in the design doc. It
  loads every session, so length here is billed on every task. Trimmed
  2026-09-11 for exactly this reason — don't grow it back with narrative.
- **Token economy:**
  - Grep for the section/pattern you need. Don't read the spec or a 1,000-line
    standalone end to end.
  - Don't re-run the conformance audit "just to check" — it ran once; add
    anything new to §20.
  - New generic component → `eam-shared.css`/`.js` by default. This is the real
    fix for "why did one change touch three files."
  - Fix a bug at its source — the shared file, or the canonical reference file
    everyone copies from — not in every screen that shows it.
