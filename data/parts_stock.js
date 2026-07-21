// data/parts_stock.js — Part x Store x Bin x Lot x Qty-on-hand, matching
// the real Part Stock tab's shape (docs/Data_refs/Part Stock Tab.png).
// IND-MAIN rows carry over Issue Parts' pre-existing avail/bin/lot values
// unchanged. IND-SOUTH doesn't track lot (see stores.js showLot:false) —
// its rows are invented, roughly the ~10% figure the old runtime formula
// synthesized on the fly, now just plain data.
const EAM_PARTS_STOCK = [
  { partNum: '400-VP6-14',  storeCode: 'IND-MAIN',  bin: 'A1-001', lot: '*',      qtyOnHand: 82 },
  { partNum: '200-AB8-001', storeCode: 'IND-MAIN',  bin: 'C3-014', lot: 'LOT-22', qtyOnHand: 6 },
  { partNum: '400-VP6-16',  storeCode: 'IND-MAIN',  bin: 'A1-009', lot: '*',      qtyOnHand: 144 },
  { partNum: '200-AB8-006', storeCode: 'IND-MAIN',  bin: 'B2-033', lot: 'LOT-08', qtyOnHand: 11 },

  { partNum: '400-VP6-14',  storeCode: 'IND-SOUTH', bin: 'BULK-1', lot: '*',      qtyOnHand: 8 },
  { partNum: '200-AB8-006', storeCode: 'IND-SOUTH', bin: 'BULK-1', lot: '*',      qtyOnHand: 2 },
];
