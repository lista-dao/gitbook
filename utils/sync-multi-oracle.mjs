#!/usr/bin/env node
// utils/sync-multi-oracle.mjs
//
// Keeps the oracle-config tables in for-developer/multi-oracle.md in sync with
// the canonical Notion source ("Multi-Oracle For GitBook",
// page 6a54afccfcf04be4afd4ef10ce839169). Two sections are synced:
//
//   * BNB Chain (Notion anchor "BNB Chain")   — merged into the doc's existing
//     "B. Collaterals using Resilient Oracle" table.
//   * Ethereum Chain (Notion anchor "Ethereum Chain") — created if missing.
//
// Notion is the SOURCE OF TRUTH for the volatile oracle-value columns
// (Oracle/caller, Main, Pivot, Fallback, BoundValidator). The script does a
// keyed MERGE — never a blind mirror:
//
//   * Rows matched by TOKEN ADDRESS (case-insensitive). On a match only the
//     five value columns are refreshed; the doc's Asset cell is PRESERVED.
//   * Doc rows with no Notion match are KEPT (never deleted) and reported.
//   * Notion rows with no doc match are APPENDED.
//   * CDP-only "OracleCenter" variants are SKIPPED.
//   * Notion rows with no token address are "not ready" and ignored.
//
// Safety guards (refuse to write / fail loudly rather than corrupt the doc):
//   * Notion table header is validated before merging (wrong/!shifted table).
//   * Duplicate Notion token keys abort the run.
//   * A blank Notion value never overwrites a doc cell that holds an address
//     (guards against half-saved Notion edits); such rows are reported.
//   * Doc table parse is attribute-tolerant and verifies parsed row count ==
//     raw <tr> count, else it throws (never silently drops a row).
//   * Notion text/URLs are HTML-escaped on output.
//
// Used by .github/workflows/oracle-watch.yml (weekly). No external deps.
// GITHUB_OUTPUT: has_changes, value_changes, added. Writes oracle-sync-summary.md
// (skipped under DRY_RUN). Offline test: per-section fixtures, e.g.
//   NOTION_FIXTURE_ROWS=./bnb.json NOTION_FIXTURE_ROWS_ETH=./eth.json \
//   NOTION_FIXTURE_ETH_RESILIENT=0xA64F... DRY_RUN=1 node utils/sync-multi-oracle.mjs

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const DOC = 'for-developer/multi-oracle.md';
const PAGE_ID = '6a54afccfcf04be4afd4ef10ce839169';

