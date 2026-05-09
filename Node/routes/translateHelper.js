// routes/translateHelper.js
const tencentcloud = require("tencentcloud-sdk-nodejs");
const TmtClient = tencentcloud.tmt.v20180321.Client;

const client = new TmtClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: process.env.TENCENT_REGION || "ap-guangzhou",
  profile: { httpProfile: { endpoint: "tmt.tencentcloudapi.com" } },
});

// 内存缓存
const cache = new Map();

async function translateText(text, target = 'en', source = 'zh') {
  if (!text || typeof text !== 'string' || !text.trim()) return text;
  if (target === source) return text;

  const cacheKey = `${text}::${source}->${target}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const result = await client.TextTranslate({
      SourceText: text.trim(),
      Source: source,
      Target: target,
      ProjectId: 0,
    });
    const translated = result.TargetText || text;
    cache.set(cacheKey, translated);
    return translated;
  } catch (err) {
    console.error(`翻译失败: "${text}"`, err.message);
    return text;
  }
}

async function translateFields(obj, fields, targetLang, sourceLang = 'zh') {
  if (!obj || targetLang === sourceLang) return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (result[field]) {
      result[field] = await translateText(
        String(result[field]),
        targetLang,
        sourceLang
      );
    }
  }
  return result;
}

module.exports = { translateText, translateFields };