/* User Group Setup — the offline-profile model (§2.10) and the §27.4 UDS
   dead-end check, both added 2026-09-08.

   WHY THIS FILE EXISTS. Two things were replaced on this screen, and each
   replacement can regress into a plausible-looking wrong answer:

   1. The Offline tab used to be a per-group grid of `record type × scope ×
      date horizon × row cap`, and its Scope list offered **"All records"** —
      which §2.7 now explicitly REFUSES ("at least one filter per entity;
      'all records' is refused"). §2.1 also reversed the polarity to
      online-first, so "what a device downloads at login" stopped being the
      question. The tab is now offline-PROFILE ASSIGNMENT: one artifact, many
      groups, contents read-only here for the same §26.5.1 reason a workflow
      configuration's steps are read-only here.

   2. `capabilityGap()` compared a function's tabs against a FIXED five-step
      list, so ZJ1000 reported a Checklist + Book Labor gap on every ZJ1000
      configuration — including one that places neither and renders fine. A
      warning that fires on a correct configuration is how admins learn to
      ignore warnings, so the false positive is pinned here as a test rather
      than trusted to stay fixed.

   THE ASSERTION MOST LIKELY TO ROT is the severity split. "Online-only" and
   "no profile at all" are different facts, and the old single warning
   conflated them — so a group that is deliberately online-only (§2.10's
   online-only user group) reported as misconfigured. Likewise a REQUIRED UDS
   step the group cannot open is an error, while an optional one is a warning:
   only the first makes the work order impossible to finish. Collapse either
   split and the panel still renders, still looks reasonable, and lies. */
const path = require('path'), vm = require('vm');
const { runScreen } = require(path.join(__dirname, '..', 'run-load.js'));

/* RETIRED SCREEN, LIVE ASSERTIONS (2026-09-16).

   eam-user-group-setup-prototype-v1.html moved to `old versions/` when the
   Workflow Designer Portal became the single base-screen entry point (§30,
   retirement recorded in §21). This file was deliberately NOT deleted with it,
   and it is deliberately NOT evidence that the capability is live:

     WHAT IT STILL DOES — executes the §2.10 / §27.4 severity rules against the
       archived artifact, so they stay checkable code rather than decaying into
       prose. The distinctions below are the ones that rot invisibly, and one of
       them (capabilityGap() keyed on the CONFIGURATION rather than the
       function) already killed a live false positive once.

     WHAT IT DOES NOT DO — cover the portal. When the portal's User Groups area
       is built, every assertion here has to be RE-PINNED against it. This file
       passing says nothing whatsoever about that area. Tracked in §20.

   Treat it as the specification for the rebuild, not as coverage of it. If the
   archived file is ever deleted, port the cases first — do not just drop them. */
const FILE = 'base screens/old versions/eam-user-group-setup-prototype-v1.html';

let fail = 0;
function ok(label, pass, detail) {
  console.log('  ' + (pass ? 'PASS' : 'FAIL') + '  ' + label + (detail !== undefined ? '  → ' + detail : ''));
  if (!pass) fail++;
}
/* Top-level `let`/`const` live in the context's global lexical environment,
   not on the context object — so everything goes through a script evaluated
   in the same context. */
const ev = (ctx, expr) => vm.runInContext(expr, ctx);

const TIER0_ORDER = ['0a', '0b', '0c', '0d', '0e', '0f'];

function boot() {
  const ctx = runScreen(FILE, null);
  if (ev(ctx, 'cur.code') !== 'MAINT-TECH') throw new Error('boot(): unexpected initial group ' + ev(ctx, 'cur.code'));
  return ctx;
}
const pick = (ctx, code) => ev(ctx, `pickGroup(${JSON.stringify(code)}); cur.code`);

