const axios = require("axios");
const winston = require("winston");
const { TOPIC_CONFIG } = require("../config/retrieval-topics");
const { RESPONSE_BUDGETS } = require("../config/retrieval-budgets");
const { buildAnswerPrompts } = require("./prompts/answer-prompts");
const { buildSourceLinks } = require("./source-links");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.prettyPrint(),
  ),
  defaultMeta: { service: "response-generator" },
  transports: [
    new winston.transports.File({ filename: "logs/bot.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

class ResponseGenerator {
  constructor(config) {
    this.config = config;
  }

  getChunkRankingScore(chunk) {
    if (typeof chunk?.rerankScore === "number") return chunk.rerankScore;
    return chunk?.score || 0;
  }

  async generateAnswer(question, relevantChunks, language, comparisonMeta) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY 环境变量未设置");
      }

      const {
        maxContextLength,
        maxChunks,
        maxChunksPerFile,
        maxChunksPerTopic,
        maxSourceLinks,
      } = RESPONSE_BUDGETS;
      const isComparison =
        comparisonMeta?.matchedTopics?.length >= 2 &&
        relevantChunks.length > 20;

      let selectedChunks;
      if (isComparison) {
        const filenameToTopic = {};
        for (const [topic, cfg] of Object.entries(TOPIC_CONFIG)) {
          (cfg.filenames || []).forEach((f) => (filenameToTopic[f] = topic));
        }
        const byTopic = {};
        for (const chunk of relevantChunks.sort(
          (a, b) =>
            this.getChunkRankingScore(b) - this.getChunkRankingScore(a),
        )) {
          const topic = filenameToTopic[chunk.metadata?.filename] || "_other";
          if (!byTopic[topic]) byTopic[topic] = [];
          if (byTopic[topic].length < maxChunksPerTopic) byTopic[topic].push(chunk);
        }
        selectedChunks = Object.values(byTopic)
          .flat()
          .sort(
            (a, b) =>
              this.getChunkRankingScore(b) - this.getChunkRankingScore(a),
          )
          .slice(0, maxChunks);
      } else {
        const fileCount = new Map();
        selectedChunks = [];
        for (const chunk of relevantChunks.sort(
          (a, b) =>
            this.getChunkRankingScore(b) - this.getChunkRankingScore(a),
        )) {
          const f = chunk.metadata?.filename || "";
          if ((fileCount.get(f) || 0) >= maxChunksPerFile) continue;
          selectedChunks.push(chunk);
          fileCount.set(f, (fileCount.get(f) || 0) + 1);
          if (selectedChunks.length >= maxChunks) break;
        }
      }

      let context = "";

      selectedChunks.forEach((chunk, index) => {
        const content =
          chunk.metadata.chunk_content || chunk.metadata.content || "";
        if (!content.trim()) return;

        const filename = chunk.metadata.filename;
        const score = (this.getChunkRankingScore(chunk) * 100).toFixed(1);

        context += `**来源 ${index + 1}：${filename}** (相似度 ${score}%)\n`;
        context += content.trim() + "\n\n";

        if (index < selectedChunks.length - 1) {
          context += "---\n\n";
        }
      });

      // 如果超过长度限制，智能截断
      if (context.length > maxContextLength) {
        const truncatePoint = maxContextLength - 100;
        context =
          context.substring(0, truncatePoint) +
          "\n\n...[内容已截断，保留最相关信息]";
      }

      const selectedFileChunks = {};
      selectedChunks.forEach((c) => {
        const f = c.metadata?.filename || "";
        if (!selectedFileChunks[f])
          selectedFileChunks[f] = { indices: [], scores: [] };
        selectedFileChunks[f].indices.push(c.metadata?.chunk_index ?? "?");
        selectedFileChunks[f].scores.push(
          (this.getChunkRankingScore(c) * 100).toFixed(1) + "%",
        );
      });
      logger.info("检索策略GPT上下文:", {
        originalChunks: relevantChunks.length,
        selectedChunks: selectedChunks.length,
        contextLength: context.length,
        maxAllowed: maxContextLength,
        avgScore:
          selectedChunks.length > 0
            ? (
                (selectedChunks.reduce(
                  (sum, c) => sum + this.getChunkRankingScore(c),
                  0,
                ) /
                  selectedChunks.length) *
                100
              ).toFixed(1) + "%"
            : "0%",
        filesInvolved: [
          ...new Set(selectedChunks.map((c) => c.metadata.filename)),
        ].length,
        selectedFiles: [
          ...new Set(selectedChunks.map((c) => c.metadata.filename)),
        ],
        selectedFileChunks,
      });

      const { systemPrompt, userPrompt } = this.buildPrompts(
        question,
        context,
        language,
        comparisonMeta,
      );

      const response = await axios.post(
        this.config.openaiApiUrl,
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 900,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        },
      );

      const answer = response.data.choices[0].message.content;
      const sourceLinks = buildSourceLinks(
        selectedChunks,
        language,
        this.getChunkRankingScore.bind(this),
        { maxFiles: maxSourceLinks },
      );

      return answer + sourceLinks;
    } catch (error) {
      logger.error("生成回答失败:", error);

      if (error.response) {
        logger.error("OpenAI API 错误:", error.response.data);
      }

      throw new Error("无法生成回答，请稍后再试");
    }
  }

  buildPrompts(question, context, language, comparisonMeta) {
    return buildAnswerPrompts({
      question,
      context,
      language,
      comparisonMeta,
    });
  }

}

module.exports = ResponseGenerator;
