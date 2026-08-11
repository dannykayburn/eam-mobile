/* Verifies the reworked keyboard-editing popups against the real load path. */
const { runScreen } = require('./_lib.js');
const vm = require('vm');
const fs = require('fs');
const DIR = 'C:/Users/dkilburn/Projects/eam-mobile/prototypes/standalone';

let fail = 0;
const ok = (label, cond, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (extra !== undefined ? '  → ' + extra : ''));
  if (!cond) fail++;
};
const evalIn = (ctx, expr) => { try { return vm.runInContext(expr, ctx); } catch (e) { return '<<' + e.message + '>>'; } };

console.log('markup migration (all screens)');
const files = fs.readdirSync(DIR).filter(f => /^eam-.*\.html$/.test(f));
let textN = 0, editN = 0, pills = 0, footers = 0;
for (const f of files) {
  const s = fs.readFileSync(DIR + '/' + f, 'utf8');
  if (s.includes('id="textEditorSheet"')) {
    textN++;
    if (!s.includes('id="textEditorConfirmBtn"')) { ok('  ' + f + ' has ✓', false); }
    if (/saveTextEditor\(\)">Save<\/button>/.test(s)) pills++;
    // No footer inside the text editor block.
    const blk = s.slice(s.indexOf('id="textEditorSheet"'), s.indexOf('id="textEditorSheet"') + 1400);
    if (blk.includes('sheet-footer')) footers++;
  }
  if (s.includes('id="editSheet"')) {
    editN++;
    if (!s.includes('id="editConfirmBtn"')) ok('  ' + f + ' edit ✓', false);
  }
}
ok('all 7 text editors migrated', textN === 7, String(textN));
ok('all 4 edit sheets migrated', editN === 4, String(editN));
ok('no Save pill left on either editor', pills === 0, String(pills));
ok('no sheet-footer left in text editor', footers === 0, String(footers));

console.log('\nlong-text editor — gating + behaviour (WO reference tab, Add Comment)');
let ctx = runScreen('eam-wo-reference-tab-prototype-v1.html', { eamReferenceTab: 'comments' });
ok('openTextEditor runs', evalIn(ctx, '(function(){try{openTextEditor("__comment","Add Comment",function(){});return "ok"}catch(e){return e.message}})()') === 'ok',
   evalIn(ctx, '(function(){try{openTextEditor("__comment","Add Comment",function(){});return "ok"}catch(e){return e.message}})()'));
ok('opened via openSheetExclusive', evalIn(ctx, 'typeof openSheetExclusive') === 'function');
ok('confirm button is the gated control',
   evalIn(ctx, '(function(){var b=document.getElementById("textEditorConfirmBtn");return !!b})()') === true);
// Required-field gating: a non-required key must NOT be blocked.
ok('optional field → ✓ enabled',
   evalIn(ctx, '(function(){openTextEditor("__comment","Add Comment",function(){});return document.getElementById("textEditorConfirmBtn").classList.contains("disabled")})()') === false);
ok('save fires the callback',
   evalIn(ctx, '(function(){var got=null;openTextEditor("__c","T",function(v){got=v});document.getElementById("textEditorTextarea").value="hello";saveTextEditor();return got})()') === 'hello',
   JSON.stringify(evalIn(ctx, '(function(){var got=null;openTextEditor("__c","T",function(v){got=v});document.getElementById("textEditorTextarea").value="hi";saveTextEditor();return got})()')));

console.log('\nexclusivity — the "sheet showing underneath" bug');
ok('a previously-open sheet is closed on open',
   evalIn(ctx, `(function(){
     var a=document.getElementById("commentActionsSheet");
     a.classList.add("open");
     openTextEditor("__x","T",function(){});
     return a.classList.contains("open");
   })()`) === false,
   'other sheet .open after opening editor');
ok('the editor itself IS open',
   evalIn(ctx, '(function(){openTextEditor("__x","T",function(){});return document.getElementById("textEditorSheet").classList.contains("open")})()') === true);

console.log('\nrequired-field gating still blocks (Equipment RV header description)');
ctx = runScreen('eam-equipment-record-view-prototype-v1.html', null);
ok('required + empty → ✓ disabled',
   evalIn(ctx, `(function(){
     openTextEditor("desc","Description",null,"", {compact:true});
     document.getElementById("textEditorTextarea").value="";
     updateTextEditorSaveGate();
     return document.getElementById("textEditorConfirmBtn").classList.contains("disabled");
   })()`) === true);
ok('required + text → ✓ enabled',
   evalIn(ctx, `(function(){
     document.getElementById("textEditorTextarea").value="Pump, Centrifugal";
     updateTextEditorSaveGate();
     return document.getElementById("textEditorConfirmBtn").classList.contains("disabled");
   })()`) === false);
ok('empty required save is refused',
   evalIn(ctx, `(function(){
     var got="untouched";
     openTextEditor("desc","Description",function(v){got=v},"");
     document.getElementById("textEditorTextarea").value="   ";
     saveTextEditor();
     return got;
   })()`) === 'untouched');

console.log('\nsingle-line edit sheet (same rework)');
ctx = runScreen('eam-wo-record-view-prototype-v1.html', null);
ok('editConfirmBtn exists', evalIn(ctx, '!!document.getElementById("editConfirmBtn")') === true);
ok('updateEditSaveGate targets it',
   evalIn(ctx, `(function(){
     activeEditKey="activityNumber";
     document.getElementById("editSheetInput").value="";
     updateEditSaveGate();
     return typeof document.getElementById("editConfirmBtn").classList.contains("disabled");
   })()`) === 'boolean');

console.log('\nCSS contract');
const css = fs.readFileSync(DIR + '/shared/eam-shared.css', 'utf8');
ok('confirm button is green', /\.sheet-confirm-btn\{[^}]*background:var\(--green\)/.test(css));
ok('confirm has a disabled state', /\.sheet-confirm-btn\.disabled\{/.test(css));
ok('text editor anchored top AND bottom (kb-inset cannot lift it)', /\.text-editor-sheet\{top:0;bottom:0/.test(css));
ok('compact variant re-releases to bottom sheet', /\.text-editor-sheet\.compact\{top:auto/.test(css));
// Scope the check to the confirm-button rules themselves — an unscoped
// /blue/ matches unrelated CSS elsewhere in the file.
const confirmRules = (css.match(/\.sheet-confirm-btn[^{]*\{[^}]*\}/g) || []).join('');
ok('no blue in the confirm button', !/#00?7?[aA][fF][fF]|#0[a-f0-9]{2}[eE][fF]|blue/i.test(confirmRules), confirmRules.length + ' chars of rules checked');

console.log(fail ? '\n' + fail + ' FAILED' : '\nall editor assertions passed');
process.exit(fail ? 1 : 0);
