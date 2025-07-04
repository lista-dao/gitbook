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

// 配置日志
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

    this.moderatorIds = [790810748];

    this.smartProcessor = new SmartProcessor(this.config);
    this.retrievalService = null;
    this.languageService = null;
    this.responseGenerator = null;
    this.groupManager = null;
  }

  async initialize() {
    try {
      logger.info("开始初始化 RAG Bot...");

      // 初始化 Bot
      this.bot = new Telegraf(process.env.BOT_TOKEN);

      // 获取bot信息
      this.botInfo = await this.bot.telegram.getMe();
      logger.info("Bot信息获取成功", {
        id: this.botInfo.id,
        username: this.botInfo.username,
        first_name: this.botInfo.first_name,
      });

      // 初始化其他组件
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
        throw new Error("PINECONE_API_KEY 环境变量未设置");
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
      // 测试 Pinecone Inference API 连接
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
    // 初始化各个服务模块
    this.retrievalService = new RetrievalService(
      this.index,
      this.smartProcessor
    );
    this.languageService = new LanguageService(this.config);
    this.responseGenerator = new ResponseGenerator(this.config);
    this.groupManager = new GroupManager(this.botInfo);

    logger.info("所有服务模块初始化完成");
  }

  setupBot() {
    this.bot.on("text", async (ctx) => {
      const question = ctx.message.text;
      const userId = ctx.from.id;
      const chatType = ctx.chat.type;
      const chatId = ctx.chat.id;

      // 检查群组白名单
      if (!this.groupManager.isAllowedChat(chatId, chatType)) {
        logger.info(`拒绝未授权群组的请求`, { chatId, chatType });
        return;
      }

      // 检查是否需要响应
      const shouldRespond = this.groupManager.shouldRespondToMessage(ctx);
      if (!shouldRespond) {
        return; // 在群组中未被@，不响应
      }

      // 清理问题文本（移除@bot的部分）
      const cleanQuestion = this.groupManager.cleanQuestion(question);

      if (!cleanQuestion) {
        return; // 如果清理后没有内容，不响应
      }

      logger.info(`收到问题: ${cleanQuestion}`, { userId, chatType });

      try {
        // 检测语言并显示对应的加载消息
        const detectedLang = this.languageService.detectLanguage(cleanQuestion);
        const loadingMessage =
          detectedLang === "zh-CN"
            ? "🤔 正在搜索相关内容..."
            : "🤔 Searching relevant content...";

        const thinkingMsg = await ctx.reply(loadingMessage);

        // 处理问题（包含速率限制检查）
        const userInfo = {
          id: userId,
          username: ctx.from.username,
          first_name: ctx.from.first_name,
        };
        const answer = await this.processQuestion(cleanQuestion, userInfo);

        // 删除思考消息并发送答案
        await ctx.deleteMessage(thinkingMsg.message_id);

        // 发送回答
        const replyMsg = await ctx.reply(answer, {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message.message_id,
        });

        // 检查是否需要添加审批按钮
        const shouldShowModeration = this.shouldShowModerationButtons(ctx);
        if (shouldShowModeration) {
          const moderationText =
            detectedLang === "zh-CN"
              ? "📝 管理员请审核上述回答："
              : "📝 Moderators, please review the above response:";

          const correctText =
            detectedLang === "zh-CN" ? "✅ 正确" : "✅ Correct";
          const incorrectText =
            detectedLang === "zh-CN" ? "❌ 错误" : "❌ Incorrect";

          await ctx.reply(moderationText, {
            reply_to_message_id: replyMsg.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: correctText,
                    callback_data: `approve_${replyMsg.message_id}_${userId}_${detectedLang}`,
                  },
                  {
                    text: incorrectText,
                    callback_data: `reject_${replyMsg.message_id}_${userId}_${detectedLang}`,
                  },
                ],
              ],
            },
          });
        }

        logger.info(`回答完成`, { userId, answerLength: answer.length });
      } catch (error) {
        logger.error(`处理问题失败: ${error.message}`, { userId });

        const errorMessage =
          this.languageService.detectLanguage(cleanQuestion) === "zh-CN"
            ? "❌ 抱歉，处理问题时出现错误，请稍后再试。"
            : "❌ Sorry, an error occurred while processing your question. Please try again later.";

        await ctx.reply(errorMessage, {
          reply_to_message_id: ctx.message.message_id,
        });
      }
    });

    // 处理inline keyboard回调
    this.bot.on("callback_query", async (ctx) => {
      try {
        await this.handleModerationCallback(ctx);
      } catch (error) {
        logger.error("处理审批回调失败:", error);
        await ctx.answerCbQuery("操作失败，请重试");
      }
    });

    this.bot.catch((err, ctx) => {
      logger.error("Bot 错误:", err);
      if (ctx && ctx.reply) {
        ctx.reply("❌ System Error.");
      }
    });
  }

  async processQuestion(question, userInfo) {
    try {
      const detectedLang = this.languageService.detectLanguage(question);
      logger.info(`检测到语言: ${detectedLang}`);

      let searchQuestion = question;
      if (detectedLang === "zh-CN") {
        searchQuestion = await this.languageService.translateToEnglish(
          question
        );
        logger.info(`翻译结果: ${searchQuestion}`);
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
      logger.error("处理问题时出错:", error);
      throw error;
    }
  }

  // 检查是否需要显示审批按钮
  shouldShowModerationButtons(ctx) {
    // 如果没有配置审批员，不显示按钮
    if (this.moderatorIds.length === 0) {
      return false;
    }

    const chatType = ctx.chat.type;
    const chatId = ctx.chat.id;

    // 在私聊中，检查当前用户是否是审批员
    if (chatType === "private") {
      return this.moderatorIds.includes(ctx.from.id);
    }

    // 在群组中，检查是否有审批员在群组中（这里简化处理，总是显示）
    // 实际使用中可以通过getChatAdministrators检查具体成员
    return true;
  }

  // 处理审批回调
  async handleModerationCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    const moderatorId = ctx.from.id;
    const moderatorName = ctx.from.first_name || ctx.from.username || "Unknown";

    // 解析回调数据: approve_messageId_userId_language 或 reject_messageId_userId_language
    const [action, messageId, originalUserId, language] =
      callbackData.split("_");

    // 使用默认语言作为fallback
    const lang = language || "en";

    if (!action || !messageId || !originalUserId) {
      const errorMsg =
        lang === "zh-CN" ? "❌ 无效的操作数据" : "❌ Invalid operation data";
      await ctx.answerCbQuery(errorMsg);
      return;
    }

    // 检查操作者是否是审批员
    if (!this.moderatorIds.includes(moderatorId)) {
      const noPermissionMsg =
        lang === "zh-CN"
          ? "⚠️ 您没有权限进行此操作"
          : "⚠️ You don't have permission to perform this action";
      await ctx.answerCbQuery(noPermissionMsg);
      return;
    }

    const timestamp = new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    let responseText = "";
    let alertText = "";

    if (action === "approve") {
      if (lang === "zh-CN") {
        responseText = `✅ **已审核通过**\n👤 审核员：${moderatorName}\n🕐 时间：${timestamp}`;
        alertText = "✅ 已标记为正确回答";
      } else {
        responseText = `✅ **Review Approved**\n👤 Moderator: ${moderatorName}\n🕐 Time: ${timestamp}`;
        alertText = "✅ Marked as correct answer";
      }

      logger.info("回答审核通过", {
        moderatorId,
        moderatorName,
        messageId,
        originalUserId,
        language: lang,
        timestamp,
      });
    } else if (action === "reject") {
      if (lang === "zh-CN") {
        responseText = `❌ **回答需要修正**\n👤 审核员：${moderatorName}\n🕐 时间：${timestamp}\n\n⚠️ 此回答可能存在错误，请谨慎参考或寻求进一步确认。`;
        alertText = "❌ 已标记为错误回答";
      } else {
        responseText = `❌ **Answer Needs Correction**\n👤 Moderator: ${moderatorName}\n🕐 Time: ${timestamp}\n\n⚠️ This answer may contain errors. Please use with caution or seek further confirmation.`;
        alertText = "❌ Marked as incorrect answer";
      }

      logger.info("回答审核拒绝", {
        moderatorId,
        moderatorName,
        messageId,
        originalUserId,
        language: lang,
        timestamp,
      });
    } else {
      const errorMsg =
        lang === "zh-CN" ? "❌ 未知操作" : "❌ Unknown operation";
      await ctx.answerCbQuery(errorMsg);
      return;
    }

    // 编辑原消息，移除按钮并显示审核结果
    try {
      await ctx.editMessageText(responseText, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [] }, // 移除按钮
      });
    } catch (error) {
      // 如果编辑失败（比如消息太旧），发送新消息
      logger.warn("编辑审核消息失败，发送新消息:", error.message);
      await ctx.reply(responseText, {
        parse_mode: "Markdown",
        reply_to_message_id: parseInt(messageId),
      });
    }

    // 回应callback query
    await ctx.answerCbQuery(alertText);
  }

  // 启动 Bot
  async startPolling() {
    try {
      await this.initialize();
      this.setupBot();
      this.setupHealthCheck();
      await this.bot.launch();
      logger.info("Bot 启动成功（轮询模式）");

      this.setupProcessSignals();

      logger.info("Bot 初始化完成，等待消息...");
    } catch (error) {
      logger.error("Bot 启动失败:", error);
      process.exit(1);
    }
  }

  setupProcessSignals() {
    const gracefulShutdown = async (signal) => {
      logger.info(`收到 ${signal} 信号，开始关闭...`);

      try {
        if (this.bot) {
          await this.bot.stop(signal);
          logger.info("Telegram Bot 已停止");
        }

        if (this.httpServer) {
          this.httpServer.close();
          logger.info("Health check server 已停止");
        }

        // 等待正在处理的请求完成
        await new Promise((resolve) => setTimeout(resolve, 1000));

        process.exit(0);
      } catch (error) {
        logger.error("关闭过程中出错:", error);
        process.exit(1);
      }
    };

    // 信号处理
    process.once("SIGINT", () => gracefulShutdown("SIGINT"));
    process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

    // 未捕获异常处理
    process.on("uncaughtException", (error) => {
      logger.error("未捕获的异常:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("未处理的 Promise 拒绝:", { reason, promise });
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
