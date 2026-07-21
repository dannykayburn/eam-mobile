# UI Component Inventory — v1 (2026-07-21)

## Purpose

This is a **code-level implementation audit**, not a design-intent document.
`design-decisions-v3-1.md` says what every component *should* look like;
this doc catalogs what the actual CSS/markup in every live prototype file
*currently does*, and flags every place a component that conceptually
represents "the same kind of thing" has drifted — in font, size, weight,
color, or spacing — from either its shared definition or its sibling
components on other screens. Built ahead of the compile/handoff pass so
drift gets caught while it's still a CSS edit, not a v2 regression.

Method: static read of `eam-shared.css`/`eam-shared.js` (the canonical
shared-component source) plus every live screen's markup and local
`<style>` blocks, cross-referenced against `design-decisions-v3-1.md`
§3.4/§5.2/§5.3/§8.3/§9/§14–§19. No browser rendering was used for this
pass — see §20 of the design doc if a visual (rendered) re-check is
wanted later.

Screens covered (all under `prototypes/standalone/`, excluding `old
versions/`, `base screens/`, and `mockups/` which are archived/reference):
`sample-screen-standard-model-prototype.html`,
`eam-equipment-record-view-prototype-v1.html`,
`eam-wo-record-view-prototype-v1.html`,
`eam-activity-checklist-prototype-v1.html`,
`eam-wo-prototype-issue-parts-v1.html`,
`eam-book-labor-prototype-v2.html`,
`eam-wo-closing-prototype-v2.html`,
`eam-wo-list-prototype-v5_1.html`,
`eam-home-screen-prototype-v1.html`,
`eam-sync-status-prototype-v1.html`.

---

## 1. Record header

`.rec-header`/`.rec-num`/`.rec-desc`/`.rec-status-btn`/`.rec-pin-btn`/
`.rec-ellipsis-btn`/`.org-pill.protected.in-header` — `eam-shared.css:100-171`,
spec at design doc §5.3. Identical markup/classes on Sample Screen,
Equipment RV, WO RV. **No drift** — the best-conforming component in the
app.

## 2. Nav bar chrome

| Object | Canonical def | Status |
|---|---|---|
| `.nav`, `.nav-left`, `.prototype-label`, `.nav-title` | `eam-shared.css:28-73` | Identical on Sample Screen/EQ/WO RV. WO List and Sync Status Screen have local hand-copies (predate shared-file architecture) — no value drift found in either. |
| `.nav-avatar` | `eam-shared.css:43` — 30px circle, `--gray-5` bg, 11px/700 initials | WO List's local copy is byte-identical. |
| `#syncCtrl` (`.sync-ctrl-dot`/`.sync-ctrl-pill`) | `eam-shared.css:91-98`, via `renderSyncControl()` | WO List/Home render correctly. **Sync Status Screen renders nothing** — empty `.nav-actions`, no sync control at all, contradicting §4.2 ("present on every screen"). |
| `.bottom-nav`/`.bottom-nav-item` | **Not in `eam-shared.css`** — still hand-copied in both consumers | Home (`z-index:5`) and WO List (`z-index:50`) have **drifted z-index values** between two copies of the same component. CLAUDE.md's log claims this was "promoted into `eam-shared.css`/`.js` immediately" as nav-bar chrome — that is **incorrect**; both files' own code comments say it followed the "stays local until 2nd consumer" rule and is still local. Two consumers already exist, satisfying that rule — this should be promoted now. |

## 3. Section/container headers — `.fg-section` vs `.rv-section`

Defined `eam-shared.css:329-337` (`.fg-section` — plain field groups) and
`:359-371` (`.rv-section` — Comments/Documents specifically). Equipment RV
follows this correctly (5 `.fg-section`s + 2 `.rv-section`s). **WO Record
View uses `.rv-section` for everything**, including its ordinary "Work
order details" field group (required Department/Problem Code) — never
uses `.fg-section` at all. Concrete bug this causes: `updateRequiredBadges()`
(`eam-shared.js:968-987`) only targets `.fg-toggle-row`/`.section-card-header`,
so WO's Work-order-details container silently never gets the orange
required-count badge an equivalent Equipment container gets automatically.

## 4. Field-row types

