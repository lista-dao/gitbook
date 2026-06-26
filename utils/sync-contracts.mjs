#!/usr/bin/env node
// utils/sync-contracts.mjs
//
// Syncs contract ADDRESSES from Notion -> the GitBook contract pages, opening a PR
// (the workflow opens it; this script edits files + writes contract-sync-summary.md).
// Source of truth + routing config below; the per-page contract inventory is
// utils/contract-page-map.json (seed it with utils/gen-contract-map.mjs).
// CDP / Staking / veLISTA / Lista Rights (the frozen "Lista Mainnet Contracts"
// inline tables) are intentionally OUT OF SCOPE.
//
// MATCHING (how a doc row is connected to a Notion entry — safe, no fuzzy guessing):
//   1. ADDRESS-PRESENCE: if a doc row's address is still present in its Notion
//      source, it's current -> no change. (The steady-state 99% case.)
//   2. CHANGE: if a doc row's address is GONE from Notion, find the replacement by
//      TOKEN-SUBSET match — the Notion entry's name tokens must ALL appear in the
//      doc row's (section + name + columns) tokens, and exactly one such unplaced
//      Notion entry must exist. Else the row is REPORTED for review (never guessed).
//      This is how repeated names are located: e.g. doc "StableSwapPool" under
//      "## slisBNB / BNB" matches Notion "StableSwapPool (slisBNB / BNB)".
//   3. NEW: a Notion address not present anywhere in the docs -> route by name rules
//      -> APPEND a row to the routed page, following the existing table structure.
//
// SAFETY: a row is located/edited by its CURRENT ADDRESS (unique within a page) and
// that string is replaced in place — no table re-rendering, so every format (6-col
// brokers, Quote-col oracles, HTML tables) is preserved. A page is written only if
// every intended replacement applied exactly once, else it throws (fail-closed).
// Never deletes; blank/again-missing Notion addresses never overwrite a doc address.
//
// Run:
//   node utils/sync-contracts.mjs --selftest   # offline engine + routing tests
//   node utils/sync-contracts.mjs --verify      # offline E2E against utils/fixtures/notion-contracts.json (no writes)
//   DRY_RUN=1 node utils/sync-contracts.mjs      # live read (needs NOTION_TOKEN), no writes
//   node utils/sync-contracts.mjs                # live; edits files + writes summary

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const MAP_FILE = 'utils/contract-page-map.json';
const FIXTURE = 'utils/fixtures/notion-contracts.json';
const ADDR = /0x[a-fA-F0-9]{40}/;
const ADDR_STRICT = /^0x[a-fA-F0-9]{40}$/; // a whole string that is exactly one address (no trailing junk)
const ADDR_LAST = /0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g; // 40-hex not continued by hex (skips 64-hex Market IDs)
const lastAddr = (s) => { const m = String(s).match(ADDR_LAST); return m ? m[m.length - 1] : null; };
const lc = (s) => (s || '').toLowerCase();
const tokens = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) || []));
const subset = (a, b) => [...a].every((t) => b.has(t)); // a ⊆ b

