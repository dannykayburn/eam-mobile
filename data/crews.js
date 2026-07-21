// data/crews.js — canonical Crew list.
// Codes/names sourced from docs/Data_refs/Sheet1 (65).xlsx (real export).
// dept/trade are our own invented "trade this crew performs" values, not
// the real export's literal Trade=CREW-01 classification code — Book
// Labor's derive-Department/Trade-from-crew logic needs the former
// meaning, not the latter. See design-decisions-v3-1.md changelog,
// 2026-07-20, for why that's a deliberate divergence, not an oversight.
// `memberCodes` below only feeds the legacy, unreachable "Add by Crew"
// sheet (§18.5) — the real "who's currently assigned to this crew" data
// that drives Book Labor's live Crew-booking expansion is
// data/crew_employees.js (added 2026-07-22), a separate junction file,
// not this field. Don't extend this field expecting it to affect that
// behavior.
const EAM_CREWS = [
  { code: 'BLUE',   name: 'Blue Shift',   dept: 'MAINT', trade: 'TECH', memberCodes: ['BCAMPBELL', 'JRODRIGUEZ', 'MKUMAR', 'TPATEL'] },
  { code: 'RED',    name: 'Red Shift',    dept: 'MAINT', trade: 'MECH', memberCodes: ['DSMITH', 'RFERNANDEZ', 'ONWOSU'] },
  { code: 'YELLOW', name: 'Yellow Shift', dept: 'MAINT', trade: 'ELEC', memberCodes: ['CWEAVER', 'WIRVING'] },
];
