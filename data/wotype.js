// data/wotype.js — WOTYPE base table (design-decisions-v3-1.md §11-13).
// Gains exactly one new column vs. the real base table: statusSource.
// Every real WO Type is listed here regardless of whether a guided
// workflow is configured for it — ROUT exists as a legitimate Job Type
// with no corresponding data/wo-workflow.js row, which is exactly what
// triggers the §11 fallback (plain Standard Record View, always Free
// Form), not an omission to fix.
const EAM_WOTYPE = {
  BRKD: { desc: 'Breakdown Maintenance', statusSource: 'WO_HEADER' },
  PM: { desc: 'Preventive Maintenance', statusSource: 'WO_HEADER' },
  ROUT: { desc: 'Routine Maintenance', statusSource: 'WO_HEADER' },
};
