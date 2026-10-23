/* §32.1–§32.9 — the technician's timer and workflow runs, on the device.
   ══════════════════════════════════════════════════════════════════════
   WHAT THIS PINS, and why each one is here:

     1. THE TIMER SURVIVES A RELOAD WITH THE RIGHT ELAPSED TIME (§32.3). The
        old step counter reset to 00:00:00 on every page load and kept its
        only state in sessionStorage. Elapsed is now calculated from a stored
        start moment, so "reload" is simulated by booting a fresh screen on
        the stored keys alone and reading the value back.
     2. BACK DOES NOT PROMPT (§32.3). §14.7.1's "Pause the timer and return
        to WO Search?" is retired; leaving the screen is not leaving the job.
     3. A DECLINED TIMER RENDERS NOTHING ON THE RAIL (§32.6, user direction) —
        no pill, no panel, not a 00:00 — and manual start moves to the header
        ellipsis. The panel is asserted on #stepMap's own innerHTML, which the
        rail renderer composes, not on a helper alone.
     4. RESUME LANDS ON THE CURSOR (§32.7), from Home and from WO List.

   Plus the rules a regression would most quietly break: Pause books the
   segment, Stop books through the shared pull-up, Reset discards, a
   revisit edits in place with "Back to <cursor>" (§32.9), AUTOBOOK asks
   before a second WO's timer starts, and Reset demo clears every key.

   The DOM is the run-load.js shim, not a browser — assertions read JS state,
   storage, location.href or an element's own innerHTML by id. Visual
   confirmation is the user's device.
   ══════════════════════════════════════════════════════════════════════ */
const { runScreen } = require('./_lib.js');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const SHARED = path.join(__dirname, '..', '..', '..', '..', '..', 'prototypes/standalone/shared/eam-shared.js');

let fail = 0;
const ok = (label, cond, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (extra !== undefined ? '  → ' + extra : ''));
  if (!cond) fail++;
};
const ev = (ctx, expr) => { try { return vm.runInContext(expr, ctx); } catch (e) { return '<<' + e.message + '>>'; } };
const KEYS = ['eamTechTimer', 'eamWorkflowRuns', 'eamTimerBookings', 'eamLastDemoWo'];
// What survives a reload: the durable keys, read back out of a live screen.
const carry = (ctx) => {
  const o = {};
  KEYS.forEach(k => { const v = ev(ctx, 'localStorage.getItem(' + JSON.stringify(k) + ')'); if (v != null) o[k] = v; });
  return o;
};
const stepMap = ctx => String(ev(ctx, 'document.getElementById("stepMap").innerHTML'));
const MIN = 60000;
const runSeed = (wo, cursor, extra) => JSON.stringify({ ['BCAMPBELL|' + wo + '|10']: Object.assign({
  tech: 'BCAMPBELL', wo, activity: '10', activityLabel: 'Activity 10', cursor,
  steps: { record: 'complete' }, forks: {}, state: 'in-progress', startedAt: Date.now() - 30 * MIN, updatedAt: Date.now() - 30 * MIN,
}, extra || {}) });
const timerSeed = (wo, minsAgo, state) => JSON.stringify({
  tech: 'BCAMPBELL', wo, activity: '10', activityLabel: 'Activity 10', state: state || 'running',
  startedAt: Date.now() - minsAgo * MIN, bookedMs: 0 });

console.log('\nStart Work (gated, 19257) creates the run and starts the timer');
let rv = runScreen('eam-wo-record-view-prototype-v1.html', { eamOpenDemoWo: '19257' });
ev(rv, 'RECORD.selectedActivity = "10"; startWork();');
const started = carry(rv);
ok('a run exists for (technician, WO, activity)', /BCAMPBELL\|19257\|10/.test(started.eamWorkflowRuns || ''));
ok('...its cursor is Activity Checklist', ev(rv, 'woRunFor("19257").cursor') === 'checklist');
ok('the timer is RUNNING on 19257 — in durable storage, not sessionStorage',
  ev(rv, 'techTimer().wo + "/" + techTimer().state') === '19257/running');
ok('Start Work hands off to Activity Checklist', /activity-checklist/.test(ev(rv, 'location.href')));

