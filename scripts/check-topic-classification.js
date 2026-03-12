#!/usr/bin/env node

const { execSync } = require("child_process");
const { TOPIC_CONFIG } = require("../config/retrieval-topics");

const CLASSIFIABLE_PREFIXES = [
  "for-developer/",
  "introduction/",
  "user-guide/",
  "governance/",
  "security/",
];

const IGNORED_FILENAMES = new Set(["README.md", "SUMMARY.md"]);
const STRICT_MODE = process.env.TOPIC_CLASSIFICATION_STRICT === "true";

function getTopicFilenameSet() {
  const set = new Set();
  for (const config of Object.values(TOPIC_CONFIG)) {
    for (const filename of config.filenames || []) {
      set.add(filename);
    }
  }
  return set;
}

function getChangedMarkdownFiles() {
  const diffFilter = process.env.TOPIC_CLASSIFICATION_DIFF_FILTER || "A";
  const baseRef = process.env.TOPIC_CLASSIFICATION_BASE_REF || "";
  const cmd = baseRef
    ? `git diff --name-only --diff-filter=${diffFilter} ${baseRef}`
    : `git diff --name-only --diff-filter=${diffFilter}`;

  const output = execSync(cmd, { encoding: "utf8" }).trim();
  if (!output) return [];

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".md"));
}

function normalizeDocPath(filePath) {
  const path = filePath.replace(/^\.?\/*/, "");

  if (path.startsWith("doc/en/")) {
    return { rel: path.slice("doc/en/".length), source: "doc-en" };
  }

  if (path.startsWith("doc/manual/")) {
    return { rel: path.slice("doc/manual/".length), source: "doc-manual" };
  }

  if (path.startsWith("manual/")) {
    return { rel: path.slice("manual/".length), source: "manual" };
  }

  return { rel: path, source: "repo-root" };
}

function shouldCheckClassification(relPath, source) {
  const fileName = relPath.split("/").pop();
  if (!fileName || IGNORED_FILENAMES.has(fileName)) return false;

  if (source === "doc-manual" || source === "manual") return true;
  if (CLASSIFIABLE_PREFIXES.some((prefix) => relPath.startsWith(prefix))) return true;

  // Top-level markdown docs on en branch should also be explicitly classified.
  return !relPath.includes("/");
}

function buildCandidates(relPath, source) {
  const fileName = relPath.split("/").pop();

  if (source === "doc-manual" || source === "manual") {
    return [relPath, `manual/${relPath}`, fileName].filter(Boolean);
  }

  return [relPath];
}

function main() {
  const topicFilenameSet = getTopicFilenameSet();
  const changedMdFiles = getChangedMarkdownFiles();

  if (changedMdFiles.length === 0) {
    console.log("ℹ️ 沒有新增 markdown 文件，跳過 topic 分類檢查");
    return;
  }

  const targets = changedMdFiles
    .map((filePath) => {
      const { rel, source } = normalizeDocPath(filePath);
      return {
        filePath,
        rel,
        source,
        candidates: buildCandidates(rel, source),
      };
    })
    .filter((item) => shouldCheckClassification(item.rel, item.source));

  if (targets.length === 0) {
    console.log("ℹ️ 沒有需要進行 topic 分類檢查的新增文件");
    return;
  }

  const missing = targets.filter(
    (item) => !item.candidates.some((candidate) => topicFilenameSet.has(candidate)),
  );

  if (missing.length === 0) {
    console.log(`✅ Topic 分類檢查通過：${targets.length} 個新增文件均已被分類`);
    return;
  }

  const header = STRICT_MODE
    ? `❌ Topic 分類檢查失敗：${missing.length}/${targets.length} 個新增文件未被 TOPIC_CONFIG 收錄`
    : `⚠️ Topic 分類待處理：${missing.length}/${targets.length} 個新增文件未被 TOPIC_CONFIG 收錄`;
  console.error(header);
  for (const item of missing) {
    console.error(`- ${item.filePath}`);
    console.error(`  expected one of: ${item.candidates.join(" | ")}`);
  }
  console.error("請由 agent/維護者更新 config/topic-config-*.js 完成分類。");

  if (STRICT_MODE) {
    process.exit(1);
  }
}

main();
