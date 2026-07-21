// data/wo-registry.js — maps a WO number to its data file + workflow
// type. For future use by real navigation (?wo= query string, per
// docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md Phase 1) — not
// wired into any screen's routing yet, just the lookup table for when
// that lands.
const EAM_WO_REGISTRY = {
  '19257': { dataFile: 'wo-19257.js', workflowType: 'NOT_FREE_FORM', jobType: 'BRKD' },
  '19831': { dataFile: 'wo-19831.js', workflowType: 'FREE_FORM', jobType: 'PM' },
  // 20450 added 2026-07-22 — the WOTYPE fallback demo (design-decisions-
  // v3-1.md §11): ROUT has no data/wo-workflow.js row, so it renders the
  // plain Standard Record View instead of a guided workflow.
  '20450': { dataFile: 'wo-20450.js', workflowType: 'FREE_FORM', jobType: 'ROUT' },
};
