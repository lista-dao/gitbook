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
