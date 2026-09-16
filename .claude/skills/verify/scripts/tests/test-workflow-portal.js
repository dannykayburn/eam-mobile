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
const evb = (ctx, expr) => { try { return vm.runInContext(expr, ctx); } catch (e) { return 'threw: ' + e.message; } };

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
  ok('it takes its label from the definition', ev(ctx, u + '.name') === 'Hot Work Permit');
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
    lib().indexOf('User defined screens') === -1 && lib().indexOf('Hot Work Permit') > -1);
  ok('an Actions section exists', lib().indexOf('Actions') > -1);
  ok('it holds the question fork and the status update',
    lib().indexOf('Question fork') > -1 && lib().indexOf('Status update') > -1);
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
  ok('all five policies carry who / def / why',
    evb(ctx, 'OFFLINE_POLICIES.length === 5 && OFFLINE_POLICIES.every(function(p){ return !!p.who && !!p.def && !!p.why; })'));
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
      '  POLICY_NEEDS_FILTER.indexOf("work-set") > -1 && POLICY_NEEDS_FILTER.indexOf("on-demand") > -1; })()'));
  ok('work-set and external-replica are the ONLY writable classes',
    evb(ctx, 'OFFLINE_POLICIES.filter(function(p){ return p.write; }).map(function(p){ return p.k; }).sort().join(",") === "external-replica,work-set"'));
  ok('server-only is the only class that reads nothing',
    evb(ctx, 'OFFLINE_POLICIES.filter(function(p){ return !p.read; }).map(function(p){ return p.k; }).join(",") === "server-only"'));
  ok('the card states the two things that catch people out',
    evb(ctx, '(function(){' +
      'var h = document.getElementById("gallery").innerHTML;' +
      'return h.indexOf("Only Work set accepts writes") > -1 && h.indexOf("traversed") > -1; })()'));
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

console.log(fail ? '\n' + fail + ' FAILED\n' : '\nAll passed\n');
process.exit(fail ? 1 : 0);
