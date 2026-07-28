# Component Library — human-readable reference (v1, 2026-07-21)

## Purpose

This is the "what is this thing called, and what are its rules" doc —
browsable by **proper name**, not by CSS class. `docs/design-decisions-
v3-1.md` is still the authoritative source for the actual rule text (this
doc points into it by section number rather than restating it);
`docs/ui-component-inventory.md` is the lower-level, CSS-class-keyed
static audit this was partly built from. This doc's job is different from
both: give every recurring on-screen pattern one name everyone (including
a future session) can use, so "I feel like the Equipment picker is
inconsistent" turns into "compare the Equipment Lookup Sheet against the
Equipment Reference Card," not a fresh re-investigation each time.

**Convention going forward:** when a component gets named, audited, or
resolved, add/update its entry here. When a screen shows something that
doesn't have a name yet, name it here before writing about it anywhere
else — that's the actual fix for "I can't tell if these two things are
supposed to be the same component."

Each entry: what it is, every screen it appears on, its actual current
rules (visual + behavioral), and any open inconsistency — flagged
explicitly rather than silently documented as if it were settled.

---

## Field Grid Container

**Where:** the "Header Fields"/"Non-nullable Fields" box (§5.2) — any
screen's `.section-card > .equip-attrs` (or equivalent), a 2-per-row grid
of `.attr-item` cells. Real consumers: WO Record View, Equipment Record
View, Insert Mode (WO/Equipment), the Activity Edit popup,
`screen-layout-field-behavior-prototype-v1.html` (canonical reference).
Distinct from a Collapsible Container (below) — this one has no header/
chevron/toggle; it's a fixed, always-visible grid holding every
non-nullable field on the screen.

**Rules:** 2-per-row by default; a lone full-width field
(`.attr-item.full-width`) spans the row — Notes/Description is always
pinned first and full-width, Long-text always trails last and
full-width. No section-card header of its own — the fields sit directly
on the card. Membership doesn't imply required; a required field inside
still gets its own left-bar treatment on just that cell. See §5.2's
"Header Fields / Non-nullable Fields" and "Grid vs. List field-type
consolidation" rows for the full rule set, and
`screen-layout-field-behavior-prototype-v1.html` for a live example of
every field type inside one.

---

## Collapsible Container

**Where:** `.fg-section`/`.fg-toggle-row`/`.fg-collapse` — the
expand/collapse shell used by every field-group section that isn't the
Field Grid Container above: Equipment's Asset/Equipment/Tracking
Details, Custom Fields, Insert Mode's flat-fields section, and the List
half of `screen-layout-field-behavior-prototype-v1.html`'s reference
(fields there render as `.form-field` rows, not `.attr-item` grid
cells).

**Rules:** has its own header (title + chevron), plus an optional
required-count badge via `updateRequiredBadges()` (inserted before the
chevron so the chevron stays at a fixed x-position whether or not a
badge shows). All Record View sections start collapsed except the first
(§5.2). Fields inside render as plain `.form-field` List rows, one per
line — the "List" half of every Grid-vs-List field-type rule below.

---

## Field Types (category term, not a single component)

**13 named field types**, each with a resolved Grid-container
(`.attr-item`) vs. List-container (`.form-field`) rule, locked in
design-decisions-v3-1.md §5.2's "Grid vs. List field-type consolidation"
row. Canonical live reference:
`screen-layout-field-behavior-prototype-v1.html` — one example of each,
shown in both containers side by side (14 examples total; LOV — Code +
Description is demoed twice, once generic and once identifier-shaped,
since both are the same type).

| Field type | Grid rule | List rule |
| --- | --- | --- |
| Notes / Description | Always full-width, pinned first | No-op (List rows are already full-width) |
| Badge / Icon LOV | Standard Type/Priority-style badge | Icon leads, grouped right via `.field-badge-inline` |
| LOV — Code Only | `.attr-text.mono`, 24px, line-height 1 | `.field-value.mono`, standard 14px |
| LOV — Code + Description (a.k.a. "Identifier") | Description-over-code (`.attr-lov-stack`) | Code-over-description (`.field-lov-value`, pre-existing order) |
| Inline Text | `flex:none` — grows taller instead of clipping | Same |
| Currency | `type="text"` + `inputMode="decimal"` | Same |
| Number | `type="text"` + `inputMode="decimal"` (matches Currency) | Same |
| Date | Custom calendar sheet | Same |
| Date/Time | Custom calendar sheet + native time row | Same |
| Time Only | Right-aligned (iOS rendering is a known platform limit) | Right-aligned |
| Checkbox | Dedicated right-hand zone row (`.checkbox-zone-row`) | Whole row is the tap target |
| Protected | `.attr-item.protected`, lock icon on the label's own row | `.form-field.protected`, lock icon beside the value |
| Long-text | Always full-width, trails last; collapsed view honors line breaks | No-op; collapsed view honors line breaks |

