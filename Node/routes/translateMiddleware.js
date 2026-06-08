const { translateFields } = require('./translateHelper');

/**
 * Express 中间件：解析客户端语言偏好（从 query.lang 读取）
 * 设置 res.locals.targetLang 供路由使用
 */
function parseLang(req, res, next) {
  const lang = req.query.lang;
  if (lang && lang !== 'zh') {
    res.locals.targetLang = lang;
  }
  next();
}

/**
 * 辅助函数：发送 JSON 响应前自动翻译指定字段
 * @param {Response} res - Express response
 * @param {Object|Array} data - 要发送的数据
 * @param {string[]} fields - 需要翻译的字段名
 * @param {number} [status=200] - HTTP 状态码
 */
async function sendTranslated(res, data, fields, status = 200) {
  const targetLang = res.locals.targetLang;
  if (targetLang && fields.length > 0 && data) {
    await translateFields(data, fields, targetLang);
  }
  return res.status(status).json(data);
}

module.exports = { parseLang, sendTranslated };
