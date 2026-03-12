/**
 * 檢索主題配置入口：
 * - topic-config-core.js：核心協議主題
 * - topic-config-ecosystem.js：生態產品主題
 */
const CORE_TOPIC_CONFIG = require("./topic-config-core");
const ECOSYSTEM_TOPIC_CONFIG = require("./topic-config-ecosystem");

const TOPIC_CONFIG = {
  ...CORE_TOPIC_CONFIG,
  ...ECOSYSTEM_TOPIC_CONFIG,
};

const COMPARISON_KEYWORDS = [
  "difference",
  "differences",
  "compare",
  "comparison",
  "vs",
  "versus",
  "choose",
  "which",
  "better",
  "distinguish",
  "contrast",
  "區別",
  "差異",
  "比較",
];

module.exports = {
  TOPIC_CONFIG,
  COMPARISON_KEYWORDS,
};
