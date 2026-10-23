# EAM.MOBILE.SCOPE.WorkflowExecution

*Preliminary draft for review. Markdown stand-in for the Word document, mirroring the
section structure of `EAM.ADMN.SCOPE.EmailNotificationProcess.docx`. Rule IDs (R-nn),
scenario IDs (S-nn) and decision IDs (D-nn) refer to `workflow-review-and-scenarios.md`.*

## CHANGE HISTORY

| Rev. | Date | Author | Change Reference |
| --- | --- | --- | --- |
| 1 | 23-Oct-2026 | Danny Kilburn | Preliminary draft — workflow execution, timer and Resume |

## APPROVAL

| Rev. | Date | Reviewed By | Title |
| --- | --- | --- | --- |
| | | | Peer Reviewer |

---

## 1.0 Brief Description

When a technician starts work on a work order, the mobile app resolves the workflow assigned
to their user group for that work order's WO Type (see EAM.ADMN.SCOPE.WorkflowComposition)
and guides them through it. The workflow is made of:
- **steps**, which are screens
- **actions** (Status update, Start Timer, Stop Timer), which the app performs between steps
- **forks**, which route the technician forward

This use case defines how the app executes that workflow. It covers:
- how the technician moves through it, forward and back
- how the technician's **timer** behaves across steps, screens, work orders and sessions
- how a workflow in progress is **persisted** and **resumed**, including from the Home screen's
  Resume card

## 2.0 Expected End User

Tradesman / Technician

## 3.0 Exceptions to Standard Model

- Forward movement through a Not Free Form workflow is gated. A step past the current position
  is locked (§14.10).
- The technician has **one** timer across all work orders (see Supplemental Requirements,
  Technician Timer).

## 4.0 Entry Points

- User selects Start Work on a work order's Record View.
- User selects Resume on the Home screen.
- User opens a work order that has a workflow run in progress, from any list, search result or
  notification.

## 5.0 Oracle Forms Functionality

This use case does not contain functionality from Oracle Forms.

## 6.0 Basic Flow Assumptions

- Device is in connected mode.
- A Not Free Form workflow is assigned to the user's group for the work order's WO Type. Its
  nodes, in order: Record View, Status update (In Progress, System action), Start Timer (System
  action), Activity Checklist, Issue Parts, Stop Timer (System action), WO Closing.
- The work order has exactly one activity. That activity is not Hired Labor or Deferred
  Maintenance.
- The employee record of the logged-in user is on the device.
- The user has no timer running on any work order.
- Install parameter MOBSTST is 'SYNC'. Install parameter AUTOBOOK is 'PROMPT'.
- Organization option WOBKMIDN is 'YES'. Install parameter BOOKDATE is 'NO'.
- The work order is not a Multiple Equipment parent or child.

## 7.0 Basic Flow

1. User opens a work order whose status is Released and whose workflow has not been started.
   The system displays Record View as step 1 with Start Work in the bottom bar.
2. Because the work order has one activity, the system selects it and makes Start Work
   available.
3. User selects Start Work. The system:
   1. Creates a **workflow run** for the user, the work order and the selected activity (see
      Supplemental Requirements, Workflow Run).
   2. Protects WO Type, pins the work order to the user, hydrates its child records, and stamps
      the run with the workflow's configuration version (§14.11).
   3. Executes the actions that follow Record View, in order (see Supplemental Requirements,
      Action Execution):
      1. Status update: sets the work order status to In Progress.
      2. Start Timer: records a start record for the user on this work order activity, at the
         moment Start Work was selected, and queues it for synchronization. The timer appears
         in the step rail, and a timer indicator shows in the app header on every other screen
         while it runs (see Supplemental Requirements, Technician Timer).
   4. Displays Activity Checklist as the current step. Record View is shown as complete in the
      step rail.
4. User responds to the checklist items. When every required item has a response, the system
   makes Next available.
5. User selects Next. The system marks Activity Checklist complete and displays Issue Parts.
6. User issues parts and selects Next. The system:
   1. Marks Issue Parts complete.
   2. Executes Stop Timer: stops the timer and books the elapsed time as a labor record for the
      user on this work order activity. The fields are derived as listed in Supplemental
      Requirements, Derived Booking.
   3. Displays a toast: "Booked <hours> hours to <WO> / <activity>."
   4. Displays WO Closing.
