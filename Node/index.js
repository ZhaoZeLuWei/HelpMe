/* eslint-env node, es2021 */
const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");

const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");

//import my js files here
const pool = require("./help_me_db.js");
const registerChatHandler = require("./chatHandler.js");

//all routes imports here 这里引用路由
const testRoutes = require("./routes/test.js");

//use all routes here 这里使用路由，定义URL路径
const app = express();
app.use(express.json());
app.use("/test", testRoutes);

// simple CORS for the ionic dev server
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:8100");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// 静态图片映射：/img/* -> upload/img/*

const uploadDir = join(__dirname, "..", "upload", "img");
fs.mkdirSync(uploadDir, { recursive: true });

app.use("/img", express.static(uploadDir));

// multer：接收图片，保存到 upload/img

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : "";
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 单张<=5MB，最多10张
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// 上传接口：返回路径数组 ['/img/xxx.jpg', ...]
app.post("/upload/images", upload.array("images", 10), (req, res) => {
  const files = req.files || [];
  const paths = files.map((f) => `/img/${f.filename}`);
  res.json({ success: true, paths });
});

const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: "http://localhost:8100",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// 简单的登录接口：接收 { phone, code }，验证码固定为 '1234'
app.post("/login", async (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code)
    return res.status(400).json({ error: "phone and code required" });
  if (String(code) !== "1234")
    return res.status(401).json({ error: "Invalid verification code" }); // 固定验证码校验，后续需要更换！！！
  try {
    const [rows] = await pool.query(
      "SELECT UserId, UserName, PhoneNumber FROM Users WHERE PhoneNumber = ? LIMIT 1",
      [phone],
    );
    if (!rows || rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("DB query error (login):", err);
    return res.status(500).json({ error: "Database query failed" });
  }
});

//测试数据库连接
app.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT UserId, UserName, PhoneNumber, Location FROM Users LIMIT 10",
    );
    res.json(rows);
  } catch (err) {
    console.error("DB query error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// 测试获取用户发布的事件列表
app.get("/users/:id/events", async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      "SELECT EventId, EventTitle, EventCategory, Location, Price, Photos, CreateTime FROM Events WHERE CreatorId = ? ORDER BY CreateTime DESC LIMIT 50",
      [userId],
    );
    res.json(rows);
  } catch (err) {
    console.error("DB query error (events):", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// 获取用户完整资料（包含 Consumers/Providers 信息）
app.get("/users/:id/profile", async (req, res) => {
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
      [userId],
    );
    if (!rows || rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("DB query error (profile):", err);
    return res.status(500).json({ error: "Database query failed" });
  }
});

// 获取卡片数据接口
app.get("/api/cards", async (req, res) => {
  try {
    const { type } = req.query;
    let eventType = null;
    let sqlWhere = "";
    let sqlParams = [];

    if (type) {
      if (type === "help") eventType = 1;
      else if (type === "request") eventType = 0;
      else
        return res
          .status(400)
          .json({ msg: "参数错误，type需为 request 或 help" });

      sqlWhere = " WHERE e.EventType = ?";
      sqlParams = [eventType];
    }

    const [rows] = await pool.query(
      `
      SELECT
        e.EventId AS id,
        e.Photos AS photos,
        e.Location AS address,
        e.EventDetails AS demand,
        e.Price AS price,
        u.UserName AS name,
        u.UserAvatar AS avatar
      FROM Events e
      JOIN Users u ON e.CreatorId = u.UserId
      ${sqlWhere}
    `,
      sqlParams,
    );

    const cardData = rows.map((item) => {
      // Photos 在库里存的是 JSON 字符串：["/img/a.jpg","/img/b.jpg"]
      let first = null;
      if (item.photos) {
        try {
          const arr = JSON.parse(item.photos);
          first = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
        } catch {
          // 兼容老数据：如果不是 JSON，就当作单张路径
          first = item.photos;
        }
      }

      return {
        id: item.id,
        cardImage: first, // 给前端直接用的单张图
        address: item.address,
        demand: item.demand,
        price: item.price,
        name: item.name,
        avatar: item.avatar,
        icon: "navigate-outline",
        distance: "距500m",
      };
    });

    res.status(200).json(cardData);
  } catch (error) {
    console.error("数据库查询错误：", error);
    res.status(500).json({ msg: "读取卡片数据失败" });
  }
});

// 发布：只写路径（Photos 是 JSON 字符串或 null）
app.post("/events", async (req, res) => {
  const {
    EventTitle,
    EventType,
    EventCategory,
    Location,
    Price,
    EventDetails,
    Photos, // JSON string: '["/img/a.jpg",...]'
    CreatorId,
  } = req.body || {};

  if (!CreatorId)
    return res.status(401).json({ success: false, error: "未登录" });
  if (!EventTitle || !EventCategory || !Location || !EventDetails) {
    return res.status(400).json({ success: false, error: "缺少必填字段" });
  }

  const eventType = Number(EventType);
  if (![0, 1].includes(eventType)) {
    return res
      .status(400)
      .json({ success: false, error: "EventType 必须为 0(求助) 或 1(帮助)" });
  }

  const price = Price == null ? 0 : Number(Price);
  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ success: false, error: "Price 不合法" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO Events
        (CreatorId, EventTitle, EventType, EventCategory, Photos, Location, Price, EventDetails)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(CreatorId),
        String(EventTitle),
        eventType,
        String(EventCategory),
        Photos ?? null,
        String(Location),
        price,
        String(EventDetails),
      ],
    );

    return res.json({ success: true, EventId: result.insertId });
  } catch (err) {
    console.error("DB insert error (events):", err);
    return res
      .status(500)
      .json({ success: false, error: "Database insert failed" });
  }
});

//this part for socketIO
io.on("connection", (socket) => {
  registerChatHandler(io, socket);

  socket.on("disconnect", () => {
    console.log("disconnect");
  });
});

//server listen on port 3000
server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
