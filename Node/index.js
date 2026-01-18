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

// upload  (出错/业务失败时清理已上传的文件)
function flattenMulterFiles(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  const all = [];
  for (const k of Object.keys(files)) {
    const arr = files[k];
    if (Array.isArray(arr)) all.push(...arr);
  }
  return all;
}

function safeUnlink(p) {
  try {
    fs.unlinkSync(p);
  } catch (_) {}
}

function cleanupUploadedFiles(files) {
  const all = flattenMulterFiles(files);
  for (const f of all) {
    if (f && f.path) safeUnlink(f.path);
  }
}

function withMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        cleanupUploadedFiles(req.files);
        return res
          .status(400)
          .json({ success: false, error: err.message || "upload failed" });
      }
      return next();
    });
  };
}

// 上传接口：返回路径数组 ['/img/xxx.jpg', ...]
app.post(
  "/upload/images",
  withMulter(upload.array("images", 10)),
  (req, res) => {
    const files = req.files || [];
    const paths = files.map((f) => `/img/${f.filename}`);
    res.json({ success: true, paths });
  },
);

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

// 发布事件
// 文本：CreatorId, EventTitle, EventType(0/1), EventCategory, Location, Price, EventDetails
// 图片：images (0~10张)
const eventUpload = withMulter(upload.array("images", 10));
app.post("/events", (req, res) => {
  const ct = String(req.headers["content-type"] || "");
  if (!ct.includes("multipart/form-data")) {
    return res
      .status(415)
      .json({ success: false, error: "请使用 multipart/form-data 提交" });
  }

  eventUpload(req, res, async () => {
    const {
      EventTitle,
      EventType,
      EventCategory,
      Location,
      Price,
      EventDetails,
      CreatorId,
    } = req.body || {};

    if (!CreatorId)
      return res.status(401).json({ success: false, error: "未登录" });
    if (!EventTitle || !EventCategory || !Location || !EventDetails) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ success: false, error: "缺少必填字段" });
    }

    const eventType = Number(EventType);
    if (![0, 1].includes(eventType)) {
      cleanupUploadedFiles(req.files);
      return res
        .status(400)
        .json({ success: false, error: "EventType 必须为 0(求助) 或 1(帮助)" });
    }

    const price =
      Price == null || String(Price).trim() === "" ? 0 : Number(Price);
    if (!Number.isFinite(price) || price < 0) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ success: false, error: "Price 不合法" });
    }

    const files = req.files || [];
    const photoPaths = files.map((f) => `/img/${f.filename}`);
    const photosJson =
      photoPaths.length > 0 ? JSON.stringify(photoPaths) : null;

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO Events
          (CreatorId, EventTitle, EventType, EventCategory, Photos, Location, Price, EventDetails)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(CreatorId),
          String(EventTitle),
          eventType,
          String(EventCategory),
          photosJson,
          String(Location),
          price,
          String(EventDetails),
        ],
      );

      await conn.commit();
      return res.json({
        success: true,
        EventId: result.insertId,
        paths: photoPaths,
      });
    } catch (err) {
      console.error("DB insert error (events):", err);
      try {
        if (conn) await conn.rollback();
      } catch (_) {}
      cleanupUploadedFiles(req.files);
      return res
        .status(500)
        .json({ success: false, error: "Database insert failed" });
    } finally {
      if (conn) conn.release();
    }
  });
});

// 认证提交
// 文本：ProviderId, ServiceCategory(1/2/3), RealName, IdCardNumber, Location, Introduction
// 图片：idCard(1~2张), cert(1~5张)
// 逻辑：
//    1) 首次提交必须上传 idCard + cert
//    2) 重复提交：未上传的新图不会覆盖旧图（空值不覆盖），但状态强制改回待审核(0)
//    3) 手机号是登录账号，Users.PhoneNumber不进行修改
const verificationUpload = withMulter(
  upload.fields([
    { name: "idCard", maxCount: 2 },
    { name: "cert", maxCount: 5 },
  ]),
);

