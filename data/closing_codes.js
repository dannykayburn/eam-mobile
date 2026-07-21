// data/closing_codes.js — Problem/Failure/Cause/Action code lists, carried
// over verbatim from WO Closing's pre-existing local `lovData`. No real
// codes list exists in docs/Data_refs — this stays the invented
// <first letter>-0xx placeholder scheme documented in that file.
const EAM_CLOSING_CODES = {
  problem: [
    { code: 'P-001', desc: 'Mechanical failure' },
    { code: 'P-002', desc: 'Electrical failure' },
    { code: 'P-003', desc: 'Instrumentation fault' },
    { code: 'P-004', desc: 'Corrosion / erosion' },
    { code: 'P-005', desc: 'Operational error' },
  ],
  failure: [
    { code: 'F-001', desc: 'Cavitation' },
    { code: 'F-002', desc: 'Seal failure' },
    { code: 'F-003', desc: 'Bearing failure' },
    { code: 'F-004', desc: 'Impeller wear' },
    { code: 'F-005', desc: 'Miscellaneous' },
  ],
  cause: [
    { code: 'C-001', desc: 'Normal wear and tear' },
    { code: 'C-002', desc: 'Inadequate maintenance' },
    { code: 'C-003', desc: 'Installation defect' },
    { code: 'C-004', desc: 'Design limitation' },
    { code: 'C-005', desc: 'Process conditions' },
  ],
  action: [
    { code: 'A-001', desc: 'Component replaced' },
    { code: 'A-002', desc: 'Repaired in place' },
    { code: 'A-003', desc: 'Adjusted / realigned' },
    { code: 'A-004', desc: 'Inspected only' },
    { code: 'A-005', desc: 'Deferred — follow-up WO raised' },
  ],
};