console.log('\n1. The timer survives a reload with the correct elapsed time (§32.3)');
{
  // Ten minutes pass, then the page reloads: a fresh boot on the stored keys
  // alone, WITHOUT the consume-once eamOpenDemoWo hand-off.
  const t = JSON.parse(started.eamTechTimer); t.startedAt -= 10 * MIN;
  const seed = Object.assign({}, started, { eamTechTimer: JSON.stringify(t) });
  const cl = runScreen('eam-activity-checklist-prototype-v2.html', seed);
  ok('the reload stays on its WO (no snap back to a default)', ev(cl, 'DEMO_WO') === '19257');
  ok('the rail shows the timer on this WO', ev(cl, 'techTimerShownHere()') === true);
  ok('#stepMap carries the timer panel', /step-timer-panel/.test(stepMap(cl)));
  const shown = String(ev(cl, 'techTimerText()'));
  ok('elapsed is ~10 minutes, not 00:00:00', /^00:1[01]:\d\d$/.test(shown), shown);
  const again = runScreen('eam-wo-prototype-issue-parts-v1.html', carry(cl));
  ok('...and is still ~10 minutes on the next screen', /^00:1[01]:\d\d$/.test(String(ev(again, 'techTimerText()'))));
  ok('no step screen hardcodes a timer pill or panel any more', ['eam-activity-checklist-prototype-v2.html',
    'eam-wo-prototype-issue-parts-v1.html', 'eam-book-labor-prototype-v2.html', 'eam-wo-closing-prototype-v2.html',
    'eam-wo-record-view-prototype-v1.html'].every(f => {
      const src = fs.readFileSync(path.join(path.dirname(SHARED), '..', f), 'utf8');
      return !/id="timerPill"/.test(src) && !/class="step-timer-panel"/.test(src) && !/eamTimerRunning/.test(src);
    }));
}

console.log('\n2. Back does not prompt (§32.3 — §14.7.1 retired)');
{
  const cl = runScreen('eam-activity-checklist-prototype-v2.html',
    { eamOpenDemoWo: '19257', eamWorkflowRuns: runSeed('19257', 'checklist'), eamTechTimer: timerSeed('19257', 5) });
  ev(cl, 'navBack()');
  ok('no confirmation opens', ev(cl, 'document.getElementById("confirmOverlay").classList.contains("open")') === false);
  ok('it simply leaves, to WO List', /wo-list/.test(ev(cl, 'location.href')));
  ok('...and the timer is exactly as it was', ev(cl, 'techTimer().state') === 'running');
  const src = fs.readFileSync(SHARED, 'utf8');
  const body = src.slice(src.indexOf('function navBack()'), src.indexOf('}', src.indexOf('function navBack()')));
  ok('the shared navBack() has no confirm and names no timer', !/openConfirm|Timer|timer/.test(body));
}

console.log('\n3. A declined timer renders no rail timer (§32.6)');
{
  rv = runScreen('eam-wo-record-view-prototype-v1.html', { eamOpenDemoWo: '19831' });
  ev(rv, 'RECORD.selectedActivity = "10"; startWork();');
  ok('Free Form asks first', ev(rv, 'document.getElementById("questionMessage").textContent') === 'Start the timer for this work order?');
  ev(rv, 'questionAnswerNo()');
  ok('No still starts the work (a run exists)', ev(rv, 'woRunFor("19831") !== null') === true);
  ok('...with no timer at all', ev(rv, 'techTimer()') === null);
  const cl = runScreen('eam-activity-checklist-prototype-v2.html', carry(rv));
  ok('the panel helper renders the empty string', ev(cl, 'railTimerPanelHtml()') === '');
  ok('the pill helper renders the empty string', ev(cl, 'railTimerPillHtml()') === '');
  ok('#stepMap has no timer panel — no 00:00, no grayed pill', !/step-timer|timer-pill|00:00/.test(stepMap(cl)));
  ok('manual Start is offered in the header ellipsis instead', ev(cl, 'startTimerOfferedHere()') === true);
  ev(cl, 'manualStartTimer()');
  ok('Start timer starts it on this WO', ev(cl, 'techTimer().wo') === '19831');
  ok('...and the offer is withdrawn while it runs', ev(cl, 'startTimerOfferedHere()') === false);
  // Cancel on the question starts nothing at all — not the work, not a run.
  const rv2 = runScreen('eam-wo-record-view-prototype-v1.html', { eamOpenDemoWo: '19831' });
  ev(rv2, 'RECORD.selectedActivity = "10"; startWork(); closeQuestion();');
  ok('Cancel on the question starts nothing', ev(rv2, 'woRunFor("19831") === null && techTimer() === null') === true);
}