`fieldRowLov`/`fieldRowEdit`/`fieldRowInline`/`fieldRowCheckbox`/
`fieldRowProtected` (`eam-shared.js:1734-1778`, CSS `eam-shared.css:447-489`).
LOV/edit/inline/checkbox/protected/date are class-identical across every
file that exercises them. Sample Screen hand-authors this markup directly
instead of calling the shared JS builders EQ/WO use (already flagged in a
code comment near `eam-shared.js:1728`) — currently in sync, but is an
un-mirrored drift risk if either side changes independently. Date-Time
and Time-Only field types have only one real consumer (Sample Screen /
Book Labor respectively) so no cross-file comparison exists yet for those
two types beyond what's noted in §7 below.

## 5. Cards / list rows

### 5a. §8.3 standard list card (`.ld-card` family — WO List, Sync Status Screen)
Shared canonical `eam-shared.css:533-556`, rendered via `renderStdCard()`/
`renderStdTable()` (`eam-shared.js:325-359`). WO List has a full local CSS
+ JS duplicate (documented, predates shared-file architecture) — checked
line-by-line, **no drift** in headline (15px/700), subline (13px/700
muted), org badge (12px/600), or attribute rows (`.field-label` 13px
gray-4 / `.field-value` 14px/500). Sync Status Screen links the shared CSS
directly with zero local overrides.

**Gap found:** Sync Status Screen's card (`renderSyncErrorCard`) never
renders `item.timestamp`, while the sync panel's row for the exact same
`SYNC_DEMO_ITEMS` record always shows `${entity} · ${timestamp}` — same
data, one surface drops a field the other shows.

### 5b. Screen-local "row card" family (Issue Parts `.part-card`, Book Labor `.labor-row`, WO Closing `.attach-row`, Checklist `.checklist-item`)
No shared equivalent exists for this family yet (each screen shows a
different kind of content), but they should still *read* consistently.
Primary row-title text and identifier/meta mono text drift:

| Screen | Row title class | Size/weight | Identifier/meta mono class | Size |
|---|---|---|---|---|
| Activity Checklist | `.item-label` | 14px/600 | `.item-equip` | 11px |
| Issue Parts | `.part-desc` | 14px/600 | `.part-number` | 12px |
| Book Labor | `.labor-row-name` | **13px/600** | `.labor-row-code` | **10px** |
| WO Closing | `.attach-row-name` | **13px/600** | `.code-cell-code` | 11px |

Book Labor and WO Closing both render their row title one size smaller
than the Checklist/Issue Parts convention, and Book Labor's identifier
mono text (10px) is smaller than every other sampled instance (11–12px)
in the app.

## 6. Buttons

| Role | Canonical | Screens using it correctly | Local duplicates found |
|---|---|---|---|
| Insert/primary save | `.insert-save-btn` (gray→green/ready) | WO List, Home, Book Labor Add/Add-by-Crew | — |
| Contained primary action | `.btn-contained` (full-width, black, 46px/14px-700) | Book Labor's Add Labor | **Issue Parts' `.btn-quick-issue-all`** is a byte-for-byte duplicate implemented as its own class instead of reusing `.btn-contained` (already flagged in design doc §18.7 as an unmigrated convergence candidate). **WO Closing's `.btn-close-wo`** (50px/green/white/15px-700) is likewise a near-identical duplicate of `.insert-save-btn.ready` implemented locally. |
| Outlined secondary/cancel | `.btn-outlined` (50px, 1.5px `--gray-5` border, 14px/700, aqua hover) | Issue Parts' Quick-Issue-All confirm sheet's Cancel | **WO Closing's `.btn-cancel`** (Close-confirmation sheet) duplicates this exact role with different specs — 44px height, `--gray-2` border, 14px/**600**, no aqua hover — despite the design doc calling for one shared control here. |
| Tertiary per-row action (outlined pill on a list row) | **No shared class exists** | — | Three different local implementations for the identical conceptual role: Issue Parts `.btn-quick-issue` (34px/13px), Book Labor `.detail-btn` (32px/12px), WO Closing `.viewer-action-btn` (44px/13px). Candidate for a new shared component once a size is chosen. |

## 7. Pills / selectors

- `.org-pill`, `.attr-badge`, `.step-pill`, `.rv-badge` — consistent
  everywhere; Equipment's all-plain-LOV Header Fields (no `.attr-badge`)
  vs. Sample Screen/WO's badge-style Type/Priority is a documented
  intentional variant, not drift.