const SECTIONS = [
  {
    id: 'bnb-b',
    // The page now has a single "BNB Chain" table (the old A./B. split was
    // removed in the 2026-06-22 rebuild). Anchor matches the heading exactly.
    notionAnchor: 'BNB Chain',
    docAnchor: 'B. Collaterals using Resilient Oracle', // doc still uses this heading
    skip: /for\s+OracleCenter/i,
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
const hasAddr = (html) => /0x[a-fA-F0-9]{40}/.test(html);
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escText(s).replace(/"/g, '&quot;');

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
    const q = cursor ? `?start_cursor=${encodeURIComponent(cursor)}&page_size=100` : '?page_size=100';
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

// Find the first table under an anchor heading/paragraph (exact text match),
// bounded by the next labelled block. Also returns the Resilient Oracle Address
// from any quote in between (used when creating a new section).
function findNotionSection(blocks, anchor) {
  let active = false;
  let resilient = null;
  for (const b of blocks) {
    const labelled = b.type === 'paragraph' || b.type.startsWith('heading_');
    if (labelled) {
      const t = blockText(b).trim();
      if (!active && t === anchor) { active = true; resilient = null; continue; }
      if (active && t && t !== anchor) { active = false; } // a new labelled block before any table -> stop
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
    const data = JSON.parse(readFileSync(fx, 'utf8'));
    if (data.has_more) throw new Error(`Fixture ${fx} has has_more=true (paginated) — not supported in fixture mode.`);
    return { rows: data.results.filter((b) => b.type === 'table_row'), resilient: (sec.resilientEnv && process.env[sec.resilientEnv]) || null };
  }
  const found = findNotionSection(blocks, sec.notionAnchor);
  if (!found) throw new Error(`Notion section "${sec.notionAnchor}" not found on the page.`);
  return { rows: (await getChildren(found.tableId)).filter((b) => b.type === 'table_row'), resilient: found.resilient };
}

// ---------------------------------------------------------------------------
// Rendering a Notion rich_text cell -> HTML
// ---------------------------------------------------------------------------
function renderCell(richText) {
  const parts = [];
  for (const t of richText || []) {
    const text = t.plain_text || '';
    if (t.href) {
      const url = t.href.startsWith('/') ? `https://www.notion.so${t.href}` : t.href;
      parts.push(`<a href="${escAttr(url)}">${escText(text.trim())}</a>`);
    } else {
      parts.push(escText(text));
    }
  }
  let html = parts.join('').replace(/\r/g, '').trim();
  html = html.replace(/\n+/g, '<br>');
  html = html.replace(/[ \t]{2,}/g, ' '); // collapse runs of spaces/tabs (not across <br>)
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

function mkRecord(c) {
  return {
    asset: renderCell(c[0]).replace(/<br>/g, ' '),
    token: addrOf(renderCell(c[1] || [])),
    tokenHtml: renderCell(c[1]),
    caller: renderCell(c[2] || []),
    main: renderCell(c[3] || []),
    pivot: renderCell(c[4] || []),
    fallback: renderCell(c[5] || []),
    bound: renderBound(c[6] || []),
  };
}

// Parse a Notion row -> {skip} | {empty} | record | null (header/blank).
function parseNotionRow(row, idx, skipRe) {
  const c = row.table_row.cells;
  const asset = renderCell(c[0]).replace(/<br>/g, ' ');
  if ((idx === 0 && /^asset$/i.test(asset)) || asset === '-') {
    return addrOf(renderCell(c[1] || [])) ? mkRecord(c) : null;
  }
  if (skipRe && skipRe.test(asset)) return { skip: asset };
  if (!addrOf(renderCell(c[1] || []))) return { empty: asset }; // asset but no token = not ready
  return mkRecord(c);
}

// Validate the Notion table header so we never merge a wrong/shifted table.
function validateHeader(rows, sec) {
  if (!rows.length) throw new Error(`[${sec.id}] Notion table is empty.`);
  const h = rows[0].table_row.cells.map((c) => lc(renderCell(c)));
  const ok = h.length >= 7 && /asset/.test(h[0]) && /token/.test(h[1]) && /main/.test(h[3] || '');
  if (!ok) throw new Error(`[${sec.id}] Unexpected Notion header (got: ${h.join(' | ')}). Refusing to merge.`);
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
  const rawTr = (bodyM[1].match(/<tr[\s>]/gi) || []).length;
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(bodyM[1]))) {
    const tds = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1]);
    if (tds.length < 7) throw new Error(`Doc row has ${tds.length} cells (<7): ${m[1].slice(0, 80)}`);
    rows.push({ tds, token: addrOf(tds[1]) });
  }
  if (rows.length !== rawTr) throw new Error(`Parsed ${rows.length} rows but found ${rawTr} <tr> — refusing to write (would drop a row).`);
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
// Merge (keyed by token; never deletes; never wipes an address with a blank)
// ---------------------------------------------------------------------------
const addrSet = (h) => (h.match(/0x[a-fA-F0-9]{40}/gi) || []).map(lc).sort().join(',');
const textKey = (h) => h.replace(/<[^>]+>/g, '').replace(/0x[a-fA-F0-9]{40}/gi, '').replace(/\s+/g, '').toLowerCase();
const isNone = (h) => h.replace(/<[^>]+>/g, '').replace(/[-\s]/g, '') === '';

function merge(docRows, recs) {
  // Duplicate token guard.
  const seen = new Set();
  for (const r of recs) {
    const k = lc(r.token);
    if (seen.has(k)) throw new Error(`Duplicate token ${k} (${r.asset}) in Notion section — refusing to merge.`);
    seen.add(k);
  }
  const byToken = new Map(recs.map((r) => [lc(r.token), r]));

  const valueChanges = []; // an oracle ADDRESS changed
  const labelChanges = []; // non-address text changed (e.g. feed label)
  const reformatted = []; // whitespace/<br> only
  const keptBlank = []; // Notion blank would have wiped a doc address — kept doc value
  const docOnly = [];
  const consumed = new Set();
  const label = (row, rec) => (rec && rec.asset) || row.tds[0].replace(/<[^>]+>/g, '').trim() || row.token;

  for (const row of docRows) {
    const rec = byToken.get(lc(row.token));
    if (rec) {
      consumed.add(lc(row.token));
      const next = [...row.tds];
      const refreshed = [rec.caller, rec.main, rec.pivot, rec.fallback, rec.bound];
      let addr = false, text = false, fmt = false, blanked = false;
      for (let i = 0; i < 5; i++) {
        const before = next[2 + i];
        const after = refreshed[i];
        if (before === after) continue;
        if (isNone(after) && hasAddr(before)) { blanked = true; continue; } // never wipe an address with a blank
        if (addrSet(before) !== addrSet(after)) addr = true;
        else if (textKey(before) !== textKey(after)) text = true;
        else fmt = true;
        next[2 + i] = after;
      }
      const name = label(row, rec);
      if (addr) valueChanges.push(name);
      else if (text) labelChanges.push(name);
      else if (fmt) reformatted.push(name);
      if (blanked) keptBlank.push(name);
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

  return { rows: [...docRows, ...appended], valueChanges, labelChanges, reformatted, keptBlank, added, docOnly };
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
  const out = [`## Multi-Oracle sync\n`];
  const line = (lbl, arr) => `- ${lbl}: ${arr.length}${arr.length ? ` — ${arr.join(', ')}` : ''}\n`;

  for (const sec of SECTIONS) {
    const { rows, resilient } = await sectionRows(sec, blocks);
    validateHeader(rows, sec);
    const parsed = rows.map((r, i) => parseNotionRow(r, i, sec.skip)).filter(Boolean);
    const skipped = parsed.filter((p) => p.skip).map((p) => p.skip);
    const empties = parsed.filter((p) => p.empty).map((p) => p.empty);
    const recs = parsed.filter((p) => p.token);

    const loc = locateTable(doc, sec.docAnchor);
    let report = `\n### ${sec.id} (${sec.notionAnchor})\n- Notion rows scanned: ${rows.length}\n`;

    if (loc) {
      const docRows = parseDocRows(doc.slice(loc.start, loc.end));
      const r = merge(docRows, recs);
      doc = doc.slice(0, loc.start) + renderTable(r.rows) + doc.slice(loc.end);
      totalValueChanges += r.valueChanges.length;
      totalAdded += r.added.length;
      report +=
        line('⚠️ Oracle address changes (review)', r.valueChanges) +
        line('⚠️ Kept doc value (Notion cell blank)', r.keptBlank) +
        line('Label/text changes', r.labelChanges) +
        line('Added (new collaterals)', r.added) +
        line('Reformatted only', r.reformatted) +
        line('Skipped (OracleCenter CDP variants)', skipped) +
        line('Not ready (no token address in Notion)', empties) +
        line('In doc, not in Notion (kept, not deleted)', r.docOnly);
    } else if (sec.createIfMissing) {
      if (recs.length === 0) {
        report += `- Section not in doc and Notion has 0 ready rows — NOT created.\n` + line('Not ready (no token address)', empties);
      } else {
        const r = merge([], recs);
        doc = `${doc.replace(/\s+$/, '')}\n\n${buildSection(sec.sectionTitle, resilient, renderTable(r.rows))}\n`;
        totalAdded += r.added.length;
        report += `- Created new "${sec.sectionTitle}" section.\n` +
          line('Added (collaterals)', r.added) +
          line('Skipped (OracleCenter CDP variants)', skipped) +
          line('Not ready (no token address)', empties);
      }
    } else {
      throw new Error(`Doc anchor "${sec.docAnchor}" not found and createIfMissing is false.`);
    }
    out.push(report);
  }

  const changed = doc !== original;
  const summary = out.join('') + `\n**Result:** ${changed ? 'doc updated' : 'no change'}.\n`;
  console.log(summary);
  if (!DRY_RUN) {
    writeFileSync('oracle-sync-summary.md', summary);
    if (changed) writeFileSync(DOC, doc);
  } else {
    console.log(changed ? '[DRY_RUN] doc WOULD change (nothing written).' : '[DRY_RUN] no change.');
  }

  emit({ has_changes: String(changed), value_changes: totalValueChanges, added: totalAdded });
}

main().catch((e) => { console.error(e); process.exit(1); });
