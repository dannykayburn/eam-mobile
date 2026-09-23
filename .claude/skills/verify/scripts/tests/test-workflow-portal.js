/* Workflow Designer Portal — the applied-artifact model (§30), added
   2026-09-16.

   WHY THIS FILE EXISTS. The portal reuses §29's step-instance model but
   re-implements the authoring of it on a drag-and-drop canvas, so every
   invariant test-step-instances.js pins for Screen Designer has to hold here
   too — through a completely different code path. Four of them are the kind
   that pass every smoke test while being broken:

     1. PER-INSTANCE LAYOUT INDEPENDENCE. The cheapest implementation points
        both instances at LAYOUTS[step]. It renders correctly, and it makes
        "Record View twice with different layouts" silently impossible
        because editing either edits both. Checked by mutating one and
        requiring the other to be untouched.

     2. FORK FORWARD-ONLY, RE-CHECKED AFTER A REORDER (§29.4). Dragging a
        fork later can turn a valid target into a backward one without
        anybody touching the fork. A guard that only runs when a target is
        picked passes any test that only picks targets.

     3. THE PINNED-STEP CLAMP AT THE MUTATION, NOT THE GEOMETRY. The clamp
        originally lived only in flowDragOver(), which the browser always
        runs before a drop — so the bug was invisible until something else
        called flowDrop(). Checked by calling flowDrop() directly with
        dropIdx = 0, which is what a future caller would do.

     4. COPY MUST NOT CARRY ASSIGNMENTS OR SHARE NIDS (§30.2). A copy that
        inherited assignments violates the one-per-(group, Type) rule on
        creation; a copy sharing node ids lets an edit to one workflow
        re-route the other's forks. Both render identically when wrong.

   NOTE ON CLASS NAMES: the rename pill is `node__orig`, not `node-orig` —
   renamed 2026-09-16 when the screen was rebuilt on the Octave component
   library and its own classes moved to BEM (§30.7). The assertion below is
   unchanged in intent: the delivered step label must still render as a pill
   once a node has been renamed. Several other asserted hooks were kept
   deliberately stable through that rebuild — `emu-*` (the device emulator
   keeps the device's own palette and class names), `--wo-type-*` (§23.3), and
   the `N/A` rail marker (§29.4).

   ALSO PINNED: the §30.2 collision report (a cross-artifact rule no single
   workflow can see), the Free Form conversion's dedupe/gate-clearing, that a
   More entry can never be gated (§14.8), and §23's refusal to invent a fifth
   WO Type hue. */
const path = require('path'), vm = require('vm');
const { runScreen } = require(path.join(__dirname, '..', 'run-load.js'));

const FILE = 'base screens/eam-workflow-portal-v1.html';

let fail = 0;
function ok(label, pass, detail) {
  console.log('  ' + (pass ? 'PASS' : 'FAIL') + '  ' + label + (detail !== undefined ? '  → ' + detail : ''));
  if (!pass) fail++;
}

/* Same reason as test-step-instances.js: top-level `let` in a vm script lands
   in the context's global lexical environment, not on the context object, so
   everything reads and writes through a script evaluated in that context —
   which is also how the screen's own inline handlers reach it. */
const ev = (ctx, expr) => vm.runInContext(expr, ctx);
/* evb — evaluate a BOOLEAN assertion without letting it kill the run. A
   compound expression that dereferences seeded data throws when an earlier
   bug empties that data, and a thrown assertion used to abort the whole
   file: 200 checks hidden by one. A throw is a failure, so it reports as
   one and the run continues. Found while negative-controlling the
   single-store assertion, which crashed the file before three other
   injected bugs could be reached. */
const evb = (ctx, expr) => {
  try {
    /* Some callers legitimately return an object and read properties off
       it, so the value is passed straight through. The ONLY thing corrected
       here is that a throw used to report PASS. */
    return vm.runInContext(expr, ctx);
  } catch (e) {
    console.log('        (evb threw: ' + e.message + ')');
    return false;
  }
};

function boot(wfId) {
  const ctx = runScreen(FILE, null);
  /* localStorage persists across runScreen calls in some harness configs, so
     start from the seeded defaults explicitly rather than inheriting whatever
     a previous case left behind. */
  ev(ctx, 'resetPortal();');
  if (wfId) ev(ctx, `openWf(${JSON.stringify(wfId)});`);
  /* Guard the harness itself — a test that boots into the wrong state and
     mostly passes is worse than one that fails. */
  if (ev(ctx, 'WFS.length') !== 5) {
    throw new Error('boot() did not seed 5 workflows, got ' + ev(ctx, 'WFS.length'));
  }
  if (wfId && ev(ctx, 'state.view') !== 'edit') {
    throw new Error('boot() did not enter edit mode for ' + wfId);
  }
  return ctx;
}
/* A stub drag event. The harness's DOM returns one rect for every element, so
   the geometry that picks an index is not meaningfully testable here; dropIdx
   is set directly and the INSERTION ARITHMETIC is what gets asserted. */
const DRAG_EV = `{preventDefault(){},stopPropagation(){},clientY:0,
  currentTarget:{getBoundingClientRect(){return {top:0,height:40};},
  querySelector(){return null;},classList:{add(){},remove(){},toggle(){}}}}`;

