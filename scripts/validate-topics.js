#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { TOPIC_CONFIG } = require("../config/retrieval-topics");

const DOC_ROOT = path.join(process.cwd(), "doc");
const EN_DOC_ROOT = path.join(DOC_ROOT, "en");
const MANUAL_DOC_ROOT = path.join(DOC_ROOT, "manual");

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveCandidatePaths(filename) {
  const normalized = filename.replace(/^\/+/, "");
  const candidates = new Set();

  candidates.add(path.join(EN_DOC_ROOT, normalized));
  candidates.add(path.join(MANUAL_DOC_ROOT, normalized));

  if (normalized.startsWith("manual/")) {
    candidates.add(path.join(MANUAL_DOC_ROOT, normalized.slice("manual/".length)));
  }

  if (!normalized.includes("/")) {
    candidates.add(path.join(MANUAL_DOC_ROOT, normalized));
  }

  return [...candidates];
}

function validateTopicConfig() {
  const missing = [];
  let totalRefs = 0;

  for (const [topicKey, topicConfig] of Object.entries(TOPIC_CONFIG)) {
    const filenames = topicConfig?.filenames || [];
    totalRefs += filenames.length;

    for (const filename of filenames) {
      const candidates = resolveCandidatePaths(filename);
      const matchedPath = candidates.find((candidate) => fileExists(candidate));

      if (!matchedPath) {
        missing.push({
          topic: topicKey,
          filename,
          searched: candidates,
        });
      }
    }
  }

  return { totalRefs, missing };
}

function main() {
  const { totalRefs, missing } = validateTopicConfig();

  if (missing.length === 0) {
    console.log(
      `✅ Topic 配置驗證通過：${Object.keys(TOPIC_CONFIG).length} 個 topic，${totalRefs} 個檔案引用均可解析`,
    );
    process.exit(0);
  }

  console.error(
    `❌ Topic 配置驗證失敗：${missing.length} 個檔案引用找不到對應文件`,
  );
  for (const item of missing) {
    console.error(`- [${item.topic}] ${item.filename}`);
    console.error(`  searched: ${item.searched.join(" | ")}`);
  }
  process.exit(1);
}

main();
