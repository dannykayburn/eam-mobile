/* Actually RUNS a screen's load path against a minimal DOM shim, in the same
   order the browser does: data/*.js → eam-shared.js → inline script. Compiling
   catches redeclarations; only executing catches temporal-dead-zone errors,
   undefined globals, and anything thrown during init — which is the class of
   bug that left the search screens dead. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = 'C:/Users/dkilburn/Projects/eam-mobile';
const DIR = ROOT + '/prototypes/standalone';

function makeStyle() {
  const s = { setProperty(){}, removeProperty(){}, getPropertyValue(){ return ''; } };
  return new Proxy(s, {
    get: (t, k) => (k in t ? t[k] : ''),
    set: () => true,
  });
}
/* Registry for the run in progress, so an element can register ids found in
   markup it was just handed. Without this, the three self-injecting shared
   sheets (sort / text filter / date range, built by ensureSharedSheet) are
   untestable: their ids only ever exist inside an innerHTML string, so
   getElementById returns null and the component throws on its first render. */
let REG = null;
function harvestIds(html) {
  if (!REG) return;
  for (const m of String(html).matchAll(/\bid="([^"]+)"/g)) REG.pageIds.add(m[1]);
}
function makeEl(id) {
  const attrs = {};
  const el = {
    id, _html: '', textContent: '', innerText: '', value: '', disabled: false,
    dataset: {}, style: makeStyle(), tagName: 'DIV', nodeType: 1,
    classList: {
      _s: new Set(),
      add(...c){ c.forEach(x => this._s.add(x)); },
      remove(...c){ c.forEach(x => this._s.delete(x)); },
      toggle(c, f){ const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on; },
      contains(c){ return this._s.has(c); },
      get length(){ return this._s.size; },
    },
    children: [], childNodes: [], parentElement: null, parentNode: null,
    firstChild: null, nextSibling: null, previousSibling: null,
    get innerHTML(){ return this._html; },
    set innerHTML(v){ this._html = String(v); harvestIds(v); },
    get outerHTML(){ return ''; }, set outerHTML(v){},
    appendChild(c){ this.children.push(c); if (c) c.parentElement = this; return c; },
    insertAdjacentHTML(){}, insertAdjacentElement(){},
    setAttribute(k, v){ attrs[k] = String(v); },
    getAttribute(k){ return k in attrs ? attrs[k] : null; },
    hasAttribute(k){ return k in attrs; },
    removeAttribute(k){ delete attrs[k]; },
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; },
    querySelector(){ return makeEl('q'); }, querySelectorAll(){ return []; },
    closest(){ return makeEl('c'); }, matches(){ return false; },
    contains(){ return false; },
    focus(){}, blur(){}, click(){}, select(){}, setSelectionRange(){},
    scrollTo(){}, scrollIntoView(){}, scrollBy(){},
    getBoundingClientRect(){ return { top:0, left:0, width:100, height:20, right:100, bottom:20, x:0, y:0 }; },
    remove(){}, insertBefore(c){ return c; }, replaceChild(c){ return c; },
    cloneNode(){ return makeEl(id); },
    scrollTop: 0, scrollLeft: 0, scrollHeight: 0, offsetHeight: 0, offsetWidth: 0,
    clientHeight: 0, clientWidth: 0, offsetTop: 0,
    files: [], checked: false, selectedIndex: 0, options: [], selectionStart: 0,
  };
  return el;
}
const store = {};
const storage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};

