# EAM Mobile — UX User Testing Readiness Brief

Audience: the UX team, ahead of a user-testing session. Purpose: get
testers into the prototype fast, on real demo data, without a moderator
having to guess in the moment which dead ends are "real findings to note"
vs. "known stub, don't design a task around this."

Snapshot as of **2026-08-11**. It will drift as the prototype changes — if
you're reading this more than a couple of weeks later, sanity-check §3
against `CLAUDE.md` before trusting it.

## 1. Access

- **Public URL:** `https://dannykayburn.github.io/eam-mobile/` — no
  password, works on any phone or laptop browser, no install. The root
  redirects to the login screen.
- **Login is a placeholder, not a real gate.** No credential validation,
  SSO, or biometric unlock (§4.1 — explicitly not designed yet). Tapping
  **Log In** with the fields as-is, or blank, goes straight into the app.
  **Forgot Password** is a toast stub. Brief testers to skip past this
  screen; it isn't part of what you're testing.
- **Device rendering was broken until 2026-08-11 and is now fixed.** If
  anyone tried the URL on a phone before then and reported the app looking
  cut off — the bottom navigation bar pushed below the fold with no way to
  reach it — that was a real bug (`100vh` vs. the mobile browser's actual
  visible height), not their device. It's fixed. Worth re-checking on one
  real phone before the session so you're confident, but no other layout
  work is outstanding.
- **The app is deliberately a phone-width column** (max 430px) centred on
  larger screens. On a tablet or laptop you get a phone-shaped app with a
  drop shadow, not a stretched desktop layout. That's the design, not a
  responsive gap — this is a phone-first product.

## 2. Reset between participants

Every screen has a small dev toolbar outside the app frame with a
light/dark toggle, an online/offline/synced cycle, and **Restart Demo**.

**Use Restart Demo between test participants.** State now genuinely
persists — created work orders, created equipment, Route equipment, minted
child WOs, favourited dataspies, sync outbox — so participant 2 will
otherwise inherit everything participant 1 did. Restart Demo navigates to
login; the actual reset happens when **Log In** is tapped.

## 3. What to test with

### The 3 seeded demo Work Orders

There's no backend. Everything routes off 3 seeded WO identities, reachable
by tapping the matching card in WO List:

| WO # | Type | What it demonstrates |
| --- | --- | --- |
| **19257** | Breakdown | Full 5-step guided workflow: Record View → Activity Checklist → Issue Parts → Book Labor → Closing. The default choice for "close out a work order" tasks. |
| **19831** | PM | Guided workflow that **skips Issue Parts** — use for checklist → labor → closing without the parts step. |
| **20450** | Routine | **No configured workflow** — flat, unordered, ungated step rail. Use to test what an *unconfigured* WO type feels like, or to contrast against the two above. |

Tapping any other WO routes to the closest match by type rather than
erroring, so a tester who wanders won't hit a hard stop — just an
unexpected identity.

### Two flows that are new and worth building tasks around

Both landed 2026-08-11 and are the most complete threads in the prototype:

