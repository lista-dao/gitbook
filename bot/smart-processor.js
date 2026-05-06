const winston = require("winston");
const axios = require("axios");

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
    this.pinecone = null;
  }

  setPinecone(pinecone) {
    this.pinecone = pinecone;
  }

  async generateEmbedding(text, inputType = "passage") {
    try {
      let embedding;

      if (process.env.OPENAI_API_KEY) {
        embedding = await this.generateOpenAIEmbedding(text);
      } else {
        logger.warn("未設置 OPENAI_API_KEY，使用 Pinecone embedding");
        embedding = await this.generatePineconeEmbedding(text, inputType);
      }

      const expectedDimensions = 1024;
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
          dimensions: 1024,
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

  async extractSmartMetadata(content, filename, detectLanguage) {
    try {
      logger.info(`開始提取 ${filename} 的增強 metadata`);

      const language = detectLanguage(content);

      const basicMetadata = this.extractBasicMetadata(
        content,
        filename,
        language
      );

      let llmMetadata = {};
      if (this.shouldUseLLMExtraction(content)) {
        llmMetadata = await this.extractLLMMetadata(content, filename);
      }

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
      return this.extractBasicMetadata(
        content,
        filename,
        detectLanguage(content)
      );
    }
  }

  shouldUseLLMExtraction(content) {
    const reasons = [];

    if (!process.env.OPENAI_API_KEY) {
      reasons.push("沒有 OPENAI_API_KEY");
      logger.info("跳過 LLM 提取:", reasons.join(", "));
      return false;
    }

    if (content.length < 200) {
      reasons.push(`內容太短 (${content.length} < 200)`);
    }
    if (content.length > 10000) {
      reasons.push(`內容太長 (${content.length} > 10000)`);
    }

    const lines = content.trim().split("\n");
    if (lines.length < 10) {
      reasons.push(`行數太少 (${lines.length} < 10)`);
    }

    if (content.includes("# Table of Contents")) {
      reasons.push("包含目錄");
    }

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
          timeout: 15000,
        }
      );

      const rawContent = response.data.choices[0].message.content.trim();
      logger.info(`OpenAI API 回應成功 (${filename})`, {
        responseLength: rawContent.length,
        preview: rawContent.substring(0, 100),
      });

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

      const validatedResult = this.validateLLMResult(llmResult);

      logger.info(`LLM metadata 提取成功 (${filename})`, {
        topics: validatedResult.topics?.length,
        concepts: validatedResult.concepts?.length,
      });

      return validatedResult;
    } catch (error) {
      logger.error(`LLM metadata 提取失敗 (${filename}):`, {
        error: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack?.split("\n").slice(0, 3).join("\n"),
      });
      return {};
    }
  }

  validateLLMResult(result) {
    const validated = {};

    [
      "topics",
      "concepts",
      "entities",
      "intent_categories",
      "searchable_terms",
    ].forEach((field) => {
      if (Array.isArray(result[field])) {
        validated[field] = result[field].slice(0, 10);
      } else {
        validated[field] = [];
      }
    });

    ["content_type", "summary", "difficulty_level"].forEach((field) => {
      if (typeof result[field] === "string") {
        validated[field] = result[field].substring(0, 200);
      }
    });

    return validated;
  }

  extractBasicMetadata(content, filename, language) {
    const metadata = {
      filename: filename,
      language: language,
      content_length: content.length,
      word_count: content.split(/\s+/).length,

      has_code: /```/.test(content),
      has_links: /\[.*\]\(.*\)/.test(content),
      has_tables: /\|.*\|/.test(content),
      has_lists: /^[\s]*[-*+]\s/m.test(content),

      heading_count: (content.match(/^#+\s/gm) || []).length,
      main_topic: this.extractMainTopic(content, filename),

      concepts: this.extractBasicConcepts(content),

      tokens: this.extractTokens(content),
      protocols: this.extractProtocols(content),

      contract_addresses: this.extractContractAddresses(content),
      has_contracts: /0x[a-fA-F0-9]{40}/.test(content),

      created_at: new Date().toISOString(),
    };

    return metadata;
  }

  extractBasicConcepts(content) {
    const conceptPatterns = {
      airdrop: /airdrop|token distribution|Airdrop|Megadrop|megadrop/gi,
      staking: /staking|stake|validator/gi,
      lending: /lending|borrowing|borrow|lend|vault/gi,
      governance: /governance|voting|proposal/gi,
      contract: /contract|smart contract/gi,
      defi: /defi|decentralized finance/gi,
      bridge: /bridge|cross.?chain/gi,
      swap: /swap|exchange/gi,
      liquidity: /liquidity|pool/gi,
      yield: /yield|farming/gi,
    };

    const detectedConcepts = [];
    for (const [concept, pattern] of Object.entries(conceptPatterns)) {
      if (pattern.test(content)) {
        detectedConcepts.push(concept.toLowerCase());
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

  extractMainTopic(content, filename) {
    const firstHeading = content.match(/^#\s+(.+)$/m);
    if (firstHeading) return firstHeading[1].trim();

    const secondHeading = content.match(/^##\s+(.+)$/m);
    if (secondHeading) return secondHeading[1].trim();

    if (filename) {
      return require("path").basename(
        require("path").basename(filename, ".md")
      );
    }

    return "untitled";
  }

  buildSmartFilters(question) {
    const questionLower = question.toLowerCase();

    const baseFilter = {
      lang: "en",
    };

    const llmConceptMapping = {
      airdrop: [
        "airdrop",
        "drop",
        "claim",
        "distribution",
        "token distribution",
        "megadrop",
      ],
      staking: ["staking", "stake", "validator", "delegate", "delegation"],
      lending: [
        "lending",
        "borrow",
        "lend",
        "vault",
        "collateral",
        "borrowing",
      ],
      smart_lending: [
        "smart lending",
        "smart-lending",
        "smartlending",
        "dex lp",
        "liquidity pool",
        "lp token",
        "impermanent loss",
        "fixed ratio",
        "custom ratio",
      ],
      rwa: [
        "rwa",
        "real-world asset",
        "real world asset",
        "rwamarket",
        "rwa market",
        "treasury",
        "treasury fund",
        "janus henderson",
        "anemoy",
      ],
      governance: ["governance", "voting", "proposal", "dao"],
      contract: ["contract", "address", "smart contract"],
      bridge: ["bridge", "cross-chain", "transfer"],
      swap: ["swap", "exchange", "trade", "trading", "smart swap", "smart-swap"],
      yield: ["yield", "farming", "reward", "rewards"],
    };

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

    if (matchedConcepts.length > 0) {
      baseFilter.$or = [
        { concepts: { $in: matchedConcepts } },
        { topics: { $in: matchedConcepts } },
        { searchable_terms: { $in: matchedConcepts } },
      ];
    }

    // Query-intent signals (how-to / api / code) are NOT applied here as
    // hard Pinecone filters anymore — content_type is too sparse/unreliable
    // to use as a strict include/exclude gate (a single null-typed chunk
    // gets the whole article filtered out). Use getQueryIntentBoosts() to
    // apply them as soft re-ranking boosts after retrieval.

    return baseFilter;
  }

  getQueryIntentBoosts(question) {
    const q = question.toLowerCase();
    const rules = [];

    if (["how", "tutorial", "guide"].some((t) => q.includes(t))) {
      rules.push({
        label: "how-to → guide/tutorial",
        match: (chunk) =>
          ["tutorial", "guide"].includes(chunk.metadata?.content_type),
        boost: 0.05,
      });
    }
    if (["api", "reference", "documentation"].some((t) => q.includes(t))) {
      rules.push({
        label: "ref → reference/api",
        match: (chunk) =>
          ["reference", "api"].includes(chunk.metadata?.content_type),
        boost: 0.05,
      });
    }
    if (["code", "example", "contract"].some((t) => q.includes(t))) {
      rules.push({
        label: "code → has_code",
        match: (chunk) => chunk.metadata?.has_code === true,
        boost: 0.05,
      });
    }
    return rules;
  }

  applyIntentBoosts(chunks, rules) {
    if (!rules || rules.length === 0) return chunks;
    return chunks
      .map((chunk) => {
        const total = rules
          .filter((r) => r.match(chunk))
          .reduce((sum, r) => sum + r.boost, 0);
        return total > 0 ? { ...chunk, score: chunk.score + total } : chunk;
      })
      .sort((a, b) => b.score - a.score);
  }
}

module.exports = SmartProcessor;
