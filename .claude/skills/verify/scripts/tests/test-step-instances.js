/* Screen Designer's step-INSTANCE model (§29) — the workflow-authoring
   features added 2026-09-08.

   WHY THIS FILE EXISTS. Until §29 the designer's workflow state was
   `stepOrder: ['checklist','parts',...]` plus `steps: {checklist:{...}}` —
   an array of tab ids and a map keyed by tab id. That pair structurally
   could not express any of the five things now required: the same tab placed
   twice, a second Record View with its OWN field layout, a step that is not
   a function tab at all (a question fork), a UDS placed as a step, or a
   per-instance setting like Book Labor's Time Entry Mode.

   THE ONE ASSERTION THAT MATTERS MOST is layout independence: instance 2 of
   a tab must own a SEPARATE layout from instance 1. The cheapest possible
   implementation — pointing both instances at `WORK_FIELDS[tab]` — passes
   every smoke test, renders correctly, and makes the whole "Record View
   twice with different layouts" requirement silently impossible, because
   editing either one edits both. That is checked below by mutating one and
   requiring the other to be untouched.

   ALSO PINNED HERE: two constraints test-more-group.js explicitly could NOT
   check, because before §29 they lived only in the base-side schema. They
   are frontend-checkable now that the designer owns the placement model:
     - an instance is either a Step or a More entry, never both, and a More
       entry can never be Required (§14.8) — enforced in the SETTER, not just
       hidden in the markup, so a placement change can't leave a stale flag;
     - a fork routes FORWARD only (§14.10). A reorder can turn a valid target
       into a backward one without anybody touching the fork, so the guard
       has to re-run after every move, not only when a target is picked. */
const path = require('path'), vm = require('vm');
const { runScreen } = require(path.join(__dirname, '..', 'run-load.js'));

/* RETIRED SCREEN, LIVE ASSERTIONS (2026-09-16).

   eam-screen-designer-v1.html moved to `old versions/` when the embedded
   Screen Designer panel in the Workflow Designer Portal reached parity with
   it and the standalone surface went away (§30.9). Screen Designer is now a
   panel invoked per step node, not a screen.

   THIS FILE WAS KEPT rather than deleted, and it is NOT evidence the
   capability is live:

     WHAT IT STILL DOES — executes §29's step-instance model against the
       archived artifact, layout independence most of all. That assertion is
       the one that passes every smoke test while being broken, so it stays
       executable code rather than decaying into prose.

     WHERE THE LIVE COVERAGE IS — test-workflow-portal.js. It pins the same
       invariants against the portal through a completely different code
       path (a drag-and-drop canvas rather than a left pane), plus the five
       features ported across for parity: the clone-aware function picker,
       the Field Grid Section's spans, UDS placement, fork translations and
       per-instance Time Entry Mode. **That** is the file to extend.

   Same precedent as test-user-group-offline.js. If the archived file is ever
   deleted, check test-workflow-portal.js covers each case first — do not
   just drop them. */
const FILE = 'base screens/old versions/eam-screen-designer-v1.html';

let fail = 0;
function ok(label, pass, detail) {
  console.log('  ' + (pass ? 'PASS' : 'FAIL') + '  ' + label + (detail !== undefined ? '  → ' + detail : ''));
  if (!pass) fail++;
}

/* `let` at the top level of a vm script lands in the context's global LEXICAL
   environment, not on the context object — so `ctx.state` is undefined while
   `state` is perfectly alive. Everything below therefore reads and writes
   through a script evaluated in the same context, which is also how the
   screen's own inline handlers would reach it. */
const ev = (ctx, expr) => vm.runInContext(expr, ctx);

function boot() {
  const ctx = runScreen(FILE, null);
  /* Drive the real entry path rather than hand-assembling state: the modal is
     what sets baseScreen/baseFunction/woType and calls refreshShell(), and a
     test that skips it would not exercise the render path at all. */
  ev(ctx, `document.getElementById('woTypeSelect').value = 'BK';
           document.getElementById('copyFromGroupSelect').value = 'DK';
           entrySelectedBaseScreen = 'wo';
           entrySelectedBaseFunction = 'WSJOBS';
           state.groups = ['MAINT-TECH'];
           applyEntryModal();`);
  /* Guard the harness itself. An earlier version of this file called
     closeEntryModal(), which only hides the overlay — so every case ran with
     state.baseScreen === null and the left pane never rendered at all, while
     54 of 56 assertions still passed. A test that boots into the wrong state
     and mostly passes is worse than one that fails. */
  if (ev(ctx, 'state.baseScreen') !== 'wo' || ev(ctx, 'state.woType') !== 'BK') {
    throw new Error('boot() did not commit the entry modal: baseScreen=' +
      ev(ctx, 'String(state.baseScreen)') + ' woType=' + ev(ctx, 'String(state.woType)'));
  }
  return ctx;
}

