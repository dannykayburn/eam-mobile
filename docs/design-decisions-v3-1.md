# HxGN EAM Mobile App

Design Decisions & System Reference

Version 3.1 — July 2026 — Technician Persona / Work Order Execution

| | |
| --- | --- |
| **Product** | HxGN EAM / Attune EAM — enterprise asset management |
| **First persona** | Field technician executing work orders |
| **Platform** | iOS and Android — **a native (React Native) app, not a PWA.** Corrected 2026-08-25 (user direction); this cell used to read "responsive PWA" and contradicted the architecture the rest of the doc specifies. See §2.2 for why the offline model forces native, and §21 for the supersession. |
| **Prototype files** | Don't maintain a file list here — it drifts. `CLAUDE.md`'s "Current state" is the live inventory of which screen lives in which file; `prototypes/standalone/old versions/` holds retired ones. |
| **Status** | Don't maintain a status summary here either, for the same reason. Open work lives in §20 (design-level) and in `docs/EAM-Mobile-Design-Doc-v1.md` — its **Timeline** is what to build next and its **Open issues** is the blocking shortlist; built-vs-unbuilt lives in `CLAUDE.md`. |
| **Doc version** | v3.1. This cell is a pointer, not a changelog — locked rules live in the numbered sections below (§1–§28), each governing its own topic; superseded/reversed decisions live in §21 with a short "old → new, why" note; genuinely open items live in §20. Don't restate a decision here — add it to the section that owns it. Structural convention: Standard Model sections (§5–§9) hold the canonical/generic version of any cross-cutting rule; other sections point back to them rather than repeating them. |

# 1. Project Context

This document captures all design decisions made during the UX/UI design phase of the HxGN EAM (Attune EAM) mobile app. It is the authoritative reference for all new chat sessions and contributing team members. The first persona focus is the field technician executing work orders.

# 2. Architecture — Online-First, with Declared Offline Scope

Core pattern agreed in a separate technical session (July 2026) and **re-based
2026-09-08** when the read polarity was reversed — see §2.1. All UX decisions
must remain consistent with these constraints.

## 2.1 Core pattern: online-first reads + an always-on outbox (locked 2026-09-08)

**Polarity reversed 2026-09-08, user direction.** This section read *"UI always
reads from local DB — never waits for network"* from July 2026 until now. That
is offline-first; **R1 (§2.7) asks for the opposite**, and the four options
weighed before landing here are recorded in §21. The one question this settles:
**database-wide record search does not work offline** — there is no on-device index
of records the technician does not hold (§6.13).

- **Reads are online-first.** When connected, the server is the source of truth
  and the local store is a cache rather than the primary read source. Dataspies,
  search and record opens go to the server **at full fidelity** — all fields, all
  joins, all predicates, exactly as on desktop (this is what makes R4 an
  improvement rather than a compromise).
- **The local store is the fallback, and it is deliberately scoped.** It holds
  Tier 0 configuration, the `offline-read` entities, the work set, and whatever
  the technician kept (§2.7 — keeping is a *population source* of
  `offline-read`, not a policy of its own) — never a projection of the whole
  database.
- **Writes always go through a persisted outbox regardless of connectivity** —
  unchanged from the original pattern, and now the *load-bearing* half of this
  section. The outbox is never switchable (§2.10): it serves "did my transaction
  land?" at full connectivity, not only offline.
- **Network state is a background concern by default**, and visibly narrows the
  available action set **only as a named exception** (§2.9). "Invisible" survives
  as the rule; §2.9's deferrability test is the only thing permitted to break it.

**What did *not* change, and it matters more than what did:** the write path is
still byte-identical online and offline (§2.4); the UI still never reads from the
network directly (server results are written to the local store first, §6.13); and
there is still **no offline mode the technician chooses** (§2.10). This is a change
of read polarity and offline *scope* — not a return to the mode split §5.1 exists
to reject.

**Why this is the smaller change it looks like.** Because *"row identity never
changes across the lifecycle"* was already locked (§6.13), the surviving row
lifecycle is a strict **subset** of the superseded one. Re-adding a `stub` state
and a fixed projection later would touch neither row identity, nor the grid, nor
the outbox — which is why deferring database-wide offline search costs nothing
structurally, and why the instrumentation question in §20 is worth answering
before anyone builds it.

## 2.2 Local database — and why it makes this a native app

- WatermelonDB recommended for CMMS-style field apps
- SQLite via op-sqlite as the alternative
- Both sit underneath the UI as the sole read source

**The offline model forces a native target (locked 2026-08-25, user
direction).** This was previously left implicit while the header cell
claimed "responsive PWA," which was a straight contradiction. Four
reasons, narrowest first — **amended 2026-09-08, one retired and one added,
and the conclusion is now more firmly held than before:**

1. **`op-sqlite` is React Native-only.** There is no browser build. If it
   is the engine, the app is native — there is nothing to decide.
2. ~~**WatermelonDB's web adapter does not give FTS5.**~~ **Retired
   2026-09-08.** It rested on Tier 2's "instant offline *contains* search
   across tens of thousands of stub rows," which §2.1 withdrew. Search now
   spans the work set plus manually cached records — hundreds of rows, not
   tens of thousands — and that does not need FTS5 at scale. **This was
   never a load-bearing reason**; reasons 3 and 4 are, and both are about
   *writes*, which no option changes.
3. **Background Sync is Chromium-only.** The API is absent from Safari, so
   "the outbox drains opportunistically whenever a connection exists"
   (§2.4/§2.5) cannot hold on iOS in a browser — it would drain only while
   the app is actually open.
4. **Storage durability.** On iOS, script-writable storage for a
   non-installed site is subject to eviction, including ITP's 7-day rule.
   "A punch-list record or an unsent edit can never be lost" (§2.3) is not
   a promise a browser tab can make there.
5. **ArcGIS Runtime's offline maps are native** (added 2026-09-08). R2's
   map requirement is **Phase 2** (§28), so this reason is not load-bearing
   *yet* — but it is directional, and it means the native decision does not
   need revisiting when Phase 2 starts.

**Not overclaiming:** a browser-based offline app is not strictly
impossible — `wa-sqlite` over OPFS (Safari 17+) gives real SQLite with FTS5
and persistent storage. But that is a **third engine choice not currently on
the table**, Background Sync still does not exist on Safari, and the
durability guarantee stays weaker. So it is a different architecture
decision with real capability loss, not a delivery-target toggle.

**Consequence for the "Contractor / BYOD" requirement — out of this app's scope,
and owned by the base product (locked 2026-09-11, user direction).** The SWG asked
for browser-native access. This architecture does not deliver it, will not, and
**should stop trying to**: the path forward for contractors is **the base EAM
product in a mobile browser**, not this app.

This reverses how the theme was reported. From 2026-09-08 until now this section
claimed §2.10's replication switch answered it — a contractor assigned **no
offline profile** running as an online-only user of the one unified app. That is
still a *mechanically* true description of profile `None`, and profile `None`
survives unchanged. What is withdrawn is the **claim that it is the Contractor/BYOD
answer**. Three reasons it never really was:

1. **It did not answer what was asked.** The theme is "organizations cannot force
   app installs on contractor-owned devices; browser-native access is preferred."
   An online-only mode of a native app still requires the install. The objection
   was the install, and profile `None` does not remove it.
2. **It made the residue look small when it was not.** "Answered for reads and
   writes, unanswered only for the install" reads like a distribution detail. It
   is the whole requirement.
3. **The alternatives all cost more than the theme is worth.** It is the only
   **Medium**-priority theme of the five. A separate thin online-only browser
   surface is a second UI target, cutting directly against "one unified app";
   a browser-based offline engine is a different architecture with real
   capability loss (above).

**What this buys.** Contractor/BYOD stops being an open item against the mobile
app, profile `None` stops carrying a justification it cannot support, and §2.2's
native conclusion stops being under pressure from a requirement it was never
going to satisfy. Profile `None` remains the off state for **internal online-only
user groups** — a storeroom or planner group that is always in network — which is
what it actually models.

**What this rests on, and it is a dependency rather than an open question**
(user, 2026-09-11). Base EAM is being migrated off the **Sencha/Java** UI library
onto **Angular**, as a separate programme. So the honest statement of the
contractor path is two-part: **today the base UI does not format to a mobile
device; under the new Angular UI it will.** That is what makes the base browser a
real answer rather than a deflection — but it is *someone else's* delivery, on
someone else's schedule.

Three consequences, none of which change this section's decision:

1. **There is a window with no contractor answer at all** — between this app
   shipping and the Angular UI landing. Expect the VoC theme to keep coming up in
   that window; the answer is "it is coming, from the base product," not "we will
   add a surface here."
2. **"Angular" does not automatically mean "usable at phone width."** Whether
   phone-width responsive is an explicit goal of that programme — and whether it
   covers the screens a contractor actually needs — is worth confirming rather
   than assuming. §20.
3. **It may also solve §10's API problem**, which is the more valuable
   connection. An Angular front end implies a real API behind it; this app and
   Screen Designer need exactly that in front of `R5PAGELAYOUT` and the workflow
   tables (§12). Whether the two can share one API layer is a question for that
   programme, and the upside is larger than the contractor theme that surfaced
   it. §20.

## 2.3 Hydration sequence

**Revised 2026-08-25 (user direction).** Two phases now, and the split
between them is load-bearing.

### Tier 0 — Bootstrap configuration (blocking, and not a record tier)

Tiers 1–4 (§2.6) are *records*, and records **degrade gracefully** — fewer
rows is a shorter list. **Configuration does not degrade.** A missing page
layout is not a shorter screen, it is a blank one. So configuration cannot
share the record pipeline's "usable immediately, fills in behind you"
semantics and must not be queued behind records. It is a different kind of
thing, which is why it gets its own tier number rather than a slot in the
list below.

Order, narrowest dependency first:

- **0a — Session + identity.** Employee, organization, **user group**.
  Falls out of authentication. Everything below is keyed by user group.
- **0b — Nav-slot binding / function resolution** (§26.2/§26.3). Which
  functions this group has, and in which bottom-nav slots. This scopes
  *which* layouts there are to fetch at all.
- **0c — Page layout. The most critical single piece.** `R5PAGELAYOUT` on
  `PLO_PAGENAME × PLO_USERGROUP × PLO_WOTYPE`, plus the **WO Workflow
  header** and **WO Workflow Tabs** rows (§12 — field sets, step sequence,
  gating, and each tab's `Step | More` placement), plus **Custom Field
  definitions** (§22).
- **0d — Status authorizations.** Which transitions this user group may
  perform, and the Completion Status Entity / Start Work Status /
  Completion Status the workflow reads and writes (§12 tier 1).
- **0e — Dataspy definitions** for the resolved functions (§6.3/§8.3). WO
  List cannot draw its dataspy bar without them — and **the automatic half of
  the punch list *is* a dataspy** (§2.6, locked 2026-09-11), so `0e` is now load
  bearing for hydration and not only for the list UI.
- **0f — System codes & descriptions**, scoped to the domains 0c actually
  references. The long tail defers to the background phase below.

**Why layout is first is not only importance — layout tells you what else
you need.** Once it resolves, you know exactly which fields exist on the
screens this group can reach, and therefore exactly which code domains,
status domains and custom-field definitions matter. Fetch codes *before*
layout and you fetch the code universe blind; fetch them *after* and you
fetch a scoped subset. **Layout first is what keeps 0f small.** That is the
strongest argument for the ordering, stronger than criticality alone.

**Two pieces of competitor evidence that this tier is real** (added
2026-09-08, researched from shipping products): ServiceMax ships a
**separate Configuration Sync** distinct from its record sync, and Maximo's
offline inspection forms **fail outright** when their domain/reference data
does not arrive. That is "configuration does not degrade" observed in
production, at LOV grain, on this project's own §16 screen type — the
argument for Tier 0 is not theoretical.

### Then the record tiers, in the background

**Revised 2026-09-08** for §2.1's polarity and §2.7's policy registry. Tier 2
(the database-wide search index) is **gone**, and "site assets" was never a
replicated bulk — equipment arrives by reachability, not by entity (below).

- **My open pinned work orders** (Tier 1, ~20–200 records) — *fully hydrated
  records **+ their children + their declared depth-1 references*** (amended
  2026-09-08): ~5 seconds
- **Records the technician kept** (R5 — a population source of §2.7's
  `offline-read`, not a policy of its own), traversed the same way: on request,
  non-modal
- Long-tail lookups / remaining code domains (Tier 0 and §2.8 row 1 — see
  §2.7's merge note on why these are not a per-entity policy): ~30 seconds
- Historical documents: ~90 seconds+
- User is practically offline-capable **for their own work** within ~30 seconds
- **No blocking modal on launch** — progressive hydration replaces it; the
  app is usable immediately and fills in as each tier completes in the
  background. **This is a rule about *record hydration*, not a ban on modals** —
  see the clarification below.


### What is actually in each tier — worked example (added 2026-09-11)

The tiers are easy to agree with in the abstract and easy to get wrong in code,
because the interesting question is never "what is a tier" but **"where does this
specific row live, and what happens to it when the signal drops."** So: one
technician, one shift, real rows. Entity names are this repo's own demo data so
the example is checkable rather than illustrative.

Scenario: **Priya, MAINT-TECH user group, offline profile `TECH-FULL`.** Her
group's punch-list dataspy returns three work orders; she pinned a fourth by hand
(§2.6).

#### Tier 0 — configuration. Blocking, tiny, and not a record tier.

| What | Concrete rows for Priya | Size |
| --- | --- | --- |
| `0a` identity + user group | `MAINT-TECH`, org `MAIN`, employee `10023` | bytes |
| `0b` nav + function resolution | bottom-nav slots; the resolved `EVNT` function | bytes |
| `0c` page layout + WO Workflow tables + custom-field defs | the Breakdown layout, the PM layout, the Routine fallback; step instances for each; `custom_field_defs` for WO and Equipment | tens of KB |
| `0d` status authorizations | which status transitions `MAINT-TECH` may make | bytes |
| `0e` dataspy definitions | her WO List dataspies **and** the punch-list dataspy (§2.6) | KB |
| `0f` code domains the layout references | WO Type, Priority, Status, closing codes, trades, departments | tens of KB |

**The property that defines this tier:** every row above is *required to render
anything at all.* A WO with no layout is a blank screen. That is why it blocks,
why it rides the login round-trip, and why it is **exempt from eviction** — the
only tier that is.

#### Tier 1 — the work set. Guaranteed offline, and the only guarantee in the system.

Roots, then everything reachable from them (§2.3 traversal: children + declared
depth-1 references, references terminal).

| Layer | Concrete rows | Why it is here |
| --- | --- | --- |
| **Roots** (4 WOs) | `19257` Breakdown · `19831` PM · `20450` Routine — from the group dataspy. Plus `21impl` pinned by hand. | §2.6: three automatic, one manual. Both are `pinned = 1`; the row records which. |
| **Children** of each root | activities; checklist items; planned part lines; labor bookings; comments; documents metadata; the MEC child WOs a Route minted | A child has no independent existence — a WO without its checklist is not a workable WO. |
| **Depth-1 references** | the equipment each WO points at (`00067333`); the store/bin rows its planned parts point at; the employees and crews on its bookings | Needed to *display* the root. Pulled because the root points at them. |
| **Terminal edge** | that equipment's *own* parent location, its other WOs, its full part list | **Not pulled.** References are terminal by default — this is the rule that stops one WO dragging in the site. |

**Worth making concrete, because the fan-out is the part people underestimate:**
`19257` carries Route `PUMPS` (24 equipment), so it mints 24 MEC child WOs, and
the equipment-scoped checklist items fan out to ~96. The `FIREEXT` Route is 156
equipment and ~624 items. **That is Tier 1 for one work order.** The per-collection
traversal caps in §2.7 exist for exactly this shape, and the demo data is
deliberately this large — don't "fix" it by capping the fan-out in the UI.

**Offline behaviour:** complete. Every screen renders, every write queues. This is
the tier the whole architecture exists to protect.

> **The next two are POPULATIONS, not policies** (amended 2026-09-18). They were
> `reference` and `on-demand`, two of §2.7's five classes; §2.7 merged them into
> one `offline-read` because a kept record lands in the same local store a
> whole-domain one does. **Provenance is a column, not a class** — the merge
> argument lives in §2.7 and is not restated here. They keep separate
> subsections because their *hydration* behaviour genuinely differs, which is
> what this section is about.

#### `offline-read`, populated whole — small, bounded domains.

Closing codes, trades, departments, UOMs, status codes, WO types, priorities. A
few hundred rows each, changing monthly at most. **Replicated in full** so a
picker is never a short list (§2.8 row 1), which is also why these take no
dataspy — though note the *reason* they take none is that the whole domain
measurably fits §2.7's caps, not that they are described as small (§2.7's cap
rule).
Note that the *configuration-shaped* members of this list — WO types, status
codes, page layouts, UDS definitions — are **Tier 0**, not records, and so have
no per-entity policy at all.

**Offline behaviour:** identical to online. A closing-code picker cannot tell the
difference, which is the point.

#### `offline-read`, populated by the technician — what she chose to keep (R5).

Equipment `BLDG-A` because she expects to be in that building tomorrow; a
75-page manual PDF; a WO she is not assigned to but was asked about. Each
traversed the same way a root is, and each **evictable** — this is the tier
eviction actually operates on.

**Offline behaviour:** present and complete, until evicted. Eviction needs a
**refcount**: `BLDG-A` may also be present as a depth-1 reference of a Tier 1 WO,
and dropping what she kept must not delete a row Tier 1 still needs (§20).
**The merge sharpens this rather than softening it** — one store now holds rows
from a dataspy, from traversal and from keeping, so "which source put this row
here" is a column §2.6 already requires for the punch list, and the refcount is
the same question asked about eviction.

#### `server-only` — everything else, and it is most of the database.

The other ~40,000 equipment records. Every WO not hers. Every part in every
store. Purchase orders, contracts, standalone UDS records (§27, permanently
`server-only`). Full history on any record.

**Offline behaviour: absent, and the app says so.** This is the concrete meaning
of "database-wide search does not work offline" (§2.1/§6.13) — not a degraded
search, an *absent* one, with a stated scope. A short list that looks like a
complete list is the failure mode being avoided.

#### The two rows that make the model comprehensible

| Question | Answer |
| --- | --- |
| Is `00067333` (the pump on WO `19257`) offline? | **Yes** — as a depth-1 reference of a Tier 1 root. Its *own* children are not. |
| Is `00067333` offline after `19257` closes and is evicted? | **Only if something else still holds it** — another root, or a manual cache. Hence the refcount. |

**The generalisation, and it is the one thing to take away:** *nothing is offline
because of what kind of record it is.* A row is on the device because something
**reachable from the technician's own work** points at it, or because she asked
for it. Entity *policy* (§2.7) says whether a row is **allowed** to be offline;
reachability says whether it **is**. Both have to be true.

### Reachability traversal — how a root acquires its rows (accepted 2026-09-03)

The policy registry (§2.7) says *whether* an entity can be offline; traversal
says **which rows**. This is the rule that makes §2.8 row 2 and R5's manual
caching work at all, and it holds regardless of read polarity.

> **A hydration root pulls its declared children (downward, bounded by the
> root) and its declared references (outward, depth-1). References are
> TERMINAL by default:** the app does not traverse a referenced record's own
> children or its own references. Any onward hop must be **explicitly declared
> and explicitly capped**.

**The default-terminal half is the entire rule.** Without it, `WO → equipment →
parent equipment → its children → their WOs → their equipment → …` is a
transitive closure over the whole database reached in four hops from one work
order. That is not a hypothetical; it is the shape of every "why is our offline
app 800 MB" post-mortem.

**Roots — traversal is triggered by hydration, not by a row existing:**

| Root | Traversal |
| --- | --- |
| A **work-set** WO (Tier 1, `pinned = 1`) | full — children + depth-1 references |
| A **manually cached** record (R5) | full — **required**, or R5 delivers a pinned record with blank fields, which is worse than not caching it |
| A **demand tap** while online | full, at tap time — this is what makes the record usable when connectivity later drops |
| An **ephemeral** server-search result | **none**, deliberately. Traversing every search result makes every search expensive. Consequence: an ephemeral row can render with **unresolved references**, which is a real UI state and a §20 gap |

**Where it stops — five termination rules:**

1. **References are depth-1 and terminal**, unless declared otherwise.
2. **Whole-domain entities are never traversed** — they are replicated in full
   (§2.8 row 1). Traversal must not fetch code-domain rows individually; that
   is both slow and redundant. **Traversal applies only to `work-set` rows and
   to the `offline-read` entities that carry a real dataspy**, i.e.
   entity-scale rows — never to one whose population is an implicit "All
   records".
3. **Declared onward hops are the only exception**, each with its own cap. The
   one this app needs is the **equipment ancestor chain** (§7.4's Structure Tree,
   the Equipment Lookup's Structure tab) — **ancestors only, never children**,
   since following an equipment's children pulls a Route of 156 (§16.9) plus
   everything under it. **Do not implement it as a recursive edge:** an
   equipment→parent hop is a self-reference, and D365's offline profile refuses
   self-references and circular references outright — a signal that recursion is
   the wrong *shape*, not merely an unbounded one. **The server flattens the
   ancestor chain** into a denormalised path or fixed ancestor columns on the
   equipment row, which keeps both consumers working and **removes the
   configurable depth N entirely.**
4. **Never traverse from a reference back into transactions.** An equipment's WO
   history, meter readings and cost data are `server-only` (§2.7) and are the
   single largest thing a naive traversal drags in.
5. **A closure cap, enforced server-side at payload assembly.** If the closure
   exceeds it the payload is **truncated with a stated reason**, never silently.
   **Sized per collection, not per graph:** D365 permits 15 relationships but at
   most **one** to-many among them, while a WO has roughly eight to-many
   children — a platform allowing one is saying to-many traversal is the
   expensive axis. So the binding constraint is a **per-collection row cap**
   (checklist items, parts lines, labor lines, comments, each placed UDS tab),
   not the number of edges.

**Worked example — why this is not the million.** 200 work orders in the work
set:

| | Rows |
| --- | --- |
| WOs | 200 |
| children (activities, checklist items, parts lines, labor lines, comment/doc metadata) | ~2,000–4,000 |
| **referenced equipment, deduplicated** | ~120–180 (many WOs share assets) |
| equipment ancestors | ~40–80 (and now flattened server-side rather than traversed) |
| referenced employees (assigned-to, reported-by), deduplicated | ~30–60 |
| **referenced code-domain rows** | **0 — replicated whole per §2.8 row 1** |

**Order 200–300 additional master-data rows.** **Deduplication is doing most of
the work, and that is the whole point:** the closure is bounded by *the work*,
not by the registry. This is the direct answer to "downloading a million
equipment just to create a work request is crazy" — the million never comes
down, and a work request against an *unknown* asset does not need it to (it
carries a scanned tag or typed code, and the server resolves it on sync). Note
too that this same set is what §2.8 row 2 offers as the offline Equipment LOV:
**one mechanism, two consumers.**

**Closure assembly is server-side**, for §2.3's own reason: one round-trip
inside a wait that already exists, rather than a chatty client walking the graph.
The client-side alternative is an N+1 fetch per root — chatty and slow on exactly
the connections this app exists for.

**First-pass traversal declaration for Work Order** (proposal, not locked — the
value is the shape, and every `terminal` marking is a decision to *not*
download something):

```
WORK_ORDER  (root: work-set | manual-cache | demand-tap)
  children  (downward, bounded by the root)
    activities, checklist_items, parts_lines, labor_lines,
    comments, document_metadata, wo_equipment (Route/MEC rows),
    uds child tabs      -> ONE EDGE PER *PLACED* UDS (§27.5)
    custom_field_values -> ONE EDGE, fixed key (§22)
    (UDFs need no edge at all — they are columns on the record)
  references (outward, depth-1, TERMINAL)
    equipment            -> + server-flattened ancestor path
    assigned_to, reported_by  -> employee
    department, problem_code, priority, organization
                         -> whole-domain `offline-read`: already replicated
    wo_type, status      -> replicated, and additionally definition-gated (§2.8 row 3)
  never traverse
    equipment -> work_orders | meter_readings | cost | documents
    equipment -> children
    employee  -> anything
```

**The edge set is a product-declared core plus a configuration-supplied
extension**, and the extension is **derived from page layout, not an independent
artifact**: a UDS child tab traverses **iff it is placed in the resolved page
layout** (§27.5). This is the natural extension of this section's own "layout is
first because layout scopes everything after it" argument — resolve layout and
you also know which UDS edges traverse. Because layout resolves per
`PLO_WOTYPE`, **the UDS edge set is per WO Type**. Two consequences: no new Tier 0
bundle and no new version stamp, and the closure cap stays a **safety net**
because *placement* is the real bound. With UDFs (no edge), Custom Fields (one
fixed-key edge) and UDS (one edge per placed screen) all placed, **this
declaration is complete** rather than provisional.

**"My open pinned work orders," not "today's WOs" (corrected 2026-08-25).**
The punch list is **not date-scoped** in either of its two layers (§2.6): the
automatic layer is a configured dataspy, the manual layer is pin membership.
"Today's" both understated it — a WO assigned to me and open for
three weeks is squarely in my work set — and overstated it, implying a date
filter that does not exist anywhere in the design. The device-side contract
is `pinned = 1`, and the phrase should track the contract.

### Where Tier 0 happens — inside the login round-trip, not a modal

**No blocking modal on launch stays locked** (§3.4/§4.1). Note what that
rule was aimed at, though: waiting on *records*. Tier 0 is kilobytes of
configuration, and the user is **already blocked** during authentication,
which has its own expected spinner.

### What "no blocking modals" actually prohibits (clarified 2026-09-11)

**The rule was written against offline-first and has been over-read since §2.1
reversed the read polarity.** Stated as "no blocking modals anywhere" it implies
the app may never show a waiting state, which is wrong and unbuildable now that
**reads are online-first**: a server search *is* a wait, and pretending otherwise
produces a screen that looks broken while it works.

**The rule, restated.** The app must never block on work it could have done
without the network, and must never gate the whole app on **bulk record
download**. It may block on a **discrete, user-initiated server round-trip**,
for as long as that round-trip takes and no longer.

**The test to apply**, in order:

1. **Did the user ask for this, just now?** A tapped Search, a tapped record
   open, a tapped Save. If yes, a waiting state is honest. If the wait is the
   app's own idea — hydration, eviction, a background refresh — it must be
   invisible.
2. **Is the thing being waited for a single answer, or a bulk payload?** One
   search result set, one record, one write acknowledgement: blocking is fine.
   The work set, the reference entities, documents: never.
3. **Could the device have answered locally?** If yes, answer locally and
   refresh behind the UI. Never block to confirm something already held.

**Permitted, explicitly:**

| Case | Why it is allowed |
| --- | --- |
| **Initial login, including the Tier 0 round-trip** | The user is already blocked by authentication, and configuration does not degrade (a missing layout is a blank screen, §2.3). One wait, at the one moment a wait is expected. |
| **A user-initiated server search while online** | Under §2.1 this is the *primary* read path, at full fidelity. It is a discrete request with a discrete answer; SLO-3 is what keeps it short. |
| **Opening a record that is not on the device** | Same shape: one request, one answer, user-initiated. |
| **First-run server configuration / connection test** | Inherently a round-trip, and inherently modal — there is no app yet to use behind it. |
| **A destructive-action confirm** | Never was in scope. §3.4 has always specified a centered confirm dialog for these. |

**Still prohibited, and these are the ones that matter:**

- A **launch-time hydration modal** — "downloading your work orders, 4 of 312."
  This is the thing the rule exists to prevent, and it is what the predecessor
  app does.
- A modal that appears **because of connectivity state** rather than because the
  user asked for something. Network state is a background concern (§2.1); it may
  narrow an *action* visibly (§2.9), but it does not get to interrupt.
- A modal blocking a **write**. Writes go to the outbox and return immediately
  (§2.4). "Saving…" that waits for the server contradicts one write path.
- A modal over **manual caching** (R5) — downloads are explicitly non-modal, with
  progress in an existing surface.
- Any wait with **no stated reason and no way out.** A permitted wait still has
  to say what it is waiting for and be cancellable where cancelling is coherent.

**Where this lands in the UI:** these are waiting states on a surface the user
already asked for — a search screen showing it is searching — not a new
interruption layer. The bottom-sheet mechanics (§3.4) are unchanged, and nothing
here reintroduces a mode (§5.1) or a connectivity chooser (§2.10).

**Recommendation: the authentication response carries the bootstrap-config
bundle, on the same connection.** No new modal, the locked rule intact, and
configuration present before the first screen paints. Adding a *second*
modal after login in order to fetch config would be the thing that violates
the rule — folding the fetch into the wait that already exists does not.

### Four consequences that follow

1. **Tier 0 is persisted, versioned, and exempt from eviction.** Not
   "hard-blocked while pinned or dirty" the way a record is (§2.5) — simply
   out of scope for eviction. First run needs connectivity once; every
   launch after boots from last-known-good Tier 0, so it has to survive
   unconditionally. A **version stamp per config domain** lets a reconnect
   ask "did any of this change?" for a few bytes instead of refetching.
2. **A first-run Tier 0 failure is the one legitimate hard failure in this
   design.** Everywhere else the app degrades; here it must stop with a
   clear error rather than render something broken. No layout means no
   renderable screen, and a blank screen with no explanation is worse than
   an honest one.
3. **Do not enable the write path until status authorizations (0d) are
   present.** Without them the app either blocks every transition — a
   technician who cannot Start Work or Close has no app — or permits all of
   them and queues outbox writes the server will reject. **The second is
   worse under §2.4's optimistic UI:** the technician sees success, walks
   away, and the failure surfaces later in the trouble-field banner (§4.4).
   A systematically wrong authorization set would flood that surface with
   errors that are not the technician's fault, which is precisely the
   "did my transaction actually land?" trust problem this app exists to fix.
4. **A config delta arriving mid-session is the workflow-revisioning
   problem (§20) seen from the sync side** — the same problem the authoring
   side raises when an admin edits a live `(function, WO Type)`
   configuration. Recommended answer for both: **pin the resolved config
   version to the WO at start-of-work**, so a WO in flight finishes on the
   shape it started with and the new configuration applies to the next one
   started. Cheapest correct option, and it requires no migration of
   already-recorded step state. **Proposal, not locked** — see §20.

## 2.4 Write path — constant regardless of connectivity

- Optimistic update to local DB + outbox enqueue happen simultaneously
- UI reflects the change instantly
- Sync engine drains the outbox to the API in the background when connected

**The write-enabled set is small and enumerable (added 2026-09-08).** This is
the direct consequence of R1 and §2.7's registry, and it is what makes R6
tractable at all: **WO status / step state, checklist results, labor bookings,
part issues, meter readings, comments, attachments** — plus GIS features on
their own channel when Phase 2 lands (§28). That is roughly **seven EAM write
shapes**. A real per-entity conflict UI is buildable for seven; it is not
buildable for sixty. Everything else the app can reach is read-only offline by
declaration, not by omission.

## 2.5 Reconnect / re-sync

- Outbox flushes in order with idempotency UUIDs
- Delta pull via last_synced_at cursor — server returns only changed records

**Conflict handling is per write shape (locked 2026-09-08, replacing
last-write-wins).** The original rule — *"conflicts resolved last-write-wins by
timestamp"* — is **withdrawn**: LWW is **silently lossy**. If the server wrote
last, the technician's edit is discarded and there is no discrepancy left to
surface, which is precisely the failure R6 asks to eliminate and precisely the
*"did my transaction actually land?"* trust problem this app exists to fix. Over
§2.4's enumerated set this is **four rules, not sixty**:

| Write shape | Rule |
| --- | --- |
| status / step transitions | a state machine, not a value → **reject and surface**; never LWW |
| field edits on a hydrated record | detect, surface **both** values, let the technician choose |
| comments / attachments | append-only → cannot conflict |
| labor bookings / part issues / meter readings | inserts → the idempotency UUID already covers it |
| Custom Field values (§22) | one row per `(entity, record key, field code)`, so cardinality is known → takes the **field-edit** rule with no ambiguity |
| GIS feature edits (Phase 2, §28) | ESRI replica sync → **its own** surface, never the EAM outbox |

**No write is ever silently discarded** — that is the invariant, and it is
required under every option that was on the table, not just this one. §4.4's
trouble-field banner and §4.5's Sync Status Screen are already the right home;
what was missing was never the surface, it was the guarantee that a write
*reaches* the surface instead of being dropped by LWW.

## 2.6 Related architecture extensions

**Tiered record model / offline search — reduced to three tiers 2026-09-08.** It still decouples "synced" from "visible," but **Tier 2 (the database-wide search index) is superseded** by §2.1's online-first polarity: what remains is the **work set** (Tier 1, guaranteed offline), **on-demand / manually cached** records, and **server search** at full fidelity. **§6.13 is still the only home for these rules** — the surviving decision table and row lifecycle live there, and §21 records what was removed. The former `EAM-Mobile-Offline-Search-Architecture-Summary.md` was retired 2026-08-25 (§21) after drifting from this doc; don't reinstate a parallel summary.

**Tier 0 sits in front of them all and is not one of them** (added 2026-08-25, §2.3). Bootstrap configuration — identity, nav/function resolution, page layout + workflow tables + custom-field definitions, status authorizations, dataspy definitions, and the code domains layout references — is fetched inside the login round-trip, persisted, versioned, and exempt from eviction. Every record tier assumes it is already there: Tier 1 cannot *render* a hydrated WO without a layout, and a server-search result cannot show descriptions without the code domains. Keep the numbering distinct so nobody plans configuration on record semantics.

**The punch list — LOCKED 2026-09-11 (user direction): it is *both* mechanisms,
with different jobs.** Tier 1 (the guaranteed-offline work set) is defined by a
per-user punch list of work orders. The mechanism was an open A-vs-B decision from
July 2026 until now; the answer is that **A and B are not alternatives — they are
the automatic layer and the manual layer of one list.**

| Layer | Mechanism | Who acts | What it is for |
| --- | --- | --- | --- |
| **Automatic** | A **dataspy selector on User Group Setup** names the dataspy that defines the group's download scope. | An admin, once, per user group. | "Everything this role normally works on arrives without anyone asking." |
| **Manual** | **Pinning** a specific work order (`R5PINS`). | A technician or supervisor, per record, ad hoc. | "This one too, even though the dataspy does not return it." |

**Why both, in one line:** a dataspy cannot express "this particular WO, because
I was asked in the corridor," and a pin list cannot express "everything assigned
to my crew" without re-implementing a query engine. Each mechanism is bad at
exactly what the other is for.

**Five consequences, and the third is the one that bites:**

1. **Both backend asks are now in scope**, not one of them: server-side dataspy
   pre-evaluation *for the punch list* (the old Option A capability), **and** the
   `R5PINS` projection with provenance (the old Option B). That is a real cost
   increase over either option alone, and it should be reported as one rather
   than presented as a free synthesis.
2. **The device-side contract is unchanged** — a WO-ID membership list arrives at
   sync time and stamps `pinned = 1`. It now has **two upstream sources that
   merge**, which the contract has to carry: a row needs to record *why* it is
   pinned, or a dataspy re-evaluation will silently evict a manual pin.
3. **A local pin must survive a server membership list that omits it.** This was
   already true (§14.11) and was filed as "evidence for Option B." It is now
   **architecturally required**: the manual layer is device-originated by
   definition, so last-writer-wins on the membership list would delete the
   technician's own additions on the next sync.
4. **§14.11 is now the first-class manual path, not an edge case.** Starting a WO
   found by search *is* a manual pin. That makes search → start → work a designed
   flow rather than a promotion mechanism that happens to exist.
5. **The dataspy selector is a new authoring control that does not exist**, on a
   screen (User Group Setup) that is otherwise a pure binding surface. §20.

**Whether the selector belongs on the user group or on the offline profile is
decided: the user group.** A profile is one artifact shared by N groups (§26.5.1
Fault 1), and download *scope* is role-specific — putting the dataspy on the
profile would force every group sharing it to download the same rows.

For the record, the two mechanisms as they were originally posed:

- **Option A — Static sync dataspy.** A configured dataspy defines the punch list, set at the user-group level and overridable down to a specific user. Zero new base schema; admins already know dataspies; the security model already governs them; the server-side dataspy pre-evaluation capability delivers it — though **weaker since 2026-09-08**, since that capability was previously needed for Tier 2 regardless and Option A now has to justify it alone. Trade-offs: assignment logic is re-derived in dataspy SQL per customer, there is no provenance, and nothing is reusable for the personalized home screen, supervisor views, or notifications.
- **Option B — PIN enhancement (R5PINS).** A materialized projection of all assignment sources into one table with provenance; a base-EAM enhancement with its own spec: EAM-DESIGN-Pinning-Enhancement-v1.md. Assignment is resolved once and consistently, lifecycle is automatic, and the table backs several roadmap features. Trade-offs: real base-EAM work (new table, app-layer hooks, async diff job) plus its open design decisions.

*(Both bullets are retained as the description of each mechanism. What is
superseded is the framing of them as alternatives — see §21.)*

Tiers, eviction rules and device behaviour are unchanged by this decision. What
changed is that **both upstream mechanisms have to be built**, and the membership
row has to carry its source.

**New evidence for Option B (added 2026-09-08), from the existing product's own
briefs.** Mobile Offline's default download is *already* a multi-source
projection, and it is hardcoded: (1) WOs **Assigned To** the logged-on user's
employee; (2) any WO activity with a **Schedule Labor** record for that employee;
(3) any with a **Dispatch Labor** record for that employee; (4) any with a
**Dispatch Labor** record for that employee's **crew**, gated on the employee's
*"Determines Crew Location for Dispatching"* checkbox. Those four rules are
precisely what the `R5PINS` projection is specified to materialise **with
provenance**, and today they resolve as hardcoded logic with none. Under Option A
every customer re-derives all four in dataspy SQL, crew-flag condition included —
which confirms Option A's stated weakness against a real rule set rather than an
assumed one. Also: the optimised scheduler's **Dispatch Sequence** already flows
through to the map WO icon and the WO list and refreshes on reload, so **any**
punch-list mechanism has to carry it. Separately, the market default for
Option A's shape is a **capped and validated** admin filter (§2.7) — Option A is
only sound with the guards it currently lacks.

## 2.7 Per-entity offline policy — the declared registry (locked 2026-09-08)

**R1's real content is "offline for only specific entities,"** and that asks for
a declared **per-entity offline policy**. This — not the tier model — is the
reusable asset for the organisation's other mobile apps, and the existing product
already works this way without naming it.

**This registry is authored in the portal's Offline Profiles area** (§30.14,
built 2026-09-16), which is also where the policies below were checked
row-by-row against the shipping product's **User Group ▸ Mobile Settings** tab.
Two results of that check are load-bearing for this section rather than for the
prototype: **11 of 31 entities have no policy decision at all**, and the
`server-only` row below covers two things the shipping product downloads today
(**WO/equipment history** and **meter history**), which makes this table a
deliberate narrowing of current capability. Both are open in §20.

**Reduced from five classes to four, 2026-09-18** (user direction — see the
merge note below, which is the load-bearing part of this section now).

| Policy | Read offline | Write offline | Examples here |
| --- | --- | --- | --- |
| `server-only` | ✗ | ✗ | POs, WO history, meter history, cost, reports, deep lookups, **standalone UDS record views** (§27.2) |
| `offline-read` (a bounded record population, however it got there) | ✓ | ✗ | employees, crews, trades, stores, bins, cost codes, suppliers, task plans; equipment and parts the technician kept |
| `work-set` (auto-replicated + traversed) | ✓ | ✓ | pinned WOs + activities, checklist results, parts lines, labor lines |
| `external-replica` (foreign engine, own lifecycle) | ✓ | ✓ | **GIS features / geodatabase — Phase 2 only** (§28) |

**`reference` and `on-demand` were never two policies** — merged 2026-09-18
into `offline-read`. The argument is §2.6's, generalised: a record the
technician keeps lands in the **same local store** a dataspy-matched row would,
so the punch list's shape (one store, two population sources, and a **source
recorded on the row** so a dataspy re-evaluation cannot evict a manual pin) is
the shape *every* replicated entity has. **Provenance is a column, not a
class.** Two consequences worth stating because they are easy to get backwards:

- **Read-only is a property of the ENTITY, not of how the row arrived.** The
  old rationale for `on-demand` being read-only — "it arrived without its write
  context" — is withdrawn. Equipment is not writable offline because we decided
  Equipment is not writable offline; pinning an asset gets you the row, not
  write rights. §14.11's Start Work pin is unaffected: it is a device-provenance
  row on a `work-set` entity.
- **The reliability difference survives as a sentence, not as a policy.** An
  entity populated only by keeping **can be missing at the moment of need** and
  behaves as `Online only` for any record nobody thought to keep before signal
  dropped. That is worth telling an author; it is not a fifth class.

**And what `reference` was really carrying was Tier 0.** Its own examples above
included *page layouts, UDS definitions and code domains* — none of which are
records, all of which are **Tier 0** (§2.3) and sit in front of the record tiers
already. "Ships whole, unfiltered" is a Tier 0 property, and §2.8 row 1 is the
rule that makes it one. What was left behind — Employees, Crews, Stores, Task
Plans — are **record tables with row counts**, so they take a dataspy and a
ceiling like every other record. **This is why the merge does not contradict
§2.8 row 1:** bounded code domains never needed a per-entity policy, because
they are not per-entity records.

**Every replicated entity resolves through a dataspy or through "all records",
and which of the two is *required* is decided by the caps** — see the cap rule
below, which owns that and is the only place it is stated. §2.8 row 1's "a subset
of a code list reads as a data error" is still true, and is still the reason a
*fitting* domain ships whole; what it is **not** is the mechanism deciding which
domains those are.

**The five keys above are the MODEL's names; the portal shows a different set
of labels** (reworded 2026-09-18, user direction). The keys are what the rest of
this spec cites and what a stored profile persists, so they are **unchanged**.
The labels are what an admin reads, and they moved because the original five
each answered a *different* question: `server-only` named a location,
`reference` named a kind of data, `on-demand` named a timing, `work-set` named
a scope, `external-replica` named a mechanism. Five names on five axes are not
comparable with one another — which is why `reference` and `on-demand` read as
near-synonyms while being different policies. `on-demand` was worse than
unclear: it is **inverted** against the industry's dominant usage, where
OneDrive's *Files On-Demand* means the file is **not** on the device.

| Key (this spec, and the stored value) | Label (the portal) |
| --- | --- |
| `server-only` | **Online only** |
| `offline-read` | **Offline read** |
| `work-set` | **Offline read/write** |
| `external-replica` | **Offline read/write — external** |

Every label answers one question — *what can the app do with this offline* —
and the line beneath it in the portal answers the second one an author needs,
*who put it there* (§30.14 item 2). The wording pass originally kept five
labels, with `Offline read — preloaded` and `Offline read — kept` as siblings
differing only in provenance; **naming them as siblings is what made it obvious
they were one class**, and they were merged hours later.

**Three of the four keys are the original ones.** `server-only`, `work-set` and
`external-replica` never moved, so the only migration the merge owes is
`reference`/`on-demand` → `offline-read`, which `POLICY_MIGRATE` performs on
read. **That migration is load-bearing rather than tidy:** the portal's
`normalizeProfile` pulls an *illegal* policy back to the entity's default, so
without it every stored row holding a retired key would silently fall back —
to `server-only` for most entities. The screen would render perfectly and would
have stopped shipping half the registry. Pinned by `test-workflow-portal.js`,
with the assertion deliberately written against entities whose default differs
from the migration target, since the obvious choice passes even with the
migration deleted.

**"The app is offline" stops being a property of the app** and becomes a property
of each entity. That declaration is what ports to the next app in the portfolio;
the tier model does not. `external-replica` earns its place by naming GIS as a
**policy class rather than an exception**, so the next app needing a foreign sync
engine has a slot to put it in — even while R2 sits in Phase 2.

**How `work-set` and `offline-read` rows acquire their contents is §2.3's
reachability traversal.** The policy says *whether* an entity can be offline;
traversal says *which rows*. `server-only` rows are never traversed into, and
an `offline-read` entity shipping its whole domain bypasses traversal entirely —
which is the case that used to be `reference`.

**Caps are enforced limits, not guidance (adopted from market practice rather
than derived).** No surveyed product — SAP/Sigga, Salesforce, D365 Field Service,
ServiceMax, Maximo, MaintainX — replicates a whole entity or ships offline search
over a full record population; all four of these are platform-enforced somewhere
in that set:

- a **device-wide record ceiling** (D365 uses ~200,000)
- a **per-entity row cap** (Salesforce uses 50,000, default 500)
- a **local store volume budget** — the design doc's **SLO-8** (≤ 500 MB, hard
  enforced ceiling), added to this list 2026-09-18. It was always a requirement;
  it was never a number any authoring surface computed against.
- a **traversal depth/breadth cap** counting transitive relationships (D365
  limits to 15 relationships, at most **one** to-many — see §2.3 rule 5)
- **filters permitted on indexed columns only**
- **a filter is required exactly when the whole domain does not fit** — the rule
  below; this replaces the flat "at least one filter per entity, all records is
  refused" (amended 2026-09-18)
- an explicit list of entities that **cannot** be offline, enforced **at
  authoring time** rather than discovered on the device

**Caps are the mechanism, not a readout (2026-09-18, user direction).** Whether
an entity may replicate its whole domain is **arithmetic against these caps**
and nothing else:

> An entity may ship its whole domain when the whole domain **fits** — under the
> per-entity row cap **and** within the volume budget. When it does not fit, a
> dataspy is **required**, and the dataspy's own population has to fit too.

**This is a correction, and what it corrects is worth naming, because two
successive attempts got it wrong the same way.** A rule that classifies entities
as "small, slow-changing domains" is a **description**: it cannot be checked, it
drifts from the data, and it silently licenses whatever the author believed when
they wrote it. The second attempt — *"whole-domain iff no dataspy is authored"* —
looked like data but still rested on an authoring judgement. Both are gone. The
test that separates a measured rule from a described one is whether **moving the
cap moves the verdict**, and that is what `test-workflow-portal.js` asserts.

**Why both dimensions, and not just row counts.** Neither is sufficient alone,
and the registry demonstrates both: **Parts** exceeds the 50,000-row cap
outright, while **Equipment** *fits* that cap at ~40,000 rows (§2.3's own figure
for this customer) and breaches the volume budget instead, because equipment rows
carry nameplate data and custom fields — roughly 625 MB against a 500 MB device.
**A records-only rule passes every check and still overflows the device.**

**Where the counts come from: the server**, which is the only thing that knows.
A count is a **measurement refreshed on demand**, not a live subscription — the
same shape as §30.16's Home tile counts, chosen deliberately so this is an
existing pattern rather than a new one. An entity therefore carries an estimated
row count and an average row size, both **inputs** to the rule rather than
properties an author asserts.

**The consequence for "all records".** It is no longer refused as a category — it
is the *correct* state for any entity whose whole domain fits, and the portal
offers it as **"All records — it fits"** with the measured number beside it. What
§2.7 refuses is an entity that **does not fit** being left unfiltered, which is
the state that replicates a million rows because a field was blank. A dataspy on
an entity that already fits is legal and optional: narrowing because the admin
wants less, rather than because a cap forces it.

**One dead end this rule can reach, and it is honest rather than hidden:** an
entity that does not fit and has **no dataspy authored for it** cannot be
offline-enabled at all. The portal reports it on the row; the fix is to author a
dataspy on the record list screen (§30.14's boundary), not to widen a cap. The
current registry has no such entity, and a test asserts it stays that way —
because the failure mode is a red row no author on this screen can clear.

## 2.8 Lookup resolution offline — a three-way split (accepted 2026-09-03)

Offline, an LOV is **not** served by replicating its source entity. But *how* it
is served depends on the lookup, and there are **three** cases. The governing
insight: split lookups by **cardinality and dependency**, not by reachability —
reachability is the right answer for exactly one of the three rows.

| # | Lookup class | Offline resolution | Why this row exists |
| --- | --- | --- | --- |
| **1** | **Bounded code domains** — Department, Problem Code, Priority, Organization, UOM, Closing Codes, Type of Hours, Trade, Assignment Status | **`replicated` — ship the whole domain.** Already Tier 0 `0f`. | Kilobytes. Subsetting buys nothing and costs correctness: a technician who needs the 41st department cannot pick it, and it reads as a **data error** rather than an offline limitation. Maximo ships this defect today. |
| **2** | **Unbounded entity lookups** — Equipment, Parts, Employees/Crews at scale, Stores/Bins/Lots | **`reachable` — derive the option set from data already on the device** by traversal from the downloaded work (§2.3). | This is where the million-row problem lives, **and the only place it does.** Replication is impossible, a server call is unavailable, and the WO's own referenced records are already present and are what the technician actually needs. |
| **3** | **Definition-gated values** — WO Type, Equipment system type, Class, Status | **`definition-gated` — a value whose selection re-resolves configuration is offline-selectable only if that configuration is present.** Bounded by what shipped in Tier 0, not by what values exist. | Picking one of these **re-resolves the screen.** The value being present is not sufficient; the thing it points at has to be present too. **Most likely row to be missed — and every member of it is already a locked rule elsewhere in this doc.** |

**Row 2 carries an obligation: announce the scope.** *"Showing the 12 assets on
this work order — connect to search all."* **Never a silent short list** — this is
the single highest-risk failure mode of the whole approach, because a short list
looks like correct data. Same honesty invariant as §6.13's truncation rule, one
grain down.

**Row 3, member by member.** All four are existing locked rules that now inherit
a guard rather than each inventing one:

| Value | Depends on | Consequence offline |
| --- | --- | --- |
| **WO Type** | the layout for that Type (`R5PAGELAYOUT` on `PLO_WOTYPE`) **plus** the two WO Workflow tables — `0c` | §13.5 makes Type editable pre-Start-Work with an immediate re-render, so **the offline-pickable Type set is exactly the set whose layouts and workflow rows shipped.** §14.11 protects Type from Start Work onward, so this is a pre-start-only exposure — but a real one. |
| **Equipment system type** | one of the four `PLO_PAGENAME` layouts (§26.8) | Protected in update mode always, so **Insert Mode is the only place it is ever set** — an unavailable layout is *unrecoverable from mobile*, not merely inconvenient. Compounded by those four layouts having no authoring surface yet (§20). |
| **Class** | §22 custom-field **definitions** for that Class | Class *values* are a code domain (`0f`); the definitions are configuration (`0c`). Pick a Class whose definitions never shipped and you get a record with blank fields nobody can fill. **The two live in different Tier 0 sub-tiers, which is exactly why this is easy to miss.** |
| **Status** | status authorizations — `0d` | Already locked: §2.3 consequence 3 forbids enabling the write path without `0d`, so the offline status LOV is bounded **by existing rule**. This row just names it as the same mechanic. |

**Keep `definition-gated` and `not-hydrated` distinct** — they are different
failures with different messages. `definition-gated` means the value or tab
**should not render at all**; `not-hydrated` means it renders and **says it needs
connectivity**. Conflating them reports a configuration error as a sync problem.
Class is the clearest case, because it can fail **both** ways on the same screen:
definitions did not ship (row 3 — the Class should not be pickable) versus values
did not traverse (§22 — the fields render and ask for connectivity).

## 2.9 Per-action offline capability — and the resolution of §2.1's tension (shape proposed 2026-09-08)

§2.7's registry declares what each **entity** does offline; that is not
sufficient. D365 hides unsupported **commands** when the app goes offline, against
a documented list. This app has no such list and needs one — because the
alternative is discovering it per screen.

**The test — one question, two outcomes:**

> **Can the server's answer be deferred without the technician acting on a wrong
> assumption?**
> **Yes → queue it, and keep the action set stable.** §2.1 holds; this is the
> optimistic-UI premise and the right default.
> **No → the action is visibly unavailable, with a stated reason.** §2.1 yields,
> narrowly and deliberately.

This keeps **§2.1 as the rule** and makes visible narrowing the **named
exception**, rather than letting either quietly win. And the app will carry both
paradigms regardless: a GIS feature edit against an online-mode map genuinely
cannot be queued (§28), so the visible-narrowing pattern is required *somewhere*
no matter what was decided for records. Better named as a governed exception than
discovered in the Phase 2 GIS track.

| State | Meaning | UI |
| --- | --- | --- |
| `allowed` | fully local; no server involvement | normal |
| `queued` | accepted optimistically, drains via the outbox | normal, plus the existing §4.4 sync vocabulary |
| `substituted` | a degraded equivalent exists | the simpler control replaces the richer one |
| `blocked-visible` | cannot be deferred and has no degraded equivalent; the technician must know it exists and why it is unavailable | present, disabled, **with a reason** |
| `blocked-hidden` | not meaningful in this state at all | absent |

**Prefer `substituted` → then `blocked-visible` → and only then
`blocked-hidden`, which needs a justification**, because an absent control is
indistinguishable from a configuration error. Two obvious `substituted`
candidates here: an online-only dataspy falls back to the default rather than
being disabled, and server-search escalation falls back to searching the cached
scope **with a stated scope** (§2.8 row 2) rather than refusing.

**Field *state* is never one of these five.** §5.2's states (Required /
Protected / Optional / Hidden / Not Available) resolve from page layout, which is
Tier 0 config and therefore **identical online and offline**. Nothing becomes
Protected because the network dropped — no surveyed product does that, and doing
it would reintroduce exactly the mode split §5.1 exists to reject. **This table
governs actions and controls, not field states.**

### First-pass enumeration — what a technician can actually do offline

**Proposal, not locked** (first pass 2026-09-03, re-based 2026-09-08 for §2.1).
The value is in the shape and in the handful of rows that turn out to be
interesting. Read it as the work-execution answer to "what is on the device and
what isn't" — §2.7 answers that for *entities*, this answers it for *actions*.

| Action | Offline | Note |
| --- | --- | --- |
| Checklist item complete / value entry | `queued` | the canonical offline transaction; every surveyed competitor does this |
| Status change | `queued` | gated on Tier 0 `0d` being present — **no `0d`, no write path at all** (§2.3 consequence 3) |
| **Start Work** on a **hydrated, pinned** WO | `queued` | |
| **Start Work** on a **non-hydrated** WO | **`blocked-visible`** | §14.11: starting a searched WO *is* the promotion into Tier 1, and it must hydrate children. Already documented as needing connectivity — this table gives it a state and an obligation to explain itself |
| Book labor | `queued` | crew expansion (§18.7) resolves against the local `crew_employees` snapshot |
| Issue parts — planned lines | `queued` | |
| Issue parts — ad-hoc part not in the local stock snapshot | **`blocked-visible`** | bin stock is server truth (§17.11); accepting it optimistically means issuing stock that may not exist |
| WO Closing | `queued` | |
| Add comment | `queued` | append-only, cannot conflict (§2.5) |
| Attach a document | `queued` | upload deferred |
| **View** a non-cached document | `blocked-visible` | presigned URLs expire and previews are unavailable offline — already locked (§7.2); the 38px slot degrades to a file-type badge by design |
| Insert WO / Equipment (Insert Mode) | `queued` | needs a client-side temp key + server rekey on sync, and may carry an **unresolved** equipment reference (a scanned tag the server resolves) |
| Search within the cached scope | `allowed` | **must state the scope** (§2.8 row 2) |
| Run the active dataspy offline | `substituted` | it filters what is on the device, under the scope rule. If its predicates can't be evaluated locally it falls back to the default view — **never disabled.** *(Revised 2026-09-08: this used to be two rows, `allowed` for an offline-capable dataspy and `blocked-visible` for an online-only one. Classification is gone with the index — there is no longer any such thing as an online-only dataspy.)* |
| Server search | `substituted` | falls back to cached-scope search **with the scope stated**, rather than refusing. *(Was `blocked-visible` as a Tier 4 escalation; under §2.1 server search is the primary path, so its offline degradation matters more and deserves the better state.)* |
| Manually cache a record — "keep offline" (R5) | **`blocked-visible`** | it has to fetch and traverse, so it needs connectivity by construction. Worth stating because the control is most tempting exactly when it cannot work |
| Retry / discard a failed outbox item | `allowed` | queue management is entirely local — and this is **R6's core surface**, so it must never depend on connectivity |
| Open a **UDS child tab** placed in the resolved layout | `allowed` | its rows traverse with the record, indefinitely (§27.5) |
| Open a **UDS child tab** on a re-typed WO whose rows never traversed | `blocked-visible` | renders and says *not hydrated* — otherwise indistinguishable from a legitimately empty tab (§27.5's mirror case) |
| Open a **standalone UDS record view** | **`blocked-visible`** | permanently `server-only` (§27.2). **Never `blocked-hidden`** — a nav destination that silently vanishes offline is this table's own worst failure mode |
| **Main Isolation** (Phase 2) | `allowed` **iff** the four `r5mainisolation*` tables were downloaded | the **action-level** analogue of §2.8 row 3: an action gated on whether its reference data shipped. The opt-in already exists in the shipping product (§28.4) |
| GIS feature create / attribute / geometry edit — map in **offline** mode (Phase 2) | `queued` | into the ESRI replica, **not** the EAM outbox (§28.2) |
| GIS feature create / attribute / geometry edit — map in **online** mode (Phase 2) | **`blocked-visible`** | the shipped product already blocks this and notifies (§28.3). **The one place visible narrowing is unavoidable** — and the reason this whole table exists |
| GIS feature delete (Phase 2) | `blocked-hidden` | not implemented in the product at all (§28.1) — a justified absence |
| Anything requiring a server-side rule, flow or recalculation | `blocked-visible` | the general case |

**The last row is a trap for the conditional-field-rules work (§13.1–§13.4).**
D365 documents that offline *"any actions that require an API call, server call,
or Power Automate flow will not work."* If a field-level condition is evaluated
server-side it **silently does not apply offline** — the form accepts values the
server will later reject, which is §2.3 consequence 3's failure mode arriving
through a different door. That is the third one-way door recorded in §20.

**Who authors this list is a different answer from §2.7's registry**, and the
distinction is the point. Entity offline policy is **customer-configured scope**
— it belongs with Sync Config and gets capped and validated. Per-action
capability is a **product-declared architectural fact**: whether Start Work can
complete without a server is not a customer preference. So the list is
**product-owned and versioned with the app — deliberately not a Screen Designer
control** (§20). Screen Designer already has unbuilt controls owed to it; adding
a fourth that nobody should be editing would be a mistake.

## 2.10 Is "offline" a switch? — profile assignment, not a boolean (shape locked 2026-09-08)

**First, decompose it.** "Offline" is three capabilities, not one, and only the
third is switchable:

1. **Tier 0 configuration — always persisted.** Never switchable; without it
   there is no renderable screen (§2.3 consequence 2).
2. **The outbox — always on.** It serves R6 / transaction confidence, which is a
   High VoC theme **independent of offline**: a save dropped mid-request happens
   at full connectivity.
3. **Record replication — the only switchable layer.**

**Second, it is not a boolean — it is profile assignment.** An **offline
profile** is a named bundle of §2.7's entity registry, its caps, §2.8's lookup
classes and Sync Config, **assigned on User Group Setup** per §26.5's binding
paradigm. **"None" is the off state.** Primary grain is **user group**, with a
**device** axis applied as `min(group, device)` and per-user as override only.

**The line against "this is a mode."** It will be challenged against the SWG's
*"not a mode choice,"* so state it plainly: an **admin-provisioned capability,
invisible to the technician and fixed for the session, is provisioning** — the
same category as nav slots or dataspy assignment. It changes what the app *can
do* for that user; it never changes what the app does moment to moment. The
technician is never asked to choose.

**One real design consequence: §4.4.1's sync control changes meaning** and needs
a distinct state or copy. For a replicating user, "Offline" means *working from
the device*; for an online-only user it means *you cannot load work*. **Same
icon, opposite promise** — and this is the only place the switch is visible to
the technician at all, which is the correct amount of visible.

**Where a profile is authored and assigned: §30.14.** The portal's Offline
Profiles area composes the bundle this section defines, and assignment runs over
the one membership table §30.13 locks — so a profile can be assigned from the
profile's side or from the group's, and both read the same rows. It renders the
two never-switchable layers (Tier 0, the outbox) first and treats profile
**None** as valid and informational, exactly as this section requires. The two
axes this section names past the group — the **device** axis as
`min(group, device)`, and per-user as override only — are **not** modelled by
that surface and stay open in §20.

# 3. Design System

## 3.1 Style direction

Three styles were explored: Modern Enterprise, Rugged Dark, and Industrial Neutral. Industrial Neutral (V3) was selected.

| | |
| --- | --- |
| **Description** | Dark slate nav chrome + white body content. Feels like a digital work permit, not a consumer app. |
| **Target user** | Technician in a plant or field environment — may be wearing gloves, working in variable lighting |
| **Rejected** | V1 Modern Enterprise (too Jira/software-forward), V2 Rugged Dark (too heavy for indoor use) |
| **Dark mode** | Fully supported — toggle in prototype header. Dark mode uses Octave Black (#1A1A1F) as canvas. |
| **Dark mode default — differs by build** | Standalone prototypes default to light mode (for review purposes only, per `CLAUDE.md`). The compiled prototype (`prototypes/wo-workflow/index.html`) defaults to dark, matching this section's design direction. |

## 3.2 Design Tokens — Octave Palette

All colours are from the Octave design system extended palette. Both light and dark mode mappings are implemented.

### 3.2.1 Core palette

| Swatch | Token / Hex | Usage |
| --- | --- | --- |
| **Octave Black** | #1A1A1F | Primary chrome/nav surfaces, dark mode canvas |
| **Gray 5** | #3E4047 | Nav background (light mode), step rail, borders |
| **Gray 4** | #6F7480 | Secondary text, muted icons, inactive states |
| **Gray 3** | #B2B8C4 | Tertiary text, placeholder text |
| **Gray 2** | #CBD0D8 | Borders, dividers |
| **Gray 1** | #E7EBF2 | Background tints, section fills, bar backgrounds |
| **Purple** | #9933FF | Primary brand accent — active step, selected state, required field left bar |
| **Orange** | #F46600 | Priority/urgency — Breakdown WO type bar, required field marker, follow-up active |
| **Dark Green** | #00AA14 | Success/complete — bar ready state, sync synced, Pass/OK/Yes fill, available qty |
| **Red** | #E24B4A | Fail/error/negative — Fail/Repair/No fill, sync error, NC flags |
| **Octave Yellow** | #FFF500 | **Removed from the step rail 2026-07-22 (flagged to revisit, not a locked reversal)** — see the note under §3.2.2 below. |

### 3.2.2 Semantic usage

| Semantic | Token |
| --- | --- |
| **Active / selected** | This whole row (and the one below it) is stale — superseded by §23, which retired purple as a UI-state accent app-wide. Selection now reads via ink weight/fill, not hue. Don't treat this table as current for anything §23 already covers; it predates that pass and was never swept. |
| **Step rail — Not Free Form WO workflow** | **Flagged to revisit, 2026-07-22 (user direction) — not a locked decision anymore.** The Octave Yellow wash (`.rail-not-free-form` in `eam-shared.css`) read badly in practice and was removed outright rather than re-tuned — the rail now looks identical regardless of Free Form/Not Free Form state. This is a real gap: Not Free Form workflows have *no visual signal at all* right now, only whatever the (currently inert, protected-status-only) behavioral difference implies. Needs a real answer later — just not yellow, and not today. |
| **Positive answer** | Green (#00AA14) — Pass, OK, Yes, Good, confirmed checkbox |
| **Negative answer** | Red (#E24B4A) — Fail, Repair Needed, No, Poor |
| **Adjusted / warning** | Orange (#F46600) — Adjusted toggle, follow-up button active |
| **N/A / neutral answer** | Gray 4 (#6F7480) |
| **Sync: synced** | Green (#00AA14) |
| **Sync: offline** | Gray 2 (#CBD0D8) |
| **Sync: error** | Red (#E24B4A) |
| **Sync: syncing** | Purple (#9933FF) |
| **Required field marker** | Orange (#F46600) left bar on form row (3px, inset) |
| **Protected field** | Gray tint background, muted value, lock icon instead of chevron |
| **Group: Safety** | Orange — header tint rgba(244,102,0,0.09), bar rgba(244,102,0,0.35) |
| **Group: Main checklist** | Purple — header tint rgba(153,51,255,0.09), bar rgba(153,51,255,0.35) |
| **Group: Close-out** | Green — header tint rgba(0,170,20,0.09), bar rgba(0,170,20,0.35) |

## 3.3 Typography

| | |
| --- | --- |
| **Octave brand font** | Aptos Regular — Microsoft-proprietary, not available via CDN |
| **Prototype stand-in** | Inter (Google Fonts) — closest publicly available match, same Swiss rational sans-serif character |
| **Monospace / UI code** | JetBrains Mono — WO numbers, part numbers, sequence counters, timestamps, char counts, metadata, bin locations |
| **Rejected** | IBM Plex Sans (used in earlier prototype versions) |
| **Why Inter over IBM Plex** | Better match to Aptos proportions and weight; used by Atlassian as the basis for Atlassian Sans |

### 3.3.1 Container labels vs. field labels — one font, weight/size only

Container/section labels and form field labels were drifting visually because
of inconsistent weight/size choices, not because of a font mismatch — both are
Inter. Locked rule: same family everywhere; differentiate by weight and size
only.

| | |
| --- | --- |
| **Field labels** | Inter, regular weight, 13px (unchanged) |
| **Container / section headers, card titles** | Inter, weight 600, 14px, full text colour (`--octave-black` / white in dark mode) — 1px larger than field labels. Exact match to the Comments/Documents toggle-row title (`.rv-toggle-title`), the pattern every other container header now conforms to. |

Revised mid-sweep: the first pass made these bold (700), uppercase, and muted gray (`--gray-4`) — visually a completely different treatment from Comments/Documents, which just use semibold (600) full-strength text with normal casing. Corrected to match Comments/Documents exactly: no uppercase, no letter-spacing, no muted color. Applied to `.section-card-title`, `.section-label`, `.desc-card-title`, `.form-section-label`, `.group-name`, `.fg-toggle-title`, and the ad hoc "Activity summary" labels (now a shared `.mini-section-label` class) across Equipment, `prototypes/wo-workflow/index.html`, and all WO standalones.

## 3.4 Component Patterns — Locked

| Pattern | Spec |
| --- | --- |
| **No icons inside any pill or field — locked 2026-07-16, open question flagged** | A pill (org-pill, entity-pill, a status/type pill on a card or list row) or a field's own value never contains an icon glyph. Text/label only, colour where a rule elsewhere grants it (e.g. §6's Type/Status). Raised during the WO List overhaul (§6) for being "too busy" — too many icons and colours competing with the actual content — stated as a general rule, not screen-specific, and applied that way in §6. **Not yet reconciled against `.attr-badge`** (§5.2 Header Fields box) — Type/Priority/Class/Status there render as an icon glyph inside a colour swatch (WO Record View, Equipment, Home's Insert Mode §9.4), which this rule as stated would also prohibit. Left as-is pending a decision: is `.attr-badge` a deliberate exception (different shape — a square swatch, not a rounded pill — and a different field-precedence context), or does it need the same icon-removal treatment §6 just got? |
| **Step rail** | Collapsed: pill + name + segmented bar (+ timer pill when running). Expanded: vertical timeline with icon/badge/meta per step. |
| **Progress bar style** | C-style: neutral strip + inset pill. Pill transforms locked→ready→done. |
| **Prompt bar style** | Option 4: monospace question label + segmented yes/no control. Full-width, edge-to-edge. |
| **Group color bar** | Option B: tinted section header + 35% opacity bar on items. Bar runs full item height including notes row. |
| **Checklist item** | Hybrid B/C: rail icons (right column) + inline notes trigger row + follow-up in notes row. |
| **Toast style** | Dark chip, bottom of screen, text only (no icon), 2.4s auto-dismiss, context-specific message. Icon-less on every screen — orange was retired as an instrument entirely (§23). |
| **Bottom sheet style** | Border-radius 20px top, handle bar, header with title + close, scrollable body. Every sheet needs real bottom breathing room (~20px) below its last row — sheets with a `.sheet-footer` (Save button etc.) get this for free from the footer's own padding; a short sheet with no footer (e.g. the comment actions menu) needs this padding added explicitly. |
| **Insert Mode sheet — full-screen, not the compact bottom-sheet** | See §9.2 for the full canonical spec (shell, header, footer, dismiss/swipe-to-dismiss behavior). Noted here only because it's a deliberate exception to this table's own "everything is a bottom sheet" default. |
| **Insert Mode's z-index must sit below every sheet/toast it can trigger** | `z-index:199` — below every transient overlay (`.bottom-sheet` 201, `.confirm-overlay` 260, `.toast` 300), above ordinary page content. Any future full-screen overlay needs its z-index checked against the rest of the stack, not picked in isolation. |
| **`.app` must clip its own children — `body{overflow:hidden}` is not enough** | Every closed sheet sits off-screen via `transform:translateY(100%)`, not `display:none` — still fully laid out in the DOM, just visually pushed below the fold. `.app` itself needs `overflow:hidden` (or `overflow:clip`, see below) — `body{overflow:hidden}` alone isn't a clipping boundary for `.app`'s own children. |
| **Clipping boundary should be `overflow:clip`, not `overflow:hidden`, where sheets live inside a nested scroll container** | `overflow:hidden` clips visually but still creates a real scroll container — a `focus()`/`scrollIntoView()` call on a descendant can programmatically move that container's `scrollTop` even though nothing is user-scrollable there, which desyncs a closed `position:absolute;bottom:0` sheet's rendered position from the container's visible edge. `overflow:clip` clips identically but can never become a scroll container. Applied to Equipment's `.app` and `.tabs-container` (its real sheet-clipping boundary, since its sheets live inside `#tabsContainer`, not directly in `.app`). |
| **Sync panel** | Bottom sheet variant with per-item dot rows and hydration progress bars. |
| **Form field: editable** | Label left (120px, gray-4), value right (monospace, body colour), chevron right edge. |
| **Form field: protected** | Same row pattern. Gray tint background, muted value colour, lock icon instead of chevron. Not tappable. |
| **Form field: required** | Orange 3px left bar, inset from edge. |
| **LOV field: code + description** | Every plain LOV field (a reference-data lookup with a real list — Department, Cost Code, Assigned To, and the like) shows code + description, always, in the field row and the LOV picker sheet. Organization is separate (§3.4.1) — code only, no description, its own pill component. See §21 for the retired "description only" default. |
| **System codes (Status, Type, Priority): always description-only** | Distinct, permanent carve-out from the row above — the opposite direction from Organization's code-only case. Status/Type/Priority never show a code anywhere: not in the field's own display (they render as a colour badge/button, per `BADGE_LOV_META`/`__status`, never a plain `.field-lov-value` row) and not in the LOV picker sheet either — `openLov()`'s picker list is guarded by an explicit `isSystemCode` check (`key === '__status'` or `BADGE_LOV_META[key]` exists) so this can't silently regress to showing a code. |
| **Field value colour** | Body colour always. Purple reserved for the timer pill, section badges, and focus states — never on field values. |
| **Save button gating** | Gray + no-cursor while required fields incomplete; green + ready when satisfied. Applies to every sheet save button. |
| **Detail grid values** | Description only for reference-data/lookup values — e.g. "Maintenance" (not "Maintenance (MAINT)"). Identifier-type codes (part/asset/employee/WO numbers) are unaffected. Applied to Equipment and all 5 WO workflow standalones. |
| **Date fields — plain numeric, never spelled-month/relative/urgency-tinted, app-wide** | Every date field anywhere in the app renders via `isoToDisplay()` (`eam-shared.js`) — plain numeric, no relative/urgency formatting. The numeric format itself is locale-driven, not universally "MM/DD/YYYY" — this app targets North America/Europe/Asia at minimum, and DD/MM/YYYY (Europe) / YYYY/MM/DD (parts of Asia) are real cases. `isoToDisplay()` currently hardcodes `'en-US'` as a stand-in only, since no per-user locale/session concept exists yet — flagged in §20; don't assume every screen's current MM/DD/YYYY is locked for every user. Changing the function only affects values re-rendered through it — hardcoded initial-render literals baked into a screen's markup don't update themselves (§20 tracks which screens still have stale literals). |
| **Time-of-day fields — always 24-hour "military," never AM/PM, regardless of locale** | Unlike dates (locale-driven, row above), this is a deliberate fixed business rule — 24-hour is the standard EAM deployments enforce for technicians regardless of region. `lang="en-GB"` on every `<input type="time">` is a best-effort hint toward this, but doesn't reliably work: modern Chrome renders time-input chrome off the browser's own UI language (`navigator.language`), not the page's `lang` attribute. Accepted as a platform limitation (same category as "desktop shows its own spinner instead of a scroll wheel") — every bit of the app's own rendered text is always 24-hour regardless; only the native picker's own transient edit chrome is outside our control. |
| **Section card** | Consistent header (title, optionally a status/count badge where a screen calls for one) and consistent border/radius across all steps. |
| **Every container is collapsible — EXCEPT a Grid container** (added 2026-07-16; grid carve-out 2026-09-16) | **The carve-out first:** a **Grid** container has no collapsed state. A two-up field grid collapsing to a header strip loses the thing it exists for, so Grid offers **Expanded or Hidden** and nothing else, while List offers all three (§5.2's "Container shape is per-container" row). Everything below is unchanged and applies to List containers. The section-card header is the tap target (the whole row, not a separate chevron button) — toggles a `collapsed` class on the card, chevron rotates -90° when collapsed, body hides. Default open/collapsed state is a per-screen call, not a mandated universal default — required content defaulting open and optional content defaulting collapsed is a sensible starting heuristic, not a rule. Reference implementation: WO Closing's 4 section cards — Closing Codes and Closing Comments (both required) default open; Downtime Details and Attachments (both optional) default collapsed. Not yet ported to Equipment or the sample screen. |
| **Btn: contained** | White bg, dark text, 48–50px height, 100px border-radius. Hover: aqua bg, very dark text. |
| **Btn: outlined** | Transparent bg, solid border (Gray 5 / white in dark), same pill radius. Hover: aqua border + text. |
| **WO icon language** | Type/priority/status icon set per §6.7 — consistent across list, cards, chips, and filter sheets. |
| **Currency fields — display** | Every currency-typed field displays a `$` symbol, thousands separators, and 2 decimals on render (e.g. `$50,000.00`), formatted from a raw numeric value — never a bare number. |
| **Currency fields — edit input** | Researched and decided against live comma-insertion while typing (which was the initial request) — cursor-jump when a separator is inserted/removed mid-string is the standard, well-documented failure mode of live-formatting currency inputs. Locked pattern instead: raw digits + decimal point only while the field has focus (no `$`, no commas); `inputmode="decimal"` for the numeric keypad without `type=number`'s native-spinner/pasted-comma problems; empty field shows a `0.00` placeholder but stores nothing until typed; on save, format with `$` + commas + 2 decimals (`formatCurrency()`). Re-opening an existing value shows the raw stored number (never re-derives from the formatted display string). Sources: uxpatterns.dev's Currency Input Pattern, the "Clean + Format" UX pattern, Pega's Currency Input component. |
| **Number fields — no native spinner arrows** | `input[type=number]`'s native up/down spinners don't theme reliably across light/dark (a real, confirmed visual bug) — removed via `-webkit-appearance:none` / `-moz-appearance:textfield` rather than trying to reskin them. Numeric keyboard still appears; the field just no longer shows browser-chrome spin buttons. |
| **Codes render in monospace, descriptions never do** | Locked, explicit rule (previously implicit): anywhere a reference-data code is shown at all — the header's big record number, `.field-lov-code`, `.lov-option-code` — it renders in JetBrains Mono. Descriptions, at every size and every context (the header's description line, `.field-lov-desc`, `.lov-option-desc`, body field values), always render in Inter. This is independent of the §3.3.1 container-label-vs-field-label weight/size rule and independent of the §3.4.1 exception list — it's purely about which font family a code vs. a description gets, everywhere both can appear. |
| **Long-text editor sizing** | Must reliably fill nearly all available vertical space when opened — not size to content. `max-height` alone does not force a `flex:1` textarea to grow; use an explicit `height`, and use a percentage rather than `vh` if the sheet lives inside an `overflow:hidden` container shorter than the viewport (a `vh`-based height would overflow that container's top edge and clip the sheet's own header/controls; percentage resolves against the actual containing block instead). |
| **Long-text editor: discard replaces the close button, not beside it** | When there are unsaved edits, tapping close swaps the `✕` for a red "Discard unsaved changes" pill in the same slot — never both visible at once. Typing again dismisses the pill and restores the `✕`. |
| **Sheet header layout — standardized** | Every field-edit sheet (LOV, edit/currency/number, date) uses the same 3-part header: close `✕` (left), title (centered, `flex:1;text-align:center`), Clear (right, plain text link — not a button chip, not grouped with the `✕`). Matches reference screenshots (`Downloads/Ref Shots/Field Bevaviors`) exactly. Long-text/Comments sheets are the one exception — see the row below. |
| **Clear visibility — required OR empty hides it** | Clear is hidden for two independent reasons, either one is sufficient: the field is required (set by screen design or system design — clearing a required field to empty would contradict the requirement), or the field is already empty (nothing to clear). Shown only when a field is both not-required and currently populated. Applies to LOV, edit/currency/number, and date sheets — not to long-text (see below). |
| **No Clear on textareas** | Long-text editors (and Comments, which reuses the same sheet) never get a Clear action — the user selects all and deletes manually instead, same as any native text editing. This is a deliberate exception to the "Clear on every sheet" rule above, not an oversight. |
| **No custom keyboard-toolbar mock — reverted** | An earlier pass mocked a bottom bar (emoji + mic) to represent the native OS keyboard's own toolbar row. Removed after review: with no actual keyboard present on a desktop browser, the bar reads as a broken/floating custom control rather than "the keyboard's own row" — it looked worse than showing nothing. Dictation is entirely the device keyboard's job; nothing to build for it. |
| **Inline text editing (≤255 characters)** | Short plain-text fields are edited directly in place — tap into the row, no popup/sheet at all. Tapping away, pressing Enter, or the native OS keyboard's own Done/confirm control all commit the value and mark the form dirty — there is no bespoke floating confirm button (an earlier floating green checkmark FAB was removed app-wide; it duplicated the native keyboard's own confirm affordance). This supersedes the single-line edit sheet for plain text specifically — that sheet is still used for Currency/Number, just not text. |
| **Inline text: label above, cursor starts left-aligned beneath it — the field's permanent shape** | Every standalone free-text field that is NOT inside a collapsible container: label always sits on its own line, the cursor starts left-aligned underneath it, and the value spans the full row width, wrapping to as many lines as needed. The field is deliberately a bit taller than a plain LOV/date row as a result, by design. Two exclusions: a genuine multi-line textarea (Comments, Closing Comments — a different component already) and a same-shaped field inside a real collapsible container, which keeps the old conditional/compact shape instead. |
| **Tap anywhere in the row, not just the value/input** | Every editable field type must be openable/focusable by tapping anywhere in its row — the label side, not just the value side. Applies identically to Grid cells (`.attr-item`) and List rows (`.form-field`). |
| **Numeric/Integer field — inline, no popup, digits-only keyboard** | Distinct from the Standard Model's Number field (Currency/Number cluster above, which still opens the edit sheet) — this is the shape a plain numeric/integer count gets when it lives inside a Header Fields grid cell: types directly in the cell, no sheet. `type="text" inputmode="numeric" pattern="[0-9]*"` (not `type="number"`, to skip native spinner arrows/scientific-notation quirks) plus an `oninput` handler that strips any non-digit. Real consumer: Activity Insert/Update Mode's People Required and Estimated Hours grid cells, and the Activity identifier field itself. Screen-local in `eam-wo-record-view-prototype-v1.html`; promote on a 2nd consumer. |
| **Comments use the exact same long-text pattern** | Adding/inserting a comment and editing an existing long-text field are the identical UI pattern (full-screen editor, no Clear, discard-replaces-close). Comments added to the master field-type reference for this reason — it isn't a distinct field type, just the same long-text sheet opened from an "Add comment" row instead of an existing field row. |
| **Comments: ellipsis menu (Edit / Delete / Copy), permission-driven** | Each comment has an ellipsis (`⋯`) next to its timestamp. Tapping it opens a menu styled like an LOV list (same row/divider styling) but with no selection indicator — these are actions, not a choice being made. Edit/Delete/Copy for the comment's own author; every other user sees Copy only. Edit reopens the exact same long-text editor used for adding a comment or editing any other long-text field, pre-filled with the current text, saving back in place. Delete requires confirmation (see "Centered confirmation modal" below) before removing the row. Copy uses the clipboard API where available, confirms via the standard bottom toast. |
| **Centered confirmation modal (Delete etc.)** | Destructive actions get a centered dialog, not a bottom sheet — "Are you sure you want to delete the comment?" with Cancel / Delete. A reusable `openConfirm(message, onConfirm)` utility, not a one-off for Comments; use it anywhere a destructive action needs a confirm step. Distinct component from the bottom-sheet pattern used everywhere else in this app — sheets are for choosing a value or editing; this is for confirming a destructive action, and reads better centered. |
| **Revisit: HTML-enabled rich text for Comments** | Open question, not yet decided: should Comments support HTML/rich-text formatting (bold, links, lists) rather than being a plain `<textarea>` like every other long-text field? Flagged to revisit — this would NOT apply to ordinary long-text fields, only Comments specifically, if decided. |
| **'Clear' action on every field-edit sheet** | Every sheet that edits a single field's value (LOV picker, text/number/currency edit sheet, date picker) gets a "Clear" action in the header (see "Sheet header layout" row above) — supersedes the date picker's earlier bottom-positioned "Clear date" button. Visibility rule: see "Clear visibility" row above. Long-text/Comments are excluded — see "No Clear on textareas." |
| **No "Not set" placeholder text on empty fields** | Empty fields just sit blank — no gray "Not set"/hint text. Applies everywhere a field can be empty: LOV description, edit-sheet value, date value, inline-text value. (The date/currency input placeholders inside the edit sheets themselves, e.g. `0.00`, are a different thing — those are input-level hints while actively editing, not the at-rest empty-field display.) |
| **Search bar on lookups, not on short dropdowns** | LOV sheets for reference-data lookups (Department, Cost Code, Assigned To, Organization — anything with a longer, searchable list) get a search bar directly under the header, filtering the option list in real time as the user types (matches `Downloads/Ref Shots/lookup.png`). Short fixed dropdowns (Status, Type — a handful of options, nothing to search) don't get one. Distinction lives in a `NO_SEARCH_LOVS` set — an explicit exception list, not inferred from list length. |
| **Currency input: active sanitization, not passive `type=text`** | Confirmed on a real mobile device: something (OS keyboard/autofill — the app has no control over which) was live-inserting thousands separators while typing, despite the input being a plain `type=text` with no formatting code of ours attached — commas appeared after the 4th digit, then again after the 7th. Passive `type=text` wasn't sufficient. Fix: an active `oninput` sanitizer strips everything except digits and a single decimal point on every keystroke, regardless of what the OS/keyboard tries to inject, preserving cursor position from the end of the string. This is the "Clean" half of the "Clean + Format" pattern (uxpatterns.dev / Rivet) — clean continuously while typing, format once on save. |
| **Dates display in the user's locale** | Prototype hard-codes `toLocaleDateString('en-US', ...)` as a stand-in — the real app must format every date using the logged-in user's actual locale, not a fixed one. Flagged at each `toLocaleDateString` call site in code comments so this doesn't get missed during real implementation. |
| **LOV descriptions display in the user's language** | Reference-data descriptions (Department, Cost Code, Status, etc.) are hard-coded English strings in the prototypes — the real app must resolve them via the logged-in user's language setting (i18n), not ship one fixed set of description text. Not yet reflected in any prototype's data structure — flagged here as a forward dependency, same as the WO Workflow Setup dependencies in §15.4. |
| **Checkbox fields** | The entire form-field row is the tap target, not just the small checkbox box — a small isolated tap target is suboptimal UX. Visual: 22px rounded-square box. |
| **Dirty-state indication** | No persistent "unsaved changes" banner. Dirty tracking still exists internally (drives autosave-on-navigate, §5.1) but has no ongoing visual nag — the save-confirmation toast on navigate-away is sufficient feedback. Removed from Equipment (was the only screen that had one). |
| **Tab rail / step rail background** | See §14.2 for the current surface treatment (`var(--bg-card)` fill + elevation shadow, no colour wash). See §21 for the retired purple-wash version. |

### 3.4.1 Organization — the one code-only, no-description case

As of 2026-07-16, plain LOV fields no longer need an exception list at all
— code + description is just the default now (§3.4). **Organization is
the one remaining deviation**, and it's a stricter variant than the old
default ever was: the code renders, and the description is deliberately
*not* shown next to it anywhere in the field's own display (the LOV picker
sheet still shows the description, for selection clarity — only the
target field's own rendering drops it). Org codes are short, memorized
shorthand (e.g. `ORG1`), and pairing a rotating description next to them
in a compact pill adds clutter without helping identification, unlike
every other LOV field where the description carries real information.
This lives on the Organization pill component itself (§9.3), not the
generic `.field-lov-value` row markup every other LOV field uses.

Identifier fields (employee ID, part number, asset number, WO number,
bin/lot codes) also show code + description — same visual result as the
general rule now, though the underlying reason is different: the code IS
the record's real-world identifier here, not a lookup being made more
visible. No special-casing needed for them either way.

The former exception-list mechanism (`CODE_VISIBLE_FIELDS`, an opt-in Set
for Cost Code/Store) is retired along with the description-only default it
existed to carve exceptions out of — see §21.

# 4. App Shell & Global Screens

Persistent, app-wide chrome and entry screens — everything the technician
passes through or relies on regardless of which record or workflow they're
in. Distinct from the Standard Model (§5–§9), which governs any individual
record screen, and from the WO Workflow (§14–§19), which is specific to
guided WO execution.

## 4.1 Login — pending, not designed

Not yet designed. Known constraints to design against once started:

- Must support an offline-capable session — the architecture (§2) requires
  the app to be usable within ~30s of launch even without connectivity, so
  login can't hard-block on a live network call every time.
- SSO/OIDC login and biometric unlock are both in outstanding scope
  (carried over from §20).
- Reference: `docs/existing_use_cases/EAM.DUX.REQ.Login.docx` (DUX's Login
  spec) is a useful source for terminology and known edge cases — but DUX
  is fully online with no offline story, so its mechanics don't transfer
  directly; treat it as reference material, not a spec to replicate.
- Open question, not decided: does this app need a quick-timeout re-auth
  pattern (legacy Mobile's "quick login" screen, returning to the last
  screen after inactivity), and if so, what triggers it?

## 4.2 Navigation Bar

Persistent global chrome, distinct from the per-record tab rail (§7.1) and
the WO workflow's step rail (§14.2), which both operate one level down,
inside a single record or workflow. Two elements, both driven by one piece
of state — whether the technician is **browsing** (no record open) or has
a **record open** (a Work Order or Equipment Record View, and everything
nested under it: List/Detail child tabs, WO workflow steps — engaging with
a record at any depth counts):

The bar's current-screen title is centered via `.nav-title` — see §5.2's
"Nav bar — centered screen title" row for the exact rule and the
`position:absolute` implementation (kept there since it's part of the
Standard Model's header spec, not chrome-specific).

- **Bottom app-level navigation bar** — three items: Home, Work,
  Notifications ("Work Orders" shortened to "Work" for this bar
  specifically — full name everywhere else). Visible while browsing;
  hidden entirely the moment any record is open. Equipment has no item
  here — it's a destination, not a persistent top-level section, reached
  in context (e.g. from Home) rather than from this bar.
- **Bottom nav visual treatment, locked 2026-07-16** (built and reviewed
  in `eam-home-screen-prototype-v1.html`, the first real consumer):
  - **Anchored, not floating** — full-width, flush to the bottom edge, no
    inset margin or capsule shape (rejected precedent:
    `docs/reference_screenshots/nav bar ref.png`'s floating pill — not
    worth it without heavy scrolling to justify hiding chrome). It's
    `position:absolute` rather than a normal flex-flow sibling specifically
    so it can sit *over* real scrollable content — that's what makes the
    glass effect below genuine rather than decorative. Any screen with its
    own full-bleed local mode (e.g. Home's favorites/tile reorder mode)
    must explicitly hide it rather than let content overlap it.
  - **Genuinely glass** (precedent: `docs/reference_screenshots/jr home
    1.png`) — `backdrop-filter: blur(20px) saturate(160%)` over
    `color-mix(in srgb, var(--bg-nav) 96%, transparent)`. 96%, not a lower
    number — anything much more translucent read as a washed-out gray
    against the page showing through rather than matching the top nav
    bar's solid black; the blur/saturate still does real work whenever
    content scrolls close beneath it, just without visibly diluting the
    color at rest.
  - **Equal-width fixed slots (84px each) + `justify-content:center` +
    `gap:14px`**, not `space-around`/`space-between` sized to each item's
    own content. Home's label is short and Notifications carries a badge
    plus the longest label — content-sized items left Home sitting much
    farther from the center item than the center item sat from
    Notifications. Fixed-width equal slots guarantee identical visual gap
    on both sides of the middle item *and* put it at the bar's true dead
    center, regardless of label-length asymmetry among the three.
  - **Active state = a white glass pill** (`rgba(255,255,255,.16)` fill +
    `rgba(255,255,255,.22)` border, white icon/text) — chosen over a
    purple tint after building and comparing both; reads as its own
    frosted chip sitting on the blurred bar rather than a color accent.
  - **Badge positioning convention**: a badge is always positioned
    relative to a tight wrapper sized to its own icon, never to the whole
    nav-item button — the button's box includes the label, which is wider
    than the icon for a long label like "Notifications," so anchoring to
    the button drifts the badge away from the icon it belongs to.
- **Top-left slot of the per-screen nav bar** toggles with the same state:
  profile avatar (§4.3) while browsing — supersedes the app logo mark
  originally specified for WO List (§6.2) — swaps to the standard back
  button the instant a record is open. Back pops to the previous screen
  (in practice, almost always that record type's List/Search screen),
  which restores both the bottom nav bar and the avatar. `.nav-avatar`
  lives in `eam-shared.css` (nav-bar chrome, same category as
  `.nav-back`). No runtime toggle function exists or is needed — no
  single screen is ever both tiers at once, so this is a static
  per-screen choice of which markup to render. WO List's main header
  shows the avatar too (top-level, browsing tier); its separate Search
  sub-screen still shows a back button instead — a remaining gap, tracked
  in §20's "WO List's Search sub-screen" row.
- **`PROTOTYPE` dev watermark lives in the top-left slot, not the
  right.** It used to sit in `.nav-actions` next to the sync control,
  which crowded that corner and made it read as if it were part of the sync
  status rather than an unrelated
  dev-only label. Now grouped with whichever top-left control the screen
  already renders — `.nav-back` or `.nav-avatar`, same either/or as the
  rule above — inside a new `.nav-left` flex wrapper, so `.nav`'s locked
  centered-title math (§5.2, space-between across exactly 2 real
  children) still holds regardless of which side carries it. Also sized
  down a notch (10px→9px) since it's a watermark, not content — legible
  enough to glance-confirm "this is a prototype," nothing more is asked
  of it. Applies to all 10 live screens.
- **Browsing-tier nav bars can carry extra right-side actions beyond
  avatar+sync — gap identified 2026-07-16.** Not previously spelled out
  here: WO List's own right-side actions (Create +, Search, §6.2) coexist
  fine alongside the avatar/sync pair: the avatar occupies the top-left
  slot per the rule above, and screen-specific actions are additive on
  the right, same as they always were. Nothing about "browsing tier"
  restricts a screen to *only* avatar+sync.
- The sync status icon (§4.4.1) is unaffected by this toggle — top right,
  present on every screen regardless of browsing vs. record-open state.
- Reference: `docs/existing_use_cases/EAM.DUX.REQ.DigitalWorkHome.docx` is
  the closest existing precedent for top-level app chrome — reference
  only, not a spec (DUX is fully online, this app is not).
- **Search — two cases, resolved 2026-07-16:** a record-view list's own
  Search screen (§6.1 — WO List's Search, and any future record-view
  list's search) stays in the browsing tier: avatar, bottom nav visible,
  no back button. It needs no dedicated dismiss control — the bottom nav
  is already the way out: tap the same tab's icon to fall back to that
  list, tap a different tab's icon to leave entirely, or tap a result to
  open it, which transitions into the record-open state like any other
  record. List/Detail (child-tab) search — Comments, Documents, etc.,
  §8.1 — is not a separate case: those tabs are already inside an open
  record, so they already get the record-open treatment (back button,
  bottom nav hidden) whether or not search is active within them.
- **Tap the top nav bar to scroll to top — locked 2026-07-20, universal,
  every screen.** Not a per-screen affordance to opt into case by case:
  tapping anywhere on the top `.nav` header (that isn't itself an
  interactive child — avatar, back button, icon buttons all
  `event.stopPropagation()`) scrolls that screen's own content back to
  its top, smoothly. One shared implementation, `scrollFormToTop()` in
  `eam-shared.js`, reused by every `onclick="scrollFormToTop()"` header
  across the shared-file screens; `activeContentSelector` is set once
  by `initSharedApp({contentSelector})` so the function knows which
  element is "this screen's content" (`.home-body`, `.content`, etc.)
  instead of a single hardcoded selector — that hardcoding is exactly
  what silently broke this for the Home screen (its `.home-body` was
  never checked) until fixed this same pass. `eam-wo-list-prototype-
  v5_1.html` has no `eam-shared.js` link (still self-contained pending
  its own rebuild, per CLAUDE.md), so it carries a local equivalent,
  `scrollListToTop()`, following the same rule but resolving its own
  two mutually-exclusive scroll containers (card list vs. table, §8.3)
  itself. Any new screen, shared-file or bespoke, must wire this in from
  the start — it is not optional polish.

- **`.nav-title` bumped 14px→15px, 2026-07-24 (user direction).** Part of
  the same session as the step/tab rail's Option 3 promotion (§14.2) —
  the rail's own current-screen-name text (`.tab-rail-name`/`.step-name`)
  was bumped to 15px there too, and the nav title sits directly above it
  in the same vertical stack on every record-view-tier screen, so the two
  "screen name" texts now read at one consistent size instead of two
  slightly different adjacent ones. Applies app-wide via `eam-shared.css`;
  `eam-wo-list-prototype-v5_1.html` carries its own local hand-copy of
  `.nav-title` (self-contained, doesn't link the shared file) and got the
  same bump applied directly in that file.

## 4.3 Profile

Entry point: the top-left slot of the per-screen nav bar (§4.2), visible
only while browsing — not a bottom-nav item. Reference:
`docs/existing_use_cases/EAM.MOBILE.REQ.Settings.doc` (legacy Mobile
Settings) — reference only; legacy Mobile's own architecture is a
different, semi-connected model from this app's own architecture
(§2 — online-first with declared offline scope), so don't carry over its
sync-config mechanics, only its screen-level scope ideas.

**Shell — 100% reused, no new menu component.** Tapping the avatar opens
the exact same `.rec-actions-menu`/`.rec-actions-item`/
`.rec-actions-divider` component every record header's ellipsis uses
(§5.3/§8.1) — same card, row styling, `.danger` red, and open/closed
mechanism, just a left-anchored variant (`.rec-actions-menu.anchor-left`)
since the avatar sits top-left instead of an ellipsis's top-right.
**Contents are still real placeholders** — an identity row (photo/
initials + name + org — real demo data, Bruce Campbell / Water Utility),
Settings, and a red Log out. **Deliberately no "Sync status" item** — that
would duplicate the always-present sync icon (§4.4.1), a different
concern ("is my data safe" vs. "who am I / log out") with its own
dedicated surface. Full scope (session/tenant display, theme preference)
is still undecided.

**Avatar image:** photo if the user has one on file, otherwise
initials — never a blank/generic silhouette placeholder. An `<img>` with
the photo, `onerror`-falls back to a same-size initials `<span>`.
`object-fit:cover` + `border-radius:50%` guarantees a circular crop
regardless of the source photo's own aspect ratio.

**Open dependency on base EAM:** initials have to come from somewhere
when there's no photo — base EAM's **User Setup** doesn't currently model
an Initials field (or a documented derivation, e.g. first-letter-of-
first-name + first-letter-of-last-name) on the user record. Needs to be
added there before this fallback can be real rather than a hardcoded
demo value.

## 4.4 Sync Status System

### 4.4.1 Sync control (nav row, top right — adaptive icon/pill)

The sync control is the primary sync surface, present on every screen's
nav row. **Four states:** Synced/Offline/Syncing/Error — an original
five-state draft with a separate Pending state is superseded (§21):
Pending and Syncing described the same event (a backlog going out after
reconnecting), splitting only on "about to flush" vs. "actively
flushing," a distinction with no observable difference to a technician —
connectivity alone now decides whether a non-empty, non-error outbox
reads as Offline or Syncing.

**Adaptive treatment, not a fixed-size icon.** A small icon-only circle
was too small to read as anything but a favicon, and tinting alone
carries no information once a technician can't tell two tints apart at a
glance. **Synced** renders a plain small icon-only circle
(`.sync-ctrl-dot`, 32px, green cloud-check) since it's the state that's
true almost all the time and shouldn't demand attention. Every other
state blooms into a labeled pill (`.sync-ctrl-pill`) — icon + word,
border and text tinted to the state colour. Pill label font is Inter, not
mono — mono is reserved for identifiers (record numbers, codes, step
numbers), not a state word.

| State | Treatment | Meaning |
| --- | --- | --- |
| **Synced** | Green, icon-only circle, cloud-check icon | Outbox is empty; the server has confirmed everything. The resting state, true the large majority of the time. |
| **Offline** | Gray pill, cloud-off icon, "Offline" | The device cannot reach the server at all right now. Work still saves locally into the outbox — nothing is lost — but nothing can transmit. Purely a connectivity fact, not a judgment about how much is queued. |
| **Syncing** | Gray pill (distinct shade from Offline, §23), spinning refresh icon, "Syncing" | The device has a connection and the outbox has a backlog going out (or a delta pull coming in) right now — covers everything from "just reconnected" through ordinary background sync. |
| **Error** | Red pill, alert icon, "Error" | At least one outbox item was attempted, retried, and still rejected by the server. The one state that demands action — routes to the Sync Panel's Review action → Sync Status Screen (§4.5). |

**Live-wired.** The control reads `syncOverallState(SYNC_DEMO_ITEMS)`
(`eam-shared.js`) — `error` if any outbox item has failed, else
`offline`/`syncing` depending on the `DEMO_ONLINE` toggle (§4.5) if the
outbox is non-empty, else `synced`. A screen opts in with one empty
`<span id="syncCtrl">` in its `.nav-actions` — `initSharedApp()` calls
`renderSyncControl()` automatically; every mutation that can change the
outbox (retry, discard, the online/offline toggle) re-renders it live.

### 4.4.2 Sync panel (bottom sheet)

- Slides up as bottom sheet — tap backdrop to dismiss
- Header: sync icon + title + state label
- Per-item outbox rows: green/orange/red dot + item name + timestamp/status
- Retry action on queued items, Review action on failed items
- Hydration progress section: **five** bars showing **Configuration / My pinned WOs / Site assets / Lookup tables / Historical docs** (revised 2026-08-25 with §2.3's resequencing — was four, led by "Today's WOs"). Configuration is Tier 0, so on a healthy device it reads 100% by the time this panel can be opened at all; the row earns its place on **reconnect**, where it is what surfaces a pending config change — the one hydration row whose staleness changes what the technician sees rather than just how much of it
- Removed: bottom sync row from bar area — all sync communication goes through the icon + panel; the bottom bar (§14.5–§14.7) stays dedicated to progression only

## 4.5 Sync Status Screen

Drill-down from the sync panel (§4.4.2), reached via the Review action on
a failed outbox item. Error-triage only — the panel's own 4-bar hydration
progress (§4.4.2) stays there; this screen doesn't duplicate it.

- **Card list → drill-in, no split view.** Legacy Mobile's Transaction Log
  uses a desktop split view (error list left, record detail right) —
  wrong shape for a phone. This screen reuses the §8.3 card-list standard
  for the error list; tapping a card navigates to the record's real
  Record View — same screen whether the record has synced before or is
  still local-only/unsynced (an unsynced record renders through ordinary
  Standard Update Mode via `navigateToNewRecord()`, §9.5) — with an error
  banner added on top.
- Each list card shows entity type, key field(s)/record identifier, and
  the error: the server's specific general message if one was returned,
  else a generic fallback ("Server rejected this change — no further
  detail available."). Still-queued/offline items are not errors and
  don't appear on this screen — it's failures only.
- **Field-level trouble surfacing does not exist — confirmed not
  technically feasible.** Real server responses never return which field
  caused a rejection, only whether one occurred and sometimes a general
  message — so there is no field-highlighting/tap-to-jump flow to build.
  See §21 for the original (unbuildable) spec.
- **Protection rules, carried over from legacy Transaction Log:** WO
  Status is protected while its workflow is Started (Help-icon popup
  explains why); LOTO and Calibration records are read-only here entirely
  ("This type of transaction cannot be modified here," no Save possible);
  Start/Stop labor transactions are deletable only from the end (deleting
  an earlier one errors: "This transaction cannot be deleted because a
  later transaction depends on it."); nonconformity/nonconformity-
  observation transactions are delete-only, no field edits. A different
  mechanism from field-level validation (transaction-type protection) —
  untouched by the point above.
- Delete (discard) always confirms first (shared `openConfirm()`, §3.4),
  warning that the change will not be uploaded and will need to be redone
  from the source screen.
- Empty state: "No Transactions" + Last Sync date/time, same as legacy.
- **Record-view behavior when opened from this screen:**
  - The banner has a **Retry / Discard** action row — the same two-button
    pill layout as the Sync Status Screen's own cards
    (`.sync-card-actions`/`.sync-card-btn`, shared between both). **Retry
    is always available** (no per-field gate — there's no per-field
    detail to gate on); tapping it always attempts (queues if offline,
    resolves if online).
  - 3 banner states — red "Didn't sync" → orange "Retry queued" if
    offline, or → briefly orange then green "Synced" if online, removing
    the item from the outbox data. "Online" is a hand-flipped demo toggle
    (`DEMO_ONLINE`, §4.4.1) next to the theme toggle — this prototype has
    no real connectivity to detect.
  - **Discard is never gated** — reuses the exact same `deleteSyncItem()`
    the Sync Status Screen's own Discard calls (same confirm copy, same
    `'Discard'` danger label, same delete-from-end check for a Start/Stop
    pair).
  - `navBack()` returns to the Sync Status Screen (not the screen's
    normal back target) when the record was opened via this review flow
    — a plain sessionStorage flag (`eamSyncReturnUrl`), consumed once.
  - `resolveSyncItemSuccess(item)`: when an item with a `newRecord`
    payload finally syncs successfully, it's given a real record number
    (simulating a server handing back the real key on insert, instead of
    leaving the header showing `'(new)'` forever) — fires the same way
    whether the record resolves directly or after being queued.
  - `retrySyncItem()`'s success branch only re-renders the sync panel if
    it's already open (`refreshSyncPanelIfOpen()`, guarding on the
    sheet's `.open` class) rather than force-opening it on every retry.
- Demo data: 2 seeded error items — a not-yet-synced local record
  (`wo-local-insert`, error: "Equipment is not valid," matching its own
  seed data having no `equipment` value, §15.5) and a synced record with
  no further detail given (`wo-19257-nodetail`).

Open question, not decided: since this app is a greenfield bridge between
DUX (fully online) and legacy Mobile (a different offline model), does it
need an "Open in Digital Work" handoff equivalent to legacy Mobile's
`DWOLINK`, or does it simply absorb that use case?

# 5. Standard Model — Core Patterns (Non-Workflow Records)

Added: July 2026. First prototype target: Equipment/Asset. Applies to every
non-guided record type in the app (equipment, and future record types) —
not equipment-specific except where noted. **Amended 2026-07-15 (§10):**
also applies to Work Order as the fallback screen when a WO doesn't match
any active WO Workflow Setup record — the guided 5-step workflow (§14) is
still WO's default rendering whenever a workflow does match. That WO
fallback instance is configured in the standalone Screen Designer (§10),
not derived from anything in this section.

## 5.1 No view/edit mode split — the core interaction decision

**This is the single biggest UX decision in the app, made specifically to
minimize taps.** There is no separate "Edit Mode" the user navigates into.
Insert and Update are nearly identical screens.

- Every field is always live. Tapping a field launches the control
  appropriate to its type (LOV sheet, date picker, numeric stepper, text
  sheet, checkbox toggle) directly from the record view — no preceding
  "Edit" tap.
- Any change marks the record dirty.
- **Autosave is triggered on navigation away from the record** (leaving the
  screen, switching to a sibling tab in the child-tab rail, etc.) — not on
  every keystroke. Continuous per-keystroke sync was considered and
  rejected: it would flood the outbox (§2.1–2.4) with writes for a value the
  user is still actively editing.
- Exact autosave granularity (e.g. debounce window, whether a real-time
  option is ever exposed) is left as an implementation judgment call — flag
  for review if outbox volume becomes a problem in practice.

## 5.2 Design decisions locked (Standard Record View)

| Decision | Detail |
| --- | --- |
| **No Edit Mode** | Tap any field to change it, from the record view directly. Insert and Update are the same screen. |
| **Dirty + autosave on navigation** | Changing a field marks the record dirty; sync fires on leaving the screen/tab, not per keystroke. |
| **Header + tab rail shell** | Generalizes the WO workflow's WO-block + step-rail mechanism to any record type. No sequence/gating — tabs are always freely tappable. |
| **Comments + Documents always present** | Universal rule for every standard record view, not just Equipment. |
| **Class-driven attribute sections** | Record view must render additional field sections conditionally based on the record's Class (e.g. Pump Information for Class=PUMP). |
| **Custom calendar date picker** | Branded month-grid sheet (prev/next nav, today ring, selected-day fill) replaces the native `<input type=date>` everywhere a date field is edited. |
| **Date/Time field — calendar sheet + native time row** | Same custom calendar grid as Date, plus a native `<input type=time>` row below it (matches the Time Only field's own native-input choice, §3.4). Accepted inconsistency: date is custom-styled, time stays native browser chrome — no third, hand-built input pattern was worth inventing to unify them. Tapping a day just selects it (`.cal-day.selected`) rather than auto-saving — an explicit Save commits date + time together, since time is still pending when the day is tapped. |
| **Full-screen long-text editor** | Long-form fields (Comments, future multi-line fields) get a full-height textarea sheet with a "Discard unsaved changes" confirmation on close-with-edits, not a cramped single-line input. |
| **Keyboard-editing popups put their controls in the TOP CORNERS — no bottom Save** (locked 2026-08-11, direct instruction, real-device report) | Applies to **every** sheet that raises the keyboard: the long-text editor (`#textEditorSheet`, both the default and `.compact` variants) and the single-line edit sheet (`#editSheet`). **✕ top-left, a green ✓ confirm top-right (§23 — reuses the app's existing green, not a new instrument), and no `.sheet-footer`/`.btn-save` at all.** The ✓ inherits the retired Save's exact gating — `.disabled` while a required field is empty (`updateTextEditorSaveGate()`/`updateEditSaveGate()`), and `saveTextEditor()`/`saveEdit()` keep their own belt-and-braces refusal. **Why:** a Save pill at the sheet's bottom edge was unusable on a real phone. `.bottom-sheet` lifts itself by `--kb-inset` when the keyboard opens, which parked the pill exactly where iOS draws its own keyboard accessory bar (the `^ v ✓` row) — two affirmative controls on top of each other, ours partly behind the OS's. Moving ours to the top corners means nothing of ours sits near the keyboard. The default long-text editor is now anchored **top and bottom** (`top:0;bottom:0`), so `--kb-inset` deliberately can't lift it — a keyboard covering the lower part of a full-height textarea is correct, not something to compensate for. `.compact` stays a genuine bottom sheet (`top:auto`) and keeps the lift, which is safe now that nothing sits at its bottom edge. **Accepted platform limit:** iOS's accessory bar itself cannot be suppressed from a web page — this stops us *colliding* with it, it does not remove it. **Also fixed in the same pass:** both editors now open via `openSheetExclusive()`, closing any other open sheet first — the report included the "Set Equipment Photo" sheet visible *underneath* the comment editor. Exclusivity is opt-in rather than folded into `openSheet()`, because some flows legitimately nest a sheet inside another (§18's completion popup opening a status picker). |
| **All Record View sections collapsed except the first** | Asset Details (or the equivalent lead section for any record type) opens by default; every other field-group section — including Comments and Documents — starts collapsed. |
| **Header rev. 2 — status-forefront, scroll-collapsing** | Status is the single field a technician updates most often, so it's the focal, directly-editable control at rest: a large solid-colour button (not a subtle inline badge), code+description shown small above it. Scrolling the active tab's content collapses the status button away, leaving the code+description pinned under the nav bar. Location was dropped from the header entirely. Standard on every Record View. See §15.4 for the WO-specific Free Form rule governing whether this is editable or protected on WO Record View / WO Closing. Description renders at 15px, full row width (no leading icon — see §5.3). |
| **Identifier + description are header-only — never duplicated in the record body** | The header's own record number and description are both shown and directly editable there, so the equivalent "Asset ID"/"Description" rows that might otherwise sit at the top of the first body section (e.g. Equipment's Asset Details) are omitted. One place to read it, one place to edit it. |
| **Header description is editable — fundamental, module-agnostic behavior** | **Always required** (direct instruction, 2026-07-28) — every header description is required, no per-screen opt-out. Edited via the shared long-text editor's `.compact` variant (`openDescEditor()`, `eam-shared.js`) — a modal popup, not inline-in-place — sized for a 1-2 line field rather than the default editor's full 88vh (built for Notes/Comments). No Clear, since description is required (`isRequiredField()`/`shouldHideClear()`); Save itself is also blocked while the textarea is empty (§3.4's new required-and-empty gate). Only tappable while the header is **expanded** (status button visible) — while collapsed, tapping the description does nothing. Applies to every standard record view. Superseded the original inline-edit pattern (tap in place, auto-growing textarea) — see §21's named "Header Description — Inline Edit" reference if that needs reverting. |
| **Tapping the nav bar OR the collapsed identity header scrolls the form to top — fundamental, module-agnostic behavior** | Tapping anywhere in the nav bar (back button excluded) scrolls the record's content back to the top, which also re-expands the header (status button reappears) since expand/collapse is scroll-driven. The identity header block itself (`.rec-header`) does the same scroll-to-top while **collapsed** (it has no action of its own in that state); while **expanded**, its children (description edit, status button) keep their own specific actions instead. Applies to every standard record view. |
| **Land the cursor on the first tap, always — fundamental, module-agnostic behavior** | Tapping any field that opens a text-entry surface (the shared Currency/Number edit sheet, the shared long-text editor, an inline text field) must land the cursor/keyboard inside it on that same tap — never a second tap just to start typing. `openEdit()`/`openTextEditor()` (`eam-shared.js`) call `.focus()` **synchronously**, in the same tap/click handler that opens the sheet — no delay. **Any field routing through a popup must go through one of these two functions specifically** — not a bespoke direct-focus alternative — so this can't quietly regress as new fields/screens get added; confirmed 2026-07-31 by a full audit of every screen-local sheet/popup opener in the app (`openActivityAddPopup`/`openActivityEditPopup`, Book Labor's Add Labor/Correction/Crew sheets, Issue Parts' Issue/Ad-Hoc/Modify/LOV-field sheets, WO Closing's Code LOV, plus shared `openLov`/`openHyperlinkPopup`/`openConfirm`/`openInsertMode`/`openCreateSheet`/`openEquipmentLookup`/`openDataspySheet`): none of them autofocus anything at all on open — every one relies on the user manually tapping a field inside the already-open sheet/modal, which sidesteps the race entirely and is a deliberate category of its own (a multi-field modal auto-focusing its first field would auto-raise the keyboard before the technician has seen the rest of the form — same reasoning as the LOV search-bar exception below). **Deliberately not extended to the LOV picker's search bar** (`openLov()`) — that sheet's primary content is a scrollable option list; auto-raising the keyboard before the technician has seen the options would cover most of a phone screen. **History — the 320ms delay was itself the bug, not the fix (reverted 2026-07-31, real-device report):** from 2026-07-24 to 2026-07-31 this rule was implemented as a `setTimeout(() => input.focus(), 320)`, added on a real-device report that a *synchronous* `focus()` call wasn't raising the keyboard, on the theory that `.bottom-sheet`'s .3s slide-in transition (`eam-shared.css`) needed to finish first. That theory was wrong: `.bottom-sheet` is positioned via `transform`, never `display:none`, so the input is already focusable the instant `openSheet()` returns — no transition wait is actually needed. What the delay actually did was push the `.focus()` call outside the browser's "user activation" window that mobile OSes require to auto-raise the on-screen keyboard for a focus call — so DOM focus would land at 320ms but the keyboard would silently never appear, reproducing on *every* field, app-wide, the exact "2nd tap required" symptom the delay was supposedly curing. Static code review never caught this — the delay looked correct on paper and the actual failure mode only shows up as real on-device touch behavior, not something a desktop browser preview reproduces either. If a real device ever reproduces the original 2026-07-24 "focus dropped" report again against the current synchronous call, treat it as a new, narrower bug — don't reach for a delay as the fix a second time. |
| **Required-field navigation validation — not yet built** | When the user tries to navigate away from a record with a required field still unpopulated, don't just block silently — scroll to that field and make it visually obvious it's blocking navigation (focus the row, briefly highlight its background). Was originally scoped around flashing the required left-bar; that static marker was removed 2026-07-28 (§21, §23), so this still-unbuilt behavior needs a different visual once it's actually built — not designed yet. |
| **Required Entry — warning, not a hard block** | Default enforcement for a required field on a Standard Record View: an amber warning bar + override, not a hard block on saving/navigating. Distinct from the WO Workflow's own step-progression gate (§14.7), which *does* hard-lock advancing until required items are answered — a required field always warns at the field level; a workflow step can additionally gate progression on top of that. |
| **"Required-but-Empty Marker" — dynamic, app-wide, added 2026-07-31 (direct instruction)** | A red left-bar (`.form-field.required.req-empty::before`/`.attr-item.required.req-empty::before`, `eam-shared.css`), toggled by `updateRequiredEmptyMarkers()` (`eam-shared.js`, called from inside `updateRequiredBadges()` so every existing save/select/clear/blur/load call site picks it up for free) — shown only while a required field is genuinely empty, gone the instant it's filled. **A third instrument, not a reversal of §21's "Required Field Marker" removal**: that removal's own reasoning ("a required field can never go back to empty once set, so the marker warns about a state that can't happen") is still correct for a field that *was* set. It never accounted for a field that was **never set in the first place** — the WO Type × User Group page-layout system (§11-13) means a field can be required under the current user's own layout while a *different* user group's layout (the one active when the record was actually created) didn't require it at all, leaving it empty until someone with the stricter layout fills it in. That's a real, reachable state on an existing record. Never applies inside `#insertModeSheet` (already fully covered by that sheet's own separate, always-on marker, §9.8 — a blank form has nothing to hide yet, so that one stays unconditional/static, not dynamic). WO Closing's Closing Codes cells (`.code-cell.required`) get the same visual but via their own local toggle in `refreshSequentialLocks()` (keyed off `codeState[key]`, not `data-field`/`fv-`) — that screen-local rule used to show its red bar unconditionally the instant a cell unlocked, a stale holdover from before the app-wide static marker was removed that never got updated; now dynamic too, consistent with everywhere else. |
| **LOV value clearing** | See the "'Clear' action on every field-edit sheet" row in §3.4. |
| **Master field-type reference** | `screen-layout-field-behavior-prototype-v1.html` is the canonical §5.2 field-type reference (see the "Grid vs. List field-type consolidation" row below). `sample-screen-standard-model-prototype.html` is retired — see §21. |
| **Type and Priority color badges** | Show the badge only if a color/icon is configured for that value; if not, omit the badge entirely and left-align the field value text under the label. Applies to any metadata field using optional color coding. WO Record View's `TYPE_META`/`PRIORITY_META` reuse the same icon+colour pairs as the §6.7 WO icon language rather than a second palette. |
| **Header actions — pin + ellipsis menu** | Record View headers only — never on tab content, list screens, or detail sub-views. Top-right of the pinned `.rec-id-row`: a **pin toggle** (outlined when unpinned, filled purple when pinned) directly left of an **⋯ ellipsis** opening a small anchored dropdown menu (a deliberate exception to "everything is a bottom sheet" — a compact corner-anchored action list, not a value picker). Menu has three groups: (1) Copy Link, (2) Copy / Delete (Delete red, opens the centered confirm modal), (3) a screen-specific action slot (e.g. Equipment: "View Structure Details"; WO: "Print Work Order"). The pin toggle is the UI surface for the `pinned` device-side contract (§2.6 / `EAM-DESIGN-Pinning-Enhancement-v1.md`) — local visual toggle only in the prototype, no real write-through. Buttons are 34px/18px icons. |
| **Organization pill — always present, always protected in update mode, lives in the header** | Sits inside `.rec-status-row`, right-aligned opposite the status button, sized down from the standalone/Insert-Mode pill so the row reads as one balanced unit. Collapses on scroll along with status (same parent row). Distinct from the pill's editable/required state on Insert Mode (§9.3 point 1, still the standalone full-size pill) — on the Record View itself it's always protected: no chevron, not tappable, muted background signals non-editable with no lock icon needed. **In-header style:** Inter, white text, no icon, outlined (transparent background, `1.5px solid rgba(255,255,255,.85)` border) — text is unconditionally light since this row's background is always dark regardless of theme. This outline treatment is specific to the in-header (Record View) placement; the standalone Insert Mode pill keeps its base filled style. |
| **Header Fields / Non-nullable Fields** | Holds every non-nullable field on the screen (not a fixed Type/Priority pair), unlabeled, no section-card header — the fields just sit directly in the card, 2-per-row grid, an odd field out spans the full row width. A plain Grid LOV shows either a code alone ("LOV — Code Only," mono, same treatment as an identifier field) or the badge/stacked code+description types (§5.2's "Grid vs. List" row below) — there is no description-only plain-LOV type in the Grid. Membership here does not imply required — a required field in this box gets the same left-bar `.form-field.required` uses, just on its own cell. Organization lives in the header pill (previous row), not here; Operational Status lives in the header's status button, not here. **WO Record View exception:** the Equipment field is its own full-width required cell inside this same grid (§15.5), not a separate standalone container. **Equipment RV example:** Department, Criticality, Class, Manufacturer, Category (5 plain-LOV fields via `fieldRowAttr()`), Department + Criticality marked required. **WO RV example:** Type + Priority are here; Department and Problem Code (also required) currently sit in a separate "Work order details" card instead — flagged as an unreconciled gap in §20. |
| **Container shape is PER-CONTAINER, not positional** (revised 2026-09-16, direct instruction) | **What changed:** the model used to be *a field grid at the top of the form, with collapsible List sections beneath it* — grid-ness was a property of **position**. It is now a property of **the container**: any container can be Grid or List, anywhere in the form, and a form may have several of each. The prompt was the designer's own To Grid / To List control, which could already express layouts the old rule forbade — so the rule moved rather than the control. **What survived, and why:** (a) **nothing goes above the first container.** That was the defensible half of "grid at the top" — the lead container is the record's at-a-glance identity block, and burying it under an optional section inverts the screen. It is now a *pin on container 0*, which is a weaker and more honest statement than "grids are always first". (b) **A Grid cannot be Collapsed, but it CAN be Hidden.** Collapsing a two-up grid to a header strip destroys the only thing a grid is for; hiding it is an ordinary §12 visibility decision and has nothing to do with shape. So the display states are **Grid: Expanded / Hidden** and **List: Expanded / Collapsed / Hidden** — enforced in the setter, not just omitted from a menu, so a stored-but-unrenderable state cannot exist. **The cost:** no mobile screen demonstrates a non-leading Grid yet, so the canonical reference files still show only the old arrangement — tracked in §20. To revert: re-pin Grid to container 0 only, and the designer's To Grid / To List has to lose the ability to target any other container. |
| **Grid vs. List field-type consolidation — canonical field-type reference** | `screen-layout-field-behavior-prototype-v1.html` is the canonical §5.2 reference — one example of every field type, rendered in both the Grid container (`.attr-item`) and the List container (`.form-field`) side by side. The rows below state each type's resolved Grid vs. List rule. Other scaffolding the old retired file carried (header pin/ellipsis, List/Detail header, Insert Mode demo, Comments/Documents) is not duplicated here — each has its own canonical home elsewhere (§5.3, §8.3, §9.6, §7.2). |
| **Notes/Description and Long-text — always full-width, in both containers** | Both types are forced double-wide via `.attr-item.full-width` in Grid — a double-wide field can't be one of a 2-up pair. Notes/Description is pinned first, Long-text trails last. In List this is a no-op (every List row is already full-width). |
| **Long-text — collapsed display honors carriage returns** | The collapsed read-only span uses `.field-value.multiline` / `.attr-text.multiline` (`white-space:pre-wrap`; List also left-aligns) so a multi-line value renders its line breaks instead of collapsing to one run-on line, in both containers. |
| **Badge / Icon LOV — allowed in a List row, not Grid-only** | Icon leads (left of the description), grouped with the value at the row's right edge as a plain sibling of `.field-value` pushed there by `margin-left:auto` (`.field-badge-inline`, same trick `.field-checkbox` uses). Grid's existing Type/Priority-style badge is unchanged. Doesn't resolve the still-open §3.4 question of whether `.attr-badge`'s icon-in-a-swatch shape is a deliberate exception to "no icons inside any pill or field" — it only confirms the same shape is allowed in a List row too. |
| **LOV field types — sizing and naming** | "LOV — Code + Description" and "LOV — Identifier" are the same field type (code + description, stacked; no separate "Identifier" name, same reasoning as §3.4.1). Stack order: **Grid** is description-over-code (`.attr-lov-stack`); **List** keeps its pre-existing code-over-description order (`.field-lov-value`) — the order decision is scoped to Grid only. "LOV — Code Only" sizing differs by container: **Grid** — `.attr-text.mono`, 24px, line-height 1 (matches its Grid row-mates' visual weight). **List** — `.field-value.mono`, standard 14px, mono family only (its row-mates don't create the same mismatch). |
| **Time Only — right-aligned everywhere, no container-specific exception; iOS rendering is a known platform limitation** | Both containers inherit the identical `.time-input{text-align:right}` rule (confirmed correct on desktop). On a real iOS device the rendered result still doesn't visually match in either container (Grid centered, List left-aligned) despite identical CSS — `<input type="time">` renders as a fully native OS control on iOS Safari and doesn't reliably honor `text-align`, same category as the documented 24-hour/`lang="en-GB"` quirk (§3.4). Accepted as-is — nothing in page CSS can reach inside a native-rendered control's own layout. |
| **Checkbox — Grid gets a dedicated right-hand zone row** | A single row, label on the left, a fixed ~28%-wide zone on the right holding a medium (24px) checkbox (`.attr-item.checkbox-zone-row` / `.attr-checkbox-zone`) — like a settings-app toggle row, not the stacked shape other Grid fields use. List's existing rule (whole row is the tap target, §3.4) is unaffected. Real consumer: WO Record View's Activity Edit popup, Completed checkbox (§15.2). |
| **Protected — Grid gets its own `.attr-item.protected`, lock icon on the label's own row** | Mirrors `.form-field.protected`'s recipe (gray tint, dimmed, no pointer cursor) onto a grid cell. The lock icon sits on the label's own row (`.attr-label-row`) rather than beside the value below it, since Grid's label/value are two separate lines (List's single-row protected field already puts them together trivially). |
| **Inline text — cursor always lands at end of existing text on tap** | Tapping anywhere in the row (not just the textarea) lands the cursor at the end of existing text, via `focusInlineField()` in `eam-shared.js` (same call site for all 6 real screens plus the shared `fieldRowInline()` template). `.field-inline-input` uses `flex:none` (not `flex:1`) in both the List (`.form-field.stacked`) and Grid (`.attr-item`) contexts specifically so a long value grows the row taller instead of clipping. |
| **Currency / Number edit sheet — same numeric keypad** | Both Number and Currency use `type="text"` + `inputMode="decimal"` (not native `type="number"`, which pops a different mobile keypad). `openEdit()` focuses its input after a delay long enough for the sheet's own transition to finish (same as `openTextEditor()`, per the "land the cursor" rule above). |
| **Currency / Number edit sheet — Save blocked while empty and required** (added 2026-07-31) | `updateEditSaveGate()` (`eam-shared.js`) mirrors `updateTextEditorSaveGate()` — disables `#editSheet .btn-save` while `isRequiredField(activeEditKey)` is true and the input is blank, checked on open and on every keystroke (`sanitizeCurrencyInput()`, which now doubles as this sheet's only oninput hook regardless of type). Closes a real gap: only Clear was ever gated for this sheet before (`shouldHideClear()`); Save had no equivalent block. |
| **Operational Status (or equivalent header-status field) is header-only — never duplicated as a body row** | Whatever field drives the header's `.rec-status-btn` (Equipment: Operational Status) is edited exclusively there — it must not also appear as a plain-LOV row in a field-group section or the Header Fields box. |
| **Container required-field-count indicator** | Any `.fg-section`/`.section-card` with at least one required field inside shows a small count badge in its own header (e.g. "1", "2"), inserted before the chevron so every container's chevron stays at a fixed x-position whether or not a badge is showing. Implemented generically via `updateRequiredBadges()` in `eam-shared.js` — no per-screen config. The badge is a static "this container has N required fields" count, shown unconditionally whenever the container has ≥1 required field — not a completion tracker that disappears once fields are filled (a required field can never go back to empty once set, per the Clear-visibility rule in §3.4, so a disappearing badge would never come back). The Header Fields box is exempt by construction — no container header to attach a badge to. **Caveat added 2026-07-31:** "can never go back to empty once set" is still correct, but a required field can start empty — never set at all — if the WO Type × User Group layout that created the record didn't require it while the current layout does (§11-13). This badge (Insert-Mode-only in practice, §9.8) is unaffected since a blank Insert form has no such history to worry about; the per-field "Required-but-Empty Marker" (§3.4, 2026-07-31) is what actually covers that case elsewhere. |
| **Documents** | Same add-affordance-on-top pattern as Comments; shows every document inline, no truncation (unlike Comments, see below). |
| **Comments — Record View shows latest 3 only, links to a dedicated tab for the rest** | Below the third comment, a "View all comments" row navigates to a dedicated Comments tab showing the full list; the link only appears once there are more than 3. Comments and Documents both get a dedicated tab (§8.1, with a Plus that creates a comment/document directly rather than opening Insert Mode). A comment/document added or edited from either the Record View excerpt or the dedicated tab must stay in sync — one shared data source per record, not two independent copies. |
| **Comment author — full description, "(You)" for your own, Edit/Delete gated on ownership** | Added 2026-07-16 (found not-yet-applied on both canonical files, fixed same day). Author always shows the commenter's full user description — never an abbreviation ("Bruce Campbell," not "B. Campbell"). If the comment is the current logged-in user's own (`mine: true`), the display appends `(You)` to their own full description (e.g. "Bruce Campbell (You)") — computed at render time from a screen-provided `CURRENT_USER_NAME` constant, not baked into the stored `author` string, so `COMMENTS_DATA` only ever holds plain full names. Ellipsis actions stay ownership-gated as already designed: your own comment gets Edit/Delete/Copy, anyone else's gets Copy only (`openCommentActions(btn, isMine)` in `eam-shared.js` — this part was already correct, just the author-string rule wasn't). Implemented generically in `eam-shared.js` (`renderCommentItemHTML`, `addComment`, `addCommentToData`) — no per-screen logic needed beyond declaring `CURRENT_USER_NAME`. Both canonical files set it to `'Bruce Campbell'`; Equipment's two pre-existing seed comments (previously "B. Campbell"/"J. Martinez") were expanded/renamed to "Meera Kumar"/"Jamie Martinez" to avoid a same-name collision with the current-user identity. |
| **List/Detail row tap → that record's own Record View, in update mode** | Added 2026-07-16. Where the tab supports drill-in (§8's content-driven rule), tapping a row is supposed to open the tapped record's own Record View, not a preview or inline expand. The record's code/PK is shown there but protected (same treatment as any other protected field) — never editable just because you drilled in from a list. Not yet wired anywhere real: no child-record type in this app has its own Record View to open yet, so every List/Detail row remains a toast stub describing this target behavior rather than performing it. |
| **Nav bar — centered screen title** | The top nav row (back button left, `PROTOTYPE` label + sync icon right) shows the current screen's title centered in the middle, using `.nav-title` in `eam-shared.css`. `.nav-title` is taken out of flex flow entirely (`.nav{position:relative}` + `.nav-title{position:absolute;left:0;right:0;text-align:center;pointer-events:none}`), with `.nav` on `justify-content:space-between` for its 2 real children (`.nav-back`/`.nav-actions`) — centers against the bar's actual width regardless of those two siblings' own widths, which a naive `flex:1` on the title does not (it centers within the leftover space between unequal-width siblings, not the bar's true center). |

## 5.3 Header pattern — exact code reference

**CANONICAL SOURCE:** Use this pattern on every screen that needs a record identity header. Copy the CSS and HTML below exactly, only changing: (1) the record number/description values, (2) the status button's code, (3) the data attribute or handler that fires on status-button tap, (4) the screen-specific action item(s) inside `#recActionsScreenSpecific`.

**CSS (paste into `<style>` as-is):**

```css
/* ── RECORD IDENTITY HEADER (scroll-collapsing) ──────────────────────────
   Status is the focal, directly-editable control at rest — the field a
   technician updates most often. Scrolling the active tab's content
   collapses the status row away, leaving the pinned code+description. ── */
.rec-header { background: var(--bg-nav); flex-shrink: 0; }
.rec-id-row { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px 8px; }
.rec-id-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.rec-num { font-family: var(--font-mono); font-size: 22px; font-weight: 700; letter-spacing: 0.3px; color: white; line-height: 1.1; }
.rec-desc { display: block; font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.65); line-height: 1.3; cursor: pointer; }
.rec-desc-edit { display: none; width: 100%; border: none; background: none; outline: none; resize: none; font-family: var(--font-sans); font-size: 15px; font-weight: 600; color: white; line-height: 1.3; padding: 0; }
.rec-desc-edit.editing { display: block; }
.rec-desc.hidden-while-editing { display: none; }
.rec-status-row { overflow: hidden; transition: height 0.22s ease, opacity 0.18s ease; height: 58px; opacity: 1; }
.rec-header.scrolled .rec-status-row { height: 0; opacity: 0; }
/* Org pill (§5.2) lives inside this row, opposite the status button —
   see the "Organization pill" locked-decision row in §5.2 for its own
   CSS/HTML; not duplicated here, just noting it shares this row so it
   collapses on scroll along with status, for free. */
.rec-status-row-inner { padding: 0 16px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rec-status-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 8px; font-size: 15px; font-weight: 700; color: white; cursor: pointer; border: none; font-family: var(--font-sans); }
.rec-status-btn.st-operational { background: var(--green); }
.rec-status-btn.st-down { background: var(--red); }
.rec-status-btn.st-standby { background: var(--orange); }

/* Header actions — pin + ellipsis menu. Record View headers only, always
   visible (lives in .rec-id-row, not the collapsing .rec-status-row) since
   these are record-level actions relevant regardless of scroll position. */
.rec-header-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; margin-left: auto; margin-top: -3px; position: relative; }
.rec-pin-btn, .rec-ellipsis-btn { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.55); transition: background 0.15s, color 0.15s; }
.rec-pin-btn:hover, .rec-ellipsis-btn:hover { background: rgba(255,255,255,0.1); color: white; }
.rec-pin-btn svg, .rec-ellipsis-btn svg { width: 18px; height: 18px; }
/* Pinned = filled purple, the same accent as every other active/selected
   state (§3.2.2). Ties to the pinned=1 device-side contract in §2.6 /
   EAM-DESIGN-Pinning-Enhancement-v1.md — this is that mechanism's UI
   surface; the prototype toggle itself is local-only, no write-through. */
.rec-pin-btn .pin-fill { display: none; }
.rec-pin-btn.pinned { color: var(--purple); }
.rec-pin-btn.pinned .pin-outline { display: none; }
.rec-pin-btn.pinned .pin-fill { display: block; }

/* Anchored dropdown, not a bottom sheet — deliberate exception to "every
   sheet is a bottom sheet" (§3.4): this is a compact corner-anchored action
   list, not a value picker or a form editor. */
.rec-actions-menu { position: absolute; top: 40px; right: 0; min-width: 190px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 8px 28px rgba(0,0,0,0.28); padding: 6px 0; opacity: 0; visibility: hidden; transform: translateY(-6px) scale(0.98); transition: opacity 0.15s, transform 0.15s, visibility 0.15s; z-index: 150; }
[data-theme="dark"] .rec-actions-menu { background: #26252B; }
.rec-actions-menu.open { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
.rec-actions-group:empty { display: none; }
.rec-actions-divider { height: 1px; background: var(--border); margin: 4px 0; }
.rec-actions-item { padding: 10px 16px; font-size: 14px; font-weight: 500; color: var(--octave-black); cursor: pointer; white-space: nowrap; }
[data-theme="dark"] .rec-actions-item { color: rgba(255,255,255,0.9); }
.rec-actions-item:hover { background: var(--bg-section); }
.rec-actions-item.danger { color: var(--red); }
```

**Scroll-collapse is a generic mechanism, not `#recHeader`-only.** The
threshold/hysteresis scroll listener (`onRecContentScroll` in
`eam-shared.js`, expand/collapse at scrollTop 10px/40px) drives `#recHeader`
plus any element carrying a generic `.scroll-collapse` class, each tracked
independently via its own `.scrolled` class. Reuse example: Home's Create
bar (`.create-bar.scroll-collapse`) collapses itself entirely on the same
scroll behavior and reappears via the same header-tap-to-top rule (§4.2).
Debounces via `setTimeout` (not `requestAnimationFrame`, which can stall
indefinitely on a backgrounded/inactive tab and silently freeze the
mechanism) — applies to every consumer.

**HTML (paste into `<div class="app">` after the nav, before the tab rail):**

```html
<div class="rec-header" id="recHeader" onclick="onRecHeaderTap(event)">
  <div class="rec-id-row">
    <div class="rec-id-text">
      <span class="rec-num"><!-- RECORD NUMBER --></span>
      <span class="rec-desc" id="recDesc" onclick="onDescTap(event)"><!-- DESCRIPTION --></span>
      <textarea class="rec-desc-edit" id="recDescEdit" maxlength="255" oninput="autoGrow(this)" onblur="onDescBlur()"></textarea>
    </div>
    <div class="rec-header-actions">
      <button class="rec-pin-btn" id="recPinBtn" onclick="event.stopPropagation(); toggleRecordPin()" aria-label="Pin record" title="Pin to my list">
        <svg class="pin-outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
        <svg class="pin-fill" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22h1v-5h-1z"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
      </button>
      <button class="rec-ellipsis-btn" id="recEllipsisBtn" onclick="event.stopPropagation(); toggleRecActionsMenu()" aria-label="More actions">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
      </button>
      <div class="rec-actions-menu" id="recActionsMenu">
        <div class="rec-actions-group">
          <div class="rec-actions-item" onclick="recCopyLink()">Copy Link</div>
        </div>
        <div class="rec-actions-divider"></div>
        <div class="rec-actions-group">
          <div class="rec-actions-item" onclick="recCopyRecord()">Copy</div>
          <div class="rec-actions-item danger" onclick="recDeleteRecord()">Delete</div>
        </div>
        <div class="rec-actions-divider"></div>
        <div class="rec-actions-group" id="recActionsScreenSpecific">
          <!-- CUSTOMIZE: screen-specific action item(s), e.g.
               <div class="rec-actions-item" onclick="...">View Structure Details</div> -->
        </div>
      </div>
    </div>
  </div>
  <div class="rec-status-row" id="recStatusRow">
    <div class="rec-status-row-inner">
      <button class="rec-status-btn st-operational" id="recStatusBtn" onclick="openLovField('statusFieldName')">
        <span id="recStatusBtnText"><!-- STATUS VALUE --></span>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <!-- Organization pill — see §5.2's own "Organization pill" row for
           the full CSS/HTML and behavior; shown here only to note it's
           this row's second child, opposite the status button. No
           building icon (removed 2026-07-16, second follow-up) — just
           the code, white text, outlined. -->
      <button class="org-pill protected in-header" data-field="organization">
        <span class="field-value" id="fv-organization-code"><!-- ORG CODE --></span>
        <svg class="org-pill-chevron" width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
</div>
```

**Minimal JavaScript requirements:**

- `onRecHeaderTap(event)` — fires on header tap. Typically: if header is collapsed, scroll to top; if expanded, do nothing (children have their own handlers).
- `onDescTap(event)` — fires on description tap (only when expanded). Switches description to edit mode.
- `onDescBlur()` — fired when the textarea loses focus. Saves the edit, switches back to display mode.
- `autoGrow(textarea)` — resizes textarea to fit its content while editing.
- `openLovField('statusFieldName')` — opens an LOV picker sheet for the status field.
- `toggleRecordPin()` — toggles the `.pinned` class on `#recPinBtn` and swaps the outline/fill SVG via CSS. Local-only in the prototype (§2.6).
- `toggleRecActionsMenu()` — toggles `.open` on `#recActionsMenu`. Pair with a document-level click listener that closes the menu on any click outside `.rec-header-actions`.
- `recCopyLink()`, `recCopyRecord()` — close the menu, show a confirmation toast (`Copy` is a stub in every prototype — no real record-duplication flow exists anywhere in this app yet).
- `recDeleteRecord()` — closes the menu, opens the existing centered confirm modal (`openConfirm(message, onConfirm)` — see the "Centered confirmation modal" row in §3.4) rather than a new dialog pattern.

**Applied to:** `eam-equipment-record-view-prototype-v1.html`,
`eam-wo-record-view-prototype-v1.html`, and the retired
`sample-screen-standard-model-prototype.html` (see §21).

**No per-record-type mini-icon.** The header pattern has no icon
customization point (no pump icon for Equipment, etc.) — this was removed
from the pattern entirely so the description gets the row's full width
(15px). Don't re-add a mini-icon slot to this header.

**Scope:** Every Record View screen (Equipment, Work Order, and any future record type) must use this exact header pattern, including the status button and the pin/ellipsis header actions (§5.2) — they're one unit, never applied partially. Nothing in this header — not the status button, not the pin, not the ellipsis menu — appears on:
- **List screens** (e.g. WO List, §6) — a personalized queue of many records, not one record's identity.
- **Workflow step screens** (e.g. Issue Parts, Activity Checklist, §17/§16) — these use the WO-block + step-rail chrome instead (§14.4/§14.2).
- **A record's own child list/detail tabs** (Equipment's Events, Costs, Structure Details, etc. — §7.3) — these are sibling views *of* the record, not the record's identity itself, so they never repeat the parent's *editable* status button or pin. Corrected 2026-07-14: this does **not** mean no identity at all — child tabs still show the parent's icon/number/description (description rendered protected, not editable), just not the status-forward editable version. See §8 for the exact composition (protected identity + Plus + Ellipsis, with a WO-specific exception dropping the Plus).


# 6. Standard Model — List/Search View

Added: July 2026. Prototype: eam-wo-list-prototype-v5_1.html. This section was reverse-documented from the v5.1 prototype — decisions below reflect what is built; flag anything provisional during review.

## 6.1 Screen role

- The WO List is the technician's entry point — the personalised WO queue
- Two screens: WO List (dataspy-scoped queue) and Search (ad hoc lookup) — search is a separate full screen, not an inline filter of the list

## 6.2 Nav bar (WO List)

- Left: profile avatar (§4.2) — supersedes the app logo mark this bullet
  originally specified
- Title: "Work orders"
- Right actions: Create WO (+), Search (magnifier), sync status dot (same 5-state sync language as workflow screens)

## 6.3 Dataspy bar

- Full-width bar directly below nav: database icon + active dataspy name + chevron — no record count (§8.3, dropped 2026-07-20)
- Tap opens the dataspy selector bottom sheet — single-select rows with checkmark on the active dataspy, plus a favorite-star toggle per row (§8.3); favorited dataspies sort to the top
- Dataspy examples: My Assigned WOs (default, personal), Today's Work, High Priority — Open, My Department, Breakdown WOs, Waiting Approval, All Open WOs, Preventive Maintenance
- The dataspy is the primary scoping mechanism for the queue

## 6.4 View modes — Detailed / List

- Segmented mode toggle below the dataspy bar: Detailed (default) and List
- Detailed = the §8.3 card standard; List = the §8.3 all-fields table
- Mode persists across the WO List and Search screens

## 6.5 Detailed card anatomy

Superseded 2026-07-20 — WO List's card is no longer its own bespoke
layout. It's just an application of §8.3's generic card standard to the
WO dataspy's own first-6 columns (Status, Description, WO Number,
Priority, Due Date, Organization — Organization lands within the first
6, so it carves out to the corner badge per §8.3, leaving Status as the
pill headline, Description as the subline, and WO Number/Priority/Due
Date as the three attribute rows). See §8.3 for the full rule; see §21
for the retired bespoke version.

## 6.6 List table anatomy

Superseded 2026-07-20 — see §8.3's List mode: shows every field
available on the WO dataspy (full server columns online, which is now the
normal case; offline, whatever is actually on the device, with its scope
stated), not a fixed 5-column layout. See §21 for the retired bespoke
version.

## 6.7 WO colour language

Status reads off the same 3-tier fill vocabulary as the header status pill
(§4.4.1/`STATUS_CLASS_MAP`). Type carries colour via the WO Type Colour +
Icon Badge (§23), on this screen as a small dot ahead of its value — a
full icon badge is too heavy for a dense card/table row (see §23 for the
badge itself, and §14.2 for the step rail's own version of this signal):

| Dimension | Mapping |
| --- | --- |
| **Type — any value** | Small solid dot in the Type's curated colour (§23), ahead of the plain-text value; no icon at this size |
| **Priority** | No colour, any level — plain description text ("Low"/"Medium"/"High"/"Critical") |
| **Status — Released, Completed** | Green fill pill, white text (`.pill-green` — "operational/completed" tier) |
| **Status — Waiting approval, Waiting materials** | Outlined pill, ink text (`.pill-outline` — "standby/waiting" tier; this screen's own two "blocked on something" statuses, not in the canonical 4, both map here) |
| **Status — (any future "down"/failed status)** | Red fill pill, white text (`.pill-red` — not populated by this screen's current demo data, supported for when one exists) |

Icons stay retired everywhere else (§3.4 "No icons inside any pill or
field") — Type's dot is colour only, no icon, so it doesn't reopen that
rule.

## 6.8 Due date treatment

Superseded 2026-07-20 — Due Date is now just another date field under
§8.3's card standard: plain `MM/DD/YYYY`, no urgency tint, no relative
formatting, wherever it lands. See §21 for the retired urgency-tint
version.

## 6.9 Parent / child work orders

- Parent WOs carry an expand chevron (both view modes); tapping expands child WOs inline (indented rows / stacked cards)
- Dataspy filtering keeps the parent visible whenever any of its children match, so children are never orphaned from context

## 6.10 Sort

- Results row shows record count (left) + sort control (right), current sort labelled (e.g. "Due date") — this is the filtered-results count, distinct from the dataspy-bar count dropped in §8.3
- Sort options are the same 6 dataspy fields the card uses (§8.3), not a separate curated list — all 6, uniformly

## 6.11 Search screen

- Separate full screen entered from the magnifier icon; back/close returns to the list
- Search field auto-focuses on entry; clear (✕) button appears when text present
- Matching: contains-match across WO number, equipment description, and equipment code
- Filter chips row below search field: the same 6 dataspy fields the card uses (§8.3), all of them uniformly — superseded 2026-07-20, was a fixed Type · Status · Department · Priority row, see §21
- Each chip opens a multi-select bottom sheet: search-within field, Clear, icon-tinted rows (description primary, code small — LOV description-first pattern), radio-style toggles, Apply button
- Applied chips show an active state with a count badge (e.g. "Type 2")
- Empty state: centred icon + "No work orders found" + hint ("Try a different dataspy or adjust your search")

## 6.12 Toasts

- Same dark-chip toast pattern as workflow screens; used for apply confirmations and stubbed actions in the prototype

## 6.13 Search Functionality — Design Decisions

Added: July 2026. Source: offline search architecture sessions (tiered record
model). **Substantially reduced 2026-09-08** when §2.1 reversed the read polarity:
**database-wide record search does not work offline**, so the Tier 2 index and
everything that existed to serve it are superseded (§21). What remains below is
the part that was never about the index — the row lifecycle, the local-store
contract, and the rule that the UI never reads from the network. See also §2.6.

**Search, in one line: online-first at full fidelity; offline it covers the work
set plus what the technician cached, and it says so.**

| Decision | Rationale |
| --- | --- |
| **"Synced" ≠ "visible"** | Survives the reduction, at a narrower scope. A record can be *visible* from a server query without being *synced*, which is what lets one grid mix server results with local work-set rows and no special-casing. It no longer implies an on-device index of records the technician does not hold. |
| **Three record tiers: work set / on-demand cache / server search** | Reduced from four 2026-09-08. Full data for active work (§2.3 Tier 1), user-cached records for R5, and **server search at full fidelity** for everything else. The dropped tier is the lightweight database-wide index. |
| **Offline search is scoped, and announces its scope** | Replaces the index-freshness caption. Offline, search covers the work set and cached records only, and must **say what it covered** — *"showing the 12 assets on this work order; connect to search all"* — never a silent short list (§2.8 row 2). A short list looks like correct data, which is why this is the highest-risk failure mode of the whole approach. |
| **Dataspies execute server-side, at full fidelity** | Locked 2026-09-08, and it is the one place this reduction makes the product *better* rather than cheaper. All fields, all joins, all predicates, identical to desktop — no declared column set to author, no classification step, no offline/online-capable split to explain, no truncation caption. **R4 is satisfied rather than compromised.** Offline, the active dataspy falls back to filtering what is on the device, under the scope rule above (a `substituted` action per §2.9, not a blocked one). |
| **The card surfaces exactly 6 fields — a display rule, not the storage projection** | Set 2026-07-20 (redefined then from an approximate "~8–12"), and **re-scoped 2026-08-26** to say only what the number was ever about: 6 is what §8.3's card/filter/sort standard *presents*, drawn from the **active** dataspy's own column order. It was originally justified as coupling the UI standard and the sync payload to "one number, not two that can drift"; that coupling was withdrawn 2026-08-26, and **as of 2026-09-08 there is no second number at all** — the storage projection went with the index (§21). So this row is now what it always should have been: **a display rule, and the only projection number in the design.** Still provisional, pending design confirmation (§20). |
| **Real scaling limit = payload size + sync volume, not row count** | Both are already handled by the existing delta-pull cursor. Solves the actual constraint instead of an imagined one. |
| **Membership shipping is reserved for the punch list** — narrowed 2026-08-25, **and as of 2026-09-08 that is its entire scope** | Original rationale: the server computes WO-ID membership for saved dataspies and ships it with the index, rather than shipping dataspy logic for local re-evaluation; offline switching becomes instant with no local SQL engine needed. **What narrowed it:** dataspies are unbounded and user-authored, so "pre-evaluate each saved dataspy per user per sync" is unbounded server work and unbounded payload. Membership shipping is now reserved for the cases where the set is **small and server-authoritative** — Tier 1 / the punch list (§2.6), where `pinned = 1` genuinely has to come from the server. General dataspy handling is the **classify-and-evaluate-locally** rule above. Note punch-list **Option A leans on the original, broader reading**, so this narrowing is a live input to that still-open choice, not just a search concern. |
| **Sync Config dataspy repurposed** | Meaning shifts from "what's on the device" to "what's guaranteed executable offline" — i.e., it now scopes Tier 1, not the whole local DB. |
| **Server search reuses the existing dataspy SQL search API** | No new server search engine. **As of 2026-09-08 this is the primary read path rather than a last-resort escalation** (§2.1) — which makes "reuse what already exists" a stronger position than it was, because the thing being reused is the thing customers already trust on the desktop. |
| **Online search results are written into the local DB as ephemeral rows** | Preserves "UI reads only from local DB" with zero special-casing — the grid always re-queries locally, network never feeds the UI directly. |
| **Local record schema: narrow columns + `full_payload` JSON blob for the remaining ~140 fields** — the table is still called `wo_index` throughout these docs, but **as of 2026-09-08 it is not an index**, and renaming it is dev's call at schema time | Every customer's WO record differs (UDFs, custom fields, config drift); the blob absorbs that variance. Tier transitions become single-row UPDATEs, not schema migrations. |
| **Lifecycle columns: hydration / pinned / source / last_synced_at vs. fetched_at / dirty** | Each is a distinct axis — completeness, offline promise, provenance, two separate clock domains, and a safety interlock — needed to make tier transitions and eviction safe. **`hydration` survives the reduction with fewer values** — there is no `stub` — and is retained rather than collapsed to a boolean, because §2.3's traversal makes "how complete?" a real question again: a record can be present with all its children and still carry an unresolved reference. |
| **pinned is orthogonal to hydration** | Separates "guaranteed offline" from "currently has full data," so manual pinning can exist as its own concept. |
| **Server-search upsert rule: ON CONFLICT refreshes summary fields only** | Never touches hydration, pinned, dirty, or full_payload. A search result can never demote a tier or clobber a local edit. |
| **Tiers move up via user intent only; down only via explicit LRU/sweep, hard-blocked by pinned/dirty — and now by refcount** | Predictable, safe eviction behavior — no silent data loss. **Amended 2026-09-08:** §2.3's traversal means a row can be on the device because *another* retained root references it, so the `!pinned && !dirty` interlock gains a third condition — **no other retained root references this row.** Real refcount column vs. recomputed sweep is open (§20). |
| **Row identity (`wo_id` / FTS entry) never changes across the lifecycle** | This is what lets mixed-origin rows (sync / demand / server_search) coexist in one grid with no special-casing — **and it is the single reason the 2026-09-08 reduction costs nothing structurally.** Re-adding a `stub` state and a fixed projection later touches neither row identity, the grid, nor the outbox (§2.1). |
| **Row state surfaced via the existing 4-state sync control language** | No new visual system — consistency with the rest of the app's sync vocabulary. |

### Row lifecycle — state machine

Migrated here 2026-08-25 from the retired offline-search summary doc (§21),
which was its only home. Row identity (`wo_id` and its FTS entry) is stable
across every transition below — that stability is what lets mixed-origin
rows coexist in one grid with no special-casing.

**Reduced 2026-09-08 with the index (§21).** The `stub` state is gone — nothing
populates it once there is no database-wide projection — which collapses five
transitions to three:

```
ephemeral --(demand tap / manual cache, while online)--> hydrated
ephemeral --(swept after ~24h)-------------------------> [deleted]
hydrated  --(LRU, only if !pinned && !dirty && !referenced)--> [deleted]
punch-list membership arrives ------------------------> hydrated (pinned = 1)
```

Three things this makes explicit that the table above only implies. An
**ephemeral** row (a server-search result written locally so the UI never reads
from the network) is deleted outright rather than demoted. **LRU now deletes
rather than demotes**, because there is no lesser state to demote *to* — so an
eviction can now lose a row's existence, which is exactly why the `pinned` and
`dirty` interlocks and the new `!referenced` condition are load-bearing rather
than prudent. And `!referenced` is the refcount condition: a row pulled in as
another root's depth-1 reference (§2.3) must not be evicted while that root is
retained.

**The superseded transition worth remembering:** `stub --(index sync reports WO
closed)--> [deleted]` was what made the index "open work orders by construction."
With no index there is nothing to bound, which is one of the two reasons the
configured index scope closed as an open item rather than being answered (§21).

**Rejected alternative — a static, non-configurable card projection, with List
mode online-only.** Considered 2026-08-25, rejected. Its List half needed no
decision at all: §8.3 already locks List mode as tier-dependent — degrading
offline to the Tier 2 projection, with true full-column completeness online-only
via Tier 4. Its card half fails on two counts. **First, the projection drives
more than the card.** §21 retired *both* the bespoke WO-only card anatomy *and*
the hardcoded `Type · Status · Department · Priority` filter-chip row, in favour
of "filter chips (and sort options) are dataspy-driven: the same 6 fields the
card surfaces" — so a static projection resurrects the second of those almost
verbatim. **Second, it fights the schema's own premise.** `full_payload` is a
JSON blob precisely because every customer's WO record differs (UDFs, custom
fields, config drift); a fixed projection means a customer whose triage depends
on a UDF can never surface it on a card, a filter chip or a sort. Don't
re-propose this without amending §21's two rows first.

**Rejected alternative, and note it is now moot rather than merely rejected:**
both halves of the argument above turned on the Tier 2 projection, which no
longer exists. Retained because §21's two rows it depends on are still live and
someone re-proposing a fixed projection would need them — but the live question
it now bears on is the **card's** 6, not storage.

Still open, not decided (**six items closed 2026-09-08** — all six were prices of
the index; see §21 — and the **punch-list mechanism closed 2026-09-11**, as *both*
a per-group dataspy and pinning, §2.6): the card's 6-field display number; `dirty` as counter vs. boolean;
refcount column vs. recomputed sweep for the new eviction condition; and
confirmation that the existing dataspy SQL API can serve the now-primary server
search path as-is. **FTS5 is no longer an engine exit criterion** — work-set-scoped
search does not need it at scale — which also retires one of §2.2's four
native-forcing reasons without touching the conclusion.

# 7. Standard Model — Record View

Reuses the same two-part shell established for the WO workflow, generalized
beyond a linear 5-step sequence:

## 7.1 Shell pattern — header + tab rail

- **Header block** — collapsible identity summary for the parent record
  (equivalent to the WO identity block). Collapsible via the same tap-handle
  interaction as the WO block. Reworked (this session) after review found
  the original version pointless: collapsed and expanded states showed
  almost the same thing, and the chips (type/priority/dept for WO,
  class/criticality/dept for Equipment) duplicated real editable fields
  already sitting in the body content one scroll away. New pattern, applies
  to WO and Equipment alike:
  - **Collapsed**: code + description only. Nothing else.
  - **Expanded**: the same code + description line, plus one new line that
    doesn't exist anywhere else on the screen — a colored status badge
    (WO: current status, e.g. Released; Equipment: Operational Status, since
    "is it running" matters more at a glance than the administrative
    Status field) and a muted location line. No classification chips —
    those belong to the body fields that already show them.
  - This is the actual test for "does expanding earn its keystroke": every
    future record type's header must reveal something in the expanded state
    that isn't just a reformatting of the collapsed line or a chip-copy of
    a body field.
- **Tab rail** — the WO step rail's mechanism, generalized: collapsed state
  shows the current tab's name + chevron (no timer pill, no done/active/
  future segments — these are sibling tabs, not a sequence).
  Tapping expands a flat list of every sibling tab; all are always tappable
  (no locking — nothing here is gated the way workflow steps are).

## 7.2 Record View tab

The default/first tab. Structure confirmed against the actual base-EAM
Asset record view screen (desktop):

- **Header row fields** (ungrouped, above the first section) — mirrors what
  sits in the collapsible header block plus a few more: Department, PM WO
  Department, Criticality, Commission Date, Assigned To, Organization,
  Status, Operational Status.
- **Collapsible field-group sections**, same `.rv-section` pattern as WO
  Record View. Confirmed section names from the real screen: **Equipment
  Details**, **Tracking Details**, **Contract and Rental Details**
  (collapsed by default), **Performance Details** (collapsed by default).
- **Class-driven attributes section** — a real modeling detail from the
  reference screen: equipment with Class = PUMP shows a "Pump Information"
  section (Full Load Amps, Inlet/Outlet Size, Phase, Horsepower) that
  wouldn't appear for a different class. The mobile record view must
  render this section dynamically based on the record's Class.
- **Comments and Documents sections are ALWAYS present on every standard
  record view**, regardless of record type — locked, universal rule, not
  Equipment-specific. Same collapsible pattern as WO Record View's
  Comments/Documents.
- **Comment author label, avatar, and actions — locked, module-agnostic.**
  A comment shows the commenting user's **description** (their display name —
  same "description, not code/ID" philosophy as every LOV field, §3.4), a
  timestamp, and the ellipsis for Edit/Delete/Copy. **An initials avatar
  (26px) precedes the name** — confirmed 2026-08-11 as part of the chat-style
  card; this reverses an earlier "no avatar" call whose stated reason was that
  an avatar would compete with the ellipsis, which stopped being true once the
  ellipsis moved out of the header row to the card's own corner (superseded
  decision relocated to §21). Initials are derived from the name, with a
  first-two-characters fallback for a single-word name and `?` for an empty
  one — a blank circle reads as a broken image rather than an unknown author.
  The ellipsis's own actions sheet uses the exact same `.sheet-header`
  (✕ + title) every other sheet in the app uses — any sheet lacking a proper
  header should be treated as a defect. Two example comments per demo record
  (one Copy-only, one Edit/Delete/Copy) make the ownership-permission rule
  visible on sight without adding a comment first — a single-example version
  reads as though Edit/Delete were missing entirely rather than
  permission-gated.
- Desktop's "quick links" panel (Hierarchy, Reliability Ranking Details,
  Part Association, Financial and Disposition Details, Class Attributes)
  is superseded on mobile by the tab rail itself — not replicated as a
  separate panel.

### Top 3 inline + View more, and the Documents source tree (locked 2026-08-11)

Direct instruction. This also **resolves** the previously-open "dual treatment
scope" question — it is **both**, for every record type that has these
sections, not a per-entity choice:

- **The Record View shows the top 3** of Comments and of Documents, newest
  first, then a **View more** footer row. WO Record View used to render *every*
  comment inline on the reasoning that it had no tab of its own; that
  exception is gone now that it has a real destination.
- **View more opens the matching tab**, showing every record sorted by
  created/updated **DESC**. Equipment Record View uses its existing Comments
  and Documents tabs; WO uses `eam-wo-reference-tab-prototype-v1.html`, one
  child-tab screen carrying both tabs (mirroring how Equipment RV holds them
  as two tabs in one file, rather than two near-identical standalone files).
- **The View more row is emitted by the shared excerpt renderers**, never
  appended by a screen afterwards — appending broke the moment anything
  re-rendered the mount, and adding a comment does exactly that
  (`refreshAllCommentViews()`). A tabbed screen passes `COMMENTS_TAB_KEY` and
  gets `goToTab()`; an untabbed one sets `COMMENTS_VIEW_MORE_ONCLICK` /
  `DOCUMENTS_VIEW_MORE_ONCLICK` to its own navigation. Neither set → no
  footer, rather than a link that goes nowhere.
- **Comment card — chat style.** A discrete card per comment (own comments
  tinted) with the action ellipsis pinned **top-right of the card**, out of the
  header's flow. Actions are unchanged and were already correct: **Edit +
  Delete on the technician's own comments, Copy on everyone's.**
- **Documents carry `Source:`** and group by the real base-EAM hierarchy —
  Work Order, Equipment, Project, Department, Parent Work Order, Location, PM
  Schedule, in that order. **A level with no documents renders no group at
  all** — deliberately unlike the base screen, which shows a "No Document"
  placeholder row under every empty folder.
- **The document preview slot is a fixed 38px box that degrades to a
  file-type badge**, and its size must never depend on whether an image
  loaded. Chosen (option C of `mockups/comments-documents-tab-options.html`)
  over a thumbnail-forward card grid because thumbnails cannot be
  load-bearing here: S3 generates nothing for `.sql`/`.dwg`/most CAD-office
  types (the real reference screenshot contains a `.sql`), previews are
  unavailable offline — this app's normal state — and private-tenant
  presigned URLs expire, so offline caching has to key on a stable document
  id rather than the URL. With a fixed slot, both the populated and degraded
  states look deliberate and a late-arriving image can't reflow the list.
  Images are `loading="lazy"`.
- Applies to **Equipment as well as WO**.

**Comment avatar — confirmed 2026-08-11.** The chat-style card's 26px initials
avatar was raised as a conflict with this section's earlier "no avatar" lock and
has been explicitly confirmed; the superseded decision is relocated to §21 per
the reorg convention, and the bullet above now states the current rule.

## 7.3 Sibling tabs (Equipment)

Confirmed from the reference screen — 11 tabs total, Record View plus 10
siblings: **Comments, Documents, Events, Costs, PM Schedules, Structure
Details, Depreciation, Meters, Warranties, Parts Associated.** (Corrected
2026-07-16, conformance audit — this section originally said "9 total, 8
siblings," predating the later §5.2 decision that gave Comments and
Documents their own dedicated tabs alongside their inline excerpt; the
code was already correct, this section's prose wasn't.)

## 7.4 Structure Details tab — the Structure Tree component

**Corrected 2026-08-25 (user direction).** This section previously read "no
mobile tree-diagram pattern exists yet anywhere in this app" and flagged
the tab as needing original design work. **That went stale and was wrong by
the time it mattered:** the Equipment LOV's own Structure tab (§15.5)
shipped a complete, Octave-styled, dark-mode-aware mobile tree, and the
locked position is now that **the structure tree is a shared component** —
"as it is used in equipment LOV as well." Named **Structure Tree** in
`component-library.md`, which carries the full anatomy.

This tab shows the equipment's position in the Location → Position →
System → Asset hierarchy, and it renders through that same component:
`renderTreeNode()`/`renderEquipTree()` in `eam-shared.js`, `.tree-*` in
`eam-shared.css`. Already solved and not to be re-designed: the recursive
indented-card layout, the `.tree-guide` connector elbows, the per-node
icon/type/description/code anatomy, caret-expand independent of focus
(§15.5's "Option B"), current-node emphasis, and ancestor auto-expand.

**So Structure Details is a second consumer, not a new component.** What it
owes is parameterization, not design:
- the mount and the data source are hardcoded to the LOV (`#equipTreeBody`,
  `TREE_DATA`);
- the trailing row control is selection-only (`Select` / `Add`/`Added` /
  `Selected`). A tab is **not a picker** — a node tap should navigate to
  that asset, so the row action needs to become a handler, same shape as
  `ROW_TAP_HANDLERS` elsewhere;
- `selectTreeNode()` mutates `current` across `TREE_NODE_MAP` and calls
  `commitEquipmentSelection()`, both meaningless outside a picker.

**The one genuinely additive design piece** is small: the legacy desktop
tablet reference `Structure__Safety_WO.png` shows **a status dot per node**,
which this component has no equivalent for. Everything else that screenshot
shows — indentation, connector lines — already exists here, Octave-styled
and mobile-vertical, rather than needing restyling from it.

**The general lesson, worth more than this section:** a shared component
with no name in `component-library.md` is invisible to the spec. This tree
existed for weeks while §7.4 kept describing it as nonexistent. Name a
recurring pattern when it lands, per that file's own stated purpose.

## 7.5 Equipment Photo — icon, preview pop-out, and edit (decided
2026-07-22; badge, viewer, and source-picker all built 2026-08-10 for the
WO Record View consumer — Equipment Record View's own header icon slot
still open)

**Re-derived 2026-08-10** (resolves the 2026-07-24 flag below): WO Record
View's Equipment icon is now a 44px `.attr-badge-photo` tile (filled
gradient, up from the 28px `.attr-badge-outline` box shared with Type/
Priority) — big enough to actually read as a photo slot, per this
section's own original concern. No real photo *storage* exists in this
prototype — `EQUIP_PHOTO_DEMO_URL` (`eam-shared.js`) is a placeholder-
image-service URL standing in for "a real photo on file" (this demo's own
Equipment, 00067333 Pump Centrifugal, carries it via
`RECORD.equipment.photoUrl`), with an embedded SVG data-URI fallback
(`img.onerror`) so the viewer never shows a broken image if the network
is unavailable — this app otherwise assumes offline is the normal case.

### Equipment Record View's own header slot — option A2 (locked 2026-08-11)

Closes the last open half of this section. Chosen from
`mockups/equipment-photo-header-placement-options.html`, which drew four
placements with **real scroll behaviour** in each frame (replicating
`onContentScroll()`'s own `.scrolled` at >40px / release at <10px, and
`.rec-status-row`'s 58px→0 over .22s) so the collapse could be felt rather
than guessed at:

- **A 74px slot left of code/description that stretches down alongside the
  status row, and collapses away WITH status on scroll** (`.rec-id-split` +
  `.rec-photo-slot`, `renderRecordPhotoMount()`). Status and the Organization
  pill already share `.rec-status-row` and vanish together, so taking the
  photo with them makes it one gesture with one result; code + description
  already answer "which record am I on" once you're reading. The collapse
  uses a negative `margin-left` as well as zero width, or the flex gap would
  survive as a 12px ghost gutter and leave the identity text visibly inset.
- **With no photo set** the slot shows a camera glyph on a neutral fill — an
  absent photo is something you can add, and since the slot leaves on scroll
  it never nags. This is the other half of what was open here.
- Tapping the slot routes into the **same shared flow** as WO Record View's
  own badge (`openEquipPhotoTap()` → viewer if a photo exists, source picker
  if not), so there is one photo mechanic in the app rather than two.

**Rejected**, all drawn in the mockup: keeping the photo visible-but-shrunk
through the collapse (a second animation fighting the status collapse, for a
question the header text already answers); a 44px identity-row tile (safest,
reuses `.attr-badge-photo` verbatim, but a pump at 44px is barely a photo); a
separate container in the record body (biggest image and Screen-Designer-
repositionable, but scrolls away permanently, pushes real fields down, and
leaves ~150px of empty card on every asset without a photo — which is most of
them early on); and a full-width collapsing cover strip (a new component and a
third thing animating at once).

**Flagged 2026-07-24, resolved 2026-08-10 above:** this section's WO
Record View consumer used to still assume the old standalone
`.equip-summary-card`/40px icon and its "no photo, no class icon → no
icon at all" fallback — both superseded by §15.5's 2026-07-24 change
(Equipment rolled into the Header Fields grid). The re-derivation above
is against the grid's current badge shape, not the sizes/rules quoted
here.

New named component, raised this session, not yet prototyped in either
consumer. **Distinct from §4.3's user Avatar** — this is a photo of the
physical asset, attached to the Equipment record itself, not the logged-in
technician's own picture. The request that introduced this used "profile
picture" language by analogy to §4.3, but the two are different data on
different records — don't conflate them or reuse `.nav-avatar` markup for
this.

**Two consumers, one shared component:**
- **WO Record View's Equipment LOV on-record icon** (§15.5's
  `.equip-summary-card` icon slot — today the per-class icon from
  `EQUIP_CLASS_ICONS`).
- **Equipment Record View's own header** (§5.3's `.rec-id-row`). This adds
  a new icon slot — `.rec-id-row` has none today — it doesn't converge an
  existing duplicate. Exact placement/sizing within `.rec-id-row` is not
  yet decided; tracked in §20.

**Fallback order — same "real photo beats a generic fallback" pattern
already locked for the nav Avatar (§4.3):** the equipment's own photo
displays if one is on file. On WO Record View, absent a photo the icon
falls back to the existing per-class-icon-or-nothing rule (§15.5)
unchanged — no photo and no class icon means no icon at all, same as
today. Equipment Record View's icon has no prior fallback of its own to
drop back to; what it shows with neither a photo nor (whatever, if
anything, ends up gating an icon there) is an open question, not answered
here.

**Populated state — tap opens a pop-out preview, built 2026-08-10 as its
own new shared component (`.photo-viewer-overlay`, eam-shared.css/.js),
NOT a §19.6 reuse after all** — a genuine full-screen overlay (not a
bottom sheet), close **top-left** (`.photo-viewer-close`, direct
instruction — deliberately not `.qr-scan-overlay`'s own top-right close,
the two are allowed to differ), a plain `<img>` filling the body, and a
single **Modify** button pinned at the bottom (`.photo-viewer-modify-
btn`, always light-filled regardless of app theme, since this overlay's
own backdrop is always near-black like `.qr-scan-overlay` — the ordinary
`.btn-contained` dark fill would nearly disappear against it). Modify
reopens the same source-picker sheet the empty state uses (below) —
one sheet, two entry paths, not two components. **Long-press is
deliberately unhandled** — a real `<img>` with no `oncontextmenu`/touch
override lets the OS's own native context menu (Share/Copy/Save, etc.)
fire for free; don't add a custom long-press handler here, it would only
ever make this worse. Remove is not offered here (unlike §19.6's own
viewer) — not decided against, just not asked for.

**Empty state — tap goes straight to the source-picker, skipping the
preview.** Nothing to preview yet, so tapping an icon with no photo set
opens `#equipPhotoSourceSheet` directly (Camera / Photo library / File or
document — reuses the already-shared `.source-option*` markup/CSS §19.6's
own Attachments picker uses, not a new visual pattern) to set a first
photo — same shortcut logic as any other unset-required-field tap, just
without an intermediate empty-preview step. Picking any source in this
prototype always resolves to the same `EQUIP_PHOTO_DEMO_URL` (same
convention as `simulateQrScan()`), via a screen-supplied `equipPhotoOnSet`
hook (`eam-shared.js`) — a screen that never defines this hook (Insert
Mode, today) gets an honest "coming soon" toast instead of a false
"✓ Photo updated."

**Tap-target carve-out, built 2026-08-10 inside `equipSummaryCardHTML()`
itself (eam-shared.js), not screen-local:** the Equipment `.attr-item`'s
own tap still opens the Equipment Lookup sheet (§15.5); the badge/icon
now carries its own `onclick` (`openEquipPhotoTap()`, `stopPropagation()`)
that intercepts the tap for photo preview/set instead. Because this lives
in the shared function both WO Record View and Insert Mode call, both
consumers get the carve-out automatically — no per-screen wiring beyond
the `equipPhotoOnSet` hook above. Same "separate controls so browsing one
thing never collides with a different action" precedent already set by
the Structure tab's text-vs-caret disambiguation (§15.5).

# 8. Standard Model — Record View › Child Tabs

Answers the "Record-view child tabs" open item (§20): what a child tab like
Equipment's Events, Costs, or PM Schedules actually looks like.

- **Same paradigm as WO List (§6), not a new pattern.** Dataspy bar,
  Detailed/List view-mode toggle, and card/table anatomy are all reused
  as-is — generalizing §6 rather than inventing a second list pattern.
- **Scoped to the parent header record.** The dataspy/list here isn't the
  global "all Events" or "all Costs" — it's filtered down to records
  belonging to the record whose identity header (§5.3) sits above the tab
  rail. E.g. Equipment 00067333's Events tab shows only that asset's
  events.
- **Header composition — protected identity + Ellipsis (+ Plus, except
  where noted below).** Revised 2026-07-14: corrects the original version
  of this row, which said the header was just "Plus + Ellipsis" with no
  identity at all. It still needs identity — you need to know *whose*
  child data you're looking at — just not the editable, status-forward
  version from §5.3. Composition:
  - Parent record's number, same visual treatment as §5.3 (no mini-icon —
    removed from the pattern entirely 2026-07-16, see §5.3).
  - Parent record's **description, rendered protected — not editable.**
    No tap-to-edit, no textarea, muted/non-interactive styling (adapts
    §3.4's protected-field convention — muted colour, no pointer cursor —
    to a header with no row/background to tint against, since this isn't
    a `.form-field`). This is the specific thing to notate here per
    explicit instruction: description is shown, just never editable on
    this header.
  - A **Plus (+)** — opens Insert Mode scoped to this child type (§9).
  - A **Search (🔍)** — added 2026-07-14. Sits between Plus and Ellipsis.
    Opens an inline filter bar over this tab's own row list (not a
    separate full-screen search page like WO List's, §6.4 — see §8.2
    for why a lighter mechanism is the deliberate choice here). Filters
    within whatever dataspy is currently selected; does not search across
    dataspies or across other child types.
  - An **Ellipsis (⋯)** — distinct action set from the parent record's own
    ellipsis in §5.3 (the two never appear together — see the corrected
    §5.3 Scope note). Contents for the generic case aren't decided yet —
    likely list-level actions (sort, filter management, view-mode) rather
    than §5.3's record-level Copy/Delete set; flagged as open.
  - **No status button, no pin.** Both are Record-View-level controls
    (§5.3) — a child list/detail screen never repeats them.
- **Plus and Search visibility both follow a content-driven rule, not a
  per-module list.** Added 2026-07-14. Whether a given List/Detail tab
  shows Plus and/or Search is decided by what the tab's content actually
  is, and answering that question is meant to generalize across every
  module, not just get re-derived screen by screen:
  - **Plus** shows only when the real base-EAM screen this tab mirrors has
    an actual insert-capable detail section below its grid (an editable
    detail form + an insert-capable toolbar) — a standalone or aggregated
    grid (read-only rows, or rows computed/rolled-up from elsewhere) never
    gets it, because there's nothing valid to insert directly into that
    view.
  - **Search** shows on any tab whose content is the §8.2 row-list shell
    — i.e. anything with dataspies and filterable rows. It's withheld only
    from a tab whose content isn't a flat/filterable row list at all (a
    hierarchy/tree view, for instance) — there's nothing there for a text
    filter to search over.
  - Confirm each new tab against the actual base-EAM screen (or, lacking
    one, reference screenshots) rather than guessing — this was decided by
    screenshot inspection the first time it came up (see §8.2's "Applied
    to" note), not by assumption.
- **Exception: WO workflow detail screens drop the Plus.** Locked
  2026-07-14 — see §15.4's "Chrome" note. Activity Checklist, Issue Parts,
  Book Labor, and WO Closing use this exact header (protected identity +
  ellipsis, + Search where the screen has a real row list to filter) but
  never get the Plus, because each already has its own pointed, specific
  add-affordance built into the page content — Add Parts / Quick Issue All
  (Issue Parts), Add Labor / Add by Crew (Book Labor), the Activities
  section's own `+` (Record View, §15.2). A second, generic header Plus
  would compete with an action that's already more specific and better
  placed. This is a WO-workflow-specific carve-out, not a change to the
  generic pattern — a true child-list screen with no existing pointed
  add-affordance keeps the Plus per the content-driven rule above.

### 8.1 Detail header — exact code reference

**CANONICAL SOURCE** for the header used by Activity Checklist, Issue
Parts, Book Labor, and WO Closing (the WO-workflow Plus-dropped variant of
this section's pattern). Copy exactly, only changing the
number/description values, the screen-specific ellipsis item, and — for a
non-WO-workflow child list screen — adding the Plus button back in. **No
mini-icon** (§5.3).

**CSS:**
```css
.rec-header { background: var(--bg-nav); flex-shrink: 0; }
.rec-id-row { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; }
.rec-id-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.rec-num { font-family: var(--font-mono); font-size: 22px; font-weight: 700; letter-spacing: 0.3px; color: white; line-height: 1.1; }
/* Protected — not editable. No cursor:pointer, no onclick, no edit
   textarea anywhere in this header (contrast with §5.3's .rec-desc). */
.rec-desc.protected { display: block; font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.5); line-height: 1.3; cursor: default; }
.rec-header-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; margin-left: auto; margin-top: -3px; position: relative; }
.rec-ellipsis-btn { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.55); transition: background 0.15s, color 0.15s; }
.rec-ellipsis-btn:hover { background: rgba(255,255,255,0.1); color: white; }
.rec-ellipsis-btn svg { width: 18px; height: 18px; }
.rec-actions-menu { position: absolute; top: 40px; right: 0; min-width: 190px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 8px 28px rgba(0,0,0,0.28); padding: 6px 0; opacity: 0; visibility: hidden; transform: translateY(-6px) scale(0.98); transition: opacity 0.15s, transform 0.15s, visibility 0.15s; z-index: 150; }
[data-theme="dark"] .rec-actions-menu { background: #26252B; }
.rec-actions-menu.open { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
.rec-actions-group:empty { display: none; }
.rec-actions-divider { height: 1px; background: var(--border); margin: 4px 0; }
.rec-actions-item { padding: 10px 16px; font-size: 14px; font-weight: 500; color: var(--octave-black); cursor: pointer; white-space: nowrap; }
[data-theme="dark"] .rec-actions-item { color: rgba(255,255,255,0.9); }
.rec-actions-item:hover { background: var(--bg-section); }
.rec-actions-item.danger { color: var(--red); }
```

**HTML:**
```html
<div class="rec-header" id="recHeader" onclick="scrollFormToTop()">
  <div class="rec-id-row">
    <div class="rec-id-text">
      <span class="rec-num"><!-- RECORD NUMBER --></span>
      <span class="rec-desc protected"><!-- DESCRIPTION, no onclick, no edit textarea --></span>
    </div>
    <div class="rec-header-actions">
      <!-- CUSTOMIZE: non-WO-workflow child list screens add a Plus button
           here, before the ellipsis — see §8's WO exception above. -->
      <button class="rec-ellipsis-btn" onclick="event.stopPropagation(); toggleRecActionsMenu()" aria-label="More actions">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
      </button>
      <div class="rec-actions-menu" id="recActionsMenu">
        <div class="rec-actions-group"><div class="rec-actions-item" onclick="recCopyLink()">Copy Link</div></div>
        <div class="rec-actions-divider"></div>
        <div class="rec-actions-group">
          <div class="rec-actions-item" onclick="recCopyRecord()">Copy</div>
          <div class="rec-actions-item danger" onclick="recDeleteRecord()">Delete</div>
        </div>
        <div class="rec-actions-divider"></div>
        <div class="rec-actions-group" id="recActionsScreenSpecific"><!-- CUSTOMIZE --></div>
      </div>
    </div>
  </div>
</div>
```

**No status row at all** — unlike §5.3's header, there's nothing to
scroll-collapse, so this header doesn't track scroll position. `onclick="scrollFormToTop()"`
directly on `.rec-header` (and the same on the nav bar) is the only
scroll-to-top wiring needed — no `onRecHeaderTap`/`onRecContentScroll`/
`.scrolled` state, since there's no expanded/collapsed distinction to make.
`autoGrow`/`onDescTap`/`onDescBlur` are §5.3-only (the editable-description
mechanism) — do not port them here, there's nothing for them to do.

**Applied to:** `eam-activity-checklist-prototype-v2.html`,
`eam-wo-prototype-issue-parts-v1.html`, `eam-book-labor-prototype-v2.html`,
`eam-wo-closing-prototype-v2.html` (all 4 link `eam-shared.css` directly).

**Also applied to `eam-equipment-record-view-prototype-v1.html`** — the
first real (non-WO) use of this pattern's Plus-included form. All 7
sibling tabs other than Record View (Events, Costs, PM Schedules,
Structure Details, Depreciation, Meters, Warranties, Parts Associated) get
this header including the Plus — Equipment's child tabs aren't
WO-workflow screens, so the §8 WO exception doesn't apply, and none has
an existing pointed add-affordance the way Issue Parts/Book Labor do.
Equipment is one file serving two roles, so it carries *both* headers as
separate elements (`#recHeader` and `#listDetailHeader`, namespaced
`.list-detail-*`) and toggles visibility between them in `goToTab()` — Plus
is tab-aware via a single shared handler that reads `currentTab`
(`onListDetailPlusTap()`) rather than re-rendering the header per tab. The
ellipsis menu's contents (Sort, view-mode toggle) are toast-stub
placeholders, not a locked menu — the generic-case contents are still
undecided (§8's own note above). Structure Details gets the header too;
its own tree content (§7.4, still an open design problem) is untouched by
this.

### 8.2 List/Detail content shell — exact code reference

**CANONICAL SOURCE** for what actually fills a List/Detail tab below its
§8.1 header — the generalized version of the WO List mechanism (§6)
this section's opening bullet promises. This is an app-wide standard, not
an Equipment-specific screen: any module's child list/detail tab (a WO's
own related-records tabs, a Location's, a future PM's) builds on this same
shell rather than re-deriving a list pattern per module. Copy the
mechanism, swap only the config data (dataspies, rows, sort label) and, for
a variant like Costs below, the row template and any aggregate footer.

**Config-driven, not hand-rolled per tab.** Each tab is one entry in a
lookup keyed by tab key:
```js
const LIST_DETAIL_TABS = {
  <tabKey>: {
    sortLabel: '<label for the sort button>',
    dataspies: [ { key, name }, ... ],
    rows: [ { ds:['<dataspy keys this row belongs to>'], title, sub, trailing }, ... ],
  },
  // one entry per tab that uses the shell
};
```
A single `renderListDetailShell(tabKey, extraTopHtml?)` reads the active
tab's config plus its own per-tab state (`{ dataspy, mode, search,
searchOpen }`, held in a shared `listDetailState` map) and returns the
tab's full inner HTML. `extraTopHtml` lets a tab prepend its own fixed
content above the shell (e.g. Depreciation's "Depreciation Method" summary
card) without forking the shell itself.

**CSS (token names generalized — substitute your module's own design
tokens, e.g. `--bg-card`/`--border`/`--octave-black`/`--purple`, not a
literal copy-paste of another file's token aliases):**
```css
.ds-bar { margin: 12px 12px 0; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 14px; padding: 11px 14px; display: flex; align-items: center; gap: 11px; cursor: pointer; transition: border-color 0.15s; }
.ds-bar:hover { border-color: var(--purple); }
.mode-tog { margin: 10px 12px 0; display: flex; background: var(--bg-section); border-radius: 11px; padding: 3px; border: 1px solid var(--border); }
.res-row { padding: 10px 16px 4px; display: flex; align-items: center; justify-content: space-between; }
.sort-btn { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--gray-4); background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.15s; }
.sort-btn:hover { color: var(--purple); background: rgba(153,51,255,0.08); }
.plain-row { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.15s; }
.plain-row:hover { background: var(--bg-section); }
.plain-row-title { font-size: 13px; font-weight: 600; color: var(--octave-black); margin-bottom: 2px; }
.plain-row-sub { font-size: 12px; color: var(--gray-4); line-height: 1.4; }
.plain-row-trailing { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--octave-black); flex-shrink: 0; text-align: right; }
.plain-row.filtered-out { display: none; }
/* Inline search bar — toggled from the header Search icon, §8. */
.ld-search-bar { margin: 12px 12px 0; background: var(--bg-card); border: 1.5px solid var(--purple); border-radius: 14px; padding: 9px 12px; display: flex; align-items: center; gap: 9px; }
.ld-search-input { flex: 1; border: none; background: none; outline: none; font-size: 13px; color: var(--octave-black); min-width: 0; }
/* Optional aggregate-footer variant — see Costs below. */
.cost-summary { margin: 4px 12px 0; background: rgba(153,51,255,0.06); border: 1px solid rgba(153,51,255,0.18); border-radius: 10px; padding: 10px 14px; }
.cost-summary-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; font-size: 13px; color: var(--gray-4); }
.cost-summary-row.total { border-top: 1px solid rgba(153,51,255,0.18); margin-top: 4px; padding-top: 8px; font-weight: 700; color: var(--octave-black); }
```
No icons or symbols in the card anatomy itself — colour (pills/tinted
text) carries all the meaning, never a glyph. (Icons still live in the
tab rail — the header's own mini-icon was removed from the pattern
entirely 2026-07-16, see §5.3; this rule is specific to cards inside the
list, per explicit instruction: "forget all the fancy icons and symbols
in the list results for this use case.") The row itself grew from a
3-field title/sub/trailing scheme to a locked 5-field card on 2026-07-20
— see §8.3 — but this no-icon rule carries over unchanged.

**Dataspy switching:** tapping `.ds-bar` opens a bottom sheet (reusing the
existing LOV-sheet row styling, §5.2) listing the tab's `dataspies`;
selecting one updates `listDetailState[tabKey].dataspy` and re-renders.
**Mode toggle:** `.mode-tog` swaps between "Detailed" (the 5-field card,
§8.3) and "List" (title only) — same distinction as WO List's own mode
toggle (§6).

**Search — live-filter without losing input focus.** Each rendered
`.plain-row` carries a `data-search="<lowercased searchable text>"`
attribute. Typing in the `.ld-search-input` does **not** re-render the row
list — it toggles a `.filtered-out` class on the existing row nodes
(`row.dataset.search.includes(query)`), the same technique already used by
the LOV sheet's own search box (§5.2's `filterLovOptions`). This matters
specifically because re-rendering the list on every keystroke would replace
the input element mid-type and drop focus/cursor position. Any dataspy or
mode-toggle change *does* fully re-render (rows genuinely changed), so the
current search query is re-applied immediately after that re-render rather
than lost.

**Costs is a deliberate variant, not a plain instance.** Its rows are
work-order cost breakdowns (`wo`, `type`, `status`, `material`, `labor`,
`tool`, `total`) rather than generic `title`/`sub`/`trailing`, and it adds
the `.cost-summary` aggregate footer (Total Material / Labor / Tool /
Overall Cost), recomputed from whichever rows the active dataspy currently
has in view. It still reuses the same `.ds-bar`/`.mode-tog`/`.res-row`
shell, the same dataspy-sheet mechanism, and the same search technique —
only the row template and the added footer differ. Any future tab that
aggregates a rolled-up total (not just Costs) should follow this same
"reuse the shell, swap the row template, add a footer if needed" approach
rather than a one-off build.

**Applied to:** `eam-equipment-record-view-prototype-v1.html`'s Events, PM
Schedules, Depreciation, Meters, Warranties, and Parts Associated tabs use
the shell directly; Costs uses the variant described above. Per-tab
Plus/Search visibility follows §8's content-driven rule, confirmed against
each tab's real base-EAM equivalent: Meters and Parts Associated show Plus
(both have a real insert-capable detail section in the base screen);
Events, Costs, PM Schedules, Depreciation, and Warranties do not. Structure
Details keeps its own tree content (§7.4) untouched — it's the one tab
that opts out of both Plus and Search, per the rule that a non-row-list
tab gets neither.

## 8.3 List Search Screen standard — card, list mode, filter, sort, dataspy bar

This is the single standard for every dataspy-scoped record list in the
app — WO List, WO Search (§6), and every child tab (§8.2's shell) all
render through it. No per-screen exception except §8.2's Costs variant
(its own row template + aggregate footer — a different *kind* of content,
an aggregation view, not a plain record list). A screen builder supplies a
dataspy; the card layout, list-mode columns, filter chips, sort options,
and dataspy-bar chrome all follow from that automatically — none of it is
Screen Designer's to choose. §6.5/§6.6/§6.7/§6.8's old WO-specific
versions of this content are retired — see §21.

### Card anatomy (Detailed mode)

Generalizes §6.5's original WO-card visual hierarchy (bold headline /
muted subline / supporting detail) so it works for any module's dataspy,
not just WO's.

**Field source.** Up to 6 fields, taken from the active dataspy's own
configured column order, first 6, as-is — not a separate curated
per-module list. Switching dataspy within the same screen/tab can change
which fields appear, since a different dataspy can expose a different
column set.

**Online this rule holds unconditionally, and that is now the normal case**
(revised 2026-09-08). The dataspy runs server-side at full fidelity (§6.13), so
the card draws its 6 from the **active** dataspy's own column order with no
column-set precondition of any kind. The declared `Indexed` set that used to
gate this went with the Tier 2 index (§21) — **there is no longer such a thing as
an "online-only dataspy,"** because every dataspy is served online.

**Offline the rule still holds, over a smaller row set.** The same 6 fields are
drawn the same way; what changes is *which rows* are there to filter — the work
set plus manually cached records — and the screen must **state that scope**
(§2.8 row 2). If the active dataspy's predicates cannot be evaluated against
what is on the device, it falls back to the default view rather than being
disabled — a `substituted` action in §2.9's vocabulary, never a blocked one.

Note the same 6 also drive the filter chips and sort options (§21), which is why
a static, non-configurable *card* projection was separately considered and
rejected. That rejection stands on its own merits and is unaffected by the index
being withdrawn.

**The Organization carve-out.** If Organization is present anywhere
within the dataspy's first 6 columns, it's pulled out of the normal 1–5
sequence and rendered instead as a small pill badge in the card's
top-right corner, next to the headline — mirroring the record view
header's own protected org pill (§9.3), but gray-recoloured (transparent
background, `var(--border-strong)` border, `var(--gray-4)` text) rather
than the header pill's literal white-on-dark colours, which go
white-on-white on a light card. The other 5 fields fill the body in
order, skipping Organization's position. If Organization isn't among the
first 6 columns, the card is just the plain body with no corner badge —
the common case.

**Fewer than 5 body fields populated → the card collapses to however
many are actually populated.** No fixed-height padding, no placeholder
dashes — a 3-field record just renders a shorter card than a 5-field one.

**Slot 1 — headline.** Bold, no label, top-left, up to 2 lines
(`-webkit-line-clamp:2`) before truncating. Plain bold text by default; if
the field's own EAM field metadata marks it status-type, it renders
instead as a pill — one of 3 fill/outline tiers (`.pill-green`/`.pill-red`/
`.pill-outline` in `eam-shared.css`, consumed by `renderStdCard()`/
`renderStdTable()`): green=operational/completed, red=down,
outline=standby/waiting, matching the header status pill's vocabulary
(§4.4.1) rather than a per-module hex table. Type-like fields never get
this pill treatment.

**Slot 2 — subline.** Muted, no label, directly under slot 1, single
line, ellipsis-truncated. Plain text always — Type isn't one of the 3
colour instruments (§23), so it never renders as coloured text here.
**WO List's own local `.ld-card-subline` deviates from "muted"** — it
renders in ink (`--text-body`) instead, since the same field (Description)
renders in ink everywhere else on that screen including List mode's table
cell. Not generalized to the shared `eam-shared.css` copy (Card
Standard/Equipment List still render slot 2 muted) — revisit if the same
complaint comes up on another screen.

**Slots 3–5 — stacked label:value rows.** Each reuses `.field-label` /
`.field-value` **exactly** — the identical 13px muted-label / 14px-500
dark-value convention every Standard Model form row already uses
elsewhere in record view (§5.2) — just without `.form-field`'s
tap/border/hover/min-height chrome, since these rows are read-only, not
editable. Plain text always now (see slot 2's note — the old "status/
type-like values render as coloured text" rule here is gone too) —
**pills only ever appear in slot 1 (or the corner org badge)**, never in
3–5; a pill reads as headline-weight, and no `.field-value` anywhere
else in the app carries pill styling.

**Dates — always plain `MM/DD/YYYY`, never relative or urgency-tinted,**
regardless of which slot a date field lands in. Deliberate: this card
must generalize across whatever date field a dataspy happens to expose,
and a screen builder should never have to write date-math/urgency logic
for a field they didn't hand-pick. This supersedes §6.8's old WO
due-date urgency treatment outright — see §21; a WO's due date is just
another date field now, rendered exactly like any other.

**Field-type detection** comes from the dataspy/column's own EAM field
metadata (its semantic type — status, date, lookup, text, number), not a
name-based heuristic — don't infer type by guessing at a column's label.

**Colour source for a status/type-like field** is a literal per-module
value→colour table, defined when a specific module's dataspy actually
needs one, not drawn from one shared generic palette. WO's own table is
§6.7 — it's the concrete instance of this rule for the WO module, not a
separate spec.

**No icons anywhere in the card** — colour alone carries meaning.

### List mode

Shows **every field available on the dataspy** — not the curated 6.
"Available" is tier-dependent, same tiering §6.13 locks for search, and
**simpler since 2026-09-08**: online — the normal case — that is every field
the dataspy defines, server-side, at full fidelity; offline it is whatever
is actually on the device for the work set and cached records, **with the
scope stated** (§2.8 row 2). The middle case this used to describe, a
declared ~10–20 column index projection wider than the card's 6, no longer
exists (§21). No new fetch mechanism either way — List mode just inherits
whatever search does. Horizontally scrollable table, header row with plain-text
column labels, same no-icon rule as the card — but the same colour
language carries over per column (a status column is still a solid
pill, a type/code column is still coloured text); dropping icons never
meant dropping colour.

### Mode toggle

A segmented `.mode-tog`/`.mode-btn` pill — **Detailed** (default) | **List**
— sits directly below the dataspy bar on every List Search Screen, not
just WO List's own; tapping List swaps the card list for the all-fields
table above. One toggle per module, living in the List screen's header
only — the Search screen has no toggle buttons of its own, it just reads
the same state, so switching mode on either screen affects both.
**Not yet promoted to `eam-shared.js`** — the `.mode-tog`/`.mode-btn` CSS
override (tighter spacing/shadow than `eam-shared.css`'s own plainer base
rule, shared with the Equipment Lookup popup's Search/Structure toggle,
§15.5) and the `setMode()`/`refS1()`/`refS2()` logic are still copied
verbatim per screen, same as the rest of this section's card/table
rendering; promote only once a 3rd consumer needs it. Confirmed real
consumers: `eam-wo-list-prototype-v5_1.html` (original) and
`eam-equipment-list-prototype-v1.html` (ported 2026-08-03 — this screen's
List/Search build had implemented every other piece of §8.3 since
2026-07-22 but never actually got this control; see §21's log).

### Filter chips & sort

Both are dataspy-driven off the same field list the card uses: exactly
those fields become the filter chip row and the sort-option list,
uniformly, no field-type exclusions — a free-text field gets a filter
chip too (contains-match, same mechanic the search box already does).
Replaces any screen's previously-fixed/hardcoded chip or sort list.

### Dataspy bar / selector sheet

- **No record count** in the bar or the selector sheet — one less number
  to keep accurate across tiers/offline state for marginal scanning
  value. (The *results* row's own count, §6.10/§8.2's `.res-row`, is a
  different thing — how many rows match the current filter/search — and
  is unaffected.)
- **Favorite.** Each row in the dataspy selector bottom sheet gets a
  star toggle; tapping favorites/unfavorites that dataspy. Favorited
  dataspies sort to the top of the sheet's list, above the rest (which
  keep their existing order). **Toast on add, added 2026-07-28**
  (`toggleFavDS()`/`toggleFavEquipDS()`) — "Added to your home screen."
  confirms the dataspy now has a Home Favorites chip (§24.2), since the
  star's own filled state is easy to miss inside a sheet that's about to
  close. Un-favoriting stays silent — removing something you just
  starred isn't a state worth announcing the same way.

### Filter-chip shapes — all three now real (locked 2026-08-11)

A dataspy's 6 chips aren't all code lists, and the two that aren't were
"coming soon" toasts on both list screens until now. There are exactly
three chip shapes, and every chip is one of them:

- **Code-list chip** — multi-select sheet with a search-within field
  (`openCS()`, per-screen). Already existed. Equipment List's **Category**
  was a toast purely by omission and is now one of these too; it was always
  a small fixed code list, like Class beside it.
- **Free-text chip** — `openTextFilter()`, shared. A single "contains"
  field, Clear in the header, Apply in the footer, Enter submits. Covers
  Description and WO number / Asset ID. Case-insensitive substring match,
  not a tokenizer — this is a filter, not a search engine.
- **Date-range chip** — `openDateRangeFilter()`, shared. Two bounds
  (From/To), either side optional for an open-ended range, and a backwards
  range silently swaps rather than returning nothing (a filter that
  returns zero rows for a plausible input reads as broken). Uses native
  date inputs, not this app's own calendar sheet (§3.4): a range needs
  both bounds visible at once, which the single-value sheet can't express.
  Carries the same accepted platform limitation as the Time field —
  mobile browsers style native date controls their own way.

**An active free-text or range chip shows its own value, not a count**
("Description: bearing hou…", truncated at 14 chars). `.chip-count` stays
exclusive to code-list chips, where a number genuinely means "n of m
options selected"; on a text filter a count would read as a selection it
isn't.

**Sort is real too** — `openSortSheet()`, shared: a radio-style field list
built from the same 6 dataspy fields the chips use, plus an
Ascending/Descending toggle on the standard `.mode-tog` control, and the
sort button's own label updates to the chosen field.

All three sheets **build their own markup on first use** and inject it into
`.app` (not `document.body` — `.bottom-sheet` is positioned against the app
frame). Three sheets across two screens would otherwise be six
near-identical markup blocks to keep in step, which is the hand-copying the
shared-component rule exists to prevent. This is a deliberate departure
from `openMultiDelete()`'s "screen supplies the markup" precedent (§16.10);
prefer self-injection for any new shared sheet with more than one consumer.

### Applied to

`eam-wo-list-prototype-v5_1.html` (both the WO List and Search screens —
replacing the old bespoke §6.5/§6.6 card/table, see §21),
`eam-equipment-list-prototype-v1.html` (its own List/Search screens — this
row previously never named it despite it implementing the same standard
since §24.1; fixed 2026-07-31), and
`eam-equipment-record-view-prototype-v1.html`'s Events/PM Schedules/
Depreciation/Meters/Warranties/Parts Associated tabs (Costs stays exempt,
per this section's scope note). Prototyped in isolation at
`eam-card-standard-prototype-v1.html`, an active standalone reference file
(not a throwaway).

## 8.4 Which surface a button belongs on — Action Row vs. header ellipsis

**Locked 2026-08-10 (direct instruction).** A general rule for placing any
base-EAM link/action button on mobile, not specific to one screen. It
replaces per-screen judgement calls, and the test comes from the base
product's own behavior:

- **If the button errors with "Record must be selected before performing
  this action" when nothing is selected, it is row-scoped** — it acts on
  one record in the grid. That makes it a candidate for the **Action Row**
  (§17.4/§18.3): tap the row, it expands in place and transacts through its
  own action button(s), no navigation.
- **Every other button is a header action** — the ones that, 9 times out of
  10, open a popup. These belong in the **vertical ellipsis at the top of
  the screen**, and they stay header actions **even when they live on a
  tab** rather than on the record's own header.

Consequences worth stating, because they're easy to get wrong:
- A tab's buttons are not automatically "tab actions." Being on a tab says
  nothing about scope; only the selection test above does.
- The ellipsis is therefore not just a leftovers drawer for Sort/View — it
  is the real home of a screen's header actions, listed above the
  list-level ones with a divider between.
- The **Plus** stays what §8 already says it is (Insert Mode for this child
  type) and is never used as a shortcut menu for header actions.

Worked example: the WO Equipment tab (§16.10). Its base screen's Actions
menu holds Add WO Header Equipment, Import Route Equipment, and Linear
Location Details. None of them requires a selected row, so all are header
actions and sit in that screen's ellipsis — not behind its Plus, which
opens the multi-select Equipment LOV instead. (Linear Location Details is
out of scope and excluded entirely.)

# 9. Standard Model — Insert Mode

There are two standards, not one — Insert Mode from a list/detail tab vs.
Insert Mode on a Record View. §9.1–§9.3 define the shell and field-content
rules; §9.6 is the current, real implementation (one shared function every
screen's Create action calls) — read §9.6 first for "how does this actually
work today," then §9.1–§9.3 for the underlying rules it implements.

## 9.1 Two standards

1. **Record View insert** — creating a brand-new top-level record (a new
   Equipment, a new WO). Per §5.1's already-locked "no Edit Mode" rule,
   this is the same Record View screen, just started empty — not a
   separate form.
2. **List/Detail insert** — creating a new child/related record scoped to
   whatever list/detail tab (§8) the Plus was tapped from (a new Event,
   a new Cost line, a new Meter reading). A lighter-weight form than a
   full Record View, since it's for a related record, not a top-level one.

Both standards share the same shell (below); only their field content
differs, and that content is future design work for each.

## 9.2 Shell (locked)

- **Trigger:** the Plus (+) in a List/Detail screen's header (§8).
  (The Record View standard's own trigger — e.g. from a list screen's own
  create affordance, §6.2 — is the same shell; entry point details TBD
  when that flow gets its full design pass.) Home's own Create action is a
  third trigger, resolved — see §9.4, its one variation on this shell.
- **Presentation:** a full-screen sheet that slides up from the bottom,
  covering the current screen — not the compact `.bottom-sheet` used for
  LOV/date/edit pickers elsewhere in this app (§3.4). Insert Mode is a full
  form, not a single-field value picker, so it gets the larger surface.
- **Header:** close `✕` top-left, simple **"Create"** label — no title
  customization per record type at this stage, no right-side element (no
  Clear — there's nothing to clear on an empty new record).
- **Footer:** a save pill button, bottom of screen — same pill-button
  language as the rest of the app (§14.5/§17.13), not yet assigned a
  specific ready/gating color since field content isn't designed.
- **After Save — Record View insert standard (§9.1 standard 1):** the
  system always navigates to the newly created record's own Record View
  screen, with the record open in Standard Update Mode (§5.1's ordinary
  Record View pattern — not a special "just created" state, not a
  standalone confirmation overlay, and never staying on whatever screen
  launched Insert Mode). Applies the same way regardless of entry point.
  **Open:** whether this also applies to the List/Detail insert standard
  (§9.1 standard 2) — a new child record (an Event, a Cost line) may not
  have its own dedicated Record View screen to land on. Default
  assumption until decided otherwise: this rule is Record-View-insert-only.
- **Dismiss:** tapping the `✕`, or **swiping down**, both close the sheet
  without saving. Swipe-to-dismiss is a new gesture for this app — nothing
  else uses it (existing sheets close via ✕/backdrop tap only) — introduced
  specifically for Insert Mode's full-screen presentation.

## 9.3 Field content — exact composition

Locks what actually fills the shell above. Loosely
referenced `prototypes/reference-screenshots/Insert Mode.png` (a generic
mobile issue-tracker "Create" screen) for overall shape only — connected
pills up top, fields below, comments/attachments further down — not copied
field-for-field; our own field set and container rules are below. This is
a **module-agnostic standard**, same as §8/§8.2: it's written to be
reused for every record type's Insert Mode, not re-derived screen by
screen. Top to bottom, same composition for both standards (Record View
insert and List/Detail insert) unless a row below says otherwise:

1. **Organization pill — Record View insert standard only.** Defaults to
   the current user's own org. Required and editable here, but never
   *shows* a required marker and never offers a Clear action — both are
   meaningless on a pill. **General pill rule, not Organization-specific:**
   a pill is required by nature (no such thing as an optional pill) and
   always system-defaulted (never truly empty, so nothing to clear) —
   applies to every pill, including Home's Screen/entity pill (§9.4).
   **A List/Detail insert omits the pill entirely** (not just
   non-required) — a child record scoped to an existing parent inherits
   the parent's org outright. Code only, no description (§3.4.1) — the
   LOV picker sheet still shows the description for selection clarity.
   Also appears on the Record View itself in update mode, always
   protected there (§5.2) — a separate case.
2. **Header fields box.** The same Type/Priority colour-badge component
   from §5.2. Which two fields populate it is a per-screen configuration
   (Screen Designer, §10/§13 — not modeled in any prototype); the generic
   default is Type + Status.
3. **No Summary field.**
4. **Description.** Uses this app's own long-text field pattern (§3.4).
5. **Remaining fields — one flat container, required-first ordering.** No
   per-group section-cards below Description — a single container holding
   every other visible field, required fields surfaced at the top.
   Precedence (which fields are required/visible, and their order) is
   established through Screen Designer (§10/§13) — not modeled in any
   prototype; this row documents the target behavior.
6. **Comments AND Documents.** Inline sections below the fields
   container, reusing the same component as Record View's own Comments/
   Documents (§7.2). Whether either appears is a per-screen decision, not
   a universal on/off.

## 9.4 Home-triggered Insert Mode — two-pill header

Home's Create action gains a second pill, chained in front of the
Organization pill (§9.3 point 1) — same `.org-pill` component reused for
both, connected by a small chevron:

**Screen/entity pill → Organization pill**

- The Screen/entity pill drives behavior, not just a value — selecting an
  entity re-scopes everything below it to that entity's own real Insert
  Mode content, reusing the exact code path as if Create had been
  triggered from that entity's own top-level list screen. It's a mode
  selector, not a captured value — which is why it's a pill, not a field.
- **Every Insert Mode entry point now gets this same two-pill shell** —
  see §9.6, which resolved the earlier single-pill-or-no-pill variant for
  entity-scoped entry points.
- **Open:** which entities populate the Screen/entity pill's option list —
  only whatever Create actions are pinned to Home's own quick-create row,
  or every top-level record type with an Insert Mode at all. Not resolved.
- **Open — non-WO/Equipment "system actions."** Noted 2026-07-28. The
  legacy Mobile menu (`docs/existing_use_cases/
  EAM.MOBILE.REQ.StandardModel.txt`) has several entry points that aren't
  full Record-View entities in this rebuild's sense — **Meter Reading**
  (`Replace Physical Meter`), **Work Request**, **Operator Checklist**, and
  potentially others from that same list (Batch Book Labor, Hours Worked,
  Permit to Work). Whether each becomes a real Screen/entity pill option
  (full Insert Mode content per §9.3/§9.5) or a lighter-weight action sheet
  (closer to §7's "log a Meter reading" quick-form aside than a full
  Record View insert) is not decided — needs its own pass per action, not
  a blanket answer. Ties directly into the previous open item: whichever
  shape these take, they compete for the same "what's on Home's
  quick-create row" slot. **Partial stub added 2026-07-28:** Meter Reading
  and Operator Checklist now render at the bottom of Home's entity-pill
  option list (`STUB_ENTITIES`, `eam-shared.js`) as coming-soon toast stubs
  — no real Insert Mode content behind either yet, and Work Request isn't
  in the list at all pending the shape decision above. Home-only by
  construction: WO List/Equipment List still lock the pill
  (`insertEntityLocked`), so the picker these render into never opens on
  those screens.
- **Base-admin configurability — ANSWERED 2026-09-16 (§30.16).** The admin
  screen this item could not name is the product's own **Digital Work Home
  Setup**, with a **Digital Work Home for User Groups** tab — documented all
  along in `docs/existing_use_cases/EAM.DUX.REQ.DigitalWorkHome.docx`. **Check
  that folder before designing an admin surface**; several of its rules could
  not have been guessed, including one silent failure (§30.17). The authoring
  surface is now built as the portal's **Home Layouts** area, and the set of
  quick actions is no longer hardcoded — an admin authors it as the contents of
  the pinned Create control.
- **Open — which entities populate the Screen/entity pill's option list.**
  **Narrowed by the above:** the list is *whatever create actions the admin
  pinned to this group's Home layout*, which is now an authorable fact rather
  than a choice between two hardcoded sets. What remains open is the shape of
  each **system action** — full Insert Mode vs. a lighter action sheet — which
  is the previous bullet and still needs a pass per action.

## 9.4.1 Home's Create icon — entity menu, not straight into Insert Mode

Added 2026-07-29, direct feedback. Tapping Home's Create icon used to
open Insert Mode straight away, defaulted to WO, with the Screen/entity
pill above as the one (editable) way to notice a wrong default and fix
it. Feedback: defaulting blindly and asking the technician to notice/
correct it after the fact was the actual problem, and neither obvious
fix was right either — Home's own colourful tiles (misleading, since
those mean "go look at a list," not "start a new record") or reusing the
LOV-shaped checkmark rows the pill's own picker already uses (a
persistent-selection shape for what's actually a one-time choice).

**New paradigm:** tapping Create opens a small `openCreateEntityMenu()`
sheet first — one-time action rows (`.source-option`, promoted from WO
Closing's attachment-source picker, §19.6 — icon + title, no checkmarks)
for each real entity in `ENTITY_META`, then the `STUB_ENTITIES` (Meter
Reading/Operator Checklist) below a "More" label, same coming-soon toast
either way. Reads the exact same `ENTITY_META`/`STUB_ENTITIES` array as
the pill's own picker (`openEntityPicker()`) — not a duplicate list.

**Picking a real entity now locks it** — `openCreateSheet(code)`, the
same call WO List/Equipment List's own Create already uses, so Home's
Screen/entity pill goes `.protected` (same as those 2 screens) once
Insert Mode opens, instead of staying the editable pill described in
§9.4 above. Deliberate: once the technician has picked deliberately from
a real chooser, a 2nd "tap here to change your mind" affordance on the
same screen is redundant ceremony, not a safety net — this is a real
behavior change from §9.4's original "Home's pill stays editable, WO
List's/Equipment List's stay locked" framing, flagged here rather than
silently narrowing that distinction. `onEntityPillTap()`/
`openEntityPicker()` are otherwise unchanged — still Insert Mode's own
pill-tap picker, unreachable now from Home specifically since its pill
is always locked after this menu, same as it always was for List/Search-
originated Creates.

## 9.4.2 Type joins the pill row; entity badge moves to the header

Added 2026-07-29, direct feedback. Insert Mode's header/pill area is
restructured again, on top of §9.4.1's entity-menu change:

- **Type moves from a grid badge row to a 2nd pill**, next to
  Organization: `[Organization] [Type]` — see §9.4.3 for the connector
  between them (added back one round later than this section originally
  said).
- **The Screen/entity pill moves into `.insert-mode-header`** (next to the
  ✕ close button/"Create" title), rendered as a small `.org-pill.protected`
  badge instead of a full pill in the body — every entry point now opens
  Insert Mode already locked to an entity (§9.4.1 for Home; WO List/
  Equipment List always were), so there is no live case left where this
  needs to be a tappable, editable control. `onEntityPillTap()`/
  `openEntityPicker()`/`selectEntity()` are unchanged but now effectively
  unreachable in normal use — left in place, not removed.
- **Equipment gains a real Type** (`ASSET`/`POSITION`/`SYSTEM`, default
  `ASSET`) — was `Class` (`PUMP`/`VALVE`/`COMPRESSOR`, default `PUMP`), a
  concept this rebuild never modeled as a real field elsewhere anyway.
  WO's Type is unchanged in substance (`CM`/`PM`/`BK`, default `CM`) —
  only `CM`'s pill text shortens to "Corrective" (was "Corrective
  Maintenance"), since a pill's width budget is much tighter than a grid
  cell's.
- **Status is now the grid's only field** (Description and, for WO,
  Equipment are the other 2, both already full-width) — marked
  `full-width` too, so it doesn't sit alone in a 2-column row with an
  empty cell beside it.
- **Switching Type re-renders the flat-fields section** with a different
  field set — the cheapest possible stand-in for a real Screen Designer
  layout varying by Type (§11-13's actual mechanism, for WO/Equipment
  Record View). Not one layout per Type code: just `'default'` (the
  entity's own default Type) vs. `'alt'` (every other Type shares the one
  alternate layout) — `ENTITY_FLAT_FIELDS[entity][variant]`,
  `eam-shared.js`. Obvious, cheap differences only (required-ness + which
  fields even appear), not a full invented field set per Type:
  - **WO alt** (Preventive/Breakdown): Problem Code drops to optional;
    Priority and Assigned To become required instead and move up front.
  - **Equipment alt** (Position/System — a structural node, not a
    physical asset): Manufacturer/Category/Cost Code are dropped
    entirely; PM WO Department becomes required instead of Criticality.
  - Both variants keep Department required — the one constant across
    every Type for both entities.

## 9.4.3 Header/pill polish pass

Added 2026-07-29, direct feedback, one round after §9.4.2:

- **"Create" is truly centered**, not just centered-in-whatever-space-
  is-left. It was `flex:1;text-align:center` between the ✕ button (fixed
  ~30px) and the entity badge (variable-width pill) — different widths on
  either side pulled the visual center off the header's true center now
  that the right side isn't a fixed spacer anymore. It's the anchor:
  `position:absolute;left:0;right:0` on a `position:relative` header, so
  it's dead-center regardless of either sibling's width.
- **Entity badge loses its icon** — text only (`fv-insertEntity-desc`),
  no `fv-insertEntity-icon` span at all. `selectEntity()`/
  `openCreateSheet()` no longer set one.
- **The chevron connector is back between Organization and Type** —
  §9.4.2 removed it same-session ("two independent choices, not a
  drill-down"); direct feedback the next round put it back (floating,
  disconnected pills read as unbalanced/askew). `.im-pill-connector` never
  left the CSS, just the markup between the 2 pills.
- **Organization and Type are held to the same overall pill height** —
  Type's own inner badge is sized down to 16×16 specifically inside a
  pill (`.org-pill .attr-badge`), not the 28×28 it gets in a grid cell,
  so it never grows taller than Organization's plain text+chevron.
- **WO's Type pill colour is the real curated palette** — the exact same
  `WO_TYPE_PALETTE` (§23.3) the step rail/WO List/WO Record View's own
  Type field all read, not Insert Mode's previously separate, colourless
  set. `ENTITY_FIELD_META.WO.typeOptions` now builds each entry via
  `woTypeBadgeMetaForCode()` directly — single source of truth. This
  round's own fill treatment (solid colour + white/black icon,
  `applyTypePillFill()`/`.org-pill.type-fill`) didn't survive the next
  round — see §9.4.4, which replaced it with white fill + colour-matched
  outline + dot instead of an icon.

## 9.4.4 Type pill settles: white fill, colour-matched outline, dot

Added 2026-07-29, direct feedback, after mocking up several outline/icon/
fill combinations for the Type pill. §9.4.3's solid-colour-fill treatment
is retired — mocking it up next to alternatives surfaced a real problem:
Corrective's own curated colour (`--wo-type-corrective`, a pale yellow)
read badly with white icon/text on it, one of exactly the failure modes
the mockup round existed to catch. Settled shape:

- **White fill always** (`--bg-card`), not a solid colour fill — this
  applies uniformly to both entities' Type pill now, replacing both the
  previous "colour fill for WO" and "plain black like Organization for
  Equipment" split. One rule, not two.
- **Outline colour-matched to the selected Type's real curated
  `WO_TYPE_PALETTE` colour.** No colour present (Equipment's Asset/
  Position/System has none) → **plain black outline** — the fallback
  rule, direct instruction. Same "omit rather than fake it" principle
  `.attr-badge:empty` already follows elsewhere in the app, applied here
  to the outline instead of an icon's presence.
- **A small solid colour dot replaces the icon entirely** — not a
  bespoke pill-only recipe, this is the exact same "Type shows a small
  solid colour dot ahead of its plain-text value" treatment WO List
  already uses (§8.3/§23.3). No colour present → no dot at all (not a
  black dot) — same fallback as the outline.
- `applyTypePillColor()` (`eam-shared.js`, renamed from
  `applyTypePillFill()`) sets 2 inline overrides — the pill's
  `border-color` and the dot's `background`/`display` — everything else
  (white fill, black fallback outline, hidden-by-default dot) is the CSS
  default (`.org-pill[data-field="insertType"]`, `eam-shared.css`), not
  JS-toggled.
- **`.attr-badge` (Insert Mode's shared icon-badge plumbing,
  `renderColorBadge()`/`selectLov()`) still writes into
  `#fv-insertType-badge` exactly as before** — that generic mechanism is
  shared across every screen that uses badge-style fields (e.g. Equipment
  Record View's Class), so it isn't special-cased for Type. It's just
  hidden (`.org-pill[data-field="insertType"] .attr-badge{display:none}`)
  now that the dot has taken over Type's actual visual — CSS-only fix,
  no JS branch needed, and nothing else that reads `BADGE_LOV_META`/
  `renderColorBadge()` had to change.

## 9.5 Field sets — working defaults until Screen Designer exists

WO and Equipment Record View inserts (§9.1 standard 1) are both real, end
to end — WO has 2 entry points (WO List's Create, Home's Create bar);
Equipment has 1 (Home's Create bar — no dedicated Equipment List Create
until §9.6). Field sets (§9.3 point 5), matching each entity's own real
Record View fields, not invented:

- Both entities: Header fields box = Type/Class + Status.
- **WO** flat container, required-first: Department, Problem Code
  (required) → Priority, Assigned To, Reported By, Date Reported
  (optional). Plus an Equipment reference field, rolled into the header
  fields box's own grid as its first full-width row (§15.5), required,
  unset by default, no auto-open.
- **Equipment** flat container, required-first: Department, Criticality
  (required) → Manufacturer, Category, PM WO Department, Assigned To,
  Cost Code (optional).
- Both include Comments + Documents, starting empty.

**Equipment reference field** is a shared component (`renderRefCard()`,
`eam-shared.css`/`.js`) keyed off a screen-provided `REF_CARD_FIELDS`
config — a compact card reusing the existing `openLov()`/`selectLov()`
sheet, deliberately **not** the full Equipment Lookup sheet's
Search+Structure tabs/QR scan (that stays local to WO Record View).

**After Save (§9.2):** `navigateToNewRecord(url, storageKey, record)`
(`eam-shared.js`) writes the built record to `sessionStorage` and
navigates to the plain record-view URL, no query string (this project's
dev server drops query strings on its clean-URL redirect). WO Record View
and Equipment Record View both check for that stored record on load,
consume it once, and build `RECORD` from it instead of hardcoded demo
data — same screen, same Standard Update Mode. Demo record numbers are a
simple incrementing counter (`eamNextWoNumber`/`eamNextEquipNumber` in
`localStorage`) — a stated demo simplification.

Equipment Record View's non-Record-View tabs (Events, PM Schedules,
Depreciation, Meters, Warranties, Parts Associated, Costs) render empty
for a freshly-created record — a 0-second-old asset has no history.

**A created record persists into the demo loop (locked 2026-08-11).** Save
used to hand the record forward for exactly one navigation and then lose it,
so a technician who created a WO watched it vanish from WO List — the app
looked like it had discarded their work. Created records now go to a shared
`localStorage` store (`eamCreatedRecords`, `createdRecordAdd()`/
`createdRecordFind()` in `eam-shared.js`) alongside the `sessionStorage`
hand-off, and:

- **WO List and Equipment List merge them in at load**
  (`mergeCreatedWos()`/`mergeCreatedEquipment()`), same pattern as the MEC
  children (§16.10). A created WO also stays visible in WO List's default
  dataspy — someone who just created one and lands back there expects to see
  it, whatever the dataspy's normal scope.
- **Re-opening one replays the hand-off it was born with**
  (`openCreatedWo()`/`openCreatedEquip()`) rather than adding a second
  rendering path. The Record Views already know how to render a
  handed-over record; a created record simply *is* one, permanently.
- Cleared by `resetDemoState()`, so a fresh demo starts with only the
  seeded records.

Two vocabulary mismatches this exposed, both real and both fixed on the list
side rather than papered over: Insert Mode's status codes
(`RELEASED`/`IN_PROGRESS`/`HOLD`) had no entry in WO List's own status map,
so a created WO rendered as "Waiting approval" — a status nobody picked; and
its priority codes (`LOW`…`CRITICAL`) are its own vocabulary, not the list's
1–5 scale, so they're mapped on merge. A third is **still open** — see §20.

## 9.6 One shared implementation across every entry point

Home's entity-aware build, WO List's own build, and Equipment List's
Create are now **one shared implementation**: `eam-shared.js`'s
`openCreateSheet(lockEntity)`, plus `ENTITY_META`/`ENTITY_FIELD_META`/
`ENTITY_FLAT_FIELDS`/`ENTITY_FLAT_LOV_DATA`/`renderEntityFields()`/
`renderFlatFields()`/`updateInsertSaveGate()`/`saveInsertRecord()`. Every
screen's `+`/Create action invokes this same function — there is no
per-screen version.

**Every Insert Mode entry point gets the identical two-pill shell**
(Screen/entity pill chained to the Organization pill, §9.4) — the only
thing that varies by entry point is whether the entity pill is
**editable** or **protected**:

- **Home's Create bar** — `openCreateSheet()`, no argument. Entity pill
  stays editable, defaults to Work Order.
- **A List/Search screen's own `+`** (WO List, Equipment List) —
  `openCreateSheet('WO')` / `openCreateSheet('EQUIP')`. The pill goes
  `.org-pill.protected` (chevron auto-hides) and is locked to that entity.
  Tapping it shows a toast ("Entity is fixed for this screen") instead of
  opening the entity picker — same "protected but tappable, toast
  explains why" convention as every other protected control (§15.4).

**Markup contract:** every consuming screen's `#insertModeSheet` carries
the identical shape — entity pill, Organization pill, Equipment reference
card, Type/Status badges, Description, a flat-fields mount
(`#insertFlatFieldsMount`, never hardcoded field markup per screen),
Comments, Save. Copy the shape verbatim from any real consumer for a
future 4th one — don't re-derive it.

Equipment List has no `REF_CARD_FIELDS.insertEquipment` entry (that field
is WO-only) — its `currentEntity` is set to `'EQUIP'` explicitly before
its own eager pre-render call, since the shared default (`'WO'`) would
otherwise try to render a WO-only reference card and throw.

## 9.7 Insert Mode grid — Description, Equipment, and flat fields

Insert Mode's grid/collapsible shape matches WO Record View's real screen
(§15.5), not just its own two-pill header:

- **Protected entity pill contrast:** `.org-pill.protected:not(.in-header)
  .field-value{color:var(--gray-4)}` (`--gray-3` dark) — the base
  `.org-pill .field-value{color:#fff}` rule is invisible on the protected
  variant's own light-gray background; every other `.protected` consumer
  is also `.in-header`, which already has its own correct override.
- **Description** is a full-width `.attr-item` at the top of `.equip-attrs`
  (the Field Grid Container), ahead of Equipment — same "Notes/Description
  always double-wide, always first" rule as §5.2 — and is required
  (validated in `updateInsertSaveGate()`/`saveInsertRecord()`).
- **Flat fields** are a real collapsible `.fg-section` (matches WO Record
  View's "Work order details" exactly), starting collapsed on every fresh
  open, title entity-aware (`ENTITY_FIELD_META[x].flatFieldsLabel`), with
  a working required-count badge even while collapsed.
- Equipment List's own (always-hidden, since Equipment entities have no
  equipment-reference field) Equipment card markup matches the same
  full-width `.attr-item` shape, for copy-paste consistency.

**Order flagged, not explicitly specified:** Description sits before
Equipment (both full-width, consecutive) since Description's
always-first rule was already locked independently; revisit if the
intended order was Equipment-then-Description.

## 9.8 Insert Mode renders the record's own screen design

Restated explicitly 2026-07-28 (direct instruction) — this was already
true in substance (§9.5: "matching each entity's own real Record View
fields, not invented"; §9.7: grid/collapsible shape matches WO Record
View), but hadn't been stated as the governing principle on its own:
**Insert Mode shows the same screen design the real Record View would
use for that entity/Type** — field set, grid vs. flat-container
placement, and required-ness all come from one config
(`ENTITY_FIELD_META`/`ENTITY_FLAT_FIELDS`, `eam-shared.js`), standing in
for what a real Screen Designer-authored page layout (§10) would define.
Insert Mode is a preview of that layout with nothing filled in yet, not
a separately-designed form.

**Required-ness, locked for the prototype:**
- **Every grid field is required** — both entities. WO: Description,
  Equipment, Type, Status (4 of 4). Equipment: Description, Class
  ("Type" relabeled), Status (3 of 3 — Equipment has no equipment-
  reference field to itself require).
- **Exactly 2 flat fields are required per entity** (§9.5's own "required-
  first" list, unchanged, now stated as a deliberate count rather than
  just "whichever ones happened to be required"): WO = Department +
  Problem Code; Equipment = Department + Criticality.
- This is a stated prototype simplification — a real customer's own
  Screen Designer config could require anything, or nothing. The point
  here is a rich-enough example to actually exercise the required-field
  UI, not a claim about real-world defaults.

**Description field stays "Free Text (inline)," even though required
(reaffirmed 2026-07-31).** Insert Mode's own Description field
(`insertDescription`) was briefly converted to the shared long-text
editor's popup, same move the Record View header's own Description made
(`openDescEditor()`, §5.3/§21 "Header Description — Inline Edit") — see
§21's "Required Fields — Popup-Only Editing" entry for why that was
reverted the same day. Back to a plain tap-in-place auto-grow textarea
like any other Free Text (inline) field, required or not.

**Required-field marker — Insert Mode is the one documented exception to
§21/§23's app-wide removal.** The red left-bar (`.form-field.required`/
`.attr-item.required::before`) and the collapsible section's
`.required-count-badge` were removed everywhere else 2026-07-28 because
every required field's own edit popup already blocks Clear on an
*existing* record, making the marker redundant. Insert Mode is a **blank
form** — nothing has a value yet, and Clear isn't even a relevant concept
until something's been entered — so that reasoning doesn't hold here.
Both markers still render, scoped to `#insertModeSheet` only
(`eam-shared.css`'s scoped `.form-field.required::before`/
`.attr-item.required::before` rule, and `updateRequiredBadges()`'s own
Insert-Mode-only counting branch, both `eam-shared.js`/`.css`). §9.7's
"working required-count badge even while collapsed" claim is this same
mechanism — it's accurate again after this exception, having been
briefly broken by the app-wide removal in between.

**Open / deferred — Type pill next to the Org pill.** Noted for a later
session, not scoped or built yet: add a 3rd pill to Insert Mode's
`.im-pill-row` (§9.4), a Type pill chained after the existing entity→
Organization pair, for both WO and Equipment. Selecting a Type there
would re-render Insert Mode's own grid/flat layout to match that Type's
own page layout — the same WOTYPE-driven per-field-layout mechanism
already resolved for real screens (`PLO_WOTYPE` column on
`R5PAGELAYOUT`, §11–§13) rendered live inside Insert Mode itself, not
just on the saved record afterward. `.org-pill`'s locked "never carries a
required marker" rule (§9.7-adjacent CSS comment) would need an explicit
call on whether a required Type pill breaks that lock or stays exempt
from it — not decided.

# 10. Screen Designer — Standalone (Base Screens)

Configures per-field layout for the standard model (which fields show,
which are required, their order, header-fields-box assignment — the
config knob every mobile field-precedence decision forward-references,
e.g. §9.3). Scope captured, not yet prototyped as a real admin screen
(`eam-screen-designer-v1.html` prototypes the emulator/mechanics — §11–§13
below layer WO-workflow configuration onto this same screen rather than a
separate one).

- Rendered as a **live mobile-device emulator inside the desktop/base
  app** — not an abstract field/property list or grid. The admin sees an
  actual mobile rendering of the screen being configured, live, as they
  configure it.
- **Configuration mechanics reuse standard base functions**: lookups,
  right-click to change field properties, drag-and-drop for field
  placement/ordering — not a bespoke config UI built just for this.
  Right-click field-attribute editing carries over unchanged from the base
  standard-model precedent — Optional / Required / Protected / Hidden plus
  set/clear default value, same as Digital Work's Screen Designer.
- **One surface covers both workflow-driven and non-workflow screens.**
  MVP scope: two record views — **Equipment** and **Work Order**. WO
  workflow configuration (§11–§13) is authored through this same screen
  (it gains a WO Type selector) — there is no separate admin surface for
  workflow-driven screens.
  - The Work Order record view configured here doubles as the **WO
    fallback screen**: if a technician opens a WO that doesn't match any
    configured WO workflow, this screen renders instead of the 5-step
    guided workflow.
- **Standalone WO fallback layout is a single universal config** — one
  Work Order record view, used as the fallback for every WO that doesn't
  match a workflow, not variable by WO type/department/etc.
- **Scope note on the Standard Model (§5–§9):** those sections' opening
  framing — "applies to every non-guided record type" — is amended here:
  Work Order, a workflow-driven record type, also uses the exact Standard
  Record View pattern in the fallback case above. The guided workflow
  (§14–§19) remains the default WO experience whenever a workflow matches.
- **Config scope: User Group**, matching the base-EAM precedent in
  `EAM.ADMN.REQ.ScreenDesignerforDigitalWork` (Digital Work's own Screen
  Designer). Copy-from-Group / Save-to-Group(s), the latter multi-select
  so one save can push a layout to several groups at once. The
  Available/Save-to dual-listbox supports three equivalent ways to move a
  group across: arrow buttons, drag-and-drop, or double-click.
- **§5.3 header fully locked out of Screen Designer** — the identity
  icon/number/description, status button, pin, and ellipsis are never
  configurable here (matching legacy Mobile's fixed List View key fields
  and Digital Work's non-designable Cancel/Save chrome). Only body fields
  below the header are in scope.
- **Mobile-only** — Screen Designer for this app configures mobile
  layout only; it does not also govern desktop layout.
- **List View is out of scope entirely** — driven by existing base
  dataspies, not configured field-by-field here (unlike legacy Mobile's
  on-device Screen Designer, which does have a dedicated List View
  sub-designer; the **standard model** for this app doesn't need one).
  Narrower, separate requirement instead: an option to configure the 4
  filter chips on the mobile Search screen (§6.11 — Type / Status /
  Department / Priority are today's hard-coded defaults). That config is
  scoped only to those 4 chip slots, not a general list/search designer.
- **Standalone surface navigation:** admin picks a base screen (e.g. Work
  Orders) → the emulator defaults to that record's Record View tab → a
  dropdown lets the admin switch to any of its child tabs (§8) instead,
  rendering that tab's layout for the selected Save-to-Group(s) in
  standalone mode.
- **Save behavior: explicit Save, not autosave** — Screen Designer follows
  the base EAM standard model for admin/config screens (explicit Save,
  same as Digital Work's Load/Save/Reset Layout buttons) rather than this
  app's own autosave-on-navigate rule (§5.1). The live mobile emulator is
  the only genuinely new mechanic here.
- **Grouping mechanic: "New Container," not card-splitting** — no
  equivalent to Digital Work's "New Card Yes/No" section-header flag.
  Instead, a **New Container** action creates a new, admin-named field
  grouping that fields get dragged into — maps directly onto the app's
  own Container/section-header pattern (§3.3.1).

# 11. WO Workflow — Setup (Base EAM Admin)

The gap: opening a WO never surfaced a workflow unique to that WO's own
Type — a distinct tab set/order and field layout/behavior for its Record
View and subsequent tabs, driven by WO Type. None of this customer's real
`R5FUNCTIONS`/`R5FUNCTIONTABS`/`R5TABPERMISSIONS`/`R5PAGELAYOUT` export
(`docs/Data_refs/Page Layouts perms/`) carries a WO Type dimension, so
nothing native does this today.

**REOPENED 2026-09-11 (user direction): "reuse `WSJOBS` and its clones" vs. "a
new standalone mobile function" is an OPEN DECISION, not a locked rule.** This
section read *"no new `FUN_CODE`s"* as locked from July 2026 until now. It is now
a decision required before the base track starts. §20 tracks it.

**What is still locked, and is orthogonal to the question:** function resolution
is **per user group** — any function with `FUN_RENTITY = EVNT` may be
workflow-enabled, opted in per group (§26.7). That holds whichever way
reuse-vs-new lands, because a *new* function would also be opted in per group.
Don't let the reopening take §26.7 with it.

**What is now open:** whether the mobile app rides the customer's existing `EVNT`
functions (`WSJOBS` plus the CCJOBS/TRJOBS/ZJ1000/WSJODC clones), or whether
mobile gets its own standalone function. The original argument for reuse was that
a function fork fragments the WO List dataspy mechanism (§6.3/§8.3) across
multiple functions' dataspy sets. That cost is real and unchanged — but it is now
weighed rather than treated as decisive.

**And there is a new input on the other side of the scale.** A **new Equipment
screen function that renders by equipment type is required** (user direction,
2026-09-11). Base models Equipment as four screens — Location / Asset / Position
/ System — and mobile collapses them into one surface that re-renders by system
type (§26.8). No existing function does that, so **Equipment needs a new function
regardless of how WO lands.** Two readings, and the decision has to pick one
deliberately:

- **Consistency:** if Equipment gets a new function anyway, a new WO function
  makes the two tracks symmetric, and the app owns its own screen definitions
  rather than inheriting four business processes' worth of labels and boilerplate
  (§26.7 guard rail 3).
- **Asymmetry is fine:** Equipment needs a new function because nothing existing
  renders by system type. WO does not have that problem — `WSJOBS` and its clones
  already *are* the WO business processes. Needing one does not imply needing both.

**The WO Type dimension is unaffected either way** — it is one new column
(§12/§13), never a function fork. That half of the original decision stands.

**Amended 2026-08-24 — this decision used to read "stay on one function,
`WSJOBS`, always — including as the fallback."** That phrasing conflated
two separate claims. **"No new `FUN_CODE`s" was the one this section actually
decided** — and it was itself reopened 2026-09-11 (above). **"One function" is
a separate matter, and was retired earlier:** any function
with `FUN_RENTITY = EVNT` may be workflow-enabled, opted in per user
group, because this customer already runs four such clones as distinct
business processes — and a single blessed function would cost them the
per-clone labels, boilerplate and field layouts those clones exist for.
Full analysis, including the rejected static-`WFJOBS` option and the
dataspy-fragmentation cost this decision originally cited in its own
defence, in §26.7.

**Existing tab-level access control is completely untouched.**
`R5FUNCTIONTABS`/`R5TABPERMISSIONS` continue to gate, per the logged-in
user's group, whether a tab can ever be seen/edited at all — a separate,
lower access-control layer this project doesn't touch. What's new below
is a layer on top: given a tab a user's group is already allowed to see,
which subset/order of tabs counts as "the workflow" for this WO's Type,
and how each tab's fields behave.

**The mechanism: extend Screen Designer (§10), don't build a new admin
screen.** Screen Designer already saves a field layout scoped to one or
more Groups (Copy-from-Group/Save-to-Group(s)). It gains one more
selector: **WO Type** (defaulting to "none" — the ungated fallback
behavior). Picking an actual WO Type + Group(s) lets the admin configure,
in that same authoring flow, the 2-tier model in §12, plus the field-level
layout of the Record View and each included step — the existing
`R5PAGELAYOUT` mechanism, extended with exactly one new column, `WOTYPE`,
alongside its existing `PLO_USERGROUP`.

**Correction, 2026-08-24 — `PLO_PAGENAME` is not always `WSJOBS`.** This
paragraph used to end "`PLO_PAGENAME` stays `WSJOBS` always — no new
pagenames," which over-reached and is contradicted by this customer's own
export: `docs/Data_refs/Page Layouts perms/r5pagelayout.csv` carries full
layout row sets for **`CCJOBS`** (Contract Jobs), **`TRJOBS`**
(Transportation WO's) and **`ZJ1000`**, each declaring
`PLO_PARENTPAGE = WSJOBS`. Cloning a base screen and configuring the copy
per user group is ordinary base-EAM practice, and it has already been done
here. What survives of the **decision** in this paragraph is the half about
layout: the WO Type dimension is still one new `PLO_WOTYPE` column rather than a
function fork. The other half — *"no new `FUN_CODE`s"* — was **reopened
2026-09-11** and is a decision required (above, and §20). What was wrong is the
weaker claim attached to it: that the app may treat the pagename as the
literal constant `WSJOBS`. It is a **resolved variable**, per user group.
§26 holds the resolution rule and the nav-slot binding that supplies it.

**Fallback rule.** A WO Type with no matching WO Workflow header row
(§12) renders the plain Standard Record View (§5–§9, no guided steps) and
is **always** Free Form — hardcoded, not configurable. The long tail of
WO Types nobody has explicitly configured must stay maximally flexible,
never accidentally locked down by an absent config row.

**Fallback still shows a rail and a bar — just not the gated/numbered
ones a configured workflow gets.**
- **Rail:** a flat, unordered, ungated list of all 5 WO-workflow steps (WO
  Record View, Activity Checklist, Issue Parts, Book Labor, WO Closing),
  no sequence numbers, same visual language as Equipment Record View's
  own tab rail (`renderTabRail()`) rather than the numbered/gated step
  rail (`renderStepRail()`). Every row is freely tappable in any order —
  `renderFlatStepRail()` (`eam-shared.js`), reusing the numbered rail's
  `#stepRail`/`#stepMap` shell. Tapping a row is a real cross-file
  navigation (`goToWoStep()`), carrying the demo WO's identity forward via
  the same `eamOpenDemoWo` consume-once flag WO List's `openWO()` uses.
  The segments row itself is hidden outright (`display:none`, revised
  2026-07-28, direct instruction) — it briefly showed a dashed divider
  (`.seg-flat-dash`, 2026-07-23) as a positive "no sequence" cue instead
  of rendering nothing, but that's now redundant: the WO Type circle
  badge in `.step-rail-right` (§23.3, built after this bullet was
  originally written) already signals "this is free-form" on its own,
  so a 2nd cue in the segments row just duplicated it.
- **Bottom bar:** stays real and working. WO Record View's bar reads
  "Start Work" exactly like a configured workflow's Step 1 (gated on "an
  activity is selected") and goes to Activity Checklist once tapped. Each
  subsequent screen's bar already said "Next: X" or "Close Work Order"
  unconditionally, carrying the fallback identity forward on each Next tap.
- **Not changed:** the Free Form flag's other effects (status field stays
  editable, no Not Free Form lock-icon/toast) — this is scoped to the
  rail/bar's visibility and shape only.

**A workflow cannot reuse the same step type more than once** (e.g. two
Issue Parts steps) — out of scope for initial release. Each of the 5 step
types appears at most once per workflow; a WO Type that genuinely needs
to revisit a step type mid-flow should use Free Form (§12) instead.

# 12. WO Workflow — 2-tier data shape

**Revised 2026-07-29** — originally modeled as 3 tiers, with status-source
(Completion Status Entity/Start Work Status/Completion Status) kept on
`WOTYPE` itself (WO Type alone, no User Group) on the theory that it was a
structural fact that shouldn't vary by viewer, separate from Free Form's
genuine per-viewer grain (WO Type × User Group). That's wrong: status
*authorization* in real EAM is already configured at the User Group level,
so status-source shares Free Form's exact grain and shares its row. Two
tiers, narrowest to broadest:

1. **WO Workflow header** (new — base EAM has nothing like it) — keyed
   **WO Type × User Group**. Holds:
   - **Free Form / Not Free Form flag** (Y/N) — §15.4's status-field-
     editability behavior. (Its step-rail colour effect is superseded —
     see §21; the rail no longer varies visually by this flag.)
   - **Completion Status Entity** — which entity's status domain this WO
     Type × User Group's workflow reads/writes: **Work Orders** (the
     `EVST` status domain) or **Activities** (the `AAST` status domain:
     Not Started/In Progress/Complete, not-yet-built Activity Screen §20).
   - `EVST` has a 4th value, **In Progress**, nested under the Released
     system status (§15.4's system-status colour rule — Work
     Request/Released/Closed — is unaffected; In Progress is a *user*
     status, not a 4th system status).
   - **Start Work Status** — a specific status value, drawn from whichever
     domain Completion Status Entity selects, set when Start Work is
     tapped on WO Record View. Defaults to In Progress for either entity;
     re-defaults whenever Completion Status Entity changes.
   - **Completion Status** — same shape as Start Work Status, for the
     status set when the workflow completes.
   - **Not a branch point for WO Closing's own field set** — WO Closing
     (Closing Codes/Downtime/Comments/Attachments) renders identically
     regardless of which entity is selected. If Completion Status Entity
     is Activities, the eventual real answer is likely a standalone
     Activities tab (§20, unbuilt) serving as that WO Type's closing
     surface instead of WO Closing — a future scoping option, not
     designed or built.
2. **WO Workflow Tabs** (new, child of #1) — keyed **WO Type × User Group
   × Tab**. **Renamed from "WO Workflow Steps" and given a Placement
   column 2026-08-25**, when §14.8's More group was reframed as
   admin-configured: a numbered step and an always-available "More" entry
   are the same kind of thing — a tab of the function — differing only in
   whether the workflow sequences it. Holds, per tab:
   - **Visible** (Y/N).
   - **Placement** — **`Step`** (numbered, sequenced, gated) or **`More`**
     (unsequenced, always reachable, never in the Next flow — §14.8).
   - **Sequence** (order) — `Step` only.
   - **Required** (§14.7-style bar-locking behavior) — `Step` only. A
     `More` tab cannot be Required; nothing routes the technician there,
     so the flag would be unenforceable (§14.8).
   - **Time Entry Mode** — Book Labor's own step-specific column
     (Start/End Time, the only mode built in any prototype, vs. Direct
     Hours Entry).

   **A tab here is not necessarily a delivered tab.** A User Defined Screen
   registered as a tab of the function takes a tier-2 row like any other,
   which is what lets a customer-authored screen be a gated, required
   numbered step (§27.1).

   **The key gained an `Instance` dimension 2026-09-08 — see §29.2.** The
   key is `(WO Type, User Group, Tab, Instance)`, so the same tab can be
   placed more than once and a second Record View can carry its own layout.
   Everything below still holds one grain finer: read "instance" for "tab".

   **One row per instance is the point, not an implementation detail.** It
   makes
   "an instance is either a step or a More entry, never both" a key constraint
   rather than a validation rule — which is what stops forward gating from
   being bypassable, since Book Labor is both a workflow step and a real WO
   tab (§14.8 rule 1). Rejected alternatives: a separate list of More tabs
   (allows a tab in both places, so gating needs its own explicit guard),
   and overloading `Sequence = null` to mean More (cheapest schema change,
   but a null carrying meaning is easy to misread later).

   The §11 fallback — a WO Type with no header row at all — takes its tab
   placement from the **function's own screen design** instead, which §10
   already establishes as the fallback screen. See §14.8's resolution
   order.

`WOTYPE` (the existing base table) is untouched by any of this — no new
columns land on it; WO Type is just the shared FK every row of both new
tables carries. Both are genuinely new entities, both composite-keyed
(natural keys, no surrogate ID), consistent with how `R5PAGELAYOUT`/
`R5FUNCTIONTABS`/`R5TABPERMISSIONS` already key themselves — #2's FK back
to #1 is the 2-column composite `(WO Type, User Group)`, not a single
column. Prototyped in `eam-screen-designer-v1.html` (`prototypes/
standalone/base screens/`) — the left pane's Free Form toggle, Completion
Status Entity/Start Work Status/Completion Status selects, and Book
Labor's step-row gear icon (Time Entry Mode) map 1:1 to tiers 1–2 above.

# 13. WO Workflow — Field Layout

**Extended again 2026-09-08 with a page-variant dimension (§29.2)**, so one
tab can hold two different layouts — the "Record View as a second step under a
different layout" requirement. Blank for instance 1, so every layout authored
before instances existed resolves unchanged and no migration is implied; it
inherits the same blank-key fallback cascade described below.

Per-field layout for the Record View and each included step is
`R5PAGELAYOUT` itself, extended with the new `WOTYPE` column from §11 —
`PLO_PAGENAME` stays `WSJOBS`; `PLO_USERGROUP` + the new `PLO_WOTYPE`
together select the right row set, falling back to the WOTYPE-blank/
default rows when no WO-Type-specific override exists for that field
(same fallback shape the table already uses across `PLO_USERGROUP` today).
Screen Designer's own UI (§10), with its new WO Type selector, is the only
authoring surface — no separate "Screen Designer tab" sub-surface, no
second emulator.

## 13.1 Conditional field rules — evaluation model

**Status: analysis only, added 2026-08-10. Nothing in §13.1–§13.4 is a
locked decision** — no table shape, column name, or tier is committed, and
none of it is built for FIELD state. It exists so the question "can this
foundation carry field-level conditions later" has a recorded answer instead
of being re-derived. Tracked as open in §20.

**ONE NARROW ENTRY WAS MADE 2026-09-16 (§30.19), and it is routing only.**
The condition fork reads a field and routes the flow; it changes no field's
state, adds no resolveFieldState() seam, and picks no tier for field
rules. It satisfies §13.3 item 4 by retracting nothing (a skipped step is
N/A and stays visible, §29.4) and it is client-evaluable by construction.
**Everything below still stands unbuilt** — do not read §30.19 as Tier 2
having been adopted. Two things it did settle for this section: §13.4's
verification is **paid** (see §30.19 — the customer's export carries no
condition-shaped column, and base's only such mechanism is unused
server-side SQL), and the prerequisite list in §13.3 is unchanged and still
owed.

The question: extend the WO-Type layout mechanism into genuinely dynamic
per-field behavior — *if field X is Y, make Z required; if X is Y, surface
another tab/step.*

**Why this is a different evaluation model, not a bigger table.** Every
configuration key in §11–§13 resolves **before the record renders**:
`R5PAGELAYOUT` on `PLO_PAGENAME` × `PLO_USERGROUP` × `PLO_WOTYPE`, the WO
Workflow header on WO Type × User Group, WO Workflow Tabs on WO Type ×
User Group × Tab. All three are functions of *who is looking* and *what
kind of record it is* — nothing in the key can change while the technician
is on the screen. That's why the whole thing is a pure lookup with a
blank-row fallback cascade, costs nothing at runtime, and is offline-safe
for free. A conditional rule moves a **mutable record value into the key**:
resolve-once becomes resolve-on-every-change, and layout stops being
configuration and becomes derived state. That shift, not the table design,
is the actual decision.

**The existing model is a sound base — don't redo it.** Three properties
already hold:

1. **The effect vocabulary is already correct.** Screen Designer's
   Required/Protected/Optional/Hidden/Not Available (§10) is exactly the
   output alphabet a rule needs. A rule should never invent new behavior —
   it flips a field from one already-declared state to another. Base layout
   = default state, rules = deltas over it.
2. **The fallback cascade already exists.** `R5PAGELAYOUT`'s blank-key
   fallback (§13) means a narrower key is additive — rows that don't
   specify the new dimension keep working unchanged.
3. **A dynamic-insertion precedent already exists and works.** Activity
   Checklist's follow-on item insertion (§16.5) *is* "field X is Y,
   therefore more work appears." Generalize that pattern rather than
   inventing a second one.

## 13.2 Conditional field rules — option ladder

Four tiers, escalating capability. Each names what base-product paradigm it
leans on, since aligning with base EAM rather than inventing an engine is
the constraint (§11's "extend Screen Designer, don't build a new admin
screen").

**Tier 1 — widen the composite key; no engine at all.** Add another
dimension to `R5PAGELAYOUT` alongside `PLO_WOTYPE` (Class, or Status),
declare a small closed set of *layout-driving fields*, and re-run the same
lookup when one changes. Base precedent is strong and already live in this
app: **Custom Fields are keyed Class + Organization** (§22) — record-value-
derived configuration resolved by lookup, no rule engine. Buys equality-on-
declared-key cases ("Breakdown + Electrical Class shows these fields").
Costs: row count multiplies per dimension, no operators (`>`, `is not
null`), realistically caps at 2–3 extra dimensions.

**Tier 2 — a declarative condition table.** The real answer for the stated
requirement. A new sibling table keyed the way the others key themselves
(natural composite, §12): `(Page, WO Type, User Group, Sequence)` →
`Trigger Field, Operator, Value, Target Kind, Target, Effect`. Evaluated
client-side on field change. Three constraints are what keep it
serializable, offline-evaluable, and comprehensible to whoever configures
it — they are the point of the tier, not incidental:

- predicates over **same-record fields only** — no cross-entity lookups, no
  SQL, no scripting;
- effects drawn **only** from the existing layout vocabulary (§13.1 item 1),
  plus tab `Visible`, which WO Workflow Tabs already carries as a column
  (§12 tier 2) — so "pop off another tab" needs no new concept;
- ordered by `Sequence`, single pass, no rule-triggering-rule cascades
  (termination and ordering stay trivially provable).

Authoring surface is Screen Designer — right-click a field → *Add
Condition*, alongside the existing Required/Protected/Optional/Hidden/Not
Available right-click menu (§10). No new admin screen, consistent with §11.

**Tier 3 — status-driven, server-authoritative.** When a condition depends
on data the device cannot see — approval limits, another user's action,
cost thresholds — it cannot live client-side at all. Base EAM already
supplies the paradigm: **status transitions authorized per User Group**,
which §12 already leans on for the header's status-source columns. Model
these as gates on *status change*, not on field edit, and let the server
own them. The rejection path already exists: sync trouble-field surfacing
(§4.4) is the right landing spot for a server-side rule refusing a record
that was accepted offline.

**Tier 4 — expression/script hooks.** The escape hatch base EAM provides
via add-ins/user exits. Record where it would plug in; don't build it. An
on-device interpreter breaks the "rules are data you can sync" property
that makes Tiers 1–2 safe offline.

## 13.3 Conditional field rules — prerequisites

Cheap now, expensive later. Items 1–2 are worth doing independent of
whether any tier is ever built — they are refactors of what already exists.

1. **Introduce a single resolution seam.** Today layout facts are read
   directly at each point of use — `ENTITY_FLAT_FIELDS[currentEntity]
   [currentTypeVariant()]` in `eam-shared.js`, and required/protected
   hardcoded inline across the record views. Every screen is its own
   consumer of the layout table. If all of them resolved through one
   `resolveFieldState(field, context)` — where `context` is a single named
   object (entity, Type, Class, Org, User Group, Status, **and the record's
   current values**) — then static → conditional is one function in one
   file. Without the seam it is a retrofit across every screen, and that
   cost is what kills the feature. **This, not the table design, is the
   real foundation question.**
2. **Separate *declared* state from *effective* state.** A field has a base
   state from layout and an effective state after rules, and both must stay
   distinct — otherwise you cannot revert cleanly when a trigger flips
   back, cannot explain to the technician why a field just became required,
   and risk writing rule output back as though it were configuration.
3. **Name which gate `Required` feeds.** There are three and they are not
   interchangeable: required-at-save, required-at-step-completion (WO
   Workflow Steps already has its own `Required` column driving §14.7's
   bar-locking), and required-at-status-change. "Make Z required" is
   ambiguous across all three; a rule row has to say which. Deciding late
   means re-keying the table.
4. **Field effects and step/tab effects are not the same mechanism.** Do
   not merge them. Flipping a field to Hidden is stateless and reversible —
   recompute freely. Flipping a step to hidden is a **data** problem: that
   step may already hold booked labor or issued parts, or already be
   marked complete, and un-hiding one the technician has passed has no
   defined meaning. Step-level rules should therefore **add** rather than
   retract — the shape §16.5's follow-on insertion already uses.
5. **Version the ruleset against the offline payload.** Pin a ruleset
   version to the downloaded record set and send it back on sync, so the
   server can flag a record validated against stale rules rather than
   silently accepting it. Consistent with §2's hydration model.

## 13.4 Conditional field rules — verification owed

Before committing to any table design: check `docs/Data_refs/Page Layouts
perms/` for condition-shaped columns already present in this customer's
real export. §11 established that nothing native carries a WO Type
dimension, but that audit did not ask whether base EAM ships a named
conditional-field-rules feature — worth confirming, so a Tier 2 table
extends the base product rather than duplicating something already in it.

## 13.5 Changing WO Type re-resolves the layout (2026-08-25)

Type is not an ordinary field. It is **the layout-resolution key**, so
editing it changes which fields appear, which are required, which tabs
exist, and which of those tabs are numbered steps versus "More" entries
(§14.8). No other field on the screen can rewrite the screen. That makes it
the one field that cannot follow §5.1's "tap it, change it, done" model
silently.

**Offline, the pickable Type set is bounded by what shipped** (added 2026-09-08).
Type is a `definition-gated` value under §2.8 row 3 — offline-selectable only if
the layout **and** the two WO Workflow rows for that Type are on the device.
Otherwise the confirm succeeds and the re-render has nothing to draw. §14.11
protects Type from Start Work onward, so this is a **pre-start-only** exposure —
but a real one. The rule lives in §2.8; this section just inherits it.

**Scope: this section is WO-only.** Equipment resolves its layout off system
type the same way (§26.8), but that field is **Protected in update mode,
always** — set once at insert and fixed for the record's lifetime — so
Equipment has no re-resolution exposure at all. Protecting the key after
insert is in fact the cleanest possible answer to everything below, and WO
**cannot** take it: re-typing a work order is a real business need (a work
request triaged into a breakdown, a job reclassified once the technician sees
the asset). WO therefore absorbs the complexity Equipment sidesteps by
construction.

### The interaction (locked)

1. **Confirm before anything commits.** Editing Type raises a confirm
   immediately: *"Changing the type may change the fields and tabs displayed
   on the screen. Do you want to proceed?"* Name the consequence, not just
   the risk — where the new layout is already resolvable, say what actually
   changes rather than that something might.
2. **On confirm: commit immediately, then re-resolve and re-render.** The
   type change **cannot be held pending.** Holding it would leave the screen
   rendering the *old* layout while the field shows the *new* type — the
   screen would be lying about which configuration governs it. Immediate
   commit is not a special case here; it is §5.1 applied honestly to a field
   whose value selects the renderer.
3. **On cancel: nothing happens.** No partial write, no re-render.

Under §2.4 the commit is a local write plus an outbox enqueue like any
other, so the re-render is instant and offline-safe.

### Rule: layout decides what is *displayed*, never what *exists*

**A type change never destroys work.** Issued parts, booked labor, completed
checklist items, comments, documents, meter readings — every recorded
transaction survives unconditionally. If the new layout has no tab for
something, the surface disappears and the data does not.

State it explicitly because the obvious implementation is a cascade delete,
and a technician who re-typed a WO and lost three hours of booked labor has
been failed in the exact way this app exists to prevent.

### Rule: recompute step state, do not migrate it

Steps are identified by tab (§12), so reconciliation is mechanical and needs
no migration logic:

- a tab that is a step in **both** shapes keeps its completion state;
- a tab that was a step and no longer is becomes **orphaned but recorded** —
  its data survives per the rule above, its step row disappears;
- a tab that is a step **only in the new** shape starts incomplete.

The visible consequence is worth anticipating: a WO one step from closing can
legitimately become mid-flow again. Changing PM → Breakdown adds Issue Parts,
which is then incomplete and, if the new workflow is Not Free Form, gating.
That is correct behaviour, not a bug — but it must be what the confirm
warned about.

### The gate: two states, not a ladder (locked, user direction 2026-08-25)

**WO Type is editable only while the WO has not been started.** Once Start
Work is tapped, Type is **Protected** (§5.2's field state) and cannot be
updated from mobile at any point after — in progress, complete, or closed.

| State | Type |
| --- | --- |
| **Not started** | **Editable.** Confirm → immediate commit → re-render, per the interaction above. |
| **Started, and everything after it** | **Protected.** No confirm, no tiers, no permission escape. |

Start Work is the boundary because it is already the moment the WO becomes
this technician's committed work — it also pins the record and hydrates its
children (§14.11). An earlier draft of this section proposed four escalating
gate tiers (plain confirm → naming confirm → enumerating confirm + reason/
permission → block on closed). **That ladder is superseded and deliberately
gone:** every tier past the first existed to manage consequences that
protecting at Start Work removes outright, and a ladder invites arguing about
which rung applies. A hard line needs no adjudication.

This also makes WO **converge on Equipment** (§26.8) rather than diverge from
it — same Protected field state, later trigger. Equipment protects at insert,
WO at start-of-work.

**The escape hatch is deliberately base-side.** Re-typing a started WO is a
base-EAM correction. The mitigation for "I started it and then noticed the
Type was wrong" is preventative, not corrective: the **Start Work confirm
surfaces the Type** so the technician sees what is about to be locked
(§14.11).

### Required-field drift — resolved by the same rule

An earlier draft raised this as an open problem: a re-type could leave the
record missing a value the new layout requires, with nobody having cleared
anything. **Two facts close it.**

First, **Type itself is never the missing field** — it is required and
cannot be cleared, in base or mobile, so it is never null to begin with.

Second, and generally: a re-type can now only happen **before Start Work**,
and **Start Work is itself a gate.** A WO whose layout requires a field it
has no value for simply cannot be started until that field is supplied.
That is ordinary required-field behaviour at a gate that already exists — no
new mechanism, no new marker, nothing to surface that the Start Work gate
does not already surface.

**Consequently the §23 tension that draft raised is withdrawn.** The
required-field-marker removal (§21/§23, direct instruction 2026-07-28) was
justified on the grounds that a required field's own editor blocks Clear, so
the marker "warned about a state that can't happen." That draft argued a
type change *was* that state. With re-typing confined to pre-start and
gated by Start Work, it isn't — the state is bounded and self-resolving.
**§23 stands as written; no re-opening needed.**

### Removing a tab that has data behind it — the residual case

The genuinely interesting question: what if the new type has **no Parts tab
and parts have already been issued?** Issued parts are not display state —
stock left the storeroom and cost landed on the WO. "Hidden but still
there" is an audit problem, not a UI one.

**Mostly this cannot happen, for a structural reason.** Issuing parts on
mobile is Step 3 of a workflow, unreachable without progressing through it,
which requires Start Work — and Start Work protects Type. **So parts cannot
be issued and *then* the type changed.** The same holds for booked labor and
completed checklist items: all of them are post-Start-Work by construction.

**The residual case is base-originated data on a not-yet-started WO** — a
planner issues parts or books labor in base, then the technician re-types it
on mobile before starting. Narrow, but real. Recommended rule, drawing the
line at whether the data *moved something*:

- **Transactional data — issued parts, booked labor: block the re-type.**
  These moved inventory or recorded cost and time. Leaving them with no
  surface on the record they belong to is not acceptable, and the WO's cost
  would include lines nothing on screen explains.
- **Non-transactional data — comments, documents, attachments: allow, and
  enumerate in the confirm.** Naming what will stop being visible is
  sufficient; nothing is misstated by hiding it.

Not locked — see §20. Note how cheap the check is in practice: it runs only
on a pre-start re-type, where a WO usually has no transactional children at
all, so it almost always passes silently.

### Relationship to workflow-config revisioning (§20)

These were framed as the same failure mode from opposite directions:
**revisioning** is the configuration moving under a stable record,
**re-typing** is the record moving to a different configuration, and both
end with recorded step state described by a shape that no longer applies.

**Protecting Type at Start Work separates them, and only revisioning is
still open.** A re-type can no longer reach a WO that has recorded step
state at all, because it cannot happen after Start Work — so it never
produces the orphaned-progress problem. Revisioning still can, since an
admin editing a live `(function, WO Type)` configuration does not care
whether a technician is mid-flow.

The two now *share a solution point* rather than a problem: §2.3's
recommended fix for revisioning — **stamp the resolved config version on the
WO at start-of-work** — lands at exactly the boundary this section just
established, which is why §14.11 lists it as step 5 of that boundary rather
than as separate machinery. One moment fixes the layout key, the config
version, the pin and the child data together.
# 14. WO Workflow — Runtime Shell

**Navigation & Guided Workflow**

## 14.1 Workflow engine

The admin configures a step sequence per WO type in the base module (§11–§13). The technician gets a linear guided experience through those steps.

| Step | Screen |
| --- | --- |
| **Step 1** | WO Record View — review details, select activity, start |
| **Step 2** | Activity Checklist — complete all required items |
| **Step 3** | Issue Parts — prompted after checklist (Yes/No prompt bar) |
| **Step 4** | Book Labor — log time against WO |
| **Step 5** | WO Closing — comments (required) + closing codes, downtime, attachments (optional) |

**Shared component.** The step rail (§14.2/§14.3) and the standard step
bar's chrome (§14.5) — background, pill, segments, timer pill, map, and
the expand/collapse toggle — live in `shared/eam-shared.css` +
`shared/eam-shared.js` (`initStepRail()`, wired via `initSharedApp()`).
Each screen still supplies its own step-name/timer-pill/step-map content
and its own bar-readiness logic (§14.7's rule differs per step) — only
the shell is shared. The Yes/No prompt bar (§14.6) stays screen-local —
one consumer so far.

## 14.2 Step rail (collapsed)

- Persistent at top of screen below nav — always visible.
- **Two rows:** Row 1 — current step name (`.step-name`, plain
  `flex:1;text-align:left`, same left-justified shape as `.tab-rail-name`
  for record tabs), timer pill (when this step has one) and the expand
  chevron both in `.step-rail-right`. Row 2 — a dedicated, full-width
  5-segment progress bar: done = green, active = ink (not a colour
  instrument, §23), future = gray.
- Step name is body-colour (black light / white dark) — not tinted.
- Timer pill: green while running (`var(--green)` dot+text — a live
  elapsed-time readout reads as "actively counting"), gray/no-pulse
  (`.timer-pill.stopped`) once stopped. Shows on Steps 2–3 (running);
  Book Labor (Step 4) shows the stopped time in its own banner instead
  (§18.7), not a rail pill; WO Record View and WO Closing (Steps 1, 5)
  never have a timer.
- Tap or pull to expand full step map.
- **No step-count pill ("2 of 5")** — the segment row and expanded step
  map already communicate progress; a numeric counter was redundant.
- **Surface: `var(--bg-card)` fill, floating pill/capsule** (added
  2026-07-28, picked from `step-rail-current-vs-pill-floating-card-
  options.html`'s Option 3 — supersedes the original flush full-bleed
  card; that style is preserved verbatim, by name, for an easy revert —
  see §21's **"Step/Tab Rail Shell — Flush Full-Bleed Card"** entry).
  `border-radius:28px` (half the collapsed row's own 56px height — a
  true capsule, not just a rounded rect), floated off the screen edge
  with `margin:10px 12px` (even top/bottom — 2026-07-28 follow-up: a
  bottom-only gap of 0 was invisible while collapsed at the top of the
  screen, but showed as a real gap once expanded or once scrolled
  content reached the pill's own bottom edge). **Design rationale:** this
  deliberately puts
  the rail's shape in line with the pill selector at the top of Insert
  Mode's own form (§9.4's entity pill) — both are now "a pill near the
  top of a form," not two unrelated shapes that happen to share a
  screen. Shadow is a soft elevation glow (`0 4px 14px` at low opacity,
  `--rail-glow-color`, defaulting to a neutral black/gray) that, on the
  step rail specifically, tints toward the current WO Type's own curated
  colour whenever a real configured workflow is showing (§23.3) — the
  Free Form fallback and Equipment RV's tab rail (no WO Type concept)
  both keep the plain neutral default. No persistent colour wash and no
  `.tab-rail-icon` leading glyph (redundant next to the tab's own name).
  Hover deepens the shadow slightly. Shared `.tab-rail, .step-rail`
  compound rule in `eam-shared.css` — one shell for both components.
- **Text: Inter 15px** — `.step-name`/`.tab-rail-name` and their expanded-
  map label equivalents (`.tab-map-label`/`.step-map-label`) all render at
  15px so the "current screen name" text doesn't visibly shrink between
  collapsed and expanded. `.nav-title` (the header's own screen name)
  matches at 15px too (§4.2).
- **Vertical centering, tightened 2026-07-28** — the collapsed row's own
  `align-items:center` was already geometrically correct, but `.step-name`/
  `.tab-rail-name`'s default line-height left extra invisible box space
  that read as slightly off against the fixed-size WO Type icon/chevron
  next to it. Both now set `line-height:1` + explicit `align-self:center`,
  matched by `align-self:center` on `.step-rail-right` and the WO Type
  icon/circle slots inside it — belt-and-suspenders on top of the
  inherited centering, not a replacement for it.

## 14.3 Step map (expanded)

- Vertical timeline — all steps visible.
- Done steps: green filled circle with checkmark. Active step: ink (black
  light / white dark) filled circle, highlighted row background (not
  colour-instrument purple — §23). Locked steps: gray bordered circle
  with step number.
- **Numbered rows never navigate** — each step is its own file, not an
  in-page tab, so jumping ahead isn't a same-page interaction the way it
  is for `.tab-rail`. For a Not Free Form (gated) workflow, tapping a
  non-active row is tappable as of 2026-07-29 to the extent of showing a
  toast explaining why it didn't go anywhere ("Locked — finish X first" /
  "Already completed — steps stay in a fixed order on this workflow") —
  fixes the dead-end silent no-op tapping one used to be. A Free Form
  configured workflow (e.g. PM) has no gating to explain, so its rows stay
  a true no-op, no onclick at all.
- **No footer note.** The map's final section is the "Reference" group
  (Comments, Documents, Equipment — §14.8/§23), which IS tappable and
  uses a plain icon instead of a numbered badge, unlike the steps above it.

## 14.4 WO identity block (collapsible)

- Sits between nav row and step rail
- Contains: WO number (monospace), WO description, type/priority/discipline ribbon chips
- Expanded by default on step 0
- Collapses automatically when Start is tapped; remains collapsed through Steps 2–5
- Tap handle at bottom to expand/collapse at any point in lifecycle
- Collapsed state shows WO number as one-line summary

**Bottom Bar — Progression Control**

## 14.5 Standard step bar (C-style inset pill)

- Persistent strip at bottom — always present, never scrolls away
- Neutral strip background (Gray 1 light / Black dark)
- Inset pill: locked state = white/dark bg, gray border, lock icon, descriptive label
- Inset pill: ready state = full green fill, white text, checkmark icon
- Meta counter right of pill (e.g. "3 / 6 done") — turns green when ready
- Tapping locked bar fires a toast: context-specific message per step

## 14.6 Prompt bar — Yes/No fork

- Replaces standard bar when a branching question is triggered (e.g. "Did you issue parts?")
- Structure: question label above, two pills below
- **Two standalone pills, not a joined segmented control** (changed
  2026-07-29, direct feedback) — was one segmented control with Yes
  green-filled; green read as "this is the pre-selected/correct answer"
  for what's a real, undecided fork, and the joined-segment shape implied
  the two outcomes were variants of one control rather than two separate
  choices. Applies to `.question-btn` (the centered 3-outcome Yes/No/
  Cancel modal used by the Stop-timer confirmation) too — same problem,
  same fix.
- **Solid black fill, white text in light mode** (2nd round, same day) —
  round 1 landed on outlined/transparent pills for the "no colour, no
  implied default" fix above; direct feedback moved them to a solid fill
  instead, same `.org-pill`/`.btn-contained` fill+flip convention used
  everywhere else in the app (dark mode flips to solid white/black text,
  not a translucent variant) — still no colour, still no asymmetry
  between the two, just filled instead of outlined.
- Full-width edge-to-edge row, each pill its own rounded shape with a real
  gap between them (not one outer border split by a divider)
- Yes routes to Issue Parts screen; No skips to Book Labor
- **No fork at all → no "Ready to continue" label, just a green "Continue
  to Book Labor" pill** (changed 2026-07-29, direct feedback) — a
  workflow with no Issue Parts step (PM) was showing a label + an
  outlined/filled pill matching the 2-way fork's own visual weight for
  what's actually a single, unambiguous next action. Reuses `.bar-pill
  bar-pill-ready` verbatim (the same green "ready" pill the bottom bar
  itself uses), not a bespoke recipe — green is fine here specifically
  because there's no 2nd option for it to imply a false preference over.

## 14.7 Bar locking rules per step

| Step | Rule |
| --- | --- |
| **Step 1 — WO Record View** | Locked until an activity is selected. Label: "Select an activity to start" |
| **Step 2 — Checklist** | Locked until all required items (*) have a response. Counter shows all-item progress. |
| **Step 3 — Issue Parts** | Auto-ready — no gate. Issuing parts is optional. |
| **Step 4 — Book Labor** | Auto-ready — no gate. |
| **Step 5 — WO Closing** | Locked until closing comments textarea has content. Label: "Add closing comments" |

**Stricter than the Standard Model default, deliberately:** the Standard
Model's own required-field rule (§5.2) is a warning + override, never a
hard block. This table is the WO Workflow's own addition on top of that —
the *step* (not the individual field) hard-gates progression until its
required items are satisfied. A required checklist item can still render
its field-level warning styling; the step bar is what actually stops the
technician from moving on.

## 14.7.1 Back button, Steps 2-5 — returns to WO Search, not the previous step

Added 2026-07-29, direct feedback. Previously each of the 4 post-Record-
View steps' top-left back button chained to the *previous* step's file
(Closing→Book Labor→Issue Parts→Checklist→Record View) — 4 near-identical
functions. Now every one of them returns straight to WO List/Search,
matching what Record View's own back button already did:

- **Once you're mid-workflow, back means "leave this WO," not "undo one
  step."** The back button is for exiting the record; the **step rail** is how
  you move between steps. That separation is the whole point, and it's why this
  decision survives §14.10 unchanged.
  **Superseded reasoning, corrected 2026-08-11:** this bullet used to justify
  itself with "the step rail already refuses to let you jump back into a done
  step — letting the physical back button quietly do that anyway was the actual
  bug." That is no longer true and was never the strongest argument: §14.10 now
  makes a completed step **always** navigable from the rail. The back button's
  behaviour is unaffected, but it stands on the separation-of-purpose reason
  above, not on the rail being restrictive.
- Applies uniformly to all 4 steps regardless of Free Form/Not Free Form
  or the §11 fallback — one simple rule, not conditional on workflow type.
- **If the WO's timer is running** (`eamTimerRunning` in sessionStorage),
  back asks first: "Pause the timer and return to WO Search?" — a plain
  2-button confirm (`openConfirm()`'s new `{primary:true}` neutral variant,
  §14.6's comment above — not the red `.confirm-danger` style, this isn't
  a destructive action). Confirming **pauses**, it does not stop/book time
  — `eamTimerRunning` stays true so the timer is still considered "in
  progress" if this WO is reopened later; declining leaves the technician
  on the current step untouched.
- Record View (Step 1) keeps its own separate, simpler `navBack()` — it
  already always went to WO List, and never has a timer running while on
  screen (Start Work hands off to Checklist immediately), so it never
  needed the confirmation.
- Implementation is one shared `navBack()` in `eam-shared.js` now, not 4
  screen-local copies.

## 14.8 The "More" group — non-sequenced tabs, reachable from any step

**Renamed and reframed 2026-08-25** (was "Reference — Comments &
Documents, reachable from any step, always"; see §21 for the old name and
its revert recipe). The mechanism below is unchanged — what changed is
that **membership is configuration, not definition.** Comments and
Documents are the obvious defaults, not what the group *is*.

**What the group is.** A place the admin can put **specific tabs of the WO
that the technician may open at any point in the workflow**, regardless of
whether that workflow is Free Form or Not Free Form. They are **not in the
Next-button flow** — nothing ever routes the technician into one, so
entering one is always a deliberate manual act via this group. The admin
sets membership in the workflow definition / screen design (§10, §12).

**Mechanism: the step rail's own expanded map, via a "More" group always
pinned after the last numbered step** (§14.3). A numbered done/active/
locked badge is what implies sequence membership, not a row's mere
presence in the map — giving these rows a plain icon instead of a numbered
badge removes that implication, and being inside the same already-familiar
expand/collapse control is more discoverable than a buried ellipsis entry
(the superseded mechanism — see §21). Not gated by `.rail-not-free-form`
at all, by construction. A row that *is* a real screen marks itself active
in the rail via `activeRef` (§16.10).

**Why not "Reference".** Everything in the group is **editable** — you add
a comment, attach a document, insert and delete equipment rows — so
"Reference" claimed a read-only-ness that was never true. The claim gets
worse precisely as membership widens, which is the point of the group
being configurable: the moment an admin places a Permits or Safety tab
here, something you sign is filed under "Reference." "More" describes an
overflow of destinations and promises nothing about their contents.

### Two rules, both structural rather than validated

1. **A tab is either a numbered step or a More entry — never both.** §12
   stores one row per tab carrying a **Placement**, so this is a key
   constraint, not a check somebody has to remember to write. It matters
   concretely: **Book Labor is a workflow step *and* a real WO tab**, so
   were it allowed in both places, forward gating (§14.10) would be
   bypassed in two taps — open it from More while step 4 is still locked.
   *A read-only variant of a step-tab, openable out of sequence, is a
   deliberate non-goal — no read-only field mode exists anywhere in this
   app (§5.1), so it would be a new concept, not a configuration.*
2. **A More tab can never be Required.** Nothing routes the technician
   there, so a required-but-unsequenced tab is unenforceable — the flag
   would describe an intention, not a behavior. If it genuinely must
   happen, it is a step. This keeps §12's Required column meaningful.

### Resolution — where membership comes from

Two levels, narrowest first:
1. **A configured workflow** — the tier-2 rows for this `WO Type × User
   Group` (§12) decide each tab's Placement, so the More group is exactly
   the `Placement = More` subset.
2. **No configured workflow** (the §11 fallback) — **the function's own
   screen design decides.** This is not a new surface: §10 already locks
   that the Work Order record view configured in Screen Designer "doubles
   as the WO fallback screen," so tab placement rides along with the
   layout it already authors. One authoring surface, no separate default
   list to keep in sync.

Consequence worth naming: placement therefore exists at **two grains** —
a function-level default on the screen design, and a `WO Type × User
Group` override when a workflow header row exists. That mirrors how §13/
§9.8 already resolve field layout, so it introduces no new resolution
concept, but it does mean the fallback rail's More group can differ from
a configured workflow's on the same function.

### Candidate set and authoring
- **Candidates are the function's own tabs, filtered to what the target
  user group is permitted** (`R5FUNCTIONTABS`/`R5TABPERMISSIONS`). This is
  the same check §26.7's workflow-eligibility validation already needs —
  one check, not two. **A User Defined Screen registered as a tab of the
  function enters this candidate set by construction** — which is why UDS
  needs no new placement model and can be a numbered step (§27.1).
- **Authored in Screen Designer**, per §10's one-surface rule. **User
  Group Setup does not author it** — that screen assigns a `(function, WO
  Type)` configuration to groups and never edits steps, gating or layout
  (§26.5.1); More placement is part of the configuration it assigns.
- **Order is admin-set.** No hard cap; the expanded step map has more room
  than the bottom nav's four slots (§26.4), but a long list defeats the
  purpose of a short always-available shortcut group.
- **Open: which icon a configured tab gets.** Today's three are hardcoded
  (`WO_MORE_TAB_ICONS`). This is the *same* unresolved question §26.3 has
  for bottom-nav slot icons — whether the curated set is authored anywhere
  or hardcoded. Solve once for both.

### Implementation
`WO_MORE_TABS` in `eam-shared.js` is the config stand-in — a data-driven
array (key/label/icon/open) rendered by `stepMapMoreGroupHtml()` and
dispatched through `openWoMoreTab()`, replacing the previously hardcoded
three rows. Today's members: **Comments** and **Documents** (both to
`eam-wo-reference-tab-prototype-v1.html` via `goToWoReferenceTab()`, §7.2)
and **Equipment** (the real WO Equipment tab, §16.10). *The destination
file's own name still says "reference" — stale, tracked in §20.*

**Stale, not yet cleaned up:** Activity Checklist, Issue Parts, and Book
Labor still carry a Comments(3)/Documents(4) ellipsis-menu entry from the
superseded mechanism (toast stubs). Tracked in §20.

## 14.9 Step timer panel (expanded) + Stop confirmation

See `eam-shared.css`/`.js` for `.step-timer-panel` / `startStepTimer()` /
`toggleStepTimerPause()` / `openQuestion()`.

- A larger timer readout + Pause/Stop pill buttons, sitting as the first
  child of the expanded `.step-map` — above the step list, directly under
  the still-visible collapsed title row.
- **Shown only where the collapsed rail's timer pill is RUNNING** — same
  condition as §14.2's timer pill, extended to its expanded form.
  Currently Activity Checklist and Issue Parts only.
- **Pause** stops the timer counting and swaps its icon/label to Resume.
  **Resume** starts it counting again from where it left off.
- **Stop** opens the question message (below): "Stop working and book
  your current time?" — Yes: stop the timer, toast-simulated navigation
  to Book Labor (real cross-screen navigation for this flow isn't built).
  No: stop the timer but stay on the current step; the time is captured
  and can be booked later. Applies regardless of Free Form/Not Free Form
  (§15.4). Cancel: keep working, timer keeps running, dialog closes.
- **Not yet wired:** passing the actual stopped timer value into Book
  Labor's Timer Stopped banner (§18.1/§18.2), and routing back to the
  step the technician was on when they invoked Stop. Needs real
  cross-screen state that doesn't exist yet.

**Question message (Yes/No/Cancel)** — distinct from the 2-button
confirm modal (§3.4, Cancel + Delete-style destructive actions): for
questions with a genuine 3-way answer. Same centered-modal backdrop, but
3 stacked full-width buttons (not side-by-side) — Yes (green, primary),
No (neutral outlined), Cancel (plain text) — decreasing visual weight top
to bottom. Own overlay (`#questionOverlay`), separate from
`#confirmOverlay`. `openQuestion(message, onYes, onNo)` — Cancel never
needs a callback. Available for any future screen needing a real 3-way
confirmation.

## 14.10 A completed step is always navigable — gating is forward-only

**Locked 2026-08-11, direct instruction.** The rule, stated plainly:

> A technician can **always** navigate back to a step they have already
> completed, in order to update or change it. **"Not Free Form" dictates the
> order of moving *forward*, not backward.**

This is a rule change, not a clarification — it reverses how the step rail
behaved. Previously, tapping a completed (✓) step:

- on a **Not Free Form** workflow, produced the toast *"Already completed —
  steps stay in a fixed order on this workflow"* — which conflated forward
  sequence with backward immutability. Those are different things, and only
  the first is what a gated workflow is for.
- on a **Free Form but configured** workflow (PM), did nothing at all — no
  handler, a silent dead end, which was arguably worse because it gave no
  signal either way.

**Why the old behaviour was wrong, not just strict:** a technician who
mistypes a meter reading, books hours against the wrong day, or realises they
need one more part after moving on has to be able to return to that step and
correct it. With no way back, the only remaining options are abandoning the WO
or leaving bad data in the system of record. No real workflow configuration
intends that — the gate exists so work isn't done *out of order*, not so
mistakes become permanent.

**What is unchanged:** forward gating. A step past the WO's current position
stays locked and still explains itself (*"Locked — finish `<step>` first"*).
The §11 fallback (no configured workflow) was already fully free-flow and is
untouched. The current step remains a non-link on a step screen — it's the
screen you're on — but stays navigable from a Reference destination (§16.10),
where the rail is the only way back into the flow.

**Affordance matters here.** A completed row now carries a trailing chevron
(`.step-map-back`). `cursor:pointer` communicates nothing on a touch device, so
without a visible cue the capability would exist and go undiscovered — which
for a corrective action is nearly as bad as not having it. The chevron is
deliberately on completed rows only: the current row is where you already are,
and a locked row must not look like it leads anywhere.

Implemented in the shared `renderStepRail()` (`eam-shared.js`), so it applies
to every workflow screen at once rather than per-screen. Regression-tested in
`.claude/skills/verify/scripts/tests/test-step-rail-back-nav.js`, which also
asserts that forward gating survives.

## 14.11 Start Work is the commitment boundary (locked, user direction 2026-08-25)

Start Work was previously documented only in pieces — a status value in
§12, a protected-when-complete rule in §15.2, timer behaviour in §15.4. It
is actually the single most consequential moment in the WO lifecycle, and
this section names it, because **four things happen at once and they only
make sense together.**

Tapping Start Work:

1. **Sets the status** to the WO Workflow header's **Start Work Status**,
   in whichever domain Completion Status Entity selects (§12 tier 1).
2. **Protects WO Type.** From this point the record's layout is fixed —
   see §13.5.
3. **Pins the WO to the technician** — `pinned = 1`, Tier 1 membership
   (§2.6).
4. **Hydrates all child records** — activities, checklist items, parts
   lines, labor, equipment, comments, documents.
5. **Recommended, not yet locked:** stamps the **resolved config version**
   on the WO, which is §2.3's answer to workflow-config revisioning (§20).
   Start Work is already the moment things get fixed, so this belongs here
   rather than as a separate mechanism.

The unifying idea: **before Start Work a WO is a candidate; after it, it is
this technician's committed work.** Everything above follows from that one
sentence, which is why they belong in one boundary rather than five
independent rules.

### Why protecting Type here is the right line (§13.5)

Type is the layout-resolution key, so re-typing a started WO is what
produces every hard problem in §13.5 — orphaned completed steps, recorded
transactions with no surface, required-field drift on a record already in
flight. Protecting at Start Work removes all of them by construction rather
than managing them, and it makes WO **converge on Equipment's model**
(§26.8) instead of diverging from it: the same §5.2 **Protected** field
state, just a later trigger. Equipment protects at insert; WO protects at
start-of-work. One paradigm, two trigger points.

### The Start Work confirm is the last chance to check Type

Because the boundary is irreversible from mobile, **the Start Work
confirmation should surface the WO's Type** so the technician sees what is
about to be locked. This costs nothing — the confirm already exists — and
it converts an irreversible boundary into an *informed* one. Without it,
"I started it and then noticed the Type was wrong" ends in a base-EAM
correction, which is a real cost to accept knowingly rather than discover.

### Starting a WO that is not already on the punch list

This is the case nothing previously covered, and the boundary explains it
cleanly. A technician can reach a WO by **search** that was never in their
work set — a server-search result, or a record they manually cached (§2.6/§2.7).
Start Work on that WO is exactly a **promotion into Tier 1**, and it fits the
existing rule that tiers "move up only via user intent" with nothing new
added: **Start Work *is* that intent.** Pinning plus child hydration —
and, since 2026-09-03, the **full traversal** of §2.3 — is the promotion.

**Sharper under §2.1's online-first polarity** (noted 2026-09-08): a WO reached
by search is now, by construction, a record fetched **while connected**. So the
"promote it" path is the ordinary one rather than an edge case, and the
connectivity consequence below is not a surprise — it is visible in the fact
that the technician just used the network to find the record.

For a WO already on the punch list, Tier 1 membership has already hydrated
its children, so steps 3–4 are a no-op or a top-up rather than new work.

**Consequence that needs a decision: starting a non-hydrated WO requires
connectivity.** Its children do not exist locally yet, and a workflow whose
checklist and parts lines are missing is not startable in any useful sense.
Recommendation: require connectivity for this case and **say so plainly**
rather than half-starting the WO and discovering the gap at step 2. Not yet
designed — see §20.

### Consequence for the punch list: a device-originated pin

§2.6 states the device-side contract as "a WO-ID membership list arrives at
sync time and stamps `pinned = 1`" — i.e. **pinning is computed
server-side.** Start Work pins **from the device**, which is the first thing
in this design that pins in the other direction. Two rules follow:

- **Locally:** set `pinned = 1` immediately (optimistic, §2.4) so eviction
  cannot touch the WO, and enqueue the pin through the outbox like any other
  write.
- **On the next delta pull:** a **locally-originated pin must survive a
  server membership list that omits it**, at least until the WO closes.
  Otherwise the next sync un-pins a WO the technician is actively working —
  a silent eviction of exactly the record §2.5 promises can never be lost.

**This is real evidence for punch-list Option B** (§2.6), and it was not on
the table when those options were framed. Option B's `R5PINS` projection
already models an originating manual/EXEC pin, so "started by this user"
lands naturally with provenance. Option A would need the sync dataspy's SQL
to include "WOs I have started" — which is precisely the assignment logic
Option A re-derives per customer, on the one case where getting it wrong
evicts live work.
# 15. WO Workflow — Step 1: WO Record View

## 15.1 Screen sections (top to bottom)

- Work order details — asset, location, assigned to, reported by, est. duration, created.
  Collapsible (`.rv-section`/`.rv-toggle-row`/`.rv-collapse`, same shell as
  Activities/Comments/Documents below), collapsed by default.
- Notes — renamed from "Description". Free text field from WO record.
- Activities — expanded by default, single-select radio list. Locks bar until selection made.
- Comments — collapsed by default with count badge. Inline expand shows threaded comments.
- Documents — collapsed by default with count badge. Inline expand shows file list.

## 15.2 Activity selector

- Single select — one activity at a time. Drives all downstream steps.
- Selected activity determines: task plan checklist, planned parts, labor to book against
- Radio button fills purple on selection
- If no activities exist: show + Add Activity affordance
- **Default selection at load:** if exactly one activity exists, it's
  auto-selected — nothing else to choose between. If more than one
  exists, none is selected by default; the technician must explicitly
  choose (`ACTIVITIES.length`-driven, not hardcoded).
- Bottom bar stays locked (protected, §5.2) until an activity is
  selected — starts locked whenever a WO has more than one activity,
  ready when it has exactly one.
- **Start Work is protected when the selected activity is complete** —
  same "still tappable, explains itself" protected language as the
  header status button (§15.4): the bar reads "Activity is completed"
  and tapping it toasts instead of starting the workflow. Selecting an
  incomplete activity clears this back to the ordinary ready state.
- **Edit button — non-standard, unique to this section.** A pencil icon
  in the toggle row's right side opens a dedicated full-screen edit
  popup (§15.3's hyperlinked-popup shell) for whichever activity is
  currently *selected* — not a per-row action. Tapping it with nothing
  selected toasts "Select an activity to edit." Name and Discipline are
  editable there; Date/Code 1/Code 2 stay protected/read-only.
- **No confirmation toast on select** (removed 2026-07-29, direct
  feedback) — selecting an activity is already visually obvious (radio
  fill, selected-row background/left-bar); a toast on top of that was
  noise, not new information.
- **Protected when the WO is Closed/Completed** (added 2026-07-29, direct
  feedback) — same `CLOSED_STATUS_CODES`/`applyClosedFieldProtection()`
  sweep that already protects the header's Type/Priority/Equipment and
  flat fields (§20). Tapping a row toasts the same "WO is closed —
  fields are protected until reopened" message instead of changing the
  selection; rows dim (`.act-item.protected`, same `.protected` opacity
  every other locked field/row uses) so it reads as locked, not just
  unresponsive. `renderActivitiesListHTML()` computes this itself (not a
  separate DOM pass) so a later re-render — adding or editing an activity
  — can't accidentally drop the protection while the WO stays closed.
- **Completed state.** An activity is "complete" when its own Completed
  checkbox is checked, OR its assignment status is at system status 'C'
  (`ACTIVITY_STATUS_OPTIONS`' `COMP`/"Completed") — either is sufficient
  (`isActivityComplete()`). Treatment: exactly 2 fields — the big
  Activity # (`.act-num-big`) and the Notes line (`.act-name`) — get a
  plain `text-decoration: line-through`, otherwise pixel-identical to
  the non-completed state. Everything else in the row, including the
  whole Trade/Start Date grid, is untouched. The row stays fully
  selectable either way — reopening a completed activity via Edit is how
  Completed gets unchecked again.
- **Completed checkbox** lives in the Header Fields grid, paired with
  Assignment Status in the same grid row (a plain `.attr-item` cell using
  the same `.field-checkbox`/`toggleCheckbox()` component every other
  checkbox in this popup uses) — not a standalone `.form-field` row.
  Populated by the same `populateActivityPopup()` routine both Insert and
  Update mode share, so it reads correctly regardless of how the
  activity's `completed` flag got set, including by WO Closing (§19.7).

## 15.3 Collapsible sections

- Comments/Documents use the standard toggle row pattern: left icon +
  title, right gray count badge + chevron. Chevron rotates 180° when open.
- **Activities is the exception** — no left icon, no count badge (the
  list itself already conveys availability). Right side instead holds
  the Edit button (§15.2) and a 34px Plus icon ahead of the chevron.

## 15.4 Status field — Free Form workflow behavior

The status-forefront header (§5, "Header rev. 2") is the standard
treatment for every Standard Record View — status is the field a
technician updates most often, so it gets the largest, most obvious
control on the screen: a big solid-colour button, not a subtle inline
badge, with code+description shown small above it. Whether it's actually
*editable* from the WO Record View depends on a flag on the related **WO
Workflow Setup** record (reference-data configuration, not yet
modeled/built — flagged here as a forward dependency so it isn't lost):

| WO Workflow flag | Record View | WO Closing |
| --- | --- | --- |
| **Free Form** | Status header is live/editable, same control as Equipment | Same Option D status control (§19.2), unprotected — big tappable button |
| **Not Free Form** | Status keeps its real fill colour and stays tappable; chevron swaps to a lock icon. Tapping shows a toast ("Status is determined by workflow. Cannot be updated.") instead of opening the status picker. | Same Option D status control (§19.2), same treatment — fill colour unchanged, lock icon in place of the chevron, tap shows the same toast instead of opening the picker |

**Deliberate, scoped exception to the general protected-field rule**
(§3.4/§5.2's "protected = not tappable" stays the default everywhere
else, e.g. Store, Closing Codes cells): a status control that goes gray
when protected tells the technician nothing about the WO's actual state,
so this control explains itself instead of going inert. See §21 for the
superseded gray/inert version.

One control, two states — the `statusFieldProtected` flag on WO Closing
is this same Free Form/Not Free Form flag, inverted (`protected = Not
Free Form`), wired to the resolved WO Workflow header's Free Form column
(§12 tier 1).

**Which status field this section governs is itself a choice** — §13's
Screen Designer lets the admin pick, per WO-type workflow, whether the WO
header status or the Activity's own assignment status is the status
these controls read/write (§12 tier 1's Completion Status Entity). This
section covers editability of whichever one is selected. Start Work
Status (§12 tier 1) is scoped to whichever entity Completion Status
Entity selects — an Activity-driven WO Type sets its Start Work Status on
the Activity, not the WO header.

**Not exempted by this flag:** Comments and Documents (§14.8) are
reachable from any step regardless of Free Form/Not Free Form — that
exemption is about record-level content, not the status-editability
question this section covers.

**Chrome split:** only WO Record View is a true Record View and gets the
full status-forefront `.rec-header` from §5.3 — identity icon/number/
editable description, editable status button, pin, ellipsis. No Plus in
its header — the Activities section's own `+` (§15.2) is already the
pointed add-affordance. **Activity Checklist, Issue Parts, Book Labor,
and WO Closing are not Record Views** — they use the List/Detail
identity-header variant (§8), minus its Plus: icon + number + protected
(non-editable) description + ellipsis only, no status button, no pin.

**Step rail colour no longer varies by this flag** — the Octave-Yellow
Not-Free-Form variant was retired app-wide (§23); the rail looks
identical regardless of Free Form state. See §3.2.2/§21 for the retired
rule and the flagged "no visual signal at all right now" gap.

**Status fill colour** is data-driven per screen via a screen-provided
`STATUS_CLASS_MAP` (`eam-shared.js`'s `selectLov()`) rather than a fixed
enum — same 3 fill colours/classes underneath, keyed to whatever status
vocabulary a given screen actually uses.

**WO status colour.** WO Record View's pre-delivered status list is
exactly the 3 real system statuses — Work Request, Released, Closed.
Green is reserved for "live/active work" only (Released); it never means
"closed," and red is never used for a normal lifecycle state. Work
Request gets its own solid-orange tier (`st-waiting`) rather than
sharing Closed's neutral outline — matching WO List's own `.pill-orange`
treatment of the same underlying system-status code (labeled "Waiting
approval" there). `STATUS_CLASS_MAP = { WAPPR: 'st-waiting', RELEASED:
'st-operational', CLOSE: 'st-standby' }`. Not extended to Equipment
Record View's own `STATUS_CLASS_MAP` (no Work-Request-equivalent code
exists there) — a WO-specific status vocabulary, not a rule about the
shared `.rec-status-btn` component's available tiers in general.

**WO timer is not implicit on Free Form.** Tapping Start Work on Free
Form checks `CURRENT_WORKFLOW.freeForm` and, if true, opens the shared
`openQuestion()` modal ("Start the timer for this work order?") before
proceeding — Yes sets the real gate (`eamTimerRunning`, sessionStorage);
No continues without it. Not Free Form keeps setting the gate
automatically, no prompt. Every downstream consumer checks this flag
instead of assuming a timer is always running:
- **Activity Checklist / Issue Parts:** only call `startStepTimer()` (and
  show `#timerPill`) when the gate is set; otherwise the pill is hidden
  entirely.
- **Book Labor:** the Timer Stopped banner + Add Labor auto-open (§18.7)
  require the gate to have been set, not just `eamArrivedViaNextStep`
  alone — a Free Form WO whose technician answered No has no timer to
  claim stopped, so neither fires. The auto-open itself has a 450ms pause
  and a slower (.5s) sheet transition so it reads as an invitation rather
  than firing the instant the page loads.

**Closed/Completed WO — every field except Status is protected.** When
the WO's status is Closed or Completed, every other Record View field
becomes protected (dimmed, non-tappable, toast explaining why) — Status
is the one exception, since it's the only way back to Released. Scope:
Type, Priority, Equipment, Department, Assigned To, Reported By, Date
Reported, Problem Code (`CLOSED_PROTECT_GRID_FIELDS`/
`CLOSED_PROTECT_LIST_FIELDS`). Organization's own pill is untouched
either way — already permanently protected regardless of WO status
(§9.3). On Hold does NOT count as closed — the WO is paused, not
finished, so every field stays editable. `applyClosedFieldProtection()`
runs once at load and again on every real Status change via the
`LOV_ON_SELECT` hook, so picking Released back out un-protects every
field immediately, live. **Known scope limit:** the Grid-shaped fields
(Type/Priority/Equipment) only get the dimmed/non-tappable treatment, not
a lock-icon insertion — none of the 3 has an existing icon slot for one.

**Extended 2026-07-29, direct feedback** to 2 more surfaces, same sweep:

- **Activity selector** (§15.2) — rows dim (`.act-item.protected`) and
  tapping one toasts instead of changing the selection, same rule as
  every other protected field above.
- **Every collapsible container header** (`.fg-toggle-row`,
  `.section-card-header`, `.rv-toggle-row` — Work order details, Custom
  Fields, Activities/Comments/Documents) grays out (`.protected`, 60%
  opacity, promoted to `eam-shared.css` since all 3 classes are already
  shared) as one whole-record "this is locked" signal, layered on top of
  the specific field-level protection above rather than replacing it.
  Still tappable — collapsing/expanding a section isn't an edit, so
  nothing about that interaction is actually blocked, only dimmed.

## 15.5 Equipment — Equipment Lookup (Search + Structure)

Equipment is a real editable field, not a read-only linked-record
preview — a full-screen picker sheet (`.hyperlink-popup` shell, X-closes
not back-arrow), not the old read-only "View full record" stub (§21).

**On-record display — rolled into the standard grid.** Equipment is an
ordinary full-width `.attr-item` inside the SAME grid as Type/Priority
(WO Record View) or Type/Status (WO Insert Mode) — first row, spanning
both columns, same double-wide trick Notes/Long-text use elsewhere in a
grid (§5.2). **Equipment LOV is required to be double-wide (full-width)
in the grid fields** — its photo tile + Route/MEC pill (below, and §16.9)
need the room a single-width grid cell doesn't have; this whole richer
treatment does not occur if Equipment is ever positioned single-width in
a grid, or anywhere outside the grid-fields paradigm entirely (neither
case exists in either real consumer today, both are always full-width,
but a future Screen Designer layout must not assume the treatment travels
with the field regardless of placement). Content: a 44px
`.attr-badge-photo` tile (§7.5, re-derived 2026-08-10 — was a 28px
`.attr-badge-outline` icon matching Type/Priority's own badge) + a
description-over-code `.attr-lov-stack` (§5.2's Grid LOV stack order).
No Type line — it added no identifying value in a grid cell. Class/
Category aren't shown on this screen — still visible via the Equipment
Lookup sheet's Search results and Structure tree.

**Equipment is always required** — the row carries `.attr-item.required`
unconditionally, like any other business-required grid field, not just
when unset (the class still gates Clear-visibility/the empty-save check;
its own red left-bar was removed app-wide 2026-07-28, §23). Empty state
renders "Tap to select equipment" as a plain muted `.attr-text` next to
the empty badge box.

**Record View and Insert Mode's Equipment fields are visually identical**
— both render through the shared `equipSummaryCardHTML()`
(`eam-shared.js`); each screen's own static markup supplies the
surrounding `.attr-item`. The one remaining difference: the row's
`onclick` calls `openEquipmentLookup(key)` (statically written, like any
other field's `onclick`) instead of the generic `openLov(key)`.

**Icon-as-photo-slot (§7.5) — badge sizing/placement built 2026-08-10,
the tap-to-preview/edit interaction itself still isn't.** The icon is now
a 44px `.attr-badge-photo` tile, not the 28px `.attr-badge-outline` box
shared with Type/Priority — big enough to read as a photo thumbnail, the
concern this note originally flagged. Tapping it still just opens the
Equipment Lookup sheet along with the rest of the row (§7.5's own
carved-out 2nd tap target — icon opens photo preview/edit, separate from
the row's Equipment Lookup — is not wired up yet).

**Picker — two tabs in one full-screen sheet:**

- **Search tab — the §8.3 List Search Screen standard, not a plain LOV.**
  The generic `openLov()` picker has no slot for more than one attribute
  per row, so this tab is a near-replica of the standard dataspy-scoped
  list screen — ds-bar, Detailed/List mode toggle, search bar, filter
  chips, results row, real `.ld-card`/`.ld-table` anatomy — built with the
  same stateless primitives the standard uses elsewhere
  (`renderStdCard()`/`renderStdTable()`), read-only reuse. Own local shell
  function (`renderEquipSearchShell()`) rather than the shared
  `renderListDetailShell()` wrapper, since that wrapper is hardwired to a
  single global tab-rail concept this tab-less screen doesn't have, and
  its dataspy-switcher sheet's z-index sits below this popup's. The ds-bar
  here is visually real (single "All Equipment" entry) but its tap is a
  "coming soon" stub — no second saved view exists yet. List mode's
  columns stay fixed-width across rows (null Class/Category render as
  "—"); cards drop a null row entirely, per §8.3. Tapping a card or table
  row commits and closes immediately, matching every other LOV field.
- **Structure tab** — the equipment hierarchy tree (Location → Position →
  System → Asset), genuinely interactive (Equipment RV's own Structure
  Details tab, §7.4, remains a separate open design problem — this is a
  local, non-generalized tree). **Select-vs-drill disambiguation:**
  tapping a row's text focuses/highlights that row and reveals an inline
  "Select" button; a separate trailing caret expands/collapses children
  without changing focus — text = focus, caret = expand, inline button =
  commit, so browsing never accidentally commits. Selecting a node
  re-anchors the tree (badged "Selected," Inter) and re-expands to that
  node's ancestor chain on next open. Tree row Type labels are Inter,
  natural case (not the uppercase mono the original Structure Details
  port used).
- **Entry-point default:** Structure whenever equipment is already
  selected (badged/expanded to that node immediately); Search when
  equipment is unset (has no current node to anchor on).
- The empty-state card does **not** auto-open this sheet on screen entry
  — consistent with every other required field's Insert Mode treatment
  (tap to open, not forced).

**Quick equipment entry — QR scan.** A camera icon-button
(`.equip-search-scan-btn`, trailing inside the Search tab's
`.ld-search-bar`) gives a one-tap shortcut to identify equipment by
scanning its QR tag — the only such affordance in the app; the record
view field itself carries none. No real device camera integration (a
static `file://` prototype) — a mock viewfinder overlay's "Simulate scan"
button always resolves to the same demo equipment record. Sits at z-index
230, above both `.bottom-sheet` (201) and `.hyperlink-popup` (220). WO
Insert Mode's Equipment field reuses this same picker, so its scan icon
is already present with no separate work.

**Search/Structure toggle** reuses `.mode-tog`/`.mode-btn` from
`eam-shared.css` — the same component as Detailed/List — so both toggles
in this sheet share one visual language.

**Depth/definition:** `.tree-row` (Structure tab) uses `var(--border-
strong)` plus a real drop shadow so rows read as raised cards; `.tree-
here` ("you are here" pill) has a doubled border width; the Search/
Structure `.mode-tog` toggle and the search bar (`.lov-search-row`) both
carry a real border scoped to `#equipmentPopup` — this sheet leans darker
than the shared base rules other §8.2/LOV consumers use, since it sits on
a plainer background with less natural contrast.

# 16. WO Workflow — Step 2: Activity Checklist

**"Focused Stepper"** (`eam-activity-checklist-prototype-v2.html`) — one
item at a time, not the grouped-scroll-list of dense cards an earlier
version used (retired to `prototypes/standalone/old versions/`, see §21).
Two other mockup directions (compact-rows-with-detail-sheet,
adaptive-collapse-with-filters) were explored and not carried into the
real file — reference material only, in `prototypes/standalone/mockups/`.
Comments and Documents are *also* reachable from this screen's ellipsis
(§14.8's `#recActionsScreenSpecific` slot) for the WO as a whole,
alongside Print Work Order, as toast stubs — unrelated to §16.2's
per-*item* Comments/Documents below.

## 16.1 Screen shape — one item at a time

- The screen shows exactly one checklist item at a time, not a scrolling
  list. A checklist item legitimately carries a lot (answer control, Notes,
  Follow-up, Comments, Documents, sometimes Equipment); showing them all
  inline in a fixed-height list card meant most of that chrome sat idle
  on every item whether or not it applied. **That reason is unchanged and
  still rules out a list.**
- **Navigation is a SNAP-SCROLL between items — locked 2026-09-21 (user
  direction), resolving the A/B this section previously left open.** The
  transition is a flick rather than a button press, so a fanned-out Route
  checklist (§16.9, ~96/~624 items) does not read as an endless run of
  discrete screens. The focused-item model above is untouched: one item owns
  the screen and its neighbours render as label+control stubs, and **the DOM
  stays at three panels regardless of item count** — which is what keeps it
  viable at 624 items.
  - **`#stepperNav`'s Prev/Next is retained, and commits directly** rather
    than scrolling and waiting for the snap to notice. It is no longer the
    *primary* navigation but it is not decoration either: it is the
    deterministic path, and the one that works when a long item has been
    scrolled through rather than flicked past.
  - **Snapping is JS-owned, on deceleration.** Not CSS: `scroll-snap-type:
    proximity` did not fire reliably on iOS and left items resting
    half-placed, and `mandatory` fights both long-item reading and iOS
    scrolling a focused input into view. Not an idle timeout either. See
    [[feedback_motion_needs_authority]]'s general form of this — a gesture
    with a resting state must be snapped decisively in JS.
  - **The snap lands on the Item Banner** (§16.11), whose fixed height is
    what makes the landing position computable.
  - **Rejected on the way, and none of it should be retried without new
    information:** a virtualised continuous list (reintroduces exactly the
    performance and dynamic-update problems the focused model was chosen to
    avoid); equipment-grouped pages (grouping is a task-plan composition
    property, often absent, so it cannot carry the model); and
    **auto-collapsing the step rail on scroll**, which was rejected on
    device as "way too problematic" — `.step-rail` is in flow, so hiding it
    reflows `.content` and lurches the surface mid-gesture. Don't retry that
    one without making the rail float first (§14.2).
  - The `.snap-*` CSS prefix is now simply accurate rather than a fossil:
    when both modes existed it named shared markup misleadingly, but scroll
    is the only mode, so no rename is owed.
- **Checklist-wide rail** (`.stepper-head`, sticky) — group name + a
  mono `Item X of Y` counter (X = live cursor position, Y = live item
  count) on the left, "View all" on the right, and a single proportional
  completion bar underneath (`.stepper-progress-fill`, green, % of items
  answered). Not per-item dots or segments, and not scoped to the current
  group — a checklist can run to ~100 items, and discrete per-item
  marks stop being readable or tappable well before that; a single fill
  holds up at any size. The counter's denominator is intentionally just
  "however many items are known to exist right now," not a predicted
  maximum — see §16.5, this is what makes dynamic items honest to count.
- **"View all"** (`#overviewOverlay`) — the escape hatch back to an
  at-a-glance list, and the only navigation that actually scales once a
  checklist is long: a plain scrollable row list, tap any row to jump.
- **Required** — a small badge to the right of the item description
  (`.focus-req-tag`), same shape/font as the org corner-badge elsewhere
  in the app (§8.3's `.ld-card-org`: Inter, 12px, pill), just orange. Not
  a "*" glyph, not in the rail.

## 16.2 Item anatomy

Top to bottom, per focused item:

1. **Dynamic-provenance tag** (only on a dynamically-added item, §16.5) —
   "Added based on your '[trigger label]' response," purple, branch icon.
2. **Label + Required badge** (`.focus-label-row`) — description, badge
   to its right if required.
3. **Answer control** (`.section-card > .focus-control`) — the type-
   specific input (§16.3), large tap targets, housed in an ordinary
   `.section-card` so the screen reads as a normal EAM record screen
   (cards, form-fields, collapsible containers), not a bespoke widget.
4. **Dynamic-trigger hint** (only on an item that *has* `dynamicRules`,
   §16.5) — "This response may add follow-up items to the checklist,"
   muted, branch icon.
5. **Follow-up** (`.followup-btn-lg`) — full-width, red-outlined button
   (§23.1 — flagging something as needing follow-up is a "needs
   attention" case, not a new colour), not a small pill competing with
   others. Flagging it reveals **Create Follow-up WO**
   (`.create-fu-wo-btn`) immediately below — hidden entirely, not just
   disabled, until Follow-up is flagged.
6. **Notes** — a real, always-visible field, same shape as the canonical
   inline-text example (§5.2): a `.form-field` with a
   `.field-inline-input` textarea, 255 chars, auto-grow. Not hidden
   behind a tap-to-expand trigger.
7. **Equipment** (only on an equipment-scoped item) — **superseded
   2026-08-10, see §16.8**: now a muted outlined chip (`.focus-equip-chip`)
   above the item label, the very first thing rendered, rather than a
   `.form-field.protected` row below the answer control. Still read-only,
   still scoped to one checklist item, still unrelated to Insert Mode's
   Equipment LOV (§9.3) — only the shape/position changed. Equipment
   context for the item being answered should never require a tap to
   see; that rule survives, the component implementing it doesn't.
8. **Comments** and **Documents** (`.rv-section`/`.rv-toggle-row`/
   `.rv-collapse`) — real per-item containers, reusing the exact shared
   §7.2 data-driven pattern (`renderCommentsExcerptMount()`/
   `renderDocumentsExcerptMount()`) that Equipment/WO Record View use for
   the whole record — the shared `COMMENTS_DATA`/`DOCUMENTS_DATA` globals
   are simply rebound to the focused item's own arrays on every render.
   Collapsed by default. Supersedes v1's Attachments, which was a
   read-only info-sheet listing filenames as plain text.

**Instructions is gone.** It was never a real, separately-supported
field on a checklist item — the item's label/description is the only
instructional text there is. v1's purple instructions callout and its
info-sheet were both built on this wrong assumption; neither exists in
v2. Don't reintroduce an "Instructions" field/box for any checklist item.

## 16.3 Checklist item types (17 total)

| Type | Input control |
| --- | --- |
| **Checklist Item** | Checkbox — fills green on check, label gets strikethrough |
| **Good / Poor** | Two-option segmented toggle |
| **Question (Yes/No)** | Two-option segmented toggle |
| **OK / Adjusted** | Two-option segmented toggle |
| **OK / Repair Needed** | Two-option segmented toggle |
| **Inspection** | Three-option: Pass / Fail / N/A |
| **Nonconformity Check** | Checkbox (deferred — fringe use case) |
| **Nonconformity Measurement** | Numeric input with range (deferred) |
| **Quantitative** | Numeric input + UOM label + acceptable range hint |
| **Dual Quantitative** | Two numeric inputs + shared UOM |
| **OK/Adjusted Measurement** | OK/Adjusted toggle + numeric input + UOM |
| **Meter Reading** | Numeric input + UOM + previous reading shown |
| **Free Text** | Textarea |
| **Qualitative** | Textarea with Aspect label above |
| **Date** | Date input |
| **Date/Time** | Date + time inputs side by side |
| **Entity** | Lookup row with chevron |

## 16.4 Toggle fill colours

| Answer | Fill |
| --- | --- |
| **Pass / OK / Yes / Good / Confirmed** | Full green fill (#00AA14), white bold text |
| **Fail / Repair Needed / No / Poor** | Full red fill (#E24B4A), white bold text |
| **Adjusted** | Full orange fill (#F46600), white bold text |
| **N/A** | Full gray fill (#6F7480), white bold text |
| **Unselected options** | Light gray background (section-bg), muted text |

## 16.5 Dynamic checklist items

An item can carry
`dynamicRules`: `{ when: <answer value>, items: [...] }`. The moment that
item's answer matches a rule's `when`, the rule's items are inserted
immediately after it, in the same group — `syncDynamicChildren()` in the
prototype's JS. Changing the answer away from the trigger value removes
those items again; this is fully reversible, not a one-way commit.

- **Counter** — the checklist's `Item X of Y` denominator (§16.1) grows
  the instant a branch fires, and shrinks again if it's undone. This is
  the deliberately honest answer to "what's the total when the checklist
  can grow mid-flight": always the current known count, never a
  predicted maximum.
- **Focused view** — a dynamically-added item shows a small purple tag
  naming which response added it (§16.2, item 1). The trigger item shows
  a small muted hint that answering it may add follow-up items (§16.2,
  item 4).
- **"View all"** — a dynamically-added item is indented under its
  trigger with a small branch icon. The trigger itself gets a smaller
  branch-icon cue next to its label, visible before it's ever answered.
  While a trigger's rule hasn't fired yet, a locked, italicized "ghost"
  row previews that a branch could appear there ("More items may appear
  based on your answer") — non-interactive, disappears the instant real
  items replace it.
- Currently one level deep only — a dynamically-added item's own answer
  doesn't itself trigger further dynamic items in the prototype's logic.
  Fine for the one seeded example (Bearing housing → Fail → 2 follow-up
  items); revisit if a real multi-level branching case comes up.

## 16.6 Prompt bar timing — adapted for the one-item-at-a-time flow

The Yes/No prompt bar itself is unchanged (§14.6) — same component, same
copy, same Issue-Parts-vs-Book-Labor branch. What changed is *when* it
appears. v1's grouped list showed every item at once, so the prompt bar
could pop up the instant the last required field was filled in, even
mid-scroll. A one-item-at-a-time flow has no equivalent "technically
done, but still working through the list" moment to interrupt — so in
v2, the prompt bar only surfaces once you've stepped to the actual last
item *and* every required item is complete. Reaching the end of the
list, not completing requirements while still browsing, is what
triggers it now. If you reach the last item with required items still
outstanding, "Next" reads "Finish" and just toasts "Complete all
required items first" rather than showing the prompt bar.

## 16.7 Task Plan Instructions — pre-checklist screen (added 2026-08-10)

A **task plan** (the admin-configured object a checklist is generated
from) can carry its own free-text/HTML instructions, separate from any
individual item. When present, they render as a one-time screen shown
*before* item 1 — `showingInstructions` state in the prototype, checked
first thing in `renderFocus()`/`renderStepperHead()`. This is a different
concept from §16.2's retired per-*item* Instructions field (still gone,
still not reintroduced) — this one is per-*task-plan*, shown once, ahead
of the whole checklist, not attached to any single item.

- **Not editable** — read-only, potentially-HTML content, no add/edit
  affordance. Reuses the exact §7.2 Comments card shape (`.comment-item`/
  `.comment-header`/`.comment-text`) rather than new chrome — "the same
  paradigm as a single comment" — just swaps the author/time/ellipsis for
  a label + a muted "Not editable" tag.
- **Label — "Task Instructions"** (renamed 2026-08-10, was "Task Plan
  Instructions" on the card / plain "Instructions" on the stepper-head and
  "View all" row — all 3 now read identically).
- **Navigation** — the stepper's Prev/Next nav treats it as a real step:
  Next reads "Start Checklist" and advances to item 1; Prev from item 1
  returns to it (only skipped entirely if a task plan has none). It also
  gets its own row at the top of "View all" so it stays reachable after
  moving on.
- **Stepper-wide rail** — while showing, the group-name reads "Task
  Instructions" and the `Item X of Y` counter is blank (it isn't item 0
  and doesn't change that denominator).
- Skipped entirely — no row, no screen — when a task plan has no
  instructions configured (`TASK_PLAN_INSTRUCTIONS` empty).

## 16.8 Equipment context chip + "View all" grouped by Equipment (added 2026-08-10)

Raised alongside the Route → Multiple Equipment Child (MEC) exploration
(mockups in `prototypes/standalone/mockups/route-multiple-equipment-
mockups.html`, still open — see §16.9): a Route-driven checklist can carry
one equipment-scoped item *per equipment on the Route*, which makes an
item's own equipment identity, and the ability to scan/jump by it, matter
more than they did for a single-equipment WO. Both changes below apply
regardless of whether the checklist actually came from a Route — chosen
from mockup options, promoted into the real file.

- **Equipment context chip** (`.focus-equip-chip`, supersedes §16.2 item
  7's `.form-field.protected` row) — a muted outlined chip, wrench icon +
  mono code + description, rendered first — above the dynamic-provenance
  tag, above the label — on any equipment-scoped item. This revisits a
  previously-locked call (§16.2's own history: a dark identity-banner and
  a collapsible-section treatment were both tried and rejected during the
  v2 rebuild); the chip is deliberately neither of those two rejected
  shapes.
  **SUPERSEDED 2026-08-12 by the Item Banner (§16.11)**, which carries the
  equipment itself. The chip is `display:none` rather than deleted, so the
  revert is one CSS line. Note the irony worth keeping: §16.2's history
  rejected "a dark identity-banner", and what replaced the chip is a banner
  — but a light, fixed-height one whose job is to be a *scroll anchor*, not
  to restate the item's identity in heavier type. Different problem, so the
  old rejection doesn't govern it.
- **"View all" grouped by Equipment** (`#overviewOverlay`) — a segmented
  toggle (`.ov-seg-wrap`, "Group by Step" | "Group by Equipment") sits
  below the dataspy/search bar (added 2026-08-10, below) and above the
  grouped list. **Step** groups by `GROUP_NAMES`/`it.group`. **Equipment**
  groups by `it.equipId` instead, in first-seen `ITEMS` order (not
  alphabetical, so equipment appear in the order the Route actually lists
  them), plus a `General` bucket for items with no `equipId`. Both modes
  share one row renderer (`ovItemRowHtml()`) so dynamic-item indent/
  branch-cue/ghost-row behavior (§16.5) can't drift between them.
- **Unified group header (2026-08-10)** — the two modes' headers used to
  look meaningfully different (Step: a plain thin muted label strip, not
  collapsible; Equipment: a heavier bordered card with a code/description
  stack, a done/total badge, and a collapse chevron) — flagged by the
  user as a real mismatch. Resolved with one shared renderer
  (`ovGroupHeaderHtml()`): **Step's own thin/plain visual style**, kept as
  the base, **plus Equipment's own done/total badge and collapse
  chevron**, now on *every* group in *either* mode — Step groups are
  collapsible and badged too now, not just Equipment's. Collapse state
  (`overviewCollapsedGroups`, one `Set` for both modes, keys mode-prefixed
  — `step:main` / `equip:A-00067333` — so the two modes' own raw keys can
  never collide) persists across mode switches and filter/search changes
  made *while the sheet is open*. **`openOverview()` itself recomputes it
  fresh on every open** (`computeDefaultOverviewCollapse()`, direct
  instruction, 2026-08-10): only the group the currently-focused item
  (`ITEMS[cursor]`) belongs to starts expanded, every other group in
  *both* modes' key spaces starts collapsed — so switching Group-by mode
  right after opening still shows exactly one expanded group (the current
  item's own) with no extra logic needed at the mode switch itself.
- **Dataspy filter + search (2026-08-10)**, above the Group-by toggle —
  raised together with a real ask that this behave like a standard §8.3
  List Search Screen, while the checklist's own content (grouped,
  collapsible, jump-to-item rows with status dots/badges/required
  markers/dynamic ghost rows) stays fundamentally non-standard. Several
  gotchas fell out of reconciling the two, worth restating since they
  drove real implementation choices, not just cosmetics:
  - **Dataspy is a real filter, dressed as a dataspy.** "All Checklist
    Items" / "Uncompleted checklist items" (`overviewDataspy`) is
    functionally a 2-state done/not-done filter — it reuses the app's
    real shared `.ds-bar` pill (§8.3, same component WO List/Equipment
    List use) purely for visual consistency, opening a small sheet of
    `.lov-option` rows, not the full dataspy-picker sheet (no favorite-
    star or distinct-underlying-query concept applies to a fixed 2-option
    toggle).
  - **Search is icon-triggered, not always-visible — a deliberate
    divergence from every other §8.3 consumer**, which shows its search
    bar inline, always. Flagged, not resolved either way: this header
    already stacks Instructions (§16.7) + dataspy/search + Group-by
    before any real content, and an always-visible bar would add a 4th
    permanent row. Revisit if that stack proves too tall in practice.
  - **Search matches everything the row can DISPLAY, not just the label**
    (widened 2026-08-11, direct instruction: "any displayed data would be
    how it will occur in the app"). `itemSearchHaystack()` spans the label,
    equipment id + description, the group name, the entered answer
    (including `true`→"yes/done/complete" so a completed toggle is
    findable by word), the item's own note, UOM/range, its option labels
    ("Pass"/"Fail"/"N/A" — findable *before* being answered), and the
    required/follow-up flags. Previously only `label` was matched, so on a
    Route WO searching an equipment code returned nothing even though the
    equipment chip was visibly on the row. **Built from the item object,
    never by reading rendered HTML back** — scraping the DOM would couple
    the filter to markup and silently break the next time a row's anatomy
    changes.
  - **Group-emptying rule** (`buildStepGroupedBody()`/
    `buildEquipmentGroupedBody()`) — same precedent as §8.3's own "cards
    drop a null row entirely": a group with zero rows matching the active
    filter/search doesn't render at all, badge and all, rather than
    showing an empty header over nothing.
  - **Opening the overlay closes any open bottom sheet** (2026-08-11,
    device report). This overlay outranks `.bottom-sheet` on z-index and
    is a full-attention surface, so a sheet left open behind it showed
    through — Comment Actions' title and ✕ were visible under the
    All-items list. It calls `closeAllSheets()` rather than
    `openSheetExclusive()` because it isn't a `.bottom-sheet` itself.
  - **Badges always show true totals, never the filtered count** — a
    group's `done/total` badge reflects real progress regardless of
    what's currently hidden by the filter/search; showing a filtered
    subset's own count there would misrepresent actual completion.
  - **Ghost rows (§16.5) follow their trigger, not their own filter
    match** — a ghost isn't a real `ITEMS` entry, so it's never run
    through `itemMatchesFilter()` itself; it shows or hides purely based
    on whether its *trigger* item passed the filter (a filtered-out
    trigger takes its ghost preview with it).
  - **Search matches item label text only** — not equipment code/
    description, even under Group by Equipment. Judgment call, not
    exhaustively decided: matching equipment metadata too could make a
    result appear under a group whose own visible text doesn't contain
    the typed term, which seemed more confusing than useful, but worth
    revisiting if real use shows otherwise.

## 16.9 Route / Multiple Equipment Child (MEC)

Real EAM functionality: populating a Route LOV on a WO, post-insert, adds
every piece of equipment on that Route into the WO's own Equipment tab,
and spins up one child WO per equipment (WO Type "Multiple Equipment
Child"), each child's own Parent WO field set to the parent's WO number.
§16.8 above (checklist chip + "View all" toggle) and the Equipment-field
indicator below are both now real, promoted out of
`prototypes/standalone/mockups/route-multiple-equipment-mockups.html`
and `record-photo-section-equipment-and-profile-options.html`. Only the
Equipment-photo/Profile-Picture linkage those mockups also explored
remains open (last bullet).

- **The WO Record View Equipment field itself, built 2026-08-10, wired to
  a real Route LOV 2026-08-10** — confirmed **not** replaced or
  repurposed by Route: Equipment stays exactly what it is today (§15.5),
  a single required value, set independently of Route. **Route is a real
  optional LOV field** (`fieldRowLov('route', false)`), its own row in
  Work order details (below Problem Code, NOT in the Header Fields grid —
  a different field from Equipment, even though it drives Equipment's own
  pill). `LOV_DATA.route` seeds 2 demo options, `Pumps`/`Fire
  Extinguishers`, each carrying an invented `equipmentCount` (24/156) —
  screen-local flavor data, not consumed by the generic LOV machinery.
  Alongside Equipment, inside the same full-width `.attr-item`, a pill
  (`.equip-route-pill`, `renderEquipRoutePill()` in
  `eam-wo-record-view-prototype-v1.html`). It reads off the shared WO
  equipment store, not this screen's own memory (§16.10):
  - rows exist and a Route is set → **"Route: `<code>` - `<description>`"**
  - rows exist with no Route (equipment arrived some other way) →
    **"Multiple Equipment"**
  - no rows → no pill at all (the ordinary single-equipment case, and
    every WO's real default — "default all WO's to have route empty,"
    direct instruction).
  Tapping the pill **always** jumps to the Equipment tab
  (`goToEquipmentTab()`) regardless of which text is showing — a real
  screen since 2026-08-10 (§16.10). That tab's own list can run into the
  hundreds, which is exactly why it's a deep link and not an inline
  list/expand/sheet (every option the first mockup pass tried assumed a
  handful of equipment and was rejected for this reason).
  **Commit timing and pill visibility:** selecting a Route commits
  **immediately** — it inserts every piece of that Route's equipment into
  the shared WO equipment store and mints one MEC child WO per row,
  parented to this WO. Clearing the Route removes that Route's rows (manual
  ones survive). The pill is a pure function of the stored rows — **rows
  exist or there is no pill.** Full model in §16.10; the earlier
  optimistic-UI/commit-on-exit draft is in §21.

  **Pill appearance:** a full-radius pill on `--bg-card` with a
  `--border-strong` edge and a soft shadow, a solid monochrome icon well
  (`.erp-icon`), the Route **code in mono** as its own part rather than
  baked into one string (§3.4), and a **counter badge** (§23.5) for how many
  equipment records sit behind it. Strictly monochrome — this pill is
  navigation, not one of §23's colour instruments.
- **Equipment's own "photo"** — the Framed Record Card direction (chosen
  from `record-photo-section-equipment-and-profile-options.html`) folded
  into §7.5's existing Equipment Photo spec instead of becoming a new
  standalone section: Equipment's grid badge grew from 28px→44px
  (`.attr-badge-photo`, filled tile) specifically so it reads as a photo
  slot, not a status icon — see §7.5/§15.5. **This is Equipment-only** —
  a literal photo of the physical asset (a truck, pump, compressor),
  same concept as the nav Avatar (§4.3) but different data on a different
  record, never conflated with it. **Equipment stays in the grid fields**
  — not pulled into a separate section/card outside that paradigm (§15.5's
  double-wide-required rule covers why). **Profile Picture** (viewing/
  setting the tech's own avatar photo, today a tiny nav-bar icon that
  "adds no real value on mobile") is a **separate, still-fully-open**
  problem — floated alongside Equipment's photo purely because the two
  seemed like they might share a component shape; not resolved, not
  scoped, nothing promoted for it. The Hero Photo Header / Compact Row +
  Expand Sheet directions in the same mockup file were not chosen either.

### Checklist items fan out per equipment (locked 2026-08-11)

The piece that made this thread work end to end, and the thing §16.8's
Equipment group-by mode was built for but was never actually fed.

**The rule:** when a WO carries equipment on its Equipment tab, every
**equipment-scoped** checklist item (an item with its own `equipId`) becomes
one item **per piece of equipment**. Items with no equipment scope — safety
checks, close-out — stay single. A technician walking a Route inspects the
same points on each asset, so the item set is the template and the
equipment list is the multiplier.

- **Order is equipment-major** — every point for asset 1, then asset 2 —
  because that's the order the route is physically walked. Not
  all-of-one-check-across-every-asset, which would mean revisiting each
  asset once per item.
- **The copies are inserted where the template sat**, so group membership
  and the surrounding safety/close-out structure are unchanged. Step mode
  still groups them under their original group; Equipment mode (§16.8)
  groups by `equipId`.
- **Removing the equipment removes its items, with no separate teardown
  path.** The fan-out is recomputed from the live store at load, so the
  copies exist only because a row exists — the same "pure function of the
  stored rows" discipline the Route/MEC pill uses (§16.10). There is no
  stored, diverged copy of the item list to keep in sync.
- **A MEC child WO fans out to exactly one asset** — the one it was minted
  for — not the parent's whole set.
- **Dynamic follow-on items (§16.5) still work per copy.** Each copy is a
  deep clone, so answering "Fail" on asset 3 inserts follow-ons under asset
  3 only. The fan-out reserves its own id range and pushes
  `dynamicIdSeq` past it, because a long Route mints hundreds of items and
  an id collision would make `syncDynamicChildren()` delete the wrong row.

**Known scale consequence, accepted:** the demo Routes are 24 (`PUMPS`) and
156 (`FIREEXT`) equipment against 4 equipment-scoped items, so a fanned-out
checklist is ~96 or ~624 items. That is the real case §16.9 always said this
tab has to survive, and it's why "View all" + Equipment group-by exists —
but it does mean the one-at-a-time stepper is not a sensible way to traverse
a long Route front to back. Not treated as a bug; flagged so nobody
"fixes" the scale by capping the fan-out.

## 16.10 WO › Equipment tab

Built 2026-08-10: `eam-wo-equipment-tab-prototype-v1.html`. Closes the
stub §16.9 left behind — both entry points now navigate for real, through
one shared function (`goToWoEquipmentTab()`, `eam-shared.js`) so they can't
drift apart:
- WO Record View's Route/MEC pill (`goToEquipmentTab()` → the shared
  function), and
- the step rail's Reference-group **Equipment** item
  (`jumpToEquipmentStub()`, present on all 5 workflow screens, §14.8).

**Its own file, not a section inside WO Record View** — §16.9's locked
reason: this list runs into the hundreds (a Route carries 24/156 equipment
in the demo data), so it's a deep link, never an inline list/expand/sheet
on the record. It is **not** a member of `WO_STEP_FILES` either: a child
tab of the WO, never a numbered/gated workflow step, so it must not appear
in the step rail's own sequence.

**But it IS part of the WO workflow shell, and keeps the step rail
(corrected 2026-08-10, direct instruction).** The first build omitted the
rail, treating this as a standalone screen — wrong. It's reached *from* the
rail's own Reference group, and it has no bottom bar, so the rail is the
only way back to Record View or any step; without it the screen is a dead
end. The rail therefore sits above the dataspy bar exactly as on any step
screen, with **no timer pill** (the timer belongs to the working steps,
§14.2, not to a reference lookup).

How the shared rail supports this — a real generalization, not a one-off:
- `renderStepRail(workflow, activeStep, jobType, **activeRef**)` and
  `renderFlatStepRail(activeStep, jobType, **activeRef**)` take a 4th
  argument naming the Reference destination on screen. The collapsed rail
  shows that destination's label ("Equipment"), the Reference row is the
  one `.active` row, and the numbered step keeps its position/segments but
  **loses** the highlight — the rail never shows two active rows.
- `STEP_MAP_REFERENCE_GROUP_HTML` (a const string) became
  `stepMapReferenceGroupHtml(activeRef)` so a Reference row can mark itself.
- **Steps at or before the WO's position become real navigations** when
  `activeRef` is set. The numbered rail is otherwise display-only (you move
  via the bottom bar), which is fine on a step screen and a dead end on a
  side screen. Future steps keep their locked toast on a gated workflow.
- `woCurrentStep` is now tracked by both rail renderers, so
  `goToWoEquipmentTab()` can record the WO's position
  (`eamEquipTabOrigin`) without every caller restating a literal it already
  passed. That origin also drives this screen's own Back button, so Back
  returns to the step you actually came from rather than always Record View.

**Conforms to §8 with no new components.** Header is §8.1's protected
identity (the *parent WO's* number + its description rendered protected/
non-editable, no status button, no pin) plus Plus/Search/Ellipsis. Body is
the shared List/Detail shell (`renderListDetailShell()`) — dataspy bar +
favourites, Detailed/List toggle, record count + sort, icon-triggered
inline search — driven purely by `LIST_DETAIL_TABS` config.

**Required per-screen markup — check these first on any new standalone
screen.** Both of these are shared behavior that silently does nothing when
its markup is missing, and both cost a round trip on this build:
- **`#listDetailHeader` must carry `active`.** `eam-shared.css` hides it by
  default (`display:none`); only `.rec-header#listDetailHeader.active` shows
  it, because on Equipment Record View that header *alternates* with
  `#recHeader` and `goToTab()` toggles the class. A standalone child-tab
  screen never calls `goToTab()`, so without `active` the entire header —
  Plus, Search, Ellipsis, the parent identity — renders but stays invisible.
- **`#toast`/`#toastMsg` must exist.** `showToast()` opens with
  `if (!t) return;`, so a screen without them makes *every* toast a silent
  no-op. Presents as "tapping a record does nothing" whenever a tap's only
  output is a toast.

Related, and correct as-is: `onRecContentScroll()`'s collapse-on-scroll only
targets `#recHeader`, so this header stays pinned — right for a list this
long, since the actions must stay reachable.

**Field set is the real base-EAM screen's own grid**, whose columns are
exactly: Equipment, Description, Department, Equipment Org., Type, Related
Work Order, WO Status. Two orders, deliberately:
- **Detailed (card)** uses a mobile-first order so §8.3's card anatomy
  lands on the right fields — **Status as the pill headline**, equipment
  Description as the subline, Equipment / Type / Related Work Order as the
  3 attribute rows, Equipment Org. as the corner badge. Department falls
  outside the card's 6.
- **List mode** uses the real grid's column order verbatim (§8.3 — List
  mode shows every available field).
- **Status is the EQUIPMENT's own status, and it is "Installed" on every
  row** (direct instruction, 2026-08-10, prototype data) — deliberately
  *not* the child WO's status, which this screen no longer models at all;
  Related Work Order stays on the card as the identifier only. Rendered at
  the **outline/steady pill tier**, not green: Installed is a steady-state
  fact about the asset rather than an alert, and a column of identical
  green pills would out-shout everything else on the card. Base EAM's 7th
  grid column is WO Status; List mode carries this Status there instead.
- Dataspies: **All Equipment** (the real one off the base screen), Route
  Equipment, Without Work Order.

**Buttons follow §8.4's placement rule, not a per-screen call.** None of
the base screen's Actions-menu buttons requires a selected row, so all of
them are **header actions and live in the vertical ellipsis** — **Add WO
Header Equipment** and **Import Route Equipment**, above a divider from the
list-level actions (Sort). **Linear Location Details is deliberately
excluded — out of scope** (direct instruction, 2026-08-10). They are *not*
behind the Plus: an earlier pass put them there and that was wrong (§8.4 —
being on a tab doesn't make a button a tab action).

**Plus opens the multi-select Equipment LOV, and that picker *is* the
insert.** §8's content-driven rule grants this tab a Plus (the real screen
has an insert-capable Equipment Details section below its grid), but that
section has exactly one required field — Equipment — so wrapping a single
picker in an Insert Mode sheet would be pure ceremony. Multi-select rather
than single is the point: adding 24 Route pumps one modal at a time is not
a flow. See the new component note below.

**New paradigm: multi-select LOV** (`openEquipmentMultiLookup(key)`,
`eam-shared.js`; CSS `.equip-multi-row`/`.equip-multi-footer`). The *same*
Equipment LOV component as WO Record View's own Equipment field (§15.5) —
same two tabs, same search/scan/tree, same result cards — with exactly two
differences: a result row **toggles** instead of committing (reusing the
existing `.lov-check` control, and an Add/Added toggle on Structure rows in
place of the focused-row-only Select button), and a footer accumulates the
picks behind one **"Add N equipment"** action. It always leads with the
Search tab, unlike single-select's §15.5 rule of defaulting to Structure
around an existing selection — a multi-select pass starts with nothing
picked, so there is nothing to orient around. Screens consume it via
`EQUIP_LOOKUP_ON_MULTI_SELECT = { key: (arrayOfEquipment) => {...} }`.
Single-select consumers are untouched: the footer markup is per-screen
(same convention as `#equipmentPopup` itself) and every multi-select
function no-ops when it's absent.

**State model — locked 2026-08-10, direct instruction.** The screen has no
seed data of its own. Everything lives in a shared, persisted **WO equipment
store** (`eam-shared.js`: `woEquipRows/woEquipApplyRoute/woEquipClearRoute/
woEquipAddManual/woEquipDelete/woEquipPillLabel`, localStorage key
`eamWoEquipment`, cleared by `resetDemoState()`), so this tab and WO Record
View's pill are one truth instead of two copies that could disagree:

1. **Empty unless a Route is selected on the WO header.** Route defaults
   empty on every WO, so a fresh demo starts empty everywhere — which is
   also base EAM's own default for this tab ("Records: 0 of 0"). The shared
   shell has no empty state, so that one branch is screen-local
   (`emptyStateHTML()`).
2. **Selecting a Route inserts every piece of its equipment and mints one
   MEC child WO per row**, each parented to the header WO — which is what
   makes that WO a parent. Route equipment is generated from
   `ROUTE_EQUIPMENT_DEFS` to the counts WO Record View's own `LOV_DATA.route`
   already claims (PUMPS 24 / FIREEXT 156), so the "runs into the hundreds"
   case is genuinely reachable rather than asserted.
3. **Manually adding equipment here does the same thing** for those rows:
   the system creates the MEC child WO and associates it to the header.
   Equipment already on the tab is skipped, never duplicated.
4. **Deleting rows, or clearing the Route, takes the pill away** — the pill
   is `rows.length > 0`, nothing else. Clearing a Route removes that Route's
   rows and keeps manual ones, so the pill can legitimately fall back from
   "Route: …" to "Multiple Equipment".
5. MEC child WO numbers start at **20451** and are unique across *all*
   parents (a store-global counter, not per-WO).

**MEC children are real, navigable records (built 2026-08-11).** WO List
merges them out of the shared store at load (`mergeMecChildWos()`) as child
rows under their parent — the parent gains its expand chevron, and the
children inherit the parent's Type, Priority, Location, Org and due date,
which is what a Route child actually does. Their description is the Route's
own description plus the equipment code (`Monthly Pump Inspections — P-1042`),
so 24 siblings stay tellable apart on a card that doesn't surface Equipment.

**A child WO opens as itself, borrowing only its parent's workflow.** These
records have no data file, so a shared, session-scoped **WO identity
override** (`woIdentitySet()`/`woIdentity()`/`woIdentityClear()`) carries the
child's number, description and equipment while `eamOpenDemoWo` still points
at the parent for workflow resolution. Consequences, all deliberate:

- Every one of the 5 workflow steps picks the override up for free —
  they all paint `recNum`/`recDesc` through the shared
  `applyDemoWoIdentity()`. The Equipment tab's §8.1 header (`ldNum`/`ldDesc`)
  is the one screen that needed it applied by hand.
- **A child never shows the parent's Route or equipment set.** The
  Route/MEC pill is suppressed, `RECORD.route` is blank, and the Equipment
  tab shows exactly the one asset the child was minted for. A child is a
  leaf, so that tab's insert/delete actions are guarded with a toast rather
  than silently mutating the parent's rows.
- The override is held for the whole session (so Next/Back across the
  workflow keeps the child's identity) and cleared by any entry point that
  opens a *different* WO — WO List's `openWO()`, Notifications, and
  `resetDemoState()`.

Both entry points — a WO List child row and the Equipment tab's own row tap
— go through the same hand-off, so a child opens identically either way. The
Equipment tab's child-WO destination is real navigation now, not the honest
toast stub it carried while this was unbuilt.

**Equipment-scoped checklist items fan out per equipment (built
2026-08-11)** — see §16.9.

**Multi-select delete — new paradigm, 2026-08-10.** A header action in the
ellipsis (§8.4: it opens a popup and needs no pre-selected row) that
surfaces the records **already on the screen** so several can be removed in
one pass — the mirror of the multi-select LOV, which picks records to *add*
out of a lookup. Shared: `openMultiDelete({title,label,rows,onDelete})` in
`eam-shared.js`, CSS `.md-row`/`.md-selectall`/`.md-footer`, with a
**mandatory** `openConfirm()` step (the only destructive control in the
pattern, and its commit button is the one red one). Sheet markup is
per-screen, same convention as the LOV's own footer.

**Row tap — still open, but the default flipped.** A row here is a join
record with **two** useful destinations (the equipment master record, and
the child WO Route spun up for it), so §8's plain "tapping a row opens this
record" doesn't resolve it. Both flows are built and switchable live from a
dev toggle in this screen's `.proto-theme-bar`:
- **`chooser` — now the DEFAULT (changed 2026-08-10, user feedback).** The
  card body opens a 2-option sheet (Equipment record / Related work order).
  The whole card is the target.
- **`split`** — the card body opens the Related Work Order (the dominant
  intent: a tech on a Route WO is here to do the work, and the card leads
  with that WO's own pill), and the Equipment code carries its own tap
  target for the equipment record. Precedent for splitting one row into two
  targets: the Structure tab's text-vs-caret disambiguation and Equipment's
  photo-badge carve-out (§15.5/§7.5). **Why it lost the default:** in real
  use the code's underline "must be hit exactly" — too fine a target on a
  phone. Its hit area is now padded to ~32px, but the precision problem is
  inherent to putting a second target inside a card row, so `chooser` leads
  until proven otherwise.
Tracked as open in §20.

**Sideways navigation must set a return URL.** Opening the equipment record
from here used to back out to Equipment List — a screen that looks enough
like this tab to read as "the screen changed under me" (user feedback). Now
`eamNavReturnUrl` (consume-once, same shape as the existing
`eamSyncReturnUrl`) is set before navigating and honoured by the shared
`navBack()`, alongside `eamOpenDemoWo` so the tab restores its parent WO on
return. Generic, not screen-local: any screen handing off sideways should
set it.

**Shared-file changes, all backward compatible.**
1. **Row tap** was hardcoded to an Update Mode toast inside
   `renderListDetailShell()`. Now a screen-provided `ROW_TAP_HANDLERS =
   { tabKey: (row, idx) => {...} }` override — the same idiom
   `TAB_PLUS_HANDLERS` already uses — with the original toast as the
   fallback for every tab that doesn't override it (Equipment RV's 6
   List/Detail tabs unchanged). Plus `ldVisibleRows(tabKey)`, one
   definition of the dataspy-filtered row set so a row index means the
   same thing in the renderer and the tap handler, and `renderStdTable()`'s
   `rowOnclick` now accepts a function `(rowIndex) => handlerString` as
   well as a plain string (Equipment List passes strings; unaffected).
2. **A field's display form is now separate from its text form** —
   `fieldDisplay(f)` returns `f.html ?? f.value`, and `ldSearchText(fields)`
   builds `data-search` from `f.value` only. **`value` must always be plain
   text; markup goes in `html`.** This is a real bug fix, not a
   refactor: this screen put a nested tap target (markup containing
   `class="…"`) into `value`, which is interpolated into the
   `data-search="…"` attribute — the first quote closed the attribute early,
   dumped the rest of the card into the page as visible text, and mangled
   the row's own `onclick`. Applies to `renderStdCard`, `renderStdTable`,
   and the shell's card wrapper.
3. **Multi-select mode on the Equipment LOV** — see the paradigm note above.

**Honest about what isn't real.** The child WOs (20451+) aren't in
`data/wo-registry.js`, and WO List's unrecognized-number fallback would
silently open 20450 — a wrong record is worse than a stub, so opening a
child WO toasts. The equipment record link *does* navigate for real, with
the same limitation Equipment List already has: no per-record routing
exists anywhere in this app yet, so every row lands on the same demo
Equipment record.

## 16.11 Item Banner (locked 2026-08-12)

Every checklist item opens with a **fixed-height, full-width banner**. Locked
off four device rounds, and it applies in **both** navigation modes — the
scroll-vs-paged question in §20 is now about navigation alone, not about how an
item identifies itself.

| Element | Rule |
| --- | --- |
| **Item number** | Mono, ~23px, zero-padded, with a smaller `/NN` total beside it. The mono weight identifiers carry everywhere else in the app, sized to register *peripherally* — the banner is meant to be watched while it moves, not read once it stops. |
| **Completion tick** | The existing green (§23 — green is reused, never re-invented). Present on any answered item, including a neighbour you've scrolled past, which is what makes "did I finish that one" answerable at a glance. |
| **Equipment** | Code (mono) + description, right-aligned. Falls back to the **WO's header equipment** when the item has none of its own, so every banner names an asset; a MEC child reports the single asset it was minted for. An item on a WO with no equipment at all reads "No equipment" rather than rendering an empty half — the band is fixed-height and full-width, so silence there looks like a fault instead of an absence. |
| **Height** | Fixed. That constancy is what makes it readable as an anchor rather than as more content. |
| **Landing** | Sits **flush** against the sticky rail when an item settles; the landing air is inside the banner's sibling body, never above the banner. Carries a shadow at rest, so arrival reads as arrival. |

**Why a banner at all.** The problem it solves is orientation at fan-out scale
(§16.9): "without consistent identifier of the sequence and lazy snaps, I do
feel lost while navigating, where I'm at and where I just was." A small caption
tells you where you are once you go looking for it; a full-width band makes the
boundary between items a physical object you watch move. In scroll mode it is
also *what the snap lands* — the landing has a visible subject.

**The equipment is there on purpose, and it is the important half.** After
§16.9's fan-out a Route checklist is ~96 or ~624 items, and "item 237 of 624"
locates a technician in the data rather than on the job. The asset is the unit
they are actually navigating. The flat index stays only for continuity with the
rail's own counter.

**Rejected banner contents**, all built and compared with live scroll behaviour
in `mockups/checklist-item-banner-options.html`: number only (fastest to read
while moving, but says nothing about the item); number + answer type; and a
full-dress sticky variant that pinned the band so the identifier never left —
rejected for costing 62px permanently and duplicating the rail directly above it.

**Direction words are banned.** An earlier caption labelled neighbours "Next up"
and "Previous"; those move with context, so the same item read differently
depending on which way you arrived at it. They described the scroll rather than
the item, which is backwards for an orientation cue.

# 17. WO Workflow — Step 3: Issue Parts

Prototype: `eam-wo-prototype-issue-parts-v1.html`. Built on
`shared/eam-shared.css` + `shared/eam-shared.js` — a real WO-workflow
consumer of the step-rail/bottom-bar chrome, plus the shared sheet/
lov-option primitives under a genuinely different LOV pattern (below).

**Store/Bin/Lot LOV picking stays local, deliberately** — not the shared
`openLov()`/`selectLov()` single-field pattern. Genuinely different
shape: options are computed dynamically per open sheet (which part, which
store, a Bin→Lot cascade), and the LOV sheet nests *above* an
already-open Issue/Return sheet rather than being the only sheet on
screen (own `#lovOverlay`/`#lovSheet` z-index). Reuses the shared sheet/
lov-option markup and CSS — only the option-resolution logic is local.

**Save button stays a locked local override** of the shared black-
contained `.btn-save` default — §17.13's white-contained spec wins on
this screen specifically.

**Mono is opt-in, not blanket.** `.field-value.mono` applies only to real
identifier fields (Store/Bin/Lot/Asset ID) — Available Qty (a formatted
number, not a code) and everything else render like any other Standard
Model field value, per §3.4's "codes render in monospace, descriptions
never do" rule.

## 17.1 Screen entry

- Triggered by the Yes/No prompt bar at end of Activity Checklist: "Did you need to issue parts?"
- Yes — navigates to Issue Parts. No — skips to Book Labor.
- Bottom bar is auto-ready on this step — no gate. Issuing parts is optional.

## 17.2 Screen header

- Title: "Issue Parts" (left)
- Storeroom selector pill (right): monospace store code, chevron, tappable to change store
- Store defaults from WO — most techs will never need to change it
- Changing the store updates the active store for all transactions on this screen

## 17.3 Parts summary bar

- Three stats: Planned | Issued | Remaining
- Issued count and colour update in real time as parts are issued
- Lives directly below screen header; monochrome per §23 (no colour wash)

## 17.4 Planned parts list

Uses the shared **Action Row** component (`.action-row`,
`eam-shared.css`/`.js` — merged with Book Labor's labor row, see §18.3 and
`docs/component-library.md`'s Action Row entry). Row anatomy: left accent
bar (gray → green on issue) | description (bold, top) | part number
(mono, below description) | meta row (UOM · Store · Bin, mono, labeled,
always visible) | qty badge | chevron. Tap the row to reveal the
read-only action area holding the Quick Issue/Return button. Activity is
not shown (inherited through workflow). Qty badge: outline "8 EA"
(planned) → filled green "8 EA ✓" (issued) — deliberately distinct from
Labor's own hours-badge, they mean different things. Cards update in
place when issued — no separate issued list.

**Modify button.** Any Action Row whose underlying entity supports
updates to its own master data gets a **Modify** button in the action
area, alongside the row's primary action button. A part's Store/Bin/
Lot/Qty are real master fields, so Issue Parts qualifies — every part
gets a Modify button next to Quick Issue/Return, `openModifySheet(partId)`,
invoking the same ad hoc "Add Part" sheet pre-filled with the tapped
part's current data (header "Modify," Issue/Planned segment defaults to
Planned so fixing a Bin/Lot typo doesn't silently re-issue the part).
Still a sheet, never a screen. Book Labor does not get this button —
booked labor is immutable after booking (§18.3), so there's nothing for
Modify to invoke there.

## 17.5 Add Parts button

- Octave outlined button style — solid border, full-opacity label, pill shape, 46px height
- Positioned above Quick Issue All Planned Parts
- Opens the ad hoc Issue/Return sheet
- Hover: aqua border and text (Octave outlined hover spec)

## 17.6 Quick Issue All Planned Parts button

- Octave contained button style — Octave Black background, white text, pill shape, 46px height
- Positioned below the planned parts list, below Add Parts
- Only acts on un-issued parts — already-issued parts are skipped
- Tapping opens a confirmation sheet before executing (see 17.7)
- Disables itself once all planned parts are issued

## 17.7 Quick Issue All — confirmation sheet

- Bottom sheet, max 70% viewport height, scrollable if many parts
- Red warning callout (§23 — "needs attention," not orange): "Verify quantities before issuing — Adjust any quantity if needed, then tap Issue All to confirm"
- One row per un-issued part: part number (`.confirm-part-num`, ink mono) | description | bin · available qty
- Inline stepper per row: − / qty / + — defaults to planned qty, min 1, max available stock
- Footer: Cancel (gray outlined) + Issue All buttons
- Issue All executes with whatever qtys are shown — updates card badges accordingly

## 17.8 Issue/Return sheet — planned parts

- Opens from Quick Issue/Return button on a part card
- Issue / Return segment control at top — drives transaction mode throughout
- **Return is disabled (grayed, non-interactive) until the part has actually been issued** — gated on `issued[partId]`, re-evaluated every time the sheet opens (a technician can't "return" inventory that was never issued).
- Part identity shown as a header block (part number mono, description) — NOT repeated as an editable LOV row below
- **Store is a pill above the part block, not a field row** — same pill component (icon + monospace code + chevron) the main screen header uses for its storeroom selector. Editable (chevron) in Issue mode.
- Issue mode field order: Store pill → part block → Available Qty + bin stock list → Bin → Lot (conditional) → Transaction Qty → Asset ID
- **Return mode has its own, different field set** — Available Qty and the bin stock list answer "where can I get more of this," which isn't relevant on a return, so neither appears. Store pill is protected (lock icon, not tappable — a return goes back to wherever it was issued from). Field order: Store pill (protected) → part block → **Issued Qty** (protected) → Bin (protected) → Lot (protected, conditional) → **Return Qty** (stepper, min 1, max = issued qty) → Asset ID (protected)

## 17.9 Add Part sheet — ad hoc

- Opens from Add Parts button, straight into the search state — no intermediate "tap to reveal search" screen.
- Store pill sits above the part field, same as §17.8, always editable here — ad hoc only ever Issues or Plans, never Returns.
- **Part field is a big tappable block** (search icon + "Search or scan a part" headline + hint text) that invokes the device camera/barcode scanner (`invokeCameraScan()`, currently a toast stub, same convention as Print Work Order/Comments/Documents). A small search bar sits directly below it, always visible, and filters the same list live as typed — only the big block triggers the camera.
- Results list shown immediately below the search bar (full list, filters live as typed).
- Once a part is selected, the search block + bar are replaced by the part header (same as planned parts sheet).
- **Segment control is Issue / Planned, not Issue / Return** — this sheet only ever issues a part immediately or adds it to the plan for a later issue; Return doesn't apply to inventory that was never issued through this flow. Defaults to Issue. Return stays exclusive to §17.8's planned-parts sheet.
- Same field order as planned parts sheet's Issue mode below the part block.

## 17.10 Form field rules

**Issue / Planned mode** (planned-parts sheet's Issue segment, and the ad hoc sheet):

| Field | State | Notes |
| --- | --- | --- |
| **Store** | Editable LOV, pill | Required. Pill above the part block (17.8), not a field row. Defaults from screen-level selector. |
| **Available Qty** | Protected | Read-only. Resolves from store + part. Lock icon, dimmed background. First field row. |
| **Bin stock list** | Read-only | Top 3 bin records from selected store, sorted qty descending. Shows bin location, lot tag (if SHOWLOT=YES), qty in green. Same API call as Available Qty — no extra round trip. See 17.11. |
| **Part** | Editable LOV | Required. Pre-filled from planned list. Header block only on planned sheet. Search block on ad hoc sheet. |
| **Bin** | Editable LOV | Required. Pre-filled from planned list. Cascades from part on ad hoc. |
| **Lot** | Editable LOV | Conditional — shown only when storeroom SHOWLOT=YES. See 17.12. |
| **Transaction Qty** | Stepper | Required. Defaults to planned qty. Min 1, max available stock. +/− buttons, monospace value, UOM label. |
| **Asset ID** | Protected | Inherited from WO. Lock icon, dimmed background. NOT editable. |

**Return mode** (planned-parts sheet's Return segment only — changed 2026-07-16):

| Field | State | Notes |
| --- | --- | --- |
| **Store** | Protected, pill | Lock icon, not tappable. Wherever the part was issued from. |
| **Issued Qty** | Protected | Replaces Available Qty + bin stock list — the relevant number on a return is how much actually came out against this WO, not what's sitting in stock. |
| **Bin** | Protected | Lock icon. Same bin the part was issued from — not a free pick. |
| **Lot** | Protected | Lock icon. Conditional — shown only when SHOWLOT=YES and the part actually has a lot. |
| **Transaction Qty** | Stepper, labeled "Return Qty" | Required. Min 1, max = issued qty. |
| **Asset ID** | Protected | Inherited from WO. Lock icon, dimmed background. NOT editable. |

**Both modes:**

| Field | State | Notes |
| --- | --- | --- |
| **Activity** | Hidden | Inherited through workflow context. Not shown in form. |
| **Issue/Return** | Hidden | Driven by segment toggle at top of sheet (Issue/Return on the planned-parts sheet, Issue/Planned on the ad hoc sheet — see 17.8/17.9). Not shown as a field row. |
| **Department** | Hidden | Not shown. Inherited from WO context. |
| **Cost Code** | Hidden | Not shown. Inherited from WO context. |
| **Material List** | Hidden | Not shown. |

## 17.11 Bin stock list — design specification

- Rendered below Available Qty row, inside the same sheet body
- Data source: storeroom stock query for selected part + store — same call as Available Qty, no extra round trip
- Returns up to 3 bin records, sorted by quantity on-hand descending
- Each row: green dot · bin location (monospace) · lot tag if SHOWLOT=YES · qty in green monospace
- Purpose: lets the technician choose the most efficient bin without leaving the form
- Selecting a bin from this list should pre-fill the Bin LOV field (future interaction — not yet prototyped)

## 17.12 SHOWLOT flag

- SHOWLOT is a storeroom-level configuration flag (YES / NO), driving a
  genuine per-store `showLot` value.
- When SHOWLOT=YES: Lot LOV row is shown in the form, and lot column appears in the bin stock list
- When SHOWLOT=NO: Lot row is hidden entirely — do not show an empty or dash state, remove the row
- Lot column in the bin stock list is also hidden when SHOWLOT=NO
- Prototype's primary store (IND-MAIN) has SHOWLOT=YES; the second store (IND-SOUTH) has SHOWLOT=NO, demonstrating the row appear/disappear live on store switch.

## 17.13 Save button

Reuses the shared gray→green `.insert-save-btn` — gray/disabled until
required fields are satisfied, green and clickable once ready. Same
pattern as Book Labor's Add/Add-by-Crew Save. The Quick Issue All
confirmation sheet's Cancel/Issue All buttons use `.btn-outlined`/
`.insert-save-btn.ready` (always-ready) for consistency.

## 17.14 Button hierarchy on main screen

| Button | Role |
| --- | --- |
| **Quick Issue All Planned Parts** | Primary action — Octave Black contained button. White text. Most impactful action on the screen. |
| **Add Parts** | Secondary action — Octave outlined button. Solid Gray 5 border, full-opacity text, pill shape. Aqua on hover. NOT dashed, NOT muted. |
| **Quick Issue/Return (per card)** | Tertiary action — outlined pill per card. Becomes green "Issued · Return?" after issue. |

# 18. WO Workflow — Step 4: Book Labor

Prototype: `eam-book-labor-prototype-v2.html` (v1 superseded — do not
use). Built on `shared/eam-shared.css` + `shared/eam-shared.js`. Two
shared component states came out of this screen's build:
- `.timer-pill.stopped`/`.timer-dot.stopped` (§18.2) — gray, no pulse.
  The WO timer stops when Book Labor is reached, so its step-rail timer
  pill needs a visually distinct state from the running pill Steps 2–3
  show.
- `.insert-save-btn.danger-ready` (§18.6) — always-ready red, for the
  Correction sheet's Save.

The Type of Hours/Employee LOV and the crew selector pill (§18.5, same
pattern as Issue Parts' store selector) stay local — no 2nd consumer for
either.

## 18.1 Screen anatomy (top to bottom)

- Nav bar (dark)
- WO identity block (collapsible, collapsed by default at this step)
- Step rail — stopped timer pill (e.g. 01:23:47)
- Timer Stopped banner — neutral card (not colour-tinted, §23), one row: heading left, elapsed time right
- Screen header — "Book Labor" + record count
- Labor list — inline-expand rows (Action Row, §18.3)
- Add Labor button (full-width contained)
- Activity summary cards — Total/Regular/OT/Est. hours, Entries
- Bottom bar — auto-ready, "Next: WO Closing"

## 18.2 Timer integration

- The WO Record View "Start" button starts the WO timer
- Timer is visible as a small running pill in the collapsed step rail during Steps 2–4
- When Book Labor is reached, the timer stops; its value loads into the timer banner

### The booking pull-up, and its one condition (locked 2026-09-17)

**Direct instruction**, given alongside §30.21's Stop Timer action:

> When the Book Labor tab is opened **and a timer is running**, it invokes a
> pull-up with the hours calculated. If Book Labor is opened and **no timer is
> running**, it just sits with no action.

This replaces the old *"pre-fills the Add Labor form start/end times"* half of
the rule above. Pre-filling a form still required the technician to find it,
open it and save it; the pull-up presents the booking and asks.

**ONE CONDITION — "a timer is running" — and it is the whole design.** The
same pull-up has two invocation points:

| Trigger | Asks? |
| --- | --- |
| **Opening this tab** with a timer running | Always — it is the technician's own navigation, so they are already looking at it |
| **§30.21's Stop Timer action**, placed in the flow | Per the action's own `mode` |

**Why that condition settles the double-booking question.** A workflow may
legitimately hold a Stop Timer action *and* a Book Labor step. Both are
guarded by the same condition, and a timer can only run once — so whichever
fires first books the time and stops the clock, and the other finds nothing to
do and stays quiet. There is **no validator, no warning and no refused
combination**, because there is nothing to detect.

**Discard leaves the timer running** (§30.21). This matters most at *this*
invocation point: a technician who opens Book Labor from the **More** group
just to look at the list must not lose their clock to a glance at a tab.

**The sheet is Hours-editable, everything else protected** — the field list and
the reasoning are §30.21's, which owns them. This is the second consumer of
that one sheet, not a second sheet.

### Built 2026-09-17 — and what building it settled

It is **one shared component** (`openBookingPullup()` in `eam-shared.js`),
self-injecting via `ensureSharedSheet()` so it needs no per-screen markup
(§8.3). Book Labor is the only wired caller; §30.21's Stop Timer action calls
the same entry point unchanged once the app is fed workflow definitions, which
is why every derived value is an **argument** rather than a global read off
this screen.

**HOURS IS A STEPPER, NOT A NUMBER INPUT.** §18.6's correction stepper was
promoted out of this screen into `eam-shared.css`/`.js`
(`startHoldStep()`, 1-minute tap → 15-minute repeat after 3s) when the
pull-up became its second consumer. The reason it matters is not
de-duplication: **a stepper raises no keyboard**, so this sheet never engages
§3.4's accessory-bar collision at all. That is a stronger position than
complying with §3.4 — there is nothing to comply with. The affirmative control
is still the header's ✓ with no footer, because that is the house pattern for
a full-attention sheet.

**AN ADJUSTED BOOKING LOSES THE TIMER SPAN.** Once the technician says "I
worked 45 of those 83 minutes", the timer's start and end cannot both survive
and stay true. So an adjusted booking is written as **direct hours** (§18's own
Time Entry Mode already models that) and its row shows no span; an **untouched**
booking keeps the real one, because there it is still true. The sheet says which
it is doing, because an adjusted figure is a *claim about worked time* rather
than a reading off a clock.

**NO CEILING ON THE HOURS, and a floor of one minute.** A technician adjusting
*up* is claiming time the timer missed, which happens when they start it late —
so the elapsed value is a starting point, not a maximum. One minute is the
floor because a zero-hour labour row is not a booking.

**THE TIMER STOPS WHEN THE TIME IS BOOKED — that is the only place.** The
§18.1 Timer Stopped banner is set at that moment and takes the **booked**
value, so it keeps meaning exactly what §18.7 said it means ("a timer stopped,
here is its value") rather than being tied to an arrival route. It is no longer
gated on `eamArrivedViaNextStep`, which could only ever be true on a guided
hand-off — the arrival flag gating the whole feature is what would have stopped
a technician reaching Book Labor from **More** from ever being offered the
booking, which is the configuration §30.21 exists to enable.

**IT REPLACED THE AUTO-OPENED ADD LABOR SHEET.** Arriving on a stopped timer
used to pre-fill and auto-open §18.4's form. Pre-filling still made the
technician find it, read it and save it. Add Labor is still reachable from its
own button; it is no longer what a stopped timer lands you in.

#### Two bugs this found, both of the "renders perfectly, is a trap" kind

- **A screen that shadows `closeAllSheets()` can close sheets BY ID.** This
  one did — `['addLaborSheet','correctionSheet','crewSheet']` — and a
  **self-injecting** sheet can never be in that list, so the pull-up opened and
  could not be dismissed by ✕ or by scrim. Fixed at the source (it now closes
  every `.bottom-sheet`, which is what the list stood in for; its
  nested-sheet early return is untouched). The component also closes itself by
  id, so the next override that misses it still dismisses.
- **The scrim bypasses any per-control handler.** `.sheet-overlay`'s onclick
  is `closeAllSheets()` on every screen, so cleanup hung off the ✕ alone
  would have left live state behind and skipped `onDiscard` — making
  §30.21's "discard never stops the timer" true of one of two dismissals a
  technician cannot tell apart. The release is registered on the **close path**
  instead (`releaseBookingPullup()`), so ✕, scrim and any future route are
  one behaviour. A booking clears the state *before* closing, which is the line
  that keeps a book from also reporting a discard.

Pinned by `test-booking-pullup.js`, including all of the above.

## 18.3 Labor list rows

Uses the shared **Action Row** component (§17.4), shared verbatim with
Issue Parts' planned parts list — see `docs/component-library.md`'s
Entry Row entry. Activity Row (WO Record View's Activity Selector) is
explicitly NOT part of this merge — a different shape (radio-select, no
per-row action button).

**Interaction paradigm — the reason the name is "Action Row," not
"Record Row":** tapping an Action Row never navigates to another screen
or opens Update Mode, unlike the standard List/Detail row-tap rule (§8,
"row tap → that record's own Record View, in update mode"). An Action
Row expands in place and transacts via its own action button(s) —
issuing/returning a part, correcting a labor booking — without leaving
the screen. Action Row only appears on a "function" tab (Issue Parts,
Book Labor); every other List/Detail screen uses the standard
search-list-screen pattern (§8.3), whose rows drill into Update Mode.

**Row anatomy:** description (full name) on top, code (mono, muted)
directly beneath it — not inline beside it. Supporting fields (Date +
Trade for Labor) render as labeled, mono chips, always visible. Tapping
the row reveals a read-only detail grid (Type of hours, Department,
Trade, Start time, End time, Hours) with the action button(s) at the
bottom — "Create correction" is the only action (no Edit — booked labor
is immutable; records only ever get reversed, never edited in place).
Detail grid values are description-only ("Maintenance," "Technician"),
per §3.4's app-wide rule.

**No Modify button here, on purpose:** Modify (§17.4) goes to any Action
Row consumer whose underlying entity supports updates to its own master
data — booked labor doesn't, so Book Labor correctly has only one action
button while Issue Parts has two.

## 18.4 Add Labor sheet

Top to bottom: **Type of Hours** pill (top-left, not a form-field row) —
Normal/Overtime share one plain outlined look (§23.1's severity-tier
collapse); Double time keeps solid red, the same exception Priority's
Critical gets (§23). → **One Header Fields grid** (§5.2) holding
Employee, Crew, Date Worked, Hours Worked, Start Time, End Time together
(2-per-row, 3 rows) — Employee/Crew are plain-LOV-shaped fields, so they
sit in the same box as Date/Hours/Start/End rather than a bespoke
double-wide component. → **Labor Details** (Activity/Department/Trade),
a collapsible container (§7.2 pattern), delivered collapsed.

- **Employee + Crew** are mutually exclusive: picking one sets the other
  to `.attr-item.protected` (dimmed, tap is a no-op with a toast) and
  derives Department/Trade from whichever was picked. Both start cleared
  and optional — neither is required to book labor. Employee shows its
  code stacked beneath the description (`.attr-text-code`, the identifier
  exception to Header Fields' description-forward norm); Crew stays
  description-only. Reopening the sheet resets both back to cleared.
  Employee, Crew, and Type of Hours all open the shared `openLov()`
  search sheet (Employee/Crew search the real `data/employees.js`/
  `data/crews.js` rosters; Type of Hours is a short fixed list with
  search hidden, `NO_SEARCH_LOVS`, matching Closing Codes' convention).
- **Date Worked** opens the same shared calendar sheet every other screen
  uses (`openDate()`/`selectDate()`), via the shared `DATE_ON_SELECT` hook.
- **Start Time / End Time** are real `<input type="time">` elements
  restyled onto the shared `.time-input` class, tap-anywhere-opens-picker.
- **Hours Worked and End Time are bidirectional, Start Time always the
  anchor:** editing Start or End Time recomputes Hours Worked
  (`recalcHours()`); editing Hours Worked directly recomputes End Time,
  holding Start Time fixed (`recalcEndFromHours()`) — via the shared
  `EDIT_ON_SAVE` hook.
- **No time entry mode toggle on this screen** — Start/End time only. The
  config flag exists (§12 tier 2's Book Labor Time Entry Mode) but Direct
  Hours Entry as an actual alternate form isn't built.
- **"Add by Crew" button is removed from the main screen** — only "Add
  Labor" remains (full-width `.btn-contained`). The Add by Crew sheet
  itself (§18.5) is unchanged but currently unreachable from this screen.
- **Booking against a Crew books every employee currently assigned to
  it, one labor row each** (same date/Start/End/Type of Hours), not a
  single row for the crew — the real system has no concept of "labor for
  a crew." Each expanded row uses that employee's own real Department/
  Trade from `data/employees.js`, not the crew's generic dept/trade shown
  in the sheet. Assignment data: `data/crew_employees.js`
  (`EAM_CREW_EMPLOYEES`), 2 employees per crew — a junction file, same
  entity/junction split as `parts_stock.js`/`wo_parts_lines.js`.
  `data/crews.js`'s `memberCodes` field is legacy, feeding only the
  unreachable Add by Crew sheet.
- **Add Labor auto-open defaults Employee to the current logged-on user**
  only on the real timer-stop hand-off from Issue Parts' "Next: Book
  Labor" (`eamArrivedViaNextStep` sessionStorage flag) — a freeflow open
  still launches with Employee cleared. That same hand-off also shows the
  Timer Stopped banner and pre-fills Start/End from the stopped WO timer;
  neither fires on a freeflow visit.
- Required fields gate the Save button: gray + no-cursor until complete,
  green + ready when satisfied.

## 18.5 Add by Crew sheet

- Crew selector pill at top of sheet, above member list (same pattern as store selector on Issue Parts)
- Crew defaults from activity; changing the crew reloads the member list
- Per-member toggles; members already booked are shown locked
- Shared time fields apply to all selected members
- Save button gates on member selection + required fields

## 18.6 Correction sheet

- 1-minute stepper per tap; hold 3 seconds → repeats at 15-minute increments (150ms interval); stops on pointer up / pointer leave
- Reason textarea
- Red Save button, always ready (correction is deliberate — no gating)

## 18.7 Design decisions locked (Book Labor)

| Decision | Detail |
| --- | --- |
| **No Edit on labor records** | Correction is the only action. Immutable after booking. |
| **Crew selector** | Pill at top of Add by Crew sheet, above member list. Defaults from activity. Changing reloads member list. |
| **Correction stepper** | 1-minute tap. Hold 3s → 15-minute repeat at 150ms interval. Stops on pointerup/pointerleave. |
| **Labor row display** | See the shared Action Row anatomy, §18.3. |
| **Wired to real data** | Employee/Crew lists, the booked-labor list, and crew-employee assignment source from `data/employees.js`/`data/crews.js`/`data/crew_employees.js`/`data/wo-19257.js`, not local hardcoded arrays. |
| **No avatar anywhere on this screen** | Labor list, Add Labor's Employee/Crew fields, Add by Crew's member rows all omit the avatar. The hours pill (`.labor-hours-badge`) stays. |
| **No redundant screen title/section label** | "Book Labor"/"Booked labor" are omitted — both would duplicate the step rail's step-name and the identity header. |
| **Timer Stopped banner** | One row: heading + clock icon on the left, elapsed time value on the right. Neutral card (`var(--bg-card)`/`var(--border)`) — not colour-tinted (§23). The collapsed step rail does not also show a `.timer-pill.stopped` pill on this screen — showing the stopped time twice would be redundant. |
| **Activity summary** | Total/Regular/OT/Est. Hours, Entries — no "Trades" metric (an Activity only ever has one trade, so it was always trivially "1"). WO Est. Hours is fixed/invented (no real Activity Estimated Hours field exists in this app's data model), deliberately not derived from booked labor. Regular/OT Hours are real sums of booked minutes bucketed by Type of Hours code, read off each labor row's own `data-minutes`/`data-type-code` attributes. |
| **`saveAddLabor()`** | Reads Start/End/Type of Hours/Department/Trade, and whichever of Employee/Crew is populated, straight off live DOM state — never a hardcoded demo row. |

LOV visibility, detail-grid formatting, save-button gating, and field-value
colour all follow the Standard Model defaults (§3.4) — no exception on this
screen.

# 19. WO Workflow — Step 5: WO Closing

Prototype: `eam-wo-closing-prototype-v2.html` (v1 retired to
`prototypes/standalone/old versions/`).

## 19.1 Screen anatomy (top to bottom)

- Nav bar (dark)
- WO identity block (collapsible)
- Step rail — all 4 prior segments green
- Status change control — current status → target status (tappable pill, §19.2)
- Closing Codes section — 2×2 grid, sequential unlock
- Downtime Details section — Date completed (defaulted), Downtime hours, Downtime cost (both optional)
- Closing Comments section — required textarea, 1000-char limit
- Attachments section — source picker, list rows, viewer sheet
- Bottom bar — locked until comments present; "Close Work Order" pill

Note: the WO Details section was removed from this screen — the tech already knows the WO. The screen starts with the status banner, then codes.

## 19.2 Status change control (Option D)

- Card keeps the same position/style as the rest of the content flow.
  Header row is just icon + one title line, "Work Order Close Status" — no
  sub-text.
- From/to statuses sit in their own row below the title (not squeezed
  beside the icon): "from" is a static, lightly-tinted pill, no "from"
  label (the row reads left-to-right); "to" is a bigger solid-fill button
  in the target status's own colour, chevron-suffixed, tappable — opens a
  picker sheet of user-authorised target statuses. Status text is Inter,
  never mono — a status label isn't an identifier code.
- **Colour vocabulary matches the Record View header button's
  `STATUS_CLASS_MAP`** (§15.4) — Completed = green (`fill-completed` =
  the header's `st-operational`); On Hold = red (`fill-onhold` = the
  header's `st-down` mapping — the same status must never render two
  different colours depending on which screen shows it); Closed = its
  own gray (`fill-closed`, a 4th value with no header equivalent to
  collide with). "From" pill's colour is hardcoded to Released's green —
  this demo has no mechanism to vary the WO's current status
  independently of the close flow.
- Both pills share one explicit box model (height/line-height/box-sizing)
  so the "from" `<div>` and the "to" `<button>` line up exactly.
- **Protected state**, per §15.4: the "to" pill keeps its real fill
  colour and stays tappable — only the chevron swaps to a lock icon.
  Tapping shows a toast explaining why instead of opening the picker — a
  deliberate exception to the general protected-field treatment (§5.2's
  usual gray/muted/inert). Toggled off `statusFieldProtected`, wired to
  the resolved WO Workflow header's Free Form column (§12 tier 1).
- **Target-status picker sheet is the plain LOV sheet, not a bespoke
  design** — plain `sheet-header-fe` (close/title-center, Clear hidden
  since target status is always required), no search row (short fixed
  list), plain description + short code (`COMPLETED`/`CLOSED`/`ON_HOLD`)
  + checkmark rows, no colour in the list itself (colour lives on the
  target pill, not the picker).

## 19.3 Closing codes — 2×2 grid, sequential unlock

- Four cells: Problem / Failure / Cause / Action
- Code + description both shown, in the cell and in the LOV sheet rows (§3.4's always-code+description default). Code convention for these four lists is `<letter>-0xx` — `P-001`, `F-001`, `C-001`, `A-001` — a placeholder scheme standing in for the eventual admin-configured code lists.
- LOV sheet includes a search row (filters on code + description), reusing the shared `.lov-search-row`/`.lov-search-input` CSS — but the sheet itself (`#codeLovSheet`) and its `openCodeLov`/`selectCodeLov`/`clearCodeLov`/`filterCodeLovOptions` functions stay local and distinctly named, since this is a 4-key cascading-clear shape the shared single-key `openLov()` has no equivalent for (and reusing the shared function names would shadow them once this file loads `eam-shared.js`).
- Sequential unlock — each cell dims until the previous is set: Problem may be pre-filled; Failure unlocks on Problem, Cause on Failure, Action on Cause
- **Required marker on unlock:** the moment a cell unlocks it gets `.code-cell.required` (same rule as `.form-field.required`) — never applied while protected/locked, applied unconditionally once unlocked (regardless of fill state). Problem has it from load since it's never locked. The class's own red left-bar was removed app-wide 2026-07-28 (§23) — this rule now only governs Clear-visibility/the empty-save check, not a visual.
- Lock indicator: small circular lock icon in cell footer when locked; swaps to chevron when unlocked
- Each tap opens an LOV sheet
- Cell label matches `.field-label` exactly — Inter, 13px, no bold, no letter-spacing, sentence case.

## 19.4 Downtime Details

- Own section, positioned between Closing Codes and Closing Comments
- Date completed — auto-defaulted, editable
- Downtime hours, Downtime cost — both optional numeric entry

## 19.5 Closing Comments

- Required textarea, 1000-character limit with live char counter
- Section badge switches Required → Complete when content present; unlocks the bottom bar

## 19.6 Attachments

- List rows, not a thumbnail grid — type-coded icon + filename + meta row; list scales to any file type
- Source picker sheet with three options: Camera, Photo library, File or document — each with distinct icon + description
- Row tap → full-screen viewer sheet: photo = coloured placeholder; document = file icon + Open (native handoff); both have Remove → confirmation sheet naming the file (red confirm)
- Quick-remove ✕ on each row removes without opening the viewer
- No attachment limit — open-ended; admin can configure in a later cycle

## 19.7 Close confirmation

- "Close Work Order" bar → confirm summary sheet: WO details + all codes + attachment count + target status
- Execute Close → green full-screen closed overlay
- **Post-close navigation:** overlay, then back to this same WO's Record
  View (not the WO List) — the technician sees the WO they just closed,
  header status updated in place. Two things ride along via
  sessionStorage, consumed once on Record View's next load: (1)
  `eamActivityJustCompleted` — the workflow instance's activity (captured
  as `eamActiveActivityId` when Record View's Start Work launched this
  instance, §15.2) gets its Completed checkbox forced true regardless of
  its prior assignment status; (2) `eamClosedStatusKey` — the target
  status chosen on this screen (§19.2's Completed/Closed/On Hold), mapped
  onto the header's own status button via `CLOSING_STATUS_MAP`.
  **Flagged, not fully reconciled:** WO Closing's 3 target-status keys
  aren't literally the same 3 codes as the header's own `__status` LOV
  (WAPPR/RELEASED/CLOSE, §15.4) — Completed and Closed both land on the
  header's existing neutral CLOSE tier, On Hold reuses the orange
  "waiting" tier established for Work Request, and none of the 3 touch
  the header's own `LOV_CURRENT.__status` value (display-only).

## 19.7.1 PM has no Closing step — Book Labor completes it instead

Added 2026-07-29, direct feedback. PM's workflow-steps row for `closing`
is removed (`data/wo-workflow-steps.js`) — PM now runs record → checklist
→ booklabor only, same treatment Issue Parts already got for this WO
Type. Book Labor becomes PM's terminal step, and its bottom bar reflects
that (`applyTerminalStepBar()`, `eam-book-labor-prototype-v2.html`):

- **Default ("Next: WO Closing") markup is untouched for every WO Type
  that still has a configured Closing step** (BRKD) — the terminal-step
  check only fires when `resolveWoWorkflow()` returns a configured
  workflow with no `'closing'` in its step list.
- **Terminal case swaps the bar to "Complete Work Order,"** opening a new
  `#completeWoSheet` on Book Labor itself — not a 2nd Closing-shaped
  screen. Reuses, verbatim, the exact from/to status banner + status
  picker sheet + confirm-summary rows + green completion overlay WO
  Closing already had (§19.2/§19.7) — this is why that whole component
  set (CSS + the status/summary/overlay JS, not `buildConfirmSummary()`
  itself, which stays screen-local since its rows are screen-specific)
  got promoted to `eam-shared.css`/`.js` this same session: Book Labor is
  a real 2nd consumer, not a one-off.
- **Summary rows are fixed RV-only fields** (direct feedback, chosen over
  a dynamic "show what changed" alternative) — Work order, Equipment,
  Date completed. No closing codes (none exist for this path) and no
  Attachments row (Book Labor has no attachments feature to summarize at
  all, unlike WO Closing). Date completed has no editable field on this
  simplified popup — defaults to today, same "plainest literal
  rendering" convention as the rest of this prototype's demo data.
- **Status edit only when not protected**, same `statusFieldProtected =
  !workflow.freeForm` rule as WO Closing's own banner — PM is Free Form,
  so this is always the editable case in practice today, but the check is
  real, not hardcoded to PM.
- Confirming reuses the identical green completion overlay (now animated,
  see the eam-shared.css comment above it) and returns to Record View
  with fields protected, exactly like a real Closing.

**Bug fix, same day:** picking a status inside `#completeWoSheet`'s
nested status picker locked the technician out of the whole completion
popup — `selectStatus()` called the blanket `closeAllSheets()`, which
closes *every* `.bottom-sheet`, not just the one the technician actually
interacted with. On WO Closing this was harmless (its status banner
lives directly on the page, never inside another sheet, so there was
never a parent sheet to lose). On Book Labor's completion popup, the
status picker opens *from inside* `completeWoSheet` — so closing
everything dropped the technician all the way back out of the popup on a
routine status pick, with no obvious way back in. Fixed with a new
`closeSheet(id)` (`eam-shared.js`) that closes only the named sheet and
only drops the shared overlay if nothing else is left open — used by
`selectStatus()` and the status picker's own ✕ now, in both Closing and
Book Labor. Behaves identically to `closeAllSheets()` whenever there's no
parent sheet (Closing's case), and correctly preserves one when there is
(Book Labor's).

## 19.8 Design decisions locked (WO Closing)

| Decision | Detail |
| --- | --- |
| **WO Details section removed** | Tech already knows the WO. Screen starts with status banner then codes. |
| **Closing codes: 2×2 grid** | Code + description both shown (§3.4 default — these are reference-data codes, not system codes, so the always-code+description rule applies). Label matches `.field-label` exactly, including sentence case (not the ALL CAPS it briefly had). Sequential unlock — each cell dims until previous is set. |
| **Closing codes: required marker on unlock** | Red required-bar (§23) appears the instant a cell unlocks — never while protected, unconditional once unlocked. Same rule as `.form-field.required`. |
| **Closing codes: LOV search** | Search row filters on code + description, reusing the shared `.lov-search-row` markup/CSS locally. |
| **Section headers — no badge pill** | Closing Codes / Downtime Details / Closing Comments / Attachments headers have no Optional/Required/count badge pill — title only, matching the `.section-card-header` convention standard elsewhere. |
| **All 4 section cards are collapsible** | See §3.4 "Every container is collapsible." Closing Codes/Closing Comments default open (required); Downtime Details/Attachments default collapsed (optional). |
| **Target-status picker rows are description-only** | See §3.4 "System codes: always description-only." |
| **Bar meta — status wording, not instruction** | Locked-state label reads "Comments required" (a state), not "Add closing comments" (an instruction) — matches the neutral progress-label convention siblings use ("0/4 issued", "Required: 0/5"). |
| **Status change control: Option D** | See §19.2 for the full description; see §21 for the superseded Option A. |
| **Downtime Details: own section** | Date completed (auto-defaulted, editable), Downtime hours, Downtime cost. All optional. Sits between Closing Codes and Closing Comments. |
| **Attachments: list rows not grid** | Type-coded icon + filename + meta row. Tap → viewer sheet. No thumbnail grid — list scales to any file type. |
| **Attachment source picker** | Three options: Camera, Photo library, File or document. Each has distinct icon + description. |
| **Viewer sheet** | Full-screen sheet. Photo = coloured placeholder. Document = file icon + Open (native handoff). Both have Remove button → confirmation sheet. |
| **Quick-remove** | ✕ button on each row removes without opening viewer. |
| **No attachment limit** | Open-ended. Admin can configure if needed in a later cycle. |
| **Bar gate** | Comments required only. Codes, downtime, attachments are all optional. |

# 20. Remaining Work

Genuinely open/undecided items only. Once an item is resolved it graduates
into a locked-decision row in the section that governs it, or is deleted.

| Item | Detail |
| --- | --- |
| **The booking pull-up's SECOND caller is not wired** | Narrowed 2026-09-17 from "the pull-up is not built" — it is now built and wired to §18.2's tab trigger (see §18.2). What remains is that **nothing feeds a workflow definition to the app**, so §30.21's placed Stop Timer action cannot reach in and its `system` mode (book with no sheet) has no runtime caller. The component takes every derived value as an argument and honours `mode` itself, so the hand-off calls it unchanged — what is owed is the hand-off, not the sheet. A dev toggle on Book Labor's own theme bar drives the real `eamTimerRunning` key so the §18.2 condition is exercisable meanwhile. This is the first concrete instance of the general gap: **the portal authors workflows and the app cannot yet be told about them.** |
| **A labour row's write shape when the hours are untouched** | Opened 2026-09-17. §18.2's pull-up books **direct hours** once the technician adjusts the figure, because an adjusted value cannot keep the timer's start and end true — and keeps the real span when it is untouched. That is two write shapes off one sheet. It is the honest rendering of what is known in each case, and §18's Time Entry Mode already models both, but whether the real outbox envelope should carry a span at all for a timer-derived booking is not settled. Low stakes while there is no backend; decide it before the envelope is built. |
| **No mobile screen demonstrates §5.2's revised container model** | Opened 2026-09-16 with §5.2's "Container shape is per-container" revision. The base-side designer can now author a Grid container anywhere in a form and a form with several Grids, but **every mobile prototype still shows the old arrangement** — one leading grid, collapsible List sections beneath. So the canonical references (`screen-layout-field-behavior-prototype-v1.html`, `eam-equipment-record-view-prototype-v1.html`) no longer demonstrate the full model they are canonical for, and a layout the designer can now produce has never been rendered. **Deliberately not fixed by rebuilding seven screens unasked** — the rule changed on the authoring side, which is where it was asked for. What is owed before the model is real end to end: one mobile screen showing a non-leading Grid, and a check that `.attr-item` / `.fg-section` CSS actually copes with a Grid that is not first (the `--bar-reserve` and `.full-width` interactions are the likely friction). Until then, treat the revised rule as authored-but-unproven on the device. |
| **The §2.10 / §27.4 severity rules are pinned against an ARCHIVED screen** *(now actionable — 2026-09-16)* | Opened 2026-09-16. `test-user-group-offline.js` was kept rather than deleted with the retired prototype and runs against `old versions/`. That keeps the rules as executable code instead of prose — deliberately, because one of them (`capabilityGap()` keyed on the *configuration* rather than the function) already killed a live false positive. **A green run still says nothing about the portal.** The blocker is gone: the portal's User Groups area now exists (§30.13), so the port can happen. Re-pin every case against it — the two severity splits (online-only is *informational*, not a warning; a **Required** UDS step the group cannot open is an *error* while the same step optional is a warning) and the guard that "All records" has not crept back into any filter (§2.7 refuses it). `test-workflow-portal.js` already asserts the refusal on the authoring side, so what is owed is the **severity** half. Do not delete the archived file without porting the cases first.
| **The offline profile's two SECOND axes are still unmodelled** *(narrowed 2026-09-16 — the authoring surface now exists)* | Opened 2026-09-08 with §29.6 as "no surface authors profiles." That half is **closed**: the portal's Offline Profiles area authors §2.7's per-entity registry, its caps and §2.8's lookup classes read-only, and profiles are assigned from either side of one membership table (§30.13/§30.14). `PROFILES` is now authorable rather than demo data standing in for records nobody can create. **What is still unmodelled is everything past the group axis** — §2.10 names two more and the new surface implements neither: the **device** axis, applied as `min(group, device)`, and **per-user as override only**. Both are narrowing-only by definition, so neither can widen what the group grants; that is the property the surface has to make visible rather than merely obey. Whoever builds them also owns what a technician sees when the device axis is the binding one, since the profile UI is admin-side and §4.4.1's sync control is the only technician-visible trace.
| **§2.7 narrows offline capability relative to the SHIPPING product — DECISION REQUIRED** | Opened 2026-09-16 by building the offline registry against the live **User Group ▸ Mobile Settings** tab (§30.14). §2.7 places **Equipment/WO history** and **meter readings** in `server-only`; the shipping product **downloads both**, and customers use them. So this is not a mapping error, it is a deliberate reduction in offline capability that nothing has acknowledged as one — and it is exactly the kind of thing found during a migration rather than during design. Two ways out, and they are not equivalent: **(a)** §2.7 stands, the narrowing is real, and it needs communicating as a known regression with the online path as the answer — defensible under §2.1 (online-first, reads at full fidelity) but only where coverage is good; or **(b)** §2.7 gets a carve-out, which means a **bounded** history policy (last N readings, last N work orders per asset) rather than the unbounded history the current product ships, because unbounded history is what §2.7's row cap exists to refuse. Note the asymmetry that makes this urgent: a technician who could read meter history offline yesterday and cannot today experiences a *downgrade*, and the registry row currently says `server-only` with no note. **Cost, Purchase Orders** are the other two `server-only` rows and are not in tension — nothing suggests the product ships those offline. |
| **Eleven offline entities have no policy decision** | Opened 2026-09-16 with §30.14. Mapping the shipping product's ~35 `Download X` booleans onto §2.7 left **11 of 31 entities genuinely undecided**: Inspection Results, WO Nonconformity, Permit to Work, Calibrations, Equipment Structure, Equipment Comments, Equipment Custom Fields, Mobile Notebook, Main Isolation Tables, Physical Inventory, Asset Inventory. The registry marks each one and warns on enabling it, so none of them can become a decision by accident — but the marking is not the decision. Two deserve deliberate calls rather than drift: **Main Isolation Tables**, safety-critical whichever way it goes (an isolation an offline technician cannot see is a different class of problem from a missing cost code), and **Inspection Results**, which is `work-set`-shaped and probably belongs with the three children already reached by traversal from the WO. The other nine are ordinary scoping calls and can be taken as a batch. **Do not resolve these by defaulting them in** — every one is a row cap and a sync cost against a device ceiling §2.7 sets at 200,000. |
| **Relative dates in a condition fork** | Opened 2026-09-16 with §30.19. Operators are offered per field type, and a date field currently takes a **literal** date only. The cases an admin will ask for are relative — *due date is before today*, *within 7 days*, *before end of shift* — and every one of them carries evaluation-time semantics the literal form does not: relative to the device clock or the server's, evaluated at the Next tap or re-evaluated later, and what "end of shift" means for a group with no shift pattern. Deliberately not half-built. **Note the offline constraint makes this narrower than it looks:** the whole point of §30.19 is that a condition is client-evaluable at the Next tap, so any relative date has to resolve against the device clock — which is the answer, but it needs stating before someone reaches for a server call (§2.7's last row). |
| **Where user-defined text translations live is unanswered** | Opened 2026-09-08 with §29.4. A question fork is the first place an **admin** types prose a **technician** reads, so it is the first thing in this programme needing a translation surface — every other mobile string is a delivered product label or record data. The prototype models it as a language-keyed map on the prompt row with a base-language fallback, which is a **stand-in, not a schema proposal**: this project has confirmed no EAM table for user-defined text translation. The one rule that must survive whatever the answer is: **a missing translation falls back to the base language and never blanks**, because an empty question on a gated step is unanswerable. |
| **Workflow config revisioning — now more pressing, still unaddressed** | §21 recorded that the retired Workflow Designer was the only artifact to have considered a live configuration being edited while technicians are mid-workflow against the previous version. §29 makes this worse rather than better: a fork's target is a *pointer to another step*, so an admin deleting or reordering a step invalidates routing that a technician may be halfway through. The prototype clears dangling and backward fork targets at authoring time (§29.4), which is the authoring-side half; the **runtime** half — what happens to an in-flight workflow whose configuration just changed underneath it — has no answer. §13.3 item 5's "version the ruleset against the offline payload" and §14.11's recommended "stamp the resolved config version at Start Work" are both parts of it. |
| **Bottom bar reserve is short app-wide, and `.focus-wrap`'s `flex:1` can make a screen unscrollable** | Found 2026-08-12 by instrumenting on device, after two wrong guesses from reading the CSS. Two separate faults. (1) **No screen in the app uses `env(safe-area-inset-bottom)` anywhere**, and six reserve bar space as `calc(var(--bar-height) + 16px)` — v2, the scroll-mode copy, Book Labor, Issue Parts, WO Closing, WO Record View. On a home-indicator device the bar covers more than is held back, so the last container is clipped; expect it worst on the screens with tall stacked containers. (2) A `flex:1` box in a column flex container **grows to consume exactly the space left over**, so when its content is shorter than the container, children sum to precisely the content box and `scrollHeight` can never exceed `clientHeight` — a scroll container with no overflow ignores the gesture entirely. That is why the checklist's paged mode was reported as completely unscrollable on device while scrolling fine in a desktop browser (a short window makes the content genuinely overflow). **Both fixed 2026-08-12, at the scope each fault actually has.** Fault 1 is app-wide: one shared `--bar-reserve` in `eam-shared.css` (`calc(var(--bar-height) + 24px + env(safe-area-inset-bottom, 0px))`) referenced by all six screens, rather than the short form written out six times — which is precisely how it stayed wrong on every screen at once. The `env()` fallback is load-bearing: without `0px` the whole `calc` is invalid at computed-value time on hardware with no inset, and an invalid padding computes to 0, which is worse than the original bug. Fault 2 is only the **two checklist screens** — checked, not assumed: `.content` is a column flex container on those two alone, the other four are plain block scrollers that overflow normally, so both get `min-height: calc(100% + 72px)` on `.focus-wrap`. Pinned by `test-bottom-reserve.js`, which is deliberately separate from the scroll-mode test file (that one gets deleted with the A/B) and whose flex-column guard was verified to fire by introducing a violation. **The diagnostic lesson is the durable part: `scrollHeight == clientHeight` means no range and is a layout fault; a non-zero gap with a stuck `scrollTop` means a swallowed gesture. Measure before theorising.** |
| **Book Labor — Department and Trade fields still cycle-on-tap** | Not yet converted to the real `openLov()` sheet, unlike Employee/Crew/Type of Hours on the same screen (§18.4). |
| **Issue Parts — button treatment consistency** | The screen mixes 3 different button weights: per-row outlined `.row-action-btn` (Quick Issue/Return, Modify), full-width outlined `.btn-outlined` (Add Parts), full-width filled `.btn-contained` (Quick Issue All). Not yet clear whether this 3-tier hierarchy (row action / secondary screen action / primary screen action) is correct as-is or needs converging. |
| **Issue Parts — "scroll to issue all" alternative** | An unexplored idea: some kind of scroll-driven bulk-issue gesture as an alternative/addition to the "Quick Issue All Planned Parts" button (§17.6). No shape proposed yet. |
| **Unified prototype compile** | A real compiled shell that invokes the standalone files rather than duplicating them is still being proven out — see the design doc's **Timeline**, milestone M3, for the current plan; don't build toward the old `prototypes/wo-workflow/index.html` monolith pattern. |
| **Date/time formatting is hardcoded to `en-US`, not actually locale-driven** | `isoToDisplay()` and `saveDateTime()` hardcode `'en-US'`. The real rule: dates should follow the logged-in user's own locale (this app targets North America/Europe/Asia — DD/MM/YYYY and YYYY/MM/DD are real cases); time-of-day stays fixed 24-hour regardless of locale (deliberate, not a gap — §3.4). No per-user locale/session concept exists yet to drive the date-format switch. |
| **Activity Screen** | Timer, task plan reference, assignment status (ref: `Activity_Selector.png`). A future standalone Activities tab could double as the real closing surface for Activity-driven WO Types instead of WO Closing (§12) — not designed, not built. |
| **Bin pre-fill from stock list** | Selecting a bin in the bin stock list should pre-fill the Bin LOV. Specified in §17.11; not yet prototyped. |
| **Record-view child tabs — generic-case ellipsis menu contents** | §8's ellipsis menu for a generic child list/detail tab has no locked content yet (Equipment's own instance ships toast-stub candidates only). |
| **Activity Selector — no cross-screen hand-off for `selectedActivity`** | Once a technician moves past WO Record View into Activity Checklist, Issue Parts, or Book Labor, none of those screens shows which Activity is in scope, and no session/URL hand-off mechanism for `RECORD.selectedActivity` exists. Harmless today (every demo WO has exactly 1 Activity, which auto-selects) but undefined once a WO has 2+. |
| **Structure Details tab — parameterize the Structure Tree** | **Reframed 2026-08-25 (user direction), and no longer a design problem** — §7.4 rewritten. The tree is a **shared component** (`component-library.md` → Structure Tree), already used by the Equipment LOV's Structure tab from three entry points. §7.4's old "no mobile tree pattern exists" claim was simply stale. What remains is a small parameterization, not design: the mount and data source are hardcoded to the LOV (`#equipTreeBody`/`TREE_DATA`), the trailing row control is selection-only and a tab needs a navigate-style row handler instead, and `selectTreeNode()` is coupled to `commitEquipmentSelection()`. One genuinely additive piece: a **per-node status dot**, which the legacy reference has and the component doesn't. Scoped as a priority-1 Equipment tab (subject to change based on scope) — and with the tree already built, priority-1 no longer carries a hidden design dependency. |
| **Insert Mode's Equipment "Type" pill — bind it to system type, and add `Location`** | **The "which field is this?" half is answered — see §26.8.** The pill is the **system type**, Equipment's layout-resolution key and its exact analogue of WO Type; it never fit Class because Class is *what kind of equipment* and system type is *what kind of record*. What remains is mechanical, **and higher-stakes than it looks, because the field is Protected in update mode (§26.8) — Insert Mode is the only place it is ever set, so a wrong or missing option is unrecoverable from mobile:** (a) the pill offers only Asset/Position/System (`ENTITY_FIELD_META.EQUIP.typeOptions`) and must offer all **four**, or Location records simply cannot be created here; (b) `saveInsertRecord()` still writes it to **`class`**, which must stop — Class keeps its own PUMP/MOTOR/VALVE vocabulary, its own filter chip and its Custom Fields gating (§22), so system type needs its own attribute. Until (b) lands, a record created in-app still has a Class no filter selects. Opened 2026-08-11, scope narrowed 2026-08-25. |
| **Re-typing a pre-start WO that already has data behind a disappearing tab** | Opened 2026-08-25, and **all that survives** of three items this table briefly carried — WO Type gate tiers and required-field drift both closed the same day when Type became Protected at Start Work (§13.5/§14.11), and the §23 required-marker tension they raised was withdrawn with them. What is left is narrow: a planner issues parts or books labor **in base** against a not-yet-started WO, then the technician re-types it on mobile to a type whose layout has no such tab. Cannot arise from mobile activity, because issuing parts and booking labor are post-Start-Work by construction and Start Work protects Type. §13.5 recommends drawing the line at whether the data *moved something*: **block** the re-type for transactional data (issued parts, booked labor — stock left the storeroom, cost landed on the WO, and leaving it with no surface is an audit problem), **allow and enumerate** for non-transactional data (comments, documents). Not locked. The check is cheap — it only runs on a pre-start re-type, where there is usually nothing to find. |
| **Equipment Record View's routed-in record is an identity overlay, not a real record** | Per-record routing (2026-08-11) hands the tapped Equipment List row over (`eamOpenEquipment`) and overlays asset/description/organization/class/category/assigned-to onto the canonical demo record, clearing the nameplate fields (alias/serial/model/manufacturer/value) that belong to 00067333 specifically. Everything deeper — Comments, Documents, and all 7 child tabs — is still the demo record's. Enough that a card opens as the asset that was tapped; not enough to claim per-record data. A real fix needs per-asset records in `data/equipment.js` (only 00067333 and BLDG-A exist) or a generated set. |
| **WO List's Search screen shows one sort control but Screen 1 owns it** | The sort button lives in Screen 1's `.res-row`; the Search screen (Screen 2) has a result-count row with no sort control of its own, so a technician filtering on Screen 2 can't reorder those results without going back. `openSortSheet()` and `applySortOrder()` are already shared and re-render both screens, so this is a markup gap, not a behavior one — Equipment List has the same shape. |
| **Login** | Not started. See §4.1. |
| **Profile screen contents** | Beyond the identity row/Settings/Log out shell (§4.3), full scope (session/tenant display, theme preference) is still undecided. |
| **WO List's Search sub-screen still shows a back button instead of the avatar** | Per §4.2's browsing-tier rule, it should show the avatar like WO List's own main screen. |
| **`WSJOBS` reuse vs. a new standalone mobile function — DECISION REQUIRED** | **Reopened 2026-09-11 (user direction)**, having read as locked ("no new `FUN_CODE`s") since July 2026. Needed **before the base track starts**, because every layout row, dataspy and permission set is keyed to whatever function the app resolves. Two candidates: ride the customer's existing `EVNT` functions (`WSJOBS` + the CCJOBS/TRJOBS/ZJ1000/WSJODC clones), or mint a standalone mobile function. The reuse case is dataspy-set fragmentation across functions (§6.3/§8.3); the new-function case gained a real input — **a new Equipment screen function that renders by equipment type is required regardless** (below), so the two tracks are asymmetric unless WO also gets one. **Do not re-derive §26.7 with it:** per-user-group function resolution is still locked and holds either way. Full framing in §11. |
| **A new Equipment screen function that renders by equipment type — required, and unspecified** | Stated as a requirement 2026-09-11 (user direction). Base models Equipment as four screens (Location / Asset / Position / System) and mobile collapses them into one surface that re-renders by system type (§26.8); nothing existing does that, so the function is new. **This supersedes the older framing of this gap** — it was previously logged only as "Equipment's four system-type layouts have no authoring surface," which is the *layout* half. The *function* half is now explicit and is an input to the decision above. Still owed: the function itself, its `PLO_PAGENAME` mapping across the four types and their clones, and the Screen Designer surface that authors them. **Blocks the Equipment mobile track** — don't build Equipment RV against one hardcoded layout, or every child tab inherits the assumption. |
| **The punch-list dataspy selector has no home, and it is the first non-binding control wherever it lands** *(re-homed 2026-09-16)* | Opened 2026-09-11 with the punch-list lock (§2.6). The automatic half of the punch list is a dataspy named **per user group** — §2.6 placed it there deliberately, and §30.14 re-confirms it against the shipping product's conflated `Download Work Orders / For Dataspy` field: a profile's per-entity dataspy is a *replication bound* shared by N groups, while the punch list is a *membership* question those N groups legitimately do not share. **What changed is only the address:** User Group Setup is retired (§21), so the selector now belongs in the portal's User Groups area — which is a **binding** surface (§26.5.1), assignment only, so this is still the first control on it that configures rather than binds. State which it is before building. Unchanged and still the sharper half: the membership row merges two sources, so the selector's output has to stay distinguishable from a manual pin downstream, or a dataspy re-evaluation evicts the technician's own additions (§2.6 consequence 3).
| **Tiered record model review** | On approval: merge tier-model architecture into §2. |
| **WO timer placement + pause/resume** | Two open questions: (1) keep the timer in the step rail or move it to the nav bar so it stays visible while the rail is scrolled/collapsed; (2) whether pause/resume should exist, and if so whether it's a per-WO-type config flag alongside Free Form (§15.4). Not designed, not prototyped. |
| **Activity Checklist's Checkbox-type control vs. the generic checkbox pattern** | §3.4's generic checkbox rule makes the whole row a compact tap target; the Checkbox-type item's control (§16.3) is a large, centered, full-width tap target instead, since the focused one-item-at-a-time screen has the room. Open call: is this divergence justified by context, or should it converge? |
| **Search List screen dataspy/filter persistence** | §24's rule that a Record View's back button returns to the entity's Search List "maintaining the user's dataspy and persisting any filters" isn't wired up yet — WO List's and Equipment List's dataspy bars and filter chips are real and functional, but nothing carries the active dataspy/filter selection across the round trip to Record View and back. The navigation target is correct and built; the persistence mechanism isn't. |
| **WO Record View — missing Notes section** | §15.1 lists "Notes — renamed from 'Description'" as part of the screen's section order; no such field exists in `eam-wo-record-view-prototype-v1.html`. |
| **WO Record View — field set vs. §15.1 conflict** | §15.1's prose says Work Order Details should show "asset, location, assigned to, reported by, est. duration, created"; the actual screen shows Assigned To/Reported By/Date Reported/Problem Code (no location or est. duration). Needs a decision on which is stale before "fixing" either side. **Partly resolved 2026-08-10:** Department moved out of that card and up into the Header Fields grid, which is what §5.2 wanted for a non-nullable field. **Problem Code is still required and still stranded in the details card** — same gap, now the only instance of it. |
| **Booked Labor's Correction sheet content is hardcoded demo data** | The always-ready red Save button is intentional (§18.6), but the sheet's employee/hours-type/department/trade/duration values are fixed demo constants, not technician-entered. |
| **Booked Labor List has no defined sort/grouping rule** | Rows render in pure insertion order. Fine at today's scale; flag if this list needs to hold more in a real deployment. |
| **WO › Equipment tab — row-tap destination not locked** | A row is a join record with two useful destinations (equipment master vs. the child WO Route created for it), so §8's "tapping a row opens this record" doesn't settle it. Both flows are built and live-switchable from the screen's dev toggle: `chooser` (**now the default** — card body → 2-option sheet) vs. `split` (card body → related WO, equipment code → equipment record; lost the default because the code target is too fine on a phone). **Both destinations are now real navigation** (2026-08-11 — the child WO was a toast stub until then), so this is finally a fair comparison on a device. Pick one, then lock it in §16.10 and drop this row. |
| **Conditional field rules — deferred to Phase 4+, one-way doors only** | §13.1–§13.4 records the evaluation model, a 4-tier option ladder, and 5 prerequisites for field-level conditions ("if field X is Y, make Z required / surface another step"). **Deprioritised 2026-08-11 (direct instruction): this is Phase 4+ consideration, not near-term work.** Don't spend design time picking a tier now. The only thing owed up front is identifying **one-way doors** — decisions that would be expensive to reverse once other work builds on them. Two such prerequisites are worth doing regardless of whether any tier ever ships, because retrofitting either later touches every field on every screen: the single `resolveFieldState(field, context)` seam (§13.3 item 1) and the declared-vs-effective field-state split (item 2). **A third one-way door, added 2026-09-08: `resolveFieldState(field, context)` must be evaluable *entirely on-device*.** If any condition is server-evaluated it **silently does not apply offline** — which lands in §2.3 consequence 3's failure mode through a different door (the technician sees a field the server would have required, fills the form, and the write is rejected hours later). Cheap to state now, expensive to retrofit, and it does **not** require picking a tier — so it does not violate this row's own "don't spend design time picking a tier" instruction. Also still owed whenever this resumes: the `docs/Data_refs/Page Layouts perms/` check in §13.4. |
| **Mobile screens hardcode their own field labels and boilerplate** | §26.7 guard rail 3: allowing the workflow on any `EVNT` function only pays off if the mobile screens read labels, boilerplate and help text from the **bound function's** layout rows. Today every label in the prototypes is a hardcoded English string, so a technician on a clone an admin renamed "Customer Quote" would still read "Work Order." This is the consequence of §26.7's decision that reaches furthest into the prototypes, and it is a real dev-side question (where the label catalogue comes from offline) rather than a design one. Opened 2026-08-24. |
| **Workflow-eligibility validation in Screen Designer** | §26.7's honest replacement for what a single blessed `WFJOBS` would have guaranteed: enabling the WO workflow on a function must check that the tabs §12's step set requires are present and permitted for the target group(s), and refuse or warn when they are not. Shape undecided — hard block vs. warn-and-save, and whether the check runs at enable time, at save time, or both. It is the one piece of genuinely new work Option B creates. Opened 2026-08-24. |
| **Nav-slot binding storage — shape not signed off** | §26.3 locks the paradigm (access control supplies the candidate functions, config supplies the choice and the order) and the four slot-row fields, but the storage itself — a small new table keyed `(user group, sequence)` — is a proposal, not a confirmed base-EAM object. Needs a call with whoever owns the base schema, together with the smaller question of whether §26.3's curated icon set is authored anywhere or hardcoded. `PRM_MOBILESTARTCARDS` was considered and rejected as the home for it (§26.6). Opened 2026-08-24. |
| **Dataspy sets become function-resolved once `WSJOBS` clones are in play** | §6.3/§8.3 assume one fixed dataspy set behind WO List. Dataspies are per-function, so two user groups bound to different clones (§26.1) see different dataspy sets — different options, different defaults, different favourites — in the same "Work" nav slot. Nothing in the list-screen design accounts for that, and it is the one knock-on of §26.2/§26.7 that reaches a locked mobile-side rule rather than just implementation. Note §11's original one-function decision cited dataspy fragmentation as its own justification; §26.7 accepts that cost deliberately rather than denying it. Opened 2026-08-24. |
| **`renderBottomNav()` doesn't exist** | Bottom-nav markup is hand-copied into every screen (e.g. `eam-home-screen-prototype-v1.html`); nothing in `eam-shared.js` renders it. §26.4's config-driven nav needs it extracted first, and that extraction is what makes a 4th slot a data row rather than an edit to every screen file. Same consolidation debt as the plan doc's §7.3 (WO List's hand-copied `.bottom-nav`/`.nav-avatar` CSS) — worth doing in one pass. Opened 2026-08-24. |
| **Screen Designer has no Placement control for the "More" group** | Opened 2026-08-25 with §14.8's reframe. The group's membership is now defined as admin-configured — each of the function's tabs carrying `Placement = Step \| More` (§12 tier 2) — but nothing authors it. `eam-screen-designer-v1.html`'s left pane manages numbered steps only; there is no way to place a tab outside the sequence, and no candidate list drawn from the function's permitted tabs. `WO_MORE_TABS` in `eam-shared.js` is the runtime stand-in (data-driven, so it is ready to be fed) with today's three members hardcoded as the default. Needs: the Placement control itself, the permitted-tab candidate list (same source as §26.7's eligibility check), admin-set ordering, and a decision on the icon question this shares with §26.3. Base-track scope, not mobile. |
| **The "More" group's destination screen is still named `eam-wo-reference-tab-prototype-v1.html`** | Cosmetic but misleading after §14.8's rename (2026-08-25). The file is the WO's Comments + Documents child-tab screen; its name, `goToWoReferenceTab()`, `WO_REFERENCE_TAB_FILE` and the `eamReferenceTab` sessionStorage key all still say "reference," which now reads as a group name that no longer exists rather than as a description of the screen. Renaming touches the file, `screens.html`, and three identifiers in `eam-shared.js` — cheap, but it is churn with no user-visible effect, so it is deliberately deferred rather than bundled into the rename that surfaced it. Note the screen itself is correctly named for what it *does* in §7.2 terms; only the "reference" word is stale. |
| **`jumpToRvSection()`/`consumeJumpToSection()` are dead machinery** | Pre-existing, confirmed 2026-08-25. `goToWoReferenceTab()` superseded `jumpToRvSection()` when Comments/Documents became a real child-tab screen (§7.2), leaving nothing that sets the `eamJumpToSection` flag — so `consumeJumpToSection()` still runs on every WO Record View load and always returns early. Both functions plus the flag can go. Not removed alongside §14.8's rename because it touches WO Record View as well as the shared file, and it is unrelated debt rather than that change's residue. (`jumpToEquipmentStub()` *was* that change's residue and is already removed.) |
| **The base Sencha→Angular migration is an unowned dependency for three separate things** | Opened 2026-09-11 (user). Base EAM is being moved off the Sencha/Java UI library onto **Angular**, as a separate programme — today the base UI does not format to a mobile device, under the new one it will. Nothing in this app blocks on it, but three items now point at it and **nobody in this programme owns the relationship**: **(1)** it is the whole Contractor/BYOD answer (§2.2/NG3), so its timeline sets when that theme is genuinely closed, and there is a window before it lands with no contractor answer at all; **(2)** phone-width responsive needs *confirming as an explicit goal* of that programme, for the screens a contractor actually needs — "Angular" does not by itself mean usable at phone width; **(3)** an Angular front end implies **a real API behind it**, which is exactly what §10/§12 need in front of `R5PAGELAYOUT` and the workflow tables — and that is the larger prize. Whether one API layer can serve both is the question to ask. Also worth re-checking: §10's recommended "strangler-fig, not an embed" shape for Screen Designer assumed a *legacy* base UI to launch out of. |
| **Tier 0 bootstrap-config contract — shape not defined** | Opened 2026-08-25 with §2.3's resequencing. The *ordering* and the "carried on the authentication response" recommendation are settled; the **contract is not**. Owed: what the bundle actually contains per domain (0a–0f), the per-domain **version-stamp** scheme that makes a reconnect delta-check cheap, and how a partial failure is reported — 0c missing is fatal, 0f missing is degraded-but-usable, and the response needs to say which happened rather than returning one opaque error. Also unresolved: whether 0f is scoped server-side (the server resolves layout, then returns only the code domains it references — smaller payload, more server logic) or client-side (the client resolves layout, then asks for domains by name — chattier, dumber server). Recommend server-side scoping: it is one round-trip inside the login wait instead of two. Needs the API team. |
| **Write path must be gated on status authorizations, and nothing enforces that yet** | Opened 2026-08-25 (§2.3 consequence 3). If Tier 0's `0d` is absent or stale the app must **not** accept writes — permitting them queues outbox entries the server will reject, and under §2.4's optimistic UI the technician sees success and walks away, with the failure surfacing hours later in §4.4's trouble-field banner. That is exactly the "did my transaction actually land?" trust failure this app exists to fix, so a systematically wrong authorization set is worse than a blocked one. Owed: where the gate lives (a `resolveFieldState`-style seam would be the natural home — see the conditional-field-rules row), what the UI says while gated, and whether a stale-but-present authorization set is treated as usable. No prototype equivalent exists; there is no write path to gate yet. |
| **Workflow config revisioning — a live config edited mid-execution** | Opened 2026-08-25, surfaced by retiring the Workflow Designer prototype (§21), which is the only artifact that had modelled it (Draft / Current Rev / Create Rev). Nothing in §11–§13 or §26 says what happens to a technician who is part-way through a gated workflow when an admin changes that `(function, WO Type)` configuration — steps reordered, a step removed, a field's required-ness flipped. The offline model makes it sharper than it would be online: the device holds a hydrated work set and a configuration that arrived at sync time, so "the config changed" and "the technician is mid-WO" can be separated by hours or days, and the WO's own step state was recorded against the *old* shape. **Recommendation added 2026-08-25 (§2.3 consequence 4): pin the resolved config version to the WO at start-of-work**, so a WO in flight finishes on the shape it started with and the new configuration applies to the next one started. Cheapest of the three candidates and the only one needing no migration of already-recorded step state; the alternatives were versioning the config and migrating step state on delta pull, or forbidding destructive edits while WOs are in flight. Note this is the same problem as the Tier 0 config-delta case, approached from the authoring side rather than the sync side — resolve them together, once. Still needs a call before workflow config is editable in production, not after. |
| **UDS definitions widen Tier 0's `0f`, and nothing accounts for it** | Opened 2026-08-25 with §27.5. `0f` is scoped to the code domains that *delivered* layout references, but a UDS field can reference a customer-defined LOV domain — so §2.3's "layout first, because layout scopes everything after it" has to traverse UDS definitions too. Miss it and a UDS LOV field renders raw codes, which is the exact training-dependency regression that put code domains in Tier 0 to begin with. The per-domain version stamp §20 already owes must cover UDS definitions, or one changed UDS forces a full config refetch. |
| **The card's 6-field projection number is provisional** | Opened 2026-08-26, **narrowed 2026-09-08** — it used to be two numbers and the index's ~10–20 closed with the index (§21). **6** is the card's current shape under §8.3, not a locked cap. What needs confirming is whether 6 is right for the card *and* for the chips/sort it also drives. |
| **Eviction's refcount condition — real column or recomputed sweep?** | Opened 2026-09-08 with §2.3's traversal. §6.13's `!pinned && !dirty` interlock gained a third condition (*no other retained root references this row*), because a row can be present only as another root's depth-1 reference. Whether that is a maintained refcount column or a periodic sweep is a dev call with a correctness consequence: get it wrong and eviction either leaks rows forever or deletes a reference a retained root still needs. |
| **"Unresolved reference" and "not hydrated" are missing states — one design pass, two grains** | Opened 2026-09-08. §6.13's row-state vocabulary describes **records**; §2.3's traversal introduces two states it cannot express — a *field* pointing at a reference that did not traverse (an ephemeral search result renders this by construction) and a *tab* whose rows did not (§27.5). Both need an affordance, and it must stay distinct from `definition-gated`, which means "should not render at all" (§2.8). **The re-type mirror case is the sharpest justification:** re-typing a pre-start WO can add a UDS tab whose rows were never traversed, and nothing distinguishes that from a legitimately empty tab. |
| **The closure cap and the per-collection row caps need real numbers** | Opened 2026-09-08 with §2.3 rule 5. The parent-chain depth N is gone (the server flattens the ancestor path), leaving the caps as the only tunable numbers — and they must be **sized per collection** (checklist items, parts lines, labor lines, comments, each placed UDS tab), not per graph, because to-many traversal is the expensive axis. Principle settled, numbers not. |
| **UDS — per-row cap and authoring-time FK-mapping validation** | Opened 2026-09-08 with §27.5, and **required rather than prudent**: a customer-authored PK→FK mapping can inflate every device's payload. Owed: a per-UDS row cap, plus validation at authoring time that the join column exists, is indexed, is cardinality-bounded, and is single vs. composite — built alongside the existing workflow-eligibility validation. |
| **UDS — cardinality (1:1 or 1:N per `(WO, UDS)`)** | Opened 2026-09-08 (narrowed from the retired "write path has no shape" row). The write shape is settled — a **row-shaped outbox envelope**, distinct from Custom Fields' EAV form (§22) — but cardinality decides which §2.5 conflict row UDS sits on (field-edit vs. insert), and it must be **answered before the envelope is built**. |
| **UDS — whether UDS fields are governed by status authorizations** | Opened 2026-08-25, and now the **last genuinely open UDS offline item**. Unchanged by the storage answer. If they are not governed, §2.3 consequence 3's write gate has a hole in exactly the fields nobody has specified. |
| **Screen Designer's Placement control is now sync-affecting, not just authoring debt** | Re-scoped 2026-09-08 (§27.5). Placement was already owed; now it **governs device payload**, because a UDS child tab traverses iff it is placed. So the per-UDS row cap and the FK-mapping warnings belong on that surface, and shipping Placement without them ships a control that can inflate every device silently. |
| **Device-grain offline policy has no mechanism** | Opened 2026-09-08 with §2.10. The grain is specified as `min(group, device)` with per-user as override only, but nothing on the base side carries a *device* axis for this — note the existing per-user-per-device map extent override as the nearest precedent when GIS lands (§28). |
| **The per-action offline capability list is a first pass, not a locked contract** | Opened 2026-09-08 with §2.9. The five states, the deferrability test **and a 26-row first-pass enumeration** are all in §2.9 — what is owed is **confirmation of the interesting rows, not the list itself.** The rows to argue about: ad-hoc part issue (`blocked-visible` on the grounds that bin stock is server truth — a real restriction on a common field action), Start Work on a non-hydrated WO, "keep offline" needing connectivity, and whether server search should degrade to cached scope (`substituted`) or refuse. It is **product-declared and versioned with the app — deliberately not a Screen Designer control**, since whether Start Work can complete without a server is an architectural fact rather than a customer preference. |
| **Nobody has the number that would justify re-adding database-wide offline search** | Opened 2026-09-08 with §2.1. The reduction was taken on the argument that re-adding a `stub` state later costs nothing structurally (row identity is stable). What decides whether to re-add it is **how often a technician needs a record that is not on their device, while offline** — instrument it in v1 rather than re-deciding from first principles. A second, narrower question: **is location-aware search needed over records that are not GIS-integrated?** If yes, it reopens a lat/long projection when Phase 2 lands (§28). |
| **The sync control needs a state or copy for an online-only user** | Opened 2026-09-08 with §2.10, and it is the **only** place the replication switch is visible to the technician. §4.4.1's four states assume a replicating user: "Offline" means *working from the device*. For a user with no offline profile it means *you cannot load work* — **same icon, opposite promise.** Needs either a fifth state or distinct copy; the rest of §2.10 is deliberately invisible, so this one surface has to carry the whole distinction. |
| **Manual caching (R5) is ~80% specified and 0% built** | Opened 2026-09-08. The mechanics already exist: `pinned` is orthogonal to `hydration` (§6.13) — exactly the hook manual caching needs — "no blocking modal" is locked (§3.4/§4.1), and §2.3's traversal makes a cached record actually usable rather than a pinned shell with blank fields. **Three small UI pieces are owed:** a **"keep offline"** control on the record header ellipsis (§8.4 makes it a header action, not an Action Row); the download surfacing as a **non-modal progress item in the existing Sync Status Screen** (§4.5) rather than a new surface; and a **device-storage view** so a technician can see and reclaim what they have pinned. Note the existing product's `Clear Files` is the blunt version of that third one — all-or-nothing, per user. |
| **GIS / maps — nine open items, all Phase 2** | Opened 2026-09-08 with §28. **Enumerated in §28.7 rather than repeated here**, per the one-fact-one-home rule: parity scope, the React Native ↔ ArcGIS native module (likely the largest unpriced item in the programme), what "other map services like OpenStreetMap" means, where a map is *placed* in Screen Designer (R3), **GIS identity as a second Tier 0 domain** with its own hard-failure mode, `GISMAPS` resolving per org/dept while everything else resolves per user group, the basemap credit/storage budget, whether §2.10's replication switch gates the replica, and PerReplica version accumulation. **None of these blocks v1** — that is the point of the Phase 2 call — but item 4 has a v1 consequence: keep §27.3's renderer generic enough for a map tab. |
| **No generic definition-driven screen renderer exists** | Opened 2026-08-25 with §27.3. §22's `applyCustomFields()` and §9.8's Insert Mode both prove the definition-driven pattern at container scale, but nothing renders a *whole* screen body from definition — which is the single build UDS tabs require. Also unresolved: a `Placement = Step` UDS tab is the first child-tab screen needing §14.5–§14.7's per-step bottom bar (the Equipment tab has the rail but no bar), and §14.7's required-field bar-locking would have to evaluate fields the app has never seen. That last point is a second, independent argument for the declared-vs-effective field-state split named as a one-way door in §13.1–§13.4. |
| **§4.2's browsing-XOR-record-open binary blocks a tablet two-pane — AMENDMENT REQUIRED** | Opened 2026-09-21 with §31. §4.2 says the bottom nav is "visible while browsing; hidden entirely the moment any record is open" — a **binary**. §31.3's list-detail layout shows a record list and an open record *simultaneously*, so both states are true at once and this is a **model** conflict, not something a media query can style around. **Proposed:** the exclusivity is a phone-portrait space compromise, so it gains a form-factor scope — on tablet band 1 persists always and the record nests in bands 2–3 rather than replacing the shell. §4.2's three-item membership (Home, Work, Notifications, with Equipment deliberately excluded as a destination rather than a section) is **unchanged**; only the visibility rule moves. The user has explicitly authorised proposing against locked rules here, so what is owed is the amendment text, not permission. |
| **§30.16's `HOME_FOLD` is single-valued and a tablet's fold is different — AMENDMENT REQUIRED** | Opened 2026-09-21 with §31. `HOME_FOLD = 3` is arithmetic on a 390px device (390 − 28 padding, 100px tiles, 10px gaps) and protects the rule "line one is what the technician sees without swiping". The same arithmetic over a tablet's ~1102px gives a fold of **9**, and the portal's Home editor draws exactly **one** fold, so it cannot be truthful for both. **Proposed: author to the phone fold and treat the tablet as a superset** — the editor keeps drawing 3 as the *guarantee*, since what fits a phone fits a tablet and never the reverse, and the tablet then merely reveals more of row one without swiping, which can only be a bonus. That keeps one fold, one authored layout and no per-device variants. Note this is the **one** place §31.1's scope boundary is crossed, and it is crossed as a rule rather than a portal layout change. |
| **The band rule bends on two screens, and both need a device** | Opened 2026-09-21 with §31.3. The rule is at most three bands, with the list pane and the record rail never coexisting. Two screens legitimately want a fourth: **Activity Checklist** (band 2 rail + item list + focused item — which would retire the All-items overlay, a genuine simplification, §16.9's fan-out being ~96/~624 items) and the **WO Equipment tab** (tab rail + equipment list + child detail). Both are legible in the mockup only because the two middle bands are narrow and the content shallow. The alternative in each case is that band 3 takes over entirely and the middle list collapses to a chooser exactly as on the phone. This is the same shape as the existing `chooser`-vs-`split` open item on that screen, so it can reuse that dev toggle rather than needing its own. |
| **Two-pane introduces a selected-row state that portrait does not have** | Opened 2026-09-21 with §31.3. A list-detail layout requires a *selection*; the phone layout has none, because tapping a row navigates. So rotating **into** the tablet layout has to choose one (first row, or none with an empty detail pane and a prompt) and rotating **out** has to discard one. "Empty detail pane with a prompt" is the conventional answer and the honest one — auto-selecting the first row silently opens a record the technician did not choose, which on this app also means a record that could be started. Not a default; a call. Related: nothing in the prototypes keys off orientation today, so rotation is currently a pure re-layout and safe. |
| **`safe-area-inset-left/right` are used nowhere, and a full-width layout needs them** | Opened 2026-09-21 with §31. `eam-shared.css` has exactly **one** safe-area usage in the whole file — `safe-area-inset-bottom`, inside `--bar-reserve` (§20's bottom-bar-reserve item). Today `.app{max-width:430px}` centres the app and thereby avoids side insets by accident; §31.3's full-width tablet layout removes that accident. Smaller on a tablet than on a notched phone, but a real gap and a **prerequisite** for the band layout rather than a follow-up — band 1 sits on the leading edge, which is exactly where the inset applies. |
| **Whether tablet support is an R-level requirement — DECISION REQUIRED** | Opened 2026-09-21 with §31. Tablet/form-factor support appears nowhere in the design doc's requirements, and §31 records the scope boundary and the proposed model without claiming it is required. This decides whether the 16 app screens get touched **once** (a shared `eam-shared.css` band layer plus a per-archetype pass, sequenced as its own milestone) or **sixteen times** (per-screen landscape fixes as each screen is next worked on) — and the first is much cheaper only if it is sequenced deliberately. A requirement and a changed sequence both belong in the design doc rather than here, so what is owed is a call on whether to write one. Note §31.2's phone-landscape row means the answer is *not* urgent for correctness: nothing is broken today on a rotated phone, it is merely a centred column. |
| **§31.5's residue after the 2026-09-21 cross-device pass** | All six §31.5 requirements were applied on 2026-09-21 and verified (every screen loads, 10/10 behavioural tests, keyboard and scope checks clean). Three things are deliberately left. **(a) The top-nav cluster cannot reach a true 48 × 48.** `.nav` packs its controls at `gap:8px` inside a 52px bar, so two adjacent 48px hit areas overlap by 8px and the wrong control wins in the overlap; they currently get 48px vertically and gap-limited width (40 × 48), which clears WCAG 2.5.8's 24px floor but not Android's 48dp. Closing it means rebalancing that bar's spacing, which is **§4.2's call** — a design decision, not a mechanical fix, which is why it was not taken unilaterally. **(b) Zoom is still blocked in the 43 `mockups/` files, the 7 `old versions/` files and the frozen `prototypes/wo-workflow/index.html`** — 51 files, deliberately untouched: mockups are internal design artifacts read on a desktop, and `old versions/` is history by convention. Fix them only if a mockup is ever put in front of a participant. **(c) `safe-area-inset-left/right` is still unused**, and it is tracked in its own row — note that adding `viewport-fit=cover` to make `env()` report real insets was tried during this pass and **reverted**, because it immediately pushed the bottom nav under the home indicator: every bottom-anchored element has to be audited in the same change, so it belongs with the band work rather than here. |
| **iOS under 16.4 leaves the installed PWA window on cross-file navigation** | Opened 2026-09-21 with §31.6. The manifest makes Add to Home Screen launch fullscreen with no browser UI, which is most of what separates an installed app from a web page. But **in iOS standalone mode, only 16.4+ keeps an in-scope navigation inside the installed window** — older iOS opens Safari on the first link tapped. This app navigates across 17 separate HTML files constantly (§24), so on older iOS the installed experience degrades to an ordinary browser tab immediately. **Nothing in the prototype can fix it** — it is not a defect to chase but a reason to record participants iOS versions before a research session, and one more argument for the §20 compiled-shell item (a single-document shell would navigate within one file and sidestep it entirely). Android and desktop Chrome handle in-scope navigation correctly. |
| **Four screens still carry the prototype banner** | Opened 2026-09-21 with §31.6, which moved the three demo controls into a header menu. Four screens have neither an avatar nor an ellipsis menu, so there is nothing to inject into and they keep the banner: **Login** (pre-auth, and the only place to set the demo up before a session starts — arguably correct to keep), the **card-standard** and **field-behavior** component references (developer pages, not app screens — also arguably correct), and **Equipment List** and **Sync Status**, which are not. Equipment List is the one worth fixing: it is **browsing-tier and should carry the avatar** under §4.2 exactly as WO List does, and once it does `ensureProfileMenu()` injects the §4.3 dropdown and the banner comes off with no further work. Sync Status needs a call on which tier it belongs to first — it is reached from the nav sync control rather than from a list, so it is not obviously either. **Do not fix this by inventing chrome**; the whole point of §31.6 is fewer dev affordances on screen, not more. |

# 21. Superseded Design Decisions

Decisions that were reversed. Kept here for history only — nothing in this
section is current; the active section listed under "Superseded by" is
the only one that governs anything. Per the reorg convention (2026-07-15):
a superseded decision gets physically relocated here, not left inline in
its original section with a note attached.

| Former decision | Superseded by |
| --- | --- |
| **"There is no Stop Timer action, and that is a decision"** (§30.21, 2026-09-17, held for a matter of hours). The argument: stopping a timer produces a labour record, a labour record needs a screen, that screen is Book Labor — so a Stop placed anywhere else needs a second labour form invented behind it, diverging from §18.4 the first time it changes. **The premise was wrong**, and §30.11's own paradigm is why: §18.4's whole field set is derivable from a running timer plus the session, so nothing has to be asked and no form has to exist. Recorded because the reasoning is seductive and reads as sound — it is worth knowing it was tried and where it broke, rather than re-deriving it the next time an action looks like it needs a screen. | §30.21's **Stop Timer** (2026-09-17, user direction). The action books the time itself; `User selected` mode confirms with **Hours editable and every derived field protected**, which is the narrow version of the form the refusal feared. One consequence survived unchanged: the rail's timer pill keeps its own manual stop. |
| **§12 tier 2 keyed one row per `(WO Type, User Group, Tab)`** — "one row per tab is the point, not an implementation detail," on the reasoning that it made *"a tab is either a step or a More entry, never both"* a **key** constraint rather than a validation rule, which is what stopped forward gating from being bypassable. Rejected at the time: a separate list of More tabs, and overloading `Sequence = null`. | §29.2 (2026-09-08, on five workflow-authoring requirements) — the key gains an **`Instance`** dimension: `(WO Type, User Group, Tab, Instance)`. Two requirements broke the old key and turned out to be the **same** requirement: a tab placed more than once, and a second Record View carrying a *different* layout. **What survived intact:** the constraint that made one-row-per-tab worth having, one grain finer — an *instance* is either a Step or a More entry, never both, because `Placement` sits on the instance row, so a More entry pointing at the same tab is a different row and forward gating stays unbypassable. **What it cost:** `R5PAGELAYOUT` gains a page-variant dimension (§13), blank for instance 1. To revert: collapse instances back to one per tab, and the second-Record-View requirement goes with it — they are not separable. |
| **§26.5's sync row: "one per group, edited *here*, field-shaped"** — `record type × filter scope × horizon × row cap`, with the explicit reasoning that "sync config is the only one of the four that is genuinely field-shaped, which is why the *select a UG, edit a handful of fields* instinct kept surfacing — it was right for one domain out of four." Its Scope list offered **"All records."** | §29.6 (2026-09-08), on two decisions taken after §26.5 was written. §2.1 reversed the polarity to **online-first**, so "what a device downloads at login" stopped being the question — "what is guaranteed *executable offline*" is narrower and different. §2.10 then named the unit: an **offline profile**, a named bundle of §2.7's registry, its caps and §2.8's lookup classes, **assigned** per user group — grain one artifact → many groups, which §26.5.1 had already ruled on. So the instinct was right for **zero** domains out of four, and User Group Setup is simpler than §26.5 described, not more complex. **"All records" is now refused outright by §2.7** ("at least one filter per entity"), which is independently fatal to the old row set. To revert you would first have to re-open §2.1. |
| **Platform: "iOS and Android — responsive PWA"** (§1 header table, since v1). Carried unexamined from the earliest version of this doc, and it quietly shaped how the Contractor/BYOD requirement was reported — as satisfied by a browser-native delivery target. | §2.2 (2026-08-25, user direction) — **a native React Native app.** The doc had been asserting both a PWA *and* `op-sqlite`, which is React Native-only with no browser build, so the two statements could not both be true. Three further reasons in §2.2: WatermelonDB's web adapter cannot serve Tier 2's FTS5 requirement, Background Sync is absent from Safari so the outbox could not drain while the app is closed, and iOS storage durability cannot support "an unsent edit can never be lost." The knock-on at the time was that **Contractor/BYOD became an open item rather than an answered one** *(and it stayed open until 2026-09-11, when it was scoped out of this app entirely — see the row below and §2.2)* — the SWG asked for browser-native access and this architecture does not provide it. To revert would mean re-opening the engine choice toward `wa-sqlite`/OPFS and accepting weaker sync and durability guarantees; it is not a delivery-target toggle. |
| **The step rail's "Reference" group, defined as Comments & Documents** (§14.8, added 2026-07-22). Named "Reference," and framed as a specific affordance for two pieces of "persistent record-level content owned by WO Record View alone," with Equipment later bolted on as "a 3rd row." Membership *was* the definition: three fixed rows, hardcoded in `WO_REFERENCE_LABELS` and `stepMapReferenceGroupHtml()`. | §14.8 (2026-08-25, direct clarification of intent) — the group is **"More"**, and it holds **whichever of the function's tabs the admin placed outside the sequence**. Comments and Documents are the obvious defaults, not the definition. Two reasons the old name had to go with the old framing: everything in the group is **editable** (add a comment, attach a document, insert/delete equipment rows), so "Reference" claimed a read-only-ness that was never true; and the claim gets worse exactly as membership widens — a configurable group could hold a Permits or Safety tab, filing something you sign under "Reference." The *mechanism* is unchanged and was never in question: pinned after the last numbered step, plain icon rather than a numbered badge, ungated by construction. To revert the name only: `stepMapMoreGroupHtml()`'s group label in `eam-shared.js`, the `.step-map-group-label` comment in `eam-shared.css`, and this section's heading — the data-driven `WO_MORE_TABS` shape is independent of what the group is called and should not be reverted with it. |
| **Tier 2 projection = the *union* of the screen's dataspy projections** (§6.13, locked and revised the same day, 2026-08-25). The index would hold the union of every indexed field across the screen's dataspies, **defaulted to the union of each dataspy's first 6 columns, overridable per field by an `Indexed` flag, and capped**. Costed on the assumption of a handful of concentric dataspies — WO's All / All Open / My Open — giving ~8–12 distinct columns and ~450 bytes/row. | §6.13 "**The Tier 2 projection is *declared*, never derived from the dataspies**" (2026-08-25, same day, on the correction that **dataspies are unbounded** — admin-published plus user-authored, on any screen with records, with users normally permitted to create them). The union default does not survive that: with thousands of dataspies the union exceeds any cap immediately and permanently, so "which columns survive the cap" becomes an arbitrary truncation rather than a default; and worse, a user saving a personal query would reshape the index on every device. **What survived the reversal:** the `Indexed` flag itself, and every argument about *where* it is authored (Screen Designer, riding Tier 0's `0c`) — the flag was promoted from *override* to *primary source*. **What it took with it:** the "cost is small because dataspies overlap" reasoning, which was only true of the concentric three-dataspy example. To revert you would first need dataspies to be a bounded, admin-only set. |
| **A standalone offline-search summary doc** — `EAM-Mobile-Offline-Search-Architecture-Summary.md` (created July 2026). A satellite doc restating the tiered record model, the `wo_index` schema, the lifecycle columns and the dataspy handling, alongside §2.3/§2.6/§6.13 which specify the same things. | **Retired to `docs/old versions/` on 2026-08-25** in the doc-hygiene pass, because it was a **proven** drift source, not a hypothetical one: it still described Tier 2 as "~8–12 projected fields" and the grid as showing "5 summary fields" more than a month after §6.13 (2026-07-20) redefined both to 6, and 4 of its own 5 cited source files no longer existed. Every offline change had to be made twice, and the second copy silently lost. Its two genuinely unique pieces were **migrated before retirement**: the row-lifecycle state machine into §6.13, and the SWG "Search & Knowledge" sub-themes into the leadership review's §2.1. **The rule this establishes: a locked rule gets exactly one home — this doc — and other artifacts point at it rather than restating it.** To revert, restore the file, but re-derive its content from §6.13 rather than trusting what is in it. |
| **A separate Workflow Designer admin screen** — `eam-workflow-designer-v1_1.html` (built 2026-07-21, never documented in this doc, CLAUDE.md or the plan doc). Its own visual system (DM Sans/DM Mono, teal-purple palette), and it modelled a considerably larger scope than §10–§13 lock: **workflow revisioning** (Draft / Current Rev / Create Rev), **conditional visibility**, **allow skip with reason**, a node graph with an explicit "fallback when no criteria match," and blank-workflow / create-from templates. | §10 (reaffirmed 2026-08-24/2026-08-25) — "**one surface covers both workflow-driven and non-workflow screens** … there is no separate admin surface for workflow-driven screens." WO Workflow configuration is authored through **Screen Designer**, which gains a WO Type selector; §26 adds User Group Setup as the *binding* side of the same model. **Retired to `prototypes/standalone/base screens/old versions/` on 2026-08-25** and unlinked from `screens.html`. Two things about it are worth keeping in mind rather than losing with the file: its conditional-visibility and skip-with-reason modelling overlaps **§13.1–§13.4, which are deliberately deferred to Phase 4+** — so it is not evidence that question is settled — and it is the only artifact that has considered **workflow revisioning**, i.e. a live configuration being edited while technicians are mid-workflow against the previous version. §13/§26 do not currently address that, and it is a real problem when workflow config becomes editable in production. To revert: restore the file from `old versions/`, re-add its `screens.html` card, and amend §10's one-surface rule first. **Partially reversed 2026-09-16 — see §30.** The *field-level* half of this retirement still stands and is what killed the file; the "no separate workflow surface at all" half did not follow from it and was reversed on direct instruction. §30.1 separates the two claims. The file itself stays retired — §30 is a new prototype, not a restoration of this one. |
| **The base desktop UI, as a design target at all** — `eam-base-desktop-ui-prototype-v1.html` (built 2026-08, 3,573 lines, §26.5 cites it as the component source for the retired User Group Setup prototype). It reinterpreted the base product's own desktop record surface in the app's design language: a left nav instead of the top menu bar, the list/split/record tri-toggle removed, the 14-icon toolbar reduced to Save plus an overflow per §8.4, Insert as its own surface, and a banner/header split so the fields that identify a record cannot be collapsed away. | **OUT OF SCOPE — user direction, 2026-09-16: "Desktop UI is completely out of scope for this project. It is just the Mobile App and this portal now. Total."** Moved to `base screens/old versions/`. **This is a scope decision, not a quality one** — nothing in the file was wrong, and its §8.4 application was a correct reuse of a locked rule. What it means going forward: the base track is **the portal and nothing else**, so "restyle onto the Base/Desktop UI components" is no longer a fix for anything (it was the standing answer to the two-visual-languages problem, which closed the same day by both surfaces going away). The **four departures from base** and the **banner/header split** were never written into this spec — they live only in that file's own header comment, which was flagged and is now deliberately not being promoted, since a spec section for an out-of-scope surface is the kind of doc debt §21 exists to prevent. To revive it you would be re-opening the scope statement first, not the design. |
| **User Group Setup as its own admin screen** — `eam-user-group-setup-prototype-v1.html` (built 2026-08-24, §26). A sibling base screen reached by URL or by Screen Designer's deep link, and the *only* surface answering "what does group X get?". Its flyout linked out to Screen Designer and to the already-retired Workflow Designer. | **The screen is retired 2026-09-16; §26's model is not** (user direction: "this will be the single base screen entry point/portal"). The Workflow Designer Portal (§30) is now the one base-screen entry point, and mobile configuration is **areas of one surface** rather than a folder of siblings that link to each other. Retired to `base screens/old versions/`. **What survives and must be rebuilt in the portal's User Groups area, not re-derived** (§30.2, and listed in that area's own panel so an admin reads it too): binding-screen-not-config-form; **no insert at all** rather than a disabled Create; declared-vs-effective as three *shapes*; the cross-domain consistency strip, which only a group-side view can compute; capability gaps **reported** and keyed on the *configuration* rather than the function (the form that killed a live false positive); and §29.6's Offline tab with its two never-switchable layers and `None`-is-valid treatment. `test-user-group-offline.js` was **not** deleted — it now runs against the archived copy, so those rules stay executable code. Two debts opened by this, both in §20: the assertions need **re-pinning** against the portal once the area exists, and Screen Designer's `sessionStorage.eamDesignerEntry` deep link has **lost its only producer** (the consumer still works; nothing writes it). To revert: move the file back, restore the portal flyout's link to it, and re-point the test — but the entry-point decision would have to be re-opened first. |
| **Comment header — no avatar/profile picture** (§7.2). A comment's header row showed exactly two things beside its timestamp: the author's display name and the Edit/Delete/Copy ellipsis. Reasoning given: name text alone carries enough identity for a comment thread, and omitting an avatar "keeps the row from competing visually with the ellipsis." | §7.2 (2026-08-11, confirmed after being flagged) — the chat-style comment card shows a **26px initials avatar** before the name. The first half of the old reasoning was a judgement call; the second half became factually obsolete when the card moved the ellipsis out of the header row entirely and pinned it to the card's top-right corner, so there is nothing left in that row for an avatar to compete with. To revert: drop `.comment-avatar` / `.comment-item[data-mine="true"] .comment-avatar` from `eam-shared.css` and the `<span class="comment-avatar">` (plus `commentInitials()`) from `renderCommentItemHTML()` in `eam-shared.js` — the rest of the card treatment is independent of this call. |
| **Sync control — five states** (Synced/Syncing/Offline/Pending/Error), with a separate orange "Pending" state ("reconnected, outbox flushing in order") distinct from purple "Syncing" ("outbox draining right now"). | §4.4.1 — four states (Synced/Offline/Syncing/Error). Pending and Syncing described the same event; connectivity alone now decides Offline vs. Syncing. Syncing itself moved off purple onto a distinct gray shade (§23). |
| **Master field-type reference — `sample-screen-standard-model-prototype.html`** — one canonical example of every field type, rule written as an inline caption, plus the full List/Detail header + Insert Mode reference build. | §5.2 "Grid vs. List field-type consolidation" — `screen-layout-field-behavior-prototype-v1.html` replaces it (every type shown in both Grid and List, not just one); the old scaffolding (header actions, tab rail, Insert Mode, Comments/Documents) is dropped since each has its own canonical home elsewhere. Retired to `prototypes/standalone/old versions/`. |
| **LOV description-first**, then **LOV row: description only** (with a `CODE_VISIBLE_FIELDS` opt-in exception list for Cost Code/Store). | §3.4 "LOV field: code + description" — code + description is now the default for every plain LOV field. Organization (§3.4.1) is its own stricter case — code only, no description. |
| **Collapsible header block (WO + Equipment)** — collapsed showed code+description, expanded showed status+location via a tap gesture; duplicated the nav bar's own static title. | §5.2/§5.3 "Header rev. 2" — status-forefront, scroll-collapsing, no tap gesture. |
| **WO workflow chrome, draft 1** ("Record View keeps `.rec-header`, every other step keeps `.wo-block`") and **draft 2** ("all 5 steps use the full `.rec-header`"). | §15.4 "Chrome — final split" — only WO Record View is a true Record View; the other 4 steps use the protected List/Detail identity header (§8). |
| **WO Closing status banner: Option A** — small mono chips squeezed beside the icon, retinted per selected status. | §19.2 "Status control: Option D" — its own row below a simplified title, Inter not mono, a bigger solid-fill button, protected/unprotected states. |
| **WO Closing status control, Free Form case** — swap to Record View's own status-forefront header instead of the banner. | §15.4 — one control either way (§19.2 Option D); Free Form just toggles that control's protected/unprotected state. |
| **Protected status control — old treatment**: button/pill disabled entirely, fill greyed out, chevron hidden, tap did nothing. WO Closing's "to" pill also had its own independent green/gray/orange colour set. | §15.4/§19.2 — colour always shows regardless of protection; chevron swaps to a lock icon; tap shows an explanatory toast. Colour vocabulary unified with the header's `STATUS_CLASS_MAP`. |
| **Sync Status Screen — field-level trouble surfacing** (banner listing offending fields as tap-to-jump links, red left-bar on the flagged field, Retry gated until it cleared). | §4.5 — confirmed not technically feasible: real server responses never return which field caused a rejection. Removed in full; tier-3 ("no further detail given") is now the only flow. |
| **WO List Detailed card / table — bespoke WO-only anatomy** (§6.5/§6.6) — hardcoded WO-specific fields and columns, exempt from a generic pattern. | §8.3 "List Search Screen standard" — one card/list standard for every dataspy-scoped list; WO's fields populate it via its own dataspy column order. |
| **WO due-date urgency treatment** (§6.8) — Today/Tomorrow got emphasis styling. | §8.3 — every date field, including Due Date, renders plain `MM/DD/YYYY`, no relative/urgency formatting. |
| **Search screen filter chips — fixed row** (§6.11) — always Type · Status · Department · Priority, hardcoded. | §8.3 — filter chips (and sort options) are dataspy-driven: the same 6 fields the card surfaces. |
| **Dataspy bar — live record count** (§6.3). | §8.3 — dropped entirely; one less number to keep accurate across sync tiers. |
| **"WO Workflow Setup" — a bespoke 3-screen base-EAM admin entity**, with its own Steps tab and Screen Designer tab, invented from scratch alongside real EAM admin surfaces. | §11–§13 — no new admin screen; Screen Designer (§10) itself gains a WO Type selector. |
| **Intermediate proposal: route each WO Type to its own distinct `FUN_CODE`**, mirroring this customer's real `CCJOBS`/`TRJOBS`/`ZJ1000`/`WSJODC` precedent. Technically sound and grounded in real data, but rejected. | §11–§13 — fragments the WO List dataspy mechanism (§6.3/§8.3) across multiple functions' dataspy sets for no benefit. Final answer stays on one function, `WSJOBS`, always — the WO-Type dimension comes from a new `PLO_WOTYPE` column plus the new WO Workflow Tabs table (§12). |
| **WO colour language — Type tinted, Status 4-way hex** (§6.7) — Type was a 6-way hex-per-code text tint; Status was a 4-way hex-per-code solid pill. | §6.7/§23 (2026-07-22) — Type loses colour entirely (not one of the 3 instruments); Status converges onto the app-wide 3-tier fill vocabulary (green/outlined/red). |
| **Type has no colour anywhere** (§6.7/§23, 2026-07-22) — the row directly above. Scoped to the rebuild exercise then underway, not meant as a permanent rule. | §23.3 "WO Type Colour + Icon Badge" (2026-07-28) — Type regains colour via a curated 5th instrument, reused identically across the Type field, WO List row, and step rail. |
| **Comments & Documents reachable via an ellipsis-menu entry** (§14.8) — each menu row showed a trailing count; kept out of the step map to avoid implying sequence membership. | §14.8/§23 — a "Reference" group inside the step rail's own expanded map, pinned after the last numbered step, using a plain icon (not a numbered badge) so it doesn't imply sequence. |
| **Equipment on-record display — standalone bordered card** (§15.5) — 40px class icon + Description/Code/Type + chevron, one tap target opening the Equipment Lookup sheet. | §15.5 — Equipment is now an ordinary full-width/required `.attr-item` inside the same grid as Type/Priority, 28px badge icon, Type line dropped, description-over-code stack. |
| **Step rail colour keyed to Free Form/Not Free Form** — purple wash by default, Octave Yellow for Not Free Form workflows. | §3.2.2/§15.4 — removed outright; the rail now looks identical regardless of Free Form state. This is a real gap (no visual signal at all today), not a locked replacement — see §3.2.2's flagged-to-revisit note. |
| **Tab rail / step rail background — purple-tinted wash** (collapsed bar wash/border/hover; a lighter wash on the expanded list's active row; a purple 3-sided frame around the expanded list matching the collapsed bar's own inset). | §14.2 — plain `var(--bg-card)` fill + elevation shadow, no colour wash at all (§23 retired purple as a UI-state accent). |
| **"Step/Tab Rail Shell — Flush Full-Bleed Card"** (named for an easy revert, 2026-07-28) — the shape §14.2 described before the pill: `.tab-rail, .step-rail{background:var(--bg-card);border:none;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:0 16px;flex-shrink:0;cursor:pointer;transition:box-shadow .15s;}` (dark: `box-shadow:0 1px 6px rgba(0,0,0,.3);`), hover `box-shadow:0 2px 6px rgba(0,0,0,.14)` (dark `0 2px 10px rgba(0,0,0,.4)`) — full-bleed, no rounding, no margin, no WO Type glow (the Type instrument instead drew a 3px `border-left` edge bar via JS, `renderStepRailTypeSlot()`). To revert: paste this block back over the pill rule in `eam-shared.css` and drop the `--rail-glow-color` var usage. | §14.2 "Surface: floating pill/capsule" (2026-07-28) — `border-radius:28px`, `margin:10px 12px`, shadow tints toward the WO Type's curated colour on the step rail (§23.3). Picked to put the rail's shape in line with Insert Mode's own pill selector at the top of the form. |
| **WO Type colour — Vivid** (§23.3, 2026-07-28 morning) — `wo-type-palette-options.html` Option 2: Breakdown `#E0A83B`, PPM `#17B3A0`, Routine `#5C86C4`, Corrective `#A855F7`, held in hue-named vars (`--wo-type-amber/teal/slate/plum`). | §23.3 "Primary" (2026-07-28, same day) — bolder still, vars renamed by family (`--wo-type-breakdown/-ppm/-routine/-corrective`). |
| **"Required Field Marker"** (named for an easy revert, 2026-07-28) — a red left-bar on every required field (`.form-field.required::before`/`.attr-item.required::before`, `background:var(--red)`, same 3px/rounded shape both rules shared) plus a red outline-square count badge on any container holding one (`.required-count-badge`, `updateRequiredBadges()` in `eam-shared.js` used to create/insert it, not just remove it). To revert: restore both `::before` rules with that background, and restore `updateRequiredBadges()`'s create-badge branch (see its own comment in `eam-shared.js` for the exact prior body). | §23/§3.4 (2026-07-28) — removed outright: every required field's own edit popup already blocks Clear (`shouldHideClear()`/`isRequiredField()`), so the marker warned about a state that can't happen. The `.required` class itself is untouched, still gates Clear-visibility and the new empty-Save check (§3.4). **Not reopened by, and not the same instrument as,** the "Required-but-Empty Marker" added 2026-07-31 (§3.4) — that one is dynamic (empty-only, app-wide outside Insert Mode) and exists for a case this removal's own reasoning never covered: a field that was never set in the first place under a looser WO Type × User Group layout (§11-13), not one that went from set back to empty. |
| **"Header Description — Inline Edit"** (named for an easy revert, 2026-07-28) — tap `#recDesc` in place, swap to an auto-growing `.rec-desc-edit` textarea (`onDescTap()`/`onDescBlur()`/`autoGrow()`), blur saves. No popup, no Clear (description was implicitly required but never enforced). To revert: restore `.rec-desc-edit`/`.rec-desc.hidden-while-editing` in `eam-shared.css`, restore `onDescTap()`/`onDescBlur()` in `eam-shared.js`, and point each header's `.rec-desc` `onclick` back at `onDescTap(event)`. | §5.3/§3.4 "Header description is editable" (2026-07-28) — `openDescEditor()` opens the shared long-text editor's `.compact` variant instead; description is now explicitly always-required (`ALWAYS_REQUIRED_LOVS`), gated by the same empty-Save block as any other required text field. |
| **"Required Fields — Popup-Only Editing"** (named for an easy revert, added AND reverted 2026-07-31, direct instruction, same day) — a required field could never use in-place/inline editing regardless of base type; it had to open a popup sheet (`openLov`/`openEdit`/`openDate`/`openDateTime`/`openTextEditor`), closing off "Free Text (inline)" (`.field-inline-input`) as an option the moment a field became required. Real consumers converted under this rule: Insert Mode's own Description field (`insertDescription`, 3 files — WO List/Equipment List/Home) and WO Record View's Activity Add/Edit popup (`activityNumber`/`activityPeopleRequired`/`activityEstimatedHours`, which also lost the popup's empty-Save gate on revert — they're raw `<input>`s again with no gate, same as before this rule ever existed). The canonical reference's "Inline Text — Required" example row (`screen-layout-field-behavior-prototype-v1.html`, both Grid and List) was removed along with it. To revert (i.e. re-apply this rule): see the pre-revert diff for the exact conversions — `openTextEditor('insertDescription', ...)` for Description, `openEdit('activityNumber'/'activityPeopleRequired'/'activityEstimatedHours', ..., 'number')` for the Activity fields. | Reverted outright, direct instruction — required fields are allowed in-place/inline editing again, same as optional ones; "Free Text (inline)" has no required-ness carve-out. **Not affected by this revert:** the Required-but-Empty Marker (§3.4, row above in this table) — that's a separate, orthogonal instrument (a visual flag on any empty required field, inline or popup) and stays exactly as-is; `updateEditSaveGate()`'s Save-block on `openEdit()` (§3.4) also stays, since it's a generic improvement to the popup path itself, not something that forced any field into using it. |
| **WO List's own bespoke Search-screen chrome** — `eam-wo-list-prototype-v5_1.html` never actually migrated its dataspy sheet (`.ov`/`.sheet`/`.sh-*`, `#dsOv`), filter-chip row + sheet (`.chips`/`.chip`/`.chip-badge`, `#csOv`), search bar (`.s-wrap`/`.s-row`/`.s-inp`/`.s-clr`), and toast (2 local instances, `#t1`/`#t2`, `showT1()`/`showT2()`, plus a `showToast(){showT1(msg)}` shim that silently overrode the shared `showToast()` — the shared `#toast` element sat unused in this file's own DOM the whole time) onto the shared component system, even though this file is documented (CLAUDE.md, §8.3) as "the template" every other list/search screen copies. Found 2026-07-31 when a user cross-check ("Equipment's Search screen doesn't match WO List's") turned out to mean the opposite — Equipment's copy (`eam-equipment-list-prototype-v1.html`) already used the shared components correctly; WO List was the outlier. | §8.3 (2026-07-31) — migrated onto the same shared classes/functions Equipment List already used: `.ld-search-bar`/`.ld-search-input`/`.ld-search-close`, `.filter-chip-row`/`.filter-chip`/`.chip-count`, `.bottom-sheet`(`#dsSheet`/`#csSheet`)/`.sheet-handle-row`/`.sheet-header`/`.sheet-close`/`.sheet-title`/`.sheet-clear-btn`/`.sheet-body`/`.sheet-footer`/`.btn-contained`, the single shared `#sheetOverlay`/`openSheet()`/`closeAllSheets()`, and the single shared `showToast()`/`#toast`. `openDS()`/`openCS()`/`renderCSRows()`/`togCS()` now render `.lov-option`/`.lov-check` rows instead of `.lov-row`/`.sh-row`; `closeDS()`/`dsOvTap()`/`closeCS()`/`csOvTap()` are gone (the shared overlay's own `closeAllSheets()` covers click-outside-to-close). The in-sheet chip search box (`filterCSRows()`/`#csSearch`, §6.11-locked) was kept — rebuilt on the shared `.lov-search-row`/`.lov-search-input` markup rather than dropped, even though Equipment's own copy of this sheet lacks one (separate gap, §20). Screen 2's result-count row also moved off a local `.s-rhdr`/`.s-rc` onto the same shared `.res-row`/`.res-count` Screen 1 already used. `LS_FAVORITE_DS_KEY`/`getFavoriteDS()`/`isFavoriteDS()`/`toggleFavDS()` and every WO-specific content piece (Detailed↔List mode toggle, parent/child expand, `renderStdCard()`'s local override, `openWO()`'s Type routing) are untouched — this was chrome-only. |
| **Route/MEC — optimistic pill, commit on exit, and a sticky cleared-Route pill** (§16.9, 2026-08-10 morning) — selecting/clearing Route only updated the pill locally; the real transaction (adding the Route's equipment, spinning up child WOs) was described as committing when the technician left the screen. Clearing Route deliberately did **not** remove equipment already committed: `equipmentTabTotal` was left untouched by `LOV_ON_CLEAR.route` so a since-cleared Route still fell through to a "Multiple Equipment" pill "rather than losing the signal entirely." | §16.10 (2026-08-10, direct instruction) — commits **immediately** into a shared, persisted per-WO equipment store; clearing the Route removes that Route's rows (manual ones survive); and the pill is a pure function of the stored rows — **rows exist or there is no pill**, so a cleared Route can no longer leave a stale one. `equipmentTabTotal` is gone entirely. |
| **Route lives outside the Header Fields grid** (§16.9, 2026-08-10 morning) — Route was given its own List row in "Work order details," deliberately not in the grid alongside Equipment, on the reasoning that a field which merely *drives* Equipment's pill is still "a genuinely separate value/field, same different-field-different-row rule as any other 2 fields that happen to interact." | §5.2/§15.1 (2026-08-10, prototype-only request) — Department and Route moved up into the Header Fields grid as a paired bottom row. Department's move is what §5.2 always wanted (it's non-nullable); Route is a deliberate **exception** to the grid's required-fields-only rule, kept because it pairs with Department and sits beside the Equipment row whose pill it drives. |
| **Offline-first reads — "UI always reads from local DB, never waits for network"** (§2.1, since July 2026). The core pattern for the project's whole first phase, and the premise under which every §6.13 tier rule was written. | §2.1 "**online-first reads + an always-on outbox**" (locked 2026-09-08, user direction). **The requirement inverted the polarity, not the design's quality:** R1 asks for *"online-first, offline capability for transactions of only specific entities."* What survives unchanged is everything that was never about read polarity — one write path, the persisted outbox, no mode split, the UI never reading from the network directly. **Four options were weighed** before landing here: **(1)** online-first, offline scope = what is on the device (**taken**); **(2)** the same plus a thin product-fixed local index; **(3)** the status quo — a declared `Indexed` set with dataspy classification; **(4)** an explicit Online mode / Offline mode (**rejected outright** — it is the mode split §5.1 exists to reject, and the SWG named "not a mode choice" as the requirement). Option 1 was taken on five grounds: it is what R1 asks and the only option that *improves* R4; it is the market consensus, while no surveyed vendor implements Option 3 at all; its row lifecycle is a strict subset of Option 2's, so deferring costs nothing structurally; three independent findings converged on it; and the index had been designed before anyone knew whether it was needed. **Shape the schema so Option 2 stays additive.** |
| **The Tier 2 search index, and the six open items that existed to serve it** (§6.13, locked 2026-08-25, superseded 2026-09-08). A lightweight database-wide projection — a **declared `Indexed` column set** (~10–20 columns) authored in Screen Designer, **dataspy classification** into offline-capable vs. online-only, a **configured index scope** parallel to Sync Config, FTS5 "contains" search over tens of thousands of stub rows, the `stub` row state, and the per-row freshness affordance. | §2.1's online-first polarity, which answers "does database-wide record search work offline?" with **no**. Everything in the left column was the *price* of answering yes: **six §20 items closed at once** — the `Indexed` authoring grain, the missing `Indexed` control, the normalised on-device criteria form, the index scope's undefined shape, per-dataspy membership shipping, and the offline-search surfacing pair. Also retired with it: FTS5 as an **engine exit criterion**, and one of §2.2's four native-forcing reasons (the conclusion stands on the other three). **What survived and is load-bearing:** stable row identity, `pinned` orthogonal to `hydration`, ephemeral rows written locally, the server-search upsert rule, and the `full_payload` blob — which is exactly why re-adding an index later is additive. |
| **Conflicts resolved last-write-wins by timestamp** (§2.5, since July 2026). One global rule for every write shape. | §2.5's **per-shape conflict table** (locked 2026-09-08). LWW is **silently lossy**: if the server wrote last the technician's edit is discarded and there is no discrepancy left to surface — the exact failure R6 asks to eliminate, and the exact trust problem the product exists to fix. Tractable only because §2.4's write-enabled set is ~7 shapes rather than 60. **This one was required under every option on the table**, not just the one taken. |
| **A standalone offline-architecture decision brief** — `EAM-DECISION-Offline-Architecture-Options-2026-09-03.md` (created 2026-09-03). A 2,200-line options analysis holding the four options, the market research, the GIS product facts, and its own roll-up instructions. | Rolled into this doc 2026-09-08 on the decision being taken, per its own §13 and CLAUDE.md's *one fact, one home* rule: the accepted rules into §2.1/§2.3/§2.5/§2.7–§2.10, GIS into §28, the open items into §20, and the reversals into this section. **Retired to `docs/old versions/`** rather than deleted, since its market-practice sources and scoring are not reproduced anywhere else. Don't cite it as current. |
| **Equipment List's top-level List/Search screens had no Detailed/List mode toggle at all** — the row directly above explicitly left WO List's own toggle (`.mode-tog`/`setMode()`/`woAllFields()`/`tHdr()`/`tRow()`) untouched as "WO-specific," and it was never separately copied into `eam-equipment-list-prototype-v1.html` either, despite that file already being documented (§8.3's "Applied to," CLAUDE.md) as implementing this standard in full. Found 2026-08-03 via user cross-check ("the equipment search screen... still looks like this — the detail and list toggles aren't present"). | §8.3 "Mode toggle" (2026-08-03) — ported WO List's own screen-local `.mode-tog` markup + CSS override and `setMode()`/`refS1()`/`refS2()` shape verbatim into `eam-equipment-list-prototype-v1.html`. List mode's all-fields table renders via the already-shared `renderStdTable()` helper instead of a local `tHdr()`/`tRow()` pair — Equipment has no parent/child hierarchy, so it doesn't need the chevron/indent logic that kept WO's own table local. |
| **The term "fleet-wide"** (July 2026 – 2026-09-11) — the name this doc used for "spanning every record in the tenant database," as the contrast to the work set. It appeared in §2.1's locked rule, §6.13, §21, the requirements one-pager, the leadership review, and User Group Setup's own explanatory copy. | **"database-wide"**, renamed 2026-09-11 on user direction — "fleet" read as asset-management jargon and was genuinely ambiguous: it sounded like a scope narrower than the whole database, and unrelated *real* EAM vocabulary uses the word (a `Fleet` menu item, `employees.csv`'s `Fleet Customer` column, a `Fleet & Transportation` user group — none of which changed). **No decision changed; this is vocabulary only.** The definition now lives in `EAM-Mobile-Design-Doc-v1.md`'s glossary. Note the leadership **deck** (`.pptx`) may still carry the old term. |
| **"Profile `None` is the Contractor/BYOD answer"** (§2.2/§2.10, 2026-09-08 – 2026-09-11). For three days this doc reported the Contractor/BYOD theme as **answered for reads and writes, unanswered only for the install** — on the grounds that a contractor assigned no offline profile runs as an online-only user of the one unified app, with no customer data at rest on an unmanaged device. | **Contractor / BYOD is out of this app's scope; the base product in a mobile browser is the path** (user direction 2026-09-11). The mechanic is untouched — **profile `None` still exists and still behaves identically**; only its *justification* changed, to an internal online-only user group. What was wrong with the old framing: the theme's actual ask is that **no install be required**, and an online-only mode of a native app still requires the install, so "unanswered only for the install" was in fact unanswered, full stop. Full reasoning in §2.2. The residue is one base-team verification, in §20. **Don't re-derive this as "add a thin browser surface to the mobile app"** — that is a second UI target against the only Medium-priority VoC theme. |
| **The punch list as an A-or-B choice** (§2.6, July 2026 – 2026-09-11). A static sync dataspy (Option A) *or* an `R5PINS` projection (Option B), to be picked at development kickoff. Every version of this doc presented them as mutually exclusive, and §20 carried the choice as an open item for two months. | **Both, with different jobs** (user direction 2026-09-11): the dataspy is the **automatic** layer, named per user group on User Group Setup; pinning is the **manual** layer on top. Neither mechanism can do the other's job — a dataspy cannot express "this one WO because I was asked in the corridor," and a pin list cannot express "everything assigned to my crew" without re-implementing a query engine. **What this costs, stated plainly:** both backend asks are now in scope rather than one, so this is not a free synthesis. **What it buys:** §14.11's device-originated pin stops being an awkward edge case and becomes the designed manual path. Full decision and its five consequences in §2.6. |
| **"No new `FUN_CODE`s"** (§11, July 2026 – 2026-09-11) — locked, and cited in its own defence on the grounds that a function fork fragments the WO List dataspy mechanism across multiple functions' dataspy sets. | **Reopened as a decision required** (user direction 2026-09-11) — see §20 and §11. The fragmentation cost is unchanged and still real; what changed is that it is now weighed rather than decisive, and a new input landed on the other side: **Equipment requires a new screen function that renders by equipment type**, so the tracks are asymmetric unless WO gets one too. **Note carefully what did *not* reopen:** §26.7's per-user-group function resolution is untouched and holds under either answer. The 2026-08-24 amendment to this section — which already split "no new `FUN_CODE`s" from the retired "one function, `WSJOBS`, always" — is what makes this a clean reopening of one claim rather than two. |

# 22. Custom Fields

Admin-defined fields per record Class + Class Org, scoped to Record View
only (Work Order and Equipment so far).

**Not the same mechanic as a User Defined Screen (§27).** Custom Fields add
*fields* to a screen the product ships; a UDS is a customer-authored
*screen*, surfaced as its own destination or as a tab on a delivered
record. A record can carry both, and they must not share an
implementation. What §27 does reuse is this section's *pattern* —
`applyCustomFields()` merging definitions into the screen's own field
globals so no parallel edit path is needed (§27.3).

**That separation is a *sync-layer* rule too, not only a UI one** (added
2026-09-08). There are in fact **three** customer-extension mechanisms and each
has a different offline shape: **UDFs** are plain columns on the record — no
traversal edge, no policy row, offline-complete under existing rules; **Custom
Field values** live in a **separate values table keyed `(entity, record key,
field code)`**, which is **one product-declared traversal edge on a fixed key**
(§2.3's fixed core); and **UDS** is a `U5` table with a per-UDS authored join
(§27.5). **The outbox therefore needs two generic write shapes, not one:** an
**EAV form** `(entity, record key, field code, value)` for Custom Fields, and a
**row-shaped envelope** for UDS. Because the Custom Fields key fixes cardinality
at one row per record per field code, they take §2.5's **field-edit** conflict
rule with no ambiguity.

**Class has two independent offline failure modes, and they need different
messages** (added 2026-09-08). Class *values* are a code domain (Tier 0 `0f`);
Class *definitions* are configuration (`0c`). So on the same screen: the
**definitions** did not ship → the Class should not be pickable at all (§2.8
row 3, `definition-gated`); the **values** did not traverse → the fields render
and say they need connectivity (`not-hydrated`). Conflating the two reports a
configuration error as a sync problem.

| Decision | Detail |
| --- | --- |
| **Container name: "Custom Fields"** | Matches the base-EAM product's own default label for this mechanic. This customer's real environment has renamed their own instance of it to "Class Attributes" (`docs/Data_refs/Pump Asset Example.png`) — this app uses the generic base-product term, not that customer-specific rename. |
| **Conditional render, not empty state** | The container renders only when at least one definition matches the record's own `entity` + `class` + `classOrg`. No match means no container at all — not a collapsed/empty one. |
| **Same shell as any other Record View accordion** | Reuses `.fg-section`/`.fg-toggle-row`/`.fg-collapse` verbatim (Equipment's Asset/Equipment/Tracking Details) — Custom Fields is not a visually distinct component, just a data-driven one. |
| **Group Label — sub-header nested inside the container** | The Group Label renders as a sub-header *within* the single "Custom Fields" `.fg-section`, not as its own separate top-level container — matches the real screen's own nesting (`docs/Data_refs/Pump Asset Example.png`'s "Class Attributes" → "Pump Information" → fields). |
| **Group Label — forward-fill, still pending confirmation** | Separate from the nesting question above: real export data (`docs/Data_refs/Associated Custom Fields to Class PUMP.xlsx`) only carries a Group Label value on the first row of a group; subsequent rows are blank until the next group starts, yet the real screen still renders every row under one heading. Implemented here as: sort by `line`, forward-fill the last non-blank `groupLabel`. **This specific mechanism is still a deliberate call made under ambiguity, not a confirmed spec** — revisit if a future real export contradicts it. |
| **Equipment's real PUMP set is verbatim, not invented** | `FLA`/`INLET`/`OUTLET`/`PHASE`/`HP`, all Numeric, one group ("Pump Information"), Class Org `*` (wildcard) — matches `docs/Data_refs/Associate custom fields.png` and `Custom Fields.xlsx` exactly, including the real sample values (50/2/2/3/5). This is also that screen's field-for-field replacement of the old hardcoded "Pump Information" `.fg-section`, which was Class-gated by a bespoke `updateClassAttributesVisibility()` — now generalized. |
| **WO's sets are invented — no real WO-side example exists in Data_refs** | WO 19257 (Class `PUMP`) gets a 5-field, 2-group, all-5-types set (Seal Type/lov, Discharge Pressure/number, Last Vibration Analysis Date/date, Confined Space Entry Required/checkbox, Permit Number/text). WO 19831 (Free Form, Class `GENERAL`) gets a smaller 3-field, 1-group set. Deliberately different sizes/types/groups from each other and from Equipment's set, to demonstrate the config genuinely varies by class — not just by entity. |
| **WO gained a Class + Class Org and an Organization pill it didn't have before** | Neither existed on this screen before this pass. Organization pill fixes a previously tracked gap (§5.2/§5.3 require it on every Record View header) — same static/protected pattern as Equipment's, value `FBPP`. Class/Class Org are not user-visible fields here (no design decision yet to add a picker) — they're just the gating values Custom Fields reads, sourced from `data/wo-19257.js`/`data/wo-19831.js`. |
| **Full edit infrastructure reused, not reimplemented** | `applyCustomFields()` (`eam-shared.js`) merges matched definitions straight into the screen's own `RECORD`/`FIELD_LABELS`/`LOV_DATA`/`LOV_CURRENT`/`LOV_TITLES` globals, so `fieldRowLov`/`fieldRowEdit`/`fieldRowCheckbox`/`fieldRowInline` and their existing sheets (`openLov`/`openEdit`/`openDate`/`toggleCheckbox`) work on Custom Fields exactly like any native field — no parallel edit path, no read-only special case. |
| **Data source** | `data/custom_field_defs.js` (definitions) + each record's own `customFieldValues` map (`data/equipment.js`, `data/wo-19257.js`, `data/wo-19831.js`). |
| **Container position — configurable via Screen Designer (§10), not fixed** | The Custom Fields container is just another `.fg-section` in the stack, no special pinning. Once Screen Designer exists, its drag-and-drop container placement applies to Custom Fields exactly like Asset/Equipment/Tracking Details. Today's fixed placement (after Tracking Details on Equipment, after Work order details on WO) isn't locked — it's just where it landed with no Screen Designer yet to reposition it. |
| **Class Org `*` fields aren't confined to the Custom Fields container** | A custom field whose Class Org is the wildcard `*` can, via Screen Designer, be relocated out of Custom Fields into any other ordinary field-group container on the same screen — at that point it behaves exactly like a native Standard Model field for container-assignment purposes (§3.3.1, §10's "New Container"). Not yet addressed: whether a field scoped to one specific non-`*` organization behaves the same way — no case of that exists in this app's data yet. |

**Out of scope, flagged rather than assumed:** the general admin-
configuration mechanism itself (how a real customer would define/rename/
type these per Class) — data/rendering only for now. The two rows above
specify *contract*, not implementation — Screen Designer (§10) still
doesn't exist to actually perform either move.

# 23. Color Palette — 3 Instruments, Everything Else Monochrome

Locked, app-wide — applies to every screen. Triggered by a complaint that
the palette felt "busy" (purple + orange + red + green + yellow, colored
mono text).

**The rule:** color exists for exactly 3 things, always the same 3 hues,
never elsewhere:
1. **Status** (the record header's status pill) — green (good/complete),
   red (blocked/on hold), or an outlined neutral for "in progress"/
   standby.
2. **Sync** (the nav-bar sync control, §4.4.1) — green/red/gray/gray-syncing.
3. **Sync-error** — a red left-bar on the field a sync rejection flagged
   (`.form-field.error`). This used to be bundled with a 2nd, static
   "Required" marker under one instrument (a red left-bar on every
   `.form-field.required`/`.attr-item.required`, plus a red
   `.required-count-badge` on the container header) — that static marker
   was **removed 2026-07-28** (direct instruction, see §21's named
   "Required Field Marker" reference for the exact retired CSS): every
   required field's own edit popup already blocks its Clear button
   (`shouldHideClear()`/`isRequiredField()`, `eam-shared.js`), so the
   marker was warning about a state the system never lets a technician
   reach — pure visual noise, spending part of this one red instrument on
   a redundant signal. Sync-error's red stays; it's a live, real-time
   "needs your attention right now" signal, not a static label.

Bumped bolder 2026-07-28 (Primary palette pass, `eam-shared.css`'s
`--green`/`--red`) — was `#00AA14`/`#E24B4A`, both real but comparatively
muted hues next to WO Type's own Primary colours (§23.3).

**Everything else that used to carry a hue is now monochrome — ink
(black in light mode, white in dark) for "selected/active/current," plain
outline for "this is an icon/chip," never a filled color:**
- Purple is retired as a UI-state accent entirely (nav pin, tab/step
  rail wash + active states, dataspy bar, filter chips, LOV/tree/calendar
  selection, row-action hover, sync panel). Selection reads via
  weight/fill (bold text, a filled radio/badge, a left-bar accent)
  instead of a hue. Treat any remaining purple found on an
  as-yet-untouched screen as not-yet-converted, not intentional.
- Icons/chips/badges that aren't one of the 3 instruments above are
  outlined (`1.5px solid var(--border-strong)`, `background:none`), never
  filled with gray or a hue — equipment icons, the org pill, Comments/
  Documents count badges, the rail outline (§14.2). **Exceptions:**
  Priority's Critical value keeps a solid red chip — a deliberate
  exception to "outline only," worth spending part of the red budget on;
  every other Priority value (including High) stays outlined. WO Type is
  a separate, larger exception — see §23.3.
- Mono (`var(--font-mono)`) is reserved for identifiers only — record
  numbers, LOV codes, dates — and is always gray/black/white, never
  tinted.
- Green is NOT retired — `seg-done`/`smi-done` (step rail progress), the
  timer pill's running state, and (added 2026-08-11) the **confirm ✓** on
  keyboard-editing sheets (`.sheet-confirm-btn`, §3.4) all keep green; none
  was the thing flagged as a problem, and each is an existing convention
  ("done," "actively counting," "commit this") rather than a new colour
  instrument. The ✓ deliberately reuses this existing green rather than
  introducing the reference design's blue, which the palette doesn't have —
  and it is **not** written up as a new §23 exception, because it isn't one.
  Its disabled state drops to gray (`.sheet-confirm-btn.disabled`): a faded
  green still reads as "go," the opposite of a blocked required field.
- **Home is a deliberate, named exception to this entire section** — its
  tile icons (`.home-tile-sq`) and favorite-chip icons (`.fav-chip-icon`)
  keep real per-item colour, unlike every other screen. Don't converge
  Home to match the rest of the app without checking — this is a
  considered reversal, not an oversight.
- The step rail's old Not-Free-Form colour variant is retired, not
  reassigned — see §21.

**Rejected alternative:** a fully-monochrome option where even Priority
Critical lost its red was compared side by side and rejected — losing
Critical's red was judged a real loss.

## 23.1 Two derived rules, found applying §23 to Activity Checklist

Not anticipated when §23 was written; will recur on any screen with a
similar pattern, so locking the answer here rather than re-deciding it
per screen:
- **A 3-tier green/orange/red severity scale (e.g. Activity Checklist's
  "Minor/Major/Critical" or "OK/Adjusted" toggle options) collapses to
  2-tier green/red** — orange is retired, and the option's own text
  label already conveys the specific degree, so the middle tier just
  joins red rather than inventing a replacement hue.
- **An action that flags something as needing follow-up (e.g. "Flag for
  Follow-up") uses red, not a new hue or an outline-neutral treatment** —
  it's a 3rd "needs your attention" case, same family as required/sync-
  error, not a primary-confirm action (which would be green) or a
  passive state (which would be outlined/ink).

## 23.2 Editable-pill fill — a 4th instrument, pills only

Added 2026-07-22 (punch-list circle-back, user-picked from 4 mockup
options at `prototypes/standalone/mockups/pill-color-options-editable-
vs-protected.html`). Every true pill component (`.store-selector`/
`.crew-selector-pill`, `.org-pill`) now fills solid ink when editable —
`background:var(--octave-black);color:#fff` light, flipped white/black
dark — the same recipe `.btn-contained` already used, rather than the
old outline/`--bg-section` look. This is deliberately scoped narrower
than §23's 3-color system (status/sync/required): it's a 4th, purely
structural "is this tappable" signal restricted to genuine pill-shaped
controls, not a new general-purpose color instrument. Two explicit
limits, both direct user instruction:
- **Pills only.** LOV-shaped fields (`.attr-item`, `.form-field`) are
  not pills and are untouched, even ones that look similar at a glance
  (e.g. Book Labor's Employee/Crew Header Fields cells — these are
  ordinary LOV cells, not pills, despite the mockup exploring the same
  treatment on them too).
- **Protected pills are untouched.** `.store-selector.protected`
  (Issue Parts) and `.org-pill.protected` (always paired with
  `.in-header` on every live screen — WO Record View, Equipment RV,
  Sample Screen) keep their exact pre-existing look. Since simply
  dimming the new black fill would have looked nothing like the
  original gray outline, both were rewritten to spell out their prior
  colors explicitly rather than relying on opacity alone.

## 23.3 WO Type Colour + Icon Badge — a 5th instrument, Type only

Added 2026-07-28 (direct instruction), picked from
`prototypes/standalone/mockups/wo-type-badge-color-icon-options.html`'s
Option 5. WO Type needed a real visual identity across the app — carrying
it consistently across the 3 places a technician actually reads Type
(the Type field, a WO List/Search row, the step rail) was judged
important enough to justify a 5th scoped colour instrument, same
precedent §23.2 already set for pill-fill. This directly reverses §6.7's
2026-07-22 "Type loses colour entirely" call — that call was itself scoped
to the rebuild exercise then underway, not a permanent rule, so this isn't
tracked as a hedge or an open question; it's the current rule. (History
only, not current: §21.)

**The badge:** one icon + one curated colour per Type, reused identically
everywhere it appears — only the *shape* changes by surface:
- **Type field** (WO Record View, `.attr-item`/`.attr-badge`) — solid
  fill, icon in white (`.attr-badge-fill`). The highest-legibility
  surface, and the one place a technician is deliberately looking to
  confirm what they're working on.
- **WO List/Search row** (§6.7, §8.3's card/table standard) — a small
  solid dot ahead of the plain-text value (`.wotype-dot`), not a full
  badge — a dense card/table row is the wrong place for a 28px badge per
  row, and the field's own label already says "Type."
- **Step rail** (§14.2) — split by the rail's own two real states rather
  than one shape for both. Revised 2026-07-28 (same session, direct
  instruction) from a 3px left-edge colour bar to a Type-tinted glow on
  the rail's own pill shadow — the bar mechanic only ever existed for a
  few hours before the rail itself became a pill (§14.2), at which point
  a straight edge bar had nowhere sensible to sit against a rounded end;
  not tracked as a separate historical reversal, just this instrument's
  own treatment catching up to §14.2's shape the same day:
  - A **real configured workflow** (`renderStepRail()`) sets
    `--rail-glow-color` on `#stepRail` (inline `style.setProperty` —
    eam-shared.css's pill shadow reads this custom property, falling
    back to a plain neutral shadow when unset) to the Type's own curated
    `glow` value, plus a plain colour-tinted icon in `.step-rail-right`
    (`.step-rail-type-icon`).
  - The **§11 free-form fallback** (`renderFlatStepRail()`) gets the same
    icon inside a solid filled circle instead (`.step-rail-type-circle`),
    and leaves `--rail-glow-color` unset (plain neutral shadow, same as
    Equipment RV's tab rail, which has no WO Type concept at all). The
    circle shape doubles as the "no configured sequence" cue this rail
    has needed since `step-rail-workflow-vs-freeform-options.html` first
    raised the question (that file's own Options 1–3) — one element now
    answers both "which Type" and "workflow vs. free form" at once,
    instead of the two staying separate, unresolved questions they were
    left as.

**Colour source — curated, never a raw admin hex:** excludes green/red
(§23's own reserved instruments), same discipline as every stage of this
palette. Went through 3 rounds the same session: **Muted** (original
pick) → **Vivid** (`wo-type-palette-options.html` Option 2, more
saturated) → **Primary** (current, 2026-07-28, direct instruction —
picked alongside removing the required-field marker, freeing part of the
app's attention/colour budget to spend here instead; bold, saturated,
closer to true primary hues than either earlier round). The 4 assigned
vars were renamed by FAMILY rather than hue at the same time
(`--wo-type-breakdown/-ppm/-routine/-corrective`, `eam-shared.css`) — the
old hue-named vars (`--wo-type-amber/teal/slate/plum`) had drifted so far
from their own names across 3 rounds (plum holding a gold, slate holding
a violet) that keeping that convention was actively misleading. Today's
assignment: Breakdown = orange (`#F5821F`), Preventative Maintenance
(PPM) = royal blue (`#2563EB`), Routine (the WO Type LOV's own `*` code)
= violet (`#7C3AED`), Corrective = gold (`#F2C94C`). `--wo-type-blue`/
`--wo-type-rose` stay unassigned and untouched by the Primary pass,
reserved for the next admin-added custom Type.

**Corrective is a deliberate worked example, not a real 4th system Type.**
In this customer's actual EAM data, Corrective work routes through the
same function as Breakdown (`WSJOBS`, unchanged — §11–§13). Splitting it
into its own coloured Type here demonstrates what an admin-added custom
Type looks like riding the same curated palette as the 3 real system
Types (Breakdown/PPM/Routine), per direct instruction — it is not a claim
that Corrective is a distinct system Type in real EAM.

**Two code namespaces, one badge — reconciled, not merged:** the badge
needs to resolve from two genuinely different fields, kept as two small
lookup tables (`eam-shared.js`) rather than one, so the distinction stays
visible in code:
- `JOBTYPE_TO_WOTYPE_FAMILY` — keyed by `jobType` (BRKD/PM/ROUT), the
  internal EAM_WOTYPE workflow-routing key (§11–§13), always in sync with
  whichever demo WO is loaded. Drives the step rail.
- `TYPECODE_TO_WOTYPE_FAMILY` — keyed by the WO's own user-facing Type LOV
  code (`RECORD.type.code` on WO Record View, WO List's own `tp`) — a
  legitimately different field from `jobType` (see `applyDemoWoIdentity()`
  in `eam-shared.js`), whose exact codes vary per screen's own demo LOV
  list (BK/BREAKDOWN/CM/PM/ROUT). Drives the Type field and the List row.

Both resolve into the same `WO_TYPE_PALETTE` (family → icon + colour), so
the actual palette is defined once.

**Bug, found + fixed 2026-07-28:** WO Record View's Type field used to
not sync to the demo-WO selector at all — `RECORD.type` was a static
default, so WO 19831 (PM) and WO 20450 (ROUT) both opened showing
"Breakdown." Originally treated as an acceptable side effect of a
pre-existing, separate limitation (deeper content not swapping across
demo WOs, §11's own note) — but a highly-visible, now-coloured field
showing the wrong value reads as a real bug, not an accepted gap, so it
got its own fix rather than staying bundled with that limitation.
`applyDemoWoType()` (WO Record View, screen-local — the Type LOV codes
are this screen's own, not shared) now syncs `RECORD.type`/
`LOV_CURRENT.type` and repaints the badge via the same `renderColorBadge()`
used everywhere else. Added `ROUT` ("Routine Maintenance") to this
screen's own `LOV_DATA.type`/`TYPE_META` as part of the fix — no demo WO
had ever actually resolved to it before, so it didn't exist yet.

**Icons are reused from the app's existing language, not invented fresh**
— Breakdown and PPM/Preventative Maintenance keep the same
`ico-alert`/`ico-cal-check` shapes already used by WO List's Type filter
chips and WO Record View's own `TYPE_META`; Corrective keeps `ico-tool`.
Routine is new — a plain asterisk, a deliberate literal nod to that
Type's own real code, `*`. Calibration/Inspection/Modification stay
outlined/monochrome, outside this pass's scope (not one of the 3 system
Types or the Corrective example).

**Not yet extended:** Insert Mode's own Type picker (§9.6/§9.7,
`ENTITY_FIELD_META`) still renders its Type/Status badges outline-only —
flagged as a follow-up in `eam-shared.js`, not done here.

**Icon hides while the timer pill is showing, added 2026-07-28 (direct
instruction).** On Activity Checklist/Issue Parts (the only 2 steps with
a running-timer pill in `.step-rail-right`, §14.2/§18.2), the WO Type
icon glyph sitting right next to a coloured, pulsing timer pill read as
part of that timer widget, not a WO Type indicator — a real "which
instrument is this" mix-up, not just a style nitpick. Fix: the icon
glyph hides whenever `#timerPill` is visible in that same slot
(`renderStepRailTypeSlot()`); the colour itself stays either way — the
rail's own glow for a real configured workflow, or the circle's own
background fill for the §11 free-form fallback (that shape stays visible
at its fixed size with no icon inside; only the plain-icon case's now-
empty span actually collapses, via `.step-rail-type-icon:empty`). Known
limitation, not fixed here: this only reflects the timer's state as of
the step rail's own render call (page load) — stopping the timer without
leaving the page doesn't currently re-trigger it, a pre-existing gap in
the timer's own stop handling (`stopStepTimer()` never touches
`#timerPill`'s visibility or re-renders the rail).

## 23.4 Priority Colour — High, a 6th instrument

Added 2026-07-28 (Primary palette pass, direct instruction), Priority's
first real colour past Critical's long-standing red exception (§23's own
item 1 list). High now renders as a solid-fill badge/pill
(`--priority-high`, a magenta/pink — `#DB2777`) via the same generalized
`renderColorBadge()`/`fieldRowBadgeAttr()` path §23.3 already extended
for WO Type — no new rendering code needed, only a `color` value added to
`PRIORITY_META.HIGH` (WO Record View) and `PRI['4']` (WO List).

**Deliberately not orange or red.** Breakdown already owns orange
(§23.3); Status and Priority-Critical already own red. A different
field's colour should never double as a different meaning — the same
rule that motivated §23.3's own reconciliation between `jobType` and the
Type LOV code applies here between Priority and both WO Type and Status.
Low/Medium stay plain text, unchanged.

## 23.5 Counter Badge — one recipe, no gray fills

**Locked 2026-08-10 (direct instruction).** Every "how many of these are
there" badge takes the **Organization pill's recipe** (`.ld-card-org`):
transparent fill, 1px outline (`--border-strong`), full radius, mono — with
**black/white text, never gray**. Gray-filled counters read as muddy in
light mode and make the badge look disabled, which is the opposite of what a
count is for.

- **The one exception is red:** the required-count badge stays
  red-on-outline (`.required-count-badge`), scoped to Insert Mode per §9.8.
  Red is the only colour a counter is ever allowed to take.
- **Normalized:** `.section-card-badge` (Comments/Documents counts on Record
  Views — was a `--bg-section` gray fill), `.rv-badge` (was gray text),
  `.ov-group-badge` (Activity Checklist's done/total group badge, screen-
  local — was a `--bg-card` fill with gray text), `.erp-count` (the Route/MEC
  pill's own count, §16.9). `.qty-badge-planned` (Issue Parts) already
  followed the recipe and is unchanged.
- **Explicitly NOT covered: `.chip-count`.** That's a *filled* black/white
  marker riding on an already-outlined active filter chip — an active-state
  indicator, not a standalone counter. Outlining it would nest two borders
  and weaken the "this filter is on" signal.

Applied as a visual normalization of the existing class names rather than a
new shared class, so no screen's markup had to change.

# 24. Navigation — Record View Back Button + Home Tile Pattern

Three locked rules:

**1. A Record View's back button always returns to that entity's Search
List screen — never straight to Home, never a toast stub.** WO Record
View → `eam-wo-list-prototype-v5_1.html`; Equipment Record View →
`eam-equipment-list-prototype-v1.html` (§24.1). "Maintaining the user's
dataspy and persisting any filters" is the locked *intent* — there's no
real filter/dataspy state anywhere yet to actually persist (§20), so
today this is just the correct navigation target. The pre-existing
`eamSyncReturnUrl` consume-once override (§4.5 — from the Sync Status
Screen's Review action) still takes priority over this default when set.

**2. A Home tile navigates (real page load) to its parent screen's
Search List screen, pre-run to that tile's own dataspy** — e.g. the
"Equipment" tile → Equipment's Search List screen → "All Equipment." Same
pattern for any entity's Home tile. `goToScreen()`
(`eam-home-screen-prototype-v1.html`) resolves every tile/favorite tap to
its parent screen + an optional pre-run dataspy; WO favorites route by
their own real dataspy id, not name-matching. The dataspy hand-off is
`sessionStorage` (`eamPendingSpy`, consume-once) — deliberately not a
`?spy=` query string, since this project's dev server's clean-URL
redirect drops query strings on navigation (same limitation as
`navigateToNewRecord()`, §9.5).

**3. WO List's `openWO()` routes by the tapped row's Type, not a blanket
fallback.** WO List has real Record View data behind exactly 3 WO
numbers (`DEMO_WO_JOBTYPES` in `eam-shared.js`: 19257=BRKD/Not Free Form,
19831=PM/Not Free Form, 20450=ROUT/§11 fallback). **BK routes to the
BRKD/19257 identity, PM routes to the PM/19831 identity**; every other
Type (CM/CAL/INS/MOD/ROUT — none has a configured workflow) falls back to
20450, per §11's fallback rule (`TYPE_TO_DEMO_WO`). Every WO sharing one
of these 3 identities shows the identical Record View content
underneath — there's no real per-WO detail data to show otherwise. Other
entry points that punch straight into a WO Record View (Notifications,
the Sync Status Screen's review flow) intentionally don't duplicate this
Type-based lookup — Notifications defaults unrecognized WO numbers to
the corrective (19257) flow instead. Hand-off is `sessionStorage`
(`eamOpenDemoWo`, consume-once), read before `onDemoWoChanged()` runs.

## 24.1 Equipment Search List screen (new)

`eam-equipment-list-prototype-v1.html` — Equipment's Search List screen,
filling the gap that used to leave Equipment Record View's back button
with nowhere real to go (Equipment's only prior entry point was Home's
Create bar). Copies WO List's §8.3 card pattern (`renderStdCard()`);
Home's Create bar is still the only way to create Equipment.

**Presented like a pull-up, but is a real page — not an in-page popup.**
A real page navigation to Equipment Record View tears down whatever JS/
DOM state Home was holding, so an in-page popup can't be "returned to"
with preserved state the way rule 1 (§24) requires — this needs to be a
real, separate, revisitable page for back-navigation to work in a
multi-page static prototype. It still reads like a pull-up visually: no
bottom-nav (only reachable via Home's "Equipment" tile), and the header's
leading control is an **✕ close** (→ Home) rather than a back-arrow or
avatar, since closing this screen is dismissing an overlay conceptually.
Equipment Record View's own back arrow returns HERE, not to Home
directly. Rounded top corners + a slide-up-from-bottom entrance on load
(`@keyframes`, same transform/easing `.bottom-sheet` uses elsewhere) give
it real sheet motion rather than a flat page swap — a pure CSS
animation-on-load rather than the usual JS classList-toggle pattern,
since it has no dependency on a `requestAnimationFrame` callback firing.

## 24.2 Home — 2 new tiles + Favorites empty-state rule

Two tiles added to `eam-home-screen-prototype-v1.html`'s `HOME_TILES`,
same "My Work"/"My Equipment" groups as the existing ones (still an
open, unlocked content riff — adding tiles isn't locking the tile *set*):

- **"High Priority — Open"** (`tile1b`, group `mywork`) — points at WO
  List's own `ds3` dataspy, which already existed there with no Home
  tile pointing to it. Red (`#E24B4A`, this app's one real urgency
  instrument) rather than either sibling tile's colour, since this tile
  is about *how urgent*, not *what kind* of work, the axis tile1/tile2
  are already on.
- **"Facilities"** (`tile4b`, group `reference`) — points at Equipment
  List's own `facilities` dataspy (already real there,
  `class==='FACILITY'`). Same teal treatment as Equipment/Pumps — icon
  shape distinguishes them, not a 3rd hue, same language those two
  already use. New `#ico-building` symbol added to Home's own sprite,
  copied verbatim from `eam-wo-list-prototype-v5_1.html`'s existing
  glyph of the same name rather than inventing a 2nd one.

**Favorites section header hides entirely when there are no favorites —
locked design decision, not just a code fix.** Zero favorites → the
"Favorites ⭐" label AND the empty row beneath it are both hidden
(plain show/hide, not a rendered empty state); the moment a first
favorite exists, both reappear in the same location. `renderFavorites()`
toggles `#favSectionLabel`/`#favRow` on every call based on
`FAVORITES.length`. Practical floor today is 1 favorite, not 0 (Equipment
still seeds `pumps`; WO no longer seeds a default). **One known, accepted
minor gap:** `.home-section-label:first-child` gives whichever section
label is structurally first a smaller top margin; when Favorites is
hidden it's still the first DOM child, so "My Work" doesn't inherit that
reduced margin — cosmetic only.

# 25. Notifications

`eam-notifications-prototype-v1.html`. Bottom-nav's "Notifications" tab
(Home, WO List) navigates here — a browsing-tier, bottom-nav-root screen
(avatar top-left, not a back arrow, same §4.2 category as Home/WO List),
not a drill-down like the Sync Status Screen.

**Source data — `data/notifications.js` (`EAM_NOTIFICATIONS`), modeled on
R5MAILEVENTS** — the real EAM table already driving this app's email +
push notification system; this screen is a mobile-side read of that
existing log, not a new backend concept. **One real gap, flagged rather
than solved:** the real R5MAILEVENTS schema has no read/unread column —
it's a send log, not an inbox. `read` is invented client-side; a real
build needs a real place to persist it (new column, or a client-local
table keyed by event ID + user).

**Types modeled (7 demo rows):** `wo_status`, `wo_assigned`,
`wo_reassigned`, `pm_due`, `follow_up_created` (the Activity Checklist's
"Create Follow-up WO" action, §16, has a notification on the other end of
it), and **`comment_mention`** — a forward reference. @mention tagging in
Comments is NOT built anywhere in this prototype yet (see the
`project_comment_tagging_circleback` memory note); this notification type
is modeled anyway so this screen doesn't have to wait on that feature.
When tagging IS built, it should fire this same notification type
through this same table, not a separate mechanism.

**Screen behavior:**
- Grouped **Today / Earlier** (literal date match, no relative-time
  smart formatting — the app's "prototype data stays plain" convention).
- **Filter chips (All / Unread)** — the shared `.filter-chip-row`/
  `.filter-chip` component. **Mark all read** is a right-aligned pill
  (`.notif-mark-all-chip`) in the same filter-chip row, disabled/dimmed
  once nothing is unread.
- **Unread state reads via ink weight/fill, not hue** — bold subject + a
  small filled dot, per §23 (read/unread isn't one of the 3 colour
  instruments).
- **Dismiss** — a per-card ✕, gated behind the shared `openConfirm()`
  modal (message clarifies it only removes the notification, not the
  source record).
- **Tap a card → source WO**, using the same `eamOpenDemoWo`
  sessionStorage hand-off as WO List's own `openWO()` — 19257/19831/20450
  open as themselves, any other WO number defaults to the corrective
  (19257) flow. Per §24's locked rule, the WO Record View back arrow
  still returns to WO List, not here. A notification with no `wo` shows a
  toast instead of navigating.
- **Reference row:** `{date} · {time} | Work Order {number}` — the record
  number stays mono (identifier), the words around it don't; `time` uses
  this app's plain numeric date standard (§3.4).

**Bottom-nav badge** — `updateNotifBadge()` (`eam-shared.js`), called
from `initSharedApp()`, no-ops if `#notifBadge`/`EAM_NOTIFICATIONS` isn't
present. Home and WO List both show the real live unread count from
`data/notifications.js`, hidden entirely at 0. Its positioning wrapper,
`.nav-icon-wrap`, is a real shared component in `eam-shared.css` (both
consumers previously hand-copied a local duplicate — now removed).

# 26. Base Screens — Function Resolution & User Group Setup

Added 2026-08-24. Base-EAM admin side only — nothing in the mobile
prototypes changes as a result of this section yet; §26.2's consequence
and §26.4's prerequisite are both tracked as open items in §20.

**Prototype — RETIRED 2026-09-16, model unaffected:**
`prototypes/standalone/base screens/old versions/eam-user-group-setup-
prototype-v1.html` (built 2026-08-24, retired when the Workflow Designer
Portal became the single base-screen entry point — §30, §21). **Everything
below in §26 still stands**: what was retired is one prototype file, not the
binding-screen model, and §30.2 commits to rebuilding this surface as the
portal's User Groups area rather than as a sibling screen. The carry-over
list lives in that area's own panel, and `test-user-group-offline.js` still
executes the §2.10/§27.4 assertions against the archived copy — so they are
the **specification for the rebuild**, not coverage of it.

What the retired prototype covered: Covers §26.5's tab shape and
declared-vs-effective resolver, §26.3's slot binding with a live 390px nav
preview that recomputes §26.4's arithmetic as slots are added, and
and §26.5.1's configuration-assignment grid. Note the prototype went to a
second pass on that last tab — the first version's per-function "workflow
enabled" toggle was a second source of truth and the wrong grain; §26.5.1
records what replaced it.
Self-contained on the Base Screens track — tokens copied from
`eam-shared.css`, components from `eam-base-desktop-ui-prototype-v1.html`
(both files now in `old versions/`; that one went out of scope 2026-09-16, §21).
Two departures worth knowing: an **inherited** domain is read-only until
explicitly overridden (an in-place edit would silently re-point every
other group inheriting from `*`), while an **unset** domain edits directly
and mints the group's own row set — an Override button with nothing to
override is a dead end. And overriding **copies the inherited value down**
rather than starting blank, since an override that empties the surface
makes an admin re-derive what they already had.

## 26.1 The finding — `WSJOBS` is already cloned in this environment

`docs/Data_refs/Page Layouts perms/r5pagelayout.csv` holds three distinct
pagenames whose `PLO_PARENTPAGE` is `WSJOBS`, each with a full set of
layout rows:

| `PLO_PAGENAME` | Description | `PLO_PARENTPAGE` |
| --- | --- | --- |
| `CCJOBS` | Contract Jobs | `WSJOBS` |
| `TRJOBS` | Transportation WO's | `WSJOBS` |
| `ZJ1000` | custom Z-function | `WSJOBS` |

So an admin will legitimately want **UG1's "Work" screen to be `TRJOBS`
while UG2's is `WSJOBS`**. Any design that assumes one WO function per
deployment is wrong on arrival, and §11's original prose assumed exactly
that (corrected there).

**No schema change is needed to support cloning.** `R5PAGELAYOUT` is
already keyed `(PLO_USERGROUP, PLO_PAGENAME)` and already records clone
lineage in `PLO_PARENTPAGE`; §12's WO Workflow tables already carry Page
in their natural composite; dataspies, `R5FUNCTIONTABS` and
`R5TABPERMISSIONS` are all already function-keyed. The only thing that was
ever wrong is the app's hardcoded assumption of a single pagename.

## 26.2 Resolution rule — switch on the entity, never on a `FUN_CODE` (locked)

**Wherever the app needs to know "what kind of screen is this," it reads
the function's entity, not its code.** `FUN_RENTITY` is `EVNT` for every
WO function in the export, clone or not.

**Two columns look like the answer and are not.** `FUN_PARENTFUNCTION`
exists on `R5FUNCTIONS` and reads like the obvious lineage column, but it
is **empty for all four** WO-screen functions in this customer's export.
`FUN_SYSTEM` sounds like a pointer to the base/system function and is not
one either — it is a **boolean**, `'+` on all four. So there is no
function-level "system function" foreign key to lean on. Clone lineage is
recorded only at the layout level, in `PLO_PARENTPAGE`.

Two distinct questions, two distinct columns:

| Question | Column | Used for |
| --- | --- | --- |
| Does this screen operate on the work-order entity? | `FUN_RENTITY` (`EVNT`) | runtime behaviour switching, workflow eligibility (§26.7) |
| Which base screen was this cloned from? | `PLO_PARENTPAGE` | admin display, config copy, layout inheritance |

Note the first question is deliberately about the **entity**, not about
the screen's branding. `ZJ1000` is `FUN_DESC = "Customer Quotes"` and
`FUN_RENTITY = EVNT` — an EVNT screen a customer repurposed for a
different business process entirely. That is normal, and §26.7 turns on
it.

Consequence for the mobile side (deliberately not built yet): every place
the app currently means "the WO screen" becomes a check against a
*resolved* function's entity. That is one seam, and it is the entire
mobile-side change this section implies.

**Applied to Screen Designer, 2026-08-24 (locked).** The designer's entry
modal used to offer two hardcoded Base Screen pills, Work Order (`WSJOBS`)
and Equipment, which asserted one WO screen per deployment and made the
four clones in §26.1 undesignable. It is now **family pills plus a function
select** over a `BASE_FUNCTIONS` catalogue, and the split is the one this
section mandates: `state.baseScreen` stays the **family** (`wo`/`equip`) and
every downstream switch — which tab set, whether WO Type applies, which
emulator record — still keys off it, while the new `state.baseFunction` holds
the `FUN_CODE`. Adding a fifth clone is one row in that array.

Three consequences worth keeping:

- **The picker states lineage, entity and real layout-row count** on
  selection (`PLO_PARENTPAGE`, `FUN_RENTITY`, and the true PLO row count —
  382 for `CCJOBS`/`TRJOBS`, 237 for `ZJ1000`), so an admin can see they are
  about to edit a screen with several hundred configured fields.
- **A clone's tab set gates what can be authored.** `ZJ1000` has no
  Checklist and no Book Labor tab, so those steps are dropped from the tab
  list, from the workflow-step pane and from the emulator's step rail, with
  the reason stated in all three places. This is the **authoring-time** half
  of the capability gap §26.5.1 reports from the group side; neither one
  makes the other redundant.
- **`fnHasTab()` fails open** for a tab absent from the catalogue, so adding
  a tab to `WO_TABS` doesn't silently hide it from every clone until someone
  remembers to update the array.

## 26.3 Nav-slot binding — permissions supply candidates, config supplies the choice (locked)

The bottom nav is **not** derivable from `R5FUNCTIONTABS`/
`R5TABPERMISSIONS` alone. A group can hold `PRM_SELECT` on `WSJOBS`,
`CCJOBS` and `TRJOBS` at once, and nothing in the permission tables says
which of them is *the* Work screen. Derivation was considered and rejected
on exactly that ground.

The division of labour:

- **Access control supplies the candidate list** — a slot may only be
  bound to a function the group already holds `PRM_SELECT` on. This keeps
  the existing security layer authoritative and stops nav config from
  becoming a second, disagreeing permission surface.
- **Nav config supplies the choice and the order** — one ordered row set
  per user group.

Each slot row:

| Field | Notes |
| --- | --- |
| Sequence | left-to-right order |
| Label | admin-authored ("Work", "Contract Jobs", "Transport") — the bound function's own `FUN_DESC` is a sensible default, not a constraint |
| Icon | picked from a fixed curated set, **not** free-form, so §23's outline/palette rules stay enforceable |
| Target | a **union**: a `FUN_CODE`, *or* a built-in surface |

**That union is load-bearing.** Home, Notifications and Sync Status are
not functions and never will be, so a slot's target cannot be a plain
function foreign key. Modelling it as `(target kind, target)` from the
start is what makes a later 4th slot a data row instead of a code change.

## 26.4 Slot count — four fits, five does not

`.bottom-nav` is a centred flex row of `.bottom-nav-item` at 84px wide
with 14px gaps (`eam-shared.css`). Today's three slots are Home / Work /
Notifications.

- 4 slots = `4×84 + 3×14` = **378px**, which fits a 390px-wide viewport
  (iPhone 12–15 class) with 6px to spare.
- 5 slots = **490px**, which does not.

So **a 4th icon needs no component change; a 5th is a redesign** of
`.bottom-nav-item` — narrower items, or dropping the labels. That is the
real cost boundary when the question comes up, rather than an open-ended
"how many can we have."

**Prerequisite (§20):** nav markup is hand-copied into every screen today
and nothing in `eam-shared.js` renders it, so a config-driven nav needs a
shared `renderBottomNav()` extracted first.

## 26.5 User Group Setup — a binding screen, not a config form (locked paradigm)

The problem this resolves: a screen that loads all user group records,
selects one, and edits a handful of fields fights §10's authoring model,
where a config artifact is authored once and pushed to **many** groups
(Copy-from-Group / Save-to-Group(s)). Two jobs were being conflated:

- **Authoring** a config artifact — inherently one artifact → many groups.
- **Answering "what does group X actually get?"** — inherently one group →
  many artifacts.

**Decision: User Group Setup does the second job only, and never authors
anything many-to-many.** Its shape is the base-EAM User Group Security
paradigm — a **protected-identity header (the group; no insert, since
groups are created in base security) plus child tabs, where every tab is
either an assignment grid or a summary with a deep link into that domain's
own authoring screen.** It contains no second copy of any designer. The
"no insert" instinct is the tell that this is a binding screen rather than
a record-maintenance screen.

Grain differs per config domain, and grain is what decides inline-vs-link:

| Domain | Grain | Authored in | The tab shows |
| --- | --- | --- | --- |
| Screen design / workflow rules | `(page, WO Type, group)` — dozens of row sets per group, now multiplied by clone count | Screen Designer (§10/§11) | 3-level summary: function → WO Types configured → last modified. Row tap deep-links into Screen Designer pre-filtered to that group + function + Type. **No inline editing.** |
| Home screen layout | one per group | the portal's **Home Layouts** area (§30.13) — built 2026-09-16, two levels: a global tile catalogue plus layouts that reference tiles by id | summary + Configure link |
| Bottom nav | one ordered row set per group | **here**, as an assignment grid (§26.3) | the real editable grid |
| ~~Sync / download defaults~~ **Offline profile** | ~~one per group~~ **one artifact → many groups** | ~~**here**, field-shaped~~ **the portal's Offline Profiles area** (§30.14, built 2026-09-16) | ~~record type × filter scope × horizon × row cap~~ **the assigned profile, its §2.7 per-entity policy read-only, and §2.8's lookup classes** |

**The sync row is superseded — see §29.6, and §21 for the full reversal.**
It used to read that sync config was "the only one of the four that is
genuinely field-shaped, which is why the *select a UG, edit a handful of
fields* instinct kept surfacing — it was right for one domain out of four,
not for all of them." §2.1's online-first reversal and §2.10's **offline
profile** replaced the row set with a named bundle assigned per group, whose
grain is one artifact → many groups. **So the instinct was right for *zero*
domains out of four**, and all four now read the same way: authored where the
artifact lives, bound here. That is a simpler screen than the one §26.5
originally described, not a more complicated one.

Three mechanics are what make the screen worth building rather than merely
tolerable:

1. **Copy configuration from group** — a header action pulling every
   domain from another group in one action. Impossible from inside any
   single designer, since each knows only its own domain. It is the
   per-group counterpart to §10's Copy-from-Group.
2. **Declared vs. effective, shown per row** — "Home layout: inherited
   from the `*` default" vs. "explicitly set for MAINT-TECH." §11's
   fallback rule already establishes that an absent config row is a
   meaningful state; this is where that becomes visible instead of
   invisible. Same declared-vs-effective split already named as a one-way
   door in §13.3 item 2 — one concept reused, not two invented.
3. **A `*` default group row** for Home, nav and sync, so a group nobody
   has configured still boots. Same shape as §11's WO Type fallback.

## 26.5.1 Where the User-Group-Setup / Screen-Designer line falls (locked)

Added 2026-08-24, second pass, after the first prototype's Screen Design
tab read loose. Two faults, both worth recording because both are easy to
re-introduce.

**Fault 1 — a per-group "workflow enabled" toggle is a second source of
truth.** The first pass gave each group an `enabled` flag per function. But
a workflow is enabled for a group *exactly when a configuration is saved to
that group*, which the data already records. Two places asserting one fact
is how "why isn't my workflow showing" becomes a support call.

**Fault 2 — wrong grain.** That tab had one row per **function**, with WO
Types crammed into a text cell. §12 keys on **`(function, WO Type, group)`**,
so one row per *configuration* is the honest grain. At the wrong grain the
tab could only describe; at the right one it can control.

**The model: a workflow configuration is a first-class artifact,** authored
once and saved to N groups — which is precisely what Screen Designer's
Save-to-Group(s) dual listbox already writes (§10). Group membership lives
on the artifact.

That makes the division unambiguous:

| This screen | Screen Designer |
| --- | --- |
| Which configurations this group is assigned to | Which configurations **exist** |
| **Assign / unassign** — Save-to-Group membership, edited from the group's side | Base Screen (function) + WO Type |
| Cross-domain consistency (below) | Steps included, gating (Free Form) |
| | Field layout, states, order, containers |
| | Copy-from-Group (an authoring seed) |
| | Save-to-Group(s) (the fan-out at save time) |

**Assign is not Copy.** Assign adds this group to an existing artifact — one
configuration, more members. Copy-from-Group *duplicates* a layout as a
starting point. Conflating them is how a site ends up with six
near-identical configurations nobody can tell apart. The configuration row
therefore shows a **Groups** count, so an admin can see before unassigning
whether they are removing the last member.

**Inheritance is permission-filtered.** A `*` configuration for a function
the group has no `PRM_SELECT` on does **not** apply to it. Without this,
`SALES-ENG` (permitted `ZJ1000` only) reports as inheriting the default's
`WSJOBS` workflow, which it can never reach. A resolution view that lies is
worse than no resolution view.

**Capability gaps are reported, never worked around.** `ZJ1000` has no
Checklist or Book Labor tab, so a configuration needing those steps cannot
render them. That is fixed in Screen Designer (change the steps) or in
Security ▸ Function Permissions (give the function the tab) — never by
assigning a different group, which only moves the problem. This supersedes
the first pass's framing of §20's workflow-eligibility validation as
purely an authoring-time check: authoring-time is still where it belongs,
but the group-side view has to *report* the consequence.

### Cross-domain consistency — the strongest reason the screen exists

A nav slot and a workflow assignment are authored in different places and
can disagree, and **no designer can notice, because each one sees a single
domain.** Only a per-group view can. Three checks, all live in the
prototype:

- A nav slot points at a function the group has no `PRM_SELECT` on — most
  often because the slot was **inherited** from `*`, which was written for a
  group that could. The slot would simply fail to open.
- A nav slot opens an `EVNT` function with **no configuration assigned**.
  Legal, and §11's fallback handles it, but the admin almost certainly
  didn't intend a guided workflow to be absent.
- An assigned configuration needs a tab its function doesn't have
  (capability gap, above).

These are the screen's genuine value-add, over and above being a reverse
index.

### The handoff into Screen Designer is a contract, not a link

Screen Designer's entry modal asks for Base Screen, WO Type,
Copy-from-Group and Save-to-Group(s) (§10). Launching it bare discards every
one of those, all of which the admin has already chosen by being on a
configuration row. So the deep link **states what it hands over** and writes
it to `sessionStorage.eamDesignerEntry` (`sessionStorage`, not a query
string — these files are opened over `file://` as often as over a server).

**Closed end to end 2026-08-24.** Both original blockers are gone: the Base
Screen picker is clone-aware (§26.2), and the designer now *consumes* the
handoff and opens pre-filled with a banner naming where it came from. The
two screens also share one user-group list now — they previously described
different worlds, with `DK` (the only group in the real export) the sole
overlap.

The payload is `{baseScreen, woType, saveToGroups, copyFromGroup, from}`.
Five rules make the read side trustworthy, and each exists because the
obvious alternative fails in a way an admin wouldn't notice:

- **Resolve the function by code *or alias*.** The mobile-side screens call
  the equipment function `WSEQUIP`; the designer has always called it
  `EQUIPMENT`. An alias list beats renaming either side, which would
  silently invalidate whichever demo data still used the old code.
- **Map the WO Type *name* onto the designer's type *codes*** — code, then
  exact name, then name prefix ("Routine" → "Routine Maintenance"). A type
  with no equivalent (`Contract`, `Quote`) falls back to the unmatched-types
  layout **and says which type it couldn't match**. Silently substituting
  one means the wrong layout saved to real groups.
- **An absent WO Type means "not chosen yet"**, not "the fallback layout" —
  a New-configuration launch leaves the select alone and prompts, rather
  than committing the admin to the fallback.
- **Never half-apply.** An unrecognised screen is ignored entirely. Filling
  in the group but not the function would look like a working handoff
  pointing at the wrong layout.
- **Consume once, and inject unknown groups.** A handoff surviving a reload
  would re-apply over later choices; a handed-over group missing from the
  demo list is injected rather than dropped, because both screens read
  `R5USERGROUPS` in real EAM and a demo gap must not look like a permission
  rule.

`sessionStorage` rather than a query string: these files open over `file://`
as often as over a server, and a query string would survive a bookmark and
re-apply a stale context weeks later.

## 26.6 Rejected alternatives

**A named "Mobile Config Profile" record** — code + description, bundling
Home layout + nav + sync, with user groups assigned to a profile.
Attractive because it is insertable and copyable, which is what an EAM
admin expects of a record. Rejected: screen layouts are keyed on
`PLO_USERGROUP` and cannot move, so this creates two parallel scoping
systems — layouts by group, everything else by profile — and every "what
does this technician actually see" question then needs both resolved. One
scope key, user group, everywhere. Revisit only if a config domain turns
up that genuinely cannot be group-keyed.

**Reusing `PRM_MOBILESTARTCARDS` as the nav-binding storage.** The column
already exists on `R5PERMISSIONS`, keyed `(PRM_FUNCTION, PRM_GROUP)`, and
is empty in this environment — it is legacy Mobile's start-cards setting.
Kept as **precedent** that per-group mobile shell config is something base
EAM already does, but rejected as the storage: its key forces an arbitrary
owning function for something that is a property of the group's whole app
shell. A small new table keyed `(user group, sequence)` is the honest
shape (§20 — not signed off against the real base schema).

**Deriving the bottom nav from tab permissions** — see §26.3.

**A single static `WFJOBS` as the only workflow-capable function** — the
original instinct, analysed in full in §26.7 rather than summarised here,
because it is the load-bearing decision of this section.

## 26.7 The one-function question — `WFJOBS` vs. any `EVNT` function (locked)

**One clone-model cost that turns out not to exist** (added 2026-09-08): **UDF
configuration is per *master function* and is identical across clones**, so the
four `WSJOBS` clones share one UDF set. The clone model does **not** multiply UDF
config — unlike the per-clone label problem §20 already tracks, which does.
Worth recording because "does cloning multiply the configuration surface?" is
the first question anyone asks about Option B, and for UDFs the answer is no.

The choice, stated plainly:

- **Option A — one static new function.** Mint `WFJOBS`, ship it as the
  single function the mobile WO workflow may ever be enabled on, and
  eventually surface it in base as well. Every user group's "Work" nav
  slot points at `WFJOBS` or has no workflow.
- **Option B — eligibility by entity, opt-in per user group.** Any
  function with `FUN_RENTITY = EVNT` may be workflow-enabled, and whether
  it *is* enabled is a per-`(function, user group)` decision.

### The evidence

This customer's `R5FUNCTIONS` export contains **four** `EVNT` functions
and no un-cloned `WSJOBS` row at all:

| `FUN_CODE` | `FUN_DESC` | `FUN_RENTITY` | Layout rows |
| --- | --- | --- | --- |
| `CCJOBS` | Contract Jobs | `EVNT` | 382 |
| `TRJOBS` | Transportation WO's | `EVNT` | 382 |
| `ZJ1000` | Customer Quotes | `EVNT` | 237 |
| `WSJODC` | Work Orders (DC) | `EVNT` | — |

Four distinct business processes — contracts, transportation, quotes, and
a distribution-centre variant of Work Orders — all built on the same base
screen. **1,001 `R5PAGELAYOUT` rows** across the three that carry layouts,
and the field-state mixes are genuinely different screens, not cosmetic
variants: `CCJOBS` hides 299 fields and exposes 47 as optional, while
`ZJ1000` hides 192 and exposes 17. Add per-clone field labels, boilerplate
and help text, tab sets, dataspies and permissions — all of which key on
function — and each clone represents a substantial, deliberate
configuration investment.

### What Option A actually costs

Forcing the workflow onto one `WFJOBS` means every group that wants the
mobile workflow abandons its clone's configuration for the mobile surface,
or has it re-authored under `WFJOBS`. Since the clones exist *precisely
because* the vocabularies differ — a Contract Job is not a Transportation
WO is not a Customer Quote — that is not a migration, it is a loss of
capability. The mobile app would offer a workflow only to groups willing
to give up the screen they built.

### Why Option A does not even hold as one function

The decisive argument is not the migration cost, it is that **Option A
collapses into Option B with an extra hop.** Cloning is how base EAM does
per-group screen customisation. The first time two user groups need
different labels or different boilerplate on their mobile Work screen —
which is the same pressure that produced these four clones — an admin will
clone `WFJOBS`. At that point there are `WFJOBS`, `WFJOBS2`, `ZWF1000`,
and the app is resolving a function per user group anyway, having spent a
migration to get there and stranded 1,001 existing layout rows on the way.

Option A is only stable if per-group screen customisation stops, and there
is no evidence for that in this customer's data.

### Decision: Option B

**Workflow-enablement is a property of a `(function, user group)` pairing,
not a privilege attached to one blessed function code.** This also holds
§11's position without breaking it for a special case. **Note (2026-09-11):**
§11's *"no new `FUN_CODE`s"* is no longer locked — reuse vs. a new standalone
mobile function is now a decision required, and Equipment requires a new
function outright (§26.8). **This paragraph is unaffected either way**, because
workflow-enablement being a `(function, user group)` property holds however many
functions exist.

In fairness to Option A, it did buy three real things, and each has to be
paid for separately under B:

| What `WFJOBS` would have guaranteed | How B provides it |
| --- | --- |
| A function known to have every tab and field the workflow needs | **A Screen Designer validation.** Enabling the workflow on a function checks that the tabs §12's step set requires are present and permitted, and refuses or warns when they are not. This is the honest replacement, and it is the one piece of new work Option B creates. |
| One well-known pagename for mobile resolution | §26.2's entity check plus §26.3's per-group nav binding — already needed for the nav bar regardless of this decision |
| A clean home for mobile-only fields and behaviour that never touches customer clones | Nothing yet, and worth watching. If mobile ever needs a field no base WO screen has, it goes in the WO Workflow tables (§12), not into a customer's layout rows. |

Three guard rails make B safe:

1. **Eligibility is `FUN_RENTITY = EVNT`** — not `FUN_SYSTEM` (a boolean,
   §26.2) and not `FUN_PARENTFUNCTION` (empty, §26.2). `PLO_PARENTPAGE`
   corroborates the lineage for admin display but is not the gate.
2. **Enablement is opt-in, never automatic.** An `EVNT` clone does not
   acquire the mobile workflow by existing. §11's fallback rule already
   defines the un-configured case — the plain Standard Record View, always
   Free Form — so the default for a newly discovered clone is already
   specified and already safe.
3. **Labels and boilerplate come from the bound function**, not from
   mobile constants. If the mobile screens keep hardcoding their own field
   labels, allowing clones buys nothing — the technician sees "Work Order"
   on a screen the admin renamed "Customer Quote." Tracked in §20; this is
   the consequence of Option B that reaches furthest into the prototypes.

**Option B is forward-compatible with Option A; the reverse is not true.**
If base later ships a workflow-native WO function, it arrives as one more
eligible `EVNT` function and nothing about this design changes. Choosing A
now would have to be undone to get there.

## 26.8 Equipment resolves layout off **system type** — and base already models it as four screens (locked paradigm, 2026-08-25)

**User finding, and it is the strongest available proof that §13's
configuration-driven layout is the right paradigm rather than a WO
special case.** Base EAM already splits Equipment across **four distinct
base screens by system type — Location, Asset, Position, System** — and
each of those supports **clones**, filterable per user group exactly as
the `WSJOBS` clones are (§26.1/§26.7).

**Offline, the pickable system type is bounded by which of the four layouts
shipped** (added 2026-09-08) — a `definition-gated` value per §2.8 row 3. This
is the **worst** member of that class, and not by a little: system type is
Protected in update mode always, so **Insert Mode is the only place it is ever
set**, which makes a missing layout *unrecoverable from mobile* rather than
merely inconvenient. Compounded by those four layouts having **no authoring
surface at all** yet (§20). The rule lives in §2.8; this section inherits it.

So the same mechanism WO uses, **minus the workflow piece**, gives mobile
something it could not otherwise have: the technician picks an asset,
reads its record view, goes back to search, pulls up a **position**, and
the record view **re-renders under a different layout** — without ever
navigating to a different screen. **Four base screens collapse into one
mobile navigational surface:** one Equipment List, one Equipment Record
View shell, four resolved layouts.

That is the "Unified Mobile Experience" theme answered at the screen
level, and worth naming when the paradigm is presented — it is the case
where configuration-driven layout removes navigation rather than just
moving configuration around.

### Why Equipment is *cheaper* on the base side than WO was

This is the part that reads like a happy accident:

- **WO needed a new column.** One function, one screen, and base had no
  per-Type layout concept — hence the new `PLO_WOTYPE` column plus the two
  new WO Workflow tables (§11–§13).
- **Equipment needs none.** The four system types **already are four
  `PLO_PAGENAME` values.** Resolution is therefore "which of the four
  existing pagenames does this record's system type map to," then the
  clone appropriate to the user group — which is `R5PAGELAYOUT` on
  `PLO_PAGENAME × PLO_USERGROUP` doing exactly what it already does. No
  new column, no new table.

Consistent with §26.2's locked rule: resolution switches on the **entity**,
never on a `FUN_CODE`. Equipment's entity is equipment; system type
selects among that entity's screens; the clone is a user-group binding.
Nothing new is being invented, which is the point.

### This resolves the Insert Mode "Type vs. Class" question (§20)

Insert Mode's third pill offers Asset/Position/System and
`saveInsertRecord()` stored it as the record's **`class`**, which no
Equipment List Class filter (PUMP/MOTOR/VALVE/…) could ever select and no
Custom Fields definition (§22, gated on Class) could match. That item asked
"which field is this pill actually?" — **answered: it is the system type,
the layout-resolution key, Equipment's exact analogue of WO Type.** It never
fit Class because it is a different axis entirely: Class is what kind of
equipment this is, system type is what kind of *record* it is.

Two follow-ons, both small:
- **The pill is missing `Location`.** It offers three of the four system
  types. Whatever the pill is bound to must offer all four, or Location
  records cannot be created on mobile at all.
- **It must stop writing to `class`.** Class remains its own real field
  with its own vocabulary and its own filter; the system type needs its own
  attribute.

### Consequence for the plan: this is a blocker for Equipment

The base-side surface that authors these four layouts (and their clones)
**does not exist yet** — Screen Designer's declared MVP scope is "two record
views, Equipment and Work Order" (§10), which was written as though
Equipment were one screen. It is four, times clones.

**Direct user position: this is a blocker for the Equipment track**, not a
parallel workstream. Building Equipment Record View against a single
hardcoded layout would bake in exactly the assumption this finding
disproves, and every child tab built on top of it would inherit that
assumption. Tracked in the plan doc's sequence rather than here.

### System type is **Protected in update mode, always** (locked, user direction 2026-08-25)

Once the record exists, its system type cannot be edited. It renders as a
**Protected** field (§5.2's field states) on Equipment Record View.

**So none of §13.5 applies to Equipment.** No confirm, no re-resolution, no
step state to reconcile, and no required-field drift — a record's layout is
fixed for its lifetime the moment it is created. Equipment gets the
paradigm's benefit (four layouts, one mobile surface) with none of its
re-typing exposure.

Worth noting *why the two entities diverge deliberately* rather than
treating this as an inconsistency: protecting the key after insert is the
cleanest possible answer to the re-resolution problem, and WO **cannot**
take it. Re-typing a work order is a real business need — a work request
triaged into a breakdown, a job reclassified once the technician sees the
asset — so WO has to absorb the complexity in §13.5 that Equipment
sidesteps by construction.

**The consequence is that Insert Mode is the only place system type is ever
set — which makes its missing `Location` option a real defect, not a
cosmetic one.** Pick the wrong system type at create time and it is
unrecoverable from mobile; omit an option entirely and that kind of record
simply cannot be created here. See §20.

# 27. User Defined Screens (UDS) — scope

Added 2026-08-25 (user direction: "add scope for User Defined Screens and
User Defined Screen tabs for work orders"). **This section is scope, not a
locked design** — it fixes what is in, what is out, which existing rules
already absorb UDS at no cost, and what is genuinely owed. Nothing here is
built and no prototype exists.

**Terminology, because two different mechanics are easy to conflate.**
§22's **Custom Fields** are admin-defined *fields* added to a screen the
product ships, keyed `entity + class + classOrg`, rendered inside one
container on a Record View. A **User Defined Screen** is a customer-authored
*screen* — its own field set, its own data — which base EAM can surface
either as its own menu destination or as a **tab on a delivered entity's
record**. They are not the same mechanic and must not share one: Custom
Fields extend a screen the product knows about, UDS adds a screen it does
not. A record can carry both.

## 27.1 What the existing rules already absorb, at no cost

This is the important half of the scope, and it is mostly good news.

**A UDS tab is just a tab of the function, so §12 and §14.8 already model
it.** §14.8 locks the candidate set as "the function's own tabs, filtered to
what the target user group is permitted" (`R5FUNCTIONTABS` /
`R5TABPERMISSIONS`). A UDS registered as a tab of a workflow-enabled
function therefore enters that candidate set **by construction** — no new
resolution concept, and no new authoring surface for placement. Concretely
it inherits all of this free:

- A UDS tab takes a §12 tier-2 row keyed `WO Type × User Group × Tab`, so it
  carries **Visible**, **Placement** (`Step` | `More`), **Sequence** and
  **Required** exactly like a delivered tab.
- **A UDS tab can be a numbered workflow step.** This is the capability
  worth naming out loud: a customer's Permit to Work, Isolation Certificate
  or site-specific safety screen can be *step 3 of the guided flow* — gated
  and required — rather than an optional side trip. A significant product
  capability arriving almost entirely from rules already locked.
- §14.8's two constraints apply unchanged: a UDS tab is **either** a
  numbered step **or** a More entry, never both; and a More-placed UDS tab
  **can never be Required**.
- §14.10's forward-only gating applies unchanged — a completed UDS step
  stays reachable for correction.
- The §11 fallback applies unchanged: a WO Type with no workflow header row
  takes UDS tab placement from the function's own screen design.

## 27.2 In scope / out of scope

| | |
| --- | --- |
| **In — UDS as a tab on Work Order** | The `Placement = Step \| More` model above. The shape that carries real workflow value, and the shape that reuses the most already-locked design. |
| **In — one generic UDS tab renderer** | A single definition-driven screen, not one screen per customer UDS. See §27.3. |
| **`server-only` — standalone UDS as its own destination (locked 2026-09-03; was "deferred, recommended out of v1")** | A UDS surfaced as a top-level menu screen rather than a tab. **A standalone UDS record view is never an offline option — permanently `server-only`** in §2.7's registry, and this is now a decision rather than a recommendation, on a cleaner basis than cost: not "expensive," but **"never offline."** Three consequences. The hardest cost this row used to carry — an index projection over *entirely* customer-defined columns — **disappears outright** rather than being deferred, since there is no index (§21). A standalone UDS may still exist as an **online-only destination** with a nav slot and an online-only list, which is an ordinary `server-only` row needing no new machinery. And per §2.9 it must be **`blocked-visible`** when opened offline, never `blocked-hidden` — a nav destination that silently vanishes is exactly the failure that reads as a configuration error. |
| **Out — UDS field *authoring*** | Base EAM's own UDS setup already owns it (§27.4). Rebuilding it inside Screen Designer would break §10's one-surface rule the same way the retired Workflow Designer did (§21). |
| **Out for now — UDS on Equipment** | The mechanic is identical, but the authoring surface for Equipment's four `PLO_PAGENAME` system-type layouts does not exist yet (§20), and that already blocks the Equipment track. Stacking UDS on a blocked track buys nothing. Revisit when it clears. |

## 27.3 The one real build — a generic, definition-driven tab renderer

**There cannot be a prototype screen per UDS, and there should not be one.**
The set of UDS screens is per-customer and unbounded, so a UDS tab has to
render from its definition at runtime. This app has already proven that
pattern twice at smaller scale:

- §22's `applyCustomFields()` merges definitions straight into a screen's own
  `RECORD` / `FIELD_LABELS` / `LOV_DATA` / `LOV_CURRENT` / `LOV_TITLES`
  globals, so native field rows and their existing edit sheets operate on
  admin-defined fields with **no parallel edit path and no read-only special
  case**. A UDS tab is that same trick with no host screen — the whole body
  is generated.
- §9.8's Insert Mode already renders field set, placement and required-ness
  from `ENTITY_FIELD_META` / `ENTITY_FLAT_FIELDS` rather than hardcoded
  markup.

So the build is: **a §8 child-tab screen whose header is §8.1's protected
identity and whose body is a §5.2 field grid/list rendered entirely from
definition.** Two things make that tractable rather than open-ended —
`screen-layout-field-behavior-prototype-v1.html` is already the canonical
statement of how every field type behaves in both containers, so the
renderer has an exact spec to hit, and
`eam-wo-equipment-tab-prototype-v1.html` is already the §8 child-tab
template to copy.

**Sequence it after a second real child tab exists, not before.** The
Equipment tab is a sample size of one, and a generic renderer generalised
from one example is a guess.

**A UDS tab placed as a numbered step needs the step rail *and* a bottom
bar**, which the Equipment tab deliberately lacks (§16.10 — it carries the
rail but has no bar). A `Placement = Step` UDS tab is therefore the first
child-tab screen needing §14.5–§14.7's per-step bar, including §14.7's
required-field bar-locking evaluated over fields the app has never seen.
That is a **second, independent argument for the declared-vs-effective
field-state split** named as a one-way door in §13.1–§13.4 — the first being
conditional field rules. Two unrelated features now want the same seam,
which strengthens the case for building it early rather than retrofitting.

## 27.4 Authoring — a three-way split, not a new surface

UDS extends §26.5.1's definition/assignment line into three roles. Stating
this now is cheap; discovering it after someone has built field authoring
into Screen Designer is not.

1. **Base EAM's own UDS setup defines the screen** — fields, types, LOVs,
   labels, grouping, required-ness. That surface exists in base and is not
   this project's to rebuild.
2. **Screen Designer places the tab** — Visible / Placement / Sequence /
   Required on the §12 tier-2 row, exactly as for a delivered tab. It
   *consumes* the UDS definition; it never edits it.
3. **User Group Setup assigns** the resulting `(function, WO Type)`
   configuration to groups (§26.5/§26.5.1). Unchanged — assign is still not
   copy.

**Consequence for User Group Setup's consistency checks.** §26.5.1 already
has it validating nav slot vs. function permissions and nav slot vs.
assigned configs. UDS adds a third check it is uniquely placed to run: a
configuration placing a UDS tab as a **required step** for a group that
lacks permission to that tab is a workflow the technician can neither
complete nor skip. That is a hard dead end rather than a warning, and no
designer working inside a single screen can see it.

**Built 2026-09-08 (§29.5).** Severity follows **Required**, not the
permission alone: the same UDS step *not* Required is a warning, because that
workflow still completes — the technician just never sees the step. The fix is
named as **Security ▸ Tab Permissions** or Screen Designer, never "assign a
different group," per §26.5.1.

## 27.5 Offline consequences — the part that needs backend answers

This is where UDS stops being nearly free. Every item below is owed before
build, and each is tracked in §20.

**Tier 0 (§2.3).** UDS definitions are *configuration*, so they belong in
`0c` beside page layout, the WO Workflow tables and custom-field
definitions — a UDS tab with no definition is a blank screen, precisely
§2.3's "configuration does not degrade" case. Two knock-ons:

- **`0f` gets wider, and nothing has accounted for it.** `0f` is currently
  scoped to the code domains that *delivered* layout references. A UDS field
  can reference a **customer-defined** LOV domain, so "layout first, because
  layout scopes everything after it" now has to traverse UDS definitions
  too. Miss that and a UDS LOV field renders raw codes — the exact
  training-dependency regression §2.3 cites as the reason code domains were
  promoted into Tier 0 in the first place.
- The per-domain **version stamp** §20 already owes for the Tier 0 contract
  has to cover UDS definitions, or one changed UDS forces a full config
  refetch.

**Storage and traversal — resolved 2026-09-03.** UDS data lives in its own
**`U5` table with a per-UDS *authored* PK→FK mapping** back to the parent. Two
rules follow, and together they close what used to be this section's biggest
hole:

- **A UDS child tab traverses iff it is placed in the resolved page layout**
  (locked), and then indefinitely, as part of the record's offline footprint.
  **So the edge set is derived from layout, not an independent Tier 0
  artifact** — no new bundle, no new version stamp, and the Tier 0 contract does
  not grow a line for it. This is the natural extension of §2.3's own "layout is
  first because layout scopes everything after it": resolve layout and you also
  know which UDS edges traverse. Because layout resolves per `PLO_WOTYPE`, **the
  UDS edge set is per WO Type.**
- **Screen Designer's Placement control therefore governs device payload**, which
  promotes it from authoring debt to a **sync-affecting control** (§20). The
  per-UDS row cap and the FK-mapping warnings belong on that surface. And because
  placement is the real bound, §2.3's closure cap returns to being a safety net.

**Three guards this makes required rather than prudent**, all §20: a **per-UDS
row cap**; **authoring-time FK-mapping validation** (column exists, is indexed,
cardinality bounded, single vs. composite join — build it alongside the existing
workflow-eligibility validation); and the closure cap.

**The re-type mirror case** (§13.5, and §20 already tracks its opposite). A
pre-start WO can be re-typed, and a layout-derived edge set means re-typing can
**add** a UDS tab whose rows were never traversed — producing an empty tab the
device cannot distinguish from a legitimately empty one. Same rule as the
"disappearing tab" item, opposite direction, and **the sharpest justification for
the not-hydrated affordance**, which is what makes the two cases distinguishable
at all.

**`definition-gated` at tab grain, narrowed to the definition.** Two `0c`
artifacts must arrive: the tab's **placement** (page layout, §12 tier 2) and the
UDS's **definition** (its field list, consumed by §27.3's renderer). If layout
arrived, placement arrived — but the definition is a separate row and can still
be missing, and **a placed tab with no definition is §2.3's blank screen.** Keep
this distinct from *not hydrated*: definition-gated means the tab **should not
render**; not-hydrated means it renders and **says it needs connectivity**
(§2.8).

**Write path (§2.4) — narrowed, not closed.** The shape is a **generic
row-shaped outbox envelope** (`table + PK + column/value map`), **not** the EAV
form Custom Fields take (§22) — two generic write shapes, one each. Still open in
§20: **UDS cardinality (1:1 or 1:N per `(WO, UDS)`)**, which decides only which
§2.5 conflict row UDS sits on, and must be answered **before the envelope is
built**; and **whether UDS fields are governed by status authorizations at all** —
now the last genuinely open UDS offline item, and a hole in §2.3 consequence 3's
write gate.

**"Can a dataspy select a UDS field?" — re-filed 2026-09-08.** Under §2.1's
online-first polarity this is a **base-EAM dataspy capability** question (can the
server join to a `U5` table?), not a mobile index-projection question. It stops
being a flat "no" and becomes a question with a plausible yes.

## 27.6 Why it is worth doing

Two reasons, both product rather than technical. It converts the guided
workflow from "the five steps we designed" into "the steps this customer
actually runs," which is the difference between a demo and a deployable
product — and it does so mostly through §12 and §14.8, which are already
locked. And it is the answer to the customisation demand that otherwise
arrives as a request to hardcode a customer's screen into the app, which
§21's retired bespoke-WO-card entry shows this project has already had to
undo once.

# 28. GIS / Maps — Phase 2

**Scope decision, 2026-09-08 (user direction): R2 is Phase 2, held as an
option and not in the v1 build.** R1's online-first model is locked and being
built now (§2.1); maps are sequenced after it. This section exists so the
scoping is deliberate rather than an omission, and because most of what follows
is **shipped behaviour in the existing product** — facts and constraints, not
open design. Recording them now is what keeps Phase 2 from re-deriving them,
and what stops a v1 decision from accidentally foreclosing them.

**Why Phase 2 rather than v1.** Three of the largest unpriced items in the
whole programme sit here: a **custom React Native ↔ ArcGIS native module**
(React Native is not a first-party ArcGIS target), full **Map View parity**
across features / geometry / nonconformities / Search Around / Main Isolation,
and the **second sync engine** with its own conflict surface. None of them
blocks the guided-workflow product; all of them would set its schedule if
bundled into it.

**What v1 must not do.** Two forward commitments are already made, so Phase 2
stays additive rather than a rework:

- **`external-replica` already has a slot in §2.7's policy registry.** GIS is a
  **policy class, not an exception** — which is also what gives the next app in
  the portfolio somewhere to put a foreign sync engine.
- **§2.9's `blocked-visible` state exists because of the map**, not because of
  records. A GIS feature edit against an online-mode map genuinely cannot be
  queued (§28.3), so the visible-narrowing pattern is required *somewhere* in
  the app regardless. Better named now as a governed exception than discovered
  mid-track.

## 28.1 The map is an editor, not a viewer — parity is the expensive answer

Offline, today, the existing Map View supports: create point / linear / polygon
features (tap-to-place vertices, undo/redo); edit feature **geometry** (drag
vertices); edit GIS **attributes**; **create a corresponding EAM equipment
record** from a new feature, via attribute mappings authored in the ArcGIS Pro /
ArcMap EAM toolbar; add work orders against a feature, enter closing details and
complete them; create and view **nonconformities**, including linear ones
(from/to point); and **Main Isolation** (§28.4). Feature-server privileges gate
this per capability (Create / Update / Allow Geometry Updates), checked at the
moment the user taps the control. **Delete is not implemented in the app at all.**

**Consequence: "make it a viewer to avoid a second sync engine" is not available
as a scope reduction** if parity with the current app matters. An earlier
analysis recommended a viewer for v1; that recommendation was **withdrawn
2026-09-03** on this evidence. The viewer/editor question is not open — it is
answered, and the answer is the expensive one. Which is itself an argument for
Phase 2: the reduction people reach for first does not exist.

## 28.2 There are already two sync engines and two error surfaces

Raised once as a risk; it is not a risk, it is the status quo.

| | EAM data sync | GIS sync |
| --- | --- | --- |
| Scope | records, per Sync Config | geodatabase replica + basemap tiles + locator files |
| Configured by | Sync Config screen | Map Configurations screen (per map record) |
| State shown | sync status | per-map **Sync / Pending / View Sync Errors** |
| Error surface | — | **Error Log** and **Pending Log**, under GIS Map Settings |
| Reset | — | **Clear Files** (clears all map/GIS data for the logged-in user) |

Pending-edit and error **counts are surfaced on entry to Map View**, every time —
a good precedent for the EAM side too, and §4.4/§4.5 are already the right home
for it.

**The one thing not to do: never route GIS feature edits through the EAM
outbox.** An offline geodatabase is an ESRI **replica** with its own sync, its
own conflict model and its own server-side reconcile. Keep the seam where ESRI
put it, and represent **both** channels in the Sync Status Screen rather than
pretending there is one. §2.5's conflict table already reserves a row for this.

## 28.3 The map genuinely is a mode — and that does not reopen §5.1

"Don't make connectivity a mode" holds for **EAM records**. It does not hold for
the map, and the reason is structural rather than a UX preference:

- each map record carries an **Offline** switch (default from install parameter
  `MOBGOFFL`) — ON downloads a replica, OFF makes live portal calls
- *"The application does not switch between disconnected and online states
  automatically. The user must choose the mode…"*
- **a map cannot be switched offline → online while pending edits exist**;
  local changes must sync first
- online, GIS edits post to the geodatabase immediately with no sync step;
  offline they queue in the replica

The third bullet is the tell: an offline replica is a **checked-out version**, so
going online means reconciling or abandoning it. **ESRI imposes that, not us.**

**The reconciliation for this app:** do not expose it as a global app-level
mode. Expose it as **per-map-area download state** — which is exactly R5's
*"cache this so I can keep working"* rather than a mode toggle. One paradigm,
"what have I taken offline?", applied to map areas as well as to records. That
keeps §5.1 and §2.10 intact.

## 28.4 Main Isolation is the precedent for the whole offline pattern

The single most useful architectural precedent available, and it is shipping.
Main Isolation performs a network isolation solve — given a main, which valves
must close, which mains are affected, how many hydrants / customers / volume are
interrupted, plus dead-end block and branch handling. It is **not** implemented
against ArcGIS network services. It is implemented as **four replicated EAM
relational tables** (`r5mainisolationmains`, `…valves`, `…blocks`,
`…depblocks`), populated by the customer via the Import Utility or their own
geoprocessing service (*"nor will any screen be provided for the purpose of
populating or managing data in the Main Isolation tables"*), **an on-device
solve** over those tables, and **an explicit user opt-in** — a *"Download Main
Isolation tables"* checkbox in Sync Config, changeable later, effective next sync.

Three things it proves, and they reach well beyond maps:

1. **Per-entity, user-opted offline replication is already the product's
   idiom.** §2.7's policy registry formalises something shipping, rather than
   inventing a paradigm.
2. **Heavy analysis offline = replicate a bounded projection and compute
   locally.** It is the strongest available argument that a *declared, bounded*
   projection is the right pattern, and that authoring it is a real customer
   responsibility rather than a defaulted convenience.
3. **ArcGIS network analysis was never available.** Of the Utility Network's
   five service types, HxGN EAM supports **map service and feature service
   only** — `UtilityNetworkServer`, `NetworkDiagramServer` and
   `VersionManagementServer` are unsupported. Solving off EAM tables was the
   only route, not a preference.

## 28.5 `MOBGEXT` — the configured extent, and why it matters beyond maps

The GIS briefs supply a **geographic extent** authored server-side as an install
parameter, overridable per user **and device** on the Map Configurations screen
(including by drawing a polygon), bounding which EAM records are available:

> *"Defining the extent is important for online and offline maps. For offline
> maps, this downloaded map is limited to the extent entered. For online maps,
> map features will be available outside the extent; however, there will be no
> related EAM data for those features outside of the extent. **This limitation
> exists for performance reasons.**"*

Three uses. It is a **working precedent customers already accept** as the shape
of a mobile work area, with a decade of field use behind it. It is the nearest
existing thing to a **device-grain policy axis**, which §20 lists as having no
mechanism — worth reaching for when that item is picked up. And it lands the
online/offline symmetry this doc argues for elsewhere: the extent bounds *EAM
data* in **both** modes while GIS features stay viewable outside it when online,
so **degradation is by data class, not by connectivity** (§2.9).

**Where extent and traversal meet: `GISOBJID`.** GIS scopes by **extent**; §2.3
scopes by **reachability**. Different axes — so an asset can be reachable without
being in the extent, and in the extent without being reachable. The UI has to be
honest about both, and the join between them is `GISOBJID` (+ `UPDATE_COUNT`) on
every integrated layer.

## 28.6 Settled by the product, not by us

- ESRI ArcGIS. **Sync-enabled feature services** (not map services) for mobile;
  a tiled basemap service with tile-cache export enabled; **single** (not
  composite) geocoding locators for offline address search.
- `GISOBJID` (+ `UPDATE_COUNT`) is the EAM ↔ GIS join on every integrated layer.
- Two sync engines, two error surfaces (§28.2).
- Per-map-area offline replica lifecycle, with the offline→online pending-edit
  interlock (§28.3).
- Editing is in scope if parity matters; **delete is not implemented** (§28.1).
- ArcGIS network analysis is unavailable; graph work rides replicated EAM
  tables (§28.4).

**One cross-app inconsistency to note now:** Digital Work supports **online maps
only** (*"the value of this install parameter is not considered by the Digital
Work app"*), while Mobile Offline does both. That is the cleanest single instance
of the SWG's "two separate mobile apps" theme, and the unified app has to pick up
Mobile Offline's superset.

## 28.7 Open items — all Phase 2, all tracked in §20

1. **Parity scope for Phase 2's own first wave.** Full Map View parity is a large
   surface. Recommend: display + select + WO/equipment tap-through + Search
   Around first; feature/geometry editing and Main Isolation second, since each
   drags in the replica write path and its own conflict surface.
2. **React Native + ArcGIS.** ArcGIS Maps SDK ships first-party native iOS /
   Android / .NET / Qt SDKs and a JS API; **React Native is not first-party**,
   and the existing app is built against the ArcGIS Runtime iOS SDK. Budget a
   **custom native module** — likely the single largest unpriced item in the
   programme, and the main reason this section is Phase 2.
3. **R2's "and other map services like OpenStreetMap."** Nothing in the product
   supports this, and there are two readings roughly an order of magnitude
   apart: a **basemap alternative** (feasible via MapLibre + PMTiles/MBTiles,
   and it sidesteps ESRI basemap credits) or a **full non-ESRI feature/edit
   pipeline** (a second GIS integration). **Which is meant needs confirming
   before anything is sized.**
4. **Where the map is *placed* (R3).** Screen Designer needs a map concept it
   does not have — likely both a **location field type** (a mini-map on a record
   view; the product already has "Highlight on Map" from WO, Equipment, the WO
   Equipment tab and the Checklist tab's Locate From/To Point) and a **map tab**.
   The tab is the same generic definition-driven renderer §27.3 already owes for
   UDS — **shared work, not new work**, which is a reason to keep §27.3's
   renderer genuinely generic when it is built in v1.
5. **GIS identity is a second identity domain, and Tier 0 has no slot for it.**
   It needs an **ArcGIS Portal account per mobile user** (for license validation
   alone, independent of whether the services themselves are secured), **up to
   three credential sets per map** (portal / feature service / basemap, prompted
   separately when they differ), fallback to the EAM user's stored `ArcGIS User`
   / `ArcGIS Password` — which **requires connectivity** to retrieve — encrypted
   token caching with re-prompt on expiry, and `GISAUTH = OAUTH2` + `MOBGAPID`
   app registration for SAML with platform-specific redirect URLs
   (`<bundle-id>://GISAuth`). **Consequence: §2.3 consequence 2's "one
   legitimate hard failure" gains a second** — no portal license validation
   means no Map View, a different failure with a different remedy — so Tier 0's
   bootstrap contract needs a GIS identity domain with its own version stamp and
   its own partial-failure code. **And a collision to verify rather than
   assume:** the *Unsupported Functionalities* appendix states that under IWA or
   OAuth2, EAM web services connecting to the map service fail and several
   EAM↔GIS validation paths silently do nothing. If this app standardises on
   OIDC, check it.
6. **`GISMAPS` resolves per Organization or Department — never per user group.**
   Maps are authored on the base **Maps** screen, and a map is either desktop or
   `Mobile Only`, **never both**, so every map is authored twice if both surfaces
   need it. This collides with §26, which resolves nav slots, layout and
   dataspies **per user group** — GIS is the one configuration domain in the app
   resolving on a different axis. Either `GISMAPS` grows a user-group option
   (base-side change), or mobile maps user group → org/dept to pick a map, or map
   selection stays a user-device preference outside the §26 model. **Not decided.**
7. **Basemap extent, zoom, credits and storage as one coupled budget.** Basemap
   tiles **cost ESRI credits**, charged per download to the account that
   registered the basemap item, and ArcGIS Online-hosted basemaps cap at
   **100,000 tiles**; offline levels of detail come from `MOBGBLOD`, default
   **13–16**. So basemap extent/zoom is a **licensing and cost** decision, not
   only a storage one — and this is the real answer to "why did the old app fill
   the device."
8. **Does §2.10's replication switch gate the GIS replica too?** Recommend
   **independent**, as `BCBGIS` already is — but decide it rather than inherit
   it: *"offline is off but the map replicated 400 MB"* is a support call waiting
   to happen.
9. **PerReplica sync accumulates server-side versions** — one per downloaded map
   or per user — and *"if the GIS administrator does NOT manually perform a
   reconciliation … these DB versions will continue to grow in number."* ESRI
   recommends a script. Operational burden that **scales with device count**, and
   it belongs in any "sustainable across our other mobile apps" assessment.

# 29. WO Workflow — Step Instances, Gates and Forks

Added 2026-09-08, on five workflow-authoring requirements given together:
tabs placeable **more than once**; a **question fork** that asks something and
routes to a different step, with **translations**; a step that can **require a
comment**; a step that can **require a document attachment**; and **Record
View as a second step under a different page layout** ("this may be huge but
definitely WANT IT"). User Defined Screen tabs came in the same list and are
already scoped in §27, so they are placed by the same mechanism rather than
getting one of their own.

**All five are authoring, and authoring lives in Screen Designer.** The
request named the User Group Configuration prototype, so this is worth
stating rather than assuming: §26.5.1 locks User Group Setup as the
**binding** side — "which configurations this group is assigned to" — and
says in terms that it never touches steps, gating or layout. A step editor on
that screen would edit an artifact shared by N groups from one group's side,
which is §26.5.1 Fault 1. Building a *third* surface is worse still: that is
exactly what the retired Workflow Designer was, and §21 records it being
retired on 2026-08-25 for breaking §10's one-surface rule — while modelling
these same deferred features. So the division is unchanged and now carries
three more columns on the same side of the line.

| Screen Designer authors | User Group Setup binds |
| --- | --- |
| Step **instances** (§29.2) | Which configurations the group is assigned |
| Placement / Sequence / Visible / Required | Cross-domain consistency, including §27.4's UDS dead end |
| Completion **gates** (§29.3) | Offline-profile assignment (§29.6) |
| Question **forks**, their text and their routing (§29.4) | |
| Which UDS is placed, and where (§27.4 role 2) | |
| Per-instance field layout | |

## 29.1 What this does *not* reopen

**§13.1–§13.4's conditional field rules stay deferred.** Nothing here is a
step in that ladder, and the distinction is §13.3's own: item 4 states that
**field effects and step/tab effects are not the same mechanism** and must not
be merged. A fork is a step effect and an *explicit, authored* one — an admin
places it in the sequence and types its question. It is not a predicate
evaluated over a record's field values, so it needs no condition table, no
operator vocabulary, and no `resolveFieldState()` seam.

**It also does not violate §13.3 item 4's "add, don't retract" rule** — which
is the constraint a naive fork would break. See §29.4's skip semantics: a
skipped step is **marked Not Applicable**, never hidden or removed. That adds
a state and retracts nothing, so a step already holding booked labor or
issued parts cannot vanish, and there is no "un-hide a step the technician
has passed" case to define.

**Forward gating is untouched**, and §14.10 still holds in both directions: a
fork may only target a **later** step, and the technician may still always
navigate back to a completed step.

## 29.2 Step instances — the key grain change (locked)

**§12 tier 2 keyed one row per `(WO Type, User Group, Tab)`.** That was
deliberate and the doc said why: one row per tab made *"a tab is either a Step
or a More entry, never both"* a **key** constraint rather than a validation
rule, which is what stopped forward gating from being bypassable — Book Labor
is both a workflow step and a real WO tab. Two of the five requirements break
that key outright, and they turn out to be **the same requirement**:

- *"Tabs can be duplicated/added more than once"* — two rows for one tab.
- *"Record view can be added as a step, but with a different page layout than
  the first record view"* — two rows for one tab, **each with its own
  layout.**

Recognising them as one feature is what keeps the change small. The second is
the first plus a layout key.

**Decision: the key gains an `Instance` dimension —
`(WO Type, User Group, Tab, Instance)`.** What made one-row-per-tab worth
having survives one grain finer: **an instance** is either a Step or a More
entry, never both, because `Placement` sits on the instance row. A More entry
pointing at the same tab is a *different instance* with its own row, so
nothing routes a technician into a gated step early.

**The layout key is the part to get right.** Instance 1 of a tab keys on the
bare tab id; instance 2+ appends `#n`:

| Instance | Layout key | Why |
| --- | --- | --- |
| 1 | `recordview` | Every layout authored before instances existed resolves unchanged. **No migration is implied**, which is most of why this is affordable. |
| 2 | `recordview#2` | The `#n` suffix **is** the page-variant dimension §13's `R5PAGELAYOUT` needs in order to hold two different layouts for one tab. |

Modelled as a **key shape rather than a new table**, which is what keeps "the
record view twice with two layouts" from being a schema rewrite — the
requirement flagged as possibly huge. On the base side it is one more column
on `R5PAGELAYOUT` alongside §11's `PLO_WOTYPE`, defaulting blank for instance
1 and inheriting the same blank-key fallback cascade the table already uses.

Four rules the prototype enforces, each because the obvious alternative fails
quietly:

- **Instance 2 seeds as a copy of instance 1, and is then independent.** A
  blank second Record View is useless — the admin wants a *variant*, and
  starting empty means rebuilding twenty fields to change three. The copy must
  be a copy: pointing both instances at one layout object passes every smoke
  test, renders correctly, and makes the whole requirement silently impossible
  because editing either edits both. Pinned by `test-step-instances.js`.
- **Instance numbers are reused, not climbed.** The number is part of the
  layout key, so a monotonic counter orphans layout rows.
- **Removing an instance removes its layout**, or the next instance to reuse
  that number inherits a stranger's fields.
- **The instance number is part of the displayed name**, not a hover badge.
  Two rows both reading "Record View" with the difference in a tooltip is how
  an admin edits the wrong layout.

**Record View instance 1 stays pinned as step 1** (§14) — not movable,
hideable or removable. It *is* duplicable; that is the requirement.

**Rejected:** a surrogate step id replacing the natural composite key.
Consistent with nothing else in §12 (`R5PAGELAYOUT`/`R5FUNCTIONTABS`/
`R5TABPERMISSIONS` all key themselves naturally), and it would have made the
layout key opaque — the one thing that needed to stay legible, since it is how
two layouts for one tab are told apart.

> **SHAPE REVISED 2026-09-16 (§30.11).** §12's Completion Status Entity,
> Start Work status and Completion status are no longer three declared fields
> on the workflow — they are a **placed Status update action** (§30.11). The
> resolution key is unchanged (workflow, keyed on WO Type, no Group
> dimension) and the status domains are unchanged; what changed is that a
> transition now says WHERE it happens instead of assuming two fixed moments.

## 29.3 Completion gates — require a comment / a document (locked)

**Both are columns on the step-instance row, available on *any* step**, not
step kinds of their own:

| Column | Effect |
| --- | --- |
| `Requires Comment` | §14.7 bar-locking: Next stays locked until a comment is entered. |
| `Requires Document` | Next stays locked until at least one attachment exists. |

**Why attributes and not step kinds.** "Force a comment at this step" is a
property of the step the technician is *already on*. As a separate kind, a
Book Labor step could never require one without an extra screen sitting next
to it — which is a worse workflow and an extra tap for the same outcome. A
step whose only content is the comment box is then the **degenerate case of
one mechanic**, not a second mechanic. Both shapes the requirement asked for
("require a step to insert a comment" and "the same for requiring a document
attachment as a step") are reachable from the one column.

**Where the content lands is the other half of the decision, and the more
important half: the WO's normal Comments and Documents (§7.2)** — not a
private per-step store. The requirement said this outright ("kinda like the
closing comments text area; but gets added to regular comments screen"), and
it is also the only defensible answer: a forced note nobody can find
afterwards is worse than no note. §7.2 already puts both on the record view
top-3 with a View-more into the full tab, so a gated comment is discoverable
by every route that already exists and needs no new surface.

**This absorbs an existing behaviour rather than only adding a new one.** WO
Closing's Closing Comments (§19.5) is a gate of exactly this shape that
predates the mechanic being named; the Breakdown/PM/Inspection demo
configurations seed `Requires Comment` on Closing to show that.

Two authoring-time validations, because neither is visible on the device:

- **A gate on a step that isn't `Required`** lets the technician finish the
  workflow without ever opening it, so the gate never fires. Warned, not
  refused — an advisory gate is a legitimate if unusual choice.
- **A gate on a `More` entry does nothing at all** — there is no Next button
  to lock (§14.8).

## 29.4 Question fork — asks, then routes (locked)

A third step **kind** alongside `tab` and `uds`. It carries no record data:
nothing it produces lands on the work order, its entire output is a routing
decision. That is why it has no field layout and takes no `R5PAGELAYOUT` rows
at all — modelling it as a step with an odd field set would have put a routing
rule inside a layout table.

**Shape.** One question, N answers, each answer with a target:

| Target | Meaning |
| --- | --- |
| *(none)* — the default | Continue to the next step. Nothing is skipped. |
| A later step | Jump there. Everything between is marked **N/A**. |
| End the workflow | Every remaining step is marked **N/A**. |

**Forward-only, and enforced twice.** Targets are drawn only from steps
*after* the fork, per §14.10 — a backward route is a loop with no defined
meaning. Crucially, the check re-runs **after every reorder**, not only when a
target is picked: dragging a fork later in the sequence can turn a valid
target into a backward one without anyone touching the fork. Likewise deleting
a step clears every fork that pointed at it, rather than leaving a dangling id
that silently falls through to the next step. Both are the kind of failure
nobody notices until a technician is standing in front of the asset.

**A skipped step is marked Not Applicable and stays visible in the step
rail.** It greys out, stops gating Next, and does not disappear. Three
reasons, in order of weight:

1. **§13.3 item 4.** A skipped step may already hold booked labor or issued
   parts from an earlier pass. Hiding it would retract a step carrying data,
   and un-hiding one the technician has passed has no defined meaning. N/A
   adds a state and retracts nothing.
2. **Auditability.** "What did this answer skip" is answerable from the rail.
   Hiding destroys it.
3. It reuses the rail's existing vocabulary rather than inventing a fourth
   row state.

**Rejected:** hiding skipped steps (fails 1 and 2), and letting each answer
name a whole ordered *branch* of steps. The branch model is more expressive,
but the authoring UI and the gating rules both get materially harder and
nothing in the requirement asks for more than one target.

**A fork appended last has nothing to route to.** It renders an empty target
list **and says why**, rather than a quietly empty dropdown.

### Translations — the one place admin prose reaches a technician

A fork is the **first thing in this programme where an admin types prose the
technician reads.** Every other string on a mobile screen is either a
delivered product label (already translated by the product) or record data
(never translated). That is why a translation surface lives on the prompt row
and nowhere else, and why it is not a general app concern.

- **The question and every answer label are language-keyed maps.**
- **The base language is the authoring language** and the only one that can be
  required non-empty.
- **A missing translation falls back to the base language. It never blanks.**
  This is the load-bearing rule: an empty question on a gated step is
  unanswerable, so a technician whose language has no row must still see
  readable text rather than a blocker. The authoring UI reports which
  languages are missing and refuses to treat an empty base language as fine.

**Open, and it is a backend question (§20):** where the real EAM equivalent
lives. This project has confirmed no table for user-defined text translation,
and the language-keyed map is a prototype stand-in, not a schema proposal.

## 29.5 UDS tabs — placed by the same mechanism (no new decision)

"User defined screen tabs" needed no new model: §27.1 already puts a UDS in
§14.8's candidate set **by construction** and gives it a §12 tier-2 row, and
§27.4 already splits authoring three ways. §29 only makes it real in the
prototype — a UDS is a step **kind** the designer can place, with `Visible`
/ `Placement` / `Sequence` / `Required` and now gates, exactly like a
delivered tab.

**Screen Designer shows the definition read-only and says why**, rather than
rendering something that looks draggable and silently isn't. Field authoring
belongs to base EAM's own UDS setup (§27.4 role 1) and is out of scope per
§27.2 — it is the mistake that retired the Workflow Designer.

**§27.4's consistency consequence is now built** on User Group Setup: a
configuration placing a UDS tab as a **Required** step, for a group with no
`PRM_SELECT` on that tab, is a **hard dead end** — the technician can neither
complete it nor skip it, so the work order cannot be finished. Reported as an
error; the same step **not** Required is a warning, because that workflow
still completes. The fix is named as **Security ▸ Tab Permissions** or Screen
Designer, never "assign a different group," per §26.5.1's rule that capability
gaps are reported and never worked around.

## 29.6 User Group Setup's Offline tab — assignment, not a field form

Not one of the five requirements, but the tab was still on the model §2.1/§2.10
retired on 2026-09-08 — its Scope list literally offered **"All records"**,
which §2.7 now refuses outright.

**§26.5's table row for sync is superseded** (relocated to §21). It read
*"one per group | **here**, field-shaped | record type × filter scope ×
horizon × row cap"*, with the reasoning that sync was "the only one of the
four domains that is genuinely field-shaped — which is why it is edited here
rather than deep-linked to a designer." Two later decisions point the other
way:

1. **§2.1 reversed the polarity to online-first.** "What a device downloads at
   login" stopped being the interesting question; "what is guaranteed
   *executable offline*" is a different and narrower thing.
2. **§2.10 named the unit — an offline profile**, a named bundle of §2.7's
   per-entity registry, its caps and §2.8's lookup classes, *assigned* per
   user group. Which makes its grain **one artifact → many groups**, exactly
   like a workflow configuration. §26.5.1 already ruled on that grain.

So the tab is now **profile assignment**, and profile contents are read-only
on it — for the same reason a configuration's steps are. Three things it
renders that the old grid could not:

- **The two never-switchable layers, first and for every group** (§2.10 items
  1–2): Tier 0 configuration in its §2.3 order, and the outbox. An admin
  handed a single "offline" control will reasonably assume switching it off
  also stops the outbox. It never does — the outbox serves R6 / transaction
  confidence, which is a High VoC theme *independent* of offline. The screen
  says so in as many words.
- **`None` as a real, valid row** — §2.10's off state, for an **internal
  online-only user group** (a storeroom or planner group that is always in
  network). It is **no longer described as the Contractor/BYOD answer** — that
  claim was withdrawn 2026-09-11 (§2.2/§21). Reported as **informational, never
  a warning**:
  it is a deliberate provisioning choice, and the previous single "no download
  policy" warning conflated it with the genuinely different "no policy
  resolves anywhere." A consistency panel that calls a correct configuration
  broken stops being read.
- **§4.4.1's consequence, at the point of assignment.** For a replicating
  group "Offline" means *working from the device*; for a `None` group it means
  *you cannot load work*. **Same icon, opposite promise** — and this is the
  only place the assignment is visible to the technician at all. The distinct
  state or copy is still owed (§20).

**The profile-authoring surface was built 2026-09-16** — see §30.14. It is an
area of the Workflow Designer Portal, not an improvisation on this screen, so
the reason this section gives for keeping it off the group side still holds:
one artifact serves many groups, and editing it from one group's side
re-provisions every other member. Of the three gaps this paragraph used to
name together, two are now closed (this one and the Home layout designer,
§30.13); Equipment's four `PLO_PAGENAME` layouts remain open in §20.

## 29.7 A false positive fixed on the way

`capabilityGap()` compared a function's tab set against a **fixed** five-step
list, so `ZJ1000` reported a Checklist + Book Labor gap on *every* ZJ1000
configuration — including one that places neither and renders perfectly. It is
keyed on the **configuration** now: the gap is the tabs *this config places*
that the function lacks. Record View is excluded (it always exists, §14), a
duplicate instance needs no extra capability, and a UDS is not a function
capability question at all but a tab-**permission** one (§29.5). A warning
that fires on a configuration with nothing wrong is how admins learn to ignore
warnings, so it is pinned by `test-user-group-offline.js`.

Also fixed: the designer's step drag-reorder had been **dead**. Its selector
read `#wfpStepRows`, but the container's id has been `tpStepRows` since the
left pane merged tab navigation with step management — so every listener was
attached to an empty NodeList and nothing was reorderable. Both step lists are
wired now, and dragging a row between them changes its `Placement`.

# 30. Workflow as an Applied Artifact — the Workflow Designer Portal

Added 2026-09-16, on direct instruction, after the user reported being "not
crazy about how the workflows are defined coming in from the User Group side"
and asked to **create workflows and apply them to user groups**. Prototyped in
`prototypes/standalone/base screens/eam-workflow-portal-v1.html`.

**This partially reverses §21's retirement of a standalone workflow designer,
and the reversal was flagged before the work started.** What it does not
reverse is the reason that file died — see §30.1.

## 30.1 The reversal, and the half of it that still holds

§21 retired `eam-workflow-designer-v1_1.html` on 2026-08-25 and §26.5.1 made
Screen Designer the only workflow-authoring surface. Two separate claims were
bundled in that:

| The claim | Status |
| --- | --- |
| A second surface must not author **field-level layout or UDS field definitions** — two editors that can each change a layout will disagree. | **Still locked.** Unchanged by this section. |
| Therefore there must be **no separate workflow surface at all**, and sequence/gating/routing live in Screen Designer. | **Reversed.** |

The second did not follow from the first. What the old file got wrong was
**rebuilding the field editor**; what it got right, and what §10's one-surface
rule discarded along with it, was that *a workflow is a thing* — nameable,
copyable, previewable, and assignable — rather than the residue of having
saved a layout to a group.

**The split is by grain, not by feature — and by 2026-09-16 it is not even two
surfaces.** The portal authors the shape of the workflow; the field layout opens
**inside** the portal, on the selected step. **Screen Designer has no standalone
destination** (§30.9): it is invoked per step node from the workflow configurator
and nothing navigates to it. One layout, one editor, two zoom levels, one surface.

| The portal owns | The layout editor owns |
| --- | --- |
| Which steps, in what order | Which fields, in which container |
| Step vs. More placement (§14.8) | Required / Protected / Hidden / N/A (§12–§13) |
| Completion gates (§29.3) | Grid vs. List container (§5.2) |
| Question forks and their routing (§29.4) | Field order within a container |
| Free Form on/off (§14.10) | |
| Which user groups the workflow applies to | |

**§29 is the model this sits on, unchanged.** A canvas node *is* a §29.2 step
instance: it carries `kind`, `placement`, `visible`, `required`, both gates, and
an `inst` number that is part of the layout key. Nothing about the key grain,
the gates or the fork semantics is re-decided here — this section decides where
that model is **authored** and how it is **applied**, and §29 continues to
govern what it means.

## 30.2 Assignment — one workflow per (group, WO Type) (locked)

The new rule, and the only genuinely new *rule* in this section:

> A user group may be assigned **at most one workflow per WO Type**, and **at
> most one Free Form workflow**.

**Why it has to be exactly one.** §11 resolves a workflow from `(WO Type, user
group)` and must land on a single row. Without the constraint, "apply a
workflow to a group" is not a resolvable statement — two workflows assigned for
the same pair would make the technician's rail depend on row order in a table.
The Free Form clause is the same rule for the case where WO Type is absent: a
Free Form workflow with no Type is a group's fallback, and a group cannot have
two fallbacks.

**Assign is not copy, seen from the copy side.** §26.5.1 already locked that
assigning adds a group to an existing artifact. The consequence this section
adds: **a copied workflow carries no assignments.** A copy that inherited them
would violate the rule above on creation — the copy would be a second workflow
for every `(group, Type)` pair the original held, before the admin had touched
anything. The prototype also re-mints every node id on copy, because a fork
target is a *pointer to another step* (§29.4) and a copy sharing ids would let
an edit to one workflow re-route the other.

**Where the assignment editor lives was decided the same day: in this portal**
(user direction, 2026-09-16 — "this will be the single base screen entry
point/portal"). It was **built the same day** — see §30.13, which
generalises this rule to every configuration artifact and replaces the
per-workflow `assignments` array with one membership table read from both
directions. The consequence is §26's own prototype being retired — see §30.6. The rule's **enforcement surface** matters as much as the
rule: collisions are
computed across all workflows and reported in the gallery, because a
cross-artifact constraint cannot be seen from inside any single workflow — the
same reason User Group Setup carries a cross-domain consistency strip (§26.5).
Reported, never auto-resolved: which of two workflows to un-assign is the
admin's call.

## 30.3 The layout editor opens *alongside* the canvas (locked)

Direct instruction, mid-session: the Screen Designer portion opens **beside**
the canvas, taking the right third, for the selected node — not as a
navigation away from the flow.

This is what lets the two grains be one surface. With the canvas still on
screen, *"which step am I editing, and what comes after it"* never costs a
navigation to answer; open the layout as a separate screen and the admin is
back to holding the sequence in their head, which is the state that made
authoring a workflow in Screen Designer feel wrong in the first place.

Two consequences worth stating, because both are load-bearing:

- **The emulator inside the panel is a real 390px frame, not a scaled one.** A
  scaled emulator stops being a preview of anything. The panel is therefore
  `flex: 0 0 40%` by default, **resizable by a grip on its left edge, and the
  width persists** (`localStorage.eamWfpDsnWidth`) — an admin who widened the
  panel to read a two-up grid container properly should not have to do it
  again on the next step. The lower clamp is the width of a real emulator plus
  its padding, which is the same "copied geometry, not approximated"
  discipline as §26.4's live nav arithmetic: below that bound the panel stops
  previewing anything, so it is a floor rather than a preference.
- **Selecting a node does not open the panel.** It is opened explicitly from
  the node's own menu. A click that also claimed a third of the screen would
  make selection unaffordable, and a fork has no layout to show.

## 30.4 Authoring affordances that are decisions, not styling

**A question fork is authored from the connector's `+`, and is still a step
instance.** The user offered two options — entries in the left-hand library, or
a `+` on the arrow between nodes — and asked for a recommendation. The `+`
wins because it **names the insertion point implicitly**: the fork lands
between two known steps instead of being dropped loose and then wired up. The
library also carries a draggable fork entry for people who reach left first;
both create the same thing. Underneath, it is a `kind: 'prompt'` instance
exactly as §29.4 requires — a screen the technician sees, not a numbered step
they complete — so the authoring affordance and the stored model do not
diverge. **Two answers, hard-capped**, per the user's own constraint and
§29.4's rejection of the branch model.

**A fork card is a question pill over two answer pills, and the routing is
drawn.** Each answer pill gets a wire to the step it actually reaches, curving
out into the canvas gutter and arrowheaded into its destination. The first
version named the destinations *in text* inside the card ("Yes → Book
Labor"), which is legible but makes the admin hold the mapping in their head
and re-find each named step in the column — the exact work a canvas exists to
remove. Three things fall out of drawing it instead:

- **The straight connector below a fork is suppressed.** Drawing both claims
  the flow continues straight *and* branches.
- **"Continue" resolves to the next *step*, not the next node.** The next node
  can be another fork, and a fork is a screen the technician passes through,
  never a destination a branch lands on. Split out as a pure function and
  pinned, because two adjacent forks is the case that gets this wrong.
- **"End the workflow" needs somewhere to point**, so a terminal chip renders
  at the foot of the flow — but only when a fork actually targets it, rather
  than standing there explaining a feature nobody used.

The wires are **measured from layout**, not computed from the model, because
the only reliable answer to "where did that card end up" is the layout itself.
That costs a redraw on anything that changes the canvas width — a window
resize, and the designer panel's own drag — and it means the renderer must
no-op cleanly where there is no layout at all. It guards on the **DOM
capability it uses**, not on the measured box size: a headless run can hand
back a synthetic non-zero rect, so a size check alone let execution reach
`createElementNS` and take the whole render down with it.

**The More zone sits under the flow, at the same width.** It was beside it, to
the upper right. Alongside reads as a *parallel track running next to the
sequence*, which is the opposite of what it is; below and equal-width says
"these are also part of this workflow, they just are not in the order."

**A rename never hides the delivered label.** The renamed value becomes the
node's main text, because that is what the technician reads in the step rail.
The delivered label moves into a pill on the card rather than disappearing:
*"what is this step called"* and *"which step am I configuring"* are different
questions and an admin needs both answered at once.

**The zone for steps taken out of the flow is called "More", not
"Reference".** §14.8 renamed it on 2026-08-25 and `.step-map-group-label`
renders that word to the technician; an admin screen calling it something else
would be the designer and the device disagreeing about the same group. The
canvas labels it **More** with "reference steps" as its explanation. Moving a
node in also **clears Required and both gates** — nothing routes the technician
to a More entry, so the flag would be unenforceable (§14.8), and clearing it on
the move rather than merely disabling the control means the stored row cannot
hold a state the runtime has to ignore.

**Free Form is the More paradigm at full extent, and the confirm is
one-directional.** Rather than a second canvas, Free Form renders the same
zone chrome scaled to the whole surface — one paradigm, two extents. Turning it
**on** confirms and enumerates what is lost, per the user's item 10: order and
forks go, steps are kept in the order defined, and **any step placed more than
once collapses to one** (Free Form has one tab per step, so a second instance
has nowhere to be; `inst` returns to 1 and the surviving instance keeps its own
layout). Turning it **off** does not confirm — the cards already have a display
order, so it becomes a sequence in that order and nothing is destroyed. An
unnecessary confirm on the safe direction is how people learn to dismiss the
one that matters.

**The left panel is a "Step Library."** Considered and rejected: *Palette*,
*Toolbox*, *Available Steps*. These are catalogue entries you take copies of,
which is what a library is and a palette is not. Items are inert on click by
instruction — the only verb is drag, and a click that did something else would
teach the wrong one.

**Record View instance 1 stays pinned as step 1.** §14 fixes it there; it can
be duplicated (that is the second-Record-View requirement, §29.2) but not
moved, removed, or pushed into More. The drop index clamps past it rather than
rejecting the drop afterwards — quieter than an error for a rule the admin
cannot break anyway. Enforced at the array mutation, not only in the drag
geometry, so no future caller can route around it.

**One auto-laid-out column, which is why the arrows need no logic of their
own.** The canvas redraws connectors from the node array on every render, so
*"dropped above the second card"* and *"is the new second card"* are the same
statement. The user's requirement that dropping a node above another re-points
the arrow and re-formats the canvas is not implemented as a rule; it falls out
of there being no free node position for a rule to be needed about.

**No small caps anywhere, pills least of all.** Every
`text-transform: uppercase` came out on 2026-09-16 (user direction). The
reason it matters beyond taste: this surface is dense with *short* labels —
step names, answer labels, WO Type codes, zone headings — and upper-casing a
short label costs width while removing the word-shape that makes it scannable.
Capitals were also doing a second job here, standing in for hierarchy that the
existing weight and colour tokens already carry. Note the app's own
`.step-map-group-label` still upper-cases "More" on the device; that is
`eam-shared.css` and a separate call, so the two are deliberately not
synchronised by this change.

**No new colour instrument** (§23). WO Type uses the four `--wo-type-*` tokens
and their exact glyphs, copied from `eam-shared.js` so the badge means the same
thing it means on the device; a Type outside that set gets an **outline pill,
not a fifth hue**. Flow vs. Free Form reads as **shape** — solid versus dashed
card edge. The More zone reuses the teal wash already carrying "the `*`
default" on User Group Setup. Gates borrow `--wo-type-breakdown` and forks
`--wo-type-routine`, which are the same two borrowings that file already makes
for the same two meanings.

## 30.6 One portal, not a folder of sibling screens (locked)

Decided 2026-09-16, immediately after the first build, on the observation that
the base track had become a set of admin screens linking to each other — and
that one of those links was **already dead** (User Group Setup's flyout still
pointed at the Workflow Designer retired three weeks earlier in §21, and
nothing had noticed).

> **Mobile configuration is one portal with AREAS. The Workflow Designer
> Portal is the single base-screen entry point.**

**What this retires:** `eam-user-group-setup-prototype-v1.html`, to
`base screens/old versions/` per the one-live-version convention. **§26 is
unaffected** — the binding-screen model, the no-insert tell, the
declared-vs-effective resolver, the cross-domain strip and §29.6's Offline tab
are all still locked, and all get rebuilt as the portal's User Groups area.
Retiring a prototype is not retiring the section that specifies it; §21's row
lists the six mechanics to carry over so they are not re-derived from scratch.

**What it does not retire:** the *capability*. Screen Designer is still the
field-level editor and §30.1 still turns on keeping exactly one of those — but
it is a **panel inside this portal, not a surface beside it** (§30.9,
2026-09-16). **The portal has no links out at all**, which is a stronger
version of this rule than it originally shipped with, and it is pinned by
test rather than trusted.

**The rule that makes this hold up.** A flyout row under "Mobile
configuration" is an **area of the portal**, never a link to another file.
Adding a sibling screen and linking to it would undo the decision without
anybody deciding anything — which is exactly how the dead link above
happened. Home Layout and Offline Profiles are listed as areas that do not
exist yet rather than as links to screens that do not exist, so the absence
is visible in the one place someone would go looking.

**Two debts this opened**, both tracked in §20 rather than papered over: the
`eamDesignerEntry` deep link has lost its only producer, and
`test-user-group-offline.js` now pins its rules against an archived file, so
those cases need re-pinning against the portal once the area is real.
## 30.7 Rebuilt on the Octave design system (locked, with five exceptions)

Rebuilt 2026-09-16 on direct instruction — *"pertaining ONLY to components,
UX, look and feel"* — against `prototypes/standalone/base screens/DESIGN_FILES/`
(`DESIGN-2026-08-11.md`, `uxt-tokens.css` = uxt-dsp@2.4.0, `octave-components.md`).
**Behaviour was held constant and proven so**: every one of the 63 assertions in
`test-workflow-portal.js` passed before and after, and the only test edit was
one class name (`node-orig` → `node__orig`).

**Tokens are linked, not copied.** `DESIGN_FILES/uxt-tokens.css` is a `<link>`,
so there is no second copy of a hex to drift and re-pulling the package updates
the screen. **That makes `DESIGN_FILES/uxt-tokens.css` a runtime dependency**,
committed rather than treated as a design input; moving it breaks the screen.

**SCOPE, confirmed by the user the same day:** the Octave / OUX design system
applies to the **base screens and this portal only**. It does **not** apply to
anything inside the mobile app unless explicitly stated. §23 and
`eam-shared.css` remain the mobile app's design system, untouched by this
section. That is what makes exception 3 below a scope boundary rather than a
compromise — and it means the two systems are *expected* to differ, so their
differences are catalogued in §30.8 rather than treated as drift to fix.

**What changed structurally.** The 76px icon rail, the slide-out flyout and the
dark top bar are gone, replaced by AppShell's 232px labelled rail plus a 44px
app-bar over an inset rounded panel. This is the shape §30.6 was reaching for:
the rows under *Mobile configuration* are **areas**, and Home Layout and Offline
Profiles now read as areas that do not exist yet rather than links to screens
that do not exist. The rail is resizable and its width persists, as is the
designer panel's.

### The five exceptions, and why each one is not negotiable

Octave's own rules are strict — never reference a `ui.*`/`status.*`/`accent.*`
primitive in a component, and every icon is Material Symbols. It sanctions
exactly one exception of its own (New Chat Button's pillar fills). This screen
adds five, all declared in one place so they stay countable:

| # | Exception | Why |
| --- | --- | --- |
| 1 | **WO Type keeps its four raw hexes** (`--wo-type-*`) | §23.3 requires this badge to render identically across the Type field, the WO List row, the mobile step rail and here. Re-mapping Breakdown onto an Octave severity would make the admin screen and the technician's device disagree about the same Type — and WO Type is **record data, not a severity**. A fifth Type still gets no colour. |
| 2 | **The four WO Type glyphs stay inline SVG** | Same reason one level down: §23.3 is about the *shape* as much as the hue. A Material Symbol that merely resembles the device's Breakdown triangle breaks the identity. Copied from `eam-shared.js`, not redrawn. |
| 3 | **The emulator keeps the device's palette entirely** | It is a picture of the technician's app, which has its own locked palette (§23): green means complete, the nav is Octave Black. Restyling it into Octave severity would mean the preview no longer previews — a worse version of §30.3's argument against a scaled emulator. The device palette is declared as `--d-*` custom properties **scoped to `.emu`** so it cannot leak, and the test asserts that quarantine in both directions. |
| 4 | **The action-state overlay is `::after`, not a child span** | A markup deviation, not a visual one. uxt-react renders `<span class="Button__actionStateOverlay">` because React can guarantee it; hand-written HTML cannot, and the span buys nothing a pseudo-element cannot do. Same two overlay colours, and every `class="Button"` in the file is complete on its own. |
| 5 | **The fork-wire arrowhead is SVG** | Outside the icon rule by *kind* rather than by exception — it is a graphic primitive in a drawn connector, not an icon in a component slot. |

### Direct conflicts with rules set earlier in this programme

Four, all resolved without re-opening a locked rule:

1. **"On track / good" is INFO (blue) in Octave, not success (green)** —
   DESIGN-2026-08-11's Severity Semantics is explicit that green exists but is
   not the default healthy state. §23 locks green as *complete* on the device.
   **Resolved by scope:** the portal chrome follows Octave (blue accent, blue
   for informational bands), and the emulator keeps green, per exception 3.
   The two never claim to be the same instrument because they are never in the
   same surface.
2. **Octave's primary accent is blue `#0055ff`; §23 has no blue instrument and
   blue is already `--wo-type-ppm`.** The portal adopts Octave blue for CTAs,
   links and active states. They do not collide in practice: the WO Type badge
   always carries its own glyph *and* its code, and an accent CTA is never
   adjacent to a PM badge in a way that reads as one instrument. **Flagged
   rather than silently accepted** — if it ever does read as one, the fix is
   the badge's, not the accent's.
3. **Fonts: §23/`eam-shared.css` say Inter; Octave says Octave Sans/Display.**
   Octave Sans is not a public web font, and Noto Sans is the design system's
   own declared fallback — `octave-components.md`'s own previews load exactly
   that from Google Fonts, so this screen renders with the face the components
   were designed against. **Mono did not change**: Octave's `--font-mono`
   already resolves to JetBrains Mono. Inter now appears exactly once in the
   file, inside `.emu`, where it is the device's font.
4. **"No ALL CAPS" (2026-09-16) vs. Octave's `text-transform: capitalize` on
   button labels.** Not a conflict — capitalize is title case, and Octave's
   Status Dot spec independently specifies "a regular-case label (not
   uppercase)". The two agree. Buttons are title-cased per the component spec;
   nothing is upper-cased anywhere.

**One internal contradiction inside the design files themselves**, resolved and
recorded: `DESIGN-2026-08-11.md` specifies a 36px Chip ("overrides uxt-react's
default 32px — matches Button height everywhere"), while `AppShell.html` ships
`.chip{height:32px}`. Both are kept — 36px is the canonical component, `--dense`
is the 32px bar variant, which is what AppShell itself uses in its app-bar. The
doc wins for the canonical case because it is the spec and AppShell is a product
preview.

### The failure mode this rebuild taught us

A mistyped token name is **invisible**: `var(--uxt-theme-typography-h5-font-size)`
resolves to nothing, the rule silently does not apply, and the screen still
renders — just with four type sizes quietly inheriting the body size. That is
exactly what happened; the package ships `h-5` and `sub-title-2`, not `h5` and
`subtitle-2`. Nothing at runtime would ever have reported it.

So `test-workflow-portal.js` now **diffs every `var(--uxt-theme-*)` reference
against the linked package** and fails on any that does not resolve, alongside
assertions pinning all five exceptions and the emulator quarantine. Verified by
re-introducing a typo. **Any future work against this token set should assume
the names are not guessable and check them.**

## 30.8 Mobile (§23) vs. base/OUX (Octave) — the catalogued differences

Produced 2026-09-16 on request, after the user confirmed the scope boundary:
**Octave applies to the base screens and this portal only, never to the mobile
app unless explicitly stated.** So these are not defects to reconcile — they
are two design systems doing two jobs. The reason to catalogue them is
narrower and more useful: **so nobody assumes a component can be carried
across the seam unchanged**, and so the handful of genuine near-misses are
known rather than discovered.

Measured by diffing `eam-shared.css`'s `:root` against `uxt-tokens.css`
(uxt-dsp@2.4.0, light) and `DESIGN-2026-08-11.md`.

### The headline: the two systems already share a neutral ramp

**13 of mobile's 26 hex tokens are literally base primitives** — not
approximations, the same hex:

| Mobile token | Hex | Is base |
| --- | --- | --- |
| `--octave-black`, `--bg-nav` | `#1a1a1f` | `ui.black[700]` |
| `--gray-5` | `#3e4047` | `ui.black[400]` = `ui.grey[900]` |
| `--gray-4` | `#6f7480` | `ui.black[50]` = `ui.grey[600]` |
| `--gray-3` | `#b2b8c4` | `ui.grey[200]` |
| `--gray-2`, `--border-strong` | `#cbd0d8` | `ui.grey[50]` = `ui.white[900]` |
| `--gray-1`, `--border` | `#e7ebf2` | `ui.white[400]` |
| `--white`, `--bg-card` | `#ffffff` | `ui.white[50]` |
| `--orange` | `#f46600` | `accent.blazeOrange[500]` |
| `--octave-yellow` | `#fff500` | `accent.yellow[500]` |

So the *greys are the same ramp*, mapped to different semantic slots. The
divergence is concentrated in exactly two places, below.

### Divergence 1 — four NEAR-MISSES, the dangerous category

Close enough to look like a mistake, far enough to be one. These are the ones
worth knowing about, because a component copied across the seam reads as
subtly wrong rather than obviously wrong:

| Concept | Mobile | Base | Δ (RGB) |
| --- | --- | --- | --- |
| page background | `#F5F6F8` | `#f3f5f9` (`ui.white[200]`) | **2.4** |
| section / subtle | `#F0F2F5` | `#edf0f5` (`ui.white[300]`) | **3.6** |
| accent | `#007B87` teal | `#008080` (`accent.aqua[900]`) | **8.6** |
| WO Type Breakdown | `#F5821F` | `#f6822e` (`accent.blazeOrange[400]`) | **15.0** |

**No action proposed.** Mobile's values are locked (§23) and the base ones come
from the package; nudging either to close a Δ of 2.4 would be churn against a
locked rule for no perceptible gain. Recorded so that if the two ever *do* need
to match, the size of the job is known to be four tokens and not a repaint.

### Divergence 2 — the semantic hues genuinely differ, and so does their meaning

| Concept | Mobile (§23) | Base (Octave) |
| --- | --- | --- |
| success / green | `#16C130` — deliberately bolder, 2026-07-28 palette pass | `#47be68`, and **not the default "good" state** |
| error / red | `#DC2626` | `#f3434a` |
| accent | `--teal #007B87`, used sparingly | `primary.main #0055ff`, for **all** CTAs/links/active |
| **warning** | **no token at all** — §23 has no amber instrument | `#ffb42e`, a full severity |
| **info** | **no token at all** | `#2eb8e7`, and it is the "on track / good" colour |
| nav surface | ink `#1A1A1F` | paper `#f3f5f9` — base's app-bar is **light** |
| WO Type ×4, Priority High | mobile-owned, **in neither base ramp** | — |

**The two consequential ones:**

1. **"Good" is green on mobile and BLUE in base.** DESIGN-2026-08-11's Severity
   Semantics is explicit: *"info: on track, approved, 'good' → blue, not green.
   Green (success) exists as a severity but is not the default 'good' state."*
   §23 locks green as complete. Any status language moved across the seam
   inverts meaning, not just hue.
2. **Mobile has no `warning` and no `info` token.** §23's instrument set is
   deliberately smaller, so a base component using either severity has
   **nowhere to land** on mobile — it needs a §23 decision first, not a token
   mapping. This is the single biggest blocker to sharing a component.

### Divergence 3 — type, geometry and finish

| | Mobile | Base |
| --- | --- | --- |
| sans | Inter | Octave Sans → **Noto Sans** fallback |
| mono | JetBrains Mono | JetBrains Mono — **identical** |
| scale | per-component px (11–15px typical) | token scale in `rem` (caption .75 / body-2 .875 / body-1 1 / h-6 1.25) |
| radii | 100px pills (32×), then 10px (15×), 8px, 6px — **10px is mobile's own**, not on base's scale | 4 / 6 / 8 / 12 / 16 / 24 / 100 / 9999 |
| control heights | per-component; 56px rails, 44px touch targets | button 36 / chip 32 / input 40 / app-bar 44 / item 48 |
| finish | flat, 1px borders, one rail shadow | layered elevation (`elev-1`…`elev-4`), inset hairline + double drop |
| icons | inline SVG, outlined, 1.8 stroke | Material Symbols Outlined (**flagged TEMPORARY upstream**) |

**Two notes worth carrying:** mono is already identical, so monospace
identifiers are the one thing that renders the same on both sides. And
**mobile's 10px radius has no equivalent on base's scale** (base jumps 8 → 12),
so a card ported either way changes shape by 2px — the most likely
"why does this look slightly off" in a future port.

### One accessibility finding in the base docs, inherited not introduced

`chip-status-fill`'s **warning** pair reaches only **3.61:1** — it passes the
3:1 UI-component bar and fails AA text. The doc already flags it and explains
why (yellow cannot pass at any step of its own scale, hence the cross-hue swap
to `status.orange[900]`). **Carried, not fixed**: it is the package's open gap,
and the portal uses that pair only on a Chip, which is the UI-component case it
does pass. Do not reuse it for body text.

### What this means practically

- **No component crosses the seam unchanged.** The greys will survive; the
  severities, the accent, the radii and the icon set will not.
- **The emulator is the seam made visible**, and it is why §30.7's exception 3
  exists: inside `.emu` the device palette is re-declared as `--d-*` tokens,
  scoped, and asserted by test in both directions.
- **If a shared component library is ever wanted**, the prerequisite is not a
  token map — it is a §23 decision about `warning` and `info`, which mobile
  does not have and base leans on heavily.

## 30.9 Screen Designer has no standalone surface (locked)

Direct instruction, 2026-09-16: *"Screen designer standalone is not a thing. It
will only be invoked from the portal via workflow configurator."*

> **Screen Designer is a panel, not a screen.** It is invoked per **step
> instance** from the workflow configurator and opens in the portal's own
> right-hand panel. Nothing navigates to it. **The portal has no links out at
> all.**

**Why this is stronger than it looks.** §30.6 already made the portal the
single base-screen entry point, but it carved out "one permitted link out" for
Screen Designer. That carve-out is now gone, which removes the last way the
areas-not-links rule could erode: a sibling screen with a rail row is one
refactor away from a second sibling screen with a rail row.

**Why it is also the right shape, not just the instruction.** A layout belongs
to **one step instance**. The layout key it edits — `id` for instance 1,
`id#n` after (§29.2) — does not exist until a node does. A front door for
Screen Designer would therefore have to invent a context it cannot have:
"design a layout" with no step selected is not a well-formed request in this
model. Reaching it from a node's `⋯ ▸ Screen Designer` is not a convenience,
it is the only way the operation is fully specified.

### What this resolves

Three open items close, and none of them needed extra work:

| Was open | Now |
| --- | --- |
| **Two surfaces can express a workflow sequence** (§20, opened earlier the same day) | Closed. There is one surface. §26.5.1's duplication concern is answered at the level it was raised. |
| **`eamDesignerEntry` has a consumer and no producer** (§20) | Closed, and not by finding a producer. The key was a handoff *into a standalone Screen Designer*; with no standalone destination there is nothing to hand over, and a step node already knows its function, WO Type and layout key. The contract dies with the surface. |
| **Restyle Screen Designer off DM Sans / teal-purple** (carried since 2026-08-24) | Closed by the surface going away rather than by being restyled. **DM Sans / teal-purple is no longer on anything a user can reach** — the embedded panel is Octave (§30.7). |

### Parity was built, and the standalone file is retired

Rather than manage the gap, the five missing capabilities were ported the
same day and `eam-screen-designer-v1.html` went to
`base screens/old versions/` — the one-live-version convention, same
precedent as User Group Setup. **Two of the five are not panel-level**, and
putting them in the panel would have been the wrong grain:

| Ported | Landed in | Why there |
| --- | --- | --- |
| **Clone-aware function picker** (`BASE_FUNCTIONS`, §26.2) | the workflow **banner** | A workflow resolves to a function, and the function decides which steps can exist at all. In the panel it would scope to one step, letting two steps of one workflow disagree about which screen they belong to. |
| **§12 completion trio** (entity + Start Work + Completion status) | the workflow **banner** | Keyed on WO Type with **no Group dimension** (§12) — so it is workflow-level by definition, not per-step and not per-assignment. |
| **Field Grid Section** — 1-or-2 column spans | the **panel**, per grid cell | Genuinely per-container layout (§5.2). |
| **UDS placement** (§27.4 / §29.5) | the **Step Library** → a `uds` node kind | A UDS is a step, so it is placed like one. Its panel is **read-only by construction**: no add-field, no container list, no property menu. |
| **Fork translations** (§29.4) | the **fork editor** | The one place an admin types prose a technician reads. |
| *(sixth, while in there)* **Time Entry Mode** | **step settings**, per instance | Book Labor can be placed twice; two placements sharing one mode is a coupling nothing on screen explains (§29). |

**Three things the port made real that were previously only described.**

1. **Capability gaps are now visible, not theoretical.** `ZJ1000` is
   capability-limited in the real export, so one demo workflow ships on it
   and therefore ships with a genuine gap. The Step Library disables what
   the function cannot render *and says which function and which tab*, the
   offending node is outlined in error red, and a Banner reports the count.
   **Nothing is auto-removed** (§26.5.1): a step the function cannot render
   is a dead end to report, and silently tidying it away would hide it. A
   *family* switch (WO → Equipment) confirms first, because that is the
   destructive case; a clone switch inside a family does not.
2. **A UDS is a real step, enforced rather than asserted.** `isStepKind()`
   replaced every `kind === 'step'` test in the sequence, N/A propagation
   and fork-target code, so a UDS numbers, gates and gets skipped by a fork
   exactly like a delivered tab. That is §29.5 in code rather than in prose.
3. **Fork text is a language map everywhere.** Every read goes through
   `tx()`, every write hits only the current language's slot, and `toTx()`
   migrates a plain string on read — so persisted pre-translation data
   works without a version stamp. The load-bearing rule is pinned: **a
   missing translation falls back to the base language and never blanks**,
   and an empty *base* language is the one thing the editor refuses to
   treat as fine.

### What the archived file is now

`eam-screen-designer-v1.html` is history, not a reference: nothing
navigates to it, it has no `screens.html` card, and
`docs/component-library.md`'s Step Instance Row now points at the portal.
`test-step-instances.js` still executes §29 against the archived copy with
a header saying so — same shape as `test-user-group-offline.js` — but **the
live coverage is `test-workflow-portal.js`**, which pins the same invariants
against the portal plus all six ported features. That is the file to extend.

**One thing genuinely did not come across, and it was deliberate:** the old
file's Field Grid Section had *no doc section at all* (flagged in CLAUDE.md
as "flag it if it becomes real"). Porting it made it real, so it is now
specified here — a grid cell is **1 or 2 columns and nothing else**, the
drag *resolves* to a span rather than tracking a width (a continuous drag
would be lying about a two-position control), and a lone trailing 1-span
cell auto-widens because a single cell dangling in the last row reads as a
layout mistake.

## 30.10 The designer panel reworked — containers as first-class (locked)

Direct instruction, 2026-09-16, the same session that ported parity into the
panel. §5.2's container model changed with it — see that section's
"Container shape is PER-CONTAINER, not positional" row, which is the
authoritative statement; this section covers the authoring surface.

### Available fields is a sidebar, and it is the screen's complement

A fourth column, right of the designer panel, collapsible to a 34px strip,
present **only while the panel is open** — it is about that panel's screen, so
it has no meaning without one. Neither a fork nor a UDS gets it: a fork has no
fields, and a UDS's fields belong to base EAM's own UDS setup (§27.4 role 1),
so offering fields to add there would be the exact mistake the read-only panel
exists to prevent.

**A field leaves the list the moment it is placed and returns when removed.**
That makes the question it answers *"what is left to add"* rather than *"what
exists"* — which the layout already shows. It has a search box because a real
function has hundreds of columns, and it shows each field's **type**, not its
function code: a type tells an admin what control they are about to place,
where the code tells them nothing they can act on from here.

**This replaced a menu.** `openAddField()` listed candidates and dropped the
chosen one into "the first container", which could not express *where* a field
goes — the only interesting part of placing one. Dragging says it.

### Add Container is a drag source, not a button

`addContainer()` always appended, which meant it could not honour "nothing
goes above the field grid" because it never chose a position at all. It is now
a drag handle: you place a container where it goes, the same gesture as
everything else on the surface.

### Containers reorder, and container 0 is pinned

Drag a container's **header** — the body holds draggable fields, so making the
whole container draggable would fight them. Nothing may be placed above the
first container (§5.2), and **the clamp lives in `moveContainer()` /
`insertContainerAt()`, not only in the drag geometry.** That is the same
lesson as the pinned Record View step and it was learned the same way: a
geometry-only guard is invisible until some other caller reaches the mutation
without having run it.

### Right-click the container header

Display state (Expanded / Show collapsed / Hidden), **To Grid / To List**,
Rename, Remove. The grid/list toggle **moved here** from a button row beneath
the emulator: it is a property of the container, so it belongs on the
container, and the row it lived in was a second place to manage one thing.
That row is gone.

Grid containers show only Expanded and Hidden — the menu does not render a
Collapsed option for them at all, rather than rendering it disabled, because
there is no state to explain. And `setContainerDisplay()` **refuses** grid +
collapsed rather than storing it: a stored-but-unrenderable state is the kind
that surfaces on a device and nowhere earlier.

### Field right-click, stripped

The function code and all five per-option helper sentences came out. The code
is not something an admin can act on from this menu, and five explanatory
sentences against five options is longer than the options. The colour bar
carries the state and the legend above the emulator is the key — **that legend
stayed**, because five words against five bars is a key, not prose.

### THE NON-STANDARD CONTAINER — WO Record View's Activities (§15.2)

Notated because it is a real exception and the designer must not present it as
an ordinary field container:

> On **WO Record View specifically**, Activities is **not a field container**.
> It is a **single-select record list** with its own `+` add affordance, its
> own Add/Edit popup, and a per-row completion state (§15.2). Its fields are
> not authored through the layout.

It is flagged **on the data** (`sec.std === false`, derived in
`normalizeWf()`) rather than by matching the container's name at each render
site, so one rule decides it. The panel marks it with a leading amber rule and
an inline note saying what it is, it **refuses a dropped field**, and renaming
a container re-derives the flag so it cannot drift away from the name.

**What is deliberately NOT specified here:** the special handling itself.
Activities' real behaviour is §15.2's, and how much of it an admin should be
able to configure — which fields the Add/Edit popup shows, whether the
completion rule is configurable — has never been asked. The designer's job for
now is to refuse to lie about it. Whether any other screen has a container of
this shape is also unasked; the flag is general but only Record View sets it.

### Verified

All 178 assertions pass. Three were negative-controlled by re-introducing the
bug, because each would pass a smoke test while being wrong: a grid that
**accepts** `collapsed` (stored, unrenderable, only visible on a device), a
container draggable **above** the pinned first one, and Activities treated as
an ordinary field container that accepts fields.

## 30.11 Status transitions are PLACED, not declared (locked)

Direct instruction, 2026-09-16, alongside the designer's second pass.

> §12's **Completion Status Entity**, **Start Work status** and **Completion
> status** are no longer three fields on the workflow. They are replaced by a
> single **Status update** action, dragged into the flow wherever the
> transition happens. It opens a popup with a **Status Entity** and one
> **status** dropdown, and defaults to Work Order.

**What §12 keeps, and what it loses.** The *resolution key* is untouched —
completion status is still a property of the workflow, keyed on WO Type with
**no Group dimension**. What changed is its **shape**: three declared fields
could only ever express **two transitions at two fixed moments**, and both
moments were assumptions baked into the model. Placing the transition says
*where* it happens, which is the thing the two fields were standing in for,
and it allows a third. `EVST_STATUSES` / `AAST_STATUSES` /
`COMPLETION_DEFAULTS` are all unchanged and now feed the action's popup.

**An action is not a step, and that is the load-bearing distinction.** The
technician never visits a status update, so it takes **no rail entry, no
sequence number and no gate** — `seqNodes()` excludes it, `stepMapHtml()`
never renders it, and it carries no `required`/`reqComment`/`reqDoc` at all.
If it ever counted as a step, every rail position and every N/A calculation
would shift by one. Pinned by test.

**It is positional, so two places refuse it:** the More group (reachable at
any time, which is the opposite of positional) and Free Form (no positions to
place into — the conversion drops status actions along with forks). The More
guard sits in `moveToRef()`, at the mutation, **not** only in the drop
handler — the drag path had it first and a direct call walked straight past
it, which is the third time that exact shape of bug has appeared on this
screen.

**Switching entity re-bases the status.** An EVST code is not an AAST code,
so carrying the value over would leave a status that does not exist in the
selected domain. The authored status is **kept** across a flip to User
selected mode (§30.21), so flipping back loses nothing — nothing is re-based
there, because the entity has not changed.

**AMENDED 2026-09-17 — the action gained a mode.** A status update is now
either a system action or a technician prompt; see **§30.21**, which also
replaces the "End of Workflow when Closing isn't present" idea this section
was written before.

### Both dropdowns are description-only, and so is WO Type

§5.2 already locks *"System codes (Status, Type, Priority): always
description-only"* — this applies it to the authoring surface, where it had
been showing `BK — Breakdown` and `CLOSE — Closed`. A code is an identifier
and these are pickers. **The function code is NOT dropped** (`WSJOBS`,
`ZJ1000`): that *is* an identifier an admin types and looks up, which is
exactly the distinction §5.2's rule draws.

## 30.12 Designer pass two — library, activity, and three fixed bugs

### The library is Available screens, then Actions

The Execution / Record-tabs headings are gone. They were a browsing aid that
read as a rule, and §14.8 explicitly denies it — step-vs-More placement is
configuration, not a property of the screen. Grouping screens by where they
"usually" go was the same mistake one level up. **User Defined Screens sit in
the same list**, marked by their icon rather than a heading of their own.
Actions is the second section: Question fork and Status update, both absent
while Free Form is on because both are positional.

### The Activity container renders for real

It is a **grid of its actual fields with its actual buttons**, and the
explanatory paragraph is gone — the rendering says what the paragraph did.
**Its buttons are fields**: `type:'button'` entries that participate in the
field-behavior system, so an admin hides *Delete Activity* for a group the
same way they hide a field. A button takes **Optional or Hidden only** —
Required and Protected are meaningless for something that is not a value, and
N/A has no rendering for a control — and that is guarded in
`setFieldBehavior()` rather than merely omitted from the menu.

**DESIGN DECISION: the Activity container can be HIDDEN but never DELETED
(§15.2).** It is not an ordinary field container — it is a single-select
record list with its own add/edit affordances and a per-row completion state,
and the screen's code depends on it existing. Removing it is not a layout
choice, it is a broken screen; hiding it is the supported way to take it away
from a group. Its menu therefore shows no Remove at all rather than one that
refuses. It **does** accept dropped fields, because its fields are genuinely
authorable — the earlier refusal was wrong once it rendered as a real grid.

### The field set is the real screen's

`LAYOUTS.recordview` and `FIELD_CANDIDATES.recordview` were rebuilt from the
actual WO Record View (screenshot supplied): the unlabelled Header Fields
block, Work Order Details, Activity, Scheduling, and the two collapsed
sections, with the remaining real fields — Organization, Created By, Priority
Response, Supervisor, Req. Start/End Date and the rest — in the sidebar. A
designer whose field list is invented cannot answer *"is this real screen
authorable here"*, which is the only question worth asking of it.

### Three bugs, and what each one actually was

1. **Container drag/drop "not behaving properly."** `contDragOver()` set a
   drop marker and called `renderDsn()`, which replaced the panel's
   `innerHTML` — **including the element being dragged.** HTML5 drag-and-drop
   does not survive its source node being destroyed, so the gesture died the
   moment the indicator moved. The field drag never had this problem for one
   reason: it only toggles classes. The container drag now does the same, and
   nothing re-renders until the drop commits. **The general rule: never
   re-render a drag's own container during `dragover`.**
2. **Clicking away from a container menu did not close it.** The menu was
   bound to `onclick` *and* `oncontextmenu`, so the click that should have
   dismissed it landed on the container and immediately reopened it —
   indistinguishable from "it will not close". Right-click only now. Found
   alongside it: the global mousedown closer's keep-list selector had been
   **silently broken since the Octave rename** — `.node-ell,.wfc-ell` became
   `.IconButton IconButton--sm IconButton--muted`, a descendant selector
   inside a comma list, which matches nothing.
3. **Could not drag a field into a newly created container.** Two causes. The
   drop target was a single ~30px placeholder row, which is a small thing to
   hit at the end of a drag — now a 64px dashed dropzone. And the container's
   **header** did not accept a field drop at all, which is the edge the
   pointer crosses on the way in, so a drop that landed there did nothing.
   The header now forwards a field drop to its own container.

### Also in this pass

Screen Designer moved to the **top** of the node right-click menu — it is why
that menu gets opened most of the time. The field-state legend was dropped
(direct instruction), leaving the colour bars to speak for themselves.

## 30.13 One paradigm for every configuration artifact (locked)

Four questions were put up with trade-offs and answered 2026-09-16, *before*
any of it was built, because the instruction was explicitly *"run options by me
with trade-offs."* Each heading below is the chosen option; the rejected ones
are recorded because every one of them was defensible and the reasons are the
useful part.

### Decision 1 — assignment happens in BOTH directions, over ONE table

**Chosen.** A gallery assigns from the artifact side (one artifact → many
groups); a **User Groups area** answers *"what does group X get?"* (one group
→ many artifacts).

**Why:** §26.5.1 had already found that both grains are real. Authoring is
naturally a fan-out — that is what Save-to-Group(s) always was — and
answering the group-side question is naturally its inverse. Neither grain is a
workaround for the other.

| Rejected | Why not |
| --- | --- |
| **From the artifact side only** (what the portal shipped with on 2026-09-16 morning) | Simplest, already built, no divergence possible. But answering *"what does this group get"* means opening all four galleries and scanning — **precisely the question §26.5 says nothing in the product answers today.** |
| **From the group side only** | Exactly one place to assign. But assigning one profile to 30 groups becomes 30 visits, discarding the fan-out grain §26.5.1 identified as the natural one for authoring. |

**The condition attached to choosing it — and the thing that breaks if it is
ignored — is ONE STORE, TWO VIEWS.** Membership used to be `w.assignments` on
the workflow, which was fine while workflows were the only assignable thing.
With four artifact types that shape becomes four arrays free to disagree with
each other *and* with the group view. It is now a single flat table —
`{type, artifactId, group}` — and **every read goes through an accessor**
(`groupsOf`, `artifactsForGroup`, `isAssigned`); nothing else touches it. The
load-bearing test asserts the gallery side and the group side return the same
rows. If that ever fails, the model is broken and everything else in the area
is decoration.

Two consequences that follow rather than being decided separately: deleting an
artifact **drops its membership rows** (a row pointing at a deleted artifact is
a group silently provisioned with nothing), and a **copy carries no
membership** — under one-per-group cardinality an inheriting copy would
collide with its own source on every group at once.

### Decision 2 — cardinality follows what the RUNTIME resolves on

Not a per-area style choice. §11 resolves a workflow from *(WO Type, user
group)*, so a group may hold **one per WO Type** plus one Free Form. Everything
else resolves on the **group alone**, so a group holds **exactly one**. That is
why one rule covers four areas, and why the rule text a user reads is *derived*
from the artifact type's declared cardinality rather than written out per area.
A clash is predicted **before** the click, in the assignment control, not
reported after it.

**The control's SHAPE is derived from it too** — checkboxes where a group may
hold several, radios where it holds exactly one. See **§30.23**; that is the
same derivation as the rule text, one level down.

### Decision 3 — Create follows SIZE

**Chosen.** An artifact fully definable in one form gets a **modal** (offline
profile, Home tile); one that is an *arrangement* gets a **blank canvas**
(workflow, Home layout). Both paths end in the same gallery, so the artifact
model is identical either way.

**Rejected:** always-a-canvas (a Home tile is four fields — a full-screen
editor is a lot of surface for that) and always-an-identity-modal-first (adds a
step to the two artifacts that need a canvas anyway).

**One consequence worth naming:** the rail's primary row is a *single verb*
whose label follows the area — "Create workflow" / "Create profile" /
"Create layout". A Create that always made a workflow would be a trap in three
of the four areas, and in the User Groups area it **refuses**, because a user
group is created in Security ▸ User Groups and never here.

### Decision 4 — Home tiles are global, and reused BY REFERENCE

**Chosen.** A tile is created once into a catalogue and pulled into any layout
as an **id, never an embedded copy**. **Only the layout is assignable** — a
tile is a component, not a provisioned thing. That is the difference from a
workflow, whose steps come from a *delivered* catalogue rather than being
user-created.

**REVISED the same day to THREE levels** — layout ▸ **section** ▸ placement
(§30.16, user direction). A layout is labelled sections of tile references,
not one flat list. The by-reference decision here is what forced the section
to live on the **layout** rather than on the tile: a section column on the
tile record would pin one tile to one section everywhere it appeared, which
is precisely the reuse this decision exists to allow.

**The cost, accepted deliberately:** editing a tile reaches every layout using
it. So the catalogue shows **usage per tile**, the edit modal states the blast
radius before you type (*"used by 3 layouts — this edit reaches all of
them"*), and deleting a tile **prunes the references** rather than leaving them
dangling, because a reference to a deleted tile is a hole in a layout with no
visible cause.

**Rejected:** tiles local to each layout (no blast radius, but the same tile
gets re-defined everywhere and the copies drift) and a catalogue plus
per-layout overrides (most expressive, most to build, and *"why does this tile
look different here"* becomes a real support question).

### ⚠ This locks the MECHANICS. Home's CONTENT is still unlocked.

Home's own content — which dataspies, which tiles, which counts — is an
open design riff and stays one. The demo tile set in the prototype is a demo.
Nothing in this section decides what tiles a technician's Home screen has.

## 30.14 The offline profile, against the shipping product's model (locked)

Built 2026-09-16 from the live product's **User Group ▸ Mobile Settings** tab:
roughly 35 `Download X` booleans edited directly on the group, with ad-hoc
qualifiers beside some of them. Four **structural** differences, each of them a
rule already locked elsewhere rather than a preference expressed now:

1. **It is a profile, not a set of per-group fields** (§2.10) — a named
   bundle assigned to groups. The shipping shape means 40 groups are 40
   hand-maintained copies, and §29.6 already ruled the inverse fault: editing
   shared config from one group's side re-provisions every other member.
2. **A checkbox cannot express §2.7.** Four policy classes, not a boolean.
   "Download Employees ✓" resolves to *Employees = `offline-read`, read-only,
   bounded by a dataspy* — which is a sentence the checkbox cannot say. Since
   four classes are only an improvement if an admin knows what they mean, **each
   policy carries its own definition at the point of choice** (2026-09-16),
   keyed on the axis that actually distinguishes them: **who decided this is
   on the device** — nobody, the admin, the technician, the work itself, or
   another system. Read/write is the *consequence*, not the definition. Two
   things the surface says out loud because they catch people out:
   **`work-set` is the only class a technician can write to** (the same rule
   §2.9 states from the other side), and **only the two filtered classes take
   a dataspy** — `server-only` ships nothing, `external-replica` brings its own
   download unit, and a **traversed** entity takes no filter even inside the
   work set because it arrives attached to its parent. And an `offline-read`
   entity is exempt whenever its **whole domain fits the caps** — the one
   exemption that is *computed* rather than declared (§2.7's cap rule), and the
   reason the control offers "All records — it fits" rather than demanding a
   filter.
   **Reworked 2026-09-18 (user direction).** The definitions stayed and the
   *labels* changed, which separated the two axes that had been sharing one
   name: a label now states the **capability** (§2.7's label table) and the
   line beneath it states **who decided**. So read/write is no longer only the
   consequence — for three of the four it is the name. Both sentences this item
   says the surface states out loud are unchanged in force and reworded in
   fact: **"only Offline read/write accepts writes to EAM"** (external is
   writable too, but through another engine's queue) and **"only the two
   filtered classes take a dataspy."** A third was added, because it is the one
   that answers the confusion that prompted the rework: **the label says what
   the app can do; the line under it says who put the data there.**
   **Then five became four the same day**, once naming the two `Offline read`
   classes as siblings made it plain they were one class split on provenance
   (§2.7's merge note). The surface gained two things from it: one predicate —
   `rowNeedsDataspy()` — is now called by both the control that renders the
   requirement and the validator that reports it, where previously two
   expressions agreed by luck; and the requirement itself became **measured**
   (§2.7's cap rule), so a row that fits offers **"All records — it fits"** with
   the number it was measured against, rather than a protected chip asserting
   that its domain is small.
3. **Caps are mandatory and enforced at authoring time** (§2.7) — device
   ceiling, per-entity row cap, **local store volume budget**, traversal depth,
   to-many count. The shipping screen has none. Defaults are the market figures
   §2.7 already cites plus the design doc's SLO-8
   (200,000 / 50,000 / **500 MB** / 15 / 1), so the numbers are traceable rather
   than invented here. **Two of them are now computed against, not merely
   displayed** (2026-09-18): the card shows what the profile actually spends
   against the device ceiling and the volume budget, and an over-budget total is
   reported **on the cap it breaches** — §30.20's rule, not a banner. A cap
   nothing is measured against is not a cap, the same way a budget you cannot
   see is not a budget. **They render PROTECTED** (2026-09-16, user direction),
   and the reason is worth stating: they are **platform** limits, not
   preferences of this profile. Raising the device ceiling here would not
   raise what a device can hold — it would only move where the failure
   shows up, from authoring time to the technician's morning. Changing one
   is a spec change. They are still **shown**, because §2.7's whole point is
   that the author can see the budget being spent, and a budget you cannot
   see is not a budget.
4. **"All records" is refused** (§2.7). Most `For Dataspy` fields on that
   screen sit empty, which is exactly the state §2.7 rejected — so a
   filtered policy with no dataspy is a reported **error**, not a default.

### Which entities we have actually decided — and which we have not

The registry is 31 entities, read off that screen. Mapping them to §2.7
sorted them into four groups, and the fourth is the point of the table:

| Verdict | Count | Entities |
| --- | --- | --- |
| **Decided in** | 15 | Work Orders (`work-set`, carrying §2.6's dataspy **and** pins); Checklist Results, WO Parts Lines, WO Labor Lines (`work-set`, reached by **traversal** from the WO rather than filtered in their own right); Employees, Crews, Trades, Stores, Bins, Cost Codes, Suppliers, Standard WOs, Task Plans (`offline-read`, whole domain — each measurably fits the caps, so a dataspy is optional); Equipment, Parts (`offline-read`, and each **needs** a dataspy: Parts breaches the row cap, Equipment the volume budget) |
| **Decided OUT — `server-only`** | 4 | Equipment / WO History, Meter Readings, Cost, Purchase Orders. §2.7 names all four by name. |
| **Phase 2** | 1 | Linear Asset Information → `external-replica` (§28) |
| **NOT DECIDED** | 11 | Inspection Results, WO Nonconformity, Permit to Work, Calibrations, Equipment Structure, Equipment Comments, Equipment Custom Fields, Mobile Notebook, Main Isolation Tables, Physical Inventory, Asset Inventory |

**The undecided eleven left the grid 2026-09-18** (user direction). They had
been marked in place — every row carrying a status pill, with a warning on
enabling one — which put a backlog item and a configured policy on the same
row, at the same weight, behind the same dropdown. A surface that offers a
control implies the question is the author's to settle, and this one is settled
in §2.7, not on a profile. So they render as **a list at the bottom of the
screen**: named, counted, annotated, and not configurable. Deciding one means
amending §2.7 — at which point it moves up into the grid.

**Listed, not dropped**, which is the failure mode the change invites. An
entity quietly removed keeps whatever policy it was seeded with and says
nothing about it — precisely the commitment nobody made. So the list renders
all eleven, and §30.20's validator still fires for any that actually ship —
on its own row, rather than a roll-up saying it. Which of them ship is a
property of the profile, not of the registry: the demo's **Field technician**
seeds two (Inspection Results as `work-set`, Equipment Custom Fields as
`offline-read`), **Contractor lite** one, and **Online only** none.

The per-row **status pill went with them** — on a decided row it restated the
policy control beside it and competed with the
`traversed` chip, the one chip on that row an author needs. Both halves are
pinned by `test-workflow-portal.js`, including a negative control that the
grid filter cannot be dropped silently.

Two of the eleven still deserve deliberate calls rather than drift: **Main
Isolation Tables** (safety-critical whichever way it goes) and **Inspection
Results**, which is `work-set`-shaped and probably belongs with the other
three traversed children.

### The decided-out four are a NARROWING, and that needs confirming

§2.7 puts Equipment/WO history and meter readings in `server-only`. **The
shipping product downloads both.** So this is not an oversight in the mapping,
it is a deliberate reduction of offline capability relative to what customers
have today, and it is the kind of thing that is discovered during a migration
rather than during design. Either §2.7 stands and the narrowing is
communicated, or §2.7 gets a carve-out. **Open in §20, not settled here.**

### One conflation on that screen we must not inherit

`Download Work Orders / For Dataspy` merges two different questions into one
field. §2.6's punch-list dataspy answers **which work orders are mine** —
true online as well, and role-specific. §2.10's profile answers **what gets
replicated for offline execution** — a bounded scope, and shared across every
group holding the profile. They may name the same dataspy in practice, but
collapsing them means a punch list cannot exist without replication, which is
wrong for an online-only group.

**§2.6 already placed the punch-list selector on the user group, not the
profile**, on the grounds that download scope is role-specific while a profile
is one artifact shared by N groups. That reasoning is intact and this section
does not disturb it: the profile's per-entity dataspy is a **replication
bound** (N groups legitimately replicating the same Employees rows), and the
punch-list dataspy is a **membership** question (N groups legitimately *not*
sharing a work list). Two selectors, two homes, by design — and the
punch-list one still has nowhere to live, since the portal's User Groups area
is a binding surface. §20.

### Two layers render first, read-only, on every profile including "None"

Tier 0 configuration and the outbox (§2.10, §29.6) — shown even on the
online-only profile, because the commonest misreading of an offline profile is
that it is what makes the app work offline *at all*. And **"None" is valid**:
an online-only group is a deliberate provisioning choice, so it reads as
informational and never as a fault.

### §2.8's lookup classes are in the bundle but not tunable here

The three classes are shown read-only, because they are a property of the
**lookup**, not of this group. That includes row 2's obligation to *announce
the scope* — *"showing the 12 assets on this work order"* — which remains the
single highest-risk failure mode of the whole approach, since a short list
looks exactly like correct data.

### Dataspies themselves are authored outside this portal

They are created on the **record list screen**, which is where EAM dataspies
have always been made. The portal **selects** one and never edits one — the
same boundary §27.4 role 1 draws around UDS definitions. That boundary is why
both the profile registry and the Home tile editor offer a *picker* and no
authoring affordance at all.


## 30.16 Home layout, reconciled against the shipping requirement (locked)

Reworked 2026-09-16, the same day §30.13 first built it, after reading
**`docs/existing_use_cases/EAM.DUX.REQ.DigitalWorkHome.docx`** — the
product's own Digital Work Home requirement, whose setup screen is
**Digital Work Home Setup** with a companion **Digital Work Home for User
Groups** tab.

**That closes a §9.4 open item by finding it rather than deciding it.** §9.4
had carried, since 2026-07-28, the note that "real EAM has a base admin
screen (referred to informally as the 'Home Icon' or 'digital work home'
setup screen; **not yet located/named precisely**)". It was in the repo the
whole time. The lesson is cheap and worth keeping: **check
`existing_use_cases/` before designing an admin surface** — three of the
rules below could not have been guessed, and one of them is a silent
failure.

### What the product models, and where we diverged

A tile is a **Digital Work Home record**: `Screen` + `dataspy and/or
filter` + an **Insert Mode checkbox** + a **SQL Statement** for the count +
icon + **sequence** + description, assigned per user group.

| The requirement | What we had | Resolution |
| --- | --- | --- |
| **Insert Mode is a CHECKBOX on a tile**, drawn as a `+` badge | `create` was one of four tile *kinds* | **Flag, not a kind.** A customer's existing records migrate with no transform. |
| **The count comes from a SQL Statement, separate from the dataspy** | count was derived *from* the dataspy | **Two fields.** The dataspy is where the tile GOES; the statement is what the badge SAYS. The old shape could not express "a shortcut that also shows a count", or a dataspy with no counter. |
| `>= 1000` shows **`999+`**; a statement returning **0 shows NO BADGE** | no rules at all | Both implemented and pinned. A zero badge reads as *"nothing to do"*; no badge reads as *"no counter here"* — the product picked the second, and it is right. |
| Counts refresh from a **header Refresh button** | assumed live | Recorded. It also answers a worry worth not having: a section of twenty counted tiles is not twenty live queries on the app's most latency-sensitive screen. |
| **No records for the group → the STANDARD MENU opens** | warned *"a group assigned this gets a blank Home screen"* | **The warning was wrong and is now an info** naming the fallback. Same shape as §11's flat-rail fallback. Reporting a fallback as a fault teaches an admin to ignore the banner. |
| **Favorites is a tile** appended after the records | our device has a Favorites *row* of 56px chips, built from the technician's own starred dataspies | Divergence kept, and it forces a rule — see below. |
| Flat sequence; **no section concept** | our device already has labelled section rows | Divergence kept deliberately — see below. |

### Sections belong to the LAYOUT (locked, user direction)

> *"It's just home screen code, available sections with titles, and then
> subsequent tile locations and sequence."*

Three levels, entirely inside the Home domain:

```
layout   (home screen code)
  └ section       (title + sequence)
      └ placement (tile id + sequence)
```

**The section is NOT a property of the tile, and that is the load-bearing
part.** A section column on the tile record would pin one tile to one
section *everywhere it appears*, which contradicts §30.13's by-reference
decision — the whole point of a shared tile is that "My Open Work" can sit
under *Today* in one layout and *Work* in another. A middle option was
offered (a fixed section enum on the tile, smaller schema delta) and
**rejected for exactly that reason**.

Scope of the ask, stated because it was initially overstated as comparable
to `PLO_WOTYPE`: **it is not.** It touches no WO Type resolution and no tile
definition — a home-screen table, its sections, and their placements. Self-
contained.

### The editor WRAPS where the device SCROLLS

The device section is a horizontally-scrolling row (`.home-tilegrid`:
`display:flex; overflow-x:auto`), chosen there on its own merits — the CSS
comment says *"there's no cap on how many tiles a user can add to a
section, and a scroll row absorbs that growth without the page getting
taller, the way an ever-wrapping grid would."*

The editor cannot reproduce that, **for a functional reason and not an
ergonomic one: HTML5 drag-and-drop does not auto-scroll a container**, so
any tile past the fold would be *undroppable*. Same family as the rule
already learned the hard way — never re-render a drag's own container
during `dragover` (§30.12).

So the editor wraps at three, and **three is arithmetic, not taste**:

```
390px device − 14px padding × 2        = 362px usable
100px tile + 10px gap                  = 110px each after the first
100 → 210 → 320 → (430 > 362)          = 3 fit, the 4th shows 42px
```

**Line one of the editor grid is therefore exactly what the technician sees
without swiping**, and `HOME_FOLD = 3` is pinned to that. Wrapping destroys
exactly one fact — where the fold is — so the editor draws it as a rule
across the grid. A section of **four** is the case worth looking at twice:
the device shows three tiles and a 42px sliver of the fourth, and that
sliver is its only scroll cue.

### Creates and screen links are separated BOTH ways (locked, user direction)

> *"One tile with insert mode flag means it can't be drug onto layout, but
> only to the create icon. And vice versa for non-flagged tiles."*

The library splits into **Available screens** and **Creates**, and the drop
rule is refused in both directions. The rule is not invented here — §9.4.1
already justified it when it removed Home's blind default: Home's colourful
tiles *"mean 'go look at a list,' not 'start a new record'"*. So a create
tile in a section contradicts a locked decision, and the refusal says so.

**Guarded in TWO places on purpose**, and the distinction matters because a
test can confuse them: the drop handler refuses the gesture, and
`normalizeHome()` prunes a violation on read, so stored data cannot carry
one either. The drop handlers **return a boolean** specifically so the two
layers can be told apart — see §30.17.

**Where the authored creates land: the chooser's contents, not the bar.**
The pinned bar stays one Create pill opening §9.4.1's sheet; what the admin
authors is the sheet's rows. That preserves §9.4.1 exactly (defaulting
blindly was the original defect), scales past the bar's width budget, and
**answers §9.4's other open item** — *"which entities populate the
Screen/entity pill's option list"* is now *"whatever the admin pinned"*.

### Favorites is the TECHNICIAN's row

On our device `FAVORITES` is built from `loadWoFavorites()` /
`loadEquipFavorites()` — the technician's own starred dataspies. So the
layout carries `showFavorites` and **no favorite content at all**: the admin
positions and toggles the row, never fills it. It renders in the editor as
ghost circles with that stated, because drawing authorable tiles there
would be a preview of something else, which is §30.3's argument against a
scaled emulator one step worse.

### KPI is gone

It was one of four tile kinds and **had no renderer on the device** — its
own note admitted it was a count with "different emphasis". Authoring a
component the runtime cannot draw is the failure mode this surface exists
to prevent.

## 30.17 The silent-hide gate, and a false positive of the §29.7 shape

The highest-value rule in the whole requirement, and the reason this area
belongs in this portal rather than anywhere else:

> *"The system will check to see if the screen exists in the menu. **If the
> screen does not exist in the menu, that Digital Work Home record will not
> be displayed.**"*

A tile pointing at a screen the group's menu does not carry is **silently
dropped** — no error, no placeholder, no trace. An admin configures a tile,
assigns the layout, and for that group it simply is not there. Same failure
shape as §27.4's Required-UDS-step-without-permission, and computable
**only where the layout and its assignments are both known**.

**Reported, never auto-fixed** (§26.5.1): removing the tile would be wrong
for the groups that *can* see the screen. The gate is live on load — one
demo layout is assigned to a group whose menu lacks the Equipment screen,
the same technique that keeps the ZJ1000 capability path live.

### The false positive, and why it is worth recording

The first implementation keyed the check on the tile's **target** — and
reported *every create tile as hidden for every group*, because `createwo`
is not a menu entry. **A create target is not a screen; it is an insert
mode OF a screen**, so it resolves to the same menu entry as the list it
inserts into.

This is §29.7 again, in a different area: that one compared a function's
tabs against a fixed list and reported a gap on every ZJ1000 configuration.
**Both had the same tell — a gap reported for a case that obviously has the
capability — and both were found by reading the gap list rather than the
pass/fail.** A green suite with a wrong gate is worse than a red one,
because the next person believes it. An unknown target now falls back to
itself, so a target added later is *caught* rather than silently exempted.

### Two testing lessons from the same session

Recorded because both produced a passing assertion that proved nothing:

1. **A two-layer guard needs an observable difference per layer.** Removing
   the insertMode guard from the drop handler changed nothing a test could
   see, because `render()` → `normalizeHome()` pruned the tile straight back
   out. The assertion was proving the second layer while reading as the
   first. Fixed by giving the drop handlers a **return value**.
2. **An assertion must isolate the rule it names.** The same test then still
   passed with the guard removed, because it reused a seeded create tile
   that was *already on the layout* — so the duplicate guard answered first.
   It now mints its own tile.

Both were found by negative control, not by review. Ten injected bugs, ten
caught, after those two fixes.


## 30.19 Condition fork — a fork the system answers (locked)

Added 2026-09-16 on direct instruction. §29.4's question fork asks the
technician and routes on the answer; this reads a **field** and routes on
its value. It is a second fork **kind**, not a parallel mechanism —
`isForkKind()` and `forkBranches()` exist so that every §29.4 rule
(forward-only, re-validated on reorder, dangling targets cleared, skipped
steps marked N/A and left visible, wires drawn to real destinations) holds
for both without a second implementation to keep in step.

*Two later amendments live in §30.22, both of them this section's own rule
applied to a site that had been missed: the ⋯ menu tested `kind === 'fork'`
and so offered a condition fork the whole step menu, and the field picker now
groups its options under the container they sit in.*

### ⚠ This is a deliberate, narrow entry into §13.2's Tier 2

**Flagged before building, because CLAUDE.md says not to do it:** *"§29's
question fork did not reopen [conditional field rules] — don't cite it as
precedent."* The request cited it by name. So the conflict is recorded
rather than glossed:

- **§13.1–§13.4 stay parked.** No field-state effects, no
  `resolveFieldState()` seam, no tier picked for field rules. The *only*
  effect here is **routing**, which §29.4 already implements and which
  §13.2 Tier 2 already contemplated ("plus tab `Visible`… so 'pop off
  another tab' needs no new concept").
- **§13.3 item 4 is the binding constraint**: *"Flipping a step to hidden
  is a data problem… step-level rules should ADD rather than retract."*
  This retracts nothing — a skipped step is **N/A and stays in the rail**,
  exactly as §29.4 requires, so the objection is satisfied by inheriting
  §29.4's answer rather than arguing with it.
- **§13.4's verification debt is PAID** — see the base-schema finding below.

### The evaluation moment is the whole design

User direction: *"the form is dirty until the user navs to another screen…
the user enters required fields/changes optional/etc; and hits 'Next'. At
that point, online or offline, app sees the next step is a condition fork,
checks the field and its value **ONLY OF THE USER'S CURRENT FORM/SCREEN
they are on**, and moves to the appropriate next step."*

Three problems dissolve at once, and it is worth naming them because the
obvious alternatives do not solve any of them:

| Problem | Why "on Next, current screen only" answers it |
| --- | --- |
| **Mutable input.** A question fork's answer is one deliberate act; a field is edited continuously. | It evaluates at **one moment**, so the value is pinned exactly like an answer. A live rule would mark a step N/A *while someone typed* — possibly a step already holding booked labour (§13.3 item 4). |
| **Invisible logic.** A skipped step with no visible cause. | The field is **on the screen they just left**, so it is present, current and *visible to the person being routed*. |
| **Offline divergence.** §2.7 makes anything server-evaluated `blocked-visible` offline. | Same-record, same-screen, no lookup — **client-evaluable by construction**. And routing is a harder case than field state: a field that silently fails to become required offline is a bad form, but a **route** that resolves differently offline means two technicians on one WO do different work. |

**Rejected:** evaluating live on every field change (flicker, and retraction
of steps holding data), and evaluating on arrival at the fork (the value can
change afterwards, so the route goes stale with nothing flagging it).

### What it deliberately cannot read

Only **job-captured** fields — values the technician enters during
execution. Not WO Type, user group, function, or equipment system type,
because **§11 already resolves the whole workflow on (WO Type, user
group)** and §13.5 protects WO Type from Start Work onward. A condition on
any of them re-implements workflow resolution one level down *and can never
change*. This was the sharpest objection raised against the feature and the
answer narrowed it rather than dismissing it.

Two further exclusions, each a rule rather than an omission:

- **A Hidden field is never offered.** Routing on something the technician
  cannot see is the invisible-logic failure this design exists to avoid
  (§2.9 — narrowing may happen, silent narrowing may not).
- **A button is never offered.** A control has no value to test, the same
  reason §30.12 gives it only Optional or Hidden.

### EMPTY IS NOT FALSE — the third outcome

The request was for a *"boolean type scenario"*, and that is the trap.
Forward gating means a later field is empty **by construction**, and an
Optional field can be left blank. Sending every unknown down the false path
would be wrong *and* invisible.

So `condEval()` returns **true, false, or null**, and null means the
workflow **continues in sequence** — the same meaning §29.4 gives a null
target. The editor states it rather than leaving it to be discovered. A
checkbox is the one type that is never unknown: unticked *is* false.

### Operators come from the field's own type

Rendered from the field's declared `type`, so "is greater than" is never
offered on a checkbox and "contains" is never offered on a number.
Changing the field **clears the operator and the value**, because an
operator only means something against a type — the same reason switching a
status entity re-bases the status (§30.11).

**No relative dates** (today, today + 7, start of shift). They carry their
own evaluation-time semantics and are their own feature; a literal date is
the plainest thing that works. Open in §20 rather than half-built.

### A third failure mode §29.4 never had

§29.4 enforces forward-only routing **twice** — on pick and after every
reorder. A condition fork adds a symmetrical problem on the **input** side:
its field belongs to whatever step now *precedes* it. Reorder the flow and
a different step is in front; delete that step and there is no form at all.
Either way the reference silently stops resolving and the fork evaluates to
"cannot tell" forever, routing nothing, with nothing on screen saying so.

So `validateForks()` also clears a **stale field reference** and counts it,
and the node reports it **on itself**. "Enforced twice" now covers the
input as well as the output.

### It is an ACTION that routes — the first of its kind

By §30.11's rule (*"an action is not a step — no rail entry, no number, no
gate"*) a condition fork is an **action**: the technician never visits it.
But it **routes**, which no action did before. So it is `isForkKind()` and
**not** `isStepKind()` — both at once — and it is positional, which means
the More group and Free Form refuse it exactly as they refuse the other
two.

### §13.4's verification, now paid — and there is no base paradigm

§13.4 owed a check of the customer's real export before any table design.
Done 2026-09-16 against `docs/Data_refs/Page Layouts perms/`:

| Table | Condition-shaped columns |
| --- | --- |
| `r5pagelayout` (19 cols) | **none.** No trigger, no operator, no value. (Also no `PLO_WOTYPE`, re-confirming §11.) It *does* carry `PLO_DEFAULTVALUE` — base does default values, not conditions. |
| `r5functiontabs` | **`FTB_SQLEXIST`** — a tab-level SQL existence check. **Empty in all 242 rows.** |
| `r5functions` | `FUN_FIELDFILTER*` — plain `+`/`-` switches on 4 rows, not expressions |
| `r5permissions` | the only "rule" match is `PRM_OVERRULE`. Not a rules engine |

**So base EAM ships no conditional-field-rules feature here, and the
nearest thing is server-side SQL that nobody uses.** That matters twice
over: §13.2's Tier 2 was premised on aligning with a base paradigm, and
there is none to align with; and base's own instinct for "show this
conditionally" is exactly the server-side evaluation §2.7 makes
unavailable offline. A condition fork therefore **cannot** lean on base —
which is the strongest argument for keeping it as narrow as it is.

## 30.20 The summary panels are gone (locked)

Removed 2026-09-16 on direct instruction: *"remove all 'Action Summary'
type features from the portal. '3 things to look at', collisions, etc. We
handle these with raising errors usually and I think it will put off devs,
even though I would consider them in the future."*

**Removed:** the gallery assignment-collision banner, the "N to look at"
band in every editor, the offline profile's two issue bands, the group
detail's cross-area roll-up, the canvas capability banner, the per-card
"to fix" / "collision" chips, the rail's conflict count, and the Home
area's silently-hidden-tiles line.

**NOT removed — and this is the point:** every validator.
`allConflicts()`, `profileIssues()`, `homeIssues()`, `capabilityGaps()`,
`allHomeGaps()` and `wouldClash()` are all still there and still called —
by the controls that can actually violate them:

| Rule | Where it surfaces now |
| --- | --- |
| §30.2 assignment cardinality | **Refused in the assignment popover before the click**, naming the artifact it would collide with |
| §2.7 "all records is refused" | `is-error` on the offending entity's own dataspy select |
| §26.5.1 capability gap | A tag **on the node** — *"ZJ1000 has no such tab"* — plus the library entry disabled with the reason |
| §30.17 silently-hidden tile | The tile outlines red, with the group named in its own menu |
| §30.16 untitled / empty section | On the section header and in its own row |

**Prevented at the click beats counted on the page**, and the finding
belongs on the control that can fix it — a card cannot fix anything. Two
functions are kept as explicit no-ops (`capabilityBannerHtml`,
`profileIssueBanner`) so the call sites read as a deliberate absence rather
than a forgotten insert, and `galleryShell` still *accepts* `conflicts` and
ignores it.

**Deliberately reversible.** The user was explicit that they would consider
these in the future, which is exactly why the validators stayed: bringing a
panel back is a render change, not a re-derivation.

**One behaviour change worth noting rather than burying:** `groupIssues()`
no longer re-reports capability gaps or Home-layout gaps. Those belong to
the artifact and already show on the offending node or tile; aggregating
them on the group is what turned that function into a dashboard feed.

### The rail also lost its duplicate

**User Groups appeared twice** — once as this portal's binding area under
"Mobile configuration", once as a stub under "Security". They are now one
row, **under Security**, which is the right way round: a user group *is* a
security object, it is created there (§26.5.1 — this area only ever binds),
and "Mobile configuration" is left holding exactly the three things this
portal authors — Workflows, Home Layouts, Offline Profiles.

## 30.21 An action either asks or it doesn't — the System/User mode (locked)

Direct instruction, 2026-09-17. §30.11 made a status transition something you
**place**; this makes it something that can **ask**. Both of the flow's
actions now carry exactly one mode field, with the same two values and the
same segmented control, because the question is the same question:

| | `System action` (default) | `User selected` |
| --- | --- | --- |
| **Status update** | Sets the authored status unattended. No prompt. | A pull-up opens on the **Next** tap: current status **protected**, new one picked from a dropdown. |
| **Start Timer** | Starts the rail's labour timer (§14.2) silently. | A pull-up asks first. |
| **Stop Timer** | Stops the timer and **books the hours** unattended. | A pull-up shows the booking; **Hours** editable, the rest protected. |

**ONE FIELD, ONE ACCESSOR.** All three carry the same `mode` and every read
goes through `actionAsks()`. Start Timer shipped with its own boolean `ask`
for a few hours on 2026-09-17; two field shapes for one concept across three
kinds is §30.13's four-parallel-arrays failure at a smaller scale, so it
migrates in `normalizeWf()` rather than being read in two shapes forever.
Pinned by test, including the migration.

**This replaces the "End of Workflow when Closing isn't present" idea.** That
was a special case — a prompt bolted to the end of a workflow that happened to
lack a Closing step, triggered by an absence. A user-selected Status update
placed last **is** that prompt, and it is better in the way that matters: it
**composes**. It can sit anywhere in the flow, there can be more than one, and
nothing has to detect the absence of a step to decide whether to fire.

### What the technician's dropdown holds is NOT authored in the portal

Answered 2026-09-17, choosing the strictest of three options. The list is
resolved **on the device**, from base EAM's own **user-group status
authorisation** for the record's current status. The portal authors the
*entity* and nothing else, and the editor says so with a **protected** field
rather than by omission.

Rejected: an admin-picked subset of statuses on the action (the recommendation
at the time). It reads well and it is demonstrable, but it would be a **fifth
place a status list lives** — and the first one free to disagree with the other
four. It is the same boundary §27.4 draws around a UDS definition and §30.14
draws around a dataspy: **base owns what exists; this portal says where it is
asked for.**

### Cancel returns; it does not advance

The pull-up has a Cancel. Cancelling sets nothing and leaves the technician on
the step they were on, free to change something and tap Next again.

That is not politeness — it is what keeps an **empty authorisation set** a
"nothing to pick here" state instead of a **dead end the work order cannot be
finished through**. §27.4 already found that failure once, as a Required UDS
step for a group without the tab permission; a modal with no dismiss and an
empty list is the same dead end with a different cause. The alternative — no
dismiss, so the transition is guaranteed — buys a guarantee the portal cannot
honour, because it does not know what base will authorise.

### The timer's decline STILL ADVANCES, and the asymmetry is the decision

Declining a timer prompt leaves the timer stopped and **moves on**. Cancelling
a status prompt **holds**. The two are deliberately not symmetrical:

- A status update exists **to move a record to a status**. A decline leaves its
  whole reason unmet, so continuing would advance past an action that did
  nothing.
- The timer is an **aid to labour capture**. "I am not on the clock for this
  one" is a legitimate answer rather than an incomplete one, and **no record
  state depends on it**. Blocking a flow on a preference is a gate on nothing.

### Stop Timer — the action that BOOKS the time (locked)

*Refused earlier the same day, reversed on direct instruction. The refusal is
replaced here rather than kept as a decision log — the doc convention is that
a superseded decision is physically relocated, not stacked beside the thing
that supersedes it. It is listed once in §21 so nobody re-derives it.*

**The refusal stood on one premise, and the premise was wrong.** It ran:
stopping a timer produces a labour record; a labour record needs a screen;
that screen is Book Labor (§18); therefore a Stop placed anywhere else needs a
**second labour form invented behind it**.

What that missed is §30.11's own paradigm. **§18.4's entire Add Labor field
set is derivable** from a running timer plus the session:

| Field (§18.4) | Where it comes from |
| --- | --- |
| Employee | The signed-in technician |
| Trade / Department | That employee's own record |
| Activity | The activity in context on the WO |
| Date Worked | The date the timer started |
| Start Time / End Time | The timer's own start and stop |
| Hours Worked | The elapsed time |
| Type of Hours | **Normal** — see below |
| Crew | Empty; it is the either/or partner of Employee |

Nothing has to be **asked**, so nothing needs a form, so the action can simply
do it — which is exactly the move §30.11 made for a status transition. The
rule an action must satisfy is unchanged; Stop Timer satisfies it.

**The payoff, and the reason it exists:** Book Labor can sit in the **More**
group, or not be placed at all. Time capture stops depending on the technician
visiting a screen. That is the requirement this answers.

#### Type of Hours is deliberately NOT authorable

The one field that is not derivable is also the one that must not be a
workflow-level constant. Whether a given hour is overtime depends on **the
shift worked**, not on the workflow the technician happened to run — so a
constant would misbook every callout it did not anticipate. It books
**Normal**, and §18.3's correction path is how a misbooking is fixed, since
booked labour is immutable.

#### In `User selected` mode, Hours is the ONE editable field

Answered 2026-09-17. The pull-up shows the booking before it is written:
**Hours Worked editable**, every derived field **protected**.

- **Hours, because elapsed time is not worked time.** A technician who took a
  30-minute break inside a two-hour timer needs to book 1.5. §18.3 makes
  booked labour immutable, so getting the number right *before* writing beats
  filing a correction after.
- **Nothing else, because nothing else is a judgement.** Making the rest
  editable would rebuild §18.4's sheet inside an action — the original
  objection, and it would still be right. **There is one labour form in this
  app and this is not it.** Editing the rest is what Book Labor is for.

#### Three runtime rules, all stated in the editor

- **No timer running → nothing happens and the flow continues.** Nothing to
  book is not an error, the same way an empty field is not a false condition
  (§30.19's "empty is not false").
- **Discard never stops the timer.** One rule for both invocation points
  below, chosen over a cleverer intent-based pair: no path through this action
  can silently cost a technician their clock, and the rail pill stays the
  single truth about whether time is running. It does mean the action's name
  over-promises in that one branch, which is the cheaper of the two prices.
- **A Book Labor step alongside a Stop Timer is fine.** See §18.2 — the
  trigger is *"a timer is running"*, and one can only run once, so the second
  of the two finds nothing to do. Not refused, not warned about.

#### Two invocation points, one sheet

The same pull-up is reached two ways, and it must not be built twice:

1. **This action**, placed in the flow.
2. **Opening Book Labor while a timer runs** (§18.2) — the technician's own
   navigation, so it always asks.

That is also why the double-booking question dissolves rather than needing a
validator: both are guarded by the same single condition.

#### One consequence kept from the refusal

The rail's timer pill keeps its own stop control. A technician can always stop
a running timer by hand; the action adds a *placed*, booking stop, it does not
replace the manual one.

## 30.22 The 2026-09-17 authoring pass — five smaller calls

All five are the same kind of finding: a control that renders fine and says
the wrong thing about the rule behind it.

### 1. The condition fork's field picker is grouped by container

Every option used to read `Field name · Container`, which repeated the
container on every row and still left the list flat. The container is a
**grouping**, so it is drawn as one — an `<optgroup>` label, which is
natively unselectable. That is the "protected section label" for free, with no
JS holding it up, and the option text is then the **field description alone**
(§5.2's description-only rule, applied to a picker).

Grouped on the container **index**, not its title: two containers can
legitimately share a title, and merging them would claim a field lives
somewhere it does not.

### 2. A condition fork is a fork in its own ⋯ menu

`nodeMenu()` tested `kind === 'fork'`, so a **condition** fork fell through
to the *step* menu and was offered **Screen Designer, Rename, Step settings and
Move to More** — four controls on a node with no layout, no rail entry and no
gates. Every one was dead or actively wrong. It now goes through
`isForkKind()`, which is §30.19's own rule ("never a second copy") applied to
one more site. `renderDsn()` had the same bare test and now defers for every
layoutless kind, which covers both actions too.

### 3. WO Type moved under the Description, and wears its badge

The two banner slots swapped. The **function** is the widest of the four values
(a code, a description and a `(clone)` marker) so it takes the wide third
column; **WO Type** is one short description and reads better directly under the
Description it qualifies.

More importantly it now carries the **§23.3 colour and glyph** inside the
control. The one thing about a WO Type that is instantly recognisable was
absent from the control that *sets* it. Same four hexes, same four SVG glyphs,
same recipe as `woTypePill()` — not a second badge, and a Type outside the
four families still gets the **neutral slot, never a fifth hue**.

### 4. One close affordance for the designer panel

The canvas bar carried a "Close designer" pill while the panel already had an
**✕** in its own header. Two controls for one action, over two different
columns, and the one further from the panel was the more prominent of the two.
The **✕** won — it is where the thing being closed is — and the bar now says
where the close is instead of being a second one.

### 5. The UDS demo labels are numbered, not named

`Hot Work Permit` / `LOTO Verification` / `Shift Handover Notes` →
**`UDS Tab 1/2/3`**. Three plausible screen names in the demo data read as a
claim that the product ships those three screens. It does not: a UDS is
whatever the customer authored, and this surface only ever **places** one
(§27.4 role 1). Numbering them says the true thing.

## 30.23 The assignment control's shape follows cardinality (locked)

§30.13 locked that **cardinality follows what the runtime resolves on**. The
User Groups area was enforcing that rule with a control that contradicted it,
and doing it through the wrong writer.

**The second popover.** Assigning from the group side opened a popover, took a
click — and then opened a **second popover**. The click went to
`toggleAssign()`, which is the *gallery-side* artifact→groups control: a
different view of the same table, asking about every **other** group. It was
never meant to appear there. There is now **one writer from the group side**
(`groupAssignPick()`), and it never calls the gallery-side control. Pinned by
test, at the function, because the two controls still legitimately exist and
the wrong one is one identifier away.

**One-of-many is not a checkbox.** Three of the four artifact types are
**exactly one per group**. A tick box beside each of them invites a second tick
and then reports a **collision** for taking the invitation — the screen
creating the fault it exists to prevent. So the control shape is now *derived
from* `ARTIFACT_TYPES`, the same place the rule text comes from:

| Cardinality | Control | On pick |
| --- | --- | --- |
| `per-wotype` (workflows) | **Checkboxes**, and a Done button | Toggles; a clash is **refused at the click** (§30.2), popover stays open |
| `per-group` (offline, home) | **Radios**, no Done button | **Replaces** whatever was there, and **closes** |

A radio pick **replaces**, which is what makes it honest: a per-group collision
can no longer be created from this side at all, rather than being predicted and
then reported.

**The radio set includes None**, because a control should be able to express
every state it is enforcing. Without it "exactly one" would be settable but
never unsettable from the control that sets it. On a group that inherits from
`*`, None reads as *"fall back to the `*` default"* — which is what unset
means (§26.5 mechanic 2), not a fourth state.

**The "No insert here" footer is gone.** The area's own header paragraph already
says a group is created in **Security ▸ User Groups**, so this was the same
sentence twice — and the second copy sat exactly where a Create button would
be, drawing the eye to an absence. §26.5.1's rule is unchanged: there is still
no Create here, and still nothing to click for one.

## 30.18 What §30 does not settle

*(Kept LAST in §30 by convention — it is a rolling open-items list, so it
is renumbered rather than left mid-section whenever §30 grows. Was §30.5,
then §30.15, on 2026-09-16 — it had been sitting between
§30.6 and §30.7 purely from insertion order. Several items were closed the
same day and removed rather than marked.)*

- **Workflow revisioning is now unavoidable.** §20 already carried it as
  "more pressing, still unaddressed" after §29 made fork targets pointers.
  Making a workflow a **named, copyable, assignable artifact** is the third
  push in the same direction — and §30.13 has now done the same to three
  more artifact types, so a Draft/Current-Rev model would attach to four
  things rather than one. Still unaddressed, and still not decided here.
- **The `*` default group as an assignment target** is modelled nowhere. The
  User Groups area is built (§30.13) and §21's carry-over mechanics came with
  it, but a wildcard row is a different shape from a named group: it is an
  assignment that *always* clashes under one-per-group cardinality unless the
  resolver reads it as a fallback rather than a member.
- **What happens to in-flight work when an assignment is removed.** The
  membership table makes removal a one-click operation from either side, which
  raises the question more sharply than §26.5 did. §29.5's config-version
  stamp is the mechanism that would answer it; nothing joins them up.
- **`warning` and `info` have no §23 equivalent** (§30.8). Octave leans on
  both heavily and mobile has neither token. That is the prerequisite for any
  shared component library across the two systems — a §23 decision, not a
  token mapping — and nothing needs it yet.
- **Visual language — CLOSED ENTIRELY 2026-09-16.** The portal and its embedded
  designer panel are Octave, and Screen Designer has no standalone destination,
  so DM Sans / teal-purple is on nothing reachable. The one remaining file on
  the app's own Inter/JetBrains language, `eam-base-desktop-ui-prototype-v1`,
  went **out of scope** the same day (§21) — so there is no second visual
  language left on the base track at all, and no open question about one. **Two
  surfaces exist in this programme: the mobile app and this portal.**

# 31. Form Factors — Phone Portrait and Tablet Landscape

Added 2026-09-21. Before this section the spec had **no** coverage of orientation or form factor at all — the word "tablet" appeared exactly once in 9,790 lines, in a reference-screenshot filename. Every rule in §4–§24 was written against a single viewport and remains correct for it; this section adds a second form factor without disturbing the first, and nothing here supersedes anything.

## 31.1 Scope — the mobile app only (locked 2026-09-21, user direction)

Form-factor and landscape adaptation is **unique to the mobile app and the screens under it**. The Workflow Designer Portal (§30) is a **web** surface: a browser window is already arbitrarily sized and the portal already behaves like a desktop web app, so it needs no distinct modes at all.

This is the exact mirror of §30.7's **"OCTAVE SCOPE: base screens only."** That rule keeps the base design system out of the app; this one keeps the app's form-factor work out of the base portal. Neither crosses the seam, and together the pair is the whole of the two-surface boundary.

- **In:** the 16 standalone app screens (17 until the checklist A/B closed on 2026-09-21, §16.1).
- **Out:** `eam-workflow-portal-v1.html` and everything under `base screens`.

One exception, and it is a **rule** rather than a layout: §30.16's `HOME_FOLD` is authored in the portal and consumed by the app, so a form-factor change to the fold reaches into the portal's Home Layouts area. Tracked in §20.

## 31.2 Width classes, not devices (locked 2026-09-21)

**No rule in this section names a device, and none should.** An earlier draft of it defined the form factors as "phone portrait" and "tablet landscape" using viewport numbers taken from one handset and one tablet. That is exactly how a layout ends up correct on the author's device and wrong on a 320px Android, a foldable, or a large phone in landscape. The rules below key on **available width, with a height floor** — the only two things a stylesheet can actually observe — and name devices only as *illustrations* of a class, never as its definition.

Three classes, following Material's window size classes, because they are the industry-standard device-neutral vocabulary and they already map onto what CSS can measure:

| Class | Width | Band 1 nav | Panes | Illustrative only — NOT the definition |
| --- | --- | --- | --- | --- |
| **Compact** | `< 600px` | bottom bar, §4.2 as written | one | phones in portrait; small phones; most phones rotated |
| **Medium** | `600–839px` | **rail** | one | small tablets in portrait; foldables unfolded; large phones rotated |
| **Expanded** | `≥ 840px` **and** height `≥ 600px` | rail | **two — §31.3's bands** | tablets in landscape; large tablets in either orientation |

**Medium is a real class and must not be skipped.** It is where foldables and small tablets in portrait live: wide enough that a bottom bar wastes the width and a rail reads better, not wide enough for a second pane to be anything but cramped. Skipping it is how a foldable ends up with a phone layout stretched to 700px.

**The height floor on Expanded is what makes the model orientation-free.** A short, wide viewport — any phone rotated — fails it and keeps the Compact layout, which is correct: at roughly 350px of height against ~200px of fixed chrome there is no good two-band layout to reach for, and the centred `.app{max-width:430px}` column it falls back to is coherent rather than broken. A tablet in **portrait** fails the width test and also stays single-pane, which is equally correct — a tablet in portrait is a large phone. **So `orientation` is never queried anywhere in the app.** Orientation is a proxy for shape; width and height are the shape itself, and querying the proxy is what produces the tablet-in-portrait-gets-a-landscape-layout class of bug.

**Within a class, layout is fluid, never stepped.** A class decides the *arrangement* — how many panes, where band 1 sits — and never fixes a pixel width. Content measure is capped on **typographic** grounds (around 70 characters for a text column), not device grounds, and panes are `fr`-based, so a 1024px tablet and a 1600px one differ only in how much content is visible, not in layout.

**The floor is 320 CSS px.** Nothing may overflow horizontally at 320px, the practical smallest viewport still in use. The current prototypes already satisfy this and it is worth recording why, because it is load-bearing: the shared stylesheet contains no fixed width at or above 300px, and Home's tile rows are `overflow-x:auto` with `flex-shrink:0` on the tiles, so they degrade by scrolling rather than overflowing at any width. That is also why §30.16's `HOME_FOLD` is purely an *authoring* concern (§20) — the app itself never depends on a particular number of tiles fitting.

One measurement is worth keeping from the device-specific draft, because it is what makes Expanded a *width* problem rather than a height one. Across current phones and tablets, **a tablet in landscape has about the same usable height as a phone in portrait** — both land near 760–780 CSS px once browser chrome is subtracted — while having roughly three times the width. So no chrome has to move in order to save vertical space, and rail placement rather than the vertical chrome budget is the subject. Treat the pair of numbers as an order-of-magnitude fact about the current device population, not as a spec constant.

## 31.3 The band model (proposed 2026-09-21, not locked)

This needs no new model, because §4.2 already states one in its opening sentence: the nav bar is "persistent global chrome, distinct from the per-record tab rail (§7.1) and the WO workflow's step rail (§14.2), which both operate one level down, inside a single record."

| Band | Level | Owner |
| --- | --- | --- |
| 1 | app | §4.2 — Home / Work / Notifications, avatar, sync |
| 2 | record | §14.2 step rail, or §7.1 tab rail |
| 3 | content | §5.2 |

A Compact-class viewport can show **one level at a time**, which is why the rails collapse into tappable pills and why the bottom nav hides the moment a record opens. Those are compromises forced by Compact width, not preferences. An Expanded-class viewport can show **all three at once** as vertical bands — so the Expanded layout is an *expression* of the existing model rather than a new one, and that is the strongest argument for it.

**The band rule: at most three bands, and the list pane and the record rail never coexist.** Browse = band 1 + list + detail. Execute = band 1 + band 2 + band 3. Four bands is the failure mode, and it is what naive "just add a pane" produces. Two screens legitimately want to bend it — Activity Checklist, and the WO Equipment tab's `split` — tracked in §20.

**Browse vs execute.** A record list's detail pane holds the record and its header actions; **starting a workflow promotes to full width**, dropping the list pane so band 2 can become the step rail. A workflow step is a deliberately focused, one-thing-at-a-time surface (§14), so squeezing it beside a list both crowds it and produces the fourth band.

## 31.4 Rail placement — band 2, and the argument is §29 (proposed 2026-09-21, not locked)

Three placements were weighed at tablet width, for the step rail and the tab rail together since they share one shell (`.tab-rail, .step-rail`, confirmed byte-for-byte):

1. **Stay on top, horizontal, permanently expanded.** Preserves the portrait mental model, keeps the unified shell — it merely stops collapsing — and left-to-right reads as forward, which suits §14.10's gating.
2. **Left vertical band.** Always visible; the collapsed/expanded state disappears entirely.
3. **Right vertical band**, sharing a column with the action pills so both sit under the right thumb.

**Recommendation: option 2, on an architectural argument rather than a visual one.** §29 made the rail's contents *configuration-driven and unbounded* — a tab can be placed twice, More's membership is configuration not definition (`WO_MORE_TABS`), and a UDS is a step (`isStepKind()`). A workflow of 8 steps plus 4 More entries is legitimately authorable **today**. A horizontal row cannot hold that; a vertical column holds any number. Option 1 would mean choosing a layout the authoring model is already permitted to overflow — and in the mockup it is already forced to put More back behind a dropdown at 8 items, which is the collapsed-rail compromise returning under a different name. Option 3 puts "where am I in the flow" against reading order and competes for the trailing edge where sheets live.

Two details follow from it. The **timer pill** (§14.2, today in `.step-rail-right`) moves to the foot of the vertical rail, since it belongs to the record and therefore to band 2 rather than migrating to band 1. And the **action bar stays horizontal** at the foot of band 3 rather than standing up into a column, because height is abundant here — so **§8.4 is untouched** and the portrait pattern carries over unchanged. A rotated-phone analysis would have stood it up; a tablet does not need that.

A further consequence worth stating because it is a reduction rather than an addition: on tablet the rail is **always expanded**, so the collapsed pill and its tap target stop existing, along with the expand/collapse state itself.

Low-fidelity frames for Home, the record list, the workflow step and the child tab, plus the option comparison: `prototypes/standalone/mockups/landscape-mode-approach-options.html`.

## 31.5 Cross-device requirements (locked 2026-09-21)

Device-agnostic, and they apply to **every** app screen at every width — they are not part of the Expanded-class work and must not wait for it. Each was a measured finding from auditing the then-17 standalone screens on 2026-09-21 (16 after the checklist A/B closed the same day), and **all six were applied the same day** — so the table states the rule, what failed it, and what closed it. Two residual limits are named in the rows and tracked in §20; everything else is compliant and verified.

| # | Requirement | Found | Why it matters |
| --- | --- | --- | --- |
| 1 | **Pinch-zoom must never be blocked.** No `user-scalable=no` and no `maximum-scale` in any viewport meta tag. **See §31.6 before changing this** — blocking pinch does not buy native feel (iOS ignores it) and the jank it appeared to prevent is input auto-zoom, fixed by sizing inputs at `1rem`. | was **all of them**; now **0** — every screen carries `width=device-width, initial-scale=1.0` and nothing else | A WCAG 1.4.4 failure, and not a theoretical one: **Android Chrome honours the attribute**, so on Android the technician genuinely cannot zoom. iOS has ignored it in Safari since iOS 10, which is exactly why it survived — it is invisible on the device it was authored on. |
| 2 | **Text must scale with the OS text-size setting.** Type sizes in `rem` against a root size, never `px`. | was **354 `px` declarations** across `eam-shared.css` and every screen (an earlier figure of 131 undercounted — it missed the `font-size: Npx` whitespace form); now **350 `rem` plus 6 documented px exceptions** | A technician who has set large text gets no change at all. Worth stating plainly because the field population here skews toward outdoor work, gloves and bright light, so accessibility settings are likelier to be in use than average — and because in a research session it produces a "text is too small" finding that is an artifact of the prototype, not of the design. |
| 3 | **Interactive targets are at least 48 × 48 CSS px**, including the hit area where that is larger than the painted control. | was 12 controls at **22–34px**; now expanded by a transparent centred `::after` with painted sizes untouched. **`.field-checkbox` and `.lov-check` proved exempt** — both are indicators located from their own row (`row.querySelector()`, and `.lov-check` is a div with no handler), so the row was always the target. **Residual limit:** `.nav` packs controls at `gap:8px`, so two adjacent 48px areas would overlap and the wrong one would win; those get 48px vertically and gap-limited width (40 × 48). §20 | 48 is chosen deliberately as **one** number that satisfies all three authorities at once — Apple's 44pt, Android's 48dp and WCAG 2.5.5 AAA's 44px — so there is nothing to look up per platform. **The painted size may stay as designed**; what must grow is the hit area, via padding or a pseudo-element. Distinguish genuine controls from decorative badges (`.step-rail-type-circle`, `.step-map-icon`, `.required-count-badge`, `.attr-badge` are not targets and are exempt). |
| 4 | **No CSS feature without a fallback declaration**, unless it is Baseline Widely Available. | was **1 gap** — `.bottom-nav`'s `color-mix()`; now preceded by a solid `background:var(--bg-nav)`, the same fallback-first shape as `vh`-then-`dvh` | `color-mix()` needs Chrome 111 / Safari 16.2. On anything older the declaration is invalid, so the background never applies and the nav is **transparent** — and `backdrop-filter` is unsupported on those same browsers, so nothing covers for it. The result is content scrolling visibly behind the bottom nav. The existing `vh`-then-`dvh` pairing (§3.4, 2026-08-11) is the pattern to copy: fallback first, enhancement second. Audited clean otherwise — `:has()` and `clamp()` are unused, `backdrop-filter` and `aspect-ratio` both degrade gracefully. |
| 5 | **Storage access must never throw.** Every `localStorage` read and write goes through a guarded accessor. | was **20 raw calls in `eam-shared.js` and 25 across the screens**; now every one routes through `lsGet()` / `lsSet()` / `lsRemove()`, which swallow the throw and degrade to in-memory state. The `<head>` theme bootstrap keeps a raw call inside its own `try/catch` **by necessity** — it runs before `eam-shared.js` loads, so the accessors do not exist yet | `setItem` throws in iOS Safari Private Browsing and under storage pressure. An uncaught throw aborts the rest of the handler, so the visible symptom is not an error — it is **a control that silently does nothing**, which is the hardest possible thing to diagnose from a session recording. Also the reason demo state must be resettable between participants on a shared device (`resetDemoState()` already exists; §20). |
| 6 | **No runtime network dependency for anything load-bearing.** | was **34 references to `fonts.googleapis.com`**; now **zero runtime network dependencies of any kind**. Both families are self-hosted under `shared/fonts/` via `shared/eam-fonts.css` (latin + latin-ext, `unicode-range`-gated so English content fetches only ~328 KB, `font-display:swap` preserved). Both are SIL OFL 1.1, so redistribution is permitted | This is the good news and worth recording as a property to protect: nothing else in the app reaches the network. Data files are plain JS globals by design (`<script src>`, since `file://` blocks `fetch`/XHR), so the prototype runs with no connectivity at all. Fonts are the single exception, and a blocked or slow CDN silently substitutes system sans-serif — which changes the visual read without failing. Self-hosting the two families removes the last one. |

**The through-line in all six: every one of them is invisible on the device it was authored on.** Blocked zoom is a no-op on iOS; `px` type looks correct until someone changes a system setting; a 32px button is comfortable for the author who knows where it is; `color-mix` is supported in every current browser; `localStorage` never throws outside private mode; the font CDN is always reachable on an office network. That is the argument for auditing against the rule rather than against a device, and for **§31.2's refusal to name devices** applying to this section too.

## 31.6 Native-app feel (locked 2026-09-21)

The goal stated directly (user direction, 2026-09-21): the app should *look and feel like an app from the app store*. This section is what actually delivers that, and it exists because a wrong answer was applied first and has to be prevented from returning.

### Two different behaviours are both called "zoom", and conflating them caused the wrong fix

| | What it is | Right treatment |
| --- | --- | --- |
| **Pinch-zoom** | The user deliberately pinching to enlarge. | **Never blocked.** The app does not *require* it, and it is not there for ordinary use — it is there for a technician with low vision, in bright light, in gloves. WCAG 1.4.4. |
| **Input auto-zoom** | iOS Safari **force-zooms the whole page** when a text input with a computed font-size **under 16px** receives focus — and does not zoom back out. | **Remove the trigger: every text input is `1rem`.** |

**The second one is the actual jank**, and it is what "doesn't feel like an app" was describing: tap a field, the page lurches in, and it stays there. It was previously suppressed as a side effect of `maximum-scale=1.0` in every screen's viewport tag.

**Two things make blocking pinch the wrong way to buy app feel.** First, it does not work: **iOS has ignored `user-scalable=no` for pinch since iOS 10**, so iPhones were always pinch-zoomable while Android — which honours it — was not. The tag bought inconsistency, not consistency. Second, it treats a symptom: capping the viewport hides the auto-zoom without removing its cause, whereas a 16px input cannot trigger it on any platform, now or later.

**So the rule is: every `<input>`, `<textarea>` and `<select>` carrying text is `font-size:1rem` minimum, and no viewport tag caps scale.** 14 text-entry rules were raised to `1rem` on 2026-09-21 (from 13/14/15px). The cost is real and was accepted deliberately — field text got visibly larger — and it is worth noting **iOS system field text is 17pt**, so 16px is *closer* to native than what it replaced, not further. Elements merely styled to look like fields are exempt because they never receive focus: `.tree-select-btn`, `.md-selectall`, `.store-selector`, `.crew-selector-pill` are buttons and divs.

### What actually makes a web app stop reading as a web page

None of this was present before 2026-09-21. All of it lives in `eam-shared.css`, so it applies to every screen at once:

| Property | Removes |
| --- | --- |
| `-webkit-tap-highlight-color: transparent` on `html` | The grey flash on every tap. **The single biggest "this is a web page" tell**, and it was firing on every control in the app. |
| `overscroll-behavior: none` on `html, body` | Rubber-band overscroll and pull-to-refresh. A native screen does not bounce to reveal the page behind it. |
| `user-select: none`, **scoped to chrome** | Text selection on nav, rails, bars, sheets and chips. **Deliberately not `*`** — record values, comments and descriptions stay selectable, because a technician legitimately needs to copy an asset number. |
| `-webkit-touch-callout: none`, scoped to controls | The long-press context menu on buttons, tiles and photos. Again not global, for the same reason. |
| `touch-action: manipulation` on controls | The ~300ms double-tap-to-zoom wait before every tap registers. `manipulation` keeps pan and pinch and drops only double-tap zoom — **`none` would break scrolling**, so do not "simplify" it to that. |

### Installability is the biggest lever, and it may answer the delivery question

A web app manifest (`prototypes/standalone/manifest.webmanifest`) plus `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style:black`, `theme-color` and an `apple-touch-icon`. **Add to Home Screen then launches from an icon, fullscreen, with no browser UI and a dark status bar** — which is most of what distinguishes an installed app from a web page, and it needs no app store, no signing and no review. For a user-research panel that is likely the delivery answer as well as the fidelity answer.

Three deliberate choices in the manifest. **`display:standalone`**, not `fullscreen` — the status bar should stay visible, because a technician needs the clock and their signal. **No `orientation` key at all**, since locking it would contradict §31.2 and Apple's own guidance. **`start_url` is the login screen**, so a panel participant lands where the demo begins.

Icons are generated, committed PNGs at 180/192/512 (`shared/img/icon-*.png`) — the step-rail/checklist motif in `--bg-nav` black with `--green`. They are **placeholders for real branding**, not a brand asset; `512` doubles as the `maskable` icon, so Android's safe zone is respected.

**One known limit, tracked in §20:** in iOS standalone mode, navigating between separate HTML files only stays inside the installed window on **iOS 16.4+**; older iOS kicks the user out to Safari on the first link. This app navigates across 17 files constantly (§24), so on older iOS the installed experience degrades to a normal browser tab after the first tap. Android and desktop Chrome handle in-scope navigation correctly. Nothing in the prototype can fix this; it is a reason to check participants' iOS versions rather than a defect to chase.

### The prototype controls live in a header menu, not a banner (2026-09-21)

User direction: *"remove the top banner of options for the prototype, and just move them as link buttons next to Settings from the profile pic."* A visible dev banner across the top of every screen is the most obvious "this is not an app" tell there is, so it outranked every other item in this section.

**Three controls, confirmed with the user: Dark/Light, Offline/Online, Reset demo.** They now render as rows in a header menu under a `Prototype` group label, each carrying its current value as a mono state chip, so a row reads `Appearance — ◑ Dark` rather than needing a separate caption.

**It is self-injecting** (`injectProtoMenuGroup()`), per §8.3's rule. The record header's ellipsis menu is *per-screen markup in 11 copies*, so requiring a block of HTML per screen would have meant 11 edits and 11 chances to drift.

**It lands in two different menus, and that is forced by §4.2, not a preference.** §4.2 gives the nav bar exactly one slot — the avatar while browsing, a back button once a record is open — so **no single control is present on every screen**. The group therefore goes into the profile menu where an avatar exists and the record ellipsis menu otherwise. It inserts *before* a `Log out` item when there is one, so the destructive action stays last.

**`PROTO_MENU_EXTRA` is load-bearing, not an extension point for its own sake.** Two screens carried a screen-specific dev toggle in the old bar, and both drive live work: Book Labor's **timer** toggle sets the real `eamTimerRunning` key, which is the §18.2 condition deciding whether the booking pull-up opens at all, and the WO Equipment tab's **row-tap** toggle is the still-open `chooser`-vs-`split` experiment (§20). Deleting the banner without rehoming those would have quietly ended two open experiments — so a screen declares extra rows in the same optional-global shape as `TAB_PLUS_HANDLERS`. The WO Equipment tab's label write was also **guarded** in passing; it was an unguarded `getElementById(...).textContent` that would now throw if the row were ever absent.

**One gap this surfaced and fixed:** WO List had the avatar but wired it to a *"Profile — coming soon"* toast, so it had no §4.3 menu at all — a pre-existing conformance gap that only became visible when the controls needed a home. Rather than hand-copy the menu a third time, `ensureProfileMenu()` now **injects** the §4.3 dropdown beside any `.nav-avatar` that has none, and **replaces** that avatar's handler rather than augmenting it (otherwise the old toast would fire alongside the real menu). Home's and Notifications' existing inline copies are untouched — the injector only fires where there is nothing to open.

**Four screens keep the banner**, because they have neither an avatar nor an ellipsis menu and inventing chrome for them would be worse: Login (pre-auth, and the only place to set up before a session begins), the card-standard and field-behavior component references (developer pages, not app screens), Equipment List and Sync Status. The last two are the interesting ones — **Equipment List is browsing-tier and should carry an avatar** under §4.2 exactly as WO List does, which would let `ensureProfileMenu()` handle it and the banner come off. Tracked in §20.

**THE ENTRY POINT NEEDS THE TAGS TOO, AND THE MANIFEST BELONGS AT THE REPO ROOT** (found on device 2026-09-21, first real install attempt). The icon launched into Safari with the toolbar visible. The cause was a gap rather than a bug, and it is the kind that only a device finds: the tags went onto every *screen* and **not onto `index.html`**, which is what the shared URL actually resolves to and therefore the natural thing to add. A page with no tags yields a plain bookmark, not an app.

The manifest was also one directory down in `prototypes/standalone/`, which put the root **outside its `scope`** — so even with the tags present the root could not have launched standalone. Both halves are fixed: **one manifest at the repo root** with `scope:"./"` covering the whole site and `start_url` pointing straight at the login screen, plus the tags on `index.html` and `screens.html` as well as on every screen. **Don't move the manifest back down** — the reason it is at the root is the scope, not tidiness.

**An existing home-screen icon never upgrades itself.** iOS captures the web-app configuration at the moment Add to Home Screen is tapped, from the page then displayed. So any change to these tags requires **deleting and re-adding the icon**, and an icon added before the tags shipped will keep opening in Safari indefinitely. This is worth telling anyone who tests, because the natural assumption is that reloading the page picks it up — it does not. Add from the **root URL**, which is now the reliable entry point.

**BOTTOM BREATHING ROOM — `--shell-pad-bottom` (added 2026-09-21, from device feedback on the first working standalone install).** Reported as *"each screen feels a touch smooshed at the bottom"*, and the cause is a direct consequence of installing succeeding: **in a browser tab Safari's own toolbar sat below the app and supplied visual separation; in standalone mode the app's bottom edge IS the device edge**, so the bottom-anchored chrome reads as jammed against it.

**The obvious fix is the wrong one and would have broken §4.2.** Padding `body` or `.app` does move the bars up — `.app` is a flex child of `body`, so body padding shrinks it and its `bottom:0` children follow. But that lifts the bottom nav off the bottom edge, and §4.2 locks it as *"anchored, not floating — full-width, flush to the bottom edge, no inset margin or capsule shape"*. Note padding on `.app` itself would not have worked either: an absolutely positioned child's containing block is the ancestor's **padding box**, so `bottom:0` sits at the padding edge and the padding is simply ignored.

**So the room goes INSIDE the chrome, which keeps it flush.** Both bars stay `bottom:0; left:0; right:0` and grow downward:

| | Before | After |
| --- | --- | --- |
| `.bottom-bar` | `height:72px`, pill centred, 12px below it at the device edge | `height:84px` with `padding-bottom:12px` — pill still centred in the same 72px content box, then 12px clear |
| `.bottom-nav` | `height:80px`, items top-aligned | `height:92px` — items unmoved, 12px added beneath the labels |
| `--bar-reserve` | `72 + 24` | `72 + 24 + pad` — **must** track the taller bar or scrolling content clips behind it |
| `.content` | `padding-bottom:30px` | `30px + pad`, for the screens with no bottom chrome at all |

**The token carries `env(safe-area-inset-bottom, 0px)`**, matching `--bar-reserve`'s existing pattern, so it resolves to a flat 12px today and becomes 12px + the real inset automatically if `viewport-fit:cover` is ever enabled (§20) — no second pass. The `0px` fallback is load-bearing for the same reason it is on `--bar-reserve`: without it the whole `calc` is invalid at computed-value time on hardware with no inset, and an invalid padding computes to 0.

`test-bottom-reserve.js`'s safe-area assertion was **updated to follow the new indirection rather than dropped** — the inset now reaches the reserve through the pad token, so the test checks both links in the chain, and it was verified to fail when `env()` is stripped from the token.

**SCROLL-COLLAPSE CANNOT DESTROY ITS OWN TRIGGER (fixed 2026-09-21, reported on device).** Home was reported as *"jumpy — scrolled down and Create disappears, but it pulls me right back up and won't let it sit at the bottom."*

The §5.3 scroll-collapse mechanism collapses opted-in chrome past `scrollTop > 40` and restores it below `10`. It collapses by **reflow** — `.create-bar` animates `max-height`, deliberately, because a transform would not grow the scrollable area to match. So the collapse shrinks the very scroll range that triggered it, and on a screen that is only **marginally** scrollable that oscillates: past 40 → collapse → the range disappears → the browser clamps `scrollTop` toward 0 → under 10 → expand → scrollable again → repeat. The surface refuses to stay scrolled.

**The guard is that the range must survive the collapse:** only add `.scrolled` when `(scrollHeight - clientHeight) - chrome.offsetHeight > 40`. `offsetHeight` is the true height at that point because the branch only runs while expanded. Note the chrome may sit **outside** the scroll container — Home's Create bar does — in which case collapsing grows `clientHeight` rather than shrinking `scrollHeight`; it costs the range the same amount either way, so one check covers both arrangements.

**The consequence is intended, not a compromise:** on a screen whose content barely scrolls, the chrome simply never collapses — which is right, because collapsing chrome to make room only pays for itself when there is room worth making.

**`#recHeader` was guarded identically at the same time.** It was not reported, but it collapses by reflow through the same listener, so a sparse record view could reproduce it exactly. Two call sites, one rule.

**This was latent, not introduced.** Any marginally-scrollable screen could always have hit it; §31.6's bottom padding merely moved Home into the window where it fires. Worth recording because the symptom points at the padding and the cause is the collapse threshold.