/* ═══════════════════════════════════════════════════════════════════════
   OCTAVE DESIGN-SYSTEM CONFORMANCE — static, and it earns its place
   ═══════════════════════════════════════════════════════════════════════
   These are file checks rather than runScreen() checks, because the failure
   they catch is invisible at runtime: a MISTYPED TOKEN NAME. `var(--nope)`
   with no fallback resolves to nothing, the rule silently does not apply,
   and the screen still renders — just wrong. That is exactly what happened
   during the rebuild: four typography tokens were written `h5` /
   `subtitle-2` when the package ships `h-5` / `sub-title-2`, so four type
   sizes were silently inheriting the body size. Nothing at runtime would
   ever have told us.

   Also pinned here: the two documented EXCEPTIONS to the design system, so
   they cannot quietly multiply. Octave forbids referencing raw primitives in
   a component and mandates Material Symbols for every icon; this screen
   breaks both exactly once, for WO Type (§23.3), because that badge has to
   be byte-identical to what the technician's device draws.
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\nOctave design-system conformance');
{
  const fsx = require('fs');
  /* tests → scripts → verify → skills → .claude → repo root: five levels. */
  const dir = path.join(__dirname, '..', '..', '..', '..', '..', 'prototypes', 'standalone', 'base screens');
  const file = path.join(dir, 'eam-workflow-portal-v1.html');
  const tokFile = path.join(dir, 'DESIGN_FILES', 'uxt-tokens.css');
  const html = fsx.readFileSync(file, 'utf8');

  ok('the token package is present and linked (a runtime dependency now)',
    fsx.existsSync(tokFile) && html.indexOf('DESIGN_FILES/uxt-tokens.css') > -1);

  const tok = fsx.readFileSync(tokFile, 'utf8');
  const declared = new Set([...tok.matchAll(/(--uxt-theme-[a-z0-9-]+)\s*:/g)].map(m => m[1]));
  const referenced = [...new Set([...html.matchAll(/var\((--uxt-theme-[a-z0-9-]+)/g)].map(m => m[1]))];
  const unresolved = referenced.filter(t => !declared.has(t));
  /* THE ASSERTION THAT MATTERS MOST in this block. */
  ok('every uxt token referenced actually resolves', unresolved.length === 0,
    unresolved.length ? unresolved.join(', ') : referenced.length + ' referenced, all resolve');

  /* Exception 1 — primitives. Four WO Type hexes, and no fifth. */
  const hexes = ['#F5821F', '#2563EB', '#7C3AED', '#F2C94C'];
  ok('WO Type keeps its four §23.3 hexes, copied not re-picked', hexes.every(h => html.indexOf(h) > -1));

  /* Exception 2 — icons. Material Symbols everywhere except the WO Type
     glyphs, plus the fork-wire arrowhead, which is a graphic primitive
     rather than an icon. */
  ok('Material Symbols is the icon set', html.indexOf('Material+Symbols+Outlined') > -1);
  const glyphs = html.match(/const WO_TYPE_ICON_GLYPHS = \{[\s\S]*?\n\};/);
  const svgAll = (html.match(/<(?:path|rect|line|polyline|circle) /g) || []).length;
  const svgGlyph = glyphs ? (glyphs[0].match(/<(?:path|rect|line|polyline|circle) /g) || []).length : -1;
  ok('inline SVG is only the WO Type glyphs + the wire arrowhead', svgAll === svgGlyph + 1,
    svgAll + ' total vs ' + svgGlyph + ' glyphs + 1');

  /* The emulator is the one region Octave tokens deliberately do NOT reach:
     it is a picture of the technician's app, which has its own locked
     palette. Its device tokens must be declared on .emu and nowhere else, or
     the quarantine has leaked. */
  const emuStart = html.indexOf('.emu{');
  const emuEnd = html.indexOf('/* ══ PREVIEW MODAL EXTRAS ══ */');
  const emu = emuStart > -1 && emuEnd > emuStart ? html.slice(emuStart, emuEnd) : '';
  const dDecl = new Set([...html.matchAll(/(--d-[a-z0-9-]+)\s*:/g)].map(m => m[1]));
  const dUsed = [...new Set([...html.matchAll(/var\((--d-[a-z0-9-]+)/g)].map(m => m[1]))];
  ok('the device palette is declared only inside .emu',
    dDecl.size > 0 && (emu.match(/--d-[a-z0-9-]+\s*:/g) || []).length === dDecl.size,
    dDecl.size + ' device tokens');
  ok('every device token referenced is declared', dUsed.every(t => dDecl.has(t)));
  ok('green still means complete on the device (§23, not Octave severity)',
    emu.indexOf('--d-green:#16C130') > -1 && emu.indexOf('.emu-seg.done{background:var(--d-green)') > -1);
  ok('the portal\'s own tokens do not reach into the emulator',
    !/var\(--fg-|var\(--bg-surface|var\(--accent/.test(emu));

  /* The user's no-caps instruction, and Octave's own agreement with it. */
  ok('no text-transform:uppercase anywhere', !/text-transform:\s*uppercase/.test(html));

  /* §30.6/§30.7: the portal is the single base-screen entry point and has NO
     links out. Screen Designer is not a standalone destination — it is
     invoked per step node and opens in this file's own panel — so a stray
     location.href to a sibling screen would undo the entry-point decision
     without anybody deciding anything. That is how the dead User Group Setup
     link happened in the first place, so it is pinned rather than trusted. */
  const linksOut = [...html.matchAll(/location\.href\s*=\s*'([^']+)'/g)].map(m => m[1]);
  ok('the portal has no links out to sibling screens', linksOut.length === 0,
    linksOut.length ? linksOut.join(', ') : 'none');
  /* Prose still mentions the standalone file (it is where several data
     structures were copied from), so this checks for NAVIGATION to it, not
     for the string. The node menu must be the only way in. */
  const navToSd = /(?:location\.href\s*=|href=")[^"';]*screen-designer/.test(html);
  ok('nothing navigates to a standalone Screen Designer', !navToSd);
  ok('Screen Designer is opened from a step node\'s menu', html.indexOf('openDsn(') > -1);

  /* Every class the file emits must have a rule, or a component renders bare. */
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const cssClasses = new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map(m => m[1]));
  const emitted = new Set();
  [...html.matchAll(/class="([^"{}+']+)"/g)].forEach(m =>
    m[1].split(/\s+/).forEach(c => { if (c && !/[^\w-]/.test(c)) emitted.add(c); }));
  const bare = [...emitted].filter(c => !cssClasses.has(c) && !/^ms(-\d+)?$/.test(c));
  ok('every statically-emitted class has a CSS rule', bare.length === 0,
    bare.length ? bare.join(', ') : emitted.size + ' classes checked');
}

console.log('\nThe artifact model');
{
  const ctx = boot('wf-bk-full');
  ok('5 workflows seeded, 2 of them Free Form',
    ev(ctx, 'WFS.length') === 5 && ev(ctx, 'WFS.filter(w=>w.freeForm).length') === 2);
  ok('a node is a step instance carrying placement + gates',
    ev(ctx, 'wf().nodes.every(n=>n.kind&&n.zone&&"required" in n||n.kind==="fork")'));
  ok('Record View instance 1 is pinned', ev(ctx, '!!flowNodes(wf())[0].pinned'));
  ok('layout key of instance 1 is the bare step id (no migration implied)',
    ev(ctx, 'layoutKey(wf().nodes[0])') === 'recordview');
  ok('the More group is real rows, not a static list',
    ev(ctx, 'refNodes(wf()).length') === 3, ev(ctx, 'refNodes(wf()).map(n=>n.step).join(" ")'));
  ok('forks are excluded from the numbered sequence',
    ev(ctx, 'seqNodes(wf()).every(n=>n.kind==="step")'));
}

console.log('\nA step placed twice — the layouts must be INDEPENDENT');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'duplicateNode(wf().nodes[0].nid);');
  const i2 = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===2)';
  ok('instance 2 exists', ev(ctx, `!!${i2}`));
  ok('layout key of instance 2 appends the page variant',
    ev(ctx, `layoutKey(${i2})`) === 'recordview#2', ev(ctx, `layoutKey(${i2})`));
  ok('the (2) suffix and the layout key agree',
    ev(ctx, `${i2}.name`) === 'Record View (2)', ev(ctx, `${i2}.name`));
  ok('instance 2 holds a SEPARATE layout object',
    ev(ctx, `${i2}.layout !== wf().nodes[0].layout`));
  /* THE ASSERTION THAT MATTERS MOST. */
  ev(ctx, `${i2}.layout[0].fields[0].behavior = "hid";`);
  ok('editing instance 2 does NOT change instance 1',
    ev(ctx, 'wf().nodes[0].layout[0].fields[0].behavior') !== 'hid',
    ev(ctx, 'wf().nodes[0].layout[0].fields[0].behavior'));
  ok('the duplicate is never pinned', ev(ctx, `!${i2}.pinned`));
  /* Smallest-unused rather than count+1, so deleting a middle instance does
     not leave a permanent hole in the layout keys. */
  ev(ctx, `duplicateNode(${i2}.nid); deleteNode(${i2}.nid);`);
  ok('a freed instance number is reused, not skipped',
    ev(ctx, 'mintInst(wf(),"recordview")') === 2, String(ev(ctx, 'mintInst(wf(),"recordview")')));
}

console.log('\nThe pinned step (§14) — enforced at the mutation, not the geometry');
{
  const ctx = boot('wf-bk-full');
  const first = ev(ctx, 'flowNodes(wf())[0].nid');
  ev(ctx, 'deleteNode(flowNodes(wf())[0].nid);');
  ok('the pinned Record View cannot be deleted', ev(ctx, 'flowNodes(wf())[0].nid') === first);
  ev(ctx, 'moveToRef(flowNodes(wf())[0].nid, true);');
  ok('the pinned Record View cannot be pushed into More',
    ev(ctx, 'flowNodes(wf())[0].nid') === first && ev(ctx, 'flowNodes(wf())[0].zone') === 'flow');
  /* flowDrop() called directly with dropIdx 0 — what a caller that never went
     through flowDragOver() does. This is the regression the clamp move fixed. */
  ev(ctx, `drag={from:'lib',stepId:'parts'}; dropIdx=0; dropZone='flow'; flowDrop(${DRAG_EV});`);
  ok('a direct drop at index 0 still cannot precede the pinned step',
    ev(ctx, 'flowNodes(wf())[0].nid') === first, ev(ctx, 'flowNodes(wf())[0].name'));
  ok('but the dropped step did land', ev(ctx, 'flowNodes(wf())[1].step') === 'parts');
}

console.log('\nDrop arithmetic — the auto-laid-out column');
{
  const ctx = boot();
  ev(ctx, 'createWf();');
  const names = 'flowNodes(wf()).map(n=>n.kind==="fork"?"FORK":n.name).join(" > ")';
  ev(ctx, `drag={from:'lib',stepId:'recordview'}; dropIdx=0; dropZone='flow'; flowDrop(${DRAG_EV});`);
  ev(ctx, `drag={from:'lib',stepId:'closing'}; dropIdx=1; dropZone='flow'; flowDrop(${DRAG_EV});`);
  ev(ctx, `drag={from:'lib',stepId:'booklabor'}; dropIdx=1; dropZone='flow'; flowDrop(${DRAG_EV});`);
  ok('a drop BETWEEN two nodes lands in the middle',
    ev(ctx, names) === 'Record View > Book Labor > Closing', ev(ctx, names));
  const lab = ev(ctx, 'wf().nodes.find(n=>n.step==="booklabor").nid');
  ev(ctx, `drag={from:'canvas',nid:${JSON.stringify(lab)}}; dropIdx=3; dropZone='flow'; flowDrop(${DRAG_EV});`);
  ok('moving a node LATER accounts for its own removal',
    ev(ctx, names) === 'Record View > Closing > Book Labor', ev(ctx, names));
  ev(ctx, `drag={from:'canvas',nid:${JSON.stringify(lab)}}; dropIdx=1; dropZone='flow'; flowDrop(${DRAG_EV});`);
  ok('moving a node EARLIER lands where the indicator showed',
    ev(ctx, names) === 'Record View > Book Labor > Closing', ev(ctx, names));
  ok('sequence numbers are derived from the array, never stored',
    ev(ctx, 'seqNodes(wf()).map(n=>seqNo(wf(),n)).join(",")') === '1,2,3');
}

console.log('\nThe More group (§14.8) — a More entry can never be gated');
{
  const ctx = boot('wf-bk-full');
  const cls = 'wf().nodes.find(n=>n.step==="closing")';
  ok('Closing starts Required and comment-gated',
    ev(ctx, `${cls}.required && ${cls}.reqComment`));
  ev(ctx, `moveToRef(${cls}.nid, true);`);
  ok('moving it to More clears Required and BOTH gates',
    ev(ctx, `${cls}.zone==="ref" && !${cls}.required && !${cls}.reqComment && !${cls}.reqDoc`));
  ok('a More destination draws no bottom bar (the rail is the way back)',
    ev(ctx, `emulatorHtml(wf(),${cls},null,false).indexOf('emu-bar')`) === -1);
  ev(ctx, `drag={from:'lib',stepId:'fork'}; dropZone='ref'; refDrop(${DRAG_EV});`);
  ok('a fork cannot live in the More group (nothing sequences it)',
    ev(ctx, 'refNodes(wf()).every(n=>n.kind!=="fork")'));
  /* Placement is a field on the instance row, which is what makes "either a
     Step or a More entry, never both" true by construction (§29.2). */
  ok('placement is one field, so the two lists cannot disagree',
    ev(ctx, 'flowNodes(wf()).concat(refNodes(wf())).length') === ev(ctx, 'wf().nodes.length'));
}

console.log('\nQuestion forks (§29.4) — forward-only, enforced twice');
{
  const ctx = boot('wf-pm-routed');
  const fork = 'wf().nodes.find(n=>n.kind==="fork")';
  ok('the seeded fork routes forward', ev(ctx, `!!${fork}`));
  ok('a fork created fresh does not pre-route itself',
    ev(ctx, 'mkNode("fork",{}).yesTarget') === null);
  /* Case 1: a target picked backward. */
  ev(ctx, `${fork}.yesTarget = wf().nodes[0].nid;`);
  const cleared = ev(ctx, 'validateForks(wf())');
  ok('a BACKWARD target is cleared to "continue"', ev(ctx, `${fork}.yesTarget`) === null);
  ok('and the clear is counted, so the UI can say what it rewrote', cleared >= 1, String(cleared));
}
{
  /* Case 2: nobody touched the fork — the fork MOVED. This is the one a
     pick-time-only guard misses entirely. */
  const ctx = boot('wf-pm-routed');
  const fork = 'wf().nodes.find(n=>n.kind==="fork")';
  ev(ctx, `${fork}.noTarget = wf().nodes.find(n=>n.step==="booklabor").nid;`);
  ok('precondition: the fork has a forward target', ev(ctx, `!!${fork}.noTarget`));
  ev(ctx, `drag={from:'canvas',nid:${fork}.nid}; dropIdx=flowNodes(wf()).length; dropZone='flow'; flowDrop(${DRAG_EV});`);
  ok('dragging the fork PAST its target clears the now-backward route',
    ev(ctx, `${fork}.noTarget`) === null);
}
{
  /* Case 3: the target is deleted. A dangling id silently falls through to
     the next step, which §29.4 names as the failure nobody notices until a
     technician is standing in front of the asset. */
  const ctx = boot('wf-pm-routed');
  const fork = 'wf().nodes.find(n=>n.kind==="fork")';
  ev(ctx, `${fork}.noTarget = wf().nodes.find(n=>n.step==="booklabor").nid;`);
  ev(ctx, 'deleteNode(wf().nodes.find(n=>n.step==="booklabor").nid);');
  ok('deleting a target clears every fork pointing at it, no dangling id',
    ev(ctx, `${fork}.noTarget`) === null);
}

/* ═══════════════════════════════════════════════════════════════════════
   PARITY — ported from the standalone designer (§30.9)
   ═══════════════════════════════════════════════════════════════════════
   The five features the embedded panel was missing, moved across on
   2026-09-16 so the standalone surface could go away. Two of them are
   WORKFLOW-level rather than panel-level and are placed accordingly: the
   base-screen function decides which steps can exist at all, and §12's
   completion trio is keyed on WO Type with no Group dimension. Putting
   either in the panel would scope it to one step, which is the wrong grain.
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\nParity: base screen / function (§26.2)');
{
  const ctx = boot('wf-bk-full');
  ok('every workflow resolves to a function, defaulting to the base screen',
    ev(ctx, 'wf().fn') === 'WSJOBS', ev(ctx, 'wf().fn'));
  ok('switching on FAMILY, never on the code (§26.2)',
    ev(ctx, 'BASE_FUNCTIONS.every(f=>f.family==="wo"||f.family==="equip")'));
  ok('four WSJOBS clones are present, as the real export has',
    ev(ctx, 'BASE_FUNCTIONS.filter(f=>f.parent==="WSJOBS").length') === 4);
  /* The alias list exists because the mobile screens say WSEQUIP and the
     designer has always said EQUIPMENT. */
  ok('an alias resolves to its function', ev(ctx, 'fnByAnyCode("WSEQUIP").code') === 'EQUIPMENT');
  ok('an unknown code resolves to nothing rather than guessing',
    ev(ctx, 'fnByAnyCode("NOPE")') === null);
  /* Unknown tab ⇒ allow, so a tab added to STEP_LIB does not silently vanish
     from every clone until someone updates the arrays. */
  ok('an unlisted tab is allowed rather than blocked',
    ev(ctx, 'fnHasTab(wf(),"not-a-tab")') === true);
  ok('WSJOBS can render every library step',
    ev(ctx, 'STEP_LIB.every(s=>fnHasTab(wf(),s.id))'));
}
{
  /* ZJ1000 is deliberately capability-limited: a designer that only ever sees
     full clones ships without the "this step cannot exist here" path. */
  const ctx = boot();
  ok('the capability-limited clone really is limited',
    ev(ctx, 'fnByCode("ZJ1000").tabs.indexOf("checklist")') === -1);
  const w = 'WFS.find(x=>x.id==="wf-free-any")';
  ok('a demo workflow ships ON that clone, so the gap path is visible on load',
    ev(ctx, w + '.fn') === 'ZJ1000');
  ok('and it reports a real capability gap', ev(ctx, 'capabilityGaps(' + w + ').length') > 0,
    ev(ctx, 'capabilityGaps(' + w + ').map(n=>n.step).join(",")'));
  /* REPORTED, never worked around (§26.5.1) — the offending step stays. */
  ev(ctx, 'state.wfId="wf-free-any"; state.view="edit"; render();');
  /* The summary banner was removed 2026-09-16. The gap is still
     unmissable and now sits ON the offending node as its own tag, which is
     both where it is legible and the only place it can be acted on. */
  ok('the gap is reported ON THE NODE, not in a summary banner',
    ev(ctx, 'document.getElementById("cv").innerHTML.indexOf("has no such tab")') > -1 &&
    ev(ctx, 'capabilityGaps(wf()).length') > 0);
  ok('and no roll-up banner is rendered for it',
    ev(ctx, 'capabilityBannerHtml(wf())') === '');
  ok('the offending step is still present in the workflow',
    ev(ctx, 'wf().nodes.some(n=>n.step==="documents")'));
  ok('the library disables what the function cannot render',
    ev(ctx, 'document.getElementById("libBody").innerHTML.indexOf("has no")') > -1);
}
{
  /* A family switch is the destructive case, so it confirms; a clone switch
     inside one family does not. */
  const ctx = boot('wf-bk-full');
  ev(ctx, 'setWfFunction("CCJOBS");');
  ok('switching clone inside a family applies immediately', ev(ctx, 'wf().fn') === 'CCJOBS');
  ev(ctx, 'setWfFunction("EQUIPMENT");');
  ok('switching FAMILY with steps placed asks first', ev(ctx, 'wf().fn') === 'CCJOBS',
    'still ' + ev(ctx, 'wf().fn'));
  ok('...and the confirm is what is on screen',
    ev(ctx, 'document.getElementById("mbox").innerHTML.indexOf("Switch to the Equipment screen?")') > -1);
}

console.log('\nParity: §12 completion status');
{
  const ctx = boot('wf-bk-full');
  ok('a workflow carries the completion trio', ev(ctx, 'wf().completionEntity') === 'wo' &&
    ev(ctx, 'wf().startWorkStatus') === 'INPROG' && ev(ctx, 'wf().completionStatus') === 'CLOSE');
  /* An EVST code is not an AAST code, so carrying them over would leave a
     status that does not exist in the new domain. */
  ev(ctx, 'setCompletionEntity("activity");');
  ok('switching entity re-bases BOTH statuses to that domain',
    ev(ctx, 'wf().completionStatus') === 'COMPLETE' &&
    ev(ctx, 'statusListForEntity("activity").some(s=>s.code===wf().completionStatus)'));
  ok('and the old EVST code is gone rather than carried over',
    ev(ctx, 'wf().completionStatus') !== 'CLOSE');
}

console.log('\nParity: UDS placement (§27.4 / §29.5)');
{
  const ctx = boot('wf-bk-full');
  const dropUds = (id, idx) => ev(ctx,
    "drag={from:'lib',stepId:'uds:" + id + "'}; dropIdx=" + idx + "; dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  dropUds('uds-permit', 1);
  const u = 'wf().nodes.find(n=>n.kind==="uds")';
  ok('a UDS drops in as its own KIND', ev(ctx, '!!' + u) && ev(ctx, u + '.kind') === 'uds');
  ok('it takes its label from the definition', ev(ctx, u + '.name') === 'UDS Tab 1');
  /* §29.5: a UDS takes an ordinary tier-2 row, so it numbers and gates like a
     delivered tab — no separate placement model. */
  ok('it counts as a real numbered step', ev(ctx, 'seqNodes(wf()).some(n=>n.kind==="uds")'));
  ok('it can be Required and gated like any step',
    ev(ctx, '"required" in ' + u + ' && "reqComment" in ' + u));
  /* It carries NO layout: base EAM owns the definition (§27.4 role 1). */
  ok('it carries no field layout of its own', ev(ctx, u + '.layout') === undefined);
  dropUds('uds-permit', 1);
  ok('a second placement of the same UDS numbers itself', evb(ctx,
    '(function(){var all=wf().nodes.filter(n=>n.kind==="uds"&&n.uds==="uds-permit");' +
    'return all.length===2 && all.some(n=>n.inst===2) && all.some(n=>n.name.indexOf("(2)")>-1);})()'));
  /* The panel is read-only BY CONSTRUCTION — no add-field, no container list,
     no property menu. That is the §27.2 mistake it must not repeat. */
  ev(ctx, 'openDsn(' + u + '.nid);');
  const body = () => ev(ctx, 'document.getElementById("dsnBody").innerHTML');
  ok('the UDS panel opens', ev(ctx, '!document.getElementById("dsn").classList.contains("closed")'));
  ok('it states that it is read-only, and why', body().indexOf('Read-only here, on purpose') > -1);
  ok('it offers NO field authoring', body().indexOf('openAddField') === -1 &&
    body().indexOf('addContainer') === -1 && body().indexOf('fieldMenu') === -1);
  ok('it still previews in the real step rail', body().indexOf('emu-rail-pill') > -1);
  /* A Required UDS is the §27.4 dead-end combination. */
  ev(ctx, u + '.required = true; renderDsn();');
  ok('Required + UDS is reported as the dead-end combination it is',
    body().indexOf('Required + UDS') > -1);
}
{
  /* A UDS must be skippable by a fork exactly like a tab — it is a step. */
  const ctx = boot('wf-pm-routed');
  /* POSITION-INDEPENDENT: dropIdx used to be the literal 3, which broke the
     day a condition fork was seeded into this same workflow and shifted the
     flow by one. The assertion is about a UDS sitting BETWEEN a fork and
     its target, so it drops immediately after the question fork wherever
     that happens to be.  */
  ev(ctx, "drag={from:'lib',stepId:'uds:uds-loto'};" +
    "dropIdx=flowNodes(wf()).findIndex(function(n){return n.kind==='fork';})+1;" +
    "dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  const r = evb(ctx,
    '(function(){var w=wf(), fl=flowNodes(w), f=w.nodes.find(n=>n.kind==="fork");' +
    'var lab=w.nodes.find(n=>n.step==="booklabor"); f.noTarget=lab.nid;' +
    'var na=naSet(w,{[f.nid]:"no"}); var u=w.nodes.find(n=>n.kind==="uds");' +
    'return {udsSkipped:na.has(u.nid), udsInSeq:seqNodes(w).indexOf(u)>-1};})()');
  ok('a UDS between a fork and its target is marked N/A like any step', r.udsSkipped);
  ok('and it is in the numbered sequence to begin with', r.udsInSeq);
}

console.log('\nParity: Field Grid Section — spans (§5.2)');
{
  const ctx = boot('wf-bk-full');
  const rv = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===1)';
  /* The invariant is "every grid cell HAS a span", not that it is 1 — the
     real WO Record View layout ships full-width cells (Equipment, Location,
     Material List), so asserting 1 would be asserting the demo data. */
  ok('every grid cell carries a span once normalised', ev(ctx,
    rv + '.layout.filter(s=>s.layout==="grid").every(s=>s.fields.every(f=>f.type==="button"||f.span>=1))'));
  ev(ctx, 'openDsn(' + rv + '.nid); setFieldSpan(' + rv + '.nid,0,0,2);');
  ok('a cell can be stretched to full width', ev(ctx, rv + '.layout[0].fields[0].span') === 2);
  ok('the span reaches the rendered cell',
    ev(ctx, 'document.getElementById("dsnBody").innerHTML.indexOf("grid-column:span 2")') > -1);
  ok('the resize grip is rendered only in the editable panel',
    ev(ctx, 'document.getElementById("dsnBody").innerHTML.indexOf("grid-grip")') > -1 &&
    ev(ctx, 'emulatorHtml(wf(),' + rv + ',null,false).indexOf("grid-grip")') === -1);
  /* A lone 1-span cell dangling in the last row reads as a layout mistake,
     so autoBalanceGrid widens it. */
  ok('a lone trailing cell auto-widens rather than dangling', evb(ctx,
    '(function(){var nd=' + rv + ', sec=nd.layout[0];' +
    'sec.fields.forEach(function(f){f.span=1;});' +
    'while(sec.fields.length>3) sec.fields.pop();' +
    'autoBalanceGrid(sec);' +
    'return sec.fields[sec.fields.length-1].span===2;})()'));
  ok('an even grid is left alone', evb(ctx,
    '(function(){var sec={layout:"grid",fields:[{span:1},{span:1},{span:1},{span:1}]};' +
    'autoBalanceGrid(sec);' +
    'return sec.fields.every(function(f){return f.span===1;});})()'));
}

console.log('\nParity: fork translations (§29.4)');
{
  const ctx = boot('wf-pm-routed');
  const f = 'wf().nodes.find(n=>n.kind==="fork")';
  ok('fork text is stored as a language-keyed map',
    ev(ctx, 'typeof ' + f + '.question') === 'object');
  ok('the seeded question lands in the base language',
    ev(ctx, 'tx(' + f + '.question,"EN").length') > 0);
  /* THE LOAD-BEARING RULE: a missing translation falls back, never blanks —
     an empty question on a gated step is unanswerable. */
  ok('a missing translation falls back to the base language, never blank',
    ev(ctx, 'tx(' + f + '.question,"FR")') === ev(ctx, 'tx(' + f + '.question,"EN")'));
  ok('the missing-language report lists the untranslated ones',
    ev(ctx, 'txMissing(' + f + '.question).join(",")') === 'ES,FR,DE,PT');
  /* Writing a translation must not touch the base language. */
  ev(ctx, 'state.selNid=' + f + '.nid; setAuthorLang("FR"); setForkText(' + f + '.nid,"question","Defaut trouve ?");');
  ok('a translation writes only its own slot', ev(ctx, f + '.question.FR') === 'Defaut trouve ?');
  ok('...and leaves the base language untouched',
    ev(ctx, f + '.question.EN').indexOf('defect') > -1);
  ok('the report shrinks as languages are filled',
    ev(ctx, 'txMissing(' + f + '.question).indexOf("FR")') === -1);
  ev(ctx, 'setAuthorLang("EN");');
  /* A plain string from pre-translation persisted data must migrate on read. */
  ok('a pre-translation string value still reads', ev(ctx, 'tx("legacy string","EN")') === 'legacy string');
  ok('toTx normalises a string into a base-language map',
    ev(ctx, 'toTx("x").EN') === 'x' && ev(ctx, 'typeof toTx("x")') === 'object');
  /* The canvas and emulator read through tx(), so they never show a blank. */
  ok('the canvas card shows the base-language question',
    ev(ctx, 'document.getElementById("cv").innerHTML.indexOf("defect")') > -1);
}

console.log('\nParity: Time Entry Mode, per instance (§18.4 / §29)');
{
  const ctx = boot('wf-bk-full');
  const lab = 'wf().nodes.find(n=>n.step==="booklabor")';
  ok('Book Labor seeds a time entry mode', ev(ctx, lab + '.timeEntry') === 'startend');
  ok('other steps do not carry one', ev(ctx, 'wf().nodes.find(n=>n.step==="closing").timeEntry') === undefined);
  /* PER INSTANCE: Book Labor can be placed twice, and two placements sharing
     one mode would be a coupling nothing on screen explains. */
  ok('two Book Labor placements can hold DIFFERENT modes', evb(ctx,
    '(function(){var first=' + lab + ';' +
    'duplicateNode(first.nid);' +
    'var all=wf().nodes.filter(function(n){return n.step==="booklabor";});' +
    'if(all.length!==2) return false;' +
    'setTimeEntry(all[1].nid,"direct");' +
    'return all[0].timeEntry==="startend" && all[1].timeEntry==="direct";})()'));
  ok('the mode shows on the node card',
    ev(ctx, 'document.getElementById("cv").innerHTML.indexOf("Direct hours")') > -1);
}


/* The per-option helper strings that were removed from the field menu on
   2026-09-16. Asserted ABSENT — listed here so the check is against the real
   removed text rather than a guess at it. */
const BEHAV_DESCS = [
  'Next stays locked until it has a value',
  'Editable, no constraint',
  'Visible, never editable on the device',
  'Not rendered at all for this group',
  'Struck through — the field exists but has no value here',
];

/* ═══════════════════════════════════════════════════════════════════════
   THE REWORKED DESIGNER — containers, display states, field sidebar
   ═══════════════════════════════════════════════════════════════════════
   2026-09-16. §5.2 CHANGED here, on direct instruction: a field grid no
   longer has to be the only container at the top of a form with collapsible
   sections beneath it. Any container can be Grid or List, anywhere — with
   one constraint that survived ("nothing goes above the first container")
   and one that follows from what a grid IS (a two-up field grid has no
   collapsed state; collapsing it to a header strip loses the thing it
   exists for — but it CAN be hidden).

   The assertions below are the ones that would pass a smoke test while
   being wrong: a grid that accepts `collapsed`, a container that can be
   dragged above the pinned first one, and the Activities container being
   treated as an ordinary field container when it is not one.
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\nDesigner: container display states (§5.2, revised)');
{
  const ctx = boot('wf-bk-full');
  const rv = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===1)';
  ev(ctx, 'openDsn(' + rv + '.nid);');
  ok('every container normalises to a display state',
    ev(ctx, rv + '.layout.every(s=>["expanded","collapsed","hidden"].indexOf(s.display)>-1)'));
  /* A grid offers Expanded / Hidden and NOT Collapsed — the menu simply does
     not show a state the container has no mode for. */
  const gridIdx = ev(ctx, rv + '.layout.findIndex(s=>s.layout==="grid")');
  ok('a grid container exists to test against', gridIdx > -1, String(gridIdx));
  ok('a grid offers Expanded and Hidden only',
    ev(ctx, 'containerStates(' + rv + '.layout[' + gridIdx + ']).map(x=>x[0]).join(",")') === 'expanded,hidden');
  ok('a list offers all three',
    ev(ctx, 'containerStates({layout:"list"}).map(x=>x[0]).join(",")') === 'expanded,collapsed,hidden');
  /* THE ASSERTION THAT MATTERS: grid + collapsed must be refused, not
     stored. A stored-but-unrenderable state is the kind that only shows up
     on a device. */
  ev(ctx, 'setContainerDisplay(' + rv + '.nid,' + gridIdx + ',"collapsed");');
  ok('a grid REFUSES collapsed rather than storing it',
    ev(ctx, rv + '.layout[' + gridIdx + '].display') !== 'collapsed',
    ev(ctx, rv + '.layout[' + gridIdx + '].display'));
  ev(ctx, 'setContainerDisplay(' + rv + '.nid,' + gridIdx + ',"hidden");');
  ok('...but a grid CAN be hidden',
    ev(ctx, rv + '.layout[' + gridIdx + '].display') === 'hidden',
    ev(ctx, rv + '.layout[' + gridIdx + '].display'));
  ev(ctx, 'setContainerDisplay(' + rv + '.nid,' + gridIdx + ',"expanded");');
  /* And a list that IS collapsed drops its body but keeps its header. */
  const listIdx = ev(ctx, rv + '.layout.findIndex(s=>s.layout==="list"&&s.std!==false)');
  ev(ctx, 'setContainerDisplay(' + rv + '.nid,' + listIdx + ',"collapsed");');
  ok('a list accepts collapsed', ev(ctx, rv + '.layout[' + listIdx + '].display') === 'collapsed');
  const body = () => ev(ctx, 'document.getElementById("dsnBody").innerHTML');
  ok('a collapsed container keeps its header and drops its body',
    body().indexOf('emu-secbody--collapsed') > -1 &&
    body().indexOf(ev(ctx, rv + '.layout[' + listIdx + '].container')) > -1);
  /* Switching a collapsed list to a grid cannot leave it collapsed. */
  ev(ctx, 'toggleContainerLayout(' + rv + '.nid,' + listIdx + ');');
  ok('becoming a grid drops a collapsed state it cannot honour',
    ev(ctx, rv + '.layout[' + listIdx + '].display') === 'expanded' &&
    ev(ctx, rv + '.layout[' + listIdx + '].layout') === 'grid');
}

console.log('\nDesigner: the first container is pinned (§5.2)');
{
  const ctx = boot('wf-bk-full');
  const rv = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===1)';
  ev(ctx, 'openDsn(' + rv + '.nid);');
  const first = ev(ctx, rv + '.layout[0].container');
  const count = ev(ctx, rv + '.layout.length');
  ok('more than one container, so order is meaningful', count > 1, String(count));
  /* Clamped at the MUTATION, not only in the drag geometry — same lesson as
     the pinned Record View step: a caller that skips the dragover would walk
     straight past a geometry-only guard. */
  ev(ctx, 'moveContainer(' + rv + '.nid,0,2);');
  ok('the pinned first container cannot be moved', ev(ctx, rv + '.layout[0].container') === first);
  ev(ctx, 'moveContainer(' + rv + '.nid,2,0);');
  ok('nothing can be moved ABOVE it', ev(ctx, rv + '.layout[0].container') === first,
    ev(ctx, rv + '.layout[0].container'));
  ok('...and the move still happened, clamped to position 1',
    ev(ctx, rv + '.layout.length') === count);
  ev(ctx, 'delContainer(' + rv + '.nid,0);');
  ok('it cannot be removed', ev(ctx, rv + '.layout[0].container') === first &&
    ev(ctx, rv + '.layout.length') === count);
  /* A dropped new container clamps the same way. */
  ev(ctx, 'insertContainerAt(' + rv + '.nid,0);');
  ok('a new container cannot be inserted above it',
    ev(ctx, rv + '.layout[0].container') === first);
  ok('...and it did land, at position 2', ev(ctx, rv + '.layout[1].container') === 'New Container');
  /* Reorder within the legal range works. */
  const before = ev(ctx, rv + '.layout.map(s=>s.container).join("|")');
  ev(ctx, 'moveContainer(' + rv + '.nid,1,3);');
  ok('containers reorder amongst each other',
    ev(ctx, rv + '.layout.map(s=>s.container).join("|")') !== before);
  ok('and the pin held through it', ev(ctx, rv + '.layout[0].container') === first);
}

console.log('\nDesigner: the WO Record View Activities exception (§15.2)');
{
  const ctx = boot('wf-bk-full');
  const rv = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===1)';
  ev(ctx, 'openDsn(' + rv + '.nid);');
  const act = ev(ctx, rv + '.layout.findIndex(s=>s.std===false)');
  ok('Record View has exactly one non-standard container', act > -1 &&
    ev(ctx, rv + '.layout.filter(s=>s.std===false).length') === 1, 'index ' + act);
  ok('it is the Activities one', /^activit/i.test(ev(ctx, rv + '.layout[' + act + '].container')),
    ev(ctx, rv + '.layout[' + act + '].container'));
  ok('every other container is standard',
    ev(ctx, rv + '.layout.filter(s=>s.std!==false).every(s=>s.std===true)'));
  const body = () => ev(ctx, 'document.getElementById("dsnBody").innerHTML');
  ok('it is marked as non-standard in the panel', body().indexOf('emu-sec--nonstd') > -1);
  /* REVISED 2026-09-16: it renders as a real grid with its BUTTONS now, so
     the explanatory paragraph went — the rendering says it. */
  ok('the explanation paragraph is gone', body().indexOf('Not a field container') === -1);
  ok('it renders its real fields as a grid', body().indexOf('Task Plan') > -1 &&
    ev(ctx, rv + '.layout[' + act + '].layout') === 'grid');
  ok('its BUTTONS render as buttons', body().indexOf('emu-btn') > -1 &&
    body().indexOf('Add Activity') > -1);
  /* It DOES accept fields — it is authorable. What it does not accept is
     deletion: the screen's code depends on the container existing, so
     removing it is a broken screen, not a layout choice (§15.2). */
  const n0 = ev(ctx, rv + '.layout[' + act + '].fields.length');
  ev(ctx, 'fldDrag="WSJOBS_SUPV"; fldDropSec({preventDefault(){},stopPropagation(){}},' + act + ');');
  ok('it accepts a dropped field like any container',
    ev(ctx, rv + '.layout[' + act + '].fields.length') === n0 + 1);
  ev(ctx, 'delContainer(' + rv + '.nid,' + act + ');');
  ok('but it can NEVER be deleted — only hidden (§15.2)',
    ev(ctx, rv + '.layout.filter(s=>s.std===false).length') === 1);
  ev(ctx, 'setContainerDisplay(' + rv + '.nid,' + act + ',"hidden");');
  ok('...and hiding it is the supported way to take it away',
    ev(ctx, rv + '.layout[' + act + '].display') === 'hidden');
  ok('its menu offers no Remove at all', evb(ctx,
    '(function(){containerMenu({preventDefault(){},stopPropagation(){},clientX:5,clientY:5},' +
    rv + '.nid,' + act + '); var m=document.getElementById("menu").innerHTML;' +
    'return m.indexOf("is-disabled")>-1 && m.indexOf("only be hidden")>-1;})()'));
  /* Other steps have no exception — this is Record View's alone. */
  const cl = 'wf().nodes.find(n=>n.step==="closing")';
  ok('other steps carry no non-standard container',
    ev(ctx, cl + '.layout.every(s=>s.std===true)'));
}

