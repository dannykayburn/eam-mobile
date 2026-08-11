/* Compiles shared + a screen's inline scripts as ONE top-level script scope,
   which is what the browser actually does for classic <script> tags. Catches
   redeclaration errors that per-block checking cannot see. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const DIR = 'C:/Users/dkilburn/Projects/eam-mobile/prototypes/standalone';
const shared = fs.readFileSync(DIR + '/shared/eam-shared.js', 'utf8');

// Top-level lexical declarations only (column 0, not indented).
function topLevelDecls(src) {
  const out = new Map();
  const re = /^(const|let|class|function)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(src))) {
    // Multi-name const lines: const a = 1, b = 2;
    out.set(m[2], m[1]);
    if (m[1] === 'const' || m[1] === 'let') {
      const line = src.slice(m.index, src.indexOf('\n', m.index));
      const extra = line.match(/,\s*([A-Za-z_$][\w$]*)\s*=/g) || [];
      extra.forEach(e => out.set(e.replace(/[,\s=]/g, ''), m[1]));
    }
  }
  return out;
}

const sharedDecls = topLevelDecls(shared);
const files = process.argv.slice(2);
let bad = 0;

for (const f of files) {
  // Accept either a bare filename or a repo-relative/absolute path, so the
  // documented `prototypes/standalone/eam-*.html` glob works as written.
  const p = fs.existsSync(f) ? f : path.join(DIR, f);
  const src = fs.readFileSync(p, 'utf8');
  const blocks = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const inline = blocks.join('\n');
  const name = path.basename(f);

  // 1. Redeclaration against shared (lexical only — `function` and `var` can
  //    legally be reassigned/shadowed at top level, const/let/class cannot).
  const mine = topLevelDecls(inline);
  const clashes = [];
  for (const [n, kind] of mine) {
    const sk = sharedDecls.get(n);
    if (!sk) continue;
    const lexical = k => k === 'const' || k === 'let' || k === 'class';
    if (lexical(kind) || lexical(sk)) clashes.push(`${n} (${sk} in shared vs ${kind} here)`);
  }
  if (clashes.length) { bad++; console.log('CLASH ' + name); clashes.forEach(c => console.log('        ' + c)); }

  // 2. Compile shared + inline together.
  try {
    new vm.Script(shared + '\n;\n' + inline, { filename: name });
    if (!clashes.length) console.log('OK    ' + name);
  } catch (e) {
    bad++;
    console.log('FAIL  ' + name + ': ' + e.message);
  }
}
process.exit(bad ? 1 : 0);
