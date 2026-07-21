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
the same category as Book Labor's **Labor Row** (`.labor-row`), not a
label. Worth flagging while naming this: the app already has drifted
terminology for this same category of thing — Issue Parts calls its
equivalent a **Part Card** (`.part-card`), not a row. Not fixed as part
of this naming pass, but real drift if the app ever wants one consistent
term for "a multi-field record inside a selectable/expandable list."

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
via `renderSeedLabor()` (lines 1351-1356) — not hardcoded HTML. Each row
(`.labor-row`) is a tap-to-expand header (`toggleRow()`) over a detail
grid: Type of Hours, Department, Trade, Start, End, Hours.

**Correction, not Edit:** a booked row has exactly one action —
"Create correction" — which opens `#correctionSheet` and, on save,
appends a **new** reversing `.correction-row` rather than editing the
original (§18.3's locked "no Edit button" rule). **Known simplification,
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

## Index

| Component | Screens | Status |
|---|---|---|
| Equipment LOV | WO Record View, WO Insert Mode | Converged 2026-07-21 — one shared picker, both screens (§7.4/§15.5) |
| Equipment ID Badge | Activity Checklist | Built, read-only, deliberately separate from the LOV (§16) |
| Activity Selector (rows = Activity Rows) | WO Record View | Built (§15.2); cross-screen hand-off undefined |
| Booked Labor List (rows = Labor Rows) | Book Labor | Built (§18.3/§18.6); correction sheet content hardcoded |
