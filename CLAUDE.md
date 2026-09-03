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
**Equipment resolves the same way off *system type*, and base already models
it as four screens** — Location/Asset/Position/System, plus clones (§26.8,
2026-08-25). So mobile collapses four base screens into one surface: tap an
asset, then a position, and the record view re-renders under a different
layout without navigating anywhere. Cheaper than WO on the base side (those
four *are* four `PLO_PAGENAME` values — no new column, no new table), and it
answers the old "Insert Mode's Equipment Type vs. Class" question: that pill
is the system type, not a Class. **But the authoring surface for those four
doesn't exist, and that is a blocker for the Equipment mobile track** — don't
build Equipment RV against one hardcoded layout, or every child tab inherits
the assumption. Equipment's system type is **Protected in update mode,
always** — set once at insert, fixed for life — so Equipment has no
re-resolution exposure at all; Insert Mode is the only place it's ever set,
which makes that pill's missing `Location` option a real defect rather than a
cosmetic one (§20). **WO Type protects later, at Start Work** (§13.5, locked
2026-08-25) — editable while not started (confirm → immediate commit →
re-render), Protected from Start Work onward with no exceptions and no
permission escape. Same §5.2 Protected state as Equipment, later trigger; one
paradigm, two trigger points. That one rule replaced a proposed four-tier gate
ladder, closed required-field drift (a re-type is now pre-start only, and Start
Work is itself a gate), and withdrew the §23 required-marker tension — **§23
stands as written, don't re-open it.** It also answers "no Parts tab but parts
were issued?": issuing parts is post-Start-Work by construction, so it can't
arise from mobile. Only residual is base-issued parts on a pre-start WO (§20).

## Locked rules — don't re-derive these
Conclusions and consequences only. **Rationale, rejected alternatives and
revert recipes live in the spec at the § given** — follow the pointer rather
than reasoning it out again. Consolidated 2026-08-25; keep additions here to
this shape.

**Start Work is the commitment boundary (§14.11).** Five things happen at once
and only make sense together: status → Start Work Status, **Type protects**,
**the WO pins to the technician**, **all child records hydrate**, and
(recommended) the **resolved config version is stamped**. Before Start Work a
WO is a candidate; after it, it's this technician's committed work. Two
consequences: starting a WO found by search **is** the Tier 3 → Tier 1
promotion (so a non-hydrated WO probably needs connectivity to start), and it
is the **first device-originated pin** — a local pin must survive a server
membership list that omits it, or the next sync evicts live work (real evidence
for punch-list Option B).

**Function resolution is per user group, never one blessed function (§26.7,
reversed 2026-08-24).** Any function with `FUN_RENTITY = EVNT` may be
workflow-enabled, opted in per **user group** — this customer already runs four
`WSJOBS` clones (CCJOBS/TRJOBS/ZJ1000/WSJODC) as distinct business processes.
§26 is the base-side section: function resolution, bottom-nav slot binding, the
User Group Setup paradigm. *(This was filed under Start Work until 2026-08-25,
where it read as if the commitment boundary had been reversed — it hadn't. It
reverses the "one function, `WSJOBS`, always" half of the `FUN_CODE` note in
START HERE.)*

**Hydration has a Tier 0 (§2.3).** Bootstrap configuration, in front of the
four record tiers and deliberately *not* one of them — records degrade
gracefully (fewer rows = a shorter list), configuration doesn't (a missing page
layout is a blank screen). Order: identity/user group → nav/function resolution
→ **page layout** (+ WO Workflow tables + custom-field defs) → status
authorizations → dataspy definitions → the code domains layout references.
**Layout is first because it scopes everything after it.** Fetched **inside the
login round-trip, not a modal**; persisted, versioned per domain, **exempt from
eviction**. Say **"my open pinned work orders"**, never "today's WOs" — the
punch list is pin/dataspy-scoped and never date-scoped.

