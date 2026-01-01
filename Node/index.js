/* eslint-env node, es2021 */
const express = require('express');
const { createServer } = require('node:http');
const { join} = require('node:path');
const { Server } = require('socket.io');

//import my js files here
const pool = require('./help_me_db.js');
const registerChatHandler = require('./chatHandler.js');

const app = express();
app.use(express.json());

// simple CORS for the ionic dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8100');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
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

/*
//read the database (messages table)
app.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM messages');
  console.log("Reading...");
  res.json(rows); // 关键：返回纯 JSON 数据
  console.log(rows);
});
*/

//this is a test html for simple chat
app.get('/test', (req, res) => {
    res.sendFile(join(__dirname + '/test.html'));
});

//测试数据库连接
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT UserId, UserName, PhoneNumber, Location FROM Users LIMIT 10');
    res.json(rows);
  } catch (err) {
    console.error('DB query error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// 测试获取用户发布的事件列表
app.get('/users/:id/events', async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      'SELECT EventId, EventTitle, EventCategory, Location, Price, CreateTime FROM Events WHERE CreatorId = ? ORDER BY CreateTime DESC LIMIT 50',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('DB query error (events):', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

//this part for socketIO
io.on('connection', (socket) => {
  registerChatHandler(io, socket);

  socket.on('disconnect', () => {
    console.log('disconnect');
  })
})

//server listen on port 3000
server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});
