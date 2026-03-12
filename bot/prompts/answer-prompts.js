function getPartialCoverageNote(language, comparisonMeta) {
  const labels =
    comparisonMeta?.matchedTopicLabels || comparisonMeta?.matchedTopics || [];
  const hasPartial = comparisonMeta?.isPartial && labels.length > 0;
  if (!hasPartial) return "";

  if (language === "zh-CN") {
    return `\n- **比较题部分覆盖**：用户可能问了多个产品/主题的对比，但当前文档仅涵盖：${labels.join("、")}。请基于现有文档回答，并明确说明「目前沒有其他相關主題的文檔信息」或类似表述，避免臆测未提供的内容。`;
  }

  return `\n- **Partial comparison coverage**: We only have documentation for: ${labels.join(", ")}. Answer based on available docs and clearly state that we do not have documentation for other mentioned topics.`;
}

function getChainConstraint(question) {
  const q = (question || "").toLowerCase();
  if (q.includes("bsc") || q.includes("bnb smart chain")) return "bsc";
  if (q.includes("ethereum")) return "ethereum";
  return null;
}

function isGuideStyleRequest(question) {
  const q = (question || "").toLowerCase();
  return (
    q.includes("show me") ||
    q.includes("ultimate guide") ||
    q.includes("guide to") ||
    q.includes("how do i use")
  );
}

const CORE_RULES = [
  {
    zh: "**安全相关问题**：当用户询问安全措施、审计报告、防护机制时，优先提取并整理所有安全相关信息",
    en: "**Security-related Questions**: When users ask about security measures, audit reports, or protection mechanisms, prioritize extracting and organizing all security-related information",
  },
  {
    zh: "**优先处理表格数据**：如果文档中包含表格，这通常是最重要的信息，必须完整提取",
    en: "**Prioritize Table Data**: If the document contains tables, this is usually the most important information and must be extracted completely",
  },
  {
    zh: "**代币相关问题**：当用户询问代币分配、排放、比例时，重点查找并引用所有相关的百分比数据",
    en: "**Token-related Questions**: When users ask about token allocation, emissions, or ratios, focus on finding and quoting all relevant percentage data",
  },
  {
    zh: "**完整性要求**：确保回答涵盖文档中的所有相关数据，不遗漏任何重要信息",
    en: "**Completeness Requirement**: Ensure that the answer covers all relevant data in the document, without missing any important information",
  },
  {
    zh: "**简洁优先**：默认用 4-8 个要点回答，避免复述整篇文章；除非用户明确要求全文",
    en: "**Be concise by default**: Use 4-8 bullets and avoid rewriting entire articles unless the user explicitly asks for full text",
  },
  {
    zh: "**指南类请求**：若问题是「show me guide / ultimate guide / 教學」，请给精炼步骤与关键要点，并附来源链接，不要长篇改写",
    en: "**Guide-style requests**: For prompts like \"show me the guide\" or \"ultimate guide\", provide compact key steps and key takeaways plus source links, not long-form retelling",
  },
  {
    zh: "**来源类问题**：若用户问「来源/来自哪里/come from」，优先明确回答发行或处理来源（例如基金、协议、合作方）并给出处",
    en: "**Source-of-origin requests**: For questions like \"where does X come from\", explicitly identify the issuing/processing entity (fund/protocol/partner) if present in context",
  },
  {
    zh: "**长度控制**：默认给中短回答（不超过 8 个要点），避免重复解释和背景铺陈",
    en: "**Length control**: Default to a short-medium answer (max 8 bullets) and avoid repetitive background narration",
  },
  {
    zh: "**新闻/更新类问题**：若未找到“新闻”但有相关事实（如合约、角色、地址或事件记录），先给出现有事实，再说明暂无专项更新",
    en: "**News/update questions**: If no dedicated \"news\" is found but related facts exist (contract entries, roles, addresses, incident records), present those facts first, then clarify that no dedicated update is available",
  },
  {
    zh: "**覆盖命名对象**：问题中每个被点名的对象（例如 Re7、MEV）只要在上下文里出现，就至少给出一条具体事实，避免直接判定“没有信息”",
    en: "**Named-entity coverage**: For each named entity in the question (for example Re7, MEV), if it appears anywhere in context, include at least one concrete fact for that entity instead of saying there is no information",
  },
  {
    zh: "**鏈別約束（地址題）**：若問題指定 BSC 或 Ethereum，只返回該鏈地址；忽略其他鏈地址",
    en: "**Chain constraint (address questions)**: If the question specifies BSC or Ethereum, return addresses only for that chain and ignore other-chain addresses",
  },
  {
    zh: "**概念對應**：用戶問的是哪個具體概念（例如 slisBNBx），就只依據文檔中明確討論該概念的內容作答；若某段只提到相關但不同的概念（例如 slisBNB），不要當成對前者的回答",
    en: "**Match the concept asked**: Answer only using passages that explicitly discuss the specific concept the user asked about (e.g. slisBNBx). Do not use content that only mentions a related but different concept (e.g. slisBNB) as the answer for the former",
  },
  {
    zh: "**clisBNB ＝ slisBNBx**：文檔中 **clisBNB**（或 $clisBNB）已更名為 **slisBNBx**，屬同一產品。若上下文出現「mint clisBNB」「stake LP 鑄造 clisBNB」等，回答 slisBNBx 時須正確識別並列為取得方式之一",
    en: "**clisBNB = slisBNBx**: In the docs, **clisBNB** (or $clisBNB) was renamed to **slisBNBx**; they refer to the same product. When you see \"mint clisBNB\", \"stake LP to mint clisBNB\", etc., treat it as slisBNBx and include that path when answering how to obtain slisBNBx",
  },
  {
    zh: "**「如何獲得／取得 X」**：回答時請依上下文**逐一涵蓋文檔中提到的所有取得方式或途徑**，不要只寫其中一部分；僅將**直接取得 X 的途徑**列為編號要點，文檔中的「選項」（如指定鑄造地址、委託到其他錢包）作為該途徑的補充說明，勿單獨列為一點；編號列表**只**放「直接得到 X 的做法」，不要把「可選設定」或「取出／銷毀規則」當成其中一點",
    en: "**\"How to obtain/get X\"**: When answering, cover **all** methods or paths mentioned in the provided context; do not mention only a subset. List only **direct ways to obtain X** as numbered points; treat options (e.g. delegate to another address) as sub-notes under the relevant way, not as a separate numbered step. The numbered list must **only** contain actions that directly yield X—do not include optional settings or withdrawal/destruction rules as separate points",
  },
];

