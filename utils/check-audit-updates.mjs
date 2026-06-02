#!/usr/bin/env node
// utils/check-audit-updates.mjs
//
// Scans the audit folders of Lista's contract repositories for audit PDFs that
// are NOT yet listed in security/audit-reports.md, appends any newcomers to the
// "2024 - Present" table, and writes a human-readable summary (audit-sync-summary.md).
//
// Used by .github/workflows/audit-watch.yml (weekly cron). No external deps:
// relies on Node's built-in global fetch (Node >= 18).
//
// Outputs (when run in GitHub Actions):
//   - GITHUB_OUTPUT: has_new=<bool>, count=<int>
//   - audit-sync-summary.md: PR body / step summary
//   - mutates security/audit-reports.md in place when new reports are found

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const DOC = 'security/audit-reports.md';

// Audit directories to watch. Add a new entry here to track another repo.
const SOURCES = [
  { repo: 'lista-dao/moolah', path: 'docs/audits', branch: 'master' },
  { repo: 'lista-dao/lista-token', path: 'audits', branch: 'master' },
  { repo: 'lista-dao/lista-dao-contracts', path: 'audits', branch: 'master' },
  { repo: 'lista-dao/synclub-contracts', path: 'audit', branch: 'master' },
  { repo: 'lista-dao/lista-new-contracts', path: 'docs/audits', branch: 'master' },
];

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

// Encode a filename for a URL while keeping path separators readable.
const enc = (name) => encodeURIComponent(name).replace(/%2F/gi, '/');

async function listPdfs(src) {
  const url = `https://api.github.com/repos/${src.repo}/contents/${src.path}?ref=${src.branch}`;
  const res = await fetch(url, {
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
    .map((i) => ({
      repo: src.repo,
      name: i.name,
      url: `https://github.com/${src.repo}/blob/${src.branch}/${src.path}/${enc(i.name)}`,
      id: `${src.repo}/${src.path}/${i.name}`.toLowerCase(),
    }));
}

// Collect the identities of every audit PDF already referenced in the doc.
function existingIds(doc) {
  const ids = new Set();
  const re = /github\.com\/([^/\s)]+\/[^/\s)]+)\/blob\/[^/\s)]+\/(\S+?\.pdf)/gi;
  let m;
  while ((m = re.exec(doc))) {
    const repo = m[1];
    const rest = decodeURIComponent(m[2]).replace(/\\_/g, '_'); // path/.../file.pdf
    ids.add(`${repo}/${rest}`.toLowerCase());
  }
  return ids;
}

// Best-effort product label from a filename. The Feature column needs human
// review; this only gives the maintainer a sensible starting point.
function guessFeature(name) {
  let s = name.replace(/\.pdf$/i, '').replace(/[_\-]+/g, ' ');
  const drop =
    /\b(bailsec|blocksec|cantina|spearbit|openzeppelin|certik|salus|peckshield|supremacy|veridise|slowmist|hashdit|sherlock|audit|reports?|final|signed|v\d+(\.\d+)*|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,8})\b/gi;
  s = s.replace(drop, ' ').replace(/\s+/g, ' ').trim();
  return s || name.replace(/\.pdf$/i, '');
}

function mdRow(file) {
  const display = file.name.replace(/_/g, '\\_');
  return `| ${guessFeature(file.name)} | [${display}](${file.url}) |`;
}

// Insert rows right after the "| Feature | Report |" header separator.
function insertRows(doc, rows) {
  const lines = doc.split('\n');
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\|\s*Feature\s*\|/.test(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    throw new Error('Could not locate the audit table header ("| Feature |") in ' + DOC);
  }
  // headerIdx + 1 is the |---|---| separator; insert after it.
  lines.splice(headerIdx + 2, 0, ...rows);
  return lines.join('\n');
}

function emitOutput(kv) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(kv).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
}

async function main() {
  const doc = readFileSync(DOC, 'utf8');
  const existing = existingIds(doc);

  const discovered = (await Promise.all(SOURCES.map(listPdfs))).flat();
  // de-dupe by id, then keep only files missing from the doc
  const seen = new Set();
  const fresh = discovered.filter((f) => {
    if (seen.has(f.id) || existing.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });

  let summary;
  if (fresh.length === 0) {
    summary = `✅ No new audit reports found. Scanned ${SOURCES.length} repositories, ${discovered.length} PDFs already tracked.\n`;
    emitOutput({ has_new: 'false', count: 0 });
  } else {
    writeFileSync(DOC, insertRows(doc, fresh.map(mdRow)));
    summary =
      `## 🆕 ${fresh.length} new audit report(s) detected\n\n` +
      `These PDFs exist in the contract repositories but were missing from ` +
      `\`security/audit-reports.md\`. They have been appended to the **2024 - Present** table.\n\n` +
      `> ⚠️ The **Feature** column is auto-guessed from the filename — please verify/rename it before merging.\n\n` +
      fresh.map((f) => `- **${guessFeature(f.name)}** — [${f.name}](${f.url}) _(${f.repo})_`).join('\n') +
      '\n';
    emitOutput({ has_new: 'true', count: fresh.length });
  }

  writeFileSync('audit-sync-summary.md', summary);
  console.log(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
