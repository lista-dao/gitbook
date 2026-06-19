#!/usr/bin/env node
// utils/sync-multi-oracle.mjs
//
// Keeps the "B. Collaterals using Resilient Oracle" table (BNB Chain) in
// for-developer/multi-oracle.md in sync with the canonical Notion source:
//
//   "Multi-Oracle For GitBook"  (page 6a54afccfcf04be4afd4ef10ce839169)
//
// Notion is the SOURCE OF TRUTH for the volatile oracle-value columns
// (Oracle/caller, Main, Pivot, Fallback, BoundValidator). The script does a
// keyed MERGE — it never blindly mirrors — because the Notion table and the
// published table are not identical sets:
//
//   * Rows are matched by TOKEN ADDRESS (case-insensitive). For a match, only
//     the five value columns are refreshed from Notion; the doc's Asset cell
//     (hand-curated label + links) is PRESERVED.
//   * Doc rows with no Notion match (e.g. wNLP-USDT, CAKE) are KEPT, never
//     deleted, and listed in the summary so a human notices the drift.
//   * Notion rows with no doc match (e.g. a freshly listed collateral) are
//     APPENDED at the bottom of the table.
//   * CDP-only variants ("* for OracleCenter Contract", "* for
//     DynamicDutyCalculator") are SKIPPED — they don't belong in the lending
//     table. (Legit asterisk assets like "sUSDX (*For CDP...)" or
//     "pumpBTC (BTCB * 0.99)" are matched by token, so they are unaffected.)
//
// Used by .github/workflows/oracle-watch.yml (weekly). No external deps
// (Node fetch). Outputs in GitHub Actions: GITHUB_OUTPUT has_changes=<bool>,
// updated=<int>, added=<int>, plus oracle-sync-summary.md (commit/PR body).
//
// Offline test (no token needed): point NOTION_FIXTURE_ROWS at a saved
// get-block-children JSON response for the B table and set DRY_RUN=1, e.g.
//   NOTION_FIXTURE_ROWS=./b-table.json DRY_RUN=1 node utils/sync-multi-oracle.mjs

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const DOC = 'for-developer/multi-oracle.md';
const PAGE_ID = '6a54afccfcf04be4afd4ef10ce839169';
const ANCHOR = 'B. Collaterals using Resilient Oracle'; // the table follows this line
const SKIP_ASSET = /for\s+OracleCenter/i; // CDP-only "OracleCenter" variants (absent from the lending table)
const COLS = 7; // Asset | Token | Oracle/caller | Main | Pivot | Fallback | BoundValidator

const TOKEN = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || '';
const NOTION_VERSION = '2022-06-28';
const DRY_RUN = process.env.DRY_RUN === '1';
const FIXTURE_ROWS = process.env.NOTION_FIXTURE_ROWS || '';

const lc = (s) => (s || '').toLowerCase();
const addrOf = (html) => (html.match(/0x[a-fA-F0-9]{40}/) || [null])[0];

// ---------------------------------------------------------------------------
// Notion API
// ---------------------------------------------------------------------------
async function notion(path) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Notion ${path} -> HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
}

async function getChildren(blockId) {
  const out = [];
  let cursor;
  do {
    const q = cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100';
    const data = await notion(`blocks/${blockId}/children${q}`);
    out.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return out;
}

// Find the table block that immediately follows the ANCHOR paragraph.
async function findTableRows() {
  if (FIXTURE_ROWS) {
    return JSON.parse(readFileSync(FIXTURE_ROWS, 'utf8')).results.filter((b) => b.type === 'table_row');
  }
  const blocks = await getChildren(PAGE_ID);
  let lastText = '';
  let tableId = null;
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      lastText = (b.paragraph.rich_text || []).map((t) => t.plain_text).join('');
    } else if (b.type === 'table') {
      if (lastText.includes(ANCHOR)) { tableId = b.id; break; }
    }
  }
  if (!tableId) throw new Error(`Could not locate the "${ANCHOR}" table on the Notion page.`);
  const rows = (await getChildren(tableId)).filter((b) => b.type === 'table_row');
  return rows;
}

