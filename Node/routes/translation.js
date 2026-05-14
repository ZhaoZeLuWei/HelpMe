/* routes/translation.js */
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const tencentcloud = require("tencentcloud-sdk-nodejs");
const { authRequired } = require("./auth.js");
const pool = require("../help_me_db.js");

// 1. 初始化腾讯翻译客户端
const TmtClient = tencentcloud.tmt.v20180321.Client;
const clientConfig = {
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: process.env.TENCENT_REGION || "ap-guangzhou",
  profile: {
    httpProfile: { endpoint: "tmt.tencentcloudapi.com" },
  },
};
const translateClient = new TmtClient(clientConfig);

// 2. 确保 translation_cache 表存在
async function ensureTranslationCacheTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS translation_cache (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source_hash CHAR(64) NOT NULL,
      source_lang VARCHAR(10) NOT NULL,
      target_lang VARCHAR(10) NOT NULL,
      source_text TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_translation (source_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
ensureTranslationCacheTable().catch((e) =>
  console.error("创建 translation_cache 表失败:", e.message),
);

// 3. 简单的内存级限流
const translateRateLimit = new Map();
const BATCH_RATE_LIMIT = 20;

function checkTranslateRateLimit(userId, limit = 10) {
  const now = Date.now();
  const record = translateRateLimit.get(userId);

  if (!record || now > record.resetTime) {
    translateRateLimit.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// 4. 计算 source_hash
function translationHash(sourceLang, targetLang, text) {
  return crypto
    .createHash("sha256")
    .update(`${sourceLang}:${targetLang}:${text}`)
    .digest("hex");
}

// 5. 从缓存中批量查询已翻译文本
async function lookupCache(entries) {
  if (entries.length === 0) return {};
  const hashes = entries.map((e) => e.hash);
  const [rows] = await pool.query(
    `SELECT source_hash, translated_text FROM translation_cache WHERE source_hash IN (?)`,
    [hashes],
  );
  const result = {};
  for (const row of rows) {
    result[row.source_hash] = row.translated_text;
  }
  return result;
}

// 6. 调用腾讯翻译 API
async function callTencentTranslate(sourceText, sourceLang, targetLang) {
  const result = await translateClient.TextTranslate({
    SourceText: sourceText,
    Source: sourceLang,
    Target: targetLang,
    ProjectId: 0,
  });
  return result.TargetText;
}

// 7. 存入缓存
async function saveToCache(sourceLang, targetLang, sourceText, translatedText) {
  const hash = translationHash(sourceLang, targetLang, sourceText);
  await pool.query(
    `INSERT INTO translation_cache (source_hash, source_lang, target_lang, source_text, translated_text)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE last_used_at = CURRENT_TIMESTAMP`,
    [hash, sourceLang, targetLang, sourceText, translatedText],
  );
}

// 8. 拆分长文本（>500 字符时按句子边界拆分）
function splitLongText(text, maxLen = 480) {
  if (text.length <= maxLen) return [text];
  const parts = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cutAt = maxLen;
    const delimiters = ["。", "！", "？", ".", "!", "?", "\n", "；", ";", "，", ","];
    for (const d of delimiters) {
      const idx = remaining.lastIndexOf(d, maxLen);
      if (idx > maxLen * 0.6) {
        cutAt = idx + 1;
        break;
      }
    }
    parts.push(remaining.substring(0, cutAt).trim());
    remaining = remaining.substring(cutAt).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

// ============ 路由 ============

// 单文本翻译（带缓存 + 限流）
router.post("/api/translate", authRequired, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    if (!checkTranslateRateLimit(userId, 10)) {
      return res.status(429).json({
        success: false,
        error: "翻译请求过于频繁，请稍后再试",
      });
    }

    const { sourceText, sourceLang = "zh", targetLang = "en" } = req.body;
    if (!sourceText || sourceText.trim() === "") {
      return res.status(400).json({ success: false, error: "待翻译文本不能为空" });
    }

    const text = sourceText.trim();
    const hash = translationHash(sourceLang, targetLang, text);
    const cacheResult = await lookupCache([{ hash }]);

    if (cacheResult[hash]) {
      return res.json({
        success: true,
        targetText: cacheResult[hash],
        cached: true,
      });
    }

    // 拆分长文本
    const chunks = splitLongText(text);
    const translatedChunks = [];
    for (const chunk of chunks) {
      const translated = await callTencentTranslate(chunk, sourceLang, targetLang);
      translatedChunks.push(translated);
    }
    const targetText = translatedChunks.join("");

    await saveToCache(sourceLang, targetLang, text, targetText);

    return res.json({ success: true, targetText, cached: false });
  } catch (error) {
    console.error("翻译接口报错：", error);
    return res.status(500).json({ success: false, error: "翻译失败，请稍后重试" });
  }
});

// 批量翻译（带缓存 + 放宽限流）
router.post("/api/translate/batch", authRequired, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    const { texts, sourceLang = "zh", targetLang = "en" } = req.body;
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ success: false, error: "texts 必须是非空数组" });
    }

    if (texts.length > 50) {
      return res.status(400).json({
        success: false,
        error: "单次最多翻译 50 条文本",
      });
    }

    // 去重、去空
    const uniqueTexts = [...new Set(texts.map((t) => (t || "").trim()).filter(Boolean))];

    if (uniqueTexts.length === 0) {
      return res.json({ success: true, results: {} });
    }

    // 计算每条文本的 hash
    const entries = uniqueTexts.map((text) => ({
      text,
      hash: translationHash(sourceLang, targetLang, text),
    }));

    // 查缓存
    const cacheResult = await lookupCache(entries);
    const results = { ...cacheResult };
    const cacheHashes = new Set(Object.keys(cacheResult));

    // 找出未缓存的
    const uncached = entries.filter((e) => !cacheHashes.has(e.hash));

    if (uncached.length > 0) {
      // 限流（未缓存条目数作为请求计数）
      if (!checkTranslateRateLimit(userId, BATCH_RATE_LIMIT)) {
        // 已经命中的缓存依然返回
        if (Object.keys(results).length > 0) {
          const resultMap = {};
          for (const e of entries) {
            const hash = e.hash;
            resultMap[e.text] = results[hash] ? results[hash] : e.text;
          }
          return res.json({ success: true, results: resultMap, partial: true });
        }
        return res.status(429).json({
          success: false,
          error: "翻译请求过于频繁，请稍后再试",
        });
      }

      // 逐条调用腾讯 API
      for (const entry of uncached) {
        try {
          const chunks = splitLongText(entry.text);
          const translatedChunks = [];
          for (const chunk of chunks) {
            const translated = await callTencentTranslate(chunk, sourceLang, targetLang);
            translatedChunks.push(translated);
          }
          const targetText = translatedChunks.join("");
          results[entry.hash] = targetText;
          await saveToCache(sourceLang, targetLang, entry.text, targetText);
        } catch (e) {
          console.error(`翻译失败: "${entry.text.substring(0, 50)}..."`, e.message);
          results[entry.hash] = entry.text; // 失败时返回原文
        }
      }
    }

    // 构建结果: { originalText: translatedText }
    const resultMap = {};
    for (const e of entries) {
      resultMap[e.text] = results[e.hash] || e.text;
    }

    return res.json({ success: true, results: resultMap });
  } catch (error) {
    console.error("批量翻译接口报错：", error);
    return res.status(500).json({ success: false, error: "批量翻译失败，请稍后重试" });
  }
});

module.exports = router;
