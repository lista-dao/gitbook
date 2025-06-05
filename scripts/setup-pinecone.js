#!/usr/bin/env node

const { Pinecone } = require("@pinecone-database/pinecone");
require("dotenv").config();

async function setupPineconeIndex() {
  try {
    console.log("🚀 開始設置 Pinecone 索引...");

    if (!process.env.PINECONE_API_KEY) {
      throw new Error("❌ PINECONE_API_KEY 環境變量未設置");
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX_NAME || "gitbook-rag";

    // 檢查索引是否已存在
    console.log(`🔍 檢查索引 "${indexName}" 是否存在...`);

    try {
      const existingIndexes = await pinecone.listIndexes();
      const indexExists = existingIndexes.indexes.some(
        (index) => index.name === indexName
      );

      if (indexExists) {
        console.log(`✅ 索引 "${indexName}" 已存在，無需創建`);

        // 獲取索引詳情
        const indexStats = await pinecone.index(indexName).describeIndexStats();
        console.log(`📊 索引統計:`, {
          dimension: indexStats.dimension || "unknown",
          totalVectorCount: indexStats.totalVectorCount || 0,
          namespaces: Object.keys(indexStats.namespaces || {}).length,
        });

        return;
      }
    } catch (error) {
      console.log("⚠️ 無法獲取現有索引列表，將嘗試創建新索引");
    }

    // 創建新索引
    console.log(`🆕 創建新索引 "${indexName}"...`);
    console.log("⚙️ 配置:");
    console.log("  - 維度: 1024 (BGE-M3 模型)");
    console.log("  - 相似度度量: cosine");
    console.log("  - 雲端類型: aws");
    console.log("  - 地區: us-east-1");

    await pinecone.createIndex({
      name: indexName,
      dimension: 1024, // BGE-M3 模型的嵌入維度
      metric: "cosine", // 餘弦相似度
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });

    console.log(`✅ 索引 "${indexName}" 創建成功！`);
    console.log("⏳ 正在等待索引初始化（大約需要 1-2 分鐘）...");

    // 等待索引就緒
    let retries = 0;
    const maxRetries = 60; // 最多等待 5 分鐘

    while (retries < maxRetries) {
      try {
        const index = pinecone.index(indexName);
        const stats = await index.describeIndexStats();

        console.log(`🔄 索引狀態檢查 (${retries + 1}/${maxRetries}): Ready`);
        console.log("✅ 索引已就緒，可以開始使用！");

        // 顯示使用說明
        console.log("\n📋 接下來的步驟:");
        console.log("1. 確保你的 .env 文件包含:");
        console.log(`   PINECONE_INDEX_NAME=${indexName}`);
        console.log("2. 運行首次拉取: npm run init");
        console.log("3. 啟動 Telegram Bot: npm start");

        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.log("⚠️ 索引初始化時間過長，但創建可能已成功");
          console.log("💡 請稍後手動檢查索引狀態或重新運行此腳本");
          break;
        }

        console.log(`⏳ 等待索引就緒... (${retries}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 等待 5 秒
      }
    }
  } catch (error) {
    console.error("💥 設置失敗:", error.message);

    if (error.message.includes("quota")) {
      console.log("\n💡 可能的解決方案:");
      console.log("- 檢查 Pinecone 帳戶配額");
      console.log("- 嘗試使用不同的地區");
      console.log("- 確認 API Key 權限");
    }

    process.exit(1);
  }
}

// 主函數
if (require.main === module) {
  setupPineconeIndex().catch(console.error);
}

module.exports = setupPineconeIndex;
