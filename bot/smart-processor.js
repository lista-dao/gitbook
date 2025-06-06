const winston = require("winston");
const axios = require("axios");

// 簡化的智能處理器
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
    this.config = config;
    // 初始化 Pinecone 實例（如果傳入）
    this.pinecone = null;
  }

  // 設置 Pinecone 實例（由 init.js/sync.js/bot.js 傳入）
  setPinecone(pinecone) {
    this.pinecone = pinecone;
  }

  // ===================== 統一 Embedding 生成 =====================

  async generateEmbedding(text, inputType = "passage") {
    try {
      let embedding;

      // 優先使用 OpenAI text-embedding-3-large，效果更好
      if (process.env.OPENAI_API_KEY) {
        embedding = await this.generateOpenAIEmbedding(text);
      } else {
        logger.warn("未設置 OPENAI_API_KEY，使用 Pinecone embedding");
        embedding = await this.generatePineconeEmbedding(text, inputType);
      }

      // 驗證維度
      const expectedDimensions = 1024; // Pinecone multilingual-e5-large 的維度
      if (embedding.length !== expectedDimensions) {
        logger.error(
          `Embedding 維度不匹配: 期望 ${expectedDimensions}，實際 ${embedding.length}`
        );
        throw new Error(
          `Embedding dimension mismatch: expected ${expectedDimensions}, got ${embedding.length}`
        );
      }

      return embedding;
    } catch (error) {
      logger.error("生成嵌入失敗:", error);
      throw error;
    }
  }

  async generateOpenAIEmbedding(text) {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/embeddings",
        {
          model: "text-embedding-3-large",
          input: text,
          dimensions: 1024, // 修改為 1024 維度匹配 Pinecone 索引
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      logger.info(
        `OpenAI embedding 生成成功，維度: ${response.data.data[0].embedding.length}`
      );
      return response.data.data[0].embedding;
    } catch (error) {
      logger.error("OpenAI embedding 失敗:", error);
      // 降級到 Pinecone
      logger.warn("降級使用 Pinecone embedding");
      return await this.generatePineconeEmbedding(text, "passage");
    }
  }

  async generatePineconeEmbedding(text, inputType = "passage") {
    try {
      if (!this.pinecone) {
        throw new Error("Pinecone 實例未設置，請先調用 setPinecone()");
      }

      const response = await this.pinecone.inference.embed(
        "multilingual-e5-large",
        [text],
        { inputType: inputType }
      );
      return response.data[0].values;
    } catch (error) {
      logger.error("Pinecone embedding 失敗:", error);
      throw error;
    }
  }

  // ===================== 增強 Metadata 提取 (恢復 LLM) =====================

  async extractSmartMetadata(content, filename, detectLanguage) {
    try {
      logger.info(`開始提取 ${filename} 的增強 metadata`);

      const language = detectLanguage(content);

      // 1. 基礎檢測 (總是執行)
      const basicMetadata = this.extractBasicMetadata(
        content,
        filename,
        language
      );

      // 2. LLM 增強 (如果可用且有價值)
      let llmMetadata = {};
      if (this.shouldUseLLMExtraction(content)) {
        llmMetadata = await this.extractLLMMetadata(content, filename);
      }

      // 3. 合併結果
      const finalMetadata = {
        ...basicMetadata,
        ...llmMetadata,
        extraction_timestamp: new Date().toISOString(),
      };

      logger.info(`${filename} metadata 提取完成`, {
        language: finalMetadata.language,
        concepts: finalMetadata.concepts?.length || 0,
        topics: finalMetadata.topics?.length || 0,
        hasLLM: !!llmMetadata.topics,
      });

      return finalMetadata;
    } catch (error) {
      logger.error(`提取 ${filename} metadata 失敗:`, error);
      // 降級到基礎提取
      return this.extractBasicMetadata(
        content,
        filename,
        detectLanguage(content)
      );
    }
  }

  // 判斷是否值得使用 LLM 提取
  shouldUseLLMExtraction(content) {
    const reasons = [];

    // 檢查 API Key
    if (!process.env.OPENAI_API_KEY) {
      reasons.push("沒有 OPENAI_API_KEY");
      logger.info("跳過 LLM 提取:", reasons.join(", "));
      return false;
    }

    // 檢查內容長度
    if (content.length < 200) {
      reasons.push(`內容太短 (${content.length} < 200)`);
    }
    if (content.length > 10000) {
      reasons.push(`內容太長 (${content.length} > 10000)`);
    }

    // 檢查內容質量
    const lines = content.trim().split("\n");
    if (lines.length < 10) {
      reasons.push(`行數太少 (${lines.length} < 10)`);
    }

    // 檢查是否是目錄類文件
    if (content.includes("# Table of Contents")) {
      reasons.push("包含目錄");
    }

    // 放寬 README 限制，很多 README 其實有價值
    // 移除: content.includes('README') 的檢查

    if (reasons.length > 0) {
      logger.info("跳過 LLM 提取:", reasons.join(", "));
      return false;
    }

    logger.info("使用 LLM 提取", {
      contentLength: content.length,
      lines: lines.length,
    });
    return true;
  }

  async extractLLMMetadata(content, filename) {
    try {
      const prompt = `分析以下技術文檔，提取結構化metadata。只返回JSON，不要其他文字。

文檔: ${filename}
內容：
${content}

返回JSON格式：
{
  "topics": ["主要主題1", "主要主題2"],
  "concepts": ["技術概念1", "技術概念2"], 
  "entities": ["重要實體1", "重要實體2"],
  "intent_categories": ["教程", "API文檔", "概念說明", "操作指南"],
  "content_type": "文檔類型(如tutorial/reference/guide)",
  "summary": "一句話總結文檔內容",
  "searchable_terms": ["關鍵搜索詞1", "關鍵搜索詞2"],
  "difficulty_level": "beginner/intermediate/advanced"
}`;

      logger.info(`準備調用 OpenAI API (${filename})`, {
        contentLength: content.length,
        hasApiKey: !!process.env.OPENAI_API_KEY,
      });

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
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
          timeout: 15000, // 15秒總超時
        }
      );

      const rawContent = response.data.choices[0].message.content.trim();
      logger.info(`OpenAI API 回應成功 (${filename})`, {
        responseLength: rawContent.length,
        preview: rawContent.substring(0, 100),
      });

      // 嘗試解析 JSON，如果失敗則清理後重試
      let llmResult;
      try {
        llmResult = JSON.parse(rawContent);
      } catch (parseError) {
        logger.warn(`JSON 解析失敗，嘗試清理 (${filename})`, {
          parseError: parseError.message,
          rawContent: rawContent.substring(0, 200),
        });

        // 清理可能的 markdown 格式
        const cleanedContent = rawContent
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        llmResult = JSON.parse(cleanedContent);
      }

      // 驗證和清理結果
      const validatedResult = this.validateLLMResult(llmResult);

      logger.info(`LLM metadata 提取成功 (${filename})`, {
        topics: validatedResult.topics?.length,
        concepts: validatedResult.concepts?.length,
      });

      return validatedResult;
    } catch (error) {
      // 更詳細的錯誤信息
      logger.error(`LLM metadata 提取失敗 (${filename}):`, {
        error: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack?.split("\n").slice(0, 3).join("\n"),
      });
      return {}; // 降級到基礎檢測
    }
  }

  // 驗證 LLM 返回結果
  validateLLMResult(result) {
    const validated = {};

    // 確保必要字段是數組
    [
      "topics",
      "concepts",
      "entities",
      "intent_categories",
      "searchable_terms",
    ].forEach((field) => {
      if (Array.isArray(result[field])) {
        validated[field] = result[field].slice(0, 10); // 限制數量
      } else {
        validated[field] = [];
      }
    });

    // 確保字符串字段
    ["content_type", "summary", "difficulty_level"].forEach((field) => {
      if (typeof result[field] === "string") {
        validated[field] = result[field].substring(0, 200); // 限制長度
      }
    });

    return validated;
  }

  // ===================== 基礎 Metadata 提取 (移除 LLM) =====================

  extractBasicMetadata(content, filename, language) {
    const metadata = {
      filename: filename,
      language: language,
      content_length: content.length,
      word_count: content.split(/\s+/).length,

      // 內容特徵檢測
      has_code: /```/.test(content),
      has_links: /\[.*\]\(.*\)/.test(content),
      has_tables: /\|.*\|/.test(content),
      has_lists: /^[\s]*[-*+]\s/m.test(content),

      // 結構分析
      heading_count: (content.match(/^#+\s/gm) || []).length,
      main_topic: this.extractMainTopic(content),

      // 技術概念檢測 (基礎版)
      concepts: this.extractBasicConcepts(content),

      // 實體提取 (代幣、協議)
      tokens: this.extractTokens(content),
      protocols: this.extractProtocols(content),

      // 合約地址檢測
      contract_addresses: this.extractContractAddresses(content),
      has_contracts: /0x[a-fA-F0-9]{40}/.test(content),

      created_at: new Date().toISOString(),
    };

    return metadata;
  }

  extractBasicConcepts(content) {
    const conceptPatterns = {
      airdrop:
        /airdrop|空投|token distribution|代幣分發|代币分发|Airdrop|Megadrop|megadrop/gi,
      staking: /staking|質押|质押|stake|validator|驗證者|验证者/gi,
      lending: /lending|borrowing|借貸|借贷|borrow|lend|vault|金庫|金库/gi,
      governance: /governance|治理|voting|投票|proposal|提案/gi,
      contract: /contract|合約|合约|smart contract|智能合約|智能合约/gi,
      defi: /defi|decentralized finance|去中心化金融/gi,
      bridge: /bridge|跨鏈|跨链|cross.?chain/gi,
      swap: /swap|exchange|交換|交换|兌換|兑换/gi,
      liquidity: /liquidity|流動性|流动性|pool|資金池|资金池/gi,
      yield: /yield|farming|挖礦|挖矿|收益/gi,
    };

    const detectedConcepts = [];
    for (const [concept, pattern] of Object.entries(conceptPatterns)) {
      if (pattern.test(content)) {
        detectedConcepts.push(concept.toLowerCase()); // 確保概念都是小寫
      }
    }

    return detectedConcepts;
  }

  extractTokens(content) {
    const tokenPatterns = /\b[A-Z]{2,10}\b/g;
    const commonTokens = [
      "LISTA",
      "BNB",
      "USDT",
      "USDC",
      "ETH",
      "LISUSD",
      "SLISBNB",
      "CLISBNB",
    ];
    const tokens = [
      ...new Set(
        (content.match(tokenPatterns) || []).filter((token) =>
          commonTokens.includes(token)
        )
      ),
    ];
    return tokens;
  }

  extractProtocols(content) {
    const protocolPatterns =
      /\b(lista|pancakeswap|uniswap|compound|aave|binance)\b/gi;
    return [
      ...new Set(
        (content.match(protocolPatterns) || []).map((p) => p.toLowerCase())
      ),
    ];
  }

  extractContractAddresses(content) {
    const addresses = content.match(/0x[a-fA-F0-9]{40}/g) || [];
    return [...new Set(addresses)];
  }

  extractMainTopic(content) {
    // 提取第一個 # 標題
    const firstHeading = content.match(/^#\s+(.+)$/m);
    if (firstHeading) return firstHeading[1].trim();

    // 如果沒有，提取第二級標題
    const secondHeading = content.match(/^##\s+(.+)$/m);
    if (secondHeading) return secondHeading[1].trim();

    // 如果都沒有，使用文件名
    return require("path").basename(require("path").basename(filename, ".md"));
  }

  // ===================== 增強搜索過濾器 (利用 LLM metadata) =====================

  buildSmartFilters(question) {
    const questionLower = question.toLowerCase();

    // 動態檢測查詢語言
    const hasChinese = /[\u4e00-\u9fff]/.test(question);
    let baseFilter = {};

    // 如果查詢包含中文，優先搜索中文內容，否則搜索英文
    if (hasChinese) {
      baseFilter.lang = "zh-CN";
    } else {
      baseFilter.lang = "en";
    }

    // 1. 優先匹配 LLM 提取的概念和主題
    const llmConceptMapping = {
      airdrop: [
        "airdrop",
        "空投",
        "drop",
        "claim",
        "distribution",
        "token distribution",
        "megadrop",
        "代幣分發",
        "代币分发",
      ],
      staking: [
        "staking",
        "stake",
        "validator",
        "delegate",
        "delegation",
        "質押",
        "质押",
      ],
      lending: [
        "lending",
        "borrow",
        "lend",
        "vault",
        "collateral",
        "borrowing",
        "借貸",
        "借贷",
      ],
      governance: [
        "governance",
        "voting",
        "proposal",
        "dao",
        "治理",
        "投票",
        "提案",
      ],
      contract: [
        "contract",
        "address",
        "smart contract",
        "合約",
        "合约",
        "智能合約",
        "智能合约",
      ],
      bridge: ["bridge", "cross-chain", "transfer", "跨鏈", "跨链"],
      swap: [
        "swap",
        "exchange",
        "trade",
        "trading",
        "交換",
        "交换",
        "兌換",
        "兑换",
      ],
      yield: ["yield", "farming", "reward", "rewards", "挖礦", "挖矿", "收益"],
    };

    // 檢測概念匹配
    const matchedConcepts = [];
    for (const [concept, keywords] of Object.entries(llmConceptMapping)) {
      if (
        keywords.some((keyword) =>
          questionLower.includes(keyword.toLowerCase())
        )
      ) {
        matchedConcepts.push(concept);
      }
    }

    // 放寬過濾器邏輯，只在有強概念匹配時才添加過濾器
    if (matchedConcepts.length > 0) {
      // 使用更寬鬆的 $or 查詢
      baseFilter.$or = [
        { concepts: { $in: matchedConcepts } }, // 基礎檢測的概念
        { topics: { $in: matchedConcepts } }, // LLM 提取的主題
        { searchable_terms: { $in: matchedConcepts } }, // LLM 提取的搜索詞
      ];
    }

    // 2. 內容類型匹配（簡化）
    if (
      ["how", "tutorial", "guide", "如何", "教程", "指南"].some((term) =>
        questionLower.includes(term)
      )
    ) {
      if (!baseFilter.$or) baseFilter.$or = [];
      baseFilter.$or.push({ content_type: { $in: ["tutorial", "guide"] } });
    }

    if (
      ["api", "reference", "documentation", "文檔", "文档"].some((term) =>
        questionLower.includes(term)
      )
    ) {
      if (!baseFilter.$or) baseFilter.$or = [];
      baseFilter.$or.push({ content_type: { $in: ["reference", "api"] } });
    }

    // 3. 內容特徵檢測（簡化）
    if (
      [
        "code",
        "example",
        "contract",
        "代碼",
        "代码",
        "示例",
        "合約",
        "合约",
      ].some((term) => questionLower.includes(term))
    ) {
      if (!baseFilter.$or) baseFilter.$or = [];
      baseFilter.$or.push({ has_code: true });
    }

    logger.info("使用增強過濾器", {
      lang: baseFilter.lang,
      matchedConcepts,
      hasOrQuery: !!baseFilter.$or,
      orFiltersCount: baseFilter.$or?.length || 0,
    });

    return baseFilter;
  }
}

module.exports = SmartProcessor;
