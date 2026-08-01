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
| **Doc version** | v3.1. This cell is a pointer, not a changelog — locked rules live in the numbered sections below (§1–§25), each governing its own topic; superseded/reversed decisions live in §21 with a short "old → new, why" note; genuinely open items live in §20. Don't restate a decision here — add it to the section that owns it. Structural convention: Standard Model sections (§5–§9) hold the canonical/generic version of any cross-cutting rule; other sections point back to them rather than repeating them. |

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
| **Every container is collapsible** (added 2026-07-16) | The section-card header is the tap target (the whole row, not a separate chevron button) — toggles a `collapsed` class on the card, chevron rotates -90° when collapsed, body hides. Default open/collapsed state is a per-screen call, not a mandated universal default — required content defaulting open and optional content defaulting collapsed is a sensible starting heuristic, not a rule. Reference implementation: WO Closing's 4 section cards — Closing Codes and Closing Comments (both required) default open; Downtime Details and Attachments (both optional) default collapsed. Not yet ported to Equipment or the sample screen. |
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
different, semi-connected model from this app's offline-first design
(§2), so don't carry over its sync-config mechanics, only its
screen-level scope ideas.

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
- Hydration progress section: four bars showing Today's WOs / Site assets / Lookup tables / Historical docs
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
available on the WO dataspy (all locally-synced fields offline, full
server columns via Tier 4 online escalation), not a fixed 5-column
layout. See §21 for the retired bespoke version.

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
- **Comment author label, avatar, and actions — locked, module-agnostic.**
  A comment's header row shows exactly two things next to its timestamp:
  the commenting user's **description** (their display name — same
  "description, not code/ID" philosophy as every LOV field, §3.4) and the
  ellipsis for Edit/Delete/Copy. **No avatar/profile picture** — name text
  alone carries enough identity for a comment thread, and dropping it
  keeps the row from competing visually with the ellipsis. The ellipsis's
  own actions sheet uses the exact same `.sheet-header` (✕ + title) every
  other sheet in the app uses — any sheet lacking a proper header should
  be treated as a defect. Two example comments per demo record (one Copy-
  only, one Edit/Delete/Copy) make the ownership-permission rule visible
  on sight without adding a comment first — a single-example version
  reads as though Edit/Delete were missing entirely rather than
  permission-gated.
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

**Flagged, not re-solved, 2026-07-24:** this section's WO Record View
consumer still assumes the old standalone `.equip-summary-card`/40px icon
and its "no photo, no class icon → no icon at all" fallback — both
superseded by §15.5's 2026-07-24 change (Equipment rolled into the
Header Fields grid, a fixed 28px `.attr-badge-outline` box that always
renders regardless of whether a class icon fills it). Whoever builds this
still-unbuilt spec needs to re-derive the tap-target/fallback details
below against the current 28px badge shape, not the sizes/rules quoted
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
  keep their existing order). **Toast on add, added 2026-07-28**
  (`toggleFavDS()`/`toggleFavEquipDS()`) — "Added to your home screen."
  confirms the dataspy now has a Home Favorites chip (§24.2), since the
  star's own filled state is easy to miss inside a sheet that's about to
  close. Un-favoriting stays silent — removing something you just
  starred isn't a state worth announcing the same way.

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
- **Open — base-admin configurability.** Whatever set of system actions
  Home ends up exposing (previous bullet) shouldn't be hardcoded the way
  today's prototype hardcodes WO/Equipment — real EAM has a base admin
  screen (referred to informally as the "Home Icon" or "digital work
  home" setup screen; not yet located/named precisely in `docs/Data_refs/`
  or captured anywhere in this doc) that lets an admin pick which quick
  actions surface on the mobile Home screen per user group/org. This
  rebuild has no equivalent admin screen yet — it's a candidate addition
  to the Screen Designer / Base Screens track (§10), analogous to §11's
  "WO Workflow — Setup (Base EAM Admin)" pattern (a small admin config
  screen driving mobile runtime behavior), but scoped to Home's action
  set rather than WO workflow steps. Not scoped or prototyped.

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

