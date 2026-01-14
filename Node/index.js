/* eslint-env node, es2021 */
const express = require('express');
const { createServer } = require('node:http');
const { join} = require('node:path');
const { Server } = require('socket.io');

//import my js files here
const pool = require('./help_me_db.js');
const registerChatHandler = require('./chatHandler.js');

//all routes imports here 这里引用路由
const testRoutes = require('./routes/test.js');

//use all routes here 这里使用路由，定义URL路径
const app = express();
app.use(express.json());
app.use('/test', testRoutes);

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

// 获取用户完整资料（包含 Consumers/Providers 信息）
app.get('/users/:id/profile', async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT u.UserId, u.UserName, u.PhoneNumber, u.UserAvatar, u.Location, u.BirthDate, u.Introduction,
              (SELECT VerificationStatus FROM Verifications v WHERE v.ProviderId = u.UserId ORDER BY v.SubmissionTime DESC LIMIT 1) AS VerificationStatus,
              c.BuyerRanking, p.ProviderRole, p.OrderCount, p.ServiceRanking
       FROM Users u
       LEFT JOIN Consumers c ON u.UserId = c.ConsumerId
       LEFT JOIN Providers p ON u.UserId = p.ProviderId
       WHERE u.UserId = ? LIMIT 1`,
      [userId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('DB query error (profile):', err);
    return res.status(500).json({ error: 'Database query failed' });
  }
});

// 获取卡片数据接口
app.get('/api/cards', async (req, res) => {
  try {
    const { type } = req.query;
    let eventType = null;
    let sqlWhere = '';
    let sqlParams = [];

    if (type) {
      if (type === 'help') {
        eventType = 1;
      } else if (type === 'request') {
        eventType = 0;
      } else {
        return res.status(400).json({ msg: '参数错误，type需为 request 或 help' });
      }
      sqlWhere = ' WHERE e.EventType = ?';
      sqlParams = [eventType];
    }

    // 2. 执行SQL查询
    const [rows] = await pool.query(`
      SELECT
        e.Eventid AS id,
        e.Photos AS cardImage,
        e.Location AS address,
        e.EventDetails AS demand,
        e.Price AS price,
        u.UserName AS name,
        u.UserAvatar AS avatar
      FROM Events e
      JOIN Users u ON e.CreatorId = u.UserId
      ${sqlWhere}
    `, sqlParams);

    // 3. 补充固定字段
    const cardData = rows.map(item => ({
      ...item,
      icon: 'navigate-outline',
      distance: '距500m'
    }));

    res.status(200).json(cardData);
  } catch (error) {
    console.error('数据库查询错误：', error);
    res.status(500).json({ msg: '读取卡片数据失败' });
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