**The Tier 2 index is declared, not derived from dataspies (§6.13).** The
governing fact: **dataspies are unbounded** — admin-published plus user-authored,
on any screen with records, and users normally have permission. (Not authorable
*from* mobile — out of scope — but mobile consumes what they made on desktop.)
Three consequences. **1. The projection is declared**: a bounded `Indexed` column
set (~10–20) flagged per field in Screen Designer, a *primary* source with no
computed default — otherwise any saved query reshapes every device's index.
§8.3's card rule is unchanged, but a dataspy touching a **non-indexed** column is
**online-only** and must say so, never silently under-return. **2. A dataspy is a
saved filter, classified — not shipped membership.** The server checks (metadata
only, no SQL run) whether its predicates/columns sit inside the declared set →
offline-capable local query, or online-only via Tier 4. **Nothing per-dataspy
ships**, so switching stays zero-network at any dataspy count, and there is still
**no per-dataspy "delta insert"** (the delta is the index refresh on
`last_synced_at`; per-record fetch only on a Tier-3 demand tap). Membership
shipping narrows to **Tier 1 / the punch list** only. Not a new capability —
§8.3's filter chips already evaluate predicates locally over these columns.
**3. Index scope is its own config** — **not** "All Work Orders" (that's
unbounded history). Open WOs by the lifecycle rule, plus a configured extent,
server-side, parallel to Sync Config scoping Tier 1; deliberately not derived
from the dataspies, or adding one silently changes every device's storage.
**Superseded same day: the union-of-projections default (§21) — don't reinstate
it.** Six open items in §20: the `Indexed` **authoring grain** (§8.5 of the
leadership review argues *function* grain), **no `Indexed` control exists yet**,
the **index scope's shape**, the **normalised on-device criteria form**
classification depends on, whether **membership shipping** still serves
punch-list Option A, and the fact that **both projection numbers are
provisional** — the card's 6 (display only, re-scoped 2026-08-26) and the
index's ~10–20.

**User Defined Screens are scoped, not designed (§27).** A **UDS** is a
customer-authored *screen* — **not** §22's Custom Fields, which are
admin-defined *fields* on a screen the product ships. Don't merge the two
mechanics; a record can carry both. **In: UDS-as-a-tab-on-WO. Deferred:
standalone UDS destinations. Out: UDS field authoring** (base's own UDS setup
owns it — building it into Screen Designer repeats the retired Workflow Designer
mistake). A UDS tab enters §14.8's candidate set **by construction**, takes a
§12 tier-2 row, and **can be a numbered, gated, Required workflow step** — no
new placement model needed. What *is* needed: **one generic definition-driven
tab renderer** (§27.3), never a screen per UDS, following §22's
`applyCustomFields()` pattern at whole-body scope — and sequence it after a 2nd
real child tab exists, since the Equipment tab is a sample size of one.
Authoring is **three-way**: base UDS setup defines → Screen Designer places →
User Group Setup assigns. **The UI is the cheap part; the offline story is the
ask** — four open items in §20.

## Source of truth

### One fact, one home (the rule, added 2026-08-25)
Every fact below has **exactly one owning file**. Other files may *point*
at it; they must not restate it. Changing a fact means editing **one**
file plus, at most, a pointer.

| Kind of fact | Single home |
| --- | --- |
| A locked design rule, and its rationale | `docs/design-decisions-v3-1.md` |
| Open/deferred items, and rejected alternatives | same file, §20 and §21 |
| What to build next, and in what order | `docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` |
| Project status, and anything leadership-facing | `docs/EAM-Dev-Leadership-Review-2026-08-25.md` |
| Relative per-screen complexity | `docs/EAM-Dev-Leadership-Sizing-Appendix-2026-08-25.md` |
| What a UI pattern is *called*, and its rules | `docs/component-library.md` |
| Raw CSS-level component audit | `docs/ui-component-inventory.md` |
| A base-EAM enhancement spec (for the base team) | its own `EAM-DESIGN-*.md` |
| An undecided architecture question, while it is undecided | its own `EAM-DECISION-*.md` — **temporary, see below** |
| Current state of the prototypes | this file |

**Why this rule exists, in one line:** the offline-search summary doc
restated §2.3/§2.6/§6.13, drifted for over a month (it still said Tier 2
held "~8–12 fields" after §6.13 redefined it to 6), and was retired
2026-08-25 (§21). **Don't create a "summary of X" doc where X is already
specified.** If something is hard to find, add a pointer or fix §-numbering
— don't clone the content.