- **`.store-selector` (Issue Parts) vs. `.crew-selector-pill` (Book
  Labor)** — design doc §18.5 explicitly calls the crew pill "same
  pattern as the store selector." In light mode their backgrounds
  differ: `.store-selector` = `var(--bg-section)`, `.crew-selector-pill`
  = `var(--bg-card)`. They only converge to the same value in dark mode.

## 8. WO workflow chrome (step-rail / timer-pill / bottom-bar)

`eam-shared.css:222-325`. Verified identical across all 4 WO-workflow
screens (Checklist, Issue Parts, Book Labor, WO Closing) — step-pill,
step-name, bar-meta, bar-pill all byte-consistent. `.timer-pill.stopped`
is defined in shared CSS but has **zero live consumers**: Book Labor
replaced it with its own Timer Stopped banner (intentional, §18.7) and WO
Closing has no timer at all (also intentional, no timer on this step) —
noted for awareness, not a bug.

## 9. Sheets / toasts

Shared shell markup (`eam-shared.css`/`.js` sheet/toast components) is
byte-identical everywhere it's used. No drift in the shared shells
themselves.

## 10. Screen-unique components (no shared equivalent, by design)

- Activity Checklist: `.group-hdr` (tinted + left-bar, **not** `position:
  sticky` despite §16.1 requiring a sticky group header — still open,
  already tracked in design doc §20), `.item-chk` (checklist-item
  checkbox incl. LOTO/PPE — still an open pattern-vs-generic-checkbox
  decision, already tracked in §20), `.prompt-bar`, `.notes-row`.
- Issue Parts: `.seg-control`, `.sheet-part-header`, `.bin-stock-row`,
  Store/Bin/Lot LOV sheet stack.
- Book Labor: `.timer-banner` (correctly de-purpled per §18.7),
  `.hours-type-pill`.
- WO Closing: `.status-banner`/`.status-pill` (Option D, matches spec),
  `.codes-grid`/`.code-cell` (matches spec, earlier 11px/700/ALL-CAPS bug
  already fixed).
- Equipment RV / WO RV: `.tree-*` (Structure Details tree) — **no shared
  equivalent exists, and the two independent local copies have drifted
  from each other**: `.tree-type`/`.tree-here` are JetBrains Mono +
  uppercase in Equipment, Inter/sans with no uppercase transform in WO —
  same visual object, two different fonts.

---

## Headline findings not yet logged in design-decisions-v3-1.md §20/§21

These are new as of this pass — cross-referenced into §20 as of this same
session (search that file for "UI inventory" to find the corresponding
rows). Categorized by whether they're an unambiguous bug (safe to just
fix to match the established convention) or a real judgment call (no
existing convention to default to):

**Clear bugs — one existing convention to converge to:**
1. WO RV's Work-order-details group uses `.rv-section` instead of
   `.fg-section` → loses the required-count badge.
2. `.bottom-nav` z-index drift (5 vs. 50) between Home and WO List.
3. `.bottom-nav` should be promoted to `eam-shared.css` now — 2
   consumers already exist, satisfying the project's own promotion rule;
   also corrects CLAUDE.md's inaccurate "already promoted" claim.
4. Sync Status Screen's card omits `timestamp`; the sync panel shows it
   for the same record.
5. Sync Status Screen has no sync control rendered on its nav bar at all.
6. Book Labor's `.labor-row-name`/WO Closing's `.attach-row-name` (13px)
   vs. Checklist/Issue Parts' row-title convention (14px).
7. Book Labor's `.labor-row-code` (10px) vs. every other identifier/meta
   mono text sampled (11–12px).
8. `.crew-selector-pill` light-mode background should match
   `.store-selector`'s per the design doc's own "same pattern" claim.
9. WO Closing's `.btn-cancel` should reuse shared `.btn-outlined` instead
   of a locally-diverged duplicate.
10. `.btn-quick-issue-all` (Issue Parts) and `.btn-close-wo` (WO Closing)
    should converge to `.btn-contained`/`.insert-save-btn.ready` — already
    flagged as deferred in §18.7, pixel-identical today so zero visual risk.
11. Equipment's `.tree-type`/`.tree-here` (mono+uppercase) vs. WO's
    (sans, no uppercase) — same component, pick one.

**Judgment calls — no existing precedent to default to, need a decision:**
12. Tertiary per-row outlined-pill button has three different sizes
    across screens (34/13, 32/12, 44/13) with no shared class — needs a
    picked size before it can be promoted to `eam-shared.css`.
