//事件相关内容
const express = require("express");
const pool = require("../help_me_db.js");
const { upload, withMulter, cleanupUploadedFiles } = require("./upload.js");
const { authRequired } = require("./auth.js");

const router = express.Router();

// 图片上传接口（仅上传，不入库）
router.post(
  "/upload/images",
  withMulter(upload.array("images", 10)),
  (req, res) => {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, error: "未上传任何图片" });
    }
    const paths = files.map((f) => `/img/${f.filename}`);
    return res.json({ success: true, paths });
  },
);

// 获取卡片列表（用于首页展示）
router.get("/api/cards", async (req, res) => {
  try {
    const { type } = req.query;
    let sqlWhere = "";
    let sqlParams = [];

    if (type) {
      let eventType;
      if (type === "help") eventType = 1;
      else if (type === "request") eventType = 0;
      else {
        return res
          .status(400)
          .json({ msg: "参数错误，type需为 request 或 help" });
      }
      sqlWhere = " WHERE e.EventType = ?";
      sqlParams = [eventType];
    }
    const { search } = req.query;
    if (search) {
      sqlWhere += sqlWhere ? " AND" : " WHERE";
      sqlWhere += " (e.EventDetails LIKE ? OR e.EventTitle LIKE ?)";
      const searchPattern = `%${search}%`;
      sqlParams.push(searchPattern, searchPattern);
    }

    const [rows] = await pool.query(
      `
      SELECT
        e.EventId AS id,
        e.Photos AS photos,
        e.Location AS address,
        e.EventTitle AS title,
        e.EventDetails AS demand,
        e.Price AS price,
        e.CreateTime   AS createTime,   -- 新增
        u.UserName AS name,
        u.UserAvatar AS avatar,
        e.CreatorId AS creatorId   -- 新增
      FROM Events e
      JOIN Users u ON e.CreatorId = u.UserId
      ${sqlWhere}
      `,
      sqlParams,
    );

    const cardData = rows.map((item) => {
      let first = null;
      if (item.photos) {
        try {
          const arr = JSON.parse(item.photos);
          first = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
        } catch {
          // 兼容非 JSON 格式的旧数据（直接当作单张图片路径）
          first = item.photos;
        }
      }

      return {
        id: item.id,
        cardImage: first,
        address: item.address,
        demand: item.demand,
        price: item.price,
        createTime: item.createTime,
        name: item.name,
        avatar: item.avatar,
        creatorId: item.creatorId,
        title: item.title,   // 新增
        icon: "navigate-outline",
        distance: "距500m", // 实际项目中应计算真实距离
      };
    });

    return res.status(200).json(cardData);
  } catch (error) {
    console.error("数据库查询错误：", error);
    return res.status(500).json({ msg: "读取卡片数据失败" });
  }
});

// 发布新事件
router.post(
  "/events",
  authRequired,
  (req, res, next) => {
    const contentType = String(req.headers["content-type"] || "");
    if (!contentType.includes("multipart/form-data")) {
      return res.status(415).json({
        success: false,
        error: "请使用 multipart/form-data 格式提交表单",
      });
    }
    next();
  },

  withMulter(upload.array("images", 10)),

  async (req, res) => {
    const {
      EventTitle,
      EventType,
      EventCategory,
      Location,
      Price,
      EventDetails,
    } = req.body || {};

    const creatorId = Number(req.user?.id);
    if (!Number.isInteger(creatorId) || creatorId <= 0) {
      cleanupUploadedFiles(req.files);
      return res.status(401).json({ success: false, error: "未登录" });
    }

    if (!EventTitle || !EventCategory || !Location || !EventDetails) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ success: false, error: "缺少必填字段" });
    }

    const eventTypeNum = Number(EventType);
    if (![0, 1].includes(eventTypeNum)) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        error: "EventType 必须为 0（求助）或 1（帮助）",
      });
    }

    // Price校验
    const MAX_PRICE = 1_000_000;

    const priceStr = String(Price || "").trim();
    const price = priceStr === "" ? 0 : Number(priceStr);

    if (Number.isNaN(price) || price < 0 || price > MAX_PRICE) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        error: `Price 必须为 0 ~ ${MAX_PRICE} 之间的数字`,
      });
    }

    const files = req.files || [];
    const photoPaths = files.map((f) => `/img/${f.filename}`);
    const photosJson =
      photoPaths.length > 0 ? JSON.stringify(photoPaths) : null;

    // 数据库操作（带事务）

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO Events
          (CreatorId, EventTitle, EventType, EventCategory, Photos, Location, Price, EventDetails)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          creatorId,
          String(EventTitle),
          eventTypeNum,
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
      console.error("发布事件数据库错误:", err);
      if (conn) {
        await conn.rollback().catch(console.error);
      }
      cleanupUploadedFiles(req.files); // 事件发布失败，清理已上传文件
      return res.status(500).json({ success: false, error: "服务器内部错误" });
    } finally {
      if (conn) conn.release();
    }
  },
);