---

## Equipment LOV

**Decided 2026-07-21 (user direction):** what used to be two divergent
pickers — WO Record View's full two-tab lookup and WO Insert Mode's
lighter generic LOV — are now **one component**, named **Equipment LOV**.
Insert Mode was converged onto Record View's richer behavior, not the
other way around.

**Where:** WO Record View's own Equipment field, and WO Insert Mode
(reached via WO List's Create (+) or Home's Create bar) — both now call
the same shared `openEquipmentLookup(key)` (`eam-shared.js`), tabs/CSS
promoted to `eam-shared.css`/`.js`. Markup (`#equipmentPopup`/
`#qrScanOverlay`) still lives per-screen, same convention as `#lovSheet`/
`#dateSheet` — only the CSS/JS/data behind it is shared.

**What it is:** Tapping the field (`.equip-summary-card` on Record View,
`.equip-card` on Insert Mode) opens a full two-tab picker:
- **Search tab** — a local fork of the §8.3 List Search Screen standard:
  dataspy bar (inert stub), Detailed/List toggle, search bar with a QR-
  scan icon (`.equip-search-scan-btn` → `openEquipScan()`, mock
  viewfinder only, no real camera), 3 inert filter chips, inert sort.
  Substring-matches description+code. Tapping any result commits and
  closes immediately, like any LOV.
- **Structure tab** — an interactive Location→Position→System→Asset tree
  (§7.4/§15.5). Tapping text focuses/highlights and reveals an inline
  "Select" button; tapping the trailing caret expands/collapses. Only the
  inline "Select" button commits — text-tap alone does not (the "Option B"
  disambiguation).
