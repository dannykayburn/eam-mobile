# EAM Mobile — Offline Search Architecture: Summary

**Product:** HxGN EAM (Attune EAM) Mobile — technician persona, work order execution
**Context:** Builds on the Progressive Offline Hydration architecture (Optimistic UI + Sync Queue, WatermelonDB/SQLite, UI reads only from local DB).
**Source session:** July 2026 design session, captured in `EAM-HANDOFF-Offline-Search-and-Pinning.md`
**Status:** Concept design complete; not yet merged into the master Mobile Design Decisions doc; no dev work started.

---

## 1. The Problem

Base EAM's search/grid relies on **dataspies** (SQL filters over the full record set). On mobile, that raised an apparent contradiction: a search grid seems to require every record to be synced to render, but a technician's work orders (WOs) can run to the thousands, at ~150 fields each plus child data (activities, checklists, parts). Fully hydrating all of that offline doesn't scale.

The framing that unlocked this: **the binary "synced = visible" is false.** Mobile Offline had conflated the two. Splitting them apart is the whole architecture below.

## 2. The Resolution — Tiered Record Model

Records live in one of four tiers, and a record moves between tiers based on use, not based on being "in scope" for sync. **Tier 0 was added in front of them 2026-08-25 (design-decisions-v3-1.md §2.3) and is deliberately not a record tier** — it is *configuration*, and the distinction is load-bearing: records degrade gracefully (fewer rows = a shorter list) while configuration does not (a missing page layout is a blank screen, not a shorter one). All four record tiers below assume Tier 0 is already present — Tier 1 cannot *render* a hydrated WO without a layout, and Tier 2's stubs cannot show descriptions without the code domains.

| Tier | Name | Contents | Size / Scale | Behavior |
|---|---|---|---|---|
| **0** | Bootstrap config | Identity + user group → nav/function resolution → **page layout** (`R5PAGELAYOUT` + WO Workflow header/tabs + custom-field defs) → status authorizations → dataspy definitions → the code domains layout references | Kilobytes | **Blocking**, fetched inside the login round-trip (not a modal). Persisted, versioned per domain, **exempt from eviction** — not merely "hard-blocked while pinned or dirty" like a record. Layout resolves first because it *scopes everything after it*: it tells you which code/status domains actually matter, so they can be fetched as a subset rather than blind |
| **1** | Work set | Fully hydrated records + children (activities, checklists, parts) | ~20–200 WOs — **my open pinned work orders** (never date-scoped; see the note below) | Pinned, never evicted, guaranteed offline-executable |
| **2** | Search index | Stub rows, ~8–12 projected fields | ~300 bytes/row; 10k rows ≈ 3–4 MB, 100k ≈ 35 MB | Instant offline "contains" search via FTS5; grid renders only 5 summary fields |
| **3** | Demand cache | Stub → hydrated on tap while online → LRU-evicted back to stub | N/A | "A technician's own work is sacred; everything else is best-effort" |
| **4** | Server search | Not stored — online-only escalation | Full ~150-field record set | Existing dataspy SQL search API, reused as-is |

**Real scaling limits are not row count.** They are (a) Tier-1 payload size — documents dominate — and (b) sync volume over time. Both are already solved by the existing delta-pull cursor (`last_synced_at`), and index refresh simply slots in as another background stage of the hydration sequence (**Tier 0 config, inside login** → my open pinned WOs → site assets → long-tail lookups → historical docs).

**"My open pinned work orders," not "today's WOs" (corrected 2026-08-25).** The punch list is **not date-scoped** under either candidate mechanism: Option A is a configured dataspy, Option B is EXEC-class pin membership (§5 below). "Today's" both understated Tier 1 — a WO assigned to me and open for three weeks is squarely in my work set — and overstated it, implying a date filter that exists nowhere in the design. The device-side contract is `pinned = 1`, so the phrase should track the contract.

**One defect the resequencing fixes.** The old order put lookup tables at ~30s, which meant that for the first half-minute a Tier-1 record could render with **raw codes and no descriptions** — `BRKD` rather than `Breakdown`. That is the training-dependency regression this product exists to remove, so the code domains layout references belong in Tier 0, not in a background stage.

## 3. Dataspy Handling

**Chosen approach:** at sync time, the server pre-evaluates the user's saved dataspies and downloads *membership* (WO-ID lists) alongside the Tier 2 index — not the SQL logic itself.

- Offline dataspy switching becomes instant (no local SQL re-evaluation needed).
- The "Sync Config" dataspy is repurposed: it stops meaning *"what exists on this device"* and starts meaning *"what's guaranteed executable offline"* (i.e., it now scopes Tier 1, not the whole local DB).
- Tier 4 (server search) reuses the existing dataspy SQL search API as the online escalation path — this still needs confirming as a valid as-is reuse (see Open Items).

## 4. UX Consequences

Search rows now carry **state** (hydrated / stub / online-only), which needs to be visible to the technician:

- A **per-row affordance** mapped onto the existing 5-state sync icon language (Synced / Syncing / Offline / Pending / Error) so the visual language stays consistent with the rest of the app.
- An **index freshness caption** when offline — e.g. "results as of 2:14 PM" — since Tier 2 stubs are only as current as the last index sync.

## 5. SQLite Schema — `wo_index`

**Key principle:** *"UI reads only from local DB" ≠ "only synced records exist in local DB."* Online (Tier 4) search results get **written into the local DB as ephemeral rows**, then the grid re-queries locally. There is exactly one read path, always — network feeds the DB, it never feeds the UI directly.