console.log('\nStep instances — the model');
{
  const ctx = boot();
  const steps = ev(ctx, 'stepInstances().map(s => s.tab + "#" + s.inst)');
  const more  = ev(ctx, 'moreInstances().map(s => s.tab)');
  ok('5 numbered steps seeded, Record View first', steps.length === 5 && steps[0] === 'recordview#1', steps.join(' '));
  ok('4 More entries are real rows, not a static tab list', more.length === 4, more.join(' '));
  ok('Record View instance 1 is pinned', ev(ctx, '!!instByIid("i1").pinned'));
  ok('activeTab holds the instance LAYOUT KEY', ev(ctx, 'state.activeTab') === 'recordview', ev(ctx, 'state.activeTab'));
  ok('layout key of instance 1 is the bare tab id (no migration implied)',
    ev(ctx, 'layoutKeyFor("recordview",1)') === 'recordview');
  ok('layout key of instance 2 appends the page variant',
    ev(ctx, 'layoutKeyFor("recordview",2)') === 'recordview#2');
}

console.log('\nA tab placed twice — the layouts must be INDEPENDENT');
{
  const ctx = boot();
  const before = ev(ctx, 'WORK_FIELDS["recordview"][0].fields.length');
  ev(ctx, 'addStepPlacement = "step"; addInst("tab","recordview");');

  const insts = ev(ctx, 'state.steps.filter(s=>s.tab==="recordview").map(s=>layoutKeyOf(s))');
  ok('Record View can be added a second time', insts.length === 2, insts.join(' '));
  ok('the second instance gets its own layout key', insts[1] === 'recordview#2');
  ok('the second layout is seeded as a COPY (not blank)',
    ev(ctx, 'WORK_FIELDS["recordview#2"][0].fields.length') === before, 'fields: ' + before);

  /* THE LOAD-BEARING ASSERTION. A shared reference passes everything above. */
  ev(ctx, 'WORK_FIELDS["recordview#2"][0].fields.push({name:"Variant Only",api:"X",type:"text",behavior:"opt"});');
  const one = ev(ctx, 'WORK_FIELDS["recordview"][0].fields.length');
  const two = ev(ctx, 'WORK_FIELDS["recordview#2"][0].fields.length');
  ok('editing instance 2 does NOT edit instance 1', one === before && two === before + 1, `inst1=${one} inst2=${two}`);

  ev(ctx, 'switchToInst(state.steps.find(s=>s.inst===2).iid)');
  ok('the canvas labels the instance, not just the tab',
    ev(ctx, 'tabLabel(state.activeTab)') === 'Record View (2)', ev(ctx, 'tabLabel(state.activeTab)'));
  ok('un-placed field candidates still resolve off the BASE tab',
    Array.isArray(ev(ctx, 'AVAILABLE_FIELD_CANDIDATES[baseTabOf(state.activeTab)]')));

  /* Removing an instance must take its layout with it, or the next instance
     to reuse that number inherits a stranger's fields. */
  const iid2 = ev(ctx, 'state.steps.find(s=>s.inst===2).iid');
  ev(ctx, `removeInst("${iid2}")`);
  ok('removing an instance drops its layout', ev(ctx, '!WORK_FIELDS["recordview#2"]'));
  ok('instance numbers are reused, not climbed', ev(ctx, 'nextInstanceNo("recordview")') === 2);
}

console.log('\nDuplicate — copies the layout, never shares it');
{
  const ctx = boot();
  ev(ctx, 'duplicateInst("i2")'); // Checklist
  const chk = ev(ctx, 'state.steps.filter(s=>s.tab==="checklist").length');
  ok('Checklist duplicated', chk === 2, 'placements: ' + chk);
  ok('the copy is never pinned', ev(ctx, 'state.steps.filter(s=>s.tab==="checklist").every((s,i)=> i===0 || !s.pinned)'));
  ok('the copy lands directly after its original',
    ev(ctx, 'state.steps.findIndex(s=>s.tab==="checklist"&&s.inst===2)') === ev(ctx, 'state.steps.findIndex(s=>s.tab==="checklist"&&s.inst===1)') + 1);
  ok('Book Labor Time Entry Mode is per INSTANCE, not global',
    ev(ctx, 'typeof instByIid("i4").timeEntry') === 'string' && ev(ctx, 'typeof state.bookLaborTimeEntryMode') === 'undefined');
}