console.log('\nDesigner: available fields sidebar');
{
  const ctx = boot('wf-bk-full');
  const rv = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===1)';
  ev(ctx, 'openDsn(' + rv + '.nid);');
  ok('the sidebar opens with the panel',
    ev(ctx, '!document.getElementById("fldbar").classList.contains("closed")'));
  /* THE LIST IS THE COMPLEMENT OF THE SCREEN. */
  ok('it lists only fields NOT on the screen', evb(ctx,
    '(function(){var nd=' + rv + ', placed=new Set();' +
    'nd.layout.forEach(function(s){s.fields.forEach(function(f){placed.add(f.api);});});' +
    'return availableFields(wf(),nd).every(function(c){return !placed.has(c.api);});})()'));
  const n0 = ev(ctx, 'availableFields(wf(),' + rv + ').length');
  ok('there are candidates to place', n0 > 0, String(n0));
  /* Dragging one in removes it from the list. */
  const api = ev(ctx, 'availableFields(wf(),' + rv + ')[0].api');
  const listIdx = ev(ctx, rv + '.layout.findIndex(s=>s.layout==="list"&&s.std!==false)');
  ev(ctx, 'fldDrag=' + JSON.stringify(api) + '; fldDropSec({preventDefault(){},stopPropagation(){}},' + listIdx + ');');
  ok('a dragged field lands in the container it was dropped on',
    ev(ctx, rv + '.layout[' + listIdx + '].fields.some(f=>f.api===' + JSON.stringify(api) + ')'));
  ok('and leaves the available list', ev(ctx, 'availableFields(wf(),' + rv + ').length') === n0 - 1);
  ok('it lands as Optional, not Required',
    ev(ctx, rv + '.layout[' + listIdx + '].fields.find(f=>f.api===' + JSON.stringify(api) + ').behavior') === 'opt');
  /* Removing it puts it back — the list is a complement, so a removal is not
     a loss. */
  const fIdx = ev(ctx, rv + '.layout[' + listIdx + '].fields.findIndex(f=>f.api===' + JSON.stringify(api) + ')');
  ev(ctx, 'removeField(' + rv + '.nid,' + listIdx + ',' + fIdx + ');');
  ok('removing a field returns it to the available list',
    ev(ctx, 'availableFields(wf(),' + rv + ').length') === n0);
  /* A field dropped into a GRID needs a span, or the resize has nothing to
     act on. */
  const gIdx = ev(ctx, rv + '.layout.findIndex(s=>s.layout==="grid")');
  ev(ctx, 'fldDrag=' + JSON.stringify(api) + '; fldDropSec({preventDefault(){},stopPropagation(){}},' + gIdx + ');');
  ok('a field dropped into a grid gets a span',
    ev(ctx, rv + '.layout[' + gIdx + '].fields.find(f=>f.api===' + JSON.stringify(api) + ').span') >= 1);
  /* Search filters the list. */
  ok('search filters by name', evb(ctx,
    '(function(){var el=document.getElementById("fldSearch"); if(!el) return false;' +
    'el.value="zzzznope"; renderFldBar();' +
    'return document.getElementById("fldbarBody").innerHTML.indexOf("Nothing matches")>-1;})()'));
  /* Neither a fork nor a UDS gets the sidebar: a fork has no fields, and a
     UDS's fields are not ours to author (§27.4 role 1). */
  const ctx2 = boot('wf-pm-routed');
  ev(ctx2, 'openDsn(wf().nodes.find(n=>n.kind==="fork").nid);');
  ok('a fork gets no field sidebar',
    ev(ctx2, 'document.getElementById("fldbar").classList.contains("closed")'));
  ev(ctx2, "drag={from:'lib',stepId:'uds:uds-permit'}; dropIdx=1; dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  ev(ctx2, 'openDsn(wf().nodes.find(n=>n.kind==="uds").nid);');
  ok('a UDS gets no field sidebar either (§27.4 role 1)',
    ev(ctx2, 'document.getElementById("fldbar").classList.contains("closed")'));
}

console.log('\nDesigner: the stripped field menu');
{
  const ctx = boot('wf-bk-full');
  const rv = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===1)';
  ev(ctx, 'openDsn(' + rv + '.nid);');
  ev(ctx, 'fieldMenu({preventDefault(){},stopPropagation(){},clientX:10,clientY:10},' + rv + '.nid,0,0);');
  const m = () => ev(ctx, 'document.getElementById("menu").innerHTML');
  const api = ev(ctx, rv + '.layout[0].fields[0].api');
  ok('the field menu names the field', m().indexOf(ev(ctx, rv + '.layout[0].fields[0].name')) > -1);
  /* Removed on instruction: the code is not something an admin can act on
     from here, and five explanatory sentences in a five-option menu is
     longer than the options. */
  ok('it does NOT show the function code', m().indexOf(api) === -1, api);
  ok('it does NOT carry per-option helper prose',
    BEHAV_DESCS.every(d => m().indexOf(d) === -1));
  ok('all five field states are still offered',
    ['Required','Optional','Protected','Hidden','Not Available'].every(t => m().indexOf(t) > -1));
  ok('the current state is still marked', m().indexOf('check') > -1);
  /* Grid/List moved out of the panel body and onto the container header. */
  ok('To grid / To list is on the container right-click, not a button list',
    ev(ctx, 'document.getElementById("dsnBody").innerHTML.indexOf("To grid")') === -1 &&
    ev(ctx, 'document.getElementById("dsnBody").innerHTML.indexOf("To list")') === -1);
  ev(ctx, 'containerMenu({preventDefault(){},stopPropagation(){},clientX:10,clientY:10},' + rv + '.nid,1);');
  ok('...and the container menu offers it', m().indexOf('To grid') > -1 || m().indexOf('To list') > -1);
  ok('the container menu offers the display states', m().indexOf('Hidden') > -1);
  ok('the pinned container cannot be removed from its own menu', evb(ctx,
    '(function(){containerMenu({preventDefault(){},stopPropagation(){},clientX:10,clientY:10},' + rv + '.nid,0);' +
    'return document.getElementById("menu").innerHTML.indexOf("is-disabled")>-1;})()'));
}


/* ═══════════════════════════════════════════════════════════════════════
   ACTIONS, and the library's two sections
   ═══════════════════════════════════════════════════════════════════════
   2026-09-16. §12's two DECLARED statuses (Start Work + Completion, fields
   on the workflow) were replaced by a PLACED "Status update" action. Two
   fields could only express two transitions at two fixed moments; placing
   the transition says where it happens, which is what the fields were
   standing in for, and it allows a third.

   An action is not a screen: the technician never visits it, so it takes no
   rail entry, no number and no gate. That is the assertion that matters
   below — if a status action ever counts as a step, every rail position and
   every N/A calculation shifts by one.
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\nLibrary: Available screens + Actions');
{
  const ctx = boot('wf-bk-full');
  const lib = () => ev(ctx, 'document.getElementById("libBody").innerHTML');
  ok('one flat "Available screens" list', lib().indexOf('Available screens') > -1);
  /* The old Execution / Record-tabs headings implied a rule that §14.8
     explicitly denies (placement is configuration, not a screen property). */
  ok('the Execution / Record-tabs headings are gone',
    lib().indexOf('Execution') === -1 && lib().indexOf('Record tabs') === -1);
  ok('UDS entries sit in the same list, marked by icon not heading',
    lib().indexOf('User defined screens') === -1 && lib().indexOf('UDS Tab 1') > -1);
  /* The labels are numbered rather than named on purpose (2026-09-17): a
     plausible customer screen name in the demo data reads as a claim that
     the product ships that screen, and it does not — base EAM owns what a
     UDS is (§27.4 role 1). */
  ok('a UDS is not given a plausible product name',
    !/Hot Work Permit|LOTO Verification|Shift Handover/.test(
      ev(ctx, 'document.documentElement.innerHTML')));
  ok('an Actions section exists', lib().indexOf('Actions') > -1);
  ok('it holds both forks, the status update and the timer',
    lib().indexOf('Question fork') > -1 && lib().indexOf('Condition fork') > -1 &&
    lib().indexOf('Status update') > -1 && lib().indexOf('Start Timer') > -1);
  /* Both actions are positional, and Free Form has no positions. */
  const ctx2 = boot('wf-free-insp');
  const lib2 = ev(ctx2, 'document.getElementById("libBody").innerHTML');
  ok('Free Form offers no actions at all', lib2.indexOf('Actions') === -1);
}

console.log('\nActions: Status update (replaces §12 declared statuses)');
{
  const ctx = boot('wf-bk-full');
  /* The banner's completion trio is gone — the action replaced it. */
  const ban = ev(ctx, 'document.getElementById("banner").innerHTML');
  ok('the banner no longer declares Start Work / Completion status',
    ban.indexOf('Start Work status') === -1 && ban.indexOf('Completion status') === -1 &&
    ban.indexOf('Completion entity') === -1);
  ok('the banner still carries the function picker', ban.indexOf('Base screen') > -1);

  ev(ctx, "drag={from:'lib',stepId:'status'}; dropIdx=2; dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  const a = 'wf().nodes.find(n=>n.kind==="action")';
  ok('a status update drops in as its own kind', ev(ctx, '!!' + a) && ev(ctx, a + '.action') === 'status');
  ok('it defaults to Work Order', ev(ctx, a + '.entity') === 'wo');
  ok('and to that entity\'s completion status', ev(ctx, a + '.status') === 'CLOSE');
  /* THE ASSERTION THAT MATTERS: it is not a step. */
  ok('it is NOT a numbered step', ev(ctx, 'seqNodes(wf()).indexOf(' + a + ')') === -1);
  ok('it takes no rail entry', ev(ctx,
    'stepMapHtml(wf(), flowNodes(wf())[0], new Set()).indexOf("Status update")') === -1);
  ok('it takes no gates', ev(ctx, '!("reqComment" in ' + a + ') && !("required" in ' + a + ')'));
  /* Switching entity re-bases the status: an EVST code is not an AAST code. */
  ev(ctx, 'setStatusEntity(' + a + '.nid,"activity");');
  ok('switching entity re-bases the status',
    ev(ctx, a + '.status') === 'COMPLETE' &&
    ev(ctx, 'statusListForEntity("activity").some(s=>s.code===' + a + '.status)'));
  ok('the old EVST code is not carried over', ev(ctx, a + '.status') !== 'CLOSE');
  /* Positional, so neither the More group nor Free Form can hold one. */
  ev(ctx, 'moveToRef(' + a + '.nid,true);');
  ok('it cannot sit in the More group', ev(ctx, a + '.zone') !== 'ref');
  ev(ctx, 'applyFreeForm(wf());');
  ok('Free Form drops it along with the forks',
    ev(ctx, 'wf().nodes.every(n=>n.kind!=="action")'));
}
{
  /* The node card, and the editor it opens. */
  const ctx = boot('wf-bk-full');
  ev(ctx, "drag={from:'lib',stepId:'status'}; dropIdx=2; dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  const cv = ev(ctx, 'document.getElementById("cv").innerHTML');
  ok('the card names the entity and the status, description-only',
    cv.indexOf('Work Order') > -1 && cv.indexOf('Closed') > -1 && cv.indexOf('CLOSE') === -1);
  const m = ev(ctx, 'document.getElementById("mbox").innerHTML');
  ok('dropping one opens its editor', m.indexOf('Status update') > -1);
  ok('the editor has exactly two controls', (m.match(/<select/g) || []).length === 2);
  ok('the status dropdown is description-only',
    m.indexOf('>Closed<') > -1 && m.indexOf('>CLOSE<') === -1);
}

console.log('\nDescription-only codes (§5.2)');
{
  const ctx = boot('wf-bk-full');
  /* §5.2: "System codes (Status, Type, Priority) — always description-only".
     The code is an identifier, and these are pickers. */
  ok('the WO Type pill shows the description, not the code',
    ev(ctx, 'woTypePill("BK").indexOf("Breakdown")') > -1 &&
    ev(ctx, 'woTypePill("BK").indexOf(">BK")') === -1);
  ok('the WO Type dropdown is description-only', ev(ctx,
    'document.getElementById("banner").innerHTML.indexOf(">BK —")') === -1);
  ok('...and still lists every type', ev(ctx,
    'WO_TYPES.every(function(t){return document.getElementById("banner").innerHTML.indexOf(">"+t.name+"<")>-1;})'));
  /* A FUNCTION code is an identifier an admin does type, so it stays. */
  ok('the function code is NOT dropped — it is an identifier, not a status', ev(ctx,
    'document.getElementById("cvbar").innerHTML.indexOf("WSJOBS")') > -1);
}

console.log('\nDesigner: the drag fixes');
{
  const ctx = boot('wf-bk-full');
  const rv = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===1)';
  ev(ctx, 'openDsn(' + rv + '.nid);');
  /* BUG 1 was that contDragOver() called renderDsn(), destroying the drag
     source mid-gesture. It must only toggle classes now. */
  const src = ev(ctx, 'String(contDragOver)');
  ok('container dragover no longer re-renders the panel', src.indexOf('renderDsn') === -1);
  ok('...it toggles classes instead', src.indexOf('classList') > -1);
  ok('and the drop-indicator div is gone with it',
    ev(ctx, 'String(emulatorHtml).indexOf("emu-dropline")') === -1);
  /* BUG 2 was that a field dropped on a container HEADER did nothing — and
     the header is the edge the pointer crosses on the way in. */
  ok('the header forwards a field drop to its own container',
    ev(ctx, 'typeof contHeadDrop') === 'function' &&
    ev(ctx, 'String(contHeadDrop).indexOf("fldDropSec")') > -1);
  /* And a field can be dropped into a container created a moment ago. */
  ok('a field drops into a NEWLY created container', evb(ctx,
    '(function(){var nd=' + rv + ';' +
    'insertContainerAt(nd.nid, nd.layout.length);' +
    'var i = nd.layout.length - 1;' +
    'var c = availableFields(wf(),nd)[0];' +
    'fldDrag = c.api;' +
    'fldDropSec({preventDefault:function(){},stopPropagation:function(){}}, i);' +
    'return nd.layout[i].fields.length === 1 && nd.layout[i].fields[0].api === c.api;})()'));
  /* A FRESH empty container — the one above now holds the dropped field. */
  ev(ctx, 'insertContainerAt(' + rv + '.nid, ' + rv + '.layout.length);');
  ok('an empty container renders a real drop target, not a one-line hint',
    ev(ctx, 'document.getElementById("dsnBody").innerHTML.indexOf("emu-dropzone")') > -1);
}

console.log('\nDesigner: button fields carry field behavior');
{
  const ctx = boot('wf-bk-full');
  const rv = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===1)';
  ev(ctx, 'openDsn(' + rv + '.nid);');
  const act = ev(ctx, rv + '.layout.findIndex(s=>s.std===false)');
  const btn = ev(ctx, rv + '.layout[' + act + '].fields.findIndex(f=>f.type==="button")');
  ok('the Activity container carries button fields', btn > -1, String(btn));
  ok('a button can be hidden, which is the point of modelling it as a field',
    ev(ctx, rv + '.layout[' + act + '].fields.some(f=>f.type==="button"&&f.behavior==="hid")'));
  /* Required/Protected/N/A are meaningless for something that is not a
     value, so the menu offers two options rather than five greyed ones. */
  ok('a button offers only Optional and Hidden',
    ev(ctx, 'behaviorsFor({type:"button"}).map(b=>b.k).join(",")') === 'opt,hid');
  ok('a value field still offers all five',
    ev(ctx, 'behaviorsFor({type:"lov"}).length') === 5);
  /* Guarded in the setter, not just omitted from the menu. */
  ev(ctx, 'setFieldBehavior(' + rv + '.nid,' + act + ',' + btn + ',"req");');
  ok('the setter REFUSES a meaningless button state',
    ev(ctx, rv + '.layout[' + act + '].fields[' + btn + '].behavior') !== 'req');
  ev(ctx, 'setFieldBehavior(' + rv + '.nid,' + act + ',' + btn + ',"hid");');
  ok('...but accepts Hidden', ev(ctx, rv + '.layout[' + act + '].fields[' + btn + '].behavior') === 'hid');
  ok('a hidden button renders faded rather than vanishing',
    ev(ctx, 'document.getElementById("dsnBody").innerHTML.indexOf("emu-btn")') > -1);
}

console.log('\nDesigner: the real WO Record View field set');
{
  const ctx = boot('wf-bk-full');
  const rv = 'wf().nodes.find(n=>n.step==="recordview"&&n.inst===1)';
  ev(ctx, 'openDsn(' + rv + '.nid);');
  /* The layout is the real screen's, not an invented four-field demo — a
     designer whose field list is made up cannot answer "is this real screen
     authorable". */
  ok('the container set matches the real screen', ev(ctx,
    rv + '.layout.map(s=>s.container).join("|")') ===
    'Header Fields|Work Order Details|Activity|Scheduling|User Defined Fields|Custom Fields');
  ok('the real screen\'s fields are present', evb(ctx,
    '(function(){var all=[];' + rv + '.layout.forEach(function(s){s.fields.forEach(function(f){all.push(f.name);});});' +
    'return ["Equipment","Location","Trusted Vendor","Standard WO","Task Plan","Hours Remaining"]' +
    '.every(function(x){return all.indexOf(x)>-1;});})()'));
  ok('the sidebar offers the rest of the real screen', evb(ctx,
    '(function(){var a=availableFields(wf(),' + rv + ').map(function(c){return c.name;});' +
    'return ["Organization","Created By","Priority Response","Supervisor","Req. Start Date"]' +
    '.every(function(x){return a.indexOf(x)>-1;});})()'));
  ok('User Defined Fields and Custom Fields default collapsed, as on the screen',
    ev(ctx, rv + '.layout.find(s=>s.container==="User Defined Fields").display') === 'collapsed' &&
    ev(ctx, rv + '.layout.find(s=>s.container==="Custom Fields").display') === 'collapsed');
  ok('nothing is both placed and offered', evb(ctx,
    '(function(){var placed=new Set();' + rv + '.layout.forEach(function(s){s.fields.forEach(function(f){placed.add(f.api);});});' +
    'return availableFields(wf(),' + rv + ').every(function(c){return !placed.has(c.api);});})()'));
}


/* ═══════════════════════════════════════════════════════════════════════
   THE FOUR AREAS — one membership table, two views
   ═══════════════════════════════════════════════════════════════════════
   2026-09-16. Three assignment models were weighed; "both directions, one
   table" won because §26.5.1 had already decided BOTH grains are real —
   authoring is one artifact → many groups, answering "what does group X
   get?" is one group → many artifacts.

   THE CONDITION ON CHOOSING IT was that there is exactly ONE store. That is
   the assertion that matters most here: if the gallery side and the group
   side ever read different rows, the model is broken and everything else in
   this block is decoration. Membership used to live on the workflow as
   `w.assignments`; with four artifact types that would have become four
   arrays able to disagree with each other and with the group view.

   Also pinned: the cardinality rule (which follows what the runtime resolves
   on, not taste), §2.7's refusal of "all records", §2.10's "None is valid",
   and the by-reference tile model's blast radius.
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\nAreas: one membership table, two views');
{
  const ctx = boot();
  /* THE LOAD-BEARING ONE. */
  ok('the gallery side and the group side read the SAME rows', evb(ctx,
    '(function(){var h=HOMES[0];' +
    'var fromArtifact = groupsOf("home", h.id).slice().sort().join(",");' +
    'var fromGroups = GROUPS.filter(function(g){' +
    '  return artifactsForGroup(g,"home").some(function(r){return r.artifactId===h.id;});' +
    '}).sort().join(",");' +
    'return fromArtifact === fromGroups && fromArtifact.length > 0;})()'));
  ok('there is no second store — w.assignments is gone entirely',
    ev(ctx, 'WFS.every(function(w){return w.assignments === undefined;})'));
  /* Asserts AGREEMENT between the two views, not a row count: TRANSPORT
     now carries a seeded layout (it is what makes the silent-hide gate
     live on load), and a count would break on a seed change without the
     model being wrong. */
  ok('a write from either side lands in the one table', evb(ctx,
    '(function(){var h=HOMES[0]; var G="SALES-ENG";' +
    'setAssigned("home", h.id, G, true);' +
    'var a = groupsOf("home", h.id).indexOf(G) > -1;' +
    'var b = artifactsForGroup(G,"home").some(function(r){return r.artifactId===h.id;});' +
    'setAssigned("home", h.id, G, false);' +
    'var c = groupsOf("home", h.id).indexOf(G) === -1;' +
    'var d = !artifactsForGroup(G,"home").some(function(r){return r.artifactId===h.id;});' +
    'return a && b && c && d;})()'));
  /* Deleting an artifact must take its membership with it — a row pointing
     at a deleted artifact is a group silently provisioned with nothing. */
  ok('deleting an artifact drops its membership rows', evb(ctx,
    '(function(){var h=HOMES[HOMES.length-1]; var before=groupsOf("home",h.id).length;' +
    'dropAssignmentsFor("home", h.id);' +
    'return before >= 0 && ASSIGN.every(function(r){return !(r.type==="home"&&r.artifactId===h.id);});})()'));
}

