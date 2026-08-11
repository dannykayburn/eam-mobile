/* End-to-end: fill Insert Mode → Create → land on the new record showing the
   entered data → find it again in the list. This is the flow the device report
   said was dead ("does not create record and bring user to that record view
   leveraging their entered data"). */
const { runScreen } = require('./_lib.js');
const vm = require('vm');
const t = (ctx, e) => { try { return vm.runInContext(e, ctx); } catch (x) { return 'THREW: ' + x.message; } };

let fail = 0;
const ok = (label, cond, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (extra !== undefined ? '  → ' + extra : ''));
  if (!cond) fail++;
};

function createOn(screen, entity, desc) {
  const ctx = runScreen(screen, null);
  const res = t(ctx, `(function(){
    try{
      openCreateSheet('${entity}');
      currentFlatFields().forEach(function(f){
        if (f.required) LOV_CURRENT[f.key] = (LOV_DATA[f.key] && LOV_DATA[f.key][0] ? LOV_DATA[f.key][0].code : 'X');
      });
      ${entity === 'WO' ? "LOV_CURRENT.insertEquipment = '00067333';" : ''}
      document.getElementById('fv-insertDescription').value = ${JSON.stringify(desc)};
      updateInsertSaveGate();
      var ready = document.getElementById('insertSaveBtn').classList.contains('ready');
      saveInsertRecord();
      return JSON.stringify({
        ready: ready,
        href: location.href,
        handoff: sessionStorage.getItem(${entity === 'WO' ? "'eamNewWoRecord'" : "'eamNewEquipRecord'"}),
        stored: createdRecords()[${JSON.stringify(entity)}].length
      });
    }catch(e){ return 'THREW: ' + e.message; }
  })()`);
  return typeof res === 'string' && res.startsWith('THREW') ? { error: res } : JSON.parse(res);
}

console.log('WO: Insert Mode → Create');
const woDesc = 'Bearing replacement on line B';
let r = createOn('eam-wo-list-prototype-v5_1.html', 'WO', woDesc);
ok('no exception', !r.error, r.error || 'clean');
ok('Save gate went ready', r.ready === true);
ok('navigates to WO Record View', r.href === 'eam-wo-record-view-prototype-v1.html', r.href);
ok('hand-off payload written', !!r.handoff);
ok('persisted to the created store', r.stored === 1, String(r.stored));
const woRec = r.handoff ? JSON.parse(r.handoff) : {};
ok('payload carries the typed description', woRec.desc === woDesc, JSON.stringify(woRec.desc));
ok('payload carries a WO number', /^\d+$/.test(String(woRec.number)), String(woRec.number));
ok('payload carries equipment', !!(woRec.equipment && woRec.equipment.code), JSON.stringify(woRec.equipment && woRec.equipment.code));
ok('payload carries type + status', !!(woRec.type && woRec.status), JSON.stringify([woRec.type && woRec.type.code, woRec.status && woRec.status.code]));

console.log('\nWO: the new record opens showing that data');
let ctx = runScreen('eam-wo-record-view-prototype-v1.html', { eamNewWoRecord: JSON.stringify(woRec) });
ok('recNum shows the new number', t(ctx, `document.getElementById('recNum').textContent`) === String(woRec.number),
   t(ctx, `document.getElementById('recNum').textContent`));
ok('recDesc shows the typed description', t(ctx, `document.getElementById('recDesc').textContent`) === woDesc,
   JSON.stringify(t(ctx, `document.getElementById('recDesc').textContent`)));

console.log('\nWO: it appears in WO List afterwards');
ctx = runScreen('eam-wo-list-prototype-v5_1.html', {
  eamCreatedRecords: JSON.stringify({ WO: [woRec], EQUIP: [] }),
});
const cards = t(ctx, `document.getElementById('s1DL').innerHTML`);
ok('the created WO is rendered', String(cards).includes(woDesc), String(cards).includes(woDesc) ? 'found' : 'missing');
ok('counter includes it', /4 work orders/.test(t(ctx, `document.getElementById('s1Count').textContent`)),
   t(ctx, `document.getElementById('s1Count').textContent`));
ok('tapping it re-opens the real record', t(ctx, `(function(){
  try{ openWO('WO-${woRec.number}'); return location.href + '|' + !!sessionStorage.getItem('eamNewWoRecord'); }
  catch(e){ return 'THREW: '+e.message; }
})()`) === 'eam-wo-record-view-prototype-v1.html|true');

console.log('\nEquipment: Insert Mode → Create');
const eqDesc = 'Blower, Roots type';
r = createOn('eam-equipment-list-prototype-v1.html', 'EQUIP', eqDesc);
ok('no exception', !r.error, r.error || 'clean');
ok('navigates to Equipment Record View', r.href === 'eam-equipment-record-view-prototype-v1.html', r.href);
ok('persisted', r.stored === 1, String(r.stored));
const eqRec = r.handoff ? JSON.parse(r.handoff) : {};
ok('payload carries the typed description', eqRec.desc === eqDesc, JSON.stringify(eqRec.desc));
ok('payload carries an asset number', /^\d{8}$/.test(String(eqRec.asset)), String(eqRec.asset));

