# Workflow Composition & Execution — Review and Scenario Matrix

**Status:** Reviewed 2026-10-23, and **written back the same day**: the agreed rules are
§32 of `design-decisions-v3-1.md`, superseded text is in §21, and open items are in §20.
**The spec governs from here; where this file and §32 differ, §32 wins.** This file is a **working analysis**, not a spec; it is retired
once those moves are made.

**Companion drafts:** `EAM.ADMN.SCOPE.WorkflowComposition.md` (what the portal lets an
admin save) and `EAM.MOBILE.SCOPE.WorkflowExecution.md` (what the app enforces while a
technician runs the WO). Both state only the behavior recommended here. They do not repeat the reasoning.

**Baseline assumed (agreed before drafting):** **one running timer per technician**,
across all work orders.

**Sources read:** spec §11, §12, §14.1–§14.11, §15.4, §18.2, §19.7–§19.8, §29.2–§29.5,
§30.11, §30.18, §30.19, §30.21, §30.26, §20; the portal's validators
(`validateForks()`, `naSet()`, `applyFreeForm()`, `moveToRef()`); the app's timer
(`startStepTimer()`, `navBack()`); and the shipping mobile UCs
`EAM.MOBILE.REQ.WorkOrders`, `…ActivitiesforWorkOrder`, `…BookLaborforWorkOrder`,
`…WorkOrderChecklist`, plus `EAM.DUX.REQ.DigitalWorkHome`.

---

## 1. The vocabulary being composed

| Group | Kind | What it does | Key attributes |
| --- | --- | --- | --- |
| **Step** (`isStepKind`) | Delivered tab instance — Record View, Checklist, Issue Parts, Book Labor, Closing, Comments, Documents, Equipment, any function tab | A screen the technician visits | `zone` (Flow / More), `visible`, `required`, `reqComment`, `reqDoc`, `inst`, Time Entry Mode (Book Labor) |
| | UDS | Customer-authored screen, same rules as a tab | same |
| **Action** | Status update | Writes a WO or Activity status | entity, status, `mode` System/User |
| | Start Timer | Starts the technician's timer on this WO-Activity | `mode` |
| | Stop Timer | Stops the timer **and books it** | `mode` (User = Hours editable) |
| **Fork** (`isForkKind`) | Question fork | Technician answers, flow routes | 2 answers, each a forward target / continue / End |
| | Condition fork | System reads a field from the nearest preceding step on Next | field, operator, value; true / false / **null → continue** |
| **Workflow** | Not Free Form | Ordered, gated | `woType` or none, `fn` |
| | Free Form | Unordered; **all actions and forks are stripped** (`applyFreeForm()`) | |
| | §11 fallback / `*` | Delivered, flat, ungated | |

Everything that follows comes from how these interact. Two forces combine in it. **Actions and forks are positional**, but
the technician moves **non-positionally**: they go back, leave, switch WOs, and resume tomorrow.

---

## 2. The review — what's actually wrong

Ordered by how badly it would bite in the field.

