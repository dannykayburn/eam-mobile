# Screen Inventory — Attune EAM Mobile v1

> **What this file owns:** the list of every screen in scope. For each one it
> records which base paradigm the screen follows, which shared components it is
> built from, where it departs from the standard, its design state, and what
> blocks it. It is the project-tracking view, and the source of the Aha feature
> import.
>
> **What it does not own:** the rules. Every design bullet below is a one-line
> summary of a rule whose rationale lives in `design-decisions-v3-1.md` at the §
> given. Requirements and sequence live in `EAM-Mobile-Design-Doc-v1.md`.
> Component definitions live in `component-library.md`. **If a bullet here and
> the spec disagree, the spec is right:** fix the bullet, don't copy the
> reasoning here.
>
> **The Aha CSV is generated from this file, never edited by hand:**
>
> ```bash
> node docs/scripts/build-aha-csv.js
> ```
>
> That writes `docs/screen-inventory-aha.csv`, with one row per `###` card in
> Part C. Edit a card here, then regenerate.
>
> Replaces the design doc's former **Screens** section and the retired
> *Total Project Scope Summary brief* (now in `docs/old versions/`).

**State values, used in every card:**

| State | Meaning |
| --- | --- |
| `proto` | Navigable prototype on the shared component system, decisions locked |
| `partial` | Prototype exists, but part of the scope is a placeholder or hardcoded |
| `delta` | Cheap: a variation on an existing canonical screen, no new design |
| `design owed` | Needs a design pass before dev |
| `no surface` | Specified, but nothing authors or renders it yet |
| `blocked` | Cannot proceed until a named decision or backend change lands |

---

## Part A — Base screen paradigms

Every mobile screen is built from these paradigms. A new screen is a
**field-set exercise against them, not a design project** (§5.2/§5.3). Cards
in Part C name the paradigm(s) each screen uses, by ID.

### P1 — Record View (RV)

The full view of one top-level record (WO, Equipment). §5.1–§5.3, §7.1.

- **No view/edit mode split.** Every field is always live. Insert and update
  are the same screen (§5.1).
- **Header:** the record number and description (description is always
  required, and is edited in the compact long-text editor), a status-forward
  status button, and the Organization pill (always protected). The header
  collapses on scroll, and tapping the nav bar scrolls back to the top (§5.2/§5.3).
- **Header actions:** a pin toggle and a `⋯` ellipsis with Copy Link, Copy /
  Delete, and one screen-specific action slot (§5.2).
- **Body:** a Header Fields grid holding every non-nullable field, then
  containers. Each container is Grid or List, and nothing may sit above
  container 0. A Grid can be hidden but never collapsed. Every section except
  the first starts collapsed (§5.2).
- **Identifier and description live in the header only**, never repeated in
  the body. Status is edited in the header only (§5.2).
- **Comments and Documents are always present.** The top 3 of each show
  inline, newest first, with a `View more` row to the full tab (§7.2).
- **Tab rail:** every sibling tab is always tappable, with no sequence and no
  gating (§7.1).
- **The layout resolves from configuration** (function × group × Type ×
  instance), never hardcoded per screen (§11–§13, §29).
- Canonical files: `eam-equipment-record-view-prototype-v1.html` (full RV) and
  `screen-layout-field-behavior-prototype-v1.html` (every field type, both
  containers).

### P2 — List/Detail (child tab)

A child or related-record list inside a record (Events, Costs, Equipment on a
WO). §8.1–§8.2.

- **Detail header:** the parent's identity, protected (the description is shown
  but never editable). No status button, no pin (§8.1).
