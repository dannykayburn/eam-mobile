# HxGN EAM Mobile App

Project Kickoff Briefing — Design & Architecture Handoff

> **RETIRED 2026-08-25 — superseded by `docs/EAM-Dev-Leadership-Review-2026-08-25.md`.**
> Kept for history only. Nothing here is current; do not present from it or cite
> it as project status. Its durable content was rolled into the replacement:
> Voice of the Customer → §2, the architecture concepts and the full
> login-to-steady-state lifecycle → §3/§3.9, the punch-list options and
> prerequisites → §6/§6.1, the discussion questions → §10, the artifact index →
> §12. What was *not* carried over, deliberately: the §3 status table and §3.1/
> §3.2 scope lists (stale — they listed WO Insert Mode, Home, Equipment record
> views and login as outstanding design when all were built), the §4
> design-system paragraph (described a purple accent retired by
> design-decisions-v3-1.md §23), and the §7 sequence (its "unified prototype
> compile" step was superseded by real cross-screen navigation).


Audience: Dev Manager, Lead Dev Tech | Date: July 2026 (refreshed 2026-08-25, then retired) | Status: RETIRED

This briefing summarizes where the HxGN EAM (Attune EAM) mobile app stands as it enters development planning: a technician-first, offline-capable work order execution app for iOS and Android. Design of the core work order execution workflow (all five steps) plus the WO List entry point, Home, Equipment record view/list, Insert Mode, Notifications and the sync system is complete, with decisions captured in the HxGN EAM Mobile Design Decisions doc v3.1. The purpose of this kickoff is to align on architecture, agree the open technical decisions — including the punch-list mechanism — and plan the build.

> **Refresh note (2026-08-25).** Sections 1, 2 and 5 are unchanged and still accurate — the Voice-of-the-Customer themes, the architecture, and the prerequisites are as originally written. Sections 3, 4, 7 and 8 have been brought current: the mobile surface roughly doubled since July and consolidated onto a shared component system, and the design-system paragraph described a purple accent that has since been retired. A companion build-planning artifact — `EAM-Dev-Leadership-Review-2026-08-25.md`, with a sizing appendix — carries the screen-by-screen development inventory and the recommended sequence in more detail than belongs here.

# 1. Voice of the Customer — What the SWG Keeps Telling Us

SWG advisory feedback converges on a small set of high-impact themes, and they all point at the same product:

- **Two separate mobile apps (High).** The Digital Work vs. EAM Offline split forces users to learn two applications with different behaviors and navigation, and creates confusion around configuration, capabilities, and licensing. Checklists, documents, and activity timers all behave differently between the two — a major recurring concern across customers.

- **Offline sync reliability (High).** Work is lost if connectivity drops during save; no queue or caching mechanism exists. Users cannot tell sync state or whether a transaction actually landed, which erodes trust in mobile execution.

- **Training dependency (High).** Record-centric workflows demand tribal knowledge; an aging, less-technical workforce needs task-oriented, guided execution.

- **Hybrid connectivity (High).** Customers want online/offline as one continuum — not a mode choice and not an app choice. Strong alignment across customers.

- **Contractor / BYOD access (Medium).** Organizations cannot force app installs on contractor-owned devices; browser-native access is preferred.

Where the SWG converged: one unified, technician-first, hybrid online/offline app with shared licensing and one architecture. The corresponding MVPs on the connected-worker roadmap — Unified Mobile Experience, Hybrid Offline/Online Execution, Guided Workflow, Intelligent Search & Filtering, Personalized Home Screen & Inbox, Mobile Error Handling & Transaction Confidence, and Persona-Based Mobile UX — are exactly what the design and architecture below deliver.

# 2. High-Level Architecture Concepts

## 2.1 Progressive Offline Hydration

The core pattern: the UI always reads from a local database and never waits on the network. Writes go through a persisted outbox regardless of connectivity, so the write path never changes. After launch, data hydrates into the local DB in stages — today’s work orders (~5s), site assets (~15s), lookup tables (~30s), historical documents (90s+) — so the technician is practically offline-capable within about 30 seconds. On reconnect, the outbox flushes in order using idempotency UUIDs, and a delta pull (via a last_synced_at cursor) brings down only what changed; conflicts resolve last-write-wins by timestamp.

## 2.2 The Full Lifecycle — Login to Steady State

- **Server setup (first run only).** The user scans a QR code (organization, tenant, server URL, OIDC endpoints) or keys the values in manually, then tests the connection — same setup model as the current apps.

- **Login.** SSO/OIDC or internal authentication; biometric unlock on return visits. Session tokens are cached so the app can relaunch offline.

- **Hydration starts.** The local DB opens instantly — there is no blocking modal. Staged pulls begin in the background.

- **WO List ready.** Within ~5 seconds the punch-list WOs are on screen; within ~30 seconds the device is practically offline-capable while the search index and lookups keep filling quietly.

- **Steady state.** Delta pulls run on the sync cursor, the search index refreshes, and the outbox drains opportunistically whenever a connection exists.

First run needs connectivity once; every launch after that works fully offline. Note: the server configuration and login screens themselves are on the outstanding design list — the flow above assumes parity with the current apps’ setup model.

**The execution loop.** The technician opens a punch-list WO (Tier 1, already hydrated) and executes the five guided steps. Every save is one transaction: an optimistic local write plus an outbox enqueue, with the dirty flag set in the same transaction — the UI updates instantly. The sync engine drains the outbox in order when connected; the server ack clears dirty and the pending badge drops; the delta pull brings down only what changed. Record state follows a small machine: ephemeral → stub (index sync) → hydrated (demand tap or punch-list sync); hydrated rows LRU-evict back to stubs only when neither pinned nor dirty; ephemeral rows are swept after ~24h; stubs are deleted when the index reports the WO closed. Pinned and dirty hard-block eviction — a punch-list record or an unsent edit can never be lost.

## 2.3 Tiered Record Model — How Offline Search Scales

A fleet-wide search across thousands of 150-field work orders does not need to fully sync every record. The model separates “synced” from “visible” into four tiers:

- **Tier 1 — Work set:** fully hydrated records + children (~20–200 WOs) — the punch list. Never evicted, guaranteed offline-executable.

- **Tier 2 — Search index:** lightweight stub rows (~8–12 fields, ~300 bytes each); tens of thousands of rows cost only tens of MB and support instant offline “contains” search via FTS5.

- **Tier 3 — Demand cache:** a stub tapped while online hydrates on demand, then LRU-evicts back to a stub — “a technician’s own work is sacred; everything else is best-effort.”

- **Tier 4 — Server search:** an online-only escalation to full server-side search across all ~150 fields, reusing the existing dataspy SQL search API.

The real scaling limits are document payload size and sync volume over time — not row count — and both are already addressed by the delta-pull cursor.

Key safety rules already decided (full set in Design Decisions doc, Section 16): online search results are written into the local DB as ephemeral rows so the UI never reads from the network directly; a server-search upsert may refresh summary fields but never touches hydration, pinned, dirty, or the full payload; tiers move up only via user intent and down only via explicit LRU/sweep, hard-blocked whenever a row is pinned or dirty; and row identity never changes across the lifecycle, which is what lets mixed-origin rows coexist in one grid with no special-casing.

## 2.4 The Punch List — What Downloads to This Device?

Tier 1 is defined by a per-user punch list of work orders. **The mechanism that produces that list is an open decision for this team — two candidate options:**

**Option A — Static sync dataspy.** A configured dataspy defines the punch list, set at the user-group level and overridable down to a specific user. Advantages: zero new base schema; admins already know how to build dataspies; the security model already governs them; the server-side dataspy pre-evaluation capability (needed for Tier 2 anyway) delivers it. Trade-offs: assignment logic gets re-derived in dataspy SQL per customer; no provenance on why a WO is in the list; nothing reusable for the personalized home screen, supervisor views, or notifications.

**Option B — PIN (R5PINS) projection.** A materialized projection of the existing assignment sources (assigned-to, activity schedules, resource scheduling, dispatch, manual pins) into one table with provenance — not a new source of truth; existing mechanisms stay untouched, and manual pinning is the only case where a pin originates rather than reflects. Pin relationship types are system-owned and small (EXEC, OVERSIGHT, WATCHER), with a hydration quota on EXEC pins only (~150, configurable). The rule if chosen: “Hydrate open records where I hold an EXEC-class pin; index everything else I’m pinned to.” Advantages: assignment resolved once and consistently; automatic lifecycle (a pin lives as long as any source says it should); a common backing store for the personalized home screen, supervisor team-backlog views, watch/notification enrollment, and selective offline sync. Trade-offs: real base-EAM work — a new table plus migration, app-layer transactional hooks (explicitly not DB triggers), an async diff job for dataspy-defined custom types, and a set of open design decisions (EXEC quota and enforcement UX, cascade opt-in granularity, USR↔PER edge cases, v1 entity scope, and the “pin” naming collision with the device eviction flag).

**Either way, the device-side contract is identical:** a WO-ID membership list arrives at sync time and stamps pinned = 1 on wo_index rows. The tiers, eviction rules, and device behavior do not change with the choice — the mobile build does not block on this decision.

# 3. Where Design Stands Today

**15 mobile screens now exist as connected, navigable prototypes**, all on a single shared component system (`eam-shared.css` ~2.1k lines + `eam-shared.js` ~4.4k lines), with real cross-screen navigation end to end and persisted state across three seeded demo work orders. That is the material change since July: the output is no longer a set of screen designs but a specification plus a working reference implementation.

| Screen / Component | Step | Status |
| --- | --- | --- |
| WO Record View | Step 1 | Design complete — the largest screen in the app; header fields grid, activity selector, Route/MEC pill, Equipment lookup + photo, Custom Fields |
| Activity Checklist | Step 2 | Design complete — "Focused Stepper," 17 item types, dynamic follow-on items, per-item Notes/Comments/Documents, equipment fan-out. **One open question: a live A/B between paged Prev/Next and flick-and-snap scroll navigation, pending a device decision** |
| Issue Parts | Step 3 | Design complete (prototype v1) |
| Book Labor | Step 4 | Design complete (prototype v2) — decisions locked, data-driven off real employee/crew exports |
| WO Closing | Step 5 | Design complete (prototype v2) — decisions locked |
| WO List + Search | Entry point | Design complete (prototype v5.1) — dataspy scoping, dual view modes, all six filter chips and sort live. **The template for every top-level record list** |
| WO child tabs (Equipment, Reference) | — | Design complete — the template for any record-view child tab; the WO Equipment tab mints real Multiple-Equipment-Child work orders |
| Home | App shell | Layout mechanics complete and locked. **Tile/chip content is a deliberately open design riff** — do not build to today's tiles |
| Equipment Record View + Equipment List | Standard model | Design complete — Equipment Record View is the canonical full-record-view reference (11 tabs); each new record view is a delta against it |
| Insert Mode | Standard model | Design complete — one shared implementation behind every Create entry point; renders the record's own screen design and varies by Type |
| Notifications | App shell | Design complete, modeled on real `R5MAILEVENTS`. **Open: that table has no read/unread column**, which the screen's All/Unread filter depends on |
| Sync system + Sync Status Screen | App shell | Design complete — four-state nav control, sync panel, full status screen, shared trouble-field surfacing |
| Custom Fields | Standard model | Built for both WO and Equipment record views, sourced from real export data |
| Screen Designer / User Group Setup | Base EAM | Prototyped — the known base work today. See §3.2 |
| Unified prototype compile | Compile | **Superseded by real cross-screen navigation**, which now works end to end. What remains is an architecture decision, not an assembly job — see §7 |
| Offline search architecture | Backend | Concept complete — search design decisions merged into the Design Decisions doc; tier-model spec pending review. Punch-list mechanism (Option A vs. B) undecided |

**One caveat worth stating plainly:** "design complete" means navigable, on the shared component system, with decisions locked and rationale recorded, verified by static review and headless execution. It does **not** mean visually reviewed on a device — layout, contrast, tap-target size and animation are genuinely unverified on most screens (the Activity Checklist is the exception, at four device rounds). Known stubs are catalogued in `handoffs/EAM-HANDOFF-UX-User-Testing-Brief.md` §4.

## 3.1 Full Mobile Scope — Outstanding Design

Beyond the designed surface above, what remains splits into two very different cost profiles — which is the useful cut for planning.

**Real design work owed.** Each of these needs a design pass before development:

- Server configuration / first-run setup (QR scan of organization, tenant, server URL and OIDC endpoints, or manual entry, plus a connection test). Assumed at parity with the current apps; never designed.

- Login — a placeholder exists in the prototype and taps straight through. A requirements doc exists (`existing_use_cases/EAM.DUX.REQ.Login.docx`).

- Activity Screen (timer, task plan reference, assignment status).

- Profile screen contents, including the technician's own avatar photo — today's nav-bar icon adds little real value on mobile.

- Structure Details tab — a tree, not a row list; no pattern exists for it yet.

- **Settings, Sync Config and Transaction Log** — requirements docs exist in `existing_use_cases/` and no design has started. These three appear in the requirement set but were absent from earlier status reporting; flagged here so they are not discovered late.

**Cheap, because they are deltas against an existing canonical file** — a configuration exercise rather than a design exercise:

- Equipment's eight child list/detail tabs — the shell and configuration pattern exist; today they all render the same demo record's content regardless of which asset was opened.

- Standard Update Mode for other non-WO entities — Equipment Record View is the pattern; each additional entity is a field-set exercise.

- Home's remaining system-action entities (Meter Reading, Work Request, Operator Checklist, possibly Batch Book Labor, Hours Worked, Permit to Work). Each needs one call: full Insert Mode, or a lighter action sheet.

- Sort on each list screen's Search sub-screen — a markup gap only; the shared sort sheet already re-renders both.

**Specified but deliberately unbuilt, because it needs development input rather than a design pass:** the WO List per-row hydration affordance and offline freshness caption. What a row can honestly claim about its freshness depends on how the real sync and index layer behaves, so designing it in isolation would be guesswork.

## 3.2 Base EAM Work

The known base-EAM work is the **workflow and layout configuration surface** — prototyped as two screens plus a design-language reference:

- **Screen Designer** — authors per-field layout for the standard model and, via a WO Type selector, the workflow step sequence the mobile app executes. One surface covers both workflow-driven and non-workflow screens; there is deliberately no separate workflow-authoring screen.

- **User Group Setup** — a *binding* screen rather than a configuration form. Bottom-nav slots and sync scope are real assignment grids; screen design and Home layout summarise and deep-link into their own authoring surfaces. It also runs the cross-domain consistency checks no single designer can — nav slot against function permissions, nav slot against assigned configurations.

Three things in this track do **not** exist yet and are real scope: a **Home layout designer** (User Group Setup deep-links to it), a **Home quick-action configuration surface** (which actions appear on Home is hardcoded today, and the base screen that should own it has not been located or named), and **workflow-eligibility validation** — enabling the workflow on a function must check that the tabs its step set requires are present and permitted for the target user groups, and refuse or warn when they are not.

Two decisions in this track need the base schema owner rather than design: the **nav-slot binding storage** (proposed as a small table keyed by user group and sequence — a proposal, not a confirmed base object), and whether the curated nav icon set is authored anywhere or hardcoded.

**One material change since July.** Work-order functions are already cloned in this environment — this customer runs four `WSJOBS` clones as distinct business processes — so workflow eligibility resolves on the **entity** (`FUN_RENTITY = EVNT`), never on a blessed function code, and is opted in **per user group**. That buys the per-clone labels, boilerplate and field layouts those clones exist for, and costs two things worth knowing: dataspy sets become function-resolved, so two user groups bound to different clones see different dataspy options, defaults and favourites behind the same nav slot; and the eligibility validation above becomes necessary. Both were accepted deliberately.

The punch-list Option B backend (R5PINS table, hooks, diff job) would be additional base scope only if that option is chosen.

# 4. The Design System in Brief

The selected direction is Industrial Neutral: dark slate chrome with light body content — a digital work permit, not a consumer app — with full dark mode on Octave Black. All colours come from the Octave extended palette; Inter stands in for the Microsoft-proprietary Aptos in prototypes, with JetBrains Mono for work order numbers, part numbers and timestamps.

**Colour is treated as a small set of named instruments, not decoration.** Two are core — record status and sync state — plus three narrowly scoped additions: the fill on an editable pill, the WO Type colour-and-icon badge (one curated colour per Type, reused identically across the Type field, the WO List row and the workflow step rail), and Priority High. Everything else is monochrome. Identifiers are always mono and never tinted; icons and chips are outlined rather than filled. Home is the one deliberate, named exception, where tile and favourite icons keep real colour. *(Two earlier accents have since been retired: purple as a UI-state accent, and the static required-field marker — every required field's own editor already blocks clearing it, so the marker warned about a state that cannot occur. Insert Mode is the one documented exception, since a blank form has nothing to clear yet.)*

**Two structural decisions do more work than any visual rule.** First, there is **no view/edit mode split** — no Edit button and no form mode; every editable field is tapped in place and edits through a bottom sheet. This is the biggest departure from the legacy apps and the biggest per-field build cost, since every field becomes a live control with its own editor, validation and optimistic-write path. Second, **every generic component lives in the shared system by default**, screen-local only until a real second consumer appears — which is why the prototype is already a component inventory of 20-plus named components with locked rules, browsable by name in `component-library.md`.

Beyond that, a small set of locked cross-cutting patterns keeps every screen consistent: LOV rows are description-first, with the code small and muted; every sheet's Save button gates gray-to-green on required-field completeness; field values always render in body colour; there are no blocking modals, since progressive hydration replaced the launch modal entirely; and button placement follows a deterministic rule rather than a judgement call — a row-scoped action becomes an inline Action Row, and every other button is a header action in the vertical ellipsis, even when it sits on a tab.

**Workflow gating is forward-only.** A later step stays locked and explains itself, but a completed step is always reopenable. A mistyped reading or wrongly booked hours has to be correctable, or the only options left are abandoning the work order or leaving bad data in the system of record — which no workflow configuration intends.


# 5. Prerequisites to Start Development

| Area | Decisions / work needed |
| --- | --- |
| **Local data engine** | Final selection: WatermelonDB vs. SQLite (op-sqlite) — currently a recommendation, not a decision. Confirm FTS5 availability in the chosen engine’s build (required for offline search). |
| **wo_index schema** | Finalize lifecycle columns (hydration, pinned, source, dirty — counter vs. boolean undecided — and the two clock domains last_synced_at vs. fetched_at) and the full_payload JSON blob approach. Define the outbox idempotency-UUID scheme with the API team. Confirm the delta-pull (last_synced_at cursor) contract exists today or needs to be built. |
| **Punch-list mechanism** | Decide Option A (static sync dataspy at user-group / user level) vs. Option B (PIN projection). Option A is delivered by the dataspy pre-evaluation capability below. Option B adds base work: R5PINS table + migration (pin_user/pin_employee, pin_entity/record/org, pin_type → pin_rtype, pin_sourceref, pin_watch, pin_expiration), app-layer transactional hooks for system pin types (explicitly not DB triggers), async diff job + scheduler for dataspy-defined custom types — plus open decisions: status-class config home, cascade opt-in granularity, EXEC quota default (~150) and enforcement UX, USR↔PER edge cases, v1 entity scope, and resolving the “pin” naming double meaning before it lands in API/UI strings. |
| **Server-side search** | New capability: pre-evaluate saved dataspies at sync time and return WO-ID membership alongside the index — this also delivers punch-list Option A. Confirm the existing dataspy SQL search API can serve as the Tier 4 online-escalation path as-is. |
| **Base EAM work** | The workflow and layout configuration surface — Screen Designer plus User Group Setup (both prototyped), defining per-field layout and the per-WO-Type step sequence. Adds three unbuilt surfaces (Home layout designer, Home quick-action configuration, workflow-eligibility validation) and two schema decisions for the base owner (nav-slot binding storage; whether the nav icon set is authored or hardcoded). A real JSON API in front of `R5PAGELAYOUT` and the workflow tables is required — the legacy framework's server-side postback forms cannot serve it. PIN backend is additional base scope only if Option B is chosen. See §3.2. |
| **Outstanding design work** | Server configuration and login; Activity Screen; profile screen; Structure Details tree; Settings, Sync Config and Transaction Log. Plus the cheap deltas — Equipment's child tabs, Standard Update Mode for further entities, Home's remaining system actions, and sort on each Search sub-screen. WO List's row hydration affordance and freshness caption need development input rather than a design pass. See §3.1. |
| **Navigation architecture** | Decide the app shell: a persistent iframe shell versus real page-to-page navigation with record identity on the query string. Settled by one small proof-of-concept, which also decides whether Screen Designer's live emulator can point at the real mobile screens. See §7. |
| **Platform ****&**** tooling** | Confirm background-sync and storage-quota behavior for the offline PWA on iOS Safari — a known platform risk area. Production typeface decision: Aptos (brand, Microsoft-proprietary) vs. Inter (prototype stand-in) — licensing owner needed. |

# 6. Discussion Questions for This Kickoff

- Do we lock WatermelonDB or SQLite/op-sqlite now, or timebox a short spike first?

- Punch list: static sync dataspy (group/user level) or PIN projection — and if PIN, who owns the base backend?

- What's a realistic timeline for the server-side dataspy pre-evaluation capability? Both punch-list Option A and Tier 2 search depend on it, so it sets the floor for everything offline.

- Any known constraints on background sync / storage quota for an offline-first PWA on iOS Safari?

- Does the team agree with porting the existing shared component system rather than rebuilding from designs — and with doing the architectural work (data layer, navigation shell) before any screen porting?

- Who owns the JSON API in front of `R5PAGELAYOUT` and the new workflow tables? Configuration-driven screens are load-bearing for the whole design and cannot be worked around from the front end.

- Who owns the Aptos-vs-Inter production typeface and licensing decision?

# 7. Proposed Sequence

The order below is dictated by dependencies, not preference. The strategic argument: design has produced a working reference implementation on a real component system, so the cheapest path to a production app is to **port that component system rather than restart from comps** — which means the first development work is architectural, not screen work. Screens afterwards are configuration exercises against the canonical reference files, which is what makes the remaining surface tractable.

- **Architecture review** — tier-model sign-off and the punch-list mechanism decision (Option A vs. Option B); on approval, merge specs per the plan in the Design Decisions doc.

- **Engine spike** — timeboxed WatermelonDB vs. op-sqlite evaluation, with FTS5 confirmation as an explicit exit criterion.

- **One throwaway proof-of-concept, which unblocks two tracks at once.** *(This replaces the "unified prototype compile" item from the July sequence — real cross-screen navigation now works end to end, so what is left is an architecture decision rather than an assembly job.)* Two shell files, testing whether a parent page and an iframe can script each other under both a local static server and raw `file://`. The answer decides the mobile app's navigation shell — a persistent iframe shell versus real page-to-page navigation with record identity on the query string — **and** whether Screen Designer's live emulator can be a real iframe pointed at the actual mobile screen rather than the hand-built mockup renderer it uses today, which will otherwise silently drift from the real screens as they evolve. Small and decisive; prove it once, apply it twice.

- **The data layer** — `wo_index`, the outbox, the delta pull and the tier state machine. Nothing user-facing is trustworthy before this exists.

- **Extract the navigation shell for real** — the bottom nav is hand-copied into every screen today with no shared renderer, and extracting it is what makes a fourth nav slot a data row instead of an edit to every file. Do this *before* screen porting, so screens are ported onto the shell rather than retrofitted onto it. Fold in the related consolidation debt in the same pass.

- **Server & base capabilities** — dataspy pre-evaluation at sync time (the highest-leverage single backend item: punch-list Option A *and* Tier 2 search both depend on it, so its timeline sets the floor for everything offline); Tier 4 API confirmation; the JSON API in front of `R5PAGELAYOUT` and the workflow tables; the PIN backend if Option B is chosen.

- **Port screens in workflow order**, using each canonical reference file as the contract: WO List, WO Record View, Activity Checklist, Issue Parts, Book Labor, WO Closing — then Equipment List and Equipment Record View, then Home, Notifications and Sync Status. Good candidates for the *first* port are the smallest, most configuration-heavy screens, which prove the component-library approach end to end at minimum risk.

- **Base track in parallel, gated on the API** — Screen Designer as its own small, independently deployed modern web app, launched by the legacy menu item into a new window rather than embedded in it. Embedding modern drag-and-drop and a live preview inside decades-old page chrome invites CSS and JS global-scope collisions for no benefit; a separate window sidesteps all of it. Session hand-off is the one contract to get right.

- **Remaining design in parallel throughout** — Activity Screen, server configuration and login, profile, Structure Details, Settings/Sync Config/Transaction Log, and the base-track authoring surfaces. None are on the critical path, and most of the mobile ones are deltas against an existing canonical file.

# 8. Reference Artifacts

**Current status and planning**

- `design-decisions-v3-1.md` — the single source of truth. The authoritative design spec; grep for the section you need rather than reading end to end.

- `EAM-Dev-Leadership-Review-2026-08-25.md` — build-planning companion to this briefing: design paradigms with their development consequences, the screen-by-screen inventory of what is built and what remains, and the gap analysis behind §3 above.

- `EAM-Dev-Leadership-Sizing-Appendix-2026-08-25.md` — measured relative complexity per screen, with the method shown. Relative sizing, explicitly not an effort estimate.

- `EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` — the execution/process doc: what to build in what order, and the compiled-shell and Screen-Designer architecture analysis behind §7.

- `component-library.md` — the named, human-readable component catalogue.

- `handoffs/EAM-HANDOFF-UX-User-Testing-Brief.md` — the current known-stubs list. Use it rather than rediscovering which dead ends are deliberate.

**Architecture**

- `EAM-Mobile-Offline-Search-Architecture-Summary.md` — tiered record model.

- `EAM-DESIGN-Pinning-Enhancement-v1.md` — punch-list Option B (R5PINS) specification.

**Prototypes** — `screens.html` at the repo root is the index to every screen, reachable directly. The reference files worth knowing by name: `screen-layout-field-behavior-prototype-v1.html` (every field type, in both container styles — the build contract for field behaviour), `eam-equipment-record-view-prototype-v1.html` (the canonical full record view), `eam-wo-list-prototype-v5_1.html` (the template for any top-level record list), and `eam-wo-equipment-tab-prototype-v1.html` (the template for any record-view child tab).
End of briefing