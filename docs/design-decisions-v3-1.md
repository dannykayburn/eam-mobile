# HxGN EAM Mobile App

Design Decisions & System Reference

Version 3.1 — July 2026 — Technician Persona / Work Order Execution

| | |
| --- | --- |
| **Product** | HxGN EAM / Attune EAM — enterprise asset management |
| **First persona** | Field technician executing work orders |
| **Platform** | iOS and Android — responsive PWA |
| **Prototype files** | eam-wo-prototype-issue-parts-v1.html (Steps 1–3) · eam-book-labor-prototype-v2.html (Step 4) · eam-wo-closing-prototype-v1.html (Step 5) · eam-wo-list-prototype-v5_1.html (WO List + Search) |
| **Status** | All five workflow steps: design complete. WO List + Search: design complete (v5.1). Workflow Execution Setup (base EAM): 3 admin screens prototyped. Pending: unified five-step prototype compile, Activity Screen, WO Insert Mode, Standard Update Mode, record-view child tabs, server config/login screens, offline-search row affordances. |
| **Doc version** | v3.1 — kickoff-review updates: punch-list mechanism reframed as an open decision (Option A static sync dataspy vs. Option B PIN projection, §2.6); Workflow Execution Setup screens recorded as the known base-EAM work (§2.7); full outstanding mobile scope captured (§18). v3.0 added Sections 12–14 and 16. |

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

## 2.4 Write path — constant regardless of connectivity

- Optimistic update to local DB + outbox enqueue happen simultaneously
- UI reflects the change instantly
- Sync engine drains the outbox to the API in the background when connected

## 2.5 Reconnect / re-sync

- Outbox flushes in order with idempotency UUIDs
- Delta pull via last_synced_at cursor — server returns only changed records
- Conflicts resolved last-write-wins by timestamp

## 2.6 Related architecture extensions

**Tiered record model / offline search (concept stage, pending review).** Decouples "synced" from "visible" via four record tiers (work set / search index / demand cache / server search). The decisions that affect UX are captured in Section 16. Full summary: EAM-Mobile-Offline-Search-Architecture-Summary.md

**The punch list — open decision, two options.** Tier 1 (the guaranteed-offline work set) is defined by a per-user punch list of work orders. The mechanism that produces that list is deliberately undecided; two candidate options are on the table for the development kickoff:

- **Option A — Static sync dataspy.** A configured dataspy defines the punch list, set at the user-group level and overridable down to a specific user. Zero new base schema; admins already know dataspies; the security model already governs them; the server-side dataspy pre-evaluation capability (needed for Tier 2 regardless) delivers it. Trade-offs: assignment logic is re-derived in dataspy SQL per customer, there is no provenance, and nothing is reusable for the personalized home screen, supervisor views, or notifications.
- **Option B — PIN enhancement (R5PINS).** A materialized projection of all assignment sources into one table with provenance; a base-EAM enhancement with its own spec: EAM-DESIGN-Pinning-Enhancement-v1.md. Assignment is resolved once and consistently, lifecycle is automatic, and the table backs several roadmap features. Trade-offs: real base-EAM work (new table, app-layer hooks, async diff job) plus its open design decisions.

Either way, the device-side contract is identical: a WO-ID membership list arrives at sync time and stamps pinned = 1 on wo_index rows. Tiers, eviction rules, and device behavior do not change with the choice — the mobile design does not block on it.

## 2.7 Base EAM work — Workflow Execution Setup

The known base-EAM work today is the Workflow Execution Setup screens: three admin screens (prototyped) that define the per-WO-type step sequence the mobile app executes (see §6.1). The punch-list Option B backend is additional base scope only if that option is chosen. Note: the Workflow Execution Setup prototype is not yet in this project's knowledge — screen-level decisions to be folded into this document once it is added.

# 3. Design Direction

## 3.1 Style direction

Three styles were explored: Modern Enterprise, Rugged Dark, and Industrial Neutral. Industrial Neutral (V3) was selected.

