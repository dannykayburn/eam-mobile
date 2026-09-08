# HxGN EAM Mobile — Offline Architecture Options (Decision Brief)

**Status: PENDING DECISION. Not a spec, not a locked rule.**
Opened 2026-09-03 at user direction. This file exists to hold one undecided
architecture question long enough to decide it, and **it will be rolled into
`design-decisions-v3-1.md` and retired once the decision is taken** — see
§13 "Roll-up instructions" at the bottom for exactly which sections change
under each option.

Nothing in this file overrides `design-decisions-v3-1.md`. Where the two
disagree, the spec wins until the decision is taken. Where this file states a
fact about the *existing shipped product*, its source is the four HxGN EAM GIS
functional briefs listed in §12.

---

## 1. What is actually being decided

One question, and it is not "how do we make the search story land":

> **Does fleet-wide record search work offline?**

Every painful open item in the current design descends from answering *yes*.
The current spec (§2, §6.13) answers yes, and pays for it with:

- the declared `Indexed` column set (~10–20) and its unresolved authoring grain
- no `Indexed` control in Screen Designer
- dataspy **classification** rather than execution
- a normalised on-device criteria form — the load-bearing prerequisite
- a configured index scope with no defined shape
- the "showing 412 of ~9,000, connect for the rest" invariant with no screen
- the per-row stub / hydrated / ephemeral freshness affordance

