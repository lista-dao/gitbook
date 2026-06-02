#!/usr/bin/env node
// utils/check-audit-updates.mjs
//
// Keeps the "2024 - Present" audit table in security/audit-reports.md current and
// readable. It scans the audit folders of Lista's contract repos, merges in any
// audit PDFs not yet listed, and regenerates the table in a COMPACT, GROUPED,
// DATE-SORTED form:
//
//   | Feature | Audits |
//   | Position Migrator | [Bailsec · 2026-03](url) · [Cantina · 2026-03](url) |
//
// Source of truth is the markdown itself (round-tripped), so manual edits to a
// Feature name, auditor, or date PERSIST across runs. Dates that cannot be parsed
// from a filename are left blank (sorted last) for a one-time manual fix.
//
// Used by .github/workflows/audit-watch.yml (weekly). No external deps (Node fetch).
//
// Outputs (in GitHub Actions): GITHUB_OUTPUT has_new=<bool>, count=<int new urls>,
// and audit-sync-summary.md (commit/PR body + step summary).

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const DOC = 'security/audit-reports.md';
const MARKER = '2024 - Present'; // table lives right after this line

// Audit folders to watch. To track another repo/folder, add a line here:
//   { repo: 'lista-dao/<repo>', path: '<dir>', branch: '<branch>' }
// Only this exact repo+path+branch is scanned — a brand-new repo, a different
// audit folder, or a non-master branch will NOT be picked up until added here.
// (Deliberately excluded: lista-smart-contracts_deprecated — duplicates the 2022
// CDP audits; lista-audit — legacy Helio-era reports in an irregular layout.)
const SOURCES = [
  { repo: 'lista-dao/moolah', path: 'docs/audits', branch: 'master' },
  { repo: 'lista-dao/lista-token', path: 'audits', branch: 'master' },
  { repo: 'lista-dao/lista-dao-contracts', path: 'audits', branch: 'master' },
  { repo: 'lista-dao/synclub-contracts', path: 'audit', branch: 'master' },
  { repo: 'lista-dao/lista-new-contracts', path: 'docs/audits', branch: 'master' },
  { repo: 'lista-dao/lista-v3', path: 'audits', branch: 'master' },
];

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

const FIRMS = [
  ['openzeppelin', 'OpenZeppelin'], ['peckshield', 'PeckShield'], ['blocksec', 'BlockSec'],
  ['spearbit', 'Spearbit'], ['bailsec', 'Bailsec'], ['cantina', 'Cantina'], ['certik', 'CertiK'],
  ['salus', 'Salus'], ['supremacy', 'Supremacy'], ['veridise', 'Veridise'], ['slowmist', 'SlowMist'],
  ['hashdit', 'HashDit'], ['sherlock', 'Sherlock'],
];
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

const enc = (name) => encodeURIComponent(name).replace(/%2F/gi, '/');
const fileNameFromUrl = (url) => {
  const m = url.match(/\/([^/]+\.pdf)$/i);
  return m ? decodeURIComponent(m[1]) : url;
};

function detectFirm(name) {
  const low = name.toLowerCase();
  for (const [k, canon] of FIRMS) if (low.includes(k)) return canon;
  return null;
}

// Returns 'YYYY-MM' or null (null = couldn't parse → manual fix).
function parseDate(name) {
  let m;
  if ((m = name.match(/^(\d{2})(0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])-/))) return `20${m[1]}-${m[2]}`; // 260430- (YYMMDD prefix)
  if ((m = name.match(/(20\d{2})-(\d{2})-\d{2}/))) return `${m[1]}-${m[2]}`; // 2024-07-12
  if ((m = name.match(/(20\d{2})(0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])/))) return `${m[1]}-${m[2]}`; // 20260511
  if ((m = name.match(/(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*[._-]?(20\d{2})/i))) {
    return `${m[2]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}`; // Oct2025, 12Nov2025, 22_may_2026
  }
  if ((m = name.match(/(\d{1,2})(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)(\d{2})(?!\d)/i))) {
    return `20${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, '0')}`; // 17apr25
  }
  return null;
}

// Best-effort product label for a brand-new PDF (only used when not already in the doc).
function guessFeature(name) {
  const DROP = new Set([
    'bailsec', 'blocksec', 'cantina', 'spearbit', 'openzeppelin', 'certik', 'salus', 'peckshield',
    'supremacy', 'veridise', 'slowmist', 'hashdit', 'sherlock', 'audit', 'auditreport', 'report',
    'reports', 'final', 'signed', 'rep',
  ]);
  const MONTH = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)$/i;
  const DATEY = /^\d*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\d*$/i;
  const kept = [];
  for (const tok of name.replace(/\.pdf$/i, '').split(/[_\-\s]+/)) {
    if (!tok) continue;
    const low = tok.toLowerCase();
    if (DROP.has(low)) continue;
    if (/^\d+$/.test(tok)) continue;
    if (/^v?\d+(\.\d+)+$/i.test(tok)) continue;
    if (MONTH.test(tok)) continue;
    if (/\d/.test(tok) && DATEY.test(tok)) continue;
    kept.push(tok);
  }
  const s = kept.join(' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  const out = [];
  for (const w of s.split(/\s+/)) if (w && (!out.length || out[out.length - 1].toLowerCase() !== w.toLowerCase())) out.push(w);
  return out.join(' ').trim() || name.replace(/\.pdf$/i, '');
}

