// data/equipment.js — Equipment master, keyed by Asset ID.
// 00067333 matches the real Pump Asset Example (docs/Data_refs/Pump Asset
// Example.png): Organization FBPP, Class PUMP, Category CENTRIFUGAL,
// Manufacturer DAYTON, Cost Code 100-100, Assigned To BCAMPBELL. classOrg
// '*' matches the real Associate Custom Fields screenshot (wildcard, not
// org-specific). customFieldValues are the real screenshot's own sample
// values (Full Load Amps 50, Inlet 2, Outlet 2, Phase 3, HP 5).
const EAM_EQUIPMENT = {
  '00067333': {
    assetId: '00067333',
    desc: 'Pump, Centrifugal',
    organization: 'FBPP',
    department: 'ENG',
    class: 'PUMP',
    classOrg: '*',
    category: 'CENTRIFUGAL',
    manufacturer: 'DAYTON',
    costCode: '100-100',
    assignedTo: 'BCAMPBELL',
    customFieldValues: { FLA: 50, INLET: 2, OUTLET: 2, PHASE: 3, HP: 5 },
  },
  // BLDG-A — a location/facility record, not a physical asset like the
  // pump above. Added for WO 20450 (data/wo-20450.js, the no-configured-
  // workflow fallback demo) to show that Equipment isn't always a piece
  // of physical equipment — some EAM deployments model buildings/systems
  // as Equipment records with a facility-type Class.
  'BLDG-A': {
    assetId: 'BLDG-A',
    desc: 'Building A — Main Lobby',
    organization: 'FBPP',
    department: 'FAC',
    class: 'FACILITY',
    classOrg: '*',
    category: 'BUILDING',
    manufacturer: '',
    costCode: '100-900',
    assignedTo: 'BCAMPBELL',
  },
};
