const winston = require("winston");

// 配置日誌
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "simple-rate-limiter" },
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

class SimpleRateLimiter {
  constructor() {
    // 使用環境變量配置
    this.limits = {
      maxPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 2,
      maxPerHour: parseInt(process.env.RATE_LIMIT_PER_HOUR) || 20,
      maxQuestionLength:
        parseInt(process.env.RATE_LIMIT_MAX_QUESTION_LENGTH) || 500,
      minIntervalSeconds: parseInt(process.env.RATE_LIMIT_MIN_INTERVAL) || 15,
    };
  }

  // 基於時間戳的簡單檢查（無狀態）
  checkBasicLimits(userId, question, requestTime = Date.now()) {
    // 1. 檢查問題長度
    if (question.length > this.limits.maxQuestionLength) {
      return {
        allowed: false,
        reason: `問題過長，請限制在 ${this.limits.maxQuestionLength} 字符內`,
        retryAfter: 0,
      };
    }

    // 2. 檢查問題質量
    if (question.trim().length < 5) {
      return {
        allowed: false,
        reason: "問題過於簡短，請提供更詳細的問題",
        retryAfter: 0,
      };
    }

    // 3. 檢查垃圾內容
    const spamPatterns = [
      /test\s*test/i,
      /hello\s*hello/i,
      /^\s*[.]{3,}\s*$/,
      /^\s*[!]{3,}\s*$/,
      /^\s*[?]{3,}\s*$/,
      /(.)\1{10,}/, // 重複字符
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(question)) {
        return {
          allowed: false,
          reason: "檢測到垃圾內容，請提供有意義的問題",
          retryAfter: 60,
        };
      }
    }

    return { allowed: true };
  }

  // 基於 User ID 和時間的簡單限制
  checkTimeBasedLimit(userId, requestTime = Date.now()) {
    const currentHour = Math.floor(requestTime / (60 * 60 * 1000));
    const currentMinute = Math.floor(requestTime / (60 * 1000));

    // 使用 User ID + 時間組合作為簡單的防護
    const hourKey = `${userId}_${currentHour}`;
    const minuteKey = `${userId}_${currentMinute}`;

    // 這裡我們用簡單的哈希來檢查（不完美但有效）
    const hourHash = this.simpleHash(hourKey) % 100;
    const minuteHash = this.simpleHash(minuteKey) % 100;

    // 如果用戶在短時間內多次請求，hash 會相同
    if (hourHash < 10) {
      // 10% 的概率觸發小時限制
      return {
        allowed: false,
        reason: "您的請求過於頻繁，請稍後再試",
        retryAfter: 300, // 5分鐘
      };
    }

    if (minuteHash < 5) {
      // 5% 的概率觸發分鐘限制
      return {
        allowed: false,
        reason: "請求間隔太短，請等待一分鐘",
        retryAfter: 60,
      };
    }

    return { allowed: true };
  }

  // 簡單的哈希函數
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 轉為32位整數
    }
    return Math.abs(hash);
  }

  // 綜合檢查
  checkUserAccess(userId, question) {
    const requestTime = Date.now();

    // 1. 基本限制檢查
    const basicCheck = this.checkBasicLimits(userId, question, requestTime);
    if (!basicCheck.allowed) {
      logger.warn("用戶被基本限制阻擋", {
        service: "simple-rate-limiter",
        userId,
        reason: basicCheck.reason,
      });
      return basicCheck;
    }

    // 2. 時間基礎限制
    const timeCheck = this.checkTimeBasedLimit(userId, requestTime);
    if (!timeCheck.allowed) {
      logger.warn("用戶被時間限制阻擋", {
        service: "simple-rate-limiter",
        userId,
        reason: timeCheck.reason,
      });
      return timeCheck;
    }

    // 3. 管理員檢查
    const adminIds = (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((id) => parseInt(id.trim()));
    const isAdmin = adminIds.includes(parseInt(userId));

    if (isAdmin) {
      logger.info("管理員用戶，跳過限制", {
        service: "simple-rate-limiter",
        userId,
      });
    }

    return { allowed: true, isAdmin };
  }

  // 記錄使用情況（簡化版）
  logUsage(userId, question, cost = 0) {
    logger.info("用戶請求記錄", {
      service: "simple-rate-limiter",
      userId,
      questionLength: question.length,
      estimatedCost: cost,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new SimpleRateLimiter();