7. User enters closing comments, selects a completing status, and selects Close Work Order. The
   system completes the work order (§19.7). It then marks the workflow run complete and removes
   it from the Home screen's Resume card.

## 8.0 Alternate Flows

### 8.1 No Workflow Is Configured, or the Workflow Is Free Form

If no workflow is assigned for the work order's WO Type, the system uses the group's fallback
workflow or the delivered default (§30.26). If the resolved workflow is Free Form, the system
displays an unordered, ungated step rail (§11). It performs no actions, since Free Form has none.

When the user selects Start Work, the system asks first:

Question message: "Start the timer for this work order?"
- **Yes:** the system starts the timer as described for Start Timer in Basic Flow step 3.
- **No:** the system continues without a timer. **No timer appears in the step rail**: no
  00:00 pill, no grayed pill, no timer panel (see 8.41).

The user sets status with the editable status control (§15.4). They start and stop the timer by
hand (see 8.15). The run's current position is the last tab the user opened.

### 8.2 Work Order Has More Than One Activity

If the work order has more than one activity, the system keeps Start Work unavailable until the
user selects one (§14.7). The workflow run is created for the selected activity only.

If the user later starts work on another activity of the same work order, the system creates a
second, separate workflow run. If a timer is running on the first activity at that point, see 8.7.

### 8.3 Status Update Is User Selected

If the next action is a Status update in User selected mode, the system opens the status
pull-up:
- The current status is shown, protected.
- The new status is chosen from the statuses the user's group is authorized to move to from the
  current status.

**User selects a status and confirms.** The system sets the status and continues with the next
node.

**User cancels.** The system sets nothing and keeps the user on the step they were on. Actions
already performed earlier in the same sequence are **not** performed again. When the user
selects Next again, the system resumes at this Status update.

**The authorized list is empty.** The system shows the pull-up with no options and this message:

Message: "You're not authorized to change the status from <current status>. Contact your
supervisor."

Cancel is the only option, so the user is never stuck.

If the selected status is a completing status (Completed or Closed system status), see 8.26.

### 8.4 Status Update Is a System Action

If the next action is a Status update in System action mode, the system sets the authored
status **without checking the user's group status authorizations**. The transition was
configured on the workflow, and that configuration is the authorization. The status change is
queued with the workflow, its stamped version and the node, so that base can verify the
transition against that workflow version.

The same applies when the user's status authorizations are not on the device (Tier 0
incomplete).

If base's own system-status rules don't allow the change (for example, the work order is
already Closed), the system does not change the status, displays a non-blocking notice, and
continues with the next node.

Toast: "Status was not changed to <status>: the work order is <current status>."

The system records the outcome in the run's action log.

### 8.5 Start Timer Is User Selected

If the next action is a Start Timer in User selected mode, the system asks:

Question message: "Start the timer for <WO> / <activity>?"
- **Yes:** the system starts the timer and continues.
- **No:** the system does not start the timer and **continues** with the next node. No timer
  appears in the step rail (8.41). (Declining a timer does not hold the workflow. Canceling a
  status update does. §30.21.)

A later Start Timer action in the same run asks again.

### 8.6 Stop Timer Is User Selected

If the next action is a Stop Timer in User selected mode and a timer is running on this work
order activity, the system opens the booking pull-up:
- Hours Worked is shown with the elapsed time and can be adjusted with the stepper, down to a
  minimum of one minute and with no maximum.
- Every other field is protected.

**User confirms.** The system books the labor record, stops the timer, and continues.

**User discards.** The system does **not** stop the timer, books nothing, and continues. The
timer pill keeps running.

### 8.7 Another Timer Is Running When a Timer Is Started

If the user starts a timer on this work order activity while their timer is running on a
**different** work order activity, the system behaves according to install parameter AUTOBOOK.
The start can come from a Start Timer action (in either mode), from Free Form's Start Work
question, or from a manual start.

#### 8.7.1 And AUTOBOOK = AUTO

The system books the running timer to its work order activity, stops it, and starts the timer
on this work order activity.

Success message: "System booked <hours> hours for <employee> on Work Order <WO> Activity
<activity>."

#### 8.7.2 And AUTOBOOK = PROMPT

Question message: "Work is currently in progress on Work Order <WO> Activity <activity>. Do you
want the system to automatically book <hours> hours?"
- **Yes:** as 8.7.1, without the success message.
- **No:** the system discards the other start record and starts the timer here. If that start
  record is not synchronized yet, it is deleted. Otherwise a stop transaction is recorded at
  its own start moment (Activities for Work Order §8.12.2).
