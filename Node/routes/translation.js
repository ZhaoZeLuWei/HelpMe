/* routes/translation.js（最终修复版） */
const express = require("express");
const router = express.Router();
const tencentcloud = require("tencentcloud-sdk-nodejs");

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

// 2. 核心翻译接口（唯一需要的接口）
router.post("/api/translate", async (req, res) => {
  try {
    const { sourceText, sourceLang = "zh", targetLang = "en" } = req.body;
    if (!sourceText || sourceText.trim() === "") {
      return res.status(400).json({ success: false, error: "待翻译文本不能为空" });
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
    return res.status(500).json({
      success: false,
      error: "翻译失败",
      details: error.message,
    });
  }
});

module.exports = router;