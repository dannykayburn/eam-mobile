/* The step rail's "More" group (§14.8) — config-driven membership.

   WHY THIS FILE EXISTS. Until 2026-08-25 this group was called "Reference" and
   its three rows were hardcoded: a literal `WO_REFERENCE_LABELS` object plus a
   `stepMapReferenceGroupHtml()` that inlined three `<div>`s with three SVGs and
   three literal onclicks. Then the group was reframed — membership is
   CONFIGURATION, not definition. It holds whichever of the function's tabs the
   admin placed outside the sequence (`Placement = More` on §12's tier-2 rows).

   The failure mode this guards is regression by convenience: the group renders
   from `WO_MORE_TABS`, and the cheapest way to add a fourth row will always
   look like pasting another `<div>` into the template. Do that and membership
   silently stops being data, which is the whole property Screen Designer needs
   in order to author it at all (§20). So these assertions shrink the config at
   runtime and require the output to shrink with it — a hardcoded row survives
   that and gets caught.

   Two design rules from §14.8 are also pinned here because they are cheap to
   break and expensive to notice:
     - Plain icon, never a numbered badge. The badge is what implies sequence
       membership; a More row is not sequenced, so it must not look it.
     - An empty config renders NO group, not an orphan "MORE" header over
       nothing.

   Not pinned here, because they are not frontend-checkable: that a tab is
   either a Step or a More entry and never both (a §12 key constraint — if it
   were violated, forward gating would be bypassable in two taps, since Book
   Labor is both a workflow step and a real WO tab), and that a More tab is
   never Required. Both live in the base-side schema. */
const fs = require('fs'), path = require('path'), vm = require('vm');

const SHARED = path.join('C:/Users/dkilburn/Projects/eam-mobile/prototypes/standalone/shared/eam-shared.js');

let fail = 0;
function ok(label, pass, detail) {
  console.log('  ' + (pass ? 'PASS' : 'FAIL') + '  ' + label + (detail !== undefined ? '  → ' + detail : ''));
  if (!pass) fail++;
}

/* Real in-memory storage, not a no-op stub — a no-op makes every
   persistence-backed function silently do nothing, which reads as a pile of
   genuine logic failures. (Same trap the skill doc calls out.) */
const mkStore = () => {
  const m = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
  };
};

const sandbox = {
  console,
  localStorage: mkStore(),
  sessionStorage: mkStore(),
  navigator: { onLine: true },
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    documentElement: { setAttribute: () => {}, style: { setProperty: () => {} } },
    body: { classList: { add: () => {}, remove: () => {} } },
    createElement: () => ({ style: {}, classList: { add: () => {} }, appendChild: () => {} }),
  },
  window: {
    addEventListener: () => {},
    location: { href: '' },
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  },
};
sandbox.window.localStorage = sandbox.localStorage;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(SHARED, 'utf8'), sandbox, { filename: 'eam-shared.js' });

/* Top-level `const` in a vm script lands in the context's GLOBAL LEXICAL scope,
   not on the context object — so `sandbox.WO_MORE_TABS` is undefined while
   `WO_MORE_TABS` evaluates fine inside the context. Function declarations DO
   land on the object, which is why only the consts need this. */
const grab = (expr) => vm.runInContext(expr, sandbox);
const stepMapMoreGroupHtml = grab('stepMapMoreGroupHtml');
const woMoreLabel = grab('woMoreLabel');
const WO_MORE_TABS = grab('WO_MORE_TABS');
const WO_MORE_TAB_ICONS = grab('WO_MORE_TAB_ICONS');

console.log('\nthe group renders from config');
const h = stepMapMoreGroupHtml(null);
ok('group label is "More", not "Reference"', /<div class="step-map-group-label">More<\/div>/.test(h));
ok('no "Reference" left in the rendered markup', !/Reference/.test(h));
ok('one row per configured tab', (h.match(/step-map-item/g) || []).length === WO_MORE_TABS.length,
   (h.match(/step-map-item/g) || []).length + ' rows / ' + WO_MORE_TABS.length + ' configured');

for (const t of WO_MORE_TABS) {
  ok('  row rendered: ' + t.label, h.includes('>' + t.label + '<'));
  ok('  dispatches via openWoMoreTab: ' + t.key, h.includes("openWoMoreTab('" + t.key + "')"));
  ok('  carries a real icon: ' + t.icon, !!WO_MORE_TAB_ICONS[t.icon] && h.includes(WO_MORE_TAB_ICONS[t.icon].slice(0, 40)));
}

console.log('\n§14.8 — not sequence-gated, so it must not look sequence-gated');
ok('plain icon only — no numbered done/active/locked badge', !/step-map-icon|smi-active/.test(h));
ok('every row uses the plain ref-icon slot',
   (h.match(/step-map-ref-icon/g) || []).length === WO_MORE_TABS.length);

console.log('\nactiveRef highlights the destination on screen (§16.10)');
const ha = stepMapMoreGroupHtml('equipment');
ok('exactly one row marked active', (ha.match(/step-map-item active/g) || []).length === 1);
ok('and it is the matching one', ha.includes('active-label">Equipment'));
ok('a non-member key highlights nothing', (stepMapMoreGroupHtml('nope').match(/ active/g) || []).length === 0);
ok('woMoreLabel resolves a member', woMoreLabel('equipment') === 'Equipment', woMoreLabel('equipment'));
ok('woMoreLabel is safe on an unknown key', woMoreLabel('nope') === '');

/* The real point of the file: shrink the config, the group must shrink. A
   hardcoded row survives this and shows up as a count mismatch. */
console.log('\nmembership is DATA — shrink the config, the group shrinks');
const saved = WO_MORE_TABS.slice();
WO_MORE_TABS.length = 0;
WO_MORE_TABS.push({ key: 'comments', label: 'Comments', icon: 'comment', open: () => {} });
const one = stepMapMoreGroupHtml(null);
ok('1 configured tab → exactly 1 row', (one.match(/step-map-item/g) || []).length === 1,
   (one.match(/step-map-item/g) || []).length);
ok('and the dropped rows are really gone', !one.includes('>Equipment<') && !one.includes('>Documents<'));

WO_MORE_TABS.length = 0;
ok('empty config → no group at all, not an orphan header', stepMapMoreGroupHtml(null) === '');

WO_MORE_TABS.push(...saved);
ok('config restored for any later assertions', WO_MORE_TABS.length === saved.length, WO_MORE_TABS.length);

console.log('\nsuperseded shim');
ok('jumpToEquipmentStub() is gone (openWoMoreTab replaced it)', grab('typeof jumpToEquipmentStub') === 'undefined');

console.log(fail ? '\n' + fail + ' FAILED' : '\nall More-group assertions pass');
process.exit(fail ? 1 : 0);