**Decision: stay on one function, `WSJOBS`, always — including as the
fallback.** No new `FUN_CODE`s. A multi-`FUN_CODE`-per-WO-Type approach
has real EAM precedent in this customer's data, but would fragment the WO
List dataspy mechanism (§6.3/§8.3) across multiple functions' dataspy
sets for no benefit here — see §21 for the rejected alternative.

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
alongside its existing `PLO_USERGROUP`. `PLO_PAGENAME` stays `WSJOBS`
always — no new pagenames.

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
2. **WO Workflow Steps** (new, child of #1) — keyed **WO Type × User
   Group × Step**. Holds, per step: **Visible**, **Sequence** (order),
   **Required** (§14.7-style bar-locking behavior). Book Labor gains one
   more, step-specific column: **Time Entry Mode** (Start/End Time — the
   only mode built in any prototype — vs. Direct Hours Entry).

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
  step."** This also resolves a real inconsistency: the step rail already
  refuses to let you jump back into a done step (§14.3's gating toast) —
  letting the physical back button quietly do that anyway was the actual
  bug.
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

## 14.8 Comments & Documents — reachable from any step, always

Comments and Documents are not sequence items — they're persistent
record-level content owned by WO Record View alone, so they don't follow
the step rail's gating, locking, or the Free Form/Not Free Form flag
(§15.4). **The technician can reach either from any step, at any point in
the workflow, unconditionally.**

**Mechanism: the step rail's own expanded map, via a "Reference" group
always pinned after the last numbered step** (§14.3). A numbered done/
active/locked badge is what implies sequence membership, not a row's mere
presence in the map — giving Reference rows a plain icon instead of a
numbered badge removes that implication, and being inside the same
already-familiar expand/collapse control is more discoverable than a
buried ellipsis entry (the superseded mechanism — see §21).
- **Comments** and **Documents** rows jump to those sections on WO Record
  View: an in-page expand+scroll if already there, or a real navigation
  there (then expand+scroll on load) from any of the other 4 steps —
  `jumpToRvSection()`/`consumeJumpToSection()` (`eam-shared.js`). They
  render nowhere except WO Record View itself.
- **Equipment** is a 3rd row, a real future per-WO equipment screen,
  stubbed as a toast for now (`jumpToEquipmentStub()`).
- Not gated by `.rail-not-free-form` at all, by construction.

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
grid (§5.2). Content: a 28px `.attr-badge-outline` icon (same size/style
as Type/Priority's own badge, always shown even with no class icon to
fill it) + a description-over-code `.attr-lov-stack` (§5.2's Grid LOV
stack order). No Type line — it added no identifying value in a grid
cell. Class/Category aren't shown on this screen — still visible via the
Equipment Lookup sheet's Search results and Structure tree.

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

**Icon-as-photo-slot (§7.5) is still unbuilt** — its spec assumed the old
40px standalone icon as the tap target; that target is now the 28px
`.attr-badge-outline` box shared with Type/Priority, worth re-checking
before §7.5 is built (a badge that small may not read well as a photo
thumbnail).

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
7. **Equipment** (only on an equipment-scoped item) — a plain, always-
   visible `.form-field.protected` row, code + description, same shape
   as any other protected field in the app — equipment context for the
   item being answered should never require a tap to see. Different
   component from the checklist's older `.item-equip` badge (retired
   with v1) and unrelated to Insert Mode's Equipment LOV (§9.3) — this
   one is read-only and scoped to one checklist item.
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
- When Book Labor is reached, the timer stops; its value loads into the timer banner and pre-fills the Add Labor form start/end times

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
| **Book Labor — Department and Trade fields still cycle-on-tap** | Not yet converted to the real `openLov()` sheet, unlike Employee/Crew/Type of Hours on the same screen (§18.4). |
| **Issue Parts — button treatment consistency** | The screen mixes 3 different button weights: per-row outlined `.row-action-btn` (Quick Issue/Return, Modify), full-width outlined `.btn-outlined` (Add Parts), full-width filled `.btn-contained` (Quick Issue All). Not yet clear whether this 3-tier hierarchy (row action / secondary screen action / primary screen action) is correct as-is or needs converging. |
| **Issue Parts — "scroll to issue all" alternative** | An unexplored idea: some kind of scroll-driven bulk-issue gesture as an alternative/addition to the "Quick Issue All Planned Parts" button (§17.6). No shape proposed yet. |
| **New checklist item type: Slider** | Addition to §16.3's 17 checklist item types — a draggable slider/scale control. Needs a comparison mockup before being built, specifically covering the *resting* (untouched) state's affordance (handle/track/shadow) so it reads as interactive, not as a read-only gauge. |
| **Equipment Photo — icon/preview pop-out/edit, decided, not built** | See §7.5 and §15.5's cross-reference. Open: exact placement/size for the icon slot in Equipment RV's header (`.rec-id-row` has none today); whether the photo's preview pop-out (a variant of §19.6's viewer sheet, swapping Remove for Edit) should also keep Remove; what Equipment RV's icon shows with no photo (unlike WO Record View, it has no prior fallback to drop back to). |
| **Unified prototype compile** | A real compiled shell that invokes the standalone files rather than duplicating them is still being proven out — see `docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` §7–§8 for the current plan; don't build toward the old `prototypes/wo-workflow/index.html` monolith pattern. |
| **Date fields still show stale spelled-month literals on 2 screens** | `isoToDisplay()` renders numeric dates app-wide (§3.4), but `eam-wo-record-view-prototype-v1.html` and `eam-equipment-record-view-prototype-v1.html` still have hardcoded spelled-month text baked into initial markup, not generated through the function at load. Only re-picking a date via the shared calendar sheet shows the new format on those two files. |
| **Date/time formatting is hardcoded to `en-US`, not actually locale-driven** | `isoToDisplay()` and `saveDateTime()` hardcode `'en-US'`. The real rule: dates should follow the logged-in user's own locale (this app targets North America/Europe/Asia — DD/MM/YYYY and YYYY/MM/DD are real cases); time-of-day stays fixed 24-hour regardless of locale (deliberate, not a gap — §3.4). No per-user locale/session concept exists yet to drive the date-format switch. |
| **Activity Screen** | Timer, task plan reference, assignment status (ref: `Activity_Selector.png`). A future standalone Activities tab could double as the real closing surface for Activity-driven WO Types instead of WO Closing (§12) — not designed, not built. |
| **Per-row sync affordance (WO List)** | Map the 3 offline-search row states (stub / hydrated / ephemeral) onto the existing 4-state sync control language at row level. Specified in the offline search architecture (§6.13); not yet in the v5.1 prototype. |
| **Index freshness caption (WO List)** | "Results as of <time>" caption when offline. Specified (§6.13); not yet in the v5.1 prototype. |
| **Bin pre-fill from stock list** | Selecting a bin in the bin stock list should pre-fill the Bin LOV. Specified in §17.11; not yet prototyped. |
| **Record-view child tabs — generic-case ellipsis menu contents** | §8's ellipsis menu for a generic child list/detail tab has no locked content yet (Equipment's own instance ships toast-stub candidates only). |
| **Activity Selector — no cross-screen hand-off for `selectedActivity`** | Once a technician moves past WO Record View into Activity Checklist, Issue Parts, or Book Labor, none of those screens shows which Activity is in scope, and no session/URL hand-off mechanism for `RECORD.selectedActivity` exists. Harmless today (every demo WO has exactly 1 Activity, which auto-selects) but undefined once a WO has 2+. |
| **Structure Details tree pattern** | Still an open design problem — see §7.4. |
| **Login** | Not started. See §4.1. |
| **Profile screen contents** | Beyond the identity row/Settings/Log out shell (§4.3), full scope (session/tenant display, theme preference) is still undecided. |
| **WO List's Search sub-screen still shows a back button instead of the avatar** | Per §4.2's browsing-tier rule, it should show the avatar like WO List's own main screen. |
| **Punch-list mechanism decision** | Option A (static sync dataspy, group/user level) vs. Option B (PIN projection) — kickoff decision, still open. See §2.6. |
| **Tiered record model review** | On approval: merge tier-model architecture into §2. |
| **Comments/Documents — dual treatment scope** | Not yet decided which record types need a standalone Comments/Documents tab (§7.2) vs. inline-only, or whether every record type always gets both. |
| **WO Record View Comments — no interactivity yet** | Has a Comments section (§15.1) but no add/edit/delete/copy — the ellipsis/edit/delete mechanics built for Equipment (§7.2) haven't been ported here. |
| **WO timer placement + pause/resume** | Two open questions: (1) keep the timer in the step rail or move it to the nav bar so it stays visible while the rail is scrolled/collapsed; (2) whether pause/resume should exist, and if so whether it's a per-WO-type config flag alongside Free Form (§15.4). Not designed, not prototyped. |
| **Activity Checklist's Checkbox-type control vs. the generic checkbox pattern** | §3.4's generic checkbox rule makes the whole row a compact tap target; the Checkbox-type item's control (§16.3) is a large, centered, full-width tap target instead, since the focused one-item-at-a-time screen has the room. Open call: is this divergence justified by context, or should it converge? |
| **Stale ellipsis Comments/Documents entries** | Activity Checklist, Issue Parts, and Book Labor still carry an inert Comments(3)/Documents(4) toast-stub entry in their ellipsis menu — superseded by the step rail's Reference group (§14.8). Not urgent; remove on next touch. |
| **Search List screen dataspy/filter persistence** | §24's rule that a Record View's back button returns to the entity's Search List "maintaining the user's dataspy and persisting any filters" isn't wired up yet — WO List's and Equipment List's dataspy bars and filter chips are real and functional, but nothing carries the active dataspy/filter selection across the round trip to Record View and back. The navigation target is correct and built; the persistence mechanism isn't. |
| **WO Record View — missing Notes section** | §15.1 lists "Notes — renamed from 'Description'" as part of the screen's section order; no such field exists in `eam-wo-record-view-prototype-v1.html`. |
| **WO Record View — field set vs. §15.1 conflict** | §15.1's prose says Work Order Details should show "asset, location, assigned to, reported by, est. duration, created"; the actual screen shows Department/Assigned To/Reported By/Date Reported/Problem Code (no location or est. duration). Needs a decision on which is stale before "fixing" either side. Related: Department and Problem Code (both required) sit in a separate "Work order details" card rather than the Header Fields box §5.2 says should hold every non-nullable field — possibly the same underlying gap. |
| **Booked Labor's Correction sheet content is hardcoded demo data** | The always-ready red Save button is intentional (§18.6), but the sheet's employee/hours-type/department/trade/duration values are fixed demo constants, not technician-entered. |
| **Booked Labor List has no defined sort/grouping rule** | Rows render in pure insertion order. Fine at today's scale; flag if this list needs to hold more in a real deployment. |
| **Shared `showToast()`'s actual duration contradicts §3.4's locked spec** | §3.4 "Toast style" locks "2.4s auto-dismiss," but `eam-shared.js`'s real `showToast()` (line 42) auto-dismisses at 1800ms. Found 2026-07-31 while migrating WO List's local 2400ms toast onto the shared one (§21) — that migration exposed the drift but didn't cause it; it's pre-existing and already affects every screen already on the shared toast (Home, Equipment List, WO Record View, etc.), not just WO List. Not fixed here since changing the shared timeout changes behavior app-wide — needs its own decision (bump the shared value to 2400ms, or relax the doc's locked spec to match reality). |
| **Equipment List's filter-chip sheet has no in-sheet search box** | §6.11 locks one as part of the List Search Screen standard ("search-within field, Clear, icon-tinted rows..., radio-style toggles, Apply") — WO List's own chip sheet has always had one (`filterCSRows()`/`#csSearch`, preserved through its 2026-07-31 shared-component migration, §21); Equipment List's copy of the same sheet (`#csSheet`) never got one. Found during that same migration; not fixed on Equipment's side here — scoped to WO List only. |

# 21. Superseded Design Decisions

Decisions that were reversed. Kept here for history only — nothing in this
section is current; the active section listed under "Superseded by" is
the only one that governs anything. Per the reorg convention (2026-07-15):
a superseded decision gets physically relocated here, not left inline in
its original section with a note attached.

| Former decision | Superseded by |
| --- | --- |
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
| **Intermediate proposal: route each WO Type to its own distinct `FUN_CODE`**, mirroring this customer's real `CCJOBS`/`TRJOBS`/`ZJ1000`/`WSJODC` precedent. Technically sound and grounded in real data, but rejected. | §11–§13 — fragments the WO List dataspy mechanism (§6.3/§8.3) across multiple functions' dataspy sets for no benefit. Final answer stays on one function, `WSJOBS`, always — the WO-Type dimension comes from a new `PLO_WOTYPE` column plus the new WO Workflow Steps table (§12). |
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

# 22. Custom Fields

Admin-defined fields per record Class + Class Org, scoped to Record View
only (Work Order and Equipment so far).

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
- Green is NOT retired — `seg-done`/`smi-done` (step rail progress) and
  the timer pill's running state keep their pre-existing green; neither
  was the thing flagged as a problem, and both are separate conventions
  ("done," "actively counting"), not a 4th color instrument.
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
