# HxGN EAM Mobile — Dev Leadership Review & Deck Source

Audience: Dev Manager, Lead Dev Tech, Architecture · Date: 2026-08-25
Status: Development kickoff / build planning

A technician-first, offline-capable work order execution app for iOS and
Android. This doc is the current briefing *and* the build-planning source: why
the product exists, the design paradigms and their development consequences, a
screen-by-screen inventory of what is built and what remains, the open technical
decisions, and a recommended sequence.

> **Supersedes `project-kickoff-whitepaper-v3.md`** (July 2026, retired to
> `docs/old versions/` on 2026-08-25). That doc's still-valuable content — the
> Voice-of-the-Customer themes, the architecture concepts, the full
> login-to-steady-state lifecycle, the punch-list options, the prerequisites and
> the discussion questions — is rolled into §2, §3, §6 and §10 below. Its status
> table, scope lists and design-system paragraph had gone ~6 weeks stale and are
> replaced rather than carried over. **There is now one leadership artifact, not
> two.** The only companion is `EAM-Dev-Leadership-Sizing-Appendix-2026-08-25.md`
> (measured relative per-screen complexity), which is backup for the estimating
> conversation.

**Reference convention:** a bare `§N` is a section *of this doc*. A reference to
the design specification is written **`spec §N`** and points at
`design-decisions-v3-1.md`, which remains the only authoritative source for a
locked rule. Where the two share a number — both docs have a §5.3, §10 and §12 —
the prefix is what disambiguates.

---

## 1. Executive read — where the project actually is

**Design is materially ahead of where the July kickoff said it was.** The
five-step WO workflow was the July scope; since then the surface roughly doubled
and, more importantly, consolidated onto a **single shared component system**.

| | July 2026 (kickoff) | Today (2026-08-25) |
| --- | --- | --- |
| Mobile screens prototyped | 6 (5 steps + WO List) | **15**, plus 2 standards-reference files |
| Shared component system | proposed | **built** — `eam-shared.css` (2.1k lines) + `eam-shared.js` (4.4k lines) |
| Cross-screen navigation | mockups only | **real** end to end, 3 demo WO identities, persisted state |
| Base/admin screens | 3 prototyped | **3 prototyped** (a 4th was retired in this review — §7.2) |
| Reference data | none wired | 18 `data/*.js` files, 4 screens consuming them |
| Design spec | v3.1 | **5,400+ lines, 26 sections**, decisions locked with rationale |
| Device validation | none | 4+ device rounds on the checklist; UX testing brief ready |

**The one-line version:** the design phase produced a *specification and a
working reference implementation*, not a set of comps. The question in front of
dev is no longer "what should these screens look like" — it's "which of two
proven architecture paths do we build them on, and who owns the four backend
capabilities everything depends on."

**What is genuinely NOT decided and needs this audience:** the local data
engine, the punch-list mechanism, the server-side dataspy pre-evaluation
capability, and the navigation/compiled-shell architecture. Those four are the
deck's ask (§6).

---

## 2. Why this app exists — Voice of the Customer

SWG advisory feedback converges on a small set of high-impact themes, and they
all point at the same product:

- **Two separate mobile apps (High).** The Digital Work vs. EAM Offline split
  forces users to learn two applications with different behaviors and
  navigation, and creates confusion around configuration, capabilities and
  licensing. Checklists, documents and activity timers all behave differently
  between the two — a major recurring concern across customers.
- **Offline sync reliability (High).** Work is lost if connectivity drops during
  save; no queue or caching mechanism exists. Users cannot tell sync state or
  whether a transaction actually landed, which erodes trust in mobile execution.
- **Training dependency (High).** Record-centric workflows demand tribal
  knowledge; an aging, less-technical workforce needs task-oriented, guided
  execution.
- **Hybrid connectivity (High).** Customers want online/offline as one
  continuum — not a mode choice and not an app choice. Strong alignment across
  customers.
- **Contractor / BYOD access (Medium).** Organizations cannot force app installs
  on contractor-owned devices; browser-native access is preferred. **This is the
  one theme the architecture does not answer** — see §7.8.

Where the SWG converged: **one unified, technician-first, hybrid online/offline
app with shared licensing and one architecture.** The corresponding MVPs on the
connected-worker roadmap — Unified Mobile Experience, Hybrid Offline/Online
Execution, Guided Workflow, Intelligent Search & Filtering, Personalized Home
Screen & Inbox, Mobile Error Handling & Transaction Confidence, and
Persona-Based Mobile UX — are exactly what the design below delivers.

Worth drawing the line explicitly when presenting: **four of the five themes map
to a paradigm in §3.** Two apps → P6/P7 (one component system, one standard
model). Sync reliability → P1 (one write path, visible sync state). Training
dependency → P4 (guided execution). Hybrid connectivity → P1/P2 (no mode switch
anywhere in the design).

**The fifth does not, and it is better to say so.** Contractor/BYOD asked for
*browser-native* access, and the offline architecture requires a **native** app
(§7.8). Presenting it as answered by "a PWA delivery target" — as an earlier
draft of this doc did — would not survive the first question from a dev lead who
notices that `op-sqlite` is React Native-only. It is also the only Medium-priority
theme of the five, which makes it a defensible one to scope consciously rather
than paper over.

### 2.1 Search & Knowledge — the sub-themes behind "Intelligent Search"
Migrated here 2026-08-25 from the retired offline-search summary doc (spec
§21), which was their only home. These sit under the Intelligent Search &
Filtering roadmap MVP and are the customer-side justification for the tiered
record model (P2) — worth having to hand, because "why build a four-tier
index?" is a fair question and this is the answer.

| SWG sub-theme | Impact | What customers actually said |
| --- | --- | --- |
| Search flexibility | **High** | Current search demands exact syntax and formatting |
| Multi-field search | Medium | They want Google-like search across several fields, with autocomplete and flexible matching |
| Search discoverability | Medium | Advanced search and filtering are hard to find — a tooltip/help opportunity |
| Historical knowledge access | Medium | Easier access to prior work and equipment history, to support troubleshooting |

The MVP's own stated drivers are the same three points from the other side:
search requires exact syntax, mobile search is unintuitive, and dataspy
functionality has gaps on mobile. Its use cases — partial-value/keyword
search, combined results across equipment, WOs and locations, location-based
filtering for route optimisation, saved dataspy-style mobile filters, and
suggested/autocomplete results — are **mostly delivered by the tiered model
plus FTS5**, which is the strongest single argument for P2 as customer value
rather than architecture for its own sake. The two that are *not* delivered
by it are location-aware search and autocomplete; neither is designed.

---

## 3. High-level design paradigms — the slide set

Eight paradigms carry the whole design. Each has a direct dev consequence, which
is what makes them worth presenting to this audience rather than the visuals.

### P1 — Progressive Offline Hydration: the UI never waits on the network
Every read comes from the local DB; every write goes to a persisted outbox and
sets a dirty flag **in the same transaction**. The write path is byte-identical
online and offline. **Configuration is fetched inside the login round-trip
(Tier 0, see P2); records then stage in the background** — my open pinned work
orders ~5s, site assets ~15s, long-tail lookups ~30s, documents 90s+ — so the
device is practically offline-capable in ~30 seconds with no blocking modal. On
reconnect the outbox flushes in order using idempotency UUIDs, and a delta pull
on a `last_synced_at` cursor brings down only what changed; conflicts resolve
last-write-wins by timestamp.
**Dev consequence:** there is no "offline mode" branch to write. There is one
path plus a sync engine.

### P2 — Tiered record model: "a technician's own work is sacred, everything else is best-effort"
A fleet-wide search across thousands of 150-field work orders does not need to
fully sync every record. Four tiers separate *synced* from *visible* — **behind a
Tier 0 that is not a record tier at all:**

**Tier 0 — Bootstrap configuration. Blocking, and a different kind of thing.**
Records **degrade gracefully**: fewer rows is a shorter list. **Configuration
does not degrade** — a missing page layout is not a shorter screen, it is a blank
one. So config cannot ride the record pipeline's "usable immediately, fills in
behind you" semantics. Ordered by dependency: identity + user group → nav/function
resolution → **page layout** (`R5PAGELAYOUT` + the WO Workflow header/tabs +
custom-field definitions) → status authorizations → dataspy definitions → system
codes & descriptions.

**Page layout is first not only because it's the most critical, but because it
tells you what else you need.** Once layout resolves you know exactly which
fields exist on the screens this group can reach — and therefore which code
domains, status domains and custom-field definitions matter. Fetch codes *before*
layout and you fetch the code universe blind; fetch them *after* and you fetch a
scoped subset. Layout first is what keeps the rest small.

**Where it happens: inside the login round-trip, not a modal.** "No blocking
modal" stays locked — but that rule was aimed at waiting on *records*. Tier 0 is
kilobytes, and the user is *already* blocked during authentication. Recommend the
auth response carry the config bundle on the same connection: no new modal, rule
intact, config present before first paint. A second modal *after* login would
violate the rule; folding the fetch into the wait that already exists does not.

