#!/usr/bin/env node
/**
 * Backfill Pinecone metadata for manual articles with their canonical source URLs.
 *
 * Reads config/manual-source-urls.json (filename → URL map). For every entry with
 * a non-empty URL, looks up matching vectors in Pinecone (by metadata.filename) and
 * patches their metadata so the bot's source-link logic returns the real Medium /
 * external URL instead of the docs.bsc.lista.org fallback.
 *
 * Usage:
 *   node scripts/backfill-manual-source-urls.js              # dry-run
 *   node scripts/backfill-manual-source-urls.js --apply      # actually update
 *   node scripts/backfill-manual-source-urls.js --apply --only "Foo.md"   # single file
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pinecone } = require("@pinecone-database/pinecone");

const CONFIG_PATH = path.join(__dirname, "..", "config", "manual-source-urls.json");
const APPLY = process.argv.includes("--apply");
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

function inferContentType(url) {
  if (!url) return null;
  if (url.includes("medium.com")) return "medium_article";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter_post";
  if (url.includes("linkedin.com")) return "linkedin_post";
  if (url.includes("substack.com")) return "substack_article";
  if (url.includes("mirror.xyz")) return "mirror_post";
  return "web_article";
}

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

(async () => {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`找不到 ${CONFIG_PATH}`);
    process.exit(1);
  }
  const map = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const entries = Object.entries(map).filter(([, url]) => url && url.trim());

  if (entries.length === 0) {
    console.log("ℹ️  config/manual-source-urls.json 沒有可 backfill 的 URL（全部為空）");
    return;
  }

  // 驗證 URL 格式
  const invalid = entries.filter(([, url]) => !isValidUrl(url));
  if (invalid.length > 0) {
    console.error("❌ 以下 entries 的 URL 格式不合法（必須是 http(s)://...）：");
    invalid.forEach(([fn, url]) => console.error(`  - ${fn}  →  ${url}`));
    process.exit(1);
  }

  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const idx = pc.index(process.env.PINECONE_INDEX_NAME || "gitbook-rag");

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} mode | ${entries.length} 個 filename 待處理\n`);

  let totalChunks = 0;
  let touchedFiles = 0;
  const skipped = [];

  for (const [filename, sourceUrl] of entries) {
    if (ONLY && filename !== ONLY) continue;

    const r = await idx.query({
      vector: new Array(1024).fill(0),
      filter: { filename },
      topK: 500,
      includeMetadata: true,
    });
    const matches = r.matches || [];

    if (matches.length === 0) {
      skipped.push({ filename, reason: "Pinecone 無對應向量" });
      continue;
    }

    // 安全檢查：必須全部是 source_type=manual
    const nonManual = matches.filter((m) => m.metadata?.source_type !== "manual");
    if (nonManual.length > 0) {
      skipped.push({
        filename,
        reason: `${nonManual.length} 個向量 source_type 不是 manual，跳過避免誤改`,
      });
      continue;
    }

    const contentType = inferContentType(sourceUrl);
    const existingUrl = matches.find((m) => m.metadata?.source_url)?.metadata.source_url;
    const willChange = existingUrl !== sourceUrl;

    console.log(
      `${willChange ? "🔧" : "≡ "} ${filename}` +
        `  (${matches.length} chunks, content_type=${contentType}` +
        `${existingUrl ? `, 既有 source_url=${existingUrl}` : ""})`,
    );
    console.log(`     → ${sourceUrl}`);

    if (!willChange) {
      console.log(`     既有 URL 已正確，跳過`);
      continue;
    }

    if (APPLY) {
      for (const m of matches) {
        await idx.update({
          id: m.id,
          metadata: {
            source_url: sourceUrl,
            content_type: contentType,
            is_external_content: true,
          },
        });
      }
      console.log(`     ✅ 已更新 ${matches.length} 個 chunk 的 metadata`);
    }

    totalChunks += matches.length;
    touchedFiles++;
  }

  console.log(`\n=== 結果 ===`);
  console.log(`處理檔案: ${touchedFiles}，影響 chunks: ${totalChunks}`);
  if (skipped.length > 0) {
    console.log(`\n跳過 ${skipped.length} 個：`);
    skipped.forEach((s) => console.log(`  - ${s.filename}: ${s.reason}`));
  }
  if (!APPLY) {
    console.log(`\nDRY-RUN — 沒有實際更新。確認無誤後加 --apply 重跑。`);
  }
})().catch((e) => {
  console.error("執行失敗:", e);
  process.exit(1);
});
