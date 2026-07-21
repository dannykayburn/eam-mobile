// data/crew_employees.js — Crew x Employee assignment (junction), matching
// this app's existing entity-vs-junction split (parts_stock.js, wo_parts_
// lines.js). Invented — no real export for this relationship exists yet.
// Exactly 2 employees per crew, never BCAMPBELL (he's the technician
// executing this WO, not a crew member being booked against). Drives
// Book Labor's "Add Labor by Crew" expansion: booking against a Crew adds
// one labor row per employee currently assigned to it, not one row for
// the crew itself. See design-decisions-v3-1.md §18.7.
const EAM_CREW_EMPLOYEES = [
  { crewCode: 'BLUE',   employeeCode: 'CWEAVER' },
  { crewCode: 'BLUE',   employeeCode: 'WSTONE' },
  { crewCode: 'RED',    employeeCode: 'DSMITH' },
  { crewCode: 'RED',    employeeCode: 'RFERNANDEZ' },
  { crewCode: 'YELLOW', employeeCode: 'WIRVING' },
  { crewCode: 'YELLOW', employeeCode: 'JMCGARITY' },
];