- **Header controls:** a `+` (Insert Mode for this child type), a search
  button (an inline filter over this tab's rows), and a `⋯` (§8.1).
- **`+` and search are content-driven.** `+` appears only if the base screen
  has an insert-capable detail section. Search appears only if the tab is a
  flat, filterable row list (§8.1).
- **Config-driven shell:** one `LIST_DETAIL_TABS` entry per tab (dataspies,
  rows, sort label), never a hand-built list (§8.2).
- **A row tap opens that record's own RV in update mode**, with its key
  protected. This is specified but not yet wired, because no child type has its
  own RV yet (§5.2).
- **WO workflow exception:** workflow step screens drop the `+`, because each
  already has a more specific add control in its content (§8.1/§15.4).

### P3 — Record list and Search

Top-level record lists (WO List, Equipment List) and every dataspy-scoped list.
§8.3, §6.13.

- **One standard, copied, never redesigned per entity.** It covers the dataspy
  bar with favorites, Detailed and List view modes, 6 filter chips, sort, and a
  dedicated Search screen. WO List is the reference implementation (§8.3).
- **Card fields are the active dataspy's first 6 columns**, as-is, with no
  curated per-module list (§8.3).
- **Dataspies run server-side at full fidelity.** A server search may show a
  waiting state, because it is a user-initiated round-trip (§2.3/§6.13).
- **Database-wide search does not work offline, and says so.** It is never a
  silent short list (§2.1/§6.13).
- **Home tiles route into a list's Search**, never into a bespoke list (§24).
- **Known gap:** Sort is missing from each list's Search sub-screen. Markup
  only (§20).

### P4 — Create (Insert Mode)

Creating any record, from anywhere. §9.

- **One shared implementation:** `openCreateSheet(entity)` serves every `+` and
  Create (§9.6).
- **Always locked to an entity before it opens.** The entity shows as a
  protected badge (§9.4.2).
- **Two standards:** a Record View insert (a new top-level record, the RV
  started empty) and a List/Detail insert (a lighter form for a child record)
  (§9.1).
- **Renders the record's own screen design**, varying by Type: a `default`
  variant plus one shared `alt`, never a bespoke layout per Type code (§9.8).
- **The one exception to the required-marker rule:** required markers and
  per-container required counts render only here, because a blank form has
  nothing to clear yet (§9.8/§23).
- **Created records persist** and merge into their list at load (§9.5).

### P5 — Modify (update in place)

Changing a field on any existing record. §5.1, §5.2, §3.4.

- **A field's base control type picks its picker:** a base **dropdown** opens
  the **pull-up** (today's bottom sheet, no search). A base **LOV** opens a
  **push page** (full screen, search under the header, back to return). The
  push page is not built yet; the prototype still uses the pull-up (§3.4.2).
- **Tap a field and its control opens directly:** a pull-up or push page, calendar, stepper,
  text sheet, or toggle. There is no preceding Edit tap (§5.1).
- **Dirty plus autosave on navigation**, not per keystroke (§5.1).
- **The cursor lands on the first tap**, via `openEdit()`/`openTextEditor()`
  only (§5.2).
- **Keyboard sheets put ✕ and ✓ in the top corners, with no bottom Save**,
  because a bottom button collides with iOS's accessory bar (§3.4/§5.2).
- **Clear is offered on optional fields only.** A required field can never be
  cleared back to empty (§3.4).
- **A required field warns, it doesn't block.** A workflow step can
  additionally gate progression (§5.2/§14.7).
- **Field state is never narrowed offline**, though actions may be (§2.9).
- **Protected fields:** gray tint and a lock on the label row. WO Type is
  protected from Start Work onward; Equipment system type is protected in
  update mode (§13.5).

### P6 — Link buttons and actions

Where a base-EAM action button goes on mobile. §8.4.

- **The deterministic test:** if the base button errors *"Record must be
  selected before performing this action"*, it is **row-scoped**, so it
  becomes an **Action Row** (the row expands in place and transacts, with no
  navigation) (§8.4/§17.4/§18.3).
- **Everything else is a header action in the top `⋯`**, even when the button
  sits on a tab. Header actions are listed above the list-level ones, with a
  divider between them (§8.4).
- **`+` is Insert Mode only**, never a shortcut menu (§8.4).
- **An ellipsis is a corner-anchored dropdown**, the one deliberate exception
  to "everything is a bottom sheet" (§5.2).

### P7 — Guided workflow step

A screen placed as a numbered step in a WO workflow. §14, §29, §32.

- **Steps are instances resolved from configuration.** The same screen can be
  placed twice, each instance with its own layout (§29).
- **Step rail:** the collapsed view shows the current step and "Up next" (or
  "X or Y" ahead of a fork). The expanded view is the step map plus the
  **More** group of non-sequenced tabs (§14.2/§14.8).
- **Gating is forward-only.** A completed step is always reopenable, and a
  later step stays locked and explains why (§14.10).
- **Start Work is the commitment boundary:** status changes, Type protects, the
  WO pins, children hydrate, and the config version is stamped (§14.11). It
  fires on the standalone Activities screen, where the activity is selected
  (§16.12).
- **Activity-dependent steps need an activity.** Activity Checklist, Issue
  Parts and Book Labor follow an Activities step. Where a workflow does not put
  one in front of them, each carries a required Activity LOV (§32.13).
- **Per-step bottom bar:** four fixed labels, never a step name: **Next**,
  **Start Work** (Activities only), **Complete Work Order** (the finishing
  step), **Resume** (a reopened step). The rail's "Up next" names where Next
  goes. No portal override (§14.5.1). Next carries the WO identity forward. A fork renders
  a prompt bar, and a skipped step shows N/A rather than hiding (§14.5–§14.7,
  §29.4).
- **One technician timer.** It shows in the rail only while Running or Paused
  on this WO. Navigation never touches it (§32).
- **No configured workflow** falls back to a flat, unordered, ungated rail
  (§11).

### P8 — App shell

The chrome around every screen. §4.2–§4.4, §31.

- **Bottom nav** shows while browsing, and is slot-bound per user group (up to
  5 slots, with Home pinned to slot 1) (§4.2/§30.24).
- **Avatar and profile menu** top-left, **sync control** top-right on every
  screen (§4.3/§4.4.1).
- **Width classes, never device names:** Compact `<600`, Medium `600–839`,
  Expanded `≥840` and height `≥600`. `orientation` is never queried (§31).
- **Cross-device rules:** pinch zoom is never blocked, text inputs are `1rem`,
  hit areas are 48px, heights use `dvh`, and storage goes through
  `lsGet`/`lsSet` (§31.5/§31.6).

---

## Part B — Shared components, by paradigm

The **component → screen** map is `component-library.md`'s Index. This table is
the other direction, by paradigm: what a screen gets for free from
`eam-shared.css`/`.js` once it adopts a paradigm. Part C's cards name only what
a screen adds beyond this.

| Shared component | Defined at | P1 RV | P2 L/D | P3 List | P4 Create | P5 Modify | P6 Actions | P7 Step | P8 Shell |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Record header (status, Org pill, pin, `⋯`) | §5.3 | ● | | | | | ● | | |
| Detail header (protected identity, `+`, search, `⋯`) | §8.1 | | ● | | | | ● | ● | |
| Field Grid / Collapsible Container | §5.2 | ● | | | ● | ● | | ● | |
| Field types (13) and field-edit sheets | §5.2/§3.4 | ● | | | ● | ● | | ● | |
| Dropdown pull-up, LOV push page (not built), calendar, long-text, and number pickers | §3.4/§3.4.2/§5.2 | ● | | | ● | ● | | ● | |
| Equipment LOV (single and multi-select) and Structure Tree | §7.4/§15.5 | ● | ● | | ● | | | ● | |
| Comments and Documents excerpts, plus full tabs | §7.2 | ● | ● | | | | | ● | |
| Custom Fields container | §22 | ● | | | ● | | | ● | |
| Tab rail | §7.1 | ● | ● | | | | | | |
| List/Detail shell (`LIST_DETAIL_TABS`) | §8.2 | | ● | | | | | | |
| Dataspy bar, filter chips, sort sheet, Search screen | §8.3 | | ● | ● | | | | | |
| Insert Mode sheet | §9.6 | | ● | ● | ● | | | | |
| Action Row | §17.4/§18.3 | | ● | | | | ● | ● | |
| Multi-Select Delete | §16.10 | | ● | | | | ● | | |
| Step rail, step map, More group, Up next | §14.2/§14.8 | | | | | | | ● | |
| Step bottom bar and prompt bar | §14.5/§14.6 | | | | | | | ● | |
| Technician timer and Booking Pull-up | §32/§18.2 | | | | | | | ● | |
| WO Type color and icon badge | §23.3 | ● | | ● | | | | ● | |
| Bottom nav, avatar, profile menu | §4.2/§4.3 | | | ● | | | | | ● |
| Sync control and sync panel | §4.4 | ● | ● | ● | | | | ● | ● |
| Confirm modal, toast | §3.4 | ● | ● | ● | ● | ● | ● | ● | ● |

**Exceptions to the standard, all in one place** (each card repeats only its own):

| Exception | Where | § |
| --- | --- | --- |
| Tiles and favorites keep real color (a monochrome palette exception) | Home | §23 |
| Required markers and container counts render | Insert Mode only | §9.8/§23 |
| No `+` in the detail header | WO workflow steps 2–5 | §8.1/§15.4 |
| Activities container is a record list, not a field container, and can be hidden but never deleted (the panel is now a future consideration) | WO Record View | §15.2 |
| A row tap SELECTS (radio, single-select) instead of opening the record, and a bottom bar carries Start Work | WO ▸ Activities | §16.12 |
| Time Only field type (24-hour, Inter) | Book Labor | §3.4/§18 |
| Costs tab uses its own row template plus an aggregate footer | Equipment ▸ Costs | §8.3 |
| Equipment-scoped checklist items fan out per equipment (deliberately uncapped) | Activity Checklist | §16.9 |
| Status control, Closing Comments, Attachments are screen-local, with no shared equivalent | WO Closing | §19 |
| Portal is on the Octave / OUX design system, not the app's own | Configuration Portal | §30.7/§30.8 |

---

## Part C — Screens

One card per Aha feature. The `Epic` field groups them on the board.

### Section 1 — Mobile Configuration Portal

Persona: administrator. One web app on Octave / OUX, and the only base-side
surface in scope (NG8). Four authoring areas plus a binding area, all over one
membership table (§30.13).

### Portal ▸ Workflows

- **Epic:** Configuration Portal
- **Paradigm:** Portal
- **Summary:** Author a guided WO flow as an artifact: a gallery of workflow cards, then a drag-and-drop canvas of step instances.
- **Design:**
  - Step Library (screens, then actions) is drag-only. The canvas is auto-laid-out in a single column.
  - Two forks (question, condition) are authored from the `+` on a connector, with at most two answers, and their routing is drawn.
  - Three actions (Status update, Start Timer, Stop Timer), each System action or User selected via one `mode` field.
  - One workflow per (WO Type, group) plus one fallback. Free Form is a property, never part of the key. `*` is system delivered.
  - Collisions and composition errors are refused in the assignment control before the click. Saving is never blocked.
  - Activity Checklist, Issue Parts and Book Labor with no Activities step before them get a required Activity LOV (Info, §32.13). Not built in the portal yet, and the Step Library has no Activities entry.
  - No summary panels anywhere: each error is raised on the control that causes it.
- **Shared components:** Step Instance Row, Action Node, Question Prompt Card, Completion Gate
- **Exceptions:** Octave design system; five declared exceptions (§30.7)
- **State:** proto
- **Open:** `WSJOBS` reuse vs. a new mobile function (decision required); `*` workflow content; in-flight work when an assignment is removed
- **Spec:** §30.1–§30.4, §30.11, §30.19, §30.21, §30.26, §32.13
- **Prototype:** base screens/eam-workflow-portal-v1.html

### Portal ▸ Screen Designer panel

- **Epic:** Configuration Portal
- **Paradigm:** Portal
- **Summary:** Place fields and containers for the selected step node, in a real 390px emulator opening in the right-hand panel.
- **Design:**
  - Invoked per step node. Not a standalone screen (the old one is retired).
  - Each instance deep-copies its own layout.
  - Available Fields sidebar is the complement of the screen: a field leaves when placed and returns when removed.
  - Containers are Grid or List anywhere. Container 0 is pinned. A Grid can be hidden but never collapsed.
  - Buttons are fields that take Optional or Hidden only.
  - The panel is 40% wide and drag-resizable, with a 390px floor.
- **Shared components:** Field Grid Container, Collapsible Container
- **Exceptions:** WO RV's Activities container refuses dropped fields
- **State:** proto
- **Open:** grid-span Field Grid Section has no doc section yet
- **Spec:** §10–§13, §29, §30.9, §30.10
- **Prototype:** base screens/eam-workflow-portal-v1.html

### Portal ▸ Screen Layouts

- **Epic:** Configuration Portal
- **Paradigm:** Portal
- **Summary:** Screen design for screens that aren't workflows (Equipment first, then Work Requests and Operator Checklists).
- **Design:**
  - A screen layout is a workflow object with Free Form pinned on, reusing the same canvas and designer panel.
  - The library is scoped per screen.
  - The slot is screen plus system type (or the fallback), and every type is drawn as a slot.
  - The "Viewing as" group lens filters what you see. It never becomes the editing key.
- **Shared components:** Type Slot Grid, Viewing As Lens
- **State:** proto
- **Open:** the Equipment screen function is owed (blocks the Equipment track)
- **Spec:** §30.27, §26.8
- **Prototype:** base screens/eam-workflow-portal-v1.html

### Portal ▸ Home Layouts and navigation bar

- **Epic:** Configuration Portal
- **Paradigm:** Portal
- **Summary:** Author the technician's Home (layout ▸ section ▸ placement, plus the Create control) and the app's bottom navigation bar.
- **Design:**
  - A global tile catalog holds tile ids, never copies, so editing a tile reaches every layout using it.
  - The section lives on the layout, never on the tile.
  - Insert Mode is a flag on a tile. A flagged tile drops only into the Create control.
  - The count is a SQL statement separate from the dataspy: 0 shows no badge, and 1000 or more shows `999+`.
  - The editor wraps at 3 tiles to show the device fold.
  - The nav bar has up to 5 slots, with Home pinned to slot 1. Each slot sets label, icon and screen, never color.
  - A tile whose screen is not in the group's menu is silently dropped by the product, so the editor flags it.
- **Shared components:** Badge color set (`BADGE_COLORS`)
- **State:** proto
- **Open:** device side can't render the authored nav bar yet; Home tile and chip *content* is unlocked
- **Spec:** §30.16, §30.17, §30.24, §30.25
- **Prototype:** base screens/eam-workflow-portal-v1.html

### Portal ▸ Offline Profiles

- **Epic:** Configuration Portal
- **Paradigm:** Portal
- **Summary:** Author the per-entity offline registry, plus the punch-list dataspy on the Work Orders row.
- **Design:**
  - Four policies: Online only, Offline read, Offline read/write, and Offline read/write (external).
  - Tier 0 and the outbox render first on every profile, including `None`.
  - Whether a dataspy is required is arithmetic against the row and volume caps. Caps are protected and shown.
  - "All records" is refused. Dataspies are selected here and authored on the list screen.
  - A group may hold several profiles (multi-group), so there is no clash to refuse.
- **Shared components:** Offline Policy Pill
- **State:** proto
- **Open:** 11 entities without a policy decision; §2.7 narrows vs. the shipping product (decision required)
- **Spec:** §2.6, §2.7, §2.10, §2.10.1, §30.14
- **Prototype:** base screens/eam-workflow-portal-v1.html

### Portal ▸ User Groups

- **Epic:** Configuration Portal
- **Paradigm:** Portal
- **Summary:** The inverse view: which artifacts each group gets. A binding surface only.
- **Design:**
  - The only edit here is assignment, never steps, gating or layout. Assigning is not copying.
  - Create refuses here: a group is made in Security ▸ User Groups.
  - The assignment control's shape is derived from cardinality: checkboxes for per-WO-Type, radios with None for per-group, checkboxes with no None for multi-group.
  - Explicit, inherited and unset are distinguished.
- **State:** proto
- **Open:** severity cases still to port from the retired User Group Setup tests; no tab-permission data (ADMN 8.13)
- **Spec:** §26.5.1, §30.13, §30.23, §27.4
- **Prototype:** base screens/eam-workflow-portal-v1.html

### Section 2 — Mobile Application

Persona: technician. The app's own design system (§23), not Octave.

### Login and Tier 0 bootstrap

- **Epic:** Login and first run
- **Paradigm:** P8
- **Summary:** Authenticate, and carry the Tier 0 bootstrap bundle (layouts, UDS definitions, code domains) on the same round-trip.
- **Design:**
  - The one place the app legitimately blocks: a user-initiated round-trip, not a modal.
  - Tier 0 partial failure is reported honestly: a missing layout is fatal, missing long-tail codes are degraded but usable.
  - The app must be usable within ~30s of launch, even without connectivity.
  - **Offline profile chooser:** where the group holds 2 or more profiles, the technician picks one after Tier 0 and before the record tiers. The answer is sticky per (user, device), and re-prompts only if the remembered profile is no longer assigned.
  - Say "my open pinned work orders", never "today's WOs".
  - SSO/OIDC and biometric unlock are in scope.
  - Quick re-auth after inactivity is undecided.
- **Shared components:** confirm modal, toast
- **State:** partial
- **Open:** the prototype is a placeholder that runs demo reset; the chooser is unbuilt; nothing feeds the app a portal artifact yet
- **Spec:** §2.3, §2.10.1, §4.1
- **Prototype:** eam-login-prototype-v1.html

### Server configuration / first run

- **Epic:** Login and first run
- **Paradigm:** P8
- **Summary:** QR scan or manual entry of org, tenant, server URL and OIDC endpoints, plus a connection test.
- **Design:**
  - Assumed at parity with the current apps.
  - Inherently modal, because there is no app behind it yet.
- **State:** design owed
- **Spec:** §4.1
- **Prototype:** none

### Profile and Settings

- **Epic:** App shell
- **Paradigm:** P8
- **Summary:** The avatar menu and the Profile/Settings screen behind it: who I am, how my device is set up, sign out.
- **Design:**
  - The avatar sits top-left while browsing, and is not a bottom-nav item. It opens the shared ellipsis menu, left-anchored.
  - The avatar shows a photo if one is on file, otherwise initials, never a blank silhouette.
  - Today's menu: identity row (name and org), Settings, Log out (red). Deliberately no Sync item, since the sync icon is always present.
  - **Offline profile row:** names the profile in force and switches it, but only where the group holds 2 or more. Four rules on a switch: state the cost, never drop the outbox, refuse it offline, never evict live work.
  - Settings candidates: session and tenant display, theme preference, sync configuration.
  - Prototype-only controls (Dark/Light, Online/Offline, Reset demo) live under a Prototype label here.
- **Shared components:** ellipsis menu (`.rec-actions-menu`), confirm modal
- **Exceptions:** left-anchored menu variant
- **State:** partial
- **Open:** Profile screen contents design owed; base User Setup has no Initials field; offline profile row unbuilt; Settings and Sync Config screens have no design
- **Spec:** §4.3, §2.10.1, §16.9
- **Prototype:** profile menu on Home / WO List

### Bottom navigation

- **Epic:** App shell
- **Paradigm:** P8
- **Summary:** Slot-bound navigation while browsing, authored per user group on the Home layout.
- **Design:**
  - Home, Work and Notifications are the default, not the rule. Equipment is allowed. Up to 5 slots.
  - Past 3 slots, each slot shrinks and the label budget drops. Labels wrap, never truncate.
  - Anchored flush to the bottom edge, with breathing room from `--shell-pad-bottom` inside the bar.
- **Shared components:** bottom nav (hand-copied today)
- **State:** partial
- **Open:** no shared `renderBottomNav()`; 4–5 slot CSS unwritten; app not fed by the portal
- **Spec:** §4.2, §30.24, §31.6

### Sync control and sync panel

- **Epic:** Sync and transaction confidence
- **Paradigm:** P8
- **Summary:** Always visible, always honest: did my transaction land?
- **Design:**
  - Four states (Synced, Offline, Syncing, Error) shown as an adaptive icon or pill on every screen.
  - Opens the sync panel from anywhere: what's queued, what failed, what to do.
  - The trouble-field component with Retry and Discard is shared with the Sync Status Screen.
- **State:** proto
- **Open:** no state or copy for an online-only user; panel should name the offline profile in force
- **Spec:** §4.4.1, §4.4.2, §2.10
- **Prototype:** every screen

### Sync Status Screen

- **Epic:** Sync and transaction confidence
- **Paradigm:** P8
- **Summary:** The full outbox: every failed write is inspectable and actionable on the device.
- **Design:**
  - Per-item outbox state.
  - The shared trouble-field cards with Retry and Discard.
  - No write is ever silently discarded (R6).
- **Exceptions:** keeps the dev banner (no header menu)
- **State:** proto
- **Spec:** §4.5, R6
- **Prototype:** eam-sync-status-prototype-v1.html

### Transaction Log

- **Epic:** Sync and transaction confidence
- **Paradigm:** P3
- **Summary:** The on-device history that keeps R6 honest without a back-office round-trip.
- **Design:**
  - The requirement doc is inherited from DUX. No design started.
- **State:** design owed
- **Spec:** R6
- **Prototype:** none

### Home

- **Epic:** Home
- **Paradigm:** P8, P3
- **Summary:** A personalized landing surface: tiles, favorites, and a Resume card for work in progress.
- **Design:**
  - Layout mechanics are locked: scroll-collapse (guarded so it can't destroy its own trigger), tap-to-top, horizontal sections.
  - Tiles route into a list screen's Search, never a bespoke list.
  - Favorites is the technician's own starred dataspies. The admin can't fill it.
  - The Resume card shows only while a workflow run is in progress, and opens that run's cursor.
  - `+` opens the Create entity menu.
- **Shared components:** Resume Card, profile menu, bottom nav, sync control
- **Exceptions:** tiles and favorites keep real color (§23)
- **State:** proto
- **Open:** tile and chip *content* is an unlocked design riff; don't build to today's tiles
- **Spec:** §9.4, §23, §24.2, §31.6, §32.7
- **Prototype:** eam-home-screen-prototype-v1.html

### Create entity menu

- **Epic:** Home
- **Paradigm:** P4
- **Summary:** Home's `+`: pick an entity, then Insert Mode opens locked to it.
- **Design:**
  - Covers WO and Equipment today.
  - Meter Reading, Work Request and Operator Checklist are candidates, each needing a call on full Insert Mode vs. a lighter action sheet.
  - Contents are authored on the portal's Home layout Create control.
- **State:** partial
- **Spec:** §9.4.1, §30.16
- **Prototype:** eam-home-screen-prototype-v1.html

### Insert Mode

- **Epic:** Insert Mode
- **Paradigm:** P4
- **Summary:** The one create path in the app: a shared sheet that renders the record's own screen design.
- **Design:**
  - Always locked to an entity, shown as a protected header badge.
  - An LOV opened from Insert Mode is a push page over an already full-screen sheet, which is an open design question (§20).
  - A Type pill varies the layout: a `default` variant plus one `alt`.
  - Saved records persist and merge into their list.
- **Exceptions:** required markers and counts render here only
- **State:** proto
- **Open:** Equipment Type pill is missing `Location` and saves as `class` (defect); a Type pill that re-resolves the layout live is not scoped
- **Spec:** §9.1–§9.8, §26.8
- **Prototype:** shared (`openCreateSheet()`)

### WO List / WO Search

- **Epic:** Work Orders
- **Paradigm:** P3, P4
- **Summary:** The template for every top-level record list.
- **Design:**
  - Dataspy bar with favorites, Detailed and List modes, 6 filter chips plus sort, and a Search screen.
  - Merges locally created records and MEC child WOs as child rows.
  - Routes each row to its workflow by WO Type, opening at the run's cursor.
  - Create (`+`) opens Insert Mode locked to Work Order.
- **Shared components:** dataspy bar, text/date filter sheets, sort sheet, WO Type badge, profile menu
- **State:** proto
- **Open:** still hand-copies nav CSS that is in `eam-shared.css`; Sort missing on the Search sub-screen; per-row freshness affordance needs dev input
- **Spec:** §6, §8.3, §6.13, §24
- **Prototype:** eam-wo-list-prototype-v5_1.html

### WO Step 1 — Record View

- **Epic:** Work Orders
- **Paradigm:** P1, P5, P7
- **Summary:** The WO record under a configuration-resolved layout.
- **Design:**
  - Start Work moved to the standalone Activities screen (§16.12). The bottom bar reads **Next** and opens that screen; on a revisit it reads **Resume** (§14.5.1).
  - Before Start Work, WO Type is editable: confirm, commit and re-render.
  - Header fields grid, with Equipment as its own full-width cell (Equipment Lookup plus a 44px photo badge).
  - Dropdown fields (Type, Priority, Status) open the pull-up. LOV fields (Department, Problem Code, Equipment) open a push page.
  - The Activities panel (single-select, own `+`) is a future consideration. It stays in the prototype unchanged.
  - A Route/MEC pill shows if WO equipment exists, and jumps to the Equipment tab.
  - Custom Fields, plus Comments and Documents excerpts.
  - Closing a WO returns here, not to the list.
- **Shared components:** record header, Equipment LOV, Structure Tree, Custom Fields, Comments/Documents, step rail, More group, timer
- **Exceptions:** Activities container is not a field container, and can be hidden but not deleted
- **State:** proto
- **Open:** Department and Problem Code sit outside Header Fields (§20)
- **Spec:** §14.11, §15, §13.5, §7.5
- **Prototype:** eam-wo-record-view-prototype-v1.html

### WO Step 2 — Activity Checklist

- **Epic:** Work Orders
- **Paradigm:** P7, P5
- **Summary:** A focused stepper: one checklist item at a time, with snap-scroll between items.
- **Design:**
  - Acts on the activity selected on the Activities screen. With no Activities step in front of it, this screen carries a required Activity LOV in its header (§32.13; not built).
  - 17 item types, dynamic follow-on items, and per-item notes, comments and documents.
  - A tap answer auto-advances. Keyboard entry and the slider never do.
  - Equipment-scoped items fan out per equipment, recomputed from the store.
  - The description is the instruction. There is no separate field for it.
  - The task plan is per-WO, with an optional pre-checklist Task Plan Instructions screen.
  - The checklist is one fork source (route to Issue Parts or Book Labor).
- **Shared components:** Equipment ID Badge, Item Banner, prompt bar, step rail
- **Exceptions:** fan-out is deliberately uncapped (156-equipment routes give ~624 items)
- **State:** proto
- **Spec:** §16.1–§16.11
- **Prototype:** eam-activity-checklist-prototype-v2.html

### WO Step 3 — Issue Parts

- **Epic:** Work Orders
- **Paradigm:** P7, P6
- **Summary:** Issue planned parts plus ad-hoc adds, with store, bin and lot picking.
- **Design:**
  - Acts on the activity selected on the Activities screen. With no Activities step in front of it, this screen carries a required Activity LOV in its header (§32.13; not built).
  - Parts summary bar, planned parts list, Add Parts, and Quick Issue All (with a confirm sheet).
  - Row-scoped buttons are Action Rows.
  - Store, bin and lot options are dynamic per sheet. The SHOWLOT flag controls lot visibility.
- **Shared components:** Action Row, detail header (no `+`), step bar
- **State:** partial
- **Open:** hardcoded parts data, not wired to `data/parts*.js`
- **Spec:** §17
- **Prototype:** eam-wo-prototype-issue-parts-v1.html

### WO Step 4 — Book Labor

- **Epic:** Work Orders
- **Paradigm:** P7, P6
- **Summary:** Book labor by employee or crew, with the timer's booking pull-up.
- **Design:**
  - Acts on the activity selected on the Activities screen. With no Activities step in front of it, this screen carries a required Activity LOV in its header (§32.13; not built).
  - Opening with a timer running invokes the Booking Pull-up with hours calculated. With no timer running it does nothing.
  - Booking a crew expands to one row per current member.
  - Booked rows are Action Rows. The correction sheet uses the hold stepper.
- **Shared components:** Booking Pull-up, Hold Stepper, Booked Labor List, Action Row
- **Exceptions:** owns the Time Only field type
- **State:** proto
- **Spec:** §18, §32
- **Prototype:** eam-book-labor-prototype-v2.html

### WO Step 5 — WO Closing

- **Epic:** Work Orders
- **Paradigm:** P7, P5
- **Summary:** Status change, closing codes, downtime and attachments.
- **Design:**
  - Status change control (Option D).
  - Closing codes in a 2×2 grid with sequential unlock.
  - Downtime Details, Closing Comments, Attachments, and a close confirmation.
  - A completing status ends the workflow run and returns to the Record View.
- **Exceptions:** status control, Closing Comments, Attachments and collapsible containers are screen-local
- **State:** proto
- **Spec:** §19
- **Prototype:** eam-wo-closing-prototype-v2.html

### Technician timer and workflow runs

- **Epic:** Work Orders
- **Paradigm:** P7
- **Summary:** One timer per technician and one durable run per (technician, WO, activity). Cross-cutting, not a screen.
- **Design:**
  - The timer starts only from a placed Start Timer action, or manually from the header ellipsis.
  - Pause books the segment. Stop opens the booking pull-up. Reset discards. Navigation never touches the timer.
  - A declined timer shows nothing in the rail.
  - The rail's position is the run's cursor. Reopening a completed step is a revisit, and its bar reads "Back to …".
  - Forks and actions never re-fire on a revisit.
  - An MEC child has no run of its own.
- **Shared components:** Technician Timer, Step Rail Up next, Resume Card
- **State:** proto
- **Open:** System-mode status bypasses group authorization (base must verify); demo stand-ins for the "On Start Work" timer and the app-declared fork
- **Spec:** §32
- **Prototype:** shared (`eam-shared.js`)

### WO ▸ Equipment tab

- **Epic:** Work Orders
- **Paradigm:** P2, P6
- **Summary:** The first real child-tab screen, and the template for the next.
- **Design:**
  - One shared store is the truth for this tab and the RV's Route/MEC pill.
  - Setting a Route inserts its equipment and mints one MEC child WO per row. Manual adds do the same.
  - `+` opens the multi-select Equipment LOV, which becomes a push page (§3.4.2). Header actions are in `⋯`.
  - It carries the step rail, which is its only way back.
- **Shared components:** Equipment LOV (multi-select), Multi-Select Delete, Structure Tree, step rail
- **State:** proto
- **Open:** row tap `chooser` vs. `split` needs a device decision
- **Spec:** §16.9, §16.10, §8.4
- **Prototype:** eam-wo-equipment-tab-prototype-v1.html

### WO ▸ Comments and Documents tabs

- **Epic:** Work Orders
- **Paradigm:** P2
- **Summary:** One screen carrying both tabs, reached from the RV's `View more`.
- **Design:**
  - Newest first. `+` creates a comment or document directly.
  - The author's full name, with "(You)" for your own. Edit and Delete are gated on ownership.
  - The document preview is a fixed 38px slot that degrades to a file-type badge.
- **Shared components:** Comments/Documents renderers
- **State:** proto
- **Open:** stale filename; @mention tagging not built
- **Spec:** §7.2, §5.2
- **Prototype:** eam-wo-reference-tab-prototype-v1.html

### WO ▸ User Defined Screen (UDS) tab

- **Epic:** Work Orders
- **Paradigm:** P2, P7
- **Summary:** A customer-authored screen placed as a WO tab, which can be a numbered, gated, Required step.
- **Design:**
  - One generic definition-driven tab renderer, never a screen per UDS.
  - Sequence it after a second real child tab exists.
  - Standalone UDS is deferred. UDS field authoring is out of scope.
- **State:** no surface
- **Spec:** §27, §29.5
- **Prototype:** none

### WO ▸ Activities

- **Epic:** Work Orders
- **Paradigm:** P2, P7
- **Summary:** The standalone Activities list, where the technician selects the activity and Start Work fires.
- **Design:**
  - Same paradigm as the WO Equipment tab: protected parent identity, `+` / search / `⋯`, the shared List/Detail shell, and the step rail.
  - Exception: a row tap SELECTS via a radio, single-select, rather than opening the record.
  - Exception: a bottom bar. Start Work stays locked until an activity is selected, and is the full §14.11 commitment, creating the run for the selected activity.
  - One activity auto-selects; two or more start with nothing selected.
  - A completed activity is selectable, but its bar reads "Activity is completed".
  - After Start Work the selection is protected and the bar reads **Resume**.
- **Shared components:** List/Detail shell, dataspy bar, detail header, step rail, More group, technician timer
- **Exceptions:** radio selector; bottom bar on a child tab
- **State:** proto
- **Open:** step vs. More placement and the "On Start Work" anchor; Plus/Edit are stubs; activity data is a copy of Record View's
- **Spec:** §16.12, §14.11, §15.2, §32.13
- **Prototype:** eam-wo-activities-prototype-v1.html

### WO ▸ Activity detail screen

- **Epic:** Work Orders
- **Paradigm:** P1
- **Summary:** Timer, task-plan reference, and assignment status for one activity.
- **Design:**
  - Could double as the closing surface for Activity-driven WO Types.
- **State:** design owed
- **Prototype:** none

### Equipment List

- **Epic:** Equipment
- **Paradigm:** P3, P4
- **Summary:** A copy of the WO List standard for Equipment.
- **Design:**
  - Dataspy bar with favorites, 6 chips plus sort, a Search screen, and its own Create.
- **Exceptions:** keeps the dev banner (no header menu)
- **State:** proto
- **Open:** per-record routing is an identity overlay on one demo record
- **Spec:** §8.3, §24.1
- **Prototype:** eam-equipment-list-prototype-v1.html

### Equipment Record View

- **Epic:** Equipment
- **Paradigm:** P1, P5
- **Summary:** The canonical full record view, which re-renders by system type.
- **Design:**
  - A 74px header photo slot that collapses with status. One photo mechanic, shared with the WO RV's badge.
  - Class-driven attribute sections, plus Custom Fields.
  - Must re-render by system type (Location, Asset, Position, System) without navigating.
  - System type is protected in update mode, always.
  - 11 tabs: the Record View plus 10 siblings.
- **Shared components:** record header, tab rail, Custom Fields, Comments/Documents, photo flow
- **State:** blocked
- **Open:** built against one hardcoded layout; the Equipment screen function for the four system types is owed
- **Spec:** §5.3, §7, §7.5, §26.8
- **Prototype:** eam-equipment-record-view-prototype-v1.html

### Equipment ▸ Events tab

- **Epic:** Equipment
- **Paradigm:** P2
- **Summary:** Work history for this asset. Priority 1 of the child tabs.
- **Design:**
  - Binds to the shared List/Detail shell.
- **State:** delta
- **Spec:** §7.3, §8.2

### Equipment ▸ Structure Details tab

- **Epic:** Equipment
- **Paradigm:** P2
- **Summary:** The asset's hierarchy as a tree. Priority 2.
- **Design:**
  - Binds to the shared Structure Tree. Its mount, data source and row action must be parameterized out of the Equipment LOV.
  - An additive per-node status dot.
  - No search, because a tree is not a flat row list.
- **State:** delta
- **Spec:** §7.4

### Equipment ▸ Parts Associated tab

- **Epic:** Equipment
- **Paradigm:** P2
- **Summary:** Parts linked to the asset. Priority 3.
- **Design:**
  - Binds to the shared List/Detail shell.
- **State:** delta
- **Spec:** §7.3, §8.2

### Equipment ▸ Costs tab

- **Epic:** Equipment
- **Paradigm:** P2
- **Summary:** Cost lines rolled up for the asset.
- **Design:**
  - An aggregation view, not a plain record list.
- **Exceptions:** its own row template plus an aggregate footer; no `+`
- **State:** delta
- **Spec:** §8.2, §8.3

### Equipment ▸ PM Schedules tab

- **Epic:** Equipment
- **Paradigm:** P2
- **Summary:** PM schedules for the asset.
- **Design:**
  - Binds to the shared List/Detail shell. Confirm `+` against the base screen.
- **State:** delta
- **Spec:** §7.3, §8.1

### Equipment ▸ Meters tab

- **Epic:** Equipment
- **Paradigm:** P2
- **Summary:** Meters and readings for the asset.
- **Design:**
  - Binds to the shared List/Detail shell.
  - Meter history is `server-only` in §2.7, which narrows the shipping product.
- **State:** delta
- **Open:** §2.7 vs. shipping product (decision required)
- **Spec:** §7.3, §2.7

### Equipment ▸ Warranties tab

- **Epic:** Equipment
- **Paradigm:** P2
- **Summary:** Warranty coverage for the asset.
- **Design:**
  - Binds to the shared List/Detail shell.
- **State:** delta
- **Spec:** §7.3

### Equipment ▸ Depreciation tab

- **Epic:** Equipment
- **Paradigm:** P2
- **Summary:** Depreciation records for the asset.
- **Design:**
  - Binds to the shared List/Detail shell.
- **State:** delta
- **Spec:** §7.3

### Notifications inbox

- **Epic:** Notifications
- **Paradigm:** P3
- **Summary:** A first-class inbox, modeled on `R5MAILEVENTS`.
- **Design:**
  - Grouped Today and Earlier, an All/Unread filter, mark-all-read, and per-card dismiss.
  - Tapping a card opens the source record at the run's cursor.
- **Shared components:** Notification Card
- **State:** partial
- **Open:** `R5MAILEVENTS` has no read/unread column (blocks the filter); the `comment_mention` type needs @mention tagging, which isn't built
- **Spec:** §25
- **Prototype:** eam-notifications-prototype-v1.html
