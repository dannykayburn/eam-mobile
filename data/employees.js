// data/employees.js — canonical Employee list.
// Real rows sourced from docs/Data_refs/employees.csv (real EAM export).
// BCAMPBELL stays first — it's the app-wide "current user" identity, same
// person as CURRENT_USER_NAME used for Comments authorship everywhere else.
const EAM_EMPLOYEES = [
  { code: 'BCAMPBELL',  name: 'Bruce Campbell',   dept: 'MAINT', trade: 'TECH' },
  { code: 'BBAGGINS',   name: 'Bilbo Baggins',    dept: 'ENG',   trade: 'TECH' },
  { code: 'CWEAVER',    name: 'Charles Weaver',   dept: 'MAINT', trade: 'ELEC' },
  { code: 'DKILBURN',   name: 'Danny Kilburn',    dept: 'ENG',   trade: 'TECH' },
  { code: 'EFILLION',   name: 'Elmer Fillion',    dept: 'OPS',   trade: 'TECH-II' },
  { code: 'JMCGARITY',  name: 'James McGarity',   dept: 'MAINT', trade: 'ELEC' },
  { code: 'MWALRAVEN',  name: 'Michael Walraven', dept: 'ENG',   trade: 'ELEC' },
  { code: 'WIRVING',    name: 'William Irving',   dept: 'MAINT', trade: 'TECH' },
  { code: 'WSTONE',     name: 'William Stone',    dept: 'ENG',   trade: 'TECH-II' },

  // Invented, already referenced elsewhere in the app (Comments seed data,
  // Book Labor's employee cycle list, WO List's Insert Mode LOV stubs) —
  // not in the real export, kept here so nothing already on screen breaks.
  { code: 'JRODRIGUEZ', name: 'Juan Rodriguez',   dept: 'MAINT', trade: 'TECH' },
  { code: 'MKUMAR',     name: 'Meera Kumar',      dept: 'MAINT', trade: 'MECH' },
  { code: 'TPATEL',     name: 'Tariq Patel',      dept: 'MAINT', trade: 'ELEC' },
  { code: 'RSMITH',     name: 'Rachel Smith',     dept: 'OPS',   trade: 'TECH' },
  { code: 'PJONES',     name: 'Pat Jones',        dept: 'OPS',   trade: 'TECH' },

  // Invented, added 2026-07-20 to fix a pre-existing gap: Book Labor's Red
  // Shift crew referenced these 3 member codes without ever defining them.
  // Names match Book Labor's own local `empNames` lookup exactly.
  { code: 'DSMITH',     name: 'Derek Smith',      dept: 'MAINT', trade: 'MECH' },
  { code: 'RFERNANDEZ', name: 'Rosa Fernandez',   dept: 'MAINT', trade: 'MECH' },
  { code: 'ONWOSU',     name: 'Oba Nwosu',        dept: 'MAINT', trade: 'MECH' },
];
