# EAM.ADMN.SCOPE.WorkflowComposition

*Preliminary draft for review. Markdown stand-in for the Word document, mirroring the
section structure of `EAM.ADMN.SCOPE.EmailNotificationProcess.docx`. Rule IDs (C-nn) and
decision IDs (D-nn) refer to `workflow-review-and-scenarios.md`.*

## CHANGE HISTORY

| Rev. | Date | Author | Change Reference |
| --- | --- | --- | --- |
| 1 | 23-Oct-2026 | Danny Kilburn | Preliminary draft — workflow composition rules |

## APPROVAL

| Rev. | Date | Reviewed By | Title |
| --- | --- | --- | --- |
| | | | Peer Reviewer |

---

## 1.0 Brief Description

A mobile work order workflow is an ordered set of **nodes** that an administrator composes in
the Workflow Designer Portal and assigns to user groups. There are three node types:
- **Steps:** delivered tabs and User Defined Screens.
- **Actions:** Status update, Start Timer, Stop Timer.
- **Forks:** Question fork, Condition fork.

The mobile app executes the workflow against a work order (see EAM.MOBILE.SCOPE.WorkflowExecution).

This use case defines the **composition rules**: which sequences the portal accepts, which it
warns about, and which it refuses. It covers the moment each rule is checked and the message
the administrator sees.

The rules exist because several mistakes are invisible on the authoring surface and only surface
on the device, sometimes hours later, as a rejected transaction. Examples:
- a Stop Timer that nothing started
- a booking placed after the work order is completed
- a fork that routes around a Start Timer

## 2.0 Expected End User

System Administrator

## 3.0 Exceptions to Standard Model

- Messages are raised **on the node or control that causes them**, never in a summary
  panel or banner (see Design Decisions).

## 4.0 Entry Points

Workflow Designer Portal ▸ Mobile configuration ▸ Workflows ▸ select a workflow card ▸ edit
mode (canvas).

## 5.0 Oracle Forms Functionality

This use case does not contain functionality from Oracle Forms.

## 6.0 Basic Flow Assumptions

- The workflow is **Not Free Form** and has a WO Type.
- The workflow's function has every tab the administrator places (no capability gap).
- The workflow has no question or condition forks.
- The workflow is not yet assigned to any user group.

## 7.0 Basic Flow

1. Administrator opens a workflow in edit mode. The system displays the canvas with Record
   View instance 1 pinned as the first node.
2. Administrator drags nodes from the Step Library into the flow. After **every** structural
   change (add, remove, reorder, move between Flow and More, change of an action's status or
   mode), the system re-runs all composition rules (see Supplemental Requirements, Path
   Evaluation).
3. Administrator places the nodes in this order: Status update (In Progress), Start Timer,
   Activity Checklist, Issue Parts, Stop Timer, WO Closing.
4. The system determines that:
   - Record View instance 1 is first. Nothing precedes it.
   - The Status update and Start Timer sit directly after Record View 1, so they fire on Start
     Work (see Supplemental Requirements, Start Work Slot).
   - The Stop Timer has a Start Timer before it, and no completing status between them.
   - The workflow reaches a completing status (WO Closing) on its only path.
   - No step follows the completing status.
5. The system raises no message.
6. Administrator assigns the workflow to a user group from the gallery card or the User
   Groups area.
7. The system checks the assignment for clashes (one workflow per group per WO Type) and for
   Errors on the workflow, finds none, and records the assignment.

## 8.0 Alternate Flows

### 8.1 Stop Timer Has No Start Timer on Any Path

If a Stop Timer node has no Start Timer before it on any path, the system outlines the Stop
Timer node in error.

Node Error: "Nothing starts the timer before this. It will never book any time."

The workflow cannot be assigned while this Error stands. See 8.19.

### 8.2 Stop Timer Has No Start Timer on Some Paths

If a Stop Timer has a Start Timer before it on some paths but not all (for example, a fork
answer routes past the Start Timer), the system raises a warning on the Stop Timer node naming
the fork and answer.

Node Warning: "The timer is not started on the '<answer>' route of '<fork question>'. On that
route this does nothing."

A User-selected Start Timer counts as present, because declining it is the technician's choice.

### 8.3 Start Timer Is Never Stopped

If, on any path, a Start Timer is followed by no Stop Timer and no Book Labor step before the
path ends, the system raises a warning on the Start Timer node.

Node Warning: "Nothing in this workflow stops the timer on <route>. It will be booked when the
work order is completed, according to AUTOBOOK."

### 8.4 Two Start Timers, or Two Stop Timers, in a Row

If two Start Timers occur on one path with no Stop Timer between them, the system raises a
warning on the second.

Node Warning: "The timer is already running here. This does nothing."

The same applies to two Stop Timers with no Start Timer between them.

