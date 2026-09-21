#!/usr/bin/env node
/*
  ASSET VERSION STAMP — cache-busting for the hosted prototype.

  WHY THIS EXISTS
  GitHub Pages serves `Cache-Control: max-age=600`, and an installed
  standalone web app has NO reload button — so a device can sit on a
  ten-minute-stale copy of eam-shared.css with no way to force a refetch and
  no visible sign anything is wrong. During a user-research session that means
  a participant testing an old build while everyone assumes otherwise, and
  conclusions drawn from the wrong thing. A version query makes every deploy
  unambiguous.

  WHAT GETS STAMPED
  Only assets that actually change: eam-shared.css, eam-shared.js,
  eam-fonts.css and data/*.js. Images are deliberately excluded — they change
  essentially never, and the apple-touch-icon is captured by iOS at install
  time regardless, so a query on it would be noise.

  USAGE
    node .claude/skills/verify/scripts/bump-assets.js            # stamp today
    node .claude/skills/verify/scripts/bump-assets.js 20260921   # explicit
    node .claude/skills/verify/scripts/bump-assets.js --check    # verify only

  `--check` exits non-zero if any stamped asset reference is missing a version
  or disagrees with the others. That is the guard that stops a newly added
  screen from silently shipping unversioned links.

  BUMP THIS ON EVERY DEPLOY that touches a stamped asset. It is a manual step
  because this repo has no build pipeline, which is a deliberate property
  (see CLAUDE.md) — not an oversight to automate away with one.

  A NOTE ON file:// — the prototypes are required to work from the filesystem
  as well as hosted, which is how the zip handoff is reviewed. Browsers ignore
  the query component when resolving a file: URL, so a stamped link still
  loads locally. Code that joins paths naively does NOT: run-load.js had to be
  taught to strip the query. Anything new that resolves these paths by hand
  needs the same treatment.
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');

// Assets whose content changes and therefore must be cache-busted.
const STAMPED = [
  /(?:href|src)="((?:\.\.\/\.\.\/)?(?:shared|data)\/[^"?]+\.(?:css|js))"/g,
];

function htmlFiles() {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 3) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        // mockups and old versions are internal history — never deployed as
        // the app, so stamping them is churn with no benefit.
        if (e.name === 'mockups' || e.name === 'old versions') continue;
        walk(p, depth + 1);
      } else if (e.name.endsWith('.html')) {
        out.push(p);
      }
    }
  };
  walk(ROOT, 0);
  return out;
}

const arg = process.argv[2];
const checkOnly = arg === '--check';
// Date AND time. Date alone was the first cut and it was wrong: two deploys
// on the same day produce an identical stamp, so the second one does not bust
// the cache at all — which is precisely the failure this script exists to
// prevent, and it would have been silent.
const stamp = (!arg || checkOnly)
  ? new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
  : arg;

let changed = 0, refs = 0;
const found = new Set();
const missing = [];

for (const file of htmlFiles()) {
  let t = fs.readFileSync(file, 'utf8');
  const before = t;
  const rel = path.relative(ROOT, file);

  // existing stamps — collect for --check
  for (const m of t.matchAll(/(?:href|src)="(?:\.\.\/\.\.\/)?(?:shared|data)\/[^"?]+\.(?:css|js)\?v=([^"]+)"/g)) {
    found.add(m[1]);
  }
  // unstamped refs
  for (const re of STAMPED) {
    for (const m of t.matchAll(re)) {
      refs++;
      if (checkOnly) missing.push(rel + '  ' + m[1]);
    }
  }

  if (checkOnly) continue;

  // strip any old stamp, then apply the new one
  t = t.replace(/((?:href|src)="(?:\.\.\/\.\.\/)?(?:shared|data)\/[^"?]+\.(?:css|js))\?v=[^"]*"/g, '$1"');
  t = t.replace(/((?:href|src)="(?:\.\.\/\.\.\/)?(?:shared|data)\/[^"?]+\.(?:css|js))"/g, '$1?v=' + stamp + '"');
  if (t !== before) { fs.writeFileSync(file, t); changed++; }
}

if (checkOnly) {
  const versions = [...found];
  let bad = false;
  if (missing.length) {
    console.log('UNVERSIONED asset references (' + missing.length + '):');
    missing.slice(0, 12).forEach(m => console.log('  ' + m));
    bad = true;
  }
  if (versions.length > 1) {
    console.log('MIXED versions in use: ' + versions.join(', '));
    bad = true;
  }
  if (!bad) console.log('asset versions consistent — all stamped ?v=' + (versions[0] || '(none found)'));
  process.exit(bad ? 1 : 0);
}

console.log('stamped ?v=' + stamp + ' across ' + changed + ' files');
