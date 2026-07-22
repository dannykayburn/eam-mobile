# HxGN EAM Mobile App

Design Decisions & System Reference

Version 3.1 — July 2026 — Technician Persona / Work Order Execution

| | |
| --- | --- |
| **Product** | HxGN EAM / Attune EAM — enterprise asset management |
| **First persona** | Field technician executing work orders |
| **Platform** | iOS and Android — responsive PWA |
| **Prototype files** | eam-wo-prototype-issue-parts-v1.html (Steps 1–3) · eam-book-labor-prototype-v2.html (Step 4) · eam-wo-closing-prototype-v2.html (Step 5) · eam-wo-list-prototype-v5_1.html (WO List + Search) |
| **Status** | All five workflow steps: design complete. WO List + Search: design complete (v5.1). Workflow Execution Setup (base EAM): 3 admin screens prototyped. Pending: unified five-step prototype compile, Activity Screen, WO Insert Mode, Standard Update Mode, record-view child tabs, Login, Navigation Bar, Profile, Sync Status Screen. |
| **Doc version** | v3.1 — kickoff-review updates: punch-list mechanism reframed as an open decision (Option A static sync dataspy vs. Option B PIN projection, §2.6); Workflow Execution Setup screens recorded as the known base-EAM work (§11); full outstanding mobile scope captured (§20). v3.0 added Sections 12–14 and 16. **Restructured 2026-07-15:** reordered and regrouped into an outline that follows the app's own navigation flow (Project Overview → Architecture → Design System → App Shell → Standard Model → Screen Designer admin → WO Workflow Setup → WO Workflow) instead of the order decisions were made in; folded Component Patterns into Design System; added pending stubs for Login, Navigation Bar, Profile, and a Sync Status error-resolution screen. No design decisions changed — structure only. **Consolidated same day (second pass):** removed the Key Decisions Log (§20) and the Standard Design Punch List (§5.4) — both were ~90% duplicates of per-section "locked decision" tables; survivors were folded into the section they actually govern, with an applicability tag. Genuinely open items moved to Remaining Work (now §20); reversed decisions moved to a new Superseded Design Decisions section (§21) instead of staying inline with a "superseded" note. Also pulled WO-Parts/Labor-only components (bin stock list, part header/search block, store/crew selector pill) out of the generic Component Patterns table and consolidated Book Labor's locked-decisions table down to what's actually specific to that screen — see the writing convention in project memory. **2026-07-16 batch (Standard Model tweak list, reviewed against the rebuilt Sample Screen before Equipment's rebuild started):** Organization pill now always present + protected on Record View update mode; Header Fields section renamed/expanded to hold any non-nullable field, not just Type/Priority; Insert Mode's org pill narrowed to the Record View insert standard only (List/Detail insert omits it entirely, was previously just non-required); LOV fields now default to code + description (reversed from description-only, §3.4/§3.4.1 — old rule moved to §21); Documents section built on the Record View (was locked since 2026-07-14 but never actually implemented); Comments limited to latest-3 + "View all" link with a dedicated tab, Documents given a matching dedicated tab; List/Detail row-tap decision documented (opens that record's own Record View in update mode, PK protected, not yet wired anywhere real). Plus two real bugs found and fixed: Insert Mode's z-index sat above every sheet/toast it could trigger, making them open invisibly; the tab rail's expanded-state padding never got removed after a selection (plus a follow-up centering fix and a 1px name-size bump the same day, and dropping the org pill's lock icon entirely). **New §14.8:** Comments/Documents are reachable from any WO workflow step regardless of Free Form/Not Free Form or step-gating — via the ellipsis menu already present on every step's header (its existing screen-specific-actions slot, §5.3/§8.1), not step-map rows and not new nav-row icons (an interim proposal, superseded same day) — so they never read as part of the 5-step sequence. **Equipment rebuilt same day** onto `shared/eam-shared.css`/`.js`, applying the full 2026-07-16 batch above: Header Fields = Department/Status/Class/Category/Manufacturer; Operational Status confirmed header-only (new locked row, §5.2); Comments/Documents converted from Equipment's old inline accordion to the shared excerpt+tab pattern; Costs tab folded into the same shared dataspy/search/mode state every other List/Detail tab uses (was a separate parallel set of module variables before). Surfaced and fixed one real bug in the shared library itself: `fieldRowLov`/`fieldRowEdit` (eam-shared.js) generated rows without the `id="fv-{key}-code/-desc"` / `id="fv-{key}"` attributes that `selectLov`/`openEdit`/`saveEdit`/`openDate` etc. look up by `getElementById` — every field built through those two helpers would silently never update on selection. Fixed by adding the missing ids. **Second same-day follow-up batch:** Organization pill moved out of its own section-card into the header itself — justified opposite the status button, sized down to balance it, and collapses on scroll for free (it's now inside the same `.rec-status-row` that already does that for status); Header Fields box lost its section-card-header/title entirely ("just simply there") and its plain-LOV items dropped their code, showing description only; new container required-field-count indicator — any `.fg-section`/`.section-card` with an unfilled required field inside shows an orange count badge in its own header, recounted after every field mutation, gone once fully populated (`updateRequiredBadges()` in `eam-shared.js`, generic, no per-screen config). All applied to both canonical files (Sample Screen, Equipment) and verified live. **Third same-day follow-up:** removed the header's per-record-type mini-icon block entirely (§5.3/§8.1) — Equipment's pump icon dropped from both `#recHeader` and `#listDetailHeader`; Sample Screen already had none. Description font bumped 14px→15px (was previously bumped 13px→14px on 2026-07-14) now that it has the full row width to itself. The still-not-yet-rebuilt WO-workflow files (WO Record View, Activity Checklist, Issue Parts, Book Labor, WO Closing) still carry the old icon — flagged in §5.3/§8.1 as a "remove on next touch," not a standing exception. **Fourth same-day follow-up (org pill style lock-in + a small batch):** org-pill-in-header locked to Inter/white/no-icon/outlined via a live scratchpad comparison (§5.2). Required-count badge now inserts before the chevron, not after, so every container's chevron lines up at the same fixed position regardless of whether a badge is showing (§5.2). `.rec-id-row`/`.rec-status-row-inner` left/right insets bumped 14px→16px; pin/ellipsis buttons 30px→34px (icons 16px→18px), with a compensating `margin-top:-3px` on `.rec-header-actions` and the anchored menu's `top` offset moved 36px→40px (§5.2/§5.3/§8.1 — applies everywhere the shared header component is used). Equipment-specific: Category and Manufacturer swapped in the Header Fields grid (Category now the full-width bottom field); the lifecycle Status field swapped out of Header Fields for Criticality (already 4-valued), with Status relocating to Asset Details in Criticality's old, non-required spot — a straight swap, nothing deleted. **Fifth same-day follow-up:** reversed the "Header Fields membership always means required" policy — required-ness is per-field like anywhere else, visualized with the same orange `.form-field.required` left-bar on the field's own cell (`.attr-item.required::before`). Equipment: Department + Criticality marked required (two markers), Class/Manufacturer/Category not. Sample Screen: Type + Department marked required, Priority not (its own `ALWAYS_REQUIRED_LOVS` entries for `type`/`priority` removed accordingly; Insert Mode's separate header-fields box is untouched). **Sixth same-day follow-up:** Equipment's ellipsis-menu screen-specific action changed from "View Structure Details" to "Create WO" (text/behavior only — shows a "Create/Insert Mode popup coming soon" toast, no navigation; a real Insert Mode for this isn't being built yet). Nav bar now shows the current screen's title centered (reusing the existing `.nav-title` class Sample Screen already used) — added to Equipment ("Equipment"); Sample Screen was already conformant. **Seventh same-day follow-up (real bug fix):** that centering was wrong — `flex:1` centered the title within the leftover space between `.nav-back` and `.nav-actions`, which aren't equal widths, so it read as off-center against the whole bar. Fixed by taking `.nav-title` out of flex flow (`position:absolute;left:0;right:0`) and switching `.nav` to `justify-content:space-between` for its remaining 2 children (§5.2). Applies to both canonical files automatically (shared CSS) — verified live, 0px difference between the title's and the bar's computed centers. **Eighth same-day follow-up:** comment author display fixed on both canonical files — full user description always (no more "B. Campbell"-style abbreviations), and your own comments now show `<your full description> (You)` instead of a bare "You" (§7.2). Renders via a new screen-provided `CURRENT_USER_NAME` constant (both files: `'Bruce Campbell'`); Equipment's two pre-existing seed comments renamed to "Meera Kumar"/"Jamie Martinez" to avoid colliding with that identity. Edit/Delete-vs-Copy-only gating by ownership was already correct — verified, not changed. **WO Record View rebuilt same day** onto `shared/eam-shared.css`/`.js` (§14/§15) — the third file on the shared-file architecture after Sample Screen and Equipment, and the first WO-workflow screen. Kept WO-specific chrome (step rail, bottom bar, Equipment selector card, Activities list) local to this file, matching the "generalize only once a second real consumer needs it" precedent from Comments/Documents — the step rail/bottom bar will move to `eam-shared.js` whenever Activity Checklist's own rebuild needs the same thing, not preemptively. Migrated the header, LOV/date/text-editor sheets, and Comments/Documents onto the shared components; added a Header Fields box (Type required, Priority not) with the Equipment card as its own standalone container above it per §5.2 D2's WO exception; Work Order Details' Department/Assigned To/Reported By/Problem Code converted to shared `fieldRowLov()` rows (now code+description, Department/Problem Code marked required); removed the header mini-icon and added the centered nav title ("Work Orders"), matching the rest of this session's batch. Comments/Documents render fully inline with no "latest 3" limit and no dedicated tab (§15.1/§15.3 — this screen has no tab system at all, unlike Equipment) — same shared `COMMENTS_DATA`/`DOCUMENTS_DATA` mount, just configured without `COMMENTS_EXCERPT_LIMIT`/`COMMENTS_TAB_KEY`. Two small `eam-shared.js` generalizations this required, both backward-compatible (existing screens need no changes): a screen-provided `STATUS_CLASS_MAP` for the header status button's fill colour (WO's Released/In Progress/Completed/On Hold codes aren't Equipment's Operational/Down/Standby), and optional `COMMENTS_BADGE_ID`/`DOCUMENTS_BADGE_ID` constants so a collapsible section's count badge (§15.3) tracks the live data instead of a static number. Comment authors expanded to full names ("Danny Kilburn," "Meera Kumar," "Jamie Martinez") with the same `CURRENT_USER_NAME` ("Bruce Campbell") convention as the other two files. All verified live: status colour/text update, Type badge colour/text update, required-badge appear/disappear, live comment-count badge, Edit/Delete-vs-Copy-only ownership gating, step-rail expand/collapse, bottom-bar lock/ready gating on activity selection, pin/ellipsis menu. **New shared component, same day: hyperlinked popups** (§15.5) — a full-screen slide-up-from-bottom popup for viewing a linked record, X-closes (not a back arrow) back to the screen underneath. `.hyperlink-popup` (`eam-shared.css`) + `openHyperlinkPopup(id)`/`closeHyperlinkPopup(id)` (`eam-shared.js`), reusing Insert Mode's inner header/body/footer classes for layout but its own outer class/z-index (different concept, same shell). First real use: WO Record View's Equipment card opens one showing a protected preview of the equipment record (reusing §5.3's header-minus-icon, org pill in-header, and Header Fields box so it reads as "the equipment record," with an explicit "View full equipment record — coming soon" stub rather than claiming to be the live `eam-equipment-record-view-prototype-v1.html`). **Activities section revised** (§15.2/§15.3): dropped its left icon and "N available" purple badge (Comments/Documents keep theirs — this is Activities-only, not a Standard Model change); Plus icon enlarged to match this session's other bumped icon buttons (34px); new **Edit button** — non-standard, unique to this section — opens a second hyperlinked popup that edits whichever activity is currently selected (Name + Discipline editable; Date/Code 1/Code 2 read-only), guarded with a "Select an activity to edit" toast if nothing's selected. All verified live. **Default-activity-selection rule notated same day** (§15.2): exactly one activity auto-selects at load; two or more leaves nothing selected. Fixed `eam-wo-record-view-prototype-v1.html` to match — its 2-activity demo data had been pre-selecting one at load, contradicting this rule; now computed from `ACTIVITIES.length` instead of hardcoded. Verified live: bar starts locked with 0 selected. **Step rail + bottom bar generalized, same day** (§14.1 callout) — moved out of WO Record View into `shared/eam-shared.css`/`.js` (`initStepRail()`, wired via `initSharedApp()`) now that Activity Checklist's rebuild is the 2nd real consumer; each screen still owns its own step-pill/step-name/timer-pill/step-map content and its own bar-readiness logic. Standardized `--step-rail-h` on 56px (was 48px WO Record View / 56px Activity Checklist) and fixed the same asymmetric-padding centering bug already fixed on `.tab-rail-collapsed` (§3.4) — `.step-rail-collapsed` now splits its padding symmetrically top/bottom instead of bottom-only. **Activity Checklist rebuilt same day** (§16) onto the shared architecture — mini-icon removed, header converted to the shared §8.1 pattern, nav gained the centered "Work Orders" title matching WO Record View, `showToast` calls converted to the shared one-arg signature, and Comments (3)/Documents (4) added to the ellipsis's screen-specific slot alongside Print Work Order (§14.8), as toast stubs pending the dedicated Comments/Documents screens. Prompt bar and the Instructions/Attachments info sheet stayed local — one consumer each so far. All 17 item types, groups, notes, and progress/gating logic carried over unchanged; verified live (checkbox/toggle/numeric items, required-count gating, prompt-bar reveal, info sheet, ellipsis menu, dark mode, step-map toggle). **Issue Parts rebuilt same day** (§17) — the 3rd WO-workflow screen onto the shared architecture. Header/step-rail/bottom-bar chrome converted the same way as the prior two; timer pill added (was missing, §14.2 requires it on Steps 2–4); Quick Issue All Planned Parts' border-radius fixed to a true pill (was a 10px rounded-rect, contradicting §17.6/§17.14's own spec); Comments (3)/Documents (4) added to the ellipsis per §14.8. Store/Bin/Lot LOV picking kept its own local implementation deliberately — dynamic per-sheet options and a nested-above-a-sheet stack are a genuinely different shape from the shared single-field `openLov()`, though it still reuses the shared sheet/lov-option markup and CSS, and dropped its local `filterLovOptions()` override in favor of the shared one (identical behavior). Save button kept a locked local override of the shared black-contained `.btn-save` default, per §17.13's white-contained spec. `.btn-outlined` (Component Patterns table, §3.4) gained `display:flex;align-items:center;justify-content:center;gap:7px` — Add Parts (§17.5) is its first real icon+label consumer and the rule never anticipated that layout; backward-compatible, no other consumer existed yet. Verified live: Quick Issue/Return sheet gating (Lot required only when the selected bin actually has one), Store switch re-deriving SHOWLOT live (IND-MAIN→IND-SOUTH drops the Lot row), Quick Issue All confirmation → execute flow, ad hoc part search, ellipsis menu, dark mode. **Book Labor rebuilt same day** (§18) — the 4th WO-workflow screen onto the shared architecture. Header/step-rail/bottom-bar chrome converted the same way as the prior three; the step-rail timer pill needed a new STOPPED state (gray, no pulse) since §18.2 has the WO timer stop by the time this step is reached — added as `.timer-pill.stopped`/`.timer-dot.stopped` modifiers in `eam-shared.css`, the running purple state's first real 2nd state. Add Labor/Add by Crew Save buttons switched from this screen's own local gray→green button to the shared `.insert-save-btn` (identical visual states, one less duplicate); the Correction sheet's always-ready red Save got a new `.insert-save-btn.danger-ready` modifier, also added to `eam-shared.css`. Comments (3)/Documents (4) added to the ellipsis per §14.8. Type of Hours/Employee "cycle on tap" and the crew selector pill (same pattern as Issue Parts' store selector) stayed local — no 2nd consumer for either yet. Verified live: Add Labor save-gate (locked until Employee selected), Correction sheet's always-ready red Save + 1-minute stepper, Add by Crew save-gate, ellipsis menu, dark mode. **Add Labor sheet redesigned same day** (§18.4) — Type of Hours moved to a colour-coded pill; Employee/Crew became double-wide mutually-exclusive picker cards (both cleared/optional at launch, picking one protects+clears the other and derives Department/Trade, still manually cycle-editable); Labor Details became a collapsible container delivered collapsed; the Date row became a pill (no icon) wired to the shared calendar for the first time on this screen; Start/End time became two chips joined by a duration connector, still real `<input type="time">` underneath. "Add by Crew" button removed from the main screen (its sheet stays intact but is currently unreachable — flagged, not deleted). One `eam-shared.js` generalization: `selectDate()`/`clearDate()` gained an optional per-key `DATE_ON_SELECT` hook, mirroring `LOV_ON_SELECT`, so a screen with its own required-field gating can resync after the shared calendar picks a date. **WO Closing rebuilt same day** (§19) — the 5th and last WO-workflow screen onto the shared architecture; all 5 steps are now off the old self-contained pattern. Header/step-rail/bottom-bar chrome converted the same way as the prior four (no timer pill — same as WO Record View, the WO timer already stopped by Step 4); Comments (3)/Documents (4) added to the ellipsis per §14.8, a gap this screen had that the other four didn't. Downtime Details' Date completed/hours/cost switched from this screen's own bespoke date-sheet and edit-sheet JS/CSS to the shared `openDateTime()`/`openEdit()` field-edit sheets directly (`id="fv-{key}"`) — no screen-specific date or currency/number logic left in the file. Remove-attachment's confirmation switched from its own bottom sheet to the shared centered `openConfirm()` modal (§3.4's "Centered confirmation modal" rule already covered this case, the screen just hadn't been brought in line with it); `openConfirm()` gained an optional 3rd `dangerLabel` arg for this ('Remove' instead of the default 'Delete'), backward-compatible with every existing 2-arg caller. Closing Codes' sequential-unlock 2×2 grid, the status change control (§19.2 Option D), and the inline required Closing Comments textarea all stayed local — no shared equivalent for any of the three; Closing Codes' own LOV functions were renamed `openCodeLov`/`selectCodeLov`/`clearCodeLov` (was `openLov`/`selectLov`/`clearLov` in v1) specifically so they can't shadow the shared generic LOV functions of the same name now that this file loads `eam-shared.js`. "Every container is collapsible" (§3.4) shipped as this screen's own local pattern, first real consumer — not yet ported to Equipment or the sample screen. Close Work Order now actually navigates to `eam-wo-list-prototype-v5_1.html` after the success overlay instead of leaving the overlay up indefinitely (§20 "post-close navigation") — re-running the user's default/last-run dataspy on arrival is still a gap this static prototype can't demonstrate. Verified live: step-rail two-row layout with no timer pill, ellipsis menu, sequential-unlock required-marker toggling, section-card collapse/expand (Closing Codes/Comments open by default, Downtime/Attachments collapsed), Downtime's shared date/edit sheets, bar lock/ready gating, attachment add + shared-modal remove, and the full close → overlay → WO List navigation. |

# 1. Project Context

This document captures all design decisions made during the UX/UI design phase of the HxGN EAM (Attune EAM) mobile app. It is the authoritative reference for all new chat sessions and contributing team members. The first persona focus is the field technician executing work orders.

# 2. Architecture — Progressive Offline Hydration

Core pattern agreed in a separate technical session. All UX decisions must remain consistent with these constraints.

## 2.1 Core pattern: Optimistic UI + Sync Queue

- UI always reads from local DB — never waits for network
- Writes always go through a persisted outbox regardless of connectivity
- Network state is a background concern invisible to the user

## 2.2 Local database

- WatermelonDB recommended for CMMS-style field apps
- SQLite via op-sqlite as the alternative
- Both sit underneath the UI as the sole read source

## 2.3 Hydration sequence (background, after app launch)

- Today's WOs: ~5 seconds
- Site assets: ~15 seconds
- Lookup tables: ~30 seconds
- Historical docs: ~90 seconds+
- User is practically offline-capable within 30 seconds
- **No blocking modal on launch** — progressive hydration replaces it; the app is usable immediately and fills in as each tier above completes in the background.

## 2.4 Write path — constant regardless of connectivity

- Optimistic update to local DB + outbox enqueue happen simultaneously
- UI reflects the change instantly
- Sync engine drains the outbox to the API in the background when connected

## 2.5 Reconnect / re-sync

- Outbox flushes in order with idempotency UUIDs
- Delta pull via last_synced_at cursor — server returns only changed records
- Conflicts resolved last-write-wins by timestamp

## 2.6 Related architecture extensions

**Tiered record model / offline search (concept stage, pending review).** Decouples "synced" from "visible" via four record tiers (work set / search index / demand cache / server search). The decisions that affect UX are captured in Section 6.13. Full summary: EAM-Mobile-Offline-Search-Architecture-Summary.md

**The punch list — open decision, two options.** Tier 1 (the guaranteed-offline work set) is defined by a per-user punch list of work orders. The mechanism that produces that list is deliberately undecided; two candidate options are on the table for the development kickoff:

- **Option A — Static sync dataspy.** A configured dataspy defines the punch list, set at the user-group level and overridable down to a specific user. Zero new base schema; admins already know dataspies; the security model already governs them; the server-side dataspy pre-evaluation capability (needed for Tier 2 regardless) delivers it. Trade-offs: assignment logic is re-derived in dataspy SQL per customer, there is no provenance, and nothing is reusable for the personalized home screen, supervisor views, or notifications.
- **Option B — PIN enhancement (R5PINS).** A materialized projection of all assignment sources into one table with provenance; a base-EAM enhancement with its own spec: EAM-DESIGN-Pinning-Enhancement-v1.md. Assignment is resolved once and consistently, lifecycle is automatic, and the table backs several roadmap features. Trade-offs: real base-EAM work (new table, app-layer hooks, async diff job) plus its open design decisions.

Either way, the device-side contract is identical: a WO-ID membership list arrives at sync time and stamps pinned = 1 on wo_index rows. Tiers, eviction rules, and device behavior do not change with the choice — the mobile design does not block on it.

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
| **Toast style** | Dark chip, bottom of screen, orange alert icon, 2.4s auto-dismiss, context-specific message. |
| **Bottom sheet style** | Border-radius 20px top, handle bar, header with title + close, scrollable body. Every sheet needs real bottom breathing room (~20px) below its last row — sheets with a `.sheet-footer` (Save button etc.) get this for free from the footer's own padding, but short sheets with no footer (e.g. the comment actions menu — Edit/Delete/Copy) do not, and rendered with the last row flush against the screen edge (a real bug, found and fixed). Any new short/footer-less sheet needs this padding added explicitly, not assumed. |
| **Insert Mode sheet — full-screen, not the compact bottom-sheet** | Added 2026-07-14 (§9). Insert Mode is a full form, not a value picker, so it gets its own larger surface: full-screen, slides up from the bottom over the current screen. ✕ top-left + swipe-down both discard (swipe-to-dismiss is new to this app — no other sheet uses it). "Create" title, save pill at bottom. Two content standards (Record View insert, List/Detail insert) share this shell; neither's field content is designed yet. |
| **Insert Mode's z-index must sit below every sheet/toast it can trigger** | Bug found and fixed 2026-07-16: Insert Mode was `z-index:401`, higher than `.bottom-sheet` (201), `.confirm-overlay` (260), and `.toast` (300) — so tapping a field inside Insert Mode opened its LOV/date/text-editor sheet correctly, just invisibly, behind Insert Mode's own layer. Looked exactly like "clicking does nothing." Fixed to `z-index:199` — below every transient overlay, above ordinary page content. Any future full-screen overlay needs its z-index checked against the rest of the stack, not picked in isolation. |
| **`.app` must clip its own children — `body{overflow:hidden}` is not enough** | Every closed sheet sits off-screen via `transform:translateY(100%)`, not `display:none` — it's still fully laid out in the DOM, just visually pushed below the fold. That only stays invisible if something actually clips it. `body` had `overflow:hidden` but `.app` itself did not, so the only thing preventing the whole stack of "hidden" sheets (Edit, comment actions, etc.) from being visible was the fact that the page couldn't scroll at all. A prior attempt fixed a real "content cut off with no way to reach it" bug by making `body` scrollable (`overflow-y:auto`) — which immediately backfired: it let the page scroll straight into that "hidden" stack, which is exactly the "random text area at the bottom of the prototype" bug that followed. Reverted `body` back to `overflow:hidden` and added `overflow:hidden` to `.app` itself instead. |
| **Clipping boundary must be `overflow:clip`, not `overflow:hidden`** | Superseded finding, discovered while porting the clipping fix above to `eam-equipment-record-view-prototype-v1.html` (`.app` and `.tabs-container`, the latter being Equipment's real sheet-clipping boundary since its sheets live inside `#tabsContainer`, not directly in `.app`). `overflow:hidden` clips visually but still creates a real scroll container — any `focus()` or `scrollIntoView()` call on a descendant (e.g. a field several groups down an expanded section) can programmatically move that container's own `scrollTop`, even though nothing is user-scrollable there. Since every closed bottom-sheet is `position:absolute; bottom:0` relative to that same container, a nonzero `scrollTop` desyncs the sheet's rendered position from the container's visible edge — confirmed by measurement: a closed sheet's natural (untransformed) bottom edge drifted from a correct `900` down to `242`, `379`, `461`, etc. purely from unrelated interactions elsewhere on the same screen, with no `.open` class ever toggled. `overflow:clip` clips identically but, by spec, can never become a scroll container — `scrollTop` on it is permanently pinned at `0`. Applied to both `.app` and `.tabs-container` in Equipment. The field-type reference file (`.app` only, no nested `.tabs-container`) has not been re-verified against this specific drift scenario and should get the same `overflow:clip` treatment before being trusted as the pattern source on this point. |
| **Sync panel** | Bottom sheet variant with per-item dot rows and hydration progress bars. |
| **Form field: editable** | Label left (120px, gray-4), value right (monospace, body colour), chevron right edge. |
| **Form field: protected** | Same row pattern. Gray tint background, muted value colour, lock icon instead of chevron. Not tappable. |
| **Form field: required** | Orange 3px left bar, inset from edge. |
| **LOV field: code + description** | Reversed 2026-07-16 — was "description only," see §21. Every plain LOV field (a reference-data lookup with a real list — Department, Cost Code, Assigned To, and the like) now shows code + description, always, in the field row and the LOV picker sheet. Organization is separate (§3.4.1) — code only, no description, its own pill component. Applied to `sample-screen-standard-model-prototype.html`; not yet ported to Equipment or the WO standalones (pending their own rebuild phases). |
| **System codes (Status, Type, Priority): always description-only** | Distinct, permanent carve-out from the row above — the opposite direction from Organization's code-only case. Status/Type/Priority never show a code anywhere: not in the field's own display (they render as a colour badge/button, per `BADGE_LOV_META`/`__status`, never a plain `.field-lov-value` row) and not in the LOV picker sheet either. **Bug found and fixed 2026-07-16:** the picker *list* in `eam-shared.js`'s `openLov()` was still falling through to the generic code+description branch for these keys — only the field's own post-selection display was actually intercepted (in `selectLov()`), so e.g. Type's picker was showing "Corrective Maintenance / CM" instead of just "Corrective Maintenance." Fixed with an explicit `isSystemCode` check (`key === '__status'` or `BADGE_LOV_META[key]` exists) guarding the code line's render, so this can't silently regress the way it did the first time. |
| **Field value colour** | Body colour always. Purple reserved for the timer pill, section badges, and focus states — never on field values. |
| **Save button gating** | Gray + no-cursor while required fields incomplete; green + ready when satisfied. Applies to every sheet save button. |
| **Detail grid values** | Description only for reference-data/lookup values — e.g. "Maintenance" (not "Maintenance (MAINT)"). Identifier-type codes (part/asset/employee/WO numbers) are unaffected. Applied to Equipment and all 5 WO workflow standalones. |
| **Date fields — plain numeric, never spelled-month/relative/urgency-tinted, app-wide** | Generalized 2026-07-21 from §8.3's card-scoped rule (which already locked this for WO List's dataspy cards) to every date field anywhere in the app, via `isoToDisplay()` in `eam-shared.js` — was spelled-month ("May 19, 2026"). **Corrected same day:** the numeric format itself is locale-driven, not universally "MM/DD/YYYY" — this app targets North America/Europe/Asia at minimum, and DD/MM/YYYY (Europe) / YYYY/MM/DD (parts of Asia) are real cases, not edge cases. `isoToDisplay()` currently hardcodes `'en-US'` (→ MM/DD/YYYY) as a stand-in only, since no per-user locale/session concept exists in this prototype yet — see §20, flagged for final-review accuracy, don't assume every screen showing MM/DD/YYYY today is the locked behavior for every user. Changing the function is retroactive only for values re-rendered through it (a fresh pick via the shared calendar sheet, or a screen's own render-from-data pass) — hardcoded initial-render literals baked into a screen's markup don't update themselves; see §20 for which screens still have stale literals. |
| **Time-of-day fields — always 24-hour "military," never AM/PM, regardless of locale** | Added 2026-07-21, alongside the new Time Only field type. Unlike dates (locale-driven, row above), this is a deliberate fixed business rule — not something that should follow the user's locale, since 24-hour is the standard EAM deployments enforce for technicians regardless of region. `lang="en-GB"` on every `<input type="time">` is a best-effort hint toward this, but **verified live that it doesn't reliably work**: modern Chrome renders time-input chrome off the browser's own UI language (`navigator.language`), not the page's `lang` attribute — the native picker still showed an AM/PM control in testing. Accepted as a platform limitation (same category as "desktop shows its own spinner instead of a scroll wheel," already accepted elsewhere) — the stored value and every bit of the app's own rendered text (Hours Worked, detail grids, labor rows, `saveDateTime()`'s formatted output) are always 24-hour regardless; only the native picker's own transient edit chrome is outside our control. |
| **Section card** | Consistent header (title, optionally a status/count badge where a screen calls for one) and consistent border/radius across all steps. |
| **Every container is collapsible** (added 2026-07-16) | The section-card header is the tap target (the whole row, not a separate chevron button) — toggles a `collapsed` class on the card, chevron rotates -90° when collapsed, body hides. Default open/collapsed state is a per-screen call, not a mandated universal default — required content defaulting open and optional content defaulting collapsed is a sensible starting heuristic, not a rule. Reference implementation: WO Closing's 4 section cards — Closing Codes and Closing Comments (both required) default open; Downtime Details and Attachments (both optional) default collapsed. Not yet ported to Equipment or the sample screen. |
| **Btn: contained** | White bg, dark text, 48–50px height, 100px border-radius. Hover: aqua bg, very dark text. |
| **Btn: outlined** | Transparent bg, solid border (Gray 5 / white in dark), same pill radius. Hover: aqua border + text. |
| **WO icon language** | Type/priority/status icon set per §6.7 — consistent across list, cards, chips, and filter sheets. |
| **Currency fields — display** | Every currency-typed field displays a `$` symbol, thousands separators, and 2 decimals on render (e.g. `$50,000.00`), formatted from a raw numeric value — never a bare number. Applied to Equipment's Equipment Value field and `sample-screen-standard-model-prototype.html`. |
| **Currency fields — edit input** | Researched and decided against live comma-insertion while typing (which was the initial request) — cursor-jump when a separator is inserted/removed mid-string is the standard, well-documented failure mode of live-formatting currency inputs. Locked pattern instead: raw digits + decimal point only while the field has focus (no `$`, no commas); `inputmode="decimal"` for the numeric keypad without `type=number`'s native-spinner/pasted-comma problems; empty field shows a `0.00` placeholder but stores nothing until typed; on save, format with `$` + commas + 2 decimals (`formatCurrency()`). Re-opening an existing value shows the raw stored number (never re-derives from the formatted display string). Sources: uxpatterns.dev's Currency Input Pattern, the "Clean + Format" UX pattern, Pega's Currency Input component. |
| **Number fields — no native spinner arrows** | `input[type=number]`'s native up/down spinners don't theme reliably across light/dark (a real, confirmed visual bug) — removed via `-webkit-appearance:none` / `-moz-appearance:textfield` rather than trying to reskin them. Numeric keyboard still appears; the field just no longer shows browser-chrome spin buttons. |
| **Codes render in monospace, descriptions never do** | Locked, explicit rule (previously implicit): anywhere a reference-data code is shown at all — the header's big record number, `.field-lov-code`, `.lov-option-code` — it renders in JetBrains Mono. Descriptions, at every size and every context (the header's description line, `.field-lov-desc`, `.lov-option-desc`, body field values), always render in Inter. This is independent of the §3.3.1 container-label-vs-field-label weight/size rule and independent of the §3.4.1 exception list — it's purely about which font family a code vs. a description gets, everywhere both can appear. |
| **Long-text editor sizing** | Must reliably fill nearly all available vertical space when opened — not size to content. `max-height` alone does not force a `flex:1` textarea to grow (a real bug found and fixed: the sheet was rendering at ~206px instead of using the ~850px available). Use an explicit `height`, and use a percentage rather than `vh` if the sheet lives inside any `overflow:hidden` container shorter than the viewport (Equipment's `.tabs-container` is shorter than the viewport by the nav+header+tab-rail chrome above it — a `vh`-based height overflowed that container's top edge and got the sheet's own header/controls clipped off; percentage resolves against the actual containing block and can't do that). |
| **Long-text editor: discard replaces the close button, not beside it** | When there are unsaved edits, tapping close swaps the `✕` for a red "Discard unsaved changes" pill in the same slot — never both visible at once. Typing again dismisses the pill and restores the `✕`. |
| **Sheet header layout — standardized** | Every field-edit sheet (LOV, edit/currency/number, date) uses the same 3-part header: close `✕` (left), title (centered, `flex:1;text-align:center`), Clear (right, plain text link — not a button chip, not grouped with the `✕`). Matches reference screenshots (`Downloads/Ref Shots/Field Bevaviors`) exactly. Long-text/Comments sheets are the one exception — see the row below. |
| **Clear visibility — required OR empty hides it** | Clear is hidden for two independent reasons, either one is sufficient: the field is required (set by screen design or system design — clearing a required field to empty would contradict the requirement), or the field is already empty (nothing to clear). Shown only when a field is both not-required and currently populated. Applies to LOV, edit/currency/number, and date sheets — not to long-text (see below). |
| **No Clear on textareas** | Long-text editors (and Comments, which reuses the same sheet) never get a Clear action — the user selects all and deletes manually instead, same as any native text editing. This is a deliberate exception to the "Clear on every sheet" rule above, not an oversight. |
| **No custom keyboard-toolbar mock — reverted** | An earlier pass mocked a bottom bar (emoji + mic) to represent the native OS keyboard's own toolbar row. Removed after review: with no actual keyboard present on a desktop browser, the bar reads as a broken/floating custom control rather than "the keyboard's own row" — it looked worse than showing nothing. Dictation is entirely the device keyboard's job; nothing to build for it. |
| **Inline text editing (≤255 characters)** | Short plain-text fields are edited directly in place — tap into the row, no popup/sheet at all. A floating green circular checkmark appears above the keyboard (mimicking the iOS keyboard-accessory-view pattern; colour corrected 2026-07-22 from an arbitrary blue to `var(--green)` — the FAB is only ever shown in a "ready to confirm" state, same language as `.insert-save-btn.ready`); tapping it, pressing Enter, or tapping away all commit the value and mark the form dirty. This supersedes the single-line edit sheet for plain text specifically — that sheet is still used for currency and number types on the Standard Model's own Number/Currency fields, just not text (a *different*, grid-cell-scoped Numeric/Integer field type below also skips the sheet, but that's Activity-specific so far, not a Standard Model change). Demonstrated on "User Defined Field 01" in `sample-screen-standard-model-prototype.html` ("Notes" was removed as a demo field — real Notes-type fields are textareas/long-text, not short inline text, so it was demonstrating the wrong pattern; UDF01 alone now covers this case). |
| **Inline text: label above, cursor starts left-aligned beneath it — the field's permanent shape (revised 2026-07-23)** | Was conditional on a 24-character length threshold (the row switched to this stacked layout only once typed text got long, live while typing — a `scrollWidth`/`clientWidth` live-measurement was rejected at the time as prone to oscillating once the row's own available width changed). **Now permanent** for every standalone free-text field that is NOT inside a collapsible container: label always sits on its own line, the cursor starts left-aligned underneath it — never right-justified mid-line the way a short value used to sit — and the value spans the full row width, wrapping to as many lines as needed. The field is deliberately a bit taller than a plain LOV/date row as a result, by design, not a side-effect of long content. Two exclusions (no real instance of either yet, but the rule to follow if one shows up): a genuine multi-line textarea (Comments, Closing Comments — a different component already, unaffected either way) and a same-shaped field that ends up inside a real collapsible container (chevron + `toggleSectionCard` header) — that case should keep the old conditional/compact shape instead of this one. Applied 2026-07-23 to all 5 real consumers: WO Record View's Activity Note, WO List's and Home's Insert Mode Description, Activity Checklist's item Notes, and the canonical UDF01 example in `sample-screen-standard-model-prototype.html`. `updateInlineFieldLayout()` (`eam-shared.js`) no longer toggles `.stacked` conditionally on length — the class is now written directly into each field's own markup so it's correct on first render, not just after a keystroke; Activity Checklist additionally needed an explicit `autoGrow()` call right after each item's re-render, since a pre-existing multi-line note has to size correctly immediately, not only once the user types into it again. |
| **Tap anywhere in the row, not just the value/input** | Every editable field type must be openable/focusable by tapping anywhere in its row — the label side, not just the value side. Confirmed as a real gap for inline text fields specifically: the label span and the input were separate elements, and only the input itself was tappable. Fixed via an `onclick` on the row that focuses the input. LOV/edit/date sheet rows already had this right (`onclick` on the outer `.form-field`) since the whole row opens a sheet either way. **Re-surfaced 2026-07-23 on a different field shape:** Activity's Header Fields grid cells (`.attr-item`, not `.form-field`) had the identical gap for the new Numeric/Integer inline field below — only the `<input>` itself was tappable, not the cell's label or padding. Same fix, same reasoning, just the grid-cell markup instead of a row (`onclick` added to each `.attr-item`, focusing its own `<input>`). |
| **Numeric/Integer field — inline, no popup, digits-only keyboard (new field type, added 2026-07-23)** | Distinct from the Standard Model's existing Number field (currency/number cluster above), which still opens the edit sheet — this is the shape a plain numeric/integer count gets when it lives inside a Header Fields grid cell rather than a `.form-field` row: types directly in the cell, no sheet at all, same "no popup" philosophy as inline text but for digits. `type="text" inputmode="numeric" pattern="[0-9]*"` — deliberately not `type="number"`, to skip its native spinner arrows/scientific-notation quirks (same reasoning as the Time Only field's plain-native-input choice above) while still raising the device's digits-only NUMBERS keypad; an `oninput` handler strips any non-digit as a fallback for input that doesn't honor `inputmode`. First (and so far only) real consumer: Activity Insert/Update Mode's People Required and Estimated Hours grid cells, plus the Activity identifier field itself, which converted from the old popup-based number-edit sheet to this same inline shape and dropped its now-misleading trailing chevron — there's no sheet left for it to imply. Screen-local in `eam-wo-record-view-prototype-v1.html` for now (only 1 real consumer); promote to `eam-shared.css`/`.js` on a 2nd, and the same treatment should apply to Currency whenever a grid cell needs one. |
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
| **Checkbox fields** | The entire form-field row is the tap target, not just the small checkbox box — a small isolated tap target was confirmed as suboptimal UX. Visual (22px rounded-square box, purple when checked) is unchanged. Applied to Equipment and the reference file. |
| **Dirty-state indication** | No persistent "unsaved changes" banner. Dirty tracking still exists internally (drives autosave-on-navigate, §5.1) but has no ongoing visual nag — the save-confirmation toast on navigate-away is sufficient feedback. Removed from Equipment (was the only screen that had one). |
| **Tab rail / step rail background** | Purple-tinted wash (`rgba(153,51,255,0.12)` background, `rgba(153,51,255,0.25)` bottom border, `rgba(153,51,255,0.18)` on hover) — the previous `var(--bg-card)`/`var(--bg-section)` treatment was visually identical to the content card immediately below it in light mode (zero boundary). Applied to Equipment's `.tab-rail` and all 5 WO files' `.step-rail` (same component, different class name — rename tracked separately in §20). **Colour is not always purple:** per §15.4, a Not Free Form WO workflow uses Octave Yellow (#FFF500) instead of purple for this same wash, same opacity formula — decided, not yet implemented (§20). |
| **Tab selector: only the top (collapsed) row carries the purple wash — the expanded list does not, except a lighter wash on the current row** | The wash above is meant to differentiate the persistent collapsed bar from the page, not to color the expanded dropdown. Real bug found and fixed: `.tab-map` (the expanded list) is nested inside `.tab-rail` and had no background of its own, so `.tab-rail`'s wash painted straight through every row in the list — the whole thing read as "washed the same," with no way to tell the current row apart from the rest. Fix: `.tab-map` gets an opaque `var(--bg-card)` background (reads as a normal panel), and `.tab-map-item.active` gets its own, deliberately lighter wash (`rgba(153,51,255,0.06)`, half the top bar's `0.12`) so the current-selection row is still visually marked, just not competing with the top bar. The collapsed row also got 8px added to its height as bottom padding (`.tab-rail-collapsed`), so the purple wash has a little breathing room below the icon/name/chevron before the border — previously the wash ended flush against the text with no cushion. Applied to both `sample-screen-standard-model-prototype.html` and `eam-equipment-record-view-prototype-v1.html`, and as of 2026-07-13 to all 5 WO files' `.step-rail`/`.step-map` equivalent. **Superseded 2026-07-16:** that bottom-only padding wasn't actually a safe way to add breathing room — `align-items:center` centers content within the *padded* content box, so 8px of padding on one side only shifts the centered content visibly off from the row's true visual middle. Split symmetrically to 4px top + 4px bottom (same total budget) so the row is genuinely centered, not just centered-within-its-own-lopsided-padding. Also bumped `.tab-rail-name` to 14px (was 13px, matching `.field-label`/`.section-card-title`'s general size step) for slightly more visual weight on the current tab's name specifically. |
| **Expanded tab selector: purple frame on all 3 open sides (both legs + bottom), matching the collapsed bar's own inset** | Follow-up to the row above, scoped specifically to the *expanded* state (the collapsed bar was already correct). `.tab-rail` has `14px` left/right padding that it never loses — since `.tab-map` sits inside that same padded box, its white background is naturally inset `14px` from both edges, leaving two continuous purple "leg" strips flanking the whole open list top to bottom. Compared two real variants before deciding: (a) keep the legs and add a matching `14px` purple pad at the bottom too, so the panel reads as framed in purple on all three open sides; (b) drop the legs entirely (`.tab-map` escapes the padding via a negative margin) for an edge-to-edge white panel with purple only on the collapsed bar above. **Locked: option (a).** Implementation: a `.tab-rail.expanded` class (toggled by the same click handler that opens/closes `.tab-map`) adds `padding-bottom:14px` — scoped to the open state only, via JS rather than a bare CSS rule, specifically so it doesn't leak into the collapsed row's already-correct 8px bottom padding. Applied to `sample-screen-standard-model-prototype.html`, `eam-equipment-record-view-prototype-v1.html`, and as of 2026-07-13 all 5 WO files' `.step-rail`. |

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

