const { Telegraf } = require("telegraf");
const { Pinecone } = require("@pinecone-database/pinecone");
const { franc } = require("franc");
const axios = require("axios");
const winston = require("winston");
const simpleRateLimiter = require("./simple-rate-limiter");
const SmartProcessor = require("./smart-processor");
// const simpleCostMonitor = require("./simple-cost-monitor");
require("dotenv").config();

// 配置日誌
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "telegram-bot" },
  transports: [
    new winston.transports.File({ filename: "logs/bot.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

class GitBookRAGBot {
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
    this.pinecone = null;
    this.index = null;
    this.embedder = null;

    this.config = {
      indexName: process.env.PINECONE_INDEX_NAME || "gitbook-rag",
      similarityThreshold: 0.5,
      maxResults: 8,
      openaiApiUrl: "https://api.openai.com/v1/chat/completions",
    };

    // 初始化智能處理器
    this.smartProcessor = new SmartProcessor(this.config);

    this.setupBot();
  }

  async initialize() {
    try {
      logger.info("初始化 RAG Bot");

      await this.initializePinecone();
      await this.initializeEmbedder();

      logger.info("RAG Bot 初始化完成");
    } catch (error) {
      logger.error("Bot 初始化失敗:", error);
      throw error;
    }
  }

  async initializePinecone() {
    try {
      if (!process.env.PINECONE_API_KEY) {
        throw new Error("PINECONE_API_KEY 環境變量未設置");
      }

      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      this.index = this.pinecone.index(this.config.indexName);
      logger.info("Pinecone 初始化成功");
    } catch (error) {
      logger.error("Pinecone 初始化失敗:", error);
      throw error;
    }
  }

  async initializeEmbedder() {
    try {
      // 測試 Pinecone Inference API 連接
      await this.pinecone.inference.embed("multilingual-e5-large", ["test"], {
        inputType: "query",
      });
      logger.info("Pinecone Inference API 初始化成功");
    } catch (error) {
      logger.error("Pinecone Inference API 初始化失敗:", error);
      throw error;
    }
  }

  setupBot() {
    // 啟動命令
    this.bot.start((ctx) => {
      const welcomeMessage = `
🤖 歡迎使用 GitBook RAG Bot！

我可以根據 GitBook 內容回答你的問題，支持中英文。

💡 使用方法：
• 直接發送問題即可
• 我會自動檢測語言並回答
• 支持技術文檔相關問題

🔍 功能特點：
• 智能語義檢索
• 中英文雙語支持
• 基於最新文檔內容

試試問我一個問題吧！
      `;

      ctx.reply(welcomeMessage);
      logger.info(`新用戶開始使用: ${ctx.from.id}`);
    });

    // 幫助命令
    this.bot.help((ctx) => {
      const helpMessage = `
📖 GitBook RAG Bot 使用說明

🔍 查詢功能：
• 直接發送問題，我會搜索相關文檔內容
• 自動檢測中文/英文，並用相同語言回答
• 支持技術概念、操作步驟、故障排解等問題

💡 提示：
• 問題越具體，答案越準確
• 可以問關於功能、配置、最佳實踐等
• 如果找不到相關內容，我會告知並建議改進問題

⚠️ 使用限制：
• 每分鐘最多 3 次請求
• 每小時最多 10 次請求
• 每天最多 30 次請求
• 問題長度限制 500 字符

示例問題：
• "如何配置數據庫連接？"
• "What are the deployment options?"
• "最佳的安全實踐是什麼？"
      `;

      ctx.reply(helpMessage);
    });

    // 用戶統計命令（簡化版）
    this.bot.command("stats", (ctx) => {
      const userId = ctx.from.id;

      const statsMessage = `
📊 您的使用統計

🤖 系統狀態：
• 服務狀態：✅ 正常運行
• 用戶 ID：${userId}

⚠️ 使用限制：
• 每分鐘：最多 2 次請求
• 每小時：最多 8 次請求
• 問題長度：最多 500 字符

💡 提示：合理使用可確保更好的服務體驗！
      `;

      ctx.reply(statsMessage);
    });

    // 管理員專用命令（簡化版）
    this.bot.command("admin", async (ctx) => {
      const userId = ctx.from.id;
      const adminIds = (process.env.ADMIN_USER_IDS || "")
        .split(",")
        .map((id) => parseInt(id.trim()));

      if (!adminIds.includes(userId)) {
        await ctx.reply("❌ 您沒有管理員權限");
        return;
      }

      const adminMessage = `
🔧 系統管理面板

📊 系統狀態：
• 狀態：✅ 正常運行
• 時間：${new Date().toLocaleString("zh-TW")}
• 模式：Serverless (Webhook)
• 保護：Rate Limiter Only

⚡ 限制配置：
• 每分鐘：最多 2 次請求
• 每小時：最多 8 次請求  
• 問題長度：最多 500 字符
• 最小間隔：15 秒

如需調整，請修改環境變量配置
      `;

      await ctx.reply(adminMessage);
    });

    // 處理文本消息（簡化版）
    this.bot.on("text", async (ctx) => {
      const question = ctx.message.text;
      const userId = ctx.from.id;
      const username = ctx.from.username || ctx.from.first_name;

      logger.info(`收到問題`, { userId, username, question });

      try {
        // 發送「正在思考」消息
        const thinkingMsg = await ctx.reply("🤔 正在搜索相關內容...");

        // 處理問題（包含速率限制檢查）
        const answer = await this.processQuestion(question, userId);

        // 刪除思考消息並發送答案
        await ctx.deleteMessage(thinkingMsg.message_id);
        await ctx.reply(answer, { parse_mode: "Markdown" });

        logger.info(`回答完成`, {
          userId,
          questionLength: question.length,
          answerLength: answer.length,
        });
      } catch (error) {
        logger.error(`處理問題失敗`, {
          userId,
          question,
          error: error.message,
        });
        await ctx.reply("❌ 抱歉，處理問題時出現錯誤，請稍後再試。");
      }
    });

    // 錯誤處理
    this.bot.catch((err, ctx) => {
      logger.error("Bot 錯誤:", err);
      if (ctx && ctx.reply) {
        ctx.reply("❌ 系統暫時出現問題，請稍後再試。");
      }
    });
  }

  async processQuestion(question, userId) {
    try {
      // 1. 速率限制檢查
      const rateLimitCheck = simpleRateLimiter.checkUserAccess(
        userId,
        question
      );
      if (!rateLimitCheck.allowed) {
        logger.warn(`用戶 ${userId} 被速率限制阻擋: ${rateLimitCheck.reason}`);
        return rateLimitCheck.reason;
      }

      // 2. 成本限制檢查 (暫時註解)
      // const costCheck = simpleCostMonitor.checkCostLimits(
      //   userId,
      //   question.length
      // );
      // if (!costCheck.allowed) {
      //   logger.warn(`用戶 ${userId} 被成本限制阻擋: ${costCheck.reason}`);
      //   return costCheck.reason;
      // }

      // 3. 檢測語言
      const detectedLang = this.detectLanguage(question);
      logger.info(`檢測到語言: ${detectedLang}`);

      // 4. 生成問題嵌入
      const questionEmbedding = await this.generateEmbedding(question);

      // 5. 檢索相關內容
      const relevantChunks = await this.retrieveRelevantChunks(
        questionEmbedding,
        detectedLang,
        question
      );

      if (relevantChunks.length === 0) {
        return this.getNoResultsMessage(detectedLang);
      }

      // 6. 調用 OpenAI API 生成回答
      const answer = await this.generateAnswer(
        question,
        relevantChunks,
        detectedLang
      );

      // 7. 記錄使用情況
      simpleRateLimiter.logUsage(userId, question, 0);
      // simpleCostMonitor.logAPIUsage(userId, {
      //   inputTokens: Math.ceil((question.length + answer.length) / 3),
      //   outputTokens: Math.ceil(answer.length / 3),
      // });

      return answer;
    } catch (error) {
      logger.error("處理問題時出錯:", error);
      throw error;
    }
  }

  detectLanguage(text) {
    try {
      const lang = franc(text);

      // franc 返回 ISO 639-3 代碼，需要轉換
      if (lang === "cmn" || text.match(/[\u4e00-\u9fff]/)) {
        return "zh-CN";
      } else {
        return "en";
      }
    } catch (error) {
      logger.error("語言檢測失敗:", error);
      // 默認根據字符判斷
      return text.match(/[\u4e00-\u9fff]/) ? "zh-CN" : "en";
    }
  }

  async generateEmbedding(text) {
    try {
      // 優先使用 OpenAI embedding，降級到 Pinecone
      if (process.env.OPENAI_API_KEY) {
        return await this.generateOpenAIEmbedding(text);
      } else {
        logger.warn("未設置 OPENAI_API_KEY，使用 Pinecone embedding");
        return await this.generatePineconeEmbedding(text);
      }
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
          dimensions: 1536, // 可調整維度，降低成本可改為 512 或 256
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
      return await this.generatePineconeEmbedding(text);
    }
  }

  async generatePineconeEmbedding(text) {
    try {
      const response = await this.pinecone.inference.embed(
        "multilingual-e5-large",
        [text],
        { inputType: "query" }
      );
      return response.data[0].values;
    } catch (error) {
      logger.error("Pinecone embedding 失敗:", error);
      throw error;
    }
  }

  async retrieveRelevantChunks(embedding, preferredLang, question) {
    try {
      const allChunks = [];

      // 使用智能過濾器
      const smartFilters = this.buildSmartFilters(question, preferredLang);

      // 首先搜索同語言內容
      const sameLanguageQuery = await this.index.query({
        vector: embedding,
        filter: smartFilters,
        topK: this.config.maxResults,
        includeMetadata: true,
      });

      if (sameLanguageQuery.matches) {
        allChunks.push(...sameLanguageQuery.matches);
      }

      // 如果同語言結果不足或相似度太低，補充其他語言
      const highQualityResults = allChunks.filter(
        (match) => match.score >= this.config.similarityThreshold
      );

      if (highQualityResults.length < 2) {
        const otherLang = preferredLang === "zh-CN" ? "en" : "zh-CN";
        const otherLanguageQuery = await this.index.query({
          vector: embedding,
          filter: { lang: otherLang },
          topK: 2,
          includeMetadata: true,
        });

        if (otherLanguageQuery.matches) {
          allChunks.push(...otherLanguageQuery.matches);
        }
      }

      // 按相似度排序並返回前幾個
      const sortedChunks = allChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxResults)
        .filter((chunk) => chunk.score >= 0.3); // 最低相似度閾值

      logger.info(`檢索到 ${sortedChunks.length} 個相關文檔塊`, {
        scores: sortedChunks.map((c) => c.score),
        languages: sortedChunks.map((c) => c.metadata.lang),
      });

      return sortedChunks;
    } catch (error) {
      logger.error("檢索相關內容失敗:", error);
      throw error;
    }
  }

  async generateAnswer(question, relevantChunks, language) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY 環境變量未設置");
      }

      // 構建上下文
      const context = relevantChunks
        .map(
          (chunk) =>
            `**來源：${chunk.metadata.filename}**\n${
              chunk.metadata.chunk_content || chunk.metadata.content
            }`
        )
        .join("\n\n---\n\n");

      // 構建提示詞
      const systemPrompt =
        language === "zh-CN"
          ? `你是一個專業的技術文檔助手。基於提供的 GitBook 文檔內容，用繁體中文回答用戶問題。

要求：
- 直接回答問題，基於提供的上下文
- 保持專業和準確
- 如果上下文不足以回答問題，請說明
- 使用 Telegram 專用 Markdown 格式提升閱讀性：
  • **粗體**：重要概念、標題
  • _斜體_：強調重點
  • \`代碼\`：技術術語、參數、指令
  • \`\`\`代碼塊\`\`\`：多行代碼或配置
  • 🔸 項目符號：列舉要點
  • 📝 數字列表：步驟說明
  • 🎯 表情符號：增加視覺區分
- 如果可能，提供具體的步驟或示例
- 結構化回答：使用標題、列表、分段`
          : `You are a professional technical documentation assistant. Answer user questions based on the provided GitBook documentation content in English.

Requirements:
- Answer directly based on the provided context
- Maintain professional and accurate tone  
- If context is insufficient, please indicate so
- Use Telegram-specific Markdown formatting for better readability:
  • **Bold**: Important concepts, headings
  • _Italic_: Emphasis points
  • \`Code\`: Technical terms, parameters, commands
  • \`\`\`Code blocks\`\`\`: Multi-line code or configurations
  • 🔸 Bullet points: List items
  • 📝 Numbered lists: Step-by-step instructions
  • 🎯 Emojis: Visual distinction
- Provide specific steps or examples when possible
- Structure answers: Use headings, lists, paragraphs`;

      const userPrompt =
        language === "zh-CN"
          ? `基於以下文檔內容回答問題：

**上下文：**
${context}

**問題：**
${question}

請用繁體中文回答：`
          : `Answer the question based on the following documentation:

**Context:**
${context}

**Question:**
${question}

Please answer in English:`;

      const response = await axios.post(
        this.config.openaiApiUrl,
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const answer = response.data.choices[0].message.content;

      // 記錄 OpenAI API 使用
      //   const usage = response.data.usage;
      //   if (usage) {
      //     costMonitor.recordAPIUsage("openai", {
      //       inputTokens: usage.prompt_tokens || 0,
      //       outputTokens: usage.completion_tokens || 0,
      //     });
      //   }

      // 添加來源信息 - 轉換為可點擊的連結
      const sources = [
        ...new Set(relevantChunks.map((c) => c.metadata.filename)),
      ];

      const sourceLinks = sources.map((filename) => {
        // 移除 .md 副檔名並轉換路徑為 URL
        const urlPath = filename.replace(/\.md$/, "");
        const url = `https://docs.bsc.lista.org/${urlPath}`;
        const displayName = filename.replace(/\.md$/, "").split("/").pop();
        return `[${displayName}](${url})`;
      });

      const sourceText =
        language === "zh-CN"
          ? `\n\n📚 **參考來源：** ${sourceLinks.join(", ")}`
          : `\n\n📚 **Sources:** ${sourceLinks.join(", ")}`;

      return answer + sourceText;
    } catch (error) {
      logger.error("生成回答失敗:", error);

      if (error.response) {
        logger.error("OpenAI API 錯誤:", error.response.data);
      }

      throw new Error("無法生成回答，請稍後再試");
    }
  }

  getNoResultsMessage(language) {
    return language === "zh-CN"
      ? `❌ 抱歉，我沒有找到與您問題相關的內容。

💡 建議：
• 嘗試用不同的關鍵詞重新提問
• 確保問題與技術文檔相關
• 可以問得更具體一些

如果問題持續存在，可能是文檔還未涵蓋該主題。`
      : `❌ Sorry, I couldn't find relevant content for your question.

💡 Suggestions:
• Try rephrasing with different keywords
• Make sure the question is related to technical documentation  
• Try to be more specific

If the issue persists, the topic might not be covered in the documentation yet.`;
  }

  // Vercel Webhook 處理
  async handleWebhook(req, res) {
    try {
      await this.bot.handleUpdate(req.body);
      res.status(200).send("OK");
    } catch (error) {
      logger.error("Webhook 處理失敗:", error);
      res.status(500).send("Error");
    }
  }

  // Vercel 函數入口點
  async handler(req, res) {
    try {
      // 初始化 bot（如果還沒初始化）
      if (!this.pinecone) {
        await this.initialize();
      }

      if (req.method === "POST" && req.url === "/webhook") {
        return await this.handleWebhook(req, res);
      } else if (req.method === "GET") {
        res.status(200).json({
          status: "Bot is running!",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch (error) {
      logger.error("Handler 錯誤:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 啟動 Bot（開發模式）
  async startPolling() {
    try {
      await this.initialize();
      await this.bot.launch();
      logger.info("Bot 啟動成功（輪詢模式）");

      // 優雅關閉
      process.once("SIGINT", () => this.bot.stop("SIGINT"));
      process.once("SIGTERM", () => this.bot.stop("SIGTERM"));
    } catch (error) {
      logger.error("Bot 啟動失敗:", error);
      throw error;
    }
  }

  // 設置 Webhook（生產模式）
  async setWebhook(webhookUrl) {
    try {
      await this.bot.telegram.setWebhook(webhookUrl);
      logger.info(`Webhook 設置成功: ${webhookUrl}`);
    } catch (error) {
      logger.error("Webhook 設置失敗:", error);
      throw error;
    }
  }

  // ===================== 智能搜索過濾（檢索時使用） =====================

  buildSmartFilters(question, preferredLang) {
    return this.smartProcessor.buildSmartFilters(question, preferredLang);
  }
}

// 導出用於 Vercel
const botInstance = new GitBookRAGBot();

// Vercel API 處理函數
module.exports = async (req, res) => {
  if (req.method === "POST") {
    await botInstance.initialize();
    await botInstance.handleWebhook(req, res);
  } else {
    res.status(200).json({ status: "GitBook RAG Bot is running" });
  }
};

// 如果直接運行（開發模式）
if (require.main === module) {
  botInstance.startPolling().catch(console.error);
}

module.exports.GitBookRAGBot = GitBookRAGBot;
