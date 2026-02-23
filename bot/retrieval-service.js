const winston = require("winston");

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
        // winston.format.prettyPrint({
        //   depth: 4,
        //   colorize: true,
        // })
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
      maxResults: 8,
    };
  }

  async retrieveRelevantChunks(embedding, question) {
    try {
      const smartFilter = this.smartProcessor.buildSmartFilters(question);
      let query = await this.index.query({
        vector: embedding,
        filter: smartFilter,
        topK: this.config.maxResults,
        includeMetadata: true,
      });

      let results = (query.matches || []).filter((chunk) => chunk.score >= 0.5);

      const queryTypeConfig = [
        [this.detectSecurityQuery(question), "security", "handleSecurityQuery"],
        [
          this.detectComparisonQuery(question),
          "comparison",
          "handleComparisonQuery",
        ],
        [
          this.detectSmartLendingQuery(question),
          "smart-lending",
          "handleSmartLendingQuery",
        ],
        [this.detectRWAQuery(question), "rwa", "handleRWAQuery"],
        [this.detectLendingQuery(question), "lending", "handleLendingQuery"],
        [this.detectCDPQuery(question), "cdp", "handleCDPQuery"],
        [this.detectClisBNBQuery(question), "clisbnb", "handleClisBNBQuery"],
        [this.detectVeListaQuery(question), "velista", "handleVeListaQuery"],
      ];
      const matched = queryTypeConfig.find(([ok]) => ok);
      const queryType = matched ? matched[1] : "regular";
      logger.info("檢索結果:", { totalResults: results.length, queryType });

      if (results.length === 0) {
        logger.info(`未找到相似度大於 0.5 的文檔塊`);
        results = (query.matches || []).filter((chunk) => chunk.score >= 0.3);
      }

      if (matched) {
        return await this[matched[2]](results, embedding, question);
      }
      return await this.handleUnifiedQuery(results, embedding, {
        queryType: "regular",
      });
    } catch (error) {
      logger.error("檢索相關內容失敗:", error);
      throw error;
    }
  }

  detectSecurityQuery(question) {
    const securityKeywords = [
      "security",
      "audit",
      "audits",
      "audited",
      "auditing",
      "bug bounty",
      "immunefi",
      "vulnerability",
      "vulnerabilities",
      "safe",
      "safety",
      "protect",
      "protection",
      "secure",
      "multi-signature",
      "multisig",
    ];

    const questionLower = question.toLowerCase();
    return securityKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase()),
    );
  }

  detectComparisonQuery(question) {
    const comparisonKeywords = [
      "difference",
      "differences",
      "compare",
      "comparison",
      "vs",
      "versus",
      "choose",
      "which",
      "better",
      "distinguish",
      "contrast",
    ];

    const questionLower = question.toLowerCase();
    const hasComparisonWords = comparisonKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase()),
    );

    // 检查是否同时提到多个系统 - 排除安全问题
    const hasMultipleSystems =
      questionLower.includes("cdp") &&
      questionLower.includes("lending") &&
      !this.detectSecurityQuery(question); // ✅ 关键修复：排除安全问题

    return hasComparisonWords || hasMultipleSystems;
  }

  detectSmartLendingQuery(question) {
    const questionLower = question.toLowerCase();

    const smartLendingKeywords = [
      "smart lending",
      "smart-lending",
      "smartlending",
      "dex lp",
      "liquidity pool",
      "lp token",
      "impermanent loss",
      "fixed ratio",
      "custom ratio",
      "smart swap",
      "smart-swap",
    ];

    return smartLendingKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase()),
    );
  }

  detectRWAQuery(question) {
    const q = question.toLowerCase();
    const keywords = [
      "rwa",
      "real-world asset",
      "real world asset",
      "rwa market",
      "treasury",
      "treasury fund",
      "janus henderson",
      "anemoy",
      "usdt.treasury",
      "usdt.aaa",
    ];
    return keywords.some((k) => q.includes(k.toLowerCase()));
  }

  detectLendingQuery(question) {
    const questionLower = question.toLowerCase();

    // 排除 Smart Lending 和 RWA
    if (
      this.detectSmartLendingQuery(question) ||
      this.detectRWAQuery(question) ||
      this.detectClisBNBQuery(question) ||
      this.detectVeListaQuery(question)
    ) {
      return false;
    }

    // 明確的 Lista Lending 關鍵詞
    const explicitLendingKeywords = [
      "lista lending",
      "morpho",
      "lltv",
      "liquidation loan-to-value",
      "supplier",
      "borrower",
      "vault manager",
      "interest rate model",
    ];

    if (
      explicitLendingKeywords.some((keyword) =>
        questionLower.includes(keyword.toLowerCase()),
      )
    ) {
      return true;
    }

    const cdpKeywords = [
      "cdp",
      "collateral debt position",
      "lisusd",
      "slisbnb",
    ];
    if (
      cdpKeywords.some((keyword) =>
        questionLower.includes(keyword.toLowerCase()),
      )
    ) {
      return false;
    }

    // 通用關鍵詞，但只有在沒有 CDP 上下文時才識別為 lending
    const generalLendingKeywords = [
      "lending",
      "flash loan",
      "market",
      "oracle price feed",
    ];

    return generalLendingKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase()),
    );
  }

  detectCDPQuery(question) {
    const questionLower = question.toLowerCase();

    if (this.detectComparisonQuery(question)) {
      return false;
    }

    if (
      this.detectClisBNBQuery(question) ||
      this.detectVeListaQuery(question)
    ) {
      return false;
    }

    const cdpKeywords = [
      "cdp",
      "collateral debt position",
      "lisusd",
      "slisbnb",
      "bnb validator",
      "liquid staking",
      "staking",
      "mcr",
      "minimum collateral ratio",
      "dutch auction",
      "borrowing fee",
      "stability fee",
    ];

    return cdpKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase()),
    );
  }

  // Covers both legacy name (clisBNB) and new name (slisBNBx)
  detectClisBNBQuery(question) {
    const questionLower = question.toLowerCase();

    const clisBNBKeywords = [
      "clisbnb",
      "slisbnbx",
      "slisbnb x",
      "pt-clisbnb",
      "yt-clisbnb",
      "pt-slisbnbx",
      "yt-slisbnbx",
      "binance launchpool",
      "launchpool",
      "megadrop",
    ];

    return clisBNBKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase()),
    );
  }

  detectVeListaQuery(question) {
    const questionLower = question.toLowerCase();

    const veListaKeywords = [
      "velista",
      "governance",
      "voting",
      "vote",
      "proposal",
      "snapshot",
      "lock lista",
      "locking lista",
      "unlock lista",
      "early unlock",
      "auto lock",
      "auto-lock",
      "gauge voting",
      "gauge",
      "bribe market",
      "bribe",
      "emission voting",
      "protocol fees",
      "revenue distribution",
      "rebate",
      "borrow rebate",
      "auto compound",
      "auto-compound",
    ];

    return veListaKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase()),
    );
  }

  async handleSecurityQuery(results, embedding, question) {
    logger.info("檢測到安全相關問題，使用專門的安全文檔檢索策略");

    // 专门搜索安全相关文档
    const securityFilenames = [
      "security/audit-reports.md",
      "security/bug-bounty-immunefi.md",
      "securing-the-future-an-in-depth-look-at-lista-daos.md",
    ];

    const allChunks = [];

    // 获取安全相关文档
    for (const filename of securityFilenames) {
      try {
        const securityQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 50,
          includeMetadata: true,
        });

        if (securityQuery.matches && securityQuery.matches.length > 0) {
          const securityChunks = securityQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...securityChunks);
          logger.info(
            `安全查詢 ${filename}: 找到 ${securityChunks.length} 個chunks`,
          );
        }
      } catch (error) {
        logger.warn(`安全查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 如果安全文档没有足够内容，搜索其他包含安全信息的文档
    if (allChunks.length < 3) {
      logger.info("專門安全文檔結果不足，擴大搜索範圍");

      const generalSecurityQuery = await this.index.query({
        vector: embedding,
        topK: 30,
        includeMetadata: true,
      });

      const securityRelatedChunks =
        generalSecurityQuery.matches?.filter((match) => {
          const content = match.metadata.chunk_content || "";
          const filename = match.metadata.filename || "";

          return (
            filename.includes("security") ||
            content.toLowerCase().includes("audit") ||
            content.toLowerCase().includes("security") ||
            content.toLowerCase().includes("immunefi") ||
            content.toLowerCase().includes("bug bounty")
          );
        }) || [];

      allChunks.push(...securityRelatedChunks);
    }

    // 如果还是没有足够内容，進行廣泛檢索
    if (allChunks.length < 3) {
      logger.info("安全相關檢索結果不足，進行廣泛檢索");
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "security",
        question,
      });
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleComparisonQuery(results, embedding) {
    logger.info("檢測到比較類問題，使用專門的CDP vs Lending檢索策略");

    // 專門搜索CDP相關文檔 - 使用具體文件名
    const cdpFilenames = [
      "introduction/collateral-debt-position-lisusd/README.md",
      "for-developer/collateral-debt-position/README.md",
      "for-developer/collateral-debt-position/mechanics.md",
      "user-guide/collateral-debt-position/README.md",
      "introduction/collateral-debt-position-lisusd/collateral/README.md",
      "introduction/collateral-debt-position-lisusd/lisusd/README.md",
      "What makes Lista and lisUSD different.md",
    ];

    // 專門搜索Lending相關文檔
    const lendingFilenames = [
      "introduction/lista-lending/README.md",
      "lista-lending/README.md",
      "introduction/lista-lending/borrowers-and-suppliers.md",
      "introduction/lista-lending/liquidation.md",
      "introduction/lista-lending/markets.md",
      "introduction/lista-lending/user-flow.md",
      "introduction/lista-lending/oracle.md",
      "introduction/lista-lending/interest-rate-model-irm.md",
      "introduction/lista-lending/fees.md",
      "introduction/lista-lending/flash-loan.md",
      "introducing-lista-lending-lista-daos-next-gen-lend.md",
      "product-guide-lista-lending.md",
      "What makes Lista and lisUSD different.md",
    ];

    const allChunks = [];

    // 獲取CDP相關文檔
    for (const filename of cdpFilenames) {
      try {
        const cdpQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 20,
          includeMetadata: true,
        });

        if (cdpQuery.matches && cdpQuery.matches.length > 0) {
          const cdpChunks = cdpQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...cdpChunks);
          logger.info(`CDP查詢 ${filename}: 找到 ${cdpChunks.length} 個chunks`);
        }
      } catch (error) {
        logger.warn(`CDP查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 獲取Lending相關文檔
    for (const filename of lendingFilenames) {
      try {
        const lendingQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 20,
          includeMetadata: true,
        });

        if (lendingQuery.matches && lendingQuery.matches.length > 0) {
          const lendingChunks = lendingQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...lendingChunks);
          logger.info(
            `Lending查詢 ${filename}: 找到 ${lendingChunks.length} 個chunks`,
          );
        }
      } catch (error) {
        logger.warn(`Lending查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 如果專門查詢沒找到足夠內容，進行廣泛檢索
    if (allChunks.length < 5) {
      logger.info("專門查詢結果不足，進行廣泛檢索");
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "comparison",
        question: "comparison",
      });
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleLendingQuery(results, embedding, question) {
    logger.info("檢測到 Lista Lending 相關問題，使用專門的 Lending 檢索策略");

    // 專門搜索 Lista Lending 相關文檔
    const lendingFilenames = [
      "introduction/lista-lending/README.md",
      "lista-lending/README.md",
      "introduction/lista-lending/liquidation.md",
      "introduction/lista-lending/markets.md",
      "introduction/lista-lending/borrowers-and-suppliers.md",
      "introduction/lista-lending/user-flow.md",
      "introduction/lista-lending/oracle.md",
      "introduction/lista-lending/interest-rate-model-irm.md",
      "introduction/lista-lending/fees.md",
      "introduction/lista-lending/flash-loan.md",
      "introduction/lista-lending/vaults/README.md",
      "introduction/lista-lending/vaults/how-to-create-a-vault.md",
      "introducing-lista-lending-lista-daos-next-gen-lend.md",
      "product-guide-lista-lending.md",
      "product-update-lista-lending-vault-manager-gui.md",
      "product-update-lista-lending-alpha-zone-powering-t.md",
      "product-update-introducing-lista-daos-liquidation-.md",
      "product-update-mint-clisbnb-in-lista-lending.md",
      "Guide Running Lista's Liquidation bot.md",
      "Product Guide Borrowing USD1 on Lista Lending.md",
      "Product Guide Lista Lending.md",
      "Product Update Lista Lending Vault Manager GUI.md",
    ];

    const allChunks = [];

    // 獲取 Lista Lending 相關文檔
    for (const filename of lendingFilenames) {
      try {
        const lendingQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 30,
          includeMetadata: true,
        });

        if (lendingQuery.matches && lendingQuery.matches.length > 0) {
          const lendingChunks = lendingQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...lendingChunks);
          logger.info(
            `Lending查詢 ${filename}: 找到 ${lendingChunks.length} 個chunks`,
          );
        }
      } catch (error) {
        logger.warn(`Lending查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 如果專門查詢沒找到足夠內容，進行更廣泛的檢索
    if (allChunks.length < 3) {
      logger.info("專門 Lending 查詢結果不足，進行廣泛檢索");
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "lending",
        question,
      });
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleSmartLendingQuery(results, embedding, question) {
    logger.info(
      "檢測到 Smart Lending 相關問題，使用專門的 Smart Lending 檢索策略",
    );

    // 專門搜索 Smart Lending 相關文檔
    const smartLendingFilenames = [
      "introduction/smart-lending.md",
      "introduction/smart-lending-and-swap.md",
      "user-guide/smart-lending.md",
      // Manual 文档
      "ListaDAO Smart Lending A Hands-on Tutorial.md",
      "ListaDAO's Smart Lending A Hands-on Tutorial.md",
      "The Ultimate Guide to Lista Smart Swap.md",
      "Everything You Need to Know About Liquidation on Lista Smart Lending.md",
      "Product Guide LP Farming with lisUSD:USD1 on Lista DAO.md",
    ];

    const allChunks = [];

    // 獲取 Smart Lending 相關文檔
    for (const filename of smartLendingFilenames) {
      try {
        const smartLendingQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 30,
          includeMetadata: true,
        });

        if (smartLendingQuery.matches && smartLendingQuery.matches.length > 0) {
          const smartLendingChunks = smartLendingQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...smartLendingChunks);
          logger.info(
            `Smart Lending查詢 ${filename}: 找到 ${smartLendingChunks.length} 個chunks`,
          );
        }
      } catch (error) {
        logger.warn(`Smart Lending查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 如果專門查詢沒找到足夠內容，進行更廣泛的檢索
    if (allChunks.length < 3) {
      logger.info("專門 Smart Lending 查詢結果不足，進行廣泛檢索");
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "smart-lending",
        question,
      });
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleRWAQuery(results, embedding, question) {
    logger.info("檢測到 RWA 相關問題，使用專門的 RWA 檢索策略");

    const rwaFilenames = [
      "introduction/rwa-markets.md",
      "for-developer/rwa/README.md",
      "for-developer/rwa/smart-contract.md",
      "2025-12-26_Lista-DAO-2025-Annual-Report-3e4ff3f5a085.md",
    ];

    const allChunks = [];
    for (const filename of rwaFilenames) {
      try {
        const rwaQuery = await this.index.query({
          vector: embedding,
          filter: { filename },
          topK: 30,
          includeMetadata: true,
        });
        if (rwaQuery.matches?.length) {
          const sorted = rwaQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...sorted);
          logger.info(`RWA查詢 ${filename}: 找到 ${sorted.length} 個chunks`);
        }
      } catch (e) {
        logger.warn(`RWA查詢 ${filename} 失敗: ${e.message}`);
      }
    }

    if (allChunks.length < 3) {
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "rwa",
        question,
      });
    }
    return this.deduplicateAndSort(allChunks);
  }

  async handleCDPQuery(results, embedding, question) {
    logger.info("檢測到 CDP 相關問題，使用專門的 CDP 檢索策略");

    // 專門搜索 CDP 相關文檔 (and comparison: Lista vs lisUSD)
    const cdpFilenames = [
      "introduction/collateral-debt-position-lisusd/README.md",
      "introduction/collateral-debt-position-lisusd/collateral/README.md",
      "introduction/collateral-debt-position-lisusd/collateral/loan-liquidation.md",
      "introduction/collateral-debt-position-lisusd/lisusd/README.md",
      "introduction/collateral-debt-position-lisusd/technical-guide.md",
      "for-developer/collateral-debt-position/README.md",
      "for-developer/collateral-debt-position/mechanics.md",
      "for-developer/collateral-debt-position/flash-loan.md",
      "for-developer/collateral-debt-position/multi-oracle.md",
      "user-guide/collateral-debt-position/README.md",
      "user-guide/collateral-debt-position/borrow-lisusd.md",
      "user-guide/collateral-debt-position/provide-collateral.md",
      "user-guide/collateral-debt-position/repay-lisusd.md",
      "user-guide/collateral-debt-position/withdraw-collateral.md",
      "introduction/liquid-staking-slisbnb/README.md",
      "introduction/liquid-staking-slisbnb/about-slisbnb.md",
      "introduction/liquid-staking-slisbnb/technical-guide.md",
      "product-update-unlocking-velista-utility-introduci.md",
      "Product Guide Looping strategies with lisUSD.md",
    ];

    const allChunks = [];

    // 獲取 CDP 相關文檔
    for (const filename of cdpFilenames) {
      try {
        const cdpQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 30,
          includeMetadata: true,
        });

        if (cdpQuery.matches && cdpQuery.matches.length > 0) {
          const cdpChunks = cdpQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...cdpChunks);
          logger.info(`CDP查詢 ${filename}: 找到 ${cdpChunks.length} 個chunks`);
        }
      } catch (error) {
        logger.warn(`CDP查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 如果專門查詢沒找到足夠內容，進行更廣泛的檢索
    if (allChunks.length < 3) {
      logger.info("專門 CDP 查詢結果不足，進行廣泛檢索");
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "cdp",
        question,
      });
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleClisBNBQuery(results, embedding, question) {
    logger.info(
      "檢測到 clisBNB/slisBNBx 相關問題，使用專門的 clisBNB 檢索策略",
    );

    // 專門搜索 clisBNB/slisBNBx 相關文檔
    const clisBNBFilenames = [
      // 开发者文档
      "for-developer/clisbnb/README.md",
      "for-developer/clisbnb/smart-contract.md",
      // 介绍文档
      "introduction/binance-launchpool-clisbnb/README.md",
      "introduction/binance-launchpool-clisbnb/mint-clisbnb-on-lista-lending.md",
      "introduction/binance-launchpool-clisbnb/minting-clisbnb-with-slisbnb.md",
      // 用户指南
      "user-guide/collateral-debt-position/delegating-clisbnb-to-your-binance-web3-mpc-wallet.md",
      // Medium文章（不带路径前缀）
      "product-update-mint-clisbnb-in-lista-lending.md",
      "product-update-mint-clisbnb-with-bnb-slisbnb-lp-to.md",
      "Pendle Finance Lista DAO Unlocking New Yield Opportunities with clisBNB.md",
      "Product Guide delegating clisBNB.md",
      "Product Guide Earn Binance Launchpool Rewards with USD1 on Lista DAO.md",
      "Product Guide Maximizing Yield with lisUSD and pt-clisBNB.md",
      "Product Guide Participate in Binance Launchpool using slisBNB.md",
      "Product Guide Participate in Binance Launchpool using slisBNB (step-by-step).md",
    ];

    const allChunks = [];

    // 獲取 clisBNB 相關文檔
    for (const filename of clisBNBFilenames) {
      try {
        const clisBNBQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 30,
          includeMetadata: true,
        });

        if (clisBNBQuery.matches && clisBNBQuery.matches.length > 0) {
          const clisBNBChunks = clisBNBQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...clisBNBChunks);
          logger.info(
            `clisBNB查詢 ${filename}: 找到 ${clisBNBChunks.length} 個chunks`,
          );
        }
      } catch (error) {
        logger.warn(`clisBNB查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 如果專門查詢沒找到足夠內容，進行更廣泛的檢索
    if (allChunks.length < 3) {
      logger.info("專門 clisBNB 查詢結果不足，進行廣泛檢索");
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "clisbnb",
        question,
      });
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleVeListaQuery(results, embedding, question) {
    logger.info("檢測到 veLISTA 相關問題，使用專門的 veLISTA 檢索策略");

    // 專門搜索 veLISTA 相關文檔
    const veListaFilenames = [
      // LISTA 治理文档
      "governance/lista/README.md",
      "governance/lista/lista-distribution.md",
      // veLISTA 核心文档
      "governance/velista/README.md",
      "governance/velista/velista-summary.md",
      "governance/velista/lista-dao-unlocking-velista-utility.md",
      "governance/velista/velista-locking-mechanics.md",
      "governance/velista/protocol-fees.md",
      "governance/velista/revenue-cost.md",
      "governance/velista/analytics.md",
      // 治理相关
      "governance/velista/governance/README.md",
      "governance/velista/governance/governance-proposal-template.md",
      // 排放和投票
      "governance/velista/velista-emissions/README.md",
      "governance/velista/velista-emissions/lp-pools.md",
      "governance/velista/gauge-voting-for-velista.md",
      "governance/velista/velista-bribe-market.md",
      // 自动功能
      "governance/velista/auto-compounding.md",
      "governance/velista/permanent-locking-of-lista-lip-016.md",
      // 用户指南
      "user-guide/lista-velista/README.md",
      "user-guide/lista-velista/lock-lista.md",
      "user-guide/lista-velista/extend-lista-lock.md",
      "user-guide/lista-velista/auto-lock.md",
      "user-guide/lista-velista/unlock-lista.md",
      "user-guide/lista-velista/claim-rewards.md",
      "user-guide/lista-velista/staking-external-lp-tokens-on-lista-dao.md",
      "user-guide/lista-velista/gauge-voting.md",
      // 开发者文档
      "for-developer/lista-governance/README.md",
      "for-developer/lista-governance/smart-contract.md",
      // Medium文章（不带路径前缀）
      "product-update-unlocking-velista-utility-introduci.md",
    ];

    const allChunks = [];

    // 獲取 veLISTA 相關文檔
    for (const filename of veListaFilenames) {
      try {
        const veListaQuery = await this.index.query({
          vector: embedding,
          filter: { filename: filename },
          topK: 30,
          includeMetadata: true,
        });

        if (veListaQuery.matches && veListaQuery.matches.length > 0) {
          const veListaChunks = veListaQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
          );
          allChunks.push(...veListaChunks);
          logger.info(
            `veLISTA查詢 ${filename}: 找到 ${veListaChunks.length} 個chunks`,
          );
        }
      } catch (error) {
        logger.warn(`veLISTA查詢 ${filename} 失敗: ${error.message}`);
      }
    }

    // 如果專門查詢沒找到足夠內容，進行更廣泛的檢索
    if (allChunks.length < 3) {
      logger.info("專門 veLISTA 查詢結果不足，進行廣泛檢索");
      return await this.handleUnifiedQuery(embedding, null, {
        useBroadSearch: true,
        queryType: "velista",
        question,
      });
    }

    return this.deduplicateAndSort(allChunks);
  }

  async handleUnifiedQuery(resultsOrEmbedding, embedding = null, options = {}) {
    const {
      queryType = "regular",
      useBroadSearch = false,
      question = "",
    } = options;

    let results;

    // 如果需要廣泛搜索，先進行廣泛檢索
    if (useBroadSearch) {
      logger.info(`進行廣泛檢索 (${queryType})，降低相似度閾值並擴大搜索範圍`);

      const broadQuery = await this.index.query({
        vector: resultsOrEmbedding,
        topK: 50,
        includeMetadata: true,
      });

      const thresholds = [0.3, 0.2];
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
        logger.warn(`廣泛檢索仍未找到足夠結果，返回前 5 個最相似結果`);
        return (broadQuery.matches || []).slice(0, 5);
      }
    } else {
      results = resultsOrEmbedding;
      embedding = embedding || resultsOrEmbedding; // 兼容舊調用
    }

    return await this.processResults(results, embedding, queryType);
  }

  async processResults(results, embedding, queryType) {
    const candidateFiles = [
      ...new Set(results.map((r) => r.metadata.filename)),
    ].slice(0, 3);

    let bestFile = null;
    let bestScore = 0;
    let bestContentLength = 0;

    for (const filename of candidateFiles) {
      const fileChunks = results.filter(
        (r) => r.metadata.filename === filename,
      );
      const avgScore =
        fileChunks.reduce((sum, chunk) => sum + chunk.score, 0) /
        fileChunks.length;
      const totalContentLength = fileChunks.reduce((sum, chunk) => {
        const content =
          chunk.metadata.chunk_content || chunk.metadata.content || "";
        return sum + content.length;
      }, 0);

      const hasTable = fileChunks.some((chunk) => {
        const content =
          chunk.metadata.chunk_content || chunk.metadata.content || "";
        return (
          (content.includes("|") && content.includes("|-")) ||
          chunk.metadata.has_tables
        );
      });

      const normalizedContentScore = Math.min(totalContentLength / 1000, 1);
      const tableBonus = hasTable ? 0.3 : 0;
      const compositeScore =
        avgScore * 0.6 + normalizedContentScore * 0.2 + tableBonus;

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

    // 如果沒有找到最佳文件或 embedding 為空，直接返回現有結果
    if (!bestFile || !embedding) {
      logger.info(`無最佳文件或嵌入向量，返回現有 ${results.length} 個結果`);
      return results;
    }

    const bestFileChunks = results.filter(
      (r) => r.metadata.filename === bestFile,
    );
    const avgSimilarity =
      bestFileChunks.reduce((sum, chunk) => sum + chunk.score, 0) /
      bestFileChunks.length;

    if (avgSimilarity >= 0.65 && bestContentLength > 100) {
      const fileQuery = await this.index.query({
        vector: embedding,
        filter: { filename: bestFile },
        topK: 100,
        includeMetadata: true,
      });

      const allChunks = fileQuery.matches.sort(
        (a, b) => (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
      );

      logger.info(`使用單一文件 ${bestFile} 的 ${allChunks.length} 個文檔塊`);
      return allChunks;
    }

    const relevantFiles = candidateFiles.slice(0, 2);
    const allChunks = [];

    for (const filename of relevantFiles) {
      const fileQuery = await this.index.query({
        vector: embedding,
        filter: { filename: filename },
        topK: 100,
        includeMetadata: true,
      });

      const fileChunks = fileQuery.matches.sort(
        (a, b) => (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0),
      );

      allChunks.push(...fileChunks);
    }

    logger.info(
      `檢索到 ${relevantFiles.length} 個相關文件，共 ${allChunks.length} 個文檔塊 (${queryType})`,
    );
    return allChunks;
  }

  async handleRegularQuery(results, embedding) {
    return await this.handleUnifiedQuery(results, embedding, {
      queryType: "regular",
    });
  }

  async handleBroadSearch(embedding, question, queryType) {
    return await this.handleUnifiedQuery(embedding, null, {
      useBroadSearch: true,
      queryType,
      question,
    });
  }

  deduplicateAndSort(allChunks) {
    // 去重並按相似度排序
    const uniqueChunks = [];
    const seenIds = new Set();

    allChunks.forEach((chunk) => {
      const id =
        chunk.id || `${chunk.metadata.filename}_${chunk.metadata.chunk_index}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueChunks.push(chunk);
      }
    });

    const sortedChunks = uniqueChunks.sort(
      (a, b) => (b.score || 0) - (a.score || 0),
    );

    logger.info(`比較查詢: 檢索到 ${sortedChunks.length} 個去重文檔塊`);
    logger.info("涉及的文件:", {
      files: [...new Set(sortedChunks.map((c) => c.metadata.filename))].slice(
        0,
        10,
      ),
    });

    return sortedChunks;
  }
}

module.exports = RetrievalService;
