const express = require("express");
const router = express.Router();
const pool = require("../help_me_db.js");
const Room = require("../models/Room.js");

const { getChatHistory, getRoomList } = require("../chatHandler.js");

// 读取聊天信息
router.get("/api/messages/history", async (req, res) => {
  const result = await getChatHistory(req.query);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

// 读取房间列表（支持用户 ID 筛选）
router.get("/api/rooms/list", async (req, res) => {
  const result = await getRoomList(req.query);
  const { userId } = req.query; // 获取 URL 中的参数

  if (result.success) {
    // 如果传入了 userId，则在返回前进行过滤
    if (userId) {
      const targetId = parseInt(userId);
      result.data.rooms = result.data.rooms.filter(
        (room) =>
          room.userA.id === targetId ||
          room.userB.id === targetId ||
          room.roomId === `system_${targetId}`,
      );
      // 同步更新分页总数（如果需要的话）
      result.data.pagination.total = result.data.rooms.length;
    }

    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

// 获取订单房间的订单和事件信息
router.get("/api/rooms/:roomId/order-info", async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room || !room.orderId) {
      return res.json({ success: false, error: "非订单房间" });
    }

    const [orders] = await pool.query(
      `SELECT o.OrderId, o.EventId, o.TransactionPrice, o.OrderStatus, o.OrderCreateTime,
              o.EventSnapshot,
              e.EventTitle, e.EventType, e.EventCategory, e.Location, e.Price AS EventPrice,
              e.EventDetails, e.Photos,
              buyer.UserName AS ConsumerName,
              provider.UserName AS ProviderName
       FROM Orders o
       JOIN Events e ON o.EventId = e.EventId
       JOIN Users buyer ON o.ConsumerId = buyer.UserId
       JOIN Users provider ON o.ProviderId = provider.UserId
       WHERE o.OrderId = ?
       LIMIT 1`,
      [room.orderId],
    );

    if (!orders.length) {
      return res.json({ success: false, error: "订单不存在" });
    }

    return res.json({
      success: true,
      data: {
        order: orders[0],
        eventId: room.eventId,
      },
    });
  } catch (err) {
    console.error("获取订单信息失败:", err);
    return res.status(500).json({ success: false, error: "服务器错误" });
  }
});

module.exports = router;