console.log('\nThe retired model is gone, not just unused');
{
  const ctx = boot();
  ok('no group carries a row-set download policy any more',
    ev(ctx, 'GROUPS.every(g => g.sync === null || typeof g.sync === "string")'));
  /* The specific thing §2.7 refuses. Checked against the live profile data
     rather than a deleted constant, because the way this regresses is
     somebody re-adding an unfiltered entity, not re-adding the old array. */
  ok('"all records" appears in no filter anywhere (§2.7 refuses it)',
    ev(ctx, 'OFFLINE_PROFILES.every(p => p.entities.every(e => !/all records/i.test(e.filter)))'));
  ok('every replicated entity carries a filter (§2.7: at least one per entity)',
    ev(ctx, `OFFLINE_PROFILES.every(p => p.entities.every(e =>
        e.policy === 'server-only' || (e.filter && e.filter.trim() && e.filter !== '—')))`));
  ok('exactly one policy class is writable offline (§2.5 — what keeps a conflict UI buildable)',
    ev(ctx, 'Object.keys(OFFLINE_POLICIES).filter(k => OFFLINE_POLICIES[k].write).join(",")')
      === 'work-set,external-replica',
    ev(ctx, 'Object.keys(OFFLINE_POLICIES).filter(k => OFFLINE_POLICIES[k].write).join(",")'));
  ok('the punch list is described in pin terms, never date terms (§2.3)',
    ev(ctx, `OFFLINE_PROFILES.some(p => p.entities.some(e => /pinned/.test(e.filter)))
             && OFFLINE_PROFILES.every(p => p.entities.every(e => !/today/i.test(e.filter)))`));
}

console.log('\nProfile assignment — one artifact, many groups');
{
  const ctx = boot();
  ok('MAINT-TECH resolves an explicit profile',
    ev(ctx, 'effective(cur,"sync").value') === 'TECH-FULL' && ev(ctx, 'resolve(cur,"sync").state') === 'explicit');

  pick(ctx, 'STORES');
  ok('an unconfigured group INHERITS the * profile',
    ev(ctx, 'resolve(cur,"sync").state') === 'inherited' && ev(ctx, 'effective(cur,"sync").value') === 'TECH-LIGHT');
  ok('the * default is the conservative profile, not the largest',
    ev(ctx, 'profileByCode("TECH-LIGHT").entities.length') < ev(ctx, 'profileByCode("TECH-FULL").entities.length'));

  /* Overriding must land on a real profile code. The old makeExplicit()
     cloned a row set and fell back to `[]`, which as a profile code resolves
     to nothing — the tab would render against a non-profile. */
  ev(ctx, 'makeExplicit("sync")');
  ok('overriding an inherited profile copies the CODE down, never an empty array',
    typeof ev(ctx, 'cur.sync') === 'string' && !!ev(ctx, 'profileByCode(cur.sync)'), String(ev(ctx, 'cur.sync')));

  ev(ctx, 'setProfile("NONE")');
  ok('assignment is editable — that is this tab\'s one edit',
    ev(ctx, 'effective(cur,"sync").value') === 'NONE');

  /* Membership is DERIVED from the group side. A `groups` array on the
     profile would be a second source of truth for one fact — §26.5.1's
     Fault 1 shape, and the reason workflow configs keep membership on the
     artifact while profiles cannot (a group holds exactly one). */
  ok('profile membership is derived, not stored on the profile',
    ev(ctx, 'OFFLINE_PROFILES.every(p => !("groups" in p))'));
  ok('and it counts the groups that actually resolve to it',
    ev(ctx, 'profileMembers("NONE").includes("STORES") && profileMembers("NONE").includes("CONTRACTOR")'),
    ev(ctx, 'profileMembers("NONE").join(",")'));
}

