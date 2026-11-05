#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   build-aha-csv.js: regenerates docs/screen-inventory-aha.csv

   The CSV is a BUILD ARTIFACT of docs/screen-inventory.md, never a second
   home for its content. Edit a card in the markdown, then re-run:

       node docs/scripts/build-aha-csv.js

   A card is any `### ` heading followed by a `- **Epic:**` line. Headings
   without one (section dividers, Part A paradigms) are skipped. Each
   `- **Key:** value` line is a field, and `  - ` sub-bullets attach to the
   field above them (only `Design` uses them today).

   Columns: Name, Epic, Description (HTML, which Aha's import renders as rich
   text), Tags (paradigm IDs + state), Design state, Spec, Prototype.
   ───────────────────────────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const src = path.join(root, 'docs', 'screen-inventory.md');
const out = path.join(root, 'docs', 'screen-inventory-aha.csv');

const md = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
const partC = md.slice(md.indexOf('## Part C'));
if (partC.length < 10) throw new Error('Part C not found in screen-inventory.md');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.+?)\*/g, '<em>$1</em>')
  .replace(/`(.+?)`/g, '<code>$1</code>');
const plain = s => s.replace(/\*\*|`/g, '').replace(/\*(.+?)\*/g, '$1').trim();

const cards = [];
for (const block of partC.split(/\n(?=### )/)) {
  if (!block.startsWith('### ')) continue;
  const lines = block.split('\n');
  const name = lines[0].slice(4).trim();
  const fields = {}; const order = []; let last = null;
  for (const line of lines.slice(1)) {
    let m;
    if ((m = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/))) {
      last = m[1]; fields[last] = { text: m[2], items: [] }; order.push(last);
    } else if ((m = line.match(/^ {2,}- (.*)$/)) && last) {
      fields[last].items.push(m[1]);
    }
  }
  if (!fields.Epic) continue;
  cards.push({ name, fields, order });
}

const DESC_SKIP = new Set(['Epic', 'Paradigm', 'Summary', 'Design', 'State', 'Spec', 'Prototype']);
const rows = cards.map(({ name, fields, order }) => {
  const f = k => (fields[k] ? fields[k].text : '');
  let html = `<p>${inline(f('Summary'))}</p>`;
  if (fields.Design && fields.Design.items.length) {
    html += '<p><strong>Design</strong></p><ul>' +
      fields.Design.items.map(i => `<li>${inline(i)}</li>`).join('') + '</ul>';
  }
  for (const k of order) {
    if (DESC_SKIP.has(k) || !f(k)) continue;
    html += `<p><strong>${esc(k)}:</strong> ${inline(f(k))}</p>`;
  }
  if (f('Paradigm')) html += `<p><strong>Paradigm:</strong> ${inline(f('Paradigm'))} (see screen-inventory.md Part A)</p>`;
  if (f('Spec')) html += `<p><strong>Spec:</strong> design-decisions-v3-1.md ${inline(f('Spec'))}</p>`;
  const tags = [...plain(f('Paradigm')).split(/,\s*/), plain(f('State'))].filter(Boolean);
  return [name, plain(f('Epic')), html, tags.join(','), plain(f('State')), plain(f('Spec')), plain(f('Prototype'))];
});

const cell = v => '"' + String(v).replace(/"/g, '""') + '"';
const header = ['Name', 'Epic', 'Description', 'Tags', 'Design state', 'Spec', 'Prototype'];
const csv = [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
fs.writeFileSync(out, '﻿' + csv, 'utf8');
console.log(`Wrote ${rows.length} features to ${path.relative(root, out)}`);
