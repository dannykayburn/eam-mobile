/* §14.10 — a COMPLETED step is always navigable, on every configured workflow.
   "Not Free Form" governs forward order only; it never makes a finished step
   immutable. Forward gating must stay intact. */
const { runScreen } = require('./_lib.js');
const vm = require('vm');
const t = (ctx, e) => { try { return vm.runInContext(e, ctx); } catch (x) { return 'THREW: ' + x.message; } };

let fail = 0;
const ok = (label, cond, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (extra !== undefined ? '  → ' + extra : ''));
  if (!cond) fail++;
};

// Parses the rendered step map into numbered rows (Reference rows excluded).
function stepRows(file, store) {
  const ctx = runScreen(file, store);
  const html = String(t(ctx, `document.getElementById("stepMap").innerHTML`));
  return html.split('step-map-item').slice(1)
    .map(r => ({
      label: (r.match(/step-map-label[^>]*>([^<]+)/) || [])[1] || '?',
      state: /smi-done/.test(r) ? 'done' : /smi-active/.test(r) ? 'active' : /smi-locked/.test(r) ? 'locked' : 'ref',
      navigates: /goToWoStep/.test(r),
      toast: /showToast/.test(r),
      chevron: /step-map-back/.test(r),
    }))
    .filter(r => r.state !== 'ref');
}

console.log('Gated workflow (BRKD / 19257), viewed from Book Labor');
let rows = stepRows('eam-book-labor-prototype-v2.html', { eamOpenDemoWo: '19257' });
ok('rail rendered numbered steps', rows.length >= 4, String(rows.length));
const done = rows.filter(r => r.state === 'done');
ok('has completed steps to go back to', done.length === 3, String(done.length));
ok('EVERY completed step navigates', done.every(r => r.navigates), done.map(r => r.label + (r.navigates ? '✓' : '✗')).join(' '));
ok('no completed step shows a blocking toast', done.every(r => !r.toast));
ok('every completed step shows the back chevron', done.every(r => r.chevron));
const locked = rows.filter(r => r.state === 'locked');
ok('forward gating INTACT — locked steps do not navigate', locked.length > 0 && locked.every(r => !r.navigates), String(locked.length) + ' locked');
ok('locked steps still explain themselves', locked.every(r => r.toast));
ok('the current step is not a self-link on a step screen',
   rows.filter(r => r.state === 'active').every(r => !r.navigates));

console.log('\nFree-form CONFIGURED workflow (PM / 19831) — was a silent dead end');
rows = stepRows('eam-book-labor-prototype-v2.html', { eamOpenDemoWo: '19831' });
const doneP = rows.filter(r => r.state === 'done');
ok('has completed steps', doneP.length >= 2, String(doneP.length));
ok('completed steps navigate here too', doneP.every(r => r.navigates),
   doneP.map(r => r.label + (r.navigates ? '✓' : '✗')).join(' '));
ok('PM skips Issue Parts (workflow shape unchanged)',
   !rows.some(r => /Issue Parts/.test(r.label)), rows.map(r => r.label).join(' | '));

console.log('\nGated workflow viewed from a Reference destination (Equipment tab)');
rows = stepRows('eam-wo-equipment-tab-prototype-v1.html', { eamOpenDemoWo: '19257', eamEquipTabOrigin: 'booklabor' });
ok('completed steps navigate', rows.filter(r => r.state === 'done').every(r => r.navigates));
ok('the WO position IS navigable here (rail is the only way back)',
   rows.filter(r => r.state === 'active').every(r => r.navigates));
ok('forward still gated', rows.filter(r => r.state === 'locked').every(r => !r.navigates));

console.log('\nEarliest step — nothing completed yet, nothing to go back to');
rows = stepRows('eam-wo-record-view-prototype-v1.html', { eamOpenDemoWo: '19257' });
ok('no completed rows on step 1', rows.filter(r => r.state === 'done').length === 0);
ok('later steps are locked, not navigable', rows.filter(r => r.state === 'locked').every(r => !r.navigates));

console.log(fail ? '\n' + fail + ' FAILED' : '\n§14.10 backward navigation verified');
process.exit(fail ? 1 : 0);
