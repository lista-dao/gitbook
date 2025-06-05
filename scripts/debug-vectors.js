const { Pinecone } = require("@pinecone-database/pinecone");
require("dotenv").config();

async function debugVectors() {
  try {
    console.log("🔍 開始調試向量數據...");

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

    // 1. 獲取基本統計
    const stats = await index.describeIndexStats();
    console.log(`\n📊 基本統計:`);
    console.log(`總記錄數: ${stats.totalRecordCount}`);

    // 2. 查詢所有向量（分批獲取）
    console.log(`\n🔎 分析向量分布...`);

    const allVectors = [];
    let hasMore = true;
    let nextToken = undefined;

    while (hasMore && allVectors.length < 1000) {
      // 限制最多1000個，避免過度查詢
      try {
        const listResponse = await index.listVectors({
          limit: 100,
          paginationToken: nextToken,
        });

        if (listResponse.vectors) {
          allVectors.push(...listResponse.vectors);
        }

        nextToken = listResponse.pagination?.next;
        hasMore = !!nextToken;

        console.log(`已獲取 ${allVectors.length} 個向量 ID...`);
      } catch (error) {
        console.log("無法列出向量，改用查詢方式分析...");
        break;
      }
    }

    // 3. 分析語言分布
    console.log(`\n🌍 分析語言分布...`);

    // 查詢中文向量
    const zhQuery = await index.query({
      vector: new Array(1024).fill(0.1),
      topK: 100,
      includeMetadata: true,
      filter: { lang: "zh-CN" },
    });

    // 查詢英文向量
    const enQuery = await index.query({
      vector: new Array(1024).fill(0.1),
      topK: 100,
      includeMetadata: true,
      filter: { lang: "en" },
    });

    console.log(`中文向量樣本: ${zhQuery.matches.length}`);
    console.log(`英文向量樣本: ${enQuery.matches.length}`);

    // 4. 分析文件分布
    const fileStats = {};
    const idPatterns = {};

    [...zhQuery.matches, ...enQuery.matches].forEach((match) => {
      const filename = match.metadata?.filename || "unknown";
      const lang = match.metadata?.lang || "unknown";
      const id = match.id;

      // 統計文件
      const fileKey = `${filename} (${lang})`;
      fileStats[fileKey] = (fileStats[fileKey] || 0) + 1;

      // 分析 ID 模式
      const idPrefix = id.split("_").slice(0, -1).join("_");
      idPatterns[idPrefix] = (idPatterns[idPrefix] || 0) + 1;
    });

    console.log(`\n📁 文件分布（前20個）:`);
    Object.entries(fileStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .forEach(([file, count]) => {
        console.log(`  ${file}: ${count} 個向量`);
      });

    console.log(`\n🆔 ID 前綴分布（前20個）:`);
    Object.entries(idPatterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .forEach(([prefix, count]) => {
        console.log(`  ${prefix}: ${count} 個向量`);
      });

    // 5. 檢查 ID 重複模式
    if (allVectors.length > 0) {
      console.log(`\n🔄 檢查 ID 重複...`);
      const idCounts = {};
      allVectors.forEach((v) => {
        idCounts[v.id] = (idCounts[v.id] || 0) + 1;
      });

      const duplicates = Object.entries(idCounts).filter(
        ([id, count]) => count > 1
      );
      if (duplicates.length > 0) {
        console.log(`發現 ${duplicates.length} 個重複 ID:`);
        duplicates.slice(0, 10).forEach(([id, count]) => {
          console.log(`  ${id}: ${count} 次`);
        });
      } else {
        console.log(`✅ 沒有發現重複 ID`);
      }
    }

    // 6. 估算實際檔案處理情況
    console.log(`\n📋 處理情況分析:`);
    console.log(`預期檔案: 199 個 (97 英文 + 102 中文)`);
    console.log(`預期向量: 555 個 (327 英文 + 228 中文)`);
    console.log(`實際向量: ${stats.totalRecordCount} 個`);
    console.log(`缺少向量: ${555 - stats.totalRecordCount} 個`);

    const avgVectorsPerFile = stats.totalRecordCount / 199;
    console.log(`平均每個檔案: ${avgVectorsPerFile.toFixed(2)} 個向量`);
  } catch (error) {
    console.error("調試失敗:", error);
  }
}

debugVectors();
