// Simple CORS for the Ionic dev server.
// 此文件用于解决跨域问题，后续在部署的时候，可以采用其他方案
//zewei: add localhost:4200 2-3
const allowedOrigins = ["http://localhost:8100","http://localhost:4200"];

module.exports = function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  return next();
};