console.log('\nOnline-only is a valid answer, not a misconfiguration (§2.10)');
{
  const ctx = boot();
  pick(ctx, 'CONTRACTOR');
  ok('CONTRACTOR is profile None — an online-only user group (§2.10)',
    ev(ctx, 'effective(cur,"sync").value') === 'NONE');
  const iss = ev(ctx, 'consistencyIssues(cur).map(i => i.sev + ":" + i.tab)');
  ok('it raises an INFO note, never a warning or an error',
    iss.includes('info:sync') && !iss.includes('warn:sync') && !iss.includes('error:sync'), iss.join(' '));
  ok('and the note is the §4.4.1 consequence, not a generic one',
    /Same icon, opposite promise/.test(ev(ctx, 'consistencyIssues(cur).find(i=>i.tab==="sync").msg')));

  /* The header must not call a correct configuration an inconsistency. */
  ev(ctx, 'tab = "overview"; renderBody();');
  const body = ev(ctx, 'document.getElementById("body").innerHTML');
  ok('the overview header counts by severity, so None is not reported as broken',
    /note.? worth knowing/.test(body) || !/inconsistenc/.test(body), 'header text checked');

  /* "No profile anywhere" is a DIFFERENT fact and still warns. */
  ev(ctx, 'GROUPS.find(g=>g.dflt).syncSet = false; GROUPS.find(g=>g.dflt).sync = null; pickGroup("STORES");');
  const iss2 = ev(ctx, 'consistencyIssues(cur).filter(i=>i.tab==="sync").map(i=>i.sev)');
  ok('"no profile resolves at all" still warns — the two are not conflated',
    iss2.includes('warn'), iss2.join(','));
}

console.log('\nTier 0 and the outbox are never part of the switch (§2.10 items 1–2)');
{
  const ctx = boot();
  pick(ctx, 'CONTRACTOR');            // profile None — the hardest case
  ev(ctx, 'tab = "sync"; renderBody();');
  const html = ev(ctx, 'document.getElementById("body").innerHTML');
  ok('Tier 0 is rendered even for an online-only group', /Tier 0 configuration/.test(html));
  ok('all six Tier 0 sub-tiers are listed in order',
    TIER0_ORDER.every(k => html.includes('>' + k + '<')), TIER0_ORDER.join(' '));
  ok('layout is stated to come first, because it scopes everything after it',
    /Layout is <b>first<\/b>/.test(html));
  ok('the outbox is shown as always on', /always on/.test(html));
  ok('and it says explicitly that switching a profile off does not switch it off',
    /never turns the outbox off/.test(html));
}

console.log('\n§27.4 — the UDS dead end only this screen can see');
{
  const ctx = boot();
  pick(ctx, 'SALES-ENG');
  const dead = ev(ctx, 'udsDeadEnds(cur).map(d => d.uds.perm + (d.required ? ":required" : ":optional"))');
  ok('SALES-ENG hits a REQUIRED UDS step it has no permission for',
    dead.includes('UDSLOTO:required'), dead.join(' '));
  const err = ev(ctx, 'consistencyIssues(cur).filter(i=>i.sev==="error").map(i=>i.msg).join(" ")');
  ok('reported as an ERROR — the work order cannot be finished',
    /cannot be finished/.test(err));
  ok('and it names the fix outside this screen, never "assign a different group"',
    /Security ▸ Tab Permissions/.test(err) && !/assign a different group/i.test(err));

  pick(ctx, 'MAINT-TECH');
  ok('a group that HAS the tab permission gets no dead end',
    ev(ctx, 'udsDeadEnds(cur).length') === 0);

  /* Severity follows Required, not the permission alone: an optional step the
     group cannot open is a real gap but a survivable one. */
  ev(ctx, `WORKFLOW_CONFIGS.find(c=>c.id==="c9").steps.find(s=>s.k==="uds").req = false;
           pickGroup("SALES-ENG");`);
  const sev = ev(ctx, 'consistencyIssues(cur).filter(i=>/LOTO/.test(i.msg)).map(i=>i.sev)');
  ok('the same step, not Required, downgrades to a warning', sev.join(',') === 'warn', sev.join(','));
}

