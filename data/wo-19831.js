// data/wo-19831.js — demo WO #2: Free Form workflow. New second demo WO
// (docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md §1's goal — one Free
// Form WO, one Not Free Form WO, both reachable via real navigation).
// Reuses the same equipment as 19257 (00067333, per 2026-07-20 decision —
// simplest, and Free Form vs. Not Free Form is a WO-level flag, not an
// equipment difference) but its own Class (GENERAL, not PUMP) so it picks
// up a different, smaller Custom Fields set.
const WO_19831 = {
  woNumber: '19831',
  workflowType: 'FREE_FORM',
  // jobType added 2026-07-22 (design-decisions-v3-1.md §11-13) — PM runs a
  // 4-step guided flow (skips Issue Parts entirely, data/wo-workflow-
  // steps.js) and is Free Form (data/wo-workflow.js), independently of
  // that reduced step set — Free Form and "which steps exist" are two
  // different dimensions of the same WO Type, not the same fact twice.
  jobType: 'PM',
  description: 'General inspection request',
  organization: 'FBPP',
  class: 'GENERAL',
  classOrg: '*',
  equipmentAssetId: '00067333',
  customFieldValues: {
    REQDEPT: 'OPS',
    RUSHJOB: true,
    TARGETDATE: '2026-07-25',
  },
};
