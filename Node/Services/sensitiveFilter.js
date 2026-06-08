/**
 * 敏感词过滤（轻量版）
 * MVP 使用硬编码列表，生产环境建议从 DB 或文件加载
 */

const BLOCKED_WORDS = [
  // 预留扩展位，MVP 阶段保持最小集
];

/**
 * 检查文本是否含敏感词
 * @param {string} text
 * @returns {{ safe: boolean, filteredText: string, matched: string[] }}
 */
function filter(text) {
  const matched = [];
  let filteredText = text;

  for (const word of BLOCKED_WORDS) {
    if (filteredText.includes(word)) {
      matched.push(word);
      filteredText = filteredText.replace(new RegExp(word, "g"), "***");
    }
  }

  return { safe: matched.length === 0, filteredText, matched };
}

module.exports = { filter };
