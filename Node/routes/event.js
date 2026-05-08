// routes/event.js
const express = require("express");
const pool = require("../help_me_db.js");
const { upload, withMulter, cleanupUploadedFiles } = require("./upload.js");
const { authRequired } = require("./auth.js");
const Message = require("../models/Message");
const { translateFields } = require("./translateHelper");

const router = express.Router();

let eventsGeoColumnsState = {
  checked: false,
  supported: false,
};

async function supportsEventGeoColumns(conn) {
  if (eventsGeoColumnsState.checked) return eventsGeoColumnsState.supported;

  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'Events'
       AND COLUMN_NAME = 'LocationPlaceId'`
  );

  eventsGeoColumnsState = {
    checked: true,
    supported: Number(rows?.[0]?.cnt || 0) === 1,
  };
  return eventsGeoColumnsState.supported;
}

function normalizeLocationPlaceId(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

// 上传图片
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
  }
);


router.get("/api/cards", async (req, res) => {
  try {
    const { type, search } = req.query;
    let sqlWhere = "";
    let sqlParams = [];

    if (type) {
      let eventType;
      if (type === "help") eventType = 1;
      else if (type === "request") eventType = 0;
      else return res.status(400).json({ msg: "type 无效" });
      sqlWhere = " WHERE e.EventType = ?";
      sqlParams = [eventType];
    }
    if (search) {
      sqlWhere += sqlWhere ? " AND" : " WHERE";
      sqlWhere += " (e.EventDetails LIKE ? OR e.EventTitle LIKE ?)";
      const p = `%${search}%`;
      sqlParams.push(p, p);
    }

    const [rows] = await pool.query(
      `SELECT
        e.EventId AS id,
        e.Photos AS photos,
        e.Location AS address,
        e.LocationPlaceId AS locationPlaceId,
        e.EventTitle AS title,
        e.EventDetails AS demand,
        e.Price AS price,
        e.CreateTime AS createTime,
        u.UserName AS name,
        u.UserAvatar AS avatar,
        e.CreatorId AS creatorId
      FROM Events e
      JOIN Users u ON e.CreatorId = u.UserId
      ${sqlWhere}`,
      sqlParams
    );

    let cards = rows.map((item) => {
      let first = null;
      if (item.photos) {
        try {
          const arr = JSON.parse(item.photos);
          first = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
        } catch {
          first = item.photos;
        }
      }
      return {
        id: item.id,
        cardImage: first,
        address: item.address,
        locationPlaceId: item.locationPlaceId || null,
        demand: item.demand,
        price: item.price,
        createTime: item.createTime,
        name: item.name,
        avatar: item.avatar,
        creatorId: item.creatorId,
        title: item.title,
        icon: "navigate-outline",
        distance: "距500m",
      };
    });

    // 翻译
    const lang = req.query.lang || 'zh';
    if (lang !== 'zh') {
      cards = await Promise.all(
        cards.map(card =>
          translateFields(card, ['title', 'demand', 'address'], lang, 'zh')
        )
      );
    }

    return res.status(200).json(cards);
  } catch (err) {
    console.error("卡片查询错误：", err);
    return res.status(500).json({ msg: "读取卡片数据失败" });
  }
});


router.post(
  "/events",
  authRequired,
  (req, res, next) => {
    if (!String(req.headers["content-type"]).includes("multipart/form-data")) {
      return res.status(415).json({ success: false, error: "请使用 multipart/form-data" });
    }
    next();
  },
  withMulter(upload.array("images", 10)),
  async (req, res) => {
    const {
      EventTitle, EventType, EventCategory, Location,
      LocationPlaceId, Price, EventDetails
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
      return res.status(400).json({ success: false, error: "EventType 无效" });
    }

    const MAX_PRICE = 1_000_000;
    const price = Number(Price || 0);
    if (Number.isNaN(price) || price < 0 || price > MAX_PRICE) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ success: false, error: `价格无效` });
    }

    const files = req.files || [];
    const photoPaths = files.map(f => `/img/${f.filename}`);
    const photosJson = photoPaths.length > 0 ? JSON.stringify(photoPaths) : null;

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const hasGeo = await supportsEventGeoColumns(conn);

      const cols = [
        "CreatorId", "EventTitle", "EventType", "EventCategory",
        "Photos", "Location", "Price", "EventDetails"
      ];
      const vals = [
        creatorId, String(EventTitle), eventTypeNum, String(EventCategory),
        photosJson, String(Location), price, String(EventDetails)
      ];
      if (hasGeo) {
        cols.push("LocationPlaceId");
        vals.push(normalizeLocationPlaceId(LocationPlaceId));
      }

      const [result] = await conn.query(
        `INSERT INTO Events (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
        vals
      );
      await conn.commit();

      await Message.create({
        roomId: `system_${creatorId}`,
        text: `您的订单：“${EventTitle}”发布成功！`,
        senderId: creatorId,
        userName: "系统通知",
        sendTime: new Date(),
      }).catch(e => console.error("消息写入失败:", e));

      return res.json({ success: true, EventId: result.insertId, paths: photoPaths });
    } catch (err) {
      if (conn) await conn.rollback().catch(() => {});
      cleanupUploadedFiles(req.files);
      console.error("发布事件错误:", err);
      return res.status(500).json({ success: false, error: "服务器错误" });
    } finally {
      if (conn) conn.release();
    }
  }
);


