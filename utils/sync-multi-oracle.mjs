#!/usr/bin/env node
// utils/sync-multi-oracle.mjs
//
// Keeps the oracle-config tables in for-developer/multi-oracle.md in sync with
// the canonical Notion source ("Multi-Oracle For GitBook",
// page 6a54afccfcf04be4afd4ef10ce839169). Two sections are synced:
//
//   * BNB Chain — "B. Collaterals using Resilient Oracle"   (must exist in doc)
//   * Ethereum Chain                                        (created if missing)
//
// Notion is the SOURCE OF TRUTH for the volatile oracle-value columns
// (Oracle/caller, Main, Pivot, Fallback, BoundValidator). The script does a
// keyed MERGE — never a blind mirror:
//
//   * Rows are matched by TOKEN ADDRESS (case-insensitive). For a match, only
//     the five value columns are refreshed from Notion; the doc's Asset cell
//     (hand-curated label + links) is PRESERVED.
//   * Doc rows with no Notion match (e.g. wNLP-USDT, CAKE) are KEPT, never
//     deleted, and listed in the summary so a human notices the drift.
//   * Notion rows with no doc match are APPENDED at the bottom of the table.
//   * CDP-only "OracleCenter" variants are SKIPPED.
//   * Notion rows with NO token address (placeholder/WIP rows) are ignored and
//     counted as "not ready" — so an incomplete table (e.g. Ethereum today)
//     does not publish empty rows. A "create if missing" section with zero
//     ready rows is simply skipped (no empty section is written).
//
// Used by .github/workflows/oracle-watch.yml (weekly). No external deps.
// Outputs in GitHub Actions: GITHUB_OUTPUT has_changes=<bool>,
// value_changes=<int>, added=<int>; plus oracle-sync-summary.md.
//
// Offline test (no token): per-section fixtures point at saved
// get-block-children JSON responses, e.g.
//   NOTION_FIXTURE_ROWS=./b.json \
//   NOTION_FIXTURE_ROWS_ETH=./eth.json NOTION_FIXTURE_ETH_RESILIENT=0xA64F... \
//   DRY_RUN=1 node utils/sync-multi-oracle.mjs

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const DOC = 'for-developer/multi-oracle.md';
const PAGE_ID = '6a54afccfcf04be4afd4ef10ce839169';

const SECTIONS = [
  {
    id: 'bnb-b',
    notionAnchor: 'B. Collaterals using Resilient Oracle',
    docAnchor: 'B. Collaterals using Resilient Oracle',
    skip: /for\s+OracleCenter/i, // CDP-only variants absent from the lending table
    createIfMissing: false,
    fixtureEnv: 'NOTION_FIXTURE_ROWS',
  },
  {
    id: 'eth',
    notionAnchor: 'Ethereum Chain',
    docAnchor: 'Ethereum Chain',
    skip: /for\s+OracleCenter/i,
    createIfMissing: true,
    sectionTitle: 'Ethereum Chain',
    fixtureEnv: 'NOTION_FIXTURE_ROWS_ETH',
    resilientEnv: 'NOTION_FIXTURE_ETH_RESILIENT',
  },
];

const TOKEN = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || '';
const NOTION_VERSION = '2022-06-28';
const DRY_RUN = process.env.DRY_RUN === '1';

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

const blockText = (b) => {
  const rt = b[b.type] && b[b.type].rich_text;
  return Array.isArray(rt) ? rt.map((t) => t.plain_text).join('') : '';
};

// Find, for a given anchor, the first table that follows it on the page,
// plus the Resilient Oracle Address from any quote in between (for new sections).
function findNotionSection(blocks, anchor) {
  let active = false;
  let resilient = null;
  for (const b of blocks) {
    if (b.type === 'paragraph' || b.type.startsWith('heading_')) {
      const t = blockText(b);
      if (t.includes(anchor)) { active = true; resilient = null; continue; }
    }
    if (!active) continue;
    if (b.type === 'quote' && !resilient) {
      resilient = (blockText(b).match(/0x[a-fA-F0-9]{40}/) || [null])[0];
    }
    if (b.type === 'table') return { tableId: b.id, resilient };
  }
  return null;
}