| | |
| --- | --- |
| **Description** | Dark slate nav chrome + white body content. Feels like a digital work permit, not a consumer app. |
| **Target user** | Technician in a plant or field environment — may be wearing gloves, working in variable lighting |
| **Rejected** | V1 Modern Enterprise (too Jira/software-forward), V2 Rugged Dark (too heavy for indoor use) |
| **Dark mode** | Fully supported — toggle in prototype header. Dark mode uses Octave Black (#1A1A1F) as canvas. |

# 4. Design Tokens — Octave Palette

All colours are from the Octave design system extended palette. Both light and dark mode mappings are implemented.

## 4.1 Core palette

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

## 4.2 Semantic usage

| Semantic | Token |
| --- | --- |
| **Active / selected** | Purple (#9933FF) |
| **Positive answer** | Green (#00AA14) — Pass, OK, Yes, Good, confirmed checkbox |
| **Negative answer** | Red (#E24B4A) — Fail, Repair Needed, No, Poor |
| **Adjusted / warning** | Orange (#F46600) — Adjusted toggle, follow-up button active |
| **N/A / neutral answer** | Gray 4 (#6F7480) |
| **Sync: synced** | Green (#00AA14) |
| **Sync: offline/pending** | Orange (#F46600) |
| **Sync: error** | Red (#E24B4A) |
| **Sync: syncing** | Purple (#9933FF) |
| **Required field marker** | Orange (#F46600) left bar on form row (3px, inset) |
| **Protected field** | Gray tint background, muted value, lock icon instead of chevron |
| **Group: Safety** | Orange — header tint rgba(244,102,0,0.09), bar rgba(244,102,0,0.35) |
| **Group: Main checklist** | Purple — header tint rgba(153,51,255,0.09), bar rgba(153,51,255,0.35) |
| **Group: Close-out** | Green — header tint rgba(0,170,20,0.09), bar rgba(0,170,20,0.35) |

# 5. Typography

| | |
| --- | --- |
| **Octave brand font** | Aptos Regular — Microsoft-proprietary, not available via CDN |
| **Prototype stand-in** | Inter (Google Fonts) — closest publicly available match, same Swiss rational sans-serif character |
| **Monospace / UI code** | JetBrains Mono — WO numbers, part numbers, sequence counters, timestamps, char counts, metadata, bin locations |
| **Rejected** | IBM Plex Sans (used in earlier prototype versions) |
| **Why Inter over IBM Plex** | Better match to Aptos proportions and weight; used by Atlassian as the basis for Atlassian Sans |

# 6. Navigation & Guided Workflow

## 6.1 Workflow engine

The admin configures a step sequence per WO type in the base module. The technician gets a linear guided experience through those steps.

| Step | Screen |
| --- | --- |
| **Step 1** | WO Record View — review details, select activity, start |
| **Step 2** | Activity Checklist — complete all required items |
| **Step 3** | Issue Parts — prompted after checklist (Yes/No prompt bar) |
| **Step 4** | Book Labor — log time against WO |
| **Step 5** | WO Closing — comments (required) + closing codes, downtime, attachments (optional) |

## 6.2 Step rail (collapsed)

- Persistent at top of screen below nav — always visible
- Shows: step pill ("2 of 5") + current step name + 5-segment progress bar
- Segments: done = green, active = purple, future = gray
- Timer pill appears in the collapsed rail while the WO timer is running (Steps 2–4); shows stopped state from Book Labor onward
- Tap or pull to expand full step map

## 6.3 Step map (expanded)

- Vertical timeline — all steps visible
- Done steps: green filled circle with checkmark
- Active step: purple filled circle, highlighted row background
- Locked steps: gray bordered circle with step number
- Admin-configurable: freely jumpable or strictly linear per WO type
- Prototype: freely jumpable — any step tappable in expanded map
- Footer note: "Admin configured · Corrective Maintenance WO type"

## 6.4 WO identity block (collapsible)

- Sits between nav row and step rail
- Contains: WO number (monospace), WO description, type/priority/discipline ribbon chips
- Expanded by default on step 0
- Collapses automatically when Start is tapped; remains collapsed through Steps 2–5
- Tap handle at bottom to expand/collapse at any point in lifecycle
- Collapsed state shows WO number as one-line summary

# 7. Bottom Bar — Progression Control

## 7.1 Standard step bar (C-style inset pill)

- Persistent strip at bottom — always present, never scrolls away
- Neutral strip background (Gray 1 light / Black dark)
- Inset pill: locked state = white/dark bg, gray border, lock icon, descriptive label
- Inset pill: ready state = full green fill, white text, checkmark icon
- Meta counter right of pill (e.g. "3 / 6 done") — turns green when ready
- Tapping locked bar fires a toast: context-specific message per step

## 7.2 Prompt bar — Yes/No (Option 4 segmented)

- Replaces standard bar when a branching question is triggered (e.g. "Did you issue parts?")
- Structure: monospace question label above, segmented control below
- Segmented: Yes (green fill) | No (neutral) — separated by thin divider
- Full-width edge-to-edge, border-radius on outer container only
- Yes routes to Issue Parts screen; No skips to Book Labor

## 7.3 Bar locking rules per step

| Step | Rule |
| --- | --- |
| **Step 1 — WO Record View** | Locked until an activity is selected. Label: "Select an activity to start" |
| **Step 2 — Checklist** | Locked until all required items (*) have a response. Counter shows all-item progress. |
| **Step 3 — Issue Parts** | Auto-ready — no gate. Issuing parts is optional. |
| **Step 4 — Book Labor** | Auto-ready — no gate. |
| **Step 5 — WO Closing** | Locked until closing comments textarea has content. Label: "Add closing comments" |

# 8. Sync Status System

## 8.1 Sync icon (nav row, top right)

The sync icon is the primary sync surface. Five states, communicated by icon + tinted background colour.

| State | Treatment |
| --- | --- |
| **Synced** | Green tint + cloud-check icon. Outbox empty, local DB matches server. |
| **Syncing** | Purple tint + refresh icon. Outbox draining, delta pull in progress. |
| **Offline** | Gray tint + cloud-off icon. No connection, writes queued in outbox. |
| **Pending** | Orange tint + cloud-upload icon. Reconnected, outbox flushing in order. |
| **Error** | Red tint + cloud-exclamation icon. Outbox item failed after retry, needs review. |

## 8.2 Sync panel (bottom sheet)

- Slides up as bottom sheet — tap backdrop to dismiss
- Header: sync icon + title + state label
- Per-item outbox rows: green/orange/red dot + item name + timestamp/status
- Retry action on queued items, Review action on failed items
- Hydration progress section: four bars showing Today's WOs / Site assets / Lookup tables / Historical docs
- Removed: bottom sync row from bar area — all sync communication through icon + panel

# 9. WO Record View (Step 1)

## 9.1 Screen sections (top to bottom)

- Work order details — asset, location, assigned to, reported by, est. duration, created
- Notes — renamed from "Description". Free text field from WO record.
- Activities — expanded by default, single-select radio list. Locks bar until selection made.
- Comments — collapsed by default with count badge. Inline expand shows threaded comments.
- Documents — collapsed by default with count badge. Inline expand shows file list.

## 9.2 Activity selector

- Single select — one activity at a time. Drives all downstream steps.
- Selected activity determines: task plan checklist, planned parts, labor to book against
- Radio button fills purple on selection
- If no activities exist: show + Add Activity affordance
- Bottom bar stays locked until an activity is selected

## 9.3 Collapsible sections

- All three (Activities, Comments, Documents) use same toggle row pattern
- Toggle row: left icon + title, right badge count + chevron
- Chevron rotates 180° when open
- Activities: badge shows "N available" in purple
- Comments / Documents: badge shows count in gray

# 10. Activity Checklist (Step 2)

## 10.1 Group structure

- Items grouped by Group Label field from task plan setup
- Sticky group header: tinted background + full-strength left bar in group colour
- Header shows group name (uppercase monospace) + live "done / total" counter
- Items without a group label fall into an implicit section

## 10.2 Item anatomy

- Color bar — 3px left edge, full item height including notes row, 35% opacity in group colour
- Main column — sequence number, label (14px/600), equipment chip (monospace pill), required star, type input
- Rail column — book icon (instructions) + paperclip icon (docs), grey when empty, purple when content present
- Notes row — Follow-up button left, divider, notes trigger right. Full width, inside color bar.

## 10.3 Checklist item types (17 total)

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

## 10.4 Toggle fill colours

| Answer | Fill |
| --- | --- |
| **Pass / OK / Yes / Good / Confirmed** | Full green fill (#00AA14), white bold text |
| **Fail / Repair Needed / No / Poor** | Full red fill (#E24B4A), white bold text |
| **Adjusted** | Full orange fill (#F46600), white bold text |
| **N/A** | Full gray fill (#6F7480), white bold text |
| **Unselected options** | Light gray background (section-bg), muted text |

# 11. Issue Parts (Step 3)

Added in session: May 2026. Prototype: eam-wo-prototype-issue-parts-v1.html

## 11.1 Screen entry

- Triggered by the Yes/No prompt bar at end of Activity Checklist: "Did you need to issue parts?"
- Yes — navigates to Issue Parts. No — skips to Book Labor.
- Bottom bar is auto-ready on this step — no gate. Issuing parts is optional.

## 11.2 Screen header

- Title: "Issue Parts" (left)
- Storeroom selector pill (right): monospace store code, chevron, tappable to change store
- Store defaults from WO — most techs will never need to change it
- Changing the store updates the active store for all transactions on this screen

## 11.3 Parts summary bar

- Three stats: Planned | Issued | Remaining
- Issued count and colour update in real time as parts are issued
- Purple tint background, lives directly below screen header

## 11.4 Planned parts list

- One card per planned part, ordered as planned on the activity
- Card anatomy: left status bar (gray → green on issue) | part number (purple monospace) | description | meta row | qty badge | Quick Issue/Return button
- Meta row shows: UOM value · Store · Bin — Activity is NOT shown (inherited through workflow)
- Qty badge: purple "8 EA" (planned) → green "8 EA ✓" (issued)
- Quick Issue/Return button: outlined pill, becomes green "Issued · Return?" after issue
- Cards update in-place when issued — no separate issued list

## 11.5 Add Parts button

- Octave outlined button style — solid border, full-opacity label, pill shape, 46px height
- Positioned above Quick Issue All Planned Parts
- Opens the ad hoc Issue/Return sheet
- Hover: aqua border and text (Octave outlined hover spec)

## 11.6 Quick Issue All Planned Parts button

- Octave contained button style — Octave Black background, white text, pill shape, 46px height
- Positioned below the planned parts list, below Add Parts
- Only acts on un-issued parts — already-issued parts are skipped
- Tapping opens a confirmation sheet before executing (see 11.7)
- Disables itself once all planned parts are issued

## 11.7 Quick Issue All — confirmation sheet

- Bottom sheet, max 70% viewport height, scrollable if many parts
- Orange warning banner: "Verify quantities before issuing — Adjust any quantity if needed, then tap Issue All to confirm"
- One row per un-issued part: part number (purple) | description | bin · available qty
- Inline stepper per row: − / qty / + — defaults to planned qty, min 1, max available stock
- Qty value flashes purple briefly when adjusted to confirm the change registered
- Footer: Cancel (gray outlined) + Issue All buttons
- Issue All executes with whatever qtys are shown — updates card badges accordingly

## 11.8 Issue/Return sheet — planned parts

- Opens from Quick Issue/Return button on a part card
- Issue / Return segment control at top — drives transaction mode throughout
- Part identity shown as purple header block (part number + description) — NOT repeated as an editable LOV row below
- Field order: Store → Available Qty + bin stock list → Bin → Lot (conditional) → Transaction Qty → Asset ID

## 11.9 Issue/Return sheet — ad hoc

- Opens from Add Parts button
- Part field replaced by large centred search/scan block — search icon, "Search or scan a part" headline, hint text
- Once a part is selected, the search block is replaced by the purple part header (same as planned parts sheet)
- Same field order as planned parts sheet below the part block

## 11.10 Form field rules

| Field | State | Notes |
| --- | --- | --- |
| **Store** | Editable LOV | Required. Defaults from screen-level selector. Chevron. First editable field. |
| **Available Qty** | Protected | Read-only. Resolves from store + part. Lock icon, dimmed background. Positioned directly below Store so context is immediate. |
| **Bin stock list** | Read-only | Top 3 bin records from selected store, sorted qty descending. Shows bin location, lot tag (if SHOWLOT=YES), qty in green. Same API call as Available Qty — no extra round trip. See 11.11. |
| **Part** | Editable LOV | Required. Pre-filled from planned list. Header block only on planned sheet. Search block on ad hoc sheet. |
| **Bin** | Editable LOV | Required. Pre-filled from planned list. Cascades from part on ad hoc. |
| **Lot** | Editable LOV | Conditional — shown only when storeroom SHOWLOT=YES. See 11.12. |
| **Transaction Qty** | Stepper | Required. Defaults to planned qty. Min 1, max available stock. +/− buttons, monospace value, UOM label. |
| **Asset ID** | Protected | Inherited from WO. Lock icon, dimmed background. NOT editable. |
| **Activity** | Hidden | Inherited through workflow context. Not shown in form. |
| **Issue/Return** | Hidden | Driven by segment toggle at top of sheet. Not shown as a field row. |
| **Department** | Hidden | Not shown. Inherited from WO context. |
| **Cost Code** | Hidden | Not shown. Inherited from WO context. |
| **Material List** | Hidden | Not shown. |

## 11.11 Bin stock list — design specification

- Rendered below Available Qty row, inside the same sheet body
- Data source: storeroom stock query for selected part + store — same call as Available Qty, no extra round trip
- Returns up to 3 bin records, sorted by quantity on-hand descending
- Each row: green dot · bin location (monospace) · lot tag if SHOWLOT=YES · qty in green monospace
- Purpose: lets the technician choose the most efficient bin without leaving the form
- Selecting a bin from this list should pre-fill the Bin LOV field (future interaction — not yet prototyped)

## 11.12 SHOWLOT flag

- SHOWLOT is a storeroom-level configuration flag (YES / NO)
- When SHOWLOT=YES: Lot LOV row is shown in the form, and lot column appears in the bin stock list
- When SHOWLOT=NO: Lot row is hidden entirely — do not show an empty or dash state, remove the row
- Lot column in the bin stock list is also hidden when SHOWLOT=NO
- Prototype renders SHOWLOT=YES by default

## 11.13 Save button

- Octave contained button style: white background, dark text, 50px height, full-width pill
- Hover: aqua (#00FFFF) background, very dark text
- NOT teal #007B87 — teal is not in the Octave palette. White contained is the correct primary action button.

## 11.14 Button hierarchy on main screen

| Button | Role |
| --- | --- |
| **Quick Issue All Planned Parts** | Primary action — Octave Black contained button. White text. Most impactful action on the screen. |
| **Add Parts** | Secondary action — Octave outlined button. Solid Gray 5 border, full-opacity text, pill shape. Aqua on hover. NOT dashed, NOT muted. |
| **Quick Issue/Return (per card)** | Tertiary action — outlined pill per card. Becomes green "Issued · Return?" after issue. |

# 12. Book Labor (Step 4)

Added in session: May 2026. Prototype: eam-book-labor-prototype-v2.html (v1 superseded — do not use).

## 12.1 Screen anatomy (top to bottom)

- Nav bar (dark)
- WO identity block (collapsible, collapsed by default at this step)
- Step rail — "4 of 5 · Book Labor" + stopped timer pill (e.g. 01:23:47)
- Timer banner — purple, shows elapsed time + start/end times loaded from the WO timer
- Screen header — "Book Labor" + record count
- Labor list — inline-expand rows
- Add Labor + Add by Crew buttons (outlined, side by side)
- Activity summary cards — Total hours / Technicians / Entries
- Bottom bar — auto-ready, "Next: WO Closing"

## 12.2 Timer integration

- The WO Record View "Start" button starts the WO timer
- Timer is visible as a small running pill in the collapsed step rail during Steps 2–4
- When Book Labor is reached, the timer stops; its value loads into the timer banner and pre-fills the Add Labor form start/end times

## 12.3 Labor list rows

- Row display: description (full name) primary; code (employee ID) small + muted inline
- Meta row: date + trade only — no time range
- Tap row → expands inline to show detail grid + "Create correction" action
- No Edit action — correction is the only action on booked labor (records are immutable after booking)
- Detail grid values use Description (CODE) format throughout — e.g. "Maintenance (MAINT)", "Technician (TECH)"

## 12.4 Add Labor sheet

- Start/End time entry only — no time entry mode toggle (direct-hours mode is screen-designer configurable, future cycle)
- Start/end times pre-filled from the stopped WO timer
- Required fields gate the Save button: gray + no-cursor until complete, green + ready when satisfied

## 12.5 Add by Crew sheet

- Crew selector pill at top of sheet, above member list (same pattern as store selector on Issue Parts)
- Crew defaults from activity; changing the crew reloads the member list
- Per-member toggles; members already booked are shown locked
- Shared time fields apply to all selected members
- Save button gates on member selection + required fields

## 12.6 Correction sheet

- 1-minute stepper per tap; hold 3 seconds → repeats at 15-minute increments (150ms interval); stops on pointer up / pointer leave
- Reason textarea
- Red Save button, always ready (correction is deliberate — no gating)

## 12.7 Design decisions locked (Book Labor)

| Decision | Detail |
| --- | --- |
| **No Edit on labor records** | Correction is the only action. Immutable after booking. |
| **LOV description-first pattern** | Description is primary text; code appears small + muted above. Applies to every LOV row across all forms. |
| **No time entry mode toggle** | Start/End time only. Direct hours mode is screen-designer configurable (future cycle). |
| **Save button state** | Gray + no-cursor when required fields incomplete; green + ready when all satisfied. Pattern applies to all sheets. |
| **Field value colour** | Body colour always. Purple reserved for step pill, section badges, focus states only — never on field values. |
| **Crew selector** | Pill at top of Add by Crew sheet, above member list. Defaults from activity. Changing reloads member list. |
| **Correction stepper** | 1-minute tap. Hold 3s → 15-minute repeat at 150ms interval. Stops on pointerup/pointerleave. |
| **Labor row display** | Description (full name) primary; code (employee ID) small + muted inline. Date + trade only in meta — no time range. |
| **Detail grid values** | Description (code) format throughout — e.g. "Maintenance (MAINT)", "Technician (TECH)". |

# 13. WO Closing (Step 5)

Added in session: May 2026. Prototype: eam-wo-closing-prototype-v1.html

## 13.1 Screen anatomy (top to bottom)

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

## 13.2 Status banner (Option A)

- Contextual banner with tappable "to" chip; "from" chip is static (current status)
- To chip opens a status picker sheet showing only user-authorised options (e.g. Completed / Closed / On hold)
- Banner tint, icon, and sub-text update to match the selected target status

## 13.3 Closing codes — 2×2 grid, sequential unlock

- Four cells: Problem / Failure / Cause / Action
- Description primary, code small below (LOV description-first pattern)
- Sequential unlock — each cell dims until the previous is set: Problem may be pre-filled; Failure unlocks on Problem, Cause on Failure, Action on Cause
- Lock indicator: small circular lock icon in cell footer when locked; swaps to chevron when unlocked
- Each tap opens an LOV sheet; section badge counts 1 of 4 → 4 of 4

## 13.4 Downtime Details

- Own section, positioned between Closing Codes and Closing Comments
- Date completed — auto-defaulted, editable
- Downtime hours, Downtime cost — both optional numeric entry

## 13.5 Closing Comments

- Required textarea, 1000-character limit with live char counter
- Section badge switches Required → Complete when content present; unlocks the bottom bar

## 13.6 Attachments

- List rows, not a thumbnail grid — type-coded icon + filename + meta row; list scales to any file type
- Source picker sheet with three options: Camera, Photo library, File or document — each with distinct icon + description
- Row tap → full-screen viewer sheet: photo = coloured placeholder; document = file icon + Open (native handoff); both have Remove → confirmation sheet naming the file (red confirm)
- Quick-remove ✕ on each row removes without opening the viewer
- No attachment limit — open-ended; admin can configure in a later cycle

## 13.7 Close confirmation

- "Close Work Order" bar → confirm summary sheet: WO details + all codes + attachment count + target status
- Execute Close → green full-screen closed overlay

## 13.8 Design decisions locked (WO Closing)

| Decision | Detail |
| --- | --- |
| **WO Details section removed** | Tech already knows the WO. Screen starts with status banner then codes. |
| **Closing codes: 2×2 grid** | Description primary, code small below. Sequential unlock — each cell dims until previous is set. |
| **Sequential lock indicator** | Small circular lock icon in cell footer when locked; swaps to chevron when unlocked. |
| **Status banner: Option A** | Contextual banner with tappable "to" chip. From chip is static. To chip opens user-authorised picker sheet. Banner tint/icon/sub-text update per selection. |
| **Downtime Details: own section** | Date completed (auto-defaulted, editable), Downtime hours, Downtime cost. All optional. Sits between Closing Codes and Closing Comments. |
| **Attachments: list rows not grid** | Type-coded icon + filename + meta row. Tap → viewer sheet. No thumbnail grid — list scales to any file type. |
| **Attachment source picker** | Three options: Camera, Photo library, File or document. Each has distinct icon + description. |
| **Viewer sheet** | Full-screen sheet. Photo = coloured placeholder. Document = file icon + Open (native handoff). Both have Remove button → confirmation sheet. |
| **Quick-remove** | ✕ button on each row removes without opening viewer. |
| **No attachment limit** | Open-ended. Admin can configure if needed in a later cycle. |
| **Bar gate** | Comments required only. Codes, downtime, attachments are all optional. |

# 14. WO List & Search (Entry Point)

Added: July 2026. Prototype: eam-wo-list-prototype-v5_1.html. This section was reverse-documented from the v5.1 prototype — decisions below reflect what is built; flag anything provisional during review.

## 14.1 Screen role

- The WO List is the technician's entry point — the personalised WO queue
- Two screens: WO List (dataspy-scoped queue) and Search (ad hoc lookup) — search is a separate full screen, not an inline filter of the list

## 14.2 Nav bar (WO List)

- Left: app logo (wrench mark)
- Title: "Work orders"
- Right actions: Create WO (+), Search (magnifier), sync status dot (same 5-state sync language as workflow screens)

## 14.3 Dataspy bar

- Full-width bar directly below nav: database icon + active dataspy name + live record count + chevron
- Tap opens the dataspy selector bottom sheet — single-select rows with checkmark on the active dataspy
- Dataspy examples: My Assigned WOs (default, personal), Today's Work, High Priority — Open, My Department, Breakdown WOs, Waiting Approval, All Open WOs, Preventive Maintenance
- The dataspy is the primary scoping mechanism for the queue; the record count updates live on switch

## 14.4 View modes — Detailed / List

- Segmented mode toggle below the dataspy bar: Detailed (default) and List
- Detailed = card view; List = compact horizontally-scrollable table
- Mode persists across the WO List and Search screens

## 14.5 Detailed card anatomy

- Left: WO type icon block — type icon on tinted background in type colour
- Row 1: WO number (monospace) + status badge (icon + label)
- Equipment description (primary text) + equipment code (small monospace below)
- Pills row: WO type pill (icon + name, type colour) + priority pill (icon + label)
- Meta row: location (map-pin) · department/org (building) · due date (calendar) — separated by dots

## 14.6 List table anatomy

- Compact table: chevron (parents only) + type dot + equipment description | WO number | priority icon | status badge | org
- Horizontally scrollable to preserve column legibility at phone width
- Header row with column labels

## 14.7 WO icon language

| Dimension | Mapping |
| --- | --- |
| **Type — Breakdown (BK)** | Alert icon, red #E24B4A |
| **Type — Calibration (CAL)** | Adjust/sliders icon, teal #007B87 |
| **Type — Corrective maint (CM)** | Tool icon, orange #F46600 |
| **Type — Inspection (INS)** | Eye icon, purple #9933FF |
| **Type — Modification (MOD)** | Settings icon, gray #6F7480 |
| **Type — Preventive maint (PM)** | Calendar-check icon, green #00AA14 |
| **Priority 2 — Low** | Circle-dot icon, green #00AA14 |
| **Priority 3 — Medium** | Arrow-up icon, orange #F46600 |
| **Priority 4 — High** | Bold arrow-up icon, red #E24B4A |
| **Priority 5 — Critical** | Flame icon, red #E24B4A |
| **Status — Released** | Send icon, green |
| **Status — Waiting approval** | Clock icon, orange |
| **Status — Waiting materials** | Package icon, teal |
| **Status — Completed** | Circle-check icon, purple |

All type/status icons render on a 12% opacity tint of their colour.

## 14.8 Due date treatment

- Due date in card meta row is urgency-tinted: Today and Tomorrow get emphasis treatment; later dates render neutral

## 14.9 Parent / child work orders

- Parent WOs carry an expand chevron (both view modes); tapping expands child WOs inline (indented rows / stacked cards)
- Dataspy filtering keeps the parent visible whenever any of its children match, so children are never orphaned from context

## 14.10 Sort

- Results row shows record count (left) + sort control (right), current sort labelled (e.g. "Due date")

## 14.11 Search screen

- Separate full screen entered from the magnifier icon; back/close returns to the list
- Search field auto-focuses on entry; clear (✕) button appears when text present
- Matching: contains-match across WO number, equipment description, and equipment code
- Filter chips row below search field: Type · Status · Department · Priority
- Each chip opens a multi-select bottom sheet: search-within field, Clear, icon-tinted rows (description primary, code small — LOV description-first pattern), radio-style toggles, Apply button
- Applied chips show an active state with a count badge (e.g. "Type 2")
- Empty state: centred icon + "No work orders found" + hint ("Try a different dataspy or adjust your search")

## 14.12 Toasts

- Same dark-chip toast pattern as workflow screens; used for apply confirmations and stubbed actions in the prototype

# 15. Component Patterns — Locked

| Pattern | Spec |
| --- | --- |
| **Step rail** | Collapsed: pill + name + segmented bar (+ timer pill when running). Expanded: vertical timeline with icon/badge/meta per step. |
| **Progress bar style** | C-style: neutral strip + inset pill. Pill transforms locked→ready→done. |
| **Prompt bar style** | Option 4: monospace question label + segmented yes/no control. Full-width, edge-to-edge. |
| **Group color bar** | Option B: tinted section header + 35% opacity bar on items. Bar runs full item height including notes row. |
| **Checklist item** | Hybrid B/C: rail icons (right column) + inline notes trigger row + follow-up in notes row. |
| **Toast style** | Dark chip, bottom of screen, orange alert icon, 2.4s auto-dismiss, context-specific message. |
| **Bottom sheet style** | Border-radius 20px top, handle bar, header with title + close, scrollable body. |
| **Sync panel** | Bottom sheet variant with per-item dot rows and hydration progress bars. |
| **Form field: editable** | Label left (120px, gray-4), value right (monospace, body colour), chevron right edge. |
| **Form field: protected** | Same row pattern. Gray tint background, muted value colour, lock icon instead of chevron. Not tappable. |
| **Form field: required** | Orange 3px left bar, inset from edge. |
| **LOV row: description-first** | Description is primary text; code small + muted. Applies to every LOV row across all forms and sheets. |
| **Field value colour** | Body colour always. Purple reserved for step pill, section badges, and focus states — never on field values. |
| **Save button gating** | Gray + no-cursor while required fields incomplete; green + ready when satisfied. Applies to every sheet save button. |
| **Detail grid values** | Description (CODE) format throughout — e.g. "Maintenance (MAINT)". |
| **Section card** | Consistent header (title + badge) and consistent border/radius across all steps. |
| **Selector pill in sheets** | Context selector (store, crew) as pill at top of sheet, above list content. Defaults from context; changing reloads dependent content. |
| **Part header block** | Purple tint background, part number in purple monospace, description in bold. Replaces Part LOV row in sheets. |
| **Part search block** | Ad hoc empty state. Centred icon + headline + hint. Tappable. Replaced by part header block once part selected. |
| **Btn: contained** | White bg, dark text, 48–50px height, 100px border-radius. Hover: aqua bg, very dark text. |
| **Btn: outlined** | Transparent bg, solid border (Gray 5 / white in dark), same pill radius. Hover: aqua border + text. |
| **Bin stock list** | Below Available Qty in issue sheet. Up to 3 rows, qty desc. Dot + bin + lot tag + qty. Same API call as avail qty. |
| **WO icon language** | Type/priority/status icon set per Section 14.7 — consistent across list, cards, chips, and filter sheets. |

# 16. Search Functionality — Design Decisions

Added: July 2026. Source: offline search architecture sessions (tiered record model). See also Section 2.6.

| Decision | Rationale |
| --- | --- |
| **"Synced" ≠ "visible"** | The old assumption that a record must be fully synced to be searchable is false. Decoupling the two is what makes offline search of thousands of 150-field WOs tractable. |
| **Four-tier record model (Work set / Search index / Demand cache / Server search)** | Matches the offline guarantee to actual need — full data for active work, a lightweight index for search, on-demand hydration for occasional access, online escalation for full-fidelity search. |
| **Tier 2 stores only ~8–12 projected fields per row, via FTS5** | Tens of thousands of rows at ~300 bytes each is trivial for SQLite. Keeps offline search instant without needing full records. |
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
| **Row state surfaced via the existing 5-state sync icon language** | No new visual system — consistency with the rest of the app's sync vocabulary. |
| **Index freshness caption shown when offline (e.g. "results as of 2:14 PM")** | Tier 2 stubs are only as current as the last index sync — the technician needs to know that. |

Still open, not decided: punch-list mechanism (Option A static sync dataspy vs. Option B PIN projection — see §2.6); FTS5 availability in the final DB engine choice; dirty as counter vs. boolean; confirmation that the existing dataspy SQL API can serve Tier 4 as-is.

# 17. Key Decisions Log

| Decision | Detail |
| --- | --- |
| **No blocking modals** | Progressive hydration replaces blocking modal on launch. App usable within ~30s. |
| **Offline status removed from bar** | Sync status moved entirely to nav icon + panel. Bar is for progression only. |
| **Nonconformity types deferred** | NC types (Nonconformity Check, NC Measurement) deferred as fringe use case. |
| **WO identity collapsible** | Collapses on Start to give content area maximum height. Remains collapsed through Steps 2–5. |
| **Required = warning not block** | Required Entry enforced as amber warning bar + override, not a hard block. |
| **Group label = sticky header** | Sticky group headers with live progress counter. |
| **Activity single-select** | One activity at a time. Drives task plan, parts, and labor context downstream. |
| **Comments/docs inline** | Collapsed sections inline on WO Record View — not a sheet. |
| **Font: Inter as Aptos stand-in** | Aptos is Microsoft-proprietary. Inter used in prototype as closest freely available match. |
| **Activity not shown in Issue form** | Activity is inherited through workflow. Showing it in the Issue/Return form adds noise without value. |
| **Issue/Return not shown as field** | Driven by the segment toggle at the top of the sheet. Redundant as a field row. |
| **Dept/Cost Code/MatList hidden** | All three inherited from WO context. Not shown in Issue/Return form. |
| **Issue Parts bar: auto-ready** | Issuing parts is optional. The step is not gated — the tech can proceed to Book Labor without issuing. |
| **Available Qty directly under Store** | Tech selects store, immediately sees stock. Logical data dependency reflected in layout. |
| **Bin stock list (top 3, qty desc)** | Shows available bins ranked by stock. Helps tech pick the most efficient bin without leaving the form. No extra API call. |
| **SHOWLOT conditional display** | Lot row hidden entirely when SHOWLOT=NO. No empty state. Bin stock list lot column also hidden. |
| **Save button: white contained** | Teal #007B87 was wrong — not in Octave palette. Correct spec: white bg, dark text, aqua hover. |
| **Quick Issue All has confirmation** | Sheet lists pending parts with inline qty steppers before executing. Qty defaults to planned, adjustable to available stock max. |
| **Part shown as header, not LOV row** | Purple header block (num + desc) is the part surface in both planned and ad hoc sheets. No redundant LOV row below it. |
| **No Edit on labor records** | Correction is the only action on booked labor. Records immutable after booking. |
| **LOV description-first** | Description primary, code small + muted — every LOV row, every form, all steps. |
| **No time entry mode toggle** | Start/End time only. Direct hours mode deferred to screen-designer configuration. |
| **Save gating pattern** | Gray/locked → green/ready driven by required-field completeness. All sheets. |
| **Field value colour = body** | Purple never used on field values — reserved for step pill, badges, focus. |
| **WO Details removed from Closing** | Tech already knows the WO — closing screen starts at status banner. |
| **Closing codes sequential unlock** | Problem → Failure → Cause → Action. Each cell locked until predecessor set. |
| **Closing bar gate: comments only** | Codes, downtime, attachments all optional. Comments required. |
| **Attachments as list, no limit** | List rows scale to any file type. No cap; admin-configurable later. |
| **Dataspy = primary list scoping** | The WO List is scoped by the active dataspy; search is a separate screen for ad hoc lookup. |
| **Detailed/List dual view modes** | Card view for context-rich scanning; compact table for density. Mode persists across screens. |
| **WO icon language** | Fixed icon + colour mapping for type, priority, and status — reused across cards, tables, chips, and filter sheets. |
| **Parent kept when child matches** | Dataspy/search filtering never orphans a child WO from its parent row. |
| **Dark mode default (compiled)** | Standalone prototypes default light for review; the unified prototype defaults dark per design direction. |

# 18. Remaining Work

| Item | Detail |
| --- | --- |
| **Unified prototype compile** | eam-wo-prototype-full-v1.html — all five steps in one navigable file. Assembly brief in EAM-HANDOFF-Book-Labor-and-WO-Closing.md. Dark mode default; canonical nav/WO block/step rail from the Issue Parts prototype; step-state-driven rail variations; end-to-end timer behaviour. |
| **Activity Screen** | Timer, task plan reference, assignment status. Ref: Activity_Selector.png. |
| **Per-row sync affordance (WO List)** | Map the 3 offline-search row states (stub / hydrated / ephemeral) onto the existing 5-state sync icon language at row level. Specified in the offline search architecture; not yet in the v5.1 prototype. |
| **Index freshness caption (WO List)** | "Results as of <time>" caption when offline. Specified; not yet in the v5.1 prototype. |
| **Bin pre-fill from stock list** | Selecting a bin in the bin stock list pre-fills the Bin LOV. Specified in 11.11; not yet prototyped. |
| **WO Insert Mode** | Create-work-order flow. Entry from the WO List create (+) affordance. Not started. |
| **Standard Update Mode** | Update flows for equipment and other non-workflow records — the standard (non-guided) record view pattern. Not started. |
| **Record-view child tabs** | Child list / detail tabs for standard record views — selection layout. Not started. |
| **Server configuration + login screens** | First-run setup (QR scan / manual server + tenant), SSO/OIDC login, biometric unlock. Assumed parity with current apps until designed. Not started. |
| **Workflow Execution Setup — merge** | Fold the 3 prototyped base admin screens into this document once the prototype is added to project knowledge (see §2.7). |
| **Punch-list mechanism decision** | Option A (static sync dataspy, group/user level) vs. Option B (PIN projection) — kickoff decision. On decision: if B, merge PIN spec per its plan; if A, document dataspy configuration model here. |
| **Tiered record model review** | On approval: merge tier-model architecture into Section 2. |

End of document

HxGN EAM Mobile — Design Decisions v3.0
