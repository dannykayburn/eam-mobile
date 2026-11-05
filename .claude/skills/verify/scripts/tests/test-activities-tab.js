/* §16.12: the standalone WO Activities screen.
   ══════════════════════════════════════════════════════════════════════
   WHAT THIS PINS:
     1. The radio selector gates Start Work: nothing selected with two
        activities (§15.2's default), ready once one is picked.
     2. A completed activity stays selectable, but Start Work on it is
        protected and explains itself.
     3. Start Work from HERE is the §14.11 commitment: it creates the run for
        (technician, WO, activity) and hands off to Activity Checklist.
     4. Once a run exists the selection is protected and the bar reads
        "Continue to <cursor>". Start Work is never offered twice.
     5. The screen is a More-group member, so every WO step can reach it.
   The DOM is the run-load.js shim; assertions read JS state and storage.
   ══════════════════════════════════════════════════════════════════════ */
const { runScreen } = require('./_lib.js');
const vm = require('vm');

let fail = 0;
const ok = (label, cond, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (extra !== undefined ? '  → ' + extra : ''));
  if (!cond) fail++;
};
const ev = (ctx, expr) => { try { return vm.runInContext(expr, ctx); } catch (e) { return '<<' + e.message + '>>'; } };
const label = ctx => ev(ctx, 'document.getElementById("barBtnLabel").textContent');
const pill = ctx => ev(ctx, 'document.getElementById("barBtn").className');
const FILE = 'eam-wo-activities-prototype-v1.html';

console.log('\n1. The radio selector gates Start Work');
let s = runScreen(FILE, { eamOpenDemoWo: '19257' });
ok('two activities → nothing selected at load', ev(s, 'selectedActivity') === null);
ok('...and the bar is locked', /bar-pill-locked/.test(pill(s)) && label(s) === 'Select an activity to start', label(s));
ok('a row tap selects (ROW_TAP_HANDLERS, not "open record")',
  ev(s, 'onListDetailRowTap("activities", 0); selectedActivity') === '10');
ok('...and the bar is ready: Start Work', /bar-pill-ready/.test(pill(s)) && label(s) === 'Start Work', label(s));
ok('the selected card carries the radio "on" state',
  /act-sel-radio on/.test(ev(s, 'LIST_DETAIL_TABS.activities.rows[0].fields[0].html')));
ok('selection is single-select', ev(s, 'selectActivity("20"); LIST_DETAIL_TABS.activities.rows.filter(r => /act-sel-radio on/.test(r.fields[0].html)).length') === 1);

console.log('\n2. A completed activity is selectable but cannot start');
ev(s, 'ACTIVITIES[1].completed = true; selectActivity("20");');
ok('selected', ev(s, 'selectedActivity') === '20');
ok('bar reads "Activity is completed", locked', label(s) === 'Activity is completed' && /locked/.test(pill(s)), label(s));
ok('tapping it starts nothing', (ev(s, 'onBarPillTap(); woRunFor()') === null));
ev(s, 'ACTIVITIES[1].completed = false;');

console.log('\n3. Start Work from here is the §14.11 commitment');
ev(s, 'selectActivity("10"); onBarPillTap();');
ok('a run exists for (technician, WO, activity 10)', ev(s, 'woRunFor("19257") && woRunFor("19257").activity') === '10');
ok('...cursor is Activity Checklist', ev(s, 'woRunFor("19257").cursor') === 'checklist');
ok('the activity rides along for WO Closing', ev(s, 'sessionStorage.getItem("eamActiveActivityId")') === '10');
ok('hands off to Activity Checklist', /activity-checklist/.test(ev(s, 'location.href')));

console.log('\n4. Once started, the selection is protected');
ev(s, 'updateStartGate();');
ok('bar reads "Continue to Activity Checklist"', label(s) === 'Continue to Activity Checklist', label(s));
ok('selecting another activity is refused', ev(s, 'selectActivity("20"); selectedActivity') === '10');

console.log('\n5. Reachable from the More group');
ok('WO_MORE_TABS carries Activities', ev(s, 'WO_MORE_TABS.some(t => t.key === "activities")') === true);
ok('its row marks active here', /step-map-item active[\s\S]*Activities/.test(ev(s, 'stepMapMoreGroupHtml("activities")')));

console.log(fail ? `\n${fail} FAILED` : '\nActivities screen holds');
process.exit(fail ? 1 : 0);