That is **six §20 items**, the single highest-leverage backend ask
("server-side dataspy pre-evaluation — its timeline sets the floor for
everything offline"), and the FTS5 engine exit criterion.

**All of it is the price of searching records that are not yours, offline.**
Requirement 1 below says that is not wanted. So the question is whether to buy
Tier 2 at all — not how to explain it better.

---

## 2. The requirements, restated as testable statements

Given by the user 2026-09-03. Restated so each one can be scored against an
option rather than agreed with in principle.

| # | Requirement | Testable form |
| --- | --- | --- |
| R1 | Online-first, offline capability for transactions of **only specific entities** | The set of entities that accept an offline write is **declared and enumerable**, and it is a small subset of the entities the app can read |
| R2 | Handle GIS maps (ArcGIS and others — OSM etc.) | The app renders EAM records against a basemap, and supports whatever the existing product already supports, offline included |
| R3 | Configurable page layout | Already answered by Tier 0 `0c` (§2.3). Extension owed: a map has to be *placeable* by Screen Designer |
| R4 | Honors existing dataspy/grid paradigms for searching and returning records | A dataspy returns the same rows on mobile as it does on desktop, or the app says why not |
| R5 | Downloads are non-modal; the user can manually bring a record offline ("cache this so I can keep working") | No blocking modal; a per-record "keep offline" action exists; progress is visible in an existing surface |
| R6 | Handle sync error discrepancies easily from the device | Every failed write is inspectable and actionable on-device, and **no write is ever silently discarded** |

**The problem statement behind them:** the current fully-offline app downloads
so much that it causes performance issues and crashes.

---

## 3. Conflicts with currently-locked rules — flagged, not resolved

Per CLAUDE.md's working-style rule, these are called out rather than quietly
absorbed.

1. **R1 inverts §2.1.** The locked core pattern is *"UI always reads from local
   DB — never waits for network."* That is offline-first. R1 is the opposite
   polarity. §2.1 must be rewritten under **every** option below, including the
   status-quo option, because "online-first" changes the read path even if the
   tier model survives intact.

2. **R2 has no coverage anywhere in this repo.** No section of
   `design-decisions-v3-1.md` mentions maps, geometry, coordinates, ArcGIS or
   basemaps. This is a scope addition, not an offline refinement. Note the
   distinction that matters: **the repo has no coverage; the product has a
   mature implementation.** See §5.

3. **§2.5's "last-write-wins by timestamp" is incompatible with R6.** LWW is
   silently lossy — if the server wrote last, the technician's edit is
   discarded and there is no discrepancy left to surface. This is the one item
   worth fixing regardless of which option is chosen. See §10.

4. **A conclusion from the previous session is withdrawn.** An earlier draft of
   this analysis recommended scoping the map to a **viewer** in v1. §5 shows the
   shipped product is already a full **editor**. The recommendation is withdrawn;
   the viewer/editor question is not open, it is answered, and the answer is the
   expensive one.

---

## 4. Diagnosis: the legacy app's heaviness is not an index problem

Worth stating because it reframes the fix. Rough arithmetic against the current
spec, plus the GIS layer the briefs describe:

| Component | Order of magnitude |
| --- | --- |
| Tier 0 bootstrap config | KB — low MB |
| Tier 1 work set (≈200 WOs + children, full payload) | ~3 MB |
| Tier 2 index (≈30k stub rows × ~450 B + FTS5 overhead) | ~20–35 MB |
| Documents | unbounded |
| **GIS geodatabase replica** (extent × layers × feature density) | tens — hundreds of MB |
| **Offline basemap tiles** (levels of detail 13–16 over a work extent) | **tens — hundreds of MB** |
| Offline geocoding locator files (4 files) | MB |

Two conclusions:

- **The index was never the storage driver.** The design has been sizing a
  ~10–20 column projection while the GIS layer sits an order of magnitude above
  it. Column *count* was already documented as not the cost driver (§20, "Both
  projection numbers are provisional"); the GIS numbers make that decisive.
- **The lever is entity scope, not column count.** The existing app is heavy
  because it replicates full records across entities nobody needed. That is
  exactly what R1 asks to stop doing. See §8.

**Corroborating evidence from the product:** EAM Mobile Offline 11.5 introduced
**shared basemaps** — before it, every user on a shared device downloaded their
own copy of the same basemap. A feature exists specifically to stop basemap
duplication from filling devices. That is where the weight is.

---

## 5. What the existing product already does — evidence from the GIS briefs

This section is the highest-value part of this brief, because most of it was
being treated as open design when it is in fact shipped behaviour with known
limitations. Sources in §12.

### 5.1 The map is an editor, not a viewer

EAM Mobile Offline's Map View supports, today, offline:

- create point / linear / polygon features (tap-to-place vertices, undo/redo)
- edit feature **geometry** (drag vertices)
- edit GIS **attributes**
- create a corresponding **EAM equipment record** from a new feature, via
  attribute mappings authored in the ArcGIS Pro / ArcMap EAM toolbar
- add work orders against a feature; enter closing details; complete WOs
- create and view **nonconformities**, including linear ones (from/to point)
- **Main Isolation** — a network isolation solve (see §5.6)

Feature-server privileges gate this per capability (Create / Update / Allow
Geometry Updates), checked at the moment the user taps the corresponding
control. **Delete is not implemented in the app at all.**

**Consequence:** "make it a viewer to avoid a second sync engine" is not
available as a scope reduction if parity with the current app matters.

### 5.2 There are already two sync engines, and two error surfaces

This was raised last session as a risk. It is not a risk; it is the status quo.

| | EAM data sync | GIS sync |
| --- | --- | --- |
| Scope | records, per Sync Config | geodatabase replica + basemap tiles + locator files |
| Configured by | Sync Config screen | Map Configurations screen (per map record) |
| State shown | sync status | per-map **Sync / Pending / View Sync Errors** |
| Error surface | — | **Error Log** and **Pending Log**, under GIS Map Settings |
| Reset | — | **Clear Files** (clears all map/GIS data for the logged-in user) |

Pending-edit and error **counts are surfaced on entry to Map View**, every
time. The unified app will have to represent both channels; pretending GIS
edits can be routed through the EAM outbox is not on offer — an offline
geodatabase is an ESRI **replica**, and its lifecycle belongs to ArcGIS.

### 5.3 The map genuinely is a mode — and it has to be

The previous session's advice was "don't make connectivity a mode." That holds
for **EAM records**. It does not hold for the map, and the reason is structural
rather than a UX preference:

- Each map record carries an **Offline** switch (default from install parameter
  `MOBGOFFL`). ON = download a replica; OFF = live calls to the portal.
- *"The application does not switch between disconnected and online states
  automatically. The user must choose the mode…"*
- **A map cannot be switched offline → online while pending edits exist.**
  Local changes must sync first.
- In online mode, GIS edits post to the geodatabase immediately and no sync is
  required. In offline mode they queue in the replica.

That third bullet is the tell: an offline replica is a **checked-out version**,
so going online means reconciling or abandoning it. ESRI imposes that, not us.

**The reconciliation for the new app:** do not expose this as a global
app-level mode. Expose it as **per-map-area download state** — which is exactly
R5's *"cache this so I can keep working"* rather than a mode toggle. One
paradigm ("what have I taken offline?"), applied to map areas as well as
records.

### 5.4 Digital Work is online-only for maps; Mobile Offline does both

*"Since the Digital Work app supports online maps only; the value of this
install parameter is not considered by the Digital Work app."*

This is the cleanest single example of the SWG's "two separate mobile apps"
theme (High priority, leadership review §2): the same install parameters, the
same GIS setup, one capability present in one app and absent in the other. The
unified app has to pick up Mobile Offline's superset.

### 5.5 `MOBGEXT` is the configured index scope, already in production

§20 lists *"the configured index scope has no defined shape — which axes an
admin may bound it on (site / organization / age)"* as open. The GIS briefs
answer it with a fourth axis and a working precedent:

> *"Defining the extent is important for online and offline maps. For offline
> maps, this downloaded map is limited to the extent entered. For online maps,
> map features will be available outside the extent; however, there will be no
> related EAM data for those features outside of the extent. **This limitation
> exists for performance reasons.**"*

So: a **geographic extent**, authored server-side as an install parameter,
overridable per user+device on the Map Configurations screen (including by
drawing a polygon), bounding which EAM records are available — **and customers
already accept it as the shape of a mobile work area.** That is the index-scope
concept, minus the naming, with a decade of field use behind it.

It also lands the online/offline symmetry the current spec argues for: the
extent bounds *EAM data* in **both** modes, while GIS features remain viewable
outside it when online. Degradation is by data class, not by connectivity.

### 5.6 Main Isolation is the precedent for the right offline pattern

The single most useful architectural precedent in these briefs.

Main Isolation performs a network isolation solve — given a main, which valves
must close, which mains are affected, how many hydrants/customers/volume are
interrupted, plus dead-end block and dead-end branch handling. It is
**not** implemented against ArcGIS network services. It is implemented as:

- **four replicated EAM relational tables** (`r5mainisolationmains`,
  `…valves`, `…blocks`, `…depblocks`), populated by the customer via the
  Import Utility or their own geoprocessing service — *"nor will any screen be
  provided for the purpose of populating or managing data in the Main Isolation
  tables"*
- **an on-device solve** over those tables
- **an explicit user opt-in**: a *"Download Main Isolation tables"* checkbox in
  Sync Config, changeable later, taking effect on the next sync

Three things this proves:

1. **Per-entity, user-opted offline replication is already the product's
   idiom.** §8's policy registry is a formalisation of something shipping, not
   a new invention.
2. **Heavy analysis offline = replicate a bounded projection and compute
   locally.** Same shape as Tier 2, applied to a graph instead of a search
   index. It is the strongest argument that a *declared, bounded* projection is
   the right pattern — and that authoring it is a real customer
   responsibility, not a defaulted convenience.
3. **ArcGIS network analysis is not available anyway.** Of the Utility
   Network's five service types, HxGN EAM supports **map service and feature
   service only** — `UtilityNetworkServer`, `NetworkDiagramServer` and
   `VersionManagementServer` are unsupported. Doing the solve off EAM tables was
   not a preference; it was the only route.

### 5.7 The punch list is already a multi-source projection — and it is hardcoded

The briefs enumerate exactly what Mobile Offline downloads by default:

1. WO **Assigned To** the employee for the logged-on user
2. any WO activity with a **Schedule Labor** record for that employee
3. any WO activity with a **Dispatch Labor** record for that employee
4. any WO activity with a **Dispatch Labor** record for that employee's **crew**
   — gated on the employee's *"Determines Crew Location for Dispatching"* checkbox

**This is a live input to the still-open punch-list decision (§2.6 / leadership
review §6.1), and it favours Option B.** Those four rules are precisely the
assignment sources the `R5PINS` projection is specified to materialise, with
provenance. The existing app resolves them as hardcoded logic with no
provenance. Under **Option A** (static sync dataspy) every customer would
re-derive all four in dataspy SQL, including the crew-flag condition — which is
Option A's stated weakness ("assignment logic gets re-derived in dataspy SQL
per customer") now confirmed against a real rule set rather than assumed.

Note also the optimised-scheduler **Dispatch Sequence** already flows through
to the map WO icon and the WO list, and refreshes on map reload. Any punch-list
mechanism has to carry it.

### 5.8 The map's WO list is a hardcoded projection — and it is a known limitation

The Map View WO list filters against a fixed field set: WO code, description,
job type code, job type description, equipment code, equipment description,
assigned to, assigned to description, due date. **Nine fields.** The briefs
list, under *Known limitations*:

- *"The Work Order filter runs against a pre-determined list of fields only."*
- *"The Work Order list does not include any user-specified sorting capabilities."*
- *"The Work Order icon and highlight color … are not currently configurable."*
- *"An Equipment list is not currently available in the Map View."*

Two uses for this. First, it is the **first real-world data point on the
projection number** (§20 lists both the card's 6 and the index's ~10–20 as
provisional): nine fields is what shipped, and it shipped as a *limitation*.
Second, it is empirical support for §21's rejection of a hardcoded projection —
the failure mode is documented in the product's own release notes.

### 5.9 GIS identity is a second identity domain, and Tier 0 has no slot for it

Tier 0 (§2.3) models EAM identity only. The GIS layer needs, in addition:

- an **ArcGIS Portal account per mobile user** — required *"only … to verify
  that the user has a valid license for mobile SDK use"*, independent of
  whether the services themselves are secured
- **up to three credential sets per map**: portal, feature service, basemap
  service, prompted separately when they differ
- fallback to the EAM user's stored `ArcGIS User` / `ArcGIS Password`, which
  **requires connectivity** to retrieve
- encrypted token caching on device; re-prompt on expiry
- `GISAUTH = OAUTH2` + `MOBGAPID` app registration for SAML, with
  platform-specific redirect URLs (`<bundle-id>://GISAuth`)

**Consequence:** §2.3 consequence 2 says a first-run Tier 0 failure is *"the
one legitimate hard failure in this design."* With GIS there is a **second**:
no portal license validation means no Map View, and it is a different failure
with a different remedy. Tier 0's bootstrap contract (§20, shape undefined)
has to carry a GIS identity domain with its own version stamp and its own
partial-failure code.

**And a collision to check:** the *Unsupported Functionalities* appendix states
that under IWA or OAuth2, EAM web services that connect to the map service
fail, and several EAM↔GIS validation paths silently do nothing. If the new app
standardises on OIDC (there is a `HxGN EAM Mobile Offline OIDC Configuration`
brief), this needs verifying rather than assuming.

### 5.10 Map assignment is per Organization or Department — never per user group

`GISMAPS` takes `Global` / `Organization` / `Department`. Maps are authored on
the base **Maps** screen, and a map is either desktop or `Mobile Only` —
**never both**, so every map is authored twice if both surfaces need it.

This collides with §26, which resolves nav slots, layout and dataspies **per
user group**. GIS is the one configuration domain in the app that resolves on a
different axis. Either `GISMAPS` grows a user-group option (base-side change),
or the mobile app maps user group → org/dept to pick a map, or map selection
stays a user-device preference outside the §26 model. **Not decided anywhere.**

### 5.11 Two more operational facts worth carrying into the decision

- **Basemap tiles cost ESRI credits**, charged to the account that registered
  the basemap item, per download. ArcGIS Online-hosted basemaps cap at
  **100,000 tiles**. Offline levels of detail are set by `MOBGBLOD`, default
  **13–16**. So basemap extent/zoom is a **licensing and cost** decision, not
  only a storage one.
- **PerReplica sync accumulates server-side versions** — one per downloaded map
  or per user — and *"if the GIS administrator does NOT manually perform a
  reconciliation … these DB versions will continue to grow in number."* ESRI
  recommends a script. Operational burden that scales with device count, and it
  belongs in any "sustainable across our other mobile apps" assessment.

---

## 6. The options

Four positions on the one variable: **how much search works offline.**

### Option 1 — Online-first; offline scope = what is on the device

Delete Tier 2. Search is always a server call. Offline, the same search box
scopes to cached records and says so ("Offline — searching your 43 cached work
orders"). Tier 1 (work set), Tier 3 (demand / manual cache) and Tier 4 (server
search) survive unchanged; **only the stub tier goes.**

Row lifecycle collapses:

```
absent    --(online search)-------------> ephemeral
ephemeral --(open / "keep offline")-----> hydrated
ephemeral --(swept ~24h)----------------> absent
hydrated  --(LRU, if !pinned && !dirty)-> absent
```

The `stub` state is gone, so **a record on the device is complete or it is not
there.** That single fact removes the whole hydration-completeness axis, and
with it §20's "what can a row honestly claim about its freshness" item — there
is no partial state left to describe.

**Scores best on R4, counterintuitively.** A dataspy executes server-side
exactly as on desktop: all ~150 fields, all joins, all predicates, full
fidelity, no classification, no subsetting, no truncation caption. The current
design *degrades* dataspy fidelity in order to run some of them locally. Same
for List/grid mode — online it is full columns, offline it is the work set at
full columns, with no tier-dependent column degradation anywhere.

FTS5 drops from "tens of thousands of stub rows" to "~200 hydrated records,"
which any engine handles trivially.

**Cost, stated plainly:** offline, a technician cannot find a work order that
is not already on their device. That is a real capability loss and should be
presented as one.

### Option 2 — Online-first + a thin, product-fixed local index

Keep a Tier 2 but strip its configurability: a **fixed** projection the product
defines (WO number, description, status, equipment, location, due date, **and
lat/long**) over a **narrow** row set bounded by the same extent concept as
§5.5 — thousands of rows, not tens of thousands. No `Indexed` flag, no admin
authoring, no Screen Designer control. Offline search is one flat FTS
`contains` plus the filter chips the UI already evaluates locally. Dataspy
*selection* offline collapses to the default, or is disabled with a stated
reason.

**What it buys that Option 1 cannot:** offline **location-aware search** —
"what work is near me", "search around this asset within N km". The leadership
review (§2.1) names location-aware search as one of two search-MVP use cases
the current design does **not** deliver, and §5.1/§5.5 show it is *already a
shipped Map View capability* (Search Around, radius slider, offline locator
files). Option 1 delivers it over the work set only; Option 2 delivers it
fleet-wide.

**Costs:** the stub state returns, so the per-row completeness affordance
returns with it. And this is adjacent to a rejected alternative — §6.13's
*"static, non-configurable card projection."* Read that entry carefully: it
rejected a static **card** projection on two grounds, (a) the projection also
drove the filter chips, and (b) `full_payload` exists because customers differ.
Ground (a) lapsed when the card projection was **decoupled from storage on
2026-08-26**; ground (b) is about display, not about a search index. So a fixed
*index* projection is a genuinely different call — but §6.13 instructs that
§21's two rows be amended before re-proposing, and that instruction stands.

### Option 3 — The current spec (declared `Indexed` set + dataspy classification)

Full offline dataspy parity. Highest backend cost; six open items, three of
which cannot be settled from the design side at all. Coherent — it is simply
buying a capability R1 says is not wanted.

### Option 4 — Explicit Online mode / Offline mode

**Rejected for EAM records.** SWG's Hybrid Connectivity theme is High priority
and says it directly: *"customers want online/offline as one continuum — not a
mode choice and not an app choice."* A mode is the disease the current two-app
split already has.

**But partially unavoidable for the map** — §5.3. And there is a real idea
inside it worth extracting: make **intent** explicit, not connectivity.
"Prepare for offline" / "keep this offline" is R5, not a mode. Connectivity
stays invisible; user intent is explicit. That framing covers map areas and
records with one paradigm.

### 6.1 Scoring

Rebuilt 2026-09-03 after §8.1–§8.7. Rows above the rule are the six stated
requirements; rows below are properties the analysis surfaced that were not in
the original scoring. **Every added row favours Option 1**, which is itself
worth noticing — none of them was looked for.

| | Opt 1 | Opt 2 | Opt 3 | Opt 4 |
| --- | --- | --- | --- | --- |
| R1 online-first + scoped offline writes | ✅ | ✅ | ⚠️ inverts §2.1 harder | ✅ |
| R2 GIS | neutral — see §9 | ✅ carries geometry | neutral | ✅ matches product |
| R3 configurable layout | ✅ | ✅ | ✅ | ✅ |
| R4 dataspy/grid fidelity | ✅ **best** — server-side, full fidelity | ⚠️ offline selection degrades | ❌ classification degrades it | ⚠️ |
| R5 non-modal + manual cache | ✅ | ✅ | ✅ | ❌ mode ≠ intent |
| R6 error handling | ✅ (needs §10) | ✅ (needs §10) | ✅ (needs §10) | ✅ |
| — | | | | |
| Offline fleet search | ❌ | ⚠️ fixed projection | ✅ | ⚠️ |
| **Offline location-aware search** — **revised, see note** | ✅ for **GIS-integrated** assets, via the GIS replica within the extent (§5.5); work set only for the rest | ✅ fleet-wide, incl. non-integrated records | ✅ fleet-wide | ⚠️ |
| **Vendor precedent** (§8.1) | ✅ **the market consensus** | ⚠️ partial — fixed projections exist, but as *limitations* (§5.8) | ❌ **none found** — no surveyed product ships offline search over the full record population | ❌ rejected by VoC |
| **Un-populatable child tabs** (§8.6) | ✅ ephemeral rows only, swept ~24h | ❌ **every stub, permanently** | ❌ **every stub, permanently** | — |
| **"Can a dataspy select a UDS field?"** (§8.6) | ✅ a server-side **join** — a base-EAM question | ❌ no — the index is one flat table | ❌ no | — |
| **Standalone UDS as `server-only`** (§8.6.2) | ✅ an ordinary policy row | ⚠️ | ❌ §2.1 makes a server-only screen a violation, not a choice | — |
| **A replication master switch** (§8.7) — the only credible answer to Contractor/BYOD | ✅ **near-free** — removes a fallback | ⚠️ costly | ❌ **near-incoherent** — §2.1 leaves no read path | — |
| **Does the offline path degrade the online path?** (§8.2's documented coupling) | ✅ no — the server stays the primary read path | ⚠️ risk | ❌ yes by construction — the UI always reads local | — |
| — | | | | |
| §20 items **closed** | **7** | 4 | 0 | — |
| Backend ask | small | medium | **largest** | small |

**Two notes on honesty in this table.**

**The location-aware row was revised, and it withdraws a caveat from §7.**
An earlier version scored Option 1 as "work set only," which made offline
location search Option 2's distinctive prize. §5.5 shows that is wrong: an
offline GIS map area holds the features **and** their related EAM equipment data
within the configured extent, and Search Around with a radius slider already
works offline against it (§5.1). **So offline "what is near me" is already
delivered by the GIS replica for GIS-integrated assets, under every option.**
Option 2's remaining unique value is location-aware search over records that are
**not** GIS-integrated — a real but much narrower prize, and narrower precisely
for the utility/linear-asset customers §7 previously invoked as the reason to
buy it, since those are the customers most likely to have integration.

**The "§20 items closed" row understates the accounting, deliberately kept as
closures only.** For a full picture: the session's decisions closed **2 further
items regardless of option** (UDS storage, standalone-UDS scope) and **opened
roughly 8 new ones** — per-UDS row cap, FK-mapping validation, offline-profile
authoring, device-grain policy, the online-only sync state, refcounted eviction,
the field-level "unresolved reference"/"not hydrated" states, and the
Custom-Fields write form. The new items are individually cheaper and better
specified than the six Tier 2 items Option 1 retires, but **the count is not a
free win and should not be presented as one.**

---

## 7. Recommendation

**Take Option 1. Shape the schema so Option 2 stays additive.** Unchanged in
direction since the first draft, and now materially better supported — but
Option 1 has to be stated as the *compound* it turned out to be, not as "delete
Tier 2."

### What Option 1 actually is, now that the pieces are specified

> **Online-first reads**, with a local store as a fallback rather than the
> primary source (§3.1 rewrite of §2.1) —
> **a declared per-entity offline policy** with enforced caps (§8, §8.1) —
> **reachability traversal**: a root pulls its children plus declared depth-1
> references, references terminal (§8.5) —
> **three lookup classes**: replicate bounded domains, derive unbounded ones
> from on-device data, gate configuration-resolving values on their
> configuration (§8.3) —
> **an always-on outbox and always-persisted Tier 0**, with only replication
> switchable, assigned per user group (§8.7) —
> **no Tier 2 index, and dataspies executed server-side at full fidelity.**

Only the last line is the actual decision. Everything above it is either
already accepted or holds under every option.

### Five reasons

1. **It is what R1 asks for, and the only option that *improves* R4** rather
   than compromising it. Dataspies run server-side exactly as on desktop — all
   fields, all joins, all predicates, no classification, no truncation caption.
2. **It is the market consensus** (§8.1). No surveyed product — SAP/Sigga,
   Salesforce, D365 FS, ServiceMax, Maximo, MaintainX — replicates a whole
   entity or ships offline search over the full record population. Every one of
   them does declared per-entity filters plus relationship traversal.
   **Conversely, Option 3 has no vendor precedent at all**, which reframes "the
   searching aspect isn't catching on" as a rational reaction rather than a
   communication failure.
3. **Option 1's row lifecycle is a strict subset of Option 2's.** Because
   *"row identity never changes across the lifecycle"* is already locked
   (§6.13), adding a `stub` state and a fixed projection later touches neither
   row identity, the grid, nor the outbox. Deferring genuinely costs nothing
   structurally — a rare case.
4. **Three findings nobody went looking for all landed the same way** (§6.1):
   the un-populatable child tab is an edge case under Option 1 and the permanent
   state of most rows under 2/3; "can a dataspy select a UDS field" becomes a
   base-EAM join instead of a flat no; and the replication switch — **the only
   credible answer to §7.8's Contractor/BYOD theme** — is near-free under Option
   1 and near-incoherent under Option 3. When independent lines of enquiry
   converge, that is worth more than any single argument in this brief.
5. **The wall exists because the index was designed before anyone knew whether
   it was needed.** Ship Option 1, instrument how often technicians search
   off-work-set while offline, and let that number decide Option 2.

### The caveat from the previous draft is withdrawn

It argued Option 2 might be the honest floor for utility/linear-asset customers,
because "find the nearest hydrant offline" is a different ask from "search all
work orders offline." **§5.5 answers it from the GIS side instead:** the offline
map area already carries features *and* their related EAM equipment within the
configured extent, and Search Around already works offline against it. So that
need is met without a Tier 2 index — **and met best for exactly the customers
the caveat was about**, since they are the ones with GIS integration. What
remains is location-aware search over **non**-integrated records, which is a much
narrower prize than the caveat claimed.

### The decision is now much narrower than it looks

Worth leading with in the meeting, because it changes the shape of the
conversation. **These hold regardless of which option is chosen:**

- the three-way lookup split, including `definition-gated` (§8.3) — **accepted**
- reachability traversal and its termination rules (§8.5) — **accepted**
- UDS storage, and standalone UDS as permanently `server-only` (§8.6) — **resolved**
- the per-action offline capability model and the §2.1 resolution (§8.4) — shaped
- the replication-switch decomposition: Tier 0 always, outbox always (§8.7) — shaped
- §2.5's last-write-wins must be replaced by per-shape conflict rules (§10) — **required under every option**
- GIS: two sync engines, a per-map-area replica lifecycle, editor not viewer (§5, §9)

**So the meeting decides one thing: does fleet-wide record search work
offline?** Everything else is either settled or independent of the answer.

### The two questions that would change the recommendation

Both are product questions for the advisory group, not architecture questions,
and neither can be answered from the design side:

1. **How often does a technician need to find a record that is not on their
   device, while offline?** If the answer is "routinely," Option 2 is the floor.
   If it is "rarely, and they can wait for signal," Option 1 is right. Nobody
   has this number, and Option 3 was designed on an assumption about it.
2. **Is location-aware search needed over records that are *not* GIS
   integrated?** If yes, the GIS replica does not cover it and Option 2's
   lat/long projection earns its place.

### What to do next, in order

1. **Take the platform decisions that block everything** (§9): viewer-vs-editor
   is answered (editor, §5.1), so the live ones are **React Native + ArcGIS
   offline** — likely a custom native module, and the largest unpriced item in
   this brief — and **what "other map services like OpenStreetMap" means**
   (basemap swap vs. a second GIS integration; roughly an order of magnitude
   apart).
2. **Fix §2.5 regardless of the option** — last-write-wins is silently lossy and
   directly contradicts R6 (§10).
3. **Put the two questions above to the advisory group**, then take the option
   decision.
4. **Execute §13's roll-up** and retire this file.

---

## 8. The part that makes this sustainable across other apps

R1's real content is *"offline for only specific entities."* That asks for a
**declared per-entity offline policy**, and *that* — not the tier model — is the
reusable asset for the organisation's other mobile apps. §5.6 shows the product
already works this way; it is simply not named.

| Policy | Read offline | Write offline | Examples here |
| --- | --- | --- | --- |
| `server-only` | ✗ | ✗ | POs, WO history, reports, deep lookups, **standalone UDS record views** (locked 2026-09-03, §8.6.2) |
| `reference` (replicated, small, slow-changing) | ✓ | ✗ | code domains, employees, crews, trades, stores, layout + UDS defs, **Main Isolation tables** |
| `on-demand` (user-cached — R5) | ✓ if cached | ✗ | any WO/asset the tech chose to keep |
| `work-set` (auto-replicated + children) | ✓ | ✓ | pinned WOs + activities, checklist results, parts lines, labor lines |
| `external-replica` (foreign engine, own lifecycle) | ✓ | ✓ | **GIS features / geodatabase** — see §9 |

Two payoffs.

**The write-enabled set becomes small and enumerable** — WO status/step state,
checklist results, labor bookings, part issues, meter readings, comments,
attachments, plus GIS features on the separate channel. That is ~7 EAM shapes.
A real per-entity conflict UI is writable for 7; it is not writable for 60.
**R6 is only tractable because of this.**

**"The app is offline" stops being a property of the app** and becomes a
property of each entity. That declaration is what ports to the next app in the
portfolio. The tier model does not.

`external-replica` is the row that earns its keep: it names the fact that GIS
is a *policy class*, not an exception, so the next app that needs a foreign
sync engine has a slot to put it in.

**How the `work-set` and `on-demand` rows actually acquire their contents is
§8.5's reachability traversal** — the policy says *whether* an entity can be
offline; traversal says *which rows*. `reference` rows bypass traversal
entirely (replicated whole, §8.3 row 1) and `server-only` rows are never
traversed into. The two declarations are complementary, and §8.5's worked
example is what the registry costs in practice.

---

## 8.1 Market practice — how comparable apps scope offline (researched 2026-09-03)

Added at user direction: *"you can't download the whole DB, and 'their work
orders' is radically different between installations. Downloading a million
equipment just to create a work request is crazy. What's the scope here in how
this is usually executed?"* Sources are vendor documentation, listed inline.

**Nobody in this survey replicates a full entity.** The convergent enterprise
pattern is four mechanisms used together:

1. **A declared, filtered, per-entity sync profile**, authored by an admin
2. **Relationship traversal** — master data arrives *by reachability from the
   work*, not by entity
3. **Hard caps and indexed-field requirements**, enforced by the platform
4. **Some entities declared offline-incapable outright**

### The concrete implementations

| Product | Mechanism | Published constraints |
| --- | --- | --- |
| **Dynamics 365 Field Service** | *Offline profile* — per-table filters + **item association** (related tables inherit the parent's filter, so not every table needs its own) | ≤ **15 linked tables** *including transitive downstream*; guidance ≤ **200,000 records** total; **never "All records"**; avoid wide date ranges; **POs, agreements, RTV/RMA cannot go offline at all**; keep custom local-DB calls to 2–4 concurrent |
| **Salesforce Briefcase Builder** | *Briefcase* — admin-defined filtered record sets per object, with `$User` dynamic context and related-record priming | ≤ **10 filters per object**; ≤ **50,000 records per object** (default **500**); ≤ **5 objects per briefcase**; **filters must use indexed fields** (unindexed raises a warning); Order By restricted to indexed fields; **at least 1 filter per object** |
| **ServiceMax (PTC)** | *Download Criteria* + *Advanced Download Criteria* on a Mobile Configuration screen; ADC exists specifically to pull records **related** to the event via what-id, referenced record, or junction criteria | Admin-only; ADC documented as *for related records only* |
| **SAP Mobile Services offline OData** (the layer Sigga, Innovapptive, Prometheus and SAP Asset Manager build on) | **"Defining requests" / "defining queries"** — declarative OData queries stating exactly which server-side subset populates the offline store; `$filter` at query level, `$select` narrowed | Vendor guidance is "bring only the fragment you expect to work with"; date filters recommended as the primary lever |
| **IBM Maximo Mobile** | Automatic — **no offline-mode toggle**; local SQLite; work-order data downloaded at first login and refreshed every subsequent login; offline maps downloaded separately with **resumable** download | No published record caps found |
| **MaintainX** (SMB tier) | User-controlled cache of **work orders assigned to you** (or you + team, per a setting), filled **due-date-soonest first**; prompts to sync on reconnect | Work orders only — **no offline asset search** |

Not verifiable: **Sigga**, **Innovapptive** and **Prometheus** publish no
offline limits or scoping mechanics — their material is marketing. They sit on
SAP Mobile Services' offline OData store, so the "defining request" row above
is the mechanism, whatever the branding.

### The answer to "a million equipment just to create a work request"

Four mechanisms, and **none of them is "download equipment":**

1. **Reachability, not entity.** Download the assets *referenced by* the work
   you already downloaded — D365's item association, ServiceMax's ADC. 200
   assets, not a million. This is the single highest-leverage idea in the
   survey and the current spec does not have it: §2.3 hydrates Tier 1 records
   *and their children*, but nothing declares that a WO's **referenced
   master data** rides along on the same traversal. **Specified as a rule in
   §8.5.**
2. **Indexed-field filters.** Salesforce refuses to let a briefcase filter on
   an unindexed column. Same constraint, same reason as a declared index
   projection: the scope has to be cheaply computable server-side.
3. **Scan-to-resolve.** A barcode/QR scan yields an **identity**, not a search.
   Online it is a single-record lookup; offline it hits the local cache or
   fails honestly. It never needs the registry.
4. **Create against an unresolved reference.** An offline work request captures
   a scanned tag or typed code plus a description; **the server resolves the
   equipment on sync.**

Point 4 is the one that dissolves the premise: **"create a work request
offline" does not imply "have the asset registry offline."** It implies the
write path can carry an unresolved foreign key. That is a **write-path**
answer, not a read-path one — which is why no vendor solves it with an index.

### Admin-authored or user-picked?

**The market answer is overwhelmingly admin-authored**, and it makes the
*variability* point rather than contradicting it: "their work orders" differs
per installation precisely *because* every vendor makes it a **configured
query** rather than a hardcoded rule.

- **Admin-only:** Salesforce Briefcase, ServiceMax, D365 FS (the user can
  trigger a sync, not change the scope).
- **User-controlled:** MaintainX (offline settings, WO-scoped); Esri Field
  Maps and HxGN's own Map Configurations screen (draw an extent, pick layers,
  per-map Offline switch); **HxGN's own Sync Config screen**, which is
  presented to the *user* at first login, plus the *"Download Main Isolation
  tables"* checkbox.
- **Manual per-record pinning is genuinely rare.** No product in this survey
  documents a "keep this specific record offline" action for records.

Two consequences. **HxGN EAM Mobile Offline is already at the user-controlled
end of this market** — more so than SAP-, Salesforce- or Microsoft-based
competitors. And **R5 is a differentiator, not table stakes**, which also means
no vendor has de-risked it; it will need designing rather than copying.

### What this says about the options

- **Option 1 is the market consensus**, once "plus reachability traversal" is
  added to it. Online-first, declared per-entity filters, master data by
  traversal, no fleet-wide offline search.
- **No product in this survey ships a general offline search index over the
  full record population.** That does not make Tier 2 wrong — HxGN has the
  dataspy paradigm and an Intelligent Search MVP that these competitors do not
  — but it means **Option 3 has no vendor precedent to lean on**, and "the
  searching aspect isn't catching on" is a rational reaction rather than a
  communication failure.
- **The SMB tier is narrower in *scope*, not in *capability*.** It caches less
  (MaintainX: assigned work orders only, no asset search) but it still executes
  work offline. See §8.2 — an earlier draft of this row claimed offline mode
  "means read cached data, not act on it" across the market. **That was wrong
  and is retracted**; it was sourced from a competitor's marketing blog rather
  than vendor documentation.
- **The punch-list decision is affected, and Option A gains ground.** Every
  enterprise product above defines the work set as an **admin-authored,
  bounded, validated filter** — which is Option A's shape, and it was
  under-weighted in §6.1. **But note the form it takes:** ≥1 filter per
  entity, on indexed fields, with a per-entity row cap, refused outright when
  unbounded. **Option A as currently specified has none of those guards.**
  Adding them is what would answer §20's concern that per-dataspy membership
  shipping does not scale. Meanwhile §5.7 shows the existing product hardcodes
  four assignment sources, which is Option B's shape. So: **market leans A,
  the shipped product leans B** — and A only works if it is capped.

### Numbers worth adopting rather than deriving

These map almost one-to-one onto §8's policy registry and should be attached
to it as enforced limits, not guidance:

- a device-wide record ceiling (D365 uses ~200,000)
- a per-entity row cap (Salesforce uses 50,000; default 500)
- a cap on relationship traversal depth/breadth (D365 counts transitive
  relationships toward a limit of 15)
- **filters permitted only on indexed columns**
- **at least one filter per entity; "all records" refused**
- an explicit list of entities that **cannot** be offline, enforced at
  authoring time rather than discovered on device

Sources: [D365 offline profile setup](https://learn.microsoft.com/en-us/dynamics365/field-service/mobile/set-up-offline-profile),
[D365 offline best practices & limits](https://learn.microsoft.com/en-us/dynamics365/field-service/mobile/best-practices-limitations-offline-profile),
[Salesforce Briefcase Builder](https://trailhead.salesforce.com/content/learn/modules/offline-briefcase/build-a-briefcase),
[ServiceMax download criteria](https://support.ptc.com/help/servicemaxcore/en/articles/core/mac-servicemax-configuration-to-download-other-records.html),
[SAP Mobile Services offline overview](https://help.sap.com/doc/f53c64b93e5140918d676b927a3cd65b/Cloud/en-US/docs-en/guides/features/offline/overview.html),
[Maximo Mobile offline](https://www.ibm.com/support/pages/how-enable-offline-mode-maximo-mobile),
[MaintainX offline mode](https://help.getmaintainx.com/offline-mode).

---

## 8.2 Nobody goes read-only offline — what actually degrades (researched 2026-09-03)

Added at user direction, and it **corrects §8.1**. The question was whether
competitors drop into a protected/read-only mode offline and lose checklists.
They do not. **Offline write is the core feature, not a caveat**, and
checklists/inspections are the canonical offline transaction in every product
surveyed.

| Product | Executes offline |
| --- | --- |
| **D365 Field Service** | update WO status (travelling / in progress / completed), view WO detail, service account, priority, time windows, price lists, incidents, map + directions, and **Time Entry with a start/stop clock**; everything entered syncs later |
| **ServiceMax Go** | access and update work orders; **checklists are SFM transactions and run offline** — but the SFM Wizard configuration must already be on device via a separate **Configuration Sync** |
| **Maximo Mobile** | **Inspections are explicitly offline-capable**; no offline toggle exists — the app switches automatically |
| **MaintainX** | complete work orders and tasks offline; prompts to sync on reconnect |

### What *does* degrade — and it is one rule, not a list

**Anything that needs the server at the moment of the action.** D365 states it
plainly: *"any actions that require an API call, server call, or Power Automate
flow will not work in offline mode."* Concretely, from its documentation:

- **server-side logic does not run** — Field Mapping is unsupported offline; a
  workflow step that depends on server interaction returns *"not at all if the
  user is truly offline"*
- **entities excluded from the profile are excluded entirely** — POs,
  agreements, RTV/RMA
- **Copilot / anything AI-backed** requires connection
- **and the pattern worth stealing:** *"commanding options which aren't
  supported in Offline mode are **hidden from the UI** after the application
  transitions to Offline mode,"* against a documented list of offline-supported
  command-bar options

**That last one is in real tension with §2.1's *"network state is a background
concern invisible to the user."*** Microsoft's answer is the opposite —
connectivity **visibly** changes the available action set, so an unavailable
action is absent rather than failing. Under an online-first re-frame (§3.1) that
tension has to be resolved deliberately: either the action set is stable and
some actions queue optimistically, or the action set narrows visibly offline.
**Not both, and not silently.** Owed either way: a declared per-action offline
capability list, which is the action-level counterpart of §8's entity-level
policy registry.

### Form and field behaviour offline — nothing becomes Protected

Researched 2026-09-03 against vendor documentation, in answer to *"which
competitors let the user actually populate forms offline, and if not, what is
presented — does field behaviour change to protected?"*

**Direct answer: forms are fully editable offline, and no product surveyed
switches fields to a protected or read-only state because of connectivity.**
Microsoft's model-driven offline documentation is the most explicit of the four
and grants **per-table** permissions rather than a mode:

| Table | Offline permissions |
| --- | --- |
| **Work Order** | Create, Read, Update *(no Delete)* |
| **Work Order Product / Service / Service Task** | Create, Read, Update |
| Bookable Resource Booking | Create, Read, Update |
| Custom table | Create, Read, Update, Delete |
| **Attachment, Connection, Connection Role, Email, Team, User** | **Read only** |
| Product | Read |

**Work Order Service Task is the checklist analogue, and it is fully editable
offline.** So the pattern is: a **small, named, per-table** read-only set — not
a global protected mode, and not a field-state change.

### What actually degrades at field grain — four things, none of them field state

Quoted from Microsoft's offline-limitations documentation:

1. **Validation moves from entry-time to sync-time.** *"No upfront validation
   of data input occurs; all data-related validations are done during sync."*
2. **Computed values go stale.** *"Calculated and rollup fields that are part
   of rows synced to the client aren't reevaluated by the client. The
   reevaluation happens on the server when the updated row is synced."*
3. **Defaults do not populate.** *"Mapped fields aren't prepopulated when you
   create a new record from a table that has fields mapped to another table."*
4. **Lookup display values can be stale.** *"The value of a lookup field may
   not be updated in a form or grid when the display name of the lookup item is
   updated."*

**And business rules *do* run offline** — declarative client-side logic is
supported; it is plugins, Power Automate flows and any server call that do not.
That is a sharper line than §8.2's opening rule and worth keeping: **the split
is client-evaluable vs. server-evaluable, not "logic vs. no logic."**

### A third UI pattern this project does not have: substitute

§8.4 offers hide and disable. Microsoft's documentation shows a **third**, and
it is the gentlest of the three:

- *"The **Advanced lookup** button is replaced by a **Change view** dropdown
  list"* when offline.
- *"View-based search (filter by keyword) isn't supported in offline mode and
  grid search switches to a quick, find-based search."*

**Substitute a simpler control for a richer one**, rather than removing it.
Add `substituted` as a fourth state in §8.4 — it is strictly better than
`blocked-visible` wherever a degraded equivalent exists, and this app already
has two obvious candidates: an online-only dataspy could fall back to the
default rather than being disabled, and Tier-4 escalation could fall back to
cached-scope search with a stated scope (§8.3 row 2).

Also documented, and closer to `blocked-hidden`: *"certain relationships such
as N:N are read only \[offline], and the **Add Existing** command is hidden on
subgrids… even if the button is unhidden via customization, the command doesn't
work in offline."*

### Two findings to deliberately NOT copy

**1. Microsoft does not apply field-level security offline** — *"field level
security and field sharing aren't supported in Mobile offline mode."*
**Corrected 2026-09-03 (user direction): this class of gap cannot arise in this
design, and an earlier version of this row wrongly implied it could.** The
reason is a genuine strength of the Tier 0 model and worth recording, because
someone will raise this comparison:

**Authorization here is Tier 0 data that *populates the control*, not a check
performed at write time.** Status authorizations are `0d`, and they are what the
status LOV draws its values from — so a technician is never offered a
transition they do not hold, online or offline. Same for §5.2's field states,
which resolve from page layout (`0c`). **The permitted set is on the device
before the control renders**, so there is nothing for connectivity to bypass.
Microsoft's gap exists because field-level security there is enforced
server-side at save; ours is enforced by what the LOV contains.

**This also sharpens §2.3 consequence 3's rationale.** That rule — *"do not
enable the write path until status authorizations are present"* — is currently
justified as "otherwise the app permits transitions the server will reject."
Given the above, that is not quite the risk. The real risks are narrower and
both are about `0d` itself:

- **`0d` absent** → the status LOV has *no values*, so the control cannot
  render at all. This is a Tier 0 configuration failure (§2.3 consequence 2),
  not an authorization bypass — and it is why the rule is right even though its
  stated reason needs adjusting.
- **`0d` stale** → the LOV offers a transition that has since been revoked
  server-side. **This is the only genuine residual**, and it is already handled
  by the per-domain version stamp §20 owes for the Tier 0 contract: a reconnect
  asks "did any of this change?" for a few bytes. Worth stating explicitly as
  the reason that version stamp is not merely an optimisation.

**2. Enabling offline degrades *online* behaviour too.** *"Column filtering is
disabled when an offline profile is set up **even when there's network
connectivity**. The grid works with the local database and doesn't support
custom filters."* That is a coupling worth avoiding by design: under Option 1
the grid reads from the server when connected, so there is no reason for the
offline capability to cost anything online. **If a design decision ever makes
the online path worse in order to serve the offline one, that is the smell this
row names.**

**This row also reveals that offline is a *switch* in that product** — an
admin enables it per app and attaches a profile, and doing so changes behaviour
whether or not the device is offline. **Whether this app should have such a
switch, and at what grain, is §8.7.**

### And one finding that validates a §6.13 alternative nobody proposed

*"Only system views and quick views are supported in mobile offline. **Personal
views aren't supported.**"*

That is the unbounded user-authored query problem — §6.13's governing fact —
and **Microsoft's answer is simply to exclude user-authored views from offline
entirely.** It is cruder than §6.13's classify-and-evaluate-locally rule, and
considerably cheaper: no normalised criteria form, no classifier, no per-field
`Indexed` flag. Under Option 1 the question is moot (all dataspies run
server-side at full fidelity). But **under Options 2 or 3 it is a real
simplification worth costing** — "admin-published dataspies can be
offline-capable; user-authored ones are online-only" — and it should be on the
table rather than discovered later.

Related, and directly on §20's *"dataspy criteria need a normalised on-device
form"*: Microsoft publishes a **per-attribute-type list of filter operators
supported in mobile offline** via FetchXML. So the "which predicate constructs
are expressible on device" question has a worked precedent — the answer is
"fewer than the server supports, and you publish the list."

### Traversal caps in the wild are harsher than §8.5 proposed

Two documented profile limits bear directly on §8.5, and both are stricter than
anything in that section:

- *"A maximum of 15 relationships is allowed. There's also a maximum of **one**
  many-to-many (M:M) or one-to-many (1:M) relationship within those 15."*
- *"**No circular references or self-references** are supported."*
- *"An offline profile can only contain up to **14 image columns**, across all
  entities."* (Total sync ceiling is 3,000,000 records — note this is the hard
  platform limit, well above the ~200,000 *recommendation* in §8.1.)

Two consequences, and they are the most actionable items in this subsection:

1. **A Work Order has ~8 to-many children** — activities, checklist items,
   parts lines, labor lines, comments, document metadata, `wo_equipment`, plus
   placed UDS tabs. A platform that permits **one** is telling you that
   **to-many traversal is the expensive part**. §8.5's edge-count discussion was
   aimed at the wrong axis: the binding constraint is the **per-collection row
   cap**, not the number of edges. Size the caps per collection.
2. **The equipment parent chain is a self-reference** — the one onward hop
   §8.5 declares, and exactly what this platform refuses outright. So it needs
   its own mechanism rather than recursive traversal. **Recommended: have the
   server flatten the ancestor chain into a denormalised path or a fixed set of
   ancestor columns**, shipped with the equipment row. That keeps §7.4's
   Structure Tree and the Equipment Lookup's Structure tab working without a
   recursive edge, and it removes the depth-N configurable entirely.

### Esri Field Maps — the counterexample that supports the on-device rule

Worth having because it is the one product in this survey that ships
**conditional field logic which evaluates offline**. Field Maps' *smart forms*
support **conditional visibility** via Arcade expressions, evaluated on the
device, inside a downloaded offline map area.

Two things this gives:

- **It proves §8.4's third one-way door is achievable**, not just prudent:
  `resolveFieldState(field, context)` can be genuinely on-device, and a
  shipping product does it. That strengthens the recommendation in §13.1–§13.4
  from "required, or the feature cannot ship offline" to "required, and known
  to be feasible."
- **It ships a rule this project will need:** an inspection *"can be submitted
  without entering attributes when a conditional visibility expression hides
  them, **even if they are marked as required**."* **Hidden beats required.**
  That is precisely the declared-vs-effective field-state split §20 already
  names as one of the two one-way doors for conditional rules — with a
  precedent for which way the precedence runs.

### Corroborating evidence for Tier 0, from a competitor's live defects

Two findings that independently validate §2.3's *"configuration does not
degrade"* rule:

1. **ServiceMax ships a separate Configuration Sync.** SFM Wizards must be
   synced to the device as configuration, distinctly from data, before offline
   checklists work. **That is Tier 0 by another name, shipping in a
   competitor.**
2. **Maximo's offline inspection forms fail when their reference data does
   not arrive.** A reported issue on Maximo Mobile 9.0: custom dropdowns are
   configured for CM work orders in the Technician app, a new datasource and
   dropdown are added for the related inspections — the **work orders download
   fine, but the inspections datasource does not refresh, so the inspection
   forms are unavailable offline for exactly those work orders.** Note also
   that Maximo inspection forms draw their valid single/multi-choice responses
   from **domains**, rendering as radio buttons at ≤10 values and a search
   dropdown above that. So the form's usability offline depends directly on
   code-domain availability.

Item 2 is the single most useful competitor data point in this brief: it is
§2.3's *"a missing page layout is not a shorter screen, it is a blank one"*
happening to a shipping product, at LOV grain, on the exact screen type
(§16 Activity Checklist) this project has built.

## 8.3 Lookup resolution offline — a three-way split, not one rule (ACCEPTED)

**Accepted 2026-09-03, user direction.** Offline, an LOV is **not** served by
replicating its source entity. But *how* it is served depends on the lookup,
and there are **three** cases, not one. Getting this wrong is what produced the
Maximo defect in §8.2 at one extreme and would produce an unusable Equipment
picker at the other.

**The governing insight:** split lookups by **cardinality and dependency**, not
by reachability. Reachability is the right answer for exactly one of the three
rows below.

| # | Lookup class | Offline resolution | Why this row exists |
| --- | --- | --- | --- |
| **1** | **Bounded code domains** — Department, Problem Code, Priority, Organization, UOM, Closing Codes, Type of Hours, Trade, Assignment Status | **`replicated` — ship the whole domain.** Already Tier 0 `0f`. | Kilobytes. Subsetting buys nothing and costs correctness: a technician who needs the 41st department cannot pick it, and it reads as a data error rather than an offline limitation. **§8.2's Maximo defect is what subsetting this row looks like in production.** |
| **2** | **Unbounded entity lookups** — Equipment, Parts, Employees/Crews at scale, Stores/Bins/Lots | **`reachable` — derive the option set from data already on the device**, by traversal from the downloaded work (§8.1 mechanism 1). | This is where the million-row problem lives, **and the only place it does.** Replication is impossible; a server call is unavailable; the WO's own referenced records are already there and are what the technician actually needs. |
| **3** | **Definition-gated values** — WO Type, Equipment system type, Class, Status | **`definition-gated` — a value is offline-pickable only if the *configuration it resolves* is also on the device.** Bounded by what shipped in Tier 0, not by what values exist. | Picking one of these **re-resolves the screen**. The value being present is not sufficient; the thing it points at has to be present too. **This is the row most likely to be missed, and every member of it is already a locked rule elsewhere in the spec.** |

### Row 2's obligation: say that it is scoped

A reachability-derived list must **announce its scope** — *"showing the 12
assets on this work order; connect to search all"* — the same honesty invariant
§6.13 already sets for a dataspy exceeding the index scope. **Never a silent
short list.** This is the single highest-risk failure mode of the whole
approach, because a short list looks like correct data.

### Row 3, member by member — all four are existing locked rules

| Value | Depends on | Consequence offline |
| --- | --- | --- |
| **WO Type** | the page layout for that Type (`R5PAGELAYOUT` on `PLO_WOTYPE`) **plus** the two WO Workflow tables — Tier 0 `0c` | §13.5 makes Type editable pre-Start-Work with an immediate re-render. **Offline, the pickable Type set is exactly the set whose layouts and workflow rows shipped** — otherwise the confirm succeeds and the re-render has nothing to draw. §14.11 protects Type from Start Work onward, so this is a pre-start-only exposure, but it is a real one. |
| **Equipment system type** | one of the four `PLO_PAGENAME` layouts (§26.8) | Protected in update mode, always — so **Insert Mode is the only place it is ever set**, which makes an unavailable layout unrecoverable from mobile rather than merely inconvenient. Compounded by §7.5 of the leadership review: those four layouts have no authoring surface yet. |
| **Class** | §22 custom-field **definitions** for that Class | Class *values* are a code domain (`0f`); the definitions are configuration (`0c`). Pick a Class whose definitions never shipped and you get a record with blank fields nobody can fill. **The two live in different Tier 0 sub-tiers, which is exactly why this is easy to miss.** |
| **Status** | status authorizations — Tier 0 `0d` | Already locked: §2.3 consequence 3 forbids enabling the write path without `0d`. So the offline status LOV is bounded by `0d` **by existing rule**, and this row simply names it as the same mechanic as the three above. |

**What follows from row 3 being a class rather than four special cases:** the
`definition-gated` rule needs to be stated **once**, in §2, as *"a value whose
selection re-resolves configuration is offline-selectable only if that
configuration is present."* Four screens then inherit it instead of each
inventing a guard. It is also the natural home for the next such value nobody
has thought of yet.

### Where this leaves the Equipment case that motivated the decision

Equipment is row 2, and reachability is decisive there: a WO's own equipment,
its Route/MEC rows (§16.9), its parent/child structure and anything the
technician manually cached. That set is single digits to low hundreds, it is
already on the device, and it is what the technician is standing in front of.
The million-row registry never comes down, and per §8.1 mechanism 4 a work
request against an *unknown* asset does not need it to — it carries a scanned
tag or typed code and the server resolves it on sync.

---

## 8.4 Per-action offline capability — the action-level counterpart (owed, shape proposed)

§8's registry declares what each **entity** does offline. §8.2 showed that is
not sufficient: D365 hides unsupported **commands** when the app goes offline,
against a documented list. This project has no such list, and it needs one —
because §8.2 surfaced a genuine contradiction that has to be resolved rather
than absorbed.

### The contradiction, and the resolution

§2.1 locks *"network state is a background concern invisible to the user."*
Microsoft's shipped answer is the opposite: connectivity **visibly** changes
the available action set. Both cannot hold.

**Proposed resolution — one test, two outcomes:**

> **Can the server's answer be deferred without the technician acting on a
> wrong assumption?**
> **Yes → queue it, and keep the action set stable** (§2.1 holds; this is the
> optimistic-UI premise and it is the right default).
> **No → the action is visibly unavailable, with a stated reason** (§2.1 yields,
> narrowly and deliberately).

This keeps §2.1 as the rule and makes visible narrowing the *named exception*,
rather than letting either one quietly win. **And the app will have both
paradigms regardless** — §5.3's replica interlock means a GIS feature edit
against an online-mode map genuinely cannot be queued, so the visible-narrowing
pattern is required somewhere in the app no matter what is decided for records.
Better to name it as a governed exception than to discover it in the GIS track.

### Five states

Four were specified initially; `substituted` was added 2026-09-03 from the
Microsoft precedent in §8.2, and it is **strictly preferable to
`blocked-visible` wherever a degraded equivalent exists.**

| State | Meaning | UI |
| --- | --- | --- |
| `allowed` | fully local; no server involvement | normal |
| `queued` | accepted optimistically, drains via the outbox | normal, plus the existing §4.4 sync vocabulary |
| `substituted` | a degraded equivalent exists | the simpler control replaces the richer one (§8.2's Advanced-lookup → Change-view precedent) |
| `blocked-visible` | cannot be deferred, and no degraded equivalent exists; the technician must know it exists and why it is unavailable | present, disabled, with a reason |
| `blocked-hidden` | not meaningful in this state at all | absent |

**Prefer `substituted` → then `blocked-visible` → and only then
`blocked-hidden`, which needs a justification**, because an absent control is
indistinguishable from a configuration error — precisely §5.8's complaint
against the shipped map WO list. Two obvious `substituted` candidates in this
app: an **online-only dataspy** can fall back to the default rather than being
disabled, and **Tier-4 escalation** can fall back to cached-scope search with a
stated scope (§8.3 row 2) rather than refusing.

**And field *state* is never one of these five.** §5.2's states
(Required / Protected / Optional / Hidden / Not Available) resolve from page
layout, which is Tier 0 config and therefore identical online and offline.
Nothing becomes Protected because the network dropped — §8.2 confirms no
surveyed product does that, and doing it would reintroduce exactly the mode
split §5.1 exists to reject. **This table governs actions and controls, not
field states.**

### First-pass enumeration for this app

Proposal, not locked. The value is in the shape and in the three rows that turn
out to be interesting.

| Action | Offline | Note |
| --- | --- | --- |
| Checklist item complete / value entry | `queued` | the canonical offline transaction; §8.2 confirms every competitor does this |
| Status change | `queued` | gated on Tier 0 `0d` being present (§2.3 consequence 3) — no `0d`, no write path at all |
| **Start Work** on a **hydrated, pinned** WO | `queued` | |
| **Start Work** on a **non-hydrated** WO | **`blocked-visible`** | §14.11: starting a searched WO *is* the Tier 3 → Tier 1 promotion, and it must hydrate children. **Already documented as needing connectivity** — this table just gives it a state and an obligation to explain itself |
| Book labor | `queued` | crew expansion (§18.7) resolves against the local `crew_employees` snapshot |
| Issue parts — planned lines | `queued` | |
| Issue parts — ad-hoc part not in the local stock snapshot | **`blocked-visible`** | bin stock is server truth (§17.11); accepting it optimistically means issuing stock that may not exist |
| WO Closing | `queued` | |
| Add comment | `queued` | append-only, cannot conflict (§10) |
| Attach a document | `queued` | upload deferred |
| **View** a non-cached document | `blocked-visible` | presigned URLs expire and previews are unavailable offline — already a locked constraint (§7.2); the 38px slot degrades to a file-type badge by design |
| Insert WO / Equipment (Insert Mode) | `queued` | needs a client-side temp key + server rekey on sync, and per §8.1 mechanism 4 may carry an **unresolved** equipment reference |
| Switch to an offline-capable dataspy | `allowed` | zero-network by §6.13 |
| Switch to an online-only dataspy | `blocked-visible` | §6.13 already requires it to *say so* rather than under-return |
| Search within cached scope | `allowed` | must state the scope (§8.3 row 2) |
| Escalate to server search (Tier 4) | `blocked-visible` | |
| Retry / discard a failed outbox item | `allowed` | queue management is entirely local — and this is R6's core surface, so it must never depend on connectivity |
| **Main Isolation** | `allowed` **iff** the four `r5mainisolation*` tables were downloaded | the **action-level** analogue of §8.3 row 3: an action gated on whether its reference data shipped. §5.6 shows the opt-in already exists |
| Open a **UDS child tab** placed in the resolved layout | `allowed` | its rows traverse with the record, indefinitely (§8.6.2) |
| Open a **UDS child tab** on a re-typed WO whose rows never traversed | `blocked-visible` | renders and says *not hydrated* — otherwise indistinguishable from a legitimately empty tab (§8.6.2's mirror case) |
| Open a **standalone UDS record view** | **`blocked-visible`** | permanently `server-only` (§8.6.2). **Never `blocked-hidden`** — a nav destination that silently vanishes offline is this table's own worst failure mode |
| GIS feature create / attribute edit / geometry edit — map in **offline** mode | `queued` | into the ESRI replica, **not** the EAM outbox (§9) |
| GIS feature create / attribute edit / geometry edit — map in **online** mode | **`blocked-visible`** | §5.3: the shipped product already blocks this and notifies. **The one place visible narrowing is unavoidable.** |
| GIS feature delete | `blocked-hidden` | not implemented in the product at all (§5.1) — justified absence |
| Anything requiring a server-side rule, flow or recalculation | `blocked-visible` | the general case; see below |

### Two things this enumeration exposes

**1. Server-side business logic not running offline is a real trap for the
conditional-field-rules work (§13.1–§13.4).** D365 documents that offline
*"any actions that require an API call, server call, or Power Automate flow will
not work"* and that Field Mapping is unsupported offline. If a field-level
condition is evaluated server-side, it **silently does not apply offline** — the
form accepts values the server will later reject, which is §2.3 consequence 3's
failure mode arriving through a different door. §20 already names the two
one-way doors owed for conditional rules (a single `resolveFieldState(field,
context)` seam, and a declared-vs-effective field-state split). **This adds a
third: the seam must be evaluable entirely on-device, or the feature cannot
ship offline at all.** Worth recording now, while the tier is still unchosen,
because it is cheap to state and expensive to retrofit.

**2. Who authors this list is a different answer from §8's registry.** Entity
offline policy is **customer-configured scope** — it belongs with Sync Config /
the index scope, and §8.1 says cap and validate it. Per-action capability is a
**product-declared architectural fact** — whether Start Work can complete
without a server is not a customer preference. **Recommend: product-owned,
versioned with the app, not authored in Screen Designer.** Screen Designer
already has three unbuilt controls owed to it (§20: `Indexed`, Placement, the
Equipment layouts); adding a fourth that nobody should be editing would be a
mistake.

---

## 8.5 Reachability traversal — the rule, and where it stops (ACCEPTED; termination owed)

**Accepted 2026-09-03 in principle** (it is §8.3 row 2's mechanism and §8.1's
market consensus). What follows is the rule stated properly, because the
important half is not the traversal — it is the **stop condition**, and without
one this rule *is* the legacy app's heaviness rather than the cure for it.

### The gap in the current spec

§2.3 hydrates Tier 1 as *"fully hydrated records **+ children**"*. That is a
**downward** traversal — a WO's activities, checklist items, parts lines, labor
lines. It says nothing about the WO's **outward references**: its equipment,
department, assigned-to and reported-by employees. Those are a different
traversal with different cardinality, and with them missing there are only two
outcomes, both bad:

- **replicate the referenced entities wholesale** — the million-equipment
  problem, and almost certainly how the existing app reached the size where it
  crashes; or
- **render blank references offline** — the Maximo failure mode in §8.2, one
  level up from LOVs.

**Reachability is the third option, and it is the only one that scales.**

### The rule

> **A hydration root pulls its declared children (downward, bounded by the
> root) and its declared references (outward, depth-1). References are
> TERMINAL by default: the app does not traverse a referenced record's own
> children or its own references. Any onward hop must be explicitly declared
> and explicitly capped.**

The default-terminal half is the entire rule. Without it:

```
WO → equipment → parent equipment → its children → their WOs → their equipment → …
```

…is a transitive closure over the whole database, reached in four hops from one
work order. **That is not a hypothetical failure mode; it is the shape of every
"why is our offline app 800 MB" post-mortem.**

### Roots — what starts a traversal

Traversal is triggered by **hydration**, not by a row existing. Three roots:

| Root | Traversal | Note |
| --- | --- | --- |
| A **work-set** WO (Tier 1, `pinned = 1`) | full — children + references | the normal case |
| A **manually cached** record (R5) | full — children + references | **required**, or R5 delivers a pinned record with blank fields, which is worse than not caching it |
| A **Tier-3 demand tap** while online | full, at tap time | this is what makes the record usable when connectivity later drops |
| A **Tier-4 ephemeral** search result | **none** | deliberately. Traversing every search result makes every search expensive. Consequence: **an ephemeral row renders with unresolved references** and that is a real, nameable UI state — see below |

### Where it stops

Five termination rules. The first four are proposed; the fifth is the one that
needs a number from dev.

1. **References are depth-1 and terminal**, unless declared otherwise.
2. **`reference`-policy entities are never traversed** — they are replicated
   whole per §8.3 row 1. Traversal must not fetch code-domain rows
   individually; that would be both slow and redundant. **Traversal applies
   only to §8's `work-set` and `on-demand` policies**, i.e. entity-scale rows.
3. **Declared onward hops are the only exception**, and each carries its own
   cap. The one this app needs is the **equipment ancestor chain**, for §7.4's
   Structure Tree and the Equipment Lookup's Structure tab. Direction matters:
   **ancestors only, never children** — following an equipment's children pulls
   a Route of 156 (§16.9) plus everything under it.
   **Amended 2026-09-03 (§8.2): do not implement this as a recursive edge.**
   An equipment→parent hop is a **self-reference**, and Microsoft's offline
   profile refuses self-references and circular references outright — a signal
   that recursive traversal is the wrong shape, not just an unbounded one.
   **Recommended instead: the server flattens the ancestor chain** into a
   denormalised path or a fixed set of ancestor columns shipped on the
   equipment row. That keeps both consumers working, removes the recursive
   edge, and **removes the configurable depth N entirely** — leaving the
   closure cap as the only tunable number.
4. **Never traverse from a reference back into transactions.** An equipment's
   WO history, its meter readings, its cost data are `server-only` (§8) and
   are the single largest thing a naive traversal drags in.
5. **A device-wide closure cap**, enforced server-side at payload assembly,
   parallel to §8.1's adoptable limits. If the closure exceeds it, the payload
   is **truncated with a stated reason**, never silently — same invariant as
   §6.13's "showing 412 of ~9,000".
   **Sized per collection, not per graph (added 2026-09-03, §8.2).** Microsoft's
   profile permits 15 relationships but **at most one** to-many among them; a WO
   has roughly eight to-many children. A platform that allows one is saying
   **to-many traversal is the expensive axis** — so the binding constraint is a
   **per-collection row cap**, not the number of edges. Size each collection
   (checklist items, parts lines, labor lines, comments, each placed UDS tab)
   rather than the graph as a whole.

### Worked example — why this is not the million

200 work orders in the work set:

| | Rows |
| --- | --- |
| WOs | 200 |
| children (activities, checklist items, parts lines, labor lines, comment/doc metadata) | ~2,000–4,000 |
| **referenced equipment, deduplicated** | ~120–180 (many WOs share assets) |
| equipment parents at N=2 | ~40–80 |
| referenced employees (assigned-to, reported-by), deduplicated | ~30–60 |
| **referenced code-domain rows** | **0 — replicated whole per §8.3 row 1** |

**Order 200–300 additional master-data rows.** Deduplication is doing most of
the work, which is the point: the closure is bounded by *the work*, not by the
registry. And it is the same set §8.3 row 2 offers as the offline Equipment
LOV — one mechanism, two consumers.

### Server-side, not client-side

**The server computes the closure and ships it in the sync payload.** The
client-side alternative is an N+1 fetch per root, chatty and slow on exactly
the connections this app exists for. This matches D365's item association and
ServiceMax's ADC, both server-side, and it matches §2.3's existing
recommendation that code-domain scoping be resolved server-side — *"one
round-trip inside the login wait instead of two."* Same argument, same answer.

### Three consequences that need naming

**1. Eviction becomes refcounted, and §6.13's interlock gains a third
condition.** A referenced record can be reached from several roots. When one
root is evicted, its references may only be dropped if **no other retained root
references them**, on top of the existing `!pinned && !dirty` guard. Get this
wrong in either direction and you either leak rows forever or blank out a WO
that is still on the punch list. **Owed:** whether that is a real refcount
column or a recomputed sweep. Note this is *simpler* under Option 1 than under
Option 2/3, because Option 1 has no `stub` state to reason about.

**2. An unresolved reference is a first-class UI state, not an error.** It
arises legitimately in two places: a Tier-4 ephemeral row (no traversal by
design) and a record created offline against a scanned tag the device has never
seen (§8.1 mechanism 4). Both must render as *"equipment 00067333 — not
downloaded"* rather than blank or broken. This is the **read-side twin of
§8.1's write-side unresolved foreign key**, and §6.13's row-state vocabulary
describes *records*, not *fields*, so there is no affordance for it today —
the same gap §27.5 already flags for a UDS tab that cannot populate.

**3. The traversal graph is a declaration, and it has an owner.** Like §8.4's
per-action list and unlike §8's entity policy, this is a **product-declared
architectural fact**, not customer-configured scope — which references a WO
carries is a property of the data model, not a preference. **Recommend
product-owned and versioned with the app.** What *should* be configurable is
narrow and numeric: the parent-chain depth N, and the closure cap.

### First-pass traversal declaration for Work Order

Proposal, not locked. The value is the shape — and note that every `terminal`
marking is a decision to *not* download something.

```
WORK_ORDER  (root: work-set | manual-cache | demand-tap)
  children  (downward, bounded by the root)
    activities, checklist_items, parts_lines, labor_lines,
    comments, document_metadata, wo_equipment (Route/MEC rows),
    uds child tabs      -> ONE EDGE PER *PLACED* UDS. Which UDS tabs are
                           placed comes from the resolved page layout, so
                           the edge set is per (user group, WO Type) and
                           rides Tier 0 `0c`. Join columns come from that
                           UDS's declared PK->FK mapping (§8.6.2).
                           Standalone UDS record views are NEVER traversed.
    custom_field_values -> ONE EDGE, fixed key (entity, record key, field
                           code). Product-declared, in the core (§8.6.3).
    (UDFs need no edge at all — they are columns on the record, §8.6.1)
  references (outward, depth-1, TERMINAL)
    equipment            -> + parent chain, N levels (declared hop, default 2)
    department           -> reference policy: already replicated
    assigned_to          -> employee
    reported_by          -> employee
    problem_code, priority, organization, status, wo_type
                         -> reference policy: already replicated
                         -> wo_type + status additionally definition-gated (§8.3 row 3)
  never traverse
    equipment -> work_orders | meter_readings | cost | documents
    equipment -> children
    employee  -> anything
```

**The UDS line is why this graph is not wholly product-declared, and §8.5's
ownership claim above is amended accordingly — though less than an earlier
draft claimed, because the placed set is bounded by page layout (§8.6.2).** A UDS child tab is its
own `U5` table whose join to the parent is **authored per UDS** (§8.6.2), so
the graph is *assembled at bootstrap* from a **fixed product-declared core plus
a declared extension set arriving in Tier 0 `0c`** — the same shape as page
layout, riding the same vehicle. The two configurable *numbers* (parent-chain
depth N, closure cap) stand; the claim that the *edge set* is fixed does not.
Consequence: the closure cap stops being a safety net and becomes the primary
defence, because a customer-authored FK mapping can inflate every device's
payload. **UDFs are the happy case and need no edge at all** (§8.6.1); **Custom Fields
take one product-declared edge with a fixed key** (§8.6.3). With all three
mechanisms placed, **this declaration is complete** rather than provisional.

### The GIS analogue, for completeness

GIS does **not** use traversal — it uses **extent** (§5.5's `MOBGEXT`) plus a
selected layer list. The two scoping mechanisms coexist and meet at
**`GISOBJID`**, which joins an EAM equipment record to its feature. Worth
stating explicitly because it is a real asymmetry: **an asset can be reachable
without being in the extent, and in the extent without being reachable.** The
first renders a record with no map position; the second draws a feature with no
EAM data — which is precisely the behaviour §5.5 documents for online maps
outside the extent. Neither is a defect, but the UI has to be honest about both.

---

## 8.6 Customer extension mechanisms — three, and they behave differently offline

**Rewritten 2026-09-03 after user correction.** An earlier version of this
section conflated User Defined Screens with a generic entity-attribute-value
store and drew two wrong conclusions from it. **Both are retracted below.** The
conflation *was* the problem, so the fix is a section that separates the three
mechanisms explicitly and gives each its own offline shape. §22 already warns
that Custom Fields and UDS "must not share an implementation"; the same holds
at the sync layer, and it now holds three ways.

| Mechanism | Where the data lives | Traversal edge | Offline shape |
| --- | --- | --- | --- |
| **UDF** — User Defined **Fields** | **the same table as the record**, as columns, like any other field | **none** | free — arrives with the record |
| **Custom Fields** (§22) — admin-defined per Class + Class Org | a **separate values table**, keyed `(entity, record key, field code)` | **one edge, fixed systematic key — product-declared** | the middle case |
| **UDS** — User Defined **Screens** (`U5*` tables) — **child tab** | its own `U5` table | **one edge per *placed* UDS, from that UDS's declared PK→FK mapping; the placed set comes from page layout** | bounded by layout |
| **UDS** — **standalone record view** | its own `U5` table | **none — never traversed** | **permanently `server-only`** (locked 2026-09-03) |

### 8.6.1 UDFs — the cheapest mechanism, and it needs no new machinery

Per user description: UDF data sits **in the same table as the record**, as
ordinary columns. A UDF may have a defined set of values, and **those values
live in a separate table mapped to the column for that master function**.
Definitions are **the same across all clones**.

Everything follows from that, and all of it lands on rules that already exist:

- **Data: no traversal, no child, no policy row.** A UDF *is* part of the
  record, so it arrives whenever the record does. Nothing in §8.5 applies.
- **Value lists: §8.3 row 1 — a bounded code domain, replicated whole**, into
  Tier 0 `0f`. It is keyed `(column, master function)`, which is exactly the
  shape `0f` already carries. Subsetting one is the §8.2 Maximo failure.
- **Definitions: Tier 0 `0c`** — labels, types, which UDFs exist. Missing
  definitions mean a rendered column with no label, which is the same class of
  regression as raw codes with no description (§2.3's stated reason for putting
  code domains in Tier 0 at all).
- **"Same across all clones" is a real simplification worth banking.** §26.7
  resolves functions per user group and this customer already runs four
  `WSJOBS` clones (CCJOBS / TRJOBS / ZJ1000 / WSJODC). Because UDF definitions
  and value lists are per **master function**, those four clones share one UDF
  configuration — **the clone model does not multiply UDF config in Tier 0.**
  That is the opposite of §20's *"mobile screens hardcode their own field
  labels"* worry, where per-clone labels *do* multiply.

**Net: UDFs are offline-complete today under existing rules.** No new
mechanism, no traversal edge, no §8 policy row, no write-form change — a UDF
edit is an ordinary field edit on the record and takes §10's field-edit
conflict rule.

### 8.6.2 UDS — record views are never offline; tabs scope off page layout

Per user correction and decision, 2026-09-03. A **UDS is a `U5` table**, and it
can be either **a standalone record view** or **a child tab** on a parent
screen. The two get opposite answers, and the split is **locked, not deferred**:

| UDS shape | Offline | Basis |
| --- | --- | --- |
| **record view** (standalone destination) | **never — permanently `server-only`** | user decision, 2026-09-03 |
| **child tab** | **yes, iff the tab is present in the resolved page layout** for that work order — and then its rows traverse **indefinitely**, as part of the record's offline footprint | user decision, 2026-09-03 |

### The tab rule is the important half: layout *is* the scope declaration

*"If the tab is present in the page layout for a work order, defining its scope
in the traversed state indefinitely."*

So the UDS traversal edge set is **not an independent configuration artifact** —
it is **derived from page layout**, which is already Tier 0 `0c`: fetched inside
the login round-trip, persisted, versioned per domain, exempt from eviction. And
because layout resolves on `PLO_PAGENAME × PLO_USERGROUP × PLO_WOTYPE`, **the
UDS edge set is per WO Type** — a BRKD work order may traverse two UDS tabs
while a PM traverses none.

**This is §2.3's own argument extended one hop.** §2.3 puts layout first
because *"layout tells you what else you need"* — resolve it and you know which
code domains, status domains and custom-field definitions matter, which is what
keeps `0f` small. The same sentence now also reads: **resolve layout and you
know which UDS edges traverse.** Not a new principle, a new application of the
one already locked — and the reason the concern below is smaller than it looked.

### What this walks back

§8.5 called a customer-variable edge set the worst case, and an earlier draft of
this section said the closure cap therefore becomes the primary defence.
**Both are softened:**

- The edge set is still customer-authored, but it is **bounded by page layout**
  rather than by "however many UDSs exist." A UDS nobody placed costs nothing.
- It needs **no new Tier 0 artifact and no new version stamp** — it rides the
  layout bundle that has to arrive first anyway. §20's undefined Tier 0
  bootstrap contract does not grow a line for it.
- So the closure cap returns to being a **safety net**, not the primary defence.
  The primary defence is that **placement is deliberate**.

### What still stands

**Retraction 1 — "one edge, not one per UDS" — stays retracted.** The parent↔
child join is **authored per UDS** (its PKs mapped as FKs to the parent), so
there is one edge per *placed* UDS tab, with join columns read from that UDS's
mapping. The *mechanism* stays generic — read the declared mapping and traverse
it — so §27.3's "one generic definition-driven renderer, never a screen per UDS"
holds at the sync layer too.

**Retraction 2 — the write form — stays retracted.** A `U5` table has real,
customer-defined columns, not EAV rows, so the outbox needs a **generic
row-shaped envelope** (`table + primary key + column/value map`), not
`(entity, record, field, value)`. §27.5's "the write path has no shape" is
**narrowed, not closed**: shape known, build unspecified.

**Two guards remain required:**

1. **A per-UDS row cap.** A `U5` child tab is a real table, so rows-per-parent
   is unbounded by construction. Layout bounds the *number of edges*, not the
   *rows behind one edge*. Same shape as §8.1's per-entity caps, applied per UDS.
2. **Authoring-time FK-mapping validation** — does the mapped column exist, is
   it indexed, is cardinality bounded, is the join single-column or composite.
   Same shape as §20's existing *"workflow-eligibility validation in Screen
   Designer"* item.

**And guard 2 now has an obvious home, which changes the stakes of a control
nobody has built.** §20 tracks *"Screen Designer has no Placement control for
the More group"* as authoring debt. Under this rule, **placing a UDS tab is
placing a sync edge** — the Placement control is where the offline footprint is
decided, so it is where the row cap and FK validation warnings belong. That
promotes it from cosmetic-adjacent debt to the surface that governs device
payload.

### The re-type mirror case — new, and it is §20's existing item from the other side

§13.5 makes WO Type editable pre-Start-Work with an immediate re-render, and
§20 already tracks *"re-typing a pre-start WO that already has data behind a
disappearing tab."* Layout-derived UDS edges create the **mirror**: re-typing
can **add** a UDS tab whose rows were never traversed.

That produces a genuinely ambiguous empty tab, and the ambiguity is the point:

- **no rows exist server-side** — a legitimately empty UDS tab; or
- **rows exist but were not traversed** — because the tab was not in the layout
  at sync time.

The device cannot tell these apart from local state alone. **So this is the
sharpest justification for §8.6.4's not-hydrated affordance:** without it, an
empty UDS tab after a re-type is indistinguishable from a correct empty one, and
the technician has no way to know whether to trust it. File it against §20's
existing re-type entry rather than as a new item — same rule, opposite direction.

### Record views: what "never offline" actually settles

**It closes §20's *"UDS standalone screens — scope call not taken."*** §27.2
*recommended* tabs-only and deferred standalone UDS on cost grounds — nav slot
(§26.3) plus a §8.3 List Search Screen plus, under Options 2/3, an index
projection over entirely customer-defined columns. **That is now a decision
rather than a recommendation, and on a cleaner basis:** not "expensive," but
"never offline." Rewrite §27.2 accordingly; do not leave it reading as deferred.

Three consequences:

1. **The expensive part evaporates.** `server-only` means **no index
   projection at all** — the hardest of §27.2's three costs disappears rather
   than being deferred. A standalone UDS can still exist as an **online-only
   destination** with a nav slot and an online-only list; that is a normal
   `server-only` policy row in §8's registry, not an exception.
2. **§8.4 gains rows.** Opening a standalone UDS destination offline is
   `blocked-visible` — present, disabled, with a reason. **Not
   `blocked-hidden`:** a nav destination that silently vanishes offline is
   exactly §8.4's "indistinguishable from a configuration error" failure, and
   §5.8 shows that complaint already exists against the shipped product.
3. **It is expressible under Option 1 and awkward under Option 3.** A
   permanently server-only, online-only screen is a first-class policy row when
   the architecture is online-first. Under §2.1 as currently locked — *"UI
   always reads from local DB, never waits for network"* — such a screen is an
   architectural violation rather than a configuration choice. A small point,
   but it is one more place the online-first re-frame makes a decision sayable
   that the current spec cannot state cleanly.

### `definition-gated` at tab grain, now precise

Two distinct `0c` artifacts have to arrive for a placed UDS tab to render:

- **placement** — the tab's row in the page layout (§12 tier 2), and
- **definition** — the UDS's own field list, which §27.3's generic renderer
  consumes.

If layout arrived, placement arrived. **The definition is a separate row and can
still be missing**, and a placed tab with no definition is §2.3's blank screen,
not a shorter one. So `definition-gated` survives at tab grain — just narrowed
to the definition, not the placement.

### 8.6.3 Custom Fields (§22) — RESOLVED: a separate values table

§22 defines Custom Fields as *"admin-defined fields per record Class + Class
Org, scoped to Record View only"*, and explicitly states they are **not** the
same mechanic as a UDS. They are also **not** UDFs: UDFs are per **master
function** and identical across clones (§8.6.1), whereas Custom Fields are
scoped per **Class + Class Org**. Three mechanisms, not two.

**Resolved 2026-09-03 (user direction): Custom Field values live in a separate
values table**, keyed by `(entity, record key, field code)`. So Custom Fields
are the **middle** case of the three, and — usefully — they are the mechanism
the retracted §8.6 was accidentally describing:

- **One traversal edge, with a fixed systematic key.** Unlike UDS (§8.6.2), the
  join is **product-known**, not authored per definition. So this edge is
  product-declared and belongs in §8.5's fixed core, **not** in the
  configuration-supplied extension set. It is the cheap kind of child edge.
- **The generic EAV outbox write form is correct here** —
  `(entity, record key, field code, value)`. **That form was wrong for UDS and
  is right for Custom Fields**, which is precisely why the two must not share
  an implementation at the sync layer any more than they do in the UI (§22).
  Net: the outbox needs **two** generic write shapes, not one — an EAV form for
  Custom Fields, and a row-shaped envelope for UDS.
- **Cardinality is known from the key:** one row per
  `(record, field code)`, so a Custom Field edit is a **field-edit** conflict
  under §10 — detect, surface both values, let the technician choose. No
  insert-shape ambiguity, unlike the open UDS cardinality question.
- **§8.5's Work Order declaration now closes.** All three mechanisms are
  placed: UDFs need no edge, Custom Fields take one product-declared edge, UDS
  takes one configuration-declared edge per UDS.

**And §8.3 row 3's Class rule stands, now with its full consequence visible.**
The offline-pickable **Class** set is bounded by which Custom Field
*definitions* shipped in `0c` — but note that with values in a separate table
there are now **two** independent ways a Class can misbehave offline: the
*definitions* did not ship (row 3 — the Class should not be pickable), or the
*values* did not traverse (§8.6.4 — the fields render and need connectivity).
**Same screen, two different failures, two different messages.** That is the
strongest single illustration of why not-hydrated and definition-gated have to
stay separate states.

### 8.6.4 What survives from the retracted version — both option-comparison findings

Neither finding depended on the storage detail, so both stand:

**1. The un-populatable child tab is an exposure that scales with the stub
count.** It is a function of **hydration state**, not storage shape. §8.5 gives
a Tier-4 ephemeral row **no traversal**, so it has no children of any kind —
open one offline and every child tab is unpopulated, UDS included.

| | Rows that can show an unpopulated child tab | Exposure |
| --- | --- | --- |
| **Option 1** | a Tier-4 ephemeral row opened after losing connectivity; swept ~24h | narrow, self-limiting |
| **Options 2 / 3** | **every `stub` in the index** — tens of thousands, permanently, by design | broad, permanent |

And the owed affordance is **generic, not UDS-specific**: all eight child tabs
need *"not hydrated — connect to load,"* which makes it a shared component
rather than an exception. Pair it with §8.5's unresolved-reference field state:
one design pass, two grains. Keep it **distinct from `definition-gated`** —
definition-gated means the tab **should not render**; not-hydrated means it
renders and **says it needs connectivity**. Conflating them reports a
configuration error as a sync problem.

**2. "Can a dataspy select a UDS field?" is easier under Option 1.** A `U5`
table joined via declared FKs is joinable **server-side**, so under Option 1
this becomes a base-EAM dataspy-capability question rather than a mobile
index-projection question. Under Options 2/3 it stays a flat **no** — `wo_index`
is one flat table and UDS data is confirmed to live in another — which §27.5
requires be *stated* rather than discovered by a customer who triages on a UDS
field.

Both rows are in §6.1's scoring, and both favour Option 1.

---

## 8.7 Is offline a master switch? — grain, and the trade-offs in detail

Opened 2026-09-03 at user direction, prompted by §8.2's finding that in
Dynamics 365 an admin **enables offline per app and attaches a profile**, and
that doing so changes behaviour even when connected. So yes — in the market,
offline is a switch. The question is whether this app should have one, at what
grain, and what it costs.

### The market precedent, and this product's own

| Product | The switch | Grain |
| --- | --- | --- |
| **D365 / Power Apps** | app is *enabled for offline*, with an **offline profile** attached; without a profile there is no offline | per app, then per profile→user assignment |
| **Salesforce** | a **Briefcase** is assigned to users/profiles; no briefcase = no offline records | per briefcase assignment |
| **ServiceMax** | Download Criteria on a **Mobile Configuration** record | per mobile config |
| **Maximo Mobile** | **no switch at all** — automatic online/offline switching | none |
| **HxGN EAM Mobile Offline (today)** | **`BCBGIS` interface permission** gates GIS entirely — *"the ESRI map functionality and GIS sync can be turned OFF for the user by simply removing 'Query' permissions"*; and the per-map **Offline** switch (§5.3) | per user group (GIS), per map (maps) |

**So this product already ships a master switch — for GIS, at user-group
grain, implemented as a permission.** That is the precedent to reason from, not
a hypothetical.

### First, decompose it — "offline" is three capabilities, not one

The single most important move in this section. A boolean "offline on/off"
conflates three things that should not switch together:

| Layer | Switchable? | Why |
| --- | --- | --- |
| **Tier 0 — bootstrap configuration** | **No. Always persisted.** | Kilobytes, and it is what lets the app paint a screen at launch. §2.3 makes it eviction-exempt precisely so every launch boots from last-known-good. An "offline-disabled" user still benefits — faster launch, and a survivable blip. Switching it off buys nothing and costs the one legitimate hard failure (§2.3 consequence 2) on every cold start. |
| **The outbox — durable write queue** | **No. Always on.** | This is the load-bearing call. The outbox delivers **R6 / transaction confidence**, and that is a *High* VoC theme in its own right — *"work is lost if connectivity drops during save; users cannot tell whether a transaction actually landed."* **That failure happens at full connectivity**, mid-request, on a flaky cell connection. An always-on outbox is not an offline feature; it is a reliability feature that offline also happens to need. Turning it off would mean a **second error-handling UX** — inline synchronous errors instead of §4.4's trouble-field banner and §4.5's Sync Status Screen — i.e. two designs, two test matrices, for no gain. |
| **Record replication — the read cache (Tiers 1–3)** | **Yes. This is the switch.** | It is the only layer with real cost: device storage, sync volume, data-at-rest exposure, basemap credits. |

**So the "master switch" governs replication only.** Everything the SWG asked
for around trust and reliability sits in the two non-switchable layers, which
means the switch cannot degrade the product's core promise no matter how it is
set.

### Second, it should not be a boolean — it should be profile assignment

Every enterprise product above expresses it the same way: **offline is the
presence of an assigned profile, and its absence is the off state.** No flag.

That maps exactly onto this project's existing paradigm and needs no new
concept:

- §26.5 establishes **User Group Setup as a *binding* screen** — assignment
  only, never definition, and *"assign is not copy"* (§26.5.1).
- The thing being assigned already has to exist: §8's **entity policy
  registry**, §8.1's **caps**, §8.3's lookup classes, the **index scope**
  (§6.13), and the **Sync Config** that already scopes Tier 1.

**Recommendation: an "offline profile" is a named bundle of exactly those, and
User Group Setup gains a tab that assigns one — or none.** "None" is the master
off switch, and it required no boolean. Reuses §26 wholesale.

### Grain — where the switch should live

| Grain | Verdict |
| --- | --- |
| **Product / app** (two apps, as today) | **No.** This is the disease. SWG's *"two separate mobile apps"* is a High theme, and Digital Work being online-maps-only while Mobile Offline does both (§5.4) is the cleanest instance of it. |
| **Tenant / install parameter** | **No** as the only grain — too coarse for a customer with both plant technicians and contractors. Reasonable as a *default* that groups inherit, which is how `MOBGOFFL` already behaves for maps. |
| **User group** | **Yes — the primary grain.** Matches §26 for layout, nav slots and dataspies; matches the existing `BCBGIS` precedent; and it is where the entity policy and caps naturally get assigned. |
| **User** | **Override only, not the primary grain.** §2.6's punch-list Option A already contemplates group-level with per-user override, so the pattern exists. Making it primary invites assignment sprawl. |
| **Device / install** | **Yes, as a second axis** — and this is the one that earns its keep. See BYOD below. Note §5.2's shared-basemap feature already acknowledges multiple users per device. |
| **Entity** | Already the plan — §8's registry. Not a master switch; the contents of one. |
| **Record** | Already the plan — R5 manual pinning. |
| **Map area** | Already shipping, per map (§5.3). Independent engine, stays independent. |

### The argument that makes a switch genuinely valuable: Contractor / BYOD

§7.8 of the leadership review calls Contractor/BYOD *"the one SWG theme the
architecture does not answer"* — organisations cannot force app installs on
contractor-owned devices, and browser-native access is preferred but not
deliverable because the offline model requires native (§2.2).

**A replication switch does not deliver a browser, but it substantially narrows
the gap, and nothing else on the table does:**

- A contractor installs the same native app and is assigned **no offline
  profile** → they are an **online-only user of the one unified app**. One app,
  one component system, one standard model — the SWG's actual ask.
- **No customer data at rest on an unmanaged device**, which is usually the
  real objection behind "we can't manage contractor devices" rather than the
  install itself.
- It reframes §7.8 from *"we cannot answer this theme"* to *"we answer it for
  reads and writes but not for the install"* — a materially better position to
  present, and honest.

**This is the strongest single argument for the switch**, and it was not in
§7.8's analysis. It also explains why **device grain matters**: the same human
may be a replicating user on a company phone and an online-only user on their
own, so the effective policy is `min(group policy, device policy)`.

### The other arguments for

- **Data-at-rest compliance.** Some customers will not permit replicated
  records on devices. Today the answer is "do not deploy the app." With a
  switch it is "deploy it online-only" — the difference between a lost
  deployment and a constrained one.
- **Cost.** Offline basemap tiles are ESRI **premium content billed in
  credits per download**, capped at 100,000 tiles on ArcGIS Online (§5.11). A
  customer may want offline for 40 field crews and not for 400 office users.
- **Staged rollout.** Enable per group as the entity scope and caps are
  validated, instead of all-or-nothing.
- **Support triage.** *"Turn replication off for this user while we
  investigate"* is a real and currently unavailable step.
- **It bounds the blast radius of a bad profile.** §8.1's caps and §8.6.2's
  UDS placement both let an admin inflate every device's payload. A per-group
  assignment means a mistake affects one group.

### The arguments against, and the mitigations

| Concern | Assessment |
| --- | --- |
| **"It is a mode by another name"** — SWG says *"not a mode choice and not an app choice"* | **The line is who sets it and when.** A technician toggling connectivity mid-shift is a mode and is rejected (§6, Option 4). An **admin-provisioned capability, invisible to the technician, fixed for the session** is provisioning — the same category as which nav slots or dataspies they get. State this explicitly, because it *will* be challenged: **the switch changes what the app can do for that user, never what it does from moment to moment.** |
| **Two code paths, two test matrices** | Real, and the honest cost. Every screen must work with and without a local read cache. **Option 1 reduces this to near zero** — see below. |
| **The Microsoft failure mode: the switch degrades the online path** | Documented (§8.2): enabling offline disables grid column filtering *even when connected*. Avoidable, but only by keeping the server the primary read path. Again: Option 1. |
| **Partial states are confusing** | Replication off + an offline-enabled map is coherent (separate engines, §5.2) but must be *representable*. §4.5's Sync Status Screen has to show two channels with different capabilities. |
| **Support burden of "why can't I do this?"** | Mitigated by §8.4's `substituted`/`blocked-visible` states, which already require a stated reason rather than a silent absence. |

### The asymmetry that matters: this switch is nearly free under Option 1 and near-incoherent under Option 3

**Under Option 1 (online-first):** the server is the primary read path and the
local store is a fallback. Turning replication off **removes a fallback**.
Every screen already has a server path because that is the default path. The
switch costs a conditional on "is there a cache to try first."

**Under Option 3 (the current spec):** §2.1 locks *"UI always reads from local
DB — never waits for network."* If replication is off, **there is nothing to
read from.** Delivering the switch would require building a **second, parallel
read path** through every screen — precisely the two-code-path cost above, at
full price, and in direct contradiction of the locked rule.

**So a capability the customer is very likely to ask for — and the only
credible answer to the one unanswered SWG theme — is cheap under the
recommended option and structurally hard under the current spec.** Add it to
§6.1's scoring.

### What an online-only user actually loses — enumerate it, do not discover it

Given the decomposition above, a user with no offline profile keeps more than
might be assumed:

**Keeps:** Tier 0 config and fast launch; the **outbox** and therefore R6's
trouble-field banner and Sync Status Screen; every screen; full-fidelity
server-side dataspies and search (which under Option 1 is the *normal* path, so
**search is not degraded at all**); GIS per its own independent switch.

**Loses:** the guaranteed-offline work set (Tier 1); manual "keep this offline"
(R5); cached-scope search when there is no connection; Tier-3 demand caching;
and offline resilience for reads generally — a tunnel or basement means the
read path is unavailable.

### One real design consequence: the sync control's vocabulary changes meaning

§4.4.1's control has four states — Synced / Offline / Syncing / Error. For a
**replicating** user, "Offline" means *"working from the device, writes are
queued."* For an **online-only** user the same word means *"you cannot load
work right now."* **Same icon, opposite promise.**

That is not a labelling nit — it is the difference between a reassurance and a
warning, and §4.4 exists specifically to make sync state honest. **Owed:** a
distinct state, or distinct copy, for the online-only case. Cheap to design,
easy to miss, and it is the only place the switch is visible to the technician
at all — which is the correct amount of visible.

### Open items this section creates

1. **Where the offline profile is authored**, as distinct from assigned. §26's
   split says definition and assignment are different surfaces; the registry,
   caps and index scope have no authoring home yet (§20 already tracks the
   index scope's shape as undefined). This is the same gap seen from a new angle.
2. **Device-grain policy has no mechanism.** Group grain is §26; device grain is
   not modelled anywhere, and `min(group, device)` needs somewhere to live.
   Note the existing app already stores per-user-per-device map extent
   overrides (§5.5), so device-scoped settings are not unprecedented.
3. **Does the switch gate the GIS replica too, or only EAM records?** Today
   `BCBGIS` gates GIS independently. Recommend keeping them independent —
   different engines, different storage profiles, different cost models — but it
   should be a stated decision, because "offline is off but the map replicated
   400 MB" is a support call waiting to happen.
4. **The online-only sync state** above.

---

## 9. GIS architecture consequences

Given §5, the shape is largely determined. What is left to decide is scope, and
where the seams sit.

**Settled by the product, not by us:**

- ESRI ArcGIS. **Sync-enabled feature services** (not map services) for mobile;
  tiled basemap service with tile-cache export enabled; single (not composite)
  geocoding locators for offline address search.
- `GISOBJID` (+ `UPDATE_COUNT`) on every integrated layer is the EAM ↔ GIS join.
- Two sync engines, two error surfaces (§5.2).
- Per-map-area offline replica lifecycle, with the offline→online pending-edit
  interlock (§5.3).
- Editing — attributes, geometry, feature creation, equipment creation from a
  feature — is in scope if parity matters (§5.1). Delete is not implemented.
- ArcGIS network analysis is unavailable; graph work rides replicated EAM
  tables (§5.6).

**Open, and this brief cannot settle them:**

1. **Parity scope for v1.** Full Map View parity is a large surface: features,
   geometry, nonconformities, Search Around, Main Isolation, WO list, layer
   visibility, radius settings, I-Am-Here, create-features. **Which subset is
   v1?** Recommend: display + select + WO/equipment tap-through + Search Around
   in v1; feature/geometry editing and Main Isolation in a second wave, since
   each drags in the replica write path and its own conflict surface.
2. **React Native + ArcGIS.** ArcGIS Maps SDK ships first-party native iOS /
   Android / .NET / Qt SDKs and a JS API; **React Native is not first-party.**
   The existing app is built against the ArcGIS Runtime iOS SDK. If RN is the
   target and offline maps are in scope, budget a **custom native module**.
   This is a platform-choice input, not a detail — and it may be the single
   largest unpriced item on the list.
3. **R2's "and other map services like OpenStreetMap."** Nothing in the product
   supports this. Two readings: (a) a *basemap* alternative — feasible via
   MapLibre + PMTiles/MBTiles, and it sidesteps ESRI basemap credits (§5.11);
   or (b) a full non-ESRI feature/edit pipeline — which is a second GIS
   integration, not a basemap swap. **Which reading is meant needs
   confirming**; the cost difference is roughly an order of magnitude.
4. **Where the map is *placed* (R3).** Screen Designer needs a map concept it
   does not have. Likely both: a **location field type** (mini-map on a record
   view — the product already has "Highlight on Map" from WO, Equipment, the
   WO Equipment tab and the Checklist tab's Locate From/To Point) and a **map
   tab**. The tab is the same generic definition-driven renderer §27.3 already
   owes for UDS — shared work, not new work.
5. **GIS identity in Tier 0** (§5.9), including the OIDC/OAuth2 collision.
6. **`GISMAPS` resolves per org/dept, the rest of the app per user group**
   (§5.10).
7. **Basemap extent, zoom levels, credits and storage** as a single coupled
   budget (§5.11) — the real answer to "why did the old app fill the device."

**One thing NOT to do:** route GIS feature edits through the EAM outbox. The
replica has its own sync, its own conflict model, its own server-side
reconcile. Keep the seam where ESRI put it, and represent **both** channels in
the Sync Status Screen rather than pretending there is one.

---

## 10. Requirements 5 and 6 — what is already there, and the two real holes

### R5 is ~80% already specified

- **`pinned` is already orthogonal to `hydration`** (locked, §6.13) — exactly
  the hook manual caching needs.
- **"No blocking modal on launch"** is locked (§3.4/§4.1), and the product's own
  GIS download already uses a non-modal bottom progress bar.
- The product already has the two shapes R5 describes: **pre-designated**
  download (install-parameter extent/layers) and **user-initiated** download
  (draw a new extent, pick layers, sync).

Owed, and small: a **"keep offline"** control on the record header ellipsis;
the download surfacing as a non-modal progress item in the existing Sync Status
Screen; and a **device-storage view** so a technician can see and reclaim what
they have pinned — the product's `Clear Files` is the blunt version of this.

### R6 has a genuine contradiction — fix it regardless of the option chosen

§2.5 says *"conflicts resolved last-write-wins by timestamp."* **LWW is
silently lossy.** If the server wrote last, the technician's edit is discarded
and there is no discrepancy left to surface — which is precisely the failure
mode R6 asks to eliminate, and precisely the *"did my transaction actually
land?"* trust problem the product exists to fix (leadership review §2).

Proposed replacement: conflict handling **per write shape**, not one global
rule. Over §8's enumerated write-enabled set this is four rules, not sixty:

| Write shape | Rule |
| --- | --- |
| status / step transitions | a state machine, not a value → **reject and surface**; never LWW |
| field edits on a hydrated record | detect, surface both values, let the technician choose |
| comments / attachments | append-only → cannot conflict |
| labor bookings / part issues | inserts → idempotency UUID already covers it |
| GIS feature edits | ESRI replica sync → **its own** surface, not the EAM outbox (§9) |

The product's **Error Log / Pending Log** pair, with counts surfaced on screen
entry, is a good precedent for the EAM side — and §4.4's trouble-field banner
plus §4.5's Sync Status Screen are already the right home. What is missing is
not the surface; it is the guarantee that a write reaches the surface at all
instead of being dropped by LWW.

---

## 11. What each option closes in `design-decisions-v3-1.md` §20

| §20 item | Opt 1 | Opt 2 | Opt 3 |
| --- | --- | --- | --- |
| `Indexed` flag's authoring grain | closed | closed | open |
| `Indexed` has no Screen Designer control | closed | closed | open |
| Dataspy criteria need a normalised on-device form | closed | closed | open |
| Configured index scope has no defined shape | closed | **partly — §5.5 supplies the axis** | partly |
| Both projection numbers provisional | index number closed | index number closed | open |
| Per-dataspy membership shipping may not scale | closed | closed | open |
| Offline-search surfacing needs dev involvement | closed (no stub state) | open | open |
| Punch-list mechanism A vs. B | **§5.7 is new evidence for B** | same | same |
| Tier 0 bootstrap-config contract | +GIS identity domain (§5.9) | same | same |
| Write path gated on status authorizations | unchanged | unchanged | unchanged |
| Contractor / BYOD | native still required — see below | same | same |

**On Contractor/BYOD:** Option 1 retires **one** of §2.2's four native-forcing
reasons (WatermelonDB's web adapter lacking FTS5 — work-set-scoped search does
not need FTS5 at scale). It does **not** flip the decision: the load-bearing
reasons are Background Sync on Safari and iOS storage durability, both about
**writes**, which every option keeps. And GIS adds a **fifth** reason —
ArcGIS Runtime offline maps are native. Net: native is more firmly required
than before, for a different reason than before.

---

## 12. Sources

Repo:
- `docs/design-decisions-v3-1.md` — §2 (architecture), §6.13 (search), §8.3,
  §20 (open), §21 (superseded), §27.5 (UDS offline)
- `docs/EAM-Dev-Leadership-Review-2026-08-25.md` — §2 (VoC), §2.1 (search
  sub-themes), §3 P1/P2, §6 (backend asks), §6.1 (punch list), §7.8
- `docs/EAM-DESIGN-Pinning-Enhancement-v1.md`

HxGN EAM functional briefs (supplied 2026-09-03, external to this repo):
- `Functional - Base/HxGN EAM GIS.docx`
- `Functional - Mobile/HxGN EAM Mobile Offline GIS Map View Features.docx`
- `Functional - Mobile/HxGN EAM Mobile Offline Configuring GIS Map View.docx`
- `Functional - Mobile/HxGN EAM Mobile Offline Map View Main Isolation.docx`

Not yet read, and likely relevant to this decision:
- `Functional - Mobile/HxGN EAM Mobile Connected-Disconnected.docx`
- `Functional - Mobile/HxGN EAM Mobile Offline OIDC Configuration.docx`
- `Functional - Mobile/HxGN EAM Digital Work.docx`

---

## 13. Roll-up instructions (execute when the decision is taken, then retire this file)

Per CLAUDE.md's *one fact, one home* rule, this file must not outlive the
decision. On resolution:

**Under any option:**
1. Rewrite **§2.1** for the chosen read-path polarity. This is required even
   for Option 3.
2. Replace **§2.5**'s last-write-wins row with §10's per-shape conflict table.
   Add the write-enabled entity set to §2.4.
3. Add §8's **per-entity offline policy** table to §2 as a new subsection. It
   is the load-bearing new rule, and it is what other apps reuse. Attach
   §8.1's caps to it as **enforced limits**, not guidance: a device-wide record
   ceiling, a per-entity row cap, a traversal depth/breadth cap counting
   transitive relationships, filters permitted on indexed columns only, ≥1
   filter per entity with "all records" refused, and an explicit
   offline-incapable entity list enforced at authoring time.
4. **Add §8.3's three-way lookup split** (`replicated` / `reachable` /
   `definition-gated`) to §2 beside the entity registry — **accepted
   2026-09-03, so it rolls up regardless of which option wins.** Three
   knock-on edits it requires elsewhere, because each member of row 3 is an
   existing locked rule that now inherits a guard:
   - **§13.5** (WO Type re-resolves layout): the pre-start Type LOV is bounded
     by which layouts + workflow rows shipped.
   - **§26.8** (Equipment system type): Insert Mode's pill is bounded by which
     of the four `PLO_PAGENAME` layouts shipped — and it is Protected
     afterwards, so an omission is unrecoverable from mobile.
   - **§22** (Custom Fields): the offline-pickable Class set is bounded by
     which custom-field *definitions* shipped, not which Class *values* did.
   State the `definition-gated` rule **once** in §2 — *"a value whose selection
   re-resolves configuration is offline-selectable only if that configuration is
   present"* — so those three inherit it rather than each inventing a guard.
   Also add row 2's **announce-the-scope** obligation next to §6.13's existing
   "showing 412 of ~9,000" invariant; they are the same rule at two grains.
5. **Add §8.4's per-action offline capability model** to §2, and with it the
   **resolution of the §2.1 tension**: the deferrability test, the four states,
   and `blocked-visible` as the default for anything blocked. Record explicitly
   that §2.1 **holds as the rule** and visible narrowing is a *named exception*,
   with §5.3's GIS replica interlock as its first and unavoidable member. Note
   in §20 that the list itself is **product-declared and versioned with the
   app — deliberately not a Screen Designer control** (Screen Designer already
   owes three unbuilt controls; a fourth nobody should edit would be a mistake).
6. **Add §8.4's third one-way door to §20's conditional-field-rules entry**:
   `resolveFieldState(field, context)` must be evaluable **entirely on-device**,
   or field-level conditions cannot ship offline. Server-evaluated conditions
   silently do not apply offline, which lands in §2.3 consequence 3's failure
   mode through a different door. Cheap to state now, expensive to retrofit —
   and it does not require picking a tier, so it does not violate §20's
   "don't spend design time picking a tier" instruction.
7. **Add §8.5's reachability traversal rule to §2.3**, and amend §2.3's Tier 1
   definition — *"fully hydrated records + children"* — to *"+ children + declared
   depth-1 references."* **Accepted 2026-09-03, so it rolls up regardless of
   which option wins**, and it is the rule that makes §8.3 row 2 and R5's manual
   cache work at all. Carry all of: the **references-are-terminal** default and
   the five termination rules; the four **roots** (work-set, manual cache,
   demand tap, and *no traversal* for Tier-4 ephemeral rows); the
   **server-side** closure assembly, citing §2.3's own "one round-trip inside
   the login wait" argument; and the first-pass **Work Order traversal
   declaration**. Three §20 entries follow:
   - **Eviction becomes refcounted** — §6.13's `!pinned && !dirty` interlock
     gains a third condition, *no other retained root references this row*.
     Owed: real refcount column vs. recomputed sweep.
   - **"Unresolved reference" is a missing field-level state**, and
     **"not hydrated" is the same gap at tab grain** (§8.6). §6.13's row-state
     vocabulary describes *records* only. **One design pass, two grains.**
   - **The parent-chain depth N and the closure cap** are the only two
     configurable *numbers* — but per §8.6.2 the **edge set is not fixed**:
     the graph is a product-declared core **plus per-UDS edges arriving in Tier
     0 `0c`**. So the closure cap is the **primary** defence, not a safety net,
     and it needs a real number rather than a principle.
   The declaration is **complete** as of 2026-09-03: UDFs need no edge, Custom
   Fields take one product-declared edge on a fixed key, UDS takes one
   configuration-declared edge per UDS.
8. **Rewrite §27.5 and extend §22 per §8.6 — and keep the three mechanisms
   separate at the sync layer, not only in the UI.** §22 already warns that
   Custom Fields and UDS "must not share an implementation"; §8.6 shows there
   are **three** mechanisms (UDF / Custom Fields / UDS), each with a different
   offline shape. Carry:
   - **§8.6.1 — UDFs are offline-complete under existing rules.** Data is
     columns on the record (no traversal, no policy row); value lists are a
     `(column, master function)` code domain into `0f`; definitions into `0c`.
     **Record the clone finding in §26.7:** UDF config is per *master function*
     and identical across clones, so the four `WSJOBS` clones share one set —
     the clone model does **not** multiply UDF config, unlike the per-clone
     label problem §20 already tracks.
   - **§8.6.2 — UDS is a `U5` table with a per-UDS authored PK→FK mapping.**
     Close §20's *"where UDS data lives"*. **Narrow, do not close,** *"the write
     path has no shape"*: the shape is a **generic row-shaped outbox envelope**
     (`table + PK + column/value map`), **not** an EAV field-value form. Add
     three new §20 guards, all now required rather than prudent: a **per-UDS
     row cap**, **authoring-time FK-mapping validation** (column exists, is
     indexed, cardinality bounded, single vs. composite join — build it
     alongside §20's existing workflow-eligibility validation), and the
     **closure cap** from item 7.
   - **Rewrite §27.2: tabs-only is now a DECISION, not a recommendation.**
     **A standalone UDS record view is never an offline option — permanently
     `server-only`** (locked 2026-09-03). That **closes** §20's *"UDS
     standalone screens — scope call not taken"*, and on a cleaner basis than
     cost: not "expensive," but "never offline." Consequences: the **index
     projection over customer-defined columns disappears entirely** rather than
     being deferred (§27.2's hardest cost); a standalone UDS may still exist as
     an **online-only destination** with a nav slot and an online-only list,
     which is an ordinary `server-only` row in §8's registry; and §8.4 gains a
     row — opening it offline is **`blocked-visible`**, never
     `blocked-hidden`, since a nav destination that silently vanishes is
     exactly §8.4's "indistinguishable from a configuration error" failure.
   - **A UDS child tab traverses iff it is placed in the resolved page
     layout** (locked 2026-09-03), and then indefinitely, as part of the
     record's offline footprint. **The edge set is therefore derived from
     layout, not an independent Tier 0 artifact** — no new bundle, no new
     version stamp, and §20's undefined bootstrap contract does not grow a line
     for it. Add this to **§2.3** as the natural extension of its own "layout
     is first because layout scopes everything after it" argument: resolve
     layout and you also know which UDS edges traverse. Because layout resolves
     per `PLO_WOTYPE`, **the UDS edge set is per WO Type.** Two knock-ons:
     the closure cap returns to being a **safety net** (placement is the real
     bound), and **Screen Designer's Placement control — already owed in §20 —
     becomes the surface that governs device payload**, so the per-UDS row cap
     and FK-mapping warnings belong there. Note in §20 that this promotes
     Placement from authoring debt to a sync-affecting control.
   - **File the re-type mirror case against §20's existing entry.** §13.5 lets
     a pre-start WO be re-typed; a layout-derived edge set means re-typing can
     **add** a UDS tab whose rows were never traversed, producing an empty tab
     the device cannot distinguish from a legitimately empty one. Same rule as
     §20's "disappearing tab" item, opposite direction — and **the sharpest
     justification for the not-hydrated affordance**, which is what makes the
     two cases distinguishable at all.
   - **`definition-gated` at tab grain is narrowed to the definition.** Two
     `0c` artifacts must arrive: the tab's **placement** (page layout, §12 tier
     2) and the UDS's **definition** (its field list, consumed by §27.3's
     renderer). If layout arrived, placement arrived; the definition is a
     separate row and can still be missing, and a placed tab with no definition
     is §2.3's blank screen.
   - **§8.6.3 — Custom Field values live in a separate values table**
     (resolved 2026-09-03), keyed `(entity, record key, field code)`. **One
     product-declared edge on a fixed key**, so it sits in §8.5's fixed core,
     not the configuration-supplied extension set. **The outbox therefore needs
     TWO generic write shapes, not one:** an **EAV form** `(entity, record key,
     field code, value)` for Custom Fields, and a **row-shaped envelope** for
     UDS. Cardinality is known from the key (one row per record + field code),
     so Custom Fields take §10's **field-edit** conflict rule with no
     ambiguity. Record in §22 that this is a *sync-layer* separation from UDS
     as well as a UI-layer one.
   - **Class now has two independent offline failure modes, and they need
     different messages:** *definitions* did not ship (§8.3 row 3 — the Class
     should not be pickable at all) vs. *values* did not traverse (§8.6.4 — the
     fields render and say they need connectivity). **Same screen, two
     failures.** This is the clearest justification for keeping
     `definition-gated` and `not-hydrated` as separate states, and it belongs
     next to that rule in §2.
   Retain, narrowed, in §20:
   - **UDS cardinality — 1:1 or 1:N per (WO, UDS)** — decides only which §10
     conflict row UDS sits on (field-edit vs. insert). **Answer before the
     write envelope is built.**
   - **whether UDS fields are governed by status authorizations** — unchanged
     by the storage answer, and now the **last** genuinely open UDS offline
     item. It is a hole in §2.3 consequence 3's write gate.
   - **"can a dataspy select a UDS field"** — re-file it. Under Option 1 it is
     a **base-EAM dataspy capability** question (the server can join), not a
     mobile index-projection question. Under Options 2/3 it stays a flat "no,"
     which must be *stated* rather than discovered.
   Also extend §8.3 row 3 / the §2 `definition-gated` rule to cover **tabs as
   well as values** — and keep it distinct from *not hydrated*:
   definition-gated means the tab **should not render**; not-hydrated means it
   renders and **says it needs connectivity**. Conflating them reports a
   configuration error as a sync problem.
9. **Add §8.7's replication-switch model.** Decompose "offline" into three
   layers and record which switch: **Tier 0 always persisted**, **the outbox
   always on** (it serves R6 / transaction confidence, which is a High VoC
   theme independent of offline — a save dropped mid-request happens at full
   connectivity), and **record replication as the only switchable layer**.
   Express it as **profile assignment, not a boolean** — a named bundle of §8's
   entity registry, §8.1's caps, §8.3's lookup classes, the §6.13 index scope
   and Sync Config, assigned on **User Group Setup** per §26.5's binding
   paradigm; **"none" is the off state.** Primary grain **user group**, with a
   **device** axis as `min(group, device)` and per-user as override only.
   Three things to carry into the leadership review as well as the spec:
   - **§7.8 is no longer unanswerable.** A contractor with no profile is an
     online-only user of the *one unified app*, with **no customer data at rest
     on an unmanaged device** — which is usually the real objection. Restate the
     theme as answered for reads and writes, unanswered for the install.
   - **The line against "it is a mode":** an admin-provisioned capability,
     invisible to the technician and fixed for the session, is provisioning —
     the same category as nav slots or dataspies. It changes what the app *can
     do* for that user, never what it does moment to moment. State it, because
     it will be challenged against SWG's *"not a mode choice."*
   - **§4.4.1's sync control changes meaning** and needs a distinct state or
     copy: for a replicating user "Offline" means *working from the device*; for
     an online-only user it means *you cannot load work*. Same icon, opposite
     promise — and the only place the switch is visible to the technician,
     which is the correct amount of visible.
   Add to §20: where the offline profile is **authored** (as opposed to
   assigned — same gap as the index scope's undefined shape), **device-grain
   policy has no mechanism** (though per-user-per-device map extent overrides
   already exist, §5.5), and **whether the switch gates the GIS replica too**
   (recommend independent, as `BCBGIS` already is, but decide it — "offline is
   off but the map replicated 400 MB" is a support call waiting to happen).
10. Open a new spec section for **GIS** (next free number) carrying §5 and §9.
   §5's contents are *facts about the existing product* and belong in the spec
   as constraints, not in a decision brief. Include §8.5's closing note that
   **GIS scopes by extent, not traversal**, and that the two meet at
   `GISOBJID` — so an asset can be reachable without being in the extent and
   vice versa, and the UI must be honest about both.
11. Extend **§20** with §9's seven open GIS items and §5.9's Tier 0 GIS identity
   domain.
12. Add §5.7's four download criteria to the punch-list entry in **§2.6** and to
   leadership review **§6.1** as evidence bearing on A vs. B. Add §8.1's
   finding that the market default is a **capped, validated** admin filter —
   Option A's shape, but only sound with the guards it currently lacks.
13. Carry §8.2's competitor evidence into **§2.3** as support for Tier 0:
    ServiceMax ships a separate **Configuration Sync**, and Maximo's offline
    inspection forms fail when their domain/reference data does not arrive.
    That is "configuration does not degrade" observed in a shipping product, at
    LOV grain, on this project's own §16 screen type.

**Option 1 or 2 additionally:**
14. Delete or re-scope §6.13's Tier 2 rows per §11's table; move every closed
    item out of §20 and record the supersession in **§21** with a pointer here.
15. Amend §2.2's native-target reasoning per §11 — one reason retired, one added.
16. Option 2 only: amend §21's two rows before adopting a fixed index
    projection, as §6.13 instructs.

**Then:** delete this file, and remove its pointer from `CLAUDE.md`.