console.log('\ncapabilityGap — keyed on the configuration, not the function');
{
  const ctx = boot();
  /* The false positive that was live before 2026-09-08. */
  ok('a ZJ1000 config placing neither Checklist nor Book Labor reports NO gap',
    ev(ctx, 'capabilityGap(WORKFLOW_CONFIGS.find(c=>c.id==="c8")).length') === 0);
  ok('a config that really does place a missing tab still reports it',
    (() => {
      ev(ctx, 'WORKFLOW_CONFIGS.find(c=>c.id==="c8").steps.push({k:"tab",t:"CHK"})');
      return ev(ctx, 'capabilityGap(WORKFLOW_CONFIGS.find(c=>c.id==="c8")).join(",")') === 'CHK';
    })());
  ok('Record View is never a capability gap — it always exists (§14)',
    ev(ctx, 'capabilityGap({fn:"ZJ1000", steps:[{k:"tab",t:"RV"}]}).length') === 0);
  ok('a duplicate instance needs no extra capability',
    ev(ctx, 'capabilityGap({fn:"WSJOBS", steps:[{k:"tab",t:"CHK"},{k:"tab",t:"CHK",n:2}]}).length') === 0);
  ok('a UDS step is never a function capability gap (§27 — it is a tab PERMISSION question)',
    ev(ctx, 'capabilityGap({fn:"ZJ1000", steps:[{k:"uds",t:"uds-loto"}]}).length') === 0);
  ok('nor is a fork', ev(ctx, 'capabilityGap({fn:"ZJ1000", steps:[{k:"fork"}]}).length') === 0);
}

console.log('\n§29 step instances are described accurately, and read-only');
{
  const ctx = boot();
  ev(ctx, 'tab = "screens"; renderBody();');
  const html = ev(ctx, 'document.getElementById("body").innerHTML');
  ok('a second instance shows its instance number in the name', /Record View \(2\)/.test(html));
  ok('a UDS step is marked as a different KIND, not as a tab named oddly', /sk-uds/.test(html));
  ok('a fork is marked as its own kind', /sk-fork/.test(html));
  ok('a gate is shown inline on the step', /class="sgate"/.test(html));
  ok('steps are not HTML-escaped into visible markup', !/&lt;span class="sstep/.test(html));
  ok('the tab still states that steps and layout are read-only here (§26.5.1)',
    /read-only here/.test(html));

  /* Nothing on this screen may mutate a configuration's steps. */
  const before = ev(ctx, 'JSON.stringify(WORKFLOW_CONFIGS.map(c=>c.steps))');
  ev(ctx, 'assignConfig("c1"); unassignConfig("c1"); tab="screens"; renderBody();');
  ok('assign / unassign touch membership only, never steps',
    ev(ctx, 'JSON.stringify(WORKFLOW_CONFIGS.map(c=>c.steps))') === before);
}

console.log('\nEvery tab renders for every group');
{
  const ctx = boot();
  let threw = null;
  try {
    ev(ctx, `GROUPS.forEach(g => {
      pickGroup(g.code);
      TABS.forEach(t => { tab = t.id; renderTabs(); renderBody(); });
      consistencyIssues(g);
    });`);
  } catch (e) { threw = e.message; }
  ok('no group × tab combination throws', threw === null, threw || 'clean');

  /* Copy and reset both had to learn that sync is a code, not a row set. */
  ev(ctx, `pickGroup("STORES"); copyState = {from:'MAINT-TECH', doms:{sync:true}}; doCopy();`);
  ok('copying the offline domain copies the profile CODE',
    ev(ctx, 'cur.sync') === 'TECH-FULL', String(ev(ctx, 'cur.sync')));
  ev(ctx, 'resetToDefault()');
  ok('reset drops back to inheriting', ev(ctx, 'cur.syncSet') === false
    && ev(ctx, 'resolve(cur,"sync").state') === 'inherited');
}

console.log(fail ? '\n' + fail + ' assertion(s) FAILED' : '\noffline-profile model holds');
process.exit(fail ? 1 : 0);
