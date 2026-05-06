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

// Stage 2: regular-path file selection.
// - Consider up to MAX_CANDIDATE_FILES distinct files from the surviving results
//   (was 3 — too narrow; multi-faceted queries had relevant files dropped).
// - Always return top MAX_SELECTED_FILES (was 1 when avgSim ≥ 0.65, else 2).
// - Reduce tableBonus from 0.3 → 0.05 so it nudges, not dominates: previously a
//   single table-bearing UI walkthrough always beat richer strategy articles.
const FILE_SELECTION = {
  MAX_CANDIDATE_FILES: 5,
  MAX_SELECTED_FILES: 3,
  CHUNKS_PER_FILE: 100, // Pinecone topK; downstream RESPONSE_BUDGETS.maxChunksPerFile caps further
  TABLE_BONUS: 0.05,
  AVG_SCORE_WEIGHT: 0.7,
  CONTENT_LEN_WEIGHT: 0.2,
};

function scoreFile(filename, results) {
  const fileChunks = results.filter((r) => r.metadata.filename === filename);
  const avgScore =
    fileChunks.reduce((sum, c) => sum + c.score, 0) / fileChunks.length;
  const totalContentLength = fileChunks.reduce((sum, c) => {
    const content = c.metadata.chunk_content || c.metadata.content || "";
    return sum + content.length;
  }, 0);
  const hasTable = fileChunks.some((c) => {
    const content = c.metadata.chunk_content || c.metadata.content || "";
    return (
      (content.includes("|") && content.includes("|-")) || c.metadata.has_tables
    );
  });
  const normalizedLen = Math.min(totalContentLength / 1000, 1);
  const composite =
    avgScore * FILE_SELECTION.AVG_SCORE_WEIGHT +
    normalizedLen * FILE_SELECTION.CONTENT_LEN_WEIGHT +
    (hasTable ? FILE_SELECTION.TABLE_BONUS : 0);
  return { filename, composite, totalContentLength, avgScore };
}

async function processResults({ index, results, embedding, queryType, logger }) {
  const candidateFiles = [...new Set(results.map((r) => r.metadata.filename))].slice(
    0,
    FILE_SELECTION.MAX_CANDIDATE_FILES,
  );

  if (candidateFiles.length === 0) {
    logger.info(`無候選文件，返回現有 ${results.length} 個結果`);
    return results;
  }

  const scored = candidateFiles
    .map((filename) => scoreFile(filename, results))
    .sort(
      (a, b) =>
        b.composite - a.composite ||
        b.totalContentLength - a.totalContentLength,
    );

  const selected = scored.slice(0, FILE_SELECTION.MAX_SELECTED_FILES);

  logger.info(`选择前 ${selected.length} 個文件 (queryType=${queryType}):`, {
    files: selected.map(
      (s) =>
        `${s.filename} (composite=${(s.composite * 100).toFixed(1)}%, avg=${(s.avgScore * 100).toFixed(1)}%)`,
    ),
  });

  if (!embedding) {
    logger.info(`無嵌入向量，返回現有 ${results.length} 個結果`);
    return results;
  }

  const allChunks = [];
  for (const { filename } of selected) {
    const fileQuery = await index.query({
      vector: embedding,
      filter: { filename },
      topK: FILE_SELECTION.CHUNKS_PER_FILE,
      includeMetadata: true,
    });
    const fileChunks = sortByChunkIndex(fileQuery.matches);
    allChunks.push(...fileChunks);
  }

  logger.info(
    `檢索到 ${selected.length} 個相關文件，共 ${allChunks.length} 個文檔塊 (${queryType})`,
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