// ---------------------------------------------------------------------------
// Rendering a Notion rich_text cell -> HTML used in the doc table
// ---------------------------------------------------------------------------
function renderCell(richText) {
  const parts = [];
  for (const t of richText || []) {
    const text = (t.plain_text || '');
    if (t.href) {
      const url = t.href.startsWith('/') ? `https://www.notion.so${t.href}` : t.href;
      parts.push(`<a href="${url}">${text.trim()}</a>`);
    } else {
      parts.push(text);
    }
  }
  let html = parts.join('').replace(/\r/g, '').trim();
  html = html.replace(/\n+/g, '<br>'); // multi-line cells -> <br>
  html = html.replace(/\s{2,}/g, ' '); // collapse runs of spaces from Notion
  return html === '' ? '-' : html;
}

// Bound column: normalise "Upper Limit: 1.01 Lower Limit: 0.99" to a stable form.
function renderBound(richText) {
  const raw = renderCell(richText).replace(/<br>/g, ' ');
  if (raw === '-' ) return '-';
  const up = raw.match(/upper\s*(?:limit|bound)\s*:?\s*([\d.]+)/i);
  const lo = raw.match(/lower\s*(?:limit|bound)\s*:?\s*([\d.]+)/i);
  if (up && lo) return `<p>Upper Limit: ${up[1]}</p><p>Lower Limit: ${lo[1]}</p>`;
  return raw;
}

function cells(row) {
  return row.table_row.cells; // array of rich_text arrays
}

// Parse a Notion B-table row into a record (or null to skip).
function parseNotionRow(row, idx) {
  const c = cells(row);
  const asset = renderCell(c[0]).replace(/<br>/g, ' ');
  if (idx === 0 && /^asset$/i.test(asset)) return null; // header
  if (SKIP_ASSET.test(asset)) return { skip: asset };
  const token = addrOf(renderCell(c[1] || []));
  if (!token) return null; // no token = not a real collateral row
  return {
    asset,
    token,
    tokenHtml: renderCell(c[1]),
    caller: renderCell(c[2] || []),
    main: renderCell(c[3] || []),
    pivot: renderCell(c[4] || []),
    fallback: renderCell(c[5] || []),
    bound: renderBound(c[6] || []),
  };
}

// ---------------------------------------------------------------------------
// Doc table parsing / rendering
// ---------------------------------------------------------------------------
function locateTable(doc) {
  const aIdx = doc.indexOf(ANCHOR);
  if (aIdx === -1) throw new Error(`Anchor "${ANCHOR}" not found in ${DOC}.`);
  const start = doc.indexOf('<table', aIdx);
  if (start === -1) throw new Error('No <table> found after the anchor.');
  const end = doc.indexOf('</table>', start);
  if (end === -1) throw new Error('Unterminated <table> after the anchor.');
  return { start, end: end + '</table>'.length };
}

function parseDocRows(tableHtml) {
  const bodyM = tableHtml.match(/<tbody>([\s\S]*)<\/tbody>/i);
  if (!bodyM) throw new Error('Doc table has no <tbody>.');
  const rows = [];
  const trRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(bodyM[1]))) {
    const tds = [...m[1].matchAll(/<td>([\s\S]*?)<\/td>/gi)].map((x) => x[1]);
    if (tds.length < COLS) continue;
    const token = addrOf(tds[1]);
    // first row is the header in markdown only when inside <thead>; tbody rows are data
    rows.push({ tds, token });
  }
  return rows;
}

function renderRow(tds) {
  return `<tr>${tds.map((t) => `<td>${t}</td>`).join('')}</tr>`;
}