console.log('\nEquipment: the new record opens showing that data');
ctx = runScreen('eam-equipment-record-view-prototype-v1.html', { eamNewEquipRecord: JSON.stringify(eqRec) });
ok('recNum shows the new asset', t(ctx, `document.getElementById('recNum').textContent`) === String(eqRec.asset),
   t(ctx, `document.getElementById('recNum').textContent`));
ok('recDesc shows the typed description', t(ctx, `document.getElementById('recDesc').textContent`) === eqDesc,
   JSON.stringify(t(ctx, `document.getElementById('recDesc').textContent`)));

console.log('\nGuard still works: a missing required field blocks the save');
ctx = runScreen('eam-wo-list-prototype-v5_1.html', null);
ok('save refused, no navigation', t(ctx, `(function(){
  try{
    openCreateSheet('WO');
    document.getElementById('fv-insertDescription').value = 'no required fields set';
    saveInsertRecord();
    return location.href === '' && createdRecords().WO.length === 0;
  }catch(e){ return 'THREW: '+e.message; }
})()`) === true);

console.log('\nHeader description editor (both record views)');
for (const [screen, label] of [['eam-wo-record-view-prototype-v1.html','WO'],['eam-equipment-record-view-prototype-v1.html','Equipment']]) {
  ctx = runScreen(screen, null);
  ok('  ' + label + ': opens compact + has ✓', t(ctx, `(function(){
    openDescEditor();
    var s=document.getElementById('textEditorSheet');
    return s.classList.contains('open') && s.classList.contains('compact') && !!document.getElementById('textEditorConfirmBtn');
  })()`) === true);
  ok('  ' + label + ': saves the new description', t(ctx, `(function(){
    openDescEditor();
    document.getElementById('textEditorTextarea').value='Edited ${label}';
    updateTextEditorSaveGate(); saveTextEditor();
    return document.getElementById('recDesc').textContent;
  })()`) === 'Edited ' + label);
  ok('  ' + label + ': empty description refused (required)', t(ctx, `(function(){
    openDescEditor();
    var before=document.getElementById('recDesc').textContent;
    document.getElementById('textEditorTextarea').value='   ';
    updateTextEditorSaveGate();
    var gated=document.getElementById('textEditorConfirmBtn').classList.contains('disabled');
    saveTextEditor();
    return gated && document.getElementById('recDesc').textContent===before;
  })()`) === true);
}


/* ── Demo-WO content sync (regression, 2026-08-11) ──
   Each demo WO must show ITS OWN equipment. WO 20450 ("Replace batteries in
   lobby TV remote") showed a Centrifugal Pump because RECORD.equipment was a
   hardcoded literal and nothing read the WO's own equipmentAssetId. */
console.log('\nEach demo WO shows its own equipment');
const EXPECTED = { '19257': '00067333', '19831': '00067333', '20450': 'BLDG-A' };
for (const [wo, code] of Object.entries(EXPECTED)) {
  const c = runScreen('eam-wo-record-view-prototype-v1.html', { eamOpenDemoWo: wo });
  ok('  WO ' + wo + ' → ' + code, t(c, 'RECORD.equipment.code') === code, t(c, 'RECORD.equipment.code'));
}
{
  const c = runScreen('eam-wo-record-view-prototype-v1.html', { eamOpenDemoWo: '20450' });
  ok('  the facility WO has no photo (empty slot state)', t(c, '!RECORD.equipment.photoUrl') === true);
  ok('  BLDG-A is pickable in the Equipment lookup',
     t(c, 'EQUIPMENT_LOOKUP_DATA.some(function(o){return o.code==="BLDG-A"})') === true);
}
{
  // A MEC child keeps the equipment it was minted for, not its parent's.
  const c = runScreen('eam-wo-record-view-prototype-v1.html', {
    eamOpenDemoWo: '19257',
    eamWoIdentity: JSON.stringify({ number:'20451', desc:'Route — P-1042', parentWo:'19257', equipment:'P-1042', equipDesc:'Pump A' }),
  });
  ok('  MEC child keeps its own equipment', t(c, 'RECORD.equipment.code') === 'P-1042', t(c, 'RECORD.equipment.code'));
  ok('  MEC child shows its own number', t(c, 'document.getElementById("recNum").textContent') === '20451');
}

console.log(fail ? '\n' + fail + ' FAILED (incl. demo-WO equipment sync)' : '\ndemo-WO equipment sync verified too');
process.exit(fail ? 1 : 0);
