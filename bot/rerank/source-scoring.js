const {
  SOURCE_BOOSTS,
  LEXICAL_BOOST,
} = require("../../config/rerank-weights");

function classifySource(filename) {
  const f = (filename || "").toLowerCase();
  if (f.startsWith("for-developer/")) return "developer";
  if (f.startsWith("introduction/")) return "introduction";
  if (f.startsWith("user-guide/")) return "user";
  if (f.startsWith("governance/")) return "governance";
  if (f.startsWith("security/")) return "security";
  if (f.startsWith("manual/")) return "manual";
  // Legacy manual docs are indexed without a folder prefix.
  return "manual";
}

function getSourceBoost(sourceType, intent) {
  const profile = intent.isNews
    ? SOURCE_BOOSTS.news
    : intent.isTechnical
      ? SOURCE_BOOSTS.technical
      : intent.isGuide
        ? SOURCE_BOOSTS.guide
        : SOURCE_BOOSTS.default;

  return profile[sourceType] ?? profile.default;
}

function computeLexicalOverlapBoost(question, content) {
  if (!question || !content) return 0;

  const stopwords = new Set(LEXICAL_BOOST.stopwords);

  const questionTokens = (question.toLowerCase().match(/[a-z0-9-]+/g) || [])
    .map((t) => t.trim())
    .filter((t) => t.length >= LEXICAL_BOOST.minTokenLength && !stopwords.has(t));

  if (questionTokens.length === 0) return 0;

  const text = content.toLowerCase();
  let overlap = 0;
  for (const token of questionTokens) {
    if (text.includes(token)) overlap++;
  }

  return Math.min(LEXICAL_BOOST.maxBoost, overlap * LEXICAL_BOOST.perTokenBoost);
}

module.exports = {
  classifySource,
  getSourceBoost,
  computeLexicalOverlapBoost,
};
