const express = require("express");
const pool = require("../help_me_db.js");
const { authRequired } = require("./auth.js");
const { sendOrderSystemMessage } = require("../chatHandler.js");
const { getIO } = require("../socketInstance.js");
const { moderateContent } = require("../services/contentModeration.js");

const router = express.Router();

// 提交评价
router.post("/reviews", authRequired, async (req, res) => {
  const authorId = Number(req.user?.id);
  const { OrderId, TargetUserId, Score, Text } = req.body || {};
  const orderId = Number(OrderId);
  const targetUserId = Number(TargetUserId);
  const score = Number(Score);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, error: "订单ID无效" });
  }
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ success: false, error: "被评价用户无效" });
  }
  if (Number.isNaN(score) || score < 1 || score > 5) {
    return res
      .status(400)
      .json({ success: false, error: "评分必须在1到5之间" });
  }

  // 内容安全审核
  try {
    if (Text && String(Text).trim()) {
      const textCheck = await moderateContent(String(Text).trim(), 'ReviewText', authorId.toString());
      if (!textCheck.safe) {
        return res.status(400).json({
          success: false,
          error: textCheck.message,
          code: 'CONTENT_MODERATION_FAILED'
        });
      }
    }
  } catch (moderationError) {
    console.error('内容审核异常:', moderationError);
    // 审核异常时也阻止评价，避免违规内容漏检
    return res.status(500).json({
      success: false,
      error: '内容安全检测暂时不可用，请稍后重试',
      code: 'CONTENT_MODERATION_ERROR'
    });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      "SELECT OrderId, EventId, ConsumerId, ProviderId, OrderStatus FROM Orders WHERE OrderId = ? LIMIT 1",
      [orderId],
    );
    if (!orderRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "订单不存在" });
    }

    const order = orderRows[0];
    const canReview =
      (order.ConsumerId === authorId && order.ProviderId === targetUserId) ||
      (order.ProviderId === authorId && order.ConsumerId === targetUserId);
    if (!canReview) {
      await conn.rollback();
      return res.status(403).json({ success: false, error: "无权评价该订单" });
    }
    if (Number(order.OrderStatus) !== 2) {
      await conn.rollback();
      return res
        .status(400)
        .json({ success: false, error: "订单完成后才能评价" });
    }

    const [dupRows] = await conn.query(
      "SELECT ReviewId FROM Comments WHERE OrderId = ? AND AuthorId = ? LIMIT 1",
      [orderId, authorId],
    );
    if (dupRows.length > 0) {
      await conn.rollback();
      return res
        .status(409)
        .json({ success: false, error: "你已经评价过该订单" });
    }

    const [result] = await conn.query(
      "INSERT INTO Comments (OrderId, AuthorId, TargetUserId, Score, Text) VALUES (?, ?, ?, ?, ?)",
      [
        orderId,
        authorId,
        targetUserId,
        score,
        Text ? String(Text).trim() : null,
      ],
    );

    // 根据谁在评价来更新对应的评分
    // 如果是买家评价卖家，更新卖家的 ServiceRanking
    // 如果是卖家评价买家，更新买家的 BuyerRanking
    if (order.ConsumerId === authorId) {
      // 买家在评价卖家
      const [providerCheck] = await conn.query(
        "SELECT ProviderId FROM Providers WHERE ProviderId = ? LIMIT 1",
        [targetUserId],
      );
      if (providerCheck.length > 0) {
        // 只查询来自买家的评价
        const [providerScoreRows] = await conn.query(
          `SELECT ROUND(AVG(c.Score), 1) AS avgScore
           FROM Comments c
           JOIN Orders o ON c.OrderId = o.OrderId
           WHERE c.TargetUserId = ? AND o.ProviderId = ? AND o.ConsumerId = c.AuthorId`,
          [targetUserId, targetUserId],
        );
        const providerAvgScore = Number(providerScoreRows?.[0]?.avgScore || 0);
        await conn.query(
          "UPDATE Providers SET ServiceRanking = ? WHERE ProviderId = ?",
          [providerAvgScore, targetUserId],
        );
      }
    } else {
      // 卖家在评价买家
      const [consumerCheck] = await conn.query(
        "SELECT ConsumerId FROM Consumers WHERE ConsumerId = ? LIMIT 1",
        [targetUserId],
      );
      if (consumerCheck.length > 0) {
        // 只查询来自卖家的评价
        const [consumerScoreRows] = await conn.query(
          `SELECT ROUND(AVG(c.Score), 1) AS avgScore
           FROM Comments c
           JOIN Orders o ON c.OrderId = o.OrderId
           WHERE c.TargetUserId = ? AND o.ConsumerId = ? AND o.ProviderId = c.AuthorId`,
          [targetUserId, targetUserId],
        );
        const consumerAvgScore = Number(consumerScoreRows?.[0]?.avgScore || 0);
        await conn.query(
          "UPDATE Consumers SET BuyerRanking = ? WHERE ConsumerId = ?",
          [consumerAvgScore, targetUserId],
        );
      }
    }

    // 检查对方是否也已评价
    const otherUserId =
      order.ConsumerId === authorId ? order.ProviderId : order.ConsumerId;
    const [otherReviewRows] = await conn.query(
      "SELECT ReviewId FROM Comments WHERE OrderId = ? AND AuthorId = ? LIMIT 1",
      [orderId, otherUserId],
    );
    if (otherReviewRows.length > 0) {
      // 双方都已评价，将订单标记为已完成
      await conn.query(
        "UPDATE Orders SET OrderStatus = 3, CompletionTime = COALESCE(CompletionTime, NOW()) WHERE OrderId = ?",
        [orderId],
      );

      // 通过Socket.IO实时推送订单状态变更给买卖双方
      const io = getIO();
      if (io) {
        io.to(String(order.ConsumerId)).emit("orderStatusUpdate", {
          orderId,
          newStatus: 3,
          eventId: order.EventId,
        });
        io.to(String(order.ProviderId)).emit("orderStatusUpdate", {
          orderId,
          newStatus: 3,
          eventId: order.EventId,
        });
      }
    }

    await conn.commit();

    // 发送系统消息到订单聊天房间（各自只看到自己的那条）
    if (order.EventId) {
      const reviewRoomId = `${order.EventId}_${order.ConsumerId}_${order.ProviderId}`;
      // 给评价者本人的确认
      await sendOrderSystemMessage({
        roomId: reviewRoomId,
        text: `您已提交评价，评分 ${score} 分。`,
        senderId: authorId,
        targetUserId: authorId,
      }).catch((err) => console.error("发送系统消息失败:", err));
      // 给对方的提醒（根据对方是否已评价显示不同文案）
      const otherText =
        otherReviewRows.length > 0
          ? `对方已提交评价，订单已完结。`
          : `对方已提交评价，请尽快评价。`;
      await sendOrderSystemMessage({
        roomId: reviewRoomId,
        text: otherText,
        senderId: authorId,
        targetUserId: otherUserId,
      }).catch((err) => console.error("发送系统消息失败:", err));
    }

    return res.json({
      success: true,
      reviewId: result.insertId,
    });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("提交评价失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  } finally {
    if (conn) conn.release();
  }
});

