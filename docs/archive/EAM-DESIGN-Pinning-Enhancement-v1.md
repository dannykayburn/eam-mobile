# EAM Pinning Enhancement — Design Summary

**Version:** 1.0 — Draft for review
**Date:** July 2026
**Status:** Concept design, not yet merged into HxGN EAM Mobile Design Decisions doc
**Origin:** Mobile offline hydration design sessions (tiered record model / Tier 1 work set)

---

## 1. Problem Statement

EAM has no single answer to the question *"which records belong to this person right now?"*
Assignment is expressed through multiple, disjoint mechanisms — EVT_PERSON ("Assigned To"),
activity schedules / scheduled labor records, resource scheduling, dispatch events, and
customer-specific conventions. Every consumer (mobile sync, Digital Work schedule views,
notifications, dashboards) re-derives assignment its own way, and no two customers assign
work the same way.

This is the single largest disparity problem in the product, and it directly blocks the new
mobile app: the offline hydration architecture needs one authoritative definition of a
technician's guaranteed-offline work set (Tier 1).

## 2. Core Concept

Introduce **PIN**: a consolidated relationship table that records a connection between a
user and a record.

**The critical framing: PIN is a materialized projection of existing assignment sources,
not a new source of truth.** Existing mechanisms (EVT_PERSON, schedules, dispatch, etc.)
remain untouched and continue to work exactly as they do today. PIN reflects them into one
table with provenance. The only place PIN *originates* anything is manual pinning.

If PIN were instead a new assignment mechanism, it would become the (n+1)th standard and
recreate the disparity problem. As a projection, it is simply the answer table every
consumer has been re-deriving independently.

**Pitch sentence:** *Your phone carries what's pinned to you.*

## 3. Schema

```sql
R5PINS
  pin_pk           -- surrogate key
  pin_user         -- USR: mobile login identity — what hydration queries
  pin_employee     -- PER: employee — what EVT_PERSON/schedules actually target (nullable)
  pin_entity       -- 'EVNT', 'OBJ', 'PART', ...  (any entity)
  pin_record       -- header key (e.g., WO code)
  pin_org
  pin_type         -- USER CODE (R5UCODES): EVT_PERSON, ACTSCHEDULE, RESOURCESCHEDULE,
                   --   DISPATCH, MANUAL, WATCH, SUPERVISOR, customer-defined types...
  pin_rtype        -- SYSTEM CODE: EXEC | OVERSIGHT | WATCHER (small, system-owned)
  pin_sourceref    -- PK of the originating row (EVT_PERSON row, schedule labor record,
                   --   dispatch row, parent pin for cascades; NULL for manual)
  pin_watch        -- watcher enrollment flag (opt-out override; defaults derive from rtype)
  pin_expiration   -- nullable timestamp; drives grace windows and time-boxed manual pins
  pin_created_by
  pin_created_date
```

**Unique key:** `(pin_user, pin_entity, pin_record, pin_org, pin_type, pin_sourceref)`
This makes both write paths (in-transaction hook and async diff job) idempotent — essential
because two independent paths write the same table.

### 3.1 User vs. employee — two columns on purpose

Every existing assignment mechanism targets an *employee* (or trade/crew); mobile hydration
and notifications target a *user*. The USR↔PER mapping is usually 1:1 but not always
(contractors, shared logins, supervisors acting for crews). The pin-writing path resolves
employee→user at write time and stores both, solving a mapping problem the current
mechanisms each handle inconsistently.

### 3.2 Uniqueness is per-source, not per-record

A tech can be in EVT_PERSON *and* on the schedule for the same WO — that is two pin rows.
Consumers query `SELECT DISTINCT`. Consequences:

- **Lifecycle is automatic.** When the scheduler moves a labor record, only the schedule
  pin dies; if EVT_PERSON still names the tech, the WO stays pinned. A pin relationship
  exists as long as *any* source says it should.
- **Unpin semantics need no tombstones.** System-sourced pins cannot be deleted from the
  pin side — they are reflections; change the source if you want them gone. Only manual
  pins are user-deletable.

## 4. The Type / RType Pattern (the status model)

`pin_type` / `pin_rtype` deliberately mirrors `EVT_STATUS` / `EVT_RSTATUS`:
customer-extensible user codes, each mapped to a small system-owned vocabulary that the
platform keys all behavior off. **Types are to pins what statuses are to work orders.**

