// data/stores.js — canonical Store list.
// IND-MAIN matches docs/Data_refs/Sheet1 (66).xlsx (real export: "Main Indy
// Store"). IND-SOUTH is invented (kept as-is, 2026-07-20 decision) — the
// real export's other stores are LS-001/LS-002 (Lift Station stores),
// not used here.
const EAM_STORES = [
  { code: 'IND-MAIN',  name: 'Main Industrial Warehouse', showLot: true },
  { code: 'IND-SOUTH', name: 'South Satellite Store',      showLot: false },
];