console.log('\nAreas: cardinality follows what the runtime resolves on');
{
  const ctx = boot();
  /* §11 resolves a workflow from (WO Type, group), so a group may hold one
     per Type. Everything else resolves on the group alone. That is why the
     rule generalises instead of needing a special case per area. */
  ok('workflow is per-WO-Type', ev(ctx, 'ARTIFACT_TYPES.workflow.cardinality') === 'per-wotype');
  ok('offline and home are per-group',
    ev(ctx, 'ARTIFACT_TYPES.offline.cardinality') === 'per-group' &&
    ev(ctx, 'ARTIFACT_TYPES.home.cardinality') === 'per-group');
  ok('the rule TEXT is derived, not written per area', ev(ctx,
    'assignRuleText("offline").indexOf("exactly one") > -1 && ' +
    'assignRuleText("workflow").indexOf("per WO Type") > -1'));
  /* A per-group clash is predicted BEFORE the click, not reported after. */
  ok('assigning a second per-group artifact is predicted as a clash', evb(ctx,
    '(function(){var mine=artifactsForGroup("SUPERVISOR","home")[0];' +
    'var other=HOMES.filter(function(h){return h.id!==mine.artifactId;})[0];' +
    'return !!wouldClash("home", other.id, "SUPERVISOR");})()'));
  ok('assigning the SAME artifact again is not a clash', evb(ctx,
    '(function(){var mine=artifactsForGroup("SUPERVISOR","home")[0];' +
    'return !wouldClash("home", mine.artifactId, "SUPERVISOR");})()'));
  /* And a workflow clash keys on the SLOT, not merely on the group. */
  ok('two workflows for different WO Types are NOT a clash', evb(ctx,
    '(function(){var pm=WFS.find(function(w){return w.woType==="PM";});' +
    'return !wouldClash("workflow", pm.id, "CONTRACTOR");})()'));
  ok('two workflows for the SAME WO Type are', evb(ctx,
    '(function(){' +
    /* CONTRACTOR holds exactly one BK workflow, so assigning the other
       one to it is a genuine clash the control must predict. MAINT-TECH
       already holds BOTH (the seeded collision), so it cannot be used to
       test a PREDICTION. */
    'var bk=WFS.filter(function(w){return !w.freeForm && w.woType==="BK";});' +
    'if(bk.length<2) return false;' +
    'var held=bk.filter(function(w){return groupsOf("workflow",w.id).indexOf("CONTRACTOR")>-1;})[0];' +
    'var free=bk.filter(function(w){return groupsOf("workflow",w.id).indexOf("CONTRACTOR")===-1;})[0];' +
    'if(!held || !free) return false;' +
    'var msg = wouldClash("workflow", free.id, "CONTRACTOR");' +
    'return !!msg && !isAssigned("workflow", free.id, "CONTRACTOR");})()'));
  ok('and nothing was auto-resolved',
    ev(ctx, 'WFS.filter(w=>groupsOf("workflow",w.id).indexOf("MAINT-TECH")>-1).length') >= 2);
  ok('no collision roll-up is rendered anywhere',
    ev(ctx, `document.getElementById('gallery').innerHTML.indexOf('Assignment collisions')`) === -1);
  /* Copy. Both of these render identically when wrong. */
  ev(ctx, 'copyWf("wf-bk-full");');
  const dup = 'WFS.find(w=>w.desc.slice(-6)==="(copy)")';
  ok('a copy exists', ev(ctx, `!!${dup}`));
  ok('the copy carries NO assignments (else it breaks the rule on creation)',
    ev(ctx, `groupsOf("workflow", ${dup}.id).length`) === 0);
  ok('the copy re-mints every node id (else its forks point at the original)',
    ev(ctx, `(function(){var o=WFS.find(w=>w.id==="wf-bk-full");var s=new Set(o.nodes.map(n=>n.nid));
      return ${dup}.nodes.every(n=>!s.has(n.nid));})()`));
  ok('and the copy owns its own layouts',
    ev(ctx, `${dup}.nodes[0].layout !== WFS.find(w=>w.id==="wf-bk-full").nodes[0].layout`));
}

console.log('\nRename, and §23 colour discipline');
{
  const ctx = boot('wf-bk-full');
  const cls = 'wf().nodes.find(n=>n.step==="closing")';
  ev(ctx, `${cls}.name='Finish Up'; ${cls}.renamed=true; renderCanvas();`);
  const cv = `document.getElementById('cv').innerHTML`;
  ok('the renamed value is the node\'s main text', ev(ctx, `${cv}.indexOf('Finish Up')`) > -1);
  ok('the delivered label survives, as a pill',
    ev(ctx, `${cv}.indexOf('node__orig')`) > -1 && ev(ctx, `${cv}.indexOf('Closing')`) > -1);
  /* §23.3: four --wo-type-* tokens and no fifth. An admin screen that invents
     a hue for CAL/INS/MOD would make the badge mean something different from
     what the technician sees. */
  ok('BK/CM/PM/ROUT each get their §23.3 token',
    ['BK', 'CM', 'PM', 'ROUT'].every(t => ev(ctx, `woTypePill(${JSON.stringify(t)}).indexOf('--wo-type-')`) > -1));
  ok('an uncoloured Type gets an outline pill, NOT a fifth hue',
    ['CAL', 'INS', 'MOD'].every(t => ev(ctx, `woTypePill(${JSON.stringify(t)}).indexOf('--wo-type-')`) === -1));
  ok('the WO Type glyphs are the app\'s own, not redrawn',
    ev(ctx, 'Object.keys(WO_TYPE_ICON_GLYPHS).sort().join(",")') === 'BREAKDOWN,CORRECTIVE,PPM,ROUTINE');
}

console.log('\nEvery library step renders');
{
  const ctx = boot('wf-bk-full');
  ok('every library entry has a default layout and an icon',
    ev(ctx, 'STEP_LIB.every(s=>!!LAYOUTS[s.id] && !!ICONS[s.icon])'));
  ok('every step opens in the designer panel without throwing',
    ev(ctx, `STEP_LIB.every(function(s){
      var n = mkNode(s.id,{}); wf().nodes.push(n); openDsn(n.nid);
      var okk = document.getElementById('dsnBody').innerHTML.indexOf('emu-') > -1;
      wf().nodes.pop(); return okk; })`));
  ok('a fork has no layout, so the designer defers to the fork editor',
    ev(ctx, 'mkNode("fork",{}).layout') === undefined);
}


/* ═══════════════════════════════════════════════════════════════════════
   HOME LAYOUT — sections, the drop rule, and the silent-hide gate
   ═══════════════════════════════════════════════════════════════════════
   Reworked 2026-09-16 against EAM.DUX.REQ.DigitalWorkHome, the shipping
   product's own requirement. Several of these pin rules taken from that
   document rather than invented here, which is why they are worth having
   as executable code: a future edit that "simplifies" the tile model will
   break one of them rather than quietly diverging from the product. */
console.log('\nHome layout — sections and the drop rule');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("home");');

  /* THE LOAD-BEARING ONE. Section is a property of the LAYOUT, not the
     tile — a section field on the tile record would pin one tile to one
     section everywhere it appears, which contradicts §30.13's
     by-reference model. */
  ok('a tile record carries NO section field',
    evb(ctx, 'TILES.every(function(t){ return t.section === undefined && t.sectionId === undefined; })'));
  ok('a layout holds sections, each with a title and its own tile list',
    evb(ctx, 'HOMES.every(function(h){ return Array.isArray(h.sections) && h.sections.every(function(s){ return typeof s.title === "string" && Array.isArray(s.tiles); }); })'));
  ok('the flat h.tiles array is gone from every layout',
    evb(ctx, 'HOMES.every(function(h){ return h.tiles === undefined; })'));

  /* One accessor for placement, so usage/count/prune cannot drift — the
     same discipline ASSIGN's accessors enforce for membership. */
  ok('homeTileIds() spans sections AND the create tray',
    evb(ctx, '(function(){' +
      'var h = HOMES[0];' +
      'var inSecs = h.sections.reduce(function(a,s){ return a.concat(s.tiles); }, []);' +
      'var all = homeTileIds(h);' +
      'return inSecs.concat(h.creates).length === all.length &&' +
      '  h.creates.every(function(id){ return all.indexOf(id) > -1; }); })()'));

  /* THE DROP RULE, both directions, asserted at the MUTATION — a gesture
     guard is bypassed by any direct call, which is how the More-group
     guard was once got round. */
  /* ASSERTED ON THE RETURN VALUE, not on the array length. Negative control
     showed why: with the guard removed the create still ended up absent,
     because render() -> normalizeHome() pruned it right back out. The array
     therefore proves the SECOND layer while appearing to prove the first.
     The handlers report whether they placed anything, so the two layers can
     be told apart. */
  const NOEV = '{preventDefault:function(){},stopPropagation:function(){}}';
  /* MINTS ITS OWN TILE. The seeded creates are already in HOMES[0].creates,
     so reusing one let the DUPLICATE guard answer first and the insertMode
     guard was never reached — negative control caught exactly that. One
     rule under test per assertion. */
  ok('a create tile CANNOT be dropped into a section',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'var t = mkTile({label:"Fresh create", target:"createwo", insertMode:true});' +
      'TILES.push(t);' +
      'var n = h.sections[0].tiles.length;' +
      'tileDrag = {tileId: t.id};' +
      'var placed = tileDrop(' + NOEV + ', 0, -1);' +
      'var out = placed === false && h.sections[0].tiles.indexOf(t.id) === -1 &&' +
      '          h.sections[0].tiles.length === n;' +
      'TILES.splice(TILES.indexOf(t), 1); HOMES.forEach(normalizeHome);' +
      'return out; })()'));
  ok('a screen tile CANNOT be dropped into the create tray',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'var t = mkTile({label:"Fresh link", target:"sync"});' +
      'TILES.push(t);' +
      'var n = h.creates.length;' +
      'tileDrag = {tileId: t.id};' +
      'var placed = createDrop(' + NOEV + ');' +
      'var out = placed === false && h.creates.indexOf(t.id) === -1 && h.creates.length === n;' +
      'TILES.splice(TILES.indexOf(t), 1); HOMES.forEach(normalizeHome);' +
      'return out; })()'));
  /* The positive control for both: a legal drop must actually report true,
     or "returns false" would pass by never returning anything. */
  ok('a LEGAL drop reports true and lands',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'var free = TILES.filter(function(t){ return !normalizeTile(t).insertMode && homeTileIds(h).indexOf(t.id) === -1; })[0];' +
      'if(!free) return false;' +
      'var n = h.sections[0].tiles.length;' +
      'tileDrag = {tileId: free.id};' +
      'var placed = tileDrop(' + NOEV + ', 0, -1);' +
      'return placed === true && h.sections[0].tiles.length === n + 1; })()'));
  ok('a legal CREATE drop reports true and lands in the tray',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'var free = TILES.filter(function(t){ return normalizeTile(t).insertMode && homeTileIds(h).indexOf(t.id) === -1; })[0];' +
      'if(!free) return true;' +
      'var n = h.creates.length;' +
      'tileDrag = {tileId: free.id};' +
      'var placed = createDrop(' + NOEV + ');' +
      'return placed === true && h.creates.length === n + 1; })()'));
  ok('normalizeHome() ALSO enforces it, so stored data cannot carry a violation',
    evb(ctx, '(function(){' +
      'var h = HOMES[0];' +
      'var create = TILES.filter(function(t){ return normalizeTile(t).insertMode; })[0].id;' +
      'h.sections[0].tiles.push(create);' +
      'normalizeHome(h);' +
      'return h.sections[0].tiles.indexOf(create) === -1; })()'));

  /* The editor wraps where the device scrolls. The constant is device
     arithmetic (390 − 28 padding, 100px tiles, 10px gaps), not taste. */
  ok('HOME_FOLD is 3 — what fits a 390px row without scrolling',
    ev(ctx, 'HOME_FOLD') === 3);
  ok('a section past the fold draws the fold marker',
    evb(ctx, '(function(){' +
      'var h = HOMES.filter(function(x){ return x.sections.some(function(s){ return s.tiles.length > HOME_FOLD; }); })[0];' +
      'if(!h) return false;' +
      'openHome(h.id);' +
      'return document.getElementById("gallery").innerHTML.indexOf("emu-sec__fold") > -1; })()'));

  /* Migration: stored layouts predate sections. */
  ok('a pre-sections layout migrates, splitting creates out of the flat list',
    evb(ctx, '(function(){' +
      'var create = TILES.filter(function(t){ return normalizeTile(t).insertMode; })[0].id;' +
      'var screen = TILES.filter(function(t){ return !normalizeTile(t).insertMode; })[0].id;' +
      'var old = {id:"hl-mig", name:"Legacy", desc:"", updated:"x", tiles:[screen, create]};' +
      'HOMES.push(old); normalizeHome(old);' +
      'return old.tiles === undefined && old.creates.length === 1 &&' +
      '  old.creates[0] === create && old.sections[0].tiles[0] === screen; })()'));

  /* Favorites is the technician's row, not the admin's. */
  ok('a layout can position/toggle Favorites but holds no favorite CONTENT',
    evb(ctx, 'HOMES.every(function(h){ return typeof h.showFavorites === "boolean" && h.favorites === undefined; })'));

  /* One path to placement. tileUsage() reading h.sections directly would
     work today and drift the moment the create tray is in play — the same
     reason every membership read goes through groupsOf/artifactsForGroup. */
  ok('tileUsage() sees a tile placed in the CREATE TRAY, not just in sections',
    evb(ctx, '(function(){' +
      'var h = HOMES[0];' +
      'var c = h.creates[0];' +
      'if(!c) return false;' +
      'return tileUsage(c).some(function(x){ return x.id === h.id; }); })()'));
  ok('a copied layout re-mints section ids',
    evb(ctx, '(function(){' +
      'var src = HOMES[0], before = src.sections.map(function(s){ return s.id; }).join(",");' +
      'copyHome(src.id);' +
      'var dup = HOMES.filter(function(h){ return h.name.indexOf("(copy)") > -1; })[0];' +
      'return !!dup && dup.sections.map(function(s){ return s.id; }).join(",") !== before; })()'));

  /* Clamped at the mutation, like the pinned step and container 0. */
  ok('moveSection clamps at the array, not only in the menu that offers it',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'var n = h.sections.length, first = h.sections[0].id;' +
      'moveSection(0, -1); moveSection(n - 1, 1);' +
      'return h.sections.length === n && h.sections[0].id === first; })()'));
}

console.log('\nHome layout — the count rules are the product\'s, not ours');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal();');
  /* EAM.DUX.REQ.DigitalWorkHome: 1000 or more shows 999+, and a statement
     returning 0 shows NO BADGE. A zero badge reads as "nothing to do"; no
     badge reads as "no counter here", and the product picked the second. */
  ok('1000 or more renders as 999+',
    ev(ctx, 'tileCountBadge({countSql:"x", demoCount:1240})') === '999+');
  ok('exactly 1000 is already 999+',
    ev(ctx, 'tileCountBadge({countSql:"x", demoCount:1000})') === '999+');
  ok('a count of 0 renders NO badge at all, not a zero',
    ev(ctx, 'tileCountBadge({countSql:"x", demoCount:0})') === '');
  ok('no count statement means no badge, even with a dataspy set',
    ev(ctx, 'tileCountBadge({countSql:"", dataspy:"My Open WOs", demoCount:9})') === '');
  ok('the count is SEPARATE from the dataspy — either can exist alone',
    evb(ctx, '(function(){' +
      'var t = mkTile({label:"x", dataspy:"My Open WOs"});' +
      'var u = mkTile({label:"y", countSql:"SELECT COUNT(*)"});' +
      'return t.countSql === "" && u.dataspy === ""; })()'));
  ok('an insert-mode tile can never carry a counter',
    evb(ctx, 'normalizeTile({insertMode:true, countSql:"SELECT COUNT(*)"}).countSql === ""'));
  ok('KPI is gone — it had no renderer on the device',
    evb(ctx, 'typeof TILE_KINDS === "undefined"'));
}

console.log('\nHome layout — the SILENT-HIDE gate (the product hides, we report)');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal();');
  /* "If the screen does not exist in the menu, that Digital Work Home
     record will not be displayed." The product drops it with no error, so
     this surface is the only place it can be seen. */
  ok('the gate fires ON LOAD, not only when someone builds the case',
    evb(ctx, 'allHomeGaps().length > 0'));
  ok('it reports as an ERROR on the layout',
    evb(ctx, '(function(){' +
      'var g = allHomeGaps()[0];' +
      'return homeIssues(artifactOf("home", g.home)).some(function(i){' +
      '  return i.sev === "error" && i.msg.indexOf("SILENTLY HIDES") > -1; }); })()'));
  /* The §29.7 false positive in its Home form: a create target is an
     INSERT MODE OF a screen, not a screen — keying the check on the raw
     target reported every create tile as hidden for every group. Caught by
     reading the gap list rather than the pass/fail. */
  ok('a create target resolves to its underlying SCREEN, not its own id',
    evb(ctx, 'targetScreen("createwo") === "wolist" && targetScreen("createeq") === "equiplist"'));
  ok('so a create tile is NOT reported hidden for a group that has the list',
    evb(ctx, 'allHomeGaps().every(function(g){' +
      'return !(g.target === "createwo" && groupMenu(g.group).indexOf("wolist") > -1); })'));
  ok('an unknown target falls back to itself, so it is caught not exempted',
    evb(ctx, 'targetScreen("nosuchtarget") === "nosuchtarget"'));
  ok('reported, never auto-fixed — the tile stays on the layout',
    evb(ctx, '(function(){' +
      'var g = allHomeGaps()[0];' +
      'var h = artifactOf("home", g.home);' +
      'var n = homeTileIds(h).length;' +
      'homeIssues(h); renderHomeArea();' +
      'return homeTileIds(h).length === n; })()'));
}

console.log('\nHome layout — an empty layout is a FALLBACK, not a fault');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal();');
  /* The requirement: no Digital Work Home records for the group means the
     system opens the STANDARD MENU. Same shape as §11's flat-rail
     fallback. Reporting a fallback as a fault teaches an admin to ignore
     the banner. */
  ok('an empty layout reports INFO and names the standard-menu fallback',
    evb(ctx, '(function(){' +
      'var e = mkHome("Empty",""); e.sections = []; HOMES.push(e);' +
      'var iss = homeIssues(e);' +
      'return iss.length === 1 && iss[0].sev === "info" && iss[0].msg.indexOf("standard menu") > -1; })()'));
  ok('an untitled section IS an error — nothing would name that row',
    evb(ctx, '(function(){' +
      'var e = mkHome("T",""); e.sections = [{id:"s1", title:"", tiles:[TILES[0].id]}];' +
      'return homeIssues(e).some(function(i){ return i.sev === "error" && i.msg.indexOf("no title") > -1; }); })()'));
  ok('an empty titled section is a warning, not an error',
    evb(ctx, '(function(){' +
      'var e = mkHome("T",""); e.sections = [{id:"s1", title:"Work", tiles:[]}];' +
      'return homeIssues(e).some(function(i){ return i.sev === "warn"; }); })()'));
}

