/*
  EAM MOBILE — SHARED BEHAVIOR
  Canonical component JS, extracted 2026-07-15 from sample-screen-standard-
  model-prototype.html and eam-equipment-record-view-prototype-v1.html.
  Functions here are generic; each screen supplies its own data via a small
  set of expected globals (documented per section below) before calling
  initSharedApp(). Do not re-implement any function defined here — add
  screen-specific JS only for behavior this file has no component for.

  Naming reconciliation note (2026-07-15): the two source files had
  independently drifted (e.g. openLovField/selectLovField/clearLovField vs.
  openLov/selectLov/clearLov for the same behavior). Standardized on the
  shorter Sample Screen naming throughout, since that file is the
  designated master field-type reference (design-decisions-v3-1.md §5.2).

  Tab-content architecture note: standardized on Equipment's regenerate-
  per-tab dispatch (TAB_RENDERERS[key]() on every switch) rather than
  Sample Screen's pre-rendered-panels-plus-CSS-toggle — it scales to heavy
  tabs and already matches how the List/Detail shell re-renders on every
  interaction anyway.
*/

/* ══════════════════════════════════════════════════════════════════════
   THEME TOGGLE + TOAST + SHEET PRIMITIVES
   ══════════════════════════════════════════════════════════════════════ */
/* Theme now persists across navigation (added 2026-07-22) — each screen's
   <head> has a tiny inline script (before the stylesheet link, so it runs
   before first paint — no flash of the wrong theme) that reads the same
   'eamTheme' localStorage key and applies data-theme immediately. This
   function just needs to sync the button's own label to whatever that
   inline script already set, and persist future clicks. */
function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.textContent = document.documentElement.hasAttribute('data-theme') ? '◑ Dark' : '☀ Light';
  btn.addEventListener('click', () => {
    const dark = document.documentElement.hasAttribute('data-theme');
    if (dark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('eamTheme', 'light'); btn.textContent = '☀ Light'; }
    else { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('eamTheme', 'dark'); btn.textContent = '◑ Dark'; }
  });
}
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
function closeAllSheets() {
  document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('open'));
  const overlay = document.getElementById('sheetOverlay');
  if (overlay) overlay.classList.remove('open');
}
function openSheet(id) {
  const overlay = document.getElementById('sheetOverlay');
  if (overlay) overlay.classList.add('open');
  document.getElementById(id).classList.add('open');
}

/* ══════════════════════════════════════════════════════════════════════
   TAB / STEP RAIL (§7.1/§14.1–§14.3) — generalized, no sequence/gating
   for record tabs. Screen provides:
     TABS = [{ key, name, icon: '<svg>...' }, ...]
     TAB_RENDERERS = { key: () => '<html string>', ... }
   and sets `currentTab` (declared here, screen just assigns to it).
   ══════════════════════════════════════════════════════════════════════ */
let currentTab = null;
function renderTabRail() {
  const active = TABS.find(t => t.key === currentTab);
  if (!active) return;
  // No leading icon on the collapsed rail as of 2026-07-22 — was
  // redundant right next to the tab's own name text; #tabRailIcon no
  // longer exists in any screen's markup, so this doesn't try to set it.
  document.getElementById('tabRailName').textContent = active.name;
  document.getElementById('tabMap').innerHTML = TABS.map(t => `
    <div class="tab-map-item${t.key===currentTab?' active':''}" onclick="goToTab('${t.key}')">
      <span class="tab-map-icon">${t.icon || ''}</span>
      <span class="tab-map-label">${t.name}</span>
      <span class="tab-map-chevron"><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </div>`).join('');
}
function initTabRail() {
  const rail = document.getElementById('tabRail');
  if (!rail) return;
  rail.addEventListener('click', (e) => {
    if (e.target.closest('.tab-map-item')) return;
    const map = document.getElementById('tabMap');
    const chev = document.getElementById('tabChevron');
    const open = map.classList.toggle('open');
    rail.classList.toggle('expanded', open);
    chev.style.transform = open ? 'rotate(180deg)' : '';
  });
}
/* ── WO WORKFLOW STEP RAIL (§14.2/§14.3) — generalized 2026-07-16, same
   gated/numbered rail as .tab-rail's toggle but a distinct component (no
   sequence in .tab-rail). Step map rows are informational only, not
   tappable — each step is its own file, not a tab inside this one. ── */
function initStepRail() {
  const rail = document.getElementById('stepRail');
  if (!rail) return;
  rail.addEventListener('click', (e) => {
    if (e.target.closest('.step-map-item')) return;
    const map = document.getElementById('stepMap');
    const chev = document.getElementById('stepChevron');
    const open = map.classList.toggle('open');
    rail.classList.toggle('expanded', open);
    chev.style.transform = open ? 'rotate(180deg)' : '';
  });
}

/* ══════════════════════════════════════════════════════════════════════
   WO WORKFLOW RESOLUTION (design-decisions-v3-1.md §11-13, added
   2026-07-22) — reads whichever WOTYPE/WO Workflow/WO Workflow Steps data
   files a screen has loaded and returns which of the 5 guided steps
   apply, in what order, plus the Free Form flag + status source. No
   matching WO Workflow row (e.g. ROUT) is the §11 fallback: no steps at
   all, always Free Form — that's the deliberate design, not a gap.
   ══════════════════════════════════════════════════════════════════════ */
const WO_STEP_LABELS = {
  record: 'WO Record View',
  checklist: 'Activity Checklist',
  issueparts: 'Issue Parts',
  booklabor: 'Book Labor',
  closing: 'WO Closing',
};
const WO_STEP_FILES = {
  record: 'eam-wo-record-view-prototype-v1.html',
  checklist: 'eam-activity-checklist-prototype-v2.html',
  issueparts: 'eam-wo-prototype-issue-parts-v1.html',
  booklabor: 'eam-book-labor-prototype-v2.html',
  closing: 'eam-wo-closing-prototype-v2.html',
};
function resolveWoWorkflow(jobType, userGroup) {
  userGroup = userGroup || '*';
  const header = (typeof EAM_WO_WORKFLOW !== 'undefined' ? EAM_WO_WORKFLOW : [])
    .find(r => r.woType === jobType && (r.userGroup === userGroup || r.userGroup === '*'));
  if (!header) return { configured: false, freeForm: true, statusSource: 'WO_HEADER', steps: [] };
  const steps = (typeof EAM_WO_WORKFLOW_STEPS !== 'undefined' ? EAM_WO_WORKFLOW_STEPS : [])
    .filter(r => r.woType === jobType && (r.userGroup === userGroup || r.userGroup === '*'))
    .sort((a, b) => a.sequence - b.sequence)
    .map(r => r.step);
  const wotype = (typeof EAM_WOTYPE !== 'undefined' && EAM_WOTYPE[jobType]) || {};
  return { configured: true, freeForm: !!header.freeForm, statusSource: wotype.statusSource || 'WO_HEADER', steps };
}
/* Renders the step-rail's step-map + progress segments + step-name from a
   resolved workflow's own step list — replaces each of the 5 WO-workflow
   screens' previously-hardcoded 5-item markup. PM's 4-step list (skipping
   Issue Parts) is the reason this needed to become data-driven instead of
   copy-pasted per screen. activeStep is this screen's own step key. No-
   ops (leaves existing markup alone) when the resolved workflow has no
   steps at all (the §11 fallback) — screens handle that case themselves,
   typically by hiding the whole rail (it has nothing to show). */
function renderStepRail(workflow, activeStep) {
  const rail = document.getElementById('stepRail');
  const map = document.getElementById('stepMap');
  if (!rail || !map || !workflow || !workflow.steps.length) return;
  const seg = rail.querySelector('.step-segments');
  const nameEl = rail.querySelector('.step-name');
  const steps = workflow.steps;
  const activeIdx = steps.indexOf(activeStep);
  if (nameEl) nameEl.textContent = WO_STEP_LABELS[activeStep] || '';
  rail.classList.toggle('rail-not-free-form', !workflow.freeForm);
  // Preserve the expanded-rail timer panel (Steps 2–3's hardcoded first
  // child of #stepMap, §14.2 follow-up) — this used to get silently wiped
  // out by the innerHTML overwrite below, which is why it looked like it
  // never got built at all (found + fixed 2026-07-22).
  const timerPanel = map.querySelector('.step-timer-panel');
  map.innerHTML = (timerPanel ? timerPanel.outerHTML : '') + steps.map((s, i) => {
    const label = WO_STEP_LABELS[s];
    if (i < activeIdx) return `<div class="step-map-item"><div class="step-map-icon smi-done">✓</div><span class="step-map-label">${label}</span></div>`;
    if (i === activeIdx) return `<div class="step-map-item active"><div class="step-map-icon smi-active">${i + 1}</div><span class="step-map-label active-label">${label}</span></div>`;
    return `<div class="step-map-item"><div class="step-map-icon smi-locked">${i + 1}</div><span class="step-map-label">${label}</span></div>`;
  }).join('') + STEP_MAP_REFERENCE_GROUP_HTML;
  if (seg) {
    seg.innerHTML = steps.map((s, i) => `<div class="seg ${i < activeIdx ? 'seg-done' : i === activeIdx ? 'seg-active' : 'seg-future'}"></div>`).join('');
  }
}
/* Flat, unordered, ungated rail for the §11 fallback (no configured
   workflow — always Free Form), added 2026-07-22 (user direction — the
   fallback screen was hiding its rail/bar entirely; now it shows all 5
   WO-workflow steps, unnumbered, free-flow-tappable, same visual
   language as Equipment RV's own .tab-map-item rows (renderTabRail()
   above) rather than the numbered/sequential .step-map-icon treatment
   renderStepRail() uses for a real configured workflow. Reuses the same
   #stepRail/#stepMap shell/collapse mechanic (initStepRail() above) —
   only what gets rendered INTO #stepMap differs. No per-step icon exists
   in this data model (WO_STEP_LABELS is label-only), so each row is a
   leading outline circle (.step-map-dot, added 2026-07-22, user
   direction — "the current selected tab" gets a highlighted/filled
   circle, every other row stays outline-only; deliberately a plain dot,
   not a number, so it doesn't reintroduce the sequence indicator this
   rail is specifically avoiding) + label + trailing chevron
   (.step-map-ref-icon, already flex-pushed to the row's right edge by
   .step-map-label's own flex:1). Every row but the active one is a real
   cross-file navigation (goToWoStep() below) — there's no gating concept
   for this fallback case at all, by design. */
const WO_FLAT_STEPS = ['record', 'checklist', 'issueparts', 'booklabor', 'closing'];
function renderFlatStepRail(activeStep) {
  const rail = document.getElementById('stepRail');
  const map = document.getElementById('stepMap');
  if (!rail || !map) return;
  const seg = rail.querySelector('.step-segments');
  const nameEl = rail.querySelector('.step-name');
  if (nameEl) nameEl.textContent = WO_STEP_LABELS[activeStep] || '';
  rail.classList.remove('rail-not-free-form'); // §11 fallback is always Free Form
  if (seg) seg.innerHTML = ''; // no numbered progress bar in flat mode
  const timerPanel = map.querySelector('.step-timer-panel');
  map.innerHTML = (timerPanel ? timerPanel.outerHTML : '') + WO_FLAT_STEPS.map(s => `
    <div class="step-map-item${s === activeStep ? ' active' : ''}" onclick="${s === activeStep ? 'collapseCurrentRail()' : `goToWoStep('${s}')`}">
      <span class="step-map-dot"></span>
      <span class="step-map-label${s === activeStep ? ' active-label' : ''}">${WO_STEP_LABELS[s]}</span>
      <span class="step-map-ref-icon"><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </div>`).join('') + STEP_MAP_REFERENCE_GROUP_HTML;
}
// Real navigation, not a same-page tab switch — each WO step is its own
// file. Carries the demo WO's identity forward via the same
// 'eamOpenDemoWo' consume-once flag WO List's openWO() already
// established, so the destination screen resolves the same ROUT
// identity instead of falling back to its own default (19257).
function goToWoStep(step) {
  sessionStorage.setItem('eamOpenDemoWo', DEMO_WO);
  location.href = WO_STEP_FILES[step];
}

/* Reference group markup (§14.2, added 2026-07-22) — see the CSS comment
   on .step-map-group-label for the full rationale. Comments/Documents
   are owned by WO Record View only (never duplicated on the other 4
   workflow screens) — jumpToRvSection() below handles both "already on
   Record View, just jump" and "on a different step, navigate there and
   jump after load" from the exact same call. Equipment is a real future
   destination, stubbed for now. */
const STEP_MAP_REFERENCE_GROUP_HTML = `
  <div class="step-map-group-label">Reference</div>
  <div class="step-map-item" onclick="jumpToRvSection('comments')">
    <span class="step-map-ref-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg></span>
    <span class="step-map-label">Comments</span>
  </div>
  <div class="step-map-item" onclick="jumpToRvSection('documents')">
    <span class="step-map-ref-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.48-8.48l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></span>
    <span class="step-map-label">Documents</span>
  </div>
  <div class="step-map-item" onclick="jumpToEquipmentStub()">
    <span class="step-map-ref-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke-linecap="round"/></svg></span>
    <span class="step-map-label">Equipment</span>
  </div>`;
// Collapses whichever rail (step or tab) is present on this screen —
// used after a Reference-group jump so the rail gets out of the way,
// same as a real navigation implicitly would.
function collapseCurrentRail() {
  const rail = document.getElementById('stepRail') || document.getElementById('tabRail');
  const map = document.getElementById('stepMap') || document.getElementById('tabMap');
  const chev = document.getElementById('stepChevron') || document.getElementById('tabChevron');
  if (rail) rail.classList.remove('expanded');
  if (map) map.classList.remove('open');
  if (chev) chev.style.transform = '';
}
// key is 'comments' or 'documents'. If this screen has that section
// (WO Record View), expand + scroll to it in place. Otherwise, hand off
// to WO Record View (the only screen that ever renders these) via a
// consume-once flag, same pattern as eamSyncReturnUrl/
// eamArrivedViaNextStep elsewhere in this app — see consumeJumpToSection().
function jumpToRvSection(key) {
  const el = document.getElementById('rv-' + key);
  if (el) {
    if (!el.classList.contains('open')) rvToggle(key);
    collapseCurrentRail();
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return;
  }
  sessionStorage.setItem('eamJumpToSection', key);
  location.href = 'eam-wo-record-view-prototype-v1.html';
}
function jumpToEquipmentStub() { showToast('Equipment — coming soon'); }
// Called once at WO Record View's own init — consumes the flag
// jumpToRvSection() sets when Comments/Documents are tapped from any of
// the OTHER 4 workflow screens, so arriving here actually lands on the
// right section instead of just the top of the record.
function consumeJumpToSection() {
  const key = sessionStorage.getItem('eamJumpToSection');
  if (!key) return;
  sessionStorage.removeItem('eamJumpToSection');
  const el = document.getElementById('rv-' + key);
  if (!el) return;
  if (!el.classList.contains('open')) rvToggle(key);
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
}
/* Identity text swap (added 2026-07-22, widening the demo-WO selector's
   scope per user request) — updates the visible WO#/description/Type
   text to match the selected demo WO. Deliberately still doesn't touch
   deeper content (equipment, activities, labor, parts) — same "workflow
   chrome only" scope call as the rest of this mechanism — but showing
   19257's own number/description/Type while a completely different
   demo WO's workflow rules are active read as flatly wrong, not just
   incomplete, so these 3 highly-visible text nodes get the same live
   treatment as the step rail. Requires WO_19257/WO_19831/WO_20450 all
   loaded (harmless additional <script src> tags, tiny flat objects). */
