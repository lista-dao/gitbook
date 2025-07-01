#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
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
  defaultMeta: { service: "manual-sync" },
  transports: [
    new winston.transports.File({ filename: "logs/manual-sync.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

class ManualSyncer {
  constructor() {
    this.pinecone = null;
    this.index = null;

    this.config = {
      chunkSize: { min: 200, max: 500 },
      indexName: process.env.PINECONE_INDEX_NAME || "gitbook-rag",
      manualDir: "doc/manual", // 手动文件存放目录（与系统结构一致）
      toSyncDir: "to-sync", // 待同步文件夹
    };

    this.smartProcessor = new SmartProcessor(this.config);
  }

  async initialize() {
    try {
      logger.info("初始化手动同步工具");

      await this.initializePinecone();
      await this.initializeEmbedder();

      // 确保必要目录存在
      await fs.mkdir(this.config.manualDir, { recursive: true });
      await fs.mkdir(this.config.toSyncDir, { recursive: true });

      logger.info("手动同步工具初始化完成");
    } catch (error) {
      logger.error("初始化失败:", error);
      throw error;
    }
  }

  async initializePinecone() {
    try {
      logger.info("初始化 Pinecone 连接");

      if (!process.env.PINECONE_API_KEY) {
        throw new Error("PINECONE_API_KEY 环境变量未设置");
      }

      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      this.index = this.pinecone.index(this.config.indexName);
      this.smartProcessor.setPinecone(this.pinecone);

      logger.info("Pinecone 连接成功");
    } catch (error) {
      logger.error("Pinecone 初始化失败:", error);
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
      logger.error("Pinecone Inference API 初始化失败:", error);
      throw error;
    }
  }

  /**
   * 批量处理to-sync文件夹中的所有文件
   */
  async processToSyncFolder() {
    try {
      logger.info("开始批量处理to-sync文件夹");

      const files = await fs.readdir(this.config.toSyncDir);
      const markdownFiles = files.filter((file) => file.endsWith(".md"));

      if (markdownFiles.length === 0) {
        logger.info("to-sync文件夹中没有找到markdown文件");
        return { total: 0, successful: 0, failed: 0 };
      }

      logger.info(`找到 ${markdownFiles.length} 个待同步的文件`);

      let successful = 0;
      let failed = 0;
      const failedFiles = [];

      for (const filename of markdownFiles) {
        const filePath = path.join(this.config.toSyncDir, filename);
        try {
          logger.info(`开始处理: ${filename}`);

          const count = await this.syncFile(filePath);

          // 同步成功，删除源文件（因为已复制到 doc/manual）
          await fs.unlink(filePath);

          successful++;
          logger.info(
            `✅ ${filename} 同步成功，已移除源文件 (${count} 个向量)`
          );
        } catch (error) {
          failed++;
          failedFiles.push({ filename, error: error.message });
          logger.error(`❌ ${filename} 同步失败:`, error);
        }
      }

      const result = {
        total: markdownFiles.length,
        successful,
        failed,
        failedFiles,
      };

      logger.info(`批量同步完成: ${successful}成功, ${failed}失败`);
      if (failedFiles.length > 0) {
        logger.info(
          "失败的文件:",
          failedFiles.map((f) => f.filename)
        );
      }

      return result;
    } catch (error) {
      logger.error("批量处理to-sync文件夹失败:", error);
      throw error;
    }
  }

  /**
   * 同步单个文件
   */
  async syncFile(filePath) {
    try {
      logger.info(`开始同步文件: ${filePath}`);

      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      const content = await fs.readFile(filePath, "utf8");
      const filename = path.basename(filePath);

      // 先清理该文件的旧向量
      await this.cleanupFileVectors(filename);

      // 等待清理完成
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 解析并切分内容
      const chunks = await this.parseAndChunk(content, filename);

      if (chunks.length === 0) {
        logger.warn(`文件 ${filename} 没有生成任何有效块`);
        return 0;
      }

      // 存储到 Pinecone
      const uploadedCount = await this.storeChunks(chunks, filename);

      // 复制到手动目录
      const targetPath = path.join(this.config.manualDir, filename);
      await fs.copyFile(filePath, targetPath);

      logger.info(
        `文件 ${filename} 同步完成，生成 ${chunks.length} 个文本块，上传 ${uploadedCount} 个向量`
      );
      return uploadedCount;
    } catch (error) {
      logger.error(`同步文件 ${filePath} 失败:`, error);
      throw error;
    }
  }

  /**
   * 批量同步目录中的所有 md 文件
   */
  async syncDirectory(dirPath) {
    try {
      logger.info(`开始批量同步目录: ${dirPath}`);

      const files = await fs.readdir(dirPath);
      const markdownFiles = files.filter((file) => file.endsWith(".md"));

      if (markdownFiles.length === 0) {
        logger.info(`目录 ${dirPath} 中没有找到 markdown 文件`);
        return 0;
      }

      let totalUploaded = 0;

      for (const filename of markdownFiles) {
        const filePath = path.join(dirPath, filename);
        try {
          const count = await this.syncFile(filePath);
          totalUploaded += count;
        } catch (error) {
          logger.error(`处理文件 ${filename} 失败:`, error);
          // 继续处理其他文件
        }
      }

      logger.info(`批量同步完成，总共上传 ${totalUploaded} 个向量`);
      return totalUploaded;
    } catch (error) {
      logger.error(`批量同步目录 ${dirPath} 失败:`, error);
      throw error;
    }
  }

  async cleanupFileVectors(filename) {
    try {
      // 使用零向量查询相同文件名的向量
      const queryResponse = await this.index.query({
        vector: new Array(1024).fill(0),
        filter: { filename: filename },
        topK: 100,
        includeMetadata: true,
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const idsToDelete = queryResponse.matches.map((match) => match.id);
        await this.index.deleteMany(idsToDelete);
        logger.info(`清理文件 ${filename} 的 ${idsToDelete.length} 个旧向量`);
      }
    } catch (error) {
      logger.error(`清理文件 ${filename} 向量失败:`, error);
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
      logger.error("语言检测失败:", error);
      return text.match(/[\u4e00-\u9fff]/) ? "zh-CN" : "en";
    }
  }

  /**
   * 解析文章格式的元数据，智能判断来源平台
   */
  extractMediumMetadata(content) {
    const metadata = {};

    // 提取 source 链接
    const sourceMatch = content.match(/>\s*\*\*Source:\*\*\s*(.+)/);
    if (sourceMatch) {
      const sourceUrl = sourceMatch[1].trim();
      metadata.source_url = sourceUrl;

      // 从 URL 智能判断平台类型
      if (sourceUrl.includes("medium.com")) {
        metadata.content_type = "medium_article";
      } else if (
        sourceUrl.includes("twitter.com") ||
        sourceUrl.includes("x.com")
      ) {
        metadata.content_type = "twitter_post";
      } else if (sourceUrl.includes("linkedin.com")) {
        metadata.content_type = "linkedin_post";
      } else if (sourceUrl.includes("substack.com")) {
        metadata.content_type = "substack_article";
      } else if (sourceUrl.includes("mirror.xyz")) {
        metadata.content_type = "mirror_post";
      } else {
        metadata.content_type = "web_article";
      }
    }

    // 提取作者信息（只保留作者名，移除不重要的handle）
    const authorMatch = content.match(
      /\[([^\]]+)\]\(https:\/\/medium\.com\/@([^?)]+)/
    );
    if (authorMatch) {
      metadata.author = authorMatch[1];
    }

    // 检查是否包含 Lista DAO 相关内容
    const listaKeywords = [
      "lista dao",
      "listadao",
      "lista",
      "liquidation",
      "lending",
    ];
    const hasListaContent = listaKeywords.some((keyword) =>
      content.toLowerCase().includes(keyword)
    );
    if (hasListaContent) {
      metadata.project = "Lista DAO";
    }

    metadata.source_type = "manual";

    return metadata;
  }

  async parseAndChunk(content, filename) {
    try {
      logger.info(`解析文件 ${filename}`);

      // 提取 Medium 特有的元数据
      const mediumMetadata = this.extractMediumMetadata(content);

      // 使用智能处理器提取元数据
      const smartMetadata = await this.smartProcessor.extractSmartMetadata(
        content,
        filename,
        this.detectLanguage.bind(this)
      );

      // 合并元数据
      const combinedMetadata = { ...smartMetadata, ...mediumMetadata };

      // 基本解析和切分
      const chunks = this.parseAndChunkContent(content, filename);

      // 为每个块添加元数据
      return chunks.map((chunk) => ({
        ...chunk,
        metadata: combinedMetadata,
      }));
    } catch (error) {
      logger.error(`解析文件 ${filename} 失败:`, error);
      return [];
    }
  }

  parseAndChunkContent(content, filename) {
    try {
      logger.info(`切分内容 ${filename}`);

      // 清理内容（移除 source 链接和 Medium 特有格式）
      let cleanContent = content;

      // 移除 source 链接行
      cleanContent = cleanContent.replace(
        />\s*\*\*Source:\*\*\s*.+\n*---\n*/g,
        ""
      );

      // 移除 Medium 作者信息
      cleanContent = cleanContent.replace(
        /\[!\[.*?\]\(.*?\)\]\(.*?\)\[.*?\]\(.*?\)\n*.*?\n*.*?·.*?\n*--\n*Listen\n*Share\n*/g,
        ""
      );

      const tokens = marked.lexer(cleanContent);
      const chunks = [];
      let currentChunk = "";
      let currentHeading = "";
      let chunkIndex = 1;

      for (const token of tokens) {
        if (
          token.type === "heading" &&
          (token.depth === 1 || token.depth === 2)
        ) {
          // 如果当前块足够大，保存它
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

          // 表格内容保持完整性
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

      // 保存最后一个块
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          heading: currentHeading,
          filename: filename,
          index: chunkIndex,
        });
      }

      logger.info(`文件 ${filename} 切分为 ${chunks.length} 个块`);
      return chunks;
    } catch (error) {
      logger.error(`切分内容 ${filename} 失败:`, error);
      return [];
    }
  }

  async storeChunks(chunks, filename) {
    try {
      if (!Array.isArray(chunks) || chunks.length === 0) {
        logger.warn(`没有有效的文本块需要存储 (${filename})`);
        return 0;
      }

      const vectors = [];

      for (const chunk of chunks) {
        // 生成嵌入
        const embedding = await this.smartProcessor.generateEmbedding(
          chunk.content,
          "passage"
        );

        // 生成向量 ID - 兼容现有系统格式
        const cleanFilename = filename
          .replace(/[\/\\]/g, "_")
          .replace(/\.md$/, "");
        const vectorId = `manual_${cleanFilename}_${chunk.index}`;

        // 构建增强的元数据 - 与init.js格式完全一致
        const enhancedMetadata = {
          lang: this.detectLanguage(chunk.content),
          filename: filename, // 保持原始文件名格式，便于retrieval-service过滤
          filepath: `manual/${filename}`, // 标识为manual类型
          pair_id: vectorId,
          content: chunk.content,
          chunk_content: chunk.content, // response-generator需要这个字段
          heading: chunk.heading,
          chunk_index: chunk.index,
          source_type: "manual", // 标识来源
          ...(chunk.metadata || {}), // 包含智能提取的元数据
          has_code: /```/.test(chunk.content),
          has_links: /\[.*\]\(.*\)/.test(chunk.content),
          is_external_content: [
            "medium_article",
            "twitter_post",
            "linkedin_post",
            "substack_article",
            "mirror_post",
            "web_article",
          ].includes(chunk.metadata?.content_type),
        };

        vectors.push({
          id: vectorId,
          values: embedding,
          metadata: enhancedMetadata,
        });
      }

      // 批量上传
      const batchSize = 100;
      let totalUploaded = 0;

      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);

        let retries = 3;
        while (retries > 0) {
          try {
            await this.index.upsert(batch);
            totalUploaded += batch.length;
            logger.info(
              `批次上传成功: ${batch.length} 个向量 (${filename}, 批次 ${
                Math.floor(i / batchSize) + 1
              })`
            );
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
      return totalUploaded;
    } catch (error) {
      logger.error(`存储向量失败 (${filename}):`, error);
      throw error;
    }
  }

  /**
   * 列出已同步的手动文件
   */
  async listSyncedFiles() {
    try {
      const files = await fs.readdir(this.config.manualDir);
      const markdownFiles = files.filter((file) => file.endsWith(".md"));

      logger.info(`已同步的文件 (${markdownFiles.length} 个):`);
      markdownFiles.forEach((file) => logger.info(`  - ${file}`));

      return markdownFiles;
    } catch (error) {
      logger.error("列出已同步文件失败:", error);
      return [];
    }
  }

  /**
   * 列出待同步的文件
   */
  async listPendingFiles() {
    try {
      const files = await fs.readdir(this.config.toSyncDir);
      const markdownFiles = files.filter((file) => file.endsWith(".md"));

      logger.info(`待同步的文件 (${markdownFiles.length} 个):`);
      markdownFiles.forEach((file) => logger.info(`  - ${file}`));

      return markdownFiles;
    } catch (error) {
      logger.error("列出待同步文件失败:", error);
      return [];
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
使用方法:
  node scripts/manual-sync.js --workflow              # 批量处理to-sync文件夹
  node scripts/manual-sync.js <文件路径>               # 同步单个文件
  node scripts/manual-sync.js --dir <目录路径>         # 同步目录中的所有 .md 文件
  node scripts/manual-sync.js --list-synced          # 列出已同步的文件
  node scripts/manual-sync.js --list-pending         # 列出待同步的文件

工作流模式（推荐）:
  1. 将md文件放入 to-sync/ 文件夹
  2. 运行: npm run manual-sync:workflow
  3. 同步成功的文件会存储到 doc/manual/ 并从 to-sync/ 移除

示例:
  node scripts/manual-sync.js --workflow
  node scripts/manual-sync.js article.md
  node scripts/manual-sync.js --dir ./articles
  node scripts/manual-sync.js --list-synced
    `);
    process.exit(1);
  }

  const syncer = new ManualSyncer();

  try {
    await syncer.initialize();

    if (args[0] === "--workflow") {
      const result = await syncer.processToSyncFolder();
      logger.info(
        `🎉 工作流完成！总计: ${result.total}, 成功: ${result.successful}, 失败: ${result.failed}`
      );
      if (result.failedFiles.length > 0) {
        logger.error("失败的文件详情:", result.failedFiles);
      }
    } else if (args[0] === "--list-synced") {
      await syncer.listSyncedFiles();
    } else if (args[0] === "--list-pending") {
      await syncer.listPendingFiles();
    } else if (args[0] === "--dir") {
      if (args.length < 2) {
        logger.error("请指定目录路径");
        process.exit(1);
      }
      const count = await syncer.syncDirectory(args[1]);
      logger.info(`🎉 批量同步完成！总共处理 ${count} 个向量`);
    } else {
      const filePath = args[0];
      const count = await syncer.syncFile(filePath);
      logger.info(`🎉 文件同步完成！上传 ${count} 个向量`);
    }

    process.exit(0);
  } catch (error) {
    logger.error("💥 同步失败:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ManualSyncer;
