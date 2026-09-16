# HxGN EAM Mobile — Project Requirements (one-pager)

**What this is:** the product-level requirements the design answers to — the
things that would still be true if every screen were redrawn. **What this is
not:** per-screen or per-field design decisions (those live in
`design-decisions-v3-1.md`), status (`EAM-Dev-Leadership-Review-2026-08-25.md`),
or sequence (`EAM-REBUILD-Strategy-and-Execution-Plan-v1.md`). Requirement lines
carry a `§` pointer instead of restating rationale.

Sources: SWG Voice-of-the-Customer themes + connected-worker roadmap MVPs
(review §2), the user-given requirements **R1–R6** (2026-09-03), and the eight
locked design paradigms (review §3).

**Two scope decisions, 2026-09-08:** **R1's online-first model is locked** and is
what v1 is built against (spec §2.1). **R2 (GIS / maps) is Phase 2** — held as a
real requirement and an option, deliberately not in the v1 build (spec §28).

### R1–R6, as testable statements

Given by the user 2026-09-03, and **this is their home** — the decision brief
that first recorded them was rolled up and retired 2026-09-08 (spec §21). Stated
so each can be *checked* rather than agreed with in principle.

| # | Requirement | Testable form | Status |
| --- | --- | --- | --- |
| **R1** | Online-first, with offline capability for transactions of **only specific entities** | The set of entities that accept an offline write is **declared and enumerable**, and is a small subset of what the app can read | **Locked** — spec §2.1/§2.7; ~7 write shapes |
| **R2** | Handle GIS maps (ArcGIS and others — OSM etc.) | The app renders EAM records against a basemap and supports what the existing product already supports, offline included | **Phase 2** — spec §28 |
| **R3** | Configurable page layout | Answered by Tier 0 `0c`. Extension owed: a map must be *placeable* by Screen Designer | Layout **locked**; map placement Phase 2 |
| **R4** | Honours existing dataspy/grid paradigms for searching and returning records | A dataspy returns the same rows on mobile as on desktop, **or the app says why not** | **Locked, and improved** — dataspies run server-side at full fidelity (spec §6.13) |
| **R5** | Downloads are non-modal; the user can manually bring a record offline ("cache this so I can keep working") | No blocking modal; a per-record "keep offline" action exists; progress is visible in an **existing** surface | Specified, **unbuilt** — 3 small UI pieces owed (spec §20) |
| **R6** | Handle sync error discrepancies easily from the device | Every failed write is inspectable and actionable on-device, and **no write is ever silently discarded** | Surface exists; **the guarantee is new** — LWW withdrawn (spec §2.5) |

**The problem statement behind them, in the user's words:** the current
fully-offline app downloads so much that it causes performance issues and
crashes. Worth keeping in view — it is the reason R1 reads the way it does, and
the test any offline-scope proposal has to pass.

---

## 1. Offline & connectivity behavior

- **One app, one continuum.** Online/offline is not a mode, not a mode chooser,
  and not two applications. No screen in the product asks the technician which
  one they are in. *(VoC "Hybrid connectivity", High.)*
- **Online-first reads, with the local store as a scoped fallback** — never a
  replica of the whole database. **Locked 2026-09-08**, reversing the offline-first
  polarity the design carried from July 2026. *(R1; spec §2.1, supersession in
  §21.)*
- **Database-wide record search does not work offline.** Offline search covers the
  work set plus what the technician cached, and **says so**. This is the single
  question the offline model turns on, and it is answered. *(Spec §2.1/§6.13.)*
- **Dataspies run server-side at full fidelity** — all fields, all joins, all
  predicates, identical to desktop. **R4 is satisfied rather than compromised**,
  and this is the one place the online-first decision makes the product better
  rather than cheaper. *(Spec §6.13.)*
- **Offline transaction capability is declared and enumerable**, and covers only
  a small subset of the entities the app can read: **~7 write shapes** (WO status
  / step state, checklist results, labor bookings, part issues, meter readings,
  comments, attachments). A per-entity conflict UI is buildable for seven and not
  for sixty — **R6 is only tractable because of this.** *(R1; spec §2.4/§2.7.)*
- **Both "what downloads" and "what still works" are enumerated, not described.**
  Every entity carries a policy — `server-only` / `reference` / `on-demand` /
  `work-set` / `external-replica` — and every work-execution action carries one
  of five states (`allowed` / `queued` / `substituted` / `blocked-visible` /
  `blocked-hidden`). Entity policy is **customer-configured scope**; action
  capability is a **product-declared architectural fact**, versioned with the app
  and not admin-editable. *(Spec §2.7 and §2.9.)*
- **What reaches the device is declared per entity with platform-enforced caps**,
  plus **reachability traversal** — a root pulls its children and its declared
  depth-1 references, and **references are terminal by default.** Caps are limits,
  not guidance: a device ceiling, a per-entity row cap, per-collection traversal
  caps, filters on indexed columns only, ≥1 filter per entity with "all records"
  refused, and an offline-incapable entity list enforced at authoring time.
  *(Spec §2.3/§2.7.)*