- **Cancel:** the system does nothing. The other timer keeps running and this timer is not
  started, so no timer appears in this work order's step rail (8.41). If the start came from an
  action, the workflow continues; declining a timer does not hold it.

#### 8.7.3 And AUTOBOOK = ERROR

Click Triggered Error: "Work is currently in progress on Work Order <WO> Activity <activity>.
You must stop this activity before starting a new one."

The other timer keeps running and this timer is not started, so no timer appears in this work
order's step rail (8.41). If the start came from an action, the workflow continues.

### 8.8 No Timer Is Running on This Work Order Activity at Stop Timer

If the next action is a Stop Timer and no timer is running on **this** work order activity, the
system does nothing and continues. That covers no timer at all, and a timer running on a
different work order. A timer running elsewhere is not affected.

### 8.9 Less Than One Minute Elapsed at a Stop

If a timer is stopped with less than one minute elapsed (by Stop Timer, manually, or through
8.7), the system discards the start record instead of booking.

Toast: "Less than a minute was timed, so nothing was booked."

The workflow is not held.

### 8.10 More Than 24 Hours Elapsed at a Stop

If a timer is stopped with more than 24 hours elapsed, the system always opens the booking
pull-up, even when the Stop Timer is a System action. Hours Worked is cleared and required.

Message: "This timer has been running since <date time>. Enter the hours you actually worked."

### 8.11 Timer Crosses Midnight

#### 8.11.1 And WOBKMIDN = 'NO'

The system books two labor records, split at midnight: start time to 23:59, and 00:00 to stop
time, each with its own Date Worked.

#### 8.11.2 And WOBKMIDN = 'YES'

The system books one labor record with End Time "<end time> Next Day" (Book Labor for Work
Order §8.9).

### 8.12 Booking Fails a Device-Side Check

Before booking from a timer, the system applies the same checks as manual booking. These are:
- BOOKDATE: Date Worked is not before Date Reported, not after Date Completed, and not after
  today.
- No overlap with the employee's other actual labor entries.
- The Start/End vs Hours Worked format rule.

If a check fails, the system opens the booking pull-up with the reason shown, regardless of
the action's mode, so that a booking base would reject is never queued.

Message: "<check message from Book Labor for Work Order>. Adjust the hours to book."

### 8.13 Timer Is Unavailable for This Activity

If the activity is Hired Labor or Deferred Maintenance, or the user's employee record is not on
the device, the timer cannot run on this activity (Activities for Work Order §8.16; Work Orders
§8.15). Start Timer and Stop Timer actions do nothing.

The first time this happens in a run, the system displays:

Toast: "The timer isn't available for this activity. Book labor from Book Labor."

### 8.14 User Pauses the Timer

If the user selects Pause on the timer, the system books the elapsed segment as a labor record
(subject to 8.9–8.12) and holds the timer in a **paused** state on this work order activity.

When the user selects Resume on the timer, the system records a new start record at that moment.

While paused:
- The step rail shows the timer in its paused state, with the total booked across segments
  today.
- A paused timer counts as **not running** for 8.7, 8.8 and the Book Labor booking pull-up.

### 8.15 User Starts or Stops the Timer by Hand

**Start.** When no timer is running or paused on this work order activity, the record's header
ellipsis offers **Start timer**. It is a header action, not a control on the step rail, because
the rail shows no timer in this state (8.41). Selecting it behaves as 8.5 Yes, including 8.7.
If the timer is unavailable for the activity (8.13), the option is hidden.

**Stop and Reset.** While a timer is running or paused on this work order activity, the step
rail's timer panel offers:
- **Stop**, which opens the booking pull-up as in 8.6.
- **Reset**, see 8.16.

There is no "stop without booking". A timer is either booked or reset.

### 8.16 User Resets the Timer

If the user selects Reset, the system asks:

Question message: "Discard the time on this timer? Nothing will be booked."

**Yes.** The system discards the start record. If it is not synchronized yet it is deleted;
otherwise a stop transaction is recorded at its own start moment (Activities for Work Order
§8.14).

### 8.17 Next Node Is a Question Fork

