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

/* The file's own source. Several assertions below are about CSS and about source
   structure rather than about rendered output — a stub's controls being inert is
   a CSS fact, and nothing in the markup reveals it. Declared up here rather than
   mid-file: it was originally introduced next to its first use, which put it in
   the temporal dead zone for anything added above that point. */
const css = require('fs').readFileSync(
  'C:/Users/dkilburn/Projects/eam-mobile/prototypes/standalone/' + FILE, 'utf8');

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
ok('first item still carries its own identifier', /snap-banner-num">01</.test(h));

// A middle item: stubs both sides, and the indices must be cursor ± 1. An
// off-by-one here would show the wrong item as "next up" — and, because a stub
// is tappable, would jump somewhere other than where it was pointing.
ev(ctx, 'jumpTo(2)');
h = wrapHtml(ctx);
ok('middle item renders 2 stubs', count(h, /class="snap-panel is-stub"/g) === 2);
ok('current panel carries its own index', /class="snap-panel is-current" data-idx="2"/.test(h));
ok('stubs are cursor-1 and cursor+1',
  /is-stub" data-idx="1"/.test(h) && /is-stub" data-idx="3"/.test(h));
// Every panel carries the identifier, current and stubs alike — the point of it
// is that it never disappears as you move. Direction words are gone: they
// described the scroll rather than the item, so the same item got a different
// label depending on which way you arrived at it.
ok('all three panels carry a banner', count(h, /class="snap-banner"/g) === 3, String(count(h, /class="snap-banner"/g)));
ok('no direction words anywhere', !/Next up|Previous ·/.test(h));
// 1-based and zero-padded for a human, matching the rail's own "Item X of Y".
ok('identifiers are 1-based and zero-padded',
  /snap-banner-num">02</.test(h) && /snap-banner-num">03</.test(h) && /snap-banner-num">04</.test(h));
// The banner's whole reason for carrying equipment: on a fanned-out Route the
// asset is the identifier that matters, not the flat index.
ok('banner carries the equipment identity', /snap-banner-eq-code">/.test(h));
// Asserted against source, not this render: whether any of the 3 panels in view
// happens to be an unequipped item depends on where the cursor sits.
ok('an unequipped item says so rather than rendering half a band',
  /snap-banner-none">No equipment</.test(css));
ok('no type prefix left on demo equipment codes', !/snap-banner-eq-code">A-/.test(h));

// Last item: no next panel.
ev(ctx, 'jumpTo(' + (total - 1) + ')');
h = wrapHtml(ctx);
ok('last item renders 1 stub (previous only)', count(h, /class="snap-panel is-stub"/g) === 1);
ok('last item still carries its own identifier', /snap-banner-num">\d\d</.test(h));

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
ok('stub controls are pointer-events:none',
  /\.snap-panel\.is-stub \.focus-control[^{]*\{[^}]*pointer-events:\s*none/.test(css));
ok('stub is tappable to jump to it', /is-stub"[^>]*onclick="jumpTo\(/.test(wrapHtml(ctx)));

/* ── snapping is JS-owned ────────────────────────────────────────────────
   Geometry and gesture can't be tested here (the shim's getBoundingClientRect
   is a fixed stub), so what's guarded instead is the *contract* that came out
   of the 2026-08-12 device round: CSS scroll-snap must stay out of this file,
   because `proximity` didn't fire reliably on iOS and left items resting
   half-placed. If someone re-adds it "to help", the JS snap and the CSS snap
   fight over the landing and the limbo state comes back. */
console.log('\nsnapping contract — JS owns the landing');
ok('no scroll-snap-* properties in CSS',
  !/^\s*(?!.*\*)[^\n]*scroll-snap-(type|align|stop)\s*:/m.test(css.replace(/\/\*[\s\S]*?\*\//g, '')));
ok('no scroll-margin-top on panels',
  !/scroll-margin-top\s*:/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')));
// The landing air moved from the panel to .snap-body when the banner arrived:
// the banner must sit FLUSH against the rail (that flushness IS the arrival
// cue), so the panel can carry no top padding at all, and the air now sits
// between the banner and the item's own first element.
ok('landing padding sits inside the body, not on the panel',
  /\.snap-body\s*\{[^}]*padding-top:\s*var\(--snap-land-pad/.test(css));
ok('the banner lands flush — no panel top padding',
  !/\.snap-panel\s*\{[^}]*padding-top/.test(css));
ok('--snap-land-pad is a real value, not 0',
  /--snap-land-pad:\s*([1-9]\d*)px/.test(css), (css.match(/--snap-land-pad:\s*\d+px/) || [''])[0]);
ok('takeover threshold is half the band', ev(ctx, 'SNAP_TAKEOVER') === 0.5, String(ev(ctx, 'SNAP_TAKEOVER')));
// The reading exemption is the branch most likely to be "simplified" away by a
// later edit, and losing it means snapping a technician out of a comment thread
// they're halfway through reading. Assert the guard is still in the source.
ok('settle keeps the reading exemption (only snaps on downward drift)',
  /drift\s*>\s*2\s*\)\s*snapToCurrent/.test(css));
ok('commit snaps after rebuilding, not instead of it',
  /renderFocus\(\{\s*keep:\s*before\s*\}\);\s*\n\s*snapToCurrent\(true\);/.test(css));

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
ok('no banners at all', count(h2, /snap-banner/g) === 0);
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

/* Snap timing is velocity-driven, not timeout-driven (round 2: "if it's slowing
   down, just snap"). The finger-down guard is the load-bearing half — a slow
   deliberate drag has low velocity too, so without it the surface would snap
   out from under a technician mid-gesture. */
console.log('\nsnap timing — deceleration, not a timeout');
ok('early snap is gated on velocity', /scrollVel\s*<\s*SNAP_VEL/.test(css));
ok('early snap is gated on the finger being up', /!touching\s*&&\s*scrollVel/.test(css));
ok('velocity is low-passed, not raw', /scrollVel\s*\*\s*0\.6/.test(css));
ok('a released slow drag still settles', /touchend[\s\S]{0,500}setTimeout\(onSnapSettle/.test(css));
ok('landing aborts the moment a finger lands', /if\s*\(touching\)\s*\{\s*releaseSnap\(\);/.test(css));
// Comments stripped: the header comment for animateTo() names the native API it
// replaced, and matching that would report the very thing it warns against.
ok('landing runs on rAF, not native smooth scroll',
  /requestAnimationFrame\(step\)/.test(css)
  && !/behavior:\s*'smooth'/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')));

/* Prev/Next must COMMIT, not scroll and wait to be noticed. Scrolling relied on
   onSnapSettle(), which a landing animation mutes for its own duration — so the
   panel arrived and stayed a greyed-out stub until a second tap. */
console.log('\nPrev/Next commit directly');
ok('Next commits directly', /if \(SCROLL_MODE\) \{ commitCursor\(cursor \+ 1\); return; \}/.test(css));
ok('Prev commits directly', /if \(SCROLL_MODE\) \{ commitCursor\(cursor - 1\); return; \}/.test(css));
ok('neither button routes through scrollToIdx', !/scrollToIdx\(cursor [-+] 1\)/.test(css));

/* ── View all: collapse / expand all ─────────────────────────────────────
   The reason it exists is scale: after §16.9's fan-out, Equipment mode on the
   FIREEXT route is 156 groups and the default state opens exactly one. The
   thing worth guarding is that it only touches the mode ON SCREEN — the
   collapsed Set holds step: and equip: keys at once, so a blanket operation
   would silently rearrange the mode you can't see. */
console.log('\nView all — collapse/expand all');
ev(ctx, 'overviewGroupMode = "step"; overviewCollapsedGroups = new Set();');
const stepKeys = ev(ctx, 'overviewGroupKeys().length');
ok('group keys found for step mode', stepKeys > 1, String(stepKeys) + ' groups');
ok('starts not-all-collapsed', ev(ctx, 'overviewAllCollapsed()') === false);
ev(ctx, 'toggleOverviewCollapseAll()');
ok('collapse all collapses every group in the mode', ev(ctx, 'overviewAllCollapsed()') === true);
ok('it did not reach into equipment mode',
  ev(ctx, '[...overviewCollapsedGroups].every(k => k.startsWith("step:"))') === true);
ev(ctx, 'toggleOverviewCollapseAll()');
ok('toggling again expands every group', ev(ctx, 'overviewAllCollapsed()') === false);
ok('expand all left nothing behind', ev(ctx, 'overviewCollapsedGroups.size') === 0);
// Equipment mode keys itself independently, including the __general__ bucket for
// items with no equipment at all.
ev(ctx, 'overviewGroupMode = "equipment";');
ok('equipment mode keys separately',
  ev(ctx, 'overviewGroupKeys().every(k => k.startsWith("equip:"))') === true);
ok('the button icon is derived from state, not stored',
  /ovCollapseAllBtnHtml\(\)/.test(css) && /overviewAllCollapsed\(\)/.test(css));

console.log('\nlist identifier matches the panel identifier');
ok('View all rows carry a mono zero-padded number', /ov-row-num">/.test(css) && /\.ov-row-num \{/.test(css));
ok('the old inline "N — label" form is gone', !/ov-label">\$\{idx\+1\} —/.test(css));

console.log(fail ? '\n' + fail + ' FAILED' : '\nall scroll-mode assertions pass');
process.exit(fail ? 1 : 0);