function demoWoRecord() {
  const map = {
    '19257': (typeof WO_19257 !== 'undefined' ? WO_19257 : null),
    '19831': (typeof WO_19831 !== 'undefined' ? WO_19831 : null),
    '20450': (typeof WO_20450 !== 'undefined' ? WO_20450 : null),
  };
  return map[DEMO_WO];
}
function applyDemoWoIdentity() {
  const rec = demoWoRecord();
  const jobType = DEMO_WO_JOBTYPES[DEMO_WO];
  const numEl = document.getElementById('recNum');
  const descEl = document.getElementById('recDesc');
  if (rec && numEl) numEl.textContent = rec.woNumber;
  if (rec && descEl) descEl.textContent = rec.description;
  // Fixed 2026-07-22 (punch-list item): this used to also overwrite the
  // Type badge (fv-type-desc) with EAM_WOTYPE[jobType].desc — e.g.
  // "Breakdown Maintenance" for BRKD — but EAM_WOTYPE is the internal
  // job-type/workflow-routing table, not the same thing as the WO's own
  // user-facing Type field (LOV_DATA.type/RECORD.type, e.g. "Breakdown").
  // The two are legitimately different fields; stomping one with the
  // other produced a value that didn't match the Type LOV's own text.
  // Type is left alone here now — it renders from each screen's own
  // RECORD.type, same as every other demo-WO-swap-untouched deeper field.
}
/* Dev-only demo-WO selector (same pattern as the theme/online toggles) —
   this prototype has no real cross-screen ?wo= navigation yet (Phase 1,
   still unstarted), so which of the 3 demo WOs' workflow rules apply is a
   flag a reviewer flips by hand, per screen, to see all 3 tiers of the
   §11-13 model (BRKD full flow / PM skips Issue Parts / ROUT falls back
   to the plain Standard Record View). Also swaps the WO#/description/
   Type text (applyDemoWoIdentity() above, added 2026-07-22) — but still
   deliberately doesn't touch deeper content (equipment, activities,
   labor, parts) on any screen; swapping *that* per screen is the larger
   Phase 1 scope this pass isn't tackling (see design-decisions-v3-1.md
   §11's "lightweight vs. full ?wo= loading" note). */
const DEMO_WO_JOBTYPES = { '19257': 'BRKD', '19831': 'PM', '20450': 'ROUT' };
let DEMO_WO = '19257';
function cycleDemoWo() {
  const nums = Object.keys(DEMO_WO_JOBTYPES);
  DEMO_WO = nums[(nums.indexOf(DEMO_WO) + 1) % nums.length];
  const btn = document.getElementById('demoWoToggle');
  if (btn) btn.textContent = '📋 WO ' + DEMO_WO;
  applyDemoWoIdentity();
  if (typeof onDemoWoChanged === 'function') onDemoWoChanged();
}

/* goToTab is the one function most screens never need to call directly
   (tab-map items call it via onclick) but every screen with more than one
   tab must define TAB_RENDERERS/TABS before its first call. Record-View-
   style single-screen prototypes (no sibling tabs) don't need this at all. */
function goToTab(key) {
  if (typeof autosaveIfDirty === 'function') autosaveIfDirty();
  currentTab = key;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.dataset.tab === key));
  renderTabRail();
  const map = document.getElementById('tabMap');
  if (map) map.classList.remove('open');
  const rail = document.getElementById('tabRail');
  // Bug fix 2026-07-16: .expanded (the padding-bottom:14px added while the
  // map is open, §3.4 "purple frame on all 3 open sides") was never removed
  // here — only the map's own .open class was. Left the rail permanently
  // taller/mispadded after every selection, and the collapsed row's
  // flex-centered content read as vertically off-center against the extra
  // stuck padding.
  if (rail) rail.classList.remove('expanded');
  const chev = document.getElementById('tabChevron');
  if (chev) chev.style.transform = '';
  // Header swap (§8.1): Record View keeps the full editable §5.3 header;
  // every other tab shows the protected-identity List/Detail header —
  // never both, never neither.
  const isRecordView = key === 'record';
  const recHeader = document.getElementById('recHeader');
  const listDetailHeader = document.getElementById('listDetailHeader');
  if (recHeader) recHeader.classList.toggle('hidden', !isRecordView);
  if (listDetailHeader) {
    listDetailHeader.classList.toggle('active', !isRecordView);
    if (!isRecordView) {
      const num = document.getElementById('recNum');
      const desc = document.getElementById('recDesc');
      if (num) document.getElementById('listDetailNum').textContent = num.textContent;
      if (desc) document.getElementById('listDetailDesc').textContent = desc.textContent;
    }
  }
  // Plus/Search visibility (§8's content-driven rule) — screen-provided
  // sets; a screen with no Insert Mode or no searchable tabs can omit both.
  const plusBtn = document.getElementById('listDetailPlusBtn');
  if (plusBtn && typeof TABS_WITH_PLUS !== 'undefined') plusBtn.classList.toggle('hidden', !TABS_WITH_PLUS.has(key));
  const searchBtn = document.getElementById('listDetailSearchBtn');
  if (searchBtn && typeof TABS_WITH_SEARCH !== 'undefined') searchBtn.classList.toggle('hidden', !TABS_WITH_SEARCH.has(key));
  renderActiveTabContent();
}
function renderActiveTabContent() {
  const panel = document.querySelector(`.tab-content[data-tab="${currentTab}"]`);
  if (!panel || typeof TAB_RENDERERS === 'undefined' || !TAB_RENDERERS[currentTab]) return;
  panel.innerHTML = TAB_RENDERERS[currentTab]();
  const query = (typeof listDetailState !== 'undefined' && listDetailState[currentTab]) ? listDetailState[currentTab].search : null;
  if (query) onListDetailSearchInput(currentTab, query);
}

/* ══════════════════════════════════════════════════════════════════════
   RECORD IDENTITY HEADER (§5.3) — scroll-collapsing status-forefront
   header, and its List/Detail protected-identity sibling (§8.1).
   ══════════════════════════════════════════════════════════════════════ */
let activeContentSelector = '.content';
function initRecHeaderScroll(contentSelector) {
  activeContentSelector = contentSelector || '.content';
  document.querySelectorAll(activeContentSelector).forEach(el => {
    el.addEventListener('scroll', () => onRecContentScroll(el));
  });
}
let recHeaderScrolled = false, recHeaderTicking = false;
function onRecContentScroll(el) {
  if (recHeaderTicking) return;
  recHeaderTicking = true;
  // setTimeout, not requestAnimationFrame — rAF only fires on an actual
  // paint tick, and a backgrounded/inactive tab (some embedded preview
  // panes never give a tab real focus) can suspend paint indefinitely,
  // which silently stalls this whole mechanism forever (found live: a
  // scroll past the threshold left this stuck mid-debounce, header never
  // collapsing). A short timer fires on its own clock instead of waiting
  // on the renderer, so the debounce still coalesces rapid scroll events
  // without depending on the tab actually being painted.
  setTimeout(() => {
    const top = el.scrollTop;
    const header = document.getElementById('recHeader');
    if (header) {
      if (!recHeaderScrolled && top > 40) { recHeaderScrolled = true; header.classList.add('scrolled'); }
      else if (recHeaderScrolled && top < 10) { recHeaderScrolled = false; header.classList.remove('scrolled'); }
    }
    // Generic scroll-collapse chrome (§4.2, generalized for a 2nd consumer
    // beyond #recHeader above — e.g. Home's Create bar): any element
    // opting in via .scroll-collapse gets the same threshold/hysteresis
    // behavior, tracked independently via its own .scrolled class rather
    // than a shared boolean, so multiple collapsing elements can coexist.
    document.querySelectorAll('.scroll-collapse').forEach(chrome => {
      const scrolled = chrome.classList.contains('scrolled');
      if (!scrolled && top > 40) chrome.classList.add('scrolled');
      else if (scrolled && top < 10) chrome.classList.remove('scrolled');
    });
    recHeaderTicking = false;
  }, 16);
}
// Universal "tap top nav to scroll to top" (§4.2, locked) — every screen's
// wiring funnels here. `.tab-content.active` (§8.1 List/Detail) takes
// priority since a screen can have several scrollable tab panels at once;
// otherwise fall back to whichever single content element this screen
// registered via initSharedApp({contentSelector}) — e.g. `.home-body`,
// `.content` — never hardcode a selector here again, that's what broke it
// for Home originally (this function only ever knew about `.content`).
function scrollFormToTop() {
  const active = document.querySelector('.tab-content.active') || document.querySelector(activeContentSelector);
  if (active) active.scrollTo({ top: 0, behavior: 'smooth' });
}
function onRecHeaderTap() {
  const header = document.getElementById('recHeader');
  if (header && header.classList.contains('scrolled')) scrollFormToTop();
}
function onDescTap(event) {
  const header = document.getElementById('recHeader');
  if (header && header.classList.contains('scrolled')) return;
  event.stopPropagation();
  const span = document.getElementById('recDesc');
  const edit = document.getElementById('recDescEdit');
  edit.value = span.textContent;
  span.classList.add('hidden-while-editing');
  edit.classList.add('editing');
  autoGrow(edit);
  edit.focus();
  edit.setSelectionRange(edit.value.length, edit.value.length);
  const confirmBtn = document.getElementById('inlineConfirmBtn');
  if (confirmBtn) confirmBtn.classList.add('show');
}
function onDescBlur() {
  const span = document.getElementById('recDesc');
  const edit = document.getElementById('recDescEdit');
  span.textContent = edit.value;
  span.classList.remove('hidden-while-editing');
  edit.classList.remove('editing');
  const confirmBtn = document.getElementById('inlineConfirmBtn');
  if (confirmBtn) confirmBtn.classList.remove('show');
  showToast('Saved');
}
function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}
/* Free Form / Not Free Form status-header branch (§15.4). Redesigned
   2026-07-22: protected no longer disables the button or grays its
   colour (a status button that goes gray tells the technician nothing
   about the WO's actual state) — it stays tappable and keeps its real
   fill colour either way, just swaps the trailing chevron for a lock
   icon. The tap itself is handled by each screen's own onStatusBtnTap()
   wrapper (shows a toast instead of opening the status LOV when
   protected) — this function only owns the icon swap + tab-rail wash,
   not click behavior, since not every screen with a status button
   necessarily wires the same wrapper name. Also switches the tab-rail
   wash per §3.2.2 (purple for Free Form/Standard Record Views, Octave
   Yellow for Not Free Form WO workflows). */
const LOCK_ICON_SVG = '<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2.2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const CHEVRON_ICON_SVG = '<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function applyWorkflowTypeHeader(workflowType) {
  const btn = document.getElementById('recStatusBtn');
  const icon = document.getElementById('recStatusBtnIcon');
  const rail = document.getElementById('tabRail');
  const notFreeForm = workflowType === 'NOT_FREE_FORM';
  if (btn) btn.classList.toggle('st-protected', notFreeForm);
  if (icon) icon.innerHTML = notFreeForm ? LOCK_ICON_SVG : CHEVRON_ICON_SVG;
  if (rail) rail.classList.toggle('rail-not-free-form', notFreeForm);
}

/* ══════════════════════════════════════════════════════════════════════
   HEADER ACTIONS — pin + ellipsis (§5.3, Record View) / List/Detail menu
   (§8.1, every other tab)
   ══════════════════════════════════════════════════════════════════════ */
function toggleRecordPin() {
  const btn = document.getElementById('recPinBtn');
  const pinned = btn.classList.toggle('pinned');
  showToast(pinned ? 'Pinned' : 'Unpinned');
}
// Generic by id — every .rec-actions-menu-style dropdown (record header's,
// List/Detail's, Profile's, §4.3) shares this same open/close mechanism.
// toggleRecActionsMenu/closeRecActionsMenu/toggleListDetailMenu/
// closeListDetailMenu below are kept as named wrappers so every existing
// caller keeps working unchanged — only the outside-click handler and any
// *new* menu need to know about toggleActionsMenu/closeActionsMenu directly.
function toggleActionsMenu(id) { document.getElementById(id).classList.toggle('open'); }
function closeActionsMenu(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }
function toggleRecActionsMenu() { toggleActionsMenu('recActionsMenu'); }
function closeRecActionsMenu() { closeActionsMenu('recActionsMenu'); closeActionsMenu('listDetailMenu'); }
function toggleListDetailMenu() { toggleActionsMenu('listDetailMenu'); }
function closeListDetailMenu() { closeActionsMenu('listDetailMenu'); }
function toggleProfileMenu() { toggleActionsMenu('profileMenu'); }
function closeProfileMenu() { closeActionsMenu('profileMenu'); }
// Closes ANY open .rec-actions-menu on an outside click — generalized
// 2026-07-16 from two hardcoded ids to a class query so a third (or
// fourth) menu never needs another bespoke branch here again. The
// "don't close" safe zone is each menu's own trigger — .rec-header-actions
// (record header's pin+ellipsis) and .nav-avatar (Profile) so far.
function initHeaderMenuOutsideClick() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.rec-header-actions, .nav-avatar')) return;
    document.querySelectorAll('.rec-actions-menu.open').forEach(m => m.classList.remove('open'));
  });
}
function recCopyLink() { closeRecActionsMenu(); showToast('Link copied'); }
function recCopyRecord() { closeRecActionsMenu(); showToast('Copy — coming soon'); }
function recDeleteRecord() {
  closeRecActionsMenu();
  openConfirm('Are you sure you want to delete this record?', () => showToast('Record deleted'));
}
function onListDetailSearchTap() { toggleListDetailSearch(currentTab); }
/* D8/D9 (2026-07-16): a tab's own Plus doesn't always mean Insert Mode —
   the Comments/Documents tabs use it to add a comment/document directly.
   Screen-provided TAB_PLUS_HANDLERS = { tabKey: () => {...} } is checked
   first; falls back to Insert Mode (§9) for every tab that doesn't
   override it, unchanged from before. */
function onListDetailPlusTap() {
  if (typeof TAB_PLUS_HANDLERS !== 'undefined' && TAB_PLUS_HANDLERS[currentTab]) { TAB_PLUS_HANDLERS[currentTab](); return; }
  openInsertMode(currentTab);
}

/* ══════════════════════════════════════════════════════════════════════
   LIST SEARCH SCREEN STANDARD (§8.3, locked/unified 2026-07-20) — the
   generic card + all-fields table shared by WO List/Search and every
   child tab. A field is { label, value, type } where type is 'status' |
   'type' | 'org' | undefined. status/type fields also carry a resolved
   `color` (a CSS colour string) — this file never hardcodes a module's
   own value→colour table (§8.3); callers resolve that themselves and
   pass the already-picked colour in.
   ══════════════════════════════════════════════════════════════════════ */
function renderStdCard(fields) {
  const first6 = fields.slice(0, 6);
  const orgIdx = first6.findIndex(f => f.type === 'org');
  const org = orgIdx > -1 ? first6[orgIdx] : null;
  const body = first6.filter((f, i) => i !== orgIdx).slice(0, 5);
  const [head, sub, ...attrs] = body;
  // 'type' dropped 2026-07-22 (§23) — Type isn't one of the 3 colour
  // instruments (see Equipment's own EQUIP_TYPE_COLOR fix, same session).
  // Status keeps colour (it's a real instrument) but as a fill/outline
  // pill tier (.pill-green/.pill-red/.pill-outline), same vocabulary as
  // WO Record View's header status pill — never as tinted text, and only
  // ever as the headline (status is always field 1 in every real
  // consumer's data, so the old sub/attrs tinted-text branches were dead
  // code, removed along with Type's).
  let html = '<div class="ld-card">';
  html += '<div class="ld-card-top">';
  if (head) {
    html += head.type === 'status'
      ? `<span class="ld-card-headline pill pill-${head.tier}">${head.value}</span>`
      : `<div class="ld-card-headline">${head.value}</div>`;
  }
  if (org) html += `<span class="ld-card-org">${org.value}</span>`;
  html += '</div>';
  if (sub) html += `<div class="ld-card-subline">${sub.value}</div>`;
  if (attrs.length) {
    html += '<div class="ld-card-attrs">' + attrs.map(f => `
      <div class="ld-card-attr-row"><span class="field-label">${f.label}</span><span class="field-value">${f.value}</span></div>`).join('') + '</div>';
  }
  html += '</div>';
  return html;
}
function renderStdTable(rowsOfFields, rowOnclick) {
  if (!rowsOfFields.length) return '<div class="ld-table-empty"></div>';
  const labels = rowsOfFields[0].map(f => f.label);
  const onclickAttr = rowOnclick ? ` onclick="${rowOnclick.replace(/"/g, '&quot;')}"` : '';
  return `<div class="ld-table-wrap"><table class="ld-table"><thead><tr>${labels.map(l => `<th>${l}</th>`).join('')}</tr></thead><tbody>${
    rowsOfFields.map(fields => `<tr data-search="${fields.map(f => f.value).join(' ').toLowerCase()}"${onclickAttr}>${fields.map(f => f.type === 'status'
      ? `<td><span class="ld-table-pill pill-${f.tier}">${f.value}</span></td>`
      : `<td>${f.value}</td>`).join('')}</tr>`).join('')
  }</tbody></table></div>`;
}
/* Filter chips + sort options are dataspy-driven off the same field list
   the card uses (§8.3) — screen provides FIELD_DEFS[tabKey] = an ordered
   array of { key, label } describing the dataspy's first 6 columns (the
   same order/labels used to build each row's `fields`/`allFields`). No
   per-field-type exclusions — every one of the 6 gets a chip + a sort
   option, uniformly. */
