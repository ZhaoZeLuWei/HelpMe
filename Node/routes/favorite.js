const express = require("express");
const pool = require("../help_me_db.js");
const { authRequired } = require("./auth.js");

const router = express.Router();

// ============================================================
//  收藏 (Favorites)
// ============================================================

// POST /favorites — 切换收藏（toggle）
router.post("/favorites", authRequired, async (req, res) => {
  const userId = Number(req.user?.id);
  const eventId = Number(req.body?.EventId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ success: false, error: "请先登录" });
  }
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "事件ID无效" });
  }

  try {
    // 验证事件存在
    const [eventRows] = await pool.query(
      "SELECT EventId FROM Events WHERE EventId = ? LIMIT 1",
      [eventId]
    );
    if (!eventRows.length) {
      return res.status(404).json({ success: false, error: "事件不存在" });
    }

    // 检查是否已收藏
    const [existing] = await pool.query(
      "SELECT FavoriteId FROM Favorites WHERE UserId = ? AND EventId = ? LIMIT 1",
      [userId, eventId]
    );

    if (existing.length > 0) {
      // 已收藏 → 取消
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("DELETE FROM Favorites WHERE FavoriteId = ?", [
          existing[0].FavoriteId,
        ]);
        await conn.query(
          "UPDATE Events SET FavoriteCount = GREATEST(0, FavoriteCount - 1) WHERE EventId = ?",
          [eventId]
        );
        await conn.commit();
      } finally {
        conn.release();
      }
      return res.json({ success: true, favorited: false });
    } else {
      // 未收藏 → 添加
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(
          "INSERT INTO Favorites (UserId, EventId) VALUES (?, ?)",
          [userId, eventId]
        );
        await conn.query(
          "UPDATE Events SET FavoriteCount = FavoriteCount + 1 WHERE EventId = ?",
          [eventId]
        );
        await conn.commit();
      } finally {
        conn.release();
      }
      return res.json({ success: true, favorited: true });
    }
  } catch (err) {
    console.error("收藏操作失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// GET /favorites/check?eventId= — 查询是否已收藏
router.get("/favorites/check", authRequired, async (req, res) => {
  const userId = Number(req.user?.id);
  const eventId = Number(req.query.eventId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.json({ success: true, favorited: false });
  }
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "参数无效" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT 1 FROM Favorites WHERE UserId = ? AND EventId = ? LIMIT 1",
      [userId, eventId]
    );
    return res.json({ success: true, favorited: rows.length > 0 });
  } catch (err) {
    console.error("查询收藏状态失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// GET /favorites — 获取当前用户的收藏列表
router.get("/favorites", authRequired, async (req, res) => {
  const userId = Number(req.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ success: false, error: "请先登录" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT f.FavoriteId, f.CreateTime AS FavoritedAt,
              e.EventId, e.EventTitle, e.EventCategory, e.EventType,
              e.Photos, e.Location, e.Price, e.EventDetails, e.CreateTime,
              u.UserName, u.UserAvatar, e.CreatorId
       FROM Favorites f
       JOIN Events e ON f.EventId = e.EventId
       JOIN Users u ON e.CreatorId = u.UserId
       WHERE f.UserId = ?
       ORDER BY f.CreateTime DESC`,
      [userId]
    );
    return res.json({ success: true, favorites: rows });
  } catch (err) {
    console.error("获取收藏列表失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// GET /favorites/count?eventId= — 获取某事件的收藏数
router.get("/favorites/count", async (req, res) => {
  const eventId = Number(req.query.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, error: "参数无效" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS count FROM Favorites WHERE EventId = ?",
      [eventId]
    );
    return res.json({ success: true, count: rows[0].count });
  } catch (err) {
    console.error("获取收藏数失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// ============================================================
//  关注 (Follows)
// ============================================================

// POST /follows — 切换关注（toggle）
router.post("/follows", authRequired, async (req, res) => {
  const followerId = Number(req.user?.id);
  const followingId = Number(req.body?.FollowingId);

  if (!Number.isInteger(followerId) || followerId <= 0) {
    return res.status(401).json({ success: false, error: "请先登录" });
  }
  if (!Number.isInteger(followingId) || followingId <= 0) {
    return res.status(400).json({ success: false, error: "用户ID无效" });
  }
  if (followerId === followingId) {
    return res.status(400).json({ success: false, error: "不能关注自己" });
  }

  try {
    // 验证目标用户存在
    const [userRows] = await pool.query(
      "SELECT UserId FROM Users WHERE UserId = ? LIMIT 1",
      [followingId]
    );
    if (!userRows.length) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    // 检查是否已关注
    const [existing] = await pool.query(
      "SELECT FollowId FROM Follows WHERE FollowerId = ? AND FollowingId = ? LIMIT 1",
      [followerId, followingId]
    );

    if (existing.length > 0) {
      // 已关注 → 取消
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("DELETE FROM Follows WHERE FollowId = ?", [
          existing[0].FollowId,
        ]);
        await conn.query(
          "UPDATE Users SET FollowerCount = GREATEST(0, FollowerCount - 1) WHERE UserId = ?",
          [followingId]
        );
        await conn.commit();
      } finally {
        conn.release();
      }
      return res.json({ success: true, following: false });
    } else {
      // 未关注 → 添加
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(
          "INSERT INTO Follows (FollowerId, FollowingId) VALUES (?, ?)",
          [followerId, followingId]
        );
        await conn.query(
          "UPDATE Users SET FollowerCount = FollowerCount + 1 WHERE UserId = ?",
          [followingId]
        );
        await conn.commit();
      } finally {
        conn.release();
      }
      return res.json({ success: true, following: true });
    }
  } catch (err) {
    console.error("关注操作失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// GET /follows/check?userId= — 查询是否已关注某用户
router.get("/follows/check", authRequired, async (req, res) => {
  const followerId = Number(req.user?.id);
  const userId = Number(req.query.userId);

  if (!Number.isInteger(followerId) || followerId <= 0) {
    return res.json({ success: true, following: false });
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, error: "参数无效" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT 1 FROM Follows WHERE FollowerId = ? AND FollowingId = ? LIMIT 1",
      [followerId, userId]
    );
    return res.json({ success: true, following: rows.length > 0 });
  } catch (err) {
    console.error("查询关注状态失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// GET /follows — 获取当前用户的关注列表
router.get("/follows", authRequired, async (req, res) => {
  const followerId = Number(req.user?.id);

  if (!Number.isInteger(followerId) || followerId <= 0) {
    return res.status(401).json({ success: false, error: "请先登录" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT fl.FollowId, fl.CreateTime AS FollowedAt,
              u.UserId, u.UserName, u.UserAvatar, u.Location, u.Introduction,
              IFNULL(p.ServiceRanking, 0) AS ServiceRanking,
              IFNULL(p.OrderCount, 0) AS OrderCount,
              IFNULL(p.ProviderRole, 0) AS ProviderRole,
              u.FollowerCount
       FROM Follows fl
       JOIN Users u ON fl.FollowingId = u.UserId
       LEFT JOIN Providers p ON p.ProviderId = u.UserId
       WHERE fl.FollowerId = ?
       ORDER BY fl.CreateTime DESC`,
      [followerId]
    );
    return res.json({ success: true, follows: rows });
  } catch (err) {
    console.error("获取关注列表失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

// GET /follows/count?userId= — 获取某用户的粉丝数和关注数
router.get("/follows/count", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, error: "参数无效" });
  }

  try {
    const [followerRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM Follows WHERE FollowingId = ?",
      [userId]
    );
    const [followingRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM Follows WHERE FollowerId = ?",
      [userId]
    );
    return res.json({
      success: true,
      followers: followerRows[0].count,
      following: followingRows[0].count,
    });
  } catch (err) {
    console.error("获取关注数失败:", err);
    return res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

module.exports = router;
