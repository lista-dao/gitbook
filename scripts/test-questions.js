#!/usr/bin/env node

const { GitBookRAGBot } = require("../bot/bot");

async function testQuestionsList() {
  console.log("🎯 测试问题列表...\n");

  const bot = new GitBookRAGBot();

  try {
    await bot.initializePinecone();
    await bot.initializeEmbedder();

    // 模擬bot信息用於初始化services
    bot.botInfo = { id: 12345, username: "test_bot", first_name: "Test Bot" };
    bot.initializeServices();

    // 你的问题列表
    const questions = [
      //   "what is the interest rate model for lista lending?",
      //   "How can I access lista lending",
      //   "what is clisBNB?",
      //   "LISTA's token distribution",
      //   "lista 代幣排放比例為何",
      //   "what are the differences between lista lending and cdp?",
      "lista DAO 采取了哪些具体的安全措施来保护用户在 Lista Lending 平台上存入的资产？请详细说明智能合约审计、多重签名机制或其它相关防护措施。",
    ];

    const userInfo = { id: 123456, username: "test", first_name: "Test" };

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`🔍 问题 ${i + 1}: ${question}`);
      console.log("=".repeat(60));

      const startTime = Date.now();

      try {
        const answer = await bot.processQuestion(question, userInfo);
        const duration = Date.now() - startTime;

        console.log(`⏱️  用时: ${duration}ms`);
        console.log(`📝 回答长度: ${answer.length}字符`);

        // 检查是否包含源链接
        const hasSourceLinks = answer.includes("📚") && answer.includes("[");
        console.log(`🔗 包含源链接: ${hasSourceLinks ? "✅" : "❌"}`);

        // 显示前200字符预览
        // const preview =
        // answer.length > 200 ? answer.substring(0, 500) + "..." : answer;
        console.log(`📖 内容预览: ${answer}`);

        console.log(`✅ 成功!`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`⏱️  用时: ${duration}ms`);
        console.log(`❌ 错误: ${error.message}`);
      }

      console.log("\n" + "🔄".repeat(40) + "\n");
    }

    console.log("🎯 测试完成!");
  } catch (error) {
    console.error("初始化失败:", error);
  }
}

testQuestionsList().catch(console.error);
