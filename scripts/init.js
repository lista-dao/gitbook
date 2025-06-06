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

// 配置日誌
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

    // 配置
    this.config = {
      branches: ["en"], // 只處理英文分支
      ragBranch: "RAG",
      mainBranch: "main",
      chunkSize: { min: 200, max: 500 },
      indexName: process.env.PINECONE_INDEX_NAME || "gitbook-rag",
    };

    // 初始化智能處理器
    this.smartProcessor = new SmartProcessor(this.config);
  }

  async initialize() {
    try {
      logger.info("開始初始化 GitBook RAG 系統");

      // 初始化 Pinecone
      await this.initializePinecone();

      // 初始化嵌入模型
      await this.initializeEmbedder();

      // 清理舊的索引數據
      await this.clearExistingIndex();

      // 創建 RAG 分支
      await this.createRAGBranch();

      // 處理所有分支
      let totalProcessed = 0;
      for (const branch of this.config.branches) {
        const branchTotal = await this.processBranch(branch);
        totalProcessed += branchTotal;
      }

      // 提交並推送 RAG 分支
      await this.commitAndPushRAG();

      logger.info(
        `GitBook RAG 系統初始化完成，總共處理 ${totalProcessed} 個文本塊`
      );

      // 最終驗證 Pinecone 狀態
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

      // 將 Pinecone 實例傳給智能處理器
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

      // 測試 Pinecone Inference API 連接
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

      // 檢查索引統計
      const stats = await this.index.describeIndexStats();

      if (stats.totalRecordCount > 0) {
        logger.info(`發現 ${stats.totalRecordCount} 個現有向量，開始清理...`);

        // 刪除所有 namespace 中的數據
        const namespaces = Object.keys(stats.namespaces || {});

        if (namespaces.length === 0 || namespaces.includes("")) {
          // 如果只有默認 namespace 或沒有 namespace，直接清空
          await this.index.deleteAll();
          logger.info("已清空默認 namespace 中的所有數據");
        } else {
          // 如果有多個 namespace，逐個清空
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
      // 不拋出錯誤，允許繼續執行
      logger.warn("跳過索引清理，繼續執行初始化");
    }
  }

  async createRAGBranch() {
    try {
      logger.info(`檢查並創建 ${this.config.ragBranch} 分支`);

      // 切換到 main 分支
      await this.git.checkout(this.config.mainBranch);

      // 檢查 RAG 分支是否存在
      const branches = await this.git.branch();
      const ragBranchExists = branches.all.includes(this.config.ragBranch);

      if (!ragBranchExists) {
        // 創建並切換到 RAG 分支
        await this.git.checkoutLocalBranch(this.config.ragBranch);
        logger.info(`成功創建 ${this.config.ragBranch} 分支`);
      } else {
        // 切換到現有的 RAG 分支
        await this.git.checkout(this.config.ragBranch);
        logger.info(`切換到現有的 ${this.config.ragBranch} 分支`);
      }

      // 確保目錄結構存在
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

      // 獲取分支內容
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
      // 使用 ls-tree 遞歸獲取所有文件
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

      // 獲取文件內容
      const content = await this.git.show([`origin/${branch}:${filePath}`]);

      // 保持目錄結構，複製文件到 RAG 分支
      const targetPath = `doc/${branch}/${filePath}`;
      const targetDir = path.dirname(targetPath);

      // 確保目標目錄存在
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, content, "utf8");

      // 解析和分塊
      const chunks = await this.parseAndChunk(content, filePath);

      // 生成嵌入並存儲到 Pinecone
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
      // franc 返回 ISO 639-3 代碼，需要轉換
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

  async parseAndChunk(content, filename) {
    try {
      logger.info(`解析文件 ${filename}`);

      // 1. 提取增強的 metadata
      const metadata = await this.smartProcessor.extractSmartMetadata(
        content,
        filename,
        this.detectLanguage.bind(this)
      );

      // 2. 使用基本分塊
      const chunks = this.basicParseAndChunk(content, filename);

      // 3. 為每個 chunk 附加 metadata
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
      // 使用 marked 解析 markdown
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
          // 保存之前的塊
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

          // 檢查是否需要分塊
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

      // 添加最後一個塊
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
      // 檢查 chunks 是否為有效數組
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
        // 使用智能處理器生成嵌入
        const embedding = await this.smartProcessor.generateEmbedding(
          chunk.content,
          "passage"
        );

        // 使用完整文件路徑生成向量 ID
        const cleanFilename = filename
          .replace(/[\/\\]/g, "_")
          .replace(/\.md$/, "");
        const vectorId = `en_${cleanFilename}_${chunk.index}`;

        // 構建增強的 metadata，統一設為英文
        const enhancedMetadata = {
          lang: "en", // 統一設為英文
          filename: filename, // 保持完整路徑
          filepath: filename, // 添加完整文件路徑
          pair_id: vectorId,
          content: chunk.content,
          chunk_content: chunk.content, // 添加 chunk_content 字段作為備用
          heading: chunk.heading,
          chunk_index: chunk.index,
          // 從智能處理器獲取的增強 metadata
          ...(chunk.metadata || {}),
          // 基本檢測 (作為備用)
          has_code: /```/.test(chunk.content),
          has_links: /\[.*\]\(.*\)/.test(chunk.content),
          // 搜索優化 - 加強 airdrop 等關鍵詞檢測
          searchable_content: this.buildSearchableContent(chunk.content),
        };

        vectors.push({
          id: vectorId,
          values: embedding,
          metadata: enhancedMetadata,
        });
      }

      // 分批上傳到 Pinecone (每批最多100個向量)
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
            // 等待 1 秒後重試
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      // 驗證上傳數量
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

      // 添加所有文件
      await this.git.add(".");

      // 檢查是否有更改
      const status = await this.git.status();
      if (status.files.length === 0) {
        logger.info("沒有需要提交的更改");
        return;
      }

      // 提交
      await this.git.commit(
        "Initial RAG setup: sync content from en and zh branches"
      );

      // 推送
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

      // 等待幾秒讓 Pinecone 完成索引
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

      // 顯示 namespace 分布
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
    // 轉換為小寫並移除多餘空白
    let searchableText = content.toLowerCase().replace(/\s+/g, " ").trim();

    // 添加關鍵概念的變體形式，確保檢索時能匹配
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

    // 檢測並添加相關概念標記
    const detectedConcepts = [];
    for (const [concept, variations] of Object.entries(conceptMappings)) {
      for (const variation of variations) {
        if (searchableText.includes(variation)) {
          detectedConcepts.push(concept);
          break;
        }
      }
    }

    // 在搜索內容前添加概念標記，提高檢索準確性
    if (detectedConcepts.length > 0) {
      searchableText = `concepts:${detectedConcepts.join(
        ","
      )} ${searchableText}`;
    }

    // 限制長度但保留重要信息
    return searchableText.substring(0, 1200);
  }
}

// 主執行函數
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

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = GitBookRAGInitializer;
