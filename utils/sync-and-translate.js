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
function getChangedFiles(range) {
  const out = git(["diff", "--name-status", "-z", ...range]);
  const fields = out.split("\0").filter(Boolean);
  const changes = [];

  for (let i = 0; i < fields.length; ) {
    const status = fields[i++];
    if (status.startsWith("R") || status.startsWith("C")) {
      // Renames and copies emit two paths.
      const oldFile = fields[i++];
      const file = fields[i++];
      changes.push({ status: status[0], oldFile, file });
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
      console.warn(`before-SHA ${before} not reachable; falling back to HEAD~1`);
    }
  }
  return [`${sha}~1`, sha];
}

async function syncAndTranslate() {
  const range = resolveRange();
  console.log(`Diff range: ${range.join("..")}`);

  const changedFiles = getChangedFiles(range);
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

      git(["checkout", "origin/en", "--", file]);

      if (file.endsWith(".md")) {
        const content = fs.readFileSync(targetFile, "utf-8");
        const translated = await translateContent(content, branch, file);
        fs.writeFileSync(targetFile, translated, "utf-8");
      }
    }

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

module.exports = { getChangedFiles, resolveRange, syncAndTranslate };

if (require.main === module) {
  // Fail loudly. This used to swallow every error and still exit 0, so 23 of
  // the last 299 pushes reported success while translating nothing.
  syncAndTranslate().catch((error) => {
    console.error("Error in syncAndTranslate:", error);
    process.exit(1);
  });
}