Then the record tiers:
1. **Work set** — fully hydrated records + children (~20–200 WOs), **my open
   pinned work orders**. Never evicted, guaranteed offline-executable.
2. **Search index** — lightweight stub rows (typically 8–12 projected columns,
   ~450 bytes each); tens of thousands of rows cost tens of MB and support
   instant offline "contains" search via FTS5.
3. **Demand cache** — a stub tapped while online hydrates on demand, then
   LRU-evicts back to a stub.
4. **Server search** — online-only escalation across all ~150 fields, reusing
   the existing dataspy SQL search API.

The real scaling limits are document payload size and sync volume over time, not
row count, and both are addressed by the delta-pull cursor.
**Dev consequence:** **row identity never changes across the lifecycle**, which
is what lets mixed-origin rows coexist in one grid with no special-casing. Tiers
move up only via user intent and down only via explicit LRU/sweep, hard-blocked
whenever a row is pinned or dirty. Online search results are written to the
local DB as ephemeral rows so the UI never reads from the network directly; a
server-search upsert may refresh summary fields but never touches hydration,
pinned, dirty or the full payload.

**What a dataspy actually is on the device — worth its own slide (slide 12),
because it is the most commonly misunderstood part of this design, and because
the first version of this section got it wrong.** The governing fact is scale:
**dataspies are unbounded.** Admin-published *plus* user-authored, on any screen
in the system carrying records, and users normally have permission to create
them. They cannot be authored from mobile today (out of scope), but mobile
consumes whatever a user created on desktop.

That single fact decides three things:

- **The index cannot be derived from the dataspies.** The Tier 2 column set is
  **declared** — an `Indexed` flag per field in Screen Designer, a bounded set of
  order 10–20 columns, sized by the admin. If it were computed from the
  dataspies, any user saving a personal query would reshape the index on every
  device.
- **A dataspy is a saved filter over that index, and it is *classified*, not
  pre-evaluated.** At sync time the server checks whether a dataspy's predicates
  and columns fall inside the declared set. If they do it is **offline-capable**
  and runs as a local query; if not it is **online-only**, served by Tier 4.
  Classification is a metadata comparison, not SQL execution, so it stays cheap
  at any count — and **nothing per-dataspy ships**, so switching stays
  zero-network and an unbounded dataspy count costs no payload.
- **Membership shipping is reserved for Tier 1 / the punch list**, where the set
  is small and genuinely server-authoritative. It is no longer the general rule.

Two supporting points worth having to hand. **There is no per-dataspy "delta
insert"** — the delta is the *index refresh* on the `last_synced_at` cursor, not
dataspy-scoped; per-record fetching happens only on a Tier-3 demand tap.
And **this is not a new device capability**: §8.3's filter chips and sort already
evaluate predicates locally over these same columns, so a dataspy is a saved set
of exactly what the UI already does.

**Where the index actually comes from — a hole that was open until 2026-08-25.**
"Sync Config" scopes Tier 1 and explicitly disclaims the whole local DB, so
nothing defined what populated Tier 2. It is **not** the broadest dataspy: "All
Work Orders" in a mature install is every WO ever raised, mostly closed history,
which at ~450 bytes/row runs to hundreds of MB. Two bounds now: the row-lifecycle
rule **already** deletes a stub when index sync reports the WO closed, so the
index is **open work orders by construction**; and the remaining extent is a
**configured index scope**, server-side, parallel to Sync Config. Deliberately
not derived from the display dataspies — otherwise adding a dataspy silently
changes every device's storage footprint. **Invariant:** a dataspy must be a
subset of the index scope or the UI must say so — "showing 412 of ~9,000, connect
for the rest", never a silent truncation.

**Dev consequence:** the projection is a *sync* contract, not a display
preference, and it is authored where layout is authored — so it rides Tier 0's
`0c` for free (persisted, versioned, eviction-exempt) instead of needing a new
bootstrap artifact. **The honest cost:** declaring the indexed set is a real
admin responsibility rather than a defaulted convenience, and any dataspy outside
it degrades to online-only rather than failing quietly.

*(Superseded same day: an earlier version of this section had the index storing
the **union** of the screen's dataspy projections, defaulted to each dataspy's
first 6 and capped. That was costed on a handful of concentric dataspies and does
not survive an unbounded, user-authored set — the cap saturates permanently and
"which columns survive" becomes arbitrary. Full entry in spec §21. What survived:
the `Indexed` flag, promoted from override to primary source, and every argument
about where it is authored.)*

**Four consequences of Tier 0 worth putting on the slide,** because each is an
engineering rule rather than a preference:
1. **Tier 0 is persisted, versioned and exempt from eviction** — not
   "hard-blocked while pinned or dirty" like a record, simply out of scope. First
   run needs connectivity once; every launch after boots from last-known-good
   config. A version stamp per domain makes a reconnect delta-check cost bytes
   instead of a refetch.
2. **A first-run Tier 0 failure is the one legitimate hard failure.** Everywhere
   else this design degrades; no layout means no renderable screen, so it must
   stop with an honest error rather than paint something broken.
3. **Do not enable the write path until status authorizations are present.**
   Without them the app either blocks every transition — a technician who can't
   Start Work or Close has no app — or permits all of them and queues writes the
   server will reject. **The second is worse under optimistic UI:** the
   technician sees success, walks away, and it fails hours later in the
   trouble-field banner. That is exactly the "did my transaction actually land?"
   trust failure the product exists to fix (§2), so a systematically wrong
   authorization set is worse than a blocked one.
4. **A config delta arriving mid-session is the workflow-revisioning problem**
   (§7.2) seen from the sync side rather than the authoring side. Recommended
   answer for both: **pin the resolved config version to the WO at
   start-of-work** — a WO in flight finishes on the shape it started with, and
   the new config applies to the next one. Cheapest correct option, and it needs
   no migration of recorded step state. Proposal, not locked.

**One defect the resequencing fixes, worth naming as evidence it isn't just
tidying:** the old order put lookup tables at ~30s, which meant that for the
first half-minute a record could render with **raw codes and no descriptions** —
`BRKD` instead of `Breakdown`. That is precisely the training-dependency
regression the SWG flagged as High (§2).

### P3 — No view/edit mode split (spec §5.1) — the core interaction decision
There is no Edit button and no form mode. Every editable field is tapped in
place and edits through a bottom sheet; required fields simply cannot be
cleared, which is *why* the app carries no required-field markers outside Insert
Mode.
**Dev consequence:** this is the single biggest departure from the legacy apps
and the biggest per-field build cost. Every field is a live control with its own
editor, validation and optimistic-write path. It is also why field *type* is the
unit of work, not screen — hence the canonical field-behavior reference file.

### P4 — Guided execution over record navigation
The technician's primary object is a *workflow*, not a record: a step rail with
a timer, a per-step bottom bar, and a Yes/No prompt fork. **Gating is
forward-only (spec §14.10, locked):** a later step stays locked and explains itself,
but a completed step is *always* reopenable — a mistyped reading or wrongly
booked hours has to be correctable, or the only options left are abandoning the
WO or leaving bad data in the system of record.
**Dev consequence:** step state is per-WO persisted data, not screen state, and
every step screen must tolerate being entered out of order.

### P5 — Configuration-driven screens: the app mints no new `FUN_CODE`s
Which fields appear, in what order, required or not, and which workflow steps
exist for a WO Type all come from base-EAM configuration — a `PLO_WOTYPE` column
plus two new WO Workflow tables, authored in Screen Designer. Function
resolution **switches on the entity (`FUN_RENTITY = EVNT`), never on a
`FUN_CODE`** (spec §26.2, locked), because this customer already runs four `WSJOBS`
clones as distinct business processes. Workflow is opted in **per user group**.

Configuration reaches further than field layout: it also decides **which of the
function's tabs are sequenced steps at all**. Each tab carries a Placement of
`Step` or `More` (spec §12/§14.8) — `More` tabs sit outside the numbered flow in the
step rail's "More" group, always reachable, never in the Next-button path. So
the same function can present as a five-step gated workflow to one user group
and a looser three-step one with Parts available anytime to another, with no
code difference.
**The clearest proof this is a paradigm and not a WO special case — and the
best single slide for it — is Equipment.** Base EAM already splits Equipment
across **four distinct base screens by system type: Location, Asset, Position,
System**, each supporting clones filterable per user group. Apply the same
mechanism *minus the workflow piece* and the technician picks an asset, reads its
record view, goes back to search, pulls up a **position**, and the record view
**re-renders under a different layout** — never navigating to a different screen.
**Four base screens collapse into one mobile surface:** one Equipment List, one
Record View shell, four resolved layouts. That is the SWG's "unified experience"
theme answered at the screen level — configuration-driven layout *removing*
navigation rather than just relocating configuration.

It is also **cheaper on the base side than WO was**, which is worth saying out
loud: WO needed a new `PLO_WOTYPE` column because base had no per-Type layout
concept, whereas Equipment's four system types **already are four `PLO_PAGENAME`
values**. Resolution is `R5PAGELAYOUT` on `PLO_PAGENAME × PLO_USERGROUP` doing
what it already does — no new column, no new table. (This also resolves a
standing open question: Insert Mode's third Equipment pill is the **system
type**, not a Class — see spec §26.8.)

