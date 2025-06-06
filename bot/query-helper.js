const winston = require("winston");
const SmartProcessor = require("./smart-processor");

// 查詢幫助器的日志
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
});

class QueryHelper {
  constructor(pinecone, indexName = "gitbook-docs") {
    this.pinecone = pinecone;
    this.indexName = indexName;
    this.smartProcessor = new SmartProcessor({});
    this.smartProcessor.setPinecone(pinecone);
  }

  // 通用查詢函數 - 根據關鍵字查詢所有相關內容
  async searchByKeyword(keyword, options = {}) {
    const {
      topK = 10,
      includeMetadata = true,
      includeValues = false,
      showDebug = true,
      language = "auto", // 'auto', 'en', 'zh-CN'
    } = options;

    try {
      logger.info(`🔍 搜索關鍵字: "${keyword}"`);

      // 1. 生成查詢的 embedding
      const queryVector = await this.smartProcessor.generateEmbedding(
        keyword,
        "query"
      );

      // 2. 建立智能過濾器
      const filters = this.buildKeywordFilters(keyword, language);

      // 3. 執行查詢
      const index = this.pinecone.Index(this.indexName);
      const queryResponse = await index.query({
        vector: queryVector,
        topK: topK,
        includeMetadata: includeMetadata,
        includeValues: includeValues,
        filter: filters,
      });

      // 4. 處理和展示結果
      const results = this.processResults(queryResponse.matches, keyword);

      if (showDebug) {
        this.showDebugInfo(keyword, filters, results);
      }

      return {
        keyword,
        totalResults: results.length,
        filters: filters,
        results: results,
      };
    } catch (error) {
      logger.error(`查詢失敗:`, error);
      throw error;
    }
  }

  // 批量測試多個關鍵字
  async batchSearch(keywords, options = {}) {
    const results = {};
    for (const keyword of keywords) {
      try {
        logger.info(`\n📚 測試關鍵字: ${keyword}`);
        results[keyword] = await this.searchByKeyword(keyword, {
          ...options,
          showDebug: false,
        });
      } catch (error) {
        logger.error(`關鍵字 "${keyword}" 查詢失敗:`, error.message);
        results[keyword] = { error: error.message };
      }
    }
    return results;
  }

  // 建立關鍵字過濾器
  buildKeywordFilters(keyword, language) {
    const keywordLower = keyword.toLowerCase();
    const filters = {};

    // 語言檢測和過濾
    if (language === "auto") {
      const hasChinese = /[\u4e00-\u9fff]/.test(keyword);
      if (hasChinese) {
        filters.language = { $eq: "zh-CN" };
      } else {
        filters.language = { $eq: "en" };
      }
    } else if (language !== "all") {
      filters.language = { $eq: language };
    }

    // 概念匹配 (不要過度限制)
    const conceptMappings = {
      // DeFi 相關
      airdrop: ["airdrop", "空投", "drop", "claim", "megadrop"],
      staking: ["staking", "stake", "質押", "质押", "validator"],
      lending: ["lending", "borrow", "lend", "vault", "借貸", "借贷"],
      governance: ["governance", "voting", "proposal", "治理", "投票"],

      // Lista 生態
      lista: ["lista", "lisusd", "slisbnb", "clisbnb"],
      binance: ["binance", "bnb", "bsc", "launchpool"],

      // 技術相關
      contract: ["contract", "address", "合約", "合约", "智能"],
      api: ["api", "integration", "接口", "集成"],
      guide: ["guide", "tutorial", "how", "如何", "教程", "指南"],
    };

    // 找到匹配的概念，但不強制過濾 (寬鬆匹配)
    const matchedConcepts = [];
    for (const [concept, terms] of Object.entries(conceptMappings)) {
      if (terms.some((term) => keywordLower.includes(term))) {
        matchedConcepts.push(concept);
      }
    }

    // 只在有明確概念匹配時才添加過濾器
    if (matchedConcepts.length > 0) {
      filters.$or = [
        { concepts: { $in: matchedConcepts } },
        { topics: { $in: matchedConcepts } },
        { searchable_terms: { $in: matchedConcepts } },
        // 也包含沒有這些 metadata 的舊文檔
        { concepts: { $exists: false } },
      ];
    }

    return filters;
  }

