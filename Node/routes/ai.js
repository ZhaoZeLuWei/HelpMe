/**
 * AI 辅助功能路由
 * POST /api/ai/generate-description  — 关键词补全→结构化描述
 * POST /api/ai/extract-tags           — 文本→标签列表
 * POST /api/ai/enhance-search         — 搜索增强推荐
 */
const express = require("express");
const router = express.Router();
const pool = require("../help_me_db.js");
const { authOptional } = require("./auth.js");
const {
  fillForm,
  extractTags,
  extractSearchKeywords,
  enhanceSearch,
} = require("../services/aiService.js");
const { filter: sensitiveFilter } = require("../services/sensitiveFilter.js");

// ---------- 内存级调用限速 ----------
const dailyUsage = new Map();
const DAILY_LIMIT = Number(process.env.AI_RATE_LIMIT_DAILY) || 100;

function getDailyKey(req) {
  const userId = req.user?.id || "anonymous";
  const today = new Date().toISOString().slice(0, 10);
  return `${userId}_${today}`;
}

function checkRateLimit(req) {
  const key = getDailyKey(req);
  const count = dailyUsage.get(key) || 0;
  if (count >= DAILY_LIMIT) return false;
  dailyUsage.set(key, count + 1);
  return true;
}

// ---------- 1. 描述生成 ----------
router.post(
  "/api/ai/fill-form",
  authOptional,
  async (req, res) => {
    try {
      if (!checkRateLimit(req)) {
        return res
          .status(429)
          .json({ success: false, error: "今日 AI 调用次数已达上限，请明天再试" });
      }

      const { input, type = "request" } = req.body;

      if (!input || input.trim().length < 2) {
        return res
          .status(400)
          .json({ success: false, error: "请输入至少 2 个字符" });
      }

      const check = sensitiveFilter(input);
      if (!check.safe) {
        return res.status(400).json({
          success: false,
          error: "输入包含敏感词汇，请修改后重试",
          matches: check.matched,
        });
      }

      const result = await fillForm(input, type);
      return res.json({ success: true, data: result });
    } catch (err) {
      console.error("AI fill-form error:", err.message);
      return res
        .status(500)
        .json({ success: false, error: "AI 填表失败，请稍后重试" });
    }
  },
);

// ---------- 2. 标签提取 ----------
router.post("/api/ai/extract-tags", authOptional, async (req, res) => {
  try {
    if (!checkRateLimit(req)) {
      return res
        .status(429)
        .json({ success: false, error: "今日 AI 调用次数已达上限，请明天再试" });
    }

    const { text } = req.body;

    if (!text || text.trim().length < 2) {
      return res
        .status(400)
        .json({ success: false, error: "请先输入事件描述" });
    }

    const tags = await extractTags(text);
    return res.json({ success: true, data: { tags } });
  } catch (err) {
    console.error("AI extract-tags error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "AI 提取标签失败，请稍后重试" });
  }
});

// ---------- 3. 搜索增强 ----------
router.post("/api/ai/enhance-search", authOptional, async (req, res) => {
  try {
    if (!checkRateLimit(req)) {
      return res
        .status(429)
        .json({ success: false, error: "今日 AI 调用次数已达上限，请明天再试" });
    }

    const { keyword, location = "" } = req.body;

    if (!keyword || keyword.trim().length < 1) {
      return res
        .status(400)
        .json({ success: false, error: "请输入搜索关键词" });
    }

    // AI 提取核心搜索关键词（去除语气词）
    let searchKeywords = [keyword];
    try {
      const extracted = await extractSearchKeywords(keyword);
      if (extracted.length > 0) {
        searchKeywords = extracted;
      }
    } catch {
      // 提取失败就用原词搜索
    }

    // 用多个关键词 OR 搜索，匹配更多事件
    const likeClauses = searchKeywords.map(() => "(e.EventDetails LIKE ? OR e.EventTitle LIKE ?)");
    const likeParams = searchKeywords.flatMap((kw) => [`%${kw}%`, `%${kw}%`]);

    const [events] = await pool.query(
      `SELECT DISTINCT
        e.EventId AS id, e.Photos AS cardImage,
        e.Location AS address, e.LocationPlaceId AS locationPlaceId,
        e.LocationLng AS lng, e.LocationLat AS lat,
        e.EventTitle AS title, e.EventDetails AS demand, e.EventType AS eventType,
        e.Price AS price, e.CreateTime AS createTime,
        e.CreatorId AS creatorId,
        u.UserName AS name, u.UserAvatar AS avatar
       FROM Events e
       JOIN Users u ON e.CreatorId = u.UserId
       WHERE ${likeClauses.join(" OR ")}
       ORDER BY e.CreateTime DESC
       LIMIT 50`,
      likeParams,
    );

    // 查询附近服务者（按地点关键词匹配）
    let providers = [];
    if (location) {
      const [provRows] = await pool.query(
        `SELECT u.UserId, u.UserName, u.Location,
                p.ProviderRole, p.ServiceRanking, p.OrderCount
         FROM Users u
         JOIN Providers p ON u.UserId = p.ProviderId
         WHERE u.Location LIKE ?
         ORDER BY p.OrderCount DESC
         LIMIT 5`,
        [`%${location}%`],
      );
      providers = provRows;
    }

    // AI 生成推荐文案
    const recommendation = await enhanceSearch(keyword, events, providers);

    return res.json({
      success: true,
      data: { recommendation, matchedEvents: events, matchedProviders: providers },
    });
  } catch (err) {
    console.error("AI enhance-search error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "AI 搜索增强失败，请稍后重试" });
  }
});

module.exports = router;