**Dev consequence:** layout is data, not code — and so is the *shape of the
workflow itself*. It needs a real JSON API in front of `R5PAGELAYOUT` and the
new workflow tables; the legacy admin framework's server-side postback forms
cannot serve it. This is genuine backend surface area. Two rules are load-bearing
and must survive into the schema and the UI respectively:
- **A tab is either a step or a More entry, never both**, or forward gating is
  bypassable in two taps.
- **Editing WO Type re-resolves the layout, so it cannot behave like an ordinary
  field.** While the WO is **not started** it confirms first ("changing the type
  may change the fields and tabs displayed — proceed?"), then commits immediately
  and re-renders. **Once Start Work is tapped, Type is Protected** — permanently,
  no exceptions. That single line replaces a proposed four-tier gate and closes
  the required-field-drift problem with it (§7.6). Layout still decides what is
  *displayed*, never what *exists*.

  **Equipment is exempt by construction:** its system type is **Protected in
  update mode, always** — set once at insert, fixed for the record's lifetime. So
  it gets the paradigm's benefit with none of the re-typing exposure. That
  divergence is deliberate, not an inconsistency: protecting the key after insert
  is the cleanest answer available, and WO can't take it because re-typing a work
  order is a real business need (a work request triaged into a breakdown). The
  one consequence: Insert Mode is the *only* place system type is ever set, so
  its currently-missing `Location` option is a real defect — pick wrong, or find
  the option absent, and it's unrecoverable from mobile.

### P6 — One shared component system, enforced by convention
Every generic component lives in `eam-shared.css`/`.js` **by default**;
screen-local is allowed only until a real second consumer appears. Screens
contribute their own data/config globals and genuinely screen-specific content
and nothing else. The component catalogue is named and browsable
(`component-library.md`) so "what do we call this thing" is not re-litigated per
screen.
**Dev consequence:** the prototype already *is* a component inventory — 20+
named components with locked rules. This should map to the production component
library nearly 1:1, and it is the main reason the prototype is worth porting
rather than restarting.

### P7 — Standard Model + deltas, not per-screen design
Two canonical files define the rules — one covering every field type in both
container styles, one applying them to a full record view — and every other
screen is a *delta* against them. Same discipline in the spec: the Standard
Model sections hold the default, other sections state only exceptions.
**Dev consequence:** a new screen is a config exercise, not a design exercise.
This is what makes most of the remaining unbuilt surface (§5.3) cheap.

### P8 — Deterministic placement and colour rules, so nothing needs a design review
Two examples worth showing because they remove judgement calls from dev:
- **Button placement (spec §8.4, app-wide):** if a base-EAM link button errors with
  "Record must be selected before performing this action" it is row-scoped →
  Action Row. *Every* other button is a header action and belongs in the
  vertical ellipsis — being on a tab does not make a button a tab action.
- **Colour is an instrument set (spec §23):** two core instruments (status, sync)
  plus three narrowly scoped additions (editable-pill fill, WO Type
  colour+icon, Priority High). Everything else is monochrome; identifiers are
  mono and never tinted. Home is the one named exception.

Plus a small set of locked cross-cutting patterns: LOV rows are code +
description with the code small and muted; every sheet's Save gates gray-to-green
on required-field completeness; there are **no blocking modals** anywhere —
progressive hydration replaced the launch modal entirely; and anything typed uses
✕/✓ in the top corners rather than a Save button at the bottom, because a control
at a sheet's bottom edge collides with iOS's own keyboard accessory bar.

### 3.9 The full lifecycle — first run to steady state
Worth one slide, because it is the clearest single picture of P1+P2 together:

- **Server setup (first run only).** Scan a QR code (organization, tenant,
  server URL, OIDC endpoints) or key the values in manually, then test the
  connection — same setup model as the current apps.
- **Login — and Tier 0 rides along with it.** SSO/OIDC or internal
  authentication; biometric unlock on return; session tokens cached so the app
  can relaunch offline. **The auth response carries the bootstrap-config bundle
  on the same connection** (P2): identity/user group, nav-function resolution,
  page layout + workflow tables + custom-field definitions, status
  authorizations, dataspy definitions, and the code domains layout references.
  Kilobytes, inside a wait the user is already in — so no second modal, and
  configuration is present before the first screen paints.
- **Record hydration starts.** The local DB opens instantly — no blocking modal.
  Staged pulls begin in the background.
- **WO List ready.** Within ~5s **my open pinned work orders** are on screen;
  within ~30s the device is practically offline-capable while the search index
  and the long-tail lookups keep filling quietly.
- **Steady state.** Delta pulls run on the sync cursor, the search index
  refreshes, and the outbox drains opportunistically whenever a connection
  exists.

First run needs connectivity once; every launch after that works fully offline.
**Note the two screens this depends on are themselves unbuilt** — server
configuration and login are on the outstanding-design list (§5.3), so the flow
above assumes parity with the current apps' setup model.

**The execution loop.** The technician opens a punch-list WO (Tier 1, already
hydrated) and executes the five guided steps. Every save is one transaction: an
optimistic local write plus an outbox enqueue, with the dirty flag set in the
same transaction — the UI updates instantly. The sync engine drains the outbox in
order when connected; the server ack clears dirty and the pending badge drops.
Record state follows a small machine: ephemeral → stub (index sync) → hydrated
(demand tap or punch-list sync); hydrated rows LRU-evict back to stubs only when
neither pinned nor dirty; ephemeral rows are swept after ~24h; stubs are deleted
when the index reports the WO closed. **Pinned and dirty hard-block eviction — a
punch-list record or an unsent edit can never be lost.**

---

## 4. Screen inventory — built and prototype-complete

15 mobile screens exist as connected, navigable prototypes on the shared system.
The **Cx** column is a *measured* relative size — basis, weights and the three
corrections it forced on my own first estimates are in
`EAM-Dev-Leadership-Sizing-Appendix-2026-08-25.md`. It ranks relative
complexity, **not production effort** (the prototype has no data layer, tests,
a11y pass or i18n); the multiple from one to the other is dev's to set.

| # | Screen | File | Cx | Notes for dev |
| --- | --- | --- | --- | --- |
| 1 | **Login** | `eam-login-prototype-v1.html` | S | **Placeholder only** — tap straight through. Real design outstanding (§5.3). Its one real job today is running `resetDemoState()`. |
| 2 | **Home** | `eam-home-screen-prototype-v1.html` | L | Layout mechanics locked (scroll-collapse, tap-to-top, horizontal sections). **Tile/chip content is deliberately unlocked** — do not build to today's tiles. Named exception to the monochrome palette. No authoring surface exists (§8.4). |
| 3 | **WO List / WO Search** | `eam-wo-list-prototype-v5_1.html` | XL | **The template for every top-level record list.** All 6 filter chips + Sort real; dataspy bar with favourites; Detailed/List modes; merges created records and MEC child WOs. Carries hand-copied CSS that belongs in shared (§8.3). |
| 4 | **WO Record View** (Step 1) | `eam-wo-record-view-prototype-v1.html` | XL | Largest screen (2,002 lines). Header fields grid, activity selector, Route/MEC pill, Equipment lookup + photo, Custom Fields, inline Comments/Documents excerpts. |
| 5 | **Activity Checklist** (Step 2) | `-v2.html` **and** `-v2-scrollmode.html` | XL | **Live A/B, undecided** — paged Prev/Next vs. flick-and-snap. 17 item types, dynamic follow-on items, per-item Notes/Comments/Documents, equipment fan-out. See §8.2 — the biggest single open design question. |
| 6 | **Issue Parts** (Step 3) | `eam-wo-prototype-issue-parts-v1.html` | L | Store/Bin/Lot picking, Action Rows, quick-issue-all. Add Part search is real (112-part catalogue); **planned lines + bin options are still hardcoded**, not wired to `data/parts*.js`. |
| 7 | **Book Labor** (Step 4) | `eam-book-labor-prototype-v2.html` | L | Fully data-driven (employees/crews/crew_employees). Crew booking expands to one row per member. Owns the Time Only field type. |
| 8 | **WO Closing** (Step 5) | `eam-wo-closing-prototype-v2.html` | L | Status change control, closing-code 2×2 sequential unlock, downtime, attachments. Status control + collapsible pattern are screen-local — no shared equivalent yet. |
| 9 | **WO › Equipment tab** | `eam-wo-equipment-tab-prototype-v1.html` | M | **The template for any record-view child tab.** Backed by a shared persisted store that is the single truth for this tab and WO RV's pill. Mints real MEC child WOs. Row-tap destination is an unresolved A/B. |
| 10 | **WO › Comments & Documents tab** | `eam-wo-reference-tab-prototype-v1.html` | S | One child-tab screen carrying both tabs. (Filename still says "reference" — stale after spec §14.8's rename, tracked in §20.) |
| 11 | **Equipment List** | `eam-equipment-list-prototype-v1.html` | L | Copied from WO List per P7. All 6 chips + Sort real. Routes per-record. |
| 12 | **Equipment Record View** | `eam-equipment-record-view-prototype-v1.html` | L | **The canonical full-record-view reference (spec §5.3)** — copy its header/section pattern for any new record view. Carries the equipment photo slot. **Its 11 tabs are 11 separate endeavours — see §5.2.** |
| 13 | **Notifications** | `eam-notifications-prototype-v1.html` | S | Modeled on real `R5MAILEVENTS`. **That table has no read/unread column** — flagged, unsolved, and the screen's All/Unread filter depends on it. |
| 14 | **Sync Status Screen** | `eam-sync-status-prototype-v1.html` | S | Shares outbox demo data and the trouble-field component with the nav sync panel. |
| 15 | **Insert Mode** | shared (`eam-shared.js`) | L | Not a screen — one shared sheet every Create entry point opens. Renders the record's own screen design and varies by Type. Created records persist and re-open. **The one documented exception** to the required-marker removal. |

**Plus two standards-reference files that are not shipping screens but are the
build contract:** `screen-layout-field-behavior-prototype-v1.html` (every field
type in both containers) and `eam-card-standard-prototype-v1.html`.

### 4.1 What "prototype-complete" does and does not mean
Worth saying out loud in the deck, because it sets expectations correctly:
- **Does mean:** navigable, on the shared component system, decisions locked in
  the spec with rationale, verified by static review and headless execution.
- **Does not mean:** visually reviewed on a device by the author. Layout,
  contrast, tap-target size and animation are genuinely unverified on most
  screens (the checklist is the exception — 4 device rounds).
- **Known stubs are catalogued** in
  `handoffs/EAM-HANDOFF-UX-User-Testing-Brief.md` §4 — reuse that list rather
  than rediscovering it.

---

## 5. Screen inventory — still to be developed

### 5.1 Base / admin screens (prototyped)

| Screen | File | State |
| --- | --- | --- |
| **Screen Designer** | `base screens/eam-screen-designer-v1.html` | Prototyped, clone-aware. Entry modal, mobile-emulator canvas, left pane merging tabs + steps, right-click field editing, drag-reorder, field grid section. **On the old visual language** (§7.3). Missing the Placement control the "More" group now needs (spec §20). |
| **User Group Setup** | `base screens/eam-user-group-setup-prototype-v1.html` | Prototyped 2026-08-24. A *binding* screen, not a config form: Bottom Nav and Sync are real assignment grids; Screen Design and Home summarise and deep-link out. Runs the cross-domain consistency checks no designer can. Real handoff into Screen Designer via `sessionStorage`. |
| **Base Desktop UI** | `base screens/eam-base-desktop-ui-prototype-v1.html` | The design-language reference for this track (rail, crumb, hero, tab capsule, `.fd` fields, `.mg` grid). |
| ~~Workflow Designer v1.1~~ | `base screens/old versions/` | **Retired 2026-08-25** as a superseded precursor — spec §10's "one surface covers both workflow-driven and non-workflow screens" stands as written. Keep it out of the deck. Rationale in §7.2. |

**Base / admin screens that do not exist yet:**
- **Home layout designer** — User Group Setup deep-links to it; it does not
  exist. spec spec §9.4's open "base-admin configurability" item is the same gap from the
  other side. Resolve together.
- **Home quick-action config** (informally "Home Icon" / digital-work-home
  setup) — which quick actions surface on Home must be admin-configurable, not
  hardcoded. Surface not yet located or named in base EAM.
- **Workflow-eligibility validation** — enabling the workflow on a function must
  check that the tabs the step set requires are present and permitted for the
  target groups. Shape undecided (hard block vs. warn; enable-time vs.
  save-time). **The one piece of genuinely new work the per-group function model
  creates** (spec §26.7).
- **"More"-group Placement authoring** — each of a function's tabs needs a
  `Step | More` placement (spec §14.8/P5). The runtime is already data-driven and
  waiting to be fed; nothing authors it.
- **Equipment's four system-type layouts** — Location / Asset / Position /
  System, plus clones. Screen Designer's MVP scope says "two record views,
  Equipment and Work Order," which counted Equipment as one screen. **This one is
  a blocker for the Equipment mobile track** — see §7.5.

### 5.2 Equipment Record View's tabs — each tab is its own endeavour

**Subject to change based on scope. Highest priority of tabs is Events,
Structure, Parts Associated with others coming thereafter.**

Equipment Record View is one file today carrying 11 tabs, but for planning
purposes **each tab is a separate piece of work**, not a fraction of one screen.
The shell, the tab rail, the List/Detail container and the search/Plus
affordances are already built and shared — what each tab still owes is its own
field set, data binding, row/detail layout and actions.

| Priority | Tab | Pattern | What it still owes |
| --- | --- | --- | --- |
| **1** | **Events** | List/Detail shell exists; search wired | The asset's WO/event history — field set, row anatomy, sort/grouping rule, and the tap-through to the WO. The highest-traffic tab for a technician standing at an asset. |
| **1** | **Structure Details** | **Structure Tree — already a shared component** | Renders through the same tree the Equipment LOV's Structure tab uses (`component-library.md` → Structure Tree). Owes a **parameterization, not a design**: mount/data are hardcoded to the LOV, and the row's trailing control is selection-only where a tab needs a navigate-style handler. One additive piece: a per-node status dot. |
| **1** | **Parts Associated** | List/Detail shell + Plus exists | Field set, data binding to the parts catalogue, and the insert flow behind the Plus. |
| 2 | Meters | List/Detail shell + Plus exists | Field set, reading-entry flow. Ties to the unbuilt Meter Reading system action (§5.3 below). |
| 2 | PM Schedules | List/Detail shell exists | Field set, and whether a schedule is tappable through to anything. |
| 2 | Costs | List/Detail shell exists | Field set and whatever roll-up/period rule applies. |
| 3 | Warranties | List/Detail shell exists | Field set. |
| 3 | Depreciation | List/Detail shell exists | Field set. Likely the least technician-facing of the eight. |
| — | Record View | **Built** | The canonical reference (spec §5.3). |
| — | Comments / Documents | **Built** | Shared components, locked app-wide (spec §7.2). |

**The whole priority-1 set is config-and-binding work against components that
already exist.** Events and Parts Associated sit on the shared List/Detail
container; Structure Details sits on the shared **Structure Tree**. Nothing in
the priority-1 set is a new component, which is what makes it a sensible first
slice. *(An earlier draft of this section called Structure Details a new
component and a design dependency — that was wrong. The tree shipped with the
Equipment LOV and spec §7.4 had simply gone stale describing it as nonexistent;
both are corrected.)*

**One prototype limitation not to mistake for per-tab work:** all 11 tabs
currently render the same demo record's content whichever asset was opened,
because Equipment Record View's routed-in record is an identity overlay. **That
is a deliberate non-concern for the prototype** — static demo data is not the
design deliverable. In production it isn't a separate task either: "bind the tab
to real data" *is* the per-tab work, so it needs no line of its own in the plan.

### 5.3 Mobile screens not yet designed
Grouped by how much design work is actually owed, which is the useful cut for
planning.

**Real design work owed (each needs a design pass before dev):**
- **Server configuration / first-run setup** — QR scan of org/tenant/server
  URL/OIDC endpoints, or manual entry, plus a connection test. Assumed at parity
  with current apps; never designed. §3.9's lifecycle depends on it.
- **Login** — real design. Requirements doc exists
  (`existing_use_cases/EAM.DUX.REQ.Login.docx`).
- **Activity Screen** — timer, task plan reference, assignment status.
- **Profile screen contents** — including the technician's own avatar photo;
  today's nav-bar icon "adds no real value on mobile."
- *(Removed from this list 2026-08-25: **Structure Details**. It renders through
  the shared Structure Tree, so it is a binding exercise, not owed design — see
  §5.2. Only the per-node status dot is additive.)*
- **Settings / Sync Config / Transaction Log** — requirements docs exist in
  `existing_use_cases/`; no design started. **These three are in the requirement
  set but appeared in no earlier status doc** — flagged so they are not
  discovered late.

**Cheap by P7 — a delta against an existing canonical file:**
- **Equipment's 8 child tabs** — per-tab detail and priority in §5.2.
- **Standard Update Mode for other non-WO entities** — Equipment Record View is
  the pattern; each additional entity is a field-set exercise.
- **Home's system-action entities** — Meter Reading, Work Request, Operator
  Checklist (possibly Batch Book Labor, Hours Worked, Permit to Work). Each
  needs one call: full Insert Mode or a lighter action sheet.
- **Sort on each list's Search sub-screen** — markup gap only; the shared sort
  sheet already re-renders both.

**One build that is worth more than one screen — the generic UDS tab renderer
(spec §27, scoped 2026-08-25).** A **User Defined Screen** is a
customer-authored screen, which base EAM can surface as a **tab on the work
order**. Because §14.8 already defines a function's tab candidates as
"the function's own tabs, filtered to what the group is permitted," a UDS tab
enters that set **by construction** — so it takes a §12 tier-2 row and
**can be a numbered, gated, required workflow step.** That is the headline: a
customer's Permit to Work or Isolation Certificate becomes *step 3 of the
guided flow*, not an optional side trip, using rules already locked.

The set of UDS screens is per-customer and unbounded, so there cannot be a
screen per UDS — it has to render from its definition at runtime. The pattern
is already proven twice at smaller scale (§22's Custom Fields merging
definitions into a screen's own field globals; Insert Mode rendering its own
layout from metadata), so this is **one build covering N customer screens** —
high leverage, and the strongest P7 argument in the deck. Two caveats worth
stating: sequence it *after* a second real child tab exists, since the
Equipment tab is a sample size of one and a renderer generalised from one
example is a guess; and a step-placed UDS tab is the first child tab needing
the per-step bottom bar, with required-field bar-locking evaluated over fields
the app has never seen. **The offline story is what actually needs answers, not
the UI** — see §6. Recommendation in §27.2: **UDS tabs in v1, standalone UDS
destinations deferred**, because a standalone UDS needs a nav slot plus its own
full List Search Screen per customer screen.

**Specified but deliberately unbuilt, because it needs dev input rather than a
design pass:** the **WO List per-row hydration affordance and offline freshness
caption**. What a row can honestly claim about its freshness depends on how the
real sync/index layer behaves, so designing it in isolation would be guesswork.

---

## 6. Backend & platform prerequisites — the deck's ask

All of these block real work. Nothing in §4 is trustworthy in production until
the first two exist.

| Area | Decisions / work needed |
| --- | --- |
| **Local data engine** | Final selection: WatermelonDB vs. SQLite (op-sqlite) — currently a recommendation, not a decision. **Confirm FTS5 availability in the chosen engine's build** (required for offline search) as an explicit exit criterion. |
| **`wo_index` schema + sync contract** | Finalize lifecycle columns (hydration, pinned, source, dirty — counter vs. boolean undecided) and the two clock domains (`last_synced_at` vs. `fetched_at`), plus the `full_payload` JSON blob approach. Define the outbox idempotency-UUID scheme with the API team. Confirm whether the delta-pull cursor contract exists today or must be built. |
| **Punch-list mechanism** | Option A vs. Option B — see below. **The device-side contract is identical either way**, so the mobile build does not block on it. |
| **Server-side dataspy pre-evaluation** | New capability: pre-evaluate saved dataspies at sync time and return WO-ID membership alongside the index. **The highest-leverage single item — punch-list Option A *and* Tier 2 search both depend on it**, so its timeline sets the floor for everything offline. Also confirm the existing dataspy SQL search API can serve the Tier 4 online-escalation path as-is. |
| **Tier 2 index — the declared projection, the scope, and dataspy classification** | Three coupled items, all consequences of dataspies being unbounded and user-authored (P2). **(1) The declared projection's authoring grain.** The `Indexed` flag is a per-field declaration in Screen Designer — but layout resolves per `PLO_PAGENAME × PLO_USERGROUP × PLO_WOTYPE` while `wo_index` is one table across all WO Types, so a per-Type index is not a concept. The flag must be authored Type-independently on a surface that is per-Type throughout: either Screen Designer grows a Type-independent scope for it, or the set is declared once per function. **Equipment is worse** — four `PLO_PAGENAME` values edited separately (§7.5), no authoring surface at all yet. §8.5 argues for the *function* grain. **(2) The configured index scope.** Which axes an admin may bound it on (site / org / age), where it is authored, per group or per user, and what the UI does when a dataspy exceeds it. **(3) Dataspy classification, and the normalised criteria form** — the load-bearing prerequisite. Local evaluation needs each dataspy's predicates in a normalised structure (field / operator / value, AND/OR), **not** raw dataspy SQL, which the device cannot execute and which can reference joins absent from `wo_index`. Owed: that schema, which predicate constructs are expressible, and the server-side classifier. Fallback is safe by design — anything inexpressible classifies as online-only — so this bounds *how much* works offline, not whether the design holds. All three change the sync payload contract, so they are needed at kickoff. |
| **Layout/workflow API** | A real JSON API in front of `R5PAGELAYOUT` and the two new WO Workflow tables (spec §12), for both the mobile app and Screen Designer. The legacy framework's server-side postback forms cannot serve it. Needs an owner (P5). Must also serve **Equipment's four system-type layouts** and their clones (§7.5), and **User Defined Screen definitions** (§5.3, spec §27) — a UDS tab with no definition is a blank screen, so its definitions are Tier 0 config, not record data. |
| **User Defined Screens — data, search and write path** | Scoped 2026-08-25 (spec §27). The UI is a solved pattern; the **offline story is not**, and three answers are owed, all base-side. **(1) Where does UDS data live** — in the WO's `full_payload` blob or a separate child table? If it is a child table it is Tier-1-only, so a Tier-2 stub opened offline shows a UDS tab it cannot populate, and there is no affordance today for "this tab needs connectivity." **(2) Can a dataspy select a UDS field at all?** If not, UDS fields can never be indexed, filtered or sorted — defensible, but it has to be stated, because a customer who triages on a UDS field will ask. **(3) The write path has no shape** — if UDS storage is generic (`entity + record + field + value`) the outbox has no such write form, and it is unknown whether UDS fields are governed by status authorizations at all, which would leave a hole in the write gate. Also: UDS LOVs are customer-defined domains, so they **widen Tier 0's code-domain scoping** (`0f`) in a way nothing has accounted for. |
| **Tier 0 bootstrap-config contract** | The *ordering* and "carried on the auth response" are settled (P2); the contract is not. Owed: what the bundle contains per domain, the **per-domain version stamp** that makes a reconnect delta-check cost bytes instead of a refetch, and how partial failure is reported — a missing layout is fatal, missing long-tail codes is degraded-but-usable, and the response has to say which rather than returning one opaque error. Also: is the code-domain scoping done **server-side** (server resolves layout, returns only referenced domains — smaller payload, more server logic) or client-side (client resolves, then asks by name — chattier)? **Recommend server-side:** one round-trip inside the login wait instead of two. |
| **Navigation architecture** | Decide the app shell: persistent iframe shell vs. real page-to-page navigation with record identity on the query string. Settled by one small proof-of-concept, which also decides Screen Designer's live emulator — see §8.1. |
| **Platform target — confirm, don't assume** | The offline model (Tier 1 hydration, Tier 2 FTS5 index, a persisted outbox that survives app kill) requires a **native React Native app**. The spec's header cell said "responsive PWA" until 2026-08-25 while also naming `op-sqlite`, which is React Native-only — a straight contradiction, now corrected. What dev needs to confirm is the **native** target and its consequences: storage headroom on device for a ~35 MB index plus documents, background-sync behaviour, and app-store distribution for contractor-owned devices (§7.8). |
| **Production typeface** | **Aptos** (brand, Microsoft-proprietary) vs. **Inter** (prototype stand-in) — licensing owner needed. Note the Octave PowerPoint template is itself built on Aptos, so the brand answer and the app answer may not be the same question. |

### 6.1 The punch list — what downloads to this device?
Tier 1 is defined by a per-user punch list of work orders. **The mechanism that
produces that list is an open decision for this team.**

**Option A — static sync dataspy.** A configured dataspy defines the punch list,
set at user-group level and overridable down to a specific user.
*For:* zero new base schema; admins already know how to build dataspies; the
security model already governs them; the server-side pre-evaluation capability
(needed for Tier 2 anyway) delivers it.
*Against:* assignment logic gets re-derived in dataspy SQL per customer; no
provenance on why a WO is in the list; nothing reusable for the personalized home
screen, supervisor views or notifications.

**Option B — PIN (`R5PINS`) projection.** A materialized projection of the
existing assignment sources (assigned-to, activity schedules, resource
scheduling, dispatch, manual pins) into one table **with provenance** — not a new
source of truth; existing mechanisms stay untouched, and manual pinning is the
only case where a pin originates rather than reflects. Pin relationship types are
system-owned and small (EXEC, OVERSIGHT, WATCHER), with a hydration quota on EXEC
pins only (~150, configurable). The rule if chosen: *"hydrate open records where I
hold an EXEC-class pin; index everything else I'm pinned to."*
*For:* assignment resolved once and consistently; automatic lifecycle (a pin
lives as long as any source says it should); a **common backing store** for the
personalized home screen, supervisor team-backlog views, watch/notification
enrollment and selective offline sync.
*Against:* real base-EAM work — a new table plus migration, app-layer
transactional hooks (explicitly **not** DB triggers), an async diff job for
dataspy-defined custom types — plus open decisions: EXEC quota and enforcement
UX, cascade opt-in granularity, USR↔PER edge cases, v1 entity scope, and the
"pin" naming collision with the device eviction flag.

**Either way, the device-side contract is identical:** a WO-ID membership list
arrives at sync time and stamps `pinned = 1` on `wo_index` rows. The tiers,
eviction rules and device behavior do not change with the choice.

---

## 7. Gaps found in this review — not tracked anywhere else

The spec's own §20 tracks 36+ open items honestly, and the UX brief tracks the
stubs. These were in neither.

### 7.1 The leadership-facing artifact was stale — now resolved
`project-kickoff-whitepaper-v3.md` understated progress (§1) and misdescribed
the design system — its §4 still said "purple is reserved for step pill, badges
and focus," but purple was **retired as a UI-state accent** (spec §23). Presenting
from it would both undersell the work and state a retired rule as current.
**Resolved 2026-08-25:** its durable content is rolled into §2/§3/§6/§10 of this
doc and the file is retired to `docs/old versions/`. One artifact now, not two.

### 7.2 `eam-workflow-designer-v1_1.html` was an undocumented orphan — retired 2026-08-25
**Found:** 1,758 lines, committed 2026-07-21, linked from `screens.html`, and
mentioned in **zero** documents. It modelled things that exist nowhere in the
locked spec: **workflow revisioning** (Draft / Current Rev / Create Rev),
**conditional visibility**, **allow skip with reason**, a **node graph** with an
explicit "fallback when no criteria match," and blank-workflow / create-from
templates.

Two problems, which is why it was retired rather than kept:
- Spec §10 states "**one surface covers both workflow-driven and non-workflow
  screens** … there is no separate admin surface for workflow-driven screens." A
  separate Workflow Designer contradicted that locked rule.
- Its conditional-visibility and skip-with-reason modelling overlaps
  **spec §13.1–§13.4, which are deliberately deferred to Phase 4+** — an unreviewed
  prototype answering a question the project decided not to answer yet, which
  would have been a liability if demoed.

**Resolved:** moved to `base screens/old versions/`, unlinked from
`screens.html`, recorded in spec §21 with a revert recipe. **Keep it out of the deck.**

*Worth preserving from it:* it is the only artifact in the repo that has thought
about **workflow revisioning** — a live config being edited while technicians are
mid-workflow against the previous version. The offline model sharpens it: the
device holds a config that arrived at sync time and step state recorded against
the *old* shape, and those can be days apart. Now tracked as open in spec §20.

### 7.3 The base-screens track has two visual languages
Screen Designer is on **DM Sans / DM Mono** with a teal/purple palette and loads
none of the shared files. Base Desktop UI and User Group Setup are on **Inter /
JetBrains Mono** and reuse the app's design language. Any slide showing them side
by side will read as inconsistent, and a demo that walks from User Group Setup
into Screen Designer crosses that seam mid-flow — which is exactly the deep-link
handoff that was just built.

### 7.4 The live Step 2 routing is a temporary hack
`WO_STEP_FILES.checklist` points at the **scroll-mode A/B copy**, carrying an
explicit `TEMPORARY (2026-08-12) … PUT THIS BACK` comment, so every navigation
path reaches the experiment. Reasonable and honestly commented, but it breaks the
one-live-version-per-screen convention. **It should not survive into a build
handoff undecided** — see §8.2.

### 7.5 Equipment's four system-type layouts have no authoring surface — and that blocks the Equipment track
Surfaced 2026-08-25 with the finding in P5. Screen Designer's declared MVP scope
is "two record views, Equipment and Work Order" (spec §10) — written as though
Equipment were **one** screen. It is **four** (Location / Asset / Position /
System), times clones per user group.

**This is a blocker for Equipment, not a parallel workstream.** Building
Equipment Record View against a single hardcoded layout would bake in exactly the
assumption the finding disproves, and **every child tab built on top of it would
inherit that assumption** — which is the expensive version of getting this wrong,
because §5.2 breaks those tabs out as individual endeavours. Sequenced
accordingly in §9.

Cheap consolation: the base-side work is smaller than WO's equivalent, since the
four layouts need no new column or table (P5). What is missing is the *authoring*
surface, not the resolution mechanism.

### 7.6 WO Type-change handling — resolved, and it collapsed three open items
**Rule (locked): WO Type is editable only while the WO has not been started.
Once Start Work is tapped, Type is Protected — in progress, complete or closed,
no exceptions and no permission escape.** Spec §13.5/§14.11.

Worth presenting as a **worked example of how the paradigm pays off**, because
one rule closed three problems that had looked independent:

- **Gate tiers gone.** An earlier draft proposed four escalating tiers ending in
  "block outright on a closed WO." Every tier past the first existed to manage
  consequences that protecting at Start Work removes outright — and a ladder
  invites arguing about which rung applies.
- **Required-field drift gone.** A re-type can now only happen pre-start, and
  **Start Work is itself a gate** — a WO missing a value its layout requires
  cannot be started until it is supplied. Ordinary required-field behaviour at an
  existing gate. (Type itself is never the missing field: it is required and can
  never be cleared, in base or mobile.)
- **A locked-decision tension withdrawn.** That draft argued the drift
  invalidated the stated reason the required-field marker was removed app-wide
  (spec §21/§23). With re-typing confined to pre-start and gated, it does not.
  **§23 stands as written.**

**And the sharp case answers itself.** "What if the new type has no Parts tab but
parts were already issued?" — issued parts moved stock and landed cost, so
"hidden but still there" would be an audit problem, not a UI one. It cannot arise
from mobile activity: issuing parts is Step 3 of a workflow, unreachable without
Start Work, and Start Work protects Type. Same for booked labor and completed
checklist items — all post-Start-Work by construction.

**One narrow residual, still a recommendation:** a planner issues parts *in base*
against a not-yet-started WO, then the technician re-types it on mobile. Proposed
line — **block** the re-type when transactional data (issued parts, booked labor)
would lose its surface; **allow and enumerate** for non-transactional data
(comments, documents). Cheap check, and it almost always passes.

### 7.6.1 Start Work is now the app's commitment boundary — with a punch-list consequence
Five things happen at Start Work (spec §14.11): status moves to the configured
Start Work Status, **Type protects**, **the WO pins to the technician**, **all
child records hydrate**, and — recommended — the **resolved config version is
stamped** on the WO, which doubles as the answer to workflow-config revisioning.
Before Start Work a WO is a candidate; after it, it is this technician's
committed work. Naming the boundary is what makes those five read as one decision
rather than five rules.

Two consequences dev needs, neither previously covered:

- **Starting a WO found by search is a Tier 3 → Tier 1 promotion.** Pin + child
  hydration *is* the promotion, and it fits the existing rule that tiers move up
  only on user intent — Start Work is that intent. Corollary needing a decision:
  **starting a non-hydrated WO requires connectivity**, since its checklist and
  parts lines do not exist locally yet. Recommend requiring it and saying so
  plainly rather than half-starting the WO and discovering the gap at step 2.
- **This is the first device-originated pin, and it is real evidence for
  punch-list Option B (§6.1).** Everything else in the design has pinning
  computed server-side and delivered as a membership list. Start Work pins from
  the device — so a **locally-originated pin must survive a server membership
  list that omits it**, or the next sync silently evicts a WO the technician is
  actively working, which is precisely the loss §6/P2 promises can never happen.
  Option B's `R5PINS` projection already models an originating pin with
  provenance; Option A would need "WOs I have started" expressed in dataspy SQL,
  on the one case where getting it wrong destroys live work. **This was not on
  the table when those options were framed.**

### 7.7 No API contract or field-mapping artifact
Spec §20 already flags that mobile screens **hardcode their own field labels and
boilerplate** — which directly contradicts P5's configuration-driven paradigm.
The gap between "layout is data" and "labels are hardcoded strings" is real dev
work nobody has scoped, and it belongs with the layout/workflow API row in §6.
*(The sizing half of this gap is now closed — see the appendix.)*

---


### 7.8 "Browser-native for contractors" is not deliverable, and was being reported as if it were
**Found 2026-08-25 (user direction), and this one was my error in the earlier
drafts.** The Contractor/BYOD theme asks for browser-native access. The offline
architecture requires a **native React Native app**. I had been mapping the theme
to "the PWA delivery target" — turning an unresolved conflict into a checkmark.

**The contradiction was in the specification itself, not just the deck.** Its
header cell read *"Platform: iOS and Android — responsive PWA"* while §2.2 named
**`op-sqlite`**, which is React Native-only with no browser build. Both could not
be true. Corrected: the spec now states native, with the reasoning in spec §2.2
and the supersession in spec §21.

Four reasons the offline model forces native:
1. **`op-sqlite` has no browser build.** If it is the engine, the question is closed.
2. **WatermelonDB's web adapter cannot serve FTS5.** It runs on LokiJS/IndexedDB,
   and Tier 2 specifies instant offline *contains* search via FTS5 over tens of
   thousands of stub rows.
3. **Background Sync is Chromium-only.** Absent from Safari — so "the outbox
   drains opportunistically whenever a connection exists" could not hold on iOS.
4. **Storage durability.** On iOS, script-writable storage for a non-installed
   site can be evicted, including ITP's 7-day rule. "An unsent edit can never be
   lost" is not a promise a browser tab can make there.

**Not overclaiming:** a browser offline app is not strictly impossible —
`wa-sqlite` over OPFS (Safari 17+) gives real SQLite with FTS5 and persistent
storage. But that is a third engine choice not on the table, Safari still has no
Background Sync, and durability stays weaker. It is a different architecture
decision with real capability loss, not a delivery-target toggle.

**The likely resolution is a distribution question, not an architecture one.**
"Cannot *force* installs" is not the same as "cannot install." An organization
cannot push a managed app via MDM to a device it does not own — but a contractor
can install a public App Store / Play Store app voluntarily. If that satisfies
the requirement, nothing about the architecture changes and the theme is answered
after all. If it does not, every alternative has real cost: a separate thin
online-only browser surface for contractors (a second UI target, which cuts
against the "one unified app" premise), re-opening the engine choice toward
`wa-sqlite`/OPFS, or consciously scoping BYOD out of v1.

**Recommendation: put this on the agenda as an open product question, not a
solved one.** It is the only Medium-priority theme of the five, which makes it a
defensible thing to scope deliberately — and naming it is far better than having
a dev lead point out mid-meeting that `op-sqlite` is React Native-only.
## 8. Tracked debt, rolled up into five themes

Spec §20 has all the rows with full detail; don't re-derive it. These are the themes
worth a slide.

### 8.1 The architecture decision that unblocks two tracks at once
**One 2-file throwaway proof-of-concept decides both** the mobile app's shell
*and* Screen Designer's live emulator. Both need the same thing: whether a parent
and an iframe can script each other, under a local static server **and** raw
`file://`.
- **Option A — iframe shell:** one persistent outer frame, `src` swapped between
  the real standalone files. Closest to "one file per screen, genuinely
  invoked." Risk is `file://` cross-frame scripting; under the served model
  (already decided for real use) there is no cross-origin ambiguity at all.
- **Option B — real navigation:** row taps become real links with identity on
  the query string; full page loads; zero cross-origin risk; identical under
  `file://` and a server. Loses SPA-style transitions, but every screen already
  draws its own persistent-*looking* chrome.

The same mechanism is what lets Screen Designer's emulator be a **real iframe
pointed at the actual mobile screen** (`?designerMode=true&woType=…`) rather than
the hand-built mockup renderer it uses today — which will otherwise silently
drift from the real screens as they evolve. **Build the throwaway first; it is
small and decisive.**

### 8.2 The Activity Checklist A/B is the largest open design question
Paged Prev/Next vs. flick-and-snap scroll. Same focused-item model either way —
one item owns the screen, DOM stays at 3 panels regardless of item count — only
the *transition* differs. It matters because a Route-fanned checklist reaches ~96
or ~624 items on purpose, and paged navigation reads as an endless run of
discrete screens at that scale. Settled through four device rounds: snapping is
JS-owned (CSS `scroll-snap-type` did not fire reliably on iOS), it fires on
deceleration, buttons commit directly, and each item carries a fixed-height
banner that the snap lands on. **Needs a device decision, not a design pass** —
and it amends spec §16.1's locked rule whichever way it goes. The appendix notes the
scroll copy also measures ~1.6× the pager's complexity, which belongs in the
decision rather than being discovered after it.

### 8.3 Shared-component consolidation debt
Three named instances, one pass: WO List hand-copies
`.nav-avatar`/`.bottom-nav`/`.nav-title` CSS that already exists correctly in
`eam-shared.css`; **`renderBottomNav()` does not exist at all** — bottom-nav
markup is hand-copied into every screen, and extracting it is what makes a 4th
nav slot a data row instead of an edit to every file; and WO Closing's status
control and collapsible pattern are screen-local with no shared equivalent.
Worth doing in one pass, as part of wiring navigation rather than after.

### 8.4 Configuration surfaces that assume a destination that does not exist
User Group Setup deep-links to a Home layout designer that isn't built; Home's
quick actions are hardcoded with no authoring surface located; nav-slot binding
storage is a *proposed* table keyed `(user group, sequence)`, not a confirmed
base-EAM object; the curated nav icon set may or may not be authored anywhere;
and the "More" group's Placement has no authoring control. **Added 2026-08-25:**
the Tier 2 projection is now locked as Screen Designer-authored (P2), but there
is no `Indexed` toggle in its right-click field menu and nothing that shows the
declared set or its size budget — the same shape as Placement, a locked rule
whose authoring control is unbuilt. Because the set is now **declared rather than
defaulted**, that missing control matters more than it did: there is no computed
fallback behind it, so an unauthored screen has no indexed columns at all. All
need a call with whoever owns the base schema.

### 8.5 Knock-on effects of the per-group function model
Locking function resolution on the entity rather than a blessed `FUN_CODE`
(spec §26.7) buys per-clone labels and layouts and costs two things: **dataspy sets
become function-resolved**, so two groups bound to different `WSJOBS` clones see
different dataspy options, defaults and favourites in the same "Work" nav slot —
which no list-screen rule accounts for today — and workflow-eligibility
validation becomes necessary. Both were accepted deliberately, not overlooked,
but they are real work.

**A third consequence, surfaced 2026-08-25 by the Tier 2 projection decision
(P2):** dataspy sets are function-resolved, so the Tier 2 index shape is
per-function too. Two groups bound to different `WSJOBS` clones can legitimately
need different indexed columns — an argument for **declaring the `Indexed` set at
the function grain** rather than inventing a Type-independent scope inside Screen
Designer's per-Type flow (§6). The same applies to the configured index scope: two
clones representing different business processes may not want the same rows
indexed either. This argument got *stronger* when the projection moved from
derived to declared — a declared set has to be authored at some explicit grain, so
the grain question can no longer be deferred behind a computed default.

### 8.6 UDS makes the authoring split three-way
Scoped 2026-08-25 (spec §27.4). §26.5.1 draws one line — **definition** in Screen
Designer, **assignment** in User Group Setup. User Defined Screens add a third
role in front of both: **base EAM's own UDS setup defines the screen** (fields,
types, LOVs, required-ness), Screen Designer only *places* the resulting tab
(Visible / Placement / Sequence / Required), and User Group Setup assigns the
configuration as before. Stating that now is cheap; discovering it after someone
has built UDS field authoring into Screen Designer is not — that is exactly the
one-surface violation that retired the Workflow Designer (§7.2).

It also hands User Group Setup a third cross-domain consistency check, and the
strongest one yet: a configuration that places a UDS tab as a **required step**
for a group lacking permission to that tab is a workflow the technician can
neither complete nor skip. A hard dead end, not a warning — and invisible to any
designer working inside a single screen.

---

## 9. Recommended sequence

**The strategic argument:** design has produced a working reference
implementation on a real component system. The cheapest path to a production app
is to **port that component system rather than restart from comps** — which means
the first dev work is architectural (P1/P2 plumbing and the navigation shell),
not screen work. Screens are then config exercises against P7's canonical files,
which is what makes the remaining surface tractable.

1. **Architecture review** — tier-model sign-off and the punch-list decision
   (§6.1). On approval, merge specs per the plan doc.
2. **Decide the §6 items, with owners and dates.** Server-side dataspy
   pre-evaluation is the highest-leverage single one; its timeline sets the floor
   for everything offline.
3. **Timeboxed engine spike** — WatermelonDB vs. op-sqlite, FTS5 confirmation as
   an explicit exit criterion.
4. **The iframe/`postMessage` proof-of-concept (§8.1).** Small, decisive,
   unblocks the compiled shell *and* Screen Designer's emulator. Prove it once,
   apply it twice.
5. **Land the P1/P2 data layer** — `wo_index` + outbox + delta pull + the tier
   state machine. Nothing user-facing is trustworthy before this exists.
6. **Extract the nav shell for real** — `renderBottomNav()`, then §8.3's
   consolidation pass. Before screen porting, not after, so screens are ported
   onto the shell rather than retrofitted.
7. **Port the WO workflow in flow order**, using each canonical file as the
   contract: WO List → WO Record View → Activity Checklist → Issue Parts → Book
   Labor → WO Closing, plus the two WO child tabs.
8. **Port the Equipment track — but note its hard prerequisite.** Equipment's
   record view resolves its layout off **system type**, and base models that as
   **four screens** (Location / Asset / Position / System) plus clones. The
   authoring surface for those four does not exist (§7.5), and **it is a blocker,
   not a parallel task**: build the record view against one hardcoded layout and
   every child tab in §5.2 inherits that assumption. So the Equipment
   screen-design capability in step 10 has to land *before* this step, not
   alongside it — which is the one place the base track is on the critical path.
   Then: Equipment List → Equipment Record View shell
   (the canonical record view, so it pays forward into every other entity) →
   **then its tabs individually.** Per §5.2, **subject to change based on scope;
   highest priority of tabs is Events, Structure, Parts Associated, with others
   coming thereafter.** No hidden design dependency in that set: Events and Parts
   Associated bind to the shared List/Detail container, Structure Details to the
   shared **Structure Tree** — which needs its mount, data source and row action
   parameterized out of the Equipment LOV, plus an additive per-node status dot.
   Do that parameterization once, as part of the Structure Details build, rather
   than forking the tree.
9. **Port the app-shell screens** — Home, Notifications, Sync Status, then the
   real Login and server-configuration screens once designed.
10. **Base track — mostly parallel, with one item on the critical path.** Gated
    on the layout/workflow API. **Pull the Equipment system-type screen-design
    capability forward, ahead of step 8** (§7.5) — everything else here can run
    alongside the mobile port. Screen
    Designer as its own small, independently deployed modern web app, launched by
    the legacy menu item into a new window rather than embedded in it
    (**strangler-fig, not an embed** — embedding modern drag-and-drop in
    decades-old page chrome invites jQuery/z-index collisions for no benefit).
    Session hand-off is the one contract to get right.
11. **Close the design gaps in §5.3 in parallel throughout** — not on the
    critical path, and most are deltas.

**One decision still to take before the deck, because it changes what's on it:**
the checklist A/B (§8.2) — it needs a device, not a session.

---

## 10. Discussion questions for this meeting

- Do we lock WatermelonDB or SQLite/op-sqlite now, or timebox a short spike
  first?
- Punch list: static sync dataspy (group/user level) or PIN projection — and if
  PIN, who owns the base backend?
- What's a realistic timeline for the server-side dataspy pre-evaluation
  capability? Both punch-list Option A and Tier 2 search depend on it.
- **Contractor / BYOD (§7.8) — is self-install from the public app store an
  acceptable answer?** The offline model requires a native app, so browser-native
  access is not on offer. "Cannot force installs" is not the same as "cannot
  install" — if that distinction holds with the customer, this closes. If not, we
  need a product call, because every alternative costs either a second UI target
  or the offline guarantees.
- Any known constraints on background sync, or on storage headroom for a ~35 MB
  index plus cached documents, on the **native** iOS and Android targets?
- **Who owns the JSON API in front of `R5PAGELAYOUT` and the new workflow
  tables?** Configuration-driven screens are load-bearing for the whole design
  and cannot be worked around from the front end.
- Does the team agree with **porting the existing shared component system** rather
  than rebuilding from designs — and with doing the architectural work (data
  layer, navigation shell) before any screen porting?
- On Equipment: does the **Events / Structure / Parts Associated** priority hold
  against dev's own read of scope?
- **Equipment's four system-type layouts are a base-side blocker (§7.5).** Who
  owns extending Screen Designer to author Location / Asset / Position / System
  (plus clones), and can it land ahead of the Equipment mobile port? It needs no
  new column or table, so it should be the cheaper half of the base track.
- **Start Work pins from the device (§7.6.1).** Does that change the punch-list
  A/B read? A locally-originated pin has to survive a server membership list that
  omits it, or the next sync evicts live work — which Option B models natively
  and Option A would have to express in dataspy SQL.
- **Should starting a non-hydrated WO require connectivity (§7.6.1)?** Its
  children don't exist locally yet.
- Who owns the Aptos-vs-Inter production typeface and licensing decision?

---

## 11. Decisions taken on this review (2026-08-25)

| Question | Decision |
| --- | --- |
| What the meeting is for | **Two outcomes, in this order: sign-off on the §6 backend/platform items, then agreement on the §9 build order.** They sequence naturally — §6 sets what's possible, §9 sets what happens first. |
| Workflow Designer v1.1 | **Retired** as a superseded precursor (§7.2). |
| Sizing | **Built, as a separate appendix.** Main slides stay descriptive. |
| Leadership artifact | **One doc.** The July whitepaper's durable content is rolled into this one and the file is retired (§7.1). |
| Equipment scope | **Each tab is its own endeavour** (§5.2), priority Events / Structure / Parts Associated, subject to change based on scope. Equipment is now explicit in the sequence (§9 step 8). |
| User Defined Screens | **Scoped, not designed** (spec §27). **In:** UDS as a tab on Work Order, able to be a numbered gated step via §12's existing tier-2 row, plus one generic definition-driven tab renderer. **Deferred:** standalone UDS destinations (each needs a nav slot and its own full List Search Screen). **Out:** UDS field authoring — base's own UDS setup already owns it, and rebuilding it in Screen Designer repeats the Workflow Designer mistake (§7.2). The UI is cheap; the **offline data/search/write story is the real ask** (§6). |
| Tier 2 index — projection, scope, dataspy handling | **Revised twice on 2026-08-25; this is the settled version.** The projection is **declared** per field in Screen Designer (`Indexed`), never derived from the dataspies — because dataspies are **unbounded and user-authored**, so a computed default would let any saved query reshape every device's index. A dataspy is a **saved filter over that index, classified** offline-capable or online-only, not a pre-evaluated membership list; membership shipping narrows to Tier 1 / the punch list. The **index scope is its own server-side configuration** (open WOs by the lifecycle rule, plus configured extent) — explicitly *not* "All Work Orders", which is unbounded history. Rejected: the union-of-projections default (§21 — costed on a handful of concentric dataspies, does not survive an unbounded set); a static non-configurable card projection (resurrects the filter-chip row §21 retired); a separate mobile-dataspy admin screen (Screen Designer rides Tier 0's `0c` for free). **Residual open items: the authoring grain** (§8.5 argues for function grain), **the index scope's shape**, and **the normalised criteria form** classification depends on — all §6. |

