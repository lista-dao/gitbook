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
      stateFile: ".sync-state.json",
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
      await this.git.fetch("origin", changedBranch);

      const state = await this.readState();
      const targetSha = (
        await this.git.revparse([`origin/${changedBranch}`])
      ).trim();

      if (!state || state.branch !== changedBranch) {
        throw new Error(
          `No usable .sync-state.json for branch ${changedBranch}. Run scripts/reconcile-from-en.js --apply first to establish baseline.`
        );
      }
      if (state.lastSyncedSha === targetSha) {
        logger.info(`已是最新 (${targetSha.slice(0, 7)})，跳過`);
        return;
      }

      const isAncestor = await this.isAncestor(
        state.lastSyncedSha,
        targetSha
      );
      if (!isAncestor) {
        throw new Error(
          `lastSyncedSha ${state.lastSyncedSha} is not an ancestor of origin/${changedBranch} (${targetSha}). History may have been rewritten — run reconcile to recover.`
        );
      }

      const changes = await this.getChangedMarkdownFilesWithStatus(
        state.lastSyncedSha,
        targetSha
      );

      if (changes.length === 0) {
        logger.info("沒有 Markdown 文件變更");
        await this.writeState(changedBranch, targetSha);
        return;
      }

      logger.info(
        `從 ${state.lastSyncedSha.slice(0, 7)} → ${targetSha.slice(
          0,
          7
        )}，檢測到 ${changes.length} 個 Markdown 變更`
      );

      for (const change of changes) {
        await this.applyChange(change, changedBranch);
      }

      await this.writeState(changedBranch, targetSha);
      logger.info("增量同步完成");
    } catch (error) {
      logger.error("同步失敗:", { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async readState() {
    try {
      const raw = await fs.readFile(this.config.stateFile, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      if (e.code === "ENOENT") return null;
      logger.warn(`讀取 ${this.config.stateFile} 失敗:`, e.message);
      return null;
    }
  }

  async writeState(branch, sha) {
    const payload = {
      branch,
      lastSyncedSha: sha,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      this.config.stateFile,
      JSON.stringify(payload, null, 2) + "\n"
    );
    logger.info(`狀態已更新: ${branch}@${sha.slice(0, 7)}`);
  }

  async isAncestor(ancestorSha, descendantSha) {
    try {
      await this.git.raw([
        "merge-base",
        "--is-ancestor",
        ancestorSha,
        descendantSha,
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async getChangedMarkdownFilesWithStatus(fromSha, toSha) {
    try {
      const raw = await this.git.raw([
        "diff",
        "--name-status",
        "-M",
        `${fromSha}..${toSha}`,
      ]);
      const changes = [];
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        const parts = line.split("\t");
        const code = parts[0];
        if (code.startsWith("R")) {
          const [, oldPath, newPath] = parts;
          if (!newPath.endsWith(".md") && !oldPath.endsWith(".md")) continue;
          changes.push({ status: "R", oldPath, newPath });
        } else if (code === "A" || code === "M" || code === "C") {
          const filePath = parts[1];
          if (!filePath.endsWith(".md")) continue;
          changes.push({ status: code === "C" ? "A" : code, filePath });
        } else if (code === "D") {
          const filePath = parts[1];
          if (!filePath.endsWith(".md")) continue;
          changes.push({ status: "D", filePath });
        } else if (code === "T") {
          const filePath = parts[1];
          if (!filePath.endsWith(".md")) continue;
          changes.push({ status: "M", filePath });
        }
      }
      return changes;
    } catch (error) {
      logger.error("獲取變更文件失敗:", error);
      throw error;
    }
  }

  async applyChange(change, branch) {
    if (change.status === "A" || change.status === "M") {
      logger.info(`[${change.status}] ${change.filePath}`);
      await this.syncFile(change.filePath, branch);
    } else if (change.status === "D") {
      logger.info(`[D] ${change.filePath}`);
      await this.deleteFile(change.filePath, branch);
    } else if (change.status === "R") {
      const oldIsMd = change.oldPath.endsWith(".md");
      const newIsMd = change.newPath.endsWith(".md");
      logger.info(`[R] ${change.oldPath} → ${change.newPath}`);
      if (oldIsMd) await this.deleteFile(change.oldPath, branch);
      if (newIsMd) await this.syncFile(change.newPath, branch);
    }
  }

  async deleteFile(filePath, branch) {
    await this.cleanupFileVectors(filePath);
    const localPath = path.join(`doc/${branch}`, filePath);
    try {
      await fs.unlink(localPath);
      logger.info(`已刪除本地文件: ${localPath}`);
    } catch (e) {
      if (e.code !== "ENOENT") logger.warn(`刪除 ${localPath} 失敗:`, e.message);
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

  // Deterministic deletion by ID prefix.
  // Pinecone metadata-filter delete is gated behind enterprise tiers and
  // a topK-bounded query can leak vectors for files with many chunks,
  // so we list by ID prefix and page through everything.
  // Failures throw so callers (sync state advancement) don't proceed on
  // partial cleanup.
  async cleanupFileVectors(filePath) {
    const cleanFilename = filePath
      .replace(/[\/\\]/g, "_")
      .replace(/\.md$/, "");
    const idPrefix = `en_${cleanFilename}_`;

    const ids = [];
    let paginationToken;
    do {
      const res = await this.index.listPaginated({
        prefix: idPrefix,
        ...(paginationToken ? { paginationToken } : {}),
      });
      for (const v of res.vectors || []) ids.push(v.id);
      paginationToken = res.pagination?.next;
    } while (paginationToken);

    if (ids.length === 0) return;

    const batchSize = 1000;
    for (let i = 0; i < ids.length; i += batchSize) {
      await this.index.deleteMany(ids.slice(i, i + batchSize));
    }
    logger.info(`清理文件 ${filePath} 的 ${ids.length} 個舊向量`);
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
          token.type === "blockquote" ||
          token.type === "table"
        ) {
          const text = token.raw || token.text || "";
          currentChunk += text + "\n\n";
          const sizeLimit =
            token.type === "table"
              ? this.config.chunkSize.max * 3
              : this.config.chunkSize.max;
          if (currentChunk.length >= sizeLimit) {
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
