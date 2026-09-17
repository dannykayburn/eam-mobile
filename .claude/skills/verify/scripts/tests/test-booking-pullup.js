/* §18.2 / §30.21 — the booking pull-up, on the device.
   ══════════════════════════════════════════════════════════════════════
   WHY THIS FILE EXISTS. The component is shared (eam-shared.js) with TWO
   invocation points by construction: opening Book Labor while a timer runs,
   and §30.21's placed Stop Timer action. Only the first is wired today — the
   app is not yet fed workflow definitions — so nothing exercises the second,
   and "the caller-agnostic parts still work" has to be asserted rather than
   observed.

   THREE BUGS THIS WOULD HAVE CAUGHT, all found while building it:

     1. BOOK LABOR SHADOWS closeAllSheets() AND CLOSED SHEETS BY ID.
        `['addLaborSheet','correctionSheet','crewSheet']` cannot contain a
        SELF-INJECTING sheet (§8.3), so the pull-up opened and could not be
        dismissed by ✕ or by scrim. It renders perfectly while being a trap.

     2. THE SCRIM BYPASSES ANY PER-CONTROL HANDLER. `.sheet-overlay`'s
        onclick is closeAllSheets() on every screen, so cleanup hung off the
        ✕ alone leaves live state behind and skips onDiscard — meaning
        §30.21's "discard never stops the timer" would have held for one of
        the two dismissals a technician cannot tell apart.

     3. A BOOKING IS NOT A DISCARD. Both end in closeAllSheets(), so if the
        state is not cleared BEFORE the close, taking a booking also reports
        a discard and (here) claims the timer is still running.

   The DOM here is a shim, not a browser: composed markup is not observable
   through a parent's innerHTML, and style assignments are no-ops. So every
   assertion below reads either real JS state or an element's own innerHTML
   by id. Visual confirmation is the user's device.
   ══════════════════════════════════════════════════════════════════════ */
const { runScreen } = require('./_lib.js');
const vm = require('vm');
const fs = require('fs');
const ROOT = 'C:/Users/dkilburn/Projects/eam-mobile';
const SHARED = ROOT + '/prototypes/standalone/shared';

let fail = 0;
const ok = (label, cond, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (extra !== undefined ? '  → ' + extra : ''));
  if (!cond) fail++;
};
const ev = (ctx, expr) => { try { return vm.runInContext(expr, ctx); } catch (e) { return '<<' + e.message + '>>'; } };
const boot = () => {
  const ctx = runScreen('eam-book-labor-prototype-v2.html', null);
  ev(ctx, 'sessionStorage.setItem("eamTimerRunning","false"); bookingPullup = null;');
  return ctx;
};
const html = id => 'String(document.getElementById(' + JSON.stringify(id) + ').innerHTML)';
/* CODE ONLY. A static check that can be satisfied by a COMMENT is not a
   check — the close-path assertion below passed with the call deleted,
   because the comment above it names the function. Learned 2026-09-17 by
   injecting that exact bug and watching the test stay green. */
const codeOnly = src => String(src).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
/* The body of a named function, comment-stripped, so "does X call Y" is
   answered about the function and not about the file. */
const bodyOf = (src, name) => {
  const c = codeOnly(src);
  const i = c.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let depth = 0, started = false;
  for (let k = i; k < c.length; k++) {
    if (c[k] === '{') { depth++; started = true; }
    else if (c[k] === '}') { depth--; if (started && depth === 0) return c.slice(i, k + 1); }
  }
  return c.slice(i);
};

