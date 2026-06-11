const express = require("express");
const router = express.Router();
const pool = require("../help_me_db.js");
const Room = require("../models/Room.js");
const { authRequired } = require("./auth.js");
const { translateFields, translateBatch } = require("./translateHelper.js");

const { getChatHistory, getRoomList } = require("../chatHandler.js");

// 读取聊天信息（需登录，只能查看自己相关的聊天）
router.get("/api/messages/history", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return res.status(401).json({ success: false, message: "未登录" });
    }

    // 使用 token 中的 userId，忽略客户端传入的 userId
    const query = { ...req.query, userId: userId.toString() };
    const userRole = req.user?.role;
    const result = await getChatHistory(query, userId, userRole);
    if (result.success) {
      if (res.locals.targetLang && result.data?.messages) {
        await translateFields(
          result.data.messages,
          ["text", "userName"],
          res.locals.targetLang,
        );
      }
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error("获取聊天历史失败:", err);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
});

// 读取房间列表（需登录，只能查看自己的房间）
router.get("/api/rooms/list", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return res.status(401).json({ success: false, message: "未登录" });
    }

    // 使用 token 中的 userId，忽略客户端传入的 userId
    const query = {
      ...req.query,
      userId: userId.toString(),
      currentUserId: userId,
      userRole: req.user?.role,
    };
    const result = await getRoomList(query);
    if (result.success) {
      if (res.locals.targetLang && result.data?.rooms) {
        // 收集所有需要翻译的文本
        const translatableItems = [];
        for (const room of result.data.rooms) {
          if (room.lastMsg)
            translatableItems.push({ obj: room, field: "lastMsg" });
          if (room.userA?.name)
            translatableItems.push({ obj: room.userA, field: "name" });
          if (room.userB?.name)
            translatableItems.push({ obj: room.userB, field: "name" });
          if (room.event?.name)
            translatableItems.push({ obj: room.event, field: "name" });
        }
        // 收集所有文本批量翻译
        const allTexts = translatableItems
          .map((t) => t.obj[t.field])
          .filter(Boolean);
        const translations = await translateBatch(
          allTexts,
          res.locals.targetLang,
        );
        // 应用翻译结果
        for (const { obj, field } of translatableItems) {
          if (
            obj[field] &&
            translations[obj[field]] &&
            translations[obj[field]] !== obj[field]
          ) {
            obj[field] = translations[obj[field]];
          }
        }
      }
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error("获取房间列表失败:", err);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
});

// 获取订单房间的订单和事件信息
router.get("/api/rooms/:roomId/order-info", authRequired, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = Number(req.user?.id);

    if (!userId) {
      return res.status(401).json({ success: false, error: "未登录" });
    }

    const room = await Room.findById(roomId);
    if (!room || !room.orderId) {
      return res.json({ success: false, error: "非订单房间" });
    }

    // 验证请求用户是否为房间成员
    if (room.creatorId !== userId && room.partnerId !== userId) {
      return res.status(403).json({ success: false, error: "无权访问此房间" });
    }

    const [orders] = await pool.query(
      `SELECT o.OrderId, o.EventId, o.TransactionPrice, o.OrderStatus, o.OrderCreateTime,
              o.PaymentTime, o.CompletionTime, o.RefundTime,
              o.EventSnapshot, o.ConsumerId, o.ProviderId,
              o.EventSnapshot->>'$.DeliveryAddress' AS DeliveryAddress,
              o.EventSnapshot->>'$.DeliverySpecific' AS DeliverySpecific,
              o.EventSnapshot->>'$.DeliveryAdditionalInfo' AS DeliveryAdditionalInfo,
              e.EventTitle, e.EventType, e.EventCategory, e.Location, e.Price AS EventPrice,
              e.EventDetails, e.Photos,
              buyer.UserName AS ConsumerName,
              provider.UserName AS ProviderName,
              (SELECT COUNT(*) FROM Comments c WHERE c.OrderId = o.OrderId) AS ReviewCount,
              (SELECT COUNT(*) FROM Comments c WHERE c.OrderId = o.OrderId AND c.AuthorId = ?) AS HasReviewed,
              (SELECT COUNT(*) FROM Comments c WHERE c.OrderId = o.OrderId AND c.AuthorId != ?) AS OtherHasReviewed
       FROM Orders o
       JOIN Events e ON o.EventId = e.EventId
       JOIN Users buyer ON o.ConsumerId = buyer.UserId
       JOIN Users provider ON o.ProviderId = provider.UserId
       WHERE o.OrderId = ?
       LIMIT 1`,
      [userId, userId, room.orderId],
    );

    if (!orders.length) {
      return res.json({ success: false, error: "订单不存在" });
    }

    const order = orders[0];
    if (res.locals.targetLang) {
      await translateFields(
        order,
        [
          "EventTitle",
          "EventDetails",
          "Location",
          "EventLocation",
          "ConsumerName",
          "ProviderName",
          "CancelledByName",
          "DeliveryAddress",
          "DeliverySpecific",
          "DeliveryAdditionalInfo",
        ],
        res.locals.targetLang,
      );
    }
    return res.json({
      success: true,
      data: { order, eventId: room.eventId },
    });
  } catch (err) {
    console.error("获取订单信息失败:", err);
    return res.status(500).json({ success: false, error: "服务器错误" });
  }
});

module.exports = router;