### 4.1 System rtype vocabulary (system-owned, deliberately short)

| RType | Meaning | Hydration default | Notifications | Quota |
|---|---|---|---|---|
| **EXEC** | Executes the work | Full (Tier 1, offline-guaranteed) | High-signal | Soft ceiling (~150, configurable) |
| **OVERSIGHT** | Supervises / monitors | Stub only (index row) | Digest / summary | None |
| **WATCHER** | Enrolled for updates | Stub only | Per-event opt-in | None |

Customer flexibility lives in *types* (labels, custom sources); the *rtype* vocabulary
stays system-owned. If customers could invent rtypes, mobile would have to interpret
arbitrary values when deciding what to hydrate — reimporting the disparity problem.

### 4.2 Resolved at write time

Like status, the writing path resolves `pin_type → pin_rtype` through the user code mapping
at insert and stamps it on the row. Hot queries (`WHERE pin_user = ? AND pin_rtype =
'EXEC'`) stay flat single-table reads. Admin remapping behaves predictably: existing rows
keep their birth rtype; new rows get the new mapping; the async diff job re-stamps
custom-sourced pins on its next pass.

### 4.3 Manual pin ambiguity — solved by the mapping

Ship multiple manual-flavored user codes out of the box (e.g., `MANUAL` → EXEC,
`WATCH` → WATCHER). "Pin self to execute" vs. "keep an eye on this" is just a choice of
type; the pin-others action picks type by permission context. Customers can relabel
("Contractor Scope" → EXEC, "Planner Review" → OVERSIGHT) without mobile or notifications
ever needing to understand the new labels.

## 5. Population Paths

### 5.1 System types — in-transaction hooks (synchronous)

Application/business-rule-layer hooks on the write paths of the source tables
(EVT_PERSON, schedule labor, dispatch, resource scheduling). The source write and its pin
row commit or fail together — no window where assignment exists without the pin.

- **Not database triggers**: triggers on core tables are upgrade pain; the app layer can do
  employee→user resolution and permission context that a trigger cannot.
- Deletes/updates on the source row cascade to the pin via `pin_sourceref` — cleanup is a
  lookup, never a re-derivation.

### 5.2 Custom types — async evaluation job (dataspy-defined)

Custom membership is defined by a **dataspy**, not arbitrary SQL — admins already know how
to build them and the security model already governs them.

- Each interval: evaluate the dataspy, **diff** against existing pins for that type, insert
  additions **and delete departures**. The delete half is mandatory — a dataspy cannot
  fire an event when a record *stops* matching.
- Custom pins carry a staleness window; surface "as of <time>" wherever displayed (same
  pattern as the mobile index freshness caption).
- Per-type evaluation interval so heavy dataspies run less often than light ones.

**Companion config requirement:** R5UCODES rows are too thin to hold this. Custom types
need a slim companion config record (or an admin extension of the user code entity)
holding: `dataspy_ref`, `eval_interval`, quota-participation flag, sync mode. System types
leave it empty; the hook path ignores it entirely.

### 5.3 Manual — direct insert, permission-gated

Users pin themselves; pinning others requires permission (effectively dispatch-lite) and is
fully audited via `pin_created_by`. **Pin ≠ permission**: pinning a user to a record they
lack org/security rights to fails at write time, and mobile hydration still joins through
org security. The pin table must never become a security side door.

### 5.4 Supervisor cascade (delivered system type)

`SUPERVISOR` (rtype = OVERSIGHT) is a pin whose *source is another pin*: when an EXEC pin
is written for a tech, the hook writes an OVERSIGHT pin for their supervisor (from
R5PERSONNEL hierarchy) with `pin_sourceref` = the executor pin's `pin_pk`. The standard
sourceref cascade cleans it up when the tech's pin dies. The supervisor team-backlog view
materializes with zero configuration and near-zero device cost (stubs only).

**Guard:** cascade must be opt-in (per install or per type), and OVERSIGHT must default to
digest notifications, or supervisors of large crews drown on day one.

## 6. Watcher Semantics

- Pin creation auto-enrolls watching by rtype default: EXEC → watching with opt-out;
  OVERSIGHT → digest; WATCHER → implied.
