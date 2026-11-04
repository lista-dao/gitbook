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

// `--exit-code` exits 2 when the ref is absent. Anything else is a transport or
// auth failure: throw, rather than guessing "absent" and starting from scratch.
function remoteHasBranch(name) {
  try {
    git(["ls-remote", "--exit-code", "origin", `refs/heads/${name}`], {
      stdio: "pipe",
    });
    return true;
  } catch (error) {
    if (error.status === 2) return false;
    throw error;
  }
}

// Idempotent: gh exits non-zero when a PR for this head already exists, which is
// the normal case on every run after the first. Re-running is how a round that
// pushed but failed to open its PR recovers. "No commits between" means the
// branch has nothing to propose -- the refs were read before the translation
// loop, so a PR merged during those minutes lands here. Neither is an error.
function openPrIfMissing(head, base) {
  try {
    execFileSync("gh", [
      "pr", "create", "--head", head, "--base", base,
      "--title", `Sync and translate to ${base}`,
      "--body",
      "Opened by the translate workflow: machine translation of the English " +
        "pages that landed on `en`. Later pushes stack onto this PR until it " +
        "is merged.",
    ], { encoding: "utf8" });
    console.log(`Opened a PR from ${head} into ${base}`);
  } catch (error) {
    const output = `${error.stdout || ""}${error.stderr || ""}`;
    if (!/already exists|No commits between/i.test(output)) throw error;
    console.log(`No PR opened from ${head} into ${base}: ${output.trim()}`);
  }
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
  const sha = process.env.GITHUB_SHA || "HEAD";

  // Manual override for backfilling a range no push event can express --
  // e.g. commits that landed while this script's validation still swallowed
  // errors (see the note at the bottom of this file), so nothing ever
  // reprocessed them on a later push.
  const baseOverride = process.env.BASE_SHA_OVERRIDE;
  if (baseOverride) {
    git(["cat-file", "-e", `${baseOverride}^{commit}`], { stdio: "pipe" });
    return [baseOverride, sha];
  }

  // github.event.before is the pre-push SHA. It is all-zeroes for a new
  // branch and may point at a rewritten commit after a force-push, so fall
  // back to the tip commit only when it is unusable.
  const before = process.env.GITHUB_EVENT_BEFORE;
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

/**
 * Fold commits GitBook pushed straight to the language branch into the bot
 * branch.
 *
 * A conflict must not fail the run: nothing clears a conflicted bot branch by
 * itself, so every later push to `en` would hit the same conflict and all
 * translation would stop until someone intervened. On conflict the live
 * language-branch version wins -- it is published and human-written, while the
 * bot's side is machine translation nobody has approved yet, and the next time
 * `en` touches that page the bot translates it again anyway.
 */
function mergeLanguageBranch(branch, langRef) {
  try {
    git(["merge", "--no-edit", langRef]);
    return;
  } catch {
    const conflicted = git(["diff", "--name-only", "--diff-filter=U"]).trim();
    git(["merge", "--abort"]);
    git(["merge", "--no-edit", "-X", "theirs", langRef]);
    console.log(
      `::warning::${branch} and the pending translation both changed: ` +
        `${conflicted.split("\n").join(", ")}. Kept the ${branch} version; ` +
        `the unmerged translation of those pages was dropped.`
    );
  }
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
    // A run translates the delta of one push, not a recomputed tree, so it
    // builds on the bot branch when one exists -- starting from the language
    // branch would drop every delta that is not merged yet. The language
    // branch is then merged in, because GitBook pushes straight to zh-CN
    // (it bypasses the ruleset) and a bot branch that never picks those up
    // drifts until its PR conflicts and every later run piles onto the
    // conflict. A conflict here fails the run instead.
    const botBranch = `bot/${branch}-sync`;
    const hasBot = remoteHasBranch(botBranch);
    const langRef = `refs/remotes/origin/${branch}`;
    const botRef = `refs/remotes/origin/${botBranch}`;
    const refspecs = [`+refs/heads/${branch}:${langRef}`];
    if (hasBot) refspecs.push(`+refs/heads/${botBranch}:${botRef}`);
    git(["fetch", "origin", ...refspecs]);
    git(["checkout", "--detach", hasBot ? botRef : langRef]);
    if (hasBot) mergeLanguageBranch(branch, langRef);

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
    if (git(["diff", "--staged", "--name-only"]).trim()) {
      git(["commit", "-m", `Sync and translate ${changedFiles.length} files to ${branch}`]);
    } else {
      console.log(`No changes to commit on ${branch}`);
    }

    const treeOf = (ref) => git(["rev-parse", `${ref}^{tree}`]).trim();

    // Compare trees, not commit counts. A squash or rebase merge never puts
    // the bot branch's commits into the language branch's history, so a count
    // stays above zero forever and keeps opening PRs with no file changes.
    // Equal trees mean the branch has nothing left to say: delete it, so the
    // next round starts from a clean merge base whatever the merge method was.
    if (treeOf("HEAD") === treeOf(langRef)) {
      console.log(`${botBranch} matches ${branch}; nothing to propose`);
      if (hasBot) git(["push", "origin", "--delete", botBranch]);
      continue;
    }

    // A translation commit, or just the merge that pulled GitBook's direct
    // edits in. Never forced: this run built on the bot branch, so anything
    // else is someone else writing to it and the run should fail.
    if (!hasBot || git(["rev-parse", "HEAD"]).trim() !== git(["rev-parse", botRef]).trim()) {
      // Fully qualified: from a detached HEAD git cannot infer head vs tag
      // when the destination branch does not exist yet.
      git(["push", "origin", `HEAD:refs/heads/${botBranch}`]);
    }
    openPrIfMissing(botBranch, branch);
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
