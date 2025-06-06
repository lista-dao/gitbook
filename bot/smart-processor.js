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

  async generateEmbedding(text, inputType = "query") {
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
      // 限制內容長度以控制成本，但保留重要部分
      const truncatedContent = this.smartTruncateContent(content);

      const prompt = `分析以下技術文檔，提取結構化metadata。只返回JSON，不要其他文字。

文檔: ${filename}
內容：
${truncatedContent}

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
        contentLength: truncatedContent.length,
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

  // 智能截取內容，保留重要部分
  smartTruncateContent(content) {
    if (content.length <= 2000) {
      return content;
    }

    // 提取前 1000 字符 + 中間重要部分 + 後 500 字符
    const start = content.substring(0, 1000);
    const end = content.substring(content.length - 500);

    // 尋找中間的重要標題或代碼塊
    const middleMatch = content
      .substring(1000, content.length - 500)
      .match(/(#+\s+.{0,100}|```[\s\S]{0,200}```)/g);

    const middle = middleMatch
      ? "\n\n...(中間內容)...\n" + middleMatch.slice(0, 3).join("\n") + "\n"
      : "\n\n...(省略中間內容)...\n";

    return start + middle + end;
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
      airdrop: /airdrop|空投|token distribution|代幣分發/gi,
      staking: /staking|質押|stake|validator|驗證者/gi,
      lending: /lending|borrowing|借貸|borrow|lend|vault|金庫/gi,
      governance: /governance|治理|voting|投票|proposal|提案/gi,
      contract: /contract|合約|smart contract|智能合約/gi,
      defi: /defi|decentralized finance|去中心化金融/gi,
      bridge: /bridge|跨鏈|cross.?chain/gi,
      swap: /swap|exchange|交換|兌換/gi,
      liquidity: /liquidity|流動性|pool|資金池/gi,
      yield: /yield|farming|挖礦|收益/gi,
    };

    const detectedConcepts = [];
    for (const [concept, pattern] of Object.entries(conceptPatterns)) {
      if (pattern.test(content)) {
        detectedConcepts.push(concept);
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

  buildSmartFilters(question, preferredLang) {
    const questionLower = question.toLowerCase();

    // 基本語言過濾器
    let baseFilter = { language: preferredLang };

    // 1. 優先匹配 LLM 提取的概念和主題
    const llmConceptMapping = {
      airdrop: ["airdrop", "空投", "drop", "claim", "領取", "distribution"],
      staking: ["staking", "質押", "stake", "validator", "驗證", "delegate"],
      lending: ["lending", "借貸", "borrow", "lend", "vault", "collateral"],
      governance: ["governance", "治理", "voting", "投票", "proposal", "dao"],
      contract: ["contract", "合約", "address", "地址", "smart contract"],
      bridge: ["bridge", "跨鏈", "cross-chain", "transfer"],
      swap: ["swap", "exchange", "交換", "trade"],
      yield: ["yield", "farming", "挖礦", "reward", "收益"],
    };

    // 檢測概念匹配
    const matchedConcepts = [];
    for (const [concept, keywords] of Object.entries(llmConceptMapping)) {
      if (keywords.some((keyword) => questionLower.includes(keyword))) {
        matchedConcepts.push(concept);
      }
    }

    if (matchedConcepts.length > 0) {
      // 使用 $or 查詢匹配多個可能的概念字段
      baseFilter.$or = [
        { concepts: { $in: matchedConcepts } }, // 基礎檢測的概念
        { topics: { $in: matchedConcepts } }, // LLM 提取的主題
        { searchable_terms: { $in: matchedConcepts } }, // LLM 提取的搜索詞
      ];
    }

    // 2. 內容類型匹配
    if (
      ["how", "tutorial", "教程", "如何", "怎麼"].some((term) =>
        questionLower.includes(term)
      )
    ) {
      baseFilter.content_type = { $in: ["tutorial", "guide"] };
    }

    if (
      ["api", "reference", "參考", "documentation"].some((term) =>
        questionLower.includes(term)
      )
    ) {
      baseFilter.content_type = { $in: ["reference", "api"] };
    }

    // 3. 內容特徵檢測
    if (
      ["code", "代碼", "example", "示例", "contract"].some((term) =>
        questionLower.includes(term)
      )
    ) {
      baseFilter.has_code = true;
    }

    logger.info("使用增強過濾器", baseFilter);
    return baseFilter;
  }
}

module.exports = SmartProcessor;
