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
  defaultMeta: { service: "sync-script" },
  transports: [
    new winston.transports.File({ filename: "logs/sync.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

class GitBookRAGSyncer {
  constructor() {
    this.git = simpleGit();
    this.pinecone = null;
    this.index = null;
    this.embedder = null;

    // 配置
    this.config = {
      branches: ["en", "zh-CN"],
      ragBranch: "RAG",
      chunkSize: { min: 200, max: 500 },
      indexName: process.env.PINECONE_INDEX_NAME || "gitbook-rag",
    };

    // 初始化智能處理器
    this.smartProcessor = new SmartProcessor(this.config);
  }

  async sync() {
    try {
      logger.info("開始增量同步");

      // 獲取變更的分支
      const changedBranch =
        process.env.GITHUB_REF_NAME || (await this.detectChangedBranch());

      if (!this.config.branches.includes(changedBranch)) {
        logger.info(`分支 ${changedBranch} 不在同步範圍內，跳過`);
        return;
      }

      // 初始化組件
      await this.initializePinecone();
      await this.initializeEmbedder();

      // 切換到 RAG 分支
      await this.git.checkout(this.config.ragBranch);

      // 獲取變更文件
      const changedFiles = await this.getChangedMarkdownFiles(changedBranch);

      if (changedFiles.length === 0) {
        logger.info("沒有 Markdown 文件變更");
        return;
      }

      logger.info(`檢測到 ${changedFiles.length} 個變更的 Markdown 文件`);

      // 處理變更文件
      for (const file of changedFiles) {
        await this.syncFile(file, changedBranch);
      }

      // 提交變更
      await this.commitChanges(changedBranch, changedFiles.length);

      logger.info("增量同步完成");
    } catch (error) {
      logger.error("同步失敗:", { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async detectChangedBranch() {
    try {
      // 在 GitHub Actions 環境中，通過環境變量獲取
      if (process.env.GITHUB_REF_NAME) {
        return process.env.GITHUB_REF_NAME;
      }

      // 本地開發時，檢查最近的提交
      const status = await this.git.status();
      return status.current;
    } catch (error) {
      logger.error("檢測變更分支失敗:", error);
      return null;
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

      logger.info("Pinecone 連接成功");
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

  async getChangedMarkdownFiles(branch) {
    try {
      // 獲取最近兩次提交的差異
      await this.git.fetch("origin", branch);
      const diff = await this.git.diffSummary([
        `origin/${branch}~1`,
        `origin/${branch}`,
      ]);

      // 過濾出 Markdown 文件
      const markdownFiles = diff.files
        .filter((file) => file.file.endsWith(".md"))
        .map((file) => file.file);

      logger.info(`${branch} 分支變更的 Markdown 文件:`, markdownFiles);
      return markdownFiles;
    } catch (error) {
      logger.error(`獲取 ${branch} 分支變更文件失敗:`, error);
      return [];
    }
  }

  async syncFile(filePath, branch) {
    try {
      logger.info(`同步文件: ${filePath} (${branch})`);

      // 獲取文件內容
      let content;
      try {
        content = await this.git.show([`origin/${branch}:${filePath}`]);
      } catch (error) {
        // 文件可能被刪除
        logger.info(`文件 ${filePath} 可能已被刪除，清理相關向量`);
        await this.cleanupFileVectors(filePath);
        return;
      }

      // 複製文件到 RAG 分支
      const targetDir = branch === "zh-CN" ? "doc/zh-CN" : "doc/en";
      const targetPath = `${targetDir}/${path.basename(filePath)}`;

      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, content, "utf8");

      // 清理舊向量
      await this.cleanupFileVectors(path.basename(filePath));

      // 處理新內容
      const chunks = this.parseAndChunk(content, filePath);
      await this.storeChunks(chunks, filePath, branch);

      logger.info(`文件 ${filePath} 同步完成，生成 ${chunks.length} 個文本塊`);
    } catch (error) {
      logger.error(`同步文件 ${filePath} 失敗:`, error);
      throw error;
    }
  }

  async cleanupFileVectors(filename) {
    try {
      const baseFilename = path.basename(filename, ".md");

      // 查詢現有向量
      const queryResponse = await this.index.query({
        vector: new Array(1024).fill(0), // 佔位向量
        filter: { filename: path.basename(filename) },
        topK: 100,
        includeMetadata: true,
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const idsToDelete = queryResponse.matches.map((match) => match.id);
        await this.index.deleteMany(idsToDelete);
        logger.info(`清理文件 ${filename} 的 ${idsToDelete.length} 個舊向量`);
      }
    } catch (error) {
      logger.error(`清理文件 ${filename} 向量失敗:`, error);
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
      logger.info(`使用智能處理器解析 ${filename}`);

      // 1. 提取智能 metadata
      const metadata = await this.smartProcessor.extractSmartMetadata(
        content,
        filename,
        this.detectLanguage.bind(this)
      );

      // 2. 智能分塊
      const chunks = this.smartProcessor.smartChunking(content, metadata, 800);

      // 3. 轉換為舊格式以兼容現有代碼
      return chunks.map((chunk, index) => ({
        content: chunk.content,
        heading: chunk.heading || metadata.topics?.[0] || "",
        filename: filename,
        index: index + 1,
        // 附加智能 metadata
        metadata: metadata,
        chunk_type: chunk.type,
        has_contracts: chunk.has_contracts,
      }));
    } catch (error) {
      logger.error(`智能解析文件 ${filename} 失敗:`, error);
      // 降級到原有邏輯
      return this.fallbackParseAndChunk(content, filename);
    }
  }

  fallbackParseAndChunk(content, filename) {
    try {
      logger.warn(`使用降級解析方法處理 ${filename}`);
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
      logger.error(`降級解析文件 ${filename} 失敗:`, error);
      return [];
    }
  }

  async storeChunks(chunks, filename, language) {
    try {
      const vectors = [];

      for (const chunk of chunks) {
        const embedding = await this.generateEmbedding(chunk.content);
        const langPrefix = language === "zh-CN" ? "zh-CN" : "en";
        const vectorId = `${langPrefix}_${path.basename(filename, ".md")}_${
          chunk.index
        }`;

        // 構建增強的 metadata
        const enhancedMetadata = {
          lang: language === "zh-CN" ? "zh-CN" : "en",
          filename: path.basename(filename),
          pair_id: vectorId,
          content: chunk.content,
          heading: chunk.heading,
          chunk_index: chunk.index,
          // 新增智能 metadata
          ...(chunk.metadata || {}),
          chunk_type: chunk.chunk_type || "text",
          has_contracts: chunk.has_contracts || false,
          // 搜索優化
          searchable_content: chunk.content.toLowerCase().substring(0, 1000),
        };

        vectors.push({
          id: vectorId,
          values: embedding,
          metadata: enhancedMetadata,
        });
      }

      if (vectors.length > 0) {
        await this.index.upsert(vectors);
        logger.info(`上傳 ${vectors.length} 個新向量 (${filename})`);
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

  async commitChanges(branch, fileCount) {
    try {
      await this.git.add(".");

      const status = await this.git.status();
      if (status.files.length === 0) {
        logger.info("沒有需要提交的更改");
        return;
      }

      const message = `Sync ${fileCount} file(s) from ${branch} branch`;
      await this.git.commit(message);

      // 推送到遠程
      await this.git.push("origin", this.config.ragBranch);

      logger.info(`提交並推送完成: ${message}`);
    } catch (error) {
      logger.error("提交變更失敗:", error);
      throw error;
    }
  }
}

// 主執行函數
async function main() {
  const syncer = new GitBookRAGSyncer();

  try {
    await syncer.sync();
    logger.info("🚀 同步完成！");
    process.exit(0);
  } catch (error) {
    logger.error("💥 同步失敗:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = GitBookRAGSyncer;
