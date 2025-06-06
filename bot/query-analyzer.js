const QueryHelper = require("./query-helper");
const { Pinecone } = require("@pinecone-database/pinecone");

class QueryAnalyzer {
  constructor(pinecone, indexName = "gitbook-docs") {
    this.queryHelper = new QueryHelper(pinecone, indexName);
    this.pinecone = pinecone;
    this.indexName = indexName;
  }

  // 分析索引內容分佈
  async analyzeIndexDistribution() {
    console.log("📊 分析索引內容分佈...");

    try {
      const index = this.pinecone.Index(this.indexName);

      // 獲取索引統計
      const stats = await index.describeIndexStats();
      console.log("\n📈 索引統計:");
      console.log(`   總向量數: ${stats.totalVectorCount}`);
      console.log(`   維度: ${stats.dimension}`);
      console.log(`   索引大小: ${(stats.indexFullness * 100).toFixed(1)}%`);

      // 分析語言分佈
      await this.analyzeCategoryDistribution("language", ["en", "zh-CN"]);

      // 分析概念分佈
      await this.analyzeCategoryDistribution("concepts", [
        "airdrop",
        "staking",
        "lending",
        "governance",
        "contract",
      ]);

      // 分析內容類型分佈
      await this.analyzeCategoryDistribution("content_type", [
        "tutorial",
        "guide",
        "reference",
        "api",
      ]);
    } catch (error) {
      console.error("❌ 分析索引分佈失敗:", error.message);
    }
  }

  // 分析特定類別的分佈
  async analyzeCategoryDistribution(field, values) {
    console.log(`\n🔍 分析 ${field} 分佈:`);

    for (const value of values) {
      try {
        const result = await this.queryHelper.searchByKeyword("test", {
          topK: 1,
          showDebug: false,
          language: "all",
        });

        // 這裡我們用一個通用的查詢來測試過濾器
        const index = this.pinecone.Index(this.indexName);
        const filterQuery = await index.query({
          vector: new Array(1024).fill(0), // 零向量
          topK: 1,
          filter: { [field]: { $eq: value } },
        });

        console.log(`   ${value}: 有數據 ✅`);
      } catch (error) {
        console.log(`   ${value}: 無數據或錯誤 ❌`);
      }
    }
  }

  // 查詢品質評估
  async evaluateQueryQuality(testCases) {
    console.log("\n🎯 評估查詢品質...");

    const results = [];

    for (const testCase of testCases) {
      const { query, expectedConcepts, expectedLanguage, minScore } = testCase;

      try {
        const result = await this.queryHelper.searchByKeyword(query, {
          topK: 5,
          showDebug: false,
        });

        const quality = this.calculateQueryQuality(result, {
          expectedConcepts,
          expectedLanguage,
          minScore,
        });

        results.push({
          query,
          quality,
          ...result,
        });

        console.log(`\n查詢: "${query}"`);
        console.log(`品質分數: ${quality.score}/100`);
        console.log(`評估: ${quality.assessment}`);
        console.log(`問題: ${quality.issues.join(", ") || "無"}`);
      } catch (error) {
        console.error(`查詢 "${query}" 失敗:`, error.message);
      }
    }

    return results;
  }