// 获取事件详情
router.get("/events/:id", async (req, res) => {
  const eventId = Number(req.params.id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "无效的事件ID" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT EventId, CreatorId, EventTitle, EventType, EventCategory, Photos, Location, Price, EventDetails, CreateTime FROM Events WHERE EventId = ? LIMIT 1",
      [eventId],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "事件不存在" });
    }

    return res.json({ success: true, event: rows[0] });
  } catch (err) {
    console.error("查询事件详情失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 更新事件（要求登录，并校验只能更新自己的）
router.put("/events/:id", authRequired, async (req, res) => {
  const eventId = Number(req.params.id);
  const creatorId = Number(req.user?.id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "无效的事件ID" });
  }

  const {
    EventTitle,
    EventType,
    EventCategory,
    Location,
    Price,
    EventDetails,
    Photos,
  } = req.body || {};

  if (!EventTitle || !EventCategory || !Location || !EventDetails) {
    return res.status(400).json({ success: false, error: "缺少必填字段" });
  }

  const eventTypeNum = Number(EventType);
  if (![0, 1].includes(eventTypeNum)) {
    return res.status(400).json({
      success: false,
      error: "EventType 必须为 0（求助）或 1（帮助）",
    });
  }

  const MAX_PRICE = 1_000_000;
  const priceStr = String(Price ?? "").trim();
  const price = priceStr === "" ? 0 : Number(priceStr);
  if (Number.isNaN(price) || price < 0 || price > MAX_PRICE) {
    return res.status(400).json({
      success: false,
      error: `Price 必须为 0 ~ ${MAX_PRICE} 之间的数字`,
    });
  }

  const hasPhotos = Object.prototype.hasOwnProperty.call(
    req.body || {},
    "Photos",
  );
  let photosValue = null;
  if (hasPhotos) {
    if (Photos == null || Photos === "") {
      photosValue = null;
    } else if (Array.isArray(Photos)) {
      photosValue = JSON.stringify(Photos);
    } else if (typeof Photos === "string") {
      const raw = Photos.trim();
      if (!raw) {
        photosValue = null;
      } else {
        try {
          const arr = JSON.parse(raw);
          photosValue = Array.isArray(arr) ? JSON.stringify(arr) : raw;
        } catch {
          photosValue = raw;
        }
      }
    } else {
      photosValue = null;
    }
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [checkRows] = await conn.query(
      "SELECT EventId FROM Events WHERE EventId = ? AND CreatorId = ? LIMIT 1",
      [eventId, creatorId],
    );

    if (!checkRows || checkRows.length === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ success: false, error: "事件不存在或无权编辑" });
    }

    const sets = [
      "EventTitle = ?",
      "EventType = ?",
      "EventCategory = ?",
      "Location = ?",
      "Price = ?",
      "EventDetails = ?",
    ];
    const params = [
      String(EventTitle),
      eventTypeNum,
      String(EventCategory),
      String(Location),
      price,
      String(EventDetails),
    ];

    if (hasPhotos) {
      sets.push("Photos = ?");
      params.push(photosValue);
    }

    params.push(eventId, creatorId);

    await conn.query(
      `UPDATE Events SET ${sets.join(", ")} WHERE EventId = ? AND CreatorId = ?`,
      params,
    );

    await conn.commit();
    return res.json({ success: true });
  } catch (err) {
    if (conn) {
      await conn.rollback().catch(console.error);
    }
    console.error("更新事件数据库错误:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  } finally {
    if (conn) conn.release();
  }
});

// 删除事件（要求登录，并校验只能删自己的）
router.delete("/events/:id", authRequired, async (req, res) => {
  const eventId = Number(req.params.id);
  const creatorId = Number(req.user?.id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "无效的事件ID" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. 检查事件是否存在且验证创建者（如需要）
    const [checkRows] = await conn.query(
      "SELECT EventId FROM Events WHERE EventId = ? AND CreatorId = ? LIMIT 1",
      [eventId, creatorId],
    );

    if (!checkRows || checkRows.length === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ success: false, error: "事件不存在或无权删除" });
    }

    // 2. 删除关联的订单
    await conn.query("DELETE FROM Orders WHERE EventId = ?", [eventId]);

    // 3. 删除事件本身
    const [delResult] = await conn.query(
      "DELETE FROM Events WHERE EventId = ?",
      [eventId],
    );

    await conn.commit();
    return res.json({
      success: true,
      deleted: true,
      ordersDeleted: delResult.affectedRows,
    });
  } catch (err) {
    if (conn) {
      await conn.rollback().catch(console.error);
    }
    console.error("删除事件数据库错误:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  } finally {
    if (conn) conn.release();
  }
});
router.get('/api/provider-profile', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ msg: '缺少 userId' });

  const [rows] = await pool.query(
    `SELECT u.UserId,
            u.UserName,
            u.CreateTime,
            u.UserAvatar AS avatar,
            IFNULL(p.ServiceRanking, 0) AS serviceScore,
            IFNULL(p.OrderCount, 0)     AS orderCount   -- 新增
     FROM Users u
            LEFT JOIN Providers p ON p.ProviderId = u.UserId
     WHERE u.UserId = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) return res.status(404).json({ msg: '用户不存在' });

  const row = rows[0];
  row.avatar = row.avatar ? row.avatar : '/assets/icon/user.svg';
  res.json({ success: true, data: row });
});

module.exports = router;
