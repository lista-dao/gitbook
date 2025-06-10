const { Telegraf } = require("telegraf");
const { Pinecone } = require("@pinecone-database/pinecone");
const { franc } = require("franc");
const axios = require("axios");
const winston = require("winston");
const simpleRateLimiter = require("./simple-rate-limiter");
const SmartProcessor = require("./smart-processor");
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
    this.bot = null;
    this.pinecone = null;
    this.index = null;
    this.embedder = null;
    this.botInfo = null;

    this.config = {
      indexName: process.env.PINECONE_INDEX_NAME || "gitbook-rag",
      similarityThreshold: 0.6,
      maxResults: 6,
      openaiApiUrl: "https://api.openai.com/v1/chat/completions",
    };

    // 初始化智能處理器
    this.smartProcessor = new SmartProcessor(this.config);
  }

  async initialize() {
    try {
      logger.info("開始初始化 RAG Bot...");

      // 初始化 Bot
      this.bot = new Telegraf(process.env.BOT_TOKEN);

      // 獲取bot信息
      this.botInfo = await this.bot.telegram.getMe();
      logger.info("Bot信息獲取成功", {
        id: this.botInfo.id,
        username: this.botInfo.username,
        first_name: this.botInfo.first_name,
      });

      // 初始化其他組件
      await this.initializePinecone();
      await this.initializeEmbedder();

      logger.info("RAG Bot 初始化完成");
    } catch (error) {
      logger.error("Bot 初始化失败:", error);
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

      this.smartProcessor.setPinecone(this.pinecone);

      logger.info("Pinecone 初始化成功");
    } catch (error) {
      logger.error("Pinecone 初始化失败:", error);
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
      logger.error("Pinecone Inference API 初始化失败:", error);
      throw error;
    }
  }

  setupBot() {
    this.bot.on("text", async (ctx) => {
      const question = ctx.message.text;
      const userId = ctx.from.id;
      const username = ctx.from.username || ctx.from.first_name;
      const chatType = ctx.chat.type;
      const chatId = ctx.chat.id;

      // 檢查群組白名單
      if (!this.isAllowedChat(chatId, chatType)) {
        logger.info(`拒絕未授權群組的請求`, { chatId, chatType });
        return;
      }

      // 檢查是否需要響應
      const shouldRespond = this.shouldRespondToMessage(ctx);
      if (!shouldRespond) {
        return; // 在群組中未被@，不響應
      }

      // 清理問題文本（移除@bot的部分）
      const cleanQuestion = this.cleanQuestion(question);

      if (!cleanQuestion) {
        return; // 如果清理後沒有內容，不響應
      }

      logger.info(`收到問題: ${cleanQuestion}`, { userId, chatType });

      try {
        // 檢測語言並顯示對應的加載消息
        const detectedLang = this.detectLanguage(cleanQuestion);
        const loadingMessage =
          detectedLang === "zh-CN"
            ? "🤔 正在搜索相關內容..."
            : "🤔 Searching relevant content...";

        const thinkingMsg = await ctx.reply(loadingMessage);

        // 處理問題（包含速率限制檢查）
        const userInfo = {
          id: userId,
          username: ctx.from.username,
          first_name: ctx.from.first_name,
        };
        const answer = await this.processQuestion(cleanQuestion, userInfo);

        // 刪除思考消息並發送答案
        await ctx.deleteMessage(thinkingMsg.message_id);
        await ctx.reply(answer, { parse_mode: "Markdown" });

        logger.info(`回答完成`, { userId, answerLength: answer.length });
      } catch (error) {
        logger.error(`處理問題失敗: ${error.message}`, { userId });

        const errorMessage =
          this.detectLanguage(cleanQuestion) === "zh-CN"
            ? "❌ 抱歉，處理問題時出現錯誤，請稍後再試。"
            : "❌ Sorry, an error occurred while processing your question. Please try again later.";

        await ctx.reply(errorMessage);
      }
    });

    this.bot.catch((err, ctx) => {
      logger.error("Bot 錯誤:", err);
      if (ctx && ctx.reply) {
        ctx.reply("❌ System Error.");
      }
    });
  }

  async processQuestion(question, userInfo) {
    try {
      //   const rateLimitCheck = simpleRateLimiter.checkUserAccess(
      //     userId,
      //     question
      //   );
      //   if (!rateLimitCheck.allowed) {
      //     logger.warn(`用戶 ${userId} 被速率限制阻擋: ${rateLimitCheck.reason}`);
      //     return rateLimitCheck.reason;
      //   }

      const detectedLang = this.detectLanguage(question);
      logger.info(`檢測到語言: ${detectedLang}`);

      let searchQuestion = question;
      if (detectedLang === "zh-CN") {
        searchQuestion = await this.translateToEnglish(question);
        logger.info(`翻譯結果: ${searchQuestion}`);
      }

      const questionEmbedding = await this.smartProcessor.generateEmbedding(
        searchQuestion,
        "passage"
      );

      const relevantChunks = await this.retrieveRelevantChunks(
        questionEmbedding,
        searchQuestion
      );

      if (relevantChunks.length === 0) {
        return this.getNoResultsMessage(detectedLang);
      }

      const answer = await this.generateAnswer(
        question,
        relevantChunks,
        detectedLang
      );

      simpleRateLimiter.logUsage(userInfo.id, question, 0);

      return answer;
    } catch (error) {
      logger.error("處理問題時出錯:", error);
      throw error;
    }
  }

  detectLanguage(text) {
    try {
      const lang = franc(text);

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

  async retrieveRelevantChunks(embedding, question) {
    try {
      const smartFilter = this.buildSmartFilters(question);
      let query = await this.index.query({
        vector: embedding,
        filter: smartFilter,
        topK: this.config.maxResults,
        includeMetadata: true,
      });

      const results = (query.matches || []).filter(
        (chunk) => chunk.score >= 0.6
      );
      logger.info(`score 0.5 檢索到 ${results.length} 個相關文檔塊`);
      if (results.length > 0) {
        const relevantFiles = [
          ...new Set(results.map((r) => r.metadata.filename)),
        ].slice(0, 2);

        const allChunks = [];

        for (const filename of relevantFiles) {
          const fileFilter = {
            filename: filename,
          };

          const fileQuery = await this.index.query({
            vector: embedding,
            filter: fileFilter,
            topK: 100,
            includeMetadata: true,
          });

          const fileChunks = fileQuery.matches.sort(
            (a, b) =>
              (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0)
          );

          allChunks.push(...fileChunks);
        }

        logger.info(
          `檢索到 ${relevantFiles.length} 個相關文件，共 ${allChunks.length} 個文檔塊`
        );
        return allChunks;
      }

      logger.info(`未找到相似度大於 0.6 的文檔塊`);

      const fallbackResults = (query.matches || []).filter(
        (chunk) => chunk.score >= 0.3
      );

      if (fallbackResults.length > 0) {
        const filename = fallbackResults[0].metadata.filename;
        const fileFilter = {
          filename: filename,
        };

        const fileQuery = await this.index.query({
          vector: embedding,
          filter: fileFilter,
          topK: 100,
          includeMetadata: true,
        });

        const allChunks = fileQuery.matches.sort(
          (a, b) =>
            (a.metadata.chunk_index || 0) - (b.metadata.chunk_index || 0)
        );

        logger.info(
          `使用降低的相似度閾值找到文件 ${filename} 的 ${allChunks.length} 個文檔塊`
        );
        return allChunks;
      }

      return [];
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

      // 添加调试日志
      logger.info("传递给GPT的完整上下文:", {
        chunkCount: relevantChunks.length,
        contextLength: context.length,
        context: context.substring(0, 1000) + "...", // 只显示前1000字符
      });

      // 構建提示詞
      const systemPrompt =
        language === "zh-CN"
          ? `你是一個專業的技術文檔助手。基於提供的 GitBook 文檔內容，用繁體中文回答用戶問題。

要求：
- 直接回答問題，基於提供的上下文
- 保持專業和準確
- 如果上下文不足以回答問題，請說明
- **特別注意：如果文檔中包含表格數據，務必完整提取和使用**
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
- **Pay special attention: If the document contains table data, be sure to extract and use it completely**
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
          ? `基於以下文檔內容回答問題。**如果文檔中有表格或列表，請完整引用所有數據**：

**上下文：**
${context}

**問題：**
${question}

請用繁體中文回答，確保包含所有相關數據：`
          : `Answer the question based on the following documentation. **If there are tables or lists in the document, please quote all data completely**:

**Context:**
${context}

**Question:**
${question}

Please answer in English, ensuring all relevant data is included:`;

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
          timeout: 15000,
        }
      );

      const answer = response.data.choices[0].message.content;

      const sources = [
        ...new Set(relevantChunks.map((c) => c.metadata.filename)),
      ];

      const sourceLinks = sources
        .filter(
          (filename) =>
            !filename.includes("README") && !filename.includes("SUMMARY")
        )
        .map((filename) => {
          // 移除 .md 副檔名並轉換路徑為 URL
          const urlPath = filename.replace(/\.md$/, "");
          const url = `https://docs.bsc.lista.org/${urlPath}`;
          const displayName = filename.replace(/\.md$/, "").split("/").pop();
          return `[${displayName}](${url})`;
        });

      const sourceText =
        language === "zh-CN"
          ? `\n\n📚 **参考来源：** ${sourceLinks.join(", ")}`
          : `\n\n📚 **Sources:** ${sourceLinks.join(", ")}`;

      return answer + sourceText;
    } catch (error) {
      logger.error("生成回答失败:", error);

      if (error.response) {
        logger.error("OpenAI API 错误:", error.response.data);
      }

      throw new Error("无法生成回答，请稍后再试");
    }
  }

  getNoResultsMessage(language) {
    return language === "zh-CN"
      ? `❌ 抱歉，我没有找到与您问题相关的内容。

💡 建议：
• 尝试用不同的关键词重新提问
• 确保问题与技术文档相关
• 可以问得更具体一些

如果问题持续存在，可能是文档还未涵盖该主题。`
      : `❌ Sorry, I couldn't find relevant content for your question.

💡 Suggestions:
• Try rephrasing with different keywords
• Make sure the question is related to technical documentation  
• Try to be more specific

If the issue persists, the topic might not be covered in the documentation yet.`;
  }

  // 啟動 Bot（生產模式 - 支持 PM2）
  async startPolling() {
    try {
      await this.initialize();
      this.setupBot();
      await this.bot.launch();
      logger.info("Bot 啟動成功（輪詢模式）");

      // PM2 信號處理
      this.setupProcessSignals();

      logger.info("Bot 初始化完成，等待消息...");
    } catch (error) {
      logger.error("Bot 啟動失敗:", error);
      process.exit(1);
    }
  }

  // 設置進程信號處理（PM2 支持）
  setupProcessSignals() {
    const gracefulShutdown = async (signal) => {
      logger.info(`收到 ${signal} 信號，開始關閉...`);

      try {
        if (this.bot) {
          await this.bot.stop(signal);
          logger.info("Telegram Bot 已停止");
        }

        // 等待正在處理的請求完成
        await new Promise((resolve) => setTimeout(resolve, 1000));

        process.exit(0);
      } catch (error) {
        logger.error("關閉過程中出錯:", error);
        process.exit(1);
      }
    };

    // PM2 信號處理
    process.once("SIGINT", () => gracefulShutdown("SIGINT"));
    process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("message", (msg) => {
      if (msg === "shutdown") {
        gracefulShutdown("PM2_SHUTDOWN");
      }
    });

    // 未捕獲異常處理
    process.on("uncaughtException", (error) => {
      logger.error("未捕獲的異常:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("未處理的 Promise 拒絕:", { reason, promise });
      gracefulShutdown("UNHANDLED_REJECTION");
    });
  }

  buildSmartFilters(question) {
    return this.smartProcessor.buildSmartFilters(question);
  }

  async translateToEnglish(chineseQuestion) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        logger.warn("未設置 OPENAI_API_KEY，跳過翻譯");
        return chineseQuestion;
      }

      const response = await axios.post(
        this.config.openaiApiUrl,
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `你是一个专业的翻译助手。请将用户的中文问题准确翻译成英文，保持技术术语的准确性。
              
要求：
- 保持原意不变
- 技术术语使用标准英文
- 简洁明了
- 只返回翻译结果，不要其他内容`,
            },
            {
              role: "user",
              content: chineseQuestion,
            },
          ],
          temperature: 0.1,
          max_tokens: 200,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10秒超时
        }
      );

      const translatedQuestion =
        response.data.choices[0].message.content.trim();
      return translatedQuestion;
    } catch (error) {
      logger.error("翻译失败:", error);
      // 翻译失败时返回原文
      return chineseQuestion;
    }
  }

  // ===================== 群组功能管理 =====================

  // 检查是否为允许的聊天（白名单功能）
  isAllowedChat(chatId, chatType) {
    if (chatType === "private") {
      return false;
    }

    // 如果没有设置群组白名单，默认允许所有群组
    const allowedGroupIds = process.env.ALLOWED_GROUP_IDS;
    if (!allowedGroupIds) {
      return true;
    }

    // 检查群组ID是否在白名单中
    const allowedIds = allowedGroupIds.split(",").map((id) => id.trim());
    return allowedIds.includes(chatId.toString());
  }

  // 检查是否应该响应消息（群组@功能）
  shouldRespondToMessage(ctx) {
    const chatType = ctx.chat.type;

    // 私聊总是响应
    if (chatType === "private") {
      return true;
    }

    // 群组中检查是否被@
    const text = ctx.message.text;
    const botUsername = this.botInfo?.username;

    // 方法1: 检查是否@了具体的bot用户名
    if (botUsername) {
      return (
        text.includes(`@${botUsername}`) ||
        ctx.message.reply_to_message?.from?.id === this.botInfo.id
      );
    }

    return false;

    // 方法3: 检查是否回复了消息
    if (ctx.message.reply_to_message) {
      return true;
    }

    return false;
  }

  // 清理问题文本（移除@mentions）
  cleanQuestion(question) {
    if (!question) return "";

    return question
      .replace(/@\w+/g, "") // 移除所有@mentions
      .replace(/^\s*\/\w+/, "") // 移除命令（如/start）
      .trim()
      .replace(/\s+/g, " "); // 规范化空格
  }
}

const botInstance = new GitBookRAGBot();

if (require.main === module) {
  botInstance.startPolling().catch(console.error);
}

module.exports.GitBookRAGBot = GitBookRAGBot;