console.log('\nCompletion gates (§29.3) — attributes on ANY step');
{
  const ctx = boot();
  ev(ctx, 'setStepGate("i4","reqComment",true); setStepGate("i4","reqDoc",true);');
  ok('a comment gate can be set on Book Labor, not only on a comment step',
    ev(ctx, 'instByIid("i4").reqComment') === true);
  ok('a document gate is the same mechanic', ev(ctx, 'instByIid("i4").reqDoc') === true);
  ok('Closing seeds the gate the app already had (§19.5)', ev(ctx, 'instByIid("i5").reqComment') === true);

  /* A gate is invisible in the designer unless the emulator shows the locked
     bar it produces — which is the only reason the emulator is worth having. */
  ev(ctx, 'switchToInst("i4"); renderCanvas();');
  const html = ev(ctx, 'document.getElementById("designerCanvas").innerHTML');
  ok('the emulator renders the gate boxes', /mob-gate-box/.test(html));
  ok('the emulator renders Next as LOCKED', /mob-next-bar locked/.test(html));

  ev(ctx, 'setStepGate("i4","reqComment",false); setStepGate("i4","reqDoc",false); switchToInst("i4"); renderCanvas();');
  const html2 = ev(ctx, 'document.getElementById("designerCanvas").innerHTML');
  ok('clearing the gates unlocks Next again', /mob-next-bar/.test(html2) && !/mob-next-bar locked/.test(html2));
}

console.log('\nPlacement — Step or More, never both (§14.8)');
{
  const ctx = boot();
  ok('Req is refused on a More entry even via the setter',
    (() => { ev(ctx, 'toggleStepRequired("i6", true)'); return ev(ctx, 'instByIid("i6").required') === false; })());

  ev(ctx, 'setPlacement("i3","more")'); // Parts → More
  ok('a step moved to More loses Required rather than keeping a stale flag',
    ev(ctx, 'instByIid("i3").placement') === 'more' && ev(ctx, 'instByIid("i3").required') === false);
  ok('every instance has exactly one placement',
    ev(ctx, 'state.steps.every(s => s.placement === "step" || s.placement === "more")'));
  ok('the pinned Record View cannot be moved out of the sequence',
    (() => { ev(ctx, 'setPlacement("i1","more")'); return ev(ctx, 'instByIid("i1").placement') === 'step'; })());
  ok('the pinned Record View cannot be removed',
    (() => { ev(ctx, 'removeInst("i1")'); return !!ev(ctx, 'instByIid("i1")'); })());
  ok('the pinned Record View cannot be hidden',
    (() => { ev(ctx, 'toggleStepVisible("i1", false)'); return ev(ctx, 'instByIid("i1").visible') === true; })());
}

console.log('\nQuestion fork (§29.4) — forward-only routing');
{
  const ctx = boot();
  ev(ctx, 'addStepPlacement = "step"; addInst("prompt","");');
  const pid = ev(ctx, 'state.steps[state.steps.length-1].iid');
  ok('a fork is its own kind, with no layout', ev(ctx, `instByIid("${pid}").kind`) === 'prompt'
    && ev(ctx, 'STEP_KINDS.prompt.hasLayout') === false);
  ok('it seeds two answers, both unrouted (inert until configured)',
    ev(ctx, `instByIid("${pid}").answers.length`) === 2
    && ev(ctx, `instByIid("${pid}").answers.every(a=>a.target===null)`));

  /* A fork appended last has nothing after it, so nothing to jump to — the
     honest answer is an empty target list plus a warning, not a silent list
     of steps it cannot legally reach. */
  ok('a fork at the end of the sequence offers no targets',
    ev(ctx, `promptTargets(instByIid("${pid}")).length`) === 0);
  ev(ctx, `switchToInst("${pid}"); renderCanvas();`);
  ok('and says so instead of rendering an empty dropdown quietly',
    /can only route <b>forward<\/b>/.test(ev(ctx, 'document.getElementById("designerCanvas").innerHTML')));

  /* Move it to the front, where it has real targets. */
  ev(ctx, `moveStep("${pid}", "i2", true)`);
  const targets = ev(ctx, `promptTargets(instByIid("${pid}")).map(s=>s.tab)`);
  ok('moved earlier, it can target every LATER step', targets.length === 4, targets.join(' '));
  ok('and never an earlier one', !targets.includes('recordview'));
  ok('a More entry is never a fork target', ev(ctx, `promptTargets(instByIid("${pid}")).every(s=>s.placement==="step")`));

  /* Route answer 1 past Checklist to Book Labor, then drag the fork back to
     the end — the target is now behind it and must be cleared, not left
     pointing backwards. This is the case a target-time-only check misses. */
  ev(ctx, `setAnswerTarget("${pid}", instByIid("${pid}").answers[0].id, "i4")`);
  ok('an answer can route forward past intervening steps',
    ev(ctx, `instByIid("${pid}").answers[0].target`) === 'i4');
  ev(ctx, `moveStep("${pid}", "i5", false)`);
  ok('a reorder that would make a route point BACKWARDS clears it',
    ev(ctx, `instByIid("${pid}").answers[0].target`) === null);

  /* Deleting a step that something forks to must not leave a dangling id. */
  const ctx2 = boot();
  ev(ctx2, 'addStepPlacement = "step"; addInst("prompt","");');
  const p2 = ev(ctx2, 'state.steps[state.steps.length-1].iid');
  ev(ctx2, `moveStep("${p2}","i2",true); setAnswerTarget("${p2}", instByIid("${p2}").answers[0].id, "i4"); removeInst("i4");`);
  ok('removing a fork TARGET clears the route rather than dangling',
    ev(ctx2, `instByIid("${p2}").answers[0].target`) === null);
}