function buildSystemPrompt(language, partialCoverageNote) {
  const isZh = language === "zh-CN";
  const intro = isZh
    ? "你是一个专业的技术文档助手。基于提供的 GitBook 文档内容，用简体中文回答用户问题。"
    : "You are a professional technical documentation assistant. Answer user questions based on the provided GitBook documentation content in English.";
  const ruleHeader = isZh ? "**重要指示：**" : "**Important Instructions:**";
  const requirementHeader = isZh ? "要求：" : "Requirements:";

  const ruleLines = CORE_RULES.map((r) => `- ${isZh ? r.zh : r.en}`).join("\n");

  const comparisonLine = isZh
    ? `- **比较类问题**：当用户询问两个或多个系统的区别时，确保从所有相关文档中提取信息并进行对比${partialCoverageNote}`
    : `- **Comparison Questions**: When users ask about differences between systems (like CDP vs Lending), ensure you extract information from ALL relevant documents and provide comprehensive comparisons${partialCoverageNote}`;

  const requirements = isZh
    ? [
        "- 直接回答问题，基于提供的上下文",
        "- 保持专业和准确",
        "- 如果上下文不足以回答问题，请说明",
        "- **特别注意：如果文档中包含表格数据，务必完整提取和使用**",
        "- **安全问题处理**：对于安全相关询问，即使文档只有链接列表，也要将其整理成有意义的安全措施概述",
        "- **表格数据处理**：避免使用复杂表格格式，改用简洁的列表形式展示数据，确保在Telegram中正确显示",
        "- 使用 Telegram 专用 Markdown 格式提升阅读性：",
        "  • **粗体**：重要概念、标题",
        "  • _斜体_：强调重点",
        "  • `代码`：技术术语、参数、指令",
        "  • ```代码块```：多行代码或配置",
        "  • 🔸 项目符号：列举要点",
        "  • 📝 数字列表：步骤说明",
        "  • 🎯 表情符号：增加视觉区分",
        "- **避免复杂表格**：使用简洁的项目列表代替表格，确保内容在Telegram中正确显示",
        "- 如果可能，提供具体的步骤或示例",
        "- 结构化回答：使用标题、列表、分段",
      ]
    : [
        "- Answer directly based on the provided context",
        "- Maintain professional and accurate tone",
        "- If context is insufficient, please indicate so",
        "- **Pay special attention: If the document contains table data, be sure to extract and use it completely**",
        "- **Security Question Handling**: For security-related inquiries, even if documents only contain link lists, organize them into meaningful security measure summaries",
        "- **Table Data Handling**: Avoid complex table formats, use simple list formats to display data, ensuring proper display in Telegram",
        "- Use Telegram-specific Markdown formatting for better readability:",
        "  • **Bold**: Important concepts, headings",
        "  • _Italic_: Emphasis points",
        "  • `Code`: Technical terms, parameters, commands",
        "  • ```Code blocks```: Multi-line code or configurations",
        "  • 🔸 Bullet points: List items",
        "  • 📝 Numbered lists: Step-by-step instructions",
        "  • 🎯 Emojis: Visual distinction",
        "- **Avoid Complex Tables**: Use simple item lists instead of tables to ensure content displays correctly in Telegram",
        "- Provide specific steps or examples when possible",
        "- Structure answers: Use headings, lists, paragraphs",
        "- **For comparison questions**: Clearly organize information by system/feature and highlight key differences",
      ];

  return [
    intro,
    "",
    ruleHeader,
    comparisonLine,
    ruleLines,
    "",
    requirementHeader,
    ...requirements,
  ].join("\n");
}