Node Warning: "The timer is already stopped here. This does nothing."

### 8.5 Stop Timer After a Completing Status

If, on any path, a Stop Timer occurs after WO Closing or after a Status update whose status
maps to a Completed or Closed system status, the system outlines the Stop Timer in error.

Node Error: "This books time after the work order is completed. EAM will reject it. Move it
before <Closing / Status update>."

### 8.6 Step After a Completing Status

If, on any path, a Flow step occurs after WO Closing or after a Status update to a Completed or
Closed system status, the system outlines the step in error.

Node Error: "The work order is completed before this step. Its fields are protected and it
cannot be done."

More group entries are not affected.

### 8.7 User-Selected Status Update With Steps After It

If a Status update in User selected mode has steps after it, the system displays an
information note in the Status update editor.

Info: "If the technician picks a completing status here while required steps remain, the app
refuses it. If only optional steps remain, they are marked Not Applicable."

### 8.8 Status Update and Status Authorizations

The system displays an information note in every Status update editor, worded for the mode
selected.

**System action:**

Info: "Sets <status> whatever the technician's group is authorized to do by hand. The workflow
is the authorization."

**User selected:**

Info: "The technician picks from the statuses their group is authorized to move to. That list
comes from Security, not from this workflow."

The system raises no warning about a group's authorizations for a System action.

### 8.9 Path Ends Without Changing Status

If a path through a Not Free Form workflow contains neither WO Closing nor a Status update, the
system raises a warning on the last node of that path, or on the fork answer that ends it.

Node Warning: "This route ends without changing the work order's status."

If the path ends at a fork answer targeting End and the workflow contains WO Closing, the
message names it instead.

Node Warning: "This answer ends the workflow before WO Closing."

### 8.10 Administrator Places a Node Before Record View Instance 1

If the administrator drops any node (step, action or fork) above Record View instance 1, the
system places it directly after Record View instance 1 instead.

Toast: "Record View is always first. Placed after it, so it runs on Start Work."

The clamp is applied at the mutation, not only in the drag geometry.

### 8.11 Administrator Moves WO Closing to More

If the administrator drags WO Closing into the More group, the system refuses the drop.

Toast: "WO Closing completes the work order, so it can't be reachable at any time. Leave it
in the flow."

### 8.12 Same Tab Is Both a Step and a More Entry

If a tab has an instance in the flow and another instance in the More group, the system raises
a warning on the More instance.

Node Warning: "The technician can do this from More before reaching step <n>."

### 8.13 Required or Gated Step Without Tab Permission

If a Required or gated step is a tab that an assigned group has no permission to select, the
system shows an error on that group's row in the assignment control and tags the node.

Error: "<Group> can't open <tab>. Work orders on this workflow could not be finished. Fix it in
Security ▸ Tab Permissions."

If the step is not Required and not gated, the same message is shown as a warning.

### 8.14 Fork Routes Nothing

If both branches of a question or condition fork resolve to the same target (including both
"continue"), the system raises a warning on the fork.

Node Warning: "Both answers go to the same place. This fork doesn't route anything."

### 8.15 Condition Fork Has No Field

If a condition fork has no field selected, or its field is no longer on the preceding step
because of a reorder or deletion, the system clears the operator and value and outlines the
fork in error.

Node Error: "Pick a field from <preceding step>." or "There is no step before this to read a
field from."

### 8.16 Condition Fork Reads a Skippable Step

If the step a condition fork reads from can be skipped by an earlier fork, the system shows an
information note in the condition editor.

Info: "<Step> is skipped on the '<answer>' route of '<fork question>'. There the field is empty,
and the workflow continues in sequence."

### 8.17 Administrator Switches the Workflow to Free Form

The system displays the existing Free Form confirmation, extended so that it lists every
action that will be removed, by kind, alongside the forks.

The confirmation also includes the following note.

Info: "Free Form has no status or timer automation. The technician sets status and runs the
timer by hand."

### 8.18 Consecutive Identical Status Updates

If two Status updates on one path set the same entity to the same status with no other Status
update between them, the system raises a warning on the second.

Node Warning: "The status is already <status> here. This does nothing."

### 8.19 Administrator Assigns a Workflow That Has Errors

If the administrator tries to assign a workflow that carries one or more Errors (alternate
flows 8.1, 8.5, 8.6, 8.13, 8.15), the system refuses the assignment in the assignment
control before the click. Refusal is shown the same way as a clash.

Assignment refused: "This workflow has <n> errors. Fix them before assigning it."

If an **already-assigned** workflow gains an Error through an edit, the system keeps the
existing assignments and outlines the workflow card. Work orders already started keep the
version they were started on (see EAM.MOBILE.SCOPE.WorkflowExecution, Config Changes Mid-Run).
New starts resolve to this version. *(Open: whether an edit to an assigned workflow should be
allowed to introduce an Error at all. Depends on workflow revisioning, §20.)*

