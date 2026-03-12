function getQuestionIntent(question) {
  const q = (question || "").toLowerCase();
  const containsAny = (keywords) =>
    keywords.some((keyword) => q.includes(keyword));

  const technicalKeywords = [
    "address",
    "contract",
    "api",
    "base url",
    "oracle",
    "ratio",
    "discount",
    "fee",
    "fees",
    "minloan",
    "lltv",
    "timelock",
    "upgrade",
    "mint",
    "burn",
    "delegat",
    "penalty",
    "blacklist",
    "provider",
    "broker",
    "smart contract",
    "bsc",
    "ethereum address",
  ];

  const guideKeywords = [
    "how do i",
    "how to",
    "how can i",
    "guide",
    "tutorial",
    "step",
    "steps",
    "use",
    "show me",
    "walkthrough",
  ];

  const newsKeywords = [
    "news",
    "update",
    "announcement",
    "recent",
    "latest",
    "regarding",
    "recap",
  ];

  return {
    isTechnical: containsAny(technicalKeywords),
    isGuide: containsAny(guideKeywords),
    isNews: containsAny(newsKeywords),
  };
}

function getChainConstraint(question) {
  const q = (question || "").toLowerCase();
  if (q.includes("bnb smart chain") || q.includes(" bsc") || q.includes("bsc ")) {
    return "bsc";
  }
  if (q.includes("ethereum") || q.includes(" eth ") || q.includes(" ethereu")) {
    return "ethereum";
  }
  return null;
}

function isObtainQuestion(question) {
  const q = (question || "").toLowerCase();
  const obtainKeywords = [
    "how to obtain",
    "how do i get",
    "how to get",
    "ways to get",
    "obtain",
  ];
  return obtainKeywords.some((k) => q.includes(k));
}

function getObtainTarget(question) {
  const q = (question || "").toLowerCase();
  if (!isObtainQuestion(question)) return null;
  if (q.includes("slisbnbx") || q.includes("clisbnb")) return "slisbnbx";
  return null;
}

module.exports = {
  getQuestionIntent,
  getChainConstraint,
  getObtainTarget,
};
