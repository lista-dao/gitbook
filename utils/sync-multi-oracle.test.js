const test = require("node:test");
const assert = require("node:assert");

// The module under test is ESM (.mjs); load it once via dynamic import.
let mod;
test.before(async () => {
  mod = await import("./sync-multi-oracle.mjs");
});

// 40-hex addresses.
const A = "0x" + "a".repeat(40);
const B = "0x" + "b".repeat(40);
const C = "0x" + "c".repeat(40);
const link = (addr) => `<a href="https://x">${addr}</a>`;
const lc = (s) => s.toLowerCase();

// A doc row: [asset, tokenHtml, caller, main, pivot, fallback, bound].
const docRow = (asset, token, caller = "-") => ({
  token,
  tds: [asset, link(token), caller, "-", "-", "-", "-"],
});
// A Notion rec matching the doc-row shape.
const rec = (asset, token, caller = "-") => ({
  asset,
  token,
  tokenHtml: link(token),
  caller,
  main: "-",
  pivot: "-",
  fallback: "-",
  bound: "-",
});

test("merge: removedTokens is aligned with removed (mirror delete)", () => {
  const rows = [docRow("ALPHA", A, link(A)), docRow("BOB", B)];
  const recs = [rec("ALPHA", A, link(A))]; // ALPHA kept, BOB missing -> removed
  const r = mod.merge(rows, recs, /* mirror */ true);
  assert.deepEqual(r.removed, ["BOB"]);
  assert.deepEqual(r.removedTokens, [lc(B)]);
  assert.equal(r.removed.length, r.removedTokens.length);
});

test("merge: non-mirror keeps doc-only rows and reports no removals", () => {
  const rows = [docRow("BOB", B)];
  const r = mod.merge(rows, [], /* mirror */ false);
  assert.deepEqual(r.removed, []);
  assert.deepEqual(r.removedTokens, []);
  assert.deepEqual(r.docOnly, ["BOB"]);
});

test("partitionRemovals: splits true deletes from moves by Notion presence", () => {
  const removed = ["ALPHA", "BOB", "CARL"];
  const removedTokens = [lc(A), lc(B), lc(C)];
  const notionTokens = new Set([lc(B)]); // B still exists elsewhere in Notion -> a move
  const { trueDeletes, moved } = mod.partitionRemovals(removed, removedTokens, notionTokens);
  assert.deepEqual(trueDeletes, ["ALPHA", "CARL"]);
  assert.deepEqual(moved, ["BOB"]);
});

test("triageMoves: address-unchanged relocation is SAFE (auto-applied)", () => {
  const caller = link(A);
  const { safeMoves, unsafeMoves } = mod.triageMoves({
    beforeDocs: new Map([[lc(A), new Set(["standard.md"])]]),
    afterDocs: new Map([[lc(A), new Set(["bstock.md"])]]),
    notionRecByToken: new Map([[lc(A), rec("ALPHA(bStock)", A, caller)]]),
    docRowByToken: new Map([[lc(A), docRow("ALPHA", A, caller)]]), // same address
    assetLabel: new Map([[lc(A), "ALPHA(bStock)"]]),
  });
  assert.equal(safeMoves.length, 1);
  assert.match(safeMoves[0], /standard\.md -> bstock\.md/);
  assert.deepEqual(unsafeMoves, []);
});

test("triageMoves: relocation that also changes an address is UNSAFE (fail-closed)", () => {
  const { safeMoves, unsafeMoves } = mod.triageMoves({
    beforeDocs: new Map([[lc(A), new Set(["standard.md"])]]),
    afterDocs: new Map([[lc(A), new Set(["bstock.md"])]]),
    notionRecByToken: new Map([[lc(A), rec("ALPHA(bStock)", A, link(C))]]), // caller now C
    docRowByToken: new Map([[lc(A), docRow("ALPHA", A, link(A))]]), // doc still has A
    assetLabel: new Map([[lc(A), "ALPHA(bStock)"]]),
  });
  assert.deepEqual(safeMoves, []);
  assert.equal(unsafeMoves.length, 1);
});

test("triageMoves: a move with a missing side is treated as UNSAFE", () => {
  const { safeMoves, unsafeMoves } = mod.triageMoves({
    beforeDocs: new Map([[lc(A), new Set(["standard.md"])]]),
    afterDocs: new Map([[lc(A), new Set(["bstock.md"])]]),
    notionRecByToken: new Map(), // rec missing -> cannot verify
    docRowByToken: new Map([[lc(A), docRow("ALPHA", A, link(A))]]),
    assetLabel: new Map([[lc(A), "ALPHA"]]),
  });
  assert.deepEqual(safeMoves, []);
  assert.equal(unsafeMoves.length, 1);
});

test("triageMoves: a row that stays on the same page is not a move", () => {
  const { safeMoves, unsafeMoves } = mod.triageMoves({
    beforeDocs: new Map([[lc(A), new Set(["standard.md"])]]),
    afterDocs: new Map([[lc(A), new Set(["standard.md"])]]),
    notionRecByToken: new Map([[lc(A), rec("ALPHA", A)]]),
    docRowByToken: new Map([[lc(A), docRow("ALPHA", A)]]),
    assetLabel: new Map([[lc(A), "ALPHA"]]),
  });
  assert.deepEqual(safeMoves, []);
  assert.deepEqual(unsafeMoves, []);
});