function renderStdFilterChips(tabKey, fieldDefs) {
  const state = listDetailState[tabKey] || {};
  const active = state.filters || {};
  return fieldDefs.map(f => `
    <button class="filter-chip ${active[f.key] ? 'active' : ''}" onclick="showToast('${f.label} filter — coming soon')">${f.label}${active[f.key] ? ` <span class="chip-count">${active[f.key]}</span>` : ''}</button>`).join('');
}

/* ══════════════════════════════════════════════════════════════════════
   LIST/DETAIL CONTENT SHELL (§8.2/§8.3) — screen provides:
     LIST_DETAIL_TABS = { tabKey: { label, sortLabel, dataspies:[{key,name}],
       fieldDefs:[{key,label}], rows:[{ds:[...], fields:[{label,value,type,color}], allFields:[...]}] } }
   `fields` = the first-6 ordered set the card/table-header draw from;
   `allFields` = every field on the dataspy, for List mode's all-fields
   table (§8.3) — omit to just reuse `fields` if a tab has no extra columns.
   Config-driven; swap only the data per tab, never re-derive this markup.
   ══════════════════════════════════════════════════════════════════════ */
const LD_ICONS = {
  database: '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>',
  sort: '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="4" y1="12" x2="11" y2="12"/><line x1="4" y1="18" x2="8" y2="18"/><path d="M17 4v16m0 0l3-3m-3 3l-3-3"/></svg>',
  search: '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  x: '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  star: '<svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 18.27l-6.18 3.24L7 14.63l-5-4.87 6.91-1L12 2.5z"/></svg>',
};
let listDetailState = {};
let favoriteDataspies = {};
function renderListDetailShell(tabKey, extraTopHtml) {
  const cfg = LIST_DETAIL_TABS[tabKey];
  const state = listDetailState[tabKey] || {};
  const dsKey = state.dataspy || cfg.dataspies[0].key;
  const mode = state.mode || 'detailed';
  const ds = cfg.dataspies.find(d => d.key === dsKey) || cfg.dataspies[0];
  const rows = cfg.rows.filter(r => r.ds.includes(dsKey));
  return `
    ${extraTopHtml || ''}
    ${state.searchOpen ? `
    <div class="ld-search-bar">
      ${LD_ICONS.search}
      <input class="ld-search-input" type="text" placeholder="Search ${cfg.label}" value="${(state.search||'').replace(/"/g,'&quot;')}" oninput="onListDetailSearchInput('${tabKey}', this.value)" autocomplete="off">
      <button class="ld-search-close" onclick="toggleListDetailSearch('${tabKey}')" aria-label="Close search">${LD_ICONS.x}</button>
    </div>
    ${cfg.fieldDefs ? `<div class="filter-chip-row">${renderStdFilterChips(tabKey, cfg.fieldDefs)}</div>` : ''}` : ''}
    <div class="ds-bar" onclick="openDataspySheet('${tabKey}')">
      <div class="ds-icon-w">${LD_ICONS.database}</div>
      <div class="ds-body"><div class="ds-name">${ds.name}</div></div>
      <svg class="ds-chevron" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="mode-tog">
      <button class="mode-btn ${mode==='detailed'?'active':''}" onclick="setListDetailMode('${tabKey}','detailed')">Detailed</button>
      <button class="mode-btn ${mode==='list'?'active':''}" onclick="setListDetailMode('${tabKey}','list')">List</button>
    </div>
    <div class="res-row">
      <span class="res-count">${rows.length} record${rows.length===1?'':'s'}</span>
      <button class="sort-btn" onclick="showToast('Sort — coming soon')">${LD_ICONS.sort}${cfg.sortLabel}</button>
    </div>
    ${mode === 'detailed'
      ? rows.map(r => r.fields ? `<div class="ld-card-wrap" data-search="${r.fields.map(f => f.value).join(' ').toLowerCase()}" onclick="showToast('Opens this record in Update Mode — code/PK protected there (coming soon)')">${renderStdCard(r.fields)}</div>` : '').join('')
      : renderStdTable(rows.map(r => r.allFields || r.fields), "showToast('Opens this record in Update Mode — code/PK protected there (coming soon)')")}
    <div style="height:16px;"></div>`;
}
let activeDataspyTabKey = null;
function openDataspySheet(tabKey) {
  activeDataspyTabKey = tabKey;
  const cfg = LIST_DETAIL_TABS[tabKey];
  const current = (listDetailState[tabKey] && listDetailState[tabKey].dataspy) || cfg.dataspies[0].key;
  const sorted = [...cfg.dataspies].sort((a, b) => (favoriteDataspies[b.key] ? 1 : 0) - (favoriteDataspies[a.key] ? 1 : 0));
  document.getElementById('dataspySheetBody').innerHTML = sorted.map(d => `
    <div class="lov-option ${d.key===current?'selected':''}">
      <button class="ds-fav-star ${favoriteDataspies[d.key] ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleFavoriteDataspy('${tabKey}','${d.key}')" aria-label="Favorite">${LD_ICONS.star}</button>
      <div class="lov-option-texts" onclick="selectDataspy('${d.key}')"><div class="lov-option-desc">${d.name}</div></div>
      <div class="lov-check ${d.key===current?'checked':''}" onclick="selectDataspy('${d.key}')"></div>
    </div>`).join('');
  openSheet('dataspySheet');
}
function toggleFavoriteDataspy(tabKey, key) {
  favoriteDataspies[key] = !favoriteDataspies[key];
  openDataspySheet(tabKey);
}
function selectDataspy(key) {
  listDetailState[activeDataspyTabKey] = listDetailState[activeDataspyTabKey] || {};
  listDetailState[activeDataspyTabKey].dataspy = key;
  closeAllSheets();
  renderActiveTabContent();
}
function setListDetailMode(tabKey, mode) {
  listDetailState[tabKey] = listDetailState[tabKey] || {};
  listDetailState[tabKey].mode = mode;
  renderActiveTabContent();
}
function toggleListDetailSearch(tabKey) {
  listDetailState[tabKey] = listDetailState[tabKey] || {};
  listDetailState[tabKey].searchOpen = !listDetailState[tabKey].searchOpen;
  if (!listDetailState[tabKey].searchOpen) listDetailState[tabKey].search = '';
  renderActiveTabContent();
  const searchBtn = document.getElementById('listDetailSearchBtn');
  if (searchBtn && tabKey === currentTab) searchBtn.classList.toggle('active', listDetailState[tabKey].searchOpen);
  if (listDetailState[tabKey].searchOpen) {
    const input = document.querySelector(`.tab-content[data-tab="${tabKey}"] .ld-search-input`);
    if (input) input.focus();
  }
}
function onListDetailSearchInput(tabKey, value) {
  listDetailState[tabKey] = listDetailState[tabKey] || {};
  listDetailState[tabKey].search = value;
  const q = value.trim().toLowerCase();
  document.querySelectorAll(`.tab-content[data-tab="${tabKey}"] .ld-card-wrap, .tab-content[data-tab="${tabKey}"] .ld-table tbody tr`).forEach(row => {
    row.classList.toggle('filtered-out', q.length > 0 && !(row.dataset.search || '').includes(q));
  });
}

/* ══════════════════════════════════════════════════════════════════════
   INSERT MODE (§9.1–§9.3) — full-screen sheet, swipe-to-dismiss.
   updateInsertSaveGate/saveInsertRecord are intentionally thin here since
   which field(s) gate Save is screen-specific — override both in the
   screen's own script if the default (gate on LOV_CURRENT.insertPriority)
   doesn't apply.
   ══════════════════════════════════════════════════════════════════════ */
function openInsertMode() {
  document.getElementById('insertModeSheet').classList.add('open');
  updateInsertSaveGate();
}
function closeInsertMode() { document.getElementById('insertModeSheet').classList.remove('open'); }
// §9.2 "After Save" (locked 2026-07-16, built 2026-07-20) — hand off a
// freshly-created record to its own Record View via sessionStorage + a
// `?new=1` query flag (not URL-encoded fields — keeps Comments/long
// Description text out of the visible URL). Two real callers: WO List's
// own Create, Home's Create for either entity — both target the *same*
// storage key + query param a given Record View screen reads, regardless
// of which entry point created the record.
function navigateToNewRecord(url, storageKey, record) {
  sessionStorage.setItem(storageKey, JSON.stringify(record));
  location.href = url;
}

/* ══════════════════════════════════════════════════════════════════════
   HYPERLINKED POPUP — full-screen slide-up sheet for viewing/editing a
   record reached via a "link" tap (e.g. WO Record View's Equipment card,
   §14/§15). Generic open/close by id, same reusable-by-id pattern as the
   LOV sheet; each screen defines its own popup markup + content-
   population function, keyed by whatever id it gives the popup.
   ══════════════════════════════════════════════════════════════════════ */
