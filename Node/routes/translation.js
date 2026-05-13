/* routes/translation.js（最终修复版） */
const express = require("express");
const router = express.Router();
const tencentcloud = require("tencentcloud-sdk-nodejs");
const { authRequired } = require("./auth.js");

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

// 简单的内存级限流（每用户每分钟 10 次）
const translateRateLimit = new Map(); // userId -> { count, resetTime }

function checkTranslateRateLimit(userId) {
  const now = Date.now();
  const record = translateRateLimit.get(userId);

  if (!record || now > record.resetTime) {
    translateRateLimit.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (record.count >= 10) {
    return false;
  }

  record.count++;
  return true;
}

// 2. 核心翻译接口（需登录，限流）
router.post("/api/translate", authRequired, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    // 限流检查
    if (!checkTranslateRateLimit(userId)) {
      return res.status(429).json({
        success: false,
        error: "翻译请求过于频繁，请稍后再试",
      });
    }

    const { sourceText, sourceLang = "zh", targetLang = "en" } = req.body;
    if (!sourceText || sourceText.trim() === "") {
      return res
        .status(400)
        .json({ success: false, error: "待翻译文本不能为空" });
    }

    // 限制文本长度（最多 500 字符）
    if (sourceText.length > 500) {
      return res.status(400).json({
        success: false,
        error: "翻译文本过长，请限制在 500 字符以内",
      });
    }

    // 调用腾讯翻译API
    const translateResult = await translateClient.TextTranslate({
      SourceText: sourceText.trim(),
      Source: sourceLang,
      Target: targetLang,
      ProjectId: 0,
    });

    return res.json({
      success: true,
      targetText: translateResult.TargetText,
      message: "翻译成功",
    });
  } catch (error) {
    console.error("翻译接口报错：", error);
    // 生产环境不返回底层错误详情
    return res.status(500).json({
      success: false,
      error: "翻译失败，请稍后重试",
    });
  }
});

module.exports = router;
