const { franc } = require("franc");
const axios = require("axios");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.prettyPrint()
  ),
  defaultMeta: { service: "language-service" },
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

class LanguageService {
  constructor(config) {
    this.config = config;
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
}

module.exports = LanguageService;
