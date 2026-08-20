# EAM Mobile — UX User Testing Readiness Brief

Audience: the UX team, ahead of a user-testing session. Purpose: get testers
into the prototype fast, on real demo data, without a moderator having to guess
in the moment which dead ends are "real findings to note" vs. "known stub,
don't design a task around this."

Snapshot of the build live at **2026-08-13**. It will drift — if you're reading
this more than a couple of weeks later, sanity-check §4 against `CLAUDE.md`
before trusting it.

**Changed since the 2026-08-11 version of this brief**, all of it user-visible:
the Activity Checklist's **navigation is now a live A/B and defaults to a new
scroll behaviour** (§3, "Checklist navigation" — read this before writing any
checklist task); every item carries a new **Item Banner**; **completed workflow
steps are now always navigable backwards**; and content is no longer clipped
behind the bottom bar on home-indicator devices. Anything tested before
2026-08-12 should be re-checked on the checklist screens specifically.

## 1. Access

- **Public URL:** `https://dannykayburn.github.io/eam-mobile/` — no password,
  any phone or laptop browser, no install. The root redirects to login. **This
  is the one to send participants.**
- **Offline / from a zip:** unzip and double-click `index.html`. It genuinely
  runs — nothing uses `fetch()`, XHR or ES modules, so `file://` restrictions
  don't bite. Only the web fonts want the network and they fall back cleanly.
- **`screens.html`** (repo root) is a direct index of every screen and mockup.
  Use it for design review and walkthroughs — **not** for moderated testing,
  since deep-linking a screen skips exactly the navigation you'd want to watch a
  participant attempt.
- **Login is a placeholder, not a real gate.** No credential validation, SSO or
  biometric unlock (§4.1 — explicitly not designed yet). Tapping **Log In** with
  the fields as-is, or blank, goes straight in. **Forgot Password** is a toast
  stub. Brief testers to skip this screen; it isn't part of what you're testing.
- **The app is deliberately a phone-width column** (max 430px) centred on larger
  screens. On a tablet or laptop you get a phone-shaped app with a drop shadow,
  not a stretched desktop layout. That's the design, not a responsive gap.

## 2. Reset between participants

Every screen has a small dev toolbar outside the app frame: light/dark toggle,
an online/offline/synced cycle, and **Restart Demo**.

**Use Restart Demo between participants.** State genuinely persists now —
created work orders and equipment, Route equipment, minted child WOs, favourited
dataspies, active filters and sort, sync outbox. Participant 2 will otherwise
inherit everything participant 1 did. Restart Demo navigates to login; the reset
itself happens when **Log In** is tapped.

## 3. What to test with

### The 3 seeded demo Work Orders

No backend. Everything routes off 3 seeded WO identities, reachable by tapping
the matching card in WO List:

| WO # | Type | What it demonstrates |
| --- | --- | --- |
| **19257** | Breakdown | Full 5-step guided workflow: Record View → Activity Checklist → Issue Parts → Book Labor → Closing. The default choice for "close out a work order" tasks. |
| **19831** | PM | Guided workflow that **skips Issue Parts** — for checklist → labor → closing without the parts step. |
| **20450** | Routine | **No configured workflow** — flat, unordered, ungated step rail. Use to test what an *unconfigured* WO type feels like, or to contrast against the two above. |

Tapping any other WO routes to the closest match by type rather than erroring,
so a tester who wanders won't hit a hard stop — just an unexpected identity.

### Checklist navigation — a live A/B, and the biggest open question

**New 2026-08-12, and the single most important thing to know before designing a
checklist task.** Step 2 of the workflow now routes to an A/B copy of the
Activity Checklist, and it **defaults to "scroll" mode**:

- **Scroll mode (default)** — items are scrolled between with a flick, and the
  surface snaps to land one item on. Still one item at a time; the *transition*
  is a gesture rather than a button press. Built because a fanned-out Route
  checklist (see below) reads as an endless run of discrete screens under
  Prev/Next.
- **Paged mode** — the original Prev/Next pager. Reachable from the **`↕ Scroll`
  / `⇄ Paged` button in the dev toolbar** outside the phone frame. The choice
  survives navigating out to Book Labor and back, but not a fresh browser
  session.

This is a genuine undecided design question and **good session material** — run
some participants on each if you can. The two things it turns on: does a flick
reliably land exactly one item on, and does typing in **Notes** fight the snap?
Both are device-feel questions that can't be answered from a desktop browser.

Whichever mode is active, every item now carries an **Item Banner** — a
fixed-height strip with the mono item number and the item's equipment. That part
is **locked design, not under test**; it's what the scroll gesture lands on, and
paged mode carries it too. "View all" also gained **collapse/expand all**.

