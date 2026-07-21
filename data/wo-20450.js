// data/wo-20450.js — demo WO #3: Routine Maintenance (ROUT), no configured
// workflow (design-decisions-v3-1.md §11's fallback rule) — renders the
// plain Standard Record View, always Free Form, no guided steps at all.
// Equipment is a location/facility record (BLDG-A, data/equipment.js),
// not a physical asset like the other two demo WOs' pump — and the task
// itself is deliberately trivial: this WO exists to prove the "long tail
// of unconfigured WO Types" fallback path, not to look important.
const WO_20450 = {
  woNumber: '20450',
  jobType: 'ROUT',
  description: 'Replace batteries in lobby TV remote',
  organization: 'FBPP',
  class: 'FACILITY',
  classOrg: '*',
  equipmentAssetId: 'BLDG-A',
};
