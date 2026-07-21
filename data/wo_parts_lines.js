// data/wo_parts_lines.js — WO x Part planned lines, matching the real WO
// Parts tab's shape (docs/Data_refs/Work Order Parts Tab.png). Values
// carried over from Issue Parts' pre-existing demo data unchanged (qty
// 8/2/4/2, activity 10, cost code 100-100).
const EAM_WO_PARTS_LINES = {
  '19257': [
    { partNum: '400-VP6-14',  storeCode: 'IND-MAIN', activityCode: '10', plannedQty: 8, costCode: '100-100' },
    { partNum: '200-AB8-001', storeCode: 'IND-MAIN', activityCode: '10', plannedQty: 2, costCode: '100-100' },
    { partNum: '400-VP6-16',  storeCode: 'IND-MAIN', activityCode: '10', plannedQty: 4, costCode: '100-100' },
    { partNum: '200-AB8-006', storeCode: 'IND-MAIN', activityCode: '10', plannedQty: 2, costCode: '100-100' },
  ],
};