function openHyperlinkPopup(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeHyperlinkPopup(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ══════════════════════════════════════════════════════════════════════
   SYNC STATUS SYSTEM (§4.4/§4.5, built 2026-07-20) — demo outbox data +
   behavior shared by the sync panel (any screen's sync icon) and the
   full Sync Status Screen (eam-sync-status-prototype-v1.html), the 2nd
   real consumer that promoted this out of screen-local. `let`, not
   `const` — delete/retry mutate this array in place so both consumers
   stay in sync without a re-fetch.
   Item shape: { id, entity, recordLabel, sub, timestamp, state
   ('error'|'queued'), errorMessage (a general server message, or null —
   there is no field-level variant; real server responses never returned
   which field caused a rejection, only whether one occurred and
   sometimes a general message, see design-decisions-v3-1.md §4.5),
   protection (null|'locked-workflow'|'readonly'|'delete-only'|
   'delete-from-end'), openUrl, newRecord ({storageKey, record}, only for
   a not-yet-synced local record — see openSyncErrorRecord below),
   sequenceGroup/sequenceOrder (only for 'delete-from-end' items).
   Reduced to 2 error items 2026-07-22 (was 8) — just enough to demo the
   two real shapes left once field-level detail was removed: a not-yet-
   synced local record, and a synced record with no further detail
   given. The 4 items that only existed to demo transaction-type
   protections (readonly/delete-only/delete-from-end) were removed along
   with them — that mechanism is untouched in the code (§4.5), just
   currently undemoed; add a row back here if it needs exercising again. ══ */
let SYNC_DEMO_ITEMS = [
  { id: 'wo-local-insert', entity: 'Work Order', recordLabel: 'WO (not yet synced)', sub: 'Handrail corrosion — Bay 4',
    timestamp: '2:14 PM', state: 'error', protection: null, errorMessage: null,
    openUrl: 'eam-wo-record-view-prototype-v1.html',
    newRecord: { storageKey: 'eamNewWoRecord', record: {
      number: '(new)', desc: 'Handrail corrosion — Bay 4',
      department: { code: '', desc: '' },
      assignedTo: { code: 'BCAMPBELL', desc: 'Bruce Campbell' },
      reportedBy: { code: 'DKILBURN', desc: 'Danny Kilburn' },
      dateReported: '2026-07-20',
      problemCode: { code: 'MECH', desc: 'Mechanical' },
      type: { code: 'CM', desc: 'Corrective Maintenance' },
      priority: { code: 'MEDIUM', desc: 'Medium' },
    } } },
  { id: 'wo-19257-nodetail', entity: 'Work Order', recordLabel: 'WO 19257', sub: 'Pump Cavitating; lost head',
    timestamp: '2:11 PM', state: 'error', protection: null, errorMessage: null,
    openUrl: 'eam-wo-record-view-prototype-v1.html' },
  { id: 'parts-return-19257', entity: 'Issue Parts', recordLabel: 'Return — WO 19257', sub: 'Awaiting connection',
    timestamp: '2:16 PM', state: 'queued', protection: null, errorMessage: null, openUrl: null },
  { id: 'labor-correction-19257', entity: 'Labor', recordLabel: 'Correction — WO 19257', sub: 'Awaiting connection',
    timestamp: '2:17 PM', state: 'queued', protection: null, errorMessage: null, openUrl: null },
];
/* Persisted across navigation (added 2026-07-22) — same "resets on every
   screen load" problem theme/DEMO_WO had, but this one has no manual
   reset control: the reset affordance is logging in again
   (resetSyncDemoState() below, called from eam-login-prototype-v1.html's
   startLogin()), matching how a real app would re-sync on a fresh
   session rather than adding demo-only UI chrome. */
(function () {
  const saved = localStorage.getItem('eamSyncItems');
  if (saved) { try { SYNC_DEMO_ITEMS = JSON.parse(saved); } catch (e) {} }
})();
function persistSyncItems() { localStorage.setItem('eamSyncItems', JSON.stringify(SYNC_DEMO_ITEMS)); }
/* Reset affordance — clears persisted sync state so the next load falls
   back to this file's own hardcoded seed above (2 errors, offline).
   Deliberately does NOT touch 'eamTheme' — theme is a real user
   preference, not demo progress, and should survive a fresh login same
   as it survives navigation. */
function resetSyncDemoState() {
  localStorage.removeItem('eamSyncItems');
  localStorage.removeItem('eamSyncOnline');
}
function syncErrorTierText(item) {
  if (item.errorMessage) return item.errorMessage;
  return 'Server rejected this change — no further detail available.';
}
// Four states, not five (§4.4.1, revised 2026-07-21) — Pending was dropped
// as its own icon state because it and Syncing described the same event
// (a backlog going out after reconnecting) with no observable difference
// to a technician; that backlog now reads as Offline (no connection) or
// Syncing (connected, working through it), decided by DEMO_ONLINE alone.
function syncOverallState(items) {
  if (items.some(i => i.state === 'error')) return 'error';
  if (items.length) return DEMO_ONLINE ? 'syncing' : 'offline';
  return 'synced';
}
/* ── Sync control (§4.4.1, adaptive icon/pill) — the nav-bar sync button
   every screen shows. Synced renders a plain small icon-only circle
   (.sync-ctrl-dot); Offline/Syncing/Error render a labeled pill
   (.sync-ctrl-pill) so they're legible without opening the panel. A
   screen opts in with an empty <span id="syncCtrl"> in its .nav-actions —
   initSharedApp() calls this automatically, so that's the only markup a
   screen needs; nothing to wire by hand. Re-run after anything that
   mutates SYNC_DEMO_ITEMS/DEMO_ONLINE (toggleDemoOnline, deleteSyncItem,
   retrySyncItem, retryFromBanner all do) so an already-open screen's
   control never goes stale. ── */
const SYNC_ICONS = {
  synced: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 01-.4-8.98A5.5 5.5 0 0117 8.5a4 4 0 011 7.87H7z"/><polyline points="9,15 11,17 15,12.5"/></svg>',
  syncing: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12a8 8 0 0114-5.2M20 12a8 8 0 01-14 5.2"/><path d="M16 7l2-2-2-2M8 17l-2 2 2 2" stroke-linejoin="round"/></svg>',
  offline: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 01-.4-8.98A5.5 5.5 0 0117 8.5"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
  error: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 16.5h.01M10.3 3.9L2.7 17a1.8 1.8 0 001.5 2.7h15.6a1.8 1.8 0 001.5-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z"/></svg>',
};
const SYNC_LABELS = { syncing: 'Syncing', offline: 'Offline', error: 'Error' };
function renderSyncControl() {
  const el = document.getElementById('syncCtrl');
  if (!el) return;
  const state = syncOverallState(SYNC_DEMO_ITEMS);
  if (state === 'synced') {
    el.innerHTML = `<button class="sync-ctrl-dot" title="Sync status: Synced" onclick="event.stopPropagation();openSyncPanel()">${SYNC_ICONS.synced}</button>`;
    return;
  }
  el.innerHTML = `<button class="sync-ctrl-pill state-${state}" title="Sync status: ${SYNC_LABELS[state]}" onclick="event.stopPropagation();openSyncPanel()">${SYNC_ICONS[state]}<span class="sync-ctrl-label">${SYNC_LABELS[state]}</span></button>`;
}
/* Bottom-nav Notifications badge (§25, 2026-07-22) — shared the moment it
   had its 2nd real consumer (Home + WO List both load data/notifications.js
   just for this count; the Notifications screen itself renders its own
   count the same way via this same function). No-ops if either the badge
   element or EAM_NOTIFICATIONS isn't present, same defensive pattern as
   CURRENT_USER_NAME elsewhere in this file — a screen that hasn't loaded
   data/notifications.js just shows no badge instead of erroring. */
function updateNotifBadge() {
  const el = document.getElementById('notifBadge');
  if (!el || typeof EAM_NOTIFICATIONS === 'undefined') return;
  const count = EAM_NOTIFICATIONS.filter(n => !n.read).length;
  el.textContent = count;
  el.style.display = count > 0 ? '' : 'none';
}
/* Only the last (highest sequenceOrder still present) item in a
   sequenceGroup may be deleted — legacy Transaction Log's Start/Stop
   labor rule (§4.5). Non-sequenced items are always eligible. */
function syncItemDeletable(item) {
  if (item.protection !== 'delete-from-end') return true;
  const siblings = SYNC_DEMO_ITEMS.filter(i => i.sequenceGroup === item.sequenceGroup);
  const maxOrder = Math.max(...siblings.map(i => i.sequenceOrder));
  return item.sequenceOrder === maxOrder;
}
function openSyncErrorRecord(item) {
  if (item.protection === 'readonly') { showToast('This type of transaction cannot be modified here'); return; }
  if (item.protection === 'delete-only') { showToast('This type of transaction cannot be modified here'); return; }
  if (item.protection === 'locked-workflow') { showToast("Status is protected — this Work Order's workflow is Started"); return; }
  // Always set context, even for a tier-3 item with no fields/message of
  // its own (bug fix, 2026-07-20) — syncErrorTierText() already supplies
  // the generic fallback, so the banner must never silently skip showing
  // just because there was nothing more specific to say.
  sessionStorage.setItem('eamSyncErrorContext', JSON.stringify({ itemId: item.id, message: syncErrorTierText(item) }));
  // Lets navBack() on the record view send the technician back to this
  // review flow instead of wherever it defaults to otherwise (§4.5,
  // 2026-07-20) — consumed once, same lifetime as eamSyncErrorContext.
  sessionStorage.setItem('eamSyncReturnUrl', 'eam-sync-status-prototype-v1.html');
  if (item.newRecord) navigateToNewRecord(item.openUrl, item.newRecord.storageKey, item.newRecord.record);
  else location.href = item.openUrl;
}
function deleteSyncItem(id, onDone) {
  const item = SYNC_DEMO_ITEMS.find(i => i.id === id);
  if (!item) return;
  if (!syncItemDeletable(item)) {
    showToast('This transaction cannot be deleted because a later transaction depends on it.');
    return;
  }
  openConfirm('By deleting this transaction, your changes will not be uploaded to the server. You’ll need to redo this from the source screen.', () => {
    SYNC_DEMO_ITEMS = SYNC_DEMO_ITEMS.filter(i => i.id !== id);
    persistSyncItems();
    showToast('Transaction discarded');
    renderSyncControl();
    if (onDone) onDone();
  }, 'Discard');
}
// Same online/offline resolution as retryFromBanner() — this is the
// Retry button's OTHER surface (the sync panel's pending rows, and the
// Sync Status Screen's own card list). Always attempts now (the field-
// level gate is gone along with field-level detail itself, §4.5).
function retrySyncItem(id) {
  const item = SYNC_DEMO_ITEMS.find(i => i.id === id);
  if (!item) return;
  if (!DEMO_ONLINE) {
    showToast('Retry queued — will attempt again once back online');
    return;
  }
  showToast('Retrying…');
  setTimeout(() => {
    SYNC_DEMO_ITEMS = SYNC_DEMO_ITEMS.filter(i => i.id !== id);
    persistSyncItems();
    showToast('Synced');
    renderSyncControl();
    if (typeof renderSyncStatusScreen === 'function') renderSyncStatusScreen();
    if (document.getElementById('syncPanelList')) openSyncPanel();
  }, 900);
}
/* ── Sync panel (§4.4.2) — bottom sheet, reuses .bottom-sheet/#sheetOverlay
   (§3.4). Screen must include #syncPanelSheet markup (see
   eam-home-screen-prototype-v1.html) for openSheet() to find. ── */
function openSyncPanel() {
  const errorItems = SYNC_DEMO_ITEMS.filter(i => i.state === 'error');
  const queuedItems = SYNC_DEMO_ITEMS.filter(i => i.state === 'queued');
  const state = syncOverallState(SYNC_DEMO_ITEMS);
  const stateLabelEl = document.getElementById('syncPanelStateLabel');
  if (stateLabelEl) {
    stateLabelEl.className = 'sync-panel-state state-' + state;
    stateLabelEl.textContent = errorItems.length
      ? `${errorItems.length} item${errorItems.length === 1 ? '' : 's'} need attention`
      : state === 'offline' ? `Offline — ${queuedItems.length} item${queuedItems.length === 1 ? '' : 's'} queued`
      : state === 'syncing' ? `Syncing ${queuedItems.length} item${queuedItems.length === 1 ? '' : 's'}…`
      : 'Synced · outbox empty';
  }
  const listEl = document.getElementById('syncPanelList');
  if (listEl) {
    const row = (i, dotClass, action) => `
      <div class="sync-item-row">
        <span class="sync-item-dot ${dotClass}"></span>
        <div class="sync-item-info">
          <div class="sync-item-name">${i.recordLabel}</div>
          <div class="sync-item-meta">${i.entity} · ${i.timestamp}</div>
        </div>
        ${action}
      </div>`;
    let html = '';
    if (errorItems.length) {
      html += '<div class="sync-panel-section-label">Needs Attention</div>';
      html += errorItems.map(i => row(i, 'error', `<button class="sync-item-action" onclick="reviewSyncItem('${i.id}')">Review</button>`)).join('');
    }
    if (queuedItems.length) {
      html += '<div class="sync-panel-section-label">Queued</div>';
      html += queuedItems.map(i => row(i, 'queued', `<button class="sync-item-action" onclick="retrySyncItem('${i.id}')">Retry</button>`)).join('');
    }
    listEl.innerHTML = html || `<div class="sync-panel-empty">No Transactions</div>`;
  }
  const hydrateEl = document.getElementById('syncPanelHydrate');
  if (hydrateEl) {
    hydrateEl.innerHTML = [
      ['Today’s WOs', 100], ['Site assets', 100], ['Lookup tables', 100], ['Historical docs', 62],
    ].map(([label, pct]) => `
      <div class="sync-hydrate-row">
        <div class="sync-hydrate-label"><span>${label}</span><span>${pct}%</span></div>
        <div class="sync-hydrate-track"><div class="sync-hydrate-fill" style="width:${pct}%"></div></div>
      </div>`).join('');
  }
  openSheet('syncPanelSheet');
}
function reviewSyncItem(id) {
  sessionStorage.setItem('eamSyncFocusItem', id);
  location.href = 'eam-sync-status-prototype-v1.html';
}

/* ── Demo connectivity toggle (2026-07-20) — this app has no real backend
   in prototype form, so "online" is a flag a reviewer flips by hand to
   see both Retry outcomes (§4.5): queued-while-offline vs. attempts-now-
   and-succeeds. Defaults false — the whole outbox/error premise is that
   the technician was offline when these were queued. ── */
let DEMO_ONLINE = false;
// Restored the same way as SYNC_DEMO_ITEMS above (separate IIFE since
// DEMO_ONLINE isn't declared yet at that point in the file — let's TDZ
// would throw if this ran any earlier).
(function () {
  const saved = localStorage.getItem('eamSyncOnline');
  if (saved !== null) DEMO_ONLINE = saved === 'true';
})();
function toggleDemoOnline() {
  DEMO_ONLINE = !DEMO_ONLINE;
  localStorage.setItem('eamSyncOnline', String(DEMO_ONLINE));
  const btn = document.getElementById('onlineToggle');
  if (btn) btn.textContent = DEMO_ONLINE ? '🌐 Online' : '🌐 Offline';
  renderSyncControl();
}
function initDemoOnlineToggle() {
  const btn = document.getElementById('onlineToggle');
  if (btn) btn.textContent = DEMO_ONLINE ? '🌐 Online' : '🌐 Offline';
}

/* ── Sync error banner (§4.5, simplified 2026-07-22 — field-level detail
   removed, see design-decisions-v3-1.md §4.5 for why) — a Record View
   opts in by including an empty #syncErrorBanner container near the top
   of its content and calling applySyncErrorBanner() once on load.
   Consume-once from sessionStorage, same pattern as
   navigateToNewRecord()'s handoff. SYNC_ERROR_ACTIVE is the live
   in-memory version of that same context — status starts 'error' and
   moves to 'pending'/'synced' via retryFromBanner() below. No more
   per-field tracking: real server responses never returned which field
   caused a rejection, only whether one occurred and (sometimes) a
   general message — so there was never a real "which field" to flag,
   scroll to, or clear. This banner is now the only shape: a general
   message (or the generic fallback) and an always-available Retry. ── */
let SYNC_ERROR_ACTIVE = null;
function applySyncErrorBanner() {
  const raw = sessionStorage.getItem('eamSyncErrorContext');
  if (!raw) {
    // Not opened via the sync review flow — eamSyncReturnUrl (if any) is
    // stale from an earlier visit and would otherwise wrongly redirect a
    // normal Back tap to the Sync Status Screen (bug fix, 2026-07-20).
    sessionStorage.removeItem('eamSyncReturnUrl');
    return;
  }
  sessionStorage.removeItem('eamSyncErrorContext');
  const ctx = JSON.parse(raw);
  SYNC_ERROR_ACTIVE = { itemId: ctx.itemId, status: 'error', message: ctx.message };
  renderSyncBanner();
}
function renderSyncBanner() {
  const banner = document.getElementById('syncErrorBanner');
  if (!banner) return;
  const s = SYNC_ERROR_ACTIVE;
  if (!s) { banner.className = 'sync-error-banner'; banner.innerHTML = ''; return; }
  banner.className = 'sync-error-banner show state-' + s.status;
  if (s.status === 'synced') {
    banner.innerHTML = `
      <div class="sync-error-banner-head">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
        <span>Synced</span>
      </div>`;
    return;
  }
  if (s.status === 'pending') {
    banner.innerHTML = `
      <div class="sync-error-banner-head">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0114-5.2M20 12a8 8 0 01-14 5.2" /><path d="M16 7l2-2-2-2M8 17l-2 2 2 2" stroke-linejoin="round"/></svg>
        <span>Retry queued</span>
      </div>
      <div class="sync-error-banner-msg">Will attempt again once you’re back online.</div>`;
    return;
  }
  banner.innerHTML = `
    <div class="sync-error-banner-head">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M12 9v4M12 16.5h.01M10.3 3.9L2.7 17a1.8 1.8 0 001.5 2.7h15.6a1.8 1.8 0 001.5-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>Didn’t sync</span>
    </div>
    <div class="sync-error-banner-msg">${s.message}</div>
    <div class="sync-card-actions">
      <button class="sync-card-btn ready" onclick="retryFromBanner()">Retry</button>
      <button class="sync-card-btn danger" onclick="discardFromBanner()">Discard</button>
    </div>`;
}
/* Retry from the banner itself — the ask this responds to (2026-07-20):
   give the technician a way to re-attempt without leaving the record to
   go find the item in the Sync Status Screen again. Always available now
   (the 2026-07-20 "protected until the flagged field clears" gate is
   gone along with field-level detail itself, §4.5) — offline queues
   (matches the panel's own queued language), online always resolves. */
function retryFromBanner() {
  if (!SYNC_ERROR_ACTIVE) return;
  if (!DEMO_ONLINE) {
    SYNC_ERROR_ACTIVE.status = 'pending';
    renderSyncBanner();
    showToast('Retry queued — will attempt again once back online');
    return;
  }
  SYNC_ERROR_ACTIVE.status = 'pending';
  renderSyncBanner();
  setTimeout(() => {
    if (!SYNC_ERROR_ACTIVE) return;
    SYNC_ERROR_ACTIVE.status = 'synced';
    renderSyncBanner();
    SYNC_DEMO_ITEMS = SYNC_DEMO_ITEMS.filter(i => i.id !== SYNC_ERROR_ACTIVE.itemId);
    persistSyncItems();
    renderSyncControl();
    showToast('Synced');
  }, 900);
}
// Discard from the banner — deliberately NOT gated on outstanding fields
// (the technician can always give up on a queued change, fixed or not).
// Reuses deleteSyncItem() verbatim — same confirm copy, same danger
// label, same delete-from-end check — so Discard behaves identically
// whether it's tapped here or from a Sync Status Screen card.
function discardFromBanner() {
  if (!SYNC_ERROR_ACTIVE) return;
  deleteSyncItem(SYNC_ERROR_ACTIVE.itemId, () => {
    SYNC_ERROR_ACTIVE = null;
    renderSyncBanner();
  });
}
function updateInsertSaveGate() {
  const btn = document.getElementById('insertSaveBtn');
  if (!btn) return;
  btn.classList.toggle('ready', !!(typeof LOV_CURRENT !== 'undefined' && LOV_CURRENT.insertPriority));
}
function saveInsertRecord() {
  if (typeof LOV_CURRENT !== 'undefined' && !LOV_CURRENT.insertPriority) { showToast('Priority is required'); return; }
  closeInsertMode();
  showToast('Record created — coming soon', '✓');
}
let insertDragStartY = null, insertDragDelta = 0;
function insertDragStart(e) {
  insertDragStartY = (e.touches ? e.touches[0].clientY : e.clientY);
  document.getElementById('insertModeSheet').classList.add('dragging');
}
function insertDragMove(e) {
  if (insertDragStartY === null) return;
  const y = (e.touches ? e.touches[0].clientY : e.clientY);
  insertDragDelta = Math.max(0, y - insertDragStartY);
  document.getElementById('insertModeSheet').style.transform = `translateY(${insertDragDelta}px)`;
}
function insertDragEnd() {
  if (insertDragStartY === null) return;
  const sheet = document.getElementById('insertModeSheet');
  sheet.classList.remove('dragging');
  sheet.style.transform = '';
  insertDragStartY = null;
  if (insertDragDelta > 120) closeInsertMode();
  insertDragDelta = 0;
}
function initInsertModeDrag() {
  const handle = document.getElementById('insertModeHandle');
  if (!handle) return;
  handle.addEventListener('pointerdown', insertDragStart);
  document.addEventListener('pointermove', insertDragMove);
  document.addEventListener('pointerup', insertDragEnd);
}

/* ══════════════════════════════════════════════════════════════════════
   REQUIRED / CLEAR VISIBILITY (§3.4) — Clear hides when required OR empty.
   ══════════════════════════════════════════════════════════════════════ */
function isRequiredField(key) {
  if (typeof ALWAYS_REQUIRED_LOVS !== 'undefined' && ALWAYS_REQUIRED_LOVS.has(key)) return true;
  const el = document.querySelector(`[data-field="${key}"]`);
  return !!el && el.classList.contains('required');
}
function fieldIsEmpty(el) {
  return !el || el.classList.contains('muted') || el.textContent.trim() === '';
}
function shouldHideClear(key, el) {
  // Pills (§9.3, locked 2026-07-16) are always system-defaulted and never
  // shown without a value — there's no "Clear" action for one, decoupled
  // from whether it's also .required (pills don't carry that marker at
  // all, see eam-shared.css — but Clear still needs its own check here,
  // independent of that removed marker).
  if (typeof ORG_STYLE_LOVS !== 'undefined' && ORG_STYLE_LOVS.has(key)) return true;
  return isRequiredField(key) || fieldIsEmpty(el);
}

/* ══════════════════════════════════════════════════════════════════════
   REQUIRED-FIELD-COUNT CONTAINER INDICATORS (§5.2, 2026-07-16; revised
   2026-07-20) — a .fg-section or .section-card whose header (.fg-toggle-
   row / .section-card-header) contains at least one required field shows
   a small orange count badge there, always — not just while incomplete.
   Required fields can never be cleared back to empty once populated
   (§3.4's Clear-visibility rule hides Clear for required fields), so a
   "still empty" badge that disappears on fill can never reappear either —
   it was a one-way indicator masquerading as a live one. The badge is now
   a static "this container has N required fields" count, not a
   completion tracker. Call updateRequiredBadges() after any save/select/
   clear/blur (already wired into every such function in this file) — no
   screen-specific config needed.
   ══════════════════════════════════════════════════════════════════════ */
function updateRequiredBadges() {
  document.querySelectorAll('.fg-section, .section-card').forEach(container => {
    const header = container.querySelector(':scope > .fg-toggle-row, :scope > .section-card-header');
    if (!header) return;
    const requiredFields = container.querySelectorAll('.form-field.required');
    let badge = header.querySelector('.required-count-badge');
    if (!requiredFields.length) { if (badge) badge.remove(); return; }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'required-count-badge';
      // Insert before the chevron, not after — the chevron's own
      // position must stay fixed (all containers' chevrons line up in
      // one column) regardless of whether a badge is present; the badge
      // sits on the inside, next to the title, not past the chevron.
      const chev = header.querySelector('.fg-chev');
      if (chev) header.insertBefore(badge, chev); else header.appendChild(badge);
    }
    badge.textContent = requiredFields.length;
  });
}

/* ══════════════════════════════════════════════════════════════════════
   LOV SHEET (§3.4/§3.4.1) — screen provides:
     LOV_DATA = { key: [{code,desc}, ...] }
     LOV_CURRENT = { key: 'CODE' }
     LOV_TITLES = { key: 'Sheet title' }               (optional, falls back to field label)
     ORG_STYLE_LOVS = new Set([...])                   (§3.4.1 — code only, no description; Organization only)
     NO_SEARCH_LOVS = new Set([...])                   (short fixed dropdowns)
     BADGE_LOV_META = { key: <meta map keyed by code, e.g. TYPE_META> }
     ALWAYS_REQUIRED_LOVS = new Set([...])             (optional; e.g. status/type/priority pairs that are always required)
   Every plain LOV field (i.e. not Org-style, not badge/dropdown-style)
   shows code + description, always (§3.4, reversed 2026-07-16 — was
   description-only by default with a short opt-in exception list;
   CODE_VISIBLE_FIELDS is retired, see design-decisions-v3-1.md §21).
   Status/Type/Priority are a separate, always-on carve-out from that
   default (§3.4, fixed 2026-07-16 — the BADGE_LOV_META/__status checks
   only intercept how the *selected value* renders on the field row
   afterward, in selectLov() below; the picker list itself was still
   falling through to the generic code+description branch here, a real
   bug, not by design) — openLov() below checks isSystemCode explicitly so
   the description-only rule can't silently regress. ══ */
// Outline by default, red-filled only for a meta entry explicitly flagged
// `critical:true` (palette pass, 2026-07-22 — was an inline colored
// background per meta entry; see .attr-badge-outline/.attr-badge-critical
// in eam-shared.css). Screens whose own meta maps don't set `critical` on
// anything simply always render the outline variant — no code color left.
function renderColorBadge(meta) {
  return meta ? `<span class="attr-badge${meta.critical ? ' attr-badge-critical' : ' attr-badge-outline'}">${meta.icon}</span>` : `<span class="attr-badge attr-badge-outline"></span>`;
}
let activeLovKey = null;
function openLov(key) {
  activeLovKey = key;
  const labelEl = document.querySelector(`[data-field="${key}"] .field-label`);
  document.getElementById('lovSheetTitle').textContent = (typeof LOV_TITLES !== 'undefined' && LOV_TITLES[key]) || (labelEl ? labelEl.textContent : key);
  document.getElementById('lovClearBtn').classList.toggle('hidden', shouldHideClear(key, document.getElementById(`fv-${key}-desc`)));
  document.getElementById('lovSearchInput').value = '';
  document.getElementById('lovSearchRow').classList.toggle('hidden', typeof NO_SEARCH_LOVS !== 'undefined' && NO_SEARCH_LOVS.has(key));
  const current = LOV_CURRENT[key];
  // Status/Type/Priority are system codes — always description-only, never
  // code+description, in the picker list (design-decisions-v3-1.md §3.4).
  // The opposite carve-out from ORG_STYLE_LOVS (code-only, no description).
  const isSystemCode = key === '__status' || (typeof BADGE_LOV_META !== 'undefined' && BADGE_LOV_META[key]);
  document.getElementById('lovSheetBody').innerHTML = LOV_DATA[key].map(opt => `
    <div class="lov-option ${opt.code===current?'selected':''}" data-search="${(opt.desc+' '+opt.code).toLowerCase()}" onclick="selectLov('${opt.code}','${opt.desc.replace(/'/g,"\\'")}')">
      <div class="lov-option-texts">
        <div class="lov-option-desc">${opt.desc}</div>
        ${(opt.code && !isSystemCode) ? `<div class="lov-option-code">${opt.code}</div>` : ''}
      </div>
      <div class="lov-check ${opt.code===current?'checked':''}"></div>
    </div>`).join('');
  openSheet('lovSheet');
}
function filterLovOptions(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll('#lovSheetBody .lov-option').forEach(opt => {
    opt.classList.toggle('filtered-out', q && !opt.dataset.search.includes(q));
  });
}
// Optional screen-provided hook for a field whose selection must do more
// than update its own row (§5.2 "Class-driven attribute sections" — e.g.
// Equipment's Class field shows/hides the Pump Information group). Runs
// after every branch below, keyed by field name:
//   const LOV_ON_SELECT = { class: () => updateClassAttributesVisibility() };
function runLovOnSelectHook(key) {
  if (typeof LOV_ON_SELECT !== 'undefined' && LOV_ON_SELECT[key]) LOV_ON_SELECT[key]();
}
// Clear-side counterpart (added 2026-07-22, punch-list fix) — LOV_ON_SELECT
// already lets a screen react to a field being *picked* (Book Labor's own
// Employee/Crew mutual-exclusion protect, e.g.); clearing a field via the
// sheet's Clear button ran clearLov() with no equivalent hook at all, so
// Book Labor's protect never got undone when the technician cleared
// Employee or Crew. Same optional, screen-provided-object shape as
// LOV_ON_SELECT — a no-op for every screen that doesn't define one.
function runLovOnClearHook(key) {
  if (typeof LOV_ON_CLEAR !== 'undefined' && LOV_ON_CLEAR[key]) LOV_ON_CLEAR[key]();
}
/* ══════════════════════════════════════════════════════════════════════
   EQUIPMENT LOV (§15.5) — named "Equipment LOV" 2026-07-21 per user
   direction, promoted here from WO Record View so WO Insert Mode gets
   the identical full Search+Structure two-tab picker instead of a plain
   generic LOV sheet (docs/component-library.md has the full write-up).
   Search tab is a flat, richer-than-flat-list picker; Structure tab is a
   real hierarchy with parent pointers so a selection can re-expand its
   own ancestor chain. Demo data only — not meant to be exhaustive.

   Markup (#equipmentPopup/#qrScanOverlay) stays per-screen, same
   convention as #lovSheet/#dateSheet — only this data/CSS/JS is shared.
   Two ways a screen can consume it:
   - As a REF_CARD_FIELDS key (Insert Mode's Equipment field) — set
     `useEquipmentLookup: true` on that key's REF_CARD_FIELDS config;
     renderRefCard()'s onclick and commitEquipmentSelection() below both
     already check for it, nothing else needed.
   - As a plain record field (WO Record View's own Equipment field) — the
     screen calls `openEquipmentLookup('equipment')` itself and supplies
     two small hooks, same shape as LOV_ON_SELECT/DATE_ON_SELECT:
       const EQUIP_LOOKUP_CURRENT   = { equipment: () => RECORD.equipment };
       const EQUIP_LOOKUP_ON_SELECT = { equipment: (o) => { ... } };
   ══════════════════════════════════════════════════════════════════════ */
// organization added 2026-07-22 (demo-consistency pass) — every other
// record in this app is FBPP; this dataset just never carried the field,
// which is why its search cards were missing the org corner-badge every
// other standard card (WO List, Equipment List) has.
const EQUIPMENT_LOOKUP_DATA = [
  { code: '00067333', desc: 'Pump, Centrifugal', class: 'Pump', category: 'Centrifugal', type: 'Asset', organization: 'FBPP' },
  { code: '00068211', desc: 'Motor, Induction 50HP', class: 'Motor', category: 'Induction', type: 'Asset', organization: 'FBPP' },
  { code: '00069045', desc: 'Valve, Gate 6in', class: 'Valve', category: null, type: 'Asset', organization: 'FBPP' },
  { code: 'P-004-00167063', desc: 'Pump House 3 — Bay 4', class: null, category: null, type: 'Position', organization: 'FBPP' },
  { code: '00070102', desc: 'Compressor, Rotary Screw', class: 'Compressor', category: 'Rotary Screw', type: 'Asset', organization: 'FBPP' },
  { code: '00071358', desc: 'Blower, Centrifugal', class: 'Blower', category: 'Centrifugal', type: 'Asset', organization: 'FBPP' },
];
const TREE_DATA = {
  id: 'loc1', type: 'Location', desc: 'Belmont Wastewater Treatment Plant', code: 'L-BELMONT-WWTP', class: null, category: null,
  children: [
    { id: 'pos1', type: 'Position', desc: 'Pump House 3 — Bay 4', code: 'P-004-00167063', class: null, category: null,
      children: [
        { id: 'sys1', type: 'System', desc: 'Primary Transfer Pumping System', code: 'S-002-00167061', class: null, category: null,
          children: [
            { id: 'ast1', type: 'Asset', desc: 'Pump, Centrifugal', code: '00067333', class: 'Pump', category: 'Centrifugal', current: true, children: [] },
            { id: 'ast2', type: 'Asset', desc: 'Pump, Centrifugal (Standby)', code: '00067334', class: 'Pump', category: 'Centrifugal', children: [] },
          ] },
        { id: 'sys2', type: 'System', desc: 'Secondary Transfer Pumping System', code: 'S-002-00167062', class: null, category: null,
          children: [
            { id: 'ast3', type: 'Asset', desc: 'Pump, Centrifugal (Backup)', code: '00067335', class: 'Pump', category: 'Centrifugal', children: [] },
          ] },
      ] },
  ],
};
// Flat id→node map + parent pointers, built once so a selection can walk
// back up to re-expand its own ancestor chain (§15.5 "Structure — select
// re-anchors the tree").
const TREE_NODE_MAP = {};
(function indexTree(node, parent) {
  node.parent = parent || null;
  TREE_NODE_MAP[node.id] = node;
  (node.children || []).forEach(c => indexTree(c, node));
})(TREE_DATA, null);
function treeAncestorIds(node) {
  const ids = [];
  let n = node.parent;
  while (n) { ids.push(n.id); n = n.parent; }
  return ids;
}
let treeExpandedIds = new Set(treeAncestorIds(TREE_NODE_MAP.ast1).concat(['ast1']));
let treeFocusedId = null;
const EQUIP_SEARCH_DATASPY_NAME = 'All Equipment';
let equipSearchState = { mode: 'detailed', search: '' };
let activeEquipLovKey = null;

// Org corner-badge added 2026-07-22 (demo-consistency pass) — head/sub
// (Description/Code) never render their own `label` (renderStdCard()
// only reads .value for those two slots), so the stray labels these used
// to carry were dead weight; dropped along with adding the badge every
// other standard card (WO List, Equipment List) already has via the
// same `{type:'org', value:...}` shape.
function equipCardFields(o) {
  const f = [{ value: o.desc }, { value: o.code }, { type: 'org', value: o.organization }];
  if (o.class) f.push({ label: 'Class', value: o.class });
  if (o.category) f.push({ label: 'Category', value: o.category });
  f.push({ label: 'Type', value: o.type });
  return f;
}
// List mode needs a fixed column set (renderStdTable() takes its header
// labels from row 0 only) — unlike the card's shrink-on-null anatomy, a
// table can't drop a column for some rows only, so null shows as a blank
// cell instead of disappearing.
function equipTableFields(o) {
  return [
    { label: 'Description', value: o.desc }, { label: 'Code', value: o.code },
    { label: 'Organization', value: o.organization },
    { label: 'Class', value: o.class || '—' }, { label: 'Category', value: o.category || '—' },
    { label: 'Type', value: o.type },
  ];
}
function equipmentLookupCurrent(key) {
  if (typeof REF_CARD_FIELDS !== 'undefined' && REF_CARD_FIELDS[key]) {
    const code = LOV_CURRENT[key];
    return code ? (LOV_DATA[key] || []).find(o => o.code === code) : null;
  }
  if (typeof EQUIP_LOOKUP_CURRENT !== 'undefined' && EQUIP_LOOKUP_CURRENT[key]) return EQUIP_LOOKUP_CURRENT[key]();
  return null;
}
function openEquipmentLookup(key) {
  // §15.5: when equipment is already selected, default straight to
  // Structure, badged to that equipment's own node — Search only leads
  // with itself when there's nothing yet to orient around (e.g. Insert
  // Mode's empty state).
  activeEquipLovKey = key;
  treeFocusedId = null;
  switchEquipTab(equipmentLookupCurrent(key) ? 'structure' : 'search');
  equipSearchState = { mode: 'detailed', search: '' };
  renderEquipSearchShell();
  openHyperlinkPopup('equipmentPopup');
}
function switchEquipTab(tab) {
  document.getElementById('equipTabBtnSearch').classList.toggle('active', tab === 'search');
  document.getElementById('equipTabBtnStructure').classList.toggle('active', tab === 'structure');
  document.getElementById('equipTabSearch').style.display = tab === 'search' ? '' : 'none';
  document.getElementById('equipTabStructure').style.display = tab === 'structure' ? '' : 'none';
  if (tab === 'structure') renderEquipTree();
}
function renderEquipSearchShell() {
  const mode = equipSearchState.mode;
  document.getElementById('equipSearchShell').innerHTML = `
    <div class="ds-bar" onclick="showToast('Equipment views — coming soon')">
      <div class="ds-icon-w">${LD_ICONS.database}</div>
      <div class="ds-body"><div class="ds-name">${EQUIP_SEARCH_DATASPY_NAME}</div></div>
      <svg class="ds-chevron" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="mode-tog">
      <button class="mode-btn ${mode === 'detailed' ? 'active' : ''}" onclick="setEquipSearchMode('detailed')">Detailed</button>
      <button class="mode-btn ${mode === 'list' ? 'active' : ''}" onclick="setEquipSearchMode('list')">List</button>
    </div>
    <div class="ld-search-bar">
      ${LD_ICONS.search}
      <input class="ld-search-input" placeholder="Search Equipment" value="${(equipSearchState.search || '').replace(/"/g, '&quot;')}" oninput="filterEquipSearch(this.value)" autocomplete="off">
      <button class="equip-search-scan-btn" onclick="openEquipScan()" aria-label="Scan equipment QR code" title="Scan QR code">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>
    </div>
    <div class="filter-chip-row">
      <button class="filter-chip" onclick="showToast('Class filter — coming soon')">Class</button>
      <button class="filter-chip" onclick="showToast('Category filter — coming soon')">Category</button>
      <button class="filter-chip" onclick="showToast('Type filter — coming soon')">Type</button>
    </div>
    <div class="res-row">
      <span class="res-count" id="equipResultsCount"></span>
      <button class="sort-btn" onclick="showToast('Sort — coming soon')">${LD_ICONS.sort}Description</button>
    </div>
    <div id="equipResultsBody"></div>`;
  renderEquipSearchResults();
}
// Split from the shell above so a keystroke in the search input only
// touches #equipResultsBody/#equipResultsCount, never the input itself —
// re-rendering the input on every keystroke drops focus/cursor position
// mid-type.
function renderEquipSearchResults() {
  const q = (equipSearchState.search || '').toLowerCase();
  const rows = EQUIPMENT_LOOKUP_DATA.filter(o => !q || o.desc.toLowerCase().includes(q) || o.code.toLowerCase().includes(q));
  document.getElementById('equipResultsCount').textContent = `${rows.length} record${rows.length === 1 ? '' : 's'}`;
  document.getElementById('equipResultsBody').innerHTML = !rows.length
    ? `<div class="ld-table-empty">No matches</div>`
    : equipSearchState.mode === 'list'
      ? renderStdTable(rows.map(equipTableFields), "selectEquipmentFromSearchByRow(this)")
      : rows.map(o => `<div class="ld-card-wrap" onclick="selectEquipmentFromSearch('${o.code}')">${renderStdCard(equipCardFields(o))}</div>`).join('');
}
function setEquipSearchMode(mode) { equipSearchState.mode = mode; renderEquipSearchShell(); }
function filterEquipSearch(value) { equipSearchState.search = value; renderEquipSearchResults(); }
// List mode's rows have no per-row click hook (renderStdTable() takes one
// onclick string for every row) — Code is always fields[1] regardless of
// which optional attrs a given equipment has, so reading it back off the
// row's own 2nd cell avoids forking renderStdTable just for this.
function selectEquipmentFromSearchByRow(tr) { selectEquipmentFromSearch(tr.children[1].textContent); }
function selectEquipmentFromSearch(code) {
  const o = EQUIPMENT_LOOKUP_DATA.find(x => x.code === code);
  if (!o) return;
  commitEquipmentSelection({ code: o.code, desc: o.desc, class: o.class, category: o.category, type: o.type });
}
/* ── Structure tab — Option B: row text tap focuses/highlights a node and
   reveals an inline Select button on that row only; a separate caret
   expands/collapses without changing focus. Only the focused row's
   Select button commits. ── */
function renderEquipTree() {
  document.getElementById('equipTreeBody').innerHTML = renderTreeNode(TREE_DATA, 0);
}
function renderTreeNode(node, depth) {
  const hasChildren = node.children && node.children.length > 0;
  const expanded = treeExpandedIds.has(node.id);
  const focused = treeFocusedId === node.id;
  const row = `<div class="tree-row${node.current ? ' current' : ''}${focused ? ' focused' : ''}">
      ${depth > 0 ? '<div class="tree-guide"></div>' : ''}
      <div class="tree-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
      <div class="tree-body" onclick="focusTreeNode('${node.id}')">
        <div class="tree-type">${node.type}</div>
        <div class="tree-desc">${node.desc}</div>
        <div class="tree-code">${node.code}</div>
      </div>
      ${node.current ? `<span class="tree-here">Selected</span>` : ''}
      ${focused ? `<button class="tree-select-btn" onclick="event.stopPropagation(); selectTreeNode('${node.id}')">Select</button>` : ''}
      ${hasChildren ? `<button class="tree-caret${expanded ? ' expanded' : ''}" onclick="event.stopPropagation(); toggleTreeNode('${node.id}')" aria-label="Expand"><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
    </div>`;
  const childrenHtml = hasChildren && expanded
    ? node.children.map(c => `<div class="tree-node" style="margin-left:${(depth + 1) * 20}px;">${renderTreeNode(c, depth + 1)}</div>`).join('')
    : '';
  return row + childrenHtml;
}
function focusTreeNode(id) { treeFocusedId = (treeFocusedId === id) ? null : id; renderEquipTree(); }
function toggleTreeNode(id) {
  if (treeExpandedIds.has(id)) treeExpandedIds.delete(id); else treeExpandedIds.add(id);
  renderEquipTree();
}
function selectTreeNode(id) {
  const node = TREE_NODE_MAP[id];
  if (!node) return;
  Object.values(TREE_NODE_MAP).forEach(n => { n.current = false; });
  node.current = true;
  treeExpandedIds = new Set(treeAncestorIds(node).concat([node.id]));
  treeFocusedId = null;
  commitEquipmentSelection({ code: node.code, desc: node.desc, class: node.class, category: node.category, type: node.type });
}
// Dual-path commit, same shape as selectLov()'s REF_CARD_FIELDS branch
// below: a REF_CARD_FIELDS key (Insert Mode) re-renders its ref card
// generically; a plain-field consumer (WO Record View) gets routed
// through its own EQUIP_LOOKUP_ON_SELECT hook instead.
function commitEquipmentSelection(o, source) {
  const key = activeEquipLovKey;
  closeEquipScan();
  if (document.getElementById('equipmentPopup').classList.contains('open')) closeHyperlinkPopup('equipmentPopup');
  const isRefCard = typeof REF_CARD_FIELDS !== 'undefined' && REF_CARD_FIELDS[key];
  if (isRefCard) {
    LOV_CURRENT[key] = o.code;
    if (LOV_DATA[key] && !LOV_DATA[key].some(x => x.code === o.code)) LOV_DATA[key].push(o);
    renderRefCard(key);
    updateInsertSaveGate();
  } else if (typeof EQUIP_LOOKUP_ON_SELECT !== 'undefined' && EQUIP_LOOKUP_ON_SELECT[key]) {
    EQUIP_LOOKUP_ON_SELECT[key](o);
  }
  runLovOnSelectHook(key);
  updateRequiredBadges();
  showToast(source === 'scan' ? ('Scanned: ' + o.desc) : (isRefCard ? '✓ ' + o.desc : 'Equipment updated'));
}
/* ── QR scan — quick equipment entry (§15.5). No real device camera in a
   static file:// prototype: "Simulate scan" stands in for a real result,
   always resolving to the same demo equipment so the flow is
   reproducible. Only reachable from inside the Search tab's own search
   bar, so activeEquipLovKey is always already set when this runs. ── */
function openEquipScan() { document.getElementById('qrScanOverlay').classList.add('open'); }
function closeEquipScan() { document.getElementById('qrScanOverlay').classList.remove('open'); }
function simulateQrScan() {
  const o = EQUIPMENT_LOOKUP_DATA[1];
  commitEquipmentSelection({ code: o.code, desc: o.desc, class: o.class, category: o.category, type: o.type }, 'scan');
}
/* ── EQUIPMENT SUMMARY CARD (§15.5) — icon + desc/code/type card, shared
   by WO Record View's own Equipment field (a plain RECORD field, calls
   this directly) and WO Insert Mode's Equipment field (a REF_CARD_FIELDS
   key, via renderRefCard() below). Converged 2026-07-22 (punch-list
   item) — Insert Mode used to render a differently-shaped card here;
   now both surfaces are visually identical, same markup either way. */
const EQUIP_ICON_SVG = '<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const EQUIP_CLASS_ICONS = { Pump: EQUIP_ICON_SVG, Motor: EQUIP_ICON_SVG, Compressor: EQUIP_ICON_SVG, Blower: EQUIP_ICON_SVG };
function equipSummaryCardHTML(e, emptyLabel, openFn) {
  if (!e) {
    return `<div class="equip-summary-card empty" onclick="${openFn}">
      <div class="equip-summary-main">
        <div class="equip-summary-info"><div class="equip-summary-desc">${emptyLabel || 'Tap to select equipment'}</div></div>
        <svg class="equip-summary-chevron" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>`;
  }
  const classIcon = EQUIP_CLASS_ICONS[e.class];
  return `<div class="equip-summary-card" onclick="${openFn}">
    <div class="equip-summary-main">
      ${classIcon ? `<div class="equip-summary-icon">${classIcon}</div>` : ''}
      <div class="equip-summary-info">
        <div class="equip-summary-desc">${e.desc}</div>
        <div class="equip-summary-meta">${e.code}</div>
        <div class="equip-summary-type">${e.type}</div>
      </div>
      <svg class="equip-summary-chevron" width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  </div>`;
}
/* ── REFERENCE CARD FIELDS (§15.5, promoted 2026-07-20) — a field whose
   value is a small record (e.g. WO Insert Mode's Equipment field), not a
   plain code+desc row. Screen provides:
     REF_CARD_FIELDS = { key: { mountId, emptyLabel, useEquipmentLookup } }
   LOV_DATA[key] still drives the picker list (openLov()/filterLovOptions()
   need no changes — they only ever render code+desc); each option's full
   object is looked up back out of LOV_DATA[key] by code after selection. ── */
function renderRefCard(key) {
  const cfg = REF_CARD_FIELDS[key];
  const mount = document.getElementById(cfg.mountId);
  if (!mount) return;
  // Equipment LOV opt-in (§15.5, 2026-07-21) — a ref-card field can use
  // the full Search+Structure picker instead of the plain generic LOV
  // sheet by setting useEquipmentLookup:true on its REF_CARD_FIELDS entry.
  const openFn = cfg.useEquipmentLookup ? `openEquipmentLookup('${key}')` : `openLov('${key}')`;
  const code = LOV_CURRENT[key];
  const opt = code ? LOV_DATA[key].find(o => o.code === code) : null;
  mount.innerHTML = equipSummaryCardHTML(opt, cfg.emptyLabel, openFn);
}
function selectLov(code, desc) {
  const key = activeLovKey;
  LOV_CURRENT[key] = code;
  if (typeof REF_CARD_FIELDS !== 'undefined' && REF_CARD_FIELDS[key]) {
    renderRefCard(key);
    closeAllSheets();
    showToast('✓ ' + desc);
    updateInsertSaveGate();
    runLovOnSelectHook(key);
    updateRequiredBadges();
    return;
  }
  if (key === '__status') {
    // Screen-provided STATUS_CLASS_MAP (optional) lets a screen whose status
    // codes aren't Equipment's Operational/Down/Standby (e.g. WO's Released/
    // In Progress/Completed/On Hold) still drive the same 3 fill colours —
    // falls back to the original map so existing screens need no changes.
    const statusMap = (typeof STATUS_CLASS_MAP !== 'undefined') ? STATUS_CLASS_MAP : { OPERATIONAL:'st-operational', DOWN:'st-down', STANDBY:'st-standby' };
    const cls = statusMap[code] || 'st-operational';
    const btn = document.getElementById('recStatusBtn');
    if (btn && !btn.classList.contains('st-protected')) {
      btn.className = 'rec-status-btn ' + cls;
      document.getElementById('recStatusBtnText').textContent = desc;
    }
    closeAllSheets();
    showToast('✓ ' + desc);
    runLovOnSelectHook(key);
  updateRequiredBadges();
    return;
  }
  if (typeof ORG_STYLE_LOVS !== 'undefined' && ORG_STYLE_LOVS.has(key)) {
    document.getElementById(`fv-${key}-code`).textContent = code;
    closeAllSheets();
    showToast('✓ ' + code);
    updateInsertSaveGate();
    runLovOnSelectHook(key);
  updateRequiredBadges();
    return;
  }
  if (typeof BADGE_LOV_META !== 'undefined' && BADGE_LOV_META[key]) {
    const meta = BADGE_LOV_META[key][code];
    const badgeEl = document.getElementById(`fv-${key}-badge`);
    // Insert the id via a literal attribute, not a string .replace() on
    // renderColorBadge()'s class list — that used to work only because
    // the class was always the exact string "attr-badge"; it now also
    // carries an outline/critical modifier, so a naive substring replace
    // silently stops matching. Splice the id attribute in right after
    // the tag name instead, order-independent of whatever classes follow.
    badgeEl.outerHTML = renderColorBadge(meta).replace('<span ', `<span id="fv-${key}-badge" `);
    document.getElementById(`fv-${key}-desc`).textContent = desc;
    closeAllSheets();
    showToast('✓ ' + desc);
    updateInsertSaveGate();
    runLovOnSelectHook(key);
  updateRequiredBadges();
    return;
  }
  const codeEl = document.getElementById(`fv-${key}-code`);
  const descEl = document.getElementById(`fv-${key}-desc`);
  if (codeEl) { codeEl.textContent = code; codeEl.style.display = ''; }
  if (descEl) { descEl.textContent = desc; descEl.classList.remove('muted'); }
  closeAllSheets();
  showToast('✓ ' + desc);
  updateInsertSaveGate();
  runLovOnSelectHook(key);
  updateRequiredBadges();
}
function clearLov() {
  const key = activeLovKey;
  LOV_CURRENT[key] = '';
  const codeEl = document.getElementById(`fv-${key}-code`);
  const descEl = document.getElementById(`fv-${key}-desc`);
  if (codeEl) { codeEl.textContent = ''; codeEl.style.display = 'none'; }
  if (descEl) { descEl.textContent = ''; descEl.classList.add('muted'); }
  closeAllSheets();
  showToast('Cleared');
  runLovOnClearHook(key);
  updateRequiredBadges();
}

/* ══════════════════════════════════════════════════════════════════════
   EDIT SHEET (text / number / currency, §3.4)
   ══════════════════════════════════════════════════════════════════════ */
function formatCurrency(val) {
  if (val === '' || val == null) return val;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g,''));
  return isNaN(n) ? val : '$' + n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function sanitizeCurrencyInput(input) {
  if (activeEditType !== 'currency') return;
  const fromEnd = input.value.length - input.selectionStart;
  let cleaned = input.value.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  if (input.value !== cleaned) {
    input.value = cleaned;
    const pos = Math.max(0, cleaned.length - fromEnd);
    input.setSelectionRange(pos, pos);
  }
}
let activeEditKey = null, activeEditType = null;
function openEdit(key, label, type) {
  activeEditKey = key; activeEditType = type;
  document.getElementById('editSheetTitle').textContent = label;
  document.getElementById('editClearBtn').classList.toggle('hidden', shouldHideClear(key, document.getElementById('fv-'+key)));
  const input = document.getElementById('editSheetInput');
  input.type = type === 'number' ? 'number' : 'text';
  input.inputMode = type === 'currency' ? 'decimal' : '';
  input.placeholder = type === 'currency' ? '0.00' : '';
  const raw = document.getElementById('fv-'+key).textContent.replace(/[$,]/g,'');
  input.value = raw;
  openSheet('editSheet');
}
function saveEdit() {
  const val = document.getElementById('editSheetInput').value;
  const el = document.getElementById('fv-'+activeEditKey);
  el.textContent = activeEditType === 'currency' ? formatCurrency(val) : val;
  el.classList.remove('muted');
  closeAllSheets();
  showToast('Saved');
  updateRequiredBadges();
  // Optional screen-provided hook for a field whose edit must do more than
  // update its own row (same pattern as LOV_ON_SELECT/DATE_ON_SELECT) — e.g.
  // Book Labor's Hours Worked recomputing End Time, holding Start fixed:
  //   const EDIT_ON_SAVE = { hoursWorked: () => recalcEndFromHours() };
  if (typeof EDIT_ON_SAVE !== 'undefined' && EDIT_ON_SAVE[activeEditKey]) EDIT_ON_SAVE[activeEditKey]();
}
function clearEdit() {
  const el = document.getElementById('fv-'+activeEditKey);
  el.textContent = '';
  el.classList.add('muted');
  closeAllSheets();
  showToast('Cleared');
  updateRequiredBadges();
}

/* ══════════════════════════════════════════════════════════════════════
   DATE / DATE-TIME SHEETS (§3.4/§5.2) — custom calendar, never native
   <input type=date>. Locale is hardcoded en-US as a prototype stand-in —
   real app must use the logged-in user's locale (§3.4).
   ══════════════════════════════════════════════════════════════════════ */
let calYear, calMonth, activeDateKey;
// If the screen keeps a RECORD data object (§ FIELD-ROW BUILDER HELPERS
// below), dates round-trip as real ISO strings on RECORD[key] — reopening
// the picker re-highlights the actual previously-selected day, not just
// "today." Screens with no RECORD object (e.g. this file's own demo data,
// which only keeps a display string) fall back to opening on today's
// month with nothing pre-selected — a minor UX gap, not a functional one.
// Plain numeric date, never spelled-month/relative/urgency-tinted
// (extended app-wide 2026-07-21 — was previously spelled-month "May 19,
// 2026"; §8.3 already locked this exact rule for WO List's cards, this
// generalizes it to every Record View date field too). See
// design-decisions-v3-1.md §3.4.
//
// Hardcoded 'en-US' here (→ MM/DD/YYYY) is a stand-in, not the real rule
// — the actual format is supposed to be driven by the logged-in user's
// own locale (this app targets North America/Europe/Asia at minimum, so
// DD/MM/YYYY and YYYY/MM/DD are both real cases, not edge cases). No
// per-user locale/session concept exists in this prototype yet, so it's
// pinned to 'en-US' everywhere rather than actually reading one. Tracked
// in design-decisions-v3-1.md §20 — flag on final review, don't assume
// every screen showing MM/DD/YYYY today is the locked behavior.
function isoToDisplay(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}
let activeDateSelectedIso = '';
function openDate(key, label) {
  activeDateKey = key;
  document.getElementById('dateSheetTitle').textContent = label;
  document.getElementById('dateClearBtn').classList.toggle('hidden', shouldHideClear(key, document.getElementById('fv-'+key)));
  activeDateSelectedIso = (typeof RECORD !== 'undefined' && RECORD[key]) || '';
  const base = activeDateSelectedIso ? new Date(activeDateSelectedIso + 'T00:00:00') : new Date();
  calYear = base.getFullYear(); calMonth = base.getMonth();
  renderCal();
  openSheet('dateSheet');
}
function calNavMonth(d) { calMonth += d; if (calMonth<0){calMonth=11;calYear--;} if(calMonth>11){calMonth=0;calYear++;} renderCal(); }
function renderCal() {
  const first = new Date(calYear, calMonth, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  document.getElementById('calMonthLabel').textContent = first.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const today = new Date();
  let html = '';
  for (let i=0;i<startDow;i++) html += `<div class="cal-day other-month"></div>`;
  for (let d=1;d<=daysInMonth;d++) {
    const iso = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = d===today.getDate() && calMonth===today.getMonth() && calYear===today.getFullYear();
    const isSelected = iso === activeDateSelectedIso;
    html += `<div class="cal-day${isToday?' today':''}${isSelected?' selected':''}" onclick="selectDate('${iso}')">${d}</div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}
// Optional per-key post-select hook, same pattern as LOV_ON_SELECT — lets
// a screen with its own required-field gating (not the Standard Model's
// class-based one, e.g. a data-value/data-required scheme) re-sync itself
// after a date is picked or cleared:
//   const DATE_ON_SELECT = { someKey: () => {...} };
function runDateOnSelectHook(key) {
  if (typeof DATE_ON_SELECT !== 'undefined' && DATE_ON_SELECT[key]) DATE_ON_SELECT[key]();
}
function selectDate(iso) {
  activeDateSelectedIso = iso;
  if (typeof RECORD !== 'undefined') RECORD[activeDateKey] = iso;
  const el = document.getElementById('fv-'+activeDateKey);
  el.textContent = isoToDisplay(iso);
  el.classList.remove('muted');
  closeAllSheets();
  showToast('Saved');
  updateRequiredBadges();
  runDateOnSelectHook(activeDateKey);
}
function clearDate() {
  activeDateSelectedIso = '';
  if (typeof RECORD !== 'undefined') RECORD[activeDateKey] = '';
  const el = document.getElementById('fv-'+activeDateKey);
  el.textContent = '';
  el.classList.add('muted');
  closeAllSheets();
  showToast('Cleared');
  updateRequiredBadges();
  runDateOnSelectHook(activeDateKey);
}
let calYearDT, calMonthDT, selectedDayDT, activeDateTimeKey;
function openDateTime(key, label) {
  activeDateTimeKey = key;
  document.getElementById('dateTimeSheetTitle').textContent = label;
  document.getElementById('dateTimeClearBtn').classList.toggle('hidden', shouldHideClear(key, document.getElementById('fv-'+key)));
  const now = new Date();
  calYearDT = now.getFullYear(); calMonthDT = now.getMonth(); selectedDayDT = now.getDate();
  renderCalDT();
  openSheet('dateTimeSheet');
}
function calNavMonthDT(d) { calMonthDT += d; if (calMonthDT<0){calMonthDT=11;calYearDT--;} if(calMonthDT>11){calMonthDT=0;calYearDT++;} renderCalDT(); }
function renderCalDT() {
  const first = new Date(calYearDT, calMonthDT, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(calYearDT, calMonthDT+1, 0).getDate();
  document.getElementById('calMonthLabelDT').textContent = first.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const today = new Date();
  let html = '';
  for (let i=0;i<startDow;i++) html += `<div class="cal-day other-month"></div>`;
  for (let d=1;d<=daysInMonth;d++) {
    const isToday = d===today.getDate() && calMonthDT===today.getMonth() && calYearDT===today.getFullYear();
    const isSelected = d===selectedDayDT;
    html += `<div class="cal-day${isToday?' today':''}${isSelected?' selected':''}" onclick="selectDayDT(${d})">${d}</div>`;
  }
  document.getElementById('calGridDT').innerHTML = html;
}
function selectDayDT(d) { selectedDayDT = d; renderCalDT(); }
function saveDateTime() {
  const dt = new Date(calYearDT, calMonthDT, selectedDayDT);
  const [h, m] = document.getElementById('dateTimeInput').value.split(':').map(Number);
  dt.setHours(h, m);
  const el = document.getElementById('fv-'+activeDateTimeKey);
  // Date portion: plain numeric, matching isoToDisplay() (§3.4/§20) — was
  // month:'short' ("May 19, 2026"), missed when that rule went app-wide
  // 2026-07-21; found fixing WO Closing's Date completed field, the only
  // other real openDateTime()/saveDateTime() consumer besides Sample
  // Screen, both of which this fixes too since it's the shared function.
  // Time portion: 24-hour/military, no AM/PM (§3.4, locked 2026-07-21 —
  // same rule as any other Time Only field). hour12:false is required —
  // 'en-US' defaults to 12-hour otherwise even with hour:'2-digit'.
  el.textContent = `${dt.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})} · ${dt.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false})}`;
  el.classList.remove('muted');
  closeAllSheets();
  showToast('Saved');
}
function clearDateTime() {
  const el = document.getElementById('fv-'+activeDateTimeKey);
  el.textContent = '';
  el.classList.add('muted');
  closeAllSheets();
  showToast('Cleared');
}

/* ══════════════════════════════════════════════════════════════════════
   INLINE TEXT (≤255 chars, §3.4) + CHECKBOX (§3.4)
   ══════════════════════════════════════════════════════════════════════ */
function onInlineFocus() {
  const btn = document.getElementById('inlineConfirmBtn');
  if (btn) btn.classList.add('show');
}
function onInlineBlur(el) {
  const btn = document.getElementById('inlineConfirmBtn');
  if (btn) btn.classList.remove('show');
  showToast('Saved');
  updateRequiredBadges();
}
function updateInlineFieldLayout(input) {
  // Always stacked now (2026-07-23, screen design standard) — was
  // conditional on length>24 (only grew tall once text got long). Every
  // standalone free-text field (Notes/Description/UDF01-style, NOT one
  // living inside a collapsible container, and not a genuine multi-line
  // textarea like Comments/Closing Comments — those are a different
  // component) is now unconditionally this taller shape: label on its
  // own line, cursor starts left-aligned underneath it, text spans the
  // full width and wraps down. The markup itself already carries the
  // 'stacked' class for this reason (correct even before any input
  // event fires); this just keeps it and grows the height as content
  // changes, same autoGrow() technique as the header's own growth.
  input.closest('.form-field').classList.add('stacked');
  autoGrow(input);
}
function toggleCheckbox(row) {
  const box = row.querySelector('.field-checkbox');
  const checked = box.classList.toggle('checked');
  box.innerHTML = checked ? '<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>' : '';
}
// Every container is collapsible (design-decisions-v3-1.md §3.4) —
// promoted here 2026-07-22 on its 2nd real consumer (see eam-shared.css's
// matching comment). Toggles 'collapsed' on the header's own parent,
// which works for both .section-card and .attach-card without needing
// to know which.
function toggleSectionCard(headerEl) {
  headerEl.parentElement.classList.toggle('collapsed');
}

/* ══════════════════════════════════════════════════════════════════════
   FULL-SCREEN LONG-TEXT EDITOR (§3.4) — Comments reuse this exact pattern.
   ══════════════════════════════════════════════════════════════════════ */
let textEditorKey = null, textEditorInitial = '', textEditorAwaitingDiscard = false, textEditorOnSave = null;
function openTextEditor(key, title, onSaveCallback, initialOverride) {
  textEditorKey = key;
  textEditorOnSave = onSaveCallback || null;
  document.getElementById('textEditorTitle').textContent = title;
  const current = initialOverride !== undefined ? initialOverride : (onSaveCallback ? '' : document.getElementById('fv-'+key).textContent);
  textEditorInitial = current === 'Tap to add…' ? '' : current;
  document.getElementById('textEditorTextarea').value = textEditorInitial;
  textEditorAwaitingDiscard = false;
  document.getElementById('textEditorDiscard').classList.remove('show');
  document.getElementById('textEditorCloseBtn').style.display = '';
  openSheet('textEditorSheet');
  setTimeout(() => document.getElementById('textEditorTextarea').focus(), 250);
}
function textEditorInputChanged() {
  if (textEditorAwaitingDiscard) {
    textEditorAwaitingDiscard = false;
    document.getElementById('textEditorDiscard').classList.remove('show');
    document.getElementById('textEditorCloseBtn').style.display = '';
  }
}
function textEditorCloseTap() {
  const dirty = document.getElementById('textEditorTextarea').value !== textEditorInitial;
  if (dirty && !textEditorAwaitingDiscard) {
    textEditorAwaitingDiscard = true;
    document.getElementById('textEditorCloseBtn').style.display = 'none';
    document.getElementById('textEditorDiscard').classList.add('show');
    return;
  }
  closeAllSheets();
}
function textEditorConfirmDiscard() {
  document.getElementById('textEditorTextarea').value = textEditorInitial;
  closeAllSheets();
}
function saveTextEditor() {
  const val = document.getElementById('textEditorTextarea').value;
  if (textEditorOnSave) {
    textEditorOnSave(val);
  } else {
    const el = document.getElementById('fv-'+textEditorKey);
    el.textContent = val || 'Tap to add…';
    el.classList.toggle('muted', !val);
  }
  closeAllSheets();
  showToast('Saved');
}

/* ══════════════════════════════════════════════════════════════════════
   COMMENTS (§3.4/§7.2) — add/edit/delete/copy, permission-driven ellipsis.
   ══════════════════════════════════════════════════════════════════════ */
function addComment(text, listId) {
  if (!text.trim()) return;
  const list = document.getElementById(listId || 'commentsList');
  const now = new Date();
  const div = document.createElement('div');
  div.className = 'comment-item';
  div.dataset.mine = 'true';
  const myName = (typeof CURRENT_USER_NAME !== 'undefined' && CURRENT_USER_NAME) ? CURRENT_USER_NAME : 'You';
  div.innerHTML = `<div class="comment-header"><span class="comment-author">${myName} (You)</span>
    <div class="comment-time-actions">
      <span class="comment-time">${now.toLocaleDateString('en-US',{month:'short',day:'numeric'})} · ${now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
      <button class="comment-ellipsis" onclick="event.stopPropagation();openCommentActions(this,true)">⋯</button>
    </div>
  </div><p class="comment-text"></p>`;
  div.querySelector('.comment-text').textContent = text;
  list.appendChild(div);
}
let activeCommentItem = null;
function openCommentActions(btn, isMine) {
  activeCommentItem = btn.closest('.comment-item');
  const actions = isMine ? ['Edit', 'Delete', 'Copy'] : ['Copy'];
  document.getElementById('commentActionsBody').innerHTML = actions.map(a => `
    <div class="lov-option" onclick="commentAction('${a}')">
      <div class="lov-option-texts"><div class="lov-option-desc"${a === 'Delete' ? ' style="color:var(--red);"' : ''}>${a}</div></div>
    </div>`).join('');
  openSheet('commentActionsSheet');
}
function commentAction(action) {
  const item = activeCommentItem;
  // If the screen keeps a backing COMMENTS_DATA array (§7.2, D8 2026-07-16
  // — needed once a comment can appear in more than one rendered view, e.g.
  // Record View's latest-3 excerpt AND the dedicated Comments tab), sync it
  // here too — mutating only the DOM node would get silently reverted the
  // next time either view re-renders from the array.
  const id = item.dataset.id;
  const record = (id && typeof findCommentById === 'function') ? findCommentById(id) : null;
  closeAllSheets();
  if (action === 'Delete') {
    openConfirm('Are you sure you want to delete the comment?', () => {
      if (record && typeof COMMENTS_DATA !== 'undefined') COMMENTS_DATA.splice(COMMENTS_DATA.indexOf(record), 1);
      item.remove();
      if (typeof refreshAllCommentViews === 'function') refreshAllCommentViews();
      showToast('Comment deleted');
    });
  } else if (action === 'Copy') {
    const text = item.querySelector('.comment-text').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    showToast('Copied');
  } else if (action === 'Edit') {
    const current = item.querySelector('.comment-text').textContent;
    openTextEditor('__comment_edit', 'Edit Comment', (val) => {
      item.querySelector('.comment-text').textContent = val;
      if (record) record.text = val;
      if (typeof refreshAllCommentViews === 'function') refreshAllCommentViews();
    }, current);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   COMMENTS/DOCUMENTS — RECORD-LEVEL DATA-DRIVEN PATTERN (§7.2/§8, D7–D9,
   generalized 2026-07-16 once a second real screen needed it — was
   Sample-Screen-local before this). One shared array is the source of
   truth for both a Record View excerpt and a dedicated tab, so an edit or
   delete from either place stays in sync. Screen provides:
     let COMMENTS_DATA = [{id,mine,author,time,text}, ...]  (author = full user description, never an abbreviation — "(You)" is appended at render time for mine:true, don't bake it into the stored string)
     let commentIdSeq = <starting number, e.g. count of seed comments>
     const CURRENT_USER_NAME = 'Full Name'          (used for new comments' author + the "(You)" suffix; falls back to the literal string 'You' if omitted)
     const COMMENTS_EXCERPT_MOUNT = 'someMountId'   (or omit/null — no inline excerpt)
     const COMMENTS_EXCERPT_LIMIT = 3               (or omit — show all, no "View all" link)
     const COMMENTS_TAB_KEY = 'comments'            (or omit/null — no dedicated tab)
     const DOCUMENTS_DATA = [{icon,name,meta}, ...]
     const DOCUMENTS_EXCERPT_MOUNT = 'someMountId'  (optional)
     const DOCUMENTS_TAB_KEY = 'documents'          (optional)
   TAB_RENDERERS.comments = renderCommentsTabContent — no args needed.
   TAB_PLUS_HANDLERS.comments = () => openTextEditor('__comment','Add Comment',(t)=>addCommentToData(t))
   ══════════════════════════════════════════════════════════════════════ */
// Author is always the full user description (§7.2, revised 2026-07-16) —
// never an abbreviation. Own comments (c.mine) append " (You)" to the
// current logged-in user's own full description at render time, rather
// than baking "(You)" into the stored author string — so COMMENTS_DATA
// only ever holds the plain full name.
function renderCommentItemHTML(c) {
  const authorDisplay = c.mine ? `${c.author} (You)` : c.author;
  return `<div class="comment-item" data-mine="${c.mine}" data-id="${c.id}">
    <div class="comment-header"><span class="comment-author">${authorDisplay}</span>
      <div class="comment-time-actions">
        <span class="comment-time">${c.time}</span>
        <button class="comment-ellipsis" onclick="event.stopPropagation();openCommentActions(this,${c.mine})">⋯</button>
      </div>
    </div>
    <p class="comment-text">${c.text}</p>
  </div>`;
}
function renderCommentsExcerptMount() {
  if (typeof COMMENTS_EXCERPT_MOUNT === 'undefined' || !COMMENTS_EXCERPT_MOUNT) return;
  const mount = document.getElementById(COMMENTS_EXCERPT_MOUNT);
  if (!mount) return;
  const limit = typeof COMMENTS_EXCERPT_LIMIT !== 'undefined' ? COMMENTS_EXCERPT_LIMIT : 0;
  const tabKey = typeof COMMENTS_TAB_KEY !== 'undefined' ? COMMENTS_TAB_KEY : null;
  const shown = limit ? COMMENTS_DATA.slice(-limit) : COMMENTS_DATA.slice();
  let html = `<div class="comment-add-row" onclick="openTextEditor('__comment','Add Comment',(t)=>addCommentToData(t))"><span class="comment-add-plus">+</span> Add comment</div>`;
  html += shown.map(renderCommentItemHTML).join('');
  if (limit && COMMENTS_DATA.length > limit && tabKey) {
    html += `<div class="comment-add-row" onclick="goToTab('${tabKey}')"><span class="comment-add-plus">→</span> View all comments</div>`;
  }
  mount.innerHTML = html;
  // Optional live count badge (e.g. a §7.2-style .rv-badge next to a
  // collapsible section's title) — screens with no tab/excerpt split at
  // all (WO Record View shows every comment inline, no "latest 3" limit)
  // still want their count badge to track the data instead of a static number.
  if (typeof COMMENTS_BADGE_ID !== 'undefined' && COMMENTS_BADGE_ID) {
    const badge = document.getElementById(COMMENTS_BADGE_ID);
    if (badge) badge.textContent = COMMENTS_DATA.length;
  }
}
function renderCommentsTabContent() {
  // Inline add-row added 2026-07-16 (conformance audit) to match
  // renderDocumentsTabContent()'s own inline row below — the two were
  // drifting asymmetric (Comments relied on the header Plus alone).
  return `<div class="section-card"><div class="comment-add-row" onclick="openTextEditor('__comment','Add Comment',(t)=>addCommentToData(t))"><span class="comment-add-plus">+</span> Add comment</div>${COMMENTS_DATA.map(renderCommentItemHTML).join('')}</div>`;
}
function addCommentToData(text) {
  if (!text.trim()) return;
  const now = new Date();
  const myName = (typeof CURRENT_USER_NAME !== 'undefined' && CURRENT_USER_NAME) ? CURRENT_USER_NAME : 'You';
  COMMENTS_DATA.push({ id: 'c' + (++commentIdSeq), mine: true, author: myName, time: `${now.toLocaleDateString('en-US',{month:'short',day:'numeric'})} · ${now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`, text });
  refreshAllCommentViews();
}
function findCommentById(id) { return (typeof COMMENTS_DATA !== 'undefined') ? COMMENTS_DATA.find(c => c.id === id) : null; }
function refreshAllCommentViews() {
  renderCommentsExcerptMount();
  if (typeof COMMENTS_TAB_KEY !== 'undefined' && COMMENTS_TAB_KEY && currentTab === COMMENTS_TAB_KEY) renderActiveTabContent();
}

const DEFAULT_DOC_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
function renderDocItemHTML(d) {
  const icons = typeof DOC_ICON_SVG !== 'undefined' ? DOC_ICON_SVG : {};
  return `<div class="doc-item" onclick="showToast('Opening ${d.name}…')">
    <div class="doc-icon ${d.icon}">${icons[d.icon] || DEFAULT_DOC_ICON_SVG}</div>
    <div class="doc-info"><div class="doc-name">${d.name}</div><div class="doc-meta">${d.meta}</div></div>
    <span class="doc-arrow">›</span>
  </div>`;
}
function renderDocumentsExcerptMount() {
  if (typeof DOCUMENTS_EXCERPT_MOUNT === 'undefined' || !DOCUMENTS_EXCERPT_MOUNT) return;
  const mount = document.getElementById(DOCUMENTS_EXCERPT_MOUNT);
  if (!mount) return;
  let html = `<div class="comment-add-row" onclick="showToast('Attach document — coming soon')"><span class="comment-add-plus">+</span> Add document</div>`;
  html += DOCUMENTS_DATA.map(renderDocItemHTML).join('');
  mount.innerHTML = html;
  if (typeof DOCUMENTS_BADGE_ID !== 'undefined' && DOCUMENTS_BADGE_ID) {
    const badge = document.getElementById(DOCUMENTS_BADGE_ID);
    if (badge) badge.textContent = DOCUMENTS_DATA.length;
  }
}
function renderDocumentsTabContent() {
  let html = `<div class="section-card"><div class="comment-add-row" onclick="showToast('Attach document — coming soon')"><span class="comment-add-plus">+</span> Add document</div>`;
  html += DOCUMENTS_DATA.map(renderDocItemHTML).join('');
  html += `</div>`;
  return html;
}

/* ══════════════════════════════════════════════════════════════════════
   CENTERED CONFIRMATION MODAL (§3.4) — destructive actions only.
   ══════════════════════════════════════════════════════════════════════ */
let confirmCallback = null;
// dangerLabel is optional (defaults to 'Delete') — added 2026-07-16 for WO
// Closing's "Remove attachment" confirm, the first caller whose destructive
// verb isn't literally "delete." Existing calls with 2 args are unaffected.
function openConfirm(message, onConfirm, dangerLabel) {
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmDangerBtn').textContent = dangerLabel || 'Delete';
  confirmCallback = onConfirm;
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open');
  confirmCallback = null;
}
function confirmDangerAction() {
  if (confirmCallback) confirmCallback();
  closeConfirm();
}

/* ══════════════════════════════════════════════════════════════════════
   QUESTION MESSAGE (2026-07-16) — first of its kind: a 3-outcome (Yes/
   No/Cancel) centered modal, distinct from the 2-button .confirm-modal
   above. Screen calls openQuestion(message, onYes, onNo) — Cancel needs
   no callback, it's always "do nothing, close." Own #questionOverlay
   (same .confirm-overlay backdrop styling, different element) rather
   than reusing #confirmOverlay — sharing one overlay between two
   differently-shaped modals would show both stacked on open. ══════════ */
let questionCallbacks = null;
function openQuestion(message, onYes, onNo) {
  document.getElementById('questionMessage').textContent = message;
  questionCallbacks = { onYes, onNo };
  document.getElementById('questionOverlay').classList.add('open');
}
function closeQuestion() {
  document.getElementById('questionOverlay').classList.remove('open');
  questionCallbacks = null;
}
function questionAnswerYes() {
  const cb = questionCallbacks;
  closeQuestion();
  if (cb && cb.onYes) cb.onYes();
}
function questionAnswerNo() {
  const cb = questionCallbacks;
  closeQuestion();
  if (cb && cb.onNo) cb.onNo();
}

/* ══════════════════════════════════════════════════════════════════════
   STEP TIMER (2026-07-16) — the WO timer shown running in the step rail
   (§14.2) and, expanded, in .step-timer-panel with Pause/Stop controls.
   Screen calls startStepTimer() once at init on any step where the timer
   pill is present AND running (Activity Checklist, Issue Parts — not
   Book Labor's already-stopped state, not WO Record View/Closing which
   have no timer pill at all). ══════════════════════════════════════════ */
let stepTimerSeconds = 0;
let stepTimerRunning = false;
let stepTimerInterval = null;
function formatStepTimer(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}
function updateStepTimerDisplays() {
  const text = formatStepTimer(stepTimerSeconds);
  const collapsed = document.getElementById('timerText');
  if (collapsed) collapsed.textContent = text;
  const expanded = document.getElementById('stepTimerValue');
  if (expanded) expanded.textContent = text;
}
function startStepTimer() {
  stepTimerSeconds = 0;
  stepTimerRunning = true;
  updateStepTimerDisplays();
  stepTimerInterval = setInterval(() => {
    stepTimerSeconds++;
    updateStepTimerDisplays();
  }, 1000);
}
const STEP_TIMER_PAUSE_ICON = '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="5" x2="8" y2="19"/><line x1="16" y1="5" x2="16" y2="19"/></svg>';
const STEP_TIMER_PLAY_ICON = '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 4l14 8-14 8z"/></svg>';
function toggleStepTimerPause() {
  const icon = document.getElementById('stepPauseBtnIcon');
  const label = document.getElementById('stepPauseBtnLabel');
  if (stepTimerRunning) {
    clearInterval(stepTimerInterval);
    stepTimerRunning = false;
    if (icon) icon.innerHTML = STEP_TIMER_PLAY_ICON;
    if (label) label.textContent = 'Resume';
  } else {
    stepTimerRunning = true;
    stepTimerInterval = setInterval(() => {
      stepTimerSeconds++;
      updateStepTimerDisplays();
    }, 1000);
    if (icon) icon.innerHTML = STEP_TIMER_PAUSE_ICON;
    if (label) label.textContent = 'Pause';
  }
}
function stopStepTimer() {
  clearInterval(stepTimerInterval);
  stepTimerRunning = false;
}

/* ══════════════════════════════════════════════════════════════════════
   FIELD-ROW BUILDER HELPERS — generate .form-field markup from a record's
   data instead of hand-authoring it per screen. Screen provides:
     RECORD = { key: value, ... }             (renamed from Equipment's own EQUIP)
     FIELD_LABELS = { key: 'Label' }
   Icons are passed in per call (screens already have their own ICONS map);
   these helpers don't assume one.
   ══════════════════════════════════════════════════════════════════════ */
function displayField(key, type) {
  if (type === 'date') return isoToDisplay(RECORD[key]);
  if (type === 'currency') return formatCurrency(RECORD[key]);
  return RECORD[key];
}
// IDs on the code/desc spans are load-bearing, not decorative: openLov/
// selectLov/clearLov update by getElementById('fv-{key}-code'/'-desc'), not
// a data-field querySelectorAll — a row built without them silently never
// updates on selection (found 2026-07-16 building Equipment's rebuild, the
// first real caller of this helper; Sample Screen hand-writes these ids
// directly in its static HTML instead of going through this function).
function fieldRowLov(key, required, chevronIcon) {
  const v = RECORD[key] || {};
  return `<div class="form-field${required ? ' required' : ''}" data-field="${key}" onclick="openLov('${key}')">
    <span class="field-label">${FIELD_LABELS[key]}</span>
    <div class="field-lov-value">
      <span class="field-lov-code" id="fv-${key}-code" style="${v.code ? '' : 'display:none;'}">${v.code||''}</span>
      <span class="field-lov-desc${v.desc ? '' : ' muted'}" id="fv-${key}-desc">${v.desc || ''}</span>
    </div>
    <span class="field-chevron">${chevronIcon || '›'}</span>
  </div>`;
}
// Same id requirement as fieldRowLov above — openEdit/saveEdit/clearEdit/
// openDate/selectDate/clearDate all look up the value span by
// getElementById('fv-{key}').
function fieldRowEdit(key, label, inputType, required, chevronIcon) {
  const v = displayField(key, inputType);
  const opener = inputType === 'date' ? `openDate('${key}','${label}')` : `openEdit('${key}','${label}','${inputType}')`;
  return `<div class="form-field${required ? ' required' : ''}" data-field="${key}" onclick="${opener}">
    <span class="field-label">${label}</span>
    <span class="field-value${v ? '' : ' muted'}" id="fv-${key}">${v || ''}</span>
    <span class="field-chevron">${chevronIcon || '›'}</span>
  </div>`;
}
function fieldRowInline(key, label, required) {
  const v = RECORD[key] || '';
  const stacked = v.length > 24 ? ' stacked' : '';
  return `<div class="form-field${required ? ' required' : ''}${stacked}" data-field="${key}" onclick="this.querySelector('textarea').focus()">
    <span class="field-label">${label}</span>
    <textarea class="field-inline-input" id="inline-${key}" rows="1" maxlength="255" oninput="updateInlineFieldLayout(this)" onfocus="onInlineFocus(this)" onblur="onInlineBlur(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${v.replace(/</g,'&lt;')}</textarea>
  </div>`;
}
function fieldRowCheckbox(key, label, checkIcon) {
  const v = RECORD[key];
  return `<div class="form-field" data-field="${key}" onclick="toggleCheckbox(this)">
    <span class="field-label">${label}</span>
    <div class="field-checkbox${v ? ' checked' : ''}">${v ? (checkIcon || '<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>') : ''}</div>
  </div>`;
}
function fieldRowProtected(label, value, lockIcon) {
  return `<div class="form-field protected">
    <span class="field-label">${label}</span>
    <span class="field-value muted">${value || ''}</span>
    <span class="field-lock">${lockIcon || '<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'}</span>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   COLLAPSIBLE FIELD-GROUP SECTIONS (§7.2) — plain (.fg-*) and
   icon+badge (.rv-*, Comments/Documents) variants.
   ══════════════════════════════════════════════════════════════════════ */
function toggleFg(row) {
  const chev = row.querySelector('.fg-chev');
  const body = row.nextElementSibling;
  const open = body.classList.toggle('open');
  chev.classList.toggle('open', open);
}
function rvToggle(id) {
  const el = document.getElementById('rv-' + id);
  const chev = document.getElementById('rv-chev-' + id);
  const open = el.classList.toggle('open');
  chev.classList.toggle('open', open);
}

/* ══════════════════════════════════════════════════════════════════════
   CUSTOMER FIELDS (admin-defined per Class + Class Org, §22) — a
   collapsible .fg-section, same shell as any other Record View container,
   whose field set comes from data/custom_field_defs.js (EAM_CUSTOM_FIELD_
   DEFS) instead of being hand-authored per screen. Renders nothing at all
   when no def matches the record's entity+class+classOrg — that's the
   mechanic, not a bug to guard against.

   Screen contract:
     1. Load data/custom_field_defs.js via <script src> before eam-shared.js.
     2. Call applyCustomFields(entity, cls, classOrg, values) once at
        init, after RECORD/FIELD_LABELS/LOV_DATA/LOV_CURRENT/LOV_TITLES
        exist — it merges matching fields directly into those globals, so
        openLov()/openEdit()/openDate()/toggleCheckbox() all work on them
        completely unmodified, same as any of the screen's own native
        fields (this mirrors how Equipment's pre-existing "Pump
        Information" fields already worked before this was generalized).
     3. Include renderCustomFieldsSection() among the screen's other
        .fg-section markup (its own return value, not auto-injected).

   Group Label is sparse in the source data (see that file's own header
   comment for why) — forward-filled here from the most recent non-blank
   value in `line` order. This is a deliberate call made under ambiguity,
   not a confirmed spec; see design-decisions-v3-1.md's "Custom Fields"
   entry for the open question this leaves.
   ══════════════════════════════════════════════════════════════════════ */
let CUSTOM_FIELDS_DEFS = [];
function applyCustomFields(entity, cls, classOrg, values) {
  values = values || {};
  const all = (typeof EAM_CUSTOM_FIELD_DEFS !== 'undefined') ? EAM_CUSTOM_FIELD_DEFS : [];
  const matched = all
    .filter(d => d.entity === entity && d.class === cls && d.classOrg === classOrg)
    .slice()
    .sort((a, b) => a.line - b.line);
  let lastGroup = '';
  matched.forEach(d => {
    lastGroup = d.groupLabel || lastGroup;
    d._resolvedGroup = lastGroup;
    const val = values[d.key];
    FIELD_LABELS[d.key] = d.label;
    if (d.type === 'lov') {
      LOV_DATA[d.key] = d.lovOptions || [];
      LOV_TITLES[d.key] = d.label;
      const opt = val ? (d.lovOptions || []).find(o => o.code === val) : null;
      LOV_CURRENT[d.key] = val || '';
      RECORD[d.key] = opt ? { code: opt.code, desc: opt.desc } : {};
    } else if (d.type === 'checkbox') {
      RECORD[d.key] = !!val;
    } else {
      RECORD[d.key] = (val === undefined || val === null) ? '' : val;
    }
  });
  CUSTOM_FIELDS_DEFS = matched;
  return matched;
}
function renderCustomFieldsSection() {
  if (!CUSTOM_FIELDS_DEFS.length) return '';
  let currentGroup = null;
  const rows = CUSTOM_FIELDS_DEFS.map(d => {
    let groupHtml = '';
    if (d._resolvedGroup && d._resolvedGroup !== currentGroup) {
      currentGroup = d._resolvedGroup;
      groupHtml = `<div class="cf-group-label">${currentGroup}</div>`;
    }
    let fieldHtml;
    if (d.type === 'lov') fieldHtml = fieldRowLov(d.key, false);
    else if (d.type === 'checkbox') fieldHtml = fieldRowCheckbox(d.key, d.label);
    else if (d.type === 'date') fieldHtml = fieldRowEdit(d.key, d.label, 'date', false);
    else if (d.type === 'number') fieldHtml = fieldRowEdit(d.key, d.label, 'number', false);
    else fieldHtml = fieldRowInline(d.key, d.label, false);
    return groupHtml + fieldHtml;
  }).join('');
  return `<div class="fg-section">
    <div class="fg-toggle-row" onclick="toggleFg(this)">
      <span class="fg-toggle-title">Custom Fields</span>
      <svg class="fg-chev" width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="fg-collapse">${rows}</div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   DIRTY / AUTOSAVE-ON-NAVIGATE (§5.1) — no persistent banner; the
   save-confirmation toast on navigate-away is the only feedback.
   ══════════════════════════════════════════════════════════════════════ */
let isDirty = false;
function markDirty() { isDirty = true; }
function autosaveIfDirty() {
  if (!isDirty) return;
  isDirty = false;
  showToast('Saved', '✓');
}

/* ══════════════════════════════════════════════════════════════════════
   BOOTSTRAP — call once, after the screen's own DOM + config globals exist.
   ══════════════════════════════════════════════════════════════════════ */
function initSharedApp(opts) {
  opts = opts || {};
  initThemeToggle();
  initTabRail();
  initStepRail();
  initRecHeaderScroll(opts.contentSelector);
  initHeaderMenuOutsideClick();
  initInsertModeDrag();
  renderSyncControl();
  updateNotifBadge();
  // Pre-filled inline (≤255-char) fields need their height set on load too,
  // not just on input — a long value present at render time shouldn't sit
  // clipped until the user's first keystroke.
  document.querySelectorAll('.field-inline-input').forEach(autoGrow);
  // Required-field-count badges need one initial pass too — a required
  // field that's already empty at load (not just one emptied by the user
  // afterward) must show its container's badge immediately.
  updateRequiredBadges();
}