- `pin_watch` is the opt-out override ("keep it in my work set, stop emailing me").
- Watch dies with the pin for system sources (the schedule moved on, so should the emails).
  A user can convert to a *standing watch* — which is just a manual WATCH-type pin with no
  hydration weight.

## 7. Lifecycle — WO Closure

**Decision: the pin persists; lifecycle lives in the hydration predicate, not the pin
table.** The pin table is a pure relationship ledger. Mobile hydration filters on status
(open WOs only — EVT_RSTATUS-based).

- **Demote, not evict.** When a WO leaves open status, the next delta pull demotes the
  device row from hydrated to stub — it stays findable in search (~300 bytes) but drops its
  payload and children. Completed work remains visible, per SWG feedback requirements.
- **Grace window.** Just-closed pinned WOs stay fully hydrated for N hours/days
  (demand-cache semantics: evictable, not immediately) — closure is exactly when the tech
  is most likely to need the record again (labor correction, supervisor call). The `dirty`
  guard already protects the nastiest case: a WO closed on-device while offline cannot be
  demoted until its closing transaction is acked.
- **Status class, not literal.** The hydration predicate must key on a configurable status
  *class* ("still my problem"), not a hardcoded `= 'R'` — intermediate statuses
  (completed-awaiting-review etc.) will be disputed per customer.
- Manual pins may survive closure with a `pin_expiration`, which cheaply powers the
  "recently completed" home-screen view.

## 8. Quota

Pins are now a hydration budget; a supervisor bulk-pinning 800 WOs to a tech is a
denial-of-service on that tech's phone. The rtype table dissolves most of the problem:

- Quota applies **only to EXEC** pins (soft ceiling ~150, configurable), where it defends a
  real physical budget. Error is legible: *"This technician already has 150 work orders
  assigned for execution."*
- OVERSIGHT/WATCHER pins are stubs — hundreds cost ~tens of KB; no quota needed.
- Mobile degrades gracefully past the ceiling: over-budget EXEC pins hydrate as stubs
  first, fully hydrate opportunistically.

## 9. Mobile Integration

The mobile hydration definition collapses to a single sentence with no per-customer
branching:

> **Hydrate open records where I hold an EXEC-class pin; index everything else I'm
> pinned to.**

- Server-side PIN membership produces `pinned = 1` on the device `wo_index` row (Tier 1:
  hydrated, never evicted, kept fresh every delta pull).
- OVERSIGHT/WATCHER pins land as stubs in the search index tier.
- PIN replaces the Sync Config dataspy as the *primary* work-set definition; sync dataspies
  remain available for supplemental scope.
- Every customer's assignment weirdness disappears into their type list; the phone only
  ever reads rtype.

## 10. Strategic Payoff

PIN is the backing store for multiple items already on the SWG MVP list:

- Personalized home screen — "today's assigned work" = my EXEC pins
- Supervisor team backlog = OVERSIGHT pins (cascade)
- Inbox / notifications = pin_watch enrollment
- Selective offline sync = the Tier 1 definition itself
- "Recently completed" = pins over closed-status records within expiration

It also collapses the Sync Config wall of checkboxes into one human-legible concept.

## 11. Open Items

| # | Item | Notes |
|---|---|---|
| 1 | Naming | "Pin" currently does double duty: EAM assignment concept vs. mobile eviction flag. Causally linked, not identical. Decide user-facing vocabulary (e.g., "My Work" + pin as verb). Expected to iron itself out once EXEC/OVERSIGHT/WATCHER semantics exist. |
| 2 | Status class config | Where the "still my problem" status class is defined and administered. |
| 3 | Cascade opt-in granularity | Per install vs. per type vs. per supervisor. |
| 4 | Quota values & enforcement UX | Default ceiling, warn threshold, override permission. |
| 5 | USR↔PER edge cases | Contractors, shared logins, crews — resolution rules when mapping is not 1:1. |
| 6 | Companion config home | Slim config record vs. admin extension of user code entity for custom-type dataspy_ref / eval_interval. |
| 7 | Entity scope for v1 | Table supports any entity; confirm whether v1 ships EVNT-only. |

---

*This document intentionally lives outside the HxGN EAM Mobile Design Decisions doc until
the concept is reviewed. On approval, Sections 7–9 should merge into the mobile design
doc's architecture section; Sections 2–6 belong in a base EAM enhancement spec.*