### 11.1 How the dual goal shapes the deck
Because the meeting has to land two things, the narrative should be a single
dependency argument rather than two separate pitches:

1. **Open on §2's Voice of the Customer, then §1's before/after table.** The
   first says why the product exists; the second establishes that design
   produced a working reference implementation — which is what earns the right to
   ask for backend commitments.
2. **P1–P5** — each paradigm's *dev consequence* is the setup for one of the §6
   asks. P1/P2 → the data engine and `wo_index` contract. P2 → the dataspy
   pre-evaluation capability. P5 → the layout/workflow JSON API. Frame the asks
   as *consequences of decisions already made*, not as new requirements.
3. **The §6 asks, with owners and dates requested** — calling out that dataspy
   pre-evaluation sets the floor for everything offline.
4. **Then the build order (§9)** — it follows directly, because the sequence is
   dictated by those dependencies rather than by preference. The screen inventory
   (§4–§5) is the evidence that the back half is tractable, not the centre of the
   deck.
5. **Close on the two things design still owes** (§8.1's PoC, §8.2's checklist
   A/B) so the ask is visibly reciprocal.

### 11.2 Still open — worth deciding before the meeting
- **Is the punch-list A/B presented as open, or with a recommendation?** The spec
  leans B on capability grounds while being explicit that it is real base work.
  Either framing is defensible; pick one so the slide doesn't hedge.
