# HxGN EAM Mobile — Session Handoff
## Completed: Book Labor (Step 4) + WO Closing (Step 5)
## Next: Final compile — all five steps into one prototype
**Date:** May 2026

---

## Files to upload for next session

| File | Purpose | Source |
|------|---------|--------|
| `HxGN-EAM-Mobile-Design-Decisions-v2.docx` | Design reference through Issue Parts | Project file (already uploaded) |
| `eam-wo-prototype-issue-parts-v1.html` | Issue Parts prototype — visual reference | Project file (already uploaded) |
| `eam-book-labor-prototype-v2.html` | Book Labor prototype — final version | **Download from this session** |
| `eam-wo-closing-prototype-v1.html` | WO Closing prototype — final version | **Download from this session** |

Upload all four. Tell Claude:

> *"We are building the HxGN EAM Mobile app. Book Labor (Step 4) and WO Closing (Step 5) are now complete as standalone prototypes. We need to compile all five steps — WO Record View, Activity Checklist, Issue Parts, Book Labor, and WO Closing — into a single unified prototype. The design decisions doc (v2), the Issue Parts prototype, the Book Labor prototype (v2), and the WO Closing prototype (v1) are uploaded. Follow all locked design decisions throughout. The assembly brief in the handoff doc describes exactly what needs to happen."*

---

## What was completed in this session

### Book Labor (Step 4) — `eam-book-labor-prototype-v2.html`

**Screen anatomy**
1. Nav bar (dark)
2. WO identity block (collapsible)
3. Step rail — "4 of 5 · Book Labor" + stopped timer pill (01:23:47)
4. Timer banner — purple, shows elapsed time + start/end times loaded from timer
5. Screen header — "Book Labor" + record count
6. Labor list — inline expand rows
7. Add Labor + Add by Crew buttons (outlined, side by side)
8. Activity summary cards — Total hours / Technicians / Entries
9. Bottom bar — auto-ready, "Next: WO Closing"

**Interactions**
- Tap labor row → expands inline to show detail grid + "Create correction" action (no Edit — corrections only)
- Add Labor sheet → Start/End time entry (no mode toggle — screen designer decision), required fields gate the Save button (gray → green)
- Add by Crew sheet → crew selector pill at top (like store selector on Issue Parts), toggles per member, shared time fields, Save button gates on member selection + required fields
- Correction sheet → 1-minute stepper with 3-second hold → 15-minute repeat, reason textarea, red Save button always ready

**Design decisions locked in this session**
| Decision | Detail |
|----------|--------|
| No Edit on labor records | Correction is the only action. Immutable after booking. |
| LOV description-first pattern | Description is primary text; code appears small + muted above. Applies to every LOV row across all forms. |
| No time entry mode toggle | Start/End time only. Direct hours mode is screen-designer configurable (future cycle). |
| Save button state | Gray + no-cursor when required fields incomplete; green + ready when all satisfied. Pattern applies to all sheets. |
| Field value colour | Body colour always. Purple reserved for step pill, section badges, focus states only — never on field values. |
| Crew selector | Pill at top of Add by Crew sheet, above member list. Defaults from activity. Changing reloads member list. |
| Correction stepper | 1-minute tap. Hold 3s → 15-minute repeat at 150ms interval. Stops on pointerup/pointerleave. |
| Labor row display | Description (full name) primary; code (employee ID) small + muted inline. Date + trade only in meta — no time range. |
| Detail grid values | Description (code) format throughout — e.g. "Maintenance (MAINT)", "Technician (TECH)". |

---

### WO Closing (Step 5) — `eam-wo-closing-prototype-v1.html`

**Screen anatomy**
1. Nav bar (dark)
2. WO identity block (collapsible)
3. Step rail — "5 of 5 · WO Closing", all 4 prior segments green
4. Status banner — shows current status (Released) → target status (tappable chip)
5. Closing Codes section — 2×2 grid, sequential unlock
6. Downtime Details section — Date completed (defaulted), Downtime hours, Downtime cost (both optional)
7. Closing Comments section — required textarea, 1000-char limit
8. Attachments section — source picker, list rows, viewer sheet
9. Bottom bar — locked until comments present; "Close Work Order" pill

**Interactions**
- Status banner chip → status picker sheet with user-authorised options (Completed / Closed / On hold); banner tint + icon + sub-text update to match
- Closing Codes 2×2 grid → sequential: Problem pre-filled (MECH), Failure unlocks on Problem set, Cause unlocks on Failure set, Action unlocks on Cause set; each tap opens LOV sheet; badge counts 1 of 4 → 4 of 4
- Downtime hours/cost → native prompt (real app: numeric input sheet)
- Comments textarea → char counter, badge switches Required → Complete, unlocks bar
- Add attachment → source picker sheet (Camera / Photo library / File or document)
- Attachment row tap → viewer sheet (photo placeholder or file icon, Open + Remove buttons)
- Remove → confirmation sheet naming the file, red confirm button
- Quick-remove ✕ on row → removes without viewer
- Close Work Order bar → confirm summary sheet (WO details + all codes + attachment count + target status); Execute Close → green full-screen closed overlay