console.log('\nNavigation bar (§30.24) — a property of the layout, max 5 slots');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal();');
  const NOEV = '{preventDefault:function(){},stopPropagation:function(){}}';

  /* WHERE IT LIVES. The whole placement decision is that the bar is a
     property of the Home layout rather than a fifth assignable artifact,
     because it resolves on the user group alone — exactly what a Home
     layout already resolves on (§30.13). A 'nav' artifact type appearing
     here would mean the decision had been quietly reversed, and the membership
     table would have a fifth kind of row to disagree with. */
  ok('the bar is NOT a fifth artifact type',
    evb(ctx, 'ARTIFACT_TYPES.nav === undefined && ASSIGN.every(function(r){ return r.type !== "nav"; })'));
  ok('...it is a property of the layout, on every one of them',
    evb(ctx, 'HOMES.length > 0 && HOMES.every(function(h){ return Array.isArray(h.nav) && h.nav.length > 0; })'));

  /* §4.2's locked three are now the DEFAULT, including its "Work Orders" →
     "Work" shortening. */
  ok('a new layout carries §4.2\'s three, in order',
    evb(ctx, '(function(){' +
      'var n = mkHome("Fresh","").nav;' +
      'return n.length === 3 && n[0].target === "home" && n[1].target === "wolist" &&' +
      '  n[2].target === "notif" && n[1].label === "Work"; })()'));
  ok('NAV_MAX is 5', ev(ctx, 'NAV_MAX') === 5);

  /* THE PIN, from every direction. Home is slot 1 because it is the only
     route back to Home while browsing, so a bar without it is a dead end.
     Same lesson as the pinned step: clamp at the MUTATION, because a guard
     that only lives in the drag geometry is bypassed by any direct call. */
  ok('Home cannot be REMOVED',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'removeNavItem(0);' +
      'return h.nav[0].target === "home"; })()'));
  ok('Home cannot be MOVED off slot 1',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'moveNavItem(0, 1);' +
      'return h.nav[0].target === "home"; })()'));
  ok('...and nothing can be moved INTO slot 1',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'moveNavItem(1, -1);' +
      'return h.nav[0].target === "home"; })()'));
  /* The clamp called the way a future caller would call it, not the way the
     browser does — navDragOver always runs first in a real gesture, which is
     exactly what hid this class of bug once (§29.2). */
  ok('navDrop() clamps to slot 1 when called DIRECTLY',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'var before = h.nav[0].target;' +
      'navDrag = 1;' +
      'navDrop(' + NOEV + ', 0);' +
      'return h.nav[0].target === before && before === "home"; })()'));
  ok('...and a legal reorder still reports true and lands',
    evb(ctx, '(function(){' +
      'var h = HOMES.filter(function(x){ return x.nav.length > 2; })[0];' +
      'if(!h) return false;' +
      'state.openHome = h.id;' +
      'var moved = h.nav[1].target;' +
      'navDrag = 1;' +
      'var okd = navDrop(' + NOEV + ', 2);' +
      'return okd === true && h.nav[2].target === moved && h.nav[0].target === "home"; })()'));

  /* THE CAP, at the mutation and again on read. */
  ok('addNavItem() refuses the 6th slot',
    evb(ctx, '(function(){' +
      'var h = HOMES[0]; state.openHome = h.id;' +
      'while(h.nav.length < NAV_MAX && navFreeTargets(h,-1).length) {' +
      '  var t = navFreeTargets(h,-1)[0];' +
      '  h.nav.push(mkNavItem({target:t.id, label:t.label, icon:"list"})); }' +
      'if(h.nav.length !== NAV_MAX) return false;' +
      'addNavItem();' +
      'return h.nav.length === NAV_MAX; })()'));
  ok('normalizeNav() ALSO clamps, so stored data cannot carry a 6th',
    evb(ctx, '(function(){' +
      'var h = mkHome("Over","");' +
      'h.nav = [mkNavItem({target:"home",label:"Home"}), mkNavItem({target:"wolist",label:"Work"}),' +
      '  mkNavItem({target:"equiplist",label:"Assets"}), mkNavItem({target:"notif",label:"Alerts"}),' +
      '  mkNavItem({target:"sync",label:"Sync"}), mkNavItem({target:"wolist",label:"Dup"})];' +
      'normalizeNav(h);' +
      'return h.nav.length <= NAV_MAX; })()'));
  ok('...and dedupes: one slot per screen, because a nav item has no dataspy',
    evb(ctx, '(function(){' +
      'var h = mkHome("Dup","");' +
      'h.nav = [mkNavItem({target:"home",label:"Home"}), mkNavItem({target:"wolist",label:"A"}),' +
      '  mkNavItem({target:"wolist",label:"B"})];' +
      'normalizeNav(h);' +
      'return h.nav.filter(function(i){ return i.target === "wolist"; }).length === 1; })()'));
  ok('...and puts Home BACK if a stored bar lost it',
    evb(ctx, '(function(){' +
      'var h = mkHome("NoHome","");' +
      'h.nav = [mkNavItem({target:"wolist",label:"Work"}), mkNavItem({target:"notif",label:"Alerts"})];' +
      'normalizeNav(h);' +
      'return h.nav[0].target === "home"; })()'));
  ok('...and re-seats it to slot 1 if it drifted',
    evb(ctx, '(function(){' +
      'var h = mkHome("Drift","");' +
      'h.nav = [mkNavItem({target:"wolist",label:"Work"}), mkNavItem({target:"home",label:"Home"})];' +
      'normalizeNav(h);' +
      'return h.nav[0].target === "home" && h.nav.length === 2; })()'));

  /* A NAV ITEM IS A DESTINATION, NEVER A CREATE (§9.4.1). Structural: the
     option does not exist, which is the cheapest guard there is. */
  ok('no create target can ever reach the bar',
    evb(ctx, '(function(){' +
      'var bad = ["createwo","createeq"];' +
      'var declared = NAV_TARGETS.every(function(t){ return bad.indexOf(t.id) === -1; });' +
      'var h = HOMES[0];' +
      'var offered = navFreeTargets(h, -1).every(function(t){ return bad.indexOf(t.id) === -1; });' +
      'return declared && offered; })()'));

  /* THE SLOT ARITHMETIC. Five is supported and it costs the label — that is
     the claim, so both halves are pinned. Budget must MOVE with the item
     count, the same sensitivity the offline caps are tested for: a budget
     that is really a constant would pass a single-count check. */
  ok('three items keep the locked 84px slot',
    evb(ctx, 'navSlotPx(3) === NAV_SLOT_PX'));
  ok('...four and five do NOT — the fixed slot yields past three',
    evb(ctx, 'navSlotPx(4) < NAV_SLOT_PX && navSlotPx(5) < navSlotPx(4)'));
  ok('...five still clears §31.5\'s 48px hit target',
    evb(ctx, 'navSlotPx(5) >= 48'));
  ok('...and the label budget SHRINKS with every added slot',
    evb(ctx, 'navLabelBudget(3) > navLabelBudget(4) && navLabelBudget(4) > navLabelBudget(5)'));
  ok('"Notifications" fits at three items and does not at five',
    evb(ctx, 'navLabelBudget(3) >= 13 && navLabelBudget(5) < 13'));

  /* WHAT GETS REPORTED. An unlabelled slot is broken; an over-long one is
     ugly — the device wraps rather than truncating, so the severities differ
     on purpose. */
  ok('an unlabelled slot is an ERROR',
    evb(ctx, '(function(){' +
      'var h = mkHome("NoLabel",""); h.nav[1].label = "";' +
      'return homeIssues(h).some(function(i){ return i.sev === "error" && i.msg.indexOf("no label") > -1; }); })()'));
  ok('an over-budget label is a WARNING, not an error',
    evb(ctx, '(function(){' +
      'var h = mkHome("Long","");' +
      'h.nav = [mkNavItem({target:"home",label:"Home"}), mkNavItem({target:"wolist",label:"Work"}),' +
      '  mkNavItem({target:"equiplist",label:"Assets"}), mkNavItem({target:"notif",label:"Notifications"}),' +
      '  mkNavItem({target:"sync",label:"Sync"})];' +
      'var iss = homeIssues(h);' +
      'return iss.some(function(i){ return i.sev === "warn" && i.msg.indexOf("wraps") > -1; }) &&' +
      '  !iss.some(function(i){ return i.sev === "error"; }); })()'));
  ok('a bar carrying only Home warns — chrome that navigates nowhere',
    evb(ctx, '(function(){' +
      'var h = mkHome("Solo",""); h.nav = [mkNavItem({target:"home",label:"Home"})];' +
      'return homeIssues(h).some(function(i){ return i.sev === "warn" && i.msg.indexOf("only Home") > -1; }); })()'));

  /* THE SILENT-HIDE GATE, one level up from a tile (§30.17). A dropped tile
     leaves a gap in a scrolling row; a dropped nav item leaves a hole in
     permanent chrome. Keyed on the target's SCREEN, and the shell target is
     exempt — without that exemption EVERY layout would report Home as dead,
     since the app's own Home is not a menu entry. */
  ok('a nav item outside a group\'s menu is an ERROR on the layout',
    evb(ctx, '(function(){' +
      'var h = HOMES.filter(function(x){' +
      '  return groupsOf("home", x.id).some(function(g){ return navGaps(x, g).length; }); })[0];' +
      'if(!h) return false;' +
      'return homeIssues(h).some(function(i){' +
      '  return i.sev === "error" && i.msg.indexOf("that slot is dead") > -1; }); })()'));
  ok('...and it is LIVE ON LOAD, not only reachable by hand',
    evb(ctx, '(function(){' +
      'resetPortal(); setArea("home");' +
      'return HOMES.some(function(h){' +
      '  return groupsOf("home", h.id).some(function(g){ return navGaps(h, g).length > 0; }); }); })()'));
  ok('Home is never reported as dead — the shell is not a menu entry',
    evb(ctx, 'HOMES.every(function(h){ return GROUPS.every(function(g){' +
      'return navGaps(h, g).every(function(it){ return it.target !== "home"; }); }); })'));

  /* IT RENDERS, and it says the one thing an admin cannot infer: the bar is
     not part of Home. */
  ok('the editor draws the bar at the bottom of the device preview',
    evb(ctx, '(function(){' +
      'resetPortal(); setArea("home"); openHome(HOMES[0].id);' +
      'return document.getElementById("gallery").innerHTML.indexOf("emu-navbar") > -1; })()'));
  ok('...and states that it is app-level chrome, not part of Home',
    evb(ctx, 'document.getElementById("gallery").innerHTML.indexOf("not part of Home") > -1'));
  ok('...and prints the slot arithmetic rather than leaving it implicit',
    evb(ctx, 'document.getElementById("gallery").innerHTML.indexOf("320px floor") > -1'));
  /* A screen already on the bar is not offered a second time — asserted on
     the rendered option list, which is what an admin actually sees. */
  ok('the item editor does not offer a screen another slot already opens',
    evb(ctx, '(function(){' +
      'resetPortal(); setArea("home");' +
      'var h = HOMES.filter(function(x){ return x.nav.some(function(i){ return i.target === "wolist"; }) &&' +
      '  x.nav.some(function(i){ return i.target === "notif"; }); })[0];' +
      'if(!h) return false;' +
      'openHome(h.id);' +
      'var idx = -1; h.nav.forEach(function(i,n){ if(i.target === "notif") idx = n; });' +
      'navItemModal(idx);' +
      'var html = document.getElementById("mbox").innerHTML;' +
      'return html.indexOf(\'value="notif"\') > -1 && html.indexOf(\'value="wolist"\') === -1; })()'));
  /* Colour is not authorable: the bar is monochrome glass (§23), and Home's
     colour exception is for tiles. A colour control here would be the
     exception spreading. */
  ok('the item editor offers label, screen and icon — and no colour',
    evb(ctx, '(function(){' +
      'var html = document.getElementById("mbox").innerHTML;' +
      'return html.indexOf("nvLabel") > -1 && html.indexOf("nvIcons") > -1 &&' +
      '  html.indexOf("Colour is not authorable") > -1 && html.indexOf("nvColor") === -1; })()'));
}

console.log('\nOne colour set, one tile face (§30.25)');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("home");');

  /* SIX VALUES, AND THEY ARE TOKENS. A raw hex here would be a sixth
     undeclared exception to §30.7, and a hex cannot be themed — the portal
     switches light/dark on data-uxt-theme. */
  ok('the badge set is six values', ev(ctx, 'BADGE_COLORS.length') === 6);
  ok('...every one is an Octave token, never a raw hex',
    evb(ctx, 'BADGE_COLORS.every(function(c){ return c.v === "" || /^var\\(--uxt-theme-palette-status-[a-z]+-700\\)$/.test(c.v); })'));
  ok('...and none of them borrows a WO Type hue any more',
    evb(ctx, 'BADGE_COLORS.every(function(c){ return c.v.indexOf("wo-type") === -1; })'));
  ok('the old WO Type colour keys MIGRATE by hue rather than falling back to neutral',
    evb(ctx, '(function(){' +
      'var t = normalizeTile({color:"breakdown", insertMode:false, countSql:""});' +
      'var p = normalizeTile({color:"ppm", insertMode:false, countSql:""});' +
      'var r = normalizeTile({color:"routine", insertMode:false, countSql:""});' +
      'return t.color === "orange" && p.color === "blue" && r.color === "purple"; })()'));
  ok('...and an unknown colour falls back to neutral rather than rendering nothing',
    evb(ctx, 'normalizeTile({color:"chartreuse", insertMode:false, countSql:""}).color === "none"'));

  /* THE DEVICE'S RULE, IN ONE PLACE. Tint + glyph are emitted together or
     not at all, which is what stops a tinted square with a grey glyph. */
  ok('a coloured tile gets BOTH the 13% tint and the full-strength glyph',
    evb(ctx, '(function(){' +
      'var st = tileSquareStyle({color:"red"});' +
      'return st.indexOf("color-mix") > -1 && st.indexOf("13%") > -1 &&' +
      '  st.indexOf("color:var(--uxt-theme-palette-status-red-700)") > -1; })()'));
  ok('...and a neutral tile gets no inline colour at all',
    evb(ctx, 'tileSquareStyle({color:"none"}) === "" && tileGlyphStyle({color:"none"}) === ""'));
  /* THREE FACES, ONE HELPER. The catalogue chip, the library row and the
     editor square are three render sites; they drifted before because each
     wrote its own style string. */
  ok('the catalogue chip and the editor square both render through it',
    evb(ctx, '(function(){' +
      'var t = TILES.filter(function(x){ return normalizeTile(x).color !== "none" && !x.insertMode; })[0];' +
      'if(!t) return false;' +
      'renderHomeArea();' +
      'var chip = /tilechip. style=.background:color-mix/.test(document.getElementById("gallery").innerHTML);' +
      'openHome(HOMES[0].id);' +
      'var sq = /hometile__sq. style=.background:color-mix/.test(document.getElementById("gallery").innerHTML);' +
      'return chip && sq; })()'));

  /* THE PREVIEW IS THE DEVICE'S OWN GEOMETRY. 3 x 1fr made every square
     114px, which is a preview at the wrong scale — and HOME_FOLD's whole
     argument is arithmetic on a 100px tile. */
  const portalSrc = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', '..', '..', '..', 'prototypes', 'standalone', FILE), 'utf8');
  ok('the tile grid is fixed 100px columns, not 3 x 1fr',
    portalSrc.indexOf('repeat(3,100px)') > -1 && portalSrc.indexOf('repeat(3,1fr)') === -1);
  ok('...and the square glyph is the device\'s 36px, not the old 24px inline size',
    portalSrc.indexOf('.hometile__sq .hometile__ico .ms{font-size:36px;}') > -1);

  ok('the demo catalogue has Work Requests, and no Nonconformities',
    evb(ctx, 'TILES.some(function(t){ return t.label === "Work Requests"; }) &&' +
      '!TILES.some(function(t){ return t.label === "Nonconformities"; })'));
}

console.log('\nTile editor — Label, Opens, then everything Opens scopes (§30.25)');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("home");');

  /* FIELD ORDER IS THE FIX. Opens scopes the dataspy, the count and the
     refusal below, so it cannot sit after them. */
  ok('Opens comes after Label and before the dataspy',
    evb(ctx, '(function(){' +
      'createTile();' +
      'var h = document.getElementById("mbox").innerHTML;' +
      'return h.indexOf("tlLabel") < h.indexOf("tlTarget") &&' +
      '  h.indexOf("tlTarget") < h.indexOf("Dataspy"); })()'));
  /* A NEW TILE HAS NO TARGET, which is what makes the protected state real
     rather than theoretical. */
  ok('a new tile opens with no screen chosen',
    evb(ctx, 'document.getElementById("mbox").innerHTML.indexOf("Choose a screen") > -1'));
  ok('...so the dataspy is PROTECTED, with the reason where the field is',
    evb(ctx, '(function(){' +
      'var h = document.getElementById("mbox").innerHTML;' +
      'return h.indexOf("Pick a screen first") > -1 && !/<select[^>]*id=.tlSpy/.test(h); })()'));
  /* THE LIST IS THE SCREEN'S. Pooling every dataspy let a Work Order tile
     be filtered by "Van Stock". */
  ok('the dataspy list is the chosen screen\'s own',
    evb(ctx, '(function(){' +
      'document.getElementById("tlTarget").value = "equiplist"; tileModalSync();' +
      'var h = document.getElementById("tlSpyWrap").innerHTML;' +
      'return h.indexOf("My Route Assets") > -1 && h.indexOf("My Open WOs") === -1 && h.indexOf("Van Stock") === -1; })()'));
  ok('...and a screen that is not a record list says so instead of offering an empty list',
    evb(ctx, '(function(){' +
      'document.getElementById("tlTarget").value = "notif"; tileModalSync();' +
      'var h = document.getElementById("tlSpyWrap").innerHTML;' +
      'return h.indexOf("carries no dataspies") > -1 && !/id=.tlSpy./.test(h); })()'));
  /* INSERT MODE IS A ROW, NOT A 16px BOX USED AS A LABEL. .cbx IS the box,
     so wrapping an input and a sentence in it is what made this render with
     text spilling out. */
  ok('insert mode is a row carrying the .cbx box, not a .cbx wrapping the row',
    evb(ctx, '(function(){' +
      'var h = document.getElementById("mbox").innerHTML;' +
      'return /id=.tlInsertRow./.test(h) && h.indexOf("tlInsertBox") > -1 &&' +
      '  !/<label class=.cbx./.test(h); })()'));
  ok('...and turning it on collapses the dataspy and the counter together',
    evb(ctx, '(function(){' +
      'tileToggleInsert();' +
      'var h = document.getElementById("tlSpyWrap").innerHTML;' +
      'return tileInsertOn() && h.indexOf("no dataspy and no counter") > -1 &&' +
      '  h.indexOf("tlCount") === -1; })()'));

  /* THE REGRESSION WORTH A TEST OF ITS OWN: the icon was DERIVED from the
     target on every save, so the icon field was unreachable and a seeded
     glyph was lost the first time anybody opened the tile. */
  ok('a saved tile keeps the AUTHORED icon and colour',
    evb(ctx, '(function(){' +
      'createTile();' +
      'document.getElementById("tlLabel").value = "Authored";' +
      'document.getElementById("tlTarget").value = "wolist";' +
      'pickerSet("tlIcons", "flag"); pickerSet("tlColors", "purple");' +
      'var n = TILES.length;' +
      'commitTile(null);' +
      'var t = TILES[TILES.length-1];' +
      'return TILES.length === n + 1 && t.icon === "flag" && t.color === "purple" && t.target === "wolist"; })()'));
  ok('...and a tile with no screen chosen is REFUSED',
    evb(ctx, '(function(){' +
      'createTile();' +
      'document.getElementById("tlLabel").value = "No screen";' +
      'document.getElementById("tlTarget").value = "";' +
      'var n = TILES.length;' +
      'commitTile(null);' +
      'return TILES.length === n; })()'));
  /* One picker mechanic, two pickers — the nav bar's icon grid and the
     tile's are the same control, and the tile's colour grid is that control
     with a different cell. */
  ok('icon and colour pickers read back by element id, not a global per picker',
    evb(ctx, '(function(){' +
      'pickerSet("tlIcons", "box"); pickerSet("tlColors", "green");' +
      'return pickerRead("tlIcons","x") === "box" && pickerRead("tlColors","x") === "green" &&' +
      '  typeof navIconPick === "undefined"; })()'));
}

console.log('\nUser Groups — the picker names the choices, it does not describe them');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("groups"); pickGroup("MAINT-TECH");');
  ok('an option row carries no summary line',
    evb(ctx, 'openGroupAssign.toString().indexOf("artSummary") === -1'));
  ok('...and nothing in the rendered popover describes an option',
    evb(ctx, '(function(){' +
      'openGroupAssign(null, "MAINT-TECH", "offline");' +
      'var h = document.getElementById("pop").innerHTML;' +
      'return h.indexOf("entities offline") === -1 && h.indexOf("cap ") === -1; })()'));
  /* A CLASH IS NOT A DESCRIPTION — it is the consequence of the click, and
     it stays. */
  ok('a clash warning still renders in the popover',
    evb(ctx, 'openGroupAssign.toString().indexOf("wouldClash") > -1'));
  /* The band below still counts, and that count was BROKEN: it read
     h.tiles, which stopped existing when sections landed. */
  ok('the group band\'s own summary counts a layout correctly again',
    evb(ctx, '(function(){' +
      'var h = HOMES[0];' +
      'return artSummary("home", h).indexOf(String(homeTileIds(h).length) + " tiles") === 0; })()'));
}

console.log('\nWorkflow canvas — five kinds, five accents, two fork glyphs (§30.25)');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal();');

  /* THE PAIR THAT PAYS FOR ITSELF: green starts, red stops. */
  ok('Start Timer is green and Stop Timer is red',
    evb(ctx, 'nodeAccentKey({kind:"action",action:"timer"}) === "green" &&' +
      'nodeAccentKey({kind:"action",action:"stoptimer"}) === "red"'));
  ok('a status update is neither of them',
    evb(ctx, 'nodeAccentKey({kind:"action",action:"status"}) === "orange"'));
  /* THE TWO FORK KINDS ARE NOW TOLD APART, which is the whole ask: the
     human-answered one and the system-answered one used to be one purple. */
  ok('a question fork and a condition fork carry different colours',
    evb(ctx, '(function(){' +
      'var q = nodeAccentKey({kind:"fork"}), c = nodeAccentKey({kind:"cond"});' +
      'return q === "purple" && c === "blue" && q !== c; })()'));
  ok('...and different glyphs, with the QUESTION mark on the question',
    evb(ctx, '(function(){' +
      'var w = WFS.filter(function(x){ return !x.freeForm; })[0];' +
      'openWf(w.id);' +
      'addNodeToWf(w, "cond", w.nodes.length, "flow");' +
      'addNodeToWf(w, "fork", w.nodes.length, "flow");' +
      'var c = w.nodes.filter(function(n){ return n.kind === "cond"; })[0];' +
      'var q = w.nodes.filter(function(n){ return n.kind === "fork"; })[0];' +
      'var ch = nodeHtml(w, c, false), qh = nodeHtml(w, q, false);' +
      'return ch.indexOf(">rule<") > -1 && ch.indexOf(">help<") === -1 &&' +
      '  qh.indexOf(">help<") > -1 && qh.indexOf("alt_route") === -1; })()'));
  /* EVERY ACCENT COMES FROM THE ONE SET. A hand-written hue here is how a
     sixth colour appears without anybody deciding on it. */
  ok('every node accent resolves to a badge colour',
    evb(ctx, 'Object.keys(NODE_ACCENTS).every(function(k){' +
      'return BADGE_COLORS.some(function(c){ return c.k === NODE_ACCENTS[k] && c.v; }); })'));
  ok('...and the node carries it as one inline custom property',
    evb(ctx, '(function(){' +
      'var w = wf();' +
      'addNodeToWf(w, "timer", w.nodes.length, "flow");' +
      'var t = w.nodes.filter(function(n){ return n.action === "timer"; })[0];' +
      'return nodeHtml(w, t, false).indexOf("--node-accent:var(--uxt-theme-palette-status-green-700)") > -1; })()'));
  /* The gallery chip tested kind==='fork', so a condition fork fell through
     to the STEP branch and rendered nameless — the §30.22 lesson again. */
  ok('the gallery chip tells the two kinds apart instead of dropping one',
    evb(ctx, '(function(){' +
      'var w = wf();' +
      'var html = galCard(w);' +
      'return html.indexOf("Condition") > -1 && html.indexOf(">rule<") > -1; })()'));
}

