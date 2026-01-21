/* eslint-env node, es2021 */
const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken"); 

const corsMiddleware = require("./routes/cors.js");
const { uploadDir } = require("./routes/upload.js");

//import my js files here
const pool = require("./help_me_db.js");
const { registerChatHandler, getChatHistory } = require('./chatHandler.js');

//all routes imports here 这里引用路由
const testRoutes = require("./routes/test.js");
const userRoutes = require("./routes/user.js");
const eventRoutes = require("./routes/event.js");
const verifyRoutes = require("./routes/verify.js");
const orderRoutes = require("./routes/order.js");
const reviewRoutes = require("./routes/review.js");

//use all routes here 这里使用路由，定义URL路径
const app = express();
app.use(express.json());

// 芒果引入数据库连接函数
const connectDB = require('./help_me_chat_db');

// JWT secret (建议在生产环境通过 .env 配置)
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me"; 

// 启动服务器前先连接数据库
const startServer = async () => {
  try {
    await connectDB();
    console.log('数据库连接成功');

  } catch (err) {
    console.error('服务器启动失败：', err.message);
    process.exit(1);
  }

};

// 调用启动函数
startServer();


const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery:{},
  //cors allow connections
  cors: {
    origin: 'http://localhost:8100',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

// 替换 FAKE USER：Socket.IO JWT 鉴权中间件
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

app.use(corsMiddleware);

app.use("/img", express.static(uploadDir));

app.use("/test", testRoutes);

app.use(userRoutes);
app.use(eventRoutes);
app.use(verifyRoutes);
app.use(orderRoutes);
app.use(reviewRoutes);

//FAKE USER🚨
io.use((socket, next) => {
  // Mock user identity for now (server-side)
  const jwtUser = {
    id: 100001,
    name: '雨墨'
  };
  socket.user = jwtUser;
  next();
});

//this part for socketIO
io.on("connection", (socket) => {
  // 这里调用修正后的函数
  registerChatHandler(io, socket);

  socket.on("disconnect", () => {
    console.log("disconnect");
  });
});

// HTTP API调用读取函数
app.get('/api/messages/history', async (req, res) => {
  // 调用chatHandler.js的getChatHistory
  const result = await getChatHistory(req.query);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

//server listen on port 3000
server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