const SOURCES = {
  'moolah-bsc': {
    notionPageId: '1cf1d713729f8074ad23d47d30c2e580',
    extraPages: ['29c1d713729f803eb96bf4e57a369688'], // the "1.1 Vaults" sub-page
    excludeSections: [/token address/i, /lltv/i, /^\s*market\s*$/i],
    targets: ['bsc-core', 'bsc-smart-lending', 'bsc-oracles', 'bsc-credit'],
    // fullRow so the bsc-oracles PT sections get their Quote column filled, not just
    // name+address. Safe across this source's mixed-width targets: insertRow only writes
    // full cells when they line up (name first, address last, same count) — the bsc-core/
    // credit/smart-lending 2-col tables fall back to name+address, and the oracle sections
    // have a single middle column (Quote) so it can't be mis-ordered.
    fullRow: true,
    routing: [
      { test: /credit/i, page: 'bsc-credit' },
      { test: /stableswap|smartprovider/i, page: 'bsc-smart-lending' },
      { test: /ptlineardiscount|stockoracle|pendlespark/i, page: 'bsc-oracles' },
    ],
    default: 'bsc-core',
  },
  'moolah-eth':      { notionPageId: '27c1d713729f8091bc46c7adabb6030b', targets: ['ethereum'],    default: 'ethereum' },
  // fullRow: the brokers table's Notion column order matches GitBook exactly
  // (Contract | Broker | LLTV | Cap | Market ID | Address), so new rows are inserted
  // with ALL columns, not just name+address. Only enable this where alignment is verified.
  'lending-brokers': { notionPageId: '2f61d713729f80f0be74f1c76e787647', targets: ['bsc-brokers'], default: 'bsc-brokers', fullRow: true },
  'rwa-bsc':         { notionPageId: '36d1d713729f8066b153cbf1f4aa010e', targets: ['rwa'],          default: 'rwa' },
  // RWA ETH: sync only Lista's own contracts — exclude the Roles table and the
  // external underlying tokens (XAUt / CoboFund FundToken & Oracle).
  'rwa-eth':         { notionPageId: '3791d713729f8193ac18dd1f7e54fce9', targets: ['rwa'], default: 'rwa',
                       excludeNames: [/\b(DEFAULT_ADMIN|MANAGER|BOT|PAUSER|feeReceiver)\b/i, /tether gold|cobofund|fundtoken/i] },
  'lisaster':        { notionPageId: '36d1d713729f802ea39bef0849eb39a3', targets: ['lisaster'],     default: 'lisaster' },
  // clisbnb/slisBNBx page is OUT OF SCOPE: those contracts live in the frozen CDP section of
  // Lista Mainnet Contracts and will not change. No Notion sync source is configured for that page.
};
const PAGE_SOURCES = {}; // a page can be fed by MORE THAN ONE source (e.g. rwa <- rwa-bsc + rwa-eth)
for (const [s, cfg] of Object.entries(SOURCES)) for (const p of cfg.targets) (PAGE_SOURCES[p] ??= []).push(s);
const excluded = (cfg, name) => (cfg.excludeNames || []).some((re) => re.test(name));

export function routeNew(sourceKey, name) {
  const cfg = SOURCES[sourceKey];
  for (const r of cfg.routing || []) if (r.test.test(name)) return r.page;
  return cfg.default;
}

// --- in-place address replacement -------------------------------------------
export function applyReplacements(text, repls) {
  const changed = [];
  let out = text;
  for (const r of repls) {
    if (!r.fresh || lc(r.fresh) === lc(r.current)) continue;
    if (!ADDR_STRICT.test(r.fresh)) throw new Error(`fresh not a clean address for ${r.name}: ${r.fresh}`);
    // An address belongs to exactly ONE row = one line. Multiple hits on the SAME line
    // (markdown link text + href, e.g. lisaster's [0x..](..0x..)) are fine and both get
    // updated; the same address on DIFFERENT lines is ambiguous -> fail closed (don't guess).
    const lineHas = new RegExp(r.current, 'i'); // non-global: per-line test, no lastIndex state
    const hitLines = out.split('\n').filter((l) => lineHas.test(l)).length;
    if (hitLines === 0) throw new Error(`current addr for "${r.name}" not found: ${r.current}`);
    if (hitLines > 1) throw new Error(`current addr for "${r.name}" found on ${hitLines} lines (ambiguous, not replacing): ${r.current}`);
    out = out.replace(new RegExp(r.current, 'gi'), r.fresh);
    changed.push({ name: r.name, from: r.current, to: r.fresh });
  }
  return { text: out, changed };
}

// Pick which section a new contract belongs in: the section whose existing rows
// share the new contract's first token (e.g. a new "MoolahVault(BTCB)" joins the
// "### Vaults" section). '' => the page's first/main table.
export function targetSection(pageContracts, name) {
  const t0 = [...tokens(name)][0] || '';
  const bySec = {};
  for (const c of pageContracts) (bySec[c.section] ??= []).push(c);
  let best = null;
  for (const [sec, rows] of Object.entries(bySec)) {
    const hits = rows.filter((r) => tokens(r.name).has(t0)).length;
    if (hits && (!best || hits > best.hits)) best = { sec, hits };
  }
  return best ? best.sec : '';
}

