const RETRIEVAL_BUDGETS = {
  byFilenameConcurrency: 6,
  regular: {
    topK: 8,
    highThreshold: 0.5,
    lowThreshold: 0.3,
  },
  broadSearch: {
    topK: 50,
    thresholds: [0.3, 0.2],
    fallbackTopResults: 5,
  },
  topicDefaults: {
    topK: 30,
    minChunks: 3,
  },
  topicOverrides: {
    security: {
      topK: 50,
      minChunks: 3,
      generalTopK: 30,
    },
    comparison: {
      topK: 20,
      minChunks: 5,
    },
  },
};

const RESPONSE_BUDGETS = {
  maxContextLength: 20000,
  maxChunks: 15,
  maxChunksPerFile: 3,
  maxChunksPerTopic: 4,
  maxSourceLinks: 6,
};

module.exports = {
  RETRIEVAL_BUDGETS,
  RESPONSE_BUDGETS,
};