## 9.0 Shared Alternate Flows

The following existing alternate flows are unchanged and apply here:
- **Fork target becomes backward or dangling after a reorder or deletion**: cleared to
  "continue" and counted (§29.4).
- **Gate on a non-Required step**: warned. **Gate on a More entry**: refused (§29.3).
- **Action or fork dropped into More or Free Form**: refused (§30.11).
- **Assignment clash (one workflow per group per WO Type, one fallback per group)** (§30.2,
  §30.26).
- **Capability gap from the selected function**: reported on the node, never auto-fixed
  (§26.5.1).

## 10.0 Design Decisions

- **Messages sit on the node or control that causes them.** There is no roll-up count,
  banner or summary panel (§30.20). The only place Errors are aggregated is the assignment
  refusal in 8.19, because that's where the action is.
- **Errors block assignment, not editing.** An administrator can always save work in progress.
  An Error stops a broken workflow from reaching a technician.
- **Stop Timer with no Start Timer is an Error only when no path has one.** On the device a
  Stop Timer with no running timer is a no-op (§30.21), so a partial gap is legal. It's
  reported because it's almost certainly unintended.
- **A Book Labor step plus a Stop Timer is not a rule.** Both are guarded by the same "a
  timer is running" condition and only one timer can run, so the second finds nothing to do
  (§18.2).
- **A System-action Status update bypasses status authorizations.** The administrator authored
  the transition, so the workflow is the authorization (D-15). User-selected mode still offers
  only the group's authorized statuses (§30.21). Base must accept a workflow-originated write and
  verify it against the stamped workflow version. That backend dependency is tracked in the review.
- **Workflow nodes carry no Visible flag.** A node that shouldn't be seen isn't placed (D-16).
- **The slot after Record View instance 1 is the Start Work moment.** This replaces §12's
  declared Start Work Status, which §30.11 removed.

## 11.0 Supplemental Requirements

### 11.1 Node Kinds

| Kind | Type | Positional | Allowed in More | Allowed in Free Form | Carries Required / gates |
| --- | --- | --- | --- | --- | --- |
| Delivered tab instance | Step | Yes | Yes (except WO Closing) | Yes | Yes (Flow only) |
| User Defined Screen | Step | Yes | Yes | Yes | Yes (Flow only) |
| Status update | Action | Yes | No | No | No |
| Start Timer | Action | Yes | No | No | No |
| Stop Timer | Action | Yes | No | No | No |
| Question fork | Fork | Yes | No | No | No |
| Condition fork | Fork (an action that routes) | Yes | No | No | No |

### 11.2 Path Evaluation

Forks route forward only, so a flow is a directed acyclic graph. Every rule marked
path-aware in the review is evaluated over **each path**:
- **Start:** Record View instance 1.
- **Each fork:** branches into its two answers. "Continue" goes to the next node in sequence, a
  target jumps to that step, and End terminates the path.
- **Nodes jumped over** are absent from that path. That includes actions.
- **End:** a path ends at the last flow node or at an End target.

Along each path the system tracks two states, which are enough for the rules in 8.1–8.9:
- **Timer:** `off` or `on`. Both Start Timer modes set `on`. Stop Timer sets `off`.
- **Status:** the last status set, or `unknown`, and whether that status is **completing**
  (maps to a Completed or Closed system status), with WO Closing treated as completing.

With at most two answers per fork, the number of paths is at most 2^(number of forks). The
portal evaluates all of them.

### 11.3 Start Work Slot

Every action placed directly after Record View instance 1, before the next step, fires when
the technician taps Start Work. The canvas labels this group of actions **"On Start Work"**.

### 11.4 Message Severity

| Severity | Rendering | Effect |
| --- | --- | --- |
| Error | Node outlined in error red, message on the node | Workflow cannot be assigned (8.19) |
| Warning | Warning tag on the node, message on hover/select | None |
| Info | Note inside the node's editor | None |

## 12.0 Lookup Definitions

None.

## 13.0 Grid Definitions

None.

## 14.0 Additional Information

- Execution counterpart: EAM.MOBILE.SCOPE.WorkflowExecution.
- Rules and rationale: §32 of `design-decisions-v3-1.md` (§32.13 for composition).
- Design spec references: §14.10, §14.11, §18.2, §29.2–§29.5, §30.2, §30.11, §30.19, §30.20,
  §30.21, §30.26 of `design-decisions-v3-1.md`.
- **Decisions applied** (agreed 2026-10-23, see the review): D-1, D-7, D-8, D-9, D-15 (overruled:
  bypass), D-16 (remove Visible).
