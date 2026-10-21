/* test-route-checklist.js — the UXR route checklist (2026-09-25).
 *
 * Task 3 of the Q4 2026 usability study walks a 12-pump route on WO 19831
 * (PM) and the whole task is timed, so the item COUNT is the deliverable:
 * 1 route brief + 12 condition checks + 1 close-out = 14. If the route
 * checklist silently falls back to the default task plan the screen still
 * renders perfectly and the participant is handed 52 items instead, which
 * is a wasted session rather than a visible bug. Hence a test.
 *
 * It also pins the thing most likely to be "tidied" away later: the 24/156
 * scale routes are DELIBERATE (§16.9 — "don't fix that by capping the
 * fan-out"), so the small route was added alongside them, not instead of
 * them. Case 5 fails if someone shrinks PUMPS to make the study easier.
 */
const path = require('path');
const vm = require('vm');
const { runScreen } = require(path.join(__dirname, '..', 'run-load.js'));

const CHECKLIST = 'eam-activity-checklist-prototype-v2.html';
let failed = 0;
function ok(cond, label) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label);
  if (!cond) failed++;
}
function eq(actual, expected, label) {
  ok(actual === expected, label + '  (got ' + JSON.stringify(actual) + ', want ' + JSON.stringify(expected) + ')');
}
// Read a top-level `const`/`let` out of the loaded screen. These live in the
// context's global LEXICAL environment, not on the context object, so
// ctx.ITEMS is undefined while ITEMS is very much alive.
const read = (ctx, expr) => vm.runInContext(expr, ctx);

// Route rows in the shape woEquipApplyRoute() persists them.
function routeRows(wo, code, desc, prefix, start, count) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({ equip: prefix + (start + i), desc: 'Pump ' + (i + 1), dept: 'ENG',
                org: 'FBPP', type: 'Asset', source: 'route',
                childWo: String(20451 + i), parentWo: wo });
  }
  return { eamOpenDemoWo: wo, eamDemoRouteSeeded2: '1', eamWoEquipment: JSON.stringify({
    [wo]: { route: { code, desc }, rows }, __nextChildWo: 20451 + count }) };
}

console.log('route checklist (§16.9 fan-out over a per-WO task plan)');

/* 1 — 19831 before a route is selected. The task plan is authored
   configuration (§11), so it is the route plan whether or not the route has
   been picked yet: 3 items, not the 8-item default. */
{
  const ctx = runScreen(CHECKLIST, { eamOpenDemoWo: '19831', eamDemoRouteSeeded2: '1' }); // seeded-flag set: simulates a deliberately cleared route
  eq(read(ctx, 'ITEMS.length'), 3, '19831 with no route selected: 3 items');
  eq(read(ctx, 'ITEMS.filter(i => i.equipId).length'), 1, '  exactly one equipment-scoped template');
  eq(read(ctx, 'ITEMS[0].group'), 'safety', '  opens on the route brief');
  eq(read(ctx, 'ITEMS[ITEMS.length - 1].group'), 'close', '  closes on the close-out');
  ok(read(ctx, 'showingInstructions') === true, '  route instructions screen shows first');
  ok(/12 pumps/.test(read(ctx, 'TASK_PLAN_INSTRUCTIONS')),
     '  instructions are the route ones, not the single-pump P-204 default');
}

/* 2 — the study configuration: 19831 + the 12-asset route. */
{
  const ctx = runScreen(CHECKLIST, routeRows('19831', 'PUMPSPM', 'Pumps — Monthly PM', 'P-', 1101, 12));
  eq(read(ctx, 'ITEMS.length'), 14, '19831 + 12-asset route: 14 items (1 + 12 + 1)');
  eq(read(ctx, 'ITEMS.filter(i => i.equipId).length'), 12, '  one condition check per pump');
  eq(read(ctx, 'new Set(ITEMS.filter(i => i.equipId).map(i => i.equipId)).size'), 12,
     '  twelve DISTINCT assets (a fan-out that reuses one equipId renders fine and is wrong)');
  eq(read(ctx, 'ITEMS[0].group'), 'safety', '  brief still first, ahead of the fanned-out block');
  eq(read(ctx, 'ITEMS[13].group'), 'close', '  close-out still last');
  eq(read(ctx, 'ITEMS[1].equipId'), 'P-1101', '  fan-out starts at the first route asset');
  eq(read(ctx, 'ITEMS[12].equipId'), 'P-1112', '  ...and ends at the twelfth');
  // Ids must be unique or syncDynamicChildren() can delete the wrong row.
  eq(read(ctx, 'new Set(ITEMS.map(i => i.id)).size'), 14, '  all 14 ids unique');
}

