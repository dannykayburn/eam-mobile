/* Scroll mode (the checklist snap-pager A/B) — structural regressions.
   TEMPORARY: delete this file together with
   eam-activity-checklist-prototype-v2-scrollmode.html, whichever way the A/B
   lands. If scroll mode is folded into v2, move these assertions with it.

   What this can and cannot cover. The core of scroll mode is geometry and
   gesture — does a flick land on the next item, does the window rebuild show a
   lurch, does iOS fight the snap while the keyboard is up. None of that is
   reachable from a DOM shim with a fixed getBoundingClientRect, and pretending
   otherwise would be worse than not testing it. What IS reachable, and worth
   guarding, is the invariant the whole design rests on:

     exactly one item on screen owns the singleton chrome.

   The shared Comments/Documents renderers bind to module-level COMMENTS_DATA /
   DOCUMENTS_DATA and to fixed element ids (#fv-itemNotes, #itemCommentsMount,
   #rv-comments…). If a future edit "improves" the neighbour stubs into full
   items, there is no error — Notes silently edits the wrong item's note and the
   comment count silently belongs to whichever panel rendered last. That is a
   quiet data-corruption bug on a technician's device, so it gets a test. */
const { runScreen } = require('../run-load.js');
const vm = require('vm');

/* Read/poke the screen's own state through the vm context, not as properties of
   it. Top-level `const`/`let` (ITEMS, SCROLL_MODE, cursor) live in the
   context's global *lexical* scope and are NOT own properties of the context
   object — `ctx.ITEMS` is undefined even though the screen sees it fine. Only
   `function` declarations show up as properties. Evaluating inside the context
   sees everything, so route every read and call through ev(). */
const ev = (ctx, code) => vm.runInContext(code, ctx);

const FILE = 'eam-activity-checklist-prototype-v2-scrollmode.html';
let fail = 0;
function ok(label, pass, detail) {
  console.log('  ' + (pass ? 'PASS' : 'FAIL') + '  ' + label + (detail ? '  → ' + detail : ''));
  if (!pass) fail++;
}
const count = (s, re) => (String(s).match(re) || []).length;
const wrapHtml = ctx => ev(ctx, "document.getElementById('focusWrap').innerHTML");

/* ── scroll mode ─────────────────────────────────────────────────────── */
console.log('\nscroll mode — panel window structure');
const ctx = runScreen(FILE, null);
const total = ev(ctx, 'ITEMS.length');
ok('scroll mode is the default', ev(ctx, 'SCROLL_MODE') === true);
ok('more than 3 items to page through', total > 3, String(total) + ' items');

// Item 1: no previous panel exists, so one stub only (the next item).
ev(ctx, 'jumpTo(0)');
let h = wrapHtml(ctx);
ok('first item renders 1 current panel', count(h, /class="snap-panel is-current"/g) === 1);
ok('first item renders 1 stub (next only)', count(h, /class="snap-panel is-stub"/g) === 1);
ok('no Previous tag on the first item', !/Previous ·/.test(h));

// A middle item: stubs both sides, and the indices must be cursor ± 1. An
// off-by-one here would show the wrong item as "next up" — and, because a stub
// is tappable, would jump somewhere other than where it was pointing.
ev(ctx, 'jumpTo(2)');
h = wrapHtml(ctx);
ok('middle item renders 2 stubs', count(h, /class="snap-panel is-stub"/g) === 2);
ok('current panel carries its own index', /class="snap-panel is-current" data-idx="2"/.test(h));
ok('stubs are cursor-1 and cursor+1',
  /is-stub" data-idx="1"/.test(h) && /is-stub" data-idx="3"/.test(h));
ok('stub tags name their direction', /Previous ·/.test(h) && /Next up ·/.test(h));
// Stub item numbers are 1-based for a human, matching the rail's "Item X of Y".
ok('stub numbering is 1-based', /Previous · Item 02/.test(h) && /Next up · Item 04/.test(h));

