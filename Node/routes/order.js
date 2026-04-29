const express = require("express");
const pool = require("../help_me_db.js");
const { authRequired } = require("./auth.js");
const { sendSystemMessage } = require("../chatHandler.js");

const router = express.Router();

async function fetchOrderWithNames(conn, orderId) {
  const [rows] = await conn.query(
    `SELECT
      o.*,
      e.EventTitle,
      e.EventDetails,
      buyer.UserName AS ConsumerName,
      provider.UserName AS ProviderName
     FROM Orders o
     JOIN Events e ON o.EventId = e.EventId
     JOIN Users buyer ON o.ConsumerId = buyer.UserId
     JOIN Users provider ON o.ProviderId = provider.UserId
     WHERE o.OrderId = ?
     LIMIT 1`,
    [orderId],
  );
  return rows?.[0] || null;
}

// 创建订单
router.post("/orders", authRequired, async (req, res) => {
  const consumerId = Number(req.user?.id);
  const { EventId, DetailLocation, AdditionalInfo } = req.body || {};
  const eventId = Number(EventId);

  if (!Number.isInteger(consumerId) || consumerId <= 0) {
    return res.status(401).json({ success: false, error: "未登录" });
  }
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "事件ID无效" });
  }
  if (!DetailLocation || !String(DetailLocation).trim()) {
    return res.status(400).json({ success: false, error: "请填写下单信息" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [eventRows] = await conn.query(
      `SELECT e.EventId, e.CreatorId, e.EventTitle, e.Price, e.EventDetails, u.UserName AS ProviderName
       FROM Events e
       JOIN Users u ON e.CreatorId = u.UserId
       WHERE e.EventId = ?
       LIMIT 1`,
      [eventId],
    );

    if (!eventRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "事件不存在" });
    }

    const event = eventRows[0];

    // 检查发布者是否尝试下单自己的事件
    if (event.CreatorId === consumerId) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: "无法下单自己发布的事件",
      });
    }

    const [existingRows] = await conn.query(
      "SELECT OrderId FROM Orders WHERE EventId = ? AND OrderStatus <> 3 LIMIT 1",
      [eventId],
    );
    if (existingRows.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        error: "该事件当前存在未完结订单，暂不可下单",
      });
    }

    // 确保消费者在 Consumers 表中存在
    const [consumerExists] = await conn.query(
      "SELECT ConsumerId FROM Consumers WHERE ConsumerId = ? LIMIT 1",
      [consumerId],
    );
    if (consumerExists.length === 0) {
      // 自动创建消费者记录
      await conn.query(
        "INSERT INTO Consumers (ConsumerId, BuyerRanking) VALUES (?, 0.0)",
        [consumerId],
      );
    }

    const verificationCode = `ORD${Date.now().toString().slice(-8)}`;
    const orderLocation = AdditionalInfo
      ? `${String(DetailLocation).trim()}｜${String(AdditionalInfo).trim()}`
      : String(DetailLocation).trim();

    const [result] = await conn.query(
      `INSERT INTO Orders
       (EventId, ProviderId, ConsumerId, OrderStatus, TransactionPrice, DetailLocation, VerificationCode, VerificationResult)
       VALUES (?, ?, ?, 0, ?, ?, ?, 0)`,
      [
        eventId,
        event.CreatorId,
        consumerId,
        event.Price || 0,
        orderLocation,
        verificationCode,
      ],
    );

    await conn.commit();

    await sendSystemMessage({
      roomId: `system_${event.CreatorId}`,
      text: `您有一个新的订单：”${event.EventTitle}”，请尽快确认。`,
      senderId: consumerId,
    });

    await sendSystemMessage({
      roomId: `system_${consumerId}`,
      text: `订单”${event.EventTitle}”已创建成功，等待卖家确认。`,
      senderId: consumerId,
    });

    return res.json({
      success: true,
      orderId: result.insertId,
      verificationCode,
    });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("创建订单失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  } finally {
    if (conn) conn.release();
  }
});

// 订单列表
router.get("/orders", authRequired, async (req, res) => {
  const userId = Number(req.user?.id);
  const role = String(req.query.role || "all");

  try {
    const where = [];
    const params = [];
    if (role === "buyer") {
      where.push("o.ConsumerId = ?");
      params.push(userId);
    } else if (role === "seller") {
      where.push("o.ProviderId = ?");
      params.push(userId);
    } else {
      where.push("(o.ConsumerId = ? OR o.ProviderId = ?)");
      params.push(userId, userId);
    }

    const [rows] = await pool.query(
      `SELECT
        o.OrderId, o.EventId, o.ProviderId, o.ConsumerId, o.OrderStatus,
        o.TransactionPrice, o.DetailLocation, o.OrderCreateTime, o.PaymentTime,
        o.VerificationCode, o.VerificationResult, o.ServiceTime, o.CompletionTime,
        o.RefundTime, e.EventTitle,
        buyer.UserName AS ConsumerName,
        provider.UserName AS ProviderName,
        (SELECT COUNT(*) FROM Comments c WHERE c.OrderId = o.OrderId) AS ReviewCount,
        (SELECT COUNT(*) FROM Comments c WHERE c.OrderId = o.OrderId AND c.AuthorId = ?) AS HasReviewed
       FROM Orders o
       JOIN Events e ON o.EventId = e.EventId
       JOIN Users buyer ON o.ConsumerId = buyer.UserId
       JOIN Users provider ON o.ProviderId = provider.UserId
       WHERE ${where.join(" AND ")}
       ORDER BY o.OrderCreateTime DESC`,
      [...params, userId],
    );

    return res.json({ success: true, orders: rows });
  } catch (err) {
    console.error("查询订单列表失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 订单详情
router.get("/orders/:id", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, error: "订单ID无效" });
  }

  try {
    const order = await fetchOrderWithNames(pool, orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "订单不存在" });
    }

    const userId = Number(req.user?.id);
    if (order.ConsumerId !== userId && order.ProviderId !== userId) {
      return res.status(403).json({ success: false, error: "无权查看该订单" });
    }

    return res.json({ success: true, order });
  } catch (err) {
    console.error("查询订单详情失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 卖家确认订单
router.put("/orders/:id/confirm", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  const userId = Number(req.user?.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, error: "订单ID无效" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const order = await fetchOrderWithNames(conn, orderId);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "订单不存在" });
    }
    if (order.ProviderId !== userId) {
      await conn.rollback();
      return res
        .status(403)
        .json({ success: false, error: "仅卖家可确认订单" });
    }
    if (Number(order.OrderStatus) !== 0) {
      await conn.rollback();
      return res
        .status(400)
        .json({ success: false, error: "当前订单状态无法确认" });
    }

    await conn.query(
      "UPDATE Orders SET OrderStatus = 1, PaymentTime = COALESCE(PaymentTime, NOW()) WHERE OrderId = ?",
      [orderId],
    );
    await conn.commit();

    await sendSystemMessage({
      roomId: `system_${order.ConsumerId}`,
      text: `您的订单”${order.EventTitle}”已被卖家确认。`,
      senderId: userId,
    });

    return res.json({ success: true });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("确认订单失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  } finally {
    if (conn) conn.release();
  }
});

