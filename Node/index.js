const express = require("express");
const jwt = require("jsonwebtoken");
const corsMiddleware = require("./routes/cors.js");

const { createServer } = require("node:http");
const { Server } = require("socket.io");
const { uploadDir } = require("./routes/upload.js");
const { registerChatHandler } = require('./chatHandler.js');
const connectDB = require('./help_me_chat_db');

//all routes imports here 这里引用路由
const testRoutes = require("./routes/test.js");
const userRoutes = require("./routes/user.js");
const eventRoutes = require("./routes/event.js");
const verifyRoutes = require("./routes/verify.js");
const orderRoutes = require("./routes/order.js");
const reviewRoutes = require("./routes/review.js");
const chatRoutes = require("./routes/chat.js");

//use all routes here 这里使用路由，定义URL路径
const app = express();
app.use(express.json());
app.use(corsMiddleware);
app.use("/img", express.static(uploadDir));
app.use("/test", testRoutes);
app.use(userRoutes);
app.use(eventRoutes);
app.use(verifyRoutes);
app.use(orderRoutes);
app.use(reviewRoutes);
app.use(chatRoutes);

// JWT secret (建议在生产环境通过 .env 配置)
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// mongoDB Connection here
const mongoDBConnect = async () => {
  try {
    await connectDB();
    console.log('数据库连接成功');
  } catch (err) {
    console.error('服务器启动失败：', err.message);
    process.exit(1);
  }
};
mongoDBConnect();

//connect to local node server
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery:{},
  //cors allow connections
  cors: {
    origin: 'http://localhost:8100',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

// get user jwt
io.use((socket, next) => {
  try {
    // 优先从 handshake.auth.token 获取（前端通过 auth: { token } 传入）
    let token = socket.handshake.auth?.token;

    // 其次尝试从 Authorization header（如 Bearer <token>）
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
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
    console.warn("Socket.IO JWT 验证失败:", e.message);
    return next(new Error("INVALID_TOKEN"));
  }
});

//this part for socketIO (chat system)
io.on("connection", (socket) => {
  // 这里调用修正后的函数
  registerChatHandler(io, socket);

  socket.on("disconnect", () => {
    console.log("disconnect");
  });
});

//server listen on port 3000
server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
