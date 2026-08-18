const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { translateContent } = require("./translate-content");

const languageBranches = ["zh-CN"];

// Run a git command with arguments passed as an array. Never build a shell
// string: paths in this repo contain spaces and parentheses (GitBook names
// its assets "image (1) (1).png"), which the shell would split or expand.
function git(args, opts = {}) {
  return execFileSync("git", args, { encoding: "utf8", ...opts });
}

/**
 * Files changed by the push that triggered this run.
 *
 * `--name-status -z` emits NUL-separated fields, so filenames keep their
 * spaces. Splitting on whitespace (the previous behaviour) shattered
 * "image (1).png" into "image", "(1)", ".png" and made the very first
 * `git checkout` of the run fail, aborting translation for the whole push.
 *
 * The range covers every commit in the push, not just the tip: GITHUB_EVENT
 * gives us the SHA the branch pointed at before the push. A push of N commits
 * used to translate only the last one.
 */
function getChangedFiles(range, sha) {
  if (range === null) {
    return git(["ls-tree", "-r", "--name-only", "-z", sha])
      .split("\0")
      .filter(Boolean)
      .map((file) => ({ status: "A", file }));
  }
  return parseNameStatus(git(["diff", "--name-status", "-z", ...range]));
}

/**
 * Shape `git diff --name-status -z` output into change records.
 *
 * Fields are NUL-separated, so paths keep their spaces and parentheses.
 * Splitting on whitespace (the previous behaviour) shattered
 * "image (1).png" into "image", "(1)", ".png" and made the first
 * `git checkout` of the run fail, aborting translation for the whole push.
 *
 * Only R and C records carry two paths; consuming the wrong number of fields
 * would misalign the cursor and corrupt every later entry. Status codes keep
 * their similarity score (R100, C75), so match on the leading letter.
 */
function parseNameStatus(out) {
  const fields = out.split("\0").filter(Boolean);
  const changes = [];

  for (let i = 0; i < fields.length; ) {
    const status = fields[i++];
    if (status.startsWith("R") || status.startsWith("C")) {
      const source = fields[i++];
      const file = fields[i++];
      // A rename removes its source; a copy leaves it live. Deleting the
      // source of a copy would drop a real page from the language branch.
      changes.push(
        status.startsWith("R")
          ? { status: "R", oldFile: source, file }
          : { status: "C", file }
      );
    } else {
      changes.push({ status: status[0], file: fields[i++] });
    }
  }
  return changes;
}

function deleteFile(file) {
  if (fs.existsSync(file)) {
    console.log(`Deleting file: ${file}`);
    fs.unlinkSync(file);
  }
}

function resolveRange() {
  // github.event.before is the pre-push SHA. It is all-zeroes for a new
  // branch and may point at a rewritten commit after a force-push, so fall
  // back to the tip commit only when it is unusable.
  const before = process.env.GITHUB_EVENT_BEFORE;
  const sha = process.env.GITHUB_SHA || "HEAD";
  if (before && !/^0+$/.test(before)) {
    try {
      git(["cat-file", "-e", `${before}^{commit}`], { stdio: "pipe" });
      return [before, sha];
    } catch {
      // Force-pushes can leave `before` unreachable. Degrading to the tip
      // commit reintroduces the "only the last commit is translated" bug, so
      // make it loud rather than silent.
      warn(
        `pre-push SHA ${before} is unreachable (force-push?); falling back to ` +
          `the tip commit only. Commits earlier in this push will NOT be translated.`
      );
    }
  }
  try {
    git(["rev-parse", "--verify", `${sha}^1`], { stdio: "pipe" });
  } catch {
    // Root commit: no parent to diff against. Treat the whole tree as added.
    warn(`${sha} has no parent; treating every tracked file as changed.`);
    return null;
  }
  return [`${sha}~1`, sha];
}

// Surfaces in the Actions log as an annotation, not just a buried log line.
function warn(message) {
  console.log(`::warning::${message}`);
}

async function syncAndTranslate() {
  const sourceSha = process.env.GITHUB_SHA || "origin/en";
  const range = resolveRange();
  console.log(
    range ? `Diff range: ${range.join("..")}` : `Full tree at ${sourceSha}`
  );

  const changedFiles = getChangedFiles(range, sourceSha);
  console.log(`Changed files: ${JSON.stringify(changedFiles, null, 2)}`);

  for (const branch of languageBranches) {
    git(["checkout", branch]);
    // The GitBook space pushes to the language branches too, so the local
    // ref can be behind. Rebase before writing, or the push at the end is
    // rejected and the whole translation is silently thrown away.
    git(["pull", "--rebase", "origin", branch]);

    for (const { status, file, oldFile } of changedFiles) {
      const targetFile = path.join(process.cwd(), file);
      console.log(`Processing file: ${file} with status: ${status}`);

      if (status === "D") {
        deleteFile(targetFile);
        continue;
      }
      if (oldFile) deleteFile(path.join(process.cwd(), oldFile));

      // Source from the triggering commit, not origin/en: with the new
      // concurrency group this job may run after a later push has already
      // moved origin/en, which would publish that push's content under this
      // run and leave the later run with nothing to do.
      git(["checkout", sourceSha, "--", file]);

      if (file.endsWith(".md")) {
        const content = fs.readFileSync(targetFile, "utf-8");
        const translated = await translateContent(content, branch, file);
        fs.writeFileSync(targetFile, translated, "utf-8");
      }
    }

    assertSummaryResolves(branch);

    git(["add", "-A"]);
    const staged = git(["diff", "--staged", "--name-only"]).trim();
    if (!staged) {
      console.log(`No changes to commit on ${branch}`);
      continue;
    }

    git(["commit", "-m", `Sync and translate ${changedFiles.length} files to ${branch}`]);
    git(["push", "origin", branch]);
    console.log(`Pushed changes to branch: ${branch}`);
  }
}

/**
 * Every SUMMARY.md entry must point at a file that exists on the branch.
 *
 * GitBook does not error on a dangling entry: it publishes a page containing
 * only the nav title, which reads as "this page was never translated". That is
 * exactly how 13 pages sat blank on the live site unnoticed. This is a
 * cause-agnostic backstop -- it catches a missed translation, a GitBook-side
 * pinyin rename that moved the target out from under us, or anything else that
 * leaves the nav pointing at nothing.
 */
function assertSummaryResolves(branch) {
  const summary = path.join(process.cwd(), "SUMMARY.md");
  if (!fs.existsSync(summary)) return;

  const links = [
    ...fs.readFileSync(summary, "utf-8").matchAll(/\]\(([^)]+\.md)\)/g),
  ]
    .map((m) => m[1])
    .filter((href) => !/^[a-z]+:/i.test(href));

  const missing = [...new Set(links)].filter(
    (href) => !fs.existsSync(path.join(process.cwd(), decodeURIComponent(href)))
  );

  if (missing.length) {
    throw new Error(
      `${branch}: SUMMARY.md links ${missing.length} file(s) that do not exist, ` +
        `which GitBook would publish as blank pages:\n  ${missing.join("\n  ")}`
    );
  }
}

module.exports = {
  getChangedFiles,
  parseNameStatus,
  resolveRange,
  assertSummaryResolves,
  syncAndTranslate,
};

if (require.main === module) {
  // Fail loudly. This used to swallow every error and still exit 0, so 23 of
  // the last 299 pushes reported success while translating nothing.
  syncAndTranslate().catch((error) => {
    console.error("Error in syncAndTranslate:", error);
    process.exit(1);
  });
}
