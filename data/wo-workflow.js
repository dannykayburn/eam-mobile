// data/wo-workflow.js — WO Workflow header (design-decisions-v3-1.md
// §12), keyed WO Type × User Group. Holds the Free Form / Not Free Form
// flag only — status source lives on WOTYPE itself (data/wotype.js),
// tab/step visibility+order lives in the child table (data/wo-workflow-
// steps.js). userGroup '*' is a wildcard (same convention as classOrg '*'
// elsewhere in this app's data) — this prototype has no user-group
// switcher, so every row just targets "all groups" for now; a real
// deployment would add per-group rows here without changing the shape.
//
// No row for ROUT is intentional (§11's fallback rule): a WO Type with
// no matching row here renders the plain Standard Record View instead of
// a guided workflow, and is always Free Form regardless of any flag.
const EAM_WO_WORKFLOW = [
  { woType: 'BRKD', userGroup: '*', freeForm: false },
  { woType: 'PM', userGroup: '*', freeForm: true },
];