**Corollary for this file:** CLAUDE.md holds the *decision and its
consequence*, plus a `§` pointer — never the full rationale. It loads every
session, so length here is a recurring cost paid on every task.

### PENDING DECISION — the offline architecture is being re-opened
`docs/EAM-DECISION-Offline-Architecture-Options-2026-09-03.md`. **A
deliberate, temporary exception to the one-fact-one-home rule**, opened
2026-09-03 at user direction: it holds one undecided question until it is
decided, then **its content is rolled into `design-decisions-v3-1.md` (and
the leadership review) and the file is deleted** — its own §13 lists exactly
which sections change under each option. Don't let it become a second spec,
and don't restate it here.

What it re-opens: the app is being re-framed **online-first with offline
writes scoped to specific entities**, which inverts §2.1's locked *"UI always
reads from local DB"*. Four options, on one variable — **does fleet-wide
search work offline?** — because every painful Tier 2 item (`Indexed` grain,
dataspy classification, normalised criteria, index scope) is the price of
answering yes. **Recommendation: Option 1**, and §6.1's scoring was rebuilt
2026-09-03 with six added rows, **every one favouring it** (vendor precedent,
un-populatable tabs, UDS dataspy, standalone-UDS-as-server-only, the
replication switch, and whether offline degrades the online path). Option 1 is
a **compound**, not just "delete Tier 2": online-first reads + declared
per-entity policy with caps + reachability traversal + the three lookup classes
+ always-on outbox and Tier 0 + dataspies server-side at full fidelity. **Only
the last line is the actual decision** — everything else is accepted or holds
under every option, so **the meeting decides one thing.** Until it's decided
**§2/§6.13 still govern** — flag the conflict, don't act on the brief.
**Withdrawn 2026-09-03:** the caveat that Option 2 might be the floor for
utility/linear customers. §5.5 answers it from the GIS side — an offline map
area already carries features *and* their related EAM equipment within the
extent, and Search Around already works offline, so offline "what's near me" is
delivered by the GIS replica for GIS-integrated assets under **every** option.
Option 2's residual prize is location search over *non*-integrated records
only. **The two questions that would change the recommendation are product
questions for the advisory group:** how often a tech must find an off-device
record while offline, and whether location search is needed over
non-GIS-integrated records.

**Market practice was researched 2026-09-03 and it backs Option 1** (§8.1 of
that file, with vendor sources and adoptable caps). Nobody — SAP/Sigga,
Salesforce, D365 FS, ServiceMax, Maximo, MaintainX — replicates a whole
entity or ships offline search over the full record population. The pattern
is a **declared per-entity filter plus relationship traversal**: master data
arrives by *reachability from the work*, not by entity. And "create a work
request offline" needs a **write path carrying an unresolved reference**, not
an asset registry on the device. **Nobody goes read-only offline either** —
offline write is the core feature and checklists are the canonical offline
transaction (§8.2); an earlier "read cached data, not act on it" claim was
sourced from marketing and is retracted.

