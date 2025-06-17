const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.prettyPrint()
  ),
  defaultMeta: { service: "retrieval-service" },
  transports: [
    new winston.transports.File({ filename: "logs/bot.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
        // winston.format.prettyPrint({
        //   depth: 4,
        //   colorize: true,
        // })
      ),
    }),
  ],
});

class RetrievalService {
  constructor(index, smartProcessor) {
    this.index = index;
    this.smartProcessor = smartProcessor;
    this.config = {
      similarityThreshold: 0.6,
      maxResults: 8,
    };
  }

  async retrieveRelevantChunks(embedding, question) {
    try {
      const smartFilter = this.smartProcessor.buildSmartFilters(question);
      let query = await this.index.query({
        vector: embedding,
        filter: smartFilter,
        topK: this.config.maxResults,
        includeMetadata: true,
      });

      const results = (query.matches || []).filter(
        (chunk) => chunk.score >= 0.5
      );

      const isSecurityQuery = this.detectSecurityQuery(question);
      const isComparisonQuery = this.detectComparisonQuery(question);

      logger.info("檢索結果:", {
        totalResults: results.length,
        queryType: isSecurityQuery
          ? "security"
          : isComparisonQuery
          ? "comparison"
          : "regular",
      });

      if (results.length === 0) {
        logger.info(`未找到相似度大於 0.5 的文檔塊`);
        const fallbackResults = (query.matches || []).filter(
          (chunk) => chunk.score >= 0.3
        );
        return fallbackResults;
      }

      if (isSecurityQuery) {
        return await this.handleSecurityQuery(results, embedding, question);
      }

      if (isComparisonQuery) {
        return await this.handleComparisonQuery(results, embedding);
      }

      return await this.handleRegularQuery(results, embedding);
    } catch (error) {
      logger.error("檢索相關內容失敗:", error);
      throw error;
    }
  }

