const test = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("child_process");
const {
  getChangedFiles,
  parseNameStatus,
  assertSummaryResolves,
} = require("./sync-and-translate");
const { assertNotTruncated } = require("./translate-content");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const git = (args) => execFileSync("git", args, { encoding: "utf8" });

// These fixtures are real commits in this repo's history. If history is ever
// rewritten they become unreachable -- skip rather than fail, so a history
// migration cannot take the whole translation pipeline offline.
const reachable = (sha) => {
  try {
    execFileSync("git", ["rev-parse", "--verify", `${sha}^{commit}`], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};
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

test("parses paths containing spaces and parentheses", (t) => {
  const commits = REGRESSION_COMMITS.filter(reachable);
  if (!commits.length) return t.skip("history fixtures unreachable");
  for (const sha of commits) {
    const tree = treeOf(sha);
    const changes = getChangedFiles([`${sha}~1`, sha], sha);
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

test("every markdown file in a push is seen, not just the tip commit's", (t) => {
  if (!reachable("3c2dd57") || !reachable("4b767d7")) return t.skip("fixtures unreachable");
  // 3c2dd57 added for-developer/multi-oracle-bstock.md but was pushed together
  // with later commits, so the old HEAD~1..HEAD range skipped it entirely.
  const changes = getChangedFiles(["3c2dd57~1", "4b767d7"], "4b767d7");
  const files = changes.map((c) => c.file);
  assert.ok(
    files.includes("for-developer/multi-oracle-bstock.md"),
    "a non-tip commit's new page was not picked up"
  );
});

test("renames report both the old and the new path", (t) => {
  if (!reachable("0197610")) return t.skip("fixture unreachable");
  const changes = getChangedFiles(["0197610~1", "0197610"], "0197610");
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

test("a copy keeps its source path; only a rename removes one", () => {
  const z = (...f) => f.join("\0") + "\0";

  const [copy] = parseNameStatus(z("C75", "docs/a.md", "docs/b.md"));
  assert.strictEqual(copy.status, "C");
  assert.strictEqual(copy.file, "docs/b.md");
  assert.strictEqual(copy.oldFile, undefined, "a copy must not delete its source");

  const [rename] = parseNameStatus(z("R100", "docs/a.md", "docs/b.md"));
  assert.strictEqual(rename.status, "R");
  assert.strictEqual(rename.oldFile, "docs/a.md");
});

test("a two-path record does not desynchronise the entries after it", () => {
  const z = (...f) => f.join("\0") + "\0";
  const changes = parseNameStatus(
    z("R100", "old (1).md", "new (1).md") +
      z("A", ".gitbook/assets/image (2) (2).png") +
      z("C75", "src.md", "copy.md") +
      z("M", "SUMMARY.md") +
      z("D", "gone.md")
  );
  assert.deepStrictEqual(changes, [
    { status: "R", oldFile: "old (1).md", file: "new (1).md" },
    { status: "A", file: ".gitbook/assets/image (2) (2).png" },
    { status: "C", file: "copy.md" },
    { status: "M", file: "SUMMARY.md" },
    { status: "D", file: "gone.md" },
  ]);
});

test("SUMMARY guard rejects a nav entry whose page does not exist", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "summary-"));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    fs.writeFileSync("SUMMARY.md", "* [Here](here.md)\n* [Gone](gone.md)\n");
    fs.writeFileSync("here.md", "# Here\n");
    assert.throws(() => assertSummaryResolves("zh-CN"), /gone\.md/);

    fs.writeFileSync("gone.md", "# Gone\n");
    assert.doesNotThrow(() => assertSummaryResolves("zh-CN"));
  } finally {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("truncation guard ignores headings and table markup inside code fences", () => {
  const source = [
    "# Title", "", "```", "# not a heading", "<tr> sample", "```", "", "text",
  ].join("\n");
  const translated = [
    "# 标题", "", "```", "# not a heading", "<tr> sample", "```", "", "文字",
  ].join("\n");
  assert.doesNotThrow(() => assertNotTruncated(source, translated, "fixture"));
});