// 买家确认完成
router.put("/orders/:id/complete", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  const userId = Number(req.user?.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, error: "订单ID无效" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const order = await fetchOrderWithNames(conn, orderId);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "订单不存在" });
    }
    if (order.ConsumerId !== userId) {
      await conn.rollback();
      return res
        .status(403)
        .json({ success: false, error: "仅买家可确认完成" });
    }
    if (Number(order.OrderStatus) !== 1) {
      await conn.rollback();
      return res
        .status(400)
        .json({ success: false, error: "当前订单状态无法完成" });
    }

    await conn.query(
      "UPDATE Orders SET OrderStatus = 2, CompletionTime = NOW() WHERE OrderId = ?",
      [orderId],
    );

    // 增加卖家的服务单数
    await conn.query(
      "UPDATE Providers SET OrderCount = OrderCount + 1 WHERE ProviderId = ?",
      [order.ProviderId],
    );

    await conn.commit();

    await sendSystemMessage({
      roomId: `system_${order.ProviderId}`,
      text: `订单”${order.EventTitle}”已完成，请及时评价。`,
      senderId: userId,
    });

    return res.json({ success: true });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("确认完成失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  } finally {
    if (conn) conn.release();
  }
});

// 取消订单（仅待确认状态，买家或卖家均可取消）
router.put("/orders/:id/cancel", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);
  const userId = Number(req.user?.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, error: "订单ID无效" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const order = await fetchOrderWithNames(conn, orderId);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "订单不存在" });
    }

    // 仅买家或卖家可操作
    if (order.ConsumerId !== userId && order.ProviderId !== userId) {
      await conn.rollback();
      return res.status(403).json({ success: false, error: "无权操作该订单" });
    }

    // 仅待确认状态（OrderStatus=0）可取消
    if (Number(order.OrderStatus) !== 0) {
      await conn.rollback();
      return res
        .status(400)
        .json({ success: false, error: "当前订单状态无法取消" });
    }

    // 将订单状态设为已取消（3）
    await conn.query(
      "UPDATE Orders SET OrderStatus = 3, RefundTime = NOW() WHERE OrderId = ?",
      [orderId],
    );

    await conn.commit();

    // 通知对方
    const otherUserId =
      userId === order.ConsumerId ? order.ProviderId : order.ConsumerId;
    const operatorRole = userId === order.ConsumerId ? "买家" : "卖家";

    await sendSystemMessage({
      roomId: `system_${otherUserId}`,
      text: `订单"${order.EventTitle}"已被${operatorRole}取消。`,
      senderId: userId,
    });

    return res.json({ success: true });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("取消订单失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  } finally {
    if (conn) conn.release();
  }
});

// 管理端订单列表
router.get("/admin/orders", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        o.OrderId, o.EventId, o.ProviderId, o.ConsumerId, o.OrderStatus,
        o.TransactionPrice, o.DetailLocation, o.OrderCreateTime,
        e.EventTitle,
        buyer.UserName AS ConsumerName,
        provider.UserName AS ProviderName
       FROM Orders o
       JOIN Events e ON o.EventId = e.EventId
       JOIN Users buyer ON o.ConsumerId = buyer.UserId
       JOIN Users provider ON o.ProviderId = provider.UserId
       ORDER BY o.OrderCreateTime DESC`,
    );

    return res.json({ success: true, orders: rows });
  } catch (err) {
    console.error("获取管理端订单失败:", err);
    return res.status(500).json({ success: false, error: "获取订单列表失败" });
  }
});

// 管理端删除订单
router.delete("/admin/orders/:id", async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, error: "订单ID无效" });
  }

  try {
    const [result] = await pool.query("DELETE FROM Orders WHERE OrderId = ?", [
      orderId,
    ]);
    return res.json({ success: true, deleted: result.affectedRows });
  } catch (err) {
    console.error("删除订单失败:", err);
    return res.status(500).json({ success: false, error: "删除订单失败" });
  }
});

// 状态工具给前端/管理端复用
router.get("/orders-status-meta", (_req, res) => {
  return res.json({
    success: true,
    statuses: [
      { value: 0, label: "待确认" },
      { value: 1, label: "进行中" },
      { value: 2, label: "待评价" },
      { value: 3, label: "已取消" },
    ],
  });
});

module.exports = router;
