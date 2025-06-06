const { Pinecone } = require("@pinecone-database/pinecone");
const QueryAnalyzer = require("./query-analyzer");
require("dotenv").config();

async function main() {
  try {
    console.log("🔧 初始化 Pinecone...");
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const analyzer = new QueryAnalyzer(pinecone, "gitbook-docs");

    const args = process.argv.slice(2);

    if (args.includes("--full")) {
      // 運行完整測試
      await analyzer.runFullTest();
    } else if (args.includes("--index")) {
      // 只分析索引
      await analyzer.analyzeIndexDistribution();
    } else if (args.includes("--compare")) {
      // 比較查詢策略
      const query = args[args.indexOf("--compare") + 1] || "staking";
      await analyzer.compareQueryStrategies(query);
    } else {
      console.log(`
🔍 查詢分析工具

用法:
  node run-analysis.js --full              # 運行完整測試套件
  node run-analysis.js --index             # 分析索引分佈
  node run-analysis.js --compare "query"   # 比較查詢策略

例子:
  node run-analysis.js --full
  node run-analysis.js --compare "lista airdrop"
  node run-analysis.js --compare "質押"
      `);
    }
  } catch (error) {
    console.error("❌ 分析失敗:", error.message);
  }
}

main().catch(console.error);
