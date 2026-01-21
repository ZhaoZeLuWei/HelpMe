/* eslint-env node, es2021 */
const jwt = require("jsonwebtoken");

// 建议用环境变量：JWT_SECRET=xxxx
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// 只放必要信息进 token（不要放手机号/身份证等敏感信息）
function signToken(user) {
  // 你的 Users 表字段是 UserId / UserName / PhoneNumber（login里就是这么查的）
  return jwt.sign(
    {
      id: user.UserId,
      name: user.UserName,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
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

module.exports = {
  signToken,
  authRequired,
  authOptional,
};