console.log('\nQuestion fork — translations (§29.4)');
{
  const ctx = boot();
  ev(ctx, 'addStepPlacement = "step"; addInst("prompt",""); ');
  const pid = ev(ctx, 'state.steps[state.steps.length-1].iid');
  ev(ctx, `state.authorLang = "EN"; setPromptQuestion("${pid}", "Is the asset safe to isolate?");`);
  ev(ctx, `state.authorLang = "ES"; setPromptQuestion("${pid}", "¿Es seguro aislar el activo?");`);
  ok('a question stores one string per language',
    ev(ctx, `instByIid("${pid}").question.EN`) === 'Is the asset safe to isolate?'
    && ev(ctx, `instByIid("${pid}").question.ES`) === '¿Es seguro aislar el activo?');
  ok('an untranslated language FALLS BACK to the base language, never blank',
    ev(ctx, `tx(instByIid("${pid}").question, "FR")`) === 'Is the asset safe to isolate?');
  ok('missing translations are reported by code',
    ev(ctx, `txMissing(instByIid("${pid}").question).join(",")`) === 'FR,DE,PT');

  /* An empty base language is the one state that genuinely breaks a gated
     step — a blank question the technician still has to answer. */
  ev(ctx, `state.authorLang = "EN"; setPromptQuestion("${pid}", ""); switchToInst("${pid}"); renderCanvas();`);
  ok('an empty base-language question is called out, not accepted silently',
    /<b>EN<\/b> question is empty/.test(ev(ctx, 'document.getElementById("designerCanvas").innerHTML')));
}

console.log('\nUser Defined Screens (§27) — placed, never authored here');
{
  const ctx = boot();
  ev(ctx, 'addStepPlacement = "step"; addInst("uds","uds-permit");');
  const uid = ev(ctx, 'state.steps[state.steps.length-1].iid');
  ok('a UDS takes an ordinary step row', ev(ctx, `instByIid("${uid}").kind`) === 'uds'
    && ev(ctx, `instByIid("${uid}").placement`) === 'step');
  ok('it can be a numbered, gated, Required step like any delivered tab',
    (() => { ev(ctx, `toggleStepRequired("${uid}", true); setStepGate("${uid}","reqDoc",true);`);
             return ev(ctx, `instByIid("${uid}").required`) === true && ev(ctx, `instByIid("${uid}").reqDoc`) === true; })());
  ok('it has no field layout of its own', ev(ctx, 'STEP_KINDS.uds.hasLayout') === false
    && ev(ctx, `!WORK_FIELDS[layoutKeyOf(instByIid("${uid}"))]`));

  ev(ctx, `switchToInst("${uid}"); renderCanvas();`);
  const html = ev(ctx, 'document.getElementById("designerCanvas").innerHTML');
  ok('the canvas states WHY the definition is read-only here', /Read-only here, on purpose/.test(html));
  ok('and names base UDS setup as the owner', /§27\.4 role 1/.test(html));
  ok('Required + UDS surfaces the group-side dead-end check', /hard dead end/.test(html));
}

