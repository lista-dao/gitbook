const {
  CHAIN_CONSTRAINT_BOOST,
  OBTAIN_TARGET_BOOST,
  ANCHOR_BOOST,
} = require("../../config/rerank-weights");

function computeChainConstraintBoost(chainConstraint, chunk) {
  if (!chainConstraint) return 0;

  const content = (
    chunk.metadata?.chunk_content ||
    chunk.metadata?.content ||
    ""
  ).toLowerCase();
  const heading = (chunk.metadata?.heading || "").toLowerCase();
  const text = `${heading}\n${content}`;

  const mentionsBSC =
    text.includes("bnb smart chain") ||
    text.includes(" bsc") ||
    text.includes("bsc ");
  const mentionsETH = text.includes("ethereum");

  if (chainConstraint === "bsc") {
    if (mentionsBSC && !mentionsETH) return CHAIN_CONSTRAINT_BOOST.exact;
    if (mentionsBSC && mentionsETH) return CHAIN_CONSTRAINT_BOOST.mixed;
    if (mentionsETH && !mentionsBSC) return CHAIN_CONSTRAINT_BOOST.otherChain;
    return 0;
  }

  if (chainConstraint === "ethereum") {
    if (mentionsETH && !mentionsBSC) return CHAIN_CONSTRAINT_BOOST.exact;
    if (mentionsETH && mentionsBSC) return CHAIN_CONSTRAINT_BOOST.mixed;
    if (mentionsBSC && !mentionsETH) return CHAIN_CONSTRAINT_BOOST.otherChain;
    return 0;
  }

  return 0;
}

function computeObtainTargetBoost(obtainTarget, chunk) {
  if (!obtainTarget) return 0;

  const content = (
    chunk.metadata?.chunk_content ||
    chunk.metadata?.content ||
    ""
  ).toLowerCase();

  if (obtainTarget === "slisbnbx") {
    const boostConfig = OBTAIN_TARGET_BOOST.slisbnbx;
    const hasTarget =
      content.includes("slisbnbx") || content.includes("clisbnb");
    const hasRelatedOnly = content.includes("slisbnb") && !hasTarget;
    const hasDirectPath =
      hasTarget &&
      (content.includes("mint") ||
        content.includes("deposit") ||
        content.includes("provider") ||
        content.includes("lp"));
    const isMostlyOptionFlow =
      content.includes("delegate") &&
      !content.includes("mint") &&
      !content.includes("deposit");
    const isSwapOnly =
      content.includes("swap") &&
      !content.includes("mint") &&
      !content.includes("deposit");

    let boost = 0;
    if (hasTarget) boost += boostConfig.hasTarget;
    if (hasDirectPath) boost += boostConfig.hasDirectPath;
    if (hasRelatedOnly) boost += boostConfig.relatedOnly;
    if (isMostlyOptionFlow) boost += boostConfig.delegateOnly;
    if (isSwapOnly) boost += boostConfig.swapOnly;
    return boost;
  }

  return 0;
}

function computeAnchorBoost(question, chunk) {
  const q = (question || "").toLowerCase();
  const filename = (chunk.metadata?.filename || "").toLowerCase();
  const content = (
    chunk.metadata?.chunk_content ||
    chunk.metadata?.content ||
    ""
  ).toLowerCase();

  let boost = 0;

  if (
    q.includes("rwa") &&
    (q.includes("where do") || q.includes("come from") || q.includes("source"))
  ) {
    if (
      content.includes("centrifuge") ||
      content.includes("janus henderson anemoy treasury fund") ||
      content.includes("processed through")
    ) {
      boost += ANCHOR_BOOST.rwaSource;
    }
  }

  if (
    q.includes("rwa") &&
    (q.includes("purchase") ||
      q.includes("purchases") ||
      q.includes("redemption") ||
      q.includes("redeem"))
  ) {
    if (content.includes("purchase order") || content.includes("mint rwa")) {
      boost += ANCHOR_BOOST.rwaMint;
    }
    if (content.includes("burnt to redeem") || content.includes("redemption")) {
      boost += ANCHOR_BOOST.rwaRedeem;
    }
    if (content.includes("centrifuge") || content.includes("anemoy")) {
      boost += ANCHOR_BOOST.rwaPartner;
    }
  }

  if (
    q.includes("minloan") ||
    (q.includes("moolah") &&
      (q.includes("borrow") || q.includes("repay")))
  ) {
    if (
      content.includes("revert") ||
      content.includes("回滚") ||
      content.includes("回滾")
    ) {
      boost += ANCHOR_BOOST.minLoanRevert;
    }
    if (content.includes("minloan")) {
      boost += ANCHOR_BOOST.minLoanMention;
    }
  }

  if (q.includes("smart swap") || q.includes("ultimate guide to smart swap")) {
    if (filename.includes("the ultimate guide to lista smart swap")) {
      boost += ANCHOR_BOOST.smartSwapGuideFile;
    }
  }

  if (q.includes("smart lending") && q.includes("liquidation")) {
    if (
      filename.includes(
        "everything you need to know about liquidation on lista smart lending",
      )
    ) {
      boost += ANCHOR_BOOST.smartLendingLiquidationFile;
    }
  }

  if (q.includes("re7")) {
    if (filename.includes("re7") || content.includes("re7")) {
      boost += ANCHOR_BOOST.re7Mention;
    }
  }

  if (q.includes("mev")) {
    if (content.includes("mev") || filename.includes("mev")) {
      boost += ANCHOR_BOOST.mevMention;
    }
    if (content.includes("mev wbnb vault")) {
      boost += ANCHOR_BOOST.mevWbnbVault;
    }
    if (filename === "for-developer/lista-lending/smart-contract.md") {
      boost += ANCHOR_BOOST.mevSmartContractFile;
    }
  }

  if (q.includes("resilientoracle")) {
    if (content.includes("resilientoracle")) {
      boost += ANCHOR_BOOST.resilientOracleMention;
    }
    if (q.includes("ethereum") && content.includes("ethereum")) {
      boost += ANCHOR_BOOST.resilientOracleChainMatch;
    }
    if (
      (q.includes("bsc") || q.includes("bnb smart chain")) &&
      (content.includes("bnb smart chain") || content.includes("bsc"))
    ) {
      boost += ANCHOR_BOOST.resilientOracleChainMatch;
    }
  }

  return boost;
}

module.exports = {
  computeChainConstraintBoost,
  computeObtainTargetBoost,
  computeAnchorBoost,
};
