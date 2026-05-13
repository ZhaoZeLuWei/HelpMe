// 前端配置接口

const express = require("express");
const router = express.Router();

// 获取前端所需的配置（无需鉴权，公开接口）
router.get("/api/config", (req, res) => {
  res.json({
    success: true,
    config: {
      amap: {
        key: process.env.AMAP_KEY || "",
        securityJsCode: process.env.AMAP_SECURITY_CODE || "",
      },
    },
  });
});

module.exports = router;
