//用户相关内容

const express = require("express");
const pool = require("../help_me_db.js");
const { signToken } = require("./auth.js"); 

const router = express.Router();

// 登录：接收 { phone, code }，验证码固定为 '1234'
router.post("/login", async (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) {
    return res.status(400).json({ error: "phone and code required" });
  }
  if (String(code) !== "1234") {
    // 固定验证码校验，后续需要更换！！！
    return res.status(401).json({ error: "Invalid verification code" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT UserId, UserName, PhoneNumber FROM Users WHERE PhoneNumber = ? LIMIT 1",
      [phone],
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const token = signToken(user);

    return res.json({ success: true, user, token });
  } catch (err) {
    console.error("DB query error (login):", err);
    return res.status(500).json({ error: "Database query failed" });
  }
});

// 获取用户发布的事件列表
router.get("/users/:id/events", async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      "SELECT EventId, EventTitle, EventCategory, Location, Price, Photos, CreateTime FROM Events WHERE CreatorId = ? ORDER BY CreateTime DESC LIMIT 50",
      [userId],
    );
    return res.json(rows);
  } catch (err) {
    console.error("DB query error (user events):", err);
    return res.status(500).json({ error: "Database query failed" });
  }
});

// 获取用户完整资料（包含 Consumers/Providers 信息）
router.get("/users/:id/profile", async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT u.UserId, u.UserName, u.PhoneNumber, u.UserAvatar, u.Location, u.BirthDate, u.Introduction,
              (SELECT VerificationStatus FROM Verifications v WHERE v.ProviderId = u.UserId ORDER BY v.SubmissionTime DESC LIMIT 1) AS VerificationStatus,
              c.BuyerRanking, p.ProviderRole, p.OrderCount, p.ServiceRanking
       FROM Users u
       LEFT JOIN Consumers c ON u.UserId = c.ConsumerId
       LEFT JOIN Providers p ON u.UserId = p.ProviderId
       WHERE u.UserId = ? LIMIT 1`,
      [userId],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("DB query error (profile):", err);
    return res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = router;