### Completed steps are now navigable backwards

**Changed 2026-08-12.** A technician can always return to an already-completed
step to correct it — a mistyped reading or wrongly-booked hours has to be
fixable. Completed rows in the step rail carry a **trailing chevron** so the
affordance is visible on a touch device. **Forward gating is unchanged**: a step
you haven't reached yet is still locked and still explains why. Previously a tap
on a completed step was refused with "steps stay in a fixed order," and on a PM
workflow it silently did nothing — so if an earlier tester reported the rail as
a dead end, that's fixed rather than a finding.

### Flows worth building tasks around

1. **Route / Multiple Equipment.** On WO 19257's Record View, set the **Route**
   field. That immediately adds every piece of that Route's equipment to the
   WO's Equipment tab, mints one child work order per piece, and surfaces a
   Route pill. Those children are **real records** — they appear in WO List as
   child rows under 19257 (tap the parent's chevron) and open as themselves.
   Clearing the Route removes them again.
   - **It also fans out the checklist:** every equipment-specific item is
     duplicated once per piece of equipment. **View all → Equipment** groups it
     by asset.
   - **Scale warning for task design:** the two demo Routes are 24 and 156
     pieces of equipment, so the fanned-out checklist is ~96 or ~624 items.
     Intentional and realistic, but it means the one-item-at-a-time stepper is
     not a sensible way to walk a long Route end to end. Design Route tasks
     around **View all**, and steer testers to the 24-piece `PUMPS` Route
     rather than `FIREEXT`.
2. **Create a record and find it again.** Create (`+`) from Home, WO List or
   Equipment List now produces a record that **persists** — it lands on its own
   Record View showing the data you typed, appears in the list afterwards, and
   re-opens as itself. This was broken earlier today and is a good task now.
3. **Comments and Documents.** Both Record Views show the **top 3** with a
   **View more** footer opening the full tab, newest first. Comments are
   chat-style cards; your own are tinted and their ellipsis offers Edit and
   Delete, others' offer Copy. Documents group by where they came from (Work
   Order / Equipment / Parent WO / Location) with `Source:` shown, and each row
   has a preview slot that falls back to a file-type badge. WO reaches these via
   a dedicated Comments/Documents tab screen; Equipment uses its existing tabs.
4. **Equipment photo** (new). Equipment Record View's header carries a photo
   slot left of the code/description that **collapses away with the status row
   on scroll**. Worth a look specifically for the scroll feel — that behaviour
   was chosen from a mockup and hasn't been tested with anyone yet.

### Filters, sort and search

Every filter chip on both WO List and Equipment List does something, and so does
Sort. Half of them were "coming soon" toasts until today.

- Code-list chips (Status, Type, Organization, Class, Category, Assigned To)
  open multi-select sheets with search-within.
- Free-text chips (Description, WO number, Asset ID) open a "contains" filter.
- Due date opens a from/to range; either side can be left open.
- Sort offers the dataspy's own fields plus ascending/descending.
- **Checklist search spans everything a row shows** — not just the item text.
  Equipment code, equipment description, group name, the entered answer, notes
  and the option labels ("Pass"/"Fail") all match. On a Route WO, searching an
  equipment code is a good task.

**Filters and sort now survive the round trip** — filter WO List, open a
record, come back, and your dataspy, chips, sort, search text and expanded rows
are all still set.

### One pattern testers will meet everywhere: typing

Any field that opens a keyboard now uses **✕ top-left, ✓ top-right, no button
at the bottom**. That changed late today because a bottom Save collided with
iOS's own keyboard bar. It applies to comments, long-text fields, the
number/currency editor, the filter chip sheets (Apply is now the ✓), Book
Labor's correction sheet and Issue Parts' issue/return sheet.

Two things worth watching, since they're the newest and least tested:
- Does the ✓ read clearly as "save/apply"? It's a 34px circle where some of
  these screens previously had a full-width button.
- **iOS still draws its own `^ v ✓` bar above the keyboard.** That can't be
  removed from a web page. Ours no longer sits underneath it, but if a tester
  reaches for the wrong checkmark, that's a genuine finding worth capturing.

## 4. Known stubs — don't build a test task around these

**Will visibly derail a task:**

- **Equipment Record View is an identity overlay, not a per-asset record.**
  Tapping a card opens *that* asset's identity, but only the header and
  identifying fields are the tapped row's. Comments, Documents and all 7 child
  tabs show the same demo record's content whichever asset you opened. Fine for
  "show me an equipment record"; don't build a task comparing deep content
  between two assets.