If the next node is a question fork, the system replaces the bottom bar with the prompt bar
(§14.6), showing the question and both answers in the user's language. If the user's language
has no translation, the system falls back to the base language.

When the user selects an answer, the system:
- Records the answer in the run (it is not asked again in this run).
- Marks every step between the fork and the answer's target as Not Applicable.
- Skips every action in that range without performing it.
- Moves to the target step. If the target is End, see 8.19.

### 8.18 Next Node Is a Condition Fork

If the next node is a condition fork, the system evaluates the fork's field on the step the
user is leaving, at the moment Next is selected. It records the value and the result in the run.
- **True or False:** the system routes to that branch's target as in 8.17.
- **Field empty:** the system continues in sequence. An empty field is neither true nor false.

The fork is not re-evaluated later in this run, even if the field changes.

### 8.19 Workflow Reaches End

If the workflow reaches its last node, or a fork answer targets End:
- The system marks every remaining step Not Applicable and marks the run complete.
- If a timer is running on this work order activity, see 8.28.
- If no completing status was set during the run, the work order keeps its current status.

### 8.20 User Selects a Completed Step in the Step Rail

The system opens that step for editing (§14.10). The bottom bar shows **"Back to <current
step>"** instead of Next. The step's own gates still apply to that button.

When the user selects it, the system returns to the run's current step. The system does **not**:
- re-evaluate any fork between the two steps
- perform any action between them again
- change any step's Not Applicable state

The user can also leave through the step rail. The step's gates are not checked then, since
they were met when it was completed.

### 8.21 User Selects a Not Applicable Step

The system does not open the step.

Toast: "Skipped by '<answer>' at '<fork question>'."

### 8.22 User Selects a Locked Step

The system does not open the step (§14.10).

Toast: "Locked: finish <current step> first."

### 8.23 User Opens a More Entry

The system opens the tab. The step rail marks it active in the More group. Any step's bottom bar
returns the user to the run's current step.

If the entry is Book Labor and a timer is running on this work order activity, the system opens
the booking pull-up (§18.2). Discard leaves the timer running.

### 8.24 Step Gate Is Not Met

If the current step requires a comment or a document and none has been added, the system keeps
Next locked.

Bar label: "Comment required" / "Document required."

The comment or document added to meet the gate goes to the work order's Comments or Documents
(§29.3). One added offline counts immediately.

### 8.25 User Deletes the Comment or Document That Met a Gate

If the user deletes a comment or document that met a completed step's gate, the system asks:

Question message: "<Step> requires a comment. Delete it anyway?"

**Yes.** The system deletes it. The step stays complete.

### 8.26 User Selects a Completing Status Mid-Workflow

If the user selects a completing status while steps remain ahead in the run, from a User
selected Status update or the editable status control on a Free Form workflow:

**8.26.1 And Required steps remain unfinished.** The system refuses the status.

Click Triggered Error: "<Step>, <Step> must be finished before the work order can be
<status>."

**8.26.2 And only optional steps remain.** The system asks:

Question message: "<Step>, <Step> will be marked Not Applicable. Continue?"
- **Yes:** the system sets the status and marks those steps Not Applicable. It then ends the
  run as in 8.19.
- **No:** the system sets nothing.

### 8.27 User Selects a Non-Completing Status at WO Closing

If the user closes with a status that is not completing (for example On Hold), the system:
- sets the status
- keeps WO Closing as the run's current step, without marking the run complete
- keeps the work order on the Home screen's Resume card

### 8.28 Run Ends With a Timer Running on This Work Order Activity

If the run ends while a timer is running on this work order activity, the system behaves
according to AUTOBOOK, as the shipping product does when a work order is completed with its
timer running:
- **AUTO:** books the time, stops the timer, and displays the success message.
- **PROMPT:** asks the 8.7.2 question.
  - **Yes:** books it.
  - **No:** discards the start record.
  - **Cancel:** the run does not end and the user stays on the last step.
- **ERROR:** the run cannot end.

Click Triggered Error: "Work is currently in progress on this activity. You must stop the timer
before completing the work order."

### 8.29 User Leaves the Work Order Mid-Run

If the user leaves the work order by any route (Back, the bottom navigation, a notification,
another work order), the system:
- keeps the run's current step, its current-step edits and any pending prompt
- leaves the timer exactly as it is, with no confirmation
- keeps the timer pill visible in the app header

