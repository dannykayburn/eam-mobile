// data/parts.js — Part master (num/desc/uom only; Class/Category/
// Organization exist in the real export, docs/Data_refs/Sheet1 (67).xlsx,
// but no current screen surfaces them). 200-AB8-006's description is the
// real export's full text; the others are carried over from Issue Parts'
// pre-existing demo data unchanged.
const EAM_PARTS = [
  { partNum: '400-VP6-14',  desc: 'O Ring EPDM',                                uom: 'EA' },
  { partNum: '200-AB8-001', desc: 'Casing (AB-8 Pump)',                         uom: 'FA' },
  { partNum: '400-VP6-16',  desc: 'Flat Washer Steel (Zn Plt)',                 uom: 'EA' },
  { partNum: '200-AB8-006', desc: 'Ball Bearing, 2" Bore, Cast Iron, Pillow block', uom: 'EA' },
];