- **"Offline" is provisioned, not chosen.** It decomposes into three layers —
  Tier 0 config always persisted, the outbox always on, **record replication as
  the only switchable layer** — assigned as a named **offline profile** on User
  Group Setup, with "none" as the off state. An admin-provisioned capability
  that is invisible to the technician and fixed for the session is
  **provisioning, not a mode.** *(Spec §2.10.)*
- **One write path, byte-identical online and offline.** There is no "offline
  mode" branch — one path plus a sync engine. *(P1.)*
- **An unsent edit can never be lost.** Every write lands in a persisted outbox
  in the same transaction that sets the dirty flag, and survives app kill.
  *(P1; a hard driver of the native platform target.)*
- **No write is ever silently discarded.** Last-write-wins is **withdrawn**
  (locked 2026-09-08) — it is silently lossy and directly contradicts R6.
  Conflicts resolve **per write shape**: state machines reject and surface,
  field edits surface both values and let the technician choose, appends cannot
  conflict, inserts ride the idempotency UUID. *(R6; spec §2.5.)*
- **Every failed write is inspectable and actionable on the device**, not only
  from a back office. *(R6; trouble-field banner + Sync Status Screen.)*
- **Sync state is always visible and honest.** The technician can tell whether a
  transaction actually landed. *(VoC "Offline sync reliability", High.)*
- **Downloads are non-modal, and manual caching exists.** No blocking modal
  anywhere; a per-record "keep this offline so I can keep working" action, with
  progress surfaced in an existing screen rather than a new one. *(R5.)*
- **Bootstrap configuration is a prerequisite, not a tier.** Records degrade
  gracefully (fewer rows = shorter list); configuration does not (a missing
  layout is a blank screen). Fetched inside the login round-trip, persisted,
  versioned per domain, exempt from eviction. *(§2.3 / Tier 0.)*
- **The write path stays disabled until status authorizations are present** — a
  systematically wrong authorization set is worse than a blocked one under
  optimistic UI. *(§2.3 consequence 3.)*
- **Lookups resolve three different ways offline**, split by cardinality and
  dependency rather than by reachability: bounded code domains **replicate
  whole**; unbounded entity lookups (Equipment, Parts) derive from **what is
  already on the device, with the scope announced**; and values whose selection
  **re-resolves configuration** (WO Type, Equipment system type, Class, Status)
  are pickable only if that configuration is present. **Never a silent short
  list** — a short list looks like correct data. *(Spec §2.8.)*
- **GIS maps are Phase 2** (scoped 2026-09-08) — a real requirement, held as an
  option and out of the v1 build. What is already settled and must not be
  re-litigated: it is an **editor, not a viewer** (parity is the expensive
  answer, and the viewer reduction does not exist); it is a **second sync
  engine** with its own error surface, never routed through the EAM outbox; and
  its offline unit is a **per-map-area download**, not an app mode. *(R2; spec
  §28.)*
- **Native app, and that is a consequence rather than a preference** — the
  outbox and storage durability are not promises a browser tab can make on iOS.
  **Contractor/BYOD is now narrowed to the install**: a contractor with no
  offline profile is an online-only user of the one unified app, with no
  customer data at rest on an unmanaged device. *(Spec §2.2/§2.10.)*
- **The question to instrument rather than re-decide:** how often does a
  technician need a record that is not on their device, while offline? Nobody
  has that number, the answer is what would justify re-adding a database-wide
  index,
  and the schema is shaped so that re-adding one stays additive. *(Spec §20.)*

## 2. UI/UX

- **No view/edit mode split.** No Edit button, no form mode. Every editable
  field is tapped in place and edits through a bottom sheet. *(§5.1 / P3 — the
  core interaction decision, and the biggest departure from both legacy apps.)*
- **No required-field markers outside Insert Mode**, because required fields
  simply cannot be cleared. Insert Mode is the one documented exception — a
  blank form has nothing to clear yet. *(§9.8/§23.)*
- **No blocking modals anywhere.** The UI never waits on the network;
  progressive hydration replaced the launch modal entirely. *(P1/P8.)*
- **Guided execution over record navigation.** The technician's primary object is
  a workflow, not a record: step rail, timer, per-step bottom bar. *(P4; VoC
  "Training dependency", High.)*
- **Gating is forward-only.** A later step stays locked and explains itself; a
  completed step is *always* reopenable, because a mistyped reading has to be
  correctable without abandoning the WO. *(§14.10, locked.)*
- **Standard Model plus deltas, never per-screen design.** Two canonical
  reference files define every field type in both containers and the full record
  view; every other screen is a delta. A new screen is a config exercise.
  *(P7/§5.2/§5.3.)*
- **One shared component system**, named and browsable, so "what do we call this
  thing" is not re-litigated per screen. Generic component → shared by default;
  screen-local only until a real second consumer. *(P6, `component-library.md`.)*
- **Placement is deterministic, so nothing needs a design review.** Row-scoped
  (base errors "Record must be selected") → Action Row; *every* other button is
  a header action in the ellipsis, even on a tab. Plus is Insert Mode only.
  *(§8.4, app-wide.)*
