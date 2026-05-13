// 从 .env 生成前端配置文件
// 只需要修改 .env 文件，重启服务即可同步到前端

const fs = require("node:fs");
const path = require("node:path");

function generateFrontendConfig() {
  const config = {
    // 高德地图配置（前端需要）
    amap: {
      key: process.env.AMAP_KEY || "",
      securityJsCode: process.env.AMAP_SECURITY_CODE || "",
    },
    // 后端 API 地址（前端需要）
    // 开发环境使用 localhost，生产环境应配置实际地址
    apiBase: process.env.API_BASE || "",
  };

  // 生成可加载的 JS 文件（挂载到 window.__APP_CONFIG__）
  const jsContent = `// 此文件由后端自动生成，请勿手动修改
// 配置来源: Node/.env
// 生成时间: ${new Date().toISOString()}
window.__APP_CONFIG__ = ${JSON.stringify(config, null, 2)};
`;

  // 写入到前端 public 目录
  const outputPath = path.join(__dirname, "..", "src", "assets", "config.js");
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, jsContent, "utf-8");
  console.log(`前端配置已生成: ${outputPath}`);

  return config;
}

module.exports = { generateFrontendConfig };
