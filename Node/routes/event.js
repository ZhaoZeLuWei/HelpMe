//事件相关内容
const express = require("express");
const pool = require("../help_me_db.js");
const { upload, withMulter, cleanupUploadedFiles } = require("./upload.js");
const { authRequired, adminRequired } = require("./auth.js");
const { sendSystemMessage } = require("../chatHandler.js");
const {
  moderateContent,
  moderateContents,
} = require("../Services/contentModeration.js");
const router = express.Router();

function normalizeLocationPlaceId(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

// 图片上传接口（仅上传，不入库，需登录）
router.post(
  "/upload/images",
  authRequired,
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
      sqlWhere +=
        " (e.EventDetails LIKE ? OR e.EventTitle LIKE ? OR e.EventId IN (SELECT EventId FROM EventTags WHERE Tag LIKE ?))";
      const searchPattern = `%${search}%`;
      sqlParams.push(searchPattern, searchPattern, searchPattern);
    }

    // 过滤已解决/已下架的事件（Status=1）
    sqlWhere += sqlWhere ? " AND" : " WHERE";
    sqlWhere += " e.Status = 0";

    const [rows] = await pool.query(
      `
      SELECT
        e.EventId AS id,
        e.Photos AS photos,
        e.Location AS address,
        e.LocationPlaceId AS locationPlaceId,
        e.LocationLng AS lng,
        e.LocationLat AS lat,
        e.EventTitle AS title,
        e.EventDetails AS demand,
        e.Price AS price,
        e.CreateTime   AS createTime,
        u.UserName AS name,
        u.UserAvatar AS avatar,
        e.CreatorId AS creatorId,
        et.TagList AS tags
      FROM Events e
      JOIN Users u ON e.CreatorId = u.UserId
      LEFT JOIN (
        SELECT EventId, GROUP_CONCAT(Tag SEPARATOR ',') AS TagList
        FROM EventTags GROUP BY EventId
      ) et ON e.EventId = et.EventId
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
        locationPlaceId: item.locationPlaceId || null,
        lng: item.lng != null ? Number(item.lng) : null,
        lat: item.lat != null ? Number(item.lat) : null,
        demand: item.demand,
        price: item.price,
        createTime: item.createTime,
        name: item.name,
        avatar: item.avatar,
        creatorId: item.creatorId,
        title: item.title,
        tags: item.tags || "",
        icon: "navigate-outline",
        distance: "距500m",
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
      LocationPlaceId,
      LocationLng,
      LocationLat,
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

    // 内容安全审核（批量检测，只调用一次API）
    try {
      const checkResult = await moderateContents(
        {
          EventTitle: EventTitle,
          EventCategory: EventCategory,
          EventDetails: EventDetails,
        },
        creatorId.toString(),
      );

      if (!checkResult.safe) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          error: checkResult.message,
          code: "CONTENT_MODERATION_FAILED",
        });
      }
    } catch (moderationError) {
      console.error("内容审核异常:", moderationError);
      cleanupUploadedFiles(req.files);
      return res.status(500).json({
        success: false,
        error: "内容安全检测暂时不可用，请稍后重试",
        code: "CONTENT_MODERATION_ERROR",
      });
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

    // 解析 Tags（来自 AI 辅助功能）
    let tagsArray = [];
    if (req.body.Tags) {
      try {
        tagsArray = JSON.parse(req.body.Tags);
      } catch {
        tagsArray = String(req.body.Tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    // 数据库操作（带事务）

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const insertColumns = [
        "CreatorId",
        "EventTitle",
        "EventType",
        "EventCategory",
        "Photos",
        "Location",
        "LocationPlaceId",
        "LocationLng",
        "LocationLat",
        "Price",
        "EventDetails",
      ];

      const lng =
        LocationLng != null && LocationLng !== "" ? Number(LocationLng) : null;
      const lat =
        LocationLat != null && LocationLat !== "" ? Number(LocationLat) : null;

      const insertValues = [
        creatorId,
        String(EventTitle),
        eventTypeNum,
        String(EventCategory),
        photosJson,
        String(Location),
        normalizeLocationPlaceId(LocationPlaceId),
        lng != null && !isNaN(lng) ? lng : null,
        lat != null && !isNaN(lat) ? lat : null,
        price,
        String(EventDetails),
      ];

      const [result] = await conn.query(
        `INSERT INTO Events (${insertColumns.join(", ")}) VALUES (${insertColumns
          .map(() => "?")
          .join(", ")})`,
        insertValues,
      );

      await conn.commit();

      // 存储 AI 标签
      if (tagsArray.length > 0) {
        const tagSql = "INSERT INTO EventTags (EventId, Tag) VALUES ?";
        const tagValues = tagsArray.map((tag) => [result.insertId, tag]);
        await conn.query(tagSql, [tagValues]);
      }

      await sendSystemMessage({
        roomId: `system_${creatorId}`,
        text: `您的事件：“${EventTitle}”发布成功！请耐心等待...`,
        senderId: creatorId,
      }).catch((err) => console.error("发送系统消息失败:", err));

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
    const selectSql =
      "SELECT EventId, CreatorId, EventTitle, EventType, EventCategory, Photos, Location, LocationPlaceId, Price, EventDetails, Status, CreateTime FROM Events WHERE EventId = ? LIMIT 1";

    const [rows] = await pool.query(selectSql, [eventId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "事件不存在" });
    }

    const event = rows[0];

    // 已解决的事件不可再下单
    if (Number(event.Status) === 1) {
      return res.json({
        success: true,
        event: {
          ...event,
          canCreateOrder: false,
          activeOrder: null,
        },
      });
    }

    const [activeOrders] = await pool.query(
      `SELECT OrderId, OrderStatus
       FROM Orders
       WHERE EventId = ? AND OrderStatus IN (0, 1, 2)
       ORDER BY OrderCreateTime DESC
       LIMIT 1`,
      [eventId],
    );

    return res.json({
      success: true,
      event: {
        ...rows[0],
        canCreateOrder: activeOrders.length === 0,
        activeOrder: activeOrders[0] || null,
      },
    });
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
    LocationPlaceId,
    Price,
    EventDetails,
    Photos,
  } = req.body || {};

  if (!EventTitle || !EventCategory || !Location || !EventDetails) {
    return res.status(400).json({ success: false, error: "缺少必填字段" });
  }

  // 内容安全审核（批量检测，只调用一次API）
  try {
    const checkResult = await moderateContents(
      {
        EventTitle: EventTitle,
        EventCategory: EventCategory,
        EventDetails: EventDetails,
      },
      creatorId.toString(),
    );

    if (!checkResult.safe) {
      return res.status(400).json({
        success: false,
        error: checkResult.message,
        code: "CONTENT_MODERATION_FAILED",
      });
    }
  } catch (moderationError) {
    console.error("内容审核异常:", moderationError);
    return res.status(500).json({
      success: false,
      error: "内容安全检测暂时不可用，请稍后重试",
      code: "CONTENT_MODERATION_ERROR",
    });
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

    // 检查是否有进行中或待评价的订单，如果有则不允许编辑
    const [activeOrders] = await conn.query(
      "SELECT OrderId FROM Orders WHERE EventId = ? AND OrderStatus IN (1, 2) LIMIT 1",
      [eventId],
    );

    if (activeOrders && activeOrders.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: "订单进行中或待评价时，不允许编辑事件",
      });
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

    sets.push("LocationPlaceId = ?");
    params.push(normalizeLocationPlaceId(LocationPlaceId));

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

    await sendSystemMessage({
      roomId: `system_${creatorId}`,
      text: `您的事件“${EventTitle}”信息修改成功。`,
      senderId: creatorId,
    }).catch((err) => console.error("发送系统消息失败:", err));

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

// 事件上下架切换（仅事件创建者可操作，不限制事件类型）
router.patch("/events/:id/status", authRequired, async (req, res) => {
  const eventId = Number(req.params.id);
  const creatorId = Number(req.user?.id);

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "无效的事件ID" });
  }

  const { Status } = req.body || {};
  const newStatus = Number(Status);
  if (![0, 1].includes(newStatus)) {
    return res
      .status(400)
      .json({ success: false, error: "Status 必须为 0（上架）或 1（下架）" });
  }

  // 手动下架存为 2（与订单完成自动下架的 Status=1 区分）
  const dbStatus = newStatus === 1 ? 2 : 0;

  try {
    // 校验事件存在且属于当前用户
    const [checkRows] = await pool.query(
      "SELECT EventId, EventTitle, Status FROM Events WHERE EventId = ? AND CreatorId = ? LIMIT 1",
      [eventId, creatorId],
    );

    if (!checkRows || checkRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "事件不存在或无权操作" });
    }

    const currentStatus = Number(checkRows[0].Status);

    // 状态未变化时直接返回
    if (currentStatus === dbStatus) {
      return res.json({
        success: true,
        status: dbStatus,
        message: dbStatus === 0 ? "事件已处于上架状态" : "事件已处于下架状态",
      });
    }

    // 如果要上架，检查是否有进行中的订单（状态 0/1/2 的订单不允许上架）
    if (dbStatus === 0) {
      const [activeOrders] = await pool.query(
        "SELECT OrderId FROM Orders WHERE EventId = ? AND OrderStatus IN (0, 1, 2) LIMIT 1",
        [eventId],
      );
      if (activeOrders && activeOrders.length > 0) {
        return res.status(400).json({
          success: false,
          error: "事件存在进行中的订单，无法重新上架",
        });
      }
    }

    // 如果要下架，同样检查是否有进行中的订单（状态 0/1/2 的订单不允许下架）
    if (dbStatus === 2) {
      const [activeOrders] = await pool.query(
        "SELECT OrderId FROM Orders WHERE EventId = ? AND OrderStatus IN (0, 1, 2) LIMIT 1",
        [eventId],
      );
      if (activeOrders && activeOrders.length > 0) {
        return res.status(400).json({
          success: false,
          error: "事件存在进行中的订单，无法下架",
        });
      }
    }

    await pool.query("UPDATE Events SET Status = ? WHERE EventId = ?", [
      dbStatus,
      eventId,
    ]);

    const statusText = dbStatus === 0 ? "上架" : "下架";
    await sendSystemMessage({
      roomId: `system_${creatorId}`,
      text: `您的事件"${checkRows[0].EventTitle}"已${statusText}。`,
      senderId: creatorId,
    }).catch((err) => console.error("发送系统消息失败:", err));

    return res.json({
      success: true,
      status: dbStatus,
      message: `事件已${statusText}`,
    });
  } catch (err) {
    console.error("切换事件状态失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
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

    const [checkRows] = await conn.query(
      "SELECT EventId, EventTitle FROM Events WHERE EventId = ? AND CreatorId = ? LIMIT 1",
      [eventId, creatorId],
    );

    if (!checkRows || checkRows.length === 0) {
      await conn.rollback();
      return res
        .status(404)
        .json({ success: false, error: "事件不存在或无权删除" });
    }

    // 检查是否存在未取消的订单（待确认、进行中、待评价、已完成）
    const [activeOrders] = await conn.query(
      "SELECT OrderId FROM Orders WHERE EventId = ? AND OrderStatus IN (0, 1, 2, 3) LIMIT 1",
      [eventId],
    );

    if (activeOrders && activeOrders.length > 0) {
      await conn.rollback();
      return res
        .status(400)
        .json({ success: false, error: "存在未取消订单，无法删除事件" });
    }

    // 提取出标题
    const deletedTitle = checkRows[0].EventTitle;

    // 删除关联的订单
    await conn.query("DELETE FROM Orders WHERE EventId = ?", [eventId]);

    // 删除事件本身
    const [delResult] = await conn.query(
      "DELETE FROM Events WHERE EventId = ?",
      [eventId],
    );

    await conn.commit();

    //使用查到的 deletedTitle
    await sendSystemMessage({
      roomId: `system_${creatorId}`,
      text: `您的事件“${deletedTitle}”已成功删除。`,
      senderId: creatorId,
    }).catch((err) => console.error("发送系统消息失败:", err));

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

// 管理端：获取事件列表
router.get("/admin/events", adminRequired, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        e.EventId,
        e.CreatorId,
        e.EventTitle,
        e.EventType,
        e.EventCategory,
        e.Photos,
        e.Location,
        e.Price,
        e.EventDetails,
        e.Status,
        e.CreateTime,
        u.UserName AS CreatorName,
        (SELECT COUNT(*) FROM Orders o WHERE o.EventId = e.EventId) AS OrderCount
       FROM Events e
       JOIN Users u ON e.CreatorId = u.UserId
       ORDER BY e.CreateTime DESC`,
    );

    return res.json({ success: true, events: rows });
  } catch (err) {
    console.error("获取管理端事件失败:", err);
    return res.status(500).json({ success: false, error: "获取事件列表失败" });
  }
});

