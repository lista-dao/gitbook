#!/usr/bin/env node
// utils/sync-multi-oracle.mjs
//
// Keeps the oracle-config tables in the Multi-Oracle docs in sync with the
// canonical Notion source ("Multi-Oracle For GitBook",
// page 6a54afccfcf04be4afd4ef10ce839169). Three sections are synced:
//
//   * BNB Chain — core collaterals   -> for-developer/multi-oracle.md
//   * BNB Chain — bStock collaterals -> for-developer/multi-oracle-bstock.md
//   * Ethereum Chain                 -> for-developer/multi-oracle.md
//
// The two BNB sections read the SAME Notion table ("BNB Chain") and PARTITION
// it by asset name: rows whose Asset matches BSTOCK_RE (the "(bStock)" suffix)
// go to the bStock page, everything else stays on the main page. Notion keeps a
// single flat table — the split is a docs-side concern only. Drift in the
// naming convention would relocate rows wholesale between the two pages; the
// mass-removal cap in main() catches that and fails the run instead.
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
// GITHUB_OUTPUT: has_changes, value_changes, added, changed_files (space-separated
// paths, for `git add`). Writes oracle-sync-summary.md
// (skipped under DRY_RUN). Offline test: per-section fixtures, e.g.
//   NOTION_FIXTURE_ROWS=./bnb.json NOTION_FIXTURE_ROWS_ETH=./eth.json \
//   NOTION_FIXTURE_ETH_RESILIENT=0xA64F... DRY_RUN=1 node utils/sync-multi-oracle.mjs

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const DOC = 'for-developer/multi-oracle.md';
const DOC_BSTOCK = 'for-developer/multi-oracle-bstock.md';
const PAGE_ID = '6a54afccfcf04be4afd4ef10ce839169';

// Asset-name classifier for the BNB partition. Tokenized-equity collaterals are
// named "<TICKER>B (bStock)" in Notion. Keep this in sync with the naming
// convention agreed with the contract team; see the partition guard below.
// Full-width parens are accepted too: the Notion table is edited by people on
// CJK input methods, where "（bStock）" is what you get without switching modes,
// and an ASCII-only class would silently route that row to the wrong page.
// Delimiters must MATCH: a mismatched "(bStock）" is a typo, not a convention,
// and letting it classify a row means a typo silently moves a live contract
// address to the other page.
const BSTOCK_RE = /\(\s*bstock\s*\)|（\s*bstock\s*）/i;