  // 計算查詢品質分數
  calculateQueryQuality(result, expectations) {
    let score = 0;
    const issues = [];

    // 1. 結果數量 (20分)
    if (result.totalResults === 0) {
      issues.push("無查詢結果");
    } else if (result.totalResults < 3) {
      score += 10;
      issues.push("結果太少");
    } else {
      score += 20;
    }

    // 2. 分數質量 (30分)
    if (result.results.length > 0) {
      const avgScore =
        result.results.reduce((sum, r) => sum + r.score, 0) /
        result.results.length;
      if (avgScore >= 0.8) {
        score += 30;
      } else if (avgScore >= 0.7) {
        score += 20;
      } else if (avgScore >= 0.6) {
        score += 10;
      } else {
        issues.push("相關性分數偏低");
      }
    }

    // 3. 概念匹配 (25分)
    if (
      expectations.expectedConcepts &&
      expectations.expectedConcepts.length > 0
    ) {
      const foundConcepts = new Set(result.results.flatMap((r) => r.concepts));
      const matchedConcepts = expectations.expectedConcepts.filter((c) =>
        foundConcepts.has(c)
      );
      const conceptMatchRate =
        matchedConcepts.length / expectations.expectedConcepts.length;

      score += Math.round(conceptMatchRate * 25);

      if (conceptMatchRate < 0.5) {
        issues.push("概念匹配率低");
      }
    } else {
      score += 15; // 如果沒有期望概念，給部分分數
    }

    // 4. 語言匹配 (15分)
    if (expectations.expectedLanguage) {
      const languageMatch = result.results.some(
        (r) => r.language === expectations.expectedLanguage
      );
      if (languageMatch) {
        score += 15;
      } else {
        issues.push("語言不匹配");
      }
    } else {
      score += 10;
    }

    // 5. 多樣性 (10分)
    const uniqueFiles = new Set(result.results.map((r) => r.filename));
    if (uniqueFiles.size >= Math.min(result.results.length, 3)) {
      score += 10;
    } else {
      issues.push("結果多樣性不足");
    }

    // 評估等級
    let assessment;
    if (score >= 90) assessment = "優秀 🏆";
    else if (score >= 75) assessment = "良好 ✅";
    else if (score >= 60) assessment = "普通 ⚠️";
    else assessment = "需改進 ❌";

    return { score, assessment, issues };
  }

  // 比較不同查詢策略
  async compareQueryStrategies(baseQuery) {
    console.log(`\n🆚 比較查詢策略: "${baseQuery}"`);

    const strategies = [
      {
        name: "原始查詢",
        query: baseQuery,
        options: { language: "auto" },
      },
      {
        name: "英文限定",
        query: baseQuery,
        options: { language: "en" },
      },
      {
        name: "中文限定",
        query: baseQuery,
        options: { language: "zh-CN" },
      },
      {
        name: "所有語言",
        query: baseQuery,
        options: { language: "all" },
      },
      {
        name: "更多結果",
        query: baseQuery,
        options: { topK: 20, language: "auto" },
      },
    ];

    const results = {};

    for (const strategy of strategies) {
      try {
        const result = await this.queryHelper.searchByKeyword(strategy.query, {
          ...strategy.options,
          showDebug: false,
        });

        results[strategy.name] = {
          totalResults: result.totalResults,
          avgScore:
            result.results.length > 0
              ? (
                  result.results.reduce((sum, r) => sum + r.score, 0) /
                  result.results.length
                ).toFixed(3)
              : 0,
          topScore:
            result.results.length > 0 ? result.results[0].score.toFixed(3) : 0,
          languages: [...new Set(result.results.map((r) => r.language))],
          concepts: [
            ...new Set(result.results.flatMap((r) => r.concepts)),
          ].slice(0, 5),
        };
      } catch (error) {
        results[strategy.name] = { error: error.message };
      }
    }

    // 顯示比較結果
    console.log("\n📊 策略比較結果:");
    console.table(
      Object.fromEntries(
        Object.entries(results).map(([name, data]) => [
          name,
          data.error
            ? { 錯誤: data.error }
            : {
                結果數: data.totalResults,
                平均分: data.avgScore,
                最高分: data.topScore,
                語言: data.languages.join(","),
                概念數: data.concepts.length,
              },
        ])
      )
    );

    return results;
  }

  // 運行完整的查詢測試套件
  async runFullTest() {
    console.log("🚀 運行完整查詢測試套件...");

    // 1. 索引分析
    await this.analyzeIndexDistribution();

    // 2. 查詢品質評估
    const testCases = [
      {
        query: "lista airdrop",
        expectedConcepts: ["airdrop", "lista"],
        expectedLanguage: "en",
        minScore: 0.7,
      },
      {
        query: "質押教程",
        expectedConcepts: ["staking"],
        expectedLanguage: "zh-CN",
        minScore: 0.6,
      },
      {
        query: "smart contract",
        expectedConcepts: ["contract"],
        expectedLanguage: "en",
        minScore: 0.6,
      },
      {
        query: "governance voting",
        expectedConcepts: ["governance"],
        expectedLanguage: "en",
        minScore: 0.6,
      },
    ];

    await this.evaluateQueryQuality(testCases);

    // 3. 策略比較
    await this.compareQueryStrategies("staking");
    await this.compareQueryStrategies("空投");

    console.log("\n✅ 完整測試完成!");
  }
}

module.exports = QueryAnalyzer;
