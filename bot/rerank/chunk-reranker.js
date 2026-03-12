const {
  getQuestionIntent,
  getChainConstraint,
  getObtainTarget,
} = require("./question-intent");
const {
  classifySource,
  getSourceBoost,
  computeLexicalOverlapBoost,
} = require("./source-scoring");
const {
  computeChainConstraintBoost,
  computeObtainTargetBoost,
  computeAnchorBoost,
} = require("./anchor-scoring");

function rerankChunksByIntent(chunks, question) {
  const intent = getQuestionIntent(question);
  const chainConstraint = getChainConstraint(question);
  const obtainTarget = getObtainTarget(question);

  return chunks
    .map((chunk) => {
      const content = chunk.metadata?.chunk_content || chunk.metadata?.content || "";
      const sourceType = classifySource(chunk.metadata?.filename);
      const sourceBoost = getSourceBoost(sourceType, intent);
      const lexicalBoost = computeLexicalOverlapBoost(question, content);
      const anchorBoost = computeAnchorBoost(question, chunk);
      const chainBoost = computeChainConstraintBoost(chainConstraint, chunk);
      const obtainTargetBoost = computeObtainTargetBoost(obtainTarget, chunk);
      const rerankScore =
        (chunk.score || 0) +
        sourceBoost +
        lexicalBoost +
        anchorBoost +
        chainBoost +
        obtainTargetBoost;

      return {
        ...chunk,
        rerankScore,
      };
    })
    .sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));
}

module.exports = {
  rerankChunksByIntent,
};