function runScreen(file, seed) {
  Object.keys(store).forEach(k => delete store[k]);
  if (seed) Object.assign(store, seed);

  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  const srcTags = [...src.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(m => m[1]);
  const inline = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);

  /* getElementById returns null for an id the page does not actually contain.
     A shim that vends an element for every id looks friendlier but is worse: it
     walks straight past guard clauses like `if (!btn) return;`, so a screen
     without Insert Mode appeared to crash in saveTextEditor() when the real
     browser exits early. It also hides the genuine "shared behaviour silently
     no-ops without this markup" traps (#toast, #listDetailHeader.active) that
     §16.10 documents. Ids are harvested from the page plus any injected by
     ensureSharedSheet()-style code at runtime. */
  const pageIds = new Set([...src.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const elCache = new Map();
  REG = { pageIds, elCache };
  const getEl = id => {
    if (elCache.has(id)) return elCache.get(id);
    if (!pageIds.has(id)) return null;
    const el = makeEl(id);
    elCache.set(id, el);
    return el;
  };
  /* Which ids are .bottom-sheet elements, harvested from the markup, so
     `querySelectorAll('.bottom-sheet.open')` can answer truthfully. Without
     this, sheet-exclusivity logic (openSheetExclusive) is untestable — the
     selector returns nothing and the function looks like a no-op. Class and id
     appear in either order in this codebase, so both are matched. */
  const sheetIds = new Set();
  for (const m of src.matchAll(/<div[^>]*>/g)) {
    const tag = m[0];
    if (!/class="[^"]*\bbottom-sheet\b/.test(tag)) continue;
    const idm = tag.match(/\bid="([^"]+)"/);
    if (idm) sheetIds.add(idm[1]);
  }
  const document = {
    documentElement: makeEl('html'),
    body: makeEl('body'),
    getElementById: id => getEl(id),
    querySelector: () => makeEl('qs'),
    querySelectorAll: (sel) => {
      // Both forms are used: closeAllSheets() queries '.bottom-sheet',
      // openSheetExclusive() queries '.bottom-sheet.open'. Answering only one
      // makes the other silently a no-op, which reads as a real bug.
      if (sel === '.bottom-sheet' || sel === '.bottom-sheet.open') {
        const onlyOpen = sel.endsWith('.open');
        return [...sheetIds].map(id => elCache.get(id))
          .filter(el => el && (!onlyOpen || el.classList.contains('open')));
      }
      return [];
    },
    // An element created and appended at runtime becomes findable by id, so
    // self-injecting shared sheets (ensureSharedSheet) behave realistically.
    createElement: t => {
      const el = makeEl(t);
      const orig = el.setAttribute;
      el.setAttribute = (k, v) => { if (k === 'id') { pageIds.add(String(v)); elCache.set(String(v), el); } orig(k, v); };
      Object.defineProperty(el, 'id', {
        get(){ return el._id || ''; },
        set(v){ el._id = String(v); pageIds.add(String(v)); elCache.set(String(v), el); },
      });
      return el;
    },
    addEventListener(){}, removeEventListener(){},
    createTextNode: () => makeEl('text'),
  };
  const win = {
    localStorage: storage, sessionStorage: storage, document,
    location: { href: '', search: '', pathname: '/x.html', reload(){} },
    navigator: { clipboard: { writeText: () => Promise.resolve() }, vibrate(){}, userAgent: 'node' },
    matchMedia: () => ({ matches: false, addEventListener(){}, addListener(){} }),
    setTimeout: (fn) => { try { typeof fn === 'function' && fn(); } catch (e) { throw e; } return 0; },
    clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    requestAnimationFrame: fn => { try { fn(0); } catch(e){ throw e; } return 0; },
    cancelAnimationFrame(){}, addEventListener(){}, removeEventListener(){},
    visualViewport: null, innerWidth: 390, innerHeight: 780, scrollTo(){},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    alert(){}, confirm: () => true, console,
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL(){} },
    FileReader: class { readAsDataURL(){ this.onload && this.onload({ target: { result: 'data:,' } }); } },
    Date, Math, JSON, Object, Array, String, Number, Boolean, Set, Map, RegExp, Error, isNaN, parseInt, parseFloat,
    encodeURIComponent, decodeURIComponent, Intl, Promise,
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win;

  const ctx = vm.createContext(win);
  const load = (code, name) => new vm.Script(code, { filename: name }).runInContext(ctx);

  for (const s of srcTags) {
    const p = s.startsWith('../../') ? path.join(ROOT, s.replace('../../', '')) : path.join(DIR, s);
    if (!fs.existsSync(p)) throw new Error('missing <script src>: ' + s);
    load(fs.readFileSync(p, 'utf8'), s);
  }
  inline.forEach((b, i) => load(b, file + '#inline' + i));
  return ctx;
}