function renderTable(rows) {
  const head =
    '<table data-full-width="true"><thead><tr>' +
    '<th>Asset</th><th>Token</th><th>Oracle/caller</th><th>Main oracle</th>' +
    '<th>Pivot oracle</th><th>Fallback oracle</th><th>BoundValidator</th>' +
    '</tr></thead><tbody>';
  return head + rows.map((r) => renderRow(r.tds)).join('') + '</tbody></table>';
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------
function merge(docRows, notionRecords) {
  const byToken = new Map();
  const skipped = [];
  for (const r of notionRecords) {
    if (!r) continue;
    if (r.skip) { skipped.push(r.skip); continue; }
    byToken.set(lc(r.token), r);
  }

  const reformatted = []; // formatting-only refresh (addresses unchanged)
  const valueChanges = []; // an oracle ADDRESS actually changed — review these
  const docOnly = [];
  const consumed = new Set();
  const addrSet = (html) => (html.match(/0x[a-fA-F0-9]{40}/gi) || []).map(lc).sort().join(',');
  const label = (row, rec) => ((rec && rec.asset) || row.tds[0].replace(/<[^>]+>/g, '').trim() || row.token);

  // 1) Walk doc rows in place: refresh value columns for matched tokens.
  for (const row of docRows) {
    const key = lc(row.token);
    const rec = byToken.get(key);
    if (rec) {
      consumed.add(key);
      const next = [...row.tds];
      // [0]=Asset preserved, [1]=Token preserved, refresh [2..6] from Notion.
      const refreshed = [rec.caller, rec.main, rec.pivot, rec.fallback, rec.bound];
      let changed = false;
      let addrChanged = false;
      for (let i = 0; i < 5; i++) {
        const before = next[2 + i];
        if (before !== refreshed[i]) {
          changed = true;
          if (addrSet(before) !== addrSet(refreshed[i])) addrChanged = true;
          next[2 + i] = refreshed[i];
        }
      }
      if (changed) (addrChanged ? valueChanges : reformatted).push(label(row, rec));
      row.tds = next;
    } else if (row.token) {
      docOnly.push(label(row, null));
    }
  }

  // 2) Append Notion rows not present in the doc.
  const added = [];
  const appended = [];
  for (const [key, rec] of byToken) {
    if (consumed.has(key)) continue;
    appended.push({
      tds: [rec.asset, rec.tokenHtml, rec.caller, rec.main, rec.pivot, rec.fallback, rec.bound],
      token: rec.token,
    });
    added.push(rec.asset);
  }

  return { rows: [...docRows, ...appended], valueChanges, reformatted, added, docOnly, skipped };
}

function emit(kv) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(kv).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  }
}

// ---------------------------------------------------------------------------
async function main() {
  if (!TOKEN && !FIXTURE_ROWS) throw new Error('NOTION_TOKEN is required (or set NOTION_FIXTURE_ROWS for offline runs).');

  const original = readFileSync(DOC, 'utf8');
  const { start, end } = locateTable(original);
  const tableHtml = original.slice(start, end);
  const docRows = parseDocRows(tableHtml);

  const notionRows = await findTableRows();
  const records = notionRows.map((r, i) => parseNotionRow(r, i));

  const { rows, valueChanges, reformatted, added, docOnly, skipped } = merge(docRows, records);
  const newTable = renderTable(rows);
  const updatedDoc = original.slice(0, start) + newTable + original.slice(end);
  const changed = updatedDoc !== original;
  const line = (label, arr) => `- ${label}: ${arr.length}${arr.length ? ` — ${arr.join(', ')}` : ''}\n`;

  const summary =
    `## Multi-Oracle sync (BNB · Collaterals using Resilient Oracle)\n\n` +
    `- Notion rows scanned: ${notionRows.length}\n` +
    line('⚠️ Oracle address changes (review)', valueChanges) +
    line('Added (new collaterals)', added) +
    line('Reformatted only (no address change)', reformatted) +
    line('Skipped (OracleCenter CDP variants)', skipped) +
    line('In doc, not in Notion (kept, not deleted)', docOnly);

  writeFileSync('oracle-sync-summary.md', summary);
  console.log(summary);

  if (DRY_RUN) {
    console.log(changed ? '\n[DRY_RUN] doc WOULD change.' : '\n[DRY_RUN] no change.');
  } else if (changed) {
    writeFileSync(DOC, updatedDoc);
  }

  emit({
    has_changes: String(changed),
    value_changes: valueChanges.length,
    added: added.length,
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