**Three things are already ACCEPTED and roll up regardless of which option
wins** (§8.3/§8.4/§8.5, and §13 items 4–7 say exactly where each lands):
**(1) offline lookups split three ways** — `replicated` for bounded code
domains (ship them whole; subsetting these is what breaks a checklist),
`reachable` for unbounded entity lookups (Equipment/Parts — must *announce*
its scope, never a silent short list), and **`definition-gated`** for a value
whose selection **re-resolves configuration** — WO Type (§13.5), Equipment
system type (§26.8), Class (§22) and Status (`0d`) are offline-pickable only
if the layout / custom-field defs / authorizations shipped. **(2) A
per-action offline capability list**, product-declared, resolving the §2.1
tension by one test — *can the server's answer be deferred without the tech
acting on a wrong assumption?* Yes → queue, action set stays stable (§2.1
holds). No → prefer **`substituted`** (a degraded equivalent), else
**`blocked-visible`** with a stated reason, and only then `blocked-hidden`
(needs justification — an absent control looks like a config error). §5.3's
GIS replica interlock is the first unavoidable member. **Field *state* is never
one of these** — §5.2's Required/Protected/Optional/Hidden resolve from page
layout (Tier 0) and are **identical online and offline**. Nothing becomes
Protected because the network dropped; no surveyed competitor does that, and it
would reintroduce the mode split §5.1 exists to reject (§8.2). What degrades
instead is **validation timing** (moves to sync), **computed values** (stale),
**defaults** (don't populate) and **control richness** (substitution).
Knock-on for §13.1–§13.4: `resolveFieldState()` must be evaluable
**on-device**, or conditional field rules can't ship offline — a third one-way
door, and stating it doesn't require picking a tier. **(3) Reachability
traversal** — §2.3's Tier 1 is "records + children", a *downward* traversal
that says nothing about a WO's *outward* references, so today the only outcomes
are replicate-equipment-wholesale (the legacy app's weight) or blank fields
offline. The rule: **a root pulls its declared children plus its declared
depth-1 references, and references are TERMINAL** — any onward hop must be
declared and capped (the one this app needs is `equipment → parent`, N levels,
default 2, **parents only**). Never traverse a reference back into transactions
(an asset's WO history/meters/cost are `server-only`). Closure is assembled
**server-side**; Tier-4 ephemeral rows get **no** traversal. ~200 WOs ⇒ order
200–300 extra master-data rows after dedup, not a million. Three items it
opens: eviction becomes **refcounted** (§6.13's `!pinned && !dirty` gains "no
other root references this"), **"unresolved reference" is a missing
field-level state** (pair it with §27.5's un-populatable UDS tab), and the
Work Order traversal declaration is **unblocked** — see UDS below.

**THREE customer-extension mechanisms, not two — don't conflate them (§8.6,
corrected 2026-09-03 by user; an earlier version of that section got UDS
wrong).** §22 already says Custom Fields and UDS "must not share an
implementation"; the same holds at the sync layer, three ways.
- **UDF (User Defined *Fields*)** — data is **columns on the record's own
  table**, so **no traversal edge, no policy row, offline-complete under
  existing rules**. Value lists are a `(column, master function)` code domain
  → `0f`; definitions → `0c`. **Per master function and identical across
  clones**, so the four `WSJOBS` clones share one UDF config — the clone model
  does *not* multiply it (unlike §20's per-clone label problem).
- **UDS (User Defined *Screens*)** — a **`U5` table**, either a record view
  **or** a child tab; as a child tab its **PKs are explicitly authored as FKs
  to the parent**, so one traversal edge **per placed UDS**, join columns from
  that mapping (the *mechanism* is generic, the *edges* are not). Outbox needs
  a **generic row-shaped envelope** (`table + PK + column/value map`), **not**
  an EAV form. **Two shapes, opposite answers, both LOCKED 2026-09-03:**
  a **standalone UDS record view is NEVER offline — permanently
  `server-only`** (closes §20's "scope call not taken"; §27.2 is a decision
  now, not a deferral, and the index-projection cost disappears rather than
  deferring — it may still exist as an online-only destination, and opening it
  offline is `blocked-visible`, never hidden). A **UDS child tab traverses iff
  it is present in the resolved page layout**, then indefinitely. **That makes
  the edge set derived from layout — no new Tier 0 artifact, no new version
  stamp** — which is §2.3's own "layout is first because layout scopes
  everything after it" extended one hop, and it is **per WO Type** since layout
  resolves on `PLO_WOTYPE`. Knock-ons: the closure cap goes back to being a
  safety net (placement is the real bound); **Screen Designer's Placement
  control — already owed in §20 — becomes the surface governing device
  payload**, so the per-UDS row cap and FK-mapping validation belong there; and
  re-typing a pre-start WO can **add** a tab whose rows never traversed, which
  is §20's "disappearing tab" item in reverse and the sharpest reason the
  not-hydrated affordance has to exist.
- **Custom Fields (§22)** — per **Class + Class Org**, so neither of the above.
  Values live in a **separate values table** keyed `(entity, record key, field
  code)` (resolved 2026-09-03), so **one edge with a fixed, product-declared
  key** — the cheap kind, in §8.5's core rather than the configuration set. The
  generic **EAV** write form is right *here* even though it is wrong for UDS,
  so **the outbox needs two generic write shapes, not one**. Cardinality falls
  out of the key, so Custom Fields take §10's field-edit conflict rule.

**§8.5's WO traversal declaration is complete** now all three are placed. And
**Class has two independent offline failure modes needing different messages**:
*definitions* didn't ship (§8.3 row 3 — Class shouldn't be pickable) vs.
*values* didn't traverse (fields render, need connectivity). Same screen, two
failures — the clearest reason `definition-gated` and `not-hydrated` stay
separate states.

Two findings survive that correction unchanged, both favouring Option 1 and
both in §6.1's scoring: the **un-populatable child tab** is an ephemeral-row
edge case under Option 1 but the permanent state of every stub under Options
2/3 (and the owed affordance is **generic** — an un-traversed row has *no*
children, so all eight child tabs need "not hydrated, connect to load," pairing
with §8.5's unresolved-reference field state); and **"can a dataspy select a
UDS field?"** becomes a base-EAM *join* question under Option 1 instead of a
flat no. Keep **not-hydrated** distinct from **definition-gated** — the first
renders and explains itself, the second shouldn't render at all.

**Offline is a replication *switch*, and §8.7 details it.** Decompose it:
**Tier 0 always persisted**, **the outbox always on** (it serves R6/transaction
confidence, a High VoC theme on its own — a save dropped mid-request happens at
full connectivity), and **record replication is the only switchable layer**.
Express it as **profile assignment, not a boolean** — a named bundle of the
entity registry + caps + lookup classes + index scope + Sync Config, assigned
on **User Group Setup** per §26.5's binding paradigm, with **"none" as the off
state**; primary grain **user group**, plus a **device** axis as `min(group,
device)`. This product already ships exactly this shape for GIS: `BCBGIS`
permission gates it per user group. **Two payoffs worth carrying to
leadership:** §7.8's Contractor/BYOD theme stops being unanswerable — a
contractor with no profile is an online-only user of the *one unified app*,
with no customer data at rest on an unmanaged device — and the switch is
**near-free under Option 1** (removes a fallback) but **near-incoherent under
Option 3**, where §2.1's "UI always reads from local DB" leaves no read path at
all. The line against "that's a mode": admin-provisioned, invisible to the
technician, fixed for the session — it changes what the app *can do*, never
what it does moment to moment. One real consequence: **§4.4.1's sync control
changes meaning** — "Offline" means *working from the device* for a replicating
user and *you can't load work* for an online-only one. Same icon, opposite
promise; needs its own state.

**GIS is now in scope (requirement 2), and the shipped product already does
most of it** — four HxGN EAM functional briefs were read 2026-09-03 and their
facts live in that file's §5/§9, not here. The three that change earlier
thinking: the Map View is a full **editor** (creates features, edits geometry,
mints equipment), so "viewer-only v1" isn't a scope reduction; there are
already **two sync engines with two error surfaces** (EAM outbox + ESRI
geodatabase replica) and GIS edits must **not** be routed through the outbox;
and `MOBGEXT`'s **geographic extent** is the configured index scope §20 says
has no shape, already shipping. Also: the existing app's four hardcoded WO
download rules are real evidence for punch-list **Option B**, and Main
Isolation is the precedent for how heavy offline work is done (replicated EAM
tables + on-device solve, never an ArcGIS network service).

`docs/design-decisions-v3-1.md` is the authoritative design spec. Never
contradict a locked decision in that doc without explicitly flagging it to
the user first. It's long — grep for the section you need rather than
reading it end to end.

`docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` is the process/
execution doc — what to build, in what order, and the current plan. Check
there before design-decisions-v3-1.md for "what should I work on," and
check design-decisions-v3-1.md for "what's the locked rule for X."

`docs/EAM-Dev-Leadership-Review-2026-08-25.md` is the **single
leadership-facing artifact** — project status, Voice of the Customer, the 8
design paradigms with their dev consequences, the full lifecycle, the
screen-by-screen inventory of built vs. outstanding (Equipment's tabs
enumerated individually, §5.2), the backend asks, the gap analysis and the
recommended sequence. **Keep it current when project status changes** — its
predecessor, `project-kickoff-whitepaper-v3.md`, went ~6 weeks stale and
understated the built surface by half, which is why it was retired into
`docs/old versions/` (2026-08-25) rather than maintained alongside. Don't
resurrect a second status doc.

`docs/EAM-Dev-Leadership-Sizing-Appendix-2026-08-25.md` is its only
companion: measured **relative** per-screen complexity (explicitly not an
effort estimate) plus the method to re-derive it. Both are deck source, not
spec — a locked rule still lives only in `design-decisions-v3-1.md`.

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
- **Activity Checklist** ("Focused Stepper", v2, §16): one item at a time.
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

### Screen Designer (Base Screens track)
`prototypes/standalone/base screens/eam-screen-designer-v1.html` — a separate,
self-contained visual system (loads none of the shared files), modeling the
base-EAM admin surface per §10–§13. Clone-aware since 2026-08-24: family pills
plus a function select over `BASE_FUNCTIONS`, with `state.baseScreen` the
family and `state.baseFunction` the `FUN_CODE` (§26.2). Its Field Grid Section
(List↔Grid toggle, drag-resizable cells) **has no doc section — flag it if it
becomes real.** **It is the only workflow-authoring surface**; a separate
`eam-workflow-designer-v1_1.html` was **retired 2026-08-25** (§21) for
contradicting §10 — don't rebuild it.

`…/eam-user-group-setup-prototype-v1.html` — User Group Setup (§26). A
**binding** screen, not a config form: on its Screen Design tab the only
editable thing is **assignment** — never steps, gating or layout — and
**assign is not copy** (§26.5.1). No insert, so **no Create button at all**
rather than a disabled one. Its **Edit layout** deep link is a real handoff:
it writes `sessionStorage.eamDesignerEntry`, which Screen Designer consumes to
open pre-filled; anything that can't be honoured is reported, never
substituted.

**A known inconsistency, not a style choice:** this track carries **two visual
languages** — Screen Designer on DM Sans/DM Mono with a teal-purple palette,
while `eam-base-desktop-ui-prototype-v1.html` and User Group Setup use
Inter/JetBrains Mono in the app's own language. The Edit-layout deep link
crosses that seam mid-flow. Restyling Screen Designer onto the Base/Desktop UI
components is the fix; nobody has picked it up.

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
§23 owns the instrument set and its rationale — **don't re-derive it here.**
The shape: 2 core instruments (status, sync) plus 3 narrowly-scoped additions —
editable-pill fill (§23.2), WO Type colour + icon badge (§23.3, reused
identically across the Type field, WO List row and step rail) and Priority
High (§23.4). Purple is retired as a UI-state accent; mono is identifiers-only
and never tinted; icons/chips are outlined except Priority Critical/High and WO
Type's badge. Counter badges take the Organization pill's recipe (§23.5).
**Green is reused, never re-invented.** Home is the one named exception
(above). Back buttons navigate for real on every screen (§24); every sync icon
opens the shared panel. **One open item:** "Not Free Form" (configured but
ungated) still has no rail signal of its own (§3.2.2/§15.4) — a different axis
from the rail's WO Type cue, which distinguishes configured vs. the §11
fallback.

### Workflow gating is FORWARD-ONLY (locked 2026-08-11, §14.10)
A technician can **always** navigate back to an already-completed step to
correct it — **"Not Free Form" dictates the order of moving forward, not
backward.** **Forward gating is untouched**: a later step stays locked and
still explains itself. Completed rows carry a trailing chevron
(`.step-map-back`) because `cursor:pointer` says nothing on a touch device.
Rationale, and the behaviour this reversed, are in §14.10.

### Dev/demo tooling
No design-doc entries — dev convenience, same as any other. Every screen's
`.proto-theme-bar` carries a theme toggle, an online/offline toggle and
"Restart Demo" (which navigates to login; the actual reset, `resetDemoState()`
in `eam-shared.js`, clears all demo `localStorage` keys and runs on Log In).
The online/offline toggle is a 3-way cycle (Offline → Online → **Synced**,
`toggleDemoOnline()`) — Synced forces the nav-bar sync control green regardless
of `SYNC_DEMO_ITEMS`' own seeded error rows, so a live demo doesn't sit on
"Error". **Defaults to Synced**; flip it by hand to see the real outbox state.

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