// 订单评价列表
router.get("/reviews", async (req, res) => {
  const orderId = Number(req.query.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, error: "订单ID无效" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
        c.ReviewId AS id,
        c.OrderId AS orderId,
        c.AuthorId AS authorId,
        au.UserName AS authorName,
        au.UserAvatar AS authorAvatar,
        c.TargetUserId AS targetUserId,
        c.Score AS rating,
        c.Text AS content,
        c.Time AS createTime
       FROM Comments c
       JOIN Users au ON c.AuthorId = au.UserId
       WHERE c.OrderId = ?
       ORDER BY c.Time DESC`,
      [orderId],
    );

    return res.json({ success: true, reviews: rows });
  } catch (err) {
    console.error("查询评价失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// 管理端评论列表
router.get("/admin/reviews", authRequired, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        c.ReviewId,
        c.OrderId,
        c.AuthorId,
        c.TargetUserId,
        c.Score,
        c.Text,
        c.Time,
        ao.EventId,
        e.EventTitle,
        au.UserName AS AuthorName,
        tu.UserName AS TargetName
       FROM Comments c
       JOIN Orders ao ON c.OrderId = ao.OrderId
       JOIN Events e ON ao.EventId = e.EventId
       JOIN Users au ON c.AuthorId = au.UserId
       JOIN Users tu ON c.TargetUserId = tu.UserId
       ORDER BY c.Time DESC`,
    );

    return res.json({ success: true, reviews: rows });
  } catch (err) {
    console.error("获取管理端评价失败:", err);
    return res.status(500).json({ success: false, error: "获取评价列表失败" });
  }
});

// 管理端删除评价
router.delete("/admin/reviews/:id", authRequired, async (req, res) => {
  const reviewId = Number(req.params.id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ success: false, error: "评价ID无效" });
  }

  try {
    // 检查评价是否存在
    const [existing] = await pool.query(
      "SELECT ReviewId, OrderId, AuthorId, TargetUserId FROM Comments WHERE ReviewId = ? LIMIT 1",
      [reviewId],
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, error: "评价不存在" });
    }

    const review = existing[0];

    // 删除评价
    await pool.query("DELETE FROM Comments WHERE ReviewId = ?", [reviewId]);

    // 更新用户评分（重新计算平均分）
    const { OrderId, AuthorId, TargetUserId } = review;

    // 查询订单获取买家和卖家ID
    const [orderRows] = await pool.query(
      "SELECT ConsumerId, ProviderId FROM Orders WHERE OrderId = ? LIMIT 1",
      [OrderId],
    );

    if (orderRows.length) {
      const order = orderRows[0];

      // 判断被评价者是买家还是卖家
      if (order.ProviderId === TargetUserId) {
        // 被评价者是卖家，重新计算服务评分
        const [avgRows] = await pool.query(
          `SELECT ROUND(AVG(c.Score), 1) AS avgScore
           FROM Comments c
           JOIN Orders o ON c.OrderId = o.OrderId
           WHERE c.TargetUserId = ? AND o.ProviderId = ? AND o.ConsumerId = c.AuthorId`,
          [TargetUserId, TargetUserId],
        );
        const avgScore = Number(avgRows?.[0]?.avgScore || 0);
        await pool.query(
          "UPDATE Providers SET ServiceRanking = ? WHERE ProviderId = ?",
          [avgScore, TargetUserId],
        );
      } else if (order.ConsumerId === TargetUserId) {
        // 被评价者是买家，重新计算买家评分
        const [avgRows] = await pool.query(
          `SELECT ROUND(AVG(c.Score), 1) AS avgScore
           FROM Comments c
           JOIN Orders o ON c.OrderId = o.OrderId
           WHERE c.TargetUserId = ? AND o.ConsumerId = ? AND o.ProviderId = c.AuthorId`,
          [TargetUserId, TargetUserId],
        );
        const avgScore = Number(avgRows?.[0]?.avgScore || 0);
        await pool.query(
          "UPDATE Consumers SET BuyerRanking = ? WHERE ConsumerId = ?",
          [avgScore, TargetUserId],
        );
      }
    }

    return res.json({ success: true, deleted: 1 });
  } catch (err) {
    console.error("删除评价失败:", err);
    return res.status(500).json({ success: false, error: "删除评价失败" });
  }
});

module.exports = router;
