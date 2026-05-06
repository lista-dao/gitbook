const winston = require("winston");
const {
  TOPIC_CONFIG,
  COMPARISON_KEYWORDS,
} = require("../config/retrieval-topics");
const { RETRIEVAL_BUDGETS } = require("../config/retrieval-budgets");
const { rerankChunksByIntent } = require("./rerank/chunk-reranker");
const {
  queryByFilenames,
  processResults,
  deduplicateAndSort,
} = require("./retrieval/common");
const {
  handleSecurityQuery,
  handleComparisonQuery,
} = require("./retrieval/special-handlers");
const TOPIC_QUERY_SPECS = require("./retrieval/topic-query-specs");

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
      maxResults: RETRIEVAL_BUDGETS.regular.topK,
      budgets: RETRIEVAL_BUDGETS,
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

  async retrieveRelevantChunks(embedding, question) {
    this.lastComparisonMeta = null;

    try {
      const strategies = [
        {
          match: this.detectSecurityQuery(question),
          queryType: "security",
          run: () => handleSecurityQuery(this, embedding, question, logger),
        },
        {
          match: this.detectComparisonQuery(question),
          queryType: "comparison",
          run: () => handleComparisonQuery(this, embedding, question, logger),
        },
        ...TOPIC_QUERY_SPECS.map((spec) => ({
          match: this[spec.detect](question),
          queryType: spec.queryType,
          run: () =>
            this.handleTopicQuery({
              ...spec,
              embedding,
              question,
            }),
        })),
      ];

      const matched = strategies.find((strategy) => strategy.match);
      if (matched) {
        logger.info("檢索結果:", { queryType: matched.queryType, strategy: "topic" });
        return await matched.run();
      }

      const smartFilter = this.smartProcessor.buildSmartFilters(question);
      const intentBoosts = this.smartProcessor.getQueryIntentBoosts(question);
      const query = await this.index.query({
        vector: embedding,
        filter: smartFilter,
        topK: this.config.maxResults,
        includeMetadata: true,
      });

      const { highThreshold, lowThreshold } = this.config.budgets.regular;
      let results = (query.matches || []).filter(
        (chunk) => chunk.score >= highThreshold,
      );
      if (results.length === 0) {
        results = (query.matches || []).filter((chunk) => chunk.score >= lowThreshold);
      }

      // Apply soft re-rank boosts based on query intent (replaces the old hard
      // content_type / has_code filters). Threshold gate stays on raw similarity.
      results = this.smartProcessor.applyIntentBoosts(results, intentBoosts);

      logger.info("檢索結果:", {
        totalResults: results.length,
        queryType: "regular",
        intentBoosts: intentBoosts.map((r) => r.label),
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
      q.includes("cdp") && q.includes("lending") && !this.detectSecurityQuery(question);
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
      this.detectCreditLoansQuery(question) ||
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
      this.detectCreditLoansQuery(question) ||
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

  detectCreditLoansQuery(question) {
    return this.topicKeywordsMatch("creditLoans", question);
  }

  detectVeListaQuery(question) {
    return this.topicKeywordsMatch("velista", question);
  }

  async handleTopicQuery({
    topicKey,
    queryType,
    label,
    logMessage,
    embedding,
    question,
    topK,
    minChunks,
  }) {
    logger.info(logMessage);
    const topicBudget = this.getTopicBudget(queryType);

    const allChunks = await queryByFilenames({
      index: this.index,
      embedding,
      filenames: TOPIC_CONFIG[topicKey].filenames,
      topK: topK ?? topicBudget.topK,
      label,
      logger,
      concurrency: this.config.budgets.byFilenameConcurrency,
    });

    if (allChunks.length < (minChunks ?? topicBudget.minChunks)) {
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType,
        question,
      });
    }

    return this.deduplicateAndSort(allChunks, question);
  }

  async handleUnifiedQuery(resultsOrEmbedding, embedding = null, options = {}) {
    const { queryType = "regular", useBroadSearch = false } = options;

    let results;

    if (useBroadSearch) {
      logger.info(`進行廣泛檢索 (${queryType})，降低相似度閾值並擴大搜索範圍`);
      const broadBudget = this.config.budgets.broadSearch;

      const broadQuery = await this.index.query({
        vector: resultsOrEmbedding,
        topK: broadBudget.topK,
        includeMetadata: true,
      });

      const thresholds = broadBudget.thresholds;
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
        logger.warn(
          `廣泛檢索仍未找到足夠結果，返回前 ${broadBudget.fallbackTopResults} 個最相似結果`,
        );
        return (broadQuery.matches || []).slice(0, broadBudget.fallbackTopResults);
      }
    } else {
      results = resultsOrEmbedding;
      embedding = embedding || resultsOrEmbedding; // 兼容舊調用
    }

    return await this.processResults(results, embedding, queryType);
  }

  async processResults(results, embedding, queryType) {
    return await processResults({
      index: this.index,
      results,
      embedding,
      queryType,
      logger,
    });
  }

  getTopicBudget(queryType) {
    return (
      this.config.budgets.topicOverrides[queryType] ||
      this.config.budgets.topicDefaults
    );
  }

  deduplicateAndSort(allChunks, question = "") {
    return deduplicateAndSort({
      allChunks,
      question,
      rerankFn: rerankChunksByIntent,
      logger,
    });
  }
}

module.exports = RetrievalService;