*(Replaces §14.7.1's "Pause the timer and return to WO Search?")*

### 8.30 App Is Interrupted or Closed Mid-Run

If the app is backgrounded, closed by the user, or ended by the operating system, nothing about
the run or the timer is lost. That covers the current step, uncommitted edits on it, an open
pull-up and the timer.

When the user next opens the app and logs in, the system shows the run on the Home screen's
Resume card. On resume, any pull-up that was open is presented again. The timer shows the
correct elapsed time, calculated from the start record.

### 8.31 User Selects Resume on the Home Screen

The system opens the work order at the run's current step.
- If an action was waiting on the user, the system shows the step before it and presents that
  action's pull-up.
- If the user has more than one run in progress, the Resume card shows the run with the running
  timer, or else the most recently active run, plus "+<n> more in progress".
- Selecting that line opens a list of every run in progress, showing work order, activity,
  current step and timer state. The list is built from the device's own run data and works
  offline.

### 8.32 User Opens a Work Order That Has a Run in Progress

If the user opens a work order with a run in progress from any list, search result or
notification, the system opens it at the run's current step, as in 8.31. Record View is one
step-rail tap away.

### 8.33 Workflow Configuration Changes or Is Unassigned Mid-Run

If, while a run is in progress, the administrator edits the workflow, assigns a different one,
or removes the assignment, the run continues on the configuration version it was stamped with
at Start Work. The device keeps that version for as long as any run uses it. New runs use the
current assignment.

The Resume card shows:

Info: "This workflow was updated. You're finishing on the version you started."

If the work order's WO Type is changed in base after Start Work, the run also continues on its
stamped version, with the same information line.

### 8.34 Work Order Is Completed or Closed by Someone Else

If synchronization shows the work order was completed or closed elsewhere while the user's run
is in progress, the system marks the run ended.
- If the user's timer is running on it, the system opens the booking pull-up with Hours Worked
  limited so the booking does not end after Date Completed (8.12).
- The Resume card shows: "Completed by <user> on <date>." with Dismiss.

### 8.35 Work Order Is Reassigned Mid-Run

If synchronization shows the work order is no longer assigned to the user, the system keeps it
on the device (§2.6: a local pin survives a server list that omits it). It also:
- shows "Reassigned to <user>." on the Resume card
- leaves the run open so the user can book their running timer
- shows any later write that base rejects in Sync Status (§4.5)

*(Open: whether a reassigned run should end immediately once the timer is booked.)*

### 8.36 Queued Workflow Transaction Is Rejected at Sync

If base rejects a status change, start or stop record, or labor booking that the run queued, the
system does not roll the run back. It:
- shows the rejection in Sync Status with Retry and Discard (§4.4.2)
- shows "A change didn't reach EAM." on the Resume card, linking to Sync Status

### 8.37 User Logs Out With a Timer Running

Question message: "Your timer on <WO> / <activity> is still running. It will keep running while
you're logged out. Log out?"

**Yes.** The system logs out. The timer and the run stay as they are, on the device and, for the
start record, in base.

### 8.38 Another Technician Is Working the Same Work Order

Each technician has their own run, and the work order's data is shared.
- A gate or Required check is evaluated against the work order's data, so a checklist completed
  by one technician satisfies the other's checklist step after synchronization.
- If one technician completes the work order, the other's run behaves as in 8.34.

### 8.39 Device Is Offline During the Run

The run proceeds as in the Basic Flow:
- Status changes, start and stop records, labor bookings, comments and documents queue in the
  outbox.
- Forks evaluate on the device.
- A User selected Status update's list comes from the device's Tier 0 status authorizations.
  A System action needs none (8.4).

Start Work on a work order whose child records are not on the device is unavailable offline
(§2.9).

### 8.40 Work Order Is a Multiple Equipment Child

A Multiple Equipment child work order never has a workflow run of its own. The run belongs to
the **parent** work order, and the children are worked inside it.
- If the user opens a child from the parent's Equipment tab, or from a list, the system shows
  the child's record within the parent's run. The step rail, current step and timer are the
  parent's.
- Start Work is not offered on a child.
- The timer runs on the parent work order activity. Its bookings follow the Multiple Equipment
  parent booking rules (Book Labor for Work Order §9.9–§9.13).
- The Resume card and the Runs in Progress list show the parent, never a child.
- If the user opens a child whose parent run has not been started, the system displays:

  Message: "Work on this equipment is done from work order <parent WO>." The message links to
  the parent.

### 8.41 Timer Is Not Started

Whenever a timer has not been started on this work order activity, **no timer appears in the
step rail**. That means no 00:00 pill, no grayed or disabled pill, and no timer panel in the
expanded step map. It covers every way that can happen:
- the user answered No to "Start the timer?" (8.1, 8.5)
- an AUTOBOOK prompt or error left this timer unstarted (8.7.2 Cancel, 8.7.3)
- the workflow has no Start Timer
- the timer is unavailable for the activity (8.13)

The step rail shows a timer only while one is **running or paused on this work order
activity**. To start one by hand, the user selects **Start timer** from the header ellipsis
(8.15).

When the user starts a timer later, the timer appears in the step rail at that moment.

## 9.0 Shared Alternate Flows

The following alternate flows are shared with EAM.MOBILE.REQ.ActivitiesforWorkOrder:
- 9.1 User Clicks Start Icon in 11.6 on another Activity: AUTOBOOK sub-flows. Applied by 8.7
  and 8.28.
- 9.2 Start/Stop Conflicts in 11.6.
- 9.3 User Clicks Start/Stop Icon and Employee Does Not Exist On Device. Applied by 8.13.

The following alternate flows are shared with EAM.MOBILE.REQ.BookLaborforWorkOrder:
- 9.4 Org Option WOBKMIDN is 'NO' / 'YES'. Applied by 8.11.
- 9.5 BOOKDATE install parameter. Applied by 8.12.
- 9.6 User Submits Employee Actual Labor Booking having Start/End Time (overlap). Applied by
  8.12.
- 9.7 Hours Worked and Start/End Bookings for same Employee, WO Activity and Day. Applied by
  8.12.

The following alternate flows are shared with EAM.MOBILE.REQ.WorkOrders:
- 9.8 User Clicks Start Icon and more than one Activity Exist for Selected Record. Applied by
  8.2.
- 9.9 Activity is Checked as Deferred Maintenance or Hired Labor. Applied by 8.13.
- 9.10 User Attempt to Close Work Order with Start/Stop Timer Still Running (in
  EAM.MOBILE.REQ.CloseWorkOrderforWorkOrder). Applied by 8.28. *(Not yet reviewed against this
  draft.)*

## 10.0 Design Decisions

- **One timer per technician.** It belongs to the technician, not to a screen or a work order
  view. That's why navigation never affects it (8.29), and why it matches the shipping
  product's start record and AUTOBOOK behavior.
- **The timer is calculated from a start moment, never counted.** That's how it survives an
  app kill, a device restart, and a second device (via the synchronized start record).
- **A timer is either booked or reset.** "Stopped but not booked" no longer exists. It
  replaces §14.9's "No" branch.
- **Pause books the segment.** Each labor record is then a true start/end span, and base never
  shows a running clock during a break. *(D-2.)*
- **Forks are answered once per run.** Revisiting a completed step edits it in place and returns
  to the current step. Routing never changes behind the technician, and data on a passed step
  is never stranded on an abandoned branch. *(D-6.)*
- **Actions never repeat in a run.** A held sequence resumes at the held action.
- **A System-mode status update bypasses status authorizations.** The administrator configured
  the transition on the workflow, so the workflow is the authorization. A User selected status
  update still offers only the group's authorized statuses (§30.21). Base must verify a
  workflow-originated status change against the stamped workflow version before accepting it.
  *(D-15.)*
- **A timer that hasn't been started doesn't appear in the step rail.** A declined prompt shows
  nothing, not an idle or grayed timer, so the rail never implies time is being captured when it
  isn't. Manual start moves to the header ellipsis. *(D-17.)*
- **A Multiple Equipment child has no run of its own.** It is worked inside the parent's run,
  and the timer and bookings sit on the parent. *(D-13.)*
- **Required steps cannot be bypassed by a completing status.** *(D-7.)*
- **Start Work cannot be undone** in this release. It is the commitment boundary (§14.11). The
  timer can still be reset. *(D-12.)*
- **Resume is system-delivered, like Favorites.** It reflects the technician's own state, so an
  administrator positions or hides it on the Home layout but never authors its content.
  *(D-10.)*

## 11.0 Supplemental Requirements

### 11.1 Workflow Run

A workflow run is identified by **user + work order + activity**. For Multiple Equipment, the
work order is always the parent (8.40). It is created at Start Work
and stored on the device, in durable storage, until it is complete or ended. It holds:

| Item | Description |
| --- | --- |
| Workflow and version | The workflow resolved at Start Work, and the configuration version stamped then |
| Current node | The current step, or an action waiting on the user |
| Node states | Per node: not reached, current, complete, Not Applicable (steps), skipped (actions), with date/time |
| Fork answers | Per fork: the branch taken, and the evaluated value for a condition fork |
| Action outcomes | Per action: performed at, and the result (status set / not allowed by system status / nothing to do; timer started / declined; labor record) |
| Pending prompt | A pull-up that was open when the app was interrupted |
| Current-step edits | Field values entered on the current step and not yet committed |

If a work order has been started but the device has no run for it (for example, after a
reinstall), the system rebuilds one. The current step becomes the first Required step that is
not satisfied by the work order's data, and forks ahead of it are asked again. *(D-5. A
server-side run record is a later backend request.)*

