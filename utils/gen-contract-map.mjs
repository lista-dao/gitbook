#!/usr/bin/env node
// utils/gen-contract-map.mjs
//
// ONE-TIME / RE-SEED helper. Parses the current GitBook contract pages and emits
// utils/contract-page-map.json — the seed mapping the sync (sync-contracts.mjs)
// uses to know which contract lives on which page/section.
//
// It captures, per target page: { section, name, address } for every contract row.
// Every current target is a markdown pipe-table; an HTML <table> parser is kept for
// the same-shaped pages should one ever be added as a target. The map is the
// disambiguation layer: e.g. bsc-smart-lending has "StableSwapPool" 7x under
// different "## pair" headings — (section,name) makes each unique.
//
// Run: node utils/gen-contract-map.mjs   (writes utils/contract-page-map.json)

import { readFileSync, writeFileSync } from 'node:fs';

// Target GitBook pages. clisbnb is intentionally absent — its contracts live in the frozen
// "Lista Mainnet Contracts" CDP table and are out of scope for Notion-driven sync.
const TARGETS = {
  'bsc-core':          'for-developer/lista-lending/smart-contract-bsc-core.md',
  'bsc-smart-lending': 'for-developer/lista-lending/smart-contract-bsc-smart-lending.md',
  'bsc-oracles':       'for-developer/lista-lending/smart-contract-bsc-oracles.md',
  'bsc-credit':        'for-developer/lista-lending/smart-contract-bsc-credit.md',
  'bsc-brokers':       'for-developer/lista-lending/smart-contract-bsc-brokers.md',
  'ethereum':          'for-developer/lista-lending/smart-contract-ethereum.md',
  'rwa':               'for-developer/rwa/smart-contract.md',
  'lisaster':          'for-developer/lisaster/smart-contract.md',
  'dex-bsc':           'for-developer/dex/smart-contract.md',
};

// Addresses from external/frozen tables that are present in GitBook but have no Notion source.
// Excluded so they don't generate spurious "needs review" noise on every sync run.
const SKIP_ADDRESSES = {
  'bsc-core': new Set([
    '0x665410ee5ea96aa729589491badc11e0fe163d29', // LendingRewardsDistributor (frozen Lending Rebate table)
    '0x2993e9ea76f5839a20673e1b3cf6666ab5b3ae76', // LendingRewardsDistributorV2 (frozen Lending Rebate table)
    '0xcb571b4ac0db9c64b9addd2e6f3d1c7a84e5bff4', // RewardsRouter — Lending emission (frozen Lending Rebate table)
    '0x05a8d0b51a2543184a18af3ada75f8c981143a54', // StableArbExecutor (not in any Notion contract page)
  ]),
};

const ADDR = /0x[a-fA-F0-9]{40}/;
// Strict: a 40-hex NOT continued by more hex (so a 64-hex Market ID's 40-prefix
// is NOT matched). Take the LAST one on a line (the Address is the last column).
const ADDR_LAST = /0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g;
const lastAddr = (s) => { const m = String(s).match(ADDR_LAST); return m ? m[m.length - 1] : null; };
const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const stripMdLink = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'); // [txt](url) -> txt
const cleanName = (s) => stripMdLink(stripTags(s)).replace(/`/g, '').trim();

// Parse a markdown pipe-table page. Section = last ## / ### heading.
function parseMarkdown(text) {
  const rows = [];
  let section = '';
  for (const line of text.split('\n')) {
    const h = line.match(/^#{2,3}\s+(.*\S)\s*$/);
    if (h) { section = h[1].trim(); continue; }
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^-{2,}$/.test(c) || c === '')) continue; // separator
    const addr = lastAddr(line);
    if (!addr) continue; // header or non-data row (no address)
    const name = cleanName(cells[0]);
    if (!name) continue;
    // cols = the other cells (quote/pair/etc.) minus the address cell — used to
    // disambiguate repeated names (e.g. the oracles "Quote" column).
    const cols = cells.map(cleanName).filter((c) => c && !ADDR.test(c) && c !== name);
    rows.push({ section, name, address: addr, cols });
  }
  return rows;
}

// Parse an HTML <table> page (no current target uses this). Section = last ## heading before the table.
function parseHtml(text) {
  const rows = [];
  let section = '';
  for (const line of text.split('\n')) {
    const h = line.match(/^#{2,3}\s+(.*\S)\s*$/);
    if (h) { section = h[1].trim(); }
    for (const tr of line.match(/<tr[\s>][\s\S]*?<\/tr>/gi) || []) {
      const addr = lastAddr(tr);
      if (!addr) continue; // header row
      const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => cleanName(m[1]));
      const name = tds[0];
      if (!name) continue;
      const cols = tds.filter((c) => c && !ADDR.test(c) && c !== name);
      rows.push({ section, name, address: addr, cols });
    }
  }
  return rows;
}

const isHtml = (text) => /<table[\s>]/i.test(text);

const map = {};
let total = 0;
const dupWarn = [];
for (const [page, file] of Object.entries(TARGETS)) {
  const text = readFileSync(file, 'utf8');
  const allRows = isHtml(text) ? parseHtml(text) : parseMarkdown(text);
  const skip = SKIP_ADDRESSES[page] || new Set();
  const rows = allRows.filter((r) => !skip.has(r.address.toLowerCase()));
  if (allRows.length !== rows.length)
    console.log(`  ${page}: skipped ${allRows.length - rows.length} static/frozen address(es)`);
  map[page] = { file, format: isHtml(text) ? 'html' : 'markdown', contracts: rows };
  total += rows.length;
  // sanity: detect duplicate (section|name) within a page — those need section context
  const seen = new Map();
  for (const r of rows) {
    const k = `${r.section}|${r.name}`.toLowerCase();
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const [k, n] of seen) if (n > 1) dupWarn.push(`${page}: "${k}" x${n}`);
}

writeFileSync('utils/contract-page-map.json', JSON.stringify(map, null, 2) + '\n');

console.log('=== contract-page-map.json generated ===');
for (const [page, v] of Object.entries(map)) {
  console.log(`  ${page.padEnd(18)} ${String(v.contracts.length).padStart(3)} contracts  (${v.format})`);
}
console.log(`  ${''.padEnd(18)} ${String(total).padStart(3)} total`);
if (dupWarn.length) {
  console.log('\n⚠️ duplicate (section|name) within a page — these REQUIRE section context to disambiguate:');
  for (const w of dupWarn) console.log(`   ${w}`);
} else {
  console.log('\n✅ every (section|name) is unique within its page.');
}