- **Does the "not visually verified on device" caveat (§4.1) go in the deck or
  stay in Q&A?** It builds credibility with this audience but invites a tangent.
- **How much base/admin scope belongs here?** §5.1 above is a different audience's
  concern (base schema owners) and may deserve its own conversation.

---

## 12. Reference artifacts

**Spec and planning**
- `design-decisions-v3-1.md` — **the single source of truth.** The authoritative
  design spec; grep for the section you need rather than reading end to end.
- `EAM-Dev-Leadership-Sizing-Appendix-2026-08-25.md` — measured relative
  per-screen complexity, with the method shown. Relative sizing, explicitly not
  an effort estimate.
- `EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` — the execution/process doc,
  including the compiled-shell and Screen-Designer architecture analysis behind
  §8.1.
- `component-library.md` — the named, human-readable component catalogue.
- `handoffs/EAM-HANDOFF-UX-User-Testing-Brief.md` — the current known-stubs list.
  Use it rather than rediscovering which dead ends are deliberate.

**Architecture**
- *(Removed 2026-08-25: `EAM-Mobile-Offline-Search-Architecture-Summary.md` — retired to `old versions/` because it restated spec §2.3/§2.6/§6.13 and had drifted from them. Its two unique pieces were migrated first: the row-lifecycle state machine into spec §6.13, and the Search & Knowledge sub-themes into §2.1 above. The tiered record model now has exactly two homes — spec §6.13 for the rules, P2 here for the narrative.)*
- `EAM-DESIGN-Pinning-Enhancement-v1.md` — punch-list Option B (`R5PINS`) spec.

**Requirements (source material, not design)**
- `existing_use_cases/` — real requirement docs for Login, Digital Work Home,
  Screen Designer, Standard Model, Settings, Sync Config, Transaction Log.
- `Data_refs/` — real EAM export schemas (Employees, Crews, Stores, Parts,
  Trades, Custom Fields) plus real screen screenshots.

**Prototypes** — `screens.html` at the repo root indexes every screen, reachable
directly. The reference files worth knowing by name:
`screen-layout-field-behavior-prototype-v1.html` (every field type in both
container styles — the build contract for field behaviour),
`eam-equipment-record-view-prototype-v1.html` (the canonical full record view),
`eam-wo-list-prototype-v5_1.html` (the template for any top-level record list),
and `eam-wo-equipment-tab-prototype-v1.html` (the template for any record-view
child tab).

**Retired** — `old versions/project-kickoff-whitepaper-v3.md` (superseded by this
doc, §7.1).
