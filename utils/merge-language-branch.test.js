const { test } = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { mergeLanguageBranch } = require("./sync-and-translate");

// Three bugs in a row lived in mergeLanguageBranch and none of them was
// reachable from a pure-function test: `-X theirs` not resolving a delete, an
// escaped non-ASCII path, and `merge --abort` burying the real error. Each
// case below fails without its fix.
function repo(build) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mlb-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: "pipe" });
  git("init", "-q", "-b", "bot", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  const write = (f, s) => {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), s);
  };
  const commit = (m) => {
    git("add", "-A");
    git("commit", "-q", "-m", m);
  };
  build({ git, write, commit, dir });
  return { dir, git };
}

// mergeLanguageBranch shells out with the process cwd, so each case runs there.
function inRepo(dir, fn) {
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(prev);
  }
}

test("a content conflict resolves to the language branch", () => {
  const { dir } = repo(({ git, write, commit }) => {
    write("docs/a.md", "base");
    commit("base");
    git("branch", "lang");
    write("docs/a.md", "bot translation");
    commit("bot");
    git("checkout", "-q", "lang");
    write("docs/a.md", "gitbook edit");
    commit("gitbook");
    git("checkout", "-q", "bot");
  });
  inRepo(dir, () => mergeLanguageBranch("lang", "lang"));
  assert.equal(fs.readFileSync(path.join(dir, "docs/a.md"), "utf8"), "gitbook edit");
});

test("a page deleted on the language branch is removed, not left unmerged", () => {
  const { dir, git } = repo(({ git, write, commit }) => {
    write("docs/a.md", "base");
    commit("base");
    git("branch", "lang");
    write("docs/a.md", "bot translation");
    commit("bot");
    git("checkout", "-q", "lang");
    git("rm", "-q", "docs/a.md");
    commit("gitbook deletes it");
    git("checkout", "-q", "bot");
  });
  inRepo(dir, () => mergeLanguageBranch("lang", "lang"));
  assert.equal(fs.existsSync(path.join(dir, "docs/a.md")), false);
  assert.equal(
    git("diff", "--name-only", "--diff-filter=U").trim(),
    "",
    "nothing may be left unmerged",
  );
});

test("a conflicting non-ASCII path resolves", () => {
  const file = "docs/中文页面.md";
  const { dir, git } = repo(({ git, write, commit }) => {
    write(file, "base");
    commit("base");
    git("branch", "lang");
    write(file, "bot translation");
    commit("bot");
    git("checkout", "-q", "lang");
    write(file, "gitbook edit");
    commit("gitbook");
    git("checkout", "-q", "bot");
  });
  inRepo(dir, () => mergeLanguageBranch("lang", "lang"));
  assert.equal(fs.readFileSync(path.join(dir, file), "utf8"), "gitbook edit");
  assert.equal(git("diff", "--name-only", "--diff-filter=U").trim(), "");
});

test("a merge that never starts rethrows its own error", () => {
  const { dir } = repo(({ write, commit }) => {
    write("docs/a.md", "base");
    commit("base");
  });
  assert.throws(
    () => inRepo(dir, () => mergeLanguageBranch("lang", "refs/heads/nosuchref")),
    (error) => {
      const output = `${error.stdout || ""}${error.stderr || ""}${error.message}`;
      assert.doesNotMatch(output, /MERGE_HEAD/, "the real error must not be buried");
      return true;
    },
  );
});
