const test = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("child_process");
const { getChangedFiles } = require("./sync-and-translate");
const { assertNotTruncated } = require("./translate-content");

const git = (args) => execFileSync("git", args, { encoding: "utf8" });
const treeOf = (sha) =>
  new Set(git(["ls-tree", "-r", "--name-only", sha]).split("\n").filter(Boolean));

// Commits whose asset filenames contain spaces or parentheses. Each of these
// aborted the whole translation run under the old whitespace-splitting parser,
// which is why 13 zh-CN pages ended up blank on the live site.
const REGRESSION_COMMITS = [
  "0197610", // GITBOOK-196 — "image (1) (1).png"; lost the vault-GUI page
  "77dc27b", // GITBOOK-195 — "image (1).png"
  "ad3f043", // GITBOOK-216 — "Lista Dao HAY.png"
  "99302b1", // GITBOOK-114 — "lisUSD.mov"
  "2ad157d", // GITBOOK-191 — "collateral.mov"
  "15114a9", // GITBOOK-221 — "Smart Lending.png"
];

test("parses paths containing spaces and parentheses", () => {
  for (const sha of REGRESSION_COMMITS) {
    const tree = treeOf(sha);
    const changes = getChangedFiles([`${sha}~1`, sha]);
    assert.ok(changes.length > 0, `${sha}: parsed no changes`);

    for (const { status, file, oldFile } of changes) {
      assert.ok(file, `${sha}: empty path parsed`);
      if (status !== "D") {
        assert.ok(
          tree.has(file),
          `${sha}: parsed path is not in the tree: ${JSON.stringify(file)}`
        );
      }
      if (oldFile) assert.ok(!tree.has(oldFile) || status === "C", `${sha}: bad rename source`);
    }
  }
});

test("every markdown file in a push is seen, not just the tip commit's", () => {
  // 3c2dd57 added for-developer/multi-oracle-bstock.md but was pushed together
  // with later commits, so the old HEAD~1..HEAD range skipped it entirely.
  const changes = getChangedFiles(["3c2dd57~1", "4b767d7"]);
  const files = changes.map((c) => c.file);
  assert.ok(
    files.includes("for-developer/multi-oracle-bstock.md"),
    "a non-tip commit's new page was not picked up"
  );
});

test("renames report both the old and the new path", () => {
  const changes = getChangedFiles(["0197610~1", "0197610"]);
  const renamed = changes.find(
    (c) => c.file === "user-guide/lista-lending/how-to-create-a-vault-lista-lending-vault-gui.md"
  );
  assert.ok(renamed, "renamed page missing");
  assert.strictEqual(renamed.status, "R");
  assert.strictEqual(renamed.oldFile, "user-guide/how-to-create-a-vault-lista-lending-vault-gui.md");
});

test("truncation guard rejects a translation that loses table rows", () => {
  const source = "# T\n<table><tr><td>0x" + "a".repeat(40) + "</td></tr><tr><td>b</td></tr></table>";
  const cut = "# T\n<table><tr><td>0x" + "a".repeat(40) + "</td></tr>";
  assert.throws(() => assertNotTruncated(source, cut, "fixture"), /truncated|unclosed/);
  assert.doesNotThrow(() => assertNotTruncated(source, source, "fixture"));
});

test("truncation guard rejects a translation missing headings", () => {
  const source = "# A\n\ntext\n\n## B\n\nmore\n";
  assert.throws(() => assertNotTruncated(source, "# A\n\n文字\n", "fixture"), /truncated/);
});
