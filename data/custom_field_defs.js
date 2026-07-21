// data/custom_field_defs.js — "Custom Fields" definitions, keyed by
// (entity, class, classOrg). A record's Custom Fields container renders
// only the rows matching its own entity+class+classOrg; no match means no
// container at all (not an empty one).
//
// `line` drives display order. `groupLabel` is sparse on purpose, mirroring
// the real export (docs/Data_refs/Associated Custom Fields to Class
// PUMP.xlsx): only the first row of a group carries a label, subsequent
// rows are '' until the next group starts. Rendering must forward-fill —
// sort by line, carry the last non-blank groupLabel down through blank
// rows. This is a DELIBERATE CALL made under ambiguity, not a confirmed
// spec — see design-decisions-v3-1.md's "Custom Fields" entry for the
// pending-decision note. Flag if a future real export contradicts it.
//
// (equipment, PUMP, *) is the real set verbatim — FLA/INLET/OUTLET/PHASE/HP,
// all Numeric, one group ("Pump Information"), Class Org "*" (wildcard) —
// see docs/Data_refs/Associate custom fields.png. Field metadata (type/uom)
// cross-referenced against docs/Data_refs/Custom Fields.xlsx.
//
// (wo, PUMP, *) and (wo, GENERAL, *) are invented — no real WO-side example
// exists in Data_refs. Deliberately different sizes/types/groups from each
// other (and from Equipment's set) to demonstrate the config actually
// varies by class, not just by entity.
const EAM_CUSTOM_FIELD_DEFS = [
  // Equipment — Class PUMP — real
  { entity: 'equipment', class: 'PUMP', classOrg: '*', line: 10, key: 'FLA',    label: 'Full Load Amps', type: 'number', uom: '', groupLabel: 'Pump Information' },
  { entity: 'equipment', class: 'PUMP', classOrg: '*', line: 20, key: 'INLET',  label: 'Inlet Size',     type: 'number', uom: '', groupLabel: '' },
  { entity: 'equipment', class: 'PUMP', classOrg: '*', line: 30, key: 'OUTLET', label: 'Outlet Size',    type: 'number', uom: '', groupLabel: '' },
  { entity: 'equipment', class: 'PUMP', classOrg: '*', line: 40, key: 'PHASE',  label: 'Phase',          type: 'number', uom: '', groupLabel: '' },
  { entity: 'equipment', class: 'PUMP', classOrg: '*', line: 50, key: 'HP',     label: 'Horsepower',     type: 'number', uom: '', groupLabel: '' },

  // WO — Class PUMP (WO 19257, Not Free Form) — invented, 2 groups, all 5 field types
  { entity: 'wo', class: 'PUMP', classOrg: '*', line: 10, key: 'SEALTYPE',  label: 'Seal Type',                    type: 'lov',      groupLabel: 'Pump Service Detail', lovOptions: [{ code: 'MECH', desc: 'Mechanical' }, { code: 'PACK', desc: 'Packing' }, { code: 'MAG', desc: 'Magnetic' }] },
  { entity: 'wo', class: 'PUMP', classOrg: '*', line: 20, key: 'DISCHPSI',  label: 'Discharge Pressure (PSI)',      type: 'number',   groupLabel: '' },
  { entity: 'wo', class: 'PUMP', classOrg: '*', line: 30, key: 'LASTVIBE',  label: 'Last Vibration Analysis Date',  type: 'date',     groupLabel: '' },
  { entity: 'wo', class: 'PUMP', classOrg: '*', line: 40, key: 'CONFINED',  label: 'Confined Space Entry Required', type: 'checkbox', groupLabel: 'Safety' },
  { entity: 'wo', class: 'PUMP', classOrg: '*', line: 50, key: 'PERMITNUM', label: 'Permit Number',                 type: 'text',     groupLabel: '' },

  // WO — Class GENERAL (WO 19831, Free Form) — invented, smaller/simpler set, 1 group
  { entity: 'wo', class: 'GENERAL', classOrg: '*', line: 10, key: 'REQDEPT',    label: 'Requesting Department', type: 'lov',      groupLabel: 'Request Detail', lovOptions: [{ code: 'OPS', desc: 'Operations' }, { code: 'ENG', desc: 'Engineering' }, { code: 'MAINT', desc: 'Maintenance' }] },
  { entity: 'wo', class: 'GENERAL', classOrg: '*', line: 20, key: 'RUSHJOB',    label: 'Rush Job',              type: 'checkbox', groupLabel: '' },
  { entity: 'wo', class: 'GENERAL', classOrg: '*', line: 30, key: 'TARGETDATE', label: 'Target Completion',     type: 'date',     groupLabel: '' },
];