console.log('\nClone capability gaps still hold at the instance grain');
{
  const ctx = boot();
  /* ZJ1000 has no Checklist and no Book Labor tab. Instances pointing at them
     must be withheld from the pane and REPORTED, and the report must not say
     "Checklist or Checklist" once a tab is placed twice. */
  ev(ctx, 'duplicateInst("i2"); state.baseFunction = "ZJ1000";');
  const missing = ev(ctx, 'missingSteps().map(s=>s.tab)');
  const labels  = ev(ctx, '[...new Set(missingSteps().map(instLabel))]');
  ok('both Checklist instances are recognised as unavailable', missing.filter(t => t === 'checklist').length === 2);
  /* A withheld tab must keep its proper name. This caught a real leak: with
     tabDefOf() resolving only against the CURRENT function's tabs, a tab the
     clone lacks resolved to null and instLabel() fell through to the raw id,
     so the banner read "no checklist or booklabor tab". */
  ok('a withheld tab keeps its human label, not its raw id',
    labels.includes('Checklist') && labels.includes('Checklist (2)') && labels.includes('Book Labor'),
    labels.join(','));
  ok('and the banner de-duplicates by label, so it never says "Checklist or Checklist"',
    new Set(labels).size === labels.length);
  ok('a UDS is never withheld by a clone tab set',
    (() => { ev(ctx, 'addStepPlacement="step"; addInst("uds","uds-loto");');
             return ev(ctx, 'missingSteps().every(s=>s.kind==="tab")'); })());
  ok('a fork is never withheld by a clone tab set',
    (() => { ev(ctx, 'addInst("prompt","");');
             return ev(ctx, 'missingSteps().every(s=>s.kind==="tab")'); })());
}

console.log('\nThe emulator never promises a step flow that does not exist');
{
  /* Three surfaces have no guided workflow, and all three used to be able to
     draw a "Next" bar off `inst.placement === 'step'` alone: the §11 fallback
     screen (no WO Workflow header at all), a More entry, and a step switched
     off. Subtle rather than loud — the screen renders, it just promises a
     button nothing would draw. */
  const ctx = boot();
  /* Closing rather than one of the seeded More rows (Comments, Activities…):
     those have no modelled field layout, so the canvas stops at its
     "isn't modeled in this prototype" empty state and draws no bar at all —
     which would pass a `!Next` check while proving nothing. Moving a step
     that HAS a layout across is what actually exercises the branch. */
  ev(ctx, 'setPlacement("i5","more"); switchToInst("i5"); renderCanvas();');
  let html = ev(ctx, 'document.getElementById("designerCanvas").innerHTML');
  ok('a More entry shows Save, never Next', /mob-save-btn/.test(html) && !/mob-next-bar/.test(html));
  ok('and carries no step rail', !/mob-step-rail/.test(html));
  ok('its comment gate is not previewed either — there is no Next to lock',
    ev(ctx, 'instByIid("i5").reqComment') === true && !/mob-gate-box/.test(html));

  ev(ctx, 'toggleStepVisible("i2", false); switchToInst("i2"); renderCanvas();');
  html = ev(ctx, 'document.getElementById("designerCanvas").innerHTML');
  ok('a step switched off shows Save, not Next', /mob-save-btn/.test(html) && !/mob-next-bar/.test(html));

  /* §11 fallback: a gate is configured, so this also proves the gate preview
     is suppressed rather than drawn over a non-existent Next. */
  const ctx2 = boot();
  ev(ctx2, 'setStepGate("i2","reqComment",true); state.woType = "none"; refreshShell(); switchToInst("i2"); renderCanvas();');
  html = ev(ctx2, 'document.getElementById("designerCanvas").innerHTML');
  ok('the §11 fallback screen shows Save, no rail and no gate preview',
    /mob-save-btn/.test(html) && !/mob-next-bar/.test(html)
    && !/mob-step-rail/.test(html) && !/mob-gate-box/.test(html));
}

console.log('\nRender paths survive every kind');
{
  const ctx = boot();
  ev(ctx, `addStepPlacement="step"; addInst("tab","recordview"); addInst("uds","uds-handover"); addInst("prompt","");
           addStepPlacement="more"; addInst("tab","comments");
           setStepGate("i2","reqComment",true);`);
  let threw = null;
  try {
    ev(ctx, 'state.steps.forEach(s => { switchToInst(s.iid); });');
    ev(ctx, 'renderTabPane(); renderStepRows(); renderMoreRows(); renderCanvas(); saveLayout();');
  } catch (e) { threw = e.message; }
  ok('every instance renders without throwing', threw === null, threw || 'clean');
  ok('the pane shows both lists', /tpStepRows/.test(ev(ctx, 'document.getElementById("tabPane").innerHTML'))
    && /tpMoreRows/.test(ev(ctx, 'document.getElementById("tabPane").innerHTML')));
}

console.log(fail ? '\n' + fail + ' assertion(s) FAILED' : '\nstep-instance model holds');
process.exit(fail ? 1 : 0);
