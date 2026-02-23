#!/usr/bin/env node
/**
 * 通用問題測試：與 bot 相同流程，印出查詢過程與結果，方便除錯
 * 用法: npm run test:debug  或  node scripts/test-questions.js [--file path] ["問題1" "問題2"]
 */
require("dotenv").config();
const fs = require("fs").promises;
const { GitBookRAGBot } = require("../bot/bot");

// 要測試的問題列表，直接改這裡後執行 npm test 或 npm run test:debug
const questList = [
  "RWA 是什麼",
  "什麼是 CDP",
  "Lista DAO 的安全措施有哪些",
  "Lista Lending 怎麼借錢",
  "lending 跟 smart lending 的區別",
  "CDP 和 Lending 有什麼不同",
  "clisBNB 是什麼",
  "veLISTA 怎麼用",
  "Smart Lending 怎麼用",
  "Lista 有做過審計嗎",
  "How does gauge voting work for veLISTA",
  "CDP vs Smart Lending 差在哪",
];

const SEP = "─".repeat(60);
const SEP2 = "═".repeat(60);

function formatChunkSummary(chunks) {
  if (!chunks?.length) return { count: 0, files: [], topScores: [] };
  const files = [
    ...new Set(chunks.map((c) => c.metadata?.filename).filter(Boolean)),
  ];
  const topScores = chunks
    .slice(0, 5)
    .map((c) => `${(c.score * 100).toFixed(1)}%`)
    .join(", ");
  return { count: chunks.length, files, topScores };
}

async function runOne(bot, question, index, total, quiet) {
  const start = Date.now();
  if (!quiet) {
    console.log(`\n${SEP2}`);
    console.log(`【問題 ${index}/${total}】 ${question}`);
    console.log(SEP);
  }

  try {
    const detectedLang = bot.languageService.detectLanguage(question);
    if (!quiet) console.log(`  語言: ${detectedLang}`);

    let searchQuestion = question;
    if (detectedLang === "zh-CN") {
      searchQuestion = await bot.languageService.translateToEnglish(question);
      if (!quiet) console.log(`  翻譯: ${searchQuestion}`);
    }

    const questionEmbedding = await bot.smartProcessor.generateEmbedding(
      searchQuestion,
      "passage",
    );
    if (!quiet)
      console.log(`  embedding: 維度 ${questionEmbedding?.length ?? 0}`);

    const relevantChunks = await bot.retrievalService.retrieveRelevantChunks(
      questionEmbedding,
      searchQuestion,
    );

    const { count, files, topScores } = formatChunkSummary(relevantChunks);
    if (!quiet) {
      console.log(`  檢索: ${count} chunks`);
      if (files.length)
        console.log(
          `  涉及檔案: ${files.slice(0, 8).join(", ")}${files.length > 8 ? " ..." : ""}`,
        );
      if (topScores) console.log(`  前幾筆相似度: ${topScores}`);
    }

    let answer;
    if (relevantChunks.length === 0) {
      answer = bot.languageService.getNoResultsMessage(detectedLang);
      if (!quiet) console.log(`\n【回答】\n${answer}`);
    } else {
      const comparisonMeta = bot.retrievalService.lastComparisonMeta;
      answer = await bot.responseGenerator.generateAnswer(
        question,
        relevantChunks,
        detectedLang,
        comparisonMeta,
      );
      if (!quiet) console.log(`\n【回答】\n${answer}`);
    }

    const elapsed = Date.now() - start;
    if (!quiet)
      console.log(`\n  耗時: ${elapsed}ms | 回答長度: ${answer.length}`);
    else console.log(`[${index}/${total}] ${elapsed}ms | ${answer.length}字`);
    return { ok: true, answer, elapsed };
  } catch (err) {
    if (!quiet) console.error(`  ❌ 錯誤: ${err.message}`);
    else console.log(`[${index}/${total}] ❌ ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    return { ok: false, error: err.message };
  }
}

async function getQuestions(args) {
  if (args.length === 0) {
    if (questList.length > 0) return { questions: questList, quiet: false };
    const stdin = await readStdin();
    if (stdin)
      return {
        questions: stdin
          .trim()
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        quiet: false,
      };
    console.error(
      '在腳本內填寫 questList，或: node scripts/test-questions.js "問題1" "問題2"',
    );
    process.exit(1);
  }
  if (args[0] === "--file" && args[1]) {
    const content = await fs.readFile(args[1], "utf8");
    return {
      questions: content
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      quiet: false,
    };
  }
  if (args[0] === "--quiet" || args[0] === "-q") {
    const rest = args.slice(1);
    if (rest.length === 0 && questList.length > 0)
      return { questions: questList, quiet: true };
    return { questions: rest.length ? rest : questList, quiet: true };
  }
  return { questions: args, quiet: false };
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { questions, quiet } = await getQuestions(args);
  if (questions.length === 0) {
    console.error("沒有輸入問題");
    process.exit(1);
  }

  const bot = new GitBookRAGBot();
  await bot.initializePinecone();
  await bot.initializeEmbedder();
  bot.botInfo = { id: 0, username: "test", first_name: "Test" };
  bot.initializeServices();

  if (!quiet) console.log(`\n🎯 除錯測試：共 ${questions.length} 題\n`);

  for (let i = 0; i < questions.length; i++) {
    await runOne(bot, questions[i], i + 1, questions.length, quiet);
  }

  if (!quiet) console.log(`\n${SEP2}\n🎯 結束\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