/* 3 — the default task plan is untouched. This is the regression half: a
   per-WO definition that leaks into every WO is the obvious way to break
   Tasks 1 and 2 while Task 3 looks perfect. */
{
  const ctx = runScreen(CHECKLIST, { eamOpenDemoWo: '19257' });
  eq(read(ctx, 'ITEMS.length'), 8, '19257 keeps the default 8-item task plan');
  eq(read(ctx, 'ITEMS.filter(i => i.equipId).length'), 4, '  and its 4 equipment-scoped templates');
  ok(/P-204/.test(read(ctx, 'TASK_PLAN_INSTRUCTIONS')), '  and its own single-asset instructions');
}
{
  const ctx = runScreen(CHECKLIST, { eamOpenDemoWo: '20450' });
  eq(read(ctx, 'ITEMS.length'), 8, '20450 (no configured workflow) also keeps the default');
}

/* 4 — the route exists in the shared equipment defs at the size the study
   was designed around. */
{
  const ctx = runScreen(CHECKLIST, null);
  eq(read(ctx, "routeEquipmentRows('PUMPSPM').length"), 12, 'PUMPSPM generates 12 assets');
  eq(read(ctx, "routeEquipmentRows('PUMPSPM')[0].equip"), 'P-1101', '  first asset is P-1101');
  ok(read(ctx, "routeEquipmentRows('PUMPSPM').every(r => r.dept === 'ENG')"), '  all in ENG');
  // No overlap with the PUMPS demo route, or a row's provenance is ambiguous.
  ok(read(ctx, "routeEquipmentRows('PUMPSPM').every(r => !routeEquipmentRows('PUMPS').some(q => q.equip === r.equip))"),
     '  no asset id shared with the PUMPS route');
}

/* 5 — the deliberate scale survived. §16.9 is explicit that the big routes
   are the point, and "the study needs 12" is exactly the argument that would
   shrink them. */
{
  const ctx = runScreen(CHECKLIST, null);
  eq(read(ctx, "routeEquipmentRows('PUMPS').length"), 24, 'PUMPS is still 24 (scale demo intact)');
  eq(read(ctx, "routeEquipmentRows('FIREEXT').length"), 156, 'FIREEXT is still 156');
}
{
  const ctx = runScreen(CHECKLIST, routeRows('19257', 'PUMPS', 'Pumps', 'P-', 1042, 24));
  eq(read(ctx, 'ITEMS.length'), 100, '19257 + 24-asset route still fans out to 100 items (4 x 24 + 4)');
}

/* 6 — the seed. Task 3 is run remotely on the participant's own phone, so the
   route MUST already be attached after login: resetDemoState() runs on Log In,
   and talking a participant through attaching a route first is a moderator
   instruction, which fails the task under the study's own help-level rule.
   These assertions are the difference between a runnable task and a wasted
   session, so they drive the real reset path rather than a pre-seeded store. */
{
  const ctx = runScreen('eam-wo-record-view-prototype-v1.html', null);
  eq(read(ctx, "woEquipRows('19831').length"), 12, 'cold start: 19831 already carries the PUMPSPM route (seeded on load, 2026-10-21)');
  read(ctx, 'resetDemoState()');
  eq(read(ctx, "woEquipRows('19831').length"), 12, 'after Log In reset: 19831 carries 12 route assets');
  eq(read(ctx, "woEquipRoute('19831').code"), 'PUMPSPM', '  route is set on the header too (drives the WO route field)');
  eq(read(ctx, "new Set(woEquipRows('19831').map(r => r.childWo)).size"), 12, '  12 distinct MEC child WO numbers minted');
  read(ctx, 'resetDemoState()');
  eq(read(ctx, "woEquipRows('19831').length"), 12, 'a second reset still leaves exactly 12, not 24');
  eq(read(ctx, "woEquipRows('19257').length"), 0, '  19257 stays empty (Task 2 is not a route task)');
  eq(read(ctx, "woEquipRows('20450').length"), 0, '  20450 stays empty (Task 1 is not a route task)');
}

/* 7 — the seeded route must not break the screen the participant uses to FIND
   the work orders in Tasks 1 and 2: 12 MEC children merge into WO List. */
{
  const seeded = runScreen('eam-wo-record-view-prototype-v1.html', null);
  read(seeded, 'resetDemoState()');
  const store = read(seeded, "lsGet('eamWoEquipment')");
  let threw = null;
  try { runScreen('eam-wo-list-prototype-v5_1.html', { eamWoEquipment: store }); }
  catch (e) { threw = e.message; }
  ok(threw === null, 'WO List loads with the seeded route in the store' + (threw ? ' - threw: ' + threw : ''));
}

console.log(failed ? '\n' + failed + ' assertion(s) failed' : '\nroute checklist: all assertions passed');
process.exit(failed ? 1 : 0);
