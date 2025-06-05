#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
const simpleGit = require("simple-git");
const { marked } = require("marked");
const { Pinecone } = require("@pinecone-database/pinecone");
const winston = require("winston");
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
      branches: ["en", "zh-CN"],
      ragBranch: "RAG",
      mainBranch: "main",
      chunkSize: { min: 200, max: 500 },
      indexName: process.env.PINECONE_INDEX_NAME || "gitbook-rag",
    };
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
      for (const branch of this.config.branches) {
        await this.processBranch(branch);
      }

      // 提交並推送 RAG 分支
      await this.commitAndPushRAG();

      logger.info("GitBook RAG 系統初始化完成");
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
      await fs.mkdir("doc/zh-CN", { recursive: true });
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
      const chunks = this.parseAndChunk(content, filePath);

      // 生成嵌入並存儲到 Pinecone
      await this.storeChunks(chunks, filePath, branch);

      logger.info(`文件 ${filePath} 處理完成，生成 ${chunks.length} 個文本塊`);
      return chunks.length;
    } catch (error) {
      logger.error(`處理文件 ${filePath} 失敗:`, error);
      return 0;
    }
  }

  parseAndChunk(content, filename) {
    try {
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
      logger.error(`解析文件 ${filename} 失敗:`, error);
      return [];
    }
  }

  async storeChunks(chunks, filename, language) {
    try {
      const vectors = [];

      for (const chunk of chunks) {
        // 生成嵌入
        const embedding = await this.generateEmbedding(chunk.content);

        // 使用完整文件路徑生成向量 ID，替換路徑分隔符為下劃線
        const cleanFilename = filename
          .replace(/[\/\\]/g, "_")
          .replace(/\.md$/, "");
        const vectorId = `${cleanFilename}_${chunk.index}`;

        vectors.push({
          id: vectorId,
          values: embedding,
          metadata: {
            lang: language,
            filename: filename, // 保持完整路徑
            filepath: filename, // 添加完整文件路徑
            pair_id: vectorId,
            content: chunk.content,
            heading: chunk.heading,
            chunk_index: chunk.index,
          },
        });
      }

      // 批量上傳到 Pinecone
      if (vectors.length > 0) {
        await this.index.upsert(vectors);
        logger.info(
          `成功上傳 ${vectors.length} 個向量到 Pinecone (${filename})`
        );
      }
    } catch (error) {
      logger.error(`存儲向量失敗 (${filename}):`, error);
      throw error;
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await this.pinecone.inference.embed(
        "multilingual-e5-large",
        [text],
        { inputType: "passage" }
      );
      return response.data[0].values;
    } catch (error) {
      logger.error("生成嵌入失敗:", error);
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
