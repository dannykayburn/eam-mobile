#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   build-scope-deck.js — regenerates docs/EAM-Mobile-Project-Scope.pptx

   WHY THIS FILE IS TRACKED AND THE DECK IS NOT.  `.gitignore` keeps `.pptx`
   out of this repo on purpose: the repo is all-text so everything diffs, and a
   pptx is a zip of XML that git can only store as a fresh blob per rebuild.
   That rule only holds if the binary stays REPRODUCIBLE from something tracked
   — so this generator is the tracked source, and the deck is a build artifact.
   Content comes from `docs/Total Project Scope Summary brief.md`; if that doc
   and this file ever disagree, the doc is right and this needs regenerating.

   IT IS BUILT ON OCTAVE'S OWN BRAND TEMPLATE, which is also gitignored
   (`docs/Demo PPT Template - Octave.pptx`, a binary that belongs in Octave's
   store rather than here).  So this script needs that file present and exits
   with a clear message if it is not.  Everything brand-owned is INHERITED
   rather than restated: the slide master, all 47 layouts, the theme, the
   fonts, the footer furniture and the logo art all come from the template
   untouched.  What this script writes is only the content.

   THE TEMPLATE IS ALREADY A BLACK DECK — do not add background overrides.
   Its master carries `clrMap bg1="dk1" tx1="lt1"`, so the inherited
   background is Octave Black #1A1A1F and inherited text is white.  Setting a
   background per slide would be both redundant and a way to drift off-brand.

   ACCENTS COME FROM THE TEMPLATE'S OWN "Black mode extended palette"
   (its slide 7, before this script deletes it).  That palette has NO BLUE —
   blue is white-mode only — which is why nothing here is blue.

   USAGE
     node docs/scripts/build-scope-deck.js            # writes the default path
     node docs/scripts/build-scope-deck.js out.pptx   # writes somewhere else

   No npm dependencies and no external binaries — it reads and writes the
   zip itself, and edits the template's OOXML directly, because pptxgenjs
   cannot open a template.
   ───────────────────────────────────────────────────────────────────────── */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ── A MINIMAL ZIP READER AND WRITER, IN PURE NODE ──
   A .pptx is a zip, and this script has to open one and write one. It does
   that here rather than shelling out to `unzip`/`zip`, for two reasons: this
   is a Windows repo where neither is guaranteed on PATH (`zip` is not), and
   PowerShell's Compress-Archive writes BACKSLASH entry names, which produce a
   package Office and macOS both mishandle — see the repo's zip-handoff note.
   Entry names here are always forward-slashed, and insertion order is kept so
   [Content_Types].xml stays first. */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return buf => {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function zipRead(file) {
  const b = fs.readFileSync(file);
  let eocd = -1;
  for (let i = b.length - 22; i >= 0 && i > b.length - 66000; i--) {
    if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip: ' + file);
  const count = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let n = 0; n < count; n++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = b.readUInt16LE(p + 10);
    const compSize = b.readUInt32LE(p + 20);
    const nameLen = b.readUInt16LE(p + 28);
    const extraLen = b.readUInt16LE(p + 30);
    const cmtLen = b.readUInt16LE(p + 32);
    const lho = b.readUInt32LE(p + 42);
    const name = b.slice(p + 46, p + 46 + nameLen).toString('utf8');
    const lNameLen = b.readUInt16LE(lho + 26);
    const lExtraLen = b.readUInt16LE(lho + 28);
    const start = lho + 30 + lNameLen + lExtraLen;
    const raw = b.slice(start, start + compSize);
    out.set(name, method === 8 ? zlib.inflateRawSync(raw) : raw);
    p += 46 + nameLen + extraLen + cmtLen;
  }
  return out;
}

function zipWrite(file, entries) {
  const locals = [], central = [];
  let offset = 0;
  for (const [name, dataIn] of entries) {
    const data = Buffer.isBuffer(dataIn) ? dataIn : Buffer.from(dataIn, 'utf8');
    const nm = Buffer.from(name.replace(/\\/g, '/'), 'utf8');
    const def = zlib.deflateRawSync(data, { level: 9 });
    const store = def.length >= data.length;
    const body = store ? data : def;
    const method = store ? 0 : 8;
    const crc = CRC(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(method, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nm.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, nm, body);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8); cd.writeUInt16LE(method, 10); cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(nm.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nm);
    offset += lh.length + nm.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12); eocd.writeUInt32LE(offset, 16);
  fs.writeFileSync(file, Buffer.concat([Buffer.concat(locals), cdBuf, eocd]));
}

const REPO = path.resolve(__dirname, '..', '..');
const TEMPLATE = path.join(REPO, 'docs', 'Demo PPT Template - Octave.pptx');
const OUT = process.argv[2] || path.join(REPO, 'docs', 'EAM-Mobile-Project-Scope.pptx');

if (!fs.existsSync(TEMPLATE)) {
  console.error('Octave brand template not found:\n  ' + TEMPLATE +
    '\n\nIt is gitignored, so a fresh clone will not have it. Get it from the\n' +
    'Octave brand store and drop it in docs/ under exactly that name.');
  process.exit(1);
}

/* ── OCTAVE BLACK MODE PALETTE (the template's own slide 7) ── */
const WHITE = 'FFFFFF';   // White
const G1    = 'E7EBF2';   // Gray 1
const G2    = 'CBD0D8';   // Gray 2
const G3    = 'B2B8C4';   // Gray 3
const G4    = '6F7480';   // Gray 4
const G5    = '3E4047';   // Gray 5
const BLACK = '1A1A1F';   // Octave Black
const AQUA  = '00FFFF';   // Aqua
const GREEN = '4FFF00';   // Green
const YEL   = 'FFF500';   // Yellow
const PINK  = 'FF00C7';   // Pink
const ORANGE= 'F46600';   // Orange
const FONT  = 'MW Sans';  // the brand face the template's own slides use

/* ── THE TEMPLATE'S CONTENT GRID, measured off its layouts ──
   Left margin 1.45", right edge 12.91" (so 11.46" of usable width), and a
   "Title Only" title band ending around y=1.30. Everything below is authored
   against those numbers rather than invented ones. */
const E = 914400;                       // EMU per inch
const L = 1.45, R = 12.91, CW = R - L;  // content left / right / width
const TOP = 1.44;                       // first row under the title band
const SLIDE_H = 7.5;

const emu = n => Math.round(n * E);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── OOXML fragment helpers ─────────────────────────────────────────────── */
let uid = 100;
const nextId = () => ++uid;

function xfrm(x, y, w, h) {
  return `<a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm>`;
}

/* One paragraph. `runs` is [{t, sz, b, i, color, spc}]. */
function para(runs, opts) {
  const o = opts || {};
  const pPr = `<a:pPr algn="${o.align || 'l'}"${o.spcAft ? ` ><a:spcAft><a:spcPts val="${o.spcAft * 100}"/></a:spcAft></a:pPr>` : '/>'}`;
  const body = runs.map(r => {
    const props = [
      `lang="en-GB"`,
      `sz="${(r.sz || 14) * 100}"`,
      r.b ? 'b="1"' : '',
      r.i ? 'i="1"' : '',
      r.spc ? `spc="${Math.round(r.spc * 100)}"` : '',
      'dirty="0"',
    ].filter(Boolean).join(' ');
    return `<a:r><a:rPr ${props}><a:solidFill><a:srgbClr val="${r.color || WHITE}"/></a:solidFill>` +
      `<a:latin typeface="${FONT}"/><a:cs typeface="${FONT}"/></a:rPr>` +
      `<a:t>${esc(r.t)}</a:t></a:r>`;
  }).join('');
  return `<a:p>${pPr}${body}</a:p>`;
}

/* A text box. `paras` is an array of para() strings. */
function textBox(x, y, w, h, paras, opts) {
  const o = opts || {};
  const anchor = o.valign === 'middle' ? ' anchor="ctr"' : o.valign === 'bottom' ? ' anchor="b"' : '';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="TextBox ${uid}"/>` +
    `<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr>${xfrm(x, y, w, h)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"${anchor}><a:noAutofit/></a:bodyPr>` +
    `<a:lstStyle/>${paras.join('')}</p:txBody></p:sp>`;
}

/* A shape with a fill and/or an outline. */
function shape(prst, x, y, w, h, opts) {
  const o = opts || {};
  const fill = o.fill ? `<a:solidFill><a:srgbClr val="${o.fill}"/></a:solidFill>` : '<a:noFill/>';
  const line = o.line
    ? `<a:ln w="${Math.round((o.lineW || 1) * 12700)}"><a:solidFill><a:srgbClr val="${o.line}"/></a:solidFill></a:ln>`
    : '<a:ln><a:noFill/></a:ln>';
  const adj = prst === 'roundRect'
    ? `<a:avLst><a:gd name="adj" fmla="val ${Math.round((o.radius || 0.06) / Math.min(w, h) * 100000)}"/></a:avLst>`
    : '<a:avLst/>';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="Shape ${uid}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr>${xfrm(x, y, w, h)}<a:prstGeom prst="${prst}">${adj}</a:prstGeom>${fill}${line}</p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
}

/* ── COMPOSITES. The repeated motif is a bordered card with an Octave chip or
      a ring-numbered step; never an edge stripe or an accent rule. ── */
const card = (x, y, w, h, fill) => shape('roundRect', x, y, w, h,
  { fill: fill || BLACK, line: G5, lineW: 1, radius: 0.08 });

function chip(x, y, label, color) {
  const w = 0.098 * label.length + 0.40;
  return shape('roundRect', x, y, w, 0.29, { fill: BLACK, line: color, lineW: 1, radius: 0.145 }) +
    textBox(x, y, w, 0.29, [para([{ t: label, sz: 9.5, b: true, color, spc: 0.5 }], { align: 'ctr' })],
      { valign: 'middle' });
}

function ring(x, y, n, color) {
  return shape('ellipse', x, y, 0.40, 0.40, { fill: BLACK, line: color, lineW: 1.75 }) +
    textBox(x, y, 0.40, 0.40, [para([{ t: String(n), sz: 13, b: true, color }], { align: 'ctr' })],
      { valign: 'middle' });
}

const dot = (x, y, color) => shape('ellipse', x, y, 0.14, 0.14, { fill: color });

const eyebrow = (x, y, w, t, color) =>
  textBox(x, y, w, 0.24, [para([{ t: t.toUpperCase(), sz: 9.5, b: true, color: color || AQUA, spc: 1.6 }])]);

const body = (x, y, w, h, t, sz, color) =>
  textBox(x, y, w, h, [para([{ t, sz: sz || 10.5, color: color || G2 }])]);

const lead = (x, y, w, t, sz, h) =>
  textBox(x, y, w, h || 0.30, [para([{ t, sz: sz || 12.5, b: true, color: WHITE }])]);

/* Bulleted list, one paragraph per item, spaced with spcAft. */
function bullets(x, y, w, h, items, sz) {
  return textBox(x, y, w, h, items.map(it =>
    `<a:p><a:pPr marL="171450" indent="-171450" algn="l"><a:spcAft><a:spcPts val="500"/></a:spcAft>` +
    `<a:buChar char="•"/></a:pPr>` +
    `<a:r><a:rPr lang="en-GB" sz="${(sz || 11) * 100}" dirty="0"><a:solidFill><a:srgbClr val="${G1}"/></a:solidFill>` +
    `<a:latin typeface="${FONT}"/><a:cs typeface="${FONT}"/></a:rPr><a:t>${esc(it)}</a:t></a:r></a:p>`));
}

/* The layout's own Title placeholder — inherits brand position and type. */
function titlePh(text) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="Title ${uid}"/>` +
    `<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>` +
    `<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>` +
    `<a:p><a:r><a:rPr lang="en-GB" dirty="0"/><a:t>${esc(text)}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

/* A body placeholder by idx, for the layouts that have one (L46). */
function bodyPh(idx, text) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="Text ${uid}"/>` +
    `<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>` +
    `<p:nvPr><p:ph type="body" idx="${idx}"/></p:nvPr></p:nvSpPr>` +
    `<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>` +
    `<a:p><a:r><a:rPr lang="en-GB" dirty="0"/><a:t>${esc(text)}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

const SLD_OPEN = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
  '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
  '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
  '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const SLD_CLOSE = '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';

const slides = [];               // { layout, xml, notes }
const add = (layout, parts, notes) =>
  slides.push({ layout, xml: SLD_OPEN + parts.join('') + SLD_CLOSE, notes });

/* ════════════════════════════════════════════════════════════════════════
   2 — WHY WE ARE REBUILDING                                    Title Only
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('Why we are rebuilding, not extending')];
  const themes = [
    ['Two separate mobile apps', 'Digital Work and EAM Offline behave, navigate and license differently.'],
    ['Offline sync reliability', 'Work is lost if connectivity drops mid-save. No queue, no confirmation.'],
    ['Training dependency', 'Record-centric workflows demand tribal knowledge the workforce lacks.'],
    ['Hybrid connectivity', 'Customers want one continuum — not a mode choice, not an app choice.'],
  ];
  let y = TOP + 0.20;
  themes.forEach(([t, d]) => {
    p.push(dot(L, y + 0.08, ORANGE));
    p.push(lead(L + 0.30, y - 0.02, 5.7, t, 12.5));
    p.push(body(L + 0.30, y + 0.28, 5.7, 0.44, d));
    y += 0.92;
  });
  const cx = L + 6.35;
  p.push(card(cx, TOP + 0.20, CW - 6.35, 3.50));
  p.push(eyebrow(cx + 0.34, TOP + 0.48, 4.4, 'The prior attempt', ORANGE));
  p.push(textBox(cx + 0.34, TOP + 0.86, CW - 6.35 - 0.70, 1.40,
    [para([{ t: '"Downloads so much data that it causes performance problems and crashes."', sz: 17, b: true }])]));
  p.push(body(cx + 0.34, TOP + 2.36, CW - 6.35 - 0.70, 1.10,
    'That single fact is why v1 is online-first rather than offline-first — and it is the test any offline-scope proposal has to pass.'));
  p.push(textBox(L, SLIDE_H - 0.92, CW, 0.26,
    [para([{ t: 'Source: SWG advisory / Voice-of-the-Customer themes — all four rated High.', sz: 9, i: true, color: G4 }])]));
  add(9, p, 'All four themes are High priority. The prior attempt is the constraint every offline decision answers to.');
}

/* ════════════════════════════════════════════════════════════════════════
   3 — TWO SURFACES                                             Title Only
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('The whole programme is two surfaces')];
  p.push(textBox(L, TOP - 0.06, CW, 0.28, [para([
    { t: 'Desktop UI is out of scope entirely. There is the mobile app, and the portal that configures it. Total.', sz: 11.5, i: true, color: G3 }])]));
  const cols = [
    [L, AQUA, '1', 'Mobile Configuration Portal', 'Administrator',
      ['Web app, on the Octave design system', 'Authors the metadata the app consumes',
       'Four areas over one membership table', 'Assignment resolves per user group'],
      'Workflows   ·   Home Layouts   ·   Offline Profiles   ·   User Groups'],
    [L + CW / 2 + 0.16, GREEN, '2', 'Mobile Application', 'Technician — executor of work',
      ['Native, offline-capable, online-first', 'Guided 5-step work-order execution',
       '46 surfaces across 7 groups', 'Every screen resolved from configuration'],
      'App Shell  ·  Home  ·  Search  ·  WO  ·  Equipment  ·  Sync  ·  Notifications'],
  ];
  const w = CW / 2 - 0.16;
  cols.forEach(([x, c, n, title, persona, items, strip]) => {
    p.push(card(x, TOP + 0.32, w, 4.10));
    p.push(ring(x + 0.34, TOP + 0.62, n, c));
    p.push(lead(x + 0.92, TOP + 0.64, w - 1.20, title, 16));
    p.push(textBox(x + 0.92, TOP + 0.96, w - 1.20, 0.26, [para([{ t: persona, sz: 10.5, color: c }])]));
    p.push(bullets(x + 0.38, TOP + 1.50, w - 0.76, 1.80, items, 11));
    p.push(body(x + 0.38, TOP + 3.58, w - 0.76, 0.62, strip, 9.5, G4));
  });
  p.push(textBox(L, SLIDE_H - 0.92, CW, 0.26, [para([
    { t: 'Two personas, two design systems, one membership table between them. No component crosses the seam unchanged.', sz: 9, i: true, color: G4 }])]));
  add(9, p, 'NG8 put the base desktop UI out of scope. This programme has exactly these two surfaces.');
}

/* ════════════════════════════════════════════════════════════════════════
   4 — HOW THE PIECES FIT                                       Title Only
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('How the pieces fit together')];
  const steps = [
    ['Author',  'Admin builds workflows, Home layouts and offline profiles in the portal — once, as artifacts.', AQUA],
    ['Bind',    'One membership table maps each artifact to a user group. Read both ways, never copied.', G2],
    ['Serve',   'A real JSON API in front of the page-layout and workflow tables. The largest unowned piece.', YEL],
    ['Resolve', 'On login the app fetches Tier 0 config — layout first, because layout scopes all after it.', GREEN],
    ['Execute', 'The technician works a numbered, gated flow. One write path, always through the outbox.', PINK],
  ];
  const gap = 0.26, cw = (CW - 4 * gap) / 5;
  steps.forEach(([t, d, c], i) => {
    const x = L + i * (cw + gap);
    p.push(card(x, TOP + 0.10, cw, 2.72));
    p.push(ring(x + 0.26, TOP + 0.36, i + 1, c));
    p.push(lead(x + 0.26, TOP + 0.92, cw - 0.52, t, 14));
    p.push(body(x + 0.26, TOP + 1.26, cw - 0.48, 1.46, d, 9.5));
    if (i < 4) p.push(textBox(x + cw + 0.02, TOP + 1.30, gap - 0.04, 0.28,
      [para([{ t: '›', sz: 15, b: true, color: G4 }], { align: 'ctr' })]));
  });
  p.push(card(L, TOP + 3.06, CW, 1.56, BLACK));
  p.push(eyebrow(L + 0.34, TOP + 3.28, CW - 0.68, 'Three rules that hold across the whole chain', G3));
  [['Layout is data, not code', 'Which fields appear, in what order, and which steps exist.'],
   ['Placement governs payload', 'What downloads, not just what displays.'],
   ['Records degrade, config does not', 'Fewer rows is a short list. A missing layout is a blank screen.']]
    .forEach(([t, d], i) => {
      const x = L + 0.34 + i * ((CW - 0.68) / 3);
      p.push(lead(x, TOP + 3.62, (CW - 0.68) / 3 - 0.25, t, 11.5));
      p.push(body(x, TOP + 3.90, (CW - 0.68) / 3 - 0.25, 0.60, d, 9.5));
    });
  add(9, p, 'Linger here. Author, Bind, Serve, Resolve, Execute. Step 3, the API, has no owner today.');
}

/* ════════════════════════════════════════════════════════════════════════
   5 — THE PORTAL'S FOUR AREAS                                  Title Only
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('The portal: four areas, one membership table')];
  const areas = [
    ['WORKFLOWS', AQUA, 'Drag-and-drop canvas of step instances, with Screen Designer opening as a panel per node. One workflow per WO Type, plus one Free Form.'],
    ['HOME LAYOUTS', G2, 'Layout, section and placement over a global tile catalogue. Also authors the app bottom navigation bar — up to five slots.'],
    ['OFFLINE PROFILES', GREEN, 'Per-entity registry: four policies on the capability axis, with caps shown and computed against. Also carries the punch-list dataspy.'],
    ['USER GROUPS', PINK, 'The inverse view, and a binding surface only. Assignment — never steps, gating or layout. Create refuses here.'],
  ];
  const w = CW / 2 - 0.16, h = 1.56;
  areas.forEach(([t, c, d], i) => {
    const x = L + (i % 2) * (CW / 2 + 0.16), y = TOP + 0.06 + Math.floor(i / 2) * (h + 0.22);
    p.push(card(x, y, w, h));
    p.push(chip(x + 0.32, y + 0.26, t, c));
    p.push(body(x + 0.32, y + 0.70, w - 0.64, 0.80, d, 10.5));
  });
  p.push(card(L, TOP + 3.66, CW, 1.00, BLACK));
  p.push(textBox(L + 0.34, TOP + 3.86, CW - 0.68, 0.70, [para([
    { t: 'One paradigm for all four. ', sz: 10.5, b: true },
    { t: 'Every artifact is authored once and applied. Assignment runs both directions over a single {type, artifact, group} table — four parallel arrays is the failure mode. Cardinality follows what the runtime resolves on.', sz: 10.5, color: G2 }])]));
  p.push(textBox(L, SLIDE_H - 0.92, CW, 0.26, [para([
    { t: 'User Groups sits under Security, where a group is created. The other three sit under Mobile configuration.', sz: 9, i: true, color: G4 }])]));
  add(9, p);
}

/* ════════════════════════════════════════════════════════════════════════
   6 — THE WORKFLOW CANVAS                          Three Columns Large Text
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('The guided flow is authored, not coded')];
  const kinds = [
    ['STEPS', GREEN, 'A screen the technician visits',
      ['Record View', 'Activity Checklist', 'Issue Parts', 'Book Labor', 'WO Closing', 'A User Defined Screen'],
      'Numbered, gated, carries a layout'],
    ['FORKS', YEL, 'Routes the flow forward only',
      ['Question — asks, then routes', 'Condition — reads a field, then routes'],
      'No number, no gate, positional'],
    ['ACTIONS', PINK, 'Performs work with no screen',
      ['Status update', 'Start Timer', 'Stop Timer — books the time'],
      'System, or user-confirmed'],
  ];
  /* L22's own three columns: x = 1.45 / 5.33 / 9.21, each 3.70 wide. */
  const xs = [1.45, 5.33, 9.21], w = 3.70;
  kinds.forEach(([t, c, sub, items, note], i) => {
    const x = xs[i];
    p.push(card(x, TOP + 0.54, w, 3.42));
    p.push(chip(x + 0.28, TOP + 0.80, t, c));
    p.push(lead(x + 0.28, TOP + 1.22, w - 0.56, sub, 11));
    p.push(bullets(x + 0.28, TOP + 1.58, w - 0.56, 1.70, items, 10.5));
    p.push(textBox(x + 0.28, TOP + 3.48, w - 0.56, 0.32,
      [para([{ t: note, sz: 9.5, i: true, color: c }])]));
  });
  p.push(card(L, TOP + 4.20, CW, 0.92, BLACK));
  p.push(textBox(L + 0.34, TOP + 4.40, CW - 0.68, 0.62, [para([
    { t: 'Actions fire on Next Step. ', sz: 10.5, b: true },
    { t: 'A Stop Timer action books the labour itself, because every Add Labor field is derivable from a running timer — which is what lets Book Labor move out of the numbered flow entirely.', sz: 10.5, color: G2 }])]));
  add(22, p);
}

/* ════════════════════════════════════════════════════════════════════════
   7 — THE INSTANCE DIMENSION                                   Title Only
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('Instance: what makes the canvas work')];
  p.push(textBox(L, TOP - 0.06, CW, 0.28, [para([
    { t: 'Placing the same screen twice, and placing an action more than once, are the same requirement. One dimension on the key buys both.', sz: 11.5, color: G3 }])]));
  const hw = CW / 2 - 0.16;
  p.push(card(L, TOP + 0.34, hw, 1.96, BLACK));
  p.push(eyebrow(L + 0.32, TOP + 0.56, hw - 0.64, 'The resolution key', G3));
  p.push(textBox(L + 0.32, TOP + 0.88, hw - 0.60, 0.46,
    [para([{ t: 'Screen · Instance · WO Type · User Group', sz: 14.5, b: true }])]));
  p.push(body(L + 0.32, TOP + 1.38, hw - 0.64, 0.80,
    'Plus Function. Instance 1 keeps the bare screen id, so nothing migrates.'));
  const rx = L + CW / 2 + 0.16;
  p.push(card(rx, TOP + 0.34, hw, 1.96, BLACK));
  p.push(eyebrow(rx + 0.32, TOP + 0.56, hw - 0.64, 'What it unlocks', GREEN));
  p.push(bullets(rx + 0.32, TOP + 0.90, hw - 0.64, 1.30, [
    'Record View twice, each with its own layout',
    'Any screen placed more than once in one flow',
    'A status update or timer placed more than once'], 10.5));
  const traps = [
    ['Each instance deep-copies its layout', 'Pointing two instances at one layout object renders perfectly and makes the whole feature impossible.', ORANGE],
    ['Numbers are reused, not climbed', 'The number is part of the layout key, so a monotonic counter orphans layout rows.', YEL],
    ['A non-step node carries no layout', 'For a fork or an action the instance is ordering identity, and nothing more.', G2],
  ];
  const tw = (CW - 0.52) / 3;
  traps.forEach(([t, d, c], i) => {
    const x = L + i * (tw + 0.26);
    p.push(card(x, TOP + 2.48, tw, 2.06));
    p.push(dot(x + 0.28, TOP + 2.78, c));
    p.push(lead(x + 0.54, TOP + 2.66, tw - 0.82, t, 11.5, 0.52));
    p.push(body(x + 0.28, TOP + 3.30, tw - 0.56, 1.08, d, 9.5));
  });
  p.push(textBox(L, SLIDE_H - 0.92, CW, 0.26, [para([
    { t: 'A layout is keyed on the screen, not the step. Where it sits in the flow is a separate property of the row.', sz: 9, i: true, color: G4 }])]));
  add(9, p, 'Screen = which screen. Instance = which occurrence. Step = where it sits, and that is NOT in the layout key.');
}

/* ════════════════════════════════════════════════════════════════════════
   8 — THE GUIDED FLOW                                          Title Only
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('The app: the guided work-order flow')];
  p.push(textBox(L, TOP - 0.06, CW, 0.28, [para([
    { t: 'The default shape, not a fixed set — membership, order and gating are all configuration.', sz: 11.5, color: G3 }])]));
  const steps = [
    ['WO Record View', 'The record under a resolved layout. Start Work lives here.'],
    ['Activity Checklist', 'One item at a time. Equipment-scoped items fan out per asset.'],
    ['Issue Parts', 'Planned lines plus ad-hoc add, with store, bin and lot picking.'],
    ['Book Labor', 'Employee, crew, trade, hours. A crew expands per member.'],
    ['WO Closing', 'Status, closing codes with sequential unlock, downtime.'],
  ];
  const gap = 0.26, cw = (CW - 4 * gap) / 5;
  steps.forEach(([t, d], i) => {
    const x = L + i * (cw + gap);
    p.push(card(x, TOP + 0.32, cw, 2.40));
    p.push(ring(x + 0.26, TOP + 0.56, i + 1, GREEN));
    p.push(lead(x + 0.26, TOP + 1.08, cw - 0.52, t, 12.5, 0.50));
    p.push(body(x + 0.26, TOP + 1.66, cw - 0.48, 0.94, d, 9.5));
  });
  const hw = CW / 2 - 0.16;
  p.push(card(L, TOP + 2.96, hw, 1.86, BLACK));
  p.push(eyebrow(L + 0.32, TOP + 3.18, hw - 0.64, 'Start Work is the commitment boundary', YEL));
  p.push(body(L + 0.32, TOP + 3.52, hw - 0.64, 1.20,
    'Five things happen at once and only make sense together: status moves, WO Type protects, the order pins to the technician, child records hydrate, and the config version is stamped.'));
  const rx = L + CW / 2 + 0.16;
  p.push(card(rx, TOP + 2.96, hw, 1.86, BLACK));
  p.push(eyebrow(rx + 0.32, TOP + 3.18, hw - 0.64, 'Gating is forward-only', GREEN));
  p.push(body(rx + 0.32, TOP + 3.52, hw - 0.64, 1.20,
    'A later step stays locked and explains why. A completed step is always reopenable — forward order never means the technician cannot go back. Out-of-flow tabs sit in a More group.'));
  add(9, p);
}

/* ════════════════════════════════════════════════════════════════════════
   9 — THE SURFACE INVENTORY                                    Title Only
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('46 surfaces, positioned to be developed')];
  const groups = [
    ['5',  'App Shell',     'Login, bottom nav, profile menu, sync control, Insert Mode', G2],
    ['2',  'Home',          'Home screen and the Create menu', AQUA],
    ['2',  'Search',        'Work orders and equipment, one reused standard', AQUA],
    ['14', 'Work Order',    'List, five steps, four child tabs, three action prompts', GREEN],
    ['12', 'Equipment',     'List, record view, ten child tabs', YEL],
    ['2',  'Sync Status',   'The panel, and the full status screen', ORANGE],
    ['1',  'Notifications', 'A first-class inbox, not a settings screen', PINK],
    ['46', 'Total',         'Every one resolved from configuration, not built per customer', WHITE],
  ];
  const cw = (CW - 3 * 0.24) / 4, ch = 2.12;
  groups.forEach(([n, t, d, c], i) => {
    const x = L + (i % 4) * (cw + 0.24), y = TOP + 0.10 + Math.floor(i / 4) * (ch + 0.24);
    p.push(card(x, y, cw, ch));
    p.push(textBox(x + 0.26, y + 0.18, cw - 0.52, 0.76,
      [para([{ t: n, sz: 38, b: true, color: c }])]));
    p.push(lead(x + 0.26, y + 0.96, cw - 0.52, t, 12.5));
    p.push(body(x + 0.26, y + 1.28, cw - 0.50, 0.78, d, 9.5));
  });
  add(9, p);
}

/* ════════════════════════════════════════════════════════════════════════
   10 — DESIGN PRINCIPLES                           Three Columns Large Text
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('Three rules the app never breaks')];
  const ps = [
    ['No Edit Mode', GREEN, 'No Edit button, no form mode. Every editable field is tapped in place and edits through a bottom sheet. The biggest departure from both legacy apps.'],
    ['Insert is separate from Update', AQUA, 'One create path, always locked to an entity before it opens. Required-field markers exist here and nowhere else, because a blank form has nothing to clear yet.'],
    ['No explicit Save', PINK, 'Changes commit as they are made; the form stays dirty until the technician navigates away. Writes return from the outbox immediately, so nothing blocks.'],
  ];
  const xs = [1.45, 5.33, 9.21], w = 3.70;
  ps.forEach(([t, c, d], i) => {
    const x = xs[i];
    p.push(card(x, TOP + 0.54, w, 2.32));
    p.push(ring(x + 0.28, TOP + 0.80, i + 1, c));
    p.push(lead(x + 0.28, TOP + 1.34, w - 0.56, t, 14));
    p.push(body(x + 0.28, TOP + 1.92, w - 0.56, 0.88, d, 9.5));
  });
  p.push(card(L, TOP + 3.10, CW, 2.02, BLACK));
  p.push(eyebrow(L + 0.34, TOP + 3.32, CW - 0.68, 'And one continuum, never a mode', G3));
  [['Online-first reads', 'The server answers at full fidelity. The local store is a scoped fallback, never a replica of the database.'],
   ['One write path', 'Byte-identical online and offline. Every write lands in a persisted outbox in one transaction, and survives app kill.'],
   ['Nothing silently discarded', 'Conflicts resolve per write shape. Every failed write is inspectable and actionable on the device.'],
   ['Offline is provisioned', 'A named profile per user group. Admin-provisioned, invisible to the technician, fixed for the session.']]
    .forEach(([t, d], i) => {
      const x = L + 0.34 + (i % 2) * ((CW - 0.68) / 2), y = TOP + 3.66 + Math.floor(i / 2) * 0.72;
      p.push(lead(x, y, (CW - 0.68) / 2 - 0.30, t, 11.5));
      p.push(body(x, y + 0.26, (CW - 0.68) / 2 - 0.30, 0.46, d, 9));
    });
  add(22, p, 'Database-wide search does not work offline, and the app says so. That is the question the offline model turns on.');
}

/* ════════════════════════════════════════════════════════════════════════
   11 — WHERE WE ARE                                            Title Only
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('Where the project actually is')];
  const stats = [
    ['15', 'app screens prototyped', 'Navigable, on one shared component system, decisions locked.', GREEN],
    ['1', 'configuration portal', 'All four areas built, on the Octave design system.', AQUA],
    ['10k', 'lines of locked spec', 'Every design rule, with its rationale and rejected alternatives.', G2],
  ];
  const cw = (CW - 2 * 0.26) / 3;
  stats.forEach(([n, t, d, c], i) => {
    const x = L + i * (cw + 0.26);
    p.push(card(x, TOP + 0.10, cw, 2.00));
    p.push(textBox(x + 0.28, TOP + 0.28, cw - 0.56, 0.80, [para([{ t: n, sz: 40, b: true, color: c }])]));
    p.push(lead(x + 0.28, TOP + 1.12, cw - 0.56, t, 12.5));
    p.push(body(x + 0.28, TOP + 1.44, cw - 0.54, 0.62, d, 9.5));
  });
  const hw = CW / 2 - 0.16;
  p.push(card(L, TOP + 2.36, hw, 2.52, BLACK));
  p.push(eyebrow(L + 0.32, TOP + 2.58, hw - 0.64, 'What does not exist yet', ORANGE));
  p.push(bullets(L + 0.32, TOP + 2.94, hw - 0.64, 1.86, [
    'A data layer',
    'An API contract or field-mapping artifact',
    'Tests, an accessibility pass, i18n',
    'Anything that feeds a workflow definition to the app'], 11));
  const rx = L + CW / 2 + 0.16;
  p.push(card(rx, TOP + 2.36, hw, 2.52, BLACK));
  p.push(eyebrow(rx + 0.32, TOP + 2.58, hw - 0.64, 'The sequence that follows from it', YEL));
  [['M0–M3', 'Architecture sign-off, backend owners, engine spike, shell proof-of-concept'],
   ['M4', 'The data layer lands — nothing user-facing is trustworthy before this'],
   ['M5–M6', 'Nav shell extracted, then the WO workflow ported in flow order'],
   ['M7–M9', 'Equipment track, app-shell screens, and the portal as its own web app']]
    .forEach(([k, d], i) => {
      const y = TOP + 2.96 + i * 0.48;
      p.push(textBox(rx + 0.32, y, 0.86, 0.26, [para([{ t: k, sz: 10.5, b: true, color: G1 }])]));
      p.push(body(rx + 1.24, y, hw - 1.58, 0.44, d, 9.5));
    });
  add(9, p);
}

/* ════════════════════════════════════════════════════════════════════════
   12 — DECISIONS OWED                                          Title Only
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('Eight decisions owed at the onset')];
  p.push(textBox(L, TOP - 0.06, CW, 0.28, [para([
    { t: 'Not screen-level behaviour. Each of these binds something before it can be built.', sz: 11.5, color: G3 }])]));
  const ds = [
    ['1', 'Portal UI', 'Octave Experience, or new base UI? Weigh on-premise deployment, team dependencies and longevity — is it a two-way door?', ORANGE],
    ['2', 'Workflow execution in base', 'Reuse WSJOBS master functions, or new construction? And can the authored workflows eventually run from base?', ORANGE],
    ['3', 'The layout / workflow API', 'The portal authors workflows and the app cannot yet be told about them. The largest unowned piece.', ORANGE],
    ['4', 'Equipment function', 'A function that renders by equipment type is required and unspecified. Blocks the Equipment track entirely.', YEL],
    ['5', 'Offline scope vs. shipping', 'We narrow what the live product already downloads. Communicate the regression, or give it a bounded carve-out.', YEL],
    ['6', 'Punch list backend ask', 'A pinned row must record which source pinned it, or re-evaluating the dataspy evicts a technician’s own addition.', YEL],
    ['7', 'Sencha-to-Angular migration', 'An unowned dependency. It implies the real API that decision 3 needs, and phone-width is unconfirmed.', G2],
    ['8', 'Conditional field rules', 'Deferred on purpose. Only the two one-way doors are owed up front — do not pick a tier now.', G2],
  ];
  const w = CW / 2 - 0.16, h = 1.06;
  ds.forEach(([n, t, d, c], i) => {
    const x = L + (i % 2) * (CW / 2 + 0.16), y = TOP + 0.34 + Math.floor(i / 2) * (h + 0.16);
    p.push(card(x, y, w, h));
    p.push(ring(x + 0.22, y + 0.32, n, c));
    p.push(lead(x + 0.76, y + 0.16, w - 1.00, t, 11.5));
    p.push(body(x + 0.76, y + 0.44, w - 1.02, 0.56, d, 9.5));
  });
  p.push(textBox(L, SLIDE_H - 0.86, CW, 0.26, [para([
    { t: 'Decisions 1 and 2 are entangled, and 1 precedes everything else here. Full framing in the design doc.', sz: 9, i: true, color: G4 }])]));
  add(9, p);
}

/* ════════════════════════════════════════════════════════════════════════
   13 — THE ASK                                              Closing slide
   ════════════════════════════════════════════════════════════════════════ */
{
  const p = [titlePh('What we are asking for'), bodyPh(1, 'Nothing here is approved. The authoritative record is the design doc and the decisions spec — where this deck disagrees with them, they are right.')];
  const asks = [
    ['Ratify the architecture', 'The offline model and the punch-list mechanism are decided. Sign-off, not debate.', GREEN],
    ['Answer the portal platform question', 'Specifically the two-way-door risk — the only con that cannot be mitigated later.', ORANGE],
    ['Own the API', 'A real JSON API in front of the page-layout and workflow tables. It has no owner today.', YEL],
    ['Name dates for the backend items', 'Starting with the per-entity policy registry and the traversal contract.', AQUA],
  ];
  asks.forEach(([t, d, c], i) => {
    const y = 4.14 + i * 0.68;
    p.push(dot(L, y + 0.09, c));
    p.push(lead(L + 0.30, y, 5.30, t, 12.5));
    p.push(body(L + 0.30, y + 0.28, 5.30, 0.42, d, 9.5));
  });
  const rx = 7.29;
  [['EAM-Mobile-Design-Doc-v1.md', 'Requirements, scenarios, screen map, timeline, open issues'],
   ['design-decisions-v3-1.md', 'Every locked rule and its rationale'],
   ['component-library.md', 'What each UI pattern is called'],
   ['CLAUDE.md', 'Live prototype inventory and its traps']]
    .forEach(([t, d], i) => {
      const y = 4.26 + i * 0.60;
      p.push(textBox(rx, y, 5.30, 0.24, [para([{ t, sz: 10.5, b: true, color: G1 }])]));
      p.push(body(rx, y + 0.23, 5.30, 0.34, d, 8.5, G4));
    });
  add(46, p, 'The ask, in order. Decision 1 gates the base track; the API gates everything user-facing.');
}

/* ════════════════════════════════════════════════════════════════════════
   PACKAGE THE DECK
   ════════════════════════════════════════════════════════════════════════ */
/* Read the template once, in memory. No temp directory, no shelling out. */
const pkg = zipRead(TEMPLATE);
const rd = p => pkg.get(p).toString('utf8');
const wr = (p, s) => pkg.set(p, Buffer.from(s, 'utf8'));
const has = p => pkg.has(p);

/* Slide 1 keeps the template's own title treatment - only its text changes. */
{
  let s1 = rd('ppt/slides/slide1.xml');
  const runs = [...s1.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => m[1]);
  const want = ['Attune EAM Demonstration', 'Customer', 'Date', 'Danny Kilburn', 'Senior Solutions Consultant'];
  if (runs.join('|') !== want.join('|')) {
    console.error('Template slide 1 is not the expected title slide (found: ' + runs.join(' | ') + ').\n' +
      'The template changed - re-check which slide carries the title treatment.');
    process.exit(1);
  }
  const put = ['HxGN EAM Mobile v1', 'One app, one online/offline continuum, one guided workflow',
               'Vision and scope · September 2026', 'Daniel Kilburn', 'Technical Program Manager'];
  let k = 0;
  s1 = s1.replace(/<a:t>[\s\S]*?<\/a:t>/g, () => '<a:t>' + esc(put[k++]) + '</a:t>');
  wr('ppt/slides/slide1.xml', s1);
}

/* Drop the template's nine demo slides and every notes part, then write ours. */
for (const name of [...pkg.keys()]) {
  if (/^ppt\/slides\/slide(?:[2-9]|10)\.xml$/.test(name)) pkg.delete(name);
  if (/^ppt\/slides\/_rels\/slide(?:[2-9]|10)\.xml\.rels$/.test(name)) pkg.delete(name);
  if (/^ppt\/notesSlides\//.test(name)) pkg.delete(name);
}

slides.forEach((s, k) => {
  const n = k + 2;
  wr('ppt/slides/slide' + n + '.xml', s.xml);
  wr('ppt/slides/_rels/slide' + n + '.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"' +
    ' Target="../slideLayouts/slideLayout' + s.layout + '.xml"/></Relationships>');
});

const TOTAL = slides.length + 1;

/* [Content_Types]: one override per slide part, and no notesSlide parts left. */
{
  let ct = rd('[Content_Types].xml');
  ct = ct.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
  ct = ct.replace(/<Override PartName="\/ppt\/notesSlides\/[^"]*"[^>]*\/>/g, '');
  const adds = Array.from({ length: TOTAL }, (_, k) =>
    '<Override PartName="/ppt/slides/slide' + (k + 1) + '.xml" ContentType=' +
    '"application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('');
  ct = ct.replace('</Types>', adds + '</Types>');
  wr('[Content_Types].xml', ct);
}

/* presentation.xml.rels: keep every non-slide relationship on its own id, then
   re-add the slides on fresh ids above the highest one still in use. */
const slideRIds = [];
{
  let pr = rd('ppt/_rels/presentation.xml.rels');
  pr = pr.replace(/<Relationship Id="[^"]*"[^>]*\/slides\/slide\d+\.xml"\/>/g, '');
  const maxId = Math.max(...[...pr.matchAll(/Id="rId(\d+)"/g)].map(m => +m[1]));
  const adds = Array.from({ length: TOTAL }, (_, k) => {
    const id = 'rId' + (maxId + 1 + k);
    slideRIds.push(id);
    return '<Relationship Id="' + id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"' +
      ' Target="slides/slide' + (k + 1) + '.xml"/>';
  }).join('');
  pr = pr.replace('</Relationships>', adds + '</Relationships>');
  wr('ppt/_rels/presentation.xml.rels', pr);
}

/* presentation.xml: rewrite ONLY <p:sldIdLst>. Never reorder the children of
   <p:presentation> - PowerPoint reads the existing order happily and refuses a
   rearranged one. Also drop the notesMasterIdLst, since the notes parts are
   gone and a dangling reference is a corrupt package. */
{
  let px = rd('ppt/presentation.xml');
  const lst = '<p:sldIdLst>' + slideRIds.map((rid, k) =>
    '<p:sldId id="' + (256 + k) + '" r:id="' + rid + '"/>').join('') + '</p:sldIdLst>';
  if (!/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/.test(px)) { console.error('no sldIdLst'); process.exit(1); }
  px = px.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, lst);
  wr('ppt/presentation.xml', px);
}

/* Write the package with [Content_Types].xml first, as the spec expects. */
{
  const order = ['[Content_Types].xml', ...[...pkg.keys()].filter(k => k !== '[Content_Types].xml')];
  zipWrite(OUT, order.map(k => [k, pkg.get(k)]));
}

console.log('wrote ' + OUT + '  (' + TOTAL + ' slides, on the Octave brand template)');
