// data/notifications.js — modeled on R5MAILEVENTS, the real EAM table that
// already drives both email and push notifications today (an event fires,
// it always logs a mail-event row; if the recipient user has a device tied
// to them, the same row also triggers a push). This file surfaces that
// existing event stream as an in-app Notifications list — no new source
// system, just a mobile-side read of the log the email/push system already
// produces. `wo`, when present, is the hyperlink target back to the source
// Work Order (same demo-fallback rule as everywhere else in this prototype
// — see openNotification() in eam-notifications-prototype-v1.html and
// design-decisions-v3-1.md §24 rule 3: 19257/19831 open as themselves,
// anything else opens as WO 20450).
//
// One real gap, flagged rather than solved here: R5MAILEVENTS is a send
// log, not an inbox — it has no "read/unread" column anywhere in the real
// schema. `read` below is invented for this prototype; a real build needs
// a real place to persist it (new column, or a client-local table keyed by
// EVENTID + user). See design-decisions-v3-1.md §25.
//
// `type: 'comment_mention'` is a forward reference — @mention tagging in
// Comments isn't built in this prototype yet (circle-back item, see
// CLAUDE.md), but the notification a real @mention would generate is
// modeled here anyway so this screen doesn't have to wait on that feature.
//
// `time` is plain numeric MM/DD/YYYY + 24-hour time (2026-07-22, user
// direction) — matches the app's own locked numeric-date standard
// (design-decisions-v3-1.md §3.4) rather than Comments' older spelled-
// month convention, which predates that rule and was never swept.
const EAM_NOTIFICATIONS = [
  {
    id: 'ne1001',
    type: 'wo_status',
    channel: 'push',
    subject: 'WO 19257 status changed to In Progress',
    body: 'Bearing replacement — Pump 3042 moved to In Progress by Bruce Campbell.',
    wo: '19257',
    read: false,
    time: '07/22/2026 · 09:14',
  },
  {
    id: 'ne1002',
    type: 'wo_assigned',
    channel: 'both',
    subject: 'WO 19831 assigned to you',
    body: 'Quarterly PM — Cooling Tower 2 was assigned to you by Meera Kumar.',
    wo: '19831',
    read: false,
    time: '07/22/2026 · 08:02',
  },
  {
    id: 'ne1003',
    type: 'comment_mention',
    channel: 'push',
    subject: 'Jamie Martinez mentioned you in a comment',
    body: '"@Bruce Campbell can you confirm the bearing size before I order?"',
    wo: '19257',
    read: false,
    time: '07/22/2026 · 07:41',
  },
  {
    id: 'ne1004',
    type: 'follow_up_created',
    channel: 'email',
    subject: 'Follow-up WO created from WO 19257',
    body: 'A nonconformity flagged on the Activity Checklist created a new follow-up work order.',
    wo: '20450',
    read: true,
    time: '07/21/2026 · 16:55',
  },
  {
    id: 'ne1005',
    type: 'pm_due',
    channel: 'email',
    subject: 'PM due reminder — Cooling Tower 2',
    body: 'Scheduled preventive maintenance is due within 3 days.',
    wo: '19831',
    read: true,
    time: '07/21/2026 · 06:00',
  },
  {
    id: 'ne1006',
    type: 'wo_reassigned',
    channel: 'push',
    subject: 'WO 20450 reassigned to you',
    body: 'Routine inspection was reassigned to you by William Irving.',
    wo: '20450',
    read: true,
    time: '07/20/2026 · 14:18',
  },
  {
    id: 'ne1007',
    type: 'wo_status',
    channel: 'both',
    subject: 'WO 19257 status changed to On Hold',
    body: 'Bearing replacement — Pump 3042 moved to On Hold: awaiting parts.',
    wo: '19257',
    read: true,
    time: '07/19/2026 · 11:30',
  },
];