console.log('\nThe component lives in the SHARED files');
{
  const js = fs.readFileSync(SHARED + '/eam-shared.js', 'utf8');
  const css = fs.readFileSync(SHARED + '/eam-shared.css', 'utf8');
  ok('openBookingPullup is shared, not screen-local', js.indexOf('function openBookingPullup') > -1);
  ok('it self-injects rather than needing per-screen markup (§8.3)',
    /ensureSharedSheet\('bookingPullupSheet'/.test(js));
  ok('its CSS is shared too', css.indexOf('.bkg-hours') > -1 && css.indexOf('.bkg-banner') > -1);
  /* Promoted when the pull-up became the second consumer — the repo's own
     trigger. Two copies is how one change starts touching three files. */
  ok('the hold stepper was PROMOTED, not copied', css.indexOf('.step-btn{') > -1 &&
    js.indexOf('function startHoldStep') > -1);
  const bl = fs.readFileSync(ROOT + '/prototypes/standalone/eam-book-labor-prototype-v2.html', 'utf8');
  ok('...and the screen-local copy is gone', !/^\.step-btn\s*\{/m.test(bl) &&
    bl.indexOf('function startCorrHold') === -1);
  ok('§18.6\'s numbers moved with it', /HOLD_MS:\s*3000/.test(js) && /REPEAT_MS:\s*150/.test(js) &&
    /BIG:\s*15/.test(js));
  /* §3.4: the affirmative control is in the header, never at a sheet's
     bottom edge. The stepper means no keyboard ever opens here, but the
     pattern is the house one for a full-attention sheet. */
  ok('the confirm is a header ✓, and there is no footer (§3.4)',
    /bookingPullupSheet[\s\S]{0,2600}sheet-confirm-btn/.test(js) &&
    !/bookingPullupSheet[\s\S]{0,2600}sheet-footer/.test(js));
  ok('no text input on the sheet at all — nothing to raise a keyboard',
    !/bookingPullupSheet[\s\S]{0,2600}<input/.test(js));

  /* THE RELEASE IS REGISTERED ON THE CLOSE PATH, AT BOTH SITES.
     '.sheet-overlay' (the scrim) has onclick="closeAllSheets()" on every
     screen — it is shared by every sheet, so it cannot be repurposed for
     one of them. Cleanup hung off the ✕ alone would therefore hold for only
     one of two dismissals a technician cannot tell apart.

     This is pinned STATICALLY because it cannot be caught behaviourally on
     this screen: Book Labor shadows closeAllSheets() and its override calls
     the release as well, so deleting the shared registration breaks nothing
     here — and everything on every screen that does not shadow it. */
  ok('the SHARED closeAllSheets CALLS the release (not just mentions it)',
    /releaseBookingPullup\s*\(/.test(bodyOf(js, 'closeAllSheets')));
  ok('...and this screen\'s override calls it too',
    /releaseBookingPullup\s*\(/.test(bodyOf(
      fs.readFileSync(ROOT + '/prototypes/standalone/eam-book-labor-prototype-v2.html', 'utf8'),
      'closeAllSheets')));
  /* Belt and braces on top: the component also closes its own sheet by id,
     so a future screen whose override does not reach it still dismisses. */
  ok('it also closes itself by id, for the next override that misses it',
    js.indexOf('function closeBookingPullupSheet') > -1 &&
    /closeBookingPullupSheet\s*\(/.test(bodyOf(js, 'releaseBookingPullup')) &&
    /closeBookingPullupSheet\s*\(/.test(bodyOf(js, 'confirmBookingPullup')));
  /* And the ordering that keeps a booking from ALSO reporting a discard:
     confirm nulls the state before it closes anything. */
  ok('confirm clears the state BEFORE it closes — a booking is not a discard',
    /bookingPullup\s*=\s*null[\s\S]*closeAllSheets/.test(bodyOf(js, 'confirmBookingPullup')));
}

console.log('\n§18.2 — ONE condition: is a timer running');
{
  const ctx = boot();
  ok('no timer → the offer does nothing at all',
    ev(ctx, '(function(){ offerTimerBooking(); return bookingPullup === null; })()') === true);
  ok('...and the screen just sits there, no sheet state',
    ev(ctx, 'bookingPullup') === null);
  ev(ctx, 'sessionStorage.setItem("eamTimerRunning","true");');
  ok('timer running → the pull-up is offered',
    ev(ctx, '(function(){ offerTimerBooking(); return bookingPullup !== null; })()') === true);
  ok('it opens on the elapsed value', ev(ctx, 'bookingPullup.min') === 83 &&
    ev(ctx, 'bookingPullup.elapsed') === 83);
  /* The condition is the TIMER, not the arrival route. It used to be
     `arrivedViaNextStep && timerWasRunning`, which can only be true on a
     guided hand-off — so a technician reaching Book Labor from the MORE
     group would never have been offered the booking, which is the whole
     configuration §30.21 exists to enable. */
  ok('the arrival route is NOT part of the condition (More must work)',
    ev(ctx, '(function(){ sessionStorage.removeItem("eamArrivedViaNextStep");' +
      ' bookingPullup = null; offerTimerBooking(); return bookingPullup !== null; })()') === true);
  const bl = fs.readFileSync(ROOT + '/prototypes/standalone/eam-book-labor-prototype-v2.html', 'utf8');
  ok('...and the old auto-opened Add Labor sheet is no longer what a timer lands you in',
    !/showStoppedState\)\s*setTimeout\(\(\)\s*=>\s*openAddLaborSheet/.test(bl));
  ok('Add Labor is still reachable on its own', bl.indexOf('openAddLaborSheet(') > -1);
}

console.log('\nONE editable value — the shape IS the rule');
{
  const ctx = boot();
  ev(ctx, 'sessionStorage.setItem("eamTimerRunning","true"); offerTimerBooking();');
  /* If a second editable row ever appears here, the question to ask is
     whether Book Labor (§18.4) should have been opened instead — that ratio
     is what stops this becoming a second labour form. */
  ok('exactly one control group (the stepper), and 7 protected rows',
    (ev(ctx, html('bookingPullupSheet')).match(/step-btn/g) || []).length === 2 &&
    (ev(ctx, html('bkgDerived')).match(/form-field protected/g) || []).length === 7);
  ok('every derived field is present and locked', ['Employee', 'Trade', 'Department',
    'Activity', 'Date Worked', 'Timer ran', 'Type of Hours']
    .every(l => ev(ctx, html('bkgDerived')).indexOf(l) > -1));
  ok('...and each one carries the lock glyph',
    (ev(ctx, html('bkgDerived')).match(/field-lock/g) || []).length === 7);
  /* §30.21: derived FROM THE EMPLOYEE RECORD, not a literal. EAM_EMPLOYEES[0]
     is the app-wide current-user identity. */
  ok('the employee is the signed-in technician, from data/employees.js',
    ev(ctx, 'currentTechnician().code') === ev(ctx, 'EAM_EMPLOYEES[0].code'));
  ok('trade and department come off that record, not a constant', ev(ctx,
    '(function(){ var h = ' + html('bkgDerived') + ', me = currentTechnician();' +
    ' return h.indexOf(tradeNames[me.trade]) > -1 && h.indexOf(deptNames[me.dept]) > -1; })()') === true);
  ok('Type of Hours is shown as Normal and is not a control',
    ev(ctx, html('bkgDerived')).indexOf('Normal') > -1 &&
    !/Type of Hours[\s\S]{0,200}<select/.test(ev(ctx, html('bkgDerived'))));
}

console.log('\nThe hours stepper');
{
  const ctx = boot();
  ev(ctx, 'sessionStorage.setItem("eamTimerRunning","true"); offerTimerBooking();');
  ok('it reads as h/m and states what it books', ev(ctx, 'document.getElementById("bkgHoursV").textContent') === '1h 23m' &&
    /books as 1\.38 h/.test(ev(ctx, 'document.getElementById("bkgHoursSub").textContent')));
  ok('a tap moves one minute', ev(ctx, '(function(){ adjustBookingMin(-1); return bookingPullup.min; })()') === 82);
  ok('a hold step moves fifteen', ev(ctx, '(function(){ adjustBookingMin(-15); return bookingPullup.min; })()') === 67);
  /* An adjusted booking is a CLAIM about worked time, not a reading off a
     clock — so it says so, and it says what it was. */
  ok('once adjusted it says so, and names the original',
    ev(ctx, 'document.getElementById("bkgHours").classList.contains("is-adjusted")') === true &&
    /Adjusted from 1h 23m/.test(ev(ctx, 'document.getElementById("bkgHoursAdj").textContent')));
  ok('back at the elapsed value, the marker clears', ev(ctx,
    '(function(){ adjustBookingMin(16); return bookingPullup.min === 83 &&' +
    ' !document.getElementById("bkgHours").classList.contains("is-adjusted"); })()') === true);
  ok('it floors at one minute — a zero-hour row is not a booking',
    ev(ctx, '(function(){ adjustBookingMin(-9999); return bookingPullup.min; })()') === 1);
  /* No ceiling on purpose: a technician correcting UP is claiming time the
     timer missed, which happens when they start it late. */
  ok('it does NOT cap at the elapsed value', ev(ctx,
    '(function(){ adjustBookingMin(500); return bookingPullup.min > bookingPullup.elapsed; })()') === true);
  ok('stopHoldStep clears both timers — pointerup AND pointerleave bind to it', ev(ctx,
    '(function(){ startHoldStep(function(){}, 1); var had = holdStepTimer !== null;' +
    ' stopHoldStep(); return had && holdStepTimer === null && holdStepRepeat === null; })()') === true);
}

console.log('\nBook, and the three dismissal routes');
{
  /* BUG 3: a booking must not also report a discard. Both end in
     closeAllSheets(), so the state has to be cleared BEFORE the close. */
  const ctx = boot();
  ev(ctx, 'sessionStorage.setItem("eamTimerRunning","true"); offerTimerBooking(); confirmBookingPullup();');
  ok('booking stops the timer — this is the only place that does',
    ev(ctx, 'timerIsRunning()') === false);
  ok('...and it is not reported as a discard',
    /^Booked /.test(ev(ctx, 'document.getElementById("toastMsg").textContent')));
  ok('the banner takes the BOOKED value, which is what stopped',
    ev(ctx, 'document.getElementById("timerBannerValue").textContent') === '1h 23m');
  ok('state is released', ev(ctx, 'bookingPullup') === null);
  /* COUNTED, not inferred from the toast. Both paths end in
     closeAllSheets(), so if the state is cleared after the close instead of
     before it, onDiscard fires and then onBook fires — and the last toast
     still says "Booked" while the timer is still correctly stopped. The only
     visible symptom is a callback nobody asked for, so that is what is
     asserted. */
  ok('booking fires onBook EXACTLY once and onDiscard NEVER', ev(ctx,
    '(function(){ var booked = 0, discarded = 0;' +
    ' sessionStorage.setItem("eamTimerRunning","true");' +
    ' openBookingPullup({minutes:83, onBook:function(){ booked++; },' +
    '   onDiscard:function(){ discarded++; }});' +
    ' confirmBookingPullup();' +
    ' return booked === 1 && discarded === 0; })()') === true);
  ok('discarding fires onDiscard exactly once and onBook never', ev(ctx,
    '(function(){ var booked = 0, discarded = 0;' +
    ' openBookingPullup({minutes:83, onBook:function(){ booked++; },' +
    '   onDiscard:function(){ discarded++; }});' +
    ' closeAllSheets();' +
    ' return discarded === 1 && booked === 0; })()') === true);
  /* Two closes in a row must not double-report. A sheet opened over the top
     of this one closes it too, so this is reachable rather than theoretical. */
  ok('a second close does not fire onDiscard again', ev(ctx,
    '(function(){ var discarded = 0;' +
    ' openBookingPullup({minutes:83, onDiscard:function(){ discarded++; }});' +
    ' closeAllSheets(); closeAllSheets(); discardBookingPullup();' +
    ' return discarded === 1; })()') === true);

  /* §30.21: DISCARD NEVER STOPS THE TIMER. Both routes, because a
     technician cannot tell them apart. */
  ['discardBookingPullup()', 'closeAllSheets()'].forEach(route => {
    const c = boot();
    ev(c, 'sessionStorage.setItem("eamTimerRunning","true"); offerTimerBooking(); ' + route + ';');
    ok(route + ' leaves the timer RUNNING', ev(c, 'timerIsRunning()') === true);
    ok('  ...releases the state', ev(c, 'bookingPullup') === null);
    ok('  ...and says nothing was booked',
      /still running/.test(ev(c, 'document.getElementById("toastMsg").textContent')));
  });

  /* BUG 1: the screen's own closeAllSheets() closed sheets BY ID, which no
     self-injecting sheet can ever be in. */
  const c2 = boot();
  ev(c2, 'sessionStorage.setItem("eamTimerRunning","true"); offerTimerBooking();');
  ok('the sheet actually closes on this screen (it shadows closeAllSheets)', ev(c2,
    '(function(){ var o = document.getElementById("bookingPullupSheet").classList.contains("open");' +
    ' closeAllSheets();' +
    ' return o && !document.getElementById("bookingPullupSheet").classList.contains("open"); })()') === true);
  const bl = fs.readFileSync(ROOT + '/prototypes/standalone/eam-book-labor-prototype-v2.html', 'utf8');
  ok('...because it no longer closes sheets by a hardcoded id list',
    bl.indexOf("['addLaborSheet','correctionSheet','crewSheet'].forEach") === -1 &&
    /querySelectorAll\('\.bottom-sheet'\)\.forEach/.test(bl));
  /* The one behaviour that override exists for. */
  ok('a nested sheet still closes alone, parent left open', ev(c2,
    '(function(){ openSheet("addLaborSheet"); openSheet("lovSheet"); closeAllSheets();' +
    ' return document.getElementById("addLaborSheet").classList.contains("open") &&' +
    '   !document.getElementById("lovSheet").classList.contains("open"); })()') === true);
}

console.log('\nAdjusted bookings lose the timer span, and that is correct');
{
  /* Once the technician says "I worked 45 of those 83 minutes", the timer's
     start and end cannot both survive and stay true — so an adjusted
     booking is written as direct hours (§18's own Time Entry Mode) and the
     row shows no span. An untouched one keeps the real one. */
  const ctx = boot();
  ev(ctx, 'sessionStorage.setItem("eamTimerRunning","true"); offerTimerBooking();');
  ok('an untouched booking reports itself as unadjusted', ev(ctx,
    '(function(){ var seen = null;' +
    ' openBookingPullup({minutes:83, onBook:function(m,a){ seen = a; }});' +
    ' confirmBookingPullup(); return seen === false; })()') === true);
  ok('an adjusted one reports itself as adjusted', ev(ctx,
    '(function(){ var seen = null;' +
    ' openBookingPullup({minutes:83, onBook:function(m,a){ seen = [m,a]; }});' +
    ' adjustBookingMin(-38); confirmBookingPullup();' +
    ' return seen[0] === 45 && seen[1] === true; })()') === true);
}

console.log('\nThe SECOND caller is not wired, and the component is ready for it');
{
  /* Nothing feeds workflow definitions to the app yet, so §30.21's Stop
     Timer action cannot reach in. What is asserted is that the entry point
     does not depend on Book Labor: it takes its values as arguments and
     honours `mode` itself, so the hand-off calls it unchanged. */
  const ctx = boot();
  ok('system mode books with NO sheet and no state', ev(ctx,
    '(function(){ var got = null;' +
    ' openBookingPullup({mode:"system", minutes:120, onBook:function(m,a){ got = [m,a]; }});' +
    ' return got[0] === 120 && got[1] === false && bookingPullup === null; })()') === true);
  ok('user mode is the default when no mode is given', ev(ctx,
    '(function(){ bookingPullup = null;' +
    ' openBookingPullup({minutes:60, onBook:function(){}});' +
    ' var open = bookingPullup !== null; closeAllSheets(); return open; })()') === true);
  ok('it takes every derived value as an argument — no Book Labor globals read', ev(ctx,
    '(function(){ bookingPullup = null;' +
    ' openBookingPullup({minutes:30, employee:{code:"X1",desc:"Someone Else"},' +
    '   trade:"Welder", dept:"Fabrication", activity:"20 · Weld", date:"01/02/2026", span:"09:00 – 09:30"});' +
    ' var h = ' + html('bkgDerived') + '; closeAllSheets();' +
    ' return h.indexOf("Someone Else") > -1 && h.indexOf("Welder") > -1 &&' +
    '   h.indexOf("Fabrication") > -1 && h.indexOf("20 · Weld") > -1; })()') === true);
  ok('minutes is rounded and floored, so a caller cannot pass a zero booking', ev(ctx,
    '(function(){ var got = null;' +
    ' openBookingPullup({mode:"system", minutes:0, onBook:function(m){ got = m; }});' +
    ' return got === 1; })()') === true);
}

console.log(fail ? '\n' + fail + ' FAILED\n' : '\nbooking pull-up holds\n');
process.exit(fail ? 1 : 0);