console.log('\nOffline profile — caps are PROTECTED platform limits');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("offline"); openProfile(PROFILES[0].id);');
  /* §2.7's numbers come from shipping products. Raising one here would not
     raise what a device can hold; it would only move the failure from
     authoring time to the technician's morning. */
  ok('the caps render as protected fields with a lock',
    evb(ctx, '(function(){' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'return h.indexOf("input--prot") > -1 && h.indexOf("input__lock") > -1; })()'));
  ok('no editable cap input is rendered at all',
    evb(ctx, 'document.getElementById("gallery").innerHTML.indexOf("oninput=\\"setCap(") === -1'));
  ok('setCap REFUSES a direct call, not just a missing input',
    evb(ctx, '(function(){' +
      'var b = PROFILES[0].caps.deviceCeiling;' +
      'setCap("deviceCeiling", 999999);' +
      'return PROFILES[0].caps.deviceCeiling === b; })()'));
  ok('the caps are still SHOWN — a budget you cannot see is not a budget',
    evb(ctx, '(function(){' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'return h.indexOf("Device record ceiling") > -1 && h.indexOf("200,000") > -1; })()'));
  ok('the defaults are still §2.7 market figures',
    evb(ctx, 'OFFLINE_CAP_DEFAULTS.deviceCeiling === 200000 && OFFLINE_CAP_DEFAULTS.rowCap === 50000 && ' +
             'OFFLINE_CAP_DEFAULTS.depth === 15 && OFFLINE_CAP_DEFAULTS.toMany === 1'));
  ok('per-entity policy is STILL editable — only the caps are protected',
    evb(ctx, '(function(){' +
      'var e = OFFLINE_ENTITIES.filter(function(x){ return x.allow.length > 1 && x.allow.indexOf("server-only") > -1; })[0];' +
      'setEntityPolicy(e.id, "server-only");' +
      'return PROFILES[0].entities[e.id].policy === "server-only"; })()'));
}

console.log('\nOffline profile — every policy value is DEFINED where it is chosen');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("offline"); openProfile(PROFILES[0].id);');
  ok('all four policies carry who / def / why',
    evb(ctx, 'OFFLINE_POLICIES.length === 4 && OFFLINE_POLICIES.every(function(p){ return !!p.who && !!p.def && !!p.why; })'));
  ok('the definitions card renders every one of them',
    evb(ctx, '(function(){' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'return h.indexOf("What each policy means") > -1 &&' +
      '  OFFLINE_POLICIES.every(function(p){ return h.indexOf(p.label) > -1; }); })()'));
  ok('exactly the two filtered classes are flagged as needing a filter',
    evb(ctx, '(function(){' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'return (h.match(/needs a filter/g) || []).length === 2 &&' +
      '  POLICY_NEEDS_FILTER.length === 2 &&' +
      '  POLICY_NEEDS_FILTER.indexOf("work-set") > -1 && POLICY_NEEDS_FILTER.indexOf("offline-read") > -1; })()'));
  ok('work-set and external-replica are the ONLY writable classes',
    evb(ctx, 'OFFLINE_POLICIES.filter(function(p){ return p.write; }).map(function(p){ return p.k; }).sort().join(",") === "external-replica,work-set"'));
  ok('server-only is the only class that reads nothing',
    evb(ctx, 'OFFLINE_POLICIES.filter(function(p){ return !p.read; }).map(function(p){ return p.k; }).join(",") === "server-only"'));
  ok('the card states the three things that catch people out',
    evb(ctx, '(function(){' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'return h.indexOf("Only Offline read/write accepts writes to EAM") > -1 && h.indexOf("traversed") > -1; })()'));
}


/* ── THE UNDECIDED ENTITIES LEFT THE GRID (2026-09-18, user direction) ──
   11 of the 31 offline entities have no §2.7 policy decision. They used to
   render as grid rows behind a "Not decided" pill — which meant the screen
   offered a dropdown for a question that is settled in the spec, not on a
   profile. They are listed at the bottom instead.

   The failure mode this pins is the tempting one: "remove them" implemented
   as DROP them. The entity then silently keeps whatever policy it was seeded
   with, with nothing on screen saying so — which is precisely the commitment
   nobody made that §20 tracks. So the list has to render every one of them,
   and the §30.20 validator has to keep firing for any that actually ship. */
console.log('\nOffline profile — the undecided entities are OUT of the grid, not dropped');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("offline"); openProfile(PROFILES[0].id);');
  ok('11 of the 31 entities carry no §2.7 decision',
    evb(ctx, 'OFFLINE_ENTITIES.filter(function(e){ return e.status === "open"; }).length === 11 &&' +
      ' OFFLINE_ENTITIES.length === 31'));
  /* THE GRID IS ISOLATED BY SLICING, not by querySelector. The harness's DOM
     returns a node for ".reg" whose innerHTML is always "" — so an assertion
     written against it compares to the empty string and passes for the wrong
     reason, which is exactly how "absent from the grid" would silently also
     mean "absent from the screen". GRID() is the substring between the
     registry card and the card after it.

     Asserted on the RENDERED rows, not on the filter expression, because the
     filter is one clause somebody can drop while every other test stays green.
     The ">label<" delimiters matter: bare indexOf would let "Equipment"
     satisfy a search for "Equipment Structure". */
  const GRID = '(function(){' +
    'var g = document.getElementById("gallery").innerHTML;' +
    'var a = g.indexOf(\'<div class="reg">\'), b = g.indexOf("Lookup resolution");' +
    'return (a > -1 && b > a) ? g.slice(a, b) : null; })()';
  ok('the grid slice is locatable at all — the assertions below depend on it',
    evb(ctx, GRID + ' !== null'));
  ok('no undecided entity renders a configurable grid row',
    evb(ctx, '(function(){ var h = ' + GRID + '; if(h === null) return false;' +
      'return OFFLINE_ENTITIES.filter(function(e){ return e.status === "open"; })' +
      '  .every(function(e){ return h.indexOf(">" + e.label + "<") === -1; }); })()'));
  ok('...while every decided entity still does',
    evb(ctx, '(function(){ var h = ' + GRID + '; if(h === null) return false;' +
      'return OFFLINE_ENTITIES.filter(function(e){ return e.status !== "open"; })' +
      '  .every(function(e){ return h.indexOf(">" + e.label + "<") > -1; }); })()'));
  ok('all 11 are listed at the bottom — removed from the grid, not from the screen',
    evb(ctx, '(function(){' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'return h.indexOf("No policy decided") > -1 &&' +
      '  OFFLINE_ENTITIES.filter(function(e){ return e.status === "open"; })' +
      '   .every(function(e){ return h.indexOf(e.label) > -1; }); })()'));
  /* §30.20 — the validator is kept, and reported by the control that can
     violate it. An undecided entity seeded with a non-server policy is the
     only one of the 11 that actually reaches a device, so it has to say so on
     its own row rather than in a roll-up banner. */
  ok('any undecided entity that actually SHIPS says so on its own row',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'var live = OFFLINE_ENTITIES.filter(function(e){ return e.status === "open" &&' +
      '  p.entities[e.id] && p.entities[e.id].policy !== "server-only"; });' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'return live.length > 0 && (h.match(/ships as /g) || []).length === live.length; })()'));
  ok('...and profileIssues still raises it, so the list is not a substitute for the check',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'var live = OFFLINE_ENTITIES.filter(function(e){ return e.status === "open" &&' +
      '  p.entities[e.id] && p.entities[e.id].policy !== "server-only"; });' +
      'var iss = profileIssues(p).filter(function(i){ return i.sev === "warn"; });' +
      'return live.every(function(e){ return iss.some(function(i){ return i.entity.id === e.id; }); }); })()'));
  /* The pill is gone, not restyled. On a decided row it restated the policy
     control beside it, and competed with the "traversed" chip — the one chip
     on that row an author actually needs. */
  ok('the per-row status pill is gone from the grid',
    evb(ctx, '(function(){ var h = ' + GRID + '; if(h === null) return false;' +
      'return h.indexOf("Decided") === -1 && h.indexOf("Not decided") === -1 &&' +
      '  h.indexOf("Phase 2") === -1; })()'));
  ok('...and the constant that fed it went with it, so it cannot be half-revived',
    evb(ctx, 'typeof OFFLINE_STATUS_META === "undefined"'));
}

/* ── THE LABELS NAME A CAPABILITY, NOT FIVE DIFFERENT THINGS (2026-09-18) ──
   The rework's whole claim is that every label answers the same question, so
   the set is comparable. "Online only" is the one that cannot say "Offline",
   and the other four must — that is the claim, stated as an assertion rather
   than as a comment nobody runs. */
console.log('\nOffline profile — every policy label answers the same question');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("offline"); openProfile(PROFILES[0].id);');
  ok('the three replicating classes all say "Offline" in the label',
    evb(ctx, 'OFFLINE_POLICIES.filter(function(p){ return p.read; })' +
      '.every(function(p){ return p.label.indexOf("Offline") === 0; })'));
  ok('...and the one that replicates nothing says "Online only"',
    evb(ctx, 'policyMeta("server-only").label === "Online only"'));
  ok('the five-to-four merge left exactly these four keys',
    evb(ctx, 'OFFLINE_POLICIES.map(function(p){ return p.k; }).join(",") ===' +
      ' "server-only,offline-read,work-set,external-replica"'));
}

/* ── THE FIVE-TO-FOUR MERGE (2026-09-18, user direction) ──
   `reference` and `on-demand` became one `offline-read`, on the grounds that a
   kept record lands in the same local store a dataspy-matched one would —
   §2.6's punch-list mechanism generalised, with provenance as a column rather
   than a class.

   TWO WAYS THIS BREAKS WHILE RENDERING PERFECTLY, both pinned below:

     1. A STORED PROFILE SILENTLY RESETS. normalizeProfile pulls an illegal
        policy back to the entity default, so without POLICY_MIGRATE every
        localStorage row holding `reference` would drop to its default —
        server-only for most entities. The screen would look right and would
        have stopped shipping half the registry.

     2. THE REGISTRY BECOMES A WALL OF RED. The merged class needs a dataspy,
        and seven entities that were `reference` never had one. entityBounded()
        is the escape — derived from DATASPIES so the screen can never demand
        a selection it cannot offer. A hand-maintained flag is what would make
        that unreachable state reachable again. */
console.log('\nOffline profile — five policies merged into four');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("offline"); openProfile(PROFILES[0].id);');
  ok('the retired keys are gone from the policy set',
    evb(ctx, 'OFFLINE_POLICIES.every(function(p){ return p.k !== "reference" && p.k !== "on-demand"; })'));
  ok('...and no entity still offers one',
    evb(ctx, 'OFFLINE_ENTITIES.every(function(e){' +
      ' return e.allow.indexOf("reference") === -1 && e.allow.indexOf("on-demand") === -1 &&' +
      '   e.dflt !== "reference" && e.dflt !== "on-demand"; })'));
  ok('every entity default is a policy that entity actually allows',
    evb(ctx, 'OFFLINE_ENTITIES.every(function(e){ return e.allow.indexOf(e.dflt) > -1; })'));
  ok('...and no allow list carries a duplicate after the merge collapsed two into one',
    evb(ctx, 'OFFLINE_ENTITIES.every(function(e){' +
      ' return e.allow.length === e.allow.filter(function(k,i){ return e.allow.indexOf(k) === i; }).length; })'));

  /* Failure mode 1. Asserted by writing a retired key straight into a stored
     profile, which is exactly what an upgrade finds in localStorage.

     THE ENTITIES HERE ARE CHOSEN, NOT ARBITRARY. The obvious pick — Employees,
     whose default IS offline-read — passes with the migration deleted, because
     the illegal-policy guard below it resets to a default that happens to be
     the same value. A negative control caught that. These two have defaults
     that DIFFER from the migration target, so only the migration can produce
     the expected result: 'wo' would fall back to work-set (wrong policy) and
     'eqstructure' to server-only (stops shipping entirely, silently). */
  ok('a stored retired key MIGRATES rather than falling back to the default',
    evb(ctx, '(function(){' +
      'var p = artifactOf("offline", PROFILES[0].id);' +
      'p.entities.wo.policy = "reference";' +
      'p.entities.eqstructure.policy = "on-demand";' +
      'normalizeProfile(p);' +
      'return p.entities.wo.policy === "offline-read" &&' +
      '  p.entities.eqstructure.policy === "offline-read"; })()'));

  /* Failure mode 2. The invariant is what matters, not which entities are
     currently bounded: a row may never REQUIRE a dataspy it cannot offer. */
  ok('no entity can ever require a dataspy it has none to offer',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'return OFFLINE_ENTITIES.every(function(e){' +
      '  return !rowNeedsDataspy(e, p.entities[e.id], p) || dataspiesFor(e.id).length > 0; }); })()'));
  ok('an entity whose whole domain FITS offers All records rather than demanding a filter',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'var fits = OFFLINE_ENTITIES.filter(function(e){ return e.status !== "open" && !e.traversed &&' +
      '  p.entities[e.id].policy === "offline-read" && wholeDomainFits(e, p); });' +
      'var g = document.getElementById("gallery").innerHTML;' +
      'var a = g.indexOf(\'<div class="reg">\'), z = g.indexOf("Lookup resolution");' +
      'var h = g.slice(a, z);' +
      'return fits.length > 0 && (h.match(/>All records</g) || []).length === fits.length; })()'));
  ok('the control and the validator agree, because both call rowNeedsDataspy',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[1].id));' +
      'var need = OFFLINE_ENTITIES.filter(function(e){ return rowNeedsDataspy(e, p.entities[e.id], p) &&' +
      '  !p.entities[e.id].dataspy; });' +
      'var errs = profileIssues(p).filter(function(i){ return i.sev === "error" &&' +
      '  i.msg.indexOf("needs a dataspy") === 0; });' +
      'return need.length === errs.length; })()'));
  /* §2.7's refused "all records" state has to STILL be reachable — the merge
     must not have turned a real authoring error into an implicit default. */
  ok('the genuinely-refused state survives the merge on Contractor lite',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[1].id));' +
      'return p.entities.equipment.policy === "offline-read" && !p.entities.equipment.dataspy &&' +
      '  profileIssues(p).some(function(i){ return i.entity.id === "equipment" && i.sev === "error"; }); })()'));
  /* And the demo's main profile must NOT open on migration-artefact errors. */
  ok('...while Field technician opens with no dataspy errors of its own',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'return profileIssues(p).filter(function(i){ return i.sev === "error"; }).length === 0; })()'));

  /* ── THE MEMBERSHIP EXCEPTION (§2.6, locked 2026-09-23) ──
     The punch-list dataspy lives on the Work Orders row, and a group that
     replicates NOTHING still has a punch list, because membership is answered
     server-side. Both halves of this failed silently before the fix: the
     dataspy was wiped on load, and the control collapsed to a dash so there
     was nowhere to set one. Neither showed a symptom, which is the whole
     argument for pinning them. */
  ok('Work Orders is the one entity declared as carrying MEMBERSHIP',
    evb(ctx, '(function(){' +
      'var m = OFFLINE_ENTITIES.filter(isMembershipEntity);' +
      'return m.length === 1 && m[0].id === "wo"; })()'));
  ok('the Online only profile ships no records and still names a work list',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[2].id));' +
      'return p.entities.wo.policy === "server-only" && p.entities.wo.dataspy === "My Open WOs"; })()'));
  ok('...and normalizeProfile does NOT wipe it, however many times it runs',
    evb(ctx, '(function(){' +
      'var p = artifactOf("offline", PROFILES[2].id);' +
      'normalizeProfile(p); normalizeProfile(p); normalizeProfile(p);' +
      'return p.entities.wo.dataspy === "My Open WOs"; })()'));
  ok('...while a NON-membership row on the same policy is still cleared',
    evb(ctx, '(function(){' +
      'var p = artifactOf("offline", PROFILES[2].id);' +
      'p.entities.equipment.policy = "server-only";' +
      'p.entities.equipment.dataspy = "Critical Assets";' +
      'normalizeProfile(p);' +
      'return p.entities.equipment.dataspy === ""; })()'));
  ok('the online-only Work Orders row renders a live select, not a dash',
    evb(ctx, '(function(){' +
      'openProfile(PROFILES[2].id);' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'var k = h.indexOf("Work Orders");' +
      'var seg = h.slice(k, k + 2400);' +
      'return seg.indexOf("setEntityDataspy") > -1 && seg.indexOf("<select") > -1; })()'));
  ok('...and its empty option says PINS ONLY, never "All records"',
    evb(ctx, '(function(){' +
      'openProfile(PROFILES[2].id);' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'var i = h.indexOf("Work Orders");' +
      'var seg = h.slice(i, i + 2400);' +
      'return seg.indexOf("No automatic list") > -1 && seg.indexOf(">All records<") === -1; })()'));
}

/* ── THE RULE IS MEASURED, NOT DESCRIBED (2026-09-18, user direction) ──
   "Can this entity ship whole" is arithmetic against §2.7's caps. Two earlier
   implementations were description-reliant — a hand-kept `bounded` column, then
   `no dataspy is authored` — and both are gone.

   THE LOAD-BEARING ASSERTION IS CAP SENSITIVITY. A description dressed up as a
   function still returns the right answers for the shipped registry; what it
   cannot do is CHANGE its answer when the cap changes. So the test moves the
   cap and requires the verdict to move with it. Everything else here could pass
   with the old rule hardcoded.

   The second one worth keeping is that BOTH dimensions bind on real rows.
   A records-only rule passes every other assertion in this file and still
   ships 625 MB onto a 500 MB device. */
console.log('\nOffline profile — "can it ship whole" is arithmetic, not a description');
{
  const ctx = boot('wf-bk-full');
  ev(ctx, 'resetPortal(); setArea("offline"); openProfile(PROFILES[0].id);');

  ok('the description-based predicates are gone',
    evb(ctx, 'typeof entityBounded === "undefined" &&' +
      ' OFFLINE_ENTITIES.every(function(e){ return e.bounded === undefined; })'));
  ok('every non-traversed entity carries a row count and a row size to measure',
    evb(ctx, 'OFFLINE_ENTITIES.filter(function(e){ return !e.traversed; })' +
      '.every(function(e){ return typeof e.rows === "number" && typeof e.kb === "number"; })'));
  ok('volumeMb joined the caps, sourced from SLO-8',
    evb(ctx, 'OFFLINE_CAP_DEFAULTS.volumeMb === 500'));
  ok('...and it is protected like every other cap',
    evb(ctx, 'setCap("volumeMb", 99999) === false &&' +
      ' artifactOf("offline", PROFILES[0].id).caps.volumeMb === 500'));

  /* THE ONE THAT PROVES IT IS MEASURED. */
  ok('LOWERING the row cap turns a fitting entity into one that needs a filter',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'var e = offlineEntity("taskplans");' +
      'var before = rowNeedsDataspy(e, p.entities[e.id], p);' +
      'p.caps.rowCap = 100;' +
      'var after = rowNeedsDataspy(e, p.entities[e.id], p);' +
      'p.caps.rowCap = 50000;' +
      'return before === false && after === true; })()'));
  ok('...and LOWERING the volume budget does the same, independently of rows',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'var e = offlineEntity("taskplans");' +
      'var before = rowNeedsDataspy(e, p.entities[e.id], p);' +
      'p.caps.volumeMb = 1;' +
      'var after = rowNeedsDataspy(e, p.entities[e.id], p);' +
      'p.caps.volumeMb = 500;' +
      'return before === false && after === true; })()'));

  /* BOTH DIMENSIONS BIND ON REAL ROWS — a records-only rule would ship 625 MB. */
  ok('at least one entity is caught by the ROW cap',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'return OFFLINE_ENTITIES.some(function(e){ return !e.traversed && e.rows != null &&' +
      '  capBreach(e, {policy:"offline-read", dataspy:""}, p) === "rows"; }); })()'));
  ok('...and at least one by the VOLUME budget while FITTING the row cap',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'return OFFLINE_ENTITIES.some(function(e){ return !e.traversed && e.rows != null &&' +
      '  e.rows <= p.caps.rowCap &&' +
      '  capBreach(e, {policy:"offline-read", dataspy:""}, p) === "volume"; }); })()'));
  ok('the error names WHICH cap it breached, never just "does not fit"',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[1].id));' +
      'var e = profileIssues(p).filter(function(i){ return i.msg.indexOf("needs a dataspy") === 0; });' +
      'return e.length > 0 && e.every(function(i){' +
      '  return i.msg.indexOf("MB budget") > -1 || i.msg.indexOf("row cap") > -1; }); })()'));

  /* A filter that is itself over cap is the fix somebody reaches for first. */
  ok('a dataspy that is ITSELF over cap is reported too',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'p.caps.rowCap = 50;' +
      'var bad = profileIssues(p).some(function(i){ return i.msg.indexOf("its dataspy is still over cap") === 0; });' +
      'p.caps.rowCap = 50000;' +
      'return bad; })()'));

  /* The caps card computes against two of the caps rather than only showing
     them, and reports over-budget ON the cap — §30.20, not a banner. */
  ok('profileTotals excludes traversed entities, which are budgeted with the parent',
    evb(ctx, '(function(){' +
      'var p = normalizeProfile(artifactOf("offline", PROFILES[0].id));' +
      'var t = profileTotals(p);' +
      'var trav = OFFLINE_ENTITIES.filter(function(e){ return e.traversed; });' +
      'return trav.length > 0 && t.rows > 0 && trav.every(function(e){' +
      '  return entityRows(e, p.entities[e.id]) === null; }); })()'));
  ok('an over-budget profile says so ON the cap it breaches, not in a banner',
    evb(ctx, '(function(){' +
      'openProfile(PROFILES[1].id);' +
      'var g = document.getElementById("gallery").innerHTML;' +
      'var i = g.indexOf("Local store budget");' +
      'return i > -1 && g.slice(i, i + 400).indexOf("over budget") > -1; })()'));

  /* The measurement is rendered as text, so a bare "<" opens a tag and the
     browser swallows the rest of the caption. Four rows shipped that way. */
  ok('a sub-1 MB measurement is HTML-escaped, not a raw "<"',
    evb(ctx, '(function(){' +
      'openProfile(PROFILES[1].id);' +
      'var g = document.getElementById("gallery").innerHTML;' +
      'return g.indexOf("&lt;1 MB") > -1 && g.indexOf("· <1") === -1; })()'));
}


