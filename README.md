# GitBook RAG Bot

基於 GitBook 內容的 RAG（檢索增強生成）Telegram Bot，支持中英文內容檢索和問答。

## 功能特點

- 從 GitBook 的 `en` 和 `zh-CN` 分支自動同步 Markdown 內容
- 使用 BGE-M3 模型生成文本嵌入
- 基於 Pinecone 向量數據庫進行語義檢索
- 集成 Telegram Bot 進行智能問答
- 支持增量更新（基於 git diff）

## 快速開始

### 1. 環境設置

創建 `.env` 文件：

```bash
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=gitbook-rag

# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設置 Pinecone 索引

首次使用需要創建 Pinecone 索引：

```bash
npm run setup
```

這會自動創建所需的向量數據庫索引（維度：1024，適配 BGE-M3 模型）。

### 4. 首次初始化

運行初始化腳本，這會：

- 創建 RAG 分支
- 從 `en` 和 `zh-CN` 分支同步內容到 `doc/en` 和 `doc/zh-CN`
- 解析 Markdown 並生成文本塊
- 生成嵌入向量並存儲到 Pinecone

```bash
npm run init
```

### 5. 啟動 Telegram Bot

```bash
npm start
```

## 項目結構

```
├── scripts/
│   ├── init.js              # 首次拉取腳本
│   └── sync.js              # 增量更新腳本
├── bot/
│   └── bot.js               # Telegram Bot 實現
├── doc/
│   ├── zh-CN/               # 中文文檔
│   └── en/                  # 英文文檔
├── logs/                    # 日誌文件
├── .github/workflows/       # GitHub Actions
└── package.json
```

## 工作流程

1. **首次拉取**: 運行 `npm run init` 同步所有內容
2. **增量更新**: GitHub Actions 監聽 `en` 和 `zh-CN` 分支變更，自動同步
3. **智能問答**: Bot 檢測問題語言，檢索相關內容，調用 OpenAI API 生成回答

## 注意事項

- 首次使用需運行 `npm run setup` 創建 Pinecone 索引
- 首次運行會下載 BGE-M3 模型，需要一定時間
- 日誌文件存儲在 `logs/` 目錄下