- **An Equipment record created in-app gets a Class no filter can match.**
  Insert Mode's third pill offers Asset/Position/System while the list filters
  on PUMP/MOTOR/VALVE/… — an unresolved modelling question, not a display bug.
  "Create equipment, then filter by Class to find it" will fail. Filtering by
  Description or Asset ID works.
- **Checklist items themselves can't be added or edited.** Testers can *answer*
  items but not author them. (Adding and editing **Activities** on the WO — the
  Plus and pencil icons on the Activities block — *is* built and fine to test.
  It's the checklist item list that isn't editable.)

**Fine to let testers hit — expected, not findings:**

- **Issue Parts:** the **Add Part** search is real — the full 112-part customer
  catalogue, searchable by number, description or class. What's still fixed demo
  data is the WO's own *planned* parts lines and the Store/Bin/Lot options, so
  every WO shows the same planned rows and the same bin choices. Stock figures
  are synthesized (stable per part, not random).
- Attaching a document is a stub — **Add document** and "Upload Multiple
  Documents" both toast. Documents are readable and browsable, including the
  source-hierarchy tree, just not uploadable.
- Document previews are placeholder images, so the file-type badge on most rows
  is the intended behaviour, not a loading failure.
- @mention tagging in Comments isn't built; Comments take plain text.
- No profile photo / avatar upload for the technician.
- Book Labor's "Correction" sheet shows fixed demo values rather than
  tester-entered ones.
- **Sort lives on each list's first screen, not on its Search screen** — a
  tester who filters on Search has to go back to change sort order.
- The WO Equipment tab's row-tap behaviour is a deliberate live A/B toggle
  (`chooser` vs. `split`) on that screen's dev bar. **This is a genuine open
  design question and good session material** — just don't read either
  behaviour as a bug.
- No real network detection; online/offline/synced is the dev toggle only.

**Fixed since the last brief — don't log these if an earlier note mentions them:**

- **Content clipped behind the bottom bar** on devices with a home indicator.
  Six screens held back too little space and none allowed for the safe-area
  inset, so the last container on a long screen was cut off. Now one shared
  reserve across all of them.
- **The checklist's paged mode could not be scrolled at all** on device.
- **WO 20450 showed a pump as its equipment** despite being a facility work
  order; it's a building now, and `BLDG-A` is pickable in the Equipment lookup.
- **Child work orders were hard to tell apart** from their parent in WO List —
  they're visually distinct now.
- **A "popup showing behind another popup" report.** The real cause was that
  *closed* sheets were peeking above the keyboard, not a stacking-order problem,
  which is why it survived two earlier attempted fixes.

## 5. What counts as a real finding

Everything else — the 5-step workflow, WO List/Search, Home, Equipment Record
View, Insert Mode, Notifications, sync status, and the shared chrome (status
pills, filter chips, step rail, Comments/Documents, LOV and date pickers, sync
indicator) — is built on one shared component system and should hold up under
normal task-based testing.

If a tester hits something that looks broken and it isn't in §4, treat it as a
real finding, not a known gap.

**Worth knowing about the verification behind this build:** it's been checked by
static review and headless execution — every screen loads, and the flows above
are covered by automated tests. It has **not** been visually reviewed on a
device by the person who built it. So layout, contrast, tap-target size and
anything animated are genuinely unverified, and "it looks wrong" is a
high-value finding here rather than a nitpick.

## 6. One-paragraph version for the invite

> Connected HTML screens, no backend. Login is a placeholder — tap straight
> through. Everything centres on 3 demo Work Orders: **19257** (full 5-step
> workflow), **19831** (skips Issue Parts), **20450** (no configured workflow).
> Best tasks: setting a **Route** on 19257 (spawns child work orders and fans
> the checklist out per asset — use the 24-piece PUMPS Route, not the
> 156-piece one), **creating a record** (now persists and re-opens), and
> **Comments/Documents**. All filter chips, Sort and checklist search are live,
> and filters survive opening a record and coming back. **The Activity
> Checklist is a live A/B** — it defaults to a new flick-and-snap scroll
> navigation, with the old Prev/Next pager one dev-bar button away; that's the
> main open question, so watch whether a flick lands cleanly and whether typing
> Notes fights the snap. Completed workflow steps can now be reopened to
> correct them; steps ahead of you are still locked. Avoid tasks that compare
> deep content between two Equipment records, or that filter created equipment
> by Class. Anything you type uses ✕/✓ in the top corners rather than a Save
> button at the bottom — watch how testers find it. Hit **Restart Demo**
> between participants; state persists now.