const SECTIONS = [
  {
    id: 'bnb-core',
    // The page has a single "BNB Chain" table (the old A./B. split was removed
    // in the 2026-06-22 rebuild); the doc was restructured to match.
    notionAnchor: 'BNB Chain',
    doc: DOC,
    docAnchor: 'BNB Chain',
    skip: /for\s+OracleCenter/i,
    rowFilter: (rec) => !BSTOCK_RE.test(rec.asset),
    createIfMissing: false,
    mirror: true, // doc mirrors Notion: rows absent from Notion are removed
    fixtureEnv: 'NOTION_FIXTURE_ROWS',
  },
  {
    id: 'bnb-bstock',
    // Same Notion table as bnb-core, complementary half of the partition.
    notionAnchor: 'BNB Chain',
    doc: DOC_BSTOCK,
    docAnchor: 'BNB Chain',
    skip: /for\s+OracleCenter/i,
    rowFilter: (rec) => BSTOCK_RE.test(rec.asset),
    createIfMissing: false,
    mirror: true,
    fixtureEnv: 'NOTION_FIXTURE_ROWS',
  },
  {
    id: 'eth',
    notionAnchor: 'Ethereum Chain',
    doc: DOC,
    docAnchor: 'Ethereum Chain',
    skip: /for\s+OracleCenter/i,
    createIfMissing: true,
    mirror: true,
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

// Sections that share a Notion anchor (the BNB partition) read the same table —
// fetch it once.
const rowCache = new Map();
async function sectionRows(sec, blocks) {
  const key = (sec.fixtureEnv && process.env[sec.fixtureEnv]) || `anchor:${sec.notionAnchor}`;
  if (!rowCache.has(key)) rowCache.set(key, fetchSectionRows(sec, blocks));
  return rowCache.get(key);
}

async function fetchSectionRows(sec, blocks) {
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

// Token uniqueness must be asserted over the WHOLE Notion table, before any
// rowFilter runs. merge()'s own duplicate guard only sees one half of the
// partition, so a token listed twice — once as "FOO", once as "FOO (bStock)" —
// would put one copy on each page, with neither guard firing and the two pages
// publishing different oracle addresses for the same on-chain token.
function assertUniqueTokens(recs, sec) {
  const seen = new Map();
  for (const r of recs) {
    const k = lc(r.token);
    if (seen.has(k)) {
      throw new Error(
        `[${sec.id}] Duplicate token ${k} in the "${sec.notionAnchor}" Notion table ` +
          `("${seen.get(k)}" and "${r.asset}") — refusing to merge.`
      );
    }
    seen.set(k, r.asset);
  }
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
// Locate a section's table. The anchor must appear in its BOLD heading form
// ("**BNB Chain**") and the table must sit between that heading and the next
// heading. A bare indexOf(anchor) would happily match the anchor inside prose
// and then bind to a DIFFERENT section's table — which mirror-merge would go on
// to overwrite with the wrong chain's rows. Returns null only when the section
// is genuinely absent (-> createIfMissing); an anchor with no table under it is
// a malformed page, so throw rather than guess.
// Blank out regions that look like markup but are inert when rendered, keeping
// every byte offset intact so matches still index into the original document.
// Without this, a `**BNB Chain**` inside a fenced example or an HTML comment is
// indistinguishable from the real heading — and if that inert region also holds
// a syntactically valid <table>, the sync happily rewrites the DEAD table and
// leaves the published one stale.
function maskInert(doc) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  return doc.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|<!--[\s\S]*?-->/g, blank);
}

function locateTable(doc, anchor) {
  const masked = maskInert(doc);
  // The anchor counts only as a STANDALONE bold line — the same shape used for
  // the boundary below. An inline mention ("see **Ethereum Chain** below") sits
  // at a lower index than the real heading, so a bare indexOf would bind this
  // section to whichever table follows the PROSE, and mirror-merge would
  // overwrite it with the wrong chain's rows.
  const re = new RegExp(`(^|\\n)\\*\\*${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*[ \\t]*(?=\\r?\\n|$)`, 'g');
  const hits = [...masked.matchAll(re)];
  if (hits.length === 0) return null;
  // Two live headings with the same name: first-match would silently pick one
  // and let the other drift. There is no safe way to guess which is canonical.
  if (hits.length > 1)
    throw new Error(`Section "${anchor}" appears ${hits.length} times as a heading in the doc — ambiguous, refusing to write.`);
  const m = hits[0];
  const after = m.index + m[0].length;
  // Boundary = the next STANDALONE bold line (nothing after the closing **) or
  // the next ATX heading. Requiring the line to end there matters: section
  // headings are standalone bold lines, but ordinary prose like
  // "**Note:** the pivot is ..." is not a section break, and treating it as one
  // would make a routine docs edit abort the unattended weekly sync.
  const rel = masked.slice(after).search(/\n\*\*[^*\n]+\*\*[ \t]*(?=\r?\n|$)|\n#{1,6}\s/);
  const limit = rel === -1 ? doc.length : after + rel;
  const start = masked.indexOf('<table', after);
  if (start === -1 || start >= limit) throw new Error(`Section "${anchor}" has no <table> before the next heading — refusing to write.`);
  const end = masked.indexOf('</table>', start);
  if (end === -1 || end >= limit) throw new Error(`Section "${anchor}" has an unterminated <table> — refusing to write.`);
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

function merge(docRows, recs, mirror) {
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
  const docOnly = []; // in doc, not in Notion — kept (non-mirror sections only)
  const removed = []; // in doc, not in Notion — removed (mirror sections)
  const consumed = new Set();
  const kept = [];
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
      kept.push(row);
    } else {
      // doc row not present in Notion
      if (mirror) removed.push(label(row, null));
      else { docOnly.push(label(row, null)); kept.push(row); }
    }
  }

  const added = [];
  const appended = [];
  for (const [key, rec] of byToken) {
    if (consumed.has(key)) continue;
    appended.push({ tds: [rec.asset, rec.tokenHtml, rec.caller, rec.main, rec.pivot, rec.fallback, rec.bound], token: rec.token });
    added.push(rec.asset);
  }

  return { rows: [...kept, ...appended], valueChanges, labelChanges, reformatted, keptBlank, added, docOnly, removed };
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

  // path -> { original, doc }
  const docs = new Map();
  const loadDoc = (path) => {
    if (!docs.has(path)) {
      const original = readFileSync(path, 'utf8');
      docs.set(path, { original, doc: original });
    }
    return docs.get(path);
  };

  const blocks = liveNeeded ? await getChildren(PAGE_ID) : null;

  let totalValueChanges = 0;
  let totalAdded = 0;
  // Cross-page relocation tracking. The two BNB pages are partitioned purely by
  // the Asset cell's "(bStock)" suffix, so a typo there moves a live collateral
  // to the other page at exit 0. A wrongly-classified row is indistinguishable
  // from a genuine reclassification, so this cannot fail closed — it surfaces
  // every move in the run summary the workflow attaches to its commit.
  const beforeDocs = new Map();
  const afterDocs = new Map();
  const assetLabel = new Map();
  const addTo = (m, k, v) => m.set(k, (m.get(k) || new Set()).add(v));
  const out = [`## Multi-Oracle sync\n`];
  const line = (lbl, arr) => `- ${lbl}: ${arr.length}${arr.length ? ` — ${arr.join(', ')}` : ''}\n`;

  for (const sec of SECTIONS) {
    const { rows, resilient } = await sectionRows(sec, blocks);
    validateHeader(rows, sec);
    const parsed = rows.map((r, i) => parseNotionRow(r, i, sec.skip)).filter(Boolean);
    const skipped = parsed.filter((p) => p.skip).map((p) => p.skip);
    const empties = parsed.filter((p) => p.empty).map((p) => p.empty);
    const all = parsed.filter((p) => p.token);
    assertUniqueTokens(all, sec);
    const recs = sec.rowFilter ? all.filter(sec.rowFilter) : all;

    const target = loadDoc(sec.doc);
    const loc = locateTable(target.doc, sec.docAnchor);
    let report = `\n### ${sec.id} (${sec.notionAnchor} -> ${sec.doc})\n- Notion rows scanned: ${rows.length}\n`;
    if (sec.rowFilter) report += `- Matched this section's partition: ${recs.length} of ${all.length} ready rows\n`;

    if (loc) {
      const docRows = parseDocRows(target.doc.slice(loc.start, loc.end));
      if (sec.rowFilter) {
        for (const row of docRows) addTo(beforeDocs, lc(row.token), sec.doc);
        for (const x of recs) {
          addTo(afterDocs, lc(x.token), sec.doc);
          assetLabel.set(lc(x.token), x.asset);
        }
      }
      const r = merge(docRows, recs, sec.mirror);
      // Mass-removal cap. In mirror mode every doc row missing from Notion is
      // deleted, unbounded — so a truncated fetch, a bad anchor, or drift in the
      // bStock naming convention (which would relocate rows wholesale between
      // the two pages) can silently wipe published contract addresses. Additions
      // never increment `removed`, so this cannot false-positive on a bulk
      // listing; it only fires on a bulk DELIST, which warrants a human anyway.
      const cap = Math.max(3, Math.ceil(docRows.length * 0.15));
      // Exact '1' only — an inherited or mistyped ORACLE_ALLOW_BULK_REMOVAL=0
      // must not read as "override enabled" and disarm the guard in production.
      if (sec.mirror && r.removed.length > cap && process.env.ORACLE_ALLOW_BULK_REMOVAL !== '1') {
        throw new Error(
          `[${sec.id}] ${r.removed.length} of ${docRows.length} rows would be removed from ${sec.doc} ` +
            `(cap ${cap}): ${r.removed.slice(0, 8).join(', ')}${r.removed.length > 8 ? ', …' : ''}. ` +
            `Refusing to write. Set ORACLE_ALLOW_BULK_REMOVAL=1 to override once the delist is confirmed.` +
            (sec.rowFilter && recs.length === 0
              ? ` NOTE: this section's partition matched 0 of ${all.length} Notion rows — the asset-naming convention has probably changed; check BSTOCK_RE.`
              : '')
        );
      }
      target.doc = target.doc.slice(0, loc.start) + renderTable(r.rows) + target.doc.slice(loc.end);
      totalValueChanges += r.valueChanges.length;
      totalAdded += r.added.length;
      report +=
        line('⚠️ Oracle address changes (review)', r.valueChanges) +
        line('⚠️ Kept doc value (Notion cell blank)', r.keptBlank) +
        line('⚠️ Removed (in doc, not in Notion)', r.removed) +
        line('Label/text changes', r.labelChanges) +
        line('Added (new collaterals)', r.added) +
        line('Reformatted only', r.reformatted) +
        line('Skipped (OracleCenter CDP variants)', skipped) +
        line('Not ready (no token address in Notion)', empties) +
        line('In doc, not in Notion (kept)', r.docOnly);
    } else if (sec.createIfMissing) {
      if (recs.length === 0) {
        report += `- Section not in doc and Notion has 0 ready rows — NOT created.\n` + line('Not ready (no token address)', empties);
      } else {
        const r = merge([], recs, sec.mirror);
        target.doc = `${target.doc.replace(/\s+$/, '')}\n\n${buildSection(sec.sectionTitle, resilient, renderTable(r.rows))}\n`;
        totalAdded += r.added.length;
        report += `- Created new "${sec.sectionTitle}" section.\n` +
          line('Added (collaterals)', r.added) +
          line('Skipped (OracleCenter CDP variants)', skipped) +
          line('Not ready (no token address)', empties);
      }
    } else {
      throw new Error(`Doc anchor "${sec.docAnchor}" not found in ${sec.doc} and createIfMissing is false.`);
    }
    out.push(report);
  }

  // Cross-page relocations. Compare the set of pages a token sat on BEFORE with
  // the set it sits on AFTER — not "added here / removed there", which misses
  // the case where the destination page already carried the token.
  const relocated = [];
  for (const [t, after] of afterDocs) {
    const before = beforeDocs.get(t);
    if (!before || before.size === 0) continue; // brand-new collateral, not a move
    const moved = [...after].some((d) => !before.has(d)) || [...before].some((d) => !after.has(d));
    if (moved) relocated.push(`${assetLabel.get(t) || t} (${t}): ${[...before].join(' + ')} -> ${[...after].join(' + ')}`);
  }
  // Fail closed. A typo in the Asset cell and a genuine reclassification are
  // textually identical, so the script cannot tell them apart — and a warning
  // in the job summary only reaches a human AFTER the address is published and
  // the translation/RAG cascade has run. Stop instead, and make a real
  // reclassification an explicit one-run decision.
  if (relocated.length && process.env.ORACLE_ALLOW_RECLASSIFY !== '1') {
    throw new Error(
      `${relocated.length} collateral(s) would change page:\n` +
        relocated.map((s) => `  - ${s}\n`).join('') +
        `A page change comes purely from the Asset cell gaining or losing the "(bStock)" suffix, so a typo ` +
        `looks exactly like a real reclassification. Refusing to write. Confirm in Notion, then re-run with ` +
        `ORACLE_ALLOW_RECLASSIFY=1.`
    );
  }

  const dirty = [...docs.entries()].filter(([, v]) => v.doc !== v.original).map(([p]) => p);
  const changed = dirty.length > 0;
  const summary =
    out.join('') + `\n**Result:** ${changed ? `updated ${dirty.join(', ')}` : 'no change'}.\n`;
  console.log(summary);
  if (!DRY_RUN) {
    // Docs first: if a write throws, the summary must not already claim success.
    for (const path of dirty) writeFileSync(path, docs.get(path).doc);
    writeFileSync('oracle-sync-summary.md', summary);
  } else {
    console.log(changed ? `[DRY_RUN] WOULD change: ${dirty.join(', ')} (nothing written).` : '[DRY_RUN] no change.');
  }

  emit({ has_changes: String(changed), value_changes: totalValueChanges, added: totalAdded, changed_files: dirty.join(' ') });
}

main().catch((e) => { console.error(e); process.exit(1); });
