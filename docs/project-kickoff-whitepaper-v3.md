# HxGN EAM Mobile App

Project Kickoff Briefing — Design & Architecture Handoff

Audience: Dev Manager, Lead Dev Tech | Date: July 2026 | Status: Development kickoff

This briefing summarizes where the HxGN EAM (Attune EAM) mobile app stands as it enters development planning: a technician-first, offline-capable work order execution app for iOS and Android. Design of the core work order execution workflow (all five steps) and the WO List entry point is complete, with decisions captured in the HxGN EAM Mobile Design Decisions doc v3.1 (July 2026). The purpose of this kickoff is to align on architecture, agree the open technical decisions — including the punch-list mechanism — and plan the build.

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

| Screen / Component | Step | Status |
| --- | --- | --- |
| WO Record View + Activity Checklist | Steps 1–2 | ~90% complete — v5 prototype series |
| Issue Parts | Step 3 | Design complete (prototype v1) |
| Book Labor | Step 4 | Design complete (prototype v2) — decisions locked |
| WO Closing | Step 5 | Design complete (prototype v1) — decisions locked |
| WO List + Search | Entry point | Design complete (prototype v5.1) — dataspy scoping, dual view modes, icon language, filter-chip search |
| Workflow Execution Setup | Base EAM | 3 admin screens prototyped — the known base work today |
| Unified five-step prototype | Compile | Queued — assembly brief ready in session handoff |
| Offline search architecture | Backend | Concept complete — search design decisions merged into the Design Decisions doc (§16); tier-model spec pending review. Punch-list mechanism (Option A vs. B) undecided |

## 3.1 Full Mobile Scope — Outstanding Design

Beyond the designed workflow and WO List, the mobile surface still to be designed:

- Activity Screen (timer, task plan reference, assignment status)

- WO Insert Mode (create work order)

- Standard Update Mode — equipment and other non-workflow records

- Child list / detail tabs for standard record views (selection layout)

- Server configuration + login screens

- WO List per-row hydration affordance and offline freshness caption (specified; awaiting the tier-model review)

- Unified five-step prototype compile (assembly brief ready)

## 3.2 Base EAM Work

The known base-EAM work today is the **Workflow Execution Setup screens** — three admin screens (prototyped) that define the per-WO-type step sequence the mobile app executes. The punch-list Option B backend (R5PINS table, hooks, diff job) would be additional base scope only if that option is chosen.

# 4. The Design System in Brief

The selected direction is Industrial Neutral: dark slate chrome with light body content — a digital work permit, not a consumer app — with full dark mode on Octave Black. All colours come from the Octave extended palette; Inter stands in for the Microsoft-proprietary Aptos in prototypes, with JetBrains Mono for WO numbers, part numbers, and timestamps. A small set of locked cross-cutting patterns keeps every screen consistent: LOV rows are description-first (code small and muted); every sheet’s Save button gates gray-to-green on required-field completeness; field values always render in body colour (purple is reserved for step pill, badges, and focus); a fixed WO icon language covers type, priority, and status everywhere; and there are no blocking modals — progressive hydration replaced the launch modal entirely.

# 5. Prerequisites to Start Development

| Area | Decisions / work needed |
| --- | --- |
| **Local data engine** | Final selection: WatermelonDB vs. SQLite (op-sqlite) — currently a recommendation, not a decision. Confirm FTS5 availability in the chosen engine’s build (required for offline search). |
| **wo_index schema** | Finalize lifecycle columns (hydration, pinned, source, dirty — counter vs. boolean undecided — and the two clock domains last_synced_at vs. fetched_at) and the full_payload JSON blob approach. Define the outbox idempotency-UUID scheme with the API team. Confirm the delta-pull (last_synced_at cursor) contract exists today or needs to be built. |
| **Punch-list mechanism** | Decide Option A (static sync dataspy at user-group / user level) vs. Option B (PIN projection). Option A is delivered by the dataspy pre-evaluation capability below. Option B adds base work: R5PINS table + migration (pin_user/pin_employee, pin_entity/record/org, pin_type → pin_rtype, pin_sourceref, pin_watch, pin_expiration), app-layer transactional hooks for system pin types (explicitly not DB triggers), async diff job + scheduler for dataspy-defined custom types — plus open decisions: status-class config home, cascade opt-in granularity, EXEC quota default (~150) and enforcement UX, USR↔PER edge cases, v1 entity scope, and resolving the “pin” naming double meaning before it lands in API/UI strings. |
| **Server-side search** | New capability: pre-evaluate saved dataspies at sync time and return WO-ID membership alongside the index — this also delivers punch-list Option A. Confirm the existing dataspy SQL search API can serve as the Tier 4 online-escalation path as-is. |
| **Base EAM work** | Workflow Execution Setup screens — 3 admin screens (prototyped) defining the per-WO-type step sequence. Known base work today; PIN backend is additional base scope only if Option B is chosen. |
| **Outstanding design work** | Activity Screen; WO Insert Mode; Standard Update Mode (equipment; non-workflow records); child list/detail tabs for standard record views; server configuration + login screens; WO List row affordance + freshness caption; unified five-step prototype compile. |
| **Platform ****&**** tooling** | Confirm background-sync and storage-quota behavior for the offline PWA on iOS Safari — a known platform risk area. Production typeface decision: Aptos (brand, Microsoft-proprietary) vs. Inter (prototype stand-in) — licensing owner needed. |

# 6. Discussion Questions for This Kickoff

- Do we lock WatermelonDB or SQLite/op-sqlite now, or timebox a short spike first?

- Punch list: static sync dataspy (group/user level) or PIN projection — and if PIN, who owns the base backend?

- What’s a realistic timeline for the server-side dataspy pre-evaluation capability? Both punch-list Option A and Tier 2 search depend on it.

- Any known constraints on background sync / storage quota for an offline-first PWA on iOS Safari?

- With the workflow and WO List designed, what’s the preferred build order — and does the unified prototype compile gate the start of development?

- Who owns the Aptos-vs-Inter production typeface and licensing decision?

# 7. Proposed Sequence

- **Unified prototype compile** — all five steps in one navigable file; assembly brief is ready in the session handoff.

- **Architecture review** — tier-model sign-off and the punch-list mechanism decision (Option A vs. Option B); on approval, merge specs per the plan in the Design Decisions doc.

- **Engine spike** — timeboxed WatermelonDB vs. op-sqlite evaluation, including FTS5 confirmation.

- **Server ****&**** base capabilities** — dataspy pre-evaluation at sync time; Tier 4 API confirmation; Workflow Execution Setup build; PIN backend if Option B is chosen.

- **Remaining design** — Activity Screen, WO Insert Mode, Standard Update Mode, record-view child tabs, server configuration/login screens, WO List row affordances and freshness caption.

# 8. Reference Artifacts

- HxGN-EAM-Mobile-Design-Decisions-v3.1 — the single source of truth (July 2026)

- eam-wo-prototype-issue-parts-v1.html — Steps 1–3 prototype

- eam-book-labor-prototype-v2.html — Book Labor prototype

- eam-wo-closing-prototype-v2.html — WO Closing prototype

- eam-wo-list-prototype-v5_1.html — WO List + Search prototype

- Workflow Execution Setup prototype — 3 base admin screens (to be added to project knowledge)

- EAM-Mobile-Offline-Search-Architecture-Summary.md — tiered record model

- EAM-DESIGN-Pinning-Enhancement-v1.md — punch-list Option B (R5PINS) specification

- EAM-HANDOFF-Book-Labor-and-WO-Closing.md — session handoff incl. unified-prototype assembly brief

End of briefing