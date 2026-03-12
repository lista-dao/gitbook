const { RETRIEVAL_BUDGETS } = require("../../config/retrieval-budgets");

function sortByChunkIndex(matches = []) {
  return matches.sort(
    (a, b) => (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
  );
}

async function queryByFilenames({
  index,
  embedding,
  filenames,
  topK = 30,
  label = "查詢",
  logger,
  concurrency = RETRIEVAL_BUDGETS.byFilenameConcurrency,
}) {
  const orderedChunks = new Array(filenames.length).fill(null).map(() => []);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const indexToProcess = cursor;
      cursor += 1;
      if (indexToProcess >= filenames.length) return;

      const filename = filenames[indexToProcess];
      try {
        const res = await index.query({
          vector: embedding,
          filter: { filename },
          topK,
          includeMetadata: true,
        });

        if (res.matches?.length) {
          const sorted = sortByChunkIndex(res.matches);
          orderedChunks[indexToProcess] = sorted;
          logger.info(`${label} ${filename}: 找到 ${sorted.length} 個chunks`);
        }
      } catch (error) {
        logger.warn(`${label} ${filename} 失敗: ${error.message}`);
      }
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, filenames.length));
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  const allChunks = [];
  for (const chunks of orderedChunks) {
    allChunks.push(...chunks);
  }

  return allChunks;
}

async function processResults({ index, results, embedding, queryType, logger }) {
  const candidateFiles = [...new Set(results.map((r) => r.metadata.filename))].slice(
    0,
    3,
  );

  let bestFile = null;
  let bestScore = 0;
  let bestContentLength = 0;

  for (const filename of candidateFiles) {
    const fileChunks = results.filter((r) => r.metadata.filename === filename);
    const avgScore =
      fileChunks.reduce((sum, chunk) => sum + chunk.score, 0) / fileChunks.length;
    const totalContentLength = fileChunks.reduce((sum, chunk) => {
      const content = chunk.metadata.chunk_content || chunk.metadata.content || "";
      return sum + content.length;
    }, 0);

    const hasTable = fileChunks.some((chunk) => {
      const content = chunk.metadata.chunk_content || chunk.metadata.content || "";
      return (
        (content.includes("|") && content.includes("|-")) || chunk.metadata.has_tables
      );
    });

    const normalizedContentScore = Math.min(totalContentLength / 1000, 1);
    const tableBonus = hasTable ? 0.3 : 0;
    const compositeScore = avgScore * 0.6 + normalizedContentScore * 0.2 + tableBonus;

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

  if (!bestFile || !embedding) {
    logger.info(`無最佳文件或嵌入向量，返回現有 ${results.length} 個結果`);
    return results;
  }

  const bestFileChunks = results.filter((r) => r.metadata.filename === bestFile);
  const avgSimilarity =
    bestFileChunks.reduce((sum, chunk) => sum + chunk.score, 0) /
    bestFileChunks.length;

  if (avgSimilarity >= 0.65 && bestContentLength > 100) {
    const fileQuery = await index.query({
      vector: embedding,
      filter: { filename: bestFile },
      topK: 100,
      includeMetadata: true,
    });

    const allChunks = sortByChunkIndex(fileQuery.matches);

    logger.info(`使用單一文件 ${bestFile} 的 ${allChunks.length} 個文檔塊`);
    return allChunks;
  }

  const relevantFiles = candidateFiles.slice(0, 2);
  const allChunks = [];

  for (const filename of relevantFiles) {
    const fileQuery = await index.query({
      vector: embedding,
      filter: { filename },
      topK: 100,
      includeMetadata: true,
    });

    const fileChunks = sortByChunkIndex(fileQuery.matches);

    allChunks.push(...fileChunks);
  }

  logger.info(
    `檢索到 ${relevantFiles.length} 個相關文件，共 ${allChunks.length} 個文檔塊 (${queryType})`,
  );
  return allChunks;
}

function deduplicateAndSort({ allChunks, question = "", rerankFn, logger }) {
  const uniqueChunks = [];
  const seenIds = new Set();

  allChunks.forEach((chunk) => {
    const id = chunk.id || `${chunk.metadata.filename}_${chunk.metadata.chunk_index}`;
    if (!seenIds.has(id)) {
      seenIds.add(id);
      uniqueChunks.push(chunk);
    }
  });

  const sortedChunks = rerankFn(uniqueChunks, question);

  logger.info(`比較查詢: 檢索到 ${sortedChunks.length} 個去重文檔塊`);
  logger.info("涉及的文件:", {
    files: [...new Set(sortedChunks.map((c) => c.metadata.filename))].slice(0, 10),
  });

  if (sortedChunks.length > 0) {
    const top = sortedChunks.slice(0, 3).map((chunk) => ({
      filename: chunk.metadata?.filename,
      score: ((chunk.score || 0) * 100).toFixed(1) + "%",
      rerankScore: ((chunk.rerankScore || 0) * 100).toFixed(1) + "%",
    }));
    logger.info("重排後Top結果:", { top });
  }

  return sortedChunks;
}

module.exports = {
  queryByFilenames,
  processResults,
  deduplicateAndSort,
};