// --- append a NEW contract row, following the page's existing structure -----
export function insertRow(text, format, name, address, section = '', cells = null) {
  if (!ADDR_STRICT.test(address)) throw new Error(`insertRow: not a clean address for "${name}": ${address}`);
  if (format === 'html') {
    // section-targeted placement isn't implemented for HTML tables; fail closed rather
    // than silently inserting into the first <tbody> (which is the wrong section).
    if (section) throw new Error(`insertRow(html): section-targeted insert not supported (section="${section}", name="${name}")`);
    const safe = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const row = `<tr><td>${safe(name)}</td><td><a href="https://bscscan.com/address/${address}">${address}</a></td></tr>`;
    if (!text.includes('</tbody>')) throw new Error('html page has no </tbody> to insert before');
    return text.replace('</tbody>', row + '</tbody>');
  }
  const lines = text.split('\n');
  const isSep = (l) => /^\s*\|/.test(l) && /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && /-/.test(l);
  let from = 0;
  if (section) { // anchor at the matching heading, then its table
    const re = new RegExp(`^#{2,3}\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
    const h = lines.findIndex((l) => re.test(l));
    if (h === -1) throw new Error(`insertRow: section heading not found, refusing to fall back to first table (section="${section}", name="${name}")`);
    from = h;
  }
  let sep = -1;
  for (let i = from; i < lines.length; i++) {
    // When anchored to a section, the table must come BEFORE the next heading; otherwise
    // the section has no (parseable) table and we must NOT fall through into a later one.
    if (section && i > from && /^#{1,6}\s/.test(lines[i])) break;
    if (isSep(lines[i])) { sep = i; break; }
  }
  if (sep === -1) throw new Error(`no table to anchor insert under section="${section}" (refusing to fall into a later section)`);
  const cols = lines[sep].replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').length;
  let end = sep + 1;
  while (end < lines.length && /^\s*\|/.test(lines[end])) end++;
  const clean = (s) => ` ${String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()} `; // a raw '|' would break the table
  // fullRow: write ALL columns from the source row — but ONLY when it lines up with this
  // table (same column count, name in the first column, address in the last). Otherwise
  // fall back to name+address so a misaligned source can never scatter data into wrong columns.
  const aligned = Array.isArray(cells) && cells.length === cols
    && cells[0]?.trim() === name.trim()
    && lc(lastAddr(cells[cols - 1]) || '') === lc(address);
  const out = aligned ? cells.map(clean) : Array(cols).fill(' ');
  if (!aligned) { out[0] = clean(name); out[cols - 1] = clean(address); }
  lines.splice(end, 0, `|${out.join('|')}|`);
  return lines.join('\n');
}

// --- sources (live Notion or fixture) ---------------------------------------
const NOTION_TOKEN = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || '';
async function notion(path) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Notion ${path} -> HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}
async function children(id) {
  const out = []; let c;
  do {
    const d = await notion(`blocks/${id}/children${c ? `?start_cursor=${encodeURIComponent(c)}&page_size=100` : '?page_size=100'}`);
    out.push(...d.results); c = d.has_more ? d.next_cursor : null;
  } while (c);
  return out;
}
const cellText = (cell) => (cell || []).map((t) => t.plain_text).join('').replace(/\s+/g, ' ').trim();
async function liveSource(cfg) {
  const out = []; const pages = [cfg.notionPageId, ...(cfg.extraPages || [])];
  for (const pid of pages) {
    let section = '';
    for (const b of await children(pid)) {
      if (b.type.startsWith('heading_')) section = cellText(b[b.type].rich_text);
      if ((cfg.excludeSections || []).some((re) => re.test(section))) continue;
      if (b.type !== 'table') continue;
      for (const r of await children(b.id)) {
        if (r.type !== 'table_row') continue;
        const cells = r.table_row.cells.map(cellText); // full ordered row, for fullRow sources
        const name = cells[0];
        const addr = lastAddr(cells.join(' '));
        if (name && addr && !ADDR.test(name) && !excluded(cfg, name)) out.push({ name, address: addr, cells });
      }
    }
  }
  return out;
}
function fixtureSources() {
  const fx = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const out = {};
  for (const [s, obj] of Object.entries(fx)) {
    const cfg = SOURCES[s] || {};
    out[s] = Object.entries(obj).map(([address, name]) => ({ name, address })).filter((e) => !excluded(cfg, e.name));
  }
  return out;
}
async function loadSources(useFixture) {
  if (useFixture) return fixtureSources();
  const out = {};
  for (const [s, cfg] of Object.entries(SOURCES)) out[s] = await liveSource(cfg);
  return out;
}

// --- core sync (pure-ish): compute edits + report from map + sources ---------
function plan(map, sources) {
  const report = [];
  const docAddrs = new Set();
  for (const v of Object.values(map)) for (const c of v.contracts) docAddrs.add(lc(c.address));
  const consumed = new Set(); // notion addresses accounted for (steady or change-target)
  const pageEdits = {};       // page -> { repls:[], inserts:[] }

  for (const [page, v] of Object.entries(map)) {
    const entries = (PAGE_SOURCES[page] || []).flatMap((s) => sources[s] || []); // a page may have >1 source
    const byAddr = new Set(entries.map((e) => lc(e.address)));
    const repls = [], changeReview = [];
    for (const c of v.contracts) {
      if (byAddr.has(lc(c.address))) { consumed.add(lc(c.address)); continue; } // steady
      const gitTok = tokens(`${c.section} ${c.name} ${(c.cols || []).join(' ')}`);
      const cand = entries.filter((e) => !docAddrs.has(lc(e.address)) && !consumed.has(lc(e.address)) && subset(tokens(e.name), gitTok));
      if (cand.length === 1) { repls.push({ name: c.name, current: c.address, fresh: cand[0].address }); consumed.add(lc(cand[0].address)); }
      else changeReview.push(`${c.name} (${cand.length} candidates)`);
    }
    (pageEdits[page] ??= { repls: [], inserts: [] }).repls = repls;
    if (repls.length || changeReview.length) {
      report.push(`\n### ${page}\n- address changes: ${repls.length}${repls.length ? ' — ' + repls.map((r) => r.name).join(', ') : ''}`);
      if (changeReview.length) report.push(`- ⚠️ address gone from Notion, needs review: ${changeReview.join(', ')}`);
    }
  }

  // NEW: notion addresses not in docs and not consumed as a change-target.
  for (const [src, entries] of Object.entries(sources)) {
    for (const e of entries) {
      if (docAddrs.has(lc(e.address)) || consumed.has(lc(e.address))) continue;
      const page = routeNew(src, e.name);
      const section = targetSection(map[page]?.contracts || [], e.name);
      const cells = SOURCES[src]?.fullRow ? e.cells : undefined; // only fullRow sources carry the middle columns through
      (pageEdits[page] ??= { repls: [], inserts: [] }).inserts.push({ name: e.name, address: e.address, section, cells });
      consumed.add(lc(e.address)); // dedup: a page fed by >1 source (rwa <- rwa-bsc+rwa-eth) must insert each address once
      report.push(`\n### NEW (${src} -> ${page}${section ? ' #' + section : ''})\n- ${e.name} = ${e.address}`);
    }
  }
  return { pageEdits, report };
}