app.post("/verifications", (req, res) => {
  const ct = String(req.headers["content-type"] || "");
  if (!ct.includes("multipart/form-data")) {
    return res
      .status(415)
      .json({ success: false, error: "请使用 multipart/form-data 提交" });
  }

  verificationUpload(req, res, async () => {
    const {
      ProviderId,
      ServiceCategory,
      RealName,
      IdCardNumber,
      Location,
      Introduction,
    } = req.body || {};

    if (!ProviderId) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    if (
      ServiceCategory === undefined ||
      ServiceCategory === null ||
      String(ServiceCategory).trim() === ""
    ) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ success: false, error: "请填写身份类型" });
    }

    const providerId = Number(ProviderId);
    const serviceCategory = Number(ServiceCategory);

    if (![1, 2, 3].includes(serviceCategory)) {
      cleanupUploadedFiles(req.files);
      return res
        .status(400)
        .json({ success: false, error: "ServiceCategory 必须为 1、2 或 3" });
    }

    const hasValue = (v) =>
      v !== undefined && v !== null && String(v).trim() !== "";

    const idCardFiles = (req.files && req.files.idCard) || [];
    const certFiles = (req.files && req.files.cert) || [];

    const idCardPaths = idCardFiles.map((f) => `/img/${f.filename}`);
    const certPaths = certFiles.map((f) => `/img/${f.filename}`);

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // 0) 先确保 Providers 存在
      await conn.query(
        `INSERT INTO Providers (ProviderId, ProviderRole, OrderCount, ServiceRanking)
         VALUES (?, ?, 0, 0)
         ON DUPLICATE KEY UPDATE ProviderRole = ?`,
        [providerId, serviceCategory, serviceCategory],
      );

      // 1) Users：只更新“非空字段”（空值不覆盖，不包含手机号）
      const uSets = [];
      const uParams = [];

      if (hasValue(RealName)) {
        uSets.push("RealName = ?");
        uParams.push(String(RealName).trim());
      }

      if (hasValue(IdCardNumber)) {
        const idc = String(IdCardNumber).trim();
        const [dup] = await conn.query(
          "SELECT UserId FROM Users WHERE IdCardNumber = ? AND UserId <> ? LIMIT 1",
          [idc, providerId],
        );
        if (dup && dup.length > 0) {
          throw new Error("该身份证号已被其他账号使用");
        }
        uSets.push("IdCardNumber = ?");
        uParams.push(idc);
      }

      if (hasValue(Location)) {
        uSets.push("Location = ?");
        uParams.push(String(Location).trim());
      }
      if (hasValue(Introduction)) {
        uSets.push("Introduction = ?");
        uParams.push(String(Introduction));
      }

      if (uSets.length > 0) {
        uParams.push(providerId);
        await conn.query(
          `UPDATE Users SET ${uSets.join(", ")} WHERE UserId = ?`,
          uParams,
        );
      }

      // 2) 找最近一条认证记录（不管状态）
      const [rows] = await conn.query(
        `SELECT VerificationId, IdCardPhoto, ProfessionPhoto
         FROM Verifications
         WHERE ProviderId = ?
         ORDER BY SubmissionTime DESC
         LIMIT 1`,
        [providerId],
      );

      const hasPrev = rows && rows.length > 0;
      const prev = hasPrev ? rows[0] : null;

      // 3) 首次提交：必须上传 idCard + cert
      if (!hasPrev) {
        if (idCardPaths.length === 0) throw new Error("请上传身份证照片");
        if (certPaths.length === 0) throw new Error("请上传职业证书照片");
      }

      if (hasPrev) {
        const verificationId = prev.VerificationId;

        const vSets = [
          "ServiceCategory = ?",
          "VerificationStatus = 0",
          "SubmissionTime = NOW()",
          "PassingTime = NULL",
          "Results = NULL",
        ];
        const vParams = [serviceCategory];

        // 只在有新图时覆盖
        if (idCardPaths.length > 0) {
          vSets.push("IdCardPhoto = ?");
          vParams.push(JSON.stringify(idCardPaths));
        }
        if (certPaths.length > 0) {
          vSets.push("ProfessionPhoto = ?");
          vParams.push(JSON.stringify(certPaths));
        }

        vParams.push(verificationId);

        await conn.query(
          `UPDATE Verifications SET ${vSets.join(", ")} WHERE VerificationId = ?`,
          vParams,
        );

        await conn.commit();
        return res.json({
          success: true,
          VerificationId: verificationId,
          message: "认证信息已更新，状态已改为待审核",
          idCardPaths,
          certPaths,
        });
      }

      // 没有历史记录：插入新认证
      const [result] = await conn.query(
        `INSERT INTO Verifications
          (ProviderId, ServiceCategory, VerificationStatus, IdCardPhoto, ProfessionPhoto, SubmissionTime)
         VALUES (?, ?, 0, ?, ?, NOW())`,
        [
          providerId,
          serviceCategory,
          JSON.stringify(idCardPaths),
          JSON.stringify(certPaths),
        ],
      );

      await conn.commit();
      return res.json({
        success: true,
        VerificationId: result.insertId,
        message: "认证提交成功，请等待审核",
        idCardPaths,
        certPaths,
      });
    } catch (err) {
      console.error("DB insert/update error (verifications):", err);
      try {
        if (conn) await conn.rollback();
      } catch (_) {}

      cleanupUploadedFiles(req.files);

      const msg = err && err.message ? err.message : "Database insert failed";
      if (
        msg.includes("请上传身份证") ||
        msg.includes("请上传职业") ||
        msg.includes("身份类型") ||
        msg.includes("ServiceCategory") ||
        msg.includes("身份证号已被")
      ) {
        return res.status(400).json({ success: false, error: msg });
      }

      return res
        .status(500)
        .json({ success: false, error: "Database insert failed" });
    } finally {
      if (conn) conn.release();
    }
  });
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
