// CORS 配置：从 .env 的 CORS_ORIGINS 读取（逗号分隔）
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .filter(Boolean);

module.exports = function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  if (req.method === "OPTIONS") return res.sendStatus(200);
  return next();
};