/* ═══════════════════════════════════════════════════════════════════════
   CONDITION FORK (§30.19) — a fork the SYSTEM answers
   ═══════════════════════════════════════════════════════════════════════
   The load-bearing claims, in order of how badly each would fail silently:
   the field reference is re-validated on every structural change; an empty
   value is NOT false; an operator can never outlive the field type it was
   chosen for; and routing stays forward-only through the same code path
   §29.4 already uses. */
console.log('\nCondition fork — one routing model, two answerers');
{
  const ctx = boot('wf-pm-routed');
  /* Seeded live, the same reason ZJ1000 ships capability-limited. */
  ok('a condition fork ships in the demo data',
    evb(ctx, 'wf().nodes.filter(function(n){return n.kind==="cond";}).length === 1'));
  ok('it reads back as a sentence',
    evb(ctx, 'condSummary(wf(), wf().nodes.filter(function(n){return n.kind==="cond";})[0]) === "Flag for Follow-up is checked"'));

  /* An ACTION by §30.11's rule — the technician never visits it — but a
     FORK by routing. Both have to be true at once. */
  ok('it is a fork kind but NOT a step kind',
    evb(ctx, '(function(){var c=wf().nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'return isForkKind(c) && !isStepKind(c);})()'));
  ok('so it takes no rail number and is out of the numbered sequence',
    evb(ctx, '(function(){var c=wf().nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'return seqNodes(wf()).indexOf(c) === -1;})()'));

  /* ONE implementation, not two. If these diverge, every §29.4 rule has to
     be re-proved for the second kind. */
  ok('both kinds route through the same branch accessor',
    evb(ctx, '(function(){' +
      'var q = forkBranches({kind:"fork"}).map(function(p){return p[1];}).join(",");' +
      'var c = forkBranches({kind:"cond"}).map(function(p){return p[1];}).join(",");' +
      'return q === "yesTarget,noTarget" && c === "tTrue,tFalse";})()'));
  ok('naSet skips the steps between a CONDITION fork and its target',
    evb(ctx, '(function(){var w=wf();' +
      'var c=w.nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'var na=naSet(w, (function(){var o={}; o[c.nid]="false"; return o;})());' +
      'return na.size > 0;})()'));
}

console.log('\nCondition fork — it reads the CURRENT screen, and only that');
{
  const ctx = boot('wf-pm-routed');
  ok('its source is the nearest STEP in front of it',
    evb(ctx, '(function(){var w=wf(), fl=flowNodes(w);' +
      'var c=w.nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'var src=condSourceStep(w,c);' +
      'var i=fl.indexOf(c), j=fl.indexOf(src);' +
      'return !!src && j < i && isStepKind(src) &&' +
      '  fl.slice(j+1, i).every(function(x){return !isStepKind(x);});})()'));
  /* Routing on a field the technician cannot see is invisible logic, and a
     control has no value to test. Both exclusions are the point. */
  ok('a HIDDEN field is never offered',
    evb(ctx, '(function(){var w=wf();' +
      'var c=w.nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'var src=condSourceStep(w,c);' +
      'var hid=[]; src.layout.forEach(function(s){(s.fields||[]).forEach(function(f){' +
      '  if(f.behavior==="hid") hid.push(f.api);});});' +
      'var offered=condFieldsFor(w,c).map(function(f){return f.api;});' +
      'return hid.every(function(a){return offered.indexOf(a)===-1;});})()'));
  ok('a BUTTON is never offered — a control has no value',
    evb(ctx, 'condOpsFor("button").length === 0 && !condTypeIsTestable("button")'));
  ok('a fork with no step in front of it reports it rather than listing nothing',
    evb(ctx, '(function(){var w=wf();' +
      'var c=mkCondNode({}); w.nodes.unshift(c);' +
      'var none = condSourceStep(w,c) === null && condFieldsFor(w,c).length === 0;' +
      'w.nodes.shift();' +
      'return none;})()'));
}

console.log('\nCondition fork — operators come from the FIELD TYPE');
{
  const ctx = boot('wf-pm-routed');
  ok('a number offers comparisons; a checkbox does not',
    evb(ctx, '(function(){' +
      'var num=condOpsFor("num").map(function(o){return o.k;});' +
      'var bool=condOpsFor("bool").map(function(o){return o.k;});' +
      'return num.indexOf("gt")>-1 && num.indexOf("ge")>-1 &&' +
      '  bool.indexOf("gt")===-1 && bool.join(",")==="true,false";})()'));
  ok('only the operators that need one declare a value',
    evb(ctx, '(function(){' +
      'var e=condOpsFor("text").filter(function(o){return o.k==="empty";})[0];' +
      'var q=condOpsFor("text").filter(function(o){return o.k==="eq";})[0];' +
      'return e.val === false && q.val === true;})()'));
  /* Guarded AT THE MUTATION, so a direct call is refused too. */
  ok('setCondOp REFUSES an operator the field type does not have',
    evb(ctx, '(function(){var w=wf();' +
      'var c=w.nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'setCondOp(c.nid, "gt");' +   /* CHK_FLAG is a bool */
      'return c.op !== "gt";})()'));
  ok('changing the field clears the operator AND the value',
    evb(ctx, '(function(){var w=wf();' +
      'var c=w.nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'c.op="eq"; c.value="X";' +
      'var other=condFieldsFor(w,c).filter(function(f){return f.api!==c.field;})[0];' +
      'if(!other) return false;' +
      'setCondField(c.nid, other.api);' +
      'return c.op === "" && c.value === "";})()'));
}

console.log('\nCondition fork — EMPTY IS NOT FALSE');
{
  const ctx = boot('wf-pm-routed');
  /* The single sharpest trap in a two-branch shape: forward gating means a
     later field is empty by construction, and an Optional field can be
     left blank. Sending every unknown down the false path would be wrong
     and invisible. */
  ok('a comparison against an empty value is NULL, not false',
    ev(ctx, 'condEval({op:"gt", value:"5"}, "num", "")') === null);
  ok('...and null is distinguishable from a real false',
    ev(ctx, 'condEval({op:"gt", value:"5"}, "num", 1)') === false);
  ok('a real comparison still evaluates',
    ev(ctx, 'condEval({op:"gt", value:"5"}, "num", 9)') === true);
  ok('is-empty and is-not-empty are the operators that DO test emptiness',
    ev(ctx, 'condEval({op:"empty"}, "text", "")') === true &&
    ev(ctx, 'condEval({op:"notempty"}, "text", "")') === false);
  ok('a checkbox reads false when unticked rather than null — a bool is never unknown',
    ev(ctx, 'condEval({op:"true"}, "bool", "")') === false &&
    ev(ctx, 'condEval({op:"false"}, "bool", "")') === true);
  ok('an unknown operator is null, never an accidental branch',
    ev(ctx, 'condEval({op:"nonsense", value:"1"}, "num", 5)') === null);
}

console.log('\nCondition fork — the field reference is validated like a target');
{
  const ctx = boot('wf-pm-routed');
  /* THE ONE THAT WOULD FAIL SILENTLY. A condition fork's input belongs to
     whatever step now precedes it. Reorder the flow and that changes; the
     rule would then evaluate to "cannot tell" forever, routing nothing,
     with nothing on screen saying so. §29.4's "enforced twice" has to
     cover the INPUT as well as the output. */
  ok('moving the fork away from its source step clears the field, and counts it',
    evb(ctx, '(function(){var w=wf();' +
      'var c=w.nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'if(!c.field) return false;' +
      'w.nodes.splice(w.nodes.indexOf(c),1); w.nodes.unshift(c);' +
      'var cleared = validateForks(w);' +
      'return c.field === "" && c.op === "" && cleared > 0;})()'));
  ok('a stale field reference is reported ON THE NODE, not in a banner',
    evb(ctx, '(function(){var w=wf();' +
      'var c=w.nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'c.field = "NO_SUCH_FIELD"; render();' +
      'var h=document.getElementById("cv").innerHTML;' +
      'return h.indexOf("pick a field again") > -1 || h.indexOf("no such") > -1 ||' +
      '  h.indexOf("not on") > -1 || condSummary(w,c).indexOf("no longer") > -1;})()'));
}

console.log('\nCondition fork — routing rules, on a clean flow');
{
  /* ITS OWN CONTEXT. The block above deliberately moves the fork to index 0
     to prove the field clears — which also makes every step a FORWARD target,
     so a backward-route assertion sharing that context would pass for the
     wrong reason. Third time this shape of contamination has bitten in this
     file; the rule is that an assertion owns its setup. */
  const ctx = boot('wf-pm-routed');
  ok('routing stays forward-only, refused at the mutation',
    evb(ctx, '(function(){var w=wf(), fl=flowNodes(w);' +
      'var c=w.nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'var first=fl.filter(isStepKind)[0];' +
      'c.tTrue = null;' +
      'setCondTarget(c.nid, "tTrue", first.nid);' +
      'return !c.tTrue;})()'));
  ok('deleting a step clears a condition fork target pointing at it',
    evb(ctx, '(function(){var w=wf(), fl=flowNodes(w);' +
      'var c=w.nodes.filter(function(n){return n.kind==="cond";})[0];' +
      'var later=fl.slice(fl.indexOf(c)+1).filter(isStepKind);' +
      'if(later.length<2) return false;' +
      'var t=later[1]; c.tTrue=t.nid;' +
      'w.nodes.splice(w.nodes.indexOf(t),1);' +
      'validateForks(w);' +
      'return c.tTrue === null;})()'));
}

console.log('\nNO SUMMARY SURFACES (2026-09-16)');
{
  const ctx = boot('wf-bk-full');
  /* Removed on direct instruction: roll-up panels put devs off, and the
     house idiom is an error raised where the action is. Every validator is
     KEPT — only the aggregated presentation went. */
  ok('galleryShell renders no collision band even when handed conflicts',
    evb(ctx, 'galleryShell({type:"workflow", title:"T", desc:"d", body:"<b>B</b>", ' +
      'conflicts:[{group:"G", msg:"m", arts:[], type:"workflow"}]}).indexOf("Assignment collisions") === -1'));
  ok('the capability banner is a no-op',
    evb(ctx, 'capabilityBannerHtml(wf()) === ""'));
  ok('the profile issue band is a no-op',
    evb(ctx, 'profileIssueBanner([{sev:"error", entity:{label:"X"}, msg:"m"}]) === ""'));
  ok('no area renders an "N to look at" panel',
    evb(ctx, '(function(){' +
      'var seen = "";' +
      '["workflows","home","offline","groups"].forEach(function(a){' +
      '  setArea(a); seen += document.getElementById("gallery").innerHTML; });' +
      'return seen.indexOf("to look at") === -1 && seen.indexOf("Assignment collisions") === -1;})()'));

  /* THE VALIDATORS ARE STILL THERE. This is what stops the removal being a
     silent loss of rules rather than a change of surface. */
  ok('...but every validator is still callable and still finds things',
    evb(ctx, 'typeof allConflicts === "function" && typeof profileIssues === "function" &&' +
      'typeof homeIssues === "function" && typeof capabilityGaps === "function" &&' +
      'typeof allHomeGaps === "function" && allConflicts().length > 0'));
  ok('and the rule is enforced where the assignment is made',
    evb(ctx, 'typeof wouldClash === "function"'));
}