  // 處理查詢結果
  processResults(matches, keyword) {
    return matches.map((match, index) => {
      const metadata = match.metadata || {};
      console.log("🚀 ~ QueryHelper ~ returnmatches.map ~ metadata:", metadata);

      const score = Math.round(match.score * 100) / 100;

      return {
        rank: index + 1,
        score: score,
        confidence: this.getConfidenceLevel(score),
        id: match.id,
        filename: metadata.filename || "unknown",
        language: metadata.language || "unknown",
        title: metadata.main_topic || metadata.filename || "untitled",
        summary: metadata.summary || "無摘要",
        concepts: metadata.concepts || [],
        topics: metadata.topics || [],
        content_type: metadata.content_type || "unknown",
        word_count: metadata.word_count || 0,
        has_code: metadata.has_code || false,
        tokens: metadata.tokens || [],
        relevance_reason: this.explainRelevance(metadata, keyword),
      };
    });
  }

  // 獲取信心等級
  getConfidenceLevel(score) {
    if (score >= 0.8) return "高度相關 🎯";
    if (score >= 0.7) return "相關 ✅";
    if (score >= 0.6) return "可能相關 ⚠️";
    return "低相關性 ❌";
  }

  // 解釋相關性原因
  explainRelevance(metadata, keyword) {
    const reasons = [];
    const keywordLower = keyword.toLowerCase();

    if (metadata.filename?.toLowerCase().includes(keywordLower)) {
      reasons.push("文件名匹配");
    }
    if (metadata.main_topic?.toLowerCase().includes(keywordLower)) {
      reasons.push("主題匹配");
    }
    if (metadata.concepts?.some((c) => keywordLower.includes(c))) {
      reasons.push("概念匹配");
    }
    if (metadata.topics?.some((t) => keywordLower.includes(t))) {
      reasons.push("話題匹配");
    }
    if (metadata.tokens?.some((t) => keywordLower.includes(t.toLowerCase()))) {
      reasons.push("代幣相關");
    }

    return reasons.length > 0 ? reasons.join(", ") : "向量相似性";
  }

  // 顯示調試信息
  showDebugInfo(keyword, filters, results) {
    console.log("\n" + "=".repeat(60));
    console.log(`🔍 關鍵字查詢: "${keyword}"`);
    console.log("=".repeat(60));

    console.log("\n📊 過濾器:");
    console.log(JSON.stringify(filters, null, 2));

    console.log(`\n📈 結果概覽: 共找到 ${results.length} 個結果`);

    if (results.length > 0) {
      console.log("\n🏆 前 5 個結果:");
      results.slice(0, 5).forEach((result) => {
        console.log(`
${result.rank}. ${result.filename} (${result.confidence})
   標題: ${result.title}
   評分: ${result.score}
   語言: ${result.language}
   概念: [${result.concepts.join(", ")}]
   原因: ${result.relevance_reason}
   摘要: ${result.summary?.substring(0, 100)}...
        `);
      });
    }

    console.log("\n" + "=".repeat(60) + "\n");
  }

  // 快速測試常見關鍵字
  async quickTest() {
    const testKeywords = [
      "lista",
      "airdrop",
      "空投",
      "staking",
      "質押",
      "lending",
      "governance",
      "API",
      "how to stake",
      "如何質押",
      "contract address",
      "合約地址",
    ];

    logger.info("🚀 開始快速測試常見關鍵字...");
    const results = await this.batchSearch(testKeywords, {
      topK: 3,
      showDebug: false,
    });

    // 顯示測試摘要
    console.log("\n" + "=".repeat(80));
    console.log("📊 快速測試結果摘要");
    console.log("=".repeat(80));

    Object.entries(results).forEach(([keyword, result]) => {
      if (result.error) {
        console.log(`❌ ${keyword}: 錯誤 - ${result.error}`);
      } else {
        const avgScore =
          result.results.length > 0
            ? (
                result.results.reduce((sum, r) => sum + r.score, 0) /
                result.results.length
              ).toFixed(2)
            : 0;
        console.log(
          `✅ ${keyword}: ${result.totalResults} 個結果 (平均分數: ${avgScore})`
        );
      }
    });

    return results;
  }
}

module.exports = QueryHelper;
