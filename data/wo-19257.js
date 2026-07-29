// data/wo-19257.js — demo WO #1: Not Free Form (Guided) workflow.
// Already the app's existing demo WO across all 5 WO-workflow standalones;
// this file adds the attributes those screens didn't model yet (class/
// classOrg, needed to gate the Custom Fields container) without
// changing anything already locked (organization FBPP matches Equipment
// 00067333 and the real reference screenshots).
const WO_19257 = {
  woNumber: '19257',
  workflowType: 'NOT_FREE_FORM',
  // jobType added 2026-07-22 — drives the real WOTYPE-based workflow
  // resolution (design-decisions-v3-1.md §11-13): BRKD runs the full
  // 5-step guided flow, Not Free Form. The pre-existing workflowType
  // field above is now this WO Type's own downstream fact, not an
  // independent flag — kept for backward compatibility with existing
  // callers, but jobType + data/wo-workflow.js is the source of truth.
  jobType: 'BRKD',
  description: 'Pump Cavitating; lost head',
  organization: 'FBPP',
  class: 'PUMP',
  classOrg: '*',
  equipmentAssetId: '00067333',
  customFieldValues: {
    SEALTYPE: 'MECH',
    DISCHPSI: 145,
    LASTVIBE: '2026-06-02',
    CONFINED: true,
    PERMITNUM: 'CS-2026-0447',
  },
  // Booked labor (Book Labor, Step 4) — seeds the initial labor list.
  // employeeCode resolves against data/employees.js; date is ISO, rendered
  // through the shared isoToDisplay() (MM/DD/YYYY app-wide, 2026-07-21).
  // Emptied 2026-07-29 (prototype-only fix, no design decision behind it):
  // this one seed row (BCAMPBELL) rendered on Book Labor regardless of
  // which of the 3 demo WOs was actually open (renderSeedLabor() reads
  // WO_19257.labor unconditionally), and saving a real "Add Labor" entry
  // for the same person produced a confusing-looking duplicate. Book
  // Labor now starts empty for every WO Type; add labor via the popup to
  // see a real row.
  labor: [],
};