// Last item: no next panel.
ev(ctx, 'jumpTo(' + (total - 1) + ')');
h = wrapHtml(ctx);
ok('last item renders 1 stub (previous only)', count(h, /class="snap-panel is-stub"/g) === 1);
ok('no Next up tag on the last item', !/Next up ·/.test(h));

/* ── the invariant ───────────────────────────────────────────────────── */
console.log('\nsingleton chrome — one owner, always');
ev(ctx, 'jumpTo(2)');
h = wrapHtml(ctx);
ok('exactly one Notes field on screen', count(h, /id="fv-itemNotes"/g) === 1, String(count(h, /id="fv-itemNotes"/g)));
ok('exactly one Comments mount',       count(h, /id="itemCommentsMount"/g) === 1);
ok('exactly one Documents mount',      count(h, /id="itemDocumentsMount"/g) === 1);
ok('exactly one Comments badge',       count(h, /id="itemCommentsBadge"/g) === 1);
ok('stubs carry no Comments section',  count(h, /rv-toggle-title">Comments/g) === 1);
ok('stubs carry no follow-up button',  count(h, /followup-btn-lg/g) === 1);
// The other half of the same hazard: every control handler writes to
// ITEMS[cursor], so a live control inside a stub answers the WRONG item. The
// guard is CSS (pointer-events:none), which is why it's asserted here — nothing
// about the markup itself reveals that a stub's control is inert.
const css = require('fs').readFileSync(
  'C:/Users/dkilburn/Projects/eam-mobile/prototypes/standalone/' + FILE, 'utf8');
ok('stub controls are pointer-events:none',
  /\.snap-panel\.is-stub \.focus-control[^{]*\{[^}]*pointer-events:\s*none/.test(css));
ok('stub is tappable to jump to it', /is-stub"[^>]*onclick="jumpTo\(/.test(wrapHtml(ctx)));

/* ── the untouched path ──────────────────────────────────────────────────
   The A/B is only worth anything if the OFF state is genuinely v2. Assert the
   classic path emits no panel machinery at all, and that the singleton chrome
   is still present exactly once (i.e. classic mode renders a whole item, not a
   stub). */
console.log('\npaged mode — still v2, no panel machinery');
const ctx2 = runScreen(FILE, { eamChecklistScrollMode: 'off' });
ok('scroll mode is off when stored off', ev(ctx2, 'SCROLL_MODE') === false);
ev(ctx2, 'jumpTo(2)');
const h2 = wrapHtml(ctx2);
ok('no snap panels at all', count(h2, /snap-panel/g) === 0);
ok('no stub tags at all', count(h2, /snap-stub-tag/g) === 0);
ok('one full item still renders', count(h2, /id="fv-itemNotes"/g) === 1);
ok('Comments section still renders', count(h2, /rv-toggle-title">Comments/g) === 1);

/* Mode switching must survive a round trip in one session — a real comparison
   is flip, feel, flip back, and a stale cursor or a leftover panel here would
   quietly poison the second half of every A/B. */
console.log('\nmode switch round trip');
ev(ctx2, 'toggleScrollMode()');
ok('toggling on rebuilds as panels', count(wrapHtml(ctx2), /snap-panel is-current/g) === 1);
ok('cursor survives the switch', ev(ctx2, 'cursor') === 2, 'cursor ' + ev(ctx2, 'cursor'));
ev(ctx2, 'toggleScrollMode()');
ok('toggling back clears panels', count(wrapHtml(ctx2), /snap-panel/g) === 0);
ok('cursor still survives', ev(ctx2, 'cursor') === 2, 'cursor ' + ev(ctx2, 'cursor'));

/* Task Instructions (§16.7) is a one-time read-only screen before item 1, not
   a checklist item — it must never render as a panel in either mode. */
console.log('\ntask instructions screen');
ev(ctx, 'jumpToInstructions()');
const hi = wrapHtml(ctx);
ok('instructions render without panels', count(hi, /snap-panel/g) === 0);
ok('instructions still render their card', /instr-body/.test(hi));

console.log(fail ? '\n' + fail + ' FAILED' : '\nall scroll-mode assertions pass');
process.exit(fail ? 1 : 0);
