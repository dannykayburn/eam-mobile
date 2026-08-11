/* Guards the three keyboard-surface failure patterns learned on real devices.
   Run after touching any sheet/overlay that contains a text input.

     P1  a control at the surface's BOTTOM edge (.sheet-footer et al) inside a
         surface that also holds a text input → once --kb-inset lifts the sheet,
         that control lands under iOS's own keyboard accessory bar (the ^ v ✓
         row). Two affirmative controls, overlapping. Put the action in the
         header instead (.sheet-confirm-btn).
     P2  a full-attention surface that opens without closing others → the
         previous sheet shows through underneath. Use openSheetExclusive(), or
         closeAllSheets() for a non-.bottom-sheet overlay.
     P3  a rule pinning bottom:0 on a .bottom-sheet defeats --kb-inset, so the
         keyboard covers the sheet entirely. Only legitimate for a surface
         anchored top AND bottom (the full-cover text editor).

   Exits non-zero on any finding. */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', '..', '..', '..', 'prototypes', 'standalone');
const css = fs.readFileSync(path.join(DIR, 'shared', 'eam-shared.css'), 'utf8');
const js  = fs.readFileSync(path.join(DIR, 'shared', 'eam-shared.js'), 'utf8');

const KB_INPUT = /<(?:input|textarea)\b(?![^>]*type="(?:checkbox|radio|hidden|file|date|time|datetime-local)")/;
const FOOTER   = /class="(sheet-footer|insert-mode-footer|md-footer|equip-multi-footer)"/;

let findings = [];

/* Mount ids that get a text input written INTO them at runtime. Static markup
   scanning alone missed Issue Parts' issue/return sheet entirely: its body is
   `<!-- Dynamically populated -->` and renderAdHocSheet() injects the search
   input, so the sheet held a keyboard input + a footer Save and looked clean.
   Matches `getElementById('X').innerHTML = ...` / `X.innerHTML = ...` where the
   assigned value mentions an input, plus this codebase's `mount.innerHTML =`
   idiom resolved back through `const mount = document.getElementById('X')`. */
function runtimeInputMounts(src) {
  const ids = new Set();
  for (const m of src.matchAll(/getElementById\(['"]([\w-]+)['"]\)\s*\.innerHTML\s*=\s*([\s\S]{0,6000}?);\s*\n/g)) {
    if (/<(input|textarea)\b/.test(m[2])) ids.add(m[1]);
  }
  // `const X = document.getElementById('id')` … `X.innerHTML = ...<input`
  for (const m of src.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*document\.getElementById\(['"]([\w-]+)['"]\)/g)) {
    const [, varName, id] = m;
    const re = new RegExp(varName + '\\.innerHTML\\s*=\\s*([\\s\\S]{0,6000}?);\\s*\\n', 'g');
    for (const a of src.matchAll(re)) if (/<(input|textarea)\b/.test(a[1])) ids.add(id);
  }
  return ids;
}

// ── P1: per sheet block, does it hold BOTH a text input and a bottom control?
for (const f of fs.readdirSync(DIR).filter(x => /^eam-.*\.html$/.test(x))) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const lines = src.split(/\r?\n/);
  // Shared renderers inject into screen mounts too, so scan both sources.
  const injected = new Set([...runtimeInputMounts(src), ...runtimeInputMounts(js)]);
  let open = null, depth = 0;
  lines.forEach((line, i) => {
    if (open === null && /class="[^"]*bottom-sheet/.test(line)) {
      const id = (line.match(/\bid="([^"]+)"/) || [])[1] || '(anonymous)';
      open = { id, start: i + 1, input: false, footer: null };
      depth = 0;
    }
    if (open) {
      depth += (line.match(/<div\b/g) || []).length - (line.match(/<\/div>/g) || []).length;
      if (KB_INPUT.test(line)) open.input = 'static';
      // A mount inside this sheet that gets an input injected at runtime.
      const im = line.match(/\bid="([\w-]+)"/);
      if (im && injected.has(im[1])) open.input = open.input || 'runtime (#' + im[1] + ')';
      const fm = line.match(FOOTER);
      if (fm) open.footer = fm[1];
      if (depth <= 0 && i > open.start - 1) {
        if (open.input && open.footer) {
          findings.push(`P1  ${f}:${open.start}  #${open.id} has a text input [${open.input}] AND .${open.footer} at its bottom edge`);
        }
        open = null;
      }
    }
  });
}

// ── P2: shared openers that focus an input but don't open exclusively.
for (const m of js.matchAll(/function (open[A-Za-z]*)\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/g)) {
  const [, name, body] = m;
  if (!/\.focus\(\)/.test(body)) continue;                 // doesn't raise the keyboard
  if (/openSheetExclusive\(/.test(body)) continue;          // already exclusive
  if (!/openSheet\(/.test(body)) continue;                  // not a sheet opener
  findings.push(`P2  eam-shared.js  ${name}() focuses an input but opens non-exclusively`);
}

// ── P3: bottom:0 on a .bottom-sheet variant that isn't also top-anchored.
for (const m of css.matchAll(/\.([a-z-]+(?:\.[a-z-]+)*)\s*\{([^}]*)\}/g)) {
  const [, sel, body] = m;
  if (!/bottom:\s*0/.test(body)) continue;
  if (!/sheet|editor/.test(sel)) continue;                  // only sheet-ish rules
  if (/top:\s*0/.test(body)) continue;                      // full-cover: legitimate
  findings.push(`P3  eam-shared.css  .${sel} pins bottom:0 without top:0 — --kb-inset can't lift it`);
}

if (!findings.length) {
  console.log('keyboard surfaces: no P1/P2/P3 findings');
  process.exit(0);
}
console.log('KEYBOARD SURFACE FINDINGS\n');
findings.forEach(x => console.log('  ' + x));
console.log('\nSee .claude/skills/verify/SKILL.md for what each pattern means.');
process.exit(1);
