const { Pinecone } = require("@pinecone-database/pinecone");
const QueryHelper = require("./query-helper");

// 確保環境變量設置
require("dotenv").config();

async function main() {
  try {
    // 初始化 Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // 創建查詢幫助器
    const queryHelper = new QueryHelper(pinecone, "gitbook-rag");

    // 從命令行獲取參數
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log(`
🔍 Pinecone 查詢工具使用說明

用法:
  node test-query.js "關鍵字"              # 查詢特定關鍵字
  node test-query.js --test               # 運行快速測試
  node test-query.js --batch "詞1,詞2"    # 批量查詢

例子:
  node test-query.js "lista airdrop"
  node test-query.js "質押"
  node test-query.js --test
  node test-query.js --batch "staking,lending,空投"
      `);
      return;
    }

    // 處理不同的命令
    if (args[0] === "--test") {
      console.log("🚀 運行快速測試...");
      await queryHelper.quickTest();
    } else if (args[0] === "--batch") {
      if (!args[1]) {
        console.error("❌ 請提供要批量查詢的關鍵字 (用逗號分隔)");
        return;
      }

      const keywords = args[1].split(",").map((k) => k.trim());
      console.log(`🔍 批量查詢: ${keywords.join(", ")}`);

      const results = await queryHelper.batchSearch(keywords, {
        topK: 5,
        showDebug: true,
      });

      console.log("\n📊 批量查詢完成!");
    } else {
      // 單個關鍵字查詢
      const keyword = args.join(" ");
      console.log(`🔍 查詢關鍵字: "${keyword}"`);

      const result = await queryHelper.searchByKeyword(keyword, {
        topK: 10,
        showDebug: true,
        language: "auto",
      });

      // 額外顯示一些有用信息
      if (result.results.length > 0) {
        console.log("\n💡 查詢建議:");

        // 找出最常見的概念
        const allConcepts = result.results.flatMap((r) => r.concepts);
        const conceptCount = {};
        allConcepts.forEach((c) => {
          conceptCount[c] = (conceptCount[c] || 0) + 1;
        });

        const topConcepts = Object.entries(conceptCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([concept]) => concept);

        if (topConcepts.length > 0) {
          console.log(`   相關概念: ${topConcepts.join(", ")}`);
        }

        // 找出最常見的語言
        const languages = [...new Set(result.results.map((r) => r.language))];
        console.log(`   涵蓋語言: ${languages.join(", ")}`);

        // 內容類型分佈
        const contentTypes = [
          ...new Set(result.results.map((r) => r.content_type)),
        ];
        console.log(`   內容類型: ${contentTypes.join(", ")}`);
      } else {
        console.log("\n💡 查詢建議:");
        console.log("   - 嘗試使用更通用的關鍵字");
        console.log("   - 檢查拼寫是否正確");
        console.log("   - 使用中文或英文關鍵字");
        console.log("   - 嘗試相關的同義詞");
      }
    }
  } catch (error) {
    console.error("❌ 查詢過程中發生錯誤:", error.message);

    if (error.message.includes("API key")) {
      console.error("💡 請檢查 PINECONE_API_KEY 環境變量是否設置正確");
    }
    if (error.message.includes("OPENAI_API_KEY")) {
      console.error("💡 如果要使用 OpenAI embedding，請設置 OPENAI_API_KEY");
    }
  }
}

// 優雅退出處理
process.on("SIGINT", () => {
  console.log("\n👋 查詢已取消");
  process.exit(0);
});

// 運行主函數
main().catch(console.error);
