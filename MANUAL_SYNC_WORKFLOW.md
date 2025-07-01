# Manual Sync Workflow 手动同步工作流

## 📁 文件夹结构

```
gitbook/
├── to-sync/              # 待同步文件夹 - 把 md 文件放这里
├── doc/manual/           # 已同步文件夹 - 与系统结构一致 (doc/en/, doc/zh/ 等)
└── scripts/manual-sync.js # 同步脚本
```

## 🚀 工作流程

### 1. 放置文件

将你的 md 文件放入 `to-sync/` 文件夹

### 2. 运行同步

```bash
npm run manual-sync:workflow
```

### 3. 自动处理

- ✅ 成功同步的文件会复制到 `doc/manual/` 并从 `to-sync/` 移除
- ❌ 失败的文件会留在 `to-sync/` 等待重试
- 📊 同步过程会记录详细日志

## 📝 Metadata 格式

基于对 `init.js`, `bot.js`, `retrieval-service.js`, `response-generator.js` 的分析，系统使用以下 metadata 结构：

### 核心字段（与现有系统完全兼容）

```javascript
{
  lang: "en",                          // 语言标识
  filename: "article.md",              // 文件名（用于过滤查询）
  filepath: "manual/article.md",       // 文件路径（标识来源）
  pair_id: "manual_article_1",         // 向量唯一ID
  content: "文章内容...",               // 完整内容
  chunk_content: "文章内容...",        // 块内容（response-generator需要）
  heading: "Article Title",           // 章节标题
  chunk_index: 1,                     // 块索引
  source_type: "manual",              // 来源标识
  has_code: false,                    // 是否包含代码
  has_links: true,                    // 是否包含链接
}
```

## 🛠️ 可用命令

### 工作流命令

```bash
# 批量处理 to-sync 文件夹（推荐）
npm run manual-sync:workflow

# 查看已同步文件
npm run manual-sync:list

# 查看待同步文件
npm run manual-sync:pending
```

### 单文件命令

```bash
# 同步单个文件
npm run manual-sync article.md

# 同步整个目录
npm run manual-sync -- --dir ./articles
```