### 11.2 Technician Timer

| Item | Description |
| --- | --- |
| Work order / activity | Where the timer is running or paused |
| Start moment | From the start record, synchronized to base when MOBSTST = 'SYNC' |
| State | Running, Paused, or none |
| Time reference | Device time corrected by the server offset captured at the last synchronization. An elapsed time below zero is refused |

**Where the timer shows:**
- **On the work order it runs on:** in the step rail, collapsed as a pill and expanded as the
  timer panel (Pause/Resume, Stop, Reset). It shows only while the state is Running or Paused
  for this work order activity. Otherwise the rail shows no timer at all (8.41).
- **Everywhere else** (Home, lists, other work orders): a timer indicator in the app header
  while the state is Running or Paused. Selecting it opens the work order the timer belongs to,
  at its run's current step.

### 11.3 Action Execution

When the user selects Next on a step, the system performs each action between that step and
the next step, in order, then displays the next step.
- An action already performed in this run is not performed again.
- A User selected action opens its pull-up and waits.
- A Status update Cancel stops the sequence at that action (8.3). The next Next resumes there.
- Any other decline continues the sequence.
- The actions directly after Record View are performed when the user selects Start Work.

### 11.4 Derived Booking

| Field | Value |
| --- | --- |
| Employee | The logged-in user's employee |
| Trade / Department | From that employee's record |
| Activity | The run's activity |
| Date Worked | The date of the start moment (see 8.11) |
| Start Time / End Time | The start moment and the stop moment. Adjusted hours keep the start time and set End Time = Start Time + Hours Worked |
| Hours Worked | The elapsed time, or the adjusted value |
| Type of Hours | Normal |