// 管理端：删除事件（需登录，且检查未完结订单）
router.delete("/admin/events/:id", adminRequired, async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "无效的事件ID" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 检查是否存在未取消的订单（待确认、进行中、待评价、已完成）
    const [activeOrders] = await conn.query(
      "SELECT OrderId FROM Orders WHERE EventId = ? AND OrderStatus IN (0, 1, 2, 3) LIMIT 1",
      [eventId],
    );

    if (activeOrders && activeOrders.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: "存在未取消订单，无法删除事件",
      });
    }

    await conn.query("DELETE FROM Orders WHERE EventId = ?", [eventId]);
    const [result] = await conn.query("DELETE FROM Events WHERE EventId = ?", [
      eventId,
    ]);
    await conn.commit();
    return res.json({ success: true, deleted: result.affectedRows });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("删除事件失败:", err);
    return res.status(500).json({ success: false, error: "删除事件失败" });
  } finally {
    if (conn) conn.release();
  }
});

// 管理端：状态统计
router.get("/admin/events/summary", adminRequired, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN EventType = 0 THEN 1 ELSE 0 END) AS requestCount,
        SUM(CASE WHEN EventType = 1 THEN 1 ELSE 0 END) AS helpCount
       FROM Events`,
    );
    return res.json({ success: true, summary: rows[0] || {} });
  } catch (err) {
    console.error("获取事件统计失败:", err);
    return res.status(500).json({ success: false, error: "获取统计失败" });
  }
});
router.get("/api/provider-profile", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ msg: "缺少 userId" });

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
    [userId],
  );
  if (!rows.length) return res.status(404).json({ msg: "用户不存在" });

  const row = rows[0];
  row.avatar = row.avatar ? row.avatar : "/assets/icon/user.svg";
  res.json({ success: true, data: row });
});

module.exports = router;