test("triageMoves: a brand-new collateral (no before) is not a move", () => {
  const { safeMoves, unsafeMoves } = mod.triageMoves({
    beforeDocs: new Map(),
    afterDocs: new Map([[lc(A), new Set(["bstock.md"])]]),
    notionRecByToken: new Map([[lc(A), rec("NEW(bStock)", A)]]),
    docRowByToken: new Map(),
    assetLabel: new Map([[lc(A), "NEW(bStock)"]]),
  });
  assert.deepEqual(safeMoves, []);
  assert.deepEqual(unsafeMoves, []);
});

// ---------------------------------------------------------------------------
// Integration test for main()'s multi-section write path. bnb-core and eth both
// write multi-oracle-standard.md; when bnb-core resizes the BNB table, eth's
// table below it shifts. This locks in that both tables survive (regression test
// for the two-pass stale-offset corruption bug).
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "sync-multi-oracle.mjs");
const S = "0x" + "5".repeat(40); // bStock token
const E = "0x" + "e".repeat(40); // eth token
const OLD = "0x" + "1".repeat(40);
const NEW = "0x" + "2".repeat(40);
const MAIN = "0x" + "9".repeat(40);

const ncell = (text) => [{ plain_text: text }];
const nrow = (cells) => ({ type: "table_row", table_row: { cells: cells.map(ncell) } });
const HEADER = nrow(["Asset", "Token", "Oracle/caller", "Main oracle", "Pivot", "Fallback", "BoundValidator"]);
const fixtureFile = (dir, name, rows) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify({ results: [HEADER, ...rows] }));
  return p;
};

const THEAD =
  '<table data-full-width="true"><thead><tr><th>Asset</th><th>Token</th>' +
  "<th>Oracle/caller</th><th>Main oracle</th><th>Pivot oracle</th>" +
  "<th>Fallback oracle</th><th>BoundValidator</th></tr></thead><tbody>";
const drow = (tds) => `<tr>${tds.map((t) => `<td>${t}</td>`).join("")}</tr>`;
const dtable = (rows) => THEAD + rows.map(drow).join("") + "</tbody></table>";

test("main(): resizing the BNB table keeps the Ethereum table intact (shared file)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oracle-int-"));
  fs.mkdirSync(path.join(dir, "for-developer"));

  // standard.md: a 2-row BNB (core) table followed by a 1-row Ethereum table.
  const bnbDoc = dtable([
    ["CoreKeep", A, "-", MAIN, "-", "-", "-"],
    ["CoreGone", B, "-", MAIN, "-", "-", "-"],
  ]);
  const ethDoc = dtable([["EthA", E, "-", OLD, "-", "-", "-"]]);
  fs.writeFileSync(
    path.join(dir, "for-developer/multi-oracle-standard.md"),
    `# Standard\n\n**BNB Chain**\n\n${bnbDoc}\n\n**Ethereum Chain**\n\n${ethDoc}\n`
  );
  // bstock.md: one bStock row that matches the fixture (so it stays unchanged).
  fs.writeFileSync(
    path.join(dir, "for-developer/multi-oracle-bstock.md"),
    `# bStock\n\n**BNB Chain**\n\n${dtable([["StockX (bStock)", S, "-", MAIN, "-", "-", "-"]])}\n`
  );

  // BNB fixture drops CoreGone (a true delete) and keeps CoreKeep + the bStock.
  const bnbFx = fixtureFile(dir, "bnb.json", [
    nrow(["CoreKeep", A, "-", MAIN, "-", "-", "-"]),
    nrow(["StockX (bStock)", S, "-", MAIN, "-", "-", "-"]),
  ]);
  // ETH fixture changes EthA's main oracle address.
  const ethFx = fixtureFile(dir, "eth.json", [nrow(["EthA", E, "-", NEW, "-", "-", "-"])]);

  execFileSync("node", [SCRIPT], {
    cwd: dir,
    env: { ...process.env, NOTION_FIXTURE_ROWS: bnbFx, NOTION_FIXTURE_ROWS_ETH: ethFx },
    encoding: "utf8",
  });

  const outStd = fs.readFileSync(path.join(dir, "for-developer/multi-oracle-standard.md"), "utf8");
  // Exactly two well-formed tables — the corruption produced three with a mangled boundary.
  assert.equal((outStd.match(/<table/g) || []).length, 2, "standard.md must keep exactly two tables");
  assert.equal((outStd.match(/<\/table>/g) || []).length, 2);
  assert.ok(!/<\/table>\s*<table/.test(outStd.replace(/\n\n\*\*Ethereum Chain\*\*\n\n/g, "|SEP|")), "no back-to-back tables");
  assert.ok(outStd.includes(NEW), "Ethereum table updated with the new address");
  assert.ok(outStd.includes(E), "Ethereum token preserved");
  assert.ok(!outStd.includes(B), "deleted core row is gone");
  assert.ok(outStd.includes(A), "kept core row survives");

  const outB = fs.readFileSync(path.join(dir, "for-developer/multi-oracle-bstock.md"), "utf8");
  assert.ok(outB.includes(S), "bStock row preserved on its own page");

  fs.rmSync(dir, { recursive: true, force: true });
});
