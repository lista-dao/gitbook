const SOURCE_BOOSTS = {
  news: {
    manual: 0.16,
    introduction: 0.08,
    developer: 0.04,
    user: 0.04,
    default: 0,
  },
  technical: {
    developer: 0.14,
    introduction: 0.08,
    user: 0.04,
    manual: -0.04,
    default: 0,
  },
  guide: {
    user: 0.12,
    manual: 0.09,
    introduction: 0.08,
    developer: 0.04,
    default: 0,
  },
  default: {
    developer: 0.06,
    introduction: 0.05,
    user: 0.04,
    manual: 0.03,
    default: 0,
  },
};

const LEXICAL_BOOST = {
  maxBoost: 0.12,
  perTokenBoost: 0.02,
  minTokenLength: 4,
  stopwords: [
    "what",
    "where",
    "when",
    "which",
    "with",
    "that",
    "this",
    "from",
    "have",
    "about",
    "into",
    "does",
    "your",
    "how",
    "tell",
    "show",
    "there",
    "regarding",
    "lista",
    "dao",
    "token",
    "tokens",
  ],
};

const CHAIN_CONSTRAINT_BOOST = {
  exact: 0.38,
  mixed: -0.15,
  otherChain: -0.55,
};

const OBTAIN_TARGET_BOOST = {
  slisbnbx: {
    hasTarget: 0.25,
    hasDirectPath: 0.08,
    relatedOnly: -0.28,
    delegateOnly: -0.06,
    swapOnly: -0.1,
  },
};

const ANCHOR_BOOST = {
  rwaSource: 0.2,
  rwaMint: 0.08,
  rwaRedeem: 0.08,
  rwaPartner: 0.06,
  minLoanRevert: 0.16,
  minLoanMention: 0.08,
  smartSwapGuideFile: 0.16,
  smartLendingLiquidationFile: 0.12,
  re7Mention: 0.24,
  mevMention: 0.18,
  mevWbnbVault: 0.22,
  mevSmartContractFile: 0.16,
  resilientOracleMention: 0.5,
  resilientOracleChainMatch: 0.12,
};

module.exports = {
  SOURCE_BOOSTS,
  LEXICAL_BOOST,
  CHAIN_CONSTRAINT_BOOST,
  OBTAIN_TARGET_BOOST,
  ANCHOR_BOOST,
};