Decided 2026-07-16 (not yet built into any prototype — see §20). Persistent
global chrome, distinct from the per-record tab rail (§7.1) and the WO
workflow's step rail (§14.2), which both operate one level down, inside a
single record or workflow. Two elements, both driven by one piece of state
— whether the technician is **browsing** (no record open) or has a
**record open** (a Work Order or Equipment Record View, and everything
nested under it: List/Detail child tabs, WO workflow steps — engaging with
a record at any depth counts):

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
  profile avatar (§4.3) while browsing — this supersedes the app logo mark
  originally specified for WO List (§6.2) — swaps to the standard back
  button the instant a record is open. Back pops to the previous screen
  (in practice, almost always that record type's List/Search screen),
  which restores both the bottom nav bar and the avatar. Built and
  reviewed 2026-07-16: `.nav-avatar` lives in `eam-shared.css` (nav-bar
  chrome, same category as `.nav-back` — not held local pending a "2nd
  consumer" the way genuinely screen-specific content is). No runtime
  toggle function exists or is needed — no single screen is ever both
  tiers at once, so this is a static per-screen choice of which markup to
  render, not a stateful component. Record View (WO + Equipment) already
  shows the back button correctly with zero changes, since a Record View
  is never anything but "record open." **WO List's top-level nav updated
  2026-07-16** (explicit instruction, not the shallow-patch this doc
  previously guarded against — that guard was about doing this
  unprompted): its main header's `.nav-logo` is now `.nav-avatar`, CSS
  copied locally (still no `eam-shared.css`/`.js` link — the rest of the
  file stays self-contained/bespoke pending its own dedicated rebuild).
  The separate Search sub-screen's own header still shows a back button,
  not the avatar — that specific gap (§4.2 "Search" bullet below already
  documents Search as browsing-tier, avatar-only) remains open, not
  addressed by this pass.
- **`PROTOTYPE` dev watermark lives in the top-left slot, not the
  right, resolved 2026-07-21** (previously an open §20 punch-list item —
  removed from there now that it's built). It used to sit in
  `.nav-actions` next to the sync control, which crowded that corner and
  made it read as if it were part of sync status rather than an unrelated
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

## 4.3 Profile

Entry point decided 2026-07-16: the top-left slot of the per-screen nav bar
(§4.2), visible only while browsing — not a bottom-nav item. Reference:
`docs/existing_use_cases/EAM.MOBILE.REQ.Settings.doc` (legacy Mobile
Settings) — reference only; legacy Mobile's own architecture (per
`EAM.MOBILE.REQ.StandardModel.txt`) is a different, semi-connected model
from this app's offline-first design (§2), so don't carry over its
sync-config mechanics, only its screen-level scope ideas.

**Shell, locked 2026-07-16 — 100% reused, no new menu component.** Tapping
the avatar opens the exact same `.rec-actions-menu`/`.rec-actions-item`/
`.rec-actions-divider` component every record header's ellipsis already
uses (§5.3/§8.1) — same card, same row styling, same `.danger` red for the
destructive action, same generic open/closed mechanism. The only addition
is a left-anchored variant, `.rec-actions-menu.anchor-left` (`eam-shared.
css`), since the avatar sits top-left instead of an ellipsis's top-right.
`toggleRecActionsMenu`/`toggleListDetailMenu` in `eam-shared.js` were
generalized to a common `toggleActionsMenu(id)`/`closeActionsMenu(id)`
pair (existing call sites unchanged — kept as named wrappers) so Profile's
menu, and any future one, is a call to the generic pair plus its own left-
anchored markup, not a fourth bespoke toggle function. The outside-click
handler (`initHeaderMenuOutsideClick`) closes *any* open `.rec-actions-
menu` generically now too, rather than checking two hardcoded ids.
**Contents are still real placeholders** — an identity row (photo/
initials, §4.3 above + name + org — real demo data, Bruce Campbell /
Water Utility, not invented), Settings, and a red Log out. **Deliberately
no "Sync status" item** — that would duplicate the always-present sync
icon (§4.4.1), a different concern ("is my data safe" vs. "who am I /
log out") that already has its own dedicated surface; conflating the two
under one menu was considered and rejected. Actual full scope
(session/tenant display, theme preference — the external theme-toggle
noted in `CLAUDE.md` may belong here) is still undecided.

**Avatar image, locked 2026-07-16:** photo if the user has one on file,
otherwise initials — never a blank/generic silhouette placeholder. Built
in `eam-home-screen-prototype-v1.html` against the shared `.nav-avatar`
component (`eam-shared.css`): an `<img>` with the photo, `onerror`-falls
back to a same-size initials `<span>` already in the DOM. Demo photo is
`shared/img/bcampbell.jpg` (copied from
`docs/reference_screenshots/bcampbell_202509260911.jpg`), initials "BC" to
match — both represent the same demo user, Bruce Campbell, already used
elsewhere as `CURRENT_USER_NAME` (e.g. Comments authorship on WO Record
View). `object-fit:cover` + `border-radius:50%` on both the image and its
`overflow:hidden` container guarantees a circular crop regardless of the
source photo's own aspect ratio.

**Open dependency on base EAM:** initials have to come from somewhere
when there's no photo — base EAM's **User Setup** doesn't currently model
an Initials field (or a documented derivation, e.g. first-letter-of-
first-name + first-letter-of-last-name) on the user record. Needs to be
added there before this fallback can be real rather than a hardcoded
demo value.

## 4.4 Sync Status System

### 4.4.1 Sync control (nav row, top right — adaptive icon/pill, revised 2026-07-21)

The sync control is the primary sync surface, present on every screen's nav
row. **Four states, not five** — an original five-state draft (Synced/
Syncing/Offline/Pending/Error) is superseded by this section; Pending was
dropped as its own state (see "Why four, not five" below).

**Adaptive treatment, not a fixed-size icon.** The old always-32px tinted
circle was too small to read as anything but a favicon, and tinting alone
carries no information once a technician can't tell two tints apart at a
glance. Now: **Synced** renders a plain small icon-only circle
(`.sync-ctrl-dot`, 32px, green cloud-check) since it's the state that's
true almost all the time and shouldn't demand attention. Every other state
blooms into a labeled pill (`.sync-ctrl-pill`) — icon + word, border and
text tinted to the state colour — so it's legible without opening the
panel. Pill label font is Inter/`--font-sans`, matching how the rest of
the header already splits fonts: mono (`--font-mono`) is reserved for
identifiers (record numbers, org pill codes, step numbers); a state name
("Offline", "Syncing", "Error") is a word, not a code.

| State | Treatment | Meaning |
| --- | --- | --- |
| **Synced** | Green, icon-only circle, cloud-check icon | Outbox is empty; the server has confirmed everything. The resting state, true the large majority of the time. |
| **Offline** | Gray pill, cloud-off icon, "Offline" | The device cannot reach the server at all right now. Work still saves locally into the outbox — nothing is lost — but nothing can transmit because there's no connection. Can persist for seconds or hours; purely a connectivity fact, not a judgment about how much is queued. |
| **Syncing** | Purple pill, spinning refresh icon, "Syncing" | The device has a connection and the outbox has a backlog going out (or a delta pull coming in) right now. Covers everything from "just reconnected, catching up" through ordinary background sync — the technician doesn't need a finer-grained distinction than "connected and working on it." |
| **Error** | Red pill, alert icon, "Error" | At least one outbox item was attempted, retried, and still rejected by the server. The one state that demands action — routes to the Sync Panel's Review action → Sync Status Screen (§4.5). |

**Why four, not five.** The original spec also had a separate **Pending**
state ("orange, cloud-upload, reconnected — outbox flushing in order"),
distinct from Syncing ("purple, refresh, outbox draining right now"). In
practice these describe the same event — a backlog going out after
reconnecting — split only by whether it's "about to flush" or "actively
flushing," a distinction with no observable difference to a technician
watching the header. Keeping both meant the icon would flicker
orange→purple→green within a second or two of reconnecting, reading as
noise rather than information. Collapsed to: connectivity alone decides
whether a non-empty, non-error outbox reads as Offline or Syncing — one
fact, one state, no flicker. (Offline-vs-Pending, raised as the point of
confusion that triggered this review, turned out to already be the clean
distinction — connectivity yes/no. It was Pending-vs-Syncing that was
genuinely redundant.)

**Live-wired, not per-screen demo dressing.** The control reads
`syncOverallState(SYNC_DEMO_ITEMS)` (`eam-shared.js`) — `error` if any
outbox item has failed, else `offline`/`syncing` depending on the
`DEMO_ONLINE` toggle (§4.5) if the outbox is non-empty, else `synced`. A
screen opts in with one empty `<span id="syncCtrl">` in its `.nav-actions`
— `initSharedApp()` calls `renderSyncControl()` automatically, so that's
the only markup needed; no screen hand-rolls the button, and every mutation
that can change the outbox (retry, discard, the online/offline toggle)
re-renders it live. **To see each state in the running prototype:** Error
is the default (two seeded error items exist in `SYNC_DEMO_ITEMS`); flip
🌐 to Offline (default) with those errors discarded/retried away and the
two seeded queued items still present → Offline; flip 🌐 to Online with
the same → Syncing; discard or retry every remaining item → Synced.

### 4.4.2 Sync panel (bottom sheet)

- Slides up as bottom sheet — tap backdrop to dismiss
- Header: sync icon + title + state label
- Per-item outbox rows: green/orange/red dot + item name + timestamp/status
- Retry action on queued items, Review action on failed items
- Hydration progress section: four bars showing Today's WOs / Site assets / Lookup tables / Historical docs
- Removed: bottom sync row from bar area — all sync communication goes through the icon + panel; the bottom bar (§14.5–§14.7) stays dedicated to progression only

## 4.5 Sync Status Screen (locked 2026-07-20 — nav model, protections, progress scope; field-level detail removed 2026-07-22)

Drill-down from the sync panel (§4.4.2), reached via the Review action on
a failed outbox item. Error-triage only — the panel's own 4-bar hydration
progress (§4.4.2) stays there; this screen doesn't duplicate it.

- **Card list → drill-in, no split view.** Legacy Mobile's Transaction Log
  (`docs/existing_use_cases/EAM.MOBILE.REQ.TransactionLog.txt`) uses a
  desktop split view (error list left, record detail right) — wrong shape
  for a phone. This screen instead reuses the §8.3 card-list standard for
  the error list; tapping a card navigates to the record's real Record
  View — same screen whether the record has synced before or is still
  local-only/unsynced (an unsynced record already renders through
  ordinary Standard Update Mode via `navigateToNewRecord()`, §9.5, so
  there's no separate "insert-mode error" view to build) — with an error
  banner added on top.
- Each list card shows entity type, key field(s)/record identifier, and
  the error: the server's specific general message if one was returned,
  else a generic fallback ("Server rejected this change — no further
  detail available."). No field-level tier — see the removed-feature note
  below. Still-queued/offline items are not errors and don't appear on
  this screen — it's failures only.
- **Field-level trouble surfacing — removed 2026-07-22, confirmed not
  technically feasible.** Originally specified (and built, 2026-07-20) as
  a banner listing offending field(s) as tap-to-jump links, plus a red
  left-bar accent + inline message on the field itself
  (`.form-field.error`/`.attr-item.error`, same mechanism as the
  `.required` left-bar accent) — see §21 for the full original spec,
  kept for the record. **Confirmed this session: real server responses
  never return which field caused a rejection** — only whether one
  occurred, and sometimes a general message. There was never a real
  "which field" for the app to receive, so the entire flow this enabled
  (field highlighting, tap-to-jump, `clearFieldSyncError()` clearing the
  flag on edit, Retry gated until the flagged field clears) is gone. The
  original idea was sound given the assumption behind it; the assumption
  turned out to be wrong. What's left is the single flow that was always
  correct for "no further detail given" (tier 3 below) — that's now the
  *only* flow, not one of three.
- **Protection rules — all four carried over from legacy Transaction
  Log, effective now:** WO Status is protected while its workflow is
  Started (Help-icon popup explains why, same as legacy); LOTO and
  Calibration records are read-only here entirely — "This type of
  transaction cannot be modified here," no Save possible; Start/Stop
  labor transactions are deletable only from the end (deleting an earlier
  one errors: "This transaction cannot be deleted because a later
  transaction depends on it."); nonconformity/nonconformity-observation
  transactions are delete-only, no field edits allowed. Untouched by the
  field-level removal above — a different mechanism (transaction-type
  protection, not field validation) — currently undemoed now that the
  prototype's seed data is down to 2 items (neither carries one of these
  4 protection values), not removed from the code.
- Delete (discard) always confirms first (reuse shared `openConfirm()`,
  §3.4) warning that the change will not be uploaded and will need to be
  redone from the source screen.
- Empty state: "No Transactions" + Last Sync date/time, same as legacy.
- **Record-view behavior when opened from this screen, simplified
  2026-07-22:**
  - The banner has a **Retry / Discard** action row — same two-button
    pill layout as the Sync Status Screen's own cards
    (`.sync-card-actions`/`.sync-card-btn`, shared between both since the
    banner is its 2nd consumer). **Retry is always available now** — the
    old "protected until the flagged field is fixed" gate is gone along
    with field-level detail itself; tapping it always attempts (queues if
    offline, resolves if online), never re-reports a failure first.
  - 3 banner states — red "Didn't sync" → orange "Retry queued" if
    offline, or → briefly orange then green "Synced" if online, removing
    the item from the outbox data so the panel/full screen won't show it
    again. "Online" is a hand-flipped demo toggle (`DEMO_ONLINE`, defaults
    off, persisted across navigation — §4.4.1) next to the theme toggle —
    this prototype has no real connectivity to detect.
  - **Discard is never gated** — the technician can always give up on a
    queued change. Reuses the exact same `deleteSyncItem()` the Sync
    Status Screen's own Discard calls: same confirm copy, same
    `'Discard'` danger label, same delete-from-end check for a Start/Stop
    pair.
  - The Sync Status Screen's own card list picked up the identical
    always-ready Retry styling and its own online/offline toggle, so the
    rule reads the same regardless of which surface a technician retries
    from.
  - `navBack()` returns to the Sync Status Screen (not the screen's
    normal back target) when the record was opened via this review flow
    — a plain sessionStorage flag (`eamSyncReturnUrl`), consumed once.
    Decided over adding a persistent "back to sync" affordance on the
    record itself, since the ordinary back button already existed and
    just needed to point somewhere useful.
- **Demo data reduced from 8 error items to 2, same session** — enough to
  demo the two shapes left once field-level detail was removed: a
  not-yet-synced local record (`wo-local-insert`), and a synced record
  with no further detail given (`wo-19257-nodetail`). The other 6 (a
  server-message example, an Equipment error, and the 4 items that only
  existed to demo transaction-type protections) were removed from
  `SYNC_DEMO_ITEMS` — the protection mechanism itself is untouched (see
  above), just currently undemoed. The 2 queued (not error) items are
  unaffected.

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
| **Date/Time field — calendar sheet + native time row** | Added 2026-07-14 to `sample-screen-standard-model-prototype.html`. Same calendar grid as Date, plus a native `<input type=time>` row below it — reuses the time-input pattern already built for Book Labor's Add Labor sheet (`eam-book-labor-prototype-v2.html`) rather than building a custom time-wheel to visually match the calendar. Known, accepted inconsistency: the date portion is fully custom-styled, the time portion stays native browser chrome — not resolved, just the pragmatic choice over inventing a third input pattern with no existing precedent. Behavior differs from Date alone: tapping a day doesn't auto-save-and-close (Date's behavior) — it just marks the day selected (reuses the already-defined but previously-unused `.cal-day.selected` style), and an explicit Save commits date + time together, since the time value is still pending confirmation when the day is tapped. |
| **Full-screen long-text editor** | Long-form fields (Comments, future multi-line fields) get a full-height textarea sheet with a "Discard unsaved changes" confirmation on close-with-edits, not a cramped single-line input. |
| **All Record View sections collapsed except the first** | Asset Details (or the equivalent lead section for any record type) opens by default; every other field-group section — including Comments and Documents — starts collapsed. |
| **Header rev. 2 — status-forefront, scroll-collapsing** | Supersedes the tap-to-expand rec-block. Status is the single field a technician updates most often, so it's the focal, directly-editable control at rest: a large solid-colour button (not a subtle inline badge) with code+description shown small above it. Scrolling the active tab's content collapses the status button away, leaving the code+description pinned under the nav bar — no tap/handle needed. Location was dropped from the header entirely (not worth the space next to a focal status control). Standard on every Record View, not just Equipment. See §15.4 for the WO-specific Free Form workflow rule governing whether this is editable or protected on WO Record View / WO Closing. Description font bumped to 14px (was 13px), then to **15px 2026-07-16** — the per-record-type mini-icon that used to sit next to the code/description was removed the same day (see §5.3's "mini-icon removed from the pattern" note), so the description has the row's full width to itself and reads better slightly larger. |
| **Identifier + description are header-only — never duplicated in the record body** | Now that the header's own identifier (record number) and description are both shown and directly editable there (rev. 2 above + the editable-description row below), the equivalent "Asset"/"[Module] ID" and "Description" rows that used to also appear at the top of the first body section (e.g. Equipment's Asset Details) are redundant and were removed. One place to read it, one place to edit it. |
| **Header description is editable — fundamental, module-agnostic behavior** | The record's description in the header is editable, using the same inline-edit pattern as any other ≤255-char text field (tap in place, no popup, floating checkmark confirms, no Clear since description is required). The one header-specific rule: only tappable while the header is **expanded** (status button visible, i.e. not scrolled) — while collapsed, tapping the description does nothing. This is not an Equipment-specific quirk; it applies to the header on every standard record view, full stop. |
| **Tapping the nav bar OR the collapsed identity header scrolls the form to top — fundamental, module-agnostic behavior** | Tapping anywhere in the nav bar (back button excluded — it keeps its own function) scrolls the record's content back to the top. Because the header's expand/collapse is scroll-driven, this has the side effect of re-expanding the header (status button reappears) as well — that's intentional, not incidental. This extends to the identity header block itself (`.rec-header`) while it's **collapsed** — in that state it has no action of its own (status hidden, description not tappable-to-edit), so it does the same scroll-to-top instead of being a dead tap zone. While **expanded**, the header's own children (description edit, status button) keep their specific actions and this does not override them. Real bug hit while building this: the description's tap handler unconditionally called `stopPropagation()`, which silently blocked the collapsed-state tap from ever bubbling up to trigger the scroll — fixed by only stopping propagation when actually entering edit mode. Applies to every standard record view, not just Equipment. |
| **Required-field navigation validation** | When the user tries to navigate away from a record with a required field still unpopulated, don't just block silently — jump the user TO that field (scroll it into view) and make it visually obvious that it's the one blocking navigation (e.g. flash/highlight the required left-bar, focus the row). Not yet built on any screen; the required-field visual marker (orange left bar) exists, but the "catch it on navigate-away and point at it" behavior does not. |
| **Required Entry — warning, not a hard block** | Default enforcement for a required field on a Standard Record View: an amber warning bar + override, not a hard block on saving/navigating. This is the field-level default — distinct from the WO Workflow's own step-progression gate (§14.7), which *does* hard-lock advancing to the next step until its required items are answered. The two coexist deliberately: a required field always warns rather than blocks at the field level; a workflow step can additionally gate progression on top of that. |
| **LOV value clearing — built** | Resolved — see the "'Clear' action on every field-edit sheet" row in §3.4. Applied to Equipment and the reference file; not yet ported to the WO files. |
| **Master field-type reference — renamed 2026-07-14** | `sample-screen-standard-model-prototype.html` (renamed from `eam-field-type-reference-v1.html`, which is now retired to `prototypes/standalone/old versions/` per the "rebuild, not patch-in-place" convention in `CLAUDE.md`) — a standalone prototype, not tied to any module, showing one canonical example of every field type (LOV description-only, LOV code+desc exception, identifier LOV, edit text, currency, number, date, date/time, checkbox, protected, required, long-text) with the rule written as a caption under each, plus the full List/Detail header + Insert Mode reference build (§8.1/§9.3). Check new or edited screens against this file instead of re-deriving each rule per screen — this is exactly how repeated conformance-sweep drift happened in the first place. Same-day cosmetic pass: nav title changed from "Field Type Reference" to "Sample Standard Screen" (centered) and the sample header description got a `[Click in here]` prefix, both purely to make the generic/reusable framing more legible at a glance — no behavior change. |
| **Type and Priority color badges** | When Type or Priority (or similar metadata fields) are displayed with color badges, show the badge only if a color is configured. If no color is set, omit the badge entirely and left-align the field value text under the field label (no forced right-alignment or gap where the badge would have been). Applies to any metadata field that uses optional color coding. **Built on WO Record View 2026-07-14**, reusing the exact icon+colour pairs from the §6.7 WO icon language (WO List) rather than re-deriving a second palette — `TYPE_META`/`PRIORITY_META` keyed by the same type/priority codes. Fixed a real bug in the process: the badge markup already had the `:empty{display:none}` omit-if-no-color rule wired up, but the badge `<span>` itself was always rendered with zero children (just a background-color class, no icon glyph inside) — so `:empty` was matching and hiding *every* badge unconditionally, regardless of whether a color was "configured." The rule was correct; the badge had no content to make it not-empty. Now fixed by rendering the real type/priority icon inside. |
| **Header actions — pin + ellipsis menu** | Added 2026-07-14. Record View headers only — never on tab content, list screens, or detail sub-views. Top-right of the pinned `.rec-id-row` (not the collapsing status row, since these are record-level actions relevant regardless of scroll position): a **pin toggle** (outlined when unpinned, filled purple when pinned — same accent as every other "active/selected" state, §3.2.2) directly left of an **⋯ ellipsis** that opens a small anchored dropdown menu (not a bottom sheet — a deliberate exception to "everything is a bottom sheet," since this is a compact, corner-anchored action list, not a value picker or a full-form editor). Menu has three groups, each divided by a thin rule: (1) **Copy Link**, (2) **Copy** / **Delete** (Delete styled red, opens the existing centered confirm modal — the same "destructive actions get a centered dialog" pattern used for Comments delete, not a new one), (3) **screen-specific action(s)** — an extensible slot each record type populates itself (e.g. Equipment: "View Structure Details"; WO: "Print Work Order"). The pin toggle is the UI surface for the `pinned` device-side contract already described in §2.6 / `EAM-DESIGN-Pinning-Enhancement-v1.md` — tapping it in the prototype is a local visual toggle only; the real write-through to whichever punch-list mechanism is chosen (§2.6 Option A/B) is not modeled here. **Sized up 2026-07-16**: 30px→34px button / 16px→18px icon on both pin and ellipsis — a `margin-top:-3px` on `.rec-header-actions` re-centers the bigger circles against `.rec-num`'s line height, and the anchored menu's `top` offset moved 36px→40px to keep its gap under the now-taller button. `.rec-id-row`/`.rec-status-row-inner` left/right insets also bumped 14px→16px the same day (a general "give the header edges a touch more room" pass, not specific to the button resize). |
| **Organization pill — always present, always protected in update mode, lives in the header** | Added 2026-07-16, **moved into the header the same day**: the pill now sits inside `.rec-status-row`, justified opposite the status button (right-aligned against it, sized down slightly from the standalone/Insert-Mode pill so the row reads as one balanced unit rather than two competing full-size controls) — no longer its own section-card above Header Fields. It collapses on scroll exactly like status does, for free, since it's now a child of the same collapsing `.rec-status-row` that already hides on scroll — no separate scroll rule needed. Distinct from the pill's editable/required state on Insert Mode (§9.3, Record View insert standard only, still the standalone full-size pill) — on the Record View itself, it's always protected: no chevron, not tappable, same treatment as any other protected field. **No lock icon either** (removed 2026-07-16) — unlike a `.form-field.protected` row, which keeps its chevron slot occupied by a lock so the row doesn't look broken, the org pill's chevron slot just goes empty when protected; the pill's muted background + non-interactive cursor already read as "not editable" without needing a second icon to say so. **In-header style locked 2026-07-16, second follow-up** — Inter (the app's default sans, not a monospace/code font), white text, no building icon in the markup at all, outlined rather than filled (transparent background, `1.5px solid rgba(255,255,255,.85)` border). Decided via a live scratchpad comparing both fonts × {white, gray, orange} outline treatments plus icon-on/off and a longer code (FISHERS) to check width — landed on the simplest option: just the code, in white, no icon. Text is unconditionally light rather than the theme-flipping `.field-value` default, since this row's background is always dark regardless of the app's own light/dark toggle. Only applies to the in-header (Record View, always-protected) placement — the separate standalone Insert Mode pill (required/editable, light card background) is a different context and keeps its base filled style; don't carry this outline treatment there without a separate decision. |
| **Header Fields / Non-nullable Fields — renamed, expanded, and simplified** | Renamed 2026-07-16 from "Header fields (Type/Priority style)," **revised further the same day**: no section-card-header/title on this container at all — the fields just sit directly in the card, unlabeled. Plain-LOV items (e.g. Department) show **description only, no code** — these fields are reference-data lookups being surfaced prominently here, not identifiers, so unlike the general LOV-row default elsewhere (code+description, §3.4) the code adds nothing in this specific box. Badge-style fields (Type, Priority, Status-adjacent) are unaffected — they never showed a code to begin with. Holds every non-nullable field on the screen, not a fixed Type/Priority pair; 2-per-row grid, an odd field out spans the full row width rather than leaving an empty cell. Demonstrated with 3 fields (Type, Priority, Department) in `sample-screen-standard-model-prototype.html`. **First real-screen application:** `eam-equipment-record-view-prototype-v1.html` (rebuilt 2026-07-16) — Department, Criticality, Class, Manufacturer, Category (5 plain-LOV fields, 2-per-row, Category spans full-width as the odd one out — **swapped with Manufacturer 2026-07-16, second follow-up**, so Category is the bottom/full-width field instead of Manufacturer). Organization is required but isn't here — it's the dedicated org pill in the header (previous row). Operational Status is required but also isn't here — it's the header's own status button, never duplicated as a body/Header-Fields row. **Status swapped out for Criticality the same day**: the lifecycle Status field (Pending/Installed/In Service/Withdrawn) moved out of Header Fields into Asset Details, and Criticality (already an existing, already-4-valued field — 1-Low/2-Medium/3-High/4-Critical, previously sitting in Asset Details) moved into Header Fields in its place. A straight swap, not a deletion — every field that was visible before still is, just relocated. **Membership here no longer implies required** (policy reversed 2026-07-16, third follow-up) — a required field in this box gets the same orange left-bar `.form-field.required` uses, just on its own cell; Department and Criticality are marked required in the demo (two markers), Class/Manufacturer/Category aren't. **WO Record View exception:** the Equipment field is its own large standalone container above this grid, not one of the 2-per-row cells — every other header field on that screen stays consistent with this standard below it. **Status corrected 2026-07-16 (conformance audit):** WO Record View *has* a Header Fields box (Type + Priority) — the "not yet built" note here was stale. What's still actually true: it holds only Type/Priority, not every non-nullable field this row requires — Department and Problem Code, also required, sit in a separate "Work order details" card instead. Not yet reconciled; tracked in §20. |
| **Operational Status (or equivalent header-status field) is header-only — never duplicated as a body row** | Added 2026-07-16, generalizing the identifier+description header-only rule (two rows above) to the header's own status field. Whatever field drives the header's `.rec-status-btn` (Equipment: Operational Status) is edited exclusively there — it must not also appear as a plain-LOV row in a field-group section or the Header Fields box. Equipment's pre-rebuild file had exactly this duplication (an "Operational Status" row inside Asset Details, redundant with the header button); removed during the 2026-07-16 rebuild. |
| **Container required-field-count indicator** | Added 2026-07-16. Any `.fg-section` or `.section-card` whose header (`.fg-toggle-row` / `.section-card-header`) contains at least one required field shows a small orange count badge there (e.g. "1", "2") — the container-level counterpart to the individual field's orange required left-bar. Orange-tinted (matches the required left-bar accent). Implemented generically in `eam-shared.js` (`updateRequiredBadges()`, wired into every field-mutating function) — no per-screen config needed, works on both canonical files automatically. The Header Fields box (row above) is exempt by construction: it has no container header to attach a badge to, and its fields aren't `.form-field` elements in the first place. **Demo fields added 2026-07-16** (`eam-equipment-record-view-prototype-v1.html`): Dormant Start/Dormant End (Equipment Details) and X/Y Coordinate (Tracking Details) were marked required to seed both containers with a visible "2" badge. Purely illustrative — not a real business rule that these four fields are actually required. **Badge/chevron order fixed 2026-07-16, second follow-up:** the badge inserts *before* the chevron (`header.insertBefore(badge, chev)`), not after — every container's chevron sits at the same fixed x-position whether or not a badge is present, so the chevrons read as one straight column down the page; the badge sits "inside," next to the title, and only nudges the title's available width, never the chevron's position. **Revised 2026-07-20 — always shown, not a completion tracker:** the badge used to disappear once every required field inside was populated (and was documented to "reappear if a value is cleared again"). That reappear case can't actually happen in Update Mode: §3.4's Clear-visibility rule hides Clear for required fields specifically because clearing one would contradict the requirement, so once a required field is filled it can never go back to empty again on this screen. That made the badge a one-way indicator that vanished the first time a container's fields got filled and then simply never came back — not the live "still needs attention" signal it was meant to be. Fixed by dropping the empty/complete distinction entirely: the badge is now a static "this container has N required fields" count, shown unconditionally whenever the container has ≥1 required field, populated or not. |
| **Documents — built, was missing despite being locked** | Added 2026-07-16. "Comments + Documents always present" (row above) was locked well before this but never actually implemented in the master reference file — `sample-screen-standard-model-prototype.html` had a Comments section with no Documents section at all until now. Same add-affordance-on-top pattern as Comments; shows every document inline, no truncation (unlike Comments, see below). |
| **Comments — Record View shows latest 3 only, links to a dedicated tab for the rest** | Added 2026-07-16. Below the third comment, a "View all comments" row (same style as the Add-comment row) navigates to a dedicated Comments tab showing the full list. The link only appears once there are more than 3. Comments and Documents both get a dedicated tab now (Documents' tab is mostly for parity — everything's already shown inline there with no length problem to solve). Both tabs use the standard List/Detail identity header (§8.1) with a Plus — but that Plus creates a comment/document directly, not Insert Mode (see §8.1's `TAB_PLUS_HANDLERS` override, not the default). A comment/document added or edited from either the Record View excerpt or the dedicated tab must stay in sync across both — needs one shared data source per record, not two independent copies. |
| **Comment author — full description, "(You)" for your own, Edit/Delete gated on ownership** | Added 2026-07-16 (found not-yet-applied on both canonical files, fixed same day). Author always shows the commenter's full user description — never an abbreviation ("Bruce Campbell," not "B. Campbell"). If the comment is the current logged-in user's own (`mine: true`), the display appends `(You)` to their own full description (e.g. "Bruce Campbell (You)") — computed at render time from a screen-provided `CURRENT_USER_NAME` constant, not baked into the stored `author` string, so `COMMENTS_DATA` only ever holds plain full names. Ellipsis actions stay ownership-gated as already designed: your own comment gets Edit/Delete/Copy, anyone else's gets Copy only (`openCommentActions(btn, isMine)` in `eam-shared.js` — this part was already correct, just the author-string rule wasn't). Implemented generically in `eam-shared.js` (`renderCommentItemHTML`, `addComment`, `addCommentToData`) — no per-screen logic needed beyond declaring `CURRENT_USER_NAME`. Both canonical files set it to `'Bruce Campbell'`; Equipment's two pre-existing seed comments (previously "B. Campbell"/"J. Martinez") were expanded/renamed to "Meera Kumar"/"Jamie Martinez" to avoid a same-name collision with the current-user identity. |
| **List/Detail row tap → that record's own Record View, in update mode** | Added 2026-07-16. Where the tab supports drill-in (§8's content-driven rule), tapping a row is supposed to open the tapped record's own Record View, not a preview or inline expand. The record's code/PK is shown there but protected (same treatment as any other protected field) — never editable just because you drilled in from a list. Not yet wired anywhere real: no child-record type in this app has its own Record View to open yet, so every List/Detail row remains a toast stub describing this target behavior rather than performing it. |
| **Nav bar — centered screen title** | Locked 2026-07-16, formalizing what `sample-screen-standard-model-prototype.html` already did. The very top nav row (back button left, `PROTOTYPE` label + sync icon right — all unchanged) shows the current screen's title centered in the middle, using the existing `.nav-title` class in `eam-shared.css`. Applied to `eam-equipment-record-view-prototype-v1.html` 2026-07-16 (title: "Equipment"); Sample Screen already conformant ("Sample Standard Screen"). WO screens get this whenever they reach their shared-file rebuild — not retrofitted into their current self-contained form. **Centering bug fixed same day:** the initial implementation gave `.nav-title` `flex:1`, which centers it within the leftover space *between* `.nav-back` and `.nav-actions` — not the true center of the bar, since those two siblings aren't equal widths (a 32px button vs. a wider label+icon group). Fixed by taking the title out of flex flow entirely: `.nav{position:relative}` + `.nav-title{position:absolute;left:0;right:0;text-align:center;pointer-events:none}`, with `.nav` switched to `justify-content:space-between` so `.nav-back`/`.nav-actions` still land at the true left/right edges with just 2 flex children. Centers against the bar's actual width regardless of sibling widths — verified live (title's computed center exactly matches the nav bar's computed center, 0px diff). Applies automatically to both canonical files (shared CSS). |

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

**Scroll-collapse mechanism generalized for reuse, 2026-07-20.** The
threshold/hysteresis scroll listener above (`onRecContentScroll` in
`eam-shared.js`, expand/collapse at scrollTop 10px/40px) was hardcoded
to a single element, `#recHeader`. It now also drives any element
carrying a generic `.scroll-collapse` class, independent of `#recHeader`
and of each other (state read from each element's own `.scrolled` class
rather than one shared boolean) — `#recHeader` itself is untouched,
still driven by its original id-based branch, so nothing
about this table's rules changed. First reuse: Home's Create bar
(`.create-bar.scroll-collapse` in `eam-home-screen-prototype-v1.html`)
collapses itself entirely (no nested status-row child needed — the whole
bar is the collapsing element there) on the same scroll behavior, then
reappears exactly like `.rec-status-row` does once the header-tap-to-top
rule (§4.2) scrolls the user back near the top.

**Debounce switched from `requestAnimationFrame` to `setTimeout`(16ms),
2026-07-20 — real bug, not a style preference.** Found live while
testing the Create-bar reuse above: `requestAnimationFrame` only fires
on an actual paint tick, and a backgrounded/inactive tab (some embedded
preview panes never give their tab real focus/visibility) can suspend
paint — and therefore every queued rAF callback — indefinitely. That
left the debounce flag (`recHeaderTicking`) stuck `true` forever after
the first scroll past the threshold, silently freezing the whole
mechanism (confirmed: `#recHeader` was equally affected, this was never
Home-specific). A `setTimeout` runs on its own clock rather than
waiting on the renderer, so it fires reliably regardless of tab
visibility, while still coalescing rapid scroll events the same way.
Applies to every consumer of this mechanism, not just the new one.

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

**Applied to:**
- `eam-equipment-record-view-prototype-v1.html` ✓ (header actions added 2026-07-14; mini-icon removed 2026-07-16)
- `sample-screen-standard-model-prototype.html` ✓ (header actions added 2026-07-14; never had a mini-icon in the first place)
- `eam-wo-record-view-prototype-v1.html` ✓ (updated 2026-07-14; header actions added same day — this file had no `openConfirm` modal at all before now, ported from Equipment for the Delete action). **Still carries the old `.rec-mini-icon` block** — this file predates the shared-file rebuild (Phase 0.4 only covers Sample Screen + Equipment so far) and hasn't been touched since the icon was dropped; remove it whenever this file is next rebuilt onto `shared/eam-shared.css`/`.js`, don't leave it as a standing exception.

**Mini-icon removed from the pattern entirely (2026-07-16).** Previously a
required **per-record-type customization point** (a pump icon for
Equipment, etc.) — Sample Screen's omission of it was a deliberately
scoped, one-file exception at the time (added 2026-07-14, since that file
had no real record type to represent). That exception is now moot: the
icon is gone from the pattern itself, for every screen, not just the
reference file. Description font bumped 14px→15px the same day — with the
icon gone, the description has the row's full width to itself and reads
better slightly larger.

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
available on the WO dataspy (all locally-synced fields offline, full
server columns via Tier 4 online escalation), not a fixed 5-column
layout. See §21 for the retired bespoke version.

## 6.7 WO colour language

Superseded 2026-07-22 — see §21 for the old table. §23 is now the
governing rule: colour is reserved for exactly 3 instruments, and Type
isn't one of them, so it lost its colour entirely here too (it had
already lost it on WO Record View and this screen's own Insert Mode —
this section was the stale holdout). Status is a real instrument, so it
keeps colour, but now reads off the same 3-tier fill vocabulary as the
header status pill (§4.4.1/`STATUS_CLASS_MAP`) instead of its own 4-way
scheme:

| Dimension | Mapping |
| --- | --- |
| **Type — any value** | No colour — plain text, name only (matches TYPE_META everywhere else) |
| **Priority** | No colour, any level — plain description text ("Low"/"Medium"/"High"/"Critical") |
| **Status — Released, Completed** | Green fill pill, white text (`.pill-green` — "operational/completed" tier) |
| **Status — Waiting approval, Waiting materials** | Outlined pill, ink text (`.pill-outline` — "standby/waiting" tier; this screen's own two "blocked on something" statuses, not in the canonical 4, both map here) |
| **Status — (any future "down"/failed status)** | Red fill pill, white text (`.pill-red` — not populated by this screen's current demo data, supported for when one exists) |

Icons were already retired before this pass (§3.4 "No icons inside any
pill or field") and stay retired.

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

Added: July 2026. Source: offline search architecture sessions (tiered record model). See also §2.6.

| Decision | Rationale |
| --- | --- |
| **"Synced" ≠ "visible"** | The old assumption that a record must be fully synced to be searchable is false. Decoupling the two is what makes offline search of thousands of 150-field WOs tractable. |
| **Four-tier record model (Work set / Search index / Demand cache / Server search)** | Matches the offline guarantee to actual need — full data for active work, a lightweight index for search, on-demand hydration for occasional access, online escalation for full-fidelity search. |
| **Tier 2 stores exactly 6 projected fields per row, via FTS5** | Redefined 2026-07-20 from an approximate "~8–12" to exactly 6 — the same 6 fields §8.3's card/filter/sort standard surfaces, so the UI standard and the sync payload are driven by one number, not two that can drift. Tens of thousands of rows at well under 300 bytes each is trivial for SQLite. Keeps offline search instant without needing full records. |
| **Real scaling limit = payload size + sync volume, not row count** | Both are already handled by the existing delta-pull cursor. Solves the actual constraint instead of an imagined one. |
| **Dataspy membership pre-evaluated server-side at sync time** | Server computes WO-ID membership for saved dataspies and ships it with the index, rather than shipping dataspy logic for local re-evaluation. Makes offline dataspy switching instant with no local SQL engine needed. |
| **Sync Config dataspy repurposed** | Meaning shifts from "what's on the device" to "what's guaranteed executable offline" — i.e., it now scopes Tier 1, not the whole local DB. |
| **Tier 4 reuses the existing dataspy SQL search API** | No new server search engine. Online-only escalation reuses what already exists. |
| **Online search results are written into the local DB as ephemeral rows** | Preserves "UI reads only from local DB" with zero special-casing — the grid always re-queries locally, network never feeds the UI directly. |
| **wo_index schema: narrow columns + full_payload JSON blob for the remaining ~140 fields** | Every customer's WO record differs (UDFs, custom fields, config drift); the blob absorbs that variance. Tier transitions become single-row UPDATEs, not schema migrations. |
| **Lifecycle columns: hydration / pinned / source / last_synced_at vs. fetched_at / dirty** | Each is a distinct axis — completeness, offline promise, provenance, two separate clock domains, and a safety interlock — needed to make tier transitions and eviction safe. |
| **pinned is orthogonal to hydration** | Separates "guaranteed offline" from "currently has full data," so manual pinning can exist as its own concept. |
| **Server-search upsert rule: ON CONFLICT refreshes summary fields only** | Never touches hydration, pinned, dirty, or full_payload. A search result can never demote a tier or clobber a local edit. |
| **Tiers move up via user intent only; down only via explicit LRU/sweep, hard-blocked by pinned/dirty** | Predictable, safe eviction behavior — no silent data loss. |
| **Row identity (wo_id / FTS entry) never changes across the lifecycle** | This is what lets mixed-origin rows (sync / demand / server_search) coexist in one grid with no special-casing. |
| **Row state surfaced via the existing 4-state sync control language** | No new visual system — consistency with the rest of the app's sync vocabulary. |
| **Index freshness caption shown when offline (e.g. "results as of 2:14 PM")** | Tier 2 stubs are only as current as the last index sync — the technician needs to know that. |

Still open, not decided: punch-list mechanism (Option A static sync dataspy vs. Option B PIN projection — see §2.6); FTS5 availability in the final DB engine choice; dirty as counter vs. boolean; confirmation that the existing dataspy SQL API can serve Tier 4 as-is.

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
- **Comment author label, avatar, and actions — locked, module-agnostic
  (added 2026-07-14).** A comment's header row shows exactly two things
  next to its timestamp: the commenting user's **description** (their
  display name — same "description, not code/ID" philosophy as every LOV
  field, §3.4) and the ellipsis for Edit/Delete/Copy. **No avatar/profile
  picture** — initials-in-a-circle was tried and removed; name text alone
  carries enough identity for a comment thread, and dropping it keeps the
  row from competing visually with the ellipsis. The ellipsis's own
  actions sheet uses the exact same `.sheet-header` (✕ + title) every
  other sheet in the app uses — it was initially built without one (a
  bare menu item with no header), which is the specific inconsistency
  fixed this session; any sheet lacking a proper header should be treated
  as a defect, not a valid minimal variant. Canonical (generic) example:
  `sample-screen-standard-model-prototype.html`'s Comments section carries **two**
  example comments specifically so both permission states are visible
  without adding a comment first: one authored "User Description" (a
  literal placeholder for "this is where the commenting user's
  description renders," not a named example person — keeps the master
  reference generic) whose ellipsis shows Copy only, and one authored
  "You" whose ellipsis shows Edit/Delete/Copy. A single-example version
  only showed one state, which read as though Edit/Delete were missing
  entirely rather than permission-gated — two examples make the rule
  self-evident on sight instead of relying on the caption to explain it.
- Desktop's "quick links" panel (Hierarchy, Reliability Ranking Details,
  Part Association, Financial and Disposition Details, Class Attributes)
  is superseded on mobile by the tab rail itself — not replicated as a
  separate panel.

## 7.3 Sibling tabs (Equipment)

Confirmed from the reference screen — 11 tabs total, Record View plus 10
siblings: **Comments, Documents, Events, Costs, PM Schedules, Structure
Details, Depreciation, Meters, Warranties, Parts Associated.** (Corrected
2026-07-16, conformance audit — this section originally said "9 total, 8
siblings," predating the later §5.2 decision that gave Comments and
Documents their own dedicated tabs alongside their inline excerpt; the
code was already correct, this section's prose wasn't.)

## 7.4 Structure Details tab — open design problem

Explicitly flagged as needing original design work: this tab shows the
equipment's position in the Location → Position → System → Asset hierarchy
as a tree. No mobile tree-diagram pattern exists yet anywhere in this app.
Informed by (but needs restyling from) the legacy desktop tablet reference
screenshot `Structure__Safety_WO.png`, which shows an indented tree with
connector lines and a status dot per node — not Octave-styled and not
mobile-vertical-optimized as-is.

## 7.5 Equipment Photo — icon, preview pop-out, and edit (decided
2026-07-22, not yet built)

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

**Populated state — tap opens a pop-out preview, not the Equipment
Lookup sheet.** A full-image pop-out reusing §19.6's full-screen
viewer-sheet shell (a real image here, not a coloured placeholder, since
this is an actual per-record photo) with one action added: **Edit**,
which opens the exact same attachment source-picker sheet Attachments
already uses (§19.6 — Camera / Photo library / File or document) to take
or choose a replacement photo; committing replaces the stored photo and
updates the icon immediately. This is a new variant of the §19.6 viewer
shell, not a verbatim reuse — the existing viewer's action is Remove,
this one needs Edit instead. Whether Remove should also be offered here
is open, not decided.

**Empty state — tap goes straight to the source-picker, skipping the
preview.** Nothing to preview yet, so tapping an icon with no photo set
opens the same §19.6 source-picker sheet directly, to set a first photo —
same shortcut logic as any other unset-required-field tap, just without
an intermediate empty-preview step.

**Tap-target carve-out, WO Record View specifically:** `.equip-summary-
card` is currently one uniform tap target — tapping anywhere on the card
opens the Equipment Lookup sheet (§15.5). This adds a second, smaller tap
target: the icon itself, which now intercepts the tap for photo
preview/edit instead. Tapping anywhere else on the card is unchanged.
Same "separate controls so browsing one thing never collides with a
different action" precedent already set by the Structure tab's
text-vs-caret disambiguation (§15.5).

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
mini-icon** — removed from the header pattern entirely 2026-07-16 (§5.3).
WO Closing was the last of the 4 WO-workflow files still carrying the old
icon block (plus stale 30px/16px/36px button-size values from before the
2026-07-16 34px/18px/40px bump) since it predates the shared-file rebuild
— brought into exact conformance 2026-07-16. If any future WO-workflow
file is found still carrying the icon or the old sizes, drop it/them when
that file is next touched — don't treat it as a standing exception.

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
`eam-wo-prototype-issue-parts-v1.html`, `eam-book-labor-prototype-v2.html`
— all 2026-07-14, replacing a first pass that incorrectly gave these files
the full §5.3 header (status + pin). `eam-wo-closing-prototype-v2.html`
followed 2026-07-16, on rebuild — its v1 predecessor had briefly carried
the mini-icon this section says to drop, plus stale 30px/16px/36px button
sizes from before the 34px/18px/40px bump; v2 links `eam-shared.css`
directly instead of hand-copying it, so it can't drift from this section
again the way v1 did.

**Also applied to `eam-equipment-record-view-prototype-v1.html`, 2026-07-14
— the first real (non-WO) use of this pattern's Plus-included form.** All
7 sibling tabs other than Record View (Events, Costs, PM Schedules,
Structure Details, Depreciation, Meters, Warranties, Parts Associated) get
this header, including the Plus this time — Equipment's child tabs aren't
WO-workflow screens, so the §8 WO exception doesn't apply, and none of
them has an existing pointed add-affordance the way Issue Parts/Book Labor
do. Implementation differs slightly from the WO files' plain swap because
Equipment is one file serving two roles: Record View needs to keep its
full §5.3 header (identity/status/pin, unchanged), so this file carries
*both* headers as separate elements (`#recHeader` and `#listDetailHeader`,
namespaced `.list-detail-*` to avoid any class collision with `.rec-*`)
and toggles visibility between them in `goToTab()` — never both shown,
never neither. Plus is tab-aware via a single shared handler that reads
`currentTab` (`onListDetailPlusTap()`), rather than re-rendering the header
per tab. Ellipsis menu ships with the doc's own suggested candidates
(Sort, view-mode toggle) as toast-stubs — still explicitly undecided, per
the row above; these demonstrate the shape, not a locked menu. Structure
Details gets the header too; its hierarchy/tree content itself (§7.4,
still flagged as needing its own design pass) was intentionally left
untouched — the header swap only touches chrome above the tab content,
not the content itself.

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

**Applied to (first application of this standard, 2026-07-14):**
`eam-equipment-record-view-prototype-v1.html`'s Events, PM Schedules,
Depreciation, Meters, Warranties, and Parts Associated tabs use the shell
directly; Costs uses the variant described above. Per-tab Plus/Search
visibility follows §8's content-driven rule — confirmed by inspecting
reference screenshots in `prototypes/reference-screenshots/` against each
tab's real base-EAM equivalent: Meters and Parts Associated show Plus
(both have a real insert-capable detail section in the base screen);
Events, Costs, PM Schedules, Depreciation, and Warranties do not. Structure
Details keeps its own tree content (§7.4) completely untouched — it's the
one tab on this screen that opts out of both Plus and Search, per the rule
that a non-row-list tab gets neither.

**Also demonstrated generically in `sample-screen-standard-model-prototype.html`**
(added 2026-07-14): Tab 1/2/3 — previously toast-only placeholders — now
each render the shell live
against their own dummy dataset ("Sample List A/B/C"), proving the
`LIST_DETAIL_TABS`-config mechanism is genuinely reusable and not
Equipment-specific.

**Superseded same day:** this row originally said the file had no second
per-tab identity header and put Search inline in `.res-row` as a
workaround. That was wrong to leave as a permanent divergence — every
tab except Record View now correctly swaps to a real `#listDetailHeader`
(protected identity, no status/pin, Plus + Search + Ellipsis), exactly
like Equipment, and Search moved back into that header where it
canonically belongs. Reuses `.rec-*` classes directly (same visual
treatment as `#recHeader`) rather than a namespaced second set — since
only one of the two headers is ever visible at a time in this file, there
was no collision to namespace against in the first place; Equipment's
`.list-detail-*` namespacing was solving a problem specific to a file that
needed both patterns' CSS to coexist without shadowing, not a requirement
of the pattern itself.
- The Plus icon is **unconditional** here (shows on all of Tab 1/2/3) —
  unlike Equipment's per-tab content-driven rule (§8), this generic
  file has no real base-EAM screen to check each tab against, so it
  always shows Plus specifically to demonstrate Insert Mode (§9.3) is
  reachable from any of them. Real screens still follow the content-driven
  rule, not this file's "always on" shortcut.

Also as of 2026-07-14, this file's Record View header (`#recHeader`) no
longer shows an Equipment-specific number/description — it's now
`CODE-001` with a 100-character placeholder sentence, so the master
reference reads as genuinely generic rather than looking like an
Equipment record. The longer description doubles as a live demonstration
of text-wrap behavior in the header (`.rec-desc` has no truncation —
`display:block`, no `white-space:nowrap` — so it wraps to multiple lines
rather than clipping).

## 8.3 List Search Screen standard — card, list mode, filter, sort, dataspy bar

**Locked 2026-07-20, unified across the app the same day.** This is now
the single standard for every dataspy-scoped record list in the app —
WO List, WO Search (§6), and every child tab (§8.2's shell) all render
through it. There is no per-screen exception left except §8.2's Costs
variant (still its own row template + aggregate footer, kept because
it's a different *kind* of content — an aggregation view, not a plain
record list — not a styling preference). A screen builder supplies a
dataspy; the card layout, list-mode columns, filter chips, sort options,
and dataspy-bar chrome all follow from that automatically — none of it
is Screen Designer's to choose. §6.5/§6.6/§6.7/§6.8's old WO-specific
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

**The Organization carve-out.** If Organization is present anywhere
within the dataspy's first 6 columns, it's pulled out of the normal
1–5 sequence entirely and rendered instead as a small pill badge in the
card's top-right corner, next to the headline — mirroring the record
view header's own protected org pill (§9.3), gray-recoloured: transparent
background, `var(--border-strong)` border, `var(--gray-4)` text. (Not a
literal copy of the header pill's own colours — those assume a
permanently-dark nav-bar surface, which this card doesn't have; a live
scratchpad comparison on 2026-07-20 confirmed the literal colours go
white-on-white on a light card. Gray is the one that actually reads in
both themes.) The other 5 fields then fill the body in order, skipping
over Organization's position. If Organization isn't among the first 6
columns at all, the card is just the plain body with no corner badge —
this is the common case, not the exception being described.

**Fewer than 5 body fields populated → the card collapses to however
many are actually populated.** No fixed-height padding, no placeholder
dashes — a 3-field record just renders a shorter card than a 5-field one.

**Slot 1 — headline.** Bold, no label, top-left, up to 2 lines
(`-webkit-line-clamp:2`) before truncating. Plain bold text by default;
if the field's own EAM field metadata marks it status-type, it renders
instead as a pill — same headline-weight/position as before, but
**superseded 2026-07-22 (§23):** no longer a generic "solid colour,"
specifically one of 3 fill/outline tiers (`.pill-green`/`.pill-red`/
`.pill-outline` in `eam-shared.css`, consumed by `renderStdCard()`/
`renderStdTable()`) — green=operational/completed, red=down,
outline=standby/waiting — matching the same vocabulary as the header
status pill (§4.4.1) rather than a per-module hex table. Type-like
fields never get this pill treatment; they were never status-type to
begin with.

**Slot 2 — subline.** Muted, no label, directly under slot 1, single
line, ellipsis-truncated. **Superseded 2026-07-22 (§23):** no longer
coloured text for type/code-like fields — Type isn't one of the 3 colour
instruments, so it renders as plain text like everything else here now
(this was actually dead in every real consumer already — status is
always slot 1's field per every current dataspy's column order, and
Type never lands in slot 2 either — but the rule itself was still
wrong on paper until this pass). **WO List deviates from "muted" as of
2026-07-22 (user report — its Description subline read gray while the
same field renders in ink everywhere else on the same screen, List
mode's table cell included):** its own local `.ld-card-subline` now
uses `--text-body` (ink) instead of `--text-muted`. Not yet changed in
the shared `eam-shared.css` copy (Sample Screen/Card Standard/Equipment
List's own consumers still render slot 2 muted, per this section) —
flagged here rather than silently generalized; revisit if the same
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
"Available" is tier-dependent, same tiering §6.13 already locked for
search: offline, that means whatever's actually synced (§6.13's Tier 2
projection — now exactly the same 6 fields the card draws from, see
§6.13); true full-column completeness, every field the dataspy defines
server-side, is online-only, via the existing Tier 4 search escalation —
no new fetch mechanism, List mode just inherits the tiering search
already has. Horizontally scrollable table, header row with plain-text
column labels, same no-icon rule as the card — but the same colour
language carries over per column (a status column is still a solid
pill, a type/code column is still coloured text); dropping icons never
meant dropping colour.

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
  keep their existing order).

### Applied to

`eam-wo-list-prototype-v5_1.html` (both the WO List and Search screens —
rebuilt 2026-07-20 onto this standard, replacing the old bespoke §6.5/
§6.6 card/table; see §21) and `eam-equipment-record-view-prototype-v1.html`'s
Events/PM Schedules/Depreciation/Meters/Warranties/Parts Associated tabs
(Costs stays exempt, per this section's scope note). Also demonstrated
generically in `sample-screen-standard-model-prototype.html`'s Tab 1/2/3
(the plain baseline, the status-pill/org-corner-badge case, and the
type-coloured-text/collapsing case, respectively). Prototyped in
isolation at `eam-card-standard-prototype-v1.html`, an active standalone
reference file (not a throwaway).

# 9. Standard Model — Insert Mode

Shell locked this entry; field-level content locked in §9.3 below, added
later the same day. Confirms there are two standards, not one — Insert
Mode from a list/detail tab vs. Insert Mode on a Record View.

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
- **After Save — Record View insert standard (§9.1 standard 1), locked
  2026-07-16:** the system always navigates to the newly created record's
  own Record View screen, with the record open in Standard Update Mode
  (§5.1's ordinary Record View pattern — not a special "just created"
  state, not a standalone confirmation overlay, and never staying on
  whatever screen launched Insert Mode). Applies the same way regardless
  of entry point — a list screen's own Create (+, §6.2) and Home's Create
  (§9.4) both land here identically. **Open:** whether this also applies
  to the List/Detail insert standard (§9.1 standard 2) — a new child
  record (an Event, a Cost line) may not have its own dedicated Record
  View screen to land on. Default assumption until decided otherwise:
  this rule is Record-View-insert-only.
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

1. **Organization pill — Record View insert standard only** (narrowed
   2026-07-16). Same pill component as §9.2's shell reference — see the
   canonical example in `sample-screen-standard-model-prototype.html`
   ("Organization pill" card). Defaults to the current user's own org —
   `ORG1` in every prototype. Required and editable here — but never
   *shows* a required marker, and never offers a Clear action, because
   both are meaningless on a pill (corrected 2026-07-16, conformance-audit
   follow-up, superseding a same-day attempt to add `.org-pill.required`
   styling). **This is a general pill rule, not Organization-specific:**
   a pill is required by nature — there's no such thing as an optional
   pill, so a visual marker distinguishing required-from-not carries no
   information — and a pill is always system-defaulted, never truly
   empty, so there's never a value to clear. Applies to every pill,
   including Home's Screen/entity pill (§9.4). Implemented generically:
   `.org-pill` gets no `.required` CSS at all (removed from
   `eam-shared.css`), and `shouldHideClear()` hides Clear for any key in
   `ORG_STYLE_LOVS` unconditionally, decoupled from the field's own
   required/empty state. **A List/Detail
   insert omits the pill entirely** — not just non-required, genuinely not
   present — since a child record scoped to an existing parent inherits
   the parent's org outright; don't include it on a child-tab Insert Mode
   unless a specific screen is explicitly told otherwise. **Code only, no
   description** (§3.4.1, added 2026-07-14) — the pill shows just the
   code; the LOV picker sheet still shows the description for selection
   clarity. **Font corrected 2026-07-14 (second pass):** first built using
   the small muted monospace code class (the one Cost Code/Assigned To use
   for a code sitting *next to* its description) — wrong reference. Since
   Org has no description rendering alongside it here, its code isn't a
   secondary label, it's the field's whole value — so it uses the same
   plain field-value treatment as any other field's value text (sans,
   14px, weight 500, full-strength colour, no monospace), not the
   muted/small code treatment. Rule of thumb going forward: the muted
   monospace code class is for a code *paired with* a visible
   description; a code standing alone as the entire value uses the
   regular value treatment instead. **Also appears on the Record View
   itself in update mode, always protected there** — a different, third
   case again, see §5.2.
2. **Header fields box.** The exact Type/Priority colour-badge component
   from §5.2/WO Record View (`.equip-attrs`/`TYPE_META`/`PRIORITY_META`),
   reused, not reinvented — canonical example now in
   `sample-screen-standard-model-prototype.html` ("Header fields" card). Which two
   fields actually populate it is a per-screen configuration (Screen
   Designer, base EAM — §10/§13, not modeled in any prototype yet); until
   a real screen's config exists, **the generic default for this shell and
   this doc's own demo is Type + Status**, not Type + Priority — Priority
   happened to be §5.2's original example pairing, but it isn't
   privileged as *the* Insert Mode default.
3. **No Summary field.** Deliberately dropped from the Jira-style
   reference screenshot — not part of this standard at all.
4. **Description.** Included, using this app's own already-locked
   long-text field pattern (§3.4 "Long-text editor sizing/discard/mic-
   dictation"), not the reference screenshot's inline-expand row.
5. **Remaining fields — one flat container, required-first ordering.** No
   per-group section-cards below Description — a single container holding
   every other visible field for the selected screen, with **required
   fields surfaced at the top of that container**, other visible fields
   rendered beneath. Precedence (which fields are required/visible at
   all, and their order) is established through **Screen Designer** (base
   EAM, §10/§13) — not modeled in any prototype yet; this row documents
   the target behavior, not a working mechanism.
6. **Comments AND Documents.** Inline sections below the fields container,
   reusing the same component as Record View's own Comments/Documents
   sections (§7.2) — not a new pattern. **Whether either appears is a
   per-screen design decision, not a universal on/off** — call it out
   explicitly the same session a real Insert Mode gets built for a given
   screen, rather than assuming both are always present.

**Built 2026-07-14, generically, in `sample-screen-standard-model-prototype.html`:**
the first real, working Insert Mode sheet — reachable from any of Tab
1/2/3's List/Detail header Plus. Implements the full content order above
end to end: Organization pill (code-only, defaults `ORG1`, required) →
Header fields box (Type + Status, both pre-filled defaults) → Description
(reuses the existing long-text field pattern, §3.4) → one flat fields
container with **Priority required + Location optional** as the two
example fields (Priority starts genuinely unset, specifically so the
Save button's gray→green gate — §17.13/§3.4 — has something real to
demonstrate inside Insert Mode, not just inherit already-satisfied
defaults) → Comments (starts empty, reuses the same add/ellipsis
mechanism as Record View's own Comments) → Documents (starts empty, "+
Add document" stub — no file-attach flow exists anywhere in this app
yet, consistent with every other attachment stub). Shell mechanics: full
`inset:0` sheet (not the compact `.bottom-sheet`), ✕ close, and a working
pointer-based swipe-to-dismiss on the handle row (the first real
implementation of that gesture in this app). All of Insert Mode's own
fields use **separate LOV keys** from the outer record's own fields
(`insertOrganization`/`insertType`/`insertStatus`/`insertPriority`/
`insertLocation`, distinct from `organization`/`type`/`priority`) — Insert
Mode is creating a different record, so sharing state with whatever
record you're currently viewing would silently overwrite it, not save
anything. Every other List/Detail Plus button in every other prototype
still shows a "coming soon" toast — this is the one reference
implementation to build each real one *from*, not a claim that Insert
Mode is wired up everywhere now.

## 9.4 Home-triggered Insert Mode — two-pill header

Decided 2026-07-16. Home's Create action (part of the Home screen's
session riff, not yet locked as a whole — see the Home screen work) is the
one Insert Mode entry point that isn't already scoped to a single record
type, unlike WO List's own Create (+, §6.2) or a List/Detail tab's own
Plus (§9.3 point 1). To resolve that, this entry point's shell gains a
second pill, chained in front of the existing Organization pill (§9.3
point 1) — same `.org-pill` component reused for both, connected by a
small chevron:

**Screen/entity pill → Organization pill**

- The Screen/entity pill drives behavior, it doesn't just hold a value —
  selecting an entity re-scopes everything below it to that entity's own
  real Insert Mode content, completely reusing the exact code path as if
  Create had been triggered from that entity's own top-level list screen
  (§9.1 standard 1, e.g. WO List's Create). Nothing new is designed for
  the field content underneath; it's 100% reused per selected entity.
  This is why it's a pill and not a field — it's a mode selector, not a
  captured value.
- Every other Insert Mode entry point (WO List's own +, a List/Detail
  tab's own Plus) is already scoped to one entity and keeps the existing
  single-pill-or-no-pill treatment from §9.3 point 1, unchanged.
- **Open:** which entities populate the Screen/entity pill's option list —
  only whatever Create actions are already pinned to Home's own
  quick-create row, or every top-level record type with an Insert Mode at
  all, regardless of what's pinned to Home. Not yet resolved.

## 9.5 Built 2026-07-20 — WO and Equipment Record View inserts, end to end

First real §9.1 standard 1 ("Record View insert") builds — WO (2 entry
points: WO List's own Create, and Home's Create bar with the WO entity)
and Equipment (Home's Create bar only — no Equipment List screen exists
yet, so that's the only entry point; a dedicated List screen for it is
separate, larger scope). Both entities' Insert Mode content and the real
"After Save" navigation are now working, not just the shell.

- **Field sets (§9.3 point 5) — this session's picks are the working
  default until Screen Designer exists**, matching each entity's own real
  Record View fields, not invented ones:
  - Both entities: Header fields box = **Type/Class + Status** (the
    generic default §9.3 already names, not Type+Priority — Priority
    moved into the flat container for WO instead).
  - **WO** flat container, required-first: Department, Problem Code
    (required) → Priority, Assigned To, Reported By, Date Reported
    (optional). Plus an **Equipment reference field** positioned above
    the header fields box, same relative spot as the real WO Record View,
    required, unset by default, no auto-open (§15.5).
  - **Equipment** flat container, required-first: Department, Criticality
    (required) → Manufacturer, Category, PM WO Department, Assigned To,
    Cost Code (optional).
  - Both include Comments + Documents, starting empty (§9.3 point 6 — a
    per-screen call, made the same way for both for consistency, matching
    the Sample Screen reference).
- **Equipment reference field — new shared component**, promoted straight
  into `eam-shared.css`/`.js` (2 real consumers immediately: WO List's own
  Create, Home's WO-entity Create): a compact card (`renderRefCard()`)
  keyed off a screen-provided `REF_CARD_FIELDS` config, reusing the
  existing `openLov()`/`selectLov()` sheet rather than a new picker
  mechanism — a flat searchable list, deliberately **not** the full
  Equipment Lookup sheet's Search+Structure tabs/QR scan (that stays
  local to WO Record View, unchanged). This is visually the same `.equip-
  card` anatomy WO Record View's own Equipment field used earlier this
  session, before that screen separately reverted to its own local
  `.equip-summary-card` per user feedback (see §20's "Equipment on-record
  display diverges" row) — the two screens' Equipment fields now
  deliberately look different, tracked there, not re-litigated here.
- **After Save (§9.2), built for real**: `navigateToNewRecord(url,
  storageKey, record)` (new, `eam-shared.js`) writes the built record to
  `sessionStorage` and navigates to `<file>` (plain, no query string). WO
  Record View and Equipment Record View both check for that stored record
  on load — reading it once and immediately removing it (consume-once),
  not a `?new=1` query flag as first tried: this project's chosen local
  server (`npx serve`) 301-redirects a `.html` URL to its extensionless
  clean-URL form and drops the query string in that redirect, so the flag
  never actually arrived. sessionStorage's own presence is a more robust
  signal regardless of host, and consuming it immediately means a later
  unrelated visit to either screen can never mistake stale storage for a
  fresh record. Builds `RECORD` from the stored record instead of the
  hardcoded demo data — same screen, same Standard Update Mode, per the
  already-locked rule. Demo
  record numbers are a simple incrementing counter seeded from each
  screen's existing demo number, persisted in `localStorage`
  (`eamNextWoNumber` / `eamNextEquipNumber`) — a stated demo
  simplification, not a real numbering scheme.
- **Equipment Record View's non-Record-View tabs render empty for a new
  record** — Events, PM Schedules, Depreciation, Meters, Warranties, Parts
  Associated, and Costs all get their `rows` emptied (`renderListDetail
  Shell()` already renders an empty result set correctly), and the two
  hardcoded Performance Details / Depreciation Method cards fall back to
  the same "—" placeholder treatment Contract/Rental already used. A
  0-second-old asset has no history to show on any of them. Structure
  Details needed no change — a fabricated new equipment code simply won't
  match anything in `TREE_NODE_MAP`, which already renders "nothing
  focused" gracefully.
- **WO List (`eam-wo-list-prototype-v5_1.html`) now links `eam-shared.css`/
  `.js`** — its own Insert Mode needed the LOV-sheet/section-card/org-pill
  machinery already built there for 2 other consumers, and hand-copying a
  3rd local duplicate would have contradicted this project's own "generic
  component → shared files by default" discipline. Its pre-existing local
  duplicates (`.nav-avatar`, `.bottom-nav`, `.field-label`) are untouched,
  identical-but-local overrides — full de-duplication of those stays out
  of scope (WO List's own future full rebuild pass).

# 10. Screen Designer — Standalone (Base Screens)

Added 2026-07-15, session riff — scope captured, not yet prototyped.
Configures per-field layout for the standard model (which fields show,
which are required, their order, header-fields-box assignment — the
config knob every mobile field-precedence decision has been
forward-referencing, e.g. §9.3).

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
- **This is one of two design surfaces.** This standalone screen is for
  screens that are not workflow-driven, i.e., every Standard Record View
  (§5–§9) instance. MVP scope: two record views — **Equipment** and **Work
  Order**. The other surface is a tab on WO Workflow Setup (§13), for the
  workflow-driven screens; both surfaces share every mechanic described in
  this section.
  - The Work Order record view configured here doubles as the **WO
    fallback screen**: if a technician opens a WO that doesn't match any
    active WO Workflow Setup record, this screen renders instead of the
    5-step guided workflow. No flag on the WO Workflow Setup record gates
    this — the fallback is simply whichever screen is configured here.
- **Standalone WO fallback layout is a single universal config** (decided
  2026-07-15) — one Work Order record view, used as the fallback for every
  WO that doesn't match a workflow, not variable by WO type/department/etc.
  Matches the "two record views at MVP" framing above; revisit only if a
  concrete need for fallback variability shows up later.
- **Scope note on the Standard Model (§5–§9):** those sections' opening
  framing — "applies to every non-guided record type" — is amended by this
  section: Work Order, a workflow-driven record type, now also uses the
  exact Standard Record View pattern in the fallback case above. Not a
  contradiction — the guided workflow (§14–§19) remains the default WO
  experience whenever a workflow matches.
- **Config scope: User Group** (decided 2026-07-15, matching the base-EAM
  precedent in `EAM.ADMN.REQ.ScreenDesignerforDigitalWork` — Digital
  Work's own Screen Designer). Copy-from-Group / Save-to-Group(s), the
  latter multi-select so one save can push a layout to several groups at
  once — same mechanism, not reinvented for mobile. **Move mechanics,
  2026-07-22:** the Available/Save-to dual-listbox supports three
  equivalent ways to move a group across — the arrow buttons, drag-and-
  drop, and (added 2026-07-22) double-click a group to move it straight
  across without needing to select it first. All three are wired in
  `eam-screen-designer-v1.html`'s `moveSelectedGroups()`/`wireGroupDrag()`/
  `moveGroupItem()`.
- **§5.3 header fully locked out of Screen Designer** (decided
  2026-07-15) — the identity icon/number/description, status button,
  pin, and ellipsis are never configurable here, matching how both
  existing precedents (legacy Mobile's fixed List View key fields;
  Digital Work's non-designable Cancel/Save chrome) lock out a record's
  core identity/chrome. Only body fields below the header are in scope.
- **Mobile-only, confirmed** (2026-07-15) — Screen Designer for this app
  configures mobile layout only; it does not also govern desktop layout.
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
- **Save behavior: explicit Save, not autosave** (decided 2026-07-15) —
  Screen Designer follows the base EAM **standard model** for admin/config
  screens (explicit Save, same as Digital Work's Load/Save/Reset Layout
  buttons) rather than this app's own autosave-on-navigate rule (§5.1).
  The live mobile emulator is the only genuinely new mechanic here;
  everything else about the edit/protect/save flow follows the existing
  base **standard model**, unchanged.
- **Grouping mechanic: "New Container," not card-splitting** (decided
  2026-07-15) — no equivalent to Digital Work's "New Card Yes/No" section-
  header flag. Instead, a **New Container** action creates a new,
  admin-named field grouping that fields get dragged into. This maps
  directly onto the app's own already-locked Container/section-header
  pattern (§3.3.1) — Screen Designer authors those same containers per
  screen, rather than the prototype hard-coding them.

# 11. WO Workflow — Setup (Base EAM Admin)

**Resolved 2026-07-22 (final — supersedes both an earlier 3-screen "WO
Workflow Setup" proposal and a same-session intermediate proposal to
route WO Types to distinct `FUN_CODE`s; see §21 for both).** The real gap:
opening a WO today never surfaces a workflow unique to that WO's own
Type — a distinct tab set/order and field layout/behavior for its Record
View and subsequent tabs, driven by WO Type. Confirmed by reviewing every
column of this customer's real `R5FUNCTIONS`/`R5FUNCTIONTABS`/
`R5TABPERMISSIONS`/`R5PAGELAYOUT` export (`docs/Data_refs/Page Layouts
perms/`): none of the four carry a WO Type dimension, so nothing native
does this today.

**Decision: stay on one function, `WSJOBS`, always — including as the
fallback.** No new `FUN_CODE`s. This was seriously considered (real EAM
precedent exists for it — `FUN_APPLICATION='WSJOBS'` already groups peer
functions `CCJOBS`/`TRJOBS`/`ZJ1000`/`WSJODC` in this customer's data,
each with its own `R5FUNCTIONTABS`/`R5TABPERMISSIONS`/`R5PAGELAYOUT`
rows) but rejected: it would fragment the WO List dataspy mechanism
(§6.3/§8.3) across multiple functions' dataspy sets for no benefit here.
Staying on one function keeps that mechanism exactly as already built.

**Existing tab-level access control is completely untouched.**
`R5FUNCTIONTABS`/`R5TABPERMISSIONS` continue to gate, per the logged-in
user's group, whether a tab can ever be seen/edited at all — that's a
separate, lower "web service tier" concern this project doesn't touch.
What's new below is a layer on top: given a tab a user's group is already
allowed to see, which subset/order of tabs counts as "the workflow" for
this specific WO's Type, and how each tab's fields behave.

**The mechanism: extend Screen Designer (§10), don't build a new admin
screen.** Screen Designer already saves a field layout scoped to one or
more Groups (Copy-from-Group/Save-to-Group(s)). It gains one more
selector: **WO Type** (defaulting to "none" — the existing, ungated
fallback behavior). Picking an actual WO Type + Group(s) to save to lets
the admin configure, in that same continuous authoring flow, the 3-tier
model in §12, plus:

- **The field-level layout of the Record View and each included step** —
  the existing `R5PAGELAYOUT` mechanism, extended with exactly **one** new
  column, `WOTYPE`, alongside its existing `PLO_USERGROUP`. `PLO_PAGENAME`
  stays `WSJOBS` always — no new pagenames.

**Fallback rule (explicit design requirement, not a default-by-omission):**
a WO Type with no matching WO Workflow header row (§12) renders the plain
Standard Record View (§5–§9, no guided steps at all) and is **always**
Free Form — hardcoded, not configurable. Deliberate: the long tail of WO
Types nobody has explicitly configured must stay maximally flexible
("free form should be a requirement from a design standpoint to allow
people to do 10,000 things depending on the use case"), never accidentally
locked down by an absent config row.

**Whether a single workflow can reuse the same step type more than once**
(e.g. two Issue Parts steps) — **resolved 2026-07-22 (user direction): out
of scope for initial release.** Each of the 5 step types appears at most
once per workflow; a WO Type that genuinely needs to revisit a step type
mid-flow should use Free Form (§12) rather than the guided sequence.
Revisit only if a concrete real-world case shows up post-release.

# 12. WO Workflow — 3-tier data shape

**Refined 2026-07-22** after distinguishing what Free Form and
status-source each actually describe: status-source is a structural fact
about the WO Type itself (which status field is authoritative — it
shouldn't schizophrenically vary by who's viewing), while Free Form is a
genuine per-viewer permission-like setting (e.g. a supervisor group
getting Free Form access to a WO Type that's locked for technicians).
That means the two don't share a grain, so they don't share a row. Three
tiers, narrowest to broadest:

1. **`WOTYPE`** (existing base table) — gains **three** columns, all keyed
   by WO Type alone, no User Group dimension (same reasoning as before —
   structural facts about the type, not per-viewer):
   - **Completion Status Entity** (renamed 2026-07-22 from "status
     source" — same concept, clearer name once two more fields joined it
     below): which entity's status domain this WO Type's workflow reads/
     writes — **Work Orders** (the `EVST` status domain) or **Activities**
     (the `AAST` status domain: Not Started/In Progress/Complete,
     not-yet-built Activity Screen §20).
   - **`EVST` domain gained a 4th value, In Progress, same day** (Work
     Request/Released/**In Progress**/Closed). Not a reversal of §15.4's
     "WO status colour locked" 3-*system*-status rule (Work Request/
     Released/Closed still stands, and still carries the colour) — In
     Progress is a real *user* status nested under the Released system
     status, per that same section's own nesting model, added specifically
     so Start Work Status (below) has a value distinct from Released to
     default to, matching §15.4's original "generically 'In Progress'"
     framing instead of leaving it to reuse Released itself.
   - **Start Work Status** (new 2026-07-22 — resolves the forward
     dependency §15.4 flagged: *"WO Workflow Setup needs a field defining
     what status the WO transitions to... once the technician taps Start
     Work"*) — a specific status value, drawn from whichever domain
     Completion Status Entity selects, set when Start Work is tapped on
     WO Record View. Defaults to In Progress for either entity (`AAST` has its
     own native In Progress value); re-defaults whenever Completion Status
     Entity changes.
   - **Completion Status** (new 2026-07-22) — same shape as Start Work
     Status, but for the status set when the workflow completes.
   - **Not a branch point for WO Closing's own field set.** Explicit
     non-decision, so this doesn't get re-litigated later: WO Closing
     (Closing Codes/Downtime/Comments/Attachments) renders identically
     regardless of which entity is selected. If Completion Status Entity
     is Activities, the *real* eventual answer is likely a standalone
     Activities tab (§20, unbuilt) serving as that WO Type's actual
     closing surface instead of WO Closing — flagged as a future scoping
     option, not designed or built.
2. **WO Workflow header** (new, genuinely net-new — base EAM has nothing
   like it) — keyed **WO Type × User Group**. Holds the **Free Form /
   Not Free Form flag** (Y/N) — §15.4's status-field-editability behavior
   and the step-rail's purple-vs-Octave-Yellow colour.
3. **WO Workflow Steps** (new, child of #2) — keyed **WO Type × User
   Group × Step**. Holds, per step: **Visible** (does this step appear at
   all), **Sequence** (order), **Required** (§14.7-style bar-locking
   behavior). **Book Labor gains one more, step-specific column, 2026-
   07-22: Time Entry Mode** (Start/End Time, the only mode built in any
   prototype so far, vs. Direct Hours Entry) — resolves §18.4's own
   forward reference (*"Direct hours mode is screen-designer configurable,
   future cycle"*). No other step type has an equivalent field yet.

Only #2 and #3 are genuinely new entities; #1 is three columns on a table
that already exists. Prototyped in `eam-screen-designer-v1.html`
(`prototypes/standalone/base screens/`) — the left pane's Free Form
toggle, Completion Status Entity/Start Work Status/Completion Status
selects, and Book Labor's step-row gear icon (Time Entry Mode) map 1:1 to
tiers 1–3 above.

# 13. WO Workflow — Field Layout

Per-field layout for the Record View and each included step is
`R5PAGELAYOUT` itself, extended with the new `WOTYPE` column from §11 —
`PLO_PAGENAME` stays `WSJOBS`; `PLO_USERGROUP` + the new `PLO_WOTYPE`
together select the right row set, falling back to the WOTYPE-blank/
default rows when no WO-Type-specific override exists for that field
(same fallback shape the table already uses across `PLO_USERGROUP` today).
Screen Designer's own UI (§10), with its new WO Type selector, is the only
authoring surface — no separate "Screen Designer tab" sub-surface, no
second emulator.

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

**Shared-file status (2026-07-16):** the step rail (§14.2/§14.3) and the
standard step bar's chrome (§14.5) — background, pill, segments, timer
pill, map, and the expand/collapse toggle — now live in `shared/eam-
shared.css` + `shared/eam-shared.js` (`initStepRail()`, wired
automatically via `initSharedApp()`). Generalized when Activity
Checklist's rebuild became the 2nd real WO-workflow consumer (WO Record
View was the 1st, kept it local to itself until then — same "generalize
on 2nd consumer" precedent as Comments/Documents, §7.2). Each screen still
supplies its own step-rail-left/step-name/timer-pill/step-map content and its
own bar-readiness logic (§14.7's rule differs per step) — only the shell
is shared. The Yes/No prompt bar (§14.6) stays screen-local for now —
one consumer so far. Its old checklist-local partner, the Instructions/
Attachments info sheet, no longer exists as of the checklist's 2026-07-21
rebuild (§16.2) — Instructions was never a real field, and Attachments
became a real per-item Documents container instead.

## 14.2 Step rail (collapsed)

- Persistent at top of screen below nav — always visible
- **Two rows (redesigned 2026-07-16, Option A of 3 sketched):**
  - Row 1: current step name; expand chevron on the right
    (`.step-rail-right`), timer pill (when this step has one) alongside
    it, also on the right.
  - Row 2: a dedicated, full-width 5-segment progress bar (own row, not
    squeezed into row 1) — segments: done = green, active = purple,
    future = gray.
- Step name stays body-colour (black in light mode, white in dark) — a
  same-day follow-up briefly tried purple (matching the pill/timer/dot),
  reverted once seen live: the rail's actual wash is a light 12%-opacity
  purple tint, not as dark as a first look suggested, and black reads
  fine against it.
- Timer pill appears in the collapsed rail's right slot (alongside the
  chevron) while the WO timer is running (Steps 2–3); Book Labor (Step 4)
  shows the stopped time in its own banner instead (§18.7), not a rail
  pill; WO Record View and WO Closing (Steps 1, 5) never have a timer, so
  the right slot holds only the chevron.
- Tap or pull to expand full step map

**Relayout, 2026-07-22 (user direction) — step name left-justified,
timer moved to the rail's right side and recolored green.** Supersedes
the "left slot + absolutely-centered name" shape above: the old
`.step-rail-left` slot (timer-or-empty) and the `.nav-title`-style
absolute-centering trick on `.step-name` are both gone. `.step-name` is
now a plain `flex:1; text-align:left` sibling — same left-justified
shape `.tab-rail-name` (record tabs) already used, so the two rail
components now read consistently instead of one being centered and the
other left-justified. The timer pill moved into `.step-rail-right`,
before the chevron, and its running-state color changed from purple to
green (`rgba(0,170,20,...)` wash/border, `var(--green)` dot+text) — a
live elapsed-time readout reads clearer as "actively counting" in green
than in the rail's own purple wash color; the `.timer-pill.stopped` gray
state (Book Labor's old, now-unused rail slot) is unchanged. Applied to
all 5 WO workflow screens.

**Real bug found + fixed same session: the expanded step timer panel
(§14.9) was silently getting wiped out on every load.** `renderStepRail()`
(`eam-shared.js`) rebuilds `#stepMap`'s entire `innerHTML` from the
resolved workflow's step list — but Activity Checklist's and Issue
Parts' `.step-timer-panel` (the larger timer + Pause/Stop, §14.9) was
hardcoded as that same container's first child, so the very next
`renderStepRail()` call at init overwrote it away before a technician
ever saw it. It had genuinely been built (matches §14.9's spec exactly)
just never actually rendered — not a missing feature, a render-order
bug. Fixed by having `renderStepRail()` capture any existing
`.step-timer-panel` before overwriting `innerHTML` and re-prepend it
verbatim. Verified live: expanding the rail on Activity Checklist now
shows the real running timer value with working Pause/Stop buttons.

**Step-count pill ("2 of 5") removed app-wide, 2026-07-22 — its slot now
holds the timer instead.** The step-map's segments (row 2) and the
expanded step map (§14.3) already communicate progress; the numeric
counter was redundant chrome sitting on top of that, and its removal
freed up the rail's one non-title flex slot for the timer, which used to
share cramped space with the chevron on the right. This is effectively
sketch-option (B) from the original three (below), adopted in modified
form: (B) proposed dropping the step-count pill and sharing one row
between segments/timer/title; what's built instead keeps Option A's
two-row shell (segments still get their own dedicated row) and only
repurposes the vacated left slot for the timer — sketch (C), replacing
the 5 discrete segments with one continuous fill track, was not adopted
and remains unchosen.

**Palette pass, 2026-07-22 (§23) — wash retired, outline added, alignment
fixed.** The rail's persistent purple-tint background (and step
pill/segment-active/timer-hover purple touchpoints) are gone — see §23
for the full rule. Concretely: `.step-rail`/`.tab-rail` now sit on a
plain `--bg-section` surface with a full 1px `--border-strong` outline
(grows to wrap the expanded map too, since the map is the rail's own
child — one border rule covers both states). Outline color went through
one revision: briefly solid ink/black, reverted same day per live
feedback ("not digging the rigid black outline") to the same
`--border-strong` token every outlined icon/chip this pass already uses.
Left/right padding corrected 14px→16px — was sitting 2px left of the
`.rec-id-row`/`.rec-status-row-inner` content directly above it, a real
misalignment, not a style choice. `.tab-rail-icon` (the leading glyph
naming "the current tab," redundant next to the tab's own name) is
removed, not recolored. The now-dead `.step-pill` ("2 of 5," already
removed from markup the same day per the note above) and
`.step-map-footer` ("WO.WORKFLOW.01 - Corrective Maintenance Execution")
CSS/markup are both deleted outright.

## 14.3 Step map (expanded)

- Vertical timeline — all steps visible
- Done steps: green filled circle with checkmark
- Active step: ink (black light / white dark) filled circle, highlighted
  row background — was purple, see §23 (2026-07-22)
- Locked steps: gray bordered circle with step number
- Admin-configurable: freely jumpable or strictly linear per WO type
- **As actually built (`initStepRail()`, eam-shared.js): numbered rows are
  informational only, not tappable** — "freely jumpable" above was never
  implemented; each step is its own file, not an in-page tab, so jumping
  ahead isn't a same-page interaction the way it is for `.tab-rail`.
- **Footer note removed 2026-07-22** (was "WO.WORKFLOW.01 - Corrective
  Maintenance Execution" in the built version, not the spec's original
  "Admin configured..." text — drifted at some point, now moot either
  way) — replaced by nothing; see §14.8/§23 for what the map's new final
  section (the "Reference" group: Comments, Documents, Equipment) holds
  instead. That group's own rows ARE tappable, unlike the numbered steps
  above them, and use a plain icon instead of a numbered badge on
  purpose — see §14.8 for the full rule, not restated here.

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

## 14.6 Prompt bar — Yes/No (Option 4 segmented)

- Replaces standard bar when a branching question is triggered (e.g. "Did you issue parts?")
- Structure: monospace question label above, segmented control below
- Segmented: Yes (green fill) | No (neutral) — separated by thin divider
- Full-width edge-to-edge, border-radius on outer container only
- Yes routes to Issue Parts screen; No skips to Book Labor

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

## 14.8 Comments & Documents — reachable from any step, always

**Revised 2026-07-22 — mechanism changed, the underlying rule didn't.**
Unlike the 5 guided steps, Comments and Documents are not sequence
items — they're persistent record-level content owned by WO Record View
alone, so they don't follow the step rail's gating, locking, or the Free
Form/Not Free Form flag (§15.4). **The technician can reach either from
any step, at any point in the workflow, unconditionally.** That rule is
unchanged from the original 2026-07-16 version of this section (relocated
to §21 — the *mechanism* it specified, an ellipsis-menu entry, is
superseded).

**New mechanism: the step rail's own expanded map, via a "Reference"
group always pinned after the last numbered step** (§14.3). Reverses the
original reasoning ("not in the step map — would read as step 6/7"): in
practice, a numbered done/active/locked badge is what implied sequence
membership, not the row's mere presence in the map. Giving Reference rows
a plain icon instead of a numbered badge (§14.3) removes that implication
without needing to keep Comments/Documents out of the rail entirely — and
being inside the SAME already-familiar expand/collapse control the
technician already uses for step navigation is more discoverable than a
buried ellipsis entry.
- **Comments** and **Documents** rows jump to those sections on WO
  Record View: an in-page expand+scroll if already there, or a real
  navigation there (then expand+scroll on load) from any of the other 4
  steps — `jumpToRvSection()`/`consumeJumpToSection()` (eam-shared.js).
  They render nowhere except WO Record View itself; every other step's
  Reference row is a shortcut TO that content, not a duplicate of it.
- **Equipment** is a 3rd row, a real future per-WO equipment screen,
  stubbed as a toast for now (`jumpToEquipmentStub()`).
- Not gated by `.rail-not-free-form` at all, by construction — no
  gating logic references that class for these 3 rows.

**Stale, not yet cleaned up:** Activity Checklist, Issue Parts, and Book
Labor still carry a Comments(3)/Documents(4) ellipsis-menu entry from the
superseded mechanism (toast stubs, since the destination never existed).
Tracked in §20 — remove once each screen's own rebuild pass reaches this.

## 14.9 Step timer panel (expanded) + Stop confirmation

Added 2026-07-16, sketched first (3 layout options compared before
picking one) — see `eam-shared.css`/`.js` for `.step-timer-panel` /
`startStepTimer()` / `toggleStepTimerPause()` / `openQuestion()`.

- A larger timer readout + Pause/Stop pill buttons, sitting as the first
  child of the expanded `.step-map` — above the step list, directly under
  the still-visible collapsed title row.
- **Shown only where the collapsed rail's timer pill is RUNNING** — same
  condition as §14.2's timer pill itself, just extended to its expanded
  form. Currently that's Activity Checklist and Issue Parts only — not
  Book Labor (timer pill there is already in the *stopped* state, §18.2,
  nothing left to pause/stop by the time you reach it), and not WO Record
  View/WO Closing (no timer pill at all).
- **Pause** stops the timer counting and swaps its icon/label to Resume;
  nothing else about the screen changes. **Resume** starts it counting
  again from where it left off.
- **Stop** opens the question message (below) asking "Stop working and
  book your current time?" — Yes: stop the timer, toast-simulated
  navigation to Book Labor (real navigation doesn't exist between these
  standalone files yet — flagged, not built). No: stop the timer but stay
  on the current step; the time is captured and can be booked later. This
  applies regardless of the WO's Free Form/Not Free Form type (§15.4) —
  the Stop flow doesn't branch on it. Cancel: keep working, timer keeps
  running, dialog just closes — no special-casing needed, generic to
  `closeQuestion()`.
- **Not yet wired:** which step the technician was on when they invoked
  Stop (so they can be routed back to it later), and passing the actual
  stopped timer value into Book Labor's Timer Stopped banner (§18.1/
  §18.2) so it shows the real captured time instead of its current
  hardcoded demo value. Both need real cross-screen state, which doesn't
  exist yet (Phase 0.6, WO data files + registry, is the natural home for
  it) — deferred rather than faked with `sessionStorage` for a mechanism
  that isn't reachable through real navigation yet either.
- **Also not yet wired:** Book Labor's Timer Stopped banner should not
  render at all if no timer was ever running for that visit (only
  meaningful once the above cross-screen state exists to know that).

**Question message (Yes/No/Cancel) — new Standard Model component,
first of its kind.** Distinct from the existing 2-button confirm modal
(§3.4/§15, Cancel + Delete-style destructive actions): this is for
questions with a genuine 3-way answer, not just "destructive or not."
Same centered-modal backdrop convention, but 3 stacked full-width
buttons instead of 2 side-by-side — Yes (green, primary), No (neutral
outlined), Cancel (plain text, lowest weight) — decreasing visual weight
top to bottom, deliberately not 3-across (too cramped at the standard
280px modal width, and stacking reads the priority order better). Own
overlay (`#questionOverlay`) rather than reusing `#confirmOverlay` —
sharing one overlay between two differently-shaped modals would show
both stacked on open. `openQuestion(message, onYes, onNo)` — Cancel
never needs a callback, it's always "do nothing, close." Available for
any future screen that needs a real 3-way confirmation, not just this
timer-stop flow.

# 15. WO Workflow — Step 1: WO Record View

## 15.1 Screen sections (top to bottom)

- Work order details — asset, location, assigned to, reported by, est. duration, created.
  Collapsible (`.rv-section`/`.rv-toggle-row`/`.rv-collapse`, same shell as
  Activities/Comments/Documents below), **collapsed by default** — corrected
  2026-07-20 (5th pass); was a plain non-collapsible `.section-card` before.
- Notes — renamed from "Description". Free text field from WO record.
- Activities — expanded by default, single-select radio list. Locks bar until selection made.
- Comments — collapsed by default with count badge. Inline expand shows threaded comments.
- Documents — collapsed by default with count badge. Inline expand shows file list.

## 15.2 Activity selector

- Single select — one activity at a time. Drives all downstream steps.
- Selected activity determines: task plan checklist, planned parts, labor to book against
- Radio button fills purple on selection
- If no activities exist: show + Add Activity affordance
- **Default selection at load** (added 2026-07-16): if exactly one
  activity exists, it's auto-selected — there's nothing else to choose
  between, so don't make the technician tap a single option to confirm
  it. If more than one activity exists, none is selected by default; the
  technician must explicitly choose. `eam-wo-record-view-prototype-v1.html`
  computes this from `ACTIVITIES.length` rather than hardcoding a default
  (its 2-activity demo data previously pre-selected one at load, which
  contradicted this rule — fixed same day).
- Bottom bar stays locked (protected — same lock-icon treatment as any
  other protected control, §5.2) until an activity is selected; per the
  rule above, that means the bar starts locked whenever a WO has more than
  one activity, and starts ready when it has exactly one.
- **Edit button — non-standard, unique to this section** (added
  2026-07-16). A pencil icon in the toggle row's right side opens a
  dedicated full-screen edit popup (§15.3's hyperlinked-popup shell) for
  whichever activity is currently *selected* — not a per-row action, and
  not a generalized Standard Model pattern; no other collapsible section
  anywhere in the app gets an inline Edit affordance in its toggle row.
  Tapping it with nothing selected shows "Select an activity to edit"
  rather than opening anything. In `eam-wo-record-view-prototype-v1.html`,
  Name and Discipline are editable there; Date/Code 1/Code 2 stay
  protected/read-only — the popup exists to prove the shell can host a
  real edit form, not to cover every Activity field's edit behavior yet.

## 15.3 Collapsible sections

- Comments/Documents use the standard toggle row pattern: left icon +
  title, right gray count badge + chevron. Chevron rotates 180° when open.
- **Activities is the exception** (revised 2026-07-16) — no left icon, no
  count badge (both removed; "available" was redundant with the list
  itself, and the icon added nothing the title didn't already say). Right
  side instead holds the Edit button (§15.2) and a bigger Plus icon (both
  34px, matching this session's other bumped icon buttons, e.g. the
  header's pin/ellipsis) ahead of the chevron.

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

**Redesigned 2026-07-22 — deliberate, scoped exception to the general
protected-field rule (§3.4/§5.2's "protected = not tappable" stays the
default everywhere else, e.g. Store, Closing Codes cells).** A status
control that goes gray when protected tells the technician nothing about
the WO's actual state, and "why is this locked" is a real question for
status specifically in a way it isn't for most protected fields — so this
one explains itself instead of just going inert. Superseded: protected
previously disabled the button/pill entirely and grayed its fill colour
to `var(--bg-section)`/`var(--gray-4)` (both screens) — see §21.

**Revised 2026-07-16:** WO Closing no longer swaps to an entirely different
component per flag (an earlier draft had it borrowing Record View's own
status-forefront header for Free Form). One control, two states — the
prototype's `statusFieldProtected` flag is this same Free Form/Not Free
Form flag, inverted (`protected = Not Free Form`), now actually wired to
the resolved WO Workflow header's Free Form column (§12 tier 2) rather
than hardcoded.

**Which status field this section even governs is itself a choice** — see
§13's "Status source choice": Screen Designer lets the admin pick, per
WO-type workflow, whether the WO header status or the Activity's own
assignment status is the status these controls read/write. This section
covers editability of whichever one is selected, not which one it is.

**Resolved 2026-07-22** — see §12 tier 1's **Start Work Status** field.
Not necessarily WO header status specifically — it's scoped to whichever
entity Completion Status Entity selects for that WO Type (Work Orders'
`EVST` domain or Activities' `AAST` domain), so an Activity-driven WO Type
sets its Start Work Status on the Activity, not the WO header.

**Not exempted by this flag:** Comments and Documents (§14.8) are
reachable from any step regardless of Free Form/Not Free Form — that
exemption applies to record-level content, not to the status-editability
question this section covers, so it doesn't get a row in the table above.

**Chrome — final split, locked 2026-07-14.** Two earlier draft answers to
this same question were tried and superseded before landing here — see
§21 if you want that history. The actual split: **only WO Record View is a true Record View** and gets
the full status-forefront `.rec-header` from §5.3 — identity icon/number/
editable description, editable status button, pin, ellipsis. It has no
Plus in its header; the Activities section's own `+` (§15.2) is already the
pointed add-affordance for this screen, so a second, generic one in the
header would be redundant.

**Activity Checklist, Issue Parts, Book Labor, and WO Closing are not
Record Views — they're detail screens within the WO's workflow**, and use
the List/Detail identity-header variant defined in §8, minus that
pattern's Plus (see §8 for why WO screens specifically drop it): icon +
number + **protected** (non-editable) description + ellipsis only. No
status button, no pin — status-editing and pinning are Record-View-level
concerns, not something every step of a workflow repeats. `.wo-block` is
still retired from all 4 (and its collapse/expand JS removed entirely —
not left dead, not left duplicated alongside whichever header replaces
it — header-pattern swaps have a recurring failure mode of leaving the
old header's markup/CSS/JS half-deleted; treat every swap as delete-then-
add, not add-then-tidy). The gated `.step-rail`/`.step-map` (§14.2/§14.3) and bottom-bar
mechanism (§14) are unaffected — the identity header just sits in
`.wo-block`'s old slot, above the step rail, on every step.

**Two things found and fixed only once implementation started, across
both build passes:**
- All four nav bars had a `nav-logo` + `nav-title` block showing the WO
  number/description a second time, independent of `.wo-block` — dead
  weight even before any header change, and a second duplicate source once
  a new header went in. Removed from all four; nav is now just back-button
  (+ prototype label, §4.2) + spacer + sync control, matching WO Record
  View exactly.
- The first build pass (giving all 4 a full status+pin `.rec-header`) built
  real status-picker infrastructure for each — a self-contained mini sheet
  for Activity Checklist/Book Labor (no generic LOV system existed in
  either), a `woStatus` key added to Issue Parts' real LOV system, and a
  hook into WO Closing's existing `statusSheet`/`selectStatus()` (§19.2).
  All of that is removed again in the second pass along with the status
  button itself — none of it applies once these screens don't show status
  at all. WO Closing's `statusSheet`/`selectStatus()`/status-banner remain
  exactly as they were before either pass touched this file; only the
  header-hookup line added in the first pass is removed.

**Step rail colour also keys off this same flag.** The step/tab rail's
purple wash (§3.4, "Tab rail / step rail background") is the default for
every Standard Record View and for a **Free Form** WO — but a **Not Free
Form** WO workflow (the guided 5-step path this project prototypes) gets
Octave Yellow (#FFF500) instead, everywhere the rail would otherwise be
purple: collapsed bar wash/border/hover, and the expanded list's
active-row wash. Applying the same opacity formula already locked for
purple (§3.4): `rgba(255,245,0,.12)` background, `rgba(255,245,0,.25)`
bottom border, `rgba(255,245,0,.18)` hover, `rgba(255,245,0,.06)` active-row
wash in the expanded list. Not yet implemented in any prototype — the
Free Form/Not Free Form flag is now modeled (§12, 2026-07-22 — the new WO
Workflow Steps table) but no prototype data file reads it yet. When it's
wired: apply via the same Free Form/Not Free Form branch this table
already describes, not a separate flag.

**Status fill colour:** the prototype hardcodes a fixed code→colour map
(Operational=green, Down=red, Standby=orange) as a stand-in. In the real
system the button's fill should be data-driven — whatever icon colour is
defined on that status's user code in reference-data configuration — not a
fixed enum baked into the app. **Generalized 2026-07-16** when WO Record
View's rebuild needed it: WO's status codes aren't Equipment's, so
`eam-shared.js`'s `selectLov()` reads an optional screen-provided
`STATUS_CLASS_MAP` (falling back to the original Operational/Down/Standby
map if a screen doesn't define one) rather than hardcoding those 3 codes —
still the same 3 fill colours/classes underneath, just not locked to one
screen's code vocabulary.

**WO status colour, locked 2026-07-22 (punch-list item — Work Request had
no colour at all).** WO Record View's pre-delivered status list is now
exactly the 3 real system statuses — Work Request, Released, Closed — not
an arbitrary demo set (the old Released/In Progress/Completed/On Hold list
is gone). A customer's own user statuses nest under one of these three via
their own reference-data config; the system status is what actually
carries the colour, so pre-delivered statuses stay consistent to just
those three rather than inventing colours per user status. Industry
convention is inconsistent here (Jira: blue=open/green=closed; GitHub:
green=open/red=closed) and this app's own red is already reserved for
"needs attention" (§23), which a normal Closed status is not — so neither
precedent fit directly. Resolved instead by extending this screen's
existing green=operational/outline=standby-and-neutral vocabulary: green
is reserved for "live/active work" only (Released); both before (Work
Request) and after (Closed) render the same neutral outline, so green
never means "closed" and red is never used for a normal lifecycle state.
`STATUS_CLASS_MAP = { WAPPR: 'st-standby', RELEASED: 'st-operational',
CLOSE: 'st-standby' }`.

**Revised 2026-07-22 (later same session, user direction) — Work Request
pulled into its own 4th tier, orange.** Superseded: the paragraph above's
"both before (Work Request) and after (Closed) render the same neutral
outline" no longer holds for Work Request specifically. Mirrors a
parallel fix made the same session to WO List's own status pill
(`eam-wo-list-prototype-v5_1.html`'s `.pill-orange`, §8.3/§6.7) — that
screen's `WAPPR` code is labeled "Waiting approval" there (a different
demo vocabulary than this screen's "Work Request," same underlying
system-status code) and got pulled out of its outline tier into a solid
orange fill; the user asked for the same treatment here, on the header
status button. Closed is unaffected — still neutral/outline, still not
green, per the paragraph above. New 4th tier added to the shared
`.rec-status-btn` component (`eam-shared.css`): `st-waiting` (solid
`#F46600`, no dark-theme override needed — a solid fill, same as
`st-operational`/`st-down`). `STATUS_CLASS_MAP` here is now `{ WAPPR:
'st-waiting', RELEASED: 'st-operational', CLOSE: 'st-standby' }`. Not
extended to Equipment Record View's own `STATUS_CLASS_MAP` (Operational/
Down/Standby, no Work-Request-equivalent code exists there) — this is a
WO-specific status-vocabulary change, not a rule about the shared
`.rec-status-btn` component's available tiers in general.

## 15.5 Equipment — Equipment Lookup (Search + Structure)

Superseded 2026-07-20 — Equipment is now a real editable field, not a
read-only linked-record preview. The previous "hyperlinked popup" design
(tap → protected preview of the equipment record, "View full record" stub)
is retired; the popup shell it used is repurposed into an actual picker.

**On-record display — icon summary only (reverted 2026-07-20, 4th pass; Class/
Category dropped entirely 5th pass).** An earlier pass this session tried a
static record-card anatomy here (headline/subline/attr-rows) — that's now
WO Insert Mode's own Equipment field instead (promoted into
`eam-shared.css` as `.equip-card*` by a separate, concurrent session
building Insert Mode). WO Record View deliberately does **not** use that
shared component — local `.equip-summary-card` restores the original,
pre-redesign layout: equipment icon + Description (bold) + Code (muted
mono, 13px — bumped up from 11px 2026-07-20, 6th pass, for legibility) +
Type (purple, colour TBD data-driven per module) + chevron, tap opens the
same Search/Structure picker as before.

**Class icon is per-class, not universal (2026-07-20, 6th pass).** Only
equipment classes with a real icon defined in `EQUIP_CLASS_ICONS` get one
— **if the equipment's class has no icon defined, no icon placeholder
renders at all**: Description/Code/Type simply sit flush left against
`.equip-summary-main`'s own padding instead (no gray box, no empty slot to
fill later). Same rule for the empty/unset state (Insert Mode, once
built) — no class, so no icon there either. The 4th pass had briefly
added Class/Category back underneath as protected `.form-field` rows in
their own `section-card` — **removed again same session**, on feedback
that a lone extra container floating between the icon card and the Type/
Priority box didn't belong to any of this screen's established containers
("loosely hanging out," not fitting the standard Record View paradigm).
Class/Category are simply not shown on this screen anymore — still visible
via the Equipment Lookup sheet's Search results and Structure tree. Empty
(no equipment set — relevant once WO Insert Mode exists, §9) renders "Tap
to select equipment" with the ordinary orange required-field left bar.
**Record View and Insert Mode's Equipment fields now intentionally look
different** — flagged here as a real, visible divergence between the two
screens for the same conceptual field, not an oversight; worth a
conscious call later on whether either should converge toward the other.

**Icon is now also a photo slot, decided 2026-07-22 — see §7.5.** The
icon in `.equip-summary-card` gains a second responsibility: showing the
equipment's own photo (if one is on file) and, on tap, a preview/edit
pop-out — a distinct, smaller tap target than the rest of the card, which
still opens the picker below as before. Not yet built; §7.5 has the full
spec, including the same component's Equipment Record View consumer.

**Picker — two tabs in one full-screen sheet** (reuses the `.hyperlink-
popup` shell, same shell Insert Mode uses, X-closes-not-back-arrow):

- **Search tab — the §8.3 List Search Screen standard, not a plain LOV.**
  Reworked 2026-07-20 (2nd pass, same day): the generic `openLov()` picker
  has no slot for more than one attribute per row, so instead of a bespoke
  option list, this tab is a near-replica of the standard dataspy-scoped
  list screen — ds-bar, Detailed/List mode toggle, search bar, filter
  chips, results row, and the real `.ld-card`/`.ld-table` card/table
  anatomy — built with the SAME already-shared, stateless primitives the
  standard uses elsewhere (`renderStdCard()`/`renderStdTable()` from
  `eam-shared.js`, `.ld-card`/`.ld-table`/`.ds-bar`/`.mode-tog`/
  `.ld-search-bar`/`.filter-chip-row`/`.res-row` from `eam-shared.css`) —
  read-only reuse, no edits to either shared file. Own local shell
  function (`renderEquipSearchShell()` in the WO Record View file) rather
  than calling the shared `renderListDetailShell()` wrapper directly, for
  two concrete reasons found this session: that wrapper is hardwired to
  this app's single global tab-rail concept (`currentTab`/`TAB_RENDERERS`),
  which this tab-less screen doesn't have; and its dataspy-switcher sheet
  (`#dataspySheet`, a `.bottom-sheet`, z-index 201) sits BELOW this
  screen's `.hyperlink-popup` (z-index 220) — opening it from inside this
  picker would render invisibly behind the popup. Same "fork the shell's
  mechanism, don't edit the shared wrapper" precedent already set by
  Costs' own `renderCostsTab()` in `eam-equipment-record-view-prototype-
  v1.html`. Consequence: the ds-bar here is visually real (single "All
  Equipment" entry) but its tap is an inert "coming soon" stub, same
  treatment every other not-yet-real affordance in the app already gets —
  Equipment has no second saved view to switch to yet anyway. List mode's
  columns must stay fixed-width across rows (unlike a card, which shrinks
  per §8.3's null-field rule) — null Class/Category render as "—" in List
  mode only, cards still drop the row entirely. **Tapping a card or table
  row commits and closes immediately** — matches every other LOV field's
  behavior in the app.
- **Structure tab** — the equipment hierarchy tree (Location → Position →
  System → Asset), now genuinely interactive (previously static/non-
  interactive per §7.4, which remains open as its own separate problem for
  Equipment's own Structure Details tab in `eam-equipment-record-view-
  prototype-v1.html` — this pass only builds an interactive tree local to
  the WO Record View picker, doesn't yet generalize one). **Select-vs-
  drill disambiguation (Option B, decided 2026-07-20):** tapping a row's
  text focuses/highlights that row only and reveals an inline "Select"
  button on it; a separate trailing caret expands/collapses that row's
  children without changing focus. Three distinct controls — text = focus,
  caret = expand, inline button = commit — so browsing never accidentally
  commits. Selecting a node re-anchors the tree: it becomes the new
  current node — badged "Selected" (Inter, not the earlier "YOU ARE HERE"
  in monospace — corrected 2026-07-20, 3rd pass, purple color/pill styling
  otherwise unchanged) — and the tree re-expands to just that node's own
  ancestor chain on next open. Tree row Type labels (Location/Position/
  System/Asset) are Inter too, natural case — not force-uppercased
  monospace like the original port from Equipment's Structure Details tab
  (§7.4) used; that tab's own styling is unaffected, this only touched the
  copy inside this picker.
- **Entry-point default (corrected 2026-07-20, 3rd pass):** the sheet
  defaults to **Structure**, not Search, whenever equipment is already
  selected — i.e. every time it's opened from WO Record View today — badged
  "Selected"/expanded to that equipment's own node immediately, since
  there's already something to orient around. It only defaults to Search
  when equipment is unset (WO Insert Mode's future empty-state entry,
  §9/§20 — not built yet), where Structure would have no current node to
  anchor on anyway.
- **Insert Mode note (§9, WO Insert Mode itself not started — see §20):**
  the empty-state card above does **not** auto-open this sheet on screen
  entry — consistent with every other required field's Insert Mode
  treatment (tap to open, not forced). Locked now so whoever builds WO
  Insert Mode later doesn't have to re-decide it.

**Quick equipment entry — QR scan.** Added 2026-07-20, relocated same day
(2nd pass, on user feedback). A camera icon-button gives a one-tap
shortcut to identify equipment by scanning its QR tag, bypassing
Search/Structure browsing entirely. **One icon, one spot:**
`.equip-search-scan-btn`, trailing inside the Search tab's own
`.ld-search-bar`, immediately to the right of the "Search Equipment"
input. Earlier drafts also placed a copy directly on the record-view
field and another in the sheet header — both removed; the record view
itself carries no equipment-scanning affordance of its own now, only the
Equipment Lookup sheet does.

No real device camera integration — this is a static `file://` prototype.
The overlay is a mock viewfinder (reticle + instructional text); its
"Simulate scan" button always resolves to the same demo equipment record,
standing in for a real scan result so the flow is reproducible. Sits at
z-index 230, above both `.bottom-sheet` (201) and `.hyperlink-popup` (220).

**WO Insert Mode carries this over automatically, no separate work
needed:** since Insert Mode's Equipment field is meant to reuse this same
Equipment Lookup sheet (§9 shell + this section's picker), its scan icon is
already present the moment Insert Mode is built — nothing standalone to
add there anymore now that the record-view copy is gone.

**Search/Structure toggle — restyled to match Detailed/List (2026-07-20,
2nd pass).** Was its own bespoke pill pair (purple-tinted active state) —
looked inconsistent sitting right above the Detailed/List toggle's
black/white segmented-control treatment, and didn't declare its own
`font-family` (buttons don't inherit it by default), so it wasn't reliably
rendering in Inter either. Now the tab bar literally reuses `.mode-tog`/
`.mode-btn` from `eam-shared.css` — the exact same component as
Detailed/List, not a lookalike — so both toggles in this sheet share one
visual language: muted segmented track, active segment gets a white/card
background + subtle shadow + near-black text, Inter throughout.

# 16. WO Workflow — Step 2: Activity Checklist

**Rebuilt again 2026-07-21 — "Focused Stepper" (v1 → v2,
`eam-activity-checklist-prototype-v2.html`), superseding the 2026-07-16
grouped-scroll-list rebuild below (that version is retired to
`prototypes/standalone/old versions/`).** This was a deliberate,
user-driven redesign, not a conformance fix — the grouped-list-of-dense-
cards anatomy in the original §16.1/§16.2 below is gone; everything past
this note describes the current, locked model. Explored first as 3
sibling mockup directions in `prototypes/standalone/mockups/` (compact-
rows-with-detail-sheet, this focused stepper, and adaptive-collapse-
with-filters) — only the stepper was carried into the real file; the
other two remain mockup-only reference material, not competing specs.
Comments and Documents are *also* still reachable from this screen's
ellipsis (§14.8's `#recActionsScreenSpecific` slot) for the WO as a
whole, alongside Print Work Order, as toast stubs — unrelated to and
unchanged by §16.2's new per-*item* Comments/Documents below.

## 16.1 Screen shape — one item at a time

- The screen shows exactly one checklist item at a time, not a scrolling
  list — Prev/Next (`#stepperNav`) is the primary navigation. A
  checklist item legitimately carries a lot (answer control, Notes,
  Follow-up, Comments, Documents, sometimes Equipment); showing them all
  inline in a fixed-height list card meant most of that chrome sat idle
  on every item whether or not it applied.
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
5. **Follow-up** (`.followup-btn-lg`) — full-width, orange-outlined
   button, not a small pill competing with others. Flagging it reveals
   **Create Follow-up WO** (`.create-fu-wo-btn`) immediately below —
   hidden entirely, not just disabled, until Follow-up is flagged.
6. **Notes** — a real, always-visible field, same shape as UDF01 on
   `sample-screen-standard-model-prototype.html` (§5.2): a `.form-field`
   with a `.field-inline-input` textarea, 255 chars, auto-grow. Not
   hidden behind a tap-to-expand trigger.
7. **Equipment** (only on an equipment-scoped item) — a plain, always-
   visible `.form-field.protected` row, code + description, same shape
   as any other protected field in the app. Tried both as a dark
   identity-style banner and as a collapsible section earlier in this
   rebuild; both were rejected — equipment context for the item you're
   answering should never require a tap to see. This is a different
   component from the checklist's older `.item-equip` badge (retired
   with v1) and unrelated to Insert Mode's Equipment LOV convergence
   (§9.3) — that field is editable and elsewhere; this one is read-only
   and scoped to one checklist item.
8. **Comments** and **Documents** (`.rv-section`/`.rv-toggle-row`/
   `.rv-collapse`) — real per-item containers, reusing the exact shared
   §7.2 data-driven pattern (`renderCommentsExcerptMount()`/
   `renderDocumentsExcerptMount()` from `eam-shared.js`) that Equipment/
   WO Record View already use for the whole record. Since only one item
   is focused at a time, the shared `COMMENTS_DATA`/`DOCUMENTS_DATA`
   globals are simply rebound to the focused item's own arrays on every
   render — the shared functions don't know or care that the "record"
   is actually one checklist item. Collapsed by default, same as any
   other consumer. Supersedes v1's Attachments, which was a read-only
   info-sheet listing filenames as plain text.

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

New in the 2026-07-21 rebuild — real functionality, not previously
represented in any checklist prototype. An item can carry
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

# 17. WO Workflow — Step 3: Issue Parts

Added in session: May 2026. Prototype: eam-wo-prototype-issue-parts-v1.html

**Rebuilt 2026-07-16** onto `shared/eam-shared.css` + `shared/eam-shared.js`
— the 3rd real WO-workflow consumer of the step-rail/bottom-bar chrome and
the first to prove out reuse of the shared sheet/lov-option primitives
under a genuinely different LOV pattern (see the note below). Also: added
the timer pill to the step rail (§14.2 says it shows on Steps 2–4 while
running — this file never had one); fixed Quick Issue All Planned Parts'
border-radius to a true pill (10px rounded-rect before, contradicting
§17.6/§17.14's own "pill shape" wording); Comments/Documents added to the
ellipsis's screen-specific slot per §14.8. `.btn-outlined` (Component
Patterns table above) gained `display:flex` — Add Parts (§17.5) is its
first real icon+label consumer, and the shared rule never anticipated
that layout.

**Store/Bin/Lot LOV picking stayed local, deliberately** — not converted
to the shared `openLov()`/`selectLov()` single-field pattern. Genuinely
different shape: options are computed dynamically per open sheet (which
part, which store, a Bin→Lot cascade), and the LOV sheet nests *above* an
already-open Issue/Return sheet rather than being the only sheet on
screen (own `#lovOverlay`/`#lovSheet` z-index so closing the picker
doesn't dismiss the parent). Reuses the shared sheet/lov-option markup and
CSS throughout — only the option-resolution logic is local. The local
`filterLovOptions()` override was dropped entirely in favor of the shared
one — identical behavior, one less duplicate.

**Save button stays a locked local override** of the shared black-
contained `.btn-save` default (§17.13's white-contained spec predates the
shared file's own `.btn-save` and still wins on this screen specifically).

**Conformance/UX follow-up pass, same day (2026-07-16):** this file had a
blanket local override forcing every `.form-field .field-value` to
monospace, which violated the locked, screen-agnostic "codes render in
monospace, descriptions never do" rule (§3.4) — it caught Available Qty
(a formatted number, not a code) along with the genuine identifiers
(Store/Bin/Lot/Asset ID), and gave Store a non-standard 600-weight
"highlighted" treatment with no doc basis. Fixed: mono is now opt-in via
an explicit `.field-value.mono` class, applied only to the real
identifier fields; Available Qty and everything else render like any
other Standard Model field value. Also fixed the ad hoc Add Part flow's
redundant extra tap and replaced its Issue/Return toggle with Issue/
Planned — see 17.8/17.9 for both.

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
- Purple tint background, lives directly below screen header

## 17.4 Planned parts list

- One card per planned part, ordered as planned on the activity
- Card anatomy: left status bar (gray → green on issue) | part number (purple monospace) | description | meta row | qty badge | Quick Issue/Return button
- Meta row shows: UOM value · Store · Bin — Activity is NOT shown (inherited through workflow)
- Qty badge: purple "8 EA" (planned) → green "8 EA ✓" (issued)
- Quick Issue/Return button: outlined pill, becomes green "Issued · Return?" after issue
- Cards update in-place when issued — no separate issued list

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
- Orange warning banner: "Verify quantities before issuing — Adjust any quantity if needed, then tap Issue All to confirm"
- One row per un-issued part: part number (purple) | description | bin · available qty
- Inline stepper per row: − / qty / + — defaults to planned qty, min 1, max available stock
- Qty value flashes purple briefly when adjusted to confirm the change registered
- Footer: Cancel (gray outlined) + Issue All buttons
- Issue All executes with whatever qtys are shown — updates card badges accordingly

## 17.8 Issue/Return sheet — planned parts

- Opens from Quick Issue/Return button on a part card
- Issue / Return segment control at top — drives transaction mode throughout
- **Return is disabled (grayed, non-interactive) until the part has actually been issued** (fixed 2026-07-16) — previously tappable regardless of state, which let a technician "return" inventory that had never been issued. Gated on `issued[partId]`; re-evaluated every time the sheet opens.
- Part identity shown as purple header block (part number + description) — NOT repeated as an editable LOV row below
- **Store is a pill above the part block, not a field row** (moved 2026-07-16) — same pill component (icon + monospace code + chevron) the main screen header already uses for its storeroom selector, reused here instead of a plain `.form-field` LOV row. Editable (chevron) in Issue mode.
- Issue mode field order: Store pill → part block → Available Qty + bin stock list → Bin → Lot (conditional) → Transaction Qty → Asset ID
- **Return mode has its own, different field set** (changed 2026-07-16) — Available Qty and the bin stock list answer "where can I get more of this," which isn't the relevant question on a return, so neither appears. Store pill is now protected (lock icon, not tappable — a return goes back to wherever it was issued from, not a free pick). Field order: Store pill (protected) → part block → **Issued Qty** (protected — how much actually came out against this WO) → Bin (protected) → Lot (protected, conditional) → **Return Qty** (stepper, min 1, max = issued qty) → Asset ID (protected)

## 17.9 Add Part sheet — ad hoc

- Opens from Add Parts button, straight into the search state — no intermediate "tap to reveal search" screen (collapsed 2026-07-16; the prior two-tap flow — a centred search-icon block you had to tap before the actual search field appeared — was a redundant extra step)
- Store pill sits above the part field, same as 17.8, always editable here — ad hoc only ever Issues or Plans, never Returns
- **Part field is a big tappable block (search icon + "Search or scan a part" headline + hint text) that invokes the device camera/barcode scanner** (`invokeCameraScan()`, currently a toast stub, same convention as Print Work Order/Comments/Documents) — restored 2026-07-16 after the redundant-tap fix above had removed it along with the screen it used to gate. A small search bar sits directly below it, always visible, and filters the same list live as typed — only the big block triggers the camera; the search bar's own leading icon stays the shared, decorative one, so there's exactly one scan trigger, not two.
- Results list shown immediately below the search bar (full list, filters live as typed)
- Once a part is selected, the search block + bar are replaced by the purple part header (same as planned parts sheet)
- **Segment control is Issue / Planned, not Issue / Return** (changed 2026-07-16) — this sheet only ever issues a part immediately or adds it to the plan for a later issue; Return doesn't apply to inventory that was never issued through this flow. Defaults to Issue. Return stays exclusive to 17.8's planned-parts sheet, where it's gated on the part already being issued.
- Same field order as planned parts sheet's Issue mode below the part block

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

- SHOWLOT is a storeroom-level configuration flag (YES / NO)
- When SHOWLOT=YES: Lot LOV row is shown in the form, and lot column appears in the bin stock list
- When SHOWLOT=NO: Lot row is hidden entirely — do not show an empty or dash state, remove the row
- Lot column in the bin stock list is also hidden when SHOWLOT=NO
- Prototype renders SHOWLOT=YES by default for the primary store (IND-MAIN)
- **Built 2026-07-14** (Issue Parts rebuild): previously this was a design
  comment only, with no real flag anywhere in the file. Now a genuine
  per-store `showLot` value drives both the Lot row and the bin-stock-list
  lot tag — switching to the prototype's second store (IND-SOUTH,
  SHOWLOT=NO) demonstrates the row disappearing live, not just documented
  intent.

## 17.13 Save button

- **Reuses the shared gray→green `.insert-save-btn`** (changed 2026-07-16, at explicit request) — gray/disabled until required fields are satisfied, green and clickable once ready. Same pattern as Book Labor's Add/Add-by-Crew Save. No local CSS override; the Quick Issue All confirmation sheet's Cancel/Issue All buttons were also switched to `.btn-outlined`/`.insert-save-btn.ready` (always-ready) for consistency, since they shared the old override's CSS class.
- Superseded: white background, dark text, 50px height, full-width pill; hover aqua (#00FFFF) background, very dark text; explicitly NOT teal #007B87 (not in the Octave palette) and NOT the green-ready pattern. This was a deliberate, explicitly-reasoned choice at the time — logged here rather than deleted, per the doc's convention for superseded decisions — but the aqua hover read as visually "off" against the rest of the screen once other screens (Book Labor) established the green-ready pattern as the norm, and it was dropped in favor of matching that norm.

## 17.14 Button hierarchy on main screen

| Button | Role |
| --- | --- |
| **Quick Issue All Planned Parts** | Primary action — Octave Black contained button. White text. Most impactful action on the screen. |
| **Add Parts** | Secondary action — Octave outlined button. Solid Gray 5 border, full-opacity text, pill shape. Aqua on hover. NOT dashed, NOT muted. |
| **Quick Issue/Return (per card)** | Tertiary action — outlined pill per card. Becomes green "Issued · Return?" after issue. |

# 18. WO Workflow — Step 4: Book Labor

Added in session: May 2026. Prototype: eam-book-labor-prototype-v2.html (v1 superseded — do not use).

**Rebuilt 2026-07-16** onto `shared/eam-shared.css` + `shared/eam-shared.js`
— the 4th real WO-workflow consumer of the step-rail/bottom-bar chrome.
Two new shared modifiers came out of this rebuild, both on components that
already existed for other screens:
- `.timer-pill.stopped`/`.timer-dot.stopped` (§18.2) — gray, no pulse.
  The WO timer stops when Book Labor is reached, so its step-rail timer
  pill needs a visually distinct state from the purple/pulsing "running"
  pill Steps 2–3 show; this is that 2nd real state of the shared
  component, added generically rather than duplicated locally.
- `.insert-save-btn.danger-ready` (§18.6) — always-ready red, for the
  Correction sheet's Save. The Add Labor and Add by Crew sheets' own
  Save buttons switched to the plain shared `.insert-save-btn` (gray→
  green) instead of keeping this screen's own near-identical local
  `.btn-save`/`.ready` pair — same visual states already existed
  verbatim in `eam-shared.css` for Insert Mode.

Header, step rail, bottom bar, confirm modal, and the outlined Add
buttons (§18.1's "outlined, side by side") all converted the same way as
Steps 2–3. Comments (3)/Documents (4) added to the ellipsis per §14.8. The
Type of Hours / Employee "cycle on tap" LOV stand-in and the crew
selector pill (§18.5, same pattern as Issue Parts' store selector) stayed
local — genuinely screen-specific, no 2nd consumer for either yet.

## 18.1 Screen anatomy (top to bottom)

- Nav bar (dark)
- WO identity block (collapsible, collapsed by default at this step)
- Step rail — "4 of 5 · Book Labor" + stopped timer pill (e.g. 01:23:47)
- Timer banner — purple, shows elapsed time + start/end times loaded from the WO timer
- Screen header — "Book Labor" + record count
- Labor list — inline-expand rows
- Add Labor + Add by Crew buttons (outlined, side by side)
- Activity summary cards — Total hours / Technicians / Entries
- Bottom bar — auto-ready, "Next: WO Closing"

## 18.2 Timer integration

- The WO Record View "Start" button starts the WO timer
- Timer is visible as a small running pill in the collapsed step rail during Steps 2–4
- When Book Labor is reached, the timer stops; its value loads into the timer banner and pre-fills the Add Labor form start/end times

## 18.3 Labor list rows

- Row display: description (full name) primary; code (employee ID) small + muted, stacked directly beneath it — not inline beside it (corrected 2026-07-21, see §18.7)
- Meta row: date + trade only — no time range
- Tap row → expands inline to show detail grid + "Create correction" action
- No Edit action — correction is the only action on booked labor (records are immutable after booking)
- Detail grid values are description-only, e.g. "Maintenance", "Technician" — corrected 2026-07-21, this line previously (and incorrectly) claimed a "Description (CODE)" bracket format that was never actually implemented anywhere and directly contradicts §3.4's locked, already-app-wide "Detail grid values: description only" rule. Follow §3.4, not this row, if the two ever seem to disagree again.

## 18.4 Add Labor sheet

- Start/End time entry only in every prototype so far — **the "screen-designer configurable, future cycle" flag is resolved 2026-07-22**, see §12 tier 3's Book Labor Time Entry Mode field; Direct Hours Entry as an actual alternate form on this screen is still not built, only the config flag that would drive it
- Start/end times pre-filled from the stopped WO timer
- Required fields gate the Save button: gray + no-cursor until complete, green + ready when satisfied

**Redesigned 2026-07-16** — layout and cross-field behavior, same screen:
- **Type of Hours** — a colour-coded pill, top-left (not a form-field row): Normal purple, Overtime orange, Double time red, Standby gray (same semantics as the checklist's toggle fill colours, §16.4).
- **Employee + Crew** — double-wide picker cards side by side, mutually exclusive. Both start **cleared and optional** on launch — neither is required to book labor. Picking one clears + protects the other (dimmed, chevron swaps to a lock icon, tap is a no-op with a toast) and derives Department/Trade from whichever was picked; Department/Trade stay manually cycle-editable afterward. Reopening the sheet resets everything back to this launch state — the only "undo" path once one side is picked.
  - Employee's demo cycle-list keeps the app's "current user" identity (Bruce Campbell/BCAMPBELL — same person as `CURRENT_USER_NAME` elsewhere) first, so it's the first candidate reached, without pre-filling the card before any tap.
- **Labor Details** — Activity/Department/Trade moved into a collapsible container (§7.2 pattern), delivered **collapsed**.
- **Date** — a pill (no leading icon), opens the same shared calendar sheet every other screen uses (`openDate()`/`selectDate()`) — not a separate one-off. Required a small `eam-shared.js` generalization: `selectDate()`/`clearDate()` now call an optional per-key `DATE_ON_SELECT` hook (same pattern as `LOV_ON_SELECT`) so a screen with its own non-Standard-Model required-field gating (like this one's `data-value`/`data-required` scheme) can re-sync after a date is picked.
- **Start → End time** — two big monospace-free time chips joined by a duration connector badge, replacing three stacked rows. The chips are real `<input type="time">` elements just restyled — tapping one still opens the OS's native time picker (a genuine scroll wheel on iOS/Android; desktop shows its own platform spinner instead of a wheel — a rendering difference between platforms, not a different control).
- **Add by Crew button removed** from the main screen — only "Add labor" remains, centered, same width/style as before. The "Add Labor by Crew" sheet itself (and its own separate crew-selector-pill flow, §18.5) is unchanged but currently unreachable from this screen as a result — flagged as a follow-up decision, not deleted outright.

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
| **No time entry mode toggle (on this screen)** | Start/End time only, still. The config flag itself is resolved — §12 tier 3's Book Labor Time Entry Mode, 2026-07-22 — but Direct Hours Entry as an actual alternate form isn't built here yet. |
| **Crew selector** | Pill at top of Add by Crew sheet, above member list. Defaults from activity. Changing reloads member list. |
| **Correction stepper** | 1-minute tap. Hold 3s → 15-minute repeat at 150ms interval. Stops on pointerup/pointerleave. |
| **Labor row display** | Description (full name) primary; code (employee ID) small + muted, stacked directly beneath it — not inline beside it (changed 2026-07-21, matching the app's own standard `.picker-card-value`/`.picker-card-code` stacking, `.labor-row-code`). Date + trade only in meta — no time range. |

LOV visibility, detail-grid formatting, save-button gating, and field-value
colour all follow the Standard Model defaults (§3.4) — no exception on this
screen.

**Overhaul pass, 2026-07-21** — wired to Phase 0.6 data, brought current on
several Standard Model defaults this screen had drifted from:

| Decision | Detail |
| --- | --- |
| **Wired to data/employees.js + data/crews.js + data/wo-19257.js** | Employee/Crew lists and the booked-labor list itself now source from Phase 0.6's shared data files instead of local hardcoded arrays/HTML — this screen's first real consumer of that data beyond Custom Fields. Small property-name adapters (`name`→`desc`, `memberCodes`→`members`) keep the rest of the file's existing code unchanged. |
| **No avatar anywhere on this screen** | The circular initials avatar is removed from the labor list, Add Labor's Employee/Crew picker cards, and Add by Crew's member rows. The hours pill (`.labor-hours-badge`) stays — it was never in question. |
| **No redundant screen title/section label** | "Book Labor" (screen title) and "Booked labor" (section label) removed — both duplicated the step rail's own step-name and the identity header; this screen never needed them to orient the technician. |
| **Add Labor promoted to `.btn-contained`, full-width** | Was `.btn-outlined` at a fixed 200px, centered. Now stretches to match the labor-list card above it and uses the same Octave Black contained-primary treatment as Issue Parts' "Quick Issue All" (§17.14) — it's the only real action on this screen now that Add by Crew isn't reachable from here. `.btn-contained` is a new generalized shared class (`eam-shared.css`), Book Labor its 2nd real consumer after Issue Parts' near-identical local `.btn-quick-issue-all` (flagged as a future convergence candidate, not migrated preemptively). |
| **Add Labor's Department/Trade rows now show code + description** | Had drifted to description-only, predating §3.4's plain-LOV-field code+description default being locked. Now the standard two-part `.field-lov-code`/`.field-lov-desc` layout. Type of Hours stays description-only — it's a colour-coded pill/badge, not a plain LOV row, same exemption as Type/Priority elsewhere. **The detail grid was deliberately left description-only** — see the §18.3 correction below; it was never actually a description-only vs. code+description drift to begin with. |
| **Dates switched to MM/DD/YYYY** | Follows the app-wide `isoToDisplay()` change (§3.4) — was spelled-month ("May 19, 2026"). |
| **Timer Stopped banner restyled** | Onto a heading+message shell matching `.sync-error-banner`'s structure (bold heading line, muted message line) instead of the old icon-in-a-circle 3-column layout — no literal shared component exists for this exact banner, but the structural pattern now matches. **Simplified further same day:** dropped the message line entirely ("Loaded into labor booking · 08:00 → 09:23") — heading ("Timer Stopped," bumped 13px→15px) and the time value (moved to its own line beneath, bumped to 22px) are now the whole banner. **De-purpled, same day again:** plain neutral card (`var(--bg-card)`/`var(--border)`) instead of a purple-tinted background, heading and value both switched to body colour (black/white by theme) — only the small clock icon keeps its purple stroke, as a single accent touch. Brings this banner into compliance with §3.4's own "purple reserved for step pill/section badges/focus states — never field values" rule, which the all-purple version had been quietly violating. |
| **Step rail's timer pill removed on this screen** | The collapsed step rail no longer shows a `.timer-pill.stopped` pill — the Timer Stopped banner is now the only place the stopped time displays; showing it twice (rail + banner) was redundant. No other screen currently instantiates the `.stopped` timer-pill state, so this doesn't affect anything shared — `.timer-pill.stopped`/`.timer-dot.stopped` stay defined in `eam-shared.css` as a documented state of the component, just unused for now. |
| **Timer Stopped banner + Add Labor auto-open are gated on real arrival, not unconditional** | Added 2026-07-21 (corrects the same-day entry above, which had them always firing). Both only apply when the technician arrives via a genuine guided-workflow hand-off — tapping "Next: Book Labor" on Issue Parts — not a freeflow visit (step map, direct link, WO List row tap), where no timer actually just stopped. Implemented with a consume-once `sessionStorage` flag (`eamArrivedViaNextStep`), same pattern as `navigateToNewRecord()`'s Insert Mode hand-off (§9.5). Issue Parts' "Next: Book Labor" button now sets the flag and does a real `window.location.href` navigation — **the first "Next" button in these standalones to actually navigate rather than toast-stub.** Book Labor's `applyArrivalState()` reads + immediately clears the flag at init: present → show banner, call `openAddLaborSheet()` (pre-filling Start/End from `STOPPED_TIMER_START`/`STOPPED_TIMER_END`); absent → banner hidden, sheet stays closed. Every other "Next"/step-map link in the app is still a toast stub, so it naturally falls into the freeflow (no-flag) case with no extra work needed. |
| **Add Labor sheet reorganized into the Standard Model's own order** | Added 2026-07-21. Was: Type of Hours pill → double-wide Employee/Crew picker cards → Labor Details (Activity/Department/Trade) → "Time" label → Date/Hours/Start/End grid. Now: Type of Hours pill → **one Header Fields grid holding Employee, Crew, Date Worked, Hours Worked, Start Time, End Time together** (2-per-row, 3 rows) → Labor Details, moved to the bottom. This is just the Standard Model's Header Fields box (§5.2) applied consistently — Employee/Crew are plain-LOV-shaped fields like any other, so they belong in the same box as Date Worked/Hours Worked/Start/End, sitting directly under the top pill selector like Header Fields always does, not off in their own bespoke double-wide component. The "Time" section label is gone — there's no separate Time section anymore, just more Header Fields cells. Employee's old double-wide `.picker-card` component is retired entirely (its mutual-exclusion-with-Crew behavior carries over as `.attr-item.protected`, a plain dimmed state — no chevron-to-lock-icon swap, since `.attr-item` cells never had a chevron to swap in the first place). Employee still shows its code stacked beneath the description (`.attr-text-code`) — the one Header Fields exception already established for identifier fields; Crew stays description-only. |
| **Date Worked / Hours Worked / Start Time / End Time — one Header Fields grid** | Added 2026-07-21, revised twice same day (see row above for the 2nd revision, folding Employee/Crew into the same grid). Reuses the shared `.section-card`/`.equip-attrs`/`.attr-item` shell (Equipment's own Header Fields box uses the same pattern via its screen-local `fieldRowAttr()`) instead of the old standalone `.date-pill` and the bespoke big-time-chip/duration-connector treatment. Start/End are still real `<input type="time">` elements (native OS picker), just restyled to sit inline in a plain `.attr-value` cell using the shared `.time-input` class — the old connector-arrow duration badge is gone, superseded by Hours Worked itself. Hours Worked is directly editable (not protected) via the shared numeric edit sheet, first real use of it on this screen — real system makes this editability a Screen-Designer-configurable per-field flag, not modeled here, always editable in this prototype. **Font/alignment bug found and fixed same day:** the time inputs' font-size/weight were hardcoded on `.time-input` itself (14px/500, copied from `.field-value`'s convention) and didn't actually match either real context it appears in — `.attr-text`'s Header Fields convention is 14px/**600**. Rescoped to `.form-field .time-input` (14px/500) and `.attr-value .time-input` (14px/600) so it always matches whichever convention actually surrounds it. Right-alignment was already correct as-is — every field value in this app is right-aligned (label-left/value-right), not a text-vs-time-specific rule. |
| **Hours Worked ↔ End Time — bidirectional, Start Time always the anchor** | Real system behavior, implemented as described: editing Start or End Time recomputes Hours Worked (`recalcHours()`, now also writing the decimal-hours field). Editing Hours Worked directly instead recomputes End Time, holding Start Time fixed (`recalcEndFromHours()`) — Start Time is never derived from anything, it's always the independent variable. Wired through a new shared `EDIT_ON_SAVE` hook in `eam-shared.js`'s `saveEdit()` (3rd instance of the same per-key-hook pattern as `LOV_ON_SELECT`/`DATE_ON_SELECT`), so the shared numeric edit sheet needed no Book-Labor-specific branching. |
| **Activity summary: "Trades" removed same day it was added** | An Activity only ever has one trade, so "distinct trades booked" was always trivially "1" — a real metric mistake, not a UI nit. Removed outright rather than kept as dead weight. |
| **Activity summary: WO Est./Regular/OT Hours added** | WO Est. Hours is fixed, sourced from the Activity's own planned/estimated hours — **invented** (no real Activity data model with an Estimated Hours field exists anywhere in this app yet) — and deliberately *not* derived from booked labor, so it reads as a plan-vs-actual comparison. WO Regular/OT Hours are real sums of booked minutes bucketed by Type of Hours code (`N`/`OT`), read off each labor row's own `data-minutes`/`data-type-code` attributes rather than re-parsing display text. Total Hours (pre-existing metric) is now also a real sum over the same data — previously a `rows.length * 83` placeholder that ignored what was actually entered. |
| **`saveAddLabor()` now reads the sheet's real values** | Corrects a pre-existing gap surfaced while wiring the Regular/OT sums: this function previously booked a hardcoded demo row (`'10:00'`/`'11:30'`/`'1h 30m'`) regardless of what the technician actually set on the sheet. Now reads Start/End/Type of Hours/Department/Trade straight off their live DOM state. |

**Overhaul pass, 2026-07-22** — converts the sheet's last "cycle on tap" demo
interactions into real LOV search, fixes two bugs the conversion surfaced,
and restores a regression:

| Decision | Detail |
| --- | --- |
| **Employee, Crew, and Type of Hours now open the shared `openLov()` search sheet, not cycle-on-tap** | Previously flagged (§18.1 note [5]) as a deliberate prototype-only stand-in — no longer true once Add Labor became a real Header Fields consumer. All three now go through the standard `LOV_DATA`/`LOV_CURRENT`/`LOV_ON_SELECT` pattern: Employee and Crew each list-search the real `data/employees.js`/`data/crews.js` rosters (`NO_SEARCH_LOVS` not set for either); Type of Hours stays a short fixed list with search hidden (`NO_SEARCH_LOVS`), matching Closing Codes' own short-list convention (§19.3). Employee/Crew mutual exclusion (`.attr-item.protected`) and dept/trade derivation carry over unchanged from the cycle-on-tap version, just triggered from `onEmployeeLovSelected()`/`onCrewLovSelected()` instead of the old cycle handlers. |
| **Bug found: `#lovSheet` markup was entirely missing from this file** | This screen never had the shared LOV sheet HTML at all — it had gotten this far only because Employee/Crew/Type of Hours were cycle-on-tap and never actually opened it. Copied verbatim from `eam-equipment-record-view-prototype-v1.html`; `closeAllSheets()` updated to dismiss it as a third nested-sheet type alongside `dateSheet`/`editSheet`. |
| **Bug found: `saveAddLabor()` never read the Crew field, only Employee** | A real correctness gap, not a Round-5 regression — surfaced by testing the Crew path for the first time once it became reachable via real LOV selection. The function read `fv-employee-code` with a hardcoded `'JRODRIGUEZ'` fallback and had no Crew branch at all, so booking labor against a Crew silently mislabeled the row with a stub employee. Fixed: reads whichever of Employee/Crew is actually populated (they're already mutually exclusive via `.attr-item.protected`); `empNames` lookup extended to also cover `EAM_CREWS` codes so `addLaborRow()`'s existing code→display-name resolution works unchanged for either case. |
| **Bug found: tap-anywhere-to-open-picker regression on `.time-input`** | The now-retired `.time-chip` class (superseded 2026-07-21, see §21) stretched its invisible `::-webkit-calendar-picker-indicator` over the full field so tapping anywhere opened the native time picker, not just the small clock glyph. That CSS was dropped when Start/End Time moved onto the shared `.time-input` class and never re-added — a real regression, not a pre-existing limitation. Restored on `.time-input` itself in `eam-shared.css` (`position:relative` on the base rule, `width:100%;height:100%` on the indicator pseudo-element) so every current and future consumer gets it, not just this screen. Confirmed the indicator pseudo-element now computes to the input's full width; the `lang="en-GB"` 24-hour hint remains a separate, still-accepted platform limitation (§3.4) — unrelated to this fix. |

**Real system behavior clarified, 2026-07-22 — booking labor against a Crew
expands into one row per employee, not one row for the crew:**

| Decision | Detail |
| --- | --- |
| **Booking against a Crew books every employee currently assigned to it** | The real system has no concept of a labor row "for a crew" — Crew is a convenience picker in the Add Labor sheet, but saving always books individual employees. Selecting Crew and saving now adds one `addLaborRow()` per employee currently assigned to that crew (same date/Start/End/Type of Hours for each), not a single row carrying the crew's own code. Corrects the previous session's fix (which had gotten this far enough to stop mislabeling the row, but still booked one row for the crew itself — a reasonable first read of "the crew field wasn't being used," but not the real rule). |
| **New junction file: `data/crew_employees.js` (`EAM_CREW_EMPLOYEES`)** | Crew × Employee assignment, matching this app's existing entity/junction split (`parts_stock.js`, `wo_parts_lines.js` are the precedent — junction data gets its own file, never nested onto the entity record). Invented (no real export for this relationship exists yet), exactly 2 employees per crew, never `BCAMPBELL` (he's the technician executing this WO, not a crew member being booked against): BLUE → Charles Weaver (`CWEAVER`) + William Stone (`WSTONE`); RED → Derek Smith (`DSMITH`) + Rosa Fernandez (`RFERNANDEZ`); YELLOW → William Irving (`WIRVING`) + James McGarity (`JMCGARITY`). `data/crews.js`'s existing `memberCodes` field is now legacy — it only still feeds the unreachable "Add by Crew" sheet (§18.5) — a comment on that file flags not to extend it expecting it to affect real Crew-booking behavior. |
| **Each expanded row uses that employee's own Department/Trade, not the crew's** | The Add Labor sheet's Department/Trade fields (derived from the Crew's own generic dept/trade when Crew is selected, for display in the sheet itself) are **not** what gets written to each expanded row — each row instead looks up its own employee's real dept/trade from `data/employees.js`, since dept/trade should describe who actually did the work. Surfaced a real employee-facing gap in the process: `tradeNames`'s display-label lookup had no entry for the `TECH-II` trade code (WSTONE's), rendering the raw code instead of a label — added `'Technician II'`. |

**6th follow-up pass, 2026-07-22 (user direction) — timer-stop hand-off
smoothing:**

| Decision | Detail |
| --- | --- |
| **Add Labor auto-open now defaults Employee to the current logged-on user** | Only on the real timer-stop hand-off (`applyArrivalState()`'s `arrivedViaNextStep` branch, §18.7 above) — a freeflow open of the sheet still launches with Employee cleared/optional, unchanged. Rationale: the technician who just stopped their own WO timer is booking their own time, not picking a name from a list, so leaving Employee empty on that specific path made them do a lookup for themselves. `openAddLaborSheet(prefillCurrentUser)` takes a new optional flag; when true it sets Employee to `employees[0]` (BCAMPBELL, already the app-wide "current user" convention, §18.7's Employee LOV note) via the same field-write + `onEmployeeLovSelected()` side effects a real LOV pick triggers (Crew protected, dept/trade derived) — not a shortcut path that skips them. |
| **Timer Stopped banner collapsed onto one row** | Was two stacked rows (heading line, then the elapsed-time value beneath it via `margin-top`). `.timer-banner` is now `display:flex;justify-content:space-between`, heading+icon on the left, the time value on the right (font-size trimmed 22px→18px so it reads as a value beside the heading, not a second headline). No color/content change — still the neutral black/white card from the earlier de-purpling pass, just one row instead of two. |

# 19. WO Workflow — Step 5: WO Closing

Added in session: May 2026. Prototype: eam-wo-closing-prototype-v2.html
— rebuilt onto the shared-file architecture 2026-07-16 (§14.1); v1
retired to `prototypes/standalone/old versions/`.

## 19.1 Screen anatomy (top to bottom)

- Nav bar (dark)
- WO identity block (collapsible)
- Step rail — "5 of 5 · WO Closing", all 4 prior segments green
- Status banner — current status (e.g. Released) → target status (tappable chip)
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
- **Colour vocabulary unified with the Record View header button's
  `STATUS_CLASS_MAP`, 2026-07-22** — was its own independent
  green/gray/**orange** set (`fill-completed`/`fill-closed`/`fill-onhold`);
  On Hold is **red** now, matching the header's `HOLD: 'st-down'` mapping
  (was orange here, a real cross-screen clash for the same status — same
  status must never render two different colours depending on which
  screen shows it). Completed stays green (`fill-completed` = the header's
  `st-operational`, already aligned). Closed stays its own gray — the
  header's own status LOV never offers a Closed option to compare against,
  so no collision risk there, and gray for a terminal/inactive state reads
  fine as a 4th value alongside the reused 3. "From" pill's colour is
  hardcoded to Released's green (was a fixed, unrelated blue regardless of
  the actual status) — this demo has no mechanism to vary the WO's own
  current status independent of the close flow, so there's no live
  mapping to wire, just the one value that's ever actually shown.
- Both pills share one explicit box model (height/line-height/box-sizing)
  so the "from" `<div>` and the "to" `<button>` line up exactly — a bare
  `<button>` otherwise picks up the browser's own default font metrics.
- **Protected state**, per §15.4 (redesigned 2026-07-22): the "to" pill
  keeps its real fill colour and stays tappable — only the chevron swaps
  to a lock icon. Tapping shows a toast explaining why instead of opening
  the picker. This is a deliberate exception to the general protected-
  field treatment (§5.2's usual gray/muted/inert), not that treatment
  itself — see §15.4 for why. Toggled off a single `statusFieldProtected`
  flag, now wired to the resolved WO Workflow header's Free Form column
  (§12 tier 2) instead of a hardcoded constant.
- **Target-status picker sheet is the plain LOV sheet, not a bespoke
  design** (fixed 2026-07-16). It had drifted into its own thing — a
  `sheet-header` (title-left/close-right) instead of the standard field-
  edit `sheet-header-fe` (close/title-center/Clear), an explanatory "Statuses
  available to BCAMPBELL…" caption row with no equivalent anywhere else, and
  `.lov-option-code` rows carrying full descriptive sentences instead of a
  short code. Same fix Equipment's `__status` LOV already models: plain
  `sheet-header-fe` (Clear hidden — target status is always required, same
  as `__status`'s `ALWAYS_REQUIRED_LOVS` membership), no search row (short
  fixed list), plain description + short code (`COMPLETED`/`CLOSED`/
  `ON_HOLD`) + checkmark rows, no caption, no colour in the list itself
  (colour lives on the target pill, not the picker).

Superseded: the small-mono-chip banner with retinting-per-status (Option
A) — see §21.

## 19.3 Closing codes — 2×2 grid, sequential unlock

- Four cells: Problem / Failure / Cause / Action
- Code + description both shown, in the cell and in the LOV sheet rows — brought in line 2026-07-16 with §3.4's always-code+description default (the description-only treatment this section previously specified was itself superseded, see §21). Code convention for these four lists is `<letter>-0xx` — `P-001`, `F-001`, `C-001`, `A-001` — a placeholder scheme standing in for the eventual admin-configured code lists.
- LOV sheet includes a search row (filters on code + description) — uses the shared `.lov-search-row`/`.lov-search-input` CSS directly (this file links `eam-shared.css` as of the 2026-07-16 rebuild), but the sheet itself (`#codeLovSheet`) and its `openCodeLov`/`selectCodeLov`/`clearCodeLov`/`filterCodeLovOptions` functions stay local and distinctly named — a 4-key cascading-clear shape the shared single-key `openLov()` has no equivalent for, and reusing the shared function *names* would silently shadow them screen-wide once this file loads `eam-shared.js`.
- Sequential unlock — each cell dims until the previous is set: Problem may be pre-filled; Failure unlocks on Problem, Cause on Failure, Action on Cause
- **Required marker on unlock** (added 2026-07-16): the moment a cell unlocks it gets the standard orange required-bar (`.code-cell.required`, same rule as `.form-field.required`) — required never shows while a cell is protected/locked, and appears unconditionally (regardless of fill state) the instant it isn't. Problem has it from load since it's never locked. Toggled in `refreshSequentialLocks()` in lockstep with `field-locked`.
- Lock indicator: small circular lock icon in cell footer when locked; swaps to chevron when unlocked
- Each tap opens an LOV sheet
- Cell label matches `.field-label` exactly — Inter (`--font-sans`), 13px, no bold, no letter-spacing, sentence case. Was mistakenly 11px/700/uppercase/letter-spaced/JetBrains Mono, a leftover mini-eyebrow style; fixed in two passes 2026-07-16 (font-family first, then the remaining ALL CAPS/weight/size residue once flagged separately).

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

## 19.8 Design decisions locked (WO Closing)

| Decision | Detail |
| --- | --- |
| **WO Details section removed** | Tech already knows the WO. Screen starts with status banner then codes. |
| **Closing codes: 2×2 grid** | Code + description both shown (§3.4 default — these are reference-data codes, not system codes, so the always-code+description rule applies). Label matches `.field-label` exactly, including sentence case (not the ALL CAPS it briefly had). Sequential unlock — each cell dims until previous is set. |
| **Closing codes: required marker on unlock** (2026-07-16) | Orange required-bar appears the instant a cell unlocks — never while protected, unconditional (not fill-state-dependent) once unlocked. Same rule as `.form-field.required`. |
| **Closing codes: LOV search** (2026-07-16) | Search row filters on code + description, reusing the shared `.lov-search-row` markup/CSS locally. |
| **Section headers — no badge pill** (2026-07-16) | Closing Codes / Downtime Details / Closing Comments / Attachments headers dropped their Optional/Required/count badge pills — title only, matching the `.section-card-header` convention already standard elsewhere (e.g. Book Labor's Labor Details). |
| **All 4 section cards are collapsible** (2026-07-16) | See §3.4 "Every container is collapsible." Closing Codes/Closing Comments default open (required); Downtime Details/Attachments default collapsed (optional). |
| **Target-status picker rows are description-only** (2026-07-16) | See §3.4 "System codes: always description-only" — corrects the same-day earlier pass that had given these rows short mono codes (`COMPLETED`/`CLOSED`/`ON_HOLD`), which was itself already wrong per the (until-then-unwritten) system-codes rule. |
| **Bar meta — status wording, not instruction** (2026-07-16) | Locked-state label reads "Comments required" (a state), not "Add closing comments" (an instruction) — matches the neutral progress-label convention siblings use ("0/4 issued", "Required: 0/5"). |
| **Status change control: Option D** (locked 2026-07-16, superseded Option A — see §21) | See §19.2 for the full description. |
| **Downtime Details: own section** | Date completed (auto-defaulted, editable), Downtime hours, Downtime cost. All optional. Sits between Closing Codes and Closing Comments. |
| **Attachments: list rows not grid** | Type-coded icon + filename + meta row. Tap → viewer sheet. No thumbnail grid — list scales to any file type. |
| **Attachment source picker** | Three options: Camera, Photo library, File or document. Each has distinct icon + description. |
| **Viewer sheet** | Full-screen sheet. Photo = coloured placeholder. Document = file icon + Open (native handoff). Both have Remove button → confirmation sheet. |
| **Quick-remove** | ✕ button on each row removes without opening viewer. |
| **No attachment limit** | Open-ended. Admin can configure if needed in a later cycle. |
| **Bar gate** | Comments required only. Codes, downtime, attachments are all optional. |

# 20. Remaining Work

| Item | Detail |
| --- | --- |
| **Resolved 2026-07-22: single WO base function (`WSJOBS`), always — WO Type surfaced via Screen Designer + a new WO Workflow Steps table instead** | Was an open discussion (added 2026-07-22, flagged by the user). Real EAM precedent for a multi-`FUN_CODE` approach exists in this customer's data (`CCJOBS`/`TRJOBS`/`ZJ1000`/`WSJODC` all under `FUN_APPLICATION='WSJOBS'`) and was seriously considered, but rejected — it would've fragmented the WO List dataspy mechanism (§6.3/§8.3) across multiple functions' dataspy sets. Final answer stays on one function; full resolution in §11–§13. The dataspy-selector mechanism is therefore unaffected by any of this — there's still only ever one function's dataspy set. |
| **Equipment Photo — icon/preview pop-out/edit, decided 2026-07-22, not built** | See §7.5 (new) and §15.5's cross-reference. Two consumers: WO Record View's Equipment LOV icon (`.equip-summary-card`, §15.5) and Equipment Record View's own header (`.rec-id-row`, §5.3 — which has no icon slot at all today). Open: exact placement/size for the new icon slot in Equipment RV's header; whether the photo's preview pop-out (a new variant of §19.6's viewer sheet, swapping the existing Remove action for an added Edit) should also keep Remove; what Equipment RV's icon shows when there's no photo, since — unlike WO Record View, which falls back to its existing per-class icon rule — it has no prior fallback to drop back to. |
| **Unified prototype compile** | eam-wo-prototype-full-v1.html — all five steps in one navigable file. Assembly brief in EAM-HANDOFF-Book-Labor-and-WO-Closing.md. Dark mode default; canonical nav/WO block/step rail from the Issue Parts prototype; step-state-driven rail variations; end-to-end timer behaviour. |
| **Date fields still show stale spelled-month literals on 3 screens** | `isoToDisplay()` changed app-wide 2026-07-21 to plain numeric format (§3.4), and Book Labor's own dates were updated to match — but `eam-wo-record-view-prototype-v1.html`, `eam-equipment-record-view-prototype-v1.html`, and `sample-screen-standard-model-prototype.html` all have hardcoded initial-render date text ("May 19, 2026" style) baked into their markup, not generated through `isoToDisplay()` at load — changing the function alone doesn't fix already-baked-in literals. Only actually re-picking a date via the shared calendar sheet on those screens will show the new format; everything else still reads stale until each file gets its own pass. **`eam-wo-closing-prototype-v2.html` fixed 2026-07-21** (dropped from this list) — also surfaced and fixed the actual reason re-picking a date wouldn't have helped there: shared `saveDateTime()` (`eam-shared.js`) rendered `month:'short'` instead of `isoToDisplay()`'s numeric format, a shared-file bug now fixed at the source (also corrects Sample Screen's date-time field, its only other consumer — Sample Screen's plain `openDate()` date field, listed above, is a separate, still-stale literal). |
| **Date/time formatting is hardcoded to `en-US`, not actually locale-driven — flag for final-review accuracy** | Added 2026-07-21. `isoToDisplay()` and `saveDateTime()` both hardcode `'en-US'` today, producing MM/DD/YYYY dates and (now-corrected) 24-hour times for everyone regardless of who's logged in. The *real* rule: dates should follow the logged-in user's own locale (this app targets North America/Europe/Asia at minimum — DD/MM/YYYY and YYYY/MM/DD are real cases), while time-of-day stays a fixed 24-hour business rule regardless of locale (see the row above — that part is deliberate, not a gap). No per-user locale/session concept exists anywhere in this prototype to actually drive the date-format switch. Needs a real pass before treating any screen's current MM/DD/YYYY rendering as the final, locked behavior for every user. |
| **Activity Screen** | Timer, task plan reference, assignment status. Ref: Activity_Selector.png. A future standalone Activities tab — flagged 2026-07-22 alongside §12's Completion Status Entity work — could double as the real closing surface for Activity-driven WO Types, instead of WO Closing; not designed, not built. |
| **Screen Designer riff, 2026-07-22 — items considered and explicitly deferred, not built** | Reviewed against `eam-screen-designer-v1.html` (base screens): (1) per-step "allow skip with reason," a "jump target" dropdown, "repeat allowed," and admin-only internal per-step notes — all speculative UI from the earliest workflow-designer mockup (`eam-workflow-designer-v1_1.html`), never promoted into this doc as real requirements, and still not adopted; (2) checklist item authoring (the 17 item types, §16.3, and dynamic branching rules, §16.5) is Task Plan/Digital Work content, a different admin surface than Screen Designer's field-layout scope — don't conflate the two; (3) the List Search 4-filter-chip config (§10's own separate named sub-scope) is unrelated to WO step configuration and wasn't touched this pass. None of the three are being tracked as "to build" — noted here only so they aren't re-derived from scratch if revisited. |
| **Per-row sync affordance (WO List)** | Map the 3 offline-search row states (stub / hydrated / ephemeral) onto the existing 4-state sync control language at row level. Specified in the offline search architecture; not yet in the v5.1 prototype. |
| **Index freshness caption (WO List)** | "Results as of <time>" caption when offline. Specified; not yet in the v5.1 prototype. |
| **Bin pre-fill from stock list** | Selecting a bin in the bin stock list pre-fills the Bin LOV. Specified in §17.11; not yet prototyped. |
| **WO Insert Mode** | Built 2026-07-20. Two entry points: WO List's own Create (+), single org pill (§9.3 point 1); Home's Create bar with the WO entity selected (§9.4). Both build a real WO record and hand off via `navigateToNewRecord()` — see the new §9.3 "Built 2026-07-20" note below. Equipment's empty-state behavior is per §15.5 (renders as an unset required record-card, no auto-open) — but Insert Mode's own Equipment field is a lighter flat searchable list (new shared `.equip-card`/`renderRefCard()`/`REF_CARD_FIELDS` component in `eam-shared.css`/`.js`), **not** the full Equipment Lookup sheet's Search+Structure tabs/QR scan — a deliberate simplification, since Insert Mode is creating a record, not browsing an existing hierarchy. |
| **Equipment Insert Mode** | Built 2026-07-20, reachable only via Home's Create bar with the Equipment entity selected (§9.4) — no dedicated Equipment List/Search screen exists yet (separate, larger scope, not built this pass), so there's no second, already-entity-scoped entry point the way WO List gives WO. Lands on Equipment Record View via the same sessionStorage hand-off; that screen also blanks its non-Record-View tabs (Events/PM/Depreciation/Meters/Warranties/Parts Associated/Costs) and the two hardcoded Performance Details/Depreciation Method cards for a freshly-created record — a brand-new asset has no history on any of them. |
| **Equipment field — converged onto one "Equipment LOV," 2026-07-21 (user direction)** | Resolved. Was tracked here as 3 divergent implementations (WO RV's full Search+Structure picker, Insert Mode's lighter generic LOV, Checklist's read-only badge). By explicit user call: WO Insert Mode is now converged onto WO Record View's full Search+Structure two-tab picker (promoted to `eam-shared.css`/`.js`, `useEquipmentLookup` flag on `REF_CARD_FIELDS`), named **Equipment LOV**; the Checklist badge stays deliberately separate, named **Equipment ID Badge**, not part of this convergence. On-field display (`.equip-summary-card` vs `.equip-card`) was explicitly out of scope for this decision and flagged as its own open question — **resolved 2026-07-22** (2nd punch-list pass, user direction): Insert Mode's `.equip-card` is gone, `renderRefCard()` now renders the exact same `.equip-summary-card` markup as WO Record View via a shared `equipSummaryCardHTML()` helper in `eam-shared.js`. See `docs/component-library.md`'s Equipment LOV entry. |
| **Naming drift: "Activity Row"/"Labor Row" vs. "Part Card" for the same conceptual thing** | Added 2026-07-21, surfaced while naming the Activity Selector's individual rows. The app has no single term for "a multi-field record inside a selectable/expandable list" — WO Record View's Activity Selector calls its entries Activity Rows, Book Labor calls its equivalent a Labor Row, Issue Parts calls its equivalent a Part Card. Not fixed — flagged for whenever this naming gets standardized. See `docs/component-library.md`'s Activity Selector entry. |
| **Insert Mode post-save navigation — built 2026-07-20** | §9.2's "After Save" rule is now real for WO and Equipment: `navigateToNewRecord(url, storageKey, record)` (new, `eam-shared.js`) writes the entered record to `sessionStorage` and navigates to the plain record-view URL (no query string — see §9.5's note on why `?new=1` doesn't survive this project's `npx serve` clean-URL redirect). Both WO Record View and Equipment Record View read that stored record once on load, immediately removing it (consume-once), and build `RECORD` from it (with this app's existing `{code:'',desc:''}` unset shape for anything not entered) instead of their hardcoded demo record — same screen, Standard Update Mode, no special "just created" state, per the locked rule. Still stubbed: every *other* List/Detail Plus's Insert Mode (§9.1 standard 2) — this row only covers the two Record View inserts. |
| **Standard Update Mode** | Update flows for equipment and other non-workflow records — the standard (non-guided) record view pattern. In progress — see §5.1. |
| **Record-view child tabs** | Child list / detail tabs for standard record views — selection layout. **Largely resolved** — see §8. One piece already locked (§5.3 Scope, 2026-07-14): these child tabs never repeat the parent record's status button or pin/ellipsis header actions — that header is the parent record's identity, not the child tab's. Still open: the generic-case ellipsis menu contents (§8), and the Structure Details tree pattern (§7.4). |
| **Login** | Not started. See §4.1. |
| **Sync Status Screen** | Corrected 2026-07-21 (UI inventory pass) — this row was stale: `eam-sync-status-prototype-v1.html` was actually built 2026-07-20 (sync panel, protection rules, error banner, all per §4.4/§4.5). Not "not started"; see CLAUDE.md's log for that date. |
| **Navigation Bar — bottom nav + avatar built; Profile contents and Search's own header still open** | Bottom nav bar (Home/Work/Notifications), its glass visual treatment, and the top-left avatar/back toggle are all decided and built, see §4.2–§4.3 — avatar lives in `eam-shared.css`, exercised in `eam-home-screen-prototype-v1.html` and now WO List's main header too (browsing tier), and already correct, unchanged, on WO/Equipment Record View (record-open tier). Still open: Profile screen contents (§4.3), and WO List's separate Search sub-screen still shows a back button instead of the avatar (§4.2 "Search" bullet). |
| **Workflow Execution Setup — retired, no merge needed** | The 3 base admin screens this row referred to were never actually added to project knowledge, and the "WO Workflow Setup" entity they'd have documented is now itself retired (§11–§13, 2026-07-22) — real EAM admin surfaces (Screen Designer, tab permissions) cover the same ground natively. Nothing left to merge. |
| **Punch-list mechanism decision** | Option A (static sync dataspy, group/user level) vs. Option B (PIN projection) — kickoff decision. On decision: if B, merge PIN spec per its plan; if A, document dataspy configuration model here. See §2.6. |
| **Tiered record model review** | On approval: merge tier-model architecture into §2. |
| **`openWO()` still a toast stub** | WO List's row tap doesn't yet wire into the WO Record View entry point (§15). |
| **Comments/Documents — dual treatment** | Both need the compact inline Record View section (built, §7.2) AND a standalone dedicated tab for viewing/managing the full thread on its own screen. Not yet designed which record types need the standalone tab vs. inline-only, or both always. |
| **WO Record View Comments — no interactivity yet** | WO Record View has a Comments *section* (§15.1) but no add/edit/delete/copy — the ellipsis/edit/delete mechanics built for Equipment and the reference file (§7.2) haven't been ported here. A new feature for this screen, not a conformance fix. |
| **WO timer placement + pause/resume** | Today the timer only appears as a pill in the collapsed step rail (§14.2), starts automatically on "Start Work" (§15), and runs uninterrupted through Steps 2–4 with no pause. Two open questions: (1) keep it in the step rail or move to the nav bar so it stays visible while the rail is scrolled/collapsed; (2) whether pause/resume should exist, and if so whether it's a per-WO-type configuration flag on WO Workflow Setup (§11), same family as the Free Form/Not Free Form flag (§15.4). Not designed, not prototyped. |
| **Tab rail / step rail — inconsistent class name** | Same component under two names: `.tab-rail` in Equipment, `.step-rail` in all 5 WO standalones + the compiled prototype. Converge on one name next time either is touched. |
| **Fixed 2026-07-20 — tab-less screens' content mount needs its own flex passthrough** | WO Record View has no tab system (§14.1) — content mounts once into a plain `#recordContentSlot` div rather than a `.tab-content[data-tab]` panel. That div was never `display:flex;flex-direction:column;flex:1;min-height:0` like `.app` itself, so its child `.content`'s shared `flex:1;overflow-y:auto` was inert — harmless while content stayed shorter than the viewport, silently broke scrolling entirely (no scrollbar, `.app`'s `overflow:clip` just clips dead) once it grew past it. Fixed locally in this file; **if any future WO-workflow screen copies this tab-less mount pattern, give its own mount div the same flex passthrough from the start.** |
| **Open decision: Activity Checklist's Checkbox-type control vs. the generic checkbox pattern** | Carried forward through the 2026-07-21 rebuild, component renamed: §3.4's generic checkbox rule makes the entire row the tap target, sized to a compact list row. The Checkbox-type item's control (`.f-chk`, §16.2/§16.3) is now a large, centered, full-width tap target by design — the focused one-item-at-a-time screen has the room a compact row never did, and deliberately uses it. Call still needed: is this divergence now *more* justified (different context, not just a leftover), or should it converge? |
| **Step rail: Octave Yellow for Not Free Form WO workflows — built and verified** | §15.4/§3.2's rule (purple wash default; Octave Yellow for Not Free Form) is now wired end to end: the Free Form flag (§12 tier 2, WO Workflow header keyed WO Type × User Group) drives it via `renderStepRail()`/`applyWorkflowTypeHeader()` (`eam-shared.js`), verified live across all 5 WO-workflow screens on all 3 demo WOs (BRKD=yellow, PM=purple, ROUT=no rail, §11 fallback) through the `cycleDemoWo()` dev toggle. |
| **WO Closing status-change control — protected/unprotected flag now wired** | Option D (§19.2) previously drove `statusFieldProtected` from a hardcoded `false` const. Now set from the resolved WO Workflow header's Free Form column (§12 tier 2) in `onDemoWoChanged()`, verified live (protected on BRKD, unprotected on PM). See §15.4/§19.2 for the same-day redesign of what "protected" actually looks like now (colour stays, lock icon, tappable-with-toast) — this row is just about the flag being real, not hardcoded. |
| **WO Closing → post-close navigation — partially built** | Corrected 2026-07-16 (conformance audit) — this row was stale: `executeClose()` already navigates to `eam-wo-list-prototype-v5_1.html` after the "Work Order Closed" overlay shows briefly (1.4s), it does not stay up indefinitely. What's still actually open: that navigation is a plain page load with no state passed, so WO List always lands on its own hardcoded default dataspy (`ds1`) rather than re-running whichever dataspy the user had selected before opening WO Closing. Real cross-screen state-passing is what the unified compile needs to add. |

**Below added 2026-07-21, code-level UI component inventory pass (`docs/ui-component-inventory.md`) — a static CSS/markup audit for visual-consistency drift across every live screen, done ahead of the compile/handoff pass. Full detail lives in that doc. All 12 findings below were fixed the same session — kept here (not deleted) as the record of what was found and how it was resolved.**

| **UI inventory — WO RV's field group uses wrong section class** | **Fixed 2026-07-21.** Was `.rv-section` instead of `.fg-section` on "Work order details," so it never got the required-count badge an equivalent Equipment container gets automatically via `updateRequiredBadges()`. Converted to `.fg-section`/`toggleFg(this)` markup. See ui-component-inventory.md §3. |
| **UI inventory — `.bottom-nav` still local, drifted z-index, and CLAUDE.md's status claim was wrong** | **Fixed 2026-07-21.** Promoted to `eam-shared.css` (2 consumers — Home, WO List — already satisfied the "promote on 2nd consumer" rule), standardized on `z-index:50` (matching `.bottom-bar`), local copies removed from both files. CLAUDE.md's inaccurate "already promoted" claim is now actually true. See ui-component-inventory.md §2. |
| **UI inventory — Sync Status Screen card omits timestamp** | **Fixed 2026-07-21.** `renderSyncErrorCard`'s subline now appends `· ${item.timestamp}`, matching what the sync panel already shows for the same record. See ui-component-inventory.md §5a. |
| **UI inventory — Sync Status Screen has no sync control on its own nav bar** | **Fixed 2026-07-21.** Added `<span id="syncCtrl">` to its `.nav-actions` — `initSharedApp()`'s existing `renderSyncControl()` call now has an element to render into. See ui-component-inventory.md §2. |
| **UI inventory — row-title/identifier text size drift across screen-local "row card" family** | **Fixed 2026-07-21.** `.labor-row-name` (Book Labor) and `.attach-row-name` (WO Closing) bumped 13px→14px to match Checklist/Issue Parts' row-title convention; `.labor-row-code` bumped 10px→11px to match the app's other identifier mono text. See ui-component-inventory.md §5b. |
| **UI inventory — `.crew-selector-pill` light-mode background didn't match `.store-selector`** | **Fixed 2026-07-21.** Light-mode background changed to `var(--bg-section)`, matching `.store-selector` per §18.5's "same pattern" intent (previously only converged in dark mode). See ui-component-inventory.md §7. |
| **UI inventory — WO Closing's `.btn-cancel`/`.btn-close-wo` duplicated shared buttons with different specs** | **Fixed 2026-07-21.** Both removed; markup now uses shared `.btn-outlined` (Cancel) and `.insert-save-btn.ready` (Close Work Order) directly. See ui-component-inventory.md §6. |
| **UI inventory — un-converged button duplicates** | **Fixed 2026-07-21.** `.btn-quick-issue-all` (Issue Parts) converged onto `.btn-contained`; local CSS removed, markup/JS updated. See ui-component-inventory.md §6. |
| **UI inventory — Equipment vs. WO Structure Details tree fonts had drifted** | **Fixed 2026-07-21.** WO's `.tree-type`/`.tree-here` switched to `font-family:var(--font-mono)` (+ `text-transform:uppercase` on `.tree-type`), matching Equipment's original. See ui-component-inventory.md §10. |
| **UI inventory — tertiary per-row outlined-pill button had 3 different sizes, no shared class** | **Decided and built 2026-07-21** — Issue Parts' 34px/13px spec picked as the standard (user call). New shared `.row-action-btn` (+ `.success`/`.danger` variants, replacing screen-local `.issued-state`/`.danger`) added to `eam-shared.css`; Issue Parts' `.btn-quick-issue`, Book Labor's `.detail-btn`, and WO Closing's `.viewer-action-btn` all converged onto it, local CSS removed from all three. See ui-component-inventory.md §6. |
| **Stale "Brian Campbell" reference found during the inventory pass** | **Fixed 2026-07-21.** `eam-shared.js`'s sync-demo data (`assignedTo` on WO 19257, and 2 Labor Start/Stop item subs) still had the pre-rename name — CLAUDE.md already flags this as fix-on-sight. Corrected to Bruce Campbell, matching every other consumer. |

**Below added 2026-07-21, component library pass (`docs/component-library.md`) — a behavioral/rules mapping of 3 named components (Equipment field variants, Activity Selector, Booked Labor List), done at the user's request to hunt down cross-screen discrepancies by proper name rather than CSS class.**

| **Activity Selector — no cross-screen hand-off for `selectedActivity`** | Added 2026-07-21. Once a technician moves past WO Record View into Activity Checklist, Issue Parts, or Book Labor, none of those screens shows which Activity is in scope, and no session/URL hand-off mechanism for `RECORD.selectedActivity` was found anywhere. Harmless today (every demo WO has exactly 1 Activity, which auto-selects) but undefined the moment a WO has 2+. See `docs/component-library.md`'s Activity Selector entry. |
| **Booked Labor's Correction sheet content is hardcoded demo data, not real fields** | Added 2026-07-21. The always-ready red Save button is intentional (§18.6 — correction is deliberate, never gated), but the sheet's actual employee/hours-type/department/trade/duration values are all fixed demo constants (`saveCorrection()`), not technician-entered — not previously called out as a gap distinct from the gating behavior. See `docs/component-library.md`'s Booked Labor List entry. |
| **Booked Labor List has no defined sort/grouping rule** | Added 2026-07-21. Rows render in pure insertion order (seed data, then anything booked/corrected after). Fine at today's scale (1-2 rows); flag if this list is ever expected to hold more in a real deployment — chronological or by-employee would be the obvious real-app choice but isn't specified anywhere. See `docs/component-library.md`'s Booked Labor List entry. |
| **Date-selector calendar popup — font should be revisited to be all Inter** | Added 2026-07-22. `.cal-month-label` and `.cal-weekday` in `eam-shared.css` still use `font-family:var(--font-mono)`; flagged for a later pass to bring them onto the app's standard Inter font, consistent with everything else. No other change requested alongside this — noted only, not fixed this round. |

**Below added 2026-07-22, app-wide palette + nav rollout pass (§23–§25).**

| **Stale ellipsis Comments/Documents entries** | Activity Checklist, Issue Parts, and Book Labor still carry a Comments(3)/Documents(4) toast-stub entry in their ellipsis menu — the mechanism §14.8 originally specified, now superseded by the step rail's Reference group (§14.8, §21). Remove once each screen's own rebuild pass reaches this; not urgent (they're inert stubs, not broken), just stale. |
| **Search List screen dataspy/filter persistence — not built** | §24's locked rule is that a Record View's back button always returns to the entity's Search List screen "maintaining the user's dataspy and persisting any filters." There is no real filter/dataspy state anywhere yet (WO List's dataspy switcher and Equipment List's dataspy bar are both still static stubs), so there's nothing to persist today — the navigation *target* is correct and built; the persistence *mechanism* is a real task for whenever filtering is actually built on these screens. |

**Below added 2026-07-16, full conformance audit (5 parallel reviews — canonical files, WO workflow, WO List/Search, Home, doc structure) plus a cross-cutting fix pass.** Items that were shared-component or canonical-file bugs, or the same bug pattern recurring across ≥2 files, were fixed directly that same session (see the file-level comments they left behind, e.g. `.org-pill.required` in `eam-shared.css`, the `.rv-section` Comments/Documents wiring in both canonical files, `.bar-meta` restored on 4 WO-workflow bottom bars, the reversed sheet headers in Book Labor/WO Closing). Everything below is genuinely per-screen and was deliberately left alone this pass.

| **WO Record View — missing Notes section** | §15.1 lists "Notes — renamed from 'Description'. Free text field from WO record" as part of the screen's section order; no such field exists anywhere in `eam-wo-record-view-prototype-v1.html`. |
| **WO Record View — field set vs. §15.1 conflict, needs reconciling (not just a code fix)** | §15.1's text says Work Order Details should show "asset, location, assigned to, reported by, est. duration, created." The actual screen shows Department/Assigned To/Reported By/Date Reported/Problem Code — location and est. duration don't exist. The top-of-doc changelog describes *this exact* field set as the intended rebuild output, so it's unclear whether §15.1's prose or the code is the stale one; needs a decision, not an assumption, before "fixing" either side. Related: Department and Problem Code (both required) sit in a separate "Work order details" card rather than the Header Fields box §5.2 says should hold every non-nullable field — possibly the same underlying gap. |
| **WO List — Detailed view missing its expand chevron** | §6.9: parent WOs carry an expand chevron in *both* view modes, tapping expands children inline. List/table mode has it (and the working `toggleP()`/`exp[id]` state); Detailed mode's `card()` has no chevron at all — tapping a parent card navigates away instead of expanding, even though the state that would render children already exists. |
| **WO List — toast icon is a green checkmark, not the locked orange alert icon** | §3.4 Component Patterns: "Toast style: dark chip, orange alert icon." `#t1`/`#t2` use `stroke="#00AA14"` + a checkmark glyph. |
| **WO List — filter-chip sheet mislabeled, and its rows never show a code** | The Status/Priority/Organization chip sheet's Apply button reads "Apply dataspy" (`openCS()`/`#csOv`), conflating it with the separate dataspy mechanism (§6.3 vs. §6.11 — two different things in the doc). Separately, §6.11 specifies "description primary, code small" for these rows; `renderCSRows()` only ever renders the description — the `.sh-rc` CSS class defined for exactly this has zero usages in the file. |
| **Canonical files — "Tap to add…" on empty long-text fields, confirmed intentional** | Not a bug — raised during this audit's triage and deliberately kept as a call-to-action exception to the "no placeholder text" rule (§3.4), since long-text fields render as a full editable row rather than a short inline value. Documented here so it isn't mistakenly "fixed" later. |
| **Doc structure — changelog cell has re-grown into a duplicate decision log (line 14)** | Highest-priority structural finding from this audit: the header table's "Doc version" cell is ~20,000 characters of session-by-session narrative restating decisions already written properly elsewhere — the exact anti-pattern a 2026-07-15 pass already removed once (that pass's own note is in this same cell). Needs a dedicated pruning pass, not a quick edit — deliberately not attempted as part of this session's fix batch. |
| **Doc structure — Insert Mode shell duplicated (§3.4 vs. §9.2)** | §3.4's Component Patterns table re-narrates the same full-screen/✕/swipe-to-dismiss/footer rule §9.2 already owns as the canonical spec. Should be a cross-reference, not a restatement. |
| **Doc structure — nav-bar title centering lives in §5.2, not §4.2** | The "Nav bar — centered screen title" decision sits inside §5.2 (Standard Record View) with no cross-reference from §4.2 (Navigation Bar), even though §4.2 explicitly scopes itself to global chrome. A reader looking in the section named "Navigation Bar" won't find it. |
| **Doc structure — dangling reference, "§5.2 D2's WO exception"** | §5.2 has no lettered/numbered sub-items; likely a leftover from an earlier private numbering scheme. |
| **Doc structure — inline "Open:" notes invisible from §20** | §9.4 ("which entities populate the Screen/entity pill's option list — not yet resolved") is a real open question that never surfaces in this punch list. Either give it its own row here, or establish (and verify) that inline "Open:" notes are sub-items of an already-tracked row. (§12's own inline open note, "reuse the same step type more than once," is resolved as of 2026-07-22 — see §11/§12 — no longer an example of this problem.) |
| **Doc structure — §3.4 has grown past its own scope** | ~57 rows mixing generic chrome (buttons, sheets, toasts) with field-type rules that overlap §5.2's own separate table, with no cross-check between the two. Split candidate for a future pass. |
| **Doc polish — a couple of stale illustrative examples** | §7.2's Comments example still describes seed data ("User Description," "You") that predates the later "full name + (You) suffix" revision; the sample file's actual seed data already follows the newer rule. §9.3's narrative paragraph about the sample file's Insert Mode still says it includes an Organization pill; the file correctly omits it per the section's own point 1 (List/Detail insert never gets one), just via an inline code comment rather than an updated paragraph. Low-priority text-only fixes. |

# 21. Superseded Design Decisions

Decisions that were reversed. Kept here for history only — nothing in this
section is current; the active section listed under "Superseded by" is
the only one that governs anything. Per the reorg convention (2026-07-15):
a superseded decision gets physically relocated here, not left inline in
its original section with a note attached.

| Former decision | Superseded by |
| --- | --- |
| **LOV description-first** — description primary, code small + muted, on every LOV row in every form. | §3.4 "LOV row: description only" (2026-07-15) — itself superseded the next day, see the row below. |
| **LOV row: description only** (2026-07-15) — no code at all, not even small/muted, except identifier fields and a short, explicit opt-in exception list (`CODE_VISIBLE_FIELDS`: Cost Code, Store). | §3.4 "LOV field: code + description" (2026-07-16) — code + description is now the default for every plain LOV field; the exception-list mechanism is retired along with the default it carved exceptions out of. Organization (§3.4.1) remains its own separate, stricter case — code only, no description at all. |
| **Collapsible header block (WO + Equipment)** — first rework of the record header: collapsed showed code+description, expanded showed status+location via a tap gesture. Turned out to have its own problem: the nav bar's static title was *also* showing code+description, duplicating the block directly beneath it. | §5.2/§5.3 "Header rev. 2" — status-forefront, scroll-collapsing, no tap gesture. |
| **WO workflow chrome, draft 1** — "Record View keeps `.rec-header`, every other step keeps `.wo-block`." | §15.4 "Chrome — final split" |
| **WO workflow chrome, draft 2** — "All 5 steps use the full `.rec-header`" (status + pin + ellipsis on every step). | §15.4 "Chrome — final split" |
| **WO Closing status banner: Option A** — from/to status shown as small mono chips squeezed beside the icon in the same row as the title/sub-text; to chip tappable, banner background/icon colour/sub-text all retinted per selected status. | §19.2/§19.8 "Status banner: Option D" (2026-07-16) — controls moved to their own row below a simplified single-line title, Inter instead of mono, bigger solid-fill button instead of a chip, protected/unprotected states added. |
| **WO Closing status control, Free Form case** — swap to an entirely different component (Record View's own status-forefront header, §5 "Header rev. 2") instead of the banner. | §15.4 (2026-07-16) — one control either way (§19.2 Option D); Free Form vs. Not Free Form now just toggles that same control's protected/unprotected state. |
| **Protected status control (Record View header button + WO Closing's "to" pill) — old treatment**: button/pill disabled entirely, fill colour grayed to `var(--bg-section)`/`var(--gray-4)`, chevron hidden outright, tap did nothing (Record View) or silently no-op'd (WO Closing). WO Closing's "to" pill also had its own independent colour set (green/gray/**orange**) instead of the header's. | §15.4/§19.2 (2026-07-22) — colour always shows now (protected or not); chevron swaps to a lock icon instead of disappearing; tap shows a toast explaining why instead of doing nothing. Colour vocabulary unified with the header's `STATUS_CLASS_MAP` (On Hold orange→red); "from" pill's fixed unrelated blue→green (Released's colour). |
| **Sync Status Screen — field-level trouble surfacing** (locked 2026-07-20, built same day). Full original spec, kept for the record: opening a flagged record showed a top error banner listing the offending field(s) as tap-to-jump links (`scrollToField()`); the flagged field itself got a red left-bar accent + inline message below it (`.form-field.error`/`.attr-item.error` + `.field-error-msg`, same mechanism as the `.required` left-bar accent); editing the flagged field cleared its own trouble state immediately and unconditionally, wired into every field-mutation entry point in `eam-shared.js` (`clearFieldSyncError(key)` — LOV select/clear, edit sheet save/clear, date/date-time select/clear, inline text blur, checkbox toggle); an outbox item's `fields` array held `[{key,label,message}]`, "one flagged field at a time, by design" (the server rejects per-request, not as a compiled list); Retry was protected/gated until the flagged field cleared, showing "Almost there — correct the flagged field, then retry this sync." (`SYNC_RETRY_BLOCKED_MSG`) if tapped early, turning green (`.sync-card-btn.ready`) only once unblocked — same gating on both the banner and the Sync Status Screen's own card list. | §4.5 (2026-07-22) — **confirmed not technically feasible**, not a design change of preference: real server responses never return which field caused a rejection, only whether one occurred and sometimes a general message. The entire flow above assumed a capability the server doesn't have. Removed in full — data shape (`fields` on `SYNC_DEMO_ITEMS`), the two CSS variants, `clearFieldSyncError()`/`scrollToField()` and all ~10 call sites, and the Retry-gating on both surfaces. What remains is tier-3 ("no further detail given") as the *only* flow, not one of three — see §4.5's current text. The idea itself wasn't wrong given the assumption behind it; flagged here specifically so a future session with real field-level error data from the actual server doesn't have to reinvent this from scratch. |
| **WO List Detailed card — bespoke WO-only anatomy** (§6.5, 2026-07-16) — WO number+status row, description headline, equipment sub-line, type+priority row, location·org·due meta row; hardcoded to WO's specific fields, exempt from the generic child-tab card. | §8.3 "List Search Screen standard" (2026-07-20) — one card standard for WO List/Search and every child tab, no exceptions; WO's fields now just populate that generic card via its own dataspy column order. |
| **WO List table anatomy — bespoke 5-column layout** (§6.6, 2026-07-16) — chevron+type badge+description, WO number, priority, status, org; fixed columns, no others shown. | §8.3 "List Search Screen standard" (2026-07-20) — List mode now shows every field available on the dataspy (tiered by online/offline), not a fixed column set. |
| **WO due-date urgency treatment** (§6.8) — Today/Tomorrow got emphasis styling, later dates rendered neutral. | §8.3 (2026-07-20) — every date field, including Due Date, renders plain `MM/DD/YYYY` everywhere, no relative/urgency formatting, so a screen builder never has to write date-math logic for a field they didn't hand-pick. |
| **Search screen filter chips — fixed row** (§6.11, pre-2026-07-20) — always exactly Type · Status · Department · Priority, hardcoded regardless of dataspy. | §8.3 (2026-07-20) — filter chips (and sort options) are dataspy-driven: the same 6 fields the card surfaces, all of them uniformly. |
| **Dataspy bar — live record count** (§6.3, pre-2026-07-20) — bar and selector sheet both showed a live count next to the dataspy name. | §8.3 (2026-07-20) — dropped entirely; one less number to keep accurate across sync tiers for marginal scanning value. |
| **"WO Workflow Setup" — a bespoke 3-screen base-EAM admin entity** (§11–§13, original framing) — a dedicated setup screen with its own **Steps** tab (per-WO-type step sequence, reuse-same-step-type question, Free Form flag) and its own **Screen Designer** tab (one tab covering all 5 steps, no base-screen picker, status-source choice) — a parallel structure invented from scratch alongside real EAM admin surfaces. | §11–§13 (2026-07-22, final) — no new admin screen at all; Screen Designer (§10) itself gains a WO Type selector. See the row below for the intermediate step in between. |
| **WO colour language — Type tinted, Status 4-way hex** (§6.7, pre-2026-07-22) — Type was a 6-way hex-per-code text tint (Breakdown red #E24B4A, Calibration teal #007B87, Corrective maint orange #F46600, Inspection purple #9933FF, Modification gray #6F7480, Preventive maint green #00AA14); Status was a 4-way hex-per-code solid pill (Released green #00AA14, Waiting approval/materials both orange #F46600, Completed gray #6F7480, white text throughout). | §6.7/§23 (2026-07-22, Phase 6 palette sweep) — Type loses colour entirely (not one of the 3 instruments); Status converges onto the app-wide 3-tier fill vocabulary (green/outlined/red) instead of its own scheme. |
| **Comments & Documents reachable via an ellipsis-menu entry** (§14.8, 2026-07-16) — Step 1 used §5.3's screen-specific action group, Steps 2–5 used §8.1's open ellipsis slot; each menu row showed a trailing count. Reasoning at the time: keeping them out of the step map avoided implying they were sequence steps ("step 6/7"). | §14.8/§23 (2026-07-22) — a "Reference" group inside the step rail's own expanded map, always pinned after the last numbered step, using a plain icon (not a numbered badge) specifically so it doesn't carry that "step 6/7" implication. More discoverable than a buried ellipsis entry, same already-familiar expand/collapse control technicians use for step navigation. |
| **Intermediate proposal (same session, 2026-07-22): route each WO Type to its own distinct `FUN_CODE`**, mirroring this customer's real `CCJOBS`/`TRJOBS`/`ZJ1000`/`WSJODC` precedent (peer functions sharing `FUN_APPLICATION='WSJOBS'`, each with its own native `R5FUNCTIONTABS`/`R5TABPERMISSIONS`/`R5PAGELAYOUT`) plus 3 new `WOTYPE` fields to resolve which `FUN_CODE` applies. Technically sound and grounded in real data, but rejected. | §11–§13 (2026-07-22, final) — rejected because it fragments the WO List dataspy mechanism (§6.3/§8.3) across multiple functions' dataspy sets for no actual benefit here. Final answer stays on one function, `WSJOBS`, always (including the fallback) — the WO-Type dimension is added via one new `PLO_WOTYPE` column on the existing `R5PAGELAYOUT`, plus one genuinely new small table (§12, "WO Workflow Steps," keyed WO Type × User Group × Step) carrying tab visibility/order/required plus the Free Form flag and status-source choice, now scoped to WO Type × User Group rather than WO Type alone. Existing `R5FUNCTIONTABS`/`R5TABPERMISSIONS` stay completely untouched — a separate, lower access-control layer this project doesn't touch. |

# 22. Custom Fields

Added 2026-07-20. Admin-defined fields per record Class + Class Org,
scoped to Record View only (Work Order and Equipment at this pass).

| Decision | Detail |
| --- | --- |
| **Container name: "Custom Fields"** | Matches the base-EAM product's own default label for this mechanic. Corrected 2026-07-20 (same day) from an earlier "Customer Fields" — that was simply wrong, not a deliberate distinct name. This customer's real environment has renamed their own instance of it to "Class Attributes" (see `docs/Data_refs/Pump Asset Example.png`) — this app does not follow that customer-specific rename, it uses the generic base-product term. |
| **Conditional render, not empty state** | The container renders only when at least one definition matches the record's own `entity` + `class` + `classOrg`. No match means no container at all — not a collapsed/empty one. Verified live: switching Equipment's Class from PUMP to VALVE removes the container entirely; switching back restores it. |
| **Same shell as any other Record View accordion** | Reuses `.fg-section`/`.fg-toggle-row`/`.fg-collapse` verbatim (Equipment's Asset/Equipment/Tracking Details) — Custom Fields is not a visually distinct component, just a data-driven one. |
| **Group Label — sub-header nested inside the container, confirmed** | Confirmed correct 2026-07-20: the Group Label renders as a sub-header *within* the single "Custom Fields" `.fg-section`, not as its own separate top-level container — matches the real screen's own nesting (`docs/Data_refs/Pump Asset Example.png`'s "Class Attributes" → "Pump Information" → fields). |
| **Group Label — forward-fill, still pending confirmation** | Separate from the nesting question above: real export data (`docs/Data_refs/Associated Custom Fields to Class PUMP.xlsx`) only carries a Group Label value on the first row of a group; subsequent rows are blank until the next group starts, yet the real screen still renders every row under one heading. Implemented here as: sort by `line`, forward-fill the last non-blank `groupLabel`. **This specific mechanism is still a deliberate call made under ambiguity, not a confirmed spec** — revisit if a future real export contradicts it. |
| **Equipment's real PUMP set is verbatim, not invented** | `FLA`/`INLET`/`OUTLET`/`PHASE`/`HP`, all Numeric, one group ("Pump Information"), Class Org `*` (wildcard) — matches `docs/Data_refs/Associate custom fields.png` and `Custom Fields.xlsx` exactly, including the real sample values (50/2/2/3/5). This is also that screen's field-for-field replacement of the old hardcoded "Pump Information" `.fg-section`, which was Class-gated by a bespoke `updateClassAttributesVisibility()` — now generalized. |
| **WO's sets are invented — no real WO-side example exists in Data_refs** | WO 19257 (Class `PUMP`) gets a 5-field, 2-group, all-5-types set (Seal Type/lov, Discharge Pressure/number, Last Vibration Analysis Date/date, Confined Space Entry Required/checkbox, Permit Number/text). WO 19831 (Free Form, Class `GENERAL`) gets a smaller 3-field, 1-group set. Deliberately different sizes/types/groups from each other and from Equipment's set, to demonstrate the config genuinely varies by class — not just by entity. |
| **WO gained a Class + Class Org and an Organization pill it didn't have before** | Neither existed on this screen before this pass. Organization pill fixes a previously tracked gap (§5.2/§5.3 require it on every Record View header) — same static/protected pattern as Equipment's, value `FBPP`. Class/Class Org are not user-visible fields here (no design decision yet to add a picker) — they're just the gating values Custom Fields reads, sourced from `data/wo-19257.js`/`data/wo-19831.js`. |
| **Full edit infrastructure reused, not reimplemented** | `applyCustomFields()` (`eam-shared.js`) merges matched definitions straight into the screen's own `RECORD`/`FIELD_LABELS`/`LOV_DATA`/`LOV_CURRENT`/`LOV_TITLES` globals, so `fieldRowLov`/`fieldRowEdit`/`fieldRowCheckbox`/`fieldRowInline` and their existing sheets (`openLov`/`openEdit`/`openDate`/`toggleCheckbox`) work on Custom Fields exactly like any native field — no parallel edit path, no read-only special case. |
| **Data source** | `data/custom_field_defs.js` (definitions) + each record's own `customFieldValues` map (`data/equipment.js`, `data/wo-19257.js`, `data/wo-19831.js`). |
| **Container position — configurable via Screen Designer (§10), not fixed** | Added 2026-07-21. The Custom Fields container is just another `.fg-section` in the stack — it carries no special pinning. Once Screen Designer (§10) exists, its already-specified drag-and-drop container placement applies to Custom Fields exactly like Asset/Equipment/Tracking Details: an admin can move it higher or lower relative to any other field-group container on the screen. Nothing about this pass's fixed placement (after Tracking Details on Equipment, after Work order details on WO) should be read as locked — that's just where it landed with no Screen Designer yet to reposition it. |
| **Class Org `*` fields aren't confined to the Custom Fields container** | Added 2026-07-21. A custom field whose Class Org is the wildcard `*` (not restricted to one specific real organization) can, via Screen Designer, be relocated out of Custom Fields into any other ordinary field-group container on the same screen — at that point it behaves exactly like a native Standard Model field for container-assignment purposes (§3.3.1's Container/section-header pattern, §10's "New Container"). Not yet addressed: whether a field scoped to one specific non-`*` organization behaves the same way or stays confined to Custom Fields — no case of that exists in this app's data yet (every def in `data/custom_field_defs.js` uses `*`), so it hasn't come up. |

**Not done this pass, flagged rather than assumed:** the general admin-
configuration mechanism itself (how a real customer would define/rename/
type these per Class in this app) — out of scope per an explicit
2026-07-20 scope call, data/rendering only for now. The two rows above
specify *contract*, not implementation — Screen Designer (§10) still
doesn't exist to actually perform either move.

# 23. Color Palette — 3 Instruments, Everything Else Monochrome

Added 2026-07-22, app-wide rollout starting with WO Record View + the
shared rail components (§14.2/§14.3), continuing screen by screen.
Locked, not a per-screen style choice — applies to every screen this
rollout touches and every new screen built after it.

**The rule:** color exists for exactly 3 things, always the same 3 hues,
never elsewhere:
1. **Status** (the record header's status pill) — green (good/complete),
   red (blocked/on hold), or an outlined neutral for "in progress"/
   standby (was a 3rd filled hue, orange — retired, §4.4.1 keeps its own
   sync-specific state language, unaffected).
2. **Sync** (the nav-bar sync control, §4.4.1) — green/red/gray/gray-
   syncing. The "syncing" state was actually still light purple
   (`#B388FF`) until this pass despite §4.4.1 describing a 4-state green/
   red/gray system with no purple in it — corrected here, not a pre-
   existing exception to this rule.
3. **Required** — a red left-bar on the field (`.form-field.required`/
   `.attr-item.required`, was orange) and a red **outline square** count
   badge (`.required-count-badge`, was an orange-filled pill). Red also
   covers sync-error (`.form-field.error`) — both "needs your attention"
   states share the one hue on purpose now, not two.

**Everything else that used to carry a hue is now monochrome — ink
(black in light mode, white in dark) for "selected/active/current," plain
outline for "this is an icon/chip," never a filled color:**
- Purple is retired as a UI-state accent entirely — it used to mean
  "interactive/active/selected" across dozens of components (nav pin,
  tab/step rail wash + active states, dataspy bar, filter chips, LOV/
  tree/calendar selection, row-action hover, the sync panel's syncing
  state and action buttons). Selection now reads via weight/fill (bold
  text, a filled radio/badge, a left-bar accent) instead of a hue — same
  visual result, no color budget spent on it. *(Full app-wide sweep of
  every purple touchpoint listed above is in progress, screen by screen —
  the rail components (§14.2/§14.3) are done as of this pass; the rest
  are being converted as each screen is touched, not yet a completed
  inventory — treat any remaining purple found elsewhere as not-yet-
  converted, not intentional.)*
- Icons/chips/badges that aren't one of the 3 instruments above are
  outlined (`1.5px solid var(--border-strong)`, `background:none`), never
  filled with gray or a hue — equipment icons, Type badges, the org pill,
  Comments/Documents count badges, the rail outline itself (§14.2).
  **Exception:** Priority's Critical value keeps a solid red chip — the
  one deliberate exception to "outline only," decided by direct
  comparison against a fully-monochrome alternative (both mocked up
  side by side) — Critical is worth spending part of the red budget on;
  every other Priority/Type value (including High) stays outlined.
- Mono (`var(--font-mono)`) is reserved for identifiers only — record
  numbers, LOV codes, dates — and is always gray/black/white, never
  tinted. This was the original complaint that started the whole pass:
  colored mono (purple step-pill, green timer-pill text, orange required-
  badge) read badly; the fix wasn't switching away from mono, it was
  never coloring it.
- Green is NOT retired — `seg-done`/`smi-done` (step rail progress) and
  the timer pill's running state both keep their pre-existing green,
  since neither was ever the thing flagged as a problem (only purple
  was) and both predate this pass as legitimate, separate conventions
  ("done," "actively counting") rather than a 4th color instrument.
- The Octave Yellow `.rail-not-free-form` variant (§15.4) was originally
  left untouched here as "a different semantic, outside this rule's
  scope entirely" — **superseded 2026-07-22 (user direction):** it read
  badly in practice and was removed outright (the rail now looks
  identical regardless of Free Form state), not just exempted from this
  rule. See §15.4 for the flagged-to-revisit note — this isn't a locked
  replacement decision, just "not yellow, not today."
- **Home is a deliberate, named exception to this entire section** (user
  direction, 2026-07-22, after the rest of the app had already gone
  monochrome) — its tile icons (`.home-tile-sq`) and favorite-chip icons
  (`.fav-chip-icon`) keep real per-item colour (orange/green/teal/purple
  tints), unlike every other screen's icons/badges. Don't converge Home
  to match the rest of the app in some future pass without checking —
  this was a considered reversal, not an oversight.

**Rejected alternative, kept for reference:** a fully-monochrome option
where even Priority Critical lost its red (no exception at all) was
mocked up side by side with the one-exception version above and
rejected — losing Critical's red was judged a real loss, not a marginal
one.

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

# 24. Navigation — Record View Back Button + Home Tile Pattern

Added 2026-07-22. Two rules, both locked:

**1. A Record View's back button always returns to that entity's Search
List screen — never straight to Home, never a toast stub.** WO Record
View → `eam-wo-list-prototype-v5_1.html`; Equipment Record View →
`eam-equipment-list-prototype-v1.html` (new this pass, §24.1). "Maintaining
the user's dataspy and persisting any filters" is the locked *intent* —
there's no real filter/dataspy state anywhere yet to actually persist
(tracked in §20), so today this is just the correct navigation target,
not yet a state hand-off mechanism. The pre-existing `eamSyncReturnUrl`
consume-once override (§4.5 — came here from the Sync Status Screen's
Review action) still takes priority over this default when set.

**2. A Home tile navigates (real page load) to its parent screen's
Search List screen, pre-run to that tile's own dataspy** — e.g. the
"Equipment" tile → Equipment's Search List screen → "All Equipment."
Same pattern for any future entity's Home tile.

**3. Added 2026-07-22 (bug fix — WO List's own `openWO()` was a complete
toast stub, so no WO in the list actually opened).** WO List has real
Record View data behind exactly 3 WO numbers — the demo-WO workflow set
in `eam-shared.js` (`DEMO_WO_JOBTYPES`: 19257=BRKD/Not Free Form,
19831=PM/Not Free Form, 20450=ROUT/§11 fallback). Clicking any of those 3
numbers opens WO Record View as that WO, with its real configured
workflow (or lack thereof, for 20450). All 3 now have real rows in
`WOS` too (added same day), so "My Assigned WOs" — narrowed to exactly
these 3 the same session — is a guaranteed-correct set to click through.

**Extended 2026-07-22, same day (2nd punch-list pass) — real Type-based
routing for every other WO in the list.** The original version of this
rule sent literally every non-19257/19831 WO to the WO 20450 identity
regardless of its own Type — which meant a real PM- or Breakdown-typed
WO in the list rendered with WO 20450's Free-Form/no-rail identity, so
the step rail and Start Work bar looked entirely missing from the PM and
Breakdown flows (reported as inconsistent behavior, traced to this rule
rather than the demo-WO toggle itself — the toggle mechanism was
verified working correctly). Now: **BK routes to the BRKD/19257
identity, PM routes to the PM/19831 identity**; every other Type (CM/
CAL/INS/MOD/ROUT — none has a configured workflow, `data/wo-workflow.js`)
still falls back to 20450, per §11's own fallback rule. `TYPE_TO_DEMO_WO`
in `eam-wo-list-prototype-v5_1.html`. Every WO sharing one of these 3
identities still shows the identical Record View content underneath
(only the identity bar's number/description/type swap) — there's no
real per-WO detail data to show otherwise, unchanged from before.

**Other entry points that punch straight into a WO Record View (not
through this list) intentionally don't duplicate this Type-based
lookup** — Notifications' `openNotification()` now defaults to the
corrective (19257) flow instead of 20450 for any WO number it doesn't
recognize, rather than building the same Type-routing table twice for a
secondary entry point that doesn't carry a Type to route on. The Sync
Status Screen's review flow (§4.5) already effectively does this too —
it opens each item's own `openUrl` directly, landing on WO Record View's
default (19257) state, not through `eamOpenDemoWo` at all.

Hand-off is `sessionStorage` (`eamOpenDemoWo`, consume-once, same pattern
as `eamNewWoRecord`/`eamSyncReturnUrl`), read by WO Record View's init
before `onDemoWoChanged()` runs so it initializes correctly rather than
needing a manual dev-toggle click.

**Rule 2 finished, 2026-07-22 (was built for the Equipment tile only until
now) — every Home tile/favorite navigates for real.** New `goToScreen()`
helper in `eam-home-screen-prototype-v1.html` resolves every tile/favorite
tap to its parent screen + an optional pre-run dataspy. Two tiles had no
real dataspy to point at yet, so WO List gained **ds9 "Corrective
Maintenance"** (`tp==='CM'`, for "Corrective WO's") and **ds10 "Closed
WOs"** (`st==='COMP'`, for "My Closed WO's" — and, as its closest
available proxy, "Last Week's Work" too, since the demo `WOS` dataset only
spans a few days around `TODAY` and has no real date-range dataspy to
offer instead). "My PM WO's" already had a match (ds8). Equipment List
gained its 2nd dataspy, **"Centrifugal Pumps"** (`category==='CENTRIFUGAL'`),
for the Pumps tile/favorite — still just a pre-run target, not a real
switcher (the ds-bar tap is still a "coming soon" stub on both screens,
unchanged). WO favorites route by their own real dataspy id (`f.id`, from
`loadWoFavorites()`) — no name-matching needed, unlike the static tiles.
Home's/WO List's bottom-nav Home↔Work stubs are real navigation now too.

**The dataspy hand-off is `sessionStorage` (`eamPendingSpy`, consume-once,
same convention as `eamNewWoRecord`/`eamSyncReturnUrl`) — deliberately NOT
a `?spy=` query string.** Tried the query-string version first; confirmed
live that a `?spy=ds9` link landed on the target screen's *default*
dataspy instead, no error — `npx serve`'s clean-URL redirect silently
drops query strings on navigation, the exact limitation
`navigateToNewRecord()`'s own comment already flags (§9.5). Digging
further, found the underlying bug was live again, not just a risk: the
dev server serves from the repo root (`serve .`, §"Preview server" note,
2026-07-20) but `cleanUrls:false` only lived in `prototypes/serve.json` —
one directory below the actual served root, so `serve` never read it. The
clean-URL-then-404 bug §4.5 already documented as "found completely
broken... sidestepped via serve.json" had quietly come back into force for
every screen, not just this feature. Fixed by moving `serve.json` to the
repo root; the stale nested copy is deleted.

## 24.1 Equipment Search List screen (new)

`eam-equipment-list-prototype-v1.html` — Equipment's Search List screen,
filling the gap that used to leave Equipment Record View's back button
with nowhere real to go (Equipment's only entry point before this was
Home's Create bar). Copies WO List's §8.3 card pattern
(`renderStdCard()`), deliberately minimal beyond that (static dataspy
label, no search/filter/sort, no Insert Mode entry point here — Home's
Create bar is still the only way to create Equipment).

**Presented like a pull-up, but is a real page — not an in-page popup.**
First built as a `.hyperlink-popup` living inside Home's own DOM; reverted
same day. A real page navigation to Equipment Record View tears down
whatever JS/DOM state Home was holding, so an in-page popup can't be
"returned to" with preserved state the way rule 1 above requires — this
needs to be a real, separate, revisitable page for back-navigation to
work at all in a multi-page static prototype. It still reads like a
pull-up visually: no bottom-nav (it has no tab-root entry point of its
own — only reachable via Home's "Equipment" tile), and the header's
leading control is an **✕ close** (→ Home) rather than a back-arrow or
avatar, since closing this screen is dismissing an overlay conceptually,
not "going back" through a navigation stack. Equipment Record View's own
back arrow returns HERE, per rule 1 — not to Home directly.

**Extended 2026-07-22 (user direction) — real sheet motion, not just
sheet-adjacent chrome.** The paragraph above's "reads like a pull-up
visually" turned out to mean only the missing bottom-nav + ✕ close — the
`.app` frame itself was already pixel-identical to Home's (verified live:
both 375×778 at a 375-wide viewport), so a flat page swap didn't actually
*feel* pulled-up at all. Added rounded top corners + a slide-up-from-
bottom entrance on load (`@keyframes`, same transform/easing
`.bottom-sheet` already uses elsewhere in this app) — same size/ratio as
before, just with the missing motion. A pure CSS animation-on-load, not
the usual JS classList-toggle-next-frame `.bottom-sheet.open` pattern —
tried that first, but it depends on a `requestAnimationFrame` callback
actually firing, which this session's own automated preview tab never
did (confirmed: the class only landed once triggered manually); a CSS
animation has no such dependency. Screen-local CSS for now (this file's
own `<style>` block) — promote `.pullup-app` to `eam-shared.css` if a 2nd
"reads like a pull-up" full-page screen shows up.

# 25. Notifications

**Built 2026-07-22** — `eam-notifications-prototype-v1.html`, the "quick
and dirty" screen explicitly deferred during the app-wide nav/palette
rollout (see the `project_deferred_screens_backlog` memory note / CLAUDE.md).
Bottom-nav's "Notifications" tab (Home, WO List) was a
`showToast('Notifications — coming soon')` stub until this pass; both now
do a real navigation here, same pattern as WO List's own "Work" tab
pointing at itself. This is a browsing-tier, bottom-nav-root screen (avatar
top-left, not a back arrow — same §4.2 category as Home/WO List), not a
drill-down like the Sync Status Screen.

**Source data — `data/notifications.js` (`EAM_NOTIFICATIONS`), modeled on
R5MAILEVENTS.** That's the real EAM table already driving this app's
existing email + push notification system (an event fires → a mail-event
row logs → a push fires too if the recipient user has a device tied to
them) — this screen is a mobile-side read of that existing log, not a new
backend concept. **One real gap, flagged rather than solved:** the real
R5MAILEVENTS schema has no read/unread column — it's a send log, not an
inbox. `read` is invented client-side for this prototype; a real build
needs a real place to persist it (new column, or a client-local table
keyed by event ID + user).

**Types modeled (7 demo rows):** `wo_status`, `wo_assigned`,
`wo_reassigned`, `pm_due`, `follow_up_created` (the Activity Checklist's
"Create Follow-up WO" action, §16, now has a notification on the other
end of it — ties WO 20450, the existing Free-Form fallback demo WO, in as
the created follow-up), and **`comment_mention`** — a forward reference.
**@mention tagging in Comments is NOT built anywhere in this prototype
yet** (raised this session, logged as a circle-back item — see the
`project_comment_tagging_circleback` memory note); this notification type
is modeled anyway so this screen doesn't have to wait on that feature
landing first. When tagging IS built, it should fire this same
notification type through this same table, not a separate mechanism.

**Screen behavior:**
- Grouped **Today / Earlier** (by literal date match against today, no
  relative-time smart formatting elsewhere — same "prototype data stays
  plain" convention the rest of this app follows).
- **Filter chips (All / Unread)** — reuses the shared `.filter-chip-row`/
  `.filter-chip` component verbatim, no new filter UI invented.
- **Unread state reads via ink weight/fill, not hue** — bold subject +
  a small filled dot, per §23 (read/unread isn't one of the 3 color
  instruments). No separate "unread" color anywhere.
- **Mark all read** — a `.nav-icon-btn` header action (double-check
  icon), disabled (dimmed, no-op) once nothing is unread. **Real layout
  bug found and fixed while verifying live:** first built as a text
  button ("Mark all read") in `.nav-actions`; collided visually with
  `.nav-title`, which is `position:absolute;left:0;right:0` and
  genuinely centered across the *entire* bar regardless of how much
  space the flex siblings occupy — "Notifications" is already one of the
  longer screen titles, and the text button pushed the overlap into
  visible range. Fixed by switching to the same narrow `.nav-icon-btn`
  pattern WO List's own header actions (Create/Search) already use,
  rather than inventing a new text-button-in-header component.
- **Dismiss** — a per-card ✕, gated behind the same shared `openConfirm()`
  modal every other destructive-ish action in this app uses (message
  clarifies it only removes the notification, not the source record).
- **Tap a card → source WO.** Uses the same `eamOpenDemoWo` sessionStorage
  hand-off as WO List's own `openWO()` — 19257/19831/20450 open as
  themselves, any other WO number defaults to the corrective (19257)
  flow (updated 2026-07-22, punch-list item — was 20450, same old
  blanket rule WO List itself moved off of; see §24 rule 3's 2nd pass).
  No special return-path override added for this screen; per §24's
  locked rule, the WO Record View back arrow still returns to WO List,
  not here. A notification with no `wo` (none in this demo set, but the
  code path
  exists) shows a toast instead of navigating.

**Bottom-nav badge, promoted to `eam-shared.js` on its 2nd real
consumer** (Home + WO List both need the same live unread count) —
`updateNotifBadge()`, called unconditionally from `initSharedApp()` same
as `renderSyncControl()`, no-ops if `#notifBadge` or `EAM_NOTIFICATIONS`
isn't present (same defensive-guard pattern as `CURRENT_USER_NAME`
elsewhere in that file). Home's and WO List's own hardcoded static badge
count (`3`, decorative demo data with no id at all on WO List's copy) is
gone — both now load `data/notifications.js` and show the real live
unread count, hidden entirely at 0.

**Follow-up fix pass, 2026-07-22 (user-reported), 3 items:**
- **Real cross-cutting bug: `.nav-icon-wrap` was never actually shared,
  despite already having 2 real consumers (Home, WO List) before this
  screen existed.** It's the `position:relative` wrapper `.bottom-nav-
  badge`'s `position:absolute;top:-5px;right:-7px` anchors against; each
  of the 2 existing consumers had quietly hand-copied it into their own
  local `<style>` block (past this project's own "promote on 2nd
  consumer" rule, but never actually moved — same drift pattern as
  `.bottom-nav` itself, fixed on a prior pass), so neither ever surfaced
  the gap. This screen was built without it entirely (a genuine miss, not
  a copy), and its badge rendered positioned against the whole `.bottom-
  nav-item` button instead of the icon — flying to the button's outer
  corner instead of sitting on the bell. Fixed at the source: promoted to
  `eam-shared.css`, both local hand-copies deleted.
- **Mark all read moved out of the header into the filter-chip row**,
  right-aligned via `margin-left:auto` on the button itself (not on the
  shared `.filter-chip-row`, which stays untouched for its other
  consumers — WO List, Equipment List — that have no trailing item to
  push). Now a pill (`.notif-mark-all-chip`) matching the visual weight
  of the All/Unread chips beside it, disabled/dimmed once nothing is
  unread. Supersedes this screen's original header `.nav-icon-btn`
  version (itself a fix for an earlier text-button/`.nav-title` collision
  — see the bullet above) — that header slot now holds only the sync
  control again, same as Home.
- **Reference row standardized**: `{date} · {time} | Work Order {number}`
  — was `{date} · {time}` and a separate `WO {number}` badge with only a
  gap between them, no visual relationship stated. `time` in `data/
  notifications.js` also moved off spelled-month (`Jul 22 · 09:14`) onto
  this app's actual locked numeric-date standard (§3.4:
  `07/22/2026 · 09:14`) — it had originally matched Comments' own older
  spelled-month convention, which predates §3.4 and was never swept onto
  it; this file didn't need to inherit that same staleness. "WO" spelled
  out to "Work Order" in the reference text itself; the record number
  stays mono (identifier), the words around it don't.

Verified live (computed styles/bounding boxes, not just visual —
`preview_screenshot` was unavailable this pass): badge now anchors
tightly to the bell icon's own corner on Home/WO List/Notifications
alike; the mark-all-read pill sits flush right in the filter row with
the row's existing padding; disabled state (opacity 0.4, `disabled=true`)
confirmed after a real mark-all-read action; reference row renders the
new format on all 7 demo rows. No console errors on any of the 3
screens touched.

End of document

HxGN EAM Mobile — Design Decisions v3.1