async function sectionRows(sec, blocks) {
  const fx = sec.fixtureEnv && process.env[sec.fixtureEnv];
  if (fx) {
    const rows = JSON.parse(readFileSync(fx, 'utf8')).results.filter((b) => b.type === 'table_row');
    return { rows, resilient: (sec.resilientEnv && process.env[sec.resilientEnv]) || null };
  }
  const found = findNotionSection(blocks, sec.notionAnchor);
  if (!found) throw new Error(`Notion section "${sec.notionAnchor}" not found on the page.`);
  const rows = (await getChildren(found.tableId)).filter((b) => b.type === 'table_row');
  return { rows, resilient: found.resilient };
}

// ---------------------------------------------------------------------------
// Rendering a Notion rich_text cell -> HTML used in the doc table
// ---------------------------------------------------------------------------
function renderCell(richText) {
  const parts = [];
  for (const t of richText || []) {
    const text = t.plain_text || '';
    if (t.href) {
      const url = t.href.startsWith('/') ? `https://www.notion.so${t.href}` : t.href;
      parts.push(`<a href="${url}">${text.trim()}</a>`);
    } else {
      parts.push(text);
    }
  }
  let html = parts.join('').replace(/\r/g, '').trim();
  html = html.replace(/\n+/g, '<br>');
  html = html.replace(/\s{2,}/g, ' ');
  return html === '' ? '-' : html;
}

function renderBound(richText) {
  const raw = renderCell(richText).replace(/<br>/g, ' ');
  if (raw === '-') return '-';
  const up = raw.match(/upper\s*(?:limit|bound)\s*:?\s*([\d.]+)/i);
  const lo = raw.match(/lower\s*(?:limit|bound)\s*:?\s*([\d.]+)/i);
  if (up && lo) return `<p>Upper Limit: ${up[1]}</p><p>Lower Limit: ${lo[1]}</p>`;
  return raw;
}

// Parse a Notion row -> {skip} | {empty} | record | null (header/blank).
function parseNotionRow(row, idx, skipRe) {
  const c = row.table_row.cells;
  const asset = renderCell(c[0]).replace(/<br>/g, ' ');
  if ((idx === 0 && /^asset$/i.test(asset)) || asset === '-') {
    return addrOf(renderCell(c[1] || [])) ? mkRecord(asset, c) : null;
  }
  if (skipRe && skipRe.test(asset)) return { skip: asset };
  const token = addrOf(renderCell(c[1] || []));
  if (!token) return { empty: asset }; // asset present but no token = not ready
  return mkRecord(asset, c);
}

function mkRecord(asset, c) {
  return {
    asset,
    token: addrOf(renderCell(c[1] || [])),
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
function locateTable(doc, anchor) {
  const aIdx = doc.indexOf(anchor);
  if (aIdx === -1) return null;
  const start = doc.indexOf('<table', aIdx);
  if (start === -1) return null;
  const end = doc.indexOf('</table>', start);
  if (end === -1) return null;
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
    if (tds.length < 7) continue;
    rows.push({ tds, token: addrOf(tds[1]) });
  }
  return rows;
}

const renderRow = (tds) => `<tr>${tds.map((t) => `<td>${t}</td>`).join('')}</tr>`;

function renderTable(rows) {
  const head =
    '<table data-full-width="true"><thead><tr>' +
    '<th>Asset</th><th>Token</th><th>Oracle/caller</th><th>Main oracle</th>' +
    '<th>Pivot oracle</th><th>Fallback oracle</th><th>BoundValidator</th>' +
    '</tr></thead><tbody>';
  return head + rows.map((r) => renderRow(r.tds)).join('') + '</tbody></table>';
}

function buildSection(title, resilient, tableHtml) {
  const addr = resilient ? `> Resilient Oracle Address: ${resilient}\n\n` : '';
  return `**${title}**\n\n${addr}${tableHtml}`;
}

// ---------------------------------------------------------------------------
// Merge (keyed by token; never deletes doc rows)
// ---------------------------------------------------------------------------
function merge(docRows, recs) {
  const byToken = new Map(recs.map((r) => [lc(r.token), r]));
  const reformatted = [];
  const valueChanges = [];
  const docOnly = [];
  const consumed = new Set();
  const addrSet = (h) => (h.match(/0x[a-fA-F0-9]{40}/gi) || []).map(lc).sort().join(',');
  const label = (row, rec) => (rec && rec.asset) || row.tds[0].replace(/<[^>]+>/g, '').trim() || row.token;

  for (const row of docRows) {
    const rec = byToken.get(lc(row.token));
    if (rec) {
      consumed.add(lc(row.token));
      const next = [...row.tds];
      const refreshed = [rec.caller, rec.main, rec.pivot, rec.fallback, rec.bound];
      let changed = false;
      let addrChanged = false;
      for (let i = 0; i < 5; i++) {
        if (next[2 + i] !== refreshed[i]) {
          changed = true;
          if (addrSet(next[2 + i]) !== addrSet(refreshed[i])) addrChanged = true;
          next[2 + i] = refreshed[i];
        }
      }
      if (changed) (addrChanged ? valueChanges : reformatted).push(label(row, rec));
      row.tds = next;
    } else if (row.token) {
      docOnly.push(label(row, null));
    }
  }

  const added = [];
  const appended = [];
  for (const [key, rec] of byToken) {
    if (consumed.has(key)) continue;
    appended.push({ tds: [rec.asset, rec.tokenHtml, rec.caller, rec.main, rec.pivot, rec.fallback, rec.bound], token: rec.token });
    added.push(rec.asset);
  }

  return { rows: [...docRows, ...appended], valueChanges, reformatted, added, docOnly };
}

function emit(kv) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(kv).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  }
}