router.get("/events/:id", async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "无效 ID" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT EventId, CreatorId, EventTitle, EventType, EventCategory,
              Photos, Location, LocationPlaceId, Price, EventDetails, CreateTime
       FROM Events WHERE EventId = ? LIMIT 1`,
      [eventId]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: "不存在" });

    let event = rows[0];

    const lang = req.query.lang || 'zh';
    if (lang !== 'zh') {
      event = await translateFields(
        event,
        ['EventTitle', 'EventDetails', 'Location'],
        lang,
        'zh'
      );
    }

    return res.json({ success: true, event });
  } catch (err) {
    console.error("详情错误:", err);
    return res.status(500).json({ success: false, error: "服务器错误" });
  }
});


router.put("/events/:id", authRequired, async (req, res) => {
  const eventId = Number(req.params.id);
  const creatorId = Number(req.user?.id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "无效 ID" });
  }

  const {
    EventTitle, EventType, EventCategory, Location,
    LocationPlaceId, Price, EventDetails, Photos
  } = req.body || {};

  if (!EventTitle || !EventCategory || !Location || !EventDetails) {
    return res.status(400).json({ success: false, error: "缺少必填字段" });
  }
  const eventTypeNum = Number(EventType);
  if (![0, 1].includes(eventTypeNum)) {
    return res.status(400).json({ success: false, error: "EventType 无效" });
  }
  const MAX_PRICE = 1_000_000;
  const price = Number(Price || 0);
  if (Number.isNaN(price) || price < 0 || price > MAX_PRICE) {
    return res.status(400).json({ success: false, error: `价格无效` });
  }

  let photosValue = undefined;
  if (Object.prototype.hasOwnProperty.call(req.body, "Photos")) {
    if (Photos == null || Photos === "") photosValue = null;
    else if (Array.isArray(Photos)) photosValue = JSON.stringify(Photos);
    else if (typeof Photos === "string") photosValue = Photos.trim() || null;
    else photosValue = null;
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [check] = await conn.query(
      "SELECT EventId FROM Events WHERE EventId = ? AND CreatorId = ? LIMIT 1",
      [eventId, creatorId]
    );
    if (!check.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "不存在或无权编辑" });
    }

    const sets = [
      "EventTitle = ?", "EventType = ?", "EventCategory = ?",
      "Location = ?", "Price = ?", "EventDetails = ?", "LocationPlaceId = ?"
    ];
    const params = [
      String(EventTitle), eventTypeNum, String(EventCategory),
      String(Location), price, String(EventDetails),
      normalizeLocationPlaceId(LocationPlaceId)
    ];
    if (photosValue !== undefined) {
      sets.push("Photos = ?");
      params.push(photosValue);
    }
    params.push(eventId, creatorId);

    await conn.query(
      `UPDATE Events SET ${sets.join(", ")} WHERE EventId = ? AND CreatorId = ?`,
      params
    );
    await conn.commit();

    await Message.create({
      roomId: `system_${creatorId}`,
      text: `您的订单：“${EventTitle}”已修改。`,
      senderId: creatorId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch(e => console.error("消息写入失败:", e));

    return res.json({ success: true });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("更新错误:", err);
    return res.status(500).json({ success: false, error: "服务器错误" });
  } finally {
    if (conn) conn.release();
  }
});


router.delete("/events/:id", authRequired, async (req, res) => {
  const eventId = Number(req.params.id);
  const creatorId = Number(req.user?.id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "无效 ID" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [check] = await conn.query(
      "SELECT EventId, EventTitle FROM Events WHERE EventId = ? AND CreatorId = ? LIMIT 1",
      [eventId, creatorId]
    );
    if (!check.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "不存在或无权删除" });
    }
    const title = check[0].EventTitle;

    await conn.query("DELETE FROM Orders WHERE EventId = ?", [eventId]);
    const [del] = await conn.query("DELETE FROM Events WHERE EventId = ?", [eventId]);
    await conn.commit();

    await Message.create({
      roomId: `system_${creatorId}`,
      text: `您的订单：“${title}”已删除。`,
      senderId: creatorId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch(e => console.error("消息写入失败:", e));

    return res.json({ success: true, deleted: true, ordersDeleted: del.affectedRows });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("删除错误:", err);
    return res.status(500).json({ success: false, error: "服务器错误" });
  } finally {
    if (conn) conn.release();
  }
});


router.get("/api/provider-profile", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ msg: "缺少 userId" });

  const [rows] = await pool.query(
    `SELECT u.UserId, u.UserName, u.CreateTime, u.UserAvatar AS avatar,
            IFNULL(p.ServiceRanking, 0) AS serviceScore,
            IFNULL(p.OrderCount, 0) AS orderCount
     FROM Users u LEFT JOIN Providers p ON p.ProviderId = u.UserId
     WHERE u.UserId = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) return res.status(404).json({ msg: "用户不存在" });

  let row = rows[0];
  row.avatar = row.avatar || "/assets/icon/user.svg";

  // 如需要翻译用户名，可在此添加类似逻辑
  res.json({ success: true, data: row });
});

module.exports = router;