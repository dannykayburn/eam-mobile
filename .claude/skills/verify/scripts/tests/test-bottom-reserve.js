/* Bottom-bar reserve, and the flex-column scroller trap.

   Both faults here reached a real device and were invisible to every other check
   in this suite, because both are layout facts that only appear at a real
   viewport size on real hardware. Static assertions can't measure them — but they
   can pin the two CSS shapes that caused them.

   FAULT 1 — a short reserve. Six screens with a bottom bar each wrote
   `calc(var(--bar-height) + 16px)` at the foot of .content, and none allowed for
   the home-indicator inset. On a notched device the bar covers more than is held
   back, so the screen's last container is clipped. Now one shared --bar-reserve.
   Six copies is exactly how it managed to stay wrong on every screen at once.

   FAULT 2 — the nastier one, and the reason this file exists rather than a
   one-line grep. A `flex:1` box inside a column-flex scroll container GROWS to
   consume exactly the space left over. So whenever its content is shorter than
   the container, the children sum to precisely the content box and scrollHeight
   can never exceed clientHeight — and a scroll container with no overflow ignores
   touch entirely. The checklist was reported as completely unscrollable on device
   while scrolling fine in a desktop browser (a short window makes the content
   genuinely overflow, which is what hid it for so long). The readout that cracked
   it: scrollTop/scrollHeight/clientHeight = 0/645/645. Equal numbers mean no
   range, which is a layout fault; a non-zero gap with a stuck scrollTop would
   have meant a swallowed gesture instead.

   So: any screen that makes .content a column flex container has to guarantee
   overflow explicitly. If a future screen adopts that layout, this catches it
   before a device does. */
const fs = require('fs'), path = require('path');
const DIR = 'C:/Users/dkilburn/Projects/eam-mobile/prototypes/standalone';
const SHARED = DIR + '/shared/eam-shared.css';

let fail = 0;
function ok(label, pass, detail) {
  console.log('  ' + (pass ? 'PASS' : 'FAIL') + '  ' + label + (detail ? '  → ' + detail : ''));
  if (!pass) fail++;
}

console.log('\nshared reserve');
const shared = fs.readFileSync(SHARED, 'utf8');
ok('--bar-reserve is defined', /--bar-reserve:/.test(shared));
ok('it builds on --bar-height', /--bar-reserve:\s*calc\(var\(--bar-height\)/.test(shared));
ok('it allows for the safe-area inset',
  /--bar-reserve:[^;]*env\(safe-area-inset-bottom/.test(shared));
// env() must keep its own fallback, or the whole calc is invalid at
// computed-value time on hardware without an inset — and an invalid padding
// computes to 0, which is worse than the bug being fixed.
ok('env() keeps a 0px fallback',
  /env\(safe-area-inset-bottom,\s*0px\)/.test(shared));

console.log('\nper-screen reserve');
const screens = fs.readdirSync(DIR).filter(f => /^eam-.*\.html$/.test(f));
let reserved = 0, flexCols = 0;
for (const f of screens) {
  const s = fs.readFileSync(path.join(DIR, f), 'utf8');
  if (/padding: 0 0 calc\(var\(--bar-height\) \+ \d+px\)/.test(s)) {
    ok('  ' + f + ' still hardcodes the short reserve', false);
  }
  if (/var\(--bar-reserve\)/.test(s)) reserved++;

  /* The flex-column check. Only meaningful on the .content rule — plenty of
     screens use column flex elsewhere, and only the scroll container itself can
     swallow its own overflow this way. */
  const m = s.match(/^\.content \{[^}]*\}/m);
  if (m && /display: flex/.test(m[0]) && /flex-direction: column/.test(m[0])) {
    flexCols++;
    const guaranteed = /min-height: calc\(100% \+ \d+px\)/.test(s);
    ok('  ' + f + ' guarantees overflow (column-flex .content)', guaranteed,
      guaranteed ? '' : 'flex:1 child will swallow all overflow — no scroll on device');
  }
}
ok('screens reference the shared reserve', reserved >= 6, String(reserved) + ' screens');
ok('column-flex .content screens were found and checked', flexCols >= 1, String(flexCols) + ' screens');

console.log(fail ? '\n' + fail + ' FAILED' : '\nbottom-reserve assertions pass');
process.exit(fail ? 1 : 0);