- **Default tab on open:** Structure (badged to the current node) if
  Equipment is already set; Search if it's unset — this now correctly
  applies to Insert Mode too (starts on Search, since nothing's picked yet).

**How a screen wires into it:** two ways, both live —
- **As a `REF_CARD_FIELDS` key** (Insert Mode) — set `useEquipmentLookup:
  true` on that key's config; `renderRefCard()` and `commitEquipmentSelection()`
  already route through it.
- **As a plain record field** (Record View) — the screen calls
  `openEquipmentLookup('equipment')` itself and supplies two small hooks,
  same shape as `LOV_ON_SELECT`/`DATE_ON_SELECT`:
  `EQUIP_LOOKUP_CURRENT`/`EQUIP_LOOKUP_ON_SELECT`.

**On-field display still differs, deliberately out of scope for this
convergence:** Record View shows `.equip-summary-card` (icon + desc/code/
type), Insert Mode shows `.equip-card` (headline/subline/attrs). Only the
*lookup/picker* behavior was unified, per the user's own framing of the
ask — the on-record card's look was not part of this decision and stays
as its own open question if it ever needs revisiting.

## Equipment ID Badge (separate — not part of the Equipment LOV)

**Where:** Activity Checklist (`eam-activity-checklist-prototype-v1.html`,
`.item-equip`, e.g. lines 501/548/593; CSS `eam-shared.css` local block
108-112).
**What it is:** `<span class="item-equip">A-00067333 — Pump, Centrifugal
</span>` — **read-only, no `onclick` at all.** Not a picker, not a variant
of the Equipment LOV — a plain identifier label on a checklist item that
happens to concern a specific asset. Confirmed by user direction (2026-
07-21) to stay a distinct, separate component — not something to converge
with the LOV.

**Not present at all:** Issue Parts and Book Labor have no Equipment
field of any kind. Equipment Record View never picks a *different*
Equipment — it's always the anchor record there.

---

## Entry Row (category term, not a component)

**Locked 2026-07-24**, closing the naming-drift punch-list item
(design-decisions-v3-1.md §20): "the app has no single term for a
multi-field record inside a selectable/expandable list." Started as a
naming-only fix across 3 screens' independent implementations — but
hours later, same day, direct user decision turned 2 of the 3 into a
real merge (see **Action Row** below). Entry Row survives as the
umbrella category, now covering exactly 2 members:

| Concrete name | Class | Screens | Relationship |
| --- | --- | --- | --- |
| Activity Row | `.act-item` | WO Record View's Activity Selector | Its own separate exception — radio-select, no per-row action button, deliberately NOT merged (user call) |
| Action Row | `.action-row` | Issue Parts, Book Labor | A real shared component (`eam-shared.css`/`.js`), not just a shared name — see its own entry below |

Activity Row stays genuinely different in shape (a selectable record,
not an actionable one) — nothing here proposes converging it with
Action Row.

---

## Action Row

**Locked + built 2026-07-24 (user direction)**, `eam-shared.css`/`.js` —
real 2-consumer shared component, not a category name. Started as
"Labor Row" (Book Labor) and "Part Card" (Issue Parts), independently
built, flagged as naming drift; the user's own framing on revisiting it
— "detailed row with multiple fields and a single action button unique
to that row, real difference is the button is collapsible" — turned it
into an actual merge. Explored first via a 3-option comparison mockup
(`prototypes/standalone/mockups/entry-row-part-labor-consolidation-
options.html`) before landing on the shape below.

**Interaction paradigm — the reason for the name:** tapping an Action
Row never navigates to another screen or opens Update Mode, unlike the
standard List/Detail row-tap rule (§8, "row tap → that record's own
Record View, in update mode"). It expands in place and transacts via
its own action button(s) instead. This isn't updating the record, it's
*taking action* on it. Action Row only ever appears on a "function" tab
(Issue Parts, Book Labor) — every other list/detail screen in this app
uses the standard search-list-screen pattern (§8.3) instead, whose rows
*do* drill into Update Mode.

**Anatomy:** description (bold) on top, code (mono, muted) directly
beneath it. Supporting fields render as labeled, mono chips, always
visible — UOM/Store/Bin for Issue Parts, Date/Trade for Book Labor (the
latter converted from an unlabeled "date · trade" string to match).
Badge (right side) stays screen-specific and deliberately unconverged —
Issue Parts' `.qty-badge` is an outline pill ("planned, not yet
issued"); Book Labor's `.labor-hours-badge` is a filled green/red pill
("regular vs. correction") — different semantics, not styling drift.
Tapping the row (`toggleActionRow()`, generic/DOM-relative — no
index-based ids) reveals a read-only detail area (`.action-detail-grid`)
with the action button(s) at the very bottom (`.action-row-actions`,
a real multi-button row now — see "Modify" below). An optional
persistent left accent (`.action-row-accent`) exists for a consumer
that wants one — Issue Parts' issued state uses it; Book Labor doesn't.

**Modify — locked standard, 2026-07-24:** if the Action Row's underlying
entity supports updates to its own master data (not just the row's
primary transactional action), it gets a **Modify** button in
`.action-row-actions`, alongside the primary action button. Modify
invokes the *same* add sheet a technician would use to create one of
these from scratch, pre-filled with the selected record's current data,
header swapped from its "Add X" title to "Modify" — a sheet, not a
screen, so this still honors the "never navigates away" interaction
paradigm above; it isn't a second exception to that rule, it's the same
rule applied to a 2nd button. **Issue Parts qualifies:** a part's Store/
Bin/Lot/Qty are real master fields, not just a transaction, so all 4
parts get Modify next to Quick Issue/Return (`openModifySheet(partId)`,
reuses `renderAdHocSheet()`'s "part already selected" path, defaults the
segment to Planned rather than Issue so opening Modify doesn't silently
re-issue the part). **Book Labor does NOT qualify:** booked labor is
immutable after booking, correction-only (§18.3's locked "no Edit"
rule) — there is no update to invoke, so no Modify button there, and
that's the correct/expected outcome of this same rule, not an
inconsistency.

**Not merged:** Activity Row (see Entry Row above) — different shape,
no action button, explicit user call to keep it separate.

---

## Activity Selector

**Where:** WO Record View only (`eam-wo-record-view-prototype-v1.html`,
`.act-item`, lines 737-754). Governing spec: §15.2.

**What it is:** A single-select radio list of the WO's Activities — the
list itself is the Activity Selector; each individual entry inside it is
an **Activity Row** (`.act-item`), decided 2026-07-21. Not a badge — a
badge in this app's vocabulary (Equipment ID Badge, `.org-pill`,
`.qty-badge`, `.hours-type-pill`) is a small, mostly-static label, icon
plus a few words at most. An Activity Row is a full multi-field record
(number, name, discipline, date, up to 2 codes) with selectable state —
the same general **Entry Row** category as **Action Row** (see above),
but deliberately not merged into it: Activity Row has no per-row action
button and is chosen (radio-select), not acted upon.

Each row shows a radio circle, Activity number, Name, Discipline, and a
meta line (Date + Code1 + optional Code2). Tapping a row (`selectActivity()`)
sets `RECORD.selectedActivity`, marks the record dirty, toasts "Activity
selected," and calls `updateStartGate()` — the bottom bar's Start gate is
locked until an activity is selected.

**Auto-selection rule:** exactly one Activity auto-selects on load if
there's only one in the array; 2+ Activities leave the list unselected
until the technician taps one.

**Edit popup:** a pencil icon opens `#activityEditPopup` (a `.hyperlink-
popup` variant) scoped to the *currently selected* Activity only — toasts
"Select an activity to edit" if none is selected. Editable: Name (text)
and Discipline (chip picker). Read-only inside the popup: Date, Code1,
Code2 (each hidden entirely if null, not shown blank).

**Empty state:** "+ Add Activity" row; tapping it toasts "Create
activity — coming soon" — no real create flow exists yet.

**Naming collision, flag only, not a bug:** design-decisions-v3-1.md §20
has an unrelated, unbuilt punch-list row named "**Activity Screen**"
("Timer, task plan reference, assignment status. Ref: Activity_Selector
.png") — that screenshot's filename collides with this component's
obvious name, but the two are different things: this entry is the
*picker* (built, §15.2); the §20 row is a *separate future screen* (a
per-activity detail view with a timer) that doesn't exist yet. Use
"Activity Selector" for this component and "Activity Screen" for the
unbuilt one — don't conflate them in future writing.

**Open gap, not yet addressed anywhere:** once a technician moves past
WO Record View into Activity Checklist, Issue Parts, or Book Labor, none
of those screens shows which Activity is currently in scope, and no
mechanism (session storage, URL param, or otherwise) for carrying
`selectedActivity` forward into them was found in the code. Fine today
because every demo WO has exactly one Activity (which auto-selects), but
undefined behavior the moment a WO has 2+.

---

## Booked Labor List

**Where:** Book Labor only (`eam-book-labor-prototype-v2.html`). No other
screen (including WO Record View, checked directly) shows any summary of
booked labor — this list is the only place it's ever visible.

**What it is:** Seeded for real from `data/wo-19257.js`'s `labor` array
via `renderSeedLabor()` — not hardcoded HTML. Each row is now a real
**Action Row** (`.action-row`, see that entry above — converged with
Issue Parts' equivalent 2026-07-24) — a tap-to-expand header
(`toggleActionRow()`, shared) over a detail grid: Type of Hours,
Department, Trade, Start, End, Hours.

**Correction, not Edit:** a booked row has exactly one action —
"Create correction" — which opens `#correctionSheet` and, on save,
appends a **new** reversing row (`.action-row.correction`) rather than
editing the original (§18.3's locked "no Edit button" rule). **Known
simplification,
worth flagging explicitly:** the correction sheet's employee/hours-type/
department/trade/duration are all hardcoded to fixed demo values
(`saveCorrection()`, a fixed -83 min correction) rather than real fields
a technician fills in — the always-ready red Save button is intentional
(§18.6 — a correction is deliberate, never gated), but the sheet's actual
*content* being non-interactive demo data has not been separately called
out as a gap before now.

**Sort/grouping: none.** Rows render in insertion order only — seed data
first, then anything newly booked or corrected appended at the end.
Chronological or by-employee sort would be the obvious real-app choice
but isn't specified or enforced anywhere in code; flag as an open
question if this list is ever expected to hold more than a couple of
rows in a real deployment.

---

## Notification Card

**Built 2026-07-22**, `eam-notifications-prototype-v1.html` — single
consumer so far, named here anyway since "notification" is exactly the
kind of word that invites reinvention later without a name to check
against. An icon-in-circle (type-based, monochrome-outlined per §23, no
per-type hue) + subject/body/reference row, in a `.notif-card` shell
(screen-local, same `.ld-card`-adjacent shape as the rest of the app's
card components but not actually the same class — this one has no status
pill, no org badge, and a per-row dismiss control none of the `.ld-card`
family has).

**Reference row (revised 2026-07-22, user direction):** `{date} · {time}
| Work Order {number}` — the record number stays mono (identifier), the
surrounding words don't. `time` sources from `data/notifications.js` in
this app's actual numeric-date standard (§3.4), not Comments' older
spelled-month convention.

**Read/unread is ink weight + a fill dot, never a color** (§23 — it's not
one of the 3 instruments): unread = bold subject + filled dot; read =
normal weight, no dot. Tapping a card marks it read and, if it carries a
`wo`, navigates to that Work Order via the exact same §24 rule 3 demo-WO
fallback `eam-wo-list-prototype-v5_1.html`'s `openWO()` already
established. The per-card ✕ dismiss is gated behind the shared
`openConfirm()` modal, same as every other confirm-before-destructive
action in this app — its message explicitly says the source record is
unaffected, since a technician's first guess at what "dismiss" does to a
*notification* card could reasonably be "this deletes something real."

See `design-decisions-v3-1.md` §25 for the full write-up, including the
real R5MAILEVENTS-modeled data (`data/notifications.js`) and the flagged
read/unread persistence gap (that table has no such column in the real
schema).

---

## WO Type Colour + Icon Badge

**Built 2026-07-28** (design-decisions-v3-1.md §23.3), picked from
`prototypes/standalone/mockups/wo-type-badge-color-icon-options.html`.
One icon + one curated colour per WO Type (Breakdown/Preventative
Maintenance/Routine, plus Corrective as a worked custom-Type example),
reused identically across the 3 places a technician actually reads Type —
only the badge *shape* changes by surface:

- **WO Record View's Type field** — solid fill, `.attr-badge-fill`.
- **WO List/Search row** — a small solid dot, `.wotype-dot` (a full badge
  is too heavy for a dense card/table row).
- **Step rail** — colour only, no icon in either shape's *edge*, but the
  icon itself does appear here too, split by the rail's own two real
  states: a real configured workflow gets a left-edge colour bar +
  `.step-rail-type-icon`; the §11 free-form fallback gets the same icon
  inside `.step-rail-type-circle` instead, no edge bar — the circle shape
  doubles as the workflow-vs-free-form cue that rail previously had none
  of.

**Colour is curated, never a raw admin hex** — same 6-swatch set scoped
for Screen Designer's future WO Type colour picker (`--wo-type-*` vars,
`eam-shared.css`), excluding green/red (§23's reserved instruments).
Reverses the 2026-07-22 "Type has no colour" call, which was itself
scoped to the rebuild exercise then underway — see §23.3 for the full
write-up, including the jobType-vs-Type-LOV-code reconciliation
(`WO_TYPE_PALETTE`, `eam-shared.js`) and the Corrective worked example.

---

## Index

| Component | Screens | Status |
|---|---|---|
| Field Grid Container | WO Record View, Equipment Record View, Insert Mode, field-behavior reference | Backfilled 2026-07-28 — always existed as a shape, never had a name entry here (§5.2) |
| Collapsible Container | Equipment Record View, Custom Fields, Insert Mode, field-behavior reference | Backfilled 2026-07-28 — same gap as Field Grid Container (§5.2) |
| Field Types (13, category term) | App-wide | Backfilled 2026-07-28 — locked rules already existed in §5.2, never indexed here |
| Equipment LOV | WO Record View, WO Insert Mode | Converged 2026-07-21 — one shared picker, both screens (§7.4/§15.5) |
| Equipment ID Badge | Activity Checklist | Built, read-only, deliberately separate from the LOV (§16) |
| Notification Card | Notifications | Built 2026-07-22 (§25); single consumer so far |
| Activity Selector (rows = Activity Rows) | WO Record View | Built (§15.2); cross-screen hand-off undefined |
| Action Row | Book Labor, Issue Parts | Merged + built 2026-07-24 (§17.4/§18.3) — real shared component, was "Labor Row"/"Part Card" |
| Booked Labor List | Book Labor | Built (§18.3/§18.6); rows are Action Rows; correction sheet content hardcoded |
| Entry Row (category term — Activity Row / Action Row) | WO Record View, Book Labor, Issue Parts | Category only; Action Row is a real merge, Activity Row stays a deliberate exception |
| WO Type Colour + Icon Badge | WO Record View, WO List, all 5 WO workflow screens' step rail | Built 2026-07-28 (§23.3) — reverses the 2026-07-22 "Type has no colour" call |