### 11.5 Resume Card

| Behavior | Description |
| --- | --- |
| Shown when | The user has at least one run in progress |
| Position | Set on the Home layout, the same way as Favorites |
| Content | WO number and description, activity, current step, timer state and elapsed time; "+<n> more in progress" when applicable |
| Notices | Completed elsewhere, reassigned, workflow updated, change rejected (8.33–8.36) |
| Offline | Available. Built from device data only |

## 12.0 Lookup Definitions

None.

## 13.0 Grid Definitions

### 13.1 Runs in Progress List

| Column | Source |
| --- | --- |
| Work Order | WO number and description |
| Activity | Run activity |
| Current Step | Name of the run's current step |
| Timer | Running / Paused / none, and elapsed time |
| Last Active | Date/time of the run's last change |

Default sort: the timer's run first, then Last Active, newest first.

## 14.0 Additional Information

- Composition counterpart: EAM.ADMN.SCOPE.WorkflowComposition.
- Design spec references: §2.6, §2.9, §4.4, §11, §14.6–§14.11, §15.4, §16.10, §18.2, §19.7,
  §29.3, §29.4, §30.19, §30.21, §30.26 of `design-decisions-v3-1.md`.
- Spec text this draft supersedes (relocated to §21 on 2026-10-23): §14.7.1's Back confirmation, §14.9's Stop
  "No" branch, §14.11 item 1, §15.4's implicit timer and Start Work Status paragraphs,
  §19.7.1. Rules and rationale: §32.
- **Decisions applied** (agreed 2026-10-23, see the review): D-1 to D-7, D-10 to D-12, D-14, D-13
  (overruled: parent only), D-15 (overruled: bypass), D-17 (declined timer not shown in the step
  rail, user direction).
