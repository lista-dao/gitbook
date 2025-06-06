const axios = require("axios");
const winston = require("winston");

// 創建專用的logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "smart-processor" },
  transports: [
    new winston.transports.File({ filename: "logs/smart-processor.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

class SmartProcessor {
  constructor(config) {
    this.config = config || {};
    this.openaiApiUrl = "https://api.openai.com/v1/chat/completions";
  }

  // ===================== 智能 Metadata 提取 =====================

  async extractSmartMetadata(content, filename, detectLanguage) {
    try {
      logger.info(`開始提取 ${filename} 的智能 metadata`);

      // 1. 基礎傳統提取
      const basicMetadata = this.extractBasicMetadata(
        content,
        filename,
        detectLanguage
      );

      // 2. LLM 智能提取
      const llmMetadata = await this.extractLLMMetadata(content);

      // 3. 領域專用提取
      const domainMetadata = this.extractDomainMetadata(content);

      // 4. 合併所有 metadata
      const finalMetadata = {
        ...basicMetadata,
        ...llmMetadata,
        ...domainMetadata,
        extraction_timestamp: new Date().toISOString(),
      };

      logger.info(`${filename} metadata 提取完成:`, {
        keywords: finalMetadata.keywords?.length,
        topics: finalMetadata.topics?.length,
        hasContracts: finalMetadata.has_contracts,
      });

      return finalMetadata;
    } catch (error) {
      logger.error(`${filename} metadata 提取失敗:`, error);
      // 降級到基礎提取
      return this.extractBasicMetadata(content, filename, detectLanguage);
    }
  }

  extractBasicMetadata(content, filename, detectLanguage) {
    const metadata = {
      filename,
      content_length: content.length,
      language: detectLanguage(content),
    };

    // 合約地址檢測
    const contractAddresses = content.match(/0x[a-fA-F0-9]{40}/g) || [];
    metadata.contract_addresses = [...new Set(contractAddresses)];
    metadata.has_contracts = contractAddresses.length > 0;

    // 數字和百分比檢測
    const percentages = content.match(/\d+\.?\d*%/g) || [];
    const largeNumbers = content.match(/\d{1,3}(,\d{3})+/g) || [];
    metadata.has_percentages = percentages.length > 0;
    metadata.has_large_numbers = largeNumbers.length > 0;

    // 文檔結構檢測
    metadata.has_tables = /\|.*\|/.test(content);
    metadata.has_code_blocks = /```/.test(content);
    metadata.has_lists = /^[\s]*[-*+]\s/m.test(content);
    metadata.heading_count = (content.match(/^#+\s/gm) || []).length;

    // 關鍵概念檢測
    const concepts = {
      airdrop: /airdrop|空投|token distribution|代幣分發/gi,
      staking: /staking|質押|stake|validator|驗證者/gi,
      lending: /lending|借貸|borrow|lend|vault|金庫/gi,
      governance: /governance|治理|voting|投票|proposal|提案/gi,
      contract: /contract|合約|smart contract|智能合約/gi,
      oracle: /oracle|預言機|price feed|價格預言機/gi,
      security: /audit|安全|security|漏洞|vulnerability/gi,
    };

    metadata.detected_concepts = [];
    metadata.concept_counts = {};

    for (const [concept, regex] of Object.entries(concepts)) {
      const matches = content.match(regex) || [];
      if (matches.length > 0) {
        metadata.detected_concepts.push(concept);
        metadata.concept_counts[concept] = matches.length;
      }
    }

    // 提取關鍵詞
    metadata.keywords = this.extractContentKeywords(content);

    return metadata;
  }

  async extractLLMMetadata(content) {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn("未設置 OPENAI_API_KEY，跳過 LLM metadata 提取");
      return {};
    }

    try {
      const prompt = `分析以下技術文檔內容，提取結構化metadata。

內容：${content.substring(0, 2000)}

請以JSON格式返回，必須包含這些字段：
{
  "topics": ["主要主題陣列"],
  "entities": ["重要實體名稱"],
  "intent_categories": ["可回答的問題類型"],
  "content_type": "文檔類型",
  "importance_score": 1-10整數,
  "summary": "一句話總結",
  "searchable_terms": ["搜尋關鍵詞陣列"]
}

注意：只返回JSON，不要其他文字。`;

      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 600,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const llmResult = JSON.parse(response.data.choices[0].message.content);
      logger.info("LLM metadata 提取成功");
      return llmResult;
    } catch (error) {
      logger.error("LLM metadata 提取失敗:", error);
      return {};
    }
  }

  extractDomainMetadata(content) {
    const metadata = {};

    // DeFi 協議檢測
    const protocols = [
      "lista",
      "pancakeswap",
      "uniswap",
      "compound",
      "aave",
      "binance",
    ];
    metadata.protocols = protocols.filter((p) =>
      new RegExp(p, "gi").test(content)
    );

    // 代幣檢測
    const tokens = content.match(/[A-Z]{2,10}(?=\s|$|,|\.|:)/g) || [];
    const cryptoTokens = [
      "LISTA",
      "BNB",
      "USDT",
      "USDC",
      "ETH",
      "LISUSD",
      "SLISBNB",
      "CLISBNB",
    ];
    metadata.tokens = [
      ...new Set(tokens.filter((t) => cryptoTokens.includes(t))),
    ];

    // 操作類型檢測
    const operations = {
      mint: /mint|鑄造|生成/gi,
      burn: /burn|銷毀|燃燒/gi,
      swap: /swap|交換|兌換/gi,
      farm: /farm|farming|挖礦|流動性挖礦/gi,
      lock: /lock|鎖定|質押/gi,
    };

    metadata.operations = [];
    for (const [op, regex] of Object.entries(operations)) {
      if (regex.test(content)) {
        metadata.operations.push(op);
      }
    }

    return metadata;
  }

  extractContentKeywords(content) {
    // 提取所有英文單詞和中文詞語
    const englishWords = content.match(/[a-zA-Z]{3,}/g) || [];
    const chineseWords = content.match(/[\u4e00-\u9fff]{2,}/g) || [];

    // 過濾常見停用詞
    const stopWords = [
      "the",
      "and",
      "for",
      "are",
      "but",
      "not",
      "you",
      "all",
      "can",
      "her",
      "was",
      "one",
      "our",
      "had",
      "day",
    ];
    const filteredEnglish = englishWords.filter(
      (word) => !stopWords.includes(word.toLowerCase()) && word.length >= 3
    );

    // 統計詞頻並取前20個
    const wordCount = {};
    [...filteredEnglish, ...chineseWords].forEach((word) => {
      const normalizedWord = word.toLowerCase();
      wordCount[normalizedWord] = (wordCount[normalizedWord] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => word);
  }

  // ===================== 智能分塊策略 =====================

  smartChunking(content, metadata, maxChunkSize = 800) {
    logger.info("開始智能分塊", {
      contentLength: content.length,
      hasTable: metadata.has_tables,
      hasConcepts: metadata.detected_concepts?.length,
    });

    // 選擇分塊策略
    if (metadata.has_tables) {
      return this.tableAwareChunking(content, maxChunkSize);
    } else if (metadata.has_contracts) {
      return this.contractAwareChunking(content, maxChunkSize);
    } else if (metadata.heading_count > 2) {
      return this.headingBasedChunking(content, maxChunkSize);
    } else {
      return this.semanticChunking(content, maxChunkSize);
    }
  }

  tableAwareChunking(content, maxChunkSize) {
    const chunks = [];
    const lines = content.split("\n");
    let currentChunk = "";
    let inTable = false;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 檢測表格開始
      if (line.includes("|") && !inTable) {
        // 保存當前塊（如果有內容）
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            index: chunkIndex++,
            type: "text",
            start_line: Math.max(0, i - currentChunk.split("\n").length),
          });
          currentChunk = "";
        }
        inTable = true;
      }

      currentChunk += line + "\n";

      // 檢測表格結束
      if (inTable && (!line.includes("|") || i === lines.length - 1)) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          type: "table",
          start_line: i - currentChunk.split("\n").length + 1,
        });
        currentChunk = "";
        inTable = false;
      }

      // 普通分塊邏輯
      if (!inTable && currentChunk.length > maxChunkSize) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          type: "text",
          start_line: Math.max(0, i - currentChunk.split("\n").length),
        });
        currentChunk = "";
      }
    }

    // 處理最後一塊
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        type: "text",
        start_line: lines.length - currentChunk.split("\n").length,
      });
    }

    logger.info(`表格感知分塊完成: ${chunks.length} 塊`, {
      tables: chunks.filter((c) => c.type === "table").length,
      text: chunks.filter((c) => c.type === "text").length,
    });

    return chunks;
  }

  contractAwareChunking(content, maxChunkSize) {
    const chunks = [];
    const contractPattern = /0x[a-fA-F0-9]{40}/g;
    let chunkIndex = 0;

    // 找到所有合約地址的位置
    const contractMatches = [...content.matchAll(contractPattern)];

    if (contractMatches.length === 0) {
      return this.semanticChunking(content, maxChunkSize);
    }

    let lastIndex = 0;

    for (const match of contractMatches) {
      const contractIndex = match.index;

      // 找到合約地址前後的上下文
      const contextStart = Math.max(0, contractIndex - 200);
      const contextEnd = Math.min(content.length, contractIndex + 200);

      // 添加合約地址前的內容
      if (contractIndex > lastIndex + maxChunkSize) {
        const beforeContent = content.slice(lastIndex, contextStart);
        if (beforeContent.trim()) {
          chunks.push({
            content: beforeContent.trim(),
            index: chunkIndex++,
            type: "text",
            has_contracts: false,
          });
        }
      }

      // 添加包含合約地址的塊
      const contractChunk = content.slice(contextStart, contextEnd);
      chunks.push({
        content: contractChunk.trim(),
        index: chunkIndex++,
        type: "contract",
        has_contracts: true,
        contract_address: match[0],
      });

      lastIndex = contextEnd;
    }

    // 添加最後剩餘的內容
    if (lastIndex < content.length) {
      const remainingContent = content.slice(lastIndex);
      if (remainingContent.trim()) {
        chunks.push({
          content: remainingContent.trim(),
          index: chunkIndex++,
          type: "text",
          has_contracts: false,
        });
      }
    }

    logger.info(`合約感知分塊完成: ${chunks.length} 塊`, {
      contracts: chunks.filter((c) => c.type === "contract").length,
    });

    return chunks;
  }

  headingBasedChunking(content, maxChunkSize) {
    const chunks = [];
    const lines = content.split("\n");
    let currentChunk = "";
    let currentHeading = "";
    let chunkIndex = 0;

    for (const line of lines) {
      // 檢測標題
      const headingMatch = line.match(/^(#+)\s+(.+)$/);

      if (headingMatch) {
        // 保存前一個區塊
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            index: chunkIndex++,
            type: "section",
            heading: currentHeading,
            heading_level: currentHeading.split("#").length - 1,
          });
        }

        currentHeading = headingMatch[2];
        currentChunk = line + "\n";
      } else {
        currentChunk += line + "\n";

        // 如果塊太大，按段落分割
        if (currentChunk.length > maxChunkSize) {
          const paragraphs = currentChunk.split("\n\n");
          if (paragraphs.length > 1) {
            // 保存前面的段落
            const saveContent = paragraphs.slice(0, -1).join("\n\n");
            chunks.push({
              content: saveContent.trim(),
              index: chunkIndex++,
              type: "section",
              heading: currentHeading,
              partial: true,
            });
            currentChunk = paragraphs[paragraphs.length - 1] + "\n";
          }
        }
      }
    }

    // 處理最後一塊
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        type: "section",
        heading: currentHeading,
      });
    }

    logger.info(`標題感知分塊完成: ${chunks.length} 塊`);
    return chunks;
  }

  semanticChunking(content, maxChunkSize) {
    const chunks = [];
    const sentences = content.split(/[.!?。！？]\s+/);
    let currentChunk = "";
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const testChunk = currentChunk + sentence + ". ";

      if (testChunk.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          type: "semantic",
        });
        currentChunk = sentence + ". ";
      } else {
        currentChunk = testChunk;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        type: "semantic",
      });
    }

    logger.info(`語義分塊完成: ${chunks.length} 塊`);
    return chunks;
  }

  // ===================== 智能搜索過濾 =====================

  buildSmartFilters(question, preferredLang) {
    const filters = [];
    const questionLower = question.toLowerCase();

    // 1. 精確概念匹配
    const conceptKeywords = {
      airdrop: ["airdrop", "空投"],
      contract: ["contract", "address", "合約", "地址"],
      staking: ["staking", "stake", "質押"],
      lending: ["lending", "borrow", "借貸"],
      governance: ["governance", "voting", "治理", "投票"],
      security: ["audit", "security", "安全", "審計"],
    };

    for (const [concept, keywords] of Object.entries(conceptKeywords)) {
      if (keywords.some((keyword) => questionLower.includes(keyword))) {
        filters.push({
          name: `精確概念匹配: ${concept}`,
          filter: { detected_concepts: { $in: [concept] } },
          topK: 5,
        });
      }
    }

    // 2. 內容特徵匹配
    if (
      questionLower.includes("address") ||
      questionLower.includes("contract") ||
      questionLower.includes("地址")
    ) {
      filters.push({
        name: "合約地址匹配",
        filter: { has_contracts: true },
        topK: 3,
      });
    }

    if (
      questionLower.includes("table") ||
      questionLower.includes("list") ||
      questionLower.includes("表格")
    ) {
      filters.push({
        name: "表格數據匹配",
        filter: { has_tables: true },
        topK: 4,
      });
    }

    // 3. 語言優先匹配
    filters.push({
      name: "語言匹配",
      filter: { language: preferredLang },
      topK: 5,
    });

    // 4. 高重要性內容
    filters.push({
      name: "高重要性內容",
      filter: { importance_score: { $gte: 7 } },
      topK: 3,
    });

    // 5. 如果沒有特定過濾條件，使用寬鬆搜索
    if (filters.length <= 2) {
      filters.push({
        name: "寬鬆搜索",
        filter: {},
        topK: 8,
      });
    }

    return filters.slice(0, 4); // 限制過濾策略數量
  }
}

module.exports = SmartProcessor;
