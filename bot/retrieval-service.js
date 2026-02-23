const winston = require("winston");
const {
  TOPIC_CONFIG,
  COMPARISON_KEYWORDS,
} = require("../config/retrieval-topics");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.prettyPrint(),
  ),
  defaultMeta: { service: "retrieval-service" },
  transports: [
    new winston.transports.File({ filename: "logs/bot.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
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
    this.lastComparisonMeta = null;
  }

  topicKeywordsMatch(topicKey, question) {
    const topic = TOPIC_CONFIG[topicKey];
    if (!topic?.keywords) return false;
    const q = (question || "").toLowerCase();
    return topic.keywords.some((k) => q.includes(k.toLowerCase()));
  }

  getMentionedTopics(question) {
    const q = (question || "").toLowerCase();
    return Object.keys(TOPIC_CONFIG).filter((key) =>
      TOPIC_CONFIG[key].keywords.some((k) => q.includes(k.toLowerCase())),
    );
  }

  async queryByFilenames(embedding, filenames, topK = 30, label = "查詢") {
    const allChunks = [];
    for (const filename of filenames) {
      try {
        const res = await this.index.query({
          vector: embedding,
          filter: { filename },
          topK,
          includeMetadata: true,
        });
        if (res.matches?.length) {
          const sorted = res.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...sorted);
          logger.info(`${label} ${filename}: 找到 ${sorted.length} 個chunks`);
        }
      } catch (e) {
        logger.warn(`${label} ${filename} 失敗: ${e.message}`);
      }
    }
    return allChunks;
  }

  async retrieveRelevantChunks(embedding, question) {
    this.lastComparisonMeta = null;
    try {
      const queryTypeConfig = [
        [this.detectSecurityQuery(question), "security", "handleSecurityQuery"],
        [
          this.detectComparisonQuery(question),
          "comparison",
          "handleComparisonQuery",
        ],
        [
          this.detectSmartLendingQuery(question),
          "smart-lending",
          "handleSmartLendingQuery",
        ],
        [this.detectRWAQuery(question), "rwa", "handleRWAQuery"],
        [this.detectLendingQuery(question), "lending", "handleLendingQuery"],
        [this.detectCDPQuery(question), "cdp", "handleCDPQuery"],
        [this.detectClisBNBQuery(question), "clisbnb", "handleClisBNBQuery"],
        [this.detectVeListaQuery(question), "velista", "handleVeListaQuery"],
      ];
      const matched = queryTypeConfig.find(([ok]) => ok);

      if (matched) {
        logger.info("檢索結果:", { queryType: matched[1], strategy: "topic" });
        return await this[matched[2]]([], embedding, question);
      }

      const smartFilter = this.smartProcessor.buildSmartFilters(question);
      let query = await this.index.query({
        vector: embedding,
        filter: smartFilter,
        topK: this.config.maxResults,
        includeMetadata: true,
      });

      let results = (query.matches || []).filter((chunk) => chunk.score >= 0.5);
      if (results.length === 0) {
        results = (query.matches || []).filter((chunk) => chunk.score >= 0.3);
      }
      logger.info("檢索結果:", {
        totalResults: results.length,
        queryType: "regular",
      });
      return await this.handleUnifiedQuery(results, embedding, {
        queryType: "regular",
      });
    } catch (error) {
      logger.error("檢索相關內容失敗:", error);
      throw error;
    }
  }

  detectSecurityQuery(question) {
    return this.topicKeywordsMatch("security", question);
  }

  detectComparisonQuery(question) {
    const q = (question || "").toLowerCase();
    const hasComparisonWords = COMPARISON_KEYWORDS.some((k) =>
      q.includes(k.toLowerCase()),
    );
    const hasMultipleSystems =
      q.includes("cdp") &&
      q.includes("lending") &&
      !this.detectSecurityQuery(question);
    return hasComparisonWords || hasMultipleSystems;
  }

  detectSmartLendingQuery(question) {
    return this.topicKeywordsMatch("smartLending", question);
  }

  detectRWAQuery(question) {
    return this.topicKeywordsMatch("rwa", question);
  }

  detectLendingQuery(question) {
    if (
      this.detectSmartLendingQuery(question) ||
      this.detectRWAQuery(question) ||
      this.detectClisBNBQuery(question) ||
      this.detectVeListaQuery(question)
    ) {
      return false;
    }
    if (this.topicKeywordsMatch("cdp", question)) return false;
    return this.topicKeywordsMatch("lending", question);
  }

  detectCDPQuery(question) {
    if (this.detectComparisonQuery(question)) return false;
    if (
      this.detectClisBNBQuery(question) ||
      this.detectVeListaQuery(question)
    ) {
      return false;
    }
    return this.topicKeywordsMatch("cdp", question);
  }

  detectClisBNBQuery(question) {
    return this.topicKeywordsMatch("clisbnb", question);
  }

  detectVeListaQuery(question) {
    return this.topicKeywordsMatch("velista", question);
  }

  async handleSecurityQuery(results, embedding, question) {
    logger.info("檢測到安全相關問題，使用專門的安全文檔檢索策略");
    const filenames = TOPIC_CONFIG.security.filenames;
    let allChunks = await this.queryByFilenames(
      embedding,
      filenames,
      50,
      "安全查詢",
    );

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

    // 如果还是没有足够内容，進行廣泛檢索
    if (allChunks.length < 3) {
      logger.info("安全相關檢索結果不足，進行廣泛檢索");
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "security",
        question,
      });
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleComparisonQuery(results, embedding, question = "") {
    const mentioned = this.getMentionedTopics(question);
    this.lastComparisonMeta = {
      matchedTopics: mentioned,
      matchedTopicLabels: mentioned.map((t) => TOPIC_CONFIG[t]?.label || t),
      isPartial: mentioned.length < 2,
    };

    if (mentioned.length === 0) {
      logger.info("比較類問題未識別到已知主題，進行廣泛檢索");
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "comparison",
        question: "comparison",
      });
    }

    logger.info(
      `比較類問題，依主題檢索: ${mentioned.join(", ")}${mentioned.length < 2 ? "（僅部分主題有文檔）" : ""}`,
    );

    const allFilenames = [
      ...new Set(mentioned.flatMap((t) => TOPIC_CONFIG[t]?.filenames || [])),
    ];
    const allChunks = await this.queryByFilenames(
      embedding,
      allFilenames,
      20,
      "比較查詢",
    );

    if (allChunks.length < 5) {
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "comparison",
        question: "comparison",
      });
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleLendingQuery(results, embedding, question) {
    logger.info("檢測到 Lista Lending 相關問題，使用專門的 Lending 檢索策略");
    const allChunks = await this.queryByFilenames(
      embedding,
      TOPIC_CONFIG.lending.filenames,
      30,
      "Lending查詢",
    );
    if (allChunks.length < 3) {
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "lending",
        question,
      });
    }
    return this.deduplicateAndSort(allChunks);
  }

  async handleSmartLendingQuery(results, embedding, question) {
    logger.info(
      "檢測到 Smart Lending 相關問題，使用專門的 Smart Lending 檢索策略",
    );
    const allChunks = await this.queryByFilenames(
      embedding,
      TOPIC_CONFIG.smartLending.filenames,
      30,
      "Smart Lending查詢",
    );
    if (allChunks.length < 3) {
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "smart-lending",
        question,
      });
    }
    return this.deduplicateAndSort(allChunks);
  }

  async handleRWAQuery(results, embedding, question) {
    logger.info("檢測到 RWA 相關問題，使用專門的 RWA 檢索策略");
    const allChunks = await this.queryByFilenames(
      embedding,
      TOPIC_CONFIG.rwa.filenames,
      30,
      "RWA查詢",
    );
    if (allChunks.length < 3) {
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "rwa",
        question,
      });
    }
    return this.deduplicateAndSort(allChunks);
  }

  async handleCDPQuery(results, embedding, question) {
    logger.info("檢測到 CDP 相關問題，使用專門的 CDP 檢索策略");
    const allChunks = await this.queryByFilenames(
      embedding,
      TOPIC_CONFIG.cdp.filenames,
      30,
      "CDP查詢",
    );
    if (allChunks.length < 3) {
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "cdp",
        question,
      });
    }
    return this.deduplicateAndSort(allChunks);
  }

  async handleClisBNBQuery(results, embedding, question) {
    logger.info(
      "檢測到 clisBNB/slisBNBx 相關問題，使用專門的 clisBNB 檢索策略",
    );
    const allChunks = await this.queryByFilenames(
      embedding,
      TOPIC_CONFIG.clisbnb.filenames,
      30,
      "clisBNB查詢",
    );
    if (allChunks.length < 3) {
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "clisbnb",
        question,
      });
    }
    return this.deduplicateAndSort(allChunks);
  }

  async handleVeListaQuery(results, embedding, question) {
    logger.info("檢測到 veLISTA 相關問題，使用專門的 veLISTA 檢索策略");
    const allChunks = await this.queryByFilenames(
      embedding,
      TOPIC_CONFIG.velista.filenames,
      30,
      "veLISTA查詢",
    );
    if (allChunks.length < 3) {
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "velista",
        question,
      });
    }
    return this.deduplicateAndSort(allChunks);
  }

  async handleUnifiedQuery(resultsOrEmbedding, embedding = null, options = {}) {
    const {
      queryType = "regular",
      useBroadSearch = false,
      question = "",
    } = options;

    let results;

    // 如果需要廣泛搜索，先進行廣泛檢索
    if (useBroadSearch) {
      logger.info(`進行廣泛檢索 (${queryType})，降低相似度閾值並擴大搜索範圍`);

      const broadQuery = await this.index.query({
        vector: resultsOrEmbedding,
        topK: 50,
        includeMetadata: true,
      });

      const thresholds = [0.3, 0.2];
      for (const threshold of thresholds) {
        const filteredResults = (broadQuery.matches || []).filter(
          (chunk) => chunk.score >= threshold,
        );

        if (filteredResults.length > 0) {
          logger.info(
            `廣泛檢索找到 ${filteredResults.length} 個結果 (閾值 ${threshold})`,
          );
          results = filteredResults;
          break;
        }
      }

      if (!results) {
        logger.warn(`廣泛檢索仍未找到足夠結果，返回前 5 個最相似結果`);
        return (broadQuery.matches || []).slice(0, 5);
      }
    } else {
      results = resultsOrEmbedding;
      embedding = embedding || resultsOrEmbedding; // 兼容舊調用
    }

    return await this.processResults(results, embedding, queryType);
  }

  async processResults(results, embedding, queryType) {
    const candidateFiles = [
      ...new Set(results.map((r) => r.metadata.filename)),
    ].slice(0, 3);

    let bestFile = null;
    let bestScore = 0;
    let bestContentLength = 0;

    for (const filename of candidateFiles) {
      const fileChunks = results.filter(
        (r) => r.metadata.filename === filename,
      );
      const avgScore =
        fileChunks.reduce((sum, chunk) => sum + chunk.score, 0) /
        fileChunks.length;
      const totalContentLength = fileChunks.reduce((sum, chunk) => {
        const content =
          chunk.metadata.chunk_content || chunk.metadata.content || "";
        return sum + content.length;
      }, 0);

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
      `选择最佳文件: ${bestFile} (综合分数: ${(bestScore * 100).toFixed(1)}%)`,
    );

    // 如果沒有找到最佳文件或 embedding 為空，直接返回現有結果
    if (!bestFile || !embedding) {
      logger.info(`無最佳文件或嵌入向量，返回現有 ${results.length} 個結果`);
      return results;
    }

    const bestFileChunks = results.filter(
      (r) => r.metadata.filename === bestFile,
    );
    const avgSimilarity =
      bestFileChunks.reduce((sum, chunk) => sum + chunk.score, 0) /
      bestFileChunks.length;

    if (avgSimilarity >= 0.65 && bestContentLength > 100) {
      const fileQuery = await this.index.query({
        vector: embedding,
        filter: { filename: bestFile },
        topK: 100,
        includeMetadata: true,
      });

      const allChunks = fileQuery.matches.sort(
        (a, b) => (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
      );

      logger.info(`使用單一文件 ${bestFile} 的 ${allChunks.length} 個文檔塊`);
      return allChunks;
    }

    const relevantFiles = candidateFiles.slice(0, 2);
    const allChunks = [];

    for (const filename of relevantFiles) {
      const fileQuery = await this.index.query({
        vector: embedding,
        filter: { filename: filename },
        topK: 100,
        includeMetadata: true,
      });

      const fileChunks = fileQuery.matches.sort(
        (a, b) => (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
      );

      allChunks.push(...fileChunks);
    }

    logger.info(
      `檢索到 ${relevantFiles.length} 個相關文件，共 ${allChunks.length} 個文檔塊 (${queryType})`,
    );
    return allChunks;
  }

  async handleRegularQuery(results, embedding) {
    return await this.handleUnifiedQuery(results, embedding, {
      queryType: "regular",
    });
  }

  async handleBroadSearch(embedding, question, queryType) {
    return await this.handleUnifiedQuery(embedding, null, {
      useBroadSearch: true,
      queryType,
      question,
    });
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
      (a, b) => (b.score || 0) - (a.score || 0),
    );

    logger.info(`比較查詢: 檢索到 ${sortedChunks.length} 個去重文檔塊`);
    logger.info("涉及的文件:", {
      files: [...new Set(sortedChunks.map((c) => c.metadata.filename))].slice(
        0,
        10,
      ),
    });

    return sortedChunks;
  }
}

module.exports = RetrievalService;