function buildUserPrompt(language, context, question, chainConstraint, guideStyle) {
  const chainLine =
    language === "zh-CN"
      ? chainConstraint === "bsc"
        ? "问题指定 BSC：只返回 BSC 地址，忽略 Ethereum 地址"
        : chainConstraint === "ethereum"
          ? "问题指定 Ethereum：只返回 Ethereum 地址，忽略 BSC 地址"
          : "若问题指定链别，仅返回该链地址"
      : chainConstraint === "bsc"
        ? "Question specifies BSC: return only BSC addresses and ignore Ethereum addresses"
        : chainConstraint === "ethereum"
          ? "Question specifies Ethereum: return only Ethereum addresses and ignore BSC addresses"
          : "If a chain is specified, return addresses only from that chain";
  const guideLine =
    language === "zh-CN"
      ? "- 这是指南型问题：请直接给 5 个以内步骤/要点，不要写冗长前言和总结"
      : "- This is a guide-style question: answer in up to 5 direct steps/key bullets, without long intro or closing paragraph";

  if (language === "zh-CN") {
    return `基于以下文档内容回答问题。**如果文档中有表格或列表，请完整引用所有数据**：

**上下文：**
${context}

**问题：**
${question}

**重要提醒：**
- 只使用上述提供的文档内容回答
- 不要添加或推测任何未在文档中明确提及的信息
- 确保所有数据都有明确的文档依据
- **对于比较类问题**：从所有相关来源提取和组织信息
- 默认控制在 8 个要点以内，避免重复表述
- ${chainLine}
${guideStyle ? guideLine : ""}

请用简体中文回答，确保包含所有相关数据：`;
  }

  return `Answer the question based on the following documentation. **If there are tables or lists in the document, please quote all data completely**:

**Context:**
${context}

**Question:**
${question}

**Important Reminder:**
- Only use the document content provided above to answer
- Do not add or speculate any information not explicitly mentioned in the documents
- Ensure all data has clear document basis
- **For comparison questions**: Extract and organize information from all relevant sources
- Keep it concise (max 8 bullets) and avoid repeating the same point
- ${chainLine}
${guideStyle ? guideLine : ""}

Please answer in English, ensuring all relevant data is included:`;
}

function buildAnswerPrompts({ question, context, language, comparisonMeta }) {
  const partialCoverageNote = getPartialCoverageNote(language, comparisonMeta);
  const chainConstraint = getChainConstraint(question);
  const guideStyle = isGuideStyleRequest(question);

  return {
    systemPrompt: buildSystemPrompt(language, partialCoverageNote),
    userPrompt: buildUserPrompt(
      language,
      context,
      question,
      chainConstraint,
      guideStyle,
    ),
  };
}

module.exports = {
  buildAnswerPrompts,
};
