# Mobile project summary for presentation

> **This is a snapshot, and it owns nothing.** Written to communicate
> vision and scope — it is the source for a presentation, not a source of
> truth. Every fact in it is summarised from somewhere else:
> requirements, sequence and open issues from
> `EAM-Mobile-Design-Doc-v1.md`; every design rule and its rationale from
> `design-decisions-v3-1.md`. **If this doc and either of those disagree,
> they are right and this is stale.**
> 
> Re-derive it rather than maintaining it. A "summary of X" that gets
> edited in place drifts away from X — that already happened once in this
> repo, over about a month, and the offending doc was retired for it.

The project is separated into two main sections:

1. **Mobile Configuration Portal** — persona: Administrator
2. **Mobile Application** — persona: Technician / executor of work

## Mobile Configuration Portal

Four areas. Three define the metadata consumed by the app for the currently
logged-on user, resolved through their applied user group; the fourth binds
that metadata to user groups.

1. Workflows
2. Home Layouts
3. Offline Profiles
4. User Group Association

### Workflows

A workflow is a set of WO-related screens a user group completes in a specific
sequence, for a WO type. The administrator drags and drops available work order
steps (i.e. work order screens/tabs) onto a linear canvas that creates a guided
flow. The same screen can be brought onto the canvas multiple times and have a
different page layout than a previous step of the same screen.

Page layout resolution: Function by User Group by WO Type by **Screen** by
**Instance** — where Screen is which screen, and Instance is which occurrence of
it in this workflow. That second dimension is what allows the same screen to be
placed more than once, each occurrence carrying its own layout.

Note that a page layout is keyed on the screen, not on the step. Where a screen
sits in the flow — whether it is numbered and gated, or parked in the More
group — is a separate property of the workflow row. An action or a fork occupies
a position in the flow but has no page layout at all.

Note: steps can be reordered and maintain their configured screen design.

Two further node types can be dropped between steps, both invoked when the user
taps 'Next Step':

- **Forks**, which route the flow — Question and Condition
- **Actions**, which perform work — Status Update, Start Timer, Stop Timer

### Home Layouts

The home screen is the menu of the application. It contains tiles, each
associated with a List View screen and optionally a dataspy as a filter. A tile
can be flagged as Insert Mode, which allows it to be added to the 'Create'
button — and only there, not into a section of the home screen.

Tiles themselves are created within the portal.

Lastly, the main app's navigation bar is configured in this section of the
portal. Each item's label, underlying screen and icon (not colour) can be
defined here. There is a maximum of 5 items supported in the navigation bar.

### Offline Profiles

An offline profile is a static record defining what data is downloaded to the
device by the background hydration job following login. This allows the product
to keep tight scope on the subset of entities the user is able to operate
offline with, and the administrator to define what data should be downloaded of
that subset. 

It is a Sync Configuration paradigm screen that will closely follow EAM offline from a design paradigm point-of-view. 

### User Group Association

Finally, the last area in the portal associates the aforementioned metadata to
user groups.

## Mobile App

Design principles are:

1. No Edit Mode
2. Insert Mode is separate from Update Mode
3. No explicit 'Save', unless exception — changes commit as they are made, and
   the form stays dirty until the user navigates away from the current screen

### Screens positioned to be developed

The portal's four areas are above; these are the app's own screens.

**App Shell**

1. Login
2. Bottom Navigation Bar
3. Profile / Avatar Menu
4. Sync Control
5. Insert Mode

**Home**

1. Home Screen
2. Create Menu

**Search**

1. Search Work Orders
2. Search Equipment

**Work Order**

1. WO List
2. WO Record View
3. Activity Checklist 
4. Issue Parts
5. Book Labor
6. WO Closing
7. Equipment
8. Comments
9. Documents
10. Booking Pull-up
11. Status Prompt
12. Question Prompt
13. Condition (no screen — evaluates and routes)

**Equipment**

1. Equipment List
2. Equipment Record View
3. Equipment › Comments
4. Equipment › Documents
5. Equipment › Events
6. Equipment › PM Schedules
7. Equipment › Structure Details
8. Equipment › Meters
9. Equipment › Warranties
10. Equipment › Parts Associated

**Sync Status**

1. Sync Panel
2. Sync Status Screen

**Notifications**

1. Notifications

## Open major decisions

Decisions owed at the onset of the project, not screen-level behaviour. Every
one of these binds something before it can be built; the smaller calls are
tracked in `design-decisions-v3-1.md` §20.

### 1. Portal UI — Octave Experience vs. a new base UI

Does the configuration portal ship on the Octave Experience (OUX) shell, or is
it built as new base UI?

**For OUX**

1. Skirts the confusion of the existing mobile config screens littered
   throughout base for the two apps.
2. A single screen for the admin handling all configuration.
3. Allows the workflow setup to be authored as a diagram — drag-and-drop —
   and the screen design to be previewed in a mobile emulator.
4. If we want to align operational mobile apps across the portfolio, this is a
   consistent shell applicable to any existing product — a silver bullet.

**Against OUX**

1. On-premise deployment.
2. Other-team dependencies.
3. Long-term longevity — **is it a two-way door?**

Note: the portal is prototyped on OUX today and the mobile app is not. The two
design systems do not share components, so this decision is about the portal
only. It is also entangled with decision 7 — the base UI's own migration.

### 2. Workflow execution in the base product

Three questions, one decision:

1. Do we ride the customer's existing `WSJOBS` master function and its clones,
   or is this new construction entirely?
2. Can the authored screens and workflows eventually be **executed from base**,
   as-is?
3. If yes — is that another point for OUX?

Every layout row, dataspy and permission set keys to whatever function the app
resolves, so this binds before any base-side authoring starts. Nothing about
the second question is designed today.

### 3. The API in front of the layout and workflow tables

The portal authors workflows and **the app cannot yet be told about them**. An
API in front of the page layout and workflow tables is the single largest
unowned piece of the project, and every configuration-driven behaviour in the
app is downstream of it.

### 4. A new Equipment function that renders by equipment type

Required, and unspecified: the function itself, its page-name mapping across
the four system types and their clones, and the authoring surface for them.
**This blocks the Equipment track entirely** — building Equipment screens
against one hardcoded layout means every child tab inherits it.

### 5. Offline scope versus the shipping product

Our declared offline scope puts equipment/WO history and meter readings out of
reach; the live product downloads both. Either we communicate the regression or
we give those entities a **bounded** carve-out (last N) — never unbounded
history. Separately, 11 of 31 entities still have no policy decision.

### 6. The punch list costs two backend asks, not one

A technician's work list is **both** a dataspy **and** a pins table — two
backend asks, not one. Both halves of the authoring side are settled: the
dataspy is selected on the Work Orders row of the offline profile, and that row
renders on every profile including `None`, so an online-only group gets a work
list too. What is still owed is on the backend, not the screen — a pinned row
must record **which source** pinned it, or re-evaluating the dataspy silently
evicts a technician's own addition.

### 7. The base Sencha-to-Angular migration is an unowned dependency

A separate programme, and two things in this project point at it with nobody
owning the relationship: phone-width responsive needs confirming as an explicit
goal of it, and an Angular front end implies the real API that decision 3 needs.
Directly relevant to decision 1.

### 8. Conditional field rules — the two one-way doors

Deliberately deprioritised to a later phase, and that stands. What is owed up
front is only the two decisions that cannot be retrofitted: the field-state
resolution seam, and the declared-versus-effective split. Do **not** pick a
tier now.