function emit(kv) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(kv).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
}

// --- offline engine + routing tests -----------------------------------------
function selftest() {
  const map = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
  let pass = 0, fail = 0;
  const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? 'PASS' : 'FAIL'}  ${m}`); };

  console.log('\n[1] round-trip (fresh==current) => 0 changes on every page');
  for (const [page, v] of Object.entries(map)) {
    const text = readFileSync(v.file, 'utf8');
    const { text: out, changed } = applyReplacements(text, v.contracts.map((c) => ({ name: c.name, current: c.address, fresh: c.address })));
    ok(out === text && changed.length === 0, `${page}: unchanged (${v.contracts.length} rows)`);
  }

  console.log('\n[2] single update => exactly that row changes (hardest formats)');
  for (const page of ['bsc-smart-lending', 'bsc-oracles', 'bsc-brokers']) {
    const v = map[page]; const text = readFileSync(v.file, 'utf8');
    const t = v.contracts[2]; const fresh = '0x' + 'a'.repeat(40);
    const { text: out, changed } = applyReplacements(text, v.contracts.map((c) => ({ name: c.name, current: c.address, fresh: c.address === t.address ? fresh : c.address })));
    const diff = out.split('\n').filter((l, i) => l !== text.split('\n')[i]).length;
    ok(changed.length === 1 && out.includes(fresh) && !out.includes(t.address), `${page}: 1 row ("${t.name}"), ${diff} line(s) changed`);
  }

  console.log('\n[3] insertRow produces a valid row (markdown 2-col + html)');
  {
    const core = map['bsc-core']; const t1 = readFileSync(core.file, 'utf8');
    const o1 = insertRow(t1, 'markdown', 'NewCoreThing', '0x' + 'b'.repeat(40));
    ok(o1.includes(`| NewCoreThing |`) && o1.split('\n').length === t1.split('\n').length + 1, 'bsc-core: appended 1 markdown row');
    // clisbnb is out of sync scope but the file is still a valid HTML page — test html insertRow directly
    const t2 = readFileSync('for-developer/clisbnb/smart-contract.md', 'utf8');
    const o2 = insertRow(t2, 'html', 'NewHtmlThing', '0x' + 'c'.repeat(40));
    ok(o2.includes('<td>NewHtmlThing</td>') && /NewHtmlThing[\s\S]*<\/tbody>/.test(o2), 'html: inserted 1 <tr> before </tbody>');
    // section-aware: a new MoolahVault must land inside the "### Vaults" section
    const sec = targetSection(core.contracts, 'MoolahVault(TEST)');
    const l = insertRow(t1, 'markdown', 'MoolahVault(TEST)', '0x' + 'd'.repeat(40), sec).split('\n');
    const vi = l.findIndex((x) => /^###\s+Vaults\s*$/.test(x)), pi = l.findIndex((x) => /^###\s+Providers\s*$/.test(x)), ri = l.findIndex((x) => /MoolahVault\(TEST\)/.test(x));
    ok(sec === 'Vaults' && ri > vi && ri < pi, `MoolahVault -> "Vaults" section (row@${ri}, Vaults@${vi}, Providers@${pi})`);
  }

  console.log('\n[4] routing (incl. OracleAdaptor edge)');
  for (const [n, w] of [['StableSwapPool (X/Y)', 'bsc-smart-lending'], ['SmartProvider (X)', 'bsc-smart-lending'], ['PTLinearDiscountOracle (PT-Z)', 'bsc-oracles'], ['StockOracle', 'bsc-oracles'], ['CreditBrokerX', 'bsc-credit'], ['OracleAdaptor', 'bsc-core'], ['BrandNewCore', 'bsc-core']])
    ok(routeNew('moolah-bsc', n) === w, `"${n}" -> ${routeNew('moolah-bsc', n)} (want ${w})`);

  console.log('\n[5] token-subset match locates a repeated name');
  {
    const gitRow = tokens('slisBNB / BNB StableSwapPool'); // section + name (bsc-smart-lending)
    const hit = subset(tokens('StableSwapPool (slisBNB / BNB)'), gitRow);
    const miss = subset(tokens('StableSwapPool (solvBTC / BTCB)'), gitRow);
    ok(hit && !miss, 'Notion "StableSwapPool (slisBNB / BNB)" matches the slisBNB/BNB row only');
  }

  console.log('\n[6] safety hardening (Codex review fixes)');
  {
    const A = '0x' + 'a'.repeat(40), B = '0x' + 'b'.repeat(40);
    // 6a: same address on TWO different lines => ambiguous => throw (don't replace either)
    let threw = false;
    try { applyReplacements(`| A | ${A} |\n| B | ${A} |`, [{ name: 'A', current: A, fresh: B }]); } catch { threw = true; }
    ok(threw, 'replacement of an address found on 2 different lines throws (ambiguous, fail closed)');

    // 6b: same address twice on ONE line (markdown text + href, lisaster shape) => both updated, 1 change
    const r6b = applyReplacements(`| LisX | [${A}](https://bscscan.com/address/${A}) |`, [{ name: 'LisX', current: A, fresh: B }]);
    ok(r6b.changed.length === 1 && (r6b.text.match(new RegExp(B, 'g')) || []).length === 2, 'text+href on one line: both occurrences updated as 1 change');

    // 6c: fresh address with trailing junk is rejected
    let threwFresh = false;
    try { applyReplacements(`| A | ${A} |`, [{ name: 'A', current: A, fresh: B + 'zz' }]); } catch { threwFresh = true; }
    ok(threwFresh, 'fresh address with trailing junk is rejected (strict validation)');

    // 6d: insertRow with a missing section throws (no silent fallback to the first table)
    let threwSec = false;
    try { insertRow(readFileSync(map['bsc-core'].file, 'utf8'), 'markdown', 'X', '0x' + 'e'.repeat(40), 'NoSuchSection'); } catch { threwSec = true; }
    ok(threwSec, 'insertRow with unknown section throws (fail closed, no wrong-section insert)');

    // 6e: a '|' in a contract name is escaped so the table is not broken
    const o6e = insertRow(readFileSync(map['bsc-core'].file, 'utf8'), 'markdown', 'Weird|Name', '0x' + 'f'.repeat(40));
    ok(o6e.includes('Weird\\|Name'), "markdown insert escapes '|' in the contract name");

    // 6f: 6-column broker table insertion keeps the column count intact
    const brk = map['bsc-brokers']; const bt = readFileSync(brk.file, 'utf8');
    const colCount = (s) => s.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').length;
    const sepLine = bt.split('\n').find((l) => /^\s*\|/.test(l) && /-{2,}/.test(l));
    const newRow = insertRow(bt, 'markdown', 'LendingBroker(TEST)', '0x' + '1'.repeat(40)).split('\n').find((l) => l.includes('LendingBroker(TEST)'));
    ok(newRow && colCount(newRow) === colCount(sepLine), `broker insert keeps column count (${colCount(sepLine)} cols)`);

    // 6g: multi-source page (rwa <- rwa-bsc + rwa-eth) inserts a shared NEW address only ONCE
    const sharedAddr = '0x' + '9'.repeat(40);
    const fakeMap = { rwa: { file: map['lisaster'].file, format: 'markdown', contracts: [] } };
    const fakeSources = { 'rwa-bsc': [{ name: 'SharedThing', address: sharedAddr }], 'rwa-eth': [{ name: 'SharedThing', address: sharedAddr }] };
    const { pageEdits } = plan(fakeMap, fakeSources);
    ok((pageEdits.rwa?.inserts || []).filter((i) => lc(i.address) === lc(sharedAddr)).length === 1, 'rwa: a shared NEW address from 2 sources is inserted exactly once');

    // 6h: a section heading that exists but has NO table must throw, not fall into a later section's table
    const noTbl = '## SecA\n\nsome prose, no table\n\n## SecB\n\n| Name | Address |\n|---|---|\n| Foo | 0x' + '3'.repeat(40) + ' |';
    let threwFall = false;
    try { insertRow(noTbl, 'markdown', 'New', '0x' + '4'.repeat(40), 'SecA'); } catch { threwFall = true; }
    ok(threwFall, 'section with no table throws (does not fall into the next section\'s table)');

    // 6i: fullRow insert writes ALL columns when the source row aligns with the table
    const A6 = '0x' + 'a'.repeat(40);
    const tbl6 = '| Contract | Broker | LLTV | Cap | Market ID | Address |\n| --- | --- | --- | --- | --- | --- |\n| Existing | x/y | 86% | 1M | 0xdead | 0x' + '7'.repeat(40) + ' |';
    const full = ['LendingBroker(X&Y/Z)', 'X&Y/Z', '96.5%', '50M', '0x' + 'c'.repeat(64), A6];
    const o6i = insertRow(tbl6, 'markdown', 'LendingBroker(X&Y/Z)', A6, '', full).split('\n').find((l) => l.includes('X&Y/Z') && l.includes(A6));
    ok(o6i && o6i.includes('96.5%') && o6i.includes('50M') && o6i.includes('0x' + 'c'.repeat(64)), 'fullRow insert fills all middle columns (Broker/LLTV/Cap/Market ID)');

    // 6j: misaligned cells (wrong count / address not last) fall back to name+address, never scatter
    const o6j = insertRow(tbl6, 'markdown', 'Safe', A6, '', ['Safe', 'junk', A6]); // only 3 cells for a 6-col table
    const row6j = o6j.split('\n').find((l) => l.includes('Safe') && l.includes(A6));
    ok(row6j && !row6j.includes('junk'), 'misaligned fullRow cells are ignored (safe fallback to name+address)');
  }

  console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)`);
  process.exit(fail === 0 ? 0 : 1);
}

// --- main -------------------------------------------------------------------
async function main() {
  if (process.argv.includes('--selftest')) return selftest();
  const verify = process.argv.includes('--verify');
  const DRY = (verify && !process.argv.includes('--write')) || process.env.DRY_RUN === '1';
  if (!verify && !NOTION_TOKEN) throw new Error('NOTION_TOKEN required for live run (or use --verify / --selftest).');

  const map = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
  const sources = await loadSources(verify);
  const { pageEdits, report } = plan(map, sources);

  let changed = 0, added = 0;
  for (const [page, ed] of Object.entries(pageEdits)) {
    const v = map[page]; if (!v) throw new Error(`route to unknown page "${page}" — refusing to silently drop its edits`);
    let text = readFileSync(v.file, 'utf8');
    const r = applyReplacements(text, ed.repls); text = r.text; changed += r.changed.length;
    for (const ins of ed.inserts) { text = insertRow(text, v.format, ins.name, ins.address, ins.section, ins.cells); added += 1; }
    if ((r.changed.length || ed.inserts.length) && !DRY) writeFileSync(v.file, text);
  }

  const summary = '## Contract sync\n' + report.join('') + `\n\n**Result:** ${changed} address change(s), ${added} new contract(s).${DRY ? ' [no writes]' : ''}\n`;
  console.log(summary);
  if (!DRY) writeFileSync('contract-sync-summary.md', summary);
  emit({ changed, added, has_changes: String(changed > 0 || added > 0) });
}

main().catch((e) => { console.error(e); process.exit(1); });
