/* eslint-env node, es2021 */
const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");

const corsMiddleware = require("./routes/cors.js");
const { uploadDir } = require("./routes/upload.js");

//import my js files here
const pool = require("./help_me_db.js");
const { registerChatHandler, getChatHistory }= require('./chatHandler.js');

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
app.use('/test', testRoutes);

// 芒果引入数据库连接函数
const connectDB = require('./help_me_chat_db');

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

// simple CORS for the ionic dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8100');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 将数据库当中的 /img/* 映射到本地 upload/img 文件夹
//1-14 修改建议： img放到src目录下
app.use('/img', express.static(join(__dirname, '..', 'upload', 'img')));

const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery:{},
  //cors allow connections
  cors: {
    origin: 'http://localhost:8100',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

// 简单的登录接口：接收 { phone, code }，验证码固定为 '1234'
app.post('/login', async (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });
  if (String(code) !== '1234') return res.status(401).json({ error: 'Invalid verification code' }); // 固定验证码校验，后续需要更换！！！
  try {
    const [rows] = await pool.query('SELECT UserId, UserName, PhoneNumber FROM Users WHERE PhoneNumber = ? LIMIT 1', [phone]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('DB query error (login):', err);
    return res.status(500).json({ error: 'Database query failed' });
  }
});

app.use(express.json());
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