- **Colour is a closed instrument set**, not a palette: status and sync, plus
  three narrowly-scoped additions. Everything else monochrome; identifiers mono
  and never tinted. Home is the one named exception. *(§23.)*
- **The device is a real constraint, not a viewport size.** Typed input uses
  ✕/✓ in the top corners — never a control at a sheet's bottom edge, which
  collides with iOS's own keyboard accessory bar — and the app must render
  correctly across device screen sizes. *(§3.4.)*
- **One create path.** Insert Mode, always locked to an entity before it opens,
  with the entity shown as a protected badge. *(§9.6/§9.7.)*
- **One search standard per list screen** — dataspy bar, filter chips, sort,
  Search screen — reused rather than redesigned. *(§8.3.)*
- **Search must tolerate how people actually type:** partial values and keywords
  across several fields, not exact syntax and formatting. *(VoC "Search
  flexibility", High; Intelligent Search MVP.)*
- **Personalized Home and a notification inbox are in scope** as first-class
  surfaces, not settings screens. *(Roadmap MVPs; §9.4/§25.)*
- **Being offline never changes field behaviour.** Nothing becomes Protected
  because the device lost signal — field state resolves from page layout, which
  is identical online and offline. Degradation is a data story, not a
  field-state story. **What may narrow is an *action***, and only when the
  server's answer cannot be deferred — visibly, with a stated reason, and
  preferring a degraded equivalent over a disabled control over an absent one.
  *(Spec §2.9, researched against six comparable products.)*

## 3. Workflow & Screen Designer (base configuration)

- **Layout is data, not code** — which fields appear, in what order, required or
  not, *and which workflow steps exist* all come from base-EAM configuration.
  *(P5/§11–§13.)*
- **The app mints no new `FUN_CODE`s.** Function resolution switches on the
  entity (`FUN_RENTITY = EVNT`), never on one blessed function — this customer
  already runs four `WSJOBS` clones as distinct business processes.
  *(§26.2/§26.7, locked.)*
- **Workflow is opted in per user group**, so the same function can present as a
  five-step gated flow to one group and a looser three-step one to another, with
  no code difference. *(§26.)*
- **WO resolves on `PLO_PAGENAME × PLO_USERGROUP × PLO_WOTYPE`** — a new
  `PLO_WOTYPE` column plus two WO Workflow tables. *(§11–§13.)*
- **Equipment resolves the same way off system type, and costs less** — its four
  system types already *are* four `PLO_PAGENAME` values, so no new column and no
  new table. Four base screens collapse into one mobile surface: pick an asset,
  then a position, and the record view re-renders under a different layout
  without navigating anywhere. *(§26.8.)*
- **A tab is either a numbered step or a More entry, never both**, or forward
  gating is bypassable in two taps. *(§12/§14.8.)*
- **Configuration decides step membership, including for customer-authored
  screens.** A User Defined Screen tab can be a numbered, gated, Required step —
  no new placement model. A **standalone** UDS is permanently online-only.
  *(§27.)*
- **Placement governs what downloads, not just what displays** (2026-09-08). A
  UDS child tab is replicated to the device **iff it is placed** in the resolved
  layout, so the authoring control that decides Step-vs-More also decides device
  payload. *(§27.5.)*
- **Layout decides what is *displayed*, never what *exists*.** *(§13.5.)*
- **Type is protected at its commitment point, not at insert.** WO Type is
  editable while the WO is not started (confirm → immediate commit → re-render)
  and **Protected from Start Work onward, no exceptions and no permission
  escape**; Equipment's system type is **Protected in update mode, always**. One
  paradigm, two trigger points. *(§13.5/§26.8, locked 2026-08-25.)*
- **Configuration is versioned, and a WO in flight finishes on the shape it
  started with** — pin the resolved config version at Start Work. *(Proposal,
  not locked; §2.3 consequence 4.)*
- **One authoring surface: Screen Designer.** A second workflow-authoring screen
  was built and retired for contradicting this. *(§10/§21.)*
- **User Group Setup binds, it does not configure.** Assignment only — never
  steps, gating or layout — and assign is not copy. *(§26.5.1.)*
- **UDS authoring is three-way and stays split:** base UDS setup defines the
  fields, Screen Designer places the tab, User Group Setup assigns it. Building
  field authoring into Screen Designer repeats the retired Workflow Designer
  mistake. *(§27.)*
- **A real JSON API in front of `R5PAGELAYOUT` and the workflow tables is
  required**, serving both the app and Screen Designer — the legacy framework's
  server-side postback forms cannot. It must also serve Equipment's four
  system-type layouts and UDS definitions. *(Review §6.)*
- **A map has to be placeable by Screen Designer**, not hardcoded into a screen —
  **Phase 2, with one v1 consequence:** the map tab is the same generic
  definition-driven renderer UDS already needs, so keep that renderer generic
  when it is built. *(R3 extension; spec §28.7 item 4.)*
- **Known missing authoring controls**, each blocking something downstream: no
  `Placement` control (and it now governs device payload, not just display), no
  authoring surface for Equipment's four system-type layouts, no way to compose
  an offline profile, and no admin screen for Home's quick actions. *(§20.)*
