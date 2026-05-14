const tencentcloud = require("tencentcloud-sdk-nodejs");
const TmtClient = tencentcloud.tmt.v20180321.Client;
const crypto = require("crypto");

const client = new TmtClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: process.env.TENCENT_REGION || "ap-guangzhou",
  profile: { httpProfile: { endpoint: "tmt.tencentcloudapi.com" } },
});

// 内存缓存（服务重启后清空）
const cache = new Map();
const CACHE_MAX_SIZE = 5000;

function cacheKey(text, source, target) {
  return crypto.createHash("md5").update(`${text}::${source}->${target}`).digest("hex");
}

/**
 * 翻译单条文本（带内存缓存）
 */
async function translateText(text, target = 'en', source = 'zh') {
  if (!text || typeof text !== 'string' || !text.trim()) return text;
  if (target === source) return text;

  const key = cacheKey(text, source, target);
  if (cache.has(key)) return cache.get(key);

  try {
    const result = await client.TextTranslate({
      SourceText: text.trim(),
      Source: source,
      Target: target,
      ProjectId: 0,
    });
    const translated = result.TargetText || text;

    // LRU 简单淘汰
    if (cache.size >= CACHE_MAX_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(key, translated);
    return translated;
  } catch (err) {
    console.error(`翻译失败: "${text.substring(0, 50)}"`, err.message);
    return text;
  }
}

/**
 * 批量翻译文本数组，减少 API 调用次数
 */
async function translateBatch(texts, target = 'en', source = 'zh') {
  if (!texts || texts.length === 0) return {};
  if (target === source) {
    const result = {};
    for (const t of texts) result[t] = t;
    return result;
  }

  const result = {};
  const uncached = [];

  for (const text of texts) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      result[text] = text;
      continue;
    }
    const key = cacheKey(text, source, target);
    if (cache.has(key)) {
      result[text] = cache.get(key);
    } else {
      uncached.push(text);
    }
  }

  // 分批调用 API（每批最多 50 条）
  for (let i = 0; i < uncached.length; i += 50) {
    const batch = uncached.slice(i, i + 50);
    for (const text of batch) {
      try {
        const apiResult = await client.TextTranslate({
          SourceText: text.trim(),
          Source: source,
          Target: target,
          ProjectId: 0,
        });
        const translated = apiResult.TargetText || text;
        const key = cacheKey(text, source, target);
        if (cache.size >= CACHE_MAX_SIZE) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(key, translated);
        result[text] = translated;
      } catch (err) {
        console.error(`批量翻译失败: "${text.substring(0, 50)}"`, err.message);
        result[text] = text;
      }
    }
  }

  return result;
}

/**
 * 翻译对象中指定字段
 * @param {Object|Array} data - 要翻译的数据
 * @param {string[]} fields - 需要翻译的字段名
 * @param {string} targetLang - 目标语言
 * @param {string} sourceLang - 源语言
 */
async function translateFields(data, fields, targetLang = 'en', sourceLang = 'zh') {
  if (!data || targetLang === sourceLang) return data;

  // 处理数组
  if (Array.isArray(data)) {
    // 收集所有需要翻译的文本
    const textsToTranslate = new Set();
    for (const item of data) {
      for (const field of fields) {
        if (item[field] && typeof item[field] === 'string' && item[field].trim()) {
          textsToTranslate.add(item[field]);
        }
      }
    }

    // 批量翻译
    const translations = await translateBatch([...textsToTranslate], targetLang, sourceLang);

    // 应用到数组
    for (const item of data) {
      for (const field of fields) {
        if (item[field] && translations[item[field]] && translations[item[field]] !== item[field]) {
          item[field] = translations[item[field]];
        }
      }
    }
    return data;
  }

  // 处理单个对象
  const textsToTranslate = [];
  for (const field of fields) {
    if (data[field] && typeof data[field] === 'string' && data[field].trim()) {
      textsToTranslate.push(data[field]);
    }
  }

  if (textsToTranslate.length === 0) return data;

  const translations = await translateBatch(textsToTranslate, targetLang, sourceLang);

  for (const field of fields) {
    if (data[field] && translations[data[field]] && translations[data[field]] !== data[field]) {
      data[field] = translations[data[field]];
    }
  }
  return data;
}

module.exports = { translateText, translateBatch, translateFields };