1. **Nothing validates timer order.** The portal accepts Stop Timer with no Start Timer,
   two Starts in a row, or a Start that nothing ever stops. The runtime rule (*"no timer running →
   nothing happens"*, §30.21) makes this safe, but it also makes it *silent*. An admin who
   builds Stop-without-Start gets a workflow that never books anything, and nobody
   finds out until payroll.
2. **Validation is position-based, and forks make the flow a graph.** A question fork can
   route *around* a Start Timer and still land on the Stop Timer. Checking each node in
   isolation can't catch that. Every timer and status rule has to be evaluated **per path**.
   Forward-only forks make the flow a DAG, and two answers per fork keep the number of paths small.
3. **There are two timer-start sources and nothing says which one wins.** §15.4/§18.2 start the timer **implicitly** at
   Start Work (silently on Not Free Form, with a prompt on Free Form). §30.21 added a **placed** Start
   Timer action. A workflow with Start Work *and* a Start Timer after Record View starts twice. A
   workflow with a Start Timer at step 4 still starts at Start Work. The spec doesn't pick.
4. **Start Work's status source no longer exists.** §14.11 item 1 and §15.4 still say Start
   Work sets the header's *Start Work Status*. §30.11 deleted that field. None of the five seeded
   demo workflows places a Status update at all, so **no seeded workflow moves status on Start
   Work.** The natural answer is the slot right after Record View 1 (it fires on Start Work), but
   nobody has written that down.
5. **The timer is treated as screen state when it's technician state.** Today:
   - `startStepTimer()` resets to `0` on every page load.
   - `eamTimerRunning` lives in `sessionStorage`, so an app kill loses it.
   - §14.7.1 *pauses* on Back.
   - §14.9 only shows the timer on two screens.

   The shipping product does the opposite. A **start record** is synced to base (MOBSTST=SYNC), the
   clock ticks "from the start moment defined in the start record", and navigation has no effect on it. The
   moment Resume exists, the timer has to outlive every screen, the session, and the device.
6. **Three stop mechanisms, and one breaks the rule.** §18.2 says *"the timer stops when the time is
   booked — that is the only place."* §14.9's rail Stop → **No** "stops the timer but stays… time is
   captured and can be booked later." That captured time has no home. It's an unbooked stopped timer,
   which is the exact state §18.2 abolished.
7. **The More group lets the technician do a gated step's work early.** §29.2 allows a Step instance and a
   More instance of the *same tab*, and argues that "nothing routes a technician into a gated step
   early." That's true of *routing*, but the *work* is still bypassed. Closing in More closes the WO
   before the checklist. This is the §14.8 rule-1 problem coming back one level down.
8. **Status rules ignore time.** A Stop Timer placed after Closing, or after a completing Status update,
   books an End Time past *Date Completed*. Base rejects that (BOOKDATE, Book Labor §9.2: *"The End Time must
   occur prior to the Time Completed"*). So the flow advances on the device and the outbox fails hours
   later, which is the trust failure §20's write-gate row describes.
9. **"Next" means two things after a revisit.** §14.10 lets the technician reopen a completed step, but nothing
   says where its Next goes. If it walks forward, forks re-evaluate and actions re-fire: a second
   status write, a second Start, a re-routed path with data on the abandoned branch. If it jumps to the frontier, the
   bar label "Next: X" is wrong.
10. **A workflow run has no identity.** Cursor, fork answers, action log and timer all need a key, and
    none is defined. A WO can have several activities (shipping WorkOrders §8.13, §20 row 31), several
    technicians, and MEC children that open "as themselves" while resolving on the parent. Without a run key,
    Resume has nothing to point at.
11. **Completion is undefined without Closing.** A fork's End, or a workflow with no Closing and no
    terminal Status update, finishes the run and writes nothing. §19.7.1's PM "Complete Work Order" sheet was
    the old answer, and §30.21 retired it in favor of a placed user-selected Status update. §19.7.1 still describes the old version.
12. **Smaller issues:**
    - §11 still says a step type can't repeat (superseded by §29.2).
    - `Visible = N` on a flow instance has no defined meaning. A hidden Required step is a dead end.
    - Pause has **no base representation** at all (the shipping product has Start/Stop/Reset, no Pause), and §20 row 44 still lists pause/resume as open.

---

## 3. Composition rules — what the portal must check

**Severity model.** Each message is raised on the node or control that causes it, never in a summary (§30.20).
- **Error:** the workflow can't be assigned to a group; the assignment control refuses it the same way it
  refuses a clash.
- **Warning:** legal, but probably a mistake.
- **Info:** a stated consequence.

**Path-aware** means the rule is evaluated over every route through the forks, with an End
target terminating that path.

| ID | Rule | Severity | Path-aware | Why |
| --- | --- | --- | --- | --- |
| **C-01** | A **Stop Timer** must have a **Start Timer** before it on **every** path. | **Error** if no path has one; **Warning** if some paths lack one | Yes | Review #1/#2. Runtime tolerance (§30.21) is what makes the partial case only a warning. |
| **C-02** | A **Start Timer** should be followed, on every path, by a Stop Timer **or** a Book Labor step, **or** reach a run end that triggers the completion booking (R-13). | Warning | Yes | Otherwise the clock runs until the technician notices. |
| **C-03** | **Two Start Timers** on one path with no Stop between them. | Warning (redundant; second is a no-op) | Yes | |
| **C-04** | **Two Stop Timers** on one path with no Start between them. | Warning | Yes | |
| **C-05** | **A Stop Timer after a completing status**: placed after Closing, or after a Status update to a system status of Completed/Closed, on any path. | **Error** | Yes | Books past Date Completed; base rejects (Review #8). |
| **C-06** | **A Flow step after a completing status** on any path. | **Error** | Yes | Every field except Status is protected once Closed/Completed (§15.4), so the step is a dead end. |
| **C-07** | **A User-selected Status update** with steps after it. | Info: *"If the technician picks a completing status here, see R-09."* | — | The target isn't known at authoring time. |
| **C-08** | ~~Status update the assigned group is not authorized for~~. **Withdrawn by D-15:** a System action bypasses group authorization, so there's nothing to predict. It's replaced by an Info in the Status update editor stating the bypass and that User-selected mode still uses the group's list. | Info | — | D-15 |
| **C-09** | **No Status update and no Closing on a path** (Not Free Form). | Warning: *"This path can end without changing any status."* | Yes | Review #11. Covers a fork's End route. |
| **C-10** | **Nothing precedes Record View instance 1** — of any kind. | Enforced (clamp at mutation) | — | Actions placed directly after RV1 fire **on Start Work**. This is the replacement for §12's Start Work Status (Review #4). |
| **C-11** | **Closing is never placed in More.** | **Error** (refused at the drop, guarded in `moveToRef()`) | — | Review #7. |
| **C-12** | **A tab with both a Step instance and a More instance.** | Warning: *"Step N's work can be done from More before step N is reached."* | — | Review #7. Kept as a warning because Book Labor in More is the point of §30.21. |
| **C-13** | ~~`Visible = N` with `Required` or a gate~~. **Withdrawn by D-16:** the column is removed. | — | — | D-16 |
| **C-14** | **A Required step, or a gated step, the group has no tab permission for.** | **Error** (non-Required: Warning) | — | §27.4 / §29.5. Owed: port from the archived User Group Setup (§20). |
| **C-15** | **A fork whose two branches resolve to the same target**, including both "continue". | Warning | — | Asks a question that routes nothing. |
| **C-16** | **A condition fork with no field**, or a stale field reference. | **Error** on the node | — | Today it is cleared and toasted (`validateForks()`), so it stays visibly broken. |
| **C-17** | **A condition fork whose source step can be skipped on some path.** | Info: *"Empty continues in sequence."* | Yes | Null → continue (§30.19), so the result is deterministic but surprising. |
| **C-18** | **A gate on a non-Required step / on a More entry.** | Warning / refused (existing, §29.3) | — | Unchanged. |
| **C-19** | **Actions and forks in Free Form or More.** | Refused (existing, §30.11) | — | Unchanged. **New Info on the Free Form toggle:** *"Free Form has no status or timer automation — the technician sets status and runs the timer by hand."* |
| **C-20** | **Fork → End skipping Closing** on a workflow that has a Closing step. | Warning | Yes | Specialization of C-09. Named because it's the common case. |
| **C-21** | **Consecutive Status updates to the same entity and status.** | Warning | Yes | Second is a no-op. |

**What is deliberately *not* a rule:**
- **Book Labor step plus Stop Timer.** One timer, one condition, nothing to detect (§18.2).
- **A Start Timer that a User-mode decline can skip.** The decline advances (§30.21), and C-01
  treats a User-mode Start as "present", since the technician chose.

---

## 4. Runtime rules — what the app must enforce

| ID | Rule |
| --- | --- |
| **R-01** | **A workflow run is keyed `(technician, WO, Activity)`.** For Multiple Equipment, the WO is always the **parent**. A child never has a run of its own (D-13, decided). |
| **R-02** | **Start Work creates the run.** In one transaction it applies §14.11's commitment (Type protected, pinned, children hydrated, config version stamped), sets the cursor to the next node, and fires the action chain after RV1. |
| **R-03** | **Actions fire in order on the preceding step's Next, until the next step is reached.** Each fired action is recorded in the run's action log and **never fires twice in one run.** A held chain (R-06) resumes **at the held action**, not at the start of the chain. |
| **R-04** | **Start Timer** starts the timer on the run's WO-Activity. If this WO-Activity's timer is already running, it's a no-op. If **another** WO-Activity's timer is running, AUTOBOOK applies (R-12), **even in System mode**, because the consequence lands on a different WO. |
| **R-05** | **Stop Timer** stops and books **only a timer running on this run's WO-Activity.** If none is running, or the running timer belongs to another WO, it's a no-op and the flow continues. *(Tightens §30.21's "no timer running", which predates one-timer-per-technician.)* |
| **R-06** | **User-mode Status update: Cancel holds** on the previous step (locked, §30.21). **User-mode timer decline advances** (locked). |
| **R-07** | **A System-mode Status update writes its authored status without checking the group's status authorizations** (D-15, decided). It is still refused only by base's system-status lifecycle (e.g., the WO is already Closed), in which case it doesn't write, shows a non-blocking notice, and the flow **continues**. |
| **R-08** | **Forks evaluate once, on first traversal, and the result is pinned in the run.** Skipped steps are N/A (locked §29.4). **Actions inside a skipped range are recorded as skipped and never fire.** |
| **R-09** | **A completing status chosen mid-flow** (User-mode Status update, or the editable status in Free Form): refused while **Required** steps remain unfinished; allowed if only optional steps remain, which then go N/A. Timer: R-13. See D-7. |
| **R-10** | **Revisiting a completed step is editing in place.** Its bottom bar reads **"Back to <frontier step>"**, not "Next: X". Forks and actions **do not** re-evaluate or re-fire. The revisited step's own gates still apply to that tap. See D-6. |
| **R-11** | **N/A steps are not navigable** from the rail. They show their N/A state and nothing else. |
| **R-12** | **AUTOBOOK governs starting a timer while another is running**, and completing a WO while its timer runs. Same three behaviors and messages as the shipping product: `AUTO` books and continues, `PROMPT` asks Yes/No/Cancel, `ERROR` refuses. This applies to every timer start: the Start Timer action, manual start, and Free Form's Start Work prompt. |
| **R-13** | **The run reaching its end** (last node, or a fork's End) **with this WO-Activity's timer running** follows AUTOBOOK's completion branch. Under `ERROR` the run can't end until the timer is stopped. |
| **R-14** | **Navigation never touches the timer.** Back, Home, another WO, backgrounding, a kill, logout: the timer stays as it was. Only Pause, Stop, Stop Timer, Reset, AUTOBOOK and run completion change it. *(Reverses §14.7.1's "Pause & Leave". See D-3.)* |
| **R-15** | **The timer is time-stamped, not counted.** Elapsed time is derived from the start record's start moment and the pause segments, using server-corrected device time. It is never an in-memory counter. |
| **R-16** | **Elapsed time under 1 minute at a stop** discards the start record (Reset semantics) with a toast. It never raises the shipping "Hours Worked cannot be zero" error, because a System-mode Stop Timer must not block a flow. |
| **R-17** | **A timer older than 24 hours** cannot book automatically. The pull-up opens in User mode regardless of the action's mode, with Hours required, matching shipping Activities §8.13's >24h error. |
| **R-18** | **Crossing midnight with `WOBKMIDN = NO`** books two rows, split at midnight. With `YES`, it books one row with "Next Day" (Book Labor §8.9). See D-14. |
| **R-19** | **Booking pre-validates on the device** with BOOKDATE and the overlap rule (Book Labor §8.10, §9.15). A violation opens the pull-up in User mode with the reason shown, so the outbox never receives a booking base will reject. |
| **R-20** | **Timer unavailable** — hired labor / deferred maintenance activity, or the technician's employee record isn't on the device (shipping Activities §8.15/§8.16). Start Timer and Stop Timer become no-ops with a one-time notice. A Book Labor step still works by hand. |
| **R-21** | **A run continues on its stamped config version.** Tier 0 must **retain** every workflow version a live run is stamped with, even after the admin edits, unassigns or deletes it. New runs resolve fresh. |
| **R-22** | **Gates are checked at Next.** Deleting the gated comment or document after the step is complete is allowed, with a warning that names the step. It doesn't un-complete the step. |
| **R-23** | **Run state is durable** in the local store, not `sessionStorage`. It includes the current step's uncommitted field edits, so a kill loses nothing (§2.1's one write path). |

---

## 5. Run state and Resume

### What a run persists

| Item | Notes |
| --- | --- |
| Run key | `(technician, WO, Activity)`, R-01 |
| Workflow id + **config version stamp** | R-21 |
| **Cursor** | nid of the current step, **or** of a held action (R-06). The frontier is the furthest node reached |
| Per-node state | not reached / current / complete / N/A / skipped (actions), with timestamps |
| Fork log | nid → branch taken, plus the evaluated value for a condition fork (auditability, §29.4 reason 2) |
| Action log | nid → fired at, outcome (status written / not authorized / no-op; timer started / declined; booking id) |
| Pending prompt | a User-mode pull-up that was open when the app was interrupted. It is re-presented on return |
| Current-step draft | uncommitted field edits, R-23 |

### The technician's timer (one, R-04)

| Item | Notes |
| --- | --- |
| WO-Activity it runs on | |
| Start moment | The start record. With `MOBSTST = SYNC` it's queued to base immediately (shipping §8.11), which is what makes it survive a device swap |
| Segments | Only under D-2 option B. Option A needs none |
| Server time offset | Captured at sync, for R-15 |

### Resume

- **Home shows a Resume card** whenever the technician has an in-progress run. It's
  system-delivered, positioned and toggled by the Home layout the same way `showFavorites` is
  (§30.16). It isn't an authored tile, because it's the technician's own state, like Favorites. Home's
  content is still unlocked, so this proposes only the **mechanics**.
- **Which run the card shows:** the one with the running timer, else the most recently active.
  **"+N more in progress"** opens a list of the others. That list is a **local query over run state**,
  not a dataspy, so it works offline.
- **Resume lands on the cursor.** A pending prompt is re-presented on arrival. A held action lands
  on the step before it, with the prompt re-presented.
- **Opening an in-progress WO from any list** also lands on the cursor, not on Record View (D-11).
  Record View is step 1, complete, and one rail tap away (§14.10).
- **The card states what changed underneath the run**, without blocking:
  - *closed by someone else*: offer to book any running timer, then dismiss
  - *reassigned*
  - *config updated — finishing on the version you started*
  - *an outbox write failed*: links to Sync Status

---

## 6. Scenario matrix

**Status:** ✅ covered by a locked rule today · ⚠ gap (proposed rule closes it) · ✖ conflict in
today's spec (see §7) · ❓ decision required (see §8).

### 6.1 Composition

| # | Scenario | Expected | Rule | Status |
| --- | --- | --- | --- | --- |
| S-01 | Stop Timer, no Start Timer anywhere | Error on the Stop node; can't be assigned | C-01 | ⚠ |
| S-02 | Start Timer → Question fork; *No* jumps past the Start to a step before Stop | Warning on the Stop: "not started on the *No* route" | C-01 | ⚠ |
| S-03 | Start Timer, no Stop, no Book Labor, ends | Warning; at runtime R-13 books on completion | C-02, R-13 | ⚠ |
| S-04 | Start, Start, Stop | Warning on the 2nd Start | C-03 | ⚠ |
| S-05 | Closing → Stop Timer | Error | C-05 | ⚠ |
| S-06 | Status update (Completed) → Issue Parts | Error | C-06 | ⚠ |
| S-07 | Start Timer placed right after RV1 | Fires on Start Work. **This is how a workflow times from Start Work** | C-10, D-1 | ❓ |
| S-08 | Status update (In Progress) right after RV1 | Fires on Start Work. Replaces §12's Start Work Status | C-10 | ✖ (§14.11 item 1) |
| S-09 | Closing dragged into More | Refused at the drop | C-11 | ⚠ |
| S-10 | Book Labor as step 4 **and** in More | Warning | C-12 | ✖ (§29.2 vs §14.8) |
| S-11 | Workflow with no Status update, no Closing | Warning | C-09 | ⚠ |
| S-12 | Fork → End skips Closing | Warning on that branch | C-20 | ⚠ |
| S-13 | Status update to a status group X can't reach by hand | No warning. A System action bypasses group authorization (D-15); the editor's Info says so | C-08 | ⚠ (backend dependency) |
| S-14 | Fork reordered so a target is behind it | Cleared, toasted (existing) | §29.4 | ✅ |
| S-15 | Condition fork's source step deleted | **Error on the node** (today: silently cleared) | C-16 | ⚠ |
| S-16 | Switch a timed, status-driven workflow to Free Form | Confirm lists the actions that will go, plus the Info on manual status and timer | C-19 | ⚠ (the confirm lists forks, not actions) |
| S-17 | ~~Hidden (Visible = N) Required step~~ | Can't occur: column removed | D-16 | ✅ |
| S-18 | Required UDS step for a group without tab permission | Error | C-14 | ✅ rule, ⚠ not ported to portal |

### 6.2 Execution: the flow itself

| # | Scenario | Expected | Rule | Status |
| --- | --- | --- | --- | --- |
| S-20 | Start Work, with Status update + Start Timer after RV1 | Both fire in order; cursor moves to step 2 | R-02, R-03 | ⚠ |
| S-21 | User-mode Status update after Checklist → technician cancels | Holds on Checklist. Next re-prompts; earlier actions in that chain don't re-fire | R-03, R-06 | ✅ hold / ⚠ no re-fire |
| S-22 | System Status update to a status this group can't set by hand | Written anyway (bypass); base must accept a workflow-originated write | R-07 | ⚠ (D-15 decided; backend dependency) |
| S-23 | Status update offline, rejected by base at sync | Run is not rolled back; trouble-field (§4.4) links to the WO; Resume card flags it | §5 | ⚠ |
| S-24 | User-mode Status update: technician picks **Closed** with Required steps left | Refused with the step names | R-09 | ❓ D-7 |
| S-25 | Closing → technician picks **On Hold** | Not completing. Run stays at Closing; WO stays in Resume | R-09 | ⚠ |
| S-26 | Question fork answered, technician goes back to the step before it and changes data | Edit in place; route unchanged; bar says "Back to <frontier>" | R-08, R-10 | ❓ D-6 |
| S-27 | Condition field edited on a reopened step | Same as S-26. The pinned value stays in the fork log | R-08, R-10 | ❓ D-6 |
| S-28 | Technician taps an N/A step in the rail | Nothing opens; it states why it was skipped | R-11 | ⚠ |
| S-29 | Gated comment deleted from More after the step completed | Allowed; warning names the step; step stays complete | R-22 | ⚠ |
| S-30 | Opens Closing from More before the checklist | Impossible: C-11 | C-11 | ⚠ |
| S-31 | Fork routes End with Closing unreached | Run ends; remaining steps N/A; running timer → R-13 | R-08, R-13 | ⚠ |
| S-32 | WO with 2 activities: Start Work on activity 10, later on 20 | Two runs, R-01. Starting 20's timer triggers AUTOBOOK against 10 | R-01, R-12 | ❓ D-4 |
| S-33 | Start Work on an un-hydrated WO while offline | Blocked-visible (§2.9) | §2.9 | ✅ |

### 6.3 Execution: the timer

| # | Scenario | Expected | Rule | Status |
| --- | --- | --- | --- | --- |
| S-40 | Timer running on WO A; technician starts work on WO B whose flow has a Start Timer | AUTOBOOK: AUTO books A then starts B; PROMPT asks; ERROR refuses (B's Start Timer is then a no-op and the flow continues) | R-04, R-12 | ⚠ |
| S-41 | Stop Timer reached but the running timer is WO A's (we're on B) | No-op for B; A untouched | R-05 | ✖ (§30.21 wording) |
| S-42 | Back to WO List mid-step with timer running | No prompt; timer keeps running; pill visible app-wide | R-14 | ✖ (§14.7.1) |
| S-43 | Rail Stop → "No" | **Removed.** Stop always books (pull-up) or is a Reset. "Stopped but unbooked" no longer exists | R-05 | ✖ (§14.9 vs §18.2) |
| S-44 | Pause for lunch, resume | Per D-2 | — | ❓ D-2 |
| S-45 | Stop at 40 seconds | Start discarded with a toast; flow continues | R-16 | ⚠ |
| S-46 | Timer left running overnight (>24h) | Pull-up forced to User mode, Hours required | R-17 | ⚠ |
| S-47 | Timer crosses midnight, WOBKMIDN = NO | Two bookings split at midnight | R-18 | ❓ D-14 |
| S-48 | Booking would breach BOOKDATE (e.g., WO completed in base meanwhile) | Pull-up in User mode with the reason | R-19 | ⚠ |
| S-49 | Hired-labor activity / employee not on device | Timer actions no-op with a notice | R-20 | ⚠ |
| S-50 | Same user started the same activity in base and on mobile | Shipping conflict error (Activities §8.15) on the next Start/Stop | R-12 | ✅ (shipping) |
| S-51 | User-mode Stop Timer pull-up → Discard | Timer keeps running (locked); action logged as declined; flow continues | §30.21 | ✅ |
| S-52 | Device clock changed while timer runs | Server-corrected elapsed time; negative elapsed refused | R-15 | ⚠ |

### 6.4 Persistence and Resume

| # | Scenario | Expected | Rule | Status |
| --- | --- | --- | --- | --- |
| S-60 | App killed mid-Checklist, relaunched | Home → Resume → Checklist, same item, timer correct, nothing lost | R-23, §5 | ⚠ |
| S-61 | App killed with a User-mode pull-up open | Resume re-presents the pull-up | §5 | ⚠ |
| S-62 | Two WOs in progress, timer on one | Resume shows the timed one, "+1 more" | §5 | ⚠ |
| S-63 | Admin edits the workflow mid-run | Run finishes on its stamped version; new runs get the edit | R-21 | ⚠ (§20 open) |
| S-64 | Admin unassigns the workflow from the group mid-run | Same as S-63 | R-21 | ⚠ (§30.18 open) |
| S-65 | WO closed in base while the technician is mid-run | Next sync: Resume card says closed; offers to book the timer (R-19 caps it at Date Completed); run ends | §5 | ⚠ |
| S-66 | WO reassigned in base mid-run | Local pin survives (§2.6); card notes it; writes may be rejected; timer bookable | §5 | ❓ |
| S-67 | WO Type changed **in base** after Start Work | Run continues on stamped config; card notes the mismatch | R-21 | ⚠ |
| S-68 | Technician switches offline profile at login (§2.10.1) | Never evicts a WO with a live run | §2.10.1 | ✅ (rule), ⚠ (not built) |
| S-69 | Logout with timer running | Warns, doesn't stop; start record is server-side | R-14 | ⚠ |
| S-70 | Same technician, second device | Timer visible from the synced start record. Run state per D-5 | D-5 | ❓ |
| S-71 | Two technicians on one WO | Separate runs; shared WO data; each gate evaluates WO data; the first to close ends the other's run at sync (S-65) | R-01 | ⚠ |
| S-72 | Opening an in-progress WO from WO List | Lands on cursor | §5 | ❓ D-11 |
| S-73 | Free Form WO in progress | Resume lands on the last tab opened; no cursor semantics | §5 | ⚠ |
| S-74 | MEC child opened from the Equipment tab | Shown inside the parent's run; no Start Work, no run of its own; Resume shows the parent | R-01 | ⚠ (D-13 decided; prototype opens the child as its own flow) |
| S-75 | Technician says No to "Start the timer?" | No timer in the step rail; Start timer available from the header ellipsis | D-17 | ⚠ |

---

## 7. Conflicts in today's spec

| # | Where | Conflict | Proposed resolution |
| --- | --- | --- | --- |
| K-1 | §14.11 item 1, §15.4 (last para), §12 tier 1 | Start Work sets the header's *Start Work Status*, which §30.11 deleted | Actions placed directly after RV1 fire on Start Work (C-10) |
| K-2 | §15.4 "WO timer is not implicit on Free Form", §18.2 "Start button starts the WO timer" | Implicit start vs. the placed Start Timer action | D-1 |
| K-3 | §11 "A workflow cannot reuse the same step type more than once" | Superseded by §29.2 instances; never edited | Strike |
| K-4 | §14.7.1 "Pause & Leave" | Contradicts the timer as technician state and the shipping behavior | R-14 / D-3 |
| K-5 | §14.9 Stop → No "time is captured and can be booked later" | §18.2: "the timer stops when the time is booked — the only place" | Remove the No branch (S-43) |
| K-6 | §19.7.1 PM's "Complete Work Order" on Book Labor | Superseded by §30.21's placed User-selected Status update | Relocate §19.7.1 to §21 |
| K-7 | §29.2 "a More entry pointing at the same tab is a different instance… nothing routes a technician into a gated step early" | Reopens §14.8 rule 1's work-bypass | C-11, C-12 |
| K-8 | §12 tier 2 `Visible`, §30.1 instance fields | Undefined for a flow instance | **Closed by D-16:** remove the column |
| K-9 | §14.9 timer panel "Activity Checklist and Issue Parts only" | The timer must be visible wherever it runs | App-level timer pill (closes §20 row 44 part 1) |
| K-10 | §30.21 "No timer running → nothing happens" | Predates one timer per technician | Read as "no timer running **on this WO-Activity**" (R-05) |
| K-11 | Prototype: `startStepTimer()` counts from 0 per page; `eamTimerRunning` in `sessionStorage` | Can't support Resume | R-15, R-23 (implementation, not spec) |

---

## 8. Decisions required

### Outcomes — reviewed 2026-10-23

| Decision | Outcome |
| --- | --- |
| D-1 – D-12, D-14 | **Accepted as recommended.** |
| **D-15** | **Overruled → System-mode Status updates BYPASS status authorizations** (user direction: the transition is workflow-configured, so the administrator has already authorized it). A System action writes its authored status whatever the technician's group may do by hand. **User-selected mode is unchanged**: its list still resolves from the group's authorizations (§30.21, locked). Base's own system-status lifecycle still applies, since a bypass of *user-group authorization* is not a bypass of what a WO in that system status can become. ⚠ **Backend dependency:** base must accept this write. The outbox envelope has to carry the workflow id, the stamped version and the node, and the server has to verify that the transition is one that workflow version actually authors. Otherwise this is an authorization hole that any client could use. Without that, the write fails at sync (S-23). It joins §20's write-gate row. |
| **D-16** | **Re-asked → Remove `Visible` from workflow node rows.** Neither the portal nor the app implements it, and "not in the flow" already means not shown. The hidden-but-Required dead end goes with it: C-13, S-17 and ADMN 8.13 are deleted, K-8 is closed, and §12 tier 2 / §30.1 lose the column. |
| **D-13** | **Overruled → (b) run on the parent only.** A Multiple Equipment child never has its own run, cursor or Resume entry. Children are worked inside the parent's run, and the timer runs and books on the parent WO-Activity under the shipping MEC parent booking rules (Book Labor §9.9–§9.13). Start Work isn't offered on a child. **Prototype consequence:** today a child opens "as itself" through all five steps via `applyDemoWoIdentity()` (§16.10). Under this decision the child's identity is shown inside the parent's run, not as a run of its own, and that needs a pass when the run model is built. |
| **D-17** *(new, user direction)* | **A declined timer doesn't appear in the step rail.** When the technician is asked to start the timer and says No (Free Form's Start Work question, a User-selected Start Timer, or an AUTOBOOK prompt that leaves this timer unstarted), the rail shows **no timer**. That means no 00:00 pill, no grayed pill, and no expanded timer panel. The rail shows a timer only while one is **running or paused on this WO-Activity**. This matches §15.4's existing "the pill is hidden entirely" for a Free Form No, and extends it to every prompt. **Consequence:** manual Start can't live on the rail's timer pill when no timer is shown, so it moves to the header ellipsis as a **Start timer** header action (§8.4: not row-scoped, so it's a header action). A later Start Timer action in the same run still asks again, since each action is independent. |

Each row below kept its original recommendation. The drafts now reflect the outcomes above.

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| **D-1** | How does a configured workflow start its timer? | (a) **Placed actions only**: Start Work never starts a timer implicitly; (b) implicit at Start Work, and the Start Timer action is for later restarts; (c) a workflow-header property | **(a).** One mechanism. "Time from Start Work" = a Start Timer right after RV1. Free Form and the §11 fallback keep §15.4's prompt. A **manual** Start/Stop is always available to the technician, as in the shipping product. |
| **D-2** | What is Pause? | (a) **Pause = Stop + book this segment; Resume = a new start record**; (b) device-local hold, booked as direct hours; (c) no Pause | **(a).** Every booking stays a true span, base never shows a running clock during a break, and it survives a device swap. Cost: several labor rows per WO per day. (b) contradicts the synced start record. |
| **D-3** | Does navigation affect the timer? | (a) **Never**; (b) pause on leaving the WO (today) | **(a).** "Leaving the screen is not leaving the job." Matches shipping. |
| **D-4** | Concurrent runs | (a) **Many in-progress runs, one timer**; (b) one in-progress run per technician | **(a).** Technicians get pulled off a PM onto a breakdown. AUTOBOOK handles the timer. |
| **D-5** | Where run state lives | (a) **Device-local v1, with a derivation fallback** (no run state for a started WO → cursor = first incomplete Required step; forks re-asked); (b) a new server-side run table | **(a)** now, (b) as a Phase 2 backend ask. Flag it on the design doc's backend list. |
| **D-6** | Where Next goes after a revisit | (a) **Back to the frontier; nothing re-fires**; (b) re-traverse forward, re-evaluating forks | **(a).** Matches §30.19's "evaluate at one moment". (b) can strand data on an abandoned branch (§13.3 item 4). |
| **D-7** | Completing status chosen with Required steps left | (a) **Refuse while Required remain**; (b) allow, remaining steps N/A; (c) filter completing codes out of the list | **(a).** Required means required. (c) would make the device a fifth place a status list lives (§30.21). |
| **D-8** | Closing in More | (a) **Never**; (b) allowed with a warning | **(a).** |
| **D-9** | Stop-without-Start severity | (a) **Error if no path has a Start, Warning if some don't**; (b) always Warning | **(a).** You asked for a restriction, and the partial case is legitimately a warning. |
| **D-10** | Resume on Home | (a) **System-delivered card, toggled by the layout like Favorites**; (b) an authorable tile; (c) a bottom-nav slot | **(a).** It's per-technician state, which is the Favorites precedent. |
| **D-11** | Opening an in-progress WO from a list | (a) **Land on the cursor**; (b) land on Record View | **(a)**, consistent with Resume. RV is one tap back. |
| **D-12** | Undoing Start Work | (a) **No undo in v1**: it's the commitment boundary; the timer can still be Reset; (b) an "Abandon run" action | **(a).** Revisit if UXR shows mis-starts. |
| **D-13** | MEC child runs | (a) **Run on the child WO, workflow resolved from the parent**; (b) run on the parent only | **(a)**, matching how the child already opens as itself. Needs a check against the shipping "All Equipment" booking split. |
| **D-14** | Midnight with WOBKMIDN = NO | (a) **Split at midnight**; (b) refuse, User mode | **(a).** Both halves are true spans. |
| **D-15** | System status write refused by authorization | (a) **Continue with a notice**; (b) hold | **(a).** Hold is a dead end the technician can't fix (§30.21's own dead-end reasoning). |
| **D-16** | What `Visible = N` means on a flow instance | (a) **Excluded from the run entirely** (not N/A, never numbered); (b) remove the column for flow instances | **(b)** if nothing needs it; otherwise (a). Needs one look at why tier 2 carries it. |

---

## 9. Alignment with the shipping product

The shipping product already enforces most of the timer behavior below, and the new design should inherit it rather than reinvent it.

| Shipping parameter / rule | Source | Where it lands here |
| --- | --- | --- |
| **AUTOBOOK** AUTO / PROMPT / ERROR, on starting another activity **or completing the WO** | Activities §8.12 | R-04, R-12, R-13 |
| **MOBSTST = SYNC**: start record synced to base | Activities §8.11 | §5 timer; survives device swap |
| Clock ticks "from the start moment defined in the start record" | Activities §8.9 | R-15 |
| < 1 minute → "Hours Worked cannot be zero" | Activities §8.12.4 | R-16 (softened to a discard) |
| > 24 hours → error | Activities §8.13 | R-17 |
| Start/Stop conflict (started in base and on mobile) | Activities §8.15 | S-50 |
| Employee not on device | Activities §8.16 | R-20 |
| Hired labor / deferred maintenance hides Start/Stop | WorkOrders §8.15, Activities §8.17 | R-20 |
| Clock keeps running while the booking panel is open; Cancel loses nothing | Activities §8.8 | Already §30.21 "Discard never stops the timer" ✅ |
| **WOBKMIDN** midnight | Book Labor §8.8/§8.9 | R-18 |
| **BOOKDATE** date-worked bounds | Book Labor §8.10, §9.2 | R-19, C-05 |
| Overlap of actual labor entries refused | Book Labor §9.15 | R-19. Two technicians' timers never overlap themselves; one technician's two WOs can't overlap, which **one timer per technician guarantees** |
| Mixed Start/End vs. Hours format, same employee/day | Book Labor §9.8/§9.16 | ⚠ **New risk:** §18.2 books an *adjusted* booking as direct hours. A later true-span booking the same day then fails this check. Recommend adjusted bookings keep a span (end = start + adjusted hours) rather than switching format. Same row as §20's "write shape" item |
| "User attempts to close WO with timer still running" | WorkOrders §9.7 → CloseWorkOrder UC (not in this folder) | R-13. **Read that UC before locking R-13** |
