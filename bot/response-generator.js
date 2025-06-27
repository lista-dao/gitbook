const axios = require("axios");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.prettyPrint()
  ),
  defaultMeta: { service: "response-generator" },
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

class ResponseGenerator {
  constructor(config) {
    this.config = config;
  }

  async generateAnswer(question, relevantChunks, language) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY 环境变量未设置");
      }

      const maxChunks = 6;
      const maxContextLength = 20000;

      const selectedChunks = relevantChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, maxChunks);

      let context = "";

      // 直接组合最相关的chunks
      selectedChunks.forEach((chunk, index) => {
        const content =
          chunk.metadata.chunk_content || chunk.metadata.content || "";
        if (!content.trim()) return;

        const filename = chunk.metadata.filename;
        const score = (chunk.score * 100).toFixed(1);

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

      logger.info("检索策略GPT上下文:", {
        originalChunks: relevantChunks.length,
        selectedChunks: selectedChunks.length,
        contextLength: context.length,
        maxAllowed: maxContextLength,
        avgScore:
          selectedChunks.length > 0
            ? (
                (selectedChunks.reduce((sum, c) => sum + c.score, 0) /
                  selectedChunks.length) *
                100
              ).toFixed(1) + "%"
            : "0%",
        filesInvolved: [
          ...new Set(selectedChunks.map((c) => c.metadata.filename)),
        ].length,
      });

      const { systemPrompt, userPrompt } = this.buildPrompts(
        question,
        context,
        language
      );

      const response = await axios.post(
        this.config.openaiApiUrl,
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1200,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const answer = response.data.choices[0].message.content;
      const sourceLinks = this.buildSourceLinks(relevantChunks, language);

      return answer + sourceLinks;
    } catch (error) {
      logger.error("生成回答失败:", error);

      if (error.response) {
        logger.error("OpenAI API 错误:", error.response.data);
      }

      throw new Error("无法生成回答，请稍后再试");
    }
  }

  buildPrompts(question, context, language) {
    const systemPrompt =
      language === "zh-CN"
        ? `你是一个专业的技术文档助手。基于提供的 GitBook 文档内容，用简体中文回答用户问题。

**重要指示：**
- **安全相关问题**：当用户询问安全措施、审计报告、防护机制时，优先提取并整理所有安全相关信息
- **优先处理表格数据**：如果文档中包含表格，这通常是最重要的信息，必须完整提取
- **比较类问题**：当用户询问两个或多个系统的区别时，确保从所有相关文档中提取信息并进行对比
- **代币相关问题**：当用户询问代币分配、排放、比例时，重点查找并引用所有相关的百分比数据
- **完整性要求**：确保回答涵盖文档中的所有相关数据，不遗漏任何重要信息

要求：
- 直接回答问题，基于提供的上下文
- 保持专业和准确
- 如果上下文不足以回答问题，请说明
- **特别注意：如果文档中包含表格数据，务必完整提取和使用**
- **安全问题处理**：对于安全相关询问，即使文档只有链接列表，也要将其整理成有意义的安全措施概述
- **表格数据处理**：避免使用复杂表格格式，改用简洁的列表形式展示数据，确保在Telegram中正确显示
- 使用 Telegram 专用 Markdown 格式提升阅读性：
  • **粗体**：重要概念、标题
  • _斜体_：强调重点
  • \`代码\`：技术术语、参数、指令
  • \`\`\`代码块\`\`\`：多行代码或配置
  • 🔸 项目符号：列举要点
  • 📝 数字列表：步骤说明
  • 🎯 表情符号：增加视觉区分
- **避免复杂表格**：使用简洁的项目列表代替表格，确保内容在Telegram中正确显示
- 如果可能，提供具体的步骤或示例 
- 结构化回答：使用标题、列表、分段`
        : `You are a professional technical documentation assistant. Answer user questions based on the provided GitBook documentation content in English.

**Important Instructions:**
- **Security-related Questions**: When users ask about security measures, audit reports, or protection mechanisms, prioritize extracting and organizing all security-related information
- **Prioritize Table Data**: If the document contains tables, this is usually the most important information and must be extracted completely
- **Comparison Questions**: When users ask about differences between systems (like CDP vs Lending), ensure you extract information from ALL relevant documents and provide comprehensive comparisons
- **Token-related Questions**: When users ask about token allocation, emissions, or ratios, focus on finding and quoting all relevant percentage data
- **Completeness Requirement**: Ensure that the answer covers all relevant data in the document, without missing any important information

Requirements:
- Answer directly based on the provided context
- Maintain professional and accurate tone  
- If context is insufficient, please indicate so
- **Pay special attention: If the document contains table data, be sure to extract and use it completely**
- **Security Question Handling**: For security-related inquiries, even if documents only contain link lists, organize them into meaningful security measure summaries
- **Table Data Handling**: Avoid complex table formats, use simple list formats to display data, ensuring proper display in Telegram
- Use Telegram-specific Markdown formatting for better readability:
  • **Bold**: Important concepts, headings
  • _Italic_: Emphasis points
  • \`Code\`: Technical terms, parameters, commands
  • \`\`\`Code blocks\`\`\`: Multi-line code or configurations
  • 🔸 Bullet points: List items
  • 📝 Numbered lists: Step-by-step instructions
  • 🎯 Emojis: Visual distinction
- **Avoid Complex Tables**: Use simple item lists instead of tables to ensure content displays correctly in Telegram
- Provide specific steps or examples when possible
- Structure answers: Use headings, lists, paragraphs
- **For comparison questions**: Clearly organize information by system/feature and highlight key differences`;

    const userPrompt =
      language === "zh-CN"
        ? `基于以下文档内容回答问题。**如果文档中有表格或列表，请完整引用所有数据**：

**上下文：**
${context}

**问题：**
${question}

**重要提醒：**
- 只使用上述提供的文档内容回答
- 不要添加或推测任何未在文档中明确提及的信息
- 确保所有数据都有明确的文档依据
- **对于比较类问题**：从所有相关来源提取和组织信息

请用简体中文回答，确保包含所有相关数据：`
        : `Answer the question based on the following documentation. **If there are tables or lists in the document, please quote all data completely**:

**Context:**
${context}

**Question:**
${question}

**Important Reminder:**
- Only use the document content provided above to answer
- Do not add or speculate any information not explicitly mentioned in the documents
- Ensure all data has clear document basis
- **For comparison questions**: Extract and organize information from all relevant sources

Please answer in English, ensuring all relevant data is included:`;

    return { systemPrompt, userPrompt };
  }

  buildSourceLinks(relevantChunks, language) {
    const sources = [
      ...new Set(relevantChunks.map((c) => c.metadata.filename)),
    ];

    const fileDisplayNames = new Map();

    sources.forEach((filename) => {
      const fileChunks = relevantChunks.filter(
        (c) => c.metadata.filename === filename
      );

      let displayName = null;

      const mainTopic = fileChunks.find((c) => c.metadata.main_topic)?.metadata
        .main_topic;
      if (mainTopic && mainTopic.trim() && mainTopic !== "README") {
        displayName = mainTopic.trim();
      }

      if (!displayName) {
        const firstHeading = fileChunks.find((c) => c.metadata.heading)
          ?.metadata.heading;
        if (firstHeading && firstHeading.trim() && firstHeading !== "README") {
          displayName = firstHeading.trim();
        }
      }

      if (!displayName) {
        const summary = fileChunks.find((c) => c.metadata.summary)?.metadata
          .summary;
        if (summary && summary.trim()) {
          displayName =
            summary.substring(0, 30).trim() +
            (summary.length > 30 ? "..." : "");
        }
      }

      if (!displayName) {
        const pathParts = filename.replace(/\.md$/, "").split("/");
        const lastPart = pathParts[pathParts.length - 1];

        if (lastPart === "README" && pathParts.length > 1) {
          displayName = pathParts[pathParts.length - 2];
        } else {
          displayName = lastPart;
        }

        displayName = displayName
          .replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }

      fileDisplayNames.set(filename, displayName);
    });

    const sourceLinks = sources
      .filter((filename) => !filename.includes("SUMMARY"))
      .map((filename) => {
        const urlPath = filename.replace(/\.md$/, "");
        const url = `https://docs.bsc.lista.org/${urlPath}`;
        const displayName = fileDisplayNames.get(filename);
        return `[${displayName}](${url.replace("/README", "")})`;
      });

    const sourceText =
      language === "zh-CN"
        ? `\n\n📚 **参考来源：** ${sourceLinks.join(", ")}`
        : `\n\n📚 **Sources:** ${sourceLinks.join(", ")}`;

    return sourceText;
  }
}

module.exports = ResponseGenerator;
