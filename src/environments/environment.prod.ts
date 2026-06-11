export const environment = {
  production: true,
  // 本地联调阶段保持 localhost；部署前改为实际 API 地址，并同步 Node CORS / Socket.IO origin
  apiBase: 'http://8.146.238.241:3000',
  // apiBase: 'https://api.helpme.com',
  // 阿里云图形验证码 H5 SDK（需下载 ct4.js 放到 src/assets/ 目录）
  captchaScriptUrl: '/assets/ct4.js',
  captchaId: '96409edc5cae0a136d3d5b4fe928045b',
};