  detectSecurityQuery(question) {
    const securityKeywords = [
      "security",
      "audit",
      "audits",
      "audited",
      "auditing",
      "bug bounty",
      "immunefi",
      "vulnerability",
      "vulnerabilities",
      "safe",
      "safety",
      "protect",
      "protection",
      "secure",
      "multi-signature",
      "multisig",
      "time lock",
      "timelock",
      "oracle",
      "price feed",
      "liquidation",
      "slashing",
      "contract security",
      "smart contract security",
    ];

    const questionLower = question.toLowerCase();
    return securityKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase())
    );
  }

  detectComparisonQuery(question) {
    const comparisonKeywords = [
      "difference",
      "differences",
      "compare",
      "comparison",
      "vs",
      "versus",
      "choose",
      "which",
      "better",
      "distinguish",
      "contrast",
    ];

    const questionLower = question.toLowerCase();
    const hasComparisonWords = comparisonKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase())
    );

    // 检查是否同时提到多个系统 - 排除安全问题
    const hasMultipleSystems =
      questionLower.includes("cdp") &&
      questionLower.includes("lending") &&
      !this.detectSecurityQuery(question); // ✅ 关键修复：排除安全问题

    return hasComparisonWords || hasMultipleSystems;
  }

  async handleSecurityQuery(results, embedding, question) {
    logger.info("檢測到安全相關問題，使用專門的安全文檔檢索策略");

    // 专门搜索安全相关文档
    const securityFilenames = [
      "security/audit-reports.md",
      "security/bug-bounty-immunefi.md",
    ];

    const allChunks = [];

    // 获取安全相关文档
    for (const filename of securityFilenames) {
      try {
        const securityQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 50,
          includeMetadata: true,
        });

        if (securityQuery.matches && securityQuery.matches.length > 0) {
          const securityChunks = securityQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0)
          );
          allChunks.push(...securityChunks);
          logger.info(
            `安全查詢 ${filename}: 找到 ${securityChunks.length} 個chunks`
          );
        }
      } catch (error) {
        logger.warn(`安全查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 如果安全文档没有足够内容，搜索其他包含安全信息的文档
    if (allChunks.length < 3) {
      logger.info("專門安全文檔結果不足，擴大搜索範圍");

      const generalSecurityQuery = await this.index.query({
        vector: embedding,
        topK: 30,
        includeMetadata: true,
      });

      const securityRelatedChunks =
        generalSecurityQuery.matches?.filter((match) => {
          const content = match.metadata.chunk_content || "";
          const filename = match.metadata.filename || "";

          return (
            filename.includes("security") ||
            content.toLowerCase().includes("audit") ||
            content.toLowerCase().includes("security") ||
            content.toLowerCase().includes("immunefi") ||
            content.toLowerCase().includes("bug bounty")
          );
        }) || [];

      allChunks.push(...securityRelatedChunks);
    }

    // 如果还是没有足够内容，使用原始结果
    if (allChunks.length < 3) {
      logger.info("安全相關檢索結果不足，使用原始檢索結果");
      return await this.handleRegularQuery(results, embedding);
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleComparisonQuery(results, embedding) {
    logger.info("檢測到比較類問題，使用專門的CDP vs Lending檢索策略");

    // 專門搜索CDP相關文檔 - 使用具體文件名
    const cdpFilenames = [
      "introduction/collateral-debt-position-lisusd/README.md",
      "for-developer/collateral-debt-position/README.md",
      "for-developer/collateral-debt-position/mechanics.md",
      "user-guide/collateral-debt-position/README.md",
      "introduction/collateral-debt-position-lisusd/collateral/README.md",
      "introduction/collateral-debt-position-lisusd/lisusd/README.md",
    ];

    // 專門搜索Lending相關文檔
    const lendingFilenames = [
      "introduction/lista-lending/README.md",
      "lista-lending/README.md",
      "introduction/lista-lending/borrowers-and-suppliers.md",
    ];

    const allChunks = [];

    // 獲取CDP相關文檔
    for (const filename of cdpFilenames) {
      try {
        const cdpQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 20,
          includeMetadata: true,
        });

        if (cdpQuery.matches && cdpQuery.matches.length > 0) {
          const cdpChunks = cdpQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0)
          );
          allChunks.push(...cdpChunks);
          logger.info(`CDP查詢 ${filename}: 找到 ${cdpChunks.length} 個chunks`);
        }
      } catch (error) {
        logger.warn(`CDP查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 獲取Lending相關文檔
    for (const filename of lendingFilenames) {
      try {
        const lendingQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 20,
          includeMetadata: true,
        });

        if (lendingQuery.matches && lendingQuery.matches.length > 0) {
          const lendingChunks = lendingQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0)
          );
          allChunks.push(...lendingChunks);
          logger.info(
            `Lending查詢 ${filename}: 找到 ${lendingChunks.length} 個chunks`
          );
        }
      } catch (error) {
        logger.warn(`Lending查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 如果專門查詢沒找到足夠內容，回到原始結果
    if (allChunks.length < 5) {
      logger.info("專門查詢結果不足，使用原始檢索結果");
      return await this.handleRegularQuery(results, embedding);
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleRegularQuery(results, embedding) {
    const candidateFiles = [
      ...new Set(results.map((r) => r.metadata.filename)),
    ].slice(0, 3);

    let bestFile = null;
    let bestScore = 0;
    let bestContentLength = 0;

    for (const filename of candidateFiles) {
      const fileChunks = results.filter(
        (r) => r.metadata.filename === filename
      );
      const avgScore =
        fileChunks.reduce((sum, chunk) => sum + chunk.score, 0) /
        fileChunks.length;
      const totalContentLength = fileChunks.reduce((sum, chunk) => {
        const content =
          chunk.metadata.chunk_content || chunk.metadata.content || "";
        return sum + content.length;
      }, 0);

      // 檢查是否包含表格
      const hasTable = fileChunks.some((chunk) => {
        const content =
          chunk.metadata.chunk_content || chunk.metadata.content || "";
        return (
          (content.includes("|") && content.includes("|-")) ||
          chunk.metadata.has_tables
        );
      });

      const normalizedContentScore = Math.min(totalContentLength / 1000, 1);
      const tableBonus = hasTable ? 0.3 : 0;
      const compositeScore =
        avgScore * 0.6 + normalizedContentScore * 0.2 + tableBonus;

      if (
        compositeScore > bestScore ||
        (compositeScore === bestScore && totalContentLength > bestContentLength)
      ) {
        bestFile = filename;
        bestScore = compositeScore;
        bestContentLength = totalContentLength;
      }
    }

    logger.info(
      `选择最佳文件: ${bestFile} (综合分数: ${(bestScore * 100).toFixed(1)}%)`
    );

    const bestFileChunks = results.filter(
      (r) => r.metadata.filename === bestFile
    );
    const avgSimilarity =
      bestFileChunks.reduce((sum, chunk) => sum + chunk.score, 0) /
      bestFileChunks.length;

    if (avgSimilarity >= 0.65 && bestContentLength > 100) {
      const fileFilter = {
        filename: bestFile,
      };

      const fileQuery = await this.index.query({
        vector: embedding,
        filter: fileFilter,
        topK: 100,
        includeMetadata: true,
      });

      const allChunks = fileQuery.matches.sort(
        (a, b) => (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0)
      );

      logger.info(`使用單一文件 ${bestFile} 的 ${allChunks.length} 個文檔塊`);
      return allChunks;
    }

    const relevantFiles = candidateFiles.slice(0, 2);
    const allChunks = [];

    for (const filename of relevantFiles) {
      const fileFilter = {
        filename: filename,
      };

      const fileQuery = await this.index.query({
        vector: embedding,
        filter: fileFilter,
        topK: 100,
        includeMetadata: true,
      });

      const fileChunks = fileQuery.matches.sort(
        (a, b) => (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0)
      );

      allChunks.push(...fileChunks);
    }

    logger.info(
      `檢索到 ${relevantFiles.length} 個相關文件，共 ${allChunks.length} 個文檔塊`
    );
    return allChunks;
  }

  deduplicateAndSort(allChunks) {
    // 去重並按相似度排序
    const uniqueChunks = [];
    const seenIds = new Set();

    allChunks.forEach((chunk) => {
      const id =
        chunk.id || `${chunk.metadata.filename}_${chunk.metadata.chunk_index}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueChunks.push(chunk);
      }
    });

    const sortedChunks = uniqueChunks.sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );

    logger.info(`比較查詢: 檢索到 ${sortedChunks.length} 個去重文檔塊`);
    logger.info("涉及的文件:", {
      files: [...new Set(sortedChunks.map((c) => c.metadata.filename))].slice(
        0,
        10
      ),
    });

    return sortedChunks;
  }
}

module.exports = RetrievalService;