async function listPdfUrls(src) {
  const api = `https://api.github.com/repos/${src.repo}/contents/${src.path}?ref=${src.branch}`;
  const res = await fetch(api, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'lista-audit-watch',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) {
    console.error(`WARN: ${src.repo}/${src.path} -> HTTP ${res.status} ${res.statusText}`);
    return [];
  }
  const items = await res.json();
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => i.type === 'file' && /\.pdf$/i.test(i.name))
    .map((i) => `https://github.com/${src.repo}/blob/${src.branch}/${src.path}/${enc(i.name)}`);
}

// Round-trip the existing table into entries keyed by URL (preserves manual edits).
function parseExisting(tableLines) {
  const entries = new Map(); // urlLower -> {url, feature, auditor, date, fname}
  const linkRe = /\[([^\]]*)\]\((https:\/\/github\.com\/lista-dao\/[^)\s]+\.pdf)\)/gi;
  for (const line of tableLines) {
    if (!line.startsWith('|')) continue;
    const cells = line.replace(/^\||\|$/g, '').split('|');
    if (cells.length < 2) continue;
    const feature = cells[0].replace(/\\_/g, '_').trim();
    if (!feature || /^-+$/.test(feature) || feature.toLowerCase() === 'feature') continue;
    let m;
    while ((m = linkRe.exec(line))) {
      const display = m[1].trim();
      const url = m[2];
      const fname = fileNameFromUrl(url);
      const dm = display.match(/(20\d{2}-\d{2})/); // prefer date shown in text (manual fixes persist)
      const date = dm ? dm[1] : parseDate(fname);
      let auditor = display.includes('·') ? (display.split('·')[0].trim() || null) : null;
      if (!auditor) auditor = detectFirm(fname);
      const key = url.toLowerCase();
      if (!entries.has(key)) entries.set(key, { url, feature, auditor, date, fname });
    }
  }
  return entries;
}

function linkText(e) {
  const stem = e.fname.replace(/\.pdf$/i, '');
  return [e.auditor, e.date].filter(Boolean).join(' · ') || stem;
}

function renderTable(entries) {
  const groups = new Map();
  for (const e of entries.values()) {
    if (!groups.has(e.feature)) groups.set(e.feature, []);
    groups.get(e.feature).push(e);
  }
  const dkey = (d) => d || '0000-00';
  const blocks = [];
  for (const [feature, list] of groups) {
    list.sort((a, b) => dkey(b.date).localeCompare(dkey(a.date)));
    const maxDate = list.reduce((mx, e) => (dkey(e.date) > mx ? dkey(e.date) : mx), '0000-00');
    const links = list.map((e) => `[${linkText(e)}](${e.url})`).join(' · ');
    blocks.push({ feature, maxDate, row: `| ${feature} | ${links} |` });
  }
  blocks.sort((a, b) => b.maxDate.localeCompare(a.maxDate) || a.feature.localeCompare(b.feature));
  return ['| Feature | Audits |', '| ------- | ------ |', ...blocks.map((b) => b.row)];
}

function emit(kv) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(kv).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  }
}

async function main() {
  const original = readFileSync(DOC, 'utf8');
  const lines = original.split('\n');

  const markerIdx = lines.findIndex((l) => l.includes(MARKER));
  if (markerIdx === -1) throw new Error(`Marker "${MARKER}" not found in ${DOC}`);
  let start = -1;
  for (let i = markerIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('|')) { start = i; break; }
    if (lines[i].startsWith('#')) break;
  }
  if (start === -1) throw new Error('Could not find the audit table after the marker.');
  let end = start;
  while (end < lines.length && lines[end].startsWith('|')) end++;

  const entries = parseExisting(lines.slice(start, end));
  const before = entries.size;

  // URLs already present ANYWHERE in the doc (incl. the "2022 (CDP)" bullet list),
  // so legacy entries outside the table are not pulled back in as "new".
  const allExisting = new Set(
    [...original.matchAll(/https:\/\/github\.com\/lista-dao\/[^)\s]+\.pdf/gi)].map((m) => m[0].toLowerCase()),
  );

  const discovered = (await Promise.all(SOURCES.map(listPdfUrls))).flat();
  const fresh = [];
  for (const url of discovered) {
    const key = url.toLowerCase();
    if (entries.has(key) || allExisting.has(key)) continue;
    const fname = fileNameFromUrl(url);
    entries.set(key, { url, feature: guessFeature(fname), auditor: detectFirm(fname), date: parseDate(fname), fname });
    fresh.push({ url, fname });
  }

  const newTable = renderTable(entries);
  const updated = [...lines.slice(0, start), ...newTable, ...lines.slice(end)].join('\n');
  const changed = updated !== original;
  if (changed) writeFileSync(DOC, updated);

  const summary = fresh.length
    ? `## 🆕 ${fresh.length} new audit report(s) merged\n\n` +
      `Scanned ${SOURCES.length} repos, ${entries.size} total reports.\n\n` +
      fresh.map((f) => `- [${f.fname}](${f.url})`).join('\n') + '\n'
    : changed
      ? `Audit table reformatted/re-sorted (no new reports). ${entries.size} reports total.\n`
      : `✅ No changes. ${entries.size} reports already tracked across ${SOURCES.length} repos.\n`;
  writeFileSync('audit-sync-summary.md', summary);
  console.log(summary);
  console.log(`entries: ${before} existing + ${fresh.length} new = ${entries.size}`);
  emit({ has_new: String(changed), count: fresh.length });
}

main().catch((e) => { console.error(e); process.exit(1); });
