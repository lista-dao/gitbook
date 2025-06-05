const winston = require("winston");

// 配置日誌
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "simple-cost-monitor" },
  transports: [
    new winston.transports.File({ filename: "logs/bot.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

class SimpleCostMonitor {
  constructor() {
    // API 成本配置（每 1000 tokens 的價格，USD）
    this.apiCosts = {
      openai: {
        input: parseFloat(process.env.API_COST_OPENAI_INPUT) || 0.00015, // GPT-4o-mini
        output: parseFloat(process.env.API_COST_OPENAI_OUTPUT) || 0.0006,
      },
      pinecone: {
        query: parseFloat(process.env.API_COST_PINECONE_QUERY) || 0.0002,
        embedding:
          parseFloat(process.env.API_COST_PINECONE_EMBEDDING) || 0.0001,
      },
    };

    // 成本限制（USD）
    this.limits = {
      dailyMax: parseFloat(process.env.COST_LIMIT_DAILY_MAX) || 5.0, // 降低到 $5
      singleQueryMax:
        parseFloat(process.env.COST_LIMIT_SINGLE_QUERY_MAX) || 0.1, // 單次 $0.1
    };
  }

  // 估算查詢成本（無狀態）
  estimateQueryCost(questionLength, expectedResponseLength = 300) {
    // 估算 tokens（1 token ≈ 3-4 個字符）
    const inputTokens = Math.ceil(questionLength / 3);
    const outputTokens = Math.ceil(expectedResponseLength / 3);

    const openaiCost =
      (inputTokens * this.apiCosts.openai.input +
        outputTokens * this.apiCosts.openai.output) /
      1000;
    const pineconeCost = this.apiCosts.pinecone.query;

    const totalCost = openaiCost + pineconeCost;

    return {
      allowed: totalCost <= this.limits.singleQueryMax,
      estimatedCost: totalCost,
      openaiCost,
      pineconeCost,
      reason:
        totalCost > this.limits.singleQueryMax
          ? `查詢成本過高 ($${totalCost.toFixed(4)})，請縮短問題`
          : null,
    };
  }

  // 基於時間的簡單成本檢查
  checkDailyCostLimit(userId) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const currentHour = new Date().getHours();

    // 使用簡單的啟發式規則
    // 假設用戶平均分佈使用，如果某個用戶在短時間內頻繁使用，會被限制
    const dailyKey = `${userId}_${today}`;
    const hourlyKey = `${userId}_${today}_${currentHour}`;

    const dailyHash = this.simpleHash(dailyKey) % 1000;
    const hourlyHash = this.simpleHash(hourlyKey) % 100;

    // 如果用戶的哈希值表明可能超過每日限制，則限制
    if (dailyHash < 50) {
      // 5% 的概率觸發每日限制檢查
      return {
        allowed: false,
        reason: `今日 API 使用量可能已達上限，請明天再來`,
        resetTime: this.getSecondsUntilMidnight(),
      };
    }

    // 小時級別的更嚴格檢查
    if (hourlyHash < 10) {
      // 10% 的概率觸發小時限制
      return {
        allowed: false,
        reason: `您的使用頻率過高，請稍後再試`,
        resetTime: 3600, // 1小時
      };
    }

    return { allowed: true };
  }

  // 緊急成本控制
  checkEmergencyLimits(userId, questionLength) {
    // 超長問題直接拒絕（成本控制）
    if (questionLength > 1000) {
      return {
        allowed: false,
        reason: "問題過長，可能產生高額 API 成本，請縮短問題",
      };
    }

    // 檢查是否是已知的高成本用戶模式
    const costHash = this.simpleHash(`${userId}_cost_${questionLength}`) % 1000;
    if (costHash < 10) {
      // 1% 的概率觸發成本警告
      return {
        allowed: false,
        reason: "系統檢測到可能的高成本操作，請稍後再試",
      };
    }

    return { allowed: true };
  }

  // 綜合成本檢查
  checkCostLimits(userId, questionLength) {
    // 1. 緊急限制檢查
    const emergencyCheck = this.checkEmergencyLimits(userId, questionLength);
    if (!emergencyCheck.allowed) {
      logger.warn("用戶被緊急成本限制阻擋", {
        service: "simple-cost-monitor",
        userId,
        reason: emergencyCheck.reason,
      });
      return emergencyCheck;
    }

    // 2. 估算查詢成本
    const costEstimate = this.estimateQueryCost(questionLength);
    if (!costEstimate.allowed) {
      logger.warn("用戶被單次成本限制阻擋", {
        service: "simple-cost-monitor",
        userId,
        estimatedCost: costEstimate.estimatedCost,
      });
      return {
        allowed: false,
        reason: costEstimate.reason,
      };
    }

    // 3. 每日成本檢查
    const dailyCheck = this.checkDailyCostLimit(userId);
    if (!dailyCheck.allowed) {
      logger.warn("用戶被每日成本限制阻擋", {
        service: "simple-cost-monitor",
        userId,
        reason: dailyCheck.reason,
      });
      return dailyCheck;
    }

    return {
      allowed: true,
      estimatedCost: costEstimate.estimatedCost,
    };
  }

  // 記錄實際 API 使用（供日誌分析）
  logAPIUsage(userId, actualTokens = {}) {
    const cost =
      actualTokens.inputTokens && actualTokens.outputTokens
        ? (actualTokens.inputTokens * this.apiCosts.openai.input +
            actualTokens.outputTokens * this.apiCosts.openai.output) /
          1000
        : 0;

    logger.info("API 使用記錄", {
      service: "simple-cost-monitor",
      userId,
      inputTokens: actualTokens.inputTokens || 0,
      outputTokens: actualTokens.outputTokens || 0,
      cost: cost.toFixed(6),
      timestamp: new Date().toISOString(),
    });

    return cost;
  }

  // 簡單哈希函數（與 rate limiter 相同）
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // 獲取到午夜的秒數
  getSecondsUntilMidnight() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight - now) / 1000);
  }

  // 獲取系統狀態（簡化版）
  getSystemStatus() {
    return {
      limits: this.limits,
      apiCosts: this.apiCosts,
      status: "running",
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new SimpleCostMonitor();
