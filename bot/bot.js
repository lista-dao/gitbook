const { Telegraf } = require("telegraf");
const { Pinecone } = require("@pinecone-database/pinecone");
const winston = require("winston");
const express = require("express");
const simpleRateLimiter = require("./simple-rate-limiter");
const SmartProcessor = require("./smart-processor");
const RetrievalService = require("./retrieval-service");
const LanguageService = require("./language-service");
const ResponseGenerator = require("./response-generator");
const GroupManager = require("./group-manager");
require("dotenv").config();

// 配置日誌
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.prettyPrint()
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
    this.botInfo = null;
    this.httpServer = null;
    this.app = express();

    this.config = {
      indexName: process.env.PINECONE_INDEX_NAME || "gitbook-rag",
      similarityThreshold: 0.6,
      maxResults: 8,
      openaiApiUrl: "https://api.openai.com/v1/chat/completions",
      healthPort: 3000,
    };

    // 初始化服務模塊
    this.smartProcessor = new SmartProcessor(this.config);
    this.retrievalService = null;
    this.languageService = null;
    this.responseGenerator = null;
    this.groupManager = null;
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
      this.initializeServices();

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

  initializeServices() {
    // 初始化各個服務模塊
    this.retrievalService = new RetrievalService(
      this.index,
      this.smartProcessor
    );
    this.languageService = new LanguageService(this.config);
    this.responseGenerator = new ResponseGenerator(this.config);
    this.groupManager = new GroupManager(this.botInfo);

    logger.info("所有服務模塊初始化完成");
  }

  setupBot() {
    this.bot.on("text", async (ctx) => {
      const question = ctx.message.text;
      const userId = ctx.from.id;
      const chatType = ctx.chat.type;
      const chatId = ctx.chat.id;

      // 檢查群組白名單
      if (!this.groupManager.isAllowedChat(chatId, chatType)) {
        logger.info(`拒絕未授權群組的請求`, { chatId, chatType });
        return;
      }

      // 檢查是否需要響應
      const shouldRespond = this.groupManager.shouldRespondToMessage(ctx);
      if (!shouldRespond) {
        return; // 在群組中未被@，不響應
      }

      // 清理問題文本（移除@bot的部分）
      const cleanQuestion = this.groupManager.cleanQuestion(question);

      if (!cleanQuestion) {
        return; // 如果清理後沒有內容，不響應
      }

      logger.info(`收到問題: ${cleanQuestion}`, { userId, chatType });

      try {
        // 檢測語言並顯示對應的加載消息
        const detectedLang = this.languageService.detectLanguage(cleanQuestion);
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
        await ctx.reply(answer, {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message.message_id,
        });

        logger.info(`回答完成`, { userId, answerLength: answer.length });
      } catch (error) {
        logger.error(`處理問題失敗: ${error.message}`, { userId });

        const errorMessage =
          this.languageService.detectLanguage(cleanQuestion) === "zh-CN"
            ? "❌ 抱歉，處理問題時出現錯誤，請稍後再試。"
            : "❌ Sorry, an error occurred while processing your question. Please try again later.";

        await ctx.reply(errorMessage, {
          reply_to_message_id: ctx.message.message_id,
        });
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
      const detectedLang = this.languageService.detectLanguage(question);
      logger.info(`檢測到語言: ${detectedLang}`);

      let searchQuestion = question;
      if (detectedLang === "zh-CN") {
        searchQuestion = await this.languageService.translateToEnglish(
          question
        );
        logger.info(`翻譯結果: ${searchQuestion}`);
      }

      const questionEmbedding = await this.smartProcessor.generateEmbedding(
        searchQuestion,
        "passage"
      );

      const relevantChunks = await this.retrievalService.retrieveRelevantChunks(
        questionEmbedding,
        searchQuestion
      );

      if (relevantChunks.length === 0) {
        return this.languageService.getNoResultsMessage(detectedLang);
      }

      const answer = await this.responseGenerator.generateAnswer(
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

  // 啟動 Bot
  async startPolling() {
    try {
      await this.initialize();
      this.setupBot();
      this.setupHealthCheck();
      await this.bot.launch();
      logger.info("Bot 啟動成功（輪詢模式）");

      this.setupProcessSignals();

      logger.info("Bot 初始化完成，等待消息...");
    } catch (error) {
      logger.error("Bot 啟動失敗:", error);
      process.exit(1);
    }
  }

  setupProcessSignals() {
    const gracefulShutdown = async (signal) => {
      logger.info(`收到 ${signal} 信號，開始關閉...`);

      try {
        if (this.bot) {
          await this.bot.stop(signal);
          logger.info("Telegram Bot 已停止");
        }

        if (this.httpServer) {
          this.httpServer.close();
          logger.info("Health check server 已停止");
        }

        // 等待正在處理的請求完成
        await new Promise((resolve) => setTimeout(resolve, 1000));

        process.exit(0);
      } catch (error) {
        logger.error("關閉過程中出錯:", error);
        process.exit(1);
      }
    };

    // 信號處理
    process.once("SIGINT", () => gracefulShutdown("SIGINT"));
    process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

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

  setupHealthCheck() {
    this.app.get("/health", (req, res) => {
      const healthStatus = {
        status: "ok",
        timestamp: new Date().toISOString(),
        bot: this.botInfo ? "connected" : "disconnected",
        pinecone: this.pinecone ? "connected" : "disconnected",
      };
      res.status(200).json(healthStatus);
    });

    this.httpServer = this.app.listen(this.config.healthPort, () => {
      logger.info(
        `Health check server running on port ${this.config.healthPort}`
      );
    });
  }
}

const botInstance = new GitBookRAGBot();

if (require.main === module) {
  botInstance.startPolling().catch(console.error);
}

module.exports.GitBookRAGBot = GitBookRAGBot;
