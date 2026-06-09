// 加载环境变量
require("dotenv").config();

// 启动时校验必需环境变量
const requiredEnvVars = ["JWT_SECRET", "ADMIN_USERNAME", "ADMIN_PASSWORD"];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName],
);

if (missingEnvVars.length > 0) {
  console.error("错误: 缺少以下必需环境变量:");
  missingEnvVars.forEach((varName) => {
    console.error(`  - ${varName}`);
  });
  console.error("请在 .env 文件中配置这些变量，服务无法启动。");
  process.exit(1);
}

// 启动时生成前端配置文件
const { generateFrontendConfig } = require("./generateFrontendConfig");
generateFrontendConfig();

const express = require("express");
const jwt = require("jsonwebtoken");
const corsMiddleware = require("./routes/cors.js");
const { parseLang } = require("./routes/translateMiddleware.js");

const { createServer } = require("node:http");
const { Server } = require("socket.io");
const { uploadDir } = require("./routes/upload.js");
const { registerChatHandler } = require("./chatHandler.js");
const { registerSupportHandler } = require("./supportHandler.js");
const { setIO } = require("./socketInstance.js");
const connectDB = require("./help_me_chat_db");
const pool = require("./help_me_db.js");
const { banUser, isBanned } = require("./routes/auth.js");

//all routes imports here 这里引用路由
const testRoutes = require("./routes/test.js");
const userRoutes = require("./routes/user.js");
const eventRoutes = require("./routes/event.js");
const orderRoutes = require("./routes/order.js");
const verifyRoutes = require("./routes/verify.js");

const reviewRoutes = require("./routes/review.js");
const favoriteRoutes = require("./routes/favorite.js");
const chatRoutes = require("./routes/chat.js");
const supportRoutes = require("./routes/support.js");
const locationRoutes = require("./routes/location.js");
const translationRoutes = require("./routes/translation.js");
const configRoutes = require("./routes/config.js");
const aiRoutes = require("./routes/ai.js");

//use all routes here 这里使用路由，定义URL路径
const app = express();
app.use(express.json());
app.use(corsMiddleware);
app.use(parseLang); // 解析客户端语言偏好（?lang=en）
app.use("/img", express.static(uploadDir));
// 开发环境保留 /test 调试页，生产环境不挂载
if (process.env.NODE_ENV !== "production") {
  app.use("/test", testRoutes);
}
app.use(userRoutes);
app.use(eventRoutes);
app.use(orderRoutes);
app.use(verifyRoutes);
app.use(reviewRoutes);
app.use(favoriteRoutes);
app.use(chatRoutes);
app.use(supportRoutes);
app.use(locationRoutes);
app.use(translationRoutes);
app.use(configRoutes);
app.use(aiRoutes);

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error("未捕获的错误:", err);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, error: "请求体格式错误" });
  }
  return res.status(500).json({ success: false, error: "服务器内部错误" });
});

// JWT secret（必须从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("错误: 缺少 JWT_SECRET 环境变量，Socket.IO 认证将失败");
}

// mongoDB Connection here
const mongoDBConnect = async () => {
  try {
    await connectDB();
    console.log("数据库连接成功");
  } catch (err) {
    console.error("服务器启动失败：", err.message);
    process.exit(1);
  }
};
mongoDBConnect();

// 启动时从数据库加载封禁用户列表到内存
(async () => {
  try {
    const [rows] = await pool.query(
      "SELECT UserId FROM Users WHERE IsBanned = 1",
    );
    rows.forEach((r) => banUser(r.UserId));
    console.log(`已加载 ${rows.length} 个封禁用户到内存名单`);
  } catch (err) {
    console.error("加载封禁用户列表失败:", err.message);
  }
})();

//connect to local node server
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  //cors allow connections
  cors: {
    origin: ["http://localhost:8100", "http://localhost:4200"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// 将 io 实例注册到单例，供路由中使用
setIO(io);

// get user jwt
io.use((socket, next) => {
  try {
    // 优先从 handshake.auth.token 获取（前端通过 auth: { token } 传入）
    let token = socket.handshake.auth?.token;

    // 其次尝试从 Authorization header（如 Bearer <token>）
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return next(new Error("NO_TOKEN"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // 检查用户是否被封禁
    if (decoded.role !== "admin" && isBanned(decoded.id)) {
      return next(new Error("BANNED"));
    }

    socket.user = decoded;
    return next();
  } catch (e) {
    console.warn("Socket.IO JWT 验证失败:", e.message);
    return next(new Error("INVALID_TOKEN"));
  }
});

//this part for socketIO (chat system)
io.on("connection", (socket) => {
  // 自动加入个人房间，用于接收订单、事件等实时通知
  if (socket.user && socket.user.id) {
    const personalRoom = socket.user.id.toString();
    socket.join(personalRoom);
  }

  // 这里调用修正后的函数
  registerChatHandler(io, socket);
});

// 客服 Socket.io namespace
const supportNsp = io.of("/support");

// 客服 namespace 复用相同的 JWT 认证中间件
supportNsp.use((socket, next) => {
  try {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
    if (!token) {
      return next(new Error("NO_TOKEN"));
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch (e) {
    console.warn("客服 Socket.IO JWT 验证失败:", e.message);
    return next(new Error("INVALID_TOKEN"));
  }
});

supportNsp.on("connection", (socket) => {
  // 管理员加入以 "0" 为名的个人房间，用于接收客服通知
  if (socket.user && socket.user.role === "admin") {
    socket.join("0");
  }
  // 普通用户加入以 userId 为名的个人房间
  if (socket.user && socket.user.id) {
    socket.join(socket.user.id.toString());
  }

  registerSupportHandler(supportNsp, socket);
});

//server listen on port 3000
server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
