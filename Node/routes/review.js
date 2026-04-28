const express = require("express");
const pool = require("../help_me_db.js");
const { authRequired } = require("./auth.js");
const Message = require("../models/Message");

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

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      "SELECT OrderId, ConsumerId, ProviderId, OrderStatus FROM Orders WHERE OrderId = ? LIMIT 1",
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

    const scoreRows = await conn.query(
      `SELECT
        ROUND(AVG(Score), 1) AS avgScore,
        COUNT(*) AS totalCount
       FROM Comments
       WHERE TargetUserId = ?`,
      [targetUserId],
    );
    const avgScore = Number(scoreRows?.[0]?.[0]?.avgScore || 0);
    const totalCount = Number(scoreRows?.[0]?.[0]?.totalCount || 0);

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

    // 检查双方是否都已评价
    const [reviewCountRows] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM Comments WHERE OrderId = ?",
      [orderId],
    );
    const reviewCount = Number(reviewCountRows?.[0]?.cnt || 0);
    if (reviewCount >= 2) {
      // 双方都已评价，将订单标记为已完成
      await conn.query(
        "UPDATE Orders SET OrderStatus = 3, CompletionTime = COALESCE(CompletionTime, NOW()) WHERE OrderId = ?",
        [orderId],
      );
    }
    // 否则保持 OrderStatus = 2（待评价），等待另一方评价

    await conn.commit();

    await Message.create({
      roomId: `system_${targetUserId}`,
      text: `您收到了一条新的评价，评分 ${score} 分。`,
      senderId: authorId,
      userName: "系统通知",
      sendTime: new Date(),
    }).catch((err) => console.error("写入评价通知失败:", err));

    return res.json({
      success: true,
      reviewId: result.insertId,
      avgScore,
      totalCount,
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
router.get("/admin/reviews", async (_req, res) => {
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

module.exports = router;