1. **Route / Multiple Equipment.** On WO 19257's Record View, set the
   **Route** field. That immediately adds every piece of that Route's
   equipment to the WO's Equipment tab, mints one child work order per
   piece, and surfaces a Route pill on the Record View. Those child WOs are
   now **real records** — they appear in WO List as child rows under 19257
   (tap the parent's chevron) and open as themselves. Clearing the Route
   removes them again.
   - **Also fans out the checklist:** every equipment-specific checklist
     item is duplicated once per piece of equipment. Use **View all →
     Equipment** to see it grouped by asset.
   - **Scale warning for task design:** the two demo Routes are 24 and 156
     pieces of equipment, so the fanned-out checklist is roughly 96 or 624
     items. That's intentional and realistic, but it means the
     one-item-at-a-time stepper is not a sensible way to walk a long Route
     end to end. Design Route tasks around **View all**, or steer testers
     to the 24-piece `PUMPS` Route rather than `FIREEXT`.
2. **Create a record and find it again.** Create (`+`) from Home, WO List,
   or Equipment List now produces a record that **persists** — it appears in
   the list afterwards and re-opens as itself. Previously it vanished the
   moment you navigated away, so "create a work order" was an unusable task.
   It's a good one now.

### Comments and Documents (new 2026-08-11)

Both Record Views show the **top 3** with a **View more** footer that opens the
full tab, newest first. Comments are chat-style cards — your own are tinted and
their ellipsis offers Edit and Delete; others' offer Copy. Documents group by
where they came from (Work Order / Equipment / Parent WO / Location), with
`Source:` shown inline, and each row has a preview slot that falls back to a
file-type badge. Good material for tasks; just note that *uploading* is stubbed.

### Filters and sort are fully real now

Every filter chip on both WO List and Equipment List does something, and so
does Sort. Previously half of them were "coming soon" toasts — that's gone.

- Code-list chips (Status, Type, Organization, Class, Category, Assigned To)
  open multi-select sheets with search-within.
- Free-text chips (Description, WO number, Asset ID) open a "contains" filter.
- Due date opens a from/to range; either side can be left open.
- Sort offers the dataspy's own fields plus ascending/descending.

One gap to know: **the Sort control sits on each list's first screen, not on
its Search screen.** A tester who filters on the Search screen has to go
back to change sort order.

## 4. Known stubs — don't build a test task around these

**Will visibly derail a task:**

- **Equipment Record View is an identity overlay, not a per-asset record.**
  Tapping an Equipment card now correctly opens *that* asset's identity
  (this was fixed 2026-08-11 — every card used to open the same record), but
  only the header and identifying fields are the tapped row's. Comments,
  Documents, and all 7 child tabs are still the same demo record's content
  regardless of which asset you opened. Fine for "show me an equipment
  record"; don't build a task that compares deep content between two assets.
- **An Equipment record created in-app gets a Class no filter can match.**
  Insert Mode's third pill offers Asset/Position/System while the list
  filters on PUMP/MOTOR/VALVE/… — an unresolved modelling question, not a
  display bug. So "create equipment, then filter the list to find it by
  Class" will fail. Filtering by Description or Asset ID works.
- **Checklist items themselves can't be added or edited.** Testers can
  *answer* items but not author them. (Adding and editing **Activities** on
  the WO — the Plus and pencil icons on the Activities block — *is* built and
  fine to test; it's the checklist item list that isn't editable.)

**Fine to let testers hit — expected, not findings:**

- Issue Parts uses fixed local demo parts data, so every WO shows the same
  parts options and the same Store/Bin/Lot choices.
- @mention tagging in Comments isn't built; Comments take plain text only.
- Attaching a document is a stub — the **Add document** row and "Upload
  Multiple Documents" both toast. Documents are readable and browsable
  (including the source-hierarchy tree), just not uploadable.
- Document previews are placeholder images, so the file-type badge you'll see
  on most rows is the real intended behaviour, not a loading failure.
- No profile photo / avatar upload.
- Book Labor's "Correction" sheet shows fixed demo values rather than
  tester-entered ones.
- Book Labor's Department and Trade fields cycle on tap instead of opening a
  picker, unlike the other fields on that screen.
- The WO Equipment tab's row-tap behaviour is a deliberate live A/B toggle
  (`chooser` vs. `split`) on that screen's dev bar — **this is a genuine open
  design question and good material for the session**, but don't read either
  behaviour as a bug.
- No real network detection; the online/offline/synced state is the dev
  toggle only.

## 5. What counts as a real finding

Everything else — the 5-step workflow, WO List/Search, Home, Equipment
Record View, Insert Mode, Notifications, sync status, and all the shared
chrome (status pills, filter chips, step rail, Comments/Documents, LOV and
date pickers, sync indicator) — is built on one shared component system and
should hold up under normal task-based testing.

If a tester hits something that looks broken and it isn't in §4, treat it as
a real finding worth reporting back, not a known gap.

## 6. One-paragraph version for the invite

> Connected HTML screens, no backend. Login is a placeholder — tap straight
> through. Everything centres on 3 demo Work Orders: **19257** (full 5-step
> workflow), **19831** (skips Issue Parts), **20450** (no configured
> workflow). Two flows are newly complete and worth building tasks around:
> setting a **Route** on WO 19257 (spawns child work orders and fans the
> checklist out per asset — use the 24-piece PUMPS Route, not the 156-piece
> one) and **creating a record**, which now persists into the list. All
> filter chips and Sort are live. Avoid tasks that compare deep content
> between two Equipment records, or that filter created equipment by Class.
> Hit **Restart Demo** between participants — state persists now.