**Design decisions locked in this session**
| Decision | Detail |
|----------|--------|
| WO Details section removed | Tech already knows the WO. Screen starts with status banner then codes. |
| Closing codes: 2×2 grid | Description primary, code small below. Sequential unlock — each cell dims until previous is set. |
| Sequential lock indicator | Small circular lock icon in cell footer when locked; swaps to chevron when unlocked. |
| Status banner: Option A | Contextual banner with tappable "to" chip. From chip is static (current status). To chip opens user-authorised picker sheet. Banner tint/icon/sub-text update per selection. |
| Downtime Details: own section | Date completed (auto-defaulted, editable), Downtime hours, Downtime cost. All optional. Sits between Closing Codes and Closing Comments. |
| Attachments: list rows not grid | Type-coded icon + filename + meta row. Tap → viewer sheet. No thumbnail grid — list scales to any file type. |
| Attachment source picker | Three options: Camera, Photo library, File or document. Each has distinct icon + description. |
| Viewer sheet | Full-screen sheet. Photo = coloured placeholder. Document = file icon + Open (native handoff). Both have Remove button → confirmation sheet. |
| Quick-remove | ✕ button on each row removes without opening viewer. |
| No attachment limit | Open-ended. Admin can configure if needed in a later cycle. |
| Bar gate | Comments required only. Codes, downtime, attachments are all optional. |

---

## Assembly brief for next session

### What the compile session needs to produce
A single self-contained HTML file (`eam-wo-prototype-full-v1.html`) covering all five steps of the WO execution workflow, navigable end-to-end.

### Source of truth per step
| Step | Source prototype | Notes |
|------|----------------|-------|
| Step 1: WO Record View | `eam-wo-prototype-issue-parts-v1.html` — use the nav/WO block/step rail shell from this file as the canonical frame | The v5 WO Record View screen is inside this file |
| Step 2: Activity Checklist | Same file — checklist screen is already in it | |
| Step 3: Issue Parts | Same file — Issue Parts screen is already in it | |
| Step 4: Book Labor | `eam-book-labor-prototype-v2.html` — extract screen content, drop into unified shell | |
| Step 5: WO Closing | `eam-wo-closing-prototype-v1.html` — extract screen content, drop into unified shell | |

### Shell decisions
- **Dark mode default** — the standalone prototypes default to light for review. The compiled prototype should default to dark mode (as per design doc). Toggle remains in header.
- **Canonical nav/WO block/step rail** — use the version from `eam-wo-prototype-issue-parts-v1.html` as the master. Steps 4 and 5 have slight nav variations (timer pill, all-done segments) that need to be driven by step state, not hardcoded.
- **Step navigation** — the step map items in the expanded rail should be tappable to jump between steps (already the case in existing prototypes — preserve this).
- **Timer** — the WO Record View "Start" button should start a running timer. The timer should be visible in the step rail collapsed view during Steps 2–4 (small pill, running). When Book Labor is reached, the timer stops and its value loads into the Book Labor timer banner + pre-fills the Add Labor form start/end times.

### Known discrepancies to resolve during compile
| Item | Detail |
|------|--------|
| Nav shell | Standalone prototypes use a simplified nav. Compile should use the locked nav from `eam-wo-prototype-issue-parts-v1.html` throughout. |
| Dark mode default | Standalones default light. Compiled should default dark. |
| Step rail timer pill | Only present in Book Labor standalone. Needs to appear in Steps 2–4 once timer is running, then show stopped state in Step 5. |
| WO identity block collapse | Collapses on "Start" in Step 1. Should remain collapsed through Steps 2–5 (collapsible at any point via handle). |
| Design doc | After compile, produce an updated `HxGN-EAM-Mobile-Design-Decisions-v3.docx` capturing all decisions locked across this cycle (Book Labor + WO Closing decisions above, plus the cascading design system decisions). |

### Design system decisions to carry through compile
All of these were locked in this session and must be consistent across all five steps:

1. **LOV description-first pattern** — description primary, code small + muted above. Every LOV row in every form across all steps.
2. **Save button state** — gray/locked until required fields complete; green/ready when satisfied. Every sheet save button.
3. **Field value colour** — body colour only. No purple on field values.
4. **Correction = only action** on booked labor records. No Edit.
5. **Detail grid values** — Description (CODE) format throughout.
6. **Section card pattern** — consistent header (title + badge), consistent border/radius across all steps.
7. **Bottom bar gating** — each step's lock rule as documented in v2 design doc + this handoff.

---

## Prototype data (carry through all steps)

```
WO:       19257 · Pump Cavitating; lost head
Type:     Corrective Maintenance · P4-HIGH · WATER
Asset:    00067333 — Pump, Centrifugal
Location: BELMONT-WWTP
Activity: 10 · TECH
Store:    IND-MAIN

Parts:
  1. 400-VP6-14  — O Ring EPDM            — 8 EA  — Bin A1-001 — Lot *      — 82 avail
  2. 200-AB8-001 — Casing (AB-8 Pump)     — 2 FA  — Bin C3-014 — Lot LOT-22 —  6 avail
  3. 400-VP6-16  — Flat Washer Steel       — 4 EA  — Bin A1-009 — Lot *      — 144 avail
  4. 200-AB8-006 — Ball Bearing, 2" Bore   — 2 EA  — Bin B2-033 — Lot LOT-08 — 11 avail

Labor (pre-booked on arrival at Book Labor step):
  BCAMPBELL — Brian Campbell — TECH · MAINT — 08:00–09:23 — 1h 23m — Normal (N)

Closing codes (pre-filled):
  Problem: MECH — Mechanical failure

Crew (BLUE — Blue Shift):
  BCAMPBELL — Brian Campbell — TECH · MAINT (already booked — locked in crew sheet)
  JRODRIGUEZ — Juan Rodriguez — TECH · MAINT
  MKUMAR     — Meera Kumar   — MECH · MAINT
  TPATEL     — Tariq Patel   — ELEC · MAINT
```

---

## Files produced this session

| File | Description |
|------|-------------|
| `eam-book-labor-prototype-v2.html` | Book Labor — final version (v1 was superseded) |
| `eam-wo-closing-prototype-v1.html` | WO Closing — final version |
| `EAM-HANDOFF-Book-Labor-and-WO-Closing.md` | This document |

`eam-book-labor-prototype-v1.html` is superseded by v2 — do not use in the compile.
