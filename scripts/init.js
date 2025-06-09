#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
const simpleGit = require("simple-git");
const { marked } = require("marked");
const { Pinecone } = require("@pinecone-database/pinecone");
const winston = require("winston");
const SmartProcessor = require("../bot/smart-processor");
const { franc } = require("franc");
require("dotenv").config();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "init-script" },
  transports: [
    new winston.transports.File({ filename: "logs/init.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

class GitBookRAGInitializer {
  constructor() {
    this.git = simpleGit();
    this.pinecone = null;
    this.index = null;
    this.embedder = null;

    this.config = {
      branches: ["en"],
      ragBranch: "RAG",
      mainBranch: "main",
      chunkSize: { min: 200, max: 500 },
      indexName: process.env.PINECONE_INDEX_NAME || "gitbook-rag",
    };

    this.smartProcessor = new SmartProcessor(this.config);
  }

  async initialize() {
    try {
      logger.info("開始初始化 GitBook RAG 系統");

      await this.initializePinecone();

      await this.initializeEmbedder();

      await this.clearExistingIndex();

      await this.createRAGBranch();

      let totalProcessed = 0;
      for (const branch of this.config.branches) {
        const branchTotal = await this.processBranch(branch);
        totalProcessed += branchTotal;
      }

      await this.commitAndPushRAG();

      logger.info(
        `GitBook RAG 系統初始化完成，總共處理 ${totalProcessed} 個文本塊`
      );

      await this.verifyPineconeStats(totalProcessed);
    } catch (error) {
      logger.error("初始化失敗:", { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async initializePinecone() {
    try {
      logger.info("初始化 Pinecone 連接");

      if (!process.env.PINECONE_API_KEY) {
        throw new Error("PINECONE_API_KEY 環境變量未設置");
      }

      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      this.index = this.pinecone.index(this.config.indexName);

      this.smartProcessor.setPinecone(this.pinecone);

      logger.info("Pinecone 連接初始化成功");
    } catch (error) {
      logger.error("Pinecone 初始化失敗:", error);
      throw error;
    }
  }

  async initializeEmbedder() {
    try {
      logger.info("初始化 Pinecone Inference API");

      await this.pinecone.inference.embed("multilingual-e5-large", ["test"], {
        inputType: "passage",
      });

      logger.info("Pinecone Inference API 初始化成功");
    } catch (error) {
      logger.error("Pinecone Inference API 初始化失敗:", error);
      throw error;
    }
  }

  async clearExistingIndex() {
    try {
      logger.info("檢查並清理現有索引數據");

      const stats = await this.index.describeIndexStats();

      if (stats.totalRecordCount > 0) {
        logger.info(`發現 ${stats.totalRecordCount} 個現有向量，開始清理...`);

        const namespaces = Object.keys(stats.namespaces || {});

        if (namespaces.length === 0 || namespaces.includes("")) {
          await this.index.deleteAll();
          logger.info("已清空默認 namespace 中的所有數據");
        } else {
          for (const ns of namespaces) {
            if (ns) {
              await this.index.namespace(ns).deleteAll();
              logger.info(`已清空 namespace "${ns}" 中的數據`);
            } else {
              await this.index.deleteAll();
              logger.info("已清空默認 namespace 中的數據");
            }
          }
        }

        logger.info("索引清理完成");
      } else {
        logger.info("索引為空，無需清理");
      }
    } catch (error) {
      logger.error("清理索引失敗:", error);
    }
  }

  async createRAGBranch() {
    try {
      logger.info(`檢查並創建 ${this.config.ragBranch} 分支`);

      await this.git.checkout(this.config.mainBranch);

      const branches = await this.git.branch();
      const ragBranchExists = branches.all.includes(this.config.ragBranch);

      if (!ragBranchExists) {
        await this.git.checkoutLocalBranch(this.config.ragBranch);
        logger.info(`成功創建 ${this.config.ragBranch} 分支`);
      } else {
        await this.git.checkout(this.config.ragBranch);
        logger.info(`切換到現有的 ${this.config.ragBranch} 分支`);
      }

      await fs.mkdir("doc", { recursive: true });
      await fs.mkdir("doc/en", { recursive: true });
    } catch (error) {
      logger.error("RAG 分支創建失敗:", error);
      throw error;
    }
  }

  async processBranch(branch) {
    try {
      logger.info(`開始處理 ${branch} 分支`);

      await this.git.fetch("origin", branch);
      const files = await this.getMarkdownFiles(branch);

      logger.info(`${branch} 分支找到 ${files.length} 個 Markdown 文件`);

      let totalChunks = 0;

      for (const file of files) {
        const chunks = await this.processFile(file, branch);
        totalChunks += chunks;
      }

      logger.info(`${branch} 分支處理完成，共生成 ${totalChunks} 個文本塊`);
      return totalChunks;
    } catch (error) {
      logger.error(`處理 ${branch} 分支失敗:`, error);
      throw error;
    }
  }

  async getMarkdownFiles(branch) {
    try {
      const files = await this.git.raw([
        "ls-tree",
        "-r",
        "--name-only",
        `origin/${branch}`,
      ]);

      const markdownFiles = files
        .split("\n")
        .filter((file) => file.endsWith(".md") && file.trim())
        .map((file) => file.trim());

      logger.info(
        `${branch} 分支發現 ${markdownFiles.length} 個 Markdown 文件`
      );
      markdownFiles.forEach((file) => logger.info(`  - ${file}`));

      return markdownFiles;
    } catch (error) {
      logger.error(`獲取 ${branch} 分支文件列表失敗:`, error);
      return [];
    }
  }

  async processFile(filePath, branch) {
    try {
      logger.info(`處理文件: ${filePath} (${branch})`);

      const content = await this.git.show([`origin/${branch}:${filePath}`]);

      const targetPath = `doc/${branch}/${filePath}`;
      const targetDir = path.dirname(targetPath);

      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, content, "utf8");

      const chunks = await this.parseAndChunk(content, filePath);

      await this.storeChunks(chunks, filePath);

      logger.info(`文件 ${filePath} 處理完成，生成 ${chunks.length} 個文本塊`);
      return chunks.length;
    } catch (error) {
      logger.error(`處理文件 ${filePath} 失敗:`, error);
      return 0;
    }
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
      return text.match(/[\u4e00-\u9fff]/) ? "zh-CN" : "en";
    }
  }

  async parseAndChunk(content, filename) {
    try {
      logger.info(`解析文件 ${filename}`);

      const metadata = await this.smartProcessor.extractSmartMetadata(
        content,
        filename,
        this.detectLanguage.bind(this)
      );

      const chunks = this.basicParseAndChunk(content, filename);

      return chunks.map((chunk) => ({
        ...chunk,
        metadata: metadata,
      }));
    } catch (error) {
      logger.error(`解析文件 ${filename} 失敗:`, error);
      return [];
    }
  }

  basicParseAndChunk(content, filename) {
    try {
      logger.info(`使用基本解析方法處理 ${filename}`);
      const tokens = marked.lexer(content);
      const chunks = [];
      let currentChunk = "";
      let currentHeading = "";
      let chunkIndex = 1;

      for (const token of tokens) {
        if (
          token.type === "heading" &&
          (token.depth === 1 || token.depth === 2)
        ) {
          if (currentChunk.length >= this.config.chunkSize.min) {
            chunks.push({
              content: currentChunk.trim(),
              heading: currentHeading,
              filename: filename,
              index: chunkIndex++,
            });
            currentChunk = "";
          }

          currentHeading = token.text;
          currentChunk += `# ${token.text}\n\n`;
        } else if (
          token.type === "paragraph" ||
          token.type === "list" ||
          token.type === "blockquote"
        ) {
          const text = token.raw || token.text || "";
          currentChunk += text + "\n\n";

          if (currentChunk.length >= this.config.chunkSize.max) {
            chunks.push({
              content: currentChunk.trim(),
              heading: currentHeading,
              filename: filename,
              index: chunkIndex++,
            });
            currentChunk = "";
          }
        }
      }

      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          heading: currentHeading,
          filename: filename,
          index: chunkIndex,
        });
      }

      return chunks;
    } catch (error) {
      logger.error(`基本解析文件 ${filename} 失敗:`, error);
      return [];
    }
  }

  async storeChunks(chunks, filename) {
    try {
      if (!Array.isArray(chunks)) {
        logger.error(`chunks 不是數組: ${typeof chunks} (${filename})`);
        return 0;
      }

      if (chunks.length === 0) {
        logger.warn(`沒有文本塊需要存儲 (${filename})`);
        return 0;
      }

      const vectors = [];
      let totalUploaded = 0;

      for (const chunk of chunks) {
        const embedding = await this.smartProcessor.generateEmbedding(
          chunk.content,
          "passage"
        );

        const cleanFilename = filename
          .replace(/[\/\\]/g, "_")
          .replace(/\.md$/, "");
        const vectorId = `en_${cleanFilename}_${chunk.index}`;

        const enhancedMetadata = {
          lang: "en",
          filename: filename,
          filepath: filename,
          pair_id: vectorId,
          content: chunk.content,
          chunk_content: chunk.content,
          heading: chunk.heading,
          chunk_index: chunk.index,
          ...(chunk.metadata || {}),
          has_code: /```/.test(chunk.content),
          has_links: /\[.*\]\(.*\)/.test(chunk.content),
        };

        vectors.push({
          id: vectorId,
          values: embedding,
          metadata: enhancedMetadata,
        });
      }

      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);

        let retries = 3;
        while (retries > 0) {
          try {
            await this.index.upsert(batch);
            totalUploaded += batch.length;
            logger.info(
              `批次上傳成功: ${batch.length} 個向量 (${filename}, 批次 ${
                Math.floor(i / batchSize) + 1
              })`
            );
            break;
          } catch (error) {
            retries--;
            logger.warn(
              `批次上傳失敗 (${filename}), 剩餘重試次數: ${retries}`,
              error.message
            );
            if (retries === 0) {
              throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (totalUploaded === vectors.length) {
        logger.info(
          `成功上傳 ${totalUploaded} 個向量到 Pinecone (${filename})`
        );
      } else {
        logger.error(
          `上傳數量不匹配: 期望 ${vectors.length}, 實際 ${totalUploaded} (${filename})`
        );
      }

      return totalUploaded;
    } catch (error) {
      logger.error(`存儲向量失敗 (${filename}):`, error);
      throw error;
    }
  }

  async commitAndPushRAG() {
    try {
      logger.info(`提交並推送 ${this.config.ragBranch} 分支`);

      await this.git.add(".");

      const status = await this.git.status();
      if (status.files.length === 0) {
        logger.info("沒有需要提交的更改");
        return;
      }

      await this.git.commit(
        "Initial RAG setup: sync content from en and zh branches"
      );

      await this.git.push("origin", this.config.ragBranch);

      logger.info(`${this.config.ragBranch} 分支推送成功`);
    } catch (error) {
      logger.error("提交推送失敗:", error);
      throw error;
    }
  }

  async verifyPineconeStats(expectedCount) {
    try {
      logger.info("驗證 Pinecone 索引狀態...");

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const stats = await this.index.describeIndexStats();

      logger.info(`Pinecone 索引統計: ${stats.totalRecordCount} 條記錄`);
      logger.info(`期望記錄數: ${expectedCount}`);

      if (stats.totalRecordCount === expectedCount) {
        logger.info("✅ 記錄數匹配，上傳成功！");
      } else {
        logger.warn(
          `⚠️ 記錄數不匹配！期望: ${expectedCount}, 實際: ${stats.totalRecordCount}`
        );
        logger.warn(
          "可能原因: 1) 部分上傳失敗 2) Pinecone 同步延遲 3) 重複 ID 覆蓋"
        );
      }

      if (stats.namespaces) {
        Object.entries(stats.namespaces).forEach(([ns, data]) => {
          logger.info(`Namespace ${ns || "default"}: ${data.recordCount} 記錄`);
        });
      }
    } catch (error) {
      logger.error("驗證 Pinecone 狀態失敗:", error);
    }
  }

  buildSearchableContent(content) {
    let searchableText = content.toLowerCase().replace(/\s+/g, " ").trim();

    const conceptMappings = {
      airdrop: [
        "airdrop",
        "空投",
        "token distribution",
        "代幣分發",
        "drop",
        "claim",
      ],
      staking: ["staking", "質押", "stake", "validator", "驗證者"],
      governance: ["governance", "治理", "voting", "投票", "dao"],
      lending: ["lending", "借貸", "borrow", "lend", "vault"],
      lista: ["lista", "lista dao", "lista protocol"],
    };

    const detectedConcepts = [];
    for (const [concept, variations] of Object.entries(conceptMappings)) {
      for (const variation of variations) {
        if (searchableText.includes(variation)) {
          detectedConcepts.push(concept);
          break;
        }
      }
    }

    if (detectedConcepts.length > 0) {
      searchableText = `concepts:${detectedConcepts.join(
        ","
      )} ${searchableText}`;
    }

    return searchableText.substring(0, 1200);
  }
}

async function main() {
  const initializer = new GitBookRAGInitializer();

  try {
    await initializer.initialize();
    logger.info("🎉 初始化完成！");
    process.exit(0);
  } catch (error) {
    logger.error("💥 初始化失敗:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = GitBookRAGInitializer;