console.log('\n4. Resume lands on the cursor (§32.7)');
{
  const seed = { eamWorkflowRuns: runSeed('19257', 'issueparts'), eamTechTimer: timerSeed('19257', 20) };
  const home = runScreen('eam-home-screen-prototype-v1.html', seed);
  const card = String(ev(home, 'document.getElementById("resumeCardMount").innerHTML'));
  ok('Home renders the Resume card', /resume-card/.test(card));
  ok('...naming the WO, its description and the current step',
    /19257/.test(card) && /Pump Cavitating/.test(card) && /Issue Parts/.test(card));
  ok('...with the timer pill, because this run is timed', /timer-pill/.test(card));
  ev(home, 'openDemoWoAtCursor("19257")');
  ok('Resume opens Issue Parts, the cursor', /issue-parts/.test(ev(home, 'location.href')));
  const wl = runScreen('eam-wo-list-prototype-v5_1.html', seed);
  ev(wl, 'openWO("19257")');
  ok('opening the same WO from WO List lands on the cursor too', /issue-parts/.test(ev(wl, 'location.href')));
  const empty = runScreen('eam-home-screen-prototype-v1.html', null);
  ok('no run in progress → no card at all', ev(empty, 'document.getElementById("resumeCardMount").innerHTML') === '');
  // Several runs: the timed one leads, the rest are "+N more".
  const two = JSON.parse(runSeed('19831', 'booklabor', { updatedAt: Date.now() }));
  Object.assign(two, JSON.parse(runSeed('19257', 'issueparts')));
  const h2 = runScreen('eam-home-screen-prototype-v1.html', { eamWorkflowRuns: JSON.stringify(two), eamTechTimer: timerSeed('19257', 20) });
  const c2 = String(ev(h2, 'document.getElementById("resumeCardMount").innerHTML'));
  ok('the TIMED run leads even when another is more recent', c2.indexOf('19257') > -1 && c2.indexOf('19257') < (c2.indexOf('19831') < 0 ? Infinity : c2.indexOf('19831')));
  ok('...and the other shows as "+1 more in progress"', /\+1 more in progress/.test(c2));
  ok('the list holds both, built from local run data', (String(ev(h2, 'runsInProgressRowsHtml()')).match(/run-row"/g) || []).length === 2);
}

console.log('\nRevisit edits in place: "Back to <current step>" (§32.9)');
{
  const r = runScreen('eam-wo-record-view-prototype-v1.html', { eamOpenDemoWo: '19257', eamWorkflowRuns: runSeed('19257', 'issueparts') });
  ok('Record View knows it is a revisit', ev(r, 'woRunRevisitStep') === 'issueparts');
  ok('its bar reads "Back to Issue Parts", not Start Work', ev(r, 'document.getElementById("barBtnLabel").textContent') === 'Back to Issue Parts');
  ev(r, 'onBarPillTap()');
  ok('...and returns to the cursor', /issue-parts/.test(ev(r, 'location.href')));
  ok('nothing re-fired: still one run, no new timer', ev(r, 'Object.keys(woRuns()).length === 1 && techTimer() === null') === true);
  const html = stepMap(r);
  ok('the rail keeps Issue Parts as the current step, and it navigates', /goToWoStep\('issueparts'\)[^>]*><div class="step-map-icon smi-active"/.test(html));
  ok('Activity Checklist stays done and reopenable', /goToWoStep\('checklist'\)"><div class="step-map-icon smi-done"/.test(html));
  ok('forward gating intact — Book Labor is still locked', /smi-locked">4<\/div><span class="step-map-label">Book Labor/.test(html));
  const cl = runScreen('eam-activity-checklist-prototype-v2.html', { eamOpenDemoWo: '19257', eamWorkflowRuns: runSeed('19257', 'issueparts') });
  ok('the checklist does not ask its question again', /Back to Issue Parts/.test(ev(cl, 'document.getElementById("promptBar").innerHTML')) &&
    !/Do you need to issue parts/.test(ev(cl, 'document.getElementById("promptBar").innerHTML')));
  ok('landing past the cursor via Next moves it forward', ev(runScreen('eam-book-labor-prototype-v2.html',
    { eamOpenDemoWo: '19257', eamWorkflowRuns: runSeed('19257', 'issueparts') }), 'woRunFor("19257").cursor') === 'booklabor');
}

console.log('\nPause books the segment; Stop books through the pull-up; Reset discards (§32.4/§32.5)');
{
  const cl = runScreen('eam-activity-checklist-prototype-v2.html',
    { eamOpenDemoWo: '19257', eamWorkflowRuns: runSeed('19257', 'checklist'), eamTechTimer: timerSeed('19257', 10) });
  ev(cl, 'techTimerTogglePause()');
  ok('Pause books one labor row', ev(cl, 'techTimerBookings().length') === 1 && ev(cl, 'techTimerBookings()[0].minutes') === 10);
  ok('...and the timer is Paused, still shown here', ev(cl, 'techTimer().state') === 'paused' && /Resume/.test(ev(cl, 'railTimerPanelHtml()')));
  ok('a paused timer does not count as running for the booking pull-up', ev(cl, 'techTimerSegmentMs(techTimer())') === 0);
  ev(cl, 'techTimerTogglePause()');
  ok('Resume starts a new segment', ev(cl, 'techTimer().state') === 'running' && ev(cl, 'Date.now() - techTimer().startedAt < 5000') === true);
  ev(cl, 'techTimer() && techTimerSave(Object.assign(techTimer(), { startedAt: Date.now() - 7 * 60000 })); techTimerStop();');
  ok('Stop opens the shared booking pull-up', ev(cl, 'bookingPullup !== null && bookingPullup.min === 7') === true);
  ev(cl, 'confirmBookingPullup()');
  ok('booking it stops the timer and writes the second row', ev(cl, 'techTimer() === null && techTimerBookings().length === 2') === true);
  const c2 = runScreen('eam-activity-checklist-prototype-v2.html',
    { eamOpenDemoWo: '19257', eamWorkflowRuns: runSeed('19257', 'checklist'), eamTechTimer: timerSeed('19257', 10) });
  ev(c2, 'techTimerStop(); discardBookingPullup();');
  ok('discarding the pull-up leaves the timer running', ev(c2, 'techTimer().state') === 'running');
  ev(c2, 'techTimerReset()');
  ok('Reset asks first', ev(c2, 'document.getElementById("confirmMessage").textContent') === 'Discard the time on this timer? Nothing will be booked.');
  ev(c2, 'confirmDangerAction()');
  ok('...and discards without booking', ev(c2, 'techTimer() === null && techTimerBookings().length === 0') === true);
  const src = fs.readFileSync(SHARED, 'utf8');
  ok('§14.9\'s Stop → Yes/No/Cancel question is gone', !/Stop working and book your current time/.test(src) &&
    ['eam-activity-checklist-prototype-v2.html', 'eam-wo-prototype-issue-parts-v1.html'].every(f =>
      !/Stop working and book your current time/.test(fs.readFileSync(path.join(path.dirname(SHARED), '..', f), 'utf8'))));
}

console.log('\nOne timer per technician — AUTOBOOK asks before a second WO starts (§32.1)');
{
  const cl = runScreen('eam-activity-checklist-prototype-v2.html',
    { eamOpenDemoWo: '19257', eamWorkflowRuns: runSeed('19257', 'checklist'), eamTechTimer: timerSeed('19831', 30) });
  ok('a timer on ANOTHER WO is not shown on this rail', ev(cl, 'railTimerPanelHtml()') === '');
  ev(cl, 'manualStartTimer()');
  ok('starting here asks the AUTOBOOK question', /Work is currently in progress on Work Order 19831/.test(ev(cl, 'document.getElementById("questionMessage").textContent')));
  ev(cl, 'questionAnswerYes()');
  ok('Yes books the other WO and moves the one timer here', ev(cl, 'techTimer().wo') === '19257' &&
    ev(cl, 'techTimerBookings().length === 1 && techTimerBookings()[0].wo === "19831"') === true);
}

console.log('\n"Up next" preview on the collapsed rail (2026-10-23)');
{
  const rv0 = runScreen('eam-wo-record-view-prototype-v1.html', { eamOpenDemoWo: '19257' });
  ok('static: Record View previews Activity Checklist', ev(rv0, 'woStepUpNext') === 'Up next: Activity Checklist');
  const cl = runScreen('eam-activity-checklist-prototype-v2.html', { eamOpenDemoWo: '19257', eamWorkflowRuns: runSeed('19257', 'checklist') });
  ok('forked, unanswered: "Issue Parts or Book Labor"', ev(cl, 'woStepUpNext') === 'Up next: Issue Parts or Book Labor');
  // The shim shares ONE storage across boots and each boot clears it, so a
  // screen's state is carried out before the next boot, never read after.
  ev(cl, 'promptAnswer(false)');
  ok('the answer is pinned in the run', ev(cl, 'woRunFor("19257").forks.checklist.target') === 'booklabor');
  const answered = carry(cl);
  const pm = runScreen('eam-activity-checklist-prototype-v2.html', { eamOpenDemoWo: '19831', eamWorkflowRuns: runSeed('19831', 'checklist') });
  ok('no fork where Issue Parts is not a step (PM)', ev(pm, 'woStepUpNext') === 'Up next: Book Labor');
  const bl = runScreen('eam-book-labor-prototype-v2.html', Object.assign(answered, { eamOpenDemoWo: '19257' }));
  ok('the skipped step is N/A in the run, not complete', ev(bl, 'woRunFor("19257").steps.issueparts') === 'na');
  const map = stepMap(bl);
  ok('...and on the rail: N/A, not navigable, says why', /smi-na/.test(map) && !/goToWoStep\('issueparts'\)/.test(map) &&
    /Skipped by \\'No\\' at \\'Do you need to issue parts\?\\'/.test(map));
  ok('revisiting the checklist previews the way back', ev(runScreen('eam-activity-checklist-prototype-v2.html',
    Object.assign(carry(bl), { eamOpenDemoWo: '19257' })), 'woStepUpNext') === 'Back to Book Labor');
  ok('the last step says so', ev(runScreen('eam-wo-closing-prototype-v2.html', { eamOpenDemoWo: '19257' }), 'woStepUpNext') === 'Last step');
  ok('Free Form\'s flat rail previews nothing', ev(runScreen('eam-activity-checklist-prototype-v2.html', { eamOpenDemoWo: '20450' }), 'woStepUpNext') === '');
}

console.log('\nChecklist auto-advance: any tap answer, never keyboard or slider (§16.1)');
{
  const cl = runScreen('eam-activity-checklist-prototype-v2.html', { eamOpenDemoWo: '19257' });
  ev(cl, 'showingInstructions = false');
  const idx = type => ev(cl, 'ITEMS.findIndex(i => i.type === ' + JSON.stringify(type) + ' && !i.dynamicRules)');
  const t2 = idx('toggle2');
  ev(cl, 'cursor = ' + t2 + '; showingInstructions = false; renderFocus(); setToggle(ITEMS[cursor].options[0][0], "")');
  ok('a Yes/No tap advances', ev(cl, 'cursor') === t2 + 1, String(ev(cl, 'cursor')));
  const ck = idx('check');
  ev(cl, 'cursor = ' + ck + '; ITEMS[cursor].value = false; renderFocus(); setCheck()');
  ok('a check tap still advances', ev(cl, 'cursor') === ck + 1);
  const n = idx('num');
  ev(cl, 'cursor = ' + n + '; showingInstructions = false; renderFocus(); setNum({ value: "120" })');
  ok('a number entry does NOT advance', ev(cl, 'cursor') === n);
  const src = fs.readFileSync(path.join(path.dirname(SHARED), '..', 'eam-activity-checklist-prototype-v2.html'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  ok('only the two tap handlers call the advance (not number, text or slider)',
    (src.match(/autoAdvanceFrom\(/g) || []).length === 3 && !/function setNum[^\n]*autoAdvanceFrom/.test(src) &&
    !/function setText[^\n]*autoAdvanceFrom/.test(src));
}

console.log('\nReset demo clears the timer, the runs and the bookings');
{
  const cl = runScreen('eam-activity-checklist-prototype-v2.html',
    { eamWorkflowRuns: runSeed('19257', 'checklist'), eamTechTimer: timerSeed('19257', 10), eamTimerBookings: '[{}]' });
  ev(cl, 'resetDemoState()');
  ok('all three keys are gone', ['eamTechTimer', 'eamWorkflowRuns', 'eamTimerBookings']
    .every(k => ev(cl, 'localStorage.getItem(' + JSON.stringify(k) + ')') === null));
}

console.log(fail ? '\n' + fail + ' assertion(s) FAILED' : '\ntimer + runs hold');
process.exit(fail ? 1 : 0);