console.log('\nThe 2026-09-17 pass — action modes, the grouped picker, one assignment popover');
{
  const ctx = boot('wf-bk-full');
  const DROP = id => ev(ctx,
    "drag={from:'lib',stepId:'" + id + "'}; dropIdx=2; dropZone='flow'; flowDrop(" + DRAG_EV + ");");

  /* ── THE CONDITION FORK'S FIELD PICKER (item 1) ──
     The container is a GROUPING, so it is an <optgroup> label — natively
     unselectable, which is what "protected section label" means with no JS
     holding it up. The failure this pins is the easy regression: putting the
     container back into the option text, where it is repeated on every row
     and still leaves the list flat. */
  ev(ctx, "drag={from:'lib',stepId:'cond'}; dropIdx=1; dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  const cn = 'wf().nodes.find(n=>n.kind==="cond")';
  const opts = () => ev(ctx, 'condFieldOptions(condFieldsFor(wf(),' + cn + '), null)');
  ok('the picker groups fields under their container', opts().indexOf('<optgroup label="') > -1);
  ok('there is a group per container, not one flat list',
    (opts().match(/<optgroup/g) || []).length > 1,
    String((opts().match(/<optgroup/g) || []).length) + ' groups');
  ok('an option carries the field description and nothing else',
    !/·|&#183;/.test(opts()) && opts().indexOf('optgroup') > -1);
  ok('every offered field is still reachable as a value', evb(ctx,
    '(function(){' +
    'var fs=condFieldsFor(wf(),' + cn + ');' +
    'var h=condFieldOptions(fs,null);' +
    'return fs.length > 0 && fs.every(function(f){return h.indexOf(\'value="\'+f.api+\'"\') > -1;});})()'));
  /* Grouped on the container INDEX, so two containers sharing a title stay
     two groups — merging them would claim a field lives somewhere it does
     not. */
  ok('two same-titled containers stay two groups', evb(ctx,
    '(function(){' +
    'var g=condFieldOptions([{api:"A",name:"a",type:"text",container:"Dup",cIdx:0},' +
    '{api:"B",name:"b",type:"text",container:"Dup",cIdx:1}], null);' +
    'return (g.match(/<optgroup/g)||[]).length === 2;})()'));

  /* ── A CONDITION FORK IS A FORK IN ITS OWN MENU (item 3) ──
     It used to fall through to the STEP menu, which offered it Screen
     Designer, Rename, Step settings and Move to More. Every one of those is
     either dead or wrong on a node with no layout, no rail entry and no
     gates. */
  const menu = () => ev(ctx, 'document.getElementById("menu").innerHTML');
  ev(ctx, 'nodeMenu({clientX:10,clientY:10},' + cn + '.nid);');
  ok('a condition fork is named as one', menu().indexOf('Condition fork') > -1);
  ok('...and it offers NO Screen Designer', menu().indexOf('Screen Designer') === -1);
  ok('...no Rename, no Step settings, no Move to More',
    menu().indexOf('Rename') === -1 && menu().indexOf('Step settings') === -1 &&
    menu().indexOf('Move to More') === -1);
  ok('...and it routes to the CONDITION editor, not the question one',
    menu().indexOf('openCondEditor') > -1 && menu().indexOf('openForkEditor') === -1);
  /* The question fork still gets its own, unchanged. Dropped rather than
     found in the seed — this workflow does not ship one. */
  ev(ctx, "drag={from:'lib',stepId:'fork'}; dropIdx=1; dropZone='flow'; flowDrop(" + DRAG_EV + "); closeModal();");
  const qf = 'wf().nodes.find(n=>n.kind==="fork")';
  ev(ctx, 'nodeMenu({clientX:10,clientY:10},' + qf + '.nid);');
  ok('a question fork still routes to its own editor',
    menu().indexOf('Question fork') > -1 && menu().indexOf('openForkEditor') > -1);
}

{
  const ctx = boot('wf-bk-full');
  const DROP = id => ev(ctx,
    "drag={from:'lib',stepId:'" + id + "'}; dropIdx=2; dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  const body = () => ev(ctx, 'document.getElementById("mbox").innerHTML');

  /* ── STATUS UPDATE: SYSTEM vs USER SELECTED (item 2) ──
     This replaces the earlier "End of Workflow when Closing is not present"
     idea: a user-selected status update placed last IS that prompt, and it
     composes, because it can sit anywhere in the flow rather than only at
     the end. */
  DROP('status');
  const a = 'wf().nodes.find(n=>n.action==="status")';
  ok('a status update defaults to the SYSTEM mode', ev(ctx, a + '.mode') === 'system');
  ok('the editor opens on the drop with two controls (entity + status)',
    (body().match(/<select/g) || []).length === 2);
  ok('...and offers the mode switch as a segmented control, not a checkbox',
    body().indexOf('seg__btn') > -1 && body().indexOf('System action') > -1 &&
      body().indexOf('User selected') > -1);

  ev(ctx, 'setStatusMode(' + a + '.nid,"user");');
  ok('switching to User selected sticks', ev(ctx, a + '.mode') === 'user');
  ok('the authored status is KEPT, so flipping back loses nothing',
    ev(ctx, a + '.status') === 'CLOSE');
  /* THE LIST IS NOT AUTHORED HERE. Base EAM's user-group status
     authorisation resolves it on the device — the same boundary §27.4 draws
     around a UDS definition. An authored subset would be a fifth place a
     status list lives. */
  ok('the status dropdown is GONE in user mode — nothing to author',
    (body().match(/<select/g) || []).length === 1);
  ok('...and it says so, as a protected value rather than an absence',
    body().indexOf('input--prot') > -1 && body().indexOf('status authorisation') > -1);
  ok('the pull-up is described: current status protected, new one picked',
    /current status/i.test(body()) && body().indexOf('protected') > -1);
  ok('CANCEL RETURNS AND DOES NOT ADVANCE — stated, because it is what stops ' +
     'an empty authorisation set being a dead end',
    body().indexOf('Cancel returns, it does not advance') > -1);
  ev(ctx, 'setStatusMode(' + a + '.nid,"system");');
  ok('flipping back restores the authored status control',
    ev(ctx, a + '.mode') === 'system' && (body().match(/<select/g) || []).length === 2);

  /* The mode is on the CARD, because it is the difference between an action
     nobody notices and one that stops the technician. */
  ev(ctx, 'setStatusMode(' + a + '.nid,"user"); closeModal(); renderCanvas();');
  const cv = () => ev(ctx, 'document.getElementById("cv").innerHTML');
  ok('the card says the technician picks it', cv().indexOf('Technician selects') > -1);
  ok('...and marks that it asks', cv().indexOf('Technician picks the status') > -1);

  /* THE PREVIEW DRAWS THE DIFFERENCE. Before this pass an action node in the
     preview rendered as a BLANK tab that THREW on click, because
     emulatorHtml() dereferences a layout an action has not got. */
  ok('a user-selected action previews as a pull-up over the faded step', evb(ctx,
    'previewWf("wf-bk-full"); pvSet("nid",' + a + '.nid);' +
    'document.getElementById("mbox").innerHTML.indexOf("emu-sheet") > -1'));
  ok('...and the sheet shows the current status with the protected bar', evb(ctx,
    'document.getElementById("mbox").innerHTML.indexOf("emu-f-bar prot") > -1'));
  ok('...and does not invent a status list the device will resolve', evb(ctx,
    'document.getElementById("mbox").innerHTML.indexOf("authorised to set") > -1'));
  ok('a system action previews as NO SCREEN, said rather than drawn blank', evb(ctx,
    '(function(){ closeModal(); setStatusMode(' + a + '.nid,"system"); closeModal();' +
    'previewWf("wf-bk-full"); pvSet("nid",' + a + '.nid);' +
    'var h=document.getElementById("mbox").innerHTML;' +
    'return h.indexOf("No screen at all") > -1 && h.indexOf("emu-sheet") === -1;})()'));
  ok('the preview tab strip NAMES an action instead of rendering an empty tab', evb(ctx,
    'document.getElementById("mbox").innerHTML.indexOf("Status update") > -1'));
  ev(ctx, 'closeModal();');
}

{
  const ctx = boot('wf-bk-full');
  const DROP = id => ev(ctx,
    "drag={from:'lib',stepId:'" + id + "'}; dropIdx=2; dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  const body = () => ev(ctx, 'document.getElementById("mbox").innerHTML');

  /* ── START TIMER (item 6) ── */
  DROP('timer');
  const t = 'wf().nodes.find(n=>n.action==="timer")';
  ok('a Start Timer drops in as an action, not a step', ev(ctx, t + '.kind') === 'action');
  ok('it has exactly ONE setting', evb(ctx,
    'Object.keys(' + t + ').filter(function(k){' +
    'return ["nid","kind","action","zone"].indexOf(k) === -1;}).join(",") === "mode"'));
  ok('it defaults to unattended, like the status action', ev(ctx, t + '.mode') === 'system');
  /* ONE FIELD FOR ONE CONCEPT. Start Timer shipped with a boolean `ask` for
     a few hours; three kinds asking the same question through two field
     shapes is §30.13's four-parallel-arrays failure at a smaller scale. */
  ok('every action answers the mode question through the SAME field', evb(ctx,
    'wf().nodes.filter(function(n){return n.kind==="action";})' +
    '.every(function(n){return ["system","user"].indexOf(n.mode) > -1 && n.ask === undefined;})'));
  ok('...read through one accessor, never a per-kind test', evb(ctx,
    'actionAsks({mode:"user"}) === true && actionAsks({mode:"system"}) === false &&' +
    'actionAsks({}) === false && actionAsks(null) === false'));
  ok('a persisted boolean `ask` MIGRATES rather than being read in two shapes', evb(ctx,
    '(function(){' +
    'var w = wf();' +
    'w.nodes.push({nid:"mig1", kind:"action", action:"timer", zone:"flow", ask:true});' +
    'w.nodes.push({nid:"mig2", kind:"action", action:"timer", zone:"flow", ask:false});' +
    'normalizeWf(w);' +
    'var a = nodeById(w,"mig1"), b = nodeById(w,"mig2");' +
    'return a.mode === "user" && b.mode === "system" &&' +
    '  a.ask === undefined && b.ask === undefined;})()'));
  ok('it is NOT a numbered step', ev(ctx, 'seqNodes(wf()).indexOf(' + t + ')') === -1);
  ok('it takes no rail entry', ev(ctx,
    'stepMapHtml(wf(), flowNodes(wf())[0], new Set()).indexOf("Start Timer")') === -1);
  ok('it cannot sit in the More group — it is positional', evb(ctx,
    '(function(){ moveToRef(' + t + '.nid, true); return ' + t + '.zone !== "ref"; })()'));
  ok('its editor is the timer one, not the status one', body().indexOf('Start Timer') > -1 &&
    body().indexOf('Status entity') === -1);
  ok('...and it offers the same two-mode segmented control',
    body().indexOf('seg__btn') > -1 && body().indexOf('System action') > -1 &&
      body().indexOf('User selected') > -1);

  ev(ctx, 'setActionMode(' + t + '.nid,"user");');
  ok('asking sticks', ev(ctx, t + '.mode') === 'user');
  /* THE ASYMMETRY IS DELIBERATE and is the one thing about this action that
     cannot be guessed from its name: declining the timer STILL ADVANCES,
     while cancelling a user-selected status does not. Nothing on the record
     depends on the timer. */
  ok('declining STILL ADVANCES, unlike a status Cancel — and says why',
    body().indexOf('still advances') > -1);
  ok('a timer that asks previews as a pull-up', evb(ctx,
    '(function(){ closeModal(); previewWf("wf-bk-full"); pvSet("nid",' + t + '.nid);' +
    'var h=document.getElementById("mbox").innerHTML;' +
    'return h.indexOf("emu-sheet") > -1 && h.indexOf("Start the timer?") > -1;})()'));
  ok('an unattended timer previews as no screen', evb(ctx,
    'closeModal(); setActionMode(' + t + '.nid,"system"); closeModal();' +
    'previewWf("wf-bk-full"); pvSet("nid",' + t + '.nid);' +
    'document.getElementById("mbox").innerHTML.indexOf("No screen at all") > -1'));
  ev(ctx, 'closeModal();');
}

console.log('\nStop Timer — the action that BOOKS (§30.21, reversed 2026-09-17)');
{
  /* WHY THIS EXISTS. It was refused earlier the same day on the premise that
     stopping a timer produces a labour record, a labour record needs a
     screen, and that screen is Book Labor — so a Stop elsewhere would need a
     second labour form behind it. The premise was wrong: §18.4's whole field
     set is derivable from a running timer plus the session, so nothing has
     to be asked and no form has to exist. The payoff is that Book Labor can
     sit in the More group and time capture stops depending on a visit. */
  const ctx = boot('wf-bk-full');
  const body = () => ev(ctx, 'document.getElementById("mbox").innerHTML');
  ev(ctx, "drag={from:'lib',stepId:'stoptimer'}; dropIdx=2; dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  const st = 'wf().nodes.find(n=>n.action==="stoptimer")';

  ok('it drops in as an action, not a step', ev(ctx, st + '.kind') === 'action');
  ok('it carries the SAME one setting as the other two actions', evb(ctx,
    'Object.keys(' + st + ').filter(function(k){' +
    'return ["nid","kind","action","zone"].indexOf(k) === -1;}).join(",") === "mode"'));
  ok('it defaults to booking unattended', ev(ctx, st + '.mode') === 'system');
  ok('it is NOT a numbered step', ev(ctx, 'seqNodes(wf()).indexOf(' + st + ')') === -1);
  ok('it takes no rail entry', ev(ctx,
    'stepMapHtml(wf(), flowNodes(wf())[0], new Set()).indexOf("Stop Timer")') === -1);
  ok('it cannot sit in the More group — it is positional', evb(ctx,
    '(function(){ moveToRef(' + st + '.nid, true); return ' + st + '.zone !== "ref"; })()'));
  ok('Free Form drops it with the other actions', evb(ctx,
    '(function(){var w=wf(); applyFreeForm(w);' +
    'return w.nodes.every(function(n){return n.kind!=="action";});})()'));

  /* THE ARGUMENT FOR ITS EXISTENCE IS ON THE SCREEN. If every row of §18.4's
     form can be shown filled in and locked at authoring time, none of it
     needs asking at runtime — so an admin can check the claim rather than
     taking it on trust. */
  const ctx2 = boot('wf-bk-full');
  const body2 = () => ev(ctx2, 'document.getElementById("mbox").innerHTML');
  ev(ctx2, "drag={from:'lib',stepId:'stoptimer'}; dropIdx=2; dropZone='flow'; flowDrop(" + DRAG_EV + ");");
  const st2 = 'wf().nodes.find(n=>n.action==="stoptimer")';
  ok('its editor opens on the drop, and it is the STOP editor',
    body2().indexOf('Stop Timer') > -1 && body2().indexOf('Status entity') === -1);
  ok('it names the payoff: Book Labor need not be in the flow',
    /Book Labor does not have to be in the flow|can sit in the <b>More<\/b> group|sit in the <b>More<\/b>/
      .test(body2()));
  ok('every derived field is listed, and every one is PROTECTED', evb(ctx2,
    '(function(){' +
    'var h = document.getElementById("mbox").innerHTML;' +
    'return STOP_TIMER_BOOKING.length >= 7 && STOP_TIMER_BOOKING.every(function(r){' +
    '  return h.indexOf(r.label) > -1; }) &&' +
    '  (h.match(/input--prot/g)||[]).length >= STOP_TIMER_BOOKING.length;})()'));
  ok('Type of Hours is in the list and marked NOT authorable', evb(ctx2,
    'STOP_TIMER_BOOKING.some(function(r){' +
    'return r.label === "Type of Hours" && /not authorable/.test(r.derived);})'));
  ok('...and the editor says why a workflow constant would be wrong',
    /depends on the shift/.test(body2()));
  ok('the three runtime edge cases are all stated', evb(ctx2,
    '(function(){var h=document.getElementById("mbox").innerHTML;' +
    'return /No timer running/.test(h) && /Discard never stops the timer/.test(h) &&' +
    '  /A Book Labor step alongside this is fine/.test(h);})()'));

  /* HOURS IS THE ONE EDITABLE FIELD (answered 2026-09-17). Elapsed time is
     not always worked time, and §18.3 makes booked labour immutable — so
     getting the number right before writing beats a correction after. */
  ev(ctx2, 'setActionMode(' + st2 + '.nid,"user");');
  ok('switching to confirm-first sticks', ev(ctx2, st2 + '.mode') === 'user');
  ok('the editor marks Hours as the editable one', evb(ctx2,
    '(function(){var h=document.getElementById("mbox").innerHTML;' +
    'return /Hours Worked[^<]*editable in the pull-up/.test(h);})()'));
  ok('Hours is NOT one of the derived rows — it is the one thing asked', evb(ctx2,
    '!STOP_TIMER_BOOKING.some(function(r){return /^Hours/.test(r.label);})'));

  ok('a confirming stop previews as a pull-up with ONE editable row', evb(ctx2,
    '(function(){ closeModal(); previewWf("wf-bk-full"); pvSet("nid",' + st2 + '.nid);' +
    'var h=document.getElementById("mbox").innerHTML;' +
    'return h.indexOf("emu-sheet") > -1 && (h.match(/emu-sheet__in[^-]/g)||[]).length === 1;})()'));
  ok('...with the derived rows protected beneath it', evb(ctx2,
    'document.getElementById("mbox").innerHTML.indexOf("emu-f-bar prot") > -1'));
  ok('...and it says Discard leaves the timer running', evb(ctx2,
    'document.getElementById("mbox").innerHTML.indexOf("leaves the timer running") > -1'));
  ok('an unattended stop previews as no screen, and names the More payoff', evb(ctx2,
    '(function(){ closeModal(); setActionMode(' + st2 + '.nid,"system"); closeModal();' +
    'previewWf("wf-bk-full"); pvSet("nid",' + st2 + '.nid);' +
    'var h=document.getElementById("mbox").innerHTML;' +
    'return h.indexOf("No screen at all") > -1 && h.indexOf("More") > -1;})()'));
  ev(ctx2, 'closeModal();');

  /* The card, and the library. */
  ev(ctx2, 'renderCanvas(); renderLib();');
  ok('the card says what it does, not just what it is', evb(ctx2,
    'document.getElementById("cv").innerHTML.indexOf("Books the time automatically") > -1'));
  ok('the library offers all four actions', evb(ctx2,
    '(function(){var l=document.getElementById("libBody").innerHTML;' +
    'return ["Question fork","Condition fork","Status update","Start Timer","Stop Timer"]' +
    '  .every(function(x){return l.indexOf(x) > -1;});})()'));

  /* THE REVERSED DECISION. The old refusal text must be GONE, not left
     sitting beside the feature contradicting it — an in-place supersession,
     which is this repo's own doc rule. */
  const src = require('fs').readFileSync(
    path.join(__dirname, '..', '..', '..', '..', '..', 'prototypes', 'standalone',
      'base screens', 'eam-workflow-portal-v1.html'), 'utf8');
  ok('the old "there is no Stop Timer" refusal is gone from the file',
    src.indexOf('There is no Stop Timer action') === -1);
  ok('...and the reversal records the premise that was wrong',
    src.indexOf('The premise is wrong') > -1);
}

{
  const ctx = boot('wf-bk-full');
  const ban = () => ev(ctx, 'document.getElementById("banner").innerHTML');

  /* ── THE BANNER ORDER (item 4) ──
     WO Type sits under the Description it qualifies; the function, which is
     the widest of the four values, took WO Type's old wide column. */
  ok('WO Type now comes AFTER the base screen in the source order',
    ban().indexOf('Base screen') < ban().indexOf('>WO Type<'),
    'fn@' + ban().indexOf('Base screen') + ' type@' + ban().indexOf('>WO Type<'));
  ok('the WO Type control carries its §23.3 colour', ban().indexOf('input__wt') > -1 &&
    ban().indexOf('--wo-type-breakdown') > -1);
  ok('...and the same glyph the device draws, not a lookalike symbol',
    ban().indexOf('<svg') > -1);
  ok('an uncoloured Type gets the neutral slot, never a fifth hue', evb(ctx,
    'woTypeBadge("CAL",14).indexOf("input__wt--none") > -1 &&' +
    'woTypeBadge("CAL",14).indexOf("wo-type") === -1'));
  ok('no WO Type at all still renders a slot, so the row does not jump', evb(ctx,
    'woTypeBadge(null,14).indexOf("input__wt") > -1'));

  /* ── ONE CLOSE AFFORDANCE (item 5) ── */
  const bar = () => ev(ctx, 'document.getElementById("cvbar").innerHTML');
  ev(ctx, 'openDsn(flowNodes(wf())[0].nid);');
  ok('the designer opens', ev(ctx, 'state.dsnOpen') === true);
  ok('the canvas bar no longer carries its own Close designer button',
    bar().indexOf('closeDsn()') === -1 && bar().indexOf('Close designer') === -1);
  ok('...and the panel keeps the one ✕ that does it',
    ev(ctx, 'document.getElementById("dsnHead").innerHTML').indexOf('closeDsn()') > -1);
  ok('the bar says where the close is instead of being a second one',
    bar().indexOf('close it with its own') > -1);
}

{
  /* ── ONE POPOVER, ONE GROUP (item 8) ──
     The old control opened, took a click, and then opened a SECOND popover,
     because the click went to toggleAssign() — the gallery-side
     artifact→groups control, asking about every OTHER group. */
  const ctx = boot(null);
  ev(ctx, 'setArea("groups"); pickGroup("MAINT-TECH");');
  const gal = () => ev(ctx, 'document.getElementById("gallery").innerHTML');
  const pop = () => ev(ctx, 'document.getElementById("pop").innerHTML');

  ok('the "No insert here" footer pill is gone', gal().indexOf('No insert here') === -1);
  ok('...but the rule it stated is still on the screen once',
    (gal().match(/Security ▸ User Groups/g) || []).length === 1);

  /* CARDINALITY DECIDES THE CONTROL SHAPE (§30.13). One-of-many is not a
     checkbox: a tick box beside each of three per-group artifacts invites a
     second tick and then reports a collision for taking the invitation. */
  ev(ctx, 'openGroupAssign({clientX:10,clientY:10},"MAINT-TECH","offline");');
  ok('a per-group artifact is offered as RADIOS', pop().indexOf('class="rdo') > -1 &&
    pop().indexOf('class="cbx') === -1);
  ok('...including a None row, so the control can express every state it enforces',
    pop().indexOf('>None<') > -1);
  ok('...and no Done button, because a radio closes itself',
    pop().indexOf('closePop()') === -1);
  ev(ctx, 'openGroupAssign({clientX:10,clientY:10},"MAINT-TECH","workflow");');
  ok('a workflow is offered as CHECKBOXES — a group holds one per WO Type',
    pop().indexOf('class="cbx') > -1 && pop().indexOf('class="rdo') === -1);
  ok('...and keeps a Done button, because a multi-select needs a way out',
    pop().indexOf('closePop()') > -1);

  /* A RADIO PICK REPLACES. That is the difference between the control being
     honest about "exactly one" and the screen reporting a collision the user
     was invited to create. */
  const profOf = g => ev(ctx, 'artifactsForGroup(' + JSON.stringify(g) + ',"offline").length');
  ok('MAINT-TECH starts with exactly one offline profile', profOf('MAINT-TECH') === 1);
  ok('picking a different one REPLACES rather than adding a second', evb(ctx,
    '(function(){' +
    'var had=artifactsForGroup("MAINT-TECH","offline")[0].artifactId;' +
    'var other=PROFILES.filter(function(p){return p.id!==had;})[0];' +
    'if(!other) return false;' +
    'groupAssignPick("offline", other.id, "MAINT-TECH");' +
    'var now=artifactsForGroup("MAINT-TECH","offline");' +
    'return now.length === 1 && now[0].artifactId === other.id;})()'));
  ok('...so a per-group collision can no longer be created from this side',
    ev(ctx, 'allConflicts().filter(function(c){' +
      'return c.type==="offline" && c.group==="MAINT-TECH";}).length') === 0);
  ok('the None row clears the explicit row', evb(ctx,
    '(function(){ groupAssignPick("offline","","MAINT-TECH");' +
    'return artifactsForGroup("MAINT-TECH","offline").length === 0; })()'));
  ok('...and it CLOSES on the pick, no second popover', evb(ctx,
    '!document.getElementById("pop").classList.contains("open")'));

  /* The multi-select side still refuses a clash before the click, from this
     side too (§30.2) — and still never calls the gallery-side control. */
  ok('a workflow clash is REFUSED at the pick, not reported after it', evb(ctx,
    '(function(){' +
    'var bk=WFS.filter(function(w){return !w.freeForm && w.woType==="BK";});' +
    'if(bk.length<2) return false;' +
    'var held=bk.filter(function(w){return groupsOf("workflow",w.id).indexOf("CONTRACTOR")>-1;})[0];' +
    'var free=bk.filter(function(w){return groupsOf("workflow",w.id).indexOf("CONTRACTOR")===-1;})[0];' +
    'if(!held || !free) return false;' +
    'groupAssignPick("workflow", free.id, "CONTRACTOR");' +
    'return !isAssigned("workflow", free.id, "CONTRACTOR");})()'));
  /* A legal pair is SEARCHED for rather than named: the seed deliberately
     holds collisions and near-collisions, so hardcoding one group meant the
     test was measuring the refusal above a second time. */
  ok('a legal workflow pick lands and the popover STAYS open for the next one', evb(ctx,
    '(function(){' +
    'var pair=null;' +
    'WFS.forEach(function(w){ GROUPS.forEach(function(g){' +
    '  if(pair) return;' +
    '  if(isAssigned("workflow", w.id, g)) return;' +
    '  if(wouldClash("workflow", w.id, g)) return;' +
    '  pair={id:w.id, g:g}; }); });' +
    'if(!pair) return false;' +
    'window.__pair = pair;' +
    'groupAssignPick("workflow", pair.id, pair.g);' +
    'return isAssigned("workflow", pair.id, pair.g) &&' +
    '  document.getElementById("pop").classList.contains("open");})()'));
  /* THE SECOND POPOVER, pinned as absent at its source. */
  ok('the group side NEVER calls the gallery-side control', evb(ctx,
    'groupAssignPick.toString().indexOf("openAssign") === -1'));
  ok('...and the group popover only ever writes through groupAssignPick', evb(ctx,
    'openGroupAssign.toString().indexOf("toggleAssign") === -1'));
  /* Both directions of the ONE table still agree — the load-bearing §30.13
     assertion, re-checked after a write from the reworked control. */
  ok('the one membership table still reads the same both ways', evb(ctx,
    '(function(){' +
    'var p = window.__pair; if(!p) return false;' +
    'return groupsOf("workflow", p.id).indexOf(p.g) > -1 &&' +
    '  artifactsForGroup(p.g,"workflow").some(function(r){return r.artifactId===p.id;});})()'));
}

/* ── THREE DEVICE-REPORTED FAULTS, 2026-09-23 ──
   All three looked correct in the markup and only showed on use, so each is
   pinned against the thing that actually broke rather than a screenshot. */
{
  const src = require('fs').readFileSync(
    path.join(__dirname, '..', '..', '..', '..', '..', 'prototypes', 'standalone',
      'base screens', 'eam-workflow-portal-v1.html'), 'utf8');
  const flat = src.replace(/\s+/g, ' ');

  /* 1. A native select's POPUP is painted by the UA, not by our CSS. With no
        colour scheme declared the panel stayed light while the options
        inherited our near-white text: the control read fine closed, and had
        no visible values the moment it was opened. */
  ok('the dark theme declares color-scheme, so the UA paints its own widgets dark',
    /\[data-uxt-theme="dark"\]\{[^}]*color-scheme: ?dark/.test(flat));
  ok('...and the light default declares the other half of the pair',
    /:root\{[^}]*color-scheme: ?light/.test(flat));
  /* UNSCOPED ON PURPOSE. A first pass scoped this to `.input>select` and so
     missed 14 of the file's 17 selects — every `.tinput`, the New tile
     modal's "Opens" among them. Match on the element, not on a wrapper. */
  ok('...and option/optgroup carry explicit colours, matched on the ELEMENT',
    /(?:\}|\*\/) ?option,optgroup\{[^}]*background:[^}]*color:[^}]*\}/.test(flat));
  ok('...and that rule is not scoped to a wrapper class, so no select misses it',
    flat.indexOf('.input>select option') === -1);
  ok('the closed control is still transparent — it was never the broken part',
    /\.input>input,\.input>select,\.input>textarea\{[^}]*background:0/.test(flat));

  /* 2. The dismiss listener skipped closeMenu() whenever the mousedown landed
        on a field. Fields are also bound to onclick, so "click away" almost
        always landed on another field and opened ITS menu — the menu could
        not be dismissed at all inside the designer, where nearly every pixel
        is a field. mousedown fires before click, so no exception is needed:
        the close-then-open order already lands on the right field. */
  ok('the menu dismiss listener has NO field exception',
    src.indexOf(".closest('.emu-f,.emu-cell')") === -1);
  ok('...and a mousedown outside the menu always closes it',
    /if\(!\$\('menu'\)\.contains\(e\.target\)\) closeMenu\(\);/.test(src));
  ok('...while a mousedown inside the menu still does not',
    src.indexOf("$('menu').contains(e.target)") > -1);
  ok('Escape still closes both surfaces',
    /if\(e\.key !== 'Escape'\) return;/.test(src) &&
    /closeMenu\(\); closePop\(\);/.test(src));

  /* 3. §30.9: the portal has ZERO links out, and a rail row is an AREA rather
        than a pointer at another screen. This one only raised a toast naming
        a base screen that is out of scope — the exact shape the rule exists
        to prevent, and how the dead User Group Setup link got there. */
  ok('the Function Permissions rail row is gone',
    src.indexOf('rail__row-label">Function Permissions') === -1);
  ok('...and no rail row raises a toast instead of opening an area',
    !/class="rail__row"[^>]*onclick="toast\(/.test(src));
}

console.log(fail ? '\n' + fail + ' FAILED\n' : '\nAll passed\n');
process.exit(fail ? 1 : 0);
