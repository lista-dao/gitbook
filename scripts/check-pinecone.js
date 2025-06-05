const { Pinecone } = require("@pinecone-database/pinecone");
require("dotenv").config();

async function checkPineconeStats() {
  try {
    console.log("檢查 Pinecone 索引狀態...");

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    const stats = await index.describeIndexStats();

    console.log("\n=== Pinecone 索引統計 ===");
    console.log("總記錄數:", stats.totalRecordCount);
    console.log("維度:", stats.dimension);
    console.log("索引滿度:", stats.indexFullness);

    if (stats.namespaces) {
      console.log("\nNamespaces:");
      Object.entries(stats.namespaces).forEach(([ns, data]) => {
        console.log(`  ${ns || "default"}: ${data.recordCount} records`);
      });
    }

    // 嘗試查詢一些示例向量
    console.log("\n=== 示例查詢 ===");
    const queryResponse = await index.query({
      vector: new Array(1024).fill(0.1),
      topK: 5,
      includeMetadata: true,
    });

    console.log(`查詢結果: ${queryResponse.matches.length} 個匹配`);
    queryResponse.matches.forEach((match, i) => {
      console.log(
        `${i + 1}. ID: ${match.id}, Score: ${match.score.toFixed(4)}, Lang: ${
          match.metadata?.lang
        }, File: ${match.metadata?.filename}`
      );
    });
  } catch (error) {
    console.error("檢查失敗:", error);
  }
}

checkPineconeStats();