const cases = [
  ['eam-wo-list-prototype-v5_1.html', null, 'cold'],
  ['eam-wo-list-prototype-v5_1.html', { eamListState: JSON.stringify({ woList: { curDS:'ds5', sv:'pump', cf:{status:['RELEASED']}, tf:{desc:'bear'}, dr:{from:'2026-07-01',to:''}, sortBy:'pr', sortDir:'desc', mode:'list', exp:{}, screen:'s2' } }) }, 'restoring saved list state'],
  ['eam-wo-list-prototype-v5_1.html', { eamPendingSpy: 'ds5' }, 'Home tile hand-off'],
  ['eam-equipment-list-prototype-v1.html', null, 'cold'],
  ['eam-equipment-list-prototype-v1.html', { eamListState: JSON.stringify({ equipList: { curDS:'pumps', sv:'', cf:{class:['PUMP']}, tf:{desc:'cent'}, sortBy:'assetId', sortDir:'desc', mode:'list', screen:'s2' } }) }, 'restoring saved list state'],
  ['eam-wo-record-view-prototype-v1.html', null, 'cold'],
  ['eam-equipment-record-view-prototype-v1.html', null, 'cold'],
  ['eam-equipment-record-view-prototype-v1.html', { eamOpenEquipment: JSON.stringify({ assetId:'00069045', desc:'Valve, Gate 6in', organization:'ORG2', class:'VALVE', category:'GATE', assignedTo:'JRODRIGUEZ' }) }, 'routed-in equipment'],
  ['eam-wo-reference-tab-prototype-v1.html', { eamReferenceTab: 'documents', eamOpenDemoWo: '19257' }, 'documents tab'],
  ['eam-wo-reference-tab-prototype-v1.html', { eamReferenceTab: 'comments' }, 'comments tab'],
  ['eam-wo-equipment-tab-prototype-v1.html', null, 'cold'],
  ['eam-activity-checklist-prototype-v2.html', null, 'cold'],
  ['eam-activity-checklist-prototype-v2.html', { eamWoEquipment: JSON.stringify({ '19257': { route: { code:'PUMPS', desc:'Monthly Pump Inspections' }, rows: [ {equip:'P-1042',desc:'Pump A',source:'route',childWo:'20451',parentWo:'19257'}, {equip:'P-1043',desc:'Pump B',source:'route',childWo:'20452',parentWo:'19257'} ] }, __nextChildWo: 20453 }) }, 'checklist fan-out (2 equipment)'],
  /* Scroll-mode A/B copy (temporary — delete these 3 cases with the file).
     Both modes get a cold case because the toggle picks the render path at
     init, so a break in either one is a break at load, not on interaction.
     The fan-out case is the one that matters: 3-panel rendering against real
     §16.9 fanned-out items, which is the state the whole experiment is for. */
  ['eam-activity-checklist-prototype-v2-scrollmode.html', null, 'cold (scroll mode, default)'],
  ['eam-activity-checklist-prototype-v2-scrollmode.html', { eamChecklistScrollMode: 'off' }, 'cold (paged mode — v2 path)'],
  ['eam-activity-checklist-prototype-v2-scrollmode.html', { eamWoEquipment: JSON.stringify({ '19257': { route: { code:'PUMPS', desc:'Monthly Pump Inspections' }, rows: [ {equip:'P-1042',desc:'Pump A',source:'route',childWo:'20451',parentWo:'19257'}, {equip:'P-1043',desc:'Pump B',source:'route',childWo:'20452',parentWo:'19257'} ] }, __nextChildWo: 20453 }) }, 'scroll mode + fan-out (2 equipment)'],
  ['eam-book-labor-prototype-v2.html', null, 'cold'],
  ['eam-wo-prototype-issue-parts-v1.html', null, 'cold'],
  ['eam-wo-closing-prototype-v2.html', null, 'cold'],
  ['eam-home-screen-prototype-v1.html', null, 'cold'],
  ['eam-notifications-prototype-v1.html', null, 'cold'],
  ['eam-sync-status-prototype-v1.html', null, 'cold'],
  ['eam-login-prototype-v1.html', null, 'cold'],
];

/* Exported so a behavioural test can reuse this shim instead of cloning it —
   runScreen() returns the live vm context, so a test can call the screen's own
   functions and read back what they rendered. Guarded by require.main so
   requiring this file doesn't run the whole census as a side effect. */
module.exports = { runScreen };
if (require.main !== module) return;

let fail = 0;
for (const [file, seed, label] of cases) {
  try {
    runScreen(file, seed);
    console.log('  PASS  ' + file.replace('eam-','').replace('-prototype','') + '  [' + label + ']');
  } catch (e) {
    fail++;
    console.log('  FAIL  ' + file + '  [' + label + ']');
    console.log('          ' + String(e.message).split('\n')[0]);
    const line = (e.stack || '').split('\n').find(l => l.includes('#inline') || l.includes('eam-shared'));
    if (line) console.log('          at ' + line.trim());
  }
}
console.log(fail ? '\n' + fail + ' screen load(s) FAILED' : '\nevery screen loads cleanly');
process.exit(fail ? 1 : 0);
