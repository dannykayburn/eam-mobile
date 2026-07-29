// data/wo-workflow-steps.js — WO Workflow Steps (design-decisions-v3-1.md
// §12), child of wo-workflow.js, keyed WO Type × User Group × Step. Step
// keys match the 5 mobile guided-workflow steps (§14) 1:1: record,
// checklist, issueparts, booklabor, closing. A step's inclusion in this
// array *is* its visibility — there's no separate visible:true/false
// column, since "not listed" already means "not visible" without a
// redundant flag repeated on every row.
//
// BRKD runs the full 5-step flow. PM skips issueparts entirely — Issue
// Parts is not a step of the PM workflow, not a step that's present but
// hidden. PM also has no closing row (removed 2026-07-29, direct
// feedback) — Book Labor is PM's last step; it shows its own completion
// popup (status edit + summary + green overlay, §14.7.1/§19.7) instead of
// navigating to a Closing screen that doesn't exist for this WO Type.
const EAM_WO_WORKFLOW_STEPS = [
  { woType: 'BRKD', userGroup: '*', step: 'record', sequence: 1 },
  { woType: 'BRKD', userGroup: '*', step: 'checklist', sequence: 2 },
  { woType: 'BRKD', userGroup: '*', step: 'issueparts', sequence: 3 },
  { woType: 'BRKD', userGroup: '*', step: 'booklabor', sequence: 4 },
  { woType: 'BRKD', userGroup: '*', step: 'closing', sequence: 5 },

  { woType: 'PM', userGroup: '*', step: 'record', sequence: 1 },
  { woType: 'PM', userGroup: '*', step: 'checklist', sequence: 2 },
  { woType: 'PM', userGroup: '*', step: 'booklabor', sequence: 3 },
];