// ---------------------------------------------------------------------------
async function main() {
  const liveNeeded = SECTIONS.some((s) => !(s.fixtureEnv && process.env[s.fixtureEnv]));
  if (liveNeeded && !TOKEN) throw new Error('NOTION_TOKEN is required (or set per-section fixtures for offline runs).');

  const original = readFileSync(DOC, 'utf8');
  let doc = original;
  const blocks = liveNeeded ? await getChildren(PAGE_ID) : null;

  let totalValueChanges = 0;
  let totalAdded = 0;
  const blocksOut = [`## Multi-Oracle sync\n`];

  for (const sec of SECTIONS) {
    const { rows, resilient } = await sectionRows(sec, blocks);
    const parsed = rows.map((r, i) => parseNotionRow(r, i, sec.skip)).filter(Boolean);
    const skipped = parsed.filter((p) => p.skip).map((p) => p.skip);
    const empties = parsed.filter((p) => p.empty).map((p) => p.empty);
    const recs = parsed.filter((p) => p.token);

    const loc = locateTable(doc, sec.docAnchor);
    const line = (lbl, arr) => `- ${lbl}: ${arr.length}${arr.length ? ` — ${arr.join(', ')}` : ''}\n`;
    let report = `\n### ${sec.id} (${sec.notionAnchor})\n- Notion rows scanned: ${rows.length}\n`;

    if (loc) {
      const docRows = parseDocRows(doc.slice(loc.start, loc.end));
      const { rows: merged, valueChanges, reformatted, added, docOnly } = merge(docRows, recs);
      doc = doc.slice(0, loc.start) + renderTable(merged) + doc.slice(loc.end);
      totalValueChanges += valueChanges.length;
      totalAdded += added.length;
      report +=
        line('⚠️ Oracle address changes (review)', valueChanges) +
        line('Added (new collaterals)', added) +
        line('Reformatted only (no address change)', reformatted) +
        line('Skipped (OracleCenter CDP variants)', skipped) +
        line('Not ready (no token address in Notion)', empties) +
        line('In doc, not in Notion (kept, not deleted)', docOnly);
    } else if (sec.createIfMissing) {
      if (recs.length === 0) {
        report += `- Section not in doc and Notion has 0 ready rows — NOT created.\n` +
          line('Not ready (no token address in Notion)', empties);
      } else {
        const { rows: merged, added } = merge([], recs);
        const block = buildSection(sec.sectionTitle, resilient, renderTable(merged));
        doc = `${doc.replace(/\s+$/, '')}\n\n${block}\n`;
        totalAdded += added.length;
        report += `- Created new "${sec.sectionTitle}" section.\n` +
          line('Added (collaterals)', added) +
          line('Skipped (OracleCenter CDP variants)', skipped) +
          line('Not ready (no token address in Notion)', empties);
      }
    } else {
      throw new Error(`Doc anchor "${sec.docAnchor}" not found and createIfMissing is false.`);
    }
    blocksOut.push(report);
  }

  const changed = doc !== original;
  const summary = blocksOut.join('') + `\n**Result:** ${changed ? 'doc updated' : 'no change'}.\n`;
  writeFileSync('oracle-sync-summary.md', summary);
  console.log(summary);

  if (DRY_RUN) console.log(changed ? '[DRY_RUN] doc WOULD change.' : '[DRY_RUN] no change.');
  else if (changed) writeFileSync(DOC, doc);

  emit({ has_changes: String(changed), value_changes: totalValueChanges, added: totalAdded });
}

main().catch((e) => { console.error(e); process.exit(1); });
