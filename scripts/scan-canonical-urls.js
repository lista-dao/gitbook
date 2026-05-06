#!/usr/bin/env node
/**
 * Scan doc/manual/*.md for canonical source URLs and populate
 * config/manual-source-urls.json for entries that are currently empty.
 *
 * Recognized patterns (in priority order):
 *   1. `[Canonical link](https://...)`             — Medium export footer
 *   2. `> **Source:** https://...`                  — same line/blockquote at top
 *   3. `Source: https://...`                        — bare line
 *
 * Safety:
 *   - Never overwrites a non-empty value already in the JSON.
 *   - Only writes when invoked with --apply; otherwise prints a diff.
 *
 * Usage:
 *   node scripts/scan-canonical-urls.js              # dry-run, print plan
 *   node scripts/scan-canonical-urls.js --apply      # write JSON
 */

const fs = require("fs");
const path = require("path");

const MANUAL_DIR = path.join(__dirname, "..", "doc", "manual");
const CONFIG_PATH = path.join(__dirname, "..", "config", "manual-source-urls.json");
const APPLY = process.argv.includes("--apply");

const PATTERNS = [
  { name: "Canonical link", regex: /\[Canonical link\]\((https?:\/\/[^\s)]+)\)/i },
  { name: "Source blockquote", regex: />\s*\*\*Source:\*\*\s*(https?:\/\/\S+)/i },
  { name: "Source bare", regex: /^\s*Source:\s*(https?:\/\/\S+)/im },
];

function extractUrl(content) {
  for (const { name, regex } of PATTERNS) {
    const m = content.match(regex);
    if (m && m[1]) return { url: m[1].trim().replace(/[.,]+$/, ""), via: name };
  }
  return null;
}

function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`找不到 ${CONFIG_PATH}`);
    process.exit(1);
  }
  const map = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

  const proposals = [];
  const skippedAlreadyFilled = [];
  const noMatch = [];
  const notInJson = [];

  for (const [filename, currentUrl] of Object.entries(map)) {
    const filePath = path.join(MANUAL_DIR, filename);
    if (!fs.existsSync(filePath)) {
      noMatch.push({ filename, reason: "本地檔不存在" });
      continue;
    }
    if (currentUrl && currentUrl.trim()) {
      skippedAlreadyFilled.push({ filename, currentUrl });
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    const found = extractUrl(content);
    if (!found) {
      noMatch.push({ filename, reason: "找不到任何識別模式" });
      continue;
    }
    proposals.push({ filename, ...found });
  }

  // 順便看看 manual 目錄裡有哪些檔不在 JSON 裡（可能是新文章）
  const filenamesInJson = new Set(Object.keys(map));
  for (const f of fs.readdirSync(MANUAL_DIR)) {
    if (!f.endsWith(".md")) continue;
    if (filenamesInJson.has(f)) continue;
    notInJson.push(f);
  }

  console.log(`掃描結果（共 ${Object.keys(map).length} 個 JSON 條目，doc/manual/ 中有 ${fs.readdirSync(MANUAL_DIR).filter(f=>f.endsWith(".md")).length} 個 .md）`);
  console.log();

  console.log(`✅ 自動擷取到 URL ${proposals.length} 個：`);
  proposals.forEach((p) => {
    console.log(`  [${p.via}] ${p.filename}`);
    console.log(`     → ${p.url}`);
  });
  console.log();

  if (skippedAlreadyFilled.length > 0) {
    console.log(`≡  已有值跳過 ${skippedAlreadyFilled.length} 個（不會覆寫）：`);
    skippedAlreadyFilled.forEach((s) => console.log(`     ${s.filename}`));
    console.log();
  }

  if (noMatch.length > 0) {
    console.log(`⚠️  抓不到 URL ${noMatch.length} 個（需要手填）：`);
    noMatch.forEach((n) => console.log(`     ${n.filename}  (${n.reason})`));
    console.log();
  }

  if (notInJson.length > 0) {
    console.log(`ℹ️  doc/manual/ 中不在 JSON 的檔案 ${notInJson.length} 個：`);
    notInJson.forEach((f) => console.log(`     ${f}`));
    console.log();
  }

  if (!APPLY) {
    console.log(`DRY-RUN — 沒有寫入 JSON。確認無誤後加 --apply。`);
    return;
  }

  if (proposals.length === 0) {
    console.log(`沒有可寫入的更新。`);
    return;
  }

  for (const p of proposals) {
    map[p.filename] = p.url;
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(map, null, 2) + "\n");
  console.log(`✅ 已寫入 ${proposals.length} 個 URL 到 ${path.relative(process.cwd(), CONFIG_PATH)}`);
}

main();
