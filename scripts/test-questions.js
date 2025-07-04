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

    // 测试改进后的来源链接显示和警语功能
    const questions = ["What are Lista DAO's security measures?"];

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

async function checkMediumFiles() {
  console.log("🔍 检查Pinecone中的Medium文章...\n");

  const bot = new GitBookRAGBot();

  try {
    await bot.initializePinecone();

    // 检查所有可能的Medium文章文件名（不带路径）
    const mediumFiles = [
      "product-update-lista-lending-alpha-zone-powering-t.md",
      "product-update-mint-clisbnb-in-lista-lending.md",
      "product-update-unlocking-velista-utility-introduci.md",
      "product-update-mint-clisbnb-with-bnb-slisbnb-lp-to.md",
      "product-update-lista-lending-vault-manager-gui.md",
      "product-update-introducing-lista-daos-liquidation-.md",
      "product-guide-lista-lending.md",
      "introducing-lista-lending-lista-daos-next-gen-lend.md",
      "securing-the-future-an-in-depth-look-at-lista-daos.md",
    ];

    console.log("找到的Medium文章：");

    for (const filename of mediumFiles) {
      try {
        const result = await bot.index.query({
          vector: new Array(1024).fill(0),
          filter: { filename: filename },
          topK: 1,
          includeMetadata: true,
        });

        if (result.matches && result.matches.length > 0) {
          console.log(`✅ ${filename}`);
          console.log(
            `   - 源URL: ${result.matches[0].metadata.source_url || "N/A"}`
          );
          console.log(
            `   - 是否外部内容: ${
              result.matches[0].metadata.is_external_content || "N/A"
            }`
          );
        } else {
          console.log(`❌ ${filename} - 未找到`);
        }
      } catch (error) {
        console.log(`❌ ${filename} - 错误: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("初始化失败:", error);
  }
}

testQuestionsList().catch(console.error);
// checkMediumFiles().catch(console.error);
