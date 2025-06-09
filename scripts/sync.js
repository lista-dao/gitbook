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

    this.config = {
      branches: ["en"],
      ragBranch: "RAG",
      chunkSize: { min: 200, max: 500 },
      indexName: process.env.PINECONE_INDEX_NAME || "gitbook-rag",
    };

    this.smartProcessor = new SmartProcessor(this.config);
  }

  async sync() {
    try {
      logger.info("開始增量同步");

      const changedBranch =
        process.env.GITHUB_REF_NAME || (await this.detectChangedBranch());

      if (!this.config.branches.includes(changedBranch)) {
        logger.info(`分支 ${changedBranch} 不在同步範圍內，跳過`);
        return;
      }

      await this.initializePinecone();
      await this.initializeEmbedder();

      await this.git.checkout(this.config.ragBranch);

      const changedFiles = await this.getChangedMarkdownFiles(changedBranch);

      if (changedFiles.length === 0) {
        logger.info("沒有 Markdown 文件變更");
        return;
      }

      logger.info(`檢測到 ${changedFiles.length} 個變更的 Markdown 文件`);

      for (const file of changedFiles) {
        await this.syncFile(file, changedBranch);
      }

      logger.info("增量同步完成");
    } catch (error) {
      logger.error("同步失敗:", { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async detectChangedBranch() {
    try {
      if (process.env.GITHUB_REF_NAME) {
        return process.env.GITHUB_REF_NAME;
      }

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

      this.smartProcessor.setPinecone(this.pinecone);

      logger.info("Pinecone 連接成功");
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

  async getChangedMarkdownFiles(branch) {
    try {
      await this.git.fetch("origin", branch);
      const diff = await this.git.diffSummary([
        `origin/${branch}~1`,
        `origin/${branch}`,
      ]);

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

      let content;
      try {
        content = await this.git.show([`origin/${branch}:${filePath}`]);
      } catch (error) {
        logger.info(`文件 ${filePath} 可能已被刪除，清理相關向量`);
        await this.cleanupFileVectors(filePath);
        return;
      }

      const targetPath = `doc/${branch}/${filePath}`;
      const targetDir = path.dirname(targetPath);

      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, content, "utf8");

      await this.cleanupFileVectors(filePath);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const chunks = await this.parseAndChunk(content, filePath);
      await this.storeChunks(chunks, filePath, branch);

      logger.info(`文件 ${filePath} 同步完成，生成 ${chunks.length} 個文本塊`);
    } catch (error) {
      logger.error(`同步文件 ${filePath} 失敗:`, error);
      throw error;
    }
  }

  async cleanupFileVectors(filePath) {
    try {
      const queryResponse = await this.index.query({
        vector: new Array(1024).fill(0),
        filter: { filename: filePath },
        topK: 100,
        includeMetadata: true,
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const idsToDelete = queryResponse.matches.map((match) => match.id);
        await this.index.deleteMany(idsToDelete);
        logger.info(`清理文件 ${filePath} 的 ${idsToDelete.length} 個舊向量`);
      }
    } catch (error) {
      logger.error(`清理文件 ${filePath} 向量失敗:`, error);
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
      logger.error(`降級解析文件 ${filename} 失敗:`, error);
      return [];
    }
  }

  async storeChunks(chunks, filename, language) {
    try {
      if (!Array.isArray(chunks)) {
        logger.error(`chunks 不是數組: ${typeof chunks} (${filename})`);
        return;
      }

      if (chunks.length === 0) {
        logger.warn(`沒有文本塊需要存儲 (${filename})`);
        return;
      }

      const vectors = [];

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
      let totalUploaded = 0;

      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);

        let retries = 3;
        while (retries > 0) {
          try {
            await this.index.upsert(batch);
            totalUploaded += batch.length;
            logger.info(`批次上传成功: ${batch.length} 个向量 (${filename})`);
            break;
          } catch (error) {
            retries--;
            logger.warn(
              `批次上传失败 (${filename}), 剩余重试次数: ${retries}`,
              error.message
            );
            if (retries === 0) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      logger.info(`成功上传 ${totalUploaded} 个向量到 Pinecone (${filename})`);
    } catch (error) {
      logger.error(`存儲向量失敗 (${filename}):`, error);
      throw error;
    }
  }
}

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