**Shape:**
- Narrow projected columns for grid/search/dataspy fields, **plus**
- Lifecycle metadata columns (below), **plus**
- A `full_payload` JSON blob holding the other ~140 fields (`NULL` for stub rows)
- Children (activities, checklists, parts) live in separate tables, populated only for hydrated rows
- An FTS5 virtual table sits over the summary fields for instant "contains" search

The JSON blob (rather than ~150 real columns) is deliberate: every customer's WO record differs (UDFs, custom fields, config drift), so the blob absorbs that variance, and tier transitions become single-row `UPDATE`s rather than schema-shaped migrations.

### Lifecycle columns

| Column | Values / Type | Purpose |
|---|---|---|
| `hydration` | `'stub'` \| `'hydrated'` \| `'ephemeral'` | Data completeness — drives row affordance, open handler, and eviction eligibility |
| `pinned` | boolean | A *promise*, orthogonal to hydration: guaranteed offline, never evicted, kept fresh. A separate axis from `hydration` so manual pinning can exist independently. |
| `source` | `'sync'` \| `'demand'` \| `'server_search'` | Provenance — used for debugging, sweep policy, and analytics (a high % of `'demand'` rows signals sync dataspies scoped too narrowly) |
| `last_synced_at` | server cursor clock | Never compared directly to `fetched_at` — two separate clock domains |
| `fetched_at` | device clock | See above |
| `dirty` | boolean (or counter — undecided) | Safety interlock, set in the same transaction as an optimistic write + outbox enqueue. Blocks eviction and blocks upsert-clobbering. Drives the pending badge. |

### Server-search upsert rule

`ON CONFLICT` from a Tier-4 search result **may refresh summary fields but must never touch** `hydration`, `pinned`, `dirty`, or `full_payload`.

> A search result can never demote a tier or clobber a local edit.

Tiers move **up** via user intent (tap to hydrate, pin). They move **down** only via explicit policy (LRU eviction, sweep) — and that's hard-blocked whenever `pinned` or `dirty` is set. Row identity (`wo_id`, and its FTS entry) never changes across the lifecycle, which is why mixed-origin rows (some from sync, some from a Tier-4 search, some manually pinned) need no special-casing in the grid.

### State machine

```
ephemeral --(index sync)--> stub --(demand tap / sync)--> hydrated
hydrated --(LRU, only if !pinned && !dirty)--> stub
ephemeral --(swept after ~24h)--> [deleted]
stub --(index sync reports WO closed)--> [deleted]
```

## 6. Why This Matters — Customer Signal

From SWG (customer advisory) feedback, "Search & Knowledge" was a recurring high-impact theme:

- **Search Flexibility** (High impact) — current search requires exact syntax/formatting
- **Multi-Field Search** (Medium) — customers want Google-like search across multiple fields, with autocomplete/flexible matching
- **Search Discoverability** (Medium) — advanced search/filtering is hard to find; possible tooltip/help opportunity
- **Historical Knowledge Access** (Medium) — easier access to prior work/equipment history, to support troubleshooting

This feeds directly into the **"Intelligent Search & Filtering" MVP** on the connected-worker roadmap:

- **Goal:** improve search usability with flexible, intuitive behavior and enhanced filtering
- **Key drivers:** current search requires exact syntax; mobile search is difficult/unintuitive; dataspy functionality gaps exist on mobile
- **Use cases:** partial-value/keyword search; combined results across equipment, WOs, and locations; location-based filtering for route optimization; saved Dataspy-style mobile filters; suggested/autocomplete results
- **Related requirements:** flexible search logic, multi-field search, dataspy support, advanced mobile filtering, location-aware search

The tiered record model above is the technical foundation that makes most of this MVP's use cases feasible offline.

## 7. Boundary Note — Relationship to PIN

PIN (`R5PINS`) is a related but separate design (materialized projection of WO-assignment sources, covered in `EAM-DESIGN-Pinning-Enhancement-v1.md`). The two intersect at exactly one point: **PIN is what populates Tier 1.** Server-side PIN membership is what produces `pinned = 1` on a `wo_index` row; OVERSIGHT/WATCHER-type pins land as Tier-2 stubs. Beyond that hydration hand-off, PIN's assignment-resolution logic, quota system, and watcher semantics are out of scope for this summary — see the Pinning spec directly if that's needed too.

## 8. Open Items / Follow-Ups (search-specific)

1. **Server capability build:** dataspy pre-evaluation at sync time (returning WO-ID membership alongside the index) does not exist yet — needs to be built.
2. **Tier 4 reuse confirmation:** confirm the existing dataspy SQL search API can actually serve as the online-escalation path as-is, with no gaps.
3. **FTS5 availability:** confirm the FTS5 extension is available in whichever local DB engine ships (WatermelonDB vs. SQLite/op-sqlite is still an open selection at the architecture level).
4. **`dirty` column type:** counter vs. boolean still undecided.
5. **UX build-out:** the per-row affordance (mapping 3 states onto the existing 5-state sync icon language) and the index freshness caption are specified but not yet designed as screens — next queued design task is the WO List screen, which is where both will live.

## 9. Source Files

- `EAM-HANDOFF-Offline-Search-and-Pinning.md` — primary source for this summary (Topics 1 & 2)
- `HxGN-EAM-Mobile-Design-Decisions-v2.md` — prior architecture this builds on (Progressive Offline Hydration, §2)
- `SWG_MVP_for_Mobile.docx` — Intelligent Search & Filtering MVP (§5 in that doc)
- `Octave_Swg_Feedback_Framework-v1-a.docx` — "Search & Knowledge" customer feedback theme
- `EAM-DESIGN-Pinning-Enhancement-v1.md` — PIN spec (related, boundary noted in §7 above)
