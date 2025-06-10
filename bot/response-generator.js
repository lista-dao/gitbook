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
        throw new Error("OPENAI_API_KEY 環境變量未設置");
      }

      const maxChunks = 6;
      const maxContextLength = 20000;

      const selectedChunks = relevantChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, maxChunks);

      let context = "";

      // 直接組合最相關的chunks
      selectedChunks.forEach((chunk, index) => {
        const content =
          chunk.metadata.chunk_content || chunk.metadata.content || "";
        if (!content.trim()) return;

        const filename = chunk.metadata.filename;
        const score = (chunk.score * 100).toFixed(1);

        context += `**來源 ${index + 1}：${filename}** (相似度 ${score}%)\n`;
        context += content.trim() + "\n\n";

        if (index < selectedChunks.length - 1) {
          context += "---\n\n";
        }
      });

      // 如果超過長度限制，智能截斷
      if (context.length > maxContextLength) {
        const truncatePoint = maxContextLength - 100;
        context =
          context.substring(0, truncatePoint) +
          "\n\n...[内容已截断，保留最相关信息]";
      }

      logger.info("檢索策略GPT上下文:", {
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
          max_tokens: 800,
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
        ? `你是一個專業的技術文檔助手。基於提供的 GitBook 文檔內容，用繁體中文回答用戶問題。

**重要指示：**
- **優先處理表格數據**：如果文檔中包含表格，這通常是最重要的信息，必須完整提取
- **比較類問題**：當用戶詢問兩個或多個系統的區別時，確保從所有相關文檔中提取信息並進行對比
- **代幣相關問題**：當用戶詢問代幣分配、排放、比例時，重點查找並引用所有相關的百分比數據
- **完整性要求**：確保回答涵蓋文檔中的所有相關數據，不遺漏任何重要信息

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

**Important Instructions:**
- **Prioritize Table Data**: If the document contains tables, this is usually the most important information and must be extracted completely
- **Comparison Questions**: When users ask about differences between systems (like CDP vs Lending), ensure you extract information from ALL relevant documents and provide comprehensive comparisons
- **Token-related Questions**: When users ask about token allocation, emissions, or ratios, focus on finding and quoting all relevant percentage data
- **Completeness Requirement**: Ensure that the answer covers all relevant data in the document, without missing any important information

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
- Structure answers: Use headings, lists, paragraphs
- **For comparison questions**: Clearly organize information by system/feature and highlight key differences`;

    const userPrompt =
      language === "zh-CN"
        ? `基於以下文檔內容回答問題。**如果文檔中有表格或列表，請完整引用所有數據**：

**上下文：**
${context}

**問題：**
${question}

**重要提醒：**
- 只使用上述提供的文檔內容回答
- 不要添加或推測任何未在文檔中明確提及的信息
- 如果信息來自多個文件，請明確標註來源
- 確保所有數據都有明確的文檔依據
- **對於比較類問題**：從所有相關來源提取和組織信息

請用繁體中文回答，確保包含所有相關數據：`
        : `Answer the question based on the following documentation. **If there are tables or lists in the document, please quote all data completely**:

**Context:**
${context}

**Question:**
${question}

**Important Reminder:**
- Only use the document content provided above to answer
- Do not add or speculate any information not explicitly mentioned in the documents
- If information comes from multiple files, please clearly indicate the source
- Ensure all data has clear document basis
- **For comparison questions**: Extract and organize information from all relevant sources

Please answer in English, ensuring all relevant data is included:`;

    return { systemPrompt, userPrompt };
  }

  buildSourceLinks(relevantChunks, language) {
    const sources = [
      ...new Set(relevantChunks.map((c) => c.metadata.filename)),
    ];

    const sourceLinks = sources
      .filter((filename) => !filename.includes("SUMMARY"))
      .map((filename) => {
        // 移除 .md 副檔名並轉換路徑為 URL
        const urlPath = filename.replace(/\.md$/, "");
        const url = `https://docs.bsc.lista.org/${urlPath}`;
        const displayName = filename.replace(/\.md$/, "").split("/").pop();
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
