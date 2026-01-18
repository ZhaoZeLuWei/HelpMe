//事件相关内容
const express = require("express");
const pool = require("../help_me_db.js");
const { upload, withMulter, cleanupUploadedFiles } = require("./upload.js");

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
        name: item.name,
        avatar: item.avatar,
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
      CreatorId,
    } = req.body || {};

    // 表单必要内容校验
    if (!CreatorId) {
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
    const priceStr = String(Price || "").trim();
    const price = priceStr === "" ? 0 : Number(priceStr);
    if (isNaN(price) || price < 0) {
      cleanupUploadedFiles(req.files);
      return res
        .status(400)
        .json({ success: false, error: "Price 必须为非负数字" });
    }

    //  CreatorId校验
    const creatorId = Number(CreatorId);
    if (!Number.isInteger(creatorId) || creatorId <= 0) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ success: false, error: "无效的用户ID" });
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
      cleanupUploadedFiles(req.files); // 事务失败，清理已上传文件
      return res.status(500).json({ success: false, error: "服务器内部错误" });
    } finally {
      if (conn) conn.release();
    }
  },
);

module.exports = router;
