const { TOPIC_CONFIG } = require("../../config/retrieval-topics");
const { queryByFilenames } = require("./common");

async function handleSecurityQuery(service, embedding, question, logger) {
  logger.info("檢測到安全相關問題，使用專門的安全文檔檢索策略");
  const securityBudget = service.getTopicBudget("security");

  let allChunks = await queryByFilenames({
    index: service.index,
    embedding,
    filenames: TOPIC_CONFIG.security.filenames,
    topK: securityBudget.topK,
    label: "安全查詢",
    logger,
    concurrency: service.config.budgets.byFilenameConcurrency,
  });

  if (allChunks.length < 3) {
    logger.info("專門安全文檔結果不足，擴大搜索範圍");

    const generalSecurityQuery = await service.index.query({
      vector: embedding,
      topK: securityBudget.generalTopK,
      includeMetadata: true,
    });

    const securityRelatedChunks =
      generalSecurityQuery.matches?.filter((match) => {
        const content = (match.metadata.chunk_content || "").toLowerCase();
        const filename = (match.metadata.filename || "").toLowerCase();

        return (
          filename.includes("security") ||
          content.includes("audit") ||
          content.includes("security") ||
          content.includes("immunefi") ||
          content.includes("bug bounty")
        );
      }) || [];

    allChunks.push(...securityRelatedChunks);
  }

  if (allChunks.length < 3) {
    logger.info("安全相關檢索結果不足，進行廣泛檢索");
    return await service.handleUnifiedQuery(embedding, null, {
      useBroadSearch: true,
      queryType: "security",
      question,
    });
  }

  return service.deduplicateAndSort(allChunks, question);
}

async function handleComparisonQuery(service, embedding, question = "", logger) {
  const comparisonBudget = service.getTopicBudget("comparison");
  const mentioned = service.getMentionedTopics(question);
  service.lastComparisonMeta = {
    matchedTopics: mentioned,
    matchedTopicLabels: mentioned.map((topic) => TOPIC_CONFIG[topic]?.label || topic),
    isPartial: mentioned.length < 2,
  };

  if (mentioned.length === 0) {
    logger.info("比較類問題未識別到已知主題，進行廣泛檢索");
    return await service.handleUnifiedQuery(embedding, null, {
      useBroadSearch: true,
      queryType: "comparison",
      question: "comparison",
    });
  }

  logger.info(
    `比較類問題，依主題檢索: ${mentioned.join(", ")}${
      mentioned.length < 2 ? "（僅部分主題有文檔）" : ""
    }`,
  );

  const allFilenames = [
    ...new Set(mentioned.flatMap((topic) => TOPIC_CONFIG[topic]?.filenames || [])),
  ];
  const allChunks = await queryByFilenames({
    index: service.index,
    embedding,
    filenames: allFilenames,
    topK: comparisonBudget.topK,
    label: "比較查詢",
    logger,
    concurrency: service.config.budgets.byFilenameConcurrency,
  });

  if (allChunks.length < comparisonBudget.minChunks) {
    return await service.handleUnifiedQuery(embedding, null, {
      useBroadSearch: true,
      queryType: "comparison",
      question: "comparison",
    });
  }

  return service.deduplicateAndSort(allChunks, question);
}

module.exports = {
  handleSecurityQuery,
  handleComparisonQuery,
};
