/* eslint-env node, es2021 */
const jwt = require("jsonwebtoken");

// JWT 配置（必须从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// 检查必要环境变量是否配置
if (!JWT_SECRET) {
  console.error("错误: 缺少 JWT_SECRET 环境变量");
}

// 只放必要信息进 token（不要放手机号/身份证等敏感信息）
// role: 'user' | 'admin'，默认 'user'
function signToken(user, role = "user") {
  return jwt.sign(
    {
      id: user.UserId,
      name: user.UserName,
      role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

function authRequired(req, res, next) {
  // 支持从 Authorization header 或 query parameter 获取 token
  // query parameter 用于 <img> 标签等无法设置自定义 header 的场景
  let token = null;
  const header = req.headers.authorization || "";
  const [type, headerToken] = header.split(" ");

  if (type === "Bearer" && headerToken) {
    token = headerToken;
  } else if (req.query && req.query.token) {
    // 从 query parameter 获取 token
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: "当前用户未登录" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, iat, exp }
    return next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: "登录已过期或 token 无效" });
  }
}

function authOptional(req, _res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return next();

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (_) {
    // optional：失败就当未登录
  }
  return next();
}

// 管理员鉴权中间件：要求用户已登录且具有 admin 角色
function adminRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ success: false, error: "未授权访问" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, error: "需要管理员权限" });
    }
    req.user = decoded;
    return next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: "登录已过期或 token 无效" });
  }
}

module.exports = {
  signToken,
  authRequired,
  authOptional,
  adminRequired,
};
